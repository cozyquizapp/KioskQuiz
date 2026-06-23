/**
 * QQ Theme-Runtime — umschaltbare „Grunddesigns" (Skins) für die gesamte App.
 *
 * 2026-06-23 (Wolf): nicht Event-Kostüme (Weihnachten/Halloween), sondern
 * subtile Grunddesigns je Location/Setting (Café · Bar · Corporate · Glass).
 * Gleiche App, anderes Gewand — per Klick.
 *
 * MECHANIK (bewusst risikoarm, Proof-tauglich):
 *   - Ein modulweites `activeThemeId` (Default 'cozy' = der heutige Look).
 *   - `getBrandColors()` (Beamer-Chokepoint) delegiert hierher, WENN ein
 *     anderes Theme als 'cozy' aktiv ist. Bei 'cozy' bleibt das alte Verhalten
 *     inkl. Eurovision-Zweig → **zero-visual-change** in der Live-App.
 *   - Komponenten abonnieren via `useActiveThemeId()` (useSyncExternalStore),
 *     damit ein Theme-Wechsel ein Re-Render auslöst.
 *
 * ROLLOUT (später, graduell wie bei qqColors): Flächen-Tokens (cardBg/heroBorder)
 * an den Hauptscreens auf `resolveTheme().surface` umstellen. Erstmal liefert die
 * Foundation die Palette über getBrandColors — das deckt schon die meisten
 * Akzent-Flächen ab.
 */
import { useSyncExternalStore } from 'react';
import { QQ_COLORS } from '../../shared/qqColors';

/** Exakt das Shape, das getBrandColors zurückgibt. */
export type ThemeBrand = {
  accentHex: string;
  accentRgb: string;
  accentSoft: string;
  accentWarm: string;
  magenta: string;
  gradientPill: string;
};

/** Flächen-/Oberflächen-Stil (für den graduellen Rollout). */
export type ThemeSurface = {
  /** Seiten-/Bühnen-Hintergrund (Beamer-Stage). */
  pageBg: string;
  /** Haupt-Card-Fläche. */
  cardBg: string;
  cardBorder: string;
  /** backdrop-filter-Wert (z.B. 'blur(18px)') oder 'none'. */
  cardBlur: string;
  heroBorder: string;
  heroShadow: string;
};

export type ResolvedTheme = {
  id: string;
  label: string;
  brand: ThemeBrand;
  surface: ThemeSurface;
};

// ── Skin-Bibliothek ─────────────────────────────────────────────────────────
// 'cozy' spiegelt 1:1 die heutigen Default-Werte (getBrandColors non-eurovision
// + die COZY_HERO_*/CARD-Konstanten) → Adoption ist visual-neutral.
const COZY: ResolvedTheme = {
  id: 'cozy',
  label: 'Cozy',
  brand: {
    accentHex:  QQ_COLORS.brandPink,
    accentRgb:  '236,72,153',
    accentSoft: QQ_COLORS.brandPinkSoft,
    accentWarm: '#F9A8D4',
    magenta:    '#A21247',
    gradientPill: 'linear-gradient(135deg, #F472B6 0%, #EC4899 50%, #A21247 100%)',
  },
  surface: {
    pageBg: 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 60%, #0A0E22 100%)',
    cardBg: 'rgba(15,21,48,0.72)',
    cardBorder: '1px solid rgba(255,255,255,0.10)',
    cardBlur: 'none',
    heroBorder: '1.5px solid rgba(236,72,153,0.32)',
    heroShadow:
      'inset 0 1.5px 0 rgba(255,255,255,0.10), 0 0 0 1px rgba(236,72,153,0.08), ' +
      '0 16px 50px rgba(0,0,0,0.65), 0 0 36px rgba(236,72,153,0.14)',
  },
};

// 'glass' — clean/modern, frosted, neutral-edel. Indigo/Slate statt Pink.
const GLASS: ResolvedTheme = {
  id: 'glass',
  label: 'Glass',
  brand: {
    accentHex:  '#6366F1',
    accentRgb:  '99,102,241',
    accentSoft: '#C7D2FE',
    accentWarm: '#A5B4FC',
    magenta:    '#4F46E5',
    gradientPill: 'linear-gradient(135deg, #818CF8 0%, #6366F1 50%, #4338CA 100%)',
  },
  surface: {
    pageBg: 'radial-gradient(circle at 50% 0%, #2A3350 0%, #161B2E 55%, #0C0F1A 100%)',
    cardBg: 'rgba(255,255,255,0.08)',
    cardBorder: '1px solid rgba(255,255,255,0.18)',
    cardBlur: 'blur(18px) saturate(120%)',
    heroBorder: '1px solid rgba(199,210,254,0.45)',
    heroShadow:
      'inset 0 1px 0 rgba(255,255,255,0.22), 0 0 0 1px rgba(99,102,241,0.10), ' +
      '0 18px 56px rgba(0,0,0,0.55), 0 0 40px rgba(99,102,241,0.18)',
  },
};

export const QQ_THEMES: Record<string, ResolvedTheme> = {
  cozy: COZY,
  glass: GLASS,
};

export const QQ_THEME_IDS = Object.keys(QQ_THEMES);

// ── Runtime-State (modulweit, abonnierbar) ──────────────────────────────────
let _activeId = 'cozy';
const _listeners = new Set<() => void>();

export function getActiveThemeId(): string {
  return _activeId;
}

export function getActiveTheme(): ResolvedTheme {
  return QQ_THEMES[_activeId] ?? COZY;
}

/** Schreibt die Akzent-CSS-Vars des Themes auf :root → alle auf
 *  `var(--qq-accent*)` migrierten Flaechen ziehen sofort mit. */
export function applyThemeVars(theme: ResolvedTheme = getActiveTheme()): void {
  if (typeof document === 'undefined') return;
  const r = document.documentElement.style;
  const b = theme.brand;
  r.setProperty('--qq-accent', b.accentHex);
  r.setProperty('--qq-accent-rgb', b.accentRgb);
  r.setProperty('--qq-accent-soft', b.accentSoft);
  r.setProperty('--qq-accent-light', b.accentWarm);
  r.setProperty('--qq-accent-magenta', b.magenta);
}

export function setActiveThemeId(id: string): void {
  if (!QQ_THEMES[id] || id === _activeId) return;
  _activeId = id;
  applyThemeVars(QQ_THEMES[id]);
  _listeners.forEach((l) => l());
}

export function resolveTheme(id?: string): ResolvedTheme {
  return (id && QQ_THEMES[id]) || COZY;
}

function subscribe(cb: () => void): () => void {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

/** Hook: aktive Theme-ID; löst Re-Render bei Wechsel aus. */
export function useActiveThemeId(): string {
  return useSyncExternalStore(subscribe, getActiveThemeId, getActiveThemeId);
}

/** Ist gerade ein anderes Theme als der Cozy-Default aktiv? */
export function isThemed(): boolean {
  return _activeId !== 'cozy';
}
