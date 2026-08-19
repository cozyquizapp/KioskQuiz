import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { featureFlags } from '../config/features';

const DEFAULT_ROOM_CODE = featureFlags.singleSessionRoomCode || 'MAIN';
const SINGLE_SESSION_MODE = featureFlags.singleSessionMode;

const buildQrUrl = (url: string, size = 400) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;

export default function QrCodePage() {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
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

  async function copyTeamLink() {
    try {
      await navigator.clipboard.writeText(teamUrl);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(circle at 50% -10%, #3a1238 0%, #161126 42%, #090b15 78%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      padding: '32px 24px',
      fontFamily: "'Nunito', system-ui, sans-serif",
    }}>
      <Link to="/menu" style={{
        position: 'absolute', top: 22, left: 24, minHeight: 40, display: 'inline-flex', alignItems: 'center',
        padding: '0 12px', borderRadius: 10, color: '#e2e8f0', textDecoration: 'none', fontSize: 13, fontWeight: 800,
        border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)',
      }}>← Menü</Link>
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <div style={{ color: '#f9a8d4', fontSize: 12, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Spielabend</div>
        <h1 style={{ color: '#f8fafc', fontFamily: "'Fredoka', 'Nunito', system-ui, sans-serif", fontSize: 32, margin: '6px 0 0' }}>Mitspielen verbinden</h1>
        <p style={{ color: '#cbd5e1', margin: '8px 0 0', lineHeight: 1.45 }}>QR-Code scannen oder den Link direkt an die Teams senden.</p>
      </div>
      <div style={{
        background: '#ffffff',
        borderRadius: 22,
        padding: 18,
        boxShadow: '0 16px 36px rgba(0,0,0,0.42), 0 0 0 5px rgba(236,72,153,0.14)',
      }}>
        <img src={qrSrc} alt="QR-Code zum Öffnen der Team-Seite" style={{ width: 'min(68vw, 310px)', height: 'min(68vw, 310px)', display: 'block', borderRadius: 10 }} />
      </div>

      <div style={{ width: 'min(100%, 520px)', textAlign: 'center' }}>
        <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>TEAM-LINK</div>
        <div style={{ color: '#e2e8f0', fontSize: 14, fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
          {displayUrl}
        </div>
        <button type="button" onClick={copyTeamLink} style={{
          minHeight: 44, marginTop: 14, padding: '0 16px', borderRadius: 10, border: '1px solid rgba(249,168,212,0.54)',
          background: 'rgba(236,72,153,0.16)', color: '#fff', cursor: 'pointer', fontWeight: 900, fontSize: 14,
        }}>{copyState === 'copied' ? 'Link kopiert' : 'Team-Link kopieren'}</button>
        <p aria-live="polite" style={{ minHeight: 20, margin: '8px 0 0', color: copyState === 'error' ? '#fca5a5' : '#cbd5e1', fontSize: 12 }}>
          {copyState === 'error' ? 'Kopieren nicht möglich. Bitte den Link manuell weitergeben.' : copyState === 'copied' ? 'Der Link liegt jetzt in der Zwischenablage.' : ''}
        </p>
      </div>
    </div>
  );
}
