import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, BarChart3, Activity, TrendingDown } from 'lucide-react';
import { formatINR, formatINRCompact } from '../../../utils/formatters';
import { useMoneyPrivacy } from '../../../context/MoneyPrivacyContext';
import { tradingService } from '../../../services/tradingService';
import type { Trade } from '../../../interface';

interface TradingPerformanceChartProps {
  trades: Trade[];
}

export default function TradingPerformanceChart({ trades }: TradingPerformanceChartProps) {
  const { mask } = useMoneyPrivacy();
  const [chartMode, setChartMode] = useState<'equity' | 'drawdown' | 'distribution'>('equity');

  const equityData = tradingService.getEquityCurveData(trades);

  const tradePnlData = trades
    .filter((t) =>
      t.status === 'CLOSED' ? t.realizedPnl !== undefined : t.unrealizedPnl !== undefined
    )
    .map((t) => {
      const pnl = t.status === 'CLOSED' ? t.realizedPnl || 0 : t.unrealizedPnl || 0;
      return {
        symbol: t.symbol,
        pnl,
        status: t.status,
        direction: t.direction,
        rMultiple: t.rMultiple || 0,
      };
    });

  const totalClosed = trades.filter((t) => t.status === 'CLOSED').length;
  const currentNetPnl = equityData.length > 0 ? equityData[equityData.length - 1].pnl : 0;
  const isOverallProfitable = currentNetPnl >= 0;

  return (
    <div className="glass-panel trading-chart-card">
      <div className="trading-chart-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-cyan">
              <Activity size={12} /> Quantitative Performance Curve
            </span>
            <span className="trading-chart-subtext font-mono">
              {totalClosed} Settled Trades Evaluated
            </span>
          </div>
          <h3 className="trading-chart-title">
            {chartMode === 'equity'
              ? 'Cumulative Realized Equity Curve (Gross vs Net)'
              : chartMode === 'drawdown'
              ? 'Underwater Peak-to-Valley Drawdown Trajectory'
              : 'Trade-by-Trade P&L Distribution'}
          </h3>
        </div>

        {/* View Mode Switcher */}
        <div className="trading-view-toggle-bar">
          <button
            type="button"
            className={`trading-view-toggle-btn ${chartMode === 'equity' ? 'active' : ''}`}
            onClick={() => setChartMode('equity')}
          >
            <TrendingUp size={14} /> Equity Curve
          </button>
          <button
            type="button"
            className={`trading-view-toggle-btn ${chartMode === 'drawdown' ? 'active' : ''}`}
            onClick={() => setChartMode('drawdown')}
          >
            <TrendingDown size={14} /> Drawdown
          </button>
          <button
            type="button"
            className={`trading-view-toggle-btn ${chartMode === 'distribution' ? 'active' : ''}`}
            onClick={() => setChartMode('distribution')}
          >
            <BarChart3 size={14} /> P&L Bars
          </button>
        </div>
      </div>

      <div style={{ height: 260, width: '100%', marginTop: 12 }}>
        {chartMode === 'equity' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="pnlGradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.38} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="pnlGradRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.38} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(val) => mask(formatINRCompact(val))}
                tickLine={false}
              />
              <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.25)" strokeDasharray="4 4" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    const pnlVal = item.pnl;
                    return (
                      <div className="pro-chart-tooltip font-mono">
                        <div className="pro-tooltip-head">{item.date}</div>
                        <div style={{ color: '#e2e8f0', marginBottom: 4 }}>{item.trade}</div>
                        <div className={pnlVal >= 0 ? 'text-emerald' : 'text-rose'}>
                          Gross Cumulative: {mask(`${pnlVal >= 0 ? '+' : ''}${formatINR(pnlVal)}`)}
                        </div>
                        <div className="text-cyan">
                          Net (Post-Tax): {mask(formatINR(item.netPnl))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke={isOverallProfitable ? '#10b981' : '#f43f5e'}
                strokeWidth={2.4}
                fill={isOverallProfitable ? 'url(#pnlGradGreen)' : 'url(#pnlGradRed)'}
              />
              <Area
                type="monotone"
                dataKey="netPnl"
                stroke="#06b6d4"
                strokeWidth={1.6}
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : chartMode === 'drawdown' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(val) => mask(formatINRCompact(val))}
                tickLine={false}
              />
              <ReferenceLine y={0} stroke="rgba(244, 63, 94, 0.35)" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="pro-chart-tooltip font-mono">
                        <div className="pro-tooltip-head">{item.date}</div>
                        <div className="text-rose">
                          Drawdown from Peak: {mask(formatINR(item.drawdown))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="#f43f5e"
                strokeWidth={2.2}
                fill="url(#ddGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tradePnlData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
              <XAxis dataKey="symbol" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(val) => mask(formatINRCompact(val))}
                tickLine={false}
              />
              <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.25)" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="pro-chart-tooltip font-mono">
                        <div className="pro-tooltip-head">
                          {item.symbol} ({item.direction})
                        </div>
                        <div className={item.pnl >= 0 ? 'text-emerald' : 'text-rose'}>
                          P&L: {mask(`${item.pnl >= 0 ? '+' : ''}${formatINR(item.pnl)}`)} (
                          {item.rMultiple}R)
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                          Status: {item.status}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="pnl"
                radius={[4, 4, 0, 0]}
                fill="#10b981"
                shape={(props: any) => {
                  const { x, y, width, height } = props;
                  const isPositive = props.payload.pnl >= 0;
                  const barColor = isPositive ? '#10b981' : '#f43f5e';
                  return <rect x={x} y={y} width={width} height={height} fill={barColor} rx={3} />;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
