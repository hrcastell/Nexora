<script setup lang="ts">
import { ref, computed } from 'vue';
import { Camera, Trash2, Upload } from 'lucide-vue-next';

const props = defineProps<{
  photoUrl: string | null;
  altText?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'upload', file: File): void;
  (e: 'delete'): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const previewUrl   = ref<string | null>(props.photoUrl);
const dragging     = ref(false);

const apiBase = computed(() =>
  (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '')
);

const displayUrl = computed(() => {
  if (previewUrl.value?.startsWith('blob:')) return previewUrl.value;
  if (previewUrl.value) return `${apiBase.value}${previewUrl.value}`;
  return null;
});

function openPicker() {
  if (!props.disabled) fileInput.value?.click();
}

function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  const file   = target.files?.[0];
  if (!file) return;
  previewUrl.value = URL.createObjectURL(file);
  emit('upload', file);
  if (target) target.value = '';
}

function onDrop(e: DragEvent) {
  dragging.value = false;
  if (props.disabled) return;
  const file = e.dataTransfer?.files[0];
  if (!file) return;
  previewUrl.value = URL.createObjectURL(file);
  emit('upload', file);
}

function onDelete() {
  previewUrl.value = null;
  emit('delete');
}

defineExpose({ setPreview: (url: string | null) => { previewUrl.value = url; } });
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div
      class="relative w-28 h-28 rounded-full border-2 cursor-pointer overflow-hidden flex items-center justify-center transition-all"
      :class="[
        dragging ? 'border-[var(--nexora-primary)] scale-105' : 'border-white/20',
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--nexora-primary)]',
      ]"
      :style="{ background: 'var(--nexora-glass-bg)' }"
      @click="openPicker"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <img v-if="displayUrl" :src="displayUrl" :alt="altText || 'Foto'" class="w-full h-full object-cover" />
      <div v-else class="flex flex-col items-center gap-1 text-white/40">
        <Camera :size="28" />
        <span class="text-xs">Subir foto</span>
      </div>

      <div v-if="displayUrl && !disabled" class="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
        <Upload :size="22" class="text-white" />
      </div>
    </div>

    <input ref="fileInput" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" class="hidden" @change="onFileSelected" />

    <button
      v-if="displayUrl && !disabled"
      type="button"
      class="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors font-['RobotoThin']"
      @click.stop="onDelete"
    >
      <Trash2 :size="13" />
      Eliminar foto
    </button>
  </div>
</template>
