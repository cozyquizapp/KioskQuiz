import { useState, useEffect } from 'react';
import { FinalRevealView, FinalBettingView } from './QQBeamerPage';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';

/**
 * QQFinalRevealTestPage — Standalone-Vorschau des kompletten Final-Flows:
 * Bet-Intro → Bet-Active → FinalReveal-Choreo. Phase-Toggle + Step-Slider.
 *
 * 2026-05-24 v3 (Wolf 'awards-overview raus'):
 *   0                      = title
 *   1/2/3                  = award-slot 0/1/2 (Drumroll + Live-Tabelle)
 *   4..3+betSlotsCount     = bet-slots (Split + Live-Tabelle)
 *   betSlotsCount+4        = race-final (Eurovision-Finale Hero-Standings)
 *
 * Flow-Phasen:
 *   'bet-intro'  → FinalBettingView mit introDone=false (Mod-Space dismissed)
 *   'bet-active' → FinalBettingView mit Submission-Counter
 *   'reveal'     → FinalRevealView mit Step-Slider
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

function getStepLabel(step: number, betSlotsCount: number): string {
  // 2026-05-25 v4 (Wolf 'bets vor awards, awards-last als climax'):
  // title → bet-slots → award-slots (Speedy/Meisterklauer/Underdog) → race.
  if (step <= 0) return '0 · Title';
  if (step <= betSlotsCount) {
    const slotIdx = step - 1;
    return `${step} · 🪙 Bet-Slot ${slotIdx + 1}/${betSlotsCount} (Stack-Placement)`;
  }
  const awardOffset = step - betSlotsCount;
  if (awardOffset === 1) return `${step} · ⚡ Speedy-Award (+1 Stack)`;
  if (awardOffset === 2) return `${step} · 🦝 Meisterklauer-Award (+1 Stack)`;
  if (awardOffset === 3) return `${step} · 🐢 Underdog-Award (+2 Stacks — Climax)`;
  return `${step} · 🏁 Eurovision-Endstand`;
}

type FlowPhase = 'bet-intro' | 'bet-active' | 'reveal';

export default function QQFinalRevealTestPage() {
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [teamCount, setTeamCount] = useState<3 | 5 | 8>(5);
  // 2026-05-24 (Wolf-Wunsch Full-Flow-Test): Phase-Toggle vor dem Step-Slider.
  const [flowPhase, setFlowPhase] = useState<FlowPhase>('bet-intro');
  const [betSubmittedCount, setBetSubmittedCount] = useState<number>(0);
  // Default: race-final Step bei N=5 mit betSlots=5 → 8 (race-final)
  const [step, setStep] = useState<number>(8);
  // Replay-Counter: erhöht sich bei „Replay"-Klick → erzwingt Re-Mount
  // damit die Race-Auto-Choreo neu startet ohne Step-Wechsel.
  const [replayKey, setReplayKey] = useState<number>(0);
  // 2026-05-10 (Wolf 'Panel ausblendbar'): Toggle-Bar einklappbar, damit
  // der Beamer-Effekt fullscreen sichtbar ist. Default = sichtbar.
  const [panelVisible, setPanelVisible] = useState<boolean>(true);

  // 2026-05-10 (Wolf 'Test-Page scrollt — abstellen'): body+html overflow
  // hidden während TestPage gemountet ist. Cleanup bei Unmount.
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const teams = teamCount === 3 ? TEAMS_3 : teamCount === 8 ? TEAMS_8 : TEAMS_5;
  const N = teams.length;
  const grid = buildMockGrid(teams);

  // 2026-05-25 v4 (Wolf 'grid zu voll, max 1 stamp pro cell'):
  // LRU-Spread — pro Stamp die Cell mit wenigsten Stamps picken. Verteilt
  // 4-5 Stamps auf 4-5 Cells, jede Cell hat nur 1 Stamp diagonal zum Avatar.
  const addStamp = (teamId: string | null, kind: 'underdog' | 'speedy' | 'meisterklauer' | 'bet' | 'sympathy') => {
    if (!teamId) return;
    const ownCells: any[] = grid.flat().filter(c => c.ownerId === teamId);
    if (ownCells.length === 0) return;
    const stampCount = (c: any) => c.revealStamps?.length ?? 0;
    let target: any = ownCells[0];
    let minStamps = stampCount(target);
    for (const c of ownCells) {
      const sc = stampCount(c);
      if (sc < minStamps) { target = c; minStamps = sc; }
    }
    if (!target.revealStamps) target.revealStamps = [];
    target.revealStamps.push({ kind, teamId });
  };

  // Mock endAwards (alle 3 vergeben)
  const endAwards = {
    underdog: teams[teams.length - 1]?.id ?? null,
    meisterklauer: teams[2]?.id ?? null,
    speedy: teams[0]?.id ?? null,
    meisterklauerCount: 4,
    speedyAvgMs: -1200,
  };

  // Mock finalBetResolution — verschiedene Bonus-Werte für realistic
  // betSlots-Test (zero-group + positive einzeln)
  const finalBetResolution: QQStateUpdate['finalBetResolution'] = teams.length >= 2 ? {
    [teams[0].id]: { targetTeamId: teams[1].id, mutualWith: teams[1].id, totalBonus: 4, baseBonus: 3, sympathyBonus: 1 } as any,
    [teams[1].id]: { targetTeamId: teams[0].id, mutualWith: teams[0].id, totalBonus: 4, baseBonus: 3, sympathyBonus: 1 } as any,
    ...(teams[2] ? { [teams[2].id]: { targetTeamId: teams[3]?.id ?? teams[0].id, mutualWith: null, totalBonus: 2, baseBonus: 2, sympathyBonus: 0 } as any } : {}),
    ...(teams[3] ? { [teams[3].id]: { targetTeamId: teams[0].id, mutualWith: null, totalBonus: 0, baseBonus: 0, sympathyBonus: 0 } as any } : {}),
    ...(teams[4] ? { [teams[4].id]: { targetTeamId: null, mutualWith: null, totalBonus: 0, baseBonus: 0, sympathyBonus: 0 } as any } : {}),
    // Bei N=8: auch t5+t6 Bets, t7 ohne Bet
    ...(teams[5] ? { [teams[5].id]: { targetTeamId: teams[2].id, mutualWith: null, totalBonus: 0, baseBonus: 0, sympathyBonus: 0 } as any } : {}),
    ...(teams[6] ? { [teams[6].id]: { targetTeamId: teams[1].id, mutualWith: null, totalBonus: 3, baseBonus: 3, sympathyBonus: 0 } as any } : {}),
    ...(teams[7] ? { [teams[7].id]: { targetTeamId: null, mutualWith: null, totalBonus: 0, baseBonus: 0, sympathyBonus: 0 } as any } : {}),
  } : null;

  // 2026-05-10 (Wolf 'BetReveal Variante D'): betSlotsCount = positive + (zero ? 1 : 0)
  // No-Bet-Teams (targetTeamId=null) werden komplett übersprungen.
  const betted = teams.filter(t => finalBetResolution?.[t.id]?.targetTeamId);
  const zeroExists = betted.some(t => (finalBetResolution?.[t.id]?.totalBonus ?? 0) === 0);
  const positiveCount = betted.filter(t => (finalBetResolution?.[t.id]?.totalBonus ?? 0) > 0).length;
  const betSlotsCount = positiveCount + (zeroExists ? 1 : 0);
  const maxStep = betSlotsCount + 4; // race-final ist letzter Step

  // Default: bei Team-Count-Wechsel auf race-final springen
  const handleTeamCountChange = (n: 3 | 5 | 8) => {
    setTeamCount(n);
    setStep(maxStep); // wird beim re-render durch neuen betSlotsCount korrigiert
  };

  // Build finalBettingSubmitted-Record fuer bet-active Phase.
  const finalBettingSubmitted: Record<string, boolean> = {};
  const effectiveSubmitted = Math.min(betSubmittedCount, N);
  for (let i = 0; i < effectiveSubmitted; i++) {
    finalBettingSubmitted[teams[i].id] = true;
  }

  const mockPhase = flowPhase === 'reveal' ? 'FINAL_REVEAL' : 'FINAL_BETTING';
  const mockFinalBettingIntroDone = flowPhase === 'bet-active';

  // Stamps fuer alle bereits passierten Steps applizieren (1..currentStep-1).
  // Spiegelt Live: Bot-Auto-Place flusht beim Advance den vorigen Step.
  if (flowPhase === 'reveal' && finalBetResolution) {
    const positiveTeams = teams.filter(t => finalBetResolution[t.id]?.targetTeamId && (finalBetResolution[t.id]?.totalBonus ?? 0) > 0)
      .sort((a, b) => {
        const ba = finalBetResolution[a.id]!.totalBonus;
        const bb = finalBetResolution[b.id]!.totalBonus;
        if (ba !== bb) return ba - bb;
        return a.name.localeCompare(b.name);
      });
    const zeroExists2 = teams.some(t => finalBetResolution[t.id]?.targetTeamId && (finalBetResolution[t.id]?.totalBonus ?? 0) === 0);
    // step=1..betSlotsCount → bet-slots. Stamps werden GESETZT wenn step > slot
    // (also der Slot ist bereits past — sein Stamp ist gelandet).
    for (let s = 1; s <= step && s <= betSlotsCount; s++) {
      let slotIdx = s - 1;
      if (zeroExists2) {
        if (slotIdx === 0) continue; // zero-group hat keine Stacks
        slotIdx -= 1;
      }
      const tm = positiveTeams[slotIdx];
      if (!tm) continue;
      const res = finalBetResolution[tm.id]!;
      const wins = res.targetWins ?? Math.max(0, (res.totalBonus ?? 0) - (res.sympathyBonus ?? 0));
      const symp = res.sympathyBonus ?? 0;
      // Stamps werden NUR fuer past steps gesetzt (s < step), NICHT fuer current step.
      if (s < step) {
        for (let i = 0; i < wins; i++) addStamp(tm.id, 'bet');
        for (let i = 0; i < symp; i++) addStamp(tm.id, 'sympathy');
      }
    }
    // award-steps (B+1 .. B+3)
    if (step > betSlotsCount + 1) addStamp(endAwards.speedy ?? null, 'speedy');
    if (step > betSlotsCount + 2) addStamp(endAwards.meisterklauer ?? null, 'meisterklauer');
    if (step > betSlotsCount + 3) { addStamp(endAwards.underdog ?? null, 'underdog'); addStamp(endAwards.underdog ?? null, 'underdog'); }
  }

  const mockState = {
    roomCode: 'DEMO',
    phase: mockPhase,
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
    finalBettingSubmitted,
    finalBettingIntroDone: mockFinalBettingIntroDone,
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
      // 2026-05-10 (Wolf 'TestPage scrollt'): height: 100vh statt minHeight
      // + overflow: hidden auf outer → keine Scrollbar mehr.
      height: '100vh', width: '100vw',
      overflow: 'hidden',
      background: '#0A0814',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Show-Panel Button — sichtbar wenn Panel ausgeblendet */}
      {!panelVisible && (
        <button
          onClick={() => setPanelVisible(true)}
          style={{
            position: 'fixed', top: 12, right: 12, zIndex: 100,
            padding: '8px 14px', borderRadius: 10,
            background: 'rgba(15,8,23,0.85)',
            border: '1.5px solid rgba(236,72,153,0.4)',
            color: '#F1F5F9', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >☰ Panel</button>
      )}
      {/* Toggle-Bar oben */}
      {panelVisible && (
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            🎬 Final-Flow-Test
          </div>
          <button
            onClick={() => setPanelVisible(false)}
            title="Panel ausblenden"
            style={{
              padding: '2px 8px', borderRadius: 6,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#94A3B8', fontSize: 14, lineHeight: 1,
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
            }}
          >×</button>
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

        {/* Flow-Phase-Toggle (2026-05-24 Wolf-Wunsch: kompletter Final-Flow) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Phase</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={flowPhase === 'bet-intro' ? btnActive : btnStyle} onClick={() => setFlowPhase('bet-intro')}>🎰 Bet-Intro</button>
            <button style={flowPhase === 'bet-active' ? btnActive : btnStyle} onClick={() => setFlowPhase('bet-active')}>🪙 Bet-Active</button>
            <button style={flowPhase === 'reveal' ? btnActive : btnStyle} onClick={() => setFlowPhase('reveal')}>🎬 Reveal</button>
          </div>
          {flowPhase === 'bet-active' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              <div style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 700 }}>
                Submissions: <span style={{ color: '#FBBF24', fontWeight: 900 }}>{effectiveSubmitted}</span> / {N}
              </div>
              <input
                type="range"
                min={0} max={N} value={betSubmittedCount}
                onChange={(e) => setBetSubmittedCount(parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>

        {/* Step-Slider — nur in Reveal-Phase relevant */}
        {flowPhase === 'reveal' && (
        <>
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
            {getStepLabel(step, betSlotsCount)}
          </div>
        </div>

        {/* Quick-Jumps zu den Reveal-Hauptphasen — 2026-05-24 Race-Redesign */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Quick-Jump</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button style={step === 0 ? btnActive : btnStyle} onClick={() => setStep(0)}>Title</button>
            {/* v4: Bets vor Awards. Award-Buttons sind dynamisch (Position
                hängt von betSlotsCount ab). Quick-Jump zu Bet-Slot 1 = step 1. */}
            <button style={step === 1 ? btnActive : btnStyle} onClick={() => setStep(1)}>🪙 Bet-Slot 1</button>
            <button style={step === betSlotsCount + 1 ? btnActive : btnStyle} onClick={() => setStep(betSlotsCount + 1)}>⚡ Speedy</button>
            <button style={step === betSlotsCount + 2 ? btnActive : btnStyle} onClick={() => setStep(betSlotsCount + 2)}>🦝 Meisterklauer</button>
            <button style={step === betSlotsCount + 3 ? btnActive : btnStyle} onClick={() => setStep(betSlotsCount + 3)}>🐢 Underdog</button>
            <button style={step === maxStep ? btnActive : btnStyle} onClick={() => setStep(maxStep)}>🏁 Finale</button>
          </div>
        </div>

        {/* Step-Buttons (Prev / Next / Replay) */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={btnStyle} onClick={() => setStep(Math.max(0, step - 1))}>◀ Prev</button>
          <button style={btnStyle} onClick={() => setStep(Math.min(maxStep, step + 1))}>Next ▶</button>
          <button
            style={{ ...btnStyle, background: 'rgba(251,191,36,0.18)', borderColor: 'rgba(251,191,36,0.5)' }}
            onClick={() => setReplayKey(k => k + 1)}
            title="Choreo neu starten"
          >🔁 Replay</button>
        </div>
        </>
        )}
      </div>
      )}

      {/* Render je nach Flow-Phase. key includes replayKey + flowPhase damit
          jeder Wechsel ein force-Re-Mount auslöst (Auto-Choreo fängt von vorn an). */}
      <div key={`${teamCount}-${step}-${flowPhase}-${effectiveSubmitted}-${replayKey}`} style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {flowPhase === 'reveal'
          ? <FinalRevealView state={mockState} />
          : <FinalBettingView state={mockState} />
        }
      </div>
    </div>
  );
}
