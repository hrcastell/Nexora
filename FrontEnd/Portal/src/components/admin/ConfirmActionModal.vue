<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-vue-next';
import { useVisualConfigStore } from '../../stores/visualConfig';

const props = withDefaults(defineProps<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}>(), {
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  variant: 'warning',
});

const emit = defineEmits<{
  (e: 'confirmed'): void;
  (e: 'cancelled'): void;
}>();

const configStore = useVisualConfigStore();
const isLight = computed(() => configStore.mode === 'light');

const modalBg = computed(() => isLight.value ? 'rgba(255, 255, 255, 0.98)' : 'rgba(11, 19, 38, 0.98)');
const modalBorder = computed(() => isLight.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.10)');
const headerColor = computed(() => isLight.value ? '#0f172a' : '#ffffff');
const mutedColor = computed(() => isLight.value ? '#475569' : '#94a3b8');

const isProcessing = ref(false);

watch(() => props.isOpen, (open) => {
  if (open) {
    isProcessing.value = false;
  }
});

const handleConfirm = () => {
  isProcessing.value = true;
  emit('confirmed');
};

const handleCancel = () => {
  emit('cancelled');
};

const variantConfig = computed(() => {
  switch (props.variant) {
    case 'danger':
      return {
        icon: AlertTriangle,
        iconBg: 'bg-red-500/15',
        iconColor: 'text-red-400',
        buttonBg: 'bg-red-600 hover:bg-red-700',
        buttonDisabled: 'bg-red-600/50',
      };
    case 'warning':
      return {
        icon: AlertCircle,
        iconBg: 'bg-amber-500/15',
        iconColor: 'text-amber-400',
        buttonBg: 'bg-amber-600 hover:bg-amber-700',
        buttonDisabled: 'bg-amber-600/50',
      };
    case 'info':
      return {
        icon: Info,
        iconBg: 'bg-blue-500/15',
        iconColor: 'text-blue-400',
        buttonBg: 'bg-blue-600 hover:bg-blue-700',
        buttonDisabled: 'bg-blue-600/50',
      };
  }
});
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="absolute inset-0" @click="handleCancel" />
      <div class="relative w-full max-w-md rounded-3xl border shadow-2xl p-6"
           :style="{ backgroundColor: modalBg, borderColor: modalBorder }">
        
        <!-- Close -->
        <button @click="handleCancel" class="absolute top-4 right-4 rounded-xl p-1.5 hover:bg-white/10 transition"
                :style="{ color: mutedColor }">
          <X class="h-5 w-5" />
        </button>

        <!-- Icon -->
        <div class="flex justify-center mb-4">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl" :class="variantConfig.iconBg">
            <component :is="variantConfig.icon" class="h-7 w-7" :class="variantConfig.iconColor" />
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

        <!-- Actions -->
        <div class="mt-6 flex gap-3">
          <button @click="handleCancel"
            :disabled="isProcessing"
            class="flex-1 rounded-2xl border px-4 py-2.5 text-sm font-medium transition hover:bg-white/5 disabled:opacity-40"
            :style="{ borderColor: modalBorder, color: mutedColor }">
            {{ cancelText }}
          </button>
          <button @click="handleConfirm"
            :disabled="isProcessing"
            class="flex-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-40"
            :class="isProcessing ? variantConfig.buttonDisabled : variantConfig.buttonBg">
            <Loader2 v-if="isProcessing" class="h-4 w-4 animate-spin" />
            {{ isProcessing ? 'Procesando...' : confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
