import { defineStore } from 'pinia';
import { ref } from 'vue';
import { inventoryReceiptsService } from '../services/inventoryReceiptsService';
import type { StockReceipt, StockReceiptFormData, StockReceiptLine } from '../types/inventoryDocuments';

export const useInventoryReceiptsStore = defineStore('inventoryReceipts', () => {
  const items = ref<StockReceipt[]>([]);
  const current = ref<StockReceipt | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const res = await inventoryReceiptsService.list();
      items.value = res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar recepciones';
    } finally {
      loading.value = false;
    }
  }

  async function loadOne(id: number) {
    loading.value = true;
    try {
      const res = await inventoryReceiptsService.getById(id);
      current.value = res.data;
      return res.data;
    } finally {
      loading.value = false;
    }
  }

  async function create(data: StockReceiptFormData) {
    const res = await inventoryReceiptsService.create(data);
    current.value = res.data;
    return res.data;
  }

  async function confirm(id: number, lines: StockReceiptLine[]) {
    const res = await inventoryReceiptsService.confirm(id, lines);
    await loadOne(id);
    return res.data;
  }

  return { items, current, loading, error, load, loadOne, create, confirm };
});
