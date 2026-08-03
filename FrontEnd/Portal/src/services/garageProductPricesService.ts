import api from '../utils/axios';
import type { ProductPricesResponse } from '../types/garage';

export const garageProductPricesService = {
  getForProduct(productId: number) {
    return api.get<ProductPricesResponse>(`/garage/products/${productId}/prices`);
  },

  save(productId: number, prices: { price_level_id: number; margin_pct: number }[]) {
    return api.put<{ message: string }>(`/garage/products/${productId}/prices`, { prices });
  },
};
