/**
 * QQReelsHubPage — Übersichts-/Startseite für alle CozyQuiz-Reels (/reels).
 *
 * 2026-07-06 (Wolf): schneller Zugriff auf alle Nischen-Reels fürs Aufnehmen —
 * gedacht fürs Handy (Wolf tippt eine Karte → Reel-Seite → Reel-Modus → Screen-
 * Record). Keine Marketing-Seite, sondern ein Werkzeug-Hub. Öffentlich, aber
 * unverlinkt (nur wer die URL kennt). Verlinkt die /trailer-Varianten.
 */
import { Link } from 'react-router-dom';

const PINK = '#ec4899';
const NAVY_BG = 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 55%, #0A0E22 100%)';
const DISPLAY = "'Stinger Fit', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif";
const BODY = "'Nunito', 'Inter', system-ui, sans-serif";

type Reel = {
  emoji: string;
  name: string;
  hook: string;         // was auf dem Startframe steht
  accent: string;       // Nischen-Akzentfarbe
  full: string;         // Route voll
  kurz?: string;        // Route kurz (optional)
  use: string;          // Wofür / Zielgruppe
};

const REELS: Reel[] = [
  {
    emoji: '✨', name: 'Allgemein', hook: '„Pub-Quiz trifft Strategiespiel"',
    accent: '#ec4899', full: '/trailer', use: 'Der Allrounder — für Bio-Link & wenn jemand fragt „was ist das?"',
  },
  {
    emoji: '🏢', name: 'Teamevent / Firmen', hook: '„Bevor ihr WIEDER bowlen geht…"',
    accent: '#266FD3', full: '/trailer/team', kurz: '/trailer/team-kurz',
    use: 'Team-Leads, HR, Kollegen. Abteilung vs. Abteilung.',
  },
  {
    emoji: '🍺', name: 'Location / Gastro', hook: '„Dienstag. 19 Uhr. Leer?"',
    accent: '#A21247', full: '/trailer/location', kurz: '/trailer/location-kurz',
    use: 'Café-, Pub- & Bar-Besitzer. Volle Bude an ruhigen Tagen.',
  },
  {
    emoji: '🎂', name: 'Geburtstag / Privat', hook: '„Runder Geburtstag?"',
    accent: '#f472b6', full: '/trailer/geburtstag', kurz: '/trailer/geburtstag-kurz',
    use: 'Private Feiern. Personalisierte Fragen übers Geburtstagskind.',
  },
];

export default function QQReelsHubPage() {
  return (
    <div style={{
      minHeight: '100vh', background: NAVY_BG, color: '#fff', fontFamily: BODY,
      padding: '28px 16px 64px', display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Kopf */}
        <header style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <img src="/avatars/cozywolf/head.png" alt="CozyWolf" style={{ width: 64, height: 64, objectFit: 'contain', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))' }} />
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            CozyQuiz · Reels
          </div>
          <div style={{ color: '#a9a6c4', fontSize: 14.5, fontWeight: 700, maxWidth: 420, lineHeight: 1.45 }}>
            Alle Werbe-Reels auf einen Blick. Karte tippen → im <b style={{ color: '#d7d4ea' }}>Reel-Modus</b> öffnen → am Handy mit der Bildschirmaufnahme abfilmen.
          </div>
        </header>

        {/* Reel-Karten */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {REELS.map(r => (
            <div key={r.name} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 18, padding: '16px 16px 14px', position: 'relative', overflow: 'hidden',
            }}>
              {/* Akzent-Kante */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: r.accent }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 13, flexShrink: 0, display: 'grid', placeItems: 'center',
                  fontSize: 26, background: `${r.accent}22`, border: `1.5px solid ${r.accent}55`,
                }}>{r.emoji}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, lineHeight: 1.1 }}>{r.name}</div>
                  <div style={{ color: r.accent === '#A21247' ? '#f472b6' : r.accent, fontWeight: 800, fontSize: 13.5, marginTop: 1 }}>{r.hook}</div>
                </div>
              </div>
              <div style={{ color: '#b6b3d0', fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 12 }}>
                {r.use}
              </div>
              <div style={{ display: 'flex', gap: 9 }}>
                <Link to={r.full} style={{
                  flex: 1, textAlign: 'center', textDecoration: 'none', fontFamily: BODY, fontWeight: 800, fontSize: 14.5,
                  padding: '11px 12px', borderRadius: 11, background: PINK, color: '#fff',
                  boxShadow: '0 6px 18px rgba(236,72,153,0.35)',
                }}>▶ Voll ansehen</Link>
                {r.kurz && (
                  <Link to={r.kurz} style={{
                    flex: 1, textAlign: 'center', textDecoration: 'none', fontFamily: BODY, fontWeight: 800, fontSize: 14.5,
                    padding: '11px 12px', borderRadius: 11, background: 'rgba(255,255,255,0.10)',
                    border: '1px solid rgba(255,255,255,0.16)', color: '#fff',
                  }}>⚡ Kurz (~13s)</Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Fuß-Tipp */}
        <div style={{
          background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.20)',
          borderRadius: 14, padding: '13px 16px', fontSize: 13, fontWeight: 700, color: '#e7cfe0', lineHeight: 1.5,
        }}>
          💡 <b>Kurz</b> = für TikTok-Reichweite (Hook zuerst, schneller Payoff). <b>Voll</b> = für Bio-Link & Website.
          Jeder Reel hat einen anderen Startframe, damit TikTok sie nicht als Werbung einstuft.
        </div>

        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <Link to="/about" style={{ color: '#8a86a0', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
            → Zur Über-CozyQuiz-Seite (/about)
          </Link>
        </div>
      </div>
    </div>
  );
}
