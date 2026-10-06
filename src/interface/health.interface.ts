// ─── Backend & System Health Interfaces ───────────────────────────────────────

export interface BackendHealth {
  connected: boolean;
  mode: 'local' | 'remote';
  status?: string;
  service?: string;
  database?: string;
  timestamp?: number;
}
