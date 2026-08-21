<script setup lang="ts">
import { computed } from 'vue';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-vue-next';
import type { AgendaEvent, AgendaStatusColorMap, AgendaCapacityByDate, AgendaView } from './agendaTypes';
import { addDays, addMonths, formatMonthLabel, formatDayLabel, isSameDay } from './agendaLayout';
import AgendaMonthGrid from './AgendaMonthGrid.vue';
import AgendaDayGrid from './AgendaDayGrid.vue';

const props = withDefaults(defineProps<{
  events: AgendaEvent[];
  statusColors: AgendaStatusColorMap;
  capacityByDate?: AgendaCapacityByDate;
  loading?: boolean;
  view: AgendaView;
  date: Date;
  minHour?: number;
  maxHour?: number;
  weekStartsOn?: 0 | 1;
}>(), {
  capacityByDate: () => ({}),
  loading: false,
  minHour: 8,
  maxHour: 20,
  weekStartsOn: 1,
});

const emit = defineEmits<{
  (e: 'create', payload: { date: Date; hour?: number; minute?: number }): void;
  (e: 'select-event', payload: { event: AgendaEvent }): void;
  (e: 'update:view', view: AgendaView): void;
  (e: 'update:date', date: Date): void;
}>();

const isToday = computed(() => isSameDay(props.date, new Date()));

const label = computed(() => (props.view === 'month' ? formatMonthLabel(props.date) : formatDayLabel(props.date)));

function goToday() {
  emit('update:date', new Date());
}

function goPrev() {
  emit('update:date', props.view === 'month' ? addMonths(props.date, -1) : addDays(props.date, -1));
}

function goNext() {
  emit('update:date', props.view === 'month' ? addMonths(props.date, 1) : addDays(props.date, 1));
}

function setView(view: AgendaView) {
  emit('update:view', view);
}

function handleCreate(payload: { date: Date; hour?: number; minute?: number }) {
  emit('create', payload);
}

function handleSelectEvent(payload: { event: AgendaEvent }) {
  emit('select-event', payload);
}

function handleNavigateMonth(date: Date) {
  emit('update:date', date);
}

function handleGoDay(date: Date) {
  emit('update:date', date);
  emit('update:view', 'day');
}
</script>

<template>
  <div class="space-y-3">
    <!-- Toolbar -->
    <div class="flex flex-col gap-3 rounded-2xl p-3 nxr-card-subtle sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center justify-center gap-2 sm:justify-start">
        <CalendarDays class="h-4 w-4 nxr-text-accent" />
        <p class="text-sm font-semibold nxr-text">{{ label }}</p>
      </div>
      <div class="flex items-center justify-between gap-2 sm:justify-end">
        <div class="flex items-center gap-1">
          <button type="button" class="nxr-btn nxr-btn-secondary !px-2 !py-1.5" title="Anterior" @click="goPrev">
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button type="button" class="nxr-btn nxr-btn-secondary !px-3 !py-1.5 text-xs" :disabled="isToday" @click="goToday">
            Hoy
          </button>
          <button type="button" class="nxr-btn nxr-btn-secondary !px-2 !py-1.5" title="Siguiente" @click="goNext">
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
        <div class="flex items-center rounded-2xl p-0.5 nxr-card-subtle">
          <button type="button"
                  class="rounded-xl px-3 py-1.5 text-xs font-medium transition"
                  :class="view === 'month' ? 'nxr-btn-primary' : 'nxr-text-muted'"
                  @click="setView('month')">
            Mes
          </button>
          <button type="button"
                  class="rounded-xl px-3 py-1.5 text-xs font-medium transition"
                  :class="view === 'day' ? 'nxr-btn-primary' : 'nxr-text-muted'"
                  @click="setView('day')">
            Día
          </button>
        </div>
      </div>
    </div>

    <!-- Grid -->
    <div class="relative">
      <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/10 backdrop-blur-[1px]">
        <Loader2 class="h-6 w-6 animate-spin nxr-text-accent" />
      </div>
      <AgendaMonthGrid
        v-if="view === 'month'"
        :anchor-date="date"
        :events="events"
        :status-colors="statusColors"
        :capacity-by-date="capacityByDate"
        :week-starts-on="weekStartsOn"
        @create="handleCreate"
        @select-event="handleSelectEvent"
        @navigate-month="handleNavigateMonth"
        @go-day="handleGoDay" />
      <AgendaDayGrid
        v-else
        :date="date"
        :events="events"
        :status-colors="statusColors"
        :min-hour="minHour"
        :max-hour="maxHour"
        @create="handleCreate"
        @select-event="handleSelectEvent" />
    </div>
  </div>
</template>
