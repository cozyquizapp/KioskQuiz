// 2026-05-04 — CozyQuiz Design-Tokens (UI-Audit-Ergebnis)
// 2026-05-05 — Phase-4-Erweiterung: ALPHA_DEPTH d0/d4, LETTER_SPACING.hero,
//              DURATION.idle/spotlight, QQ_PHASE_COLORS (siehe AUDIT_FINDINGS L2-L4, L8, L10).
//
// Zentrale Werte fuer Spacing/Radii/Alpha/Typography/Duration/Color.
// NEUER Code soll diese Tokens nutzen statt Inline-Hex/Magic-Numbers.
// Bestehende Inline-Werte werden schrittweise migriert (kein Mass-Replace
// auf einen Schwung — pro Refactor-Pass werden die Hotspots gezogen).
//
// Begruendung pro Token:
// - RADII: 4-Werte-System (tight/normal/rounded/pill) bricht den
//   bisherigen Border-Radius-Salat (10/12/14/16/18/20/22/24/28).
//   Strict — kein RADII.compact (6px). Inline-6er werden auf tight (8) gesnappt.
// - ALPHA_DEPTH: 5-Tier-Tiefen-System (1A/33/55/88/B3) ersetzt willkuerliche
//   alpha-Werte wie ${color}5e oder ${color}66. d0/d4 fangen die 0.10/0.70-Faelle ab
//   (z.B. Reveal-Card-BG-Tint, Hot-Potato-Watermark).
// - LETTER_SPACING: 3 Tokens (tight=0.04em, wide=0.1em, hero=0.22em).
//   Strict — Body-Werte (0.06/0.08/0.12/0.16) snappen auf tight oder wide.
//   Hero-Slot legalisiert die echten Hero-Spreizungen (Wordmark/Intro-Title).
// - WEIGHT: 2-Stufen (700 + 900). 600/800 raus.
// - DURATION: 5 Stufen — fast/normal/slow fuer Interaktionen, idle fuer
//   Breathing-Loops, spotlight fuer Auto-Advance.
// - TEXT_COLOR: drei Stufen Hierarchie (primary/secondary/muted),
//   plus dim fuer leise Labels. Werte sind Cozy-Dark-tested:
//   primary=10:1, secondary=8:1, muted=7:1, dim=4.5:1 auf #0d0a06.
// - QQ_PHASE_COLORS: 3-Element-Array fuer die 3 Game-Phasen
//   (PhaseIntroView, RoundTransition). Vorher inline in QQBeamerPage:4080+12198.

/** Border-Radius. Default fuer Cards/Buttons: NORMAL. */
export const RADII = {
  tight:   8,    // kleine Pills, Mini-Buttons, Inset-Elemente
  normal:  16,   // Cards, Buttons, Inputs
  rounded: 24,   // Hero-Cards, prominente Container
  pill:    9999, // Pillen, runde Buttons
} as const;

/** Alpha-Suffixe fuer Hex-Farben (z.B. `${color}${ALPHA_DEPTH.d2}`). */
export const ALPHA_DEPTH = {
  d0: '1A',  // ~10% — Hauch, allerleichteste Outline (Reveal-Card-BG, Watermark-Subtle)
  d1: '33',  // ~20% — leichter Halo, dezente Outline
  d2: '55',  // ~33% — Standard-Glow, mittlerer Schatten
  d3: '88',  // ~53% — starker Glow, prominenter Shadow
  d4: 'B3',  // ~70% — starker Tint, Hot-Potato-Watermark, dichte Card-Glows
} as const;

/** Letter-Spacing — nur diese drei Werte verwenden.
 *  hero ist ausschliesslich fuer Hero-Wordmark / Intro-Title gedacht
 *  (extreme Spreizung als Stilmittel, nicht fuer Body). */
