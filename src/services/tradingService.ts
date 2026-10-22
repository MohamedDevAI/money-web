/**
 * Institutional Trading Service for Money OS Pro Trading Terminal (100% Spring Boot Backend Mode).
 *
 * All MongoDB trade persistence, live LTP enrichment, IIFL Net Positions merging,
 * and IIFL live order routing are executed by the Spring Boot API (`/api/trading`).
 */

import type {
  DailyPnlPoint,
  StrategyPerformance,
  Trade,
  TradingStats,
} from '../interface';
import { calculateBrokerageAndTaxes } from '../domain/brokerageCalculator';
import { DEFAULT_RISK_CONFIG, loadRiskConfig } from '../domain/riskGuardrails';
import apiClient from './apiClient';

/**
 * Enriches a raw API trade with computed P&L, Indian regulatory brokerage charges, R-Multiple, and R:R ratio.
 */
export function enrichTradeMetrics(tradeData: Partial<Trade> & { entryPrice: number; quantity: number }): Trade {
  const isLong = (tradeData.direction || 'LONG') === 'LONG';
  const entryPrice = Number(tradeData.entryPrice) || 0;
  const currentPrice = Number(tradeData.currentPrice ?? entryPrice);
  const isClosed = tradeData.status === 'CLOSED';
  const effectiveExitPrice =
    isClosed && tradeData.exitPrice !== undefined ? Number(tradeData.exitPrice) : currentPrice;
  const qty = Math.max(1, Number(tradeData.quantity) || 1);
  const stopLoss = Number(tradeData.stopLoss ?? entryPrice * (isLong ? 0.98 : 1.02));
  const targetPrice = Number(tradeData.targetPrice ?? entryPrice * (isLong ? 1.04 : 0.96));

  const pnlMultiplier = isLong ? 1 : -1;
  const priceDiff = effectiveExitPrice - entryPrice;
  const grossPnl = Number((priceDiff * qty * pnlMultiplier).toFixed(2));
  const pnlPct =
    entryPrice > 0 ? Number(((priceDiff / entryPrice) * 100 * pnlMultiplier).toFixed(2)) : 0;

  const riskPerUnit = Math.abs(entryPrice - stopLoss);
  const rewardPerUnit = Math.abs(targetPrice - entryPrice);
  const rr = riskPerUnit > 0 ? Number((rewardPerUnit / riskPerUnit).toFixed(2)) : 1.0;

  const initialRiskAmount = Number((riskPerUnit * qty).toFixed(2));
  const rMultiple =
    initialRiskAmount > 0 ? Number((grossPnl / initialRiskAmount).toFixed(2)) : 0;

  const brokerageInfo = calculateBrokerageAndTaxes({
    instrument: tradeData.instrument || 'F&O',
    tradeType: tradeData.tradeType || 'INTRADAY',
    direction: tradeData.direction || 'LONG',
    entryPrice,
    exitPrice: effectiveExitPrice,
    quantity: qty,
  });

  const charges = brokerageInfo.totalCharges;
  const netPnl = Number((grossPnl - charges).toFixed(2));

  return {
    id: String(tradeData.id || (tradeData as any)._id || ''),
    symbol: (tradeData.symbol || 'NIFTY').toUpperCase(),
    instrument: tradeData.instrument || 'F&O',
    direction: tradeData.direction || 'LONG',
    tradeType: tradeData.tradeType || 'INTRADAY',
    orderType: tradeData.orderType || 'LIMIT',
    productType: tradeData.productType || 'MIS',
    entryPrice,
    currentPrice: effectiveExitPrice,
    exitPrice: isClosed ? effectiveExitPrice : tradeData.exitPrice,
    stopLoss,
    targetPrice,
    quantity: qty,
    lotSize: tradeData.lotSize || 1,
    entryDate: tradeData.entryDate || new Date().toISOString(),
    exitDate: isClosed ? tradeData.exitDate || new Date().toISOString() : undefined,
    status: tradeData.status || 'OPEN',
    strategy: tradeData.strategy || 'Breakout',
    setupGrade: tradeData.setupGrade || (rr >= 2.0 ? 'A+' : rr >= 1.5 ? 'A' : 'B'),
    emotion: tradeData.emotion || 'Disciplined',
    checklistPassed: tradeData.checklistPassed ?? true,
    notes: tradeData.notes || '',
    tags: tradeData.tags || [],
    unrealizedPnl: isClosed ? 0 : grossPnl,
    realizedPnl: isClosed ? grossPnl : 0,
    netPnl,
    charges,
    pnlPercent: pnlPct,
    riskRewardRatio: rr,
    rMultiple,
    initialRiskAmount,
  };
}

