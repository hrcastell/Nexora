import api from '../utils/axios';
import type { DentalConsultation, DentalConsultationFormData, DentalClinicalHistoryEntry } from '../types/dental';

export const dentalConsultationsService = {
  list(params?: { status?: string; administrative_status?: string; from?: string; to?: string; customer_id?: number | string }) {
    return api.get<DentalConsultation[]>('/dental/consultations', { params });
  },

  create(data: DentalConsultationFormData) {
    return api.post<DentalConsultation>('/dental/consultations', data);
  },

  getById(id: number | string) {
    return api.get<DentalConsultation>(`/dental/consultations/${id}`);
  },

  update(id: number | string, data: Partial<DentalConsultationFormData>) {
    return api.patch<DentalConsultation>(`/dental/consultations/${id}`, data);
  },

  addClinicalHistoryEntry(id: number | string, data: Partial<DentalClinicalHistoryEntry>) {
    return api.post<DentalClinicalHistoryEntry>(`/dental/consultations/${id}/clinical-history`, data);
  },

  addTreatments(id: number | string, treatmentIds: (number | string)[]) {
    return api.post(`/dental/consultations/${id}/treatments`, { treatment_ids: treatmentIds });
  },

  complete(id: number | string) {
    return api.post<DentalConsultation>(`/dental/consultations/${id}/complete`, {});
  },

  cancel(id: number | string) {
    return api.post<DentalConsultation>(`/dental/consultations/${id}/cancel`, {});
  },

  createCharge(id: number | string) {
    return api.post(`/dental/consultations/${id}/create-charge`, {});
  },
};
