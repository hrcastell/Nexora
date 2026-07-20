import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../utils/axios';

export type PermissionAction = 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_approve' | 'can_export' | 'can_admin';

export interface TransactionPerms {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_export: boolean;
  can_admin: boolean;
}

export interface MenuTransaction {
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
  // Permission flags — populated when backend returns them (future)
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_approve?: boolean;
  can_export?: boolean;
  can_admin?: boolean;
}

export interface MenuModule {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  group_name?: string;
  is_core: boolean;
  is_global: boolean;
  is_system: boolean;
  is_enabled: boolean;
  is_visible: boolean;
  is_required: boolean;
  menu_order: number;
  status: string;
  transactions: MenuTransaction[];
}

/**
 * Store del menú dinámico.
 *
 * Consume GET /api/menu/me después del login/selectCompany y expone:
 * - `modules`: árbol de módulos + transacciones habilitados para la compañía
 * - `hasModule(code)`, `hasTransaction(route)`: helpers para guards de UI
 * - `loaded`: indica si la carga inicial terminó (para saber si usar fallback)
 */
export const useMenuStore = defineStore('menu', () => {
  const modules = ref<MenuModule[]>([]);
  const loaded = ref(false);
  const loadError = ref<string | null>(null);

  const isEmpty = computed(() => modules.value.length === 0);

  const moduleCodes = computed(() => new Set(modules.value.map(m => m.code)));

  const routeIndex = computed(() => {
    const map = new Map<string, { module: string; transaction: string }>();
    for (const m of modules.value) {
      for (const t of m.transactions) {
        if (t.route && t.can_view === true) map.set(t.route, { module: m.code, transaction: t.code });
      }
    }
    return map;
  });

  /**
   * permissionIndex: maps transaction_code → permission flags.
   * Transactions present in the menu tree already passed can_view=TRUE
   * (filtered by menuController). Additional flags (can_create, etc.) are
   * populated when the backend returns them on the transaction object.
   * Falls back to { can_view: true, all others: false } for menu-visible transactions
   * until the backend is extended to return full flags.
   */
  const permissionIndex = computed(() => {
    const map = new Map<string, TransactionPerms>();
    for (const m of modules.value) {
      for (const t of m.transactions) {
        if (t.can_view !== true) continue;
        map.set(t.code, {
          can_view:   true,
          can_create: t.can_create ?? false,
          can_edit:   t.can_edit   ?? false,
          can_delete: t.can_delete ?? false,
          can_approve: t.can_approve ?? false,
          can_export: t.can_export ?? false,
          can_admin:  t.can_admin  ?? false,
        });
      }
    }
    return map;
  });

  function hasModule(code: string): boolean {
    if (!loaded.value) return true; // antes de la carga, permitir (fallback)
    return moduleCodes.value.has(code);
  }

  /**
   * OR-semantics module check (design §1, touchpoint 4/5 — products-catalog-transversal).
   * Used for routes/UI gated by "any of these modules", e.g. the neutral
   * Products catalog (garage_operations OR inventory). Returns true before
   * the menu loads (same fallback behavior as hasModule).
   */
  function hasAnyModule(codes: string[]): boolean {
    if (!loaded.value) return true; // antes de la carga, permitir (fallback)
    return codes.some((code) => hasModule(code));
  }

  function hasTransaction(route: string): boolean {
    if (!loaded.value) return true; // fallback
    return routeIndex.value.has(route);
  }

  async function loadMenu() {
    try {
      loadError.value = null;
      const { data } = await api.get('/menu/me');
      modules.value = Array.isArray(data?.modules) ? data.modules : [];
      loaded.value = true;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      loadError.value = e?.response?.data?.error ?? e?.message ?? 'Error al cargar menú';
      modules.value = [];
      loaded.value = true; // marcamos como cargado aun en error para que el fallback aplique
    }
  }

  function reset() {
    modules.value = [];
    loaded.value = false;
    loadError.value = null;
  }

  return {
    modules,
    loaded,
    loadError,
    isEmpty,
    moduleCodes,
    routeIndex,
    permissionIndex,
    hasModule,
    hasAnyModule,
    hasTransaction,
    loadMenu,
    reset,
  };
});
