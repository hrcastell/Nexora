<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { usePermissions } from '../../composables/usePermissions';
import { Plus, ChevronRight, ArrowRight, Loader2 } from 'lucide-vue-next';
import { useGarageAppointmentsStore } from '../../stores/garageAppointments';
import { garageAppointmentsService } from '../../services/garageAppointmentsService';
import widgets_garage_appointment_form_modal from '../../widgets/widgets_garage_appointment_form_modal.vue';
import widgets_garage_appointment_status_badge from '../../widgets/widgets_garage_appointment_status_badge.vue';
import widgets_garage_convert_appointment_modal from '../../widgets/widgets_garage_convert_appointment_modal.vue';
import widgets_garage_appointment_summary_modal from '../../widgets/widgets_garage_appointment_summary_modal.vue';
import AgendaCalendar from '../../components/agenda/AgendaCalendar.vue';
import AgendaSettingsPanel, { type AgendaSettingsValue } from '../../components/agenda/AgendaSettingsPanel.vue';
import AppToast from '../../components/AppToast.vue';
import ConfirmActionModal from '../../components/admin/ConfirmActionModal.vue';
import { useToast } from '../../composables/useToast';
import type { AgendaEvent, AgendaStatusColorMap, AgendaCapacityByDate, AgendaView } from '../../components/agenda/agendaTypes';
import { dateKey, addDays, toDate } from '../../components/agenda/agendaLayout';
import type { Appointment } from '../../types/garage';

const router     = useRouter();
const perms = usePermissions();
const canCreate = computed(() => !perms.isReadOnly.value && perms.canDo('garage_appointments', 'can_create'));
const canEdit = computed(() => !perms.isReadOnly.value && perms.canDo('garage_appointments', 'can_edit'));
const canAdmin = computed(() => !perms.isReadOnly.value && perms.canDo('garage_appointments', 'can_admin'));
const canConvert = computed(() => canEdit.value && perms.canDo('garage_work_orders', 'can_view') && perms.canDo('garage_work_orders', 'can_create'));
const tabs = computed(() => ([['day', 'Día'], ['month', 'Mes'], ['all', 'Todas'], ...(canAdmin.value ? [['settings', 'Configuración']] : [])] as [typeof activeTab.value, string][]));
const store      = useGarageAppointmentsStore();
const { toasts, triggerToast, removeToast } = useToast();
const activeTab  = ref<'day' | 'month' | 'all' | 'settings'>('month');

// ── "Todas" tab (unchanged behavior) ─────────────────────────────
const status    = ref('');
const dateFrom  = ref(new Date().toISOString().split('T')[0]);
const page      = ref(1);

async function loadAll() {
  await store.load({ status: status.value || undefined, date_from: dateFrom.value || undefined, page: page.value, limit: 50 });
}
watch([status, dateFrom], () => { page.value = 1; loadAll(); });

// ── Día / Mes tabs ────────────────────────────────────────────────
const agendaView = ref<AgendaView>('month');
const agendaDate = ref(new Date());
const agendaEvents = ref<Appointment[]>([]);
const agendaLoading = ref(false);

async function loadAgendaRange() {
  agendaLoading.value = true;
  try {
    let from: Date, to: Date;
    if (agendaView.value === 'month') {
      from = addDays(new Date(agendaDate.value.getFullYear(), agendaDate.value.getMonth(), 1), -7);
      to = addDays(new Date(agendaDate.value.getFullYear(), agendaDate.value.getMonth() + 1, 0), 7);
    } else {
      from = addDays(agendaDate.value, -1);
      to = addDays(agendaDate.value, 1);
    }
    const res = await garageAppointmentsService.list({
      date_from: dateKey(from), date_to: dateKey(to), limit: 500,
    });
    agendaEvents.value = res.data.data;
  } catch (e: any) {
    agendaEvents.value = [];
    triggerToast('Error de agenda', e?.response?.data?.error || 'No se pudieron cargar las citas.', 'error');
  } finally {
    agendaLoading.value = false;
  }
}
watch([agendaView, agendaDate], loadAgendaRange);

