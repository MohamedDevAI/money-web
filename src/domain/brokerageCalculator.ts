/**
 * Institutional Brokerage, Regulatory Taxes & Breakeven Calculator (Indian Markets - NSE/NFO/MCX/CRYPTO)
 * Computes brokerage, STT/CTT, exchange turnover fees, SEBI fees, GST (18%), and stamp duty.
 */

import { BrokerageBreakdown, InstrumentType, TradeDirection, TradeType } from '../interface';

export interface BrokerageCalcParams {
  instrument: InstrumentType;
  tradeType: TradeType;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
}

/**
 * Calculates full round-trip Indian exchange & regulatory charges.
 * Models institutional discount brokerage rules (₹20 flat or 0.03% for intraday/F&O, 0% delivery brokerage).
 */
export function calculateBrokerageAndTaxes(params: BrokerageCalcParams): BrokerageBreakdown {
  const { instrument, tradeType, direction, entryPrice, exitPrice, quantity } = params;
  const validQty = Math.max(0, Number(quantity) || 0);
  const buyPrice = direction === 'LONG' ? Number(entryPrice) || 0 : Number(exitPrice) || 0;
  const sellPrice = direction === 'LONG' ? Number(exitPrice) || 0 : Number(entryPrice) || 0;

  const buyTurnover = buyPrice * validQty;
  const sellTurnover = sellPrice * validQty;
  const turnover = buyTurnover + sellTurnover;

  if (turnover <= 0 || validQty <= 0) {
    return {
      turnover: 0,
      brokerage: 0,
      stt: 0,
      exchangeTxnCharge: 0,
      sebiFee: 0,
      gst: 0,
      stampDuty: 0,
      totalCharges: 0,
      breakevenPoints: 0,
    };
  }

  let brokerage = 0;
  let stt = 0;
  let exchangeTxnCharge = 0;
  let stampDuty = 0;

  if (instrument === 'EQUITY') {
    if (tradeType === 'INTRADAY') {
      // Intraday Equity: min(₹20, 0.03% per leg)
      const buyBrok = Math.min(20, buyTurnover * 0.0003);
      const sellBrok = Math.min(20, sellTurnover * 0.0003);
      brokerage = buyBrok + sellBrok;
      // STT: 0.025% on sell side only
      stt = sellTurnover * 0.00025;
      // NSE Exchange Txn: 0.00322%
      exchangeTxnCharge = turnover * 0.0000322;
      // Stamp duty: 0.003% on buy side
      stampDuty = buyTurnover * 0.00003;
    } else {
      // Delivery / Swing Equity: ₹20 or 0.1%, STT 0.1% on both buy & sell
      const buyBrok = Math.min(20, buyTurnover * 0.001);
      const sellBrok = Math.min(20, sellTurnover * 0.001);
      brokerage = buyBrok + sellBrok;
      stt = turnover * 0.001;
      exchangeTxnCharge = turnover * 0.0000322;
      stampDuty = buyTurnover * 0.00015;
    }
  } else if (instrument === 'F&O') {
    // F&O: Flat ₹20 per executed order (₹40 round trip)
    brokerage = 40;
    // STT on Options/Futures sell side (~0.0625% average on premium/futures blend)
    stt = sellTurnover * 0.000625;
    // Exchange Txn charge: ~0.035%
    exchangeTxnCharge = turnover * 0.00035;
    // Stamp duty: 0.003% on buy side
    stampDuty = buyTurnover * 0.00003;
  } else if (instrument === 'COMMODITY') {
    brokerage = 40;
    // CTT: 0.01% on sell side for non-agri
    stt = sellTurnover * 0.0001;
    exchangeTxnCharge = turnover * 0.00026;
    stampDuty = buyTurnover * 0.00002;
  } else {
    // CRYPTO: 0.05% maker/taker + 1% TDS approximation scaled for active trading
    brokerage = Math.min(100, turnover * 0.0005);
    stt = sellTurnover * 0.0005;
    exchangeTxnCharge = turnover * 0.0002;
    stampDuty = 0;
  }

  // SEBI Turnover fee: ₹10 per Crore (0.0001%)
  const sebiFee = turnover * 0.000001;

  // GST: 18% on (Brokerage + Exchange Txn + SEBI Fee)
  const gst = (brokerage + exchangeTxnCharge + sebiFee) * 0.18;

  const totalCharges = Number(
    (brokerage + stt + exchangeTxnCharge + sebiFee + gst + stampDuty).toFixed(2)
  );

  const breakevenPoints = validQty > 0 ? Number((totalCharges / validQty).toFixed(2)) : 0;

  return {
    turnover: Number(turnover.toFixed(2)),
    brokerage: Number(brokerage.toFixed(2)),
    stt: Number(stt.toFixed(2)),
    exchangeTxnCharge: Number(exchangeTxnCharge.toFixed(2)),
    sebiFee: Number(sebiFee.toFixed(2)),
    gst: Number(gst.toFixed(2)),
    stampDuty: Number(stampDuty.toFixed(2)),
    totalCharges,
    breakevenPoints,
  };
}
