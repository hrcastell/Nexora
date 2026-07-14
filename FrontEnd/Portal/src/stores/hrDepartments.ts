import { defineStore } from 'pinia';
import { createHrCatalogStore } from './hrCatalogStoreFactory';
import { hrDepartmentsService } from '../services/hrDepartmentsService';
export const useHrDepartmentsStore = defineStore('hrDepartments', () => createHrCatalogStore(hrDepartmentsService, 'departamentos'));
