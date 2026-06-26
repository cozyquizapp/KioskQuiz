/**
 * CozyQuizTeamActionCards — die interaktiven Mid-Game-Cards (Game-State-Maschinen).
 *
 * - PlacementCard — 8x8-Grid mit Place/Steal/Stapel/Bann/Swap-Aktionen.
 *   Pending-Pick-Pattern (Tap → Highlight → Confirm-Btn) verhindert Misstaps.
 *   Free-Action-Mode fuer Joker-Powers. STAPEL_BONUS-Sub-Mode fuer Connections.
 * - ComebackCard — Higher/Lower-Mini-Game (4 Runden Mehr-oder-Weniger),
 *   plus Steal-Phase wo das Comeback-Team ein gegnerisches Feld klauen darf.
 * - ConnectionsTeamCard — 4x4-Grid Multi-Select Sub-Phase (Finale).
 *   ConnectionsTeamTimer ist privater Helper.
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 3.3).
 */
import { useState, useEffect, useRef } from 'react';
import type { QQStateUpdate, QQAck } from '../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from './QQTeamAvatar';
import { JokerIcon } from './JokerIcon';
import { QQIcon, QQEmojiIcon } from './QQIcon';
import { CozyCard, CozyBtn, AnimatedDots } from './CozyQuizTeamPrimitives';
import { safeEmit } from '../utils/qqTeamAckBus';
import { QQ_COLORS } from '../../../shared/qqColors';

// Page-Cards-Background (Strangler-Fig: identisch zu QQTeamPage COZY_CARD_BG).
const COZY_CARD_BG = 'linear-gradient(180deg, #1F1A2E, #14101F)';

// Translation-Subset fuer Placement + Comeback. 1:1 aus QQTeamPage's t-Object
// extrahiert (Strangler-Fig). Bei Aenderungen am Wortlaut beide Stellen mitziehen.
const t = {
  placement: {
    tapEmpty: { de: 'Tippe auf ein freies Feld', en: 'Tap an empty field' },
    tapOpponent: { de: 'Tippe auf ein fremdes Feld', en: 'Tap an opponent\'s field' },
    tapOpponent12: { de: 'Tippe auf ein gegnerisches Feld (1/2)', en: 'Tap an opponent field (1/2)' },
    swap2nd: { de: 'Jetzt das 2. Feld (anderes Team) wählen', en: 'Now choose the 2nd field (different team)' },
    otherChoosing: { de: 'wählt ein Feld…', en: 'is choosing a field…' },
    cancel: { de: 'Abbrechen', en: 'Cancel' },
    titlePlace: { de: '📍 Wähle ein Feld!', en: '📍 Choose a field!' },
    titleSteal: { de: '⚡ Klau ein fremdes Feld!', en: '⚡ Steal an opponent\'s field!' },
    titleSwap: { de: '🔄 Tausche 2 gegnerische Felder!', en: '🔄 Swap 2 opponent fields!' },
    titlePhase2: { de: '🏆 Runde 2 — Wähle deine Aktion!', en: '🏆 Round 2 — Choose your action!' },
    place2: { de: '📍 2 Felder setzen', en: '📍 Place 2 fields' },
    steal1: { de: '⚡ 1 Feld klauen', en: '⚡ Steal 1 field' },
    placeBtn: { de: '📍 Setzen', en: '📍 Place' },
    stealBtn: { de: '⚡ Klauen', en: '⚡ Steal' },
    swapBtn: { de: '🔄 Felder wählen', en: '🔄 Choose fields' },
    confirmPlace: { de: '📍 Feld wählen', en: '📍 Choose field' },
    confirmSteal: { de: '⚡ Klauen', en: '⚡ Steal' },
  },
  comeback: {
    title: { de: '⚡ Deine Comeback-Chance!', en: '⚡ Your comeback chance!' },
    otherTeam: { de: '⚡ Comeback-Aktion läuft…', en: '⚡ Comeback action in progress…' },
    place2: { de: '2 Felder setzen', en: 'Place 2 fields' },
    place2desc: { de: 'Platziere 2 freie Felder', en: 'Place 2 empty fields' },
    steal1: { de: '1 Feld klauen', en: 'Steal 1 field' },
    steal1desc: { de: 'Nimm ein fremdes Feld', en: 'Take an opponent\'s field' },
    swap2: { de: '2 Felder tauschen', en: 'Swap 2 fields' },
    swap2desc: { de: 'Tausche je 1 Feld zweier Gegner', en: 'Swap 1 field each of two opponents' },
    activePlace: { de: '📍 Wähle 2 freie Felder', en: '📍 Choose 2 empty fields' },
    activeSteal: { de: '⚡ Klau ein fremdes Feld', en: '⚡ Steal an opponent\'s field' },
    activeSwap: { de: '🔄 Wähle 2 gegnerische Felder zum Tauschen', en: '🔄 Choose 2 opponent fields to swap' },
  },
};

type FreeAction = 'PLACE' | 'STEAL' | 'SHIELD' | 'SWAP' | 'STAPEL' | 'SANDUHR';