const STATUS_COLORS: AgendaStatusColorMap = {
  scheduled:               { bg: 'bg-blue-500/20',   text: 'text-blue-300',   dot: 'bg-blue-400' },
  confirmed:               { bg: 'bg-cyan-500/20',   text: 'text-cyan-300',   dot: 'bg-cyan-400' },
  arrived:                 { bg: 'bg-yellow-500/20', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  converted_to_work_order: { bg: 'bg-green-500/20',  text: 'text-green-300', dot: 'bg-green-400' },
  cancelled:               { bg: 'bg-red-500/20',    text: 'text-red-300',   dot: 'bg-red-400' },
  no_show:                 { bg: 'bg-orange-500/20', text: 'text-orange-300', dot: 'bg-orange-400' },
  rescheduled:             { bg: 'bg-purple-500/20', text: 'text-purple-300', dot: 'bg-purple-400' },
};

const agendaCalendarEvents = computed<AgendaEvent[]>(() =>
  agendaEvents.value
    .map((a) => ({
      id: a.id,
      start: a.scheduled_start,
      end: a.scheduled_end || a.scheduled_start,
      title: a.customer_name || 'Sin cliente',
      status: a.status,
      actionLabel: agendaView.value === 'day' ? 'Ver' : (canEdit.value ? 'Editar' : 'Ver'),
      actionKind: agendaView.value === 'day' ? 'view' : (canEdit.value ? 'edit' : 'view'),
    }))
);

const capacityByDate = computed<AgendaCapacityByDate>(() => {
  const max = settings.value.max_appointments_per_day;
  if (max == null) return {};
  const counts: Record<string, number> = {};
  for (const ev of agendaCalendarEvents.value) {
    if (ev.status === 'cancelled' || ev.status === 'no_show') continue;
    const key = dateKey(toDate(ev.start));
    counts[key] = (counts[key] || 0) + 1;
  }
  const result: AgendaCapacityByDate = {};
  for (const [key, count] of Object.entries(counts)) {
    const status = count >= max ? 'full' : count >= max * 0.8 ? 'near' : 'ok';
    result[key] = { count, status };
  }
  return result;
});

// ── Configuración tab ─────────────────────────────────────────────
const settings = ref<AgendaSettingsValue>({ max_appointments_per_day: null, business_hours_start: '08:00', business_hours_end: '20:00' });
const savingSettings = ref(false);
const settingsError = ref('');
const settingsSaved = ref(false);

async function loadSettings() {
  const res = await garageAppointmentsService.getSettings();
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
    await garageAppointmentsService.updateSettings(value);
    settings.value = value;
    settingsSaved.value = true;
  } catch (e: any) {
    settingsError.value = e?.response?.data?.error || 'No se pudo guardar la configuración.';
  } finally {
    savingSettings.value = false;
  }
}

onMounted(() => {
  loadAll();
  loadAgendaRange();
  loadSettings();
});

// ── Create / edit / convert ────────────────────────────────────────
const showForm  = ref(false);
const editing   = ref<Appointment | null>(null);
const prefill   = ref<{ date: Date; hour?: number; minute?: number } | null>(null);
const converting = ref<Appointment | null>(null);
const summaryAppointment = ref<Appointment | null>(null);
type SummaryAction = 'confirm' | 'arrive' | 'no_show' | 'cancel' | 'edit' | 'convert';
const actionLoading = ref<SummaryAction | null>(null);
const confirmModal = ref({
  open: false,
  title: '',
  message: '',
  confirmText: 'Confirmar',
  variant: 'warning' as 'danger' | 'warning' | 'info',
  onConfirm: async () => {},
});
const loadingDetailId = ref<number | null>(null);
const detailError = ref('');

function openCreate(pre?: { date: Date; hour?: number; minute?: number }) {
  if (!canCreate.value) return;
  editing.value = null;
  prefill.value = pre ?? null;
  showForm.value = true;
}
async function openEdit(id: number) {
  loadingDetailId.value = id;
  detailError.value = '';
  try {
    const full = await store.loadOne(id);
    editing.value = full;
    prefill.value = null;
    showForm.value = true;
  } catch (e: any) {
    detailError.value = e?.response?.data?.error || 'No se pudo cargar el detalle de la cita.';
    triggerToast('No se pudo abrir la cita', detailError.value, 'error');
  } finally {
    loadingDetailId.value = null;
  }
}

async function openSummary(id: number) {
  loadingDetailId.value = id;
  detailError.value = '';
  try {
    summaryAppointment.value = await store.loadOne(id);
  } catch (e: any) {
    detailError.value = e?.response?.data?.error || 'No se pudo cargar el resumen de la cita.';
    triggerToast('No se pudo abrir la cita', detailError.value, 'error');
  } finally {
    loadingDetailId.value = null;
  }
}
function openConvert(a: Appointment) { if (canConvert.value) converting.value = a; }

function onCalendarCreate(payload: { date: Date; hour?: number; minute?: number }) {
  openCreate(payload);
}

async function onCalendarSelectEvent(payload: { event: AgendaEvent }) {
  if (agendaView.value === 'day') await openSummary(Number(payload.event.id));
  else await openEdit(Number(payload.event.id));
}

