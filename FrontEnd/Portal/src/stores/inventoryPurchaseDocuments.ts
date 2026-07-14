import { defineStore } from 'pinia';
import { ref } from 'vue';
import { inventoryPurchaseDocumentsService } from '../services/inventoryPurchaseDocumentsService';
import type { PurchaseDocument, PurchaseDocumentFormData, PurchaseDocumentStatus } from '../types/inventoryDocuments';

export const useInventoryPurchaseDocumentsStore = defineStore('inventoryPurchaseDocuments', () => {
  const items = ref<PurchaseDocument[]>([]);
  const current = ref<PurchaseDocument | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load(params?: { status?: string; supplier_id?: number; document_type?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await inventoryPurchaseDocumentsService.list(params);
      items.value = res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar documentos de compra';
    } finally {
      loading.value = false;
    }
  }

  async function loadOne(id: number) {
    loading.value = true;
    error.value = null;
    try {
      const res = await inventoryPurchaseDocumentsService.getById(id);
      current.value = res.data;
      return res.data;
    } finally {
      loading.value = false;
    }
  }

  async function create(data: PurchaseDocumentFormData) {
    const res = await inventoryPurchaseDocumentsService.create(data);
    current.value = res.data;
    return res.data;
  }

  async function update(id: number, data: PurchaseDocumentFormData) {
    const res = await inventoryPurchaseDocumentsService.update(id, data);
    current.value = res.data;
    return res.data;
  }

  async function changeStatus(id: number, status: PurchaseDocumentStatus) {
    const res = await inventoryPurchaseDocumentsService.changeStatus(id, status);
    current.value = res.data;
    await load();
    return res.data;
  }

  return { items, current, loading, error, load, loadOne, create, update, changeStatus };
});
