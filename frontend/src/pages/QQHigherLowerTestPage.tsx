import { useState, useEffect } from 'react';
import { ComebackView } from '../components/CozyQuizComebackView';
import type { QQStateUpdate, QQHLChoice } from '../../../shared/quarterQuizTypes';

/**
 * QQHigherLowerTestPage — Standalone-Vorschau der Comeback Higher/Lower View.
 * 2026-05-13 (Wolf-Wunsch): Layout testbar ohne durchs ganze Spiel zu klicken.
 * Toggles: Phase (question/reveal), Anzahl Teams, Sprache, Question-Pair.
 */

const TEAMS_5 = [
  { id: 't1', name: 'Faultier-Clan', color: '#22C55E', avatarId: 'sloth',   emoji: '🦥', connected: true, totalCells: 1, largestConnected: 1 },
  { id: 't2', name: 'Wolfsrudel',    color: '#EC4899', avatarId: 'wolf',    emoji: '🐺', connected: true, totalCells: 1, largestConnected: 1 },
  { id: 't3', name: 'Eulen-Crew',    color: '#A855F7', avatarId: 'owl',     emoji: '🦉', connected: true, totalCells: 1, largestConnected: 1 },
  { id: 't4', name: 'Polarfuchs',    color: '#06B6D4', avatarId: 'fox',     emoji: '🦊', connected: true, totalCells: 1, largestConnected: 1 },
  { id: 't5', name: 'Honig-Bären',   color: '#F59E0B', avatarId: 'bear',    emoji: '🐻', connected: true, totalCells: 1, largestConnected: 1 },
] as QQStateUpdate['teams'];

const TEAMS_1 = TEAMS_5.slice(0, 1);
const TEAMS_2 = TEAMS_5.slice(0, 2);
const TEAMS_3 = TEAMS_5.slice(0, 3);

/** Vordefinierte Pair-Beispiele (Wolfs aktueller Live-Content + ein paar Varianten). */
const PAIRS = [
  {
    id: 'gold-vs-btc',
    label: 'Gold vs Bitcoin',
    anchorLabel: 'Bitcoin', anchorValue: 2000, subjectLabel: 'Gold', subjectValue: 23000,
    unit: 'Mrd. USD Marktkapitalisierung',
    customQuestion: 'Hat Gold mehr oder weniger Mrd. USD Marktkapitalisierung als Bitcoin?',
    customQuestionEn: 'Does gold have more or less billions of USD market cap than Bitcoin?',
  },
  {
    id: 'berlin-vs-muc',
    label: 'Berlin vs München (Einwohner)',
    anchorLabel: 'Berlin', anchorValue: 3700000, subjectLabel: 'München', subjectValue: 1500000,
    unit: 'Einwohner',
    customQuestion: undefined,
    customQuestionEn: undefined,
  },
  {
    id: 'eiffel-vs-empire',
    label: 'Eiffelturm vs Empire State (Höhe)',
    anchorLabel: 'Eiffelturm', anchorValue: 330, subjectLabel: 'Empire State Building', subjectValue: 381,
    unit: 'Meter Höhe',
    customQuestion: undefined,
    customQuestionEn: undefined,
  },
  {
    id: 'titanic-vs-avatar',
    label: 'Titanic vs Avatar (Einspielergebnis)',
    anchorLabel: 'Titanic', anchorValue: 2200, subjectLabel: 'Avatar', subjectValue: 2920,
    unit: 'Mio. USD Einspielergebnis',
    customQuestion: undefined,
    customQuestionEn: undefined,
  },
];

type SimPhase = 'question' | 'reveal-correct' | 'reveal-wrong';

