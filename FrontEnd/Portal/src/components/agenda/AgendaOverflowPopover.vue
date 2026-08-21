<script setup lang="ts">
import type { AgendaEvent, AgendaStatusColorMap } from './agendaTypes';
import { resolveStatusColor } from './agendaTypes';
import { formatEventTime, toDate } from './agendaLayout';

defineProps<{
  events: AgendaEvent[];
  statusColors: AgendaStatusColorMap;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', event: AgendaEvent): void;
}>();
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="emit('close')">
      <div class="w-full max-w-xs rounded-2xl p-4 nxr-card">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-sm font-semibold nxr-text">{{ events.length }} citas en este horario</p>
          <button type="button" class="text-xs nxr-text-muted transition hover:text-[var(--nexora-accent-color)]" @click="emit('close')">Cerrar</button>
        </div>
        <div class="max-h-72 space-y-1.5 overflow-y-auto">
          <button
            v-for="ev in events" :key="ev.id"
            type="button"
            class="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs transition hover:bg-white/5"
            @click="emit('select', ev)">
            <span class="h-2 w-2 shrink-0 rounded-full" :class="resolveStatusColor(statusColors, ev.status).dot ?? 'bg-gray-400'" />
            <span class="font-medium nxr-text-muted">{{ formatEventTime(toDate(ev.start)) }}</span>
            <span class="truncate nxr-text">{{ ev.title }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
