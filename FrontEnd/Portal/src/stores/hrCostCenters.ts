import { defineStore } from 'pinia';
import { createHrCatalogStore } from './hrCatalogStoreFactory';
import { hrCostCentersService } from '../services/hrCostCentersService';
export const useHrCostCentersStore = defineStore('hrCostCenters', () => createHrCatalogStore(hrCostCentersService, 'centros de costo'));
