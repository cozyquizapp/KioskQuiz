/**
 * CozyQuizGridDisplay — Hauptbrett-Rendering fuer Beamer.
 *
 * Zeigt das Quiz-Brett (NxN Cells), Team-Owner pro Cell, Stapel-Avatare,
 * Joker-Cells, Frost/Sand/Shield-Effekte, Click-Flash. Reagiert auf alle
 * Grid-State-Aenderungen mit Animationen:
 * - Neue Cell platziert → cellInkFill + Shockwave + Sparkle
 * - Cell geklaut → Steal-Shards + Shockwave + Neighbor-Duck
 * - Joker geformt → 2.2s Goldglow-Pulse
 * - Idle-Pulse auf zufaelligen leeren Cells (alive-feel)
 *
 * Smart-Geometry:
 * - Border-Fusion zwischen gleichfarbigen Nachbarn (Territorium-Look)
 * - Bridge-Fills im Grid-Gap zu gleichfarbigen Nachbarn
 * - Stapel-Avatare diagonal/dreieck-positioniert (cellSize-relativ in PIXELN)
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-12 (Refactor Phase 2).
 * 4+ interne Caller (PlacementView, RaceTeamUnit, GameOverView, PausedView).
 *
 * Keyframes (boardShake, gridActiveTeamGlow, gridIdle, jokerCellPulse,
 * cellNeighborDuck, cellInkFill, cellShockwave, cellSparkle, cellShard,
 * cellEmojiDrop, frostPulse, frostShimmer, frostCrystal, shieldGlow,
 * sanduhrDrop, sanduhrTick, stapelDustRing, cellIdlePulse, phasePop):
 * alle global in BEAMER_CSS / qqShared.
 */
import { useState, useEffect, useRef } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { JokerIcon } from './JokerIcon';
import { QQIcon } from './QQIcon';
import { QQTeamAvatar } from './QQTeamAvatar';

