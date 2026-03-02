import React from 'react';
import StatusDot from './StatusDot';
import { AnswersState } from './types';
import { AnyQuestion } from '@shared/quizTypes';

type AnswerListProps = {
  answers: AnswersState | null;
  answersCount: number;
  teamsCount: number;
  unreviewedCount: number;
  question?: AnyQuestion | null;
  statChip: React.CSSProperties;
  inputStyle: React.CSSProperties;
  onOverride: (teamId: string, isCorrect: boolean) => void;
  onKickTeam?: (teamId: string) => void;
};

const formatAnswerValue = (ans: any, question?: AnyQuestion | null) => {
  const value = ans?.answer ?? ans?.value;
  if (!value && value !== 0) return '';
  if (question?.mechanic === 'multipleChoice') {
    const options = (question as any)?.options ?? [];
    const index = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(index) && options[index] !== undefined) return String(options[index]);
  }
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
    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
      Tie ({tie.label}): {tie.primary}{secondary}
      {tie.detail ? ` - ${tie.detail}` : ''}
    </div>
  );
};



const AnswerList: React.FC<AnswerListProps> = ({ answers, answersCount, teamsCount, unreviewedCount, question, statChip, inputStyle, onOverride, onKickTeam }) => (
  <section
    style={{
      marginTop: 12,
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: 14,
      padding: 16,
      boxShadow: '0 2px 0 #e5e7eb',
      overflow: 'hidden'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <strong>Antworten</strong>
      <span style={{ fontSize: 12, color: '#6b7280' }}>
        {answersCount}/{teamsCount} | Offen: {unreviewedCount}
      </span>
      {answers?.solution && (
        <span
          style={{
            ...statChip,
            background: 'rgba(34,197,94,0.1)',
            borderColor: '#bbf7d0',
            color: '#15803d'
          }}
        >
          Lösung: {answers.solution}
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
            border: '1px solid #e5e7eb',
            background: '#ffffff',
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
              {onKickTeam && (
                <button
                  style={{
                    ...inputStyle,
                    background: 'rgba(239,68,68,0.08)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)',
                    width: 'auto',
                    padding: '4px 8px',
                    fontSize: 11,
                    marginLeft: 4
                  }}
                  onClick={() => onKickTeam(teamId)}
                  title="Team entfernen"
                >
                  Kick
                </button>
              )}
            </div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>{formatAnswerValue(ans, question)}</div>
            {(ans as any).awardedPoints !== undefined && (
              <div style={{ fontSize: 12, color: '#b45309', marginTop: 2, fontWeight: 700 }}>
                +{(ans as any).awardedPoints}{' '}
                {(ans as any).awardedDetail ? `(${(ans as any).awardedDetail})` : ''}
              </div>
            )}
            {renderTieBreaker(ans)}
          </div>
          <div
            style={{
              fontSize: 12,
              color: (ans as any).isCorrect === false ? '#ef4444' : (ans as any).isCorrect ? '#15803d' : '#6b7280',
              fontWeight: 700
            }}
          >
            {(ans as any).isCorrect === undefined ? 'Offen' : (ans as any).isCorrect ? 'Richtig' : 'Falsch'}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button
                style={{
                  ...inputStyle,
                  background: 'rgba(34,197,94,0.1)',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
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
                  background: 'rgba(239,68,68,0.08)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.3)',
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
              border: '1px dashed #d1d5db',
              background: '#fafafa',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, color: '#111827' }}>
                <span>{answers?.teams?.[id]?.name ?? 'Team'}</span>
                {onKickTeam && (
                  <button
                    style={{
                      ...inputStyle,
                      background: 'rgba(239,68,68,0.08)',
                      color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.3)',
                      width: 'auto',
                      padding: '4px 8px',
                      fontSize: 11,
                      marginLeft: 4
                    }}
                    onClick={() => onKickTeam(id)}
                    title="Team entfernen"
                  >
                    Kick
                  </button>
                )}
              </div>
              <div style={{ color: '#9ca3af', fontSize: 12 }}>Noch keine Antwort</div>
            </div>
          </div>
        ))}
    </div>
  </section>
);

export default AnswerList;
