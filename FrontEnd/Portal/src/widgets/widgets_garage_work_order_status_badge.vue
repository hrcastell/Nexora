<script setup lang="ts">
import type { WorkOrderStatus } from '../types/garage';

const props = defineProps<{
  status: WorkOrderStatus | string;
  small?: boolean;
}>();

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:          { label: 'Borrador',         color: 'bg-white/10 text-white/60' },
  received:       { label: 'Recibida',          color: 'bg-blue-500/20 text-blue-300' },
  diagnosis:      { label: 'Diagnóstico',       color: 'bg-purple-500/20 text-purple-300' },
  approved:       { label: 'Aprobada',          color: 'bg-cyan-500/20 text-cyan-300' },
  in_progress:    { label: 'En proceso',        color: 'bg-yellow-500/20 text-yellow-300' },
  waiting_parts:  { label: 'Esp. repuestos',    color: 'bg-orange-500/20 text-orange-300' },
  completed:      { label: 'Completada',        color: 'bg-green-500/20 text-green-300' },
  delivered:      { label: 'Entregada',         color: 'bg-emerald-500/20 text-emerald-300' },
  cancelled:      { label: 'Cancelada',         color: 'bg-red-500/20 text-red-300' },
};

const config = STATUS_CONFIG[props.status] ?? { label: props.status, color: 'bg-white/10 text-white/60' };
</script>

<template>
  <span
    class="inline-flex items-center rounded-full font-medium"
    :class="[config.color, small ? 'text-xs px-2 py-0.5' : 'text-xs px-3 py-1']"
  >
    {{ config.label }}
  </span>
</template>
