import { describe, it, expect } from 'vitest';
import { calculateBrokerageAndTaxes } from '../domain/brokerageCalculator';
import {
  calculatePositionSizing,
  DEFAULT_RISK_CONFIG,
  evaluateRiskGuardrails,
} from '../domain/riskGuardrails';
import {
  analyzeOptionStrategy,
  buildStrategyPreset,
  computeBlackScholes,
  generateOptionChain,
} from '../domain/optionsEngine';
import {
  generateOHLCSeries,
  generateOrderBookDepth,
  INITIAL_WATCHLIST,
} from '../domain/marketSimulator';
import { tradingService } from '../services/tradingService';
import { SEED_TRADES } from '../domain/seedData';

describe('Institutional Trading & Quantitative Engines', () => {
  it('calculates Indian F&O and Equity brokerage, STT, GST, and breakeven accurately', () => {
    const fnOResult = calculateBrokerageAndTaxes({
      instrument: 'F&O',
      tradeType: 'INTRADAY',
      direction: 'LONG',
      entryPrice: 150,
      exitPrice: 200,
      quantity: 100,
    });

    expect(fnOResult.brokerage).toBe(40);
    expect(fnOResult.turnover).toBe(35000);
    expect(fnOResult.totalCharges).toBeGreaterThan(40);
    expect(fnOResult.breakevenPoints).toBeGreaterThan(0);
  });

  it('computes optimal lot-aligned position sizing based on account risk % and stop-loss', () => {
    const sizing = calculatePositionSizing({
      accountCapital: 1500000, // ₹15L
      riskPct: 1.0,            // ₹15,000 max risk
      entryPrice: 24800,
      stopLoss: 24700,         // 100 pts risk per unit
      targetPrice: 25050,      // 250 pts reward per unit (1:2.5 R:R)
      lotSize: 25,
      instrument: 'F&O',
      productType: 'MIS',
    });

    // ₹15,000 / 100 = 150 units = 6 lots of 25
    expect(sizing.recommendedQty).toBe(150);
    expect(sizing.recommendedLots).toBe(6);
    expect(sizing.riskRewardRatio).toBe(2.5);
    expect(sizing.actualRiskINR).toBe(15000);
  });

  it('evaluates pre-trade risk guardrails and blocks oversized risk per trade', () => {
    const safeEval = evaluateRiskGuardrails(DEFAULT_RISK_CONFIG, SEED_TRADES, {
      entryPrice: 100,
      stopLoss: 90,
      targetPrice: 125,
      quantity: 500, // ₹5,000 risk (< 1% of ₹15L)
      checklistPassed: true,
    });
    expect(safeEval.canExecute).toBe(true);

    const oversizedEval = evaluateRiskGuardrails(DEFAULT_RISK_CONFIG, SEED_TRADES, {
      entryPrice: 1000,
      stopLoss: 900, // 100 risk/unit
      targetPrice: 1200,
      quantity: 300, // ₹30,000 risk (2% > 1% cap)
      checklistPassed: true,
    });
    expect(oversizedEval.canExecute).toBe(false);
    expect(oversizedEval.violations.some((v) => v.id === 'trade-risk-cap')).toBe(true);
  });

  it('computes Black-Scholes option pricing, Greeks, and Iron Condor payoff analysis', () => {
    const bsCall = computeBlackScholes({
      spot: 24850,
      strike: 24850,
      daysToExpiry: 7,
      ivPct: 14,
      optionType: 'CE',
    });
    expect(bsCall.price).toBeGreaterThan(0);
    expect(bsCall.greeks.delta).toBeGreaterThan(0.45);
    expect(bsCall.greeks.delta).toBeLessThan(0.6);

    const condorLegs = buildStrategyPreset('iron_condor', 24850, 50, 25, 14);
    expect(condorLegs).toHaveLength(4);

    const analysis = analyzeOptionStrategy(24850, condorLegs);
    expect(analysis.payoffCurve.length).toBeGreaterThan(50);
    expect(analysis.breakevens.length).toBe(2);
    expect(analysis.estimatedMargin).toBeGreaterThan(0);

    const chain = generateOptionChain(24850, 50, 14, 7);
    expect(chain.rows).toHaveLength(13);
    expect(chain.pcr).toBeGreaterThan(0);
  });

  it('generates multi-timeframe OHLCV series, L2 Order Book DOM, and institutional trading stats', () => {
    const inst = INITIAL_WATCHLIST[0];
    const candles = generateOHLCSeries(inst, '15m', 30);
    expect(candles).toHaveLength(30);
    expect(candles[candles.length - 1].close).toBe(inst.ltp);

    const dom = generateOrderBookDepth(inst);
    expect(dom.bids).toHaveLength(5);
    expect(dom.asks).toHaveLength(5);
    expect(dom.spread).toBeGreaterThan(0);

    const stats = tradingService.computeTradingStats(SEED_TRADES);
    expect(stats.totalTrades).toBe(SEED_TRADES.length);
    expect(stats.profitFactor).toBeGreaterThan(1.5);
    expect(stats.byStrategy.length).toBeGreaterThan(0);
  });
});
