import { defineStore } from 'pinia';
import { ref } from 'vue';
import { financialBudgetPlansService } from '../services/financialBudgetPlansService';
import type { BudgetPlan, BudgetPlanFormData } from '../types/financial';

export const useFinancialBudgetPlansStore = defineStore('financialBudgetPlans', () => {
  const items   = ref<BudgetPlan[]>([]);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  function unwrapData<T>(payload: T | { data: T }): T {
    return payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload as T;
  }

  async function loadByPeriod(periodId: number) {
    loading.value = true;
    error.value = null;
    try {
      const res = await financialBudgetPlansService.listByPeriod(periodId);
      items.value = unwrapData<BudgetPlan[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar planes de presupuesto';
    } finally {
      loading.value = false;
    }
  }

  async function create(periodId: number, data: BudgetPlanFormData) {
    const res = await financialBudgetPlansService.create(periodId, data);
    const plan = unwrapData<BudgetPlan>(res.data);
    items.value.push(plan);
    return plan;
  }

  async function update(budgetPlanId: number, data: Partial<BudgetPlanFormData>) {
    const res = await financialBudgetPlansService.update(budgetPlanId, data);
    const plan = unwrapData<BudgetPlan>(res.data);
    const idx = items.value.findIndex(p => p.id === budgetPlanId);
    if (idx !== -1) Object.assign(items.value[idx], plan);
    return plan;
  }

  async function remove(budgetPlanId: number) {
    await financialBudgetPlansService.remove(budgetPlanId);
    items.value = items.value.filter(p => p.id !== budgetPlanId);
  }

  function reset() {
    items.value = [];
    error.value = null;
  }

  return { items, loading, error, loadByPeriod, create, update, remove, reset };
});
