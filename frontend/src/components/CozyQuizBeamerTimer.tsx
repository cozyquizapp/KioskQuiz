/**
 * CozyQuizBeamerTimer — Hero-Ring-Timer fuer Beamer-Views.
 *
 * SVG-Ring der von voll → 0 schrumpft. Multi-Stage-Urgency: blau (default) →
 * pink (≤10s) → orange (≤5s) → rot (≤3s). Critical-Phase pulst zusaetzlich.
 * Outro-Animation wenn Timer natuerlich auf 0 laeuft ODER expireNow=true
 * gesetzt wird (z.B. wenn alle Teams frueh abgeben).
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-12 (Refactor Phase 1) — vorher
 * inline um Zeile 21077. 3 externe Importer: QuestionView, BluffVoteScreen,
 * ComebackView. Zero-State-Abhaengigkeit zum Game-State, rein Timer-Logik.
 *
 * Keyframes (qqTimerOutro, bTimerPulse, bTimerGlow) leben in BEAMER_CSS /
 * qqShared — werden global gemounted durch QQBeamerPage's <style>{BEAMER_CSS}</style>.
 */
import { useEffect, useState } from 'react';

export function BeamerTimer({
  endsAt, durationSec, accent, expireNow,
}: {
  endsAt: number;
  durationSec: number;
  accent: string;
  expireNow?: boolean;
}) {
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - Date.now()) / 1000));
  // 2026-05-04 (Wolf): Outro-Animation wenn Timer NATUERLICH auf 0 laeuft
  // ODER frueher beendet wird (alle Teams haben geantwortet → expireNow=true).
  // Kurzer Pop + Schrumpfen + Fade. Einmal-Latch verhindert Re-Trigger.
  const [expired, setExpired] = useState(() => Math.max(0, (endsAt - Date.now()) / 1000) === 0);

  useEffect(() => {
    const iv = setInterval(() => {
      const r = Math.max(0, (endsAt - Date.now()) / 1000);
      setRemaining(r);
      if (r === 0) {
        setExpired(true);
        clearInterval(iv);
      }
    }, 100);
    return () => clearInterval(iv);
  }, [endsAt]);

  // Wolf-Bug 2026-05-04: 'wenn alle frueh abgeben, Timer-Outro fehlt'.
  // Outer-Wrapper kann jetzt expireNow=true setzen (z.B. revealed=true) und
  // der Timer triggert sofort die Outro-Animation statt abrupt opacity:0.
  useEffect(() => {
    if (expireNow) setExpired(true);
  }, [expireNow]);

  const pct = Math.min(100, (remaining / durationSec) * 100);
  const secs = Math.ceil(remaining);

  // Urgency levels
  const isAlert   = remaining <= 10 && remaining > 5;
  const isWarning = remaining <= 5 && remaining > 3;
  const isCritical = remaining <= 3;
  const isUrgent = remaining <= 10;

  const color = isCritical ? '#EF4444'
    : isWarning ? '#F97316'
    : isAlert ? '#EC4899'
    : accent;

  // Hero timer: big ring
  const radius = 80;
  const stroke = isCritical ? 12 : isWarning ? 10 : 8;
  const sz = radius * 2 + stroke * 2 + 20; // extra for glow
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  const glowSize = isCritical ? 28 : isWarning ? 20 : isUrgent ? 14 : 8;
  const pulseAnim = isCritical ? 'bTimerPulse 0.5s ease-in-out infinite'
    : isWarning ? 'bTimerPulse 0.8s ease-in-out infinite'
    : undefined;

  // Outro hat Vorrang vor Pulse — wenn Zeit um, fade+pop statt weiter pulsen.
  // forwards laesst den End-State (opacity 0) erhalten bis Component unmountet.
  const outroAnim = expired ? 'qqTimerOutro 0.85s var(--qq-ease-bounce) forwards' : undefined;

  return (
    <div style={{
      position: 'relative', width: sz, height: sz,
      animation: outroAnim ?? pulseAnim,
      pointerEvents: expired ? 'none' : 'auto',
    }}>
      {/* Outer glow ring */}
      {isUrgent && (
        <div style={{
          position: 'absolute', inset: -8,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
          animation: 'bTimerGlow 1.5s ease-in-out infinite',
        }} />
      )}
      {/* SVG ring */}
      <svg width={sz} height={sz}
        style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        {/* Background ring */}
        <circle cx={sz / 2} cy={sz / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {/* Progress ring */}
        <circle cx={sz / 2} cy={sz / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease',
            filter: `drop-shadow(0 0 ${glowSize}px ${color}aa)`,
          }}
        />
      </svg>
      {/* Number in center */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900,
        fontSize: isCritical ? 'clamp(56px, 7cqw, 88px)' : 'clamp(48px, 6cqw, 76px)',
        color,
        textShadow: isUrgent ? `0 0 24px ${color}88` : `0 0 12px ${color}44`,
        fontVariantNumeric: 'tabular-nums',
        transition: 'font-size 0.3s ease, color 0.3s ease',
      }}>
        {secs}
      </div>
    </div>
  );
}
