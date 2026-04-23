<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Component } from 'vue';
import api from '../../utils/axios';
import { useVisualConfigStore } from '../../stores/visualConfig';
import { useAuthStore } from '../../stores/auth';
import { usePermissions } from '../../composables/usePermissions';
import CompanySelector from '../../components/admin/CompanySelector.vue';
import {
  Puzzle, Loader2, ChevronDown, ChevronRight, Save, Eye, EyeOff,
  CheckCircle2, AlertCircle, Lock,
  LayoutDashboard, Building2, Users, Shield, Mail, BarChart2,
  CreditCard, Settings, Palette, FileText, ClipboardList
} from 'lucide-vue-next';

const cfg       = useVisualConfigStore();
const authStore = useAuthStore();
const perms     = usePermissions();

// ── Theme-aware palette ────────────────────────────────────────
const isLight     = computed(() => cfg.mode === 'light');
const headerColor = computed(() => isLight.value ? '#0f172a' : '#ffffff');
const mutedColor  = computed(() => isLight.value ? '#475569' : '#94a3b8');
const cardBg      = computed(() => isLight.value ? 'rgba(255,255,255,0.96)' : 'rgba(9,18,36,0.85)');
const cardBorder  = computed(() => isLight.value ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)');
const rowHoverBg  = computed(() => isLight.value ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)');
const inputBg     = computed(() => isLight.value ? '#ffffff' : 'rgba(255,255,255,0.05)');
const inputBorder = computed(() => isLight.value ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)');
const panelBg     = computed(() => isLight.value ? 'rgba(248,250,252,0.98)' : 'rgba(8,16,31,0.6)');

// ── Data types ──────────────────────────────────────────────────
interface CatalogTransaction {
  id: number;
  module_id: number;
  code: string;
  name: string;
  description?: string;
  route: string;
  icon?: string;
  tab_order: number;
  menu_visible: boolean;
  status: string;
}
interface CatalogModule {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  group_name?: string;
  is_core: boolean;
  is_global: boolean;
  is_system: boolean;
  menu_visible_default: boolean;
  menu_order_default: number;
  status: string;
  transactions: CatalogTransaction[];
}
interface CompanyModuleAssignment {
  id?: number;
  code: string;
  is_enabled: boolean;
  is_visible: boolean;
  is_required: boolean;
  menu_order: number;
}

// ── Icon registry for transaction previews ──────────────────────
const ICON_REGISTRY: Record<string, Component> = {
  LayoutDashboard, Building2, Users, Shield, Puzzle, Mail, BarChart2,
  CreditCard, Settings, Palette, FileText, ClipboardList
};
const resolveIcon = (code?: string): Component => {
  if (code && ICON_REGISTRY[code]) return ICON_REGISTRY[code];
  return Settings;
};

// ── Company selector (super_admin) ────────────────────────
const selectedCompanyId = ref<number | null>(null);
const activeCompanyId   = computed(() =>
  (perms.isSuperAdmin.value && selectedCompanyId.value)
    ? selectedCompanyId.value
    : authStore.currentCompany?.id ?? null
);

// ── State ──────────────────────────────────────────────
const modules            = ref<CatalogModule[]>([]);
const expanded           = ref<Record<number, boolean>>({});
const activeTab          = ref<Record<number, number>>({}); // moduleId → transactionId
const isLoading          = ref(true);
const companyModulesMap  = ref<Record<string, CompanyModuleAssignment>>({}); // module code → assignment
const savingCompanyMod   = ref<Record<string, boolean>>({});

// Feedback
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null);
function showFeedback(type: 'success' | 'error', message: string) {
  feedback.value = { type, message };
  setTimeout(() => { feedback.value = null; }, 3500);
}

