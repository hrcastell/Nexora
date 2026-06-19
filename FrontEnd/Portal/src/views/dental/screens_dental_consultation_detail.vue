<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, Stethoscope, Calendar, ClipboardList, DollarSign,
  Camera, BookOpen, AlertCircle, Paperclip, FileText
} from 'lucide-vue-next'
import { useDentalConsultationsStore } from '../../stores/dentalConsultations'
import { useDentalPatientsStore } from '../../stores/dentalPatients'
import { useDentalConsultationTreatmentsStore } from '../../stores/dentalConsultationTreatments'
import { useDentalConsultationSessionsStore } from '../../stores/dentalConsultationSessions'
import { useDentalTreatmentsStore } from '../../stores/dentalTreatments'
import { dentalChargesService } from '../../services/dentalChargesService'
import NxrSlidePanel from '../../components/NxrSlidePanel.vue'
import AppToast from '../../components/AppToast.vue'
import ConfirmActionModal from '../../components/admin/ConfirmActionModal.vue'
import WidgetsDentalPhotoGallery from '../../components/widgets_dental_photo_gallery.vue'
import ConsultationAttachmentsTab from '../../components/dental/ConsultationAttachmentsTab.vue'
import ConsultationDocumentsSection from '../../components/dental/ConsultationDocumentsSection.vue'
import ConsultationSessionsTab from '../../components/dental/ConsultationSessionsTab.vue'
import ConsultationSummaryTab from '../../components/dental/ConsultationSummaryTab.vue'
import ConsultationTreatmentsTab from '../../components/dental/ConsultationTreatmentsTab.vue'
import ConsultationHistoryTab from '../../components/dental/ConsultationHistoryTab.vue'
import ConsultationPaymentsTab from '../../components/dental/ConsultationPaymentsTab.vue'
import { useToast } from '../../composables/useToast'
import type {
  DentalCharge, DentalInstallment, DentalMedicalHistory,
  DentalConsultationTreatment, DentalConsultationSession,
  DentalConsultationTreatmentFormData, DentalConsultationSessionFormData
} from '../../types/dental'

// ── Route / Router ────────────────────────────────────────────────────────────
const route  = useRoute()
const router = useRouter()
const id     = route.params.id as string
const { toasts, triggerToast, removeToast } = useToast()

// ── Stores ────────────────────────────────────────────────────────────────────
const store                    = useDentalConsultationsStore()
const patientStore             = useDentalPatientsStore()
const consultationTreatmentsStore = useDentalConsultationTreatmentsStore()
const sessionsStore               = useDentalConsultationSessionsStore()
const treatmentsStore             = useDentalTreatmentsStore()

const consultation = computed(() => store.current)

// ── Tabs ──────────────────────────────────────────────────────────────────────
type TabKey = 'summary' | 'treatments' | 'sessions' | 'photos' | 'history' | 'payments' | 'attachments' | 'documents'
const activeTab = ref<TabKey>('summary')

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: 'summary',     label: 'Resumen',     icon: ClipboardList },
  { key: 'treatments',  label: 'Tratamiento', icon: Stethoscope   },
  { key: 'sessions',    label: 'Sesiones',    icon: Calendar       },
  { key: 'photos',      label: 'Fotos',       icon: Camera         },
  { key: 'history',     label: 'Historia',    icon: BookOpen       },
  { key: 'payments',    label: 'Pagos',       icon: DollarSign     },
  { key: 'attachments', label: 'Adjuntos',    icon: Paperclip      },
  { key: 'documents',   label: 'Documentos',  icon: FileText       },
]

function selectTab(key: TabKey) {
  activeTab.value = key
  if (key === 'payments') loadCharge()
  if (key === 'history')  loadMedicalHistory()
}

// ── Status maps ───────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  borrador:                'Borrador',
  creada:                  'Creada',
  en_evaluacion:           'En Evaluación',
  cotizada:                'Cotizada',
  propuesta_pendiente:     'Propuesta Pendiente',
  aceptada:                'Aceptada',
  en_tratamiento:          'En Tratamiento',
  sesion_pendiente:        'Sesión Pendiente',
  finalizada_clinicamente: 'Finalizada',
  pendiente_pago:          'Pendiente Pago',
  cerrada:                 'Cerrada',
  rechazada:               'Rechazada',
  cancelled:               'Cancelada',
  no_show:                 'No Asistió',
  voided:                  'Anulada',
}
const STATUS_CLASS: Record<string, string> = {
  borrador:                'bg-white/10 text-white/40',
  creada:                  'bg-blue-500/20 text-blue-400',
  en_evaluacion:           'bg-indigo-500/20 text-indigo-400',
  cotizada:                'bg-violet-500/20 text-violet-400',
  propuesta_pendiente:     'bg-amber-500/20 text-amber-400',
  aceptada:                'bg-cyan-500/20 text-cyan-400',
  en_tratamiento:          'bg-green-500/20 text-green-400',
  sesion_pendiente:        'bg-yellow-500/20 text-yellow-400',
  finalizada_clinicamente: 'bg-teal-500/20 text-teal-400',
  pendiente_pago:          'bg-orange-500/20 text-orange-400',
  cerrada:                 'bg-slate-500/20 text-slate-400',
  rechazada:               'bg-red-500/20 text-red-400',
  cancelled:               'bg-red-500/20 text-red-400',
  no_show:                 'bg-zinc-500/20 text-zinc-400',
  voided:                  'bg-red-900/30 text-red-300',
}
const ADMIN_STATUS_LABEL: Record<string, string> = {
  unpaid:         'Sin pagar',
  partially_paid: 'Pago parcial',
  paid:           'Pagado',
  overdue:        'Vencido',
  cancelled:      'Cancelado',
}
const ADMIN_STATUS_CLASS: Record<string, string> = {
  unpaid:         'bg-yellow-500/20 text-yellow-400',
  partially_paid: 'bg-blue-500/20 text-blue-400',
  paid:           'bg-green-500/20 text-green-400',
  overdue:        'bg-red-500/20 text-red-400',
  cancelled:      'bg-white/10 text-white/40',
}
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash:           'Efectivo',
  card:           'Tarjeta',
  bank_transfer:  'Transferencia',
  mobile_payment: 'Pago móvil',
  insurance:      'Seguro',
  other:          'Otro',
}

