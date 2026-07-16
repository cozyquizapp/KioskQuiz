/**
 * CozyQuizRulesView — Slide-Praesentation der Spielregeln vor jeder Partie.
 *
 * Multi-Slide-Carousel mit Animationen: pro Slide Title-Drop + Lines-Stagger +
 * (optional) Mini-Grid-Example + Tree-Showcase + Ability-Badges + Hero-Joker-
 * PNGs. Slide-Texte sind via /rules-editor (localStorage-Override) editierbar,
 * Defaults bleiben hier als Fallback im Code.
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-12 (Refactor Phase 3).
 * Mit-extrahiert: AbilityBadge + RulesSlide Types, RULES_SLIDE_COLOR,
 * buildRulesSlidesDe, buildRulesSlidesEn, RulesMiniGrid (alle nur hier
 * verwendet).
 *
 * 1 externer Importer (QQBuiltinSlide).
 */
import { useRef, useEffect } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { useLangFlip } from '../cozyQuizShared';
import { isThemed, getActiveTheme } from '../qqTheme';
import { getRuleText, useRuleOverridesVersion } from '../qqRuleTexts';
import { QQIcon, QQEmojiIcon } from './QQIcon';
import { CozyGameIcon } from './CozyGameIcon';
import { JokerIcon } from './JokerIcon';
import { Fireflies } from './CozyQuizAmbient';
import QQProgressTree from './QQProgressTree';

// ═══════════════════════════════════════════════════════════════════════════════
// RULES PRESENTATION
// ═══════════════════════════════════════════════════════════════════════════════

type AbilityBadge = {
  /** PNG-Slug aus QQIcon, falls vorhanden — sonst nur Emoji. */
  slug?: 'marker-shield' | 'marker-sanduhr' | 'marker-swap';
  emoji: string;
  label: string;
  accent: string;
};
type RulesSlide = {
  icon: string;
  /** 2026-07-09 (Motion-Audit): optionales Custom-3D-Icon (/icons/<id>.png) statt
   *  Emoji — z.B. cg-cozygames auf der CozyGame-Slide, konsistent zum Rad-Intro. */
  iconImg?: string;
  title: string;
  color: string;
  lines: string[];
  extra?: string;
  /** 2026-06-28 (Wolf): überschreibt das „Spielregeln"-Eyebrow (z.B. Intro-Slide
   *  „Vorbereitung"). Default bleibt rules.header. */
  eyebrow?: string;
  /** Mini grid example: 2D array — 'A' = team A, 'B' = team B, '⭐' = joker star, '🏯' = stacked, null = empty */
  grid?: { cells: (string | null)[][]; colorA: string; colorB: string; label?: string };
  /** Rendert stattdessen den Fortschrittsbaum (Phasen + Fragen-Punkte). */
  showTree?: boolean;
  /** Eigene Folie: Tree riesig + Phasen-Sweep-Animation (Roadmap-Vorstellung). */
  treeShowcase?: boolean;
  /** Zeigt Ability-Badges (Bann, Schild, Tauschen, Stapeln) als Icon-Strip unter den Lines. */
  abilities?: AbilityBadge[];
  /** Wenn true, ersetzt das Slide-Icon-Emoji durch ein Pärchen Joker-PNGs (Boy+Girl) mit Wiggle. */
  heroJokers?: boolean;
  /** 2026-05-09 (Wolf): wenn true, Slide nur zeigen wenn connectionsEnabled
   *  im State true ist. Bisher fest verdrahtet für Slide 8 (4×4-Finale). */
  requiresConnections?: boolean;
  /** 2026-05-17 (Wolf): wenn true, Slide nur zeigen wenn cozyGamesEnabled aktiv. */
  requiresCozyGames?: boolean;
  /** 2026-05-17 (Wolf): wenn true, Slide nur zeigen wenn comebackEnabled !== false. */
  requiresComeback?: boolean;
};

// Wolf 2026-05-05: Slide-Texte sind editierbar via /rules-editor (localStorage-
// Override). Defaults bleiben hier als Fallback im Code stehen.
// 2026-05-08 (Wolf-Wunsch 'regelslides einheitlich im brand'): vorher hatte
// jede Slide eine random-wirkende Farbe (Blau/Violett/Pink/Rot/Grün/Lila),
// jetzt einheitlich Brand-Pink. Ueber alle Slides + sprachen.
const RULES_SLIDE_COLOR = '#EC4899';

