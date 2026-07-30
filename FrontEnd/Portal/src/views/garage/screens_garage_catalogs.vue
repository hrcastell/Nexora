<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Plus, Edit2, ToggleLeft, ToggleRight } from 'lucide-vue-next';
import { useGarageCatalogsStore } from '../../stores/garageCatalogs';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import type { CatalogItem, CatalogType } from '../../types/garage';

const store   = useGarageCatalogsStore();
const activeType = ref<CatalogType>('vehicle_brands');

const CATALOG_TABS: { type: CatalogType; label: string }[] = [
  { type: 'vehicle_brands',       label: 'Marcas' },
  { type: 'vehicle_models',       label: 'Modelos' },
  { type: 'vehicle_types',        label: 'Tipos' },
  { type: 'vehicle_body_types',   label: 'Carrocerías' },
  { type: 'vehicle_colors',       label: 'Colores' },
  { type: 'vehicle_transmissions',label: 'Transmisiones' },
  { type: 'vehicle_fuel_types',   label: 'Combustibles' },
];

const showForm  = ref(false);
const editing   = ref<CatalogItem | null>(null);
const formName  = ref('');
const formBrandId = ref<number | null>(null);
const formHex   = ref('');
const saving    = ref(false);
const error     = ref('');

const selectedBrandFilter = ref<number | null>(null);

const brands = computed(() => store.catalogs.vehicle_brands.filter(b => b.status === 'active'));

const items = computed<CatalogItem[]>(() => {
  let list = store.catalogs[activeType.value] ?? [];
  if (activeType.value === 'vehicle_models' && selectedBrandFilter.value) {
    list = list.filter(i => i.brand_id === selectedBrandFilter.value);
  }
  return list;
});

async function loadActive() {
  await store.loadCatalog(activeType.value,
    activeType.value === 'vehicle_models' && selectedBrandFilter.value
      ? { brand_id: selectedBrandFilter.value }
      : undefined
  );
}

onMounted(async () => {
  await loadActive();
  await store.loadCatalog('vehicle_brands');
});

async function switchTab(type: CatalogType) {
  activeType.value = type;
  selectedBrandFilter.value = null;
  await store.loadCatalog(type);
}

function openCreate() {
  editing.value = null;
  formName.value = '';
  formBrandId.value = null;
  formHex.value = '';
  error.value = '';
  showForm.value = true;
}

function openEdit(item: CatalogItem) {
  editing.value = item;
  formName.value = item.name;
  formBrandId.value = item.brand_id ?? null;
  formHex.value = item.hex_color ?? '';
  error.value = '';
  showForm.value = true;
}

async function saveForm() {
  if (!formName.value.trim()) { error.value = 'El nombre es requerido'; return; }
  saving.value = true; error.value = '';
  try {
    if (editing.value) {
      await store.update(activeType.value, editing.value.id, {
        name: formName.value.trim(),
        hex_color: formHex.value || undefined,
      });
    } else {
      await store.create(activeType.value, {
        name: formName.value.trim(),
        brand_id: formBrandId.value ?? undefined,
        hex_color: formHex.value || undefined,
      });
    }
    showForm.value = false;
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al guardar';
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(item: CatalogItem) {
  const next = item.status === 'active' ? 'inactive' : 'active';
  await store.toggleStatus(activeType.value, item.id, next);
}
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Catálogos de Vehículos</h1>
      <button class="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition nxr-btn-primary" @click="openCreate">
        <Plus :size="15" /> Nuevo
      </button>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="tab in CATALOG_TABS" :key="tab.type"
        class="px-3 py-1.5 rounded-xl text-sm transition-colors"
        :class="activeType === tab.type ? 'bg-[var(--nexora-primary)] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'"
        @click="switchTab(tab.type)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeType === 'vehicle_models'" class="flex items-center gap-2">
      <label class="text-xs text-white/50">Filtrar por marca:</label>
      <select v-model="selectedBrandFilter" class="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none" @change="loadActive">
        <option :value="null">Todas</option>
        <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>
    </div>

    <div v-if="store.loading[activeType]" class="flex flex-col gap-2">
      <div v-for="i in 6" :key="i" class="h-12 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="item in items" :key="item.id"
        class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 transition-all"
        :style="{ background: 'var(--nexora-glass-bg)' }"
      >
        <div v-if="activeType === 'vehicle_colors' && item.hex_color" class="w-5 h-5 rounded-full shrink-0 border border-white/20" :style="{ background: item.hex_color }"></div>
        <span class="flex-1 text-sm text-white">{{ item.name }}</span>
        <span class="text-xs text-white/30">{{ item.normalized_name }}</span>
        <div class="flex items-center gap-2">
          <button type="button" class="text-white/30 hover:text-white/70" @click="openEdit(item)">
            <Edit2 :size="14" />
          </button>
          <button type="button" @click="toggleStatus(item)">
            <ToggleRight v-if="item.status === 'active'" :size="18" class="text-green-400" />
            <ToggleLeft v-else :size="18" class="text-white/30" />
          </button>
        </div>
      </div>

      <div v-if="items.length === 0" class="text-center text-white/30 py-10 text-sm">Sin entradas. Agrega la primera.</div>
    </div>

    <NxrSlidePanel
      :open="showForm"
      :title="`${editing ? 'Editar' : 'Nuevo'} — ${CATALOG_TABS.find(t => t.type === activeType)?.label}`"
      size="sm"
      @close="showForm = false"
      draft-key="views/garage/screens_garage_catalogs.vue#1"
      :draft-entity="`${activeType}:${editing?.id ?? 'create'}`"
      :draft-state="{ formBrandId, formName, formHex }"
      :draft-setters="{ formBrandId: (value) => formBrandId = value, formName: (value) => formName = value, formHex: (value) => formHex = value }"
    >
      <div class="flex flex-col gap-3">
            <div v-if="activeType === 'vehicle_models' && !editing">
              <label class="block text-xs text-white/50 mb-1">Marca *</label>
              <select v-model="formBrandId" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none">
                <option :value="null">Seleccionar</option>
                <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Nombre *</label>
              <input v-model="formName" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div v-if="activeType === 'vehicle_colors'">
              <label class="block text-xs text-white/50 mb-1">Color (hex)</label>
              <div class="flex items-center gap-2">
                <input v-model="formHex" type="color" class="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent" />
                <input v-model="formHex" type="text" placeholder="#FFFFFF" class="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
              </div>
            </div>
        <p v-if="error" class="text-xs text-red-400">{{ error }}</p>
      </div>

      <template #footer>

        <button type="button" class="nxr-btn nxr-btn-primary" :disabled="saving" @click="saveForm">
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>
      </template>
    </NxrSlidePanel>
  </div>
</template>
