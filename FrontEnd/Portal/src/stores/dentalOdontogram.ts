import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  dentalOdontogramService,
  type OdontogramEntry,
  type OdontogramEntryForm,
} from '../services/dentalOdontogramService';

export const useDentalOdontogramStore = defineStore('dentalOdontogram', () => {
  // All entries for the current patient (used by both patient file and consultation view)
  const entries = ref<OdontogramEntry[]>([]);
  // Entries that belong to the currently active consultation (subset of entries)
  const consultationEntries = ref<OdontogramEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Map from tooth_number to all patient-level entries for that tooth
  const entriesByTooth = computed(() => {
    const map = new Map<number, OdontogramEntry[]>();
    for (const entry of entries.value) {
      if (!map.has(entry.tooth_number)) {
        map.set(entry.tooth_number, []);
      }
      map.get(entry.tooth_number)!.push(entry);
    }
    return map;
  });

  async function loadPatientOdontogram(patientId: number) {
    entries.value = [];
    loading.value = true;
    error.value = null;
    try {
      const result = await dentalOdontogramService.getByPatient(patientId);
      entries.value = result.data;
    } catch (err: any) {
      error.value = err?.response?.data?.error || 'Error al cargar odontograma';
    } finally {
      loading.value = false;
    }
  }

  async function loadConsultationOdontogram(consultationId: number) {
    consultationEntries.value = [];
    try {
      const result = await dentalOdontogramService.getByConsultation(consultationId);
      consultationEntries.value = result.data;
    } catch (err: any) {
      console.error('Error loading consultation odontogram:', err);
    }
  }

  async function upsertEntry(consultationId: number, form: OdontogramEntryForm): Promise<OdontogramEntry | null> {
    error.value = null;
    try {
      const result = await dentalOdontogramService.upsertEntry(consultationId, form);
      const saved = result.data;

      if (form.id) {
        // Update in place within both lists
        const idx = entries.value.findIndex(e => e.id === saved.id);
        if (idx !== -1) entries.value[idx] = saved;
        const cidx = consultationEntries.value.findIndex(e => e.id === saved.id);
        if (cidx !== -1) consultationEntries.value[cidx] = saved;
      } else {
        entries.value.push(saved);
        consultationEntries.value.push(saved);
      }

      return saved;
    } catch (err: any) {
      error.value = err?.response?.data?.error || 'Error al guardar hallazgo';
      return null;
    }
  }

  async function deleteEntry(consultationId: number, entryId: number): Promise<boolean> {
    error.value = null;
    try {
      await dentalOdontogramService.deleteEntry(consultationId, entryId);
      entries.value = entries.value.filter(e => e.id !== entryId);
      consultationEntries.value = consultationEntries.value.filter(e => e.id !== entryId);
      return true;
    } catch (err: any) {
      error.value = err?.response?.data?.error || 'Error al eliminar hallazgo';
      return false;
    }
  }

  function reset() {
    entries.value = [];
    consultationEntries.value = [];
    error.value = null;
  }

  return {
    entries,
    consultationEntries,
    loading,
    error,
    entriesByTooth,
    loadPatientOdontogram,
    loadConsultationOdontogram,
    upsertEntry,
    deleteEntry,
    reset,
  };
});
