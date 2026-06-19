<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight } from 'lucide-vue-next';
import { useGarageProductsStore } from '../../stores/garageProducts';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import type { Product } from '../../types/garage';

const store    = useGarageProductsStore();
const q        = ref('');
const status   = ref('active');
const page     = ref(1);
const showForm = ref(false);
const editing  = ref<Product | null>(null);
const saving   = ref(false);
const error    = ref('');

const form = ref({ name: '', sku: '', description: '', product_type: 'consumable', unit: 'unidad', reference_price: 0, currency: 'CLP' });

async function load() {
  await store.load({ q: q.value || undefined, status: status.value, page: page.value, limit: 50 });
}

onMounted(load);
watch([q, status], () => { page.value = 1; load(); });

function openCreate() {
  editing.value = null;
  form.value = { name: '', sku: '', description: '', product_type: 'consumable', unit: 'unidad', reference_price: 0, currency: 'CLP' };
  error.value = '';
  showForm.value = true;
}

function openEdit(p: Product) {
  editing.value = p;
  form.value = { name: p.name, sku: p.sku || '', description: p.description || '', product_type: p.product_type, unit: p.unit, reference_price: p.reference_price, currency: p.currency };
  error.value = '';
  showForm.value = true;
}

async function save() {
  if (!form.value.name.trim()) { error.value = 'El nombre es requerido'; return; }
  saving.value = true; error.value = '';
  try {
    if (editing.value) {
      await store.update(editing.value.id, form.value);
    } else {
      await store.create(form.value);
    }
    showForm.value = false;
    load();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al guardar';
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(p: Product) {
  await store.toggleStatus(p.id, p.status === 'active' ? 'inactive' : 'active');
}

const PRODUCT_TYPE_LABEL: Record<string, string> = { consumable: 'Consumible', part: 'Repuesto', tool: 'Herramienta', other: 'Otro' };
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Productos / Repuestos</h1>
      <button class="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition nxr-btn-primary" @click="openCreate">
        <Plus :size="15" /> Nuevo producto
      </button>
    </div>

    <div class="flex items-center gap-3">
      <div class="flex-1 relative">
        <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input v-model="q" type="text" placeholder="Buscar productos..." class="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
      </div>
      <select v-model="status" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
        <option value="all">Todos</option>
      </select>
    </div>

    <div v-if="store.loading" class="flex flex-col gap-2">
      <div v-for="i in 8" :key="i" class="h-14 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <div v-else-if="store.items.length === 0" class="text-center text-white/30 py-16 text-sm">Sin productos registrados.</div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="p in store.items" :key="p.id"
        class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/25 transition-all"
        :style="{ background: 'var(--nexora-glass-bg)' }"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="text-sm font-medium text-white truncate">{{ p.name }}</p>
            <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50 shrink-0">{{ PRODUCT_TYPE_LABEL[p.product_type] || p.product_type }}</span>
          </div>
          <p class="text-xs text-white/40">{{ p.sku ? `SKU: ${p.sku} · ` : '' }}{{ p.unit }} · ${{ p.reference_price.toLocaleString() }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" class="text-white/30 hover:text-white/70" @click="openEdit(p)"><Edit2 :size="14" /></button>
          <button type="button" @click="toggleStatus(p)">
            <ToggleRight v-if="p.status === 'active'" :size="18" class="text-green-400" />
            <ToggleLeft v-else :size="18" class="text-white/30" />
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between mt-2 text-xs text-white/40">
        <span>{{ store.total }} productos</span>
        <div class="flex items-center gap-2">
          <button :disabled="page <= 1" class="px-3 py-1 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20" @click="page--; load()">Anterior</button>
          <span>Página {{ page }}</span>
          <button :disabled="store.items.length < 50" class="px-3 py-1 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20" @click="page++; load()">Siguiente</button>
        </div>
      </div>
    </div>

    <NxrSlidePanel
      :open="showForm"
      :title="editing ? 'Editar producto' : 'Nuevo producto'"
      size="sm"
      @close="showForm = false"
    >
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="block text-xs text-white/50 mb-1">Nombre *</label>
              <input v-model="form.name" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">SKU</label>
              <input v-model="form.sku" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Tipo</label>
              <select v-model="form.product_type" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none">
                <option value="consumable">Consumible</option>
                <option value="part">Repuesto</option>
                <option value="tool">Herramienta</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Unidad</label>
              <input v-model="form.unit" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Precio referencia</label>
              <input v-model.number="form.reference_price" type="number" min="0" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-white/50 mb-1">Descripción</label>
              <textarea v-model="form.description" rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none resize-none"></textarea>
            </div>
          </div>
      <p v-if="error" class="mt-2 text-xs text-red-400">{{ error }}</p>

      <template #footer>
        <button type="button" class="nxr-btn nxr-btn-secondary" @click="showForm = false">Cancelar</button>
        <button type="button" class="nxr-btn nxr-btn-primary" :disabled="saving" @click="save">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
      </template>
    </NxrSlidePanel>
  </div>
</template>
