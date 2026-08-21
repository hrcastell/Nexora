<script setup lang="ts">
import { computed } from 'vue';
import { useVisualConfigStore } from '../stores/visualConfig';

const props = defineProps<{
  open: boolean;
  title: string;
  eyebrow?: string;
  size?: 'sm' | 'md' | 'lg';
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'max-w-md';
    case 'lg': return 'max-w-4xl';
    default: return 'max-w-2xl';
  }
});

const close = () => emit('close');

// Teleported to <body>, outside .nxr-app-shell — the app's usual
// [data-nexora-mode="light"] class overrides can't reach it, so this
// computes its own colors from the store directly (same pattern as
// InfoModal.vue / ConfirmActionModal.vue).
const configStore = useVisualConfigStore();
const isLight = computed(() => configStore.mode === 'light');
const modalBg = computed(() => isLight.value
  ? 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.99))'
  : 'linear-gradient(180deg, rgba(12,22,45,0.96), rgba(8,16,31,0.99))');
const modalBorder = computed(() => isLight.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)');
const headerColor = computed(() => isLight.value ? '#0f172a' : '#ffffff');
const mutedColor = computed(() => isLight.value ? '#475569' : '#94a3b8');
const closeBg = computed(() => isLight.value ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)');
const closeBorder = computed(() => isLight.value ? 'rgba(0, 0, 0, 0.10)' : 'rgba(255, 255, 255, 0.10)');

// CloseIcon component
const CloseIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>` };
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="nxr-teleport-scope fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      >
        <!-- Backdrop click to close -->
        <div class="absolute inset-0" @click="close" />

        <!-- Modal Content -->
        <div
          :class="[
            'relative z-10 w-full rounded-[30px] p-6 shadow-2xl shadow-black/40 sm:p-8',
            sizeClasses
          ]"
          :style="{ background: modalBg, border: `1px solid ${modalBorder}` }"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-4">
            <div>
              <p v-if="eyebrow" class="text-sm font-medium text-[#d4af37]">{{ eyebrow }}</p>
              <h3 class="mt-2 text-2xl font-semibold" :style="{ color: headerColor }">{{ title }}</h3>
            </div>
            <button
              type="button"
              @click="close"
              class="app-modal-hover rounded-2xl p-2 transition"
              :style="{ backgroundColor: closeBg, border: `1px solid ${closeBorder}`, color: mutedColor }"
            >
              <CloseIcon />
            </button>
          </div>

          <!-- Body -->
          <div class="app-modal-body mt-6">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Teleported to <body>, outside .nxr-app-shell — plain [data-nexora-mode]
   (set on <body> itself) still reaches it. */
.app-modal-hover:hover { background-color: rgba(255, 255, 255, 0.10) !important; }
[data-nexora-mode="light"] .app-modal-hover:hover { background-color: rgba(0, 0, 0, 0.06) !important; }

/* Light-mode overrides for slotted modal body content (inputs, section/card
   containers, borders, text) live centrally in style.css under the
   `.nxr-teleport-scope` selector (the class on this modal's Teleported
   root above) — shared with NxrSlidePanel.vue and any future Teleported
   component instead of duplicated per-component. */
</style>
