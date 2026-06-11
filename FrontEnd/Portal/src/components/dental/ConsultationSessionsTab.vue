<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import { AlertCircle, Calendar, CheckCircle2, Edit2, Plus, Trash2 } from 'lucide-vue-next'
import type { DentalConsultationSession } from '../../types/dental'

const props = defineProps({
  consultation: { type: Object as PropType<Record<string, any> | null>, default: null },
  sessions: { type: Array as PropType<DentalConsultationSession[]>, default: () => [] },
  statusClass: { type: Object, default: () => ({}) },
  statusLabel: { type: Object, default: () => ({}) },
  editingSessionId: { type: [String, Number] as PropType<string | number | null>, default: null },
  editSessionDate: { type: String, default: '' },
  savingEditSession: { type: Boolean, default: false },
  fmtDate: { type: Function, default: null },
  fmtDateTime: { type: Function, default: null },
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

const consultation = computed(() => props.consultation)
const sessionsStore = { get items() { return props.sessions ?? [] } }

const SESSION_STATUS_LABEL: Record<string, string> = {
  scheduled:   'Programada',
  in_progress: 'En curso',
  completed:   'Completada',
  cancelled:   'Cancelada',
}
const SESSION_STATUS_CLASS: Record<string, string> = {
  scheduled:   'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-green-500/20 text-green-400',
  completed:   'bg-teal-500/20 text-teal-400',
  cancelled:   'bg-red-500/20 text-red-400',
}
const editingSessionId = computed(() => props.editingSessionId)
const editSessionDate = computed({
  get: () => props.editSessionDate ?? '',
  set: value => emit('update:editSessionDate', value),
})
const savingEditSession = computed(() => Boolean(props.savingEditSession))
const fmtDate = (value?: string | null) => props.fmtDate?.(value) ?? '?'
const fmtDateTime = (value?: string | null) => props.fmtDateTime?.(value) ?? '?'
const startEditSession = (session: DentalConsultationSession) => emit('start-edit-session', session)
const saveEditSession = (session: DentalConsultationSession) => emit('save-edit-session', session)
const cancelEditSession = () => emit('cancel-edit-session')
const completeSession = (session: DentalConsultationSession) => emit('complete-session', session)
const cancelSession = (session: DentalConsultationSession) => emit('cancel-session', session)
</script>

<template>
<div class="space-y-4">

        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-white/70">Sesiones de tratamiento</h2>
          <button
            v-if="(consultation as any)?.requires_multiple_sessions"
            class="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            :style="{ background: 'var(--nexora-primary)' }"
            @click="$emit('new-session')"
          >
            <Plus class="h-4 w-4" />
            Nueva sesión
          </button>
        </div>

        <!-- No multiple sessions configured -->
        <div
          v-if="!(consultation as any)?.requires_multiple_sessions"
          class="rounded-xl border border-white/10 bg-white/5 p-10 text-center"
        >
          <AlertCircle class="mx-auto mb-3 h-8 w-8 text-white/20" />
          <p class="text-sm text-white/40">Esta consulta no tiene sesiones múltiples configuradas.</p>
          <p class="mt-1 text-xs text-white/30">Activá la opción en la pestaña Tratamiento.</p>
        </div>

        <!-- Empty sessions -->
        <div
          v-else-if="!sessionsStore.items.length"
          class="rounded-xl border border-white/10 bg-white/5 p-10 text-center"
        >
          <Calendar class="mx-auto mb-3 h-8 w-8 text-white/20" />
          <p class="text-sm text-white/40">No hay sesiones registradas aún.</p>
        </div>

        <!-- Sessions list -->
        <div v-else class="space-y-3">
          <div
            v-for="session in sessionsStore.items"
            :key="session.id"
            class="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold">Sesión #{{ session.session_number }}</span>
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="SESSION_STATUS_CLASS[session.status ?? ''] ?? 'bg-white/10 text-white/40'"
                  >
                    {{ SESSION_STATUS_LABEL[session.status ?? ''] ?? session.status }}
                  </span>
                  <span class="text-xs text-white/40">{{ fmtDateTime(session.session_date) }}</span>
                </div>
                <p v-if="session.notes" class="line-clamp-2 text-sm text-white/60">{{ session.notes }}</p>
                <p v-if="session.next_session_date" class="mt-1 text-xs text-white/40">
                  Próxima: {{ fmtDate(session.next_session_date) }}
                </p>

                <!-- Inline date edit -->
                <div
                  v-if="editingSessionId === session.id"
                  class="mt-3 flex flex-wrap items-center gap-2"
                >
                  <input
                    v-model="editSessionDate"
                    type="datetime-local"
                    class="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-white/40"
                  />
                  <button
                    class="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                    :style="{ background: 'var(--nexora-primary)' }"
                    :disabled="savingEditSession || !editSessionDate"
                    @click="saveEditSession(session)"
                  >
                    {{ savingEditSession ? '...' : 'Guardar' }}
                  </button>
                  <button
                    class="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white transition"
                    @click="cancelEditSession"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              <div class="shrink-0 flex flex-col items-end gap-1.5">
                <button
                  v-if="!['completed', 'cancelled'].includes(session.status ?? '')"
                  class="flex items-center gap-1 rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-500/30"
                  @click="completeSession(session)"
                >
                  <CheckCircle2 class="h-3.5 w-3.5" />
                  Completar
                </button>
                <button
                  v-if="editingSessionId !== session.id && !['completed', 'cancelled'].includes(session.status ?? '')"
                  class="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 transition hover:border-white/20 hover:text-white"
                  @click="startEditSession(session)"
                >
                  <Edit2 class="h-3 w-3" />
                  Editar fecha
                </button>
                <button
                  v-if="!['completed', 'cancelled'].includes(session.status ?? '')"
                  class="flex items-center gap-1 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/10"
                  @click="cancelSession(session)"
                >
                  <Trash2 class="h-3 w-3" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      </template>
