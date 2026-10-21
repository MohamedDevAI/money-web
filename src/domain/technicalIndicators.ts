/**
 * Pure Mathematical Technical Indicators Engine
 * Computes VWAP, EMA(20), SMA(50), SMA(200), Bollinger Bands(20,2), RSI(14), and MACD(12,26,9)
 * strictly from real API OHLCV candle arrays (zero synthetic or random data).
 */

import { OHLCCandle } from '../interface';

export interface RawApiCandle {
  timestamp: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Enriches raw OHLCV candles returned by IIFL MarketData API with institutional technical indicators.
 */
export function computeTechnicalOverlays(
  rawCandles: RawApiCandle[],
  isDailyOrWeekly = false
): OHLCCandle[] {
  if (!Array.isArray(rawCandles) || rawCandles.length === 0) {
    return [];
  }

  const candles: OHLCCandle[] = [];
  const closes = rawCandles.map((c) => Number(c.close) || 0);

  let cumulativeTypicalVol = 0;
  let cumulativeVol = 0;
  let ema20 = closes[0] || 0;
  let ema12 = closes[0] || 0;
  let ema26 = closes[0] || 0;
  let macdSignal = 0;

  for (let i = 0; i < rawCandles.length; i++) {
    const raw = rawCandles[i];
    const open = Number(raw.open) || 0;
    const high = Number(raw.high) || open;
    const low = Number(raw.low) || open;
    const close = Number(raw.close) || open;
    const volume = Math.max(0, Number(raw.volume) || 0);

    // VWAP
    const typicalPrice = (high + low + close) / 3;
    cumulativeTypicalVol += typicalPrice * volume;
    cumulativeVol += volume;
    const vwap =
      cumulativeVol > 0
        ? Number((cumulativeTypicalVol / cumulativeVol).toFixed(2))
        : close;

    // EMA 20
    const k20 = 2 / (20 + 1);
    ema20 = i === 0 ? close : Number((close * k20 + ema20 * (1 - k20)).toFixed(2));

    // SMA 50 & SMA 200
    const slice50 = closes.slice(Math.max(0, i - 49), i + 1);
    const sma50 = Number(
      (slice50.reduce((a, b) => a + b, 0) / slice50.length).toFixed(2)
    );

    const slice200 = closes.slice(Math.max(0, i - 199), i + 1);
    const sma200 = Number(
      (slice200.reduce((a, b) => a + b, 0) / slice200.length).toFixed(2)
    );

    // Bollinger Bands (20 period, 2 std dev)
    const slice20 = closes.slice(Math.max(0, i - 19), i + 1);
    const mean20 = slice20.reduce((a, b) => a + b, 0) / slice20.length;
    const variance =
      slice20.reduce((acc, val) => acc + Math.pow(val - mean20, 2), 0) /
      slice20.length;
    const stdDev = Math.sqrt(variance);
    const bollingerUpper = Number((mean20 + 2 * stdDev).toFixed(2));
    const bollingerLower = Number((mean20 - 2 * stdDev).toFixed(2));

    // MACD (12, 26, 9)
    ema12 = i === 0 ? close : close * (2 / 13) + ema12 * (11 / 13);
    ema26 = i === 0 ? close : close * (2 / 27) + ema26 * (25 / 27);
    const macd = Number((ema12 - ema26).toFixed(2));
    macdSignal = i === 0 ? macd : Number((macd * (2 / 10) + macdSignal * (8 / 10)).toFixed(2));
    const macdHist = Number((macd - macdSignal).toFixed(2));

    // RSI (14)
    let gains = 0;
    let losses = 0;
    const lookback = Math.min(14, i);
    for (let j = i - lookback + 1; j <= i; j++) {
      if (j <= 0) continue;
      const diff = closes[j] - closes[j - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = lookback > 0 ? gains / lookback : 0;
    const avgLoss = lookback > 0 ? losses / lookback : 0;
    const rs = avgLoss === 0 ? (avgGain > 0 ? 100 : 1) : avgGain / avgLoss;
    const rsi14 =
      lookback === 0 ? 50 : Number((100 - 100 / (1 + rs)).toFixed(1));

    const ts =
      typeof raw.timestamp === 'number'
        ? raw.timestamp < 1e12
          ? raw.timestamp * 1000
          : raw.timestamp
        : new Date(raw.timestamp).getTime() || Date.now();
    const d = new Date(ts);
    const timeLabel = isDailyOrWeekly
      ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      : d.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

    candles.push({
      time: timeLabel,
      timestamp: ts,
      open,
      high,
      low,
      close,
      volume,
      vwap,
      ema20,
      sma50,
      sma200,
      bollingerUpper,
      bollingerLower,
      rsi14,
      macd,
      macdSignal,
      macdHist,
      isBullish: close >= open,
      candleRange: [low, high],
      bodyRange: [Math.min(open, close), Math.max(open, close)],
    });
  }

  return candles;
}
