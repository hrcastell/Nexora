import api from '../utils/axios';
import type { ServiceTemplate, ServiceTemplateProduct, PaginatedResponse } from '../types/garage';

export const garageServiceTemplatesService = {
  list(params?: { q?: string; status?: string; page?: number; limit?: number }) {
    return api.get<PaginatedResponse<ServiceTemplate>>('/garage/service-templates', { params });
  },

  getById(id: number) {
    return api.get<ServiceTemplate>(`/garage/service-templates/${id}`);
  },

  create(data: Partial<ServiceTemplate>) {
    return api.post<ServiceTemplate>('/garage/service-templates', data);
  },

  update(id: number, data: Partial<ServiceTemplate>) {
    return api.put<ServiceTemplate>(`/garage/service-templates/${id}`, data);
  },

  toggleStatus(id: number, status: 'active' | 'inactive') {
    return api.patch<{ id: number; status: string }>(`/garage/service-templates/${id}/status`, { status });
  },

  addProduct(templateId: number, data: { product_id: number; quantity: number; unit?: string; reference_unit_price?: number }) {
    return api.post<ServiceTemplateProduct>(`/garage/service-templates/${templateId}/products`, data);
  },

  removeProduct(templateId: number, productId: number) {
    return api.delete<{ message: string }>(`/garage/service-templates/${templateId}/products/${productId}`);
  },
};
