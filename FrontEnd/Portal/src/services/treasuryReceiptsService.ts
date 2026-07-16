import api from '../utils/axios';

export interface TreasuryPaymentApplication { treasury_document_id: number; installment_id?: number; applied_amount: number; }
export interface TreasuryReceiptPayload { receipt_number: string; counterparty_id: number; receipt_date?: string; cash_session_id?: number | null; payment_method?: string; total_amount: number; }
export interface TreasuryReceipt { id: number; receipt_number: string; counterparty_id: number; counterparty_name?: string; receipt_date: string; cash_session_id?: number | null; payment_method?: string | null; total_amount: number; applied_amount?: number; status: string; applications?: TreasuryPaymentApplication[]; }

export const treasuryReceiptsService = {
  list(params?: { status?: string; counterparty_id?: number }) { return api.get<TreasuryReceipt[]>('/treasury/receipts', { params }); },
  getById(id: number) { return api.get<TreasuryReceipt>(`/treasury/receipts/${id}`); },
  create(data: TreasuryReceiptPayload) { return api.post<TreasuryReceipt>('/treasury/receipts', data); },
  apply(id: number, applications: TreasuryPaymentApplication[]) { return api.post(`/treasury/receipts/${id}/apply`, { applications }); },
};
