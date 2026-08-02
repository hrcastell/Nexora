import { defineStore } from 'pinia';
import { ref } from 'vue';
import { garageCatalogsService } from '../services/garageCatalogsService';
import type { CatalogItem, CatalogType } from '../types/garage';

export const useGarageCatalogsStore = defineStore('garageCatalogs', () => {
  const catalogs = ref<Record<CatalogType, CatalogItem[]>>({
    vehicle_types:        [],
    vehicle_body_types:   [],
    vehicle_brands:       [],
    vehicle_models:       [],
    vehicle_colors:       [],
    vehicle_transmissions:[],
    vehicle_fuel_types:   [],
    product_types:        [],
  });

  const loading = ref<Partial<Record<CatalogType, boolean>>>({});
  const error   = ref<string | null>(null);

  async function loadCatalog(type: CatalogType, params?: { status?: string; brand_id?: number }) {
    loading.value[type] = true;
    error.value = null;
    try {
      const res = await garageCatalogsService.list(type, params);
      catalogs.value[type] = res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar catálogo';
    } finally {
      loading.value[type] = false;
    }
  }

  async function create(type: CatalogType, data: { name: string; brand_id?: number; hex_color?: string }) {
    const res = await garageCatalogsService.create(type, data);
    catalogs.value[type].push(res.data);
    return res.data;
  }

  async function update(type: CatalogType, id: number, data: { name: string; hex_color?: string }) {
    const res = await garageCatalogsService.update(type, id, data);
    const idx = catalogs.value[type].findIndex(i => i.id === id);
    if (idx !== -1) catalogs.value[type][idx] = res.data;
    return res.data;
  }

  async function toggleStatus(type: CatalogType, id: number, status: 'active' | 'inactive') {
    const res = await garageCatalogsService.toggleStatus(type, id, status);
    const idx = catalogs.value[type].findIndex(i => i.id === id);
    if (idx !== -1) catalogs.value[type][idx].status = status;
    return res.data;
  }

  async function remove(type: CatalogType, id: number) {
    await garageCatalogsService.remove(type, id);
    catalogs.value[type] = catalogs.value[type].filter(i => i.id !== id);
  }

  return { catalogs, loading, error, loadCatalog, create, update, toggleStatus, remove };
});
