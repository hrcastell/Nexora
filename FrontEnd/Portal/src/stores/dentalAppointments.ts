import { defineStore } from 'pinia';
import { ref } from 'vue';
import { dentalAppointmentsService } from '../services/dentalAppointmentsService';
import type { DentalAppointment, DentalAppointmentFormData } from '../types/dental';

export const useDentalAppointmentsStore = defineStore('dentalAppointments', () => {
  const items   = ref<DentalAppointment[]>([]);
  const today   = ref<DentalAppointment[]>([]);
  const current = ref<DentalAppointment | null>(null);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  function unwrapData<T>(payload: T | { data: T }): T {
    return payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload as T;
  }

  async function load(params?: { status?: string; customer_id?: number | string; from?: string; to?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalAppointmentsService.list(params);
      items.value = unwrapData<DentalAppointment[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar citas';
    } finally {
      loading.value = false;
    }
  }

  async function loadToday() {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalAppointmentsService.getDay();
      today.value = unwrapData<DentalAppointment[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar citas de hoy';
    } finally {
      loading.value = false;
    }
  }

  async function loadMonth(year?: number, month?: number) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalAppointmentsService.getMonth(year, month);
      items.value = unwrapData<DentalAppointment[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar citas del mes';
    } finally {
      loading.value = false;
    }
  }

  async function create(data: DentalAppointmentFormData) {
    const res = await dentalAppointmentsService.create(data);
    const appointment = unwrapData<DentalAppointment>(res.data);
    items.value.unshift(appointment);
    return appointment;
  }

  async function update(id: number | string, data: Partial<DentalAppointmentFormData>) {
    const res = await dentalAppointmentsService.update(id, data);
    const updated = unwrapData<DentalAppointment>(res.data);
    const idx = items.value.findIndex(a => a.id === id);
    if (idx !== -1) Object.assign(items.value[idx], updated);
    return updated;
  }

  async function confirm(id: number | string) {
    const res = await dentalAppointmentsService.confirm(id);
    const updated = unwrapData<DentalAppointment>(res.data);
    const idx = items.value.findIndex(a => a.id === id);
    if (idx !== -1) Object.assign(items.value[idx], updated);
    return updated;
  }

  async function cancel(id: number | string) {
    const res = await dentalAppointmentsService.cancel(id);
    const updated = unwrapData<DentalAppointment>(res.data);
    const idx = items.value.findIndex(a => a.id === id);
    if (idx !== -1) Object.assign(items.value[idx], updated);
    return updated;
  }

  async function noShow(id: number | string) {
    const res = await dentalAppointmentsService.noShow(id);
    const updated = unwrapData<DentalAppointment>(res.data);
    const idx = items.value.findIndex(a => a.id === id);
    if (idx !== -1) Object.assign(items.value[idx], updated);
    return updated;
  }

  async function convertToConsultation(id: number | string) {
    const res = await dentalAppointmentsService.convertToConsultation(id);
    return unwrapData<any>(res.data);
  }

  function reset() {
    items.value = [];
    today.value = [];
    current.value = null;
    error.value = null;
  }

  return { items, today, current, loading, error, load, loadToday, loadMonth, create, update, confirm, cancel, noShow, convertToConsultation, reset };
});