export function GridDisplay({ state: s, maxSize = 320, highlightTeam, showJoker = true, flashCellKey }: {
  state: QQStateUpdate; maxSize?: number; highlightTeam?: string | null; showJoker?: boolean; flashCellKey?: string | null;
}) {
  // (lang variable removed — was unused dead code in original)
  const gap = 4;
  const cellSize = Math.floor((maxSize - (s.gridSize - 1) * gap) / s.gridSize);
  // 2026-05-05 (Wolf-Wahl 3B): Smart-Color-Assignment fuer Brett-Cells.
  // boardColors[teamId] mappt jeden Team-ID auf einen Slot der QQ_BOARD_PALETTE
  // (8 maximal kontrastierende Farben). Avatar-/Standings-Anzeige nutzt
  // weiterhin team.color (Brand bleibt konsistent), nur das BRETT erhaelt
  // die zugewiesene Palette-Farbe damit nahe Avatar-Farben (z.B. yellow vs
  // amber) sich auf Cells nicht mehr aehnlich anfuehlen.
  // Wolf 2026-05-05 (Klaerung): team.color (= Avatar-Slot-Farbe) wird ueberall
  // genutzt, auch auf Cells. Keine separate Brett-Palette mehr.
  const bc = (teamId: string): string => s.teams.find(t => t.id === teamId)?.color ?? '#94a3b8';
  const activeTeam = s.teams.find(t => t.id === highlightTeam);
  const activeColor = activeTeam ? bc(activeTeam.id) : '#fff';

  // Track newly placed cells for pop animation (#5) + stolen cells + neighbor reactions + board shake
  const gridKey = s.grid.flatMap(row => row.map(c => `${c.ownerId ?? ''}`)).join(',');
  // Joker-formation-Diff: trackt cells die GERADE jokerFormed=true geworden sind,
  // damit sie kurz pulsieren (User-Wunsch 2026-04-28: Joker sichtbarer machen).
  const jokerKey = s.grid.flatMap(row => row.map(c => c.jokerFormed ? '1' : '0')).join('');
  const prevJokerKeyRef = useRef<string>(jokerKey);
  const justFormedJokerRef = useRef<Set<string>>(new Set());
  if (jokerKey !== prevJokerKeyRef.current) {
    const fresh = new Set<string>();
    s.grid.forEach((row, r) => row.forEach((cell, c) => {
      const idx = r * s.gridSize + c;
      const prevWas1 = prevJokerKeyRef.current[idx] === '1';
      if (cell.jokerFormed && !prevWas1) fresh.add(`${r}-${c}`);
    }));
    if (fresh.size > 0) {
      justFormedJokerRef.current = fresh;
      setTimeout(() => { justFormedJokerRef.current = new Set(); }, 2200);
    }
    prevJokerKeyRef.current = jokerKey;
  }
  // Initial-Snapshot = aktueller Stand, damit beim Mount KEIN Diff feuert
  // (sonst wuerde Zelle (0,0) als „neu" erkannt, weil ''.split(',') nur ein Element ergibt).
  const prevGridRef = useRef<string>(gridKey);
  const newCellsRef = useRef<Set<string>>(new Set());
  const stolenCellsRef = useRef<Set<string>>(new Set());
  const neighborCellsRef = useRef<Set<string>>(new Set());
  const [shakeTick, setShakeTick] = useState(0);
  if (gridKey !== prevGridRef.current) {
    const newSet = new Set<string>();
    const stolenSet = new Set<string>();
    const neighborSet = new Set<string>();
    const prevOwners = prevGridRef.current.split(',');
    s.grid.forEach((row, r) => row.forEach((cell, c) => {
      const prevOwner = prevOwners[(r * s.gridSize) + c];
      // Nur diffen wenn prevOwner definiert ist (sonst gab's im vorherigen
      // Snapshot diese Zelle gar nicht → kein echtes „neu gesetzt").
      if (prevOwner === undefined) return;
      if (cell.ownerId && prevOwner === '') newSet.add(`${r}-${c}`);
      else if (cell.ownerId && prevOwner && prevOwner !== cell.ownerId) stolenSet.add(`${r}-${c}`);
    }));
    // Collect 4-neighbors of any changed cell
    const changed = new Set<string>([...newSet, ...stolenSet]);
    for (const key of changed) {
      const [r, c] = key.split('-').map(Number);
      [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr, nc]) => {
        if (nr >= 0 && nr < s.gridSize && nc >= 0 && nc < s.gridSize && !changed.has(`${nr}-${nc}`)) {
          neighborSet.add(`${nr}-${nc}`);
        }
      });
    }
    newCellsRef.current = newSet;
    stolenCellsRef.current = stolenSet;
    neighborCellsRef.current = neighborSet;
    prevGridRef.current = gridKey;
    if (newSet.size > 0 || stolenSet.size > 0) {
      setShakeTick(t => t + 1);
      setTimeout(() => {
        newCellsRef.current = new Set();
        stolenCellsRef.current = new Set();
        neighborCellsRef.current = new Set();
      }, 1200);
    }
  }

  // Idle pulse: pick 2 random empty cells to softly pulse
  const [idleCells, setIdleCells] = useState<Set<string>>(new Set());
  useEffect(() => {
    const iv = setInterval(() => {
      const emptyCells: string[] = [];
      s.grid.forEach((row, r) => row.forEach((cell, c) => {
        if (!cell.ownerId) emptyCells.push(`${r}-${c}`);
      }));
      if (emptyCells.length === 0) { setIdleCells(new Set()); return; }
      const picked = new Set<string>();
      for (let i = 0; i < Math.min(2, emptyCells.length); i++) {
        const idx = Math.floor(Math.random() * emptyCells.length);
        picked.add(emptyCells.splice(idx, 1)[0]);
      }
      setIdleCells(picked);
    }, 2500);
    return () => clearInterval(iv);
  }, [s.grid]);

  return (
    <div style={{ animation: shakeTick > 0 ? 'boardShake 0.45s ease-out' : undefined }} key={`shake-${shakeTick}`}>
      {/* Grid — Border + Glow in Team-Farbe wenn ein Team gerade dran ist
          (PLACEMENT-Phase). User-Wunsch 2026-04-28: 'Grid soll die Glow-Farbe
          am Rand haben welches Team gerade setzt'. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${s.gridSize}, ${cellSize}px)`,
        gap,
        background: 'rgba(255,255,255,0.03)',
        padding: 10, borderRadius: 16,
        border: `3px solid ${highlightTeam ? `${activeColor}cc` : 'rgba(255,255,255,0.06)'}`,
        boxShadow: highlightTeam
          ? `0 0 0 1px ${activeColor}55, 0 0 80px ${activeColor}55, 0 0 32px ${activeColor}88, inset 0 1px 0 rgba(255,255,255,0.04)`
          : '0 0 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
        animation: highlightTeam
          ? 'gridActiveTeamGlow 2.4s ease-in-out infinite'
          : 'gridIdle 4s ease-in-out infinite',
        transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
        // CSS-Var für Animation-Pulse (Team-Color als Pulse-Farbe).
        ['--active-team-color' as any]: activeColor || 'transparent',
      }}>
        {s.grid.flatMap((row, r) =>
          row.map((cell, c) => {
            const team = s.teams.find(t => t.id === cell.ownerId);
            const isHighlighted = highlightTeam && team?.id === highlightTeam;
            const isNew = newCellsRef.current.has(`${r}-${c}`);
            const isStolen = stolenCellsRef.current.has(`${r}-${c}`);
            const isNeighbor = neighborCellsRef.current.has(`${r}-${c}`);
            const isFlash = flashCellKey === `${r}-${c}`;
            const isAccent = isNew || isStolen || isFlash;
            const showStar = showJoker && cell.jokerFormed;
            // Joker GERADE geformt → 2.2s Goldglow-Pulse als Beamer-Highlight.
            const isJustFormedJoker = justFormedJokerRef.current.has(`${r}-${c}`);
            const isFrozen = cell.frozen;
            const isStuck = cell.stuck;
            const isShielded = !!cell.shielded && !cell.stuck;
            const sandTtl = cell.sandLockTtl ?? 0;
            const isSandLocked = sandTtl > 0;
            const cellRadius = Math.max(4, cellSize * 0.16);
            // 2026-05-13 (Wolf 'gestapelte emojis sehen nicht aus wie skizziert,
            // 8. Anfrage' + 'oben 1x stapeln unten 2x stapeln'): Root-Cause der
            // wiederholten Beschwerde. Connections-Stapel (qqStapelBonusCell)
            // setzt BEIDES — cell.stuck=true UND cell.stackBonus+=1 ("optisch
            // konsistent mit regulaerem Stapel"). Die alte Summen-Formel
            // (stuck?1:0) + (stackBonus??0) zaehlte einen Connections-Stack
            // als 2 → Renderer zeigte bei 1x stapeln schon 3 Avatare.
            //
            // stackBonus ist die kanonische Stapel-Zaehlweise wenn vorhanden
            // (Connections-Mechanik), sonst stuck=1 als Fallback (Phase-3
            // STAPEL_1, das kein stackBonus setzt). Math.max statt + verhindert
            // Double-Counting wenn Connections beides setzt.
            //   1x stapeln (Phase-3):       stuck=t, sb=undef → 1 → 2 Avatare ✓
            //   1x stapeln (Connections):   stuck=t, sb=1     → 1 → 2 Avatare ✓
            //   2x stapeln (Connections):   stuck=t, sb=2     → 2 → 3 Avatare ✓
            const stackCount = Math.max(cell.stackBonus ?? 0, cell.stuck ? 1 : 0);
            return (
              <div key={`${r}-${c}`} style={{
                position: 'relative', overflow: 'visible',
                width: cellSize, height: cellSize, borderRadius: cellRadius,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: Math.max(8, cellSize * 0.42),
                zIndex: isJustFormedJoker ? 6 : (isAccent ? 5 : isStuck ? 4 : 1),
                // 2026-05-04 (Wolf): 3D-Lift fuer ALLE besetzten Tiles (subtle
                // Drop-Shadow, kein vertikaler Lift). Stapel-Tiles bleiben
                // sichtbar gehoben (translateY -3px) + stacked Layer-Shadow
                // + Goldglow. Leere Cells haben keinen 3D-Effekt.
                transform: isStuck ? 'translateY(-3px)' : undefined,
                filter: isStuck
                  ? 'drop-shadow(0 5px 6px rgba(0,0,0,0.55)) drop-shadow(0 0 8px rgba(236,72,153,0.45))'
                  : team
                    ? 'drop-shadow(0 3px 3px rgba(0,0,0,0.45))'
                    : undefined,
                transition: 'transform 0.4s var(--qq-ease-bounce), filter 0.4s ease',
                animation: isJustFormedJoker
                  ? 'jokerCellPulse 2.2s var(--qq-ease-smooth) both'
                  : isNeighbor ? 'cellNeighborDuck 0.45s ease-out 0.1s both' : undefined,
              }}>
                {/* Empty cell base — with idle pulse for alive feel */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: cellRadius,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  animation: !team && idleCells.has(`${r}-${c}`) ? 'cellIdlePulse 2.5s ease-in-out both' : undefined,
                }} />
                {/* Team color layer — ink fill for new cells, dim non-active teams */}
                {team && (() => {
                  const isActiveTeam = team.id === highlightTeam;
                  const isDimmed = highlightTeam && !isActiveTeam && !isAccent;
                  // Territorium-Fusion: gleiche Team-Nachbarn ermitteln
                  const tid = team.id;
                  const nTop    = s.grid[r - 1]?.[c]?.ownerId === tid;
                  const nRight  = s.grid[r]?.[c + 1]?.ownerId === tid;
                  const nBottom = s.grid[r + 1]?.[c]?.ownerId === tid;
                  const nLeft   = s.grid[r]?.[c - 1]?.ownerId === tid;
                  // Ecken eckig, wo eine anliegende Kante fusioniert (sonst cellRadius)
                  const rTL = (nTop    || nLeft ) ? 0 : cellRadius;
                  const rTR = (nTop    || nRight) ? 0 : cellRadius;
                  const rBR = (nBottom || nRight) ? 0 : cellRadius;
                  const rBL = (nBottom || nLeft ) ? 0 : cellRadius;
                  // Spezial-Cells (stuck/frozen/joker) behalten runde Kanten für eigenes Styling
                  const specialBorder = isStuck || isFrozen || isShielded || showStar;
                  const fusedRadius = specialBorder
                    ? cellRadius
                    : `${rTL}px ${rTR}px ${rBR}px ${rBL}px` as any;
                  // Default-Alpha auf nahezu voll deckend hochgezogen — vorher war
                  // ein Gradient mit max. 60% Alpha (color99 → color66), wodurch die
                  // Team-Farben auf dem dunklen BG durchscheinend pastellig wirkten
                  // und sich z.B. Pink / Rot / Orange kaum voneinander unterscheiden
                  // ließen. Jetzt: voll deckende Farbe mit minimalem Tonwert-Shading.
                  // Dimmed: Alpha leicht abgesenkt (statt 66/44 jetzt cc/a6),
                  // damit Team-Farben klar erkennbar bleiben. Zusätzlicher
                  // brightness/saturate-Filter wurde komplett entfernt.
                  const hexA = isHighlighted || isAccent ? 'ff' : isDimmed ? 'cc' : 'ff';
                  const hexB = isHighlighted || isAccent ? 'cc' : isDimmed ? 'a6' : 'd9';
                  // 2026-05-05 (Wolf-Wahl 3B): Brett-Farbe aus Smart-Palette,
                  // nicht Avatar-Farbe — verhindert ähnliche-Farben-Konflikte.
                  const tColor = bc(team.id);
                  const bridgeBg = `linear-gradient(135deg, ${tColor}${hexA}, ${tColor}${hexB})`;
                  const bridgeSpan = Math.max(6, cellSize - cellRadius * 2);
                  const bridgeOffset = cellRadius;
                  // 2026-05-05 v3 (Wolf-Wunsch 'connected regions als block'):
                  // Borders + Inset-3D-Effects nur an AUSSEN-Kanten der Region —
                  // an inneren Kanten zum gleichen Team verschmelzen die Tiles
                  // visuell zu einem Block. Macht das Spielziel (groesstes
                  // Gebiet) auf einen Blick lesbar.
                  // Zusaetzlich: Stapel-3D-Stack vereinfacht (vorher Doppel-
                  // Goldlayer + dicker Glow, jetzt single-Layer + dezenter
                  // Glow) — Wolf-Bug 'gestapelte felder ueberladen'.
                  const borderColor = `${tColor}${isHighlighted || isAccent ? 'ff' : isDimmed ? '33' : '55'}`;
                  const stdBorderTop    = (isFrozen || nTop)    ? 'none' : `1px solid ${borderColor}`;
                  const stdBorderRight  = (isFrozen || nRight)  ? 'none' : `1px solid ${borderColor}`;
                  const stdBorderBottom = (isFrozen || nBottom) ? 'none' : `1px solid ${borderColor}`;
                  const stdBorderLeft   = (isFrozen || nLeft)   ? 'none' : `1px solid ${borderColor}`;
                  // Inset-Effects: Top-Highlight nur an Region-Top-Kante, Bottom-
                  // Shadow nur an Region-Bottom-Kante, sonst durchlaufen die
                  // Light-/Dark-Streifen die Region und brechen den Block auf.
                  const insetTop    = nTop    ? '' : 'inset 0 1px 0 rgba(255,255,255,0.22)';
                  const insetBottom = nBottom ? '' : 'inset 0 -3px 0 rgba(0,0,0,0.20)';
                  // Hard-Drop nur an Region-Aussen-Edges (rechts + unten = Lichtquelle).
                  const hardDropX = nRight  ? 0 : 2;
                  const hardDropY = nBottom ? 0 : 3;
                  const hardDrop = (hardDropX || hardDropY)
                    ? `${hardDropX}px ${hardDropY}px 0 rgba(0,0,0,0.45)`
                    : '';
                  const softDrop = '0 5px 9px rgba(0,0,0,0.30)';
                  // 2026-05-05 v4 (Wolf 'braucht es die aeussere linie und das
                  // 3d aussen dann ueberhaupt noch? ich wuerde dann nur innen
                  // stacken'): stuckBoxShadow geloescht — Stuck-Tiles nutzen
                  // jetzt stdBoxShadow wie normale Tiles. Stack-Look kommt
                  // ausschliesslich aus den Inner-Layers.
                  const stdBoxShadow = [
                    insetTop, insetBottom,
                    hardDrop, softDrop,
                    isAccent      ? `0 0 ${isFlash ? 28 : 24}px ${tColor}bb` : '',
                    showStar      ? '0 0 10px rgba(236,72,153,0.5)' : '',
                    (!isAccent && !showStar && isHighlighted) ? `0 0 14px ${tColor}88` : '',
                  ].filter(Boolean).join(', ');
                  return (
                  <>
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: fusedRadius,
                    // Standard-Background fuer alle Tiles. Stuck-Tile bekommt
                    // visuell ihren Stack-Look ausschliesslich aus den Inner-
                    // Layern — kein eigener Outer-Tint mehr noetig.
                    background: `linear-gradient(135deg, ${tColor}${hexA}, ${tColor}${hexB})`,
                    // Border: showStar (Joker) hat eigene 2px Goldborder,
                    // Frozen keine. Stuck nutzt jetzt die per-edge Region-
                    // Fusion wie Standard — outer Goldborder weg.
                    ...(showStar
                      ? { border: '2px solid rgba(236,72,153,0.9)' }
                      : isFrozen
                        ? { border: 'none' }
                        : {
                            borderTop: stdBorderTop,
                            borderRight: stdBorderRight,
                            borderBottom: stdBorderBottom,
                            borderLeft: stdBorderLeft,
                          }),
                    animation: (isNew || isStolen) ? 'cellInkFill 0.9s var(--qq-ease-out-cubic) both' : undefined,
                    boxShadow: stdBoxShadow,
                    transition: 'box-shadow 0.4s ease, background 0.4s ease, border-color 0.4s ease',
                  }} />
                  {/* Territorium-Bridges: füllen den Grid-Gap zu gleichfarbigen
                      Nachbarn, damit „verbundene Felder" als eine Fläche wirken. */}
                  {nRight && (
                    <div style={{
                      position: 'absolute',
                      right: -gap - 1, top: bridgeOffset,
                      width: gap + 2, height: bridgeSpan,
                      background: bridgeBg,
                      zIndex: 2, pointerEvents: 'none',
                    }} />
                  )}
                  {nBottom && (
                    <div style={{
                      position: 'absolute',
                      bottom: -gap - 1, left: bridgeOffset,
                      height: gap + 2, width: bridgeSpan,
                      background: bridgeBg,
                      zIndex: 2, pointerEvents: 'none',
                    }} />
                  )}
                  </>
                  );
                })()}
                {/* Frozen overlay — ice tint + shimmer + frost corners */}
                {isFrozen && (
                  <>
                    {/* Base ice tint */}
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: cellRadius,
                      background: 'rgba(147,210,255,0.22)',
                      border: '2px solid rgba(147,210,255,0.8)',
                      animation: 'frostPulse 2.5s ease-in-out infinite',
                      pointerEvents: 'none', zIndex: 2,
                    }} />
                    {/* Shimmer streak */}
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: cellRadius,
                      background: 'linear-gradient(105deg, transparent 30%, rgba(200,230,255,0.35) 45%, rgba(255,255,255,0.45) 50%, rgba(200,230,255,0.35) 55%, transparent 70%)',
                      backgroundSize: '200% 100%',
                      animation: 'frostShimmer 3s ease-in-out infinite',
                      pointerEvents: 'none', zIndex: 3,
                    }} />
                    {/* Frost corner accents */}
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: cellRadius,
                      background: `
                        radial-gradient(circle at 10% 10%, rgba(200,230,255,0.5) 0%, transparent 35%),
                        radial-gradient(circle at 90% 10%, rgba(200,230,255,0.4) 0%, transparent 30%),
                        radial-gradient(circle at 10% 90%, rgba(200,230,255,0.4) 0%, transparent 30%),
                        radial-gradient(circle at 90% 90%, rgba(200,230,255,0.5) 0%, transparent 35%)
                      `,
                      pointerEvents: 'none', zIndex: 3,
                    }} />
                    {/* Frost-PNG badge top-right */}
                    <div style={{
                      position: 'absolute', top: -4, right: -4,
                      zIndex: 5, lineHeight: 0,
                      animation: 'frostCrystal 3s ease-in-out infinite',
                      filter: 'drop-shadow(0 0 3px rgba(147,210,255,0.8))',
                    }}>
                      <QQIcon slug="marker-frost" size={Math.max(14, cellSize * 0.42)} alt="Frost" />
                    </div>
                  </>
                )}
                {/* Stuck overlay — 2026-05-05 v4 (Wolf 'nur innen stacken'):
                    Outer-Goldtint geloescht, nur noch der einmalige Dust-Ring
                    beim Setzen als feedback. */}
                {isStuck && (
                  <div style={{
                    position: 'absolute', inset: -6, borderRadius: cellRadius + 6,
                    border: '2.5px solid rgba(236,72,153,0.8)',
                    animation: 'stapelDustRing 0.6s ease-out 0.1s both',
                    pointerEvents: 'none', zIndex: 3,
                  }} />
                )}
                {/* 2026-05-12 (Wolf 'neue Idee Stack-Indicator'): die alte
                    Feld-im-Feld-Indikation (konzentrische Inner-Layers) ist
                    raus. Stattdessen werden mehrere Avatar-Kopien diagonal auf
                    dem normalen Feld plaziert: 2 Avatare = 2 Stack, 3 Avatare
                    = 3 Stack. Cellrand bleibt sauber, kein nested Frame mehr.
                    Render-Pfad unten (Avatar-Block) macht die Mehrfach-
                    Platzierung; hier wird nur der frueher noetige Layer-Render
                    geloescht. */}
                {/* Bann-Overlay — purple tint + Sanduhr-PNG + Countdown auf der Zelle.
                    C7: Sanduhr droppt rein + tickt kontinuierlich. */}
                {isSandLocked && (
                  <>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: cellRadius,
                      border: '2px solid rgba(168,85,247,0.85)',
                      background: 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(126,34,206,0.12))',
                      boxShadow: 'inset 0 0 16px rgba(168,85,247,0.4)',
                      animation: 'frostPulse 2.5s ease-in-out infinite',
                      pointerEvents: 'none', zIndex: 2,
                    }} />
                    {/* Sanduhr-PNG zentriert — Drop-Anim beim Mount + dauer-Tick. */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none', zIndex: 4,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))',
                      animation: 'sanduhrDrop 0.65s var(--qq-ease-bounce) both, sanduhrTick 2.5s ease-in-out 0.7s infinite',
                      transformOrigin: 'center',
                    }}>
                      <QQIcon slug="marker-sanduhr" size={Math.max(20, cellSize * 0.7)} alt="Bann" />
                    </div>
                    {/* Countdown-Chip oben rechts */}
                    <div style={{
                      position: 'absolute', top: -4, right: -4,
                      minWidth: Math.max(16, cellSize * 0.32),
                      height: Math.max(16, cellSize * 0.32),
                      padding: `0 ${Math.max(3, cellSize * 0.05)}px`,
                      borderRadius: '999px',
                      background: 'linear-gradient(135deg, #A855F7, #6B21A8)',
                      border: '2px solid #2E1065',
                      color: '#FFFFFF',
                      fontSize: Math.max(10, cellSize * 0.22),
                      fontWeight: 900,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.35), 0 0 8px rgba(168,85,247,0.6)',
                      zIndex: 6,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{sandTtl}</div>
                  </>
                )}
                {/* Shield overlay — goldener Ring mit shieldGlow-Puls.
                    Deutlich sichtbar aus Beamer-Distanz, Strategie klar. */}
                {isShielded && (
                  <>
                    <div style={{
                      position: 'absolute', inset: -2, borderRadius: cellRadius + 2,
                      border: '2.5px solid rgba(236,72,153,0.9)',
                      background: 'rgba(236,72,153,0.14)',
                      animation: 'shieldGlow 2s ease-in-out infinite',
                      pointerEvents: 'none', zIndex: 2,
                    }} />
                    <div style={{
                      position: 'absolute', top: -5, right: -5,
                      zIndex: 5, lineHeight: 0,
                      filter: 'drop-shadow(0 0 6px rgba(236,72,153,0.9))',
                    }}>
                      <QQIcon slug="marker-shield" size={Math.max(16, cellSize * 0.48)} alt="Schild" />
                    </div>
                  </>
                )}
                {/* Steal shatter — flying shards from stolen cell */}
                {isStolen && [0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                  const angle = i * 45 + Math.random() * 20;
                  const dist = cellSize * (0.7 + Math.random() * 0.5);
                  const shx = `${Math.cos(angle * Math.PI / 180) * dist}px`;
                  const shy = `${Math.sin(angle * Math.PI / 180) * dist}px`;
                  const shr = `${(Math.random() * 360 - 180).toFixed(0)}deg`;
                  return (
                    <div key={`sh-${i}`} style={{
                      position: 'absolute',
                      width: Math.max(4, cellSize * 0.14), height: Math.max(4, cellSize * 0.14),
                      borderRadius: 2,
                      background: team ? bc(team.id) : '#fff',
                      top: '50%', left: '50%',
                      marginTop: -Math.max(2, cellSize * 0.07),
                      marginLeft: -Math.max(2, cellSize * 0.07),
                      ['--shx' as string]: shx, ['--shy' as string]: shy, ['--shr' as string]: shr,
                      animation: `cellShard 0.7s ease-out ${0.05 + i * 0.02}s both`,
                      pointerEvents: 'none', zIndex: 6,
                      boxShadow: `0 0 8px ${team ? bc(team.id) : '#fff'}`,
                    }} />
                  );
                })}
                {/* Shockwave rings on new cells */}
                {(isNew || isStolen) && (
                  <>
                    <div style={{
                      position: 'absolute', inset: -6, borderRadius: cellRadius + 6,
                      border: `2.5px solid ${team ? bc(team.id) : '#fff'}88`,
                      animation: 'cellShockwave 0.7s ease-out both',
                      pointerEvents: 'none',
                    }} />
                    <div style={{
                      position: 'absolute', inset: -4, borderRadius: cellRadius + 4,
                      border: `1.5px solid ${team?.color ?? '#fff'}44`,
                      animation: 'cellShockwave 0.9s ease-out 0.15s both',
                      pointerEvents: 'none',
                    }} />
                  </>
                )}
                {/* Sparkle particles on new cells */}
                {(isNew || isStolen) && [0, 1, 2, 3, 4, 5].map(i => {
                  const angle = i * 60;
                  const dist = cellSize * 0.6;
                  const sx = `${Math.cos(angle * Math.PI / 180) * dist}px`;
                  const sy = `${Math.sin(angle * Math.PI / 180) * dist}px`;
                  return (
                    <div key={`sp-${i}`} style={{
                      position: 'absolute',
                      width: 4, height: 4, borderRadius: '50%',
                      background: team?.color ?? '#fff',
                      top: '50%', left: '50%', marginTop: -2, marginLeft: -2,
                      ['--sx' as string]: sx, ['--sy' as string]: sy,
                      animation: `cellSparkle 0.6s ease-out ${0.1 + i * 0.04}s both`,
                      pointerEvents: 'none', zIndex: 3,
                    }} />
                  );
                })}
                {/* Flash ring */}
                {isFlash && !isNew && (
                  <div style={{
                    position: 'absolute', inset: -4, borderRadius: cellRadius + 3,
                    border: `2px solid ${team?.color ?? '#fff'}88`,
                    animation: 'cellShockwave 1s ease-out 2',
                    pointerEvents: 'none',
                  }} />
                )}
                {/* 2026-05-05 v4 (Wolf 'zahlen koennen weg an den tiles'):
                    Stack-Bonus-+N-Badge entfernt — die konzentrischen Inner-
                    Layer zeigen die Stack-Anzahl visuell, Zahl daneben war
                    redundant und visuell ueberladen. */}
                {/* Emoji / star content */}
                {/* 2026-05-05 (Wolf-Skizze Stack): zIndex 8 damit Avatar ueber
                    allen Inner-Stack-Layern (zIndex 2..N) liegt. */}
                <div style={{
                  // 2026-05-13 (Wolf-Bug 'emojis auf feldern falsch platziert'):
                  // Outer-Wrapper war `position: relative` ohne explizite Groesse —
                  // alle children waren position:absolute → Outer collapsed auf
                  // 0x0. Das inner avatar-positioning (inset:0 + margin:auto)
                  // referenzierte dann einen 0x0-containingblock statt der vollen
                  // Cell → avatar landete an der falschen Stelle (sichtbar
                  // verschoben nach unten-rechts ausserhalb der Cell).
                  // Fix: absolute inset:0 macht Outer = Cell-Groesse → margin:auto
                  // centering klappt wieder.
                  position: 'absolute', inset: 0, zIndex: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: (isNew || isStolen) ? 'cellEmojiDrop 0.6s var(--qq-ease-bounce) 0.3s both' : undefined,
                  opacity: isFrozen ? 0.55 : undefined,
                  filter: isFrozen ? 'saturate(0.4) brightness(1.2)' : undefined,
                }}>
                  {showStar ? <JokerIcon i={r + c} size={Math.max(12, cellSize * 0.78)} eurovisionMode={!!s.theme?.eurovisionMode} square /> : (team && (() => {
                    // 2026-05-12 v2 (Wolf 'avatare ueberdecken sich STILL'):
                    // Vorheriger Fix war Math-Bug: `transform: translate(28%, 28%)`
                    // ist 28% von Avatar-Eigengroesse, NICHT von cellSize. Mit
                    // avFactor 0.42 wurde Offset effektiv nur 11.76% cellSize —
                    // die behaupteten 79% Center-Distance waren in Wahrheit
                    // ~23.5%. Bei 42% combined-radii → klares overlap.
                    // Jetzt: inset:0 + margin:auto zum Zentrieren, transform mit
                    // PIXELN basierend auf cellSize. Damit ist Offset wirklich
                    // cellSize-relativ.
                    //  stackCount 0 → 1 Avatar zentriert (normales Feld)
                    //  stackCount 1 → 2 Avatare diagonal, getrennt
                    //  stackCount 2+ → 3 Avatare im Dreieck, getrennt
                    // 2026-05-25 (Wolf Final-Wager v4): revealStamps erweitern
                    // den Stack-Slot-Count und ersetzen Team-Avatare durch
                    // Stamp-Emojis ab Slot baseCopies. Beispiele:
                    //  - 0 stack + 1 stamp  → 2 Slots (team TL, stamp BR)
                    //  - 0 stack + 2 stamps → 3 Slots (team apex, 2 stamps basis)
                    //  - 1 stack + 1 stamp  → 3 Slots (team, team, stamp)
                    const STAMP_EMOJI_MAP: Record<string, string> = {
                      underdog: '🐢', speedy: '⚡', meisterklauer: '🦝', bet: '🪙', sympathy: '💞',
                    };
                    // 2026-05-25 (Wolf-Bug 'münze vor reveal-phase'): Stamps nur
                    // rendern wenn wir tatsaechlich in der Reveal-Phase oder
                    // danach sind. Backjump im Test-Modus oder stale State
                    // sollte sie nicht zeigen.
                    const isStampVisible = s.phase === 'FINAL_REVEAL'
                      || s.phase === 'GAME_OVER'
                      || s.phase === 'THANKS';
                    const stamps = isStampVisible ? (cell.revealStamps ?? []) : [];
                    // 2026-05-25 v5 (Wolf '4-corner statt triangle bei 3+ emojis'):
                    // Layout:
                    //  copies=1: 1 avatar centered (0.86)
                    //  copies=2: 2 emojis diagonal TL+BR (0.54) — UNVERAENDERT
                    //  copies=3: 3 emojis TL+BR+TR (0.46) — 4-corner ohne BL
                    //  copies=4: 4 emojis alle corners (0.46) — dice-4-pattern
                    // baseCopies bestimmt wie viele slots Team-Avatare sind:
                    //  - mit Stamp(s): slot 0 = team-avatar, ab slot 1 = stamps
                    //  - ohne Stamps (Phase-4 stuck): alle slots = team-avatare
                    const baseCopies = stamps.length > 0 ? 1 : (stackCount + 1);
                    const totalSlots = baseCopies + stamps.length;
                    const copies = Math.min(4, totalSlots);
                    // 2026-05-13 v5 (Wolf 13. Versuch: 'mach sie etwas groesser
                    // mach einen dritten diagonal dazu, dann nimm den in der
                    // mitte raus'):
                    //
                    // Ursache der bisherigen 12 Fehlschlaege: QQTeamAvatar
                    // rendert das Emoji nur mit 60% des Wrappers (emojiFontSize
                    // = size * 0.6) → visueller Emoji-Glyph war effektiv 0.36 ×
                    // 0.6 = 22% von cellSize, sah "winzig in der Mitte" aus
                    // selbst wenn der Wrapper rechnerisch in der Ecke sass.
                    //
                    // Fix: avFactor 0.36 → 0.50. Wrapper jetzt 50% von cellSize,
                    // visueller Emoji-Glyph ~30%. Plus Wolfs Trick fuer
                    // Positionen: Avatare so platzieren, als waeren es 3 entlang
                    // der Diagonal (TL, Center, BR), und dann Center skippen.
                    // Damit liegen TL und BR strukturell am Ecken-Rand, nicht
                    // mittig-versetzt.
                    //
                    // - 2-Stack v10 (Wolf 'bissle groesser/mittiger waere noch
                    //   nice'): avFactor 0.52→0.54, offset ±24→±23. Avatare 4 %
                    //   groesser, Center proportional von 26 % auf 27 % zur Cell-
                    //   Mitte gerueckt — Wrapper-Edge weiter 0 % Cell-Puffer.
                    //   avRadius 27, Center (27, 27) und (73, 73)
                    //     → Wrapper reicht (0, 0)-(54, 54) und (46, 46)-(100, 100)
                    //   Diagonal-Kreis-Distance: √(46² + 46²) = 65.05 %
                    //   Kreis-Sum-Radien: 54 → Avatar-Avatar-Spalt: 11.05 %
                    //   (immer noch klar getrennt, Pixel-Luft ~7 % diagonal)
                    //
                    // - 3-Stack: TRIANGLE bleibt wie v3 (Wolf hat das nicht
                    //   beanstandet). Apex (50,22) + Basis (28,65)/(72,65),
                    //   avFactor 0.34.
                    // 2026-05-25 v5 (Wolf '4-corner-pattern'): 1-2 emojis behalten
                    // current size+pos, 3-4 emojis nutzen 0.46 mit 4-corner layout.
                    const avFactor = copies >= 3 ? 0.46 : copies === 2 ? 0.54 : 0.86;
                    const avSize = Math.max(8, Math.round(cellSize * avFactor));
                    const half = avSize / 2;
                    const center = cellSize / 2;
                    // Corner-Positionen: TL/BR (current diagonal) + TR/BL.
                    // Slot-Reihenfolge: 0=TL, 1=BR (diagonal), 2=TR, 3=BL.
                    // → Bei copies=3 fehlt BL, bei copies=4 alle.
                    const cornerTL = { left: Math.round(0.27 * cellSize - half),
                                       top:  Math.round(0.27 * cellSize - half) };
                    const cornerBR = { left: Math.round(0.73 * cellSize - half),
                                       top:  Math.round(0.73 * cellSize - half) };
                    const cornerTR = { left: Math.round(0.73 * cellSize - half),
                                       top:  Math.round(0.27 * cellSize - half) };
                    const cornerBL = { left: Math.round(0.27 * cellSize - half),
                                       top:  Math.round(0.73 * cellSize - half) };
                    const slotPositionsPx: Array<{ left: number; top: number }> = copies >= 4
                      ? [cornerTL, cornerBR, cornerTR, cornerBL]
                      : copies === 3
                        ? [cornerTL, cornerBR, cornerTR]
                        : copies === 2
                          ? [cornerTL, cornerBR]
                          : [{ left: Math.round(center - half),
                              top:  Math.round(center - half) }];
                    return (
                      <div style={{
                        position: 'absolute', inset: 0,
                      }}>
                        {slotPositionsPx.map((pos, i) => {
                          // 2026-05-25 v5: direkte top/left Pixel-Positionierung,
                          // kein transform-Trick mehr.
                          const isStampSlot = i >= baseCopies;
                          const stampKind = isStampSlot ? stamps[i - baseCopies]?.kind : undefined;
                          const stampEmoji = stampKind ? STAMP_EMOJI_MAP[stampKind] : null;
                          return (
                            <div key={i} style={{
                              position: 'absolute',
                              left: pos.left, top: pos.top,
                              width: avSize, height: avSize, borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              zIndex: i + 1,
                              animation: i > 0 ? `phasePop 0.45s var(--qq-ease-bounce) ${0.05 * i}s both` : undefined,
                            }}>
                              {isStampSlot && stampEmoji ? (
                                <span style={{
                                  // 2026-05-25 v2 (Wolf 'münze viel größer als avatar'):
                                  // gleiche Größe wie das Team-Avatar-Emoji (size * 0.6).
                                  fontSize: avSize * 0.6, lineHeight: 1,
                                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.55))',
                                }}>{stampEmoji}</span>
                              ) : (
                                <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={avSize} flat />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })())}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
