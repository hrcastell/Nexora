<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CheckCircle2, XCircle, CreditCard, Edit2, Plus, RefreshCw } from 'lucide-vue-next'
import { useDentalConsultationsStore } from '../../stores/dentalConsultations'
import { useDentalPatientsStore } from '../../stores/dentalPatients'
import { dentalChargesService } from '../../services/dentalChargesService'
import NxrSlidePanel from '../../components/NxrSlidePanel.vue'
import WidgetsDentalPhotoGallery from '../../components/widgets_dental_photo_gallery.vue'
import type { DentalCharge, DentalInstallment, DentalMedicalHistory } from '../../types/dental'

// ── Route / Store ─────────────────────────────────────────────────────────────
const route  = useRoute()
const router = useRouter()
const store  = useDentalConsultationsStore()
const patientStore = useDentalPatientsStore()
const id     = route.params.id as string

// ── Status maps ───────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  draft:       'Borrador',
  scheduled:   'Programada',
  in_progress: 'En curso',
  completed:   'Completada',
  cancelled:   'Cancelada',
  no_show:     'No asistió',
}
const STATUS_CLASS: Record<string, string> = {
  draft:       'bg-white/10 text-white/40',
  scheduled:   'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-cyan-500/20 text-cyan-400',
  completed:   'bg-green-500/20 text-green-400',
  cancelled:   'bg-red-500/20 text-red-400',
  no_show:     'bg-orange-500/20 text-orange-400',
}
const ADMIN_STATUS_LABEL: Record<string, string> = {
  unpaid:          'Sin pagar',
  partially_paid:  'Pago parcial',
  paid:            'Pagado',
  overdue:         'Vencido',
  cancelled:       'Cancelado',
}
const ADMIN_STATUS_CLASS: Record<string, string> = {
  unpaid:          'bg-yellow-500/20 text-yellow-400',
  partially_paid:  'bg-blue-500/20 text-blue-400',
  paid:            'bg-green-500/20 text-green-400',
  overdue:         'bg-red-500/20 text-red-400',
  cancelled:       'bg-white/10 text-white/40',
}

// ── UI state ──────────────────────────────────────────────────────────────────
const activeTab    = ref<'info' | 'treatments' | 'photos' | 'payments' | 'history'>('info')
const editOpen     = ref(false)
const actionError  = ref<string | null>(null)
const actionLoading = ref(false)

// Edit form fields
const editForm = ref({ reason: '', diagnosis: '', clinical_notes: '', indications: '' })

// Service change panel (Task 2)
const showServicePanel = ref(false)
const servicesList     = ref<any[]>([])
const newServiceId     = ref<string | number>('')
const savingService    = ref(false)

// Payments tab state (Task 5)
const chargeDetail     = ref<DentalCharge | null>(null)
const loadingCharge    = ref(false)
const showInstallPanel = ref(false)
const installForm      = ref({ installments_count: 3, first_due_date: new Date().toISOString().slice(0, 10) })
const savingInstall    = ref(false)
const installError     = ref<string | null>(null)
const showPayPanel     = ref(false)
const payForm          = ref({ amount: 0, payment_method: 'cash', notes: '' })
const savingPay        = ref(false)
const payError         = ref<string | null>(null)
const showInstPayPanel = ref(false)
const instPayForm      = ref({ installment_id: 0, amount: 0, payment_method: 'cash' })
const savingInstPay    = ref(false)
const instPayError     = ref<string | null>(null)

// Medical history in History tab (Task 6)
const medicalHistory   = ref<DentalMedicalHistory[]>([])
const showMedHistPanel = ref(false)
const savingMedHist    = ref(false)
const medHistError     = ref<string | null>(null)
const medHistForm      = ref({
  entry_date: new Date().toISOString().slice(0, 10),
  blood_type: '',
  medical_background: '',
  allergies: '',
  current_medications: '',
  chronic_conditions: '',
  dental_observations: '',
  notes: '',
})

// ── Computed helpers ──────────────────────────────────────────────────────────
const consultation = computed(() => store.current)

