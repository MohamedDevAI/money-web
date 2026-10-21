/**
 * Institutional Options & Derivatives Strategy Engine
 * Computes Black-Scholes Option Pricing, Portfolio Greeks (Delta, Gamma, Theta, Vega),
 * Multi-Leg Payoff Curves (Expiry & T+0), Breakevens, Max Pain, and Option Chain data.
 */

import {
  OptionGreeks,
  OptionLeg,
  OptionStrategyAnalysis,
  PayoffPoint,
} from '../interface';

// Standard Normal PDF
function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Cumulative Standard Normal Distribution (Abramowitz & Stegun approximation)
function normCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2.0);
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Computes Black-Scholes Theoretical Price & Greeks for a single option contract.
 */
export function computeBlackScholes(params: {
  spot: number;
  strike: number;
  daysToExpiry: number;
  ivPct: number;
  riskFreeRatePct?: number;
  optionType: 'CE' | 'PE' | 'FUT';
}): { price: number; greeks: OptionGreeks } {
  const {
    spot,
    strike,
    daysToExpiry,
    ivPct,
    riskFreeRatePct = 6.8, // India 91-day T-bill rate ~6.8%
    optionType,
  } = params;

  if (optionType === 'FUT') {
    const t = Math.max(1, daysToExpiry) / 365;
    const r = riskFreeRatePct / 100;
    const futPrice = spot * Math.exp(r * t);
    return {
      price: Number(futPrice.toFixed(2)),
      greeks: { delta: 1.0, gamma: 0, theta: 0, vega: 0 },
    };
  }

  const T = Math.max(0.5, daysToExpiry) / 365;
  const sigma = Math.max(5, ivPct) / 100;
  const r = riskFreeRatePct / 100;

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(spot / strike) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const nd1 = normPdf(d1);
  let price = 0;
  let delta = 0;
  let theta = 0;

  if (optionType === 'CE') {
    price = spot * normCdf(d1) - strike * Math.exp(-r * T) * normCdf(d2);
    delta = normCdf(d1);
    theta =
      (-(spot * nd1 * sigma) / (2 * sqrtT) -
        r * strike * Math.exp(-r * T) * normCdf(d2)) /
      365;
  } else {
    price = strike * Math.exp(-r * T) * normCdf(-d2) - spot * normCdf(-d1);
    delta = normCdf(d1) - 1;
    theta =
      (-(spot * nd1 * sigma) / (2 * sqrtT) +
        r * strike * Math.exp(-r * T) * normCdf(-d2)) /
      365;
  }

  const gamma = nd1 / (spot * sigma * sqrtT);
  const vega = (spot * nd1 * sqrtT) / 100; // per 1% IV change

  return {
    price: Math.max(0.5, Number(price.toFixed(2))),
    greeks: {
      delta: Number(delta.toFixed(3)),
      gamma: Number(gamma.toFixed(5)),
      theta: Number(theta.toFixed(2)),
      vega: Number(vega.toFixed(2)),
    },
  };
}

/**
 * Analyzes a multi-leg option strategy: Payoff Curve (Expiry & T+0), Net Greeks, Max Profit/Loss, Breakevens, and POP.
 */
