<script setup lang="ts">
import type { PropType } from 'vue'
import type { DentalConsultationSession } from '../../types/dental'
import ConsultationSessionsTab from './ConsultationSessionsTab.vue'

defineProps({
  consultation:       { type: Object as PropType<Record<string, any> | null>, default: null },
  sessions:           { type: Array as PropType<DentalConsultationSession[]>, default: () => [] },
  statusClass:        { type: Object, default: () => ({}) },
  statusLabel:        { type: Object, default: () => ({}) },
  editingSessionId:   { type: [String, Number] as PropType<string | number | null>, default: null },
  editSessionDate:    { type: String, default: '' },
  savingEditSession:  { type: Boolean, default: false },
  fmtDate:            { type: Function, default: null },
  fmtDateTime:        { type: Function, default: null },
})

const emit = defineEmits<{
  (e: 'new-session'): void
  (e: 'start-edit-session', session: DentalConsultationSession): void
  (e: 'save-edit-session', session: DentalConsultationSession): void
  (e: 'cancel-edit-session'): void
  (e: 'complete-session', session: DentalConsultationSession): void
  (e: 'cancel-session', session: DentalConsultationSession): void
  (e: 'update:editSessionDate', value: string): void
}>()
</script>

<template>
  <div class="space-y-4">

    <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-white/40">Evoluciones clinicas</p>
      <p class="mt-1 text-sm text-white/50">
        Las evoluciones registran el avance clinico por sesion. Cada sesion ejecutada genera un registro de evolucion.
      </p>
    </div>

    <ConsultationSessionsTab
      :consultation="consultation"
      :sessions="sessions"
      :status-class="statusClass"
      :status-label="statusLabel"
      :editing-session-id="editingSessionId"
      :edit-session-date="editSessionDate"
      :saving-edit-session="savingEditSession"
      :fmt-date="fmtDate"
      :fmt-date-time="fmtDateTime"
      @new-session="emit('new-session')"
      @start-edit-session="(s) => emit('start-edit-session', s)"
      @save-edit-session="(s) => emit('save-edit-session', s)"
      @cancel-edit-session="emit('cancel-edit-session')"
      @complete-session="(s) => emit('complete-session', s)"
      @cancel-session="(s) => emit('cancel-session', s)"
      @update:edit-session-date="(v) => emit('update:editSessionDate', v)"
    />

  </div>
</template>
