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
import { useRef, useEffect, useState, Fragment } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { useLangFlip, qqArenaType } from '../cozyQuizShared';
import { isThemed, getActiveTheme, getActiveThemeId, BUEHNE_THEME_ID } from '../qqTheme';

/**
 * Die Buehne beim Namen nennen, 2026-08-24.
 *
 * Diese Datei lief bisher komplett ueber `isThemed()` und Flaechen-Tokens. Das
 * funktioniert, macht aber jede Ausnahme fuer die Buehne unmoeglich: `isThemed()`
 * ist wahr fuer vier Skins, und was man darueber baut, baut man fuer alle vier.
 * Die Regeln sahen deshalb nicht falsch aus - sie konnten nur nichts absichtlich
 * richtig machen.
 */
const istBuehneG = () => getActiveThemeId() === BUEHNE_THEME_ID;
import { getRuleText, useRuleOverridesVersion } from '../qqRuleTexts';
import { QQIcon, QQEmojiIcon, QQEmojiText, type QQIconSlug } from './QQIcon';
// 2026-08-22 (Wolf: „wird der text auch ueberprueft?"): die Regel-Ansicht las
// bis heute KEINE einzige Spielkonstante — jede Zahl stand als Text da. Heute
// stimmen sie alle, aber nichts haelt sie richtig: wer QQ_MAX_JOKERS_PER_GAME
// aendert, laesst die Regelfolie unbemerkt luegen, und das faellt erst
// abends vor Publikum auf. Deshalb wenigstens die Joker-Zahl gebunden.
import { QQ_MAX_JOKERS_PER_GAME } from '../../../shared/quarterQuizTypes';
import { StageStepBar } from './CozyQuizBeamerTimer';
import { QQ_RULES_SLIDE_SEC } from '../../../shared/quarterQuizTypes';
import { CozyGameIcon } from './CozyGameIcon';
import { JokerIcon } from './JokerIcon';
import { Fireflies } from './CozyQuizAmbient';
import QQProgressTree from './QQProgressTree';

// ═══════════════════════════════════════════════════════════════════════════════
// RULES PRESENTATION
// ═══════════════════════════════════════════════════════════════════════════════

