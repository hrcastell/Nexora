import { defineStore } from 'pinia';
import { ref } from 'vue';
import { hrEmployeesService } from '../services/hrEmployeesService';
import type { HrEmployee, HrEmployeeUpdate } from '../types/hr';

export const useHrEmployeesStore = defineStore('hrEmployees', () => {
  const items = ref<HrEmployee[]>([]);
  const current = ref<HrEmployee | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load(params?: { q?: string; department_id?: number; position_id?: number; employment_status?: string }) {
    loading.value = true; error.value = null;
    try { items.value = (await hrEmployeesService.list(params)).data; }
    catch (cause: any) { error.value = cause?.response?.data?.error || 'Error al cargar empleados'; }
    finally { loading.value = false; }
  }
  async function loadOne(id: number) {
    loading.value = true; error.value = null;
    try { current.value = (await hrEmployeesService.getById(id)).data; return current.value; }
    catch (cause: any) { error.value = cause?.response?.data?.error || 'Error al cargar empleado'; throw cause; }
    finally { loading.value = false; }
  }
  async function update(id: number, data: HrEmployeeUpdate) {
    const employee = (await hrEmployeesService.update(id, data)).data;
    const index = items.value.findIndex((item) => item.id === id);
    if (index !== -1) items.value[index] = { ...items.value[index], ...employee };
    if (current.value?.id === id) current.value = { ...current.value, ...employee };
    return employee;
  }
  return { items, current, loading, error, load, loadOne, update };
});
