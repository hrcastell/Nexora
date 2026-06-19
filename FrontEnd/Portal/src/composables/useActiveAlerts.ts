import { ref, computed, onMounted } from 'vue'
import { dentalAnamnesisService } from '../services/dentalAnamnesisService'
import type { DentalAnamnesis } from '../services/dentalAnamnesisService'

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface ClinicalAlert {
  field: keyof DentalAnamnesis
  label: string
  severity: AlertSeverity
}

const ALERT_RULES: ClinicalAlert[] = [
  { field: 'has_penicillin_allergy',  label: 'Alergia a Penicilina',  severity: 'critical' },
  { field: 'has_aspirin_allergy',     label: 'Alergia a Aspirina',    severity: 'critical' },
  { field: 'has_anesthesia_allergy',  label: 'Alergia a Anestesia',   severity: 'critical' },
  { field: 'has_latex_allergy',       label: 'Alergia a Latex',       severity: 'high'     },
  { field: 'takes_anticoagulants',    label: 'Toma Anticoagulantes',  severity: 'high'     },
  { field: 'takes_bisphosphonates',   label: 'Toma Bifosfonatos',     severity: 'high'     },
  { field: 'has_heart_disease',       label: 'Enfermedad Cardiaca',   severity: 'high'     },
  { field: 'has_epilepsy',            label: 'Epilepsia',             severity: 'high'     },
  { field: 'has_diabetes',            label: 'Diabetes',              severity: 'medium'   },
  { field: 'has_hypertension',        label: 'Hipertension',          severity: 'medium'   },
  { field: 'has_hiv',                 label: 'VIH',                   severity: 'medium'   },
  { field: 'has_hepatitis',           label: 'Hepatitis',             severity: 'medium'   },
  { field: 'smokes',                  label: 'Fumador',               severity: 'low'      },
  { field: 'bruxism',                 label: 'Bruxismo',              severity: 'low'      },
]

export function useActiveAlerts(consultationId: number) {
  const anamnesis = ref<DentalAnamnesis | null>(null)
  const loading   = ref(false)

  const alerts = computed<ClinicalAlert[]>(() => {
    if (!anamnesis.value) return []
    return ALERT_RULES.filter(rule => Boolean(anamnesis.value![rule.field]))
  })

  const hasCritical = computed(() => alerts.value.some(a => a.severity === 'critical'))
  const hasHigh     = computed(() => alerts.value.some(a => a.severity === 'high'))

  async function load() {
    loading.value = true
    try {
      const result = await dentalAnamnesisService.getByConsultation(consultationId)
      anamnesis.value = result?.data ?? null
    } catch {
      // Silently fail — banner simply won't show
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  return { hasCritical, hasHigh, alerts, loading, refresh: load }
}
