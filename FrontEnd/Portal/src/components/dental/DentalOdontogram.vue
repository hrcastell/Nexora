<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useDentalOdontogramStore } from '../../stores/dentalOdontogram'
import { useAuthStore } from '../../stores/auth'
import type { OdontogramEntry } from '../../services/dentalOdontogramService'
import {
  cloneDraftValue,
  deleteSlidePanelDraft,
  draftValuesEqual,
  saveSlidePanelDraft,
  takeSlidePanelDraft
} from '../../utils/slidePanelDrafts'

const props = defineProps<{
  patientId: number
  consultationId?: number
  readonly: boolean
}>()

const store = useDentalOdontogramStore()
const auth = useAuthStore()

// ─── Dentition tab ───────────────────────────────────────────
type DentitionMode = 'permanent' | 'deciduous' | 'mixed'
const dentitionMode = ref<DentitionMode>('permanent')

// ─── Tooth detail panel ───────────────────────────────────────
const selectedTooth = ref<number | null>(null)
const panelVisible = ref(false)
const showDiscardWarning = ref(false)
const warningTitle = ref<HTMLHeadingElement | null>(null)
const initialFindingState = ref<Record<string, string>>({})

function findingState() {
  return {
    surface: formSurface.value,
    findingType: formFindingType.value,
    findingStatus: formFindingStatus.value,
    priority: formPriority.value,
    observation: formObservation.value
  }
}

function restoreFindingState(state: Record<string, string>) {
  formSurface.value = state.surface
  formFindingType.value = state.findingType
  formFindingStatus.value = state.findingStatus
  formPriority.value = state.priority
  formObservation.value = state.observation
}

function findingDraftKey(toothNumber = selectedTooth.value) {
  const scope = `${auth.user?.id ?? 'anonymous'}:${auth.currentCompany?.schema_name ?? auth.currentCompany?.id ?? 'global'}`
  return `${scope}:dental-odontogram:${props.patientId}:${props.consultationId ?? 'readonly'}:${toothNumber ?? 'none'}`
}

function selectTooth(toothNumber: number) {
  if (props.readonly && !entriesByTooth.value.has(toothNumber)) return
  selectedTooth.value = toothNumber
  resetForm()
  const saved = takeSlidePanelDraft(findingDraftKey(toothNumber))
  if (saved) {
    restoreFindingState(saved.value as Record<string, string>)
    initialFindingState.value = cloneDraftValue(saved.initial as Record<string, string>)
  } else {
    initialFindingState.value = cloneDraftValue(findingState())
  }
  panelVisible.value = true
}

function closePanel() {
  if (!draftValuesEqual(findingState(), initialFindingState.value)) {
    showDiscardWarning.value = true
    nextTick(() => warningTitle.value?.focus())
    return
  }
  finishClose()
}

function finishClose() {
  panelVisible.value = false
  selectedTooth.value = null
  formError.value = null
  showDiscardWarning.value = false
}

function keepFindingDraftAndClose() {
  saveSlidePanelDraft(findingDraftKey(), {
    initial: initialFindingState.value,
    value: findingState()
  })
  finishClose()
}

function discardFindingDraftAndClose() {
  deleteSlidePanelDraft(findingDraftKey())
  restoreFindingState(initialFindingState.value)
  finishClose()
}

function onPanelKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  // The nested discard dialog owns Escape while it is open.
  if (showDiscardWarning.value) return
  event.stopPropagation()
  closePanel()
}

watch(panelVisible, (visible) => {
  if (visible) document.addEventListener('keydown', onPanelKeydown)
  else document.removeEventListener('keydown', onPanelKeydown)
})

onBeforeUnmount(() => document.removeEventListener('keydown', onPanelKeydown))

// ─── Add finding form ─────────────────────────────────────────
const formSurface = ref('')
const formFindingType = ref('caries')
const formFindingStatus = ref('active')
const formPriority = ref('normal')
const formObservation = ref('')
const formError = ref<string | null>(null)
const formSaving = ref(false)

function resetForm() {
  formSurface.value = ''
  formFindingType.value = 'caries'
  formFindingStatus.value = 'active'
  formPriority.value = 'normal'
  formObservation.value = ''
  formError.value = null
}

