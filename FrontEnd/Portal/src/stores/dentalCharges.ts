import { defineStore } from 'pinia';
import { ref } from 'vue';
import { dentalChargesService } from '../services/dentalChargesService';
import type { DentalCharge, DentalPayment, DentalInstallment } from '../types/dental';

export const useDentalChargesStore = defineStore('dentalCharges', () => {
  const items        = ref<DentalCharge[]>([]);
  const current      = ref<DentalCharge | null>(null);
  const payments     = ref<DentalPayment[]>([]);
  const installments = ref<DentalInstallment[]>([]);
  const loading      = ref(false);
  const error        = ref<string | null>(null);

  const financeSummary = ref<{
    daily_total: number;
    monthly_total: number;
    total_pending: number;
    overdue_count: number;
  } | null>(null);

  function unwrapData<T>(payload: T | { data: T }): T {
    return payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload as T;
  }

  async function load(params?: { status?: string; customer_id?: number | string; from?: string; to?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalChargesService.list(params);
      items.value = unwrapData<DentalCharge[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar cargos';
    } finally {
      loading.value = false;
    }
  }

  async function loadOne(id: number | string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalChargesService.getById(id);
      current.value = unwrapData<DentalCharge>(res.data);
      return current.value;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar cargo';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadFinanceSummary() {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalChargesService.getFinanceSummary();
      financeSummary.value = unwrapData<typeof financeSummary.value>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar resumen financiero';
    } finally {
      loading.value = false;
    }
  }

  async function registerPayment(id: number | string, data: { amount: number; payment_method: string; payment_date: string; reference?: string; notes?: string }) {
    const res = await dentalChargesService.registerPayment(id, data);
    const payment = unwrapData<DentalPayment>(res.data);
    payments.value.unshift(payment);
    // Reload the charge to get updated totals
    await loadOne(id);
    return payment;
  }

  async function createInstallmentPlan(id: number | string, data: { installments_count: number; first_due_date: string }) {
    const res = await dentalChargesService.createInstallmentPlan(id, data);
    const result = unwrapData<DentalInstallment[]>(res.data);
    installments.value = result;
    return result;
  }

  async function payInstallment(id: number | string, data: { amount: number; payment_method: string; payment_date: string }) {
    const res = await dentalChargesService.payInstallment(id, data);
    const updated = unwrapData<DentalInstallment>(res.data);
    const idx = installments.value.findIndex(i => i.id === id);
    if (idx !== -1) Object.assign(installments.value[idx], updated);
    return updated;
  }

  function reset() {
    items.value = [];
    current.value = null;
    payments.value = [];
    installments.value = [];
    financeSummary.value = null;
    error.value = null;
  }

  return { items, current, payments, installments, financeSummary, loading, error, load, loadOne, loadFinanceSummary, registerPayment, createInstallmentPlan, payInstallment, reset };
});
