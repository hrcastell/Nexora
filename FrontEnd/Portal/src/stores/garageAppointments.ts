import { defineStore } from 'pinia';
import { ref } from 'vue';
import { garageAppointmentsService } from '../services/garageAppointmentsService';
import type { Appointment } from '../types/garage';

export const useGarageAppointmentsStore = defineStore('garageAppointments', () => {
  const items   = ref<Appointment[]>([]);
  const current = ref<Appointment | null>(null);
  const total   = ref(0);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  async function load(params?: {
    status?: string; date_from?: string; date_to?: string;
    customer_id?: number; employee_id?: number; page?: number; limit?: number;
  }) {
    loading.value = true; error.value = null;
    try {
      const res = await garageAppointmentsService.list(params);
      items.value = res.data.data;
      total.value = res.data.total;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar citas';
    } finally { loading.value = false; }
  }

  async function loadOne(id: number) {
    error.value = null;
    try {
      const res = await garageAppointmentsService.getById(id);
      current.value = res.data;
      return res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar cita';
      throw e;
    }
  }

  async function create(data: Parameters<typeof garageAppointmentsService.create>[0]) {
    const res = await garageAppointmentsService.create(data);
    items.value.unshift(res.data);
    total.value++;
    return res.data;
  }

  async function update(id: number, data: Partial<Appointment>) {
    const res = await garageAppointmentsService.update(id, data);
    const idx = items.value.findIndex(a => a.id === id);
    if (idx !== -1) Object.assign(items.value[idx], res.data);
    if (current.value?.id === id) current.value = res.data;
    return res.data;
  }

  function updateStatus(id: number, status: string) {
    const idx = items.value.findIndex(a => a.id === id);
    if (idx !== -1) items.value[idx].status = status as Appointment['status'];
    if (current.value?.id === id) current.value.status = status as Appointment['status'];
  }

  async function confirm(id: number, notes?: string) {
    const res = await garageAppointmentsService.confirm(id, notes);
    updateStatus(id, 'confirmed');
    return res.data;
  }

  async function markArrived(id: number, notes?: string) {
    const res = await garageAppointmentsService.markArrived(id, notes);
    updateStatus(id, 'arrived');
    return res.data;
  }

  async function cancel(id: number, notes?: string) {
    const res = await garageAppointmentsService.cancel(id, notes);
    updateStatus(id, 'cancelled');
    return res.data;
  }

  async function markNoShow(id: number, notes?: string) {
    const res = await garageAppointmentsService.markNoShow(id, notes);
    updateStatus(id, 'no_show');
    return res.data;
  }

  async function reschedule(id: number, data: { new_start: string; new_end?: string; reason?: string }) {
    const res = await garageAppointmentsService.reschedule(id, data);
    updateStatus(id, 'rescheduled');
    return res.data;
  }

  async function convertToWorkOrder(id: number, data?: { mileage_in?: number; reception_notes?: string; fuel_level?: string; vehicle_condition_notes?: string }) {
    const res = await garageAppointmentsService.convertToWorkOrder(id, data);
    updateStatus(id, 'converted_to_work_order');
    return res.data;
  }

  function reset() {
    items.value = []; current.value = null; total.value = 0; error.value = null;
  }

  return { items, current, total, loading, error, load, loadOne, create, update, confirm, markArrived, cancel, markNoShow, reschedule, convertToWorkOrder, reset };
});
