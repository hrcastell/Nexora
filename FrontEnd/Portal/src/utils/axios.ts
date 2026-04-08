import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle errors (e.g., 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const msg: string = error.response.data?.error ?? '';
      const isRealAuthFailure =
        msg.includes('Token expirado') ||
        msg.includes('Token inválido') ||
        msg.includes('No token') ||
        msg.includes('no encontrado o inactivo');
      if (isRealAuthFailure && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('currentCompany');
        localStorage.removeItem('nexora_read_only');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
