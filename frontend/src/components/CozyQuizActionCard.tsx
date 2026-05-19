/**
 * CozyQuizActionCard — Phase-Intro Action-Card mit Single-Source-of-Truth Layout.
 *
 * Vorher: ActionCardReveal (für isNew=true, mit 3D-Slam+Flip) und die plain
 * Card (für isNew=false) waren ZWEI verschiedene Inline-Layouts in
 * QQBeamerPage.tsx mit denselben Box-Properties die manuell synchron gehalten
 * werden mussten. Über 20 Bug-Fixes konnten den "nicht gleich groß"-Drift nicht
 * dauerhaft schließen, weil jedes Property an zwei Stellen geändert werden
 * musste.
 *
 * Jetzt: BEIDE Variants nutzen denselben `<SlotOuter>` (Box-Geometrie:
 * flex/min/max/minHeight/boxSizing) und denselben `<FrontFace>` (Border/BG/
 * Padding/Shadow + Card-Inhalt). Drift ist strukturell unmöglich.
 */
import { useEffect, useState } from 'react';
import { playFieldPlaced, playSteal, playStapelStamp } from '../utils/sounds';

export type ActionCardData = {
  count: number;
  emoji?: string;
  slug?: 'marker-sanduhr' | 'marker-shield' | 'marker-swap';
  label: string;
  limit?: string;
  accent: string;
  /** In dieser Runde NEU verfügbar — bekommt 3D-Slam+Flip-Reveal. */
  isNew?: boolean;
};

type CommonProps = {
  cardData: ActionCardData;
  iconNode: React.ReactNode;
  iconSize: string;
  cardCount: number;
  lang: 'de' | 'en';
  /** Delay in ms bevor die Card animiert auftaucht. Für isNew=true wird intern
   *  noch ein Build-up von 600ms aufgeschlagen damit Plain-Cards visuell
   *  gesettled sind bevor die Slam-Card reinkommt. */
  delayMs: number;
};

/** Outer-Slot — IDENTISCHE Box-Geometrie für Plain UND Reveal. Single source
 *  of truth. KEIN border/padding/bg/shadow hier — die sitzen einheitlich auf
 *  `<FrontFace>` innen. */
function SlotOuter({
  cardCount, animation, children,
}: {
  cardCount: number;
  animation: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      flex: cardCount === 1 ? '0 1 auto' : '1 1 0',
      minWidth: cardCount === 1 ? 280 : 200,
      maxWidth: cardCount === 1 ? 480 : 480,
      minHeight: 360,
      boxSizing: 'border-box',
      position: 'relative',
      display: 'flex', flexDirection: 'column',
      animation,
    }}>
      {children}
    </div>
  );
}

/** Die sichtbare Card-Vorderseite. IDENTISCH genutzt von Plain (direkt unter
 *  SlotOuter, flex:1) UND Reveal (als `position:absolute inset:0` innerhalb
 *  perspective-3d-Wrapper). Border-Box-Berechnung führt in beiden Fällen zur
 *  exakt gleichen visuellen Größe = SlotOuter content rectangle. */
