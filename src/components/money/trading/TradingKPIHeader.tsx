import {
  TrendingUp,
  TrendingDown,
  Activity,
  Plus,
  Target,
} from 'lucide-react';
import { formatINR, formatINRCompact } from '../../../utils/formatters';
import { useMoneyPrivacy } from '../../../context/MoneyPrivacyContext';
import type { TradingStats } from '../../../interface';

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
            Institutional Execution Desk • Derivatives, Cash & Risk Engine
          </div>
          <h2 className="trading-section-title">
            Pro Trading Terminal & <span className="trading-cyan-gradient">Quantitative Blotter</span>
          </h2>
          <p className="trading-section-subtitle">
            Multi-timeframe technical charting, automated position sizing, F&O Greeks payoff lab, and pre-trade risk guardrails.
          </p>
        </div>

        <button onClick={onOpenAddModal} className="btn btn-primary trading-add-btn">
          <Plus size={16} /> Log Manual Trade
        </button>
      </div>

      {/* 6 Institutional KPI Cards Grid */}
      <div className="trading-kpi-grid">
        {/* Card 1: Capital Deployed & Portfolio Heat */}
        <div className="glass-panel trading-kpi-card">
          <div className="trading-kpi-top">
            <span className="trading-kpi-lbl">CAPITAL IN PLAY</span>
            <span className="badge badge-cyan">
              {stats.openTradesCount} Open
            </span>
          </div>
          <div className="trading-kpi-val font-mono">
            {mask(formatINRCompact(stats.capitalDeployed))}
          </div>
          <div className="trading-kpi-subtext">
            SL Risk Heat: <strong className="text-amber">{mask(formatINRCompact(stats.openHeatCapital))}</strong> ({stats.openHeatPct}%)
          </div>
        </div>

        {/* Card 2: Unrealized Mark-to-Market P&L */}
        <div className="glass-panel trading-kpi-card">
          <div className="trading-kpi-top">
            <span className="trading-kpi-lbl">UNREALIZED MTM</span>
            <span className={`badge ${isUnrealizedPositive ? 'badge-emerald' : 'badge-rose'}`}>
              {isUnrealizedPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              Live Open P&L
            </span>
          </div>
          <div className={`trading-kpi-val font-mono ${isUnrealizedPositive ? 'text-emerald' : 'text-rose'}`}>
            {mask(`${isUnrealizedPositive ? '+' : ''}${formatINR(stats.totalUnrealizedPnl)}`)}
          </div>
          <div className="trading-kpi-subtext">
            Floating mark-to-market across active positions
          </div>
        </div>

        {/* Card 3: Net Realized P&L (Post Charges) */}
        <div className="glass-panel trading-kpi-card">
          <div className="trading-kpi-top">
            <span className="trading-kpi-lbl">NET REALIZED P&L</span>
            <span className={`badge ${isRealizedPositive ? 'badge-emerald' : 'badge-rose'}`}>
              PF: {stats.profitFactor.toFixed(2)}
            </span>
          </div>
          <div className={`trading-kpi-val font-mono ${isRealizedPositive ? 'text-emerald' : 'text-rose'}`}>
            {mask(`${isRealizedPositive ? '+' : ''}${formatINR(stats.netRealizedPnl)}`)}
          </div>
          <div className="trading-kpi-subtext">
            Gross: {mask(formatINRCompact(stats.totalRealizedPnl))} • Taxes: ₹{stats.totalChargesPaid.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Card 4: Win Accuracy & Streaks */}
        <div className="glass-panel trading-kpi-card">
          <div className="trading-kpi-top">
            <span className="trading-kpi-lbl">WIN RATE & STREAK</span>
            <span className="badge badge-amber">
              {stats.winCount}W - {stats.lossCount}L
            </span>
          </div>
          <div className="trading-kpi-val font-mono text-amber">
            {stats.totalTrades > 0 ? `${stats.winRate}%` : '0.0%'}
          </div>
          <div className="trading-kpi-subtext">
            Expectancy: <strong className="text-emerald">+{mask(formatINRCompact(stats.expectancy))}/trade</strong> ({stats.expectancyR}R)
          </div>
        </div>

        {/* Card 5: Asymmetric R:R & Discipline */}
        <div className="glass-panel trading-kpi-card">
          <div className="trading-kpi-top">
            <span className="trading-kpi-lbl">ASYMMETRIC R:R</span>
            <span className="badge badge-cyan">
              <Target size={12} /> {stats.ruleComplianceScore}% Rule Sync
            </span>
          </div>
          <div className="trading-kpi-val font-mono text-cyan">
            1 : {stats.avgRiskReward}
          </div>
          <div className="trading-kpi-subtext">
            Sharpe: <strong>{stats.sharpeRatio}</strong> • Max DD: <strong className="text-rose">-{stats.maxDrawdownPct}%</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
