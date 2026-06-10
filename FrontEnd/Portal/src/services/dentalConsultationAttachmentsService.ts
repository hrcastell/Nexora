import axios from 'axios';
import type { DentalConsultationAttachment } from '../types/dental';

const BASE = '/dental/consultations';

export const dentalConsultationAttachmentsService = {
  list(consultationId: number) {
    return axios.get<{ data: DentalConsultationAttachment[] }>(`${BASE}/${consultationId}/attachments`);
  },
  upload(consultationId: number, file: File, category: string, description?: string) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', category);
    if (description) fd.append('description', description);
    return axios.post<{ data: DentalConsultationAttachment }>(`${BASE}/${consultationId}/attachments`, fd);
  },
  remove(consultationId: number, attachmentId: number) {
    return axios.delete(`${BASE}/${consultationId}/attachments/${attachmentId}`);
  },
};
