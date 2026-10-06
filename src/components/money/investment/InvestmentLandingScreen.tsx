import {
  TrendingUp,
  TrendingDown,
  PieChart,
  Repeat,
  LineChart,
  AlertTriangle,
  ArrowRight,
  Plus,
  ChevronRight,
  Layers
} from 'lucide-react';
import { formatINR, formatINRCompact, formatPctChange } from '../../../utils/formatters';
import { useMoneyPrivacy } from '../../../context/MoneyPrivacyContext';
import { investmentApi } from '../../../services/investmentApi';
import type { InvestmentHolding } from '../../../types';

interface InvestmentLandingScreenProps {
  holdings: InvestmentHolding[];
  onNavigateToMutualFunds: () => void;
  onNavigateToStocks: () => void;
  onSelectHolding: (id: string, category: 'Mutual Funds' | 'Stocks') => void;
  onOpenAddModal: (category: 'Mutual Funds' | 'Stocks') => void;
}

export default function InvestmentLandingScreen({
  holdings,
  onNavigateToMutualFunds,
  onNavigateToStocks,
  onSelectHolding,
  onOpenAddModal
}: InvestmentLandingScreenProps) {
  const { mask } = useMoneyPrivacy();

  // Filter holdings for Mutual Funds & Stocks
  const mfHoldings = holdings.filter(
    (h) => h.category === 'Mutual Funds' || h.category === 'SIPs'
  );
  const stockHoldings = holdings.filter((h) => h.category === 'Stocks');

  // Compute values
  const mfInvested = mfHoldings.reduce((sum, h) => sum + h.buyPrice * h.quantity, 0);
  const mfValue = mfHoldings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);
  const mfReturn = mfValue - mfInvested;
  const mfReturnPct = mfInvested > 0 ? (mfReturn / mfInvested) * 100 : 0;
  const activeSipTotal = mfHoldings.reduce(
    (sum, h) => sum + (h.mutualFundMetrics?.sipActive ? h.mutualFundMetrics.sipAmount || 0 : 0),
    0
  );

  const stockInvested = stockHoldings.reduce((sum, h) => sum + h.buyPrice * h.quantity, 0);
  const stockValue = stockHoldings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);
  const stockReturn = stockValue - stockInvested;
  const stockReturnPct = stockInvested > 0 ? (stockReturn / stockInvested) * 100 : 0;

  const totalInvested = mfInvested + stockInvested;
  const totalValue = mfValue + stockValue;
  const totalGain = totalValue - totalInvested;
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const isGain = totalGain >= 0;

  // Allocation Split
  const mfPct = totalValue > 0 ? Math.round((mfValue / totalValue) * 100) : 50;
  const stockPct = totalValue > 0 ? 100 - mfPct : 50;

  // Flagged for Review Holdings
  const flaggedHoldings = investmentApi.getFlaggedHoldings(holdings).filter(
    (h) => h.category === 'Stocks' || h.category === 'Mutual Funds' || h.category === 'SIPs'
  );

  // If no holdings are flagged by strict logic, pick underperforming or volatile ones
  const displayedFlagged = flaggedHoldings.length > 0
    ? flaggedHoldings
    : holdings
        .filter((h) => {
          const ret = h.buyPrice > 0 ? ((h.currentPrice - h.buyPrice) / h.buyPrice) * 100 : 0;
          return ret < 5 || (h.fundamentals && (h.fundamentals.peRatio || 0) > 30);
        })
        .slice(0, 3);

  return (
    <div className="inv-landing-container">
      {/* 1. Top Executive Summary Banner */}
      <div className="inv-summary-hero">
        <div className="inv-hero-left">
          <div className="inv-pill-badge">
            <Layers size={13} />
            Equity & Mutual Fund Command Center
          </div>
          <h2 className="inv-hero-title">
            Investment Portfolio <span className="inv-gold-gradient">Executive Summary</span>
          </h2>
          <p className="inv-hero-subtitle">
            Consolidated valuation and intelligence across your direct equity portfolio and systematic mutual fund SIPs.
          </p>

          <div className="inv-hero-main-stat">
            <div className="inv-hero-stat-label">Total Long-Term Investment Value</div>
            <div className="inv-hero-stat-val">
              <span>{mask(formatINR(totalValue))}</span>
              <span className="inv-hero-stat-compact">({mask(formatINRCompact(totalValue))})</span>
              <span className={`inv-stat-badge ${isGain ? 'positive' : 'negative'}`}>
                {isGain ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                <span>{mask(formatPctChange(totalGainPct))}</span>
                <span style={{ opacity: 0.85, fontSize: '0.78rem' }}>({mask(formatINRCompact(totalGain))})</span>
              </span>
            </div>
          </div>
        </div>

        <div className="inv-hero-cards-col">
          {/* Mutual Fund Mini Card */}
          <div className="inv-metric-tile mf-tile" onClick={onNavigateToMutualFunds}>
            <div className="inv-tile-header">
              <span className="inv-tile-name">
                <Repeat size={15} color="#900dc8" /> Mutual Funds & SIPs
              </span>
              <span className="inv-tile-count">{mfHoldings.length} Funds</span>
            </div>
            <div className="inv-tile-val">{mask(formatINR(mfValue))}</div>
            <div className="inv-tile-footer">
              <span style={{ color: mfReturn >= 0 ? '#900dc8' : '#6b677f', fontWeight: 700 }}>
                {mask(formatPctChange(mfReturnPct))}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                SIP: {mask(formatINR(activeSipTotal))}/mo
              </span>
            </div>
          </div>

          {/* Stocks Mini Card */}
          <div className="inv-metric-tile stock-tile" onClick={onNavigateToStocks}>
            <div className="inv-tile-header">
              <span className="inv-tile-name">
                <LineChart size={15} color="#9406d0" /> Direct Equities & Stocks
              </span>
              <span className="inv-tile-count">{stockHoldings.length} Stocks</span>
            </div>
            <div className="inv-tile-val">{mask(formatINR(stockValue))}</div>
            <div className="inv-tile-footer">
              <span style={{ color: stockReturn >= 0 ? '#900dc8' : '#6b677f', fontWeight: 700 }}>
                {mask(formatPctChange(stockReturnPct))}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Cost: {mask(formatINRCompact(stockInvested))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Allocation Split Between MF & Stocks */}
      <div className="inv-split-section">
        <div className="inv-section-header-row">
          <div>
            <h3 className="inv-section-title">
              <PieChart size={18} color="#910cca" /> Capital Allocation Split
            </h3>
            <p className="inv-section-sub">Balanced distribution between systematic mutual funds and high-conviction direct equities</p>
          </div>
          <div className="inv-split-summary-pills">
            <span className="split-legend-pill mf">
              <span className="legend-dot mf" /> Mutual Funds: <strong>{mfPct}%</strong> ({mask(formatINRCompact(mfValue))})
            </span>
            <span className="split-legend-pill stocks">
              <span className="legend-dot stocks" /> Stocks: <strong>{stockPct}%</strong> ({mask(formatINRCompact(stockValue))})
            </span>
          </div>
        </div>

        {/* Dynamic Multi-Segment Progress Bar */}
        <div className="inv-split-bar-track">
          <div
            className="inv-split-segment mf"
            style={{ width: `${mfPct}%` }}
            title={`Mutual Funds: ${mfPct}%`}
          >
            {mfPct >= 15 && <span>Mutual Funds {mfPct}%</span>}
          </div>
          <div
            className="inv-split-segment stocks"
            style={{ width: `${stockPct}%` }}
            title={`Direct Stocks: ${stockPct}%`}
          >
            {stockPct >= 15 && <span>Stocks {stockPct}%</span>}
          </div>
        </div>
      </div>

      {/* 3. Category Entry Points (Big Interactive Cards) */}
      <div className="inv-entry-points-grid">
        {/* Mutual Funds Entry Card */}
        <div className="inv-entry-card mf-card" onClick={onNavigateToMutualFunds}>
          <div className="inv-entry-badge-row">
            <div className="inv-entry-icon mf-icon">
              <Repeat size={24} />
            </div>
            <span className="inv-badge-action">View Full Portfolio →</span>
          </div>

          <h4 className="inv-entry-title">Mutual Funds & SIP Portfolio</h4>
          <p className="inv-entry-desc">
            Deep-dive into your active systematic plans, risk-adjusted performance (Sharpe & Sortino), expense ratios, and alpha over benchmark.
          </p>

          <div className="inv-entry-stats-grid">
            <div className="inv-entry-stat-box">
              <div className="stat-label">Holdings</div>
              <div className="stat-value">{mfHoldings.length} Funds</div>
            </div>
            <div className="inv-entry-stat-box">
              <div className="stat-label">Active SIP / Month</div>
              <div className="stat-value" style={{ color: '#900dc8' }}>{mask(formatINR(activeSipTotal))}</div>
            </div>
            <div className="inv-entry-stat-box">
              <div className="stat-label">Total Current Value</div>
              <div className="stat-value">{mask(formatINRCompact(mfValue))}</div>
            </div>
            <div className="inv-entry-stat-box">
              <div className="stat-label">Net Gain</div>
              <div className="stat-value" style={{ color: mfReturn >= 0 ? '#900dc8' : '#6b677f' }}>
                {mask(formatPctChange(mfReturnPct))}
              </div>
            </div>
          </div>

          <div className="inv-entry-cta-row">
            <button
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #a80fea 0%, #aa08f0 100%)', border: 'none' }}
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToMutualFunds();
              }}
            >
              Explore Mutual Funds <ArrowRight size={15} />
            </button>
            <button
              className="btn btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAddModal('Mutual Funds');
              }}
            >
              <Plus size={14} /> Add Fund
            </button>
          </div>
        </div>

        {/* Direct Stocks Entry Card */}
        <div className="inv-entry-card stock-card" onClick={onNavigateToStocks}>
          <div className="inv-entry-badge-row">
            <div className="inv-entry-icon stock-icon">
              <LineChart size={24} />
            </div>
            <span className="inv-badge-action">View Full Analysis →</span>
          </div>

          <h4 className="inv-entry-title">Direct Equities & Stock Desk</h4>
          <p className="inv-entry-desc">
            Complete institutional equity analysis: fundamental valuation (P/E, ROE, ROCE), technical indicators (RSI, SMAs), sentiment, and conviction verdicts.
          </p>

          <div className="inv-entry-stats-grid">
            <div className="inv-entry-stat-box">
              <div className="stat-label">Holdings</div>
              <div className="stat-value">{stockHoldings.length} Equities</div>
            </div>
            <div className="inv-entry-stat-box">
              <div className="stat-label">Invested Basis</div>
              <div className="stat-value">{mask(formatINRCompact(stockInvested))}</div>
            </div>
            <div className="inv-entry-stat-box">
              <div className="stat-label">Market Value</div>
              <div className="stat-value">{mask(formatINRCompact(stockValue))}</div>
            </div>
            <div className="inv-entry-stat-box">
              <div className="stat-label">Unrealized Gain</div>
              <div className="stat-value" style={{ color: stockReturn >= 0 ? '#900dc8' : '#6b677f' }}>
                {mask(formatPctChange(stockReturnPct))}
              </div>
            </div>
          </div>

          <div className="inv-entry-cta-row">
            <button
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #ae0cf4 0%, #ac10ef 100%)', border: 'none' }}
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToStocks();
              }}
            >
              Explore Stocks <ArrowRight size={15} />
            </button>
            <button
              className="btn btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAddModal('Stocks');
              }}
            >
              <Plus size={14} /> Add Stock
            </button>
          </div>
        </div>
      </div>

      {/* 4. "Flagged for Review" List */}
      <div className="inv-flagged-section">
        <div className="inv-section-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="inv-flagged-icon-badge">
                <AlertTriangle size={16} color="#9305d0" />
              </div>
              <h3 className="inv-section-title">Flagged for Review & Risk Watchlist</h3>
            </div>
            <p className="inv-section-sub">
              Holdings experiencing recent momentum degradation, high valuation multiples, or underperforming benchmark
            </p>
          </div>
          <span className="badge badge-amber">{displayedFlagged.length} Needs Attention</span>
        </div>

        <div className="inv-flagged-cards-grid">
          {displayedFlagged.map((holding) => {
            const invested = holding.buyPrice * holding.quantity;
            const current = holding.currentPrice * holding.quantity;
            const returnVal = current - invested;
            const returnPct = invested > 0 ? (returnVal / invested) * 100 : 0;
            const isStock = holding.category === 'Stocks';

            const flagReason =
              returnPct < 0
                ? `Negative return (${returnPct.toFixed(1)}%) — Trading below purchase price`
                : holding.fundamentals && (holding.fundamentals.peRatio || 0) > 30
                ? `High P/E multiple (${holding.fundamentals.peRatio}x) — Rich valuation`
                : holding.mutualFundMetrics && (holding.mutualFundMetrics.expenseRatio || 0) > 1.0
                ? `Expense ratio (${holding.mutualFundMetrics.expenseRatio}%) above category median`
                : `Momentum consolidation — Monitor earnings & guidance`;

            return (
              <div
                key={holding.id}
                className="inv-flagged-item-card"
                onClick={() => onSelectHolding(holding.id, isStock ? 'Stocks' : 'Mutual Funds')}
              >
                <div className="inv-flagged-top">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="inv-flagged-ticker">{holding.ticker || holding.name.substring(0, 8)}</span>
                      <span className="inv-flagged-category-badge">{holding.category}</span>
                    </div>
                    <div className="inv-flagged-name">{holding.name}</div>
                  </div>

                  <div className="inv-flagged-return-pill" style={{ color: returnPct >= 0 ? '#900dc8' : '#6b677f' }}>
                    {returnPct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    <span>{mask(formatPctChange(returnPct))}</span>
                  </div>
                </div>

                <div className="inv-flagged-reason-box">
                  <AlertTriangle size={13} color="#9109cb" style={{ flexShrink: 0 }} />
                  <span>{flagReason}</span>
                </div>

                <div className="inv-flagged-footer">
                  <span>Current: <strong>{mask(formatINR(current))}</strong></span>
                  <button className="inv-flagged-action-btn">
                    Analyze <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