// ── Allowed transitions ───────────────────────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  borrador:                ['creada'],
  creada:                  ['en_evaluacion', 'cancelled'],
  en_evaluacion:           ['cotizada', 'en_tratamiento', 'cancelled'],
  cotizada:                ['propuesta_pendiente', 'en_tratamiento', 'cancelled'],
  propuesta_pendiente:     ['aceptada', 'rechazada'],
  aceptada:                ['en_tratamiento'],
  en_tratamiento:          ['sesion_pendiente', 'finalizada_clinicamente'],
  sesion_pendiente:        ['en_tratamiento'],
  finalizada_clinicamente: ['pendiente_pago', 'cerrada'],
  pendiente_pago:          ['cerrada'],
  rechazada:               ['cerrada'],
  cerrada:                 [],
  cancelled:               [],
  no_show:                 [],
  voided:                  [],
}

// ── State ─────────────────────────────────────────────────────────────────────
const confirmModal = ref<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
  open: false, title: '', message: '', onConfirm: () => {}
})
function askConfirm(title: string, message: string, onConfirm: () => void) {
  confirmModal.value = { open: true, title, message, onConfirm }
}

const actionLoading = ref(false)

// Edit info
const editOpen = ref(false)
const editForm = ref({ reason: '', diagnosis: '', clinical_notes: '', indications: '' })

// Status change
const changingStatus   = ref(false)
const statusReason     = ref('')
const showStatusPanel  = ref(false)
const targetStatus     = ref('')

// Add treatment
const showAddServicePanel  = ref(false)
const addServiceForm       = ref<DentalConsultationTreatmentFormData>({
  treatment_id: null, treatment_name_snapshot: '', unit_price: 0,
  quantity: 1, tooth_reference: '', clinical_notes: ''
})
const savingService        = ref(false)
const addServiceError      = ref<string | null>(null)
const selectedServiceForAdd = ref<any>(null)

// Session scheduling (bulk — from treatment tab)
const sessionScheduleDates  = ref<string[]>([])
const schedulingSessions    = ref(false)

// Session edit (inline date change in sessions tab)
const editingSessionId  = ref<number | string | null>(null)
const editSessionDate   = ref('')
const savingEditSession = ref(false)

async function startEditSession(s: DentalConsultationSession) {
  editingSessionId.value = s.id
  editSessionDate.value  = s.session_date
    ? new Date(s.session_date).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16)
}

function cancelEditSession() {
  editingSessionId.value = null
  editSessionDate.value  = ''
}

async function saveEditSession(s: DentalConsultationSession) {
  if (!editSessionDate.value) return
  savingEditSession.value = true
  try {
    await sessionsStore.update(id, s.id, { session_date: editSessionDate.value })
    triggerToast('Éxito', `Sesión #${s.session_number} reprogramada. La cita en agenda fue actualizada.`, 'success')
    editingSessionId.value = null
  } catch (e: any) {
    triggerToast('Error', e?.response?.data?.error || 'Error al guardar', 'error')
  } finally {
    savingEditSession.value = false
  }
}

async function scheduleAllSessions() {
  if (!sessionScheduleDates.value.some(d => d)) return
  schedulingSessions.value = true
  let successCount = 0
  let failCount = 0
  try {
    for (let i = 0; i < sessionScheduleDates.value.length; i++) {
      const date = sessionScheduleDates.value[i]
      try {
        await sessionsStore.create(id, {
          session_date: date || undefined,
          notes: undefined,
          evolution: undefined,
          next_session_date: undefined,
        })
        successCount++
      } catch {
        failCount++
      }
    }
    if (successCount > 0 && failCount > 0) {
      triggerToast('Advertencia', `${successCount} sesiones creadas, ${failCount} fallaron`, 'warning')
      sessionScheduleDates.value = []
      activeTab.value = 'sessions'
    } else if (successCount > 0) {
      triggerToast('Éxito', `${successCount} sesiones programadas. Las citas en agenda se procesarán en breve.`, 'success')
      sessionScheduleDates.value = []
      activeTab.value = 'sessions'
    } else {
      triggerToast('Error', 'No se pudo crear ninguna sesión', 'error')
    }
  } finally {
    schedulingSessions.value = false
  }
}

