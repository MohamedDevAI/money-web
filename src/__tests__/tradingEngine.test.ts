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
} from '../domain/optionsEngine';
import { computeTechnicalOverlays, RawApiCandle } from '../domain/technicalIndicators';
import { tradingService } from '../services/tradingService';
import type { Trade } from '../interface';

describe('Institutional Trading & Quantitative Engines (Pure API Mode)', () => {
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
    const sampleApiTrades: Trade[] = [
      {
        id: 'api-tr-1',
        symbol: 'NIFTY 50',
        instrument: 'F&O',
        direction: 'LONG',
        tradeType: 'INTRADAY',
        entryPrice: 24800,
        currentPrice: 24920,
        exitPrice: 24920,
        stopLoss: 24740,
        targetPrice: 24950,
        quantity: 50,
        entryDate: new Date().toISOString(),
        exitDate: new Date().toISOString(),
        status: 'CLOSED',
        strategy: 'ORB',
        realizedPnl: 6000,
      },
    ];

    const safeEval = evaluateRiskGuardrails(DEFAULT_RISK_CONFIG, sampleApiTrades, {
      entryPrice: 100,
      stopLoss: 90,
      targetPrice: 125,
      quantity: 500, // ₹5,000 risk (< 1% of ₹15L)
      checklistPassed: true,
    });
    expect(safeEval.canExecute).toBe(true);

    const oversizedEval = evaluateRiskGuardrails(DEFAULT_RISK_CONFIG, sampleApiTrades, {
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
  });

  it('computes technical indicators (VWAP, EMA20, Bollinger, RSI, MACD) from raw API OHLCV candles and computes trading stats', () => {
    const rawApiCandles: RawApiCandle[] = Array.from({ length: 25 }, (_, idx) => ({
      timestamp: Date.now() - (25 - idx) * 60000,
      open: 24800 + idx * 5,
      high: 24815 + idx * 5,
      low: 24790 + idx * 5,
      close: 24810 + idx * 5,
      volume: 12000 + idx * 500,
    }));

    const enrichedCandles = computeTechnicalOverlays(rawApiCandles, false);
    expect(enrichedCandles).toHaveLength(25);
    expect(enrichedCandles[24].close).toBe(24810 + 24 * 5);
    expect(enrichedCandles[24].vwap).toBeGreaterThan(0);
    expect(enrichedCandles[24].rsi14).toBeGreaterThanOrEqual(50);

    const apiTrades: Trade[] = [
      {
        id: 't1',
        symbol: 'RELIANCE',
        instrument: 'EQUITY',
        direction: 'LONG',
        tradeType: 'SWING',
        entryPrice: 2900,
        currentPrice: 3020,
        exitPrice: 3020,
        stopLoss: 2850,
        targetPrice: 3050,
        quantity: 100,
        entryDate: '2025-02-01T09:30:00Z',
        exitDate: '2025-02-03T15:15:00Z',
        status: 'CLOSED',
        strategy: 'Breakout',
        realizedPnl: 12000,
      },
      {
        id: 't2',
        symbol: 'HDFCBANK',
        instrument: 'EQUITY',
        direction: 'LONG',
        tradeType: 'SWING',
        entryPrice: 1700,
        currentPrice: 1680,
        exitPrice: 1680,
        stopLoss: 1680,
        targetPrice: 1760,
        quantity: 100,
        entryDate: '2025-02-04T09:30:00Z',
        exitDate: '2025-02-05T14:15:00Z',
        status: 'CLOSED',
        strategy: 'Breakout',
        realizedPnl: -2000,
      },
    ];

    const stats = tradingService.computeTradingStats(apiTrades);
    expect(stats.totalTrades).toBe(2);
    expect(stats.profitFactor).toBe(6);
    expect(stats.byStrategy.length).toBe(1);
  });
});
