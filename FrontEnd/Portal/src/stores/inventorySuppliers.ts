import { defineStore } from 'pinia';
import { ref } from 'vue';
import { inventorySuppliersService } from '../services/inventorySuppliersService';
import type { Supplier, SupplierFormData } from '../types/inventory';

export const useInventorySuppliersStore = defineStore('inventorySuppliers', () => {
  const items = ref<Supplier[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load(params?: { q?: string; status?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await inventorySuppliersService.list(params);
      items.value = res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar proveedores';
    } finally {
      loading.value = false;
    }
  }

  async function create(data: SupplierFormData) {
    const res = await inventorySuppliersService.create(data);
    items.value.unshift(res.data);
    return res.data;
  }

  async function update(id: number, data: SupplierFormData) {
    const res = await inventorySuppliersService.update(id, data);
    const idx = items.value.findIndex((item) => item.id === id);
    if (idx !== -1) items.value[idx] = res.data;
    return res.data;
  }

  async function toggleStatus(id: number, status: 'active' | 'inactive') {
    const res = await inventorySuppliersService.toggleStatus(id, status);
    const idx = items.value.findIndex((item) => item.id === id);
    if (idx !== -1) items.value[idx] = res.data;
    return res.data;
  }

  return { items, loading, error, load, create, update, toggleStatus };
});
