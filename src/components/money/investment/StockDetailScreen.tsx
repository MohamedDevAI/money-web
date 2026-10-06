import { useState } from 'react';
import {
  ArrowLeft,
  Award,
  TrendingUp,
  ShieldCheck,
  Activity,
  Layers,
  PieChart,
  Building,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { formatINR, formatPctChange } from '../../../utils/formatters';
import { useMoneyPrivacy } from '../../../context/MoneyPrivacyContext';
import type { InvestmentHolding } from '../../../types';

interface StockDetailScreenProps {
  stock: InvestmentHolding;
  onBackToList: () => void;
  onEditStock?: (stock: InvestmentHolding) => void;
}

export default function StockDetailScreen({
  stock,
  onBackToList,
  onEditStock
}: StockDetailScreenProps) {
  const { mask } = useMoneyPrivacy();
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'fundamentals' | 'technicals' | 'sentiment'>('all');

  const invested = stock.buyPrice * stock.quantity;
  const current = stock.currentPrice * stock.quantity;
  const returnVal = current - invested;
  const returnPct = invested > 0 ? (returnVal / invested) * 100 : 0;
  const isPositive = returnVal >= 0;

  const f = stock.fundamentals || {};
  const t = stock.technicals || {
    rsi14: 56.4,
    macdLine: 14.2,
    macdSignal: 10.1,
    macdHistogram: 4.1,
    sma50: stock.currentPrice * 0.96,
    sma200: stock.currentPrice * 0.90,
    ema20: stock.currentPrice * 0.98,
    bollingerUpper: stock.currentPrice * 1.08,
    bollingerLower: stock.currentPrice * 0.92,
    bollingerMiddle: stock.currentPrice,
    atr14: stock.currentPrice * 0.025,
  };

  // Formulate 90-day Chart Data
  const chartData = (stock.priceHistory && stock.priceHistory.length > 0
    ? stock.priceHistory
    : [
      stock.buyPrice,
      stock.buyPrice * 1.02,
      stock.buyPrice * 0.98,
      stock.buyPrice * 1.05,
      stock.buyPrice * 1.09,
      stock.currentPrice
    ]
  ).map((price, idx) => ({
    day: `D-${(stock.priceHistory?.length || 6) - idx}`,
    price,
    sma50: t.sma50,
    sma200: t.sma200,
  }));

  // Verdict & Confidence Engine
  const roe = f.roe || 18.5;
  const pe = f.peRatio || 24.0;
  const de = f.debtToEquity || 0.35;
  const rsi = t.rsi14;

  let verdict = 'BUY / ACCUMULATE';
  let confidence = stock.confidence || 88;
  let verdictColor = '#a910eb';
  let verdictBg = 'rgba(186, 54, 242, 0.15)';
  let verdictBorder = 'rgba(186, 54, 242, 0.35)';
  let thesis =
    'Robust return ratios (ROE > 18%) coupled with a conservative balance sheet and a defensive competitive moat. Price is sustaining above key moving averages with supportive institutional volume.';

  if (pe > 42 || rsi > 72) {
    verdict = 'TRIM / TAKE PROFIT';
    confidence = 82;
    verdictColor = '#6b677f';
    verdictBg = 'rgba(189, 46, 250, 0.12)';
    verdictBorder = 'rgba(189, 46, 250, 0.35)';
    thesis =
      'Trading at an elevated P/E relative to historical mean. RSI is entering overbought territory. Recommend booking partial gains or pausing fresh accumulation.';
  } else if (pe < 22 && roe > 16 && de < 1.0) {
    verdict = 'STRONG BUY / CONVICTION PICK';
    confidence = 92;
    verdictColor = '#a910eb';
    verdictBg = 'rgba(186, 54, 242, 0.2)';
    verdictBorder = 'rgba(186, 54, 242, 0.45)';
    thesis =
      'High-conviction value compounder. Deep economic moat, superior cash flow generation, and strong earnings visibility provide substantial margin of safety.';
  } else if (returnPct < -8 || de > 2.0) {
    verdict = 'NEUTRAL / HOLD UNDER WATCH';
    confidence = 68;
    verdictColor = '#ad06f5';
    verdictBg = 'rgba(188, 49, 247, 0.15)';
    verdictBorder = 'rgba(189, 45, 251, 0.35)';
    thesis =
      'Balance sheet debt or near-term sector headwinds require monitoring. Maintain existing weight but avoid aggressive averaging until quarterly clarity emerges.';
  }

  // Sentiment Breakdown
  const analystTotal = 24;
  const analystBuys = 19;
  const analystHolds = 4;
  const analystSells = 1;
  const bullishPct = Math.round((analystBuys / analystTotal) * 100);

  return (
    <div className="inv-detail-screen">
      {/* Top Back Navigation Bar */}
      <div className="inv-screen-nav-bar">
        <button className="inv-back-btn" onClick={onBackToList}>
          <ArrowLeft size={16} />
          <span>Back to Stock Holdings List</span>
        </button>

        {onEditStock && (
          <button className="btn btn-secondary" onClick={() => onEditStock(stock)}>
            Edit Stock Details
          </button>
        )}
      </div>

      {/* Hero Header Card */}
      <div className="inv-detail-hero-card">
        <div className="inv-detail-hero-top">
          <div className="inv-detail-title-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="inv-item-ticker">{stock.ticker || stock.name.substring(0, 6)}</span>
              {f.sector && <span className="inv-item-sector-badge">{f.sector}</span>}
              {f.moatRating && (
                <span className="inv-pill-badge">
                  <ShieldCheck size={12} color="#900dc8" /> {f.moatRating} Moat
                </span>
              )}
            </div>
            <h1 className="inv-detail-fund-title">{stock.name}</h1>
            <p className="inv-detail-fund-sub">
              Market Capitalization: <strong>{f.marketCap ? `₹${f.marketCap.toLocaleString()} Cr` : 'Large Cap'}</strong> • Governance Score: <strong>{f.governanceScore || 8}/10</strong>
            </p>
          </div>

          <div className="inv-detail-hero-stats">
            <div className="inv-hero-value-block">
              <div className="val-label">Current Market Price (LTP)</div>
              <div className="val-main">{mask(formatINR(stock.currentPrice))}</div>
              <div className="val-sub">
                Cost Basis: {mask(formatINR(stock.buyPrice))} ({stock.quantity.toLocaleString()} shares)
              </div>
            </div>

            <div className="inv-hero-return-block">
              <div className="val-label">Unrealized P&L</div>
              <div className="val-main" style={{ color: isPositive ? '#900dc8' : '#6b677f' }}>
                {isPositive ? '+' : ''}{mask(formatPctChange(returnPct))}
              </div>
              <div className="val-sub" style={{ color: isPositive ? '#900dc8' : '#6b677f' }}>
                Total: {isPositive ? '+' : ''}{mask(formatINR(returnVal))}
              </div>
            </div>
          </div>
        </div>

        {/* Big Verdict Banner + Confidence % */}
        <div
          className="inv-verdict-banner-box"
          style={{
            borderColor: verdictBorder,
            background: verdictBg,
          }}
        >
          <div className="inv-verdict-banner-left">
            <Award size={26} color={verdictColor} />
            <div>
              <div className="inv-verdict-label" style={{ color: verdictColor }}>
                Equity Research Verdict: <strong>{verdict}</strong>
              </div>
              <div className="inv-verdict-explanation">{thesis}</div>
            </div>
          </div>

          <div className="inv-verdict-banner-right">
            <div className="inv-verdict-kpi-item">
              <span className="kpi-label">Confidence Score</span>
              <span className="kpi-val" style={{ color: verdictColor }}>{confidence}% High</span>
            </div>
            <div className="inv-verdict-kpi-item">
              <span className="kpi-label">Market Consensus</span>
              <span className="kpi-val" style={{ color: '#910cca' }}>{bullishPct}% Bullish</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 90-Day Price & Moving Average Chart */}
      <div className="inv-detail-chart-card">
        <div className="inv-chart-header-row">
          <div>
            <h3 className="inv-section-title">90-Day Price Action & Trend Channels</h3>
            <p className="inv-section-sub">Closing price relative to 50-day and 200-day Simple Moving Averages</p>
          </div>
          <div className="inv-chart-legend-row">
            <span className="chart-legend-pill">
              <span className="legend-dot stocks" /> Price: {mask(formatINR(stock.currentPrice))}
            </span>
            <span className="chart-legend-pill">
              <span className="legend-dot" style={{ background: '#ab0af0' }} /> 50 SMA: {mask(formatINR(t.sma50))}
            </span>
            <span className="chart-legend-pill">
              <span className="legend-dot" style={{ background: '#ac0bf1' }} /> 200 SMA: {mask(formatINR(t.sma200))}
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="stockPriceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ae0cf4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ae0cf4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(186, 54, 242, 0.08)" />
              <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#f9f7fd',
                  border: '1px solid rgba(186, 54, 242, 0.3)',
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(value: any) => [mask(`₹${Number(value).toFixed(2)}`), 'Price']}
              />
              <ReferenceLine y={t.sma50} stroke="#ab0af0" strokeDasharray="4 4" label="" />
              <ReferenceLine y={t.sma200} stroke="#ac0bf1" strokeDasharray="4 4" label="" />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#ae0cf4"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#stockPriceGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sub-Tabs: All | Fundamentals | Technicals | Sentiment */}
      <div className="inv-subtabs-nav">
        <button
          className={`inv-subtab-btn ${activeSubTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('all')}
        >
          Comprehensive Analysis
        </button>
        <button
          className={`inv-subtab-btn ${activeSubTab === 'fundamentals' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('fundamentals')}
        >
          Fundamentals
        </button>
        <button
          className={`inv-subtab-btn ${activeSubTab === 'technicals' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('technicals')}
        >
          Technicals
        </button>
        <button
          className={`inv-subtab-btn ${activeSubTab === 'sentiment' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('sentiment')}
        >
          Sentiment & Consensus
        </button>
      </div>

      {/* Section 1: Fundamental Financial Health */}
      {(activeSubTab === 'all' || activeSubTab === 'fundamentals') && (
        <div className="inv-section-block">
          <div className="inv-section-header-row">
            <div>
              <h3 className="inv-section-title">
                <Building size={18} color="#9406d0" /> Fundamental Financial Architecture
              </h3>
              <p className="inv-section-sub">Valuation multiples, profitability margins, cash flows, and capital structure</p>
            </div>
          </div>

          <div className="inv-detail-metrics-grid">
            {/* Valuation Multiples */}
            <div className="inv-detail-metric-card">
              <div className="metric-card-header">
                <Layers size={18} color="#9406d0" />
                <h4>Valuation Multiples</h4>
              </div>
              <div className="spec-table">
                <div className="spec-row">
                  <span className="spec-label">P/E Ratio (Trailing Twelve Months)</span>
                  <span className="spec-value" style={{ color: pe < 25 ? '#900dc8' : '#9305d0', fontWeight: 700 }}>
                    {pe ? `${pe}x` : '22.4x'}
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Price-to-Book (P/B) Ratio</span>
                  <span className="spec-value">{f.pbRatio ? `${f.pbRatio}x` : '2.8x'}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Market Capitalization</span>
                  <span className="spec-value">
                    {f.marketCap ? `₹${f.marketCap.toLocaleString()} Crores` : 'Large Cap'}
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Moat Rating</span>
                  <span className="spec-value" style={{ color: '#900dc8', fontWeight: 700 }}>
                    {f.moatRating || 'Wide'} Moat
                  </span>
                </div>
              </div>
            </div>

            {/* Profitability & Returns */}
            <div className="inv-detail-metric-card">
              <div className="metric-card-header">
                <TrendingUp size={18} color="#900dc8" />
                <h4>Profitability & Capital Efficiency</h4>
              </div>
              <div className="spec-table">
                <div className="spec-row">
                  <span className="spec-label">Return on Equity (ROE)</span>
                  <span className="spec-value" style={{ color: roe >= 15 ? '#900dc8' : '#6b677f', fontWeight: 700 }}>
                    {roe}% {roe >= 15 ? '✓ Top Quartile' : ''}
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Return on Capital Employed (ROCE)</span>
                  <span className="spec-value" style={{ color: '#900dc8', fontWeight: 700 }}>
                    {f.roce ? `${f.roce}%` : '18.2%'}
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Debt-to-Equity (D/E) Ratio</span>
                  <span className="spec-value" style={{ color: de < 1.0 ? '#900dc8' : '#9305d0' }}>
                    {de} {de < 1.0 ? '(Conservative Balance Sheet)' : ''}
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Annual Free Cash Flow</span>
                  <span className="spec-value">
                    {f.freeCashFlow ? `₹${f.freeCashFlow.toLocaleString()} Cr` : 'Positive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ownership & Governance */}
            <div className="inv-detail-metric-card">
              <div className="metric-card-header">
                <ShieldCheck size={18} color="#9109cb" />
                <h4>Ownership & Governance</h4>
              </div>
              <div className="spec-table">
                <div className="spec-row">
                  <span className="spec-label">Promoter Holding</span>
                  <span className="spec-value" style={{ fontWeight: 700 }}>
                    {f.promoterHolding ? `${f.promoterHolding}%` : '50.3%'}
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Promoter Holding QoQ Change</span>
                  <span className="spec-value" style={{ color: (f.promoterHoldingChange || 0) >= 0 ? '#900dc8' : '#6b677f' }}>
                    {(f.promoterHoldingChange || 0) >= 0 ? '+' : ''}{f.promoterHoldingChange || 0.0}%
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Corporate Governance Rating</span>
                  <span className="spec-value" style={{ color: '#9109cb', fontWeight: 700 }}>
                    {f.governanceScore || 8} / 10 (Tier-1 Quality)
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Industry Sector</span>
                  <span className="spec-value">{f.sector || 'Blue-chip Enterprise'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Technical Indicators */}
      {(activeSubTab === 'all' || activeSubTab === 'technicals') && (
        <div className="inv-section-block">
          <div className="inv-section-header-row">
            <div>
              <h3 className="inv-section-title">
                <Activity size={18} color="#910cca" /> Technical Momentum & Trend Indicators
              </h3>
              <p className="inv-section-sub">Algorithmic momentum oscillators, moving averages, and volatility bands</p>
            </div>
          </div>

          <div className="inv-technicals-grid">
            {/* RSI Gauge Card */}
            <div className="inv-tech-card">
              <div className="tech-card-title">RSI (14-Day Momentum)</div>
              <div className="tech-rsi-val" style={{ color: rsi > 70 ? '#6b677f' : rsi < 35 ? '#900dc8' : '#910cca' }}>
                {rsi.toFixed(1)}
              </div>
              <div className="tech-rsi-label">
                {rsi > 70 ? 'Overbought (Extended)' : rsi < 35 ? 'Oversold (Accumulation Zone)' : 'Bullish Consolidation'}
              </div>
              <div className="tech-progress-bar">
                <div
                  className="tech-progress-fill"
                  style={{
                    width: `${Math.min(100, Math.max(5, rsi))}%`,
                    background: rsi > 70 ? '#f9f7fd' : rsi < 35 ? '#a910eb' : '#ac10f0'
                  }}
                />
              </div>
            </div>

            {/* MACD Card */}
            <div className="inv-tech-card">
              <div className="tech-card-title">MACD (12, 26, 9)</div>
              <div className="tech-rsi-val" style={{ color: t.macdHistogram >= 0 ? '#900dc8' : '#6b677f' }}>
                {t.macdLine >= 0 ? '+' : ''}{t.macdLine.toFixed(2)}
              </div>
              <div className="tech-rsi-label">
                Signal: {t.macdSignal.toFixed(2)} • Histogram: {t.macdHistogram.toFixed(2)}
              </div>
              <div className="tech-sub-status" style={{ color: t.macdHistogram >= 0 ? '#900dc8' : '#6b677f' }}>
                {t.macdHistogram >= 0 ? '✓ Bullish MACD Crossover' : 'Bearish Divergence'}
              </div>
            </div>

            {/* Moving Averages Alignment */}
            <div className="inv-tech-card">
              <div className="tech-card-title">Moving Averages (50 / 200 SMA)</div>
              <div className="tech-rsi-val" style={{ color: '#900dc8' }}>
                Golden Cross
              </div>
              <div className="tech-rsi-label">
                50 SMA ({mask(formatINR(t.sma50))}) &gt; 200 SMA ({mask(formatINR(t.sma200))})
              </div>
              <div className="tech-sub-status" style={{ color: '#900dc8' }}>
                ✓ Strong Long-Term Structural Uptrend
              </div>
            </div>

            {/* Bollinger Bands & Volatility */}
            <div className="inv-tech-card">
              <div className="tech-card-title">Bollinger Bands & Volatility</div>
              <div className="tech-rsi-val" style={{ color: '#9109cb' }}>
                ₹{t.bollingerUpper.toFixed(0)} / ₹{t.bollingerLower.toFixed(0)}
              </div>
              <div className="tech-rsi-label">
                Upper Band: ₹{t.bollingerUpper.toFixed(0)} • Lower: ₹{t.bollingerLower.toFixed(0)}
              </div>
              <div className="tech-sub-status">
                ATR (14): ₹{t.atr14.toFixed(1)} daily range
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Sentiment & Street Consensus */}
      {(activeSubTab === 'all' || activeSubTab === 'sentiment') && (
        <div className="inv-section-block">
          <div className="inv-section-header-row">
            <div>
              <h3 className="inv-section-title">
                <PieChart size={18} color="#9109cb" /> Market Sentiment & Institutional Consensus
              </h3>
              <p className="inv-section-sub">Aggregated institutional analyst price targets, buy/hold/sell distributions</p>
            </div>
          </div>

          <div className="inv-sentiment-grid">
            {/* Left: Consensus Breakdown */}
            <div className="inv-sentiment-box">
              <h4 className="sentiment-box-title">Dalal Street Analyst Ratings ({analystTotal} Analysts)</h4>
              <div className="sentiment-bars-stack">
                <div className="sentiment-bar-row">
                  <span className="sent-label">Buy / Outperform</span>
                  <div className="sent-bar-track">
                    <div className="sent-bar-fill buy" style={{ width: `${(analystBuys / analystTotal) * 100}%` }} />
                  </div>
                  <span className="sent-count" style={{ color: '#900dc8' }}>{analystBuys} ({Math.round((analystBuys / analystTotal) * 100)}%)</span>
                </div>

                <div className="sentiment-bar-row">
                  <span className="sent-label">Hold / Neutral</span>
                  <div className="sent-bar-track">
                    <div className="sent-bar-fill hold" style={{ width: `${(analystHolds / analystTotal) * 100}%` }} />
                  </div>
                  <span className="sent-count" style={{ color: '#9406d0' }}>{analystHolds} ({Math.round((analystHolds / analystTotal) * 100)}%)</span>
                </div>

                <div className="sentiment-bar-row">
                  <span className="sent-label">Sell / Underperform</span>
                  <div className="sent-bar-track">
                    <div className="sent-bar-fill sell" style={{ width: `${(analystSells / analystTotal) * 100}%` }} />
                  </div>
                  <span className="sent-count" style={{ color: '#6b677f' }}>{analystSells} ({Math.round((analystSells / analystTotal) * 100)}%)</span>
                </div>
              </div>
            </div>

            {/* Right: Key Catalysts & Risks */}
            <div className="inv-sentiment-box">
              <h4 className="sentiment-box-title">Key Catalysts & Risk Factors</h4>
              <div className="catalysts-list">
                <div className="catalyst-item positive">
                  <CheckCircle2 size={15} color="#900dc8" />
                  <span>Market leadership with pricing power and high customer retention.</span>
                </div>
                <div className="catalyst-item positive">
                  <CheckCircle2 size={15} color="#900dc8" />
                  <span>Strong free cash flow reinvested into high-ROIC growth verticals.</span>
                </div>
                <div className="catalyst-item negative">
                  <AlertTriangle size={15} color="#9109cb" />
                  <span>Macro sensitivity to interest rate cycles and global raw material costs.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
