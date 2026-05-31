import api from '../utils/axios';
import type { DentalService, DentalServiceFormData, DentalServiceTreatment } from '../types/dental';

export const dentalServicesService = {
  list() {
    return api.get<DentalService[]>('/dental/services');
  },

  create(data: DentalServiceFormData) {
    return api.post<DentalService>('/dental/services', data);
  },

  getById(id: number | string) {
    return api.get<DentalService>(`/dental/services/${id}`);
  },

  update(id: number | string, data: Partial<DentalServiceFormData>) {
    return api.patch<DentalService>(`/dental/services/${id}`, data);
  },

  remove(id: number | string) {
    return api.delete(`/dental/services/${id}`);
  },

  assignTreatments(id: number | string, treatments: DentalServiceTreatment[]) {
    return api.post<DentalService>(`/dental/services/${id}/treatments`, { treatments });
  },
};
