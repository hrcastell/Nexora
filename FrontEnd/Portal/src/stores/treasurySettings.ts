import { defineStore } from 'pinia';
import { ref } from 'vue';
import { treasuryCashRegistersService } from '../services/treasuryCashRegistersService';
import { treasuryCounterpartiesService } from '../services/treasuryCounterpartiesService';
import { treasuryPaymentTermsService } from '../services/treasuryPaymentTermsService';
import type {
  TreasuryCashRegister,
  TreasuryCashRegisterFormData,
  TreasuryCounterparty,
  TreasuryCounterpartyFormData,
  TreasuryPaymentTerm,
  TreasuryPaymentTermFormData,
  TreasuryStatus,
} from '../types/treasury';

interface CatalogService<T, F> {
  list(params?: Record<string, unknown>): Promise<{ data: T[] }>;
  create(data: F): Promise<{ data: T }>;
  update(id: number, data: F): Promise<{ data: T }>;
  toggleStatus(id: number, status: TreasuryStatus): Promise<{ data: T }>;
}

function createCatalogState<T extends { id: number; status: TreasuryStatus }, F>(
  service: CatalogService<T, F>,
  fallbackError: string,
) {
  const items = ref<T[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function setError(cause: any) {
    error.value = cause?.response?.data?.error || fallbackError;
  }

  async function load(params?: Record<string, unknown>) {
    loading.value = true;
    error.value = null;
    try {
      items.value = (await service.list(params)).data as any;
    } catch (cause: any) {
      setError(cause);
    } finally {
      loading.value = false;
    }
  }

  async function create(data: F) {
    try {
      const item = (await service.create(data)).data;
      (items.value as any).unshift(item);
      return item;
    } catch (cause: any) {
      setError(cause);
      throw cause;
    }
  }

  async function update(id: number, data: F) {
    try {
      const item = (await service.update(id, data)).data;
      const index = items.value.findIndex((current) => current.id === id);
      if (index !== -1) (items.value as any)[index] = item;
      return item;
    } catch (cause: any) {
      setError(cause);
      throw cause;
    }
  }

  async function toggleStatus(id: number, status: TreasuryStatus) {
    try {
      const item = (await service.toggleStatus(id, status)).data;
      const index = items.value.findIndex((current) => current.id === id);
      if (index !== -1) (items.value as any)[index] = item;
      return item;
    } catch (cause: any) {
      setError(cause);
      throw cause;
    }
  }

  return { items, loading, error, load, create, update, toggleStatus };
}

export const useTreasurySettingsStore = defineStore('treasurySettings', () => {
  const counterparties = createCatalogState<TreasuryCounterparty, TreasuryCounterpartyFormData>(
    treasuryCounterpartiesService,
    'Error al cargar contrapartes',
  );
  const paymentTerms = createCatalogState<TreasuryPaymentTerm, TreasuryPaymentTermFormData>(
    treasuryPaymentTermsService,
    'Error al cargar condiciones de pago',
  );
  const cashRegisters = createCatalogState<TreasuryCashRegister, TreasuryCashRegisterFormData>(
    treasuryCashRegistersService,
    'Error al cargar cajas',
  );

  return { counterparties, paymentTerms, cashRegisters };
});
