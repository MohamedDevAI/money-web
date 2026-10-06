/**
 * Investment Holdings API Service
 *
 * Backend target: Spring Boot + MongoDB Atlas
 *   Database:    money  (via @Qualifier("moneyTemplate") MongoTemplate)
 *   Collection:  investment_holdings
 *   Base path:   /api/investment-holdings
 */

import apiClient from './apiClient';
import { CategoryStats, InvestmentCategory, InvestmentHolding, PortfolioStats } from '../interface';

// ─── Endpoint ─────────────────────────────────────────────────────────────────
const ENDPOINT = '/investment-holdings';

// ─── ID Normalizer ─────────────────────────────────────────────────────────────
/**
 * MongoDB returns _id; our frontend types use id.
 * Normalize so both fields are always present.
 */
const normalizeHolding = (raw: any): InvestmentHolding => {
  const id = raw._id || raw.id || `inv-${Date.now()}`;
  return {
    ...raw,
    id: typeof id === 'object' ? String(id) : id,
    _id: typeof id === 'object' ? String(id) : id,
  } as InvestmentHolding;
};

// ─── API Methods ──────────────────────────────────────────────────────────────

export const investmentApi = {

  // ── Read ────────────────────────────────────────────────────────────────────

  /**
   * GET /api/investment-holdings
   * Fetches all holdings from the money MongoDB database.
   */
  getHoldings: async (): Promise<InvestmentHolding[]> => {
    try {
      const { data } = await apiClient.get<any[]>(ENDPOINT, { timeout: 6000 });
      if (Array.isArray(data)) {
        return data.map(normalizeHolding);
      }
    } catch (e) {
      console.warn('[investmentApi] GET failed:', e);
    }
    return [];
  },

  // ── Create ──────────────────────────────────────────────────────────────────

  /**
   * POST /api/investment-holdings
   * Creates a new holding in money.investment_holdings.
   */
  createHolding: async (
    holding: Omit<InvestmentHolding, 'id' | '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<InvestmentHolding> => {
    const payload = {
      ...holding,
      currency: holding.currency || 'INR',
      createdAt: new Date().toISOString(),
    };

    const { data } = await apiClient.post<any>(ENDPOINT, payload);
    return normalizeHolding(data);
  },

  // ── Update ──────────────────────────────────────────────────────────────────

  /**
   * PUT /api/investment-holdings/{id}
   * Updates an existing holding in money.investment_holdings.
   */
  updateHolding: async (
    id: string,
    updates: Partial<InvestmentHolding>
  ): Promise<InvestmentHolding | null> => {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const { data } = await apiClient.put<any>(`${ENDPOINT}/${id}`, payload);
    return data ? normalizeHolding(data) : null;
  },

  // ── Delete ──────────────────────────────────────────────────────────────────

  /**
   * DELETE /api/investment-holdings/{id}
   * Removes holding from money.investment_holdings.
   */
  deleteHolding: async (id: string): Promise<void> => {
    await apiClient.delete(`${ENDPOINT}/${id}`);
  },

  // ── Computed Aggregations (client-side, no extra API calls) ─────────────────

  /**
   * Compute portfolio-level stats from a list of holdings.
   * Call this after getHoldings() to get totals + per-category breakdown.
   */
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

    // Approximate today's change: use last two price history entries if available
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

  /**
   * Return holdings that need attention:
   *   - verdict === 'Sell'
   *   - confidence < 40 (low conviction)
   *   - in loss > 5%
   */
  getFlaggedHoldings: (holdings: InvestmentHolding[]): InvestmentHolding[] => {
    return holdings.filter((h) => {
      const returnPct = h.buyPrice > 0
        ? ((h.currentPrice - h.buyPrice) / h.buyPrice) * 100
        : 0;
      return (
        h.verdict === 'Sell' ||
        (h.confidence !== undefined && h.confidence < 40) ||
        returnPct < -5
      );
    });
  },

  /** Filter holdings by category */
  getByCategory: (
    holdings: InvestmentHolding[],
    category: InvestmentCategory
  ): InvestmentHolding[] => {
    return holdings.filter((h) => h.category === category);
  },

  /** Find a single holding by id */
  getById: (
    holdings: InvestmentHolding[],
    id: string
  ): InvestmentHolding | undefined => {
    return holdings.find((h) => h.id === id || h._id === id);
  },
};
