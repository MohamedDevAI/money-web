import React, { useState, useEffect } from 'react';
import {
  X,
  LineChart,
  Repeat,
  ShieldAlert,
  Building2,
  Save,
  Coins
} from 'lucide-react';
import type {
  InvestmentHolding,
  InvestmentCategory,
  FundamentalMetrics,
  MutualFundMetrics,
  BondMetrics,
  FDMetrics
} from '../../types';

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (holding: Partial<InvestmentHolding>) => Promise<void>;
  initialHolding?: InvestmentHolding | null;
  defaultCategory?: InvestmentCategory;
}

export default function InvestmentModal({
  isOpen,
  onClose,
  onSave,
  initialHolding = null,
  defaultCategory = 'Stocks'
}: InvestmentModalProps) {
  const [category, setCategory] = useState<InvestmentCategory>(
    initialHolding?.category || defaultCategory
  );
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Stocks specific
  const [sector, setSector] = useState('');
  const [peRatio, setPeRatio] = useState('');

  // SIPs / Mutual Funds specific
  const [fundHouse, setFundHouse] = useState('');
  const [sipAmount, setSipAmount] = useState('');
  const [cagr3yr, setCagr3yr] = useState('');

  // Bonds specific
  const [issuer, setIssuer] = useState('');
  const [couponRate, setCouponRate] = useState('');
  const [yieldToMaturity, setYieldToMaturity] = useState('');
  const [creditRating, setCreditRating] = useState('AAA');
  const [bondMaturityDate, setBondMaturityDate] = useState('');

  // FDs specific
  const [bankName, setBankName] = useState('');
  const [interestRate, setInterestRate] = useState('7.1');
  const [tenureMonths, setTenureMonths] = useState('12');
  const [fdMaturityDate, setFdMaturityDate] = useState('');
  const [maturityAmount, setMaturityAmount] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-fill fields when initialHolding is provided (Edit mode)
  useEffect(() => {
    if (initialHolding) {
      setCategory(initialHolding.category);
      setName(initialHolding.name || '');
      setTicker(initialHolding.ticker || '');
      setQuantity(String(initialHolding.quantity || 1));
      setBuyPrice(String(initialHolding.buyPrice || 0));
      setCurrentPrice(String(initialHolding.currentPrice || 0));
      setBuyDate(initialHolding.buyDate || new Date().toISOString().split('T')[0]);
      setNotes(initialHolding.notes || '');

      if (initialHolding.fundamentals) {
        setSector(initialHolding.fundamentals.sector || '');
        setPeRatio(initialHolding.fundamentals.peRatio ? String(initialHolding.fundamentals.peRatio) : '');
      }

      if (initialHolding.mutualFundMetrics) {
        setFundHouse(initialHolding.mutualFundMetrics.fundHouse || '');
        setSipAmount(
          initialHolding.mutualFundMetrics.sipAmount
            ? String(initialHolding.mutualFundMetrics.sipAmount)
            : ''
        );
        setCagr3yr(
          initialHolding.mutualFundMetrics.cagr3yr
            ? String(initialHolding.mutualFundMetrics.cagr3yr)
            : ''
        );
      }

      if (initialHolding.bondMetrics) {
        setIssuer(initialHolding.bondMetrics.issuer || '');
        setCouponRate(
          initialHolding.bondMetrics.couponRate
            ? String(initialHolding.bondMetrics.couponRate)
            : ''
        );
        setYieldToMaturity(
          initialHolding.bondMetrics.yieldToMaturity
            ? String(initialHolding.bondMetrics.yieldToMaturity)
            : ''
        );
        setCreditRating(initialHolding.bondMetrics.creditRating || 'AAA');
        setBondMaturityDate(initialHolding.bondMetrics.maturityDate || '');
      }

      if (initialHolding.fdMetrics) {
        setBankName(initialHolding.fdMetrics.bankName || '');
        setInterestRate(
          initialHolding.fdMetrics.interestRate
            ? String(initialHolding.fdMetrics.interestRate)
            : '7.1'
        );
        setTenureMonths(
          initialHolding.fdMetrics.tenure
            ? String(initialHolding.fdMetrics.tenure)
            : '12'
        );
        setFdMaturityDate(initialHolding.fdMetrics.maturityDate || '');
        setMaturityAmount(
          initialHolding.fdMetrics.maturityAmount
            ? String(initialHolding.fdMetrics.maturityAmount)
            : ''
        );
      }
    } else {
      // Reset form
      setCategory(defaultCategory);
      setName('');
      setTicker('');
      setQuantity('1');
      setBuyPrice('');
      setCurrentPrice('');
      setBuyDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setSector('');
      setPeRatio('');
      setFundHouse('');
      setSipAmount('');
      setCagr3yr('');
      setIssuer('');
      setCouponRate('');
      setYieldToMaturity('');
      setCreditRating('AAA');
      setBondMaturityDate('');
      setBankName('');
      setInterestRate('7.1');
      setTenureMonths('12');
      setFdMaturityDate('');
      setMaturityAmount('');
      setErrorMsg('');
    }
  }, [initialHolding, defaultCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter an investment name or title');
      return;
    }

    const parsedQty = parseFloat(quantity) || 1;
    const parsedBuyPrice = parseFloat(buyPrice) || 0;
    const parsedCurrentPrice = parseFloat(currentPrice) || parsedBuyPrice;

    const payload: Partial<InvestmentHolding> = {
      name: name.trim(),
      ticker: ticker.trim() || undefined,
      category,
      buyPrice: parsedBuyPrice,
      currentPrice: parsedCurrentPrice,
      quantity: parsedQty,
      buyDate,
      notes: notes.trim() || undefined,
      currency: 'INR'
    };

    if (category === 'Stocks') {
      const fundamentals: FundamentalMetrics = {
        sector: sector.trim() || undefined,
        peRatio: peRatio ? parseFloat(peRatio) : undefined,
        moatRating: 'Wide',
        governanceScore: 8,
        roe: 18,
        roce: 15,
        debtToEquity: 0.3,
        freeCashFlow: 5000,
        pbRatio: 2.5,
        marketCap: 100000,
        promoterHolding: 50,
        promoterHoldingChange: 0
      };
      payload.fundamentals = fundamentals;
    } else if (category === 'Mutual Funds' || category === 'SIPs') {
      const mutualFundMetrics: MutualFundMetrics = {
        fundHouse: fundHouse.trim() || undefined,
        sipAmount: sipAmount ? parseFloat(sipAmount) : undefined,
        cagr3yr: cagr3yr ? parseFloat(cagr3yr) : undefined,
        cagr5yr: cagr3yr ? parseFloat(cagr3yr) * 0.95 : undefined,
        sharpeRatio: 1.4,
        sortinoRatio: 2.1,
        expenseRatio: 0.6,
        alphaVsBenchmark: 3.5,
        beta: 0.85,
        fundManagerTenure: 8,
        sipActive: true
      };
      payload.mutualFundMetrics = mutualFundMetrics;
    } else if (category === 'Bonds') {
      const bondMetrics: BondMetrics = {
        issuer: issuer.trim() || name.trim(),
        couponRate: couponRate ? parseFloat(couponRate) : 7.2,
        yieldToMaturity: yieldToMaturity ? parseFloat(yieldToMaturity) : 7.2,
        creditRating: creditRating || 'AAA',
        maturityDate: bondMaturityDate || undefined,
        faceValue: parsedBuyPrice || 1000,
        duration: 5,
        bondType: 'Government'
      };
      payload.bondMetrics = bondMetrics;
    } else if (category === 'FDs') {
      const fdMetrics: FDMetrics = {
        bankName: bankName.trim() || name.trim(),
        interestRate: interestRate ? parseFloat(interestRate) : 7.1,
        tenure: tenureMonths ? parseInt(tenureMonths) : 12,
        maturityDate: fdMaturityDate || undefined,
        maturityAmount: maturityAmount ? parseFloat(maturityAmount) : parsedCurrentPrice,
        fdType: 'Cumulative',
        taxTreatment: 'Taxable'
      };
      payload.fdMetrics = fdMetrics;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save holding');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="investment-modal-overlay" onClick={onClose}>
      <div
        className="investment-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(168, 85, 247, 0.2)',
                color: '#c084fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Coins size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                {initialHolding ? 'Edit Investment Holding' : 'Add New Investment'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#c4b5fd' }}>
                Track and visualize your FD, Bonds, Stocks, or SIPs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-icon"
            style={{ border: 'none', background: 'transparent', color: '#c4b5fd' }}
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(189, 46, 250, 0.12)',
              border: '1px solid rgba(189, 46, 250, 0.35)',
              color: '#6b677f',
              fontSize: '0.85rem',
              marginBottom: 16
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Category Selector Tabs */}
        <div className="category-picker-grid">
          <button
            type="button"
            className={`category-picker-btn ${category === 'Stocks' ? 'active' : ''}`}
            onClick={() => setCategory('Stocks')}
          >
            <LineChart size={18} />
            <span>Stocks</span>
          </button>

          <button
            type="button"
            className={`category-picker-btn ${
              category === 'Mutual Funds' || category === 'SIPs' ? 'active' : ''
            }`}
            onClick={() => setCategory('Mutual Funds')}
          >
            <Repeat size={18} />
            <span>SIPs & MFs</span>
          </button>

          <button
            type="button"
            className={`category-picker-btn ${category === 'Bonds' ? 'active' : ''}`}
            onClick={() => setCategory('Bonds')}
          >
            <ShieldAlert size={18} />
            <span>Bonds</span>
          </button>

          <button
            type="button"
            className={`category-picker-btn ${category === 'FDs' ? 'active' : ''}`}
            onClick={() => setCategory('FDs')}
          >
            <Building2 size={18} />
            <span>Fixed Deposit</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Main Title & Ticker */}
          <div className="form-grid-2col">
            <div className="modal-input-group">
              <label className="modal-input-label">
                {category === 'Stocks'
                  ? 'Company Name *'
                  : category === 'FDs'
                  ? 'FD / Scheme Name *'
                  : category === 'Bonds'
                  ? 'Bond / Instrument Name *'
                  : 'Fund / SIP Scheme Name *'}
              </label>
              <input
                type="text"
                required
                placeholder={
                  category === 'Stocks'
                    ? 'e.g. Reliance Industries'
                    : category === 'FDs'
                    ? 'e.g. SBI 5Y Tax Saver'
                    : category === 'Bonds'
                    ? 'e.g. Sovereign Gold Bond 2030'
                    : 'e.g. Parag Parikh Flexi Cap Fund'
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="modal-text-input"
              />
            </div>

            <div className="modal-input-group">
              <label className="modal-input-label">
                {category === 'Stocks'
                  ? 'Ticker / Symbol'
                  : category === 'FDs'
                  ? 'Bank / Institution'
                  : category === 'Bonds'
                  ? 'ISIN / Symbol'
                  : 'Fund House / AMC'}
              </label>
              <input
                type="text"
                placeholder={
                  category === 'Stocks'
                    ? 'e.g. RELIANCE.NS'
                    : category === 'FDs'
                    ? 'e.g. State Bank of India'
                    : category === 'Bonds'
                    ? 'e.g. IN0020220011'
                    : 'e.g. PPFAS AMC'
                }
                value={
                  category === 'FDs'
                    ? bankName
                    : category === 'Mutual Funds' || category === 'SIPs'
                    ? fundHouse
                    : ticker
                }
                onChange={(e) => {
                  if (category === 'FDs') setBankName(e.target.value);
                  else if (category === 'Mutual Funds' || category === 'SIPs')
                    setFundHouse(e.target.value);
                  else setTicker(e.target.value);
                }}
                className="modal-text-input"
              />
            </div>
          </div>

          {/* Pricing & Units */}
          <div className="form-grid-2col">
            <div className="modal-input-group">
              <label className="modal-input-label">
                {category === 'FDs'
                  ? 'Principal Deposit (₹) *'
                  : category === 'Mutual Funds' || category === 'SIPs'
                  ? 'Average Buy NAV (₹) *'
                  : 'Buy Price / Share (₹) *'}
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="modal-text-input"
              />
            </div>

            <div className="modal-input-group">
              <label className="modal-input-label">
                {category === 'FDs'
                  ? 'Current Accrued Value (₹) *'
                  : category === 'Mutual Funds' || category === 'SIPs'
                  ? 'Current NAV (₹) *'
                  : 'Current Price (₹) *'}
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                className="modal-text-input"
              />
            </div>
          </div>

          <div className="form-grid-2col">
            <div className="modal-input-group">
              <label className="modal-input-label">
                {category === 'FDs'
                  ? 'Deposit Units (Usually 1)'
                  : category === 'Mutual Funds' || category === 'SIPs'
                  ? 'Accumulated Units'
                  : 'Quantity (Shares / Units)'}
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="modal-text-input"
              />
            </div>

            <div className="modal-input-group">
              <label className="modal-input-label">
                {category === 'FDs' ? 'Deposit Start Date' : 'Purchase / Start Date'}
              </label>
              <input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className="modal-text-input"
              />
            </div>
          </div>

          {/* Category-Adaptive Specialty Inputs */}
          {category === 'Stocks' && (
            <div className="form-grid-2col">
              <div className="modal-input-group">
                <label className="modal-input-label">Sector / Industry</label>
                <input
                  type="text"
                  placeholder="e.g. Energy, IT, Banking"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="modal-text-input"
                />
              </div>
              <div className="modal-input-group">
                <label className="modal-input-label">P/E Ratio</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 24.5"
                  value={peRatio}
                  onChange={(e) => setPeRatio(e.target.value)}
                  className="modal-text-input"
                />
              </div>
            </div>
          )}

          {(category === 'Mutual Funds' || category === 'SIPs') && (
            <div className="form-grid-2col">
              <div className="modal-input-group">
                <label className="modal-input-label">Monthly SIP Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={sipAmount}
                  onChange={(e) => setSipAmount(e.target.value)}
                  className="modal-text-input"
                />
              </div>
              <div className="modal-input-group">
                <label className="modal-input-label">3-Year CAGR %</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 19.5"
                  value={cagr3yr}
                  onChange={(e) => setCagr3yr(e.target.value)}
                  className="modal-text-input"
                />
              </div>
            </div>
          )}

          {category === 'Bonds' && (
            <div className="form-grid-2col">
              <div className="modal-input-group">
                <label className="modal-input-label">Coupon Rate %</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 7.25"
                  value={couponRate}
                  onChange={(e) => setCouponRate(e.target.value)}
                  className="modal-text-input"
                />
              </div>
              <div className="modal-input-group">
                <label className="modal-input-label">Maturity Date</label>
                <input
                  type="date"
                  value={bondMaturityDate}
                  onChange={(e) => setBondMaturityDate(e.target.value)}
                  className="modal-text-input"
                />
              </div>
            </div>
          )}

          {category === 'FDs' && (
            <div className="form-grid-2col">
              <div className="modal-input-group">
                <label className="modal-input-label">Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="e.g. 7.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="modal-text-input"
                />
              </div>
              <div className="modal-input-group">
                <label className="modal-input-label">Maturity Date</label>
                <input
                  type="date"
                  value={fdMaturityDate}
                  onChange={(e) => setFdMaturityDate(e.target.value)}
                  className="modal-text-input"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="modal-input-group">
            <label className="modal-input-label">Notes & Investment Thesis</label>
            <textarea
              rows={2}
              placeholder="Investment goals, allocation rationale, rebalancing target..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="modal-text-input"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid rgba(186, 54, 242, 0.16)'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn-glass"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700
              }}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Saving...' : initialHolding ? 'Update Holding' : 'Add Holding'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
