// ─── Investment Holdings & Portfolio Interfaces (Money DB) ───────────────────

export type InvestmentCategory = 'Mutual Funds' | 'Bonds' | 'FDs' | 'Stocks' | 'SIPs';
export type Verdict = 'Buy' | 'Hold' | 'Sell';

/** Fundamental financial metrics — Stocks only */
export interface FundamentalMetrics {
  roe?: number;                // Return on Equity %
  roce?: number;               // Return on Capital Employed %
  debtToEquity?: number;       // D/E ratio
  freeCashFlow?: number;       // ₹ Crores
  peRatio?: number;
  pbRatio?: number;
  marketCap?: number;          // ₹ Crores
  promoterHolding?: number;    // current %
  promoterHoldingChange?: number;  // QoQ change in %
  moatRating?: 'Wide' | 'Narrow' | 'None';
  governanceScore?: number;    // 1–10
  sector?: string;
}

/** Mutual Fund & SIP specific metrics */
export interface MutualFundMetrics {
  cagr3yr?: number;
  cagr5yr?: number;
  cagr10yr?: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  expenseRatio?: number;       // %
  alphaVsBenchmark?: number;   // % over benchmark
  beta?: number;
  fundManagerTenure?: number;  // years
  exitLoadPeriod?: number;    // months
  exitLoadPercent?: number;
  sipAmount?: number;         // monthly SIP amount in ₹
  sipDay?: number;            // day of month (e.g. 5, 10, 15)
  sipActive?: boolean;
  fundHouse?: string;
  benchmark?: string;
}

/** Bond-specific metrics */
export interface BondMetrics {
  creditRating?: string;
  yieldToMaturity?: number;
  duration?: number;
  bondType?: 'Government' | 'Corporate' | 'Tax-Free';
  couponRate?: number;
  maturityDate?: string;
  faceValue?: number;
  issuer?: string;
}

/** Fixed Deposit specific metrics */
export interface FDMetrics {
  interestRate: number;
  fdType?: 'Cumulative' | 'Non-Cumulative';
  tenure?: number;
  maturityDate?: string;
  maturityAmount?: number;
  bankName?: string;
  taxTreatment?: 'Taxable' | 'Tax-Saver (80C)';
  payoutFrequency?: 'Monthly' | 'Quarterly' | 'Annual' | 'Maturity';
}

/** Technical indicators computed from price history */
export interface TechnicalIndicators {
  rsi14: number;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
  sma50: number;
  sma200: number;
  ema20: number;
  bollingerUpper: number;
  bollingerLower: number;
  bollingerMiddle: number;
  atr14: number;
  volume?: number;
  avgVolume20?: number;
}

export interface InvestmentHolding {
  id: string;
  _id?: string;
  name: string;               // e.g. "Reliance Industries", "HDFC Mid-Cap Fund"
  ticker?: string;            // e.g. "RELIANCE.NS"
  category: InvestmentCategory;
  buyPrice: number;           // per unit/share in INR
  currentPrice: number;       // latest price in INR
  quantity: number;           // number of shares/units
  buyDate: string;            // ISO date e.g. "2024-06-01"
  currency: string;           // always "INR"

  // Scoring outputs (computed client-side by scoring engine)
  verdict?: Verdict;
  confidence?: number;        // 0–100%

  // 90-day daily closing prices for charts + technicals computation
  priceHistory?: number[];

  // Category-specific metrics — only the relevant block is populated
  fundamentals?: FundamentalMetrics;       // Stocks
  mutualFundMetrics?: MutualFundMetrics;   // Mutual Funds & SIPs
  bondMetrics?: BondMetrics;               // Bonds
  fdMetrics?: FDMetrics;                   // FDs
  technicals?: TechnicalIndicators;        // Stocks + MFs

  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScoringFactor {
  name: string;
  score: number;              // -2 to +2
  maxScore: number;           // always 2
  detail: string;             // e.g. "RSI at 28 — oversold"
  direction: 'positive' | 'neutral' | 'negative';
}

/** Output of the rule-based scoring engine */
export interface ScoringResult {
  verdict: Verdict;
  confidence: number;         // 0–100 normalised percentage
  totalScore: number;         // raw summed score
  maxPossibleScore: number;
  factors: ScoringFactor[];
}

export interface CategoryStats {
  category: InvestmentCategory;
  invested: number;
  currentValue: number;
  returnPct: number;
  holdingCount: number;
  allocationPct: number;
}

/** Aggregated stats for the whole portfolio or a category */
export interface PortfolioStats {
  totalInvested: number;
  currentValue: number;
  totalReturn: number;
  totalReturnPct: number;
  todayChange: number;
  todayChangePct: number;
  monthlySipTotal?: number;
  byCategory: CategoryStats[];
}
