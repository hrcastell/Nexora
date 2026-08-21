import api from '../utils/axios';
import type { ProductPriceLevel } from '../types/garage';

export const garageProductPriceLevelsService = {
  list(params?: { status?: string }) {
    return api.get<ProductPriceLevel[]>('/garage/product-price-levels', { params });
  },

  create(data: { name: string; default_margin_pct: number; display_order?: number }) {
    return api.post<ProductPriceLevel>('/garage/product-price-levels', data);
  },

  update(id: number, data: { name: string; default_margin_pct: number; display_order?: number }) {
    return api.put<ProductPriceLevel>(`/garage/product-price-levels/${id}`, data);
  },

  toggleStatus(id: number, status: 'active' | 'inactive') {
    return api.patch<ProductPriceLevel>(`/garage/product-price-levels/${id}/status`, { status });
  },
};
