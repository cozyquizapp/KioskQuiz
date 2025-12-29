import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminView from '../views/AdminView';
import { featureFlags } from '../config/features';

const DEFAULT_ROOM_CODE = featureFlags.singleSessionRoomCode || 'MAIN';

const AdminPage = () => {
  const location = useLocation();
  const legacyRoom = import.meta.env.VITE_LEGACY_ROOMCODE || ''; // TODO(LEGACY): only for dev shortcuts

  const getInitialRoom = () => {
    if (featureFlags.singleSessionMode) return DEFAULT_ROOM_CODE;
    const params = new URLSearchParams(location.search);
    const stored = typeof window !== 'undefined' ? localStorage.getItem('adminRoomCode') || '' : '';
    const fromQuery = params.get('roomCode');
    const initial = fromQuery || stored || legacyRoom || '';
    return initial.toUpperCase();
  };

  const [roomCode, setRoomCode] = useState<string>(() => getInitialRoom());
  const [input, setInput] = useState('');

  useEffect(() => {
    if (featureFlags.singleSessionMode) {
      setRoomCode(DEFAULT_ROOM_CODE);
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminRoomCode', DEFAULT_ROOM_CODE);
      }
      return;
    }
    const params = new URLSearchParams(location.search);
    const queryRoom = params.get('roomCode');
    if (!queryRoom) return;
    const normalized = queryRoom.toUpperCase();
    setRoomCode((prev) => (prev === normalized ? prev : normalized));
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminRoomCode', normalized);
    }
  }, [location.search]);

  useEffect(() => {
    if (featureFlags.singleSessionMode) return;
    if (!roomCode || typeof window === 'undefined') return;
    localStorage.setItem('adminRoomCode', roomCode);
  }, [roomCode]);

  const shouldShowJoinForm = !roomCode && (!featureFlags.singleSessionMode || featureFlags.showLegacyPanels);

  if (shouldShowJoinForm) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0b0d14',
          color: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ width: '100%', maxWidth: 360, padding: 20 }}>
          {/* TODO(DESIGN_LATER): Admin Join Screen */}
          <h2 style={{ marginBottom: 12 }}>Roomcode für Admin eingeben</h2>
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
              letterSpacing: '0.2em'
            }}
          />
          <button
            onClick={() => setRoomCode(input.trim().toUpperCase())}
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
            Verbinden
          </button>
        </div>
      </div>
    );
  }

  if (!roomCode) {
    return null;
  }

  return <AdminView roomCode={roomCode} />;
};

export default AdminPage;
