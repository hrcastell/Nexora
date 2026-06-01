<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, ToggleLeft, ToggleRight, Pencil, Sprout, Trash2 } from 'lucide-vue-next';
import { useFinancialCategoriesStore } from '../../stores/financialCategories';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import type { FinancialCategory, FinancialCategoryFormData, CategoryType } from '../../types/financial';

const store = useFinancialCategoriesStore();

const showPanel  = ref(false);
const saving     = ref(false);
const saveError  = ref<string | null>(null);
const seeding    = ref(false);
const editing    = ref<FinancialCategory | null>(null);
const typeFilter = ref<CategoryType | ''>('');

const TYPE_LABEL: Record<CategoryType, string> = {
  income:   'Ingreso',
  expense:  'Gasto',
  saving:   'Ahorro',
  debt:     'Deuda',
  transfer: 'Transferencia',
};

const TYPE_CLASS: Record<CategoryType, string> = {
  income:   'bg-green-500/20 text-green-400',
  expense:  'bg-red-500/20 text-red-400',
  saving:   'bg-blue-500/20 text-blue-400',
  debt:     'bg-orange-500/20 text-orange-400',
  transfer: 'bg-purple-500/20 text-purple-400',
};

const defaultForm = (): FinancialCategoryFormData => ({
  name: '',
  type: 'expense',
  parent_id: null,
  is_fixed: false,
  is_essential: false,
  total_installments: null,
});

const form = ref<FinancialCategoryFormData>(defaultForm());

const filtered = computed(() => {
  if (!typeFilter.value) return store.items;
  return store.items.filter(c => c.type === typeFilter.value);
});

onMounted(() => store.load());

function openCreate() {
  editing.value = null;
  form.value = defaultForm();
  saveError.value = null;
  showPanel.value = true;
}

function openEdit(c: FinancialCategory) {
  editing.value = c;
  form.value = {
    name: c.name,
    type: c.type,
    parent_id: c.parent_id,
    is_fixed: c.is_fixed,
    is_essential: c.is_essential,
    total_installments: c.total_installments ?? null,
  };
  saveError.value = null;
  showPanel.value = true;
}

function onTypeChange() {
  if (form.value.type !== 'debt') {
    form.value.total_installments = null;
  }
}

