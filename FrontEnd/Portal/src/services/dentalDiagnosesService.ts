import api from '../utils/axios';

export interface DentalDiagnosis {
  id: number;
  consultation_id: number;
  odontogram_entry_id: number | null;
  diagnosis_code: string | null;
  diagnosis_text: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes: string | null;
  created_at: string;
  odontogram_tooth: number | null;
  odontogram_finding: string | null;
}

export interface DiagnosisForm {
  diagnosis_text: string;
  diagnosis_code?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  notes?: string;
  odontogram_entry_id?: number | null;
}

const BASE = '/dental/consultations';

export const dentalDiagnosesService = {
  list(consultationId: number) {
    return api
      .get<{ data: DentalDiagnosis[] }>(`${BASE}/${consultationId}/diagnoses`)
      .then(r => r.data);
  },
  create(consultationId: number, data: DiagnosisForm) {
    return api
      .post<{ data: DentalDiagnosis }>(`${BASE}/${consultationId}/diagnoses`, data)
      .then(r => r.data);
  },
  remove(consultationId: number, id: number) {
    return api
      .delete<{ message: string }>(`${BASE}/${consultationId}/diagnoses/${id}`)
      .then(r => r.data);
  },
};
