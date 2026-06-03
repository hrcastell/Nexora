<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-vue-next';
import { useDentalServicesStore } from '../../stores/dentalServices';
import { useDentalTreatmentsStore } from '../../stores/dentalTreatments';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import AppToast from '../../components/AppToast.vue';
import ConfirmActionModal from '../../components/admin/ConfirmActionModal.vue';
import { useToast } from '../../composables/useToast';
import type { DentalService, DentalServiceFormData } from '../../types/dental';

const store            = useDentalServicesStore();
const treatmentsStore  = useDentalTreatmentsStore();
const { toasts, triggerToast, removeToast } = useToast();

const confirmModal = ref<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
  open: false, title: '', message: '', onConfirm: () => {}
});
function askConfirm(title: string, message: string, onConfirm: () => void) {
  confirmModal.value = { open: true, title, message, onConfirm };
}

const showPanel    = ref(false);
const saving       = ref(false);
const saveError    = ref<string | null>(null);
const editing      = ref<DentalService | null>(null);

const selectedTreatmentIds = ref<Set<string | number>>(new Set());

const defaultForm = (): DentalServiceFormData => ({
  name: '',
  description: '',
  price_mode: 'manual',
  supplies_cost: 0,
  labor_cost: 0,
  tax_rate: 0,
  profit_margin: 0,
  manual_price: 0,
  estimated_duration_minutes: undefined,
  is_active: true,
});

const form = ref<DentalServiceFormData>(defaultForm());

function fmt(n: number) {
  return `$${Math.round(n ?? 0).toLocaleString('es-AR')}`;
}

// Computed calculated price preview
const calculatedPreview = computed(() => {
  const base = (form.value.supplies_cost ?? 0) + (form.value.labor_cost ?? 0);
  const withTax = base * (1 + (form.value.tax_rate ?? 0) / 100);
  return withTax * (1 + (form.value.profit_margin ?? 0) / 100);
});

function openCreate() {
  editing.value = null;
  form.value = defaultForm();
  selectedTreatmentIds.value = new Set();
  saveError.value = null;
  showPanel.value = true;
}

function openEdit(s: DentalService) {
  editing.value = s;
  form.value = {
    name: s.name,
    description: s.description ?? '',
    price_mode: s.price_mode,
    supplies_cost: parseFloat(s.supplies_cost as any) || 0,
    labor_cost: parseFloat(s.labor_cost as any) || 0,
    tax_rate: parseFloat(s.tax_rate as any) || 0,
    profit_margin: parseFloat(s.profit_margin as any) || 0,
    manual_price: parseFloat(s.manual_price as any) || 0,
    estimated_duration_minutes: s.estimated_duration_minutes,
    is_active: s.is_active,
  };
  selectedTreatmentIds.value = new Set((s.treatments ?? []).map(t => t.treatment_id));
  saveError.value = null;
  showPanel.value = true;
}

function toggleTreatment(id: number | string) {
  if (selectedTreatmentIds.value.has(id)) {
    selectedTreatmentIds.value.delete(id);
  } else {
    selectedTreatmentIds.value.add(id);
  }
}

async function save() {
  saving.value = true;
  saveError.value = null;
  try {
    let serviceId: number;
    if (editing.value) {
      await store.update(editing.value.id, form.value);
      serviceId = Number(editing.value.id);
    } else {
      const created = await store.create(form.value);
      serviceId = Number(created.id);
    }
    const treatments = Array.from(selectedTreatmentIds.value).map(id => ({ treatment_id: id, quantity: 1 }));
    await store.assignTreatments(serviceId, treatments);
    triggerToast('Éxito', editing.value ? 'Servicio actualizado' : 'Servicio creado', 'success');
    showPanel.value = false;
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al guardar servicio';
  } finally {
    saving.value = false;
  }
}

async function toggleActive(s: DentalService) {
  try {
    await store.update(s.id, { is_active: !s.is_active });
    triggerToast('Éxito', 'Estado actualizado', 'success');
  } catch (e: any) {
    triggerToast('Error', e?.response?.data?.error || 'Error al actualizar estado', 'error');
  }
}

