// ─── CUSTOMER BASE ────────────────────────────────────────────

export interface Customer {
  id: number | string;
  first_name: string;
  last_name: string;
  document_type?: string;
  document_number?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  birth_date?: string;
  status?: string;
}

// ─── DENTAL PATIENT PROFILE ───────────────────────────────────

export interface DentalPatientProfile {
  id: number | string;
  tenant_id: string;
  customer_id: number | string;
  medical_background?: string;
  allergies?: string;
  current_medications?: string;
  chronic_conditions?: string;
  dental_observations?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
}

// Patient = Customer + Profile combined
export interface DentalPatient extends Customer {
  dental_profile?: DentalPatientProfile;
}

export interface DentalPatientFormData {
  customer_id?: number | string;
  first_name: string;
  last_name: string;
  document_type?: string;
  document_number?: string;
  phone?: string;
  email?: string;
  medical_background?: string;
  allergies?: string;
  current_medications?: string;
  chronic_conditions?: string;
  dental_observations?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

// ─── TREATMENT ────────────────────────────────────────────────

export interface DentalTreatment {
  id: number | string;
  tenant_id: string;
  name: string;
  description?: string;
  category?: string;
  estimated_duration_minutes?: number;
  requires_follow_up: boolean;
  requires_multiple_sessions: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DentalTreatmentFormData {
  name: string;
  description?: string;
  category?: string;
  estimated_duration_minutes?: number;
  requires_follow_up?: boolean;
  requires_multiple_sessions?: boolean;
  is_active?: boolean;
}

// ─── SERVICE ──────────────────────────────────────────────────

export interface DentalService {
  id: number | string;
  tenant_id: string;
  name: string;
  description?: string;
  price_mode: 'manual' | 'calculated';
  supplies_cost: number;
  labor_cost: number;
  tax_rate: number;
  profit_margin: number;
  manual_price?: number;
  final_price: number;
  estimated_duration_minutes?: number;
  is_active: boolean;
  treatments?: DentalServiceTreatment[];
  created_at: string;
  updated_at: string;
}

export interface DentalServiceTreatment {
  treatment_id: number | string;
  treatment_name?: string;
  quantity: number;
}

export interface DentalServiceFormData {
  name: string;
  description?: string;
  price_mode: 'manual' | 'calculated';
  supplies_cost?: number;
  labor_cost?: number;
  tax_rate?: number;
  profit_margin?: number;
  manual_price?: number;
  estimated_duration_minutes?: number;
  is_active?: boolean;
}

// ─── APPOINTMENT ──────────────────────────────────────────────

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';

export interface DentalAppointment {
  id: number | string;
  tenant_id: string;
  customer_id: number | string;
  service_id?: number | string;
  scheduled_start: string;
  scheduled_end: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  reminder_email_sent_at?: string;
  customer?: Customer;
  service?: DentalService;
  created_at: string;
  updated_at: string;
}

export interface DentalAppointmentFormData {
  customer_id: number | string;
  service_id?: number | string;
  scheduled_start: string;
  scheduled_end: string;
  reason?: string;
  notes?: string;
}

// ─── CONSULTATION ─────────────────────────────────────────────

export type ConsultationStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type ConsultationAdminStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface DentalConsultation {
  id: number | string;
  tenant_id: string;
  customer_id: number | string;
  appointment_id?: number | string;
  service_id?: number | string;
  consultation_date: string;
  status: ConsultationStatus;
  administrative_status: ConsultationAdminStatus;
  reason?: string;
  diagnosis?: string;
  clinical_notes?: string;
  indications?: string;
  total_amount: number;
  customer?: Customer;
  service?: DentalService;
  treatments?: DentalTreatment[];
  charges?: DentalCharge[];
  created_at: string;
  updated_at: string;
}

export interface DentalConsultationFormData {
  customer_id: number | string;
  appointment_id?: number | string;
  service_id?: number | string;
  reason?: string;
  diagnosis?: string;
  clinical_notes?: string;
  indications?: string;
  total_amount?: number;
}

// ─── CLINICAL HISTORY ─────────────────────────────────────────

export type ClinicalHistoryType = 'initial' | 'evolution' | 'diagnosis' | 'procedure_note' | 'follow_up' | 'general_note';

export interface DentalClinicalHistoryEntry {
  id: number | string;
  tenant_id: string;
  customer_id: number | string;
  consultation_id?: number | string;
  entry_date: string;
  type: ClinicalHistoryType;
  title?: string;
  description?: string;
  diagnosis?: string;
  clinical_notes?: string;
  indications?: string;
  created_at: string;
}

// ─── CHARGE ───────────────────────────────────────────────────

export type ChargeStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

export interface DentalCharge {
  id: number | string;
  tenant_id: string;
  customer_id: number | string;
  consultation_id?: number | string;
  service_id?: number | string;
  description?: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  status: ChargeStatus;
  due_date?: string;
  customer?: Customer;
  payments?: DentalPayment[];
  installments?: DentalInstallment[];
  created_at: string;
  updated_at: string;
}

// ─── PAYMENT ──────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'mobile_payment' | 'insurance' | 'other';

export interface DentalPayment {
  id: number | string;
  tenant_id: string;
  customer_id: number | string;
  charge_id: number | string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference?: string;
  notes?: string;
  created_at: string;
}

// ─── INSTALLMENT ──────────────────────────────────────────────

export type InstallmentStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface DentalInstallment {
  id: number | string;
  tenant_id: string;
  charge_id: number | string;
  customer_id: number | string;
  installment_number: number;
  amount: number;
  due_date: string;
  paid_amount: number;
  status: InstallmentStatus;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── DASHBOARD ────────────────────────────────────────────────

export interface DentalDashboardSummary {
  today_appointments_count: number;
  next_appointment?: DentalAppointment;
  patients_seen_today: number;
  total_charged_today: number;
  total_charged_month: number;
  total_pending: number;
  overdue_patients_count: number;
  overdue_installments_count: number;
  recent_consultations: DentalConsultation[];
}
