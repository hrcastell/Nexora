<script setup lang="ts">
import { computed } from 'vue';
import type { AgendaEvent, AgendaCapacityByDate, AgendaStatusColorMap } from './agendaTypes';
import { resolveStatusColor } from './agendaTypes';
import { buildMonthCells, groupEventsByDate, formatShortWeekday, formatEventTime, toDate } from './agendaLayout';

const props = withDefaults(defineProps<{
  anchorDate: Date;
  events: AgendaEvent[];
  canCreate?: boolean;
  statusColors: AgendaStatusColorMap;
  capacityByDate?: AgendaCapacityByDate;
  weekStartsOn?: 0 | 1;
}>(), {
  capacityByDate: () => ({}),
  canCreate: true,
  weekStartsOn: 1,
});

const emit = defineEmits<{
  (e: 'create', payload: { date: Date }): void;
  (e: 'select-event', payload: { event: AgendaEvent }): void;
  (e: 'navigate-month', date: Date): void;
  (e: 'go-day', date: Date): void;
}>();

const cells = computed(() => buildMonthCells(props.anchorDate, props.weekStartsOn));
const eventsByDate = computed(() => groupEventsByDate(props.events));

const weekdayLabels = computed(() => {
  const base = cells.value.slice(0, 7).map((c) => c.date);
  return base.map((d) => formatShortWeekday(d));
});

function capacityAccentClass(dateKey: string): string {
  const info = props.capacityByDate?.[dateKey];
  if (!info) return '';
  if (info.status === 'full') return 'border-l-4 border-l-rose-500';
  if (info.status === 'near') return 'border-l-4 border-l-amber-500';
  return '';
}

function handleCellClick(cell: ReturnType<typeof buildMonthCells>[number]) {
  if (!cell.isCurrentMonth) {
    emit('navigate-month', cell.date);
    return;
  }
  const dayEvents = eventsByDate.value[cell.dateKey] ?? [];
  if (dayEvents.length > 0) {
    emit('go-day', cell.date);
  } else {
    if (props.canCreate) emit('create', { date: cell.date });
  }
}

function handleChipClick(event: AgendaEvent, domEvent: Event) {
  domEvent.stopPropagation();
  emit('select-event', { event });
}

function handleMoreClick(date: Date, domEvent: Event) {
  domEvent.stopPropagation();
  emit('go-day', date);
}
</script>

<template>
  <div class="grid grid-cols-7 gap-px overflow-hidden rounded-2xl nxr-card-subtle">
    <!-- Weekday header -->
    <div v-for="label in weekdayLabels" :key="label"
         class="bg-transparent px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wide nxr-text-muted">
      {{ label }}
    </div>

    <!-- Day cells -->
    <button
      v-for="cell in cells"
      :key="cell.dateKey"
      type="button"
      class="group flex min-h-[64px] flex-col items-stretch gap-1 border-t border-white/5 p-1.5 text-left transition sm:min-h-[96px] sm:p-2"
      :class="[
        cell.isCurrentMonth ? 'nxr-text' : 'nxr-text-soft opacity-50',
        cell.isToday ? 'ring-1 ring-inset' : '',
        capacityAccentClass(cell.dateKey),
      ]"
      :style="cell.isToday ? { borderColor: 'var(--nexora-primary-color)' } : {}"
      @click="handleCellClick(cell)">
      <div class="flex items-center justify-between">
        <span
          class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
          :style="cell.isToday
            ? { backgroundColor: 'var(--nexora-primary-color)', color: '#fff' }
            : {}">
          {{ cell.date.getDate() }}
        </span>
        <span v-if="cell.isWeekend" class="text-[9px] uppercase nxr-text-soft opacity-70 hidden sm:inline">fin</span>
      </div>

      <!-- Desktop: chips -->
      <div class="hidden flex-col gap-1 sm:flex">
        <span v-for="ev in (eventsByDate[cell.dateKey] ?? []).slice(0, 3)" :key="ev.id"
              class="truncate rounded-lg px-1.5 py-0.5 text-[10px] font-medium"
              :class="[resolveStatusColor(statusColors, ev.status).bg, resolveStatusColor(statusColors, ev.status).text]"
              @click="(e) => handleChipClick(ev, e)">
          {{ formatEventTime(toDate(ev.start)) }} {{ ev.title }}
        </span>
        <span v-if="(eventsByDate[cell.dateKey]?.length ?? 0) > 3"
              class="text-[10px] font-medium nxr-text-accent"
              @click="(e) => handleMoreClick(cell.date, e)">
          +{{ (eventsByDate[cell.dateKey]?.length ?? 0) - 3 }} más
        </span>
      </div>

      <!-- Mobile: dedup'd status dots + count -->
      <div class="flex items-center gap-1 sm:hidden">
        <span v-for="dot in Array.from(new Set((eventsByDate[cell.dateKey] ?? []).map(ev => ev.status))).slice(0, 4)"
              :key="dot"
              class="h-1.5 w-1.5 rounded-full"
              :class="resolveStatusColor(statusColors, dot).dot ?? 'bg-gray-400'" />
        <span v-if="(eventsByDate[cell.dateKey]?.length ?? 0) > 0" class="text-[9px] nxr-text-muted">
          {{ eventsByDate[cell.dateKey]?.length }}
        </span>
      </div>
    </button>
  </div>
</template>
