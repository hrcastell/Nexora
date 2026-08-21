<script setup lang="ts">
import { ref, watch } from 'vue';
import { Package, Wrench, Search } from 'lucide-vue-next';
import AppModal from '../components/AppModal.vue';
import { useCotizacionesStore } from '../stores/cotizaciones';
import { garageProductsService } from '../services/garageProductsService';
import { garageServiceTemplatesService } from '../services/garageServiceTemplatesService';
import type { Product, ServiceTemplate } from '../types/garage';

const props = defineProps<{
  open: boolean;
  quoteId: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'added', label: string): void;
}>();

const store = useCotizacionesStore();

type Tab = 'product' | 'service';
const activeTab = ref<Tab>('product');

// --- Producto tab: search + click-to-add grid, mirrors the reference
// template's product-card catalog (shows the active catalog immediately,
// narrows as you type) ---
const productQuery = ref('');
const productResults = ref<Product[]>([]);
const searchingProducts = ref(false);
const addingProductId = ref<number | null>(null);
let productSearchTimer: ReturnType<typeof setTimeout> | null = null;

async function searchProducts(q: string) {
  searchingProducts.value = true;
  try {
    const res = await garageProductsService.list({ q: q || undefined, status: 'active', limit: 24 });
    productResults.value = res.data.data;
  } finally {
    searchingProducts.value = false;
  }
}

function onProductQueryInput() {
  if (productSearchTimer) clearTimeout(productSearchTimer);
  productSearchTimer = setTimeout(() => searchProducts(productQuery.value), 300);
}

async function pickProduct(p: Product) {
  addingProductId.value = p.id;
  try {
    await store.addLine(props.quoteId, { is_non_stocked: false, product_id: p.id, quantity: 1 });
    emit('added', p.name);
    emit('close');
  } finally {
    addingProductId.value = null;
  }
}

// --- Servicio tab: the configured catalog from "Servicios configurables"
// (service_templates) — same search + click-to-add pattern as Producto.
// Price shown/added is a labor-only estimate (estimated_hours *
// base_labor_rate, margin/tax applied) mirroring the exact formula
// BackEnd/utils/calculateWorkOrderTotals.js recalculateServiceTotals()
// uses for work orders — parts (service_template_products) aren't summed
// here since that needs a per-template fetch (N+1 for a search grid); the
// same "Servicios configurables" screen's own list view shows the same
// level of upfront detail (hours + rate, no full total) for the same
// reason. Adding one snapshots name + computed price as a manual line
// (product_id/supplier_id null) — no service_template_id FK on quote_lines,
// so it deliberately doesn't try to track live linkage back to the
// template, same as how a quote line already only snapshots.
const serviceQuery = ref('');
const serviceResults = ref<ServiceTemplate[]>([]);
const searchingServices = ref(false);
const addingServiceId = ref<number | null>(null);
let serviceSearchTimer: ReturnType<typeof setTimeout> | null = null;

async function searchServices(q: string) {
  searchingServices.value = true;
  try {
    const res = await garageServiceTemplatesService.list({ q: q || undefined, status: 'active', limit: 24 });
    serviceResults.value = res.data.data;
  } finally {
    searchingServices.value = false;
  }
}

function onServiceQueryInput() {
  if (serviceSearchTimer) clearTimeout(serviceSearchTimer);
  serviceSearchTimer = setTimeout(() => searchServices(serviceQuery.value), 300);
}

function servicePrice(s: ServiceTemplate): number {
  const labor = Number(s.estimated_hours || 0) * Number(s.base_labor_rate || 0);
  const withMargin = labor * (1 + Number(s.margin_pct || 0) / 100);
  return Math.round(withMargin * (1 + Number(s.tax_pct || 0) / 100) * 100) / 100;
}

async function pickService(s: ServiceTemplate) {
  addingServiceId.value = s.id;
  try {
    await store.addLine(props.quoteId, {
      is_non_stocked: false,
      product_name: s.name,
      quantity: 1,
      unit_price: servicePrice(s),
    });
    emit('added', s.name);
    emit('close');
  } finally {
    addingServiceId.value = null;
  }
}

