import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { joinRoom } from '../api';
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
        <div style={{ padding: 20, color: '#e2e8f0', background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font)' }}>
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
  const legacyRoom = import.meta.env.VITE_LEGACY_ROOMCODE || ''; // TODO(LEGACY): dev shortcut only

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
  const [renderCount, setRenderCount] = useState(0);
  const [uiProbe, setUiProbe] = useState({
    hasEl: false,
    children: 0,
    inputHeight: 0,
    rootChildren: 0,
    hasRoot: false,
    rootHasKids: false
  });
  const [hideFallback, setHideFallback] = useState(false);
  const [fallbackName, setFallbackName] = useState('');
  const [fallbackJoinError, setFallbackJoinError] = useState<string | null>(null);
  const [fallbackJoined, setFallbackJoined] = useState(false);
  const [fallbackJoining, setFallbackJoining] = useState(false);

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
    if (typeof window === 'undefined') return undefined;
    const id = window.setTimeout(() => {
      setMountTimedOut(true);
    }, 1500);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let attempts = 0;
    const id = window.setInterval(() => {
      const win = window as unknown as { __TEAMVIEW_RENDERED?: boolean; __TEAMVIEW_RENDER_COUNT?: number };
      const count = Number(win.__TEAMVIEW_RENDER_COUNT || 0);
      setRenderCount(count);
      const el =
        (document.querySelector('[data-team-marker]') as HTMLElement | null) ||
        (document.getElementById('team-root') as HTMLElement | null) ||
        (document.querySelector('[data-team-ui]') as HTMLElement | null);
      const rect = el ? el.getBoundingClientRect() : null;
      const input = el?.querySelector('input') as HTMLElement | null;
      const inputRect = input ? input.getBoundingClientRect() : null;
      const root = document.getElementById('root');
      const rootChildren = root?.children?.length ?? 0;
      const rootHasSize = Boolean(rect && rect.height > 10 && rect.width > 10);
      const rootHasKids = Boolean((el?.children?.length ?? 0) > 0);
      setUiProbe({
        hasEl: Boolean(el),
        children: el?.children?.length ?? 0,
        inputHeight: inputRect ? Math.round(inputRect.height) : 0,
        rootChildren,
        hasRoot: rootHasSize,
        rootHasKids
      });
      if (rootHasSize && rootHasKids) {
        setTeamMounted(true);
      }
      attempts += 1;
      if (attempts >= 10) {
        window.clearInterval(id);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const handleFallbackJoin = async () => {
    if (!roomCode) return;
    const name = fallbackName.trim();
    if (!name) {
      setFallbackJoinError('Bitte Teamnamen eingeben.');
      return;
    }
    try {
      setFallbackJoining(true);
      setFallbackJoinError(null);
      const res = await joinRoom(roomCode, name);
      localStorage.setItem(`team:${roomCode}:name`, res.team.name);
      localStorage.setItem(`team:${roomCode}:id`, res.team.id);
      setFallbackJoined(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Join fehlgeschlagen';
      setFallbackJoinError(message);
    } finally {
      setFallbackJoining(false);
    }
  };

  const showRoomCodeForm = !featureFlags.singleSessionMode && !roomCode;

  return (
    <TeamBoundary>
      <>
        <div style={{ display: 'none' }}>
          TEAM PAGE OK v=2026-01-02b | room={roomCode || '??'} | mounted={String(teamMounted)} | renders={renderCount} | hasEl={String(uiProbe.hasEl)} | children={uiProbe.children} | inputH={uiProbe.inputHeight} | rootKids={uiProbe.rootChildren} | rootSize={String(uiProbe.hasRoot)} | rootKidsGt0={String(uiProbe.rootHasKids)}
        </div>
        {showRoomCodeForm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(2,6,23,0.82)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
          >
            <div
              className="card-tilt"
              style={{
                width: '100%',
                maxWidth: 360,
                padding: 20,
                background: 'rgba(15,23,42,0.6)',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(16px)'
              }}
            >
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
        {!teamMounted && !hideFallback && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              background: 'rgba(2,6,23,0.82)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
          >
            <div
              className="card-tilt"
              style={{
                width: '100%',
                maxWidth: 420,
                padding: 20,
                background: 'rgba(15,23,42,0.6)',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(16px)'
              }}
            >
              <h2 style={{ marginBottom: 8, color: '#e2e8f0' }}>
                {mountTimedOut ? 'Team UI konnte nicht starten' : 'Lade Cozy Quiz ...'}
              </h2>
              <p style={{ color: '#cbd5e1', marginTop: 0 }}>
                {mountTimedOut
                  ? 'Bitte neu laden. Falls es bleibt, sende uns ein Screenshot von /team?debug=1.'
                  : 'Falls es haengt, kannst du unten schon beitreten.'}
              </p>
              <p style={{ color: '#94a3b8', fontSize: 12 }}>
                room={roomCode || '??'} | single={String(featureFlags.singleSessionMode)}
              </p>
              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                <label style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 700 }}>Teamname</label>
                <input
                  value={fallbackName}
                  onChange={(e) => setFallbackName(e.target.value)}
                  placeholder="Teamname"
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#f8fafc'
                  }}
                />
                <button
                  onClick={fallbackJoining ? undefined : handleFallbackJoin}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #63e5ff, #60a5fa)',
                    color: '#0b1020',
                    fontWeight: 800,
                    cursor: fallbackJoining ? 'not-allowed' : 'pointer',
                    opacity: fallbackJoining ? 0.7 : 1
                  }}
                >
                  {fallbackJoining ? 'Verbinde...' : 'Beitreten (Fallback)'}
                </button>
                {fallbackJoinError && (
                  <div style={{ color: '#fca5a5', fontWeight: 700 }}>{fallbackJoinError}</div>
                )}
                {fallbackJoined && (
                  <div style={{ color: '#86efac', fontWeight: 700 }}>
                    Verbunden. Bitte Seite neu laden.
                  </div>
                )}
              </div>
              <button
                onClick={() => setHideFallback(true)}
                style={{
                  marginTop: 8,
                  width: '100%',
                  padding: 10,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#e2e8f0',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                UI anzeigen (Debug)
              </button>
              {mountTimedOut && (
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
              )}
            </div>
          </div>
        )}
        <TeamView roomCode={roomCode || ''} />
      </>
    </TeamBoundary>
  );
};

export default TeamPage;
