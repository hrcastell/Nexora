import api from '../utils/axios';
import type { FinancialCategory, FinancialCategoryFormData } from '../types/financial';

export const financialCategoriesService = {
  list() {
    return api.get<FinancialCategory[]>('/financial/categories');
  },

  getById(categoryId: number) {
    return api.get<FinancialCategory>(`/financial/categories/${categoryId}`);
  },

  create(data: FinancialCategoryFormData) {
    return api.post<FinancialCategory>('/financial/categories', data);
  },

  update(categoryId: number, data: FinancialCategoryFormData) {
    return api.put<FinancialCategory>(`/financial/categories/${categoryId}`, data);
  },

  toggleStatus(categoryId: number, is_active: boolean) {
    return api.patch<FinancialCategory>(`/financial/categories/${categoryId}/status`, { is_active });
  },

  remove(categoryId: number) {
    return api.delete<{ message: string }>(`/financial/categories/${categoryId}`);
  },

  seed() {
    return api.post<{ message: string }>('/financial/categories/seed', {});
  },
};
