<script setup lang="ts">
import { computed } from 'vue';

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
        class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      >
        <!-- Backdrop click to close -->
        <div class="absolute inset-0" @click="close" />

        <!-- Modal Content -->
        <div
          :class="[
            'relative z-10 w-full rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,22,45,0.96),rgba(8,16,31,0.99))] p-6 shadow-2xl shadow-black/40 sm:p-8',
            sizeClasses
          ]"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-4">
            <div>
              <p v-if="eyebrow" class="text-sm font-medium text-[#d4af37]">{{ eyebrow }}</p>
              <h3 class="mt-2 text-2xl font-semibold text-white">{{ title }}</h3>
            </div>
            <button
              type="button"
              @click="close"
              class="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
            >
              <CloseIcon />
            </button>
          </div>

          <!-- Body -->
          <div class="mt-6">
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
