import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CozyGameView from '../components/CozyGameView';
import type { CozyGame, CozyGameRoundState, CozyGameRoundPhase } from '@shared/cozyGameTypes';
import { COZY_GAME_V1_SEED } from '@shared/cozyGameTypes';
import type { QQTeam } from '@shared/quarterQuizTypes';

// 2026-05-17 (Wolf): Standalone-Testpage für das CozyGame-Glücksrad +
// Sub-Phasen. Mock-State, kein Backend nötig. Slice-Count-Slider,
// Phase-Stepper, Auto-Spin-Demo.

const PHASE_ORDER: CozyGameRoundPhase[] = ['INTRO', 'WHEEL_SPIN', 'WHEEL_RESULT', 'GAME_ACTIVE', 'WINNER_SELECT'];

// 2026-05-17 v13 (Wolf 'es gibt keinen winner reveal slide'): Mock-Teams für
// Winner-Reveal-Test. avatarId entspricht den 8 Slots aus QQ_AVATARS (shiba,
// faultier, etc.) — Reihenfolge matched QQ_TEAM_PALETTE damit die team.color
// zur Slot-Farbe passt.
const MOCK_TEAMS: QQTeam[] = [
  { id: 't0', name: 'Die Wölfe',        color: '#FA507F', avatarId: 'shiba',     connected: true, totalCells: 0, largestConnected: 0 },
  { id: 't1', name: 'Faule Fünf',       color: '#9DCB2F', avatarId: 'faultier',  connected: true, totalCells: 0, largestConnected: 0 },
  { id: 't2', name: 'Pinguin-Crew',     color: '#266FD3', avatarId: 'pinguin',   connected: true, totalCells: 0, largestConnected: 0 },
  { id: 't3', name: 'Koala-Kombo',      color: '#9A65D5', avatarId: 'koala',     connected: true, totalCells: 0, largestConnected: 0 },
  { id: 't4', name: 'Lange Hälse',      color: '#FEC814', avatarId: 'giraffe',   connected: true, totalCells: 0, largestConnected: 0 },
  { id: 't5', name: 'Waschbären',       color: '#68B4A5', avatarId: 'waschbaer', connected: true, totalCells: 0, largestConnected: 0 },
  { id: 't6', name: 'Mu-Hu-Truppe',     color: '#FF751F', avatarId: 'kuh',       connected: true, totalCells: 0, largestConnected: 0 },
  { id: 't7', name: 'Capy-Connection',  color: '#F84326', avatarId: 'capybara',  connected: true, totalCells: 0, largestConnected: 0 },
];

