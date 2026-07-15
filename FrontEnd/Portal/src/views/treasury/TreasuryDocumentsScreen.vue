<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Plus, Save, Search, Trash2 } from 'lucide-vue-next';
import { useTreasuryDocumentsStore } from '../../stores/treasuryDocuments';
import { useTreasurySettingsStore } from '../../stores/treasurySettings';
import type { TreasuryPaymentTerm } from '../../types/treasury';
import type { TreasuryDirection, TreasuryDocument, TreasuryDocumentLine, TreasuryDocumentPayload } from '../../types/treasuryDocuments';

const props = defineProps<{ direction: TreasuryDirection; title: string; basePath: string }>();
const route = useRoute();
const router = useRouter();
const store = useTreasuryDocumentsStore();
const settings = useTreasurySettingsStore();
const query = ref('');
const saving = ref(false);
const error = ref('');
const id = computed(() => Number(route.params.id || 0));
const isNew = computed(() => route.name === `${props.basePath.slice(1).replace(/\//g, '-')}-new`);
const isDetail = computed(() => isNew.value || !!id.value);

function emptyLine(): TreasuryDocumentLine {
  return { description: '', quantity: 1, unit_price: 0, line_total: 0 };
}

function emptyForm(): TreasuryDocumentPayload {
  return {
    document_type: props.direction === 'receivable' ? 'sale_invoice' : 'purchase_invoice',
    counterparty_id: 0,
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: null,
    payment_term_id: null,
    external_number: '',
    currency: 'CLP',
    total_amount: 0,
    subtotal: 0,
    tax_total: 0,
    discount_total: 0,
    notes: '',
    lines: [emptyLine()],
  };
}

const form = ref<TreasuryDocumentPayload>(emptyForm());
const subtotal = computed(() => form.value.lines.reduce((sum, line) => sum + Number(line.line_total || 0), 0));
const selectedTerm = computed(() => settings.paymentTerms.items.find(term => term.id === Number(form.value.payment_term_id)) as TreasuryPaymentTerm | undefined);
const canEditLines = computed(() => isNew.value);

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: form.value.currency || 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function addDays(date: string, days: number) {
  if (!date) return null;
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + Math.max(0, days));
  return result.toISOString().slice(0, 10);
}

function syncDueDate() {
  const term = selectedTerm.value;
  if (!term) return;
  form.value.due_date = term.term_type === 'cash' ? null : addDays(form.value.issue_date, Number(term.days_due || 0));
}

function recalculateLine(line: TreasuryDocumentLine) {
  line.line_total = Number(line.quantity || 0) * Number(line.unit_price || 0);
}

function addLine() { form.value.lines.push(emptyLine()); }
function removeLine(index: number) {
  if (form.value.lines.length > 1) form.value.lines.splice(index, 1);
}

function loadDocument(document: TreasuryDocument) {
  form.value = {
    document_type: document.document_type,
    counterparty_id: document.counterparty_id,
    issue_date: document.issue_date.slice(0, 10),
    due_date: document.due_date?.slice(0, 10) || null,
    payment_term_id: document.payment_term_id || null,
    external_number: document.external_number || '',
    currency: document.currency || 'CLP',
    total_amount: Number(document.total_amount),
    subtotal: Number(document.subtotal || document.total_amount),
    tax_total: Number(document.tax_total || 0),
    discount_total: Number(document.discount_total || 0),
    notes: document.notes || '',
    lines: document.lines?.length ? document.lines.map(line => ({ ...line, quantity: Number(line.quantity), unit_price: Number(line.unit_price), line_total: Number(line.line_total) })) : [emptyLine()],
  };
}

async function boot() {
  await Promise.all([settings.counterparties.load({ status: 'active' }), settings.paymentTerms.load({ status: 'active' })]);
  if (!isDetail.value) { await store.load(props.direction, { q: query.value || undefined }); return; }
  if (isNew.value) { store.current = null; form.value = emptyForm(); return; }
  loadDocument(await store.loadOne(props.direction, id.value));
}

