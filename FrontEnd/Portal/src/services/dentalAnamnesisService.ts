import api from '../utils/axios';

export interface DentalAnamnesis {
  id: number;
  consultation_id: number;
  has_diabetes: boolean;
  has_hypertension: boolean;
  has_heart_disease: boolean;
  has_respiratory_disease: boolean;
  has_kidney_disease: boolean;
  has_epilepsy: boolean;
  has_hepatitis: boolean;
  has_hiv: boolean;
  other_systemic_conditions: string | null;
  has_penicillin_allergy: boolean;
  has_aspirin_allergy: boolean;
  has_latex_allergy: boolean;
  has_anesthesia_allergy: boolean;
  other_allergies: string | null;
  current_medications: string | null;
  takes_anticoagulants: boolean;
  takes_bisphosphonates: boolean;
  previous_dental_treatments: string | null;
  previous_complications: string | null;
  last_dental_visit: string | null;
  smokes: boolean;
  alcohol_consumption: 'none' | 'occasional' | 'moderate' | 'heavy' | null;
  bruxism: boolean;
  additional_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DentalAnamnesisFormData = Omit<DentalAnamnesis, 'id' | 'consultation_id' | 'created_at' | 'updated_at'>;

const BASE = '/dental/consultations';

export const dentalAnamnesisService = {
  getByConsultation(consultationId: number) {
    return api
      .get<{ data: DentalAnamnesis | null }>(`${BASE}/${consultationId}/anamnesis`)
      .then(r => r.data);
  },
  upsert(consultationId: number, data: Partial<DentalAnamnesisFormData>) {
    return api
      .post<{ data: DentalAnamnesis }>(`${BASE}/${consultationId}/anamnesis`, data)
      .then(r => r.data);
  },
};
