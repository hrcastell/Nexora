import api from '../utils/axios';
import type { Product, ProductFormData, PaginatedResponse } from '../types/garage';

export const garageProductsService = {
  list(params?: { q?: string; status?: string; product_type_id?: number; page?: number; limit?: number }) {
    return api.get<PaginatedResponse<Product>>('/garage/products', { params });
  },

  getById(id: number) {
    return api.get<Product>(`/garage/products/${id}`);
  },

  create(data: ProductFormData) {
    return api.post<Product>('/garage/products', data);
  },

  update(id: number, data: ProductFormData) {
    return api.put<Product>(`/garage/products/${id}`, data);
  },

  toggleStatus(id: number, status: 'active' | 'inactive') {
    return api.patch<{ id: number; status: string }>(`/garage/products/${id}/status`, { status });
  },

  remove(id: number) {
    return api.delete<{ message: string }>(`/garage/products/${id}`);
  },
};