const patientName = computed(() =>
  (consultation.value?.customer as any)?.full_name ||
  (consultation.value?.customer
    ? `${consultation.value.customer.first_name} ${consultation.value.customer.last_name}`
    : (consultation.value as any)?.patient_name) ||
  '—'
)

const canComplete = computed(() =>
  ['draft', 'scheduled', 'in_progress'].includes(consultation.value?.status ?? '')
)
const canCreateCharge = computed(() =>
  consultation.value?.administrative_status === 'unpaid' &&
  Number(consultation.value?.total_amount ?? 0) > 0
)
const canCancel = computed(() =>
  ['draft', 'scheduled'].includes(consultation.value?.status ?? '')
)

const showActionBar = computed(() => canComplete.value || canCreateCharge.value || canCancel.value)

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(raw?: string | null): string {
  if (!raw) return '—'
  return new Date(raw).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtCurrency(amount?: number | string | null): string {
  const n = Number(amount ?? 0)
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function runAction(fn: () => Promise<unknown>) {
  actionError.value = null
  actionLoading.value = true
  try {
    await fn()
  } catch (e: any) {
    actionError.value = e?.response?.data?.error || 'Error al ejecutar la acción'
  } finally {
    actionLoading.value = false
  }
}

function openEdit() {
  const c = consultation.value
  editForm.value = {
    reason:         (c as any)?.reason         ?? '',
    diagnosis:      (c as any)?.diagnosis      ?? '',
    clinical_notes: (c as any)?.clinical_notes ?? '',
    indications:    (c as any)?.indications    ?? '',
  }
  editOpen.value = true
}

async function saveEdit() {
  try {
    await store.update(id, { ...editForm.value })
    editOpen.value = false
  } catch (e: any) {
    actionError.value = e?.response?.data?.error || 'Error al guardar cambios'
  }
}

// ── Payments helpers ──────────────────────────────────────────────────────────
async function loadCharge() {
  const charges = (consultation.value as any)?.charges
  if (!charges?.length) return
  loadingCharge.value = true
  try {
    const res = await dentalChargesService.getById(charges[0].id)
    chargeDetail.value = (res.data as any)?.data ?? res.data
  } catch (e) {
    // ignore
  } finally {
    loadingCharge.value = false
  }
}

async function saveInstallments() {
  if (!chargeDetail.value) return
  savingInstall.value = true
  installError.value = null
  try {
    await dentalChargesService.createInstallmentPlan(chargeDetail.value.id, {
      installments_count: Number(installForm.value.installments_count),
      first_due_date: installForm.value.first_due_date,
    })
    showInstallPanel.value = false
    await loadCharge()
  } catch (e: any) {
    installError.value = e?.response?.data?.error || 'Error al crear cuotas'
  } finally {
    savingInstall.value = false
  }
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
      notes: payForm.value.notes || undefined,
    })
    showPayPanel.value = false
    payForm.value = { amount: 0, payment_method: 'cash', notes: '' }
    await loadCharge()
  } catch (e: any) {
    payError.value = e?.response?.data?.error || 'Error al registrar pago'
  } finally {
    savingPay.value = false
  }
}

function openInstPayPanel(inst: DentalInstallment) {
  instPayForm.value = { installment_id: Number(inst.id), amount: Number(inst.amount) - Number(inst.paid_amount), payment_method: 'cash' }
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
      payment_date: new Date().toISOString(),
    })
    showInstPayPanel.value = false
    await loadCharge()
  } catch (e: any) {
    instPayError.value = e?.response?.data?.error || 'Error al pagar cuota'
  } finally {
    savingInstPay.value = false
  }
}

// ── Service change helpers (Task 2) ───────────────────────────────────────────
async function openServicePanel() {
  showServicePanel.value = true
  newServiceId.value = (consultation.value as any)?.service_id ?? ''
  if (!servicesList.value.length) {
    try {
      const { dentalServicesService } = await import('../../services/dentalServicesService')
      const res = await dentalServicesService.list()
      servicesList.value = (res.data as any)?.data ?? res.data
    } catch { servicesList.value = [] }
  }
}

