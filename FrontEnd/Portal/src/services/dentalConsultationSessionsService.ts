import api from '../utils/axios';
import type { DentalConsultationSession, DentalConsultationSessionFormData } from '../types/dental';

export const dentalConsultationSessionsService = {
  list(consultationId: number | string) {
    return api.get<{ data: DentalConsultationSession[] }>(`/dental/consultations/${consultationId}/sessions`);
  },
  create(consultationId: number | string, data: DentalConsultationSessionFormData) {
    return api.post<DentalConsultationSession>(`/dental/consultations/${consultationId}/sessions`, data);
  },
  getById(consultationId: number | string, sessionId: number | string) {
    return api.get<DentalConsultationSession>(`/dental/consultations/${consultationId}/sessions/${sessionId}`);
  },
  update(consultationId: number | string, sessionId: number | string, data: Partial<DentalConsultationSessionFormData & { status?: string }>) {
    return api.patch<DentalConsultationSession>(`/dental/consultations/${consultationId}/sessions/${sessionId}`, data);
  },
  complete(consultationId: number | string, sessionId: number | string) {
    return api.post<DentalConsultationSession>(`/dental/consultations/${consultationId}/sessions/${sessionId}/complete`, {});
  },
  cancel(consultationId: number | string, sessionId: number | string) {
    return api.post<DentalConsultationSession>(`/dental/consultations/${consultationId}/sessions/${sessionId}/cancel`, {});
  },
};
