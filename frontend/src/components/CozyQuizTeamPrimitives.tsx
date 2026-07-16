/**
 * CozyQuizTeamPrimitives — Mini-Bausteine fuer die Team-Phone-View.
 *
 * Generische Components ohne Game-State-Abhaengigkeit:
 * - CozyCard / CozyBtn / StepLabel / StatChip — Presentation-Primitives
 * - AnimatedDots — animierter "..."-Indikator
 * - CopyButton — Stamm-Code Clipboard-Helper
 * - MobileFireflies — leichter Fireflies-Hintergrund (5 Glow-Dots)
 * - TeamTimerBar — Countdown-Balken mit Urgency-Stufen + Haptic-Buzz
 *
 * Animations-Keyframes (tcdotPulse, tcffmove, tcTimerPulse) leben im
 * <style>-Block in QQTeamPage.tsx und sind global verfuegbar sobald die
 * Page gemountet ist.
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 1.1 + 1.2).
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { isThemed } from '../qqTheme';
import { getServerNow } from '../utils/serverTime';

/** Frosted-Glass-Surface fuer Team-View Cards. Premium-Mobile-Look (opacity
 *  0.62 + saturate 160%, lesbar). backdrop-filter mit -webkit-Fallback fuer
 *  Safari iOS. */
export function CozyCard({
  children, anim, borderColor, pulse,
}: {
  children: ReactNode;
  anim?: boolean;
  borderColor?: string;
  pulse?: boolean;
}) {
  const themed = isThemed();
  return (
    <div style={{
      // Skin: opake Karten-Flaeche/Rand/Schatten + card-text. Cozy behaelt
      // das dunkle Frosted-Glass (borderColor-Tint = Team-Farbe bleibt sichtbar).
      background: themed ? 'var(--qq-card-bg)' : 'rgba(31, 26, 46, 0.62)',
      backdropFilter: themed ? undefined : 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: themed ? undefined : 'blur(20px) saturate(160%)',
      color: themed ? 'var(--qq-card-text)' : undefined,
      border: themed
        ? (borderColor ? `2px solid ${borderColor}` : 'var(--qq-card-border)')
        : `1px solid ${borderColor ? borderColor + '55' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: themed ? 'var(--qq-card-radius)' : 22, padding: '22px 20px', marginBottom: 14,
      boxShadow: themed
        ? `var(--qq-card-shadow)${borderColor ? `, 0 0 24px ${borderColor}22` : ''}`
        : `0 12px 36px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.06)${borderColor ? `, 0 0 24px ${borderColor}22` : ''}`,
      animation: anim ? 'tcreveal 0.4s ease both' : pulse ? `tcpulse 2.5s ease-in-out infinite` : undefined,
      ['--c' as string]: borderColor ? `${borderColor}33` : undefined,
      transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
    } as CSSProperties}>
      {children}
    </div>
  );
}

/** Standard Team-CTA-Button: voll-breit, color-tinted Border + Glow. */
export function CozyBtn({
  children, color, onClick, disabled,
}: {
  children: ReactNode;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="qq-pressable"
      onClick={onClick}
      disabled={disabled}
      // Leichter Haptik-Tick beim Druecken (nur wo unterstuetzt + aktiv).
      onPointerDown={() => { if (!disabled && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8); }}
      style={{
        width: '100%', padding: '16px', borderRadius: 16, fontFamily: 'inherit', fontWeight: 900, fontSize: 17,
        border: `2px solid ${disabled ? 'rgba(255,255,255,0.08)' : color}`,
        background: disabled ? 'rgba(255,255,255,0.04)' : `${color}22`,
        color: disabled ? '#334155' : color,
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: disabled ? 'none' : `0 0 20px ${color}22`,
      }}>
      {children}
    </button>
  );
}

/** Kleines Uppercase-Label fuer Setup-Schritte ("STEP 1 — TEAMNAME" etc.). */
export function StepLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 900, color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

/** Pill-Badge mit color-tint, z.B. fuer "3/8 Teams" oder "Phase 2/4". */
export function StatChip({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      padding: '3px 10px', borderRadius: 999,
      background: `${color}18`, border: `1px solid ${color}33`,
      fontSize: 13, fontWeight: 900, color,
    }}>
      {label}
    </div>
  );
}

/** 3 punktierte Dots die in 1.4s-Loop pulsieren — fuer "X waehlt gerade..."
 *  oder "Submitting..." Indikatoren. Setzt aria-hidden, weil rein dekorativ. */
export function AnimatedDots() {
  return (
    <span aria-hidden>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          animation: `tcdotPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
          fontSize: 'inherit',
        }}>.</span>
      ))}
    </span>
  );
}

/** Stamm-Code Copy-to-Clipboard (2026-05-03 Wolf-Wunsch). navigator.clipboard
 *  bevorzugt, Fallback auf execCommand fuer alte Browser. 1.5s "Copied!"-State. */
