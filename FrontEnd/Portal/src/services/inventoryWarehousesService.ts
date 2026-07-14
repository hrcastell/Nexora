import api from '../utils/axios';
import type { Warehouse, WarehouseFormData } from '../types/inventory';

export const inventoryWarehousesService = {
  list(params?: { q?: string; status?: string }) {
    return api.get<Warehouse[]>('/inventory/warehouses', { params });
  },

  getById(id: number) {
    return api.get<Warehouse>(`/inventory/warehouses/${id}`);
  },

  create(data: WarehouseFormData) {
    return api.post<Warehouse>('/inventory/warehouses', data);
  },

  update(id: number, data: WarehouseFormData) {
    return api.put<Warehouse>(`/inventory/warehouses/${id}`, data);
  },

  toggleStatus(id: number, status: 'active' | 'inactive') {
    return api.patch<Warehouse>(`/inventory/warehouses/${id}/status`, { status });
  },
};
