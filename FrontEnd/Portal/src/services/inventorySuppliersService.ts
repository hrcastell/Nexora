import api from '../utils/axios';
import type { Supplier, SupplierFormData } from '../types/inventory';

export const inventorySuppliersService = {
  list(params?: { q?: string; status?: string }) {
    return api.get<Supplier[]>('/inventory/suppliers', { params });
  },

  getById(id: number) {
    return api.get<Supplier>(`/inventory/suppliers/${id}`);
  },

  create(data: SupplierFormData) {
    return api.post<Supplier>('/inventory/suppliers', data);
  },

  update(id: number, data: SupplierFormData) {
    return api.put<Supplier>(`/inventory/suppliers/${id}`, data);
  },

  toggleStatus(id: number, status: 'active' | 'inactive') {
    return api.patch<Supplier>(`/inventory/suppliers/${id}/status`, { status });
  },
};
