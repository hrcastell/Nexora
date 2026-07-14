import { defineStore } from 'pinia';
import { ref } from 'vue';
import { inventoryStockService } from '../services/inventoryStockService';
import type { StockRow } from '../types/inventoryDocuments';

export const useInventoryStockStore = defineStore('inventoryStock', () => {
  const rows = ref<StockRow[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadByProduct(productId?: number) {
    loading.value = true;
    error.value = null;
    try {
      const res = await inventoryStockService.byProduct({ product_id: productId });
      rows.value = res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al consultar stock';
    } finally {
      loading.value = false;
    }
  }

  async function loadByWarehouse(warehouseId?: number) {
    loading.value = true;
    error.value = null;
    try {
      const res = await inventoryStockService.byWarehouse({ warehouse_id: warehouseId });
      rows.value = res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al consultar stock';
    } finally {
      loading.value = false;
    }
  }

  return { rows, loading, error, loadByProduct, loadByWarehouse };
});
