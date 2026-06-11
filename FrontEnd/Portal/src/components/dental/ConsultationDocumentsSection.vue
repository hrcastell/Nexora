<template>
  <div class="space-y-4">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-xs text-white/40 uppercase tracking-wide font-semibold">Documentos médicos</p>
      <button
        v-if="!readOnly"
        class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white bg-[var(--nexora-primary)] hover:opacity-90 transition"
        @click="toggleForm"
      >
        <Plus class="h-3.5 w-3.5" />
        Generar documento
      </button>
    </div>

    <!-- Inline form -->
    <div
      v-if="showForm"
      class="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4"
    >
      <p class="text-sm font-semibold text-white">Nuevo documento</p>

      <!-- document_type -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs text-white/50">Tipo de documento *</label>
        <select
          v-model="form.document_type"
          class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
        >
          <option value="" disabled>Seleccionar tipo</option>
          <option
            v-for="(label, key) in MEDICAL_DOCUMENT_TYPE_LABELS"
            :key="key"
            :value="key"
          >{{ label }}</option>
        </select>
      </div>

      <!-- document_date -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs text-white/50">Fecha *</label>
        <input
          v-model="form.document_date"
          type="date"
          class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
        />
      </div>

      <!-- title -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs text-white/50">Título</label>
        <input
          v-model="form.title"
          type="text"
          placeholder="Ej: Informe post-operatorio"
          class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
        />
      </div>

      <!-- Professional fields -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Profesional</label>
          <input
            v-model="form.professional_name"
            type="text"
            placeholder="Nombre del profesional"
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Matrícula</label>
          <input
            v-model="form.professional_license"
            type="text"
            placeholder="N° matrícula"
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Especialidad</label>
          <input
            v-model="form.professional_specialty"
            type="text"
            placeholder="Especialidad"
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
      </div>

      <!-- Dynamic content section -->
      <div v-if="form.document_type === 'medical_report'" class="flex flex-col gap-1.5">
        <label class="text-xs text-white/50">Diagnóstico y tratamiento</label>
        <textarea
          v-model="form.content"
          rows="5"
          placeholder="Describa el diagnóstico y tratamiento realizado..."
          class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"
        ></textarea>
      </div>

      <div v-else-if="form.document_type === 'medical_certificate'" class="flex flex-col gap-1.5">
        <label class="text-xs text-white/50">Texto de la constancia</label>
        <textarea
          v-model="form.content"
          rows="5"
          placeholder="Se hace constar que el/la paciente fue atendido/a..."
          class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"
        ></textarea>
      </div>

      <div v-else-if="form.document_type === 'prescription'" class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-xs text-white/50">Medicamentos</label>
          <button
            type="button"
            class="flex items-center gap-1 text-xs text-white/60 hover:text-white transition"
            @click="addMedication"
          >
            <Plus class="h-3 w-3" />
            Agregar
          </button>
        </div>
        <div
          v-for="(med, idx) in medications"
          :key="idx"
          class="grid grid-cols-4 gap-2 items-start"
        >
          <input
            v-model="med.name"
            type="text"
            placeholder="Medicamento"
            class="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30"
          />
          <input
            v-model="med.dose"
            type="text"
            placeholder="Dosis"
            class="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30"
          />
          <input
            v-model="med.frequency"
            type="text"
            placeholder="Frecuencia"
            class="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30"
          />
          <div class="flex gap-1.5">
            <input
              v-model="med.duration"
              type="text"
              placeholder="Duración"
              class="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-white/30"
            />
            <button
              type="button"
              class="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/5 transition"
              @click="removeMedication(idx)"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div v-if="medications.length === 0" class="text-xs text-white/30 italic">
          Sin medicamentos. Presioná "Agregar" para añadir uno.
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Indicaciones</label>
          <textarea
            v-model="instructions"
            rows="3"
            placeholder="Indicaciones generales para el paciente..."
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"
          ></textarea>
        </div>
      </div>

      <!-- Form error -->
      <p v-if="formError" class="text-xs text-red-400">{{ formError }}</p>

      <!-- Actions -->
      <div class="flex gap-2 justify-end pt-1">
        <button
          type="button"
          class="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition"
          @click="cancelForm"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="saving"
          class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[var(--nexora-primary)] hover:opacity-90 transition disabled:opacity-50"
          @click="saveDocument"
        >
          {{ saving ? 'Guardando...' : 'Guardar documento' }}
        </button>
      </div>
    </div>

    <!-- Document list -->
    <div v-if="loading" class="py-8 text-center text-sm text-white/30">Cargando documentos...</div>

    <div
      v-else-if="documents.length === 0 && !showForm"
      class="py-8 text-center rounded-xl border border-white/10 bg-white/5"
    >
      <FileText class="mx-auto mb-3 h-8 w-8 text-white/20" />
      <p class="text-sm text-white/30">No hay documentos para esta consulta.</p>
    </div>

    <div
      v-for="doc in documents"
      :key="doc.id"
      class="flex items-start gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition-all"
    >
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span
            class="px-2 py-0.5 rounded-full text-xs font-medium"
            :class="MEDICAL_DOCUMENT_TYPE_COLORS[doc.document_type]"
          >
            {{ MEDICAL_DOCUMENT_TYPE_LABELS[doc.document_type] }}
          </span>
          <span class="text-xs font-mono text-white/60">{{ doc.document_number }}</span>
          <span class="text-xs text-white/30">{{ fmtDate(doc.document_date) }}</span>
        </div>
        <p v-if="doc.title" class="mt-1 text-sm text-white truncate">{{ doc.title }}</p>
        <p v-if="doc.professional_name" class="mt-0.5 text-xs text-white/40">
          Prof: {{ doc.professional_name }}
          <span v-if="doc.professional_license"> · Mat: {{ doc.professional_license }}</span>
        </p>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/60 bg-white/5 hover:bg-white/10 transition"
          :disabled="printingId === doc.id"
          @click="handlePrint(doc)"
        >
          <Printer class="h-3.5 w-3.5" />
          {{ printingId === doc.id ? '...' : 'Imprimir' }}
        </button>
        <button
          v-if="!readOnly"
          class="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/5 transition"
          @click="confirmDelete(doc)"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- Delete confirm -->
    <div
      v-if="docToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click.self="docToDelete = null"
    >
      <div class="rounded-2xl border border-white/10 bg-[var(--nexora-glass-bg)] p-6 max-w-sm w-full mx-4">
        <p class="text-sm text-white font-semibold mb-1">Eliminar documento</p>
        <p class="text-xs text-white/50 mb-5">
          ¿Eliminar "{{ docToDelete.document_number }}"? Esta acción no se puede deshacer.
        </p>
        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-2 rounded-xl text-xs text-white/60 bg-white/5 hover:bg-white/10 transition"
            @click="docToDelete = null"
          >Cancelar</button>
          <button
            class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-500/80 hover:bg-red-500 transition"
            :disabled="deleting"
            @click="deleteDocument"
          >{{ deleting ? 'Eliminando...' : 'Eliminar' }}</button>
        </div>
      </div>
    </div>

    <!-- Print overlay -->
    <div v-if="isPrinting && printData" class="fixed inset-0 z-[9999] bg-white print:block hidden">
      <MedicalDocumentPrintLayout
        :document="printData.document"
        :patient="printData.patient"
        :config="printData.config"
      />
    </div>

    <AppToast
      v-for="t in toasts"
      :key="t.id"
      :toast="t"
      @close="removeToast"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Plus, Trash2, Printer, FileText } from 'lucide-vue-next';
