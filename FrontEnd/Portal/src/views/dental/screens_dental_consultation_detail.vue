<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, CheckCircle2, CreditCard, Edit2, Plus, Trash2,
  Stethoscope, Calendar, ClipboardList, DollarSign, Camera, BookOpen, AlertCircle
} from 'lucide-vue-next'
import { useDentalConsultationsStore } from '../../stores/dentalConsultations'
import { useDentalPatientsStore } from '../../stores/dentalPatients'
import { useDentalConsultationServicesStore } from '../../stores/dentalConsultationServices'
import { useDentalConsultationSessionsStore } from '../../stores/dentalConsultationSessions'
import { useDentalServicesStore } from '../../stores/dentalServices'
import { dentalChargesService } from '../../services/dentalChargesService'
import NxrSlidePanel from '../../components/NxrSlidePanel.vue'
import AppToast from '../../components/AppToast.vue'
import ConfirmActionModal from '../../components/admin/ConfirmActionModal.vue'
import WidgetsDentalPhotoGallery from '../../components/widgets_dental_photo_gallery.vue'
import { useToast } from '../../composables/useToast'
import type {
  DentalCharge, DentalInstallment, DentalMedicalHistory,
  DentalConsultationService, DentalConsultationSession,
  DentalConsultationServiceFormData, DentalConsultationSessionFormData
} from '../../types/dental'

// ── Route / Router ────────────────────────────────────────────────────────────
const route  = useRoute()
const router = useRouter()
const id     = route.params.id as string
const { toasts, triggerToast, removeToast } = useToast()

// ── Stores ────────────────────────────────────────────────────────────────────
const store                    = useDentalConsultationsStore()
const patientStore             = useDentalPatientsStore()
const consultationServicesStore = useDentalConsultationServicesStore()
const sessionsStore            = useDentalConsultationSessionsStore()
const servicesStore            = useDentalServicesStore()

const consultation = computed(() => store.current)

// ── Tabs ──────────────────────────────────────────────────────────────────────
type TabKey = 'summary' | 'treatments' | 'sessions' | 'photos' | 'history' | 'payments'
const activeTab = ref<TabKey>('summary')

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: 'summary',    label: 'Resumen',     icon: ClipboardList },
  { key: 'treatments', label: 'Tratamiento', icon: Stethoscope   },
  { key: 'sessions',   label: 'Sesiones',    icon: Calendar       },
  { key: 'photos',     label: 'Fotos',       icon: Camera         },
  { key: 'history',    label: 'Historia',    icon: BookOpen       },
  { key: 'payments',   label: 'Pagos',       icon: DollarSign     },
]

function selectTab(key: TabKey) {
  activeTab.value = key
  if (key === 'payments') loadCharge()
  if (key === 'history')  loadMedicalHistory()
}

// ── Status maps ───────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  draft:        'Borrador',
  created:      'Creada',
  in_progress:  'En curso',
  in_treatment: 'En tratamiento',
  completed:    'Completada',
  cancelled:    'Cancelada',
  no_show:      'No asistió',
  voided:       'Anulada',
}
const STATUS_CLASS: Record<string, string> = {
  draft:        'bg-white/10 text-white/40',
  created:      'bg-purple-500/20 text-purple-400',
  in_progress:  'bg-cyan-500/20 text-cyan-400',
  in_treatment: 'bg-indigo-500/20 text-indigo-400',
  completed:    'bg-green-500/20 text-green-400',
  cancelled:    'bg-red-500/20 text-red-400',
  no_show:      'bg-orange-500/20 text-orange-400',
  voided:       'bg-red-900/30 text-red-300',
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
  draft:        ['created', 'cancelled'],
  created:      ['in_progress', 'cancelled'],
  in_progress:  ['in_treatment', 'completed', 'cancelled'],
  in_treatment: ['completed', 'in_progress'],
  completed:    ['voided'],
  cancelled:    [],
  no_show:      [],
  voided:       [],
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

// Add service
const showAddServicePanel  = ref(false)
const addServiceForm       = ref<DentalConsultationServiceFormData>({
  service_id: null, service_name_snapshot: '', unit_price: 0,
  quantity: 1, tooth_reference: '', clinical_notes: ''
})
const savingService        = ref(false)
const addServiceError      = ref<string | null>(null)
const selectedServiceForAdd = ref<any>(null)

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
  consultationServicesStore.total > 0 &&
  !chargeDetail.value
)