function askStateChange(config: { title: string; message: string; confirmText: string; variant: 'danger' | 'warning' | 'info'; action: Exclude<SummaryAction, 'edit' | 'convert'> }) {
  confirmModal.value = {
    open: true,
    title: config.title,
    message: config.message,
    confirmText: config.confirmText,
    variant: config.variant,
    onConfirm: async () => executeStateChange(config.action),
  };
}

async function executeStateChange(action: Exclude<SummaryAction, 'edit' | 'convert'>) {
  const appointment = summaryAppointment.value;
  if (!appointment || !canEdit.value) return;
  actionLoading.value = action;
  try {
    if (action === 'confirm') await store.confirm(appointment.id);
    else if (action === 'arrive') await store.markArrived(appointment.id);
    else if (action === 'no_show') await store.markNoShow(appointment.id);
    else await store.cancel(appointment.id);

    const messages: Record<typeof action, string> = {
      confirm: 'La cita fue confirmada.',
      arrive: 'La llegada del cliente fue registrada.',
      no_show: 'La cita fue marcada como no presentada.',
      cancel: 'La cita fue cancelada.',
    };
    summaryAppointment.value = await store.loadOne(appointment.id);
    await Promise.all([loadAgendaRange(), loadAll()]);
    triggerToast('Estado actualizado', messages[action], 'success');
  } catch (e: any) {
    triggerToast('No se pudo actualizar la cita', e?.response?.data?.error || 'Error al actualizar el estado.', 'error');
  } finally {
    actionLoading.value = null;
  }
}

function onSummaryAction(action: SummaryAction) {
  const appointment = summaryAppointment.value;
  if (!appointment) return;
  if (action === 'edit') {
    summaryAppointment.value = null;
    editing.value = appointment;
    prefill.value = null;
    showForm.value = true;
    return;
  }
  if (action === 'convert') {
    summaryAppointment.value = null;
    openConvert(appointment);
    return;
  }

  const name = appointment.customer_name || 'este cliente';
  const configs = {
    confirm: { title: 'Confirmar cita', message: `¿Confirmar la cita de ${name}?`, confirmText: 'Confirmar cita', variant: 'info' as const },
    arrive: { title: 'Registrar llegada', message: `¿Registrar que ${name} llegó a su cita?`, confirmText: 'Registrar llegada', variant: 'info' as const },
    no_show: { title: 'Marcar ausencia', message: `¿Confirmas que ${name} no se presentó? La cita dejará de ocupar cupo.`, confirmText: 'No se presentó', variant: 'warning' as const },
    cancel: { title: 'Cancelar cita', message: `¿Cancelar la cita de ${name}? Esta acción quedará registrada en el historial.`, confirmText: 'Cancelar cita', variant: 'danger' as const },
  };
  askStateChange({ ...configs[action], action });
}

function onSaved(saved: Appointment) {
  const wasEditing = !!editing.value;
  showForm.value = false;
  editing.value = null;
  prefill.value = null;
  triggerToast(
    wasEditing ? 'Cita actualizada' : 'Cita creada',
    `${saved.customer_name || 'La cita'} quedó agendada para las ${fmtTime(saved.scheduled_start)}.`,
    'success',
  );
  loadAll();
  loadAgendaRange();
}

function onSaveFailed(message: string) {
  triggerToast('No se pudo guardar la cita', message, 'error');
}

const showConvertModal = computed({
  get: () => !!converting.value,
  set: (v: boolean) => { if (!v) converting.value = null; }
});

function onConverted(woId: number) {
  converting.value = null;
  summaryAppointment.value = null;
  router.push(`/garage/work-orders/${woId}`);
}

