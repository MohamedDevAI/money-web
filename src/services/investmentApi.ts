/**
 * Investment Holdings API Service (100% Pure API Mode)
 *
 * Fetches and mutates holdings strictly via:
 *   1. Spring Boot + MongoDB Backend (/api/investment-holdings)
 *   2. IIFL Interactive Demat Portfolio API (/interactive/portfolio/holdings)
 * Zero mock, seed, or localStorage data is used.
 */

import apiClient from './apiClient';
import { iiflService } from './iiflService';
import { CategoryStats, InvestmentCategory, InvestmentHolding, PortfolioStats } from '../interface';

const ENDPOINT = '/investment-holdings';

const normalizeHolding = (raw: any): InvestmentHolding => {
  const id = raw._id || raw.id || '';
  return {
    ...raw,
    id: typeof id === 'object' ? String(id) : String(id),
    _id: typeof id === 'object' ? String(id) : String(id),
  } as InvestmentHolding;
};

export const investmentApi = {
  /**
   * Fetches live holdings strictly from Backend REST API and IIFL Demat Holdings API.
   */
  getHoldings: async (): Promise<InvestmentHolding[]> => {
    const results: InvestmentHolding[] = [];

    // 1. Fetch from Backend API (/api/investment-holdings)
    try {
      const { data } = await apiClient.get<any[]>(ENDPOINT);
      if (Array.isArray(data)) {
        results.push(...data.map(normalizeHolding));
      }
    } catch {
      // Backend endpoint unavailable or returned empty
    }

    // 2. Fetch live Demat Equity holdings from IIFL Interactive API
    try {
      const iiflHoldings = await iiflService.getDematHoldings();
      for (const h of iiflHoldings) {
        const alreadyExists = results.some(
          (r) =>
            (r.ticker && h.ticker && r.ticker.toUpperCase() === h.ticker.toUpperCase()) ||
            r.id === h.id
        );
        if (!alreadyExists) {
          results.push(h);
        }
      }
    } catch {
      // IIFL Interactive session not active or returned empty
    }

    return results;
  },

  createHolding: async (
    holding: Omit<InvestmentHolding, 'id' | '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<InvestmentHolding> => {
    const { data } = await apiClient.post<any>(ENDPOINT, {
      ...holding,
      currency: holding.currency || 'INR',
    });
    return normalizeHolding(data);
  },

  updateHolding: async (
    id: string,
    updates: Partial<InvestmentHolding>
  ): Promise<InvestmentHolding | null> => {
    const { data } = await apiClient.put<any>(`${ENDPOINT}/${id}`, updates);
    return data ? normalizeHolding(data) : null;
  },

  deleteHolding: async (id: string): Promise<void> => {
    await apiClient.delete(`${ENDPOINT}/${id}`);
  },

  computePortfolioStats: (holdings: InvestmentHolding[]): PortfolioStats => {
    const CATEGORIES: InvestmentCategory[] = ['Stocks', 'Mutual Funds', 'Bonds', 'FDs'];

    let totalInvested = 0;
    let currentValue = 0;

    for (const h of holdings) {
      totalInvested += h.buyPrice * h.quantity;
      currentValue += h.currentPrice * h.quantity;
    }

    const totalReturn = currentValue - totalInvested;
    const totalReturnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    let todayChange = 0;
    let todayChangePct = 0;
    for (const h of holdings) {
      if (h.priceHistory && h.priceHistory.length >= 2) {
        const prev = h.priceHistory[h.priceHistory.length - 2];
        const curr = h.priceHistory[h.priceHistory.length - 1];
        todayChange += (curr - prev) * h.quantity;
      }
    }
    if (currentValue > 0) {
      const previousValue = currentValue - todayChange;
      todayChangePct = previousValue > 0 ? (todayChange / previousValue) * 100 : 0;
    }

    let monthlySipTotal = 0;
    for (const h of holdings) {
      if ((h.category === 'Mutual Funds' || h.category === 'SIPs') && h.mutualFundMetrics?.sipAmount) {
        monthlySipTotal += Number(h.mutualFundMetrics.sipAmount);
      }
    }

    const byCategory: CategoryStats[] = CATEGORIES.map((cat) => {
      const catHoldings = holdings.filter((h) => {
        if (cat === 'Mutual Funds') {
          return h.category === 'Mutual Funds' || h.category === 'SIPs';
        }
        return h.category === cat;
      });
      const catInvested = catHoldings.reduce((s, h) => s + h.buyPrice * h.quantity, 0);
      const catCurrent = catHoldings.reduce((s, h) => s + h.currentPrice * h.quantity, 0);
      const returnPct = catInvested > 0 ? ((catCurrent - catInvested) / catInvested) * 100 : 0;
      const allocationPct = currentValue > 0 ? (catCurrent / currentValue) * 100 : 0;

      return {
        category: cat,
        invested: catInvested,
        currentValue: catCurrent,
        returnPct,
        holdingCount: catHoldings.length,
        allocationPct,
      };
    });

    return {
      totalInvested,
      currentValue,
      totalReturn,
      totalReturnPct,
      todayChange,
      todayChangePct,
      monthlySipTotal,
      byCategory,
    };
  },

  getFlaggedHoldings: (holdings: InvestmentHolding[]): InvestmentHolding[] => {
    return holdings.filter((h) => {
      const returnPct =
        h.buyPrice > 0 ? ((h.currentPrice - h.buyPrice) / h.buyPrice) * 100 : 0;
      return (
        h.verdict === 'Sell' ||
        (h.confidence !== undefined && h.confidence < 40) ||
        returnPct < -3
      );
    });
  },

  getByCategory: (
    holdings: InvestmentHolding[],
    category: InvestmentCategory
  ): InvestmentHolding[] => {
    return holdings.filter((h) => h.category === category);
  },

  getById: (
    holdings: InvestmentHolding[],
    id: string
  ): InvestmentHolding | undefined => {
    return holdings.find((h) => h.id === id || h._id === id);
  },
};