function FrontFace({
  cardData: c, iconNode, iconSize, lang, mode,
}: {
  cardData: ActionCardData;
  iconNode: React.ReactNode;
  iconSize: string;
  lang: 'de' | 'en';
  mode: 'plain' | 'flip';
}) {
  const isFlip = mode === 'flip';
  return (
    <div style={{
      // Plain: füllt SlotOuter via flex:1+width:100% (im column-flow).
      // Flip:  füllt 3D-rotate-Wrapper via position:absolute inset:0.
      ...(isFlip
        ? {
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }
        : { flex: 1, width: '100%' }),
      boxSizing: 'border-box',
      borderRadius: 24,
      background: `linear-gradient(180deg, ${c.accent}28, ${c.accent}10)`,
      border: `3px solid ${c.accent}aa`,
      boxShadow: `0 0 40px ${c.accent}44, 0 8px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: 'clamp(20px, 2.4cqh, 36px) clamp(20px, 2cqw, 32px)',
      overflow: 'hidden',
    }}>
      {/* Hauptinhalt-Block — zentriert sich vertikal via flex:1 */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 'clamp(8px, 1.2cqh, 16px)', width: '100%',
      }}>
        <div style={{
          fontSize: iconSize, lineHeight: 1,
          filter: `drop-shadow(0 6px 18px ${c.accent}55)`,
        }}>{iconNode}</div>
        <div style={{
          display: 'flex', alignItems: 'baseline',
          gap: 'clamp(6px, 0.8cqw, 12px)',
          fontWeight: 900, lineHeight: 1,
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: 'clamp(36px, 4.2cqw, 64px)',
            color: c.accent, fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 22px ${c.accent}88`,
          }}>{c.count}x</span>
          <span style={{
            fontSize: 'clamp(28px, 3.2cqw, 48px)',
            color: '#F1F5F9', letterSpacing: '0.01em',
          }}>{c.label}</span>
        </div>
        <div style={{
          fontSize: 'clamp(13px, 1.4cqw, 19px)',
          fontWeight: 700, color: '#cbd5e1',
          textAlign: 'center', lineHeight: 1.25, opacity: 0.85,
        }}>{lang === 'en' ? 'per correct answer' : 'pro richtige Antwort'}</div>
      </div>
      {/* Limit-Slot — fixed Höhe, immer gerendert (auch ohne Inhalt). Damit
          sitzen Cards mit/ohne Pill auf identischer Achse. */}
      <div style={{
        flex: '0 0 auto',
        minHeight: 'clamp(28px, 2.6cqh, 36px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 4,
      }}>
        {c.limit && (
          <div style={{
            padding: '5px 14px', borderRadius: 999,
            background: 'rgba(15,23,42,0.6)',
            border: `1.5px solid ${c.accent}55`,
            fontSize: 'clamp(11px, 1.15cqw, 15px)',
            fontWeight: 900, color: '#e2e8f0',
            whiteSpace: 'nowrap',
            boxShadow: `0 2px 8px ${c.accent}22`,
          }}>{c.limit}</div>
        )}
      </div>
    </div>
  );
}

/** Card-Rückseite — Cross-Hatch + NEU/NEW Badge. Nur im Flip-Reveal genutzt. */
function BackFace({ lang }: { lang: 'de' | 'en' }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      boxSizing: 'border-box',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
      borderRadius: 24,
      background:
        'radial-gradient(ellipse at 50% 30%, rgba(236,72,153,0.32) 0%, transparent 60%),' +
        'radial-gradient(ellipse at 50% 80%, rgba(162,18,71,0.28) 0%, transparent 55%),' +
        'linear-gradient(135deg, #1F1A2E 0%, #14101F 60%, #0F0817 100%)',
      border: '3px solid rgba(236,72,153,0.65)',
      boxShadow: '0 0 40px rgba(236,72,153,0.27), 0 8px 28px rgba(0,0,0,0.55), inset 0 0 36px rgba(236,72,153,0.18)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 14,
      overflow: 'hidden',
    }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(236,72,153,0.06) 0 2px, transparent 2px 22px),' +
          'repeating-linear-gradient(-45deg, rgba(236,72,153,0.04) 0 2px, transparent 2px 22px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        fontSize: 'clamp(32px, 3.6cqw, 56px)', fontWeight: 900,
        color: '#FBCFE8', letterSpacing: '0.18em',
        textShadow: '0 0 24px rgba(236,72,153,0.7)',
        position: 'relative',
      }}>{lang === 'en' ? 'NEW' : 'NEU'}</div>
      <div style={{
        fontSize: 'clamp(56px, 6.5cqw, 96px)', lineHeight: 1,
        filter: 'drop-shadow(0 0 18px rgba(236,72,153,0.55))',
        position: 'relative',
      }}>✨</div>
    </div>
  );
}

