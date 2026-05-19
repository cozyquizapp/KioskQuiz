import { useEffect, useMemo, useRef, useState } from 'react';
import type { CozyGame, CozyGameRoundState } from '@shared/cozyGameTypes';
import type { QQTeam } from '@shared/quarterQuizTypes';
import { QQ_TEAM_PALETTE } from '@shared/quarterQuizTypes';
import { playCozyGameWheelTick, playCozyGameWheelStop, playCozyGameStart, playFanfare, playClimaxFinish } from '../utils/sounds';
import { AnimatedCozyWolf, SpeechBubble } from '../pages/QQBeamerPage';
import { ConfettiOverlay } from './CozyQuizConfettiOverlay';
import { BeamerTimer } from './CozyQuizBeamerTimer';
import { Fireflies } from './CozyQuizAmbient';
import { QQTeamAvatar } from './QQTeamAvatar';
import { QQ_TEAM_NAME_WRAP } from '../qqShared';

// 2026-05-17 (Wolf-Feature CozyGames Phase 4): Beamer-Sub-View für COZY_GAME-Phase.
// Skelett-Variante (Option A) — funktional, kein Polish-Glücksrad mit Bezier-Easing.
// Polish kommt im separaten Block, sobald End-to-End-Flow steht.
//
// Sub-Phasen (siehe shared/cozyGameTypes.ts CozyGameRoundPhase):
//   INTRO → WHEEL_SPIN → WHEEL_RESULT → GAME_ACTIVE → WINNER_SELECT

const COZY_NAVY = '#1E2A5A';
const COZY_PINK = '#EC4899';

// 2026-05-17 v15 (Wolf 'farben auf dem wheel gleich dunkel wie im bg'):
// Pre-computed Dark-Versionen der QQ_TEAM_PALETTE (35% bright + 65% #0A0814).
// Slices nehmen die dunkle Variante (matched dem BG-Look), Pointer-Wave +
// accent-Tint im Detail-View nutzen weiter die bright-Farben für den
// Reveal-Kontrast.
// 2026-05-17 v17 (Wolf 'ab wheel result gleiche bg dunkle farbe aus slice
// bis zum öffnen des grids'): Modul-Level damit GameDetailView + WinnerSelectView
// + WheelView denselben Lookup nutzen können.
const SLICE_PALETTE_DARK = [
  '#5F2139', // shiba (was #FA507F)
  '#3D4C1D', // faultier (was #9DCB2F)
  '#142C57', // pinguin (was #266FD3)
  '#3C2958', // koala (was #9A65D5)
  '#5F4B14', // giraffe (was #FEC814)
  '#2B4447', // waschbaer (was #68B4A5)
  '#602E18', // kuh (was #FF751F)
  '#5D1D1A', // capybara (was #F84326)
];

// 2026-05-17 v11 (Wolf 'CG-slides fallen aus dem raster, andere bgs sind dunkler
// mit fireflies'): Standard-Brand-BG analog PausedView etc. — dunkler Grund
// (#0A0814) mit subtilen accent-Radial-Gradients. Akzent-Farbe variabel pro
// Sub-View (COZY_PINK für Intro/Wheel, Slice-Color für Result/Active/Winner).
//
// 2026-05-17 v14 (Wolf 'farben sind nicht dunkler und keine fireflies'):
// Helper gibt jetzt SEPARATE backgroundColor + backgroundImage zurück — der
// kombinierte `background:`-Shorthand mit Hex-Color am Ende parst in manchen
// Browsern unzuverlässig (zeigt solide Slice-Farbe statt Layern). Alpha-Tints
// hochgezogen (50/30 statt 30/1A) damit Slice-Color noch sichtbar bleibt
// trotz dunklerem Grund.
function darkBgWithAccent(accent: string): { backgroundColor: string; backgroundImage: string } {
  return {
    backgroundColor: '#0A0814',
    backgroundImage:
      `radial-gradient(ellipse at 50% -10%, ${accent}50, transparent 55%), ` +
      `radial-gradient(ellipse at 85% 110%, ${accent}30, transparent 55%), ` +
      `radial-gradient(ellipse at 15% 80%, rgba(244,114,182,0.06), transparent 50%)`,
  };
}

export interface CozyGameViewProps {
  round: CozyGameRoundState;
  /** Bildschirm-Größe wird vom Parent reingegeben (z.B. via useWindowDimensions). */
  width: number;
  height: number;
  /** 2026-05-17 v13: Team-Liste für Winner-Reveal-Slide (Avatare + Namen).
   *  Wird vom QQBeamerPage als renderState.teams durchgereicht. */
  teams?: QQTeam[];
}

