export interface Supplier {
  id: number;
  name: string;
  normalized_name: string;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  country: string | null;
  region_state: string | null;
  city: string | null;
  commune_district: string | null;
  address: string | null;
  contact_name: string | null;
  payment_term_days: number;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface SupplierFormData {
  name: string;
  document_type: string;
  document_number: string;
  phone: string;
  mobile: string;
  email: string;
  country: string;
  region_state: string;
  city: string;
  commune_district: string;
  address: string;
  contact_name: string;
  payment_term_days: number;
  notes: string;
}

export type WarehouseType = 'main' | 'store' | 'transit' | 'external';

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  warehouse_type: WarehouseType;
  country: string | null;
  region_state: string | null;
  city: string | null;
  commune_district: string | null;
  address: string | null;
  manager_name: string | null;
  phone: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface WarehouseFormData {
  code: string;
  name: string;
  warehouse_type: WarehouseType;
  country: string;
  region_state: string;
  city: string;
  commune_district: string;
  address: string;
  manager_name: string;
  phone: string;
  notes: string;
}