export const LETTER_SPACING = {
  tight: '0.04em',  // Body-Text Tweaks
  wide:  '0.1em',   // UPPERCASE-Labels, Buttons
  hero:  '0.22em',  // Hero-Wordmark, Intro-Title (Sondersfall)
} as const;

/** Font-Weight — nur diese zwei Werte verwenden (Regular ist body-default). */
export const WEIGHT = {
  bold:      700,  // wichtiger Body-Text, default-Buttons
  extraBold: 900,  // Headlines, Hero-Numbers
} as const;

/** Animation/Transition-Dauer in ms. */
export const DURATION = {
  fast:      150,   // Hover, Tap-Reaktion
  normal:    300,   // Card-Switches, Subtle State
  slow:      600,   // Hero-Animation, Scene-Wechsel
  idle:      2400,  // Idle-Loops, Breathing-Glow, Pulse-Wartezustaende
  spotlight: 3500,  // Auto-Advance-Spotlight (GameOver-Hero, Recap-Stages)
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

/** Game-Phase-Farben — Pink-Eskalation Richtung Finale.
 *  Index 0/1/2/3 = Phase 1/2/3/4. Letzte Phase ist immer das intensivste
 *  Magenta — wenn das Quiz nur 3 Runden hat, ist Phase 3 = #A21247 (Index 2).
 *  Wenn 4 Runden, ist Phase 4 = #A21247 (Index 3).
 *  2026-05-08 (Wolf 'finale farbe von letzter runde uebernehmen'):
 *  vorher 3-Element-Array mit modulo %3 → Phase 4 fiel auf Index 0 (light pink),
 *  was die letzte Runde SCHWAECHER aussehen liess. Jetzt 4-Element-Array,
 *  Helper getRoundColor mappt totalPhases-aware. */
export const QQ_PHASE_COLORS = ['#F9A8D4', '#F472B6', '#EC4899', '#A21247'] as const;

/** Liefert die Brand-Pink-Farbe fuer eine Game-Phase, totalPhases-aware.
 *  - Wenn 3 Runden: Phase 1=index 0, Phase 2=index 2, Phase 3=index 3 (Finale-Magenta)
 *  - Wenn 4 Runden: Phase 1-4 = index 0-3 direkt
 *  Garantiert: letzte Phase ist immer #A21247 (Magenta-Brand). */
export function getRoundColor(phaseIdx: number, totalPhases: number = 4): string {
  const last = QQ_PHASE_COLORS.length - 1;
  if (phaseIdx <= 0) return QQ_PHASE_COLORS[0];
  if (phaseIdx >= totalPhases) return QQ_PHASE_COLORS[last];
  if (totalPhases === 3) {
    // 3 Phasen: 1→0, 2→2, 3→3 (skip 1 fuer mehr Distanz zwischen Phasen)
    return QQ_PHASE_COLORS[Math.min(last, [0, 2, 3][phaseIdx - 1] ?? phaseIdx - 1)];
  }
  return QQ_PHASE_COLORS[Math.min(last, phaseIdx - 1)];
}

/** Standard-Easing — ergaenzt nach Animation-Audit 2026-05-04.
 *  Im Live-Code sind viele Inline-cubic-bezier()-Werte hardgecoded.
 *  Nach Audit-Pass `bounceSoft` und `pinSlam` sind als Sonderfaelle
 *  dokumentiert; alle „weak bounces" (1.2/1.4) wurden auf bounce
 *  vereinheitlicht. Drop-Easing fuer schnelle Falls (smoothOut).
 *  outCubic ergaenzt 2026-05-05 (Phase-4 CC-2) — haeufigster Inline-Wert. */
export const EASING = {
  bounce:     'cubic-bezier(0.34, 1.56, 0.64, 1)',  // Standard-Pop, Apple-HIG
  bounceSoft: 'cubic-bezier(0.34, 1.4, 0.64, 1)',   // Sanfter, fuer Reveal-Pops
  popFast:    'cubic-bezier(0.2, 0.8, 0.3, 1)',     // Game-Feel, schneller Attack
  smooth:     'cubic-bezier(0.4, 0, 0.2, 1)',       // Material-Standard
  smoothOut:  'cubic-bezier(0.3, 0, 0.5, 1)',       // Drop/Fall mit gravity-feel
  outCubic:   'cubic-bezier(0.22, 1, 0.36, 1)',     // Card-Reveal, Slide-In, Hero-Entry
  inOut:      'ease-in-out',                        // Idle/Breathing/Float-Loops
} as const;

/** Stagger-Konstanten in ms — fuer Listen-Animationen.
 *  2026-05-05 (Animation-Audit): semantische Namen fuer Cascade-Rhythmus —
 *  Letter/Avatar/Option ersetzen die fuenf willkuerlichen Inline-Werte
 *  (40/50/60/85/250) ueber Welcome, Rules, Top5, MUCHO, OnlyConnect, ZvZ. */
export const STAGGER = {
  tight:     60,   // Lobby-Card-In, schnelle Cascades
  normal:    90,   // Sound-Sync-Grids (psychoakustisch optimiert)
  leisurely: 350,  // Idle-Wobble, Personality-Loops
  // Semantic per content-type:
  letter:    50,   // Letter-by-Letter Cascades (Welcome-Title, Rules-Title)
  avatar:    90,   // Avatar-Reihen (Top5/CHEESE/OnlyConnect Reveal-Cascade)
  option:    180,  // Option-Card-Reveals (MUCHO/ZvZ Step-by-Step)
} as const;

/** Tap-Target Min-Size (Apple HIG, Android-Material). */
export const TAP_TARGET = {
  min:  44,   // Buttons, Touch-Targets
  cozy: 48,   // Inputs, Primary-Buttons
} as const;

/** Shadow-Tokens (UI-Audit 2026-05-05).
 *  Max-2-Layer-Pattern: 1 hard (kein Blur) + 1 soft (mit Blur) ersetzt
 *  willkuerliche 3-6-Layer-Stacks. 3D-Plaettchen-Look (Tile/Card) bleibt
 *  durch inset-Highlight + inset-Bottom-Shadow erhalten — die zaehlen als
 *  „shape-defining" und nicht als „shadow-layer" im Audit-Sinn.
 *
 *  Glow-Pattern: nur EIN zusaetzlicher Glow gleichzeitig (priorisiert via
 *  Helper `pickGlow()`), nicht akkumuliert. Verhindert 5-7-Layer-Stacks. */
export const SHADOW = {
  // Standard-Card (Header-Pille, Reveal-Card, Action-Card)
  card:    '0 4px 0 rgba(0,0,0,0.25), 0 8px 16px rgba(0,0,0,0.30)',
  // Hero-Card (riesig, GameOver, Comeback-Intro)
  hero:    '0 8px 0 rgba(0,0,0,0.30), 0 16px 36px rgba(0,0,0,0.40)',
  // Tile (Brett-Cells, Stack-Inner-Layers) — kompakter Drop, keine Boom
  tile:    '2px 3px 0 rgba(0,0,0,0.40), 0 5px 9px rgba(0,0,0,0.30)',
  // Lift (Modals, Floating-Bubbles, Spotlight-Cards)
  lift:    '0 12px 24px rgba(0,0,0,0.45)',
} as const;

// ════════════════════════════════════════════════════════════════════════════
// Z-INDEX-ZONEN (2026-05-12 Slide-Boundary-System Regel #6)
// ════════════════════════════════════════════════════════════════════════════
// Konvention fuer alle z-index-Werte: semantische Zonen statt wilder
// Magic-Numbers. Vorher (vor 2026-05-12) hatten wir wild verstreut
// 0/1/2/4/5/6/8/10/50/52/60/70/9000/9990/9995/9998/99999 — mit Kollisionen
// die schwer zu debuggen sind (Heute: Cheese-Overlay-Badge auf z70 verdeckt
// Bottom-Left-Badge auf z60 — bewusste z-Order, aber so nur durchgaengig
// nachvollziehbar wenn man beide Werte parallel kennt).
//
// **NEUER Code soll diese Tokens nutzen statt Inline-Zahlen.** Bestehende
// z-index-Werte in QQBeamerPage werden NICHT auf einen Schwung migriert
// (Risiko, viele Subtle-Stacking-Order-Effekte) — beim naechsten Touch der
// jeweiligen View-Datei kann der Wert auf das passende Token gezogen werden.
//
// Numerische Bereiche entsprechen den HEUTIGEN tatsaechlichen Werten im
// Code — neue Sites nutzen die Tokens, alte Werte bleiben kompatibel.
export const Z_INDEX = {
  /** Hintergrund-Layer (BG-Image, Tinted-Backdrop). 0-4. */
  background:     0,
  /** Dekorations-Effekte (Fireflies, Grain, Sweep-Light). 5-9. */
  decoration:     5,
  /** View-Content (Cards, Buttons, normaler Slide-Inhalt). 10-19. */
  content:       10,
  /** Inset-Content (Cell-Overlay, Tile-Inner-Layer). 20-49. */
  insetOverlay:  20,
  /** Slide-Overlay (Cheese-Picture-Frosted-Card, Frosted-Reveal-Layer). 50-59. */
  slideOverlay:  52,
  /** Top-Bar Items (Kategorie-Badge, Timer-Wrapper). 60-69. */
  topBar:        60,
  /** Cheese-Top-Bar (auf Cheese-Picture, ueber slideOverlay). 70-79. */
  cheeseTopBar:  70,
  /** Modal-Layer (Confetti-Overlay, Spotlight, Race-Hero). 8000-8999. */
  modal:       8500,
  /** Global Overlays (Grain-Texture, Eurovision-Hearts). 9000-9994. */
  globalOverlay: 9000,
  /** Toast / AckError / Notifications. 9995-9999. */
  toast:       9995,
  /** Top-most (System-Modals, Quit-Confirms, Connection-Warnings). 99999+. */
  topMost:    99999,
} as const;
//
// REGEL bei z-index-Kollisionen (z.B. zwei Overlays auf gleicher Zone):
//   - Statt einen z-index zu erhoehen: pruefen, ob die Elements sich
//     ueberhaupt im DOM gleichzeitig befinden duerfen.
//   - Wenn ja: explizit innerhalb der Zone abstufen (slideOverlay 52, 53, 54).
//   - Konvention: kein Sprung ueber Zonen-Grenzen ohne Doku-Kommentar.
//
// ════════════════════════════════════════════════════════════════════════════
// SLIDE-LAYOUT-REGELN (2026-05-12, Wolf 'zentrale regeln fuer slide-boundary')
// ════════════════════════════════════════════════════════════════════════════
// Konventions-Doku, keine Tokens — diese Patterns muessen beim Schreiben
// neuer View-Code gefolgt werden. Begruendung jeweils aus konkretem Bug.
//
// REGEL #1 — min-height:0 Chain
//   Jeder Flex-Column-Container (`display:flex flexDirection:column`) bekommt
//   `minHeight: 0`. Sonst koennen Children ueber den Container wachsen und
//   nachfolgende Sibling-Items aus dem Viewport draengen.
//   Bug-Quelle: MUCHO R1 Felder rutschen unten raus, Hot Potato eliminated
//   row push (2026-05-12).
//
// REGEL #2 — Safe-Margin Token
//   Top/Right/Bottom/Left-Positionen relativ zum Slide-Edge nutzen die CSS-
//   Var `--qq-safe-margin` (clamp(20px, 2.2vh, 32px)) statt eigener clamp-
//   Werte. Token wird in main.css :root definiert. Vorteil: zentrale Tweak-
//   Stelle, garantiert konsistenter Rand auf allen Slides.
//
// REGEL #3 — SlotTransition fuer Multi-Step-Choreos
//   Wenn eine View mehrere "Slot-Zustaende" durchlaeuft (z.B. Bet-Reveal
//   slot 0 → slot 1 → slot 2), den vorherigen Slot ueber `<SlotTransition>`
//   mit Exit-Animation auslaufen lassen — kein harter Frame-Cut. Component
//   liegt in QQBeamerPage.tsx (Z. ~16240). Signature:
//     <SlotTransition slotKey=... exitAnimation=... exitMs=...>{...}</SlotTransition>
//
// REGEL #4 — Animation-Scale-Safety in Sibling-Rows
//   Wenn N Elemente in einer Reihe "gleich gross" sein sollen, sind
//   `scale(...)`-Aenderungen in der Entry-Animation VERBOTEN auf dem
//   Layout-Box-aussersten Wrapper. Slam-Effekte nutzen translateY + rotate
//   + blur + opacity (= scale-frei), nicht scale.
//   Bug-Quelle (6 mal!): ActionCardReveal mit qqGsTeamSlam skalierte 2→
//   1.18→0.96→1 ueber 1.4s — die isNew Card war waehrend dieser Zeit
//   visuell bis zu 18% groesser als ihre nebenan settled non-isNew
//   Geschwister. Fix: dediziertes qqActionCardSlam-Keyframe ohne scale.
//   Anwenden: wenn du eine neue "N gleich grosse Cards"-Reihe baust und
//   eine Slam-Entry-Animation willst, KOPIERE qqActionCardSlam (nicht
//   qqGsTeamSlam). qqGsTeamSlam bleibt ok wenn das Element ALLEIN steht
//   (z.B. Teams-Reveal-Hero).
//
// REGEL #5 — Sibling-Width-Consistency Pattern
//   Cards in einer Row die "gleich gross" sein sollen:
//   1. ALLE visuellen Props (border, padding, background, boxShadow,
//      borderRadius) am SELBEN DOM-Layer. Wenn eine Card via 3D-Flip-
//      Wrapper geht, muessen die visuellen Props auf den absolute-positioned
//      Card-Front/Back gehen (NICHT auf den Outer-Wrapper) — siehe
//      ActionCardReveal.
//   2. ALLE Outer-Wrapper haben `flex: '1 1 0'` (basis 0 → wirklich gleich
//      verteilt, nicht auto-content-size). Plus `minWidth` und `maxWidth`
//      als harte Constraints + `boxSizing: 'border-box'`.
//   3. ALLE Inner-Boxes mit `position:absolute, inset:0` haben EXPLIZIT
//      `boxSizing: 'border-box'` — Default content-box driftet bei 3px+
//      Border um 6-12 px gegen border-box-Geschwister.
//   4. KEINE `filter: drop-shadow(...)` auf einzelnen Geschwistern — die
//      erweitern die visuelle Bounding-Box. boxShadow ist ok (rendert
//      ausserhalb der Layout-Box ohne sie zu vergroessern).
//   5. Regel #4 (no-scale-animation) gilt zwingend mit.
//
// ════════════════════════════════════════════════════════════════════════════

/** Helper: pickt EINEN Glow je State-Priorität — vermeidet Stack-Akkumulation
 *  wenn z.B. Cell gleichzeitig accent + highlighted + star ist. */
export function pickGlow(opts: {
  accent?: { color: string; px?: number };
  highlight?: { color: string; px?: number };
  starGold?: boolean;
}): string {
  if (opts.accent) {
    const px = opts.accent.px ?? 24;
    return `0 0 ${px}px ${opts.accent.color}bb`;
  }
  if (opts.starGold) {
    return '0 0 10px rgba(251,191,36,0.50)';
  }
  if (opts.highlight) {
    const px = opts.highlight.px ?? 14;
    return `0 0 ${px}px ${opts.highlight.color}88`;
  }
  return '';
}
