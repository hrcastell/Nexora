<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { dentalAnamnesisService } from '../../services/dentalAnamnesisService'
import type { DentalAnamnesis } from '../../services/dentalAnamnesisService'

// ── Types ──────────────────────────────────────────────────────
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface ClinicalAlert {
  field: keyof DentalAnamnesis
  label: string
  severity: AlertSeverity
  icon: string
  active: boolean
}

// ── Alert rules ────────────────────────────────────────────────
const ALERT_RULES: Omit<ClinicalAlert, 'active'>[] = [
  { field: 'has_penicillin_allergy',  label: 'Alergia a Penicilina',   severity: 'critical', icon: 'octagon'   },
  { field: 'has_aspirin_allergy',     label: 'Alergia a Aspirina',     severity: 'critical', icon: 'octagon'   },
  { field: 'has_anesthesia_allergy',  label: 'Alergia a Anestesia',    severity: 'critical', icon: 'octagon'   },
  { field: 'has_latex_allergy',       label: 'Alergia a Latex',        severity: 'high',     icon: 'triangle'  },
  { field: 'takes_anticoagulants',    label: 'Toma Anticoagulantes',   severity: 'high',     icon: 'triangle'  },
  { field: 'takes_bisphosphonates',   label: 'Toma Bifosfonatos',      severity: 'high',     icon: 'triangle'  },
  { field: 'has_heart_disease',       label: 'Enfermedad Cardiaca',    severity: 'high',     icon: 'heart'     },
  { field: 'has_epilepsy',            label: 'Epilepsia',              severity: 'high',     icon: 'zap'       },
  { field: 'has_diabetes',            label: 'Diabetes',               severity: 'medium',   icon: 'activity'  },
  { field: 'has_hypertension',        label: 'Hipertension',           severity: 'medium',   icon: 'activity'  },
  { field: 'has_hiv',                 label: 'VIH',                    severity: 'medium',   icon: 'shield'    },
  { field: 'has_hepatitis',           label: 'Hepatitis',              severity: 'medium',   icon: 'shield'    },
  { field: 'smokes',                  label: 'Fumador',                severity: 'low',      icon: 'wind'      },
  { field: 'bruxism',                 label: 'Bruxismo',               severity: 'low',      icon: 'info'      },
]

// ── Severity styles ────────────────────────────────────────────
const SEVERITY_STYLES: Record<AlertSeverity, { card: string; badge: string; label: string }> = {
  critical: {
    card:  'bg-red-500/10 border-red-500/30',
    badge: 'bg-red-500/20 text-red-300 border border-red-500/30',
    label: 'Critica',
  },
  high: {
    card:  'bg-orange-500/10 border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    label: 'Alta',
  },
  medium: {
    card:  'bg-yellow-500/10 border-yellow-500/30',
    badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    label: 'Media',
  },
  low: {
    card:  'bg-blue-500/10 border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    label: 'Baja',
  },
}

// ── Props ──────────────────────────────────────────────────────
const props = defineProps<{ consultationId: number }>()

// ── State ──────────────────────────────────────────────────────
const anamnesis = ref<DentalAnamnesis | null>(null)
const loading   = ref(false)
const error     = ref<string | null>(null)

// ── Derived alerts ─────────────────────────────────────────────
const alerts = computed<ClinicalAlert[]>(() => {
  if (!anamnesis.value) return []
  return ALERT_RULES
    .map(rule => ({
      ...rule,
      active: Boolean(anamnesis.value![rule.field]),
    }))
    .filter(a => a.active)
})

const criticalAlerts = computed(() => alerts.value.filter(a => a.severity === 'critical'))
const highAlerts     = computed(() => alerts.value.filter(a => a.severity === 'high'))
const mediumAlerts   = computed(() => alerts.value.filter(a => a.severity === 'medium'))
const lowAlerts      = computed(() => alerts.value.filter(a => a.severity === 'low'))

