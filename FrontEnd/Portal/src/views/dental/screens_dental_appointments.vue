<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { usePermissions } from '../../composables/usePermissions';
import { Plus, CheckCircle2, XCircle, UserX, ArrowRightCircle, Edit2, LogIn } from 'lucide-vue-next';
import { useDentalAppointmentsStore } from '../../stores/dentalAppointments';
import { useDentalPatientsStore } from '../../stores/dentalPatients';
import { useDentalTreatmentsStore } from '../../stores/dentalTreatments';
import { dentalAppointmentsService } from '../../services/dentalAppointmentsService';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import AppToast from '../../components/AppToast.vue';
import ConfirmActionModal from '../../components/admin/ConfirmActionModal.vue';
import AgendaCalendar from '../../components/agenda/AgendaCalendar.vue';
import AgendaSettingsPanel, { type AgendaSettingsValue } from '../../components/agenda/AgendaSettingsPanel.vue';
import widgets_dental_appointment_summary_modal from '../../widgets/widgets_dental_appointment_summary_modal.vue';
import type { AgendaEvent, AgendaStatusColorMap, AgendaCapacityByDate, AgendaView } from '../../components/agenda/agendaTypes';
import { dateKey as agendaDateKey, toDate, toLocalDateTimeInput } from '../../components/agenda/agendaLayout';
import { useToast } from '../../composables/useToast';
import type { DentalAppointment, DentalAppointmentFormData, DentalPatientFormData } from '../../types/dental';

const router = useRouter();
const perms = usePermissions();
const canCreate = computed(() => !perms.isReadOnly.value && perms.canDo('dental_appointments', 'can_create'));
const canEdit = computed(() => !perms.isReadOnly.value && perms.canDo('dental_appointments', 'can_edit'));
const canAdmin = computed(() => !perms.isReadOnly.value && perms.canDo('dental_appointments', 'can_admin'));
const canConvert = computed(() => canEdit.value && perms.canDo('dental_consultations', 'can_view') && perms.canDo('dental_consultations', 'can_create'));
const tabs = computed(() => ([['day', 'Día'], ['month', 'Mes'], ['all', 'Todas'], ...(canAdmin.value ? [['settings', 'Configuración']] : [])] as [ViewTab, string][]));
const store = useDentalAppointmentsStore();
const patientsStore = useDentalPatientsStore();
const treatmentsStore = useDentalTreatmentsStore();
const { toasts, triggerToast, removeToast } = useToast();

const confirmModal = ref<{
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  variant: 'danger' | 'warning' | 'info';
  confirmText: string;
  cancelText: string;
}>({
  open: false,
  title: '',
  message: '',
  onConfirm: () => {},
  variant: 'warning',
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
});
function askConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  options: { variant?: 'danger' | 'warning' | 'info'; confirmText?: string; cancelText?: string } = {}
) {
  confirmModal.value = {
    open: true,
    title,
    message,
    onConfirm,
    variant: options.variant ?? 'warning',
    confirmText: options.confirmText ?? 'Confirmar',
    cancelText: options.cancelText ?? 'Cancelar',
  };
}

const patientSearch = ref('');
const selectedPatient = ref<any>(null);
const showPatientDrop = ref(false);
const lastNoPatientPromptQuery = ref('');

let patientSearchTimer: ReturnType<typeof setTimeout> | null = null;

function onPatientInput() {
  const query = patientSearch.value.trim();
  selectedPatient.value = null;
  form.value.customer_id = '';
  if (query !== lastNoPatientPromptQuery.value) lastNoPatientPromptQuery.value = '';
  if (patientSearchTimer) clearTimeout(patientSearchTimer);
  if (!query) { showPatientDrop.value = false; lastNoPatientPromptQuery.value = ''; return; }
  patientSearchTimer = setTimeout(async () => {
    await patientsStore.load({ search: query });
    if (patientSearch.value.trim() !== query) return;
    if (patientsStore.items.length === 0) {
      showPatientDrop.value = false;
      if (lastNoPatientPromptQuery.value !== query) {
        lastNoPatientPromptQuery.value = query;
        askConfirm(
          'Paciente no encontrado',
          `No existe un paciente para "${query}". ¿Querés crear un nuevo paciente con esta búsqueda?`,
          () => openInlinePatientCreate(query),
          { variant: 'info', confirmText: 'Crear paciente', cancelText: 'Seguir buscando' }
        );
      }
      return;
    }
    showPatientDrop.value = true;
  }, 300);
}

