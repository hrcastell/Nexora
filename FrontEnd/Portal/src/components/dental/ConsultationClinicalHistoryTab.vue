<script setup lang="ts">
import { ref } from 'vue'
import type { PropType } from 'vue'
import type { DentalMedicalHistory, DentalConsultationTreatment, DentalConsultationSession } from '../../types/dental'
import ConsultationHistoryTab from './ConsultationHistoryTab.vue'
import ConsultationFilesSection from './ConsultationFilesSection.vue'
import ConsultationAnamnesisSubTab from './ConsultationAnamnesisSubTab.vue'
import ConsultationClinicalAlertsSubTab from './ConsultationClinicalAlertsSubTab.vue'
import ConsultationPrescriptionsSubTab from './ConsultationPrescriptionsSubTab.vue'
import ConsultationOdontogramSubTab from './ConsultationOdontogramSubTab.vue'
import ConsultationDiagnosesSubTab from './ConsultationDiagnosesSubTab.vue'
import ConsultationTreatmentHistorySubTab from './ConsultationTreatmentHistorySubTab.vue'
import ConsultationEvolutionsSubTab from './ConsultationEvolutionsSubTab.vue'
import ConsultationFinalReportSubTab from './ConsultationFinalReportSubTab.vue'
import { useActiveAlerts } from '../../composables/useActiveAlerts'

interface FollowUpForm {
  requires_follow_up: boolean
  requires_multiple_sessions: boolean
  estimated_sessions: number | undefined
  next_session_date: string
  follow_up_notes: string
}

type HistorySubKey =
  | 'medical-summary'
  | 'files'
  | 'anamnesis'
  | 'alerts'
  | 'odontogram'
  | 'diagnoses'
  | 'treatment-plan'
  | 'evolutions'
  | 'prescriptions'
  | 'final-report'

const ACTIVE_SUB_TABS: { key: HistorySubKey; label: string }[] = [
  { key: 'medical-summary', label: 'Resumen medico' },
  { key: 'files',           label: 'Archivos clinicos' },
  { key: 'anamnesis',       label: 'Anamnesis' },
  { key: 'alerts',          label: 'Alertas clinicas' },
  { key: 'prescriptions',   label: 'Prescripciones' },
  { key: 'odontogram',      label: 'Odontograma' },
  { key: 'diagnoses',       label: 'Diagnosticos' },
  { key: 'treatment-plan',  label: 'Tratamiento' },
  { key: 'evolutions',      label: 'Evoluciones' },
  { key: 'final-report',    label: 'Informe final' },
]

const props = defineProps({
  consultation:         { type: Object as PropType<Record<string, any> | null>, default: null },
  medicalHistory:       { type: Array as PropType<DentalMedicalHistory[]>, default: () => [] },
  fmtDate:              { type: Function as PropType<(v?: string | null) => string>, default: null },
  consultationId:       { type: Number, required: true },
  customerId:           { type: Number, required: true },
  patientId:            { type: Number, required: true },
  readOnly:             { type: Boolean, default: false },
  patientName:          { type: String, default: undefined },
  // Treatment plan props — forwarded to ConsultationTreatmentHistorySubTab
  activeServices:       { type: Array as PropType<DentalConsultationTreatment[]>, default: () => [] },
  voidedServices:       { type: Array as PropType<DentalConsultationTreatment[]>, default: () => [] },
  total:                { type: Number, default: 0 },
  hasClosedPayments:    { type: Boolean, default: false },
  followUpForm:         { type: Object as PropType<FollowUpForm>, default: () => ({
    requires_follow_up: false,
    requires_multiple_sessions: false,
    estimated_sessions: undefined,
    next_session_date: '',
    follow_up_notes: '',
  }) },
  sessionScheduleDates: { type: Array as PropType<string[]>, default: () => [] },
  sessionsCount:        { type: Number, default: 0 },
  schedulingSessions:   { type: Boolean, default: false },
  savingFollowUp:       { type: Boolean, default: false },
  fmtCurrency:          { type: Function as PropType<(v?: number | string | null) => string>, default: null },
  sessions:             { type: Array as PropType<DentalConsultationSession[]>, default: () => [] },
  statusClass:          { type: Object, default: () => ({}) },
  statusLabel:          { type: Object, default: () => ({}) },
  editingSessionId:     { type: [String, Number] as PropType<string | number | null>, default: null },
  editSessionDate:      { type: String, default: '' },
  savingEditSession:    { type: Boolean, default: false },
  fmtDateTime:          { type: Function, default: null },
})

