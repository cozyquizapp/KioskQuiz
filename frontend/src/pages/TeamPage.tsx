import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { featureFlags } from '../config/features';

import TeamView from '../views/TeamView';

type BoundaryState = {
  error: Error | null;
  componentStack: string | null;
};

class TeamBoundary extends React.Component<{ children: React.ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null, componentStack: null };

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error, componentStack: info.componentStack });
    console.error('Team UI crashed', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const showStack = import.meta.env.DEV;
      return (
        <div style={{ padding: 20, color: '#e2e8f0', background: '#0b0d14', minHeight: '100vh' }}>
          <h2>UI crashed</h2>
          <p>{this.state.error.message}</p>
          {showStack && (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.8 }}>
              {this.state.error.stack || this.state.componentStack}
            </pre>
          )}
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
    return this.props.children;
  }
}

const DEFAULT_ROOM_CODE = featureFlags.singleSessionRoomCode || 'MAIN';

const TeamPage = () => {
  const location = useLocation();
  const debugMode =
    import.meta.env.DEV ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1');
  const legacyRoom = import.meta.env.VITE_LEGACY_ROOMCODE || ''; // TODO(LEGACY): nur fuer dev-shortcuts

  const initialRoom = useMemo(() => {
    if (featureFlags.singleSessionMode) return DEFAULT_ROOM_CODE;
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get('roomCode');
    if (fromQuery) return fromQuery.toUpperCase();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('teamRoomCode');
      if (stored) return stored.toUpperCase();
    }
    return (legacyRoom || '').toUpperCase();
  }, [location.search]);

  const [roomCode, setRoomCode] = useState(initialRoom);
  const [roomInput, setRoomInput] = useState('');
  const [teamMounted, setTeamMounted] = useState(false);
  const [mountTimedOut, setMountTimedOut] = useState(false);

  useEffect(() => {
    if (featureFlags.singleSessionMode) {
      if (roomCode !== DEFAULT_ROOM_CODE) {
        setRoomCode(DEFAULT_ROOM_CODE);
      }
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
  }, [location.search, roomCode]);

  const attach = () => {
    const clean = (roomInput || '').trim().toUpperCase();
    if (!clean) return;
    setRoomCode(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('teamRoomCode', clean);
    }
  };

  useEffect(() => {
    if (!debugMode) return;
    console.log('[TeamPage]', {
      singleSessionMode: featureFlags.singleSessionMode,
      roomCode,
      search: location.search,
      legacyRoom,
      flags: featureFlags
    });
  }, [debugMode, roomCode, location.search, legacyRoom]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const id = window.setTimeout(() => {
      setMountTimedOut(true);
    }, 1500);
    return () => window.clearTimeout(id);
  }, []);

  const showRoomCodeForm = !featureFlags.singleSessionMode && !roomCode;

  return (
    <TeamBoundary>
      <>
        {showRoomCodeForm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(6,7,14,0.78)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
          >
            <div style={{ width: '100%', maxWidth: 360, padding: 20, background: '#0b0d14', borderRadius: 16 }}>
              {/* TODO(DESIGN_LATER): Replace with branded join screen */}
              <h2 style={{ marginBottom: 12, color: '#e2e8f0' }}>Roomcode eingeben</h2>
              <input
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
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
        )}
        {!teamMounted && mountTimedOut && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              background: 'rgba(6,7,14,0.78)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
          >
            <div style={{ width: '100%', maxWidth: 420, padding: 20, background: '#0b0d14', borderRadius: 16 }}>
              <h2 style={{ marginBottom: 8, color: '#e2e8f0' }}>Team UI konnte nicht starten</h2>
              <p style={{ color: '#cbd5e1', marginTop: 0 }}>
                Bitte neu laden. Falls es bleibt, sende uns ein Screenshot von /team?debug=1.
              </p>
              <p style={{ color: '#94a3b8', fontSize: 12 }}>
                room={roomCode || '—'} · single={String(featureFlags.singleSessionMode)}
              </p>
              <button
                onClick={() => window.location.reload()}
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
                Neu laden
              </button>
            </div>
          </div>
        )}
        <TeamView roomCode={roomCode || ''} onMount={() => setTeamMounted(true)} />
      </>
    </TeamBoundary>
  );
};

export default TeamPage;
