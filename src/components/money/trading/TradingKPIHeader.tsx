import {
  TrendingUp,
  TrendingDown,
  Activity,
  Plus,
  Target
} from 'lucide-react';
import { formatINR, formatINRCompact } from '../../../utils/formatters';
import { useMoneyPrivacy } from '../../../context/MoneyPrivacyContext';
import type { TradingStats } from '../../../types';

interface TradingKPIHeaderProps {
  stats: TradingStats;
  onOpenAddModal: () => void;
}

export default function TradingKPIHeader({ stats, onOpenAddModal }: TradingKPIHeaderProps) {
  const { mask } = useMoneyPrivacy();

  const isRealizedPositive = stats.totalRealizedPnl >= 0;
  const isUnrealizedPositive = stats.totalUnrealizedPnl >= 0;

  return (
    <div className="trading-kpi-container">
      {/* Top Banner Row */}
      <div className="trading-kpi-banner">
        <div>
          <div className="trading-sub-badge">
            <Activity size={13} style={{ display: 'inline', marginRight: 5 }} />
            Active Trading Desk & Derivatives
          </div>
          <h2 className="trading-section-title">
            Trading Positions & <span className="trading-cyan-gradient">Execution Desk</span>
          </h2>
          <p className="trading-section-subtitle">
            Live journal for equities, options & futures with real-time risk-reward ratios and P&L analytics.
          </p>
        </div>

        <button onClick={onOpenAddModal} className="btn btn-primary trading-add-btn">
          <Plus size={16} /> Log New Trade
        </button>
      </div>

      {/* 5 KPI Cards Grid */}
      <div className="trading-kpi-grid">
        {/* Card 1: Capital Deployed */}
        <div className="glass-panel trading-kpi-card">
          <div className="trading-kpi-top">
            <span className="trading-kpi-lbl">CAPITAL IN PLAY</span>
            <span className="badge badge-indigo">
              {stats.openTradesCount} Active Positions
            </span>
          </div>
          <div className="trading-kpi-val">
            {mask(formatINRCompact(stats.capitalDeployed))}
          </div>
          <div className="trading-kpi-subtext">
            Actual entry value in open market positions
          </div>
        </div>

        {/* Card 2: Unrealized P&L */}
        <div className="glass-panel trading-kpi-card">
          <div className="trading-kpi-top">
            <span className="trading-kpi-lbl">UNREALIZED P&L</span>
            <span className={`badge ${isUnrealizedPositive ? 'badge-emerald' : 'badge-rose'}`}>
              {isUnrealizedPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              Open Mark-to-Market
            </span>
          </div>
          <div className={`trading-kpi-val ${isUnrealizedPositive ? 'trading-pnl-green' : 'trading-pnl-red'}`}>
            {mask(`${isUnrealizedPositive ? '+' : ''}${formatINR(stats.totalUnrealizedPnl)}`)}
          </div>
          <div className="trading-kpi-subtext">
            Floating gain/loss on currently active trades
          </div>
        </div>

        {/* Card 3: Realized P&L */}
        <div className="glass-panel trading-kpi-card">
          <div className="trading-kpi-top">
            <span className="trading-kpi-lbl">REALIZED P&L</span>
            <span className={`badge ${isRealizedPositive ? 'badge-emerald' : 'badge-rose'}`}>
              {isRealizedPositive ? '+' : ''}Booked
            </span>
          </div>
          <div className={`trading-kpi-val ${isRealizedPositive ? 'trading-pnl-green' : 'trading-pnl-red'}`}>
            {mask(`${isRealizedPositive ? '+' : ''}${formatINR(stats.totalRealizedPnl)}`)}
          </div>
          <div className="trading-kpi-subtext">
            Locked returns from settled & closed positions
          </div>
        </div>

        {/* Card 4: Win Rate % */}
        <div className="glass-panel trading-kpi-card">
          <div className="trading-kpi-top">
            <span className="trading-kpi-lbl">WIN ACCURACY</span>
            <span className="badge badge-amber">
              {stats.winCount}W - {stats.lossCount}L
            </span>
          </div>
          <div className="trading-kpi-val text-amber">
            {stats.totalTrades > 0 ? `${stats.winRate}%` : '0.0%'}
          </div>
          <div className="trading-kpi-subtext">
            {stats.winCount + stats.lossCount} closed trades evaluated
          </div>
        </div>

        {/* Card 5: Average Risk-Reward Ratio */}
        <div className="glass-panel trading-kpi-card">
          <div className="trading-kpi-top">
            <span className="trading-kpi-lbl">AVG RISK : REWARD</span>
            <span className="badge badge-cyan">
              <Target size={12} /> Discipline
            </span>
          </div>
          <div className="trading-kpi-val text-cyan">
            1 : {stats.avgRiskReward}
          </div>
          <div className="trading-kpi-subtext">
            Average planned upside to stop-loss downside
          </div>
        </div>
      </div>
    </div>
  );
}
