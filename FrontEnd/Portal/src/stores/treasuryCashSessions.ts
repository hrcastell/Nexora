import { defineStore } from 'pinia';
import { ref } from 'vue';
import { treasuryCashSessionsService } from '../services/treasuryCashSessionsService';
import type { TreasuryCashMovementData, TreasuryCashSession, TreasuryOpenCashSessionData } from '../types/treasury';

export const useTreasuryCashSessionsStore = defineStore('treasuryCashSessions', () => {
  const sessions = ref<TreasuryCashSession[]>([]); const selected = ref<TreasuryCashSession | null>(null); const loading = ref(false); const saving = ref(false); const error = ref<string | null>(null);
  async function load(status?: 'open' | 'closed') { loading.value = true; error.value = null; try { sessions.value = (await treasuryCashSessionsService.list(status ? { status } : undefined)).data; } catch (cause: any) { error.value = cause?.response?.data?.error || 'Error al cargar sesiones de caja'; } finally { loading.value = false; } }
  async function select(id: number) { loading.value = true; error.value = null; try { selected.value = (await treasuryCashSessionsService.getById(id)).data; return selected.value; } catch (cause: any) { error.value = cause?.response?.data?.error || 'Error al cargar la sesión de caja'; throw cause; } finally { loading.value = false; } }
  async function open(data: TreasuryOpenCashSessionData) { saving.value = true; try { const item = (await treasuryCashSessionsService.open(data)).data; await load(); await select(item.id); return item; } finally { saving.value = false; } }
  async function close(id: number, countedAmount: number) { saving.value = true; try { const item = (await treasuryCashSessionsService.close(id, countedAmount)).data; await load(); await select(item.id); return item; } finally { saving.value = false; } }
  async function recordMovement(data: TreasuryCashMovementData) { saving.value = true; try { await treasuryCashSessionsService.recordMovement(data); const openSession = sessions.value.find((item) => item.cash_register_id === data.cash_register_id && item.status === 'open'); if (openSession) await select(openSession.id); } finally { saving.value = false; } }
  return { sessions, selected, loading, saving, error, load, select, open, close, recordMovement };
});
