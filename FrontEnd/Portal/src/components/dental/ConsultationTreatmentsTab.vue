<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { PropType } from 'vue'
import { CheckCircle2, Plus, Trash2 } from 'lucide-vue-next'
import type { DentalConsultationTreatment } from '../../types/dental'

interface FollowUpForm {
  requires_follow_up: boolean
  requires_multiple_sessions: boolean
  estimated_sessions: number | undefined
  next_session_date: string
  follow_up_notes: string
}

const props = defineProps({
  activeServices:        { type: Array as PropType<DentalConsultationTreatment[]>, default: () => [] },
  voidedServices:        { type: Array as PropType<DentalConsultationTreatment[]>, default: () => [] },
  total:                 { type: Number, default: 0 },
  hasClosedPayments:     { type: Boolean, default: false },
  followUpForm:          { type: Object as PropType<FollowUpForm>, required: true },
  sessionScheduleDates:  { type: Array as PropType<string[]>, default: () => [] },
  sessionsCount:         { type: Number, default: 0 },
  schedulingSessions:    { type: Boolean, default: false },
  savingFollowUp:        { type: Boolean, default: false },
  fmtCurrency:           { type: Function as PropType<(v?: number | string | null) => string>, default: null },
  consultation:          { type: Object as PropType<Record<string, any> | null>, default: null },
})

const emit = defineEmits<{
  (e: 'add-service'): void
  (e: 'void-service', svc: DentalConsultationTreatment): void
  (e: 'save-follow-up'): void
  (e: 'schedule-sessions'): void
  (e: 'update:followUpForm', value: FollowUpForm): void
  (e: 'update:sessionScheduleDates', value: string[]): void
}>()

// Local copies for v-model binding; sync back to parent on change
const localForm = ref<FollowUpForm>({ ...props.followUpForm })
const localDates = ref<string[]>([...props.sessionScheduleDates])

// Guard flags to prevent watch loops
let syncingForm = false
let syncingDates = false

watch(() => props.followUpForm, v => {
  if (syncingForm) return
  syncingForm = true
  localForm.value = { ...v }
  nextTick(() => { syncingForm = false })
}, { deep: true })

watch(localForm, v => {
  if (syncingForm) return
  syncingForm = true
  emit('update:followUpForm', { ...v })
  nextTick(() => { syncingForm = false })
}, { deep: true })

watch(() => props.sessionScheduleDates, v => {
  if (syncingDates) return
  syncingDates = true
  localDates.value = [...v]
  nextTick(() => { syncingDates = false })
}, { deep: true })

watch(localDates, v => {
  if (syncingDates) return
  syncingDates = true
  emit('update:sessionScheduleDates', [...v])
  nextTick(() => { syncingDates = false })
}, { deep: true })
</script>

