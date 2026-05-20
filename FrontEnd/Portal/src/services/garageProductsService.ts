import api from '../utils/axios';
import type { Product, PaginatedResponse } from '../types/garage';

export const garageProductsService = {
  list(params?: { q?: string; status?: string; product_type?: string; page?: number; limit?: number }) {
    return api.get<PaginatedResponse<Product>>('/garage/products', { params });
  },

  getById(id: number) {
    return api.get<Product>(`/garage/products/${id}`);
  },

  create(data: Partial<Product>) {
    return api.post<Product>('/garage/products', data);
  },

  update(id: number, data: Partial<Product>) {
    return api.put<Product>(`/garage/products/${id}`, data);
  },

  toggleStatus(id: number, status: 'active' | 'inactive') {
    return api.patch<{ id: number; status: string }>(`/garage/products/${id}/status`, { status });
  },
};
