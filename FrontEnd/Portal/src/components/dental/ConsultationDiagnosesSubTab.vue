<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dentalDiagnosesService } from '../../services/dentalDiagnosesService'
import { dentalConsultationsService } from '../../services/dentalConsultationsService'
import type { DentalDiagnosis, DiagnosisForm } from '../../services/dentalDiagnosesService'

const props = defineProps({
  consultationId: { type: Number, required: true },
  readOnly:       { type: Boolean, default: false },
})

const diagnoses      = ref<DentalDiagnosis[]>([])
const loading        = ref(false)
const saving         = ref(false)
const error          = ref<string | null>(null)
const saveError      = ref<string | null>(null)
const generateMsg    = ref<string | null>(null)
const generating     = ref(false)

const form = ref<DiagnosisForm>({
  diagnosis_text: '',
  diagnosis_code: '',
  severity: 'moderate',
  notes: '',
})

const SEVERITY_LABEL: Record<string, string> = {
  mild:     'Leve',
  moderate: 'Moderada',
  severe:   'Severa',
}
const SEVERITY_CLASS: Record<string, string> = {
  mild:     'bg-green-500/20 text-green-400',
  moderate: 'bg-yellow-500/20 text-yellow-400',
  severe:   'bg-red-500/20 text-red-400',
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await dentalDiagnosesService.list(props.consultationId)
    diagnoses.value = res.data
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al cargar diagnósticos'
  } finally {
    loading.value = false
  }
}

async function create() {
  if (!form.value.diagnosis_text.trim()) {
    saveError.value = 'El texto del diagnóstico es requerido'
    return
  }
  saving.value = true
  saveError.value = null
  try {
    await dentalDiagnosesService.create(props.consultationId, {
      ...form.value,
      diagnosis_code: form.value.diagnosis_code?.trim() || undefined,
      notes: form.value.notes?.trim() || undefined,
    })
    form.value = { diagnosis_text: '', diagnosis_code: '', severity: 'moderate', notes: '' }
    await load()
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al guardar diagnóstico'
  } finally {
    saving.value = false
  }
}

async function remove(id: number) {
  try {
    await dentalDiagnosesService.remove(props.consultationId, id)
    diagnoses.value = diagnoses.value.filter(d => d.id !== id)
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al eliminar diagnóstico'
  }
}

async function generateFromOdontogram() {
  generating.value = true
  generateMsg.value = null
  try {
    const res = await dentalConsultationsService.generateTreatmentPlan(props.consultationId)
    generateMsg.value = `${res.generated} tratamiento(s) generado(s) automáticamente desde el odontograma. Revisalos en el tab Tratamiento.`
  } catch (e: any) {
    generateMsg.value = e?.response?.data?.error || 'Error al generar tratamientos'
  } finally {
    generating.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">

    <!-- Generate from odontogram banner -->
    <div v-if="generateMsg" class="flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
      <svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <p>{{ generateMsg }}</p>
    </div>

    <!-- Header + action -->
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-white/40">Diagnósticos</h3>
      <button
        v-if="!readOnly"
        class="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-50"
        :disabled="generating"
        @click="generateFromOdontogram"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        {{ generating ? 'Generando...' : 'Generar tratamientos desde odontograma' }}
      </button>
    </div>

    <!-- Add form -->
    <div v-if="!readOnly" class="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-white/40">Agregar diagnóstico</p>

      <div>
        <label class="mb-1.5 block text-xs text-white/50">Descripción del diagnóstico <span class="text-red-400">*</span></label>
        <textarea
          v-model="form.diagnosis_text"
          rows="2"
          placeholder="Ej: Caries profunda en cara mesial del diente 21..."
          class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/30"
        />
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Codigo CIE-10 (opcional)</label>
          <input
            v-model="form.diagnosis_code"
            type="text"
            placeholder="Ej: K02.1"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Severidad</label>
          <select
            v-model="form.severity"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          >
            <option value="mild">Leve</option>
            <option value="moderate">Moderada</option>
            <option value="severe">Severa</option>
          </select>
        </div>
      </div>

      <div>
        <label class="mb-1.5 block text-xs text-white/50">Notas adicionales (opcional)</label>
        <textarea
          v-model="form.notes"
          rows="2"
          placeholder="Observaciones adicionales..."
          class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/30"
        />
      </div>

      <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>

      <button
        class="rounded-2xl px-4 py-2 text-sm font-medium text-white transition nxr-btn-primary disabled:opacity-50"
        :disabled="saving"
        @click="create"
      >
        {{ saving ? 'Guardando...' : 'Agregar diagnóstico' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-6 text-center text-sm text-white/30">Cargando...</div>
    <p v-else-if="error" class="text-sm text-red-400">{{ error }}</p>

    <!-- Empty -->
    <div v-else-if="diagnoses.length === 0" class="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/30">
      Sin diagnósticos registrados para esta consulta.
    </div>

    <!-- Diagnosis list -->
    <div v-else class="space-y-3">
      <div
        v-for="d in diagnoses"
        :key="d.id"
        class="rounded-xl border border-white/10 bg-white/5 p-4"
      >
        <div class="flex items-start gap-3">
          <div class="flex-1 space-y-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="SEVERITY_CLASS[d.severity] ?? 'bg-white/10 text-white/40'"
              >
                {{ SEVERITY_LABEL[d.severity] ?? d.severity }}
              </span>
              <span
                v-if="d.diagnosis_code"
                class="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60"
              >
                {{ d.diagnosis_code }}
              </span>
              <span
                v-if="d.odontogram_tooth"
                class="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300"
              >
                Diente {{ d.odontogram_tooth }} &mdash; {{ d.odontogram_finding }}
              </span>
            </div>
            <p class="text-sm text-white">{{ d.diagnosis_text }}</p>
            <p v-if="d.notes" class="text-xs text-white/50">{{ d.notes }}</p>
          </div>
          <button
            v-if="!readOnly"
            class="shrink-0 rounded-lg p-1.5 text-white/30 transition hover:bg-red-500/10 hover:text-red-400"
            title="Eliminar diagnóstico"
            @click="remove(d.id)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
