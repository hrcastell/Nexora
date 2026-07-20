<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight } from 'lucide-vue-next';
import { useGarageProductsStore } from '../../stores/garageProducts';
import { useInventorySuppliersStore } from '../../stores/inventorySuppliers';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import Field from '../../components/ui/Field.vue';
import FormSection from '../../components/ui/FormSection.vue';
import Checkbox from '../../components/ui/Checkbox.vue';
import type { Product, ProductFormData } from '../../types/garage';

const store = useGarageProductsStore();
const suppliersStore = useInventorySuppliersStore();
const q = ref('');
const status = ref('active');
const page = ref(1);
const showForm = ref(false);
const editing = ref<Product | null>(null);
const saving = ref(false);
const error = ref('');
const activeTab = ref<'general' | 'inventory' | 'supply'>('general');

const emptyForm = (): ProductFormData => ({
  name: '',
  sku: '',
  description: '',
  product_type: 'consumable',
  unit: 'unidad',
  reference_price: 0,
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

const form = ref<ProductFormData>(emptyForm());

async function load() {
  await store.load({ q: q.value || undefined, status: status.value, page: page.value, limit: 50 });
}

onMounted(async () => {
  await Promise.all([load(), suppliersStore.load({ status: 'active' })]);
});
watch([q, status], () => { page.value = 1; load(); });

function openCreate() {
  editing.value = null;
  form.value = emptyForm();
  activeTab.value = 'general';
  error.value = '';
  showForm.value = true;
}

function openEdit(p: Product) {
  editing.value = p;
  form.value = {
    name: p.name,
    sku: p.sku || '',
    description: p.description || '',
    product_type: p.product_type,
    unit: p.unit,
    reference_price: Number(p.reference_price || 0),
    currency: p.currency,
    inventory_enabled: !!p.inventory_enabled,
    track_serial: !!p.track_serial,
    track_batch: !!p.track_batch,
    allow_negative_stock: !!p.allow_negative_stock,
    reorder_point: Number(p.reorder_point || 0),
    max_stock: p.max_stock === null ? null : Number(p.max_stock),
    preferred_supplier_id: p.preferred_supplier_id,
    purchase_unit: p.purchase_unit || '',
    sale_unit: p.sale_unit || '',
    conversion_factor: Number(p.conversion_factor || 1),
    average_cost: Number(p.average_cost || 0),
    last_purchase_cost: Number(p.last_purchase_cost || 0),
    requires_expiration: !!p.requires_expiration,
    storage_notes: p.storage_notes || '',
  };
  activeTab.value = 'general';
  error.value = '';
  showForm.value = true;
}

function normalizePayload(): ProductFormData {
  const maxStock = form.value.max_stock as number | null | '';
  return {
    ...form.value,
    sku: form.value.sku?.trim() || '',
    description: form.value.description?.trim() || '',
    reference_price: Number(form.value.reference_price || 0),
    reorder_point: Number(form.value.reorder_point || 0),
    max_stock: maxStock === null || maxStock === '' ? null : Number(maxStock),
    preferred_supplier_id: form.value.preferred_supplier_id ? Number(form.value.preferred_supplier_id) : null,
    purchase_unit: form.value.purchase_unit?.trim() || '',
    sale_unit: form.value.sale_unit?.trim() || '',
    conversion_factor: Number(form.value.conversion_factor || 1),
    average_cost: Number(form.value.average_cost || 0),
    last_purchase_cost: Number(form.value.last_purchase_cost || 0),
    storage_notes: form.value.storage_notes?.trim() || '',
  };
}

async function save() {
  if (!form.value.name.trim()) { error.value = 'El nombre es requerido'; return; }
  saving.value = true; error.value = '';
  try {
    const payload = normalizePayload();
    if (editing.value) {
      await store.update(editing.value.id, payload);
    } else {
      await store.create(payload);
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
const tabs = [
  { id: 'general', label: 'General' },
  { id: 'inventory', label: 'Inventario' },
  { id: 'supply', label: 'Abastecimiento' },
] as const;
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-white">Productos / Repuestos</h1>
        <p class="text-xs text-white/40">Maestro compartido por Taller e Inventario.</p>
      </div>
      <button class="flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition nxr-btn-primary" @click="openCreate">
        <Plus :size="15" /> Nuevo producto
      </button>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
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
        class="flex flex-col gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/25 transition-all sm:flex-row sm:items-center"
        :style="{ background: 'var(--nexora-glass-bg)' }"
      >
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm font-medium text-white truncate">{{ p.name }}</p>
            <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50 shrink-0">{{ PRODUCT_TYPE_LABEL[p.product_type] || p.product_type }}</span>
            <span v-if="p.inventory_enabled" class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">Inventario</span>
          </div>
          <p class="text-xs text-white/40">{{ p.sku ? `SKU: ${p.sku} · ` : '' }}{{ p.unit }} · ${{ Number(p.reference_price || 0).toLocaleString() }}</p>
          <p v-if="p.inventory_enabled" class="text-xs text-white/35">Stock mínimo: {{ Number(p.reorder_point || 0).toLocaleString() }} · Costo prom.: ${{ Number(p.average_cost || 0).toLocaleString() }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button type="button" class="text-white/30 hover:text-white/70" aria-label="Editar producto" @click="openEdit(p)"><Edit2 :size="14" /></button>
          <button type="button" :aria-label="p.status === 'active' ? 'Desactivar producto' : 'Activar producto'" @click="toggleStatus(p)">
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
      size="md"
      @close="showForm = false"
    >
      <div class="mb-5 flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="flex-1 rounded-xl px-3 py-2 text-xs font-medium transition"
          :class="activeTab === tab.id ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/80'"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <FormSection v-if="activeTab === 'general'" title="Identidad" description="Datos que identifican el producto en los procesos de Taller e Inventario.">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <Field id="product-name" label="Nombre" required :error="error && !form.name.trim() ? error : undefined">
            <template #default="{ describedBy }"><input id="product-name" v-model="form.name" type="text" required :aria-describedby="describedBy || undefined" :aria-invalid="!!(error && !form.name.trim())" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" /></template>
          </Field>
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
          <label class="block text-xs text-white/50 mb-1">Unidad base</label>
          <input v-model="form.unit" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
        </div>
        <div>
          <label class="block text-xs text-white/50 mb-1">Precio referencia</label>
          <input v-model.number="form.reference_price" type="number" min="0" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs text-white/50 mb-1">Descripción</label>
          <textarea v-model="form.description" rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none resize-none"></textarea>
        </div>
      </div>
      </FormSection>

      <FormSection v-else-if="activeTab === 'inventory'" title="Uso en inventario" description="Activá el control de stock sólo si este ítem se recibe y se mueve entre bodegas.">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="sm:col-span-2"><Checkbox id="inventory-enabled" v-model="form.inventory_enabled" label="Inventario habilitado" help="Permite incluir este producto en compras, recepciones y stock." /></div>
        <template v-if="form.inventory_enabled">
        <Checkbox id="track-serial" v-model="form.track_serial" label="Controla serie" help="Identifica cada unidad de forma individual." />
        <Checkbox id="track-batch" v-model="form.track_batch" label="Controla lote" help="Agrupa unidades por lote de ingreso." />
        <Checkbox id="allow-negative-stock" v-model="form.allow_negative_stock" label="Permite stock negativo" help="Usalo sólo si aceptás registrar salidas antes de la recepción." />
        <Checkbox id="requires-expiration" v-model="form.requires_expiration" label="Requiere vencimiento" help="Pedirá fecha de vencimiento al recibir el producto." />
        <div>
          <label class="block text-xs text-white/50 mb-1">Punto de reposición</label>
          <input v-model.number="form.reorder_point" type="number" min="0" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
        </div>
        <div>
          <label class="block text-xs text-white/50 mb-1">Stock máximo</label>
          <input v-model.number="form.max_stock" type="number" min="0" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
        </div>
        <div>
          <label class="block text-xs text-white/50 mb-1">Costo promedio</label>
          <input v-model.number="form.average_cost" type="number" min="0" step="0.01" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
        </div>
        <div>
          <label class="block text-xs text-white/50 mb-1">Último costo compra</label>
          <input v-model.number="form.last_purchase_cost" type="number" min="0" step="0.01" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
        </div>
        </template>
      </div>
      </FormSection>

      <FormSection v-else title="Abastecimiento y unidades" description="Configuración de compra y almacenamiento. Completala cuando el producto se abastezca desde proveedores.">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="block text-xs text-white/50 mb-1">Proveedor preferido</label>
          <select v-model.number="form.preferred_supplier_id" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none">
            <option :value="null">Sin proveedor preferido</option>
            <option v-for="supplier in suppliersStore.items" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-white/50 mb-1">Unidad compra</label>
          <input v-model="form.purchase_unit" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
        </div>
        <div>
          <label class="block text-xs text-white/50 mb-1">Unidad venta</label>
          <input v-model="form.sale_unit" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
        </div>
        <div>
          <label class="block text-xs text-white/50 mb-1">Factor conversión</label>
          <input v-model.number="form.conversion_factor" type="number" min="0" step="0.0001" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs text-white/50 mb-1">Notas de almacenamiento</label>
          <textarea v-model="form.storage_notes" rows="3" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none resize-none"></textarea>
        </div>
      </div>
      </FormSection>

      <p v-if="error" class="mt-2 text-xs text-red-400">{{ error }}</p>

      <template #footer>
        <button type="button" class="nxr-btn nxr-btn-secondary" @click="showForm = false">Cancelar</button>
        <button type="button" class="nxr-btn nxr-btn-primary" :disabled="saving" @click="save">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
      </template>
    </NxrSlidePanel>
  </div>
</template>
