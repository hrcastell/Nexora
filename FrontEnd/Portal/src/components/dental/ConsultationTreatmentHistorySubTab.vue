<script setup lang="ts">
import type { PropType } from 'vue'
import type { DentalConsultationTreatment, DentalConsultationSession } from '../../types/dental'
import ConsultationTreatmentPlanTab from './ConsultationTreatmentPlanTab.vue'

interface FollowUpForm {
  requires_follow_up: boolean
  requires_multiple_sessions: boolean
  estimated_sessions: number | undefined
  next_session_date: string
  follow_up_notes: string
}

defineProps({
  activeServices:       { type: Array as PropType<DentalConsultationTreatment[]>, default: () => [] },
  voidedServices:       { type: Array as PropType<DentalConsultationTreatment[]>, default: () => [] },
  total:                { type: Number, default: 0 },
  hasClosedPayments:    { type: Boolean, default: false },
  followUpForm:         { type: Object as PropType<FollowUpForm>, required: true },
  sessionScheduleDates: { type: Array as PropType<string[]>, default: () => [] },
  sessionsCount:        { type: Number, default: 0 },
  schedulingSessions:   { type: Boolean, default: false },
  savingFollowUp:       { type: Boolean, default: false },
  fmtCurrency:          { type: Function as PropType<(v?: number | string | null) => string>, default: null },
  consultation:         { type: Object as PropType<Record<string, any> | null>, default: null },
  sessions:             { type: Array as PropType<DentalConsultationSession[]>, default: () => [] },
  statusClass:          { type: Object, default: () => ({}) },
  statusLabel:          { type: Object, default: () => ({}) },
  editingSessionId:     { type: [String, Number] as PropType<string | number | null>, default: null },
  editSessionDate:      { type: String, default: '' },
  savingEditSession:    { type: Boolean, default: false },
  fmtDate:              { type: Function, default: null },
  fmtDateTime:          { type: Function, default: null },
})

const emit = defineEmits<{
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
</script>

<template>
  <div class="space-y-4">

    <div class="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-white/40">Plan de tratamiento</p>
    </div>

    <ConsultationTreatmentPlanTab
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

  </div>
</template>
