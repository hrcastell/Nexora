import api from '../utils/axios';
import type { HrBalance, HrBalanceConfig, HrBalanceMovement } from '../types/hr';
export type HrBalanceSummary = HrBalance[];
export const hrBalancesService = {
  mine: () => api.get<HrBalanceSummary>('/hr/balances/me'),
  byEmployee: (employeeId: number) => api.get<HrBalanceSummary>(`/hr/balances/${employeeId}`),
  update: (employeeId: number, balanceCode: string, data: HrBalanceConfig) => api.put<HrBalanceConfig>(`/hr/balances/${employeeId}/${balanceCode}`, data),
  adjust: (employeeId: number, balanceCode: string, data: { quantity: number; notes?: string }) => api.post<HrBalanceMovement>(`/hr/balances/${employeeId}/${balanceCode}/adjustments`, data),
  movements: (employeeId: number, balanceCode: string, period: 'current' | 'all' = 'current') => api.get<HrBalanceMovement[]>(`/hr/balances/${employeeId}/${balanceCode}/movements`, { params: { period } }),
};
