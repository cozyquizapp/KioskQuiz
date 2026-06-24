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
import type { CSSProperties } from 'react';
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
  pageBg: string;     // --qq-bg  (Seiten-/Bühnen-Hintergrund)
  text: string;       // --qq-text  (Primärtext auf BG)
  textMuted: string;  // --qq-text-muted
  cardText: string;   // --qq-card-text  (Text AUF Karten; getrennt von text!)
  cardBg: string;     // --qq-card-bg
  cardBorder: string; // --qq-card-border  (volles Shorthand)
  cardRadius: string; // --qq-card-radius
  cardShadow: string; // --qq-card-shadow
  hairline: string;   // --qq-hairline  (dezente Linien/Divider)
  surface: string;    // --qq-surface  (Sub-Karten/Chips)
  overlay: string;    // --qq-overlay  (dunkle Inset-Overlays)
  font: string;       // --qq-font
  title: string;      // --qq-title  (Hero-/Wortmark-Farbe AUF dem BG, kontrast+brand)
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
    text: '#ffffff',
    textMuted: '#94a3b8',
    cardText: '#ffffff',
    cardBg: 'linear-gradient(180deg, #1F1A2E, #14101F)',
    cardBorder: '1px solid rgba(255,255,255,0.10)',
    cardRadius: '20px',
    cardShadow: '0 16px 50px rgba(0,0,0,0.45)',
    hairline: 'rgba(255,255,255,0.10)', surface: 'rgba(255,255,255,0.04)', overlay: 'rgba(0,0,0,0.28)',
    font: "'Nunito', 'Geist', system-ui, sans-serif",
    title: QQ_COLORS.brandPink, // (cozy nutzt eigenen Branch — Fallback)
  },
};

// ── Studio Mono — editorial, hell, scharf (Hard-Shadow + Lime-Akzent) ──────
const STUDIO_MONO: ResolvedTheme = {
  id: 'studioMono', label: 'Studio Mono',
  brand: {
    accentHex: '#111111', accentRgb: '17,17,17', accentSoft: '#E9E7DD',
    accentWarm: '#C9F227', magenta: '#111111',
    gradientPill: 'linear-gradient(135deg, #111 0%, #111 100%)',
  },
  surface: {
    pageBg: '#F3F2EC', text: '#0B0B0B', textMuted: '#6B6B66', cardText: '#0B0B0B',
    cardBg: '#FFFFFF', cardBorder: '2px solid #111111', cardRadius: '4px',
    cardShadow: '6px 6px 0 #111111', hairline: 'rgba(0,0,0,0.12)', surface: 'rgba(0,0,0,0.035)', overlay: 'rgba(0,0,0,0.05)',
    font: "'Bricolage Grotesque', 'Inter', sans-serif",
    title: '#0B0B0B', // editorial: schwarze Hero-Titel
  },
};

// ── Soft Pop — warm-hell, runde bunte Pillen, weiche Schatten ──────────────
const SOFT_POP: ResolvedTheme = {
  id: 'softPop', label: 'Soft Pop',
  brand: {
    accentHex: '#F472A0', accentRgb: '244,114,160', accentSoft: '#FFE3EF',
    accentWarm: '#FBBF24', magenta: '#3B2E7E',
    gradientPill: 'linear-gradient(135deg, #FBBF24 0%, #F472A0 50%, #60A5FA 100%)',
  },
  surface: {
    pageBg: 'radial-gradient(120% 90% at 50% -10%, #FFFBF4 0%, #FFF1E6 55%, #FFE6D3 100%)',
    text: '#2D2A55', textMuted: '#9B8E84', cardText: '#2D2A55',
    cardBg: '#FFFFFF', cardBorder: '1px solid rgba(45,42,85,0.10)', cardRadius: '26px',
    cardShadow: '0 8px 0 rgba(59,46,126,0.14)', hairline: 'rgba(45,42,85,0.10)', surface: 'rgba(45,42,85,0.04)', overlay: 'rgba(45,42,85,0.05)',
    font: "'Nunito', system-ui, sans-serif",
    title: '#2D2A55', // dunkles Indigo (= Primärtext), gut auf warmem BG
  },
};

