import api from '../utils/axios';
import type { CatalogItem, CatalogType } from '../types/garage';

export const garageCatalogsService = {
  list(type: CatalogType, params?: { status?: string; q?: string; brand_id?: number }) {
    return api.get<CatalogItem[]>(`/garage/catalogs/${type}`, { params });
  },

  create(type: CatalogType, data: { name: string; brand_id?: number; hex_color?: string }) {
    return api.post<CatalogItem>(`/garage/catalogs/${type}`, data);
  },

  update(type: CatalogType, id: number, data: { name: string; hex_color?: string }) {
    return api.put<CatalogItem>(`/garage/catalogs/${type}/${id}`, data);
  },

  toggleStatus(type: CatalogType, id: number, status: 'active' | 'inactive') {
    return api.patch<CatalogItem>(`/garage/catalogs/${type}/${id}/status`, { status });
  },

  remove(type: CatalogType, id: number) {
    return api.delete<{ message: string }>(`/garage/catalogs/${type}/${id}`);
  },
};
