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
  'h-full shadow-2xl overflow-y-auto flex flex-col',
  'w-[80vw] max-w-[80vw] lg:w-[40vw] lg:max-w-[40vw]'
].join(' ')
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-panel">
      <div
        v-if="open"
        class="nxr-teleport-scope fixed inset-0 z-40 bg-black/70 flex items-stretch justify-end"
        @click.self="requestCancel"
      >
        <div
          :class="panelClasses"
          :style="{ background: 'var(--nexora-glass-bg)', borderLeft: '1px solid var(--nexora-border-color)' }"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <!-- Header with title + close button -->
          <header class="nxr-slide-panel-header sticky top-0 z-10 flex items-center justify-between px-6 py-4 backdrop-blur-xl" :style="{ background: 'var(--nexora-glass-bg-strong)', borderBottom: '1px solid var(--nexora-border-color)' }">
            <div>
              <p v-if="eyebrow" class="text-xs nxr-text-soft mb-1">{{ eyebrow }}</p>
              <h2 class="text-lg font-semibold nxr-text">{{ title }}</h2>
            </div>
            <button
              type="button"
              class="nxr-slide-panel-hover rounded-xl p-2 transition"
              aria-label="Cerrar"
              @click="requestCancel"
            >
              <XIcon class="h-5 w-5 nxr-text-muted" />
            </button>
          </header>

          <!-- Body (scrollable) -->
          <div class="nxr-slide-panel-body flex-1 overflow-y-auto px-6 py-6">
            <slot />
          </div>

          <!-- Footer (optional, sticky at bottom) -->
          <footer
            class="sticky bottom-0 flex gap-3 px-6 py-4 backdrop-blur-xl"
            :style="{ background: 'var(--nexora-glass-bg-strong)', borderTop: '1px solid var(--nexora-border-color)' }"
          >
            <button type="button" class="nxr-btn nxr-btn-secondary" @click="requestCancel">
              Cancelar
            </button>
            <slot name="footer" />
          </footer>

          <Transition name="discard-warning">
            <div
              v-if="showDiscardWarning"
              class="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-4"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="slide-panel-discard-title"
              aria-describedby="slide-panel-discard-description"
            >
              <div
                class="discard-warning-card w-full max-w-md rounded-2xl p-5 shadow-2xl"
                :style="{ background: 'var(--nexora-glass-bg-strong)', border: '1px solid var(--nexora-border-color)' }"
              >
                <h3
                  id="slide-panel-discard-title"
                  ref="warningTitle"
                  tabindex="-1"
                  class="text-base font-semibold nxr-text outline-none"
                >
                  Cambios sin guardar
                </h3>
                <p id="slide-panel-discard-description" class="mt-2 text-sm nxr-text-muted">
                  Al cerrar, se eliminará la información ingresada en este formulario. Puede conservar el borrador para continuar más tarde, descartarlo y restablecer el formulario, o continuar editando.
                </p>
                <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button type="button" class="nxr-btn nxr-btn-primary" @click="keepDraftAndClose">
                    Conservar borrador y cerrar
                  </button>
                  <button
                    type="button"
                    class="nxr-btn border border-red-500/40 bg-red-500/15 hover:bg-red-500/25"
                    style="color: var(--nexora-danger-text)"
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
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Teleported to <body>, outside .nxr-app-shell — plain [data-nexora-mode]
   (set on <body> itself) still reaches it, unlike the app-shell-scoped
   override used for regular in-flow content. */
.nxr-slide-panel-hover:hover { background-color: rgba(255, 255, 255, 0.10); }
[data-nexora-mode="light"] .nxr-slide-panel-hover:hover { background-color: rgba(0, 0, 0, 0.06); }

/* Light-mode overrides for every module's create/edit form rendered inside
   this shell (via <slot />) — inputs, section/card containers, borders,
   text — live centrally in style.css under the `.nxr-teleport-scope`
   selector (the class on this panel's Teleported root above), not here.
   Kept centralized instead of :deep()'d locally because the exact same
   ruleset also needs to cover AppModal.vue and any future Teleported
   component; see style.css "LIGHT MODE OVERRIDES" for why. */

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

.discard-warning-enter-active,
.discard-warning-leave-active {
  transition: opacity 0.18s ease;
}

.discard-warning-enter-from,
.discard-warning-leave-to {
  opacity: 0;
}

.discard-warning-enter-active .discard-warning-card,
.discard-warning-leave-active .discard-warning-card {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.discard-warning-enter-from .discard-warning-card,
.discard-warning-leave-to .discard-warning-card {
  opacity: 0;
  transform: translateY(6px) scale(0.97);
}
</style>
