import { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  WifiOff,
  Zap,
} from 'lucide-react';
import {
  analyzeOptionStrategy,
  buildStrategyPreset,
  computeBlackScholes,
  StrategyPresetId,
} from '../../../domain/optionsEngine';
import { iiflService, DEFAULT_IIFL_INSTRUMENTS } from '../../../services/iiflService';
import { formatINR, formatINRCompact } from '../../../utils/formatters';
import { useMoneyPrivacy } from '../../../context/MoneyPrivacyContext';
import type { OptionChainStrikeRow, OptionLeg, Trade, WatchlistInstrument } from '../../../interface';

interface OptionsStrategyBuilderProps {
  watchlist: WatchlistInstrument[];
  onDeployStrategyAsTrade?: (trade: Omit<Trade, 'id'>) => Promise<void>;
}

const PRESETS: { id: StrategyPresetId; label: string; view: string }[] = [
  { id: 'iron_condor', label: 'Iron Condor', view: 'Neutral / Theta' },
  { id: 'bull_call_spread', label: 'Bull Call Spread', view: 'Moderately Bullish' },
  { id: 'bear_put_spread', label: 'Bear Put Spread', view: 'Moderately Bearish' },
  { id: 'short_straddle', label: 'Short Straddle', view: 'Rangebound IV Crush' },
  { id: 'long_strangle', label: 'Long Strangle', view: 'Explosive Breakout' },
];