// ── Neo-Brutalism — lila BG, weiße Karten, dicke schwarze Ränder + Hard-Shadow
const NEO_BRUTAL: ResolvedTheme = {
  id: 'neoBrutal', label: 'Neo-Brutalism',
  brand: {
    accentHex: '#2D4BFF', accentRgb: '45,75,255', accentSoft: '#DCE3FF',
    accentWarm: '#FDE047', magenta: '#FB7185',
    gradientPill: 'linear-gradient(135deg, #2D4BFF 0%, #6D28D9 100%)',
  },
  surface: {
    pageBg: 'linear-gradient(155deg, #9B6DFF 0%, #7C3AED 55%, #6D28D9 100%)',
    text: '#FFFFFF', textMuted: 'rgba(255,255,255,0.78)', cardText: '#16121F',
    cardBg: '#FFFFFF', cardBorder: '3px solid #16121F', cardRadius: '18px',
    cardShadow: '6px 6px 0 #16121F', hairline: 'rgba(22,18,31,0.16)', surface: 'rgba(255,255,255,0.16)', overlay: 'rgba(22,18,31,0.07)',
    font: "'Nunito', system-ui, sans-serif",
    title: '#FDE047', // Gelb — knallt auf Lila, sehr „neo" (Wolf-Wunsch)
  },
};

