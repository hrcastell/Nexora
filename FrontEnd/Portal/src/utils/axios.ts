import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add token and fix Content-Type for FormData uploads
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    // Let the browser/Axios set Content-Type automatically for FormData
    // (multipart/form-data with correct boundary). Deleting it here overrides
    // the 'application/json' default set in axios.create() above.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle errors — only reject, never redirect directly.
// Logout/redirect decisions belong to the auth store and router guard,
// not here. Doing it here caused double-logout races on mobile refresh.
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
