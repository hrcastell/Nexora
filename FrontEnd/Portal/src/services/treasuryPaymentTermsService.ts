import api from '../utils/axios';
import type { TreasuryPaymentTerm, TreasuryPaymentTermFormData, TreasuryStatus } from '../types/treasury';

export const treasuryPaymentTermsService = {
  list(params?: { q?: string; status?: TreasuryStatus | 'all' }) { return api.get<TreasuryPaymentTerm[]>('/treasury/payment-terms', { params }); },
  create(data: TreasuryPaymentTermFormData) { return api.post<TreasuryPaymentTerm>('/treasury/payment-terms', data); },
  update(id: number, data: TreasuryPaymentTermFormData) { return api.put<TreasuryPaymentTerm>(`/treasury/payment-terms/${id}`, data); },
  toggleStatus(id: number, status: TreasuryStatus) { return api.patch<TreasuryPaymentTerm>(`/treasury/payment-terms/${id}/status`, { status }); },
};