export function analyzeOptionStrategy(
  spot: number,
  legs: OptionLeg[]
): OptionStrategyAnalysis {
  if (legs.length === 0 || spot <= 0) {
    return {
      netPremium: 0,
      maxProfit: 0,
      maxLoss: 0,
      breakevens: [],
      probabilityOfProfit: 0,
      estimatedMargin: 0,
      riskRewardRatio: null,
      greeks: { delta: 0, gamma: 0, theta: 0, vega: 0 },
      payoffCurve: [],
    };
  }

  // 1. Net Premium & Portfolio Greeks
  let netPremium = 0;
  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;
  let shortLegsCount = 0;
  let longLegsCount = 0;
  let totalNotional = 0;

  for (const leg of legs) {
    const qty = leg.lots * leg.lotSize;
    const sign = leg.action === 'BUY' ? 1 : -1;
    totalNotional += spot * qty;

    if (leg.action === 'SELL') shortLegsCount += leg.lots;
    else longLegsCount += leg.lots;

    if (leg.optionType !== 'FUT') {
      // Selling collects credit (+), Buying pays debit (-)
      netPremium += (leg.action === 'SELL' ? 1 : -1) * leg.premium * qty;
    }

    const bs = computeBlackScholes({
      spot,
      strike: leg.strike,
      daysToExpiry: leg.daysToExpiry,
      ivPct: leg.iv,
      optionType: leg.optionType,
    });

    totalDelta += bs.greeks.delta * sign * leg.lots;
    totalGamma += bs.greeks.gamma * sign * leg.lots;
    totalTheta += bs.greeks.theta * sign * qty;
    totalVega += bs.greeks.vega * sign * qty;
  }

  // 2. Generate Payoff Curve across Spot +/- 10%
  const minSpot = Math.round(spot * 0.9);
  const maxSpot = Math.round(spot * 1.1);
  const steps = 80;
  const stepSize = (maxSpot - minSpot) / steps;

  const payoffCurve: PayoffPoint[] = [];
  let minPnl = Infinity;
  let maxPnl = -Infinity;
  let profitablePoints = 0;

  for (let i = 0; i <= steps; i++) {
    const s = Number((minSpot + i * stepSize).toFixed(1));
    let expiryPnl = 0;
    let t0Pnl = 0;

    for (const leg of legs) {
      const qty = leg.lots * leg.lotSize;
      const sign = leg.action === 'BUY' ? 1 : -1;

      // Expiry intrinsic value
      let intrinsic = 0;
      if (leg.optionType === 'CE') {
        intrinsic = Math.max(0, s - leg.strike);
      } else if (leg.optionType === 'PE') {
        intrinsic = Math.max(0, leg.strike - s);
      } else {
        intrinsic = s;
      }

      const legEntry = leg.optionType === 'FUT' ? leg.strike : leg.premium;
      expiryPnl += sign * (intrinsic - legEntry) * qty;

      // T+0 theoretical value (halfway to expiry or today)
      const halfDays = Math.max(1, leg.daysToExpiry * 0.65);
      const theo = computeBlackScholes({
        spot: s,
        strike: leg.strike,
        daysToExpiry: halfDays,
        ivPct: leg.iv,
        optionType: leg.optionType,
      }).price;

      t0Pnl += sign * (theo - legEntry) * qty;
    }

    const roundedExpiry = Math.round(expiryPnl);
    const roundedT0 = Math.round(t0Pnl);

    if (roundedExpiry < minPnl) minPnl = roundedExpiry;
    if (roundedExpiry > maxPnl) maxPnl = roundedExpiry;
    if (roundedExpiry > 0) profitablePoints++;

    payoffCurve.push({
      spot: Math.round(s),
      expiryPnl: roundedExpiry,
      t0Pnl: roundedT0,
      changePct: Number((((s - spot) / spot) * 100).toFixed(2)),
    });
  }

  // 3. Detect Breakeven crossings
  const breakevens: number[] = [];
  for (let i = 1; i < payoffCurve.length; i++) {
    const prev = payoffCurve[i - 1];
    const curr = payoffCurve[i];
    if ((prev.expiryPnl <= 0 && curr.expiryPnl > 0) || (prev.expiryPnl >= 0 && curr.expiryPnl < 0)) {
      const ratio = Math.abs(prev.expiryPnl) / (Math.abs(prev.expiryPnl) + Math.abs(curr.expiryPnl));
      const beSpot = Math.round(prev.spot + ratio * (curr.spot - prev.spot));
      breakevens.push(beSpot);
    }
  }

  // Check if edge slope implies unlimited profit/loss
  const leftSlope = payoffCurve[1].expiryPnl - payoffCurve[0].expiryPnl;
  const rightSlope =
    payoffCurve[payoffCurve.length - 1].expiryPnl - payoffCurve[payoffCurve.length - 2].expiryPnl;

  const isUnlimitedProfit = rightSlope > 50 || leftSlope < -50;
  const isUnlimitedLoss = rightSlope < -50 || leftSlope > 50;

  // Estimate SPAN + Exposure margin
  const baseShortMargin = shortLegsCount > 0 ? (totalNotional / legs.length) * 0.14 : 0;
  const hedgeBenefit = shortLegsCount > 0 && longLegsCount > 0 ? baseShortMargin * 0.45 : 0;
  const debitCost = netPremium < 0 ? Math.abs(netPremium) : 0;
  const estimatedMargin = Math.round(Math.max(debitCost, baseShortMargin - hedgeBenefit + debitCost));

  const probabilityOfProfit = Number(((profitablePoints / payoffCurve.length) * 100).toFixed(1));

  const riskRewardRatio =
    !isUnlimitedProfit && !isUnlimitedLoss && minPnl < 0 && maxPnl > 0
      ? Number((maxPnl / Math.abs(minPnl)).toFixed(2))
      : null;

  return {
    netPremium: Math.round(netPremium),
    maxProfit: isUnlimitedProfit ? 'UNLIMITED' : Math.max(0, maxPnl),
    maxLoss: isUnlimitedLoss ? 'UNLIMITED' : minPnl,
    breakevens,
    probabilityOfProfit,
    estimatedMargin,
    riskRewardRatio,
    greeks: {
      delta: Number(totalDelta.toFixed(2)),
      gamma: Number(totalGamma.toFixed(4)),
      theta: Math.round(totalTheta),
      vega: Math.round(totalVega),
    },
    payoffCurve,
  };
}

