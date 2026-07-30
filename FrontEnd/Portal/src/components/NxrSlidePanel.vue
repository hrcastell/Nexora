<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X as XIcon } from 'lucide-vue-next'
import {
  cloneDraftValue,
  deleteSlidePanelDraft,
  draftValuesEqual,
  restoreDraftState,
  saveSlidePanelDraft,
  takeSlidePanelDraft
} from '../utils/slidePanelDrafts'
import { useAuthStore } from '../stores/auth'

interface Props {
  open: boolean
  title: string
  eyebrow?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  draftKey?: string
  draftEntity?: string | number | null
  draftState?: Record<string, unknown>
  draftSetters?: Record<string, (value: any) => void>
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const emit = defineEmits<{
  close: []
}>()
const auth = useAuthStore()

const initialState = ref<unknown>()
const showDiscardWarning = ref(false)
const warningTitle = ref<HTMLHeadingElement | null>(null)
let preserveDraftOnClose = false
let activeDraftKey: string | undefined

function resolveDraftKey() {
  if (!props.draftKey) return undefined
  const entity = props.draftEntity ?? 'singleton'
  const scope = `${auth.user?.id ?? 'anonymous'}:${auth.currentCompany?.schema_name ?? auth.currentCompany?.id ?? 'global'}`
  return `${scope}:${props.draftKey}:${entity}`
}

watch(() => props.open, async (open) => {
  if (!open) {
    document.removeEventListener('keydown', onKeydown)
    showDiscardWarning.value = false
    initialState.value = undefined
    if (!preserveDraftOnClose && activeDraftKey) deleteSlidePanelDraft(activeDraftKey)
    preserveDraftOnClose = false
    activeDraftKey = undefined
    return
  }

  document.addEventListener('keydown', onKeydown)

  await nextTick()
  const current = cloneDraftValue(props.draftState ?? {})
  activeDraftKey = resolveDraftKey()
  const saved = activeDraftKey ? takeSlidePanelDraft(activeDraftKey) : undefined
  if (saved && props.draftState) {
    restoreDraftState(props.draftState, saved.value as Record<string, unknown>, props.draftSetters)
    initialState.value = cloneDraftValue(saved.initial)
  } else {
    initialState.value = current
  }
}, { immediate: true })

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  // The nested discard dialog owns Escape while it is open.
  if (showDiscardWarning.value) return
  event.stopPropagation()
  requestCancel()
}

function requestCancel() {
  const current = cloneDraftValue(props.draftState ?? {})
  if (!props.draftState || draftValuesEqual(current, initialState.value)) {
    emit('close')
    return
  }
  showDiscardWarning.value = true
  nextTick(() => warningTitle.value?.focus())
}

function keepDraftAndClose() {
  if (activeDraftKey && props.draftState) {
    saveSlidePanelDraft(activeDraftKey, {
      initial: initialState.value,
      value: props.draftState
    })
    preserveDraftOnClose = true
  }
  showDiscardWarning.value = false
  emit('close')
}

function discardAndClose() {
  if (activeDraftKey) deleteSlidePanelDraft(activeDraftKey)
  if (props.draftState && initialState.value) {
    restoreDraftState(
      props.draftState,
      initialState.value as Record<string, unknown>,
      props.draftSetters
    )
  }
  showDiscardWarning.value = false
  emit('close')
}

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

const panelClasses = [
  'h-full border-l border-white/10 shadow-2xl overflow-y-auto flex flex-col',
  'w-[80vw] max-w-[80vw] lg:w-[40vw] lg:max-w-[40vw]'
].join(' ')
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-panel">
      <div
        v-if="open"
        class="fixed inset-0 z-40 bg-black/70 flex items-stretch justify-end"
        @click.self="requestCancel"
      >
        <div
          :class="panelClasses"
          :style="{ background: 'var(--nexora-glass-bg)' }"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <!-- Header with title + close button -->
          <header class="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/20 px-6 py-4 backdrop-blur-xl">
            <div>
              <p v-if="eyebrow" class="text-xs text-white/50 mb-1">{{ eyebrow }}</p>
              <h2 class="text-lg font-semibold text-white">{{ title }}</h2>
            </div>
            <button
              type="button"
              class="rounded-xl p-2 hover:bg-white/10 transition"
              aria-label="Cerrar"
              @click="requestCancel"
            >
              <XIcon class="h-5 w-5 text-white/60" />
            </button>
          </header>

          <!-- Body (scrollable) -->
          <div class="nxr-slide-panel-body flex-1 overflow-y-auto px-6 py-6">
            <slot />
          </div>

          <!-- Footer (optional, sticky at bottom) -->
          <footer
            class="sticky bottom-0 flex gap-3 border-t border-white/10 bg-black/20 px-6 py-4 backdrop-blur-xl"
          >
            <button type="button" class="nxr-btn nxr-btn-secondary" @click="requestCancel">
              Cancelar
            </button>
            <slot name="footer" />
          </footer>

          <div
            v-if="showDiscardWarning"
            class="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="slide-panel-discard-title"
            aria-describedby="slide-panel-discard-description"
          >
            <div class="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950 p-5 shadow-2xl">
              <h3
                id="slide-panel-discard-title"
                ref="warningTitle"
                tabindex="-1"
                class="text-base font-semibold text-white outline-none"
              >
                Cambios sin guardar
              </h3>
              <p id="slide-panel-discard-description" class="mt-2 text-sm text-white/65">
                Al cerrar, se eliminará la información ingresada en este formulario. Puede conservar el borrador para continuar más tarde, descartarlo y restablecer el formulario, o continuar editando.
              </p>
              <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button type="button" class="nxr-btn nxr-btn-primary" @click="keepDraftAndClose">
                  Conservar borrador y cerrar
                </button>
                <button
                  type="button"
                  class="nxr-btn border border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25"
                  @click="discardAndClose"
                >
                  Descartar y cerrar
                </button>
                <button
                  type="button"
                  class="nxr-btn nxr-btn-secondary"
                  @click="showDiscardWarning = false"
                >
                  Continuar editando
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.nxr-slide-panel-body :deep(.grid:not(.nxr-garage-form-grid)) {
  grid-template-columns: minmax(0, 1fr) !important;
}

.nxr-slide-panel-body :deep(.nxr-garage-form-grid) {
  grid-template-columns: minmax(0, 1fr) !important;
}

.nxr-slide-panel-body :deep(.nxr-garage-form-grid > *) {
  grid-column: auto !important;
  min-width: 0;
}

.nxr-slide-panel-body :deep(.nxr-garage-form-grid > .nxr-garage-form-section) {
  grid-column: 1 / -1 !important;
}

@media (min-width: 768px) {
  .nxr-slide-panel-body :deep(.nxr-garage-form-grid) {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: all 0.3s ease;
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  opacity: 0;
}

.slide-panel-enter-from > div,
.slide-panel-leave-to > div {
  transform: translateX(100%);
}

.slide-panel-enter-active > div,
.slide-panel-leave-active > div {
  transition: transform 0.3s ease;
}
</style>
