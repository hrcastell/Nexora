import { defineStore } from 'pinia';
import { ref } from 'vue';
import { dentalConsultationSessionsService } from '../services/dentalConsultationSessionsService';
import type { DentalConsultationSession, DentalConsultationSessionFormData } from '../types/dental';

export const useDentalConsultationSessionsStore = defineStore('dentalConsultationSessions', () => {
  const items   = ref<DentalConsultationSession[]>([]);
  const current = ref<DentalConsultationSession | null>(null);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  function unwrapData<T>(payload: T | { data: T }): T {
    return payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload as T;
  }

  async function load(consultationId: number | string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalConsultationSessionsService.list(consultationId);
      items.value = unwrapData<DentalConsultationSession[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar sesiones';
    } finally {
      loading.value = false;
    }
  }

  async function create(consultationId: number | string, data: DentalConsultationSessionFormData) {
    const res = await dentalConsultationSessionsService.create(consultationId, data);
    const session = unwrapData<DentalConsultationSession>(res.data);
    items.value.push(session);
    return session;
  }

  async function update(consultationId: number | string, sessionId: number | string, data: Partial<DentalConsultationSessionFormData & { status?: string }>) {
    const res = await dentalConsultationSessionsService.update(consultationId, sessionId, data);
    const updated = unwrapData<DentalConsultationSession>(res.data);
    const idx = items.value.findIndex(s => s.id === updated.id);
    if (idx !== -1) items.value[idx] = updated;
    if (current.value?.id === updated.id) current.value = updated;
    return updated;
  }

  async function complete(consultationId: number | string, sessionId: number | string) {
    const res = await dentalConsultationSessionsService.complete(consultationId, sessionId);
    const updated = unwrapData<DentalConsultationSession>(res.data);
    const idx = items.value.findIndex(s => s.id === updated.id);
    if (idx !== -1) items.value[idx] = updated;
    return updated;
  }

  function reset() {
    items.value = [];
    current.value = null;
    error.value = null;
  }

  return { items, current, loading, error, load, create, update, complete, reset };
});
