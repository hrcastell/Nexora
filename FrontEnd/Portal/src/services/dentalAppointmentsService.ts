import api from '../utils/axios';
import type { DentalAppointment, DentalAppointmentFormData } from '../types/dental';

export const dentalAppointmentsService = {
  list(params?: { status?: string; customer_id?: number | string; from?: string; to?: string }) {
    return api.get<DentalAppointment[]>('/dental/appointments', { params });
  },

  getDay(date?: string) {
    return api.get<DentalAppointment[]>('/dental/appointments/day', { params: { date } });
  },

  getMonth(year?: number, month?: number) {
    return api.get<DentalAppointment[]>('/dental/appointments/month', { params: { year, month } });
  },

  create(data: DentalAppointmentFormData) {
    return api.post<DentalAppointment>('/dental/appointments', data);
  },

  getById(id: number | string) {
    return api.get<DentalAppointment>(`/dental/appointments/${id}`);
  },

  update(id: number | string, data: Partial<DentalAppointmentFormData>) {
    return api.patch<DentalAppointment>(`/dental/appointments/${id}`, data);
  },

  confirm(id: number | string) {
    return api.post<DentalAppointment>(`/dental/appointments/${id}/confirm`, {});
  },

  cancel(id: number | string) {
    return api.post<DentalAppointment>(`/dental/appointments/${id}/cancel`, {});
  },

  noShow(id: number | string) {
    return api.post<DentalAppointment>(`/dental/appointments/${id}/no-show`, {});
  },

  convertToConsultation(id: number | string) {
    return api.post(`/dental/appointments/${id}/convert-to-consultation`, {});
  },
};
