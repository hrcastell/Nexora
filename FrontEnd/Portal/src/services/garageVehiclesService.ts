import api from '../utils/axios';
import type { Vehicle, VehiclePhoto, PaginatedResponse } from '../types/garage';

export const garageVehiclesService = {
  list(params?: { q?: string; customer_id?: number; brand_id?: number; status?: string; page?: number; limit?: number }) {
    return api.get<PaginatedResponse<Vehicle>>('/garage/vehicles', { params });
  },

  getById(id: number) {
    return api.get<Vehicle>(`/garage/vehicles/${id}`);
  },

  listByCustomer(customerId: number) {
    return api.get<Vehicle[]>(`/garage/customers/${customerId}/vehicles`);
  },

  create(data: Partial<Vehicle>) {
    return api.post<Vehicle>('/garage/vehicles', data);
  },

  update(id: number, data: Partial<Vehicle>) {
    return api.put<Vehicle>(`/garage/vehicles/${id}`, data);
  },

  toggleStatus(id: number, status: 'active' | 'inactive') {
    return api.patch<{ id: number; status: string }>(`/garage/vehicles/${id}/status`, { status });
  },

  getPhotos(id: number) {
    return api.get<VehiclePhoto[]>(`/garage/vehicles/${id}/photos`);
  },

  uploadPhoto(id: number, file: File, stage: 'entry' | 'delivery', caption?: string, workOrderId?: number) {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('stage', stage);
    if (caption) formData.append('caption', caption);
    if (workOrderId) formData.append('work_order_id', String(workOrderId));
    return api.post<VehiclePhoto>(`/garage/vehicles/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deletePhoto(vehicleId: number, photoId: number) {
    return api.delete<{ message: string }>(`/garage/vehicles/${vehicleId}/photos/${photoId}`);
  },
};
