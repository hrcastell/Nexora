<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { ChevronDown, Plus, Check } from 'lucide-vue-next';
import { useGarageCatalogsStore } from '../stores/garageCatalogs';
import type { CatalogItem, CatalogType } from '../types/garage';

const props = defineProps<{
  modelValue: number | null;
  type: CatalogType;
  placeholder?: string;
  disabled?: boolean;
  allowCreate?: boolean;
  brandId?: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: number | null): void;
}>();

const catalogsStore = useGarageCatalogsStore();
const query      = ref('');
const open       = ref(false);
const creating   = ref(false);
const error      = ref('');

const items = computed<CatalogItem[]>(() => {
  let list = catalogsStore.catalogs[props.type] ?? [];
  if (props.type === 'vehicle_models' && props.brandId) {
    list = list.filter(i => i.brand_id === props.brandId);
  }
  if (query.value.trim()) {
    const q = query.value.toLowerCase();
    list = list.filter(i => i.normalized_name.includes(q) || i.name.toLowerCase().includes(q));
  }
  return list;
});

const selected = computed<CatalogItem | null>(() => {
  if (!props.modelValue) return null;
  return catalogsStore.catalogs[props.type]?.find(i => i.id === props.modelValue) ?? null;
});

onMounted(() => {
  if (!catalogsStore.catalogs[props.type]?.length) {
    catalogsStore.loadCatalog(props.type, props.brandId ? { brand_id: props.brandId } : undefined);
  }
});

watch(() => props.brandId, (newVal) => {
  if (props.type === 'vehicle_models') {
    catalogsStore.loadCatalog(props.type, newVal ? { brand_id: newVal } : undefined);
    emit('update:modelValue', null);
  }
});

function select(item: CatalogItem) {
  emit('update:modelValue', item.id);
  query.value  = '';
  open.value   = false;
}

function clear() {
  emit('update:modelValue', null);
}

async function createNew() {
  if (!query.value.trim()) return;
  creating.value = true;
  error.value    = '';
  try {
    const created = await catalogsStore.create(
      props.type,
      { name: query.value.trim(), brand_id: props.brandId }
    );
    select(created);
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al crear';
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
        {{ selected ? selected.name : (placeholder || 'Seleccionar...') }}
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
          placeholder="Buscar..."
          autofocus
        />
      </div>

      <ul class="max-h-52 overflow-y-auto">
        <li
          v-for="item in items"
          :key="item.id"
          class="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/10 text-sm nxr-text transition-colors"
          @click="select(item)"
        >
          <span>{{ item.name }}</span>
          <Check v-if="item.id === modelValue" :size="14" class="text-[var(--nexora-primary)]" />
        </li>

        <li v-if="items.length === 0 && !allowCreate" class="px-3 py-2 text-sm nxr-text-muted">
          Sin resultados
        </li>

        <li
          v-if="allowCreate && query.trim() && items.length === 0"
          class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/10 text-sm text-[var(--nexora-primary)] transition-colors"
          @click="createNew"
        >
          <Plus :size="14" />
          {{ creating ? 'Creando...' : `Crear "${query.trim()}"` }}
        </li>
      </ul>

      <div v-if="error" class="px-3 py-1 text-xs text-red-400 border-t border-white/10">{{ error }}</div>
    </div>
  </div>
</template>