async function save() {
  saving.value = true;
  saveError.value = null;
  try {
    if (editing.value) {
      await store.update(editing.value.id, form.value);
    } else {
      await store.create(form.value);
    }
    showPanel.value = false;
  } catch (e: any) {
    saveError.value = e?.response?.data?.error || 'Error al guardar categoría';
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(c: FinancialCategory) {
  await store.toggleStatus(c.id, !c.is_active);
}

async function removeCategory(c: FinancialCategory) {
  if (!confirm(`Â¿Eliminar la categorÃ­a "${c.name}"?`)) return;
  try {
    await store.remove(c.id);
  } catch (e: any) {
    alert(e?.response?.data?.error || 'Error al eliminar categorÃ­a');
  }
}

async function seedCategories() {
  if (!confirm('Esto creará categorías predeterminadas. Las existentes no se modificarán. ¿Continuar?')) return;
  seeding.value = true;
  try {
    await store.seed();
  } catch {
    // error is set in store
  } finally {
    seeding.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-xl font-semibold text-white">Categorías</h1>
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-white/10 text-white/60 hover:border-white/30 hover:text-white transition-all disabled:opacity-40"
          :disabled="seeding"
          @click="seedCategories"
        >
          <Sprout :size="13" /> {{ seeding ? 'Creando...' : 'Cargar predeterminadas' }}
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
          @click="openCreate"
        >
          <Plus :size="15" /> Nueva categoría
        </button>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <select v-model="typeFilter" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none">
        <option value="">Todos los tipos</option>
        <option value="income">Ingresos</option>
        <option value="expense">Gastos</option>
        <option value="saving">Ahorros</option>
        <option value="debt">Deudas</option>
        <option value="transfer">Transferencias</option>
      </select>
      <span class="text-xs text-white/30">{{ filtered.length }} categorías</span>
    </div>

    <div v-if="store.loading" class="flex flex-col gap-2">
      <div v-for="i in 8" :key="i" class="h-14 rounded-xl bg-white/5 animate-pulse"></div>
    </div>

    <div v-else-if="store.error" class="text-center text-red-400 py-10 text-sm">{{ store.error }}</div>

    <div v-else-if="filtered.length === 0" class="text-center text-white/30 py-16 text-sm">
      No hay categorías para este filtro.
    </div>

    <div v-else class="flex flex-col gap-2">
      <!-- Desktop table header -->
      <div class="hidden md:grid grid-cols-[1fr_120px_80px_80px_80px] gap-4 px-4 py-2 text-xs text-white/30 font-semibold uppercase tracking-wide">
        <span>Nombre</span>
        <span>Tipo</span>
        <span class="text-center">Fija</span>
        <span class="text-center">Esencial</span>
        <span class="text-center">Acciones</span>
      </div>

      <div
        v-for="c in filtered"
        :key="c.id"
        class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all"
        :style="{ background: 'var(--nexora-glass-bg)' }"
        :class="{ 'opacity-50': !c.is_active }"
      >
        <!-- Mobile layout -->
        <div class="flex-1 min-w-0 md:hidden">
          <div class="flex items-center gap-2 mb-1">
            <p class="text-sm text-white truncate">{{ c.name }}</p>
            <span class="px-2 py-0.5 rounded-full text-xs shrink-0" :class="TYPE_CLASS[c.type]">{{ TYPE_LABEL[c.type] }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-white/30">
            <span v-if="c.is_fixed" class="text-blue-400">Fija</span>
            <span v-if="c.is_essential" class="text-yellow-400">Esencial</span>
          </div>
        </div>

        <!-- Desktop layout -->
        <div class="hidden md:grid md:grid-cols-[1fr_120px_80px_80px_80px] gap-4 items-center flex-1">
          <p class="text-sm text-white truncate">{{ c.name }}</p>
          <span class="px-2 py-0.5 rounded-full text-xs inline-flex items-center w-fit" :class="TYPE_CLASS[c.type]">{{ TYPE_LABEL[c.type] }}</span>
          <p class="text-center text-xs" :class="c.is_fixed ? 'text-blue-400' : 'text-white/20'">{{ c.is_fixed ? 'Si' : '—' }}</p>
          <p class="text-center text-xs" :class="c.is_essential ? 'text-yellow-400' : 'text-white/20'">{{ c.is_essential ? 'Si' : '—' }}</p>
          <div class="flex items-center justify-center gap-2">
            <button class="text-white/30 hover:text-white/70 transition-colors" @click="openEdit(c)">
              <Pencil :size="14" />
            </button>
            <button class="text-white/30 hover:text-white/70 transition-colors" @click="toggleStatus(c)">
              <ToggleRight v-if="c.is_active" :size="18" class="text-green-400" />
              <ToggleLeft v-else :size="18" class="text-white/30" />
            </button>
            <button class="text-white/30 hover:text-red-400 transition-colors" @click="removeCategory(c)">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>

        <!-- Mobile actions -->
        <div class="flex items-center gap-2 shrink-0 md:hidden">
          <button class="text-white/30 hover:text-white/70 transition-colors" @click="openEdit(c)">
            <Pencil :size="14" />
          </button>
          <button class="text-white/30 hover:text-white/70 transition-colors" @click="toggleStatus(c)">
            <ToggleRight v-if="c.is_active" :size="18" class="text-green-400" />
            <ToggleLeft v-else :size="18" />
          </button>
          <button class="text-white/30 hover:text-red-400 transition-colors" @click="removeCategory(c)">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
    </div>

    <NxrSlidePanel
      :open="showPanel"
      :title="editing ? 'Editar categoría' : 'Nueva categoría'"
      eyebrow="Finanzas"
      @close="showPanel = false"
    >
      <form class="flex flex-col gap-5" @submit.prevent="save">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Nombre</label>
          <input v-model="form.name" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" required />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Tipo</label>
          <select v-model="form.type" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none" @change="onTypeChange">
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="saving">Ahorro</option>
            <option value="debt">Deuda</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>
        <div v-if="form.type === 'debt'" class="flex flex-col gap-1.5">
          <label class="text-xs text-white/50">Total de cuotas</label>
          <input
            v-model.number="form.total_installments"
            type="number"
            min="1"
            placeholder="Ej: 24"
            class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30"
          />
          <p class="text-xs text-white/30">Cantidad total de cuotas de esta deuda (opcional)</p>
        </div>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="form.is_fixed" type="checkbox" class="rounded" />
            <span class="text-sm text-white/70">Gasto fijo</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="form.is_essential" type="checkbox" class="rounded" />
            <span class="text-sm text-white/70">Esencial</span>
          </label>
        </div>
        <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>
      </form>
      <template #footer>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5" @click="showPanel = false">Cancelar</button>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="save">
          {{ saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear categoría' }}
        </button>
      </template>
    </NxrSlidePanel>
  </div>
</template>
