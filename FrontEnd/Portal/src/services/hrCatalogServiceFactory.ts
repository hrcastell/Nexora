import api from '../utils/axios';
import type { HrCatalogFormData, HrCatalogItem, HrCatalogStatus } from '../types/hr';

export function createHrCatalogService(resource: string) {
  return {
    list(params?: { q?: string; status?: HrCatalogStatus | 'all' }) {
      return api.get<HrCatalogItem[]>(`/hr/${resource}`, { params });
    },
    create(data: HrCatalogFormData) {
      return api.post<HrCatalogItem>(`/hr/${resource}`, data);
    },
    update(id: number, data: HrCatalogFormData) {
      return api.put<HrCatalogItem>(`/hr/${resource}/${id}`, data);
    },
    toggleStatus(id: number, status: HrCatalogStatus) {
      return api.patch<HrCatalogItem>(`/hr/${resource}/${id}/status`, { status });
    },
  };
}
