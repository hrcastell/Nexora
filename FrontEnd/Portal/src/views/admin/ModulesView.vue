<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Puzzle, Plus, Search, Loader2, Pencil, Trash2, ToggleLeft, ToggleRight, Save, ShieldAlert } from 'lucide-vue-next';
import api from '../../utils/axios';
import { useVisualConfigStore } from '../../stores/visualConfig';
import { usePermissions } from '../../composables/usePermissions';
import ConfirmActionModal from '../../components/admin/ConfirmActionModal.vue';
import NxrSlidePanel from '../../components/NxrSlidePanel.vue';
import AppToast, { type ToastItem, type ToastType } from '../../components/AppToast.vue';
import type { NexoraModule } from '../../types/auth';

const cfg   = useVisualConfigStore();
const perms = usePermissions();

const isLight       = computed(() => cfg.mode === 'light');
const headerColor   = computed(() => isLight.value ? '#0f172a' : '#ffffff');
const mutedColor    = computed(() => isLight.value ? '#475569' : '#94a3b8');
const cardBg        = computed(() => cfg.cardBg);
const cardBorder    = computed(() => isLight.value ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)');
const rowHoverBg    = computed(() => isLight.value ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)');
const inputBg       = computed(() => isLight.value ? '#ffffff' : 'rgba(255,255,255,0.05)');
const inputBorder   = computed(() => isLight.value ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)');

const modules   = ref<NexoraModule[]>([]);
const isLoading = ref(true);
const search    = ref('');
const filterStatus = ref('');

const showModal  = ref(false);
const isEditing  = ref(false);
const isSaving   = ref(false);
const saveError  = ref('');

// Modals state
const showConfirmDelete = ref(false);
const moduleToDelete = ref<NexoraModule | null>(null);

// Toast state
const activeToast = ref<ToastItem | null>(null);
const triggerToast = (title: string, message: string, type: ToastType) => {
  activeToast.value = { id: Date.now(), title, message, type };
};

const form = ref({
  id: 0, code: '', name: '', description: '', icon: '', group_name: '',
  is_global: true, show_in_menu: true, menu_order: 0, status: 'activo' as NexoraModule['status']
});

const filteredModules = computed(() => {
  let list = modules.value;
  if (filterStatus.value) list = list.filter(m => m.status === filterStatus.value);
  const q = search.value.toLowerCase();
  if (q) list = list.filter(m => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || (m.group_name ?? '').toLowerCase().includes(q));
  return list;
});

const kpis = computed(() => ({
  total:    modules.value.length,
  active:   modules.value.filter(m => m.status === 'activo').length,
  inactive: modules.value.filter(m => m.status === 'inactivo').length,
  draft:    modules.value.filter(m => m.status === 'borrador').length,
}));

async function loadModules() {
  isLoading.value = true;
  try {
    const res = await api.get('/modules');
    modules.value = res.data;
  } catch { /* silent */ } finally {
    isLoading.value = false;
  }
}

onMounted(loadModules);

function openCreate() {
  isEditing.value = false;
  form.value = { id: 0, code: '', name: '', description: '', icon: '', group_name: '', is_global: true, show_in_menu: true, menu_order: 0, status: 'activo' };
  saveError.value = '';
  showModal.value = true;
}

function openEdit(m: NexoraModule) {
  isEditing.value = true;
  form.value = { id: m.id, code: m.code, name: m.name, description: m.description ?? '', icon: m.icon ?? '', group_name: m.group_name ?? '', is_global: m.is_global, show_in_menu: m.show_in_menu, menu_order: m.menu_order, status: m.status };
  saveError.value = '';
  showModal.value = true;
}

async function saveModule() {
  if (!form.value.code || !form.value.name) { saveError.value = 'Código y nombre son requeridos'; return; }
  isSaving.value = true;
  saveError.value = '';
  try {
    if (isEditing.value) {
      await api.put(`/modules/${form.value.id}`, form.value);
    } else {
      await api.post('/modules', form.value);
    }
    showModal.value = false;
    await loadModules();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    saveError.value = err?.response?.data?.error ?? 'Error al guardar módulo';
  } finally {
    isSaving.value = false;
  }
}

