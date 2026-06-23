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
import { getServerNow } from '../utils/serverTime';
import { useActiveThemeId } from '../qqTheme';

export function BeamerTimer({
  endsAt, durationSec, accent, expireNow,
}: {
  endsAt: number;
  durationSec: number;
  accent: string;
  expireNow?: boolean;
}) {
  // 2026-05-19 (Wolf 'beamer timer +6s vs moderator'): Server-Clock statt
  // lokales Date.now(), damit alle Clients dasselbe Zeit-Referenzsystem
  // teilen — egal wie schief deren System-Uhr eingestellt ist.
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - getServerNow()) / 1000));
  // 2026-05-04 (Wolf): Outro-Animation wenn Timer NATUERLICH auf 0 laeuft
  // ODER frueher beendet wird (alle Teams haben geantwortet → expireNow=true).
  // Kurzer Pop + Schrumpfen + Fade. Einmal-Latch verhindert Re-Trigger.
  const [expired, setExpired] = useState(() => Math.max(0, (endsAt - getServerNow()) / 1000) === 0);

  useEffect(() => {
    const iv = setInterval(() => {
      const r = Math.max(0, (endsAt - getServerNow()) / 1000);
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
  const skinId = useActiveThemeId();

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

  // 2026-06-23 (Skin): pro Skin eigene Timer-Form (wie /skins-Mockups), gleiche
  // Position/Groesse (sz). Urgency-Farbe bleibt semantisch erhalten. Cozy = Ring.
  if (skinId !== 'cozy') {
    const numFs = isCritical ? 'clamp(40px, 5.2cqw, 64px)' : 'clamp(34px, 4.6cqw, 56px)';
    const numBox = (
      <div style={{ textAlign: 'center', lineHeight: 1, fontFamily: 'var(--qq-font)' }}>
        <div style={{ fontSize: numFs, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{secs}</div>
        <div style={{ fontSize: 'clamp(10px, 1cqw, 14px)', fontWeight: 800, letterSpacing: '0.12em' }}>SEK</div>
      </div>
    );
    let inner;
    if (skinId === 'neoBrutal') {
      inner = (
        <div style={{
          width: sz * 0.62, height: sz * 0.62, display: 'grid', placeItems: 'center',
          background: color, color: '#fff', border: '3px solid #16121F',
          boxShadow: '6px 6px 0 #16121F', borderRadius: 8,
        }}>{numBox}</div>
      );
    } else if (skinId === 'softPop') {
      inner = (
        <div style={{ position: 'relative', width: sz * 0.72, height: sz * 0.72, display: 'grid', placeItems: 'center' }}>
          <div style={{
            position: 'absolute', inset: 0, background: 'var(--qq-accent-light)',
            clipPath: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)',
            filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.12))',
          }} />
          <div style={{ position: 'relative', color: 'var(--qq-card-text)' }}>{numBox}</div>
        </div>
      );
    } else {
      // studioMono: nackte grosse Zahl (editorial)
      inner = <div style={{ color: 'var(--qq-text)' }}>{numBox}</div>;
    }
    return (
      <div style={{
        position: 'relative', width: sz, height: sz, animation: outroAnim ?? pulseAnim,
        pointerEvents: expired ? 'none' : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {inner}
      </div>
    );
  }

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
        {/* Background ring — 2026-06-23: Skin-sichtbar via Hairline-Token
            (rgba(255,255,255,..) waere auf hellen Skins unsichtbar). */}
        <circle cx={sz / 2} cy={sz / 2} r={radius}
          fill="none" style={{ stroke: 'var(--qq-hairline)' }} strokeWidth={stroke} />
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
