<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Save, CheckCircle2, XCircle, Plus, Trash2, ExternalLink, Printer } from 'lucide-vue-next';
import { useCotizacionesStore } from '../../stores/cotizaciones';
import { useInventorySuppliersStore } from '../../stores/inventorySuppliers';
import { useTreasurySettingsStore } from '../../stores/treasurySettings';
import { usePermissions } from '../../composables/usePermissions';
import { usePrint } from '../../composables/usePrint';
import { useToast } from '../../composables/useToast';
import AppToast from '../../components/AppToast.vue';
import widgets_garage_product_combobox from '../../widgets/widgets_garage_product_combobox.vue';
import widgets_garage_customer_combobox from '../../widgets/widgets_garage_customer_combobox.vue';
import widgets_garage_quote_print from '../../widgets/widgets_garage_quote_print.vue';
import { cotizacionesService } from '../../services/cotizacionesService';
import { QUOTE_STATUS_LABEL, QUOTE_MANUAL_STATUSES } from '../../types/cotizaciones';
import type { QuoteFormData, QuoteLineFormData, QuoteLine, QuoteStatus } from '../../types/cotizaciones';

const route = useRoute();
const router = useRouter();
const store = useCotizacionesStore();
const suppliersStore = useInventorySuppliersStore();
const treasurySettingsStore = useTreasurySettingsStore();
const { hasModule } = usePermissions();
const hasInventoryModule = computed(() => hasModule('inventory'));
const { isPrinting, printElement } = usePrint();
const { toasts, triggerToast, removeToast } = useToast();

const isNew = computed(() => route.name === 'cotizaciones-new');
const quoteId = computed(() => Number(route.params.id || 0));

const saving = ref(false);
const error = ref('');

const emptyForm = (): QuoteFormData => ({
  customer_id: null,
  valid_until: '',
  notes: '',
  discount_amount: 0,
});
const form = ref<QuoteFormData>(emptyForm());

const emptyLineForm = (): QuoteLineFormData => ({
  is_non_stocked: false,
  product_id: null,
  quantity: 1,
  unit_price: undefined,
  supplier_id: null,
  supplier_cost: 0,
  margin_pct: 0,
  product_name: '',
  sku: '',
});
const lineForm = ref<QuoteLineFormData>(emptyLineForm());
const addingLine = ref(false);
const lineError = ref('');

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

const canEditHeader = computed(() => isNew.value || store.current?.status === 'draft');
const canEditLines = computed(() => !isNew.value && store.current?.status === 'draft');
const canPrint = computed(() => !isNew.value && !!store.current);

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

const computedUnitPricePreview = computed(() => {
  const cost = Number(lineForm.value.supplier_cost || 0);
  const margin = Number(lineForm.value.margin_pct || 0);
  return Math.round(cost * (1 + margin / 100) * 100) / 100;
});

function fmtMoney(value: number | string | null | undefined) {
  return `$${Math.round(Number(value || 0)).toLocaleString('es-CL')}`;
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
  };
}

async function boot() {
  await Promise.all([
    suppliersStore.load({ status: 'active' }),
    treasurySettingsStore.counterparties.load({ status: 'active' }),
  ]);
  if (isNew.value) {
    store.current = null;
    form.value = emptyForm();
  } else if (quoteId.value) {
    await store.loadOne(quoteId.value);
    loadQuoteIntoForm();
  }
}

onMounted(boot);
watch(() => route.fullPath, boot);

async function save() {
  saving.value = true;
  error.value = '';
  try {
    const payload: QuoteFormData = {
      customer_id: form.value.customer_id || null,
      valid_until: form.value.valid_until || null,
      notes: form.value.notes || null,
      discount_amount: Number(form.value.discount_amount || 0),
    };
    if (isNew.value) {
      const saved = await store.create(payload);
      router.replace(`/cotizaciones/${saved.id}`);
    } else {
      await store.update(quoteId.value, payload);
    }
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al guardar cotización';
  } finally {
    saving.value = false;
  }
}

