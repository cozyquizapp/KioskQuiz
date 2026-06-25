/**
 * QQ Style Tokens — zentrale Nicht-Farb-Design-Tokens (Radius / Shadow / Spacing /
 * Motion) + ein paar Style-Helper.
 *
 * 2026-06-22 (Designer-Audit Hebel 1): Farben leben schon zentral in
 * `@shared/qqColors` (QQ_COLORS), Easings + safe-margin als CSS-Vars in
 * `main.css`. Was bisher FEHLTE: Radius/Shadow/Spacing als Magic-Numbers + die
 * immer-gleichen Card-/Glow-Muster waren in ~40 Views inline neu getippt →
 * Drift-Gefahr (genau wie bei den Farben vor der Tokenisierung). Dieses Modul
 * macht „eine visuelle Sprache" erzwingbar.
 *
 * Migration-Strategie (wie bei qqColors): NICHT alles auf einmal. Beim naechsten
 * Anfassen einer View die Magic-Numbers durch Tokens ersetzen. Werte hier sind
 * exakt die aktuell gaengigsten — Adoption ist damit zero-visual-change.
 *
 * Nutzung:
 *   import { QQ_RADIUS, QQ_SHADOW, QQ_EASE, cozyCard } from '../qqStyleTokens';
 *   <div style={{ ...cozyCard({ bg, accentHex, accentRgb }), padding: 40 }} />
 */
import type { CSSProperties } from 'react';
import { isThemed } from './qqTheme';

/** Eck-Radien (px). pill = voll rund. */
export const QQ_RADIUS = {
  sm: 12,
  md: 16,
  lg: 18,
  card: 24,
  cardLg: 26,
  pill: 999,
} as const;

/** Motion-Easings — Verweise auf die EINE Quelle (CSS-Vars in main.css), damit
 *  JS-Inline-Styles und CSS dieselbe Kurve teilen statt cubic-bezier-Literale zu
 *  streuen. */
export const QQ_EASE = {
  bounce: 'var(--qq-ease-bounce)',
  bounceSoft: 'var(--qq-ease-bounce-soft)',
  popFast: 'var(--qq-ease-pop-fast)',
  smooth: 'var(--qq-ease-smooth)',
  smoothOut: 'var(--qq-ease-smooth-out)',
  outCubic: 'var(--qq-ease-out-cubic)',
} as const;

/** Spacing-Skala (px) — fuer NICHT-responsive Abstaende. Responsive Abstaende
 *  bleiben bewusst clamp()/cqw/cqh direkt im File (skalieren mit dem Beamer). */
export const QQ_SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

/** Schatten — kanonische Stufen (ohne den farbigen Brand-Glow, der pro Akzent
 *  variiert → siehe qqGlow). */
export const QQ_SHADOW = {
  /** Grosse Card auf dunklem BG. */
  card: '0 14px 48px rgba(0,0,0,0.55)',
  /** Kleinere Card / Panel. */
  cardSoft: '0 8px 28px rgba(0,0,0,0.45)',
  /** Pille / kleines schwebendes Element. */
  pillSoft: '0 6px 18px rgba(0,0,0,0.5)',
} as const;

/** Farbiger Glow als boxShadow-Fragment um eine Akzent-/Team-Farbe.
 *  `color` darf hex ODER rgba() sein. */
export function qqGlow(color: string, px = 64): string {
  return `0 0 ${px}px ${color}`;
}

/** Standard-„Cozy"-Card-Style (Big-Card-Muster aus PausedView/ThanksView):
 *  Akzent-Border + Schatten + Brand-Glow + Inner-Hairline + Akzent-Bottom-Edge.
 *  Liefert nur background/borderRadius/border/boxShadow — Padding/Layout/
 *  Animation setzt der Caller daneben. */
export function cozyCard(opts: {
  bg: string;
  accentHex: string;
  accentRgb: string;
  radius?: number;
}): CSSProperties {
  // In Themes (Mono/SoftPop/Neo) folgt JEDE cozyCard-Fläche der Skin-Card-Sprache
  // (eckig + Skin-Rahmen/Shadow) — systemischer Hebel: alle Fenster, die diesen
  // Helper nutzen (Thanks, PausedView-Hero, …), werden zentral mit-getheme't.
  if (isThemed()) {
    return {
      background: 'var(--qq-card-bg)',
      borderRadius: 'var(--qq-card-radius)',
      border: 'var(--qq-card-border)',
      boxShadow: 'var(--qq-card-shadow)',
    };
  }
  return {
    background: opts.bg,
    borderRadius: opts.radius ?? QQ_RADIUS.card,
    border: `1px solid rgba(${opts.accentRgb},0.42)`,
    boxShadow:
      `${QQ_SHADOW.card},` +
      `0 0 64px rgba(${opts.accentRgb},0.28),` +
      `0 0 0 1px rgba(255,235,200,0.04) inset,` +
      `0 -3px 0 ${opts.accentHex} inset`,
  };
}
