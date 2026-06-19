<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dentalDiagnosesService } from '../../services/dentalDiagnosesService'
import { dentalOdontogramService } from '../../services/dentalOdontogramService'
import { dentalConsultationTreatmentsService } from '../../services/dentalConsultationTreatmentsService'
import { dentalPrescriptionsService } from '../../services/dentalPrescriptionsService'
import type { DentalDiagnosis } from '../../services/dentalDiagnosesService'
import type { OdontogramEntry } from '../../services/dentalOdontogramService'
import type { DentalPrescription } from '../../services/dentalPrescriptionsService'

const props = defineProps({
  consultationId: { type: Number, required: true },
  patientId:      { type: Number, required: true },
  patientName:    { type: String, default: undefined },
})

const diagnoses    = ref<DentalDiagnosis[]>([])
const odontogram   = ref<OdontogramEntry[]>([])
const treatments   = ref<any[]>([])
const prescriptions = ref<DentalPrescription[]>([])
const loading      = ref(false)
const error        = ref<string | null>(null)

const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const SEVERITY_LABEL: Record<string, string> = { mild: 'Leve', moderate: 'Moderada', severe: 'Severa' }
const FINDING_LABEL: Record<string, string> = {
  caries: 'Caries', fracture: 'Fractura', extraction: 'Extracción', sealant: 'Sellador',
  crown: 'Corona', implant: 'Implante', other: 'Otro',
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const [dRes, oRes, tRes, pRes] = await Promise.all([
      dentalDiagnosesService.list(props.consultationId),
      dentalOdontogramService.getByConsultation(props.consultationId),
      dentalConsultationTreatmentsService.list(props.consultationId),
      dentalPrescriptionsService.list(props.consultationId),
    ])
    diagnoses.value    = dRes.data
    odontogram.value   = oRes.data
    treatments.value   = tRes.data?.data ?? []
    prescriptions.value = pRes.data
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al cargar el informe'
  } finally {
    loading.value = false
  }
}

function print() {
  window.print()
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">

    <!-- Actions (hidden on print) -->
    <div class="flex items-center justify-between no-print">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-white/40">Informe final</h3>
      <button
        class="flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium text-white transition nxr-btn-primary"
        @click="print"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"/>
        </svg>
        Imprimir informe
      </button>
    </div>

    <div v-if="loading" class="py-6 text-center text-sm text-white/30">Cargando informe...</div>
    <p v-else-if="error" class="text-sm text-red-400">{{ error }}</p>

    <!-- Report body -->
    <div v-else id="final-report" class="rounded-xl border border-white/10 bg-white/5 p-6 space-y-6 print-area">

      <!-- Report header -->
      <div class="border-b border-white/10 pb-4">
        <h2 class="text-lg font-semibold text-white">Informe clinico de consulta</h2>
        <div class="mt-2 space-y-0.5 text-sm text-white/60">
          <p><span class="text-white/40">Paciente:</span> {{ patientName ?? '—' }}</p>
          <p><span class="text-white/40">Fecha de emisión:</span> {{ today }}</p>
        </div>
      </div>

      <!-- Section: Diagnoses -->
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-white/40">Diagnosticos</p>
        <div v-if="diagnoses.length === 0" class="text-sm text-white/30">Sin diagnósticos registrados.</div>
        <ul v-else class="space-y-1.5">
          <li
            v-for="d in diagnoses"
            :key="d.id"
            class="flex items-start gap-2 text-sm text-white"
          >
            <span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
            <span>
              {{ d.diagnosis_text }}
              <span v-if="d.diagnosis_code" class="ml-1 text-xs text-white/40">({{ d.diagnosis_code }})</span>
              <span class="ml-1 text-xs text-white/40">— {{ SEVERITY_LABEL[d.severity] ?? d.severity }}</span>
            </span>
          </li>
        </ul>
      </div>

      <!-- Section: Odontogram findings -->
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-white/40">Hallazgos del odontograma</p>
        <div v-if="odontogram.length === 0" class="text-sm text-white/30">Sin hallazgos registrados en esta consulta.</div>
        <ul v-else class="space-y-1.5">
          <li
            v-for="e in odontogram"
            :key="e.id"
            class="flex items-start gap-2 text-sm text-white"
          >
            <span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
            <span>
              Diente {{ e.tooth_number }}
              <span v-if="e.surface"> — {{ e.surface }}</span>:
              {{ FINDING_LABEL[e.finding_type] ?? e.finding_type }}
              <span v-if="e.observation" class="text-white/50"> — {{ e.observation }}</span>
            </span>
          </li>
        </ul>
      </div>

      <!-- Section: Treatment plan -->
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-white/40">Plan de tratamiento</p>
        <div v-if="treatments.length === 0" class="text-sm text-white/30">Sin tratamientos registrados.</div>
        <ul v-else class="space-y-1.5">
          <li
            v-for="t in treatments"
            :key="t.id"
            class="flex items-start gap-2 text-sm"
            :class="t.status === 'voided' ? 'text-white/30 line-through' : 'text-white'"
          >
            <span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
            <span>
              {{ t.treatment_name_snapshot }}
              <span v-if="t.tooth_reference" class="text-white/50"> (Diente {{ t.tooth_reference }})</span>
            </span>
          </li>
        </ul>
      </div>

      <!-- Section: Prescriptions -->
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-white/40">Prescripciones</p>
        <div v-if="prescriptions.length === 0" class="text-sm text-white/30">Sin prescripciones emitidas.</div>
        <ul v-else class="space-y-1.5">
          <li
            v-for="p in prescriptions"
            :key="p.id"
            class="flex items-start gap-2 text-sm text-white"
          >
            <span class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
            <span>
              {{ p.medication }} — {{ p.dosage }}, {{ p.frequency }}, {{ p.duration }}
            </span>
          </li>
        </ul>
      </div>

      <!-- Footer -->
      <div class="border-t border-white/10 pt-6">
        <div class="flex items-end gap-4">
          <div class="flex-1 border-b border-white/30 pb-1" />
          <p class="text-xs text-white/40">Firma del profesional</p>
        </div>
      </div>

    </div>

  </div>
</template>

<style scoped>
@media print {
  .no-print {
    display: none !important;
  }
  .print-area {
    border: 1px solid #ccc !important;
    background: #fff !important;
    color: #000 !important;
    padding: 2rem !important;
    border-radius: 0 !important;
  }
  body {
    background: #fff !important;
  }
}
</style>
