import api from '../utils/axios';
import type { BudgetPlan, BudgetPlanFormData } from '../types/financial';

export const financialBudgetPlansService = {
  listByPeriod(periodId: number) {
    return api.get<BudgetPlan[]>(`/financial/periods/${periodId}/budget-plans`);
  },

  create(periodId: number, data: BudgetPlanFormData) {
    return api.post<BudgetPlan>(`/financial/periods/${periodId}/budget-plans`, data);
  },

  update(budgetPlanId: number, data: Partial<BudgetPlanFormData>) {
    return api.put<BudgetPlan>(`/financial/budget-plans/${budgetPlanId}`, data);
  },

  remove(budgetPlanId: number) {
    return api.delete<{ message: string }>(`/financial/budget-plans/${budgetPlanId}`);
  },
};
