import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Plus,
  ArrowUpDown,
  Repeat,
  Award,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { formatINR, formatINRCompact, formatPctChange } from '../../../utils/formatters';
import { useMoneyPrivacy } from '../../../context/MoneyPrivacyContext';
import type { InvestmentHolding } from '../../../types';

interface MutualFundListScreenProps {
  holdings: InvestmentHolding[];
  onBackToLanding: () => void;
  onSelectFund: (id: string) => void;
  onOpenAddModal: () => void;
}

type SortField = 'value' | 'returns' | 'name' | 'sip';
type SortOrder = 'asc' | 'desc';

export default function MutualFundListScreen({
  holdings,
  onBackToLanding,
  onSelectFund,
  onOpenAddModal
}: MutualFundListScreenProps) {
  const { mask } = useMoneyPrivacy();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter only Mutual Funds & SIP holdings
  const mfHoldings = useMemo(() => {
    return holdings.filter(
      (h) => h.category === 'Mutual Funds' || h.category === 'SIPs'
    );
  }, [holdings]);

  // Aggregate totals
  const totalValue = mfHoldings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);
  const totalInvested = mfHoldings.reduce((sum, h) => sum + h.buyPrice * h.quantity, 0);
  const totalReturn = totalValue - totalInvested;
  const totalReturnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  const totalMonthlySip = mfHoldings.reduce(
    (sum, h) => sum + (h.mutualFundMetrics?.sipActive ? h.mutualFundMetrics.sipAmount || 0 : 0),
    0
  );

  // Sorting and Filtering
  const filteredAndSorted = useMemo(() => {
    return mfHoldings
      .filter((h) => {
        const query = searchQuery.toLowerCase();
        return (
          h.name.toLowerCase().includes(query) ||
          (h.ticker && h.ticker.toLowerCase().includes(query)) ||
          (h.mutualFundMetrics?.fundHouse &&
            h.mutualFundMetrics.fundHouse.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;

        if (sortField === 'value') {
          valA = a.currentPrice * a.quantity;
          valB = b.currentPrice * b.quantity;
        } else if (sortField === 'returns') {
          const invA = a.buyPrice * a.quantity;
          const invB = b.buyPrice * b.quantity;
          valA = invA > 0 ? ((a.currentPrice * a.quantity - invA) / invA) * 100 : 0;
          valB = invB > 0 ? ((b.currentPrice * b.quantity - invB) / invB) * 100 : 0;
        } else if (sortField === 'name') {
          return sortOrder === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        } else if (sortField === 'sip') {
          valA = a.mutualFundMetrics?.sipAmount || 0;
          valB = b.mutualFundMetrics?.sipAmount || 0;
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [mfHoldings, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Compute Verdict Badge for MF
  const getFundVerdictBadge = (fund: InvestmentHolding) => {
    const metrics = fund.mutualFundMetrics;
    const returnPct =
      fund.buyPrice > 0
        ? ((fund.currentPrice - fund.buyPrice) / fund.buyPrice) * 100
        : 0;

    const sharpe = metrics?.sharpeRatio || 1.0;
    const alpha = metrics?.alphaVsBenchmark || 0;
    const expense = metrics?.expenseRatio || 0.8;

    if (sharpe >= 1.3 && alpha >= 2.0 && expense < 0.8) {
      return {
        label: 'Strong Buy / Top Tier',
        color: '#900dc8',
        bg: 'rgba(186, 54, 242, 0.15)',
        border: 'rgba(186, 54, 242, 0.3)',
      };
    }
    if (returnPct >= 10 || sharpe >= 1.0) {
      return {
        label: 'Hold / Consistent',
        color: '#9406d0',
        bg: 'rgba(187, 50, 246, 0.15)',
        border: 'rgba(188, 48, 248, 0.3)',
      };
    }
    return {
      label: 'Review / Underperforming',
      color: '#9305d0',
      bg: 'rgba(188, 49, 247, 0.15)',
      border: 'rgba(189, 45, 251, 0.3)',
    };
  };

  return (
    <div className="inv-list-screen">
      {/* Top Navigation Row */}
      <div className="inv-screen-nav-bar">
        <button className="inv-back-btn" onClick={onBackToLanding}>
          <ArrowLeft size={16} />
          <span>Back to Investment Overview</span>
        </button>

        <button className="btn btn-primary" onClick={onOpenAddModal}>
          <Plus size={16} /> Add Mutual Fund
        </button>
      </div>

      {/* Screen Header Banner */}
      <div className="inv-list-header-banner">
        <div>
          <div className="inv-pill-badge mf">
            <Repeat size={13} />
            Systematic Wealth & Mutual Funds
          </div>
          <h2 className="inv-list-title">Mutual Funds & SIP Holdings</h2>
          <p className="inv-list-subtitle">
            Track performance, expense ratios, risk-adjusted returns, and algorithmic verdicts across all active funds.
          </p>
        </div>

        {/* Aggregated Quick Metrics */}
        <div className="inv-header-stats-row">
          <div className="inv-hstat-card">
            <div className="hstat-label">Total MF Value</div>
            <div className="hstat-val">{mask(formatINR(totalValue))}</div>
            <div className="hstat-sub">{mask(formatINRCompact(totalValue))}</div>
          </div>

          <div className="inv-hstat-card">
            <div className="hstat-label">Total Gain</div>
            <div className="hstat-val" style={{ color: totalReturn >= 0 ? '#900dc8' : '#6b677f' }}>
              {mask(formatPctChange(totalReturnPct))}
            </div>
            <div className="hstat-sub" style={{ color: totalReturn >= 0 ? '#900dc8' : '#6b677f' }}>
              ({mask(formatINRCompact(totalReturn))})
            </div>
          </div>

          <div className="inv-hstat-card">
            <div className="hstat-label">Monthly SIP Total</div>
            <div className="hstat-val" style={{ color: '#900dc8' }}>{mask(formatINR(totalMonthlySip))}</div>
            <div className="hstat-sub">Active recurring outflow</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="inv-controls-bar">
        <div className="inv-search-wrap">
          <Search size={16} className="inv-search-icon" />
          <input
            type="text"
            placeholder="Search fund name, AMC (HDFC, PPFAS, SBI)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="inv-search-input"
          />
        </div>

        <div className="inv-sort-actions">
          <button
            className={`inv-sort-btn ${sortField === 'value' ? 'active' : ''}`}
            onClick={() => handleSort('value')}
          >
            Value <ArrowUpDown size={12} />
          </button>
          <button
            className={`inv-sort-btn ${sortField === 'returns' ? 'active' : ''}`}
            onClick={() => handleSort('returns')}
          >
            Returns % <ArrowUpDown size={12} />
          </button>
          <button
            className={`inv-sort-btn ${sortField === 'sip' ? 'active' : ''}`}
            onClick={() => handleSort('sip')}
          >
            SIP Amount <ArrowUpDown size={12} />
          </button>
        </div>
      </div>

      {/* Mutual Funds List */}
      <div className="inv-cards-list-container">
        {filteredAndSorted.length === 0 ? (
          <div className="inv-empty-state">
            <Repeat size={36} color="var(--text-muted)" />
            <div className="inv-empty-title">No Mutual Funds Found</div>
            <div className="inv-empty-desc">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Start building your portfolio by adding your first fund.'}
            </div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onOpenAddModal}>
              <Plus size={16} /> Add Mutual Fund
            </button>
          </div>
        ) : (
          filteredAndSorted.map((fund) => {
            const invested = fund.buyPrice * fund.quantity;
            const current = fund.currentPrice * fund.quantity;
            const returnVal = current - invested;
            const returnPct = invested > 0 ? (returnVal / invested) * 100 : 0;
            const isPositive = returnVal >= 0;
            const verdict = getFundVerdictBadge(fund);
            const metrics = fund.mutualFundMetrics;

            return (
              <div
                key={fund.id}
                className="inv-list-item-row"
                onClick={() => onSelectFund(fund.id)}
              >
                {/* Left: Fund Identity */}
                <div className="inv-item-identity">
                  <div className="inv-item-icon-box mf-icon-box">
                    <Repeat size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="inv-item-name">{fund.name}</span>
                      {metrics?.fundHouse && (
                        <span className="inv-item-house-badge">{metrics.fundHouse}</span>
                      )}
                    </div>
                    <div className="inv-item-subtext">
                      <span>Benchmark: {metrics?.benchmark || 'Nifty 500'}</span>
                      {metrics?.sipActive && (
                        <span className="inv-sip-active-tag">
                          <Sparkles size={11} /> SIP: {mask(formatINR(metrics.sipAmount || 0))}/mo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Metrics Highlights */}
                <div className="inv-item-metrics-cluster">
                  <div className="inv-metric-cell">
                    <div className="cell-label">Current Value</div>
                    <div className="cell-val primary">{mask(formatINR(current))}</div>
                    <div className="cell-sub">{mask(formatINRCompact(current))}</div>
                  </div>

                  <div className="inv-metric-cell">
                    <div className="cell-label">Invested Cost</div>
                    <div className="cell-val">{mask(formatINR(invested))}</div>
                    <div className="cell-sub">{fund.quantity.toLocaleString()} units</div>
                  </div>

                  <div className="inv-metric-cell">
                    <div className="cell-label">Total Gain / Loss</div>
                    <div className="cell-val" style={{ color: isPositive ? '#900dc8' : '#6b677f' }}>
                      {mask(formatPctChange(returnPct))}
                    </div>
                    <div className="cell-sub" style={{ color: isPositive ? '#900dc8' : '#6b677f' }}>
                      ({mask(formatINR(returnVal))})
                    </div>
                  </div>
                </div>

                {/* Right: Verdict Badge & Action */}
                <div className="inv-item-verdict-action">
                  <span
                    className="inv-verdict-pill"
                    style={{
                      color: verdict.color,
                      background: verdict.bg,
                      borderColor: verdict.border,
                    }}
                  >
                    <Award size={13} />
                    {verdict.label}
                  </span>

                  <button className="inv-view-detail-btn" title="View detailed fund analytics">
                    <span>Full Details</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
