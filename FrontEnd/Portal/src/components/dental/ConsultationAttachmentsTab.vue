<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dentalConsultationAttachmentsService } from '../../services/dentalConsultationAttachmentsService'
import type { DentalConsultationAttachment, AttachmentCategory } from '../../types/dental'
import { ATTACHMENT_CATEGORY_LABELS } from '../../types/dental'

const props = withDefaults(defineProps<{
  consultationId: number
  readOnly?: boolean
}>(), { readOnly: false })

// ── State ─────────────────────────────────────────────────────
const attachments = ref<DentalConsultationAttachment[]>([])
const loading     = ref(false)
const uploading   = ref(false)
const error       = ref<string | null>(null)
const success     = ref<string | null>(null)

// Upload form
const fileInput    = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const uploadCategory    = ref<AttachmentCategory>('general')
const uploadDescription = ref('')

const CATEGORY_ICON: Record<AttachmentCategory, string> = {
  xray:         '🦴',
  lab_result:   '🧪',
  prescription: '💊',
  consent:      '📋',
  referral:     '📤',
  general:      '📎',
}

const CATEGORY_OPTIONS = (Object.keys(ATTACHMENT_CATEGORY_LABELS) as AttachmentCategory[]).map(k => ({
  value: k,
  label: ATTACHMENT_CATEGORY_LABELS[k],
}))

function normalizeAttachments(value: unknown): DentalConsultationAttachment[] {
  return Array.isArray(value) ? value : []
}

// ── Toast helpers ─────────────────────────────────────────────
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showSuccess(msg: string) {
  success.value = msg
  error.value   = null
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { success.value = null }, 4000)
}
function showError(msg: string) {
  error.value   = msg
  success.value = null
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { error.value = null }, 5000)
}

// ── Data loading ───────────────────────────────────────────────
async function loadAttachments() {
  loading.value = true
  error.value   = null
  try {
    const { data } = await dentalConsultationAttachmentsService.list(props.consultationId)
    attachments.value = normalizeAttachments(data?.data)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } }; message?: string }
    showError(err?.response?.data?.error || err?.message || 'Error al cargar los adjuntos')
  } finally {
    loading.value = false
  }
}

onMounted(loadAttachments)

// ── Upload ─────────────────────────────────────────────────────
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

async function handleUpload() {
  if (!selectedFile.value) return
  uploading.value = true
  error.value = null
  try {
    const { data } = await dentalConsultationAttachmentsService.upload(
      props.consultationId,
      selectedFile.value,
      uploadCategory.value,
      uploadDescription.value || undefined
    )
    if (data?.data) attachments.value.unshift(data.data)
    selectedFile.value = null
    uploadCategory.value    = 'general'
    uploadDescription.value = ''
    if (fileInput.value) fileInput.value.value = ''
    showSuccess('Archivo adjuntado correctamente')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } }; message?: string }
    showError(err?.response?.data?.error || err?.message || 'Error al subir el archivo')
  } finally {
    uploading.value = false
  }
}

// ── Delete ─────────────────────────────────────────────────────
async function handleRemove(attachment: DentalConsultationAttachment) {
  if (!window.confirm(`¿Eliminar el archivo "${attachment.file_name}"?`)) return
  try {
    await dentalConsultationAttachmentsService.remove(props.consultationId, attachment.id)
    attachments.value = attachments.value.filter(a => a.id !== attachment.id)
    showSuccess('Archivo eliminado')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } }; message?: string }
    showError(err?.response?.data?.error || err?.message || 'Error al eliminar el archivo')
  }
}

// ── Helpers ────────────────────────────────────────────────────
function openUrl(url: string) {
  window.open(url, '_blank')
}

