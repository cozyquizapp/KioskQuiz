/**
 * CozyQuizFinalRevealView — End-Phase Reveal nach Final-Betting.
 *
 * 3-Akt-Choreo:
 *  1. Title-Hold + Grid-Reveal
 *  2. Pro Team: Bet-Resolution Slide (Bonus oder 0-Group)
 *  3. Awards-Overview + 3 Award-Flip-Cards
 *  4. Race-Final: Avatare schweben durchs Sternenfeld → Podium
 *
 * Massiv-Bundle: alle Final-Helpers in einer Datei extrahiert (waren vorher
 * inline mit ~20 helper-functions). Inkl. FinalRoundRecapSlide (wird auch
 * von BeamerView genutzt — re-exportiert).
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-13 (Refactor Phase 6, Bug-Hot-Spot).
 * 3 externe Importer (QQBuiltinSlide + Test-Pages).
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate, QQTeam } from '../../../shared/quarterQuizTypes';
import { useLangFlip, COZY_CARD_BG } from '../cozyQuizShared';
import { ConfettiOverlay } from './CozyQuizConfettiOverlay';
import { QQTeamAvatar, CountryFlagOrEmoji } from './QQTeamAvatar';
import { GridDisplay } from './CozyQuizGridDisplay';
import { TeamNameLabel } from './TeamNameLabel';
import { QQEmojiIcon } from './QQIcon';
import { AnimatedCozyWolf } from '../pages/QQBeamerPage';
import {
  startFinaleLoop, stopLobbyLoop,
  playWoodKnock, playWinnerCardReveal, playFanfare, playClimaxFinish, playTick,
  playTeamReveal, playReveal,
  setMusicDucked,
  playRaceCountdown, startRaceLoop, stopRaceLoop, playRaceTeamFall,
  playRaceWinner, playRacePodium,
  playSpecialAwardReveal,
} from '../utils/sounds';

export function FinalRoundRecapSlide({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const de = lang === 'de';
  const wins = s.finalPhaseWins ?? {};
  const justWon = new Set(s.finalRecapJustWon ?? []);
  const totalPhases = s.totalPhases ?? 4;
  const phaseStart = (totalPhases - 1) * 5;
  // Wir sind im Recap NACH der Frage, vor der nächsten — questionIndex ist
  // noch der just-completed Index. Verbleibend = 5 - (inPhaseIdx + 1).
  const inPhaseIdx = Math.max(0, Math.min(4, s.questionIndex - phaseStart));
  const completed = inPhaseIdx + 1;
  const remaining = Math.max(0, 5 - completed);
  const isLastFinalQuestion = remaining === 0;

  // 2026-05-09 v2 (Wolf '/animations 0B 8-Team Score-Cascade + Position-Swap'):
  // Vorher Sort-im-JSX → Tabelle springt instant um. Jetzt: 2 Rankings (before/
  // after), jede Reihe absolute am before-Slot, Tickup +1 für just-Winner,
  // dann gestaffelter Position-Swap zur after-Rank-Position. Mitfieber-Moment
  // pro Team gleichzeitig.
  const N = s.teams.length;
  const currentWins: Record<string, number> = {};
  for (const t of s.teams) currentWins[t.id] = wins[t.id] ?? 0;
  const prevWins: Record<string, number> = {};
  for (const t of s.teams) prevWins[t.id] = currentWins[t.id] - (justWon.has(t.id) ? 1 : 0);
  const beforeOrder = [...s.teams].sort((a, b) => {
    const w = (prevWins[b.id] ?? 0) - (prevWins[a.id] ?? 0);
    return w !== 0 ? w : a.name.localeCompare(b.name);
  }).map(t => t.id);
  const afterOrder = [...s.teams].sort((a, b) => {
    const w = (currentWins[b.id] ?? 0) - (currentWins[a.id] ?? 0);
    return w !== 0 ? w : a.name.localeCompare(b.name);
  }).map(t => t.id);

  // Stagger: Tickup zuerst (gestaffelt von unten nach oben), dann Position-Swap
  const STAGGER_MS = 180;
  const TICKUP_MS = 600;
  const TICKUP_BASE_MS = 600;
  const SWAP_DELAY_MS = TICKUP_BASE_MS + N * STAGGER_MS + 250;
  const SWAP_MS = 800;
  const GLOW_DELAY_MS = SWAP_DELAY_MS + SWAP_MS - 100;

  // 2026-05-09 v3 (Wolf TODO 3 'text noch größer'): zweiter Bump nach v2.
  // 8 Teams 78→92, 5-6 Teams 92→108, 3-4 Teams 110→130.
  // Avatare proportional mit hochgezogen.
  const rowH = N >= 7 ? 92 : N >= 5 ? 108 : 130;
  const avatarSize = N >= 7 ? 64 : N >= 5 ? 76 : 92;
  const containerH = rowH * N;

  return (
    <div style={{
      // 2026-05-09 v2 (Wolf 'standings sollen eigenständige seite sein, nicht
      // im vordergrund'): kein absolute-overlay mehr, sondern reguläre full-
      // page View — flex 1, full size, padding gibt angenehmen Rand.
      flex: 1, width: '100%', height: '100%',
      // 2026-06-24 (Skin): aktiver Skin → flacher Skin-BG statt Lila-Dunkel.
      background: isThemed() ? 'var(--qq-bg)' : 'radial-gradient(ellipse at center, rgba(31,16,46,0.94) 0%, rgba(15,8,23,0.98) 70%, #0d0716 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(40px, 5cqh, 80px) clamp(48px, 6cqw, 120px)',
      animation: 'qqFinalRecapIn 0.5s cubic-bezier(0.2, 0.85, 0.3, 1) both',
      minHeight: 0,
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{`
        @keyframes qqFinalRecapIn {
          0%   { opacity: 0; backdrop-filter: blur(0px); }
          100% { opacity: 1; backdrop-filter: blur(14px) saturate(140%); }
        }
        @keyframes qqRecapTitleLetter {
          0%   { opacity: 0; transform: translateY(-30px) scale(0.6); filter: blur(8px); }
          70%  { opacity: 1; transform: translateY(4px) scale(1.06); filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes qqRecapSwap {
          0%   { transform: translateY(0); }
          100% { transform: translateY(var(--swapDiff)); }
        }
        @keyframes qqRecapWinnerGlow {
          0%   { box-shadow: 0 0 0 rgba(251,191,36,0); border-color: rgba(255,255,255,0.10); }
          100% { box-shadow: 0 0 36px rgba(251,191,36,0.55), 0 0 72px rgba(251,191,36,0.25); border-color: rgba(251,191,36,0.85); }
        }
      `}</style>

      {/* Title */}
      <div style={{
        fontSize: 'clamp(14px, 1.3cqw, 22px)', fontWeight: 900,
        color: QQ_COLORS.amber400, textTransform: 'uppercase', letterSpacing: '0.18em',
        opacity: 0.92, marginBottom: 10,
        animation: 'qqRecapTitleLetter 0.6s cubic-bezier(0.16, 1.2, 0.3, 1) 0.05s both',
      }}>
        🏆 {de ? 'Zwischenstand · Final-Phase' : 'Standings · Final phase'}
      </div>
      <div style={{
        fontSize: 'clamp(32px, 4.2cqw, 72px)', fontWeight: 900,
        color: 'var(--qq-card-text)', letterSpacing: '-0.025em', textAlign: 'center',
        marginBottom: 'clamp(20px, 2.5cqh, 40px)',
        textShadow: '0 0 36px rgba(var(--qq-accent-rgb),0.45)',
      }}>
        {(() => {
          const t = isLastFinalQuestion
            ? (de ? `Frage ${completed}/5 · gleich kommt das Wager-Reveal!` : `Question ${completed}/5 · wager reveal next!`)
            : (de
                ? `Frage ${completed}/5 · noch ${remaining} ${remaining === 1 ? 'Kategorie' : 'Kategorien'}`
                : `Question ${completed}/5 · ${remaining} ${remaining === 1 ? 'category' : 'categories'} left`);
          return Array.from(t).map((ch, i) => (
            <span key={i} style={{
              display: 'inline-block',
              animation: `qqRecapTitleLetter 0.65s cubic-bezier(0.16, 1.2, 0.3, 1) ${0.15 + i * 0.025}s both`,
              whiteSpace: 'pre',
            }}>{ch === ' ' ? ' ' : ch}</span>
          ));
        })()}
      </div>

      {/* Team-Reihen — absolute am before-Slot, Tickup + Position-Swap.
          2026-05-09 v2: maxWidth 920 → 1200 für mehr Tabellen-Breite. */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 1200, height: containerH,
      }}>
        {s.teams.map(t => {
          const beforeRank = beforeOrder.indexOf(t.id);
          const afterRank = afterOrder.indexOf(t.id);
          const isJust = justWon.has(t.id);
          const isTopAfter = afterRank === 0;
          const swapDiffPx = (afterRank - beforeRank) * rowH;
          const w = currentWins[t.id] ?? 0;
          const wPrev = prevWins[t.id] ?? 0;
          // Tickup-Delay gestaffelt von unten nach oben (lowest rank first)
          const tickupDelay = TICKUP_BASE_MS + (N - 1 - beforeRank) * STAGGER_MS;
          const swapAnim = beforeRank !== afterRank
            ? `qqRecapSwap ${SWAP_MS}ms cubic-bezier(0.34, 1.18, 0.64, 1) ${SWAP_DELAY_MS}ms both`
            : '';
          const glowAnim = isTopAfter && isJust
            ? `qqRecapWinnerGlow 0.8s ease-out ${GLOW_DELAY_MS}ms both`
            : '';
          const animation = [swapAnim, glowAnim].filter(Boolean).join(', ');
          return (
            <div key={t.id} style={{
              position: 'absolute', left: 0, right: 0,
              top: beforeRank * rowH, height: rowH - 6,
              ['--swapDiff' as any]: `${swapDiffPx}px`,
              animation: animation || undefined,
              // 2026-05-09 v3 (TODO 4 Performance): contain isoliert das Row-
              // Subtree für Layout/Paint/Style — Browser muss nicht den
              // ganzen Container neu layouten wenn ein Tickup-Wert ändert.
              willChange: 'transform',
              contain: 'layout paint style',
              display: 'grid',
              gridTemplateColumns: `${avatarSize + 8}px 1fr auto`,
              gap: 14, alignItems: 'center',
              padding: '0 18px', borderRadius: 14,
              background: isJust
                ? 'linear-gradient(90deg, rgba(251,191,36,0.18), rgba(245,158,11,0.10))'
                : 'rgba(255,255,255,0.04)',
              border: isJust
                ? '2px solid rgba(251,191,36,0.7)'
                : '1.5px solid var(--qq-hairline)',
              boxSizing: 'border-box',
            }}>
              <div style={{
                width: avatarSize, height: avatarSize, borderRadius: '50%',
                background: `${t.color}33`,
                border: `2px solid ${t.color}`,
                boxShadow: `0 0 14px ${t.color}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={avatarSize - 8} />
              </div>
              <div style={{
                fontSize: `clamp(20px, 2cqw, ${Math.round(rowH * 0.38)}px)`, fontWeight: 900,
                color: t.color,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{t.name}</div>
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 8, fontWeight: 900,
              }}>
                <RecapScoreTickup
                  from={wPrev} to={w}
                  delayMs={tickupDelay}
                  durationMs={TICKUP_MS}
                  rowH={rowH}
                />
                <span style={{
                  fontSize: `clamp(14px, 1.5cqw, ${Math.round(rowH * 0.32)}px)`,
                  color: 'var(--qq-text-muted)',
                }}>🏆</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2026-05-09 v2 (Wolf): Footer-Hint 'Space for next final question'
          entfernt — im Autoplay läuft's manuell, im Live-Mod weiß er selbst. */}
    </div>
  );
}

// 2026-05-09 v3 (Wolf TODO 4 'Standings laggt'): Tickup mit DIREKTER DOM-
// Manipulation statt setState. Vorher: pro Team eigener rAF-Loop +
// setState pro Frame → bei 8 Teams 8× Re-Render des Score-Spans pro
// Animation-Frame. Jetzt: rAF schreibt direkt textContent + style — KEIN
// React-State, KEIN Re-Render, GPU-only-Update. Spürbar performanter
// auf Beamer/TV (schwächere GPUs).
function RecapScoreTickup({ from, to, delayMs, durationMs, rowH }: {
  from: number; to: number; delayMs: number; durationMs: number; rowH: number;
}) {
  const valRef = useRef<HTMLSpanElement>(null);
  const deltaRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    let lastVal = from;
    // Initial-Setup: from-Wert sichtbar, Delta hidden.
    if (valRef.current) {
      valRef.current.textContent = String(from);
      valRef.current.style.color = from > 0 ? QQ_COLORS.amber400 : 'var(--qq-text-muted)';
      valRef.current.style.textShadow = from > 0 ? '0 0 18px rgba(251,191,36,0.5)' : 'none';
    }
    if (deltaRef.current) deltaRef.current.style.opacity = '0';

    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed < delayMs) { frame = requestAnimationFrame(tick); return; }
      const t = Math.min(1, (elapsed - delayMs) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(from + (to - from) * eased);
      if (val !== lastVal) {
        lastVal = val;
        if (valRef.current) {
          valRef.current.textContent = String(val);
          valRef.current.style.color = val > 0 ? QQ_COLORS.amber400 : 'var(--qq-text-muted)';
          valRef.current.style.textShadow = val > 0 ? '0 0 18px rgba(251,191,36,0.5)' : 'none';
        }
        if (deltaRef.current) {
          const showDelta = to > from && val > from && val < to;
          deltaRef.current.style.opacity = showDelta ? '1' : '0';
        }
      }
      if (t < 1) frame = requestAnimationFrame(tick);
      else if (deltaRef.current) deltaRef.current.style.opacity = '0';
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, delayMs, durationMs]);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
      <span ref={deltaRef} style={{
        fontSize: `clamp(11px, 1.1cqw, ${Math.round(rowH * 0.22)}px)`,
        color: QQ_COLORS.green500, fontWeight: 900,
        opacity: 0, transition: 'opacity 0.1s linear',
      }}>+{to - from}</span>
      <span ref={valRef} style={{
        fontSize: `clamp(34px, 4cqw, ${Math.round(rowH * 0.66)}px)`,
        color: from > 0 ? QQ_COLORS.amber400 : 'var(--qq-text-muted)',
        textShadow: from > 0 ? '0 0 18px rgba(251,191,36,0.5)' : 'none',
        fontVariantNumeric: 'tabular-nums',
      }}>{from}</span>
    </span>
  );
}

// 2026-05-09 (Legacy/Backup): permanenter Tracker. Aktuell deaktiviert
// zugunsten von FinalRoundRecapSlide. Bleibt im Code falls Wolf zurückwill.
// ⚠ TODO bei Re-Aktivierung: Strings i18n nachruesten ('🏆 Finale' /
// '{n} Kats übrig' aktuell hardcoded DE, brauchen lang === 'en'-Branch).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FinalWinsTracker({ state: s }: { state: QQStateUpdate }) {
  const wins = s.finalPhaseWins ?? {};
  // Berechne Frage-Index INNERHALB der Final-Phase (0..4)
  const totalPhases = s.totalPhases ?? 4;
  const phaseStart = (totalPhases - 1) * 5;          // questionIndex bei Phase-Start
  const inPhaseIdx = Math.max(0, Math.min(4, s.questionIndex - phaseStart));
  // verbleibende Kategorien — wenn wir gerade Frage N spielen, ist es noch N..4 (5-N total)
  // Bei PHASE_INTRO der ersten Final-Frage: 5 verbleibend.
  const remaining = Math.max(0, 5 - inPhaseIdx);

  return (
    <div style={{
      position: 'absolute',
      bottom: 'clamp(16px, 2.4cqh, 32px)',
      right: 'clamp(16px, 2cqw, 32px)',
      zIndex: 40,
      padding: 'clamp(10px, 1.4cqh, 16px) clamp(14px, 1.6cqw, 22px)',
      borderRadius: 18,
      background: 'linear-gradient(135deg, rgba(31,26,46,0.92), rgba(20,16,31,0.88))',
      border: '1.5px solid rgba(var(--qq-accent-rgb),0.55)',
      boxShadow: '0 12px 36px rgba(0,0,0,0.55), 0 0 32px rgba(var(--qq-accent-rgb),0.30)',
      backdropFilter: 'blur(12px) saturate(160%)',
      WebkitBackdropFilter: 'blur(12px) saturate(160%)',
      animation: 'qqFinalRowIn 0.6s cubic-bezier(0.34,1.4,0.5,1) both',
      pointerEvents: 'none',
      maxWidth: 'min(360px, 30cqw)',
    }}>
      <div style={{
        fontSize: 'clamp(10px, 0.9cqw, 13px)', fontWeight: 900,
        color: isThemed() ? 'var(--qq-accent)' : QQ_COLORS.brandPinkMid, textTransform: 'uppercase', letterSpacing: '0.14em',
        marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 14,
      }}>
        <span>🏆 Finale</span>
        <span style={{ color: 'var(--qq-text-muted)' }}>{remaining} Kats übrig</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {s.teams.map(t => {
          const w = wins[t.id] ?? 0;
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 'clamp(12px, 1cqw, 15px)',
            }}>
              <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={22} />
              <span style={{ flex: 1, color: t.color, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.name}
              </span>
              <span style={{
                fontSize: 'clamp(13px, 1.1cqw, 17px)', fontWeight: 900,
                color: w > 0 ? QQ_COLORS.amber400 : 'var(--qq-text-muted)',
                minWidth: 22, textAlign: 'right',
              }}>
                {w > 0 ? `${w}🏆` : '–'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINAL REVEAL — Multi-Step End-Flow
// ═══════════════════════════════════════════════════════════════════════════════
// Step-Mapping siehe shared/qqFinalReveal.ts (Single-Source-of-Truth).

// 2026-05-24 (Refactor #1 Drift-Killer): Step-Decode lebt jetzt in
// shared/qqFinalReveal.ts. Vorher war dieselbe Logik in 3 Stellen dupliziert
// (Backend qqRooms.ts + dieser File + QQFinalRevealTestPage.tsx).
import { qqDecodeFinalStep as decodeFinalStep } from '../../../shared/qqFinalReveal';
import { QQ_COLORS } from '../../../shared/qqColors';
import { isThemed } from '../qqTheme';

// RankingEntry aus Legacy-Block hochgezogen (2026-05-10 Audit-P2 Cleanup),
// wird von RaceFinalSlide + PodiumStepFinal genutzt.
// 2026-05-16 (Wolf Score-Modell-Klaerung): `score` = groesstes zusammenhaengendes
// Gebiet (largestConnected, inkl. stuck/stackBonus aus Backend), NICHT die
// Gesamt-Feld-Anzahl. Bet + Awards addieren sich auf den Score-Wert.
type RankingEntry = {
  team: QQTeam;
  score: number;   // = team.largestConnected (groesstes Cluster + stuck/stack-Bonus)
  bonus: number;
  awards: number;
  total: number;
};

// 2026-05-10 (Wolf 'BetReveal Variante D — Anti-Shaming'):
// betSlotsCount statt N. Teams mit 0-Bonus → 1 Group-Slide zuerst,
// danach einzelne Positiv-Teams aufsteigend. Teams ohne Bet komplett
// übersprungen. Backend qqFinalRevealMaxStep hat dieselbe Logik.
// decodeFinalStep ist jetzt in shared/qqFinalReveal.ts (Import oben).
// Vorher hier lokal dupliziert → Drift bei Race-Redesigns.

// 2026-05-12 (Slide-Boundary-System Regel #3): generischer Slot-Transition-
// Wrapper. Wenn `slotKey` wechselt, rendert er den vorherigen Slot kurz mit
// `exitAnimation` (position:absolute Overlay), wahrend der neue Slot mit
// seiner natuerlichen Mount-Animation reinkommt. Nach `exitMs` wird der
// vorherige unmounted. Verhindert harte Frame-Cuts zwischen Slots in Multi-
// Step-Choreos (Bet-Reveal, Awards-Reveal etc.).
//
// Usage:
//   <SlotTransition
//     slotKey={String(currentIndex)}
//     exitAnimation="qqFRSlamOutDown 0.55s cubic-bezier(0.55,0,0.7,0.4) both"
//     exitMs={550}
//   >
//     {currentContentJsx}
//   </SlotTransition>
// ════════════════════════════════════════════════════════════════════════════
// AutoFitContent — ENTFERNT 2026-05-12 (Audit-C)
// ════════════════════════════════════════════════════════════════════════════
// War eine fragile Zwischenloesung mit CSS zoom-Property + ResizeObserver.
// Probleme: scrollHeight returned zoom-skalierte Werte (zoom ist layout-
// affecting), Force-Reflow-Trick half nicht zuverlaessig, nested zoom+
// SlideStage transform produzierte Browser-Quirks. ResizeObserver-Re-
// Registrierungen verursachten Repaint-Cascades die Chip-Cascade-
// Animationen in Dauerschleife restarteten.
//
// Single-Source-of-Truth ist jetzt SlideStage (Option A Phase 1) — bei
// ?stage=1 wird der gesamte Slide-Content auf einem festen 1920x1080
// Canvas gerendert und proportional zur Viewport-Groesse skaliert.
// Standard-Layout (Stage AUS) nutzt Flex-Flow mit min-height:0 +
// overflow:hidden — saubere CSS-only Containment ohne JS-Measurement.

function SlotTransition({
  slotKey,
  exitAnimation,
  exitMs = 550,
  enterAnimation,
  containerStyle,
  children,
}: {
  /** Key that identifies the current slot. Change triggers the transition. */
  slotKey: string;
  /** CSS animation shorthand applied to the exiting slot wrapper. */
  exitAnimation: string;
  /** Duration the previous slot stays mounted (must match exitAnimation dur). */
  exitMs?: number;
  /** Optional CSS animation for the entering slot. Wenn gesetzt, ueberlagert
   *  diese den natuerlichen Mount damit der neue Slot klar als "Neue Card"
   *  hereinkommt waehrend der alte exitet. */
  enterAnimation?: string;
  /** Optional container style overrides. Default: flex:1 width:100% position:relative. */
  containerStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [exitingNode, setExitingNode] = useState<React.ReactNode | null>(null);
  const [enterTick, setEnterTick] = useState(0);
  const prevKeyRef = useRef(slotKey);
  const prevChildrenRef = useRef(children);
  useEffect(() => {
    if (slotKey !== prevKeyRef.current) {
      setExitingNode(prevChildrenRef.current);
      setEnterTick(t => t + 1);
      prevKeyRef.current = slotKey;
      prevChildrenRef.current = children;
      const t = window.setTimeout(() => setExitingNode(null), exitMs);
      return () => window.clearTimeout(t);
    }
    prevChildrenRef.current = children;
    return;
  }, [slotKey, children, exitMs]);

  return (
    <div style={{
      position: 'relative', flex: 1, width: '100%', display: 'flex',
      ...containerStyle,
    }}>
      {exitingNode && (
        <div style={{
          position: 'absolute', inset: 0,
          animation: exitAnimation,
          pointerEvents: 'none',
          willChange: 'transform, opacity',
          zIndex: 1,
        }}>
          {exitingNode}
        </div>
      )}
      <div key={enterTick} style={{
        position: 'relative', flex: 1,
        display: 'flex', flexDirection: 'column',
        willChange: 'transform, opacity',
        animation: enterAnimation,
        zIndex: 2,
      }}>
        {children}
      </div>
    </div>
  );
}

// 2026-05-12 (Wolf 'Bet-Reveal: ablöse-animation'): nutzt jetzt die generische
// SlotTransition-Komponente fuer den top-in/bottom-out-Wechsel zwischen
// aufeinanderfolgenden Bet-Slot-Slides.
type BetSlotType =
  | { kind: 'zero-group'; teams: QQTeam[] }
  | { kind: 'positive'; team: QQTeam; bonus: number }
  | undefined;
function BetSlotTransition({ slotIndex, slot, state: s, lang }: {
  slotIndex: number;
  slot: BetSlotType;
  state: QQStateUpdate;
  lang: 'de' | 'en';
}) {
  const renderSlot = (sl: BetSlotType) => {
    if (!sl) return null;
    if (sl.kind === 'zero-group') {
      return <BetZeroGroupSlide key="zero-group" teams={sl.teams} lang={lang} />;
    }
    // 2026-05-25 (Wolf-Bug 'cards flippen nicht im live'): key={team.id}
    // erzwingt frischen Mount pro Bet-Card. Ohne key reuste React die
    // Instance zwischen Slots — isFlipped blieb true vom letzten Run,
    // Drumroll-Flip lief nur fuer die 1. Card.
    return (
      <BetRevealSlide
        key={sl.team.id}
        team={sl.team}
        resolution={s.finalBetResolution?.[sl.team.id] ?? null}
        allTeams={s.teams}
        lang={lang}
        eurovisionMode={s.theme?.eurovisionMode}
      />
    );
  };
  return (
    <SlotTransition
      slotKey={String(slotIndex)}
      exitAnimation="qqFRSlamOutDown 0.22s cubic-bezier(0.4, 0, 0.7, 0.3) both"
      exitMs={220}
      enterAnimation="qqFRSlotEnter 0.35s cubic-bezier(0.34, 1.36, 0.64, 1) 0.10s both"
    >
      {renderSlot(slot)}
    </SlotTransition>
  );
}

// ─── FinalLeaderboard ───────────────────────────────────────────────────────
// 2026-05-24 (Wolf Race-Redesign Eurovision-Style): persistente Tabelle die
// waehrend der Bet-Phase unter der zentrierten Bet-Card mitlaeuft. Jede Zeile
// = ein Team mit current-total (Grid + Awards + bereits enthuellte Bet-Slots).
// Wenn ein neuer Bet-Slot enthuellt wird, animiert sich die betroffene Zeile
// in ihre neue Position (FLIP-style via CSS transition auf transform).
function FinalLeaderboard({
  teams, awardPoints, betSlots, revealedSlotIndex, revealedAwardCount = 3,
  awards, lang, stampsByTeam,
}: {
  teams: QQTeam[];
  awardPoints: Record<string, number>;
  betSlots: Array<
    | { kind: 'zero-group'; teams: QQTeam[] }
    | { kind: 'positive'; team: QQTeam; bonus: number }
  >;
  /** Slot-Index das gerade enthuellt wird. -1 = kein Bet-Slot aktiv (Awards-Phase). */
  revealedSlotIndex: number;
  /** Wie viele Awards bereits enthuellt sind (0..3). Default 3 = alle (Bet-Phase). */
  revealedAwardCount?: 0 | 1 | 2 | 3;
  /** s.endAwards — wird gebraucht um den Focus-Team-Highlight beim aktiven
   *  Award-Reveal zu setzen. */
  awards?: { underdog: string | null; meisterklauer: string | null; speedy: string | null };
  lang: 'de' | 'en';
  /** 2026-05-25 v4: gestempelte Story-Stamps pro Team aus dem Grid aggregiert.
   *  Erscheinen als kleine Emoji-Reihe ueber dem Team-Namen. */
  stampsByTeam?: Record<string, Array<'underdog' | 'speedy' | 'meisterklauer' | 'bet' | 'sympathy'>>;
}) {
  const de = lang === 'de';

  // Progressive Award-Points basierend auf revealedAwardCount.
  const progressiveAwardPoints: Record<string, number> = {};
  for (const t of teams) progressiveAwardPoints[t.id] = 0;
  if (awards) {
    // 2026-05-25 v4: Award-Reveal-Order Speedy(1) → Meisterklauer(2) → Underdog(3).
    // Underdog mit stackCount=2, andere 1 Stack — Underdog ist der dramatic climax.
    if (revealedAwardCount >= 1 && awards.speedy) progressiveAwardPoints[awards.speedy] = (progressiveAwardPoints[awards.speedy] ?? 0) + 1;
    if (revealedAwardCount >= 2 && awards.meisterklauer) progressiveAwardPoints[awards.meisterklauer] = (progressiveAwardPoints[awards.meisterklauer] ?? 0) + 1;
    if (revealedAwardCount >= 3 && awards.underdog) progressiveAwardPoints[awards.underdog] = (progressiveAwardPoints[awards.underdog] ?? 0) + 2;
  } else {
    // Backwards-compat: wenn awards-prop nicht gesetzt, voll-revealed gemäß awardPoints.
    for (const t of teams) progressiveAwardPoints[t.id] = awardPoints[t.id] ?? 0;
  }

  // Per-Team kumulative Bet-Bonus aus Slots [0..revealedSlotIndex].
  const revealedBetBonus: Record<string, number> = {};
  for (const t of teams) revealedBetBonus[t.id] = 0;
  for (let i = 0; i <= revealedSlotIndex; i++) {
    const slot = betSlots[i];
    if (!slot) continue;
    if (slot.kind === 'positive') {
      revealedBetBonus[slot.team.id] = (revealedBetBonus[slot.team.id] ?? 0) + slot.bonus;
    }
    // zero-group veraendert keine Punkte.
  }

  // Welches Team wird in *diesem* Slot/Award enthuellt? Highlight + Glow.
  let focusTeamId: string | null = null;
  const focusSlot = betSlots[revealedSlotIndex];
  if (focusSlot?.kind === 'positive') {
    focusTeamId = focusSlot.team.id;
  } else if (awards && revealedAwardCount > 0 && revealedAwardCount <= 3) {
    // Award-Phase: focus auf gerade enthuelltes Award-Team.
    // v4: Order Speedy → Meisterklauer → Underdog
    focusTeamId = revealedAwardCount === 1 ? awards.speedy
                : revealedAwardCount === 2 ? awards.meisterklauer
                : awards.underdog;
  }

  // Sortierte Reihenfolge (current standings).
  const rows = teams
    .map(t => ({
      team: t,
      base: t.largestConnected ?? 0,
      awards: progressiveAwardPoints[t.id] ?? 0,
      bet: revealedBetBonus[t.id] ?? 0,
      total: (t.largestConnected ?? 0) + (progressiveAwardPoints[t.id] ?? 0) + (revealedBetBonus[t.id] ?? 0),
    }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.team.name.localeCompare(b.team.name);
    });

  // 2026-05-25 (Wolf 'tabelle sieht nicht aus wie main game neben grid'):
  // Sizes 1:1 von CozyQuizScoreBar uebernommen (avatar 64/78, name 34/42,
  // value 42/54, unit 18/22). Breakdown-Subtitle entfernt — die ScoreBar
  // zeigt auch keine, und die Zahl-Aenderung + FLIP-Climbing kommunizieren
  // den Reveal-Effekt schon stark genug. '='-Tie-Badge raus.
  const dense = rows.length >= 6;
  const avatarSize = dense ? 64 : 78;
  const avatarBox = dense ? 76 : 92;
  const nameFs = dense ? 34 : 42;
  const valFs = dense ? 42 : 54;
  const unitFs = dense ? 18 : 22;
  const ROW_H = dense ? 92 : 110;
  const topTotal = rows.length > 0 ? rows[0].total : 0;
  const isTieAtTop = rows.length > 1 && topTotal > 0 && rows[1].total === topTotal;
  const tiedWithOther = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < rows.length; j++) {
      if (i !== j && rows[i].total === rows[j].total) tiedWithOther.add(rows[i].team.id);
    }
  }
  const medalFor = (i: number, total: number, teamId: string): string | null => {
    if (total === 0) return null;
    if (isTieAtTop && total === topTotal) return '👑';
    if (i === 0) return '🥇';
    if (i === 1 && rows[1].total < rows[0].total) return '🥈';
    if (i === 2 && rows[2] && rows[2].total < (rows[1]?.total ?? 0)) return '🥉';
    if (tiedWithOther.has(teamId)) {
      if (total === rows[1]?.total) return '🥈';
      if (total === rows[2]?.total) return '🥉';
    }
    return null;
  };
  return (
    <div style={{
      width: '100%', height: '100%',
      padding: 'clamp(14px, 1.8cqh, 22px) clamp(18px, 2cqw, 28px)',
      display: 'flex', flexDirection: 'column', gap: 8,
      // 2026-06-24 (Skin P1): Standings-Board traegt bei Skin die Card-Behandlung.
      borderRadius: isThemed() ? 'var(--qq-card-radius)' : 18,
      background: isThemed() ? 'var(--qq-card-bg)' : 'var(--qq-surface)',
      border: isThemed() ? 'var(--qq-card-border)' : '1.5px solid var(--qq-hairline)',
      boxShadow: isThemed() ? 'var(--qq-card-shadow)' : '0 12px 32px rgba(0,0,0,0.35)',
      minHeight: 0,
    }}>
      <div style={{
        fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 800,
        color: 'var(--qq-text-muted)', textTransform: 'uppercase', letterSpacing: '0.16em',
        marginBottom: 4,
      }}>{de ? 'Aktueller Stand' : 'Current standings'}</div>
      <div style={{ position: 'relative', height: rows.length * ROW_H, flex: 1 }}>
        {rows.map((r, idx) => {
          const isFocus = r.team.id === focusTeamId;
          // 2026-05-25 (Wolf 'krone konsistent auch fuer tied-top'): analog
          // ScoreBar — alle Top-Tied bekommen Crown-Overlay.
          const isTopTie = isTieAtTop && r.total === topTotal;
          const isLeader = (idx === 0 && r.total > 0) || isTopTie;
          const medal = medalFor(idx, r.total, r.team.id);
          const tColor = r.team.color;
          return (
            <div
              key={r.team.id}
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: ROW_H,
                transform: `translateY(${idx * ROW_H}px)`,
                transition: 'transform 0.7s cubic-bezier(0.34, 1.36, 0.64, 1)',
                display: 'flex', alignItems: 'center', gap: dense ? 12 : 16,
                padding: dense ? '6px 12px' : '8px 14px',
                borderRadius: 16,
                background: isFocus
                  ? `linear-gradient(135deg, ${tColor}22, ${tColor}08)`
                  : 'transparent',
                border: isFocus ? `2px solid ${tColor}` : '2px solid transparent',
                boxShadow: isFocus
                  ? `0 0 28px ${tColor}55, 0 0 60px ${tColor}22, inset 0 0 12px ${tColor}18`
                  : 'none',
              }}
            >
              {/* Avatar-Slot mit Crown-Overlay fuer Leader (analog ScoreBar). */}
              <div style={{ width: avatarBox, textAlign: 'center', flexShrink: 0, position: 'relative' }}>
                <span style={{ position: 'relative', display: 'inline-block', borderRadius: '50%' }}>
                  <QQTeamAvatar avatarId={r.team.avatarId} teamEmoji={r.team.emoji} size={avatarSize} />
                  {isLeader && (
                    <span style={{
                      position: 'absolute',
                      top: dense ? -10 : -14,
                      left: '50%',
                      transform: 'translateX(-50%) rotate(-14deg)',
                      fontSize: dense ? 22 : 28,
                      pointerEvents: 'none',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                    }}>👑</span>
                  )}
                </span>
              </div>
              {/* Name + Story-Stamps. Stamps stapeln sich live waehrend Bet/
                  Award-Reveals — jedes Team picked die Stamps via /team-Phone. */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <TeamNameLabel
                  name={r.team.name}
                  maxLines={2}
                  shrinkAfter={14}
                  fontSize={nameFs}
                  color={tColor}
                  fontWeight={900}
                  style={{ textShadow: isFocus ? `0 0 16px ${tColor}55` : 'none' }}
                />
                {stampsByTeam?.[r.team.id]?.length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: dense ? 16 : 20, lineHeight: 1 }}>
                    {stampsByTeam[r.team.id].map((k, i) => (
                      <span key={i} style={{
                        animation: 'qqFRTitleIn 0.4s ease both',
                        animationDelay: `${i * 0.05}s`,
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
                      }}>
                        {(k === 'underdog' || k === 'speedy' || k === 'meisterklauer')
                          ? <AwardStamp kind={k} fallback={k === 'underdog' ? '🐢' : k === 'speedy' ? '⚡' : '🦝'} sizeCss={dense ? '20px' : '26px'} />
                          : k === 'sympathy' ? '💞'
                          : '🪙'}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              {/* Medal-Slot + grosse TOTAL-Zahl + 'Punkte'-Unit (1:1 ScoreBar). */}
              <div style={{
                position: 'relative', display: 'flex', alignItems: 'baseline',
                gap: 10, flexShrink: 0,
              }}>
                <span style={{
                  width: dense ? 32 : 38,
                  flexShrink: 0,
                  textAlign: 'center',
                  fontSize: dense ? 22 : 28, lineHeight: 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {medal ? <QQEmojiIcon emoji={medal}/> : null}
                </span>
                <span style={{
                  fontSize: valFs,
                  color: isLeader ? 'var(--qq-accent)' : 'var(--qq-card-text)',
                  fontWeight: 900,
                  textShadow: isLeader ? '0 0 18px rgba(var(--qq-accent-rgb),0.55)' : 'none',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                  width: dense ? 56 : 72,
                  textAlign: 'right',
                  flexShrink: 0,
                  transition: 'color 0.3s ease',
                }}>{r.total}</span>
                <span style={{
                  opacity: 0.5, fontSize: unitFs, fontWeight: 700,
                  color: 'var(--qq-text-muted)',
                  flexShrink: 0,
                  minWidth: dense ? 62 : 78,
                  textAlign: 'left',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {de
                    ? (r.total === 1 ? 'Punkt' : 'Punkte')
                    : (r.total === 1 ? 'pt' : 'pts')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FinalRevealGridSlot ────────────────────────────────────────────────────
// 2026-05-25 (Wolf 'das ist nicht das normale grid aus der app'): wir nutzen
// jetzt das echte App-GridDisplay (mit Team-Avataren, Territorium-Fusion,
// Stack-Avataren). Stamps wurden direkt in GridDisplay integriert (slots ab
// baseCopies rendern Stamp-Emoji statt Team-Avatar).
function FinalRevealGridSlot({ state: s, focusTeamId }: {
  state: QQStateUpdate;
  focusTeamId: string | null;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<number>(640);
  useEffect(() => {
    const update = () => {
      if (!wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      const side = Math.max(160, Math.floor(Math.min(r.width, r.height) - 16));
      setBox(side);
    };
    update();
    const ro = new ResizeObserver(update);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);
  return (
    <div ref={wrapRef} style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', minHeight: 0,
    }}>
      {/* 2026-05-25 (Wolf 'teamname unter grid kann weg'): Focus-Name-Pille
          entfernt — die Card rechts zeigt den Team-Namen schon prominent. */}
      <GridDisplay state={s} maxSize={box} highlightTeam={focusTeamId} showJoker={false} />
    </div>
  );
}

export function FinalRevealView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const step = s.finalRevealStep ?? 0;

  // 2026-05-10 (Audit-P0 Bugfix): finalRanking + Helper-Maps via useMemo
  // stabilisieren. Vorher wurden bei JEDEM Parent-Render neue Arrays/Objects
  // erzeugt — Folge: RaceFinalSlide useEffect [N, finalRanking, p1] feuerte
  // bei jedem Socket-State-Update mid-Choreo neu, ALLE setTimeouts wurden
  // re-scheduled, Phasen-Cursor sprang zurück, Sounds doppelt.
  // 2026-05-10 (Wolf 'BetReveal Variante D'): betSlots ersetzt betSorted —
  // 0-Bonus-Teams als 1 Group-Slide, Positiv-Teams einzeln aufsteigend,
  // No-Bet-Teams komplett übersprungen.
  const { betSlots, cellsByTeam, awardPoints, finalRanking, stampsByTeam } = useMemo(() => {
    type BetSlot =
      | { kind: 'zero-group'; teams: QQTeam[] }
      | { kind: 'positive'; team: QQTeam; bonus: number };
    const betSlots: BetSlot[] = [];
    const betted = s.teams.filter(t => s.finalBetResolution?.[t.id]?.targetTeamId);
    const zeroTeams = betted.filter(t => (s.finalBetResolution?.[t.id]?.totalBonus ?? 0) === 0);
    const positiveTeams = betted
      .filter(t => (s.finalBetResolution?.[t.id]?.totalBonus ?? 0) > 0)
      .sort((a, b) => {
        const ba = s.finalBetResolution![a.id].totalBonus;
        const bb = s.finalBetResolution![b.id].totalBonus;
        if (ba !== bb) return ba - bb; // aufsteigend
        return a.name.localeCompare(b.name);
      });
    if (zeroTeams.length > 0) betSlots.push({ kind: 'zero-group', teams: zeroTeams });
    for (const t of positiveTeams) {
      betSlots.push({ kind: 'positive', team: t, bonus: s.finalBetResolution![t.id].totalBonus });
    }

    const cellsByTeam: Record<string, number> = {};
    for (const t of s.teams) cellsByTeam[t.id] = 0;
    for (const row of s.grid) for (const cell of row) {
      if (cell.ownerId) cellsByTeam[cell.ownerId] = (cellsByTeam[cell.ownerId] ?? 0) + 1;
    }
    const awards = s.endAwards;
    const awardPoints: Record<string, number> = {};
    for (const t of s.teams) awardPoints[t.id] = 0;
    // 2026-05-25 v4: Underdog = +2 Stacks, Speedy/Meisterklauer = +1
    if (awards?.underdog) awardPoints[awards.underdog] = (awardPoints[awards.underdog] ?? 0) + 2;
    if (awards?.meisterklauer) awardPoints[awards.meisterklauer] = (awardPoints[awards.meisterklauer] ?? 0) + 1;
    if (awards?.speedy) awardPoints[awards.speedy] = (awardPoints[awards.speedy] ?? 0) + 1;

    // 2026-05-16 (Wolf Score-Modell-Fix): Final-Total basiert auf
    // largestConnected (= groesstes zusammenhaengendes Gebiet + stuck/stack-
    // Bonus, vom Backend berechnet), NICHT auf cellsByTeam (= Gesamt-Anzahl
    // aller Felder verstreut+verbunden). Vorher waren verstreute Felder
    // genauso wertvoll wie verbundene → Cluster-Strategie wurde am Ende
    // ignoriert, widersprach Wolfs Mental-Model "groesstes Gebiet gewinnt".
    // cellsByTeam bleibt fuer GridRevealSlide-Display (Visual-Info "X Felder
    // gesetzt"), wird aber nicht mehr fuer Score-Sortierung benutzt.
    const finalRanking = [...s.teams]
      .map(t => ({
        team: t,
        score: t.largestConnected ?? 0,
        bonus: s.finalBetResolution?.[t.id]?.totalBonus ?? 0,
        awards: awardPoints[t.id] ?? 0,
        total: (t.largestConnected ?? 0)
          + (s.finalBetResolution?.[t.id]?.totalBonus ?? 0)
          + (awardPoints[t.id] ?? 0),
      }))
      .sort((a, b) => b.total - a.total);

    // 2026-05-25 v4: Story-Stamps pro Team aus Grid aggregieren (live Update
    // waehrend Teams ihre Stacks setzen).
    const stampsByTeam: Record<string, Array<'underdog' | 'speedy' | 'meisterklauer' | 'bet' | 'sympathy'>> = {};
    for (const t of s.teams) stampsByTeam[t.id] = [];
    for (const row of s.grid) for (const cell of row) {
      if (!cell.revealStamps) continue;
      for (const st of cell.revealStamps) {
        if (stampsByTeam[st.teamId]) stampsByTeam[st.teamId].push(st.kind);
      }
    }

    return { betSlots, cellsByTeam, awardPoints, finalRanking, stampsByTeam };
  }, [s.teams, s.grid, s.finalBetResolution, s.endAwards]);
  // cellsByTeam war fuer GridRevealSlide, das nach Race-Redesign 2026-05-24
  // raus ist. awardPoints jetzt fuer FinalLeaderboard waehrend Bet-Phase.
  void cellsByTeam;

  const phase = decodeFinalStep(step, betSlots.length);

  // 2026-05-24 (Wolf 'Tabelle spoilert vor dem Reveal'): die FLIP-Tabelle
  // rechts darf erst die +Punkte zeigen NACHDEM die Card links geflippt ist.
  // Vorher bekam sie sofort beim Step-Wechsel das neue revealedSlotIdx/
  // revealedAwardCount und re-sortierte → Audience sah den Sieger noch
  // bevor die Drumroll-BG umgedreht war. Delay = Card-Drumroll-Dauer (900ms)
  // — exakt der Moment in dem der CSS-Flip startet, FLIP-Climbing läuft
  // dann synchron zur Card-Drehung.
  const [effRevealedSlotIdx, setEffRevealedSlotIdx] = useState(-1);
  const [effRevealedAwardCount, setEffRevealedAwardCount] = useState<0 | 1 | 2 | 3>(0);
  useEffect(() => {
    const REVEAL_DELAY = 900;
    if (phase.kind === 'bet') {
      // Vor Reveal: nur vorherige Slots zählen, current noch nicht.
      setEffRevealedSlotIdx(phase.slotIndex - 1);
      setEffRevealedAwardCount(3);
      const t = window.setTimeout(() => setEffRevealedSlotIdx(phase.slotIndex), REVEAL_DELAY);
      return () => window.clearTimeout(t);
    }
    if (phase.kind === 'award') {
      // Vor Reveal: nur vorherige Awards zählen, current noch nicht.
      setEffRevealedSlotIdx(-1);
      setEffRevealedAwardCount(phase.awardIndex as 0 | 1 | 2);
      const t = window.setTimeout(
        () => setEffRevealedAwardCount((phase.awardIndex + 1) as 1 | 2 | 3),
        REVEAL_DELAY,
      );
      return () => window.clearTimeout(t);
    }
    if (phase.kind === 'race-final') {
      // Race-final: alles längst revealed.
      setEffRevealedSlotIdx(betSlots.length - 1);
      setEffRevealedAwardCount(3);
      return;
    }
    // title: nichts revealed
    setEffRevealedSlotIdx(-1);
    setEffRevealedAwardCount(0);
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, phase.kind, betSlots.length]);

  // 2026-05-13 (Wolf '7. Rahmen-Fix + End-Page-Cutoff'): Outer-padding +
  // COZY_CARD_BG-Gradient erzeugten einen sichtbaren lila „Rahmen" um Race-
  // Slide und schnitten gleichzeitig das Sieger-Treppchen seitlich ab.
  // Phasen die die volle Stage brauchen (race-final) bekommen padding:0 +
  // transparente BG (Inner-Slide rendert eigene BG). Phasen mit Card-Layouts
  // (title, award, bet) behalten die safe-margin.
  const fullBleed = phase.kind === 'race-final';

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: fullBleed ? 0 : 'max(var(--qq-safe-margin), 4cqh) max(var(--qq-safe-margin), 4cqw)',
      // 2026-06-24 (Skin): Seiten-BG = Skin-BG (nicht card-bg, sonst Karte-auf-
      // Karte ohne Kontrast). Cozy behält den COZY_CARD_BG-Backdrop.
      background: fullBleed ? 'transparent' : (isThemed() ? 'var(--qq-bg)' : COZY_CARD_BG),
      position: 'relative', overflow: 'hidden',
      minHeight: 0,
    }}>
      <FinalRevealSharedKeyframes />
      {phase.kind === 'title' && <TitleHoldSlide lang={lang} />}
      {phase.kind === 'bet' && (
        // 2026-05-25 (Wolf 'links grid, rechts cards, tabelle erst am ende'):
        // GridSnapshot LINKS (Story-Stamps landen darauf live), Bet-Card RECHTS.
        // Tabelle ist komplett aus — kommt erst beim Eurovision-Endstand zurueck.
        <div style={{
          flex: 1, width: '100%', minHeight: 0,
          padding: 'clamp(16px, 2cqh, 28px) clamp(20px, 2.5cqw, 40px)',
          display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
          gap: 'clamp(20px, 2.5cqw, 40px)',
          position: 'relative',
        }}>
          <FinalRevealGridSlot
            state={s}
            focusTeamId={(() => {
              const fs = betSlots[phase.slotIndex];
              return fs?.kind === 'positive' ? fs.team.id : null;
            })()}
          />
          <div style={{ display: 'flex', minHeight: 0 }}>
            <BetSlotTransition
              slotIndex={phase.slotIndex}
              slot={betSlots[phase.slotIndex]}
              state={s}
              lang={lang}
            />
          </div>
        </div>
      )}
      {/* 2026-05-24 v3 (Wolf 'diesen zwischenschritt braucht es nicht mehr'):
          Awards-Overview-Slide entfernt. Title geht direkt zu Award-Slot 0. */}
      {/* 2026-05-24 (Wolf-Wunsch 'awards einzeln nacheinander, gleiches Format
          wie bet cards'): Award-Slot-Rendering analog BetSlotTransition. Links
          Card mit drumroll + Reveal, rechts Live-Tabelle die progressive Awards
          bekommt + climbing-animiert. */}
      {phase.kind === 'award' && (
        <div style={{
          flex: 1, width: '100%', minHeight: 0,
          padding: 'clamp(16px, 2cqh, 28px) clamp(20px, 2.5cqw, 40px)',
          display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
          gap: 'clamp(20px, 2.5cqw, 40px)',
          position: 'relative',
        }}>
          <FinalRevealGridSlot
            state={s}
            focusTeamId={(() => {
              const a = s.endAwards;
              if (!a) return null;
              return phase.awardIndex === 0 ? a.speedy
                : phase.awardIndex === 1 ? a.meisterklauer
                : a.underdog;
            })()}
          />
          <div style={{ display: 'flex', minHeight: 0 }}>
            <AwardSlotTransition
              awardIndex={phase.awardIndex}
              state={s}
              lang={lang}
            />
          </div>
        </div>
      )}
      {/* 2026-05-24 (Wolf-Entscheidung): Race-Final ist deaktiviert, ersetzt
          durch FinalEurovisionFinale (Hero-Standings + Konfetti). RaceFinalSlide
          bleibt als Dead-Code im File darunter — Verweis für spätere KIs falls
          die Race-Choreo wieder aktiviert werden soll. */}
      {phase.kind === 'race-final' && <FinalEurovisionFinale finalRanking={finalRanking} lang={lang} />}
    </div>
  );
}

function FinalRevealSharedKeyframes() {
  return (
    <style>{`
      @keyframes qqFRTitleIn {
        0%   { opacity: 0; transform: translateY(20px) scale(0.94); filter: blur(8px); }
        100% { opacity: 1; transform: translateY(0)    scale(1);    filter: blur(0); }
      }
      /* 2026-05-25 (Wolf Welle 2): Stamp landet von oben auf der Cell — bounce-Drop. */
      @keyframes qqFRStampDrop {
        0%   { opacity: 0; transform: translateY(-40px) scale(1.6); filter: blur(4px); }
        60%  { opacity: 1; transform: translateY(2px)   scale(1.15); filter: blur(0); }
        100% { opacity: 1; transform: translateY(0)     scale(1);   }
      }
      /* 2026-05-17 P11 (Wolf 'animation von tip reveal cards gefällt mir
         nicht — clean fade-up'): subtile fade + translateY für Bet-Reveal-
         Cards. Kein Scale, kein Blur, kein Bounce — ruhig+lesbar. */
      @keyframes qqBetCardFadeUp {
        0%   { opacity: 0; transform: translateY(16px); }
        100% { opacity: 1; transform: translateY(0);    }
      }
      @keyframes qqFRSlamDown {
        0%   { opacity: 0; transform: translateY(-90cqh) scale(0.6) rotate(-3deg); filter: blur(8px); }
        55%  { opacity: 1; transform: translateY(8%)    scale(1.06) rotate(1deg);  filter: blur(0); }
        75%  { transform: translateY(-2%) scale(0.98) rotate(0deg); }
        100% { transform: translateY(0)    scale(1)    rotate(0deg); }
      }
      /* 2026-05-25 v2 (Wolf 'alte card noch sichtbar wenn neue reinkommt'):
         Exit-Anim deutlich schneller (0.35→0.20s) + dramatic scale-down
         + blur, damit die alte Card schnell unsichtbar wird bevor die neue
         ihre Drumroll startet. */
      @keyframes qqFRSlamOutDown {
        0%   { opacity: 1; transform: scale(1)    translateY(0);   filter: blur(0); }
        100% { opacity: 0; transform: scale(0.82) translateY(-8%); filter: blur(4px); }
      }
      /* 2026-05-25: Crossfade-Entry fuer die neue Card waehrend die alte
         exitet. Subtile Pop-In animation ueberlagert die noch nicht ganz
         verschwundene Alte mit klarer „Neue Card kommt"-Geste. */
      @keyframes qqFRSlotEnter {
        0%   { opacity: 0; transform: scale(0.94) translateY(6%); }
        100% { opacity: 1; transform: scale(1)    translateY(0); }
      }
      @keyframes qqFRSlamFromTop {
        0%   { opacity: 0; transform: translateY(-90cqh) scale(0.7); filter: blur(7px); }
        55%  { opacity: 1; transform: translateY(8%)    scale(1.04); filter: blur(0); }
        75%  { opacity: 1; transform: translateY(-2%) scale(0.98); }
        /* 2026-05-10 (Wolf 'Group-Slide zeigt keine Avatare'): opacity bei
           100% explicit setzen — sonst fiel mit fill-mode:both auf inline
           opacity:0 zurück und Avatare blieben unsichtbar. */
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      /* 2026-05-24 (Wolf Award-Reveal-Choreo): kurzer Pulse-Flash fuer die
         Standings-Row sobald das Team einen Award bekommt. */
      @keyframes qqAwardRowFlash {
        0%   { box-shadow: 0 0 12px var(--qqFlashColor, rgba(255,255,255,0.2)); }
        40%  { box-shadow: 0 0 64px rgba(251,191,36,0.6), 0 0 24px rgba(251,191,36,0.5); }
        100% { box-shadow: 0 0 36px var(--qqFlashColor, rgba(255,255,255,0.3)); }
      }
      @keyframes qqFRDrumroll {
        0%, 100% { transform: rotate(-2deg); }
        50%      { transform: rotate(2deg); }
      }
      @keyframes qqFRPlusOne {
        0%   { opacity: 0; transform: translate(-50%, -10px) scale(0.5); }
        50%  { opacity: 1; transform: translate(-50%, -40px) scale(1.4); }
        100% { opacity: 0; transform: translate(-50%, -80px) scale(1); }
      }
      @keyframes qqFRClusterPulse {
        0%, 100% { box-shadow: 0 0 16px var(--c-color); transform: scale(1); }
        50%      { box-shadow: 0 0 32px var(--c-color); transform: scale(1.04); }
      }
      /* 2026-05-11 Top-3-Pack — RaceFinishHero */
      @keyframes qqFRBannerDrop {
        0%   { opacity: 0; transform: translate(-50%, -120%) scale(0.85); filter: blur(8px); }
        70%  { opacity: 1; transform: translate(-50%, 8%) scale(1.04); filter: blur(0); }
        100% { opacity: 1; transform: translate(-50%, 0)   scale(1);    filter: blur(0); }
      }
      @keyframes qqFRSpotlight {
        0%, 100% { opacity: 0.7; }
        50%      { opacity: 1;   }
      }
      @keyframes qqFRPennantWave {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-4px); }
      }
      @keyframes qqFRPennantFlap {
        0%, 100% { transform: rotate(-3deg); }
        50%      { transform: rotate(3deg); }
      }
      @keyframes qqFRBoundingSparkle {
        0%   { offset-distance: 0%; }
        100% { offset-distance: 100%; }
      }
      @keyframes qqFROohBob {
        0%, 100% { transform: translateY(0) rotate(-2deg); }
        50%      { transform: translateY(-6px) rotate(2deg); }
      }
      /* 2026-05-09 v4 Crescendo-Keyframes */
      @keyframes qqFRWinnerSlotPulse {
        0%, 100% { box-shadow: 0 0 40px rgba(251,191,36,0.45), inset 0 0 32px rgba(251,191,36,0.18); transform: scale(1); }
        50%      { box-shadow: 0 0 72px rgba(251,191,36,0.75), inset 0 0 48px rgba(251,191,36,0.32); transform: scale(1.04); }
      }
      @keyframes qqFRWinnerDrop {
        0%   { opacity: 0; transform: translateY(-110cqh) scale(2.5) rotate(-8deg); filter: blur(8px); }
        55%  { opacity: 1; transform: translateY(8%)     scale(1.18) rotate(2deg); filter: blur(0); }
        75%  {            transform: translateY(-2%)    scale(0.96) rotate(-1deg); }
        100% { opacity: 1; transform: translateY(0)     scale(1)    rotate(0); filter: blur(0); }
      }
      @keyframes qqFRCrownDrop {
        0%   { opacity: 0; transform: translateX(-50%) translateY(-180%) scale(1.6) rotate(-15deg); }
        60%  { opacity: 1; transform: translateX(-50%) translateY(-8%)   scale(1.1) rotate(8deg); }
        100% { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1)   rotate(0); }
      }
      @keyframes qqFRCrownWobble {
        0%, 100% { transform: translateX(-50%) rotate(-4deg); }
        50%      { transform: translateX(-50%) translateY(-3px) rotate(4deg); }
      }
      @keyframes qqFRPodiumLoserFade {
        0%   { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(60px); }
      }
      @keyframes qqFRPodiumStepIn {
        0%   { opacity: 0; transform: translateY(80px) scale(0.9); }
        100% { opacity: 1; transform: translateY(0)    scale(1); }
      }
      /* 2026-05-09 v7.3 Race-Keyframes — Wolf 'manchmal synchron':
         4 verschiedene Patterns (A, B, C, D) mit unterschiedlichen Peak-Zeiten
         + Y-Amplituden + Asymmetrien → bei N=8 keine zwei Avatare wackeln gleich.
         Y ±90-115px, X minimal (±8-12px), Cycle 4-7s. */
      @keyframes qqRaceRocketA {
        /* Symmetrisch, Y-Peaks bei 30% und 80% */
        0%   { transform: translate(0,    0)     rotate(-1deg) scale(1); }
        30%  { transform: translate(8px,  -95px) rotate(1.5deg) scale(1.025); }
        55%  { transform: translate(-6px, -35px) rotate(-1deg) scale(1); }
        80%  { transform: translate(10px, -110px) rotate(2deg) scale(1.02); }
        100% { transform: translate(0,    0)     rotate(-1deg) scale(1); }
      }
      @keyframes qqRaceRocketB {
        /* Versetzt, Y-Peak bei 55% (Mitte), kleinere zweite Welle */
        0%   { transform: translate(0,    0)     rotate(0deg)  scale(1); }
        25%  { transform: translate(-10px, -40px) rotate(-1.5deg) scale(1.02); }
        55%  { transform: translate(8px,  -100px) rotate(1.5deg) scale(1); }
        80%  { transform: translate(-7px, -25px) rotate(-1.5deg) scale(1.025); }
        100% { transform: translate(0,    0)     rotate(0deg)  scale(1); }
      }
      @keyframes qqRaceRocketC {
        /* Single big swing — ein langer Hoch-Halt-Tief Zyklus */
        0%   { transform: translate(0,    0)     rotate(0.5deg) scale(1); }
        18%  { transform: translate(6px,  -55px) rotate(1deg) scale(1.015); }
        45%  { transform: translate(-8px, -115px) rotate(-1.5deg) scale(1.03); }
        72%  { transform: translate(5px,  -45px) rotate(1deg) scale(1.01); }
        100% { transform: translate(0,    0)     rotate(0.5deg) scale(1); }
      }
      @keyframes qqRaceRocketD {
        /* Asymmetrisch — schneller Aufstieg, langsamer Fall */
        0%   { transform: translate(0,    0)     rotate(-0.5deg) scale(1); }
        15%  { transform: translate(-9px, -80px) rotate(-2deg) scale(1.02); }
        40%  { transform: translate(7px,  -105px) rotate(1.5deg) scale(1.025); }
        70%  { transform: translate(-5px, -60px) rotate(-1deg) scale(1.01); }
        100% { transform: translate(0,    0)     rotate(-0.5deg) scale(1); }
      }
      @keyframes qqRaceTrail {
        0%   { opacity: 0.4; transform: translateY(-12px) scaleY(0.7); }
        50%  { opacity: 1;   transform: translateY(8px)   scaleY(1.25); }
        100% { opacity: 0.4; transform: translateY(-12px) scaleY(0.7); }
      }
      /* 2026-05-09 v7.3 (Wolf 'gerade runter fallen, keine opacity-Änderung,
         sieht eher wie Rennen aus'): Reine vertikale Bewegung ohne X-Drift,
         opacity bleibt 1 (Avatar fällt einfach aus dem Bild raus), kein blur,
         kein scale-collapse. */
      @keyframes qqRaceRocketFall {
        0%   { transform: translate(0, 0)     scale(1)    rotate(0); opacity: 1; }
        15%  { transform: translate(0, 8cqh)   scale(0.98) rotate(0); opacity: 1; }
        50%  { transform: translate(0, 45cqh)  scale(0.94) rotate(0); opacity: 1; }
        100% { transform: translate(0, 120cqh) scale(0.85) rotate(0); opacity: 1; }
      }
      /* 2026-05-10 (Wolf 'P1 nicht größer werden, smooth fliegen statt
         scale-explode'): Slow-Mo-Plateau gesenkt von scale 1.4 auf 1.2 →
         der nachfolgende Snap braucht keinen großen scale-Drop mehr. */
      @keyframes qqRaceWinnerSlowMo {
        0%   { transform: translateY(0) scale(1.2); }
        50%  { transform: translateY(-22px) scale(1.28); }
        100% { transform: translateY(0) scale(1.2); }
      }
      /* 2026-05-10 v2 (Wolf 'P1 wird groß und rutscht unsmooth — soll nicht
         größer werden, sondern direkt smooth fliegen, erst zur Mitte dann
         langsam runterlässt'):
         Refactor: kein scale-explode mehr (1.9→1). Avatar startet bei der
         winner-slow-mo End-Scale (1.2) und sinkt mit subtle scale-shrink
         zur 1.0 ab. translate aus -26cqh (≈ race-bahn-Mitte-Position) zur
         Treppchen-Stufe-Position (0). Opacity bleibt 1 → continuity zum
         race-bahn-P1 der gerade unmounted. Easing ease-out-soft → glide. */
      @keyframes qqRaceWinnerSnap {
        0%   { transform: scale(1.2) translateY(-26cqh); opacity: 1; }
        60%  { transform: scale(1.08) translateY(-3cqh); }
        85%  { transform: scale(1.02) translateY(0); }
        100% { transform: scale(1) translateY(0); opacity: 1; }
      }
      /* 2026-05-09 v8 (Wolf 'Treppchen steigt von unten mit allen Avataren'):
         Slide-from-bottom mit subtle overshoot — wirkt würdevoll und episch. */
      @keyframes qqRacePodiumRise {
        0%   { opacity: 0; transform: translateY(80cqh) scale(0.95); }
        60%  { opacity: 1; transform: translateY(-12px) scale(1.005); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      /* 2026-05-10 (Wolf 'Countdown 3-2-1 vor Race'): Pop-Animation für jede
         Countdown-Zahl — scale-explode, blur-clear, hold, leichter ausfade. */
      @keyframes qqRaceCountdownPop {
        0%   { opacity: 0; transform: scale(0.4); filter: blur(8px); }
        35%  { opacity: 1; transform: scale(1.25); filter: blur(0); }
        65%  { opacity: 1; transform: scale(1); filter: blur(0); }
        100% { opacity: 0.4; transform: scale(0.9); filter: blur(0); }
      }
      /* 2026-05-09 v8.1 (Wolf 'TRÖÖT als Sprachtext, keine bubble'):
         Periodisches Pop-In neben dem Tröte-Wolf — alle ~2.8s ein burst.
         Synchronisiert ungefähr mit der intern getriggerten Tröte-Pose. */
      @keyframes qqWolfTroeet {
        0%, 65%, 100% { opacity: 0; transform: scale(0.5) rotate(-8deg); }
        15%           { opacity: 1; transform: scale(1.15) rotate(-8deg); }
        45%           { opacity: 1; transform: scale(1) rotate(-8deg); }
      }
      /* 2026-05-09 v7.3 (Wolf 'konfetti klebt am oberen rand'): confettiFall
         wird normalerweise via QQ_BEAMER_CSS in QQBeamerPage's Wrapper
         injected — aber die Test-Page rendert FinalRevealView direkt ohne
         diese Style-Injection. Hier nochmal mit-injecten damit Test-Page
         funktioniert. Live-Beamer doppelt definiert (harmlos). */
      @keyframes confettiFall {
        0%   { transform: translateY(var(--cy, -60px)) rotate(0deg) scale(1); opacity: 1; }
        75%  { opacity: 1; }
        100% { transform: translateY(calc(100cqh + 40px)) rotate(var(--cr, 720deg)) scale(0.4); opacity: 0; }
      }
    `}</style>
  );
}

// ─── TitleHoldSlide ─────────────────────────────────────────────────────────
// 2026-05-10 (Wolf 'Drück Space soll nicht stehen — Mod-Hint im Live-Feed
// fehl am Platz'): Subtitle entfernt. Nur Pokal + Titel.
// 2026-05-25 v2 (Wolf 'pokal war besser als wolf'): zurueck zum statischen
// 🏆-Emoji mit phasePop + qqCatNameWave-Bob. AnimatedCozyWolf revertiert.
function TitleHoldSlide({ lang }: { lang: 'de' | 'en' }) {
  const de = lang === 'de';
  const titleText = de ? 'Die Auflösung' : 'The reveal';
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 'clamp(20px, 3cqh, 40px)',
      animation: 'qqFRTitleIn 0.9s cubic-bezier(0.2, 0.85, 0.3, 1) both',
    }}>
      <div style={{
        fontSize: 'clamp(120px, 14cqw, 240px)', lineHeight: 1, textAlign: 'center',
        filter: 'drop-shadow(0 8px 24px rgba(251,191,36,0.45))',
        animation: 'phasePop 0.7s var(--qq-ease-bounce) 0.2s both, qqCatNameWave 2.8s ease-in-out 1.4s infinite',
      }}>🏆</div>
      <div style={{
        fontSize: 'clamp(40px, 5.5cqw, 96px)', fontWeight: 900,
        // 2026-06-24 (Lesbarkeit+Brand): Hero-Titel auf Seiten-BG → var(--qq-title)
        // (Neo=Gelb, Mono=Schwarz, …). Cozy behält card-text (weiss auf Backdrop).
        color: isThemed() ? 'var(--qq-title)' : 'var(--qq-card-text)', textAlign: 'center', letterSpacing: '-0.02em',
        textShadow: isThemed() ? 'none' : '0 0 36px rgba(var(--qq-accent-rgb),0.45)',
        animation: 'phasePop 0.7s var(--qq-ease-bounce) 0.35s both',
      }}>
        {Array.from(titleText).map((ch, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              whiteSpace: ch === ' ' ? 'pre' : undefined,
              animation: 'qqCatNameWave 2.8s ease-in-out infinite',
              animationDelay: `${1.4 + i * 0.07}s`,
            }}
          >{ch}</span>
        ))}
      </div>
    </div>
  );
}

// ─── GridRevealSlide ────────────────────────────────────────────────────────
// L10 (2026-05-10, Wolf): Final-Lock-View „Größtes Gebiet" als Placement-
// Page-Großformat statt Mini-Grid. Größte zusammenhängende Region pro Team
// wird via Frontend-BFS (4-connectivity, matched backend qqBfs.ts) ermittelt
// und gehighlightet; kleinere Inseln + Empty-Cells gedimmt.
function GridRevealSlide({ state: s, cellsByTeam, lang }: {
  state: QQStateUpdate;
  cellsByTeam: Record<string, number>;
  lang: 'de' | 'en';
}) {
  const de = lang === 'de';

  // 2026-05-17 P12 (Wolf 'kein sound bei reveal von größtem grid'):
  // Reveal-Sound + Fanfare beim Mount der Lock-View. Vorher stille Anzeige,
  // jetzt klares „Brett-Stand fixiert"-Cue.
  useEffect(() => {
    if (s.sfxMuted) return;
    try { playReveal(); } catch {}
    const t = window.setTimeout(() => { try { playFanfare(); } catch {} }, 600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-Team Largest-Region-Cells. Matched backend (qqRooms.ts updateTerritories):
  // 4-Nachbarschaft, stuck-cells +1 Bonus, stackBonus zaehlt voll dazu.
  // 2026-05-23 (Live-Test-Bug #A Wolf-`!!!!`): vorher fehlte cell.stackBonus
  // im Frontend-Score-Calc — Double-Stack-Cells wurden nicht mitgewertet,
  // dadurch wurde im End-Grid eine kleinere Region als "groesste" markiert.
  // Backend hat trotzdem korrekt gerechnet (largestConnected stimmte), aber
  // die Visualisierung passte nicht zum Score → Sieger-Highlight verwirrend.
  const largestRegionCells = useMemo(() => {
    const N = s.gridSize;
    const visited: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));
    const bestCellsByTeam: Record<string, Set<string>> = {};
    const bestScoreByTeam: Record<string, number> = {};
    const bfs = (sr: number, sc: number, teamId: string): { cells: Set<string>; score: number } => {
      const cells = new Set<string>();
      const queue: [number, number][] = [[sr, sc]];
      visited[sr][sc] = true;
      let score = 0;
      while (queue.length > 0) {
        const [r, c] = queue.shift()!;
        cells.add(`${r}-${c}`);
        const cell = s.grid[r][c];
        // Base 1 + Stuck-Bonus 1 + Stack-Bonus N — matcht updateTerritories.
        score += 1 + (cell.stuck ? 1 : 0) + (cell.stackBonus ?? 0);
        const n: [number, number][] = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
        for (const [nr, nc] of n) {
          if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
          if (visited[nr][nc]) continue;
          if (s.grid[nr][nc].ownerId !== teamId) continue;
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
      return { cells, score };
    };
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (visited[r][c]) continue;
        const cell = s.grid[r][c];
        if (cell.ownerId === null) { visited[r][c] = true; continue; }
        const teamId = cell.ownerId;
        const { cells, score } = bfs(r, c, teamId);
        const prev = bestScoreByTeam[teamId] ?? -1;
        if (score > prev) {
          bestScoreByTeam[teamId] = score;
          bestCellsByTeam[teamId] = cells;
        }
      }
    }
    return bestCellsByTeam;
  }, [s.grid, s.gridSize]);

  // PlacementView-Sizing übernehmen — großes Grid links, Ranking rechts.
  // Etwas konservativer als PlacementView (Beamer-Rand für die Sidebar offen
  // halten); Sidebar nimmt mehr Breite als die alte (war 320-420, jetzt ~520).
  const gridMaxSize = typeof window !== 'undefined'
    ? Math.min(900, window.innerHeight * 0.78, window.innerWidth * 0.50)
    : 720;
  const gap = 6;
  const cellSize = Math.floor((gridMaxSize - (s.gridSize - 1) * gap) / s.gridSize);
  const cellRadius = Math.max(4, cellSize * 0.16);

  // Sort: largestConnected primary, totalCells als Tiebreaker (matched
  // GameOverView/Recap-Slide-Logik in QQBeamerPage:18024+).
  const ranking = [...s.teams].sort((a, b) => {
    const la = a.largestConnected ?? 0;
    const lb = b.largestConnected ?? 0;
    if (lb !== la) return lb - la;
    return (cellsByTeam[b.id] ?? 0) - (cellsByTeam[a.id] ?? 0);
  });
  const leaderId = ranking[0]?.id;

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 'clamp(20px, 2cqw, 36px)', width: '100%',
    }}>
      {/* LEFT: Big grid mit Largest-Region-Highlight */}
      <div style={{
        position: 'relative',
        animation: 'qqFRTitleIn 0.7s ease both',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${s.gridSize}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${s.gridSize}, ${cellSize}px)`,
          gap, padding: 12, borderRadius: 18,
          background: 'var(--qq-surface)',
          border: '3px solid var(--qq-hairline)',
          boxShadow: '0 0 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
          {s.grid.map((row, r) => row.map((cell, c) => {
            const key = `${r}-${c}`;
            if (!cell.ownerId) {
              return (
                <div key={key} style={{
                  width: cellSize, height: cellSize, borderRadius: cellRadius,
                  background: 'var(--qq-surface)',
                  border: '1px solid var(--qq-hairline)',
                  opacity: 0.45,
                }} />
              );
            }
            const owner = s.teams.find(t => t.id === cell.ownerId);
            if (!owner) return null;
            // 2026-05-11 (Wolf-Wunsch): NUR die Region des LEADER-Teams leuchtet.
            // Andere Teams + Leader's kleinere Inseln sind dim aber farblich
            // klar erkennbar (KEIN grayscale, nur leicht entsättigt + niedrigere
            // Opacity). Spieler kann immer noch sehen welche Cells welchem Team
            // gehören, aber der Fokus liegt klar auf dem Siegerteam.
            const isLeaderLargestRegion = owner.id === leaderId && !!largestRegionCells[leaderId]?.has(key);
            const color = owner.color;
            const bgA = isLeaderLargestRegion ? 'ff' : 'aa';
            const bgB = isLeaderLargestRegion ? 'cc' : '55';
            const borderAlpha = isLeaderLargestRegion ? 'ff' : '66';
            const borderWidth = isLeaderLargestRegion ? 2 : 1;
            return (
              <div key={key} style={{
                width: cellSize, height: cellSize, borderRadius: cellRadius,
                background: `linear-gradient(135deg, ${color}${bgA}, ${color}${bgB})`,
                border: `${borderWidth}px solid ${color}${borderAlpha}`,
                ['--c-color' as any]: `${color}aa`,
                animation: isLeaderLargestRegion
                  ? 'qqFRClusterPulse 2.4s ease-in-out infinite'
                  : 'qqFRTitleIn 0.5s ease both',
                boxShadow: isLeaderLargestRegion
                  ? `0 0 28px ${color}dd, 0 0 56px ${color}88, inset 0 0 14px ${color}55`
                  : 'inset 0 0 4px rgba(0,0,0,0.25)',
                opacity: isLeaderLargestRegion ? 1 : 0.62,
                filter: isLeaderLargestRegion ? 'none' : 'saturate(0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'opacity 0.4s ease, filter 0.4s ease, box-shadow 0.4s ease',
              }}>
                {owner.emoji && (
                  <CountryFlagOrEmoji
                    emoji={owner.emoji}
                    fontSize={cellSize * 0.5}
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
                  />
                )}
              </div>
            );
          }))}
        </div>
      </div>

      {/* RIGHT: Ranking-Sidebar — gleiche Sort-Order wie GameOverView. */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        width: 'clamp(380px, 32cqw, 540px)', flexShrink: 0,
        animation: 'qqFRTitleIn 0.7s ease 0.3s both',
      }}>
        <div style={{
          fontSize: 'clamp(14px, 1.35cqw, 22px)', fontWeight: 900,
          color: QQ_COLORS.amber400, textTransform: 'uppercase', letterSpacing: '0.16em',
          marginBottom: 2,
        }}>{de ? '🏆 Größtes Gebiet' : '🏆 Largest area'}</div>
        {ranking.map((t, i) => {
          const isLeader = i === 0;
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 16px', borderRadius: 16,
              background: isLeader ? `${t.color}22` : 'rgba(255,255,255,0.04)',
              border: isLeader ? `2px solid ${t.color}` : '1px solid var(--qq-hairline)',
              boxShadow: isLeader ? `0 0 24px ${t.color}55` : 'none',
            }}>
              <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={isLeader ? 48 : 40} />
              <span style={{ flex: 1, fontWeight: 900, color: t.color, fontSize: isLeader ? 21 : 18 }}>{t.name}</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
                <span style={{
                  fontSize: 'clamp(22px, 2.4cqw, 34px)', fontWeight: 900,
                  color: isLeader ? QQ_COLORS.amber400 : 'var(--qq-card-text)',
                  fontVariantNumeric: 'tabular-nums',
                }}>{t.largestConnected ?? 0}</span>
                <span style={{ fontSize: 11, color: 'var(--qq-text-muted)', marginTop: 4 }}>
                  · {cellsByTeam[t.id] ?? 0} {de ? 'ges.' : 'total'}
                </span>
              </div>
            </div>
          );
        })}
        <div style={{
          marginTop: 10, padding: '10px 14px', borderRadius: 12,
          background: 'rgba(var(--qq-accent-rgb),0.10)',
          border: '1px solid rgba(var(--qq-accent-rgb),0.30)',
          fontSize: 12, fontWeight: 700, color: isThemed() ? 'var(--qq-accent)' : QQ_COLORS.brandPinkMid,
          textAlign: 'center', letterSpacing: '0.04em',
        }}>
          {de ? '📌 Brett-Stand fixiert — jetzt kommen die Boni' : '📌 Board locked — now the bonuses'}
        </div>
      </div>
    </div>
  );
}

