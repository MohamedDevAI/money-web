import { NavLink, useNavigate } from 'react-router-dom';
import { Coins, Database, Eye, EyeOff } from 'lucide-react';
import type { BackendHealth } from '../types';
import { useMoneyPrivacy } from '../context/MoneyPrivacyContext';
import './Navbar.css';

interface NavbarProps {
  backendStatus: BackendHealth;
}

export default function Navbar({ backendStatus }: NavbarProps) {
  const navigate = useNavigate();
  const { isMoneyHidden, toggleHideMoney } = useMoneyPrivacy();

  return (
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
            <span className="badge badge-orange navbar-pro-badge">
              STANDALONE SUITE
            </span>
          </div>
          <div className="navbar-brand-subtitle">
            Wealth, Investments, Trading & Financial Health
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="app-switcher-container">
        <div className="app-switcher-tabs">
          <NavLink
            to="/money"
            className={({ isActive }) =>
              `app-switcher-btn ${isActive ? 'active-money-os' : ''}`
            }
          >
            <Coins size={15} />
            <span>Wealth & Investments Hub</span>
          </NavLink>
        </div>
      </div>

      {/* System Status & Controls */}
      <div className="navbar-actions">
        <button
          onClick={toggleHideMoney}
          className="btn-privacy-toggle"
          title={isMoneyHidden ? 'Show sensitive balances' : 'Hide sensitive balances'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'var(--text-secondary, #a1a1aa)',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          {isMoneyHidden ? <EyeOff size={15} color="#ec4899" /> : <Eye size={15} />}
          <span>{isMoneyHidden ? 'Hidden' : 'Visible'}</span>
        </button>

        <div className="backend-health-indicator" title={`Backend Status: ${backendStatus.status}`}>
          <Database size={14} className={backendStatus.status === 'UP' ? 'text-success' : 'text-danger'} />
          <span className="status-label">{backendStatus.status === 'UP' ? 'Backend Live' : 'Connecting...'}</span>
        </div>
      </div>
    </header>
  );
}
