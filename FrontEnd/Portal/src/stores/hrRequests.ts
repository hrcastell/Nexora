import { defineStore } from 'pinia';
import { ref } from 'vue';
import { hrRequestsService } from '../services/hrRequestsService';
import type { HrRequest, HrRequestDetail, HrRequestPayload, HrRequestType } from '../types/hr';

export const useHrRequestsStore = defineStore('hrRequests', () => {
  const mine = ref<HrRequest[]>([]);
  const approvals = ref<HrRequest[]>([]);
  const types = ref<HrRequestType[]>([]);
  const current = ref<HrRequestDetail | null>(null);
  const loading = ref(false);
  const detailLoading = ref(false);
  const error = ref<string | null>(null);

  async function loadMine() { loading.value = true; error.value = null; try { mine.value = (await hrRequestsService.list('mine')).data; } catch (cause: any) { error.value = cause?.response?.data?.error || 'Error al cargar solicitudes'; } finally { loading.value = false; } }
  async function loadTypes() { try { types.value = (await hrRequestsService.listTypes()).data; } catch (cause: any) { error.value = cause?.response?.data?.error || 'Error al cargar tipos de solicitud'; } }
  async function loadApprovals() { loading.value = true; error.value = null; try { approvals.value = (await hrRequestsService.list('approvals')).data; } catch (cause: any) { error.value = cause?.response?.data?.error || 'Error al cargar aprobaciones'; } finally { loading.value = false; } }
  async function loadOne(id: number) { detailLoading.value = true; try { current.value = (await hrRequestsService.getById(id)).data; return current.value; } finally { detailLoading.value = false; } }
  async function create(data: HrRequestPayload) { const request = (await hrRequestsService.create(data)).data; mine.value.unshift(request); return request; }
  async function act(id: number, action: 'approve' | 'reject' | 'annul', comment?: string) { const request = await hrRequestsService[action](id, comment); await Promise.all([loadMine(), loadApprovals()]); current.value = await loadOne(id); return request.data; }
  return { mine, approvals, types, current, loading, detailLoading, error, loadMine, loadTypes, loadApprovals, loadOne, create, act };
});
