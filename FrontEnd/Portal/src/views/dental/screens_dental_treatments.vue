<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Stethoscope } from 'lucide-vue-next';
import { useDentalTreatmentsStore } from '../../stores/dentalTreatments';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import type { DentalTreatment, DentalTreatmentFormData } from '../../types/dental';

const store = useDentalTreatmentsStore();

const showPanel = ref(false);
const saving    = ref(false);
const saveError = ref<string | null>(null);
const editing   = ref<DentalTreatment | null>(null);

const defaultForm = (): DentalTreatmentFormData => ({
  name: '',
  description: '',
  category: '',
  estimated_duration_minutes: undefined,
  requires_follow_up: false,
  requires_multiple_sessions: false,
  is_active: true,
});

const form = ref<DentalTreatmentFormData>(defaultForm());

function openCreate() {
  editing.value = null;
  form.value = defaultForm();
  saveError.value = null;
  showPanel.value = true;
}

function openEdit(t: DentalTreatment) {
  editing.value = t;
  form.value = {
    name: t.name,
    description: t.description ?? '',
    category: t.category ?? '',
    estimated_duration_minutes: t.estimated_duration_minutes,
    requires_follow_up: t.requires_follow_up,
    requires_multiple_sessions: t.requires_multiple_sessions,
    is_active: t.is_active,
  };
  saveError.value = null;
  showPanel.value = true;
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
    saveError.value = e?.response?.data?.error || 'Error al guardar tratamiento';
  } finally {
    saving.value = false;
  }
}

async function toggleActive(t: DentalTreatment) {
  try {
    await store.update(t.id, { is_active: !t.is_active });
  } catch (e: any) {
    alert(e?.response?.data?.error || 'Error al actualizar estado');
  }
}

async function remove(t: DentalTreatment) {
  if (!confirm(`¿Eliminar el tratamiento "${t.name}"?`)) return;
  try {
    await store.remove(t.id);
  } catch (e: any) {
    alert(e?.response?.data?.error || 'Error al eliminar tratamiento');
  }
}

onMounted(() => store.load());
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-xl font-semibold text-white">Tratamientos</h1>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90"
        @click="openCreate"
      >
        <Plus :size="15" /> Nuevo tratamiento
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
      <Stethoscope :size="48" class="text-white/20" />
      <p class="text-white/50 text-sm">No hay tratamientos configurados.</p>
      <button class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90" @click="openCreate">
        <Plus :size="15" /> Crear primer tratamiento
      </button>
    </div>

    <!-- List -->
    <div v-else class="flex flex-col gap-2">
      <!-- Desktop header -->
      <div class="hidden md:grid md:grid-cols-[1fr_140px_100px_80px_80px_80px] gap-4 px-4 py-2 text-xs text-white/30 font-semibold uppercase tracking-wide">
        <span>Nombre</span>
        <span>Categoría</span>
        <span class="text-center">Duración</span>
        <span class="text-center">Seguimiento</span>
        <span class="text-center">Estado</span>
        <span class="text-center">Acciones</span>
      </div>

      <div
        v-for="t in store.items"
        :key="t.id"
        class="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all"
        :style="{ background: 'var(--nexora-glass-bg)' }"
        :class="{ 'opacity-50': !t.is_active }"
      >
        <!-- Mobile -->
        <div class="flex-1 min-w-0 md:hidden">
          <p class="text-sm font-medium text-white truncate">{{ t.name }}</p>
          <div class="flex items-center gap-2 mt-0.5 text-xs text-white/40">
            <span v-if="t.category">{{ t.category }}</span>
            <span v-if="t.estimated_duration_minutes">{{ t.estimated_duration_minutes }} min</span>
            <span v-if="t.requires_follow_up" class="text-blue-400">Seguimiento</span>
          </div>
        </div>

        <!-- Desktop -->
        <div class="hidden md:grid md:grid-cols-[1fr_140px_100px_80px_80px_80px] gap-4 items-center flex-1">
          <div>
            <p class="text-sm text-white truncate">{{ t.name }}</p>
            <p v-if="t.description" class="text-xs text-white/40 truncate">{{ t.description }}</p>
          </div>
          <p class="text-xs text-white/60">{{ t.category || '—' }}</p>
          <p class="text-xs text-white/60 text-center">{{ t.estimated_duration_minutes ? `${t.estimated_duration_minutes} min` : '—' }}</p>
          <p class="text-center text-xs" :class="t.requires_follow_up ? 'text-blue-400' : 'text-white/20'">{{ t.requires_follow_up ? 'Sí' : '—' }}</p>
          <div class="flex justify-center">
            <button class="text-white/40 hover:text-white/70 transition-colors" @click="toggleActive(t)">
              <ToggleRight v-if="t.is_active" :size="20" class="text-green-400" />
              <ToggleLeft v-else :size="20" />
            </button>
          </div>
          <div class="flex items-center justify-center gap-2">
            <button class="text-white/30 hover:text-white/70 transition-colors" @click="openEdit(t)">
              <Pencil :size="14" />
            </button>
            <button class="text-white/30 hover:text-red-400 transition-colors" @click="remove(t)">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>

        <!-- Mobile actions -->
        <div class="flex items-center gap-2 shrink-0 md:hidden">
          <button class="text-white/30 hover:text-white/70" @click="openEdit(t)"><Pencil :size="14" /></button>
          <button class="text-white/40 hover:text-white/70" @click="toggleActive(t)">
            <ToggleRight v-if="t.is_active" :size="18" class="text-green-400" />
            <ToggleLeft v-else :size="18" />
          </button>
          <button class="text-white/30 hover:text-red-400" @click="remove(t)"><Trash2 :size="14" /></button>
        </div>
      </div>
    </div>

    <!-- Panel -->
    <NxrSlidePanel
      :open="showPanel"
      :title="editing ? 'Editar tratamiento' : 'Nuevo tratamiento'"
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
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Categoría</label>
            <input v-model="form.category" type="text" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" placeholder="Ej: Ortodoncia" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-white/50">Duración estimada (min)</label>
            <input v-model.number="form.estimated_duration_minutes" type="number" min="1" class="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-white/30" />
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="form.requires_follow_up" type="checkbox" class="rounded" />
            <span class="text-sm text-white/70">Requiere seguimiento</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="form.requires_multiple_sessions" type="checkbox" class="rounded" />
            <span class="text-sm text-white/70">Requiere múltiples sesiones</span>
          </label>
          <label v-if="editing" class="flex items-center gap-2 cursor-pointer">
            <input v-model="form.is_active" type="checkbox" class="rounded" />
            <span class="text-sm text-white/70">Activo</span>
          </label>
        </div>
        <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>
      </form>
      <template #footer>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm text-white/60 border border-white/10 hover:bg-white/5" @click="showPanel = false">Cancelar</button>
        <button type="button" class="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--nexora-primary)] text-white hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="save">
          {{ saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear tratamiento' }}
        </button>
      </template>
    </NxrSlidePanel>
  </div>
</template>
