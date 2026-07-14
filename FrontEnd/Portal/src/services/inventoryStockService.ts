import api from '../utils/axios';
import type { StockRow } from '../types/inventoryDocuments';

export const inventoryStockService = {
  byProduct(params?: { product_id?: number }) {
    return api.get<StockRow[]>('/inventory/stock-by-product', { params });
  },

  byWarehouse(params?: { warehouse_id?: number }) {
    return api.get<StockRow[]>('/inventory/stock-by-warehouse', { params });
  },
};