async function remove(s: DentalService) {
  askConfirm(
    'Eliminar servicio',
    `¿Eliminar el servicio "${s.name}"?`,
    async () => {
      try {
        await store.remove(s.id);
        triggerToast('Éxito', 'Servicio eliminado', 'success');
      } catch (e: any) {
        triggerToast('Error', e?.response?.data?.error || 'Error al eliminar. Puede estar en uso.', 'error');
      }
    }
  );
}

onMounted(async () => {
  await Promise.all([store.load(), treatmentsStore.load()]);
});
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-xl font-semibold text-white">Servicios</h1>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
        @click="openCreate"
      >
        <Plus :size="15" /> Nuevo servicio
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex flex-col gap-2">
      <div v-for="i in 6" :key="i" class="h-14 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="text-center text-red-400 py-10 text-sm">{{ store.error }}</div>

    <!-- Empty -->
    <div v-else-if="store.items.length === 0" class="flex flex-col items-center gap-4 py-20 text-center">
      <Tag :size="48" class="text-white/20" />
      <p class="text-white/50 text-sm">No hay servicios configurados.</p>
      <button class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90" @click="openCreate">
        <Plus :size="15" /> Crear primer servicio
      </button>
    </div>

    <!-- List -->
    <div v-else class="flex flex-col gap-2">
      <!-- Desktop header -->
      <div class="hidden md:grid md:grid-cols-[1fr_100px_100px_80px_120px] gap-4 px-4 py-2 text-xs text-white/30 font-semibold uppercase tracking-wide">
        <span>Nombre</span>
        <span class="text-right">Precio</span>
        <span class="text-center">Modo</span>
        <span class="text-center">Estado</span>
        <span class="text-center">Acciones</span>
      </div>

      <div
        v-for="s in store.items"
        :key="s.id"
        class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all"
        :style="{ background: 'var(--nexora-glass-bg)' }"
        :class="{ 'opacity-50': !s.is_active }"
      >
        <!-- Mobile -->
        <div class="flex-1 min-w-0 md:hidden">
          <p class="text-sm font-medium text-white truncate">{{ s.name }}</p>
          <div class="flex items-center gap-2 mt-0.5 text-xs text-white/40">
            <span class="font-semibold text-white/70">{{ fmt(s.final_price) }}</span>
            <span>{{ s.price_mode === 'manual' ? 'Manual' : 'Calculado' }}</span>
          </div>
        </div>

        <!-- Desktop -->
        <div class="hidden md:grid md:grid-cols-[1fr_100px_100px_80px_120px] gap-4 items-center flex-1">
          <div>
            <p class="text-sm text-white truncate">{{ s.name }}</p>
            <p v-if="s.description" class="text-xs text-white/40 truncate">{{ s.description }}</p>
          </div>
          <p class="text-sm font-semibold text-white text-right">{{ fmt(s.final_price) }}</p>
          <p class="text-xs text-white/60 text-center">{{ s.price_mode === 'manual' ? 'Manual' : 'Calculado' }}</p>
          <div class="flex justify-center">
            <button class="text-white/40 hover:text-white/70" @click="toggleActive(s)">
              <ToggleRight v-if="s.is_active" :size="20" class="text-green-400" />
              <ToggleLeft v-else :size="20" />
            </button>
          </div>
          <div class="flex items-center justify-center gap-2">
            <button class="text-white/30 hover:text-white/70 transition-colors" @click="openEdit(s)">
              <Pencil :size="14" />
            </button>
            <button class="text-white/30 hover:text-red-400 transition-colors" @click="remove(s)">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>

        <!-- Mobile actions -->
        <div class="flex items-center gap-2 shrink-0 md:hidden">
          <button class="text-white/30 hover:text-white/70" @click="openEdit(s)"><Pencil :size="14" /></button>
          <button class="text-white/40 hover:text-white/70" @click="toggleActive(s)">
            <ToggleRight v-if="s.is_active" :size="18" class="text-green-400" />
            <ToggleLeft v-else :size="18" />
          </button>
          <button class="text-white/30 hover:text-red-400" @click="remove(s)"><Trash2 :size="14" /></button>
        </div>
      </div>
    </div>

    <!-- Create/Edit panel -->
    <NxrSlidePanel
      :open="showPanel"
      :title="editing ? 'Editar servicio' : 'Nuevo servicio'"
      eyebrow="Dental"
      @close="showPanel = false"
    >
      <form class="flex flex-col gap-5" @submit.prevent="save">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Nombre *</label>
          <input v-model="form.name" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Descripción</label>
          <textarea v-model="form.description" rows="2" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30 resize-none"></textarea>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Duración estimada (min)</label>
          <input v-model.number="form.estimated_duration_minutes" type="number" min="1" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Modo de precio</label>
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 py-2 rounded-xl text-sm font-semibold transition-all border"
              :class="form.price_mode === 'manual'
                ? 'bg-[var(--nexora-primary)] text-white border-transparent'
                : 'text-white/50 border-white/10 hover:border-white/30'"
              @click="form.price_mode = 'manual'"
            >
              Precio manual
            </button>
            <button
              type="button"
              class="flex-1 py-2 rounded-xl text-sm font-semibold transition-all border"
              :class="form.price_mode === 'calculated'
                ? 'bg-[var(--nexora-primary)] text-white border-transparent'
                : 'text-white/50 border-white/10 hover:border-white/30'"
              @click="form.price_mode = 'calculated'"
            >
              Precio calculado
            </button>
          </div>
        </div>

        <!-- Manual price -->
        <div v-if="form.price_mode === 'manual'" class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Precio *</label>
          <input v-model.number="form.manual_price" type="number" min="0" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
        </div>

        <!-- Calculated price breakdown -->
        <template v-else>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-white/50">Costo insumos</label>
              <input v-model.number="form.supplies_cost" type="number" min="0" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-white/50">Costo mano de obra</label>
              <input v-model.number="form.labor_cost" type="number" min="0" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-white/50">IVA (%)</label>
              <input v-model.number="form.tax_rate" type="number" min="0" max="100" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs text-white/50">Margen ganancia (%)</label>
              <input v-model.number="form.profit_margin" type="number" min="0" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
            </div>
          </div>
          <div class="px-4 py-3 rounded-xl border border-white/10 flex items-center justify-between" :style="{ background: 'var(--nexora-glass-bg)' }">
            <span class="text-xs text-white/50">Precio estimado</span>
            <span class="text-sm font-bold text-white">{{ fmt(calculatedPreview) }}</span>
          </div>
        </template>

        <label v-if="editing" class="flex items-center gap-2 cursor-pointer">
          <input v-model="form.is_active" type="checkbox" class="rounded" />
          <span class="text-sm text-white/70">Activo</span>
        </label>

        <!-- Treatments -->
        <div class="flex flex-col gap-2">
          <label class="text-xs text-white/50">Tratamientos incluidos</label>
          <div v-if="treatmentsStore.items.length === 0" class="text-xs text-white/30 py-3 text-center">
            No hay tratamientos disponibles.
          </div>
          <div v-else class="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
            <label
              v-for="t in treatmentsStore.items"
              :key="t.id"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all"
              :class="selectedTreatmentIds.has(t.id)
                ? 'border-[var(--nexora-primary)] bg-[var(--nexora-primary)]/10'
                : 'border-white/10 hover:border-white/20'"
              :style="!selectedTreatmentIds.has(t.id) ? { background: 'var(--nexora-glass-bg)' } : {}"
            >
              <input
                type="checkbox"
                :checked="selectedTreatmentIds.has(t.id)"
                class="rounded shrink-0"
                @change="toggleTreatment(t.id)"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm text-white truncate">{{ t.name }}</p>
                <p v-if="t.category" class="text-xs text-white/40 truncate">{{ t.category }}</p>
              </div>
            </label>
          </div>
        </div>

        <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>
      </form>
      <template #footer>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5" @click="showPanel = false">Cancelar</button>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="save">
          {{ saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear servicio' }}
        </button>
      </template>
    </NxrSlidePanel>

    <!-- Toast container -->
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
      <AppToast v-for="t in toasts" :key="t.id" :toast="t" @close="removeToast" />
    </div>

    <ConfirmActionModal
      :isOpen="confirmModal.open"
      :title="confirmModal.title"
      :message="confirmModal.message"
      variant="danger"
      confirmText="Confirmar"
      cancelText="Cancelar"
      @confirmed="() => { confirmModal.open = false; confirmModal.onConfirm(); }"
      @cancelled="confirmModal.open = false"
    />
  </div>
</template>
