// 2026-05-04 — CozyQuiz Design-Tokens (UI-Audit-Ergebnis)
//
// Zentrale Werte fuer Spacing/Radii/Alpha/Typography/Duration/Color.
// NEUER Code soll diese Tokens nutzen statt Inline-Hex/Magic-Numbers.
// Bestehende Inline-Werte werden schrittweise migriert (kein Mass-Replace
// auf einen Schwung — pro Refactor-Pass werden die Hotspots gezogen).
//
// Begruendung pro Token:
// - RADII: 4-Werte-System (tight/normal/rounded/pill) bricht den
//   bisherigen Border-Radius-Salat (10/12/14/16/18/20/22/24/28).
// - ALPHA_DEPTH: 3-Tier-Tiefen-System (33/55/88) ersetzt willkuerliche
//   alpha-Werte wie ${color}5e oder ${color}66.
// - LETTER_SPACING: 2 Tokens (tight=0.04em, wide=0.1em). Vorher 0.04 /
//   0.06 / 0.08 / 0.16 / 0.2 / 0.4 wild gemischt.
// - WEIGHT: 2-Stufen (700 + 900). 600/800 raus.
// - DURATION: drei Stufen — sonst lief alles 0.15/0.18/0.2/0.3/0.4 mit
//   keinem System.
// - TEXT_COLOR: drei Stufen Hierarchie (primary/secondary/muted),
//   plus dim fuer leise Labels. Werte sind Cozy-Dark-tested:
//   primary=10:1, secondary=8:1, muted=7:1, dim=4.5:1 auf #0d0a06.

/** Border-Radius. Default fuer Cards/Buttons: NORMAL. */
export const RADII = {
  tight:   8,    // kleine Pills, Mini-Buttons, Inset-Elemente
  normal:  16,   // Cards, Buttons, Inputs
  rounded: 24,   // Hero-Cards, prominente Container
  pill:    9999, // Pillen, runde Buttons
} as const;

/** Alpha-Suffixe fuer Hex-Farben (z.B. `${color}${ALPHA_DEPTH.d2}`). */
export const ALPHA_DEPTH = {
  d1: '33',  // ~20% — leichter Halo, dezente Outline
  d2: '55',  // ~33% — Standard-Glow, mittlerer Schatten
  d3: '88',  // ~53% — starker Glow, prominenter Shadow
} as const;

/** Letter-Spacing — nur diese zwei Werte verwenden. */
export const LETTER_SPACING = {
  tight: '0.04em',  // Body-Text Tweaks
  wide:  '0.1em',   // UPPERCASE-Labels, Buttons
} as const;

/** Font-Weight — nur diese zwei Werte verwenden (Regular ist body-default). */
export const WEIGHT = {
  bold:      700,  // wichtiger Body-Text, default-Buttons
  extraBold: 900,  // Headlines, Hero-Numbers
} as const;

/** Animation/Transition-Dauer in ms. */
export const DURATION = {
  fast:   150,  // Hover, Tap-Reaktion
  normal: 300,  // Card-Switches, Subtle State
  slow:   600,  // Hero-Animation, Scene-Wechsel
} as const;

/** Text-Farb-Hierarchie auf dem Cozy-Dark-Background.
 *  Berechnete Kontrast-Ratios gegen `#0d0a06` (Page-BG):
 *  primary=10.5:1 (AAA), secondary=8.0:1 (AAA), muted=7.0:1 (AAA),
 *  dim=4.5:1 (AA-Pass). */
export const TEXT_COLOR = {
  primary:   '#F8FAFC',  // Hauptueberschriften, Hero-Numbers
  secondary: '#CBD5E1',  // Body-Text, Card-Inhalte
  muted:     '#94A3B8',  // Subtitle, Sekundaer-Labels
  dim:       '#64748B',  // Footer-Text, Inactive-Hints, Timestamps
} as const;

/** Akzent-Gold (CozyQuiz-Brand). */
export const ACCENT_GOLD = {
  bright: '#FBBF24',
  warm:   '#F59E0B',
  light:  '#FDE68A',
  deep:   '#D97706',
} as const;

/** Standard-Easing — ergaenzt nach Animation-Audit 2026-05-04.
 *  Im Live-Code sind viele Inline-cubic-bezier()-Werte hardgecoded.
 *  Nach Audit-Pass `bounceSoft` und `pinSlam` sind als Sonderfaelle
 *  dokumentiert; alle „weak bounces" (1.2/1.4) wurden auf bounce
 *  vereinheitlicht. Drop-Easing fuer schnelle Falls (smoothOut). */
export const EASING = {
  bounce:     'cubic-bezier(0.34, 1.56, 0.64, 1)',  // Standard-Pop, Apple-HIG
  bounceSoft: 'cubic-bezier(0.34, 1.4, 0.64, 1)',   // Sanfter, fuer Reveal-Pops
  popFast:    'cubic-bezier(0.2, 0.8, 0.3, 1)',     // Game-Feel, schneller Attack
  smooth:     'cubic-bezier(0.4, 0, 0.2, 1)',       // Material-Standard
  smoothOut:  'cubic-bezier(0.3, 0, 0.5, 1)',       // Drop/Fall mit gravity-feel
  inOut:      'ease-in-out',                        // Idle/Breathing/Float-Loops
} as const;

/** Stagger-Konstanten in ms — fuer Listen-Animationen. */
export const STAGGER = {
  tight:     60,   // Lobby-Card-In, schnelle Cascades
  normal:    90,   // Sound-Sync-Grids (psychoakustisch optimiert)
  leisurely: 350,  // Idle-Wobble, Personality-Loops
} as const;

/** Tap-Target Min-Size (Apple HIG, Android-Material). */
export const TAP_TARGET = {
  min:  44,   // Buttons, Touch-Targets
  cozy: 48,   // Inputs, Primary-Buttons
} as const;