function selectPatient(p: any) {
  selectedPatient.value = p;
  form.value.customer_id = p.id;
  patientSearch.value = `${p.first_name} ${p.last_name}`;
  showPatientDrop.value = false;
}

function focusPatientDrop() {
  if (patientSearch.value && patientsStore.items.length) showPatientDrop.value = true;
}

function blurPatientDrop() {
  setTimeout(() => { showPatientDrop.value = false; }, 200);
}

function clearPatient() {
  selectedPatient.value = null;
  form.value.customer_id = '';
  patientSearch.value = '';
}

const showPatientPanel = ref(false);
const patientSaving = ref(false);
const patientSaveError = ref<string | null>(null);

const defaultPatientForm = (): DentalPatientFormData => ({
  first_name: '',
  last_name: '',
  document_type: 'DNI',
  document_number: '',
  phone: '',
  mobile: '',
  email: '',
  birth_date: '',
  address: '',
  city: '',
  customer_notes: '',
  medical_background: '',
  allergies: '',
  blood_type: '',
  current_medications: '',
  chronic_conditions: '',
  dental_observations: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
});

const patientForm = ref<DentalPatientFormData>(defaultPatientForm());

function splitPatientSearchName(query: string) {
  const parts = query.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] ?? '',
    last_name: parts.slice(1).join(' '),
  };
}

function openInlinePatientCreate(query = patientSearch.value) {
  const name = splitPatientSearchName(query);
  patientForm.value = {
    ...defaultPatientForm(),
    ...name,
  };
  patientSaveError.value = null;
  showPatientDrop.value = false;
  showPatientPanel.value = true;
}

async function saveInlinePatient() {
  patientSaving.value = true;
  patientSaveError.value = null;
  try {
    const createdPatient = await patientsStore.create(patientForm.value);
    triggerToast('Éxito', 'Paciente creado', 'success');
    showPatientPanel.value = false;
    selectPatient(createdPatient);
  } catch (e: any) {
    const message = e?.response?.data?.error || 'Error al guardar paciente';
    patientSaveError.value = message;
    triggerToast('Error', message, 'error');
  } finally {
    patientSaving.value = false;
  }
}

type ViewTab = 'day' | 'month' | 'all' | 'settings';
const activeTab = ref<ViewTab>('month');
const showPanel = ref(false);
const saving    = ref(false);
const saveError = ref<string | null>(null);
const actionError = ref<string | null>(null);
const isEditing = ref(false);
const editingAppointmentId = ref<number | string | null>(null);
type DentalSummaryAction = 'confirm' | 'check_in' | 'no_show' | 'cancel' | 'edit' | 'convert';
const summaryAppointment = ref<DentalAppointment | null>(null);
const summaryActionLoading = ref<DentalSummaryAction | null>(null);

const defaultForm = (): DentalAppointmentFormData => ({
  customer_id: '',
  treatment_id: undefined,
  scheduled_start: '',
  scheduled_end: '',
  reason: '',
  notes: '',
});

const form = ref<DentalAppointmentFormData>(defaultForm());

const STATUS_LABEL: Record<string, string> = {
  scheduled:   'Programada',
  confirmed:   'Confirmada',
  checked_in:  'Presente',
  completed:   'Completada',
  cancelled:   'Cancelada',
  no_show:     'No asistió',
  rescheduled: 'Reprogramada',
};

const STATUS_CLASS: Record<string, string> = {
  scheduled:   'bg-blue-500/20 text-blue-400',
  confirmed:   'bg-green-500/20 text-green-400',
  checked_in:  'bg-cyan-500/20 text-cyan-400',
  completed:   'bg-white/10 nxr-text-muted',
  cancelled:   'bg-red-500/20 text-red-400',
  no_show:     'bg-orange-500/20 text-orange-400',
  rescheduled: 'bg-purple-500/20 text-purple-400',
};

