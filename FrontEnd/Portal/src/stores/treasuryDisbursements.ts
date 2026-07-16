import { defineStore } from 'pinia';
import { ref } from 'vue';
import { treasuryDisbursementsService, type TreasuryDisbursement, type TreasuryDisbursementPayload, type TreasuryPaymentApplication } from '../services/treasuryDisbursementsService';
export const useTreasuryDisbursementsStore = defineStore('treasuryDisbursements', () => {
  const items = ref<TreasuryDisbursement[]>([]); const current = ref<TreasuryDisbursement | null>(null); const loading = ref(false); const saving = ref(false); const error = ref<string | null>(null);
  async function load(params?: { status?: string; counterparty_id?: number }) { loading.value = true; error.value = null; try { items.value = (await treasuryDisbursementsService.list(params)).data; } catch (cause: any) { error.value = cause?.response?.data?.error || 'No fue posible cargar los pagos emitidos'; } finally { loading.value = false; } }
  async function select(id: number) { current.value = (await treasuryDisbursementsService.getById(id)).data; return current.value; }
  async function create(data: TreasuryDisbursementPayload) { saving.value = true; try { current.value = (await treasuryDisbursementsService.create(data)).data; await load(); return current.value; } finally { saving.value = false; } }
  async function apply(id: number, applications: TreasuryPaymentApplication[]) { saving.value = true; try { await treasuryDisbursementsService.apply(id, applications); await Promise.all([load(), select(id)]); } finally { saving.value = false; } }
  return { items, current, loading, saving, error, load, select, create, apply };
});
