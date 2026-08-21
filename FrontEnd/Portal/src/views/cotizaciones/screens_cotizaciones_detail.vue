<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Save, CheckCircle2, XCircle, Plus, Trash2, ExternalLink, Printer } from 'lucide-vue-next';
import { useCotizacionesStore } from '../../stores/cotizaciones';
import { useTreasurySettingsStore } from '../../stores/treasurySettings';
import { usePrint } from '../../composables/usePrint';
import { useToast } from '../../composables/useToast';
import AppToast from '../../components/AppToast.vue';
import widgets_garage_customer_combobox from '../../widgets/widgets_garage_customer_combobox.vue';
import widgets_garage_quote_print from '../../widgets/widgets_garage_quote_print.vue';
import widgets_cotizaciones_item_picker_modal from '../../widgets/widgets_cotizaciones_item_picker_modal.vue';
import widgets_cotizaciones_manual_item_combobox from '../../widgets/widgets_cotizaciones_manual_item_combobox.vue';
import { cotizacionesService } from '../../services/cotizacionesService';
import { QUOTE_STATUS_LABEL, QUOTE_MANUAL_STATUSES } from '../../types/cotizaciones';
import type { QuoteFormData, QuoteLineFormData, QuoteLine, QuoteStatus } from '../../types/cotizaciones';

const route = useRoute();
const router = useRouter();
const store = useCotizacionesStore();
const treasurySettingsStore = useTreasurySettingsStore();
const { isPrinting, printElement } = usePrint();
const { toasts, triggerToast, removeToast } = useToast();

const isNew = computed(() => route.name === 'cotizaciones-new');
const quoteId = computed(() => Number(route.params.id || 0));

const creatingDraft = ref(false);
const saving = ref(false);
const error = ref('');

const emptyForm = (): QuoteFormData => ({
  customer_id: null,
  valid_until: '',
  notes: '',
  discount_amount: 0,
  discount_type: 'fixed',
  tax_enabled: false,
  tax_rate: 19,
});
const form = ref<QuoteFormData>(emptyForm());

// Item picker modal (Producto / Servicio tabs) — opened by the "Agregar"
// button; does its own API calls (store.addLine) and just tells us when
// something was added so we can toast.
const showItemPicker = ref(false);

// Always-visible "agregar ítem manual" mini-form. The description field
// (widgets_cotizaciones_manual_item_combobox) lets the user search/select
// an existing product, create a new one on the fly, or just type a
// description and leave it as a plain reference — product_id stays null in
// that last case, so the line snapshots the typed text instead of linking
// to the catalog. Distinct from Servicio: it must NOT trigger the
// tercerizado purchase-document flow on acceptance.
const emptyManualForm = () => ({ product_id: null as number | null, product_name: '', quantity: 1, unit_price: 0 });
const manualForm = ref(emptyManualForm());
const manualFormKey = ref(0); // bumped after each add to fully reset the combobox's internal search/dropdown state
const addingManual = ref(false);
const manualError = ref('');

async function addManualItem() {
  if (!store.current) return;
  manualError.value = '';
  const desc = manualForm.value.product_name.trim();
  if (!desc) { manualError.value = 'Ingresa una descripción'; return; }
  if (!(Number(manualForm.value.quantity) > 0)) { manualError.value = 'La cantidad debe ser mayor a cero'; return; }
  if (!(Number(manualForm.value.unit_price) > 0)) { manualError.value = 'Ingresa un precio válido'; return; }

  addingManual.value = true;
  try {
    const payload: QuoteLineFormData = {
      is_non_stocked: false,
      quantity: Number(manualForm.value.quantity),
      unit_price: Number(manualForm.value.unit_price),
    };
    if (manualForm.value.product_id) payload.product_id = manualForm.value.product_id;
    else payload.product_name = desc;
    await store.addLine(store.current.id, payload);
    manualForm.value = emptyManualForm();
    manualFormKey.value++;
  } catch (e: any) {
    manualError.value = e?.response?.data?.error || 'Error al agregar ítem';
  } finally {
    addingManual.value = false;
  }
}

