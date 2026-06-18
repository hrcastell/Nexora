import api from '../utils/axios';
import type { DentalMedicalDocument, DentalMedicalDocumentFormData } from '../types/dental';

export const dentalMedicalDocumentsService = {
  list: (params?: object) =>
    api.get<{ data: DentalMedicalDocument[]; total: number; page: number; limit: number }>(
      '/dental/medical-documents',
      { params }
    ),

  getById: (id: number) =>
    api.get<{ data: DentalMedicalDocument }>(`/dental/medical-documents/${id}`),

  create: (data: DentalMedicalDocumentFormData) =>
    api.post<{ data: DentalMedicalDocument }>('/dental/medical-documents', data),

  update: (id: number, data: Partial<DentalMedicalDocumentFormData>) =>
    api.patch<{ data: DentalMedicalDocument }>(`/dental/medical-documents/${id}`, data),

  remove: (id: number) =>
    api.delete(`/dental/medical-documents/${id}`),

  getPrintData: (id: number) =>
    api.get<{ data: { document: DentalMedicalDocument; patient: Record<string, unknown>; config: Record<string, unknown> } }>(
      `/dental/medical-documents/${id}/print`
    ),

  getForPatient: (customerId: number) =>
    api.get<{ data: DentalMedicalDocument[] }>(`/dental/patients/${customerId}/medical-documents`),

  getForConsultation: (consultationId: number) =>
    api.get<{ data: DentalMedicalDocument[] }>(`/dental/consultations/${consultationId}/medical-documents`),
};
