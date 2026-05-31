import api from '../utils/axios';
import type { DentalCharge, DentalPayment, DentalInstallment } from '../types/dental';

export const dentalChargesService = {
  list(params?: { status?: string; customer_id?: number | string; from?: string; to?: string }) {
    return api.get<DentalCharge[]>('/dental/charges', { params });
  },

  create(data: Partial<DentalCharge>) {
    return api.post<DentalCharge>('/dental/charges', data);
  },

  getById(id: number | string) {
    return api.get<DentalCharge>(`/dental/charges/${id}`);
  },

  registerPayment(id: number | string, data: { amount: number; payment_method: string; payment_date: string; reference?: string; notes?: string }) {
    return api.post<DentalPayment>(`/dental/charges/${id}/payments`, data);
  },

  createInstallmentPlan(id: number | string, data: { installments_count: number; first_due_date: string }) {
    return api.post<DentalInstallment[]>(`/dental/charges/${id}/installments`, data);
  },

  getOverdueInstallments() {
    return api.get<DentalInstallment[]>('/dental/installments/overdue');
  },

  payInstallment(id: number | string, data: { amount: number; payment_method: string; payment_date: string }) {
    return api.post<DentalInstallment>(`/dental/installments/${id}/pay`, data);
  },

  listPayments() {
    return api.get<DentalPayment[]>('/dental/payments');
  },

  getFinanceSummary() {
    return api.get('/dental/finance/summary');
  },
};
