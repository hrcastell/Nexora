import { ref } from 'vue';
import type { HrCatalogFormData, HrCatalogItem, HrCatalogStatus } from '../types/hr';

interface CatalogService {
  list(params?: { q?: string; status?: HrCatalogStatus | 'all' }): Promise<{ data: HrCatalogItem[] }>;
  create(data: HrCatalogFormData): Promise<{ data: HrCatalogItem }>;
  update(id: number, data: HrCatalogFormData): Promise<{ data: HrCatalogItem }>;
  toggleStatus(id: number, status: HrCatalogStatus): Promise<{ data: HrCatalogItem }>;
}

export function createHrCatalogStore(service: CatalogService, singularName: string) {
  const items = ref<HrCatalogItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load(params?: { q?: string; status?: HrCatalogStatus | 'all' }) {
    loading.value = true;
    error.value = null;
    try {
      items.value = (await service.list(params)).data;
    } catch (cause: any) {
      error.value = cause?.response?.data?.error || `Error al cargar ${singularName}`;
    } finally {
      loading.value = false;
    }
  }

  async function create(data: HrCatalogFormData) {
    const item = (await service.create(data)).data;
    items.value.unshift(item);
    return item;
  }

  async function update(id: number, data: HrCatalogFormData) {
    const item = (await service.update(id, data)).data;
    const index = items.value.findIndex((current) => current.id === id);
    if (index !== -1) items.value[index] = item;
    return item;
  }

  async function toggleStatus(id: number, status: HrCatalogStatus) {
    const item = (await service.toggleStatus(id, status)).data;
    const index = items.value.findIndex((current) => current.id === id);
    if (index !== -1) items.value[index] = item;
    return item;
  }

  return { items, loading, error, load, create, update, toggleStatus };
}
