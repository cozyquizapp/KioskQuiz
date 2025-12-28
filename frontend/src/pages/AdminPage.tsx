import { useEffect, useState } from 'react';
import AdminView from '../views/AdminView';

const AdminPage = () => {
  const params = new URLSearchParams(window.location.search);
  const legacyRoom = import.meta.env.VITE_LEGACY_ROOMCODE || ''; // TODO(LEGACY): nur für dev
  const stored = localStorage.getItem('adminRoomCode') || '';
  const [roomCode, setRoomCode] = useState<string>(() => {
    const initial = params.get('roomCode') || stored || legacyRoom || '';
    return initial.toUpperCase();
  });
  const [input, setInput] = useState('');

  useEffect(() => {
    if (roomCode) {
      localStorage.setItem('adminRoomCode', roomCode);
    }
  }, [roomCode]);

  if (!roomCode) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0d14', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

  return <AdminView roomCode={roomCode} />;
};

export default AdminPage;
