import axios from 'axios';
import { API_URL } from '@/config/api';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  async (error) => {
    const config = error.config;

    if (error.response) {
      // Enhanced 429 retry: Respect Retry-After header precisely
      if (error.response.status === 429) {
        config._retryCount = (config._retryCount || 0) + 1;
        if (config._retryCount > 3) return Promise.reject(error); // Max 3 retries

        // Parse Retry-After header (case-insensitive)
        const retryAfterLower = error.response.headers['retry-after'];
        const retryAfterUpper = error.response.headers['Retry-After'];
        const retryAfterSeconds = Number(retryAfterLower || retryAfterUpper || 0);
        const isLongDelay = retryAfterSeconds > 30;

        if (isLongDelay) {
          console.warn(`🚫 Rate limited on ${config.url}. Server says wait ${retryAfterSeconds}s. Skipping auto-retry.`);
        } else if (config._retryCount <= 3) {
          const delayMs = retryAfterSeconds > 0 
            ? retryAfterSeconds * 1000 
            : 1000 * Math.pow(1.5, config._retryCount - 1) + Math.random() * 500;
          config.retryAfterSeconds = retryAfterSeconds;
          await sleep(delayMs);
          return apiClient(config);
        }
      }

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
      
      // Preserve rate limit info for UI handling
      const retryAfterLower = error.response.headers['retry-after'];
      const retryAfterUpper = error.response.headers['Retry-After'];
      newError.retryAfterSeconds = Number(retryAfterLower || retryAfterUpper || 0);
      
      if (newError.retryAfterSeconds > 0) {
        console.warn(`⏳ Rate limit hit: ${config?.url || 'unknown'}, wait ${newError.retryAfterSeconds}s before retry.`);
      }
      
      return Promise.reject(newError);
    } else if (error.request) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    } else {
      return Promise.reject(error);
    }
  }
);

export default apiClient;