// ─── BetRevealSlide ─────────────────────────────────────────────────────────
function BetRevealSlide({ team, resolution, allTeams, lang, eurovisionMode }: {
  team?: QQTeam;
  resolution: import('../../../shared/quarterQuizTypes').QQFinalBetResolution | null;
  allTeams: QQTeam[];
  lang: 'de' | 'en';
  eurovisionMode?: boolean;
}) {
  // 2026-06-29 (Wolf 'kein Flip mehr — Slot-Machine'): Die Karte steht von
  // Anfang an (das tippende Team ist oben sofort sichtbar). Nur das GETIPPTE
  // Team löst sich spannend auf: der Target-Chip rattert wie ein Spielautomat
  // durch alle Team-Avatare+Farben, bremst ab und rastet auf dem echten Team
  // ein (Farb-Burst + Emoji-Pop). targetTeam wird IM Effect aus den Props
  // berechnet (steht erst nach dem Early-Return zur Verfügung).
  const [spinTeam, setSpinTeam] = useState<QQTeam | null>(null);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (!team) return;
    const tgt = resolution?.targetTeamId ? allTeams.find(t => t.id === resolution.targetTeamId) : null;
    if (!tgt) { setSpinTeam(null); setLocked(true); return; }
    setLocked(false);
    const pool = allTeams.filter(t => t.id !== team.id);
    const ring = pool.length > 0 ? pool : [tgt];
    // Deceleration: schnelle Ticks → immer langsamer → Lock auf das Target.
    const delays = [70, 70, 70, 72, 76, 82, 92, 106, 126, 152, 188, 232, 292, 372, 472];
    let i = 0;
    let cancelled = false;
    let timer = 0;
    setSpinTeam(ring[0]);
    try { playTeamReveal(); } catch {}
    const tick = () => {
      if (cancelled) return;
      if (i >= delays.length) {
        setSpinTeam(tgt);
        setLocked(true);
        try { playTeamReveal(); } catch {}
        return;
      }
      setSpinTeam(ring[(i * 3 + 1) % ring.length]);
      timer = window.setTimeout(tick, delays[i]);
      i++;
    };
    timer = window.setTimeout(tick, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id, resolution?.targetTeamId]);

  if (!team) return null;
  const de = lang === 'de';
  const sympathyColor = eurovisionMode ? '#C084FC' : QQ_COLORS.brandPinkMid;
  const targetTeam = resolution?.targetTeamId ? allTeams.find(t => t.id === resolution.targetTeamId) : null;
  const isMutual = !!resolution?.mutualWith;
  const totalBonus = resolution?.totalBonus ?? 0;
  const isZero = totalBonus === 0;

  // Slot-Chip-Inhalt: während des Spins das aktuell durchrasselnde Team, nach
  // dem Lock das echte Target. Farbe (Chip-BG/Border) folgt mit.
  const chipTeam = locked ? targetTeam : (spinTeam ?? targetTeam);
  const chipColor = chipTeam?.color ?? team.color;

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', minHeight: 0,
    }}>
      <style>{`
        @keyframes qqBetLockPop { 0% { transform: scale(1.34); } 58% { transform: scale(0.93); } 100% { transform: scale(1); } }
        @keyframes qqBetLockBurst { 0% { opacity: 0.85; transform: translate(-50%,-50%) scale(0.42); } 100% { opacity: 0; transform: translate(-50%,-50%) scale(2.3); } }
      `}</style>
      <div style={{
        width: '100%', maxWidth: 'clamp(360px, 42cqw, 560px)',
        height: '100%',
        filter: `drop-shadow(0 0 28px ${team.color}66)`,
        display: 'flex',
      }}>
        {/* 2026-06-29 (Wolf): kein 3D-Flip mehr — die Karte steht von Anfang an,
            nur der Slot-Chip unten löst das getippte Team auf. */}
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          minHeight: 'clamp(440px, 56cqh, 720px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 'clamp(14px, 1.8cqh, 22px)',
          padding: 'clamp(24px, 3cqh, 44px) clamp(28px, 3cqw, 48px)',
          borderRadius: 32, boxSizing: 'border-box',
          background: `linear-gradient(135deg, ${team.color}22, ${team.color}10)`,
          border: `3px solid ${team.color}`,
          boxShadow: `0 0 40px ${team.color}55, 0 16px 48px rgba(0,0,0,0.5)`,
        }}>
          {/* Tippendes Team — sofort sichtbar (kein Geheimnis) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
            <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={'clamp(120px, 13cqw, 200px)'} bgColor={team.color} />
            <div style={{ width: '100%' }}>
              <TeamNameLabel
                name={team.name}
                fontSize="clamp(30px, 3.2cqw, 52px)"
                color={team.color}
                fontWeight={900}
                maxLines={2}
                shrinkAfter={14}
                style={{ textAlign: 'center', letterSpacing: '-0.01em' }}
              />
            </div>
          </div>

          {!targetTeam ? (
            /* Disconnect-Fall: kein Tipp, neutraler Hinweis. */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: '22px 36px', borderRadius: 18,
              background: 'var(--qq-surface)',
              border: '1.5px solid var(--qq-hairline)',
              animation: 'qqFRTitleIn 0.6s ease 0.2s both',
            }}>
              <div style={{ fontSize: 'clamp(44px, 5cqw, 72px)', lineHeight: 1, opacity: 0.5 }}>—</div>
              <div style={{
                fontSize: 'clamp(20px, 2cqw, 30px)', fontWeight: 800,
                color: 'var(--qq-text-muted)', textAlign: 'center',
              }}>{de ? 'Kein Tipp abgegeben' : 'No tip submitted'}</div>
              <div style={{
                fontSize: 'clamp(15px, 1.4cqw, 20px)', fontWeight: 700,
                color: 'var(--qq-text-muted)', fontStyle: 'italic',
              }}>{de ? '0 Bonus-Punkte' : '0 bonus points'}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(12px, 1.6cqh, 20px)', width: '100%' }}>
              <div style={{
                fontSize: 'clamp(14px, 1.4cqw, 20px)', fontWeight: 900,
                color: 'var(--qq-text-muted)', textTransform: 'uppercase', letterSpacing: '0.18em',
              }}>{de ? 'tippte auf' : 'tipped on'}</div>

              {/* Slot-Machine-Chip — 2026-06-30 (Wolf 'Position springt zu stark'):
                  FESTE Breite + vertikales Layout (Avatar oben zentriert, Name im
                  reservierten Slot darunter). So bewegt sich der Avatar beim Lock
                  NICHT mehr horizontal und der Pill wächst nicht — nur Avatar
                  swappt + Burst/Pop, Name fadet in den reservierten Slot. */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 'clamp(6px, 0.9cqh, 12px)',
                padding: 'clamp(16px, 1.9cqh, 26px) clamp(18px, 2.4cqw, 36px)',
                borderRadius: 28, boxSizing: 'border-box',
                width: 'clamp(240px, 28cqw, 380px)', maxWidth: '100%',
                background: `${chipColor}1a`,
                border: `2.5px solid ${chipColor}`,
                boxShadow: locked ? `0 0 30px ${chipColor}77` : 'none',
                transition: 'background 0.18s ease, border-color 0.18s ease, box-shadow 0.35s ease',
              }}>
                <div style={{ position: 'relative', display: 'flex' }}>
                  {locked && (
                    <span aria-hidden style={{
                      position: 'absolute', left: '50%', top: '50%',
                      width: 'clamp(76px, 7.4cqw, 108px)', height: 'clamp(76px, 7.4cqw, 108px)',
                      borderRadius: '50%', border: `3px solid ${chipColor}`,
                      animation: 'qqBetLockBurst 0.6s ease-out both', pointerEvents: 'none',
                    }} />
                  )}
                  <QQTeamAvatar
                    key={(chipTeam ?? targetTeam).id}
                    avatarId={(chipTeam ?? targetTeam).avatarId} teamEmoji={(chipTeam ?? targetTeam).emoji}
                    size={'clamp(76px, 7.4cqw, 108px)'} bgColor={chipColor}
                    style={{ animation: locked ? 'qqBetLockPop 0.45s cubic-bezier(0.34,1.5,0.5,1) both' : undefined }}
                  />
                </div>
                {/* Name-Slot mit reservierter Höhe → kein Reflow beim Lock */}
                <div style={{
                  minHeight: 'clamp(38px, 4.4cqh, 68px)', width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {locked ? (
                    <TeamNameLabel
                      name={targetTeam.name}
                      fontSize="clamp(24px, 2.5cqw, 38px)"
                      color={targetTeam.color}
                      fontWeight={900}
                      maxLines={2}
                      shrinkAfter={12}
                      style={{ textAlign: 'center', animation: 'qqFRTitleIn 0.4s ease both' }}
                    />
                  ) : (
                    <div style={{
                      fontSize: 'clamp(24px, 2.6cqw, 40px)', fontWeight: 900,
                      color: 'var(--qq-text-muted)', letterSpacing: '0.3em', lineHeight: 1,
                    }}>…</div>
                  )}
                </div>
              </div>

              {/* Bonus-Bereich — reservierte Höhe, Inhalt fadet beim Lock ein
                  (kein vertikaler Sprung der restlichen Karte). */}
              <div style={{
                minHeight: 'clamp(120px, 15cqh, 196px)', width: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'flex-start', gap: 'clamp(10px, 1.4cqh, 18px)',
              }}>
                {locked && isMutual && (
                  <div style={{
                    fontSize: 'clamp(17px, 1.7cqw, 26px)', fontWeight: 800,
                    color: sympathyColor, display: 'flex', alignItems: 'center', gap: 8,
                    animation: 'qqFRTitleIn 0.6s ease 0.28s both',
                  }}>
                    <span style={{ fontSize: 'clamp(22px, 2.2cqw, 34px)' }}>💞</span>
                    {de ? '+ Sympathie-Bonus' : '+ Sympathy bonus'}
                  </div>
                )}
                {locked && (isZero ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    animation: 'qqFRTitleIn 0.7s ease 0.5s both',
                  }}>
                    <div style={{
                      fontSize: 'clamp(48px, 5.8cqw, 92px)', lineHeight: 1,
                      animation: 'qqFROohBob 1.6s ease-in-out 0.5s infinite',
                    }}>🥲</div>
                    <div style={{
                      fontSize: 'clamp(26px, 2.8cqw, 42px)', fontWeight: 900,
                      color: 'var(--qq-text-muted)', textAlign: 'center', fontStyle: 'italic',
                    }}>oooh …</div>
                    <div style={{
                      fontSize: 'clamp(14px, 1.3cqw, 20px)', fontWeight: 700,
                      color: 'var(--qq-text-muted)', textAlign: 'center',
                    }}>{de ? '0 Bonus — Tipp ging nicht auf' : '0 bonus — tip didn\'t pay off'}</div>
                  </div>
                ) : (
                  <div style={{
                    padding: 'clamp(12px, 1.6cqh, 20px) clamp(22px, 3cqw, 38px)',
                    borderRadius: 24,
                    background: 'rgba(34,197,94,0.18)',
                    border: '3px solid rgba(34,197,94,0.65)',
                    boxShadow: '0 0 36px rgba(34,197,94,0.35)',
                    fontSize: 'clamp(44px, 5.4cqw, 88px)', fontWeight: 900,
                    color: QQ_COLORS.green500, letterSpacing: '-0.02em',
                    lineHeight: 1,
                    animation: 'qqFRTitleIn 0.8s cubic-bezier(0.34, 1.46, 0.64, 1) 0.5s both',
                  }}>
                    + {totalBonus}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AwardCardSlide / AwardRevealSlide ──────────────────────────────────────
// 2026-05-25 (Wolf 'awards-last, underdog als climax'): Reihenfolge intern
// Speedy → Meisterklauer → Underdog. Underdog ist der Drama-Spike (+2 Stacks)
// und kommt zuletzt im Reveal-Flow. stackCount per award fuer Reveal-Stack-
// Mechanik (Speedy=1, Meisterklauer=1, Underdog=2).
const AWARD_DEFS = [
  { emoji: '⚡', slug: 'award-speedy',   titleDe: 'Speedy Gonzales',     titleEn: 'Speedy Gonzales', descDe: 'Schnellste Antworten', descEn: 'Fastest answers',   accent: QQ_COLORS.brandPinkMid, stackCount: 1 },
  { emoji: '🦝', slug: 'award-thief',    titleDe: 'Meisterklauer',       titleEn: 'Master thief',    descDe: 'Meiste Klaus',          descEn: 'Most steals',       accent: '#A855F7',              stackCount: 1 },
  { emoji: '🐢', slug: 'award-underdog', titleDe: 'Underdog-Trostpreis', titleEn: 'Underdog prize',  descDe: 'Niedrigster Score',     descEn: 'Lowest score',      accent: '#10B981',              stackCount: 2 },
];
// 2026-06-29 (Wolf): Award-Stamps gibt es als 3D-Wolf-PNGs (Stirnband/Maske/
// Pflaster) — Mapping kind → Datei. Fallback bleibt das Emoji.
const AWARD_STAMP_SLUG: Record<string, string> = {
  speedy: 'award-speedy', meisterklauer: 'award-thief', underdog: 'award-underdog',
};
function AwardStamp({ kind, fallback, sizeCss }: { kind: string; fallback: string; sizeCss: string }) {
  const slug = AWARD_STAMP_SLUG[kind];
  if (!slug) return <>{fallback}</>;
  return <img src={`/icons/${slug}.png`} alt={kind} draggable={false}
    style={{ width: sizeCss, height: sizeCss, objectFit: 'contain', verticalAlign: 'middle' }} />;
}

// 2026-05-24 v3 (Wolf 'diesen zwischenschritt braucht es nicht mehr'):
// AwardsOverviewSlide gestrichen — title geht direkt zu award-slot 0.

// 2026-05-24 v2 (Wolf-Wunsch 'awards einzeln, gleiches Format wie bet cards'):
// Award-Slot-Transition rendert pro Step EINEN Award als Hero-Card (analog
// BetRevealSlide). Drumroll → Reveal beim Mount, Mod-Space advanced zum
// nächsten Award oder zur Bet-Phase.
function AwardSlotTransition({ awardIndex, state: s, lang }: {
  awardIndex: 0 | 1 | 2; state: QQStateUpdate; lang: 'de' | 'en';
}) {
  return (
    <SlotTransition
      slotKey={`award-${awardIndex}`}
      exitAnimation="qqFRSlamOutDown 0.22s cubic-bezier(0.4, 0, 0.7, 0.3) both"
      exitMs={220}
      enterAnimation="qqFRSlotEnter 0.35s cubic-bezier(0.34, 1.36, 0.64, 1) 0.10s both"
    >
      {/* 2026-05-25 (Wolf-Bug 'cards flippen nicht im live'): key={awardIndex}
          erzwingt frischen Mount pro Award. Ohne key reuste React die
          Instance — useEffect mit [] lief nur beim allerersten Mount,
          isFlipped blieb true von der 1. Card → kein Drumroll mehr fuer
          Award 2/3. */}
      <AwardHeroSlide key={awardIndex} awardIndex={awardIndex} state={s} lang={lang} />
    </SlotTransition>
  );
}

function AwardHeroSlide({ awardIndex, state: s, lang }: {
  awardIndex: 0 | 1 | 2; state: QQStateUpdate; lang: 'de' | 'en';
}) {
  const awards = s.endAwards;
  const winnerId = !awards ? null
    // v4: Speedy(0) → Meisterklauer(1) → Underdog(2)
    : awardIndex === 0 ? awards.speedy
    : awardIndex === 1 ? awards.meisterklauer
    : awards.underdog;
  const winner = winnerId ? s.teams.find(t => t.id === winnerId) ?? null : null;
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Drumroll → Flip beim Mount (analog Bet-Cards). 900ms Drumroll-Build-up.
    const DRUMROLL_MS = 900;
    const t1 = window.setTimeout(() => {
      try { playSpecialAwardReveal(); } catch {}
    }, 100);
    const t2 = window.setTimeout(() => setIsFlipped(true), DRUMROLL_MS);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2026-05-24 v3 (Wolf-Feedback 'Cards sahen frueher anders aus'):
  // Wiederverwendung der existierenden AwardFlipCard-Komponente — 3D-Flip mit
  // BG (Drumroll/???-Card) → Front (Sieger-Avatar + +1-Badge). Wrap nur damit
  // sie zentriert in der linken Split-Spalte sitzt.
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%', minHeight: 0,
    }}>
      <div style={{
        width: 'clamp(280px, 38cqw, 480px)',
        height: '100%',
        display: 'flex', alignItems: 'stretch',
      }}>
        <AwardFlipCard
          awardIndex={awardIndex}
          isFlipped={isFlipped}
          winner={winner}
          awards={awards}
          lang={lang}
        />
      </div>
    </div>
  );
}

