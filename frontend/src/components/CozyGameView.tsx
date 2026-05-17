import { useEffect, useMemo, useRef, useState } from 'react';
import type { CozyGame, CozyGameRoundState } from '@shared/cozyGameTypes';
import { QQ_TEAM_PALETTE } from '@shared/quarterQuizTypes';
import { playCozyGameWheelTick, playCozyGameWheelStop, playCozyGameStart, playFanfare } from '../utils/sounds';
import { AnimatedCozyWolf, SpeechBubble } from '../pages/QQBeamerPage';
import { ConfettiOverlay } from './CozyQuizConfettiOverlay';
import { BeamerTimer } from './CozyQuizBeamerTimer';

// 2026-05-17 (Wolf-Feature CozyGames Phase 4): Beamer-Sub-View für COZY_GAME-Phase.
// Skelett-Variante (Option A) — funktional, kein Polish-Glücksrad mit Bezier-Easing.
// Polish kommt im separaten Block, sobald End-to-End-Flow steht.
//
// Sub-Phasen (siehe shared/cozyGameTypes.ts CozyGameRoundPhase):
//   INTRO → WHEEL_SPIN → WHEEL_RESULT → GAME_ACTIVE → WINNER_SELECT

const COZY_NAVY = '#1E2A5A';
const COZY_PINK = '#EC4899';

export interface CozyGameViewProps {
  round: CozyGameRoundState;
  /** Bildschirm-Größe wird vom Parent reingegeben (z.B. via useWindowDimensions). */
  width: number;
  height: number;
}

