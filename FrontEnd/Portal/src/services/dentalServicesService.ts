import api from '../utils/axios';
import type { DentalTreatment, DentalTreatmentFormData } from '../types/dental';

// This file is kept for backward compatibility.
// It now delegates to the /dental/treatments endpoint.
// Prefer importing from dentalTreatmentsService.ts for new code.

export const dentalServicesService = {
  list() {
    return api.get<DentalTreatment[]>('/dental/treatments');
  },

  create(data: DentalTreatmentFormData) {
    return api.post<DentalTreatment>('/dental/treatments', data);
  },

  getById(id: number | string) {
    return api.get<DentalTreatment>(`/dental/treatments/${id}`);
  },

  update(id: number | string, data: Partial<DentalTreatmentFormData>) {
    return api.patch<DentalTreatment>(`/dental/treatments/${id}`, data);
  },

  remove(id: number | string) {
    return api.delete(`/dental/treatments/${id}`);
  },

  // assignTreatments removed — the new treatments entity is standalone (no sub-components)
};