// Inline quantity/price editing on existing lines — lets the "add with
// qty 1" flow (picker modal, manual form) stay a single click while still
// letting the user correct quantity/price right where they see it, instead
// of deleting and re-adding. Tercerizado unit_price is derived from
// cost*margin server-side, so only quantity is inline-editable there.
async function updateLineField(line: QuoteLine, changes: { quantity?: number; unit_price?: number }) {
  if (!store.current) return;
  const payload: QuoteLineFormData = {
    is_non_stocked: line.is_non_stocked,
    quantity: changes.quantity ?? Number(line.quantity),
  };
  if (line.is_non_stocked) {
    payload.supplier_id = line.supplier_id;
    payload.supplier_cost = Number(line.supplier_cost);
    payload.margin_pct = Number(line.margin_pct);
    if (line.product_id) payload.product_id = line.product_id;
  } else if (line.product_id) {
    payload.product_id = line.product_id;
    payload.unit_price = changes.unit_price ?? Number(line.unit_price);
  } else {
    payload.product_name = line.product_name_snapshot || '';
    payload.unit_price = changes.unit_price ?? Number(line.unit_price);
  }
  try {
    await store.updateLine(store.current.id, line.id, payload);
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al actualizar línea';
  }
}

// accept flow
const showAcceptForm = ref(false);
const acceptCounterpartyId = ref<number | null>(null);
const acceptedByName = ref('');
const acceptanceNotes = ref('');
const acceptError = ref('');

// reject flow
const showRejectForm = ref(false);
const rejectionReason = ref('');

// print flow
const printData = ref<Awaited<ReturnType<typeof cotizacionesService.getPrintData>>['data']['data'] | null>(null);

const canEditHeader = computed(() => store.current?.status === 'draft');
const canEditLines = computed(() => store.current?.status === 'draft');
const canPrint = computed(() => !!store.current);

// Status field: locked forever once accepted (and paid/converted, which only
// happen downstream of accepted). 'paid'/'converted' are automation-only and
// are appended to the option list only when they're the actual current value,
// so the <select> always has a matching option without offering them as a
// manually-selectable target.
const isStatusLocked = computed(() => ['accepted', 'paid', 'converted'].includes(store.current?.status || ''));
const statusOptions = computed(() => {
  const current = store.current?.status;
  if (current === 'paid' || current === 'converted') {
    return [...QUOTE_MANUAL_STATUSES, current];
  }
  return QUOTE_MANUAL_STATUSES;
});

// Client-side mirror of BackEnd quotesController.recalcTotals/computeDiscountValue
// (discount before tax, round2 each step) — lets Descuento/IVA show their
// effect on Total the instant the user types, instead of only after a save
// round-trip. store.current.subtotal is the one figure that's genuinely
// server-derived (sum of lines); everything else here is a live preview of
// what Guardar will persist.
const livePreview = computed(() => {
  const subtotal = Number(store.current?.subtotal || 0);
  const rawDiscount = Number(form.value.discount_amount || 0);
  const discountValue = form.value.discount_type === 'percentage'
    ? Math.round(subtotal * (rawDiscount / 100) * 100) / 100
    : Math.round(rawDiscount * 100) / 100;
  const afterDiscount = Math.max(0, Math.round((subtotal - discountValue) * 100) / 100);
  const taxAmount = form.value.tax_enabled
    ? Math.round(afterDiscount * (Number(form.value.tax_rate || 0) / 100) * 100) / 100
    : 0;
  return { subtotal, discountValue, taxAmount, finalAmount: Math.round((afterDiscount + taxAmount) * 100) / 100 };
});

// Drives the "Vista previa / Guardado" status line next to Total — compares
// only the fields that feed livePreview, not the whole form.
const totalsDirty = computed(() => {
  const q = store.current;
  if (!q) return false;
  return Number(form.value.discount_amount || 0) !== Number(q.discount_amount || 0)
    || (form.value.discount_type || 'fixed') !== (q.discount_type || 'fixed')
    || Boolean(form.value.tax_enabled) !== Boolean(q.tax_enabled)
    || Number(form.value.tax_rate ?? 19) !== Number(q.tax_rate ?? 19);
});

