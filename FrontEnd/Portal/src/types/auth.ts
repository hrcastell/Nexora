export interface User {
  id: number;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  state_region?: string;
  city?: string;
  commune?: string;
  avatar_url?: string;
  role?: 'super_admin' | 'admin' | 'inner_user' | 'outer_user';
  status?: 'activo' | 'suspendido' | 'bloqueado';
  is_super_admin: boolean;
  is_system_user?: boolean;
  last_login_at?: string;
  created_at?: string;
}

export interface Company {
  id: number;
  name: string;
  schema_name: string;
  is_company_admin?: boolean;
  commercial_status?: 'activa' | 'pendiente_pago' | 'suspendida' | 'bloqueada';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  companies: Company[];
  currentCompany: Company | null;
  isAuthenticated: boolean;
  readOnly?: boolean;
}

export interface NexoraModule {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  group_name?: string;
  is_global: boolean;
  show_in_menu: boolean;
  menu_order: number;
  status: 'activo' | 'inactivo' | 'borrador';
  is_system_module: boolean;
  created_at?: string;
}

export interface Profile {
  id: number;
  code: string;
  name: string;
  description?: string;
  scope: 'global' | 'empresa' | 'modulo';
  is_system_profile: boolean;
  is_active: boolean;
  module_count?: number;
  user_count?: number;
  created_at?: string;
}

export interface ProfilePermission {
  id?: number;
  profile_id?: number;
  module_id: number;
  module_code?: string;
  module_name?: string;
  module_icon?: string;
  module_group?: string;
  module_status?: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_export: boolean;
  can_admin: boolean;
}

export interface CompanyUser extends User {
  is_company_admin: boolean;
  company_user_id: number;
  role_id?: number;
  role_name?: string;
  tenant_status?: string;
  job_title?: string;
  access_level?: string;
  profiles?: Array<{ id: number; code: string; name: string; is_primary: boolean }>;
  company_count?: number;
}

export interface PaymentAgreement {
  id: number;
  company_id: number;
  amount: number;
  currency: string;
  frequency: string;
  start_date: string;
  due_day: number;
  service_description: string;
  grace_period_days: number;
  status: string;
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
}

export interface Invoice {
  id: number;
  company_id: number;
  agreement_id?: number;
  period_start: string;
  period_end: string;
  issue_date: string;
  due_date: string;
  amount: number;
  currency: string;
  service_detail?: Record<string, unknown>;
  status: 'emitido' | 'pendiente' | 'pagado' | 'vencido' | 'anulado';
  notes?: string;
  created_by_name?: string;
}

export interface Payment {
  id: number;
  company_id: number;
  invoice_id?: number;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method?: string;
  reference?: string;
  period_billed?: string;
  notes?: string;
  registered_by_name?: string;
  period_start?: string;
  period_end?: string;
}
