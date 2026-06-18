import api from '../utils/axios';
import type { DentalConsultationTreatment, DentalConsultationTreatmentFormData } from '../types/dental';

export const dentalConsultationTreatmentsService = {
  list(consultationId: number | string) {
    return api.get<{ data: DentalConsultationTreatment[] }>(`/dental/consultations/${consultationId}/treatments`);
  },
  getTotal(consultationId: number | string) {
    return api.get<{ total: number }>(`/dental/consultations/${consultationId}/treatments/total`);
  },
  add(consultationId: number | string, data: DentalConsultationTreatmentFormData) {
    return api.post<DentalConsultationTreatment>(`/dental/consultations/${consultationId}/treatments`, data);
  },
  update(consultationId: number | string, treatmentId: number | string, data: Partial<DentalConsultationTreatmentFormData>) {
    return api.patch<DentalConsultationTreatment>(`/dental/consultations/${consultationId}/treatments/${treatmentId}`, data);
  },
  void(consultationId: number | string, treatmentId: number | string) {
    return api.delete(`/dental/consultations/${consultationId}/treatments/${treatmentId}`);
  },
};