// 2026-05-10 (Wolf 'BetReveal Variante D — Anti-Shaming'):
// Sammel-Slide für alle Teams die ge-bettet haben aber 0 Bonus bekommen.
// Tonalität: warm-bedauernd, nicht spöttisch — keine großen 🥲-Drama-Avatare,
// stattdessen mittlere Avatare in Reihe, klein-statt-groß-im-Spotlight.
// Erscheint VOR den Positiv-Teams (Crescendo: schwach → stark).
function BetZeroGroupSlide({ teams, lang }: {
  teams: QQTeam[]; lang: 'de' | 'en';
}) {
  const de = lang === 'de';
  const N = teams.length;
  // Avatar-Größe skaliert mit Team-Anzahl
  const avatarSize = N <= 3
    ? 'clamp(110px, 11cqw, 160px)'
    : N <= 5
      ? 'clamp(90px, 9cqw, 130px)'
      : 'clamp(70px, 7cqw, 100px)';
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 'clamp(28px, 3.5cqh, 48px)',
      width: '100%',
      padding: 'clamp(20px, 2cqh, 36px) clamp(24px, 3cqw, 48px)',
    }}>
      <div style={{
        fontSize: 'clamp(13px, 1.4cqw, 22px)', fontWeight: 900,
        color: 'var(--qq-text-muted)', textTransform: 'uppercase', letterSpacing: '0.18em',
        animation: 'qqFRTitleIn 0.7s cubic-bezier(0.2, 0.85, 0.3, 1) both',
      }}>{de ? '🎯 Tipps abgegeben' : '🎯 Tips placed'}</div>
      <div style={{
        fontSize: 'clamp(30px, 3.6cqw, 56px)', fontWeight: 900,
        color: 'var(--qq-card-text)', textAlign: 'center', letterSpacing: '-0.02em',
        textShadow: '0 0 28px rgba(var(--qq-accent-rgb),0.35)',
        animation: 'qqFRTitleIn 0.7s cubic-bezier(0.2, 0.85, 0.3, 1) 0.1s both',
        maxWidth: '92cqw',
      }}>{de
        ? 'Diese Teams haben mitgetippt'
        : 'These teams placed their tip'}
      </div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        gap: 'clamp(20px, 2.6cqw, 48px)', flexWrap: 'wrap',
        maxWidth: '92cqw',
      }}>
        {teams.map((t, i) => (
          <div key={t.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            animation: `qqFRSlamFromTop 0.8s cubic-bezier(0.34, 1.46, 0.64, 1) ${0.25 + i * 0.10}s both`,
            opacity: 0,
          }}>
            {/* 2026-05-25 v3 (Wolf 'so ist die zugehörigkeit nicht eindeutig'):
                Outer-Ring raus — der Avatar selbst bekommt jetzt team.color
                als Disc-BG (bgColor-Override), damit das Vollton-Orange klar
                die Team-Zugehoerigkeit zeigt — wie auf dem Grid. */}
            <QQTeamAvatar
              avatarId={t.avatarId}
              teamEmoji={t.emoji}
              size={avatarSize}
              bgColor={t.color}
            />
            {/* 2026-05-25 (Wolf 'teamnamen ausgeschrieben, nicht abgeschnitten'):
                maxWidth + ellipsis raus, dafuer 2-zeilig erlauben + leicht
                kleiner skalieren bei langen Namen. */}
            <div style={{
              fontSize: 'clamp(14px, 1.4cqw, 20px)', fontWeight: 900,
              color: t.color,
              textShadow: `0 0 12px ${t.color}55`,
              textAlign: 'center',
              maxWidth: 'min(220px, 22cqw)',
              lineHeight: 1.15,
              wordBreak: 'break-word',
            }}>{t.name}</div>
          </div>
        ))}
      </div>
      <div style={{
        fontSize: 'clamp(15px, 1.5cqw, 22px)', color: 'var(--qq-text-muted)',
        fontStyle: 'italic', textAlign: 'center',
        animation: `qqFRTitleIn 0.6s ease ${0.25 + N * 0.10 + 0.4}s both`,
        opacity: 0,
      }}>{de
        ? 'Schade — der Tipp ging daneben 🤞'
        : 'Tough luck — the tip went sideways 🤞'}
      </div>
    </div>
  );
}