const emit = defineEmits<{
  (e: 'add-record'): void
  (e: 'add-service'): void
  (e: 'void-service', svc: DentalConsultationTreatment): void
  (e: 'save-follow-up'): void
  (e: 'schedule-sessions'): void
  (e: 'update:followUpForm', value: FollowUpForm): void
  (e: 'update:sessionScheduleDates', value: string[]): void
  (e: 'new-session'): void
  (e: 'start-edit-session', session: DentalConsultationSession): void
  (e: 'save-edit-session', session: DentalConsultationSession): void
  (e: 'cancel-edit-session'): void
  (e: 'complete-session', session: DentalConsultationSession): void
  (e: 'cancel-session', session: DentalConsultationSession): void
  (e: 'update:editSessionDate', value: string): void
}>()

const activeSubTab = ref<HistorySubKey>('medical-summary')

// Persistent alert banner — loaded once for this tab area
const { hasCritical, hasHigh, alerts: activeAlerts, refresh: refreshAlerts } = useActiveAlerts(props.consultationId)
</script>

<template>
  <div class="space-y-4">

    <!-- Persistent clinical alert banner -->
    <transition name="fade">
      <div
        v-if="hasCritical || hasHigh"
        class="flex items-center gap-3 px-4 py-3 rounded-lg border"
        :class="hasCritical
          ? 'bg-red-500/10 border-red-500/30 text-red-300'
          : 'bg-orange-500/10 border-orange-500/30 text-orange-300'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        <span class="text-sm font-medium">
          Alertas clinicas activas —
          {{ activeAlerts.filter(a => a.severity === 'critical').length > 0
            ? `${activeAlerts.filter(a => a.severity === 'critical').length} critica(s)`
            : '' }}
          {{ activeAlerts.filter(a => a.severity === 'critical').length > 0 && activeAlerts.filter(a => a.severity === 'high').length > 0 ? ' · ' : '' }}
          {{ activeAlerts.filter(a => a.severity === 'high').length > 0
            ? `${activeAlerts.filter(a => a.severity === 'high').length} alta(s)`
            : '' }}
        </span>
        <button
          class="ml-auto text-xs underline underline-offset-2 hover:no-underline opacity-70 hover:opacity-100 transition-opacity"
          @click="activeSubTab = 'alerts'"
        >
          Ver alertas
        </button>
      </div>
    </transition>

    <!-- Mobile: dropdown -->
    <div class="md:hidden">
      <select
        :value="activeSubTab"
        @change="activeSubTab = ($event.target as HTMLSelectElement).value as HistorySubKey"
        class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-[var(--nexora-primary)]"
      >
        <option v-for="sub in ACTIVE_SUB_TABS" :key="sub.key" :value="sub.key">{{ sub.label }}</option>
      </select>
    </div>
    <!-- Desktop: horizontal pills -->
    <div class="hidden md:flex gap-1 flex-wrap">
      <button
        v-for="sub in ACTIVE_SUB_TABS"
        :key="sub.key"
        class="rounded-lg px-4 py-2 text-sm font-medium transition"
        :class="activeSubTab === sub.key
          ? 'bg-[var(--nexora-primary)] text-white'
          : 'text-white/50 hover:bg-white/5 hover:text-white'"
        @click="activeSubTab = sub.key"
      >
        {{ sub.label }}
      </button>
    </div>

    <!-- Sub-tab content -->
    <ConsultationHistoryTab
      v-if="activeSubTab === 'medical-summary'"
      :consultation="consultation"
      :medical-history="medicalHistory"
      :fmt-date="fmtDate"
      @add-record="emit('add-record')"
    />

    <ConsultationFilesSection
      v-else-if="activeSubTab === 'files'"
      :consultation-id="consultationId"
      :customer-id="customerId"
      :read-only="readOnly"
    />

    <ConsultationAnamnesisSubTab
      v-else-if="activeSubTab === 'anamnesis'"
      :consultation-id="consultationId"
      :read-only="readOnly"
      @saved="refreshAlerts"
    />

    <ConsultationClinicalAlertsSubTab
      v-else-if="activeSubTab === 'alerts'"
      :consultation-id="consultationId"
    />

    <ConsultationPrescriptionsSubTab
      v-else-if="activeSubTab === 'prescriptions'"
      :consultation-id="consultationId"
      :read-only="readOnly"
      :patient-name="patientName"
    />

    <ConsultationOdontogramSubTab
      v-else-if="activeSubTab === 'odontogram'"
      :consultation-id="consultationId"
      :patient-id="patientId"
      :read-only="readOnly"
    />

    <ConsultationDiagnosesSubTab
      v-else-if="activeSubTab === 'diagnoses'"
      :consultation-id="consultationId"
      :read-only="readOnly"
    />

    <ConsultationTreatmentHistorySubTab
      v-else-if="activeSubTab === 'treatment-plan'"
      :read-only="readOnly"
      :active-services="activeServices"
      :voided-services="voidedServices"
      :total="total"
      :has-closed-payments="hasClosedPayments"
      :consultation="consultation"
      :follow-up-form="followUpForm"
      :session-schedule-dates="sessionScheduleDates"
      :sessions-count="sessionsCount"
      :scheduling-sessions="schedulingSessions"
      :saving-follow-up="savingFollowUp"
      :fmt-currency="fmtCurrency"
      :sessions="sessions"
      :status-class="statusClass"
      :status-label="statusLabel"
      :editing-session-id="editingSessionId"
      :edit-session-date="editSessionDate"
      :saving-edit-session="savingEditSession"
      :fmt-date="fmtDate"
      :fmt-date-time="fmtDateTime"
      @add-service="emit('add-service')"
      @void-service="(svc) => emit('void-service', svc)"
      @save-follow-up="emit('save-follow-up')"
      @schedule-sessions="emit('schedule-sessions')"
      @update:follow-up-form="(v) => emit('update:followUpForm', v)"
      @update:session-schedule-dates="(v) => emit('update:sessionScheduleDates', v)"
      @new-session="emit('new-session')"
      @start-edit-session="(s) => emit('start-edit-session', s)"
      @save-edit-session="(s) => emit('save-edit-session', s)"
      @cancel-edit-session="emit('cancel-edit-session')"
      @complete-session="(s) => emit('complete-session', s)"
      @cancel-session="(s) => emit('cancel-session', s)"
      @update:edit-session-date="(v) => emit('update:editSessionDate', v)"
    />

    <ConsultationEvolutionsSubTab
      v-else-if="activeSubTab === 'evolutions'"
      :read-only="readOnly"
      :consultation="consultation"
      :sessions="sessions"
      :status-class="statusClass"
      :status-label="statusLabel"
      :editing-session-id="editingSessionId"
      :edit-session-date="editSessionDate"
      :saving-edit-session="savingEditSession"
      :fmt-date="fmtDate"
      :fmt-date-time="fmtDateTime"
      @new-session="emit('new-session')"
      @start-edit-session="(s) => emit('start-edit-session', s)"
      @save-edit-session="(s) => emit('save-edit-session', s)"
      @cancel-edit-session="emit('cancel-edit-session')"
      @complete-session="(s) => emit('complete-session', s)"
      @cancel-session="(s) => emit('cancel-session', s)"
      @update:edit-session-date="(v) => emit('update:editSessionDate', v)"
    />

    <ConsultationFinalReportSubTab
      v-else-if="activeSubTab === 'final-report'"
      :consultation-id="consultationId"
      :patient-id="patientId"
      :patient-name="patientName"
    />

  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
