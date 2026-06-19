<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { dentalAnamnesisService } from '../../services/dentalAnamnesisService'
import type { DentalAnamnesisFormData } from '../../services/dentalAnamnesisService'

const props = withDefaults(defineProps<{
  consultationId: number
  readOnly?: boolean
}>(), { readOnly: false })

const emit = defineEmits<{ (e: 'saved'): void }>()

// ── Section open/close state ───────────────────────────────────
const open = reactive({
  systemic:    true,
  allergies:   true,
  medications: true,
  dental:      true,
  habits:      true,
  notes:       true,
})

function toggle(section: keyof typeof open) {
  open[section] = !open[section]
}

// ── Form state ─────────────────────────────────────────────────
const defaultForm = (): DentalAnamnesisFormData => ({
  has_diabetes:               false,
  has_hypertension:           false,
  has_heart_disease:          false,
  has_respiratory_disease:    false,
  has_kidney_disease:         false,
  has_epilepsy:               false,
  has_hepatitis:              false,
  has_hiv:                    false,
  other_systemic_conditions:  null,
  has_penicillin_allergy:     false,
  has_aspirin_allergy:        false,
  has_latex_allergy:          false,
  has_anesthesia_allergy:     false,
  other_allergies:            null,
  current_medications:        null,
  takes_anticoagulants:       false,
  takes_bisphosphonates:      false,
  previous_dental_treatments: null,
  previous_complications:     null,
  last_dental_visit:          null,
  smokes:                     false,
  alcohol_consumption:        null,
  bruxism:                    false,
  additional_notes:           null,
})

const form    = reactive<DentalAnamnesisFormData>(defaultForm())
const loading = ref(false)
const saving  = ref(false)
const error   = ref<string | null>(null)
const success  = ref<string | null>(null)

// ── Toast helpers ──────────────────────────────────────────────
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showSuccess(msg: string) {
  success.value = msg
  error.value   = null
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { success.value = null }, 4000)
}
function showError(msg: string) {
  error.value   = msg
  success.value = null
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { error.value = null }, 5000)
}

