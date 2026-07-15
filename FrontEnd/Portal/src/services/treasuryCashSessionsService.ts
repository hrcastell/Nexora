import api from '../utils/axios';
import type { TreasuryCashMovement, TreasuryCashMovementData, TreasuryCashSession, TreasuryOpenCashSessionData } from '../types/treasury';

export const treasuryCashSessionsService = {
  list(params?: { status?: 'open' | 'closed' }) { return api.get<TreasuryCashSession[]>('/treasury/cash-sessions', { params }); },
  getById(id: number) { return api.get<TreasuryCashSession>(`/treasury/cash-sessions/${id}`); },
  open(data: TreasuryOpenCashSessionData) { return api.post<TreasuryCashSession>('/treasury/cash-sessions/open', data); },
  close(id: number, counted_amount: number) { return api.post<TreasuryCashSession>(`/treasury/cash-sessions/${id}/close`, { counted_amount }); },
  recordMovement(data: TreasuryCashMovementData) { return api.post<TreasuryCashMovement>('/treasury/cash-sessions/movements', data); },
};