// 3D-Flip-Card mit identischer Dimension auf BG- und Front-Seite (gleicher
// padding/min-height-Container — der innere `flip-inner`-Wrapper rotiert,
// Größe ist outside fixed). Wolfs Anker-Anforderung: zu jedem Zeitpunkt sind
// alle 3 Cards gleich groß. BG: Award-Name + Emoji + ???. Front: Team-Sieger
// + +1-Bonus.
function AwardFlipCard({ awardIndex, isFlipped, winner, awards, lang }: {
  awardIndex: 0 | 1 | 2;
  isFlipped: boolean;
  winner: QQTeam | null;
  awards: QQStateUpdate['endAwards'];
  lang: 'de' | 'en';
}) {
  const a = AWARD_DEFS[awardIndex];
  const de = lang === 'de';
  // 2026-05-25 v4 (Wolf 'underdog hat 3× first, das ist Speedy!'):
  // Award-Order in v4: 0=Speedy, 1=Meisterklauer, 2=Underdog.
  // Alter Code hatte awardIndex===2 fuer Speedy stehen — Migration-Drift.
  const metric = !winner ? null
    : awardIndex === 0 && (awards as any)?.speedyFirstCount
      ? (de ? `${(awards as any).speedyFirstCount}× zuerst` : `${(awards as any).speedyFirstCount}× first`)
    : awardIndex === 0 && awards?.speedyAvgMs
      ? `Ø + ${(awards.speedyAvgMs / 1000).toFixed(1)}s`
    : awardIndex === 1 && awards?.meisterklauerCount
      ? (de ? `${awards.meisterklauerCount}× geklaut` : `${awards.meisterklauerCount}× stolen`)
    : null;

  const cardCommonStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: 28,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 'clamp(20px, 2.5cqh, 36px) clamp(20px, 2cqw, 32px)',
    gap: 'clamp(8px, 1.2cqh, 18px)',
    boxSizing: 'border-box',
    overflow: 'hidden',
  };

  return (
    <div style={{
      flex: '1 1 0', minWidth: 200, maxWidth: 480,
      perspective: '1600px',
      animation: 'qqFRSlamDown 0.9s cubic-bezier(0.34, 1.46, 0.64, 1) both',
      filter: `drop-shadow(0 0 28px ${a.accent}88)`,
      height: '100%', display: 'flex',
      position: 'relative',  // damit das +1-Badge absolute-positioniert werden kann
    }}>
      {/* 2026-05-25 v5 (Wolf 'einfach weiter runter setzen, dann kein
          Rand-Overlap'): Badge weiter unten platziert (top ~9% statt corner),
          float-up Animation hat jetzt Luft nach oben ohne mit dem Card-Rand
          zu kollidieren. */}
      {winner && isFlipped && (
        <span aria-hidden style={{
          position: 'absolute',
          top: 'clamp(70px, 9cqh, 110px)',
          right: 'clamp(14px, 1.6cqw, 26px)',
          padding: '6px 14px',
          borderRadius: 18,
          background: 'rgba(34,197,94,0.22)',
          border: '2.5px solid rgba(34,197,94,0.75)',
          boxShadow: '0 0 28px rgba(34,197,94,0.55)',
          fontSize: 'clamp(28px, 3.2cqw, 52px)', fontWeight: 900,
          color: QQ_COLORS.green500,
          textShadow: '0 0 14px rgba(34,197,94,0.7)',
          animation: 'qqFRPlusOne 2.2s ease-out 0.6s both',
          pointerEvents: 'none',
          lineHeight: 1,
          zIndex: 10,
        }}>+1</span>
      )}
      <div style={{
        position: 'relative',
        width: '100%',
        // 2026-05-25 v3 (Wolf 'cards rechts abgeschnitten, +1 weg'):
        // height: 100% statt fester minHeight — Card folgt der Column-Hoehe,
        // damit der Sieger-Avatar + +N-Badge sicher reinpassen.
        height: '100%',
        minHeight: 'clamp(360px, 44cqh, 620px)',
        transformStyle: 'preserve-3d',
        WebkitTransformStyle: 'preserve-3d',
        transition: 'transform 1.1s cubic-bezier(0.34, 1.46, 0.64, 1)',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>
        {/* BG — Award-Name + Emoji + ??? */}
        <div style={{
          ...cardCommonStyle,
          background: `linear-gradient(160deg, ${a.accent}28, ${a.accent}10)`,
          border: `3px solid ${a.accent}`,
          boxShadow: `0 0 80px ${a.accent}66, 0 16px 48px rgba(0,0,0,0.5)`,
        }}>
          <div style={{
            fontSize: 'clamp(11px, 1.2cqw, 18px)', fontWeight: 900,
            color: a.accent, textTransform: 'uppercase', letterSpacing: '0.18em',
          }}>{de ? '🥁 Trommelwirbel …' : '🥁 Drumroll …'}</div>
          <div style={{
            lineHeight: 1,
            animation: !isFlipped ? 'qqFRDrumroll 0.6s ease-in-out infinite' : 'none',
            filter: `drop-shadow(0 0 22px ${a.accent}99)`,
          }}>
            <img src={`/icons/${a.slug}.png`} alt="" draggable={false}
              style={{ width: 'clamp(110px, 12cqw, 180px)', height: 'auto', objectFit: 'contain', display: 'block' }} />
          </div>
          <div style={{
            fontSize: 'clamp(22px, 2.4cqw, 38px)', fontWeight: 900,
            color: 'var(--qq-card-text)', textAlign: 'center', letterSpacing: '-0.01em',
          }}>{de ? a.titleDe : a.titleEn}</div>
          <div style={{
            fontSize: 'clamp(13px, 1.4cqw, 20px)', fontWeight: 700,
            color: a.accent, fontStyle: 'italic', textAlign: 'center',
          }}>{de ? a.descDe : a.descEn}</div>
          <div style={{
            fontSize: 'clamp(28px, 3cqw, 48px)', fontWeight: 900,
            color: 'var(--qq-text-muted)', letterSpacing: '0.4em',
          }}>???</div>
        </div>

        {/* Front — Sieger Avatar + +1 */}
        <div style={{
          ...cardCommonStyle,
          transform: 'rotateY(180deg)',
          background: winner
            ? `linear-gradient(160deg, ${winner.color}28, ${winner.color}10)`
            : `linear-gradient(160deg, ${a.accent}28, ${a.accent}10)`,
          border: winner ? `3px solid ${winner.color}` : `3px solid ${a.accent}`,
          boxShadow: winner
            ? `0 0 100px ${winner.color}88, 0 16px 48px rgba(0,0,0,0.5)`
            : `0 0 80px ${a.accent}66, 0 16px 48px rgba(0,0,0,0.5)`,
        }}>
          {/* 2026-05-25 v4: +1-Badge wurde auf den outer perspective-Wrapper
              verschoben (siehe AwardFlipCard outer div) — drinnen blockierte
              overflow:hidden die Float-Up-Animation. */}
          <div style={{
            fontSize: 'clamp(11px, 1.2cqw, 18px)', fontWeight: 900,
            color: a.accent, textTransform: 'uppercase', letterSpacing: '0.18em',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <img src={`/icons/${a.slug}.png`} alt="" draggable={false}
              style={{ width: 'clamp(26px, 2.8cqw, 40px)', height: 'clamp(26px, 2.8cqw, 40px)', objectFit: 'contain' }} />
            {de ? a.titleDe : a.titleEn}
          </div>
          {winner ? (
            <>
              <QQTeamAvatar avatarId={winner.avatarId} teamEmoji={winner.emoji}
                size={'clamp(110px, 12cqw, 170px)'} />
              {/* 2026-05-09 v3 (Wolf-Bug 'Award-Card team-name truncated'):
                  Wrap auf 2 Zeilen statt nowrap-ellipsis. Bei langen Namen
                  kleinere FontSize (clamp 22-36 statt 28-48) damit's reinpasst.
                  Card-Größe (height clamp 360-540) bleibt fix → Layout stabil. */}
              {(() => {
                const isLong = winner.name.length > 10;
                return (
                  <div style={{
                    fontSize: isLong ? 'clamp(20px, 2.2cqw, 34px)' : 'clamp(28px, 3cqw, 48px)',
                    fontWeight: 900,
                    color: winner.color, textAlign: 'center', letterSpacing: '-0.01em',
                    textShadow: `0 0 28px ${winner.color}55`,
                    whiteSpace: 'normal',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    wordBreak: 'break-word', hyphens: 'auto',
                    maxWidth: '100%', lineHeight: 1.1,
                  }}>{winner.name}</div>
                );
              })()}
              {metric && (
                <div style={{
                  fontSize: 'clamp(13px, 1.4cqw, 20px)', fontWeight: 700,
                  color: 'var(--qq-text-muted)', fontStyle: 'italic',
                }}>{metric}</div>
              )}
              <div style={{
                padding: '8px 18px', borderRadius: 'var(--qq-pill-radius)',
                background: 'rgba(34,197,94,0.18)',
                border: '2px solid rgba(34,197,94,0.55)',
                fontSize: 'clamp(13px, 1.4cqw, 20px)', fontWeight: 900,
                color: QQ_COLORS.green500,
              }}>{de ? '+ 1 Bonus' : '+ 1 bonus'}</div>
            </>
          ) : (
            <div style={{ fontSize: 'clamp(16px, 1.6cqw, 22px)', color: 'var(--qq-text-muted)', fontStyle: 'italic' }}>
              {de ? '(kein Sieger)' : '(no winner)'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RACE-FINALE — Wolf 2026-05-09 v5 (nach Brainstorm + Speed-Lines-Mockup)
// ═══════════════════════════════════════════════════════════════════════════════
// Konzept: Race-Metapher statt linearer Slides. Alle Teams "rennen on-the-
// spot" mit Speed-Lines hinter sich (Pseudo-Movement), wackeln async, fallen
// gestaffelt nach unten weg ("bleibt auf der Strecke"). Top-3 landen auf
// Treppchen, Sieger schwebt Slow-Mo über Ziellinie. EINE Auto-Choreo statt
// 3 Mod-Steps — Mod startet sie mit einem Space, Rest läuft selbst.

// 2026-05-09 v8 (Wolf 'alle fallen bis P1, Treppchen steigt mit allen avataren'):
// 2026-05-10 v8.3 (Wolf 'Countdown 3-2-1 vor Race'):
type RacePhase =
  | 'countdown'         // 0-3.5s: BEREIT? → 3 → 2 → 1 → GO! (Auto-Choreo)
  | 'race'              // 3.5-8.5s: alle in initial-X, schweben async (5s Hold)
  | 'staggered-fall'    // N..2 fallen gestaffelt (gerade runter, 2s stagger)
  | 'p1-solo'           // P1 alleine schwebt (4s)
  | 'podium-rises'      // Treppchen steigt mit ALLEN P2..PN drauf (2.5s)
  | 'winner-slowmo'     // P1 slow-mo (1.5s)
  | 'finish';           // P1 snap auf Mitte-Stufe + Crown + Konfetti

// Slot-Config pro Rang — Stufen-Höhe + Avatar-Größe + Slot-Breite.
// Rang 1-3: klassisches Olympia-Podium (groß/mittel/niedrig).
// Rang 4+: minimal niedrige Stufen (kein dramatischer Höhenunterschied,
// nur sichtbare Position-Indikator).
function getSlotConfig(rank: number): {
  podiumHeight: string; avatarSize: string; slotWidth: string;
  fontSize: string; rankFontSize: string;
} {
  // 2026-05-11 (Wolf 'Treppchen viel zu mini, riesig Leerraum oben'): alle
  // Slot-Sizes ~35% nach oben gezogen damit das Podium den verfügbaren Slide-
  // Space ausfüllt. Vorher schwebte ein mini-Podium in der Mitte mit ~40 vh
  // Leerraum darüber. Jetzt: P1 avatar bis 230px, podium bis 230px, Rang4+
  // Slot deutlich präsenter.
  if (rank === 1) return {
    podiumHeight: 'clamp(150px, 18cqh, 230px)',
    avatarSize: 'clamp(150px, 16cqw, 230px)',
    slotWidth: 'clamp(190px, 18cqw, 270px)',
    fontSize: 'clamp(20px, 2.2cqw, 34px)',
    rankFontSize: 'clamp(48px, 5cqw, 80px)',
  };
  if (rank === 2) return {
    podiumHeight: 'clamp(108px, 13cqh, 170px)',
    avatarSize: 'clamp(115px, 12cqw, 175px)',
    slotWidth: 'clamp(155px, 15cqw, 220px)',
    fontSize: 'clamp(16px, 1.7cqw, 26px)',
    rankFontSize: 'clamp(30px, 3.2cqw, 52px)',
  };
  if (rank === 3) return {
    podiumHeight: 'clamp(72px, 8.5cqh, 112px)',
    avatarSize: 'clamp(100px, 10.5cqw, 150px)',
    slotWidth: 'clamp(155px, 15cqw, 220px)',
    fontSize: 'clamp(15px, 1.6cqw, 24px)',
    rankFontSize: 'clamp(28px, 3cqw, 44px)',
  };
  // Rang 4+: deutlich präsenter als vorher (Wolf wollte alle gut sichtbar)
  return {
    podiumHeight: 'clamp(34px, 4cqh, 52px)',
    avatarSize: 'clamp(76px, 8cqw, 118px)',
    slotWidth: 'clamp(108px, 11.5cqw, 165px)',
    fontSize: 'clamp(13px, 1.3cqw, 18px)',
    rankFontSize: 'clamp(18px, 1.8cqw, 26px)',
  };
}

// Display-Reihenfolge der Ränge (links → rechts). P1 in der Mitte, gerade
// Plätze nach links (P2 nahe an P1, P4 weiter weg, ...), ungerade nach
// rechts (P3 nahe an P1, P5 weiter weg, ...). Klassisches Olympia-Layout
// erweitert auf bis zu N=8.
//   N=3:  [P2, P1, P3]
//   N=5:  [P4, P2, P1, P3, P5]
//   N=8:  [P8, P6, P4, P2, P1, P3, P5, P7]
function getOrderedRanks(N: number): number[] {
  const left: number[] = [];
  const right: number[] = [];
  for (let r = 2; r <= N; r++) {
    if (r % 2 === 0) left.unshift(r); // gerade: am Anfang einsetzen → P2 zuletzt (innen)
    else right.push(r);
  }
  return [...left, 1, ...right];
}

// ── RaceFinishHero — Top-3-Pack aus Design-Audit 2026-05-11 ────────────────
// Drei Layer für die tote Top-Zone bei phase==='finish':
//   1. Wimpelketten oben (SVG-Bogen mit pink/gold Wimpeln, sanft wackelnd)
//   2. Spotlight-Cone (goldener Lichtkegel von oben auf P1)
//   3. Headline-Banner („SIEGER: {Name}") gold/pink, slide-down
// Greift NUR bei isFinish — kein Conflict mit der Race-Choreo davor.
function RaceFinishHero({ winner, lang }: { winner: QQTeam; lang: 'de' | 'en' }) {
  const pennantColors = [QQ_COLORS.brandPink, QQ_COLORS.amber400, '#A21247', QQ_COLORS.yellow300, QQ_COLORS.brandPink, QQ_COLORS.amber400, '#A21247', QQ_COLORS.yellow300, QQ_COLORS.brandPink];
  return (
    <>
      {/* Layer 1 — Spotlight-Cone (z hinter Banner, vor BG) */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(800px, 60cqw)', height: '100%',
        background: `conic-gradient(from 180deg at 50% 0%, transparent 0deg, rgba(251,191,36,0.18) 6deg, rgba(251,191,36,0.32) 10deg, rgba(var(--qq-accent-rgb),0.22) 14deg, transparent 20deg)`,
        opacity: 0.85,
        pointerEvents: 'none',
        zIndex: 1,
        animation: 'qqFRSpotlight 4.5s ease-in-out infinite',
        mixBlendMode: 'screen',
      }} />

      {/* Layer 2 — Wimpelketten oben */}
      <svg aria-hidden style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        width: '100%', height: 'clamp(80px, 9cqh, 130px)',
        pointerEvents: 'none',
        zIndex: 2,
        animation: 'qqFRPennantWave 4s ease-in-out infinite',
      }} viewBox="0 0 1200 130" preserveAspectRatio="none">
        {/* String (Bogen) */}
        <path d="M 0,8 Q 600,80 1200,8" stroke="rgba(251,191,36,0.55)" strokeWidth="2" fill="none" />
        {/* Wimpel pro Position entlang der Bogen-Kurve */}
        {Array.from({ length: 11 }).map((_, i) => {
          const t = i / 10;
          // Bezier-Punkt: P(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
          const x = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * 600 + t * t * 1200;
          const y = (1 - t) * (1 - t) * 8 + 2 * (1 - t) * t * 80 + t * t * 8;
          const color = pennantColors[i % pennantColors.length];
          // 2026-05-13 (Wolf-Bug 'fähnchen verlassen das band'): individuelle
          // qqFRPennantFlap-Animation entfernt — sie verschob die Wimpel
          // sichtbar weg vom Bogen-String. Jetzt haengen alle Wimpel STILL
          // am Band, nur das gesamte SVG-Banner schwingt via qqFRPennantWave
          // (siehe Outer-svg-Animation). So bewegen sich Fähnchen + Band
          // gemeinsam, die Fähnchen bleiben immer auf dem Band.
          return (
            <g key={i} transform={`translate(${x}, ${y})`}>
              <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="1.5" />
              <path d="M -14,6 L 0,42 L 14,6 Z" fill={color} opacity="0.92" />
            </g>
          );
        })}
      </svg>

      {/* Layer 3 — Headline-Banner (Sieger-Name) */}
      <div style={{
        position: 'absolute',
        top: 'clamp(80px, 11cqh, 150px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 4,
        pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 6,
        animation: 'qqFRBannerDrop 0.9s var(--qq-ease-bounce) 0.2s both',
      }}>
        <div style={{
          fontSize: 'clamp(14px, 1.4cqw, 22px)',
          fontWeight: 900,
          color: QQ_COLORS.amber400,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          textShadow: '0 0 14px rgba(251,191,36,0.8), 0 2px 6px rgba(0,0,0,0.7)',
        }}>
          🏆 {lang === 'de' ? 'Sieger' : 'Winner'}
        </div>
        <div style={{
          fontSize: 'clamp(38px, 4.6cqw, 76px)',
          fontWeight: 900,
          color: winner.color,
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
          maxWidth: '80cqw',
          textAlign: 'center',
          textShadow: `0 0 32px ${winner.color}cc, 0 0 64px ${winner.color}66, 0 4px 12px rgba(0,0,0,0.85)`,
          fontFamily: 'var(--font-game, system-ui)',
          whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {winner.name}
        </div>
      </div>
    </>
  );
}

// ─── FinalEurovisionFinale ──────────────────────────────────────────────────
// 2026-05-24 v2 (Wolf 'Option B Crescendo'): Cascade-Reveal vom schlechtesten
// Team aufwaerts zum Sieger. Worst-row slammt aus von unten, dann naechst-
// schlechter, ..., bis zum vorletzten Platz. Vor dem Sieger-Reveal ein
// 1.2s Anticipation-Hold (Drumroll-Tick), dann SIEGER explodiert als grosse
// Hero-Row (Avatar 2x, Krone von oben, Konfetti, Fanfare + Climax-Akkord).
// Trade-off ggue. „Sieger-Hero solo": alle Teams sehen ihren finalen Rang,
// Spannungsbogen wird statt punktuell durchgehend ueber ~6-9s aufgebaut.
function FinalEurovisionFinale({ finalRanking, lang }: {
  finalRanking: RankingEntry[]; lang: 'de' | 'en';
}) {
  const de = lang === 'de';
  const N = finalRanking.length;
  // revealedCount zählt von unten (worst-first). 0 = nichts sichtbar,
  // N-1 = alle ausser Sieger, N = Sieger reveal-done.
  const [revealedCount, setRevealedCount] = useState(0);
  const [winnerRevealed, setWinnerRevealed] = useState(false);

  useEffect(() => {
    const timers: number[] = [];
    const START = 400; // erste Row erscheint
    // 2026-05-25 (Wolf 'progressive slowdown ab platz 3, drumroll vor sieger'):
    // Stagger steigt fuer Top-Plaetze — mehr Spannung beim Endspurt.
    // Sound-Tick wird auch hoeher fuer Top-3 (Pitch via webaudio nicht trivial,
    // bleibt erstmal gleich).
    const staggerForRank = (rank: number): number => {
      if (rank === 3) return 1100; // bisschen langsamer
      if (rank === 2) return 1700; // deutlich langsamer
      return 600;                  // normal für rank 4+
    };
    const ANTICIPATION_BEFORE_WINNER = 2400; // Drumroll-Hold vor Platz 1

    // Reveal-Schleife: i=0 zeigt rank N (worst), i=N-2 zeigt rank 2.
    // Cumulative cursor — jeder Reveal addiert seinen eigenen Stagger.
    let cursor = START;
    for (let i = 0; i < N - 1; i++) {
      if (i > 0) {
        // Stagger zum vorigen Reveal: definiert durch den RANG der jetzt enthuellt wird.
        const rankBeingRevealed = N - i;
        cursor += staggerForRank(rankBeingRevealed);
      }
      const fireAt = cursor;
      timers.push(window.setTimeout(() => {
        setRevealedCount(i + 1);
        try { playTick(); } catch {}
      }, fireAt));
    }
    // Sieger zuletzt mit Drumroll-Anticipation.
    cursor += ANTICIPATION_BEFORE_WINNER;
    const winnerAt = cursor;
    timers.push(window.setTimeout(() => {
      setRevealedCount(N);
      setWinnerRevealed(true);
      try { playFanfare(); } catch {}
    }, winnerAt));
    timers.push(window.setTimeout(() => {
      try { playClimaxFinish(); } catch {}
    }, winnerAt + 700));

    return () => timers.forEach(t => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N]);

  return (
    <div style={{
      flex: 1, width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 'clamp(16px, 2cqh, 28px)',
      padding: 'clamp(20px, 2.4cqh, 36px) clamp(28px, 3.5cqw, 56px)',
      position: 'relative', overflow: 'hidden',
    }}>
      {winnerRevealed && <ConfettiOverlay />}

      {/* Hero-Titel */}
      <div style={{
        fontSize: 'clamp(26px, 2.8cqw, 44px)', fontWeight: 900,
        color: 'var(--qq-accent-soft)', letterSpacing: '0.08em', textTransform: 'uppercase',
        animation: 'qqFRTitleIn 0.8s ease-out both',
        textShadow: '0 0 30px rgba(var(--qq-accent-rgb),0.55)',
        flexShrink: 0,
      }}>
        🏆 {de ? 'Endstand' : 'Final Standings'}
      </div>

      {/* Cascade-Tabelle. Reihenfolge im DOM: top = Sieger, bottom = worst.
          Reveal-Order: bottom-first (worst zuerst), winner zuletzt mit
          Anticipation-Hold + Hero-Skalierung. */}
      <div style={{
        flex: 1, width: '100%', maxWidth: 'min(85cqw, 1000px)',
        display: 'flex', flexDirection: 'column',
        gap: 'clamp(8px, 1cqh, 14px)',
        justifyContent: 'center',
        minHeight: 0,
      }}>
        {finalRanking.map((r, idx) => {
          const rank = idx + 1;
          const isWinner = rank === 1;
          // Reveal-Index 0 = worst (last DOM row). Winner-Row hat revealIdx = N-1
          // → wird zuletzt sichtbar wenn revealedCount === N.
          const revealIdx = N - 1 - idx;
          const isVisible = revealedCount > revealIdx;
          const tColor = r.team.color;
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
          const medalColor = rank === 1 ? '#FBBF24' : rank === 2 ? '#E2E8F0' : rank === 3 ? '#F97316' : 'var(--qq-text-muted)';

          return (
            <div key={r.team.id} style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible
                ? (isWinner ? 'translateY(0) scale(1.05)' : 'translateY(0) scale(1)')
                : 'translateY(36px) scale(0.92)',
              transition: 'opacity 0.45s ease, transform 0.7s cubic-bezier(0.34, 1.46, 0.64, 1)',
              transformOrigin: 'center',
              display: 'flex', alignItems: 'center',
              gap: isWinner ? 'clamp(16px, 2cqw, 28px)' : 'clamp(12px, 1.4cqw, 20px)',
              padding: isWinner
                ? 'clamp(16px, 2cqh, 28px) clamp(24px, 2.6cqw, 40px)'
                : 'clamp(10px, 1.2cqh, 18px) clamp(16px, 2cqw, 28px)',
              borderRadius: isWinner ? 24 : 16,
              background: isWinner
                ? `linear-gradient(135deg, ${tColor}40, ${tColor}12)`
                : 'rgba(255,255,255,0.04)',
              border: isWinner
                ? `3px solid ${tColor}`
                : '1.5px solid var(--qq-hairline)',
              boxShadow: isWinner && isVisible
                ? `0 0 60px ${tColor}88, 0 0 120px ${tColor}44, inset 0 0 20px ${tColor}22`
                : 'none',
              position: 'relative',
              minHeight: isWinner ? 'clamp(100px, 12cqh, 160px)' : undefined,
            }}>
              {/* Krone explodiert oberhalb des Sieger-Rows */}
              {isWinner && isVisible && (
                <span style={{
                  position: 'absolute',
                  top: 'clamp(-44px, -3.5cqh, -32px)',
                  left: '50%',
                  transform: 'translateX(-50%) rotate(-10deg)',
                  fontSize: 'clamp(44px, 5cqw, 80px)',
                  filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.7))',
                  animation: 'celebShake 0.9s ease 0.25s both',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}>👑</span>
              )}
              {/* Rang / Medal */}
              <div style={{
                width: isWinner ? 'clamp(56px, 6cqw, 88px)' : 'clamp(40px, 4cqw, 56px)',
                textAlign: 'center',
                fontSize: isWinner ? 'clamp(32px, 3.6cqw, 56px)' : 'clamp(20px, 2.2cqw, 32px)',
                fontWeight: 900,
                color: medalColor,
                lineHeight: 1,
                flexShrink: 0,
              }}>
                {medal ?? `#${rank}`}
              </div>
              <QQTeamAvatar
                avatarId={r.team.avatarId}
                teamEmoji={r.team.emoji}
                size={isWinner ? 'clamp(80px, 9cqw, 140px)' : 'clamp(48px, 5cqw, 76px)'}
              />
              <TeamNameLabel
                name={r.team.name}
                fontSize={isWinner ? 'clamp(28px, 3.2cqw, 52px)' : 'clamp(18px, 1.9cqw, 28px)'}
                color={tColor}
                fontWeight={900}
                maxLines={1}
                shrinkAfter={14}
                style={{
                  flex: 1, minWidth: 0,
                  textShadow: isWinner ? `0 0 18px ${tColor}66` : 'none',
                }}
              />
              <span style={{
                fontSize: isWinner ? 'clamp(38px, 4.2cqw, 68px)' : 'clamp(24px, 2.4cqw, 36px)',
                fontWeight: 900,
                color: isWinner ? 'var(--qq-accent)' : 'var(--qq-card-text)',
                textShadow: isWinner ? '0 0 24px rgba(var(--qq-accent-rgb),0.65)' : 'none',
                fontVariantNumeric: 'tabular-nums',
                minWidth: isWinner ? 90 : 64,
                textAlign: 'right',
                flexShrink: 0,
                lineHeight: 1,
              }}>{r.total}</span>
              <span style={{
                fontSize: isWinner ? 'clamp(15px, 1.5cqw, 22px)' : 'clamp(12px, 1.2cqw, 16px)',
                color: 'var(--qq-text-muted)', opacity: 0.55, fontWeight: 700,
                minWidth: isWinner ? 70 : 50, textAlign: 'left',
                flexShrink: 0,
              }}>
                {de
                  ? (r.total === 1 ? 'Punkt' : 'Punkte')
                  : (r.total === 1 ? 'pt' : 'pts')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RaceFinalSlide [DEPRECATED 2026-05-24] ─────────────────────────────────
// Auto-Rennen-Choreo mit Speed-Lines, fallenden Verlierern, Solo-P1-Drift,
// Podium-Aufbau und Konfetti. Wolf-Entscheidung 2026-05-24: durch
// FinalEurovisionFinale ersetzt (Hero-Standings + Konfetti, kein Race).
// Code bleibt aus zwei Gruenden:
//   1. Spaetere KIs koennen sehen wie die Race aufgebaut war, falls Wolf
//      eine Variante zurueckholen will (z.B. Spezial-Event-Theme).
//   2. RaceTeamUnit / RaceSpeedLines / RaceStarryBackground /
//      RaceCountdownOverlay / PodiumStepFinal sind Hilfs-Components die
//      teils wiederverwendbare Animations-Patterns enthalten.
// AKTUELL NICHT GERENDERT — siehe FinalRevealView phase.kind === 'race-final'.
// Falls re-aktivieren: einfach den Render-Call in FinalRevealView von
// <FinalEurovisionFinale ...> zurueck auf <RaceFinalSlide ...> aendern.
function RaceFinalSlide({ finalRanking, lang }: {
  finalRanking: RankingEntry[]; lang: 'de' | 'en';
}) {
  const N = finalRanking.length;
  const p1 = finalRanking[0];
  const p2 = finalRanking[1];
  const p3 = finalRanking[2];

  const [phase, setPhase] = useState<RacePhase>('countdown');
  const [fallenIds, setFallenIds] = useState<Set<string>>(new Set());
  // 2026-05-10 (Audit-P0): podiumIds entfernt — seit v8 wird setPodiumIds
  // nirgends mehr aufgerufen, der State war toter Code-Pfad. Treppchen-Slots
  // erscheinen jetzt via phase==='podium-rises' alle gleichzeitig.
  // 2026-05-09 v7.2 (Wolf-Bugfix 'rumsortiere + Spoiler durch Drift-Position'):
  // driftedIds tracked welche Teams zu ihrer target-X driften (in v8 nur P1
  // nach P2-fall — aktuell der einzige Drifter).
  const [driftedIds, setDriftedIds] = useState<Set<string>>(new Set());

  // 2026-05-09 v8 (Wolf 'alle fallen bis P1, Treppchen steigt mit allen
  // avataren von unten, dann P1 fällt drauf'):
  // - N..2 fallen gerade gestaffelt (kein Drift, einfach raus aus dem Bild)
  // - P1 schwebt 4s alleine — würdevoller Solo-Moment, Spannung baut sich
  // - P1 driftet zur Mitte (1.5s)
  // - Treppchen steigt aus dem Boden mit ALLEN Avataren P2..PN drauf (2.5s)
  // - P1 Slow-Mo (1.5s) → Snap auf Mitte-Stufe + Crown + Konfetti
  // Total bei N=8 ~31s, bei N=4 ~22s.
  useEffect(() => {
    const handles: number[] = [];
    // 2026-05-10 (Wolf 'Music während Race + austauschbare Sounds'):
    // Music-Loop startet sofort bei Mount (countdown läuft schon, Loop unter
    // den Countdown-Ticks). finaleMusic-Slot ist bestehend customizable via
    // Mod-Panel, fallback auf Lobby-Pool.
    try { startFinaleLoop(); } catch {}

    // 2026-05-10 (Wolf 'Countdown 3-2-1 vor Race'): 3.5s Countdown-Phase
    // (BEREIT 0.8s → 3 0.7s → 2 0.7s → 1 0.8s → GO! 0.5s) + 5s Race-Hold
    // = 8.5s bis erstes Team fällt.
    let cursor = 3500; // Countdown Auto-Choreo läuft
    // 2026-05-13 v2 (Wolf 'racing sound muss nach gewinner entschieden aufhoeren,
    // dann muss ein neuer sound anfangen; sound wenn team zurueckfaellt
    // editierbar in moderator'): Race-Loop ist jetzt echter Loop (startRaceLoop
    // + stopRaceLoop). Team-Falls via playRaceTeamFall (Slot mit playWoodKnock-
    // Fallback). Winner-Sound nach letztem Fall via playRaceWinner (Slot mit
    // playFanfare-Fallback).
    handles.push(window.setTimeout(() => {
      setPhase('race');
      // 2026-05-19 (Wolf 'race musik laeuft weiter wenn treppchen schon da'):
      // GameOverLoop (laeuft seit GAME_OVER-Mount im Hintergrund) muss VOR
      // dem Race-Loop-Start stoppen, sonst kommen 2 Tracks parallel raus.
      try { stopLobbyLoop(); } catch {}
      try { startRaceLoop(); } catch {}
    }, cursor));
    cursor += 5000; // Race-Hold 5s

    // N..2 fallen gestaffelt — gerade runter, KEIN Drift mehr.
    // 2026-05-19 (Wolf 'final zw 1+2 spannender, kopf an kopf laenger'):
    // Wenn nur noch 1 vs 2 uebrig sind (= rank===2 Drop), bekommt der
    // letzte Fall einen extra Spannungs-Beat von 2s ON TOP der normalen 2s
    // (= 4s zwischen vorletztem und letztem Fall). Dazwischen schwebt das
    // 1-vs-2-Paar im Race — Mitfieber-Moment.
    for (let rank = N; rank >= 2; rank--) {
      const teamId = finalRanking[rank - 1]?.team.id;
      if (!teamId) continue;
      if (rank === 2 && N >= 3) {
        // Extra-Wait vor dem letzten Fall (nur wenn ueberhaupt rank>=3 gefallen ist).
        cursor += 2000;
      }
      handles.push(window.setTimeout(() => {
        setFallenIds(prev => { const next = new Set(prev); next.add(teamId); return next; });
        try { playRaceTeamFall(); } catch {}
        if (rank === 2) {
          // Letzter Fall → Gewinner entschieden → Race-Loop hart stoppen.
          // Winner-Sound kommt 4s spaeter im winner-slowmo-Phase (siehe unten).
          try { stopRaceLoop(); } catch {}
          setPhase('p1-solo');
        }
      }, cursor));
      cursor += 2000;
    }

    // 2026-05-19 (Wolf 'P1 braucht sehr lange bis er auf Treppchen landet,
    // dazwischen ist random Stille'): P1-Solo-Hold von 4s → 2s, Post-Drift-
    // Pause von 2s → 0.8s. Gesamt-Wartezeit Race-Ende → Treppchen sinkt von
    // 7.5s auf 4.3s. Spannungs-Moment bleibt, dead-air verkuerzt.
    cursor += 2000;

    // P1 driftet zur Mitte (1.5s, Animations-Dauer unveraendert)
    if (p1) {
      const p1Id = p1.team.id;
      handles.push(window.setTimeout(() => {
        setDriftedIds(prev => { const next = new Set(prev); next.add(p1Id); return next; });
      }, cursor));
      cursor += 1500;
    }

    // P1 schwebt kurz in der Mitte — Anticipation, dann Treppchen.
    cursor += 800;

    // Treppchen steigt von unten mit ALLEN Avataren P2..PN drauf (2.5s).
    // 2026-05-13 (Wolf 'eigener mp3 slot fuer treppchen'): playRacePodium —
    // Custom-Upload bevorzugt, sonst Fallback auf playWinnerCardReveal (= Sound
    // wie bisher).
    handles.push(window.setTimeout(() => {
      setPhase('podium-rises');
      try { playRacePodium(); } catch {}
    }, cursor));
    cursor += 2500;

    // P1 Slow-Mo — Music duckt für Winner-Sound im Vordergrund.
    // 2026-05-13 v2: playFanfare → playRaceWinner (eigener Slot, Fallback auf
    // playFanfare wenn Wolf den Slot leer laesst).
    handles.push(window.setTimeout(() => {
      setPhase('winner-slowmo');
      try { setMusicDucked(true); } catch {}
      try { playRaceWinner(); } catch {}
    }, cursor));
    cursor += 1500;

    // Finish — P1 lands auf Mitte-Stufe + Crown + Konfetti
    // 2026-05-17 P14 (Wolf 'gewinnersound da nur einmal nicht 2x abspielen'):
    // playClimaxFinish hier raus — playRaceWinner oben ist bereits der dedicated
    // Sieger-Sound. Doppel-Layered macht's matschig.
    handles.push(window.setTimeout(() => {
      setPhase('finish');
    }, cursor));

    return () => {
      handles.forEach(h => window.clearTimeout(h));
      // Music-Cleanup bei Unmount/Remount (Replay).
      try { stopLobbyLoop(); } catch {}
      try { stopRaceLoop(); } catch {}
      try { setMusicDucked(false); } catch {}
    };
  // 2026-05-10 (Audit-P0): Deps auf stabile Identifier reduziert. finalRanking
  // ist jetzt useMemo-stabilisiert (FinalRevealView), aber Socket-State-Updates
  // mid-Choreo könnten trotzdem neue Refs liefern wenn s.teams/s.grid sich
  // ändern. p1?.team.id ist primitive → restart nur wenn Sieger wirklich wechselt.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N, p1?.team.id]);

  if (!p1) return null;

  const isFinishing = phase === 'winner-slowmo' || phase === 'finish';
  const isFinish = phase === 'finish';

  // Avatar-Größe: bei N=8 kleiner damit alle reinpassen
  const avatarSize = N <= 4
    ? 'clamp(140px, 14cqw, 200px)'
    : N <= 6
      ? 'clamp(110px, 11cqw, 160px)'
      : 'clamp(80px, 9cqw, 130px)';

  // 2026-05-10 (Audit-P2): Vorher 4 separate Hash-Funktionen mit je eigenem
  // String-Hash (4 Schleifen pro Team pro Render). Jetzt 1 Base-Hash, daraus
  // alle 4 Werte abgeleitet via verschiedene Modulo-Buckets. Per-Team gemoized.
  const teamRaceParams = useMemo(() => {
    const cache: Record<string, {
      yOffset: number;
      bobDelay: number;
      bobDuration: number;
      bobVariant: 'A' | 'B' | 'C' | 'D';
    }> = {};
    const variants = ['A', 'B', 'C', 'D'] as const;
    for (const entry of finalRanking) {
      const id = entry.team.id;
      // Single djb2-style hash, dann verschiedene Bit-Slicings
      let hash = 5381;
      for (let i = 0; i < id.length; i++) hash = ((hash << 5) + hash) + id.charCodeAt(i);
      const h = Math.abs(hash);
      cache[id] = {
        yOffset: (h % 120) - 60,                          // -60..+60px konstanter Y-Versatz
        bobDelay: -((h >>> 8) % 4500) / 1000,             // -4.5..0s (negative → mid-cycle start)
        bobDuration: 3.5 + ((h >>> 16) % 3500) / 1000,    // 3.5..7.0s
        bobVariant: variants[(h >>> 4) % 4],              // A | B | C | D
      };
    }
    return cache;
  }, [finalRanking]);
  const getRaceParams = (id: string) => teamRaceParams[id] ?? {
    yOffset: 0, bobDelay: 0, bobDuration: 5, bobVariant: 'A' as const,
  };

  // 2026-05-09 v7.4 (Wolf 'random shuffle — kein Spoiler durch Position'):
  // Initial-Verteilung NICHT mehr nach Rang (P1 links → PN rechts), sondern
  // random gemischt. Stagger-Fall trifft dadurch random Positionen — Mod
  // sieht nicht mehr „rechts = schlechtester". Bei Replay/Remount neuer
  // Shuffle (useMemo mit []-deps läuft nur bei Mount).
  const shuffledIndices = useMemo(() => {
    const indices = Array.from({ length: N }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N]); // bei N-Wechsel neuer Shuffle, Replay = component-Remount = fresh

  const teamXPositions = useMemo(() => {
    const initial: Record<string, number> = {};
    const target: Record<string, number> = {};

    // 2026-05-10 (Wolf 'Avatare mittig zentriert starten'): Initial-Range
    // dynamisch nach N — bei wenig Teams kompakter um die Mitte gruppiert,
    // bei vielen Teams mehr Slide-Breite genutzt damit Avatare nicht
    // überlappen. Alle „starten an der Race-Linie" zusammen.
    //   N=3:  35-65% (30% Range, kompakte Mitte)
    //   N=5:  25-75% (50% Range)
    //   N=8:  15-85% (70% Range, voller Platz)
    const leftEdge = N <= 3 ? 35 : N <= 5 ? 25 : N <= 6 ? 22 : 15;
    const rightEdge = 100 - leftEdge;
    const range = rightEdge - leftEdge;
    shuffledIndices.forEach((rankIdx, shufflePos) => {
      const entry = finalRanking[rankIdx];
      if (entry) {
        initial[entry.team.id] = N === 1 ? 50 : leftEdge + (range / (N - 1)) * shufflePos;
      }
    });

    // 2026-05-10 (Audit-P1): Target-X nur für P1 — seit v8 driftet KEIN
    // anderes Team mehr horizontal (P2/P3 erscheinen direkt auf Treppchen-
    // Stufe wenn Treppchen rises, P4..PN fallen gerade von initial-X runter).
    // Vorher war target-X für P2..PN berechnet aber nie gelesen (~20 Zeilen
    // toter Aufwand pro Render).
    if (p1) target[p1.team.id] = 50;  // Mitte

    return { initial, target };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalRanking, N, shuffledIndices]);

  return (
    <div style={{
      flex: 1, width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      // BG-Shift bei Finish: goldenes Radial-Pulse
      // 2026-06-24 (Skin): bei Skin flacher Skin-BG; das Finish-Gold bleibt als
      // Akzent-Glow ueber dem Skin-BG erhalten (Sieger-Crescendo).
      background: isThemed()
        ? (isFinish
            ? 'radial-gradient(ellipse at 50% 60%, rgba(251,191,36,0.30) 0%, transparent 60%), var(--qq-bg)'
            : 'var(--qq-bg)')
        : isFinish
        ? 'radial-gradient(ellipse at 50% 60%, rgba(251,191,36,0.30) 0%, rgba(217,119,6,0.18) 35%, rgba(15,8,23,0.95) 80%)'
        : 'radial-gradient(ellipse at 50% 50%, rgba(31,16,46,0.95) 0%, rgba(15,8,23,0.98) 80%)',
      transition: 'background 0.8s ease',
      // 2026-05-10 (Wolf 'BG-Größe ändert sich zwischen P3-fall und P1-solo —
      // soll konstant bleiben'): Camera-Push entfernt. War scale 1.0 → 1.04
      // beim Phase-Wechsel zu p1-solo, transition aber nur auf 'background'
      // gesetzt → harter Sprung. Statt Smooth-Transition ganz raus, weil
      // konsistente Größe wichtiger ist als die Camera-Push-Geste.
    }}>
      {/* 2026-05-10 (Wolf 'Sternenhimmel hinter Race wie GeoGuessr'): Layer
          mit ~80 deterministisch gestreuten Sternen + 2 Shooting-Stars. */}
      <RaceStarryBackground />

      {isFinish && <ConfettiOverlay />}

      {/* 2026-05-11 Design-Audit Top-3-Pack — füllt die tote Top-Zone bei Finish.
          Greift NUR bei isFinish, damit Race-Choreo unverändert bleibt. */}
      {isFinish && p1 && <RaceFinishHero winner={p1.team} lang={lang} />}

      {/* 2026-05-10 (Wolf 'Countdown 3-2-1 vor Race'): Auto-Choreo-Overlay
          während phase==='countdown'. Avatare schweben im Hintergrund, der
          Countdown-Text liegt darüber. Mod kann mitzählen lassen. */}
      {phase === 'countdown' && <RaceCountdownOverlay />}

      {/* Race-Bahn — Avatare absolute positioniert für freie X-Bewegung.
          2026-05-09 v7.1 (Bugfix Wolf 'erste Sekunden leer, Avatare oben'):
          Race-Bahn-Container mit `flex: 1` collapsed zu 0-Höhe weil alle
          children position: absolute sind und keine intrinsische Höhe
          beitragen. Fix: explizite Höhe-Garantie via height: 100% +
          minHeight: 70cqh, damit `top: 50%` der Avatare auf eine definite
          Höhe greift (statt 50% von 0 = 0 = ganz oben). */}
      <div style={{
        flex: 1, position: 'relative', zIndex: 2,
        height: '100%',
        // 2026-05-10 (Wolf 'Treppchen wird unten abgeschnitten bei 100%'):
        // minHeight conditional — nur in Race-Phasen wo Avatare unintendiert
        // bei top:50%=0 landen würden (race-bahn collapsed). Sobald Treppchen
        // erscheint (podium-rises / finish), schrumpft race-bahn auf available
        // space damit Treppchen-Stufen unten voll sichtbar bleiben.
        minHeight: (phase === 'podium-rises' || isFinishing) ? 'auto' : '70cqh',
      }}>
        {finalRanking.map((entry) => {
          const fallen = fallenIds.has(entry.team.id);
          const isWinner = entry.team.id === p1.team.id;
          // Sieger erscheint im Treppchen-Mitte-Slot beim 'finish' → hier null
          if (isWinner && isFinish) return null;

          const inSlowMo = isWinner && phase === 'winner-slowmo';

          // 2026-05-09 v7.2: Drift pro Team beim Fall-Event (nicht bei Mount).
          // Default = initial-X (gleichmäßig verteilt, keine Position verrät Rank).
          // Bei driftedIds.has(id) → drift zu target-X (parallel zum Fall, 1.5s).
          // 2026-05-10 (Audit-P1): Defensive ?? 50 falls Race-Condition bei
          // Live-Team-Beitritt teamXPositions noch nicht populiert hat.
          const xPct = (driftedIds.has(entry.team.id)
            ? teamXPositions.target[entry.team.id]
            : teamXPositions.initial[entry.team.id]) ?? 50;

          return (
            <div key={entry.team.id} style={{
              position: 'absolute',
              left: `${xPct}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              // 1.5s Drift — parallel zum 1.6s Fall, ergibt nahtloser Übergang
              // zur Treppchen-X. Bei P1 (Solo nach P2-Land): elegant zur Mitte.
              transition: 'left 1.5s cubic-bezier(0.4, 0, 0.6, 1)',
              zIndex: fallen ? 1 : 2,
            }}>
              <RaceTeamUnit
                team={entry.team}
                avatarSize={avatarSize}
                {...getRaceParams(entry.team.id)}
                inSlowMo={inSlowMo}
                falling={fallen}
              />
            </div>
          );
        })}
      </div>

      {/* 2026-05-09 v8 (Wolf 'bis zu 8 Treppchen-Stufen, alle Avatare drauf'):
          Treppchen-Block dynamisch nach N. Erscheint ab phase 'podium-rises'
          mit slide-from-bottom Animation. Alle P2..PN sind gleichzeitig
          sichtbar, P1-Slot ist leer bis isFinish (P1 fällt von oben drauf). */}
      {(phase === 'podium-rises' || isFinishing) && (
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          gap: 'clamp(3px, 0.4cqw, 8px)',
          padding: '0 clamp(20px, 3cqw, 60px) clamp(20px, 3cqh, 48px)',
          position: 'relative', zIndex: 3,
          animation: 'qqRacePodiumRise 1.8s cubic-bezier(0.34, 1.4, 0.64, 1) both',
        }}>
          {getOrderedRanks(N).map((rank) => {
            const config = getSlotConfig(rank);
            const team = finalRanking[rank - 1]?.team;

            // Mitte-Slot (P1) — Avatar erscheint nur bei isFinish (snap-from-above)
            if (rank === 1) {
              return (
                <div key="rank-1" style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  flexShrink: 0, gap: 6,
                  position: 'relative',
                  width: config.slotWidth,
                }}>
                  {isFinish && p1 && (
                    <>
                      <span aria-hidden style={{
                        position: 'absolute',
                        left: '50%',
                        top: 'clamp(-160px, -14cqh, -110px)',
                        transform: 'translateX(-50%)',
                        fontSize: 'clamp(56px, 6.5cqw, 100px)', lineHeight: 1,
                        pointerEvents: 'none',
                        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.7)) drop-shadow(0 0 28px rgba(251,191,36,0.85))',
                        animation: 'qqFRCrownDrop 0.6s var(--qq-ease-bounce) 0.2s both, qqFRCrownWobble 1.4s ease-in-out 0.85s infinite',
                        zIndex: 30,
                      }}>👑</span>
                      <div style={{
                        width: config.avatarSize, height: config.avatarSize,
                        borderRadius: '50%',
                        background: p1.team.color,
                        border: `4px solid ${p1.team.color}`,
                        boxShadow: `0 0 50px ${p1.team.color}cc, 0 0 100px rgba(251,191,36,0.45), 0 10px 28px rgba(0,0,0,0.55)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        // 2026-05-10 v2 (Wolf 'fliegt direkt smooth, lässt sich
                        // langsam runter'): 0.85s → 1.1s, ease-out-soft.
                        animation: 'qqRaceWinnerSnap 1.1s cubic-bezier(0.25, 0.46, 0.45, 0.94) both',
                      }}>
                        <QQTeamAvatar avatarId={p1.team.avatarId} teamEmoji={p1.team.emoji}
                          size={config.avatarSize} flat />
                      </div>
                      {/* 2026-05-10 (Wolf Anti-Shaming '2-Zeilen-Wrap statt
                          nowrap-ellipsis'): Sieger-Name nutzt jetzt TeamNameLabel
                          mit maxLines=2 — konsistent mit PodiumStepFinal. */}
                      <TeamNameLabel
                        name={p1.team.name}
                        maxLines={2}
                        shrinkAfter={14}
                        color={p1.team.color}
                        fontWeight={900}
                        fontSize="clamp(18px, 2cqw, 30px)"
                        style={{
                          textShadow: `0 0 20px ${p1.team.color}88`,
                          maxWidth: 'clamp(180px, 18cqw, 320px)',
                          textAlign: 'center',
                          animation: 'qqFRTitleIn 0.5s ease 0.4s both',
                        }}
                      />
                    </>
                  )}
                  {/* Höchste Stufe — gold */}
                  <div style={{
                    width: config.slotWidth, height: config.podiumHeight,
                    background: 'linear-gradient(180deg, rgba(251,191,36,0.55), rgba(217,119,6,0.40))',
                    border: '2.5px solid rgba(251,191,36,0.85)',
                    borderTop: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: config.rankFontSize, fontWeight: 900,
                    color: '#0A0814',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30), 0 -8px 32px rgba(251,191,36,0.55)',
                  }}>1</div>
                </div>
              );
            }

            // Sonstige Slots (P2..PN) — Avatar + Name + Stufe immer sichtbar
            // sobald Treppchen rises (alle gleichzeitig).
            if (!team) return <div key={`rank-${rank}`} style={{ width: config.slotWidth }} />;
            return (
              <PodiumStepFinal
                key={`rank-${rank}`}
                entry={team}
                rank={rank}
                podiumHeight={config.podiumHeight}
                avatarSize={config.avatarSize}
                slotWidth={config.slotWidth}
                fontSize={config.fontSize}
                rankFontSize={config.rankFontSize}
              />
            );
          })}
        </div>
      )}

      {/* Wolf-Decoration unten rechts beim Finish.
          2026-05-09 v8.1 (Wolf 'spiegeln, nur Tröte, Augen auf+zu, TRÖÖT'):
          mirror=true → Wolf schaut nach links zur Mitte (zum Sieger).
          mode='troete' → konstante Tröte-Pose mit periodischem Blink.
          TRÖÖT!-Text links neben dem Wolf, periodisch animiert.
          2026-05-11 (Wolf-Bug 'Wolf steht bei 8 Teams in den Treppchen'):
          N-abhängige Größe + Position. Bei breitem Treppchen (N>=6) nimmt
          das Podium fast die volle Breite — Wolf wird kleiner + bündig in
          die Ecke geschoben, damit er auf keinen Slot rüberlappt. Bei
          N≤4 (Podium kompakt links/mitte/rechts) bleibt der Wolf größer
          und mit Innen-Padding (wie vorher). */}
      {isFinish && (() => {
        const N = finalRanking.length;
        const compactWolf = N >= 6;
        // 2026-05-13 (Wolf 'Wolf im Weg, mach ihn nach rechts oben'):
        // bottom → top. Wolf sitzt jetzt oben rechts neben dem "Panel"-
        // Toggle-Button und blockiert das Podium nicht mehr.
        return (
          <div style={{
            position: 'absolute',
            right: compactWolf ? 0 : 'clamp(20px, 3cqw, 60px)',
            top: compactWolf ? 'clamp(60px, 7cqh, 100px)' : 'clamp(70px, 8cqh, 120px)',
            zIndex: 4, pointerEvents: 'none',
            animation: 'qqFRTitleIn 0.7s ease 0.6s both',
          }}>
            <div style={{ position: 'relative' }}>
              <AnimatedCozyWolf
                widthCss={compactWolf ? 'clamp(70px, 7cqw, 110px)' : 'clamp(100px, 11cqw, 170px)'}
                mode="troete"
                mirror={true}
              />
              {/* TRÖÖT! Sprachtext — keine Bubble, einfach Wort als Floating-Element */}
              <div style={{
                position: 'absolute',
                top: '8%',
                left: '-28%',
                fontSize: compactWolf ? 'clamp(14px, 1.6cqw, 26px)' : 'clamp(20px, 2.6cqw, 44px)',
                fontWeight: 900,
                color: QQ_COLORS.amber400,
                textShadow: '0 0 14px rgba(251,191,36,0.85), 0 4px 10px rgba(0,0,0,0.7), 0 0 2px #0A0814',
                letterSpacing: '0.04em',
                fontFamily: 'var(--font-game, system-ui)',
                animation: 'qqWolfTroeet 2.8s ease-in-out infinite',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}>TRÖÖT!</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Race-Team-Unit: Avatar oben + Speed-Lines IM Flow direkt drunter.
//
// 2026-05-09 v7 (Wolf 'Raketen finden ihren Platz'): Drift-Wrapper für
// horizontale X-Bewegung wird VON RaceFinalSlide gerendert (absolute pos
// + CSS transition). RaceTeamUnit ist 2-Layer: outer = yOffset (per-Team
// vertikaler Versatz, nutzt die ganze Slide-Höhe), inner = bob/fall-anim.
// Beide getrennt damit yOffset nicht von der Animation überschrieben wird.
function RaceTeamUnit({ team, avatarSize, yOffset, bobDelay, bobVariant, bobDuration, inSlowMo, falling }: {
  team: QQTeam;
  avatarSize: string;
  yOffset: number;
  bobDelay: number;
  bobVariant: 'A' | 'B' | 'C' | 'D';
  bobDuration: number;
  inSlowMo: boolean;
  falling: boolean;
}) {
  const bobAnim = `qqRaceRocket${bobVariant} ${bobDuration}s ease-in-out ${bobDelay}s infinite`;
  return (
    <div style={{
      // yOffset-Wrapper: konstanter vertikaler Versatz pro Team (-60..+60px)
      // damit nicht alle auf gleicher Y-Höhe schweben.
      transform: `translateY(${yOffset}px)`,
      transition: 'transform 0.4s ease',
      pointerEvents: falling ? 'none' : 'auto',
    }}>
    <div style={{
      // Bob/Fall-Wrapper: organisches Wackeln oder Fall-Anim
      position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 4,
      animation: falling
        ? 'qqRaceRocketFall 1.6s cubic-bezier(0.4, 0, 0.7, 1) both'
        : inSlowMo
          ? 'qqRaceWinnerSlowMo 1.5s cubic-bezier(0.2, 0.85, 0.3, 1) both'
          : bobAnim,
      flexShrink: 0,
    }}>
      {/* Avatar — TOP des Stacks */}
      <div style={{
        width: avatarSize, height: avatarSize, borderRadius: '50%',
        background: team.color,
        border: `4px solid ${team.color}`,
        boxShadow: `0 0 30px ${team.color}99, 0 6px 18px rgba(0,0,0,0.5)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 2,
        transform: inSlowMo ? 'scale(1.4)' : 'scale(1)',
        transition: 'transform 0.6s cubic-bezier(0.2, 0.85, 0.3, 1)',
      }}>
        <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji}
          size={avatarSize} flat />
      </div>
      {/* Speed-Lines — direkt unter Avatar im Flow (nicht absolute!) */}
      <RaceSpeedLines color={team.color} />
      {/* Team-Name dezent ganz unten */}
      <div style={{
        fontSize: 'clamp(13px, 1.2cqw, 18px)', fontWeight: 900,
        color: team.color,
        textShadow: `0 0 12px ${team.color}66`,
        maxWidth: 'clamp(100px, 14cqw, 200px)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textAlign: 'center',
        marginTop: 4,
      }}>{team.name}</div>
    </div>
    </div>
  );
}

// Speed-Lines: 7 vertikale Striche in Teamfarbe direkt unter Avatar. Im Flow
// (nicht absolute) damit Layout in der Race-Bahn stabil ist. Variable
// Höhen + Delays für Cartoon-Sonic-Look. Schnellere Anim (0.4s statt 0.6s).
function RaceSpeedLines({ color }: { color: string }) {
  // 7 Striche — etwas mehr als vorher für dichteren Look
  const lines = [
    { lengthVw: 1.0, delay: 0.00, widthPx: 4 },
    { lengthVw: 1.6, delay: 0.18, widthPx: 5 },
    { lengthVw: 0.8, delay: 0.32, widthPx: 4 },
    { lengthVw: 1.9, delay: 0.08, widthPx: 5 },
    { lengthVw: 1.2, delay: 0.24, widthPx: 4 },
    { lengthVw: 1.7, delay: 0.04, widthPx: 5 },
    { lengthVw: 0.9, delay: 0.28, widthPx: 4 },
  ];
  // Container-Höhe: matched zur längsten Linie (clamp damit auf TV proportional bleibt)
  const containerHeight = 'clamp(60px, 7cqh, 110px)';
  return (
    <div aria-hidden style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      gap: 'clamp(3px, 0.4cqw, 7px)',
      height: containerHeight,
      pointerEvents: 'none',
    }}>
      {lines.map((l, i) => (
        <span key={i} style={{
          width: l.widthPx,
          height: `clamp(${l.lengthVw * 30}px, ${l.lengthVw * 4}vh, ${l.lengthVw * 60}px)`,
          background: `linear-gradient(180deg, ${color}ee 0%, ${color}99 50%, ${color}33 90%, transparent 100%)`,
          borderRadius: 3,
          animation: `qqRaceTrail 0.4s ease-in-out ${l.delay}s infinite`,
          transformOrigin: 'top center',
        }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2026-05-10 (Audit-P2 Cleanup): Legacy v4-Crescendo-Komponenten gelöscht
// (PodiumStageSlide, PodiumFillSlide, WinnerDropSlide, RankingSlide,
// PodiumStep — ~620 Zeilen). Wurden seit v5 Race-Refactor nicht mehr von
// FinalRevealView referenziert.
// ═══════════════════════════════════════════════════════════════════════════════

// 2026-05-10 (Wolf 'Sternenhimmel hinter Race wie GeoGuessr'):
// Geoguessr-Pattern — viele kleine weiße Sterne (1-3px) auf dunklem BG mit
// async Twinkle-Cycle (opacity 0.2 → 1 → 0.2, 2-5s pro Stern). Plus 2-3
// Shooting-Stars die alle 8-15s diagonal durchs Bild fliegen.
// Performance: 80 Sterne deterministisch generiert (kein Math.random pro
// Render → kein flicker), useMemo cached über Lifetime der Component.
function RaceStarryBackground() {
  const stars = useMemo(() => {
    // Deterministischer pseudo-random Hash für stable star positions.
    // Math.random nur bei Mount, useMemo[] cached.
    return Array.from({ length: 80 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 1.8,
      twinkleDelay: Math.random() * 4,
      twinkleDuration: 2 + Math.random() * 3,
      // 3 Helligkeitsstufen — nicht alle Sterne sind gleich hell
      maxOpacity: 0.5 + Math.random() * 0.5,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shootingStars = useMemo(() => [
    { startX: 10, startY: 15, delay: 4 },
    { startX: 60, startY: 25, delay: 11 },
    { startX: 30, startY: 8, delay: 18 },
  ], []);
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none', zIndex: 0,
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes raceStarTwinkle {
          0%, 100% { opacity: var(--max-op, 0.6); }
          50%      { opacity: 0.15; }
        }
        @keyframes raceShootingStar {
          0%   { transform: translate(0, 0) scale(0.6); opacity: 0; }
          5%   { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translate(120cqw, 60cqh) scale(1.2); opacity: 0; }
        }
      `}</style>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size,
          borderRadius: '50%',
          background: '#fff',
          ['--max-op' as string]: s.maxOpacity,
          opacity: s.maxOpacity,
          boxShadow: s.size > 2 ? `0 0 ${s.size * 2}px rgba(255,255,255,0.6)` : undefined,
          animation: `raceStarTwinkle ${s.twinkleDuration}s ease-in-out ${s.twinkleDelay}s infinite`,
        }} />
      ))}
      {shootingStars.map((ss, i) => (
        <div key={`shoot-${i}`} aria-hidden style={{
          position: 'absolute',
          left: `${ss.startX}%`, top: `${ss.startY}%`,
          width: 2, height: 2,
          background: '#fff',
          borderRadius: '50%',
          boxShadow: '0 0 4px #fff, -20px -10px 30px rgba(255,255,255,0.4)',
          animation: `raceShootingStar 2s ease-out ${ss.delay}s infinite`,
          opacity: 0,
        }} />
      ))}
    </div>
  );
}

// 2026-05-10 (Wolf 'Countdown 3-2-1 vor Race'): Auto-Choreo-Overlay.
// Steps: BEREIT? (0.8s) → 3 (0.7s) → 2 (0.7s) → 1 (0.8s) → GO! (0.5s).
// Total 3.5s — synchron zum cursor-Sprung in RaceFinalSlide useEffect.
// Wolf moderiert „Bereit, drei, zwei, eins, los!" mit.
function RaceCountdownOverlay() {
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);

  useEffect(() => {
    const handles: number[] = [];
    // 2026-05-13 (Wolf 'eigene mp3 slots fuer race phase'): Wenn der
    // raceCountdown-Slot ein Custom-Upload hat, spielt der einmal am Start
    // alleine — die einzelnen Tick-Cues bleiben weg, damit Wolfs MP3 nicht
    // mit den Synth-Ticks ueberlagert. Bei leerem Slot: bisheriges Tick-
    // Tick-Tick-GO-Verhalten (Fallback fuer alle bestehenden Quizze).
    let usedCustom = false;
    try { usedCustom = playRaceCountdown(); } catch {}
    if (usedCustom) {
      handles.push(window.setTimeout(() => setStep(1), 800));   // → 3
      handles.push(window.setTimeout(() => setStep(2), 1500));  // → 2
      handles.push(window.setTimeout(() => setStep(3), 2200));  // → 1
      handles.push(window.setTimeout(() => setStep(4), 3000));  // → GO!
    } else {
      // 2026-05-10 (Wolf 'mehr sounds für race'): Tick pro Countdown-Step
      // (3-2-1 = playTick, GO = playFanfare-light via playWinnerCardReveal).
      handles.push(window.setTimeout(() => { setStep(1); try { playTick(); } catch {} }, 800));   // → 3
      handles.push(window.setTimeout(() => { setStep(2); try { playTick(); } catch {} }, 1500));  // → 2
      handles.push(window.setTimeout(() => { setStep(3); try { playTick(); } catch {} }, 2200));  // → 1
      handles.push(window.setTimeout(() => { setStep(4); try { playWinnerCardReveal(); } catch {} }, 3000));  // → GO!
    }
    return () => handles.forEach(h => window.clearTimeout(h));
  }, []);

  const labels: { text: string; color: string; size: string; glow: string }[] = [
    { text: 'BEREIT?', color: QQ_COLORS.amber400, size: 'clamp(50px, 6cqw, 110px)', glow: 'rgba(251,191,36,0.7)' },
    { text: '3',       color: QQ_COLORS.amber400, size: 'clamp(140px, 18cqw, 320px)', glow: 'rgba(251,191,36,0.85)' },
    { text: '2',       color: QQ_COLORS.amber500, size: 'clamp(140px, 18cqw, 320px)', glow: 'rgba(245,158,11,0.85)' },
    { text: '1',       color: QQ_COLORS.red500, size: 'clamp(140px, 18cqw, 320px)', glow: 'rgba(239,68,68,0.85)' },
    { text: 'GO!',     color: QQ_COLORS.green500, size: 'clamp(160px, 20cqw, 360px)', glow: 'rgba(34,197,94,0.95)' },
  ];
  const current = labels[step];

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10,
      pointerEvents: 'none',
    }}>
      {/* 2026-05-11 (Wolf-Bug 'BEREIT 3-2-1 GO verschwimmt mit Hintergrund'):
          dunkler radial-Backdrop hinter dem Text damit er klar gegen den
          Sternenhimmel/Avatar-Layer absticht. Plus opaker Pill-Background um
          den Text selbst — keine Lesbarkeits-Konkurrenz mehr mit BG-Stars. */}
      <div aria-hidden style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(900px, 80cqw)', height: 'min(600px, 60cqh)',
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 35%, transparent 70%)`,
        filter: 'blur(8px)',
        animation: 'qqRaceCountdownPop 0.5s ease both',
      }} />
      <div key={step} style={{
        position: 'relative',
        padding: 'clamp(18px, 2.2cqh, 36px) clamp(36px, 4cqw, 80px)',
        borderRadius: 'clamp(28px, 3cqw, 52px)',
        background: 'rgba(10, 8, 20, 0.78)',
        border: `3px solid ${current.color}`,
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        boxShadow: `0 0 40px ${current.glow}, 0 0 96px ${current.glow}, 0 16px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)`,
        fontSize: current.size,
        fontWeight: 900,
        color: current.color,
        textShadow: `0 0 24px ${current.glow}, 0 3px 8px rgba(0,0,0,0.9)`,
        letterSpacing: '-0.02em',
        animation: 'qqRaceCountdownPop 0.7s var(--qq-ease-bounce) both',
        fontFamily: 'var(--font-game, system-ui)',
        lineHeight: 1,
      }}>{current.text}</div>
    </div>
  );
}

// 2026-05-09 v8 (Wolf '8 Treppchen-Stufen'): Erweitert für alle Ränge 2..N.
// Stufen-Farbe nach Rang:
//   2 = silber, 3 = bronze, 4+ = dunkelgrau (neutral, nicht-medaillert).
// slotWidth + fontSize + rankFontSize kommen aus getSlotConfig — bei rank>=4
// alles kompakter (kleiner Avatar, niedrige Stufe, kleine Rank-Zahl).
function PodiumStepFinal({ entry, rank, podiumHeight, avatarSize, slotWidth, fontSize, rankFontSize }: {
  entry: QQTeam; rank: number;
  podiumHeight: number | string;
  avatarSize: string;
  slotWidth?: string;
  fontSize?: string;
  rankFontSize?: string;
}) {
  const podiumColor = rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : 'var(--qq-text-muted)';
  const isMinor = rank >= 4;
  const effectiveSlotWidth = slotWidth ?? 'clamp(120px, 12cqw, 170px)';
  const effectiveFontSize = fontSize ?? 'clamp(13px, 1.3cqw, 19px)';
  const effectiveRankFontSize = rankFontSize ?? 'clamp(22px, 2.4cqw, 38px)';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      flexShrink: 0, gap: isMinor ? 3 : 6,
      width: effectiveSlotWidth,
    }}>
      <div style={{
        width: avatarSize, height: avatarSize, borderRadius: '50%',
        background: entry.color,
        border: isMinor ? `2.5px solid ${entry.color}` : `4px solid ${entry.color}`,
        boxShadow: isMinor
          ? `0 0 12px ${entry.color}66, 0 3px 10px rgba(0,0,0,0.4)`
          : `0 0 24px ${entry.color}88, 0 6px 16px rgba(0,0,0,0.5)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <QQTeamAvatar avatarId={entry.avatarId} teamEmoji={entry.emoji}
          size={avatarSize} flat />
      </div>
      {/* 2026-05-10 (Wolf 'PodiumStep nowrap → 2-Zeilen-Wrap für alle' Anti-Shaming):
          TeamNameLabel mit maxLines=2 statt nowrap+ellipsis. Lange Team-Namen
          („Wolfsrudel Nord") werden jetzt umgebrochen statt abgeschnitten,
          konsistent mit Sieger-Slot. */}
      <TeamNameLabel
        name={entry.name}
        maxLines={2}
        shrinkAfter={14}
        color={entry.color}
        fontWeight={900}
        fontSize={effectiveFontSize}
        style={{
          textAlign: 'center',
          maxWidth: effectiveSlotWidth,
        }}
      />
      <div style={{
        width: effectiveSlotWidth, height: podiumHeight,
        background: `linear-gradient(180deg, ${podiumColor}aa, ${podiumColor}55)`,
        border: `2px solid ${podiumColor}`,
        borderBottom: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: effectiveRankFontSize, fontWeight: 900,
        color: isMinor ? 'var(--qq-card-text)' : '#0A0814',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), 0 -4px 16px ${podiumColor}55`,
      }}>{rank}</div>
    </div>
  );
}