function buildRulesSlidesDe(totalPhases: 3 | 4): RulesSlide[] {
  const t = (k: string, fb: string) => getRuleText(k, 'de', fb);
  // 2026-05-09 (Wolf): Neue-Fähigkeiten-Slide raus — Klauen/Stapeln werden
  // beim Runden-Intro (R2/R3) als Überraschung enthüllt (3D-Card-Flip mit
  // NEU-Badge), Wolf erklärt sie dann live.
  return [
    // 2026-05-23 (Wolf-Live-Test #P): Grid-Preview auf Slide 1 ergaenzt
    // damit Teams sich von Anfang an etwas darunter vorstellen koennen.
    // Wolf-Feedback: „Rules waren viel zu lang" — daher hier nur die
    // visuelle Aha-Wirkung, Slide 2 bleibt fuer das Flow-Detail.
    {
      icon: '🏆',
      title: t('rules.slide1.title', 'Das Ziel'),
      color: RULES_SLIDE_COLOR,
      // 2026-05-24 (Wolf): Mechanik-Bullet 'richtig → 1 Feld setzen' direkt
      // aufs Goal-Slide gezogen, damit How-It-Works keine eigene Slide mehr
      // braucht.
      lines: [
        t('rules.slide1.line1', 'Größtes zusammenhängendes Gebiet gewinnt'),
        t('rules.slide1.line2', 'Frage richtig → 1 Feld setzen'),
      ],
      grid: {
        // Beispiel-Brett: blaues Team hat 5 zusammenhaengende Felder = die
        // groesste Region. Teams sehen sofort visuell was "verbunden" heisst.
        cells: [
          ['A', 'A', 'A', null],
          ['A', 'A', null, null],
          [null, null, null, null],
          [null, null, null, null],
        ],
        colorA: '#3B82F6', colorB: '#EF4444',
        label: 'Beispiel: 5 verbundene Felder = größte Region',
      },
    },
    {
      icon: '🗺',
      title: t('rules.slide3.title', 'Dein Weg durchs Quiz'),
      color: RULES_SLIDE_COLOR,
      // 2026-05-24 (Wolf): '4 Runden · 5 Kategorien' aufs Roadmap-Slide gezogen.
      lines: [
        t('rules.slide3.line1', `${totalPhases} Runden · 5 Kategorien`).replace('{phases}', String(totalPhases)),
      ],
      treeShowcase: true,
    },
    {
      // Joker explizit eigene Folie mit Mini-Grid-Beispiel.
      icon: '⭐',
      title: t('rules.slide4.title', 'Joker-Bonus'),
      color: '#EC4899',
      heroJokers: true,
      lines: [
        t('rules.slide4.line1', '2×2-Block oder 4 in einer Reihe = 1 Bonus-Feld'),
        t('rules.slide4.line2', 'Max. 2 Joker pro Team'),
      ],
      grid: {
        cells: [
          // 2026-05-19 (Wolf): Im echten Spiel wird beim Joker-Trigger JEDE Zelle
          // des erkannten Musters mit einem Joker-PNG belegt — Rules-Beispiel
          // zieht jetzt nach. 2×2 oben links (4 Joker) + 4er-Reihe rechts (4 Joker).
          ['⭐', '⭐', null, '⭐'],
          ['⭐', '⭐', null, '⭐'],
          [null, null, null, '⭐'],
          [null, null, null, '⭐'],
        ],
        colorA: '#3B82F6', colorB: '#EF4444',
        label: t('rules.slide4.gridLabel', 'Beide Muster zählen'),
      },
    },
    // 2026-05-24 (Wolf-Live-Test Feedback „rules waren zu lang, energy-stopper"):
    // Bunte Tüte / Comeback / Final-Tipp aus Rules entfernt. Werden alle direkt
    // im Spiel-Flow vom Moderator-Wolf erklaert (Comeback → vor Comeback-Phase,
    // Final-Tipp → als Intro-Slide vor Bets, Bunte Tüte → ohnehin pro Frage
    // mit eigener Regelpille erklaert).
    {
      icon: '🪅',
      iconImg: 'cg-cozygames',
      title: t('rules.slide_cozygames.title', 'CozyGame'),
      color: RULES_SLIDE_COLOR,
      requiresCozyGames: true,
      lines: [
        t('rules.slide_cozygames.line1', 'Nach jeder Runde dreht das Glücksrad: ein analoges Mini-Spiel'),
        t('rules.slide_cozygames.line2', 'Sieger setzt 1 Aktion auf dem Brett · Geschick > Wissen'),
      ],
      // 2026-05-17 (Wolf): extra-Beschreibung raus — Moderator erklärt das selbst.
    },
    {
      // 2026-05-09 (Rules-Audit Wolf): Fair Play / Anti-Google
      icon: '🤝',
      title: t('rules.slide_fairplay.title', 'Fair Play'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.slide_fairplay.line1', 'Kein Googeln · Handy nur fürs Antworten'),
        t('rules.slide_fairplay.line2', 'Antworten nicht zwischen Teams spoilern'),
        t('rules.slide_fairplay.line3', 'Im Zweifel zählt der Moderator-Wolf 🐺'),
      ],
      extra: t('rules.slide_fairplay.extra', 'Hauptsache, ihr habt Spaß.'),
    },
    {
      icon: '🧩',
      title: t('rules.slide8.title', 'Großes Finale'),
      color: RULES_SLIDE_COLOR,
      requiresConnections: true,
      lines: [
        t('rules.slide8.line1', '16 Begriffe · 4 Gruppen finden'),
        t('rules.slide8.line2', 'Pro Gruppe = +1 Punkt auf ein Feld eurer Wahl'),
      ],
      extra: t('rules.slide8.extra', '🏆 Größtes Gebiet + alle Bonus-Punkte gewinnt'),
    },
  ];
}

function buildRulesSlidesEn(totalPhases: 3 | 4): RulesSlide[] {
  const t = (k: string, fb: string) => getRuleText(k, 'en', fb);
  // 2026-05-09 (Wolf): New-Abilities slide removed — Steal/Stack revealed
  // as a surprise at the round-intro (3D card-flip with NEW badge).
  return [
    // 2026-05-23 (Wolf-Live-Test #P): Grid-preview on slide 1 so teams can
    // visualize the goal from the start — Wolf-feedback "rules waren zu lang".
    {
      icon: '🏆',
      title: t('rules.slide1.title', 'The Goal'),
      color: RULES_SLIDE_COLOR,
      // 2026-05-24 (Wolf): consolidated How-It-Works bullet into Goal slide.
      lines: [
        t('rules.slide1.line1', 'Largest connected area wins'),
        t('rules.slide1.line2', 'Right answer → place 1 cell'),
      ],
      grid: {
        cells: [
          ['A', 'A', 'A', null],
          ['A', 'A', null, null],
          [null, null, null, null],
          [null, null, null, null],
        ],
        colorA: '#3B82F6', colorB: '#EF4444',
        label: 'Example: 5 connected cells = largest region',
      },
    },
    {
      icon: '🗺',
      title: t('rules.slide3.title', 'Your Quiz Roadmap'),
      color: RULES_SLIDE_COLOR,
      // 2026-05-24 (Wolf): rounds + categories info pulled onto roadmap slide.
      lines: [
        t('rules.slide3.line1', `${totalPhases} rounds · 5 categories`).replace('{phases}', String(totalPhases)),
      ],
      treeShowcase: true,
    },
    {
      icon: '⭐',
      title: t('rules.slide4.title', 'Joker Bonus'),
      color: '#EC4899',
      heroJokers: true,
      lines: [
        t('rules.slide4.line1', '2×2 block or 4 in a row = 1 bonus tile'),
        t('rules.slide4.line2', 'Max 2 jokers per team'),
      ],
      grid: {
        cells: [
          // 2026-05-19 (Wolf): Every cell of a triggered pattern becomes a joker
          // in-game — preview now mirrors that. 2×2 top-left (4 jokers) + right
          // column (4 jokers).
          ['⭐', '⭐', null, '⭐'],
          ['⭐', '⭐', null, '⭐'],
          [null, null, null, '⭐'],
          [null, null, null, '⭐'],
        ],
        colorA: '#3B82F6', colorB: '#EF4444',
        label: t('rules.slide4.gridLabel', 'Both patterns count'),
      },
    },
    // 2026-05-24 (Wolf-Live-Test): Lucky Bag / Comeback / Final Tip removed
    // from Rules. Explained inline in the game flow by the moderator (Comeback
    // before Comeback-phase, Final Tip as intro-slide before bets, Lucky Bag
    // per-question with its own rules-pill).
    {
      icon: '🪅',
      iconImg: 'cg-cozygames',
      title: t('rules.slide_cozygames.title', 'CozyGame'),
      color: RULES_SLIDE_COLOR,
      requiresCozyGames: true,
      lines: [
        t('rules.slide_cozygames.line1', 'After every round the wheel spins: one analog mini-game'),
        t('rules.slide_cozygames.line2', 'Winner places 1 action on the board · skill > knowledge'),
      ],
    },
    {
      icon: '🤝',
      title: t('rules.slide_fairplay.title', 'Fair Play'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.slide_fairplay.line1', 'No googling · phones only for answering'),
        t('rules.slide_fairplay.line2', "Don't spoil answers between teams"),
        t('rules.slide_fairplay.line3', 'When in doubt, the wolf decides 🐺'),
      ],
      extra: t('rules.slide_fairplay.extra', 'Have fun! Points are just the side dish.'),
    },
    {
      icon: '🧩',
      title: t('rules.slide8.title', 'Grand Finale'),
      color: RULES_SLIDE_COLOR,
      requiresConnections: true,
      lines: [
        t('rules.slide8.line1', '16 terms · find 4 hidden groups'),
        t('rules.slide8.line2', 'Each group = +1 point on a cell of your choice'),
      ],
      extra: t('rules.slide8.extra', '🏆 Largest area + all bonus points wins'),
    },
  ];
}