export function PlacementCard({ state: s, myTeamId, isMyTurn, emit, roomCode, lang = 'de' }: {
  state: QQStateUpdate; myTeamId: string; isMyTurn: boolean; emit: any; roomCode: string; lang?: 'de' | 'en';
}) {
  const [selecting, setSelecting] = useState(false);
  const [freeMode, setFreeMode] = useState<FreeAction | null>(null);
  const [swapFirst, setSwapFirst] = useState<{ r: number; c: number } | null>(null);
  const [tappedCell, setTappedCell] = useState<string | null>(null);
  // Pending-Pick: erst Tap → Highlight + Bestaetigen-Button. Verhindert Misstaps
  // auf grossem Grid (8x8). Greift fuer alle Single-Cell-Aktionen.
  type PendingKind = 'place' | 'steal' | 'ban' | 'shield' | 'stapel';
  const [pendingPick, setPendingPick] = useState<{ r: number; c: number; kind: PendingKind } | null>(null);
  // 2026-05-07 (Wolf-Live-Test): Nach Place-Confirm springt /team sofort
  // auf "Team X waehlt"-Wartesicht — Spieler sieht das eigene Feld nicht
  // gesetzt (auf /beamer schon mit Animation). myRecentPlace haelt fuer
  // ~900ms statt der Wartesicht das Mini-Grid mit Cell-Glow + Banner.
  const [myRecentPlace, setMyRecentPlace] = useState<{ r: number; c: number; kind: PendingKind } | null>(null);
  useEffect(() => {
    if (!myRecentPlace) return;
    const t = window.setTimeout(() => setMyRecentPlace(null), 900);
    return () => window.clearTimeout(t);
  }, [myRecentPlace]);
  // Comeback-Steal-Pause: pendingFor=null, comebackTeamId zeigt aber das aktive Team.
  // Damit andere Teams nicht „Spielfeld" sehen (so als waere die Klau-Phase fertig),
  // sondern weiterhin das klauende Team mit „wartet auf Moderator".
  const isComebackStealActive =
    !!s.comebackHL && s.comebackHL.phase === 'steal' && !!s.comebackTeamId;
  const pendingTeam = s.teams.find(t => t.id === s.pendingFor)
    ?? (isComebackStealActive ? s.teams.find(t => t.id === s.comebackTeamId) : undefined);
  const isComebackStealPause = isComebackStealActive && !!s.comebackStealPaused && !s.pendingFor;

  const pa = s.pendingAction;
  const phase = s.gamePhaseIndex;
  const hasFreeCell = s.grid.some(row => row.some(cell => cell.ownerId === null));
  const myStats = s.teamPhaseStats?.[myTeamId];
  const hasOwnCell = s.grid.some(row => row.some(cell => cell.ownerId === myTeamId));
  // 2026-05-05 (Wolf-Konzept): bei STAPEL_BONUS (Connections-Finale) ist
  // Multi-Stack auf gleichem Feld erlaubt → cell.stuck blockt nicht.
  const isStapelBonusMode = s.pendingAction === 'STAPEL_BONUS';
  const hasStapable = s.grid.some(row => row.some(cell =>
    cell.ownerId === myTeamId && (isStapelBonusMode || !cell.stuck)
  ));
  const hasSandTarget = s.grid.some(row => row.some(cell =>
    !(cell.sandLockTtl && cell.sandLockTtl > 0) && (
      cell.ownerId === null
      || (cell.ownerId !== myTeamId && !cell.stuck && !cell.shielded)
    )));
  const shieldsUsed = myStats?.shieldsUsed ?? 0;
  const shieldsLeft = Math.max(0, 2 - shieldsUsed);
  const stapelsUsed = myStats?.stapelsUsed ?? 0;
  const stapelsLeft = Math.max(0, 3 - stapelsUsed);

  // Derived mode flags
  const isFree      = pa === 'FREE';
  // 2026-04-28: Connections-Placement (nach 4×4-Finale) nutzt auch PLACE_1 —
  // das ist aber KEIN Joker-Bonus, sondern eine reguläre Setz-Aktion pro
  // gefundener Gruppe. (User-Wunsch: 'nach finale soll normale aktion sein,
  // nicht joker, 4 oberbegriffe = 4 aktionen'.)
  const isConnectionsPlacement = s.phase === 'CONNECTIONS_4X4';
  // 2026-05-10 (Live-Test-Bug Wolf 2026-05-07: '/team zeigt Joker obwohl
  // keiner gewonnen wurde'): Pragma-Patch — zusätzliche Gate auf
  // myStats.jokersThisPhase > 0. Schließt false-positive aus (PLACE_1 ohne
  // legitimen Joker → keine Joker-UI), blockiert aber den ersten Joker einer
  // Runde NICHT (Backend setzt jokersThisPhase BEFORE pa=PLACE_1, also liest
  // das Frontend bereits 1 wenn der pa-Switch ankommt). Vorher: rein
  // pa-basiert, was bei timing-Edge-Cases falsch positiv wurde.
  const myJokersThisPhase = (myStats as any)?.jokersThisPhase ?? 0;
  const isJoker     = pa === 'PLACE_1' && phase >= 2 && !isConnectionsPlacement && myJokersThisPhase > 0; // Joker bonus placement
  const isShield    = pa === 'SHIELD_1' || (isFree && freeMode === 'SHIELD');
  const isSwapOne   = pa === 'SWAP_1'   || (isFree && freeMode === 'SWAP');
  // 2026-05-05 (Wolf-Konzept): STAPEL_BONUS = Connections-Finale-Stack-Mode.
  // Selber Cell-Picker wie regulaeres Stapeln, Multi-Stack erlaubt (Backend
  // entscheidet via pendingAction, Frontend nutzt einheitlichen Picker).
  const isStuck     = pa === 'STAPEL_1' || pa === 'STAPEL_BONUS' || (isFree && freeMode === 'STAPEL');
  const isSandLock  = pa === 'SANDUHR_1' || (isFree && freeMode === 'SANDUHR');
  const isSwapComeback = s.comebackAction === 'SWAP_2' && pa === 'COMEBACK';
  const isSteal     = pa === 'STEAL_1'
    || (pa === 'COMEBACK' && s.comebackAction === 'STEAL_1')
    || (isFree && freeMode === 'STEAL')
    || (pa === 'PLACE_2' && freeMode === 'STEAL');

  // Phase 2: show place/steal choice before choosing
  const isPhase2Choice = pa === 'PLACE_2' && phase === 2 && !freeMode;

  // Phase 3/4 FREE: show action menu before choosing
  const showFreeMenu = isFree && !freeMode && !selecting;

  const cellSize = Math.min(60, Math.floor(340 / s.gridSize));

  // Track newly claimed cells for animation
  const prevGridRef = useRef<string>('');
  const [newCells, setNewCells] = useState<Set<string>>(new Set());
  const [stolenCells, setStolenCells] = useState<Set<string>>(new Set());
  const gridKey = s.grid.flatMap(row => row.map(c => c.ownerId ?? '')).join(',');
  useEffect(() => {
    if (prevGridRef.current && gridKey !== prevGridRef.current) {
      const prevArr = prevGridRef.current.split(',');
      const claimed = new Set<string>();
      const stolen = new Set<string>();
      s.grid.forEach((row, r) => row.forEach((cell, c) => {
        const prevOwner = prevArr[(r * s.gridSize) + c];
        if (cell.ownerId && prevOwner === '') claimed.add(`${r}-${c}`);
        // Owner gewechselt (nicht leer → nicht leer) = Klau
        else if (cell.ownerId && prevOwner && cell.ownerId !== prevOwner) stolen.add(`${r}-${c}`);
      }));
      if (claimed.size > 0) {
        setNewCells(claimed);
        setTimeout(() => setNewCells(new Set()), 1000);
      }
      if (stolen.size > 0) {
        setStolenCells(stolen);
        setTimeout(() => setStolenCells(new Set()), 900);
      }
    }
    prevGridRef.current = gridKey;
  }, [gridKey]);

  useEffect(() => {
    if (!isMyTurn) { setSelecting(false); setFreeMode(null); setSwapFirst(null); setPendingPick(null); }
  }, [isMyTurn]);

  // 2026-05-02: Wolfs Bug 'nach 1. Aktion gabs kein Auswahlmenue mehr, ich war in
  // Stapel-Modus gefangen'. Bei Multi-Slot-Joker-Bonus (placementsLeft > 0) setzt
  // Backend pendingAction nach jeder Aktion zurueck auf 'FREE' (jokerBonusAction).
  // Frontend musste freeMode auch zuruecksetzen damit das Auswahlmenu wieder
  // erscheint. Tracke pendingAction-Wechsel: wenn von einem konkreten Mode
  // (STAPEL_1/STEAL_1/PLACE_1/PLACE_2) zurueck auf 'FREE' → reset.
  const prevPendingActionRef = useRef<string | null | undefined>(pa);
  useEffect(() => {
    const prev = prevPendingActionRef.current;
    prevPendingActionRef.current = pa;
    const wasConcreteMode = prev === 'STAPEL_1' || prev === 'STEAL_1'
      || prev === 'PLACE_1' || prev === 'SANDUHR_1' || prev === 'SHIELD_1' || prev === 'SWAP_1';
    if (wasConcreteMode && pa === 'FREE') {
      setFreeMode(null);
      setSelecting(false);
      setPendingPick(null);
    }
  }, [pa]);

  // Pending-Pick zuruecksetzen wenn der Aktions-Kontext (pendingAction / freeMode)
  // sich aendert oder das Grid neu geladen wird (anderes Team dran etc.).
  useEffect(() => {
    setPendingPick(null);
  }, [s.pendingAction, freeMode, s.questionIndex]);

  // Auto-skip: wenn nur eine einzige Aktion übrig ist (kein Phase-2 Multi-Choice,
  // kein FREE-Menü), direkt ins Grid springen statt den Zwischenbutton zu zeigen.
  useEffect(() => {
    if (!isMyTurn) return;
    if (isPhase2Choice) return;       // Phase-2 place/steal Wahl nötig
    if (isFree && !freeMode) return;  // FREE-Menü noch offen
    if (selecting) return;
    setSelecting(true);
  }, [isMyTurn, isPhase2Choice, isFree, freeMode, selecting]);

  async function chooseFreeAction(action: FreeAction) {
    setFreeMode(action);
    await safeEmit(emit, 'qq:chooseFreeAction', { roomCode, teamId: myTeamId, action });
    // SHIELD: frueher Auto-Apply auf groesstes Cluster, jetzt 1-Feld-Pick
    // (analog SANDUHR/STAPEL) — also einfach Grid oeffnen.
    setSelecting(true);
  }

  async function handleCell(r: number, c: number) {
    if (!isMyTurn || !selecting) return;
    // Null-Guard: bei einem stateUpdate mitten im Phasen-/Grid-Resize kann das
    // Grid kurz kürzer als gridSize sein → ein Tap würde sonst hart crashen.
    const cell = s.grid[r]?.[c];
    if (!cell) return;
    const cellKey = `${r}-${c}`;
    setTappedCell(cellKey);
    setTimeout(() => setTappedCell(null), 300);
    if (typeof navigator.vibrate === 'function') navigator.vibrate(20);

    // 2-Tap-Bestaetigung: zweiter Tap auf dasselbe pending-Feld → direkt
    // confirmen. Tap auf ein anderes Feld unten in der jeweiligen Branch
    // ersetzt das pendingPick (Cancel implizit).
    if (pendingPick && pendingPick.r === r && pendingPick.c === c) {
      await confirmPendingPick();
      return;
    }

    // COMEBACK SWAP_2: two opponent cells from different teams
    if (isSwapComeback) {
      if (!cell.ownerId || cell.ownerId === myTeamId) return;
      if (!swapFirst) { setSwapFirst({ r, c }); return; }
      if (r === swapFirst.r && c === swapFirst.c) return;
      const firstCell = s.grid[swapFirst.r]?.[swapFirst.c];
      if (!firstCell || firstCell.ownerId === cell.ownerId) return;
      await safeEmit(emit, 'qq:swapCells', { roomCode, teamId: myTeamId, rowA: swapFirst.r, colA: swapFirst.c, rowB: r, colB: c });
      if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 50]);
      setSelecting(false); setSwapFirst(null); return;
    }

    // Phase 4 SWAP_1: pick own cell first, then enemy
    if (isSwapOne) {
      if (!swapFirst) {
        if (cell.ownerId !== myTeamId) return;
        setSwapFirst({ r, c });
        await safeEmit(emit, 'qq:swapOneCell', { roomCode, teamId: myTeamId, row: r, col: c });
        return;
      } else {
        if (!cell.ownerId || cell.ownerId === myTeamId) return;
        await safeEmit(emit, 'qq:swapOneCell', { roomCode, teamId: myTeamId, row: r, col: c });
        setSelecting(false); setSwapFirst(null); return;
      }
    }

    // BANN: lock enemy or empty cell for 3 questions
    if (isSandLock) {
      if (cell.sandLockTtl && cell.sandLockTtl > 0) return;
      if (cell.ownerId === myTeamId) return;
      if (cell.stuck || cell.shielded) return;
      setPendingPick({ r, c, kind: 'ban' });
      return;
    }

    // STAPEL: any own non-stuck cell. Bei STAPEL_BONUS (Connections-Finale)
    // ist Multi-Stack erlaubt — stuck-Block entfaellt.
    if (isStuck) {
      if (cell.ownerId !== myTeamId) return;
      if (cell.stuck && !isStapelBonusMode) return;
      setPendingPick({ r, c, kind: 'stapel' });
      return;
    }

    // SCHILD: 1 eigenes Feld auswaehlen (nicht bereits geschuetzt)
    if (isShield) {
      if (cell.ownerId !== myTeamId || cell.shielded) return;
      setPendingPick({ r, c, kind: 'shield' });
      return;
    }

    // STEAL
    if (isSteal) {
      if (!cell.ownerId || cell.ownerId === myTeamId || cell.frozen || cell.stuck || cell.shielded) return;
      setPendingPick({ r, c, kind: 'steal' });
      return;
    }

    // PLACE
    if (cell.ownerId) return;
    setPendingPick({ r, c, kind: 'place' });
  }

  // Bestaetigung des Pending-Picks → emit an Backend, dann Cleanup.
  async function confirmPendingPick() {
    if (!pendingPick) return;
    const { r, c, kind } = pendingPick;
    if (kind === 'ban') {
      await safeEmit(emit, 'qq:sandLockCell', { roomCode, teamId: myTeamId, row: r, col: c });
      if (navigator.vibrate) navigator.vibrate([60, 30, 60, 30, 60]);
    } else if (kind === 'stapel') {
      await safeEmit(emit, 'qq:stapelCell', { roomCode, teamId: myTeamId, row: r, col: c });
      if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
    } else if (kind === 'shield') {
      await safeEmit(emit, 'qq:shieldCell', { roomCode, teamId: myTeamId, row: r, col: c });
      if (navigator.vibrate) navigator.vibrate([30, 20, 30, 20, 60]);
    } else if (kind === 'steal') {
      await safeEmit(emit, 'qq:stealCell', { roomCode, teamId: myTeamId, row: r, col: c });
      if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
    } else if (kind === 'place') {
      await safeEmit(emit, 'qq:placeCell', { roomCode, teamId: myTeamId, row: r, col: c });
      if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
    }
    // 2026-05-07 (Wolf-Live-Test): Eigene Setz-Geste sichtbar halten — der
    // Backend-State-Update kippt isMyTurn auf false, /team wuerde sofort auf
    // Wartesicht springen. myRecentPlace ueberschreibt das fuer 900ms.
    setMyRecentPlace({ r, c, kind });
    setPendingPick(null);
    setSelecting(false);
  }

  function cancelPendingPick() {
    setPendingPick(null);
    if (navigator.vibrate) navigator.vibrate(15);
  }

  // Detect adjacency: cells with 2+ same-team neighbors in a row/col
  function hasAdjacentStreak(r: number, c: number, ownerId: string | null): boolean {
    if (!ownerId) return false;
    let hCount = 1;
    for (let cc = c - 1; cc >= 0 && s.grid[r]?.[cc]?.ownerId === ownerId; cc--) hCount++;
    for (let cc = c + 1; cc < s.gridSize && s.grid[r]?.[cc]?.ownerId === ownerId; cc++) hCount++;
    if (hCount >= 2) return true;
    let vCount = 1;
    for (let rr = r - 1; rr >= 0 && s.grid[rr]?.[c]?.ownerId === ownerId; rr--) vCount++;
    for (let rr = r + 1; rr < s.gridSize && s.grid[rr]?.[c]?.ownerId === ownerId; rr++) vCount++;
    return vCount >= 2;
  }

  if (!isMyTurn) {
    // miniCellSize nur noch für Avatar- und Font-Approximation; das Grid selbst
    // füllt die Card-Breite per 1fr + aspect-ratio.
    const miniCellSize = Math.min(48, Math.floor(320 / s.gridSize));
    const myTeam = s.teams.find(tm => tm.id === myTeamId);
    // 2026-05-07 (Wolf-Live-Test): Wenn ich gerade gesetzt habe, zeige fuer
    // ~900ms Mini-Grid mit Cell-Highlight statt Avatar+"waehlt" — sonst sieht
    // der Spieler die eigene Setzung gar nicht.
    const showRecentPlaceFlash = myRecentPlace !== null;
    const showPendingTeamView = pendingTeam && !showRecentPlaceFlash;

    return (
      <CozyCard borderColor={myTeam?.color}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          {showPendingTeamView ? (
            <>
              <QQTeamAvatar avatarId={pendingTeam.avatarId} teamEmoji={pendingTeam.emoji} size={40} style={{
                margin: '0 auto 8px',
                animation: 'tcfloat 2s ease-in-out infinite',
              }} />
              <div style={{ fontWeight: 900, color: pendingTeam.color, fontSize: 17 }}>{pendingTeam.name}</div>
              <div style={{ fontSize: 14, color: QQ_COLORS.slate400, marginTop: 4, fontWeight: 700 }}>
                {isComebackStealPause
                  ? (pendingTeam.id === myTeamId
                      ? (lang === 'de' ? '✓ Geklaut — warte auf Moderator' : '✓ Stolen — waiting for moderator')
                      : (lang === 'de' ? 'wartet auf Moderator' : 'waiting for moderator'))
                  : (lang === 'de' ? 'wählt ein Feld' : 'is choosing a field')}
                <AnimatedDots />
              </div>
            </>
          ) : (
            /* Placement done — show mini grid + score summary.
               2026-05-07: Banner kippt auf "✓ Gesetzt!" wenn ich gerade
               selbst gesetzt habe (myRecentPlace) — gibt der eigenen
               Setzung 900ms sichtbares Eigen-Feedback bevor die normale
               Wartesicht uebernimmt. */
            <>
              <div style={{
                fontSize: 14, fontWeight: 900,
                color: showRecentPlaceFlash ? (myTeam?.color ?? QQ_COLORS.green500) : QQ_COLORS.slate400,
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
                animation: showRecentPlaceFlash ? 'tcCellClaim 0.5s var(--qq-ease-bounce) both' : undefined,
              }}>
                {showRecentPlaceFlash
                  ? (lang === 'de' ? '✓ Gesetzt!' : '✓ Placed!')
                  : (lang === 'de' ? '🎮 Spielfeld' : '🎮 Game Board')}
              </div>
              <div style={{
                // 2026-05-09 v3: square-grid-pattern wie selecting-mode für
                // konsistente Zell-Größen.
                display: 'grid',
                gridTemplateColumns: `repeat(${s.gridSize}, 1fr)`,
                gridTemplateRows: `repeat(${s.gridSize}, 1fr)`,
                aspectRatio: '1 / 1',
                gap: 3, width: '100%', marginBottom: 6,
                padding: 6, borderRadius: 8,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxSizing: 'border-box',
              }}>
                {s.grid.flatMap((row, r) =>
                  row.map((cell, c) => {
                    const cellTeam = s.teams.find(tm => tm.id === cell.ownerId);
                    const isMine = cell.ownerId === myTeamId;
                    const inStreak = cellTeam ? hasAdjacentStreak(r, c, cell.ownerId) : false;
                    const isNew = newCells.has(`${r}-${c}`);
                    const isStuckCell = !!cell.stuck;
                    return (
                      <div key={`${r}-${c}`} style={{
                        // 2026-05-09 v4 (Wolf 'reicht nur bg ohne den kreis'):
                        // Linear-Gradient raus — solid Team-Color BG, kein
                        // Kreis-Eindruck mehr durch diagonalen Verlauf.
                        // aspectRatio raus — Grid garantiert square via 1fr rows.
                        minWidth: 0, minHeight: 0, borderRadius: 4,
                        background: cellTeam ? cellTeam.color : 'rgba(255,255,255,0.04)',
                        border: cellTeam
                          ? (isStuckCell
                              ? `1.5px solid rgba(236,72,153,0.9)`
                              : `1px solid ${cellTeam.color}`)
                          : '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: Math.max(10, miniCellSize * 0.45),
                        ['--cell-color' as string]: cellTeam?.color ?? 'transparent',
                        position: 'relative' as const,
                        boxShadow: cellTeam
                          ? [
                              'inset 0 1px 0 rgba(255,255,255,0.22)',
                              'inset 0 -1.5px 0 rgba(0,0,0,0.20)',
                              '1px 1.5px 0 rgba(0,0,0,0.35)',
                              isStuckCell ? '0 0 6px rgba(236,72,153,0.5)' :
                              isNew ? `0 0 10px ${cellTeam.color}aa` :
                              inStreak ? `0 0 6px ${cellTeam.color}55` : '',
                            ].filter(Boolean).join(', ')
                          : 'none',
                        animation: isNew ? 'tcCellClaim 0.5s var(--qq-ease-bounce) both'
                          : inStreak ? 'tcRowPulse 2.5s ease-in-out infinite' : undefined,
                        transition: 'all 0.3s ease',
                      }}>
                        {/* 2026-05-09 v2 (Wolf TODO 1): gestackte Felder zeigen
                            🔒-Schloss statt Avatar — klarer „nicht klaubar"-
                            Eindruck. BG-Teamfarbe bleibt (Eigentum erkennbar).
                            Vorher: Avatar + Pink-Ring (semi-gut erkennbar). */}
                        {cellTeam ? (
                          isStuckCell ? (
                            <div style={{
                              fontSize: Math.max(12, Math.floor(miniCellSize * 0.7)),
                              lineHeight: 1,
                              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                            }}>🔒</div>
                          ) : (
                            <QQTeamAvatar
                              avatarId={cellTeam.avatarId}
                              teamEmoji={cellTeam.emoji}
                              size={Math.max(16, Math.floor(miniCellSize * 0.85))}
                            />
                          )
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </CozyCard>
    );
  }

  const actionColor = isSwapComeback || isSwapOne ? QQ_COLORS.violet500
    : isShield   ? '#06B6D4'
    : isStuck    ? QQ_COLORS.brandPink
    : isSandLock ? '#A855F7'
    : isSteal    ? QQ_COLORS.red500
    : isJoker    ? QQ_COLORS.brandPink
    : QQ_COLORS.green500;

  // Cell clickability per mode
  function isCellClickable(r: number, c: number): boolean {
    const cell = s.grid[r][c];
    if (isSwapComeback) return !!cell.ownerId && cell.ownerId !== myTeamId && (!swapFirst || s.grid[swapFirst.r][swapFirst.c].ownerId !== cell.ownerId);
    if (isSwapOne) return swapFirst ? (!!cell.ownerId && cell.ownerId !== myTeamId && !cell.shielded) : cell.ownerId === myTeamId;
    if (isStuck)    return cell.ownerId === myTeamId && (isStapelBonusMode || !cell.stuck);
    if (isShield)   return cell.ownerId === myTeamId && !cell.shielded;
    if (isSandLock) return !(cell.sandLockTtl && cell.sandLockTtl > 0)
      && cell.ownerId !== myTeamId && !cell.stuck && !cell.shielded;
    if (isSteal)    return !!cell.ownerId && cell.ownerId !== myTeamId && !cell.frozen && !cell.stuck && !cell.shielded;
    return !cell.ownerId;
  }

  const phaseLabel: React.ReactNode = (() => {
    const wrap = (slug: 'marker-swap' | 'marker-shield' | 'marker-sanduhr', text: string) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <QQIcon slug={slug} size={22} alt={text} />
        {text}
      </span>
    );
    if (isSwapComeback || isSwapOne) return wrap('marker-swap', lang === 'de' ? 'Tauschen' : 'Swap');
    if (isShield)   return wrap('marker-shield', lang === 'de' ? 'Schild' : 'Shield');
    if (isStuck)    return lang === 'de' ? '🏯 Stapeln' : '🏯 Stack';
    if (isSandLock) return wrap('marker-sanduhr', lang === 'de' ? 'Bann' : 'Ban');
    if (isSteal)  return t.placement.titleSteal[lang];
    if (isPhase2Choice) return t.placement.titlePhase2[lang];
    if (isJoker) return lang === 'de' ? '⭐ Joker!' : '⭐ Joker!';
    return t.placement.titlePlace[lang];
  })();

  const instructionText = (() => {
    if (isSwapComeback) return swapFirst ? t.placement.swap2nd[lang] : t.placement.tapOpponent12[lang];
    if (isSwapOne) return swapFirst
      ? (lang === 'de' ? 'Jetzt ein Gegner-Feld tippen' : 'Now tap an opponent\'s cell')
      : (lang === 'de' ? 'Erst ein eigenes Feld tippen' : 'First tap one of your own cells');
    if (isStuck) return isStapelBonusMode
      ? (lang === 'de' ? 'Eigenes Feld tippen (Bonus-Stapel, +1 Pkt — gleiches Feld mehrfach erlaubt)' : 'Tap one of your cells (bonus stack, +1 pt — same cell allowed multiple times)')
      : (lang === 'de' ? 'Eigenes Feld tippen (wird gestapelt, 2 Punkte)' : 'Tap one of your cells (stacked, 2 pts)');
    if (isShield) return lang === 'de'
      ? 'Eigenes Feld tippen — wird bis Spielende geschützt'
      : 'Tap one of your cells — shielded till end of game';
    if (isSandLock) return lang === 'de'
      ? 'Feld tippen (Gegner oder leer) — 3 Fragen gebannt'
      : 'Tap a cell (enemy or empty) — banned for 3 questions';
    if (isSteal) return t.placement.tapOpponent[lang];
    if (isJoker) return lang === 'de' ? '⭐ Bonus! Tippe auf ein freies Feld' : '⭐ Bonus! Tap an empty field';
    return t.placement.tapEmpty[lang];
  })();

  // Undo-available: Comeback action gewählt, aber noch nichts ausgeführt
  const myComebackStats = s.teamPhaseStats?.[myTeamId];
  const canUndoComeback = isMyTurn
    && pa === 'COMEBACK'
    && !!s.comebackAction
    && !swapFirst
    && !freeMode
    && !(s.comebackAction === 'PLACE_2' && myComebackStats && myComebackStats.placementsLeft < 2);

  // "Richtig, aber nicht schnellstes Team" — Hinweis, wenn dieses Team in der
  // Gewinner-Reihenfolge nicht der erste war (nur sinnvoll bei normalen
  // Platzierungen, nicht bei Comeback/FREE-Menü/Phase-2-Wahl).
  const winners = s.currentQuestionWinners ?? [];
  const myWinPosition = winners.indexOf(myTeamId);
  const showNotFastestHint = isMyTurn
    && pa !== 'COMEBACK'
    && myWinPosition > 0;
  const positionLabel = (() => {
    if (myWinPosition < 0) return '';
    const n = myWinPosition + 1;
    if (lang === 'de') return n === 2 ? '2.' : n === 3 ? '3.' : `${n}.`;
    const en = n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
    return en;
  })();

  return (
    <CozyCard borderColor={actionColor}>
      <div style={{ fontWeight: 900, fontSize: 18, color: actionColor, marginBottom: 12, textAlign: 'center' }}>
        {phaseLabel}
      </div>

      {showNotFastestHint && (
        <div style={{
          background: 'rgba(236, 72, 153, 0.12)',
          border: '1px solid rgba(236, 72, 153, 0.35)',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 12,
          fontSize: 13,
          lineHeight: 1.4,
          color: QQ_COLORS.brandPinkSoft,
          textAlign: 'center',
        }}>
          {lang === 'de'
            ? <><QQEmojiIcon emoji="✅"/> Auch richtig! Ihr setzt jetzt — als <b>{positionLabel}</b>.</>
            : <><QQEmojiIcon emoji="✅"/> Also correct! You're placing now — in <b>{positionLabel}</b>.</>}
        </div>
      )}

      {/* Phase 2: place 2 OR steal 1 */}
      {isPhase2Choice && !selecting && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          <CozyBtn color={QQ_COLORS.green500} onClick={() => chooseFreeAction('PLACE')}>{t.placement.place2[lang]}</CozyBtn>
          <CozyBtn color={QQ_COLORS.red500} onClick={() => chooseFreeAction('STEAL')}>{t.placement.steal1[lang]}</CozyBtn>
        </div>
      )}

      {/* Phase 3/4 FREE: action menu — saubere Trinity Place/Steal/Stapel.
          Bann, Schild, Tauschen wurden gedroppt zugunsten klarerer Klimakurve. */}
      {showFreeMenu && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {hasFreeCell && (
            <CozyBtn color={QQ_COLORS.green500} onClick={() => chooseFreeAction('PLACE')}>
              {lang === 'de' ? '📍 2 Felder setzen' : '📍 Place 2 cells'}
            </CozyBtn>
          )}
          <CozyBtn color={QQ_COLORS.red500} onClick={() => chooseFreeAction('STEAL')}>
            {lang === 'de' ? '⚡ Feld klauen' : '⚡ Steal a cell'}
          </CozyBtn>
          {/* Bann + Schild + Tauschen entfernt — Trinity Place/Steal/Stapel
              ist die finale Mechanik-Auswahl. */}
          {(phase >= 3 || (phase === 2 && s.totalPhases === 2)) && hasStapable && stapelsLeft > 0 && (
            <CozyBtn color="#06B6D4" onClick={() => chooseFreeAction('STAPEL')}>
              {lang === 'de'
                ? `🏯 Stapeln (+1 Punkt · ${stapelsLeft}/3 übrig)`
                : `🏯 Stack (+1 point · ${stapelsLeft}/3 left)`}
            </CozyBtn>
          )}
        </div>
      )}

      {/* Confirm button before grid appears */}
      {!showFreeMenu && !isPhase2Choice && !selecting && (
        <CozyBtn color={actionColor} onClick={() => setSelecting(true)}>
          {isSwapComeback || isSwapOne ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <QQIcon slug="marker-swap" size={24} alt="Swap" />
              {lang === 'de' ? 'Felder wählen' : 'Choose fields'}
            </span>
          ) : isStuck ? (lang === 'de' ? '🏯 Feld auswählen' : '🏯 Select cell to stack')
            : isShield ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <QQIcon slug="marker-shield" size={24} alt="Schild" />
                {lang === 'de' ? 'Feld zum Schützen wählen' : 'Select cell to shield'}
              </span>
            )
            : isSandLock ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <QQIcon slug="marker-sanduhr" size={24} alt="Bann" />
                {lang === 'de' ? 'Feld zum Bannen wählen' : 'Select cell to ban'}
              </span>
            )
            : isSteal    ? t.placement.confirmSteal[lang]
            : isJoker    ? (lang === 'de' ? '⭐ Jokerfeld setzen' : '⭐ Place joker cell')
            : t.placement.confirmPlace[lang]}
        </CozyBtn>
      )}

      {/* Grid. 2026-05-09 (Wolf-Bug 'grid springt beim setzen größer/kleiner'):
          gridTemplateColumns auf 1fr-minmax umgestellt — Mini-Status-Grid
          (Wartesicht) und Selecting-Grid haben jetzt EINE gemeinsame Maße,
          kein Layout-Shift mehr beim Wechsel zwischen den beiden Modi. */}
      {selecting && (
        <>
          <div style={{ fontSize: 13, color: QQ_COLORS.slate400, textAlign: 'center', marginBottom: 12 }}>
            {instructionText}
          </div>
          <div style={{
            // 2026-05-09 v3 (Wolf 'überlappen total — clickable + filled
            // unterschiedlich groß'): aspectRatio auf den GRID-Container statt
            // auf die Cells. Grid ist quadratisch, gridTemplateRows: 1fr +
            // gridTemplateColumns: 1fr → jede Cell garantiert quadratisch
            // (Cell = 1fr × 1fr eines square Grids). aspectRatio auf Cells
            // funktionierte vorher nicht zuverlässig — Browser ließen empty
            // Cells zur Row-Höhe stretchen.
            display: 'grid',
            gridTemplateColumns: `repeat(${s.gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${s.gridSize}, 1fr)`,
            aspectRatio: '1 / 1',
            gap: 3, width: '100%',
            padding: 6, borderRadius: 8,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxSizing: 'border-box',
          }}>
            {s.grid.flatMap((row, r) =>
              row.map((cell, c) => {
                const team = s.teams.find(t => t.id === cell.ownerId);
                const isSwapSelected = swapFirst && swapFirst.r === r && swapFirst.c === c;
                const isPending = pendingPick && pendingPick.r === r && pendingPick.c === c;
                // Wenn pendingPick existiert: andere Cells sind quasi 'gelocked'
                // (nur die pending Cell + ggf. Cancel-Button reagieren).
                const clickable = isCellClickable(r, c) && (!pendingPick || isPending === true);
                const isFrozenCell = cell.frozen && !cell.stuck;
                const isStuckCell = cell.stuck;
                const isShieldedCell = !!cell.shielded && !cell.stuck;
                const justStolen = stolenCells.has(`${r}-${c}`);
                const isStuckCandidate = isStuck && cell.ownerId === myTeamId && !cell.stuck;
                const isMine = cell.ownerId === myTeamId;
                const sandTtl = cell.sandLockTtl ?? 0;
                const isSandLocked = sandTtl > 0;
                // Wolf 2026-05-05 (Klaerung): team.color ist die EINE Farbe
                // pro Team, ueberall in der App identisch. 3D-Plaettchen-Look
                // bleibt (Inset-Highlight + Inset-Shadow + Hard-Edge-Drop + Soft-Drop).
                const tColor = team?.color ?? null;
                // 2026-05-09 v4 (Wolf 'reicht nur bg ohne den kreis'): Cell-
                // Styling weiter vereinfacht — Linear-Gradient raus (machte
                // diagonalen Hell/Dunkel-Verlauf der visuell wie "Disc innen"
                // wirkte), nur solid Team-Color BG. Inset-Highlight + Bottom-
                // Drop-Shadow bleiben minimal für leichten 3D-Effekt.
                const ownerShadow = tColor
                  ? [
                      'inset 0 1px 0 rgba(255,255,255,0.18)',
                      'inset 0 -1.5px 0 rgba(0,0,0,0.18)',
                      '1px 1.5px 0 rgba(0,0,0,0.30)',
                    ].join(', ')
                  : '';
                return (
                  <div key={`${r}-${c}`} role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : undefined}
                    aria-label={`${lang === 'de' ? 'Feld' : 'Cell'} ${r+1},${c+1}${team ? ` (${team.name})` : ''}${isFrozenCell ? ` (${lang === 'de' ? 'eingefroren' : 'frozen'})` : ''}${isPending ? ` (${lang === 'de' ? 'ausgewählt — Bestätigen' : 'selected — confirm'})` : ''}`}
                    onClick={() => handleCell(r, c)} onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleCell(r, c); } : undefined} style={{
                    // aspectRatio raus — Grid garantiert square cells via gridTemplateRows: 1fr
                    minWidth: 0, minHeight: 0, borderRadius: 4,
                    background: isPending ? `${actionColor}88`
                      : isSwapSelected ? `${actionColor}55`
                      : tColor ? tColor : 'rgba(255,255,255,0.04)',
                    border: isPending ? `2px dashed ${actionColor}`
                      : isSwapSelected ? `2px solid ${actionColor}`
                      : isStuckCell ? `1.5px solid rgba(236,72,153,0.9)`
                      : cell.jokerFormed ? `1.5px solid #EC4899`
                      : isStuckCandidate ? `1.5px solid #EC4899`
                      : clickable ? `1.5px solid ${actionColor}`
                      : tColor ? `1px solid ${tColor}`
                      : '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: Math.max(10, cellSize * 0.38),
                    cursor: clickable || isSwapSelected ? 'pointer' : 'default',
                    opacity: team ? 1 : (clickable || isSwapSelected ? 1 : 0.3),
                    transition: 'all 0.15s, box-shadow 0.4s ease, background 0.4s ease, border-color 0.4s ease',
                    boxShadow: isPending ? `0 0 0 3px ${actionColor}55, 0 0 16px ${actionColor}aa`
                      : isSwapSelected ? `0 0 12px ${actionColor}88${ownerShadow ? `, ${ownerShadow}` : ''}`
                      : isStuckCandidate ? `0 0 10px #EC489988${ownerShadow ? `, ${ownerShadow}` : ''}`
                      : isStuckCell
                        ? `${ownerShadow}, 0 0 10px rgba(236,72,153,0.55)`
                        : isFrozenCell ? `${ownerShadow}, 0 0 8px rgba(147,210,255,0.5)`
                        : isMine && tColor ? `${ownerShadow}, 0 0 8px ${tColor}77`
                        : team ? ownerShadow
                        : clickable ? `0 0 6px ${actionColor}44` : 'none',
                    animation: isPending ? 'tccellPendingPulse 1.2s ease-in-out infinite'
                      : justStolen ? 'stealFlash 0.8s ease-out both'
                      : tappedCell === `${r}-${c}` ? 'tccellTap 0.25s ease both' : undefined,
                    // Andere Cells gedimmt waehrend Pending-Pick aktiv ist, damit
                    // der Fokus auf der Auswahl bleibt.
                    ...(pendingPick && !isPending ? { opacity: team ? 0.55 : 0.22 } : {}),
                    position: 'relative' as const, overflow: 'visible' as const,
                  }}>
                    {isFrozenCell && (
                      <>
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: 6,
                          border: '2px solid rgba(147,210,255,0.7)',
                          background: 'rgba(147,210,255,0.2)',
                          animation: 'frostPulse 2.5s ease-in-out infinite',
                          pointerEvents: 'none', zIndex: 1,
                        }} />
                        <div style={{
                          position: 'absolute', top: -3, right: -3,
                          zIndex: 3, lineHeight: 0,
                        }}>
                          <QQIcon slug="marker-frost" size={Math.max(18, cellSize * 0.42)} alt="Frost" />
                        </div>
                      </>
                    )}
                    {isShieldedCell && (
                      <>
                        <div style={{
                          position: 'absolute', inset: -2, borderRadius: 8,
                          border: '2px solid rgba(236,72,153,0.85)',
                          background: 'rgba(236,72,153,0.12)',
                          animation: 'shieldGlow 2s ease-in-out infinite',
                          pointerEvents: 'none', zIndex: 1,
                        }} />
                        <div style={{
                          position: 'absolute', top: -4, right: -4,
                          zIndex: 3, lineHeight: 0,
                          filter: 'drop-shadow(0 0 6px rgba(236,72,153,0.7))',
                        }}>
                          <QQIcon slug="marker-shield" size={Math.max(18, cellSize * 0.44)} alt="Schild" />
                        </div>
                      </>
                    )}
                    {isSandLocked && (
                      <>
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: 6,
                          border: '2px solid rgba(168,85,247,0.85)',
                          background: 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(126,34,206,0.12))',
                          boxShadow: 'inset 0 0 10px rgba(168,85,247,0.4)',
                          animation: 'frostPulse 2.5s ease-in-out infinite',
                          pointerEvents: 'none', zIndex: 1,
                        }} />
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          pointerEvents: 'none', zIndex: 3,
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))',
                          // C7: Sanduhr droppt + tickt kontinuierlich.
                          animation: 'sanduhrDrop 0.6s var(--qq-ease-bounce) both, sanduhrTick 2.5s ease-in-out 0.65s infinite',
                          transformOrigin: 'center',
                        }}>
                          <QQIcon slug="marker-sanduhr" size={Math.max(20, cellSize * 0.6)} alt="Bann" />
                        </div>
                        <div style={{
                          position: 'absolute', top: -4, right: -4,
                          minWidth: Math.max(14, cellSize * 0.34),
                          height: Math.max(14, cellSize * 0.34),
                          padding: `0 ${Math.max(2, cellSize * 0.04)}px`,
                          borderRadius: '999px',
                          background: 'linear-gradient(135deg, #A855F7, #6B21A8)',
                          border: '2px solid #2E1065',
                          color: '#FFFFFF',
                          fontSize: Math.max(9, cellSize * 0.22),
                          fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.35), 0 0 6px rgba(168,85,247,0.6)',
                          zIndex: 5, fontVariantNumeric: 'tabular-nums',
                        }}>{sandTtl}</div>
                      </>
                    )}
                    <span style={{
                      position: 'relative', zIndex: 2,
                      opacity: isFrozenCell ? 0.5 : undefined,
                      filter: isFrozenCell ? 'saturate(0.4) brightness(1.2)' : undefined,
                      display: 'inline-block',
                      animation: isStuckCell
                        ? 'stapelDrop 0.6s var(--qq-ease-bounce) both'
                        : justStolen
                          ? 'stealCrashIn 0.55s var(--qq-ease-bounce) both'
                          : undefined,
                    }}>
                      {/* 2026-05-05 (Wolf-Bug 'runde felder'): flat-Prop —
                          Avatar-Disc-BG raus, nur Emoji-Glyph. Cell selbst
                          traegt schon die Team-Farbe als BG. Plus Emoji
                          groesser (0.82 → 0.95) wie auf /beamer.
                          2026-05-07 (Live-Test-Bug): Joker-Cells (cell.jokerFormed)
                          zeigten auf /team nichts, /beamer aber schon. Vorrang:
                          Stack > Joker > Avatar (Stack-Bonus auf Joker-Cell
                          ueberschreibt visuell, weil 🏯 die staerkere Aussage ist). */}
                      {/* 2026-05-09 v2 (Wolf TODO 1 'gestackte Felder besser
                          markieren'): 🏯 (Burg = Verb) → 🔒 (Schloss = Resultat
                          „lock = nicht klaubar"). BG-Teamfarbe bleibt — semantisch
                          klarer als das Action-Verb. */}
                      {isStuckCell
                        ? <QQEmojiIcon emoji="🔒"/>
                        : cell.jokerFormed
                          ? <JokerIcon i={r + c} size={Math.max(24, Math.floor(cellSize * 0.95))} alt="Joker" eurovisionMode={!!s.theme?.eurovisionMode} square />
                          : team
                            ? <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={Math.max(24, Math.floor(cellSize * 0.95))} flat />
                            : null}
                    </span>
                    {/* Stapel-Dust-Ring: expandiert einmalig beim Stuck-Mount. */}
                    {isStuckCell && (
                      <div style={{
                        position: 'absolute', inset: -4, borderRadius: 8,
                        border: '2px solid rgba(236,72,153,0.7)',
                        animation: 'stapelDustRing 0.55s ease-out 0.1s both',
                        pointerEvents: 'none', zIndex: 4,
                      }} />
                    )}
                    {/* Steal-Burst: roter Ring platzt beim Klau nach aussen. */}
                    {justStolen && (
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: 6,
                        border: '3px solid rgba(239,68,68,0.9)',
                        animation: 'stealBurst 0.6s ease-out both',
                        pointerEvents: 'none', zIndex: 4,
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pending-Pick Hint — Bottom-Buttons entfernt zugunsten 2-Tap-
              Confirm direkt am Grid (Wolfs Wunsch). Hint-Text macht den
              Flow transparent. */}
          {pendingPick && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 16,
              background: `linear-gradient(135deg, ${actionColor}1a, ${actionColor}08)`,
              border: `1px solid ${actionColor}55`,
              fontSize: 14, fontWeight: 900, color: QQ_COLORS.slate200, textAlign: 'center',
              lineHeight: 1.4,
              animation: 'tcfloat 1.6s ease-in-out infinite',
            }}>
              <div style={{ marginBottom: 4 }}>
                {pendingPick.kind === 'place'  ? (lang === 'de' ? '👉 Hier setzen?' : '👉 Place here?')
                : pendingPick.kind === 'steal' ? (lang === 'de' ? '👉 Dieses Feld klauen?' : '👉 Steal this cell?')
                : pendingPick.kind === 'ban'   ? (lang === 'de' ? '👉 Dieses Feld bannen?' : '👉 Ban this cell?')
                : pendingPick.kind === 'shield'? (lang === 'de' ? '👉 Dieses Feld schützen?' : '👉 Shield this cell?')
                :                                (lang === 'de' ? '👉 Dieses Feld stapeln?' : '👉 Stack this cell?')}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: QQ_COLORS.slate400 }}>
                {lang === 'de'
                  ? 'Tippe nochmal zum Bestätigen — oder ein anderes Feld zum Wechseln.'
                  : 'Tap again to confirm — or another cell to switch.'}
              </div>
            </div>
          )}

          <button onClick={() => { setSelecting(false); setSwapFirst(null); setFreeMode(null); setPendingPick(null); }} style={{
            marginTop: 12, width: '100%', padding: '8px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
            color: QQ_COLORS.slate600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
          }}>
            {t.placement.cancel[lang]}
          </button>
        </>
      )}

      {canUndoComeback && (
        <button
          onClick={() => { setSelecting(false); setSwapFirst(null); setFreeMode(null); emit('qq:comebackUndo', { roomCode, teamId: myTeamId }); }}
          style={{
            marginTop: 14, width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid rgba(148,163,184,0.35)', background: 'rgba(148,163,184,0.08)',
            color: QQ_COLORS.slate300, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
          }}>
          🔙 {lang === 'de' ? 'Andere Comeback-Aktion wählen' : 'Choose different comeback action'}
        </button>
      )}

      {/* Aktion-Abbrechen wenn freeMode gesetzt aber Grid noch nicht offen
          ist. Sonst war der einzige Cancel-Button im Grid-Subtree → User kam
          nach Free-Mode-Wahl nicht mehr zurück ins Action-Menü ohne erst
          selecting zu starten. */}
      {isMyTurn && (isFree || pa === 'PLACE_2') && freeMode && !selecting && (
        <button
          onClick={() => { setFreeMode(null); setSwapFirst(null); setPendingPick(null); }}
          style={{
            marginTop: 12, width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid rgba(148,163,184,0.35)', background: 'rgba(148,163,184,0.08)',
            color: QQ_COLORS.slate300, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
          }}>
          🔙 {lang === 'de' ? 'Andere Aktion wählen' : 'Choose different action'}
        </button>
      )}
    </CozyCard>
  );
}