export type StrategyPresetId =
  | 'bull_call_spread'
  | 'bear_put_spread'
  | 'iron_condor'
  | 'short_straddle'
  | 'long_strangle';

/**
 * Generates standard institutional multi-leg option presets around the current ATM strike.
 */
export function buildStrategyPreset(
  preset: StrategyPresetId,
  spot: number,
  step: number,
  lotSize: number,
  baseIv = 14.5
): OptionLeg[] {
  const atm = Math.round(spot / step) * step;
  const daysToExpiry = 7;

  const makeLeg = (
    idx: number,
    optionType: 'CE' | 'PE',
    action: 'BUY' | 'SELL',
    strike: number
  ): OptionLeg => {
    const bs = computeBlackScholes({
      spot,
      strike,
      daysToExpiry,
      ivPct: baseIv,
      optionType,
    });
    return {
      id: `leg-${preset}-${idx}-${Date.now()}`,
      optionType,
      action,
      strike,
      premium: bs.price,
      lots: 1,
      lotSize,
      iv: baseIv,
      daysToExpiry,
    };
  };

  switch (preset) {
    case 'bull_call_spread':
      return [
        makeLeg(1, 'CE', 'BUY', atm),
        makeLeg(2, 'CE', 'SELL', atm + step * 2),
      ];
    case 'bear_put_spread':
      return [
        makeLeg(1, 'PE', 'BUY', atm),
        makeLeg(2, 'PE', 'SELL', atm - step * 2),
      ];
    case 'iron_condor':
      return [
        makeLeg(1, 'PE', 'SELL', atm - step * 2),
        makeLeg(2, 'PE', 'BUY', atm - step * 4),
        makeLeg(3, 'CE', 'SELL', atm + step * 2),
        makeLeg(4, 'CE', 'BUY', atm + step * 4),
      ];
    case 'short_straddle':
      return [
        makeLeg(1, 'CE', 'SELL', atm),
        makeLeg(2, 'PE', 'SELL', atm),
      ];
    case 'long_strangle':
      return [
        makeLeg(1, 'CE', 'BUY', atm + step * 2),
        makeLeg(2, 'PE', 'BUY', atm - step * 2),
      ];
  }
}
