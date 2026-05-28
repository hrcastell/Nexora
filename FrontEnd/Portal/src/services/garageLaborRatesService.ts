import api from '../utils/axios';
import type { LaborRate } from '../types/garage';

export const garageLaborRatesService = {
  list(params?: { employee_id?: number; status?: string }) {
    return api.get<LaborRate[]>('/garage/labor-rates', { params });
  },

  getById(id: number) {
    return api.get<LaborRate>(`/garage/labor-rates/${id}`);
  },

  listByEmployee(employeeId: number) {
    return api.get<LaborRate[]>(`/garage/employees/${employeeId}/labor-rates`);
  },

  create(data: { employee_id: number; rate_name: string; hourly_rate: number; currency?: string; valid_from?: string; valid_to?: string }) {
    return api.post<LaborRate>('/garage/labor-rates', data);
  },

  update(id: number, data: { rate_name: string; hourly_rate: number; currency?: string; valid_from?: string; valid_to?: string }) {
    return api.put<LaborRate>(`/garage/labor-rates/${id}`, data);
  },

  toggleStatus(id: number, status: 'active' | 'inactive') {
    return api.patch<{ id: number; status: string }>(`/garage/labor-rates/${id}/status`, { status });
  },
};
