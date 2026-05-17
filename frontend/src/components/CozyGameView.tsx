import { useEffect, useMemo, useRef, useState } from 'react';
import type { CozyGame, CozyGameRoundState } from '@shared/cozyGameTypes';
import { playCozyGameWheelTick, playCozyGameWheelStop, playCozyGameStart } from '../utils/sounds';
import { AnimatedCozyWolf } from '../pages/QQBeamerPage';

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

  if (loading) {
    return (
      <FullScreenLayout width={width} height={height}>
        <div style={{ color: '#94a3b8', fontSize: 24 }}>Lade Mini-Spiele…</div>
      </FullScreenLayout>
    );
  }

  // 2026-05-17 (P2 #8): CozyWolf-Reaction-Layer pro Sub-Phase
  const wolfMode = wolfModeForPhase(round.phase);

  switch (round.phase) {
    case 'INTRO':
      return (
        <WithWolf wolfMode={wolfMode}>
          <IntroView width={width} height={height} slotKind={round.slotKind} />
        </WithWolf>
      );

    case 'WHEEL_SPIN':
      return (
        <WithWolf wolfMode={wolfMode}>
          <WheelView
            width={width} height={height}
            slices={availableForWheel}
            targetIdx={round.wheelTargetSliceIndex ?? 0}
            spinning={true}
          />
        </WithWolf>
      );

    case 'WHEEL_RESULT':
      return (
        <WithWolf wolfMode={wolfMode}>
          <WheelView
            width={width} height={height}
            slices={availableForWheel}
            targetIdx={round.wheelTargetSliceIndex ?? 0}
            spinning={false}
            revealedGame={activeGame}
          />
        </WithWolf>
      );

    case 'GAME_ACTIVE':
      return (
        <WithWolf wolfMode={wolfMode}>
          <GameActiveView
            width={width} height={height}
            game={activeGame}
            gameEndsAt={round.gameEndsAt}
          />
        </WithWolf>
      );

    case 'WINNER_SELECT':
      return (
        <WithWolf wolfMode={wolfMode}>
          <WinnerSelectView
            width={width} height={height}
            game={activeGame}
            winnerTeamIds={round.winnerTeamIds}
          />
        </WithWolf>
      );

    default:
      return <FullScreenLayout width={width} height={height}>
        <div style={{ color: '#94a3b8' }}>Unbekannte CozyGame-Phase: {round.phase}</div>
      </FullScreenLayout>;
  }
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

