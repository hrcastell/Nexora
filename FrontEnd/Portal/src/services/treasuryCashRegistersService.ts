import api from '../utils/axios';
import type { TreasuryCashRegister, TreasuryCashRegisterFormData, TreasuryStatus } from '../types/treasury';

export const treasuryCashRegistersService = {
  list(params?: { q?: string; status?: TreasuryStatus | 'all' }) { return api.get<TreasuryCashRegister[]>('/treasury/cash-registers', { params }); },
  create(data: TreasuryCashRegisterFormData) { return api.post<TreasuryCashRegister>('/treasury/cash-registers', data); },
  update(id: number, data: TreasuryCashRegisterFormData) { return api.put<TreasuryCashRegister>(`/treasury/cash-registers/${id}`, data); },
  toggleStatus(id: number, status: TreasuryStatus) { return api.patch<TreasuryCashRegister>(`/treasury/cash-registers/${id}/status`, { status }); },
};
