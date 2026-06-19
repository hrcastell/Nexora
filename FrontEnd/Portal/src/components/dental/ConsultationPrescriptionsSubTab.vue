<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  dentalPrescriptionsService,
  type DentalPrescription,
  type PrescriptionForm,
} from '../../services/dentalPrescriptionsService'

const props = defineProps<{
  consultationId: number
  readOnly: boolean
  patientName?: string
}>()

// ── State ─────────────────────────────────────────────────────
const prescriptions = ref<DentalPrescription[]>([])
const loading       = ref(false)
const error         = ref<string | null>(null)
const showForm      = ref(false)
const saving        = ref(false)
const saveError     = ref<string | null>(null)

const ROUTE_OPTIONS = [
  { value: 'oral',        label: 'Oral' },
  { value: 'topical',     label: 'Topico' },
  { value: 'injectable',  label: 'Inyectable' },
  { value: 'sublingual',  label: 'Sublingual' },
  { value: 'other',       label: 'Otro' },
]

const emptyForm = (): PrescriptionForm => ({
  medication:   '',
  dosage:       '',
  frequency:    '',
  duration:     '',
  route:        '',
  instructions: '',
})

const form = ref<PrescriptionForm>(emptyForm())

// ── Data loading ───────────────────────────────────────────────
async function load() {
  loading.value = true
  error.value   = null
  try {
    const res = await dentalPrescriptionsService.list(props.consultationId)
    prescriptions.value = res.data
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.response?.data?.message || 'Error al cargar prescripciones'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ── Form ───────────────────────────────────────────────────────
function toggleForm() {
  showForm.value  = !showForm.value
  saveError.value = null
  form.value      = emptyForm()
}

async function submit() {
  saveError.value = null
  const { medication, dosage, frequency, duration } = form.value
  if (!medication.trim() || !dosage.trim() || !frequency.trim() || !duration.trim()) {
    saveError.value = 'Medicamento, dosis, frecuencia y duracion son obligatorios'
    return
  }

  saving.value = true
  try {
    const res = await dentalPrescriptionsService.create(props.consultationId, {
      ...form.value,
      route:        form.value.route        || undefined,
      instructions: form.value.instructions || undefined,
    })
    prescriptions.value.unshift(res.data)
    showForm.value = false
    form.value     = emptyForm()
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || e?.response?.data?.message || 'Error al guardar prescripcion'
  } finally {
    saving.value = false
  }
}

// ── Delete ─────────────────────────────────────────────────────
async function remove(id: number) {
  // Optimistic remove
  const prev = prescriptions.value
  prescriptions.value = prescriptions.value.filter(p => p.id !== id)
  try {
    await dentalPrescriptionsService.remove(props.consultationId, id)
  } catch (err: any) {
    prescriptions.value = prev
    error.value = err?.response?.data?.error || err?.response?.data?.message || 'Error al eliminar la prescripción'
  }
}

// ── Print ──────────────────────────────────────────────────────
function print() {
  window.print()
}

function routeLabel(value: string | null) {
  if (!value) return null
  return ROUTE_OPTIONS.find(o => o.value === value)?.label ?? value
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}
</script>

<template>
  <div class="space-y-4">

    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-2 flex-wrap no-print">
      <h3 class="text-sm font-semibold text-white/70 uppercase tracking-wide">
        Prescripciones
      </h3>
      <div class="flex gap-2">
        <button
          v-if="prescriptions.length > 0"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition"
          @click="print"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"/>
          </svg>
          Imprimir
        </button>
        <button
          v-if="!readOnly"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition"
          :class="showForm
            ? 'bg-white/10 text-white/60 hover:bg-white/15'
            : 'bg-[var(--nexora-primary)] text-white hover:opacity-90'"
          @click="toggleForm"
          type="button"
        >
          <svg v-if="!showForm" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          {{ showForm ? 'Cancelar' : 'Agregar prescripcion' }}
        </button>
      </div>
    </div>

    <!-- Inline add form -->
    <div
      v-if="showForm && !readOnly"
      class="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 no-print"
    >
      <p class="text-xs font-medium text-white/50 uppercase tracking-wide">Nueva prescripcion</p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- Medication -->
        <div class="sm:col-span-2">
          <label class="block text-xs text-white/50 mb-1">Medicamento <span class="text-red-400">*</span></label>
          <input
            v-model="form.medication"
            type="text"
            placeholder="Ej: Amoxicilina 500 mg"
            class="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[var(--nexora-primary)] transition"
          />
        </div>

        <!-- Dosage -->
        <div>
          <label class="block text-xs text-white/50 mb-1">Dosis <span class="text-red-400">*</span></label>
          <input
            v-model="form.dosage"
            type="text"
            placeholder="Ej: 1 comprimido"
            class="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[var(--nexora-primary)] transition"
          />
        </div>

        <!-- Frequency -->
        <div>
          <label class="block text-xs text-white/50 mb-1">Frecuencia <span class="text-red-400">*</span></label>
          <input
            v-model="form.frequency"
            type="text"
            placeholder="Ej: cada 8 horas"
            class="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[var(--nexora-primary)] transition"
          />
        </div>

        <!-- Duration -->
        <div>
          <label class="block text-xs text-white/50 mb-1">Duracion <span class="text-red-400">*</span></label>
          <input
            v-model="form.duration"
            type="text"
            placeholder="Ej: 7 dias"
            class="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[var(--nexora-primary)] transition"
          />
        </div>

        <!-- Route -->
        <div>
          <label class="block text-xs text-white/50 mb-1">Via de administracion</label>
          <select
            v-model="form.route"
            class="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--nexora-primary)] transition"
          >
            <option value="">Sin especificar</option>
            <option v-for="opt in ROUTE_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Instructions -->
        <div class="sm:col-span-2">
          <label class="block text-xs text-white/50 mb-1">Indicaciones adicionales</label>
          <textarea
            v-model="form.instructions"
            rows="2"
            placeholder="Ej: Tomar con alimentos, no suspender antes del plazo indicado..."
            class="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[var(--nexora-primary)] transition resize-none"
          />
        </div>
      </div>

      <!-- Save error -->
      <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>

      <!-- Submit -->
      <div class="flex justify-end">
        <button
          class="rounded-lg px-4 py-2 text-sm font-medium bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50 transition"
          :disabled="saving"
          @click="submit"
          type="button"
        >
          {{ saving ? 'Guardando...' : 'Guardar prescripcion' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-2 text-sm text-white/40 py-4 no-print">
      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      Cargando prescripciones...
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 no-print">
      {{ error }}
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!loading && prescriptions.length === 0"
      class="text-center py-10 text-white/30 text-sm no-print"
    >
      No hay prescripciones registradas para esta consulta.
    </div>

    <!-- Prescription list -->
    <div v-else class="space-y-3 print-area">

      <!-- Print header (only visible when printing) -->
      <div class="hidden print-header">
        <p class="text-lg font-bold">Prescripciones medicas</p>
        <p v-if="patientName" class="text-sm">Paciente: {{ patientName }}</p>
        <p class="text-sm">Fecha: {{ formatDate(new Date().toISOString()) }}</p>
        <hr class="my-2"/>
      </div>

      <div
        v-for="rx in prescriptions"
        :key="rx.id"
        class="rounded-xl border border-white/10 bg-white/5 p-4 space-y-1.5 prescription-card"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-semibold text-white leading-snug">{{ rx.medication }}</p>
          <button
            v-if="!readOnly"
            class="flex-shrink-0 text-white/30 hover:text-red-400 transition no-print"
            title="Eliminar prescripcion"
            type="button"
            @click="remove(rx.id)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a1 1 0 011-1h6a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>

        <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-white/50">
          <span><span class="text-white/30">Dosis:</span> {{ rx.dosage }}</span>
          <span><span class="text-white/30">Frecuencia:</span> {{ rx.frequency }}</span>
          <span><span class="text-white/30">Duracion:</span> {{ rx.duration }}</span>
          <span v-if="routeLabel(rx.route)"><span class="text-white/30">Via:</span> {{ routeLabel(rx.route) }}</span>
        </div>

        <p v-if="rx.instructions" class="text-xs text-white/40 line-clamp-2">
          {{ rx.instructions }}
        </p>

        <p class="text-xs text-white/25 no-print">{{ formatDate(rx.created_at) }}</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
.print-header { display: none; }

@media print {
  .no-print { display: none !important; }
  .print-area { display: block !important; }
  .print-header { display: block !important; }
  .prescription-card {
    border: 1px solid #ccc !important;
    background: white !important;
    color: black !important;
    margin-bottom: 12px;
    padding: 12px;
    border-radius: 6px;
    page-break-inside: avoid;
  }
}
</style>
