// QQBlinkTestPage — Review-Seite (2026-06-26, Wolf): alle Tiere mit erzeugtem
// Blink-Frame live blinzeln, zum Durchscrollen + Abnehmen. Blink-Frame entsteht
// per Auto-Diff-Transplant (scripts/transplant-cozy3d-blink.mjs): auf+zu Bild
// diffen → die 2 größten Unterschiede = Augen → echte Lid-Scheibe transplantieren.
import { useState } from 'react';
import { cozy3dSrc, cozy3dBlinkSrc, cozy3dLabel } from '../cozy3dAvatars';

// Alle aus den 41 Paaren erzeugten Blink-Frames.
const ALL = [
  'adler', 'alligator', 'axolotl', 'baer', 'biene', 'bison', 'capybara',
  'chamaeleon', 'clownfisch', 'dachs', 'delfin', 'dino', 'dodo', 'drache',
  'eichhoernchen', 'einhorn', 'elch', 'elefant', 'ente', 'eule', 'faultier',
  'flamingo', 'fledermaus', 'fuchs', 'gecko', 'giraffe', 'gorilla', 'hahn',
  'hai', 'hamster', 'hase', 'hummer', 'hund', 'igel', 'kaenguruh', 'kamel',
  'katze', 'koala', 'krabbe', 'kueken', 'kuh',
];
// Von der Heuristik markiert (Seitenprofil / ungleiche Augen / Schieflage) → genauer prüfen.
const FLAGGED = new Set<string>([]); // alle abgenommen (delfin zwinkert noch — Wolf prüft Einzelbilder)

export default function QQBlinkTestPage() {
  const [speed, setSpeed] = useState(5.2);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const list = onlyFlagged ? ALL.filter(s => FLAGGED.has(s)) : ALL;

  return (
    <div style={{ minHeight: '100vh', background: '#14101f', color: '#fff', padding: 24,
      fontFamily: "'Bricolage Grotesque','Inter',system-ui,sans-serif" }}>
      <style>{`@keyframes blinkTestSwap { 0%,90%,100%{opacity:0} 93%,96%{opacity:1} }`}</style>
      <h1 style={{ margin: '0 0 4px' }}>👁️ Blinzel-Review — {ALL.length} Tiere</h1>
      <p style={{ margin: '0 0 16px', color: '#a9a4c0', maxWidth: 760, lineHeight: 1.5 }}>
        Echtes Lid per <b>Auto-Diff-Transplant</b> aus deinen auf/zu-Paaren — kein Matchen,
        keine Koordinaten nötig (das Skript findet die Augen über den Bild-Unterschied).
        🚩 = von der Heuristik markiert (Seitenprofil o.ä.), genauer prüfen. Sag mir, welche
        rausfallen sollen.
      </p>

      <div style={{ display: 'flex', gap: 22, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          Blinzel-Tempo: {speed.toFixed(1)}s
          <input type="range" min={2} max={8} step={0.2} value={speed} onChange={e => setSpeed(+e.target.value)} style={{ width: 220 }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={onlyFlagged} onChange={e => setOnlyFlagged(e.target.checked)} /> nur 🚩 zeigen
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22 }}>
        {list.map((slug, si) => (
          <div key={slug} style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 150, height: 150,
              background: 'radial-gradient(circle at 50% 40%, #2a2440, #14101f)', borderRadius: '50%',
              outline: FLAGGED.has(slug) ? '2px solid #f59e0b' : 'none' }}>
              <img src={cozy3dSrc(slug)} width={150} height={150} draggable={false}
                style={{ position: 'absolute', inset: 0, display: 'block', objectFit: 'contain' }} />
              <img src={cozy3dBlinkSrc(slug)} width={150} height={150} draggable={false} aria-hidden
                style={{ position: 'absolute', inset: 0, display: 'block', objectFit: 'contain', opacity: 0,
                  animation: `blinkTestSwap ${speed}s ease-in-out ${(-(si % 9) * 0.55).toFixed(2)}s infinite` }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: FLAGGED.has(slug) ? '#f59e0b' : '#a9a4c0' }}>
              {FLAGGED.has(slug) ? '🚩 ' : ''}{cozy3dLabel(slug)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
