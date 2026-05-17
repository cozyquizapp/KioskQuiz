import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CozyGameView from '../components/CozyGameView';
import type { CozyGame, CozyGameRoundState, CozyGameRoundPhase } from '@shared/cozyGameTypes';
import { COZY_GAME_V1_SEED } from '@shared/cozyGameTypes';

// 2026-05-17 (Wolf): Standalone-Testpage für das CozyGame-Glücksrad +
// Sub-Phasen. Mock-State, kein Backend nötig. Slice-Count-Slider,
// Phase-Stepper, Auto-Spin-Demo.

const PHASE_ORDER: CozyGameRoundPhase[] = ['INTRO', 'WHEEL_SPIN', 'WHEEL_RESULT', 'GAME_ACTIVE', 'WINNER_SELECT'];

export default function CozyGameWheelTestPage() {
  const [poolSize, setPoolSize] = useState(8);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [targetIdx, setTargetIdx] = useState(3);
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

  const round: CozyGameRoundState = useMemo(() => ({
    poolGameIds: poolIds,
    playedGameIds: [],
    phase,
    activeGameId: phaseIdx >= 2 ? pool[targetIdx]?.id ?? null : null,
    wheelTargetSliceIndex: targetIdx,
    gameEndsAt: phase === 'GAME_ACTIVE' ? Date.now() + 60000 : null,
    slotKind: 'roundPause',
    winnerTeamIds: [],
  }), [poolIds, phase, targetIdx, phaseIdx, pool]);

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
        <CozyGameView round={round} width={winSize.w} height={winSize.h} />
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
