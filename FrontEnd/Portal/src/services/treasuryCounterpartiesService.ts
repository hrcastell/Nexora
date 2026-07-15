import api from '../utils/axios';
import type { TreasuryCounterparty, TreasuryCounterpartyFormData, TreasuryStatus } from '../types/treasury';

export const treasuryCounterpartiesService = {
  list(params?: { q?: string; type?: string; status?: TreasuryStatus | 'all' }) { return api.get<TreasuryCounterparty[]>('/treasury/counterparties', { params }); },
  create(data: TreasuryCounterpartyFormData) { return api.post<TreasuryCounterparty>('/treasury/counterparties', data); },
  update(id: number, data: TreasuryCounterpartyFormData) { return api.put<TreasuryCounterparty>(`/treasury/counterparties/${id}`, data); },
  toggleStatus(id: number, status: TreasuryStatus) { return api.patch<TreasuryCounterparty>(`/treasury/counterparties/${id}/status`, { status }); },
};
