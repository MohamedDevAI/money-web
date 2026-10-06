import React, { useState, useEffect } from 'react';
import { Activity, X } from 'lucide-react';
import type { Trade, TradeDirection, InstrumentType, TradeType } from '../../../types';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trade: Partial<Trade>) => void;
  initialTrade?: Trade | null;
}

export default function TradeModal({
  isOpen,
  onClose,
  onSave,
  initialTrade,
}: TradeModalProps) {
  const [formData, setFormData] = useState({
    symbol: '',
    instrument: 'F&O' as InstrumentType,
    direction: 'LONG' as TradeDirection,
    tradeType: 'INTRADAY' as TradeType,
    entryPrice: 100,
    currentPrice: 100,
    stopLoss: 80,
    targetPrice: 140,
    quantity: 1,
    strategy: 'Breakout',
    notes: '',
  });

  useEffect(() => {
    if (initialTrade) {
      setFormData({
        symbol: initialTrade.symbol,
        instrument: initialTrade.instrument,
        direction: initialTrade.direction,
        tradeType: initialTrade.tradeType,
        entryPrice: initialTrade.entryPrice,
        currentPrice: initialTrade.currentPrice,
        stopLoss: initialTrade.stopLoss,
        targetPrice: initialTrade.targetPrice,
        quantity: initialTrade.quantity,
        strategy: initialTrade.strategy || 'Breakout',
        notes: initialTrade.notes || '',
      });
    } else {
      setFormData({
        symbol: '',
        instrument: 'F&O',
        direction: 'LONG',
        tradeType: 'INTRADAY',
        entryPrice: 100,
        currentPrice: 100,
        stopLoss: 80,
        targetPrice: 140,
        quantity: 50,
        strategy: 'Breakout',
        notes: '',
      });
    }
  }, [initialTrade, isOpen]);

  if (!isOpen) return null;

  // Live Risk:Reward calculation
  const risk = Math.abs(formData.entryPrice - formData.stopLoss);
  const reward = Math.abs(formData.targetPrice - formData.entryPrice);
  const rrRatio = risk > 0 ? (reward / risk).toFixed(2) : '1.00';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol.trim()) return;

    onSave({
      symbol: formData.symbol.trim().toUpperCase(),
      instrument: formData.instrument,
      direction: formData.direction,
      tradeType: formData.tradeType,
      entryPrice: Number(formData.entryPrice),
      currentPrice: Number(formData.currentPrice || formData.entryPrice),
      stopLoss: Number(formData.stopLoss),
      targetPrice: Number(formData.targetPrice),
      quantity: Number(formData.quantity),
      strategy: formData.strategy.trim(),
      notes: formData.notes.trim(),
      status: initialTrade?.status || 'OPEN',
    });

    onClose();
  };

  return (
    <div className="modal-overlay-backdrop">
      <div className="glass-panel modal-content-card trade-modal-card">
        {/* Header */}
        <div className="modal-header-row">
          <div className="modal-header-with-icon">
            <div
              className="modal-icon-badge"
              style={{ background: 'rgba(188, 47, 249, 0.15)', color: '#9406d0' }}
            >
              <Activity size={20} />
            </div>
            <div>
              <h3 className="modal-title-main">
                {initialTrade ? 'Modify Trading Position' : 'Log New Market Trade'}
              </h3>
              <div className="modal-subtitle-schema">All figures in INR (₹)</div>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-vertical">
          {/* Symbol & Instrument */}
          <div className="form-grid-two-cols">
            <div className="form-group-custom">
              <label className="modal-field-label">Trading Symbol / Contract</label>
              <input
                type="text"
                placeholder="e.g. NIFTY 24800 CE, TATAMOTORS, BTC"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                required
                className="modal-input-field font-mono"
                autoFocus
              />
            </div>

            <div className="form-group-custom">
              <label className="modal-field-label">Instrument</label>
              <select
                value={formData.instrument}
                onChange={(e) => setFormData({ ...formData, instrument: e.target.value as InstrumentType })}
                className="modal-select-field"
              >
                <option value="F&O">Futures & Options (F&O)</option>
                <option value="EQUITY">Cash Equity (Shares)</option>
                <option value="COMMODITY">Commodity</option>
                <option value="CRYPTO">Crypto</option>
              </select>
            </div>
          </div>

          {/* Direction & Trade Type */}
          <div className="form-grid-two-cols">
            <div className="form-group-custom">
              <label className="modal-field-label">Direction</label>
              <div className="trade-direction-toggle">
                <button
                  type="button"
                  className={`trade-dir-btn btn-long ${formData.direction === 'LONG' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, direction: 'LONG' })}
                >
                  ▲ LONG (Buy)
                </button>
                <button
                  type="button"
                  className={`trade-dir-btn btn-short ${formData.direction === 'SHORT' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, direction: 'SHORT' })}
                >
                  ▼ SHORT (Sell)
                </button>
              </div>
            </div>

            <div className="form-group-custom">
              <label className="modal-field-label">Trade Timeframe</label>
              <select
                value={formData.tradeType}
                onChange={(e) => setFormData({ ...formData, tradeType: e.target.value as TradeType })}
                className="modal-select-field"
              >
                <option value="INTRADAY">Intraday (Day Trade)</option>
                <option value="SWING">Swing Trade (Multi-Day)</option>
                <option value="POSITIONAL">Positional (Weeks/Months)</option>
              </select>
            </div>
          </div>

          {/* Entry Price, Current Price & Quantity */}
          <div className="form-grid-three-cols">
            <div className="form-group-custom">
              <label className="modal-field-label">Entry Price (₹)</label>
              <input
                type="number"
                step="any"
                min="0.05"
                value={formData.entryPrice}
                onChange={(e) => setFormData({ ...formData, entryPrice: Number(e.target.value) })}
                required
                className="modal-input-field"
              />
            </div>

            <div className="form-group-custom">
              <label className="modal-field-label">Current / LTP (₹)</label>
              <input
                type="number"
                step="any"
                min="0.05"
                value={formData.currentPrice}
                onChange={(e) => setFormData({ ...formData, currentPrice: Number(e.target.value) })}
                className="modal-input-field"
              />
            </div>

            <div className="form-group-custom">
              <label className="modal-field-label">Quantity / Lot Size</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                required
                className="modal-input-field"
              />
            </div>
          </div>

          {/* Stop Loss & Target Price with R:R Calculation */}
          <div className="form-grid-two-cols">
            <div className="form-group-custom">
              <label className="modal-field-label">Stop Loss (₹)</label>
              <input
                type="number"
                step="any"
                value={formData.stopLoss}
                onChange={(e) => setFormData({ ...formData, stopLoss: Number(e.target.value) })}
                required
                className="modal-input-field"
              />
            </div>

            <div className="form-group-custom">
              <label className="modal-field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Target Price (₹)</span>
                <span className="badge badge-rr" style={{ fontSize: '0.72rem' }}>
                  R:R = 1 : {rrRatio}
                </span>
              </label>
              <input
                type="number"
                step="any"
                value={formData.targetPrice}
                onChange={(e) => setFormData({ ...formData, targetPrice: Number(e.target.value) })}
                required
                className="modal-input-field"
              />
            </div>
          </div>

          {/* Strategy & Notes */}
          <div className="form-group-custom">
            <label className="modal-field-label">Setup / Strategy</label>
            <input
              type="text"
              placeholder="e.g. 15m ORB Breakout, 20 EMA Pullback, Demand Zone, VWAP Reclaim"
              value={formData.strategy}
              onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
              className="modal-input-field"
            />
          </div>

          <div className="form-group-custom">
            <label className="modal-field-label">Trade Notes / Execution Rules</label>
            <textarea
              placeholder="Reasons for entry, market catalysts, trailing rules..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="modal-input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="modal-footer-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {initialTrade ? 'Save Changes' : 'Execute & Log Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
