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
  CartesianGrid
} from 'recharts';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';
import { formatINR, formatINRCompact } from '../../../utils/formatters';
import { useMoneyPrivacy } from '../../../context/MoneyPrivacyContext';
import { tradingService } from '../../../services/tradingService';
import type { Trade } from '../../../types';

interface TradingPerformanceChartProps {
  trades: Trade[];
}

export default function TradingPerformanceChart({ trades }: TradingPerformanceChartProps) {
  const { mask } = useMoneyPrivacy();
  const [chartMode, setChartMode] = useState<'equity' | 'distribution'>('equity');

  const equityData = tradingService.getEquityCurveData(trades);

  // Per trade P&L distribution
  const tradePnlData = trades
    .filter((t) => (t.status === 'CLOSED' ? t.realizedPnl !== undefined : t.unrealizedPnl !== undefined))
    .map((t) => {
      const pnl = t.status === 'CLOSED' ? (t.realizedPnl || 0) : (t.unrealizedPnl || 0);
      return {
        symbol: t.symbol,
        pnl,
        status: t.status,
        direction: t.direction,
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
            <span className="badge badge-indigo">
              <Activity size={12} /> Performance Analytics
            </span>
            <span className="trading-chart-subtext">
              {totalClosed} Settled Trades Recorded
            </span>
          </div>
          <h3 className="trading-chart-title">
            {chartMode === 'equity' ? 'Cumulative Trading Equity Curve' : 'Trade-by-Trade P&L Breakdown'}
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
            className={`trading-view-toggle-btn ${chartMode === 'distribution' ? 'active' : ''}`}
            onClick={() => setChartMode('distribution')}
          >
            <BarChart3 size={14} /> P&L Bars
          </button>
        </div>
      </div>

      <div style={{ height: 280, width: '100%', marginTop: 12 }}>
        {chartMode === 'equity' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="pnlGradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a80fea" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a80fea" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="pnlGradRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6b677f" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6b677f" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(186, 54, 242, 0.07)" />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={11}
                tickFormatter={(val) => mask(formatINRCompact(val))}
                tickLine={false}
              />
              <ReferenceLine y={0} stroke="rgba(186, 54, 242, 0.15)" strokeDasharray="4 4" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    const pnlVal = item.pnl;
                    return (
                      <div className="trading-chart-tooltip">
                        <div className="tooltip-date">{item.date}</div>
                        <div className="tooltip-trade">{item.trade}</div>
                        <div className={`tooltip-pnl ${pnlVal >= 0 ? 'text-emerald' : 'text-rose'}`}>
                          Cumulative: {mask(`${pnlVal >= 0 ? '+' : ''}${formatINR(pnlVal)}`)}
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
                stroke={isOverallProfitable ? '#a80fea' : '#6b677f'}
                strokeWidth={2.5}
                fill={isOverallProfitable ? 'url(#pnlGradGreen)' : 'url(#pnlGradRed)'}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tradePnlData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(186, 54, 242, 0.07)" />
              <XAxis dataKey="symbol" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={11}
                tickFormatter={(val) => mask(formatINRCompact(val))}
                tickLine={false}
              />
              <ReferenceLine y={0} stroke="rgba(186, 54, 242, 0.15)" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="trading-chart-tooltip">
                        <div className="tooltip-trade">{item.symbol} ({item.direction})</div>
                        <div className={`tooltip-pnl ${item.pnl >= 0 ? 'text-emerald' : 'text-rose'}`}>
                          P&L: {mask(`${item.pnl >= 0 ? '+' : ''}${formatINR(item.pnl)}`)}
                        </div>
                        <div className="tooltip-date" style={{ textTransform: 'capitalize' }}>
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
                fill="#a80fea"
                shape={(props: any) => {
                  const { fill: _fill, x, y, width, height } = props;
                  const isPositive = props.payload.pnl >= 0;
                  const barColor = isPositive ? '#a80fea' : '#6b677f';
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
