<script setup lang="ts">
import type { PropType } from 'vue'
import { Calendar, CreditCard, DollarSign } from 'lucide-vue-next'
import type { DentalCharge, DentalInstallment } from '../../types/dental'

defineProps({
  consultation:        { type: Object as PropType<Record<string, any> | null>, default: null },
  chargeDetail:        { type: Object as PropType<DentalCharge | null>, default: null },
  loadingCharge:       { type: Boolean, default: false },
  canCreateCharge:     { type: Boolean, default: false },
  actionLoading:       { type: Boolean, default: false },
  total:               { type: Number, default: 0 },
  adminStatusClass:    { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  adminStatusLabel:    { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  paymentMethodLabel:  { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  fmtCurrency:         { type: Function as PropType<(v?: number | string | null) => string>, default: null },
  fmtDate:             { type: Function as PropType<(v?: string | null) => string>, default: null },
  fmtDateTime:         { type: Function as PropType<(v?: string | null) => string>, default: null },
})

defineEmits<{
  (e: 'generate-charge'): void
  (e: 'show-installments'): void
  (e: 'register-payment', amount: number): void
  (e: 'pay-installment', inst: DentalInstallment): void
}>()
</script>

<template>
<div class="space-y-5">

  <!-- Loading -->
  <div v-if="loadingCharge" class="py-12 text-center text-sm text-white/40">
    Cargando información de pagos...
  </div>

  <!-- No charge -->
  <div v-else-if="!chargeDetail" class="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
    <CreditCard class="mx-auto mb-4 h-10 w-10 text-white/20" />
    <p class="mb-1 text-sm text-white/50">No hay cargo generado para esta consulta</p>
    <p v-if="!total" class="mb-4 text-xs text-white/30">
      Agregá al menos un servicio en la pestaña Tratamiento para habilitar el cargo.
    </p>
    <p v-else-if="!canCreateCharge" class="mb-4 text-xs text-white/30">
      El cargo ya existe o el estado de pago no lo permite.
    </p>
    <button
      v-if="canCreateCharge"
      class="mx-auto flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition nxr-btn-primary disabled:opacity-50"
      :disabled="actionLoading"
      @click="$emit('generate-charge')"
    >
      <CreditCard class="h-4 w-4" />
      {{ actionLoading ? 'Generando...' : 'Generar cargo' }}
    </button>
  </div>

  <!-- Charge detail -->
  <template v-else>

    <!-- Summary card -->
    <div class="rounded-xl border border-white/10 bg-white/5 p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-white/70">Resumen del cargo</h2>
        <span
          class="rounded-full px-3 py-1 text-xs font-medium"
          :class="adminStatusClass[chargeDetail.administrative_status ?? ''] ?? 'bg-white/10 text-white/40'"
        >
          {{ adminStatusLabel[chargeDetail.administrative_status ?? ''] ?? chargeDetail.administrative_status }}
        </span>
      </div>
      <div class="grid gap-4 sm:grid-cols-3">
        <div>
          <p class="mb-0.5 text-xs text-white/40">Total</p>
          <p class="text-xl font-bold">{{ fmtCurrency?.(chargeDetail.total_amount) }}</p>
        </div>
        <div>
          <p class="mb-0.5 text-xs text-white/40">Pagado</p>
          <p class="text-xl font-bold text-green-400">{{ fmtCurrency?.(chargeDetail.paid_amount) }}</p>
        </div>
        <div>
          <p class="mb-0.5 text-xs text-white/40">Pendiente</p>
          <p class="text-xl font-bold text-yellow-400">
            {{ fmtCurrency?.(Number(chargeDetail.total_amount) - Number(chargeDetail.paid_amount)) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Actions row -->
    <div class="flex flex-wrap gap-2">
      <button
        v-if="!(chargeDetail.installments as any)?.length"
        class="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
        @click="$emit('show-installments')"
      >
        <Calendar class="h-4 w-4" />
        Plan de cuotas
      </button>
      <button
        v-if="chargeDetail.administrative_status !== 'paid'"
        class="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary"
        @click="$emit('register-payment', Number(chargeDetail.total_amount) - Number(chargeDetail.paid_amount))"
      >
        <DollarSign class="h-4 w-4" />
        Registrar pago
      </button>
    </div>

    <!-- Installments -->
    <div v-if="(chargeDetail.installments as any)?.length" class="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 class="mb-4 text-sm font-semibold text-white/70">Plan de cuotas</h3>
      <div class="space-y-2">
        <div
          v-for="inst in (chargeDetail.installments as any)"
          :key="inst.id"
          class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium">Cuota {{ inst.installment_number }}</span>
            <span class="text-xs text-white/40">Vence: {{ fmtDate?.(inst.due_date) ?? '—' }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="adminStatusClass[inst.status ?? ''] ?? 'bg-white/10 text-white/40'"
            >
              {{ adminStatusLabel[inst.status ?? ''] ?? inst.status }}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <p class="text-sm font-medium">{{ fmtCurrency?.(inst.amount) }}</p>
              <p v-if="Number(inst.paid_amount) > 0" class="text-xs text-green-400">
                Pagado: {{ fmtCurrency?.(inst.paid_amount) }}
              </p>
            </div>
            <button
              v-if="inst.status !== 'paid' && inst.status !== 'cancelled'"
              class="rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-500/30"
              @click="$emit('pay-installment', inst)"
            >
              Pagar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment history -->
    <div v-if="(chargeDetail.payments as any)?.length" class="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 class="mb-4 text-sm font-semibold text-white/70">Historial de pagos</h3>
      <div class="space-y-2">
        <div
          v-for="pmt in (chargeDetail.payments as any)"
          :key="pmt.id"
          class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3"
        >
          <div>
            <p class="text-sm">{{ paymentMethodLabel[pmt.payment_method] ?? pmt.payment_method }}</p>
            <p class="text-xs text-white/40">{{ fmtDateTime?.(pmt.payment_date) ?? '—' }}</p>
            <p v-if="pmt.notes" class="mt-0.5 text-xs text-white/40">{{ pmt.notes }}</p>
          </div>
          <span class="text-sm font-semibold text-green-400">{{ fmtCurrency?.(pmt.amount) }}</span>
        </div>
      </div>
    </div>

  </template>
</div>
</template>
