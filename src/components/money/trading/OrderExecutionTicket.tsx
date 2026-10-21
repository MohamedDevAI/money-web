import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { calculateBrokerageAndTaxes } from '../../../domain/brokerageCalculator';
import { iiflService } from '../../../services/iiflService';
import {
  calculatePositionSizing,
  evaluateRiskGuardrails,
} from '../../../domain/riskGuardrails';
import { formatINR, formatINRCompact } from '../../../utils/formatters';
import { useMoneyPrivacy } from '../../../context/MoneyPrivacyContext';
import type {
  EmotionState,
  OrderType,
  ProductType,
  SetupGrade,
  Trade,
  TradeDirection,
  TradeType,
  TradingRiskConfig,
  WatchlistInstrument,
} from '../../../interface';

interface OrderExecutionTicketProps {
  activeInstrument?: WatchlistInstrument;
  trades: Trade[];
  riskConfig: TradingRiskConfig;
  onExecuteTrade: (trade: Omit<Trade, 'id'>) => Promise<void>;
  externalOrderPreset?: { direction: TradeDirection; price: number } | null;
}

const STRATEGIES = [
  '15m ORB + VWAP Reclaim',
  '20 EMA Pullback & Volume Pocket',
  'Opening Range Breakout (ORB)',
  'Demand Zone Sweep',
  'Relative Strength Stage-2 Breakout',
  'Iron Condor / Theta Decay',
  'Mean Reversion Bollinger Band',
];

