// ─── Trading Engine & Positions Interfaces (Money Hub Trading Workspace) ───────

export type TradeStatus = 'OPEN' | 'CLOSED';
export type TradeDirection = 'LONG' | 'SHORT';
export type InstrumentType = 'EQUITY' | 'F&O' | 'CRYPTO' | 'COMMODITY';
export type TradeType = 'INTRADAY' | 'SWING' | 'POSITIONAL';

export interface Trade {
  id: string;
  symbol: string;
  instrument: InstrumentType;
  direction: TradeDirection;
  tradeType: TradeType;
  entryPrice: number;
  currentPrice: number;
  exitPrice?: number;
  stopLoss: number;
  targetPrice: number;
  quantity: number;
  entryDate: string;
  exitDate?: string;
  status: TradeStatus;
  strategy?: string;
  notes?: string;
  realizedPnl?: number;
  unrealizedPnl?: number;
  pnlPercent?: number;
  riskRewardRatio?: number;
}

export interface TradingStats {
  capitalDeployed: number;
  totalRealizedPnl: number;
  totalUnrealizedPnl: number;
  winRate: number;
  winCount: number;
  lossCount: number;
  totalTrades: number;
  openTradesCount: number;
  avgRiskReward: number;
}