import AppToast from '../AppToast.vue';
import MedicalDocumentPrintLayout from './MedicalDocumentPrintLayout.vue';
import { useToast } from '../../composables/useToast';
import { usePrint } from '../../composables/usePrint';
import { dentalMedicalDocumentsService } from '../../services/dentalMedicalDocumentsService';
import type { DentalMedicalDocument, PrescriptionMedication } from '../../types/dental';
import { MEDICAL_DOCUMENT_TYPE_LABELS, MEDICAL_DOCUMENT_TYPE_COLORS } from '../../types/dental';

// ─── Props ────────────────────────────────────────────────────────────────────
const props = withDefaults(defineProps<{
  consultationId: number;
  customerId: number;
  readOnly?: boolean;
}>(), { readOnly: false });

// ─── Emits ────────────────────────────────────────────────────────────────────
const emit = defineEmits<{ (e: 'created', doc: DentalMedicalDocument): void }>();

// ─── Composables ──────────────────────────────────────────────────────────────
const { toasts, triggerToast, removeToast } = useToast();
const { isPrinting, printElement } = usePrint();

// ─── State ────────────────────────────────────────────────────────────────────
const documents   = ref<DentalMedicalDocument[]>([]);
const loading     = ref(false);
const showForm    = ref(false);
const saving      = ref(false);
const formError   = ref<string | null>(null);
const deleting    = ref(false);
const docToDelete = ref<DentalMedicalDocument | null>(null);
const printingId  = ref<number | null>(null);
const printData   = ref<{ document: DentalMedicalDocument; patient: Record<string, unknown>; config: Record<string, unknown> } | null>(null);