async function save() {
  if (!form.value.counterparty_id || !form.value.issue_date) { error.value = 'Seleccioná una contraparte y fecha de emisión.'; return; }
  if (isNew.value && !form.value.lines.every(line => line.description.trim() && Number(line.quantity) > 0 && Number(line.unit_price) >= 0)) { error.value = 'Cada línea requiere descripción, cantidad y precio válidos.'; return; }
  saving.value = true;
  error.value = '';
  try {
    if (!isNew.value) {
      await store.update(props.direction, id.value, {
        counterparty_id: Number(form.value.counterparty_id), issue_date: form.value.issue_date, due_date: form.value.due_date,
        payment_term_id: form.value.payment_term_id || null, external_number: form.value.external_number || '', currency: form.value.currency, notes: form.value.notes,
      });
      await boot();
      return;
    }
    const document = await store.create(props.direction, {
      ...form.value,
      counterparty_id: Number(form.value.counterparty_id),
      total_amount: subtotal.value,
      subtotal: subtotal.value,
      lines: [],
    });
    for (const line of form.value.lines) {
      await store.createLine(props.direction, document.id, { description: line.description.trim(), quantity: Number(line.quantity), unit_price: Number(line.unit_price), line_total: Number(line.line_total) });
    }
    router.push(`${props.basePath}/${document.id}`);
  } catch (cause: any) {
    error.value = cause?.response?.data?.error || 'No fue posible guardar el documento.';
  } finally { saving.value = false; }
}

onMounted(boot);
watch(() => route.fullPath, boot);
watch(query, () => { if (!isDetail.value) store.load(props.direction, { q: query.value || undefined }); });
watch(() => form.value.payment_term_id, syncDueDate);
watch(() => form.value.issue_date, syncDueDate);
</script>

