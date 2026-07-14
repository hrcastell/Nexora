import api from '../utils/axios';
import type { HrEmployee, HrEmployeeUpdate } from '../types/hr';

export const hrEmployeesService = {
  list(params?: { q?: string; department_id?: number; position_id?: number; employment_status?: string }) {
    return api.get<HrEmployee[]>('/hr/employees', { params });
  },
  getById(id: number) {
    return api.get<HrEmployee>(`/hr/employees/${id}`);
  },
  update(id: number, data: HrEmployeeUpdate) {
    return api.put<HrEmployee>(`/hr/employees/${id}`, data);
  },
};
