import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { dentalConsultationTreatmentsService } from '../services/dentalConsultationTreatmentsService';
import type { DentalConsultationTreatment, DentalConsultationTreatmentFormData } from '../types/dental';

export const useDentalConsultationTreatmentsStore = defineStore('dentalConsultationTreatments', () => {
  const items   = ref<DentalConsultationTreatment[]>([]);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  function unwrapData<T>(payload: T | { data: T }): T {
    return payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload as T;
  }

  const total = computed(() =>
    items.value
      .filter(t => t.status === 'active')
      .reduce((sum, t) => sum + parseFloat(t.subtotal as any), 0)
  );

  async function load(consultationId: number | string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalConsultationTreatmentsService.list(consultationId);
      items.value = unwrapData<DentalConsultationTreatment[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar tratamientos de consulta';
    } finally {
      loading.value = false;
    }
  }

  async function add(consultationId: number | string, data: DentalConsultationTreatmentFormData) {
    const res = await dentalConsultationTreatmentsService.add(consultationId, data);
    const treatment = unwrapData<DentalConsultationTreatment>(res.data);
    items.value.push(treatment);
    return treatment;
  }

  async function update(consultationId: number | string, treatmentId: number | string, data: Partial<DentalConsultationTreatmentFormData>) {
    const res = await dentalConsultationTreatmentsService.update(consultationId, treatmentId, data);
    const updated = unwrapData<DentalConsultationTreatment>(res.data);
    const idx = items.value.findIndex(t => t.id === updated.id);
    if (idx !== -1) items.value[idx] = updated;
    return updated;
  }

  async function voidTreatment(consultationId: number | string, treatmentId: number | string) {
    await dentalConsultationTreatmentsService.void(consultationId, treatmentId);
    const idx = items.value.findIndex(t => t.id === Number(treatmentId));
    if (idx !== -1) items.value[idx].status = 'voided';
  }

  function reset() {
    items.value = [];
    error.value = null;
  }

  return { items, loading, error, total, load, add, update, voidTreatment, reset };
});
