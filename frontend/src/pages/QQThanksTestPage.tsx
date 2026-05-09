import { useState } from 'react';
import { ThanksView } from './QQBeamerPage';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';

/**
 * QQThanksTestPage — Standalone-Vorschau der Thanks-View ohne komplettes Quiz
 * durchspielen zu müssen. Mock-State mit deterministischen Beispieldaten:
 * 5 Teams, vollgesetztes Grid, endAwards, finalBetResolution, questionHistory.
 *
 * Toggle-Knöpfe oben rechts:
 *   - Sprache DE/EN
 *   - Award-Set (alle / underdog only / keine)
 *   - Team-Count (3 / 5 / 8) für Layout-Tests
 *   - Mit/ohne Frage-History (für Ticker-Test)
 *
 * Erreichbar via /thanks-test (PinGate). Im Menü unter Dev-Tools.
 */

// 5 Teams als Default — verschiedene Farben + Avatare aus dem Standard-Set.
const TEAMS_5 = [
  { id: 't1', name: 'Käpt\'n Kluk',  color: '#22C55E', avatarId: 'koala',  emoji: '🦝', connected: true, totalCells: 9,  largestConnected: 6 },
  { id: 't2', name: 'Wolfsrudel',    color: '#EC4899', avatarId: 'wolf',   emoji: '🐺', connected: true, totalCells: 7,  largestConnected: 5 },
  { id: 't3', name: 'Eulen-Crew',    color: '#A855F7', avatarId: 'owl',    emoji: '🦉', connected: true, totalCells: 5,  largestConnected: 3 },
  { id: 't4', name: 'Polarfuchs',    color: '#06B6D4', avatarId: 'fox',    emoji: '🦊', connected: true, totalCells: 3,  largestConnected: 2 },
  { id: 't5', name: 'Honig-Bären',   color: '#F59E0B', avatarId: 'bear',   emoji: '🐻', connected: true, totalCells: 1,  largestConnected: 1 },
] as QQStateUpdate['teams'];

const TEAMS_3 = TEAMS_5.slice(0, 3);
const TEAMS_8 = [
  ...TEAMS_5,
  { id: 't6', name: 'Tiger-Team',     color: '#EF4444', avatarId: 'tiger',  emoji: '🐯', connected: true, totalCells: 0, largestConnected: 0 },
  { id: 't7', name: 'Pinguine',       color: '#3B82F6', avatarId: 'penguin', emoji: '🐧', connected: true, totalCells: 0, largestConnected: 0 },
  { id: 't8', name: 'Drachen-Brut',   color: '#FB923C', avatarId: 'dragon', emoji: '🐉', connected: true, totalCells: 0, largestConnected: 0 },
] as QQStateUpdate['teams'];

// Grid 5x5 voll besetzt mit Team-Anteilen proportional zu cells.
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

// 12 Beispiel-Fragen für den News-Ticker. Mix aus Categories + Bunte-Tüete-Subs.
const MOCK_HISTORY = [
  { questionText: 'Hauptstadt von Australien?',                  category: 'MUCHO',       correctTeamId: 't1' as string | null },
  { questionText: 'Höchster Berg Europas?',                       category: 'SCHAETZCHEN', correctTeamId: 't2' as string | null },
  { questionText: 'Wer schrieb Faust?',                            category: 'ZEHN_VON_ZEHN', correctTeamId: 't1' as string | null },
  { questionText: 'Was siehst du auf dem Bild?',                   category: 'CHEESE',      correctTeamId: 't3' as string | null },
  { questionText: 'Was verbindet diese 4 Begriffe?',               category: 'BUNTE_TUETE', bunteTueteKind: 'onlyConnect', correctTeamId: 't2' as string | null },
  { questionText: 'Erfindet eine plausible Falsch-Antwort.',       category: 'BUNTE_TUETE', bunteTueteKind: 'bluff',       correctTeamId: 't4' as string | null },
  { questionText: 'Welches ist das schwerste Tier?',               category: 'BUNTE_TUETE', bunteTueteKind: 'top5',        correctTeamId: 't1' as string | null },
  { questionText: 'Heiße Kartoffel: Hauptstädte!',                 category: 'BUNTE_TUETE', bunteTueteKind: 'hotPotato',   correctTeamId: 't2' as string | null },
  { questionText: 'Sortiert die Filme nach Erscheinungsjahr.',     category: 'BUNTE_TUETE', bunteTueteKind: 'order',       correctTeamId: 't1' as string | null },
  { questionText: 'Wo wurde dieses Foto aufgenommen?',             category: 'BUNTE_TUETE', bunteTueteKind: 'map',         correctTeamId: 't3' as string | null },
  { questionText: 'Längster Fluss der Welt?',                     category: 'MUCHO',       correctTeamId: 't1' as string | null },
  { questionText: 'Wieviele Knochen hat ein Mensch?',              category: 'SCHAETZCHEN', correctTeamId: 't5' as string | null },
];

