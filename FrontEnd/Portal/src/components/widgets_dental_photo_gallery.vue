<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDentalConsultationsStore } from '../stores/dentalConsultations'
import api from '../utils/axios'
import { Upload, X as XIcon, ZoomIn } from 'lucide-vue-next'

interface DentalConsultationPhoto {
  id: number | string
  consultation_id: number | string
  photo_url: string
  stage: 'before' | 'after'
  caption?: string
  created_at: string
}

const props = withDefaults(defineProps<{
  consultationId: number | string
  readonly?: boolean
}>(), { readonly: false })

const store = useDentalConsultationsStore()
const baseUrl = (api.defaults.baseURL ?? '').replace('/api', '')

const beforePhotos = ref<DentalConsultationPhoto[]>([])
const afterPhotos  = ref<DentalConsultationPhoto[]>([])
const loading      = ref(false)
const error        = ref<string | null>(null)
const lightboxUrl  = ref<string | null>(null)

async function loadPhotos() {
  loading.value = true
  error.value = null
  try {
    const all = await store.listPhotos(props.consultationId) as DentalConsultationPhoto[]
    beforePhotos.value = all.filter(p => p.stage === 'before')
    afterPhotos.value  = all.filter(p => p.stage === 'after')
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al cargar las fotos'
  } finally {
    loading.value = false
  }
}

async function handleUpload(event: Event, stage: 'before' | 'after') {
  const input = event.target as HTMLInputElement
  const file  = input.files?.[0]
  if (!file) return
  try {
    await store.uploadPhoto(props.consultationId, file, stage)
    await loadPhotos()
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al subir la foto'
  } finally {
    input.value = ''
  }
}

async function handleDelete(photo: DentalConsultationPhoto) {
  try {
    await store.deletePhoto(props.consultationId, photo.id)
    if (photo.stage === 'before') {
      beforePhotos.value = beforePhotos.value.filter(p => p.id !== photo.id)
    } else {
      afterPhotos.value = afterPhotos.value.filter(p => p.id !== photo.id)
    }
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al eliminar la foto'
  }
}

function openLightbox(photo: DentalConsultationPhoto) {
  lightboxUrl.value = baseUrl + photo.photo_url
}

function closeLightbox() {
  lightboxUrl.value = null
}

onMounted(loadPhotos)
</script>

<template>
  <div class="space-y-4">
    <!-- Error -->
    <p v-if="error" class="text-red-400 text-sm px-1">{{ error }}</p>

    <!-- Loading skeletons -->
    <template v-if="loading">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="i in 2" :key="i" class="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div class="h-4 w-16 rounded bg-white/10 animate-pulse" />
          <div class="grid grid-cols-2 gap-2">
            <div v-for="j in 4" :key="j" class="aspect-square rounded-lg bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>
    </template>

    <!-- Content -->
    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Section: Antes -->
        <div class="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-white/70 uppercase tracking-wide">Antes</h3>
            <label v-if="!readonly" class="cursor-pointer flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-xs text-white/70">
              <Upload class="h-3.5 w-3.5" />
              <span>Subir</span>
              <input type="file" accept="image/*" class="hidden" @change="e => handleUpload(e, 'before')" />
            </label>
          </div>

          <div v-if="beforePhotos.length === 0" class="py-6 text-center text-white/30 text-sm">
            Sin fotos
          </div>
          <div v-else class="grid grid-cols-2 gap-2">
            <div
              v-for="photo in beforePhotos"
              :key="photo.id"
              class="relative group aspect-square rounded-lg overflow-hidden border border-white/10 cursor-pointer"
              @click="openLightbox(photo)"
            >
              <img
                :src="baseUrl + photo.photo_url"
                :alt="photo.caption || 'Foto antes'"
                class="w-full h-full object-cover transition group-hover:scale-105"
              />
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                <ZoomIn class="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition" />
              </div>
              <button
                v-if="!readonly"
                class="absolute top-1 right-1 rounded-full bg-black/60 hover:bg-red-500/80 p-0.5 opacity-0 group-hover:opacity-100 transition"
                @click.stop="handleDelete(photo)"
                aria-label="Eliminar foto"
              >
                <XIcon class="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>

        <!-- Section: Después -->
        <div class="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-white/70 uppercase tracking-wide">Después</h3>
            <label v-if="!readonly" class="cursor-pointer flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-xs text-white/70">
              <Upload class="h-3.5 w-3.5" />
              <span>Subir</span>
              <input type="file" accept="image/*" class="hidden" @change="e => handleUpload(e, 'after')" />
            </label>
          </div>

          <div v-if="afterPhotos.length === 0" class="py-6 text-center text-white/30 text-sm">
            Sin fotos
          </div>
          <div v-else class="grid grid-cols-2 gap-2">
            <div
              v-for="photo in afterPhotos"
              :key="photo.id"
              class="relative group aspect-square rounded-lg overflow-hidden border border-white/10 cursor-pointer"
              @click="openLightbox(photo)"
            >
              <img
                :src="baseUrl + photo.photo_url"
                :alt="photo.caption || 'Foto después'"
                class="w-full h-full object-cover transition group-hover:scale-105"
              />
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                <ZoomIn class="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition" />
              </div>
              <button
                v-if="!readonly"
                class="absolute top-1 right-1 rounded-full bg-black/60 hover:bg-red-500/80 p-0.5 opacity-0 group-hover:opacity-100 transition"
                @click.stop="handleDelete(photo)"
                aria-label="Eliminar foto"
              >
                <XIcon class="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Lightbox -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="lightboxUrl"
          class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          @click="closeLightbox"
        >
          <button
            class="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 p-2 transition"
            @click="closeLightbox"
            aria-label="Cerrar"
          >
            <XIcon class="h-5 w-5 text-white" />
          </button>
          <img
            :src="lightboxUrl"
            alt="Foto ampliada"
            class="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
            @click.stop
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
