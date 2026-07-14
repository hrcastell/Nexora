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
