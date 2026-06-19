<script setup lang="ts">
import type { PropType } from 'vue'
import type { DentalConsultationTreatment, DentalConsultationSession } from '../../types/dental'
import ConsultationTreatmentsTab from './ConsultationTreatmentsTab.vue'
import ConsultationSessionsTab from './ConsultationSessionsTab.vue'

interface FollowUpForm {
  requires_follow_up: boolean
  requires_multiple_sessions: boolean
  estimated_sessions: number | undefined
  next_session_date: string
  follow_up_notes: string
}

defineProps({
  // ConsultationTreatmentsTab props
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
  // ConsultationSessionsTab props
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
  // From ConsultationTreatmentsTab
  (e: 'add-service'): void
  (e: 'void-service', svc: DentalConsultationTreatment): void
  (e: 'save-follow-up'): void
  (e: 'schedule-sessions'): void
  (e: 'update:followUpForm', value: FollowUpForm): void
  (e: 'update:sessionScheduleDates', value: string[]): void
  // From ConsultationSessionsTab
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
  <div class="space-y-8">

    <!-- Treatment items section -->
    <ConsultationTreatmentsTab
      :active-services="activeServices"
      :voided-services="voidedServices"
      :total="total"
      :has-closed-payments="hasClosedPayments"
      :follow-up-form="followUpForm"
      :session-schedule-dates="sessionScheduleDates"
      :sessions-count="sessionsCount"
      :scheduling-sessions="schedulingSessions"
      :saving-follow-up="savingFollowUp"
      :fmt-currency="fmtCurrency"
      :consultation="consultation"
      @add-service="emit('add-service')"
      @void-service="(svc) => emit('void-service', svc)"
      @save-follow-up="emit('save-follow-up')"
      @schedule-sessions="emit('schedule-sessions')"
      @update:follow-up-form="(v) => emit('update:followUpForm', v)"
      @update:session-schedule-dates="(v) => emit('update:sessionScheduleDates', v)"
    />

    <!-- Divider -->
    <div class="border-t border-white/10" />

    <!-- Sessions section -->
    <ConsultationSessionsTab
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

  </div>
</template>
