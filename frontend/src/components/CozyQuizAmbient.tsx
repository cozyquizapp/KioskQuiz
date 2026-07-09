/**
 * CozyQuizAmbient — Ambient-Particle-Effekte fuer Beamer-Hintergrund.
 *
 * `<Fireflies />` — leuchtende Punkte die diagonal durch die Slide schweben.
 * Standard-Color goldgelb (#FEF08A), via `color`-Prop ueberschreibbar (z.B.
 * team-farbig in PausedView).
 *
 * `<EurovisionHearts />` — Eurovision-Watchparty-Variante: Pink-Herzen
 * floaten/pulsieren. Nur aktiv im theme.eurovisionMode (Gating beim Caller).
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-12 (Refactor Phase 1).
 * 17+ externe Verwendungen von Fireflies. 4+ von EurovisionHearts.
 *
 * Keyframes (ffmove, qqEscHeartFloat, qqEscHeartPulse): ffmove ist in
 * BEAMER_CSS / qqShared global. qqEscHeart* sind lokal als <style>-Block in
 * EurovisionHearts gemounted (gehoert zu nur dieser Component).
 */
import { memo } from 'react';
import { isQuietMotion } from '../qqTheme';

// ── Static firefly positions ───────────────────────────────────────────────
// 8 vorgenerierte Positionen + Animations-Offsets. Vorher inline in
// QQBeamerPage; jetzt zentral mit der Komponente die sie nutzt. Exportiert
// damit CozyQuizCategoryParticles dasselbe Positions-Layout nutzen kann.
// 2026-07-09 (Motion-Audit C3): vorher 8 gleich-große (5px) Punkte, jede Phase
// identisch → auf 8-m-Beamer statisch/dünn. Jetzt 16 Nodes mit variierter Größe
// (`sz`) für lebendigere Streuung. Die ersten 8 bleiben unveraendert, damit
// CozyQuizCategoryParticles (nutzt FF.slice(0,10)) sein Layout behaelt.
export const FF = [
  { x:14, y:72, dx: 62,  dy:-84,  dur:5.4, del:0,   sz:5 },
  { x:82, y:28, dx:-44,  dy:-68,  dur:7.1, del:0.8, sz:4 },
  { x:47, y:83, dx: 80,  dy:-96,  dur:6.2, del:1.5, sz:6 },
  { x:22, y:44, dx:-72,  dy:-54,  dur:8.0, del:2.1, sz:4 },
  { x:68, y:62, dx: 52,  dy:-72,  dur:5.8, del:0.4, sz:5 },
  { x:38, y:18, dx:-58,  dy:-44,  dur:6.7, del:1.9, sz:4 },
  { x:91, y:74, dx:-82,  dy:-60,  dur:7.5, del:0.2, sz:6 },
  { x:56, y:42, dx: 42,  dy:-88,  dur:5.2, del:2.6, sz:5 },
  // + 8 dichtere, kleinere Funken (Motion-Audit C3)
  { x: 8, y:36, dx: 48,  dy:-66,  dur:6.9, del:3.1, sz:3 },
  { x:74, y:88, dx:-52,  dy:-92,  dur:7.8, del:0.6, sz:4 },
  { x:33, y:58, dx: 66,  dy:-58,  dur:5.9, del:2.4, sz:3 },
  { x:61, y:14, dx:-40,  dy:-50,  dur:8.3, del:1.2, sz:5 },
  { x:95, y:48, dx:-70,  dy:-78,  dur:6.4, del:3.4, sz:3 },
  { x:26, y:92, dx: 58,  dy:-104, dur:7.3, del:0.9, sz:4 },
  { x:50, y:66, dx:-48,  dy:-70,  dur:6.0, del:2.8, sz:3 },
  { x:86, y:56, dx: 44,  dy:-62,  dur:8.6, del:1.7, sz:4 },
];

// Langsame, größere, unschärfere Parallax-Tiefenebene (hinter den Fireflies) —
// gibt dem Beamer-BG Tiefe/Bokeh statt einer flachen Punkt-Ebene.
const FF_DEEP = [
  { x:18, y:60, dx: 30, dy:-40, dur:13, del:0,   sz:11 },
  { x:70, y:34, dx:-26, dy:-36, dur:15, del:2.0, sz:13 },
  { x:44, y:80, dx: 22, dy:-44, dur:14, del:4.0, sz:10 },
  { x:88, y:66, dx:-30, dy:-30, dur:16, del:1.2, sz:12 },
  { x:30, y:24, dx: 26, dy:-34, dur:13, del:3.2, sz:10 },
  { x:60, y:52, dx:-22, dy:-42, dur:17, del:0.6, sz:14 },
];