export default function OptionsStrategyBuilder({
  watchlist,
  onDeployStrategyAsTrade,
}: OptionsStrategyBuilderProps) {
  const { mask } = useMoneyPrivacy();

  const fnOInstruments = useMemo(() => {
    const live = watchlist.filter(
      (w) => w.exchange === 'NFO' || w.exchange === 'NSE' || w.exchange === 'BSE'
    );
    if (live.length > 0) return live;
    // When live watchlist is not yet populated, use metadata shells with 0 LTP
    return DEFAULT_IIFL_INSTRUMENTS.map((m) => ({
      symbol: m.symbol,
      name: m.name,
      exchange: m.exchange,
      instrument: m.instrument,
      sector: m.sector,
      ltp: 0,
      prevClose: 0,
      open: 0,
      high: 0,
      low: 0,
      change: 0,
      changePct: 0,
      volume: 0,
      vwap: 0,
      lotSize: m.lotSize,
      atr14: 0,
      rsi14: 50,
      iv: 15,
      pcr: 1,
      bid: 0,
      ask: 0,
      tickDirection: 'flat' as const,
    }));
  }, [watchlist]);

  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    fnOInstruments[0]?.symbol || 'NIFTY 50'
  );
  const [activePreset, setActivePreset] = useState<StrategyPresetId>('iron_condor');
  const [daysToExpiry, setDaysToExpiry] = useState<number>(7);
  const [deployMessage, setDeployMessage] = useState<string | null>(null);

  const underlying = useMemo(
    () => fnOInstruments.find((w) => w.symbol === selectedSymbol) || fnOInstruments[0],
    [fnOInstruments, selectedSymbol]
  );

  const strikeStep = useMemo(() => {
    if (!underlying || underlying.ltp <= 0) return 50;
    if (underlying.ltp > 40000) return 100;
    if (underlying.ltp > 15000) return 50;
    if (underlying.ltp > 2000) return 20;
    return 10;
  }, [underlying]);

  const [legs, setLegs] = useState<OptionLeg[]>([]);
  const [optionChain, setOptionChain] = useState<{
    rows: OptionChainStrikeRow[];
    pcr: number;
    maxPainStrike: number;
    totalCallOi: number;
    totalPutOi: number;
  }>({
    rows: [],
    pcr: 0,
    maxPainStrike: 0,
    totalCallOi: 0,
    totalPutOi: 0,
  });

  // Rebuild preset when underlying live spot becomes available or symbol changes
  useEffect(() => {
    if (!underlying || underlying.ltp <= 0) return;
    setLegs(
      buildStrategyPreset(
        activePreset,
        underlying.ltp,
        strikeStep,
        underlying.lotSize,
        underlying.iv
      )
    );
  }, [selectedSymbol, underlying?.ltp]);

  // Fetch live Option Chain strictly from IIFL MarketData API
  useEffect(() => {
    if (!underlying || underlying.ltp <= 0) {
      setOptionChain({ rows: [], pcr: 0, maxPainStrike: 0, totalCallOi: 0, totalPutOi: 0 });
      return;
    }
    let cancelled = false;
    iiflService
      .getOptionChain(underlying.symbol, underlying.ltp, strikeStep, daysToExpiry)
      .then((res) => {
        if (!cancelled) setOptionChain(res);
      })
      .catch(() => {
        if (!cancelled) {
          setOptionChain({ rows: [], pcr: 0, maxPainStrike: 0, totalCallOi: 0, totalPutOi: 0 });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [underlying?.symbol, underlying?.ltp, strikeStep, daysToExpiry]);

  const handleSelectPreset = (presetId: StrategyPresetId) => {
    setActivePreset(presetId);
    if (!underlying || underlying.ltp <= 0) return;
    setLegs(
      buildStrategyPreset(
        presetId,
        underlying.ltp,
        strikeStep,
        underlying.lotSize,
        underlying.iv
      )
    );
  };

  const handleAddLegFromChain = (
    optionType: 'CE' | 'PE',
    action: 'BUY' | 'SELL',
    strike: number,
    premium: number,
    iv: number
  ) => {
    const newLeg: OptionLeg = {
      id: `leg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      optionType,
      action,
      strike,
      premium,
      lots: 1,
      lotSize: underlying.lotSize,
      iv,
      daysToExpiry,
    };
    setLegs((prev) => [...prev, newLeg]);
  };

  const handleUpdateLeg = (id: string, updates: Partial<OptionLeg>) => {
    setLegs((prev) =>
      prev.map((leg) => {
        if (leg.id !== id) return leg;
        const merged = { ...leg, ...updates };
        if (
          underlying.ltp > 0 &&
          (updates.strike !== undefined || updates.optionType !== undefined || updates.iv !== undefined)
        ) {
          const bs = computeBlackScholes({
            spot: underlying.ltp,
            strike: merged.strike,
            daysToExpiry: merged.daysToExpiry,
            ivPct: merged.iv,
            optionType: merged.optionType,
          });
          merged.premium = bs.price;
        }
        return merged;
      })
    );
  };

  const handleRemoveLeg = (id: string) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  };

  const analysis = useMemo(
    () => analyzeOptionStrategy(underlying?.ltp || 0, legs),
    [underlying?.ltp, legs]
  );

  const handleDeployBasket = async () => {
    if (!onDeployStrategyAsTrade || legs.length === 0) return;
    const summaryLabel = `${underlying.symbol.split(' ')[0]} ${activePreset
      .replace(/_/g, ' ')
      .toUpperCase()} (${legs.length}L)`;

    const entryRef = Math.max(10, Math.abs(analysis.netPremium) / (underlying.lotSize || 25));
    await onDeployStrategyAsTrade({
      symbol: summaryLabel,
      instrument: 'F&O',
      direction: analysis.netPremium >= 0 ? 'SHORT' : 'LONG',
      tradeType: 'SWING',
      orderType: 'LIMIT',
      productType: 'NRML',
      entryPrice: Number(entryRef.toFixed(2)),
      currentPrice: Number(entryRef.toFixed(2)),
      stopLoss: Number((entryRef * (analysis.netPremium >= 0 ? 1.35 : 0.7)).toFixed(2)),
      targetPrice: Number((entryRef * (analysis.netPremium >= 0 ? 0.35 : 1.65)).toFixed(2)),
      quantity: underlying.lotSize,
      lotSize: underlying.lotSize,
      entryDate: new Date().toISOString(),
      status: 'OPEN',
      strategy: `F&O Multi-Leg: ${activePreset.replace(/_/g, ' ')}`,
      setupGrade: 'A+',
      emotion: 'Disciplined',
      checklistPassed: true,
      notes: `Legs: ${legs
        .map((l) => `${l.action} ${l.lots}x ${l.strike}${l.optionType} @ ₹${l.premium}`)
        .join(' | ')}`,
    });

    setDeployMessage(`Basket "${summaryLabel}" routed via IIFL Interactive API!`);
    setTimeout(() => setDeployMessage(null), 4000);
  };

  const maxOi = useMemo(() => {
    return Math.max(
      ...optionChain.rows.map((r) => Math.max(r.callOi, r.putOi)),
      10000
    );
  }, [optionChain.rows]);

  return (
    <div className="options-lab-container">
      {/* ─── TOP STRATEGY CONTROL & PRESETS BAR ─── */}
      <div className="glass-panel options-header-card">
        <div className="options-header-top">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-cyan">
                <Sparkles size={12} /> F&O DERIVATIVES & GREEKS ENGINE
              </span>
              <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                IIFL Option Chain • Black-Scholes Pricing
              </span>
            </div>
            <h3 className="options-lab-title">
              Multi-Leg Options Strategy Builder & Payoff Simulator
            </h3>
          </div>

          <div className="options-underlying-controls">
            <div className="pro-field-box" style={{ minWidth: 170 }}>
              <label>Underlying Spot</label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="font-mono"
              >
                {fnOInstruments.map((inst) => (
                  <option key={inst.symbol} value={inst.symbol}>
                    {inst.symbol} {inst.ltp > 0 ? `(₹${inst.ltp})` : '(API Standby)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="pro-field-box" style={{ minWidth: 110 }}>
              <label>Days to Expiry</label>
              <select
                value={daysToExpiry}
                onChange={(e) => {
                  const d = Number(e.target.value);
                  setDaysToExpiry(d);
                  setLegs((prev) => prev.map((l) => ({ ...l, daysToExpiry: d })));
                }}
                className="font-mono"
              >
                <option value={2}>2 DTE (Weekly)</option>
                <option value={7}>7 DTE (Weekly)</option>
                <option value={14}>14 DTE (Bi-Wk)</option>
                <option value={28}>28 DTE (Monthly)</option>
              </select>
            </div>

            {onDeployStrategyAsTrade && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDeployBasket}
                disabled={legs.length === 0}
                style={{ alignSelf: 'flex-end', height: 38 }}
              >
                <Zap size={14} /> Deploy Basket Order
              </button>
            )}
          </div>
        </div>

        {/* Institutional Presets Bar */}
        <div className="options-presets-strip">
          <span className="presets-label">Strategy Templates:</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`preset-chip-btn ${activePreset === p.id ? 'active' : ''}`}
              onClick={() => handleSelectPreset(p.id)}
            >
              <span className="preset-name">{p.label}</span>
              <span className="preset-view">{p.view}</span>
            </button>
          ))}
        </div>

        {deployMessage && (
          <div className="pro-exec-toast" style={{ marginTop: 10 }}>
            <Zap size={14} />
            <span>{deployMessage}</span>
          </div>
        )}
      </div>

      {/* ─── KPI & PORTFOLIO GREEKS STRIP ─── */}
      <div className="options-metrics-grid">
        <div className="glass-panel opt-metric-card">
          <span className="opt-lbl">MAX PROFIT</span>
          <div className="opt-val font-mono text-emerald">
            {analysis.maxProfit === 'UNLIMITED'
              ? '∞ UNLIMITED'
              : mask(formatINR(analysis.maxProfit))}
          </div>
          <span className="opt-sub">At Expiration</span>
        </div>

        <div className="glass-panel opt-metric-card">
          <span className="opt-lbl">MAX LOSS (DEFINED RISK)</span>
          <div className="opt-val font-mono text-rose">
            {analysis.maxLoss === 'UNLIMITED'
              ? '∞ UNDEFINED'
              : mask(formatINR(analysis.maxLoss))}
          </div>
          <span className="opt-sub">
            {analysis.riskRewardRatio ? `R:R = 1 : ${analysis.riskRewardRatio}` : 'Tail Risk Profile'}
          </span>
        </div>

        <div className="glass-panel opt-metric-card">
          <span className="opt-lbl">BREAKEVEN POINTS</span>
          <div className="opt-val font-mono text-cyan" style={{ fontSize: '1.05rem' }}>
            {analysis.breakevens.length > 0
              ? analysis.breakevens.map((b) => `₹${b.toLocaleString('en-IN')}`).join(' • ')
              : 'N/A'}
          </div>
          <span className="opt-sub">POP: {analysis.probabilityOfProfit}% Win Zone</span>
        </div>

        <div className="glass-panel opt-metric-card">
          <span className="opt-lbl">EST. SPAN + EXP MARGIN</span>
          <div className="opt-val font-mono">
            {mask(formatINRCompact(analysis.estimatedMargin))}
          </div>
          <span className="opt-sub">
            Net {analysis.netPremium >= 0 ? 'Credit' : 'Debit'}:{' '}
            <strong className={analysis.netPremium >= 0 ? 'text-emerald' : 'text-amber'}>
              {mask(formatINR(Math.abs(analysis.netPremium)))}
            </strong>
          </span>
        </div>

        <div className="glass-panel opt-metric-card greeks-box">
          <span className="opt-lbl">NET POSITION GREEKS</span>
          <div className="greeks-mini-grid font-mono">
            <div>
              <span>Δ Delta</span>
              <strong className={analysis.greeks.delta >= 0 ? 'text-emerald' : 'text-rose'}>
                {analysis.greeks.delta}
              </strong>
            </div>
            <div>
              <span>Θ Theta/d</span>
              <strong className={analysis.greeks.theta >= 0 ? 'text-emerald' : 'text-rose'}>
                {analysis.greeks.theta >= 0 ? '+' : ''}₹{analysis.greeks.theta}
              </strong>
            </div>
            <div>
              <span>Γ Gamma</span>
              <strong>{analysis.greeks.gamma}</strong>
            </div>
            <div>
              <span>V Vega</span>
              <strong className="text-cyan">₹{analysis.greeks.vega}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN SPLIT: LEGS BUILDER + PAYOFF DIAGRAM ─── */}
      <div className="options-main-split">
        {/* Left: Multi-Leg Builder Table */}
        <div className="glass-panel options-legs-card">
          <div className="pro-ticket-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Layers size={15} className="text-cyan" />
              <span className="pro-dock-title">ACTIVE STRATEGY LEGS ({legs.length})</span>
            </div>
            <button
              type="button"
              className="btn-glass"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() =>
                handleAddLegFromChain(
                  'CE',
                  'BUY',
                  underlying.ltp > 0 ? Math.round(underlying.ltp / strikeStep) * strikeStep : 24000,
                  125,
                  underlying.iv
                )
              }
            >
              <Plus size={12} /> Add Leg
            </button>
          </div>

          <div className="options-legs-list">
            {legs.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Add an option leg manually or connect IIFL MarketData API to auto-populate strategy strikes around live spot.
              </div>
            ) : (
              legs.map((leg) => (
                <div key={leg.id} className="option-leg-row">
                  <button
                    type="button"
                    className={`leg-side-badge ${leg.action === 'BUY' ? 'buy' : 'sell'}`}
                    onClick={() =>
                      handleUpdateLeg(leg.id, {
                        action: leg.action === 'BUY' ? 'SELL' : 'BUY',
                      })
                    }
                    title="Click to toggle BUY / SELL"
                  >
                    {leg.action}
                  </button>

                  <select
                    value={leg.optionType}
                    onChange={(e) =>
                      handleUpdateLeg(leg.id, {
                        optionType: e.target.value as 'CE' | 'PE' | 'FUT',
                      })
                    }
                    className="leg-type-select font-mono"
                  >
                    <option value="CE">CE (Call)</option>
                    <option value="PE">PE (Put)</option>
                    <option value="FUT">FUT</option>
                  </select>

                  <div className="leg-input-group">
                    <label>Strike</label>
                    <input
                      type="number"
                      step={strikeStep}
                      value={leg.strike}
                      onChange={(e) =>
                        handleUpdateLeg(leg.id, { strike: Number(e.target.value) })
                      }
                      className="font-mono"
                    />
                  </div>

                  <div className="leg-input-group">
                    <label>Lots ({leg.lotSize})</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={leg.lots}
                      onChange={(e) =>
                        handleUpdateLeg(leg.id, { lots: Math.max(1, Number(e.target.value)) })
                      }
                      className="font-mono"
                    />
                  </div>

                  <div className="leg-input-group">
                    <label>Premium (₹)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={leg.premium}
                      onChange={(e) =>
                        handleUpdateLeg(leg.id, { premium: Math.max(0.5, Number(e.target.value)) })
                      }
                      className="font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    className="leg-delete-btn"
                    onClick={() => handleRemoveLeg(leg.id)}
                    title="Remove leg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Interactive Recharts Payoff Diagram */}
        <div className="glass-panel options-payoff-card">
          <div className="pro-ticket-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Activity size={15} className="text-emerald" />
              <span className="pro-dock-title">EXPIRATION & T+0 PAYOFF DIAGRAM</span>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: '0.74rem' }}>
              <span className="text-emerald">━ Expiry Payoff</span>
              <span className="text-cyan">┅ T+0 Theoretical</span>
            </div>
          </div>

          <div style={{ width: '100%', height: 290, marginTop: 8 }}>
            {analysis.payoffCurve.length === 0 ? (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                }}
              >
                Awaiting live spot & option legs to render payoff curve...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={analysis.payoffCurve}
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="payoffProfitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                  <XAxis
                    dataKey="spot"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => formatINRCompact(v)}
                  />
                  <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.3)" strokeWidth={1.5} />
                  <ReferenceLine
                    x={Math.round(underlying.ltp)}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: `Spot ₹${underlying.ltp}`,
                      fill: '#f59e0b',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const pt = payload[0].payload;
                        const isProf = pt.expiryPnl >= 0;
                        return (
                          <div className="pro-chart-tooltip">
                            <div className="pro-tooltip-head">
                              <span>Underlying @ ₹{pt.spot}</span>
                              <span className="font-mono">
                                ({pt.changePct >= 0 ? '+' : ''}
                                {pt.changePct}%)
                              </span>
                            </div>
                            <div className="font-mono" style={{ marginTop: 4 }}>
                              <div className={isProf ? 'text-emerald' : 'text-rose'}>
                                Expiry P&L: <strong>{formatINR(pt.expiryPnl)}</strong>
                              </div>
                              <div className="text-cyan">
                                T+0 P&L: <strong>{formatINR(pt.t0Pnl)}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expiryPnl"
                    stroke="#10b981"
                    strokeWidth={2.4}
                    fill="url(#payoffProfitGrad)"
                  />
                  <Line
                    type="monotone"
                    dataKey="t0Pnl"
                    stroke="#06b6d4"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ─── LIVE OPTION CHAIN & OI / PCR / MAX PAIN ANALYZER ─── */}
      <div className="glass-panel option-chain-card">
        <div className="pro-ticket-header" style={{ marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="pro-dock-title">
                IIFL LIVE OPTION CHAIN ({underlying.symbol})
              </span>
              <span className="badge badge-emerald">PCR: {optionChain.pcr}</span>
              <span className="badge badge-amber">Max Pain: ₹{optionChain.maxPainStrike}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Click <strong>+B</strong> (Buy) or <strong>+S</strong> (Sell) on any live strike to append directly to your multi-leg strategy above.
            </div>
          </div>

          <div className="font-mono" style={{ fontSize: '0.76rem', display: 'flex', gap: 16 }}>
            <span>
              Total Call OI:{' '}
              <strong className="text-rose">
                {(optionChain.totalCallOi / 100000).toFixed(2)}L
              </strong>
            </span>
            <span>
              Total Put OI:{' '}
              <strong className="text-emerald">
                {(optionChain.totalPutOi / 100000).toFixed(2)}L
              </strong>
            </span>
          </div>
        </div>

        {optionChain.rows.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            <WifiOff size={22} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div>No live Option Chain rows returned from IIFL API for {underlying.symbol}.</div>
          </div>
        ) : (
          <div className="option-chain-table-wrap">
            <table className="option-chain-table font-mono">
              <thead>
                <tr>
                  <th>CALL OI</th>
                  <th>Δ DELTA</th>
                  <th>IV %</th>
                  <th>CALL LTP (₹)</th>
                  <th>ACTION</th>
                  <th className="strike-col-head">STRIKE</th>
                  <th>ACTION</th>
                  <th>PUT LTP (₹)</th>
                  <th>IV %</th>
                  <th>Δ DELTA</th>
                  <th>PUT OI</th>
                </tr>
              </thead>
              <tbody>
                {optionChain.rows.map((row) => {
                  const callOiPct = Math.round((row.callOi / maxOi) * 100);
                  const putOiPct = Math.round((row.putOi / maxOi) * 100);
                  return (
                    <tr key={row.strike} className={row.isAtm ? 'atm-strike-row' : ''}>
                      <td>
                        <div className="oi-bar-cell">
                          <span>{(row.callOi / 1000).toFixed(1)}K</span>
                          <div className="oi-bar-track">
                            <div className="oi-bar-fill call" style={{ width: `${callOiPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="text-muted">{row.callDelta}</td>
                      <td>{row.callIv}%</td>
                      <td className="text-emerald" style={{ fontWeight: 700 }}>
                        ₹{row.callLtp}
                      </td>
                      <td>
                        <div className="chain-quick-btns">
                          <button
                            type="button"
                            className="chain-btn buy"
                            onClick={() =>
                              handleAddLegFromChain('CE', 'BUY', row.strike, row.callLtp, row.callIv)
                            }
                          >
                            +B
                          </button>
                          <button
                            type="button"
                            className="chain-btn sell"
                            onClick={() =>
                              handleAddLegFromChain('CE', 'SELL', row.strike, row.callLtp, row.callIv)
                            }
                          >
                            +S
                          </button>
                        </div>
                      </td>

                      <td className="strike-center-cell">
                        <span>{row.strike}</span>
                        {row.isAtm && <span className="atm-pill">ATM</span>}
                      </td>

                      <td>
                        <div className="chain-quick-btns">
                          <button
                            type="button"
                            className="chain-btn buy"
                            onClick={() =>
                              handleAddLegFromChain('PE', 'BUY', row.strike, row.putLtp, row.putIv)
                            }
                          >
                            +B
                          </button>
                          <button
                            type="button"
                            className="chain-btn sell"
                            onClick={() =>
                              handleAddLegFromChain('PE', 'SELL', row.strike, row.putLtp, row.putIv)
                            }
                          >
                            +S
                          </button>
                        </div>
                      </td>
                      <td className="text-rose" style={{ fontWeight: 700 }}>
                        ₹{row.putLtp}
                      </td>
                      <td>{row.putIv}%</td>
                      <td className="text-muted">{row.putDelta}</td>
                      <td>
                        <div className="oi-bar-cell">
                          <div className="oi-bar-track">
                            <div className="oi-bar-fill put" style={{ width: `${putOiPct}%` }} />
                          </div>
                          <span>{(row.putOi / 1000).toFixed(1)}K</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
