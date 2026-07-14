import api from '../utils/axios';
import type { StockReceipt, StockReceiptFormData, StockReceiptLine } from '../types/inventoryDocuments';

export const inventoryReceiptsService = {
  list() {
    return api.get<StockReceipt[]>('/inventory/stock-receipts');
  },

  getById(id: number) {
    return api.get<StockReceipt>(`/inventory/stock-receipts/${id}`);
  },

  create(data: StockReceiptFormData) {
    return api.post<StockReceipt>('/inventory/stock-receipts', data);
  },

  confirm(id: number, lines: StockReceiptLine[]) {
    return api.post<{ id: number; status: string }>(`/inventory/stock-receipts/${id}/confirm`, { lines });
  },
};
