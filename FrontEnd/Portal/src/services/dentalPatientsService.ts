import api from '../utils/axios';
import type { DentalPatient, DentalPatientFormData, DentalClinicalHistoryEntry, DentalConsultation, DentalPayment, DentalCharge, DentalMedicalHistory } from '../types/dental';

export const dentalPatientsService = {
  list(params?: { search?: string; limit?: number; offset?: number }) {
    return api.get<DentalPatient[]>('/dental/patients', { params });
  },

  create(data: DentalPatientFormData) {
    return api.post<DentalPatient>('/dental/patients', data);
  },

  getById(id: number | string) {
    return api.get<DentalPatient>(`/dental/patients/${id}`);
  },

  update(id: number | string, data: Partial<DentalPatientFormData>) {
    return api.patch<DentalPatient>(`/dental/patients/${id}`, data);
  },

  getClinicalHistory(id: number | string) {
    return api.get<DentalClinicalHistoryEntry[]>(`/dental/patients/${id}/clinical-history`);
  },

  getConsultations(id: number | string) {
    return api.get<DentalConsultation[]>(`/dental/patients/${id}/consultations`);
  },

  getPayments(id: number | string) {
    return api.get<DentalPayment[]>(`/dental/patients/${id}/payments`);
  },

  getDebt(id: number | string) {
    return api.get<DentalCharge[]>(`/dental/patients/${id}/debt`);
  },

  getMedicalHistory(patientId: number | string) {
    return api.get<{ data: DentalMedicalHistory[] }>(`/dental/patients/${patientId}/medical-history`);
  },

  createMedicalHistory(patientId: number | string, data: Partial<DentalMedicalHistory>) {
    return api.post<{ data: DentalMedicalHistory }>(`/dental/patients/${patientId}/medical-history`, data);
  },

  uploadPhoto(id: number | string, file: File): Promise<{ photo_url: string }> {
    const form = new FormData();
    form.append('photo', file);
    return api.post(`/dental/patients/${id}/photo`, form).then(r => r.data);
  },

  deletePhoto(id: number | string): Promise<void> {
    return api.delete(`/dental/patients/${id}/photo`);
  },
};