// ── Mega-Event-Regelset (kein Grid!) ─────────────────────────────────────────
// Im Mega Event (largeGroupMode) gibt es kein Spielfeld/Klauen/Stapeln, sondern
// ein Bar-Race: jede Antwort bringt 0–100 Punkte (je besser/näher, desto mehr),
// die Fraktion zählt den Durchschnitt ihrer Handys; letzte Runde ×2, letzte Frage
// ×3 (qqMegaEventScore, qqRooms.ts). Eigene, kurze Slides — Grid-Slides (Ziel-
// Gebiet, Joker-Muster, Finale-Feld) fallen weg.
function buildMegaRulesSlidesDe(totalPhases: 3 | 4): RulesSlide[] {
  const t = (k: string, fb: string) => getRuleText(k, 'de', fb);
  return [
    {
      icon: '🏆',
      title: t('rules.mega.slide1.title', 'Das Ziel'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.mega.slide1.line1', 'Holt als Fraktion die meisten Punkte!'),
        t('rules.mega.slide1.line2', 'Jedes Handy spielt für eure Fraktion'),
      ],
    },
    {
      icon: '🗺',
      title: t('rules.mega.slide2.title', 'Dein Weg durchs Quiz'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.mega.slide2.line1', `${totalPhases} Runden · 5 Kategorien`).replace('{phases}', String(totalPhases)),
      ],
      treeShowcase: true,
    },
    {
      icon: '🎯',
      title: t('rules.mega.slide3.title', 'So gibt es Punkte'),
      color: '#EC4899',
      lines: [
        t('rules.mega.slide3.line1', 'Jede Antwort bringt eurer Fraktion 0–100 Punkte — je besser, desto mehr'),
        t('rules.mega.slide3.line2', 'Gewertet wird der Schnitt aller Handys'),
      ],
      extra: t('rules.mega.slide3.extra', 'Letzte Runde zählt doppelt, letzte Frage dreifach'),
    },
    {
      icon: '🤝',
      title: t('rules.slide_fairplay.title', 'Fair Play'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.slide_fairplay.line1', 'Kein Googeln · Handy nur fürs Antworten'),
        t('rules.slide_fairplay.line2', 'Antworten nicht zwischen Teams spoilern'),
        t('rules.slide_fairplay.line3', 'Im Zweifel zählt der Moderator-Wolf 🐺'),
      ],
      extra: t('rules.slide_fairplay.extra', 'Hauptsache, ihr habt Spaß.'),
    },
  ];
}

function buildMegaRulesSlidesEn(totalPhases: 3 | 4): RulesSlide[] {
  const t = (k: string, fb: string) => getRuleText(k, 'en', fb);
  return [
    {
      icon: '🏆',
      title: t('rules.mega.slide1.title', 'The Goal'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.mega.slide1.line1', 'Score the most points as a faction!'),
        t('rules.mega.slide1.line2', 'Every phone plays for your faction'),
      ],
    },
    {
      icon: '🗺',
      title: t('rules.mega.slide2.title', 'Your journey'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.mega.slide2.line1', `${totalPhases} rounds · 5 categories`).replace('{phases}', String(totalPhases)),
      ],
      treeShowcase: true,
    },
    {
      icon: '🎯',
      title: t('rules.mega.slide3.title', 'How to score'),
      color: '#EC4899',
      lines: [
        t('rules.mega.slide3.line1', 'Every answer earns your faction 0–100 points — the better, the more'),
        t('rules.mega.slide3.line2', 'Scored as the average of all your phones'),
      ],
      extra: t('rules.mega.slide3.extra', 'Last round counts double, the last question triple'),
    },
    {
      icon: '🤝',
      title: t('rules.slide_fairplay.title', 'Fair Play'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.slide_fairplay.line1', 'No googling · phones only for answering'),
        t('rules.slide_fairplay.line2', "Don't spoil answers between teams"),
        t('rules.slide_fairplay.line3', 'When in doubt, the wolf decides 🐺'),
      ],
      extra: t('rules.slide_fairplay.extra', 'Have fun! Points are just the side dish.'),
    },
  ];
}

