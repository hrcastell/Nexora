<script setup lang="ts">
import { X as XIcon } from 'lucide-vue-next'

interface Props {
  open: boolean
  title: string
  eyebrow?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

withDefaults(defineProps<Props>(), {
  size: 'md'
})

const emit = defineEmits<{
  close: []
}>()

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
        @click.self="emit('close')"
      >
        <div
          :class="panelClasses"
          :style="{ background: 'var(--nexora-glass-bg)' }"
        >
          <!-- Header with title + close button -->
          <header class="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/20 px-6 py-4 backdrop-blur-xl">
            <div>
              <p v-if="eyebrow" class="text-xs text-white/50 mb-1">{{ eyebrow }}</p>
              <h2 class="text-lg font-semibold text-white">{{ title }}</h2>
            </div>
            <button
              @click="emit('close')"
              class="rounded-xl p-2 hover:bg-white/10 transition"
              aria-label="Cerrar"
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
            v-if="$slots.footer"
            class="sticky bottom-0 flex gap-3 border-t border-white/10 bg-black/20 px-6 py-4 backdrop-blur-xl"
          >
            <slot name="footer" />
          </footer>
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
