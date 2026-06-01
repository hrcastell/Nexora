import { defineStore } from 'pinia';
import { ref } from 'vue';
import { financialCategoriesService } from '../services/financialCategoriesService';
import type { FinancialCategory, FinancialCategoryFormData } from '../types/financial';

export const useFinancialCategoriesStore = defineStore('financialCategories', () => {
  const items   = ref<FinancialCategory[]>([]);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  function unwrapData<T>(payload: T | { data: T }): T {
    return payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload as T;
  }

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const res = await financialCategoriesService.list();
      items.value = unwrapData<FinancialCategory[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar categorías';
    } finally {
      loading.value = false;
    }
  }

  async function create(data: FinancialCategoryFormData) {
    const res = await financialCategoriesService.create(data);
    const category = unwrapData<FinancialCategory>(res.data);
    items.value.unshift(category);
    return category;
  }

  async function update(categoryId: number, data: FinancialCategoryFormData) {
    const res = await financialCategoriesService.update(categoryId, data);
    const category = unwrapData<FinancialCategory>(res.data);
    const idx = items.value.findIndex(c => c.id === categoryId);
    if (idx !== -1) Object.assign(items.value[idx], category);
    return category;
  }

  async function toggleStatus(categoryId: number, is_active: boolean) {
    await financialCategoriesService.toggleStatus(categoryId, is_active);
    const idx = items.value.findIndex(c => c.id === categoryId);
    if (idx !== -1) items.value[idx].is_active = is_active;
  }

  async function remove(categoryId: number) {
    await financialCategoriesService.remove(categoryId);
    items.value = items.value.filter(c => c.id !== categoryId);
  }

  async function seed() {
    const res = await financialCategoriesService.seed();
    await load();
    return res.data;
  }

  function reset() {
    items.value = [];
    error.value = null;
  }

  return { items, loading, error, load, create, update, toggleStatus, remove, seed, reset };
});
