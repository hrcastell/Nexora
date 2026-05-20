<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Plus, Search, Edit2, ChevronRight, ToggleLeft, ToggleRight, Trash2, Calculator } from 'lucide-vue-next';
import api from '../../utils/axios';
import { useGarageServiceTemplatesStore } from '../../stores/garageServiceTemplates';
import { garageServiceTemplatesService } from '../../services/garageServiceTemplatesService';
import type { ServiceTemplate } from '../../types/garage';

const store   = useGarageServiceTemplatesStore();
const q       = ref('');
const status  = ref('active');
const page    = ref(1);
const showForm = ref(false);
const editing  = ref<ServiceTemplate | null>(null);
const expanded = ref<number | null>(null);
const saving   = ref(false);
const error    = ref('');

// ── Catalogs for the form ──────────────────────────────────────
const laborRates  = ref<Array<{ id: number; rate_name: string; hourly_rate: number; currency: string; employee_id: number | null }>>([]);
const employees   = ref<Array<{ id: number; first_name: string; last_name: string | null; role_name: string | null }>>([]);
const products    = ref<Array<{ id: number; name: string; unit: string | null; reference_price: number }>>([]);
const catalogsLoaded = ref(false);

async function loadCatalogs() {
  if (catalogsLoaded.value) return;
  const [ratesRes, empRes, prodRes] = await Promise.all([
    api.get('/garage/labor-rates', { params: { status: 'active', limit: 100 } }),
    api.get('/garage/employees',   { params: { status: 'active', limit: 100 } }),
    api.get('/garage/products',    { params: { status: 'active', limit: 200 } }),
  ]);
  laborRates.value  = ratesRes.data.data  ?? ratesRes.data;
  employees.value   = empRes.data.data    ?? empRes.data;
  products.value    = prodRes.data.data   ?? prodRes.data;
  catalogsLoaded.value = true;
}

// ── Form state ────────────────────────────────────────────────
interface FormProduct { product_id: number | null; product_name: string; quantity: number; unit: string; reference_unit_price: number }

const form = ref({
  name: '', description: '', estimated_hours: 0 as number,
  suggested_role: '', suggested_specialty: '',
  base_labor_rate: null as number | null,
  currency: 'CLP',
  margin_pct: 0 as number,
  tax_pct: 0 as number,
});

const formProducts = ref<FormProduct[]>([]);
const newProd = ref<FormProduct>({ product_id: null, product_name: '', quantity: 1, unit: '', reference_unit_price: 0 });
const addingProduct = ref(false);

// ── Totals calculated live ─────────────────────────────────────
const totalMO = computed(() =>
  (form.value.estimated_hours || 0) * (form.value.base_labor_rate || 0)
);
const totalRepuestos = computed(() =>
  formProducts.value.reduce((s, p) => s + (p.quantity * p.reference_unit_price), 0)
);
const subtotal = computed(() => totalMO.value + totalRepuestos.value);
const totalFinal = computed(() => {
  const withMargin = subtotal.value * (1 + (form.value.margin_pct || 0) / 100);
  return withMargin * (1 + (form.value.tax_pct || 0) / 100);
});

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

// ── CRUD ──────────────────────────────────────────────────────
async function load() {
  await store.load({ q: q.value || undefined, status: status.value, page: page.value, limit: 50 });
}

onMounted(load);
watch([q, status], () => { page.value = 1; load(); });

function openCreate() {
  editing.value = null;
  form.value = { name: '', description: '', estimated_hours: 0, suggested_role: '', suggested_specialty: '', base_labor_rate: null, currency: 'CLP', margin_pct: 0, tax_pct: 0 };
  formProducts.value = [];
  error.value = '';
  showForm.value = true;
  loadCatalogs();
}

async function openEdit(s: ServiceTemplate) {
  await store.loadOne(s.id);
  editing.value = store.current;
  if (store.current) {
    const c = store.current as any;
    form.value = {
      name: c.name, description: c.description || '',
      estimated_hours: c.estimated_hours, suggested_role: c.suggested_role || '',
      suggested_specialty: c.suggested_specialty || '', base_labor_rate: c.base_labor_rate,
      currency: c.currency, margin_pct: c.margin_pct ?? 0, tax_pct: c.tax_pct ?? 0,
    };
    formProducts.value = (c.products ?? []).map((p: any) => ({
      product_id: p.product_id, product_name: p.product_name ?? p.name ?? '',
      quantity: Number(p.quantity), unit: p.unit || '', reference_unit_price: Number(p.reference_unit_price),
    }));
  }
  error.value = '';
  showForm.value = true;
  loadCatalogs();
}

