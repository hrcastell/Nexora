import api from '../utils/axios';
import type { DentalConsultationService, DentalConsultationServiceFormData } from '../types/dental';

export const dentalConsultationServicesService = {
  list(consultationId: number | string) {
    return api.get<{ data: DentalConsultationService[] }>(`/dental/consultations/${consultationId}/services`);
  },
  getTotal(consultationId: number | string) {
    return api.get<{ total: number }>(`/dental/consultations/${consultationId}/services/total`);
  },
  add(consultationId: number | string, data: DentalConsultationServiceFormData) {
    return api.post<DentalConsultationService>(`/dental/consultations/${consultationId}/services`, data);
  },
  update(consultationId: number | string, serviceId: number | string, data: Partial<DentalConsultationServiceFormData>) {
    return api.patch<DentalConsultationService>(`/dental/consultations/${consultationId}/services/${serviceId}`, data);
  },
  void(consultationId: number | string, serviceId: number | string) {
    return api.delete(`/dental/consultations/${consultationId}/services/${serviceId}`);
  },
};
