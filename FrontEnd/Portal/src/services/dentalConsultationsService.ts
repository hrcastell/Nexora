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
    return api.post(`/dental/consultations/${id}/treatments`, {
      treatments: treatmentIds.map(tid => ({ treatment_id: tid })),
    });
  },

  complete(id: number | string) {
    return api.post<DentalConsultation>(`/dental/consultations/${id}/complete`, {});
  },

  cancel(id: number | string) {
    return api.post<DentalConsultation>(`/dental/consultations/${id}/cancel`, {});
  },

  createCharge(id: number | string, totalAmount: number) {
    return api.post(`/dental/consultations/${id}/create-charge`, { total_amount: totalAmount });
  },

  listPhotos(id: number | string) {
    return api.get(`/dental/consultations/${id}/photos`);
  },

  uploadPhoto(id: number | string, file: File, stage: 'before' | 'after', caption?: string) {
    const fd = new FormData();
    fd.append('photo', file);
    fd.append('stage', stage);
    if (caption) fd.append('caption', caption);
    return api.post(`/dental/consultations/${id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  deletePhoto(id: number | string, photoId: number | string) {
    return api.delete(`/dental/consultations/${id}/photos/${photoId}`);
  },

  changeStatus(id: number | string, status: string, reason?: string) {
    return api.post(`/dental/consultations/${id}/status`, { status, reason });
  },

  generateTreatmentPlan(consultationId: number | string) {
    return api
      .post<{ generated: number; message: string }>(`/dental/consultations/${consultationId}/generate-treatment-plan`)
      .then(r => r.data);
  },
};