export default function CozyGameView({ round, width, height }: CozyGameViewProps) {
  const [games, setGames] = useState<CozyGame[]>([]);
  const [loading, setLoading] = useState(true);

  // 2026-05-17 (P1 #5): Sounds pro Sub-Phase.
  // - WHEEL_SPIN: Tick-Interval (~110ms slow → 220ms fast je nach Spin-Easing)
  // - WHEEL_RESULT: einmaliger Stop-Snap (beim Phase-Wechsel)
  // - GAME_ACTIVE: einmaliger Start-Cue (beim Timer-Beginn)
  const lastPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = lastPhaseRef.current;
    const cur = round.phase;
    if (prev !== cur) {
      // Phase-Transition: one-shot Sounds
      if (cur === 'WHEEL_RESULT' && prev === 'WHEEL_SPIN') {
        try { playCozyGameWheelStop(); } catch {}
        // 2026-05-17 (Wolf 'cheer'): zusätzlicher Fanfare-Cue ~600ms nach
        // Stop-Snap. Macht den Moment akustisch zum Crescendo (Konfetti +
        // Snap + Cheer übereinander).
        const cheer = window.setTimeout(() => {
          try { playFanfare(); } catch {}
        }, 600);
        // Cleanup wenn unmount/transition zwischendurch
        return () => window.clearTimeout(cheer);
      }
      if (cur === 'GAME_ACTIVE' && prev === 'WHEEL_RESULT') {
        try { playCozyGameStart(); } catch {}
      }
      lastPhaseRef.current = cur;
    }
    // Tick-Interval nur während WHEEL_SPIN
    if (cur !== 'WHEEL_SPIN') return;
    // 2026-05-17 v2 (Wolf 'langsamer'): Tick-Schema 6.5s mit klarer
    // Verlangsamung am Ende. Start 70ms (schnell ratternd) → 380ms (träge
    // tickend bei verlangsamtem Rad). Easing kubisch damit der Slowdown
    // im letzten Drittel hörbar wird.
    let elapsed = 0;
    const total = 6500;
    const handles: number[] = [];
    function scheduleNext() {
      const progress = elapsed / total;
      // Easing: interval steigt nicht-linear (cubic) → letzte Sekunde tickt
      // deutlich langsamer als die erste.
      const interval = 70 + Math.pow(progress, 1.5) * 310;
      elapsed += interval;
      if (elapsed > total) return;
      const h = window.setTimeout(() => {
        try { playCozyGameWheelTick(); } catch {}
        scheduleNext();
      }, interval);
      handles.push(h);
    }
    scheduleNext();
    return () => { handles.forEach(h => clearTimeout(h)); };
  }, [round.phase]);

  // Spiele aus Pool laden (für Rad-Slices + Spiel-Card)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/cozygames');
        if (!res.ok) throw new Error('load failed');
        const data: CozyGame[] = await res.json();
        if (!cancelled) {
          const inPool = data.filter(g => round.poolGameIds.includes(g.id) && !g.archived);
          setGames(inPool);
        }
      } catch {
        // ignore — Skelett ohne harten Error-State
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [round.poolGameIds]);

  const activeGame = useMemo(
    () => round.activeGameId ? games.find(g => g.id === round.activeGameId) ?? null : null,
    [games, round.activeGameId]
  );

  // Verbleibende Spiele fürs Rad (Shrink-Logik aus Wolfs Entscheidung)
  const availableForWheel = useMemo(
    () => games.filter(g => !round.playedGameIds.includes(g.id)),
    [games, round.playedGameIds]
  );

  // 2026-05-17 (Wolf-Bug 'rad wird nach drehen nochmal getriggert'):
  // Stage-State im äußeren Component damit WheelView stable mounted bleibt
  // beim Phase-Wechsel WHEEL_SPIN → WHEEL_RESULT.
  // WICHTIG: useState/useEffect MUSS vor early-return (loading) stehen,
  // sonst React #310 "Rendered more hooks than during the previous render".
  const [resultStage, setResultStage] = useState<'wheel' | 'detail'>('wheel');
  useEffect(() => {
    if (round.phase !== 'WHEEL_RESULT') {
      setResultStage('wheel');
      return;
    }
    // 2026-05-17 v5 (Wolf 'switcht zu schnell'): Choreo mit Atmungs-Pause
    //   0.0s  spinning=false → 1.2s Stop-Snap startet
    //   1.2s  Snap fertig → Wave-Animation startet (1.5s)
    //   2.7s  Wave fertig (Screen ist in Slice-Farbe)
    //   2.7-3.6s  Pause — solide Slice-Farbe atmet 0.9s
    //   3.6s  Stage-Wechsel zu Detail-View (Inhalt fadet rein)
    const t = window.setTimeout(() => setResultStage('detail'), 3600);
    return () => window.clearTimeout(t);
  }, [round.phase]);

  if (loading) {
    return (
      <FullScreenLayout width={width} height={height}>
        <div style={{ color: '#94a3b8', fontSize: 24 }}>Lade Mini-Spiele…</div>
      </FullScreenLayout>
    );
  }

  // 2026-05-17 v6 (Wolf 'wolf könnte auch da bleiben, war vorher schon da'):
  // Wolf-Avatar + Speech-Bubble jetzt EIN konstantes Layer außerhalb der
  // phase-spezifischen Render-Branches. Bei Phase-Wechsel wird der Wolf-
  // Container NICHT mehr unmountet → keine erneute Pop-Mount-Animation.
  const wolfMode = wolfModeForPhase(round.phase);
  const wolfSpeech = wolfSpeechForPhase(round.phase, activeGame);
  // SpeechBubble bekommt Key pro Phase+Stage → Bubble-Animation re-triggert
  // bei Text-Wechsel, Wolf-Avatar bleibt konstant gemounted.
  const speechKey = `${round.phase}-${resultStage}-${activeGame?.id ?? 'na'}`;

  let phaseContent: React.ReactNode = null;
  switch (round.phase) {
    case 'INTRO':
      phaseContent = <IntroView width={width} height={height} slotKind={round.slotKind} />;
      break;

    case 'WHEEL_SPIN':
    case 'WHEEL_RESULT': {
      const isSpin = round.phase === 'WHEEL_SPIN';
      const showDetail = !isSpin && resultStage === 'detail';
      const targetIdx = round.wheelTargetSliceIndex ?? 0;
      const sliceColor = QQ_TEAM_PALETTE[targetIdx % QQ_TEAM_PALETTE.length];
      phaseContent = showDetail ? (
        <GameDetailView width={width} height={height} game={activeGame} accentColor={sliceColor} />
      ) : (
        <WheelView
          width={width} height={height}
          slices={availableForWheel}
          targetIdx={targetIdx}
          spinning={isSpin}
          revealedGame={isSpin ? null : activeGame}
        />
      );
      break;
    }

    case 'GAME_ACTIVE': {
      const tIdx = round.wheelTargetSliceIndex ?? 0;
      const accent = QQ_TEAM_PALETTE[tIdx % QQ_TEAM_PALETTE.length];
      // 2026-05-17 v7: Gleiche View wie WHEEL_RESULT 'detail', nur mit
      // gesetztem gameEndsAt → Timer pop't rein. Card bleibt stable mounted.
      phaseContent = (
        <GameDetailView
          width={width} height={height}
          game={activeGame}
          accentColor={accent}
          gameEndsAt={round.gameEndsAt}
        />
      );
      break;
    }

    case 'WINNER_SELECT': {
      const tIdx = round.wheelTargetSliceIndex ?? 0;
      const accent = QQ_TEAM_PALETTE[tIdx % QQ_TEAM_PALETTE.length];
      phaseContent = (
        <WinnerSelectView
          width={width} height={height}
          game={activeGame}
          winnerTeamIds={round.winnerTeamIds}
          accentColor={accent}
        />
      );
      break;
    }

    default:
      phaseContent = (
        <FullScreenLayout width={width} height={height}>
          <div style={{ color: '#94a3b8' }}>Unbekannte CozyGame-Phase: {round.phase}</div>
        </FullScreenLayout>
      );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {phaseContent}
      {/* Konstanter Wolf-Layer — überlebt Phase-Wechsel, kein Re-Mount-Pop */}
      <PersistentWolfLayer wolfMode={wolfMode} speech={wolfSpeech} speechKey={speechKey} />
    </div>
  );
}

