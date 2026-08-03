import { defineStore } from 'pinia';
import { ref } from 'vue';
import { garageProductPriceLevelsService } from '../services/garageProductPriceLevelsService';
import type { ProductPriceLevel } from '../types/garage';

export const useGarageProductPriceLevelsStore = defineStore('garageProductPriceLevels', () => {
  const items   = ref<ProductPriceLevel[]>([]);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  async function load(params?: { status?: string }) {
    loading.value = true; error.value = null;
    try {
      const res = await garageProductPriceLevelsService.list(params ?? { status: 'active' });
      items.value = res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar niveles de precio';
    } finally { loading.value = false; }
  }

  async function create(data: { name: string; default_margin_pct: number; display_order?: number }) {
    const res = await garageProductPriceLevelsService.create(data);
    items.value.push(res.data);
    return res.data;
  }

  async function update(id: number, data: { name: string; default_margin_pct: number; display_order?: number }) {
    const res = await garageProductPriceLevelsService.update(id, data);
    const idx = items.value.findIndex(l => l.id === id);
    if (idx !== -1) Object.assign(items.value[idx], res.data);
    return res.data;
  }

  async function toggleStatus(id: number, status: 'active' | 'inactive') {
    await garageProductPriceLevelsService.toggleStatus(id, status);
    if (status === 'inactive') {
      items.value = items.value.filter(l => l.id !== id);
    }
  }

  return { items, loading, error, load, create, update, toggleStatus };
});
