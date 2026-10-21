/**
 * Investment Holdings API Service
 *
 * Backend target: Spring Boot + MongoDB Atlas
 *   Database:    money  (via @Qualifier("moneyTemplate") MongoTemplate)
 *   Collection:  investment_holdings
 *   Base path:   /api/investment-holdings
 * Includes resilient hybrid local storage + institutional seed data fallback.
 */

import apiClient from './apiClient';
import { CategoryStats, InvestmentCategory, InvestmentHolding, PortfolioStats } from '../interface';
import { SEED_HOLDINGS } from '../domain/seedData';

const ENDPOINT = '/investment-holdings';
const LOCAL_HOLDINGS_KEY = 'money_os_holdings_v2';

const normalizeHolding = (raw: any): InvestmentHolding => {
  const id = raw._id || raw.id || `inv-${Date.now()}`;
  return {
    ...raw,
    id: typeof id === 'object' ? String(id) : id,
    _id: typeof id === 'object' ? String(id) : id,
  } as InvestmentHolding;
};

function getLocalHoldings(): InvestmentHolding[] {
  try {
    const raw = localStorage.getItem(LOCAL_HOLDINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeHolding);
      }
    }
  } catch {
    // ignore storage errors
  }
  saveLocalHoldings(SEED_HOLDINGS);
  return SEED_HOLDINGS;
}

function saveLocalHoldings(holdings: InvestmentHolding[]): void {
  try {
    localStorage.setItem(LOCAL_HOLDINGS_KEY, JSON.stringify(holdings));
  } catch {
    // ignore storage errors
  }
}

export const investmentApi = {
  getHoldings: async (): Promise<InvestmentHolding[]> => {
    try {
      const { data } = await apiClient.get<any[]>(ENDPOINT, { timeout: 4000 });
      if (Array.isArray(data) && data.length > 0) {
        const normalized = data.map(normalizeHolding);
        saveLocalHoldings(normalized);
        return normalized;
      }
    } catch {
      // Backend offline — serve local institutional holdings
    }
    return getLocalHoldings();
  },

  createHolding: async (
    holding: Omit<InvestmentHolding, 'id' | '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<InvestmentHolding> => {
    const newHolding = normalizeHolding({
      ...holding,
      id: `inv-${Date.now()}`,
      currency: holding.currency || 'INR',
      createdAt: new Date().toISOString(),
    });

    const current = getLocalHoldings();
    saveLocalHoldings([newHolding, ...current]);

    try {
      const { data } = await apiClient.post<any>(ENDPOINT, newHolding);
      if (data) return normalizeHolding(data);
    } catch {
      // Stored locally
    }
    return newHolding;
  },

  updateHolding: async (
    id: string,
    updates: Partial<InvestmentHolding>
  ): Promise<InvestmentHolding | null> => {
    const current = getLocalHoldings();
    const existing = current.find((h) => h.id === id || h._id === id);
    const updated = normalizeHolding({
      ...(existing || {}),
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    });

    saveLocalHoldings(current.map((h) => (h.id === id || h._id === id ? updated : h)));

    try {
      const { data } = await apiClient.put<any>(`${ENDPOINT}/${id}`, updated);
      if (data) return normalizeHolding(data);
    } catch {
      // Stored locally
    }
    return updated;
  },

  deleteHolding: async (id: string): Promise<void> => {
    const current = getLocalHoldings();
    saveLocalHoldings(current.filter((h) => h.id !== id && h._id !== id));
    try {
      await apiClient.delete(`${ENDPOINT}/${id}`);
    } catch {
      // Deleted locally
    }
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
      const returnPct = h.buyPrice > 0
        ? ((h.currentPrice - h.buyPrice) / h.buyPrice) * 100
        : 0;
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
