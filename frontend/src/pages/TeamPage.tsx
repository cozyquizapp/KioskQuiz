import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import TeamView from '../views/TeamView';
import { featureFlags } from '../config/features';

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

const DEFAULT_ROOM_CODE = featureFlags.singleSessionRoomCode || 'MAIN';

// Team-Seite: erlaubt freie Roomcodes (Legacy MAIN nur fallback)
const TeamPage = () => {
  const location = useLocation();
  const legacyRoom = import.meta.env.VITE_LEGACY_ROOMCODE || ''; // TODO(LEGACY): nur für dev-shortcuts
  const initialRoom = (() => {
    if (featureFlags.singleSessionMode) return DEFAULT_ROOM_CODE;
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get('roomCode');
    if (fromQuery) return fromQuery.toUpperCase();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('teamRoomCode');
      if (stored) return stored.toUpperCase();
    }
    return (legacyRoom || '').toUpperCase();
  })();

  const [roomCode, setRoomCode] = useState(initialRoom);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (featureFlags.singleSessionMode) {
      setRoomCode(DEFAULT_ROOM_CODE);
      if (typeof window !== 'undefined') {
        localStorage.setItem('teamRoomCode', DEFAULT_ROOM_CODE);
      }
      return;
    }
    const queryRoom = new URLSearchParams(location.search).get('roomCode');
    if (!queryRoom) return;
    const normalized = queryRoom.toUpperCase();
    setRoomCode((prev) => (prev === normalized ? prev : normalized));
    if (typeof window !== 'undefined') {
      localStorage.setItem('teamRoomCode', normalized);
    }
  }, [location.search]);

  useEffect(() => {
    if (featureFlags.singleSessionMode && !roomCode) {
      setRoomCode(DEFAULT_ROOM_CODE);
      if (typeof window !== 'undefined') {
        localStorage.setItem('teamRoomCode', DEFAULT_ROOM_CODE);
      }
    }
  }, [roomCode]);

  const attach = () => {
    const clean = (input || '').trim().toUpperCase();
    if (!clean) return;
    setRoomCode(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('teamRoomCode', clean);
    }
  };

  const shouldShowJoinForm = !roomCode && (!featureFlags.singleSessionMode || featureFlags.showLegacyPanels);

  if (shouldShowJoinForm) {
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

  if (!roomCode) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#06070e',
          color: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>Session wird vorbereitet</div>
        <div style={{ fontSize: 14, opacity: 0.75 }}>Bitte kurz warten ...</div>
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
