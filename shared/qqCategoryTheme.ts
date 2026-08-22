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
  /**
   * Tiefe Fassung desselben Farbtons — die mittlere Stufe des Buehnen-Grunds
   * (Uebergabe 2a, Aenderung 1: „Die Kategorie traegt den Grund").
   * Regel: Hue bleibt, Saettigung etwa halbiert, Helligkeit auf ~15%.
   * MUCHO/SCHAETZCHEN/CHEESE sind die abgenommenen Werte aus der Vorlage,
   * BUNTE_TUETE/ZEHN_VON_ZEHN nach derselben Regel abgeleitet.
   */
  deep: string;
}

/** Kanonische Farbpalette pro Kategorie. */
export const QQ_CATEGORY_THEME: Record<QQCategory, QQCategoryThemeEntry> = {
  SCHAETZCHEN: {
    accent:     '#EAB308',
    badgeStart: '#A16207',
    badgeEnd:   '#EAB308',
    glow:       'rgba(234,179,8,0.45)',
    deep:       '#2C2410',
  },
  MUCHO: {
    accent:     '#60A5FA',
    badgeStart: '#1E3A8A',
    badgeEnd:   '#2563EB',
    glow:       'rgba(37,99,235,0.45)',
    deep:       '#16233F',
  },
  BUNTE_TUETE: {
    accent:     '#F87171',
    badgeStart: '#991B1B',
    badgeEnd:   '#DC2626',
    glow:       'rgba(220,38,38,0.45)',
    deep:       '#391616',
  },
  ZEHN_VON_ZEHN: {
    accent:     '#34D399',
    badgeStart: '#065F46',
    badgeEnd:   '#059669',
    glow:       'rgba(5,150,105,0.42)',
    deep:       '#1B342C',
  },
  CHEESE: {
    accent:     '#A78BFA',
    badgeStart: '#4C1D95',
    badgeEnd:   '#7C3AED',
    glow:       'rgba(124,58,237,0.45)',
    deep:       '#241C3C',
  },
};

/**
 * Grundfarbe, in der jeder Kategorie-Grund auslaeuft (Uebergabe 2a).
 * Bewusst nicht #000: warmes Fast-Schwarz, damit Creme-Tinte darauf ruhig liegt.
 */
export const QQ_STAGE_BASE = '#120F18';

/** #RRGGBB -> "r,g,b" (fuer rgba(...)-Strings ohne Alpha-Hex). */
function hexTriple(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

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

/**
 * Positionsfarben der vier Antwortoptionen (A–D) — Uebergabe 2a, Aenderung 4.
 *
 * Vorher standen hier vier verschiedene Farben (blau, rot, pink/amber, gruen),
 * einmal in QQBeamerPage und einmal — schon auseinandergedriftet — in
 * QQCustomSlide. Zwei davon sind in einem Quiz bereits belegt: Rot heisst
 * falsch, Gruen heisst richtig. Als Positionsfarbe kollidieren sie mit der
 * Wertung, am staerksten auf der Aufloesung, wo Option B rot und Option D gruen
 * eingefaerbt neben der tatsaechlichen Bewertung stehen.
 *
 * Jetzt tragen alle vier Positionen denselben Kategorie-Akzent — die Position
 * steht ohnehin im Buchstaben, dafuer braucht es keine Farbe. Gruen gehoert ab
 * hier allein der richtigen Antwort.
 */
export function qqOptionColors(cat: string | undefined | null, fallback = '#94A3B8'): string[] {
  const accent = qqCategoryAccent(cat, fallback);
  return [accent, accent, accent, accent];
}

/** Helper: tiefe Fassung des Kategorie-Tons (mittlere Stufe des Buehnen-Grunds). */
export function qqCategoryDeep(cat: string | undefined | null, fallback = QQ_STAGE_BASE): string {
  if (!cat) return fallback;
  return (QQ_CATEGORY_THEME as any)[cat]?.deep ?? fallback;
}

/**
 * Buehnen-Grund pro Kategorie — Uebergabe 2a, Aenderung 1.
 *
 * „Die Kategorie traegt den Grund": statt eines konstanten Navy laeuft ein
 * radialer Verlauf von oben durchs Bild, oben am hellsten. Aus dem Augenwinkel
 * sagt allein die Flaeche, welche Kategorie laeuft — ohne dass ein Label
 * gelesen werden muss.
 *
 * Lichtabgabe: geschaetzt 12–15 % und damit die bewusste Ausnahme von der
 * 12-%-Regel (Abnahme, Zeile 2). Gemessen kostet eine Kategoriefarbe rund ein
 * Drittel des Lichts derselben Flaeche in Weiss, bei gleicher Lesbarkeit —
 * deshalb sind grosse farbige Flaechen erlaubt und weisse nicht.
 *
 * Ohne Kategorie (Lobby, Regeln, Pause) bleibt der Grund neutral: dort ist die
 * einzige Farbe die der Teams, damit jedes Beitreten ein Ereignis bleibt.
 */
export function qqCategoryStageBg(
  cat: string | undefined | null,
  opts: {
    /**
     * Form des Verlaufs. 'circle' ist die Buehne: 1760 × 990 im Querformat, da
     * legt ein Kreis den hellsten Punkt sauber ueber die Bildmitte.
     *
     * 'ellipse' ist das Handy: im Hochformat wuerde derselbe Kreis seinen
     * Radius an der weitesten Ecke messen und den Verlauf ueber die ganze
     * Hoehe ziehen — der Farbton waere da, die Form nicht. Die Ellipse folgt
     * dem Seitenverhaeltnis und sieht in der Hand aus wie an der Wand.
     * Gleiche Farben, gleiche Stops, andere Geometrie.
     */
    shape?: 'circle' | 'ellipse';
  } = {},
): string | null {
  if (!cat) return null;
  const entry = (QQ_CATEGORY_THEME as any)[cat] as QQCategoryThemeEntry | undefined;
  if (!entry) return null;
  const shape = opts.shape ?? 'circle';
  return `radial-gradient(${shape} at 50% -8%, rgba(${hexTriple(entry.accent)},0.42) 0%, ${entry.deep} 46%, ${QQ_STAGE_BASE} 100%)`;
}
