import { defineStore } from 'pinia';
import { ref } from 'vue';
import { dentalTreatmentsService } from '../services/dentalTreatmentsService';
import type { DentalTreatment, DentalTreatmentFormData } from '../types/dental';

export const useDentalTreatmentsStore = defineStore('dentalTreatments', () => {
  const items   = ref<DentalTreatment[]>([]);
  const current = ref<DentalTreatment | null>(null);
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
      const res = await dentalTreatmentsService.list();
      items.value = unwrapData<DentalTreatment[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar tratamientos';
    } finally {
      loading.value = false;
    }
  }

  async function loadOne(id: number | string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalTreatmentsService.getById(id);
      current.value = unwrapData<DentalTreatment>(res.data);
      return current.value;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar tratamiento';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function create(data: DentalTreatmentFormData) {
    const res = await dentalTreatmentsService.create(data);
    const treatment = unwrapData<DentalTreatment>(res.data);
    items.value.unshift(treatment);
    return treatment;
  }

  async function update(id: number | string, data: Partial<DentalTreatmentFormData>) {
    const res = await dentalTreatmentsService.update(id, data);
    const updated = unwrapData<DentalTreatment>(res.data);
    const idx = items.value.findIndex(t => t.id === id);
    if (idx !== -1) Object.assign(items.value[idx], updated);
    if (current.value?.id === id) Object.assign(current.value, updated);
    return updated;
  }

  async function remove(id: number | string) {
    await dentalTreatmentsService.remove(id);
    items.value = items.value.filter(t => t.id !== id);
  }

  function reset() {
    items.value = [];
    current.value = null;
    error.value = null;
  }

  return { items, current, loading, error, load, loadOne, create, update, remove, reset };
});
