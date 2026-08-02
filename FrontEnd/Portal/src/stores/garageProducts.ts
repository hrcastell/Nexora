import { defineStore } from 'pinia';
import { ref } from 'vue';
import { garageProductsService } from '../services/garageProductsService';
import type { Product, ProductFormData } from '../types/garage';

export const useGarageProductsStore = defineStore('garageProducts', () => {
  const items   = ref<Product[]>([]);
  const total   = ref(0);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  async function load(params?: { q?: string; status?: string; product_type?: string; page?: number; limit?: number }) {
    loading.value = true; error.value = null;
    try {
      const res = await garageProductsService.list(params);
      items.value = res.data.data;
      total.value = res.data.total;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar productos';
    } finally { loading.value = false; }
  }

  async function create(data: ProductFormData) {
    const res = await garageProductsService.create(data);
    items.value.unshift(res.data);
    total.value++;
    return res.data;
  }

  async function update(id: number, data: ProductFormData) {
    const res = await garageProductsService.update(id, data);
    const idx = items.value.findIndex(p => p.id === id);
    if (idx !== -1) Object.assign(items.value[idx], res.data);
    return res.data;
  }

  async function toggleStatus(id: number, status: 'active' | 'inactive') {
    await garageProductsService.toggleStatus(id, status);
    const idx = items.value.findIndex(p => p.id === id);
    if (idx !== -1) items.value[idx].status = status;
  }

  async function remove(id: number) {
    await garageProductsService.remove(id);
    items.value = items.value.filter(p => p.id !== id);
    total.value = Math.max(0, total.value - 1);
  }

  function reset() { items.value = []; total.value = 0; error.value = null; }

  return { items, total, loading, error, load, create, update, toggleStatus, remove, reset };
});
