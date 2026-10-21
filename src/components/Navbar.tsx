import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  Coins,
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

  const tapeSymbols = watchlist.slice(0, 6);

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
              <span>{isLiveStreaming ? 'NSE/NFO LIVE' : 'FEED PAUSED'}</span>
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
            <span>INDIA VIX: <strong className="text-cyan">13.42 (-1.8%)</strong></span>
            <span>•</span>
            <span>USD/INR: <strong>84.08</strong></span>
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
          <div className="navbar-brand-icon money-brand-icon">
            <Coins size={22} color="#ffffff" />
          </div>
          <div>
            <div className="navbar-brand-title-wrap">
              <span className="navbar-brand-title">
                Money <span className="gradient-text">OS</span>
              </span>
              <span className="badge badge-cyan navbar-pro-badge">
                INSTITUTIONAL TERMINAL
              </span>
            </div>
            <div className="navbar-brand-subtitle">
              Wealth Portfolio, Quant Analytics, Derivatives & Pro Execution Desk
            </div>
          </div>
        </div>

        {/* Navigation Pill */}
        <div className="app-switcher-container">
          <div className="app-switcher-tabs">
            <NavLink
              to="/money"
              className={({ isActive }) =>
                `app-switcher-btn ${isActive ? 'active-money-os' : ''}`
              }
            >
              <Activity size={15} />
              <span>Wealth & Trading Terminal</span>
            </NavLink>
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
            className={`backend-health-indicator ${
              backendStatus.connected ? 'connected' : 'hybrid'
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
