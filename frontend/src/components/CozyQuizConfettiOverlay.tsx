/**
 * CozyQuizConfettiOverlay — fullscreen Konfetti-Regen fuer Sieger-Momente.
 *
 * 110 Partikel (rect + circle Mix) fallen mit gestaffeltem Delay vom oberen
 * Bildschirmrand. Pro Partikel zufaellige Rotation/Duration/Size — natuerlich
 * wirkende Streuung. Standard-Palette: Brand-Pink/Blau/Gruen-Mix. Im
 * Eurovision-Modus: nur Pink/Blau/Lila + helle Akzente.
 *
 * 2026-05-09 v7.2 (Wolf 'konfetti haengt'): Count 50→110, duration 2.5-4.5s,
 * delay 0-1.5s, cubic-bezier ease-in-out fuer schnelleren Fall-Start.
 *
 * Extrahiert 2026-05-12 (Refactor Phase 2). Mehrere interne Caller
 * (QuizIntroOverlay, PhaseIntroView, FinalRevealView, GameOverView, etc.).
 *
 * Keyframe `confettiFall` lebt in BEAMER_CSS / qqShared global.
 */
import { useState } from 'react';

const CONFETTI_COLORS = ['#EC4899', '#EF4444', '#3B82F6', '#22C55E', '#A78BFA', '#F472B6', '#FCD34D', '#34D399'];
// 2026-05-07 (Wolf 'mehr Pink+Blau, Set E'): ESC-Confetti-Palette — nur Pink,
// Blau, Lila + helle Akzente. Trifft GameOver-Recap und Winner-Layout, der
// Climax-Moment im Eurovision-Quiz wirkt dadurch geschlossen ESC-coloriert.
const CONFETTI_COLORS_ESC = ['#FF2D7B', '#3B82F6', '#A78BFA', '#EC4899', '#60A5FA', '#C084FC', '#F472B6', '#fde6f0'];
const CONFETTI_COUNT = 110;

export function ConfettiOverlay({ eurovisionMode, accent }: { eurovisionMode?: boolean; accent?: string } = {}) {
  // 2026-06-28 (Claude-Design-Handoff #2): optionaler accent (z.B. Gewinner-
  // Team-Farbe) → Palette wird accent-lastig + Marken-Pink. „Konfetti in
  // Team-Farbe + Pink" bei Gewinner-Reveals. Ohne accent: bestehende Palette.
  const palette = accent
    ? [accent, accent, accent, '#EC4899', '#F472B6', '#FFFFFF', '#A78BFA', accent]
    : (eurovisionMode ? CONFETTI_COLORS_ESC : CONFETTI_COLORS);
  const [particles] = useState(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: palette[i % palette.length],
      delay: Math.random() * 1.5,
      duration: 4.5 + Math.random() * 3.0,
      size: 6 + Math.random() * 6,
      rotation: 360 + Math.random() * 720,
      startY: -(20 + Math.random() * 60),
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }))
  );

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50, overflow: 'hidden' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`,
          width: p.shape === 'rect' ? p.size : p.size * 0.8,
          height: p.shape === 'rect' ? p.size * 0.6 : p.size * 0.8,
          borderRadius: p.shape === 'circle' ? '50%' : 2,
          background: p.color,
          ['--cy' as string]: `${p.startY}px`,
          ['--cr' as string]: `${p.rotation}deg`,
          animation: `confettiFall ${p.duration}s cubic-bezier(0.4, 0.05, 0.7, 0.95) ${p.delay}s both`,
        }} />
      ))}
    </div>
  );
}
