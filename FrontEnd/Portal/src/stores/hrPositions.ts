import { defineStore } from 'pinia';
import { createHrCatalogStore } from './hrCatalogStoreFactory';
import { hrPositionsService } from '../services/hrPositionsService';
export const useHrPositionsStore = defineStore('hrPositions', () => createHrCatalogStore(hrPositionsService, 'posiciones'));