async function saveEntry() {
  if (!props.consultationId || !selectedTooth.value) return
  if (!formFindingType.value) {
    formError.value = 'El tipo de hallazgo es obligatorio'
    return
  }
  formSaving.value = true
  formError.value = null
  const saved = await store.upsertEntry(props.consultationId, {
    patient_id: props.patientId,
    tooth_number: selectedTooth.value,
    surface: formSurface.value || null,
    finding_type: formFindingType.value,
    finding_status: formFindingStatus.value,
    priority: formPriority.value,
    observation: formObservation.value || null,
  })
  formSaving.value = false
  if (saved) {
    deleteSlidePanelDraft(findingDraftKey())
    resetForm()
    initialFindingState.value = cloneDraftValue(findingState())
  } else {
    formError.value = store.error || 'Error al guardar'
  }
}

async function removeEntry(entry: OdontogramEntry) {
  if (!props.consultationId) return
  await store.deleteEntry(props.consultationId, entry.id)
}

// ─── Computed helpers ─────────────────────────────────────────
const entriesByTooth = computed(() => store.entriesByTooth)

const consultationEntryIds = computed(() => new Set(store.consultationEntries.map(e => e.id)))

const TOOTH_COLOR_MAP: Record<string, string> = {
  caries:      '#fde047',  // yellow-300
  fracture:    '#fb923c',  // orange-400
  extraction:  '#f87171',  // red-400
  absence:     '#f87171',  // red-400
  restoration: '#60a5fa',  // blue-400
  crown:       '#60a5fa',  // blue-400
  implant:     '#60a5fa',  // blue-400
  sealant:     '#c084fc',  // purple-400
  planned:     '#d1d5db',  // gray-300
  other:       '#9ca3af',  // gray-400
}

function toothColor(toothNumber: number): string {
  const toothEntries = entriesByTooth.value.get(toothNumber)
  if (!toothEntries || toothEntries.length === 0) return '#86efac'  // green-300 — healthy

  const priority: Record<string, number> = {
    extraction: 5,
    absence: 5,
    fracture: 4,
    caries: 3,
    crown: 2,
    implant: 2,
    restoration: 2,
    sealant: 1,
    other: 0,
  }

  // Find the most severe finding type
  let topScore = -1
  let topType = 'other'
  let hasActive = false

  for (const e of toothEntries) {
    if (e.finding_status === 'planned') continue
    hasActive = true
    const score = priority[e.finding_type] ?? 0
    if (score > topScore) {
      topScore = score
      topType = e.finding_type
    }
  }

  if (!hasActive) return TOOTH_COLOR_MAP['planned'] ?? '#d1d5db'
  return TOOTH_COLOR_MAP[topType] ?? '#9ca3af'
}

function toothFillColors(toothNumber: number): string[] {
  const toothEntries = entriesByTooth.value.get(toothNumber)
  if (!toothEntries || toothEntries.length === 0) return ['#86efac']

  const activeTypes = [...new Set(
    toothEntries
      .filter(e => e.finding_status !== 'planned')
      .map(e => e.finding_type)
  )]

  if (activeTypes.length === 0) return [TOOTH_COLOR_MAP['planned'] ?? '#d1d5db']
  return activeTypes.map(t => TOOTH_COLOR_MAP[t] ?? '#9ca3af')
}

const toothGradients = computed(() => {
  const result = new Map<number, { id: string; colors: string[] }>()
  for (const tooth of [...upperRow, ...lowerRow]) {
    const colors = toothFillColors(tooth)
    if (colors.length > 1) {
      result.set(tooth, { id: `tooth-grad-${tooth}`, colors })
    }
  }
  return result
})

function toothFillValue(tooth: number): string {
  const grad = toothGradients.value.get(tooth)
  return grad ? `url(#${grad.id})` : toothColor(tooth)
}

