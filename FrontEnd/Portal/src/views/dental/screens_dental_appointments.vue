<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, CalendarDays, List, Calendar, CheckCircle2, XCircle, UserX, ArrowRightCircle } from 'lucide-vue-next';
import { useDentalAppointmentsStore } from '../../stores/dentalAppointments';
import { useDentalPatientsStore } from '../../stores/dentalPatients';
import { useDentalServicesStore } from '../../stores/dentalServices';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import AppToast from '../../components/AppToast.vue';
import ConfirmActionModal from '../../components/admin/ConfirmActionModal.vue';
import { useToast } from '../../composables/useToast';
import type { DentalAppointment, DentalAppointmentFormData } from '../../types/dental';

const store = useDentalAppointmentsStore();
const patientsStore = useDentalPatientsStore();
const servicesStore = useDentalServicesStore();
const { toasts, triggerToast, removeToast } = useToast();

const confirmModal = ref<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
  open: false, title: '', message: '', onConfirm: () => {}
});
function askConfirm(title: string, message: string, onConfirm: () => void) {
  confirmModal.value = { open: true, title, message, onConfirm };
}

const patientSearch = ref('');
const selectedPatient = ref<any>(null);
const showPatientDrop = ref(false);

let patientSearchTimer: ReturnType<typeof setTimeout> | null = null;