export const QQ_THEMES: Record<string, ResolvedTheme> = {
  cozy: COZY,
  studioMono: STUDIO_MONO,
  softPop: SOFT_POP,
  neoBrutal: NEO_BRUTAL,
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
  const s = theme.surface;
  // Akzent
  r.setProperty('--qq-accent', b.accentHex);
  r.setProperty('--qq-accent-rgb', b.accentRgb);
  r.setProperty('--qq-accent-soft', b.accentSoft);
  r.setProperty('--qq-accent-light', b.accentWarm);
  r.setProperty('--qq-accent-magenta', b.magenta);
  // Flächen (Lackierung — Layout bleibt unangetastet)
  r.setProperty('--qq-bg', s.pageBg);
  r.setProperty('--qq-text', s.text);
  r.setProperty('--qq-text-muted', s.textMuted);
  r.setProperty('--qq-card-text', s.cardText);
  r.setProperty('--qq-card-bg', s.cardBg);
  r.setProperty('--qq-card-border', s.cardBorder);
  r.setProperty('--qq-card-radius', s.cardRadius);
  r.setProperty('--qq-card-shadow', s.cardShadow);
  r.setProperty('--qq-hairline', s.hairline);
  r.setProperty('--qq-surface', s.surface);
  r.setProperty('--qq-overlay', s.overlay);
  r.setProperty('--qq-font', s.font);
  r.setProperty('--qq-title', s.title);
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

// ── Semantische „Status"-Karten pro Skin ────────────────────────────────────
// Direction A (Wolf 2026-06-24): grün=Lösung / rot=Leer bleiben als Semantik,
// werden aber in der Karten-Sprache des aktiven Skins gerendert (Mono: Hard-
// Shadow, Soft Pop: weicher Bottom-Shadow, Neo: flacher Block + schwarzer Rand)
// — statt überall dieselbe Cozy-Glow-Box. Zentral hier, damit alle Reveals
// (Schätzchen, OnlyConnect, …) dieselbe „Lösung"-Optik teilen (drift-sicher).
export type StatusCardStyle = { bg: string; border: string; radius: string | number; shadow: string; fg: string };

/** „Lösung/richtig"-Card (grüne Semantik) im Karten-Stil des aktiven Skins. */
export function getSolveCardStyle(): StatusCardStyle {
  switch (_activeId) {
    case 'studioMono':
      return { bg: '#F1FBF4', border: '2px solid #15803D', radius: 4, shadow: '6px 6px 0 #15803D', fg: '#15803D' };
    case 'softPop':
      return { bg: '#EAF9EF', border: '1px solid rgba(22,163,74,0.30)', radius: 26, shadow: '0 8px 0 rgba(22,163,74,0.18)', fg: '#15803D' };
    case 'neoBrutal':
      return { bg: '#34D399', border: '3px solid #16121F', radius: 18, shadow: '6px 6px 0 #16121F', fg: '#0A2E1C' };
    default: // cozy — heutige Werte, visual-neutral
      return {
        bg: 'radial-gradient(circle at 50% 35%, rgba(34,197,94,0.18), rgba(22,163,74,0.04) 70%)',
        border: '3px solid rgba(34,197,94,0.6)', radius: 24,
        shadow: '0 0 50px rgba(34,197,94,0.25), inset 0 0 26px rgba(34,197,94,0.08)',
        fg: '#86efac',
      };
  }
}

/** „Leer/kein Treffer"-Card (rote Semantik) im Karten-Stil des aktiven Skins. */
export function getEmptyCardStyle(): StatusCardStyle {
  switch (_activeId) {
    case 'studioMono':
      return { bg: '#FBF2F2', border: '2px solid #DC2626', radius: 4, shadow: '6px 6px 0 #DC2626', fg: '#B91C1C' };
    case 'softPop':
      return { bg: '#FDEEF0', border: '1px solid rgba(220,38,38,0.28)', radius: 26, shadow: '0 8px 0 rgba(220,38,38,0.16)', fg: '#DC2626' };
    case 'neoBrutal':
      return { bg: '#FB7185', border: '3px solid #16121F', radius: 18, shadow: '6px 6px 0 #16121F', fg: '#3A0A12' };
    default: // cozy — heutige Werte, visual-neutral
      return { bg: 'transparent', border: '2px solid rgba(239,68,68,0.4)', radius: 24, shadow: 'none', fg: '#f87171' };
  }
}

// ── Generische Skin-Helper (DRY-Layer für „immer mehr Designs einbauen") ─────
// Zweck (Wolf 2026-06-24): NICHT mehr jedes „Fenster" einzeln mit
// `isThemed() ? 'var(--qq-card-bg)' : …` von Hand theme'n. Stattdessen EIN
// Helper, der im Skin IMMER die Skin-Card-Tokens liefert → Radius/Rand/Schatten
// sind über ALLE Fenster garantiert einheitlich (keine „manche rund, manche
// eckig"-Drift mehr). Bei cozy gibt der Helper `null` zurück → der Caller
// behält seinen heutigen Look (byte-identisch).
//
// Pattern am Call-Site:
//   style={{ ...layout, ...cozyLook, ...(themedWindow({ emphasis }) ?? {}) }}
// Cozy-Werte stehen normal da; im Skin überschreibt der Spread bg/border/
// radius/shadow/color in einem Rutsch. Neues Fenster = eine Zeile mehr.
// Neues Design = NUR ein Theme-Objekt in QQ_THEMES (kein Touch an Komponenten).

export interface ThemedWindowOpts {
  /** Akzent-Rand statt neutralem Card-Rand (z.B. Sieger/Top-Row). */
  emphasis?: boolean;
  /** Grüner „richtig/Treffer"-Rand (semantisches Spielsignal, skin-unabhängig). */
  ok?: boolean;
}

/** Skin-Card-Frame für ein „Fenster" (Card/Panel/Listen-Row). `null` bei cozy. */
export function themedWindow(opts: ThemedWindowOpts = {}): CSSProperties | null {
  if (!isThemed()) return null;
  const border = opts.ok
    ? '2px solid #22C55E'
    : opts.emphasis
      ? '2px solid var(--qq-accent)'
      : 'var(--qq-card-border)';
  return {
    background: 'var(--qq-card-bg)',
    border,
    borderRadius: 'var(--qq-card-radius)',
    boxShadow: 'var(--qq-card-shadow)',
    color: 'var(--qq-card-text)',
  };
}

/** Skin-Chip/Pill (Sub-Element auf BG/Card). `null` bei cozy. */
export function themedChip(opts: { emphasis?: boolean } = {}): CSSProperties | null {
  if (!isThemed()) return null;
  return {
    background: 'var(--qq-surface)',
    border: opts.emphasis ? '1.5px solid var(--qq-accent)' : '1.5px solid var(--qq-hairline)',
    color: 'var(--qq-card-text)',
  };
}