// ── Load ───────────────────────────────────────────────────────
async function load() {
  loading.value = true
  error.value   = null
  try {
    const result = await dentalAnamnesisService.getByConsultation(props.consultationId)
    anamnesis.value = result?.data ?? null
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } }; message?: string }
    error.value = err?.response?.data?.error || err?.message || 'Error al cargar alertas'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">

    <!-- Error -->
    <div v-if="error" class="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
      <span>✕</span><span>{{ error }}</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12 text-white/40 text-sm gap-2">
      <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <span>Cargando alertas clinicas...</span>
    </div>

    <template v-else>

      <!-- No anamnesis yet -->
      <div
        v-if="anamnesis === null"
        class="flex flex-col items-center justify-center py-12 text-white/40 gap-3 rounded-xl bg-white/5 border border-white/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-3-3v6M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z"/>
        </svg>
        <p class="text-sm text-center">No hay anamnesis registrada para esta consulta.</p>
        <p class="text-xs text-white/30 text-center">Complete la anamnesis en la pestana "Anamnesis" para ver las alertas.</p>
      </div>

      <!-- No active alerts -->
      <div
        v-else-if="alerts.length === 0"
        class="flex flex-col items-center justify-center py-12 text-white/40 gap-3 rounded-xl bg-green-500/5 border border-green-500/20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-green-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-sm text-green-300/60">Sin alertas clinicas activas</p>
        <p class="text-xs text-white/30">El paciente no presenta condiciones de riesgo registradas.</p>
      </div>

      <!-- Active alerts -->
      <template v-else>

        <!-- Summary counts -->
        <div class="flex flex-wrap gap-2">
          <span
            v-if="criticalAlerts.length"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            {{ criticalAlerts.length }} critica{{ criticalAlerts.length !== 1 ? 's' : '' }}
          </span>
          <span
            v-if="highAlerts.length"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30"
          >
            {{ highAlerts.length }} alta{{ highAlerts.length !== 1 ? 's' : '' }}
          </span>
          <span
            v-if="mediumAlerts.length"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
          >
            {{ mediumAlerts.length }} media{{ mediumAlerts.length !== 1 ? 's' : '' }}
          </span>
          <span
            v-if="lowAlerts.length"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30"
          >
            {{ lowAlerts.length }} baja{{ lowAlerts.length !== 1 ? 's' : '' }}
          </span>
        </div>

        <!-- Alert cards -->
        <div class="space-y-2">
          <div
            v-for="alert in alerts"
            :key="String(alert.field)"
            class="flex items-center gap-3 rounded-xl border px-4 py-3"
            :class="SEVERITY_STYLES[alert.severity].card"
          >
            <!-- Severity icon -->
            <div class="flex-shrink-0">
              <!-- critical / high: triangle warning -->
              <svg
                v-if="alert.icon === 'octagon' || alert.icon === 'triangle'"
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                :class="alert.severity === 'critical' ? 'text-red-400' : 'text-orange-400'"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              <!-- heart -->
              <svg
                v-else-if="alert.icon === 'heart'"
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-orange-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
              <!-- zap -->
              <svg
                v-else-if="alert.icon === 'zap'"
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-orange-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <!-- activity / shield -->
              <svg
                v-else-if="alert.icon === 'activity'"
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-yellow-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <svg
                v-else-if="alert.icon === 'shield'"
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-yellow-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <!-- wind -->
              <svg
                v-else-if="alert.icon === 'wind'"
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-blue-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2"/>
              </svg>
              <!-- info (default) -->
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-blue-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>

            <!-- Label -->
            <span class="flex-1 text-sm font-medium text-white/80">{{ alert.label }}</span>

            <!-- Severity badge -->
            <span
              class="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
              :class="SEVERITY_STYLES[alert.severity].badge"
            >
              {{ SEVERITY_STYLES[alert.severity].label }}
            </span>
          </div>
        </div>

      </template>
    </template>
  </div>
</template>
