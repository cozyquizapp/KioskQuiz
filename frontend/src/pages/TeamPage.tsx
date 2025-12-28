import React, { useState } from 'react';
import TeamView from '../views/TeamView';

class ErrorCatcher extends React.Component<{ onError: (err: Error) => void; children: React.ReactNode }> {
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    return this.props.children;
  }
}

// einfacher Error Boundary für TeamView
const TeamBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [error, setError] = useState<Error | null>(null);
  if (error) {
    return (
      <div style={{ padding: 20, color: '#e2e8f0', background: '#0b0d14', minHeight: '100vh' }}>
        <h2>Etwas ist schiefgelaufen.</h2>
        <p>{error.message}</p>
        <button
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.08)',
            color: '#e2e8f0',
            cursor: 'pointer'
          }}
          onClick={() => window.location.reload()}
        >
          Neu laden
        </button>
      </div>
    );
  }
  return (
    <ErrorCatcher onError={setError}>
      {children}
    </ErrorCatcher>
  );
};

// Team-Seite: erlaubt freie Roomcodes (Legacy MAIN nur fallback)
const TeamPage = () => {
  const params = new URLSearchParams(window.location.search);
  const legacyRoom = import.meta.env.VITE_LEGACY_ROOMCODE || ''; // TODO(LEGACY): nur für dev-shortcuts
  const initial =
    params.get('roomCode') ||
    localStorage.getItem('teamRoomCode') ||
    legacyRoom ||
    '';
  const [roomCode, setRoomCode] = useState(initial.toUpperCase());
  const [input, setInput] = useState('');

  const attach = () => {
    const clean = (input || '').trim().toUpperCase();
    if (!clean) return;
    setRoomCode(clean);
    localStorage.setItem('teamRoomCode', clean);
  };

  if (!roomCode) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0d14', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 360, padding: 20 }}>
          {/* TODO(DESIGN_LATER): Replace with branded join screen */}
          <h2 style={{ marginBottom: 12 }}>Roomcode eingeben</h2>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="CODE"
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: '#f8fafc',
              letterSpacing: '0.2em',
              textTransform: 'uppercase'
            }}
          />
          <button
            onClick={attach}
            style={{
              marginTop: 10,
              width: '100%',
              padding: 12,
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #63e5ff, #60a5fa)',
              color: '#0b1020',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Beitreten
          </button>
        </div>
      </div>
    );
  }

  return (
    <TeamBoundary>
      <TeamView roomCode={roomCode} />
    </TeamBoundary>
  );
};

export default TeamPage;
