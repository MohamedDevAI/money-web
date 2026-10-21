/**
 * Institutional Risk Management, Position Sizing & Pre-Trade Guardrails Engine
 * Enforces account capital risk rules, daily loss kill-switches, portfolio heat caps, and R:R discipline.
 */

import {
  GuardrailEvaluation,
  GuardrailViolation,
  InstrumentType,
  ProductType,
  Trade,
  TradingRiskConfig,
} from '../interface';

const RISK_STORAGE_KEY = 'money_os_trading_risk_config_v1';

export const DEFAULT_RISK_CONFIG: TradingRiskConfig = {
  accountCapital: 1500000,         // ₹15,00,000 (₹15L Trading Desk Capital)
  maxRiskPerTradePct: 1.0,         // Max 1.0% risk per trade (₹15,000)
  maxDailyLossPct: 3.0,            // Max 3.0% daily loss kill-switch (₹45,000)
  maxOpenRiskPct: 5.0,             // Max 5.0% total open portfolio heat (₹75,000)
  maxOpenPositions: 6,             // Max 6 concurrent open positions
  minRiskRewardRatio: 1.5,         // Minimum 1 : 1.5 R:R
  enforcePreTradeChecklist: true,
  revengeCooldownLosses: 3,        // Warn after 3 consecutive losses
};