/** Mini grid example for rules slides */
function RulesMiniGrid({ grid, slideColor, eurovisionMode }: { grid: NonNullable<RulesSlide['grid']>; slideColor: string; eurovisionMode?: boolean }) {
  const rows = grid.cells.length;
  const cols = grid.cells[0].length;
  const cellSz = Math.min(84, Math.floor(340 / Math.max(rows, cols)));
  const gap = 5;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.35s both',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${cellSz}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSz}px)`,
        gap,
      }}>
        {grid.cells.flatMap((row, r) => row.map((cell, c) => {
          const isTeamA = cell === 'A';
          // 2026-05-17 (Wolf): 'AP' = Team-A IN Pattern (mit Goldglow-Highlight
          // wie im echten Spiel via jokerFormed). Verhält sich wie 'A' (gleiche
          // BG-Farbe), bekommt zusätzlich gold border + pulsierenden Glow um
          // „Pattern-Vollendet" zu signalisieren.
          const isTeamAP = cell === 'AP';
          const isStar = cell === '⭐';
          const isPin = cell === '🏯';
          const filled = isTeamA || isTeamAP || isStar || isPin;
          // Skin: Beispiel-Grid monochrom im Akzent (blau/Joker-bunt wirkte
          // fehl am Platz auf Mono — Wolf). Cozy = Original-Farben.
          const accentHex = isThemed() ? getActiveTheme().brand.accentHex : null;
          const cellCol = accentHex ?? grid.colorA;
          const bg = isStar
            ? (accentHex ? `${accentHex}cc` : `linear-gradient(135deg, ${grid.colorA}cc, #EC4899cc)`)
            : isPin
              ? (accentHex ? `${accentHex}cc` : `linear-gradient(135deg, ${grid.colorA}cc, #10B981cc)`)
              : (isTeamA || isTeamAP)
                ? `${cellCol}aa`
                : (isThemed() ? 'var(--qq-surface)' : 'rgba(255,255,255,0.06)');
          const borderColor = isStar ? (accentHex ?? '#EC4899')
            : isPin ? (accentHex ?? '#10B981')
            : isTeamAP ? (accentHex ?? '#FBBF24')   // Gold-Border für Pattern-Zellen
            : cellCol;
          const glowColor = isStar ? (accentHex ? `${accentHex}88` : '#EC489988')
            : isPin ? (accentHex ? `${accentHex}44` : '#10B98144')
            : isTeamAP ? (accentHex ? `${accentHex}77` : '#FBBF2477')  // Gold-Glow für Pattern-Zellen
            : cellCol + '44';
          // 2026-05-09 (Wolf-Wunsch): Joker-Cells nutzen die echten Joker-PNGs
          // (boy/girl alternierend per row+col-index) statt 🃏-Emoji + Wiggle-
          // Animation für „der Joker leuchtet auf, wenn das Pattern gebildet ist".
          const inDelay = 0.3 + (r * cols + c) * 0.06;
          const jokerVariantIndex = r + c;
          return (
            <div key={`${r}-${c}`} style={{
              width: cellSz, height: cellSz,
              // Skin: Zell-Ecken folgen der Karten-Form (Mono eckig).
              borderRadius: isThemed() ? 'var(--qq-card-radius)' : Math.max(4, cellSz * 0.18),
              background: bg,
              border: filled ? `2px solid ${borderColor}` : '1px solid var(--qq-hairline)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: cellSz * 0.5,
              boxShadow: filled ? `0 0 12px ${glowColor}` : 'none',
              animation: filled
                ? isStar
                  // Joker: erst rein-fade, dann wiggle-Pulse infinite
                  ? `gridCellIn 0.4s ease ${inDelay}s both, qqJokerWiggle 2.4s ease-in-out ${inDelay + 0.5}s infinite`
                  : isTeamAP
                    // Pattern-Zelle: rein-fade + dezenter Gold-Glow-Pulse
                    ? `gridCellIn 0.4s ease ${inDelay}s both, qqJokerPatternPulse 2.4s ease-in-out ${inDelay + 0.5}s infinite`
                    : `gridCellIn 0.4s ease ${inDelay}s both`
                : undefined,
              overflow: 'hidden',
            }}>
              {isStar
                ? <JokerIcon
                    i={jokerVariantIndex}
                    size={Math.floor(cellSz * 0.85)}
                    eurovisionMode={!!eurovisionMode}
                    alt=""
                  />
                : isPin
                  ? <QQEmojiIcon emoji="🏯"/>
                  : ''}
            </div>
          );
        }))}
      </div>
      {grid.label && (
        <div style={{
          fontSize: 'clamp(18px,2.2cqw,30px)', fontWeight: 900,
          color: isThemed() ? 'var(--qq-accent)' : slideColor, letterSpacing: '0.04em',
        }}>{grid.label}</div>
      )}
    </div>
  );
}
export function RulesView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  // Wolf 2026-05-05: triggert Re-Render wenn Wolf im Rules-Editor speichert.
  useRuleOverridesVersion();
  const totalPhases = (s.totalPhases ?? 4) as 3 | 4;
  // Mega Event (largeGroupMode): eigenes Grid-freies Regelset (Bar-Race statt
  // Spielfeld). Sonst das klassische Grid-Regelwerk.
  const mega = !!(s as any).largeGroupMode;
  const allSlides = mega
    ? (lang === 'en' ? buildMegaRulesSlidesEn(totalPhases) : buildMegaRulesSlidesDe(totalPhases))
    : (lang === 'en' ? buildRulesSlidesEn(totalPhases) : buildRulesSlidesDe(totalPhases));
  // 2026-05-24 (Wolf 'connections raus'): requiresConnections-Slides waren hart
  // ausgeblendet. 2026-07-08 Konsistenz B7: jetzt am Flag gegated wie CozyGames/
  // Comeback — bei connectionsEnabled=false (Default) unveraendert versteckt,
  // aber wenn ein Mod Connections aktiv einschaltet, kommt die Regel-Folie mit
  // (sonst kennen Teams die Finale-Regeln nicht).
  const connEnabled = !!(s as any).connectionsEnabled;
  const cgEnabled = !!(s as any).cozyGamesEnabled;
  const cbEnabled = (s as any).comebackEnabled !== false;
  const slides = allSlides.filter(sl => {
    if (sl.requiresConnections && !connEnabled) return false;
    if (sl.requiresCozyGames && !cgEnabled) return false;
    if (sl.requiresComeback && !cbEnabled) return false;
    return true;
  });
  const totalSlides = slides.length;
  const rawIdx = s.rulesSlideIndex ?? 0;
  // 2026-07-15 (Rules-Redesign): Slide-Richtung fuer den gerichteten Tiefen-
  // Uebergang (vorwaerts = von rechts, rueckwaerts = von links). Hooks MUESSEN
  // vor dem fruehen return stehen (Rules of Hooks).
  const prevIdxRef = useRef<number>(rawIdx);
  const slideDir: 'fwd' | 'back' = rawIdx >= prevIdxRef.current ? 'fwd' : 'back';
  useEffect(() => { prevIdxRef.current = rawIdx; });
  // rawIdx === -2 = Willkommen-Overlay (bleibt in QQBeamerPage) → hier nichts.
  // rawIdx === -1 = Regel-Intro: 2026-06-28 (Wolf) jetzt als ERSTE Station IN
  // dieser persistenten Bühne (vor „Das Ziel"), nicht mehr als separates Overlay.
  if (rawIdx < -1) return null;
  const isIntro = rawIdx === -1;
  // Intro als synthetischer Slide → läuft durch denselben Render-Pfad wie die
  // echten Regeln (konsistenter Bühnen-Look). Inhalt = vormaliger RulesIntroOverlay.
  const introSlide: RulesSlide = {
    icon: '📖',
    title: lang === 'en' ? 'Now the rules' : 'Jetzt kommen die Regeln',
    color: RULES_SLIDE_COLOR,
    // 2026-07-12 (Wolf): zweite Zeile als Vorschau — füllt die vorher sehr leere
    // Intro-Karte und setzt die Erwartung (kurzer Überblick, dann Spielstart).
    lines: [
      lang === 'en' ? 'Pay close attention!' : 'Gut aufpassen!',
      lang === 'en' ? 'A quick overview, then we play.' : 'Ein kurzer Überblick, dann geht’s los.',
    ],
    eyebrow: lang === 'en' ? 'Get ready' : 'Vorbereitung',
  };
  const idx = isIntro ? -1 : Math.max(0, Math.min(rawIdx, totalSlides - 1));
  const slide = isIntro ? introSlide : slides[idx];
  const fontFam = s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif` : "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif";
  const isLast = !isIntro && idx === totalSlides - 1;
  const hasGrid = !!slide.grid;
  // 2026-07-15 (Rules-Redesign): Signatur-Motion pro Regel — das Hero-Icon zieht
  // je nach Motiv unterschiedlich ein (Buch blaettert, Pokal poppt, Map klappt auf,
  // Blitz schlaegt ein, Haende treffen sich), danach uebernimmt das ruhige Wave.
  const heroMotif = ({ '📖': 'book', '🏆': 'trophy', '🗺': 'map', '🗺️': 'map', '🎯': 'bolt', '⚡': 'bolt', '🤝': 'shake' } as Record<string, string>)[slide.icon] ?? '';
  const heroEntrance = heroMotif === 'book' ? 'qqHeroBook'
    : heroMotif === 'trophy' ? 'qqHeroTrophy'
    : heroMotif === 'map' ? 'qqHeroMap'
    : heroMotif === 'bolt' ? 'qqHeroBolt'
    : heroMotif === 'shake' ? 'qqHeroShake'
    : 'qqHeroRise';

  // 2026-06-28 (Beamer-Review): Stepper-Farben (persistente Bühne). Akzent ist
  // im Skin der Theme-Akzent, sonst Marken-Pink.
  const aHex = isThemed() ? 'var(--qq-accent)' : '#EC4899';
  const aRGB = isThemed() ? 'var(--qq-accent-rgb)' : '236,72,153';

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', fontFamily: fontFam,
      minHeight: 0,
      // 2026-05-12 (Wolf 'safe-margin im ganzen quiz'): RulesView Root-Padding
      // mit Safe-Margin Token. BG-Layer (Fireflies) sind position:absolute
      // inset:0 → fuellen padding-box (= visible area), bleiben full-bleed.
      padding: 'var(--qq-safe-margin)',
      boxSizing: 'border-box',
    }}>
      <Fireflies />

      {/* 2026-07-15 (Rules-Redesign): Keyframes fuer Tiefen-Uebergang, Signatur-
          Hero-Motion, Divider-Draw und Arena-Glut. Einmal pro Bühne. */}
      <style>{`
        @keyframes qqRulesSlideR{0%{opacity:0;transform:translateX(120px)}60%{opacity:1}100%{opacity:1;transform:translateX(0)}}
        @keyframes qqRulesSlideL{0%{opacity:0;transform:translateX(-120px)}60%{opacity:1}100%{opacity:1;transform:translateX(0)}}
        @keyframes qqRulesDivDraw{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes qqHeroRise{0%{opacity:0;transform:translateY(-12px) scale(.7)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes qqHeroBook{0%{opacity:0;transform:translateY(-14px) rotate(-8deg) scale(.6)}60%{opacity:1;transform:translateY(0) rotate(4deg) scale(1.04)}100%{transform:rotate(0) scale(1)}}
        @keyframes qqHeroTrophy{0%{opacity:0;transform:translateY(-14px) scale(.5)}60%{opacity:1;transform:translateY(0) scale(1.12)}100%{transform:scale(1)}}
        @keyframes qqHeroMap{0%{opacity:0;transform:perspective(520px) rotateY(72deg) scale(.7)}100%{opacity:1;transform:perspective(520px) rotateY(0) scale(1)}}
        @keyframes qqHeroBolt{0%{opacity:0;transform:translateY(-42px) scale(1.3) rotate(-8deg)}55%{opacity:1;transform:translateY(5px) scale(.92)}100%{transform:translateY(0) scale(1) rotate(0)}}
        @keyframes qqHeroShake{0%{opacity:0;transform:scale(.5)}60%{opacity:1;transform:scale(1.14)}100%{transform:scale(1)}}
        @keyframes qqRulesEmber{0%{opacity:0;transform:translateY(0) scale(.7)}15%{opacity:.8}100%{opacity:0;transform:translateY(-260px) scale(.3)}}
        @keyframes qqRulesWolfBob{0%,100%{transform:translateX(-50%) translateY(0) rotate(-3deg)}50%{transform:translateX(-50%) translateY(-4px) rotate(3deg)}}
        @media (prefers-reduced-motion: reduce){
          .qqRulesEmberLayer{display:none !important}
          .qqRulesWolf{animation:none !important}
        }
      `}</style>

      {/* Arena-Glut: nur im Mega-Modus, aufsteigende Funken vor dem Kolosseum-BG. */}
      {mega && (
        <div aria-hidden className="qqRulesEmberLayer" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} style={{
              position: 'absolute', bottom: -10, left: `${4 + (i * 61) % 92}%`,
              width: 4, height: 4, borderRadius: '50%', background: '#FCA55D',
              boxShadow: '0 0 8px 1px rgba(252,165,93,0.55)',
              animation: `qqRulesEmber ${(4.5 + (i % 4) * 1.3).toFixed(1)}s linear ${((i * 0.5) % 5).toFixed(1)}s infinite`,
            }} />
          ))}
        </div>
      )}

      {/* 2026-06-28 (Beamer-Review): persistenter Stepper — Übersicht aller
          Regeln, aktuelle aktiv. Steht AUSSERHALB des key={idx}-Fensters, bleibt
          also beim Regel-Wechsel stehen. Bei >5 Regeln nur die aktuelle mit
          Label (Rest Nummern), damit der Stepper einzeilig bleibt (kein Scroll). */}
      {(() => {
        // Intro-Pill (📖) als erste Station + die echten Regeln danach.
        // 2026-07-12 (Wolf): Intro-Pill nutzt das Eyebrow („Get ready") statt des
        // Titels — sonst dopplte die aktive Pill exakt den Karten-Titel „Now the rules".
        const stepList = [
          { label: introSlide.eyebrow ?? introSlide.title, glyph: '📖' as string },
          ...slides.map((sl, i) => ({ label: sl.title, glyph: String(i + 1) })),
        ];
        const activeStep = isIntro ? 0 : idx + 1;
        const compact = stepList.length > 5;
        if (stepList.length <= 1) return null;
        // 2026-07-15 (Rules-Redesign): Fortschritts-Anteil fuer Schiene + Wolf-Marker.
        const activeFrac = stepList.length > 1 ? activeStep / (stepList.length - 1) : 0;
        return (
          <div style={{
            position: 'relative', zIndex: 6, flexShrink: 0,
            maxWidth: 1280, width: '96%', marginBottom: 'clamp(20px, 2.6cqh, 32px)',
            // 2026-07-15 (Wolf 'Wolf liegt ueber der Schrift, Linie macht Text
            // schwer lesbar'): Pillen OBEN, Schiene + Wolf als eigenes Band
            // DARUNTER → keine Ueberlappung mehr mit den Pillen-Labels.
            display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.1cqh, 16px)',
          }}>
            {/* Pillen-Reihe (space-between → verteilt). */}
            <div style={{
              position: 'relative', zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 'clamp(6px, 0.8cqw, 12px)',
            }}>
            {stepList.map((item, i) => {
              const active = i === activeStep;
              const done = i < activeStep;
              const showLabel = active || !compact;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 'clamp(5px, 0.6cqw, 10px)',
                  padding: 'clamp(5px,0.7cqh,9px) clamp(9px,1cqw,15px)',
                  borderRadius: 999, minWidth: 0,
                  background: active ? `rgba(${aRGB},0.18)` : 'rgba(255,255,255,0.03)',
                  border: active ? `1.5px solid rgba(${aRGB},0.6)` : '1.5px solid rgba(255,255,255,0.08)',
                  // 2026-07-09 (Motion-Audit): 'all' → konkrete Properties (kein
                  // versehentliches Animieren von Layout-Werten).
                  transition: 'background 0.4s ease, border-color 0.4s ease',
                }}>
                  <span style={{
                    flexShrink: 0, display: 'grid', placeItems: 'center',
                    width: 'clamp(20px,1.9cqw,28px)', height: 'clamp(20px,1.9cqw,28px)',
                    borderRadius: '50%', fontWeight: 900, fontSize: 'clamp(11px,1cqw,15px)',
                    background: active ? aHex : done ? `rgba(${aRGB},0.35)` : 'rgba(255,255,255,0.08)',
                    color: active ? '#1a0a14' : done ? '#fff' : '#aab0be',
                  }}>{item.glyph}</span>
                  {showLabel && (
                    <span style={{
                      fontWeight: 800, fontSize: 'clamp(12px,1.15cqw,18px)',
                      color: active ? (isThemed() ? 'var(--qq-title)' : '#fff') : done ? '#c9bcd8' : '#a8adba',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      // 2026-07-04 (Wolf 'Dein Weg durchs Quiz immer noch abgeschnitten'):
                      // inaktiver Cap 170->320px, damit die vollen Stepper-Labels passen
                      // (die 5 Pillen bleiben zusammen < 1280px Zeilenbreite). Ellipsis
                      // bleibt als Sicherheitsnetz fuer sehr lange Custom-Labels.
                      maxWidth: active ? 'clamp(160px, 22cqw, 340px)' : 'clamp(120px, 17cqw, 320px)',
                    }}>{item.label}</span>
                  )}
                </div>
              );
            })}
            </div>
            {/* Fortschritts-Schiene + Wolf-Marker als eigenes Band UNTER den Pillen.
                Kreuzt keinen Text mehr; der Wolf laeuft auf der Schiene = „du bist hier". */}
            <div aria-hidden style={{ position: 'relative', height: 'clamp(26px, 2.8cqh, 40px)' }}>
              <div style={{
                position: 'absolute', left: '6%', right: '6%', top: '50%', transform: 'translateY(-50%)',
                height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.09)', zIndex: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, left: 0, width: `${(activeFrac * 100).toFixed(1)}%`,
                  borderRadius: 2, background: `linear-gradient(90deg, rgba(${aRGB},0.7), ${aHex})`,
                  boxShadow: `0 0 12px rgba(${aRGB},0.6)`, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              {/* CozyWolf steht auf der Schiene (bottom:50% = Fuesse auf der Linie). */}
              <div className="qqRulesWolf" style={{
                position: 'absolute', bottom: '50%', left: `calc(6% + ${(activeFrac * 88).toFixed(1)}%)`,
                zIndex: 3, width: 'clamp(28px, 2.6cqw, 44px)',
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
                transition: 'left 0.6s cubic-bezier(0.16,1,0.3,1)',
                animation: 'qqRulesWolfBob 1.6s ease-in-out infinite',
              }}>
                <img src="/avatars/cozywolf/pink.png" alt="" draggable={false}
                  style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main card — full-width for beamer readability.
          2026-05-08 (Wolf-Wunsch /animations Slot-1): Slide-In statt phasePop.
          Forward = von rechts, Backward = von links. Spring-Easing für sanftes
          Settle-Overshoot. */}
      <div key={isIntro ? 'rules-intro' : idx} style={{
        position: 'relative', zIndex: 5,
        maxWidth: 1200, width: '94%', overflow: 'hidden',
        // 2026-06-24 (Skin): Regel-Card traegt bei Skin card-bg + card-text
        // (sonst dunkle Card + geerbter dunkler Text = unlesbar auf hellen Skins).
        // Slide-Color-Rand bleibt als Kategorie-Akzent.
        background: isThemed() ? 'var(--qq-card-bg)' : 'rgba(15,12,9,0.85)',
        color: isThemed() ? 'var(--qq-card-text)' : undefined,
        border: isThemed() ? 'var(--qq-card-border)' : `2px solid ${slide.color}44`,
        borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24,
        padding: `clamp(24px, 4cqh, ${hasGrid ? 52 : 60}px) clamp(32px, 5cqw, ${hasGrid ? 64 : 72}px)`,
        boxShadow: isThemed() ? 'var(--qq-card-shadow)' : `0 0 120px ${slide.color}22, 0 16px 48px rgba(0,0,0,0.6)`,
        // 2026-07-15 (Wolf 'Wechsel staerker als noetig, kein neue-Page-Gefuehl,
        // eher wie ein Bildband weitergeschoben'): reiner horizontaler Schub —
        // blur+scale (die „Tiefe"/Page-Wechsel-Anmutung) RAUS. Inhalt gleitet nur
        // seitlich rein (vorwaerts von rechts / rueckwaerts von links). Persistente
        // Buehne bleibt: Stepper + Card-Rahmen stehen, nur der Inhalt schiebt durch.
        animation: `${slideDir === 'back' ? 'qqRulesSlideL' : 'qqRulesSlideR'} 0.45s cubic-bezier(0.16, 1, 0.3, 1) both`,
        // 2026-07-04 (Wolf 'Fenster wechselt Größe je Regelseite, unruhig'):
        // FIXE einheitliche Höhe für ALLE Slides (statt min/maxHeight-Spanne) —
        // der Rahmen springt beim Regel-Wechsel nicht mehr; kürzere Regeln
        // zentrieren ihren Inhalt in der konstanten Bühne.
        height: '82cqh',
        justifyContent: 'center',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Icon + title — beides zentriert, Icon über Titel. Klassischer
            Stage-Look statt links-rechts-Layout. */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'clamp(8px, 1cqh, 14px)', marginBottom: 'clamp(16px, 2.5cqh, 28px)',
          textAlign: 'center',
        }}>
          {/* 2026-05-05 (Wolf 'alle Emojis in Regeln bouncen, sync zum Wave'):
              continuous qqCatNameWave wie Title-Buchstaben. Delay 1.3s = Title-
              Wave-Init (1.0s) + halbe Cascade (~0.3s) → Emoji peakt synchron
              mit mittlerem Buchstaben statt asynchron dagegen zu wirken.
              2026-05-09 (Wolf-Wunsch 'Joker-PNGs prominent auf Joker-Slide'):
              Bei heroJokers ein Pärchen Joker-PNGs (Boy+Girl) als Hero, mit
              Wiggle-Animation in Counter-Phase für lebendige Doppel-Pose. */}
          {slide.heroJokers ? (
            <div style={{
              display: 'inline-flex', alignItems: 'flex-end', gap: 'clamp(8px, 1cqw, 18px)',
              filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))',
              animation: 'qqCatNameWave 2.4s ease-in-out 1.3s infinite',
            }}>
              <JokerIcon i={0} size={'clamp(72px, 10cqw, 130px)'} eurovisionMode={!!s.theme?.eurovisionMode}
                style={{ animation: 'qqJokerWiggle 2.4s ease-in-out 0.5s infinite' }} />
              <JokerIcon i={1} size={'clamp(72px, 10cqw, 130px)'} eurovisionMode={!!s.theme?.eurovisionMode}
                style={{ animation: 'qqJokerWiggle 2.4s ease-in-out 1.7s infinite' }} />
            </div>
          ) : slide.iconImg ? (
            <span style={{
              display: 'inline-block',
              filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))',
              animation: `${heroEntrance} 0.62s var(--qq-ease-pop-fast) both, qqCatNameWave 2.4s ease-in-out 1.3s infinite`,
            }}><CozyGameIcon id={slide.iconImg} emoji={slide.icon} size={'clamp(64px,9cqw,110px)'} /></span>
          ) : (
            <span style={{
              display: 'inline-block',
              fontSize: 'clamp(64px,9cqw,110px)', lineHeight: 1,
              filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))',
              animation: `${heroEntrance} 0.62s var(--qq-ease-pop-fast) both, qqCatNameWave 2.4s ease-in-out 1.3s infinite`,
            }}><QQEmojiIcon emoji={slide.icon}/></span>
          )}
          <div style={{
            fontSize: 'clamp(13px,1.4cqw,18px)', fontWeight: 900, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: isThemed() ? 'var(--qq-text-muted)' : `${slide.color}88`,
          }}>
            {slide.eyebrow ?? getRuleText('rules.header', lang, lang === 'de' ? 'Spielregeln' : 'Game Rules')}
          </div>
          <div style={{
            // 2026-07-04 (Wolf 'Titel oben abgeschnitten'): etwas kleiner, damit
            // lange Titel ('Dein Weg durchs Quiz') in die feste Card passen.
            fontSize: 'clamp(38px, 5.6cqw, 72px)', fontWeight: 900, lineHeight: 1.05,
            color: isThemed() ? 'var(--qq-title)' : slide.color,
            textShadow: isThemed() ? 'none' : `0 0 60px ${slide.color}44`,
          }}>
            {/* 2026-05-05 (Wolf): Wave-Animation pro Buchstabe — gleiche
                Bewegungs-Sprache wie Cat-Intro-Headline. Stagger 0.08s.
                Spaces als &nbsp; damit Word-Spacing erhalten bleibt. */}
            {slide.title.split('').map((char, i) => (
              <span key={`${idx}-${i}`} style={{
                display: 'inline-block',
                opacity: 0,
                // 2026-05-05 v2 (Wolf 'jetzt kommen die regeln auch wave?'):
                // Entry-Letter-Cascade (scaleIn + blur-clear, stagger 0.05s —
                // gleiche Sprache wie Welcome-Title), DANN continuous
                // qqCatNameWave als sanftes Wiegen.
                animation: `qqRulesTitleLetter 0.7s cubic-bezier(0.16, 1.2, 0.3, 1) ${0.15 + i * 0.05}s both, qqCatNameWave 2.4s ease-in-out ${1.0 + i * 0.08}s infinite`,
                whiteSpace: 'pre',
              }}>{char === ' ' ? ' ' : char}</span>
            ))}
          </div>
        </div>

        {/* Divider — symmetrischer Gradient + continuous shimmer (analog Round-Intro-Bar
            und Welcome-Linie, damit die drei Marken-Folien dieselbe Bewegungs-Sprache
            sprechen). */}
        <div style={{
          width: '100%', height: 3, borderRadius: 2,
          background: isThemed()
            ? 'linear-gradient(90deg, transparent, var(--qq-accent) 50%, transparent)'
            : `linear-gradient(90deg, transparent, ${slide.color}cc 50%, transparent)`,
          backgroundSize: '200% 100%',
          marginBottom: 'clamp(16px, 2.5cqh, 32px)',
          // 2026-07-15 (Rules-Redesign): Divider zieht sich erst aus der Mitte auf,
          // dann laeuft der Shimmer.
          transformOrigin: 'center',
          animation: 'qqRulesDivDraw 0.55s var(--qq-ease-out-cubic) 0.28s both, lineShimmer 3s linear 0.9s infinite',
          boxShadow: isThemed() ? '0 0 18px rgba(var(--qq-accent-rgb),0.27)' : `0 0 18px ${slide.color}44`,
        }} />

        {/* Content: text left, grid right (if grid exists) */}
        <div style={{
          display: 'flex', gap: 'clamp(24px, 3cqw, 48px)',
          alignItems: (slide.showTree || slide.treeShowcase) ? 'stretch' : 'center',
          flexDirection: (slide.showTree || slide.treeShowcase) ? 'column' : (hasGrid ? 'row' : 'column'),
        }}>
          {/* Fortschrittsbaum (Inline-Variante in Abilities-Slide) */}
          {slide.showTree && (
            <div style={{ display: 'flex', justifyContent: 'center', animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.05s both' }}>
              {/* 2026-06-29 (Wolf 'Wolf auch über den normalen Tree'): wolfAbove
                  → Wolf schwebt über der Linie (Pin), aktuelle Kategorie bleibt
                  sichtbar — konsistent mit dem Journey-Look. */}
              <QQProgressTree state={s} variant="inline" wolfAbove />
            </div>
          )}

          {/* TREE SHOWCASE — eigene Slide, Tree groß + Phasen-Sweep */}
          {slide.treeShowcase && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 'clamp(20px, 3cqh, 40px)',
              animation: 'contentReveal 0.6s var(--qq-ease-pop-fast) 0.1s both',
              padding: 'clamp(8px, 1.5cqh, 24px) 0',
            }}>
              <QQProgressTree state={s} variant="showcase" showcaseMode showcaseStepMs={2800} />
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                fontSize: 'clamp(18px, 2cqw, 28px)', fontWeight: 700,
                color: '#a8a395', letterSpacing: '0.04em',
                animation: 'contentReveal 0.6s var(--qq-ease-pop-fast) 0.5s both',
              }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: isThemed() ? 'var(--qq-accent)' : '#EC4899',
                  boxShadow: isThemed() ? '0 0 12px rgba(var(--qq-accent-rgb),0.65)' : '0 0 12px rgba(236,72,153,0.65)',
                  animation: 'qqShowcaseHintPulse 1.6s ease-in-out infinite',
                }} />
                {getRuleText('rules.slide3.hint', lang, lang === 'de'
                  ? '5 Kategorien pro Runde, jede mit eigenem Twist'
                  : '5 categories per round, each with its own twist')}
              </div>
              <style>{`
                @keyframes qqShowcaseHintPulse {
                  0%, 100% { opacity: 0.5; transform: scale(0.85); }
                  50% { opacity: 1; transform: scale(1.15); }
                }
              `}</style>
            </div>
          )}

          {/* Text lines — zentriert für Quiz-Event-Look (kein Bullet-Liste-
              Eindruck, klare Stage-Präsentation). */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: 'clamp(10px, 1.5cqh, 20px)', flex: 1,
            alignItems: 'center', textAlign: 'center',
          }}>
            {slide.lines.map((line, i) => (
              <div key={i} style={{
                animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.1 + i * 0.12}s both`,
                maxWidth: 920,
              }}>
                <span style={{
                  fontSize: 'clamp(22px,3cqw,40px)', fontWeight: 700,
                  color: 'var(--qq-card-text)', lineHeight: 1.3,
                }}>{line}</span>
              </div>
            ))}
            {/* Ability-Badges (Bann, Schild, Tauschen, …) als Icon-Strip */}
            {slide.abilities && slide.abilities.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                gap: 'clamp(10px, 1.4cqw, 20px)', marginTop: 'clamp(10px, 1.6cqh, 22px)',
              }}>
                {slide.abilities.map((b, i) => (
                  <div key={`${b.label}-${i}`} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: 'clamp(10px, 1.2cqh, 16px) clamp(14px, 1.6cqw, 22px)', borderRadius: 16,
                    background: `${b.accent}1a`, border: `2px solid ${b.accent}55`,
                    boxShadow: `0 0 18px ${b.accent}33`, minWidth: 'clamp(96px, 11cqw, 140px)',
                    animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.4 + i * 0.08}s both`,
                  }}>
                    {b.slug
                      ? <QQIcon slug={b.slug} size={'clamp(40px, 5.5cqw, 72px)'} alt={b.label} />
                      : <span style={{ fontSize: 'clamp(36px, 5cqw, 64px)', lineHeight: 1 }}><QQEmojiIcon emoji={b.emoji}/></span>}
                    <div style={{
                      fontSize: 'clamp(14px, 1.6cqw, 22px)', fontWeight: 900,
                      color: b.accent, letterSpacing: '0.04em',
                    }}>{b.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mini grid example */}
          {slide.grid && <RulesMiniGrid grid={slide.grid} slideColor={slide.color} eurovisionMode={!!s.theme?.eurovisionMode} />}
        </div>

        {/* Extra callout — zentriert */}
        {slide.extra && (
          <div style={{
            marginTop: 'clamp(16px, 2.5cqh, 32px)', padding: 'clamp(12px, 1.8cqh, 20px) clamp(18px, 2.2cqw, 28px)', borderRadius: isThemed() ? 'var(--qq-card-radius)' : 16,
            background: isThemed() ? 'var(--qq-surface)' : `${slide.color}15`,
            border: isThemed() ? '2px solid var(--qq-hairline)' : `2px solid ${slide.color}33`,
            fontSize: 'clamp(18px,2.4cqw,34px)', fontWeight: 900,
            color: isThemed() ? 'var(--qq-accent)' : slide.color,
            animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.4s both',
            textShadow: isThemed() ? 'none' : `0 0 24px ${slide.color}33`,
            textAlign: 'center',
          }}>
            {slide.extra}
          </div>
        )}

        {/* Last slide hint */}
        {isLast && (
          <div style={{
            marginTop: 'clamp(16px, 2.5cqh, 32px)', textAlign: 'center',
            fontSize: 'clamp(20px,2.8cqw,36px)', fontWeight: 900,
            color: isThemed() ? 'var(--qq-accent)' : slide.color,
            animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.6s both',
            textShadow: isThemed() ? 'none' : `0 0 24px ${slide.color}33`,
          }}>
            {getRuleText('rules.lastSlideHint', lang, lang === 'de' ? '🎬 Los geht\'s!' : '🎬 Let\'s go!')}
          </div>
        )}
      </div>
    </div>
  );
}