// ── CozyWolf-Reaction-Layer (P2 #8) ──────────────────────────────────────────
type WolfMode = 'winken' | 'ueberrascht' | 'jubel' | 'daumen';

function wolfModeForPhase(phase: CozyGameRoundState['phase']): WolfMode {
  switch (phase) {
    case 'INTRO':         return 'winken';
    case 'WHEEL_SPIN':    return 'ueberrascht';
    case 'WHEEL_RESULT':  return 'jubel';
    case 'GAME_ACTIVE':   return 'ueberrascht';
    case 'WINNER_SELECT': return 'jubel';
    default:              return 'winken';
  }
}

// 2026-05-17 (Wolf): Sprechblase pro Sub-Phase. Spielname dynamisch im
// Result/Active-Slot. Texte kurz + spielerisch.
function wolfSpeechForPhase(phase: CozyGameRoundState['phase'], game: CozyGame | null): string {
  switch (phase) {
    case 'INTRO':         return 'Welches Spiel wirds heute?';
    case 'WHEEL_SPIN':    return 'Spannend, spannend!';
    case 'WHEEL_RESULT':  return game ? `Oho — ${game.name}!` : 'Aha!';
    case 'GAME_ACTIVE':   return 'Los geht\'s, 60 Sekunden!';
    case 'WINNER_SELECT': return 'Wer hat gewonnen?';
    default:              return 'Lasst uns spielen!';
  }
}

function PersistentWolfLayer({ wolfMode, speech, speechKey }: {
  wolfMode: WolfMode;
  speech: string;
  speechKey: string;
}) {
  const speakMs = Math.max(1800, speech.length * 110);
  return (
    <div style={{
      position: 'absolute',
      bottom: 24, right: 32,
      zIndex: 50,
      pointerEvents: 'none',
      // 2026-05-17 v6 (Wolf 'wolf war vorher schon da, soll bleiben'):
      // Pop-Mount-Animation entfernt — Wolf bleibt persistent über alle
      // Phasen. Position konstant bottom-right. Nur Speech-Bubble re-triggert
      // ihre Animation per bubbleKey-Wechsel.
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0,
    }}>
      <SpeechBubble
        text={speech}
        bubbleKey={speechKey}
        enterMs={400}
        speakMs={speakMs}
        exitMs={400}
        tailSide="right"
        size="md"
      />
      <AnimatedCozyWolf
        widthCss="clamp(120px, 11vw, 200px)"
        mode={wolfMode as any}
        speaking
        mirror
      />
    </div>
  );
}

