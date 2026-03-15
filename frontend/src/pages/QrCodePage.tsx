import { useMemo } from 'react';
import { featureFlags } from '../config/features';

const DEFAULT_ROOM_CODE = featureFlags.singleSessionRoomCode || 'MAIN';
const SINGLE_SESSION_MODE = featureFlags.singleSessionMode;

const buildQrUrl = (url: string, size = 400) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;

export default function QrCodePage() {
  const roomCode = useMemo(() => {
    if (SINGLE_SESSION_MODE) return DEFAULT_ROOM_CODE;
    const params = new URLSearchParams(window.location.search);
    return params.get('roomCode') || localStorage.getItem('moderatorRoom') || DEFAULT_ROOM_CODE;
  }, []);

  const teamUrl = useMemo(() => {
    const origin = window.location.origin.replace(/\/$/, '');
    return SINGLE_SESSION_MODE ? `${origin}/team` : `${origin}/team?roomCode=${roomCode}`;
  }, [roomCode]);

  const qrSrc = buildQrUrl(teamUrl, 600);
  const displayUrl = teamUrl.replace(/^https?:\/\//i, '');

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0d1117',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      padding: 32,
      fontFamily: "'Nunito', system-ui, sans-serif",
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 24,
        padding: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <img src={qrSrc} alt="Team QR Code" style={{ width: 300, height: 300, display: 'block', borderRadius: 8 }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Jetzt mitspielen
        </div>
        <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 6, fontFamily: 'monospace' }}>
          {displayUrl}
        </div>
      </div>
    </div>
  );
}
