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
import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { useLangFlip } from '../cozyQuizShared';
import { getRuleText, useRuleOverridesVersion } from '../qqRuleTexts';
import { QQIcon, QQEmojiIcon } from './QQIcon';
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
  title: string;
  color: string;
  lines: string[];
  extra?: string;
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
    {
      icon: '🏆',
      title: t('rules.slide1.title', 'Das Ziel'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.slide1.line1', 'Größtes zusammenhängendes Gebiet gewinnt'),
      ],
    },
    {
      icon: '⚡',
      title: t('rules.slide2.title', 'So läuft\'s'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.slide2.line1', `${totalPhases} Runden · 5 Kategorien`).replace('{phases}', String(totalPhases)),
        t('rules.slide2.line2', 'Richtige Antwort → Feld setzen'),
        t('rules.slide2.line3', 'Tempo entscheidet bei Gleichstand'),
      ],
    },
    {
      icon: '🗺',
      title: t('rules.slide3.title', 'Dein Weg durchs Quiz'),
      color: RULES_SLIDE_COLOR,
      lines: [],
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
          // 2026-05-17 (Wolf): Joker sitzt ON dem Muster, nicht daneben.
          // 2×2-Block oben links mit ⭐ als eine seiner 4 Zellen (1,0).
          // 4er-Reihe rechts mit ⭐ als eine seiner 4 Zellen (3,2).
          ['A',  '⭐', null, 'A'],
          ['A',  'A',  null, 'A'],
          [null, null, null, '⭐'],
          [null, null, null, 'A'],
        ],
        colorA: '#3B82F6', colorB: '#EF4444',
        label: t('rules.slide4.gridLabel', 'Beide Muster zählen'),
      },
    },
    {
      icon: '🎁',
      title: t('rules.slide6.title', 'Bunte Tüte'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.slide6.line1', 'Eine Kategorie pro Runde ist eine Überraschung'),
        t('rules.slide6.line2', '4 gewinnt · Bluff · Hot Potato · Top 5 · Reihenfolge · CozyGuessr'),
      ],
      extra: t('rules.slide6.extra', 'Regeln werden vor jeder Frage kurz erklärt'),
    },
    {
      icon: '🪅',
      title: t('rules.slide_cozygames.title', 'CozyGame'),
      color: RULES_SLIDE_COLOR,
      requiresCozyGames: true,
      lines: [
        t('rules.slide_cozygames.line1', 'Nach jeder Runde dreht das Glücksrad — ein analoges Mini-Spiel'),
        t('rules.slide_cozygames.line2', 'Sieger setzt 1 Aktion auf dem Brett · Geschick > Wissen'),
      ],
      // 2026-05-17 (Wolf): extra-Beschreibung raus — Moderator erklärt das selbst.
    },
    {
      icon: '🔄',
      title: t('rules.slide7.title', 'Comeback'),
      color: RULES_SLIDE_COLOR,
      requiresComeback: true,
      lines: [
        t('rules.slide7.line1', 'Letztes Team holt vor dem Finale auf'),
        t('rules.slide7.line2', '„Mehr oder Weniger?" — Treffer klaut Feld vom 1. Platz'),
      ],
    },
    {
      // 2026-05-09 (Rules-Audit Wolf): Final-Tipp ist seit Tipp-Variante-
      // Refactor neue Mechanik. Sympathie-Bonus bewusst NICHT erwähnt —
      // Wolf möchte den als Überraschung beim End-Reveal lassen.
      icon: '🎰',
      title: t('rules.slide_final_tip.title', 'Final-Tipp'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.slide_final_tip.line1', 'Vor dem Finale tippt jedes Team auf ein anderes (oder eigenes) Team'),
        t('rules.slide_final_tip.line2', 'Pro gewonnene Final-Kategorie eures Tipps = +1 Bonus'),
      ],
      // 2026-05-17 (Wolf): extra-Beschreibung raus — Moderator erklärt das selbst.
    },
    {
      // 2026-05-09 (Rules-Audit Wolf): Fair Play / Anti-Google
      icon: '🤝',
      title: t('rules.slide_fairplay.title', 'Fair Play'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.slide_fairplay.line1', 'Kein Googeln · Smartphone in die Hosentasche'),
        t('rules.slide_fairplay.line2', 'Antworten nicht zwischen Teams spoilern'),
        t('rules.slide_fairplay.line3', 'Im Zweifel zählt der Moderator-Wolf 🐺'),
      ],
      extra: t('rules.slide_fairplay.extra', 'Spielfreude > Punkte. Habt Spaß!'),
    },
    {
      icon: '🧩',
      title: t('rules.slide8.title', 'Großes Finale'),
      color: RULES_SLIDE_COLOR,
      requiresConnections: true,
      lines: [
        t('rules.slide8.line1', '16 Begriffe · 4 Gruppen finden'),
        t('rules.slide8.line2', 'Pro Gruppe = 1 Stapel-Bonus (+1 Pkt) auf eure Felder'),
      ],
      extra: t('rules.slide8.extra', '🏆 Größtes Gebiet + Boni danach gewinnt'),
    },
  ];
}

