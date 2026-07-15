import api from '../utils/axios';
import type { TreasuryDocument, TreasuryDocumentPayload, TreasuryDirection } from '../types/treasuryDocuments';

function resource(direction: TreasuryDirection) { return direction === 'receivable' ? 'receivables' : 'payables'; }
export const treasuryDocumentsService = {
  list(direction: TreasuryDirection, params?: { status?: string; q?: string; counterparty_id?: number }) { return api.get<TreasuryDocument[]>(`/treasury/${resource(direction)}`, { params }); },
  getById(direction: TreasuryDirection, id: number) { return api.get<TreasuryDocument>(`/treasury/${resource(direction)}/${id}`); },
  create(direction: TreasuryDirection, data: TreasuryDocumentPayload) { return api.post<TreasuryDocument>(`/treasury/${resource(direction)}`, data); },
  update(direction: TreasuryDirection, id: number, data: Partial<TreasuryDocumentPayload>) { return api.put<TreasuryDocument>(`/treasury/${resource(direction)}/${id}`, data); },
};
