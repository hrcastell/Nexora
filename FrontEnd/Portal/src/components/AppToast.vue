<script setup lang="ts">
import { onMounted } from 'vue';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

const props = defineProps<{
  toast: ToastItem;
}>()

const emit = defineEmits<{
  (e: 'close', id: number): void
}>()

onMounted(() => {
  // Auto-close after 4.5 seconds
  setTimeout(() => {
    emit('close', props.toast.id);
  }, 4500);
});

const theme = computed(() => {
  const isLight = document.documentElement.getAttribute('data-nexora-mode') === 'light';
  
  switch (props.toast.type) {
    case 'success':
      return {
        ring: 'border-emerald-500/30',
        bg: isLight ? 'bg-emerald-500/15' : 'bg-emerald-400/10',
        icon: 'text-emerald-600',
      };
    case 'warning':
      return {
        ring: 'border-amber-500/30',
        bg: isLight ? 'bg-amber-500/15' : 'bg-[#d4af37]/10',
        icon: 'text-amber-600',
      };
    case 'error':
      return {
        ring: 'border-rose-500/30',
        bg: isLight ? 'bg-rose-500/15' : 'bg-rose-400/10',
        icon: 'text-rose-600',
      };
    default:
      return {
        ring: 'border-violet-500/30',
        bg: isLight ? 'bg-violet-500/15' : 'bg-violet-400/10',
        icon: 'text-violet-600',
      };
  }
});

// Icons
const CheckIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M20 7L9 18l-5-5"/></svg>` };
const AlertIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.8L2.9 17a2 2 0 001.7 3h14.8a2 2 0 001.7-3L13.7 3.8a2 2 0 00-3.4 0z"/></svg>` };
const XCircleIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/></svg>` };
const InfoIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5"><circle cx="12" cy="12" r="9"/><path d="M12 10v5"/><path d="M12 7h.01"/></svg>` };
const CloseIcon = { template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>` };

const IconComponent = computed(() => {
  switch (props.toast.type) {
    case 'success': return CheckIcon;
    case 'warning': return AlertIcon;
    case 'error': return XCircleIcon;
    default: return InfoIcon;
  }
});

const close = () => emit('close', props.toast.id);

import { computed } from 'vue';
</script>

<template>
  <div 
    :class="[
      'pointer-events-auto w-full rounded-[24px] border p-4 shadow-xl backdrop-blur-xl toast-in',
      'bg-white/95 dark:bg-[#0b1326]/95',
      'shadow-black/10 dark:shadow-black/30',
      theme.ring,
    ]"
  >
    <div class="flex items-start gap-3">
      <div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', theme.bg, theme.icon]">
        <component :is="IconComponent" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-slate-800 dark:text-white">{{ toast.title }}</p>
            <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ toast.message }}</p>
          </div>
          <button
            type="button"
            @click="close"
            class="rounded-xl p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes toastIn {
  from { opacity: 0; transform: translateY(-8px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.toast-in { animation: toastIn .22s ease-out; }
</style>
