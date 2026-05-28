import api from '../utils/axios';
import type { Customer, CustomerListItem, CustomerFormData, PaginatedResponse } from '../types/garage';

export const garageCustomersService = {
  list(params?: { q?: string; status?: string; page?: number; limit?: number }) {
    return api.get<PaginatedResponse<CustomerListItem>>('/garage/customers', { params });
  },

  getById(id: number) {
    return api.get<Customer>(`/garage/customers/${id}`);
  },

  create(data: CustomerFormData) {
    return api.post<Customer>('/garage/customers', data);
  },

  update(id: number, data: CustomerFormData) {
    return api.put<Customer>(`/garage/customers/${id}`, data);
  },

  toggleStatus(id: number, status: 'active' | 'inactive') {
    return api.patch<{ id: number; status: string }>(`/garage/customers/${id}/status`, { status });
  },

  uploadPhoto(id: number, file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post<{ message: string; photo_url: string }>(`/garage/customers/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deletePhoto(id: number) {
    return api.delete<{ message: string }>(`/garage/customers/${id}/photo`);
  },
};
