<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Plus, Trash2, Printer, Send, CheckCircle2, XCircle, RefreshCw, Edit2 } from 'lucide-vue-next';
import AppToast from '../../components/AppToast.vue';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import QuotePrintLayout from '../../components/dental/QuotePrintLayout.vue';
import { useToast } from '../../composables/useToast';
import { usePrint } from '../../composables/usePrint';
import { dentalQuotesService } from '../../services/dentalQuotesService';
import { useDentalTreatmentsStore } from '../../stores/dentalTreatments';
import type { DentalQuote, DentalQuoteItem, DentalQuoteItemFormData, DentalTreatment } from '../../types/dental';
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '../../types/dental';

const route  = useRoute();
const router = useRouter();
const id     = Number(route.params.id);
const { toasts, triggerToast, removeToast } = useToast();
const { isPrinting, printElement } = usePrint();
const treatmentsStore = useDentalTreatmentsStore();

const quote       = ref<DentalQuote | null>(null);
const printData   = ref<{ customer: Record<string, unknown>; config: Record<string, unknown> } | null>(null);
const loading     = ref(false);
const loadError   = ref<string | null>(null);
const actionLoading = ref(false);

// Add item panel
const showAddItem = ref(false);
const addItemError = ref<string | null>(null);
const savingItem   = ref(false);
const itemForm = ref<DentalQuoteItemFormData>({
  treatment_name_snapshot: '',
  unit_price: 0,
  quantity: 1,
  sort_order: 0,
});
const selectedTreatment = ref<DentalTreatment | null>(null);

// Edit quote panel
const showEdit    = ref(false);
const editError   = ref<string | null>(null);
const savingEdit  = ref(false);
const editForm    = ref({ valid_until: '', notes: '', conditions_text: '', discount_amount: 0 });

// Accept panel
const showAccept     = ref(false);
const acceptError    = ref<string | null>(null);
const savingAccept   = ref(false);
const acceptForm     = ref({ accepted_by_name: '', acceptance_notes: '' });

// Reject panel
const showReject     = ref(false);
const rejectError    = ref<string | null>(null);
const savingReject   = ref(false);
const rejectForm     = ref({ rejection_reason: '' });

const isDraft     = computed(() => quote.value?.status === 'draft');
const isSent      = computed(() => quote.value?.status === 'sent');
const isAccepted  = computed(() => quote.value?.status === 'accepted');


function fmt(n: number | undefined | null) {
  return `$${Math.round(n ?? 0).toLocaleString('es-AR')}`;
}

