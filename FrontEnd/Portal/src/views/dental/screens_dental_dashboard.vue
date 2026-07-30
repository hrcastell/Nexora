<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { CalendarDays, Users, DollarSign, TrendingUp, AlertTriangle, Clock, ArrowRight, Stethoscope } from 'lucide-vue-next';
import { useDentalDashboardStore } from '../../stores/dentalDashboard';

const router = useRouter();
const store  = useDentalDashboardStore();

const summary = computed(() => store.summary);
const agenda  = computed(() => store.todayAgenda);

function fmt(n: number) {
  return `$${Math.round(n ?? 0).toLocaleString('es-AR')}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

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

const ADMIN_STATUS_LABEL: Record<string, string> = {
  unpaid:          'Sin pagar',
  partially_paid:  'Pago parcial',
  paid:            'Pagado',
  overdue:         'Vencido',
  cancelled:       'Cancelado',
};

const ADMIN_STATUS_CLASS: Record<string, string> = {
  unpaid:          'bg-yellow-500/20 text-yellow-400',
  partially_paid:  'bg-blue-500/20 text-blue-400',
  paid:            'bg-green-500/20 text-green-400',
  overdue:         'bg-red-500/20 text-red-400',
  cancelled:       'bg-white/10 nxr-text-muted',
};

onMounted(() => store.load());
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold nxr-text">Dental — Dashboard</h1>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-white/10 nxr-text-muted hover:border-white/30 hover:text-[var(--nexora-text-color)] transition-all"
        @click="router.push('/dental/appointments')"
      >
        Ver citas <ArrowRight :size="14" />
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="store.loading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="i in 8" :key="i" class="h-24 rounded-2xl bg-white/5 animate-pulse"></div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="text-center text-red-400 py-10 text-sm">{{ store.error }}</div>

    <!-- Content -->
    <template v-else>
      <!-- Summary cards -->
      <div v-if="summary" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <CalendarDays :size="20" class="text-blue-400" />
          <p class="text-2xl font-bold nxr-text">{{ summary.today_appointments_count }}</p>
          <p class="text-xs nxr-text-muted">Citas de hoy</p>
        </div>

        <div
          class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <Users :size="20" class="text-green-400" />
          <p class="text-2xl font-bold nxr-text">{{ summary.patients_seen_today }}</p>
          <p class="text-xs nxr-text-muted">Pacientes atendidos hoy</p>
        </div>

        <div
          class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <DollarSign :size="20" class="text-cyan-400" />
          <p class="text-2xl font-bold nxr-text">{{ fmt(summary.total_charged_today) }}</p>
          <p class="text-xs nxr-text-muted">Facturado hoy</p>
        </div>

        <div
          class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <TrendingUp :size="20" class="text-purple-400" />
          <p class="text-2xl font-bold nxr-text">{{ fmt(summary.total_charged_month) }}</p>
          <p class="text-xs nxr-text-muted">Facturado este mes</p>
        </div>

        <div
          class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <Clock :size="20" class="text-orange-400" />
          <p class="text-2xl font-bold nxr-text">{{ fmt(summary.total_pending) }}</p>
          <p class="text-xs nxr-text-muted">Pendiente de cobro</p>
        </div>

        <div
          class="flex flex-col gap-2 p-5 rounded-2xl border border-white/10"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <AlertTriangle :size="20" class="text-red-400" />
          <p class="text-2xl font-bold nxr-text">{{ summary.overdue_patients_count }}</p>
          <p class="text-xs nxr-text-muted">Pacientes con deuda vencida</p>
        </div>
      </div>

      <!-- Today's agenda -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <CalendarDays :size="16" class="text-blue-400" />
            <h2 class="text-sm font-semibold nxr-text">Agenda de hoy</h2>
          </div>
          <button class="text-xs nxr-text-muted hover:text-[var(--nexora-text-color)] transition-colors" @click="router.push('/dental/appointments')">
            Ver todas
          </button>
        </div>

        <div v-if="agenda.length === 0" class="py-8 text-center nxr-text-soft text-sm">
          No hay citas programadas para hoy.
        </div>

        <div v-else class="flex flex-col gap-2">
          <div
            v-for="apt in agenda"
            :key="apt.id"
            class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all"
            :style="{ background: 'var(--nexora-glass-bg)' }"
          >
            <div class="flex flex-col items-center justify-center w-12 shrink-0 text-center">
              <p class="text-sm font-bold nxr-text">{{ fmtTime(apt.scheduled_start) }}</p>
              <p class="text-xs nxr-text-soft">{{ fmtTime(apt.scheduled_end) }}</p>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm nxr-text truncate">{{ apt.customer?.first_name }} {{ apt.customer?.last_name }}</p>
              <p class="text-xs nxr-text-muted truncate">{{ apt.treatment?.name ?? apt.reason ?? '—' }}</p>
            </div>
            <span class="px-2 py-0.5 rounded-full text-xs shrink-0" :class="STATUS_CLASS[apt.status]">
              {{ STATUS_LABEL[apt.status] ?? apt.status }}
            </span>
          </div>
        </div>
      </div>

      <!-- Recent consultations -->
      <div v-if="(summary?.recent_consultations?.length ?? 0) > 0" class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <Stethoscope :size="16" class="text-green-400" />
          <h2 class="text-sm font-semibold nxr-text">Consultas recientes</h2>
        </div>
        <div class="flex flex-col gap-2">
          <div
            v-for="c in summary!.recent_consultations.slice(0, 5)"
            :key="c.id"
            class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            :style="{ background: 'var(--nexora-glass-bg)' }"
            @click="router.push('/dental/consultations')"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm nxr-text truncate">{{ c.customer?.first_name }} {{ c.customer?.last_name }}</p>
              <p class="text-xs nxr-text-muted truncate">{{ fmtDate(c.consultation_date) }} · {{ c.treatment?.name ?? c.reason ?? '—' }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="px-2 py-0.5 rounded-full text-xs" :class="ADMIN_STATUS_CLASS[c.administrative_status]">
                {{ ADMIN_STATUS_LABEL[c.administrative_status] ?? c.administrative_status }}
              </span>
              <p class="text-sm font-semibold nxr-text">{{ fmt(c.total_amount) }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
