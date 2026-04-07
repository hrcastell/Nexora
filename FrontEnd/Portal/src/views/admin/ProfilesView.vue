<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Shield, Plus, Search, Loader2, Pencil, Trash2, X, Save, ShieldAlert, CheckSquare, Square } from 'lucide-vue-next';
import api from '../../utils/axios';
import { useVisualConfigStore } from '../../stores/visualConfig';
import { usePermissions } from '../../composables/usePermissions';
import type { Profile, ProfilePermission } from '../../types/auth';

const cfg   = useVisualConfigStore();
const perms = usePermissions();

const isLight     = computed(() => cfg.mode === 'light');
const headerColor = computed(() => isLight.value ? '#0f172a' : '#ffffff');
const mutedColor  = computed(() => isLight.value ? '#475569' : '#94a3b8');
const cardBg      = computed(() => isLight.value ? 'rgba(255,255,255,0.95)' : 'rgba(9,18,36,0.85)');
const cardBorder  = computed(() => isLight.value ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)');
const rowHoverBg  = computed(() => isLight.value ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)');
const inputBg     = computed(() => isLight.value ? '#ffffff' : 'rgba(255,255,255,0.05)');
const inputBorder = computed(() => isLight.value ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)');
const modalBg     = computed(() => isLight.value ? '#ffffff' : '#0d1829');

const profiles      = ref<Profile[]>([]);
const isLoading     = ref(true);
const search        = ref('');
const selectedProfile = ref<Profile | null>(null);
const permissions   = ref<ProfilePermission[]>([]);
const isLoadingPerms = ref(false);
const isSavingPerms  = ref(false);

const showProfileModal = ref(false);
const isEditing        = ref(false);
const isSaving         = ref(false);
const saveError        = ref('');

const form = ref({ id: 0, code: '', name: '', description: '', scope: 'empresa' as Profile['scope'] });

const ACTIONS = ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_approve', 'can_export', 'can_admin'] as const;
const ACTION_LABELS: Record<string, string> = {
  can_view: 'Ver', can_create: 'Crear', can_edit: 'Editar',
  can_delete: 'Eliminar', can_approve: 'Aprobar', can_export: 'Exportar', can_admin: 'Administrar'
};

const filteredProfiles = computed(() => {
  const q = search.value.toLowerCase();
  if (!q) return profiles.value;
  return profiles.value.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
});

const kpis = computed(() => ({
  total:   profiles.value.length,
  active:  profiles.value.filter(p => p.is_active).length,
  system:  profiles.value.filter(p => p.is_system_profile).length,
  custom:  profiles.value.filter(p => !p.is_system_profile).length,
}));

async function loadProfiles() {
  isLoading.value = true;
  try {
    const res = await api.get('/profiles');
    profiles.value = res.data;
  } catch { /* silent */ } finally {
    isLoading.value = false;
  }
}

async function selectProfile(p: Profile) {
  selectedProfile.value = p;
  isLoadingPerms.value = true;
  try {
    const res = await api.get(`/profiles/${p.id}/permissions`);
    permissions.value = res.data.map((row: ProfilePermission) => ({
      ...row,
      can_view: row.can_view ?? false,
      can_create: row.can_create ?? false,
      can_edit: row.can_edit ?? false,
      can_delete: row.can_delete ?? false,
      can_approve: row.can_approve ?? false,
      can_export: row.can_export ?? false,
      can_admin: row.can_admin ?? false,
    }));
  } catch { /* silent */ } finally {
    isLoadingPerms.value = false;
  }
}

async function savePermissions() {
  if (!selectedProfile.value) return;
  isSavingPerms.value = true;
  try {
    await api.put(`/profiles/${selectedProfile.value.id}/permissions`, {
      permissions: permissions.value.map(p => ({
        module_id: p.module_id,
        can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit,
        can_delete: p.can_delete, can_approve: p.can_approve, can_export: p.can_export, can_admin: p.can_admin,
      }))
    });
  } catch { /* silent */ } finally {
    isSavingPerms.value = false;
  }
}

function toggleAction(perm: ProfilePermission, action: string) {
  if (!perms.canManageProfiles.value) return;
  const p = perm as unknown as Record<string, boolean>;
  p[action] = !p[action];
}

function toggleAll(perm: ProfilePermission, val: boolean) {
  const p = perm as unknown as Record<string, boolean>;
  ACTIONS.forEach(a => { p[a] = val; });
}

function rowAllSelected(perm: ProfilePermission) {
  const p = perm as unknown as Record<string, boolean>;
  return ACTIONS.every(a => p[a]);
}

onMounted(loadProfiles);

function openCreate() {
  isEditing.value = false;
  form.value = { id: 0, code: '', name: '', description: '', scope: 'empresa' };
  saveError.value = '';
  showProfileModal.value = true;
}

function openEdit(p: Profile) {
  isEditing.value = true;
  form.value = { id: p.id, code: p.code, name: p.name, description: p.description ?? '', scope: p.scope };
  saveError.value = '';
  showProfileModal.value = true;
}

