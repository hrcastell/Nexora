export interface AgendaEvent {
  id: string | number;
  start: string | Date;
  end: string | Date;
  title: string;
  status: string;
  actionLabel?: string;
  actionKind?: 'edit' | 'view';
}

export interface AgendaStatusColor {
  bg: string;
  text: string;
  dot?: string;
}

export type AgendaStatusColorMap = Record<string, AgendaStatusColor>;

export type AgendaCapacityStatus = 'ok' | 'near' | 'full';

export interface AgendaCapacityInfo {
  count: number;
  status: AgendaCapacityStatus;
}

export type AgendaCapacityByDate = Record<string, AgendaCapacityInfo>;

export type AgendaView = 'month' | 'day';

export interface AgendaCreatePayload {
  date: Date;
  hour?: number;
  minute?: number;
}

export const DEFAULT_STATUS_COLOR: AgendaStatusColor = {
  bg: 'bg-gray-500/20',
  text: 'text-gray-400',
  dot: 'bg-gray-400',
};

export function resolveStatusColor(colors: AgendaStatusColorMap, status: string): AgendaStatusColor {
  return colors[status] ?? DEFAULT_STATUS_COLOR;
}
