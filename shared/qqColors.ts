/**
 * QQ Color Tokens — zentrale Hex-Farb-Konstanten.
 *
 * 2026-05-24 (Refactor: Hex-Tokenisierung): vorher waren ~3900 hardcoded Hex-
 * Codes ueber alle Frontend-Files verteilt. Wenn Wolf z.B. das Brand-Pink
 * (#ec4899) dunkler haben wollte, musste er an 282 Stellen suchen+ersetzen.
 *
 * Konvention: Tailwind-Naming. Was hier NICHT drin ist sollte sparsam direkt
 * im File bleiben (Eigennamen, Theme-spezifische Glow-Variants etc.).
 *
 * Nutzung:
 *   import { QQ_COLORS } from '@shared/qqColors';
 *   <div style={{ color: QQ_COLORS.slate400 }}>...
 *
 * Migration-Strategie: lokale `const SLATE400 = QQ_COLORS.slate400` Aliase im
 * File-Header sind OK fuer dichte Verwendung — vermeidet Long-Reference-
 * Spam in JSX-Style-Objekten.
 */

export const QQ_COLORS = {
  // ── Slate-Skala (Greys) — am haeufigsten genutzt ─────────────────────────
  /** Slate-50 — fast weiss, fuer Hero-Text. */
  slate50:  '#f8fafc',
  /** Slate-100 — Light-Subtext. */
  slate100: '#f1f5f9',
  /** Slate-200 — Body-Text auf Dark-BG. */
  slate200: '#e2e8f0',
  /** Slate-300 — Sekundaer-Text. */
  slate300: '#cbd5e1',
  /** Slate-400 — Caption-Text, Borders. */
  slate400: '#94a3b8',
  /** Slate-500 — Subtle Borders, Disabled-Text. */
  slate500: '#64748b',
  /** Slate-600 — Dark Subtle. */
  slate600: '#475569',
  /** Slate-700 — Card-Borders. */
  slate700: '#334155',
  /** Slate-800 — Card-BG-Hover. */
  slate800: '#1e293b',
  /** Slate-900 — Page-BG. */
  slate900: '#0f172a',
  /** Slate-950 — Deepest BG. */
  slate950: '#020617',

  // ── Brand-Farben ──────────────────────────────────────────────────────────
  /** Pink-500 = CozyWolf Brand-Pink. */
  brandPink:    '#ec4899',
  /** Pink-300 = Soft Pink-Akzent (Streaks, Highlights). */
  brandPinkSoft: '#fbcfe8',
  /** Pink-400 = Sekundaer-Pink. */
  brandPinkMid:  '#f472b6',
  /** ESC-Magenta. */
  brandMagenta: '#a21247',
  /** Navy-BG der Brand. */
  brandNavy:    '#1e2a5a',

  // ── Status-Farben (Erfolg / Warnung / Fehler / Info) ─────────────────────
  /** Green-500 — Correct, Erfolg. */
  green500: '#22c55e',
  /** Green-400 — Highlights. */
  green400: '#4ade80',
  /** Green-300 — Soft Green-Akzent. */
  green300: '#86efac',
  /** Red-500 — Fehler, Wrong. */
  red500:   '#ef4444',
  /** Red-300 — Soft Red. */
  red300:   '#fca5a5',
  /** Amber-500 — Warnung, Schaetzchen-Akzent. */
  amber500: '#f59e0b',
  /** Amber-400 — Highlights / Crown. */
  amber400: '#fbbf24',
  /** Yellow-500 = Gold. */
  yellow500: '#eab308',
  /** Yellow-300 — Soft Gold. */
  yellow300: '#fde68a',
  /** Blue-500 — Info, MUCHO-Akzent. */
  blue500:   '#3b82f6',
  /** Blue-400 — Lighter Info. */
  blue400:   '#60a5fa',

  // ── Category-Accents (Subtle für Dark-BG) ────────────────────────────────
  /** Violet-400 — CHEESE-Akzent. */
  violet400: '#a78bfa',
  /** Violet-500 — CHEESE-Primary. */
  violet500: '#8b5cf6',
  /** Emerald-500 — ZEHN_VON_ZEHN-Akzent. */
  emerald500: '#34d399',

  // ── Surface (Card / Overlay BG) ──────────────────────────────────────────
  /** Hauptseiten-Hintergrund. */
  bgPage:   '#0a0814',
  /** Card-Background (dark cozy gradient base). */
  bgCard:   '#14101f',
  /** Card-Background (dark cozy gradient secondary). */
  bgCardAlt: '#1f1a2e',

  // ── Misc ─────────────────────────────────────────────────────────────────
  /** Pure White — selten direkt verwendet. */
  white: '#ffffff',
  /** Pure Black. */
  black: '#000000',
  /** Orange-500 — BUZZER-Akzent. */
  orange500: '#f97316',
  /** Orange-700 — Bronze-Medaille. */
  orange700: '#b45309',
} as const;

/** Type fuer alle Token-Keys. */
export type QQColorKey = keyof typeof QQ_COLORS;