function isImage(attachment: DentalConsultationAttachment) {
  if (attachment.file_type) return attachment.file_type.startsWith('image/')
  const ext = attachment.file_name.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext ?? '')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="space-y-6">

    <!-- Toast notifications -->
    <transition name="fade">
      <div v-if="success" class="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-sm">
        <span>✓</span><span>{{ success }}</span>
      </div>
    </transition>
    <transition name="fade">
      <div v-if="error" class="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
        <span>✕</span><span>{{ error }}</span>
      </div>
    </transition>

    <!-- Upload form -->
    <div v-if="!readOnly" class="rounded-xl bg-white/5 border border-white/10 p-4 space-y-4">
      <h3 class="text-sm font-medium text-white/70 uppercase tracking-wide">Adjuntar archivo</h3>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- File picker -->
        <div>
          <label class="block text-xs text-white/50 mb-1">Archivo</label>
          <input
            ref="fileInput"
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            class="block w-full text-sm text-white/70
                   file:mr-3 file:py-1.5 file:px-3
                   file:rounded-lg file:border-0
                   file:text-xs file:font-medium
                   file:bg-white/10 file:text-white/70
                   hover:file:bg-white/20
                   cursor-pointer"
            @change="onFileChange"
          />
          <p v-if="selectedFile" class="mt-1 text-xs text-white/40 truncate">{{ selectedFile.name }}</p>
        </div>

        <!-- Category -->
        <div>
          <label class="block text-xs text-white/50 mb-1">Categoría</label>
          <select
            v-model="uploadCategory"
            class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20"
          >
            <option v-for="opt in CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">
              {{ CATEGORY_ICON[opt.value] }} {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-xs text-white/50 mb-1">Descripción (opcional)</label>
        <input
          v-model="uploadDescription"
          type="text"
          placeholder="Ej: Radiografía panorámica inicial"
          class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>

      <button
        :disabled="!selectedFile || uploading"
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/80 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        @click="handleUpload"
      >
        <svg v-if="uploading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span>{{ uploading ? 'Subiendo...' : 'Adjuntar' }}</span>
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-12 text-white/40 text-sm gap-2">
      <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <span>Cargando adjuntos...</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading && attachments.length === 0" class="flex flex-col items-center justify-center py-12 text-white/30 gap-2">
      <span class="text-4xl">📎</span>
      <p class="text-sm">No hay archivos adjuntos</p>
    </div>

    <!-- Attachments list -->
    <div v-else class="space-y-2">
      <div
        v-for="attachment in attachments"
        :key="attachment.id"
        class="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-3 hover:bg-white/[0.07] transition-colors"
      >
        <!-- Icon / preview -->
        <div class="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
          <img
            v-if="isImage(attachment)"
            :src="attachment.file_url"
            :alt="attachment.file_name"
            class="w-full h-full object-cover cursor-pointer"
            @click="openUrl(attachment.file_url)"
          />
          <span v-else class="text-lg">{{ CATEGORY_ICON[attachment.category] }}</span>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <a
              :href="attachment.file_url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm font-medium text-white/80 hover:text-white truncate max-w-xs underline decoration-white/30 hover:decoration-white transition-colors"
            >
              {{ attachment.file_name }}
            </a>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/50">
              {{ CATEGORY_ICON[attachment.category] }} {{ ATTACHMENT_CATEGORY_LABELS[attachment.category] }}
            </span>
          </div>
          <p v-if="attachment.description" class="text-xs text-white/50 mt-0.5 truncate">{{ attachment.description }}</p>
          <p class="text-xs text-white/30 mt-0.5">
            {{ formatDate(attachment.created_at) }}
            <span v-if="attachment.file_size_bytes"> · {{ formatSize(attachment.file_size_bytes) }}</span>
          </p>
        </div>

        <!-- Actions -->
        <div class="flex-shrink-0 flex items-center gap-1">
          <a
            :href="attachment.file_url"
            target="_blank"
            rel="noopener noreferrer"
            class="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
            title="Abrir en nueva pestaña"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
          <button
            v-if="!readOnly"
            class="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
            title="Eliminar"
            @click="handleRemove(attachment)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
