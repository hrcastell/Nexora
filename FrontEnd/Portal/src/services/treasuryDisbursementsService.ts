import api from '../utils/axios';

export interface TreasuryPaymentApplication { treasury_document_id: number; installment_id?: number; applied_amount: number; }
export interface TreasuryDisbursementPayload { disbursement_number: string; counterparty_id: number; payment_date?: string; cash_session_id?: number | null; payment_method?: string; total_amount: number; }
export interface TreasuryDisbursement { id: number; disbursement_number: string; counterparty_id: number; counterparty_name?: string; payment_date: string; cash_session_id?: number | null; payment_method?: string | null; total_amount: number; applied_amount?: number; status: string; applications?: TreasuryPaymentApplication[]; }

export const treasuryDisbursementsService = {
  list(params?: { status?: string; counterparty_id?: number }) { return api.get<TreasuryDisbursement[]>('/treasury/disbursements', { params }); },
  getById(id: number) { return api.get<TreasuryDisbursement>(`/treasury/disbursements/${id}`); },
  create(data: TreasuryDisbursementPayload) { return api.post<TreasuryDisbursement>('/treasury/disbursements', data); },
  apply(id: number, applications: TreasuryPaymentApplication[]) { return api.post(`/treasury/disbursements/${id}/apply`, { applications }); },
};
