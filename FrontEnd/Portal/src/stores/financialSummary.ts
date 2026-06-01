import { defineStore } from 'pinia';
import { ref } from 'vue';
import { financialSummaryService } from '../services/financialSummaryService';
import type { FinancialSummary, CategoryBreakdown } from '../types/financial';

export const useFinancialSummaryStore = defineStore('financialSummary', () => {
  const summary    = ref<FinancialSummary | null>(null);
  const breakdown  = ref<CategoryBreakdown[]>([]);
  const deviations = ref<CategoryBreakdown[]>([]);
  const loading    = ref(false);
  const error      = ref<string | null>(null);

  async function loadSummary(periodId: number) {
    if (!Number.isFinite(periodId)) {
      summary.value = null;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const res = await financialSummaryService.getSummary(periodId);
      summary.value = res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar resumen';
    } finally {
      loading.value = false;
    }
  }

  async function loadBreakdown(periodId: number) {
    if (!Number.isFinite(periodId)) {
      breakdown.value = [];
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const res = await financialSummaryService.getBreakdown(periodId);
      breakdown.value = res.data.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar desglose';
    } finally {
      loading.value = false;
    }
  }

  async function loadDeviations(periodId: number) {
    if (!Number.isFinite(periodId)) {
      deviations.value = [];
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const res = await financialSummaryService.getDeviations(periodId);
      deviations.value = res.data.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar desviaciones';
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    summary.value = null;
    breakdown.value = [];
    deviations.value = [];
    error.value = null;
  }

  return { summary, breakdown, deviations, loading, error, loadSummary, loadBreakdown, loadDeviations, reset };
});