export default function OrderExecutionTicket({
  activeInstrument,
  trades,
  riskConfig,
  onExecuteTrade,
  externalOrderPreset,
}: OrderExecutionTicketProps) {
  const { mask } = useMoneyPrivacy();

  const symbol = activeInstrument?.symbol || 'NIFTY 50';
  const instrumentType = activeInstrument?.instrument || 'F&O';
  const lotSize = activeInstrument?.lotSize || 25;
  const ltp = activeInstrument?.ltp || 0;
  const ask = activeInstrument?.ask || ltp;
  const bid = activeInstrument?.bid || ltp;
  const atr = activeInstrument?.atr14 || Math.max(1, ltp * 0.015);

  const [direction, setDirection] = useState<TradeDirection>('LONG');
  const [productType, setProductType] = useState<ProductType>('MIS');
  const [orderType, setOrderType] = useState<OrderType>('LIMIT');
  const [tradeType, setTradeType] = useState<TradeType>('INTRADAY');

  const [entryPrice, setEntryPrice] = useState<number>(ltp);
  const [stopLoss, setStopLoss] = useState<number>(
    Number(Math.max(0, ltp - atr).toFixed(1))
  );
  const [targetPrice, setTargetPrice] = useState<number>(
    Number((ltp + atr * 2).toFixed(1))
  );

  const [riskPct, setRiskPct] = useState<number>(riskConfig.maxRiskPerTradePct || 1.0);
  const [quantity, setQuantity] = useState<number>(lotSize);
  const [autoSizeEnabled, setAutoSizeEnabled] = useState<boolean>(true);

  const [strategy, setStrategy] = useState<string>(STRATEGIES[0]);
  const [setupGrade, setSetupGrade] = useState<SetupGrade>('A+');
  const [emotion, setEmotion] = useState<EmotionState>('Disciplined');
  const [notes] = useState<string>('');

  // Pre-trade checklist items
  const [checkTrend, setCheckTrend] = useState<boolean>(true);
  const [checkStopDefined, setCheckStopDefined] = useState<boolean>(true);
  const [checkNoNewsHazard, setCheckNoNewsHazard] = useState<boolean>(true);
  const [showChargesDetail, setShowChargesDetail] = useState<boolean>(false);
  const [execBanner, setExecBanner] = useState<string | null>(null);

  // Sync prices when activeInstrument changes
  useEffect(() => {
    if (!activeInstrument) return;
    setEntryPrice(activeInstrument.ltp);
    if (direction === 'LONG') {
      setStopLoss(Number(Math.max(0, activeInstrument.ltp - atr).toFixed(1)));
      setTargetPrice(Number((activeInstrument.ltp + atr * 2.2).toFixed(1)));
    } else {
      setStopLoss(Number((activeInstrument.ltp + atr).toFixed(1)));
      setTargetPrice(Number(Math.max(0, activeInstrument.ltp - atr * 2.2).toFixed(1)));
    }
  }, [activeInstrument?.symbol]);

  // Apply external chart quick-order clicks
  useEffect(() => {
    if (externalOrderPreset) {
      const dir = externalOrderPreset.direction;
      const prc = externalOrderPreset.price;
      setDirection(dir);
      setEntryPrice(prc);
      if (dir === 'LONG') {
        setStopLoss(Number(Math.max(0, prc - atr).toFixed(1)));
        setTargetPrice(Number((prc + atr * 2.2).toFixed(1)));
      } else {
        setStopLoss(Number((prc + atr).toFixed(1)));
        setTargetPrice(Number(Math.max(0, prc - atr * 2.2).toFixed(1)));
      }
    }
  }, [externalOrderPreset]);

  // Position Sizing calculation
  const sizing = useMemo(
    () =>
      calculatePositionSizing({
        accountCapital: riskConfig.accountCapital,
        riskPct,
        entryPrice,
        stopLoss,
        targetPrice,
        lotSize,
        customQty: autoSizeEnabled ? undefined : quantity,
        instrument: instrumentType,
        productType,
      }),
    [
      riskConfig.accountCapital,
      riskPct,
      entryPrice,
      stopLoss,
      targetPrice,
      lotSize,
      instrumentType,
      productType,
      autoSizeEnabled,
      quantity,
    ]
  );

  // Sync quantity when autoSizeEnabled is active
  useEffect(() => {
    if (autoSizeEnabled) {
      setQuantity(sizing.recommendedQty);
    }
  }, [autoSizeEnabled, sizing.recommendedQty]);

  // Brokerage & Taxes breakdown
  const chargesBreakdown = useMemo(
    () =>
      calculateBrokerageAndTaxes({
        instrument: instrumentType,
        tradeType,
        direction,
        entryPrice,
        exitPrice: targetPrice,
        quantity,
      }),
    [instrumentType, tradeType, direction, entryPrice, targetPrice, quantity]
  );

  // Guardrails Evaluation
  const allChecksChecked = checkTrend && checkStopDefined && checkNoNewsHazard;
  const guardrailEval = useMemo(
    () =>
      evaluateRiskGuardrails(riskConfig, trades, {
        entryPrice,
        stopLoss,
        targetPrice,
        quantity,
        checklistPassed: allChecksChecked,
      }),
    [riskConfig, trades, entryPrice, stopLoss, targetPrice, quantity, allChecksChecked]
  );

  // Level-2 Order Book Depth strictly from IIFL 1502 Market Depth packet
  const orderBook = useMemo(
    () => iiflService.getCachedOrderBookDepth(symbol, ltp),
    [symbol, ltp]
  );

  const handleDirectionChange = (newDir: TradeDirection) => {
    setDirection(newDir);
    if (newDir === 'LONG') {
      setStopLoss(Number(Math.max(0, entryPrice - atr).toFixed(1)));
      setTargetPrice(Number((entryPrice + atr * 2.2).toFixed(1)));
    } else {
      setStopLoss(Number((entryPrice + atr).toFixed(1)));
      setTargetPrice(Number(Math.max(0, entryPrice - atr * 2.2).toFixed(1)));
    }
  };

  const applyRRTarget = (rrMultiple: number) => {
    const riskDist = Math.abs(entryPrice - stopLoss);
    if (riskDist <= 0) return;
    const nextTarget =
      direction === 'LONG'
        ? entryPrice + riskDist * rrMultiple
        : entryPrice - riskDist * rrMultiple;
    setTargetPrice(Number(Math.max(0, nextTarget).toFixed(1)));
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardrailEval.canExecute) return;

    await onExecuteTrade({
      symbol,
      instrument: instrumentType,
      direction,
      tradeType,
      orderType,
      productType,
      entryPrice: Number(entryPrice),
      currentPrice: ltp || Number(entryPrice),
      stopLoss: Number(stopLoss),
      targetPrice: Number(targetPrice),
      quantity: Number(quantity),
      lotSize,
      entryDate: new Date().toISOString(),
      status: 'OPEN',
      strategy,
      setupGrade,
      emotion,
      checklistPassed: allChecksChecked,
      notes: notes.trim() || `${orderType} ${productType} order routed via IIFL Interactive API.`,
    });

    setExecBanner(`${direction} ${quantity} ${symbol} @ ₹${entryPrice} routed to IIFL API!`);
    setTimeout(() => setExecBanner(null), 3500);
  };

  return (
    <aside className="pro-execution-dock">
      {/* ─── 1. INSTITUTIONAL ORDER EXECUTION & POSITION SIZER CARD ─── */}
      <div className="glass-panel pro-ticket-card">
        <div className="pro-ticket-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Calculator size={15} className="text-cyan" />
            <span className="pro-dock-title">IIFL EXECUTION & SIZER</span>
          </div>
          <span className="pro-lot-badge font-mono">1 Lot = {lotSize}</span>
        </div>

        {/* BUY / SELL Direction Switcher */}
        <div className="pro-side-switcher">
          <button
            type="button"
            className={`pro-side-btn buy ${direction === 'LONG' ? 'active' : ''}`}
            onClick={() => handleDirectionChange('LONG')}
          >
            <span>▲ LONG / BUY</span>
            <span className="font-mono">{formatINR(ask)}</span>
          </button>
          <button
            type="button"
            className={`pro-side-btn sell ${direction === 'SHORT' ? 'active' : ''}`}
            onClick={() => handleDirectionChange('SHORT')}
          >
            <span>▼ SHORT / SELL</span>
            <span className="font-mono">{formatINR(bid)}</span>
          </button>
        </div>

        <form onSubmit={handleSubmitOrder} className="pro-ticket-form">
          {/* Product & Order Type Row */}
          <div className="pro-ticket-row-3">
            <div className="pro-field-box">
              <label>Product</label>
              <select
                value={productType}
                onChange={(e) => {
                  const pt = e.target.value as ProductType;
                  setProductType(pt);
                  setTradeType(pt === 'MIS' ? 'INTRADAY' : pt === 'CNC' ? 'SWING' : 'POSITIONAL');
                }}
              >
                <option value="MIS">MIS (Intraday)</option>
                <option value="NRML">NRML (Margin)</option>
                <option value="CNC">CNC (Delivery)</option>
              </select>
            </div>

            <div className="pro-field-box">
              <label>Order Type</label>
              <select
                value={orderType}
                onChange={(e) => {
                  const ot = e.target.value as OrderType;
                  setOrderType(ot);
                  if (ot === 'MARKET' && ltp > 0) setEntryPrice(ltp);
                }}
              >
                <option value="LIMIT">LIMIT</option>
                <option value="MARKET">MARKET</option>
                <option value="SL-M">SL-M</option>
              </select>
            </div>

            <div className="pro-field-box">
              <label>Setup Grade</label>
              <select
                value={setupGrade}
                onChange={(e) => setSetupGrade(e.target.value as SetupGrade)}
              >
                <option value="A+">A+ (High Conv)</option>
                <option value="A">A (Standard)</option>
                <option value="B">B (Tactical)</option>
                <option value="C">C (Low Conv)</option>
              </select>
            </div>
          </div>

          {/* Position Sizing Risk % Control */}
          <div className="pro-risk-sizer-box">
            <div className="pro-risk-sizer-top">
              <span className="sizer-title">
                Risk Budget ({riskPct}% of {mask(formatINRCompact(riskConfig.accountCapital))})
              </span>
              <span className="sizer-budget font-mono text-cyan">
                Max Loss: {mask(formatINR(sizing.allowedRiskINR))}
              </span>
            </div>

            <div className="pro-risk-pct-pills">
              {[0.5, 1.0, 1.5, 2.0].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  className={`risk-pct-pill ${riskPct === pct && autoSizeEnabled ? 'active' : ''}`}
                  onClick={() => {
                    setRiskPct(pct);
                    setAutoSizeEnabled(true);
                  }}
                >
                  {pct}% Risk
                </button>
              ))}
              <button
                type="button"
                className={`risk-pct-pill ${autoSizeEnabled ? 'active-auto' : ''}`}
                onClick={() => setAutoSizeEnabled(!autoSizeEnabled)}
                title="Automatically calculate quantity from Stop-Loss distance"
              >
                {autoSizeEnabled ? '⚡ Auto-Qty ON' : 'Manual Qty'}
              </button>
            </div>
          </div>

          {/* Entry, Quantity & Lots */}
          <div className="pro-ticket-row-2">
            <div className="pro-field-box">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label>Entry Price (₹)</label>
                {ltp > 0 && (
                  <button
                    type="button"
                    className="pro-micro-link"
                    onClick={() => setEntryPrice(ltp)}
                  >
                    LTP
                  </button>
                )}
              </div>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value))}
                className="font-mono"
                required
              />
            </div>

            <div className="pro-field-box">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label>Quantity</label>
                <span className="pro-lots-tag font-mono">{sizing.recommendedLots} Lots</span>
              </div>
              <input
                type="number"
                min={1}
                step={lotSize}
                value={quantity}
                onChange={(e) => {
                  setAutoSizeEnabled(false);
                  setQuantity(Math.max(1, Number(e.target.value)));
                }}
                className="font-mono"
                required
              />
            </div>
          </div>

          {/* Stop Loss & Target Price with Quick R:R Multipliers */}
          <div className="pro-ticket-row-2">
            <div className="pro-field-box">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="text-rose">Stop Loss (₹)</label>
                <span className="pro-lots-tag font-mono text-rose">
                  -{mask(formatINRCompact(sizing.actualRiskINR))}
                </span>
              </div>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value))}
                className="font-mono input-stop"
                required
              />
            </div>

            <div className="pro-field-box">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="text-emerald">Target (₹)</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" className="pro-micro-link" onClick={() => applyRRTarget(2)}>
                    1:2
                  </button>
                  <button type="button" className="pro-micro-link" onClick={() => applyRRTarget(3)}>
                    1:3
                  </button>
                </div>
              </div>
              <input
                type="number"
                step="any"
                value={targetPrice}
                onChange={(e) => setTargetPrice(Number(e.target.value))}
                className="font-mono input-target"
                required
              />
            </div>
          </div>

          {/* Strategy & Emotion */}
          <div className="pro-ticket-row-2">
            <div className="pro-field-box">
              <label>Strategy / Playbook</label>
              <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                {STRATEGIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="pro-field-box">
              <label>Mindset State</label>
              <select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value as EmotionState)}
              >
                <option value="Disciplined">Disciplined</option>
                <option value="Calm">Calm</option>
                <option value="Confident">Confident</option>
                <option value="Hesitant">Hesitant</option>
                <option value="FOMO">FOMO (Caution)</option>
                <option value="Revenge">Revenge (Danger)</option>
              </select>
            </div>
          </div>

          {/* Telemetry Summary: Margin, R:R, Charges & Breakeven */}
          <div className="pro-order-telemetry-box">
            <div className="pro-tele-line">
              <span>Est. Margin ({sizing.leverageUsed}x):</span>
              <strong className="font-mono">{mask(formatINR(sizing.estimatedMarginRequired))}</strong>
            </div>
            <div className="pro-tele-line">
              <span>Risk : Reward Ratio:</span>
              <strong
                className={`font-mono ${
                  sizing.riskRewardRatio >= riskConfig.minRiskRewardRatio
                    ? 'text-emerald'
                    : 'text-amber'
                }`}
              >
                1 : {sizing.riskRewardRatio} (+{mask(formatINRCompact(sizing.potentialProfitINR))})
              </strong>
            </div>
            <div
              className="pro-tele-line clickable"
              onClick={() => setShowChargesDetail(!showChargesDetail)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                Est. Taxes & Brokerage:
                {showChargesDetail ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </span>
              <strong className="font-mono text-amber">
                ₹{chargesBreakdown.totalCharges} (BE: +{chargesBreakdown.breakevenPoints} pts)
              </strong>
            </div>

            {showChargesDetail && (
              <div className="pro-charges-breakdown font-mono">
                <div>Brokerage: ₹{chargesBreakdown.brokerage}</div>
                <div>STT/CTT: ₹{chargesBreakdown.stt}</div>
                <div>Exch Txn: ₹{chargesBreakdown.exchangeTxnCharge}</div>
                <div>GST (18%): ₹{chargesBreakdown.gst}</div>
                <div>Stamp Duty: ₹{chargesBreakdown.stampDuty}</div>
                <div>SEBI Fee: ₹{chargesBreakdown.sebiFee}</div>
              </div>
            )}
          </div>

          {/* Pre-Trade Rule Checklist & Guardrail Status */}
          <div className="pro-pretrade-checklist">
            <div className="checklist-head">
              <span>
                <ShieldCheck size={13} className="text-cyan" /> Pre-Trade Guardrails
              </span>
              <span
                className={`guardrail-status-pill ${
                  guardrailEval.status === 'CLEAR'
                    ? 'pass'
                    : guardrailEval.status === 'WARNING'
                    ? 'warn'
                    : 'locked'
                }`}
              >
                {guardrailEval.status === 'CLEAR'
                  ? 'ALL CLEAR'
                  : guardrailEval.status === 'WARNING'
                  ? 'CAUTION'
                  : 'KILL-SWITCH'}
              </span>
            </div>

            <div className="checklist-toggles">
              <label className="chk-item">
                <input
                  type="checkbox"
                  checked={checkTrend}
                  onChange={(e) => setCheckTrend(e.target.checked)}
                />
                <span>HTF Trend & VWAP aligned</span>
              </label>
              <label className="chk-item">
                <input
                  type="checkbox"
                  checked={checkStopDefined}
                  onChange={(e) => setCheckStopDefined(e.target.checked)}
                />
                <span>Hard invalidation SL accepted</span>
              </label>
              <label className="chk-item">
                <input
                  type="checkbox"
                  checked={checkNoNewsHazard}
                  onChange={(e) => setCheckNoNewsHazard(e.target.checked)}
                />
                <span>No binary event / revenge tilt</span>
              </label>
            </div>

            {guardrailEval.violations
              .filter((v) => v.severity !== 'PASS')
              .map((v) => (
                <div
                  key={v.id}
                  className={`guardrail-alert-row ${v.severity === 'BLOCKER' ? 'blocker' : 'warning'}`}
                >
                  {v.severity === 'BLOCKER' ? (
                    <ShieldAlert size={13} />
                  ) : (
                    <AlertTriangle size={13} />
                  )}
                  <span>
                    <strong>{v.rule}:</strong> {v.message}
                  </span>
                </div>
              ))}
          </div>

          {execBanner && (
            <div className="pro-exec-toast">
              <CheckCircle2 size={14} />
              <span>{execBanner}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!guardrailEval.canExecute}
            className={`pro-submit-order-btn ${
              !guardrailEval.canExecute
                ? 'disabled-locked'
                : direction === 'LONG'
                ? 'buy'
                : 'sell'
            }`}
          >
            {!guardrailEval.canExecute ? (
              <>
                <Lock size={15} /> RISK GUARDRAIL LOCKED
              </>
            ) : (
              <>
                <Zap size={15} /> EXECUTE {direction} ({quantity} QTY @ ₹{entryPrice})
              </>
            )}
          </button>
        </form>
      </div>

      {/* ─── 2. LEVEL-2 ORDER BOOK (DOM LADDER) FROM IIFL 1502 STREAM ─── */}
      <div className="glass-panel pro-orderbook-card">
        <div className="pro-ticket-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Layers size={14} className="text-cyan" />
            <span className="pro-dock-title">IIFL L2 DEPTH (5x5 DOM)</span>
          </div>
          <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Spread: ₹{orderBook.spread} ({orderBook.spreadPct}%)
          </span>
        </div>

        {/* Buy vs Sell Pressure Bar */}
        <div className="dom-pressure-bar-wrap">
          <div className="dom-pressure-labels font-mono">
            <span className="text-emerald">BIDS {orderBook.buyPressurePct}%</span>
            <span className="text-rose">ASKS {(100 - orderBook.buyPressurePct).toFixed(1)}%</span>
          </div>
          <div className="dom-pressure-track">
            <div
              className="dom-pressure-bid"
              style={{ width: `${orderBook.buyPressurePct}%` }}
            />
          </div>
        </div>

        {/* 5x5 Bid / Ask Table */}
        {orderBook.bids.length === 0 && orderBook.asks.length === 0 ? (
          <div style={{ padding: '14px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Awaiting IIFL 1502 L2 Market Depth packet...
          </div>
        ) : (
          <div className="dom-ladder-grid font-mono">
            <div className="dom-col">
              <div className="dom-col-head">
                <span>QTY</span>
                <span>BID (₹)</span>
              </div>
              {orderBook.bids.map((b, i) => (
                <div
                  key={i}
                  className="dom-row bid"
                  onClick={() => setEntryPrice(b.price)}
                  title="Click to set Limit Price"
                >
                  <div className="dom-depth-fill bid" style={{ width: `${b.depthPct}%` }} />
                  <span className="dom-qty">{b.quantity.toLocaleString()}</span>
                  <span className="dom-price text-emerald">{b.price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="dom-col">
              <div className="dom-col-head">
                <span>ASK (₹)</span>
                <span>QTY</span>
              </div>
              {orderBook.asks.map((a, i) => (
                <div
                  key={i}
                  className="dom-row ask"
                  onClick={() => setEntryPrice(a.price)}
                  title="Click to set Limit Price"
                >
                  <div className="dom-depth-fill ask" style={{ width: `${a.depthPct}%` }} />
                  <span className="dom-price text-rose">{a.price.toFixed(2)}</span>
                  <span className="dom-qty">{a.quantity.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