export default function CozyGameView({ round, width, height, teams }: CozyGameViewProps) {
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
        // 2026-05-17 v2 (Wolf 'sounds bei wheel passen nicht'): playFanfare-
        // Layer 600ms nach Stop-Snap entfernt. Triade-Stop alleine ist clean
        // genug; zusätzliche Fanfare machte den Moment matschig (Konfetti +
        // Triade + Fanfare gleichzeitig = sound-overload).
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
  //
  // 2026-05-17 v18 (Wolf 'wheel kommt nochmal rein anstatt card bei game active'):
  // resultStage ist jetzt STICKY — nur bei INTRO/WHEEL_SPIN zurück auf 'wheel'
  // gesetzt. Bei GAME_ACTIVE/WINNER_SELECT bleibt 'detail' erhalten, damit der
  // Card-Stage-State über Phasen hinweg konsistent ist (vorher: setResultStage
  // beim Phase-Wechsel zu GAME_ACTIVE reset auf 'wheel' → falls währenddessen
  // ein erneuter Render mit phase=WHEEL_RESULT auftrat, wurde Wheel statt Card
  // gerendert).
  // Stage-Flip-Delay: 3.6s → 1.5s (Wave-Choreo raus, kein Atmungs-Pause mehr).
  const [resultStage, setResultStage] = useState<'wheel' | 'detail'>('wheel');
  useEffect(() => {
    if (round.phase === 'INTRO' || round.phase === 'WHEEL_SPIN') {
      setResultStage('wheel');
      return;
    }
    if (round.phase !== 'WHEEL_RESULT') return; // GAME_ACTIVE / WINNER_SELECT: keep current
    const t = window.setTimeout(() => setResultStage('detail'), 1500);
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
      const darkSliceColor = SLICE_PALETTE_DARK[targetIdx % SLICE_PALETTE_DARK.length];
      phaseContent = showDetail ? (
        <GameDetailView
          width={width} height={height}
          game={activeGame}
          accentColor={sliceColor}
          darkAccentColor={darkSliceColor}
        />
      ) : (
        <WheelView
          width={width} height={height}
          slices={availableForWheel}
          poolGameIds={round.poolGameIds}
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
      const darkAccent = SLICE_PALETTE_DARK[tIdx % SLICE_PALETTE_DARK.length];
      // 2026-05-17 (Wolf Sequence-Mode): bei sequence → SequenceGameView mit
      // aktuellem Team links + Timer rechts + Queue unten. Sonst standard
      // parallel-Layout via GameDetailView.
      if (round.playMode === 'sequence') {
        phaseContent = (
          <SequenceGameView
            width={width} height={height}
            game={activeGame}
            accentColor={accent}
            darkAccentColor={darkAccent}
            gameEndsAt={round.gameEndsAt}
            timerPausedRemainingMs={round.timerPausedRemainingMs}
            timerDurationSec={round.timerDurationSec ?? 60}
            sequenceOrder={round.sequenceOrder ?? []}
            sequenceCurrentIdx={round.sequenceCurrentIdx ?? 0}
            sequenceCompletedTeamIds={round.sequenceCompletedTeamIds ?? []}
            teams={teams ?? []}
          />
        );
      } else {
        // 2026-05-17 v7: Gleiche View wie WHEEL_RESULT 'detail', nur mit
        // gesetztem gameEndsAt → Timer pop't rein. Card bleibt stable mounted.
        phaseContent = (
          <GameDetailView
            width={width} height={height}
            game={activeGame}
            accentColor={accent}
            darkAccentColor={darkAccent}
            gameEndsAt={round.gameEndsAt}
          />
        );
      }
      break;
    }

    case 'WINNER_SELECT': {
      const tIdx = round.wheelTargetSliceIndex ?? 0;
      const accent = QQ_TEAM_PALETTE[tIdx % QQ_TEAM_PALETTE.length];
      const darkAccent = SLICE_PALETTE_DARK[tIdx % SLICE_PALETTE_DARK.length];
      phaseContent = (
        <WinnerSelectView
          width={width} height={height}
          game={activeGame}
          winnerTeamIds={round.winnerTeamIds}
          accentColor={accent}
          darkAccentColor={darkAccent}
          teams={teams ?? []}
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
// 2026-05-17 v11 (Wolf): Standard-Brand-BG statt Navy-Gradient. Fireflies in
// COZY_PINK damit Intro/Wheel optisch ins Quiz passt (gleicher Look wie Pause/
// Comeback/Question-Views). `position: relative` damit absolute Children
// (Wheel-Pointer, Wave-Overlay, Fireflies) auf FullScreenLayout anchorn.
// 2026-05-17 v18 (Wolf 'ab moment wo gewählt nicht später hellere farbe'):
// Optional `solid`-Prop für solide BG-Farbe (z.B. dark Slice-Color). Wenn
// gesetzt, ersetzt es darkBgWithAccent komplett — kein Radial-Tint mehr.
// Fireflies-Farbe folgt weiter dem `accent` (heller Slice für Kontrast auf
// dunklem Solid-BG).
function FullScreenLayout({ children, width, height, accent = COZY_PINK, solid }: {
  children: React.ReactNode; width: number; height: number;
  accent?: string;
  solid?: string;
}) {
  const bgStyle = solid
    ? { backgroundColor: solid, backgroundImage: 'none' }
    : darkBgWithAccent(accent);
  return (
    <div style={{
      width, height,
      ...bgStyle,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 24,
      color: '#fff', fontFamily: 'inherit',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <Fireflies color={`${accent}66`} />
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
// 2026-05-17 v19 (Wolf 'mm strohhalm zeigt auf dem rad dunkelblau, aber als
// bg rot? irgendwas stimmt nicht'): Wheel-Slice-Color folgt jetzt der POOL-
// Position des jeweiligen Spiels (stabile Farb-Identität pro Spiel) statt
// der Visible-Slice-Position. Vorher konnte nach gespielten Spielen der
// Slice-Index zur Pool-Position drifften → Slice-Farbe ≠ BG-Farbe nach Reveal.
function WheelView({
  width, height, slices, poolGameIds, targetIdx, spinning, revealedGame,
}: {
  width: number; height: number;
  slices: CozyGame[]; poolGameIds: string[]; targetIdx: number;
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
  // 2026-05-17 v19 (Wolf 'mm strohhalm zeigt auf rad dunkelblau, bg rot'):
  // targetIdx ist ein POOL-Index. Nach gespielten Spielen != Visible-Slice-Index.
  // Für die Rotation brauchen wir den Visible-Slice-Index des gewinnenden Spiels.
  const targetGameId = poolGameIds[targetIdx] ?? null;
  const visibleTargetIdx = targetGameId
    ? Math.max(0, slices.findIndex(g => g.id === targetGameId))
    : 0;
  // Target-Winkel: damit der Pointer (oben) auf den Slice mit visibleTargetIdx zeigt,
  // muss der Slice „nach oben" rotiert werden. Slice 0 startet bei 0° (oben),
  // weitere im Uhrzeigersinn.
  const targetAngle = -(visibleTargetIdx * anglePerSlice) - (anglePerSlice / 2);
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

  // 2026-05-17 v10 (Wolf 'mittig + größer'): Rad-Größe + Layout neu strukturiert.
  // Vorher: container size×(size+60), Pointer oben drin → Wheel-Kreis lag
  // 30px unter container-Mid → wirkte nach unten verschoben in FullScreenLayout.
  // Jetzt: container size×size (= Wheel-Kreis), Pointer stickt absolut OBEN
  // RAUS via negative top → Wheel ist exakt der zentrierte Block in FullScreenLayout.
  // 2026-05-17 v15 (Wolf 'wheel noch etwas größer'): 0.62/0.82 → 0.68/0.86.
  const size = Math.min(width * 0.68, height * 0.86);

  const SLICE_PALETTE = SLICE_PALETTE_DARK;

  // 2026-05-17 v18 (Wolf 'ab moment wo gewählt nicht später hellere farbe'):
  // Wave komplett raus. Beim Wheel-Stop wechselt der FullScreenLayout-BG
  // direkt auf die SOLIDE dunkle Slice-Farbe (kein Radial-Tint mehr). Ab dem
  // Moment der Wahl bis zum Grid-Öffnen ist die BG-Farbe identisch.
  // Fireflies-Akzent folgt der hellen Slice-Color für sichtbaren Kontrast.
  const sliceColorBright = QQ_TEAM_PALETTE[targetIdx % QQ_TEAM_PALETTE.length];
  const sliceColorDark = SLICE_PALETTE[targetIdx % SLICE_PALETTE.length];
  const revealed = !spinning && !!revealedGame;
  // accent = Fireflies-Farbe (heller Slice nach Reveal, sonst Brand-Pink)
  const bgAccent = revealed ? sliceColorBright : COZY_PINK;
  // solid = Solid-BG-Farbe (dark Slice nach Reveal, sonst undefined = darkBgWithAccent)
  const solidBg = revealed ? sliceColorDark : undefined;
  return (
    <FullScreenLayout width={width} height={height} accent={bgAccent} solid={solidBg}>
      {/* Wheel-Container: exakt size×size, Pointer ragt absolut nach oben raus
          (negative top), damit der Wheel-Kreis selbst der flex-zentrierte Block
          ist und visuell mittig sitzt. */}
      <div style={{
        position: 'relative', width: size, height: size,
      }}>
        <div style={{
          position: 'absolute',
          top: -44,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '26px solid transparent',
          borderRight: '26px solid transparent',
          borderTop: `44px solid ${COZY_PINK}`,
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
            top: 0, left: 0,
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
            // 2026-05-17 v19: Slice-Farbe folgt POOL-Position (stabile Identität
            // pro Spiel), nicht der Visible-Slice-Position. Sonst driftet die
            // Slice-Farbe nach gespielten Spielen weg von der BG-Farbe (Wolf-Bug
            // 'mm strohhalm zeigt auf rad dunkelblau, bg rot').
            const slicePoolIdx = poolGameIds.indexOf(g.id);
            const safePoolIdx = slicePoolIdx >= 0 ? slicePoolIdx : i;
            const fillColor = SLICE_PALETTE[safePoolIdx % SLICE_PALETTE.length];
            const isWinnerSlice = !spinning && i === visibleTargetIdx;
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
      {/* 2026-05-17 v18 (Wolf 'wheel kommt nochmal rein, helle farbe später'):
          Wave-Overlay komplett raus. BG ist ab Wheel-Stop bereits die dunkle
          Slice-Farbe (via solidBg → FullScreenLayout). Kein Color-Flood mehr,
          kein nachträglich hellerer Tint. Konfetti bleibt für den Pop-Moment. */}
      {revealed && (
        <>
          <style>{`
            @keyframes confettiFall {
              0%   { transform: translateY(var(--cy, -60px)) rotate(0deg) scale(1); opacity: 1; }
              75%  { opacity: 1; }
              100% { transform: translateY(100vh) rotate(var(--cr, 720deg)) scale(0.4); opacity: 0; }
            }
          `}</style>
          <ConfettiOverlay />
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
function GameDetailView({ width, height, game, accentColor, darkAccentColor, gameEndsAt }: {
  width: number; height: number;
  game: CozyGame | null;
  accentColor: string;
  darkAccentColor: string;
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
      // 2026-05-17 v17 (Wolf 'ab wheel result gleiche bg dunkle farbe aus slice
      // bis zum öffnen des grids'): Solid dark Slice-Color als BG, kein Radial-
      // Tint mehr. Konsistente Farbe von WHEEL_RESULT bis WINNER_SELECT.
      backgroundColor: darkAccentColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 'clamp(14px, 2vh, 24px)',
      color: '#fff', fontFamily: 'inherit',
      overflow: 'hidden',
      padding: 'clamp(20px, 3vh, 40px)',
      boxSizing: 'border-box',
      position: 'relative',
    }}>
      {/* Fireflies in heller Slice-Farbe für Kontrast auf dunklem Slice-BG. */}
      <Fireflies color={`${accentColor}66`} />
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
        /* 2026-05-17 v12 (Wolf 'lass die avatare hovern auf den minigame
           pages'): Game-Emoji floatet sanft auf/ab — wirkt lebendig statt
           still stehend. Wrapper macht Hover, Inner macht Pop-In → Transforms
           komponieren sich via DOM-Nesting (keine Animation-Konflikte). */
        @keyframes cozyGameEmojiFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-14px); }
        }
      `}</style>
      {/* 2026-05-17 v5 (Wolf 'noch nicht ganz smooth'): Stagger-Pop-Animations
          gekürzt und synchronisiert. Vorher 0.3/0.6/0.9/1.1s Delays = Inhalt
          baute sich über 1.4s sequenziell auf nach Stage-Wechsel → wirkte
          zerstückelt. Jetzt: alle ohne Delay, opacity-fadeIn 0.4s. Container
          selbst hat fade-in damit nahtloser Anschluss an Wave. */}
      {/* 2026-05-17 v8 (Wolf 'größe noch anpassen'): Gesamt-Layout verkleinert
          damit Logo + Name + Description + Tags + Timer alle in 1080p Beamer
          passen ohne Overflow.
          2026-05-17 v12 (Wolf 'avatare sollen hovern'): Hover-Wrapper + Pop-In
          Inner — Transforms komponieren ohne Konflikt. Hover startet nach
          Pop-In-Dauer (0.5s delay). */}
      <div style={{
        animation: 'cozyGameEmojiFloat 3s ease-in-out 0.5s infinite',
      }}>
        <div style={{
          fontSize: 'clamp(96px, 14vw, 220px)',
          lineHeight: 1,
          filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.5))',
          opacity: 0,
          animation: 'cozyGameLogoPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}>
          {game.emoji}
        </div>
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
      {/* Timer-Slot bleibt als layout-stabilizer (clamp-Höhe), aber Timer
          selbst rendert jetzt OBEN-RECHTS fixed-positioned wie im Standard-
          Quiz (Wolf 2026-05-17 'timer bei cozy game gerne auch rechts oben
          wie sonst'). Slot bleibt visuell leer aber reserviert die Höhe
          damit Card+Description+Tags nicht hochrutschen wenn Timer kommt. */}
      <div style={{
        height: 'clamp(180px, 22vh, 260px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} />

      {/* Top-right Timer-Ring — gleiche Position wie Standard-Quiz Question-
          View Timer (top:var(--qq-safe-margin), right:var(--qq-safe-margin)).
          Nur sichtbar wenn gameEndsAt gesetzt (= GAME_ACTIVE-Phase). */}
      {gameEndsAt && (
        <div
          key={`cg-timer-${gameEndsAt}`}
          style={{
            position: 'absolute',
            top: 'var(--qq-safe-margin, 32px)',
            right: 'var(--qq-safe-margin, 32px)',
            zIndex: 30,
            padding: 12,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(13,10,6,0.82) 55%, rgba(13,10,6,0.55) 78%, transparent 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 4px 22px rgba(0,0,0,0.45)',
            animation: 'cozyGameTimerSlotIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          <BeamerTimer endsAt={gameEndsAt} durationSec={60} accent="#fff" />
        </div>
      )}
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

// ── SEQUENCE GAME VIEW (Wolf 2026-05-17): Layout für playMode='sequence' ────
// Teams spielen nacheinander. Aktuelles Team groß links (Avatar + Name),
// Timer rechts. Queue unten zeigt alle Teams mit Status (gespielt/aktuell/wartend).
function SequenceGameView({
  width, height, game, accentColor, darkAccentColor, gameEndsAt,
  timerPausedRemainingMs, timerDurationSec,
  sequenceOrder, sequenceCurrentIdx, sequenceCompletedTeamIds, teams,
}: {
  width: number; height: number;
  game: CozyGame | null;
  accentColor: string;
  darkAccentColor: string;
  gameEndsAt: number | null;
  timerPausedRemainingMs?: number;
  timerDurationSec: number;
  sequenceOrder: string[];
  sequenceCurrentIdx: number;
  sequenceCompletedTeamIds: string[];
  teams: QQTeam[];
}) {
  if (!game) {
    return <FullScreenLayout width={width} height={height}>
      <div style={{ color: '#94a3b8' }}>Lade Spiel-Details…</div>
    </FullScreenLayout>;
  }
  const teamById = new Map(teams.map(t => [t.id, t]));
  const currentTeam = teamById.get(sequenceOrder[sequenceCurrentIdx]);
  const isPaused = gameEndsAt == null && (timerPausedRemainingMs ?? 0) > 0;

  return (
    <div style={{
      width, height,
      backgroundColor: darkAccentColor,
      display: 'flex', flexDirection: 'column',
      color: '#fff', fontFamily: 'inherit',
      overflow: 'hidden',
      padding: 'clamp(20px, 3vh, 40px)',
      boxSizing: 'border-box',
      position: 'relative',
      gap: 'clamp(16px, 2vh, 28px)',
    }}>
      <Fireflies color={`${accentColor}66`} />
      <style>{`
        @keyframes cozyGameSeqTeamIn {
          0%   { opacity: 0; transform: translateX(-30px) scale(0.95); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes cozyGameSeqTimerIn {
          0%   { opacity: 0; transform: translateX(30px) scale(0.95); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes cozyGameSeqQueueIn {
          0%   { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        /* Lokale Definition damit Emoji auch ohne GameDetailView-Style-Block hovert. */
        @keyframes cozyGameEmojiFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-12px); }
        }
      `}</style>

      {/* TOP: Team links — Timer rechts */}
      <div style={{
        flex: '0 0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 'clamp(20px, 3vw, 56px)',
        alignItems: 'center',
        padding: 'clamp(20px, 2.5vh, 40px) clamp(20px, 3vw, 56px)',
        background: 'rgba(0,0,0,0.25)',
        borderRadius: 24,
        border: '2px solid rgba(255,255,255,0.18)',
      }}>
        {/* Team-Bereich (links) */}
        <div
          key={`seq-team-${sequenceCurrentIdx}`}
          style={{
            display: 'flex', alignItems: 'center',
            gap: 'clamp(16px, 2vw, 32px)',
            animation: 'cozyGameSeqTeamIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
            minWidth: 0,
          }}
        >
          {currentTeam ? (
            <>
              <QQTeamAvatar
                avatarId={currentTeam.avatarId}
                teamEmoji={currentTeam.emoji}
                size="clamp(120px, 14vw, 200px)"
                bgColor={currentTeam.color}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 'clamp(14px, 1.4vw, 22px)',
                  fontWeight: 800,
                  color: 'rgba(255,255,255,0.7)',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  {sequenceCurrentIdx + 1} / {sequenceOrder.length} · jetzt dran
                </div>
                <div lang="de" style={{
                  fontSize: 'clamp(32px, 4vw, 64px)',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  textShadow: '0 4px 16px rgba(0,0,0,0.45)',
                  maxWidth: 'clamp(280px, 35vw, 600px)',
                  ...QQ_TEAM_NAME_WRAP,
                }}>
                  {currentTeam.name}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: '#94a3b8' }}>Kein Team</div>
          )}
        </div>

        {/* Timer-Bereich (rechts) */}
        <div
          key={`seq-timer-${sequenceCurrentIdx}`}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            animation: 'cozyGameSeqTimerIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both',
          }}
        >
          {gameEndsAt ? (
            <BeamerTimer endsAt={gameEndsAt} durationSec={timerDurationSec} accent="#fff" />
          ) : isPaused ? (
            <div style={{
              fontSize: 'clamp(48px, 6vw, 96px)',
              fontWeight: 900,
              padding: '20px 36px',
              border: '4px solid rgba(255,255,255,0.6)',
              borderRadius: '50%',
              minWidth: 'clamp(140px, 16vw, 220px)',
              minHeight: 'clamp(140px, 16vw, 220px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0.7,
            }}>
              ⏸
            </div>
          ) : (
            <div style={{
              fontSize: 'clamp(28px, 3vw, 48px)',
              fontWeight: 900,
              padding: '20px 36px',
              border: '4px solid rgba(255,255,255,0.4)',
              borderRadius: '50%',
              minWidth: 'clamp(140px, 16vw, 220px)',
              minHeight: 'clamp(140px, 16vw, 220px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0.55,
            }}>
              0
            </div>
          )}
        </div>
      </div>

      {/* MIDDLE: Game-Card (Emoji + Name + Description) */}
      <div style={{
        flex: '1 1 auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 'clamp(8px, 1vh, 16px)',
        minHeight: 0,
      }}>
        <div style={{
          fontSize: 'clamp(72px, 10vw, 160px)',
          lineHeight: 1,
          filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.5))',
          animation: 'cozyGameEmojiFloat 3s ease-in-out infinite',
        }}>
          {game.emoji}
        </div>
        <div style={{
          fontSize: 'clamp(28px, 3.5vw, 56px)',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          textShadow: '0 3px 16px rgba(0,0,0,0.45)',
        }}>
          {game.name}
        </div>
        <div style={{
          fontSize: 'clamp(14px, 1.3vw, 22px)',
          color: 'rgba(255,255,255,0.88)',
          maxWidth: '80%',
          textAlign: 'center',
          lineHeight: 1.4,
        }}>
          {game.description}
        </div>
      </div>

      {/* BOTTOM: Queue (alle Teams mit Status) */}
      <div style={{
        flex: '0 0 auto',
        display: 'flex', flexWrap: 'wrap', gap: 'clamp(8px, 1vw, 16px)',
        justifyContent: 'center', alignItems: 'center',
        padding: 'clamp(12px, 1.5vh, 20px)',
        background: 'rgba(0,0,0,0.20)',
        borderRadius: 16,
        animation: 'cozyGameSeqQueueIn 0.5s ease-out 0.3s both',
      }}>
        {sequenceOrder.map((tid, i) => {
          const t = teamById.get(tid);
          if (!t) return null;
          const isCurrent = i === sequenceCurrentIdx;
          const isCompleted = sequenceCompletedTeamIds.includes(tid);
          return (
            <div key={tid} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px 6px 6px',
              borderRadius: 999,
              background: isCurrent ? `${accentColor}33` : isCompleted ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.10)',
              border: isCurrent ? `2px solid ${accentColor}` : '2px solid transparent',
              opacity: isCompleted ? 0.5 : 1,
              filter: isCompleted ? 'grayscale(0.5)' : 'none',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ width: 'clamp(32px, 3vw, 48px)', height: 'clamp(32px, 3vw, 48px)' }}>
                <QQTeamAvatar
                  avatarId={t.avatarId}
                  teamEmoji={t.emoji}
                  size="100%"
                  bgColor={t.color}
                />
              </div>
              <div style={{
                fontSize: 'clamp(13px, 1.1vw, 18px)',
                fontWeight: 800,
                color: isCompleted ? 'rgba(255,255,255,0.55)' : '#fff',
                maxWidth: 'clamp(80px, 10vw, 160px)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {isCompleted ? '✓ ' : ''}{t.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── WINNER SELECT (zwischen Spiel-Ende und PLACEMENT) ────────────────────────
// 2026-05-17 v13 (Wolf 'es gibt keinen winner reveal slide? auf dem das
// gewinnerteam mit avatar angezeigt werden würde'): Zwei distinct States:
//   1. winnerTeamIds.length === 0 → Wartebild ("Zeit abgelaufen, Mod wählt")
//      mit Game-Info als Kontext.
//   2. winnerTeamIds.length > 0 → Winner-Hero-Slide: große Avatar(e) + Name(n)
//      mit 🏆-Headline + Game-Caption. Game-Info tritt zurück.
function WinnerSelectView({ width, height, game, winnerTeamIds, accentColor, darkAccentColor, teams }: {
  width: number; height: number;
  game: CozyGame | null;
  winnerTeamIds: string[];
  accentColor: string;
  darkAccentColor: string;
  teams: QQTeam[];
}) {
  // 2026-05-17 P4 (Wolf 'kein sound bei cozygame gewinnerauflösung'):
  // Climax-Akkord + Fanfare wenn winnerTeamIds von leer → gefüllt
  // transitioniert (= Mod hat Sieger gepickt, Hero-Reveal startet).
  // useEffect MUSS vor early-return stehen (React Hook Order).
  const prevHadWinnersRef = useRef(false);
  useEffect(() => {
    const has = winnerTeamIds.length > 0;
    const prev = prevHadWinnersRef.current;
    prevHadWinnersRef.current = has;
    if (has && !prev) {
      try { playClimaxFinish(); } catch {}
      const fanfare = window.setTimeout(() => {
        try { playFanfare(); } catch {}
      }, 400);
      return () => window.clearTimeout(fanfare);
    }
  }, [winnerTeamIds.length]);

  if (!game) {
    return <FullScreenLayout width={width} height={height}>
      <div style={{ color: '#94a3b8' }}>Lade Spiel-Details…</div>
    </FullScreenLayout>;
  }
  const winners = winnerTeamIds
    .map(id => teams.find(t => t.id === id))
    .filter((t): t is QQTeam => !!t);
  const hasWinners = winners.length > 0;
  return (
    <div style={{
      width, height,
      // 2026-05-17 v17: Solid dark Slice-Color als BG, matched GameDetailView
      // → seamless Übergang von Game-Active zu Winner-Reveal.
      backgroundColor: darkAccentColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 'clamp(14px, 2vh, 24px)',
      color: '#fff', fontFamily: 'inherit',
      overflow: 'hidden',
      padding: 'clamp(20px, 3vh, 40px)',
      boxSizing: 'border-box',
      position: 'relative',
    }}>
      <Fireflies color={`${accentColor}66`} />
      <style>{`
        @keyframes cozyGameTimerSlotIn {
          0%   { opacity: 0; transform: scale(0.4); }
          70%  { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes cozyGameEmojiFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-14px); }
        }
        /* Winner-Avatar Pop+Hover: pop-in (0.6s), dann floaten. Wrapper
           macht Float, Inner macht Pop — Transforms komponieren via DOM. */
        @keyframes cozyGameWinnerPop {
          0%   { transform: scale(0.4) rotate(-8deg); opacity: 0; }
          60%  { transform: scale(1.12) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes cozyGameWinnerHeadline {
          0%   { opacity: 0; transform: translateY(-20px) scale(0.9); }
          60%  { opacity: 1; transform: translateY(0) scale(1.05); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {hasWinners ? (
        // ── HERO: Winner-Reveal mit Avataren + Namen ──────────────────────
        <>
          {/* 🏆 Headline */}
          <div style={{
            fontSize: 'clamp(56px, 6.5vw, 110px)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            textShadow: '0 6px 28px rgba(0,0,0,0.55)',
            animation: 'cozyGameWinnerHeadline 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}>
            🏆 {winners.length === 1 ? 'Gewonnen!' : `${winners.length} Sieger!`}
          </div>
          {/* Avatar-Row (1 oder N — bei Tie nebeneinander) */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 'clamp(20px, 3vw, 56px)',
            alignItems: 'flex-start', justifyContent: 'center',
            maxWidth: '90%', marginTop: 'clamp(8px, 1vh, 18px)',
          }}>
            {winners.map((t, i) => (
              <div key={t.id} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 'clamp(8px, 1.2vh, 16px)',
                animation: `cozyGameEmojiFloat 3s ease-in-out ${i * 0.15}s infinite`,
              }}>
                {/* 2026-05-17 v17 (Wolf 'avatar zu klein'): size direkt als
                    CSS-Längen-String an QQTeamAvatar, NICHT "100%". QQTeamAvatar
                    berechnet die Emoji-Font-Size intern via calc(size * 0.6) —
                    bei size="100%" landet das bei calc(100% * 0.6) = 60% der
                    geerbten font-size (winzig). Mit clamp() funktioniert's. */}
                <div style={{
                  display: 'inline-block',
                  animation: `cozyGameWinnerPop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.15 + i * 0.1}s both`,
                  filter: 'drop-shadow(0 10px 28px rgba(0,0,0,0.55))',
                }}>
                  <QQTeamAvatar
                    avatarId={t.avatarId}
                    teamEmoji={t.emoji}
                    size="clamp(200px, 26vw, 380px)"
                    bgColor={t.color}
                  />
                </div>
                {/* 2026-05-17 P6 (Wolf 'team-name smart wrap'): hyphens:auto +
                    overflow-wrap:anywhere → lange Composite-Wörter wie
                    „Pubquatscher" brechen sinnvoll (Pub-quatscher), keine
                    Orphan-Letters mehr. nowrap+ellipsis raus. */}
                <div lang="de" style={{
                  fontSize: 'clamp(28px, 3vw, 56px)',
                  fontWeight: 900,
                  letterSpacing: '-0.01em',
                  textAlign: 'center',
                  textShadow: '0 4px 16px rgba(0,0,0,0.45)',
                  maxWidth: 'clamp(200px, 26vw, 400px)',
                  ...QQ_TEAM_NAME_WRAP,
                  animation: `cozyGameWinnerHeadline 0.5s ease-out ${0.3 + i * 0.1}s both`,
                }}>
                  {t.name}
                </div>
              </div>
            ))}
          </div>
          {/* Game-Caption (klein, Kontext) */}
          <div style={{
            marginTop: 'clamp(10px, 1.5vh, 22px)',
            fontSize: 'clamp(16px, 1.6vw, 26px)',
            color: 'rgba(255,255,255,0.85)',
            textAlign: 'center',
            display: 'flex', alignItems: 'center', gap: 10,
            opacity: 0,
            animation: 'cozyGameWinnerHeadline 0.4s ease-out 0.5s both',
          }}>
            <span style={{ fontSize: 'clamp(28px, 3vw, 48px)', lineHeight: 1 }}>{game.emoji}</span>
            <span><strong>{game.name}</strong> — gewinnt 1 Aktion auf dem Grid</span>
          </div>
        </>
      ) : (
        // ── WAITING: Mod hat noch keinen Sieger gewählt ───────────────────
        <>
          <div style={{
            fontSize: 'clamp(96px, 14vw, 220px)',
            lineHeight: 1,
            filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.5))',
            animation: 'cozyGameEmojiFloat 3s ease-in-out infinite',
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
                ⏳ Moderator wählt den Sieger …
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
