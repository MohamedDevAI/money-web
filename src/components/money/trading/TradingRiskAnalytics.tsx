import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Award,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { evaluateRiskGuardrails } from '../../../domain/riskGuardrails';
import { tradingService } from '../../../services/tradingService';
import { formatINR, formatINRCompact } from '../../../utils/formatters';
import { useMoneyPrivacy } from '../../../context/MoneyPrivacyContext';
import type { Trade, TradingRiskConfig, TradingStats } from '../../../interface';

interface TradingRiskAnalyticsProps {
  trades: Trade[];
  stats: TradingStats;
  riskConfig: TradingRiskConfig;
  onUpdateRiskConfig: (next: TradingRiskConfig) => void;
}

export default function TradingRiskAnalytics({
  trades,
  stats,
  riskConfig,
  onUpdateRiskConfig,
}: TradingRiskAnalyticsProps) {
  const { mask } = useMoneyPrivacy();
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [draftConfig, setDraftConfig] = useState<TradingRiskConfig>(riskConfig);

  const equityData = tradingService.getEquityCurveData(trades);
  const guardrailStatus = evaluateRiskGuardrails(riskConfig, trades);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRiskConfig(draftConfig);
    setShowConfigEditor(false);
  };

  return (
    <div className="risk-analytics-container">
      {/* ─── 1. INSTITUTIONAL RISK GUARDRAIL & KILL-SWITCH COMMAND HEADER ─── */}
      <div className="glass-panel risk-command-banner">
        <div className="risk-banner-top">

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setDraftConfig(riskConfig);
              setShowConfigEditor(!showConfigEditor);
            }}
          >
            <Sliders size={14} /> {showConfigEditor ? 'Close Risk Rules' : 'Configure Risk Rules'}
          </button>
        </div>

        {/* Configurable Risk Rules Drawer */}
        {showConfigEditor && (
          <form onSubmit={handleSaveConfig} className="risk-config-drawer">
            <div className="risk-config-grid">
              <div className="pro-field-box">
                <label>Trading Desk Capital (₹)</label>
                <input
                  type="number"
                  step="50000"
                  value={draftConfig.accountCapital}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, accountCapital: Number(e.target.value) })
                  }
                  className="font-mono"
                />
              </div>
              <div className="pro-field-box">
                <label>Max Risk / Trade (%)</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="5"
                  value={draftConfig.maxRiskPerTradePct}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, maxRiskPerTradePct: Number(e.target.value) })
                  }
                  className="font-mono"
                />
              </div>
              <div className="pro-field-box">
                <label>Daily Loss Kill-Switch (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={draftConfig.maxDailyLossPct}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, maxDailyLossPct: Number(e.target.value) })
                  }
                  className="font-mono"
                />
              </div>
              <div className="pro-field-box">
                <label>Max Open Heat (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="15"
                  value={draftConfig.maxOpenRiskPct}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, maxOpenRiskPct: Number(e.target.value) })
                  }
                  className="font-mono"
                />
              </div>
              <div className="pro-field-box">
                <label>Min R:R Threshold</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="5.0"
                  value={draftConfig.minRiskRewardRatio}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, minRiskRewardRatio: Number(e.target.value) })
                  }
                  className="font-mono"
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="submit" className="btn btn-primary">
                Save & Enforce Guardrails
              </button>
            </div>
          </form>
        )}

        {/* Live Utilization Gauges: Daily Loss Limit & Portfolio Open Heat */}
        <div className="risk-gauges-row">
          <div className="risk-gauge-box">
            <div className="gauge-top">
              <span>Daily Loss Kill-Switch Limit ({riskConfig.maxDailyLossPct}%)</span>
              <span className="font-mono">
                {guardrailStatus.dailyLossUsedPct}% Used (Limit:{' '}
                {mask(formatINRCompact((riskConfig.accountCapital * riskConfig.maxDailyLossPct) / 100))})
              </span>
            </div>
            <div className="gauge-track">
              <div
                className={`gauge-fill ${guardrailStatus.dailyLossUsedPct >= 80 ? 'danger' : 'safe'
                  }`}
                style={{ width: `${Math.min(100, Math.max(3, guardrailStatus.dailyLossUsedPct))}%` }}
              />
            </div>
          </div>

          <div className="risk-gauge-box">
            <div className="gauge-top">
              <span>Active Portfolio Stop-Loss Heat ({riskConfig.maxOpenRiskPct}% Cap)</span>
              <span className="font-mono">
                {mask(formatINR(stats.openHeatCapital))} ({stats.openHeatPct}% of Capital)
              </span>
            </div>
            <div className="gauge-track">
              <div
                className={`gauge-fill ${guardrailStatus.openHeatUsedPct >= 80 ? 'warn' : 'cyan'
                  }`}
                style={{ width: `${Math.min(100, Math.max(4, guardrailStatus.openHeatUsedPct))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. QUANTITATIVE PERFORMANCE METRICS MATRIX (10 INSTITUTIONAL KPIS) ─── */}
      <div className="quant-matrix-grid">
        <div className="glass-panel quant-cell">
          <span className="quant-lbl">PROFIT FACTOR</span>
          <div
            className={`quant-val font-mono ${stats.profitFactor >= 1.5 ? 'text-emerald' : 'text-amber'
              }`}
          >
            {stats.profitFactor.toFixed(2)}
          </div>
          <span className="quant-sub">Gross Wins / Gross Losses</span>
        </div>

        <div className="glass-panel quant-cell">
          <span className="quant-lbl">TRADE EXPECTANCY</span>
          <div
            className={`quant-val font-mono ${stats.expectancy >= 0 ? 'text-emerald' : 'text-rose'
              }`}
          >
            {stats.expectancy >= 0 ? '+' : ''}
            {mask(formatINR(stats.expectancy))}
          </div>
          <span className="quant-sub">Avg {stats.expectancyR}R per trade</span>
        </div>

        <div className="glass-panel quant-cell">
          <span className="quant-lbl">SHARPE / SORTINO</span>
          <div className="quant-val font-mono text-cyan">
            {stats.sharpeRatio} / {stats.sortinoRatio}
          </div>
          <span className="quant-sub">Risk-Adjusted Return</span>
        </div>

        <div className="glass-panel quant-cell">
          <span className="quant-lbl">MAX DRAWDOWN</span>
          <div className="quant-val font-mono text-rose">
            -{mask(formatINRCompact(stats.maxDrawdown))} ({stats.maxDrawdownPct}%)
          </div>
          <span className="quant-sub">Peak-to-Valley Equity Drop</span>
        </div>

        <div className="glass-panel quant-cell">
          <span className="quant-lbl">AVG WIN vs AVG LOSS</span>
          <div className="quant-val font-mono" style={{ fontSize: '1.05rem' }}>
            <span className="text-emerald">+{mask(formatINRCompact(stats.avgWin))}</span>
            {' / '}
            <span className="text-rose">-{mask(formatINRCompact(stats.avgLoss))}</span>
          </div>
          <span className="quant-sub">
            Payoff Ratio:{' '}
            {stats.avgLoss > 0 ? (stats.avgWin / stats.avgLoss).toFixed(2) : '—'}x
          </span>
        </div>

        <div className="glass-panel quant-cell">
          <span className="quant-lbl">LARGEST WIN / LOSS</span>
          <div className="quant-val font-mono" style={{ fontSize: '1.05rem' }}>
            <span className="text-emerald">+{mask(formatINRCompact(stats.largestWin))}</span>
            {' / '}
            <span className="text-rose">{mask(formatINRCompact(stats.largestLoss))}</span>
          </div>
          <span className="quant-sub">Outlier Tail Distribution</span>
        </div>

        <div className="glass-panel quant-cell">
          <span className="quant-lbl">WIN / LOSS STREAKS</span>
          <div className="quant-val font-mono">
            <span className="text-emerald">{stats.maxConsecutiveWins}W</span>
            {' • '}
            <span className="text-rose">{stats.maxConsecutiveLosses}L</span>
          </div>
          <span className="quant-sub">
            Current Streak: {stats.currentStreak > 0 ? `+${stats.currentStreak}W` : `${stats.currentStreak}L`}
          </span>
        </div>

        <div className="glass-panel quant-cell">
          <span className="quant-lbl">NET P&L (AFTER TAXES)</span>
          <div
            className={`quant-val font-mono ${stats.netRealizedPnl >= 0 ? 'text-emerald' : 'text-rose'
              }`}
          >
            {stats.netRealizedPnl >= 0 ? '+' : ''}
            {mask(formatINR(stats.netRealizedPnl))}
          </div>
          <span className="quant-sub">
            Charges Drag: ₹{stats.totalChargesPaid.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* ─── 3. GROSS VS NET EQUITY CURVE & UNDERWATER DRAWDOWN CHART ─── */}
      <div className="options-main-split">
        <div className="glass-panel options-payoff-card">
          <div className="pro-ticket-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <TrendingUp size={15} className="text-emerald" />
              <span className="pro-dock-title">GROSS vs NET REALIZED EQUITY CURVE</span>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.73rem' }}>
              <span className="text-emerald">━ Gross P&L</span>
              <span className="text-cyan">━ Net (Post-STT/Brokerage)</span>
            </div>
          </div>

          <div style={{ width: '100%', height: 250, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="eqGrossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v) => formatINRCompact(v)}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="pro-chart-tooltip font-mono">
                          <div className="pro-tooltip-head">{d.date} • {d.trade}</div>
                          <div className="text-emerald">Gross: {formatINR(d.pnl)}</div>
                          <div className="text-cyan">Net: {formatINR(d.netPnl)}</div>
                          <div className="text-muted">R-Multiple: {d.rMultiple}R</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke="#10b981"
                  strokeWidth={2.2}
                  fill="url(#eqGrossGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="netPnl"
                  stroke="#06b6d4"
                  strokeWidth={1.8}
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Strategy / Playbook Performance Attribution */}
        <div className="glass-panel options-legs-card">
          <div className="pro-ticket-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Award size={15} className="text-amber" />
              <span className="pro-dock-title">PLAYBOOK & STRATEGY ATTRIBUTION</span>
            </div>
            <span className="badge badge-emerald">
              Compliance: {stats.ruleComplianceScore}%
            </span>
          </div>

          <div className="strategy-attribution-list">
            {stats.byStrategy.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                Close trades to populate strategy attribution analytics.
              </div>
            ) : (
              <table className="strategy-attr-table font-mono">
                <thead>
                  <tr>
                    <th>PLAYBOOK / SETUP</th>
                    <th>TRADES</th>
                    <th>WIN %</th>
                    <th>AVG R</th>
                    <th>PF</th>
                    <th>NET P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byStrategy.map((st) => (
                    <tr key={st.strategy}>
                      <td style={{ fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                        {st.strategy}
                      </td>
                      <td>{st.tradesCount}</td>
                      <td className={st.winRate >= 50 ? 'text-emerald' : 'text-amber'}>
                        {st.winRate}%
                      </td>
                      <td className={st.avgRMultiple >= 0 ? 'text-cyan' : 'text-rose'}>
                        {st.avgRMultiple}R
                      </td>
                      <td>{st.profitFactor}</td>
                      <td
                        className={st.totalPnl >= 0 ? 'text-emerald' : 'text-rose'}
                        style={{ fontWeight: 700 }}
                      >
                        {st.totalPnl >= 0 ? '+' : ''}
                        {mask(formatINR(st.totalPnl))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
