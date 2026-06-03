import { defineStore } from 'pinia';
import { ref } from 'vue';
import { dentalConsultationsService } from '../services/dentalConsultationsService';
import type { DentalConsultation, DentalConsultationFormData, DentalClinicalHistoryEntry } from '../types/dental';

export const useDentalConsultationsStore = defineStore('dentalConsultations', () => {
  const items   = ref<DentalConsultation[]>([]);
  const current = ref<DentalConsultation | null>(null);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  function unwrapData<T>(payload: T | { data: T }): T {
    return payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload as T;
  }

  async function load(params?: { status?: string; administrative_status?: string; from?: string; to?: string; customer_id?: number | string }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalConsultationsService.list(params);
      items.value = unwrapData<DentalConsultation[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar consultas';
    } finally {
      loading.value = false;
    }
  }

  async function loadOne(id: number | string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalConsultationsService.getById(id);
      current.value = unwrapData<DentalConsultation>(res.data);
      return current.value;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar consulta';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function create(data: DentalConsultationFormData) {
    const res = await dentalConsultationsService.create(data);
    const consultation = unwrapData<DentalConsultation>(res.data);
    items.value.unshift(consultation);
    return consultation;
  }

  async function update(id: number | string, data: Partial<DentalConsultationFormData>) {
    const res = await dentalConsultationsService.update(id, data);
    const updated = unwrapData<DentalConsultation>(res.data);
    const idx = items.value.findIndex(c => c.id === id);
    if (idx !== -1) Object.assign(items.value[idx], updated);
    if (current.value?.id === id) Object.assign(current.value, updated);
    return updated;
  }

  async function addClinicalHistoryEntry(id: number | string, data: Partial<DentalClinicalHistoryEntry>) {
    const res = await dentalConsultationsService.addClinicalHistoryEntry(id, data);
    return unwrapData<DentalClinicalHistoryEntry>(res.data);
  }

  async function complete(id: number | string) {
    const res = await dentalConsultationsService.complete(id);
    // Backend returns { data: consultation, charge_created: ... }
    const payload = res.data as any;
    const updated = payload?.data ? payload.data : unwrapData<DentalConsultation>(payload);
    const idx = items.value.findIndex(c => c.id === id);
    if (idx !== -1) Object.assign(items.value[idx], updated);
    if (current.value?.id === id) Object.assign(current.value, updated);
    return updated;
  }

  async function cancel(id: number | string) {
    const res = await dentalConsultationsService.cancel(id);
    const updated = unwrapData<DentalConsultation>(res.data);
    const idx = items.value.findIndex(c => c.id === id);
    if (idx !== -1) Object.assign(items.value[idx], updated);
    if (current.value?.id === id) Object.assign(current.value, updated);
    return updated;
  }

  async function createCharge(id: number | string, totalAmount: number) {
    const res = await dentalConsultationsService.createCharge(id, totalAmount);
    return unwrapData<any>(res.data);
  }

  async function listPhotos(id: number | string) {
    const res = await dentalConsultationsService.listPhotos(id);
    return unwrapData<any[]>(res.data);
  }

  async function uploadPhoto(id: number | string, file: File, stage: 'before' | 'after', caption?: string) {
    const res = await dentalConsultationsService.uploadPhoto(id, file, stage, caption);
    return unwrapData<any>(res.data);
  }

  async function deletePhoto(id: number | string, photoId: number | string) {
    await dentalConsultationsService.deletePhoto(id, photoId);
  }

  async function changeStatus(id: number | string, status: string, reason?: string) {
    const res = await dentalConsultationsService.changeStatus(id, status, reason);
    const updated = unwrapData<DentalConsultation>(res.data);
    const idx = items.value.findIndex(c => c.id === id);
    if (idx !== -1) Object.assign(items.value[idx], updated);
    if (current.value?.id === id) Object.assign(current.value, updated);
    return updated;
  }

  function reset() {
    items.value = [];
    current.value = null;
    error.value = null;
  }

  return { items, current, loading, error, load, loadOne, create, update, addClinicalHistoryEntry, complete, cancel, changeStatus, createCharge, listPhotos, uploadPhoto, deletePhoto, reset };
});
