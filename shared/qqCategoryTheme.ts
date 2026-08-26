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
   *
   * ⚠️ Seit 2026-08-26 baut `qqCategoryStageBg` den Grund NICHT mehr hieraus,
   * sondern aus `grund`. `deep` bleibt als Einzelwert stehen, weil ihn andere
   * Stellen als Flaechenfarbe lesen; wer den BUEHNEN-Grund aendern will,
   * aendert `grund`.
   */
  deep: string;
  /**
   * Die drei Stufen des Buehnen-Grunds, von innen nach aussen.
   *
   * 2026-08-26 (Wolf zum Farbvorschlag: „auf jeden fall der vorschlag").
   * Werte aus docs/BUEHNEN_DESIGN.md, Abschnitt 6.
   *
   * Vorher lief der Grund als `rgba(accent,0.42) → deep → QQ_STAGE_BASE`, die
   * AEUSSERE Stufe war also bei allen fuenf Kategorien dieselbe. Ein roter und
   * ein blauer Abend endeten an derselben Kante. Jetzt hat jede Kategorie drei
   * eigene Stufen und laeuft aussen in ihren eigenen dunkelsten Ton aus.
   *
   * Nebenwirkung, gemessen mit scripts/farbwelten-probe.mjs: die Lichtabgabe
   * faellt um rund 1,2 Prozentpunkte je Kategorie (z.B. 10 von 10 von 8,2 auf
   * 6,5 Prozent). Auf einer Buehne mit harter Lichtgrenze ist das kein
   * Nebeneffekt, sondern ein Gewinn.
   */
  grund: [innen: string, mitte: string, aussen: string];
}

/** Kanonische Farbpalette pro Kategorie. */
export const QQ_CATEGORY_THEME: Record<QQCategory, QQCategoryThemeEntry> = {
  SCHAETZCHEN: {
    accent:     '#FFB03A',
    badgeStart: '#A16207',
    badgeEnd:   '#EAB308',
    glow:       'rgba(255,176,58,0.45)',
    deep:       '#2C2410',
    grund:      ['#2A1B06', '#1A1004', '#0B0702'],
  },
  MUCHO: {
    accent:     '#4C8DFF',
    badgeStart: '#1E3A8A',
    badgeEnd:   '#2563EB',
    glow:       'rgba(76,141,255,0.45)',
    deep:       '#16233F',
    grund:      ['#101A33', '#0A1122', '#05080F'],
  },
  BUNTE_TUETE: {
    accent:     '#F2543D',
    badgeStart: '#991B1B',
    badgeEnd:   '#DC2626',
    glow:       'rgba(242,84,61,0.45)',
    deep:       '#391616',
    grund:      ['#2B0D0A', '#1A0705', '#0A0302'],
  },
  ZEHN_VON_ZEHN: {
    accent:     '#3ED67F',
    badgeStart: '#065F46',
    badgeEnd:   '#059669',
    glow:       'rgba(62,214,127,0.42)',
    deep:       '#1B342C',
    grund:      ['#0B2418', '#071609', '#030A05'],
  },
  CHEESE: {
    accent:     '#9B6BFF',
    badgeStart: '#4C1D95',
    badgeEnd:   '#7C3AED',
    glow:       'rgba(155,107,255,0.45)',
    deep:       '#241C3C',
    grund:      ['#1A1030', '#100A1E', '#06040C'],
  },
};

/**
 * Grundfarbe, in der jeder Kategorie-Grund auslaeuft (Uebergabe 2a).
 * Bewusst nicht #000: warmes Fast-Schwarz, damit Creme-Tinte darauf ruhig liegt.
 */
export const QQ_STAGE_BASE = '#120F18';

/** #RRGGBB -> "r,g,b" (fuer rgba(...)-Strings ohne Alpha-Hex).
 *  2026-08-26: seit der Buehnen-Grund aus `grund` kommt, braucht ihn hier
 *  niemand mehr. Er bleibt, weil `glow` von Hand als rgba gepflegt wird und
 *  der naechste, der eine Kategorie hinzufuegt, ihn genau dafuer sucht. */
export function qqHexTriple(hex: string): string {
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
  // 2026-08-26: drei eigene Stufen je Kategorie statt
  // accent-Schleier → deep → gemeinsame Aussenkante. Der Aufbau bleibt
  // derselbe (heller Punkt oben, dunkel nach aussen), nur kommen die Werte
  // jetzt aus `grund` und sind bis zur Kante kategorie-eigen.
  const [innen, mitte, aussen] = entry.grund;
  return `radial-gradient(${shape} at 50% -8%, ${innen} 0%, ${mitte} 46%, ${aussen} 100%)`;
}
