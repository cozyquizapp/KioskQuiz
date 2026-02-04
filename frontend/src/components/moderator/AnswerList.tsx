import React from 'react';
import StatusDot from './StatusDot';
import { AnswersState } from './types';

type AnswerListProps = {
  answers: AnswersState | null;
  answersCount: number;
  teamsCount: number;
  unreviewedCount: number;
  statChip: React.CSSProperties;
  inputStyle: React.CSSProperties;
  onOverride: (teamId: string, isCorrect: boolean) => void;
};

const formatAnswerValue = (ans: any) => {
  const value = ans?.answer ?? ans?.value;
  if (!value && value !== 0) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') {
    if (value.kind === 'top5' || value.kind === 'order') {
      return Array.isArray(value.order) ? value.order.join(' -> ') : '';
    }
    if (value.kind === 'precision') return value.text ?? '';
    if (value.kind === 'oneOfEight') return value.choiceId ?? '';
    return JSON.stringify(value);
  }
  return String(value ?? '');
};

const renderTieBreaker = (ans: any) => {
  const tie = ans?.tieBreaker;
  if (!tie || !tie.label) return null;
  const secondary = typeof tie.secondary === 'number' && Number.isFinite(tie.secondary) ? `/${tie.secondary}` : '';
  return (
    <div style={{ fontSize: 11, color: '#cbd5f5', marginTop: 2 }}>
      Tie ({tie.label}): {tie.primary}{secondary}
      {tie.detail ? ` - ${tie.detail}` : ''}
    </div>
  );
};



const AnswerList: React.FC<AnswerListProps> = ({ answers, answersCount, teamsCount, unreviewedCount, statChip, inputStyle, onOverride }) => (
  <section
    style={{
      marginTop: 12,
      background: 'rgba(10,14,24,0.92)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: 16,
      boxShadow: '0 14px 32px rgba(0,0,0,0.32)',
      backdropFilter: 'blur(10px)',
      overflow: 'hidden'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <strong>Antworten</strong>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
        {answersCount}/{teamsCount} | Offen: {unreviewedCount}
      </span>
      {answers?.solution && (
        <span
          style={{
            ...statChip,
            background: 'rgba(34,197,94,0.12)',
            borderColor: 'rgba(34,197,94,0.35)',
            color: '#86efac'
          }}
        >
          Loesung: {answers.solution}
        </span>
      )}
    </div>
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(answers?.answers || {}).map(([teamId, ans]) => (
        <div
          key={teamId}
          style={{
            padding: 10,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 10,
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusDot
                filled={Boolean(answers?.teams?.[teamId]?.isReady)}
                tooltip={answers?.teams?.[teamId]?.isReady ? 'Angemeldet' : 'Nicht angemeldet'}
              />
              <span>{answers?.teams?.[teamId]?.name ?? 'Team'}</span>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{formatAnswerValue(ans)}</div>
            {(ans as any).awardedPoints !== undefined && (
              <div style={{ fontSize: 12, color: '#facc15', marginTop: 2, fontWeight: 700 }}>
                +{(ans as any).awardedPoints}{' '}
                {(ans as any).awardedDetail ? `(${(ans as any).awardedDetail})` : ''}
              </div>
            )}
            {renderTieBreaker(ans)}
          </div>
          <div
            style={{
              fontSize: 12,
              color: (ans as any).isCorrect === false ? '#ef4444' : (ans as any).isCorrect ? '#22c55e' : '#94a3b8',
              fontWeight: 700
            }}
          >
            {(ans as any).isCorrect === undefined ? 'Offen' : (ans as any).isCorrect ? 'Richtig' : 'Falsch'}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button
                style={{
                  ...inputStyle,
                  background: 'rgba(34,197,94,0.16)',
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.4)',
                  padding: '6px 10px',
                  width: 'auto',
                  minWidth: 52,
                  boxShadow: 'none'
                }}
                onClick={() => onOverride(teamId, true)}
              >
                OK
              </button>
              <button
                style={{
                  ...inputStyle,
                  background: 'rgba(239,68,68,0.16)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.4)',
                  padding: '6px 10px',
                  width: 'auto',
                  minWidth: 52,
                  boxShadow: 'none'
                }}
                onClick={() => onOverride(teamId, false)}
              >
                X
              </button>
            </div>
          </div>
        </div>
      ))}
      {Object.keys(answers?.teams || {})
        .filter((id) => !answers?.answers?.[id])
        .map((id) => (
          <div
            key={id}
            style={{
              padding: 10,
              borderRadius: 12,
              border: '1px dashed rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)'
            }}
          >
            <div style={{ fontWeight: 800 }}>{answers?.teams?.[id]?.name ?? 'Team'}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Noch keine Antwort</div>
          </div>
        ))}
    </div>
  </section>
);

export default AnswerList;
