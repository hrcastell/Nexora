<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Plus, Save, Send, XCircle, Trash2 } from 'lucide-vue-next';
import { useInventoryPurchaseDocumentsStore } from '../../stores/inventoryPurchaseDocuments';
import { useInventorySuppliersStore } from '../../stores/inventorySuppliers';
import { useGarageProductsStore } from '../../stores/garageProducts';
import type { Product } from '../../types/garage';
import type { PurchaseDocument, PurchaseDocumentFormData, PurchaseDocumentLine, PurchaseDocumentStatus } from '../../types/inventoryDocuments';

const route = useRoute();
const router = useRouter();
const store = useInventoryPurchaseDocumentsStore();
const suppliersStore = useInventorySuppliersStore();
const productsStore = useGarageProductsStore();

const statusFilter = ref('');
const saving = ref(false);
const error = ref('');

const isNew = computed(() => route.name === 'inventory-purchase-document-new');
const docId = computed(() => Number(route.params.id || 0));
const isDetail = computed(() => isNew.value || !!docId.value);
const inventoryProducts = computed(() => productsStore.items.filter((product) => product.inventory_enabled));

const emptyLine = (): PurchaseDocumentLine => ({
  product_id: 0,
  quantity: 1,
  unit: 'unidad',
  unit_cost: 0,
  discount_percent: 0,
  tax_percent: 0,
  line_total: 0,
  notes: '',
});

const emptyForm = (): PurchaseDocumentFormData => ({
  document_type: 'purchase_order',
  supplier_document_number: '',
  supplier_id: 0,
  issue_date: new Date().toISOString().slice(0, 10),
  expected_reception_date: '',
  due_date: '',
  payment_condition: 'cash',
  payment_term_days: 0,
  currency: 'CLP',
  notes: '',
  lines: [emptyLine()],
});

const form = ref<PurchaseDocumentFormData>(emptyForm());

const subtotal = computed(() => form.value.lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_cost || 0), 0));
const discountTotal = computed(() => form.value.lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_cost || 0) * Number(line.discount_percent || 0) / 100, 0));
const taxTotal = computed(() => form.value.lines.reduce((sum, line) => sum + (Number(line.quantity || 0) * Number(line.unit_cost || 0) * (1 - Number(line.discount_percent || 0) / 100)) * Number(line.tax_percent || 0) / 100, 0));
const total = computed(() => subtotal.value - discountTotal.value + taxTotal.value);
const canEdit = computed(() => isNew.value || store.current?.status === 'draft');
const canIssue = computed(() => !!store.current && store.current.status === 'draft');
const canCancel = computed(() => !!store.current && ['draft', 'issued'].includes(store.current.status));

const STATUS_LABEL: Record<PurchaseDocumentStatus, string> = {
  draft: 'Borrador',
  issued: 'Emitido',
  partially_received: 'Recepcion parcial',
  received: 'Recibido',
  cancelled: 'Cancelado',
};

function fmtMoney(value: number | string | null | undefined) {
  return `$${Math.round(Number(value || 0)).toLocaleString('es-CL')}`;
}

function fmtDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('es-CL') : '-';
}

