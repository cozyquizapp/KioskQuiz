import { useState, useEffect } from 'react';
import type { BunteTuetePrecisionStep } from '@shared/quizTypes';
import { matchPrecisionAnswer, type MatchResult } from '@shared/precisionMatcher';

interface TeamAnswer {
  teamId: string;
  teamName: string;
  answer: string;
  timestamp?: number;
}

interface PrecisionReviewProps {
  teamAnswers: TeamAnswer[];
  ladder: BunteTuetePrecisionStep[];
  autoMatchEnabled?: boolean;
  onSubmitScores: (scores: Record<string, { stepIndex: number; points: number }>) => void;
  onClose: () => void;
}

export function PrecisionReviewPanel({
  teamAnswers,
  ladder,
  autoMatchEnabled = true,
  onSubmitScores,
  onClose
}: PrecisionReviewProps) {
  const [matchResults, setMatchResults] = useState<Record<string, MatchResult>>({});
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});

  // Auto-Match beim Laden
  useEffect(() => {
    const results: Record<string, MatchResult> = {};
    for (const team of teamAnswers) {
      results[team.teamId] = matchPrecisionAnswer(team.answer, ladder, autoMatchEnabled);
    }
    setMatchResults(results);
  }, [teamAnswers, ladder, autoMatchEnabled]);

  const handleManualSelect = (teamId: string, stepIndex: number) => {
    setManualOverrides(prev => ({ ...prev, [teamId]: stepIndex }));
  };

  const handleSubmit = () => {
    const scores: Record<string, { stepIndex: number; points: number }> = {};
    
    for (const team of teamAnswers) {
      const manualStep = manualOverrides[team.teamId];
      const autoResult = matchResults[team.teamId];
      
      if (manualStep !== undefined) {
        // Manuell überschrieben
        scores[team.teamId] = {
          stepIndex: manualStep,
          points: ladder[manualStep]?.points || 0
        };
      } else if (autoResult?.matched) {
        // Auto-Match verwenden
        scores[team.teamId] = {
          stepIndex: autoResult.stepIndex,
          points: autoResult.points
        };
      } else {
        // Keine Punkte
        scores[team.teamId] = {
          stepIndex: -1,
          points: 0
        };
      }
    }
    
    onSubmitScores(scores);
  };

  const getStepColor = (stepIndex: number) => {
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
    return colors[stepIndex] || '#64748b';
  };

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
            🎯 Präzision - Bewertung
          </h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        {/* Ladder Reference */}
        <div style={ladderReferenceStyle}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>
            Punktestufen:
          </h3>
          {ladder.map((step, idx) => (
            <div
              key={idx}
              style={{
                ...ladderStepStyle,
                borderColor: getStepColor(idx)
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 14, color: getStepColor(idx) }}>
                  {step.label} ({step.points}pt)
                </strong>
                {step.description && (
                  <span style={{ fontSize: 12, opacity: 0.6 }}>
                    {step.description}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>
                Beispiele: {step.acceptedAnswers.join(', ')}
              </div>
              {step.numericRange && (
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>
                  📊 Bereich: {step.numericRange.min} - {step.numericRange.max}
                </div>
              )}
              {step.examples && step.examples.length > 0 && (
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>
                  💡 Weitere: {step.examples.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Team Answers */}
        <div style={answersContainerStyle}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700 }}>
            Team-Antworten ({teamAnswers.length}):
          </h3>
          
          {teamAnswers.map((team) => {
            const autoResult = matchResults[team.teamId];
            const manualStep = manualOverrides[team.teamId];
            const selectedStep = manualStep !== undefined ? manualStep : autoResult?.stepIndex;
            const isAutoMatched = autoResult?.matched && manualStep === undefined;
            const confidence = autoResult?.confidence || 0;

            return (
              <div key={team.teamId} style={teamCardStyle}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                    {team.teamName}
                  </div>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 600,
                    padding: '8px 12px',
                    background: 'rgba(59,130,246,0.1)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: 8,
                    fontFamily: 'monospace'
                  }}>
                    "{team.answer}"
                  </div>
                  
                  {isAutoMatched && (
                    <div style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: confidence > 0.9 ? '#22c55e' : '#f59e0b',
                      fontWeight: 600
                    }}>
                      {confidence > 0.9 ? '✓' : '⚠️'} Auto-Match: {autoResult.method} 
                      ({Math.round(confidence * 100)}% sicher)
                    </div>
                  )}
                </div>

                {/* Stufen-Auswahl */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ladder.map((step, stepIdx) => (
                    <button
                      key={stepIdx}
                      onClick={() => handleManualSelect(team.teamId, stepIdx)}
                      style={{
                        ...stepButtonStyle,
                        borderColor: getStepColor(stepIdx),
                        background: selectedStep === stepIdx
                          ? `${getStepColor(stepIdx)}30`
                          : 'rgba(30,41,59,0.5)',
                        borderWidth: selectedStep === stepIdx ? 2 : 1,
                        fontWeight: selectedStep === stepIdx ? 700 : 500
                      }}
                    >
                      <span>{step.label}</span>
                      <span style={{ color: getStepColor(stepIdx), fontWeight: 700 }}>
                        {step.points}pt
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => handleManualSelect(team.teamId, -1)}
                    style={{
                      ...stepButtonStyle,
                      borderColor: '#ef4444',
                      background: selectedStep === -1 ? 'rgba(239,68,68,0.2)' : 'rgba(30,41,59,0.5)',
                      borderWidth: selectedStep === -1 ? 2 : 1,
                      fontWeight: selectedStep === -1 ? 700 : 500
                    }}
                  >
                    <span>❌ Keine Punkte</span>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>0pt</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelButtonStyle}>
            Abbrechen
          </button>
          <button onClick={handleSubmit} style={submitButtonStyle}>
            ✓ Punkte vergeben
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  padding: 20
};

const panelStyle: React.CSSProperties = {
  background: '#0f172a',
  borderRadius: 16,
  border: '1px solid rgba(148,163,184,0.2)',
  width: '100%',
  maxWidth: 1200,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  padding: 20,
  borderBottom: '1px solid rgba(148,163,184,0.2)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'rgba(15,23,42,0.8)'
};

const closeButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: '1px solid rgba(248,113,113,0.4)',
  background: 'rgba(248,113,113,0.2)',
  color: '#f87171',
  cursor: 'pointer',
  fontSize: 20,
  fontWeight: 700
};

const ladderReferenceStyle: React.CSSProperties = {
  padding: 20,
  borderBottom: '1px solid rgba(148,163,184,0.2)',
  background: 'rgba(30,41,59,0.3)'
};

const ladderStepStyle: React.CSSProperties = {
  padding: 12,
  background: 'rgba(15,23,42,0.6)',
  border: '2px solid',
  borderRadius: 8,
  marginBottom: 8
};

const answersContainerStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: 20,
  display: 'grid',
  gap: 16
};

const teamCardStyle: React.CSSProperties = {
  padding: 16,
  background: 'rgba(30,41,59,0.6)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 12,
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: 20
};

const stepButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid',
  cursor: 'pointer',
  fontSize: 14,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  transition: 'all 0.2s',
  minWidth: 200
};

const footerStyle: React.CSSProperties = {
  padding: 20,
  borderTop: '1px solid rgba(148,163,184,0.2)',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
  background: 'rgba(15,23,42,0.8)'
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 8,
  border: '1px solid rgba(148,163,184,0.3)',
  background: 'rgba(148,163,184,0.1)',
  color: '#cbd5e1',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 15
};

const submitButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 8,
  border: '1px solid rgba(34,197,94,0.4)',
  background: 'rgba(34,197,94,0.2)',
  color: '#22c55e',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 15
};