async function saveProfile() {
  if (!form.value.code || !form.value.name) { saveError.value = 'Código y nombre son requeridos'; return; }
  isSaving.value = true;
  saveError.value = '';
  try {
    if (isEditing.value) {
      await api.put(`/profiles/${form.value.id}`, form.value);
    } else {
      await api.post('/profiles', form.value);
    }
    showProfileModal.value = false;
    await loadProfiles();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    saveError.value = err?.response?.data?.error ?? 'Error al guardar perfil';
  } finally {
    isSaving.value = false;
  }
}

async function deleteProfile(p: Profile) {
  if (!confirm(`¿Eliminar el perfil "${p.name}"?`)) return;
  try {
    await api.delete(`/profiles/${p.id}`);
    if (selectedProfile.value?.id === p.id) { selectedProfile.value = null; permissions.value = []; }
    await loadProfiles();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    alert(err?.response?.data?.error ?? 'Error al eliminar perfil');
  }
}

const scopeLabel = (s: string) => ({ global: 'Global', empresa: 'Empresa', modulo: 'Módulo' }[s] ?? s);
const scopeColor = (s: string) => {
  if (s === 'global')  return 'bg-purple-500/15 text-purple-300 border-purple-500/25';
  if (s === 'empresa') return 'bg-blue-500/15 text-blue-300 border-blue-500/25';
  return 'bg-amber-500/15 text-amber-300 border-amber-500/25';
};
</script>

