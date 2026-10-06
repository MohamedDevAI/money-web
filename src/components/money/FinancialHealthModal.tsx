import {
  X,
  ShieldCheck,
  CheckCircle2,
  Circle,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { HealthPillar, FinancialHealthResult } from '../../services/financialHealthService';

interface FinancialHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  healthResult: FinancialHealthResult;
  onTogglePillar: (pillarId: string, newState: boolean) => void;
}

export default function FinancialHealthModal({
  isOpen,
  onClose,
  healthResult,
  onTogglePillar
}: FinancialHealthModalProps) {
  if (!isOpen) return null;

  const { totalScore, maxScore, tier: _tier, pillars } = healthResult;

  const handleToggle = (pillar: HealthPillar) => {
    const newState = !pillar.isFulfilled;
    if (newState) {
      // Fire celebration confetti!
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {
        // ignore in non-browser env
      }
    }
    onTogglePillar(pillar.id, newState);
  };

  return (
    <div className="investment-modal-overlay" onClick={onClose}>
      <div
        className="investment-modal-content"
        style={{ maxWidth: 720 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(168, 85, 247, 0.2)',
                color: '#c084fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                  Financial Health Diagnostic
                </h2>
                <span className="badge badge-purple" style={{ fontWeight: 800 }}>
                  {totalScore} / {maxScore} Pts
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#c4b5fd', marginTop: 2 }}>
                Answer or check off gaps below to dynamically increase your score.
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

        {/* Pillars List */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
          {pillars.map((pillar) => (
            <div
              key={pillar.id}
              className={`diagnostic-pillar-card ${pillar.isFulfilled ? 'fulfilled' : ''}`}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: 'rgba(168, 85, 247, 0.2)',
                      color: '#c084fc'
                    }}
                  >
                    {pillar.category}
                  </span>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff' }}>
                    {pillar.title}
                  </h4>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: pillar.isFulfilled ? '#34d399' : '#c084fc',
                      marginLeft: 'auto'
                    }}
                  >
                    {pillar.isFulfilled ? `+${pillar.maxPoints} pts Earned` : `+${pillar.maxPoints} pts Available`}
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#f8fafc', marginBottom: 6, lineHeight: 1.45 }}>
                  {pillar.question}
                </p>

                <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginBottom: 6 }}>
                  <strong style={{ color: '#c4b5fd' }}>Why it matters: </strong>
                  {pillar.whyItMatters}
                </div>

                {pillar.details && (
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: pillar.isFulfilled ? '#34d399' : '#fbbf24',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {pillar.isFulfilled ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    <span>{pillar.details}</span>
                  </div>
                )}
              </div>

              {/* Action Toggle Button */}
              <button
                type="button"
                onClick={() => handleToggle(pillar)}
                className={`pillar-action-toggle ${pillar.isFulfilled ? 'done' : ''}`}
                title={pillar.isFulfilled ? 'Click to uncheck' : 'Click to fill gap and earn points'}
              >
                {pillar.isFulfilled ? (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Completed</span>
                  </>
                ) : (
                  <>
                    <Circle size={15} />
                    <span>Fill Gap (+{pillar.maxPoints})</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid rgba(168, 85, 247, 0.2)'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#a78bfa' }}>
            Score updates live and saves to your local profile.
          </div>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{
              padding: '8px 22px',
              background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
              color: '#ffffff',
              fontWeight: 800,
              border: 'none',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
