<script setup lang="ts">
import { ref, watch } from 'vue';
import { ChevronDown, Plus, Check } from 'lucide-vue-next';
import { useGarageProductsStore } from '../stores/garageProducts';
import { garageProductsService } from '../services/garageProductsService';
import type { Product } from '../types/garage';

const props = defineProps<{
  modelValue: number | null | undefined;
  unitPriceHint?: number | null;
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: number | null): void;
}>();

const productsStore = useGarageProductsStore();
const query     = ref('');
const results    = ref<Product[]>([]);
const open       = ref(false);
const searching  = ref(false);
const creating   = ref(false);
const error      = ref('');
const selected   = ref<Product | null>(null);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

watch(() => props.modelValue, (id) => {
  if (!id) { selected.value = null; return; }
  if (selected.value?.id === id) return;
  selected.value = productsStore.items.find(p => p.id === id) ?? selected.value;
}, { immediate: true });

async function search(q: string) {
  searching.value = true;
  try {
    const res = await garageProductsService.list({ q, status: 'active', limit: 8 });
    results.value = res.data.data;
  } finally {
    searching.value = false;
  }
}

function onQueryInput() {
  if (searchTimer) clearTimeout(searchTimer);
  if (!query.value.trim()) { results.value = []; return; }
  searchTimer = setTimeout(() => search(query.value), 300);
}

function select(p: Product) {
  selected.value = p;
  query.value    = '';
  results.value  = [];
  open.value     = false;
  error.value    = '';
  emit('update:modelValue', p.id);
}

function clear() {
  selected.value = null;
  emit('update:modelValue', null);
}

async function createNew() {
  const name = query.value.trim();
  if (!name) return;
  creating.value = true;
  error.value    = '';
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
    select(created);
  } catch (e: any) {
    if (e?.response?.status === 409 && e.response.data?.id) {
      try {
        const existing = await garageProductsService.getById(e.response.data.id);
        select(existing.data);
        return;
      } catch { /* falls through to the generic error below */ }
    }
    error.value = e?.response?.data?.error || 'Error al crear producto';
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="relative w-full">
    <button
      type="button"
      class="w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-all"
      :class="[
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-white/40',
        open ? 'border-[var(--nexora-primary)]' : 'border-white/20',
      ]"
      :style="{ background: 'var(--nexora-glass-bg)' }"
      :disabled="disabled"
      @click="open = !open"
    >
      <span :class="selected ? 'nxr-text' : 'nxr-text-muted'">
        {{ selected ? selected.name : (placeholder || 'Buscar producto...') }}
      </span>
      <div class="flex items-center gap-1">
        <span v-if="selected" class="nxr-text-muted hover:text-[var(--nexora-text-color)] text-xs" @click.stop="clear">✕</span>
        <ChevronDown :size="14" class="nxr-text-muted transition-transform" :class="open ? 'rotate-180' : ''" />
      </div>
    </button>

    <div
      v-if="open"
      class="absolute z-30 w-full mt-1 rounded-xl border border-white/20 overflow-hidden shadow-xl"
      :style="{ background: 'var(--nexora-glass-bg-strong, #0b1326)' }"
    >
      <div class="p-2 border-b border-white/10">
        <input
          v-model="query"
          type="text"
          class="w-full bg-transparent text-sm nxr-text placeholder-[var(--nexora-soft-text)] outline-none"
          placeholder="Escribí para buscar..."
          autofocus
          @input="onQueryInput"
        />
      </div>

      <ul class="max-h-52 overflow-y-auto">
        <li
          v-for="p in results"
          :key="p.id"
          class="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/10 text-sm nxr-text transition-colors"
          @click="select(p)"
        >
          <span>{{ p.name }} <span v-if="p.sku" class="ml-1 nxr-text-soft text-xs">· {{ p.sku }}</span></span>
          <Check v-if="p.id === modelValue" :size="14" class="text-[var(--nexora-primary)]" />
        </li>

        <li v-if="searching" class="px-3 py-2 text-sm nxr-text-muted">Buscando...</li>
        <li v-else-if="query.trim() && results.length === 0" class="px-3 py-2 text-sm nxr-text-muted">Sin resultados</li>
        <li v-else-if="!query.trim()" class="px-3 py-2 text-sm nxr-text-muted">Escribí para buscar productos</li>

        <li
          v-if="query.trim() && !searching && !results.some(r => r.name.trim().toLowerCase() === query.trim().toLowerCase())"
          class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/10 text-sm text-[var(--nexora-primary)] transition-colors border-t border-white/10"
          @click="createNew"
        >
          <Plus :size="14" />
          {{ creating ? 'Creando...' : `Crear producto "${query.trim()}"` }}
        </li>
      </ul>

      <div v-if="error" class="px-3 py-1 text-xs text-red-400 border-t border-white/10">{{ error }}</div>
    </div>
  </div>
</template>
