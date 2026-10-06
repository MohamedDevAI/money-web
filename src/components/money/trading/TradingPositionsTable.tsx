import { useState, useMemo } from 'react';
import {
  Trash2,
  Edit2,
  Search,
  CheckSquare,
  Activity,
  Plus
} from 'lucide-react';
import { formatINR } from '../../../utils/formatters';
import { useMoneyPrivacy } from '../../../context/MoneyPrivacyContext';
import type { Trade } from '../../../types';

interface TradingPositionsTableProps {
  trades: Trade[];
  onOpenAddModal: () => void;
  onEditTrade: (trade: Trade) => void;
  onCloseTrade: (id: string, exitPrice: number) => void;
  onDeleteTrade: (id: string) => void;
}

export default function TradingPositionsTable({
  trades,
  onOpenAddModal,
  onEditTrade,
  onCloseTrade,
  onDeleteTrade,
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
        if (!matchSymbol && !matchStrategy) return false;
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
              Trade Journal ({closedCount})
            </button>
            <button
              type="button"
              className={`trading-status-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All Trades ({trades.length})
            </button>
          </div>

          {/* Instrument Filter */}
          <select
            value={instrumentFilter}
            onChange={(e) => setInstrumentFilter(e.target.value)}
            className="trading-select-field"
          >
            <option value="ALL">All Instruments</option>
            <option value="EQUITY">Equity Shares</option>
            <option value="F&O">Futures & Options</option>
            <option value="CRYPTO">Crypto</option>
            <option value="COMMODITY">Commodities</option>
          </select>
        </div>

        <div className="trading-table-toolbar-right">
          {/* Search Box */}
          <div className="trading-search-input-box">
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search symbol, setup..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="trading-search-input"
            />
          </div>

          <button onClick={onOpenAddModal} className="btn btn-primary btn-sm">
            <Plus size={15} /> Log Trade
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="trading-table-wrap">
        <table className="trading-data-table">
          <thead>
            <tr>
              <th>Symbol & Setup</th>
              <th>Type</th>
              <th>Direction</th>
              <th>Entry Price</th>
              <th>Current / Exit</th>
              <th>Qty / Lots</th>
              <th>SL & Target (R:R)</th>
              <th>P&L (₹)</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.length > 0 ? (
              filteredTrades.map((t) => {
                const isOpen = t.status === 'OPEN';
                const pnl = isOpen ? (t.unrealizedPnl || 0) : (t.realizedPnl || 0);
                const isProfitable = pnl >= 0;
                const effectivePrice = isOpen ? t.currentPrice : (t.exitPrice || t.currentPrice);

                return (
                  <tr key={t.id} className={isOpen ? 'row-open-trade' : 'row-closed-trade'}>
                    {/* Symbol & Strategy */}
                    <td>
                      <div>
                        <div className="trade-symbol-main">{t.symbol}</div>
                        <div className="trade-strategy-tag">
                          {t.instrument} • {t.strategy || 'Discretionary'}
                        </div>
                      </div>
                    </td>

                    {/* Trade Type */}
                    <td>
                      <span className="badge badge-trade-type">
                        {t.tradeType}
                      </span>
                    </td>

                    {/* Direction */}
                    <td>
                      <span className={`badge ${t.direction === 'LONG' ? 'badge-long' : 'badge-short'}`}>
                        {t.direction === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                      </span>
                    </td>

                    {/* Entry Price */}
                    <td className="font-mono">
                      {mask(`₹${t.entryPrice.toLocaleString('en-IN')}`)}
                    </td>

                    {/* Current / Exit Price */}
                    <td className="font-mono">
                      {mask(`₹${effectivePrice.toLocaleString('en-IN')}`)}
                    </td>

                    {/* Quantity */}
                    <td className="font-mono">
                      {t.quantity.toLocaleString('en-IN')}
                    </td>

                    {/* SL & Target with R:R */}
                    <td>
                      <div className="trade-rr-container">
                        <span className="trade-sl-text">SL: {mask(`₹${t.stopLoss}`)}</span>
                        <span className="trade-tp-text">TP: {mask(`₹${t.targetPrice}`)}</span>
                        {t.riskRewardRatio && (
                          <span className="badge badge-rr">1:{t.riskRewardRatio}</span>
                        )}
                      </div>
                    </td>

                    {/* P&L */}
                    <td>
                      <div className={`trade-pnl-cell ${isProfitable ? 'text-emerald' : 'text-rose'}`}>
                        <div className="trade-pnl-amount">
                          {mask(`${isProfitable ? '+' : ''}${formatINR(pnl)}`)}
                        </div>
                        <div className="trade-pnl-pct">
                          {mask(`${isProfitable ? '+' : ''}${t.pnlPercent || 0}%`)}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`badge ${isOpen ? 'badge-cyan' : 'badge-completed'}`}>
                        {isOpen ? 'Open' : 'Closed'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="trading-actions-row">
                        {isOpen && (
                          <button
                            type="button"
                            onClick={() => handleInitiateClose(t)}
                            className="btn-trading-close"
                            title="Close Position / Book Profit"
                          >
                            <CheckSquare size={13} /> Exit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditTrade(t)}
                          className="btn-icon"
                          title="Edit details"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTrade(t.id)}
                          className="btn-icon btn-icon-danger"
                          title="Delete trade"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="trading-empty-row">
                  <Activity size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                  <div className="trading-empty-title">No trades found</div>
                  <div className="trading-empty-desc">
                    {searchQuery
                      ? 'No positions match your search filter.'
                      : 'Log your first market execution to start tracking your trading equity curve.'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Close Position Prompt Dialog */}
      {closingTradeId && (
        <div className="modal-overlay-backdrop">
          <div className="glass-panel trading-close-prompt-card">
            <h4 className="trading-close-prompt-title">Close Market Position</h4>
            <p className="trading-close-prompt-desc">
              Enter final exit execution price to book P&L into your settled trade journal.
            </p>
            <div className="form-group-custom">
              <label className="modal-field-label">Exit Price (₹ INR)</label>
              <input
                type="number"
                step="any"
                value={exitPriceInput}
                onChange={(e) => setExitPriceInput(e.target.value)}
                className="modal-input-field"
                autoFocus
              />
            </div>
            <div className="modal-footer-actions">
              <button
                type="button"
                onClick={() => setClosingTradeId(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className="btn btn-primary"
              >
                Confirm Exit & Book
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