const fmtDateShort = (d: string) => toDate(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
const fmtTime      = (d: string) => toDate(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

const PRIORITY_COLOR: Record<string, string> = {
  low:    'bg-white/10 nxr-text-muted',
  normal: 'bg-blue-500/20 text-blue-300',
  high:   'bg-orange-500/20 text-orange-300',
  urgent: 'bg-red-500/20 text-red-300',
};
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold nxr-text">Agenda / Citas</h1>
      <button v-if="canCreate && activeTab !== 'settings'" class="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition nxr-btn-primary" @click="openCreate()">
        <Plus :size="15" /> Nueva cita
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex items-center gap-1 rounded-2xl p-1 nxr-card-subtle w-fit">
      <button v-for="tab in tabs" :key="tab[0]"
              type="button"
              class="rounded-xl px-4 py-1.5 text-xs font-medium transition"
              :class="activeTab === tab[0] ? 'nxr-btn-primary' : 'nxr-text-muted'"
              @click="activeTab = tab[0]; if (tab[0] === 'day' || tab[0] === 'month') agendaView = tab[0]">
        {{ tab[1] }}
      </button>
    </div>

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
      @create="onCalendarCreate"
      @select-event="onCalendarSelectEvent" />

    <!-- Configuración -->
    <AgendaSettingsPanel
      v-else-if="activeTab === 'settings' && canAdmin"
      module-label="Taller"
      :settings="settings"
      :saving="savingSettings"
      :error="settingsError"
      :saved="settingsSaved"
      @save="saveSettings" />

    <!-- Todas -->
    <template v-else>
      <p v-if="detailError" class="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{{ detailError }}</p>
      <div class="flex items-center gap-3 flex-wrap">
        <input v-model="dateFrom" type="date" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text outline-none focus:border-white/30" />
        <select v-model="status" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm nxr-text outline-none">
          <option value="">Todos los estados</option>
          <option value="scheduled">Programada</option>
          <option value="confirmed">Confirmada</option>
          <option value="arrived">Cliente llegó</option>
          <option value="rescheduled">Reagendada</option>
          <option value="cancelled">Cancelada</option>
          <option value="no_show">No se presentó</option>
          <option value="converted_to_work_order">Convertida</option>
        </select>
      </div>

      <div v-if="store.loading" class="flex flex-col gap-2">
        <div v-for="i in 6" :key="i" class="h-20 rounded-xl bg-white/5 animate-pulse"></div>
      </div>

      <div v-else-if="store.items.length === 0" class="text-center nxr-text-soft py-16 text-sm">No hay citas para los filtros seleccionados.</div>

      <div v-else class="flex flex-col gap-2">
        <div
          v-for="a in store.items"
          :key="a.id"
          class="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/10 hover:border-white/25 transition-all"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <div class="w-12 text-center shrink-0">
            <p class="text-lg font-bold nxr-text leading-none">{{ fmtTime(a.scheduled_start) }}</p>
            <p class="text-xs nxr-text-muted">{{ fmtDateShort(a.scheduled_start) }}</p>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <p class="text-sm font-medium nxr-text truncate">{{ a.customer_name || 'Sin cliente' }}</p>
              <widgets_garage_appointment_status_badge :status="a.status" :small="true" />
              <span class="text-xs px-2 py-0.5 rounded-full" :class="PRIORITY_COLOR[a.priority]">{{ a.priority }}</span>
            </div>
            <p class="text-xs nxr-text-muted truncate">{{ a.plate ? `${a.plate} ·` : '' }} {{ a.requested_service_summary || a.reported_issue || 'Sin descripción' }}</p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="canConvert && ['scheduled','confirmed','arrived'].includes(a.status)"
              type="button"
              class="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors"
              @click.stop="openConvert(a)"
            >
              <ArrowRight :size="12" /> Crear OT
            </button>
            <button type="button" :disabled="loadingDetailId === a.id" class="nxr-text-soft hover:text-[var(--nexora-text-color)] disabled:opacity-50" aria-label="Abrir detalle de cita" @click.stop="openEdit(a.id)">
              <Loader2 v-if="loadingDetailId === a.id" :size="16" class="animate-spin" />
              <ChevronRight v-else :size="16" />
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between mt-2 text-xs nxr-text-muted">
          <span>{{ store.total }} citas</span>
          <div class="flex items-center gap-2">
            <button :disabled="page <= 1" class="px-3 py-1 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20" @click="page--; loadAll()">Anterior</button>
            <span>Página {{ page }}</span>
            <button :disabled="store.items.length < 50" class="px-3 py-1 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20" @click="page++; loadAll()">Siguiente</button>
          </div>
        </div>
      </div>
    </template>

    <widgets_garage_appointment_form_modal v-model="showForm" :appointment="editing" :read-only="editing ? !canEdit : !canCreate" :prefill="prefill" @saved="onSaved" @failed="onSaveFailed" />
    <widgets_garage_appointment_summary_modal
      :model-value="!!summaryAppointment"
      :appointment="summaryAppointment"
      :can-edit="canEdit"
      :can-convert="canConvert"
      :action-loading="actionLoading"
      @update:model-value="(open) => { if (!open) summaryAppointment = null; }"
      @action="onSummaryAction" />
    <widgets_garage_convert_appointment_modal v-model="showConvertModal" :appointment="converting" @converted="onConverted" />

    <ConfirmActionModal
      :is-open="confirmModal.open"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :confirm-text="confirmModal.confirmText"
      :variant="confirmModal.variant"
      @confirmed="() => { confirmModal.open = false; confirmModal.onConfirm(); }"
      @cancelled="confirmModal.open = false" />

    <div class="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[calc(100%-2rem)] max-w-80 flex-col gap-2">
      <AppToast v-for="toast in toasts" :key="toast.id" :toast="toast" @close="removeToast" />
    </div>
  </div>
</template>
