import api from '../utils/axios';
import type { PurchaseDocument, PurchaseDocumentFormData, PurchaseDocumentStatus } from '../types/inventoryDocuments';

export const inventoryPurchaseDocumentsService = {
  list(params?: { status?: string; supplier_id?: number; document_type?: string }) {
    return api.get<PurchaseDocument[]>('/inventory/purchase-documents', { params });
  },

  getById(id: number) {
    return api.get<PurchaseDocument>(`/inventory/purchase-documents/${id}`);
  },

  create(data: PurchaseDocumentFormData) {
    return api.post<PurchaseDocument>('/inventory/purchase-documents', data);
  },

  update(id: number, data: PurchaseDocumentFormData) {
    return api.put<PurchaseDocument>(`/inventory/purchase-documents/${id}`, data);
  },

  changeStatus(id: number, status: PurchaseDocumentStatus) {
    return api.patch<PurchaseDocument>(`/inventory/purchase-documents/${id}/status`, { status });
  },
};