// ─── Form state ───────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);

const form = ref({
  document_type:          '' as '' | 'medical_report' | 'medical_certificate' | 'prescription',
  document_date:          today,
  title:                  '',
  content:                '',
  professional_name:      '',
  professional_license:   '',
  professional_specialty: '',
});

const medications   = ref<PrescriptionMedication[]>([]);
const instructions  = ref('');

// ─── Methods ─────────────────────────────────────────────────────────────────
function fmtDate(d: string | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function loadDocuments() {
  loading.value = true;
  try {
    const res = await dentalMedicalDocumentsService.getForConsultation(props.consultationId);
    documents.value = res.data.data ?? [];
  } catch {
    // silently ignore initial load errors — already in a tab panel
  } finally {
    loading.value = false;
  }
}

function toggleForm() {
  showForm.value = !showForm.value;
  if (!showForm.value) resetForm();
}

function cancelForm() {
  showForm.value = false;
  resetForm();
}

function resetForm() {
  form.value = {
    document_type:          '',
    document_date:          today,
    title:                  '',
    content:                '',
    professional_name:      '',
    professional_license:   '',
    professional_specialty: '',
  };
  medications.value  = [];
  instructions.value = '';
  formError.value    = null;
}

function addMedication() {
  medications.value.push({ name: '', dose: '', frequency: '', duration: '' });
}

function removeMedication(idx: number) {
  medications.value.splice(idx, 1);
}

async function saveDocument() {
  formError.value = null;

  if (!form.value.document_type) {
    formError.value = 'Seleccioná un tipo de documento.';
    return;
  }

  saving.value = true;
  try {
    let content: string | undefined;

    if (form.value.document_type === 'prescription') {
      content = JSON.stringify({
        medications: medications.value,
        instructions: instructions.value,
      });
    } else {
      content = form.value.content || undefined;
    }

    const payload = {
      customer_id:            props.customerId,
      consultation_id:        props.consultationId,
      document_type:          form.value.document_type,
      document_date:          form.value.document_date || undefined,
      title:                  form.value.title || undefined,
      content,
      professional_name:      form.value.professional_name || undefined,
      professional_license:   form.value.professional_license || undefined,
      professional_specialty: form.value.professional_specialty || undefined,
    };

    const res = await dentalMedicalDocumentsService.create(payload);
    documents.value.unshift(res.data.data);
    emit('created', res.data.data);
    triggerToast('Documento generado', res.data.data.document_number, 'success');
    cancelForm();
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    formError.value = e?.response?.data?.error || 'Error al guardar el documento.';
  } finally {
    saving.value = false;
  }
}

function confirmDelete(doc: DentalMedicalDocument) {
  docToDelete.value = doc;
}

async function deleteDocument() {
  if (!docToDelete.value) return;
  deleting.value = true;
  try {
    await dentalMedicalDocumentsService.remove(docToDelete.value.id);
    documents.value = documents.value.filter(d => d.id !== docToDelete.value!.id);
    triggerToast('Documento eliminado', '', 'success');
  } catch {
    triggerToast('Error', 'No se pudo eliminar el documento.', 'error');
  } finally {
    deleting.value    = false;
    docToDelete.value = null;
  }
}

async function handlePrint(doc: DentalMedicalDocument) {
  printingId.value = doc.id;
  try {
    const res = await dentalMedicalDocumentsService.getPrintData(doc.id);
    printData.value = res.data.data;
    await printElement('dental-print-target');
  } catch {
    triggerToast('Error', 'No se pudo cargar el documento para imprimir.', 'error');
  } finally {
    printingId.value = null;
    printData.value  = null;
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(loadDocuments);
</script>
