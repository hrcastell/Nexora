import { defineStore } from 'pinia';
import { ref } from 'vue';
import { dentalAppointmentsService } from '../services/dentalAppointmentsService';
import type { DentalAppointment, DentalAppointmentFormData } from '../types/dental';

type RawDentalAppointment = DentalAppointment & {
  patient_name?: string;
  patient_phone?: string;
  patient_mobile?: string;
  patient_email?: string;
  service_name?: string;
  service_price?: number | string;
  service_duration?: number | string;
};

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


  function normalizeAppointment(raw: RawDentalAppointment): DentalAppointment {
    if (!raw) return raw;
    const fullName = raw.patient_name ?? (raw.customer as any)?.full_name ?? [raw.customer?.first_name, raw.customer?.last_name].filter(Boolean).join(' ');
    return {
      ...raw,
      customer: raw.customer ?? (raw.customer_id ? {
        id: raw.customer_id,
        first_name: fullName?.split(' ')[0] ?? '',
        last_name: fullName?.split(' ').slice(1).join(' ') ?? '',
        full_name: fullName,
        phone: raw.patient_phone ?? undefined,
        mobile: raw.patient_mobile ?? undefined,
        email: raw.patient_email ?? undefined,
      } as any : undefined),
      treatment: (raw as any).treatment ?? ((raw as any).treatment_id ? {
        id: (raw as any).treatment_id,
        name: (raw as any).treatment_name ?? '',
        final_price: (raw as any).treatment_price as any,
        estimated_duration_minutes: (raw as any).treatment_duration as any,
      } as any : undefined),
    };
  }

  function normalizeList(raw: RawDentalAppointment[]): DentalAppointment[] {
    return (raw ?? []).map(normalizeAppointment);
  }

  function upsertAppointment(updated: DentalAppointment) {
    const itemIdx = items.value.findIndex(a => a.id === updated.id);
    if (itemIdx !== -1) Object.assign(items.value[itemIdx], updated);

    const todayIdx = today.value.findIndex(a => a.id === updated.id);
    if (todayIdx !== -1) Object.assign(today.value[todayIdx], updated);
  }

  async function load(params?: { status?: string; customer_id?: number | string; from?: string; to?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalAppointmentsService.list(params);
      items.value = normalizeList(unwrapData<RawDentalAppointment[]>(res.data));
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
      today.value = normalizeList(unwrapData<RawDentalAppointment[]>(res.data));
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
      items.value = normalizeList(unwrapData<RawDentalAppointment[]>(res.data));
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar citas del mes';
    } finally {
      loading.value = false;
    }
  }

  async function loadOne(id: number | string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalAppointmentsService.getById(id);
      current.value = normalizeAppointment(unwrapData<RawDentalAppointment>(res.data));
      return current.value;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar cita';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function create(data: DentalAppointmentFormData) {
    const res = await dentalAppointmentsService.create(data);
    const appointment = normalizeAppointment(unwrapData<RawDentalAppointment>(res.data));
    items.value.unshift(appointment);
    const aptDay = new Date(appointment.scheduled_start).toDateString();
    if (aptDay === new Date().toDateString()) today.value.unshift(appointment);
    return appointment;
  }

  async function update(id: number | string, data: Partial<DentalAppointmentFormData>) {
    const res = await dentalAppointmentsService.update(id, data);
    const updated = normalizeAppointment(unwrapData<RawDentalAppointment>(res.data));
    upsertAppointment(updated);
    return updated;
  }

  async function confirm(id: number | string) {
    const res = await dentalAppointmentsService.confirm(id);
    const updated = normalizeAppointment(unwrapData<RawDentalAppointment>(res.data));
    upsertAppointment(updated);
    return updated;
  }

  async function cancel(id: number | string) {
    const res = await dentalAppointmentsService.cancel(id);
    const updated = normalizeAppointment(unwrapData<RawDentalAppointment>(res.data));
    upsertAppointment(updated);
    return updated;
  }

  async function noShow(id: number | string) {
    const res = await dentalAppointmentsService.noShow(id);
    const updated = normalizeAppointment(unwrapData<RawDentalAppointment>(res.data));
    upsertAppointment(updated);
    return updated;
  }

  async function convertToConsultation(id: number | string) {
    const res = await dentalAppointmentsService.convertToConsultation(id);
    const payload = unwrapData<any>(res.data);
    if (payload?.appointment) upsertAppointment(normalizeAppointment(payload.appointment));
    return payload;
  }

  function reset() {
    items.value = [];
    today.value = [];
    current.value = null;
    error.value = null;
  }

  return { items, today, current, loading, error, load, loadToday, loadMonth, loadOne, create, update, confirm, cancel, noShow, convertToConsultation, reset };
});
