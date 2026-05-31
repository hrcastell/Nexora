import api from '../utils/axios';
import type { DentalDashboardSummary, DentalAppointment } from '../types/dental';

export const dentalDashboardService = {
  getSummary() {
    return api.get<DentalDashboardSummary>('/dental/dashboard');
  },

  getToday() {
    return api.get<DentalAppointment[]>('/dental/dashboard/today');
  },

  getFinance() {
    return api.get('/dental/dashboard/finance');
  },
};