export function loadRiskConfig(): TradingRiskConfig {
  try {
    const raw = localStorage.getItem(RISK_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_RISK_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_RISK_CONFIG;
}

export function saveRiskConfig(config: TradingRiskConfig): TradingRiskConfig {
  try {
    localStorage.setItem(RISK_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
  return config;
}

export interface PositionSizingResult {
  allowedRiskINR: number;
  riskPerUnit: number;
  recommendedQty: number;
  recommendedLots: number;
  actualRiskINR: number;
  actualRiskPct: number;
  capitalDeployed: number;
  estimatedMarginRequired: number;
  leverageUsed: number;
  rewardPerUnit: number;
  potentialProfitINR: number;
  riskRewardRatio: number;
}

/**
 * Computes institutional position sizing from Account Capital, Risk %, Entry, Stop-Loss, Target & Lot Size.
 */
export function calculatePositionSizing(params: {
  accountCapital: number;
  riskPct: number;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  lotSize?: number;
  customQty?: number;
  instrument?: InstrumentType;
  productType?: ProductType;
}): PositionSizingResult {
  const {
    accountCapital,
    riskPct,
    entryPrice,
    stopLoss,
    targetPrice,
    lotSize = 1,
    customQty,
    instrument = 'EQUITY',
    productType = 'MIS',
  } = params;

  const validCapital = Math.max(10000, Number(accountCapital) || DEFAULT_RISK_CONFIG.accountCapital);
  const validLot = Math.max(1, Number(lotSize) || 1);
  const allowedRiskINR = (validCapital * Math.max(0.1, Number(riskPct) || 1)) / 100;

  const riskPerUnit = Math.abs((Number(entryPrice) || 0) - (Number(stopLoss) || 0));
  const rewardPerUnit = Math.abs((Number(targetPrice) || 0) - (Number(entryPrice) || 0));
  const riskRewardRatio = riskPerUnit > 0 ? Number((rewardPerUnit / riskPerUnit).toFixed(2)) : 1.0;

  let recommendedQty = validLot;
  if (riskPerUnit > 0) {
    const rawUnits = Math.floor(allowedRiskINR / riskPerUnit);
    const lots = Math.max(1, Math.floor(rawUnits / validLot));
    recommendedQty = lots * validLot;
  }

  const effectiveQty = customQty !== undefined && customQty > 0 ? customQty : recommendedQty;
  const recommendedLots = Math.max(1, Math.round(effectiveQty / validLot));
  const actualRiskINR = Number((effectiveQty * riskPerUnit).toFixed(2));
  const actualRiskPct = Number(((actualRiskINR / validCapital) * 100).toFixed(2));
  const capitalDeployed = Number((effectiveQty * (Number(entryPrice) || 0)).toFixed(2));
  const potentialProfitINR = Number((effectiveQty * rewardPerUnit).toFixed(2));

  // Margin estimation based on instrument and product type
  let marginFactor = 1.0;
  if (productType === 'MIS') {
    marginFactor = instrument === 'EQUITY' ? 0.2 : 0.25; // 5x intraday equity, 4x F&O
  } else if (instrument === 'F&O' || instrument === 'COMMODITY') {
    marginFactor = 0.25;
  } else if (instrument === 'CRYPTO') {
    marginFactor = 0.5;
  }

  const estimatedMarginRequired = Number((capitalDeployed * marginFactor).toFixed(2));
  const leverageUsed = estimatedMarginRequired > 0
    ? Number((capitalDeployed / estimatedMarginRequired).toFixed(1))
    : 1.0;

  return {
    allowedRiskINR: Number(allowedRiskINR.toFixed(2)),
    riskPerUnit: Number(riskPerUnit.toFixed(2)),
    recommendedQty,
    recommendedLots,
    actualRiskINR,
    actualRiskPct,
    capitalDeployed,
    estimatedMarginRequired,
    leverageUsed,
    rewardPerUnit: Number(rewardPerUnit.toFixed(2)),
    potentialProfitINR,
    riskRewardRatio,
  };
}

/**
 * Evaluates pre-trade guardrails & daily kill-switch status against existing trades and a proposed trade.
 */
export function evaluateRiskGuardrails(
  config: TradingRiskConfig,
  trades: Trade[],
  proposedTrade?: {
    entryPrice: number;
    stopLoss: number;
    targetPrice: number;
    quantity: number;
    checklistPassed?: boolean;
  }
): GuardrailEvaluation {
  const violations: GuardrailViolation[] = [];
  const todayISO = new Date().toISOString().split('T')[0];

  // 1. Compute Today's Realized + Unrealized P&L
  const openTrades = trades.filter((t) => t.status === 'OPEN');
  const closedToday = trades.filter(
    (t) => t.status === 'CLOSED' && (t.exitDate || '').startsWith(todayISO)
  );

  const todayRealized = closedToday.reduce((s, t) => s + (t.realizedPnl || 0), 0);
  const openUnrealized = openTrades.reduce((s, t) => s + (t.unrealizedPnl || 0), 0);
  const todayNetPnl = todayRealized + openUnrealized;

  const maxDailyLossINR = (config.accountCapital * config.maxDailyLossPct) / 100;
  const currentDailyLossINR = todayNetPnl < 0 ? Math.abs(todayNetPnl) : 0;
  const dailyLossUsedPct = maxDailyLossINR > 0
    ? Number(((currentDailyLossINR / maxDailyLossINR) * 100).toFixed(1))
    : 0;

  // 2. Open Portfolio Heat (Total risk if all open stop-losses are hit)
  const currentOpenHeatINR = openTrades.reduce((sum, t) => {
    const riskPerShare = Math.abs(t.entryPrice - t.stopLoss);
    return sum + riskPerShare * t.quantity;
  }, 0);

  const proposedRiskINR = proposedTrade
    ? Math.abs(proposedTrade.entryPrice - proposedTrade.stopLoss) * proposedTrade.quantity
    : 0;

  const totalHeatWithProposed = currentOpenHeatINR + proposedRiskINR;
  const maxOpenHeatINR = (config.accountCapital * config.maxOpenRiskPct) / 100;
  const openHeatUsedPct = maxOpenHeatINR > 0
    ? Number(((totalHeatWithProposed / maxOpenHeatINR) * 100).toFixed(1))
    : 0;

  // 3. Consecutive Losses Streak
  const sortedClosed = [...trades]
    .filter((t) => t.status === 'CLOSED')
    .sort((a, b) => new Date(b.exitDate || b.entryDate).getTime() - new Date(a.exitDate || a.entryDate).getTime());

  let consecutiveLosses = 0;
  for (const t of sortedClosed) {
    if ((t.realizedPnl || 0) < 0) {
      consecutiveLosses++;
    } else {
      break;
    }
  }

  // Evaluate Rule 1: Daily Loss Kill-Switch
  if (currentDailyLossINR >= maxDailyLossINR) {
    violations.push({
      id: 'daily-kill-switch',
      severity: 'BLOCKER',
      rule: 'Daily Loss Kill-Switch',
      message: 'Daily maximum drawdown limit breached. Terminal execution locked to protect capital.',
      currentValue: `-₹${currentDailyLossINR.toLocaleString('en-IN')}`,
      limitValue: `-₹${maxDailyLossINR.toLocaleString('en-IN')} (${config.maxDailyLossPct}%)`,
    });
  } else if (dailyLossUsedPct >= 75) {
    violations.push({
      id: 'daily-loss-warning',
      severity: 'WARNING',
      rule: 'Daily Drawdown Proximity',
      message: `Approaching daily loss kill-switch (${dailyLossUsedPct}% consumed). Reduce position size by 50%.`,
      currentValue: `-₹${currentDailyLossINR.toLocaleString('en-IN')}`,
      limitValue: `-₹${maxDailyLossINR.toLocaleString('en-IN')}`,
    });
  } else {
    violations.push({
      id: 'daily-loss-pass',
      severity: 'PASS',
      rule: 'Daily Loss Limit',
      message: 'Daily P&L within safe institutional drawdown limits.',
      currentValue: `${todayNetPnl >= 0 ? '+' : '-'}₹${Math.abs(todayNetPnl).toLocaleString('en-IN')}`,
      limitValue: `Max -₹${maxDailyLossINR.toLocaleString('en-IN')}`,
    });
  }

  // Evaluate Rule 2: Single Trade Risk % (if proposedTrade provided)
  if (proposedTrade) {
    const maxTradeRiskINR = (config.accountCapital * config.maxRiskPerTradePct) / 100;
    const tradeRiskPct = Number(((proposedRiskINR / config.accountCapital) * 100).toFixed(2));
    if (proposedRiskINR > maxTradeRiskINR * 1.05) {
      violations.push({
        id: 'trade-risk-cap',
        severity: 'BLOCKER',
        rule: 'Max Risk Per Trade Cap',
        message: `Proposed stop-loss risk (${tradeRiskPct}%) exceeds max allowed ${config.maxRiskPerTradePct}% per trade.`,
        currentValue: `₹${Math.round(proposedRiskINR).toLocaleString('en-IN')} (${tradeRiskPct}%)`,
        limitValue: `₹${Math.round(maxTradeRiskINR).toLocaleString('en-IN')} (${config.maxRiskPerTradePct}%)`,
      });
    } else {
      violations.push({
        id: 'trade-risk-pass',
        severity: 'PASS',
        rule: 'Position Risk Sizing',
        message: `Stop-loss risk is well-contained at ${tradeRiskPct}% of trading capital.`,
        currentValue: `₹${Math.round(proposedRiskINR).toLocaleString('en-IN')} (${tradeRiskPct}%)`,
        limitValue: `≤ ${config.maxRiskPerTradePct}%`,
      });
    }

    // Evaluate Rule 3: Minimum Risk-Reward Ratio
    const riskDiff = Math.abs(proposedTrade.entryPrice - proposedTrade.stopLoss);
    const rewardDiff = Math.abs(proposedTrade.targetPrice - proposedTrade.entryPrice);
    const rr = riskDiff > 0 ? Number((rewardDiff / riskDiff).toFixed(2)) : 0;

    if (rr < config.minRiskRewardRatio) {
      violations.push({
        id: 'rr-minimum',
        severity: 'WARNING',
        rule: 'Asymmetric R:R Discipline',
        message: `Trade R:R (1:${rr}) is below institutional benchmark of 1:${config.minRiskRewardRatio}.`,
        currentValue: `1 : ${rr}`,
        limitValue: `≥ 1 : ${config.minRiskRewardRatio}`,
      });
    } else {
      violations.push({
        id: 'rr-pass',
        severity: 'PASS',
        rule: 'Asymmetric R:R Ratio',
        message: `Favorable asymmetric payoff profile (1:${rr}).`,
        currentValue: `1 : ${rr}`,
        limitValue: `≥ 1 : ${config.minRiskRewardRatio}`,
      });
    }
  }

  // Evaluate Rule 4: Portfolio Heat Cap
  if (totalHeatWithProposed > maxOpenHeatINR) {
    violations.push({
      id: 'portfolio-heat',
      severity: 'WARNING',
      rule: 'Total Portfolio Heat Cap',
      message: 'Aggregate open risk across all active positions exceeds portfolio heat limit.',
      currentValue: `₹${Math.round(totalHeatWithProposed).toLocaleString('en-IN')}`,
      limitValue: `₹${Math.round(maxOpenHeatINR).toLocaleString('en-IN')} (${config.maxOpenRiskPct}%)`,
    });
  }

  // Evaluate Rule 5: Max Open Positions
  if (openTrades.length >= config.maxOpenPositions && proposedTrade) {
    violations.push({
      id: 'max-open-positions',
      severity: 'WARNING',
      rule: 'Concurrent Position Limit',
      message: `Already holding ${openTrades.length} active positions (limit: ${config.maxOpenPositions}).`,
      currentValue: `${openTrades.length} Open`,
      limitValue: `Max ${config.maxOpenPositions}`,
    });
  }

  // Evaluate Rule 6: Revenge Trade / Losing Streak Detector
  if (consecutiveLosses >= config.revengeCooldownLosses) {
    violations.push({
      id: 'revenge-detector',
      severity: 'WARNING',
      rule: 'Psychological Tilt / Revenge Guard',
      message: `${consecutiveLosses} consecutive losses detected. Enforce 15-min cooldown and A+ setups only.`,
      currentValue: `${consecutiveLosses} Losses in a row`,
      limitValue: `< ${config.revengeCooldownLosses} Streak`,
    });
  }

  const hasBlocker = violations.some((v) => v.severity === 'BLOCKER');
  const hasWarning = violations.some((v) => v.severity === 'WARNING');

  let status: GuardrailEvaluation['status'] = 'CLEAR';
  if (violations.some((v) => v.id === 'daily-kill-switch')) {
    status = 'KILL_SWITCH_LOCKED';
  } else if (hasBlocker || hasWarning) {
    status = 'WARNING';
  }

  return {
    status,
    canExecute: !hasBlocker,
    dailyLossUsedPct,
    openHeatUsedPct,
    consecutiveLossesToday: consecutiveLosses,
    violations,
  };
}