type AbilityBadge = {
  /** PNG-Slug aus QQIcon, falls vorhanden — sonst nur Emoji. */
  slug?: 'marker-swap';   // 2026-08-22: Schild und Sanduhr ausgebaut, siehe QQ_BOARD_ACTIONS_RETIRED
  emoji: string;
  label: string;
  accent: string;
};
type RulesSlide = {
  icon: string;
  /** 2026-07-09 (Motion-Audit): optionales Custom-3D-Icon (/icons/<id>.png) statt
   *  Emoji — z.B. cg-cozygames auf der CozyGame-Slide, konsistent zum Rad-Intro. */
  iconImg?: string;
  /** 2026-08-24: Zeichen aus dem gelieferten Satz (QQIcon-Slug). Anders als
   *  `iconImg` laeuft es ueber dieselbe Groessen- und Fallback-Logik wie alle
   *  anderen Zeichen im Quiz. */
  iconSlug?: QQIconSlug;
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
const RULES_SLIDE_COLOR = 'var(--qq-stage-brand)';

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
      title: t('rules.slide3.title', 'Der Ablauf'),
      color: RULES_SLIDE_COLOR,
      // 2026-05-24 (Wolf): '4 Runden · 5 Kategorien' aufs Roadmap-Slide gezogen.
      // 2026-08-23 (Wolf „3 runden 5 kategorien koennte aber auch
      // missverstaendlich sein"): stimmt. Der Mittelpunkt liest sich als
      // Aufzaehlung — „drei Runden UND fuenf Kategorien", also 5 im ganzen
      // Abend statt 5 pro Runde. „mit je" macht die Multiplikation eindeutig.
      lines: [
        t('rules.slide3.line1', `${totalPhases} Runden mit je 5 Kategorien`).replace('{phases}', String(totalPhases)),
      ],
      treeShowcase: true,
    },
    {
      // Joker explizit eigene Folie mit Mini-Grid-Beispiel.
      icon: '⭐',
      title: t('rules.slide4.title', 'Joker-Bonus'),
      color: 'var(--qq-stage-brand)',
      heroJokers: true,
      lines: [
        t('rules.slide4.line1', '2×2-Block oder 4 in einer Reihe = 1 Bonus-Feld'),
        t('rules.slide4.line2', `Max. ${QQ_MAX_JOKERS_PER_GAME} Joker pro Team`),
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
      icon: '🎡',
      // 2026-08-24 (Wolf: „cozygames emoji in rules falsch"). Hier stand
      // `cg-cozygames`, und das ist der PINKE COZYWOLF mit Ring, Becher und
      // Wuerfel - das Maskottchen. Auf der Buehne ist der Wolf ausgebaut
      // (2026-08-23, Wolf: „wir nehmen den wolf hier raus"), und alle anderen
      // Regelfolien tragen ein Zeichen aus dem gelieferten 3D-Satz. Diese eine
      // sprach dadurch eine andere Sprache als die vier daneben.
      // `fx-wheel` ist das Gluecksrad aus demselben Satz - und es zeigt genau
      // das, was die Zeile darunter sagt: „Nach jeder Runde dreht das
      // Gluecksrad". Zurueck geht es, indem `iconImg` wieder auf
      // 'cg-cozygames' steht; die Datei bleibt liegen (Fortschrittsbaum
      // benutzt sie weiter).
      iconSlug: 'fx-wheel',
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
      ],
      extra: t('rules.slide_fairplay.extra', 'Und jetzt: viel Spaß!'),
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
      title: t('rules.slide3.title', 'The Flow'),
      color: RULES_SLIDE_COLOR,
      // 2026-05-24 (Wolf): rounds + categories info pulled onto roadmap slide.
      lines: [
        t('rules.slide3.line1', `${totalPhases} rounds, 5 categories each`).replace('{phases}', String(totalPhases)),
      ],
      treeShowcase: true,
    },
    {
      icon: '⭐',
      title: t('rules.slide4.title', 'Joker Bonus'),
      color: 'var(--qq-stage-brand)',
      heroJokers: true,
      lines: [
        t('rules.slide4.line1', '2×2 block or 4 in a row = 1 bonus cell'),
        t('rules.slide4.line2', `Max ${QQ_MAX_JOKERS_PER_GAME} jokers per team`),
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
      icon: '🎡',
      // Siehe die Begruendung an der deutschen Fassung weiter oben.
      iconSlug: 'fx-wheel',
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
      ],
      extra: t('rules.slide_fairplay.extra', 'And now: have fun!'),
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
      title: t('rules.mega.slide2.title', 'Der Ablauf'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.mega.slide2.line1', `${totalPhases} Runden mit je 5 Kategorien`).replace('{phases}', String(totalPhases)),
      ],
      treeShowcase: true,
    },
    {
      icon: '🎯',
      title: t('rules.mega.slide3.title', 'So gibt es Punkte'),
      color: 'var(--qq-stage-brand)',
      lines: [
        t('rules.mega.slide3.line1', 'Jede Antwort bringt eurer Fraktion 0–100 Punkte, je besser, desto mehr'),
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
      ],
      extra: t('rules.slide_fairplay.extra', 'Und jetzt: viel Spaß!'),
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
      title: t('rules.mega.slide2.title', 'The Flow'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.mega.slide2.line1', `${totalPhases} rounds, 5 categories each`).replace('{phases}', String(totalPhases)),
      ],
      treeShowcase: true,
    },
    {
      icon: '🎯',
      title: t('rules.mega.slide3.title', 'How to score'),
      color: 'var(--qq-stage-brand)',
      lines: [
        t('rules.mega.slide3.line1', 'Every answer earns your faction 0–100 points, the better, the more'),
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
      ],
      extra: t('rules.slide_fairplay.extra', 'And now: have fun!'),
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
                : (isThemed() ? 'var(--qq-surface)' : 'rgba(246, 239, 230,0.06)');
          const borderColor = isStar ? (accentHex ?? 'var(--qq-stage-brand)')
            : isPin ? (accentHex ?? '#10B981')
            // 2026-08-24: der Gold-Rueckfall greift auf der Buehne nie (dort ist
            // accentHex gesetzt), aber er stand ungegatet da und las sich wie
            // erlaubtes Gold. Jetzt sagt der Code, was gilt.
            : isTeamAP ? (accentHex ?? (istBuehneG() ? 'var(--qq-stage-accent)' : '#FBBF24'))
            : cellCol;
          const glowColor = isStar ? (accentHex ? `${accentHex}88` : '#EC489988')
            : isPin ? (accentHex ? `${accentHex}44` : '#10B98144')
            : isTeamAP ? (accentHex ? `${accentHex}77` : (istBuehneG() ? 'transparent' : '#FBBF2477'))
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
              // 2026-08-24 (2a): kein Hof um die Beispielzellen. Am echten
              // Brett hat auch keine Kachel einen.
              boxShadow: (filled && !istBuehneG()) ? `0 0 12px ${glowColor}` : 'none',
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
// Aktives Regel-Slide-Set fuer den aktuellen State (Mega/Flags beruecksichtigt).
// Von RulesView genutzt UND von der Team-Seite (RulesCard zeigt "Regel X von Y",
// UI-Review 2026-08-10 Punkt 4) — dieselbe Logik, damit die Zahl nie abweicht.
export function qqActiveRulesSlides(s: QQStateUpdate, lang: 'de' | 'en'): RulesSlide[] {
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
  return allSlides.filter(sl => {
    if (sl.requiresConnections && !connEnabled) return false;
    if (sl.requiresCozyGames && !cgEnabled) return false;
    if (sl.requiresComeback && !cbEnabled) return false;
    return true;
  });
}

export function RulesView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  // Wolf 2026-05-05: triggert Re-Render wenn Wolf im Rules-Editor speichert.
  useRuleOverridesVersion();
  const slides = qqActiveRulesSlides(s, lang);
  const mega = !!(s as any).largeGroupMode;
  const totalSlides = slides.length;
  const rawIdx = s.rulesSlideIndex ?? 0;
  // 2026-08-10: die alte Richtungs-Ermittlung (prevIdxRef/slideDir aus dem
  // Rules-Redesign 2026-07-15) war seit dem Zwei-Karten-Uebergang 2026-07-17d
  // toter Code — die Richtung kommt jetzt aus view.raw im Push-Effekt unten.
  // Entfernt, damit niemand sie fuer die aktive Logik haelt.

  // 2026-07-17d (Wolf „schieb das window mit der rule wirklich raus“): Zwei-
  // Karten-Uebergang. view = aktuell gezeigte Karte, outgoing = die verlassende.
  // Beide animieren gekoppelt (gleiche Dauer/Easing) -> echter Fenster-Schub, kein Fade.
  const [view, setView] = useState<{ raw: number; enterDir: 'fwd' | 'back' }>({ raw: rawIdx, enterDir: 'fwd' });
  const [outgoing, setOutgoing] = useState<{ raw: number; dir: 'fwd' | 'back' } | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (rawIdx === view.raw) return;
    const dir: 'fwd' | 'back' = rawIdx >= view.raw ? 'fwd' : 'back';
    setOutgoing({ raw: view.raw, dir });
    setView({ raw: rawIdx, enterDir: dir });
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => setOutgoing(null), 620);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawIdx]);
  useEffect(() => () => { if (pushTimer.current) clearTimeout(pushTimer.current); }, []);
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
  // 2026-08-22: aHex/aRGB entfernt — sie faerbten nur die Chips der alten
  // Navigationsleiste, die durch die StageStepBar ersetzt ist.

  // 2026-07-17d (Wolf „schieb das window mit der rule wirklich raus“): echter
  // Fenster-Schub - die Karte wird als Funktion gerendert, damit alte + neue Karte
  // GLEICHZEITIG animieren koennen (alt faehrt sichtbar raus, neu rein; gekoppelt,
  // KEIN Fade). renderCard baut eine Karte fuer einen beliebigen Slide.
  // 2026-07-17e (Wolf „kommen geschoben rein, aber schieben sich nicht schoen raus"):
  // Ein-/Ausgang ENTKOPPELT + alte Karte FUEHRT. Exit = schneller Start (ease-out),
  // die alte Karte schiesst sofort sichtbar nach aussen. Einzug leicht VERSETZT
  // (0.09s Delay) → die neue deckt die alte nicht zu, bevor sie draussen ist, und
  // settelt danach sanft. So sieht man die alte wirklich RAUS-geschoben.
  const PUSH_IN = '0.5s cubic-bezier(0.33, 0, 0.2, 1) 0.09s';
  const PUSH_OUT = '0.46s cubic-bezier(0, 0, 0.3, 1)';
  const PUSH_LAYER = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' } as const;
  const slideFor = (raw: number) => {
    const intro = raw === -1;
    const clamped = intro ? -1 : Math.max(0, Math.min(raw, totalSlides - 1));
    return { intro, cardIdx: clamped, cardSlide: intro ? introSlide : slides[clamped] };
  };
  const renderCard = (cardSlide: RulesSlide, cardIdx: number, cardIsIntro: boolean, animName: string) => {
    const hasGridC = !!cardSlide.grid;
    // 2026-08-22, KORREKTUR: die Schrift-Anhebung von vorhin galt pauschal und
    // hat die DICHTEN Folien zerschossen — auf „Der Ablauf" brach die
    // Ueberschrift mitten im Wort, der Tree lief rechts aus der Karte und die
    // Fusszeile wurde unten abgeschnitten. Wolf hat es gesehen, ich hatte
    // „nichts wird abgeschnitten" behauptet, ohne die Bilder anzusehen.
    // Die Karte hat eine FESTE Hoehe (damit der Rahmen zwischen den Seiten
    // nicht springt), also muss die Schrift der Fuellung folgen und nicht
    // umgekehrt. `dense` ist wahr, sobald ausser Text noch etwas drin ist.
    const dense = hasGridC || !!cardSlide.showTree || !!cardSlide.treeShowcase;
    /** Obergrenze je nach Dichte: auf vollen Folien der alte Wert. */
    const fs = (locker: number, voll: number) => (dense ? voll : locker);
    const isLastC = !cardIsIntro && cardIdx === totalSlides - 1;
    return (
      <div className="qqRulesCard" style={{
        position: 'relative', zIndex: 5,
        // 2026-08-24 (Wolf: „rand oben und unten und schwarze karte, findest
        // du sie passt?" und „leiste oben nicht header buendig"). Beides
        // dieselbe Sache: die Karte war 1200 px breit und sass damit 280 px
        // von der Buehnenkante entfernt, waehrend die Schrittleiste darueber
        // von Kante zu Kante laeuft. Zwei Kanten, die nichts miteinander zu tun
        // haben. Und die Karte ist die letzte grosse Flaeche auf der Buehne -
        // Brett, Zwischenstand und Fragefolie stehen seit heute ohne.
        // Jetzt steht der Inhalt auf dem Grund, und er nimmt die Breite, die
        // die Buehne hergibt. Damit ist der Abstand zur Leiste derselbe wie auf
        // den Fragefolien: die Leiste laeuft randlos, der Inhalt haelt den
        // Buehnenrand.
        maxWidth: istBuehneG() ? 1560 : 1200, width: '94%', overflow: 'hidden',
        // 2026-06-24 (Skin): Regel-Card traegt bei Skin card-bg + card-text
        // (sonst dunkle Card + geerbter dunkler Text = unlesbar auf hellen Skins).
        // Slide-Color-Rand bleibt als Kategorie-Akzent.
        // 2026-08-22 (Uebergabe 2a): die Karte war unsichtbar. Gemessen am
        // Screenshot: Karte #120e1a gegen Grund #110d1a = 1.01:1. Nicht „fast"
        // unsichtbar, sondern nicht unterscheidbar.
        //
        // Ursache war ein Denkfehler in der Flaechenleiter: `rgba(15,12,9,0.85)`
        // ist DUNKLER als der Grund. Eine Karte muss ueber dem Grund liegen,
        // nicht darunter — sonst ist sie ein Loch statt einer Flaeche. Der
        // Rahmen konnte das nicht auffangen, `${color}44` sind 27 % Deckkraft
        // auf einem dunklen Ton.
        //
        // 2026-08-22 (Wolf: „ja fuell die karte, mach ein optimiertes
        // spacing"): der Inhalt belegte gemessene 55 % der Kartenhoehe und
        // schwebte mit 157 px Luft oben und 198 unten in der Mitte. Alle
        // Schrift-Obergrenzen rund ein Viertel hoch — die Untergrenzen bleiben,
        // damit kleine Fenster im Steuerpult nicht brechen.
        // Jetzt die Buehnen-Tokens: 34-%-Flaeche und die Creme-Kontur bei 22 %.
        // Die Kontur traegt die Kante, nicht die Fuellung — genau die
        // Reihenfolge, die die Uebergabe fuer die Projektion vorgibt.
        background: istBuehneG() ? 'transparent' : 'var(--qq-card-bg)',
        color: isThemed() ? 'var(--qq-card-text)' : undefined,
        border: istBuehneG() ? 'none' : 'var(--qq-card-border)',
        borderRadius: 'var(--qq-card-radius)',
        padding: `clamp(24px, 4cqh, ${hasGridC ? 52 : 60}px) clamp(32px, 5cqw, ${hasGridC ? 64 : 72}px)`,
        // Der weite Farb-Hof faellt weg (120 px Weichzeichnung um eine Karte,
        // die dadurch keine Kante gewinnt, sondern eine verliert).
        boxShadow: istBuehneG() ? 'none' : 'var(--qq-card-shadow)',
        // 2026-07-17b (Wolf): horizontaler Einheits-Schwenk passend zum Progress-Tree
        // oben (vorwaerts von rechts, zurueck von links). Inhalt reist als Ganzes mit
        // (kein Per-Zeile-contentReveal), Opacity front-geladen → kein „totes Loch".
        // Icon + Titel bleiben die EINE Signatur. --qq-enter = Arena-Ankunft.
        animation: animName,
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
          {cardSlide.heroJokers ? (
            <div style={{
              display: 'inline-flex', alignItems: 'flex-end', gap: 'clamp(8px, 1cqw, 18px)',

              animation: 'qqCatNameWave 2.4s ease-in-out 1.3s infinite',
            }}>
              <JokerIcon i={0} size={'clamp(72px, 10cqw, 130px)'} eurovisionMode={!!s.theme?.eurovisionMode}
                style={{ animation: 'qqJokerWiggle 2.4s ease-in-out 0.5s infinite' }} />
              <JokerIcon i={1} size={'clamp(72px, 10cqw, 130px)'} eurovisionMode={!!s.theme?.eurovisionMode}
                style={{ animation: 'qqJokerWiggle 2.4s ease-in-out 1.7s infinite' }} />
            </div>
          ) : cardSlide.iconSlug ? (
            <span style={{
              display: 'inline-block',
              animation: 'qqCatNameWave 2.4s ease-in-out 1.3s infinite',
            }}><QQIcon slug={cardSlide.iconSlug} size={`clamp(72px,${dense ? 8 : 11}cqw,${fs(150, 100)}px)`} alt={cardSlide.title} /></span>
          ) : cardSlide.iconImg ? (
            <span style={{
              display: 'inline-block',

              animation: 'qqCatNameWave 2.4s ease-in-out 1.3s infinite',
            }}><CozyGameIcon id={cardSlide.iconImg} emoji={cardSlide.icon} size={'clamp(64px,9cqw,110px)'} /></span>
          ) : (
            <span style={{
              display: 'inline-block',
              fontSize: `clamp(56px,${dense ? 7 : 11}cqw,${fs(140, 92)}px)`, lineHeight: 1,

              animation: 'qqCatNameWave 2.4s ease-in-out 1.3s infinite',
            }}><QQEmojiIcon emoji={cardSlide.icon}/></span>
          )}
          {/* 2026-08-23 (Wolf: „diese mini unterschriften der emojis koennen
              eigentlich weg, sie sind kommentar aber nicht notwendig"):
              stimmt, und auf der Buehne kostet sie sogar etwas. „SPIELREGELN"
              stand ueber einer Folie, auf der schon oben eine Schrittleiste
              laeuft und darunter in doppelter Groesse „Das Ziel" steht — sie
              hat wiederholt, was der Zusammenhang ohnehin sagt.
              Der alte Grund, sie zu behalten, gilt hier nicht mehr: der
              Kommentar von 2026-08-22 sagt, die Folienfarbe trage sich „ueber
              die kleine Ueberzeile und den Kartenrand". Im Buehnen-Look ist
              beides nicht mehr wahr — die Ueberzeile war `--qq-text-muted`,
              der Rand ist `--qq-card-border` und der Trenner `--qq-accent`.
              Die Folienfarbe war auf dieser Folie also ohnehin nirgends mehr
              zu sehen; entfernt wird eine graue Zeile, keine Farbe.
              `cardSlide.eyebrow` bleibt, die Schrittleiste beschriftet damit
              die Intro-Station. */}
          <div style={{
            // 2026-07-04 (Wolf 'Titel oben abgeschnitten'): etwas kleiner, damit
            // lange Titel ('Dein Weg durchs Quiz') in die feste Card passen.
            // 2026-07-17 (Cinzel-Rollout): Arena-Regel-Titel in Cinzel (nur mega+!skin).
            fontFamily: qqArenaType(s) ? 'var(--font-arena)' : undefined,
            letterSpacing: qqArenaType(s) ? '0.01em' : undefined,
            fontSize: `clamp(34px, ${dense ? 4.6 : 7}cqw, ${fs(94, 62)}px)`, fontWeight: 900, lineHeight: 1.05,
            // 2026-08-22 (Uebergabe 2a, Wolf freigegeben): Ueberschrift auf
            // Creme, dieselbe Regel wie im Phasen-Intro und auf den
            // Frage-Folien. Die Folienfarbe traegt weiter die kleine
            // Ueberzeile darueber und den Kartenrand — sie wandert vom Text
            // auf die Marker. Kontrast gegen den Buehnen-Grund: Creme 16.6:1
            // gegen 5.4:1 beim Marken-Pink.
            color: isThemed() ? 'var(--qq-title)' : 'var(--qq-text)',
            // 2026-08-22: „Dein Weg durchs Q | uiz" — die Ueberschrift brach
            // MITTEN IM WORT, sobald sie zu breit wurde. Derselbe Fehler wie
            // bei den Teamnamen am Brett, und dieselbe Loesung:
            //   overflowWrap  bricht nur in ein Wort hinein, wenn das Wort
            //                 allein schon breiter als die Zeile ist
            //   hyphens       macht aus einem erzwungenen Bruch einen mit
            //                 sichtbarem Trennstrich (<html lang="de">)
            //   textWrap      verteilt zwei Zeilen gleichmaessig, statt die
            //                 erste vollaufen zu lassen
            overflowWrap: 'break-word',
            hyphens: 'auto',
            WebkitHyphens: 'auto' as never,
            textWrap: 'balance',
            // Der weite Farb-Schein hinter der Schrift faellt mit weg: auf
            // Projektionsdistanz macht er keine Tiefe, er frisst die Kante.
            textShadow: 'none',
          }}>
            {/* 2026-05-05 (Wolf): Wave-Animation pro Buchstabe, gleiche
                Bewegungs-Sprache wie Cat-Intro-Headline. Stagger 0.08s.

                2026-08-23: „Jetzt komme | n die Regeln". Der Bruch mitten im
                Wort war NIE ueber `overflowWrap`/`hyphens` zu beheben, und der
                Kommentar von 2026-08-22 weiter oben ist deshalb falsch: die
                Ueberschrift besteht aus einem `inline-block` PRO BUCHSTABE.
                Fuer den Umbruch sind das lauter eigenstaendige Kaesten und
                kein Wort, der Browser darf also zwischen je zwei von ihnen
                brechen, und die Silbentrennung hat gar nichts, woran sie
                greifen koennte. Aufgefallen ist es erst jetzt, weil meine
                Aufnahmen bis eben auf Englisch liefen („Now the rules" ist
                kurz genug).
                Jetzt kommen die Buchstaben eines Wortes in eine gemeinsame
                Huelle mit `nowrap`. Innen wiegt weiter jeder Buchstabe fuer
                sich, gebrochen wird nur noch zwischen den Woertern. */}
            {(() => {
              const woerter = cardSlide.title.split(' ');
              let n = 0;
              return woerter.map((wort, w) => (
                <Fragment key={`${cardIdx}-w${w}`}>
                  {w > 0 && ' '}
                  <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                    {wort.split('').map((char, i) => {
                      const idx = n++;
                      return (
                        <span key={i} style={{
                          display: 'inline-block',
                          // 2026-07-17c (Wolf „ganze windows reingeschoben"): Titel STARR,
                          // faehrt mit dem geschobenen Fenster mit (keine Buchstaben-
                          // Kaskade); nur das ambiente Wiegen bleibt.
                          animation: `qqCatNameWave 2.4s ease-in-out ${1.0 + idx * 0.08}s infinite`,
                        }}>{char}</span>
                      );
                    })}
                  </span>
                </Fragment>
              ));
            })()}
          </div>
        </div>

        {/* Divider — symmetrischer Gradient + continuous shimmer (analog Round-Intro-Bar
            und Welcome-Linie, damit die drei Marken-Folien dieselbe Bewegungs-Sprache
            sprechen). */}
        <div style={{
          width: '100%', height: 3, borderRadius: 2,
          background: isThemed()
            ? 'linear-gradient(90deg, transparent, var(--qq-accent) 50%, transparent)'
            : `linear-gradient(90deg, transparent, ${cardSlide.color}cc 50%, transparent)`,
          backgroundSize: '200% 100%',
          marginBottom: 'clamp(16px, 2.5cqh, 32px)',
          // 2026-07-17c (Wolf „ganze windows reingeschoben"): Divider STARR (kein
          // Aufzieh-Draw mehr), faehrt mit dem Fenster mit; nur der Shimmer laeuft.
          animation: 'lineShimmer 3s linear 0.9s infinite',
          // 2026-08-24 (2a): hier zog `isThemed()` die Buehne ausgerechnet in den
          // Zweig MIT dem Hof - der klassische Verdrahtungsfehler. Eine 3px hohe
          // Trennlinie mit 18px Hof ist auf acht Metern nur ein Schleier.
          boxShadow: istBuehneG() ? 'none' : (isThemed() ? '0 0 18px rgba(var(--qq-accent-rgb),0.27)' : `0 0 18px ${cardSlide.color}44`),
        }} />

        {/* Content: text left, grid right (if grid exists) */}
        <div style={{
          display: 'flex', gap: 'clamp(24px, 3cqw, 48px)',
          alignItems: (cardSlide.showTree || cardSlide.treeShowcase) ? 'stretch' : 'center',
          flexDirection: (cardSlide.showTree || cardSlide.treeShowcase) ? 'column' : (hasGridC ? 'row' : 'column'),
        }}>
          {/* Fortschrittsbaum (Inline-Variante in Abilities-Slide) */}
          {cardSlide.showTree && (
            <div style={{ display: 'flex', justifyContent: 'center', animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.05s both' }}>
              {/* 2026-06-29 (Wolf 'Wolf auch über den normalen Tree'): wolfAbove
                  → Wolf schwebt über der Linie (Pin), aktuelle Kategorie bleibt
                  sichtbar — konsistent mit dem Journey-Look. */}
              <QQProgressTree state={s} variant="inline" wolfAbove lang={lang} />
            </div>
          )}

          {/* TREE SHOWCASE — eigene Slide, Tree groß + Phasen-Sweep */}
          {cardSlide.treeShowcase && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 'clamp(20px, 3cqh, 40px)',
              animation: 'contentReveal 0.6s var(--qq-ease-pop-fast) 0.1s both',
              padding: 'clamp(8px, 1.5cqh, 24px) 0',
            }}>
              {/* 2026-08-22 (Wolf: „der progress tree in dein weg durchs quiz
                  sieht nicht gut aus"): die Showcase-Variante ist eine
                  KAMERAFAHRT — sie pant durch die Runden und schneidet dafuer
                  absichtlich ab. Der Tree war also nicht kaputt, aber fuer
                  diese Folie das falsche Mittel: die Aussage ist „3 Runden,
                  5 Kategorien", also die FORM des Abends. Eine Fahrt laesst
                  einen darauf warten, und ein am Kartenrand abgeschnittener
                  Streifen liest sich als Fehler, nicht als Kamerabewegung.
                  Jetzt die Inline-Variante, auf die Kartenbreite herunter-
                  skaliert: der ganze Abend auf einen Blick, nichts
                  abgeschnitten. */}
              {/* 2026-08-22 (Wolf: „oder nur eine beispielrunde? spaeter kommt
                  dann der ganze progress tree?"): ja, und das ist besser als
                  meine erste Fassung. Der ganze Abend passte zwar hinein,
                  schrumpfte die Kacheln dabei aber auf 28 px — unter der
                  Lesbarkeitsgrenze fuer 8 m Distanz. Und die Aussage dieser
                  Folie ist „so sieht EINE Runde aus", nicht „hier sind alle
                  15 Fragen". Den ganzen Baum bekommt das Publikum im
                  Runden-Intro, wo er echter Fortschritt ist.
                  `onlyPhase` laesst die anderen Runden aus dem LAYOUT fallen —
                  `focusPhaseIdx` haette sie nur abgeblendet, und abgeblendet
                  belegen sie weiter Breite. Genau daran hingen die 28 px.
                  VORSCHLAG 2026-08-22, leicht zurueckzudrehen: der Wolf ist
                  hier aus (`wolfHidden`). Er ist die Ich-bin-hier-Marke, und
                  hier gibt es noch kein Hier — das Spiel wird gerade erst
                  erklaert. Ausserdem ragte er bei dieser Kachelgroesse in die
                  Ueberschriftenzeile.
                  Kein FitToWidth mehr: eine Runde ist ~650 px breit und passt
                  ohne Verkleinern in die Karte; sein overflow:hidden hat den
                  Wolf zusaetzlich angeschnitten. */}
              <QQProgressTree state={s} variant="inline" wolfHidden onlyPhase={1} bigIcons lang={lang} />
              {/* 2026-08-22: der pulsende Punkt vor dieser Zeile ist raus.
                  Er war 8 px gross (Regel 7 verlangt mindestens 12), rund
                  (Regel 4) und hat nichts bedeutet — er hat gepulst, weil
                  Pulsen huebsch aussieht. Genau der Fall aus Regel 5: ein
                  Schein, der schmueckt, geht. Die Zeile selbst bleibt, sie ist
                  ueber `rules.slide3.hint` von Wolf editierbar. */}
              <div style={{
                fontSize: 'clamp(18px, 2.4cqw, 34px)', fontWeight: 700,
                color: 'var(--qq-text-muted)', letterSpacing: '0.04em',
                textAlign: 'center',
                animation: 'contentReveal 0.6s var(--qq-ease-pop-fast) 0.5s both',
              }}>
                {/* 2026-08-23: die Zeile sagte „5 Kategorien pro Runde" und
                    stand damit direkt ueber „N Runden mit je 5 Kategorien" —
                    dieselbe Aussage zweimal, einmal klein und grau. Uebrig
                    bleibt der Teil, den sonst niemand sagt: der Twist. */}
                {getRuleText('rules.slide3.hint', lang, lang === 'de'
                  ? 'Jede Kategorie hat ihren eigenen Twist'
                  : 'Every category has its own twist')}
              </div>
            </div>
          )}

          {/* Text lines — zentriert für Quiz-Event-Look (kein Bullet-Liste-
              Eindruck, klare Stage-Präsentation). */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: 'clamp(10px, 1.5cqh, 20px)', flex: 1,
            alignItems: 'center', textAlign: 'center',
          }}>
            {/* 2026-07-17 (Motion-Pass): Zeilen reisen als Einheit mit der Karte
                (kein gestaffelter Per-Zeile-contentReveal = kein „Aufzaehlungspunkte
                erscheinen"-Gefuehl). Sie sind fertig gesetzt, wenn die Folie landet. */}
            {cardSlide.lines.map((line, i) => (
              <div key={i} style={{ maxWidth: 920 }}>
                <span style={{
                  fontSize: 'clamp(22px,3.5cqw,48px)', fontWeight: 700,
                  color: 'var(--qq-card-text)', lineHeight: 1.3,
                }}>{line}</span>
              </div>
            ))}
            {/* Ability-Badges (Bann, Schild, Tauschen, …) als Icon-Strip */}
            {cardSlide.abilities && cardSlide.abilities.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                gap: 'clamp(10px, 1.4cqw, 20px)', marginTop: 'clamp(10px, 1.6cqh, 22px)',
              }}>
                {cardSlide.abilities.map((b, i) => (
                  <div key={`${b.label}-${i}`} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: 'clamp(10px, 1.2cqh, 16px) clamp(14px, 1.6cqw, 22px)', borderRadius: 16,
                    background: istBuehneG() ? 'rgba(246,239,230,0.05)' : `${b.accent}1a`,
                    border: istBuehneG() ? '1.5px solid var(--qq-hairline)' : `2px solid ${b.accent}55`,
                    boxShadow: istBuehneG() ? 'none' : `0 0 18px ${b.accent}33`,
                    minWidth: 'clamp(96px, 11cqw, 140px)',
                    // 2026-07-17c (Wolf „ganze windows reingeschoben"): starr, faehrt mit
                    // dem geschobenen Fenster mit (kein eigener Fade).
                  }}>
                    {b.slug
                      ? <QQIcon slug={b.slug} size={'clamp(40px, 5.5cqw, 72px)'} alt={b.label} />
                      : <span style={{ fontSize: 'clamp(36px, 5cqw, 64px)', lineHeight: 1 }}><QQEmojiIcon emoji={b.emoji}/></span>}
                    <div style={{
                      // 2026-08-24: 22px lagen unter dem Grad-Boden, und die
                      // Beschriftung stand in derselben Farbe wie ihr Rahmen.
                      fontSize: istBuehneG() ? 'clamp(22px, 2.1cqw, 30px)' : 'clamp(14px, 1.6cqw, 22px)',
                      fontWeight: 900,
                      color: istBuehneG() ? 'var(--qq-text)' : b.accent, letterSpacing: '0.04em',
                    }}>{b.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mini grid example */}
          {cardSlide.grid && <RulesMiniGrid grid={cardSlide.grid} slideColor={cardSlide.color} eurovisionMode={!!s.theme?.eurovisionMode} />}
        </div>

        {/* Extra callout — zentriert */}
        {cardSlide.extra && (
          <div style={{
            // 2026-08-22 (Wolf: „hauptsache ihr habt spass ist in grauem kasten,
            // ausserdem klingt es komisch"): der Kasten ist weg. Eine
            // Schlusszeile braucht keine Umrandung — sie steht am Ende der
            // Karte und ist dadurch schon abgesetzt. Der Kasten war ausserdem
            // eine DRITTE Flaeche: Grund, Karte, Kasten. Die Flaechenleiter der
            // Uebergabe hat drei Stufen, und die dritte ist fuer Bedeutung
            // reserviert, nicht fuer eine Grussformel.
            marginTop: 'clamp(20px, 3cqh, 40px)',
            fontSize: `clamp(18px,${dense ? 2.2 : 3}cqw,${fs(44, 32)}px)`, fontWeight: 900,
            color: isThemed() ? 'var(--qq-accent)' : cardSlide.color,
            textShadow: 'none',
            textAlign: 'center',
          }}>
            {/* 2026-08-24: die Schlusszeile trug ein rohes „🏆" mitten im Satz -
                also die Systemschrift des Rechners auf unserer Buehne.
                QQEmojiText ersetzt jedes bekannte Zeichen durch das gelieferte
                und laesst den Rest Text. Gilt auch fuer ueberschriebene
                Regeltexte, in denen das Zeichen woanders stehen kann. */}
            <QQEmojiText text={cardSlide.extra} />
          </div>
        )}

        {/* Last slide hint */}
        {isLastC && (
          <div style={{
            marginTop: 'clamp(16px, 2.5cqh, 32px)', textAlign: 'center',
            fontSize: `clamp(20px,${dense ? 2.4 : 3.5}cqw,${fs(48, 34)}px)`, fontWeight: 900,
            color: isThemed() ? 'var(--qq-accent)' : cardSlide.color,
            /* Wolf „ganze windows reingeschoben": starr, faehrt mit dem Fenster mit. */
            textShadow: isThemed() ? 'none' : `0 0 24px ${cardSlide.color}33`,
          }}>
            <QQEmojiText text={getRuleText('rules.lastSlideHint', lang, lang === 'de' ? '🎬 Los geht\'s!' : '🎬 Let\'s go!')} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      // 2026-07-17 (Wolf „generell die subfont im colloseum"): im Arena-Modus erbt
      // der ganze Regel-Body EB Garamond (Cinzel-Titel hat eigene fontFamily und
      // ueberschreibt) → kohaerentes Cinzel+Garamond-System.
      position: 'relative', overflow: 'hidden',
      fontFamily: qqArenaType(s) ? 'var(--font-arena-body)' : fontFam,
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
        /* 2026-07-17 (Motion-Wertigkeits-Pass, Nordstern „Premium schlaegt fruehere
           Deko"): Regel-Karte tritt als EINHEIT an (Inhalt faehrt mit, kein separates
           Zeilen-Eintippen). Opacity front-geladen (voll bei 30% ~0.13s) → kein „totes
           Loch" zwischen Folien.
           Depth-Variante (aufgehoben, falls Wolf zurueck will): translateY+scale.
           2026-07-17b (Wolf): horizontaler Einheits-Schwenk STATT Tiefe, damit die
           Karte zur horizontalen Bewegung des Progress-Trees oben passt (kohaerenter
           Kamera-Schwenk durch die Reise). Vorwaerts = von rechts rein, zurueck = von
           links. Unterschied zum alten PowerPoint-Push (qqRulesSlideR): Inhalt faehrt
           STARR als ganzes Fenster mit (kein Buchstaben-/Divider-/Icon-Entrance mehr,
           s.u.), Opacity front-geladen (kein Loch).
           2026-07-17c (Wolf „nicht wirklich als ganze windows reingeschoben"): deutlich
           mehr Weg (150px) + Inhalt komplett starr → liest sich als geschobenes Fenster
           statt „Inhalt baut sich auf". */
        @keyframes qqRulesArrive{0%{opacity:0;transform:translateY(18px) scale(.955)}30%{opacity:1}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes qqRulesPushInR{from{transform:translateX(135%)}to{transform:translateX(0)}}
        @keyframes qqRulesPushInL{from{transform:translateX(-135%)}to{transform:translateX(0)}}
        @keyframes qqRulesPushOutL{from{transform:translateX(0)}to{transform:translateX(-135%)}}
        @keyframes qqRulesPushOutR{from{transform:translateX(0)}to{transform:translateX(135%)}}
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
          .qqRulesCard{animation-duration:0.01ms !important}
        }
      `}</style>

      {/* AUSSER-WERTUNG-ANFANG: CozyArena-Glut, nur im Arena-Modus */}
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
      {/* AUSSER-WERTUNG-ENDE (CozyArena-Glut) */}

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
        if (stepList.length <= 1) return null;
        // 2026-08-22 (Wolf: „die leiste oben gefaellt mir noch nicht"): die
        // Reihe aus fuenf beschrifteten Chips ist weg, ersetzt durch die
        // StageStepBar am oberen Buehnenrand. Begruendung steht dort.
        return (
          <StageStepBar
            total={stepList.length}
            current={activeStep}
            endsAt={(s as any).rulesSlideEndsAt ?? null}
            durationSec={QQ_RULES_SLIDE_SEC}
          />
        );
      })()}

      {/* Fenster-Schub (Wolf „schieb das window wirklich raus“): outgoing faehrt
          sichtbar nach aussen, view faehrt gekoppelt rein - deckungsgleich, KEIN Fade. */}
      <div style={{
        position: 'relative', zIndex: 5, flex: 1, width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0,
      }}>
        {outgoing && outgoing.raw >= -1 && (() => {
          const o = slideFor(outgoing.raw);
          const anim = outgoing.dir === 'fwd' ? 'qqRulesPushOutL' : 'qqRulesPushOutR';
          return (
            <div key={'out-' + outgoing.raw} aria-hidden style={PUSH_LAYER}>
              {renderCard(o.cardSlide, o.cardIdx, o.intro, anim + ' ' + PUSH_OUT + ' both')}
            </div>
          );
        })()}
        {(() => {
          const v = slideFor(view.raw);
          const anim = view.enterDir === 'fwd' ? 'qqRulesPushInR' : 'qqRulesPushInL';
          return (
            <div key={'in-' + view.raw} style={PUSH_LAYER}>
              {renderCard(v.cardSlide, v.cardIdx, v.intro, anim + ' ' + PUSH_IN + ' both')}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