function fmtMoney(value: number | string | null | undefined) {
  return `$${Math.round(Number(value || 0)).toLocaleString('es-CL')}`;
}

// Cantidad column: values come back from Postgres as NUMERIC strings
// ("5.00"), which an <input> renders verbatim — Number() strips the
// trailing zeros while still showing a genuine fraction (e.g. "2.5") if
// one exists.
function fmtQty(value: number | string | null | undefined) {
  return Number(value || 0);
}

// Precio unit. column: always exactly one decimal, per request — .toFixed
// (not toLocaleString) so the string stays a valid <input type="number">
// value (no thousands separators).
function fmtUnitPriceInput(value: number | string | null | undefined) {
  return Number(value || 0).toFixed(1);
}

// Same one-decimal rule for read-only price text (product/service cards,
// tercerizado's non-editable price) — locale-formatted with thousands
// separators since it's plain text, not an input value.
function fmtUnitPrice(value: number | string | null | undefined) {
  return `$${Number(value || 0).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
}

function fmtDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('es-CL') : '-';
}

function cleanDate(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function loadQuoteIntoForm() {
  const q = store.current;
  if (!q) return;
  form.value = {
    customer_id: q.customer_id,
    valid_until: cleanDate(q.valid_until),
    notes: q.notes || '',
    discount_amount: Number(q.discount_amount || 0),
    discount_type: q.discount_type || 'fixed',
    tax_enabled: Boolean(q.tax_enabled),
    tax_rate: Number(q.tax_rate ?? 19),
  };
}

// "Nueva cotización" auto-creates its draft row the instant the screen
// opens (no visible save step) — line items need a real quote_id to attach
// to, and gating the whole "add item" section behind an explicit first Save
// was the two-step flow reported as confusing. The screen the user lands on
// is indistinguishable from opening an existing draft.
async function boot() {
  await treasurySettingsStore.counterparties.load({ status: 'active' });
  if (isNew.value) {
    creatingDraft.value = true;
    error.value = '';
    try {
      const saved = await store.create(emptyForm());
      store.current = { ...saved, lines: [] };
      loadQuoteIntoForm();
      router.replace(`/cotizaciones/${saved.id}`);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al crear la cotización';
    } finally {
      creatingDraft.value = false;
    }
    return;
  }
  if (quoteId.value) {
    await store.loadOne(quoteId.value);
    loadQuoteIntoForm();
  }
}

onMounted(boot);
watch(() => route.fullPath, boot);

async function save() {
  if (!store.current) return;
  saving.value = true;
  error.value = '';
  try {
    const payload: QuoteFormData = {
      customer_id: form.value.customer_id || null,
      valid_until: form.value.valid_until || null,
      notes: form.value.notes || null,
      discount_amount: Number(form.value.discount_amount || 0),
      discount_type: form.value.discount_type || 'fixed',
      tax_enabled: Boolean(form.value.tax_enabled),
      tax_rate: Number(form.value.tax_rate ?? 19),
    };
    await store.update(store.current.id, payload);
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al guardar cotización';
  } finally {
    saving.value = false;
  }
}

async function removeLine(line: QuoteLine) {
  if (!store.current) return;
  try {
    await store.deleteLine(store.current.id, line.id);
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al eliminar línea';
  }
}

async function loadPrintData() {
  if (!store.current) return false;
  try {
    const res = await cotizacionesService.getPrintData(store.current.id);
    printData.value = res.data.data;
    return true;
  } catch (e: any) {
    printData.value = null;
    triggerToast('Error', e?.response?.data?.error || 'No se pudieron cargar los datos para imprimir', 'error');
    return false;
  }
}

async function printQuote() {
  if (!await loadPrintData()) return;
  const printed = await printElement('garage-print-target');
  if (!printed) triggerToast('Error', 'No se pudo preparar el documento para imprimir', 'error');
}

// Status field: 'accepted' and 'rejected' route through their existing
// forms (accepted needs a Treasury counterparty; rejected can carry an
// optional reason) instead of committing immediately — the <select> keeps
// showing the real current status until one of those forms is confirmed,
// since nothing here mutates store.current until then. 'draft'/'sent'/
// 'expired' commit straight away.
function onStatusChange(event: Event) {
  const target = (event.target as HTMLSelectElement).value as QuoteStatus;
  if (!store.current || target === store.current.status) return;
  if (target === 'accepted') { showAcceptForm.value = true; return; }
  if (target === 'rejected') { showRejectForm.value = true; return; }
  changeStatus(target as 'draft' | 'sent' | 'expired');
}

async function changeStatus(target: 'draft' | 'sent' | 'expired') {
  if (!store.current) return;
  try {
    if (target === 'draft') await store.revertToDraft(store.current.id);
    else if (target === 'sent') await store.send(store.current.id);
    else await store.expire(store.current.id);
    triggerToast('Éxito', 'Estado actualizado', 'success');
  } catch (e: any) {
    triggerToast('Error', e?.response?.data?.error || 'Error al cambiar el estado', 'error');
  }
}

async function confirmAccept() {
  if (!store.current) return;
  acceptError.value = '';
  if (!acceptCounterpartyId.value) { acceptError.value = 'Selecciona una contraparte de Tesorería'; return; }
  try {
    await store.accept(store.current.id, {
      counterparty_id: acceptCounterpartyId.value,
      accepted_by_name: acceptedByName.value || undefined,
      acceptance_notes: acceptanceNotes.value || undefined,
    });
    showAcceptForm.value = false;
  } catch (e: any) {
    acceptError.value = e?.response?.data?.error || 'Error al aceptar cotización';
  }
}

async function confirmReject() {
  if (!store.current) return;
  try {
    await store.reject(store.current.id, { rejection_reason: rejectionReason.value || undefined });
    showRejectForm.value = false;
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al rechazar cotización';
  }
}
</script>

<template>
  <div class="flex min-h-[calc(100vh-5rem)] flex-col gap-5 p-6">
    <div class="rounded-2xl border border-white/10 p-4" :style="{ background: 'var(--nexora-glass-bg)' }">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-3">
          <button class="nxr-text-muted hover:text-[var(--nexora-text-color)]" @click="router.push('/cotizaciones')"><ArrowLeft :size="20" /></button>
          <div>
            <h1 class="text-lg font-semibold nxr-text">{{ isNew ? 'Nueva cotización' : store.current?.quote_number }}</h1>
            <p class="text-xs nxr-text-muted">{{ store.current ? (QUOTE_STATUS_LABEL[store.current.status] || store.current.status) : 'Creando borrador...' }}</p>
          </div>
        </div>
        <!-- The only Guardar button on the whole screen — a second one in
             the Resumen panel was reported as confusing ("no es intuitivo
             tener dos botones guardar"). -->
        <div class="flex flex-wrap gap-2">
          <button v-if="canEditHeader" class="nxr-btn nxr-btn-primary" :disabled="saving" @click="save"><Save :size="14" /> {{ saving ? 'Guardando...' : 'Guardar' }}</button>
          <button v-if="canPrint" class="nxr-btn nxr-btn-secondary" :disabled="isPrinting" @click="printQuote"><Printer :size="14" /> Imprimir</button>
        </div>
      </div>
    </div>

    <div v-if="creatingDraft" class="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm nxr-text-muted">
      Creando cotización...
    </div>

    <template v-else-if="store.current">
      <!-- Two-column builder: header/líneas on the left, Resumen (discount,
           IVA, totals — the fields that produce Total) pinned on the right
           so cause and effect stay in the same field of view (Gestalt
           common region), instead of separated by the whole line-items table. -->
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        <div class="flex flex-col gap-5">
          <!-- Header fields -->
          <div class="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 p-4 sm:grid-cols-2 lg:grid-cols-4" :style="{ background: 'var(--nexora-glass-bg)' }">
            <div>
              <label class="mb-1 block text-xs nxr-text-muted">Cliente</label>
              <widgets_garage_customer_combobox v-model="form.customer_id" :disabled="!canEditHeader" placeholder="Buscar o crear cliente..." />
            </div>
            <div>
              <label class="mb-1 block text-xs nxr-text-muted">Válida hasta</label>
              <input v-model="form.valid_until" :disabled="!canEditHeader" type="date" class="w-full rounded-xl border px-3 py-2 text-sm outline-none disabled:opacity-60"
                     style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);" />
            </div>
            <div>
              <label class="mb-1 block text-xs nxr-text-muted">Estado</label>
              <select
                :value="store.current.status"
                :disabled="isStatusLocked"
                class="w-full rounded-xl border px-3 py-2 text-sm outline-none disabled:opacity-60"
                style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);"
                @change="onStatusChange"
              >
                <option v-for="s in statusOptions" :key="s" :value="s">{{ QUOTE_STATUS_LABEL[s] }}</option>
              </select>
              <p v-if="isStatusLocked" class="mt-1 text-[11px] nxr-text-soft">Aprobada: el estado ya no se puede cambiar.</p>
            </div>
            <div>
              <label class="mb-1 block text-xs nxr-text-muted">Notas</label>
              <input v-model="form.notes" :disabled="!canEditHeader" class="w-full rounded-xl border px-3 py-2 text-sm outline-none disabled:opacity-60"
                     style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);" />
            </div>
          </div>

          <!-- Lifecycle info / links -->
          <div v-if="store.current.status === 'accepted' || store.current.status === 'paid' || store.current.status === 'converted'" class="rounded-2xl border border-white/10 p-4 text-sm nxr-text-muted" :style="{ background: 'var(--nexora-glass-bg)' }">
            <p v-if="store.current.accepted_at">Aceptada el {{ fmtDate(store.current.accepted_at) }}<span v-if="store.current.accepted_by_name"> por {{ store.current.accepted_by_name }}</span>.</p>
            <router-link v-if="store.current.treasury_document_id" :to="`/treasury/receivables/${store.current.treasury_document_id}`" class="mt-1 inline-flex items-center gap-1 text-xs text-blue-300 hover:underline">
              <ExternalLink :size="12" /> Ver documento de Tesorería (cobro pendiente/pagado)
            </router-link>
            <p v-if="store.current.status === 'paid'" class="mt-2 text-violet-300">Pagada — se generó una orden de compra en borrador para las líneas tercerizadas. Confírmala en Inventario para completar la conversión.</p>
            <p v-if="store.current.status === 'converted'" class="mt-2 text-cyan-300">Convertida — la recepción de stock quedó registrada.</p>
            <router-link v-if="store.current.converted_purchase_document_id" :to="`/inventory/purchase-documents/${store.current.converted_purchase_document_id}`" class="mt-1 inline-flex items-center gap-1 text-xs text-blue-300 hover:underline">
              <ExternalLink :size="12" /> Ver orden de compra generada
            </router-link>
          </div>
          <div v-if="store.current.status === 'rejected'" class="rounded-2xl border border-red-500/20 p-4 text-sm text-red-300" :style="{ background: 'var(--nexora-glass-bg)' }">
            Rechazada el {{ fmtDate(store.current.rejected_at) }}<span v-if="store.current.rejection_reason"> — {{ store.current.rejection_reason }}</span>.
          </div>

          <!-- Accept form -->
          <div v-if="showAcceptForm" class="rounded-2xl border border-white/10 p-4" :style="{ background: 'var(--nexora-glass-bg)' }">
            <h3 class="mb-3 text-sm font-semibold nxr-text">Aceptar cotización</h3>
            <p class="mb-3 text-xs nxr-text-muted">Selecciona la contraparte de Tesorería a la que se le emitirá el documento por cobrar. No existe vínculo automático cliente → contraparte.</p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label class="mb-1 block text-xs nxr-text-muted">Contraparte *</label>
                <select v-model.number="acceptCounterpartyId" class="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                        style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);">
                  <option :value="null">Seleccionar</option>
                  <option v-for="cp in treasurySettingsStore.counterparties.items" :key="cp.id" :value="cp.id">{{ cp.name_snapshot }}</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs nxr-text-muted">Aceptado por</label>
                <input v-model="acceptedByName" class="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                       style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);" />
              </div>
              <div>
                <label class="mb-1 block text-xs nxr-text-muted">Notas de aceptación</label>
                <input v-model="acceptanceNotes" class="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                       style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);" />
              </div>
            </div>
            <p v-if="acceptError" class="mt-2 text-xs text-red-400">{{ acceptError }}</p>
            <div class="mt-3 flex gap-2">
              <button class="nxr-btn nxr-btn-primary" @click="confirmAccept"><CheckCircle2 :size="14" /> Confirmar aceptación</button>
              <button class="nxr-btn nxr-btn-secondary" @click="showAcceptForm = false">Cancelar</button>
            </div>
          </div>

          <!-- Reject form -->
          <div v-if="showRejectForm" class="rounded-2xl border border-white/10 p-4" :style="{ background: 'var(--nexora-glass-bg)' }">
            <h3 class="mb-3 text-sm font-semibold nxr-text">Rechazar cotización</h3>
            <label class="mb-1 block text-xs nxr-text-muted">Motivo (opcional)</label>
            <input v-model="rejectionReason" class="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                   style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);" />
            <div class="mt-3 flex gap-2">
              <button class="nxr-btn nxr-btn-primary" @click="confirmReject"><XCircle :size="14" /> Confirmar rechazo</button>
              <button class="nxr-btn nxr-btn-secondary" @click="showRejectForm = false">Cancelar</button>
            </div>
          </div>

          <!-- Lines -->
          <div class="flex-1 rounded-2xl border border-white/10 p-4" :style="{ background: 'var(--nexora-glass-bg)' }">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="text-sm font-semibold nxr-text-muted">Líneas</h2>
              <button v-if="canEditLines" class="nxr-btn nxr-btn-primary" style="padding: 0.375rem 0.75rem; font-size: 0.8125rem;" @click="showItemPicker = true">
                <Plus :size="14" /> Agregar
              </button>
            </div>

            <!-- Column headers — desktop only, mirrors the row grid below so
                 labels line up with their column. -->
            <div v-if="(store.current.lines?.length || 0) > 0" class="mb-1 hidden gap-2 px-3 sm:grid sm:grid-cols-2 lg:grid-cols-[2fr_90px_1fr_110px_1fr_auto]">
              <span class="text-xs font-semibold uppercase tracking-wide nxr-text-muted">Artículo</span>
              <span class="text-center text-xs font-semibold uppercase tracking-wide nxr-text-muted">Cantidad</span>
              <span></span>
              <span class="text-right text-xs font-semibold uppercase tracking-wide nxr-text-muted">Precio unit.</span>
              <span class="text-xs font-semibold uppercase tracking-wide nxr-text-muted">Total</span>
              <span></span>
            </div>

            <!-- Items list: scrolls internally once it grows past a handful of rows -->
            <div v-if="(store.current.lines?.length || 0) === 0" class="py-6 text-center text-sm nxr-text-soft">Sin líneas todavía.</div>
            <div v-else class="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
              <div v-for="line in store.current.lines" :key="line.id" class="rounded-xl border border-white/10 bg-white/5 p-3">
                <!-- Mobile: description, qty/price inline, and delete only -->
                <div class="flex items-center justify-between gap-3 sm:hidden">
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm nxr-text">{{ line.product_name_snapshot || line.sku_snapshot || 'Ítem sin producto' }}</p>
                    <div class="mt-1 flex items-center gap-2 text-sm">
                      <input
                        type="number" min="0.01" step="0.01" :value="fmtQty(line.quantity)" :disabled="!canEditLines"
                        class="w-14 rounded-lg border px-1.5 py-1 text-center text-xs outline-none disabled:opacity-60"
                        style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);"
                        @change="updateLineField(line, { quantity: Number(($event.target as HTMLInputElement).value) })"
                      />
                      <span class="font-medium nxr-text">{{ fmtMoney(line.subtotal) }}</span>
                    </div>
                  </div>
                  <button v-if="canEditLines" class="shrink-0 p-1.5 nxr-text-soft hover:text-red-400" aria-label="Eliminar línea" @click="removeLine(line)"><Trash2 :size="18" /></button>
                </div>

                <!-- Tablet/desktop: full detail, quantity + unit price editable inline -->
                <div class="hidden gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-[2fr_90px_1fr_110px_1fr_auto]">
                  <div>
                    <p class="text-sm nxr-text">{{ line.product_name_snapshot || line.sku_snapshot || 'Ítem sin producto' }}</p>
                    <p class="text-xs nxr-text-muted">
                      <span v-if="line.is_non_stocked">Tercerizado · {{ line.supplier_name || 'Proveedor' }}</span>
                      <span v-else>Stock</span>
                    </p>
                  </div>
                  <input
                    type="number" min="0.01" step="0.01" :value="fmtQty(line.quantity)" :disabled="!canEditLines"
                    class="w-full rounded-lg border px-2 py-1 text-center text-sm outline-none disabled:opacity-60"
                    style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);"
                    @change="updateLineField(line, { quantity: Number(($event.target as HTMLInputElement).value) })"
                  />
                  <div v-if="line.is_non_stocked" class="text-sm nxr-text-muted">Costo {{ fmtUnitPrice(line.supplier_cost) }} · Margen {{ fmtQty(line.margin_pct) }}%</div>
                  <div v-else class="text-sm nxr-text-muted">-</div>
                  <input
                    v-if="!line.is_non_stocked"
                    type="number" min="0" step="0.1" :value="fmtUnitPriceInput(line.unit_price)" :disabled="!canEditLines"
                    class="w-full rounded-lg border px-2 py-1 text-right text-sm outline-none disabled:opacity-60"
                    style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);"
                    @change="updateLineField(line, { unit_price: Number(($event.target as HTMLInputElement).value) })"
                  />
                  <div v-else class="text-right text-sm nxr-text-muted">{{ fmtUnitPrice(line.unit_price) }}</div>
                  <div class="text-sm font-medium nxr-text">{{ fmtMoney(line.subtotal) }}</div>
                  <button v-if="canEditLines" class="nxr-text-soft hover:text-red-400" aria-label="Eliminar línea" @click="removeLine(line)"><Trash2 :size="16" /></button>
                </div>
              </div>
            </div>

            <!-- Manual item: description + qty + price, no catalog product or
                 supplier — a single "+" icon button, matching the reference
                 layout instead of a full "Agregar línea" text button. -->
            <div v-if="canEditLines" class="mt-4 border-t border-dashed pt-4" style="border-color: var(--nexora-input-border);">
              <p class="mb-2 text-xs font-semibold uppercase tracking-wide nxr-text-muted">Agregar ítem manual</p>
              <div class="flex items-start gap-2">
                <div class="min-w-0 flex-[3]">
                  <widgets_cotizaciones_manual_item_combobox
                    :key="manualFormKey"
                    v-model:product-id="manualForm.product_id"
                    v-model:product-name="manualForm.product_name"
                    :unit-price-hint="manualForm.unit_price"
                    placeholder="Descripción del producto/servicio"
                    @price-hint="(price: number) => { manualForm.unit_price = price }"
                  />
                </div>
                <input v-model.number="manualForm.quantity" type="number" min="1" step="1" placeholder="Cant." class="w-20 min-w-0 rounded-xl border px-3 py-2 text-sm outline-none"
                       style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);" />
                <input v-model.number="manualForm.unit_price" type="number" min="0" step="0.01" placeholder="Precio unit." class="w-28 min-w-0 rounded-xl border px-3 py-2 text-sm outline-none"
                       style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);" />
                <button class="nxr-btn nxr-btn-secondary shrink-0" style="padding: 0.5rem 0.625rem;" :disabled="addingManual" aria-label="Agregar ítem manual" @click="addManualItem">
                  <Plus :size="14" />
                </button>
              </div>
              <p v-if="manualError" class="mt-1 text-xs text-red-400">{{ manualError }}</p>
            </div>
          </div>
        </div>

        <!-- Resumen: discount/IVA controls live directly above the total row
             they produce, and Total updates live from livePreview as you
             type — no more disconnected "far away bar" + save-to-see-it. -->
        <div class="flex flex-col gap-3 rounded-2xl border border-white/15 p-4 lg:sticky lg:top-6" :style="{ background: 'var(--nexora-glass-bg-strong)' }">
          <h2 class="text-sm font-semibold nxr-text">Resumen</h2>

          <div class="flex justify-between text-sm">
            <span class="nxr-text-muted">Subtotal</span>
            <span class="nxr-text">{{ fmtMoney(livePreview.subtotal) }}</span>
          </div>

          <div class="border-t pt-3" style="border-color: var(--nexora-input-border);">
            <label class="mb-1 block text-xs nxr-text-muted">Descuento</label>
            <div class="flex gap-1.5">
              <input v-model.number="form.discount_amount" :disabled="!canEditHeader" type="number" min="0" step="0.01" class="w-full min-w-0 rounded-xl border px-3 py-2 text-sm outline-none disabled:opacity-60"
                     style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);" />
              <select v-model="form.discount_type" :disabled="!canEditHeader" class="shrink-0 rounded-xl border px-2 py-2 text-sm outline-none disabled:opacity-60"
                      style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);">
                <option value="fixed">$</option>
                <option value="percentage">%</option>
              </select>
            </div>
            <div class="mt-2 flex justify-between text-sm">
              <span class="nxr-text-muted">Descuento{{ form.discount_type === 'percentage' ? ` (${form.discount_amount || 0}%)` : '' }}</span>
              <span class="nxr-text">- {{ fmtMoney(livePreview.discountValue) }}</span>
            </div>
          </div>

          <div class="border-t pt-3" style="border-color: var(--nexora-input-border);">
            <label class="mb-1 block text-xs nxr-text-muted">IVA</label>
            <div class="flex items-center gap-2 rounded-xl border px-3 py-2" style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border);">
              <input id="taxEnabled" v-model="form.tax_enabled" :disabled="!canEditHeader" type="checkbox" class="h-4 w-4 accent-[var(--nexora-primary-color)]" />
              <label for="taxEnabled" class="text-sm" style="color: var(--nexora-input-text);">Aplicar</label>
              <input v-model.number="form.tax_rate" :disabled="!canEditHeader || !form.tax_enabled" type="number" min="0" step="0.01" class="ml-auto w-16 min-w-0 rounded-lg border bg-transparent px-1.5 py-1 text-right text-sm outline-none disabled:opacity-50"
                     style="border-color: var(--nexora-input-border); color: var(--nexora-input-text);" />
              <span class="text-xs nxr-text-muted">%</span>
            </div>
            <div v-if="form.tax_enabled" class="mt-2 flex justify-between text-sm">
              <span class="nxr-text-muted">IVA ({{ form.tax_rate || 0 }}%)</span>
              <span class="nxr-text">{{ fmtMoney(livePreview.taxAmount) }}</span>
            </div>
          </div>

          <div class="flex justify-between border-t pt-3 text-base font-semibold" style="border-color: var(--nexora-input-border);">
            <span class="nxr-text">Total</span>
            <span class="nxr-text">{{ fmtMoney(livePreview.finalAmount) }}</span>
          </div>
          <p class="text-right text-[11px]" :class="totalsDirty ? 'text-amber-400' : 'nxr-text-soft'">
            {{ totalsDirty ? 'Descuento/IVA sin guardar — pulsá Guardar arriba' : 'Guardado' }}
          </p>
          <p v-if="error" class="text-right text-xs text-red-400">{{ error }}</p>
        </div>
      </div>
    </template>

    <!-- Print target (hidden by print.css until window.print() is called) -->
    <widgets_garage_quote_print
      v-if="store.current && printData"
      :quote="printData.quote"
      :lines="printData.lines"
      :customer="printData.customer"
      :config="printData.config"
    />

    <widgets_cotizaciones_item_picker_modal
      v-if="store.current"
      :open="showItemPicker"
      :quote-id="store.current.id"
      @close="showItemPicker = false"
      @added="(label: string) => triggerToast('Agregado', label, 'success')"
    />

    <AppToast v-for="t in toasts" :key="t.id" :toast="t" @close="removeToast" />
  </div>
</template>
