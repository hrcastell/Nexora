import api from '../utils/axios';
import type { DentalQuote, DentalQuoteItem, DentalQuoteFormData, DentalQuoteItemFormData } from '../types/dental';

const BASE = '/dental/quotes';

export const dentalQuotesService = {
  list(params?: { customer_id?: number; status?: string; page?: number; limit?: number }) {
    return api.get<{ data: DentalQuote[]; total: number }>(BASE, { params });
  },
  getById(id: number) {
    return api.get<{ data: DentalQuote }>(`${BASE}/${id}`);
  },
  create(data: DentalQuoteFormData) {
    return api.post<{ data: DentalQuote }>(BASE, data);
  },
  update(id: number, data: Partial<DentalQuoteFormData>) {
    return api.put<{ data: DentalQuote }>(`${BASE}/${id}`, data);
  },
  send(id: number) {
    return api.post<{ data: DentalQuote }>(`${BASE}/${id}/send`);
  },
  accept(id: number, data: { accepted_by_name: string; acceptance_notes?: string }) {
    return api.post<{ data: DentalQuote }>(`${BASE}/${id}/accept`, data);
  },
  reject(id: number, data: { rejection_reason?: string }) {
    return api.post<{ data: DentalQuote }>(`${BASE}/${id}/reject`, data);
  },
  convertToConsultation(id: number) {
    return api.post<{ data: { quote: DentalQuote; consultation_id: number } }>(`${BASE}/${id}/convert`);
  },
  getPrintData(id: number) {
    return api.get<{ data: { quote: DentalQuote; customer: Record<string, unknown>; items: DentalQuoteItem[]; config: Record<string, unknown> } }>(`${BASE}/${id}/print`);
  },
  getForPatient(customerId: number) {
    return api.get<{ data: DentalQuote[] }>(`/dental/patients/${customerId}/quotes`);
  },
  getForConsultation(consultationId: number) {
    return api.get<{ data: DentalQuote[] }>(`/dental/consultations/${consultationId}/quotes`).then(response => response.data);
  },
  addItem(quoteId: number, item: DentalQuoteItemFormData) {
    return api.post<{ data: DentalQuote }>(`${BASE}/${quoteId}/items`, item);
  },
  updateItem(quoteId: number, itemId: number, item: Partial<DentalQuoteItemFormData>) {
    return api.put<{ data: DentalQuote }>(`${BASE}/${quoteId}/items/${itemId}`, item);
  },
  removeItem(quoteId: number, itemId: number) {
    return api.delete<{ data: DentalQuote }>(`${BASE}/${quoteId}/items/${itemId}`);
  },
};
