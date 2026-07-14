<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight } from 'lucide-vue-next';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import { useInventoryWarehousesStore } from '../../stores/inventoryWarehouses';
import type { Warehouse, WarehouseFormData, WarehouseType } from '../../types/inventory';

const store = useInventoryWarehousesStore();
const q = ref('');
const status = ref('active');
const showForm = ref(false);
const editing = ref<Warehouse | null>(null);
const saving = ref(false);
const error = ref('');

const emptyForm = (): WarehouseFormData => ({
  code: '', name: '', warehouse_type: 'main', country: 'Chile', region_state: '', city: '',
  commune_district: '', address: '', manager_name: '', phone: '', notes: '',
});
const form = ref<WarehouseFormData>(emptyForm());

const WAREHOUSE_TYPE_LABEL: Record<WarehouseType, string> = {
  main: 'Principal', store: 'Tienda', transit: 'Tránsito', external: 'Externa',
};

async function load() {
  await store.load({ q: q.value || undefined, status: status.value });
}

onMounted(load);
watch([q, status], load);

function openCreate() {
  editing.value = null;
  form.value = emptyForm();
  error.value = '';
  showForm.value = true;
}

function openEdit(item: Warehouse) {
  editing.value = item;
  form.value = {
    code: item.code,
    name: item.name,
    warehouse_type: item.warehouse_type,
    country: item.country || 'Chile',
    region_state: item.region_state || '',
    city: item.city || '',
    commune_district: item.commune_district || '',
    address: item.address || '',
    manager_name: item.manager_name || '',
    phone: item.phone || '',
    notes: item.notes || '',
  };
  error.value = '';
  showForm.value = true;
}

async function save() {
  if (!form.value.code.trim() || !form.value.name.trim()) { error.value = 'Código y nombre son requeridos'; return; }
  saving.value = true;
  error.value = '';
  try {
    const payload = { ...form.value, code: form.value.code.trim().toUpperCase(), name: form.value.name.trim() };
    if (editing.value) await store.update(editing.value.id, payload);
    else await store.create(payload);
    showForm.value = false;
    load();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al guardar bodega';
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(item: Warehouse) {
  await store.toggleStatus(item.id, item.status === 'active' ? 'inactive' : 'active');
}
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-white">Bodegas</h1>
        <p class="text-xs text-white/40">Ubicaciones físicas y lógicas para stock.</p>
      </div>
      <button class="nxr-btn nxr-btn-primary justify-center" @click="openCreate"><Plus :size="15" /> Nueva bodega</button>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row">
      <div class="relative flex-1">
        <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input v-model="q" placeholder="Buscar por código o nombre..." class="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-white/30" />
      </div>
      <select v-model="status" class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none">
        <option value="active">Activas</option><option value="inactive">Inactivas</option><option value="all">Todas</option>
      </select>
    </div>

    <div v-if="store.loading" class="space-y-2"><div v-for="i in 6" :key="i" class="h-16 animate-pulse rounded-xl bg-white/5"></div></div>
    <div v-else-if="store.items.length === 0" class="py-16 text-center text-sm text-white/30">Sin bodegas registradas.</div>
    <div v-else class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <article v-for="item in store.items" :key="item.id" class="rounded-xl border border-white/10 p-4" :style="{ background: 'var(--nexora-glass-bg)' }">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-lg bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/70">{{ item.code }}</span>
              <h2 class="truncate text-sm font-semibold text-white">{{ item.name }}</h2>
            </div>
            <p class="mt-1 text-xs text-white/40">{{ WAREHOUSE_TYPE_LABEL[item.warehouse_type] }} · {{ item.city || item.address || 'Sin ubicación' }}</p>
            <p class="mt-1 text-xs text-white/35">{{ item.manager_name || 'Sin encargado' }}{{ item.phone ? ` · ${item.phone}` : '' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="text-white/30 hover:text-white/70" aria-label="Editar bodega" @click="openEdit(item)"><Edit2 :size="14" /></button>
            <button :aria-label="item.status === 'active' ? 'Desactivar bodega' : 'Activar bodega'" @click="toggleStatus(item)">
              <ToggleRight v-if="item.status === 'active'" :size="18" class="text-green-400" /><ToggleLeft v-else :size="18" class="text-white/30" />
            </button>
          </div>
        </div>
      </article>
    </div>

    <NxrSlidePanel :open="showForm" :title="editing ? 'Editar bodega' : 'Nueva bodega'" size="md" @close="showForm = false">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label class="mb-1 block text-xs text-white/50">Código *</label><input v-model="form.code" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm uppercase text-white outline-none" /></div>
        <div><label class="mb-1 block text-xs text-white/50">Nombre *</label><input v-model="form.name" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" /></div>
        <div><label class="mb-1 block text-xs text-white/50">Tipo</label><select v-model="form.warehouse_type" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"><option value="main">Principal</option><option value="store">Tienda</option><option value="transit">Tránsito</option><option value="external">Externa</option></select></div>
        <div><label class="mb-1 block text-xs text-white/50">Encargado</label><input v-model="form.manager_name" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" /></div>
        <div><label class="mb-1 block text-xs text-white/50">Teléfono</label><input v-model="form.phone" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" /></div>
        <div><label class="mb-1 block text-xs text-white/50">País</label><input v-model="form.country" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" /></div>
        <div><label class="mb-1 block text-xs text-white/50">Región</label><input v-model="form.region_state" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" /></div>
        <div><label class="mb-1 block text-xs text-white/50">Ciudad</label><input v-model="form.city" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" /></div>
        <div><label class="mb-1 block text-xs text-white/50">Comuna</label><input v-model="form.commune_district" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" /></div>
        <div class="sm:col-span-2"><label class="mb-1 block text-xs text-white/50">Dirección</label><input v-model="form.address" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" /></div>
        <div class="sm:col-span-2"><label class="mb-1 block text-xs text-white/50">Notas</label><textarea v-model="form.notes" rows="3" class="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"></textarea></div>
      </div>
      <p v-if="error" class="mt-2 text-xs text-red-400">{{ error }}</p>
      <template #footer><button class="nxr-btn nxr-btn-secondary" @click="showForm = false">Cancelar</button><button class="nxr-btn nxr-btn-primary" :disabled="saving" @click="save">{{ saving ? 'Guardando...' : 'Guardar' }}</button></template>
    </NxrSlidePanel>
  </div>
</template>
