import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import BeamerView from '../views/BeamerView';
import { featureFlags } from '../config/features';

const DEFAULT_ROOM_CODE = featureFlags.singleSessionRoomCode || 'MAIN';

const BeamerPage = () => {
  const { roomCode: paramCode } = useParams<{ roomCode?: string }>();
  const [searchParams] = useSearchParams();
  const legacyRoom = import.meta.env.VITE_LEGACY_ROOMCODE || ''; // TODO(LEGACY): nur für dev shortcuts
  const [roomCode, setRoomCode] = useState<string>(() => {
    if (featureFlags.singleSessionMode) return DEFAULT_ROOM_CODE;
    const initial = searchParams.get('roomCode') || paramCode || legacyRoom || '';
    return initial.toUpperCase();
  });
  const [input, setInput] = useState('');

  useEffect(() => {
    if (featureFlags.singleSessionMode) {
      setRoomCode(DEFAULT_ROOM_CODE);
      return;
    }
    const derived = searchParams.get('roomCode') || paramCode || legacyRoom || '';
    if (!derived) return;
    const normalized = derived.toUpperCase();
    setRoomCode((prev) => (prev === normalized ? prev : normalized));
  }, [paramCode, searchParams, legacyRoom]);

  const shouldShowJoinForm = !roomCode && (!featureFlags.singleSessionMode || featureFlags.showLegacyPanels);

  if (shouldShowJoinForm) {
    return (
      <div style={{ minHeight: '100vh', background: '#05070d', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 420, padding: 20 }}>
          {/* TODO(DESIGN_LATER): nicer Beamer room gate */}
          <h2 style={{ marginBottom: 12 }}>Roomcode für den Beamer eingeben</h2>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="CODE"
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(15,23,42,0.8)',
              color: '#f8fafc',
              letterSpacing: '0.3em',
              textTransform: 'uppercase'
            }}
          />
          <button
            onClick={() => setRoomCode(input.trim().toUpperCase())}
            style={{
              marginTop: 12,
              width: '100%',
              padding: 14,
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #fde68a, #fbbf24)',
              color: '#1f1305',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            Starten
          </button>
        </div>
      </div>
    );
  }

  if (!roomCode) {
    return null;
  }

  return <BeamerView roomCode={roomCode} />;
};

export default BeamerPage;
