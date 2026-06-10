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
  address?: string;
  city?: string;
  notes?: string;
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
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

// Patient = Customer + Profile combined (API returns flat — profile fields are top-level)
export interface DentalPatient extends Customer {
  dental_profile?: DentalPatientProfile;
  // Flat profile fields returned directly by the API JOIN query
  dental_profile_id?: number;
  medical_background?: string;
  allergies?: string;
  blood_type?: string;
  current_medications?: string;
  chronic_conditions?: string;
  dental_observations?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  dental_notes?: string;
  photo_url?: string | null;
}

export interface DentalPatientFormData {
  customer_id?: number | string;
  first_name: string;
  last_name: string;
  document_type?: string;
  document_number?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  customer_notes?: string;
  medical_background?: string;
  allergies?: string;
  blood_type?: string;
  current_medications?: string;
  chronic_conditions?: string;
  dental_observations?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

// ─── TREATMENT (billable catalog — replaces old Service) ──────

export interface DentalTreatment {
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
  category?: string;
  procedure_code?: string;
  requires_follow_up?: boolean;
  requires_multiple_sessions?: boolean;
  contraindications?: string;
  post_treatment_instructions?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DentalTreatmentFormData {
  name: string;
  description?: string;
  price_mode: 'manual' | 'calculated';
  supplies_cost?: number;
  labor_cost?: number;
  tax_rate?: number;
  profit_margin?: number;
  manual_price?: number;
  estimated_duration_minutes?: number;
  category?: string;
  procedure_code?: string;
  requires_follow_up?: boolean;
  requires_multiple_sessions?: boolean;
  contraindications?: string;
  post_treatment_instructions?: string;
  is_active?: boolean;
}

// Backward-compatible alias (for code that still uses DentalService)
export type DentalService = DentalTreatment;
export type DentalServiceFormData = DentalTreatmentFormData;
export interface DentalServiceTreatment {
  treatment_id: number | string;
  treatment_name?: string;
  quantity: number;
}

// ─── APPOINTMENT ──────────────────────────────────────────────

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';

export interface DentalAppointment {
  id: number | string;
  tenant_id: string;
  customer_id: number | string;
  treatment_id?: number | string;
  scheduled_start: string;
  scheduled_end: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  reminder_email_sent_at?: string;
  customer?: Customer;
  treatment?: DentalTreatment;
  created_at: string;
  updated_at: string;
}

export interface DentalAppointmentFormData {
  customer_id: number | string;
  treatment_id?: number | string;
  scheduled_start: string;
  scheduled_end: string;
  reason?: string;
  notes?: string;
}

// ─── CONSULTATION ─────────────────────────────────────────────

export type ConsultationStatus =
  | 'borrador' | 'creada' | 'en_evaluacion' | 'cotizada'
  | 'propuesta_pendiente' | 'aceptada' | 'en_tratamiento' | 'sesion_pendiente'
  | 'finalizada_clinicamente' | 'pendiente_pago' | 'cerrada' | 'rechazada'
  | 'cancelled' | 'no_show' | 'voided';

export type ConsultationAdminStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  borrador:                'Borrador',
  creada:                  'Creada',
  en_evaluacion:           'En Evaluación',
  cotizada:                'Cotizada',
  propuesta_pendiente:     'Propuesta Pendiente',
  aceptada:                'Aceptada',
  en_tratamiento:          'En Tratamiento',
  sesion_pendiente:        'Sesión Pendiente',
  finalizada_clinicamente: 'Finalizada',
  pendiente_pago:          'Pendiente Pago',
  cerrada:                 'Cerrada',
  rechazada:               'Rechazada',
  cancelled:               'Cancelada',
  no_show:                 'No Se Presentó',
  voided:                  'Anulada',
};

export const CONSULTATION_STATUS_COLORS: Record<ConsultationStatus, string> = {
  borrador:                'gray',
  creada:                  'blue',
  en_evaluacion:           'indigo',
  cotizada:                'violet',
  propuesta_pendiente:     'amber',
  aceptada:                'cyan',
  en_tratamiento:          'green',
  sesion_pendiente:        'yellow',
  finalizada_clinicamente: 'teal',
  pendiente_pago:          'orange',
  cerrada:                 'slate',
  rechazada:               'red',
  cancelled:               'red',
  no_show:                 'zinc',
  voided:                  'zinc',
};

export interface DentalConsultation {
  id: number | string;
  tenant_id: string;
  customer_id: number | string;
  appointment_id?: number | string;
  treatment_id?: number | string;
  consultation_date: string;
  status: ConsultationStatus;
  administrative_status: ConsultationAdminStatus;
  reason?: string;
  diagnosis?: string;
  clinical_notes?: string;
  indications?: string;
  total_amount: number;
  customer?: Customer;
  treatment?: DentalTreatment;
  charges?: DentalCharge[];
  requires_follow_up?: boolean;
  requires_multiple_sessions?: boolean;
  estimated_sessions?: number | null;
  next_session_date?: string | null;
  follow_up_notes?: string | null;
  professional_id?: number | null;
  created_by?: number | null;
  updated_by?: number | null;
  consultation_treatments?: DentalConsultationTreatment[];
  sessions?: DentalConsultationSession[];
  created_at: string;
  updated_at: string;
}

export interface DentalConsultationFormData {
  customer_id: number | string;
  appointment_id?: number | string;
  treatment_id?: number | string;
  reason?: string;
  diagnosis?: string;
  clinical_notes?: string;
  indications?: string;
  total_amount?: number;
  requires_follow_up?: boolean;
  requires_multiple_sessions?: boolean;
  estimated_sessions?: number;
  next_session_date?: string;
  follow_up_notes?: string;
  professional_id?: number;
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

// ─── CONSULTATION PHOTO ───────────────────────────────────────

export type PhotoStage = 'before' | 'after';

export interface DentalConsultationPhoto {
  id: number | string;
  tenant_id: string;
  consultation_id: number | string;
  photo_url: string;
  stage: PhotoStage;
  caption?: string;
  sort_order: number;
  uploaded_by?: number | string;
  created_at: string;
}

// ─── CHARGE ───────────────────────────────────────────────────

export type ChargeStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

export interface DentalCharge {
  id: number | string;
  tenant_id: string;
  customer_id: number | string;
  consultation_id?: number | string;
  treatment_id?: number | string;
  description?: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  status: ChargeStatus;
  administrative_status?: string;
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

// ─── MEDICAL HISTORY ──────────────────────────────────────────

export interface DentalMedicalHistory {
  id: number;
  customer_id: number;
  entry_date: string;
  blood_type?: string;
  medical_background?: string;
  allergies?: string;
  current_medications?: string;
  chronic_conditions?: string;
  dental_observations?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
}

// ─── CONSULTATION TREATMENTS (multi-treatment per consultation) ──────────

export interface DentalConsultationTreatment {
  id: number;
  tenant_id: number;
  consultation_id: number;
  treatment_id?: number | null;
  treatment_name_snapshot: string;
  treatment_name_current?: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  tooth_reference?: string | null;
  clinical_notes?: string | null;
  status: 'active' | 'voided';
  created_at: string;
  updated_at: string;
  created_by?: number | null;
}

export interface DentalConsultationTreatmentFormData {
  treatment_id?: number | null;
  treatment_name_snapshot?: string;
  unit_price: number;
  quantity: number;
  tooth_reference?: string;
  clinical_notes?: string;
}

// Backward-compatible aliases
export type DentalConsultationService = DentalConsultationTreatment;
export type DentalConsultationServiceFormData = DentalConsultationTreatmentFormData;

// ─── CONSULTATION SESSIONS ────────────────────────────────────────────────

export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface DentalConsultationSession {
  id: number;
  tenant_id: number;
  consultation_id: number;
  session_number: number;
  session_date: string;
  professional_id?: number | null;
  status: SessionStatus;
  notes?: string | null;
  evolution?: string | null;
  next_session_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DentalConsultationSessionFormData {
  session_date?: string;
  professional_id?: number;
  notes?: string;
  evolution?: string;
  next_session_date?: string;
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

// ─── CONSULTATION ATTACHMENT ──────────────────────────────────

export type AttachmentCategory = 'xray' | 'lab_result' | 'prescription' | 'consent' | 'referral' | 'general';

export interface DentalConsultationAttachment {
  id: number;
  tenant_id: string;
  consultation_id: number;
  file_url: string;
  file_name: string;
  file_type?: string;
  file_size_bytes?: number;
  category: AttachmentCategory;
  description?: string;
  uploaded_by?: number;
  created_at: string;
}

export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  xray:         'Radiografía',
  lab_result:   'Resultado de laboratorio',
  prescription: 'Prescripción',
  consent:      'Consentimiento informado',
  referral:     'Derivación',
  general:      'General',
};

// ─── QUOTES ──────────────────────────────────────────────────

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface DentalQuoteItem {
  id: number;
  tenant_id: string;
  quote_id: number;
  treatment_id?: number;
  treatment_name_snapshot: string;
  description?: string;
  tooth_reference?: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  sort_order: number;
}

export interface DentalQuote {
  id: number;
  tenant_id: string;
  customer_id: number;
  quote_number: string;
  quote_date: string;
  valid_until?: string;
  status: QuoteStatus;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  notes?: string;
  conditions_text?: string;
  professional_id?: number;
  accepted_at?: string;
  accepted_by_name?: string;
  acceptance_notes?: string;
  rejected_at?: string;
  rejection_reason?: string;
  consultation_id?: number;
  converted_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields (list/getById)
  customer_first_name?: string;
  customer_last_name?: string;
  customer_document_type?: string;
  customer_document_number?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  items?: DentalQuoteItem[];
}

export interface DentalQuoteFormData {
  customer_id: number | string;
  valid_until?: string;
  notes?: string;
  conditions_text?: string;
  professional_id?: number | string;
  discount_amount?: number;
  items?: DentalQuoteItemFormData[];
}

export interface DentalQuoteItemFormData {
  treatment_id?: number | string;
  treatment_name_snapshot: string;
  description?: string;
  tooth_reference?: string;
  unit_price: number | string;
  quantity: number | string;
  sort_order?: number;
}

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft:     'Borrador',
  sent:      'Enviado',
  accepted:  'Aceptado',
  rejected:  'Rechazado',
  expired:   'Vencido',
  converted: 'Convertido',
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft:     'text-white/50 bg-white/10',
  sent:      'text-blue-300 bg-blue-500/20',
  accepted:  'text-green-300 bg-green-500/20',
  rejected:  'text-red-300 bg-red-500/20',
  expired:   'text-orange-300 bg-orange-500/20',
  converted: 'text-purple-300 bg-purple-500/20',
};
