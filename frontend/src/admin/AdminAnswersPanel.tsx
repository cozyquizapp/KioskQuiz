import { AnswerEntry, Team } from '@shared/quizTypes';
import { theme } from '../theme';

interface AdminAnswersPanelProps {
  answers: Record<string, AnswerEntry>;
  teams: Record<string, Team>;
  onResolveEstimate: () => void;
  onResolveGeneric: () => void;
  onOverride: (teamId: string, isCorrect: boolean) => void;
}

// Live-Panel für Antworten: auto-refresh durch Socket, keine manuelle Ladetaste mehr
const AdminAnswersPanel = ({
  answers,
  teams,
  onResolveEstimate,
  onResolveGeneric,
  onOverride
}: AdminAnswersPanelProps) => {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>Antworten (live)</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {Object.entries(answers).map(([teamId, entry]) => {
          const isCorrect = entry.isCorrect;
          return (
            <div key={teamId} style={answerItem}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <strong>{teams[teamId]?.name ?? 'Team'}</strong>: {String(entry.value)}
                </div>
                {isCorrect === true && <span style={{ color: '#22c55e' }}>✔️</span>}
                {isCorrect === false && <span style={{ color: '#ef4444' }}>✖️</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button style={miniButton} onClick={() => onOverride(teamId, true)}>
                  Korrigieren (richtig)
                </button>
                <button style={miniButton} onClick={() => onOverride(teamId, false)}>
                  Als falsch markieren
                </button>
              </div>
            </div>
          );
        })}
        {Object.keys(answers).length === 0 && (
          <p style={{ color: 'var(--muted)' }}>Noch keine Antworten eingetroffen.</p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: theme.spacing(1) }}>
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

const panelStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  borderRadius: theme.radius,
  padding: theme.spacing(1),
  border: '1px solid #1f2836'
};

const successButton: React.CSSProperties = {
  background: 'var(--success)',
  color: 'white',
  border: 'none',
  padding: '10px 12px',
  borderRadius: theme.radius,
  cursor: 'pointer'
};

const primaryButton: React.CSSProperties = {
  background: 'var(--accent)',
  color: 'white',
  border: 'none',
  padding: '10px 12px',
  borderRadius: theme.radius,
  cursor: 'pointer'
};

const answerItem: React.CSSProperties = {
  background: 'var(--surface)',
  padding: '8px 10px',
  borderRadius: theme.radius,
  border: '1px solid #2b3444'
};

const miniButton: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid #2b3444',
  color: 'white',
  padding: '6px 8px',
  borderRadius: theme.radius,
  cursor: 'pointer',
  fontSize: 12
};

export default AdminAnswersPanel;
