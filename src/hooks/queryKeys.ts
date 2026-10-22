/**
 * Centralized React Query Keys for Money OS (Investing & Pro Trading Only)
 * Ensures canonical keys across queries and mutation invalidations.
 */

export const QUERY_KEYS = {
  // Investments & Pro Trading
  INVESTMENT_HOLDINGS: ['investmentHoldings'] as const,
  TRADES: ['tradingTrades'] as const,

  // System
  BACKEND_HEALTH: ['backendHealth'] as const,

  // Financial Health & FIRE Freedom
  FINANCIAL_HEALTH: ['financialHealth'] as const,
} as const;