<template>
  <div class="flex min-h-[calc(100vh-5rem)] flex-col gap-5 p-3 sm:p-6">
    <template v-if="!isDetail">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 class="text-xl font-semibold text-white">{{ title }}</h1><p class="text-xs text-white/40">Documentos financieros pendientes de gestión.</p></div>
        <button class="nxr-btn nxr-btn-primary justify-center" @click="router.push(`${basePath}/new`)"><Plus :size="15" /> Nuevo documento</button>
      </div>
      <div class="relative"><Search :size="14" class="absolute left-3 top-3 text-white/30"/><input v-model="query" placeholder="Buscar..." class="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 text-sm text-white"/></div>
      <p v-if="store.error" class="text-sm text-red-400">{{ store.error }}</p>
      <div v-if="store.loading" class="space-y-2"><div v-for="item in 5" :key="item" class="h-20 animate-pulse rounded-xl bg-white/5" /></div>
      <div v-else-if="!store.items.length" class="py-16 text-center text-sm text-white/35">Sin documentos.</div>
      <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <button v-for="document in store.items" :key="document.id" class="rounded-xl border border-white/10 p-4 text-left transition hover:border-white/25" :style="{ background: 'var(--nexora-glass-bg)' }" @click="router.push(`${basePath}/${document.id}`)">
          <div class="flex items-start justify-between gap-3"><div><p class="font-semibold text-white">{{ document.internal_number }}</p><p class="text-xs text-white/40">{{ document.counterparty_name }} · {{ document.issue_date }}</p></div><span class="text-xs text-white/45">{{ document.status }}</span></div>
          <p class="mt-3 text-sm text-white">{{ money(document.balance_amount) }} pendiente</p>
        </button>
      </div>
    </template>

    <template v-else>
      <div class="sticky top-0 z-10 -mx-3 -mt-3 border-b border-white/10 bg-black/35 px-3 py-4 backdrop-blur-xl sm:-mx-6 sm:-mt-6 sm:px-6">
        <div class="flex items-center justify-between gap-3"><button class="text-white/60 hover:text-white" @click="router.push(basePath)"><ArrowLeft :size="20" /></button><div class="min-w-0 flex-1"><h1 class="truncate text-lg font-semibold text-white">{{ isNew ? `Nuevo documento · ${title}` : store.current?.internal_number }}</h1><p class="text-xs text-white/40">{{ isNew ? 'Borrador' : store.current?.status }}</p></div><button class="nxr-btn nxr-btn-primary" :disabled="saving" @click="save"><Save :size="15" /> {{ saving ? 'Guardando...' : 'Guardar' }}</button></div>
      </div>

      <div class="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 p-4 md:grid-cols-2 xl:grid-cols-4" :style="{ background: 'var(--nexora-glass-bg)' }">
        <label class="text-xs text-white/50">Contraparte<select v-model.number="form.counterparty_id" class="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-white"><option :value="0">Seleccionar</option><option v-for="item in settings.counterparties.items" :key="item.id" :value="item.id">{{ item.name_snapshot }}</option></select></label>
        <label class="text-xs text-white/50">Fecha de emisión<input v-model="form.issue_date" type="date" class="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-white" /></label>
        <label class="text-xs text-white/50">Condición de pago<select v-model.number="form.payment_term_id" class="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-white"><option :value="null">Sin condición</option><option v-for="term in settings.paymentTerms.items" :key="term.id" :value="term.id">{{ term.name }}</option></select></label>
        <label class="text-xs text-white/50">Vencimiento<input v-model="form.due_date" type="date" class="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-white" /></label>
        <label class="text-xs text-white/50">Tipo<select v-model="form.document_type" class="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-white"><option value="sale_invoice">Factura</option><option value="purchase_invoice">Factura de compra</option><option value="sale_note">Nota</option><option value="debit_note">Nota de débito</option><option value="credit_note">Nota de crédito</option></select></label>
        <label class="text-xs text-white/50">Folio externo<input v-model="form.external_number" class="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-white" /></label>
        <label class="text-xs text-white/50">Moneda<input v-model="form.currency" maxlength="3" class="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2 text-sm uppercase text-white" /></label>
        <label class="text-xs text-white/50">Notas<textarea v-model="form.notes" rows="1" class="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-white" /></label>
      </div>

      <div class="flex-1 rounded-2xl border border-white/10 p-4" :style="{ background: 'var(--nexora-glass-bg)' }">
        <div class="mb-3 flex items-center justify-between"><h2 class="text-sm font-semibold text-white">Líneas</h2><button v-if="canEditLines" class="nxr-btn nxr-btn-secondary" @click="addLine"><Plus :size="14" /> Agregar línea</button></div>
        <div class="hidden grid-cols-[2fr_repeat(2,1fr)_120px_auto] gap-2 text-xs text-white/40 lg:grid"><span>Descripción</span><span>Cantidad</span><span>Precio unitario</span><span class="text-right">Total</span><span /></div>
        <div class="mt-2 flex flex-col gap-2">
          <div v-for="(line, index) in form.lines" :key="line.id || index" class="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 sm:grid-cols-2 lg:grid-cols-[2fr_repeat(2,1fr)_120px_auto]">
            <label class="text-xs text-white/45 lg:text-[0px]"><span class="lg:hidden">Descripción</span><input v-model="line.description" :disabled="!canEditLines" class="mt-1 w-full rounded-xl border border-white/10 bg-black/20 p-2 text-sm text-white lg:mt-0" /></label>
            <label class="text-xs text-white/45 lg:text-[0px]"><span class="lg:hidden">Cantidad</span><input v-model.number="line.quantity" :disabled="!canEditLines" type="number" min="0" step="0.01" class="mt-1 w-full rounded-xl border border-white/10 bg-black/20 p-2 text-sm text-white lg:mt-0" @input="recalculateLine(line)" /></label>
            <label class="text-xs text-white/45 lg:text-[0px]"><span class="lg:hidden">Precio unitario</span><input v-model.number="line.unit_price" :disabled="!canEditLines" type="number" min="0" step="0.01" class="mt-1 w-full rounded-xl border border-white/10 bg-black/20 p-2 text-sm text-white lg:mt-0" @input="recalculateLine(line)" /></label>
            <div class="flex items-end justify-between text-sm text-white lg:justify-end"><span class="text-xs text-white/45 lg:hidden">Total</span><span class="font-medium">{{ money(line.line_total) }}</span></div>
            <button v-if="canEditLines" class="text-white/35 hover:text-red-400" aria-label="Eliminar línea" @click="removeLine(index)"><Trash2 :size="16" /></button>
          </div>
        </div>
      </div>

      <div class="sticky bottom-0 z-10 -mx-3 border-t border-white/10 bg-black/45 px-3 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6"><div class="ml-auto grid max-w-sm grid-cols-2 gap-2 text-sm"><span class="text-white/45">Subtotal</span><span class="text-right text-white">{{ money(subtotal) }}</span><span class="font-semibold text-white">Total</span><span class="text-right font-semibold text-white">{{ money(subtotal) }}</span></div><p v-if="error" class="mt-2 text-right text-xs text-red-400">{{ error }}</p></div>
    </template>
  </div>
</template>
