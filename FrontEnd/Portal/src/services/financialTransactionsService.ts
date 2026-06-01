import api from '../utils/axios';
import type { FinancialTransaction, FinancialTransactionFormData, TransactionType } from '../types/financial';

export const financialTransactionsService = {
  listByPeriod(periodId: number, params?: { type?: TransactionType; category_id?: number; page?: number; limit?: number }) {
    return api.get<FinancialTransaction[]>(`/financial/periods/${periodId}/transactions`, { params });
  },

  getById(transactionId: number) {
    return api.get<FinancialTransaction>(`/financial/transactions/${transactionId}`);
  },

  create(periodId: number, data: FinancialTransactionFormData) {
    return api.post<FinancialTransaction>(`/financial/periods/${periodId}/transactions`, data);
  },

  update(transactionId: number, data: Partial<FinancialTransactionFormData>) {
    return api.patch<FinancialTransaction>(`/financial/transactions/${transactionId}`, data);
  },

  remove(transactionId: number) {
    return api.delete<{ message: string }>(`/financial/transactions/${transactionId}`);
  },
};
