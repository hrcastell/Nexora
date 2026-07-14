export type HrCatalogStatus = 'active' | 'inactive';

export interface HrCatalogItem {
  id: number;
  code: string;
  name: string;
  status: HrCatalogStatus;
  created_at: string;
  updated_at: string;
}

export interface HrCatalogFormData {
  code: string;
  name: string;
}

export type EmploymentStatus = 'draft' | 'active' | 'inactive' | 'on_leave' | 'terminated' | 'suspended';
export type EmploymentType = 'full_time' | 'part_time' | 'contractor' | 'intern' | 'temporary';

export interface HrEmployee {
  id: number;
  first_name: string;
  last_name: string | null;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  employee_code: string | null;
  user_id: number | null;
  work_email: string | null;
  personal_email: string | null;
  mobile_phone: string | null;
  birth_date: string | null;
  hire_date: string | null;
  termination_date: string | null;
  employment_status: EmploymentStatus;
  employment_type: EmploymentType | null;
  department_id: number | null;
  department_name?: string | null;
  position_id: number | null;
  position_name?: string | null;
  supervisor_employee_id: number | null;
  supervisor_name?: string | null;
  cost_center_id: number | null;
  cost_center_name?: string | null;
  work_shift_id: number | null;
  work_shift_name?: string | null;
  privacy_level: string | null;
  created_at: string;
  updated_at: string;
}

export type HrEmployeeUpdate = Partial<Pick<HrEmployee,
  'employee_code' | 'user_id' | 'work_email' | 'personal_email' | 'mobile_phone' |
  'birth_date' | 'hire_date' | 'termination_date' | 'employment_status' |
  'employment_type' | 'department_id' | 'position_id' | 'supervisor_employee_id' |
  'cost_center_id' | 'work_shift_id' | 'privacy_level'
>>;

export interface HrRequestType { id: number; code: string; name: string; description?: string | null; requires_dates?: boolean; status: HrCatalogStatus; }
export interface HrRequest { id: number; request_type_id: number; request_type_name?: string; employee_id: number; employee_name?: string; title: string | null; description: string | null; start_date: string | null; end_date: string | null; status: string; current_step: string; created_at: string; updated_at: string; }
export interface HrRequestApproval { id: number; step: string; decision: string; decided_by: number | null; decided_at: string | null; comment: string | null; }
export interface HrRequestHistory { id: number; from_status: string | null; to_status: string; actor_user_id: number | null; actor_role: string | null; note: string | null; created_at: string; }
export interface HrRequestDetail extends HrRequest { approvals: HrRequestApproval[]; history: HrRequestHistory[]; }
export interface HrRequestPayload { request_type_id: number | null; title?: string; description?: string; start_date?: string; end_date?: string; }