// ── Load ───────────────────────────────────────────────────────
async function load() {
  loading.value = true
  error.value   = null
  try {
    const result = await dentalAnamnesisService.getByConsultation(props.consultationId)
    if (result?.data) {
      const d = result.data
      Object.assign(form, {
        has_diabetes:               d.has_diabetes               ?? false,
        has_hypertension:           d.has_hypertension           ?? false,
        has_heart_disease:          d.has_heart_disease          ?? false,
        has_respiratory_disease:    d.has_respiratory_disease    ?? false,
        has_kidney_disease:         d.has_kidney_disease         ?? false,
        has_epilepsy:               d.has_epilepsy               ?? false,
        has_hepatitis:              d.has_hepatitis              ?? false,
        has_hiv:                    d.has_hiv                    ?? false,
        other_systemic_conditions:  d.other_systemic_conditions  ?? null,
        has_penicillin_allergy:     d.has_penicillin_allergy     ?? false,
        has_aspirin_allergy:        d.has_aspirin_allergy        ?? false,
        has_latex_allergy:          d.has_latex_allergy          ?? false,
        has_anesthesia_allergy:     d.has_anesthesia_allergy     ?? false,
        other_allergies:            d.other_allergies            ?? null,
        current_medications:        d.current_medications        ?? null,
        takes_anticoagulants:       d.takes_anticoagulants       ?? false,
        takes_bisphosphonates:      d.takes_bisphosphonates      ?? false,
        previous_dental_treatments: d.previous_dental_treatments ?? null,
        previous_complications:     d.previous_complications     ?? null,
        last_dental_visit:          d.last_dental_visit          ?? null,
        smokes:                     d.smokes                     ?? false,
        alcohol_consumption:        d.alcohol_consumption        ?? null,
        bruxism:                    d.bruxism                    ?? false,
        additional_notes:           d.additional_notes           ?? null,
      })
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } }; message?: string }
    showError(err?.response?.data?.error || err?.message || 'Error al cargar la anamnesis')
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ── Save ───────────────────────────────────────────────────────
async function save() {
  if (props.readOnly) return
  saving.value = true
  error.value  = null
  try {
    await dentalAnamnesisService.upsert(props.consultationId, { ...form })
    showSuccess('Anamnesis guardada correctamente')
    emit('saved')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } }; message?: string }
    showError(err?.response?.data?.error || err?.message || 'Error al guardar la anamnesis')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">

    <!-- Toast notifications -->
    <transition name="fade">
      <div
        v-if="success"
        class="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-sm"
      >
        <span>✓</span><span>{{ success }}</span>
      </div>
    </transition>
    <transition name="fade">
      <div
        v-if="error"
        class="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm"
      >
        <span>✕</span><span>{{ error }}</span>
      </div>
    </transition>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12 text-white/40 text-sm gap-2">
      <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <span>Cargando anamnesis...</span>
    </div>

    <template v-else>

      <!-- ── Section: Historia sistemica ──────────────────────── -->
      <div class="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/5 transition-colors"
          @click="toggle('systemic')"
        >
          <span>Historia sistemica</span>
          <svg
            class="h-4 w-4 text-white/40 transition-transform"
            :class="open.systemic ? 'rotate-180' : ''"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div v-show="open.systemic" class="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-white/10 pt-3">
          <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
            <input type="checkbox" v-model="form.has_diabetes" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
            Diabetes
          </label>
          <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
            <input type="checkbox" v-model="form.has_hypertension" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
            Hipertension
          </label>
          <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
            <input type="checkbox" v-model="form.has_heart_disease" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
            Enfermedad cardiaca
          </label>
          <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
            <input type="checkbox" v-model="form.has_respiratory_disease" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
            Enfermedad respiratoria
          </label>
          <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
            <input type="checkbox" v-model="form.has_kidney_disease" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
            Enfermedad renal
          </label>
          <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
            <input type="checkbox" v-model="form.has_epilepsy" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
            Epilepsia
          </label>
          <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
            <input type="checkbox" v-model="form.has_hepatitis" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
            Hepatitis
          </label>
          <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
            <input type="checkbox" v-model="form.has_hiv" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
            VIH
          </label>
          <div class="sm:col-span-2">
            <label class="block text-xs text-white/50 mb-1">Otras condiciones sistemicas</label>
            <input
              v-model="form.other_systemic_conditions"
              type="text"
              :disabled="readOnly"
              placeholder="Describir otras condiciones..."
              class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <!-- ── Section: Alergias ────────────────────────────────── -->
      <div class="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/5 transition-colors"
          @click="toggle('allergies')"
        >
          <span>Alergias</span>
          <svg
            class="h-4 w-4 text-white/40 transition-transform"
            :class="open.allergies ? 'rotate-180' : ''"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div v-show="open.allergies" class="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-white/10 pt-3">
          <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
            <input type="checkbox" v-model="form.has_penicillin_allergy" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
            Penicilina
          </label>
          <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
            <input type="checkbox" v-model="form.has_aspirin_allergy" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
            Aspirina / AINEs
          </label>
          <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
            <input type="checkbox" v-model="form.has_latex_allergy" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
            Latex
          </label>
          <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
            <input type="checkbox" v-model="form.has_anesthesia_allergy" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
            Anestesia local
          </label>
          <div class="sm:col-span-2">
            <label class="block text-xs text-white/50 mb-1">Otras alergias</label>
            <input
              v-model="form.other_allergies"
              type="text"
              :disabled="readOnly"
              placeholder="Describir otras alergias..."
              class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <!-- ── Section: Medicacion actual ───────────────────────── -->
      <div class="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/5 transition-colors"
          @click="toggle('medications')"
        >
          <span>Medicacion actual</span>
          <svg
            class="h-4 w-4 text-white/40 transition-transform"
            :class="open.medications ? 'rotate-180' : ''"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div v-show="open.medications" class="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
          <div>
            <label class="block text-xs text-white/50 mb-1">Medicamentos actuales</label>
            <textarea
              v-model="form.current_medications"
              :disabled="readOnly"
              rows="3"
              placeholder="Listar medicamentos con dosis..."
              class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50 resize-none"
            />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
              <input type="checkbox" v-model="form.takes_anticoagulants" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
              Toma anticoagulantes
            </label>
            <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
              <input type="checkbox" v-model="form.takes_bisphosphonates" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
              Toma bifosfonatos
            </label>
          </div>
        </div>
      </div>

      <!-- ── Section: Historia dental ─────────────────────────── -->
      <div class="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/5 transition-colors"
          @click="toggle('dental')"
        >
          <span>Historia dental previa</span>
          <svg
            class="h-4 w-4 text-white/40 transition-transform"
            :class="open.dental ? 'rotate-180' : ''"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div v-show="open.dental" class="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
          <div>
            <label class="block text-xs text-white/50 mb-1">Tratamientos dentales previos</label>
            <textarea
              v-model="form.previous_dental_treatments"
              :disabled="readOnly"
              rows="3"
              placeholder="Ortodoncia, extracciones, implantes..."
              class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50 resize-none"
            />
          </div>
          <div>
            <label class="block text-xs text-white/50 mb-1">Complicaciones previas</label>
            <textarea
              v-model="form.previous_complications"
              :disabled="readOnly"
              rows="2"
              placeholder="Reacciones a anestesia, sangrado excesivo..."
              class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50 resize-none"
            />
          </div>
          <div>
            <label class="block text-xs text-white/50 mb-1">Ultima visita dental</label>
            <input
              v-model="form.last_dental_visit"
              type="date"
              :disabled="readOnly"
              class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <!-- ── Section: Habitos ──────────────────────────────────── -->
      <div class="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/5 transition-colors"
          @click="toggle('habits')"
        >
          <span>Habitos</span>
          <svg
            class="h-4 w-4 text-white/40 transition-transform"
            :class="open.habits ? 'rotate-180' : ''"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div v-show="open.habits" class="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
              <input type="checkbox" v-model="form.smokes" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
              Fumador/a
            </label>
            <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
              <input type="checkbox" v-model="form.bruxism" :disabled="readOnly" class="accent-[var(--nexora-primary)]" />
              Bruxismo
            </label>
          </div>
          <div>
            <label class="block text-xs text-white/50 mb-1">Consumo de alcohol</label>
            <select
              v-model="form.alcohol_consumption"
              :disabled="readOnly"
              class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50"
            >
              <option :value="null">No especificado</option>
              <option value="none">No consume</option>
              <option value="occasional">Ocasional</option>
              <option value="moderate">Moderado</option>
              <option value="heavy">Frecuente</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ── Section: Notas adicionales ──────────────────────── -->
      <div class="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/5 transition-colors"
          @click="toggle('notes')"
        >
          <span>Notas adicionales</span>
          <svg
            class="h-4 w-4 text-white/40 transition-transform"
            :class="open.notes ? 'rotate-180' : ''"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div v-show="open.notes" class="px-4 pb-4 border-t border-white/10 pt-3">
          <textarea
            v-model="form.additional_notes"
            :disabled="readOnly"
            rows="4"
            placeholder="Observaciones clinicas adicionales..."
            class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50 resize-none"
          />
        </div>
      </div>

      <!-- Save button -->
      <div v-if="!readOnly" class="flex justify-end pt-2">
        <button
          type="button"
          :disabled="saving"
          class="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--nexora-primary)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-opacity"
          @click="save"
        >
          <svg v-if="saving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span>{{ saving ? 'Guardando...' : 'Guardar anamnesis' }}</span>
        </button>
      </div>

    </template>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
