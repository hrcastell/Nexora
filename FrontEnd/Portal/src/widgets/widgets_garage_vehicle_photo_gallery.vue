<script setup lang="ts">
import { ref, computed } from 'vue';
import { Upload, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import type { VehiclePhoto } from '../types/garage';

const props = defineProps<{
  vehicleId: number;
  photos: VehiclePhoto[];
  disabled?: boolean;
  maxPhotos?: number;
}>();

const emit = defineEmits<{
  (e: 'upload', file: File, stage: 'entry' | 'delivery'): void;
  (e: 'delete', photoId: number): void;
}>();

const MAX = computed(() => props.maxPhotos ?? 8);
const canAdd = computed(() => props.photos.length < MAX.value);

const entryPhotos    = computed(() => props.photos.filter(p => p.stage === 'entry'));
const deliveryPhotos = computed(() => props.photos.filter(p => p.stage === 'delivery'));

const lightboxPhoto = ref<VehiclePhoto | null>(null);
const activeStage   = ref<'entry' | 'delivery'>('entry');
const fileInput     = ref<HTMLInputElement | null>(null);

const apiBase = computed(() => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url.replace(/\/api.*$/, '');
  }
});

function photoSrc(photo: VehiclePhoto) {
  if (photo.photo_url.startsWith('blob:')) return photo.photo_url;
  if (photo.photo_url.startsWith('http')) return photo.photo_url;
  return `${apiBase.value}${photo.photo_url}`;
}

function onPhotoError(e: Event) {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
  const parent = img.parentElement;
  if (parent && !parent.querySelector('.photo-error')) {
    const msg = document.createElement('div');
    msg.className = 'photo-error w-full h-full flex items-center justify-center nxr-text-soft text-xs';
    msg.textContent = 'Sin imagen';
    parent.appendChild(msg);
  }
}

function openUpload(stage: 'entry' | 'delivery') {
  if (props.disabled || !canAdd.value) return;
  activeStage.value = stage;
  fileInput.value?.click();
}

function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  const file   = target.files?.[0];
  if (!file) return;
  emit('upload', file, activeStage.value);
  if (target) target.value = '';
}

function openLightbox(photo: VehiclePhoto) {
  lightboxPhoto.value = photo;
}

function closeLightbox() {
  lightboxPhoto.value = null;
}

function navLightbox(dir: 1 | -1) {
  if (!lightboxPhoto.value) return;
  const allPhotos = props.photos;
  const idx = allPhotos.findIndex(p => p.id === lightboxPhoto.value!.id);
  const next = allPhotos[(idx + dir + allPhotos.length) % allPhotos.length];
  lightboxPhoto.value = next;
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between text-xs nxr-text-muted">
      <span>{{ photos.length }} / {{ MAX }} fotos</span>
      <span v-if="!canAdd" class="text-yellow-400">Límite alcanzado</span>
    </div>

    <div v-for="(group, stage) in [{ label: 'Ingreso del vehículo', stage: 'entry' as const, photos: entryPhotos }, { label: 'Listo para entrega', stage: 'delivery' as const, photos: deliveryPhotos }]" :key="stage" class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold nxr-text">{{ group.label }}</span>
        <button
          v-if="!disabled && canAdd"
          type="button"
          class="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 nxr-text-muted transition-colors"
          @click="openUpload(group.stage)"
        >
          <Upload :size="12" />
          Agregar foto
        </button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div
          v-for="photo in group.photos"
          :key="photo.id"
          class="relative aspect-square rounded-xl overflow-hidden cursor-pointer group border border-white/10 hover:border-white/30 transition-all"
          @click="openLightbox(photo)"
        >
          <img :src="photoSrc(photo)" :alt="photo.caption || 'Foto'" class="w-full h-full object-cover" @error="onPhotoError" />
          <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <button
              v-if="!disabled"
              type="button"
              class="p-1 rounded-full bg-red-500/80 hover:bg-red-500 text-white"
              @click.stop="emit('delete', photo.id)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>

        <div
          v-if="group.photos.length === 0"
          class="aspect-square rounded-xl border border-dashed border-white/20 flex items-center justify-center nxr-text-soft text-xs cursor-pointer hover:border-white/40 transition-colors"
          @click="openUpload(group.stage)"
        >
          Sin fotos
        </div>
      </div>
    </div>

    <input ref="fileInput" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" class="hidden" @change="onFileSelected" />

    <Teleport to="body">
      <div
        v-if="lightboxPhoto"
        class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
        @click.self="closeLightbox"
      >
        <button class="absolute top-4 right-4 text-white/70 hover:text-white" @click="closeLightbox"><X :size="24" /></button>
        <button class="absolute left-4 text-white/70 hover:text-white" @click="navLightbox(-1)"><ChevronLeft :size="32" /></button>
        <button class="absolute right-4 text-white/70 hover:text-white" @click="navLightbox(1)"><ChevronRight :size="32" /></button>
        <img :src="photoSrc(lightboxPhoto)" class="max-w-4xl max-h-[80vh] object-contain rounded-xl" @error="onPhotoError" />
        <div v-if="lightboxPhoto.caption" class="absolute bottom-6 text-white/60 text-sm">{{ lightboxPhoto.caption }}</div>
      </div>
    </Teleport>
  </div>
</template>
