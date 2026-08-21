// ─── CATÁLOGOS ────────────────────────────────────────────────

export interface CatalogItem {
  id: number;
  name: string;
  normalized_name: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  // vehicle_models only
  brand_id?: number;
  // vehicle_colors only
  hex_color?: string;
}

export type CatalogType =
  | 'vehicle_types'
  | 'vehicle_body_types'
  | 'vehicle_brands'
  | 'vehicle_models'
  | 'vehicle_colors'
  | 'vehicle_transmissions'
  | 'vehicle_fuel_types'
  | 'product_types';

// ─── CLIENTES ─────────────────────────────────────────────────

export interface Customer {
  id: number;
  first_name: string;
  last_name: string | null;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  birth_date: string | null;
  country: string | null;
  region_state: string | null;
  city: string | null;
  commune_district: string | null;
  address: string | null;
  photo_url: string | null;
  notes: string | null;
  source: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CustomerListItem {
  id: number;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  commune_district: string | null;
  status: 'active' | 'inactive';
  photo_url: string | null;
  created_at: string;
}

export interface CustomerFormData {
  first_name: string;
  last_name?: string;
  document_type?: string;
  document_number?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  birth_date?: string;
  country?: string;
  region_state?: string;
  city?: string;
  commune_district?: string;
  address?: string;
  notes?: string;
  source?: string;
}

// ─── VEHÍCULOS ────────────────────────────────────────────────

export interface Vehicle {
  id: number;
  customer_id: number;
  customer_name?: string;
  vehicle_type_id: number | null;
  vehicle_type_name?: string;
  body_type_id: number | null;
  body_type_name?: string;
  brand_id: number | null;
  brand_name?: string;
  model_id: number | null;
  model_name?: string;
  version: string | null;
  plate: string | null;
  year: number | null;
  color_id: number | null;
  color_name?: string;
  hex_color?: string;
  transmission_id: number | null;
  transmission_name?: string;
  fuel_type_id: number | null;
  fuel_type_name?: string;
  engine_displacement: string | null;
  vin: string | null;
  engine_number: string | null;
  mileage: number;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface VehiclePhoto {
  id: number;
  vehicle_id: number;
  work_order_id: number | null;
  photo_url: string;
  stage: 'entry' | 'delivery';
  caption: string | null;
  sort_order: number;
  uploaded_by: number | null;
  created_at: string;
}

// ─── EMPLEADOS ────────────────────────────────────────────────

export interface Employee {
  id: number;
  user_id: number | null;
  first_name: string;
  last_name: string | null;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  email: string | null;
  role_name: string | null;
  specialty: string | null;
  photo_url: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// ─── TARIFAS ──────────────────────────────────────────────────

export interface LaborRate {
  id: number;
  employee_id: number;
  employee_name?: string;
  rate_name: string;
  hourly_rate: number;
  currency: string;
  valid_from: string;
  valid_to: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// ─── PRODUCTOS ────────────────────────────────────────────────

export interface Product {
  id: number;
  sku: string | null;
  name: string;
  normalized_name: string;
  description: string | null;
  product_type_id: number | null;
  product_type_name?: string | null;
  unit: string;
  reference_price: number;
  currency: string;
  inventory_enabled: boolean;
  track_serial: boolean;
  track_batch: boolean;
  allow_negative_stock: boolean;
  reorder_point: number;
  max_stock: number | null;
  preferred_supplier_id: number | null;
  purchase_unit: string | null;
  sale_unit: string | null;
  conversion_factor: number;
  average_cost: number;
  last_purchase_cost: number;
  requires_expiration: boolean;
  storage_notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export type ProductFormData = Omit<Product, 'id' | 'normalized_name' | 'status' | 'created_at' | 'updated_at' | 'product_type_name'>;

// ─── NIVELES DE PRECIO ──────────────────────────────────────────

export interface ProductPriceLevel {
  id: number;
  name: string;
  normalized_name: string;
  default_margin_pct: number;
  display_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ProductPriceRow {
  price_level_id: number;
  name: string;
  margin_pct: number;
  price: number;
}

export interface ProductPricesResponse {
  average_cost: number;
  prices: ProductPriceRow[];
}

// ─── SERVICIOS CONFIGURABLES ──────────────────────────────────

export interface ServiceTemplateProduct {
  id: number;
  service_template_id: number;
  product_id: number;
  product_name?: string;
  product_unit?: string;
  quantity: number;
  unit: string | null;
  reference_unit_price: number;
  created_at: string;
}

export interface ServiceTemplate {
  id: number;
  name: string;
  normalized_name: string;
  description: string | null;
  estimated_hours: number;
  suggested_role: string | null;
  suggested_specialty: string | null;
  base_labor_rate: number | null;
  currency: string;
  margin_pct: number;
  tax_pct: number;
  status: 'active' | 'inactive';
  products?: ServiceTemplateProduct[];
  created_at: string;
  updated_at: string;
}

// ─── CITAS ────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'arrived'
  | 'converted_to_work_order'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

export interface AppointmentService {
  id: number;
  appointment_id: number;
  service_template_id: number | null;
  service_name: string;
  description: string | null;
  estimated_hours: number;
  suggested_employee_id: number | null;
  employee_name?: string;
  estimated_labor_total: number;
  estimated_products_total: number;
  estimated_service_total: number;
  created_at: string;
  updated_at: string;
}

export interface AppointmentStatusHistory {
  id: number;
  appointment_id: number;
  previous_status: string | null;
  new_status: string;
  changed_by: number | null;
  notes: string | null;
  created_at: string;
}

export interface Appointment {
  id: number;
  appointment_number: string;
  customer_id: number | null;
  customer_name?: string;
  customer_phone?: string;
  vehicle_id: number | null;
  plate?: string;
  brand?: string;
  model?: string;
  vehicle_desc?: string;
  employee_name?: string;
  scheduled_start: string;
  scheduled_end: string | null;
  estimated_duration_hours: number;
  status: AppointmentStatus;
  channel: string | null;
  requested_service_summary: string | null;
  reported_issue: string | null;
  preliminary_notes: string | null;
  internal_notes: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  suggested_employee_id: number | null;
  reception_user_id: number | null;
  converted_work_order_id: number | null;
  converted_at: string | null;
  services?: AppointmentService[];
  history?: AppointmentStatusHistory[];
  created_at: string;
  updated_at: string;
}

// ─── ÓRDENES DE TRABAJO ───────────────────────────────────────

export type WorkOrderStatus =
  | 'draft'
  | 'received'
  | 'diagnosis'
  | 'approved'
  | 'in_progress'
  | 'waiting_parts'
  | 'completed'
  | 'delivered'
  | 'cancelled';

export interface WorkOrderServiceProduct {
  id: number;
  work_order_service_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface WorkOrderService {
  id: number;
  work_order_id: number;
  service_template_id: number | null;
  assigned_employee_id: number | null;
  employee_name?: string;
  service_name: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  estimated_hours: number;
  actual_hours: number;
  hourly_rate: number;
  labor_total: number;
  products_total: number;
  service_total: number;
  products?: WorkOrderServiceProduct[];
  created_at: string;
  updated_at: string;
}

export interface WorkOrderStatusHistory {
  id: number;
  work_order_id: number;
  previous_status: string | null;
  new_status: string;
  changed_by: number | null;
  notes: string | null;
  created_at: string;
}

export interface WorkOrder {
  id: number;
  order_number: string;
  appointment_id: number | null;
  appointment_number?: string | null;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  vehicle_id: number;
  plate?: string;
  brand?: string;
  model?: string;
  version?: string;
  year?: number;
  engine_displacement?: string;
  vehicle_desc?: string;
  assigned_employee_id: number | null;
  employee_name?: string;
  assigned_user_id: number | null;
  status: WorkOrderStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  entry_date: string;
  estimated_delivery_date: string | null;
  delivery_date: string | null;
  reported_issue: string | null;
  diagnosis: string | null;
  reception_notes: string | null;
  fuel_level: string | null;
  vehicle_condition_notes: string | null;
  internal_notes: string | null;
  customer_notes: string | null;
  mileage_in: number | null;
  mileage_out: number | null;
  subtotal_labor: number;
  subtotal_products: number;
  total_amount: number;
  currency: string;
  services?: WorkOrderService[];
  history?: WorkOrderStatusHistory[];
  created_at: string;
  updated_at: string;
}

// ─── HISTORIAL VEHICULAR ──────────────────────────────────────

export interface VehicleHistorySummary {
  total_orders: number;
  delivered_orders: number;
  active_orders: number;
  last_mileage: number;
  total_spent: number;
}

export interface VehicleHistory {
  vehicle: Vehicle;
  summary: VehicleHistorySummary;
  orders: WorkOrder[];
}

// ─── DASHBOARD ────────────────────────────────────────────────

export interface GarageDashboard {
  orders_open: number;
  orders_diagnosis: number;
  orders_in_progress: number;
  orders_waiting_parts: number;
  orders_completed: number;
  appointments_today: number;
  active_customers: number;
  active_vehicles: number;
}

// ─── PAGINACIÓN ───────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}