function buildRulesSlidesEn(totalPhases: 3 | 4): RulesSlide[] {
  const t = (k: string, fb: string) => getRuleText(k, 'en', fb);
  // 2026-05-09 (Wolf): New-Abilities slide removed — Steal/Stack revealed
  // as a surprise at the round-intro (3D card-flip with NEW badge).
  return [
    {
      icon: '🏆',
      title: t('rules.slide1.title', 'The Goal'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.slide1.line1', 'Largest connected area wins'),
      ],
    },
    {
      icon: '⚡',
      title: t('rules.slide2.title', 'How It Works'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.slide2.line1', `${totalPhases} rounds · 5 categories`).replace('{phases}', String(totalPhases)),
        t('rules.slide2.line2', 'Right answer → place a cell'),
        t('rules.slide2.line3', 'Speed decides ties'),
      ],
    },
    {
      icon: '🗺',
      title: t('rules.slide3.title', 'Your Quiz Roadmap'),
      color: RULES_SLIDE_COLOR,
      lines: [],
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
          // 2026-05-17 (Wolf): Joker sits ON the pattern, not beside it.
          // 2×2 block top-left with ⭐ as one of its 4 cells (1,0).
          // 4-in-a-row right with ⭐ as one of its 4 cells (3,2).
          ['A',  '⭐', null, 'A'],
          ['A',  'A',  null, 'A'],
          [null, null, null, '⭐'],
          [null, null, null, 'A'],
        ],
        colorA: '#3B82F6', colorB: '#EF4444',
        label: t('rules.slide4.gridLabel', 'Both patterns count'),
      },
    },
    {
      icon: '🎁',
      title: t('rules.slide6.title', 'Lucky Bag'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.slide6.line1', 'One category per round is a surprise'),
        t('rules.slide6.line2', 'Connect 4 · Bluff · Hot Potato · Top 5 · Order · CozyGuessr'),
      ],
      extra: t('rules.slide6.extra', 'Rules are briefly explained before each question'),
    },
    {
      icon: '🪅',
      title: t('rules.slide_cozygames.title', 'CozyGame'),
      color: RULES_SLIDE_COLOR,
      requiresCozyGames: true,
      lines: [
        t('rules.slide_cozygames.line1', 'After every round the wheel spins — one analog mini-game'),
        t('rules.slide_cozygames.line2', 'Winner places 1 action on the board · skill > knowledge'),
      ],
    },
    {
      icon: '🔄',
      title: t('rules.slide7.title', 'Comeback'),
      color: RULES_SLIDE_COLOR,
      requiresComeback: true,
      lines: [
        t('rules.slide7.line1', 'Last-place team catches up before the finale'),
        t('rules.slide7.line2', '„Higher or Lower?" — correct answer steals a cell from the leader'),
      ],
    },
    {
      icon: '🎰',
      title: t('rules.slide_final_tip.title', 'Final Tip'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.slide_final_tip.line1', 'Before the finale every team tips on another (or own) team'),
        t('rules.slide_final_tip.line2', 'Per final-category win of your tip = +1 bonus'),
      ],
    },
    {
      icon: '🤝',
      title: t('rules.slide_fairplay.title', 'Fair Play'),
      color: RULES_SLIDE_COLOR,
      lines: [
        t('rules.slide_fairplay.line1', 'No googling · phones in your pocket'),
        t('rules.slide_fairplay.line2', "Don't spoil answers between teams"),
        t('rules.slide_fairplay.line3', 'When in doubt, the wolf decides 🐺'),
      ],
      extra: t('rules.slide_fairplay.extra', 'Fun > points. Enjoy!'),
    },
    {
      icon: '🧩',
      title: t('rules.slide8.title', 'Grand Finale'),
      color: RULES_SLIDE_COLOR,
      requiresConnections: true,
      lines: [
        t('rules.slide8.line1', '16 terms · find 4 hidden groups'),
        t('rules.slide8.line2', 'Each group = 1 stack-bonus (+1 pt) on your cells'),
      ],
      extra: t('rules.slide8.extra', '🏆 Largest area + bonuses wins'),
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
          const isStar = cell === '⭐';
          const isPin = cell === '🏯';
          const filled = isTeamA || isStar || isPin;
          const bg = isStar
            ? `linear-gradient(135deg, ${grid.colorA}cc, #EC4899cc)`
            : isPin
              ? `linear-gradient(135deg, ${grid.colorA}cc, #10B981cc)`
              : isTeamA
                ? `${grid.colorA}aa`
                : 'rgba(255,255,255,0.06)';
          // 2026-05-09 (Wolf-Wunsch): Joker-Cells nutzen die echten Joker-PNGs
          // (boy/girl alternierend per row+col-index) statt 🃏-Emoji + Wiggle-
          // Animation für „der Joker leuchtet auf, wenn das Pattern gebildet ist".
          const inDelay = 0.3 + (r * cols + c) * 0.06;
          const jokerVariantIndex = r + c;
          return (
            <div key={`${r}-${c}`} style={{
              width: cellSz, height: cellSz,
              borderRadius: Math.max(4, cellSz * 0.18),
              background: bg,
              border: filled ? `2px solid ${isStar ? '#EC4899' : isPin ? '#10B981' : grid.colorA}` : '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: cellSz * 0.5,
              boxShadow: filled ? `0 0 12px ${isStar ? '#EC489988' : isPin ? '#10B98144' : grid.colorA + '44'}` : 'none',
              animation: filled
                ? isStar
                  // Joker: erst rein-fade, dann wiggle-Pulse infinite
                  ? `gridCellIn 0.4s ease ${inDelay}s both, qqJokerWiggle 2.4s ease-in-out ${inDelay + 0.5}s infinite`
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
          color: slideColor, letterSpacing: '0.04em',
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
  const allSlides = lang === 'en' ? buildRulesSlidesEn(totalPhases) : buildRulesSlidesDe(totalPhases);
  // 2026-05-09 (Wolf): Slides mit requiresConnections (z.B. 4×4-Finale) nur
  // zeigen wenn der Mod das Connections-Feature aktiviert hat. Comeback bleibt.
  // 2026-05-17: Analog für requiresCozyGames.
  const cgEnabled = !!(s as any).cozyGamesEnabled;
  const cbEnabled = (s as any).comebackEnabled !== false;
  const slides = allSlides.filter(sl => {
    if (sl.requiresConnections && s.connectionsEnabled === false) return false;
    if (sl.requiresCozyGames && !cgEnabled) return false;
    if (sl.requiresComeback && !cbEnabled) return false;
    return true;
  });
  const totalSlides = slides.length;
  const rawIdx = s.rulesSlideIndex ?? 0;
  // idx<0 = Overlay-Phase (Willkommen/Regel-Intro). Nichts rendern, damit der
  // Crossfade der Overlays nicht die erste Regel-Folie im Hintergrund zeigt.
  if (rawIdx < 0) return null;
  const idx = Math.max(0, Math.min(rawIdx, totalSlides - 1));
  const slide = slides[idx];
  const fontFam = s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif` : "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif";
  const isLast = idx === totalSlides - 1;
  const hasGrid = !!slide.grid;

  // 2026-05-08 (Wolf-Wunsch 'regelslides mit /animations Slot-1 animieren'):
  // Direction-Tracking — bei Slide N→N+1 slidet die neue Card von rechts rein
  // (forward), bei N→N-1 von links (backward). Vorher: phasePop-Mount (subtle
  // scale 0.94→1). Pragma-Variante ohne Dual-Render — alte Slide unmountet
  // via React-key-Wechsel sofort, neue Slide kommt dramatisch rein.
  const prevIdxRef = useRef(idx);
  const direction = idx > prevIdxRef.current ? 'forward'
                  : idx < prevIdxRef.current ? 'backward'
                  : 'forward';
  useEffect(() => { prevIdxRef.current = idx; }, [idx]);
  const slideInAnim = direction === 'forward' ? 'qqStageSlideInRight' : 'qqStageSlideInLeft';

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

      {/* Main card — full-width for beamer readability.
          2026-05-08 (Wolf-Wunsch /animations Slot-1): Slide-In statt phasePop.
          Forward = von rechts, Backward = von links. Spring-Easing für sanftes
          Settle-Overshoot. */}
      <div key={idx} style={{
        position: 'relative', zIndex: 5,
        maxWidth: 1200, width: '94%', maxHeight: '92cqh', overflow: 'hidden',
        background: 'rgba(15,12,9,0.85)',
        border: `2px solid ${slide.color}44`,
        borderRadius: 24,
        padding: `clamp(24px, 4cqh, ${hasGrid ? 52 : 60}px) clamp(32px, 5cqw, ${hasGrid ? 64 : 72}px)`,
        boxShadow: `0 0 120px ${slide.color}22, 0 16px 48px rgba(0,0,0,0.6)`,
        animation: `${slideInAnim} 0.55s cubic-bezier(0.34, 1.30, 0.64, 1) both`,
        backdropFilter: 'blur(10px)',
        willChange: 'transform, opacity',
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
          ) : (
            <span style={{
              display: 'inline-block',
              fontSize: 'clamp(64px,9cqw,110px)', lineHeight: 1,
              filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))',
              animation: 'qqCatNameWave 2.4s ease-in-out 1.3s infinite',
            }}><QQEmojiIcon emoji={slide.icon}/></span>
          )}
          <div style={{
            fontSize: 'clamp(13px,1.4cqw,18px)', fontWeight: 900, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: `${slide.color}88`,
          }}>
            {getRuleText('rules.header', lang, lang === 'de' ? 'Spielregeln' : 'Game Rules')}
          </div>
          <div style={{
            fontSize: 'clamp(44px,7cqw,88px)', fontWeight: 900, lineHeight: 1.05,
            color: slide.color,
            textShadow: `0 0 60px ${slide.color}44`,
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
          background: `linear-gradient(90deg, transparent, ${slide.color}cc 50%, transparent)`,
          backgroundSize: '200% 100%',
          marginBottom: 'clamp(16px, 2.5cqh, 32px)',
          animation: 'lineShimmer 3s linear infinite',
          boxShadow: `0 0 18px ${slide.color}44`,
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
              <QQProgressTree state={s} variant="inline" />
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
                  background: '#EC4899', boxShadow: '0 0 12px rgba(236,72,153,0.65)',
                  animation: 'qqShowcaseHintPulse 1.6s ease-in-out infinite',
                }} />
                {getRuleText('rules.slide3.hint', lang, lang === 'de'
                  ? '5 Kategorien pro Runde — jede mit eigenem Twist'
                  : '5 categories per round — each with its own twist')}
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
                  color: '#e2e8f0', lineHeight: 1.3,
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
            marginTop: 'clamp(16px, 2.5cqh, 32px)', padding: 'clamp(12px, 1.8cqh, 20px) clamp(18px, 2.2cqw, 28px)', borderRadius: 16,
            background: `${slide.color}15`, border: `2px solid ${slide.color}33`,
            fontSize: 'clamp(18px,2.4cqw,34px)', fontWeight: 900,
            color: slide.color,
            animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.4s both',
            textShadow: `0 0 24px ${slide.color}33`,
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
            color: slide.color,
            animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.6s both',
            textShadow: `0 0 24px ${slide.color}33`,
          }}>
            {getRuleText('rules.lastSlideHint', lang, lang === 'de' ? '🎬 Los geht\'s!' : '🎬 Let\'s go!')}
          </div>
        )}
      </div>
    </div>
  );
}
