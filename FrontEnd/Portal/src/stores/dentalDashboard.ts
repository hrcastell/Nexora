import { defineStore } from 'pinia';
import { ref } from 'vue';
import { dentalDashboardService } from '../services/dentalDashboardService';
import type { DentalDashboardSummary, DentalAppointment } from '../types/dental';

export const useDentalDashboardStore = defineStore('dentalDashboard', () => {
  const summary     = ref<DentalDashboardSummary | null>(null);
  const todayAgenda = ref<DentalAppointment[]>([]);
  const loading     = ref(false);
  const error       = ref<string | null>(null);

  function unwrapData<T>(payload: T | { data: T }): T {
    return payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload as T;
  }

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const [summaryRes, todayRes] = await Promise.all([
        dentalDashboardService.getSummary(),
        dentalDashboardService.getToday(),
      ]);
      summary.value = unwrapData<DentalDashboardSummary>(summaryRes.data);
      todayAgenda.value = unwrapData<DentalAppointment[]>(todayRes.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar dashboard dental';
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    summary.value = null;
    todayAgenda.value = [];
    error.value = null;
  }

  return { summary, todayAgenda, loading, error, load, reset };
});
