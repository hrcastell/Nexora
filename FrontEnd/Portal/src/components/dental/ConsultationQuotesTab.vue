<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Receipt } from 'lucide-vue-next'
import { dentalQuotesService } from '../../services/dentalQuotesService'
import type { DentalQuote } from '../../types/dental'
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '../../types/dental'

const props = defineProps<{
  consultationId: number
  customerId: number
}>()

const router = useRouter()

const quotes   = ref<DentalQuote[]>([])
const loading  = ref(false)
const error    = ref<string | null>(null)

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtCurrency(amount?: number | string | null) {
  const n = Number(amount ?? 0)
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
}

async function loadQuotes() {
  loading.value = true
  error.value   = null
  try {
    const data = await dentalQuotesService.getForConsultation(props.consultationId)
    quotes.value = Array.isArray(data?.data) ? data.data : []
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } }; message?: string }
    error.value = err?.response?.data?.error || err?.message || 'Error al cargar presupuestos'
  } finally {
    loading.value = false
  }
}

onMounted(loadQuotes)
</script>

<template>
  <div class="space-y-4">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold text-white/70">Presupuestos vinculados</h2>
      <button
        class="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary"
        @click="router.push(`/dental/quotes/new?customer_id=${customerId}&consultation_id=${consultationId}`)"
      >
        <Receipt class="h-3.5 w-3.5" />
        Nuevo presupuesto
      </button>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
    >
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12 text-sm text-white/40 gap-2">
      <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <span>Cargando presupuestos...</span>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!quotes.length"
      class="rounded-xl border border-white/10 bg-white/5 p-10 text-center"
    >
      <Receipt class="mx-auto mb-3 h-8 w-8 text-white/20" />
      <p class="text-sm text-white/40">No hay presupuestos vinculados a esta consulta.</p>
      <p class="mt-1 text-xs text-white/30">Los presupuestos convertidos en consulta aparecen aqui.</p>
    </div>

    <!-- Quotes list -->
    <div v-else class="space-y-3">
      <div
        v-for="quote in quotes"
        :key="quote.id"
        class="rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/20 transition-all cursor-pointer"
        @click="router.push(`/dental/quotes/${quote.id}?consultation_id=${consultationId}`)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="text-sm font-semibold text-white/90">{{ quote.quote_number }}</span>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="QUOTE_STATUS_COLORS[quote.status] ?? 'bg-white/10 text-white/40'"
              >
                {{ QUOTE_STATUS_LABELS[quote.status] ?? quote.status }}
              </span>
            </div>
            <p class="text-xs text-white/40">
              Fecha: {{ fmtDate(quote.quote_date || quote.created_at) }}
              <span v-if="quote.valid_until"> · Vence: {{ fmtDate(quote.valid_until) }}</span>
            </p>
            <p v-if="quote.notes" class="mt-1 text-xs text-white/50 line-clamp-1">{{ quote.notes }}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-base font-semibold text-white/90">{{ fmtCurrency(quote.final_amount) }}</p>
            <p v-if="quote.discount_amount && Number(quote.discount_amount) > 0" class="text-xs text-white/40 line-through">
              {{ fmtCurrency(quote.total_amount) }}
            </p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
