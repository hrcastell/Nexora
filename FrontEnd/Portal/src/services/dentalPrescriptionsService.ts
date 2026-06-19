import api from '../utils/axios';

export interface DentalPrescription {
  id: number;
  consultation_id: number;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string | null;
  instructions: string | null;
  created_at: string;
}

export interface PrescriptionForm {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  instructions?: string;
}

const BASE = '/dental/consultations';

export const dentalPrescriptionsService = {
  list(consultationId: number) {
    return api
      .get<{ data: DentalPrescription[] }>(`${BASE}/${consultationId}/prescriptions`)
      .then(r => r.data);
  },
  create(consultationId: number, data: PrescriptionForm) {
    return api
      .post<{ data: DentalPrescription }>(`${BASE}/${consultationId}/prescriptions`, data)
      .then(r => r.data);
  },
  remove(consultationId: number, prescriptionId: number) {
    return api
      .delete<{ data: { id: number } }>(`${BASE}/${consultationId}/prescriptions/${prescriptionId}`)
      .then(r => r.data);
  },
};
