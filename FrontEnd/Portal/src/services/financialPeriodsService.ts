import api from '../utils/axios';
import type { FinancialPeriod, FinancialPeriodFormData } from '../types/financial';

export const financialPeriodsService = {
  list() {
    return api.get<FinancialPeriod[]>('/financial/periods');
  },

  getCurrent() {
    return api.get<FinancialPeriod | null>('/financial/periods/current');
  },

  getById(periodId: number) {
    return api.get<FinancialPeriod>(`/financial/periods/${periodId}`);
  },

  create(data: FinancialPeriodFormData) {
    return api.post<FinancialPeriod>('/financial/periods', data);
  },

  close(periodId: number) {
    return api.post<FinancialPeriod>(`/financial/periods/${periodId}/close`, {});
  },
};