export function ComebackCard({ state: s, myTeamId, isMine, emit, roomCode, lang = 'de' }: {
  state: QQStateUpdate; myTeamId: string; isMine: boolean; emit: any; roomCode: string; lang?: 'de' | 'en';
}) {
  const comebackTeam = s.teams.find(t => t.id === s.comebackTeamId);
  const hl = s.comebackHL;
  const myTeam = s.teams.find(t => t.id === myTeamId);
  const isYearUnitHL = /jahr|year/i.test(hl?.currentPair?.unit ?? '');
  const fmtHL = (n: number) => {
    if (isYearUnitHL) return String(Math.round(n));
    const abs = Math.abs(n);
    // 2026-05-10 (Wolf 'EN-Mode zeigt DE-Suffix'): Mrd./Mio. nur bei DE.
    const isEn = lang === 'en';
    if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + (isEn ? ' bn' : ' Mrd.');
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + (isEn ? ' M' : ' Mio.');
    if (abs >= 10_000) return Math.round(n / 1000) + 'k';
    if (abs >= 1000) return n.toLocaleString(isEn ? 'en-US' : 'de-DE');
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  };

  // ── H/L-Phase: Frage oder Warten ────────────────────────────────────────
  if (hl && (hl.phase === 'question' || hl.phase === 'reveal') && hl.currentPair && isMine) {
    const pair = hl.currentPair;
    const myAnswer = hl.answers[myTeamId];
    const answered = myAnswer != null;
    const isReveal = hl.phase === 'reveal';
    const correctChoice = pair.subjectValue > pair.anchorValue ? 'higher' : 'lower';
    const myCorrect = isReveal && myAnswer === correctChoice;
    const teamColor = myTeam?.color ?? QQ_COLORS.brandPink;
    const submit = (choice: 'higher' | 'lower') => {
      if (answered) return;
      safeEmit(emit, 'qq:comebackHLAnswer', { roomCode, teamId: myTeamId, choice });
    };
    return (
      <CozyCard borderColor={isReveal ? (myCorrect ? QQ_COLORS.green500 : QQ_COLORS.red500) : teamColor}>
        {/* Header */}
        <div style={{
          fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: QQ_COLORS.brandPinkSoft, textAlign: 'center', marginBottom: 10,
        }}>
          ⚡ {lang === 'en' ? 'More or Less' : 'Mehr oder Weniger'} — {lang === 'en' ? 'Round' : 'Runde'} {hl.round + 1}/{hl.rounds}
        </div>

        {/* Frage-Text — Format-B custom, Format-A auto-generiert.
            2026-05-10 (Wolf-Bug 'EN-Spiel zeigt DE-Frage'): Fallback auf
            *En-Felder wenn lang='en'. */}
        {(() => null)()}
        <div style={{
          fontSize: 14, fontWeight: 700, color: QQ_COLORS.slate300, textAlign: 'center',
          marginBottom: 12, lineHeight: 1.4,
        }}>
          {(() => {
            const isEn = lang === 'en';
            const pAnchor = isEn ? (pair.anchorLabelEn ?? pair.anchorLabel) : pair.anchorLabel;
            const pSubject = isEn ? (pair.subjectLabelEn ?? pair.subjectLabel) : pair.subjectLabel;
            const pUnit = isEn ? (pair.unitEn ?? pair.unit) : pair.unit;
            const pCustom = isEn ? (pair.customQuestionEn ?? pair.customQuestion) : pair.customQuestion;
            return pCustom
              ? pCustom
              : (isEn
                  ? `Does ${pSubject} have more or less ${pUnit} than ${pAnchor}?`
                  : `Hat ${pSubject} mehr oder weniger ${pUnit} als ${pAnchor}?`);
          })()}
        </div>

        {/* Anchor-Info */}
        <div style={{
          padding: '12px 14px', borderRadius: 16,
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.38)',
          textAlign: 'center', marginBottom: 10,
        }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: QQ_COLORS.green300, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
            {lang === 'en' ? (pair.anchorLabelEn ?? pair.anchorLabel) : pair.anchorLabel}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: QQ_COLORS.green300, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {fmtHL(pair.anchorValue)}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: QQ_COLORS.slate300, opacity: 0.7, marginTop: 2 }}>
            {lang === 'en' ? (pair.unitEn ?? pair.unit) : pair.unit}
          </div>
        </div>

        {/* Subject */}
        <div style={{
          padding: '12px 14px', borderRadius: 16,
          background: isReveal ? 'rgba(236,72,153,0.18)' : 'rgba(236,72,153,0.1)',
          border: isReveal ? '2px solid #EC4899' : '1px dashed rgba(236,72,153,0.5)',
          textAlign: 'center', marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: QQ_COLORS.brandPinkSoft, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
            {lang === 'en' ? (pair.subjectLabelEn ?? pair.subjectLabel) : pair.subjectLabel}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: QQ_COLORS.brandPink, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {isReveal ? fmtHL(pair.subjectValue) : '???'}
          </div>
          {!isReveal && (
            <div style={{ fontSize: 11, fontWeight: 700, color: QQ_COLORS.slate300, opacity: 0.7, marginTop: 2 }}>
              {lang === 'en' ? 'Higher or lower?' : 'Mehr oder weniger?'}
            </div>
          )}
          {isReveal && (
            <div style={{
              marginTop: 6, padding: '4px 12px', borderRadius: 999,
              background: correctChoice === 'higher' ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)',
              border: `1px solid ${correctChoice === 'higher' ? QQ_COLORS.green500 : QQ_COLORS.red500}`,
              fontSize: 12, fontWeight: 900, color: '#fff',
              display: 'inline-block',
            }}>
              {correctChoice === 'higher'
                ? (lang === 'en' ? 'HIGHER ↑' : 'MEHR ↑')
                : (lang === 'en' ? 'LOWER ↓' : 'WENIGER ↓')}
            </div>
          )}
        </div>

        {/* Action: Buttons (question) oder Ergebnis (reveal) */}
        {!isReveal && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => submit('higher')}
              disabled={answered}
              style={{
                padding: '16px 10px', borderRadius: 16,
                background: myAnswer === 'higher' ? QQ_COLORS.green500 : 'rgba(34,197,94,0.15)',
                border: `2px solid ${myAnswer === 'higher' ? QQ_COLORS.green500 : 'rgba(34,197,94,0.5)'}`,
                color: myAnswer === 'higher' ? '#fff' : QQ_COLORS.green300,
                fontSize: 20, fontWeight: 900, fontFamily: 'inherit',
                cursor: answered ? 'default' : 'pointer',
                opacity: answered && myAnswer !== 'higher' ? 0.35 : 1,
                transition: 'all 0.2s ease',
              }}
            >↑<br/>{lang === 'en' ? 'MORE' : 'MEHR'}</button>
            <button
              onClick={() => submit('lower')}
              disabled={answered}
              style={{
                padding: '16px 10px', borderRadius: 16,
                background: myAnswer === 'lower' ? QQ_COLORS.red500 : 'rgba(239,68,68,0.15)',
                border: `2px solid ${myAnswer === 'lower' ? QQ_COLORS.red500 : 'rgba(239,68,68,0.5)'}`,
                color: myAnswer === 'lower' ? '#fff' : QQ_COLORS.red300,
                fontSize: 20, fontWeight: 900, fontFamily: 'inherit',
                cursor: answered ? 'default' : 'pointer',
                opacity: answered && myAnswer !== 'lower' ? 0.35 : 1,
                transition: 'all 0.2s ease',
              }}
            >↓<br/>{lang === 'en' ? 'LESS' : 'WENIGER'}</button>
          </div>
        )}
        {!isReveal && answered && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.4)',
            fontSize: 13, fontWeight: 900, color: QQ_COLORS.brandPinkSoft, textAlign: 'center',
          }}>
            ⏳ {lang === 'en' ? 'Waiting for other teams…' : 'Warte auf andere Teams…'}
          </div>
        )}
        {isReveal && (
          <div style={{
            padding: '12px 14px', borderRadius: 16, textAlign: 'center',
            background: myCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.18)',
            border: `2px solid ${myCorrect ? QQ_COLORS.green500 : QQ_COLORS.red500}`,
            fontSize: 16, fontWeight: 900,
            color: myCorrect ? QQ_COLORS.green300 : QQ_COLORS.red300,
          }}>
            {myCorrect
              ? (lang === 'en' ? '✓ Correct! +1 cell to steal' : '✓ Richtig! +1 Feld zum Klauen')
              : (lang === 'en' ? '✕ Wrong this round' : '✕ Diese Runde daneben')}
            {(hl.winnings[myTeamId] ?? 0) > 0 && (
              <div style={{ fontSize: 12, fontWeight: 900, marginTop: 4, opacity: 0.85 }}>
                {lang === 'en' ? 'Total so far: ' : 'Insgesamt bisher: '}
                {hl.winnings[myTeamId]} {hl.winnings[myTeamId] === 1
                  ? (lang === 'en' ? 'cell' : 'Feld')
                  : (lang === 'en' ? 'cells' : 'Felder')}
              </div>
            )}
          </div>
        )}
      </CozyCard>
    );
  }

  // ── H/L-Intro-Phase: Kurze Info für tied-last Team ───────────────────────
  if (hl && hl.phase === 'intro' && isMine) {
    return (
      <CozyCard borderColor={QQ_COLORS.brandPink}>
        <div style={{ textAlign: 'center', padding: '6px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>⚡</div>
          <div style={{ fontWeight: 900, color: QQ_COLORS.brandPinkSoft, fontSize: 17, marginBottom: 10 }}>
            {lang === 'en' ? 'Comeback!' : 'Comeback!'}
          </div>
          {/* Prominenter Rundenzaehler fuer das Team */}
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6,
            marginBottom: 8,
          }}>
            <span style={{
              fontSize: 44, fontWeight: 900, color: QQ_COLORS.brandPink, lineHeight: 1,
              textShadow: '0 0 20px rgba(236,72,153,0.55)',
              fontVariantNumeric: 'tabular-nums',
            }}>{hl.rounds}</span>
            <span style={{
              fontSize: 15, fontWeight: 900, color: QQ_COLORS.brandPinkSoft,
            }}>
              {hl.rounds === 1
                ? (lang === 'en' ? 'Round' : 'Runde')
                : (lang === 'en' ? 'Rounds' : 'Runden')}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: QQ_COLORS.slate300, lineHeight: 1.4 }}>
            {lang === 'en'
              ? `"More or Less" — each correct = 1 cell stolen from the leader.`
              : `„Mehr oder Weniger" — pro Richtig = 1 Feld vom 1. Platz.`}
          </div>
        </div>
      </CozyCard>
    );
  }

  // ── Zuschauer (nicht tied-last Team) ─────────────────────────────────────
  if (!isMine) {
    return (
      <CozyCard>
        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          {comebackTeam && (
            <>
              <QQTeamAvatar avatarId={comebackTeam.avatarId} teamEmoji={comebackTeam.emoji} size={40} style={{
                margin: '0 auto',
                animation: 'tcfloat 2s ease-in-out infinite',
              }} />
              <div style={{ fontWeight: 900, color: comebackTeam.color, marginTop: 6 }}>{comebackTeam.name}</div>
            </>
          )}
          <div style={{ fontSize: 14, color: QQ_COLORS.brandPink, fontWeight: 700, marginTop: 8 }}>{t.comeback.otherTeam[lang]}</div>
          {hl && hl.teamIds.length > 1 && (
            <div style={{ fontSize: 12, color: QQ_COLORS.slate400, marginTop: 4 }}>
              {lang === 'en'
                ? `${hl.teamIds.length} teams play "More or Less"`
                : `${hl.teamIds.length} Teams spielen „Mehr oder Weniger"`}
            </div>
          )}
        </div>
      </CozyCard>
    );
  }

  if (s.comebackAction) {
    // After choosing comeback action, the game transitions to PLACEMENT phase
    // PLACE_2 and STEAL_1 are handled by PlacementCard
    // SWAP_2 needs its own interactive grid here
    if (s.comebackAction === 'SWAP_2' && s.phase === 'COMEBACK_CHOICE') {
      return (
        <CozyCard borderColor={QQ_COLORS.violet500}>
          <div style={{ fontWeight: 900, color: QQ_COLORS.slate200, textAlign: 'center', fontSize: 17 }}>
            {lang === 'de' ? '🔄 Tausch wird vorbereitet…' : '🔄 Preparing swap…'}
          </div>
        </CozyCard>
      );
    }
    return (
      <CozyCard borderColor={QQ_COLORS.brandPink}>
        <div style={{ fontWeight: 900, color: QQ_COLORS.slate200, textAlign: 'center', fontSize: 17 }}>
          {s.comebackAction === 'PLACE_2' && t.comeback.activePlace[lang]}
          {s.comebackAction === 'STEAL_1' && t.comeback.activeSteal[lang]}
          {s.comebackAction === 'SWAP_2'  && t.comeback.activeSwap[lang]}
        </div>
      </CozyCard>
    );
  }

  // First-time choice or returning after undo — show options
  /* fallthrough to return below */

  // Availability check — only offer comeback actions that can actually be executed
  const freeCellCount = s.grid.reduce((sum, row) => sum + row.filter(c => c.ownerId === null).length, 0);
  const opponentCells: Record<string, number> = {};
  for (const row of s.grid) {
    for (const c of row) {
      if (c.ownerId && c.ownerId !== myTeamId) {
        opponentCells[c.ownerId] = (opponentCells[c.ownerId] ?? 0) + 1;
      }
    }
  }
  const opponentTotal = Object.values(opponentCells).reduce((s, n) => s + n, 0);
  const distinctOpponents = Object.keys(opponentCells).length;

  const canPlace2 = freeCellCount >= 2;
  const canSteal1 = opponentTotal >= 1;
  const canSwap2  = opponentTotal >= 2 && distinctOpponents >= 2;

  const options: Array<{ action: string; icon: string; iconSlug?: 'marker-swap'; label: string; desc: string; color: string; available: boolean; reason: string }> = [
    { action: 'PLACE_2', icon: '📍', label: t.comeback.place2[lang], desc: t.comeback.place2desc[lang], color: QQ_COLORS.green500, available: canPlace2, reason: lang === 'de' ? 'zu wenig freie Felder' : 'not enough free cells' },
    { action: 'STEAL_1', icon: '⚡', label: t.comeback.steal1[lang], desc: t.comeback.steal1desc[lang], color: QQ_COLORS.red500, available: canSteal1, reason: lang === 'de' ? 'keine gegnerischen Felder' : 'no opponent cells' },
    { action: 'SWAP_2',  icon: '🔄', iconSlug: 'marker-swap', label: t.comeback.swap2[lang], desc: t.comeback.swap2desc[lang], color: QQ_COLORS.violet500, available: canSwap2,  reason: lang === 'de' ? 'weniger als 2 gegnerische Teams' : 'fewer than 2 opposing teams' },
  ];
  const anyAvailable = options.some(o => o.available);

  return (
    <CozyCard borderColor={QQ_COLORS.brandPink}>
      <div style={{ fontWeight: 900, fontSize: 18, color: QQ_COLORS.brandPink, marginBottom: 16, textAlign: 'center' }}>
        {t.comeback.title[lang]}
      </div>
      {!anyAvailable && (
        <div style={{ fontSize: 13, color: QQ_COLORS.slate400, textAlign: 'center', marginBottom: 12, fontStyle: 'italic' }}>
          {lang === 'de' ? 'Keine Aktion möglich — warte auf Moderator.' : 'No action possible — wait for moderator.'}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map(opt => {
          const disabled = !opt.available;
          return (
            <button key={opt.action} disabled={disabled}
              onClick={() => {
                if (disabled) return;
                if (navigator.vibrate) navigator.vibrate(30);
                safeEmit(emit, 'qq:comebackChoice', { roomCode, teamId: myTeamId, action: opt.action });
              }}
              style={{
                padding: '14px 16px', borderRadius: 16,
                cursor: disabled ? 'not-allowed' : 'pointer',
                background: COZY_CARD_BG,
                border: `2px solid ${disabled ? 'rgba(255,255,255,0.08)' : opt.color + '44'}`,
                textAlign: 'left', fontFamily: 'inherit',
                display: 'flex', gap: 12, alignItems: 'center',
                transition: 'all 0.15s',
                opacity: disabled ? 0.4 : 1,
                filter: disabled ? 'grayscale(0.7)' : undefined,
              }}>
              {opt.iconSlug
                ? <QQIcon slug={opt.iconSlug} size={32} alt={opt.label} />
                : <span style={{ fontSize: 28, lineHeight: 1 }}><QQEmojiIcon emoji={opt.icon}/></span>}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, color: disabled ? QQ_COLORS.slate500 : opt.color, fontSize: 15 }}>{opt.label}</div>
                <div style={{ fontFamily: "'Caveat', cursive", fontSize: 13, color: disabled ? QQ_COLORS.slate600 : QQ_COLORS.slate600, marginTop: 2 }}>
                  {disabled ? `🚫 ${opt.reason}` : opt.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </CozyCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4×4 CONNECTIONS — Team-Card (Multi-Select + Submit)
// ═══════════════════════════════════════════════════════════════════════════════
const CONN_GROUP_COLORS = [QQ_COLORS.brandPink, QQ_COLORS.green500, QQ_COLORS.blue400, QQ_COLORS.violet400];

export function ConnectionsTeamCard({ state: s, myTeamId, emit, roomCode, lang = 'de' }: {
  state: QQStateUpdate;
  myTeamId: string;
  emit: (event: string, payload?: unknown) => Promise<QQAck>;
  roomCode: string;
  lang?: 'de' | 'en';
}) {
  const de = lang === 'de';
  const c = s.connections;
  const myTeam = s.teams.find(t => t.id === myTeamId);
  const teamColor = myTeam?.color ?? QQ_COLORS.brandPink;

  if (!c) {
    return (
      <CozyCard borderColor={QQ_COLORS.brandPink}>
        <div style={{ padding: 18, textAlign: 'center', color: QQ_COLORS.slate400 }}>
          {de ? '4×4 wird vorbereitet…' : 'Loading…'}
        </div>
      </CozyCard>
    );
  }

  const tp = c.teamProgress[myTeamId];
  const found = tp?.foundGroupIds.length ?? 0;
  const fails = tp?.failedAttempts ?? 0;
  const locked = tp?.isLockedOut ?? false;
  const isFinished = (tp?.finishedAt ?? null) != null;
  const selected = tp?.selectedItems ?? [];
  // Items aus eigenen gefundenen Gruppen
  const myFoundItems = new Set<string>();
  (tp?.foundGroupIds ?? []).forEach(gid => {
    const g = c.payload.groups.find(gg => gg.id === gid);
    g?.items.forEach(it => myFoundItems.add(it));
  });
  // Map item → meine gefundene Gruppe (für Färbung)
  const itemToMyGroup = new Map<string, { idx: number; color: string }>();
  (tp?.foundGroupIds ?? []).forEach(gid => {
    const g = c.payload.groups.find(gg => gg.id === gid);
    if (!g) return;
    const idx = c.payload.groups.findIndex(gg => gg.id === gid);
    g.items.forEach(it => itemToMyGroup.set(it, { idx, color: CONN_GROUP_COLORS[idx] }));
  });

  // Phase-spezifische Hauptansicht
  if (c.phase === 'intro') {
    return (
      <CozyCard borderColor={QQ_COLORS.brandPink}>
        <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🧩</div>
          {/* Synchron mit Beamer-Header: 'Großes Finale' / 'Grand Finale'. */}
          <div style={{ fontSize: 26, fontWeight: 900, color: QQ_COLORS.brandPinkSoft, textShadow: '0 0 20px rgba(236,72,153,0.4)' }}>
            {de ? 'Großes Finale' : 'Grand Finale'}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: QQ_COLORS.slate200, lineHeight: 1.4 }}>
            {de
              ? 'Findet 4 Gruppen — gewinnt Felder fürs Spielfeld.'
              : 'Find 4 groups — earn cells on the board.'}
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            fontSize: 13, color: QQ_COLORS.slate300, lineHeight: 1.4,
          }}>
            <div>🎯 {de ? '4 Begriffe wählen → abgeben' : 'Pick 4 → submit'}</div>
            <div>🏯 {de ? '1 Gruppe = 1 Stapel-Bonus (+1 Pkt)' : '1 group = 1 stack-bonus (+1 pt)'}</div>
            <div>❌ {de ? `${c.maxFailedAttempts} Fehler erlaubt` : `${c.maxFailedAttempts} fails allowed`}</div>
          </div>
          <div style={{ fontSize: 12, color: QQ_COLORS.slate400, marginTop: 4 }}>
            {de ? 'Wartet aufs Startsignal…' : 'Waiting for moderator…'}
          </div>
        </div>
      </CozyCard>
    );
  }

  if (c.phase === 'reveal' || c.phase === 'placement' || c.phase === 'done') {
    return (
      <CozyCard borderColor={teamColor}>
        <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: teamColor }}>
              {myTeam?.name}
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: 999,
              background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.5)',
              fontSize: 12, fontWeight: 900, color: QQ_COLORS.green300,
            }}>
              {found} {de ? 'Gruppen' : 'groups'} {found > 0 ? `→ ×${found} ${de ? 'Stapel' : 'stacks'}` : ''}
            </span>
          </div>
          {locked && (
            <div style={{ fontSize: 13, color: QQ_COLORS.red300, fontWeight: 900, textAlign: 'center' }}>
              {de ? `Ausgeschieden nach ${fails} Fehlversuchen` : `Out after ${fails} fails`}
            </div>
          )}
          {/* 2026-05-07 (Wolf-Bug): waehrend Connections-Placement (Stapel-
              Phase nach Finale) zeigt /team jetzt das aktive Team statt nur
              "Setzen laeuft" — analog zur normalen PlacementCard-Wartesicht. */}
          {c.phase === 'placement' && (() => {
            const placingTeam = s.teams.find(t => t.id === s.pendingFor);
            if (!placingTeam) {
              return (
                <div style={{ fontSize: 12, color: QQ_COLORS.slate400, textAlign: 'center' }}>
                  {de ? 'Schaut auf den Beamer — Setzen läuft.' : 'Watch the beamer — placement in progress.'}
                </div>
              );
            }
            const isMine = placingTeam.id === myTeamId;
            return (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 12,
                background: `${placingTeam.color}14`,
                border: `1px solid ${placingTeam.color}55`,
              }}>
                <QQTeamAvatar avatarId={placingTeam.avatarId} teamEmoji={placingTeam.emoji} size={36} style={{
                  animation: 'tcfloat 2s ease-in-out infinite',
                }} />
                <div style={{ fontSize: 14, fontWeight: 900, color: placingTeam.color }}>
                  {isMine ? (de ? 'Du bist dran!' : 'Your turn!') : placingTeam.name}
                </div>
                <div style={{ fontSize: 11, color: QQ_COLORS.slate400, fontWeight: 700 }}>
                  {isMine
                    ? (de ? 'Stapel-Feld waehlen' : 'Pick a stack cell')
                    : (de ? 'stapelt gerade' : 'is stacking')}
                  <AnimatedDots />
                </div>
              </div>
            );
          })()}
          {c.phase === 'reveal' && (
            <div style={{ fontSize: 12, color: QQ_COLORS.slate400, textAlign: 'center' }}>
              {de ? 'Auflösung läuft…' : 'Reveal in progress…'}
            </div>
          )}
          {c.phase === 'done' && (
            <div style={{ fontSize: 12, color: QQ_COLORS.slate400, textAlign: 'center' }}>
              {de ? 'Finale beendet — Punkte werden vergeben' : 'Finale done — scoring'}
            </div>
          )}
        </div>
      </CozyCard>
    );
  }

  // c.phase === 'active' → Spielzeit
  return (
    <CozyCard borderColor={teamColor}>
      <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header: Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0,1,2,3].map(i => (
              <span key={i} style={{
                width: 14, height: 14, borderRadius: 4,
                background: i < found ? QQ_COLORS.green500 : 'rgba(255,255,255,0.10)',
                border: i < found ? '1px solid #16A34A' : '1px solid rgba(255,255,255,0.18)',
              }} />
            ))}
          </div>
          <ConnectionsTeamTimer endsAt={c.endsAt} />
          <span style={{
            padding: '3px 10px', borderRadius: 999,
            background: fails > 0 ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${fails > 0 ? QQ_COLORS.red500 : 'rgba(255,255,255,0.12)'}`,
            fontSize: 11, fontWeight: 900,
            color: fails > 0 ? QQ_COLORS.red300 : QQ_COLORS.slate400,
          }}>
            {de ? 'Fehler' : 'Fails'} {fails}/{c.maxFailedAttempts}
          </span>
        </div>

        {locked || isFinished ? (
          <div style={{
            padding: 14, textAlign: 'center', borderRadius: 16,
            background: locked ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)',
            border: `1px solid ${locked ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
            color: locked ? QQ_COLORS.red300 : QQ_COLORS.green300,
            fontWeight: 900, fontSize: 14,
          }}>
            {locked
              ? (de ? `🚫 Ausgeschieden — wartet auf Auflösung.` : `🚫 Out — wait for reveal.`)
              : (de ? `✓ Alle 4 Gruppen gefunden! Wartet aufs Auflösen.` : `✓ All 4 groups found! Wait for reveal.`)}
          </div>
        ) : (
          <>
            {/* 4×4 Grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6, width: '100%',
            }}>
              {c.itemOrder.map((item, i) => {
                const isMyFound = myFoundItems.has(item);
                const myGroupColor = itemToMyGroup.get(item)?.color;
                const isSelected = selected.includes(item);
                const disabled = isMyFound;
                return (
                  <button
                    key={`${item}-${i}`}
                    disabled={disabled}
                    onClick={() => safeEmit(emit, 'qq:connectionsSelectItem', { roomCode, teamId: myTeamId, item })}
                    style={{
                      padding: '8px 2px', borderRadius: 8,
                      background: isMyFound && myGroupColor
                        ? `linear-gradient(135deg, ${myGroupColor}38, ${myGroupColor}15)`
                        : isSelected
                          ? `${teamColor}30`
                          : 'rgba(255,255,255,0.04)',
                      border: isMyFound && myGroupColor
                        ? `2px solid ${myGroupColor}`
                        : isSelected
                          ? `2px solid ${teamColor}`
                          : '2px solid rgba(255,255,255,0.10)',
                      color: isMyFound ? '#fff' : isSelected ? '#fff' : QQ_COLORS.slate200,
                      fontSize: 'clamp(10px, 3vw, 13px)',
                      fontWeight: 900, lineHeight: 1.1,
                      cursor: disabled ? 'default' : 'pointer',
                      minHeight: 56,
                      opacity: disabled ? 0.7 : 1,
                      transition: 'all 0.18s ease',
                      fontFamily: 'inherit',
                      // Bricht NUR ein Wort, das länger als die Spalte ist (kein Char-by-Char-Stacking).
                      overflowWrap: 'break-word',
                      wordBreak: 'normal',
                      hyphens: 'auto',
                    }}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {/* Submit-Button */}
            <button
              disabled={selected.length !== 4}
              onClick={() => safeEmit(emit, 'qq:connectionsSubmit', { roomCode, teamId: myTeamId })}
              style={{
                padding: '14px 18px', borderRadius: 16,
                border: 'none',
                background: selected.length === 4
                  ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                  : 'rgba(255,255,255,0.06)',
                color: selected.length === 4 ? '#0a1f0d' : QQ_COLORS.slate500,
                fontSize: 16, fontWeight: 900,
                cursor: selected.length === 4 ? 'pointer' : 'not-allowed',
                boxShadow: selected.length === 4 ? '0 4px 14px rgba(34,197,94,0.4)' : 'none',
                fontFamily: 'inherit',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}
            >
              {selected.length === 4
                ? (de ? '✓ Gruppe abgeben' : '✓ Submit group')
                : (de ? `${selected.length}/4 ausgewählt` : `${selected.length}/4 selected`)}
            </button>
          </>
        )}
      </div>
    </CozyCard>
  );
}

function ConnectionsTeamTimer({ endsAt }: { endsAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - Date.now()) / 1000));
  useEffect(() => {
    const iv = setInterval(() => {
      setRemaining(Math.max(0, (endsAt - Date.now()) / 1000));
    }, 500);
    return () => clearInterval(iv);
  }, [endsAt]);
  const m = Math.floor(remaining / 60);
  const sec = Math.floor(remaining % 60);
  const urgent = remaining <= 30;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 999,
      background: urgent ? 'rgba(239,68,68,0.18)' : 'rgba(236,72,153,0.15)',
      border: `1px solid ${urgent ? QQ_COLORS.red500 : 'rgba(236,72,153,0.4)'}`,
      fontSize: 13, fontWeight: 900, color: urgent ? QQ_COLORS.red300 : QQ_COLORS.brandPinkSoft,
      fontVariantNumeric: 'tabular-nums',
    }}>
      ⏱ {String(m).padStart(2, '0')}:{String(sec).padStart(2, '0')}
    </span>
  );
}