export const tradingService = {
  /**
   * Fetches actual trades & open positions from Spring Boot (`GET /api/trading`).
   */
  getTrades: async (): Promise<Trade[]> => {
    const { data } = await apiClient.get<Trade[]>('/trading');
    if (!Array.isArray(data)) return [];
    return data.map((t) => enrichTradeMetrics(t));
  },

  /**
   * Creates a trade & routes live IIFL order via Spring Boot (`POST /api/trading`).
   */
  createTrade: async (tradeData: Omit<Trade, 'id'>): Promise<Trade> => {
    const prepared = enrichTradeMetrics(tradeData);
    const { data } = await apiClient.post<Trade>('/trading', prepared);
    return enrichTradeMetrics(data || prepared);
  },

  updateTrade: async (id: string, updates: Partial<Trade>): Promise<Trade> => {
    const { data } = await apiClient.put<Trade>(`/trading/${id}`, updates);
    return enrichTradeMetrics({
      ...updates,
      ...(data || {}),
      entryPrice: Number(data?.entryPrice ?? updates.entryPrice ?? 0),
      quantity: Number(data?.quantity ?? updates.quantity ?? 1),
      id,
    });
  },

  closeTrade: async (id: string, exitPrice: number): Promise<Trade> => {
    return tradingService.updateTrade(id, {
      status: 'CLOSED',
      exitPrice: Number(exitPrice),
      currentPrice: Number(exitPrice),
      exitDate: new Date().toISOString(),
    });
  },

  deleteTrade: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/trading/${id}`);
    return true;
  },

  computeTradingStats: (trades: Trade[]): TradingStats => {
    const riskConfig = loadRiskConfig() || DEFAULT_RISK_CONFIG;
    let capitalDeployed = 0;
    let totalRealizedPnl = 0;
    let totalUnrealizedPnl = 0;
    let totalChargesPaid = 0;
    let openHeatCapital = 0;

    let winCount = 0;
    let lossCount = 0;
    let grossWins = 0;
    let grossLosses = 0;
    let largestWin = 0;
    let largestLoss = 0;
    let rrSum = 0;
    let rrCount = 0;
    let rMultipleSum = 0;
    let rMultipleCount = 0;
    let checklistPassCount = 0;

    const closedTrades = trades
      .filter((t) => t.status === 'CLOSED')
      .sort(
        (a, b) =>
          new Date(a.exitDate || a.entryDate).getTime() -
          new Date(b.exitDate || b.entryDate).getTime()
      );

    const strategyMap = new Map<
      string,
      { count: number; wins: number; pnl: number; rSum: number; grossWin: number; grossLoss: number }
    >();

    trades.forEach((rawTrade) => {
      const t = enrichTradeMetrics(rawTrade);
      totalChargesPaid += t.charges || 0;

      if (t.checklistPassed !== false && (t.riskRewardRatio || 0) >= 1.5) {
        checklistPassCount++;
      }

      if (t.riskRewardRatio) {
        rrSum += t.riskRewardRatio;
        rrCount++;
      }

      if (t.status === 'OPEN') {
        capitalDeployed += t.entryPrice * t.quantity;
        totalUnrealizedPnl += t.unrealizedPnl || 0;
        openHeatCapital += Math.abs(t.entryPrice - t.stopLoss) * t.quantity;
      } else {
        const pnl = t.realizedPnl || 0;
        totalRealizedPnl += pnl;

        if (t.rMultiple !== undefined) {
          rMultipleSum += t.rMultiple;
          rMultipleCount++;
        }

        if (pnl > 0) {
          winCount++;
          grossWins += pnl;
          if (pnl > largestWin) largestWin = pnl;
        } else if (pnl < 0) {
          lossCount++;
          grossLosses += Math.abs(pnl);
          if (pnl < largestLoss) largestLoss = pnl;
        }

        const stratKey = t.strategy || 'Discretionary';
        const prev = strategyMap.get(stratKey) || {
          count: 0,
          wins: 0,
          pnl: 0,
          rSum: 0,
          grossWin: 0,
          grossLoss: 0,
        };
        prev.count += 1;
        if (pnl > 0) {
          prev.wins += 1;
          prev.grossWin += pnl;
        } else if (pnl < 0) {
          prev.grossLoss += Math.abs(pnl);
        }
        prev.pnl += pnl;
        prev.rSum += t.rMultiple || 0;
        strategyMap.set(stratKey, prev);
      }
    });

    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let curWinStreak = 0;
    let curLossStreak = 0;
    let currentStreak = 0;

    let runningPnl = 0;
    let peakPnl = 0;
    let maxDrawdown = 0;
    const returnsArray: number[] = [];
    const dailySeries: DailyPnlPoint[] = [];

    closedTrades.forEach((t) => {
      const pnl = t.realizedPnl || 0;
      const charges = t.charges || 0;
      returnsArray.push(pnl);

      if (pnl > 0) {
        curWinStreak++;
        curLossStreak = 0;
        currentStreak = curWinStreak;
        if (curWinStreak > maxConsecutiveWins) maxConsecutiveWins = curWinStreak;
      } else if (pnl < 0) {
        curLossStreak++;
        curWinStreak = 0;
        currentStreak = -curLossStreak;
        if (curLossStreak > maxConsecutiveLosses) maxConsecutiveLosses = curLossStreak;
      }

      runningPnl += pnl;
      if (runningPnl > peakPnl) peakPnl = runningPnl;
      const dd = peakPnl - runningPnl;
      if (dd > maxDrawdown) maxDrawdown = dd;

      const baseEquity = riskConfig.accountCapital + peakPnl;
      const ddPct = baseEquity > 0 ? Number(((dd / baseEquity) * 100).toFixed(2)) : 0;

      const dateKey = (t.exitDate || t.entryDate).split('T')[0];
      dailySeries.push({
        date: dateKey,
        grossPnl: pnl,
        netPnl: Number((pnl - charges).toFixed(2)),
        tradesCount: 1,
        winCount: pnl > 0 ? 1 : 0,
        cumulativePnl: Number(runningPnl.toFixed(2)),
        drawdown: -Number(dd.toFixed(2)),
        drawdownPct: -ddPct,
      });
    });

    const totalClosed = winCount + lossCount;
    const winRate = totalClosed > 0 ? Number(((winCount / totalClosed) * 100).toFixed(1)) : 0;
    const avgRiskReward = rrCount > 0 ? Number((rrSum / rrCount).toFixed(2)) : 0;
    const avgWin = winCount > 0 ? Math.round(grossWins / winCount) : 0;
    const avgLoss = lossCount > 0 ? Math.round(grossLosses / lossCount) : 0;
    const profitFactor =
      grossLosses > 0
        ? Number((grossWins / grossLosses).toFixed(2))
        : grossWins > 0
        ? 9.99
        : 0;

    const winProb = totalClosed > 0 ? winCount / totalClosed : 0;
    const lossProb = totalClosed > 0 ? lossCount / totalClosed : 0;
    const expectancy = Math.round(winProb * avgWin - lossProb * avgLoss);
    const expectancyR = rMultipleCount > 0 ? Number((rMultipleSum / rMultipleCount).toFixed(2)) : 0;

    let sharpeRatio = 0;
    let sortinoRatio = 0;
    if (returnsArray.length >= 2) {
      const mean = returnsArray.reduce((a, b) => a + b, 0) / returnsArray.length;
      const variance =
        returnsArray.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
        (returnsArray.length - 1);
      const stdDev = Math.sqrt(variance);
      const downsideVariance =
        returnsArray.reduce((acc, v) => acc + (v < 0 ? Math.pow(v, 2) : 0), 0) /
        returnsArray.length;
      const downsideDev = Math.sqrt(downsideVariance);

      if (stdDev > 0) sharpeRatio = Number(((mean / stdDev) * Math.sqrt(Math.min(50, returnsArray.length))).toFixed(2));
      if (downsideDev > 0) sortinoRatio = Number(((mean / downsideDev) * Math.sqrt(Math.min(50, returnsArray.length))).toFixed(2));
    }

    const maxDrawdownPct =
      riskConfig.accountCapital > 0
        ? Number(((maxDrawdown / riskConfig.accountCapital) * 100).toFixed(2))
        : 0;

    const netRealizedPnl = Number((totalRealizedPnl - totalChargesPaid).toFixed(2));
    const openHeatPct =
      riskConfig.accountCapital > 0
        ? Number(((openHeatCapital / riskConfig.accountCapital) * 100).toFixed(2))
        : 0;

    const ruleComplianceScore =
      trades.length > 0 ? Math.round((checklistPassCount / trades.length) * 100) : 100;

    const byStrategy: StrategyPerformance[] = Array.from(strategyMap.entries())
      .map(([strategy, s]) => ({
        strategy,
        tradesCount: s.count,
        winCount: s.wins,
        winRate: s.count > 0 ? Number(((s.wins / s.count) * 100).toFixed(1)) : 0,
        totalPnl: Math.round(s.pnl),
        avgRMultiple: s.count > 0 ? Number((s.rSum / s.count).toFixed(2)) : 0,
        profitFactor:
          s.grossLoss > 0
            ? Number((s.grossWin / s.grossLoss).toFixed(2))
            : s.grossWin > 0
            ? 5.0
            : 0,
      }))
      .sort((a, b) => b.totalPnl - a.totalPnl);

    return {
      capitalDeployed: Math.round(capitalDeployed),
      totalRealizedPnl: Math.round(totalRealizedPnl),
      totalUnrealizedPnl: Math.round(totalUnrealizedPnl),
      netRealizedPnl: Math.round(netRealizedPnl),
      totalChargesPaid: Math.round(totalChargesPaid),
      todayPnl: Math.round(totalUnrealizedPnl + (dailySeries[dailySeries.length - 1]?.grossPnl || 0)),
      winRate,
      winCount,
      lossCount,
      totalTrades: trades.length,
      openTradesCount: trades.filter((t) => t.status === 'OPEN').length,
      avgRiskReward,
      profitFactor,
      expectancy,
      expectancyR,
      avgWin,
      avgLoss,
      largestWin: Math.round(largestWin),
      largestLoss: Math.round(largestLoss),
      maxDrawdown: Math.round(maxDrawdown),
      maxDrawdownPct,
      sharpeRatio,
      sortinoRatio,
      maxConsecutiveWins,
      maxConsecutiveLosses,
      currentStreak,
      ruleComplianceScore,
      openHeatCapital: Math.round(openHeatCapital),
      openHeatPct,
      byStrategy,
      dailySeries,
    };
  },

  getEquityCurveData: (trades: Trade[]) => {
    const closed = trades
      .filter((t) => t.status === 'CLOSED' && (t.exitDate || t.entryDate))
      .sort(
        (a, b) =>
          new Date(a.exitDate || a.entryDate).getTime() -
          new Date(b.exitDate || b.entryDate).getTime()
      );

    let runningGross = 0;
    let runningNet = 0;
    let peak = 0;

    const points: {
      date: string;
      pnl: number;
      netPnl: number;
      drawdown: number;
      trade: string;
      rMultiple: number;
    }[] = [
      {
        date: 'Initial',
        pnl: 0,
        netPnl: 0,
        drawdown: 0,
        trade: 'Base Desk Capital',
        rMultiple: 0,
      },
    ];

    closed.forEach((raw) => {
      const t = enrichTradeMetrics(raw);
      const gross = t.realizedPnl || 0;
      const charges = t.charges || 0;
      runningGross += gross;
      runningNet += gross - charges;
      if (runningGross > peak) peak = runningGross;
      const dd = runningGross - peak;

      const label = (t.exitDate || t.entryDate).split('T')[0];
      points.push({
        date: label,
        pnl: Math.round(runningGross),
        netPnl: Math.round(runningNet),
        drawdown: Math.round(dd),
        trade: `${t.symbol} (${gross >= 0 ? '+' : ''}₹${gross.toLocaleString('en-IN')})`,
        rMultiple: t.rMultiple || 0,
      });
    });

    return points;
  },
};
