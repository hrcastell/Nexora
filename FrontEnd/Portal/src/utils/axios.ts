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

// Interceptor to handle errors — only reject, never redirect directly.
// Logout/redirect decisions belong to the auth store and router guard,
// not here. Doing it here caused double-logout races on mobile refresh.
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