// ─── FDI tooth name lookup ────────────────────────────────────
const toothNames: Record<number, string> = {
  11: 'Incisivo Central Superior Derecho',
  12: 'Incisivo Lateral Superior Derecho',
  13: 'Canino Superior Derecho',
  14: '1er Premolar Superior Derecho',
  15: '2do Premolar Superior Derecho',
  16: '1er Molar Superior Derecho',
  17: '2do Molar Superior Derecho',
  18: '3er Molar Superior Derecho',
  21: 'Incisivo Central Superior Izquierdo',
  22: 'Incisivo Lateral Superior Izquierdo',
  23: 'Canino Superior Izquierdo',
  24: '1er Premolar Superior Izquierdo',
  25: '2do Premolar Superior Izquierdo',
  26: '1er Molar Superior Izquierdo',
  27: '2do Molar Superior Izquierdo',
  28: '3er Molar Superior Izquierdo',
  31: 'Incisivo Central Inferior Izquierdo',
  32: 'Incisivo Lateral Inferior Izquierdo',
  33: 'Canino Inferior Izquierdo',
  34: '1er Premolar Inferior Izquierdo',
  35: '2do Premolar Inferior Izquierdo',
  36: '1er Molar Inferior Izquierdo',
  37: '2do Molar Inferior Izquierdo',
  38: '3er Molar Inferior Izquierdo',
  41: 'Incisivo Central Inferior Derecho',
  42: 'Incisivo Lateral Inferior Derecho',
  43: 'Canino Inferior Derecho',
  44: '1er Premolar Inferior Derecho',
  45: '2do Premolar Inferior Derecho',
  46: '1er Molar Inferior Derecho',
  47: '2do Molar Inferior Derecho',
  48: '3er Molar Inferior Derecho',
}

function toothName(n: number): string {
  return toothNames[n] ?? `Diente ${n}`
}

// ─── SVG chart layout ─────────────────────────────────────────
// Upper row left-to-right on screen: 18..11 | 21..28
const upperRow = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
// Lower row left-to-right on screen: 48..41 | 31..38
const lowerRow = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

const TOOTH_W = 26
const TOOTH_H = 32
const TOOTH_GAP = 3
const ARCH_SEP = 32   // vertical gap between arches — more breathing room
const MIDLINE_GAP = 4 // extra gap between tooth 8 and 9 of each arch

function toothX(index: number): number {
  // Add midline gap after position 7 (after teeth 11 / 41)
  const gap = index >= 8 ? MIDLINE_GAP : 0
  return index * (TOOTH_W + TOOTH_GAP) + gap
}

const SVG_W = 16 * (TOOTH_W + TOOTH_GAP) + MIDLINE_GAP
const UPPER_Y = 14
const LOWER_Y = UPPER_Y + TOOTH_H + ARCH_SEP
const SVG_H = UPPER_Y + 2 * TOOTH_H + ARCH_SEP + 24 // 24px for lower label + bottom padding

const hoveredTooth = ref<number | null>(null)


function isFromThisConsultation(toothNumber: number): boolean {
  const te = entriesByTooth.value.get(toothNumber)
  if (!te) return false
  return te.some(e => consultationEntryIds.value.has(e.id))
}

// ─── Finding label helpers ────────────────────────────────────
const findingTypeLabels: Record<string, string> = {
  caries: 'Caries',
  restoration: 'Restauracion',
  extraction: 'Extraccion',
  fracture: 'Fractura',
  sealant: 'Sellador',
  crown: 'Corona',
  implant: 'Implante',
  absence: 'Ausencia',
  other: 'Otro',
}

const surfaceLabels: Record<string, string> = {
  mesial: 'Mesial',
  distal: 'Distal',
  vestibular: 'Vestibular',
  lingual: 'Lingual/Palatino',
  occlusal: 'Oclusal',
  complete: 'Completo',
}

const statusLabels: Record<string, string> = {
  active: 'Activa',
  resolved: 'Resuelta',
  planned: 'Planificada',
}

const priorityLabels: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baja',
}

const statusColors: Record<string, string> = {
  active: 'bg-red-500/20 text-red-300',
  resolved: 'bg-green-500/20 text-green-300',
  planned: 'bg-gray-500/20 text-gray-300',
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-600/30 text-red-300',
  high: 'bg-orange-500/20 text-orange-300',
  normal: 'bg-blue-500/10 text-blue-300',
  low: 'bg-gray-500/10 text-gray-400',
}

// ─── Lifecycle ────────────────────────────────────────────────
async function loadData() {
  store.reset()
  await store.loadPatientOdontogram(props.patientId)
  if (props.consultationId) {
    await store.loadConsultationOdontogram(props.consultationId)
  }
}

