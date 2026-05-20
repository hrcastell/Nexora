import api from '../utils/axios';
import type { Appointment, PaginatedResponse } from '../types/garage';

export const garageAppointmentsService = {
  list(params?: {
    status?: string;
    date_from?: string;
    date_to?: string;
    customer_id?: number;
    employee_id?: number;
    page?: number;
    limit?: number;
  }) {
    return api.get<PaginatedResponse<Appointment>>('/garage/appointments', { params });
  },

  getById(id: number) {
    return api.get<Appointment>(`/garage/appointments/${id}`);
  },

  create(data: Partial<Appointment> & { services?: Array<{ service_name: string; service_template_id?: number; estimated_hours?: number; suggested_employee_id?: number }> }) {
    return api.post<Appointment>('/garage/appointments', data);
  },

  update(id: number, data: Partial<Appointment>) {
    return api.put<Appointment>(`/garage/appointments/${id}`, data);
  },

  confirm(id: number, notes?: string) {
    return api.post<{ message: string; status: string }>(`/garage/appointments/${id}/confirm`, { notes });
  },

  markArrived(id: number, notes?: string) {
    return api.post<{ message: string; status: string }>(`/garage/appointments/${id}/mark-arrived`, { notes });
  },

  cancel(id: number, notes?: string) {
    return api.post<{ message: string; status: string }>(`/garage/appointments/${id}/cancel`, { notes });
  },

  reschedule(id: number, data: { new_start: string; new_end?: string; reason?: string }) {
    return api.post<{ message: string; new_start: string; status: string }>(`/garage/appointments/${id}/reschedule`, data);
  },

  convertToWorkOrder(id: number, data?: { mileage_in?: number; reception_notes?: string; fuel_level?: string; vehicle_condition_notes?: string }) {
    return api.post<{ message: string; work_order: any }>(`/garage/appointments/${id}/convert-to-work-order`, data || {});
  },
};