const STATUS_COLORS: AgendaStatusColorMap = {
  scheduled:   { bg: 'bg-blue-500/20',   text: 'text-blue-300',   dot: 'bg-blue-400' },
  confirmed:   { bg: 'bg-green-500/20',  text: 'text-green-300',  dot: 'bg-green-400' },
  checked_in:  { bg: 'bg-cyan-500/20',   text: 'text-cyan-300',   dot: 'bg-cyan-400' },
  completed:   { bg: 'bg-gray-500/20',   text: 'text-gray-300',   dot: 'bg-gray-400' },
  cancelled:   { bg: 'bg-red-500/20',    text: 'text-red-300',    dot: 'bg-red-400' },
  no_show:     { bg: 'bg-orange-500/20', text: 'text-orange-300', dot: 'bg-orange-400' },
  rescheduled: { bg: 'bg-purple-500/20', text: 'text-purple-300', dot: 'bg-purple-400' },
};

function fmtTime(iso: string) {
  const d = toDate(iso);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string) {
  const d = toDate(iso);
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function patientDisplayName(apt: DentalAppointment) {
  return (apt.customer as any)?.full_name
    ?? [apt.customer?.first_name, apt.customer?.last_name].filter(Boolean).join(' ')
    ?? 'Paciente';
}

// ── Día / Mes tabs ────────────────────────────────────────────────
const agendaView = ref<AgendaView>('month');
const agendaDate = ref(new Date());
const agendaEvents = ref<DentalAppointment[]>([]);
const agendaLoading = ref(false);

// getDay/getMonth actually respond { data: [...] } despite the service's
// bare-array TS type (same inconsistency the store's own unwrapData works
// around for loadToday/loadMonth) — unwrap defensively either way.
function unwrapAppointments(payload: unknown): DentalAppointment[] {
  if (Array.isArray(payload)) return payload as DentalAppointment[];
  return ((payload as { data?: DentalAppointment[] })?.data) ?? [];
}

async function loadAgendaRange() {
  agendaLoading.value = true;
  try {
    if (agendaView.value === 'month') {
      const res = await dentalAppointmentsService.getMonth(agendaDate.value.getFullYear(), agendaDate.value.getMonth() + 1);
      agendaEvents.value = unwrapAppointments(res.data);
    } else {
      const res = await dentalAppointmentsService.getDay(agendaDateKey(agendaDate.value));
      agendaEvents.value = unwrapAppointments(res.data);
    }
  } catch {
    agendaEvents.value = [];
  } finally {
    agendaLoading.value = false;
  }
}
watch([agendaView, agendaDate], loadAgendaRange);

const agendaCalendarEvents = computed<AgendaEvent[]>(() =>
  agendaEvents.value.map((a) => ({
    id: a.id,
    start: a.scheduled_start,
    end: a.scheduled_end || a.scheduled_start,
    title: patientDisplayName(a),
    status: a.status,
    actionLabel: agendaView.value === 'day' ? 'Ver' : (canEdit.value ? 'Editar' : 'Ver'),
    actionKind: agendaView.value === 'day' ? 'view' : (canEdit.value ? 'edit' : 'view'),
  }))
);

const settings = ref<AgendaSettingsValue>({ max_appointments_per_day: null, business_hours_start: '08:00', business_hours_end: '20:00' });
const savingSettings = ref(false);
const settingsError = ref('');
const settingsSaved = ref(false);

const capacityByDate = computed<AgendaCapacityByDate>(() => {
  const max = settings.value.max_appointments_per_day;
  if (max == null) return {};
  const counts: Record<string, number> = {};
  for (const ev of agendaCalendarEvents.value) {
    if (ev.status === 'cancelled' || ev.status === 'no_show') continue;
    const key = agendaDateKey(toDate(ev.start));
    counts[key] = (counts[key] || 0) + 1;
  }
  const result: AgendaCapacityByDate = {};
  for (const [key, count] of Object.entries(counts)) {
    const status = count >= max ? 'full' : count >= max * 0.8 ? 'near' : 'ok';
    result[key] = { count, status };
  }
  return result;
});

async function loadSettings() {
  const res = await dentalAppointmentsService.getSettings();
  settings.value = {
    max_appointments_per_day: res.data.max_appointments_per_day,
    business_hours_start: res.data.business_hours_start?.slice(0, 5) || '08:00',
    business_hours_end: res.data.business_hours_end?.slice(0, 5) || '20:00',
  };
}

async function saveSettings(value: AgendaSettingsValue) {
  if (!canAdmin.value) return;
  savingSettings.value = true;
  settingsError.value = '';
  settingsSaved.value = false;
  try {
    await dentalAppointmentsService.updateSettings(value);
    settings.value = value;
    settingsSaved.value = true;
  } catch (e: any) {
    settingsError.value = e?.response?.data?.error || 'No se pudo guardar la configuración.';
  } finally {
    savingSettings.value = false;
  }
}

async function switchTab(tab: ViewTab) {
  activeTab.value = tab;
  if (tab === 'day' || tab === 'month') { agendaView.value = tab; await loadAgendaRange(); }
  else if (tab === 'all') await store.load();
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function prefillToLocalInputValue(date: Date, hour?: number, minute?: number): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const h = pad2(hour ?? date.getHours());
  const min = pad2(minute ?? 0);
  return `${y}-${m}-${d}T${h}:${min}`;
}

function addHourToInputValue(value: string, hours: number): string {
  const d = new Date(value);
  d.setHours(d.getHours() + hours);
  return prefillToLocalInputValue(d, d.getHours(), d.getMinutes());
}

function openCreate(prefill?: { date: Date; hour?: number; minute?: number }) {
  if (!canCreate.value) return;
  form.value = defaultForm();
  if (prefill) {
    form.value.scheduled_start = prefillToLocalInputValue(prefill.date, prefill.hour, prefill.minute);
    form.value.scheduled_end = addHourToInputValue(form.value.scheduled_start, 1);
  }
  saveError.value = null;
  isEditing.value = false;
  editingAppointmentId.value = null;
  patientSearch.value = '';
  selectedPatient.value = null;
  showPatientDrop.value = false;
  showPanel.value = true;
}

function toLocalInputValue(iso?: string) {
  return toLocalDateTimeInput(iso);
}

function openEditAppointment(apt: DentalAppointment) {
  isEditing.value = true;
  editingAppointmentId.value = apt.id;
  form.value = {
    customer_id: apt.customer_id,
    treatment_id: apt.treatment_id,
    scheduled_start: toLocalInputValue(apt.scheduled_start),
    scheduled_end: toLocalInputValue(apt.scheduled_end),
    reason: apt.reason ?? '',
    notes: apt.notes ?? '',
  };
  selectedPatient.value = apt.customer ?? null;
  patientSearch.value = patientDisplayName(apt);
  showPatientDrop.value = false;
  saveError.value = null;
  showPanel.value = true;
}

async function openEditById(id: number | string) {
  try {
    openEditAppointment(await store.loadOne(id));
  } catch (e: any) {
    triggerToast('No se pudo abrir la cita', e?.response?.data?.error || 'No se pudo cargar el detalle de la cita.', 'error');
  }
}

async function openSummary(id: number | string) {
  try {
    summaryAppointment.value = await store.loadOne(id);
  } catch (e: any) {
    triggerToast('No se pudo abrir la cita', e?.response?.data?.error || 'No se pudo cargar el resumen de la cita.', 'error');
  }
}

async function onCalendarSelectEvent(payload: { event: AgendaEvent }) {
  if (agendaView.value === 'day') await openSummary(payload.event.id);
  else await openEditById(payload.event.id);
}

async function refreshActiveTab() {
  if (activeTab.value === 'day' || activeTab.value === 'month') await loadAgendaRange();
  else if (activeTab.value === 'all') await store.load();
}

async function save() {
  if (isEditing.value ? !canEdit.value : !canCreate.value) return;
  saving.value = true;
  saveError.value = null;
  try {
    if (isEditing.value && editingAppointmentId.value) {
      await store.update(editingAppointmentId.value, form.value);
      triggerToast('Éxito', 'Cita actualizada', 'success');
    } else {
      await store.create(form.value);
      triggerToast('Éxito', 'Cita creada', 'success');
    }
    showPanel.value = false;
    await refreshActiveTab();
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al guardar cita';
  } finally {
    saving.value = false;
  }
}

async function executeAppointmentAction(action: Exclude<DentalSummaryAction, 'edit'>, apt: DentalAppointment) {
  if (action === 'convert' ? !canConvert.value : !canEdit.value) return;
  actionError.value = null;
  summaryActionLoading.value = action;
  try {
    if (action === 'confirm') {
      await store.confirm(apt.id);
    } else if (action === 'check_in') {
      await store.update(apt.id, { status: 'checked_in' } as any);
    } else if (action === 'no_show') {
      await store.noShow(apt.id);
    } else if (action === 'cancel') {
      await store.cancel(apt.id);
    } else if (action === 'convert') {
      const result = await store.convertToConsultation(apt.id);
      triggerToast('Consulta iniciada', 'La cita fue convertida correctamente.', 'success');
      summaryAppointment.value = null;
      if (result?.id) {
        router.push({ name: 'dental-consultation-detail', params: { id: result.id } });
      }
      return;
    }

    const messages: Record<Exclude<DentalSummaryAction, 'edit' | 'convert'>, string> = {
      confirm: 'La cita fue confirmada.',
      check_in: 'El paciente fue marcado como presente.',
      no_show: 'La cita fue marcada como no asistida.',
      cancel: 'La cita fue cancelada.',
    };
    await refreshActiveTab();
    if (summaryAppointment.value?.id === apt.id) summaryAppointment.value = await store.loadOne(apt.id);
    triggerToast('Estado actualizado', messages[action], 'success');
  } catch (e: any) {
    actionError.value = e?.response?.data?.error || 'Error al ejecutar acción';
    triggerToast('No se pudo actualizar la cita', actionError.value || 'Error al ejecutar acción', 'error');
  } finally {
    summaryActionLoading.value = null;
  }
}

function requestAppointmentAction(action: Exclude<DentalSummaryAction, 'edit'>, apt: DentalAppointment) {
  const name = patientDisplayName(apt);
  const configs = {
    confirm: { title: 'Confirmar cita', message: `¿Confirmar la cita de ${name}?`, confirmText: 'Confirmar cita', variant: 'info' as const },
    check_in: { title: 'Registrar llegada', message: `¿Registrar que ${name} se presentó a su cita?`, confirmText: 'Registrar llegada', variant: 'info' as const },
    no_show: { title: 'Marcar inasistencia', message: `¿Confirmas que ${name} no asistió? La cita dejará de ocupar cupo.`, confirmText: 'No asistió', variant: 'warning' as const },
    cancel: { title: 'Cancelar cita', message: `¿Cancelar la cita de ${name}?`, confirmText: 'Cancelar cita', variant: 'danger' as const },
    convert: { title: 'Iniciar consulta', message: `¿Crear una consulta dental para ${name} desde esta cita?`, confirmText: 'Iniciar consulta', variant: 'info' as const },
  };
  const config = configs[action];
  askConfirm(config.title, config.message, () => executeAppointmentAction(action, apt), { variant: config.variant, confirmText: config.confirmText });
}

function onSummaryAction(action: DentalSummaryAction) {
  const appointment = summaryAppointment.value;
  if (!appointment) return;
  if (action === 'edit') {
    summaryAppointment.value = null;
    openEditAppointment(appointment);
    return;
  }
  requestAppointmentAction(action, appointment);
}

onMounted(() => {
  loadAgendaRange();
  loadSettings();
  patientsStore.load();
  treatmentsStore.load();
});
</script>

<template>
  <div class="flex flex-col gap-5 p-4 md:p-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-xl font-semibold nxr-text">Citas</h1>
      <button
        v-if="canCreate && activeTab !== 'settings'"
        class="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition nxr-btn-primary sm:w-auto"
        @click="openCreate()"
      >
        <Plus :size="15" /> Nueva cita
      </button>
    </div>

    <!-- Tab switcher -->
    <div class="flex flex-wrap items-center gap-1 rounded-2xl p-1 nxr-card-subtle w-fit">
      <button v-for="tab in tabs" :key="tab[0]"
              type="button"
              class="rounded-xl px-4 py-1.5 text-xs font-medium transition"
              :class="activeTab === tab[0] ? 'nxr-btn-primary' : 'nxr-text-muted'"
              @click="switchTab(tab[0])">
        {{ tab[1] }}
      </button>
    </div>

    <p v-if="actionError" class="text-xs text-red-400">{{ actionError }}</p>

    <!-- Día / Mes -->
    <AgendaCalendar
      v-if="activeTab === 'day' || activeTab === 'month'"
      v-model:view="agendaView"
      v-model:date="agendaDate"
      :events="agendaCalendarEvents"
      :can-create="canCreate"
      :status-colors="STATUS_COLORS"
      :capacity-by-date="capacityByDate"
      :loading="agendaLoading"
      :min-hour="Number(settings.business_hours_start.split(':')[0])"
      :max-hour="Number(settings.business_hours_end.split(':')[0])"
      @create="(payload) => openCreate(payload)"
      @select-event="onCalendarSelectEvent" />

    <!-- Configuración -->
    <AgendaSettingsPanel
      v-else-if="activeTab === 'settings' && canAdmin"
      module-label="Dental"
      :settings="settings"
      :saving="savingSettings"
      :error="settingsError"
      :saved="settingsSaved"
      @save="saveSettings" />

    <!-- All tab -->
    <template v-else>
      <div v-if="store.loading" class="flex flex-col gap-2">
        <div v-for="i in 6" :key="i" class="h-16 rounded-xl bg-white/5 animate-pulse"></div>
      </div>
      <div v-else-if="store.items.length === 0" class="text-center nxr-text-soft py-16 text-sm">
        No hay citas registradas.
      </div>
      <div v-else class="flex flex-col gap-2">
        <!-- Desktop header -->
        <div class="hidden md:grid md:grid-cols-[140px_1fr_1fr_120px_100px] gap-4 px-4 py-2 text-xs nxr-text-soft font-semibold uppercase tracking-wide">
          <span>Fecha/Hora</span>
          <span>Paciente</span>
          <span>Servicio</span>
          <span>Estado</span>
          <span class="text-right">Acciones</span>
        </div>
        <div
          v-for="apt in store.items"
          :key="apt.id"
          class="flex flex-col gap-3 rounded-xl border border-white/10 px-4 py-3 md:flex-row md:items-center"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <!-- Mobile -->
          <div class="min-w-0 md:hidden">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium nxr-text">{{ patientDisplayName(apt) }}</p>
                <p class="text-xs nxr-text-muted">{{ fmtDate(apt.scheduled_start) }} {{ fmtTime(apt.scheduled_start) }}</p>
                <p class="mt-1 text-xs nxr-text-muted">{{ apt.treatment?.name ?? apt.reason ?? 'Sin tratamiento' }}</p>
              </div>
              <span class="w-fit shrink-0 rounded-full px-2 py-0.5 text-xs" :class="STATUS_CLASS[apt.status]">{{ STATUS_LABEL[apt.status] }}</span>
            </div>
            <div class="mt-3 flex w-full items-center gap-1.5 overflow-x-auto pb-1">
              <button v-if="canEdit && apt.status === 'scheduled'" type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-400" title="Confirmar" aria-label="Confirmar cita" @click="requestAppointmentAction('confirm', apt)"><CheckCircle2 :size="16" /></button>
              <button v-if="canEdit && apt.status === 'confirmed'" type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300" title="Marcar presente" aria-label="Marcar paciente presente" @click="requestAppointmentAction('check_in', apt)"><LogIn :size="16" /></button>
              <button v-if="!['completed','cancelled','no_show'].includes(apt.status)" type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 nxr-text-muted" title="Editar/reprogramar" aria-label="Editar o reprogramar cita" @click="openEditById(apt.id)"><Edit2 :size="16" /></button>
              <button v-if="canConvert && ['scheduled','confirmed','checked_in'].includes(apt.status)" type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400" title="Convertir en consulta" aria-label="Convertir cita en consulta" @click="requestAppointmentAction('convert', apt)"><ArrowRightCircle :size="16" /></button>
              <button v-if="canEdit && ['scheduled','confirmed','rescheduled'].includes(apt.status)" type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400" title="No asistió" aria-label="Marcar como no asistió" @click="requestAppointmentAction('no_show', apt)"><UserX :size="16" /></button>
              <button v-if="canEdit && ['scheduled','confirmed','rescheduled'].includes(apt.status)" type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400" title="Cancelar" aria-label="Cancelar cita" @click="requestAppointmentAction('cancel', apt)"><XCircle :size="16" /></button>
            </div>
          </div>
          <!-- Desktop -->
          <div class="hidden flex-1 items-center gap-4 md:grid md:grid-cols-[140px_1fr_1fr_120px_100px]">
            <p class="text-xs nxr-text-muted">{{ fmtDate(apt.scheduled_start) }}<br />{{ fmtTime(apt.scheduled_start) }}</p>
            <p class="truncate text-sm nxr-text">{{ patientDisplayName(apt) }}</p>
            <p class="truncate text-xs nxr-text-muted">{{ apt.treatment?.name ?? apt.reason ?? '—' }}</p>
            <span class="w-fit rounded-full px-2 py-0.5 text-xs" :class="STATUS_CLASS[apt.status]">{{ STATUS_LABEL[apt.status] }}</span>
            <div class="flex items-center justify-end gap-1">
              <button v-if="canEdit && apt.status === 'scheduled'" type="button" class="text-green-400 hover:opacity-70" title="Confirmar" aria-label="Confirmar cita" @click="requestAppointmentAction('confirm', apt)"><CheckCircle2 :size="14" /></button>
              <button v-if="canEdit && apt.status === 'confirmed'" type="button" class="text-cyan-300 hover:opacity-70" title="Marcar presente" aria-label="Marcar paciente presente" @click="requestAppointmentAction('check_in', apt)"><LogIn :size="14" /></button>
              <button v-if="!['completed','cancelled','no_show'].includes(apt.status)" type="button" class="nxr-text-muted hover:text-[var(--nexora-text-color)]" title="Editar/reprogramar" aria-label="Editar o reprogramar cita" @click="openEditById(apt.id)"><Edit2 :size="14" /></button>
              <button v-if="canConvert && ['scheduled','confirmed','checked_in'].includes(apt.status)" type="button" class="text-cyan-400 hover:opacity-70" title="Consulta" aria-label="Convertir cita en consulta" @click="requestAppointmentAction('convert', apt)"><ArrowRightCircle :size="14" /></button>
              <button v-if="canEdit && ['scheduled','confirmed','rescheduled'].includes(apt.status)" type="button" class="text-orange-400 hover:opacity-70" title="No asistió" @click="requestAppointmentAction('no_show', apt)"><UserX :size="14" /></button>
              <button v-if="canEdit && ['scheduled','confirmed','rescheduled'].includes(apt.status)" type="button" class="text-red-400 hover:opacity-70" title="Cancelar" aria-label="Cancelar cita" @click="requestAppointmentAction('cancel', apt)"><XCircle :size="14" /></button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Create panel -->
    <NxrSlidePanel :open="showPanel" :title="isEditing ? (canEdit ? 'Editar/reprogramar cita' : 'Detalle de cita') : 'Nueva cita'" eyebrow="Dental" size="lg" @close="showPanel = false"
    draft-key="views/dental/screens_dental_appointments.vue#1"
    :draft-entity="isEditing ? editingAppointmentId : 'create'"
    :draft-state="{ patientSearch, selectedPatient, form }"
    :draft-setters="{ patientSearch: (value) => patientSearch = value, selectedPatient: (value) => selectedPatient = value }">
      <form class="flex flex-col gap-5" @submit.prevent="save">
        <fieldset :disabled="isEditing ? !canEdit : !canCreate" class="contents">
        <div class="flex flex-col gap-1.5 relative">
          <label class="text-xs nxr-text-muted">Paciente *</label>
          <input
            v-model="patientSearch"
            type="text"
            placeholder="Buscar por nombre o documento..."
            autocomplete="off"
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text placeholder-[var(--nexora-soft-text)] outline-none focus:border-white/30"
            @input="onPatientInput"
            @focus="focusPatientDrop"
            @blur="blurPatientDrop"
          />
          <div v-if="selectedPatient" class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[var(--nexora-primary)]/20 border border-[var(--nexora-primary)]/30 text-xs nxr-text">
            <span>{{ selectedPatient.first_name }} {{ selectedPatient.last_name }}</span>
            <button type="button" class="nxr-text-muted hover:text-[var(--nexora-text-color)] ml-2" @click="clearPatient">✕</button>
          </div>
          <div
            v-if="showPatientDrop && patientsStore.items.length > 0"
            class="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-white/20 shadow-xl"
            :style="{ background: 'var(--nexora-glass-bg)' }"
          >
            <button
              v-for="p in patientsStore.items"
              :key="p.id"
              type="button"
              class="w-full text-left px-3 py-2.5 text-sm nxr-text hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
              @mousedown.prevent="selectPatient(p)"
            >
              {{ p.first_name }} {{ p.last_name }}
              <span v-if="p.document_number" class="text-xs nxr-text-muted ml-2">{{ p.document_type }} {{ p.document_number }}</span>
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs nxr-text-muted">Inicio *</label>
          <input v-model="form.scheduled_start" type="datetime-local" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text outline-none focus:border-white/30" required />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs nxr-text-muted">Fin *</label>
          <input v-model="form.scheduled_end" type="datetime-local" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text outline-none focus:border-white/30" required />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs nxr-text-muted">Tratamiento</label>
          <select v-model="form.treatment_id" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text outline-none focus:border-white/30">
            <option value="">Sin tratamiento</option>
            <option v-for="s in treatmentsStore.items" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs nxr-text-muted">Motivo</label>
          <input v-model="form.reason" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs nxr-text-muted">Notas internas</label>
          <textarea v-model="form.notes" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>
        </fieldset>
      </form>
      <template #footer>

        <button v-if="isEditing ? canEdit : canCreate" type="button" class="flex-1 rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary disabled:opacity-50" :disabled="saving" @click="save">
          {{ saving ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Agendar cita') }}
        </button>
      </template>
    </NxrSlidePanel>

    <!-- Inline patient creation panel -->
    <NxrSlidePanel :open="showPatientPanel" title="Nuevo paciente" eyebrow="Dental" size="lg" @close="showPatientPanel = false"
    draft-key="views/dental/screens_dental_appointments.vue#2"
    :draft-entity="'inline-patient-create'"
    :draft-state="{ patientForm }">
      <form id="inline-patient-create-form" class="flex flex-col gap-5" @submit.prevent="saveInlinePatient">
        <p class="text-xs font-semibold uppercase tracking-wide nxr-text-muted">Datos personales</p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs nxr-text-muted">Nombre *</label>
            <input v-model="patientForm.first_name" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text outline-none focus:border-white/30" required />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs nxr-text-muted">Apellido *</label>
            <input v-model="patientForm.last_name" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text outline-none focus:border-white/30" required />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs nxr-text-muted">Tipo documento</label>
            <input v-model="patientForm.document_type" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text outline-none focus:border-white/30" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs nxr-text-muted">Documento</label>
            <input v-model="patientForm.document_number" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text outline-none focus:border-white/30" />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs nxr-text-muted">Teléfono fijo</label>
            <input v-model="patientForm.phone" type="tel" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text outline-none focus:border-white/30" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs nxr-text-muted">Teléfono móvil</label>
            <input v-model="patientForm.mobile" type="tel" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text outline-none focus:border-white/30" />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label class="text-xs nxr-text-muted">Email</label>
            <input v-model="patientForm.email" type="email" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text outline-none focus:border-white/30" />
          </div>
        </div>

        <p v-if="patientSaveError" class="text-xs text-red-400">{{ patientSaveError }}</p>
      </form>
      <template #footer>

        <button type="submit" form="inline-patient-create-form" class="flex-1 rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary disabled:opacity-50" :disabled="patientSaving">
          {{ patientSaving ? 'Guardando...' : 'Crear paciente' }}
        </button>
      </template>
    </NxrSlidePanel>

    <widgets_dental_appointment_summary_modal
      :model-value="!!summaryAppointment"
      :appointment="summaryAppointment"
      :can-edit="canEdit"
      :can-convert="canConvert"
      :action-loading="summaryActionLoading"
      @update:model-value="(open) => { if (!open) summaryAppointment = null; }"
      @action="onSummaryAction" />

    <!-- Toast container -->
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
      <AppToast v-for="t in toasts" :key="t.id" :toast="t" @close="removeToast" />
    </div>

    <ConfirmActionModal
      :isOpen="confirmModal.open"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :variant="confirmModal.variant"
      :confirmText="confirmModal.confirmText"
      :cancelText="confirmModal.cancelText"
      @confirmed="() => { confirmModal.open = false; confirmModal.onConfirm(); }"
      @cancelled="confirmModal.open = false"
    />
  </div>
</template>