function selectLaborRate(rateId: string) {
  const r = laborRates.value.find(r => r.id === parseInt(rateId));
  if (r) form.value.base_labor_rate = Number(r.hourly_rate);
}

function addNewProduct() {
  if (!newProd.value.product_name.trim()) return;
  formProducts.value.push({ ...newProd.value });
  newProd.value = { product_id: null, product_name: '', quantity: 1, unit: '', reference_unit_price: 0 };
  addingProduct.value = false;
}

function selectCatalogProduct(productId: string) {
  const p = products.value.find(x => x.id === parseInt(productId));
  if (p) {
    newProd.value.product_id = p.id;
    newProd.value.product_name = p.name;
    newProd.value.unit = p.unit || '';
    newProd.value.reference_unit_price = p.reference_price ?? 0;
  }
}

function removeFormProduct(idx: number) {
  formProducts.value.splice(idx, 1);
}

async function save() {
  if (!form.value.name.trim()) { error.value = 'El nombre es requerido'; return; }
  saving.value = true; error.value = '';
  try {
    let saved: ServiceTemplate;
    if (editing.value) {
      saved = (await store.update(editing.value.id, form.value)) as ServiceTemplate;
      // Sync products: remove all then re-add
      for (const p of (store.current?.products ?? [])) {
        await garageServiceTemplatesService.removeProduct(editing.value.id, p.id);
      }
      for (const p of formProducts.value) {
        if (p.product_id) {
          await garageServiceTemplatesService.addProduct(editing.value.id, { product_id: p.product_id, quantity: p.quantity, unit: p.unit || undefined, reference_unit_price: p.reference_unit_price });
        }
      }
    } else {
      saved = (await store.create(form.value)) as ServiceTemplate;
      for (const p of formProducts.value) {
        if (p.product_id) {
          await garageServiceTemplatesService.addProduct(saved.id, { product_id: p.product_id, quantity: p.quantity, unit: p.unit || undefined, reference_unit_price: p.reference_unit_price });
        }
      }
    }
    showForm.value = false;
    load();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Error al guardar';
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(s: ServiceTemplate) {
  await store.toggleStatus(s.id, s.status === 'active' ? 'inactive' : 'active');
}

async function toggleExpand(id: number) {
  if (expanded.value === id) { expanded.value = null; return; }
  expanded.value = id;
  await store.loadOne(id);
}

async function removeProduct(templateId: number, productLineId: number) {
  await garageServiceTemplatesService.removeProduct(templateId, productLineId);
  await store.loadOne(templateId);
}
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-white">Servicios Configurables</h1>
      <button class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90" @click="openCreate">
        <Plus :size="15" /> Nuevo servicio
      </button>
    </div>

    <div class="flex items-center gap-3">
      <div class="flex-1 relative">
        <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input v-model="q" type="text" placeholder="Buscar servicios..." class="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
      </div>
      <select v-model="status" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
        <option value="all">Todos</option>
      </select>
    </div>

    <div v-if="store.loading" class="flex flex-col gap-2">
      <div v-for="i in 6" :key="i" class="h-16 rounded-xl bg-white/5 animate-pulse"></div>
    </div>
    <div v-else-if="store.items.length === 0" class="text-center text-white/30 py-16 text-sm">Sin servicios registrados.</div>

    <div v-else class="flex flex-col gap-2">
      <div v-for="s in store.items" :key="s.id" class="rounded-xl border border-white/10 overflow-hidden">
        <div class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors" :style="{ background: 'var(--nexora-glass-bg)' }" @click="toggleExpand(s.id)">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ s.name }}</p>
            <p class="text-xs text-white/40">{{ s.estimated_hours }}h · tarifa: {{ (s as any).base_labor_rate ? fmt((s as any).base_labor_rate) + '/h' : 'no definida' }} · {{ s.suggested_role || 'Cualquier mecánico' }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" class="text-white/30 hover:text-white/70" @click.stop="openEdit(s)"><Edit2 :size="14" /></button>
            <button type="button" @click.stop="toggleStatus(s)">
              <ToggleRight v-if="s.status === 'active'" :size="18" class="text-green-400" />
              <ToggleLeft v-else :size="18" class="text-white/30" />
            </button>
            <ChevronRight :size="14" class="text-white/30 transition-transform" :class="expanded === s.id ? 'rotate-90' : ''" />
          </div>
        </div>

        <div v-if="expanded === s.id && store.current?.id === s.id" class="border-t border-white/10 px-4 py-3 bg-black/10">
          <p class="text-xs text-white/50 mb-2">Productos incluidos:</p>
          <div v-for="p in store.current.products ?? []" :key="p.id" class="flex items-center justify-between text-xs text-white/60 py-1">
            <span>{{ p.quantity }} {{ p.unit || 'u.' }} × {{ p.product_name }}</span>
            <div class="flex items-center gap-2">
              <span>{{ fmt(p.reference_unit_price) }}</span>
              <button type="button" class="text-red-400/50 hover:text-red-400" @click="removeProduct(s.id, p.id)"><Trash2 :size="12" /></button>
            </div>
          </div>
          <p v-if="!store.current.products?.length" class="text-xs text-white/30 italic">Sin productos asociados</p>
        </div>
      </div>

      <div class="flex items-center justify-between mt-2 text-xs text-white/40">
        <span>{{ store.total }} servicios</span>
        <div class="flex items-center gap-2">
          <button :disabled="page <= 1" class="px-3 py-1 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20" @click="page--; load()">Anterior</button>
          <span>Página {{ page }}</span>
          <button :disabled="store.items.length < 50" class="px-3 py-1 rounded-lg bg-white/10 disabled:opacity-30 hover:bg-white/20" @click="page++; load()">Siguiente</button>
        </div>
      </div>
    </div>

    <!-- ── FORM MODAL ──────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showForm" class="fixed inset-0 z-40 bg-black/70 flex items-start justify-center p-4 overflow-y-auto" @click.self="showForm = false">
        <div class="w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl p-6 my-8" :style="{ background: 'var(--nexora-glass-bg, #0b1326)' }">
          <h3 class="text-sm font-semibold text-white mb-5">{{ editing ? 'Editar servicio' : 'Nuevo servicio' }}</h3>

          <!-- Nombre y descripción -->
          <div class="grid grid-cols-2 gap-3 mb-5">
            <div class="col-span-2">
              <label class="block text-xs text-white/50 mb-1">Nombre *</label>
              <input v-model="form.name" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-white/50 mb-1">Descripción</label>
              <textarea v-model="form.description" rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none resize-none"></textarea>
            </div>
          </div>

          <!-- Mano de obra -->
          <div class="rounded-xl border border-white/10 p-4 mb-4">
            <p class="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wide">Mano de obra</p>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-white/50 mb-1">Horas estimadas</label>
                <input v-model.number="form.estimated_hours" type="number" min="0" step="0.5" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
              </div>
              <div>
                <label class="block text-xs text-white/50 mb-1">Tarifa (desde catálogo)</label>
                <select class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none" @change="selectLaborRate(($event.target as HTMLSelectElement).value)">
                  <option value="">— Seleccionar tarifa —</option>
                  <option v-for="r in laborRates" :key="r.id" :value="r.id">{{ r.rate_name }} · {{ fmt(r.hourly_rate) }}/h</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-white/50 mb-1">Tarifa por hora</label>
                <input v-model.number="form.base_labor_rate" type="number" min="0" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" placeholder="0" />
              </div>
              <div class="flex items-end">
                <div class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm">
                  <p class="text-xs text-white/40 mb-0.5">Total mano de obra</p>
                  <p class="text-white font-semibold">{{ fmt(totalMO) }}</p>
                </div>
              </div>
              <div>
                <label class="block text-xs text-white/50 mb-1">Mecánico/Rol sugerido</label>
                <select v-model="form.suggested_role" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none">
                  <option value="">Cualquier mecánico</option>
                  <option v-for="e in employees" :key="e.id" :value="e.first_name + ' ' + (e.last_name || '')">{{ e.first_name }} {{ e.last_name || '' }} {{ e.role_name ? `(${e.role_name})` : '' }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-white/50 mb-1">Especialidad sugerida</label>
                <input v-model="form.suggested_specialty" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
              </div>
            </div>
          </div>

          <!-- Repuestos e insumos -->
          <div class="rounded-xl border border-white/10 p-4 mb-4">
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-semibold text-white/60 uppercase tracking-wide">Repuestos e insumos</p>
              <button v-if="!addingProduct" type="button" class="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70" @click="addingProduct = true">
                <Plus :size="12" /> Agregar
              </button>
            </div>

            <div v-if="formProducts.length === 0 && !addingProduct" class="text-xs text-white/30 italic py-2">Sin repuestos ni insumos asociados.</div>

            <div v-if="formProducts.length > 0" class="flex flex-col gap-1 mb-3">
              <div class="grid grid-cols-12 gap-1 text-xs text-white/30 px-1 mb-1">
                <span class="col-span-5">Producto</span><span class="col-span-2 text-center">Cant.</span><span class="col-span-2 text-center">P. unit.</span><span class="col-span-2 text-right">Subtotal</span><span class="col-span-1"></span>
              </div>
              <div v-for="(p, idx) in formProducts" :key="idx" class="grid grid-cols-12 gap-1 text-xs text-white/70 items-center px-1 py-1 rounded-lg hover:bg-white/5">
                <span class="col-span-5 truncate">{{ p.product_name }}</span>
                <span class="col-span-2 text-center">{{ p.quantity }} {{ p.unit || 'u.' }}</span>
                <span class="col-span-2 text-center">{{ fmt(p.reference_unit_price) }}</span>
                <span class="col-span-2 text-right">{{ fmt(p.quantity * p.reference_unit_price) }}</span>
                <button type="button" class="col-span-1 text-red-400/50 hover:text-red-400 flex justify-end" @click="removeFormProduct(idx)"><Trash2 :size="11" /></button>
              </div>
            </div>

            <div v-if="addingProduct" class="flex flex-col gap-2 mt-2 border-t border-white/10 pt-3">
              <select class="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none" @change="selectCatalogProduct(($event.target as HTMLSelectElement).value)">
                <option value="">— Seleccionar del catálogo —</option>
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} · {{ fmt(p.reference_price ?? 0) }}/{{ p.unit || 'u.' }}</option>
              </select>
              <div class="grid grid-cols-3 gap-2">
                <input v-model="newProd.product_name" type="text" placeholder="Nombre *" class="col-span-3 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none" />
                <input v-model.number="newProd.quantity" type="number" min="0.01" step="0.01" placeholder="Cantidad" class="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none" />
                <input v-model="newProd.unit" type="text" placeholder="Unidad" class="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none" />
                <input v-model.number="newProd.reference_unit_price" type="number" min="0" placeholder="Precio unit." class="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none" />
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-white/30">Subtotal: {{ fmt((newProd.quantity || 0) * (newProd.reference_unit_price || 0)) }}</span>
                <div class="flex gap-2">
                  <button type="button" class="text-xs text-white/50 hover:text-white" @click="addingProduct = false">Cancelar</button>
                  <button type="button" class="text-xs px-3 py-1 rounded-lg bg-[var(--nexora-primary)] text-white hover:opacity-90" @click="addNewProduct">Agregar</button>
                </div>
              </div>
            </div>

            <div v-if="formProducts.length > 0" class="flex justify-end mt-2 text-xs text-white/50">
              Total repuestos: <span class="text-white ml-1 font-medium">{{ fmt(totalRepuestos) }}</span>
            </div>
          </div>

          <!-- Margen, impuesto y total final -->
          <div class="rounded-xl border border-white/10 p-4 mb-5">
            <p class="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wide">Precio final</p>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label class="block text-xs text-white/50 mb-1">Margen de ganancia (%)</label>
                <input v-model.number="form.margin_pct" type="number" min="0" max="100" step="0.5" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
              </div>
              <div>
                <label class="block text-xs text-white/50 mb-1">Impuesto (%)</label>
                <input v-model.number="form.tax_pct" type="number" min="0" max="100" step="0.5" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
              </div>
            </div>
            <div class="rounded-xl bg-white/5 p-3 flex flex-col gap-1 text-xs">
              <div class="flex justify-between text-white/50"><span>MO ({{ form.estimated_hours }}h × {{ fmt(form.base_labor_rate || 0) }})</span><span>{{ fmt(totalMO) }}</span></div>
              <div class="flex justify-between text-white/50"><span>Repuestos e insumos</span><span>{{ fmt(totalRepuestos) }}</span></div>
              <div class="flex justify-between text-white/50 border-t border-white/10 pt-1"><span>Subtotal</span><span>{{ fmt(subtotal) }}</span></div>
              <div v-if="form.margin_pct" class="flex justify-between text-white/50"><span>Margen ({{ form.margin_pct }}%)</span><span>{{ fmt(subtotal * (form.margin_pct / 100)) }}</span></div>
              <div v-if="form.tax_pct" class="flex justify-between text-white/50"><span>Impuesto ({{ form.tax_pct }}%)</span><span>{{ fmt(subtotal * (1 + (form.margin_pct || 0) / 100) * (form.tax_pct / 100)) }}</span></div>
              <div class="flex justify-between text-white font-bold text-sm border-t border-white/10 pt-2 mt-1">
                <span class="flex items-center gap-1"><Calculator :size="13" /> Total estimado del servicio</span>
                <span>{{ fmt(totalFinal) }}</span>
              </div>
            </div>
          </div>

          <p v-if="error" class="mb-3 text-xs text-red-400">{{ error }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white" @click="showForm = false">Cancelar</button>
            <button type="button" class="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="save">{{ saving ? 'Guardando...' : 'Guardar servicio' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
