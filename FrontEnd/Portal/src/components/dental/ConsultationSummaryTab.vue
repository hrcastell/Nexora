<script setup lang="ts">
import type { PropType } from 'vue'
import { CheckCircle2, Calendar, Edit2 } from 'lucide-vue-next'
import type { DentalConsultationTreatment, DentalCharge } from '../../types/dental'

defineProps({
  consultation:    { type: Object as PropType<Record<string, any> | null>, default: null },
  patientName:     { type: String, default: '—' },
  treatments:      { type: Array as PropType<DentalConsultationTreatment[]>, default: () => [] },
  total:           { type: Number, default: 0 },
  chargeDetail:    { type: Object as PropType<DentalCharge | null>, default: null },
  statusClass:     { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  statusLabel:     { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  adminStatusClass: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  adminStatusLabel: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  fmtDate:         { type: Function as PropType<(v?: string | null) => string>, default: null },
  fmtCurrency:     { type: Function as PropType<(v?: number | string | null) => string>, default: null },
})

defineEmits<{ (e: 'edit-info'): void }>()
</script>

<template>
<div class="space-y-5">

  <!-- Patient + status card -->
  <div class="rounded-xl border border-white/10 bg-white/5 p-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-sm font-semibold nxr-text">Información de la consulta</h2>
      <button
        class="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary"
        @click="$emit('edit-info')"
      >
        <Edit2 class="h-3.5 w-3.5" />
        Editar información
      </button>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p class="mb-0.5 text-xs nxr-text-muted">Paciente</p>
        <router-link
          :to="`/dental/patients/${(consultation as any)?.customer_id ?? (consultation as any)?.customer?.id}`"
          class="text-sm font-medium text-[var(--nexora-primary)] hover:underline"
        >
          {{ patientName }}
        </router-link>
      </div>
      <div>
        <p class="mb-0.5 text-xs nxr-text-muted">Fecha de consulta</p>
        <p class="text-sm">{{ fmtDate?.((consultation as any)?.consultation_date) ?? '—' }}</p>
      </div>
      <div>
        <p class="mb-0.5 text-xs nxr-text-muted">Estado clínico</p>
        <span
          class="rounded-full px-2 py-0.5 text-xs font-medium"
          :class="statusClass[consultation?.status ?? ''] ?? 'bg-white/10 nxr-text-muted'"
        >
          {{ statusLabel[consultation?.status ?? ''] ?? '—' }}
        </span>
      </div>
      <div>
        <p class="mb-0.5 text-xs nxr-text-muted">Estado de pago</p>
        <span
          class="rounded-full px-2 py-0.5 text-xs font-medium"
          :class="adminStatusClass[consultation?.administrative_status ?? ''] ?? 'bg-white/10 nxr-text-muted'"
        >
          {{ adminStatusLabel[consultation?.administrative_status ?? ''] ?? '—' }}
        </span>
      </div>
    </div>

    <!-- Clinical fields -->
    <div
      v-if="(consultation as any)?.reason || (consultation as any)?.diagnosis"
      class="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2"
    >
      <div v-if="(consultation as any)?.reason">
        <p class="mb-0.5 text-xs nxr-text-muted">Motivo de consulta</p>
        <p class="text-sm leading-relaxed nxr-text">{{ (consultation as any).reason }}</p>
      </div>
      <div v-if="(consultation as any)?.diagnosis">
        <p class="mb-0.5 text-xs nxr-text-muted">Diagnóstico</p>
        <p class="text-sm leading-relaxed nxr-text">{{ (consultation as any).diagnosis }}</p>
      </div>
      <div v-if="(consultation as any)?.clinical_notes" class="sm:col-span-2">
        <p class="mb-0.5 text-xs nxr-text-muted">Notas clínicas</p>
        <p class="text-sm leading-relaxed nxr-text">{{ (consultation as any).clinical_notes }}</p>
      </div>
      <div v-if="(consultation as any)?.indications" class="sm:col-span-2">
        <p class="mb-0.5 text-xs nxr-text-muted">Indicaciones</p>
        <p class="text-sm leading-relaxed nxr-text">{{ (consultation as any).indications }}</p>
      </div>
    </div>
  </div>

  <!-- Financial summary -->
  <div class="grid gap-4 sm:grid-cols-3">
    <div class="rounded-xl border border-white/10 bg-white/5 p-4">
      <p class="mb-1 text-xs nxr-text-muted">Total servicios</p>
      <p class="text-2xl font-bold">{{ fmtCurrency?.(total) }}</p>
    </div>
    <div class="rounded-xl border border-white/10 bg-white/5 p-4">
      <p class="mb-1 text-xs nxr-text-muted">Total pagado</p>
      <p class="text-2xl font-bold text-green-400">{{ fmtCurrency?.(chargeDetail?.paid_amount ?? 0) }}</p>
    </div>
    <div class="rounded-xl border border-white/10 bg-white/5 p-4">
      <p class="mb-1 text-xs nxr-text-muted">Saldo pendiente</p>
      <p class="text-2xl font-bold text-yellow-400">
        {{ fmtCurrency?.(total - Number(chargeDetail?.paid_amount ?? 0)) }}
      </p>
    </div>
  </div>

  <!-- Follow-up indicators -->
  <div
    v-if="(consultation as any)?.requires_follow_up || (consultation as any)?.requires_multiple_sessions"
    class="flex flex-wrap gap-2"
  >
    <span
      v-if="(consultation as any)?.requires_follow_up"
      class="flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-300"
    >
      <CheckCircle2 class="h-3.5 w-3.5" /> Requiere seguimiento
    </span>
    <span
      v-if="(consultation as any)?.requires_multiple_sessions"
      class="flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-300"
    >
      <Calendar class="h-3.5 w-3.5" />
      Múltiples sesiones
      <template v-if="(consultation as any)?.estimated_sessions">
        ({{ (consultation as any).estimated_sessions }} est.)
      </template>
    </span>
    <span
      v-if="(consultation as any)?.next_session_date"
      class="flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-300"
    >
      <Calendar class="h-3.5 w-3.5" />
      Próxima sesión: {{ fmtDate?.((consultation as any).next_session_date) ?? '—' }}
    </span>
  </div>

  <!-- Services summary -->
  <div class="rounded-xl border border-white/10 bg-white/5 p-5">
    <h2 class="mb-4 text-sm font-semibold nxr-text">Servicios aplicados</h2>
    <div v-if="!treatments.length" class="py-6 text-center text-sm nxr-text-soft">
      Sin servicios registrados
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="svc in treatments"
        :key="svc.id"
        class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-2.5"
        :class="{ 'opacity-40': svc.status === 'voided' }"
      >
        <div class="flex items-center gap-3">
          <span class="text-sm">{{ svc.treatment_name_snapshot }}</span>
          <span v-if="svc.tooth_reference" class="rounded bg-white/10 px-1.5 py-0.5 text-xs nxr-text-muted">
            Diente {{ svc.tooth_reference }}
          </span>
          <span v-if="svc.status === 'voided'" class="rounded-full bg-red-900/30 px-2 py-0.5 text-xs text-red-300">
            Anulado
          </span>
        </div>
        <span class="text-sm font-medium">
          {{ fmtCurrency?.(Number(svc.unit_price) * Number(svc.quantity)) }}
        </span>
      </div>
      <div class="flex justify-end border-t border-white/10 pt-2">
        <span class="text-sm font-semibold">Total: {{ fmtCurrency?.(total) }}</span>
      </div>
    </div>
  </div>

</div>
</template>
