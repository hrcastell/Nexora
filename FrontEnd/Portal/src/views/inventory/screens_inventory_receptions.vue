<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, CheckCircle2, Plus, Save } from 'lucide-vue-next';
import { useInventoryReceiptsStore } from '../../stores/inventoryReceipts';
import { useInventoryPurchaseDocumentsStore } from '../../stores/inventoryPurchaseDocuments';
import { useInventoryWarehousesStore } from '../../stores/inventoryWarehouses';
import type { PurchaseDocument, PurchaseDocumentLine, StockReceiptFormData, StockReceiptLine } from '../../types/inventoryDocuments';

const route = useRoute();
const router = useRouter();
const store = useInventoryReceiptsStore();
const documentsStore = useInventoryPurchaseDocumentsStore();
const warehousesStore = useInventoryWarehousesStore();

const saving = ref(false);
const confirming = ref(false);
const error = ref('');
const sourceDocument = ref<PurchaseDocument | null>(null);
const confirmLines = ref<StockReceiptLine[]>([]);

const isNew = computed(() => route.name === 'inventory-reception-new');
const receiptId = computed(() => Number(route.params.id || 0));
const isDetail = computed(() => isNew.value || !!receiptId.value);
const availableDocuments = computed(() => documentsStore.items.filter((doc) => ['issued', 'partially_received'].includes(doc.status)));
const canConfirm = computed(() => !!store.current && store.current.status === 'draft' && confirmLines.value.some((line) => Number(line.quantity_received) > 0));

const form = ref<StockReceiptFormData>({
  purchase_document_id: 0,
  warehouse_id: 0,
  reception_date: new Date().toISOString().slice(0, 10),
  notes: '',
});

function fmtDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('es-CL') : '-';
}

function fmtMoney(value: number | string | null | undefined) {
  return `$${Math.round(Number(value || 0)).toLocaleString('es-CL')}`;
}

async function boot() {
  await Promise.all([
    documentsStore.load(),
    warehousesStore.load({ status: 'active' }),
  ]);
  if (isDetail.value) {
    if (isNew.value) {
      store.current = null;
      sourceDocument.value = null;
      confirmLines.value = [];
      form.value = { purchase_document_id: 0, warehouse_id: 0, reception_date: new Date().toISOString().slice(0, 10), notes: '' };
    } else {
      const receipt = await store.loadOne(receiptId.value);
      form.value = {
        purchase_document_id: receipt.purchase_document_id,
        warehouse_id: receipt.warehouse_id,
        reception_date: receipt.reception_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        notes: receipt.notes || '',
      };
      await loadSourceDocument(receipt.purchase_document_id);
      if (receipt.lines?.length) confirmLines.value = receipt.lines;
    }
  } else {
    await store.load();
  }
}

onMounted(boot);
watch(() => route.fullPath, boot);

async function loadSourceDocument(documentId: number) {
  if (!documentId) {
    sourceDocument.value = null;
    confirmLines.value = [];
    return;
  }
  const doc = await documentsStore.loadOne(documentId);
  sourceDocument.value = doc;
  confirmLines.value = (doc.lines || [])
    .filter((line: PurchaseDocumentLine) => Number(line.pending_quantity ?? line.quantity) > 0)
    .map((line: PurchaseDocumentLine) => ({
      purchase_document_line_id: Number(line.id),
      product_id: line.product_id,
      product_name_snapshot: line.product_name_snapshot,
      quantity_received: Number(line.pending_quantity ?? line.quantity ?? 0),
      unit_cost: Number(line.unit_cost || 0),
      unit: line.unit,
      batch_number: '',
      serial_number: '',
      expiration_date: '',
      notes: '',
    }));
}

async function saveReceipt() {
  if (!form.value.purchase_document_id || !form.value.warehouse_id) { error.value = 'Selecciona documento y bodega'; return; }
  saving.value = true;
  error.value = '';
  try {
    const receipt = await store.create({ ...form.value, purchase_document_id: Number(form.value.purchase_document_id), warehouse_id: Number(form.value.warehouse_id) });
    router.push(`/inventory/receptions/${receipt.id}`);
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al crear recepción';
  } finally {
    saving.value = false;
  }
}

function maxFor(line: StockReceiptLine) {
  const source = sourceDocument.value?.lines?.find((item) => item.id === line.purchase_document_line_id);
  return Number(source?.pending_quantity ?? source?.quantity ?? line.quantity_received ?? 0);
}

