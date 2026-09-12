<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Eye, Pencil } from 'lucide-vue-next';
import type { AgendaEvent, AgendaStatusColorMap } from './agendaTypes';
import { resolveStatusColor } from './agendaTypes';
import { packOverlaps, formatHourLabel, formatEventTime, toDate, minutesSinceMidnight, isSameDay } from './agendaLayout';
import AgendaOverflowPopover from './AgendaOverflowPopover.vue';

const props = withDefaults(defineProps<{
  date: Date;
  events: AgendaEvent[];
  canCreate?: boolean;
  statusColors: AgendaStatusColorMap;
  minHour?: number;
  maxHour?: number;
  maxColumnsDesktop?: number;
  maxColumnsMobile?: number;
}>(), {
  minHour: 8,
  canCreate: true,
  maxHour: 20,
  maxColumnsDesktop: 4,
  maxColumnsMobile: 2,
});

const emit = defineEmits<{
  (e: 'create', payload: { date: Date; hour: number; minute: number }): void;
  (e: 'select-event', payload: { event: AgendaEvent }): void;
}>();

// ── Responsive column cap (absolute-positioned overlap packing can't rely
// on CSS alone to change how many DOM blocks render) ────────────────────
const isMobile = ref(false);
let mql: MediaQueryList | null = null;
function updateIsMobile(e: MediaQueryList | MediaQueryListEvent) { isMobile.value = e.matches; }
onMounted(() => {
  mql = window.matchMedia('(max-width: 639px)');
  updateIsMobile(mql);
  mql.addEventListener('change', updateIsMobile);
});
onUnmounted(() => mql?.removeEventListener('change', updateIsMobile));
const capColumns = computed(() => (isMobile.value ? props.maxColumnsMobile : props.maxColumnsDesktop));

const dayEvents = computed(() => props.events.filter((ev) => isSameDay(toDate(ev.start), props.date)));

const rangeStartHour = computed(() => {
  const earliest = dayEvents.value.reduce((min, ev) => Math.min(min, toDate(ev.start).getHours()), props.minHour);
  return Math.min(props.minHour, earliest);
});
const rangeEndHour = computed(() => {
  const latest = dayEvents.value.reduce((max, ev) => {
    const end = toDate(ev.end);
    const hour = end.getHours() + (end.getMinutes() > 0 ? 1 : 0);
    return Math.max(max, hour);
  }, props.maxHour);
  return Math.max(props.maxHour, latest);
});

const hours = computed(() => {
  const list: number[] = [];
  for (let h = rangeStartHour.value; h < rangeEndHour.value; h++) list.push(h);
  return list;
});

function minutesFromRangeStart(date: Date): number {
  return minutesSinceMidnight(date) - rangeStartHour.value * 60;
}

function clusterSpan(events: AgendaEvent[]): { topMin: number; bottomMin: number } {
  let topMin = Infinity;
  let bottomMin = -Infinity;
  for (const ev of events) {
    topMin = Math.min(topMin, minutesFromRangeStart(toDate(ev.start)));
    bottomMin = Math.max(bottomMin, minutesFromRangeStart(toDate(ev.end)));
  }
  return { topMin, bottomMin };
}

// Visible blocks (within the column cap) + one overflow summary per
// cluster that exceeds it, positioned to span that cluster's full time range.
const visibleBlocks = computed(() => {
  const packed = packOverlaps(dayEvents.value);
  const cap = capColumns.value;
  const byCluster = new Map<number, typeof packed>();
  for (const item of packed) {
    if (!byCluster.has(item.clusterId)) byCluster.set(item.clusterId, []);
    byCluster.get(item.clusterId)!.push(item);
  }

  const blocks: { type: 'event'; event: AgendaEvent; style: Record<string, string> }[] = [];
  const overflows: { type: 'overflow'; events: AgendaEvent[]; style: Record<string, string> }[] = [];

  for (const items of byCluster.values()) {
    const colCount = items[0].colCount;
    const visibleCount = Math.min(colCount, cap);
    for (const item of items) {
      const start = toDate(item.event.start);
      const end = toDate(item.event.end);
      const topMin = minutesFromRangeStart(start);
      const durationMin = Math.max((end.getTime() - start.getTime()) / 60000, 0);
      if (item.col < cap - (colCount > cap ? 1 : 0)) {
        blocks.push({
          type: 'event',
          event: item.event,
          style: {
            top: `calc(var(--row-h) * ${topMin / 60})`,
            height: `max(48px, calc(var(--row-h) * ${durationMin / 60}))`,
            left: `calc(${item.col} * (100% / ${visibleCount}))`,
            width: `calc(100% / ${visibleCount} - 2px)`,
          },
        });
      }
    }
    if (colCount > cap) {
      const hidden = items.filter((item) => item.col >= cap - 1).map((item) => item.event);
      const { topMin, bottomMin } = clusterSpan(hidden);
      overflows.push({
        type: 'overflow',
        events: hidden,
        style: {
          top: `calc(var(--row-h) * ${topMin / 60})`,
          height: `max(24px, calc(var(--row-h) * ${(bottomMin - topMin) / 60}))`,
          left: `calc(${cap - 1} * (100% / ${visibleCount}))`,
          width: `calc(100% / ${visibleCount} - 2px)`,
        },
      });
    }
  }

  return { blocks, overflows };
});

