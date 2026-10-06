import {
  LineChart,
  Repeat,
  ShieldAlert,
  Building2,
  ArrowUpRight
} from 'lucide-react';
import type { InvestmentHolding, InvestmentCategory } from '../../types';
import { formatINR, formatINRCompact, formatPercent, formatPctChange } from '../../utils/formatters';
import { useMoneyPrivacy } from '../../context/MoneyPrivacyContext';

interface CategoryBreakdownCardsProps {
  holdings: InvestmentHolding[];
  selectedCategory: string; // 'All' | 'Stocks' | 'Mutual Funds' | 'Bonds' | 'FDs'
  onSelectCategory: (cat: string) => void;
}

export default function CategoryBreakdownCards({
  holdings,
  selectedCategory,
  onSelectCategory
}: CategoryBreakdownCardsProps) {
  const { mask } = useMoneyPrivacy();

  // Aggregate stats per category
  const getCatStats = (categories: InvestmentCategory[]) => {
    const matching = holdings.filter((h) => categories.includes(h.category));
    const invested = matching.reduce((s, h) => s + h.buyPrice * h.quantity, 0);
    const currentValue = matching.reduce((s, h) => s + h.currentPrice * h.quantity, 0);
    const returnVal = currentValue - invested;
    const returnPct = invested > 0 ? (returnVal / invested) * 100 : 0;
    return {
      count: matching.length,
      invested,
      currentValue,
      returnVal,
      returnPct,
      matching
    };
  };

  const stocksStats = getCatStats(['Stocks']);
  const sipsStats = getCatStats(['Mutual Funds', 'SIPs']);
  const bondsStats = getCatStats(['Bonds']);
  const fdsStats = getCatStats(['FDs']);

  const grandTotal =
    stocksStats.currentValue +
    sipsStats.currentValue +
    bondsStats.currentValue +
    fdsStats.currentValue;

  const getWeight = (val: number) => (grandTotal > 0 ? (val / grandTotal) * 100 : 0);

  // Active Monthly SIP amount total:
  const monthlySip = sipsStats.matching.reduce((sum, h) => {
    return sum + (h.mutualFundMetrics?.sipActive ? h.mutualFundMetrics.sipAmount || 0 : 0);
  }, 0);

  // Average Bond YTM:
  const avgBondYtm =
    bondsStats.matching.length > 0
      ? bondsStats.matching.reduce(
          (sum, h) => sum + (h.bondMetrics?.yieldToMaturity || 7.2),
          0
        ) / bondsStats.matching.length
      : 7.2;

  // Average FD Rate:
  const avgFdRate =
    fdsStats.matching.length > 0
      ? fdsStats.matching.reduce(
          (sum, h) => sum + (h.fdMetrics?.interestRate || 6.5),
          0
        ) / fdsStats.matching.length
      : 6.5;

  return (
    <div className="asset-category-grid">
      {/* 1. Stocks Card */}
      <div
        className={`asset-cat-card cat-stocks ${
          selectedCategory === 'Stocks' ? 'active' : ''
        }`}
        onClick={() =>
          onSelectCategory(selectedCategory === 'Stocks' ? 'All' : 'Stocks')
        }
      >
        <div className="asset-cat-top">
          <div className="asset-cat-icon-badge">
            <LineChart size={22} />
          </div>
          <span className="badge badge-indigo">
            {formatPercent(getWeight(stocksStats.currentValue), 1)} Portfolio
          </span>
        </div>

        <div className="asset-cat-title">Stocks (Equities)</div>
        <div className="asset-cat-sub">
          {stocksStats.count} holding{stocksStats.count === 1 ? '' : 's'} • Direct Equities
        </div>

        <div className="asset-cat-val">{mask(formatINR(stocksStats.currentValue))}</div>

        <div className="asset-cat-meta-row">
          <span>Invested: {mask(formatINRCompact(stocksStats.invested))}</span>
          <span
            style={{
              color: stocksStats.returnPct >= 0 ? '#900dc8' : '#6b677f',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 3
            }}
          >
            <ArrowUpRight size={13} />
            {mask(formatPctChange(stocksStats.returnPct))}
          </span>
        </div>
      </div>

      {/* 2. SIPs & Mutual Funds Card */}
      <div
        className={`asset-cat-card cat-sips ${
          selectedCategory === 'Mutual Funds' || selectedCategory === 'SIPs' ? 'active' : ''
        }`}
        onClick={() =>
          onSelectCategory(
            selectedCategory === 'Mutual Funds' || selectedCategory === 'SIPs'
              ? 'All'
              : 'Mutual Funds'
          )
        }
      >
        <div className="asset-cat-top">
          <div className="asset-cat-icon-badge">
            <Repeat size={22} />
          </div>
          <span className="badge badge-emerald">
            {formatPercent(getWeight(sipsStats.currentValue), 1)} Portfolio
          </span>
        </div>

        <div className="asset-cat-title">SIPs & Mutual Funds</div>
        <div className="asset-cat-sub">
          {sipsStats.count} active fund{sipsStats.count === 1 ? '' : 's'} • Monthly auto-invest
        </div>

        <div className="asset-cat-val">{mask(formatINR(sipsStats.currentValue))}</div>

        <div className="asset-cat-meta-row">
          <span>Monthly SIP: <strong style={{ color: '#900dc8' }}>{mask(formatINR(monthlySip))}</strong></span>
          <span
            style={{
              color: sipsStats.returnPct >= 0 ? '#900dc8' : '#6b677f',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 3
            }}
          >
            <ArrowUpRight size={13} />
            {mask(formatPctChange(sipsStats.returnPct))}
          </span>
        </div>
      </div>

      {/* 3. Bonds Card */}
      <div
        className={`asset-cat-card cat-bonds ${
          selectedCategory === 'Bonds' ? 'active' : ''
        }`}
        onClick={() =>
          onSelectCategory(selectedCategory === 'Bonds' ? 'All' : 'Bonds')
        }
      >
        <div className="asset-cat-top">
          <div className="asset-cat-icon-badge">
            <ShieldAlert size={22} />
          </div>
          <span className="badge badge-cyan">
            {formatPercent(getWeight(bondsStats.currentValue), 1)} Portfolio
          </span>
        </div>

        <div className="asset-cat-title">Bonds & Sovereign Debt</div>
        <div className="asset-cat-sub">
          {bondsStats.count} instrument{bondsStats.count === 1 ? '' : 's'} • Fixed yield
        </div>

        <div className="asset-cat-val">{mask(formatINR(bondsStats.currentValue))}</div>

        <div className="asset-cat-meta-row">
          <span>Avg Yield (YTM): <strong style={{ color: '#910cca' }}>{avgBondYtm.toFixed(2)}%</strong></span>
          <span
            style={{
              color: bondsStats.returnPct >= 0 ? '#900dc8' : '#6b677f',
              fontWeight: 700
            }}
          >
            {mask(formatPctChange(bondsStats.returnPct))}
          </span>
        </div>
      </div>

      {/* 4. Fixed Deposits (FD) Card */}
      <div
        className={`asset-cat-card cat-fds ${
          selectedCategory === 'FDs' ? 'active' : ''
        }`}
        onClick={() =>
          onSelectCategory(selectedCategory === 'FDs' ? 'All' : 'FDs')
        }
      >
        <div className="asset-cat-top">
          <div className="asset-cat-icon-badge">
            <Building2 size={22} />
          </div>
          <span className="badge badge-amber">
            {formatPercent(getWeight(fdsStats.currentValue), 1)} Portfolio
          </span>
        </div>

        <div className="asset-cat-title">Fixed Deposits (FD)</div>
        <div className="asset-cat-sub">
          {fdsStats.count} deposit{fdsStats.count === 1 ? '' : 's'} • Guaranteed capital
        </div>

        <div className="asset-cat-val">{mask(formatINR(fdsStats.currentValue))}</div>

        <div className="asset-cat-meta-row">
          <span>Avg Interest: <strong style={{ color: '#9305d0' }}>{avgFdRate.toFixed(1)}% p.a.</strong></span>
          <span style={{ color: '#900dc8', fontWeight: 700 }}>
            {mask(formatPctChange(fdsStats.returnPct))}
          </span>
        </div>
      </div>
    </div>
  );
}