// ── Full-Screen-Wrapper ──────────────────────────────────────────────────────
function FullScreenLayout({ children, width, height }: { children: React.ReactNode; width: number; height: number }) {
  return (
    <div style={{
      width, height,
      background: `linear-gradient(180deg, ${COZY_NAVY} 0%, #0F1736 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 24,
      color: '#fff', fontFamily: 'inherit',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

// ── INTRO ────────────────────────────────────────────────────────────────────
function IntroView({ width, height, slotKind }: { width: number; height: number; slotKind: 'roundPause' | 'finalSlot' }) {
  return (
    <FullScreenLayout width={width} height={height}>
      {/* 2026-05-17 v7 (Wolf 'pinata darf hovern oder satisfying effect'):
          Hover-Animation — 3s ease-in-out infinite, leichte Drift up/down
          + leichtes Rotate. Wirkt wie eine Pinata die in der Luft baumelt. */}
      <style>{`
        @keyframes cozyGamePinataHover {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50%      { transform: translateY(-14px) rotate(3deg); }
        }
      `}</style>
      <div style={{
        fontSize: 'clamp(80px, 12vw, 200px)',
        lineHeight: 1,
        filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.5))',
        animation: 'cozyGamePinataHover 3s ease-in-out infinite',
      }}>🪅</div>
      <div style={{
        fontSize: 'clamp(48px, 6vw, 96px)',
        fontWeight: 900,
        letterSpacing: '-0.02em',
        background: `linear-gradient(90deg, ${COZY_PINK} 0%, #A21247 100%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        CozyGame
      </div>
      <div style={{
        fontSize: 'clamp(20px, 2vw, 32px)',
        color: '#cbd5e1', marginTop: -8, fontWeight: 600,
      }}>
        {slotKind === 'finalSlot' ? '🏆 Final-Kategorie' : 'Energy-Reset zwischen den Runden'}
      </div>
      <div style={{
        marginTop: 32,
        fontSize: 'clamp(14px, 1.3vw, 22px)', color: '#64748b', fontStyle: 'italic',
      }}>
        Gleich geht's los — das Glücksrad entscheidet, welches Spiel ihr spielt.
      </div>
    </FullScreenLayout>
  );
}

// ── WHEEL (Skelett — einfache rotation, kein Bezier-Easing) ───────────────────
function WheelView({
  width, height, slices, targetIdx, spinning, revealedGame,
}: {
  width: number; height: number;
  slices: CozyGame[]; targetIdx: number;
  spinning: boolean; revealedGame?: CozyGame | null;
}) {
  // 2026-05-17 (P2 #6): Adaptive Anzeige — bei ≤3 Spielen kein vollwertiges
  // Rad-Theater (Pizza-Effekt), sondern direkter Card-Pop wenn revealed.
  if (slices.length <= 3) {
    return (
      <FullScreenLayout width={width} height={height}>
        {spinning && (
          <div style={{ fontSize: 'clamp(80px, 12vw, 200px)', lineHeight: 1, animation: 'qqSpinSlow 1.2s ease-in-out infinite' }}>🪅</div>
        )}
        {!spinning && revealedGame && (
          <div style={{
            padding: '40px 60px',
            background: 'rgba(255,255,255,0.06)',
            border: `3px solid ${COZY_PINK}`,
            borderRadius: 24,
            display: 'flex', alignItems: 'center', gap: 24,
            boxShadow: `0 0 60px ${COZY_PINK}55, 0 20px 60px rgba(0,0,0,0.4)`,
            animation: 'qqPhasePop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}>
            <span style={{ fontSize: 96 }}>{revealedGame.emoji}</span>
            <div>
              <div style={{ fontSize: 'clamp(36px, 4vw, 72px)', fontWeight: 900 }}>{revealedGame.name}</div>
              <div style={{ fontSize: 'clamp(16px, 1.4vw, 26px)', color: '#cbd5e1', marginTop: 8, maxWidth: 700 }}>
                {revealedGame.description}
              </div>
            </div>
          </div>
        )}
        <div style={{ fontSize: 'clamp(14px, 1.2vw, 20px)', color: '#64748b', fontStyle: 'italic', marginTop: 24 }}>
          {spinning ? `Wählt aus ${slices.length} Spielen …` : ''}
        </div>
      </FullScreenLayout>
    );
  }
  const n = Math.max(slices.length, 1);
  const anglePerSlice = 360 / n;
  // Target-Winkel: damit der Pointer (oben) auf den Slice mit targetIdx zeigt,
  // muss der Slice „nach oben" rotiert werden. Slice 0 startet bei 0° (oben),
  // weitere im Uhrzeigersinn.
  const targetAngle = -(targetIdx * anglePerSlice) - (anglePerSlice / 2);
  // 2026-05-17 (Wolf 'langsamer + mehr effekt'): 6 volle Umdrehungen +
  // Target-Winkel. Stop-Snap nutzt overshoot-Bezier statt zusätzliche
  // Umdrehung — sonst dreht das Rad beim Übergang WHEEL_SPIN→RESULT
  // ein weiteres Mal komplett um (Wolf-Bug 'rad dreht nochmal los').
  const finalAngle = 6 * 360 + targetAngle;

  // 2026-05-17 (Wolf-Bug 'rad dreht sich nicht sichtbar'): initial Mount mit
  // finalAngle hat keinen Transition-Start-Wert → keine Animation. Lösung:
  // rotation startet bei 0, nach Mount via useEffect auf finalAngle setzen.
  // Das gibt Browser einen Frame mit rotate(0) bevor CSS-Transition feuert.
  const [renderAngle, setRenderAngle] = useState(0);
  useEffect(() => {
    // Nach Mount: kurz warten dann auf Endwinkel setzen → CSS-Transition läuft.
    const handle = window.setTimeout(() => setRenderAngle(finalAngle), 30);
    return () => window.clearTimeout(handle);
  }, [finalAngle]);

  const size = Math.min(width * 0.5, height * 0.7);

  // 2026-05-17 v3 (Wolf): Team-Farben-Palette (8 Slots, deckt sich mit
  // Avatar-Slots) — visuelle Konsistenz zur Team-Brand.
  const SLICE_PALETTE = QQ_TEAM_PALETTE;

  // 2026-05-17 v4 (Wolf): Zoom-Approach verworfen — SVG-Rotation + Container-
  // Scale beißen sich. Stattdessen Slice-Color-Wave (siehe wash-Overlay unten).
  const sliceColorForWave = QQ_TEAM_PALETTE[targetIdx % QQ_TEAM_PALETTE.length];
  const waveActive = !spinning && !!revealedGame;
  return (
    <FullScreenLayout width={width} height={height}>
      {/* Pointer oben mit Pulse beim Stop */}
      <div style={{
        position: 'relative', width: size, height: size + 60,
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '24px solid transparent',
          borderRight: '24px solid transparent',
          borderTop: `40px solid ${COZY_PINK}`,
          zIndex: 2,
          // 2026-05-17 v7 (Wolf 'lichtkegel über feld sieht weird aus'):
          // Pink-Glow nach Stop entfernt — Pointer bleibt clean ohne Strahl
          // der wie Lichtkegel über das Winner-Slice wirkt.
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
        }} />
        {/* Rad */}
        <svg
          width={size} height={size}
          viewBox="-100 -100 200 200"
          style={{
            position: 'absolute',
            top: 60, left: 0,
            transform: `rotate(${renderAngle}deg)`,
            transition: spinning
              ? 'transform 6.5s cubic-bezier(0.14, 0.6, 0.2, 1)'
              : 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.5))',
          }}
        >
          {slices.map((g, i) => {
            const a0 = i * anglePerSlice;
            const a1 = (i + 1) * anglePerSlice;
            const rad0 = (a0 - 90) * Math.PI / 180;
            const rad1 = (a1 - 90) * Math.PI / 180;
            const r = 95;
            const x0 = r * Math.cos(rad0);
            const y0 = r * Math.sin(rad0);
            const x1 = r * Math.cos(rad1);
            const y1 = r * Math.sin(rad1);
            const largeArc = anglePerSlice > 180 ? 1 : 0;
            const path = `M 0 0 L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`;
            const fillColor = SLICE_PALETTE[i % SLICE_PALETTE.length];
            const isWinnerSlice = !spinning && i === targetIdx;
            // Slice-Label Position
            const midAngle = ((a0 + a1) / 2 - 90) * Math.PI / 180;
            const labelR = 60;
            const lx = labelR * Math.cos(midAngle);
            const ly = labelR * Math.sin(midAngle);
            return (
              <g key={g.id}>
                {/* 2026-05-17 v7 (Wolf): Winner-Slice-Glow + Stroke-Verdickung
                    entfernt — die V-Form aus schwarzem Stroke wirkte wie
                    Lichtkegel-Strahlung. Slice ist clean, Slice-Color-Wave
                    übernimmt den Reveal-Moment. */}
                <path
                  d={path}
                  fill={fillColor}
                  stroke="#0F1736"
                  strokeWidth={1.5}
                />
                <text
                  x={lx} y={ly}
                  fontSize={n <= 4 ? 24 : n <= 6 ? 20 : 16}
                  fontWeight={900}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  transform={`rotate(${a0 + anglePerSlice / 2} ${lx} ${ly})`}
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                  }}
                >
                  {g.emoji}
                </text>
              </g>
            );
          })}
          {/* Center hub mit Glow */}
          <circle cx={0} cy={0} r={14} fill="#0F1736" stroke="#fff" strokeWidth={2.5} />
          <circle cx={0} cy={0} r={6} fill={COZY_PINK} />
        </svg>
      </div>
      {/* 2026-05-17 v7 (Wolf 'rad dreht sich text überflüssig'): Status-Text
          entfernt. Bottom-Slot bleibt nur als minHeight-Platzhalter damit
          Rad-Position konstant zwischen spinning und post-spin. */}
      <div style={{
        minHeight: 'clamp(120px, 18vh, 200px)',
        width: '100%',
      }} />
      {/* 2026-05-17 (Wolf): Konfetti-Burst beim Stop für extra Pop. */}
      {!spinning && revealedGame && (
        <>
          {/* confettiFall-Keyframe lokal injizieren falls Test-Page oder
              embed-Context die qqShared-Globals nicht geladen hat. 100vh
              funktioniert immer, unabhängig von container-type. */}
          <style>{`
            @keyframes confettiFall {
              0%   { transform: translateY(var(--cy, -60px)) rotate(0deg) scale(1); opacity: 1; }
              75%  { opacity: 1; }
              100% { transform: translateY(100vh) rotate(var(--cr, 720deg)) scale(0.4); opacity: 0; }
            }
            @keyframes cozyGameColorWave {
              0%   { clip-path: circle(0% at 50% 8%); opacity: 0; }
              15%  { opacity: 1; }
              100% { clip-path: circle(150% at 50% 50%); opacity: 1; }
            }
          `}</style>
          <ConfettiOverlay />
          {/* Slice-Color-Wave: solide Slice-Farbe expandiert via clip-path
              vom Pointer-Position (oben) zu Vollbild.
              2026-05-17 v6 (Wolf 'farbe direkt deckend'): plain solid color,
              kein Gradient mehr zu Navy. Plus Detail-View-BG identisch
              solid → kein Schimmer-Bruch beim Stage-Wechsel. */}
          {waveActive && (
            <div style={{
              position: 'absolute', inset: 0,
              background: sliceColorForWave,
              pointerEvents: 'none',
              zIndex: 40,
              animation: 'cozyGameColorWave 1.5s cubic-bezier(0.4, 0, 0.2, 1) 1.2s both',
            }} />
          )}
        </>
      )}
    </FullScreenLayout>
  );
}

// ── Game-Detail-Card: full-screen mit Slice-Farbe ────────────────────────────
// 2026-05-17 v7 (Wolf 'wheel-result wie game-active mit inaktivem timer'):
// Eine gemeinsame Reveal-View für beide Phasen. Card + Description bleiben
// stable mounted, beim Wechsel WHEEL_RESULT→GAME_ACTIVE fadet nur der Timer
// rein. React-Instanz bleibt gleich → keine erneute Card-Animation.
function GameDetailView({ width, height, game, accentColor, gameEndsAt }: {
  width: number; height: number;
  game: CozyGame | null;
  accentColor: string;
  gameEndsAt?: number | null;
}) {
  if (!game) {
    return <FullScreenLayout width={width} height={height}>
      <div style={{ color: '#94a3b8' }}>Lade Spiel-Details…</div>
    </FullScreenLayout>;
  }
  return (
    <div style={{
      width, height,
      background: accentColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 'clamp(14px, 2vh, 24px)',
      color: '#fff', fontFamily: 'inherit',
      overflow: 'hidden',
      padding: 'clamp(20px, 3vh, 40px)',
      boxSizing: 'border-box',
    }}>
      <style>{`
        @keyframes cozyGameLogoPop {
          0%   { transform: scale(0.6); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes cozyGameDetailFade {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes cozyGameTimerSlotIn {
          0%   { opacity: 0; transform: scale(0.4); }
          70%  { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {/* 2026-05-17 v5 (Wolf 'noch nicht ganz smooth'): Stagger-Pop-Animations
          gekürzt und synchronisiert. Vorher 0.3/0.6/0.9/1.1s Delays = Inhalt
          baute sich über 1.4s sequenziell auf nach Stage-Wechsel → wirkte
          zerstückelt. Jetzt: alle ohne Delay, opacity-fadeIn 0.4s. Container
          selbst hat fade-in damit nahtloser Anschluss an Wave. */}
      {/* 2026-05-17 v8 (Wolf 'größe noch anpassen'): Gesamt-Layout verkleinert
          damit Logo + Name + Description + Tags + Timer alle in 1080p Beamer
          passen ohne Overflow. */}
      <div style={{
        fontSize: 'clamp(96px, 14vw, 220px)',
        lineHeight: 1,
        filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.5))',
        opacity: 0,
        animation: 'cozyGameLogoPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      }}>
        {game.emoji}
      </div>
      <div style={{
        fontSize: 'clamp(36px, 4.5vw, 76px)',
        fontWeight: 900,
        letterSpacing: '-0.02em',
        textAlign: 'center',
        textShadow: '0 4px 24px rgba(0,0,0,0.5)',
        opacity: 0,
        animation: 'cozyGameDetailFade 0.4s ease-out 0.15s both',
      }}>
        {game.name}
      </div>
      <div style={{
        fontSize: 'clamp(16px, 1.6vw, 26px)',
        color: 'rgba(255,255,255,0.92)',
        maxWidth: 1000,
        textAlign: 'center',
        lineHeight: 1.4,
        padding: '0 40px',
        opacity: 0,
        animation: 'cozyGameDetailFade 0.4s ease-out 0.25s both',
      }}>
        {game.description}
      </div>
      {game.materialTags.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
          maxWidth: 900, padding: '0 40px',
          opacity: 0,
          animation: 'cozyGameDetailFade 0.4s ease-out 0.35s both',
        }}>
          {game.materialTags.map(t => (
            <span key={t} style={{
              padding: '4px 12px',
              background: 'rgba(0,0,0,0.25)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              borderRadius: 999,
              fontSize: 'clamp(12px, 1vw, 16px)',
              fontWeight: 700,
              color: '#fff',
            }}>{t}</span>
          ))}
        </div>
      )}
      {/* Timer-Slot mit FIXER Höhe (height statt minHeight) damit Layout
          stable ist: bei WHEEL_RESULT ist Slot leer aber reserviert die
          Höhe — wenn BeamerTimer in GAME_ACTIVE reinkommt, schiebt sich
          der Rest oben NICHT hoch.
          2026-05-17 v8 (Wolf 'rest nicht hochschieben'). */}
      <div style={{
        height: 'clamp(180px, 22vh, 260px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {gameEndsAt && (
          <div
            key={`timer-${gameEndsAt}`}
            style={{ animation: 'cozyGameTimerSlotIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
          >
            <BeamerTimer endsAt={gameEndsAt} durationSec={60} accent="#fff" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── GAME ACTIVE (Spiel-Card + BeamerTimer-Ring) ─────────────────────────────
// 2026-05-17 v2 (Wolf): Runder Timer wie im Standard-Quiz (BeamerTimer-Ring
// mit Multi-Stage-Urgency) statt großer Countdown-Zahl.
function GameActiveView({ width, height, game, gameEndsAt, accentColor }: {
  width: number; height: number;
  game: CozyGame | null;
  gameEndsAt: number | null;
  accentColor: string;
}) {
  if (!game || !gameEndsAt) {
    return <FullScreenLayout width={width} height={height}>
      <div style={{ color: '#94a3b8' }}>Kein aktives Spiel</div>
    </FullScreenLayout>;
  }
  return (
    <div style={{
      width, height,
      background: accentColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 28,
      color: '#fff', fontFamily: 'inherit',
      overflow: 'hidden',
    }}>
      {/* 2026-05-17 v7 (Wolf 'timer + card sollen animation haben'):
          Card fadet von oben rein (slide-down + opacity), Timer pop't von
          unten mit Scale-Bounce. Gestaffelt damit es nacheinander wirkt. */}
      <style>{`
        @keyframes cozyGameActiveCardIn {
          0%   { opacity: 0; transform: translateY(-30px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cozyGameActiveTimerIn {
          0%   { opacity: 0; transform: scale(0.3); }
          70%  { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 24,
        padding: '20px 40px',
        background: 'rgba(0,0,0,0.25)',
        border: '2px solid rgba(255,255,255,0.18)',
        borderRadius: 24,
        opacity: 0,
        animation: 'cozyGameActiveCardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both',
      }}>
        <span style={{ fontSize: 'clamp(72px, 8vw, 128px)', lineHeight: 1 }}>{game.emoji}</span>
        <div>
          <div style={{
            fontSize: 'clamp(36px, 4vw, 72px)',
            fontWeight: 900,
            textShadow: '0 4px 16px rgba(0,0,0,0.45)',
          }}>{game.name}</div>
          <div style={{
            fontSize: 'clamp(14px, 1.3vw, 22px)',
            color: 'rgba(255,255,255,0.88)',
            marginTop: 6, maxWidth: 800,
          }}>
            {game.description}
          </div>
        </div>
      </div>

      {/* Runder BeamerTimer (analog Standard-Quiz) */}
      <div style={{
        marginTop: 12,
        opacity: 0,
        animation: 'cozyGameActiveTimerIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both',
      }}>
        <BeamerTimer endsAt={gameEndsAt} durationSec={60} accent="#fff" />
      </div>
    </div>
  );
}

// ── WINNER SELECT (zwischen Spiel-Ende und PLACEMENT) ────────────────────────
function WinnerSelectView({ width, height, game, winnerTeamIds, accentColor }: {
  width: number; height: number;
  game: CozyGame | null;
  winnerTeamIds: string[];
  accentColor: string;
}) {
  if (!game) {
    return <FullScreenLayout width={width} height={height}>
      <div style={{ color: '#94a3b8' }}>Lade Spiel-Details…</div>
    </FullScreenLayout>;
  }
  // 2026-05-17 v8 (Wolf 'winner select im gleichen design wie game active,
  // nur aufgelöst mit winner team'): WinnerSelectView nutzt gleiches Layout
  // wie GameDetailView (Slice-Farbe BG + Logo + Name + Description + Tags),
  // im Timer-Slot kommt die Zeit-abgelaufen-Card + Sieger-Status.
  return (
    <div style={{
      width, height,
      background: accentColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 'clamp(14px, 2vh, 24px)',
      color: '#fff', fontFamily: 'inherit',
      overflow: 'hidden',
      padding: 'clamp(20px, 3vh, 40px)',
      boxSizing: 'border-box',
    }}>
      <div style={{
        fontSize: 'clamp(96px, 14vw, 220px)',
        lineHeight: 1,
        filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.5))',
      }}>
        {game.emoji}
      </div>
      <div style={{
        fontSize: 'clamp(36px, 4.5vw, 76px)',
        fontWeight: 900,
        letterSpacing: '-0.02em',
        textAlign: 'center',
        textShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}>
        {game.name}
      </div>
      <div style={{
        fontSize: 'clamp(16px, 1.6vw, 26px)',
        color: 'rgba(255,255,255,0.92)',
        maxWidth: 1000,
        textAlign: 'center',
        lineHeight: 1.4,
        padding: '0 40px',
      }}>
        {game.description}
      </div>
      {game.materialTags.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
          maxWidth: 900, padding: '0 40px',
        }}>
          {game.materialTags.map(t => (
            <span key={t} style={{
              padding: '4px 12px',
              background: 'rgba(0,0,0,0.25)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              borderRadius: 999,
              fontSize: 'clamp(12px, 1vw, 16px)',
              fontWeight: 700,
              color: '#fff',
            }}>{t}</span>
          ))}
        </div>
      )}
      {/* Sieger-Slot: gleiche fixe Höhe wie Timer-Slot in GameDetailView
          damit Card+Description+Tags an gleicher Position bleiben. */}
      <div style={{
        height: 'clamp(180px, 22vh, 260px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          padding: '14px 28px',
          background: 'rgba(0,0,0,0.3)',
          border: '2px solid rgba(255,255,255,0.4)',
          borderRadius: 16,
          textAlign: 'center',
          animation: 'cozyGameTimerSlotIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}>
          <div style={{ fontSize: 'clamp(22px, 2.4vw, 38px)', fontWeight: 900 }}>
            ⏱️ Zeit abgelaufen!
          </div>
          <div style={{ fontSize: 'clamp(14px, 1.3vw, 22px)', marginTop: 6, opacity: 0.9 }}>
            {winnerTeamIds.length === 0
              ? '⏳ Moderator wählt den Sieger …'
              : winnerTeamIds.length === 1
                ? '✨ Sieger steht fest!'
                : `✨ ${winnerTeamIds.length} Sieger (Tie)`}
          </div>
        </div>
      </div>
    </div>
  );
}
