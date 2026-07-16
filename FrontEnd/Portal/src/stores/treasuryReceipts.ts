import { defineStore } from 'pinia';
import { ref } from 'vue';
import { treasuryReceiptsService, type TreasuryPaymentApplication, type TreasuryReceipt, type TreasuryReceiptPayload } from '../services/treasuryReceiptsService';
export const useTreasuryReceiptsStore = defineStore('treasuryReceipts', () => {
  const items = ref<TreasuryReceipt[]>([]); const current = ref<TreasuryReceipt | null>(null); const loading = ref(false); const saving = ref(false); const error = ref<string | null>(null);
  async function load(params?: { status?: string; counterparty_id?: number }) { loading.value = true; error.value = null; try { items.value = (await treasuryReceiptsService.list(params)).data; } catch (cause: any) { error.value = cause?.response?.data?.error || 'No fue posible cargar los recibos'; } finally { loading.value = false; } }
  async function select(id: number) { current.value = (await treasuryReceiptsService.getById(id)).data; return current.value; }
  async function create(data: TreasuryReceiptPayload) { saving.value = true; try { current.value = (await treasuryReceiptsService.create(data)).data; await load(); return current.value; } finally { saving.value = false; } }
  async function apply(id: number, applications: TreasuryPaymentApplication[]) { saving.value = true; try { await treasuryReceiptsService.apply(id, applications); await Promise.all([load(), select(id)]); } finally { saving.value = false; } }
  return { items, current, loading, saving, error, load, select, create, apply };
});
