<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CheckCircle2, XCircle, CreditCard, Edit2 } from 'lucide-vue-next'
import { useDentalConsultationsStore } from '../../stores/dentalConsultations'
import NxrSlidePanel from '../../components/NxrSlidePanel.vue'
import WidgetsDentalPhotoGallery from '../../components/widgets_dental_photo_gallery.vue'

// ── Route / Store ─────────────────────────────────────────────────────────────
const route  = useRoute()
const router = useRouter()
const store  = useDentalConsultationsStore()
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
const activeTab    = ref<'info' | 'treatments' | 'photos' | 'history'>('info')
const editOpen     = ref(false)
const actionError  = ref<string | null>(null)
const actionLoading = ref(false)

// Edit form fields
const editForm = ref({ reason: '', diagnosis: '', clinical_notes: '', indications: '' })

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
              { key: 'history',    label: 'Historial' },
            ] as const)"
            :key="tab.key"
            class="shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition"
            :class="activeTab === tab.key
              ? 'border-[var(--nexora-primary)] text-white'
              : 'border-transparent text-white/50 hover:text-white/80'"
            @click="activeTab = tab.key"
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
          <div class="rounded-xl border border-white/10 bg-white/5 p-5">
            <div
              v-if="!(consultation as any).treatments?.length"
              class="py-8 text-center text-white/30 text-sm"
            >
              No hay tratamientos asociados a esta consulta
            </div>
            <ul v-else class="divide-y divide-white/10">
              <li
                v-for="(t, i) in (consultation as any).treatments"
                :key="i"
                class="py-3 text-white/80 text-sm"
              >
                {{ t.treatment_name || t.name || '—' }}
              </li>
            </ul>
          </div>
        </template>

        <!-- Photos tab -->
        <template v-else-if="activeTab === 'photos'">
          <WidgetsDentalPhotoGallery :consultationId="id" />
        </template>

        <!-- History tab -->
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

            <!-- Charges -->
            <div v-if="(consultation as any).charges?.length">
              <p class="text-xs text-white/40 mb-2">Cargos</p>
              <ul class="divide-y divide-white/10">
                <li
                  v-for="(charge, i) in (consultation as any).charges"
                  :key="i"
                  class="py-3 flex items-center justify-between text-sm"
                >
                  <span class="text-white/70">{{ charge.description || charge.concept || `Cargo #${charge.id}` }}</span>
                  <span class="text-white font-medium">{{ fmtCurrency(charge.amount) }}</span>
                </li>
              </ul>
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

  </div>
</template>