// Session
const showSessionPanel = ref(false)
const sessionForm      = ref<DentalConsultationSessionFormData>({
  session_date: new Date().toISOString().slice(0, 16),
  notes: '', evolution: '', next_session_date: ''
})
const savingSession  = ref(false)
const sessionError   = ref<string | null>(null)

// Follow-up
const followUpForm = ref({
  requires_follow_up: false,
  requires_multiple_sessions: false,
  estimated_sessions: undefined as number | undefined,
  next_session_date: '',
  follow_up_notes: ''
})
const savingFollowUp = ref(false)

watch(() => followUpForm.value.estimated_sessions, (n) => {
  const count = Math.max(0, n ?? 0)
  const current = sessionScheduleDates.value
  sessionScheduleDates.value = Array.from({ length: count }, (_, i) => current[i] ?? '')
}, { immediate: true })

// Payments
const chargeDetail      = ref<DentalCharge | null>(null)
const loadingCharge     = ref(false)
const showInstallPanel  = ref(false)
const installForm       = ref({ installments_count: 3, first_due_date: new Date().toISOString().slice(0, 10) })
const savingInstall     = ref(false)
const installError      = ref<string | null>(null)
const showPayPanel      = ref(false)
const payForm           = ref({ amount: 0, payment_method: 'cash', notes: '' })
const savingPay         = ref(false)
const payError          = ref<string | null>(null)
const showInstPayPanel  = ref(false)
const instPayForm       = ref({ installment_id: 0, amount: 0, payment_method: 'cash' })
const savingInstPay     = ref(false)
const instPayError      = ref<string | null>(null)

// Medical history
const medicalHistory   = ref<DentalMedicalHistory[]>([])
const showMedHistPanel = ref(false)
const savingMedHist    = ref(false)
const medHistError     = ref<string | null>(null)
const medHistForm      = ref({
  entry_date: new Date().toISOString().slice(0, 10),
  blood_type: '', medical_background: '', allergies: '',
  current_medications: '', chronic_conditions: '', dental_observations: '', notes: ''
})

// ── Computed ──────────────────────────────────────────────────────────────────
const patientName = computed(() =>
  (consultation.value?.customer as any)?.full_name ||
  (consultation.value?.customer
    ? `${consultation.value.customer.first_name} ${consultation.value.customer.last_name}`
    : null) ||
  (consultation.value as any)?.patient_name || '—'
)

const allowedTransitions = computed(() =>
  ALLOWED_TRANSITIONS[consultation.value?.status ?? ''] ?? []
)

const hasClosedPayments = computed(() =>
  chargeDetail.value ? parseFloat(chargeDetail.value.paid_amount as any) > 0 : false
)

const canCreateCharge = computed(() =>
  consultation.value?.administrative_status === 'unpaid' &&
  consultationTreatmentsStore.total > 0 &&
  !chargeDetail.value
)

