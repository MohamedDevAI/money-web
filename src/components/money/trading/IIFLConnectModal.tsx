import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  ShieldCheck,
  X,
} from 'lucide-react';
import { IIFLConnectionState } from '../../../services/iiflService';

interface IIFLConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionState: IIFLConnectionState;
  onAuthenticate: (params: {
    redirectUrlOrAuthCode?: string;
    clientId?: string;
    userSessionToken?: string;
  }) => Promise<IIFLConnectionState>;
}

export default function IIFLConnectModal({
  isOpen,
  onClose,
  connectionState,
  onAuthenticate,
}: IIFLConnectModalProps) {
  const [clientId, setClientId] = useState<string>(connectionState.clientId || '');
  const [redirectUrlOrAuthCode, setRedirectUrlOrAuthCode] = useState<string>('');
  const [userSessionToken, setUserSessionToken] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const nextState = await onAuthenticate({
        clientId,
        redirectUrlOrAuthCode,
        userSessionToken,
      });
      if (nextState.marketDataConnected) {
        setStatusMsg('IIFL Capital Session Authenticated! Streaming live market data.');
        setTimeout(() => {
          onClose();
        }, 900);
      } else {
        setStatusMsg(nextState.errorMessage || 'Authentication failed. Check your Client ID & Auth Code.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card glass-panel"
        style={{ maxWidth: 540, width: '94%', padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={18} className="text-cyan" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                IIFL Capital | Markets&apos; APIs Connection
              </h3>
              <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                App: MoneyHubTrader • App Key: tns1BhogmfWyBID (Active)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-glass"
            style={{ padding: 6, borderRadius: 8 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Step 1: Launch IIFL SSO */}
        <div
          style={{
            padding: 14,
            borderRadius: 10,
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Step 1 — Daily 2FA Login on IIFL Capital
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.45 }}>
            IIFL Capital requires a daily 2FA login to issue your session <code className="font-mono">authcode</code>.
            If your App Redirect URL is set to <code className="font-mono">http://localhost:5173/money</code>, logging in will automatically connect this terminal.
          </p>
          <a
            href={connectionState.oauthLoginUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', textDecoration: 'none' }}
          >
            <ExternalLink size={14} /> Launch IIFL Capital Login (MoneyHubTrader)
          </a>
        </div>

        {/* Step 2: Paste Redirect URL / AuthCode or Session Token */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Step 2 — Or Paste Redirected URL / Auth Code / Session Token
          </div>

          <div className="pro-field-box">
            <label>Redirect URL or Daily Auth Code (from browser address bar after login)</label>
            <input
              type="text"
              placeholder="e.g. https://.../?authcode=XYZ123&clientid=AB1234 or just XYZ123"
              value={redirectUrlOrAuthCode}
              onChange={(e) => setRedirectUrlOrAuthCode(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="pro-field-box">
            <label>IIFL Client ID (if not included in Redirect URL above)</label>
            <input
              type="text"
              placeholder="Your IIFL Client ID (e.g. KALANTHA / Client Code)"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="pro-field-box">
            <label>Or Direct Bearer UserSession JWT Token (Optional)</label>
            <input
              type="password"
              placeholder="Paste existing userSession token if already generated"
              value={userSessionToken}
              onChange={(e) => setUserSessionToken(e.target.value)}
              className="font-mono"
            />
          </div>

          {statusMsg && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: '0.78rem',
                background: connectionState.marketDataConnected
                  ? 'rgba(16, 185, 129, 0.14)'
                  : 'rgba(245, 158, 11, 0.14)',
                color: connectionState.marketDataConnected ? '#10b981' : '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CheckCircle2 size={14} />
              <span>{statusMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" className="btn-glass" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <KeyRound size={14} />{' '}
              {isSubmitting ? 'Authenticating SHA-256 Session...' : 'Authenticate & Stream Live Data'}
            </button>
          </div>
        </form>

        <div
          style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: '1px solid rgba(148, 163, 184, 0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
          }}
        >
          <ShieldCheck size={13} className="text-emerald" />
          <span>
            SHA-256 checksum (<code className="font-mono">clientId + authCode + appSecret</code>) is computed locally via Web Crypto.
          </span>
        </div>
      </div>
    </div>
  );
}
