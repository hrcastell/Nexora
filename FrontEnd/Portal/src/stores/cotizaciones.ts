import { defineStore } from 'pinia';
import { ref } from 'vue';
import { cotizacionesService } from '../services/cotizacionesService';
import type {
  Quote,
  QuoteDetail,
  QuoteFormData,
  QuoteLineFormData,
  QuoteAcceptPayload,
  QuoteRejectPayload,
} from '../types/cotizaciones';

export const useCotizacionesStore = defineStore('cotizaciones', () => {
  const items = ref<Quote[]>([]);
  const current = ref<QuoteDetail | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load(params?: { status?: string; customer_id?: number }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await cotizacionesService.list(params);
      items.value = res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar cotizaciones';
    } finally {
      loading.value = false;
    }
  }

  async function loadOne(id: number) {
    loading.value = true;
    error.value = null;
    try {
      const res = await cotizacionesService.getById(id);
      current.value = res.data;
      return res.data;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'Error al cargar cotización';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function create(data: QuoteFormData) {
    const res = await cotizacionesService.create(data);
    items.value.unshift(res.data);
    return res.data;
  }

  async function update(id: number, data: QuoteFormData) {
    const res = await cotizacionesService.update(id, data);
    if (current.value?.id === id) Object.assign(current.value, res.data);
    return res.data;
  }

  async function addLine(id: number, data: QuoteLineFormData) {
    await cotizacionesService.addLine(id, data);
    return loadOne(id);
  }

  async function updateLine(id: number, lineId: number, data: QuoteLineFormData) {
    await cotizacionesService.updateLine(id, lineId, data);
    return loadOne(id);
  }

  async function deleteLine(id: number, lineId: number) {
    await cotizacionesService.deleteLine(id, lineId);
    return loadOne(id);
  }

  async function send(id: number) {
    const res = await cotizacionesService.send(id);
    if (current.value?.id === id) Object.assign(current.value, res.data);
    return res.data;
  }

  async function accept(id: number, data: QuoteAcceptPayload) {
    const res = await cotizacionesService.accept(id, data);
    if (current.value?.id === id) Object.assign(current.value, res.data);
    return res.data;
  }

  async function reject(id: number, data?: QuoteRejectPayload) {
    const res = await cotizacionesService.reject(id, data);
    if (current.value?.id === id) Object.assign(current.value, res.data);
    return res.data;
  }

  function reset() {
    items.value = [];
    current.value = null;
    error.value = null;
  }

  return {
    items,
    current,
    loading,
    error,
    load,
    loadOne,
    create,
    update,
    addLine,
    updateLine,
    deleteLine,
    send,
    accept,
    reject,
    reset,
  };
});