export function CopyButton({ text, lang }: { text: string; lang: 'de' | 'en' }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed'; el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* silently fail — user can long-press to copy */ }
  }
  return (
    <button
      onClick={copy}
      style={{
        padding: '8px 14px', minHeight: 44, borderRadius: 8,
        border: `1.5px solid ${copied ? '#22C55E' : (isThemed() ? 'var(--qq-accent)' : '#EC4899')}55`,
        background: copied ? 'rgba(34,197,94,0.15)' : (isThemed() ? 'var(--qq-surface)' : 'rgba(236,72,153,0.10)'),
        color: copied ? '#86efac' : (isThemed() ? 'var(--qq-card-text)' : '#FBCFE8'),
        fontFamily: 'inherit', fontWeight: 900, fontSize: 11,
        cursor: 'pointer',
        letterSpacing: 0.4,
      }}
      title={lang === 'de' ? 'Code kopieren' : 'Copy code'}
    >
      {copied ? (lang === 'de' ? '✓ Kopiert' : '✓ Copied') : (lang === 'de' ? '📋 Kopieren' : '📋 Copy')}
    </button>
  );
}

// ── Mobile Fireflies (lighter version for phones) ────────────────────────────
const MOBILE_FF = [
  { x:10, y:25, dx: 30,  dy:-40,  dur:6.0, del:0   },
  { x:85, y:60, dx:-25,  dy:-35,  dur:7.2, del:1.2 },
  { x:45, y:80, dx: 35,  dy:-45,  dur:5.5, del:0.6 },
  { x:70, y:15, dx:-30,  dy:-25,  dur:8.0, del:2.0 },
  { x:25, y:55, dx: 20,  dy:-50,  dur:6.8, del:1.5 },
];

/** 5 fixed-positioned Glow-Dots im Hintergrund, sanft schwebend (tcffmove).
 *  Mobile-optimiert — leichter als die Beamer-Variante. */
export function MobileFireflies({ color }: { color?: string }) {
  const c = color ?? '#F9A8D488';
  return (
    <>
      {MOBILE_FF.map((f, i) => (
        <div key={i} style={{
          position: 'fixed', pointerEvents: 'none', zIndex: 1,
          left: `${f.x}%`, top: `${f.y}%`,
          width: 4, height: 4, borderRadius: '50%',
          background: c,
          boxShadow: `0 0 5px 1px ${c}`,
          ['--dx' as string]: `${f.dx}px`,
          ['--dy' as string]: `${f.dy}px`,
          animation: `tcffmove ${f.dur}s ease-in-out ${f.del}s infinite`,
        } as CSSProperties} />
      ))}
    </>
  );
}

/** Countdown-Balken fuer Team-Antwort-Phasen. Skaliert Schriftgroesse +
 *  Bar-Hoehe + Farbe je Urgency-Stufe (15s/10s/5s Schwellen). Haptic-Buzz
 *  in den letzten 3 Sek (genau 1 Buzz pro neuer Sekunde via lastBuzzSecRef). */
export function TeamTimerBar({ endsAt, durationSec, accentColor }: { endsAt: number; durationSec: number; accentColor: string }) {
  // 2026-07-08 T4: getServerNow statt Date.now — Timer-Anzeige folgt der Server-
  // Clock (wie useExpiry/Beamer), driftet nicht bei falscher Client-Uhr.
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - getServerNow()) / 1000));
  const lastBuzzSecRef = useRef<number | null>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      const r = Math.max(0, (endsAt - getServerNow()) / 1000);
      setRemaining(r);
      const secs = Math.ceil(r);
      if (secs >= 1 && secs <= 3 && lastBuzzSecRef.current !== secs) {
        lastBuzzSecRef.current = secs;
        if (navigator.vibrate) navigator.vibrate(70);
      }
      if (r === 0) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, [endsAt]);

  const pct = Math.min(100, (remaining / durationSec) * 100);
  const secs = Math.ceil(remaining);

  const isCritical = secs <= 5;
  const isWarning = secs <= 10 && !isCritical;
  const isAlert = secs <= 15 && !isWarning && !isCritical;
  const color = isCritical ? '#EF4444' : isWarning ? '#F97316' : isAlert ? '#EC4899' : accentColor;
  const timerFontSize = isCritical ? 22 : isWarning ? 18 : 15;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>Timer</span>
        <span style={{
          fontSize: timerFontSize, fontWeight: 900, color,
          textShadow: isCritical ? '0 0 14px rgba(239,68,68,0.7)' : isWarning ? '0 0 10px rgba(249,115,22,0.5)' : 'none',
          animation: isCritical ? 'tcTimerPulse 0.6s ease-in-out infinite' : isWarning ? 'tcTimerPulse 1.2s ease-in-out infinite' : 'none',
          transition: 'font-size 0.2s, color 0.3s',
        }}>
          {secs}s
        </span>
      </div>
      <div style={{
        height: isCritical ? 10 : 8, borderRadius: 5,
        background: 'rgba(255,255,255,0.07)', overflow: 'hidden',
        transition: 'height 0.3s',
      }}>
        <div style={{
          height: '100%', borderRadius: 5, background: color,
          width: `${pct}%`, transition: 'width 0.1s linear, background 0.3s',
          boxShadow: isCritical ? `0 0 14px ${color}aa` : `0 0 8px ${color}55`,
        }} />
      </div>
    </div>
  );
}
