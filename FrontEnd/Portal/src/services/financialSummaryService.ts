import api from '../utils/axios';
import type { FinancialSummary, CategoryBreakdown } from '../types/financial';

export const financialSummaryService = {
  getSummary(periodId: number) {
    return api.get<FinancialSummary>(`/financial/periods/${periodId}/summary`);
  },

  getBreakdown(periodId: number) {
    return api.get<{ data: CategoryBreakdown[] }>(`/financial/periods/${periodId}/breakdown`);
  },

  getDeviations(periodId: number) {
    return api.get<{ data: CategoryBreakdown[] }>(`/financial/periods/${periodId}/deviations`);
  },
};
