import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { dentalConsultationServicesService } from '../services/dentalConsultationServicesService';
import type { DentalConsultationService, DentalConsultationServiceFormData } from '../types/dental';

export const useDentalConsultationServicesStore = defineStore('dentalConsultationServices', () => {
  const items   = ref<DentalConsultationService[]>([]);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  function unwrapData<T>(payload: T | { data: T }): T {
    return payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload as T;
  }

  const total = computed(() =>
    items.value
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + parseFloat(s.subtotal as any), 0)
  );

  async function load(consultationId: number | string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalConsultationServicesService.list(consultationId);
      items.value = unwrapData<DentalConsultationService[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar servicios de consulta';
    } finally {
      loading.value = false;
    }
  }

  async function add(consultationId: number | string, data: DentalConsultationServiceFormData) {
    const res = await dentalConsultationServicesService.add(consultationId, data);
    const service = unwrapData<DentalConsultationService>(res.data);
    items.value.push(service);
    return service;
  }

  async function update(consultationId: number | string, serviceId: number | string, data: Partial<DentalConsultationServiceFormData>) {
    const res = await dentalConsultationServicesService.update(consultationId, serviceId, data);
    const updated = unwrapData<DentalConsultationService>(res.data);
    const idx = items.value.findIndex(s => s.id === updated.id);
    if (idx !== -1) items.value[idx] = updated;
    return updated;
  }

  async function voidService(consultationId: number | string, serviceId: number | string) {
    await dentalConsultationServicesService.void(consultationId, serviceId);
    const idx = items.value.findIndex(s => s.id === Number(serviceId));
    if (idx !== -1) items.value[idx].status = 'voided';
  }

  function reset() {
    items.value = [];
    error.value = null;
  }

  return { items, loading, error, total, load, add, update, voidService, reset };
});
