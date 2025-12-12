import React from 'react';

type LeaderboardRun = { quizId: string; date: string; winners: string[]; scores?: Record<string, number> };

const panelStyle: React.CSSProperties = {
  background: 'rgba(12,16,26,0.82)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 14,
  padding: 10,
  boxShadow: '0 12px 26px rgba(0,0,0,0.28)',
  backdropFilter: 'blur(10px)'
};

const LeaderboardPanel: React.FC<{ runs: LeaderboardRun[] }> = ({ runs }) => {
  if (!runs || runs.length === 0) {
    return (
      <div style={panelStyle}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Letzte Runs</div>
        <div style={{ color: '#94a3b8', fontSize: 13 }}>Keine Einträge</div>
      </div>
    );
  }
  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>Letzte Runs</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflow: 'auto' }}>
        {runs.slice(0, 5).map((run, idx) => (
          <div
            key={idx}
            style={{
              padding: 8,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)'
            }}
            title={`${new Date(run.date).toLocaleString()}`}
          >
            <div style={{ fontWeight: 700, fontSize: 13 }}>{run.quizId}</div>
            <div style={{ color: '#cbd5e1', fontSize: 12 }}>{run.winners?.join(', ') || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardPanel;
