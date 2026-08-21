<script setup lang="ts">
import { computed, ref } from 'vue';
import { Plus } from 'lucide-vue-next';
import { useGarageProductsStore } from '../stores/garageProducts';
import { garageProductsService } from '../services/garageProductsService';
import type { Product } from '../types/garage';

// Manual-item description field with the same search-or-create pattern as
// widgets_garage_customer_combobox, plus a third path that combobox doesn't
// have: typing something that never resolves to a catalog match/creation is
// itself valid — it becomes a plain reference-only line (product_id stays
// null, the typed text is snapshotted as-is). No dedicated "use as
// reference" button needed for that path; not clicking a suggestion IS it.
const props = defineProps<{
  productId: number | null;
  productName: string;
  unitPriceHint?: number | null;
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:productId', val: number | null): void;
  (e: 'update:productName', val: string): void;
  (e: 'price-hint', price: number): void;
}>();

const productsStore = useGarageProductsStore();
const open = ref(false);
const results = ref<Product[]>([]);
const searching = ref(false);
const creating = ref(false);
const error = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function search(q: string) {
  searching.value = true;
  try {
    const res = await garageProductsService.list({ q, status: 'active', limit: 8 });
    results.value = res.data.data;
  } finally {
    searching.value = false;
  }
}

function onInput(value: string) {
  emit('update:productName', value);
  // Editing the text after a selection breaks the link back to that exact
  // product — it's free-text again until the user picks/creates once more.
  if (props.productId) emit('update:productId', null);
  open.value = true;
  if (searchTimer) clearTimeout(searchTimer);
  if (!value.trim()) { results.value = []; return; }
  searchTimer = setTimeout(() => search(value), 300);
}

function onFocus() {
  open.value = true;
  if (props.productName.trim()) search(props.productName);
}

function selectExisting(p: Product) {
  emit('update:productName', p.name);
  emit('update:productId', p.id);
  emit('price-hint', Number(p.reference_price || 0));
  results.value = [];
  open.value = false;
}

async function createNew() {
  const name = props.productName.trim();
  if (!name) return;
  creating.value = true;
  error.value = '';
  try {
    const created = await productsStore.create({
      name,
      sku: '',
      description: '',
      product_type_id: null,
      unit: 'unidad',
      reference_price: Number(props.unitPriceHint || 0),
      currency: 'CLP',
      inventory_enabled: false,
      track_serial: false,
      track_batch: false,
      allow_negative_stock: false,
      reorder_point: 0,
      max_stock: null,
      preferred_supplier_id: null,
      purchase_unit: '',
      sale_unit: '',
      conversion_factor: 1,
      average_cost: 0,
      last_purchase_cost: 0,
      requires_expiration: false,
      storage_notes: '',
    });
    selectExisting(created);
  } catch (e: any) {
    if (e?.response?.status === 409 && e.response.data?.id) {
      try {
        const existing = await garageProductsService.getById(e.response.data.id);
        selectExisting(existing.data);
        return;
      } catch { /* falls through to the generic error below */ }
    }
    error.value = e?.response?.data?.error || 'Error al crear producto';
  } finally {
    creating.value = false;
  }
}

const showCreateOption = computed(() => {
  const q = props.productName.trim();
  if (!q) return false;
  return !results.value.some(r => r.name.trim().toLowerCase() === q.toLowerCase());
});
</script>

<template>
  <div class="relative w-full">
    <input
      :value="productName"
      type="text"
      :placeholder="placeholder || 'Descripción del producto/servicio'"
      :disabled="disabled"
      class="w-full rounded-xl border px-3 py-2 text-sm outline-none disabled:opacity-60"
      style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);"
      @input="onInput(($event.target as HTMLInputElement).value)"
      @focus="onFocus"
      @blur="open = false"
    />

    <div
      v-if="open && (results.length > 0 || searching || showCreateOption)"
      class="absolute z-30 mt-1 w-full rounded-xl border shadow-xl"
      style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border);"
    >
      <ul class="max-h-52 overflow-y-auto">
        <li
          v-for="p in results" :key="p.id"
          class="cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-white/10"
          style="color: var(--nexora-input-text);"
          @mousedown.prevent
          @click="selectExisting(p)"
        >
          {{ p.name }} <span v-if="p.sku" class="ml-1 text-xs nxr-text-soft">· {{ p.sku }}</span>
        </li>
        <li v-if="searching" class="px-3 py-2 text-sm nxr-text-muted">Buscando...</li>

        <li
          v-if="showCreateOption"
          class="flex items-center gap-2 border-t px-3 py-2 text-sm transition-colors hover:bg-white/10 text-[var(--nexora-primary-color)]"
          style="border-color: var(--nexora-input-border);"
          @mousedown.prevent
          @click="createNew"
        >
          <Plus :size="14" />
          {{ creating ? 'Creando...' : `Crear producto "${productName.trim()}"` }}
        </li>
      </ul>
    </div>

    <p v-if="error" class="mt-1 text-xs text-red-400">{{ error }}</p>
    <p v-else-if="!productId && productName.trim()" class="mt-1 text-[11px] nxr-text-soft">Se usará como referencia — no crea un producto en el catálogo</p>
  </div>
</template>
