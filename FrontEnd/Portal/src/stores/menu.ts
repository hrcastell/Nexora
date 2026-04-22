import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../utils/axios';

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
        if (t.route) map.set(t.route, { module: m.code, transaction: t.code });
      }
    }
    return map;
  });

  function hasModule(code: string): boolean {
    if (!loaded.value) return true; // antes de la carga, permitir (fallback)
    return moduleCodes.value.has(code);
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
    hasModule,
    hasTransaction,
    loadMenu,
    reset,
  };
});
