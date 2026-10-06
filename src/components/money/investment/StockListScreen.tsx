import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Plus,
  ArrowUpDown,
  LineChart,
  Award,
  ChevronRight
} from 'lucide-react';
import { formatINR, formatINRCompact, formatPctChange } from '../../../utils/formatters';
import { useMoneyPrivacy } from '../../../context/MoneyPrivacyContext';
import type { InvestmentHolding } from '../../../types';

interface StockListScreenProps {
  holdings: InvestmentHolding[];
  onBackToLanding: () => void;
  onSelectStock: (id: string) => void;
  onOpenAddModal: () => void;
}

type SortField = 'value' | 'returns' | 'name' | 'pe';
type SortOrder = 'asc' | 'desc';

export default function StockListScreen({
  holdings,
  onBackToLanding,
  onSelectStock,
  onOpenAddModal
}: StockListScreenProps) {
  const { mask } = useMoneyPrivacy();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter only Stock holdings
  const stockHoldings = useMemo(() => {
    return holdings.filter((h) => h.category === 'Stocks');
  }, [holdings]);

  // Aggregate stats
  const totalValue = stockHoldings.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);
  const totalInvested = stockHoldings.reduce((sum, h) => sum + h.buyPrice * h.quantity, 0);
  const totalReturn = totalValue - totalInvested;
  const totalReturnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  // Distinct sectors
  const sectors = useMemo(() => {
    const set = new Set<string>();
    stockHoldings.forEach((h) => {
      if (h.fundamentals?.sector) set.add(h.fundamentals.sector);
    });
    return ['All', ...Array.from(set)];
  }, [stockHoldings]);

  // Sorting and Filtering
  const filteredAndSorted = useMemo(() => {
    return stockHoldings
      .filter((h) => {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          h.name.toLowerCase().includes(query) ||
          (h.ticker && h.ticker.toLowerCase().includes(query));
        const matchesSector =
          selectedSector === 'All' || h.fundamentals?.sector === selectedSector;
        return matchesQuery && matchesSector;
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
        } else if (sortField === 'pe') {
          valA = a.fundamentals?.peRatio || 0;
          valB = b.fundamentals?.peRatio || 0;
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [stockHoldings, searchQuery, selectedSector, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Rule-based Verdict Badge for Stock
  const getStockVerdictBadge = (stock: InvestmentHolding) => {
    const f = stock.fundamentals;
    const t = stock.technicals;
    const returnPct =
      stock.buyPrice > 0
        ? ((stock.currentPrice - stock.buyPrice) / stock.buyPrice) * 100
        : 0;

    const roe = f?.roe || 15;
    const pe = f?.peRatio || 25;
    const rsi = t?.rsi14 || 50;

    if (roe >= 20 && pe <= 30 && rsi < 65) {
      return {
        label: 'Strong Buy / Undervalued',
        color: '#900dc8',
        bg: 'rgba(186, 54, 242, 0.15)',
        border: 'rgba(186, 54, 242, 0.3)',
      };
    }
    if (returnPct >= 12 || (roe >= 15 && pe <= 35)) {
      return {
        label: 'Outperform / Accumulate',
        color: '#910cca',
        bg: 'rgba(186, 54, 242, 0.15)',
        border: 'rgba(186, 54, 242, 0.3)',
      };
    }
    if (pe > 40 || rsi > 70) {
      return {
        label: 'Trim / Premium Valuation',
        color: '#6b677f',
        bg: 'rgba(189, 46, 250, 0.12)',
        border: 'rgba(189, 46, 250, 0.35)',
      };
    }
    return {
      label: 'Hold / Fair Value',
      color: '#9406d0',
      bg: 'rgba(187, 50, 246, 0.15)',
      border: 'rgba(188, 48, 248, 0.3)',
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
          <Plus size={16} /> Add Direct Stock
        </button>
      </div>

      {/* Screen Header Banner */}
      <div className="inv-list-header-banner">
        <div>
          <div className="inv-pill-badge stocks">
            <LineChart size={13} />
            Institutional Equity Research Desk
          </div>
          <h2 className="inv-list-title">Direct Equities & Stock Holdings</h2>
          <p className="inv-list-subtitle">
            Fundamental valuations, technical momentum signals, consensus sentiment, and automated conviction verdicts.
          </p>
        </div>

        {/* Aggregated Quick Metrics */}
        <div className="inv-header-stats-row">
          <div className="inv-hstat-card">
            <div className="hstat-label">Total Stock Value</div>
            <div className="hstat-val">{mask(formatINR(totalValue))}</div>
            <div className="hstat-sub">{mask(formatINRCompact(totalValue))}</div>
          </div>

          <div className="inv-hstat-card">
            <div className="hstat-label">Total Unrealized Gain</div>
            <div className="hstat-val" style={{ color: totalReturn >= 0 ? '#900dc8' : '#6b677f' }}>
              {mask(formatPctChange(totalReturnPct))}
            </div>
            <div className="hstat-sub" style={{ color: totalReturn >= 0 ? '#900dc8' : '#6b677f' }}>
              ({mask(formatINRCompact(totalReturn))})
            </div>
          </div>

          <div className="inv-hstat-card">
            <div className="hstat-label">Total Cost Basis</div>
            <div className="hstat-val">{mask(formatINRCompact(totalInvested))}</div>
            <div className="hstat-sub">{stockHoldings.length} companies owned</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="inv-controls-bar">
        <div className="inv-search-wrap">
          <Search size={16} className="inv-search-icon" />
          <input
            type="text"
            placeholder="Search company or ticker (RELIANCE, HDFCBANK, TCS)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="inv-search-input"
          />
        </div>

        {/* Sector Filter Chips */}
        {sectors.length > 2 && (
          <div className="inv-filter-chips-row">
            {sectors.map((sec) => (
              <button
                key={sec}
                className={`inv-filter-chip ${selectedSector === sec ? 'active' : ''}`}
                onClick={() => setSelectedSector(sec)}
              >
                {sec}
              </button>
            ))}
          </div>
        )}

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
            className={`inv-sort-btn ${sortField === 'pe' ? 'active' : ''}`}
            onClick={() => handleSort('pe')}
          >
            P/E Ratio <ArrowUpDown size={12} />
          </button>
        </div>
      </div>

      {/* Stock Cards List */}
      <div className="inv-cards-list-container">
        {filteredAndSorted.length === 0 ? (
          <div className="inv-empty-state">
            <LineChart size={36} color="var(--text-muted)" />
            <div className="inv-empty-title">No Stock Holdings Found</div>
            <div className="inv-empty-desc">
              {searchQuery ? 'Try adjusting your search or sector filter.' : 'Add your first equity holding to track fundamentals and technicals.'}
            </div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onOpenAddModal}>
              <Plus size={16} /> Add Stock
            </button>
          </div>
        ) : (
          filteredAndSorted.map((stock) => {
            const invested = stock.buyPrice * stock.quantity;
            const current = stock.currentPrice * stock.quantity;
            const returnVal = current - invested;
            const returnPct = invested > 0 ? (returnVal / invested) * 100 : 0;
            const isPositive = returnVal >= 0;
            const verdict = getStockVerdictBadge(stock);
            const f = stock.fundamentals;

            return (
              <div
                key={stock.id}
                className="inv-list-item-row"
                onClick={() => onSelectStock(stock.id)}
              >
                {/* Left: Stock Identity */}
                <div className="inv-item-identity">
                  <div className="inv-item-icon-box stock-icon-box">
                    <LineChart size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="inv-item-ticker">{stock.ticker || stock.name.substring(0, 6)}</span>
                      <span className="inv-item-name">{stock.name}</span>
                      {f?.sector && (
                        <span className="inv-item-sector-badge">{f.sector}</span>
                      )}
                    </div>
                    <div className="inv-item-subtext">
                      <span>{stock.quantity.toLocaleString()} shares</span>
                      <span>•</span>
                      <span>Buy: {mask(formatINR(stock.buyPrice))}</span>
                      <span>→</span>
                      <span style={{ color: '#900cc8', fontWeight: 700 }}>
                        LTP: {mask(formatINR(stock.currentPrice))}
                      </span>
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
                    <div className="cell-label">Total Gain / Loss</div>
                    <div className="cell-val" style={{ color: isPositive ? '#900dc8' : '#6b677f' }}>
                      {mask(formatPctChange(returnPct))}
                    </div>
                    <div className="cell-sub" style={{ color: isPositive ? '#900dc8' : '#6b677f' }}>
                      ({mask(formatINR(returnVal))})
                    </div>
                  </div>

                  <div className="inv-metric-cell">
                    <div className="cell-label">Valuation (P/E)</div>
                    <div className="cell-val">{f?.peRatio ? `${f.peRatio}x` : '—'}</div>
                    <div className="cell-sub">ROE: {f?.roe ? `${f.roe}%` : '—'}</div>
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

                  <button className="inv-view-detail-btn" title="View institutional analysis">
                    <span>Full Analysis</span>
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
