import { defineStore } from 'pinia';
import { ref } from 'vue';
import { financialTransactionsService } from '../services/financialTransactionsService';
import type { FinancialTransaction, FinancialTransactionFormData, TransactionType } from '../types/financial';

export const useFinancialTransactionsStore = defineStore('financialTransactions', () => {
  const items   = ref<FinancialTransaction[]>([]);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  function unwrapData<T>(payload: T | { data: T }): T {
    return payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload as T;
  }

  async function loadByPeriod(periodId: number, params?: { type?: TransactionType; category_id?: number; page?: number; limit?: number }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await financialTransactionsService.listByPeriod(periodId, params);
      items.value = unwrapData<FinancialTransaction[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar transacciones';
    } finally {
      loading.value = false;
    }
  }

  async function create(periodId: number, data: FinancialTransactionFormData) {
    const res = await financialTransactionsService.create(periodId, data);
    const transaction = unwrapData<FinancialTransaction>(res.data);
    items.value.unshift(transaction);
    return transaction;
  }

  async function update(transactionId: number, data: Partial<FinancialTransactionFormData>) {
    const res = await financialTransactionsService.update(transactionId, data);
    const transaction = unwrapData<FinancialTransaction>(res.data);
    const idx = items.value.findIndex(t => t.id === transactionId);
    if (idx !== -1) Object.assign(items.value[idx], transaction);
    return transaction;
  }

  async function remove(transactionId: number) {
    await financialTransactionsService.remove(transactionId);
    items.value = items.value.filter(t => t.id !== transactionId);
  }

  function reset() {
    items.value = [];
    error.value = null;
  }

  return { items, loading, error, loadByPeriod, create, update, remove, reset };
});
