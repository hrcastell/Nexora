import api from '../utils/axios';
import type { VehicleHistory } from '../types/garage';

export const garageVehicleHistoryService = {
  getByVehicle(vehicleId: number) {
    return api.get<VehicleHistory>(`/garage/vehicles/${vehicleId}/history`);
  },
};
