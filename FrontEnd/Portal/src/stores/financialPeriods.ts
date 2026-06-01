import { defineStore } from 'pinia';
import { ref } from 'vue';
import { financialPeriodsService } from '../services/financialPeriodsService';
import type { FinancialPeriod, FinancialPeriodFormData } from '../types/financial';

export const useFinancialPeriodsStore = defineStore('financialPeriods', () => {
  const items   = ref<FinancialPeriod[]>([]);
  const current = ref<FinancialPeriod | null>(null);
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
      const res = await financialPeriodsService.list();
      items.value = unwrapData<FinancialPeriod[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar períodos';
    } finally {
      loading.value = false;
    }
  }

  async function loadCurrent() {
    loading.value = true;
    error.value = null;
    try {
      const res = await financialPeriodsService.getCurrent();
      current.value = unwrapData<FinancialPeriod | null>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar período actual';
    } finally {
      loading.value = false;
    }
  }

  async function loadOne(periodId: number) {
    loading.value = true;
    error.value = null;
    try {
      const res = await financialPeriodsService.getById(periodId);
      current.value = res.data;
      return res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar período';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function create(data: FinancialPeriodFormData) {
    const res = await financialPeriodsService.create(data);
    items.value.unshift(res.data);
    return res.data;
  }

  async function closePeriod(periodId: number) {
    const res = await financialPeriodsService.close(periodId);
    const idx = items.value.findIndex(p => p.id === periodId);
    if (idx !== -1) Object.assign(items.value[idx], res.data);
    if (current.value?.id === periodId) current.value = res.data;
    return res.data;
  }

  function reset() {
    items.value = [];
    current.value = null;
    error.value = null;
  }

  return { items, current, loading, error, load, loadCurrent, loadOne, create, closePeriod, reset };
});