async function addLine() {
  if (!store.current) return;
  lineError.value = '';
  if (lineForm.value.is_non_stocked) {
    if (!lineForm.value.supplier_id) { lineError.value = 'Selecciona un proveedor para la línea tercerizada'; return; }
    if (!(Number(lineForm.value.supplier_cost) >= 0)) { lineError.value = 'Costo de proveedor inválido'; return; }
  } else if (!lineForm.value.product_id) {
    lineError.value = 'Selecciona un producto';
    return;
  }
  if (!(Number(lineForm.value.quantity) > 0)) { lineError.value = 'La cantidad debe ser mayor a cero'; return; }

  addingLine.value = true;
  try {
    const payload: QuoteLineFormData = { ...lineForm.value };
    if (!payload.unit_price) delete payload.unit_price;
    await store.addLine(store.current.id, payload);
    lineForm.value = emptyLineForm();
  } catch (e: any) {
    lineError.value = e?.response?.data?.error || 'Error al agregar línea';
  } finally {
    addingLine.value = false;
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
            <p class="text-xs nxr-text-muted">{{ store.current ? (QUOTE_STATUS_LABEL[store.current.status] || store.current.status) : 'Borrador' }}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button v-if="canEditHeader" class="nxr-btn nxr-btn-primary" :disabled="saving" @click="save"><Save :size="14" /> {{ saving ? 'Guardando...' : 'Guardar' }}</button>
          <button v-if="canPrint" class="nxr-btn nxr-btn-secondary" :disabled="isPrinting" @click="printQuote"><Printer :size="14" /> Imprimir</button>
        </div>
      </div>
    </div>

    <!-- Header fields -->
    <div class="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 p-4 lg:grid-cols-5" :style="{ background: 'var(--nexora-glass-bg)' }">
      <div>
        <label class="mb-1 block text-xs nxr-text-muted">Cliente</label>
        <widgets_garage_customer_combobox v-model="form.customer_id" :disabled="!canEditHeader" placeholder="Buscar o crear cliente..." />
      </div>
      <div>
        <label class="mb-1 block text-xs nxr-text-muted">Válida hasta</label>
        <input v-model="form.valid_until" :disabled="!canEditHeader" type="date" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text" />
      </div>
      <div>
        <label class="mb-1 block text-xs nxr-text-muted">Descuento</label>
        <input v-model.number="form.discount_amount" :disabled="!canEditHeader" type="number" min="0" step="0.01" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text" />
      </div>
      <div v-if="!isNew && store.current">
        <label class="mb-1 block text-xs nxr-text-muted">Estado</label>
        <select
          :value="store.current.status"
          :disabled="isStatusLocked"
          class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text disabled:opacity-60"
          @change="onStatusChange"
        >
          <option v-for="s in statusOptions" :key="s" :value="s">{{ QUOTE_STATUS_LABEL[s] }}</option>
        </select>
        <p v-if="isStatusLocked" class="mt-1 text-[11px] nxr-text-soft">Aprobada: el estado ya no se puede cambiar.</p>
      </div>
      <div>
        <label class="mb-1 block text-xs nxr-text-muted">Notas</label>
        <input v-model="form.notes" :disabled="!canEditHeader" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text" />
      </div>
    </div>

    <!-- Lifecycle info / links -->
    <div v-if="store.current?.status === 'accepted' || store.current?.status === 'paid' || store.current?.status === 'converted'" class="rounded-2xl border border-white/10 p-4 text-sm nxr-text-muted" :style="{ background: 'var(--nexora-glass-bg)' }">
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
    <div v-if="store.current?.status === 'rejected'" class="rounded-2xl border border-red-500/20 p-4 text-sm text-red-300" :style="{ background: 'var(--nexora-glass-bg)' }">
      Rechazada el {{ fmtDate(store.current.rejected_at) }}<span v-if="store.current.rejection_reason"> — {{ store.current.rejection_reason }}</span>.
    </div>

    <!-- Accept form -->
    <div v-if="showAcceptForm" class="rounded-2xl border border-white/10 p-4" :style="{ background: 'var(--nexora-glass-bg)' }">
      <h3 class="mb-3 text-sm font-semibold nxr-text">Aceptar cotización</h3>
      <p class="mb-3 text-xs nxr-text-muted">Selecciona la contraparte de Tesorería a la que se le emitirá el documento por cobrar. No existe vínculo automático cliente → contraparte.</p>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label class="mb-1 block text-xs nxr-text-muted">Contraparte *</label>
          <select v-model.number="acceptCounterpartyId" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text">
            <option :value="null">Seleccionar</option>
            <option v-for="cp in treasurySettingsStore.counterparties.items" :key="cp.id" :value="cp.id">{{ cp.name_snapshot }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs nxr-text-muted">Aceptado por</label>
          <input v-model="acceptedByName" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text" />
        </div>
        <div>
          <label class="mb-1 block text-xs nxr-text-muted">Notas de aceptación</label>
          <input v-model="acceptanceNotes" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text" />
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
      <input v-model="rejectionReason" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text" />
      <div class="mt-3 flex gap-2">
        <button class="nxr-btn nxr-btn-primary" @click="confirmReject"><XCircle :size="14" /> Confirmar rechazo</button>
        <button class="nxr-btn nxr-btn-secondary" @click="showRejectForm = false">Cancelar</button>
      </div>
    </div>

    <!-- Lines -->
    <div v-if="!isNew" class="flex-1 rounded-2xl border border-white/10 p-4" :style="{ background: 'var(--nexora-glass-bg)' }">
      <h2 class="mb-3 text-sm font-semibold nxr-text-muted">Líneas</h2>

      <!-- Add line: kept at the top so it's always reachable without scrolling through items -->
      <div v-if="canEditLines" class="mb-4 rounded-xl border border-white/15 p-3" :style="{ background: 'var(--nexora-glass-bg-strong)' }">
        <div v-if="hasInventoryModule" class="mb-2 flex items-center gap-2">
          <input id="nonStocked" v-model="lineForm.is_non_stocked" type="checkbox" class="h-4 w-4" />
          <label for="nonStocked" class="text-xs nxr-text-muted">Línea tercerizada (sin stock, sourcing por proveedor)</label>
        </div>

        <div v-if="!lineForm.is_non_stocked" class="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <div>
            <label class="mb-1 block text-xs nxr-text-muted">Producto</label>
            <widgets_garage_product_combobox v-model="lineForm.product_id" :unit-price-hint="lineForm.unit_price" placeholder="Buscar o crear producto..." />
          </div>
          <div>
            <label class="mb-1 block text-xs nxr-text-muted">Cantidad</label>
            <input v-model.number="lineForm.quantity" type="number" min="0" step="0.01" class="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm nxr-text" />
          </div>
          <div>
            <label class="mb-1 block text-xs nxr-text-muted">Precio unit. (opcional)</label>
            <input v-model.number="lineForm.unit_price" type="number" min="0" step="0.01" class="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm nxr-text" />
          </div>
          <div class="flex items-end">
            <button class="nxr-btn nxr-btn-secondary w-full justify-center" :disabled="addingLine" @click="addLine"><Plus :size="14" /> Agregar línea</button>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <div class="lg:col-span-2">
            <label class="mb-1 block text-xs nxr-text-muted">Proveedor</label>
            <select v-model.number="lineForm.supplier_id" class="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm nxr-text">
              <option :value="null">Seleccionar</option>
              <option v-for="s in suppliersStore.items" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs nxr-text-muted">Producto (opcional)</label>
            <widgets_garage_product_combobox v-model="lineForm.product_id" :unit-price-hint="computedUnitPricePreview" placeholder="Ninguno" />
          </div>
          <div>
            <label class="mb-1 block text-xs nxr-text-muted">Nombre (si no hay producto)</label>
            <input v-model="lineForm.product_name" class="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm nxr-text" />
          </div>
          <div>
            <label class="mb-1 block text-xs nxr-text-muted">Cantidad</label>
            <input v-model.number="lineForm.quantity" type="number" min="0" step="0.01" class="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm nxr-text" />
          </div>
          <div>
            <label class="mb-1 block text-xs nxr-text-muted">Costo proveedor</label>
            <input v-model.number="lineForm.supplier_cost" type="number" min="0" step="0.01" class="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm nxr-text" />
          </div>
          <div>
            <label class="mb-1 block text-xs nxr-text-muted">Margen %</label>
            <input v-model.number="lineForm.margin_pct" type="number" min="0" step="0.01" class="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm nxr-text" />
          </div>
          <div class="flex items-end">
            <button class="nxr-btn nxr-btn-secondary w-full justify-center" :disabled="addingLine" @click="addLine"><Plus :size="14" /> Agregar línea</button>
          </div>
          <div class="lg:col-span-6 text-xs nxr-text-muted">Precio unitario calculado: <span class="font-medium nxr-text">{{ fmtMoney(computedUnitPricePreview) }}</span></div>
        </div>

        <p v-if="lineError" class="mt-2 text-xs text-red-400">{{ lineError }}</p>
      </div>

      <!-- Items list: scrolls internally once it grows past a handful of rows -->
      <div v-if="(store.current?.lines?.length || 0) === 0" class="py-6 text-center text-sm nxr-text-soft">Sin líneas todavía.</div>
      <div v-else class="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
        <div v-for="line in store.current?.lines" :key="line.id" class="rounded-xl border border-white/10 bg-white/5 p-3">
          <!-- Mobile: description, quantity, price, and delete only — keeps the card scannable on a small screen -->
          <div class="flex items-center justify-between gap-3 sm:hidden">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm nxr-text">{{ line.product_name_snapshot || line.sku_snapshot || 'Ítem sin producto' }}</p>
              <p class="text-sm nxr-text"><span class="nxr-text-muted">Cant. {{ line.quantity }} ·</span> <span class="font-medium">{{ fmtMoney(line.subtotal) }}</span></p>
            </div>
            <button v-if="canEditLines" class="shrink-0 p-1.5 nxr-text-soft hover:text-red-400" aria-label="Eliminar línea" @click="removeLine(line)"><Trash2 :size="18" /></button>
          </div>

          <!-- Tablet/desktop: full detail -->
          <div class="hidden gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
            <div>
              <p class="text-sm nxr-text">{{ line.product_name_snapshot || line.sku_snapshot || 'Ítem sin producto' }}</p>
              <p class="text-xs nxr-text-muted">
                <span v-if="line.is_non_stocked">Tercerizado · {{ line.supplier_name || 'Proveedor' }}</span>
                <span v-else>Stock</span>
              </p>
            </div>
            <div class="text-sm nxr-text-muted">Cant. {{ line.quantity }}</div>
            <div v-if="line.is_non_stocked" class="text-sm nxr-text-muted">Costo {{ fmtMoney(line.supplier_cost) }} · Margen {{ line.margin_pct }}%</div>
            <div v-else class="text-sm nxr-text-muted">-</div>
            <div class="text-sm nxr-text-muted">P. unit. {{ fmtMoney(line.unit_price) }}</div>
            <div class="text-sm font-medium nxr-text">{{ fmtMoney(line.subtotal) }}</div>
            <button v-if="canEditLines" class="nxr-text-soft hover:text-red-400" aria-label="Eliminar línea" @click="removeLine(line)"><Trash2 :size="16" /></button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm nxr-text-muted">
      Guarda la cotización para poder agregar líneas.
    </div>

    <div class="rounded-2xl border border-white/15 p-4" :style="{ background: 'var(--nexora-glass-bg-strong)' }">
      <div class="ml-auto grid max-w-md grid-cols-2 gap-2 text-sm">
        <span class="nxr-text-muted">Subtotal</span><span class="text-right nxr-text">{{ fmtMoney(store.current?.subtotal) }}</span>
        <span class="nxr-text-muted">Descuento</span><span class="text-right nxr-text">{{ fmtMoney(store.current?.discount_amount) }}</span>
        <span class="font-semibold nxr-text">Total</span><span class="text-right font-semibold nxr-text">{{ fmtMoney(store.current?.final_amount) }}</span>
      </div>
      <p v-if="error" class="mt-2 text-right text-xs text-red-400">{{ error }}</p>
    </div>

    <!-- Print target (hidden by print.css until window.print() is called) -->
    <widgets_garage_quote_print
      v-if="store.current && printData"
      :quote="printData.quote"
      :lines="printData.lines"
      :customer="printData.customer"
      :config="printData.config"
    />

    <AppToast v-for="t in toasts" :key="t.id" :toast="t" @close="removeToast" />
  </div>
</template>
