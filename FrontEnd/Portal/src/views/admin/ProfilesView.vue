<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Component } from 'vue';
import {
  Shield, Plus, Search, Loader2, Pencil, Trash2, X, Save,
  ShieldAlert, CheckSquare, Square, ChevronDown, ChevronRight,
  LayoutDashboard, Building2, Users, BarChart2, Mail,
  CreditCard, Settings, Palette, FileText, ClipboardList, Puzzle
} from 'lucide-vue-next';
import api from '../../utils/axios';
import { useVisualConfigStore } from '../../stores/visualConfig';
import { usePermissions } from '../../composables/usePermissions';
import CompanySelector from '../../components/admin/CompanySelector.vue';
import type { Profile, ModuleGroup, TransactionPermission } from '../../types/auth';

const cfg      = useVisualConfigStore();
const perms    = usePermissions();

// ── Company selector (super_admin only) ───────────────────────
const selectedCompanyId = ref<number | null>(null);

const profilesUrl     = computed(() =>
  perms.isSuperAdmin.value && selectedCompanyId.value
    ? `/companies/${selectedCompanyId.value}/profiles`
    : '/profiles'
);
const permFullBaseUrl = computed(() =>
  perms.isSuperAdmin.value && selectedCompanyId.value
    ? `/companies/${selectedCompanyId.value}/profiles`
    : '/profiles'
);

const isLight     = computed(() => cfg.mode === 'light');
const headerColor = computed(() => isLight.value ? '#0f172a' : '#ffffff');
const mutedColor  = computed(() => isLight.value ? '#475569' : '#94a3b8');
const cardBg      = computed(() => isLight.value ? 'rgba(255,255,255,0.95)' : 'rgba(9,18,36,0.85)');
const cardBorder  = computed(() => isLight.value ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)');
const rowHoverBg  = computed(() => isLight.value ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)');
const inputBg     = computed(() => isLight.value ? '#ffffff' : 'rgba(255,255,255,0.05)');
const inputBorder = computed(() => isLight.value ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)');
const panelBg     = computed(() => isLight.value ? 'rgba(248,250,252,0.98)' : 'rgba(8,16,31,0.6)');
const modalBg     = computed(() => isLight.value ? '#ffffff' : '#0d1829');

// ── Icon registry ─────────────────────────────────────────────
const ICON_REGISTRY: Record<string, Component> = {
  LayoutDashboard, Building2, Users, Shield, Puzzle, Mail, BarChart2,
  CreditCard, Settings, Palette, FileText, ClipboardList
};
const resolveIcon = (code?: string): Component =>
  (code && ICON_REGISTRY[code]) ? ICON_REGISTRY[code] : Settings;

// ── State ─────────────────────────────────────────────────────
const profiles        = ref<Profile[]>([]);
const isLoading       = ref(true);
const search          = ref('');
const selectedProfile = ref<Profile | null>(null);
const moduleGroups    = ref<ModuleGroup[]>([]);
const expanded        = ref<Record<string, boolean>>({});
const isLoadingPerms  = ref(false);
const isSavingPerms   = ref(false);
const saveSuccess     = ref(false);
const saveErrorMsg    = ref('');

const showProfileModal = ref(false);
const isEditing        = ref(false);
const isSaving         = ref(false);
const saveError        = ref('');
const form = ref({ id: 0, code: '', name: '', description: '', scope: 'empresa' as Profile['scope'] });

const ACTIONS = ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_approve', 'can_export', 'can_admin'] as const;
const ACTION_LABELS: Record<string, string> = {
  can_view: 'Ver', can_create: 'Crear', can_edit: 'Editar',
  can_delete: 'Elim.', can_approve: 'Apr.', can_export: 'Exp.', can_admin: 'Admin'
};

// ── Computed ──────────────────────────────────────────────────
const filteredProfiles = computed(() => {
  const q = search.value.toLowerCase();
  if (!q) return profiles.value;
  return profiles.value.filter(p =>
    p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
  );
});