const activeServices = computed(() =>
  (consultationTreatmentsStore.items ?? []).filter(t => t.status !== 'voided')
)
const voidedServices = computed(() =>
  (consultationTreatmentsStore.items ?? []).filter(t => t.status === 'voided')
)

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(raw?: string | null) {
  if (!raw) return '—'
  return new Date(raw).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateTime(raw?: string | null) {
  if (!raw) return '—'
  return new Date(raw).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function fmtCurrency(amount?: number | string | null) {
  const n = Number(amount ?? 0)
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
}

// ── Actions ───────────────────────────────────────────────────────────────────
function openEdit() {
  const c = consultation.value as any
  editForm.value = {
    reason: c?.reason ?? '',
    diagnosis: c?.diagnosis ?? '',
    clinical_notes: c?.clinical_notes ?? '',
    indications: c?.indications ?? ''
  }
  editOpen.value = true
}

async function saveEdit() {
  try {
    await store.update(id, { ...editForm.value })
    triggerToast('Éxito', 'Consulta actualizada', 'success')
    editOpen.value = false
  } catch (e: any) {
    triggerToast('Error', e?.response?.data?.error || 'Error al guardar', 'error')
  }
}

function openStatusChange(status: string) {
  targetStatus.value = status
  statusReason.value = ''
  showStatusPanel.value = true
}

async function confirmStatusChange() {
  changingStatus.value = true
  try {
    await store.changeStatus(id, targetStatus.value, statusReason.value || undefined)
    triggerToast('Éxito', 'Estado actualizado', 'success')
    showStatusPanel.value = false
  } catch (e: any) {
    triggerToast('Error', e?.response?.data?.error || 'Error al cambiar estado', 'error')
  } finally {
    changingStatus.value = false
  }
}

function onServiceSelect(treatmentId: string | number) {
  const trt = (treatmentsStore.items ?? []).find(t => String(t.id) === String(treatmentId))
  selectedServiceForAdd.value = trt || null
  if (trt) {
    addServiceForm.value.treatment_name_snapshot = trt.name
    addServiceForm.value.unit_price = parseFloat(trt.final_price as any) || 0
  }
}

async function addService() {
  if (!addServiceForm.value.unit_price || addServiceForm.value.unit_price <= 0) {
    addServiceError.value = 'El precio unitario debe ser mayor a 0'
    return
  }
  savingService.value = true
  addServiceError.value = null
  try {
    await consultationTreatmentsStore.add(id, addServiceForm.value)
    triggerToast('Éxito', 'Tratamiento agregado', 'success')
    showAddServicePanel.value = false
    addServiceForm.value = { treatment_id: null, treatment_name_snapshot: '', unit_price: 0, quantity: 1, tooth_reference: '', clinical_notes: '' }
    selectedServiceForAdd.value = null
  } catch (e: any) {
    addServiceError.value = e?.response?.data?.error || 'Error al agregar tratamiento'
  } finally {
    savingService.value = false
  }
}

async function voidService(s: DentalConsultationTreatment) {
  const adminStatus = (consultation.value as any)?.administrative_status
  const hasPayments = adminStatus && ['partially_paid', 'paid', 'overdue'].includes(adminStatus)

  if (hasPayments) {
    triggerToast(
      'No permitido',
      'No se puede eliminar este tratamiento porque la consulta tiene pagos registrados. Para modificar los tratamientos, primero revertí los pagos existentes.',
      'error'
    )
    return
  }

  askConfirm(
    'Eliminar tratamiento',
    `¿Eliminar "${s.treatment_name_snapshot}" de la consulta? Esta acción no se puede deshacer.`,
    async () => {
      try {
        await consultationTreatmentsStore.voidTreatment(id, s.id)
        triggerToast('Éxito', 'Tratamiento eliminado', 'success')
      } catch (e: any) {
        triggerToast('Error', e?.response?.data?.error || 'Error al eliminar tratamiento', 'error')
      }
    }
  )
}

async function saveFollowUp() {
  savingFollowUp.value = true
  try {
    await store.update(id, {
      requires_follow_up: followUpForm.value.requires_follow_up,
      requires_multiple_sessions: followUpForm.value.requires_multiple_sessions,
      estimated_sessions: followUpForm.value.estimated_sessions,
      next_session_date: followUpForm.value.next_session_date || undefined,
      follow_up_notes: followUpForm.value.follow_up_notes || undefined,
    } as any)
    triggerToast('Éxito', 'Seguimiento actualizado', 'success')
  } catch (e: any) {
    triggerToast('Error', e?.response?.data?.error || 'Error al guardar seguimiento', 'error')
  } finally {
    savingFollowUp.value = false
  }
}

async function createSession() {
  savingSession.value = true
  sessionError.value = null
  try {
    await sessionsStore.create(id, sessionForm.value)
    triggerToast('Éxito', 'Sesión creada. La cita en agenda se procesará en breve.', 'success')
    showSessionPanel.value = false
    activeTab.value = 'sessions'
    sessionForm.value = { session_date: new Date().toISOString().slice(0, 16), notes: '', evolution: '', next_session_date: '' }
  } catch (e: any) {
    sessionError.value = e?.response?.data?.error || 'Error al crear sesión'
  } finally {
    savingSession.value = false
  }
}

async function completeSession(s: DentalConsultationSession) {
  askConfirm('Completar sesión', `¿Marcar sesión ${s.session_number} como completada?`, async () => {
    try {
      await sessionsStore.complete(id, s.id)
      triggerToast('Éxito', 'Sesión completada', 'success')
    } catch (e: any) {
      triggerToast('Error', e?.response?.data?.error || 'Error', 'error')
    }
  })
}

async function cancelSession(s: DentalConsultationSession) {
  askConfirm('Cancelar sesión', `¿Cancelar sesión ${s.session_number}?`, async () => {
    try {
      await sessionsStore.cancel(id, s.id)
      triggerToast('Éxito', 'Sesión cancelada. La cita en agenda se actualizará en breve.', 'success')
      await store.loadOne(id)
    } catch (e: any) {
      triggerToast('Error', e?.response?.data?.error || 'Error al cancelar sesión', 'error')
    }
  })
}


async function loadCharge() {
  const charges = (consultation.value as any)?.charges
  if (!charges?.length) { chargeDetail.value = null; return }
  loadingCharge.value = true
  try {
    const res = await dentalChargesService.getById(charges[0].id)
    chargeDetail.value = (res.data as any)?.data ?? res.data
  } catch {
    triggerToast('Error', 'No se pudo cargar la información de pagos', 'error')
  } finally { loadingCharge.value = false }
}

async function saveInstallments() {
  if (!chargeDetail.value) return
  savingInstall.value = true
  installError.value = null
  try {
    await dentalChargesService.createInstallmentPlan(chargeDetail.value.id, {
      installments_count: Number(installForm.value.installments_count),
      first_due_date: installForm.value.first_due_date
    })
    triggerToast('Éxito', 'Plan de cuotas creado', 'success')
    showInstallPanel.value = false
    await loadCharge()
  } catch (e: any) {
    installError.value = e?.response?.data?.error || 'Error al crear cuotas'
  } finally { savingInstall.value = false }
}

async function saveDirectPayment() {
  if (!chargeDetail.value) return
  savingPay.value = true
  payError.value = null
  try {
    await dentalChargesService.registerPayment(chargeDetail.value.id, {
      amount: Number(payForm.value.amount),
      payment_method: payForm.value.payment_method,
      payment_date: new Date().toISOString(),
      notes: payForm.value.notes || undefined
    })
    triggerToast('Éxito', 'Pago registrado', 'success')
    showPayPanel.value = false
    payForm.value = { amount: 0, payment_method: 'cash', notes: '' }
    await store.loadOne(id)
    await loadCharge()
  } catch (e: any) {
    payError.value = e?.response?.data?.error || 'Error al registrar pago'
  } finally { savingPay.value = false }
}

function openInstPayPanel(inst: DentalInstallment) {
  instPayForm.value = {
    installment_id: Number(inst.id),
    amount: Number(inst.amount) - Number(inst.paid_amount),
    payment_method: 'cash'
  }
  instPayError.value = null
  showInstPayPanel.value = true
}

async function saveInstallmentPayment() {
  savingInstPay.value = true
  instPayError.value = null
  try {
    await dentalChargesService.payInstallment(instPayForm.value.installment_id, {
      amount: Number(instPayForm.value.amount),
      payment_method: instPayForm.value.payment_method,
      payment_date: new Date().toISOString()
    })
    triggerToast('Éxito', 'Cuota pagada', 'success')
    showInstPayPanel.value = false
    await store.loadOne(id)
    await loadCharge()
  } catch (e: any) {
    instPayError.value = e?.response?.data?.error || 'Error al pagar cuota'
  } finally { savingInstPay.value = false }
}

async function loadMedicalHistory() {
  const customerId = (consultation.value as any)?.customer_id ?? (consultation.value as any)?.customer?.id
  if (!customerId) return
  medicalHistory.value = await patientStore.fetchMedicalHistory(customerId)
}

async function saveMedHist() {
  const customerId = (consultation.value as any)?.customer_id ?? (consultation.value as any)?.customer?.id
  if (!customerId) return
  savingMedHist.value = true
  medHistError.value = null
  try {
    await patientStore.addMedicalHistory(customerId, { ...medHistForm.value })
    medicalHistory.value = patientStore.medicalHistory
    triggerToast('Éxito', 'Registro médico agregado', 'success')
    showMedHistPanel.value = false
    medHistForm.value = {
      entry_date: new Date().toISOString().slice(0, 10), blood_type: '',
      medical_background: '', allergies: '', current_medications: '',
      chronic_conditions: '', dental_observations: '', notes: ''
    }
  } catch (e: any) {
    medHistError.value = e?.response?.data?.error || 'Error al guardar registro'
  } finally { savingMedHist.value = false }
}

async function generateCharge() {
  actionLoading.value = true
  try {
    await store.createCharge(id, consultationTreatmentsStore.total)
    await store.loadOne(id)
    await loadCharge()
    triggerToast('Éxito', 'Cargo generado', 'success')
  } catch (e: any) {
    triggerToast('Error', e?.response?.data?.error || 'Error al generar cargo', 'error')
  } finally { actionLoading.value = false }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  await store.loadOne(id)
  await Promise.all([
    consultationTreatmentsStore.load(id),
    sessionsStore.load(id),
    treatmentsStore.load(),
  ])
  const c = consultation.value as any
  if (c) {
    followUpForm.value = {
      requires_follow_up: c.requires_follow_up ?? false,
      requires_multiple_sessions: c.requires_multiple_sessions ?? false,
      estimated_sessions: c.estimated_sessions ?? undefined,
      next_session_date: c.next_session_date ? (c.next_session_date as string).slice(0, 10) : '',
      follow_up_notes: c.follow_up_notes ?? '',
    }
  }
})
</script>

<template>
  <div class="min-h-screen text-white" :style="{ background: 'var(--nexora-glass-bg)' }">

    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <div class="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-md">
      <div class="mx-auto max-w-6xl px-4 py-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <!-- Left: back + title -->
          <div class="flex items-center gap-3">
            <button
              class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-white/50 transition hover:bg-white/10 hover:text-white"
              @click="router.back()"
            >
              <ArrowLeft class="h-4 w-4" />
              Volver
            </button>
            <div>
              <h1 class="text-lg font-semibold leading-tight">
                Consulta &mdash; {{ fmtDate((consultation as any)?.consultation_date) }}
              </h1>
              <p class="text-xs text-white/40">{{ patientName }}</p>
            </div>
          </div>

          <!-- Right: badges + total + status change -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- Clinical status badge -->
            <span
              v-if="consultation?.status"
              class="rounded-full px-3 py-1 text-xs font-medium"
              :class="STATUS_CLASS[consultation.status] ?? 'bg-white/10 text-white/40'"
            >
              {{ STATUS_LABEL[consultation.status] ?? consultation.status }}
            </span>

            <!-- Payment status badge -->
            <span
              v-if="consultation?.administrative_status"
              class="rounded-full px-3 py-1 text-xs font-medium"
              :class="ADMIN_STATUS_CLASS[consultation.administrative_status] ?? 'bg-white/10 text-white/40'"
            >
              {{ ADMIN_STATUS_LABEL[consultation.administrative_status] ?? consultation.administrative_status }}
            </span>

            <!-- Total -->
            <span class="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
              {{ fmtCurrency(consultationTreatmentsStore.total) }}
            </span>

            <!-- Status transition dropdown -->
            <select
              v-if="allowedTransitions.length"
              class="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-white/30"
              value=""
              @change="openStatusChange(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''"
            >
              <option value="" disabled>Cambiar estado</option>
              <option v-for="st in allowedTransitions" :key="st" :value="st">
                {{ STATUS_LABEL[st] ?? st }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tabs ────────────────────────────────────────────────────────────── -->
    <div class="sticky top-[73px] z-10 border-b border-white/10 bg-black/30 backdrop-blur-md">
      <div class="mx-auto max-w-6xl px-4">
        <!-- Mobile: dropdown -->
        <div class="py-2 md:hidden">
          <select
            :value="activeTab"
            @change="selectTab(($event.target as HTMLSelectElement).value as TabKey)"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-[var(--nexora-primary)]"
          >
            <option v-for="tab in tabs" :key="tab.key" :value="tab.key" class="bg-gray-900 text-white">
              {{ tab.label }}
            </option>
          </select>
        </div>
        <!-- Desktop: horizontal tabs -->
        <div class="hidden gap-1 py-2 md:flex">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition"
            :class="activeTab === tab.key
              ? 'bg-[var(--nexora-primary)] text-white'
              : 'text-white/50 hover:bg-white/5 hover:text-white'"
            @click="selectTab(tab.key)"
          >
            <component :is="tab.icon" class="h-4 w-4" />
            {{ tab.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Tab content ─────────────────────────────────────────────────────── -->
    <div class="mx-auto max-w-6xl px-4 py-6">

      <!-- ═══════════ TAB: RESUMEN ═══════════ -->
      <ConsultationSummaryTab
        v-if="activeTab === 'summary'"
        :consultation="consultation"
        :patient-name="patientName"
        :treatments="consultationTreatmentsStore.items ?? []"
        :total="consultationTreatmentsStore.total"
        :charge-detail="chargeDetail"
        :status-class="STATUS_CLASS"
        :status-label="STATUS_LABEL"
        :admin-status-class="ADMIN_STATUS_CLASS"
        :admin-status-label="ADMIN_STATUS_LABEL"
        :fmt-date="fmtDate"
        :fmt-currency="fmtCurrency"
        @edit-info="openEdit"
      />

      <!-- ═══════════ TAB: TRATAMIENTO ═══════════ -->
      <ConsultationTreatmentsTab
        v-else-if="activeTab === 'treatments'"
        :active-services="activeServices"
        :voided-services="voidedServices"
        :total="consultationTreatmentsStore.total"
        :has-closed-payments="hasClosedPayments"
        :consultation="consultation"
        v-model:follow-up-form="followUpForm"
        v-model:session-schedule-dates="sessionScheduleDates"
        :sessions-count="(sessionsStore.items ?? []).length"
        :scheduling-sessions="schedulingSessions"
        :saving-follow-up="savingFollowUp"
        :fmt-currency="fmtCurrency"
        @add-service="showAddServicePanel = true"
        @void-service="voidService"
        @save-follow-up="saveFollowUp"
        @schedule-sessions="scheduleAllSessions"
      />

      <!-- ═══════════ TAB: SESIONES ═══════════ -->
      <ConsultationSessionsTab
        v-else-if="activeTab === 'sessions'"
        :consultation="consultation"
        :sessions="sessionsStore.items"
        :status-class="STATUS_CLASS"
        :status-label="STATUS_LABEL"
        :editing-session-id="editingSessionId"
        v-model:edit-session-date="editSessionDate"
        :saving-edit-session="savingEditSession"
        :fmt-date="fmtDate"
        :fmt-date-time="fmtDateTime"
        @new-session="showSessionPanel = true"
        @start-edit-session="startEditSession"
        @save-edit-session="saveEditSession"
        @cancel-edit-session="cancelEditSession"
        @complete-session="completeSession"
        @cancel-session="cancelSession"
      />

      <div v-else-if="activeTab === 'photos'">
        <WidgetsDentalPhotoGallery :consultationId="id" />
      </div>

      <!-- ═══════════ TAB: ADJUNTOS ═══════════ -->
      <div v-else-if="activeTab === 'attachments'">
        <ConsultationAttachmentsTab :consultationId="Number(id)" />
      </div>

      <!-- ═══════════ TAB: DOCUMENTOS ═══════════ -->
      <div v-else-if="activeTab === 'documents'">
        <ConsultationDocumentsSection
          :consultation-id="Number(id)"
          :customer-id="Number(consultation?.customer_id ?? 0)"
          :read-only="consultation?.status === 'voided' || consultation?.status === 'cancelled'"
        />
      </div>

      <!-- ═══════════ TAB: HISTORIA ═══════════ -->
      <ConsultationHistoryTab
        v-else-if="activeTab === 'history'"
        :consultation="consultation"
        :medical-history="medicalHistory"
        :fmt-date="fmtDate"
        @add-record="showMedHistPanel = true"
      />

      <!-- ═══════════ TAB: PAGOS ═══════════ -->
      <ConsultationPaymentsTab
        v-else-if="activeTab === 'payments'"
        :consultation="consultation"
        :charge-detail="chargeDetail"
        :loading-charge="loadingCharge"
        :can-create-charge="canCreateCharge"
        :action-loading="actionLoading"
        :total="consultationTreatmentsStore.total"
        :admin-status-class="ADMIN_STATUS_CLASS"
        :admin-status-label="ADMIN_STATUS_LABEL"
        :payment-method-label="PAYMENT_METHOD_LABEL"
        :fmt-currency="fmtCurrency"
        :fmt-date="fmtDate"
        :fmt-date-time="fmtDateTime"
        @generate-charge="generateCharge"
        @show-installments="showInstallPanel = true"
        @register-payment="(amount) => { payForm.amount = amount; showPayPanel = true }"
        @pay-installment="openInstPayPanel"
      />

    </div>

    <!-- ═══════════ PANELS ═══════════ -->

    <!-- 1. Edit clinical info -->
    <NxrSlidePanel :open="editOpen" title="Editar información clínica" @close="editOpen = false">
      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Motivo de consulta</label>
          <textarea
            v-model="editForm.reason"
            rows="3"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Diagnóstico</label>
          <textarea
            v-model="editForm.diagnosis"
            rows="3"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Notas clínicas</label>
          <textarea
            v-model="editForm.clinical_notes"
            rows="3"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Indicaciones</label>
          <textarea
            v-model="editForm.indications"
            rows="3"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <button
          class="w-full rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary"
          @click="saveEdit"
        >
          Guardar cambios
        </button>
      </div>
    </NxrSlidePanel>

    <!-- 2. Change status -->
    <NxrSlidePanel :open="showStatusPanel" title="Cambiar estado de la consulta" @close="showStatusPanel = false">
      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Nuevo estado</label>
          <select
            v-model="targetStatus"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          >
            <option v-for="st in allowedTransitions" :key="st" :value="st">
              {{ STATUS_LABEL[st] ?? st }}
            </option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">
            Motivo
            <span v-if="targetStatus === 'voided'" class="text-red-400">*</span>
          </label>
          <textarea
            v-model="statusReason"
            rows="3"
            :placeholder="targetStatus === 'voided' ? 'Motivo de anulación (requerido)' : 'Motivo opcional...'"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <button
          class="w-full rounded-xl py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          :style="{ background: 'var(--nexora-primary)' }"
          :disabled="changingStatus || (targetStatus === 'voided' && !statusReason.trim())"
          @click="confirmStatusChange"
        >
          {{ changingStatus ? 'Cambiando...' : 'Confirmar cambio' }}
        </button>
      </div>
    </NxrSlidePanel>

    <!-- 3. Add service -->
    <NxrSlidePanel :open="showAddServicePanel" title="Agregar servicio" @close="showAddServicePanel = false">
      <div class="space-y-4">
        <!-- Warning: consultation already has payments -->
        <div
          v-if="(consultation as any)?.administrative_status && !['unpaid', 'cancelled'].includes((consultation as any).administrative_status)"
          class="flex gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3"
        >
          <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
          <div class="text-xs text-yellow-300">
            <p class="font-semibold">Esta consulta ya tiene pagos registrados.</p>
            <p class="mt-1 text-yellow-300/70">Agregar un servicio modificará el total. Si existen cuotas, deberás recalcularlas manualmente desde el tab de Pagos.</p>
          </div>
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Tratamiento</label>
          <select
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            @change="onServiceSelect(($event.target as HTMLSelectElement).value); addServiceForm.treatment_id = ($event.target as HTMLSelectElement).value as any"
          >
            <option value="">Seleccioná un tratamiento...</option>
            <option v-for="svc in treatmentsStore.items" :key="svc.id" :value="svc.id">
              {{ svc.name }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="mb-1.5 block text-xs text-white/50">Precio unitario</label>
            <input
              v-model.number="addServiceForm.unit_price"
              type="number"
              min="0"
              step="0.01"
              class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-xs text-white/50">Cantidad</label>
            <input
              v-model.number="addServiceForm.quantity"
              type="number"
              min="1"
              class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </div>
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Referencia de diente</label>
          <input
            v-model="addServiceForm.tooth_reference"
            type="text"
            placeholder="Ej: 21, 22..."
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Notas clínicas</label>
          <textarea
            v-model="addServiceForm.clinical_notes"
            rows="2"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <p v-if="addServiceError" class="text-xs text-red-400">{{ addServiceError }}</p>
        <button
          class="w-full rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary disabled:opacity-50"
          :disabled="savingService"
          @click="addService"
        >
          {{ savingService ? 'Agregando...' : 'Agregar servicio' }}
        </button>
      </div>
    </NxrSlidePanel>

    <!-- 4. New session -->
    <NxrSlidePanel :open="showSessionPanel" title="Nueva sesión" @close="showSessionPanel = false">
      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Fecha y hora de sesión</label>
          <input
            v-model="sessionForm.session_date"
            type="datetime-local"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Notas</label>
          <textarea
            v-model="sessionForm.notes"
            rows="3"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Evolución</label>
          <textarea
            v-model="sessionForm.evolution"
            rows="3"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Fecha próxima sesión</label>
          <input
            v-model="sessionForm.next_session_date"
            type="date"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <p v-if="sessionError" class="text-xs text-red-400">{{ sessionError }}</p>
        <button
          class="w-full rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary disabled:opacity-50"
          :disabled="savingSession"
          @click="createSession"
        >
          {{ savingSession ? 'Guardando...' : 'Crear sesión' }}
        </button>
      </div>
    </NxrSlidePanel>

    <!-- 5. Installment plan -->
    <NxrSlidePanel :open="showInstallPanel" title="Plan de cuotas" @close="showInstallPanel = false">
      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Cantidad de cuotas</label>
          <input
            v-model.number="installForm.installments_count"
            type="number"
            min="2"
            max="48"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Fecha del primer vencimiento</label>
          <input
            v-model="installForm.first_due_date"
            type="date"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div v-if="chargeDetail" class="rounded-xl bg-white/5 p-3 text-center">
          <p class="text-xs text-white/40">Monto por cuota aprox.</p>
          <p class="text-lg font-bold">
            {{ fmtCurrency(Number(chargeDetail.total_amount) / installForm.installments_count) }}
          </p>
        </div>
        <p v-if="installError" class="text-xs text-red-400">{{ installError }}</p>
        <button
          class="w-full rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary disabled:opacity-50"
          :disabled="savingInstall"
          @click="saveInstallments"
        >
          {{ savingInstall ? 'Creando...' : 'Crear plan de cuotas' }}
        </button>
      </div>
    </NxrSlidePanel>

    <!-- 6. Direct payment -->
    <NxrSlidePanel :open="showPayPanel" title="Registrar pago" @close="showPayPanel = false">
      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Monto</label>
          <input
            v-model.number="payForm.amount"
            type="number"
            min="0"
            step="0.01"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Método de pago</label>
          <select
            v-model="payForm.payment_method"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          >
            <option v-for="(label, key) in PAYMENT_METHOD_LABEL" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Notas</label>
          <input
            v-model="payForm.notes"
            type="text"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <p v-if="payError" class="text-xs text-red-400">{{ payError }}</p>
        <button
          class="w-full rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary disabled:opacity-50"
          :disabled="savingPay || !payForm.amount"
          @click="saveDirectPayment"
        >
          {{ savingPay ? 'Registrando...' : 'Registrar pago' }}
        </button>
      </div>
    </NxrSlidePanel>

    <!-- 7. Installment payment -->
    <NxrSlidePanel :open="showInstPayPanel" title="Pagar cuota" @close="showInstPayPanel = false">
      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Monto a pagar</label>
          <input
            v-model.number="instPayForm.amount"
            type="number"
            min="0"
            step="0.01"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Método de pago</label>
          <select
            v-model="instPayForm.payment_method"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          >
            <option v-for="(label, key) in PAYMENT_METHOD_LABEL" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <p v-if="instPayError" class="text-xs text-red-400">{{ instPayError }}</p>
        <button
          class="w-full rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary disabled:opacity-50"
          :disabled="savingInstPay || !instPayForm.amount"
          @click="saveInstallmentPayment"
        >
          {{ savingInstPay ? 'Procesando...' : 'Pagar cuota' }}
        </button>
      </div>
    </NxrSlidePanel>

    <!-- 8. Medical history -->
    <NxrSlidePanel :open="showMedHistPanel" title="Agregar registro médico" @close="showMedHistPanel = false">
      <div class="space-y-4">
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Fecha del registro</label>
          <input
            v-model="medHistForm.entry_date"
            type="date"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Grupo sanguíneo</label>
          <input
            v-model="medHistForm.blood_type"
            type="text"
            placeholder="Ej: A+, O-, AB+"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Antecedentes médicos</label>
          <textarea
            v-model="medHistForm.medical_background"
            rows="2"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Alergias</label>
          <textarea
            v-model="medHistForm.allergies"
            rows="2"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Medicamentos actuales</label>
          <textarea
            v-model="medHistForm.current_medications"
            rows="2"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Condiciones crónicas</label>
          <textarea
            v-model="medHistForm.chronic_conditions"
            rows="2"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Observaciones dentales</label>
          <textarea
            v-model="medHistForm.dental_observations"
            rows="2"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Notas adicionales</label>
          <textarea
            v-model="medHistForm.notes"
            rows="2"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <p v-if="medHistError" class="text-xs text-red-400">{{ medHistError }}</p>
        <button
          class="w-full rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary disabled:opacity-50"
          :disabled="savingMedHist"
          @click="saveMedHist"
        >
          {{ savingMedHist ? 'Guardando...' : 'Guardar registro' }}
        </button>
      </div>
    </NxrSlidePanel>

    <!-- ═══════════ TOASTS + CONFIRM ═══════════ -->
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
      <AppToast v-for="t in toasts" :key="t.id" :toast="t" @close="removeToast" />
    </div>

    <ConfirmActionModal
      :isOpen="confirmModal.open"
      :title="confirmModal.title"
      :message="confirmModal.message"
      variant="danger"
      confirmText="Confirmar"
      cancelText="Cancelar"
      @confirmed="() => { confirmModal.open = false; confirmModal.onConfirm(); }"
      @cancelled="confirmModal.open = false"
    />

  </div>
</template>
