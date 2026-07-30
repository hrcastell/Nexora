import api from '../utils/axios';
import type { WorkOrder, WorkOrderService, WorkOrderServiceProduct, PaginatedResponse } from '../types/garage';

export interface WorkOrderPrintData {
  workOrder: WorkOrder;
  customer: Record<string, unknown>;
  vehicle: Record<string, unknown>;
  services: WorkOrderService[];
  config: Record<string, unknown>;
}

export const garageWorkOrdersService = {
  list(params?: {
    status?: string;
    priority?: string;
    employee_id?: number;
    customer_id?: number;
    q?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }) {
    return api.get<PaginatedResponse<WorkOrder>>('/garage/work-orders', { params });
  },

  getById(id: number) {
    return api.get<WorkOrder>(`/garage/work-orders/${id}`);
  },

  getPrintData(id: number) {
    return api.get<{ data: WorkOrderPrintData }>(`/garage/work-orders/${id}/print`);
  },

  create(data: Partial<WorkOrder>) {
    return api.post<WorkOrder>('/garage/work-orders', data);
  },

  update(id: number, data: Partial<WorkOrder>) {
    return api.put<WorkOrder>(`/garage/work-orders/${id}`, data);
  },

  changeStatus(id: number, status: string, notes?: string) {
    return api.patch<{ message: string; status: string }>(`/garage/work-orders/${id}/status`, { status, notes });
  },

  assign(id: number, data: { assigned_employee_id?: number; assigned_user_id?: number }) {
    return api.patch<WorkOrder>(`/garage/work-orders/${id}/assign`, data);
  },

  recalculate(id: number) {
    return api.post<{ message: string; subtotal_labor: number; subtotal_products: number; total_amount: number }>(`/garage/work-orders/${id}/recalculate`);
  },

  close(id: number, data?: { mileage_out?: number; customer_notes?: string; internal_notes?: string; notes?: string }) {
    return api.post<{ message: string; status: string }>(`/garage/work-orders/${id}/close`, data || {});
  },

  cancel(id: number, notes?: string) {
    return api.post<{ message: string; status: string }>(`/garage/work-orders/${id}/cancel`, { notes });
  },

  // ─── Servicios de la orden ────────────────────────────────
  listServices(orderId: number) {
    return api.get<WorkOrderService[]>(`/garage/work-orders/${orderId}/services`);
  },

  getService(orderId: number, serviceId: number) {
    return api.get<WorkOrderService>(`/garage/work-orders/${orderId}/services/${serviceId}`);
  },

  addService(orderId: number, data: { service_name?: string; service_template_id?: number; assigned_employee_id?: number; estimated_hours?: number; description?: string }) {
    return api.post<WorkOrderService>(`/garage/work-orders/${orderId}/services`, data);
  },

  updateService(orderId: number, serviceId: number, data: Partial<WorkOrderService>) {
    return api.put<WorkOrderService>(`/garage/work-orders/${orderId}/services/${serviceId}`, data);
  },

  removeService(orderId: number, serviceId: number) {
    return api.delete<{ message: string }>(`/garage/work-orders/${orderId}/services/${serviceId}`);
  },

  changeServiceStatus(orderId: number, serviceId: number, status: string) {
    return api.patch<{ id: number; status: string }>(`/garage/work-orders/${orderId}/services/${serviceId}/status`, { status });
  },

  // ─── Productos de servicio ────────────────────────────────
  addProduct(orderId: number, serviceId: number, data: { product_id?: number; product_name?: string; quantity: number; unit?: string; unit_price: number }) {
    return api.post<WorkOrderServiceProduct>(`/garage/work-orders/${orderId}/services/${serviceId}/products`, data);
  },

  removeProduct(orderId: number, serviceId: number, productLineId: number) {
    return api.delete<{ message: string }>(`/garage/work-orders/${orderId}/services/${serviceId}/products/${productLineId}`);
  },
};
