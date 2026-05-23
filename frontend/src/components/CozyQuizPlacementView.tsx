/**
 * CozyQuizPlacementView — Phase nach Frage-Reveal: Team setzt sein Feld.
 *
 * Zeigt das Grid (CozyQuizGridDisplay) zentral, ScoreBar rechts, Active-Team
 * Header oben. Behandelt Cell-Flash (just-placed/stolen highlight). Optional
 * 3D-Modus (QQ3DGrid) wenn enable3DTransition gesetzt.
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-12 (Refactor Phase 3).
 * 2 externe Importer (QQBuiltinSlide, BeamerView via Phase-Router).
 */
import { useState, useEffect, useRef } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { useLangFlip } from '../cozyQuizShared';
import { GridDisplay } from './CozyQuizGridDisplay';
import { ScoreBar } from './CozyQuizScoreBar';
import { Fireflies, EurovisionHearts } from './CozyQuizAmbient';
import { QQ3DGrid } from './QQ3DGrid';

export function PlacementView({ state: s, flashCell, use3D = false, enable3DTransition = false }: {
  state: QQStateUpdate;
  flashCell?: { row: number; col: number; teamId: string; wasSteal?: boolean } | null;
  use3D?: boolean;
  enable3DTransition?: boolean;
}) {
  const lang = useLangFlip(s.language);

  // Sticky Placer: Nachdem ein Team gesetzt hat, bleibt der Highlight noch
  // ~1.2s auf diesem Team (sonst springt die Markierung schon zum naechsten
  // Team, waehrend die Zell-Fuell-Animation des vorherigen Teams noch laeuft).
  const [stickyPlacer, setStickyPlacer] = useState<string | null>(null);
  const prevPlacedKey = useRef<string | null>(null);
  useEffect(() => {
    const lp = s.lastPlacedCell;
    const key = lp ? `${lp.row}-${lp.col}-${lp.teamId}` : null;
    if (!key) return;
    if (key === prevPlacedKey.current) return;
    prevPlacedKey.current = key;
    setStickyPlacer(lp!.teamId);
    const t = setTimeout(() => setStickyPlacer(cur => (cur === lp!.teamId ? null : cur)), 1200);
    return () => clearTimeout(t);
  }, [s.lastPlacedCell?.row, s.lastPlacedCell?.col, s.lastPlacedCell?.teamId]);

  // Aufloesungsreihenfolge: Flash > Sticky Placer > pendingFor.
  // Comeback-Steal-Pause: pendingFor ist null, also Fallback auf comebackTeamId,
  // damit das aktive Team in der ScoreBar markiert bleibt waehrend wir auf
  // Moderator-Space warten.
  const isComebackStealActive =
    !!s.comebackHL && s.comebackHL.phase === 'steal' && !!s.comebackTeamId;
  const activeTeamId = flashCell?.teamId
    ?? stickyPlacer
    ?? s.pendingFor
    ?? (isComebackStealActive ? s.comebackTeamId : null);
  const team = s.teams.find(tm => tm.id === activeTeamId);
  const teamColor = team?.color ?? '#94a3b8';

  // 2026-04-30 v3 (User-Klaerung): playPlacementTurn entfernt — User meinte
  // mit 'platzieren page' die Action-Cards (PHASE_INTRO), nicht das Grid.
  // Per-Turn-Sound ueberlappte playFieldPlaced (Stamp) → Stamp wirkte weg.

  // ── 3D transition state machine ──
  // 'flat' = show 2D grid
  // 'transitioning' = 2D→3D camera animation in progress
  // '3d' = fully in 3D mode
  const [viewMode, setViewMode] = useState<'flat' | 'transitioning' | '3d'>(() => {
    // If use3D (instant toggle) is on, start in 3D directly
    if (use3D) return '3d';
    return 'flat';
  });
  const hasTransitioned = useRef(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When the beamer instant toggle changes, update immediately
  useEffect(() => {
    if (use3D) {
      setViewMode('3d');
      hasTransitioned.current = true;
    } else {
      setViewMode('flat');
      hasTransitioned.current = false;
    }
  }, [use3D]);

  // Track lastPlacedCell changes — only trigger on NEW placements, not stale values from mount
  const cellTrigger = flashCell || s.lastPlacedCell;
  const cellKey = cellTrigger ? `${cellTrigger.row}-${cellTrigger.col}-${cellTrigger.teamId}` : null;
  const prevCellKey = useRef<string | null>(cellKey); // capture initial value to skip on mount

  useEffect(() => {
    // Skip if nothing changed (including initial mount with stale lastPlacedCell)
    if (cellKey === prevCellKey.current) return;
    prevCellKey.current = cellKey;

    if (!enable3DTransition || use3D || hasTransitioned.current || !cellTrigger) return;
    // First cell placed this round → start 2D→3D transition
    hasTransitioned.current = true;
    setViewMode('transitioning');
    // After transition animation completes (~1.2s), switch to full 3D
    transitionTimer.current = setTimeout(() => {
      setViewMode('3d');
    }, 1200);
    return () => { if (transitionTimer.current) clearTimeout(transitionTimer.current); };
  }, [cellKey, enable3DTransition, use3D]);

  // Reset transition state when entering a fresh placement round (questionIndex changes)
  const prevQIdx = useRef(s.questionIndex);
  useEffect(() => {
    if (prevQIdx.current !== s.questionIndex) {
      prevQIdx.current = s.questionIndex;
      hasTransitioned.current = false;
      if (!use3D) setViewMode('flat');
    }
  }, [s.questionIndex, use3D]);

  const show3D = viewMode === '3d' || viewMode === 'transitioning';
  // 2-spaltiges Layout: Grid links darf nicht zu groß werden, sonst bleibt rechts
  // kein Platz für die Team-Liste bei 8 Teams.
  // 2026-05-05 (Wolf 'grid und tabelle koennten groesser sein, viel rand'):
  // Cap 720→1100, vh 0.72→0.86, vw 0.48→0.55 — Beamer-Whitespace minimiert.
  const gridMaxSize = typeof window !== 'undefined'
    ? Math.min(1100, window.innerHeight * 0.86, window.innerWidth * 0.55)
    : 800;

  // Manual flyover hotkey (F): trigger a cinematic orbit over the grid
  const [flyoverSignal, setFlyoverSignal] = useState(0);
  useEffect(() => {
    if (viewMode !== '3d') return;
    const onKey = (e: KeyboardEvent) => {
      // 2026-05-05 (Live-Mod-Audit #7): nur wenn Beamer-Tab fokussiert.
      if (document.hidden || !document.hasFocus()) return;
      if (e.key === 'f' || e.key === 'F') {
        // Avoid triggering if user is typing in an input
        const tgt = e.target as HTMLElement | null;
        if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
        setFlyoverSignal(v => v + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewMode]);

  // G2 Entry-Sweep beim Mount einer neuen Question-Placement-Phase.
  // Ein heller Streifen laeuft einmalig von links nach rechts uebers Grid.
  // Key bindet an questionIndex, damit React beim Phase-Re-Mount die
  // Animation neu triggert.
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 0, padding: 'var(--qq-safe-margin)', boxSizing: 'border-box' }}>
      <Fireflies color={`${teamColor}88`} />
      {s.theme?.eurovisionMode && <EurovisionHearts />}

      {/* G2 Placement-Sweep — weicher Licht-Streak nach Phase-Entry. */}
      <div key={`sweep-${s.questionIndex}`} aria-hidden style={{
        position: 'absolute', top: 12, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', zIndex: 4, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          width: '40%',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 45%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.18) 55%, transparent 100%)',
          animation: 'placementSweep 1.1s var(--qq-ease-smooth) 0.15s both',
        }} />
      </div>

      {/* Top banner — schrumpft auf 0 wenn Team aktiv. Das aktive Team wird
          stattdessen rechts in der ScoreBar prominent markiert (inkl. Aktions-Pill).
          Feste 12px Abstand bleibt damit das Grid nicht an den Viewport-Rand rutscht. */}
      <div style={{
        height: 12, flexShrink: 0,
        position: 'relative', zIndex: 5,
      }} />

      {/* Center: 2-spaltig — Grid links, ScoreBar rechts (Platz für 8 Teams ohne Scroll).
          Beide Spalten bekommen height = gridMaxSize (fix quadratisches Grid) damit
          die Team-Liste exakt so hoch ist wie das Grid — nicht länger.
          2026-05-05 (Wolf): padding + gap reduziert um Whitespace zu minimieren. */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: '6px 16px', position: 'relative', zIndex: 5, gap: 20,
        minHeight: 0,
      }}>
        <div style={{
          width: gridMaxSize, height: gridMaxSize,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {show3D ? (
            <QQ3DGrid
              state={s}
              maxSize={gridMaxSize}
              animateCell={cellTrigger ? { row: cellTrigger.row, col: cellTrigger.col, teamId: cellTrigger.teamId, wasSteal: cellTrigger.wasSteal } : null}
              interactive={viewMode === '3d'}
              entering={viewMode === 'transitioning'}
              flyoverSignal={flyoverSignal}
            />
          ) : (
            <GridDisplay state={s} maxSize={gridMaxSize} highlightTeam={activeTeamId} showJoker={s.phase !== 'CONNECTIONS_4X4'} flashCellKey={flashCell ? `${flashCell.row}-${flashCell.col}` : null} />
          )}
        </div>
        <div style={{
          // Fixe Breite statt flex:1 + maxWidth — sonst verschiebt sich der Grid-
          // Container, sobald ein Team-Name die intrinsische Spaltenbreite ändert.
          // Höhe = gridMaxSize sorgt dafür dass die Liste exakt Grid-Höhe hat.
          // 2026-05-05 (Wolf): Breite 540→620 damit Liste mehr Atemraum hat.
          width: 620, height: gridMaxSize, flexShrink: 0,
          display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start',
        }}>
          {/* 2026-05-05 (Wolf): activeActionLabel/Desc NICHT mehr gesetzt —
              das Action-Verb ('Setzen/Klauen/Stapeln') war aus 8m Beamer-
              Distanz unlesbar. Der Active-Team-Glow + Border in der ScoreBar
              sagt schon „dieses Team ist dran"; das exakte Verb sieht das
              Team auf seinem /team-Phone. */}
          <ScoreBar
            teams={s.teams}
            activeTeamId={activeTeamId}
            teamPhaseStats={s.teamPhaseStats}
            correctTeamId={s.correctTeamId}
            eurovisionMode={!!s.theme?.eurovisionMode}
            lang={lang}
          />
        </div>
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SlotMachineNumber — Slot-Machine-Roll-Animation für H/L-Reveal.
// Pro Digit rollt ein Roller mit Random-Ziffern (~70ms/frame). Stoppt
// staggered von links nach rechts auf der Zielziffer mit kurzem Bounce-Pulse.
// Trennzeichen (.,/) bleiben statisch. Total ~1.4-1.8s je nach Stellenzahl.