async function toggleStatus(m: NexoraModule) {
  const next = m.status === 'activo' ? 'inactivo' : 'activo';
  try {
    await api.patch(`/modules/${m.id}/status`, { status: next });
    m.status = next;
  } catch { /* silent */ }
}

function openDeleteModule(m: NexoraModule) {
  moduleToDelete.value = m;
  showConfirmDelete.value = true;
}

async function handleConfirmDelete() {
  if (!moduleToDelete.value) return;
  const m = moduleToDelete.value;
  try {
    await api.delete(`/modules/${m.id}`);
    triggerToast('Módulo eliminado', `"${m.name}" fue eliminado correctamente.`, 'success');
    showConfirmDelete.value = false;
    moduleToDelete.value = null;
    await loadModules();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    triggerToast('Error', err?.response?.data?.error ?? 'Error al eliminar módulo', 'error');
    showConfirmDelete.value = false;
  }
}

const statusColor = (s: string) => {
  if (s === 'activo')   return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (s === 'inactivo') return 'bg-red-500/15 text-red-300 border-red-500/25';
  return 'bg-amber-500/15 text-amber-300 border-amber-500/25';
};
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('es-CL') : '—';
</script>

<template>
  <div class="space-y-5">

    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
          <Puzzle class="h-5 w-5" />
        </div>
        <div>
          <h1 class="text-lg font-semibold" :style="{ color: headerColor }">Módulos del Sistema</h1>
          <p class="text-xs" :style="{ color: mutedColor }">Configura los módulos funcionales de la plataforma</p>
        </div>
      </div>
      <button
        v-if="perms.canManageModules.value"
        @click="openCreate"
        class="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white nxr-btn-primary"
      >
        <Plus class="h-4 w-4" /> Nuevo módulo
      </button>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div v-for="(val, key) in kpis" :key="key"
        class="rounded-2xl border p-4"
        :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
        <p class="text-xs uppercase tracking-wide" :style="{ color: mutedColor }">{{ { total: 'Total', active: 'Activos', inactive: 'Inactivos', draft: 'Borrador' }[key] }}</p>
        <p class="mt-1 text-2xl font-bold" :style="{ color: headerColor }">{{ val }}</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" :style="{ color: mutedColor }" />
        <input v-model="search" placeholder="Buscar módulo..." class="w-full rounded-2xl border pl-9 pr-4 py-2 text-sm focus:outline-none"
          :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
      </div>
      <select v-model="filterStatus" class="rounded-2xl border px-3 py-2 text-sm focus:outline-none"
        :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
        <option value="">Todos los estados</option>
        <option value="activo">Activo</option>
        <option value="inactivo">Inactivo</option>
        <option value="borrador">Borrador</option>
      </select>
    </div>

    <!-- Table -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Loader2 class="h-7 w-7 animate-spin text-[#D4AF37]" />
    </div>

    <div v-else class="rounded-2xl border overflow-hidden" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
      <div v-if="filteredModules.length === 0" class="p-10 text-center text-sm" :style="{ color: mutedColor }">
        No se encontraron módulos.
      </div>
      <table v-else class="min-w-full">
        <thead class="border-b" :style="{ backgroundColor: rowHoverBg, borderColor: cardBorder }">
          <tr>
            <th class="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Módulo</th>
            <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Grupo</th>
            <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Menú</th>
            <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Estado</th>
            <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Creado</th>
            <th v-if="perms.canManageModules.value" class="py-3 pl-3 pr-5 text-right text-xs font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y" :style="{ borderColor: cardBorder }">
          <tr v-for="mod in filteredModules" :key="mod.id" class="transition-colors group"
            @mouseover="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = rowHoverBg"
            @mouseleave="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'">
            <td class="py-3 pl-5 pr-3">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl text-[#D4AF37]" :style="{ backgroundColor: 'rgba(212,175,55,0.12)' }">
                  <span class="text-xs font-bold">{{ mod.code.slice(0,2).toUpperCase() }}</span>
                </div>
                <div>
                  <p class="text-sm font-medium" :style="{ color: headerColor }">{{ mod.name }}</p>
                  <p class="text-xs font-mono" :style="{ color: mutedColor }">{{ mod.code }}</p>
                </div>
                <span v-if="mod.is_system_module" class="ml-1 text-xs rounded-full px-2 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20">Sistema</span>
              </div>
            </td>
            <td class="px-3 py-3 text-sm" :style="{ color: mutedColor }">{{ mod.group_name || '—' }}</td>
            <td class="px-3 py-3">
              <span class="text-xs rounded-full px-2 py-0.5 border"
                :class="mod.show_in_menu ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'">
                {{ mod.show_in_menu ? 'Visible' : 'Oculto' }}
              </span>
            </td>
            <td class="px-3 py-3">
              <span class="text-xs rounded-full px-2 py-0.5 border" :class="statusColor(mod.status)">{{ mod.status }}</span>
            </td>
            <td class="px-3 py-3 text-sm" :style="{ color: mutedColor }">{{ fmtDate(mod.created_at) }}</td>
            <td v-if="perms.canManageModules.value" class="py-3 pl-3 pr-5 text-right">
              <div class="flex items-center justify-end gap-1">
                <button @click="toggleStatus(mod)" class="rounded-xl p-1.5 transition hover:bg-white/10" :title="mod.status === 'activo' ? 'Desactivar' : 'Activar'">
                  <component :is="mod.status === 'activo' ? ToggleRight : ToggleLeft" class="h-4 w-4 text-[#D4AF37]" />
                </button>
                <button @click="openEdit(mod)" class="rounded-xl p-1.5 transition hover:bg-white/10">
                  <Pencil class="h-4 w-4" :style="{ color: mutedColor }" />
                </button>
                <button v-if="!mod.is_system_module" @click="openDeleteModule(mod)" class="rounded-xl p-1.5 transition hover:bg-red-500/10">
                  <Trash2 class="h-4 w-4 text-red-400" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Crear/Editar -->
    <NxrSlidePanel
      :open="showModal"
      :title="isEditing ? 'Editar módulo' : 'Nuevo módulo'"
      size="md"
      @close="showModal = false"
    >
      <div class="space-y-4">
            <div v-if="saveError" class="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <ShieldAlert class="h-4 w-4 shrink-0" /> {{ saveError }}
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2 sm:col-span-1">
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Código *</label>
                <input v-model="form.code" :disabled="isEditing" placeholder="ej: facturacion" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Nombre *</label>
                <input v-model="form.name" placeholder="Facturación" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>
              <div class="col-span-2">
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Descripción</label>
                <textarea v-model="form.description" rows="2" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none resize-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Ícono (Lucide)</label>
                <input v-model="form.icon" placeholder="ej: CreditCard" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Grupo</label>
                <input v-model="form.group_name" placeholder="ej: Comercial" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Orden menú</label>
                <input v-model.number="form.menu_order" type="number" min="0" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Estado</label>
                <select v-model="form.status" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                  :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="borrador">Borrador</option>
                </select>
              </div>
              <div class="col-span-2 flex gap-6">
                <label class="flex items-center gap-2 text-sm cursor-pointer" :style="{ color: headerColor }">
                  <input type="checkbox" v-model="form.show_in_menu" class="rounded" />
                  Mostrar en menú
                </label>
                <label class="flex items-center gap-2 text-sm cursor-pointer" :style="{ color: headerColor }">
                  <input type="checkbox" v-model="form.is_global" class="rounded" />
                  Módulo global
                </label>
              </div>
            </div>
          </div>

      <template #footer>
        <button @click="showModal = false" class="nxr-btn nxr-btn-secondary">Cancelar</button>
        <button @click="saveModule" :disabled="isSaving" class="nxr-btn nxr-btn-primary">
          <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          {{ isEditing ? 'Guardar cambios' : 'Crear módulo' }}
        </button>
      </template>
    </NxrSlidePanel>

    <!-- Confirm Delete Modal -->
    <ConfirmActionModal
      :isOpen="showConfirmDelete"
      :title="moduleToDelete ? 'Eliminar módulo' : ''"
      :message="moduleToDelete ? 'Eliminar el módulo ' + moduleToDelete.name + '? Esta acción no se puede deshacer.' : ''"
      confirmText="Eliminar"
      variant="danger"
      @confirmed="handleConfirmDelete"
      @cancelled="showConfirmDelete = false; moduleToDelete = null" />

    <!-- Toast -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div v-if="activeToast" class="fixed bottom-6 right-6 z-[9999] w-full max-w-sm pointer-events-none">
          <AppToast :toast="activeToast" @close="activeToast = null" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