function WithWolf({ wolfMode, children }: { wolfMode: WolfMode; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children}
      <div style={{
        position: 'absolute',
        bottom: 24, right: 32,
        zIndex: 50,
        pointerEvents: 'none',
        animation: 'qqPhasePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      }}>
        <AnimatedCozyWolf
          widthCss="clamp(120px, 11vw, 200px)"
          mode={wolfMode as any}
          speaking={wolfMode === 'jubel' || wolfMode === 'winken'}
          mirror
        />
      </div>
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
      <div style={{ fontSize: 'clamp(80px, 12vw, 200px)', lineHeight: 1 }}>🪅</div>
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
  // 2026-05-17 (Wolf 'langsamer + mehr effekt'): 4s → 6.5s, 5 → 6 volle
  // Umdrehungen für mehr Dramatik. Stop-Snap: 0.6s → 1.2s mit overshoot.
  const fullSpins = spinning ? 6 : 7;
  const finalAngle = fullSpins * 360 + targetAngle;

  const size = Math.min(width * 0.5, height * 0.7);

  // 2026-05-17 (Wolf 'verschiedene farben'): 8-Farben-Brand-Palette statt
  // Pink/Magenta-alternierend. Wechsel pro Slice, repeat wenn n > 8.
  const SLICE_PALETTE = [
    '#EC4899', // pink
    '#A78BFA', // violet
    '#FACC15', // amber
    '#34D399', // mint
    '#60A5FA', // sky
    '#FB923C', // orange
    '#F472B6', // light pink
    '#A21247', // magenta-dark
  ];

  return (
    <FullScreenLayout width={width} height={height}>
      {/* Pointer oben mit Pulse beim Stop */}
      <div style={{ position: 'relative', width: size, height: size + 60 }}>
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
          filter: spinning
            ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
            : `drop-shadow(0 0 18px ${COZY_PINK}) drop-shadow(0 4px 8px rgba(0,0,0,0.4))`,
          animation: spinning ? undefined : 'qqPhasePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }} />
        {/* Rad */}
        <svg
          width={size} height={size}
          viewBox="-100 -100 200 200"
          style={{
            position: 'absolute',
            top: 60, left: 0,
            transform: `rotate(${finalAngle}deg)`,
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
              <g key={g.id} style={{
                filter: isWinnerSlice ? `drop-shadow(0 0 14px ${fillColor})` : undefined,
                transition: 'filter 0.6s ease',
              }}>
                <path
                  d={path}
                  fill={fillColor}
                  stroke="#0F1736"
                  strokeWidth={isWinnerSlice ? 3 : 1.5}
                  style={{
                    transition: 'stroke-width 0.6s ease',
                  }}
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
      {/* Status-Text */}
      {spinning && (
        <div style={{
          fontSize: 'clamp(20px, 2vw, 36px)',
          fontWeight: 700,
          color: '#fff',
          animation: 'qqSpinSlow 1.2s ease-in-out infinite',
        }}>
          🪅 Das Rad dreht …
        </div>
      )}
      {!spinning && revealedGame && (
        <div style={{
          padding: '24px 40px',
          background: 'rgba(255,255,255,0.08)',
          border: `3px solid ${COZY_PINK}`,
          borderRadius: 20,
          display: 'flex', alignItems: 'center', gap: 20,
          marginTop: 12,
          boxShadow: `0 0 60px ${COZY_PINK}55, 0 0 20px ${COZY_PINK}33`,
          animation: 'qqPhasePop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both',
        }}>
          <span style={{ fontSize: 64 }}>{revealedGame.emoji}</span>
          <div>
            <div style={{ fontSize: 'clamp(28px, 3vw, 48px)', fontWeight: 900 }}>{revealedGame.name}</div>
            <div style={{ fontSize: 'clamp(14px, 1.2vw, 20px)', color: '#cbd5e1', marginTop: 4 }}>
              {revealedGame.description}
            </div>
          </div>
        </div>
      )}
    </FullScreenLayout>
  );
}

// ── GAME ACTIVE (Spiel-Card + 60s-Timer) ────────────────────────────────────
function GameActiveView({ width, height, game, gameEndsAt }: {
  width: number; height: number;
  game: CozyGame | null;
  gameEndsAt: number | null;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const remainMs = gameEndsAt ? Math.max(0, gameEndsAt - now) : 0;
  const remainSec = Math.ceil(remainMs / 1000);
  const urgent = remainSec <= 10;

  if (!game) {
    return <FullScreenLayout width={width} height={height}>
      <div style={{ color: '#94a3b8' }}>Kein aktives Spiel</div>
    </FullScreenLayout>;
  }

  return (
    <FullScreenLayout width={width} height={height}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 24,
        padding: '20px 36px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 20,
      }}>
        <span style={{ fontSize: 96 }}>{game.emoji}</span>
        <div>
          <div style={{ fontSize: 'clamp(36px, 4vw, 64px)', fontWeight: 900 }}>{game.name}</div>
          <div style={{ fontSize: 'clamp(16px, 1.5vw, 24px)', color: '#cbd5e1', marginTop: 6, maxWidth: 700 }}>
            {game.description}
          </div>
        </div>
      </div>

      {/* Timer */}
      <div style={{
        marginTop: 12,
        fontSize: 'clamp(120px, 18vw, 280px)',
        fontWeight: 900,
        color: urgent ? '#EF4444' : '#fff',
        textShadow: urgent ? '0 0 32px #EF4444aa' : '0 4px 24px rgba(0,0,0,0.4)',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {remainSec}
      </div>
      <div style={{ fontSize: 'clamp(18px, 1.5vw, 28px)', color: '#94a3b8', marginTop: -8 }}>
        Sekunden
      </div>
    </FullScreenLayout>
  );
}

// ── WINNER SELECT (zwischen Spiel-Ende und PLACEMENT) ────────────────────────
function WinnerSelectView({ width, height, game, winnerTeamIds }: {
  width: number; height: number;
  game: CozyGame | null;
  winnerTeamIds: string[];
}) {
  return (
    <FullScreenLayout width={width} height={height}>
      <div style={{ fontSize: 'clamp(80px, 10vw, 160px)', lineHeight: 1 }}>
        {game?.emoji ?? '🪅'}
      </div>
      <div style={{ fontSize: 'clamp(36px, 4vw, 64px)', fontWeight: 900 }}>
        Zeit abgelaufen!
      </div>
      {winnerTeamIds.length === 0 ? (
        <div style={{ fontSize: 'clamp(18px, 1.5vw, 28px)', color: '#cbd5e1', marginTop: 8 }}>
          ⏳ Moderator wählt den Sieger …
        </div>
      ) : (
        <div style={{ fontSize: 'clamp(20px, 2vw, 32px)', color: '#86efac', marginTop: 8, fontWeight: 700 }}>
          ✨ {winnerTeamIds.length === 1 ? 'Sieger steht fest!' : `${winnerTeamIds.length} Sieger (Tie)`}
        </div>
      )}
    </FullScreenLayout>
  );
}