const kpis = computed(() => ({
  total:  profiles.value.length,
  active: profiles.value.filter(p => p.is_active).length,
  system: profiles.value.filter(p => p.is_system_profile).length,
  custom: profiles.value.filter(p => !p.is_system_profile).length,
}));

function enabledCount(mod: ModuleGroup): number {
  return mod.transactions.filter(t =>
    ACTIONS.some(a => (t as unknown as Record<string, boolean>)[a])
  ).length;
}

// ── Load ──────────────────────────────────────────────────────
async function loadProfiles() {
  isLoading.value = true;
  selectedProfile.value = null;
  moduleGroups.value = [];
  try {
    const res = await api.get(profilesUrl.value);
    profiles.value = res.data;
  } catch { /* silent */ } finally {
    isLoading.value = false;
  }
}

watch(selectedCompanyId, () => loadProfiles());

async function selectProfile(p: Profile) {
  selectedProfile.value = p;
  moduleGroups.value = [];
  expanded.value = {};
  isLoadingPerms.value = true;
  saveSuccess.value = false;
  saveErrorMsg.value = '';
  try {
    const res = await api.get(`${permFullBaseUrl.value}/${p.id}/permissions-full`);
    moduleGroups.value = (res.data as ModuleGroup[]).map(mod => ({
      ...mod,
      transactions: mod.transactions.map(t => ({
        ...t,
        can_view: t.can_view ?? false,
        can_create: t.can_create ?? false,
        can_edit: t.can_edit ?? false,
        can_delete: t.can_delete ?? false,
        can_approve: t.can_approve ?? false,
        can_export: t.can_export ?? false,
        can_admin: t.can_admin ?? false,
      }))
    }));
    for (const mod of moduleGroups.value) {
      expanded.value[mod.module_code] = false;
    }
  } catch { /* silent */ } finally {
    isLoadingPerms.value = false;
  }
}

async function savePermissions() {
  if (!selectedProfile.value) return;
  isSavingPerms.value = true;
  saveSuccess.value = false;
  saveErrorMsg.value = '';
  try {
    interface TxPerm {
      transaction_code: string;
      can_view: boolean; can_create: boolean; can_edit: boolean;
      can_delete: boolean; can_approve: boolean; can_export: boolean; can_admin: boolean;
    }
    const allPerms: TxPerm[] = [];
    for (const mod of moduleGroups.value) {
      for (const tx of mod.transactions) {
        allPerms.push({
          transaction_code: tx.transaction_code,
          can_view:    tx.can_view,
          can_create:  tx.can_create,
          can_edit:    tx.can_edit,
          can_delete:  tx.can_delete,
          can_approve: tx.can_approve,
          can_export:  tx.can_export,
          can_admin:   tx.can_admin,
        });
      }
    }
    await api.put(`${permFullBaseUrl.value}/${selectedProfile.value.id}/permissions-full`, { permissions: allPerms });
    saveSuccess.value = true;
    setTimeout(() => { saveSuccess.value = false; }, 3000);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    saveErrorMsg.value = err?.response?.data?.error ?? 'Error al guardar permisos';
    setTimeout(() => { saveErrorMsg.value = ''; }, 4000);
  } finally {
    isSavingPerms.value = false;
  }
}

// ── Toggle helpers ────────────────────────────────────────────
function toggleExpanded(code: string) {
  expanded.value[code] = !expanded.value[code];
}

function toggleTxAction(tx: TransactionPermission, action: string) {
  if (!perms.canManageProfiles.value) return;
  const t = tx as unknown as Record<string, boolean>;
  t[action] = !t[action];
}

function toggleTxAll(tx: TransactionPermission, val: boolean) {
  const t = tx as unknown as Record<string, boolean>;
  ACTIONS.forEach(a => { t[a] = val; });
}

function txAllSelected(tx: TransactionPermission): boolean {
  const t = tx as unknown as Record<string, boolean>;
  return ACTIONS.every(a => t[a]);
}