export const Fireflies = memo(function Fireflies({ color }: { color?: string } = {}) {
  // Quiet Motion (Studio Mono): editoriale Ruhe — keine schwebenden Ambient-
  // Partikel (Wolf 2026-06-25). Single-Point-Gate deckt alle 17+ Verwendungen.
  if (isQuietMotion()) return null;
  const c = color ?? '#FEF08A';
  return (
    <>
      {/* Tiefen-Ebene: groß, weich, langsam, gedämpft (zIndex 1 = hinter Fireflies) */}
      {FF_DEEP.map((f, i) => (
        <div key={`d${i}`} aria-hidden style={{
          position: 'absolute', pointerEvents: 'none', zIndex: 1,
          left: `${f.x}%`, top: `${f.y}%`,
          width: f.sz, height: f.sz, borderRadius: '50%',
          background: c, opacity: 0.5,
          filter: 'blur(2px)',
          boxShadow: `0 0 ${f.sz + 6}px ${Math.round(f.sz / 2)}px ${c}88`,
          ['--dx' as string]: `${f.dx}px`,
          ['--dy' as string]: `${f.dy}px`,
          ['--dur' as string]: `${f.dur}s`,
          ['--del' as string]: `${f.del}s`,
          animation: `ffmove var(--dur,14s) ease-in-out var(--del,0s) infinite`,
          willChange: 'transform, opacity',
        }} />
      ))}
      {FF.map((f, i) => (
        <div key={i} style={{
          position: 'absolute', pointerEvents: 'none', zIndex: 2,
          left: `${f.x}%`, top: `${f.y}%`,
          width: f.sz, height: f.sz, borderRadius: '50%',
          background: c,
          boxShadow: `0 0 ${f.sz + 3}px ${Math.round(f.sz / 2)}px ${c}bb`,
          ['--dx' as string]: `${f.dx}px`,
          ['--dy' as string]: `${f.dy}px`,
          ['--dur' as string]: `${f.dur}s`,
          ['--del' as string]: `${f.del}s`,
          animation: `ffmove var(--dur,6s) ease-in-out var(--del,0s) infinite`,
          willChange: 'transform, opacity',
        }} />
      ))}
    </>
  );
});

// 2026-05-07 (Wolf-ESC): Schwebende Eurovision-Herzen — dezenter Watchparty-
// Vibe ueber Lobby/Pause/PhaseIntro. Asset: eurovision-heart-opt.png (Sharp-
// optimiert, 800x800). Nur aktiv wenn theme.eurovisionMode true ist; Render-
// Stelle muss daher selbst gegated werden. zIndex 1 = zwischen BG (0) und
// Fireflies (2), damit Fireflies optisch davor blinken.
const ESC_HEART_NODES = [
  { x: 6,  y: 14, size: 60, dur: 11, del: 0,   dx:  14, dy: -22, pulseDur: 2.6, pulseDel: 0   },
  { x: 88, y: 20, size: 44, dur: 13, del: 1.5, dx: -16, dy: -28, pulseDur: 2.9, pulseDel: 0.4 },
  { x: 14, y: 76, size: 64, dur: 12, del: 0.8, dx:  18, dy: -20, pulseDur: 3.1, pulseDel: 0.8 },
  { x: 92, y: 70, size: 48, dur: 10, del: 2.2, dx: -12, dy: -24, pulseDur: 2.5, pulseDel: 0.2 },
  { x: 50, y: 88, size: 38, dur: 14, del: 3.0, dx:  10, dy: -30, pulseDur: 3.0, pulseDel: 1.1 },
  { x: 28, y: 40, size: 34, dur: 16, del: 1.2, dx:  14, dy: -18, pulseDur: 3.4, pulseDel: 0.6 },
  { x: 76, y: 46, size: 38, dur: 15, del: 2.6, dx: -14, dy: -22, pulseDur: 2.8, pulseDel: 1.4 },
] as const;

export const EurovisionHearts = memo(function EurovisionHearts() {
  return (
    <>
      <style>{`
        @keyframes qqEscHeartFloat {
          0%,100% { transform: translate(0,0) rotate(-3deg); }
          50%     { transform: translate(var(--escHdx,12px), var(--escHdy,-22px)) rotate(3deg); }
        }
        @keyframes qqEscHeartPulse {
          0%,100% { opacity: 0.20; }
          50%     { opacity: 0.42; }
        }
      `}</style>
      {ESC_HEART_NODES.map((h, i) => (
        <div key={i} aria-hidden style={{
          position: 'absolute',
          left: `${h.x}%`, top: `${h.y}%`,
          width: h.size, height: h.size,
          pointerEvents: 'none', zIndex: 1,
          ['--escHdx' as string]: `${h.dx}px`,
          ['--escHdy' as string]: `${h.dy}px`,
          animation: `qqEscHeartFloat ${h.dur}s ease-in-out ${h.del}s infinite`,
          willChange: 'transform',
        }}>
          <img
            src="/themes/eurovision-heart-opt.png"
            alt=""
            draggable={false}
            style={{
              width: '100%', height: '100%', display: 'block',
              filter: 'drop-shadow(0 0 12px rgba(255,45,123,0.55)) drop-shadow(0 0 4px rgba(255,255,255,0.25))',
              animation: `qqEscHeartPulse ${h.pulseDur}s ease-in-out ${h.pulseDel}s infinite`,
              willChange: 'opacity',
            }}
          />
        </div>
      ))}
    </>
  );
});
