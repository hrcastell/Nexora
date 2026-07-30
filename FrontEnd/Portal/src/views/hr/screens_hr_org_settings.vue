<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Edit2, Plus, Search, ToggleLeft, ToggleRight } from 'lucide-vue-next';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import { usePermissions } from '../../composables/usePermissions';
import { useHrDepartmentsStore } from '../../stores/hrDepartments';
import { useHrPositionsStore } from '../../stores/hrPositions';
import { useHrCostCentersStore } from '../../stores/hrCostCenters';
import { useHrWorkShiftsStore } from '../../stores/hrWorkShifts';
import type { HrCatalogFormData, HrCatalogItem } from '../../types/hr';

type Tab = 'departments' | 'positions' | 'costCenters' | 'workShifts';
const tabs: Array<{ key: Tab; label: string; singular: string; empty: string }> = [
  { key: 'departments', label: 'Departamentos', singular: 'departamento', empty: 'Sin departamentos registrados.' },
  { key: 'positions', label: 'Posiciones', singular: 'posición', empty: 'Sin posiciones registradas.' },
  { key: 'costCenters', label: 'Centros de costo', singular: 'centro de costo', empty: 'Sin centros de costo registrados.' },
  { key: 'workShifts', label: 'Turnos', singular: 'turno', empty: 'Sin turnos registrados.' },
];
const { canDo, isReadOnly } = usePermissions();
const departments = useHrDepartmentsStore();
const positions = useHrPositionsStore();
const costCenters = useHrCostCentersStore();
const workShifts = useHrWorkShiftsStore();
const activeTab = ref<Tab>('departments');
const q = ref('');
const status = ref<'active' | 'inactive' | 'all'>('active');
const showForm = ref(false);
const editing = ref<HrCatalogItem | null>(null);
const saving = ref(false);
const formError = ref('');
const form = ref<HrCatalogFormData>({ code: '', name: '' });

const store = computed(() => ({ departments, positions, costCenters, workShifts }[activeTab.value]));
const tab = computed(() => tabs.find((item) => item.key === activeTab.value)!);
const canEdit = computed(() => !isReadOnly.value && (canDo('hr_org_settings', 'can_create') || canDo('hr_org_settings', 'can_edit')));

async function load() { await store.value.load({ q: q.value || undefined, status: status.value }); }
onMounted(load);
watch([q, status], load);
watch(activeTab, () => { q.value = ''; status.value = 'active'; load(); });

function openCreate() {
  editing.value = null; form.value = { code: '', name: '' }; formError.value = ''; showForm.value = true;
}
function openEdit(item: HrCatalogItem) {
  editing.value = item; form.value = { code: item.code, name: item.name }; formError.value = ''; showForm.value = true;
}
async function save() {
  if (!form.value.code.trim() || !form.value.name.trim()) { formError.value = 'El código y el nombre son requeridos'; return; }
  saving.value = true; formError.value = '';
  try {
    if (editing.value) await store.value.update(editing.value.id, form.value);
    else await store.value.create(form.value);
    showForm.value = false; await load();
  } catch (cause: any) { formError.value = cause?.response?.data?.error || `Error al guardar ${tab.value.singular}`; }
  finally { saving.value = false; }
}
async function toggleStatus(item: HrCatalogItem) {
  await store.value.toggleStatus(item.id, item.status === 'active' ? 'inactive' : 'active');
}
</script>

<template>
  <div class="flex flex-col gap-5 p-3 sm:p-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 class="text-xl font-semibold text-white">Organización</h1><p class="text-xs text-white/40">Estructura organizacional de la empresa.</p></div>
      <button v-if="canEdit" class="nxr-btn nxr-btn-primary justify-center" @click="openCreate"><Plus :size="15" /> Nuevo {{ tab.singular }}</button>
    </div>

    <div class="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Catálogos de organización">
      <button v-for="item in tabs" :key="item.key" role="tab" :aria-selected="activeTab === item.key" :class="['whitespace-nowrap rounded-xl px-3 py-2 text-sm transition', activeTab === item.key ? 'bg-white/15 text-white' : 'bg-white/5 text-white/50 hover:text-white']" @click="activeTab = item.key">{{ item.label }}</button>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row">
      <div class="relative flex-1"><Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><input v-model="q" class="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-white/30" :placeholder="`Buscar ${tab.label.toLowerCase()}...`" /></div>
      <select v-model="status" class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="all">Todos</option></select>
    </div>

    <div v-if="store.loading" class="space-y-2"><div v-for="index in 6" :key="index" class="h-16 animate-pulse rounded-xl bg-white/5" /></div>
    <p v-else-if="store.error" class="py-8 text-center text-sm text-red-400">{{ store.error }}</p>
    <p v-else-if="store.items.length === 0" class="py-16 text-center text-sm text-white/30">{{ tab.empty }}</p>
    <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <article v-for="item in store.items" :key="item.id" class="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-4" :style="{ background: 'var(--nexora-glass-bg)' }">
        <div class="min-w-0"><p class="truncate text-sm font-semibold text-white">{{ item.name }}</p><p class="mt-1 text-xs text-white/40">Código: {{ item.code }}</p></div>
        <div class="flex shrink-0 items-center gap-2"><span :class="item.status === 'active' ? 'text-green-400' : 'text-white/35'" class="text-xs">{{ item.status === 'active' ? 'Activo' : 'Inactivo' }}</span><button v-if="canEdit" class="text-white/35 hover:text-white" :aria-label="`Editar ${tab.singular}`" @click="openEdit(item)"><Edit2 :size="15" /></button><button v-if="canEdit" :aria-label="item.status === 'active' ? `Desactivar ${tab.singular}` : `Activar ${tab.singular}`" @click="toggleStatus(item)"><ToggleRight v-if="item.status === 'active'" :size="19" class="text-green-400" /><ToggleLeft v-else :size="19" class="text-white/35" /></button></div>
      </article>
    </div>

    <NxrSlidePanel :open="showForm" :title="editing ? `Editar ${tab.singular}` : `Nuevo ${tab.singular}`" size="sm" @close="showForm = false"
    draft-key="views/hr/screens_hr_org_settings.vue#1"
    :draft-entity="`${activeTab}:${editing?.id ?? 'create'}`"
    :draft-state="{ form }">
      <div class="space-y-3"><div><label class="mb-1 block text-xs text-white/50">Código *</label><input v-model="form.code" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" /></div><div><label class="mb-1 block text-xs text-white/50">Nombre *</label><input v-model="form.name" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" /></div><p v-if="formError" class="text-xs text-red-400">{{ formError }}</p></div>
      <template #footer><button class="nxr-btn nxr-btn-primary" :disabled="saving" @click="save">{{ saving ? 'Guardando...' : 'Guardar' }}</button></template>
    </NxrSlidePanel>
  </div>
</template>
