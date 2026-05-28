import { defineStore } from 'pinia';
import { ref } from 'vue';
import { garageCustomersService } from '../services/garageCustomersService';
import type { Customer, CustomerListItem, CustomerFormData } from '../types/garage';

export const useGarageCustomersStore = defineStore('garageCustomers', () => {
  const items   = ref<CustomerListItem[]>([]);
  const current = ref<Customer | null>(null);
  const total   = ref(0);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  async function load(params?: { q?: string; status?: string; page?: number; limit?: number }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await garageCustomersService.list(params);
      items.value = res.data.data;
      total.value = res.data.total;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar clientes';
    } finally {
      loading.value = false;
    }
  }

  async function loadOne(id: number) {
    loading.value = true;
    error.value = null;
    try {
      const res = await garageCustomersService.getById(id);
      current.value = res.data;
      return res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar cliente';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function create(data: CustomerFormData) {
    const res = await garageCustomersService.create(data);
    items.value.unshift(res.data as unknown as CustomerListItem);
    total.value++;
    return res.data;
  }

  async function update(id: number, data: CustomerFormData) {
    const res = await garageCustomersService.update(id, data);
    const idx = items.value.findIndex(c => c.id === id);
    if (idx !== -1) Object.assign(items.value[idx], res.data);
    if (current.value?.id === id) current.value = res.data;
    return res.data;
  }

  async function toggleStatus(id: number, status: 'active' | 'inactive') {
    await garageCustomersService.toggleStatus(id, status);
    const idx = items.value.findIndex(c => c.id === id);
    if (idx !== -1) items.value[idx].status = status;
    if (current.value?.id === id) current.value.status = status;
  }

  async function uploadPhoto(id: number, file: File) {
    const res = await garageCustomersService.uploadPhoto(id, file);
    if (current.value?.id === id) current.value.photo_url = res.data.photo_url;
    const idx = items.value.findIndex(c => c.id === id);
    if (idx !== -1) items.value[idx].photo_url = res.data.photo_url;
    return res.data;
  }

  async function deletePhoto(id: number) {
    await garageCustomersService.deletePhoto(id);
    if (current.value?.id === id) current.value.photo_url = null;
    const idx = items.value.findIndex(c => c.id === id);
    if (idx !== -1) items.value[idx].photo_url = null;
  }

  function reset() {
    items.value = [];
    current.value = null;
    total.value = 0;
    error.value = null;
  }

  return { items, current, total, loading, error, load, loadOne, create, update, toggleStatus, uploadPhoto, deletePhoto, reset };
});
