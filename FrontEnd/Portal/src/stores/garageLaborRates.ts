import { defineStore } from 'pinia';
import { ref } from 'vue';
import { garageLaborRatesService } from '../services/garageLaborRatesService';
import type { LaborRate } from '../types/garage';

export const useGarageLaborRatesStore = defineStore('garageLaborRates', () => {
  const items   = ref<LaborRate[]>([]);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  async function load(params?: { employee_id?: number; status?: string }) {
    loading.value = true; error.value = null;
    try {
      const res = await garageLaborRatesService.list(params);
      items.value = res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar tarifas';
    } finally { loading.value = false; }
  }

  async function loadByEmployee(employeeId: number) {
    loading.value = true; error.value = null;
    try {
      const res = await garageLaborRatesService.listByEmployee(employeeId);
      items.value = res.data;
      return res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar tarifas del empleado';
      throw e;
    } finally { loading.value = false; }
  }

  async function create(data: { employee_id: number; rate_name: string; hourly_rate: number; currency?: string; valid_from?: string; valid_to?: string }) {
    const res = await garageLaborRatesService.create(data);
    items.value.unshift(res.data);
    return res.data;
  }

  async function update(id: number, data: { rate_name: string; hourly_rate: number; currency?: string; valid_from?: string; valid_to?: string }) {
    const res = await garageLaborRatesService.update(id, data);
    const idx = items.value.findIndex(r => r.id === id);
    if (idx !== -1) Object.assign(items.value[idx], res.data);
    return res.data;
  }

  async function toggleStatus(id: number, status: 'active' | 'inactive') {
    await garageLaborRatesService.toggleStatus(id, status);
    const idx = items.value.findIndex(r => r.id === id);
    if (idx !== -1) items.value[idx].status = status;
  }

  function reset() { items.value = []; error.value = null; }

  return { items, loading, error, load, loadByEmployee, create, update, toggleStatus, reset };
});
