import { defineStore } from 'pinia';
import { createHrCatalogStore } from './hrCatalogStoreFactory';
import { hrWorkShiftsService } from '../services/hrWorkShiftsService';
export const useHrWorkShiftsStore = defineStore('hrWorkShifts', () => createHrCatalogStore(hrWorkShiftsService, 'turnos'));