// ── Load ───────────────────────────────────────────────────────
async function loadCatalog() {
  isLoading.value = true;
  try {
    // 1. Load all modules from catalog
    const modulesRes = await api.get('/catalog/modules');
    const rawModules: CatalogModule[] = modulesRes.data;

    // 2. Load all transactions in one shot
    const txRes = await api.get('/catalog/transactions');
    const allTx: CatalogTransaction[] = txRes.data;

    // 3. Merge
    modules.value = rawModules.map(m => ({
      ...m,
      transactions: allTx
        .filter(t => t.module_id === m.id)
        .sort((a, b) => a.tab_order - b.tab_order)
    }));

    // 4. All modules collapsed by default for cleaner UI
    for (const m of modules.value) {
      expanded.value[m.id] = false;
      if (m.transactions.length > 0) {
        activeTab.value[m.id] = m.transactions[0].id;
      }
    }

    // 5. If super_admin, load company_modules for active company
    if (perms.isSuperAdmin.value && activeCompanyId.value) {
      await loadCompanyModules(activeCompanyId.value);
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    showFeedback('error', e?.response?.data?.error ?? 'Error al cargar el catálogo');
  } finally {
    isLoading.value = false;
  }
}

async function loadCompanyModules(companyId: number) {
  try {
    const { data } = await api.get(`/companies/${companyId}/modules`);
    companyModulesMap.value = {};
    for (const row of data) {
      companyModulesMap.value[row.code] = {
        id:          row.assignment_id ?? undefined,
        code:        row.code,
        is_enabled:  row.is_enabled === true,
        is_visible:  row.is_visible !== false,
        is_required: row.is_required === true || row.is_core === true,
        menu_order:  row.menu_order ?? row.menu_order_default ?? 0,
      };
    }
  } catch {
    // Silent — section will not be shown
  }
}

async function toggleCompanyModule(mod: CatalogModule) {
  if (!activeCompanyId.value) return;
  const current = companyModulesMap.value[mod.code];
  const nextEnabled = !(current?.is_enabled);

  if (mod.is_core && !nextEnabled) {
    showFeedback('error', 'Los módulos core no se pueden deshabilitar.');
    return;
  }

  savingCompanyMod.value[mod.code] = true;
  try {
    await api.put(
      `/companies/${activeCompanyId.value}/modules/${mod.code}`,
      { is_enabled: nextEnabled, is_visible: true }
    );
    companyModulesMap.value[mod.code] = {
      ...(current || { code: mod.code, is_enabled: false, is_visible: true, is_required: mod.is_core, menu_order: mod.menu_order_default }),
      is_enabled: nextEnabled,
      is_visible: true,
    };
    showFeedback('success', `Módulo ${nextEnabled ? 'habilitado' : 'deshabilitado'}.`);
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    showFeedback('error', e?.response?.data?.error ?? 'Error al actualizar módulo de la compañía');
  } finally {
    savingCompanyMod.value[mod.code] = false;
  }
}

// ── Save module metadata (super_admin only) ─────────────────────
const savingModule = ref<Record<number, boolean>>({});
async function saveModuleMetadata(mod: CatalogModule) {
  if (!perms.isSuperAdmin.value) return;
  savingModule.value[mod.id] = true;
  try {
    await api.put(`/catalog/modules/${mod.id}`, {
      name:                 mod.name,
      description:          mod.description,
      icon:                 mod.icon,
      group_name:           mod.group_name,
      is_core:              mod.is_core,
      menu_visible_default: mod.menu_visible_default,
      menu_order_default:   mod.menu_order_default,
      status:               mod.status,
    });
    showFeedback('success', `Módulo "${mod.name}" guardado.`);
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    showFeedback('error', e?.response?.data?.error ?? 'Error al guardar módulo');
  } finally {
    savingModule.value[mod.id] = false;
  }
}

// ── Save transaction metadata (super_admin only) ────────────────
const savingTx = ref<Record<number, boolean>>({});
async function saveTransactionMetadata(tx: CatalogTransaction) {
  if (!perms.isSuperAdmin.value) return;
  savingTx.value[tx.id] = true;
  try {
    await api.put(`/catalog/transactions/${tx.id}`, {
      name:         tx.name,
      description:  tx.description,
      route:        tx.route,
      icon:         tx.icon,
      tab_order:    tx.tab_order,
      menu_visible: tx.menu_visible,
      status:       tx.status,
    });
    showFeedback('success', `Transacción "${tx.name}" guardada.`);
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    showFeedback('error', e?.response?.data?.error ?? 'Error al guardar transacción');
  } finally {
    savingTx.value[tx.id] = false;
  }
}

function toggleExpanded(moduleId: number) {
  expanded.value[moduleId] = !expanded.value[moduleId];
}

const statusBadgeClass = (s: string) => {
  if (s === 'activo')   return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (s === 'inactivo') return 'bg-red-500/15 text-red-300 border-red-500/25';
  return 'bg-amber-500/15 text-amber-300 border-amber-500/25';
};

watch(selectedCompanyId, async (newId) => {
  companyModulesMap.value = {};
  if (newId) await loadCompanyModules(newId);
  else if (authStore.currentCompany?.id) await loadCompanyModules(authStore.currentCompany.id);
});

onMounted(loadCatalog);
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
          <h1 class="text-lg font-semibold" :style="{ color: headerColor }">Gestor de Módulos</h1>
          <p class="text-xs" :style="{ color: mutedColor }">Catálogo global de módulos y transacciones · gobernanza por compañía</p>
        </div>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <CompanySelector
          v-if="perms.isSuperAdmin.value"
          v-model="selectedCompanyId"
          placeholder="Mi empresa (hernancius)" />
        <div v-if="perms.isSuperAdmin.value" class="flex items-center gap-1.5 text-xs" :style="{ color: mutedColor }">
          <Lock class="h-3.5 w-3.5" />
          Modo super_admin
        </div>
      </div>
    </div>

    <!-- Feedback -->
    <div v-if="feedback"
         class="flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm"
         :class="feedback.type === 'success'
           ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
           : 'border-red-500/30 bg-red-500/10 text-red-300'">
      <CheckCircle2 v-if="feedback.type === 'success'" class="h-4 w-4 shrink-0" />
      <AlertCircle v-else class="h-4 w-4 shrink-0" />
      {{ feedback.message }}
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Loader2 class="h-7 w-7 animate-spin text-[#D4AF37]" />
    </div>

    <!-- Accordion list -->
    <div v-else class="space-y-3">
      <div v-for="mod in modules" :key="mod.id"
           class="rounded-2xl border overflow-hidden transition-shadow"
           :style="{ backgroundColor: cardBg, borderColor: cardBorder }">

        <!-- Accordion header -->
        <button type="button"
                @click="toggleExpanded(mod.id)"
                class="flex w-full items-center gap-3 px-5 py-4 text-left transition"
                @mouseover="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.backgroundColor = rowHoverBg"
                @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'">
          <component :is="expanded[mod.id] ? ChevronDown : ChevronRight" class="h-4 w-4 shrink-0" :style="{ color: mutedColor }" />
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl shrink-0" :style="{ backgroundColor: 'rgba(212,175,55,0.14)', color: '#D4AF37' }">
            <component :is="resolveIcon(mod.icon)" class="h-5 w-5" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-sm font-semibold" :style="{ color: headerColor }">{{ mod.name }}</p>
              <span class="text-xs rounded-full px-2 py-0.5 border" :class="statusBadgeClass(mod.status)">{{ mod.status }}</span>
              <span v-if="mod.is_core" class="text-[10px] rounded-full px-2 py-0.5 border bg-purple-500/10 text-purple-300 border-purple-500/20 uppercase tracking-wider">Core</span>
              <span v-else-if="mod.is_system" class="text-[10px] rounded-full px-2 py-0.5 border bg-blue-500/10 text-blue-300 border-blue-500/20 uppercase tracking-wider">Sistema</span>
            </div>
            <p class="text-xs mt-0.5" :style="{ color: mutedColor }">
              <span class="font-mono">{{ mod.code }}</span>
              <span v-if="mod.group_name"> · {{ mod.group_name }}</span>
              <span> · {{ mod.transactions.length }} transacciones</span>
            </p>
          </div>
          <!-- Company assignment toggle (only for super_admin with active company context) -->
          <div v-if="perms.isSuperAdmin.value && activeCompanyId && companyModulesMap[mod.code]"
               class="flex items-center gap-2 shrink-0"
               @click.stop>
            <span class="text-[11px]" :style="{ color: mutedColor }">
              {{ companyModulesMap[mod.code].is_enabled ? 'Habilitado' : 'Deshabilitado' }}
            </span>
            <button type="button"
                    :disabled="savingCompanyMod[mod.code] || (mod.is_core && companyModulesMap[mod.code].is_enabled)"
                    @click="toggleCompanyModule(mod)"
                    class="rounded-xl p-1.5 transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    :title="mod.is_core ? 'Core: no se puede deshabilitar' : 'Habilitar / deshabilitar para esta compañía'">
              <Loader2 v-if="savingCompanyMod[mod.code]" class="h-4 w-4 animate-spin" :style="{ color: mutedColor }" />
              <Eye   v-else-if="companyModulesMap[mod.code].is_enabled" class="h-4 w-4 text-emerald-400" />
              <EyeOff v-else class="h-4 w-4" :style="{ color: mutedColor }" />
            </button>
          </div>
        </button>

        <!-- Accordion body -->
        <div v-if="expanded[mod.id]" class="border-t" :style="{ borderColor: cardBorder, backgroundColor: panelBg }">
          <!-- Module metadata (Bloque A) -->
          <div class="px-5 py-4 border-b" :style="{ borderColor: cardBorder }">
            <p class="text-xs uppercase tracking-wider mb-3" :style="{ color: mutedColor }">Configuración del módulo</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Nombre</label>
                <input v-model="mod.name" :disabled="!perms.isSuperAdmin.value" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-60"
                       :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Código</label>
                <input :value="mod.code" disabled class="w-full rounded-2xl border px-3 py-2 text-sm opacity-60 font-mono"
                       :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>
              <div class="col-span-2">
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Descripción</label>
                <textarea v-model="mod.description" :disabled="!perms.isSuperAdmin.value" rows="2"
                          class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none resize-none disabled:opacity-60"
                          :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Icono (Lucide)</label>
                <input v-model="mod.icon" :disabled="!perms.isSuperAdmin.value" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-60"
                       :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Grupo</label>
                <input v-model="mod.group_name" :disabled="!perms.isSuperAdmin.value" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-60"
                       :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Orden menú</label>
                <input v-model.number="mod.menu_order_default" :disabled="!perms.isSuperAdmin.value" type="number" min="0"
                       class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-60"
                       :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Estado</label>
                <select v-model="mod.status" :disabled="!perms.isSuperAdmin.value" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-60"
                        :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="borrador">Borrador</option>
                </select>
              </div>
              <div class="col-span-2 pt-2 space-y-2.5">
                <p class="text-[11px] uppercase tracking-wider font-semibold" :style="{ color: mutedColor }">
                  Valores predeterminados del catálogo global
                  <span class="normal-case font-normal ml-1 opacity-75">(aplican al crear nuevas empresas, no afectan empresas existentes)</span>
                </p>
                <div class="flex flex-wrap gap-6">
                  <label class="flex items-center gap-2 text-sm cursor-pointer" :style="{ color: headerColor }">
                    <input type="checkbox" v-model="mod.menu_visible_default" :disabled="!perms.isSuperAdmin.value" />
                    Visible en menú por defecto
                  </label>
                  <label class="flex items-center gap-2 text-sm cursor-pointer" :style="{ color: headerColor }">
                    <input type="checkbox" v-model="mod.is_core" :disabled="!perms.isSuperAdmin.value" />
                    Módulo core (obligatorio para toda compañía)
                  </label>
                  <label class="flex items-center gap-2 text-sm" :style="{ color: mutedColor }">
                    <input type="checkbox" :checked="mod.is_global" disabled />
                    Global
                  </label>
                </div>
                <p v-if="perms.isSuperAdmin.value && activeCompanyId" class="text-[11px] rounded-xl border px-3 py-1.5 inline-flex items-center gap-1.5"
                  :style="{ borderColor: 'rgba(212,175,55,0.30)', backgroundColor: 'rgba(212,175,55,0.07)', color: '#D4AF37' }">
                  <Eye class="h-3 w-3 shrink-0" />
                  Para habilitar / deshabilitar este módulo en la empresa seleccionada, usa el icono
                  <Eye class="h-3 w-3 shrink-0 inline" /> / <EyeOff class="h-3 w-3 shrink-0 inline" />
                  en el encabezado del acordeón.
                </p>
              </div>
            </div>
            <div v-if="perms.isSuperAdmin.value" class="mt-4 flex justify-end">
              <button type="button"
                      :disabled="savingModule[mod.id]"
                      @click="saveModuleMetadata(mod)"
                      class="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white nxr-btn-primary disabled:opacity-60">
                <Loader2 v-if="savingModule[mod.id]" class="h-4 w-4 animate-spin" />
                <Save v-else class="h-4 w-4" />
                Guardar módulo
              </button>
            </div>
          </div>

          <!-- Transactions (Bloques B y C) -->
          <div v-if="mod.transactions.length > 0" class="px-5 py-4">
            <p class="text-xs uppercase tracking-wider mb-3" :style="{ color: mutedColor }">
              Transacciones ({{ mod.transactions.length }})
            </p>

            <!-- Tabs -->
            <div class="flex flex-wrap gap-2 border-b pb-3 mb-4" :style="{ borderColor: cardBorder }">
              <button v-for="tx in mod.transactions" :key="tx.id"
                      type="button"
                      @click="activeTab[mod.id] = tx.id"
                      class="flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs font-medium transition"
                      :style="activeTab[mod.id] === tx.id
                        ? { backgroundColor: 'rgba(212,175,55,0.15)', borderColor: 'rgba(212,175,55,0.40)', color: '#D4AF37' }
                        : { backgroundColor: inputBg, borderColor: inputBorder, color: mutedColor }">
                <component :is="resolveIcon(tx.icon)" class="h-3.5 w-3.5" />
                {{ tx.name }}
                <span v-if="tx.status !== 'activo'" class="text-[9px] uppercase opacity-70">{{ tx.status }}</span>
              </button>
            </div>

            <!-- Active tab content -->
            <template v-for="tx in mod.transactions" :key="tx.id">
              <div v-if="activeTab[mod.id] === tx.id" class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Nombre</label>
                  <input v-model="tx.name" :disabled="!perms.isSuperAdmin.value" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-60"
                         :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Código</label>
                  <input :value="tx.code" disabled class="w-full rounded-2xl border px-3 py-2 text-sm opacity-60 font-mono"
                         :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div class="col-span-2">
                  <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Descripción</label>
                  <textarea v-model="tx.description" :disabled="!perms.isSuperAdmin.value" rows="2"
                            class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none resize-none disabled:opacity-60"
                            :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Ruta</label>
                  <input v-model="tx.route" :disabled="!perms.isSuperAdmin.value" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-60 font-mono"
                         :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Icono (Lucide)</label>
                  <input v-model="tx.icon" :disabled="!perms.isSuperAdmin.value" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-60"
                         :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Orden tab</label>
                  <input v-model.number="tx.tab_order" :disabled="!perms.isSuperAdmin.value" type="number" min="0"
                         class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-60"
                         :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }" />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium" :style="{ color: mutedColor }">Estado</label>
                  <select v-model="tx.status" :disabled="!perms.isSuperAdmin.value" class="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-60"
                          :style="{ backgroundColor: inputBg, borderColor: inputBorder, color: headerColor }">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="borrador">Borrador</option>
                  </select>
                </div>
                <div class="col-span-2 flex flex-wrap gap-6 pt-2">
                  <label class="flex items-center gap-2 text-sm cursor-pointer" :style="{ color: headerColor }">
                    <input type="checkbox" v-model="tx.menu_visible" :disabled="!perms.isSuperAdmin.value" />
                    Visible en menú
                  </label>
                </div>
                <div v-if="perms.isSuperAdmin.value" class="col-span-2 flex justify-end">
                  <button type="button"
                          :disabled="savingTx[tx.id]"
                          @click="saveTransactionMetadata(tx)"
                          class="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white nxr-btn-primary disabled:opacity-60">
                    <Loader2 v-if="savingTx[tx.id]" class="h-4 w-4 animate-spin" />
                    <Save v-else class="h-4 w-4" />
                    Guardar transacción
                  </button>
                </div>
              </div>
            </template>
          </div>

          <!-- No transactions -->
          <div v-else class="px-5 py-6 text-center text-sm" :style="{ color: mutedColor }">
            Este módulo no tiene transacciones hijas registradas.
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-if="modules.length === 0"
           class="rounded-2xl border p-10 text-center text-sm"
           :style="{ backgroundColor: cardBg, borderColor: cardBorder, color: mutedColor }">
        No hay módulos en el catálogo.
      </div>
    </div>
  </div>
</template>
