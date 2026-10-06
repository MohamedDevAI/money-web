/**
 * Shared Axios instance for all API services.
 * Centralizes base URL, timeouts, headers, and error interceptors.
 */

import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 6000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Response Interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log API errors for debugging, but let callers handle them
    if (error.response) {
      console.warn(
        `[API ${error.response.status}] ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        error.response.data
      );
    } else if (error.request) {
      console.warn(`[API Timeout/Network] ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