// Card price — one decimal, matching the Líneas table in the main screen.
function fmtMoney(value: number | string | null | undefined) {
  return `$${Number(value || 0).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) return;
  activeTab.value = 'product';
  productQuery.value = '';
  serviceQuery.value = '';
  searchProducts('');
  searchServices('');
});
</script>

<template>
  <AppModal :open="open" title="Agregar producto o servicio" size="lg" @close="emit('close')">
    <div class="flex gap-2 border-b pb-3" style="border-color: var(--nexora-input-border);">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition"
        :style="activeTab === 'product'
          ? { background: 'var(--nexora-primary-color)', color: '#fff' }
          : { background: 'var(--nexora-input-bg)', color: 'var(--nexora-input-text)' }"
        @click="activeTab = 'product'"
      >
        <Package :size="14" /> Producto
      </button>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition"
        :style="activeTab === 'service'
          ? { background: 'var(--nexora-primary-color)', color: '#fff' }
          : { background: 'var(--nexora-input-bg)', color: 'var(--nexora-input-text)' }"
        @click="activeTab = 'service'"
      >
        <Wrench :size="14" /> Servicio
      </button>
    </div>

    <!-- Fixed-size content area for both tabs — height stays constant
         regardless of how many search results come back (was resizing the
         whole modal as you typed, which felt jumpy). -->
    <div class="mt-4 flex h-[50vh] max-h-[520px] min-h-[360px] flex-col">
      <!-- Producto -->
      <div v-if="activeTab === 'product'" class="flex h-full flex-col">
        <div class="relative mb-3 shrink-0">
          <Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 nxr-text-soft" />
          <input
            v-model="productQuery"
            type="text"
            placeholder="Buscar producto por nombre o código..."
            class="w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none"
            style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);"
            autofocus
            @input="onProductQueryInput"
          />
        </div>
        <div class="grid flex-1 grid-cols-1 content-start gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          <button
            v-for="p in productResults" :key="p.id"
            type="button"
            class="rounded-xl border p-3 text-left transition hover:border-[var(--nexora-primary-color)] disabled:opacity-50"
            style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border);"
            :disabled="addingProductId === p.id"
            @click="pickProduct(p)"
          >
            <p class="text-sm font-semibold" style="color: var(--nexora-input-text);">{{ p.name }}</p>
            <p v-if="p.sku" class="text-xs nxr-text-soft">{{ p.sku }}</p>
            <p class="mt-1 text-sm font-bold text-[var(--nexora-primary-color)]">{{ fmtMoney(p.reference_price) }}</p>
          </button>

          <p v-if="searchingProducts" class="col-span-full py-6 text-center text-sm nxr-text-muted">Buscando...</p>
          <p v-else-if="!searchingProducts && productResults.length === 0" class="col-span-full py-6 text-center text-sm nxr-text-soft">Sin resultados</p>
        </div>
      </div>

      <!-- Servicio -->
      <div v-else class="flex h-full flex-col">
        <div class="relative mb-3 shrink-0">
          <Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 nxr-text-soft" />
          <input
            v-model="serviceQuery"
            type="text"
            placeholder="Buscar servicio configurado..."
            class="w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none"
            style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border); color: var(--nexora-input-text);"
            @input="onServiceQueryInput"
          />
        </div>
        <div class="grid flex-1 grid-cols-1 content-start gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          <button
            v-for="s in serviceResults" :key="s.id"
            type="button"
            class="rounded-xl border p-3 text-left transition hover:border-[var(--nexora-primary-color)] disabled:opacity-50"
            style="background-color: var(--nexora-input-bg); border-color: var(--nexora-input-border);"
            :disabled="addingServiceId === s.id"
            @click="pickService(s)"
          >
            <p class="text-sm font-semibold" style="color: var(--nexora-input-text);">{{ s.name }}</p>
            <p class="text-xs nxr-text-soft">{{ s.estimated_hours }}h{{ s.suggested_role ? ` · ${s.suggested_role}` : '' }}</p>
            <p class="mt-1 text-sm font-bold text-[var(--nexora-primary-color)]">{{ fmtMoney(servicePrice(s)) }}</p>
          </button>

          <p v-if="searchingServices" class="col-span-full py-6 text-center text-sm nxr-text-muted">Buscando...</p>
          <p v-else-if="!searchingServices && serviceResults.length === 0" class="col-span-full py-6 text-center text-sm nxr-text-soft">
            Sin servicios configurados. Crealos en Garage → Servicios configurables.
          </p>
        </div>
      </div>
    </div>
  </AppModal>
</template>
