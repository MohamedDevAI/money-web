/**
 * Trading Service for Money Hub Trading Workspace.
 * Tracks Open Positions, Trade Journal (Closed Trades), Realized & Unrealized P&L in INR (₹).
 */

import type { Trade, TradingStats } from '../interface';
import apiClient from './apiClient';

export const tradingService = {
  getTrades: async (): Promise<Trade[]> => {
    try {
      const { data } = await apiClient.get<Trade[]>('/trading');
      if (Array.isArray(data)) {
        return data;
      }
    } catch {
      // Backend may not have trading endpoint yet; return empty
    }
    return [];
  },

  createTrade: async (tradeData: Omit<Trade, 'id'>): Promise<Trade> => {
    const isLong = tradeData.direction === 'LONG';
    const currentPrice = Number(tradeData.currentPrice || tradeData.entryPrice);
    const entryPrice = Number(tradeData.entryPrice);
    const qty = Number(tradeData.quantity);
    const isClosed = tradeData.status === 'CLOSED';

    const pnlMultiplier = isLong ? 1 : -1;
    const diff = (isClosed && tradeData.exitPrice ? Number(tradeData.exitPrice) : currentPrice) - entryPrice;
    const computedPnl = diff * qty * pnlMultiplier;
    const pnlPct = entryPrice > 0 ? (diff / entryPrice) * 100 * pnlMultiplier : 0;

    const risk = Math.abs(entryPrice - Number(tradeData.stopLoss));
    const reward = Math.abs(Number(tradeData.targetPrice) - entryPrice);
    const rr = risk > 0 ? Number((reward / risk).toFixed(2)) : 1;

    const newTrade: Trade = {
      ...tradeData,
      id: `tr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      entryPrice,
      currentPrice,
      quantity: qty,
      stopLoss: Number(tradeData.stopLoss),
      targetPrice: Number(tradeData.targetPrice),
      unrealizedPnl: isClosed ? 0 : computedPnl,
      realizedPnl: isClosed ? computedPnl : 0,
      pnlPercent: Number(pnlPct.toFixed(2)),
      riskRewardRatio: rr,
      entryDate: tradeData.entryDate || new Date().toISOString(),
    };

    const { data } = await apiClient.post<Trade>('/trading', newTrade);
    return data || newTrade;
  },

  updateTrade: async (id: string, updates: Partial<Trade>): Promise<Trade> => {
    const merged = { ...updates } as Trade;
    const isLong = merged.direction === 'LONG';
    const isClosed = merged.status === 'CLOSED';
    const entryPrice = Number(merged.entryPrice);
    const effectivePrice = isClosed && merged.exitPrice ? Number(merged.exitPrice) : Number(merged.currentPrice);
    const pnlMultiplier = isLong ? 1 : -1;
    const diff = effectivePrice - entryPrice;
    const computedPnl = diff * Number(merged.quantity) * pnlMultiplier;

    const risk = Math.abs(entryPrice - Number(merged.stopLoss));
    const reward = Math.abs(Number(merged.targetPrice) - entryPrice);
    const rr = risk > 0 ? Number((reward / risk).toFixed(2)) : 1;

    const finalTrade: Trade = {
      ...merged,
      unrealizedPnl: isClosed ? 0 : computedPnl,
      realizedPnl: isClosed ? computedPnl : 0,
      pnlPercent: entryPrice > 0 ? Number(((diff / entryPrice) * 100 * pnlMultiplier).toFixed(2)) : 0,
      riskRewardRatio: rr,
    };

    const { data } = await apiClient.put<Trade>(`/trading/${id}`, finalTrade);
    return data || finalTrade;
  },

  closeTrade: async (id: string, exitPrice: number): Promise<Trade> => {
    return tradingService.updateTrade(id, {
      status: 'CLOSED',
      exitPrice: Number(exitPrice),
      exitDate: new Date().toISOString(),
    });
  },

  deleteTrade: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/trading/${id}`);
    return true;
  },

  computeTradingStats: (trades: Trade[]): TradingStats => {
    let capitalDeployed = 0;
    let totalRealizedPnl = 0;
    let totalUnrealizedPnl = 0;
    let winCount = 0;
    let lossCount = 0;
    let rrSum = 0;
    let rrCount = 0;

    trades.forEach((t) => {
      if (t.riskRewardRatio) {
        rrSum += t.riskRewardRatio;
        rrCount++;
      }

      if (t.status === 'OPEN') {
        capitalDeployed += t.entryPrice * t.quantity;
        totalUnrealizedPnl += (t.unrealizedPnl || 0);
      } else {
        const pnl = t.realizedPnl || 0;
        totalRealizedPnl += pnl;
        if (pnl > 0) winCount++;
        else if (pnl < 0) lossCount++;
      }
    });

    const totalClosed = winCount + lossCount;
    const winRate = totalClosed > 0 ? (winCount / totalClosed) * 100 : 0;
    const avgRiskReward = rrCount > 0 ? Number((rrSum / rrCount).toFixed(2)) : 2.0;

    return {
      capitalDeployed,
      totalRealizedPnl,
      totalUnrealizedPnl,
      winRate: Number(winRate.toFixed(1)),
      winCount,
      lossCount,
      totalTrades: trades.length,
      openTradesCount: trades.filter((t) => t.status === 'OPEN').length,
      avgRiskReward,
    };
  },

  getEquityCurveData: (trades: Trade[]) => {
    // Generate cumulative P&L progression for closed and open trades
    const closed = trades
      .filter((t) => t.status === 'CLOSED' && t.exitDate)
      .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());

    let runningPnl = 0;
    const points: { date: string; pnl: number; trade: string }[] = [
      { date: 'Initial', pnl: 0, trade: 'Base Capital' }
    ];

    closed.forEach((t) => {
      runningPnl += (t.realizedPnl || 0);
      const label = t.exitDate ? t.exitDate.split('T')[0] : 'Trade';
      points.push({
        date: label,
        pnl: runningPnl,
        trade: `${t.symbol} (${(t.realizedPnl || 0) >= 0 ? '+' : ''}₹${(t.realizedPnl || 0).toLocaleString('en-IN')})`
      });
    });

    return points;
  }
};

