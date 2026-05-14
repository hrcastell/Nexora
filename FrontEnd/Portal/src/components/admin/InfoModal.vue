<script setup lang="ts">
import { computed, watch } from 'vue';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-vue-next';
import { useVisualConfigStore } from '../../stores/visualConfig';

const props = withDefaults(defineProps<{
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  autoClose?: boolean;
  autoCloseDelay?: number;
}>(), {
  type: 'info',
  autoClose: false,
  autoCloseDelay: 3000,
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const configStore = useVisualConfigStore();
const isLight = computed(() => configStore.mode === 'light');

const modalBg = computed(() => isLight.value ? 'rgba(255, 255, 255, 0.98)' : 'rgba(11, 19, 38, 0.98)');
const modalBorder = computed(() => isLight.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)');
const headerColor = computed(() => isLight.value ? '#0f172a' : '#ffffff');
const mutedColor = computed(() => isLight.value ? '#475569' : '#94a3b8');

let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

watch(() => props.isOpen, (open) => {
  if (open && props.autoClose) {
    autoCloseTimer = setTimeout(() => {
      handleClose();
    }, props.autoCloseDelay);
  } else if (!open && autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
});

const handleClose = () => {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
  emit('close');
};

const typeConfig = computed(() => {
  switch (props.type) {
    case 'success':
      return {
        icon: CheckCircle,
        iconBg: 'bg-emerald-500/15',
        iconColor: 'text-emerald-400',
        buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        iconBg: 'bg-amber-500/15',
        iconColor: 'text-amber-400',
        buttonBg: 'bg-amber-600 hover:bg-amber-700',
      };
    case 'error':
      return {
        icon: XCircle,
        iconBg: 'bg-red-500/15',
        iconColor: 'text-red-400',
        buttonBg: 'bg-red-600 hover:bg-red-700',
      };
    case 'info':
      return {
        icon: Info,
        iconBg: 'bg-blue-500/15',
        iconColor: 'text-blue-400',
        buttonBg: 'bg-blue-600 hover:bg-blue-700',
      };
  }
});
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="absolute inset-0" @click="handleClose" />
      <div class="relative w-full max-w-md rounded-3xl border shadow-2xl p-6"
           :style="{ backgroundColor: modalBg, borderColor: modalBorder }">
        
        <!-- Close -->
        <button @click="handleClose" class="absolute top-4 right-4 rounded-xl p-1.5 hover:bg-white/10 transition"
                :style="{ color: mutedColor }">
          <X class="h-5 w-5" />
        </button>

        <!-- Icon -->
        <div class="flex justify-center mb-4">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl" :class="typeConfig.iconBg">
            <component :is="typeConfig.icon" class="h-7 w-7" :class="typeConfig.iconColor" />
          </div>
        </div>

        <!-- Title -->
        <h3 class="text-lg font-semibold text-center" :style="{ color: headerColor }">
          {{ title }}
        </h3>

        <!-- Message -->
        <p class="mt-2 text-sm text-center leading-relaxed" :style="{ color: mutedColor }">
          {{ message }}
        </p>

        <!-- Action -->
        <div class="mt-6">
          <button @click="handleClose"
            class="w-full rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition"
            :class="typeConfig.buttonBg">
            Entendido
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
