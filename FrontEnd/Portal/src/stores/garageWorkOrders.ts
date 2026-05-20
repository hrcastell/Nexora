import { defineStore } from 'pinia';
import { ref } from 'vue';
import { garageWorkOrdersService } from '../services/garageWorkOrdersService';
import type { WorkOrder } from '../types/garage';

export const useGarageWorkOrdersStore = defineStore('garageWorkOrders', () => {
  const items   = ref<WorkOrder[]>([]);
  const current = ref<WorkOrder | null>(null);
  const total   = ref(0);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  async function load(params?: {
    status?: string; priority?: string; employee_id?: number;
    customer_id?: number; q?: string; date_from?: string; date_to?: string;
    page?: number; limit?: number;
  }) {
    loading.value = true; error.value = null;
    try {
      const res = await garageWorkOrdersService.list(params);
      items.value = res.data.data;
      total.value = res.data.total;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar órdenes';
    } finally { loading.value = false; }
  }

  async function loadOne(id: number) {
    loading.value = true; error.value = null;
    try {
      const res = await garageWorkOrdersService.getById(id);
      current.value = res.data;
      return res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar orden';
      throw e;
    } finally { loading.value = false; }
  }

  async function create(data: Partial<WorkOrder>) {
    const res = await garageWorkOrdersService.create(data);
    items.value.unshift(res.data);
    total.value++;
    return res.data;
  }

  async function update(id: number, data: Partial<WorkOrder>) {
    const res = await garageWorkOrdersService.update(id, data);
    const idx = items.value.findIndex(w => w.id === id);
    if (idx !== -1) Object.assign(items.value[idx], res.data);
    if (current.value?.id === id) current.value = res.data;
    return res.data;
  }

  function patchStatus(id: number, status: WorkOrder['status']) {
    const idx = items.value.findIndex(w => w.id === id);
    if (idx !== -1) items.value[idx].status = status;
    if (current.value?.id === id) current.value.status = status;
  }

  async function changeStatus(id: number, status: string, notes?: string) {
    const res = await garageWorkOrdersService.changeStatus(id, status, notes);
    patchStatus(id, status as WorkOrder['status']);
    if (current.value?.id === id) await loadOne(id);
    return res.data;
  }

  async function assign(id: number, data: { assigned_employee_id?: number; assigned_user_id?: number }) {
    const res = await garageWorkOrdersService.assign(id, data);
    if (current.value?.id === id) Object.assign(current.value, res.data);
    return res.data;
  }

  async function recalculate(id: number) {
    const res = await garageWorkOrdersService.recalculate(id);
    if (current.value?.id === id) {
      current.value.subtotal_labor    = res.data.subtotal_labor;
      current.value.subtotal_products = res.data.subtotal_products;
      current.value.total_amount      = res.data.total_amount;
    }
    return res.data;
  }

  async function close(id: number, data?: { mileage_out?: number; customer_notes?: string; internal_notes?: string; notes?: string }) {
    const res = await garageWorkOrdersService.close(id, data);
    patchStatus(id, 'completed');
    if (current.value?.id === id) await loadOne(id);
    return res.data;
  }

  async function cancel(id: number, notes?: string) {
    const res = await garageWorkOrdersService.cancel(id, notes);
    patchStatus(id, 'cancelled');
    return res.data;
  }

  async function addService(orderId: number, data: Parameters<typeof garageWorkOrdersService.addService>[1]) {
    const res = await garageWorkOrdersService.addService(orderId, data);
    if (current.value?.id === orderId) {
      current.value.services = current.value.services || [];
      current.value.services.push(res.data);
      await recalculate(orderId);
    }
    return res.data;
  }

  async function removeService(orderId: number, serviceId: number) {
    await garageWorkOrdersService.removeService(orderId, serviceId);
    if (current.value?.id === orderId && current.value.services) {
      current.value.services = current.value.services.filter(s => s.id !== serviceId);
      await recalculate(orderId);
    }
  }

  function reset() {
    items.value = []; current.value = null; total.value = 0; error.value = null;
  }

  return {
    items, current, total, loading, error,
    load, loadOne, create, update, changeStatus, assign, recalculate, close, cancel,
    addService, removeService, reset
  };
});