function fmtDate(iso: string | undefined | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function load() {
  loading.value = true;
  loadError.value = null;
  try {
    const res = await dentalQuotesService.getById(id);
    quote.value = res.data.data;
  } catch (e: any) {
    loadError.value = e?.response?.data?.error || 'Error al cargar presupuesto';
  } finally {
    loading.value = false;
  }
}

async function loadPrintData() {
  try {
    const res = await dentalQuotesService.getPrintData(id);
    printData.value = { customer: res.data.data.customer, config: res.data.data.config };
    return true;
  } catch (e: any) {
    printData.value = null;
    triggerToast('Error', e?.response?.data?.error || 'No se pudieron cargar los datos para imprimir', 'error');
    return false;
  }
}

function onTreatmentSelect(treatmentId: string | number) {
  const trt = treatmentsStore.items.find(t => String(t.id) === String(treatmentId));
  selectedTreatment.value = trt || null;
  if (trt) {
    itemForm.value.treatment_name_snapshot = trt.name;
    itemForm.value.unit_price = trt.final_price;
  }
}

function openAddItem() {
  itemForm.value = { treatment_name_snapshot: '', unit_price: 0, quantity: 1, sort_order: quote.value?.items?.length ?? 0 };
  selectedTreatment.value = null;
  addItemError.value = null;
  showAddItem.value = true;
}

async function saveItem() {
  if (!itemForm.value.treatment_name_snapshot) {
    addItemError.value = 'El nombre del tratamiento es requerido.';
    return;
  }
  savingItem.value = true;
  addItemError.value = null;
  try {
    const res = await dentalQuotesService.addItem(id, itemForm.value);
    quote.value = res.data.data;
    showAddItem.value = false;
    triggerToast('Éxito', 'Ítem agregado', 'success');
  } catch (e: any) {
    addItemError.value = e?.response?.data?.error || 'Error al agregar ítem';
    triggerToast('Error', e?.response?.data?.error || 'Error al agregar ítem', 'error');
  } finally {
    savingItem.value = false;
  }
}

async function removeItem(item: DentalQuoteItem) {
  if (!isDraft.value) return;
  actionLoading.value = true;
  try {
    const res = await dentalQuotesService.removeItem(id, item.id);
    quote.value = res.data.data;
    triggerToast('Éxito', 'Ítem eliminado', 'success');
  } catch (e: any) {
    triggerToast('Error', e?.response?.data?.error || 'Error al eliminar ítem', 'error');
  } finally {
    actionLoading.value = false;
  }
}

function openEdit() {
  if (!quote.value) return;
  editForm.value = {
    valid_until:     quote.value.valid_until ?? '',
    notes:           quote.value.notes ?? '',
    conditions_text: quote.value.conditions_text ?? '',
    discount_amount: quote.value.discount_amount ?? 0,
  };
  editError.value = null;
  showEdit.value = true;
}

async function saveEdit() {
  savingEdit.value = true;
  editError.value = null;
  try {
    const payload: Record<string, unknown> = {};
    if (editForm.value.valid_until)     payload.valid_until     = editForm.value.valid_until;
    if (editForm.value.notes !== undefined)           payload.notes           = editForm.value.notes;
    if (editForm.value.conditions_text !== undefined) payload.conditions_text = editForm.value.conditions_text;
    if (editForm.value.discount_amount !== undefined) payload.discount_amount = editForm.value.discount_amount;
    const res = await dentalQuotesService.update(id, payload);
    quote.value = res.data.data;
    showEdit.value = false;
    triggerToast('Éxito', 'Presupuesto actualizado', 'success');
  } catch (e: any) {
    editError.value = e?.response?.data?.error || 'Error al actualizar presupuesto';
    triggerToast('Error', e?.response?.data?.error || 'Error al actualizar', 'error');
  } finally {
    savingEdit.value = false;
  }
}

async function sendQuote() {
  actionLoading.value = true;
  try {
    const res = await dentalQuotesService.send(id);
    quote.value = res.data.data;
    triggerToast('Éxito', 'Presupuesto enviado', 'success');
  } catch (e: any) {
    triggerToast('Error', e?.response?.data?.error || 'Error al enviar presupuesto', 'error');
  } finally {
    actionLoading.value = false;
  }
}

async function saveAccept() {
  if (!acceptForm.value.accepted_by_name) {
    acceptError.value = 'El nombre es requerido.';
    return;
  }
  savingAccept.value = true;
  acceptError.value = null;
  try {
    const res = await dentalQuotesService.accept(id, {
      accepted_by_name: acceptForm.value.accepted_by_name,
      acceptance_notes: acceptForm.value.acceptance_notes || undefined,
    });
    quote.value = res.data.data;
    showAccept.value = false;
    triggerToast('Éxito', 'Presupuesto aceptado', 'success');
  } catch (e: any) {
    acceptError.value = e?.response?.data?.error || 'Error al aceptar presupuesto';
    triggerToast('Error', e?.response?.data?.error || 'Error al aceptar', 'error');
  } finally {
    savingAccept.value = false;
  }
}

async function saveReject() {
  savingReject.value = true;
  rejectError.value = null;
  try {
    const res = await dentalQuotesService.reject(id, {
      rejection_reason: rejectForm.value.rejection_reason || undefined,
    });
    quote.value = res.data.data;
    showReject.value = false;
    triggerToast('Éxito', 'Presupuesto rechazado', 'success');
  } catch (e: any) {
    rejectError.value = e?.response?.data?.error || 'Error al rechazar presupuesto';
    triggerToast('Error', e?.response?.data?.error || 'Error al rechazar', 'error');
  } finally {
    savingReject.value = false;
  }
}

async function convertToConsultation() {
  actionLoading.value = true;
  try {
    const res = await dentalQuotesService.convertToConsultation(id);
    quote.value = res.data.data.quote;
    triggerToast('Éxito', 'Consulta creada', 'success');
    router.push(`/dental/consultations/${res.data.data.consultation_id}`);
  } catch (e: any) {
    triggerToast('Error', e?.response?.data?.error || 'Error al convertir', 'error');
  } finally {
    actionLoading.value = false;
  }
}

async function print() {
  if (!await loadPrintData()) return;
  const printed = await printElement('dental-print-target');
  if (!printed) triggerToast('Error', 'No se pudo preparar el documento para imprimir', 'error');
}

onMounted(async () => {
  await load();
  await treatmentsStore.load();
});
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <!-- Header -->
    <div class="flex items-center gap-3 flex-wrap">
      <button class="text-white/40 hover:text-white transition-colors shrink-0" @click="router.back()">
        <ArrowLeft :size="20" />
      </button>
      <div class="flex-1 min-w-0">
        <div v-if="loading" class="h-5 w-48 bg-white/5 animate-pulse rounded-lg"></div>
        <template v-else-if="quote">
          <div class="flex items-center gap-3 flex-wrap">
            <h1 class="text-xl font-semibold text-white font-mono">{{ quote.quote_number }}</h1>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="QUOTE_STATUS_COLORS[quote.status]">
              {{ QUOTE_STATUS_LABELS[quote.status] }}
            </span>
          </div>
          <p class="text-sm text-white/50 mt-0.5">{{ quote.customer_first_name }} {{ quote.customer_last_name }}</p>
        </template>
      </div>

      <!-- Action buttons -->
      <template v-if="quote && !loading">
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Draft actions -->
          <template v-if="isDraft">
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-white/70 hover:bg-white/20 transition"
              :disabled="actionLoading"
              @click="openAddItem"
            >
              <Plus :size="13" /> Agregar ítem
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-white/70 hover:bg-white/20 transition"
              :disabled="actionLoading"
              @click="openEdit"
            >
              <Edit2 :size="13" /> Editar
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition"
              :disabled="actionLoading"
              @click="sendQuote"
            >
              <Send :size="13" /> Enviar
            </button>
          </template>

          <!-- Sent actions -->
          <template v-if="isSent">
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-500/20 text-green-300 hover:bg-green-500/30 transition"
              :disabled="actionLoading"
              @click="showAccept = true; acceptForm = { accepted_by_name: '', acceptance_notes: '' }; acceptError = null"
            >
              <CheckCircle2 :size="13" /> Aceptar
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/20 text-red-300 hover:bg-red-500/30 transition"
              :disabled="actionLoading"
              @click="showReject = true; rejectForm = { rejection_reason: '' }; rejectError = null"
            >
              <XCircle :size="13" /> Rechazar
            </button>
          </template>

          <!-- Accepted actions -->
          <template v-if="isAccepted">
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition"
              :disabled="actionLoading"
              @click="convertToConsultation"
            >
              <RefreshCw :size="13" /> Convertir a Consulta
            </button>
          </template>

          <!-- Print (accepted, rejected, expired, converted) -->
          <button
            v-if="!isDraft"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-white/70 hover:bg-white/20 transition"
            :disabled="isPrinting"
            @click="print"
          >
            <Printer :size="13" /> Imprimir
          </button>
        </div>
      </template>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-3">
      <div class="h-24 rounded-2xl bg-white/5 animate-pulse"></div>
      <div class="h-40 rounded-2xl bg-white/5 animate-pulse"></div>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="text-center text-red-400 py-10 text-sm">{{ loadError }}</div>

    <template v-else-if="quote">
      <!-- Info cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="p-4 rounded-2xl border border-white/10 flex flex-col gap-1" :style="{ background: 'var(--nexora-glass-bg)' }">
          <p class="text-xs text-white/40 uppercase tracking-wide">Fecha</p>
          <p class="text-sm text-white">{{ fmtDate(quote.quote_date) }}</p>
        </div>
        <div class="p-4 rounded-2xl border border-white/10 flex flex-col gap-1" :style="{ background: 'var(--nexora-glass-bg)' }">
          <p class="text-xs text-white/40 uppercase tracking-wide">Válido hasta</p>
          <p class="text-sm text-white">{{ fmtDate(quote.valid_until) }}</p>
        </div>
        <div class="p-4 rounded-2xl border border-white/10 flex flex-col gap-1" :style="{ background: 'var(--nexora-glass-bg)' }">
          <p class="text-xs text-white/40 uppercase tracking-wide">Total</p>
          <p class="text-lg font-semibold text-white">{{ fmt(quote.final_amount) }}</p>
          <p v-if="quote.discount_amount > 0" class="text-xs text-white/40">Descuento: {{ fmt(quote.discount_amount) }}</p>
        </div>
        <div v-if="quote.accepted_by_name" class="p-4 rounded-2xl border border-green-500/20 bg-green-500/5 flex flex-col gap-1">
          <p class="text-xs text-green-400 uppercase tracking-wide">Aceptado por</p>
          <p class="text-sm text-white">{{ quote.accepted_by_name }}</p>
          <p class="text-xs text-white/40">{{ fmtDate(quote.accepted_at) }}</p>
        </div>
      </div>

      <!-- Notes -->
      <div v-if="quote.notes || quote.conditions_text" class="p-4 rounded-2xl border border-white/10 flex flex-col gap-2" :style="{ background: 'var(--nexora-glass-bg)' }">
        <div v-if="quote.notes">
          <p class="text-xs text-white/40 uppercase tracking-wide mb-1">Notas</p>
          <p class="text-sm text-white/80 whitespace-pre-wrap">{{ quote.notes }}</p>
        </div>
        <div v-if="quote.conditions_text">
          <p class="text-xs text-white/40 uppercase tracking-wide mb-1">Condiciones</p>
          <p class="text-sm text-white/80 whitespace-pre-wrap">{{ quote.conditions_text }}</p>
        </div>
      </div>

      <!-- Items table -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-white">Ítems</p>
          <button
            v-if="isDraft"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-white/70 hover:bg-white/20 transition"
            @click="openAddItem"
          >
            <Plus :size="12" /> Agregar ítem
          </button>
        </div>

        <div v-if="!quote.items || quote.items.length === 0" class="text-center text-white/30 py-6 text-sm border border-white/5 rounded-xl">
          Sin ítems. Agregá tratamientos al presupuesto.
        </div>

        <template v-else>
          <!-- Desktop header -->
          <div class="hidden md:grid md:grid-cols-[2fr_80px_80px_100px_100px_36px] gap-3 px-3 text-xs text-white/30 font-semibold uppercase tracking-wide">
            <span>Tratamiento</span>
            <span>Diente</span>
            <span class="text-center">Cant.</span>
            <span class="text-right">P. Unit.</span>
            <span class="text-right">Subtotal</span>
            <span></span>
          </div>

          <div
            v-for="item in quote.items"
            :key="item.id"
            class="flex flex-col md:grid md:grid-cols-[2fr_80px_80px_100px_100px_36px] gap-2 md:gap-3 items-start md:items-center px-3 py-3 rounded-xl border border-white/10"
            :style="{ background: 'var(--nexora-glass-bg)' }"
          >
            <!-- Mobile layout -->
            <div class="md:hidden flex-1 min-w-0">
              <p class="text-sm text-white font-medium">{{ item.treatment_name_snapshot }}</p>
              <p v-if="item.tooth_reference" class="text-xs text-white/40">Diente: {{ item.tooth_reference }}</p>
              <p class="text-xs text-white/50 mt-0.5">{{ item.quantity }} × {{ fmt(item.unit_price) }} = {{ fmt(item.subtotal) }}</p>
            </div>

            <!-- Desktop layout -->
            <div class="hidden md:contents">
              <div class="min-w-0">
                <p class="text-sm text-white truncate">{{ item.treatment_name_snapshot }}</p>
                <p v-if="item.description" class="text-xs text-white/40 truncate">{{ item.description }}</p>
              </div>
              <p class="text-xs text-white/60">{{ item.tooth_reference || '—' }}</p>
              <p class="text-sm text-white text-center">{{ item.quantity }}</p>
              <p class="text-sm text-white text-right">{{ fmt(item.unit_price) }}</p>
              <p class="text-sm font-semibold text-white text-right">{{ fmt(item.subtotal) }}</p>
            </div>

            <button
              v-if="isDraft"
              class="text-red-400/60 hover:text-red-400 transition p-1 rounded-lg hover:bg-red-500/10 md:justify-self-end"
              :disabled="actionLoading"
              title="Eliminar"
              @click="removeItem(item)"
            >
              <Trash2 :size="13" />
            </button>
          </div>

          <!-- Totals -->
          <div class="flex flex-col gap-1 items-end pr-3 pt-2 border-t border-white/10">
            <div class="flex items-center gap-8 text-sm">
              <span class="text-white/40">Subtotal</span>
              <span class="text-white font-mono w-28 text-right">{{ fmt(quote.total_amount) }}</span>
            </div>
            <div v-if="quote.discount_amount > 0" class="flex items-center gap-8 text-sm">
              <span class="text-white/40">Descuento</span>
              <span class="text-red-400 font-mono w-28 text-right">- {{ fmt(quote.discount_amount) }}</span>
            </div>
            <div class="flex items-center gap-8 text-base font-semibold mt-1">
              <span class="text-white">TOTAL</span>
              <span class="text-white font-mono w-28 text-right">{{ fmt(quote.final_amount) }}</span>
            </div>
          </div>
        </template>
      </div>
    </template>

    <!-- Print target (hidden by print.css until window.print() is called) -->
    <QuotePrintLayout
      v-if="quote && printData"
      :quote="quote"
      :items="quote.items ?? []"
      :customer="printData.customer"
      :config="printData.config"
    />

    <!-- Add item panel -->
    <NxrSlidePanel :open="showAddItem" title="Agregar ítem" eyebrow="Presupuesto" @close="showAddItem = false"
    draft-key="views/dental/screens_dental_quote_detail.vue#1"
    :draft-entity="id"
    :draft-state="{ itemForm }">
      <form class="flex flex-col gap-5" @submit.prevent="saveItem">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Tratamiento del catálogo</label>
          <select
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
            @change="onTreatmentSelect(($event.target as HTMLSelectElement).value)"
          >
            <option value="">— Sin seleccionar —</option>
            <option v-for="t in treatmentsStore.items" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Nombre del tratamiento *</label>
          <input
            v-model="itemForm.treatment_name_snapshot"
            type="text"
            required
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Precio unitario</label>
            <input
              v-model="itemForm.unit_price"
              type="number"
              min="0"
              step="0.01"
              class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Cantidad</label>
            <input
              v-model="itemForm.quantity"
              type="number"
              min="1"
              class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
            />
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Referencia dental (ej: 11, 12)</label>
          <input
            v-model="itemForm.tooth_reference"
            type="text"
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Descripción adicional</label>
          <textarea
            v-model="itemForm.description"
            rows="2"
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"
          />
        </div>
        <p v-if="addItemError" class="text-xs text-red-400">{{ addItemError }}</p>
        <div class="flex gap-3 pt-2">

          <button type="submit" class="flex-1 rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary disabled:opacity-50" :disabled="savingItem">
            {{ savingItem ? 'Guardando...' : 'Agregar' }}
          </button>
        </div>
      </form>
    </NxrSlidePanel>

    <!-- Edit panel -->
    <NxrSlidePanel :open="showEdit" title="Editar Presupuesto" eyebrow="Presupuesto" @close="showEdit = false"
    draft-key="views/dental/screens_dental_quote_detail.vue#2"
    :draft-entity="id"
    :draft-state="{ editForm }">
      <form class="flex flex-col gap-5" @submit.prevent="saveEdit">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Válido hasta</label>
          <input v-model="editForm.valid_until" type="date" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Descuento</label>
          <input v-model="editForm.discount_amount" type="number" min="0" step="0.01" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Notas</label>
          <textarea v-model="editForm.notes" rows="3" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Condiciones</label>
          <textarea v-model="editForm.conditions_text" rows="3" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none" />
        </div>
        <p v-if="editError" class="text-xs text-red-400">{{ editError }}</p>
        <div class="flex gap-3 pt-2">

          <button type="submit" class="flex-1 rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary disabled:opacity-50" :disabled="savingEdit">
            {{ savingEdit ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </NxrSlidePanel>

    <!-- Accept panel -->
    <NxrSlidePanel :open="showAccept" title="Aceptar Presupuesto" eyebrow="Presupuesto" @close="showAccept = false"
    draft-key="views/dental/screens_dental_quote_detail.vue#3"
    :draft-entity="id"
    :draft-state="{ acceptForm }">
      <form class="flex flex-col gap-5" @submit.prevent="saveAccept">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Nombre del paciente que acepta *</label>
          <input v-model="acceptForm.accepted_by_name" type="text" required class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Notas de aceptación</label>
          <textarea v-model="acceptForm.acceptance_notes" rows="3" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none" />
        </div>
        <p v-if="acceptError" class="text-xs text-red-400">{{ acceptError }}</p>
        <div class="flex gap-3 pt-2">

          <button type="submit" class="flex-1 rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition nxr-btn-primary disabled:opacity-50" :disabled="savingAccept">
            {{ savingAccept ? 'Procesando...' : 'Confirmar aceptación' }}
          </button>
        </div>
      </form>
    </NxrSlidePanel>

    <!-- Reject panel -->
    <NxrSlidePanel :open="showReject" title="Rechazar Presupuesto" eyebrow="Presupuesto" @close="showReject = false"
    draft-key="views/dental/screens_dental_quote_detail.vue#4"
    :draft-entity="id"
    :draft-state="{ rejectForm }">
      <form class="flex flex-col gap-5" @submit.prevent="saveReject">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Motivo del rechazo</label>
          <textarea v-model="rejectForm.rejection_reason" rows="3" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none" />
        </div>
        <p v-if="rejectError" class="text-xs text-red-400">{{ rejectError }}</p>
        <div class="flex gap-3 pt-2">

          <button type="submit" class="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:opacity-90 disabled:opacity-50" :disabled="savingReject">
            {{ savingReject ? 'Procesando...' : 'Confirmar rechazo' }}
          </button>
        </div>
      </form>
    </NxrSlidePanel>

    <AppToast v-for="t in toasts" :key="t.id" :toast="t" @close="removeToast" />
  </div>
</template>
