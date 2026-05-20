import api from '../utils/axios';
import type { Employee, PaginatedResponse } from '../types/garage';

export const garageEmployeesService = {
  list(params?: { q?: string; status?: string; page?: number; limit?: number }) {
    return api.get<PaginatedResponse<Employee>>('/garage/employees', { params });
  },

  getById(id: number) {
    return api.get<Employee>(`/garage/employees/${id}`);
  },

  create(data: Partial<Employee>) {
    return api.post<Employee>('/garage/employees', data);
  },

  update(id: number, data: Partial<Employee>) {
    return api.put<Employee>(`/garage/employees/${id}`, data);
  },

  toggleStatus(id: number, status: 'active' | 'inactive') {
    return api.patch<{ id: number; status: string }>(`/garage/employees/${id}/status`, { status });
  },

  uploadPhoto(id: number, file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post<{ message: string; photo_url: string }>(`/garage/employees/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deletePhoto(id: number) {
    return api.delete<{ message: string }>(`/garage/employees/${id}/photo`);
  },
};
