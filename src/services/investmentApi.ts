/**

* Investment Holdings API Service (100% Spring Boot Backend Mode)
 *
 * All MongoDB reads/writes, live NSE/BSE equity price enrichment, live AMFI Mutual Fund NAV
 * enrichment, and IIFL Capital Demat holdings merging are executed by the Spring Boot API
 * (`/api/investment-holdings`).
 */

import apiClient from './apiClient';
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
   * Fetches live-enriched holdings from Spring Boot (`GET /api/investment-holdings`).
   */
  getHoldings: async (): Promise<InvestmentHolding[]> => {
    const { data } = await apiClient.get<any[]>(ENDPOINT);
    if (!Array.isArray(data)) return [];
    return data.map(normalizeHolding);
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
