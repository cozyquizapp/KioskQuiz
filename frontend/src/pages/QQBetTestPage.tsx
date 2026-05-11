import { useState, useEffect } from 'react';
import { FinalBettingView } from './QQBeamerPage';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';

/**
 * QQBetTestPage — Standalone-Vorschau der Final-Wager-Beamer-View.
 * 2026-05-11 (Wolf-Wunsch): testbar ohne ganzes Quiz durchzuziehen.
 * Toggles: Team-Count (3/5/8), Anzahl abgegebener Tipps, Sprache.
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
  { id: 't6', name: 'Tiger-Team',   color: '#EF4444', avatarId: 'tiger',   emoji: '🐯', connected: true, totalCells: 0, largestConnected: 0 },
  { id: 't7', name: 'Pinguine',     color: '#3B82F6', avatarId: 'penguin', emoji: '🐧', connected: true, totalCells: 0, largestConnected: 0 },
  { id: 't8', name: 'Drachen-Brut', color: '#FB923C', avatarId: 'dragon',  emoji: '🐉', connected: true, totalCells: 0, largestConnected: 0 },
] as QQStateUpdate['teams'];

export default function QQBetTestPage() {
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [teamCount, setTeamCount] = useState<3 | 5 | 8>(5);
  const [submittedCount, setSubmittedCount] = useState<number>(0);
  const [panelVisible, setPanelVisible] = useState<boolean>(true);

  // Body-Scroll abstellen während TestPage gemountet ist
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

  // Cap submittedCount auf N
  const effectiveSubmitted = Math.min(submittedCount, N);

  // finalBettingSubmitted-Record bauen: erste `effectiveSubmitted` Teams gelten als abgegeben
  const finalBettingSubmitted: Record<string, boolean> = {};
  for (let i = 0; i < effectiveSubmitted; i++) {
    finalBettingSubmitted[teams[i].id] = true;
  }

  const mockState: QQStateUpdate = {
    roomCode: 'BET-TEST',
    phase: 'FINAL_BETTING' as const,
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
    finalBettingSubmitted,
    finalBets: {},
    finalBetResolution: null,
    finalRevealStep: 0,
    finalPhaseWins: {},
    finalRecapJustWon: [],
    finalWagerEnabled: true,
    teamPhaseStats: {},
    seenCategories: [],
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

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <FinalBettingView state={mockState} />

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
          <span style={{ color: '#94a3b8', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 11 }}>Bet-Test</span>

          {/* Team-Count */}
          <div style={{ display: 'flex', gap: 4 }}>
            {([3, 5, 8] as const).map(n => (
              <button key={n} onClick={() => { setTeamCount(n); setSubmittedCount(0); }} style={{
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 800, fontSize: 12, fontFamily: 'inherit',
                background: teamCount === n ? '#EC4899' : 'rgba(255,255,255,0.06)',
                color: teamCount === n ? '#fff' : '#94a3b8',
              }}>{n} Teams</button>
            ))}
          </div>

          {/* Submitted Counter */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={() => setSubmittedCount(s => Math.max(0, s - 1))} style={{
              padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.06)', color: '#F1F5F9',
            }}>−</button>
            <span style={{ minWidth: 56, textAlign: 'center', fontWeight: 900 }}>
              {effectiveSubmitted}/{N} tips
            </span>
            <button onClick={() => setSubmittedCount(s => Math.min(N, s + 1))} style={{
              padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.06)', color: '#F1F5F9',
            }}>+</button>
            <button onClick={() => setSubmittedCount(N)} style={{
              padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: 12, fontFamily: 'inherit',
              background: 'rgba(34,197,94,0.18)', color: '#22C55E',
            }}>all</button>
            <button onClick={() => setSubmittedCount(0)} style={{
              padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: 12, fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
            }}>reset</button>
          </div>

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

          {/* Panel toggle */}
          <button onClick={() => setPanelVisible(false)} title="Panel ausblenden (Klick auf Bildschirm-Rand zum Wiedereinblenden)" style={{
            padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: 12, fontFamily: 'inherit',
            background: 'rgba(255,255,255,0.06)', color: '#64748b',
          }}>✕</button>
        </div>
      )}

      {/* Wiederherstellungs-Button wenn Panel versteckt */}
      {!panelVisible && (
        <button onClick={() => setPanelVisible(true)} style={{
          position: 'fixed', bottom: 12, right: 12,
          padding: '8px 14px', borderRadius: 999,
          background: 'rgba(20,16,31,0.92)',
          border: '1px solid rgba(236,72,153,0.4)',
          color: '#F472B6', fontWeight: 800, fontSize: 12,
          cursor: 'pointer', fontFamily: 'inherit',
          zIndex: 1000,
        }}>🎰 Toggle-Panel</button>
      )}
    </div>
  );
}