onMounted(loadData)

watch(
  [() => props.patientId, () => props.consultationId],
  loadData
)
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Dentition tab switcher -->
    <div class="flex gap-2 flex-wrap">
      <button
        v-for="tab in ([
          { key: 'permanent', label: 'Permanente (32)' },
          { key: 'deciduous', label: 'Decidua (20)' },
          { key: 'mixed', label: 'Mixta' },
        ] as const)"
        :key="tab.key"
        class="relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition"
        :class="dentitionMode === tab.key
          ? 'bg-[var(--nexora-primary)] text-white'
          : 'nxr-text-muted bg-white/5 hover:bg-white/10 hover:text-[var(--nexora-text-color)]'"
        @click="dentitionMode = tab.key"
      >
        {{ tab.label }}
        <span
          v-if="tab.key !== 'permanent'"
          class="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] nxr-text-muted"
        >Proximamente</span>
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="store.loading" class="flex justify-center py-10">
      <div class="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70"></div>
    </div>

    <template v-else>
      <!-- SVG tooth chart -->
      <div class="overflow-x-auto rounded-2xl border border-white/10 p-4" :style="{ background: 'var(--nexora-glass-bg)' }">
        <svg
          :width="SVG_W"
          :height="SVG_H"
          :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
          class="mx-auto"
          style="min-width: 420px"
          role="img"
          aria-label="Odontograma"
        >
          <defs>
            <linearGradient
              v-for="[, grad] in toothGradients"
              :key="grad.id"
              :id="grad.id"
              x1="0%" y1="0%" x2="100%" y2="0%"
            >
              <stop
                v-for="(color, i) in grad.colors"
                :key="i"
                :offset="`${(i / Math.max(grad.colors.length - 1, 1)) * 100}%`"
                :stop-color="color"
              />
            </linearGradient>
          </defs>

          <!-- Upper arch -->
          <g v-for="(tooth, index) in upperRow" :key="`u-${tooth}`">
            <rect
              :x="toothX(index)"
              :y="UPPER_Y"
              :width="TOOTH_W"
              :height="TOOTH_H"
              :fill="toothFillValue(tooth)"
              rx="3"
              :stroke="selectedTooth === tooth ? 'var(--nexora-primary)' : (isFromThisConsultation(tooth) ? 'rgba(139,92,246,0.7)' : '#d1d5db')"
              :stroke-width="selectedTooth === tooth ? 2 : (isFromThisConsultation(tooth) ? 1.5 : 0.5)"
              :class="{ 'cursor-pointer': !readonly }"
              @mouseenter="hoveredTooth = tooth"
              @mouseleave="hoveredTooth = null"
              @click="selectTooth(tooth)"
            />
            <rect
              v-if="hoveredTooth === tooth && !readonly"
              :x="toothX(index)"
              :y="UPPER_Y"
              :width="TOOTH_W"
              :height="TOOTH_H"
              fill="rgba(0,0,0,0.18)"
              rx="3"
              pointer-events="none"
            />
            <!-- Tooth number label -->
            <text
              :x="toothX(index) + TOOTH_W / 2"
              :y="UPPER_Y + TOOTH_H + 11"
              text-anchor="middle"
              font-size="8"
              fill="#9ca3af"
            >{{ tooth }}</text>
          </g>

          <!-- Lower arch -->
          <g v-for="(tooth, index) in lowerRow" :key="`l-${tooth}`">
            <rect
              :x="toothX(index)"
              :y="LOWER_Y"
              :width="TOOTH_W"
              :height="TOOTH_H"
              :fill="toothFillValue(tooth)"
              rx="3"
              :stroke="selectedTooth === tooth ? 'var(--nexora-primary)' : (isFromThisConsultation(tooth) ? 'rgba(139,92,246,0.7)' : '#d1d5db')"
              :stroke-width="selectedTooth === tooth ? 2 : (isFromThisConsultation(tooth) ? 1.5 : 0.5)"
              :class="{ 'cursor-pointer': !readonly }"
              @mouseenter="hoveredTooth = tooth"
              @mouseleave="hoveredTooth = null"
              @click="selectTooth(tooth)"
            />
            <rect
              v-if="hoveredTooth === tooth && !readonly"
              :x="toothX(index)"
              :y="LOWER_Y"
              :width="TOOTH_W"
              :height="TOOTH_H"
              fill="rgba(0,0,0,0.18)"
              rx="3"
              pointer-events="none"
            />
            <!-- Tooth number label below the lower arch rect -->
            <text
              :x="toothX(index) + TOOTH_W / 2"
              :y="LOWER_Y + TOOTH_H + 11"
              text-anchor="middle"
              font-size="8"
              fill="#9ca3af"
            >{{ tooth }}</text>
          </g>

          <!-- Midline divider -->
          <line
            :x1="toothX(8) - MIDLINE_GAP / 2"
            :y1="UPPER_Y - 4"
            :x2="toothX(8) - MIDLINE_GAP / 2"
            :y2="LOWER_Y + TOOTH_H + 4"
            stroke="#6b7280"
            stroke-width="0.5"
            stroke-dasharray="3 3"
          />
        </svg>

        <!-- Color legend -->
        <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
          <span v-for="item in [
            { color: '#86efac', label: 'Sano' },
            { color: '#fde047', label: 'Caries' },
            { color: '#fb923c', label: 'Fractura' },
            { color: '#f87171', label: 'Extraccion/Ausencia' },
            { color: '#60a5fa', label: 'Restauracion/Corona/Implante' },
            { color: '#c084fc', label: 'Sellador' },
            { color: '#d1d5db', label: 'Planificado' },
          ]" :key="item.label" class="flex items-center gap-1.5">
            <span class="h-3 w-3 rounded-sm border border-gray-300 flex-shrink-0" :style="{ background: item.color }"></span>
            <span class="text-[10px] nxr-text-muted">{{ item.label }}</span>
          </span>
        </div>
      </div>

      <!-- Tooth detail side panel overlay -->
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <div
          v-if="panelVisible && selectedTooth !== null"
          class="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-white/10 shadow-2xl"
          :style="{ background: 'var(--nexora-bg, #0f172a)' }"
        >
          <!-- Panel header -->
          <div class="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p class="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Diente {{ selectedTooth }}</p>
              <p class="text-sm font-medium text-white mt-0.5">{{ toothName(selectedTooth) }}</p>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 hover:bg-white/10 hover:text-white transition"
              aria-label="Cerrar panel"
              @click="closePanel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Panel body -->
          <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

            <!-- Existing findings -->
            <div v-if="(entriesByTooth.get(selectedTooth) ?? []).length > 0" class="flex flex-col gap-2">
              <p class="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Hallazgos registrados</p>
              <div
                v-for="entry in entriesByTooth.get(selectedTooth)"
                :key="entry.id"
                class="rounded-xl border border-white/10 px-3 py-2.5 flex flex-col gap-1.5"
                :class="consultationEntryIds.has(entry.id) ? 'border-violet-500/30 bg-violet-500/5' : ''"
              >
                <div class="flex items-center gap-2 flex-wrap">
                  <span v-if="entry.surface" class="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                    {{ surfaceLabels[entry.surface] ?? entry.surface }}
                  </span>
                  <span class="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/80">
                    {{ findingTypeLabels[entry.finding_type] ?? entry.finding_type }}
                  </span>
                  <span class="rounded-full px-2 py-0.5 text-[10px]" :class="statusColors[entry.finding_status] ?? 'bg-gray-500/20 text-gray-300'">
                    {{ statusLabels[entry.finding_status] ?? entry.finding_status }}
                  </span>
                  <span class="rounded-full px-2 py-0.5 text-[10px]" :class="priorityColors[entry.priority] ?? 'bg-gray-500/10 text-gray-400'">
                    {{ priorityLabels[entry.priority] ?? entry.priority }}
                  </span>
                </div>
                <p v-if="entry.observation" class="text-xs text-white/60">{{ entry.observation }}</p>
                <div class="flex items-center justify-between mt-0.5">
                  <span class="text-[10px] text-white/30">{{ new Date(entry.created_at).toLocaleDateString('es-AR') }}</span>
                  <button
                    v-if="!readonly && consultationEntryIds.has(entry.id) && consultationId"
                    class="text-[10px] text-red-400 hover:text-red-300 transition"
                    aria-label="Eliminar hallazgo"
                    @click="removeEntry(entry)"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>

            <div
              v-else
              class="rounded-xl border border-white/5 px-4 py-6 text-center text-xs text-white/30"
            >
              Sin hallazgos para este diente
            </div>

            <!-- Add finding form -->
            <template v-if="!readonly && consultationId">
              <div class="border-t border-white/10 pt-4 flex flex-col gap-3">
                <p class="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Registrar hallazgo</p>

                <div class="flex flex-col gap-1">
                  <label class="text-xs text-white/50">Superficie</label>
                  <select
                    v-model="formSurface"
                    class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                  >
                    <option value="">Sin especificar</option>
                    <option value="mesial">Mesial</option>
                    <option value="distal">Distal</option>
                    <option value="vestibular">Vestibular</option>
                    <option value="lingual">Lingual / Palatino</option>
                    <option value="occlusal">Oclusal</option>
                    <option value="complete">Completo</option>
                  </select>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-xs text-white/50">Tipo de hallazgo <span class="text-red-400">*</span></label>
                  <select
                    v-model="formFindingType"
                    class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                  >
                    <option value="caries">Caries</option>
                    <option value="restoration">Restauracion</option>
                    <option value="extraction">Extraccion</option>
                    <option value="fracture">Fractura</option>
                    <option value="sealant">Sellador</option>
                    <option value="crown">Corona</option>
                    <option value="implant">Implante</option>
                    <option value="absence">Ausencia</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-white/50">Estado</label>
                    <select
                      v-model="formFindingStatus"
                      class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                    >
                      <option value="active">Activa</option>
                      <option value="resolved">Resuelta</option>
                      <option value="planned">Planificada</option>
                    </select>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs text-white/50">Prioridad</label>
                    <select
                      v-model="formPriority"
                      class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                    >
                      <option value="urgent">Urgente</option>
                      <option value="high">Alta</option>
                      <option value="normal">Normal</option>
                      <option value="low">Baja</option>
                    </select>
                  </div>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-xs text-white/50">Observacion</label>
                  <textarea
                    v-model="formObservation"
                    rows="2"
                    placeholder="Detalle clinico opcional..."
                    class="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/20"
                  ></textarea>
                </div>

                <p v-if="formError" class="text-xs text-red-400">{{ formError }}</p>

                <button
                  class="nxr-btn-primary w-full rounded-2xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-40"
                  :disabled="formSaving"
                  @click="saveEntry"
                >
                  {{ formSaving ? 'Guardando...' : 'Guardar hallazgo' }}
                </button>
              </div>
            </template>

          </div>

          <div class="border-t border-white/10 bg-black/20 px-5 py-4">
            <button type="button" class="nxr-btn nxr-btn-secondary w-full" @click="closePanel">
              Cancelar
            </button>
          </div>

          <div
            v-if="showDiscardWarning"
            class="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="odontogram-discard-title"
            aria-describedby="odontogram-discard-description"
          >
            <div class="w-full rounded-2xl border border-white/15 bg-slate-950 p-5 shadow-2xl">
              <h3
                id="odontogram-discard-title"
                ref="warningTitle"
                tabindex="-1"
                class="text-base font-semibold text-white outline-none"
              >
                Cambios sin guardar
              </h3>
              <p id="odontogram-discard-description" class="mt-2 text-sm text-white/65">
                Al cerrar, se eliminará la información ingresada en este formulario. Puede conservar el borrador para continuar más tarde, descartarlo y restablecer el formulario, o continuar editando.
              </p>
              <div class="mt-5 flex flex-col gap-2">
                <button type="button" class="nxr-btn nxr-btn-primary" @click="keepFindingDraftAndClose">
                  Conservar borrador y cerrar
                </button>
                <button
                  type="button"
                  class="nxr-btn border border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25"
                  @click="discardFindingDraftAndClose"
                >
                  Descartar y cerrar
                </button>
                <button type="button" class="nxr-btn nxr-btn-secondary" @click="showDiscardWarning = false">
                  Continuar editando
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Backdrop -->
      <transition name="fade">
        <div
          v-if="panelVisible"
          class="fixed inset-0 z-40 bg-black/40"
          @click.self="closePanel"
        ></div>
      </transition>

    </template>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