<template>
<div class="space-y-6">

  <!-- Services section -->
  <div class="rounded-xl border border-white/10 bg-white/5 p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-sm font-semibold text-white/70">Servicios aplicados</h2>
      <button
        class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition hover:opacity-90"
        :style="{ background: 'var(--nexora-primary)' }"
        @click="$emit('add-service')"
      >
        <Plus class="h-3.5 w-3.5" />
        Agregar servicio
      </button>
    </div>

    <div v-if="!activeServices.length && !voidedServices.length" class="py-8 text-center text-sm text-white/30">
      Sin servicios registrados
    </div>

    <div v-else>
      <!-- Table header -->
      <div class="mb-2 hidden grid-cols-6 gap-3 px-2 text-xs text-white/30 sm:grid">
        <span class="col-span-2">Servicio</span>
        <span>Diente</span>
        <span class="text-right">Cant.</span>
        <span class="text-right">Precio unit.</span>
        <span class="text-right">Subtotal</span>
      </div>

      <!-- Active services -->
      <div class="space-y-1.5">
        <div
          v-for="svc in activeServices"
          :key="svc.id"
          class="grid grid-cols-2 gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 sm:grid-cols-6"
        >
          <span class="col-span-2 text-sm sm:col-span-2">{{ svc.treatment_name_snapshot }}</span>
          <span class="text-sm text-white/50 sm:col-span-1">{{ svc.tooth_reference || '—' }}</span>
          <span class="text-right text-sm sm:col-span-1">{{ svc.quantity }}</span>
          <span class="text-right text-sm sm:col-span-1">{{ fmtCurrency?.(svc.unit_price) }}</span>
          <div class="flex items-center justify-end gap-2 sm:col-span-1">
            <span class="text-sm font-medium">{{ fmtCurrency?.(Number(svc.unit_price) * Number(svc.quantity)) }}</span>
            <button
              v-if="!hasClosedPayments"
              class="rounded p-1 text-white/30 transition hover:bg-red-500/20 hover:text-red-400"
              title="Anular servicio"
              @click="$emit('void-service', svc)"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Voided services -->
      <div v-if="voidedServices.length" class="mt-3 space-y-1.5 opacity-40">
        <p class="px-2 text-xs text-white/30">Anulados</p>
        <div
          v-for="svc in voidedServices"
          :key="svc.id"
          class="grid grid-cols-2 gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 line-through sm:grid-cols-6"
        >
          <span class="col-span-2 text-sm sm:col-span-2">{{ svc.treatment_name_snapshot }}</span>
          <span class="text-sm sm:col-span-1">{{ svc.tooth_reference || '—' }}</span>
          <span class="text-right text-sm sm:col-span-1">{{ svc.quantity }}</span>
          <span class="text-right text-sm sm:col-span-1">{{ fmtCurrency?.(svc.unit_price) }}</span>
          <span class="text-right text-sm sm:col-span-1">{{ fmtCurrency?.(Number(svc.unit_price) * Number(svc.quantity)) }}</span>
        </div>
      </div>

      <!-- Total -->
      <div class="mt-3 flex justify-end border-t border-white/10 pt-3">
        <span class="text-base font-semibold">Total: {{ fmtCurrency?.(total) }}</span>
      </div>
    </div>
  </div>

  <!-- Follow-up section -->
  <div class="rounded-xl border border-white/10 bg-white/5 p-5">
    <h2 class="mb-4 text-sm font-semibold text-white/70">Seguimiento del tratamiento</h2>

    <div class="space-y-4">
      <label class="flex cursor-pointer items-center gap-3">
        <input
          v-model="localForm.requires_follow_up"
          type="checkbox"
          class="h-4 w-4 rounded border-white/20 accent-[var(--nexora-primary)]"
        />
        <span class="text-sm">Requiere seguimiento</span>
      </label>

      <label class="flex cursor-pointer items-center gap-3">
        <input
          v-model="localForm.requires_multiple_sessions"
          type="checkbox"
          class="h-4 w-4 rounded border-white/20 accent-[var(--nexora-primary)]"
        />
        <span class="text-sm">Requiere múltiples sesiones</span>
      </label>

      <div v-if="localForm.requires_multiple_sessions" class="space-y-4 border-t border-white/10 pt-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-xs text-white/50">Sesiones estimadas</label>
            <input
              v-model.number="localForm.estimated_sessions"
              type="number"
              min="1"
              class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-xs text-white/50">Fecha próxima sesión</label>
            <input
              v-model="localForm.next_session_date"
              type="date"
              class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </div>
        </div>

        <!-- Session date scheduler — only shown before any sessions are created -->
        <div
          v-if="localDates.length > 0 && sessionsCount === 0"
          class="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
        >
          <p class="text-xs font-semibold text-white/50 uppercase tracking-wide">Programar fechas de sesiones</p>
          <div
            v-for="(_, i) in localDates"
            :key="i"
            class="flex items-center gap-3"
          >
            <span class="shrink-0 text-xs text-white/40 w-16">Sesión {{ i + 1 }}</span>
            <input
              v-model="localDates[i]"
              type="datetime-local"
              class="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </div>
          <button
            class="w-full rounded-xl py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            :style="{ background: 'var(--nexora-primary)' }"
            :disabled="schedulingSessions || !localDates.some(d => d)"
            @click="$emit('schedule-sessions')"
          >
            {{ schedulingSessions ? 'Programando...' : `Programar ${localDates.length} sesiones y crear citas` }}
          </button>
        </div>

        <!-- Already has sessions -->
        <div
          v-else-if="localDates.length > 0 && sessionsCount > 0"
          class="flex items-center gap-2 text-xs text-white/40 px-1"
        >
          <CheckCircle2 class="h-3.5 w-3.5 text-green-400" />
          {{ sessionsCount }} sesiones programadas. Modificá las fechas desde el tab Sesiones.
        </div>
      </div>

      <div
        v-if="localForm.requires_follow_up"
        :class="{ 'border-t border-white/10 pt-4': !localForm.requires_multiple_sessions }"
      >
        <label class="mb-1.5 block text-xs text-white/50">Notas de seguimiento</label>
        <textarea
          v-model="localForm.follow_up_notes"
          rows="3"
          class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          placeholder="Indicaciones para el seguimiento..."
        />
      </div>

      <div class="flex justify-end pt-2">
        <button
          class="rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          :style="{ background: 'var(--nexora-primary)' }"
          :disabled="savingFollowUp"
          @click="$emit('save-follow-up')"
        >
          {{ savingFollowUp ? 'Guardando...' : 'Guardar seguimiento' }}
        </button>
      </div>
    </div>
  </div>

</div>
</template>
