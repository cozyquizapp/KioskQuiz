import React from 'react';
import { Link } from 'react-router-dom';
import { theme } from '../theme';

interface AdminRoomHeaderProps {
  roomCode: string;
  language?: string;
  phase?: string;
  remainingQuestions?: number;
  timerEndsAt?: number | null;
  timerActive?: boolean;
  extraBadges?: string[];
}

const pillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 12px',
  borderRadius: 999,
  border: '1px solid var(--ui-panel-border)',
  background: 'rgba(255,255,255,0.06)',
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontSize: 12
};

// Raum-Code plus Status-Badges
const AdminRoomHeader = ({
  roomCode,
  language,
  phase,
  remainingQuestions,
  timerEndsAt,
  timerActive,
  extraBadges
}: AdminRoomHeaderProps) => {
  const timeLeft =
    timerActive && timerEndsAt
      ? `${Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000))}s`
      : 'kein Timer';

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: theme.spacing(1),
        marginBottom: theme.spacing(2)
      }}
    >
      <div>
        <h1 style={{ margin: 0 }}>Regie-Konsole</h1>
        <p style={{ marginTop: 4, color: 'var(--muted)' }}>
          Fragen steuern, Antworten einsehen, Punkte vergeben.
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ ...pillStyle, background: 'rgba(255,255,255,0.08)' }}>
          <span style={{ color: 'var(--muted)' }}>Raum</span>
          <strong style={{ letterSpacing: 1 }}>{roomCode}</strong>
        </div>
        <Link to="/menu" style={{ textDecoration: 'none' }}>
          <div style={{ ...pillStyle, background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.22)' }}>
            Menu
          </div>
        </Link>
        {phase && <div style={pillStyle}>Phase: {phase}</div>}
        {typeof remainingQuestions === 'number' && <div style={pillStyle}>Rest: {remainingQuestions}</div>}
        {language && <div style={pillStyle}>{language.toUpperCase()}</div>}
        <div style={{ ...pillStyle, background: timerActive ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)' }}>
          Timer: {timeLeft}
        </div>
        {extraBadges?.map((b) => (
          <div key={b} style={pillStyle}>
            {b}
          </div>
        ))}
      </div>
    </header>
  );
};

export default AdminRoomHeader;
