/**
 * QQ Category Theme — Single Source of Truth fuer Kategorie-Farben.
 *
 * 2026-05-24 (Refactor #4 von 5 — Struktur-Audit-Beschleuniger): Vorher waren
 * Kategorie-Farben in ≥4 Stellen definiert (qqShared.ts BADGE_BG + ACCENT,
 * cozyQuizShared.ts CAT_GLOW, inline-Maps in QQModeratorPage etc.). Bei neuer
 * Kategorie musste das an allen Stellen gepatched werden — Drift-Risiko.
 *
 * Jetzt: alle frontend-spezifischen Maps deriven aus QQ_CATEGORY_THEME.
 *
 * Verhältnis zu QQ_CATEGORY_COLORS (in quarterQuizTypes.ts):
 *  - QQ_CATEGORY_COLORS = Primary-Color (Hex #), helle Variante fuer
 *    Light-Backgrounds / Dot-Markers / Builder-UI.
 *  - QQ_CATEGORY_THEME.accent = Subtle-Variante fuer Dark-Backgrounds
 *    (Beamer-Card-Borders, Mod-Dashboard). Visuell aehnlich aber gedimmt.
 *  - Bei Konflikt: QQ_CATEGORY_COLORS gewinnt fuer Datenelemente; THEME
 *    gewinnt fuer dunkle Hero-UIs.
 */

import type { QQCategory } from './quarterQuizTypes';

export interface QQCategoryThemeEntry {
  /** Hauptakzent — fuer Border, Text-Highlight, Badge-Hover. */
  accent: string;
  /** Dunklere Variante — fuer Badge-Gradient-Start. */
  badgeStart: string;
  /** Hellere Variante — fuer Badge-Gradient-End. */
  badgeEnd: string;
  /** Glow-Color mit Alpha — fuer Question-Card-Halo. */
  glow: string;
}

/** Kanonische Farbpalette pro Kategorie. */
export const QQ_CATEGORY_THEME: Record<QQCategory, QQCategoryThemeEntry> = {
  SCHAETZCHEN: {
    accent:     '#EAB308',
    badgeStart: '#A16207',
    badgeEnd:   '#EAB308',
    glow:       'rgba(234,179,8,0.45)',
  },
  MUCHO: {
    accent:     '#60A5FA',
    badgeStart: '#1E3A8A',
    badgeEnd:   '#2563EB',
    glow:       'rgba(37,99,235,0.45)',
  },
  BUNTE_TUETE: {
    accent:     '#F87171',
    badgeStart: '#991B1B',
    badgeEnd:   '#DC2626',
    glow:       'rgba(220,38,38,0.45)',
  },
  ZEHN_VON_ZEHN: {
    accent:     '#34D399',
    badgeStart: '#065F46',
    badgeEnd:   '#059669',
    glow:       'rgba(5,150,105,0.42)',
  },
  CHEESE: {
    accent:     '#A78BFA',
    badgeStart: '#4C1D95',
    badgeEnd:   '#7C3AED',
    glow:       'rgba(124,58,237,0.45)',
  },
};

/** Helper: Linear-Gradient-String fuer Badge-BG (135deg badgeStart → badgeEnd). */
export function qqCategoryBadgeGradient(cat: QQCategory): string {
  const t = QQ_CATEGORY_THEME[cat];
  return `linear-gradient(135deg, ${t.badgeStart}, ${t.badgeEnd})`;
}

/** Helper: Accent-Color pro Kategorie (mit Fallback fuer unbekannte Strings). */
export function qqCategoryAccent(cat: string | undefined | null, fallback = '#94A3B8'): string {
  if (!cat) return fallback;
  return (QQ_CATEGORY_THEME as any)[cat]?.accent ?? fallback;
}

/** Helper: Glow-Color pro Kategorie (mit Fallback). */
export function qqCategoryGlow(cat: string | undefined | null, fallback = 'rgba(255,255,255,0.20)'): string {
  if (!cat) return fallback;
  return (QQ_CATEGORY_THEME as any)[cat]?.glow ?? fallback;
}