type AwardSet = 'all' | 'underdog-only' | 'none';

export default function QQThanksTestPage() {
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [awardSet, setAwardSet] = useState<AwardSet>('all');
  const [teamCount, setTeamCount] = useState<3 | 5 | 8>(5);
  const [withHistory, setWithHistory] = useState(true);

  const teams = teamCount === 3 ? TEAMS_3 : teamCount === 8 ? TEAMS_8 : TEAMS_5;
  const grid = buildMockGrid(teams);

  // endAwards je nach awardSet
  const endAwards = awardSet === 'none' ? null
    : awardSet === 'underdog-only' ? {
        underdog: teams[teams.length - 1]?.id ?? null,
        meisterklauer: null,
        speedy: null,
      }
    : {
        underdog: teams[teams.length - 1]?.id ?? null,
        meisterklauer: teams[2]?.id ?? null,
        speedy: teams[0]?.id ?? null,
        meisterklauerCount: 4,
        speedyAvgMs: -1200,
      };

  // finalBetResolution — Demo: 1 mutual + 1 zero + Rest mit Bonus
  const finalBetResolution: QQStateUpdate['finalBetResolution'] = teams.length >= 2 ? {
    [teams[0].id]: { targetTeamId: teams[1].id, mutualWith: teams[1].id, totalBonus: 4, baseBonus: 3, sympathyBonus: 1 } as any,
    [teams[1].id]: { targetTeamId: teams[0].id, mutualWith: teams[0].id, totalBonus: 4, baseBonus: 3, sympathyBonus: 1 } as any,
    ...(teams[2] ? { [teams[2].id]: { targetTeamId: teams[3]?.id ?? teams[0].id, mutualWith: null, totalBonus: 2, baseBonus: 2, sympathyBonus: 0 } as any } : {}),
    ...(teams[3] ? { [teams[3].id]: { targetTeamId: teams[0].id, mutualWith: null, totalBonus: 0, baseBonus: 0, sympathyBonus: 0 } as any } : {}),
    ...(teams[4] ? { [teams[4].id]: { targetTeamId: null, mutualWith: null, totalBonus: 0, baseBonus: 0, sympathyBonus: 0 } as any } : {}),
  } : null;

  const mockState = {
    roomCode: 'DEMO',
    phase: 'THANKS',
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
    sfxMuted: false,
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
    finalRevealStep: 0,
    finalRoundWinners: null,
    finalBetResolution,
    endAwards,
    finalWagerEnabled: true,
    teamTotalSteals: {},
    questionHistory: withHistory ? MOCK_HISTORY : [],
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
      }}>
        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          🧪 Thanks-Test
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={lang === 'de' ? btnActive : btnStyle} onClick={() => setLang('de')}>DE</button>
          <button style={lang === 'en' ? btnActive : btnStyle} onClick={() => setLang('en')}>EN</button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={teamCount === 3 ? btnActive : btnStyle} onClick={() => setTeamCount(3)}>3T</button>
          <button style={teamCount === 5 ? btnActive : btnStyle} onClick={() => setTeamCount(5)}>5T</button>
          <button style={teamCount === 8 ? btnActive : btnStyle} onClick={() => setTeamCount(8)}>8T</button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={awardSet === 'all' ? btnActive : btnStyle} onClick={() => setAwardSet('all')}>Awards: alle</button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={awardSet === 'underdog-only' ? btnActive : btnStyle} onClick={() => setAwardSet('underdog-only')}>nur 1</button>
          <button style={awardSet === 'none' ? btnActive : btnStyle} onClick={() => setAwardSet('none')}>keine</button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={withHistory ? btnActive : btnStyle} onClick={() => setWithHistory(!withHistory)}>
            History: {withHistory ? 'an' : 'aus'}
          </button>
        </div>
      </div>

      <ThanksView state={mockState} roomCode="DEMO" />
    </div>
  );
}
