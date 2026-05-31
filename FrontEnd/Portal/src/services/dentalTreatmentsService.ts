import api from '../utils/axios';
import type { DentalTreatment, DentalTreatmentFormData } from '../types/dental';

export const dentalTreatmentsService = {
  list() {
    return api.get<DentalTreatment[]>('/dental/treatments');
  },

  create(data: DentalTreatmentFormData) {
    return api.post<DentalTreatment>('/dental/treatments', data);
  },

  update(id: number | string, data: Partial<DentalTreatmentFormData>) {
    return api.patch<DentalTreatment>(`/dental/treatments/${id}`, data);
  },

  remove(id: number | string) {
    return api.delete(`/dental/treatments/${id}`);
  },
};
