/**
 * Centralized React Query Keys
 * Ensures canonical keys across queries and mutation invalidations.
 */

export const QUERY_KEYS = {
  // General Life OS
  EXPENSES: ['expenses'] as const,
  HABITS: ['habits'] as const,
  GOALS: ['goals'] as const,
  TASKS: ['tasks'] as const,

  // Transactions & Expense Tracker
  TRANSACTIONS: (month?: string, year?: number) =>
    month !== undefined || year !== undefined
      ? (['transactions', month, year] as const)
      : (['transactions'] as const),
  CATEGORIES: ['categories'] as const,
  DASHBOARD_SUMMARY: (month?: number, year?: number) =>
    month !== undefined || year !== undefined
      ? (['dashboardSummary', month, year] as const)
      : (['dashboardSummary'] as const),

  // Planned Expenses
  PLANNED_EXPENSES: (month?: string, year?: number) =>
    month !== undefined || year !== undefined
      ? (['plannedExpenses', month, year] as const)
      : (['plannedExpenses'] as const),

  // Borrow & Repay
  BORROW_REPAY_RECORDS: ['borrowRepayRecords'] as const,
  PLANNED_REPAYMENTS: ['plannedRepayments'] as const,
  PLANNED_REPAY_CREDIT_MATRIX: ['plannedRepayCreditMatrix'] as const,
  PLANNED_REPAY_CREDIT_ITEMS: ['plannedRepayCreditItems'] as const,

  // Investments & Trading
  INVESTMENT_HOLDINGS: ['investmentHoldings'] as const,
  TRADES: ['tradingTrades'] as const,

  // Notes & Reminders
  STICKY_NOTES: ['sticky-notes'] as const,
  REMINDERS: ['reminders'] as const,

  // System
  BACKEND_HEALTH: ['backendHealth'] as const,

  // Financial Health & FIRE Freedom
  FINANCIAL_HEALTH: ['financialHealth'] as const,
} as const;
