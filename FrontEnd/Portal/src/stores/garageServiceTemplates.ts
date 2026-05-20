import { defineStore } from 'pinia';
import { ref } from 'vue';
import { garageServiceTemplatesService } from '../services/garageServiceTemplatesService';
import type { ServiceTemplate } from '../types/garage';

export const useGarageServiceTemplatesStore = defineStore('garageServiceTemplates', () => {
  const items   = ref<ServiceTemplate[]>([]);
  const current = ref<ServiceTemplate | null>(null);
  const total   = ref(0);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  async function load(params?: { q?: string; status?: string; page?: number; limit?: number }) {
    loading.value = true; error.value = null;
    try {
      const res = await garageServiceTemplatesService.list(params);
      items.value = res.data.data;
      total.value = res.data.total;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar servicios';
    } finally { loading.value = false; }
  }

  async function loadOne(id: number) {
    loading.value = true; error.value = null;
    try {
      const res = await garageServiceTemplatesService.getById(id);
      current.value = res.data;
      return res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar servicio';
      throw e;
    } finally { loading.value = false; }
  }

  async function create(data: Partial<ServiceTemplate>) {
    const res = await garageServiceTemplatesService.create(data);
    items.value.unshift(res.data);
    total.value++;
    return res.data;
  }

  async function update(id: number, data: Partial<ServiceTemplate>) {
    const res = await garageServiceTemplatesService.update(id, data);
    const idx = items.value.findIndex(s => s.id === id);
    if (idx !== -1) Object.assign(items.value[idx], res.data);
    if (current.value?.id === id) current.value = res.data;
    return res.data;
  }

  async function toggleStatus(id: number, status: 'active' | 'inactive') {
    await garageServiceTemplatesService.toggleStatus(id, status);
    const idx = items.value.findIndex(s => s.id === id);
    if (idx !== -1) items.value[idx].status = status;
    if (current.value?.id === id) current.value.status = status;
  }

  function reset() { items.value = []; current.value = null; total.value = 0; error.value = null; }

  return { items, current, total, loading, error, load, loadOne, create, update, toggleStatus, reset };
});