async function saveServiceChange() {
  if (!newServiceId.value) return
  savingService.value = true
  try {
    await store.update(id, { service_id: newServiceId.value } as any)
    await store.loadOne(id)
    showServicePanel.value = false
  } catch (e: any) {
    actionError.value = e?.response?.data?.error || 'Error al cambiar servicio'
  } finally {
    savingService.value = false
  }
}

// ── Medical history helpers (Task 6) ─────────────────────────────────────────
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
    showMedHistPanel.value = false
    medHistForm.value = {
      entry_date: new Date().toISOString().slice(0, 10),
      blood_type: '', medical_background: '', allergies: '',
      current_medications: '', chronic_conditions: '', dental_observations: '', notes: '',
    }
  } catch (e: any) {
    medHistError.value = e?.response?.data?.error || 'Error al guardar registro'
  } finally {
    savingMedHist.value = false
  }
}

function fmtDate2(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Mount ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await store.loadOne(id)
})
</script>

<template>
  <div class="min-h-screen pb-32" :style="{ background: 'var(--nexora-glass-bg)' }">

    <!-- Loading / Error states (full page) -->
    <template v-if="store.loading && !consultation">
      <div class="flex items-center justify-center min-h-screen">
        <div class="space-y-3 text-center">
          <div class="h-8 w-48 rounded-lg bg-white/10 animate-pulse mx-auto" />
          <div class="h-4 w-32 rounded bg-white/10 animate-pulse mx-auto" />
        </div>
      </div>
    </template>

    <template v-else-if="store.error && !consultation">
      <div class="flex items-center justify-center min-h-screen px-4">
        <p class="text-red-400 text-center">{{ store.error }}</p>
      </div>
    </template>

    <template v-else-if="consultation">

      <!-- ── Header ──────────────────────────────────────────────────────────── -->
      <header class="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-xl px-4 py-4">
        <div class="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
          <!-- Left: back + title + badges -->
          <div class="flex-1 min-w-0 flex items-start sm:items-center gap-3">
            <button
              class="shrink-0 rounded-xl p-2 hover:bg-white/10 transition mt-0.5 sm:mt-0"
              @click="router.push('/dental/consultations')"
              aria-label="Volver"
            >
              <ArrowLeft class="h-5 w-5 text-white/70" />
            </button>
            <div class="min-w-0">
              <h1 class="text-lg font-semibold text-white truncate">
                Consulta — {{ fmtDate(consultation.consultation_date) }}
              </h1>
              <div class="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="STATUS_CLASS[consultation.status] ?? 'bg-white/10 text-white/40'"
                >
                  {{ STATUS_LABEL[consultation.status] ?? consultation.status }}
                </span>
                <span
                  v-if="consultation.administrative_status"
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="ADMIN_STATUS_CLASS[consultation.administrative_status] ?? 'bg-white/10 text-white/40'"
                >
                  {{ ADMIN_STATUS_LABEL[consultation.administrative_status] ?? consultation.administrative_status }}
                </span>
              </div>
            </div>
          </div>
          <!-- Right: total amount -->
          <div class="pl-10 sm:pl-0 shrink-0">
            <p class="text-xs text-white/40">Total</p>
            <p class="text-xl font-bold text-white">{{ fmtCurrency(consultation.total_amount) }}</p>
          </div>
        </div>
      </header>

      <!-- ── Tabs ────────────────────────────────────────────────────────────── -->
      <div class="sticky top-[73px] z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div class="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-none">
          <button
            v-for="tab in ([
              { key: 'info',       label: 'Info' },
              { key: 'treatments', label: 'Tratamientos' },
              { key: 'photos',     label: 'Fotos' },
              { key: 'payments',   label: 'Pagos' },
              { key: 'history',    label: 'Historial' },
            ] as const)"
            :key="tab.key"
            class="shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition"
            :class="activeTab === tab.key
              ? 'border-[var(--nexora-primary)] text-white'
              : 'border-transparent text-white/50 hover:text-white/80'"
            @click="activeTab = tab.key; if (tab.key === 'payments') loadCharge(); if (tab.key === 'history') loadMedicalHistory()"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- ── Tab content ─────────────────────────────────────────────────────── -->
      <main class="max-w-4xl mx-auto px-4 py-6 space-y-4">

        <!-- Info tab -->
        <template v-if="activeTab === 'info'">
          <div class="rounded-xl border border-white/10 bg-white/5 p-5 space-y-5">
            <!-- Patient -->
            <div>
              <p class="text-xs text-white/40 mb-0.5">Paciente</p>
              <p class="text-white font-medium">{{ patientName }}</p>
            </div>

            <!-- Fields grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div v-for="field in ([
                { key: 'reason',         label: 'Motivo' },
                { key: 'diagnosis',      label: 'Diagnóstico' },
                { key: 'clinical_notes', label: 'Notas clínicas' },
                { key: 'indications',    label: 'Indicaciones' },
              ] as const)" :key="field.key">
                <p class="text-xs text-white/40 mb-0.5">{{ field.label }}</p>
                <p class="text-white/80 text-sm whitespace-pre-wrap">
                  {{ (consultation as any)[field.key] || '—' }}
                </p>
              </div>
            </div>

            <!-- Edit button -->
            <div class="flex justify-end pt-1">
              <button
                class="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 transition px-4 py-2 text-sm text-white/70"
                @click="openEdit"
              >
                <Edit2 class="h-4 w-4" />
                Editar
              </button>
            </div>
          </div>
        </template>

        <!-- Treatments tab -->
        <template v-else-if="activeTab === 'treatments'">
          <div class="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
            <!-- Service name header -->
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs text-white/40 mb-0.5">Servicio</p>
                <p class="text-sm text-white font-medium">{{ (consultation as any).service_name || (consultation as any).service?.name || '—' }}</p>
              </div>
              <button
                class="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-xs text-white/70"
                @click="openServicePanel"
              >
                <RefreshCw class="h-3.5 w-3.5" />
                Cambiar servicio
              </button>
            </div>
            <!-- Treatments list -->
            <div
              v-if="!(consultation as any).treatments?.length"
              class="py-6 text-center text-white/30 text-sm"
            >
              No hay tratamientos asociados a esta consulta
            </div>
            <ul v-else class="divide-y divide-white/10">
              <li
                v-for="(t, i) in (consultation as any).treatments"
                :key="i"
                class="py-3 flex items-center justify-between text-sm"
              >
                <span class="text-white/80">{{ t.treatment_name || t.name || '—' }}</span>
                <span class="text-xs text-white/40">x{{ t.quantity ?? 1 }}</span>
              </li>
            </ul>
          </div>
        </template>

        <!-- Photos tab -->
        <template v-else-if="activeTab === 'photos'">
          <WidgetsDentalPhotoGallery :consultationId="id" />
        </template>

        <!-- Payments tab (Task 5) -->
        <template v-else-if="activeTab === 'payments'">
          <div class="space-y-4">
            <div v-if="loadingCharge" class="py-8 text-center text-white/30 text-sm">Cargando...</div>
            <template v-else-if="chargeDetail">
              <!-- Charge summary -->
              <div class="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
                <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Resumen del cargo</p>
                <div class="grid grid-cols-3 gap-3 text-sm">
                  <div><p class="text-xs text-white/40">Total</p><p class="text-white font-medium">{{ fmtCurrency(chargeDetail.total_amount) }}</p></div>
                  <div><p class="text-xs text-white/40">Pagado</p><p class="text-green-400 font-medium">{{ fmtCurrency(chargeDetail.paid_amount) }}</p></div>
                  <div><p class="text-xs text-white/40">Pendiente</p><p class="text-yellow-400 font-medium">{{ fmtCurrency(chargeDetail.pending_amount) }}</p></div>
                </div>
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs" :class="{
                  'bg-yellow-500/20 text-yellow-400': chargeDetail.status === 'pending',
                  'bg-blue-500/20 text-blue-400': chargeDetail.status === 'partially_paid',
                  'bg-green-500/20 text-green-400': chargeDetail.status === 'paid',
                  'bg-red-500/20 text-red-400': chargeDetail.status === 'overdue',
                  'bg-white/10 text-white/40': !['pending','partially_paid','paid','overdue'].includes(chargeDetail.status),
                }">{{ { pending:'Pendiente', partially_paid:'Pago parcial', paid:'Pagado', overdue:'Vencido', cancelled:'Cancelado', refunded:'Reembolsado' }[chargeDetail.status] ?? chargeDetail.status }}</span>
              </div>

              <!-- Installments section -->
              <div class="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
                <div class="flex items-center justify-between">
                  <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Cuotas</p>
                  <button
                    v-if="!(chargeDetail as any).installments?.length"
                    class="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-xs text-white/70"
                    @click="showInstallPanel = true"
                  >
                    <Plus class="h-3.5 w-3.5" />
                    Crear cuotas
                  </button>
                </div>
                <div v-if="!(chargeDetail as any).installments?.length" class="text-center text-white/30 text-sm py-4">
                  Sin cuotas. Podés crear un plan de cuotas o registrar un pago directo.
                </div>
                <ul v-else class="divide-y divide-white/10">
                  <li
                    v-for="inst in (chargeDetail as any).installments"
                    :key="inst.id"
                    class="py-3 flex items-center justify-between text-sm gap-3"
                  >
                    <div class="flex-1">
                      <p class="text-white/80">Cuota {{ inst.installment_number }} — {{ fmtDate(inst.due_date) }}</p>
                      <p class="text-xs text-white/40">{{ fmtCurrency(inst.amount) }} · Pagado: {{ fmtCurrency(inst.paid_amount) }}</p>
                    </div>
                    <span class="text-xs px-2 py-0.5 rounded-full" :class="{
                      'bg-yellow-500/20 text-yellow-400': inst.status === 'pending',
                      'bg-blue-500/20 text-blue-400': inst.status === 'partially_paid',
                      'bg-green-500/20 text-green-400': inst.status === 'paid',
                      'bg-red-500/20 text-red-400': inst.status === 'overdue',
                    }">{{ ({ pending:'Pendiente', partially_paid:'Parcial', paid:'Pagado', overdue:'Vencido' } as Record<string,string>)[inst.status] ?? inst.status }}</span>
                    <button
                      v-if="inst.status !== 'paid' && inst.status !== 'cancelled'"
                      class="rounded-xl bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-xs text-white/70"
                      @click="openInstPayPanel(inst)"
                    >
                      Pagar
                    </button>
                  </li>
                </ul>
              </div>

              <!-- Direct payment (no installments) -->
              <div v-if="!(chargeDetail as any).installments?.length && chargeDetail.status !== 'paid'" class="rounded-xl border border-white/10 bg-white/5 p-5">
                <div class="flex items-center justify-between">
                  <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Pago directo</p>
                  <button
                    class="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-xs text-white/70"
                    @click="payForm.amount = Number(chargeDetail?.pending_amount ?? 0); showPayPanel = true"
                  >
                    <Plus class="h-3.5 w-3.5" />
                    Registrar pago
                  </button>
                </div>
              </div>

              <!-- Payment history -->
              <div v-if="(chargeDetail as any).payments?.length" class="rounded-xl border border-white/10 bg-white/5 p-5 space-y-2">
                <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Pagos registrados</p>
                <ul class="divide-y divide-white/10">
                  <li
                    v-for="(pmt, i) in (chargeDetail as any).payments"
                    :key="i"
                    class="py-2.5 flex items-center justify-between text-sm"
                  >
                    <div>
                      <p class="text-white/80">{{ fmtDate(pmt.payment_date) }}</p>
                      <p class="text-xs text-white/40">{{ ({ cash:'Efectivo', card:'Tarjeta', bank_transfer:'Transferencia', mobile_payment:'Pago móvil', insurance:'Seguro', other:'Otro' } as Record<string,string>)[pmt.payment_method] ?? pmt.payment_method }}</p>
                    </div>
                    <p class="text-green-400 font-medium">{{ fmtCurrency(pmt.amount) }}</p>
                  </li>
                </ul>
              </div>
            </template>
            <template v-else>
              <div class="rounded-xl border border-white/10 bg-white/5 p-5 text-center text-white/30 text-sm py-10">
                <p>No hay cargo generado para esta consulta.</p>
                <button
                  v-if="canCreateCharge"
                  class="mt-3 flex items-center gap-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 transition px-4 py-2.5 text-sm text-blue-400 mx-auto"
                  :disabled="actionLoading"
                  @click="runAction(() => store.createCharge(id, Number(consultation!.total_amount)))"
                >
                  <CreditCard class="h-4 w-4" />
                  Generar cargo
                </button>
              </div>
            </template>
          </div>
        </template>

        <!-- History tab (Task 6) -->
        <template v-else-if="activeTab === 'history'">
          <div class="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
            <!-- Link to patient detail -->
            <div>
              <a
                v-if="(consultation as any).customer?.id || (consultation as any).customer_id"
                :href="`/dental/patients/${(consultation as any).customer?.id ?? (consultation as any).customer_id}`"
                class="inline-flex items-center gap-2 rounded-xl bg-[var(--nexora-primary)]/20 hover:bg-[var(--nexora-primary)]/30 transition px-4 py-2 text-sm text-white/80"
              >
                Ver historial completo del paciente
              </a>
            </div>

            <!-- Medical history entries -->
            <div class="flex items-center justify-between">
              <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Registros médicos</p>
              <button
                class="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-xs text-white/70"
                @click="showMedHistPanel = true"
              >
                <Plus class="h-3.5 w-3.5" />
                Agregar registro médico
              </button>
            </div>
            <div v-if="medicalHistory.length === 0" class="text-center text-white/30 text-sm py-4">
              No hay registros médicos.
            </div>
            <div
              v-for="entry in medicalHistory"
              :key="entry.id"
              class="flex flex-col gap-1.5 px-4 py-3 rounded-xl border border-white/10"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-medium text-white">{{ fmtDate2(entry.entry_date) }}</span>
                <span v-if="entry.blood_type" class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">{{ entry.blood_type }}</span>
              </div>
              <div v-if="entry.allergies" class="text-xs text-white/60"><span class="text-white/40">Alergias: </span>{{ entry.allergies }}</div>
              <div v-if="entry.medical_background" class="text-xs text-white/60"><span class="text-white/40">Antecedentes: </span>{{ entry.medical_background }}</div>
              <div v-if="entry.dental_observations" class="text-xs text-white/60"><span class="text-white/40">Obs. dentales: </span>{{ entry.dental_observations }}</div>
              <div v-if="entry.notes" class="text-xs text-white/60"><span class="text-white/40">Notas: </span>{{ entry.notes }}</div>
            </div>
          </div>
        </template>

      </main>
    </template>

    <!-- ── Action bar ────────────────────────────────────────────────────────── -->
    <div
      v-if="consultation && showActionBar"
      class="fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-black/40 backdrop-blur-xl px-4 py-4"
    >
      <div class="max-w-4xl mx-auto space-y-2">
        <p v-if="actionError" class="text-red-400 text-sm text-center">{{ actionError }}</p>
        <div class="flex flex-wrap gap-2 justify-center sm:justify-end">
          <button
            v-if="canCancel"
            class="flex items-center gap-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition px-4 py-2.5 text-sm text-red-400 disabled:opacity-50"
            :disabled="actionLoading"
            @click="runAction(() => store.cancel(id))"
          >
            <XCircle class="h-4 w-4" />
            Cancelar
          </button>
          <button
            v-if="canCreateCharge"
            class="flex items-center gap-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 transition px-4 py-2.5 text-sm text-blue-400 disabled:opacity-50"
            :disabled="actionLoading"
            @click="runAction(() => store.createCharge(id, Number(consultation!.total_amount)))"
          >
            <CreditCard class="h-4 w-4" />
            Generar cargo
          </button>
          <button
            v-if="canComplete"
            class="flex items-center gap-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 transition px-4 py-2.5 text-sm text-green-400 disabled:opacity-50"
            :disabled="actionLoading"
            @click="runAction(() => store.complete(id))"
          >
            <CheckCircle2 class="h-4 w-4" />
            Completar
          </button>
        </div>
      </div>
    </div>

    <!-- ── Edit slide panel ──────────────────────────────────────────────────── -->
    <NxrSlidePanel
      :open="editOpen"
      title="Editar consulta"
      eyebrow="Información clínica"
      size="md"
      @close="editOpen = false"
    >
      <form class="flex flex-col gap-5 p-6" @submit.prevent="saveEdit">
        <div v-for="field in ([
          { key: 'reason',         label: 'Motivo' },
          { key: 'diagnosis',      label: 'Diagnóstico' },
          { key: 'clinical_notes', label: 'Notas clínicas' },
          { key: 'indications',    label: 'Indicaciones' },
        ] as const)" :key="field.key" class="space-y-1.5">
          <label class="block text-xs text-white/50">{{ field.label }}</label>
          <textarea
            v-model="editForm[field.key]"
            rows="3"
            class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[var(--nexora-primary)] resize-none"
          />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="rounded-xl bg-white/10 hover:bg-white/20 transition px-4 py-2.5 text-sm text-white/70"
            @click="editOpen = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="rounded-xl px-4 py-2.5 text-sm text-white font-medium transition"
            :style="{ background: 'var(--nexora-primary)' }"
          >
            Guardar
          </button>
        </div>
      </form>
    </NxrSlidePanel>

    <!-- Service change panel (Task 2) -->
    <NxrSlidePanel :open="showServicePanel" title="Cambiar servicio" eyebrow="Tratamientos" @close="showServicePanel = false">
      <form class="flex flex-col gap-4 p-6" @submit.prevent="saveServiceChange">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Servicio</label>
          <select v-model="newServiceId" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none" required>
            <option value="" disabled>Seleccionar servicio...</option>
            <option v-for="svc in servicesList" :key="svc.id" :value="svc.id">{{ svc.name }}</option>
          </select>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="rounded-xl bg-white/10 hover:bg-white/20 transition px-4 py-2.5 text-sm text-white/70" @click="showServicePanel = false">Cancelar</button>
          <button type="submit" :disabled="savingService" class="rounded-xl px-4 py-2.5 text-sm text-white font-medium transition disabled:opacity-50" :style="{ background: 'var(--nexora-primary)' }">
            {{ savingService ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </NxrSlidePanel>

    <!-- Create installments panel (Task 5) -->
    <NxrSlidePanel :open="showInstallPanel" title="Crear plan de cuotas" eyebrow="Pagos" @close="showInstallPanel = false">
      <form class="flex flex-col gap-4 p-6" @submit.prevent="saveInstallments">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Cantidad de cuotas (2-12)</label>
          <input v-model.number="installForm.installments_count" type="number" min="2" max="12" required class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Primer vencimiento</label>
          <input v-model="installForm.first_due_date" type="date" required class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div v-if="chargeDetail" class="rounded-xl bg-white/5 border border-white/10 p-3 text-sm">
          <p class="text-xs text-white/40 mb-1">Vista previa (aprox.)</p>
          <p class="text-white/80">{{ installForm.installments_count }} cuotas de {{ fmtCurrency(Math.floor(Number(chargeDetail.pending_amount) / installForm.installments_count * 100) / 100) }}</p>
        </div>
        <p v-if="installError" class="text-red-400 text-sm">{{ installError }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="rounded-xl bg-white/10 hover:bg-white/20 transition px-4 py-2.5 text-sm text-white/70" @click="showInstallPanel = false">Cancelar</button>
          <button type="submit" :disabled="savingInstall" class="rounded-xl px-4 py-2.5 text-sm text-white font-medium transition disabled:opacity-50" :style="{ background: 'var(--nexora-primary)' }">
            {{ savingInstall ? 'Creando...' : 'Crear cuotas' }}
          </button>
        </div>
      </form>
    </NxrSlidePanel>

    <!-- Direct payment panel (Task 5) -->
    <NxrSlidePanel :open="showPayPanel" title="Registrar pago" eyebrow="Pagos" @close="showPayPanel = false">
      <form class="flex flex-col gap-4 p-6" @submit.prevent="saveDirectPayment">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Monto</label>
          <input v-model.number="payForm.amount" type="number" step="0.01" min="0.01" required class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Método de pago</label>
          <select v-model="payForm.payment_method" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="bank_transfer">Transferencia</option>
            <option value="mobile_payment">Pago móvil</option>
            <option value="insurance">Seguro</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Notas</label>
          <input v-model="payForm.notes" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <p v-if="payError" class="text-red-400 text-sm">{{ payError }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="rounded-xl bg-white/10 hover:bg-white/20 transition px-4 py-2.5 text-sm text-white/70" @click="showPayPanel = false">Cancelar</button>
          <button type="submit" :disabled="savingPay" class="rounded-xl px-4 py-2.5 text-sm text-white font-medium transition disabled:opacity-50" :style="{ background: 'var(--nexora-primary)' }">
            {{ savingPay ? 'Registrando...' : 'Registrar' }}
          </button>
        </div>
      </form>
    </NxrSlidePanel>

    <!-- Installment payment panel (Task 5) -->
    <NxrSlidePanel :open="showInstPayPanel" title="Pagar cuota" eyebrow="Pagos" @close="showInstPayPanel = false">
      <form class="flex flex-col gap-4 p-6" @submit.prevent="saveInstallmentPayment">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Monto</label>
          <input v-model.number="instPayForm.amount" type="number" step="0.01" min="0.01" required class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Método de pago</label>
          <select v-model="instPayForm.payment_method" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="bank_transfer">Transferencia</option>
            <option value="mobile_payment">Pago móvil</option>
            <option value="insurance">Seguro</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <p v-if="instPayError" class="text-red-400 text-sm">{{ instPayError }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="rounded-xl bg-white/10 hover:bg-white/20 transition px-4 py-2.5 text-sm text-white/70" @click="showInstPayPanel = false">Cancelar</button>
          <button type="submit" :disabled="savingInstPay" class="rounded-xl px-4 py-2.5 text-sm text-white font-medium transition disabled:opacity-50" :style="{ background: 'var(--nexora-primary)' }">
            {{ savingInstPay ? 'Pagando...' : 'Pagar' }}
          </button>
        </div>
      </form>
    </NxrSlidePanel>

    <!-- Medical history panel (Task 6) -->
    <NxrSlidePanel :open="showMedHistPanel" title="Agregar registro médico" eyebrow="Historia" @close="showMedHistPanel = false">
      <form class="flex flex-col gap-4 p-6" @submit.prevent="saveMedHist">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Fecha *</label>
          <input v-model="medHistForm.entry_date" type="date" required class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Grupo sanguíneo</label>
          <input v-model="medHistForm.blood_type" type="text" placeholder="Ej: A+" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Antecedentes médicos</label>
          <textarea v-model="medHistForm.medical_background" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Alergias</label>
          <textarea v-model="medHistForm.allergies" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Medicación actual</label>
          <textarea v-model="medHistForm.current_medications" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Enfermedades crónicas</label>
          <textarea v-model="medHistForm.chronic_conditions" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Observaciones dentales</label>
          <textarea v-model="medHistForm.dental_observations" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Notas</label>
          <textarea v-model="medHistForm.notes" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <p v-if="medHistError" class="text-red-400 text-sm">{{ medHistError }}</p>
        <div class="flex justify-end gap-2 pt-1">
          <button type="button" class="rounded-xl bg-white/10 hover:bg-white/20 transition px-4 py-2 text-sm text-white/70" @click="showMedHistPanel = false">Cancelar</button>
          <button type="submit" :disabled="savingMedHist" class="rounded-xl px-4 py-2 text-sm text-white font-medium transition disabled:opacity-50" :style="{ background: 'var(--nexora-primary)' }">
            {{ savingMedHist ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </NxrSlidePanel>

  </div>
</template>
