import {
  ShieldCheck,
  AlertTriangle,
  Award,
  ChevronRight,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import type { FinancialHealthResult } from '../../services/financialHealthService';

interface FinancialHealthCardProps {
  healthResult: FinancialHealthResult;
  onOpenDiagnostic: () => void;
}

export default function FinancialHealthCard({
  healthResult,
  onOpenDiagnostic
}: FinancialHealthCardProps) {
  const { totalScore, maxScore, tier, tierDescription, achievedCount, gapsCount, nextBestAction } = healthResult;

  const getTierClass = () => {
    if (totalScore >= 85) return 'elite';
    if (totalScore >= 70) return 'strong';
    if (totalScore >= 50) return 'stable';
    return 'risk';
  };

  const getRingColor = () => {
    if (totalScore >= 85) return '#c084fc';
    if (totalScore >= 70) return '#a855f7';
    if (totalScore >= 50) return '#8b5cf6';
    return '#fb7185';
  };

  return (
    <div className="health-card-root">
      {/* Header */}
      <div className="health-card-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={19} color={getRingColor()} />
            <h3 className="health-card-title">
              Financial Health Score
            </h3>
          </div>
          <p className="health-card-subtitle">
            Diagnostic audit across 6 safety, debt, and wealth pillars
          </p>
        </div>

        <button
          onClick={onOpenDiagnostic}
          className="btn-glass health-audit-btn"
          title="Open complete diagnostic assessment"
        >
          <HelpCircle size={13} />
          <span>Audit Questions</span>
        </button>
      </div>

      {/* Center Score Row */}
      <div className="health-score-center">
        <div
          className="score-radial-wrap"
          style={{
            borderColor: getRingColor(),
            boxShadow: `0 0 25px ${getRingColor()}40`
          }}
        >
          <span className="score-number" style={{ color: getRingColor() }}>
            {totalScore}
          </span>
          <span className="score-total-denom">/ {maxScore}</span>
        </div>

        <div style={{ flex: 1 }}>
          <div className={`health-tier-badge ${getTierClass()}`}>
            <Award size={13} />
            <span>{tier}</span>
          </div>
          <div className="health-tier-desc">
            {tierDescription}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: '0.78rem' }}>
            <span style={{ color: '#34d399', fontWeight: 700 }}>
              ✓ {achievedCount} Pillars Secured
            </span>
            {gapsCount > 0 && (
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                ⚠️ {gapsCount} Open Gap{gapsCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Next Best Action / Gap Banner */}
      <div className="health-gap-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div
            className="gap-banner-icon-box"
            style={{
              background: gapsCount > 0 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(168, 85, 247, 0.15)',
              color: gapsCount > 0 ? '#fbbf24' : '#c084fc',
            }}
          >
            {gapsCount > 0 ? <AlertTriangle size={16} /> : <Sparkles size={16} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', color: '#a78bfa', textTransform: 'uppercase', fontWeight: 700 }}>
              {gapsCount > 0 ? 'Priority Gap to Fill' : 'Status'}
            </div>
            <div className="gap-action-text">
              {nextBestAction}
            </div>
          </div>
        </div>

        <button
          onClick={onOpenDiagnostic}
          className="btn-primary gap-action-btn"
        >
          <span>{gapsCount > 0 ? 'Fill Gaps' : 'Review'}</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
