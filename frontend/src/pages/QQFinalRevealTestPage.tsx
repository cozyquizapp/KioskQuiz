import { useState } from 'react';
import { FinalRevealView } from './QQBeamerPage';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';

/**
 * QQFinalRevealTestPage — Standalone-Vorschau der FinalReveal-Choreografie.
 * Slider zum manuellen Step-Steuern (0..N+4), Team-Count + Award-Set Toggle.
 *
 * Akt-Mapping (siehe decodeFinalStep) — v8 (2026-05-10):
 *   0       = title
 *   1       = grid
 *   2..N+1  = bet (1 pro Team, aufsteigend nach Bonus)
 *   N+2     = awards-overview (alle 3 BG-Cards mit Erklärung)
 *   N+3     = awards-reveal (Auto-Choreo: 3 Flips gestaffelt, ~8s)
 *   N+4     = race-final (Auto-Choreo ~33s mit Treppchen-Rise)
 */

const TEAMS_5 = [
  { id: 't1', name: 'Käpt\'n Kluk',  color: '#22C55E', avatarId: 'koala',   emoji: '🦝', connected: true, totalCells: 9,  largestConnected: 6 },
  { id: 't2', name: 'Wolfsrudel',    color: '#EC4899', avatarId: 'wolf',    emoji: '🐺', connected: true, totalCells: 7,  largestConnected: 5 },
  { id: 't3', name: 'Eulen-Crew',    color: '#A855F7', avatarId: 'owl',     emoji: '🦉', connected: true, totalCells: 5,  largestConnected: 3 },
  { id: 't4', name: 'Polarfuchs',    color: '#06B6D4', avatarId: 'fox',     emoji: '🦊', connected: true, totalCells: 3,  largestConnected: 2 },
  { id: 't5', name: 'Honig-Bären',   color: '#F59E0B', avatarId: 'bear',    emoji: '🐻', connected: true, totalCells: 1,  largestConnected: 1 },
] as QQStateUpdate['teams'];

const TEAMS_3 = TEAMS_5.slice(0, 3);
const TEAMS_8 = [
  ...TEAMS_5,
  { id: 't6', name: 'Tiger-Team',     color: '#EF4444', avatarId: 'tiger',   emoji: '🐯', connected: true, totalCells: 0, largestConnected: 0 },
  { id: 't7', name: 'Pinguine',       color: '#3B82F6', avatarId: 'penguin', emoji: '🐧', connected: true, totalCells: 0, largestConnected: 0 },
  { id: 't8', name: 'Drachen-Brut',   color: '#FB923C', avatarId: 'dragon',  emoji: '🐉', connected: true, totalCells: 0, largestConnected: 0 },
] as QQStateUpdate['teams'];

function buildMockGrid(teams: QQStateUpdate['teams']): QQStateUpdate['grid'] {
  const totalCells = teams.reduce((sum, t) => sum + (t.totalCells ?? 0), 0) || 25;
  const ids: string[] = [];
  for (const t of teams) {
    const n = Math.round(((t.totalCells ?? 0) / totalCells) * 25);
    for (let i = 0; i < n; i++) ids.push(t.id);
  }
  while (ids.length < 25) ids.push(teams[0]?.id ?? null as any);
  ids.length = 25;
  const grid = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => ({
      row: r, col: c,
      ownerId: ids[r * 5 + c] ?? null,
      jokerFormed: false,
      placedBy: ids[r * 5 + c] ?? null,
    }))
  );
  return grid as QQStateUpdate['grid'];
}

const STEP_LABELS: Record<number, string> = {
  // Wir labeln die Steps relativ — bei N=5 wäre 0=title, 1=grid, 2..6=bet, 7..10=awards, 11=stage, 12=fill, 13=drop
};

function getStepLabel(step: number, N: number): string {
  if (step <= 0) return '0 · Title';
  if (step === 1) return '1 · Grid-Reveal';
  if (step <= 1 + N) return `${step} · Bet-Reveal Team ${step - 1}/${N}`;
  const ab = step - (1 + N);
  if (ab === 1) return `${step} · Awards: Overview (alle BG)`;
  if (ab === 2) return `${step} · Awards: Auto-Reveal (3× Flip ~8s)`;
  if (ab === 3) return `${step} · 🏁 RACE-FINAL (Auto-Choreo ~33s)`;
  return `${step} · (max ${N + 4})`;
}