const activeServices = computed(() =>
  (consultationServicesStore.items as DentalConsultationService[]).filter(s => s.status !== 'voided')
)
const voidedServices = computed(() =>
  (consultationServicesStore.items as DentalConsultationService[]).filter(s => s.status === 'voided')
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

function onServiceSelect(serviceId: string | number) {
  const svc = servicesStore.items.find(s => String(s.id) === String(serviceId))
  selectedServiceForAdd.value = svc || null
  if (svc) {
    addServiceForm.value.service_name_snapshot = svc.name
    addServiceForm.value.unit_price = parseFloat(svc.final_price as any) || 0
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
    await consultationServicesStore.add(id, addServiceForm.value)
    triggerToast('Éxito', 'Servicio agregado', 'success')
    showAddServicePanel.value = false
    addServiceForm.value = { service_id: null, service_name_snapshot: '', unit_price: 0, quantity: 1, tooth_reference: '', clinical_notes: '' }
    selectedServiceForAdd.value = null
  } catch (e: any) {
    addServiceError.value = e?.response?.data?.error || 'Error al agregar servicio'
  } finally {
    savingService.value = false
  }
}

async function voidService(s: DentalConsultationService) {
  askConfirm('Anular servicio', `¿Anular "${s.service_name_snapshot}"?`, async () => {
    try {
      await consultationServicesStore.voidService(id, s.id)
      triggerToast('Éxito', 'Servicio anulado', 'success')
    } catch (e: any) {
      triggerToast('Error', e?.response?.data?.error || 'Error al anular servicio', 'error')
    }
  })
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
    triggerToast('Éxito', 'Sesión creada', 'success')
    showSessionPanel.value = false
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

async function loadCharge() {
  const charges = (consultation.value as any)?.charges
  if (!charges?.length) { chargeDetail.value = null; return }
  loadingCharge.value = true
  try {
    const res = await dentalChargesService.getById(charges[0].id)
    chargeDetail.value = (res.data as any)?.data ?? res.data
  } catch { } finally { loadingCharge.value = false }
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
    await store.createCharge(id, consultationServicesStore.total)
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
    consultationServicesStore.load(id),
    sessionsStore.load(id),
    servicesStore.load(),
  ])
  const c = consultation.value as any
  if (c) {
    followUpForm.value = {
      requires_follow_up: c.requires_follow_up ?? false,
      requires_multiple_sessions: c.requires_multiple_sessions ?? false,
      estimated_sessions: c.estimated_sessions ?? undefined,
      next_session_date: c.next_session_date ?? '',
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
              {{ fmtCurrency(consultationServicesStore.total) }}
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
      <div class="mx-auto max-w-6xl overflow-x-auto px-4">
        <div class="flex gap-1 py-2">
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
      <div v-if="activeTab === 'summary'" class="space-y-5">

        <!-- Patient + status card -->
        <div class="rounded-xl border border-white/10 bg-white/5 p-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-white/70">Información de la consulta</h2>
            <button
              class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition"
              :style="{ background: 'var(--nexora-primary)' }"
              @click="openEdit"
            >
              <Edit2 class="h-3.5 w-3.5" />
              Editar información
            </button>
          </div>

          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p class="mb-0.5 text-xs text-white/40">Paciente</p>
              <router-link
                :to="`/dental/patients/${(consultation as any)?.customer_id ?? (consultation as any)?.customer?.id}`"
                class="text-sm font-medium text-[var(--nexora-primary)] hover:underline"
              >
                {{ patientName }}
              </router-link>
            </div>
            <div>
              <p class="mb-0.5 text-xs text-white/40">Fecha de consulta</p>
              <p class="text-sm">{{ fmtDate((consultation as any)?.consultation_date) }}</p>
            </div>
            <div>
              <p class="mb-0.5 text-xs text-white/40">Estado clínico</p>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="STATUS_CLASS[consultation?.status ?? ''] ?? 'bg-white/10 text-white/40'"
              >
                {{ STATUS_LABEL[consultation?.status ?? ''] ?? '—' }}
              </span>
            </div>
            <div>
              <p class="mb-0.5 text-xs text-white/40">Estado de pago</p>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="ADMIN_STATUS_CLASS[consultation?.administrative_status ?? ''] ?? 'bg-white/10 text-white/40'"
              >
                {{ ADMIN_STATUS_LABEL[consultation?.administrative_status ?? ''] ?? '—' }}
              </span>
            </div>
          </div>

          <!-- Clinical fields -->
          <div v-if="(consultation as any)?.reason || (consultation as any)?.diagnosis" class="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
            <div v-if="(consultation as any)?.reason">
              <p class="mb-0.5 text-xs text-white/40">Motivo de consulta</p>
              <p class="text-sm leading-relaxed text-white/80">{{ (consultation as any).reason }}</p>
            </div>
            <div v-if="(consultation as any)?.diagnosis">
              <p class="mb-0.5 text-xs text-white/40">Diagnóstico</p>
              <p class="text-sm leading-relaxed text-white/80">{{ (consultation as any).diagnosis }}</p>
            </div>
            <div v-if="(consultation as any)?.clinical_notes" class="sm:col-span-2">
              <p class="mb-0.5 text-xs text-white/40">Notas clínicas</p>
              <p class="text-sm leading-relaxed text-white/80">{{ (consultation as any).clinical_notes }}</p>
            </div>
            <div v-if="(consultation as any)?.indications" class="sm:col-span-2">
              <p class="mb-0.5 text-xs text-white/40">Indicaciones</p>
              <p class="text-sm leading-relaxed text-white/80">{{ (consultation as any).indications }}</p>
            </div>
          </div>
        </div>

        <!-- Financial summary -->
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-xl border border-white/10 bg-white/5 p-4">
            <p class="mb-1 text-xs text-white/40">Total servicios</p>
            <p class="text-2xl font-bold">{{ fmtCurrency(consultationServicesStore.total) }}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-white/5 p-4">
            <p class="mb-1 text-xs text-white/40">Total pagado</p>
            <p class="text-2xl font-bold text-green-400">{{ fmtCurrency(chargeDetail?.paid_amount ?? 0) }}</p>
          </div>
          <div class="rounded-xl border border-white/10 bg-white/5 p-4">
            <p class="mb-1 text-xs text-white/40">Saldo pendiente</p>
            <p class="text-2xl font-bold text-yellow-400">
              {{ fmtCurrency(consultationServicesStore.total - Number(chargeDetail?.paid_amount ?? 0)) }}
            </p>
          </div>
        </div>

        <!-- Follow-up indicators -->
        <div
          v-if="(consultation as any)?.requires_follow_up || (consultation as any)?.requires_multiple_sessions"
          class="flex flex-wrap gap-2"
        >
          <span
            v-if="(consultation as any)?.requires_follow_up"
            class="flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-300"
          >
            <CheckCircle2 class="h-3.5 w-3.5" /> Requiere seguimiento
          </span>
          <span
            v-if="(consultation as any)?.requires_multiple_sessions"
            class="flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-300"
          >
            <Calendar class="h-3.5 w-3.5" />
            Múltiples sesiones
            <template v-if="(consultation as any)?.estimated_sessions">
              ({{ (consultation as any).estimated_sessions }} est.)
            </template>
          </span>
          <span
            v-if="(consultation as any)?.next_session_date"
            class="flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-300"
          >
            <Calendar class="h-3.5 w-3.5" />
            Próxima sesión: {{ fmtDate((consultation as any).next_session_date) }}
          </span>
        </div>

        <!-- Services summary -->
        <div class="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 class="mb-4 text-sm font-semibold text-white/70">Servicios aplicados</h2>
          <div v-if="!consultationServicesStore.items.length" class="py-6 text-center text-sm text-white/30">
            Sin servicios registrados
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="svc in consultationServicesStore.items"
              :key="svc.id"
              class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-2.5"
              :class="{ 'opacity-40': svc.status === 'voided' }"
            >
              <div class="flex items-center gap-3">
                <span class="text-sm">{{ svc.service_name_snapshot }}</span>
                <span v-if="svc.tooth_reference" class="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/50">
                  Diente {{ svc.tooth_reference }}
                </span>
                <span v-if="svc.status === 'voided'" class="rounded-full bg-red-900/30 px-2 py-0.5 text-xs text-red-300">
                  Anulado
                </span>
              </div>
              <span class="text-sm font-medium">
                {{ fmtCurrency(Number(svc.unit_price) * Number(svc.quantity)) }}
              </span>
            </div>
            <div class="flex justify-end border-t border-white/10 pt-2">
              <span class="text-sm font-semibold">Total: {{ fmtCurrency(consultationServicesStore.total) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════ TAB: TRATAMIENTO ═══════════ -->
      <div v-else-if="activeTab === 'treatments'" class="space-y-6">

        <!-- Services section -->
        <div class="rounded-xl border border-white/10 bg-white/5 p-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-white/70">Servicios aplicados</h2>
            <button
              class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition hover:opacity-90"
              :style="{ background: 'var(--nexora-primary)' }"
              @click="showAddServicePanel = true"
            >
              <Plus class="h-3.5 w-3.5" />
              Agregar servicio
            </button>
          </div>

          <div v-if="!consultationServicesStore.items.length" class="py-8 text-center text-sm text-white/30">
            Sin servicios registrados
          </div>

          <div v-else>
            <!-- Table header -->
            <div class="mb-2 hidden grid-cols-6 gap-3 px-2 text-xs text-white/30 sm:grid">
              <span class="col-span-2">Servicio</span>
              <span>Diente</span>
              <span class="text-right">Cant.</span>
              <span class="text-right">Precio unit.</span>
              <span class="text-right">Subtotal</span>
            </div>

            <!-- Active services -->
            <div class="space-y-1.5">
              <div
                v-for="svc in activeServices"
                :key="svc.id"
                class="grid grid-cols-2 gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 sm:grid-cols-6"
              >
                <span class="col-span-2 text-sm sm:col-span-2">{{ svc.service_name_snapshot }}</span>
                <span class="text-sm text-white/50 sm:col-span-1">{{ svc.tooth_reference || '—' }}</span>
                <span class="text-right text-sm sm:col-span-1">{{ svc.quantity }}</span>
                <span class="text-right text-sm sm:col-span-1">{{ fmtCurrency(svc.unit_price) }}</span>
                <div class="flex items-center justify-end gap-2 sm:col-span-1">
                  <span class="text-sm font-medium">{{ fmtCurrency(Number(svc.unit_price) * Number(svc.quantity)) }}</span>
                  <button
                    v-if="!hasClosedPayments"
                    class="rounded p-1 text-white/30 transition hover:bg-red-500/20 hover:text-red-400"
                    title="Anular servicio"
                    @click="voidService(svc)"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Voided services -->
            <div v-if="voidedServices.length" class="mt-3 space-y-1.5 opacity-40">
              <p class="px-2 text-xs text-white/30">Anulados</p>
              <div
                v-for="svc in voidedServices"
                :key="svc.id"
                class="grid grid-cols-2 gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 line-through sm:grid-cols-6"
              >
                <span class="col-span-2 text-sm sm:col-span-2">{{ svc.service_name_snapshot }}</span>
                <span class="text-sm sm:col-span-1">{{ svc.tooth_reference || '—' }}</span>
                <span class="text-right text-sm sm:col-span-1">{{ svc.quantity }}</span>
                <span class="text-right text-sm sm:col-span-1">{{ fmtCurrency(svc.unit_price) }}</span>
                <span class="text-right text-sm sm:col-span-1">{{ fmtCurrency(Number(svc.unit_price) * Number(svc.quantity)) }}</span>
              </div>
            </div>

            <!-- Total -->
            <div class="mt-3 flex justify-end border-t border-white/10 pt-3">
              <span class="text-base font-semibold">Total: {{ fmtCurrency(consultationServicesStore.total) }}</span>
            </div>
          </div>
        </div>

        <!-- Follow-up section -->
        <div class="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 class="mb-4 text-sm font-semibold text-white/70">Seguimiento del tratamiento</h2>

          <div class="space-y-4">
            <label class="flex cursor-pointer items-center gap-3">
              <input
                v-model="followUpForm.requires_follow_up"
                type="checkbox"
                class="h-4 w-4 rounded border-white/20 accent-[var(--nexora-primary)]"
              />
              <span class="text-sm">Requiere seguimiento</span>
            </label>

            <label class="flex cursor-pointer items-center gap-3">
              <input
                v-model="followUpForm.requires_multiple_sessions"
                type="checkbox"
                class="h-4 w-4 rounded border-white/20 accent-[var(--nexora-primary)]"
              />
              <span class="text-sm">Requiere múltiples sesiones</span>
            </label>

            <div v-if="followUpForm.requires_multiple_sessions" class="grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-xs text-white/50">Sesiones estimadas</label>
                <input
                  v-model.number="followUpForm.estimated_sessions"
                  type="number"
                  min="1"
                  class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs text-white/50">Fecha próxima sesión</label>
                <input
                  v-model="followUpForm.next_session_date"
                  type="date"
                  class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div v-if="followUpForm.requires_follow_up" :class="{ 'border-t border-white/10 pt-4': !followUpForm.requires_multiple_sessions }">
              <label class="mb-1.5 block text-xs text-white/50">Notas de seguimiento</label>
              <textarea
                v-model="followUpForm.follow_up_notes"
                rows="3"
                class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                placeholder="Indicaciones para el seguimiento..."
              />
            </div>

            <div class="flex justify-end pt-2">
              <button
                class="rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                :style="{ background: 'var(--nexora-primary)' }"
                :disabled="savingFollowUp"
                @click="saveFollowUp"
              >
                {{ savingFollowUp ? 'Guardando...' : 'Guardar seguimiento' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════ TAB: SESIONES ═══════════ -->
      <div v-else-if="activeTab === 'sessions'" class="space-y-4">

        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-white/70">Sesiones de tratamiento</h2>
          <button
            v-if="(consultation as any)?.requires_multiple_sessions"
            class="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            :style="{ background: 'var(--nexora-primary)' }"
            @click="showSessionPanel = true"
          >
            <Plus class="h-4 w-4" />
            Nueva sesión
          </button>
        </div>

        <!-- No multiple sessions configured -->
        <div
          v-if="!(consultation as any)?.requires_multiple_sessions"
          class="rounded-xl border border-white/10 bg-white/5 p-10 text-center"
        >
          <AlertCircle class="mx-auto mb-3 h-8 w-8 text-white/20" />
          <p class="text-sm text-white/40">Esta consulta no tiene sesiones múltiples configuradas.</p>
          <p class="mt-1 text-xs text-white/30">Activá la opción en la pestaña Tratamiento.</p>
        </div>

        <!-- Empty sessions -->
        <div
          v-else-if="!sessionsStore.items.length"
          class="rounded-xl border border-white/10 bg-white/5 p-10 text-center"
        >
          <Calendar class="mx-auto mb-3 h-8 w-8 text-white/20" />
          <p class="text-sm text-white/40">No hay sesiones registradas aún.</p>
        </div>

        <!-- Sessions list -->
        <div v-else class="space-y-3">
          <div
            v-for="session in sessionsStore.items"
            :key="session.id"
            class="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold">Sesión #{{ session.session_number }}</span>
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="STATUS_CLASS[session.status ?? ''] ?? 'bg-white/10 text-white/40'"
                  >
                    {{ STATUS_LABEL[session.status ?? ''] ?? session.status }}
                  </span>
                  <span class="text-xs text-white/40">{{ fmtDateTime(session.session_date) }}</span>
                </div>
                <p v-if="session.notes" class="line-clamp-2 text-sm text-white/60">{{ session.notes }}</p>
                <p v-if="session.next_session_date" class="mt-1 text-xs text-white/40">
                  Próxima: {{ fmtDate(session.next_session_date) }}
                </p>
              </div>
              <button
                v-if="!['completed', 'cancelled'].includes(session.status ?? '')"
                class="shrink-0 flex items-center gap-1 rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-500/30"
                @click="completeSession(session)"
              >
                <CheckCircle2 class="h-3.5 w-3.5" />
                Completar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════ TAB: FOTOS ═══════════ -->
      <div v-else-if="activeTab === 'photos'">
        <WidgetsDentalPhotoGallery :consultationId="id" />
      </div>

      <!-- ═══════════ TAB: HISTORIA ═══════════ -->
      <div v-else-if="activeTab === 'history'" class="space-y-4">

        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-white/70">Historia clínica del paciente</h2>
          <div class="flex items-center gap-2">
            <router-link
              :to="`/dental/patients/${(consultation as any)?.customer_id ?? (consultation as any)?.customer?.id}`"
              class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
            >
              Ver historial completo
            </router-link>
            <button
              class="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              :style="{ background: 'var(--nexora-primary)' }"
              @click="showMedHistPanel = true"
            >
              <Plus class="h-4 w-4" />
              Agregar registro
            </button>
          </div>
        </div>

        <div v-if="!medicalHistory.length" class="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
          <BookOpen class="mx-auto mb-3 h-8 w-8 text-white/20" />
          <p class="text-sm text-white/40">Sin registros médicos cargados.</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="entry in medicalHistory"
            :key="entry.id"
            class="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div class="mb-3 flex items-center justify-between">
              <span class="text-xs text-white/40">{{ fmtDate(entry.entry_date) }}</span>
              <span v-if="entry.blood_type" class="rounded bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-300">
                {{ entry.blood_type }}
              </span>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div v-if="entry.allergies">
                <p class="mb-0.5 text-xs text-white/40">Alergias</p>
                <p class="text-sm text-white/80">{{ entry.allergies }}</p>
              </div>
              <div v-if="entry.current_medications">
                <p class="mb-0.5 text-xs text-white/40">Medicamentos actuales</p>
                <p class="text-sm text-white/80">{{ entry.current_medications }}</p>
              </div>
              <div v-if="entry.chronic_conditions">
                <p class="mb-0.5 text-xs text-white/40">Condiciones crónicas</p>
                <p class="text-sm text-white/80">{{ entry.chronic_conditions }}</p>
              </div>
              <div v-if="entry.medical_background">
                <p class="mb-0.5 text-xs text-white/40">Antecedentes</p>
                <p class="text-sm text-white/80">{{ entry.medical_background }}</p>
              </div>
              <div v-if="entry.dental_observations" class="sm:col-span-2">
                <p class="mb-0.5 text-xs text-white/40">Observaciones dentales</p>
                <p class="text-sm text-white/80">{{ entry.dental_observations }}</p>
              </div>
              <div v-if="entry.notes" class="sm:col-span-2">
                <p class="mb-0.5 text-xs text-white/40">Notas</p>
                <p class="text-sm text-white/80">{{ entry.notes }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════ TAB: PAGOS ═══════════ -->
      <div v-else-if="activeTab === 'payments'" class="space-y-5">

        <!-- Loading -->
        <div v-if="loadingCharge" class="py-12 text-center text-sm text-white/40">
          Cargando información de pagos...
        </div>

        <!-- No charge -->
        <div v-else-if="!chargeDetail" class="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
          <CreditCard class="mx-auto mb-4 h-10 w-10 text-white/20" />
          <p class="mb-1 text-sm text-white/50">No hay cargo generado para esta consulta</p>
          <p v-if="!consultationServicesStore.total" class="mb-4 text-xs text-white/30">
            Agregá al menos un servicio en la pestaña Tratamiento para habilitar el cargo.
          </p>
          <p v-else-if="!canCreateCharge" class="mb-4 text-xs text-white/30">
            El cargo ya existe o el estado de pago no lo permite.
          </p>
          <button
            v-if="canCreateCharge"
            class="mx-auto flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            :style="{ background: 'var(--nexora-primary)' }"
            :disabled="actionLoading"
            @click="generateCharge"
          >
            <CreditCard class="h-4 w-4" />
            {{ actionLoading ? 'Generando...' : 'Generar cargo' }}
          </button>
        </div>

        <!-- Charge detail -->
        <template v-else>

          <!-- Summary card -->
          <div class="rounded-xl border border-white/10 bg-white/5 p-5">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-sm font-semibold text-white/70">Resumen del cargo</h2>
              <span
                class="rounded-full px-3 py-1 text-xs font-medium"
                :class="ADMIN_STATUS_CLASS[chargeDetail.administrative_status ?? ''] ?? 'bg-white/10 text-white/40'"
              >
                {{ ADMIN_STATUS_LABEL[chargeDetail.administrative_status ?? ''] ?? chargeDetail.administrative_status }}
              </span>
            </div>
            <div class="grid gap-4 sm:grid-cols-3">
              <div>
                <p class="mb-0.5 text-xs text-white/40">Total</p>
                <p class="text-xl font-bold">{{ fmtCurrency(chargeDetail.total_amount) }}</p>
              </div>
              <div>
                <p class="mb-0.5 text-xs text-white/40">Pagado</p>
                <p class="text-xl font-bold text-green-400">{{ fmtCurrency(chargeDetail.paid_amount) }}</p>
              </div>
              <div>
                <p class="mb-0.5 text-xs text-white/40">Pendiente</p>
                <p class="text-xl font-bold text-yellow-400">
                  {{ fmtCurrency(Number(chargeDetail.total_amount) - Number(chargeDetail.paid_amount)) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Actions row -->
          <div class="flex flex-wrap gap-2">
            <button
              v-if="!(chargeDetail.installments as any)?.length"
              class="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
              @click="showInstallPanel = true"
            >
              <Calendar class="h-4 w-4" />
              Plan de cuotas
            </button>
            <button
              v-if="chargeDetail.administrative_status !== 'paid'"
              class="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              :style="{ background: 'var(--nexora-primary)' }"
              @click="payForm.amount = Number(chargeDetail.total_amount) - Number(chargeDetail.paid_amount); showPayPanel = true"
            >
              <DollarSign class="h-4 w-4" />
              Registrar pago
            </button>
          </div>

          <!-- Installments -->
          <div v-if="(chargeDetail.installments as any)?.length" class="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 class="mb-4 text-sm font-semibold text-white/70">Plan de cuotas</h3>
            <div class="space-y-2">
              <div
                v-for="inst in (chargeDetail.installments as any)"
                :key="inst.id"
                class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3"
              >
                <div class="flex items-center gap-3">
                  <span class="text-sm font-medium">Cuota {{ inst.installment_number }}</span>
                  <span class="text-xs text-white/40">Vence: {{ fmtDate(inst.due_date) }}</span>
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="ADMIN_STATUS_CLASS[inst.status ?? ''] ?? 'bg-white/10 text-white/40'"
                  >
                    {{ ADMIN_STATUS_LABEL[inst.status ?? ''] ?? inst.status }}
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="text-right">
                    <p class="text-sm font-medium">{{ fmtCurrency(inst.amount) }}</p>
                    <p v-if="Number(inst.paid_amount) > 0" class="text-xs text-green-400">
                      Pagado: {{ fmtCurrency(inst.paid_amount) }}
                    </p>
                  </div>
                  <button
                    v-if="inst.status !== 'paid' && inst.status !== 'cancelled'"
                    class="rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-500/30"
                    @click="openInstPayPanel(inst)"
                  >
                    Pagar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment history -->
          <div v-if="(chargeDetail.payments as any)?.length" class="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 class="mb-4 text-sm font-semibold text-white/70">Historial de pagos</h3>
            <div class="space-y-2">
              <div
                v-for="pmt in (chargeDetail.payments as any)"
                :key="pmt.id"
                class="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3"
              >
                <div>
                  <p class="text-sm">{{ PAYMENT_METHOD_LABEL[pmt.payment_method] ?? pmt.payment_method }}</p>
                  <p class="text-xs text-white/40">{{ fmtDateTime(pmt.payment_date) }}</p>
                  <p v-if="pmt.notes" class="mt-0.5 text-xs text-white/40">{{ pmt.notes }}</p>
                </div>
                <span class="text-sm font-semibold text-green-400">{{ fmtCurrency(pmt.amount) }}</span>
              </div>
            </div>
          </div>

        </template>
      </div>

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
          class="w-full rounded-xl py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          :style="{ background: 'var(--nexora-primary)' }"
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
        <div>
          <label class="mb-1.5 block text-xs text-white/50">Servicio</label>
          <select
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            @change="onServiceSelect(($event.target as HTMLSelectElement).value); addServiceForm.service_id = ($event.target as HTMLSelectElement).value as any"
          >
            <option value="">Seleccioná un servicio...</option>
            <option v-for="svc in servicesStore.items" :key="svc.id" :value="svc.id">
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
          class="w-full rounded-xl py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          :style="{ background: 'var(--nexora-primary)' }"
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
          class="w-full rounded-xl py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          :style="{ background: 'var(--nexora-primary)' }"
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
          class="w-full rounded-xl py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          :style="{ background: 'var(--nexora-primary)' }"
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
          class="w-full rounded-xl py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          :style="{ background: 'var(--nexora-primary)' }"
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
          class="w-full rounded-xl py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          :style="{ background: 'var(--nexora-primary)' }"
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
          class="w-full rounded-xl py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          :style="{ background: 'var(--nexora-primary)' }"
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
