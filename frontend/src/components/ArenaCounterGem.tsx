// ArenaCounterGem — facettierter Kolosseum-Gem fuer Zaehler (Wolf 2026-07-18,
// „farblich passender diamant"). Wiederverwendbar, damit Round-Counter,
// Frage-X-von-5 & Co. EINEN Look teilen (nicht 3x inline kopiert). Vorlage =
// Round-Gem in CozyQuizPhaseIntroView. Fuellung + hellere Facetten-Kante in der
// uebergebenen Farbe, obere Glanzlinie. KEIN Gold (Gold-Regel: nur Kroenung).
import type { CSSProperties } from 'react';

const GEM = 'polygon(6% 0, 94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%)';

export function ArenaCounterGem({
  text, color, eyebrow, size = 'sm', style,
}: {
  /** Haupttext im Gem (z.B. „Frage 3 von 5"). */
  text: string;
  /** Akzentfarbe (Rundenfarbe / Kategorie-Farbe). */
  color: string;
  /** Optionale Kapitaelchen-Zeile ueber dem Gem (z.B. „Runde 2"). */
  eyebrow?: string;
  /** sm = Fragen-Zaehler (oben angepinnt), md = groesser (Runden-Ansage). */
  size?: 'sm' | 'md';
  style?: CSSProperties;
}) {
  const isMd = size === 'md';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, ...style }}>
      {eyebrow && (
        <div style={{
          fontSize: isMd ? 'clamp(11px, 1.2cqw, 16px)' : 'clamp(10px, 1.1cqw, 14px)',
          fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: `${color}cc`, textShadow: '0 1px 4px rgba(0,0,0,0.55)',
        }}>{eyebrow}</div>
      )}
      <div style={{
        position: 'relative',
        filter: `drop-shadow(0 0 14px ${color}55) drop-shadow(0 3px 9px rgba(0,0,0,0.4))`,
      }}>
        {/* Facetten-Kante (heller Farbton) */}
        <div style={{
          clipPath: GEM,
          background: `linear-gradient(180deg, ${color} 0%, ${color}88 55%, ${color}bb 100%)`,
          padding: 2,
        }}>
          {/* Fuellung + Text */}
          <div style={{
            clipPath: GEM,
            background: `linear-gradient(180deg, ${color}66 0%, rgba(18,10,26,0.92) 62%)`,
            padding: isMd ? '9px clamp(34px, 3.8cqw, 54px)' : '7px clamp(26px, 3cqw, 44px)',
            fontSize: isMd ? 'clamp(15px, 1.7cqw, 23px)' : 'clamp(13px, 1.45cqw, 19px)',
            fontWeight: 900, letterSpacing: '0.1em',
            color: '#FFFFFF', textShadow: '0 1px 6px rgba(0,0,0,0.6)',
            textAlign: 'center', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
          }}>{text}</div>
        </div>
        {/* obere Facetten-Glanzlinie */}
        <div aria-hidden style={{
          position: 'absolute', top: 3, left: '14%', right: '14%', height: 1,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: 0.7, pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
}
