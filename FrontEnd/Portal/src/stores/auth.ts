import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../utils/axios';
import type { User, Company } from '../types/auth';
import { useVisualConfigStore } from './visualConfig';
import { useMenuStore } from './menu';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));
  const companies = ref<Company[]>([]);
  const currentCompany = ref<Company | null>(null);
  const readOnly = ref<boolean>(false);
  
  const isAuthenticated = computed(() => !!token.value);

  async function login(email: string, password: string) {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      const { user: userData, companies: userCompanies, token: tempToken } = response.data;
      
      user.value = userData;
      companies.value = userCompanies;
      token.value = tempToken;
      
      localStorage.setItem('token', tempToken);

      // Return true if login successful
      return true;
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  }

  async function selectCompany(companyId: number) {
    try {
      const response = await api.post('/auth/select-company', { companyId });
      
      const { company, token: finalToken, read_only } = response.data;
      
      currentCompany.value = company;
      token.value = finalToken;
      readOnly.value = !!read_only;
      
      localStorage.setItem('token', finalToken);
      localStorage.setItem('currentCompany', JSON.stringify(company));
      localStorage.setItem('nexora_read_only', read_only ? '1' : '0');
      
      // Load dynamic menu (modules + transactions) for this company
      const menuStore = useMenuStore();
      await menuStore.loadMenu();

      return true;
    } catch (error) {
      console.error('Select company failed', error);
      throw error;
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    companies.value = [];
    currentCompany.value = null;
    readOnly.value = false;
    localStorage.removeItem('token');
    localStorage.removeItem('currentCompany');
    localStorage.removeItem('nexora_read_only');
    // Clear dynamic menu so next user doesn't see cached items
    const menuStore = useMenuStore();
    menuStore.reset();
  }

  async function checkAuth() {
    if (!token.value) return false;
    
    try {
      const response = await api.get('/auth/me');
      user.value = response.data.user;
      
      const storedCompany = localStorage.getItem('currentCompany');
      if (storedCompany) {
        currentCompany.value = JSON.parse(storedCompany);
      }

      if (response.data.context) {
        readOnly.value = !!response.data.context.read_only;
        if (currentCompany.value && response.data.context.commercial_status) {
          currentCompany.value = {
            ...currentCompany.value,
            commercial_status: response.data.context.commercial_status
          };
        }
      } else {
        readOnly.value = localStorage.getItem('nexora_read_only') === '1';
      }

      // Load user-specific visual config from DB
      const visualConfig = useVisualConfigStore();
      await visualConfig.loadFromApi();

      // Load dynamic menu (modules + transactions) for this company
      const menuStore = useMenuStore();
      await menuStore.loadMenu();

      return true;
    } catch (error: any) {
      // Only clear session on actual auth rejections (401/403).
      // Do NOT logout on 500 or network errors — that would wipe a valid token.
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        logout();
      }
      return false;
    }
  }

  return {
    user,
    token,
    companies,
    currentCompany,
    isAuthenticated,
    readOnly,
    login,
    selectCompany,
    logout,
    checkAuth
  };
});
