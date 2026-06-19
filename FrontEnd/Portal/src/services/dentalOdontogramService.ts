import api from '../utils/axios';

export interface OdontogramEntry {
  id: number;
  patient_id: number;
  consultation_id: number;
  tooth_number: number;
  surface: string | null;
  finding_type: string;
  finding_status: string;
  priority: string;
  observation: string | null;
  procedure_suggestion_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface OdontogramEntryForm {
  id?: number;
  patient_id: number;
  tooth_number: number;
  surface?: string | null;
  finding_type: string;
  finding_status?: string;
  priority?: string;
  observation?: string | null;
  procedure_suggestion_id?: number | null;
}

const PATIENTS_BASE = '/dental/patients';
const CONSULTATIONS_BASE = '/dental/consultations';

export const dentalOdontogramService = {
  getByPatient(patientId: number) {
    return api
      .get<{ data: OdontogramEntry[] }>(`${PATIENTS_BASE}/${patientId}/odontogram`)
      .then(r => r.data);
  },
  getByConsultation(consultationId: number) {
    return api
      .get<{ data: OdontogramEntry[] }>(`${CONSULTATIONS_BASE}/${consultationId}/odontogram`)
      .then(r => r.data);
  },
  upsertEntry(consultationId: number, data: OdontogramEntryForm) {
    return api
      .post<{ data: OdontogramEntry }>(`${CONSULTATIONS_BASE}/${consultationId}/odontogram`, data)
      .then(r => r.data);
  },
  deleteEntry(consultationId: number, entryId: number) {
    return api
      .delete<{ data: { id: number } }>(`${CONSULTATIONS_BASE}/${consultationId}/odontogram/${entryId}`)
      .then(r => r.data);
  },
};
