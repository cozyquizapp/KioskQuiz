import { useState } from 'react';
import QQSummaryPage from './QQSummaryPage';

/**
 * QQSummaryTestPage — Standalone-Vorschau der Summary-Page ohne ein echtes
 * Spiel durchspielen + scannen zu müssen. Übergibt der QQSummaryPage einen
 * gemockten Summary-Datensatz via mockSummary-Prop, der den REST-Fetch
 * komplett überspringt.
 *
 * Toggle-Knöpfe oben rechts:
 *   - Team-Count (3 / 5 / 8)
 *   - Award-Set (alle / nur Underdog / keine)
 *   - Eurovision-Mode (an/aus) — testet ESC-Hot-Pink vs. Standard-Brand-Pink
 *
 * Erreichbar via /summary-test (PinGate).
 */

const TEAMS_5 = [
  { id: 't1', name: "Käpt'n Kluk",  color: '#22C55E', avatarId: 'koala', emoji: '🦝',
    score: 13, totalCells: 9, largestConnected: 9, correct: 18, answered: 24,
    jokersEarned: 2, stealsUsed: 1 },
  { id: 't2', name: 'Wolfsrudel',    color: '#EC4899', avatarId: 'wolf',  emoji: '🐺',
    score: 11, totalCells: 7, largestConnected: 7, correct: 16, answered: 24,
    jokersEarned: 1, stealsUsed: 4 },
  { id: 't3', name: 'Eulen-Crew',    color: '#A855F7', avatarId: 'owl',   emoji: '🦉',
    score:  8, totalCells: 5, largestConnected: 5, correct: 12, answered: 24,
    jokersEarned: 0, stealsUsed: 2 },
  { id: 't4', name: 'Polarfuchs',    color: '#06B6D4', avatarId: 'fox',   emoji: '🦊',
    score:  5, totalCells: 3, largestConnected: 3, correct:  8, answered: 24,
    jokersEarned: 0, stealsUsed: 0 },
  { id: 't5', name: 'Honig-Bären',   color: '#F59E0B', avatarId: 'bear',  emoji: '🐻',
    score:  3, totalCells: 1, largestConnected: 1, correct:  5, answered: 24,
    jokersEarned: 0, stealsUsed: 0 },
];

const TEAMS_3 = TEAMS_5.slice(0, 3);
const TEAMS_8 = [
  ...TEAMS_5,
  { id: 't6', name: 'Tiger-Team',   color: '#EF4444', avatarId: 'tiger',   emoji: '🐯',
    score: 1, totalCells: 0, largestConnected: 0, correct: 4, answered: 24,
    jokersEarned: 0, stealsUsed: 0 },
  { id: 't7', name: 'Pinguine',     color: '#3B82F6', avatarId: 'penguin', emoji: '🐧',
    score: 1, totalCells: 0, largestConnected: 0, correct: 3, answered: 24,
    jokersEarned: 0, stealsUsed: 0 },
  { id: 't8', name: 'Drachen-Brut', color: '#FB923C', avatarId: 'dragon',  emoji: '🐉',
    score: 0, totalCells: 0, largestConnected: 0, correct: 2, answered: 24,
    jokersEarned: 0, stealsUsed: 0 },
];

function buildMockGrid(teams: typeof TEAMS_5): Array<Array<string | null>> {
  const totalCells = teams.reduce((sum, t) => sum + t.totalCells, 0) || 25;
  const ids: (string | null)[] = [];
  for (const t of teams) {
    const n = Math.round((t.totalCells / totalCells) * 25);
    for (let i = 0; i < n; i++) ids.push(t.id);
  }
  while (ids.length < 25) ids.push(null);
  ids.length = 25;
  return Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => ids[r * 5 + c] ?? null)
  );
}

type AwardSet = 'all' | 'underdog-only' | 'none';

export default function QQSummaryTestPage() {
  const [teamCount, setTeamCount] = useState<3 | 5 | 8>(5);
  const [awardSet, setAwardSet] = useState<AwardSet>('all');
  const [eurovisionMode, setEurovisionMode] = useState(false);

  const teams = teamCount === 3 ? TEAMS_3 : teamCount === 8 ? TEAMS_8 : TEAMS_5;
  const grid = buildMockGrid(teams);

  const endAwards = awardSet === 'none' ? null
    : awardSet === 'underdog-only' ? {
        underdog: teams[teams.length - 1].id,
        meisterklauer: null,
        speedy: null,
      }
    : {
        underdog: teams[teams.length - 1].id,
        meisterklauer: teams[1].id,
        meisterklauerCount: 4,
        speedy: teams[0].id,
        speedyAvgMs: 4200,
      };

  const mockSummary = {
    id: 'qqr-test-DEMO',
    roomCode: 'DEMO',
    playedAt: Date.now() - 3600 * 1000,
    draftTitle: eurovisionMode ? 'Eurovision Test-Quiz' : 'Test-Quiz Demo',
    winner: teams[0].name,
    phases: 4,
    avatarSetId: 'all',
    avatarSetEmojis: null,
    teams,
    funnyAnswers: [
      { teamId: 't2', teamName: 'Wolfsrudel', text: 'Antarktis (mit Pinguinen)',
        questionText: 'Welcher Kontinent hat keinen offiziellen Sitz der UN?' },
    ],
    gridSize: 5,
    cellOwners: grid,
    endAwards,
    eurovisionMode,
  };

  return (
    <>
      {/* Test-Toolbar oben rechts (sticky) */}
      <div style={{
        position: 'fixed', top: 12, right: 12, zIndex: 9999,
        background: 'rgba(15,8,23,0.92)',
        border: '1px solid rgba(236,72,153,0.4)',
        borderRadius: 14,
        padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 12,
        maxWidth: 220,
      }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: '#EC4899', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          🧪 SUMMARY-TEST
        </div>

        <Group label="Teams">
          {([3, 5, 8] as const).map(n => (
            <Btn key={n} active={teamCount === n} onClick={() => setTeamCount(n)}>{n}T</Btn>
          ))}
        </Group>

        <Group label="Awards">
          <Btn active={awardSet === 'all'} onClick={() => setAwardSet('all')}>Alle</Btn>
          <Btn active={awardSet === 'underdog-only'} onClick={() => setAwardSet('underdog-only')}>Nur 1</Btn>
          <Btn active={awardSet === 'none'} onClick={() => setAwardSet('none')}>Keine</Btn>
        </Group>

        <Group label="Mode">
          <Btn active={!eurovisionMode} onClick={() => setEurovisionMode(false)}>Standard</Btn>
          <Btn active={eurovisionMode} onClick={() => setEurovisionMode(true)}>Eurovision</Btn>
        </Group>
      </div>

      <QQSummaryPage mockSummary={mockSummary} />
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

function Btn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px', borderRadius: 999,
        background: active ? '#EC4899' : 'rgba(255,255,255,0.06)',
        color: active ? '#0A0814' : '#CBD5E1',
        border: `1px solid ${active ? '#EC4899' : 'rgba(255,255,255,0.12)'}`,
        fontWeight: 800, fontSize: 11,
        fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >{children}</button>
  );
}
