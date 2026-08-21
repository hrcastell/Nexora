import type { AgendaEvent } from './agendaTypes';

const LOCALE = 'es-CL';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

// Stable local (not UTC) YYYY-MM-DD key — toISOString() would roll to the
// wrong day near midnight in negative-UTC-offset timezones like Chile's.
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function formatMonthLabel(date: Date): string {
  const label = date.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDayLabel(date: Date): string {
  const label = date.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatShortWeekday(date: Date): string {
  return date.toLocaleDateString(LOCALE, { weekday: 'short' }).replace('.', '');
}

export function formatHourLabel(hour: number): string {
  return `${pad2(hour)}:00`;
}

export function formatEventTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export interface MonthCell {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

// 42-cell (6-week) month grid, weekStartsOn: 0 = Sunday, 1 = Monday.
export function buildMonthCells(anchorDate: Date, weekStartsOn: 0 | 1 = 1): MonthCell[] {
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const offset = (firstWeekday - weekStartsOn + 7) % 7;
  const gridStart = addDays(firstOfMonth, -offset);
  const today = new Date();

  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    const dow = date.getDay();
    cells.push({
      date,
      dateKey: dateKey(date),
      isCurrentMonth: date.getMonth() === month,
      isToday: isSameDay(date, today),
      isWeekend: dow === 0 || dow === 6,
    });
  }
  return cells;
}

export function groupEventsByDate(events: AgendaEvent[]): Record<string, AgendaEvent[]> {
  const map: Record<string, AgendaEvent[]> = {};
  for (const ev of events) {
    const key = dateKey(toDate(ev.start));
    if (!map[key]) map[key] = [];
    map[key].push(ev);
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => toDate(a.start).getTime() - toDate(b.start).getTime());
  }
  return map;
}

export interface PackedEvent {
  event: AgendaEvent;
  col: number;
  colCount: number;
  clusterId: number;
}

// Classic greedy column-packing for overlapping day-view events. Events
// sharing a clusterId mutually overlap and were column-packed together —
// callers use it to group "+N more" overflow badges per overlap cluster.
export function packOverlaps(events: AgendaEvent[]): PackedEvent[] {
  const sorted = [...events].sort((a, b) => toDate(a.start).getTime() - toDate(b.start).getTime());

  const clusters: AgendaEvent[][] = [];
  let current: AgendaEvent[] = [];
  let currentEnd = -Infinity;
  for (const ev of sorted) {
    const start = toDate(ev.start).getTime();
    const end = toDate(ev.end).getTime();
    if (current.length && start >= currentEnd) {
      clusters.push(current);
      current = [];
      currentEnd = -Infinity;
    }
    current.push(ev);
    currentEnd = Math.max(currentEnd, end);
  }
  if (current.length) clusters.push(current);

  const result: PackedEvent[] = [];
  clusters.forEach((cluster, clusterId) => {
    const columnEnds: number[] = [];
    const assigned: { event: AgendaEvent; col: number }[] = [];
    for (const ev of cluster) {
      const start = toDate(ev.start).getTime();
      const end = toDate(ev.end).getTime();
      let col = columnEnds.findIndex((colEnd) => colEnd <= start);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(end);
      } else {
        columnEnds[col] = end;
      }
      assigned.push({ event: ev, col });
    }
    const colCount = columnEnds.length;
    for (const a of assigned) result.push({ event: a.event, col: a.col, colCount, clusterId });
  });
  return result;
}

// Click position within an hour row -> snapped minute (:00 or :30).
export function snapToHalfHour(offsetYWithinRow: number, rowHeightPx: number): number {
  return offsetYWithinRow < rowHeightPx / 2 ? 0 : 30;
}
