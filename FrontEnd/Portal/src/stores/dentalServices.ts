import { defineStore } from 'pinia';
import { ref } from 'vue';
import { dentalServicesService } from '../services/dentalServicesService';
import type { DentalService, DentalServiceFormData, DentalServiceTreatment } from '../types/dental';

export const useDentalServicesStore = defineStore('dentalServices', () => {
  const items   = ref<DentalService[]>([]);
  const current = ref<DentalService | null>(null);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  function unwrapData<T>(payload: T | { data: T }): T {
    return payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload as T;
  }

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalServicesService.list();
      items.value = unwrapData<DentalService[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar servicios';
    } finally {
      loading.value = false;
    }
  }

  async function loadOne(id: number | string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalServicesService.getById(id);
      current.value = unwrapData<DentalService>(res.data);
      return current.value;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar servicio';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function create(data: DentalServiceFormData) {
    const res = await dentalServicesService.create(data);
    const service = unwrapData<DentalService>(res.data);
    items.value.unshift(service);
    return service;
  }

  async function update(id: number | string, data: Partial<DentalServiceFormData>) {
    const res = await dentalServicesService.update(id, data);
    const updated = unwrapData<DentalService>(res.data);
    const idx = items.value.findIndex(s => s.id === id);
    if (idx !== -1) Object.assign(items.value[idx], updated);
    if (current.value?.id === id) Object.assign(current.value, updated);
    return updated;
  }

  async function remove(id: number | string) {
    await dentalServicesService.remove(id);
    items.value = items.value.filter(s => s.id !== id);
  }

  async function assignTreatments(id: number | string, treatments: DentalServiceTreatment[]) {
    const res = await dentalServicesService.assignTreatments(id, treatments);
    const updated = unwrapData<DentalService>(res.data);
    const idx = items.value.findIndex(s => s.id === id);
    if (idx !== -1) Object.assign(items.value[idx], updated);
    if (current.value?.id === id) Object.assign(current.value, updated);
    return updated;
  }

  function reset() {
    items.value = [];
    current.value = null;
    error.value = null;
  }

  return { items, current, loading, error, load, loadOne, create, update, remove, assignTreatments, reset };
});