<template>
  <div class="space-y-5">

    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl nxr-nav-icon-active">
          <Shield class="h-5 w-5" />
        </div>
        <div>
          <h1 class="text-lg font-semibold" :style="{ color: headerColor }">Perfiles y Permisos</h1>
          <p class="text-xs" :style="{ color: mutedColor }">Define perfiles funcionales y su matriz de acceso por módulo</p>
        </div>
      </div>
      <button v-if="perms.canManageProfiles.value" @click="openCreate"
        class="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white nxr-btn-primary">
        <Plus class="h-4 w-4" /> Nuevo perfil
      </button>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div v-for="(val, key) in kpis" :key="key" class="rounded-2xl border p-4"
        :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
        <p class="text-xs uppercase tracking-wide" :style="{ color: mutedColor }">{{ { total: 'Total', active: 'Activos', system: 'Sistema', custom: 'Empresa' }[key] }}</p>
        <p class="mt-1 text-2xl font-bold" :style="{ color: headerColor }">{{ val }}</p>
      </div>
    </div>

    <!-- Layout: lista + detalle -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">

      <!-- Lista de perfiles -->
      <div class="rounded-2xl border" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
        <div class="border-b p-4" :style="{ borderColor: cardBorder }">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" :style="{ color: mutedColor }" />
            <input v-model="search" placeholder="Buscar perfil..." class="w-full rounded-2xl border pl-9 pr-4 py-2 text-sm focus:outline-none"
              :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
          </div>
        </div>

        <div v-if="isLoading" class="flex justify-center py-8">
          <Loader2 class="h-6 w-6 animate-spin text-[#D4AF37]" />
        </div>

        <div v-else-if="filteredProfiles.length === 0" class="p-6 text-center text-sm" :style="{ color: mutedColor }">
          No se encontraron perfiles.
        </div>

        <div v-else class="divide-y" :style="{ borderColor: cardBorder }">
          <button v-for="p in filteredProfiles" :key="p.id"
            @click="selectProfile(p)"
            class="w-full flex items-center gap-3 px-4 py-3 text-left transition"
            :class="selectedProfile?.id === p.id ? 'nxr-nav-active' : 'hover:bg-white/5'"
          >
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              :style="{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#a78bfa' }">
              <Shield class="h-4 w-4" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate" :style="{ color: headerColor }">{{ p.name }}</p>
              <div class="flex items-center gap-1 mt-0.5">
                <span class="text-xs rounded-full px-1.5 py-0.5 border" :class="scopeColor(p.scope)">{{ scopeLabel(p.scope) }}</span>
                <span v-if="p.is_system_profile" class="text-xs rounded-full px-1.5 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20">Sistema</span>
              </div>
            </div>
            <div class="flex gap-1 shrink-0" @click.stop>
              <button v-if="perms.canManageProfiles.value" @click="openEdit(p)" class="rounded-lg p-1 hover:bg-white/10 transition">
                <Pencil class="h-3.5 w-3.5" :style="{ color: mutedColor }" />
              </button>
              <button v-if="perms.canManageProfiles.value && !p.is_system_profile" @click="deleteProfile(p)" class="rounded-lg p-1 hover:bg-red-500/10 transition">
                <Trash2 class="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>
          </button>
        </div>
      </div>

      <!-- Matriz de permisos -->
      <div class="lg:col-span-2 rounded-2xl border" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
        <div v-if="!selectedProfile" class="flex flex-col items-center justify-center py-20 gap-3" :style="{ color: mutedColor }">
          <Shield class="h-12 w-12 opacity-30" />
          <p class="text-sm">Selecciona un perfil para ver su matriz de permisos</p>
        </div>

        <template v-else>
          <!-- Header del detalle -->
          <div class="flex items-center justify-between border-b p-4" :style="{ borderColor: cardBorder }">
            <div>
              <h3 class="font-semibold" :style="{ color: headerColor }">{{ selectedProfile.name }}</h3>
              <p class="text-xs mt-0.5" :style="{ color: mutedColor }">{{ selectedProfile.description || 'Sin descripción' }}</p>
            </div>
            <button v-if="perms.canManageProfiles.value" @click="savePermissions" :disabled="isSavingPerms"
              class="flex items-center gap-2 rounded-2xl px-3 py-1.5 text-xs font-medium text-white nxr-btn-primary disabled:opacity-60">
              <Loader2 v-if="isSavingPerms" class="h-3 w-3 animate-spin" />
              <Save v-else class="h-3 w-3" />
              Guardar permisos
            </button>
          </div>

          <div v-if="isLoadingPerms" class="flex justify-center py-10">
            <Loader2 class="h-6 w-6 animate-spin text-[#D4AF37]" />
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full text-xs">
              <thead class="border-b" :style="{ borderColor: cardBorder }">
                <tr>
                  <th class="py-2.5 pl-4 pr-3 text-left font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Módulo</th>
                  <th v-for="a in ACTIONS" :key="a" class="px-2 py-2.5 text-center font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">{{ ACTION_LABELS[a] }}</th>
                  <th class="px-2 py-2.5 text-center font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">Todo</th>
                </tr>
              </thead>
              <tbody class="divide-y" :style="{ borderColor: cardBorder }">
                <tr v-for="perm in permissions" :key="perm.module_id"
                  class="transition-colors"
                  @mouseover="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = rowHoverBg"
                  @mouseleave="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'">
                  <td class="py-2.5 pl-4 pr-3">
                    <div class="flex items-center gap-2">
                      <span class="font-medium" :style="{ color: headerColor }">{{ perm.module_name }}</span>
                      <span class="text-xs font-mono opacity-50" :style="{ color: mutedColor }">{{ perm.module_group }}</span>
                    </div>
                  </td>
                  <td v-for="a in ACTIONS" :key="a" class="px-2 py-2.5 text-center">
                    <button @click="toggleAction(perm, a)" :disabled="!perms.canManageProfiles.value"
                      class="inline-flex items-center justify-center h-6 w-6 rounded-lg transition disabled:cursor-default"
                      :class="(perm as unknown as Record<string,boolean>)[a] ? 'text-[#D4AF37]' : 'opacity-30'"
                      :style="{ color: (perm as unknown as Record<string,boolean>)[a] ? '#D4AF37' : mutedColor }">
                      <CheckSquare v-if="(perm as unknown as Record<string,boolean>)[a]" class="h-4 w-4" />
                      <Square v-else class="h-4 w-4" />
                    </button>
                  </td>
                  <td class="px-2 py-2.5 text-center">
                    <button @click="toggleAll(perm, !rowAllSelected(perm))" :disabled="!perms.canManageProfiles.value"
                      class="inline-flex items-center justify-center h-6 w-6 rounded-lg transition disabled:cursor-default"
                      :style="{ color: rowAllSelected(perm) ? '#7c3aed' : mutedColor }">
                      <CheckSquare v-if="rowAllSelected(perm)" class="h-4 w-4" />
                      <Square v-else class="h-4 w-4 opacity-30" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>

    <!-- Modal Perfil -->
    <Teleport to="body">
      <div v-if="showProfileModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="w-full max-w-md rounded-3xl border shadow-2xl" :style="{ backgroundColor: modalBg, borderColor: cardBorder }">
          <div class="flex items-center justify-between border-b p-5" :style="{ borderColor: cardBorder }">
            <h2 class="text-base font-semibold" :style="{ color: headerColor }">{{ isEditing ? 'Editar perfil' : 'Nuevo perfil' }}</h2>
            <button @click="showProfileModal = false" class="rounded-xl p-1.5 hover:bg-white/10 transition">
              <X class="h-5 w-5" :style="{ color: mutedColor }" />
            </button>
          </div>
          <div class="space-y-4 p-5">
            <div v-if="saveError" class="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <ShieldAlert class="h-4 w-4 shrink-0" /> {{ saveError }}
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Código *</label>
              <input v-model="form.code" :disabled="isEditing" placeholder="ej: rrhh_supervisor" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
                :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Nombre *</label>
              <input v-model="form.name" placeholder="RRHH Supervisor" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Descripción</label>
              <textarea v-model="form.description" rows="2" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none resize-none"
                :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Alcance</label>
              <select v-model="form.scope" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                <option value="empresa">Empresa</option>
                <option value="global">Global</option>
                <option value="modulo">Módulo</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-3 border-t p-5" :style="{ borderColor: cardBorder }">
            <button @click="showProfileModal = false" class="rounded-2xl border px-4 py-2 text-sm hover:bg-white/5 transition"
              :style="{ borderColor: cardBorder, color: mutedColor }">Cancelar</button>
            <button @click="saveProfile" :disabled="isSaving"
              class="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white nxr-btn-primary disabled:opacity-60">
              <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              {{ isEditing ? 'Guardar cambios' : 'Crear perfil' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
