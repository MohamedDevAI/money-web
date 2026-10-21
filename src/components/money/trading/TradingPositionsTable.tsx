import { useState, useMemo } from 'react';
import {
  Trash2,
  Edit2,
  Search,
  CheckSquare,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { formatINR } from '../../../utils/formatters';
import { useMoneyPrivacy } from '../../../context/MoneyPrivacyContext';
import type { Trade } from '../../../interface';

interface TradingPositionsTableProps {
  trades: Trade[];
  onOpenAddModal: () => void;
  onEditTrade: (trade: Trade) => void;
  onCloseTrade: (id: string, exitPrice: number) => void;
  onDeleteTrade: (id: string) => void;
  onTrailStopToBreakeven?: (trade: Trade) => void;
}

export default function TradingPositionsTable({
  trades,
  onOpenAddModal,
  onEditTrade,
  onCloseTrade,
  onDeleteTrade,
  onTrailStopToBreakeven,
}: TradingPositionsTableProps) {
  const { mask } = useMoneyPrivacy();

  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'CLOSED' | 'ALL'>('OPEN');
  const [instrumentFilter, setInstrumentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Close position inline prompt modal state
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [exitPriceInput, setExitPriceInput] = useState<string>('');

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (instrumentFilter !== 'ALL' && t.instrument !== instrumentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSymbol = t.symbol.toLowerCase().includes(q);
        const matchStrategy = (t.strategy || '').toLowerCase().includes(q);
        const matchNotes = (t.notes || '').toLowerCase().includes(q);
        if (!matchSymbol && !matchStrategy && !matchNotes) return false;
      }
      return true;
    });
  }, [trades, statusFilter, instrumentFilter, searchQuery]);

  const openCount = trades.filter((t) => t.status === 'OPEN').length;
  const closedCount = trades.filter((t) => t.status === 'CLOSED').length;

  const handleInitiateClose = (trade: Trade) => {
    setClosingTradeId(trade.id);
    setExitPriceInput(String(trade.currentPrice || trade.entryPrice));
  };

  const handleConfirmClose = () => {
    if (closingTradeId && exitPriceInput) {
      onCloseTrade(closingTradeId, parseFloat(exitPriceInput));
      setClosingTradeId(null);
      setExitPriceInput('');
    }
  };

  return (
    <div className="glass-panel trading-table-container">
      {/* Table Toolbar */}
      <div className="trading-table-toolbar">
        <div className="trading-table-toolbar-left">
          {/* Status Tabs */}
          <div className="trading-status-pills">
            <button
              type="button"
              className={`trading-status-pill ${statusFilter === 'OPEN' ? 'active' : ''}`}
              onClick={() => setStatusFilter('OPEN')}
            >
              Open Positions ({openCount})
            </button>
            <button
              type="button"
              className={`trading-status-pill ${statusFilter === 'CLOSED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('CLOSED')}
            >
              Settled Journal ({closedCount})
            </button>
            <button
              type="button"
              className={`trading-status-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All Blotter ({trades.length})
            </button>
          </div>

          {/* Instrument Filter */}
          <select
            value={instrumentFilter}
            onChange={(e) => setInstrumentFilter(e.target.value)}
            className="trading-select-field"
          >
            <option value="ALL">All Segments</option>
            <option value="F&O">Futures & Options (F&O)</option>
            <option value="EQUITY">Cash Equity</option>
            <option value="COMMODITY">Commodities (MCX)</option>
            <option value="CRYPTO">Crypto Derivatives</option>
          </select>
        </div>

        <div className="trading-table-toolbar-right">
          {/* Search Box */}
          <div className="trading-search-input-box">
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search contract, strategy, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button onClick={onOpenAddModal} className="btn btn-primary btn-sm">
            <Plus size={14} /> Log Position
          </button>
        </div>
      </div>

      {/* Institutional Blotter Table */}
      <div className="trading-table-scroll-wrapper">
        <table className="trading-positions-table">
          <thead>
            <tr>
              <th>CONTRACT & GRADE</th>
              <th>SIDE / PRODUCT</th>
              <th>QTY</th>
              <th>ENTRY (₹)</th>
              <th>LTP / EXIT (₹)</th>
              <th>STOP / TARGET</th>
              <th>R:R & R-MULT</th>
              <th>PLAYBOOK & MINDSET</th>
              <th>GROSS / NET P&L</th>
              <th style={{ textAlign: 'right' }}>EXECUTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '42px 20px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No matching positions in the blotter. Use the Execution Terminal or click{' '}
                    <strong>Log Position</strong>.
                  </div>
                </td>
              </tr>
            ) : (
              filteredTrades.map((trade) => {
                const isClosed = trade.status === 'CLOSED';
                const grossPnl = isClosed ? trade.realizedPnl || 0 : trade.unrealizedPnl || 0;
                const charges = trade.charges || 0;
                const netPnl = trade.netPnl ?? grossPnl - charges;
                const isProfit = grossPnl >= 0;
                const effectivePrice =
                  isClosed && trade.exitPrice ? trade.exitPrice : trade.currentPrice;
                const canTrailToCost =
                  !isClosed &&
                  isProfit &&
                  Math.abs(trade.stopLoss - trade.entryPrice) > 0.05;

                return (
                  <tr key={trade.id}>
                    {/* 1. Contract & Grade */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="font-mono" style={{ fontWeight: 800, color: '#f8fafc' }}>
                          {trade.symbol}
                        </span>
                        {trade.setupGrade && (
                          <span className={`grade-pill grade-${trade.setupGrade.replace('+', 'plus')}`}>
                            {trade.setupGrade}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {trade.instrument} • {(trade.entryDate || '').split('T')[0]}
                      </div>
                    </td>

                    {/* 2. Side / Product */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span
                          className={`side-pill ${
                            trade.direction === 'LONG' ? 'long' : 'short'
                          }`}
                        >
                          {trade.direction === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                        </span>
                        <span className="product-micro-tag font-mono">
                          {trade.productType || 'MIS'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {trade.tradeType}
                      </div>
                    </td>

                    {/* 3. Quantity */}
                    <td className="font-mono" style={{ fontWeight: 700 }}>
                      {trade.quantity.toLocaleString()}
                    </td>

                    {/* 4. Entry Price */}
                    <td className="font-mono">{mask(formatINR(trade.entryPrice))}</td>

                    {/* 5. LTP / Exit */}
                    <td className="font-mono">
                      <div style={{ fontWeight: 700, color: isProfit ? '#10b981' : '#f43f5e' }}>
                        {mask(formatINR(effectivePrice))}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {isClosed ? 'Settled Exit' : 'Live MTM'}
                      </div>
                    </td>

                    {/* 6. Stop / Target */}
                    <td className="font-mono" style={{ fontSize: '0.78rem' }}>
                      <div className="text-rose">SL: {mask(formatINR(trade.stopLoss))}</div>
                      <div className="text-emerald">TP: {mask(formatINR(trade.targetPrice))}</div>
                    </td>

                    {/* 7. R:R & R-Multiple */}
                    <td className="font-mono">
                      <div className="text-cyan" style={{ fontWeight: 700 }}>
                        1 : {trade.riskRewardRatio || 2.0}
                      </div>
                      {trade.rMultiple !== undefined && (
                        <div
                          style={{
                            fontSize: '0.73rem',
                            color: trade.rMultiple >= 0 ? '#10b981' : '#f43f5e',
                          }}
                        >
                          {trade.rMultiple >= 0 ? '+' : ''}
                          {trade.rMultiple}R
                        </div>
                      )}
                    </td>

                    {/* 8. Playbook & Mindset */}
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#e2e8f0' }}>
                        {trade.strategy || 'Discretionary'}
                      </div>
                      <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Mindset: <strong>{trade.emotion || 'Disciplined'}</strong>
                      </div>
                    </td>

                    {/* 9. Gross / Net P&L */}
                    <td className="font-mono">
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          color: isProfit ? '#10b981' : '#f43f5e',
                        }}
                      >
                        {isProfit ? '+' : ''}
                        {mask(formatINR(grossPnl))} ({isProfit ? '+' : ''}
                        {trade.pnlPercent}%)
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Net: {mask(formatINR(netPnl))} (Tax: ₹{charges})
                      </div>
                    </td>

                    {/* 10. Execution Actions */}
                    <td style={{ textAlign: 'right' }}>
                      {closingTradeId === trade.id ? (
                        <div className="inline-close-box">
                          <input
                            type="number"
                            step="any"
                            value={exitPriceInput}
                            onChange={(e) => setExitPriceInput(e.target.value)}
                            className="inline-exit-input font-mono"
                            placeholder="Exit ₹"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleConfirmClose}
                            className="btn-inline-confirm"
                          >
                            Book
                          </button>
                          <button
                            type="button"
                            onClick={() => setClosingTradeId(null)}
                            className="btn-inline-cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="blotter-actions-group">
                          {!isClosed && (
                            <>
                              {canTrailToCost && onTrailStopToBreakeven && (
                                <button
                                  type="button"
                                  className="blotter-btn trail"
                                  onClick={() => onTrailStopToBreakeven(trade)}
                                  title="Trail Stop-Loss to Entry Price (Risk-Free Trade)"
                                >
                                  <ShieldCheck size={13} /> SL→Cost
                                </button>
                              )}
                              <button
                                type="button"
                                className="blotter-btn squareoff"
                                onClick={() => handleInitiateClose(trade)}
                                title="Square off & settle position"
                              >
                                <CheckSquare size={13} /> Exit
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="blotter-btn icon"
                            onClick={() => onEditTrade(trade)}
                            title="Modify trade"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="blotter-btn icon delete"
                            onClick={() => onDeleteTrade(trade.id)}
                            title="Delete trade"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