/** Plain-Variant — Card erscheint via phasePop (subtle scale 0.94→1 bounce). */
function ActionCardPlain({ cardData, iconNode, iconSize, cardCount, lang, delayMs }: CommonProps) {
  return (
    <SlotOuter
      cardCount={cardCount}
      animation={`phasePop 0.6s var(--qq-ease-bounce) ${delayMs / 1000}s both`}
    >
      <FrontFace cardData={cardData} iconNode={iconNode} iconSize={iconSize} lang={lang} mode="plain" />
    </SlotOuter>
  );
}

/** Reveal-Variant (isNew=true) — Card slammt face-down rein (Cross-Hatch + NEU),
 *  settled, flippt zur Vorderseite. Slam-Animation ist scale-frei (qqActionCardSlam),
 *  damit die Card während der Choreo nicht visuell drift'ed gegenüber Sibling-Cards. */
function ActionCardReveal({ cardData, iconNode, iconSize, cardCount, lang, delayMs }: CommonProps) {
  const SLAM_DUR = 1400;
  const SETTLE = 500;
  const FLIP_DUR = 1000;
  // Extra Build-up: warten bis Sibling-Plain-Cards visuell gesettled sind.
  const startDelayMs = delayMs + 600;
  const [phase, setPhase] = useState<'hidden' | 'slamming' | 'flipping' | 'done'>('hidden');
  useEffect(() => {
    // 2026-05-17 P5 (Wolf 'wenn neue aktionen aufgedeckt wurden mit den karten
    // dann soll der jeweilige sound abgespielt werden'): beim Flip (Card zeigt
    // Vorderseite zum ersten Mal) den Action-typ-spezifischen Sound aus dem
    // Grid abspielen. Detection via emoji-Marker (📍 Place, ⚡ Steal, 🏯 Stack).
    const t1 = window.setTimeout(() => setPhase('slamming'), startDelayMs);
    const t2 = window.setTimeout(() => {
      setPhase('flipping');
      // Sound synchron zum Flip (Card zeigt Vorderseite ~mid-flip an = 500ms in).
      window.setTimeout(() => {
        try {
          switch (cardData.emoji) {
            case '📍': playFieldPlaced(); break;
            case '⚡': playSteal(); break;
            case '🏯': playStapelStamp(); break;
          }
        } catch { /* ignore */ }
      }, 500);
    }, startDelayMs + SLAM_DUR + SETTLE);
    const t3 = window.setTimeout(() => setPhase('done'), startDelayMs + SLAM_DUR + SETTLE + FLIP_DUR);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3); };
  }, [startDelayMs, cardData.emoji]);
  const isFlipped = phase === 'flipping' || phase === 'done';
  const isVisible = phase !== 'hidden';
  return (
    <SlotOuter
      cardCount={cardCount}
      animation={isVisible ? `qqActionCardSlam ${SLAM_DUR}ms cubic-bezier(0.34, 1.46, 0.64, 1) both` : 'none'}
    >
      {/* Perspective-Wrapper — flex:1+width:100% fuellt SlotOuter wie FrontFace
          im Plain-Pfad. Identische Box-Berechnung garantiert Zero-Drift. */}
      <div style={{
        flex: 1, width: '100%',
        position: 'relative',
        perspective: '1400px',
        opacity: isVisible ? 1 : 0,
        transition: 'filter 0.6s ease',
      }}>
        {/* 3D-Rotate-Wrapper — fuellt Perspective via inset:0. */}
        <div style={{
          position: 'absolute', inset: 0,
          boxSizing: 'border-box',
          transformStyle: 'preserve-3d',
          transition: `transform ${FLIP_DUR}ms cubic-bezier(0.34, 1.46, 0.64, 1)`,
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>
          <BackFace lang={lang} />
          <FrontFace cardData={cardData} iconNode={iconNode} iconSize={iconSize} lang={lang} mode="flip" />
        </div>
      </div>
    </SlotOuter>
  );
}

/** Public API — entscheidet intern ob Plain oder Reveal basierend auf isNew. */
export function ActionCard(props: CommonProps) {
  return props.cardData.isNew
    ? <ActionCardReveal {...props} />
    : <ActionCardPlain {...props} />;
}