export default function QQFinalRevealTestPage() {
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [teamCount, setTeamCount] = useState<3 | 5 | 8>(5);
  // Default: race-final Step (N+4) bei N=5 → 9
  const [step, setStep] = useState<number>(9);
  // Replay-Counter: erhöht sich bei „Replay"-Klick → erzwingt Re-Mount
  // damit die Race-Auto-Choreo neu startet ohne Step-Wechsel.
  const [replayKey, setReplayKey] = useState<number>(0);

  const teams = teamCount === 3 ? TEAMS_3 : teamCount === 8 ? TEAMS_8 : TEAMS_5;
  const N = teams.length;
  const maxStep = N + 4; // race-final ist letzter Step (war N+6 vor Awards-Refactor)
  const grid = buildMockGrid(teams);

  // Default: bei Team-Count-Wechsel auf race-final springen
  const handleTeamCountChange = (n: 3 | 5 | 8) => {
    setTeamCount(n);
    setStep(n + 4); // race-final für neuen N
  };

  // Mock endAwards (alle 3 vergeben)
  const endAwards = {
    underdog: teams[teams.length - 1]?.id ?? null,
    meisterklauer: teams[2]?.id ?? null,
    speedy: teams[0]?.id ?? null,
    meisterklauerCount: 4,
    speedyAvgMs: -1200,
  };

  // Mock finalBetResolution
  const finalBetResolution: QQStateUpdate['finalBetResolution'] = teams.length >= 2 ? {
    [teams[0].id]: { targetTeamId: teams[1].id, mutualWith: teams[1].id, totalBonus: 4, baseBonus: 3, sympathyBonus: 1 } as any,
    [teams[1].id]: { targetTeamId: teams[0].id, mutualWith: teams[0].id, totalBonus: 4, baseBonus: 3, sympathyBonus: 1 } as any,
    ...(teams[2] ? { [teams[2].id]: { targetTeamId: teams[3]?.id ?? teams[0].id, mutualWith: null, totalBonus: 2, baseBonus: 2, sympathyBonus: 0 } as any } : {}),
    ...(teams[3] ? { [teams[3].id]: { targetTeamId: teams[0].id, mutualWith: null, totalBonus: 0, baseBonus: 0, sympathyBonus: 0 } as any } : {}),
    ...(teams[4] ? { [teams[4].id]: { targetTeamId: null, mutualWith: null, totalBonus: 0, baseBonus: 0, sympathyBonus: 0 } as any } : {}),
  } : null;

  const mockState = {
    roomCode: 'DEMO',
    phase: 'FINAL_REVEAL',
    setupDone: true,
    gamePhaseIndex: 4,
    questionIndex: 24,
    gridSize: 5,
    grid,
    teams,
    teamPhaseStats: {},
    currentQuestion: null,
    revealedAnswer: null,
    correctTeamId: null,
    pendingFor: null,
    pendingAction: null,
    comebackTeamId: null,
    comebackAction: null,
    comebackStealTargets: [],
    comebackStealsDone: [],
    swapFirstCell: null,
    language: lang,
    timerDurationSec: 20,
    timerEndsAt: null,
    answers: [],
    buzzQueue: [],
    hotPotatoActiveTeamId: null,
    hotPotatoEliminated: [],
    hotPotatoLastAnswer: null,
    hotPotatoTurnEndsAt: null,
    hotPotatoUsedAnswers: [],
    imposterActiveTeamId: null,
    imposterChosenIndices: [],
    imposterEliminated: [],
    lastPlacedCell: null,
    imageRevealed: false,
    avatarsEnabled: true,
    totalPhases: 4,
    globalMuted: false,
    musicMuted: false,
    sfxMuted: true, // im Test-Modus stumm damit nicht jeder Step Sound triggert
    volume: 0.8,
    frozenCells: [],
    shieldedCells: [],
    stuckCandidates: [],
    rulesSlideIndex: 0,
    introStep: 0,
    categoryIsNew: false,
    allAnswered: false,
    enable3DTransition: false,
    teamsRevealStartedAt: null,
    mapRevealStep: 0,
    comebackIntroStep: 0,
    muchoRevealStep: 0,
    zvzRevealStep: 0,
    cheeseRevealStep: 0,
    finalBets: {},
    finalBettingSubmitted: {},
    finalPhaseWins: {},
    finalLastSnapshot: null,
    finalRecapStep: 0,
    finalRecapJustWon: null,
    finalRevealStep: step,
    finalRoundWinners: null,
    finalBetResolution,
    endAwards,
    finalWagerEnabled: true,
    teamTotalSteals: {},
  } as unknown as QQStateUpdate;

  const btnStyle: React.CSSProperties = {
    padding: '6px 12px', borderRadius: 8,
    background: 'rgba(236,72,153,0.18)', border: '1px solid rgba(236,72,153,0.5)',
    color: '#F1F5F9', fontWeight: 700, fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit',
  };
  const btnActive: React.CSSProperties = {
    ...btnStyle,
    background: '#EC4899', borderColor: '#EC4899',
    boxShadow: '0 0 14px rgba(236,72,153,0.6)',
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100vw',
      background: '#0A0814',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Toggle-Bar oben */}
      <div style={{
        position: 'fixed', top: 12, right: 12, zIndex: 100,
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: 12, borderRadius: 12,
        background: 'rgba(15,8,23,0.92)',
        border: '1.5px solid rgba(236,72,153,0.4)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        fontFamily: 'system-ui, sans-serif',
        minWidth: 280,
      }}>
        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          🎬 FinalReveal-Test
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={lang === 'de' ? btnActive : btnStyle} onClick={() => setLang('de')}>DE</button>
          <button style={lang === 'en' ? btnActive : btnStyle} onClick={() => setLang('en')}>EN</button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={teamCount === 3 ? btnActive : btnStyle} onClick={() => handleTeamCountChange(3)}>3T</button>
          <button style={teamCount === 5 ? btnActive : btnStyle} onClick={() => handleTeamCountChange(5)}>5T</button>
          <button style={teamCount === 8 ? btnActive : btnStyle} onClick={() => handleTeamCountChange(8)}>8T</button>
        </div>

        {/* Step-Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 700 }}>
            Step: <span style={{ color: '#FBBF24', fontWeight: 900 }}>{step}</span> / {maxStep}
          </div>
          <input
            type="range"
            min={0} max={maxStep} value={step}
            onChange={(e) => setStep(parseInt(e.target.value, 10))}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 11, color: '#FBBF24', fontStyle: 'italic' }}>
            {getStepLabel(step, N)}
          </div>
        </div>

        {/* Quick-Jumps zu den Hauptphasen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Quick-Jump</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button style={step === 0 ? btnActive : btnStyle} onClick={() => setStep(0)}>Title</button>
            <button style={step === 1 ? btnActive : btnStyle} onClick={() => setStep(1)}>Grid</button>
            <button style={step === N + 2 ? btnActive : btnStyle} onClick={() => setStep(N + 2)}>Awards BG</button>
            <button style={step === N + 3 ? btnActive : btnStyle} onClick={() => setStep(N + 3)}>Awards Reveal</button>
            <button style={step === N + 4 ? btnActive : btnStyle} onClick={() => setStep(N + 4)}>🏁 Race</button>
          </div>
          {/* Replay Race: gleicher Step + force re-mount via key in render */}
        </div>

        {/* Step-Buttons (Prev / Next / Replay) */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={btnStyle} onClick={() => setStep(Math.max(0, step - 1))}>◀ Prev</button>
          <button style={btnStyle} onClick={() => setStep(Math.min(maxStep, step + 1))}>Next ▶</button>
          <button
            style={{ ...btnStyle, background: 'rgba(251,191,36,0.18)', borderColor: 'rgba(251,191,36,0.5)' }}
            onClick={() => setReplayKey(k => k + 1)}
            title="Race-Choreo neu starten"
          >🔁 Replay</button>
        </div>
      </div>

      {/* FinalRevealView mit aktuellem Step — key includes replayKey damit
          Replay-Button ein force-Re-Mount auslöst (Auto-Choreo fängt von vorn an). */}
      <div key={`${teamCount}-${step}-${replayKey}`} style={{ flex: 1, display: 'flex' }}>
        <FinalRevealView state={mockState} />
      </div>
    </div>
  );
}