export default function QQHigherLowerTestPage() {
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [teamCount, setTeamCount] = useState<1 | 2 | 3 | 5>(1);
  const [pairIdx, setPairIdx] = useState<number>(0);
  const [simPhase, setSimPhase] = useState<SimPhase>('question');
  /** Wie viele Teams haben schon geantwortet (für answers-Record). */
  const [submittedCount, setSubmittedCount] = useState<number>(0);
  /** Welche Wahl haben die Teams getroffen (single choice for simplicity). */
  const [teamChoice, setTeamChoice] = useState<QQHLChoice>('higher');
  const [panelVisible, setPanelVisible] = useState<boolean>(true);

  // Body-Scroll abstellen
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

  const teams = teamCount === 1 ? TEAMS_1
    : teamCount === 2 ? TEAMS_2
    : teamCount === 3 ? TEAMS_3
    : TEAMS_5;
  const N = teams.length;
  const pair = PAIRS[pairIdx];
  const isReveal = simPhase !== 'question';
  const correctChoice: QQHLChoice = pair.subjectValue > pair.anchorValue ? 'higher' : 'lower';

  // answers + correctThisRound zusammenbauen
  const effectiveSubmitted = Math.min(submittedCount, N);
  const answers: Record<string, QQHLChoice> = {};
  const answeredThisRound: string[] = [];
  for (let i = 0; i < effectiveSubmitted; i++) {
    answers[teams[i].id] = teamChoice;
    answeredThisRound.push(teams[i].id);
  }
  const correctThisRound = isReveal
    ? (simPhase === 'reveal-correct' ? answeredThisRound.slice() : [])
    : [];

  const mockState: QQStateUpdate = {
    roomCode: 'HL-TEST',
    phase: 'COMEBACK' as const,
    teams,
    grid: [],
    gridSize: 5,
    questionIndex: 14,
    gamePhaseIndex: 4,
    totalPhases: 4,
    introStep: 0,
    schedule: [],
    answers: [],
    revealedAnswer: null,
    correctTeamId: null,
    pendingFor: null,
    pendingAction: null,
    comebackTeamId: teams[0].id,
    comebackAction: 'COMEBACK_HL' as any,
    comebackHL: {
      rounds: 3,
      round: 0,
      teamIds: teams.map(t => t.id),
      currentPair: {
        id: pair.id,
        kind: 'anchor',
        category: 'Wirtschaft',
        unit: pair.unit,
        anchorLabel: pair.anchorLabel,
        anchorValue: pair.anchorValue,
        subjectLabel: pair.subjectLabel,
        subjectValue: pair.subjectValue,
        customQuestion: pair.customQuestion,
        customQuestionEn: pair.customQuestionEn,
      },
      answers,
      answeredThisRound,
      correctThisRound,
      winnings: {},
      phase: isReveal ? 'reveal' : 'question',
      timerEndsAt: isReveal ? null : Date.now() + 18000,
      usedPairIds: [],
      stealQueue: [],
      currentStealer: null,
      currentStealerRemaining: 0,
    },
    comebackHLTimerSec: 20,
    teamPhaseStats: {},
    language: lang === 'de' ? 'de' : 'en',
    joinOrder: teams.map(t => t.id),
    allAnswered: false,
    buzzQueue: [],
    top5HitsByTeam: {},
    orderHitsByTeam: {},
    hotPotatoEliminated: [],
    hotPotatoUsedAnswers: [],
    connectionsEnabled: true,
    theme: undefined,
  } as unknown as QQStateUpdate;

  // Falls reveal-wrong: pick die FALSCHE Wahl als correctChoice → answeredThisRound bleibt aber leer correct
  // (gerade kein Effort hier — Switch teamChoice auf die andere Seite reicht zum Testen).
  void correctChoice;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <ComebackView state={mockState} />

      {/* Toggle-Panel */}
      {panelVisible && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
          padding: '12px 18px',
          background: 'rgba(20,16,31,0.92)',
          border: '1px solid rgba(236,72,153,0.4)',
          borderRadius: 16,
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
          zIndex: 1000,
          maxWidth: 'calc(100vw - 32px)',
          color: '#F1F5F9', fontSize: 13, fontWeight: 700,
        }}>
          <span style={{ color: '#94a3b8', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 11 }}>HL-Test</span>

          {/* Team-Count */}
          <div style={{ display: 'flex', gap: 4 }}>
            {([1, 2, 3, 5] as const).map(n => (
              <button key={n} onClick={() => { setTeamCount(n); setSubmittedCount(0); }} style={{
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 800, fontSize: 12, fontFamily: 'inherit',
                background: teamCount === n ? '#EC4899' : 'rgba(255,255,255,0.06)',
                color: teamCount === n ? '#fff' : '#94a3b8',
              }}>{n} Team{n > 1 ? 's' : ''}</button>
            ))}
          </div>

          {/* Phase */}
          <div style={{ display: 'flex', gap: 4 }}>
            {([
              { v: 'question' as const, l: 'Frage' },
              { v: 'reveal-correct' as const, l: 'Reveal ✓' },
              { v: 'reveal-wrong' as const, l: 'Reveal ✕' },
            ]).map(opt => (
              <button key={opt.v} onClick={() => setSimPhase(opt.v)} style={{
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 800, fontSize: 12, fontFamily: 'inherit',
                background: simPhase === opt.v ? '#A855F7' : 'rgba(255,255,255,0.06)',
                color: simPhase === opt.v ? '#fff' : '#94a3b8',
              }}>{opt.l}</button>
            ))}
          </div>

          {/* Choice (Higher / Lower) */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['higher', 'lower'] as const).map(c => (
              <button key={c} onClick={() => setTeamChoice(c)} style={{
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 800, fontSize: 12, fontFamily: 'inherit', textTransform: 'uppercase',
                background: teamChoice === c
                  ? (c === 'higher' ? '#22C55E' : '#EC4899')
                  : 'rgba(255,255,255,0.06)',
                color: teamChoice === c ? '#fff' : '#94a3b8',
              }}>{c === 'higher' ? '↑ Mehr' : '↓ Weniger'}</button>
            ))}
          </div>

          {/* Submitted Counter */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={() => setSubmittedCount(s => Math.max(0, s - 1))} style={{
              padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.06)', color: '#F1F5F9',
            }}>−</button>
            <span style={{ minWidth: 60, textAlign: 'center', fontWeight: 900 }}>
              {effectiveSubmitted}/{N}
            </span>
            <button onClick={() => setSubmittedCount(s => Math.min(N, s + 1))} style={{
              padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.06)', color: '#F1F5F9',
            }}>+</button>
          </div>

          {/* Pair-Selector */}
          <select
            value={pairIdx}
            onChange={e => setPairIdx(Number(e.target.value))}
            style={{
              padding: '6px 10px', borderRadius: 8,
              background: 'rgba(255,255,255,0.06)', color: '#F1F5F9',
              border: '1px solid rgba(236,72,153,0.3)',
              fontWeight: 700, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            {PAIRS.map((p, i) => (
              <option key={p.id} value={i} style={{ background: '#1a1428' }}>{p.label}</option>
            ))}
          </select>

          {/* Lang */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['de', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 800, fontSize: 12, fontFamily: 'inherit', textTransform: 'uppercase',
                background: lang === l ? '#3B82F6' : 'rgba(255,255,255,0.06)',
                color: lang === l ? '#fff' : '#94a3b8',
              }}>{l}</button>
            ))}
          </div>

          {/* Panel-Hide */}
          <button onClick={() => setPanelVisible(false)} title="Panel ausblenden" style={{
            padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: 12, fontFamily: 'inherit',
            background: 'rgba(255,255,255,0.06)', color: '#64748b',
          }}>✕</button>
        </div>
      )}

      {/* Panel-Show */}
      {!panelVisible && (
        <button onClick={() => setPanelVisible(true)} style={{
          position: 'fixed', bottom: 12, right: 12,
          padding: '8px 14px', borderRadius: 999,
          background: 'rgba(20,16,31,0.92)',
          border: '1px solid rgba(236,72,153,0.4)',
          color: '#F472B6', fontWeight: 800, fontSize: 12,
          cursor: 'pointer', fontFamily: 'inherit',
          zIndex: 1000,
        }}>⚡ Toggle-Panel</button>
      )}
    </div>
  );
}
