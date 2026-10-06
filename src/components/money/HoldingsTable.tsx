import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ArrowUpDown,
  Edit2,
  Trash2,
  Layers,
  Repeat,
  ShieldAlert,
  Building2,
  LineChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import type { InvestmentHolding, InvestmentCategory } from '../../types';
import { formatINR, formatINRCompact, formatPctChange } from '../../utils/formatters';
import { useMoneyPrivacy } from '../../context/MoneyPrivacyContext';

interface HoldingsTableProps {
  holdings: InvestmentHolding[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onOpenAddModal: (cat?: InvestmentCategory) => void;
  onEditHolding: (holding: InvestmentHolding) => void;
  onDeleteHolding: (id: string, name: string) => void;
}

type SortField = 'name' | 'invested' | 'currentValue' | 'returns';
type SortOrder = 'asc' | 'desc';

export default function HoldingsTable({
  holdings,
  selectedCategory,
  onSelectCategory,
  onOpenAddModal,
  onEditHolding,
  onDeleteHolding
}: HoldingsTableProps) {
  const { mask } = useMoneyPrivacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filter holdings
  const filteredHoldings = useMemo(() => {
    return holdings.filter((h) => {
      // Category filter
      if (selectedCategory !== 'All') {
        if (selectedCategory === 'Mutual Funds' || selectedCategory === 'SIPs') {
          if (h.category !== 'Mutual Funds' && h.category !== 'SIPs') return false;
        } else if (h.category !== selectedCategory) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = h.name.toLowerCase().includes(q);
        const matchTicker = h.ticker?.toLowerCase().includes(q);
        const matchNotes = h.notes?.toLowerCase().includes(q);
        const matchBank = h.fdMetrics?.bankName?.toLowerCase().includes(q);
        const matchIssuer = h.bondMetrics?.issuer?.toLowerCase().includes(q);
        const matchHouse = h.mutualFundMetrics?.fundHouse?.toLowerCase().includes(q);
        if (!matchName && !matchTicker && !matchNotes && !matchBank && !matchIssuer && !matchHouse) {
          return false;
        }
      }

      return true;
    });
  }, [holdings, selectedCategory, searchQuery]);

  // Sorted holdings
  const sortedHoldings = useMemo(() => {
    return [...filteredHoldings].sort((a, b) => {
      const aInvested = a.buyPrice * a.quantity;
      const bInvested = b.buyPrice * b.quantity;
      const aCurrent = a.currentPrice * a.quantity;
      const bCurrent = b.currentPrice * b.quantity;
      const aReturnPct = aInvested > 0 ? ((aCurrent - aInvested) / aInvested) * 100 : 0;
      const bReturnPct = bInvested > 0 ? ((bCurrent - bInvested) / bInvested) * 100 : 0;

      let comp = 0;
      if (sortField === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (sortField === 'invested') {
        comp = aInvested - bInvested;
      } else if (sortField === 'currentValue') {
        comp = aCurrent - bCurrent;
      } else if (sortField === 'returns') {
        comp = aReturnPct - bReturnPct;
      }

      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredHoldings, sortField, sortOrder]);

  const getCategoryBadge = (cat: InvestmentCategory) => {
    switch (cat) {
      case 'Stocks':
        return <span className="badge badge-indigo">Stocks</span>;
      case 'Mutual Funds':
      case 'SIPs':
        return <span className="badge badge-emerald">SIP / MF</span>;
      case 'Bonds':
        return <span className="badge badge-cyan">Bond</span>;
      case 'FDs':
        return <span className="badge badge-amber">Fixed Deposit</span>;
      default:
        return <span className="badge badge-indigo">{cat}</span>;
    }
  };

  const getCategoryIcon = (cat: InvestmentCategory) => {
    switch (cat) {
      case 'Stocks':
        return <LineChart size={16} color="#920bcb" />;
      case 'Mutual Funds':
      case 'SIPs':
        return <Repeat size={16} color="#900dc8" />;
      case 'Bonds':
        return <ShieldAlert size={16} color="#910cca" />;
      case 'FDs':
        return <Building2 size={16} color="#9305d0" />;
      default:
        return <Layers size={16} />;
    }
  };

  return (
    <div className="holdings-section-panel">
      {/* Toolbar */}
      <div className="holdings-toolbar">
        {/* Category Tabs */}
        <div className="category-tabs-group">
          {[
            { key: 'All', label: 'All Holdings', count: holdings.length },
            {
              key: 'Stocks',
              label: 'Stocks',
              count: holdings.filter((h) => h.category === 'Stocks').length
            },
            {
              key: 'Mutual Funds',
              label: 'SIPs & MFs',
              count: holdings.filter(
                (h) => h.category === 'Mutual Funds' || h.category === 'SIPs'
              ).length
            },
            {
              key: 'Bonds',
              label: 'Bonds',
              count: holdings.filter((h) => h.category === 'Bonds').length
            },
            {
              key: 'FDs',
              label: 'Fixed Deposits (FD)',
              count: holdings.filter((h) => h.category === 'FDs').length
            }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => onSelectCategory(tab.key)}
              className={`category-tab-btn ${selectedCategory === tab.key ? 'active' : ''}`}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: 'rgba(186, 54, 242, 0.11)'
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Add action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              placeholder="Search ticker, fund, bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="holdings-search-input"
            />
          </div>

          <button
            onClick={() =>
              onOpenAddModal(
                selectedCategory !== 'All'
                  ? (selectedCategory as InvestmentCategory)
                  : undefined
              )
            }
            className="btn-primary"
            style={{
              padding: '8px 14px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={15} />
            <span>Add New</span>
          </button>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="table-responsive-wrapper">
        <table className="money-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Asset / Instrument</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Category</th>
              <th>Key Highlights / Spec</th>
              <th>Qty / Units</th>
              <th>Buy / Current Price</th>
              <th onClick={() => handleSort('invested')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Invested Basis</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('currentValue')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Current Value</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('returns')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Total Gain / Loss</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedHoldings.length > 0 ? (
              sortedHoldings.map((holding) => {
                const invested = holding.buyPrice * holding.quantity;
                const current = holding.currentPrice * holding.quantity;
                const returnVal = current - invested;
                const returnPct = invested > 0 ? (returnVal / invested) * 100 : 0;
                const isGain = returnVal >= 0;

                return (
                  <tr key={holding.id}>
                    {/* Name Cell */}
                    <td>
                      <div className="holding-name-cell">
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: 'rgba(186, 54, 242, 0.07)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {getCategoryIcon(holding.category)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#900cc8' }}>
                            {holding.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            {holding.ticker && (
                              <span className="holding-ticker-tag">{holding.ticker}</span>
                            )}
                            {holding.buyDate && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Since {holding.buyDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td>{getCategoryBadge(holding.category)}</td>

                    {/* Highlights / Spec */}
                    <td>
                      {holding.category === 'Stocks' && (
                        <div style={{ fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {holding.fundamentals?.sector || 'Equity'}
                          </span>
                          {holding.fundamentals?.peRatio && (
                            <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                              • P/E: {holding.fundamentals.peRatio}
                            </span>
                          )}
                        </div>
                      )}

                      {(holding.category === 'Mutual Funds' || holding.category === 'SIPs') && (
                        <div style={{ fontSize: '0.78rem' }}>
                          {holding.mutualFundMetrics?.sipAmount ? (
                            <span style={{ color: '#900dc8', fontWeight: 600 }}>
                              SIP: {mask(formatINR(holding.mutualFundMetrics.sipAmount))}/mo
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Lump sum</span>
                          )}
                          {holding.mutualFundMetrics?.cagr3yr && (
                            <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                              • 3Y: {holding.mutualFundMetrics.cagr3yr}%
                            </span>
                          )}
                        </div>
                      )}

                      {holding.category === 'Bonds' && (
                        <div style={{ fontSize: '0.78rem' }}>
                          <span style={{ color: '#910cca', fontWeight: 600 }}>
                            {holding.bondMetrics?.couponRate
                              ? `${holding.bondMetrics.couponRate}% Coupon`
                              : 'Bond'}
                          </span>
                          {holding.bondMetrics?.creditRating && (
                            <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                              • {holding.bondMetrics.creditRating}
                            </span>
                          )}
                        </div>
                      )}

                      {holding.category === 'FDs' && (
                        <div style={{ fontSize: '0.78rem' }}>
                          <span style={{ color: '#9305d0', fontWeight: 600 }}>
                            {holding.fdMetrics?.interestRate || 6.5}% p.a.
                          </span>
                          {holding.fdMetrics?.bankName && (
                            <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                              • {holding.fdMetrics.bankName}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Quantity */}
                    <td>
                      <span style={{ fontWeight: 600 }}>{holding.quantity.toLocaleString()}</span>
                    </td>

                    {/* Buy vs Current Price */}
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {mask(formatINR(holding.buyPrice))}
                        </span>
                        <span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>→</span>
                        <span style={{ fontWeight: 700, color: '#900cc8' }}>
                          {mask(formatINR(holding.currentPrice))}
                        </span>
                      </div>
                    </td>

                    {/* Invested */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {mask(formatINR(invested))}
                      </div>
                    </td>

                    {/* Current Value */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#900cc8' }}>
                        {mask(formatINR(current))}
                      </div>
                    </td>

                    {/* Total Gain/Loss */}
                    <td>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: isGain ? 'rgba(186, 54, 242, 0.15)' : 'rgba(189, 46, 250, 0.12)',
                          color: isGain ? '#900dc8' : '#6b677f'
                        }}
                      >
                        {isGain ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        <span>{mask(formatPctChange(returnPct))}</span>
                        <span style={{ opacity: 0.8 }}>({mask(formatINRCompact(returnVal))})</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => onEditHolding(holding)}
                          className="holding-action-btn"
                          title="Edit Holding"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteHolding(holding.id, holding.name)}
                          className="holding-action-btn delete"
                          title="Delete Holding"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
                    No holdings found in{' '}
                    <strong style={{ color: '#900cc8' }}>{selectedCategory}</strong>
                  </div>
                  <button
                    onClick={() =>
                      onOpenAddModal(
                        selectedCategory !== 'All'
                          ? (selectedCategory as InvestmentCategory)
                          : undefined
                      )
                    }
                    className="btn-primary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Plus size={14} />
                    <span>Add First {selectedCategory === 'All' ? 'Investment' : selectedCategory}</span>
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