async function confirmReceipt() {
  if (!store.current) return;
  confirming.value = true;
  error.value = '';
  try {
    const lines = confirmLines.value
      .filter((line) => Number(line.quantity_received) > 0)
      .map((line) => ({ ...line, quantity_received: Number(line.quantity_received), unit_cost: Number(line.unit_cost || 0) }));
    await store.confirm(store.current.id, lines);
    await documentsStore.load();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al confirmar recepción';
  } finally {
    confirming.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-[calc(100vh-5rem)] flex-col gap-5 p-6">
    <template v-if="!isDetail">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-xl font-semibold nxr-text">Recepciones</h1>
          <p class="text-xs nxr-text-muted">Entrada física de productos desde documentos emitidos.</p>
        </div>
        <button class="nxr-btn nxr-btn-primary justify-center" @click="router.push('/inventory/receptions/new')"><Plus :size="15" /> Nueva recepción</button>
      </div>

      <div v-if="store.loading" class="space-y-2"><div v-for="i in 6" :key="i" class="h-16 animate-pulse rounded-xl bg-white/5"></div></div>
      <div v-else-if="store.items.length === 0" class="py-16 text-center text-sm nxr-text-soft">Sin recepciones registradas.</div>
      <div v-else class="flex flex-col gap-2">
        <button v-for="receipt in store.items" :key="receipt.id" class="rounded-xl border border-white/10 p-4 text-left transition hover:border-white/25" :style="{ background: 'var(--nexora-glass-bg)' }" @click="router.push(`/inventory/receptions/${receipt.id}`)">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold nxr-text">{{ receipt.receipt_number }}</p>
              <p class="text-xs nxr-text-muted">{{ receipt.internal_number }} · {{ receipt.warehouse_name }}</p>
            </div>
            <div class="text-left sm:text-right"><p class="text-sm nxr-text">{{ fmtDate(receipt.reception_date) }}</p><p class="text-xs nxr-text-muted">{{ receipt.status }}</p></div>
          </div>
        </button>
      </div>
    </template>

    <template v-else>
      <div class="rounded-2xl border border-white/10 p-4" :style="{ background: 'var(--nexora-glass-bg)' }">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-3">
            <button class="nxr-text-muted hover:text-[var(--nexora-text-color)]" @click="router.push('/inventory/receptions')"><ArrowLeft :size="20" /></button>
            <div>
              <h1 class="text-lg font-semibold nxr-text">{{ isNew ? 'Nueva recepción' : store.current?.receipt_number }}</h1>
              <p class="text-xs nxr-text-muted">{{ store.current?.status || 'draft' }}</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button v-if="isNew" class="nxr-btn nxr-btn-primary" :disabled="saving" @click="saveReceipt"><Save :size="14" /> {{ saving ? 'Guardando...' : 'Crear' }}</button>
            <button v-else-if="canConfirm" class="nxr-btn nxr-btn-primary" :disabled="confirming" @click="confirmReceipt"><CheckCircle2 :size="14" /> {{ confirming ? 'Confirmando...' : 'Confirmar' }}</button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 p-4 lg:grid-cols-4" :style="{ background: 'var(--nexora-glass-bg)' }">
        <div class="lg:col-span-2"><label class="mb-1 block text-xs nxr-text-muted">Documento origen</label><select v-model.number="form.purchase_document_id" :disabled="!isNew" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text" @change="loadSourceDocument(form.purchase_document_id)"><option :value="0">Seleccionar</option><option v-for="doc in availableDocuments" :key="doc.id" :value="doc.id">{{ doc.internal_number }} · {{ doc.supplier_name }} · {{ fmtMoney(doc.total) }}</option></select></div>
        <div><label class="mb-1 block text-xs nxr-text-muted">Bodega</label><select v-model.number="form.warehouse_id" :disabled="!isNew" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text"><option :value="0">Seleccionar</option><option v-for="warehouse in warehousesStore.items" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option></select></div>
        <div><label class="mb-1 block text-xs nxr-text-muted">Fecha</label><input v-model="form.reception_date" :disabled="!isNew" type="date" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm nxr-text" /></div>
      </div>

      <div class="flex-1 rounded-2xl border border-white/10 p-4" :style="{ background: 'var(--nexora-glass-bg)' }">
        <div class="mb-3"><h2 class="text-sm font-semibold nxr-text">Líneas a recibir</h2><p class="text-xs nxr-text-soft">La cantidad no puede superar el pendiente del documento origen.</p></div>
        <div v-if="!sourceDocument" class="py-12 text-center text-sm nxr-text-soft">Selecciona un documento emitido para cargar pendientes.</div>
        <div v-else-if="confirmLines.length === 0" class="py-12 text-center text-sm nxr-text-soft">El documento no tiene pendientes por recibir.</div>
        <div v-else class="flex flex-col gap-2">
          <div v-for="line in confirmLines" :key="line.purchase_document_line_id" class="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 lg:grid-cols-[2fr_repeat(5,1fr)]">
            <div><p class="text-sm font-medium nxr-text">{{ line.product_name_snapshot || `Producto #${line.product_id}` }}</p><p class="text-xs nxr-text-soft">Pendiente: {{ maxFor(line) }} {{ line.unit }}</p></div>
            <div><label class="mb-1 block text-xs nxr-text-muted">Recibir</label><input v-model.number="line.quantity_received" :disabled="store.current?.status !== 'draft'" type="number" min="0" :max="maxFor(line)" step="0.01" class="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm nxr-text" /></div>
            <div><label class="mb-1 block text-xs nxr-text-muted">Costo</label><input v-model.number="line.unit_cost" :disabled="store.current?.status !== 'draft'" type="number" min="0" step="0.01" class="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm nxr-text" /></div>
            <div><label class="mb-1 block text-xs nxr-text-muted">Lote</label><input v-model="line.batch_number" :disabled="store.current?.status !== 'draft'" class="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm nxr-text" /></div>
            <div><label class="mb-1 block text-xs nxr-text-muted">Serie</label><input v-model="line.serial_number" :disabled="store.current?.status !== 'draft'" class="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm nxr-text" /></div>
            <div><label class="mb-1 block text-xs nxr-text-muted">Vence</label><input v-model="line.expiration_date" :disabled="store.current?.status !== 'draft'" type="date" class="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm nxr-text" /></div>
          </div>
        </div>
        <p v-if="error" class="mt-3 text-xs text-red-400">{{ error }}</p>
      </div>
    </template>
  </div>
</template>
