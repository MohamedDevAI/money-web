import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  BarChart2,
  CandlestickChart,
  Layers,
  Maximize2,
  Minimize2,
  Search,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { generateOHLCSeries } from '../../../domain/marketSimulator';
import { formatINR, formatINRCompact, formatPctChange } from '../../../utils/formatters';
import { useMoneyPrivacy } from '../../../context/MoneyPrivacyContext';
import type { Timeframe, Trade, WatchlistInstrument } from '../../../interface';

interface ProTradingChartProps {
  watchlist: WatchlistInstrument[];
  activeInstrument: WatchlistInstrument;
  onSelectSymbol: (symbol: string) => void;
  openTrades: Trade[];
  onQuickOrderFromChart?: (direction: 'LONG' | 'SHORT', price: number) => void;
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1H', '1D', '1W'];

export default function ProTradingChart({
  watchlist,
  activeInstrument,
  onSelectSymbol,
  openTrades,
  onQuickOrderFromChart,
}: ProTradingChartProps) {
  const { mask } = useMoneyPrivacy();

  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [chartType, setChartType] = useState<'candles' | 'area'>('candles');
  const [showVwap, setShowVwap] = useState<boolean>(true);
  const [showEma20, setShowEma20] = useState<boolean>(true);
  const [showSma50, setShowSma50] = useState<boolean>(false);
  const [showBollinger, setShowBollinger] = useState<boolean>(false);
  const [showRsiPane, setShowRsiPane] = useState<boolean>(true);
  const [showTradeLines, setShowTradeLines] = useState<boolean>(true);
  const [watchlistFilter, setWatchlistFilter] = useState<'ALL' | 'F&O' | 'EQUITY' | 'OTHER'>('ALL');
  const [searchSymbol, setSearchSymbol] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const candles = useMemo(
    () => generateOHLCSeries(activeInstrument, timeframe, 44),
    [activeInstrument, timeframe]
  );

  const activePositionForSymbol = useMemo(() => {
    const cleanSym = activeInstrument.symbol.split(' ')[0].toUpperCase();
    return openTrades.find((t) => t.symbol.toUpperCase().includes(cleanSym));
  }, [openTrades, activeInstrument.symbol]);

  const filteredWatchlist = useMemo(() => {
    return watchlist.filter((item) => {
      if (watchlistFilter === 'F&O' && item.instrument !== 'F&O') return false;
      if (watchlistFilter === 'EQUITY' && item.instrument !== 'EQUITY') return false;
      if (
        watchlistFilter === 'OTHER' &&
        item.instrument !== 'COMMODITY' &&
        item.instrument !== 'CRYPTO'
      ) {
        return false;
      }
      if (searchSymbol.trim()) {
        const q = searchSymbol.toLowerCase();
        return (
          item.symbol.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.sector.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [watchlist, watchlistFilter, searchSymbol]);

  const minPrice = useMemo(() => {
    const lows = candles.map((c) => (showBollinger ? Math.min(c.low, c.bollingerLower) : c.low));
    if (showTradeLines && activePositionForSymbol) {
      lows.push(activePositionForSymbol.stopLoss, activePositionForSymbol.entryPrice);
    }
    const rawMin = Math.min(...lows);
    return Number((rawMin * 0.997).toFixed(2));
  }, [candles, showBollinger, showTradeLines, activePositionForSymbol]);

  const maxPrice = useMemo(() => {
    const highs = candles.map((c) => (showBollinger ? Math.max(c.high, c.bollingerUpper) : c.high));
    if (showTradeLines && activePositionForSymbol) {
      highs.push(activePositionForSymbol.targetPrice, activePositionForSymbol.entryPrice);
    }
    const rawMax = Math.max(...highs);
    return Number((rawMax * 1.003).toFixed(2));
  }, [candles, showBollinger, showTradeLines, activePositionForSymbol]);

  const latestCandle = candles[candles.length - 1] || {
    open: activeInstrument.open,
    high: activeInstrument.high,
    low: activeInstrument.low,
    close: activeInstrument.ltp,
    vwap: activeInstrument.vwap,
    ema20: activeInstrument.ltp,
    rsi14: activeInstrument.rsi14,
    macd: 0,
    macdHist: 0,
  };

  const isPositive = activeInstrument.change >= 0;

  return (
    <div className="pro-terminal-workspace-grid">
      {/* ─── LEFT DOCK: LIVE MARKET WATCHLIST ─── */}
      <aside className="pro-watchlist-dock glass-panel">
        <div className="pro-dock-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Activity size={15} className="text-cyan" />
              <span className="pro-dock-title">MARKET WATCH</span>
            </div>
            <span className="pro-live-pulse-badge">
              <span className="pro-live-dot" /> LIVE FEED
            </span>
          </div>

          <div className="pro-watchlist-search">
            <Search size={13} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Filter symbol, sector..."
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
            />
          </div>

          <div className="pro-segment-tabs">
            {(['ALL', 'F&O', 'EQUITY', 'OTHER'] as const).map((seg) => (
              <button
                key={seg}
                type="button"
                className={`pro-seg-btn ${watchlistFilter === seg ? 'active' : ''}`}
                onClick={() => setWatchlistFilter(seg)}
              >
                {seg}
              </button>
            ))}
          </div>
        </div>

        <div className="pro-watchlist-items">
          {filteredWatchlist.map((inst) => {
            const isSelected = inst.symbol === activeInstrument.symbol;
            const isUp = inst.change >= 0;
            const flashClass =
              inst.tickDirection === 'up'
                ? 'tick-flash-up'
                : inst.tickDirection === 'down'
                ? 'tick-flash-down'
                : '';

            return (
              <div
                key={inst.symbol}
                className={`pro-watchlist-row ${isSelected ? 'selected' : ''} ${flashClass}`}
                onClick={() => onSelectSymbol(inst.symbol)}
              >
                <div className="pro-wl-left">
                  <div className="pro-wl-symbol-line">
                    <span className="pro-wl-symbol">{inst.symbol}</span>
                    <span className="pro-wl-exch-tag">{inst.exchange}</span>
                  </div>
                  <div className="pro-wl-sub">
                    <span>Lot: {inst.lotSize}</span>
                    <span>•</span>
                    <span>IV: {inst.iv}%</span>
                  </div>
                </div>

                <div className="pro-wl-right">
                  <div className={`pro-wl-ltp font-mono ${isUp ? 'text-emerald' : 'text-rose'}`}>
                    {mask(formatINR(inst.ltp))}
                  </div>
                  <div className={`pro-wl-chg font-mono ${isUp ? 'text-emerald' : 'text-rose'}`}>
                    {isUp ? '▲' : '▼'} {Math.abs(inst.change).toFixed(1)} ({formatPctChange(inst.changePct)})
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ─── CENTER STAGE: PRO MULTI-TIMEFRAME TECHNICAL CHART ─── */}
      <section className="pro-chart-stage glass-panel">
        {/* Top Instrument Telemetry Strip */}
        <div className="pro-chart-top-bar">
          <div className="pro-instrument-hero">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="pro-symbol-heading">{activeInstrument.symbol}</span>
                <span className="pro-exchange-pill">{activeInstrument.exchange}</span>
                <span className="pro-sector-pill">{activeInstrument.sector}</span>
              </div>
              <div className="pro-instrument-name-sub">{activeInstrument.name}</div>
            </div>

            <div className="pro-ltp-cluster">
              <div className={`pro-main-ltp font-mono ${isPositive ? 'text-emerald' : 'text-rose'}`}>
                {mask(formatINR(activeInstrument.ltp))}
              </div>
              <div className={`pro-main-chg font-mono ${isPositive ? 'text-emerald' : 'text-rose'}`}>
                {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                <span>
                  {isPositive ? '+' : ''}
                  {activeInstrument.change.toFixed(2)} ({formatPctChange(activeInstrument.changePct)})
                </span>
              </div>
            </div>
          </div>

          {/* OHLCV + Institutional Micro-Stats */}
          <div className="pro-ohlc-telemetry-grid">
            <div className="pro-tele-cell">
              <span className="tele-lbl">OPEN</span>
              <span className="tele-val font-mono">{mask(formatINR(activeInstrument.open))}</span>
            </div>
            <div className="pro-tele-cell">
              <span className="tele-lbl">HIGH</span>
              <span className="tele-val font-mono text-emerald">{mask(formatINR(activeInstrument.high))}</span>
            </div>
            <div className="pro-tele-cell">
              <span className="tele-lbl">LOW</span>
              <span className="tele-val font-mono text-rose">{mask(formatINR(activeInstrument.low))}</span>
            </div>
            <div className="pro-tele-cell">
              <span className="tele-lbl">VWAP</span>
              <span className="tele-val font-mono text-amber">{mask(formatINR(latestCandle.vwap))}</span>
            </div>
            <div className="pro-tele-cell">
              <span className="tele-lbl">ATR (14)</span>
              <span className="tele-val font-mono">{activeInstrument.atr14}</span>
            </div>
            <div className="pro-tele-cell">
              <span className="tele-lbl">RSI (14)</span>
              <span
                className={`tele-val font-mono ${
                  latestCandle.rsi14 > 70
                    ? 'text-rose'
                    : latestCandle.rsi14 < 30
                    ? 'text-emerald'
                    : 'text-cyan'
                }`}
              >
                {latestCandle.rsi14}
              </span>
            </div>
            <div className="pro-tele-cell">
              <span className="tele-lbl">PCR / IV</span>
              <span className="tele-val font-mono">
                {activeInstrument.pcr} / {activeInstrument.iv}%
              </span>
            </div>
          </div>
        </div>

        {/* Timeframe & Indicator Controls Toolbar */}
        <div className="pro-chart-toolbar">
          <div className="pro-tf-group">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                className={`pro-tf-btn ${timeframe === tf ? 'active' : ''}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}

            <div className="pro-toolbar-divider" />

            <button
              type="button"
              className={`pro-tf-btn ${chartType === 'candles' ? 'active' : ''}`}
              onClick={() => setChartType('candles')}
              title="OHLC Candlestick Mode"
            >
              <CandlestickChart size={13} /> Candles
            </button>
            <button
              type="button"
              className={`pro-tf-btn ${chartType === 'area' ? 'active' : ''}`}
              onClick={() => setChartType('area')}
              title="Institutional Area Trend Mode"
            >
              <BarChart2 size={13} /> Area
            </button>
          </div>

          <div className="pro-indicators-group">
            <button
              type="button"
              className={`pro-ind-pill ${showVwap ? 'active-amber' : ''}`}
              onClick={() => setShowVwap(!showVwap)}
            >
              VWAP
            </button>
            <button
              type="button"
              className={`pro-ind-pill ${showEma20 ? 'active-cyan' : ''}`}
              onClick={() => setShowEma20(!showEma20)}
            >
              EMA 20
            </button>
            <button
              type="button"
              className={`pro-ind-pill ${showSma50 ? 'active-indigo' : ''}`}
              onClick={() => setShowSma50(!showSma50)}
            >
              SMA 50
            </button>
            <button
              type="button"
              className={`pro-ind-pill ${showBollinger ? 'active-purple' : ''}`}
              onClick={() => setShowBollinger(!showBollinger)}
            >
              BB (20,2)
            </button>
            <button
              type="button"
              className={`pro-ind-pill ${showRsiPane ? 'active-emerald' : ''}`}
              onClick={() => setShowRsiPane(!showRsiPane)}
            >
              RSI/MACD
            </button>
            {activePositionForSymbol && (
              <button
                type="button"
                className={`pro-ind-pill ${showTradeLines ? 'active-emerald' : ''}`}
                onClick={() => setShowTradeLines(!showTradeLines)}
              >
                <Layers size={11} /> SL/Target
              </button>
            )}
            <button
              type="button"
              className="pro-ind-pill"
              onClick={() => setIsExpanded(!isExpanded)}
              title="Toggle chart height"
            >
              {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          </div>
        </div>

        {/* Quick Chart Action Strip */}
        {onQuickOrderFromChart && (
          <div className="pro-chart-quick-order-strip">
            <div className="quick-bid-ask-group">
              <button
                type="button"
                className="quick-exec-btn buy"
                onClick={() => onQuickOrderFromChart('LONG', activeInstrument.ask)}
              >
                <Zap size={12} /> BUY MKT @ {mask(formatINR(activeInstrument.ask))}
              </button>
              <span className="quick-spread-tag font-mono">
                Spread: ₹{(activeInstrument.ask - activeInstrument.bid).toFixed(2)}
              </span>
              <button
                type="button"
                className="quick-exec-btn sell"
                onClick={() => onQuickOrderFromChart('SHORT', activeInstrument.bid)}
              >
                <Zap size={12} /> SELL MKT @ {mask(formatINR(activeInstrument.bid))}
              </button>
            </div>

            {activePositionForSymbol && (
              <div className="active-pos-chart-tag">
                <span className="badge badge-emerald">OPEN {activePositionForSymbol.direction}</span>
                <span className="font-mono" style={{ fontSize: '0.75rem' }}>
                  Qty: {activePositionForSymbol.quantity} @ {formatINR(activePositionForSymbol.entryPrice)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Primary Price & Overlays Canvas */}
        <div style={{ width: '100%', height: isExpanded ? 430 : 320, marginTop: 6 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={candles} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="proAreaBull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="proAreaBear" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                yAxisId="price"
                orientation="right"
                domain={[minPrice, maxPrice]}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => formatINRCompact(v)}
                width={68}
              />
              <YAxis
                yAxisId="volume"
                orientation="left"
                domain={[0, (dataMax: number) => dataMax * 4.5]}
                hide
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const c = payload[0].payload;
                    const bull = c.close >= c.open;
                    return (
                      <div className="pro-chart-tooltip">
                        <div className="pro-tooltip-head">
                          <span>{activeInstrument.symbol} • {timeframe}</span>
                          <span className="font-mono">{c.time}</span>
                        </div>
                        <div className="pro-tooltip-grid font-mono">
                          <span>O: {formatINR(c.open)}</span>
                          <span>H: <strong className="text-emerald">{formatINR(c.high)}</strong></span>
                          <span>L: <strong className="text-rose">{formatINR(c.low)}</strong></span>
                          <span>C: <strong className={bull ? 'text-emerald' : 'text-rose'}>{formatINR(c.close)}</strong></span>
                        </div>
                        <div className="pro-tooltip-indicators font-mono">
                          <span className="text-amber">VWAP: {formatINR(c.vwap)}</span>
                          <span className="text-cyan">EMA20: {formatINR(c.ema20)}</span>
                          <span>RSI: {c.rsi14}</span>
                          <span>Vol: {(c.volume / 1000).toFixed(1)}K</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Volume Histogram at bottom of main chart */}
              <Bar
                yAxisId="volume"
                dataKey="volume"
                barSize={8}
                shape={(props: any) => {
                  const { x, y, width, height, payload } = props;
                  const fill = payload.isBullish
                    ? 'rgba(16, 185, 129, 0.22)'
                    : 'rgba(244, 63, 94, 0.22)';
                  return <rect x={x} y={y} width={width} height={Math.max(1, height)} fill={fill} rx={1} />;
                }}
              />

              {/* Bollinger Bands */}
              {showBollinger && (
                <>
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="bollingerUpper"
                    stroke="#a855f7"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="bollingerLower"
                    stroke="#a855f7"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </>
              )}

              {/* Candlesticks vs Area */}
              {chartType === 'area' ? (
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="close"
                  stroke={isPositive ? '#10b981' : '#f43f5e'}
                  strokeWidth={2.2}
                  fill={isPositive ? 'url(#proAreaBull)' : 'url(#proAreaBear)'}
                />
              ) : (
                <Bar
                  yAxisId="price"
                  dataKey="candleRange"
                  barSize={9}
                  shape={(props: any) => {
                    const { x, y, width, height, payload } = props;
                    if (!payload || height === undefined) return <g />;
                    const isBull = payload.close >= payload.open;
                    const color = isBull ? '#10b981' : '#f43f5e';
                    const high = payload.high;
                    const low = payload.low;
                    const totalRange = Math.max(0.0001, high - low);

                    const bodyTopVal = Math.max(payload.open, payload.close);
                    const bodyBotVal = Math.min(payload.open, payload.close);

                    const bodyTopY = y + ((high - bodyTopVal) / totalRange) * height;
                    const bodyBotY = y + ((high - bodyBotVal) / totalRange) * height;
                    const bodyHeight = Math.max(2, bodyBotY - bodyTopY);
                    const centerX = x + width / 2;

                    return (
                      <g>
                        <line
                          x1={centerX}
                          y1={y}
                          x2={centerX}
                          y2={y + height}
                          stroke={color}
                          strokeWidth={1.3}
                        />
                        <rect
                          x={x}
                          y={bodyTopY}
                          width={width}
                          height={bodyHeight}
                          fill={color}
                          rx={1}
                        />
                      </g>
                    );
                  }}
                />
              )}

              {/* Technical Overlays */}
              {showVwap && (
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="vwap"
                  stroke="#f59e0b"
                  strokeWidth={1.8}
                  strokeDasharray="4 2"
                  dot={false}
                />
              )}
              {showEma20 && (
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="ema20"
                  stroke="#06b6d4"
                  strokeWidth={1.6}
                  dot={false}
                />
              )}
              {showSma50 && (
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="sma50"
                  stroke="#6366f1"
                  strokeWidth={1.6}
                  dot={false}
                />
              )}

              {/* Live LTP Reference Line */}
              <ReferenceLine
                yAxisId="price"
                y={activeInstrument.ltp}
                stroke={isPositive ? '#10b981' : '#f43f5e'}
                strokeDasharray="2 2"
                strokeOpacity={0.65}
              />

              {/* Active Trade Entry / StopLoss / Target Overlay Lines */}
              {showTradeLines && activePositionForSymbol && (
                <>
                  <ReferenceLine
                    yAxisId="price"
                    y={activePositionForSymbol.entryPrice}
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    label={{
                      value: `ENTRY ₹${activePositionForSymbol.entryPrice}`,
                      fill: '#38bdf8',
                      fontSize: 10,
                      position: 'insideTopLeft',
                    }}
                  />
                  <ReferenceLine
                    yAxisId="price"
                    y={activePositionForSymbol.stopLoss}
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    label={{
                      value: `STOP ₹${activePositionForSymbol.stopLoss}`,
                      fill: '#f43f5e',
                      fontSize: 10,
                      position: 'insideBottomLeft',
                    }}
                  />
                  <ReferenceLine
                    yAxisId="price"
                    y={activePositionForSymbol.targetPrice}
                    stroke="#10b981"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    label={{
                      value: `TARGET ₹${activePositionForSymbol.targetPrice}`,
                      fill: '#10b981',
                      fontSize: 10,
                      position: 'insideTopLeft',
                    }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Sub-Chart Oscillator Pane: RSI(14) & MACD Momentum */}
        {showRsiPane && (
          <div className="pro-oscillator-pane">
            <div className="pro-oscillator-header">
              <span>RSI (14) Momentum Oscillator & Overbought/Oversold Zones (70 / 30)</span>
              <span className="font-mono">
                Current RSI: <strong className="text-cyan">{latestCandle.rsi14}</strong> • MACD Hist:{' '}
                <strong className={latestCandle.macdHist >= 0 ? 'text-emerald' : 'text-rose'}>
                  {latestCandle.macdHist}
                </strong>
              </span>
            </div>
            <div style={{ width: '100%', height: 95 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={candles} margin={{ top: 6, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.06)" />
                  <XAxis dataKey="time" hide />
                  <YAxis
                    orientation="right"
                    domain={[15, 85]}
                    ticks={[30, 50, 70]}
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    width={68}
                  />
                  <ReferenceLine y={70} stroke="rgba(244, 63, 94, 0.45)" strokeDasharray="3 3" />
                  <ReferenceLine y={50} stroke="rgba(148, 163, 184, 0.2)" />
                  <ReferenceLine y={30} stroke="rgba(16, 185, 129, 0.45)" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="rsi14"
                    stroke="#06b6d4"
                    strokeWidth={1.8}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