function toggleModuleAll(mod: ModuleGroup, val: boolean) {
  if (!perms.canManageProfiles.value) return;
  mod.transactions.forEach(tx => toggleTxAll(tx, val));
}

function moduleAllSelected(mod: ModuleGroup): boolean {
  return mod.transactions.length > 0 &&
    mod.transactions.every(tx => txAllSelected(tx));
}

// ── Profile CRUD ──────────────────────────────────────────────
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
      await api.put(`${profilesUrl.value}/${form.value.id}`, form.value);
    } else {
      await api.post(profilesUrl.value, form.value);
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
    await api.delete(`${profilesUrl.value}/${p.id}`);
    if (selectedProfile.value?.id === p.id) {
      selectedProfile.value = null;
      moduleGroups.value = [];
    }
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
          <p class="text-xs" :style="{ color: mutedColor }">Define perfiles y su acceso por transacción dentro de cada módulo habilitado</p>
        </div>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <CompanySelector
          v-model="selectedCompanyId"
          placeholder="Mi empresa (hernancius)"
          :show-all="true" />
        <button v-if="perms.canManageProfiles.value" @click="openCreate"
          class="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white nxr-btn-primary">
          <Plus class="h-4 w-4" /> Nuevo perfil
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div v-for="(val, key) in kpis" :key="key" class="rounded-2xl border p-4"
        :style="{ backgroundColor: cardBg, borderColor: cardBorder }">
        <p class="text-xs uppercase tracking-wide" :style="{ color: mutedColor }">
          {{ { total: 'Total', active: 'Activos', system: 'Sistema', custom: 'Empresa' }[key] }}
        </p>
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
            <input v-model="search" placeholder="Buscar perfil..."
              class="w-full rounded-2xl border pl-9 pr-4 py-2 text-sm focus:outline-none"
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
            :class="selectedProfile?.id === p.id ? 'nxr-nav-active' : 'hover:bg-white/5'">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              :style="{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#a78bfa' }">
              <Shield class="h-4 w-4" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate" :style="{ color: headerColor }">{{ p.name }}</p>
              <div class="flex items-center gap-1 mt-0.5">
                <span class="text-xs rounded-full px-1.5 py-0.5 border" :class="scopeColor(p.scope)">
                  {{ scopeLabel(p.scope) }}
                </span>
                <span v-if="p.is_system_profile"
                  class="text-xs rounded-full px-1.5 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Sistema
                </span>
              </div>
            </div>
            <div class="flex gap-1 shrink-0" @click.stop>
              <button v-if="perms.canManageProfiles.value" @click="openEdit(p)"
                class="rounded-lg p-1 hover:bg-white/10 transition">
                <Pencil class="h-3.5 w-3.5" :style="{ color: mutedColor }" />
              </button>
              <button v-if="perms.canManageProfiles.value && !p.is_system_profile" @click="deleteProfile(p)"
                class="rounded-lg p-1 hover:bg-red-500/10 transition">
                <Trash2 class="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>
          </button>
        </div>
      </div>

      <!-- Panel de permisos por transacción -->
      <div class="lg:col-span-2 rounded-2xl border flex flex-col" :style="{ backgroundColor: cardBg, borderColor: cardBorder }">

        <!-- Empty state -->
        <div v-if="!selectedProfile" class="flex flex-col items-center justify-center py-20 gap-3" :style="{ color: mutedColor }">
          <Shield class="h-12 w-12 opacity-30" />
          <p class="text-sm">Selecciona un perfil para gestionar sus permisos</p>
        </div>

        <template v-else>
          <!-- Header del detalle -->
          <div class="flex items-center justify-between border-b px-5 py-4" :style="{ borderColor: cardBorder }">
            <div>
              <h3 class="font-semibold" :style="{ color: headerColor }">{{ selectedProfile.name }}</h3>
              <p class="text-xs mt-0.5" :style="{ color: mutedColor }">
                {{ selectedProfile.description || 'Sin descripción' }} &middot;
                {{ moduleGroups.length }} módulo{{ moduleGroups.length !== 1 ? 's' : '' }} habilitados
              </p>
            </div>
            <button v-if="perms.canManageProfiles.value" @click="savePermissions" :disabled="isSavingPerms"
              class="flex items-center gap-2 rounded-2xl px-3 py-1.5 text-xs font-medium text-white nxr-btn-primary disabled:opacity-60">
              <Loader2 v-if="isSavingPerms" class="h-3 w-3 animate-spin" />
              <Save v-else class="h-3 w-3" />
              Guardar permisos
            </button>
          </div>

          <!-- Feedback -->
          <div v-if="saveSuccess"
            class="mx-5 mt-3 flex items-center gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-xs text-green-300">
            Permisos guardados correctamente.
          </div>
          <div v-if="saveErrorMsg"
            class="mx-5 mt-3 flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
            {{ saveErrorMsg }}
          </div>

          <!-- Loading perms -->
          <div v-if="isLoadingPerms" class="flex justify-center py-12">
            <Loader2 class="h-6 w-6 animate-spin text-[#D4AF37]" />
          </div>

          <!-- Módulos vacíos -->
          <div v-else-if="moduleGroups.length === 0" class="flex flex-col items-center justify-center py-16 gap-2" :style="{ color: mutedColor }">
            <Puzzle class="h-10 w-10 opacity-25" />
            <p class="text-sm">No hay módulos habilitados para esta empresa.</p>
            <p class="text-xs opacity-60">Activa módulos desde el Gestor de Módulos.</p>
          </div>

          <!-- Acordeones de módulos -->
          <div v-else class="flex-1 overflow-y-auto custom-scrollbar divide-y" :style="{ borderColor: cardBorder }">
            <div v-for="mod in moduleGroups" :key="mod.module_code">

              <!-- Accordion header -->
              <button type="button" @click="toggleExpanded(mod.module_code)"
                class="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-white/5">
                <component :is="expanded[mod.module_code] ? ChevronDown : ChevronRight"
                  class="h-4 w-4 shrink-0" :style="{ color: mutedColor }" />
                <div class="flex h-8 w-8 items-center justify-center rounded-xl shrink-0"
                  :style="{ backgroundColor: 'rgba(212,175,55,0.13)', color: '#D4AF37' }">
                  <component :is="resolveIcon(mod.module_icon)" class="h-4 w-4" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium" :style="{ color: headerColor }">{{ mod.module_name }}</p>
                  <p class="text-xs" :style="{ color: mutedColor }">{{ mod.module_group }}</p>
                </div>
                <!-- Badge: X/Y con acceso -->
                <span class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium border"
                  :style="{
                    backgroundColor: enabledCount(mod) > 0 ? 'rgba(212,175,55,0.12)' : 'rgba(148,163,184,0.08)',
                    borderColor:     enabledCount(mod) > 0 ? 'rgba(212,175,55,0.30)' : 'rgba(148,163,184,0.20)',
                    color:           enabledCount(mod) > 0 ? '#D4AF37' : mutedColor
                  }">
                  {{ enabledCount(mod) }}/{{ mod.transactions.length }}
                </span>
                <!-- Toggle todo el módulo -->
                <button v-if="perms.canManageProfiles.value && mod.transactions.length > 0"
                  @click.stop="toggleModuleAll(mod, !moduleAllSelected(mod))"
                  class="shrink-0 rounded-lg p-1 hover:bg-white/10 transition"
                  :title="moduleAllSelected(mod) ? 'Quitar todos' : 'Seleccionar todos'"
                  :style="{ color: moduleAllSelected(mod) ? '#7c3aed' : mutedColor }">
                  <CheckSquare v-if="moduleAllSelected(mod)" class="h-4 w-4" />
                  <Square v-else class="h-4 w-4 opacity-50" />
                </button>
              </button>

              <!-- Accordion body: tabla de transacciones -->
              <div v-if="expanded[mod.module_code]"
                class="border-t" :style="{ borderColor: cardBorder, backgroundColor: panelBg }">
                <div v-if="mod.transactions.length === 0" class="px-5 py-4 text-xs" :style="{ color: mutedColor }">
                  Este módulo no tiene transacciones configuradas.
                </div>
                <div v-else class="overflow-x-auto">
                  <table class="min-w-full text-xs">
                    <thead class="border-b" :style="{ borderColor: cardBorder }">
                      <tr>
                        <th class="py-2 pl-12 pr-3 text-left font-semibold uppercase tracking-wide" :style="{ color: mutedColor }">
                          Transacción
                        </th>
                        <th v-for="a in ACTIONS" :key="a"
                          class="px-1.5 py-2 text-center font-semibold uppercase tracking-wide w-10"
                          :style="{ color: mutedColor }">
                          {{ ACTION_LABELS[a] }}
                        </th>
                        <th class="px-1.5 py-2 text-center font-semibold uppercase tracking-wide w-10"
                          :style="{ color: mutedColor }">Todo</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y" :style="{ borderColor: cardBorder }">
                      <tr v-for="tx in mod.transactions" :key="tx.transaction_code"
                        class="transition-colors"
                        @mouseover="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = rowHoverBg"
                        @mouseleave="(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'">
                        <td class="py-2.5 pl-12 pr-3">
                          <div class="flex items-center gap-2">
                            <component :is="resolveIcon(tx.transaction_icon)" class="h-3.5 w-3.5 shrink-0 opacity-60" :style="{ color: mutedColor }" />
                            <span class="font-medium" :style="{ color: headerColor }">{{ tx.transaction_name }}</span>
                          </div>
                        </td>
                        <td v-for="a in ACTIONS" :key="a" class="px-1.5 py-2.5 text-center">
                          <button @click="toggleTxAction(tx, a)" :disabled="!perms.canManageProfiles.value"
                            class="inline-flex items-center justify-center h-5 w-5 rounded transition disabled:cursor-default"
                            :style="{ color: (tx as unknown as Record<string,boolean>)[a] ? '#D4AF37' : mutedColor }">
                            <CheckSquare v-if="(tx as unknown as Record<string,boolean>)[a]" class="h-4 w-4" />
                            <Square v-else class="h-4 w-4 opacity-30" />
                          </button>
                        </td>
                        <td class="px-1.5 py-2.5 text-center">
                          <button @click="toggleTxAll(tx, !txAllSelected(tx))" :disabled="!perms.canManageProfiles.value"
                            class="inline-flex items-center justify-center h-5 w-5 rounded transition disabled:cursor-default"
                            :style="{ color: txAllSelected(tx) ? '#7c3aed' : mutedColor }">
                            <CheckSquare v-if="txAllSelected(tx)" class="h-4 w-4" />
                            <Square v-else class="h-4 w-4 opacity-30" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </template>
      </div>

    </div>

    <!-- Modal Perfil -->
    <Teleport to="body">
      <div v-if="showProfileModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="w-full max-w-md rounded-3xl border shadow-2xl" :style="{ backgroundColor: modalBg, borderColor: cardBorder }">
          <div class="flex items-center justify-between border-b p-5" :style="{ borderColor: cardBorder }">
            <h2 class="text-base font-semibold" :style="{ color: headerColor }">
              {{ isEditing ? 'Editar perfil' : 'Nuevo perfil' }}
            </h2>
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
              <input v-model="form.code" :disabled="isEditing" placeholder="ej: rrhh_supervisor"
                class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
                :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Nombre *</label>
              <input v-model="form.name" placeholder="RRHH Supervisor"
                class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none"
                :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Descripción</label>
              <textarea v-model="form.description" rows="2"
                class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none resize-none"
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

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148,163,184,0.22); border-radius: 3px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(148,163,184,0.4); }
.custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(148,163,184,0.22) transparent; }
</style>
