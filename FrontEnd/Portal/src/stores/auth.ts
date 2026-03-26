import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../utils/axios';
import type { User, Company } from '../types/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));
  const companies = ref<Company[]>([]);
  const currentCompany = ref<Company | null>(null);
  
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
      
      const { company, token: finalToken } = response.data;
      
      currentCompany.value = company;
      token.value = finalToken;
      
      localStorage.setItem('token', finalToken);
      localStorage.setItem('currentCompany', JSON.stringify(company));
      
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
    localStorage.removeItem('token');
    localStorage.removeItem('currentCompany');
    // Router redirect should be handled by the component calling logout
  }

  async function checkAuth() {
    if (!token.value) return false;
    
    try {
      const response = await api.get('/auth/me');
      user.value = response.data.user;
      
      // Restore company if stored
      const storedCompany = localStorage.getItem('currentCompany');
      if (storedCompany) {
        currentCompany.value = JSON.parse(storedCompany);
      }
      
      return true;
    } catch (error) {
      logout();
      return false;
    }
  }

  return {
    user,
    token,
    companies,
    currentCompany,
    isAuthenticated,
    login,
    selectCompany,
    logout,
    checkAuth
  };
});
