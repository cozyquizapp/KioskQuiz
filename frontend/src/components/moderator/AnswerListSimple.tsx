import React from 'react';
import StatusDot from './StatusDot';

type AnswerListSimpleProps = {
  answers: Record<string, { answer: unknown }> | null;
  teams: Record<string, { name: string; isReady?: boolean }> | null;
  statChip: React.CSSProperties;
  inputStyle: React.CSSProperties;
};

const AnswerListSimple: React.FC<AnswerListSimpleProps> = ({ answers, teams, statChip, inputStyle }) => {
  const answersCount = Object.keys(answers || {}).length;
  const teamsCount = Object.keys(teams || {}).length;
  return (
    <section
      style={{
        marginTop: 12,
        background: 'linear-gradient(145deg, rgba(15,18,28,0.95), rgba(16,18,28,0.82))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 14,
        boxShadow: '0 12px 28px rgba(0,0,0,0.35)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <strong>Antworten</strong>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {answersCount}/{teamsCount}
        </span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {Object.entries(answers || {}).map(([teamId, ans]) => (
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
                <StatusDot filled={Boolean(teams?.[teamId]?.isReady)} tooltip={teams?.[teamId]?.isReady ? 'Angemeldet' : 'Nicht angemeldet'} />
                <span>{teams?.[teamId]?.name ?? 'Team'}</span>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>{String(ans.answer ?? '')}</div>
            </div>
            <span style={{ ...statChip, background: 'rgba(255,255,255,0.04)' }}>Erfasst</span>
          </div>
        ))}
        {Object.keys(teams || {})
          .filter((id) => !answers?.[id])
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
              <div style={{ fontWeight: 800 }}>{teams?.[id]?.name ?? 'Team'}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>Noch keine Antwort</div>
            </div>
          ))}
      </div>
    </section>
  );
};

export default AnswerListSimple;
