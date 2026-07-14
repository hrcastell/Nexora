import { defineStore } from 'pinia';
import { ref } from 'vue';
import { inventoryWarehousesService } from '../services/inventoryWarehousesService';
import type { Warehouse, WarehouseFormData } from '../types/inventory';

export const useInventoryWarehousesStore = defineStore('inventoryWarehouses', () => {
  const items = ref<Warehouse[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load(params?: { q?: string; status?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await inventoryWarehousesService.list(params);
      items.value = res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar bodegas';
    } finally {
      loading.value = false;
    }
  }

  async function create(data: WarehouseFormData) {
    const res = await inventoryWarehousesService.create(data);
    items.value.unshift(res.data);
    return res.data;
  }

  async function update(id: number, data: WarehouseFormData) {
    const res = await inventoryWarehousesService.update(id, data);
    const idx = items.value.findIndex((item) => item.id === id);
    if (idx !== -1) items.value[idx] = res.data;
    return res.data;
  }

  async function toggleStatus(id: number, status: 'active' | 'inactive') {
    const res = await inventoryWarehousesService.toggleStatus(id, status);
    const idx = items.value.findIndex((item) => item.id === id);
    if (idx !== -1) items.value[idx] = res.data;
    return res.data;
  }

  return { items, loading, error, load, create, update, toggleStatus };
});
