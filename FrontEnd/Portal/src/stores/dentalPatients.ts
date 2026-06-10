import { defineStore } from 'pinia';
import { ref } from 'vue';
import { dentalPatientsService } from '../services/dentalPatientsService';
import type { DentalPatient, DentalPatientFormData, DentalClinicalHistoryEntry, DentalConsultation, DentalPayment, DentalCharge, DentalMedicalHistory } from '../types/dental';

export const useDentalPatientsStore = defineStore('dentalPatients', () => {
  const items          = ref<DentalPatient[]>([]);
  const current        = ref<DentalPatient | null>(null);
  const medicalHistory = ref<DentalMedicalHistory[]>([]);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  function unwrapData<T>(payload: T | { data: T }): T {
    return payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: T }).data
      : payload as T;
  }

  async function load(params?: { search?: string; limit?: number; offset?: number }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalPatientsService.list(params);
      items.value = unwrapData<DentalPatient[]>(res.data);
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar pacientes';
    } finally {
      loading.value = false;
    }
  }

  async function loadOne(id: number | string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await dentalPatientsService.getById(id);
      current.value = unwrapData<DentalPatient>(res.data);
      return current.value;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar paciente';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function create(data: DentalPatientFormData) {
    const res = await dentalPatientsService.create(data);
    const patient = unwrapData<DentalPatient>(res.data);
    items.value.unshift(patient);
    return patient;
  }

  async function update(id: number | string, data: Partial<DentalPatientFormData>) {
    const res = await dentalPatientsService.update(id, data);
    const updated = unwrapData<DentalPatient>(res.data);
    const idx = items.value.findIndex(p => p.id === id);
    if (idx !== -1) Object.assign(items.value[idx], updated);
    if (current.value?.id === id) Object.assign(current.value, updated);
    return updated;
  }

  async function getClinicalHistory(id: number | string) {
    const res = await dentalPatientsService.getClinicalHistory(id);
    return unwrapData<DentalClinicalHistoryEntry[]>(res.data);
  }

  async function getConsultations(id: number | string) {
    const res = await dentalPatientsService.getConsultations(id);
    return unwrapData<DentalConsultation[]>(res.data);
  }

  async function getPayments(id: number | string) {
    const res = await dentalPatientsService.getPayments(id);
    return unwrapData<DentalPayment[]>(res.data);
  }

  async function getDebt(id: number | string) {
    const res = await dentalPatientsService.getDebt(id);
    return unwrapData<DentalCharge[]>(res.data);
  }

  async function fetchMedicalHistory(patientId: number | string) {
    const res = await dentalPatientsService.getMedicalHistory(patientId);
    medicalHistory.value = (res.data as any)?.data ?? res.data;
    return medicalHistory.value;
  }

  async function addMedicalHistory(patientId: number | string, data: Partial<DentalMedicalHistory>) {
    const res = await dentalPatientsService.createMedicalHistory(patientId, data);
    const entry = (res.data as any)?.data ?? res.data;
    medicalHistory.value.unshift(entry as DentalMedicalHistory);
    return entry as DentalMedicalHistory;
  }

  async function uploadPhoto(id: number | string, file: File): Promise<string> {
    const res = await dentalPatientsService.uploadPhoto(id, file);
    const photoUrl = res.photo_url;
    // Patch local state so UI updates without a full reload
    if (current.value && String(current.value.id) === String(id)) {
      (current.value as any).photo_url = photoUrl;
    }
    const idx = items.value.findIndex(p => String(p.id) === String(id));
    if (idx !== -1) (items.value[idx] as any).photo_url = photoUrl;
    return photoUrl;
  }

  async function deletePhoto(id: number | string): Promise<void> {
    await dentalPatientsService.deletePhoto(id);
    if (current.value && String(current.value.id) === String(id)) {
      (current.value as any).photo_url = null;
    }
    const idx = items.value.findIndex(p => String(p.id) === String(id));
    if (idx !== -1) (items.value[idx] as any).photo_url = null;
  }

  function reset() {
    items.value = [];
    current.value = null;
    error.value = null;
  }

  return { items, current, medicalHistory, loading, error, load, loadOne, create, update, getClinicalHistory, getConsultations, getPayments, getDebt, fetchMedicalHistory, addMedicalHistory, uploadPhoto, deletePhoto, reset };
});
