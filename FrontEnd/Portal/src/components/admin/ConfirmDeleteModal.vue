<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X, AlertTriangle, Loader2 } from 'lucide-vue-next';
import { useVisualConfigStore } from '../../stores/visualConfig';

const props = defineProps<{
  isOpen: boolean;
  entityName: string;
  entityType?: string;
  description?: string;
}>();

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
const inputBg = computed(() => isLight.value ? '#ffffff' : 'rgba(255, 255, 255, 0.05)');
const inputBorder = computed(() => isLight.value ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.12)');

const confirmText = ref('');
const isDeleting = ref(false);

const canConfirm = computed(() => confirmText.value.trim() === props.entityName.trim());

watch(() => props.isOpen, (open) => {
  if (open) {
    confirmText.value = '';
    isDeleting.value = false;
  }
});

const handleConfirm = () => {
  if (!canConfirm.value) return;
  isDeleting.value = true;
  emit('confirmed');
};

const handleCancel = () => {
  confirmText.value = '';
  emit('cancelled');
};
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
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15">
            <AlertTriangle class="h-7 w-7 text-red-400" />
          </div>
        </div>

        <!-- Title -->
        <h3 class="text-lg font-semibold text-center" :style="{ color: headerColor }">
          {{ entityType ? `Eliminar ${entityType}` : 'Confirmar eliminación' }}
        </h3>

        <!-- Description -->
        <p class="mt-2 text-sm text-center" :style="{ color: mutedColor }">
          {{ description || `Esta acción es irreversible. Se eliminará permanentemente "${entityName}" y todos sus datos asociados.` }}
        </p>

        <!-- Confirm input -->
        <div class="mt-5">
          <label class="block text-xs font-medium mb-2" :style="{ color: mutedColor }">
            Escribe <span class="font-bold" :style="{ color: headerColor }">{{ entityName }}</span> para confirmar
          </label>
          <input 
            v-model="confirmText"
            type="text"
            class="w-full rounded-2xl border px-3 py-2.5 text-sm focus:outline-none transition"
            :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }"
            :placeholder="entityName"
            @keyup.enter="handleConfirm"
          />
        </div>

        <!-- Actions -->
        <div class="mt-5 flex gap-3">
          <button @click="handleCancel"
            class="flex-1 rounded-2xl border px-4 py-2.5 text-sm font-medium transition hover:bg-white/5"
            :style="{ borderColor: modalBorder, color: mutedColor }">
            Cancelar
          </button>
          <button @click="handleConfirm"
            :disabled="!canConfirm || isDeleting"
            class="flex-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-40"
            :class="canConfirm && !isDeleting ? 'bg-red-600 hover:bg-red-700' : 'bg-red-600/50'">
            <Loader2 v-if="isDeleting" class="h-4 w-4 animate-spin" />
            {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
