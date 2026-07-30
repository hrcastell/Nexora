<script setup lang="ts">
import type { AppointmentStatus } from '../types/garage';

defineProps<{ status: AppointmentStatus | string; small?: boolean }>();

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled:               { label: 'Programada',       color: 'bg-blue-500/20 text-blue-300' },
  confirmed:               { label: 'Confirmada',       color: 'bg-cyan-500/20 text-cyan-300' },
  arrived:                 { label: 'Cliente llegó',    color: 'bg-yellow-500/20 text-yellow-300' },
  converted_to_work_order: { label: 'Convertida',       color: 'bg-green-500/20 text-green-300' },
  cancelled:               { label: 'Cancelada',        color: 'bg-red-500/20 text-red-300' },
  no_show:                 { label: 'No se presentó',   color: 'bg-orange-500/20 text-orange-300' },
  rescheduled:             { label: 'Reagendada',       color: 'bg-purple-500/20 text-purple-300' },
};
</script>

<template>
  <span
    class="inline-flex items-center rounded-full font-medium"
    :class="[(STATUS_CONFIG[status] ?? { color: 'bg-white/10 nxr-text-muted' }).color, small ? 'text-xs px-2 py-0.5' : 'text-xs px-3 py-1']"
  >
    {{ (STATUS_CONFIG[status] ?? { label: status }).label }}
  </span>
</template>