const overflowPopover = ref<{ events: AgendaEvent[] } | null>(null);

function onSlotClick(hour: number, minute: number) {
  if (props.canCreate) emit('create', { date: props.date, hour, minute });
}

function onEventClick(event: AgendaEvent) {
  emit('select-event', { event });
}

const now = new Date();
const showNowLine = computed(() => isSameDay(props.date, now));
const nowTop = computed(() => `calc(var(--row-h) * ${minutesFromRangeStart(now) / 60})`);
</script>

<template>
  <div class="agenda-day-grid relative overflow-hidden rounded-2xl nxr-card-subtle">
    <div class="relative" :style="{ height: `calc(var(--row-h) * ${hours.length})` }">
      <!-- Background: hour rows with click zones -->
      <div class="absolute inset-0 grid" :style="{ gridTemplateColumns: '68px 1fr', gridTemplateRows: `repeat(${hours.length}, var(--row-h))` }">
        <template v-for="hour in hours" :key="hour">
          <div class="relative border-t pr-2 pt-1 text-right text-xs font-semibold nxr-text">
            <span>{{ formatHourLabel(hour) }}</span>
            <span class="absolute bottom-1 right-2 text-[10px] font-medium nxr-text-soft">{{ String(hour).padStart(2, '0') }}:30</span>
          </div>
          <div class="relative border-t">
            <div class="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed opacity-50" :style="{ borderColor: 'var(--nexora-card-border)' }" />
            <button :disabled="!canCreate" type="button" class="absolute inset-x-0 top-0 h-1/2 transition hover:bg-cyan-500/[0.06]" :aria-label="`Crear cita a las ${formatHourLabel(hour)}`" @click="onSlotClick(hour, 0)" />
            <button :disabled="!canCreate" type="button" class="absolute inset-x-0 bottom-0 h-1/2 transition hover:bg-cyan-500/[0.06]" :aria-label="`Crear cita a las ${String(hour).padStart(2, '0')}:30`" @click="onSlotClick(hour, 30)" />
          </div>
        </template>
      </div>

      <!-- Overlay: event blocks -->
      <div class="pointer-events-none absolute inset-y-0 left-[68px] right-0">
        <button
          v-for="b in visibleBlocks.blocks" :key="b.event.id"
          type="button"
          class="agenda-event-card pointer-events-auto absolute overflow-hidden rounded-xl px-2 py-1.5 text-left text-[11px] leading-tight shadow-sm transition hover:-translate-y-px hover:shadow-md sm:px-2.5 sm:text-xs"
          :style="b.style"
          :aria-label="`${b.event.actionLabel || 'Abrir'} cita de ${b.event.title} a las ${formatEventTime(toDate(b.event.start))}`"
          @click.stop="onEventClick(b.event)">
          <span class="flex items-center justify-between gap-1">
            <span class="flex min-w-0 items-center gap-1.5 font-bold">
              <span class="h-2 w-2 shrink-0 rounded-full" :class="resolveStatusColor(statusColors, b.event.status).dot" />
              {{ formatEventTime(toDate(b.event.start)) }}
            </span>
            <span class="flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-semibold">
              <Pencil v-if="b.event.actionKind === 'edit'" class="h-3 w-3" />
              <Eye v-else class="h-3 w-3" />
              <span class="hidden sm:inline">{{ b.event.actionLabel || 'Ver' }}</span>
            </span>
          </span>
          <span class="mt-1 block truncate font-medium">{{ b.event.title }}</span>
        </button>

        <button
          v-for="(o, i) in visibleBlocks.overflows" :key="`overflow-${i}`"
          type="button"
          class="pointer-events-auto absolute overflow-hidden rounded-lg border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold nxr-text transition hover:bg-white/20"
          :style="o.style"
          @click.stop="overflowPopover = { events: o.events }">
          +{{ o.events.length }}
        </button>
      </div>

      <!-- Current-time indicator -->
      <div v-if="showNowLine" class="pointer-events-none absolute left-[68px] right-0 z-10 h-px bg-rose-500" :style="{ top: nowTop }">
        <span class="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full bg-rose-500" />
      </div>
    </div>

    <div v-if="dayEvents.length === 0" class="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs nxr-text-soft">
      {{ canCreate ? 'Sin citas — hacé clic en un horario para agendar.' : 'Sin citas.' }}
    </div>

    <AgendaOverflowPopover
      v-if="overflowPopover"
      :events="overflowPopover.events"
      :status-colors="statusColors"
      @close="overflowPopover = null"
      @select="(ev) => { overflowPopover = null; onEventClick(ev); }" />
  </div>
</template>

<style scoped>
.agenda-day-grid { --row-h: 76px; }
.agenda-day-grid :is(.border-t, .agenda-event-card) { border-color: var(--nexora-card-border); }
.agenda-event-card {
  color: var(--nexora-text-color) !important;
  background: var(--nexora-glass-bg) !important;
  border: 1px solid var(--nexora-card-border);
  border-left: 4px solid var(--nexora-primary);
}
@media (min-width: 640px) {
  .agenda-day-grid { --row-h: 84px; }
}
</style>
