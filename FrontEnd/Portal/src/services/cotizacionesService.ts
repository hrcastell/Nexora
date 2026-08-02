import api from '../utils/axios';
import type {
  Quote,
  QuoteDetail,
  QuoteFormData,
  QuoteLine,
  QuoteLineFormData,
  QuoteAcceptPayload,
  QuoteRejectPayload,
} from '../types/cotizaciones';

// Mounted at /api/cotizaciones — see BackEnd/routes/cotizaciones/cotizacionesRoutes.js.
// `paid` and `converted` have NO direct endpoint here by design: they only
// happen via the Treasury settle hook and the Inventory stock-receipt
// confirm hook respectively (no direct-to-customer bypass).
export const cotizacionesService = {
  list(params?: { status?: string; customer_id?: number }) {
    return api.get<Quote[]>('/cotizaciones/quotes', { params });
  },

  getById(id: number) {
    return api.get<QuoteDetail>(`/cotizaciones/quotes/${id}`);
  },

  getPrintData(id: number) {
    return api.get<{ data: { quote: Quote; lines: QuoteLine[]; customer: Record<string, unknown>; config: Record<string, unknown> } }>(`/cotizaciones/quotes/${id}/print`);
  },

  create(data: QuoteFormData) {
    return api.post<Quote>('/cotizaciones/quotes', data);
  },

  update(id: number, data: QuoteFormData) {
    return api.put<Quote>(`/cotizaciones/quotes/${id}`, data);
  },

  addLine(id: number, data: QuoteLineFormData) {
    return api.post<QuoteLine>(`/cotizaciones/quotes/${id}/lines`, data);
  },

  updateLine(id: number, lineId: number, data: QuoteLineFormData) {
    return api.put<QuoteLine>(`/cotizaciones/quotes/${id}/lines/${lineId}`, data);
  },

  deleteLine(id: number, lineId: number) {
    return api.delete<{ id: number; deleted: boolean }>(`/cotizaciones/quotes/${id}/lines/${lineId}`);
  },

  send(id: number) {
    return api.post<Quote>(`/cotizaciones/quotes/${id}/send`);
  },

  accept(id: number, data: QuoteAcceptPayload) {
    return api.post<Quote>(`/cotizaciones/quotes/${id}/accept`, data);
  },

  reject(id: number, data?: QuoteRejectPayload) {
    return api.post<Quote>(`/cotizaciones/quotes/${id}/reject`, data);
  },

  revertToDraft(id: number) {
    return api.post<Quote>(`/cotizaciones/quotes/${id}/draft`);
  },

  expire(id: number) {
    return api.post<Quote>(`/cotizaciones/quotes/${id}/expire`);
  },
};
