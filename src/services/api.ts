/**
 * Core API service for Money OS.
 * Communicates with backend via apiClient.
 */

import { BackendHealth } from '../interface';
import apiClient from './apiClient';

// ─── Backend Health Check ─────────────────────────────────────────────────────

export const checkBackendHealth = async (): Promise<BackendHealth> => {
  try {
    const res = await fetch(`${apiClient.defaults.baseURL}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const data = await res.json();
      return { connected: true, mode: 'remote', ...data };
    }
    return { connected: false, mode: 'local' };
  } catch {
    return { connected: false, mode: 'local' };
  }
};

export const api = {};

export default api;
