// ─── Institutional Trading Engine, Derivatives & Risk Interfaces ─────────────

export type TradeStatus = 'OPEN' | 'CLOSED';
export type TradeDirection = 'LONG' | 'SHORT';
export type InstrumentType = 'EQUITY' | 'F&O' | 'CRYPTO' | 'COMMODITY';
export type TradeType = 'INTRADAY' | 'SWING' | 'POSITIONAL';
export type OrderType = 'MARKET' | 'LIMIT' | 'SL-M';
export type ProductType = 'MIS' | 'NRML' | 'CNC';
export type SetupGrade = 'A+' | 'A' | 'B' | 'C';
export type EmotionState = 'Calm' | 'Disciplined' | 'Confident' | 'FOMO' | 'Revenge' | 'Hesitant';

export interface BrokerageBreakdown {
  turnover: number;
  brokerage: number;
  stt: number;
  exchangeTxnCharge: number;
  sebiFee: number;
  gst: number;
  stampDuty: number;
  totalCharges: number;
  breakevenPoints: number;
}

export interface Trade {
  id: string;
  symbol: string;
  instrument: InstrumentType;
  direction: TradeDirection;
  tradeType: TradeType;
  orderType?: OrderType;
  productType?: ProductType;
  entryPrice: number;
  currentPrice: number;
  exitPrice?: number;
  stopLoss: number;
  targetPrice: number;
  quantity: number;
  lotSize?: number;
  entryDate: string;
  exitDate?: string;
  status: TradeStatus;
  strategy?: string;
  setupGrade?: SetupGrade;
  emotion?: EmotionState;
  checklistPassed?: boolean;
  notes?: string;
  tags?: string[];
  realizedPnl?: number;
  unrealizedPnl?: number;
  netPnl?: number;
  charges?: number;
  pnlPercent?: number;
  riskRewardRatio?: number;
  rMultiple?: number;
  initialRiskAmount?: number;
  marginUsed?: number;
}

export interface StrategyPerformance {
  strategy: string;
  tradesCount: number;
  winCount: number;
  winRate: number;
  totalPnl: number;
  avgRMultiple: number;
  profitFactor: number;
}

export interface DailyPnlPoint {
  date: string;
  grossPnl: number;
  netPnl: number;
  tradesCount: number;
  winCount: number;
  cumulativePnl: number;
  drawdown: number;
  drawdownPct: number;
}

export interface TradingStats {
  capitalDeployed: number;
  totalRealizedPnl: number;
  totalUnrealizedPnl: number;
  netRealizedPnl: number;
  totalChargesPaid: number;
  todayPnl: number;
  winRate: number;
  winCount: number;
  lossCount: number;
  totalTrades: number;
  openTradesCount: number;
  avgRiskReward: number;
  profitFactor: number;
  expectancy: number;
  expectancyR: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  currentStreak: number;
  ruleComplianceScore: number;
  openHeatCapital: number;
  openHeatPct: number;
  byStrategy: StrategyPerformance[];
  dailySeries: DailyPnlPoint[];
}

// ─── Market Watchlist, Charting & L2 Order Book Interfaces ───────────────────

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '1D' | '1W';

export interface WatchlistInstrument {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE' | 'NFO' | 'MCX' | 'CRYPTO';
  instrument: InstrumentType;
  sector: string;
  ltp: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePct: number;
  volume: number;
  vwap: number;
  lotSize: number;
  atr14: number;
  rsi14: number;
  iv: number;
  pcr: number;
  bid: number;
  ask: number;
  tickDirection?: 'up' | 'down' | 'flat';
}

export interface OHLCCandle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  ema20: number;
  sma50: number;
  sma200: number;
  bollingerUpper: number;
  bollingerLower: number;
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  isBullish: boolean;
  candleRange: [number, number];
  bodyRange: [number, number];
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orders: number;
  cumulativeQty: number;
  depthPct: number;
}

export interface OrderBookDepth {
  symbol: string;
  ltp: number;
  spread: number;
  spreadPct: number;
  totalBidQty: number;
  totalAskQty: number;
  buyPressurePct: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

// ─── Risk Management & Pre-Trade Guardrails Interfaces ──────────────────────

export interface TradingRiskConfig {
  accountCapital: number;
  maxRiskPerTradePct: number;       // e.g. 1.0% of account capital
  maxDailyLossPct: number;          // e.g. 3.0% daily kill-switch
  maxOpenRiskPct: number;           // e.g. 5.0% total portfolio heat
  maxOpenPositions: number;         // e.g. 5 concurrent open trades
  minRiskRewardRatio: number;       // e.g. 1.5 minimum R:R
  enforcePreTradeChecklist: boolean;
  revengeCooldownLosses: number;    // e.g. 3 consecutive losses triggers warning
}

export interface GuardrailViolation {
  id: string;
  severity: 'BLOCKER' | 'WARNING' | 'PASS';
  rule: string;
  message: string;
  currentValue: string;
  limitValue: string;
}

export interface GuardrailEvaluation {
  status: 'CLEAR' | 'WARNING' | 'KILL_SWITCH_LOCKED';
  canExecute: boolean;
  dailyLossUsedPct: number;
  openHeatUsedPct: number;
  consecutiveLossesToday: number;
  violations: GuardrailViolation[];
}

// ─── Options & Derivatives Strategy Builder Interfaces ───────────────────────

export type OptionType = 'CE' | 'PE' | 'FUT';
export type LegAction = 'BUY' | 'SELL';

export interface OptionLeg {
  id: string;
  optionType: OptionType;
  action: LegAction;
  strike: number;
  premium: number;
  lots: number;
  lotSize: number;
  iv: number;
  daysToExpiry: number;
}

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface PayoffPoint {
  spot: number;
  expiryPnl: number;
  t0Pnl: number;
  changePct: number;
}

export interface OptionStrategyAnalysis {
  netPremium: number;       // positive = net credit, negative = net debit
  maxProfit: number | 'UNLIMITED';
  maxLoss: number | 'UNLIMITED';
  breakevens: number[];
  probabilityOfProfit: number;
  estimatedMargin: number;
  riskRewardRatio: number | null;
  greeks: OptionGreeks;
  payoffCurve: PayoffPoint[];
}

export interface OptionChainStrikeRow {
  strike: number;
  isAtm: boolean;
  callOi: number;
  callOiChange: number;
  callVolume: number;
  callIv: number;
  callLtp: number;
  callDelta: number;
  putLtp: number;
  putDelta: number;
  putIv: number;
  putVolume: number;
  putOiChange: number;
  putOi: number;
}