export default function CozyGameWheelTestPage() {
  const [poolSize, setPoolSize] = useState(8);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [targetIdx, setTargetIdx] = useState(3);
  const [winnerCount, setWinnerCount] = useState(1);
  const [playMode, setPlayMode] = useState<'parallel' | 'sequence'>('parallel');
  const [seqCurIdx, setSeqCurIdx] = useState(0);
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight - 120 });

  useEffect(() => {
    const handler = () => setWinSize({ w: window.innerWidth, h: window.innerHeight - 120 });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const phase = PHASE_ORDER[phaseIdx];

  // Pool aus V1-Seed (max poolSize Spiele)
  const pool = useMemo(() => COZY_GAME_V1_SEED.slice(0, poolSize), [poolSize]);
  const poolIds = useMemo(() => pool.map(g => g.id), [pool]);

  // Mock fetch override: Page nutzt CozyGameView welches /api/cozygames
  // fetcht. Damit das im standalone-Test funktioniert, mocken wir die Antwort.
  useEffect(() => {
    const original = window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/cozygames')) {
        return Promise.resolve(new Response(JSON.stringify(COZY_GAME_V1_SEED), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
      return original.call(window, input as any, init);
    };
    return () => { window.fetch = original; };
  }, []);

  // Winner-Teams: bei WINNER_SELECT-Phase die ersten N Teams als Sieger
  // simulieren. winnerCount=0 → Wartebild ("Mod wählt"). winnerCount>0 →
  // Hero-Reveal mit Avataren.
  const winnerTeamIds = useMemo(() => (
    phase === 'WINNER_SELECT'
      ? MOCK_TEAMS.slice(0, Math.max(0, Math.min(winnerCount, MOCK_TEAMS.length))).map(t => t.id)
      : []
  ), [phase, winnerCount]);

  // Sequence-Mode Mock: bei GAME_ACTIVE + sequence eine sortierte Team-Order
  // (Mock = MOCK_TEAMS-Reihenfolge) + curIdx, completedIds aus dem Slider.
  const sequenceOrder = useMemo(() => MOCK_TEAMS.map(t => t.id), []);
  const sequenceCompletedTeamIds = useMemo(
    () => sequenceOrder.slice(0, Math.max(0, seqCurIdx)),
    [sequenceOrder, seqCurIdx]
  );

  const round: CozyGameRoundState = useMemo(() => ({
    poolGameIds: poolIds,
    playedGameIds: [],
    phase,
    activeGameId: phaseIdx >= 2 ? pool[targetIdx]?.id ?? null : null,
    wheelTargetSliceIndex: targetIdx,
    gameEndsAt: phase === 'GAME_ACTIVE' ? Date.now() + 60000 : null,
    slotKind: 'roundPause',
    winnerTeamIds,
    playMode,
    ...(playMode === 'sequence' ? {
      sequenceOrder,
      sequenceCurrentIdx: seqCurIdx,
      sequenceCompletedTeamIds,
      timerDurationSec: 60,
    } : {}),
  }), [poolIds, phase, targetIdx, phaseIdx, pool, winnerTeamIds, playMode, sequenceOrder, seqCurIdx, sequenceCompletedTeamIds]);

  function autoSpinDemo() {
    setPhaseIdx(0);
    setTargetIdx(Math.floor(Math.random() * poolSize));
    setTimeout(() => setPhaseIdx(1), 800);  // INTRO → SPIN
    setTimeout(() => setPhaseIdx(2), 7400); // SPIN (6.5s) → RESULT
    setTimeout(() => setPhaseIdx(3), 10500); // RESULT → ACTIVE (60s timer)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0b0d14 0%, #0F1736 100%)',
      color: '#e2e8f0',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Control-Bar */}
      <div style={{
        padding: '12px 24px',
        background: 'rgba(15,23,42,0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link to="/menu" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>← Menu</Link>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🪅 CozyGame-Wheel Test</h1>

        <div style={{ flex: 1 }} />

        <label style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
          Pool:
          <input
            type="range"
            min={3} max={8} step={1}
            value={poolSize}
            onChange={e => setPoolSize(Number(e.target.value))}
            style={{ width: 80, accentColor: '#EC4899' }}
          />
          <b>{poolSize}</b>
        </label>

        <label style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
          Target:
          <input
            type="range"
            min={0} max={poolSize - 1} step={1}
            value={Math.min(targetIdx, poolSize - 1)}
            onChange={e => setTargetIdx(Number(e.target.value))}
            style={{ width: 80, accentColor: '#EC4899' }}
          />
          <b>{Math.min(targetIdx, poolSize - 1)}</b>
        </label>

        <div style={{ display: 'flex', gap: 4 }}>
          {PHASE_ORDER.map((p, i) => (
            <button
              key={p}
              onClick={() => setPhaseIdx(i)}
              style={{
                padding: '6px 10px', borderRadius: 6,
                border: phaseIdx === i ? '2px solid #EC4899' : '1px solid rgba(255,255,255,0.12)',
                background: phaseIdx === i ? 'rgba(236,72,153,0.2)' : 'transparent',
                color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >{p.replace('_', ' ')}</button>
          ))}
        </div>

        {/* Play-Mode Toggle (parallel = aktuelles Verhalten, sequence = Teams nacheinander) */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['parallel', 'sequence'] as const).map(m => (
            <button
              key={m}
              onClick={() => setPlayMode(m)}
              style={{
                padding: '6px 10px', borderRadius: 6,
                border: playMode === m ? '2px solid #22C55E' : '1px solid rgba(255,255,255,0.12)',
                background: playMode === m ? 'rgba(34,197,94,0.2)' : 'transparent',
                color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >{m === 'parallel' ? '🤜 Parallel' : '👤 Sequence'}</button>
          ))}
        </div>

        {/* Sequence-Slider: nur bei GAME_ACTIVE + sequence relevant */}
        {phase === 'GAME_ACTIVE' && playMode === 'sequence' && (
          <label style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
            CurTeam:
            <input
              type="range"
              min={0} max={MOCK_TEAMS.length - 1} step={1}
              value={seqCurIdx}
              onChange={e => setSeqCurIdx(Number(e.target.value))}
              style={{ width: 80, accentColor: '#22C55E' }}
            />
            <b>{seqCurIdx + 1}/{MOCK_TEAMS.length}</b>
          </label>
        )}

        {/* Winner-Slider nur in WINNER_SELECT relevant — 0 = Wartebild,
            1-8 = Hero-Reveal mit N Sieger(n). */}
        {phase === 'WINNER_SELECT' && (
          <label style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
            Winner:
            <input
              type="range"
              min={0} max={8} step={1}
              value={winnerCount}
              onChange={e => setWinnerCount(Number(e.target.value))}
              style={{ width: 80, accentColor: '#EC4899' }}
            />
            <b>{winnerCount}</b>
          </label>
        )}

        <button
          onClick={autoSpinDemo}
          style={{
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: '#EC4899', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(236,72,153,0.5)',
          }}
        >▶ Auto-Demo</button>
      </div>

      {/* Bühne */}
      <div style={{ width: '100%', height: winSize.h, position: 'relative' }}>
        <CozyGameView round={round} width={winSize.w} height={winSize.h} teams={MOCK_TEAMS} />
      </div>

      {/* Info-Footer */}
      <div style={{
        padding: '12px 24px',
        fontSize: 11, color: '#64748b',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        Standalone-Mock — keine Backend-Sockets, kein echtes Spiel. Phase{' '}
        <code style={{ color: '#EC4899' }}>{phase}</code> · Target-Slice{' '}
        <code style={{ color: '#EC4899' }}>{Math.min(targetIdx, poolSize - 1)}</code> · Pool{' '}
        <code style={{ color: '#EC4899' }}>{poolSize}</code>
      </div>
    </div>
  );
}
