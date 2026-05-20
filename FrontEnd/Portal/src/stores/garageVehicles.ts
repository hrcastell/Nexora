import { defineStore } from 'pinia';
import { ref } from 'vue';
import { garageVehiclesService } from '../services/garageVehiclesService';
import type { Vehicle, VehiclePhoto } from '../types/garage';

export const useGarageVehiclesStore = defineStore('garageVehicles', () => {
  const items   = ref<Vehicle[]>([]);
  const current = ref<Vehicle | null>(null);
  const photos  = ref<VehiclePhoto[]>([]);
  const total   = ref(0);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  async function load(params?: { q?: string; customer_id?: number; brand_id?: number; status?: string; page?: number; limit?: number }) {
    loading.value = true; error.value = null;
    try {
      const res = await garageVehiclesService.list(params);
      items.value = res.data.data;
      total.value = res.data.total;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar vehículos';
    } finally { loading.value = false; }
  }

  async function loadOne(id: number) {
    loading.value = true; error.value = null;
    try {
      const res = await garageVehiclesService.getById(id);
      current.value = res.data;
      return res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar vehículo';
      throw e;
    } finally { loading.value = false; }
  }

  async function loadPhotos(vehicleId: number) {
    const res = await garageVehiclesService.getPhotos(vehicleId);
    photos.value = res.data;
    return res.data;
  }

  async function create(data: Partial<Vehicle>) {
    const res = await garageVehiclesService.create(data);
    items.value.unshift(res.data);
    total.value++;
    return res.data;
  }

  async function update(id: number, data: Partial<Vehicle>) {
    const res = await garageVehiclesService.update(id, data);
    const idx = items.value.findIndex(v => v.id === id);
    if (idx !== -1) Object.assign(items.value[idx], res.data);
    if (current.value?.id === id) current.value = res.data;
    return res.data;
  }

  async function toggleStatus(id: number, status: 'active' | 'inactive') {
    await garageVehiclesService.toggleStatus(id, status);
    const idx = items.value.findIndex(v => v.id === id);
    if (idx !== -1) items.value[idx].status = status;
    if (current.value?.id === id) current.value.status = status;
  }

  async function uploadPhoto(vehicleId: number, file: File, stage: 'entry' | 'delivery', caption?: string, workOrderId?: number) {
    const res = await garageVehiclesService.uploadPhoto(vehicleId, file, stage, caption, workOrderId);
    photos.value.push(res.data);
    return res.data;
  }

  async function deletePhoto(vehicleId: number, photoId: number) {
    await garageVehiclesService.deletePhoto(vehicleId, photoId);
    photos.value = photos.value.filter(p => p.id !== photoId);
  }

  function reset() {
    items.value = []; current.value = null; photos.value = []; total.value = 0; error.value = null;
  }

  return { items, current, photos, total, loading, error, load, loadOne, loadPhotos, create, update, toggleStatus, uploadPhoto, deletePhoto, reset };
});
