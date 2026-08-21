<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { AgendaEvent, AgendaStatusColorMap } from './agendaTypes';
import { resolveStatusColor } from './agendaTypes';
import { packOverlaps, formatHourLabel, formatEventTime, toDate, minutesSinceMidnight, isSameDay } from './agendaLayout';
import AgendaOverflowPopover from './AgendaOverflowPopover.vue';

const props = withDefaults(defineProps<{
  date: Date;
  events: AgendaEvent[];
  statusColors: AgendaStatusColorMap;
  minHour?: number;
  maxHour?: number;
  maxColumnsDesktop?: number;
  maxColumnsMobile?: number;
}>(), {
  minHour: 8,
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
            height: `max(24px, calc(var(--row-h) * ${durationMin / 60}))`,
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
  emit('create', { date: props.date, hour, minute });
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
      <div class="absolute inset-0 grid" :style="{ gridTemplateColumns: '56px 1fr', gridTemplateRows: `repeat(${hours.length}, var(--row-h))` }">
        <template v-for="hour in hours" :key="hour">
          <div class="flex items-start justify-end border-t border-white/5 pr-2 pt-0.5 text-[10px] nxr-text-soft">
            {{ formatHourLabel(hour) }}
          </div>
          <div class="relative border-t border-white/5">
            <button type="button" class="absolute inset-x-0 top-0 h-1/2 transition hover:bg-white/[0.03]" @click="onSlotClick(hour, 0)" />
            <button type="button" class="absolute inset-x-0 bottom-0 h-1/2 transition hover:bg-white/[0.03]" @click="onSlotClick(hour, 30)" />
          </div>
        </template>
      </div>

      <!-- Overlay: event blocks -->
      <div class="pointer-events-none absolute inset-y-0 left-[56px] right-0">
        <button
          v-for="b in visibleBlocks.blocks" :key="b.event.id"
          type="button"
          class="pointer-events-auto absolute overflow-hidden rounded-lg px-1.5 py-0.5 text-left text-[10px] leading-tight shadow-sm transition hover:brightness-110 sm:text-[11px]"
          :class="[resolveStatusColor(statusColors, b.event.status).bg, resolveStatusColor(statusColors, b.event.status).text]"
          :style="b.style"
          @click.stop="onEventClick(b.event)">
          <span class="block font-semibold">{{ formatEventTime(toDate(b.event.start)) }}</span>
          <span class="block truncate">{{ b.event.title }}</span>
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
      <div v-if="showNowLine" class="pointer-events-none absolute left-[56px] right-0 z-10 h-px bg-rose-500" :style="{ top: nowTop }">
        <span class="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full bg-rose-500" />
      </div>
    </div>

    <div v-if="dayEvents.length === 0" class="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs nxr-text-soft">
      Sin citas — hacé clic en un horario para agendar.
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
.agenda-day-grid { --row-h: 56px; }
@media (min-width: 640px) {
  .agenda-day-grid { --row-h: 64px; }
}
</style>
