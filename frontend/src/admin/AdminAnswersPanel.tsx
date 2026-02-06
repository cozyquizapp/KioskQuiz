import { AnswerEntry, Team } from '@shared/quizTypes';

interface AdminAnswersPanelProps {
  answers: Record<string, AnswerEntry>;
  teams: Record<string, Team>;
  solution?: string;
  onResolveEstimate: () => void;
  onResolveGeneric: () => void;
  onOverride: (teamId: string, isCorrect: boolean) => void;
}

// Live-Panel für Antworten: auto-refresh durch Socket, keine manuelle Ladetaste mehr
const AdminAnswersPanel = ({
  answers,
  teams,
  solution,
  onResolveEstimate,
  onResolveGeneric,
  onOverride
}: AdminAnswersPanelProps) => {
  return (
    <div>
      <h3 style={{ marginTop: 0, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Team-Antworten (live)</h3>
      
      {solution && (
        <div style={{ 
          padding: '8px 10px', 
          marginBottom: 10, 
          borderRadius: 12, 
          background: 'rgba(34,197,94,0.18)', 
          border: '1px solid rgba(34,197,94,0.45)',
          fontSize: 13,
          color: 'var(--ui-input-text)'
        }}>
          <strong style={{ color: 'var(--success)' }}>Lösung:</strong> {solution}
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {Object.entries(answers).map(([teamId, entry]) => {
          const isCorrect = entry.isCorrect;
          return (
            <div key={teamId} style={answerItem}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--ui-input-text)' }}>
                  <strong>{teams[teamId]?.name ?? 'Team'}</strong>: {String(entry.value)}
                </div>
                {isCorrect === true && <span style={{ color: 'var(--success)', fontSize: 16 }}>✔️</span>}
                {isCorrect === false && <span style={{ color: 'var(--danger)', fontSize: 16 }}>✖️</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button style={miniButton} onClick={() => onOverride(teamId, true)}>
                  ✓ Richtig
                </button>
                <button style={miniButton} onClick={() => onOverride(teamId, false)}>
                  ✗ Falsch
                </button>
              </div>
            </div>
          );
        })}
        {Object.keys(answers).length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Noch keine Antworten eingetroffen.</p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={successButton} onClick={onResolveEstimate}>
          Schätzfrage auswerten
        </button>
        <button style={primaryButton} onClick={onResolveGeneric}>
          Frage auswerten (Mechanik)
        </button>
      </div>
    </div>
  );
};

const answerItem: React.CSSProperties = {
  background: 'var(--ui-input-bg)',
  padding: '8px 10px',
  borderRadius: 12,
  border: '1px solid var(--ui-input-border)'
};

const miniButton: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid var(--ui-panel-border)',
  color: 'var(--ui-input-text)',
  padding: '6px 10px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600
};

const successButton: React.CSSProperties = {
  background: 'var(--ui-button-success)',
  color: 'var(--ui-button-on-light)',
  border: '1px solid rgba(34, 197, 94, 0.5)',
  padding: '10px 14px',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13
};

const primaryButton: React.CSSProperties = {
  background: 'var(--ui-button-primary)',
  color: 'var(--ui-button-on-light)',
  border: '1px solid rgba(99, 229, 255, 0.45)',
  padding: '10px 14px',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13
};

export default AdminAnswersPanel;