function onPatientInput() {
  selectedPatient.value = null;
  form.value.customer_id = '';
  if (patientSearchTimer) clearTimeout(patientSearchTimer);
  if (!patientSearch.value.trim()) { showPatientDrop.value = false; return; }
  patientSearchTimer = setTimeout(async () => {
    await patientsStore.load({ search: patientSearch.value });
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

type ViewTab = 'today' | 'month' | 'all';
const activeTab = ref<ViewTab>('today');
const showPanel = ref(false);
const saving    = ref(false);
const saveError = ref<string | null>(null);
const actionError = ref<string | null>(null);

const now = new Date();
const currentYear  = ref(now.getFullYear());
const currentMonth = ref(now.getMonth() + 1);

const defaultForm = (): DentalAppointmentFormData => ({
  customer_id: '',
  service_id: undefined,
  scheduled_start: '',
  scheduled_end: '',
  reason: '',
  notes: '',
});

const form = ref<DentalAppointmentFormData>(defaultForm());

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

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
  completed:   'bg-white/10 text-white/50',
  cancelled:   'bg-red-500/20 text-red-400',
  no_show:     'bg-orange-500/20 text-orange-400',
  rescheduled: 'bg-purple-500/20 text-purple-400',
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function patientDisplayName(apt: DentalAppointment) {
  return (apt.customer as any)?.full_name
    ?? [apt.customer?.first_name, apt.customer?.last_name].filter(Boolean).join(' ')
    ?? 'Paciente';
}

// Group month items by day
const monthGrouped = computed(() => {
  const map = new Map<string, DentalAppointment[]>();
  for (const apt of store.items) {
    const key = fmtDate(apt.scheduled_start);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(apt);
  }
  return map;
});

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localDateKey(iso: string) {
  return dateKey(new Date(iso));
}

const appointmentsByDate = computed(() => {
  const map = new Map<string, DentalAppointment[]>();
  for (const apt of store.items) {
    const key = localDateKey(apt.scheduled_start);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(apt);
  }
  return map;
});

const calendarDays = computed(() => {
  const first = new Date(currentYear.value, currentMonth.value - 1, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    return {
      key,
      day: date.getDate(),
      inMonth: date.getMonth() + 1 === currentMonth.value,
      isToday: key === dateKey(new Date()),
      appointments: appointmentsByDate.value.get(key) ?? [],
    };
  });
});

async function goPreviousMonth() {
  if (currentMonth.value > 1) currentMonth.value--;
  else { currentMonth.value = 12; currentYear.value--; }
  await store.loadMonth(currentYear.value, currentMonth.value);
}

async function goNextMonth() {
  if (currentMonth.value < 12) currentMonth.value++;
  else { currentMonth.value = 1; currentYear.value++; }
  await store.loadMonth(currentYear.value, currentMonth.value);
}

async function switchTab(tab: ViewTab) {
  activeTab.value = tab;
  if (tab === 'today') await store.loadToday();
  else if (tab === 'month') await store.loadMonth(currentYear.value, currentMonth.value);
  else await store.load();
}

function openCreate() {
  form.value = defaultForm();
  saveError.value = null;
  patientSearch.value = '';
  selectedPatient.value = null;
  showPatientDrop.value = false;
  showPanel.value = true;
}

async function refreshActiveTab() {
  if (activeTab.value === 'today') await store.loadToday();
  else if (activeTab.value === 'month') await store.loadMonth(currentYear.value, currentMonth.value);
  else await store.load();
}

async function save() {
  saving.value = true;
  saveError.value = null;
  try {
    await store.create(form.value);
    triggerToast('Éxito', 'Cita creada', 'success');
    showPanel.value = false;
    await refreshActiveTab();
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al guardar cita';
  } finally {
    saving.value = false;
  }
}

async function doAction(action: 'confirm' | 'cancel' | 'no_show' | 'convert', apt: DentalAppointment) {
  actionError.value = null;

  if (action === 'cancel') {
    askConfirm(
      'Cancelar cita',
      `¿Cancelar la cita de ${patientDisplayName(apt)}?`,
      async () => {
        try {
          await store.cancel(apt.id);
          triggerToast('Éxito', 'Cita cancelada', 'success');
          await refreshActiveTab();
        } catch (e: any) {
          triggerToast('Error', e?.response?.data?.error || 'Error al cancelar cita', 'error');
        }
      }
    );
    return;
  }

  try {
    if (action === 'confirm') {
      await store.confirm(apt.id);
      triggerToast('Éxito', 'Cita confirmada', 'success');
      await refreshActiveTab();
    } else if (action === 'no_show') {
      await store.noShow(apt.id);
      triggerToast('Éxito', 'Marcado como no presentado', 'success');
      await refreshActiveTab();
    } else if (action === 'convert') {
      await store.convertToConsultation(apt.id);
      triggerToast('Éxito', 'Convertida a consulta', 'success');
      await refreshActiveTab();
    }
  } catch (e: any) {
    actionError.value = e?.response?.data?.error || 'Error al ejecutar acción';
    triggerToast('Error', e?.response?.data?.error || 'Error al ejecutar acción', 'error');
  }
}

onMounted(() => {
  store.loadToday();
  patientsStore.load();
  servicesStore.load();
});
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-xl font-semibold text-white">Citas</h1>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
        @click="openCreate"
      >
        <Plus :size="15" /> Nueva cita
      </button>
    </div>

    <!-- Tab switcher -->
    <div class="flex items-center gap-2">
      <button
        v-for="tab in [
          { key: 'today', label: 'Hoy',   icon: CalendarDays },
          { key: 'month', label: 'Calendario',   icon: Calendar },
          { key: 'all',   label: 'Todas', icon: List },
        ]"
        :key="tab.key"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
        :class="activeTab === tab.key
          ? 'bg-[var(--nexora-primary)] text-white'
          : 'text-white/50 border border-white/10 hover:border-white/30 hover:text-white'"
        @click="switchTab(tab.key as ViewTab)"
      >
        <component :is="tab.icon" :size="12" /> {{ tab.label }}
      </button>

      <!-- Month nav -->
      <template v-if="activeTab === 'month'">
        <button class="ml-2 px-2 py-1 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white" @click="goPreviousMonth">‹</button>
        <span class="text-xs text-white/60">{{ MONTHS[currentMonth - 1] }} {{ currentYear }}</span>
        <button class="px-2 py-1 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white" @click="goNextMonth">›</button>
      </template>
    </div>

    <p v-if="actionError" class="text-xs text-red-400">{{ actionError }}</p>

    <!-- Loading -->
    <div v-if="store.loading" class="flex flex-col gap-2">
      <div v-for="i in 6" :key="i" class="h-16 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="text-center text-red-400 py-10 text-sm">{{ store.error }}</div>

    <!-- Today tab -->
    <template v-else-if="activeTab === 'today'">
      <div v-if="store.today.length === 0" class="flex flex-col items-center gap-4 py-20 text-center">
        <CalendarDays :size="48" class="text-white/20" />
        <p class="text-white/50 text-sm">No hay citas para hoy.</p>
        <button class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90" @click="openCreate">
          <Plus :size="15" /> Agendar cita
        </button>
      </div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="apt in store.today"
          :key="apt.id"
          class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <div class="flex flex-col items-center w-14 shrink-0 text-center">
            <p class="text-sm font-bold text-white">{{ fmtTime(apt.scheduled_start) }}</p>
            <p class="text-xs text-white/30">{{ fmtTime(apt.scheduled_end) }}</p>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ apt.customer?.first_name }} {{ apt.customer?.last_name }}</p>
            <p class="text-xs text-white/40 truncate">{{ apt.service?.name ?? apt.reason ?? '—' }}</p>
          </div>
          <span class="px-2 py-0.5 rounded-full text-xs shrink-0" :class="STATUS_CLASS[apt.status]">{{ STATUS_LABEL[apt.status] }}</span>
          <!-- Action buttons -->
          <div class="flex items-center gap-1 shrink-0">
            <button v-if="apt.status === 'scheduled'" class="text-green-400 hover:opacity-70 transition-opacity" title="Confirmar" @click="doAction('confirm', apt)">
              <CheckCircle2 :size="16" />
            </button>
            <button v-if="['scheduled','confirmed'].includes(apt.status)" class="text-cyan-400 hover:opacity-70 transition-opacity" title="Convertir en consulta" @click="doAction('convert', apt)">
              <ArrowRightCircle :size="16" />
            </button>
            <button v-if="['scheduled','confirmed'].includes(apt.status)" class="text-orange-400 hover:opacity-70 transition-opacity" title="No asistió" @click="doAction('no_show', apt)">
              <UserX :size="16" />
            </button>
            <button v-if="['scheduled','confirmed'].includes(apt.status)" class="text-red-400 hover:opacity-70 transition-opacity" title="Cancelar" @click="doAction('cancel', apt)">
              <XCircle :size="16" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Month tab -->
    <template v-else-if="activeTab === 'month'">
      <div v-if="store.items.length === 0" class="text-center text-white/30 py-16 text-sm">
        No hay citas en {{ MONTHS[currentMonth - 1] }} {{ currentYear }}.
      </div>
      <div v-else class="flex flex-col gap-5">
        <div class="grid grid-cols-7 gap-2 rounded-2xl border border-white/10 p-3" :style="{ background: 'var(--nexora-glass-bg)' }">
          <div v-for="dayName in ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']" :key="dayName" class="px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-white/35">
            {{ dayName }}
          </div>
          <div
            v-for="day in calendarDays"
            :key="day.key"
            class="min-h-28 rounded-xl border p-2 transition-colors"
            :class="[
              day.inMonth ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 bg-black/10 opacity-45',
              day.isToday ? 'ring-1 ring-[var(--nexora-primary)]' : ''
            ]"
          >
            <div class="mb-2 flex items-center justify-between">
              <span class="text-xs font-semibold" :class="day.isToday ? 'text-[var(--nexora-primary)]' : 'text-white/60'">{{ day.day }}</span>
              <span v-if="day.appointments.length" class="rounded-full bg-[var(--nexora-primary)]/20 px-1.5 py-0.5 text-[10px] text-white/70">{{ day.appointments.length }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <div
                v-for="apt in day.appointments.slice(0, 3)"
                :key="apt.id"
                class="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/75"
              >
                <p class="font-semibold">{{ fmtTime(apt.scheduled_start) }}</p>
                <p class="truncate text-white/50">{{ patientDisplayName(apt) }}</p>
              </div>
              <p v-if="day.appointments.length > 3" class="text-[10px] text-white/35">+{{ day.appointments.length - 3 }} más</p>
            </div>
          </div>
        </div>

        <div v-for="[day, apts] in monthGrouped" :key="day">
          <p class="text-xs text-white/40 uppercase tracking-wide font-semibold mb-2">{{ day }}</p>
          <div class="flex flex-col gap-1.5">
            <div
              v-for="apt in apts"
              :key="apt.id"
              class="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/10"
              :style="{ background: 'var(--nexora-glass-bg)' }"
            >
              <p class="text-xs text-white/50 w-12 shrink-0">{{ fmtTime(apt.scheduled_start) }}</p>
              <p class="text-sm text-white flex-1 truncate">{{ apt.customer?.first_name }} {{ apt.customer?.last_name }}</p>
              <span class="px-2 py-0.5 rounded-full text-xs shrink-0" :class="STATUS_CLASS[apt.status]">{{ STATUS_LABEL[apt.status] }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- All tab -->
    <template v-else>
      <div v-if="store.items.length === 0" class="text-center text-white/30 py-16 text-sm">
        No hay citas registradas.
      </div>
      <div v-else class="flex flex-col gap-2">
        <!-- Desktop header -->
        <div class="hidden md:grid md:grid-cols-[140px_1fr_1fr_120px_100px] gap-4 px-4 py-2 text-xs text-white/30 font-semibold uppercase tracking-wide">
          <span>Fecha/Hora</span>
          <span>Paciente</span>
          <span>Servicio</span>
          <span>Estado</span>
          <span class="text-right">Acciones</span>
        </div>
        <div
          v-for="apt in store.items"
          :key="apt.id"
          class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <!-- Mobile -->
          <div class="flex-1 min-w-0 md:hidden">
            <p class="text-sm font-medium text-white truncate">{{ apt.customer?.first_name }} {{ apt.customer?.last_name }}</p>
            <p class="text-xs text-white/40">{{ fmtDate(apt.scheduled_start) }} {{ fmtTime(apt.scheduled_start) }}</p>
          </div>
          <!-- Desktop -->
          <div class="hidden md:grid md:grid-cols-[140px_1fr_1fr_120px_100px] gap-4 items-center flex-1">
            <p class="text-xs text-white/60">{{ fmtDate(apt.scheduled_start) }}<br />{{ fmtTime(apt.scheduled_start) }}</p>
            <p class="text-sm text-white truncate">{{ apt.customer?.first_name }} {{ apt.customer?.last_name }}</p>
            <p class="text-xs text-white/60 truncate">{{ apt.service?.name ?? apt.reason ?? '—' }}</p>
            <span class="px-2 py-0.5 rounded-full text-xs w-fit" :class="STATUS_CLASS[apt.status]">{{ STATUS_LABEL[apt.status] }}</span>
            <div class="flex items-center justify-end gap-1">
              <button v-if="apt.status === 'scheduled'" class="text-green-400 hover:opacity-70" title="Confirmar" @click="doAction('confirm', apt)"><CheckCircle2 :size="14" /></button>
              <button v-if="['scheduled','confirmed'].includes(apt.status)" class="text-cyan-400 hover:opacity-70" title="Consulta" @click="doAction('convert', apt)"><ArrowRightCircle :size="14" /></button>
              <button v-if="['scheduled','confirmed'].includes(apt.status)" class="text-orange-400 hover:opacity-70" title="No asistió" @click="doAction('no_show', apt)"><UserX :size="14" /></button>
              <button v-if="['scheduled','confirmed'].includes(apt.status)" class="text-red-400 hover:opacity-70" title="Cancelar" @click="doAction('cancel', apt)"><XCircle :size="14" /></button>
            </div>
          </div>
          <!-- Mobile status + actions -->
          <div class="flex items-center gap-2 shrink-0 md:hidden">
            <span class="px-2 py-0.5 rounded-full text-xs" :class="STATUS_CLASS[apt.status]">{{ STATUS_LABEL[apt.status] }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Create panel -->
    <NxrSlidePanel :open="showPanel" title="Nueva cita" eyebrow="Dental" @close="showPanel = false">
      <form class="flex flex-col gap-5" @submit.prevent="save">
        <div class="flex flex-col gap-1.5 relative">
          <label class="text-xs text-white/50">Paciente *</label>
          <input
            v-model="patientSearch"
            type="text"
            placeholder="Buscar por nombre o documento..."
            autocomplete="off"
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 outline-none focus:border-white/30"
            @input="onPatientInput"
            @focus="focusPatientDrop"
            @blur="blurPatientDrop"
          />
          <div v-if="selectedPatient" class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[var(--nexora-primary)]/20 border border-[var(--nexora-primary)]/30 text-xs text-white">
            <span>{{ selectedPatient.first_name }} {{ selectedPatient.last_name }}</span>
            <button type="button" class="text-white/50 hover:text-white ml-2" @click="clearPatient">✕</button>
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
              class="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
              @mousedown.prevent="selectPatient(p)"
            >
              {{ p.first_name }} {{ p.last_name }}
              <span v-if="p.document_number" class="text-xs text-white/40 ml-2">{{ p.document_type }} {{ p.document_number }}</span>
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Inicio *</label>
          <input v-model="form.scheduled_start" type="datetime-local" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Fin *</label>
          <input v-model="form.scheduled_end" type="datetime-local" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Servicio</label>
          <select v-model="form.service_id" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30">
            <option value="">Sin servicio</option>
            <option v-for="s in servicesStore.items" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Motivo</label>
          <input v-model="form.reason" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Notas internas</label>
          <textarea v-model="form.notes" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>
      </form>
      <template #footer>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5" @click="showPanel = false">Cancelar</button>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="save">
          {{ saving ? 'Guardando...' : 'Agendar cita' }}
        </button>
      </template>
    </NxrSlidePanel>

    <!-- Toast container -->
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
      <AppToast v-for="t in toasts" :key="t.id" :toast="t" @close="removeToast" />
    </div>

    <ConfirmActionModal
      :isOpen="confirmModal.open"
      :title="confirmModal.title"
      :message="confirmModal.message"
      variant="danger"
      confirmText="Confirmar"
      cancelText="Cancelar"
      @confirmed="() => { confirmModal.open = false; confirmModal.onConfirm(); }"
      @cancelled="confirmModal.open = false"
    />
  </div>
</template>
