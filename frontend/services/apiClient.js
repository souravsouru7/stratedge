import axios from 'axios';
import { API_URL } from '@/config/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Auto-attach the token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Extract data and handle common errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      if (error.response.status === 401 && typeof window !== 'undefined') {
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }

      const errorMessage = error.response.data?.message || `Request failed with status ${error.response.status}`;
      const newError = new Error(errorMessage);
      newError.status = error.response.status;
      newError.data = error.response.data;
      return Promise.reject(newError);
    } else if (error.request) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    } else {
      return Promise.reject(error);
    }
  }
);

export default apiClient;
