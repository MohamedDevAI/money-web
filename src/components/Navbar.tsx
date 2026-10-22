import { useNavigate } from 'react-router-dom';
import {
  Database,
  Eye,
  EyeOff,
  Radio,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { BackendHealth, WatchlistInstrument } from '../interface';
import { useMoneyPrivacy } from '../context/MoneyPrivacyContext';
import { formatINR, formatPctChange } from '../utils/formatters';
import './Navbar.css';

interface NavbarProps {
  backendStatus: BackendHealth;
  watchlist?: WatchlistInstrument[];
  isLiveStreaming?: boolean;
  onToggleLiveStreaming?: () => void;
}

export default function Navbar({
  backendStatus,
  watchlist = [],
  isLiveStreaming = true,
  onToggleLiveStreaming,
}: NavbarProps) {
  const navigate = useNavigate();
  const { isMoneyHidden, toggleHideMoney, mask } = useMoneyPrivacy();

  const tapeSymbols = watchlist.slice(0, 8);
  const liveVix = watchlist[0]?.iv || 15.2;

  return (
    <div className="institutional-top-shell">
      {/* 1. Institutional Market Ticker Tape */}
      {tapeSymbols.length > 0 && (
        <div className="market-ticker-tape-bar">
          <div className="ticker-tape-left">
            <button
              type="button"
              onClick={onToggleLiveStreaming}
              className={`ticker-stream-toggle ${isLiveStreaming ? 'live' : 'paused'}`}
              title={isLiveStreaming ? 'Click to pause live market feed' : 'Click to resume live market feed'}
            >
              <Radio size={11} />
              <span>{isLiveStreaming ? 'NSE/BSE LIVE' : 'FEED PAUSED'}</span>
            </button>

            <div className="ticker-tape-items">
              {tapeSymbols.map((item) => {
                const isUp = item.change >= 0;
                return (
                  <div key={item.symbol} className="ticker-tape-chip font-mono">
                    <span className="tape-sym">{item.symbol}</span>
                    <span className="tape-ltp">{mask(formatINR(item.ltp))}</span>
                    <span className={`tape-chg ${isUp ? 'text-emerald' : 'text-rose'}`}>
                      {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {formatPctChange(item.changePct)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="ticker-tape-right font-mono">
            <span>INDIA VIX: <strong className="text-cyan">{liveVix}%</strong></span>
            <span>•</span>
            <span>EXCHANGES: <strong>NSE • BSE • NFO</strong></span>
          </div>
        </div>
      )}

      {/* 2. Main Command Header */}
      <header className="glass-panel navbar-header is-money-app">
        {/* Dynamic App Brand */}
        <div
          className="navbar-brand"
          onClick={() => navigate('/money')}
          style={{ cursor: 'pointer' }}
        >
          <div className="navbar-brand-icon money-brand-icon" style={{ padding: 0, overflow: 'hidden' }}>
            <svg width="34" height="34" viewBox="0 0 64 64" aria-label="Money Crest">
              <defs>
                <linearGradient id="navMoneyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
              <rect width="64" height="64" rx="14" fill="#071324" />
              <rect x="7" y="17" width="38" height="24" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
              <circle cx="26" cy="29" r="6" fill="#10b981" opacity="0.35" />
              <circle cx="42" cy="36" r="15" fill="url(#navMoneyGrad)" stroke="#fef08a" strokeWidth="2" />
              <text
                x="42"
                y="43"
                textAnchor="middle"
                fontFamily="Outfit, sans-serif"
                fontWeight="800"
                fontSize="20"
                fill="#060b16"
              >
                ₹
              </text>
            </svg>
          </div>
          <div>
            <div className="navbar-brand-title-wrap">
              <span className="navbar-brand-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Money <span className="gradient-text">OS</span> • Investing &amp; Trading
              </span>
            </div>
          </div>
        </div>

        {/* System Status & Controls */}
        <div className="navbar-actions">
          <button
            onClick={toggleHideMoney}
            className="btn-privacy-toggle"
            title={isMoneyHidden ? 'Show sensitive balances' : 'Hide sensitive balances'}
          >
            {isMoneyHidden ? <EyeOff size={15} color="#f43f5e" /> : <Eye size={15} color="#06b6d4" />}
            <span>{isMoneyHidden ? 'Balances Masked' : 'Balances Visible'}</span>
          </button>

          <div
            className={`backend-health-indicator ${backendStatus.connected ? 'connected' : 'hybrid'
              }`}
            title={`Backend Mode: ${backendStatus.connected ? 'Spring Boot + MongoDB Live' : 'Hybrid Local Ledger Active'}`}
          >
            <Database
              size={13}
              className={backendStatus.connected ? 'text-emerald' : 'text-cyan'}
            />
            <span className="status-label font-mono">
              {backendStatus.connected ? 'API CONNECTED' : 'LOCAL ENGINE READY'}
            </span>
          </div>
        </div>
      </header>
    </div>
  );
}