function cleanDate(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function loadDocumentIntoForm(doc: PurchaseDocument) {
  form.value = {
    document_type: doc.document_type,
    supplier_document_number: doc.supplier_document_number || '',
    supplier_id: doc.supplier_id,
    issue_date: cleanDate(doc.issue_date),
    expected_reception_date: cleanDate(doc.expected_reception_date),
    due_date: cleanDate(doc.due_date),
    payment_condition: doc.payment_condition,
    payment_term_days: Number(doc.payment_term_days || 0),
    currency: doc.currency || 'CLP',
    notes: doc.notes || '',
    lines: (doc.lines?.length ? doc.lines : [emptyLine()]).map((line) => ({
      id: line.id,
      purchase_document_id: line.purchase_document_id,
      product_id: line.product_id,
      product_name_snapshot: line.product_name_snapshot,
      sku_snapshot: line.sku_snapshot,
      quantity: Number(line.quantity || 0),
      received_quantity: Number(line.received_quantity || 0),
      pending_quantity: Number(line.pending_quantity ?? line.quantity ?? 0),
      unit: line.unit || 'unidad',
      unit_cost: Number(line.unit_cost || 0),
      discount_percent: Number(line.discount_percent || 0),
      tax_percent: Number(line.tax_percent || 0),
      line_total: Number(line.line_total || 0),
      notes: line.notes || '',
    })),
  };
}

async function boot() {
  await Promise.all([
    suppliersStore.load({ status: 'active' }),
    productsStore.load({ status: 'active', limit: 200 }),
  ]);
  if (isDetail.value) {
    if (isNew.value) {
      store.current = null;
      form.value = emptyForm();
    } else {
      const doc = await store.loadOne(docId.value);
      loadDocumentIntoForm(doc);
    }
  } else {
    await store.load({ status: statusFilter.value || undefined });
  }
}

onMounted(boot);
watch(() => route.fullPath, boot);
watch(statusFilter, () => { if (!isDetail.value) store.load({ status: statusFilter.value || undefined }); });

function onProductChange(line: PurchaseDocumentLine) {
  const product = inventoryProducts.value.find((item: Product) => item.id === Number(line.product_id));
  if (!product) return;
  line.unit = product.purchase_unit || product.unit || 'unidad';
  line.unit_cost = Number(product.last_purchase_cost || product.average_cost || product.reference_price || 0);
  recalcLine(line);
}

function recalcLine(line: PurchaseDocumentLine) {
  const gross = Number(line.quantity || 0) * Number(line.unit_cost || 0);
  line.line_total = gross * (1 - Number(line.discount_percent || 0) / 100) * (1 + Number(line.tax_percent || 0) / 100);
}

function addLine() {
  form.value.lines.push(emptyLine());
}

function removeLine(index: number) {
  if (form.value.lines.length === 1) return;
  form.value.lines.splice(index, 1);
}

function payload(): PurchaseDocumentFormData {
  return {
    ...form.value,
    supplier_id: Number(form.value.supplier_id),
    payment_term_days: Number(form.value.payment_term_days || 0),
    lines: form.value.lines.map((line) => ({
      ...line,
      product_id: Number(line.product_id),
      quantity: Number(line.quantity || 0),
      unit_cost: Number(line.unit_cost || 0),
      discount_percent: Number(line.discount_percent || 0),
      tax_percent: Number(line.tax_percent || 0),
      line_total: Number(line.line_total || 0),
    })),
  };
}

async function save() {
  if (!form.value.supplier_id) { error.value = 'Selecciona un proveedor'; return; }
  if (!form.value.lines.every((line) => line.product_id && Number(line.quantity) > 0)) { error.value = 'Cada linea requiere producto y cantidad mayor a cero'; return; }
  saving.value = true;
  error.value = '';
  try {
    const saved = isNew.value ? await store.create(payload()) : await store.update(docId.value, payload());
    router.push(`/inventory/purchase-documents/${saved.id}`);
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al guardar documento';
  } finally {
    saving.value = false;
  }
}

async function changeStatus(status: PurchaseDocumentStatus) {
  if (!store.current) return;
  await store.changeStatus(store.current.id, status);
  await store.loadOne(store.current.id);
}
</script>

<template>
  <div class="flex min-h-[calc(100vh-5rem)] flex-col gap-5 p-6">
    <template v-if="!isDetail">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-xl font-semibold text-white">Documentos de compra</h1>
          <p class="text-xs text-white/40">Ordenes y facturas de compra para inventario.</p>
        </div>
        <button class="nxr-btn nxr-btn-primary justify-center" @click="router.push('/inventory/purchase-documents/new')"><Plus :size="15" /> Nuevo documento</button>
      </div>

      <select v-model="statusFilter" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none sm:w-56">
        <option value="">Todos los estados</option>
        <option value="draft">Borrador</option>
        <option value="issued">Emitido</option>
        <option value="partially_received">Recepcion parcial</option>
        <option value="received">Recibido</option>
        <option value="cancelled">Cancelado</option>
      </select>

      <div v-if="store.loading" class="space-y-2"><div v-for="i in 6" :key="i" class="h-16 animate-pulse rounded-xl bg-white/5"></div></div>
      <div v-else-if="store.items.length === 0" class="py-16 text-center text-sm text-white/30">Sin documentos de compra.</div>
      <div v-else class="flex flex-col gap-2">
        <button v-for="doc in store.items" :key="doc.id" class="rounded-xl border border-white/10 p-4 text-left transition hover:border-white/25" :style="{ background: 'var(--nexora-glass-bg)' }" @click="router.push(`/inventory/purchase-documents/${doc.id}`)">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-white">{{ doc.internal_number }}</p>
              <p class="text-xs text-white/40">{{ doc.supplier_name }} ? {{ fmtDate(doc.issue_date) }}</p>
            </div>
            <div class="text-left sm:text-right">
              <p class="text-sm font-semibold text-white">{{ fmtMoney(doc.total) }}</p>
              <p class="text-xs text-white/40">{{ STATUS_LABEL[doc.status] || doc.status }}</p>
            </div>
          </div>
        </button>
      </div>
    </template>

    <template v-else>
      <div class="sticky top-0 z-10 -mx-6 -mt-6 border-b border-white/10 bg-black/30 px-6 py-4 backdrop-blur-xl">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-3">
            <button class="text-white/40 hover:text-white" @click="router.push('/inventory/purchase-documents')"><ArrowLeft :size="20" /></button>
            <div>
              <h1 class="text-lg font-semibold text-white">{{ isNew ? 'Nuevo documento de compra' : store.current?.internal_number }}</h1>
              <p class="text-xs text-white/40">{{ store.current ? STATUS_LABEL[store.current.status] : 'Borrador' }}</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button v-if="canCancel" class="nxr-btn nxr-btn-secondary" @click="changeStatus('cancelled')"><XCircle :size="14" /> Cancelar</button>
            <button v-if="canIssue" class="nxr-btn nxr-btn-primary" @click="changeStatus('issued')"><Send :size="14" /> Emitir</button>
            <button v-if="canEdit" class="nxr-btn nxr-btn-primary" :disabled="saving" @click="save"><Save :size="14" /> {{ saving ? 'Guardando...' : 'Guardar' }}</button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 p-4 lg:grid-cols-4" :style="{ background: 'var(--nexora-glass-bg)' }">
        <div><label class="mb-1 block text-xs text-white/50">Tipo</label><select v-model="form.document_type" :disabled="!canEdit" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"><option value="purchase_order">Orden de compra</option><option value="purchase_invoice">Factura de compra</option></select></div>
        <div><label class="mb-1 block text-xs text-white/50">Proveedor</label><select v-model.number="form.supplier_id" :disabled="!canEdit" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"><option :value="0">Seleccionar</option><option v-for="supplier in suppliersStore.items" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option></select></div>
        <div><label class="mb-1 block text-xs text-white/50">Fecha emision</label><input v-model="form.issue_date" :disabled="!canEdit" type="date" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" /></div>
        <div><label class="mb-1 block text-xs text-white/50">Recepcion esperada</label><input v-model="form.expected_reception_date" :disabled="!canEdit" type="date" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" /></div>
        <div><label class="mb-1 block text-xs text-white/50">Folio proveedor</label><input v-model="form.supplier_document_number" :disabled="!canEdit" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" /></div>
        <div><label class="mb-1 block text-xs text-white/50">Condicion pago</label><select v-model="form.payment_condition" :disabled="!canEdit" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"><option value="cash">Contado</option><option value="credit">Credito</option></select></div>
        <div><label class="mb-1 block text-xs text-white/50">Dias pago</label><input v-model.number="form.payment_term_days" :disabled="!canEdit" type="number" min="0" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" /></div>
        <div><label class="mb-1 block text-xs text-white/50">Vencimiento</label><input v-model="form.due_date" :disabled="!canEdit" type="date" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" /></div>
      </div>

      <div class="flex-1 rounded-2xl border border-white/10 p-4" :style="{ background: 'var(--nexora-glass-bg)' }">
        <div class="mb-3 flex items-center justify-between"><h2 class="text-sm font-semibold text-white/70">Lineas</h2><button v-if="canEdit" class="nxr-btn nxr-btn-secondary" @click="addLine"><Plus :size="14" /> Agregar linea</button></div>
        <div class="hidden grid-cols-[2fr_repeat(5,1fr)_auto] gap-2 text-xs text-white/40 lg:grid"><span>Producto</span><span>Cant.</span><span>Unidad</span><span>Costo</span><span>Desc. %</span><span>Imp. %</span><span></span></div>
        <div class="mt-2 flex flex-col gap-2">
          <div v-for="(line, index) in form.lines" :key="index" class="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 lg:grid-cols-[2fr_repeat(5,1fr)_auto]">
            <select v-model.number="line.product_id" :disabled="!canEdit" class="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" @change="onProductChange(line)"><option :value="0">Producto</option><option v-for="product in inventoryProducts" :key="product.id" :value="product.id">{{ product.name }}</option></select>
            <input v-model.number="line.quantity" :disabled="!canEdit" type="number" min="0" step="0.01" class="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" @input="recalcLine(line)" />
            <input v-model="line.unit" :disabled="!canEdit" class="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
            <input v-model.number="line.unit_cost" :disabled="!canEdit" type="number" min="0" step="0.01" class="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" @input="recalcLine(line)" />
            <input v-model.number="line.discount_percent" :disabled="!canEdit" type="number" min="0" step="0.01" class="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" @input="recalcLine(line)" />
            <input v-model.number="line.tax_percent" :disabled="!canEdit" type="number" min="0" step="0.01" class="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" @input="recalcLine(line)" />
            <button v-if="canEdit" class="text-white/30 hover:text-red-400" @click="removeLine(index)"><Trash2 :size="16" /></button>
          </div>
        </div>
      </div>

      <div class="sticky bottom-0 -mx-6 border-t border-white/10 bg-black/40 px-6 py-4 backdrop-blur-xl">
        <div class="ml-auto grid max-w-md grid-cols-2 gap-2 text-sm"><span class="text-white/40">Subtotal</span><span class="text-right text-white">{{ fmtMoney(subtotal) }}</span><span class="text-white/40">Descuento</span><span class="text-right text-white">{{ fmtMoney(discountTotal) }}</span><span class="text-white/40">Impuestos</span><span class="text-right text-white">{{ fmtMoney(taxTotal) }}</span><span class="font-semibold text-white">Total</span><span class="text-right font-semibold text-white">{{ fmtMoney(total) }}</span></div>
        <p v-if="error" class="mt-2 text-right text-xs text-red-400">{{ error }}</p>
      </div>
    </template>
  </div>
</template>
