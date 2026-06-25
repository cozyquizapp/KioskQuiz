// QQBlinkTestPage — Testseite (2026-06-25, Wolf): Blinzeln per GEZEICHNETEM Lid.
// Der geschlossene Frame (<slug>-blink.png) wird aus dem offenen Bild erzeugt
// (scripts/generate-cozy3d-blink.mjs): lokale Fellfarbe übers Auge + schwarze
// ‿-Linie. Garantiert deckungsgleich (kein zweites, schiefes Bild).
// Diese Seite zeigt die 4 Test-Tiere: offen | zu | live-blinzeln.
import { useState } from 'react';
import { cozy3dSrc, cozy3dBlinkSrc } from '../cozy3dAvatars';

const SLUGS = ['fuchs', 'eule', 'katze', 'hund'];
// Tiere mit Transplant-Vergleich (echte Lid-Scheibe aus dem zu-Bild).
const TRANSPLANT = new Set(['fuchs', 'eule']);
const transplantSrc = (slug: string) => `/avatars/cozy3d/${slug}-transplant.png`;

function Disc({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 200, height: 200,
        background: 'radial-gradient(circle at 50% 40%, #2a2440, #14101f)', borderRadius: '50%' }}>
        {children}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#a9a4c0' }}>{label}</div>
    </div>
  );
}

export default function QQBlinkTestPage() {
  const [speed, setSpeed] = useState(5.2);   // Idle-Zyklus in Sekunden

  return (
    <div style={{ minHeight: '100vh', background: '#14101f', color: '#fff', padding: 24,
      fontFamily: "'Bricolage Grotesque','Inter',system-ui,sans-serif" }}>
      <style>{`
        @keyframes blinkTestSwap { 0%,90%,100%{opacity:0} 93%,96%{opacity:1} }
      `}</style>
      <h1 style={{ margin: '0 0 4px' }}>👁️ Blinzel-Test — gezeichnetes Lid</h1>
      <p style={{ margin: '0 0 16px', color: '#a9a4c0', maxWidth: 720, lineHeight: 1.5 }}>
        Der geschlossene Frame wird aus dem offenen Bild <b>gezeichnet</b> (Fellfarbe übers Auge
        + schwarze ‿-Linie) — kein zweites, schief ausgerichtetes Bild mehr. Wenn der Look passt,
        messe ich die Augen-Positionen für alle Tiere und erzeuge alle Blink-Frames so.
      </p>

      <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 28 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          Blinzel-Tempo (Idle-Zyklus): {speed.toFixed(1)}s
          <input type="range" min={2} max={8} step={0.2} value={speed} onChange={e => setSpeed(+e.target.value)} style={{ width: 240 }} />
        </label>
      </div>

      {/* Pro Tier: offen | zu | live */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {SLUGS.map((slug, si) => (
          <div key={slug}>
            <div style={{ fontWeight: 800, fontSize: 18, textTransform: 'capitalize', marginBottom: 10 }}>{slug}</div>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              <Disc label="offen">
                <img src={cozy3dSrc(slug)} width={200} height={200} draggable={false}
                  style={{ display: 'block', objectFit: 'contain' }} />
              </Disc>
              <Disc label="zu (gezeichnet)">
                <img src={cozy3dBlinkSrc(slug)} width={200} height={200} draggable={false}
                  style={{ display: 'block', objectFit: 'contain' }} />
              </Disc>
              {TRANSPLANT.has(slug) && (
                <Disc label="zu (transplant ✨)">
                  <img src={transplantSrc(slug)} width={200} height={200} draggable={false}
                    style={{ display: 'block', objectFit: 'contain' }} />
                </Disc>
              )}
              <Disc label="live-blinzeln (gezeichnet)">
                <img src={cozy3dSrc(slug)} width={200} height={200} draggable={false}
                  style={{ position: 'absolute', inset: 0, display: 'block', objectFit: 'contain' }} />
                <img src={cozy3dBlinkSrc(slug)} width={200} height={200} draggable={false} aria-hidden
                  style={{ position: 'absolute', inset: 0, display: 'block', objectFit: 'contain', opacity: 0,
                    animation: `blinkTestSwap ${speed}s ease-in-out ${(-si * 0.7).toFixed(2)}s infinite` }} />
              </Disc>
              {TRANSPLANT.has(slug) && (
                <Disc label="live (transplant ✨)">
                  <img src={cozy3dSrc(slug)} width={200} height={200} draggable={false}
                    style={{ position: 'absolute', inset: 0, display: 'block', objectFit: 'contain' }} />
                  <img src={transplantSrc(slug)} width={200} height={200} draggable={false} aria-hidden
                    style={{ position: 'absolute', inset: 0, display: 'block', objectFit: 'contain', opacity: 0,
                      animation: `blinkTestSwap ${speed}s ease-in-out ${(-si * 0.7).toFixed(2)}s infinite` }} />
                </Disc>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
