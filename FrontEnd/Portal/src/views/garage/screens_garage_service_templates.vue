<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Plus, Search, Edit2, ChevronRight, ToggleLeft, ToggleRight, Trash2 } from 'lucide-vue-next';
import { useGarageServiceTemplatesStore } from '../../stores/garageServiceTemplates';
import { useGarageProductsStore } from '../../stores/garageProducts';
import { garageServiceTemplatesService } from '../../services/garageServiceTemplatesService';
import type { ServiceTemplate } from '../../types/garage';

const store        = useGarageServiceTemplatesStore();
const productsStore = useGarageProductsStore();
const q        = ref('');
const status   = ref('active');
const page     = ref(1);
const showForm = ref(false);
const editing  = ref<ServiceTemplate | null>(null);
const expanded = ref<number | null>(null);
const saving   = ref(false);
const error    = ref('');

const form = ref({ name: '', description: '', estimated_hours: 0, suggested_role: '', suggested_specialty: '', base_labor_rate: null as number | null, currency: 'CLP' });

async function load() {
  await store.load({ q: q.value || undefined, status: status.value, page: page.value, limit: 50 });
}

onMounted(async () => { await load(); await productsStore.load({ status: 'active', limit: 200 }); });
watch([q, status], () => { page.value = 1; load(); });

function openCreate() {
  editing.value = null;
  form.value = { name: '', description: '', estimated_hours: 0, suggested_role: '', suggested_specialty: '', base_labor_rate: null, currency: 'CLP' };
  error.value = '';
  showForm.value = true;
}

async function openEdit(s: ServiceTemplate) {
  await store.loadOne(s.id);
  editing.value = store.current;
  if (store.current) {
    form.value = { name: store.current.name, description: store.current.description || '', estimated_hours: store.current.estimated_hours, suggested_role: store.current.suggested_role || '', suggested_specialty: store.current.suggested_specialty || '', base_labor_rate: store.current.base_labor_rate, currency: store.current.currency };
  }
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
        <div
          class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
          :style="{ background: 'var(--nexora-glass-bg)' }"
          @click="toggleExpand(s.id)"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ s.name }}</p>
            <p class="text-xs text-white/40">{{ s.estimated_hours }}h est. · {{ s.suggested_role || 'Cualquier mecánico' }}</p>
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
          <p class="text-xs text-white/50 mb-2">Productos incluidos en este servicio:</p>
          <div v-for="p in store.current.products ?? []" :key="p.id" class="flex items-center justify-between text-xs text-white/60 py-1">
            <span>{{ p.quantity }} {{ p.unit || 'u.' }} × {{ p.product_name }}</span>
            <div class="flex items-center gap-2">
              <span>${{ p.reference_unit_price.toLocaleString() }}</span>
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

    <Teleport to="body">
      <div v-if="showForm" class="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" @click.self="showForm = false">
        <div class="w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6" :style="{ background: 'var(--nexora-glass-bg, #0b1326)' }">
          <h3 class="text-sm font-semibold text-white mb-4">{{ editing ? 'Editar servicio' : 'Nuevo servicio' }}</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="block text-xs text-white/50 mb-1">Nombre *</label>
              <input v-model="form.name" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Horas estimadas</label>
              <input v-model.number="form.estimated_hours" type="number" min="0" step="0.5" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Tarifa base (hora)</label>
              <input v-model.number="form.base_labor_rate" type="number" min="0" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Rol sugerido</label>
              <input v-model="form.suggested_role" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1">Especialidad sugerida</label>
              <input v-model="form.suggested_specialty" type="text" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/40" />
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-white/50 mb-1">Descripción</label>
              <textarea v-model="form.description" rows="2" class="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none resize-none"></textarea>
            </div>
          </div>
          <p v-if="error" class="mt-2 text-xs text-red-400">{{ error }}</p>
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" class="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white" @click="showForm = false">Cancelar</button>
            <button type="button" class="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="save">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
