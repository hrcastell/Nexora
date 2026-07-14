import api from '../utils/axios';
import type { HrRequest, HrRequestDetail, HrRequestPayload, HrRequestType } from '../types/hr';

export const hrRequestsService = {
  listTypes() { return api.get<HrRequestType[]>('/hr/request-types'); },
  list(scope?: 'mine' | 'approvals') {
    return api.get<HrRequest[]>('/hr/requests', { params: scope === 'mine' ? { scope: 'mine' } : undefined });
  },
  getById(id: number) { return api.get<HrRequestDetail>(`/hr/requests/${id}`); },
  create(data: HrRequestPayload) { return api.post<HrRequest>('/hr/requests', data); },
  approve(id: number, comment?: string) { return api.post<HrRequest>(`/hr/requests/${id}/approve`, { comment }); },
  reject(id: number, comment?: string) { return api.post<HrRequest>(`/hr/requests/${id}/reject`, { comment }); },
  annul(id: number, comment?: string) { return api.post<HrRequest>(`/hr/requests/${id}/annul`, { comment }); },
};
