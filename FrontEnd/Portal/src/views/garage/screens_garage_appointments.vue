<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, ChevronRight, ArrowRight } from 'lucide-vue-next';
import { useGarageAppointmentsStore } from '../../stores/garageAppointments';
import { garageAppointmentsService } from '../../services/garageAppointmentsService';
import widgets_garage_appointment_form_modal from '../../widgets/widgets_garage_appointment_form_modal.vue';
import widgets_garage_appointment_status_badge from '../../widgets/widgets_garage_appointment_status_badge.vue';
import widgets_garage_convert_appointment_modal from '../../widgets/widgets_garage_convert_appointment_modal.vue';
import AgendaCalendar from '../../components/agenda/AgendaCalendar.vue';
import AgendaSettingsPanel, { type AgendaSettingsValue } from '../../components/agenda/AgendaSettingsPanel.vue';
import type { AgendaEvent, AgendaStatusColorMap, AgendaCapacityByDate, AgendaView } from '../../components/agenda/agendaTypes';
import { dateKey, addDays } from '../../components/agenda/agendaLayout';
import type { Appointment } from '../../types/garage';

const router     = useRouter();
const store      = useGarageAppointmentsStore();
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
  } catch {
    agendaEvents.value = [];
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
    }))
);

const capacityByDate = computed<AgendaCapacityByDate>(() => {
  const max = settings.value.max_appointments_per_day;
  if (max == null) return {};
  const counts: Record<string, number> = {};
  for (const ev of agendaCalendarEvents.value) {
    if (ev.status === 'cancelled' || ev.status === 'no_show') continue;
    const key = dateKey(new Date(ev.start));
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

async function loadSettings() {
  const res = await garageAppointmentsService.getSettings();
  settings.value = {
    max_appointments_per_day: res.data.max_appointments_per_day,
    business_hours_start: res.data.business_hours_start?.slice(0, 5) || '08:00',
    business_hours_end: res.data.business_hours_end?.slice(0, 5) || '20:00',
  };
}

async function saveSettings(value: AgendaSettingsValue) {
  savingSettings.value = true;
  try {
    await garageAppointmentsService.updateSettings(value);
    settings.value = value;
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

function openCreate(pre?: { date: Date; hour?: number; minute?: number }) {
  editing.value = null;
  prefill.value = pre ?? null;
  showForm.value = true;
}
function openEdit(a: Appointment) { editing.value = a; prefill.value = null; showForm.value = true; }
function openConvert(a: Appointment) { converting.value = a; }

function onCalendarCreate(payload: { date: Date; hour?: number; minute?: number }) {
  openCreate(payload);
}

async function onCalendarSelectEvent(payload: { event: AgendaEvent }) {
  const full = await store.loadOne(Number(payload.event.id));
  openEdit(full);
}

function onSaved() {
  showForm.value = false;
  loadAll();
  loadAgendaRange();
}

const showConvertModal = computed({
  get: () => !!converting.value,
  set: (v: boolean) => { if (!v) converting.value = null; }
});

function onConverted(woId: number) {
  converting.value = null;
  router.push(`/garage/work-orders/${woId}`);
}

const fmtDateShort = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
const fmtTime      = (d: string) => new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

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
      <button v-if="activeTab !== 'settings'" class="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition nxr-btn-primary" @click="openCreate()">
        <Plus :size="15" /> Nueva cita
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex items-center gap-1 rounded-2xl p-1 nxr-card-subtle w-fit">
      <button v-for="tab in [['day','Día'],['month','Mes'],['all','Todas'],['settings','Configuración']] as const" :key="tab[0]"
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
      :status-colors="STATUS_COLORS"
      :capacity-by-date="capacityByDate"
      :loading="agendaLoading"
      :min-hour="Number(settings.business_hours_start.split(':')[0])"
      :max-hour="Number(settings.business_hours_end.split(':')[0])"
      @create="onCalendarCreate"
      @select-event="onCalendarSelectEvent" />

    <!-- Configuración -->
    <AgendaSettingsPanel
      v-else-if="activeTab === 'settings'"
      module-label="Taller"
      :settings="settings"
      :saving="savingSettings"
      @save="saveSettings" />

    <!-- Todas -->
    <template v-else>
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
              v-if="['scheduled','confirmed','arrived'].includes(a.status)"
              type="button"
              class="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors"
              @click.stop="openConvert(a)"
            >
              <ArrowRight :size="12" /> Crear OT
            </button>
            <button type="button" class="nxr-text-soft hover:text-[var(--nexora-text-color)]" @click.stop="openEdit(a)">
              <ChevronRight :size="16" />
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

    <widgets_garage_appointment_form_modal v-model="showForm" :appointment="editing" :prefill="prefill" @saved="onSaved" />
    <widgets_garage_convert_appointment_modal v-model="showConvertModal" :appointment="converting" @converted="onConverted" />
  </div>
</template>
