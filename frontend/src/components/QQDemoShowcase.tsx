// QQDemoShowcase — der Landing-Hero: ein 3D-Mockup von Beamer + Handy nebeneinander,
// auf beiden laeuft synchron der Trailer — ABER gerendert mit den ECHTEN App-Views:
//   • Beamer  = echtes <GridDisplay> (das Brett fuellt sich live) + echte Frage-Karte
//   • Handy   = echte Team-<QuestionCard> (Frage + Antwort-Buttons aus der App)
// Beide werden von EINEM gescripteten QQStateUpdate gefuettert, das ueber eine
// Beat-Timeline mutiert. Die echten Komponenten animieren sich dadurch selbst
// (cellInkFill, Steal-Shards, …) — kein Backend, kein Socket.
//
// 3D-Look (2026-Standard): CSS-Perspective + Maus-Parallax-Tilt, realistische
// Geraete-Rahmen, Brand-Glow. Keine WebGL-Libs.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { QQStateUpdate, QQTeam, QQCell, QQQuestion } from '../../../shared/quarterQuizTypes';
import { AvatarSetProvider } from '../avatarSetContext';
import { GridDisplay } from './CozyQuizGridDisplay';
import { QuestionCard } from './CozyQuizTeamQuestionCard';
import { QQTeamAvatar } from './QQTeamAvatar';
import { CozyCard } from './CozyQuizTeamPrimitives';
import { wakeAllAvatars, wakeTeamAvatar } from '../avatarAwake';
import { QQ_BEAMER_CSS } from '../qqShared';
import { TEAM_CSS } from './qqTeamStyles';

const COZY_BG = 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 60%, #0A0E22 100%)';
const MUCHO_ACCENT = '#60A5FA';

// ── Teams (echte Avatar-Slots: avatarId = Farb-Slot, emoji = cozy3d-Slug) ────
type DemoTeam = { id: string; name: string; avatarId: string; emoji: string; color: string };
const TEAMS: DemoTeam[] = [
  { id: 't0', name: 'Füchse', avatarId: 'fox',     emoji: 'fuchs', color: '#F97316' },
  { id: 't1', name: 'Eulen',  avatarId: 'panda',   emoji: 'eule',  color: '#14B8A6' },
  { id: 't2', name: 'Katzen', avatarId: 'rabbit',  emoji: 'katze', color: '#A855F7' },
  { id: 't3', name: 'Bären',  avatarId: 'cow',     emoji: 'baer',  color: '#EC4899' },
];
const ME = TEAMS[0];

const GRID = 5;
const QUESTION_TEXT = 'Welche Stadt hat die meisten Brücken?';
const OPTIONS = ['Hamburg', 'Venedig', 'Amsterdam', 'Berlin'];

const QUESTION: QQQuestion = {
  id: 'demo-q',
  category: 'MUCHO',
  phaseIndex: 1,
  questionIndexInPhase: 0,
  text: QUESTION_TEXT,
  answer: '0',
  options: OPTIONS,
  correctOptionIndex: 0,
};

// ── Brett-Progression je Beat (Owner-Index pro Zelle, -1 = leer) ─────────────
// 5×5. Cluster pro Team, fuellt sich, dann ein Klau (Beat „Taktik").
type Board = number[][];
const B_EMPTY: Board = Array.from({ length: GRID }, () => Array(GRID).fill(-1));
const B_FIRST: Board = [
  [0, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1],
];
const B_FILL: Board = [
  [0, 0, -1, 1, 1],
  [0, -1, -1, 1, -1],
  [-1, -1, 2, -1, 3],
  [2, 2, -1, 3, 3],
  [-1, 2, -1, -1, 3],
];
// Taktik-Beat: Eulen (1) klauen die obere Füchse-Zelle (0,1) → Owner 1;
// Bären (3) stapeln ein Feld (stuck).
const B_STEAL: Board = [
  [0, 1, -1, 1, 1],
  [0, -1, -1, 1, -1],
  [-1, -1, 2, -1, 3],
  [2, 2, -1, 3, 3],
  [-1, 2, -1, -1, 3],
];
const STUCK_CELL = { r: 4, c: 4 }; // Bären-Stapel im Taktik-Beat

function makeGrid(board: Board, opts?: { stuck?: { r: number; c: number } }): QQCell[][] {
  return board.map((row, r) =>
    row.map((owner, c): QQCell => ({
      row: r,
      col: c,
      ownerId: owner >= 0 ? TEAMS[owner].id : null,
      jokerFormed: false,
      stuck: opts?.stuck && opts.stuck.r === r && opts.stuck.c === c ? true : undefined,
    })),
  );
}

function teamsForBoard(board: Board): QQTeam[] {
  return TEAMS.map((t, idx): QQTeam => {
    const cells = board.flat().filter((o) => o === idx).length;
    return {
      id: t.id,
      name: t.name,
      color: t.color,
      avatarId: t.avatarId,
      emoji: t.emoji,
      connected: true,
      totalCells: cells,
      largestConnected: cells,
    };
  });
}

// Vollstaendiges (gecastetes) QQStateUpdate — nur die Felder, die GridDisplay +
// QuestionCard tatsaechlich lesen, sind echt belegt; Rest via Cast aufgefuellt.
function buildState(args: {
  board: Board;
  phase: QQStateUpdate['phase'];
  question: QQQuestion | null;
  answers: { teamId: string; text: string }[];
  correctTeamId: string | null;
  stuck?: { r: number; c: number };
  muchoRevealStep?: number;
}): QQStateUpdate {
  const now = Date.now();
  const grid = makeGrid(args.board, { stuck: args.stuck });
  const base: Partial<QQStateUpdate> = {
    serverTime: now,
    roomCode: 'COZY',
    phase: args.phase,
    gamePhaseIndex: 2,
    questionIndex: 0,
    gridSize: GRID,
    grid,
    teams: teamsForBoard(args.board),
    teamPhaseStats: {},
    currentQuestion: args.question,
    revealedAnswer: args.correctTeamId ? OPTIONS[0] : null,
    correctTeamId: args.correctTeamId,
    pendingFor: null,
    pendingAction: null,
    comebackTeamId: null,
    comebackAction: null,
    comebackStealTargets: [],
    comebackStealsDone: [],
    comebackHL: null,
    comebackHLTimerSec: 20,
    connections: null,
    connectionsTimerSec: 180,
    connectionsMaxFails: 2,
    connectionsEnabled: false,
    shuffleQuestionsInRound: false,
    swapFirstCell: null,
    language: 'de',
    timerDurationSec: 20,
    timerEndsAt: args.phase === 'QUESTION_ACTIVE' ? now + 18000 : null,
    answers: args.answers.map((a) => ({ teamId: a.teamId, text: a.text, submittedAt: now })),
    buzzQueue: [],
    hotPotatoActiveTeamId: null,
    hotPotatoEliminated: [],
    hotPotatoLastAnswer: null,
    hotPotatoTurnEndsAt: null,
    hotPotatoUsedAnswers: [],
    muchoRevealStep: args.muchoRevealStep ?? 0,
  };
  return base as unknown as QQStateUpdate;
}

// ── Beat-Timeline (Trailer-Story, gerendert in echten Views) ─────────────────
type Beat = {
  ms: number;
  caption: string;
  beamer: 'lobby' | 'question' | 'board' | 'winner';
  state: QQStateUpdate;
  highlightTeam?: string | null;
  /** Handy: echte QuestionCard, sonst Light-Card-Key. */
  phone: 'question' | 'lobby' | 'standings' | 'winner';
};

const ALL_ANSWERS = [
  { teamId: 't0', text: '0' },
  { teamId: 't1', text: '1' },
  { teamId: 't2', text: '0' },
  { teamId: 't3', text: '2' },
];

function buildBeats(): Beat[] {
  return [
    {
      ms: 4200,
      caption: 'Teams joinen per QR-Code — gespielt wird mit dem eigenen Handy.',
      beamer: 'lobby',
      phone: 'lobby',
      state: buildState({ board: B_EMPTY, phase: 'LOBBY', question: null, answers: [], correctTeamId: null }),
    },
    {
      ms: 5200,
      caption: 'Fragen aus 5 Kategorien — jedes Team tippt am Handy mit.',
      beamer: 'question',
      phone: 'question',
      state: buildState({ board: B_EMPTY, phase: 'QUESTION_ACTIVE', question: QUESTION, answers: [{ teamId: 't0', text: '0' }], correctTeamId: null }),
    },
    {
      ms: 5600,
      caption: 'Richtig geantwortet? Dann erobert ihr ein Feld auf dem Brett.',
      beamer: 'board',
      phone: 'question',
      highlightTeam: 't0',
      state: buildState({ board: B_FIRST, phase: 'QUESTION_REVEAL', question: QUESTION, answers: ALL_ANSWERS, correctTeamId: 't0', muchoRevealStep: 9 }),
    },
    {
      ms: 5200,
      caption: 'Runde um Runde füllt sich das Brett mit euren Farben.',
      beamer: 'board',
      phone: 'standings',
      state: buildState({ board: B_FILL, phase: 'PLACEMENT', question: null, answers: [], correctTeamId: null }),
    },
    {
      ms: 5400,
      caption: 'Klauen, Stapeln, Joker — bringt Taktik ins Spiel.',
      beamer: 'board',
      phone: 'standings',
      highlightTeam: 't1',
      state: buildState({ board: B_STEAL, phase: 'PLACEMENT', question: null, answers: [], correctTeamId: null, stuck: STUCK_CELL }),
    },
    {
      ms: 4800,
      caption: 'Das größte zusammenhängende Gebiet gewinnt. Buch dein CozyQuiz!',
      beamer: 'winner',
      phone: 'winner',
      state: buildState({ board: B_STEAL, phase: 'GAME_OVER', question: null, answers: [], correctTeamId: null, stuck: STUCK_CELL }),
    },
  ];
}

// ── kleine Helfer ────────────────────────────────────────────────────────────
function DemoAvatar({ team, size }: { team: DemoTeam; size: number | string }) {
  return (
    <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={size} teamId={team.id} eyes="open" />
  );
}

// Frage-Banner fuer den Beamer (leichtgewichtig, im echten Look — die volle
// Beamer-Frage-View zieht Leaflet/Sounds, daher hier ein schlanker Nachbau).
function BeamerQuestionBanner() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '6% 7%', gap: '4%', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ padding: '4px 14px', borderRadius: 999, fontWeight: 900, fontSize: 'clamp(9px,1.9cqw,15px)', background: 'linear-gradient(135deg,#1E3A8A,#2563EB)', boxShadow: `0 0 18px ${MUCHO_ACCENT}66` }}>Mu-Cho</span>
        <span style={{ marginLeft: 'auto', fontSize: 'clamp(13px,2.7cqw,24px)', fontWeight: 900, color: MUCHO_ACCENT, fontVariantNumeric: 'tabular-nums' }}>0:12</span>
      </div>
      <div style={{ fontSize: 'clamp(14px,3cqw,28px)', fontWeight: 800, lineHeight: 1.12 }}>{QUESTION_TEXT}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3%', marginTop: 'auto' }}>
        {OPTIONS.map((o, i) => (
          <div key={o} style={{ padding: '5% 4%', borderRadius: 14, fontWeight: 800, fontSize: 'clamp(10px,2cqw,17px)', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.14)', animation: `demoPop 0.4s ease ${0.08 * i}s both` }}>
            <span style={{ color: MUCHO_ACCENT, fontWeight: 900, marginRight: 6 }}>{String.fromCharCode(65 + i)}</span>{o}
          </div>
        ))}
      </div>
    </div>
  );
}

function BeamerLobby() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4%', color: '#fff', padding: '5%' }}>
      <div style={{ fontSize: 'clamp(16px,3.6cqw,32px)', fontWeight: 900, textAlign: 'center' }}>
        Willkommen bei <span style={{ background: 'linear-gradient(135deg,#EC4899,#A21247)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CozyQuiz</span>
      </div>
      <div style={{ fontSize: 'clamp(9px,1.9cqw,15px)', color: '#cbd5e1', fontWeight: 600 }}>Scannt den QR-Code mit dem Handy</div>
      <div style={{ display: 'flex', gap: '4%', marginTop: '2%' }}>
        {TEAMS.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, animation: `demoPop 0.45s var(--qq-ease-bounce, cubic-bezier(0.2,1.2,0.3,1)) ${0.1 + i * 0.12}s both` }}>
            <DemoAvatar team={t} size="clamp(36px,7.5cqw,64px)" />
            <span style={{ fontSize: 'clamp(8px,1.6cqw,13px)', fontWeight: 800 }}>{t.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BeamerWinner() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3%', color: '#fff', background: 'radial-gradient(circle at 50% 35%, rgba(236,72,153,0.18), transparent 60%)' }}>
      <div style={{ fontSize: 'clamp(22px,5cqw,46px)' }}>🏆</div>
      <div style={{ position: 'relative' }}>
        <span aria-hidden style={{ position: 'absolute', top: '-44%', left: '50%', transform: 'translateX(-50%)', fontSize: 'clamp(16px,3.4cqw,30px)' }}>👑</span>
        <DemoAvatar team={ME} size="clamp(46px,9.5cqw,82px)" />
      </div>
      <div style={{ fontSize: 'clamp(13px,2.7cqw,24px)', fontWeight: 900 }}>Sieger: {ME.name}</div>
    </div>
  );
}

// Handy Light-Cards (Lobby / Standings / Winner) — echte CozyCard-Primitive.
function PhoneLobby() {
  return (
    <CozyCard borderColor={ME.color}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '6px 0' }}>
        <DemoAvatar team={ME} size={84} />
        <div style={{ fontSize: 19, fontWeight: 900, color: '#fff' }}>Du bist dabei!</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1' }}>Team {ME.name}</div>
      </div>
    </CozyCard>
  );
}

function PhoneStandings({ board }: { board: Board }) {
  const teams = teamsForBoard(board)
    .map((t, i) => ({ ...t, demo: TEAMS[i] }))
    .sort((a, b) => b.totalCells - a.totalCells);
  return (
    <CozyCard borderColor={ME.color}>
      <div style={{ fontSize: 13, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Zwischenstand</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {teams.map((t, rank) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ width: 18, fontSize: 14, fontWeight: 900, color: rank === 0 ? '#FBBF24' : '#64748b' }}>{rank + 1}</span>
            <DemoAvatar team={t.demo} size={34} />
            <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', flex: 1 }}>{t.name}</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: t.color }}>{t.totalCells}</span>
          </div>
        ))}
      </div>
    </CozyCard>
  );
}

function PhoneWinner() {
  return (
    <CozyCard borderColor={ME.color}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '8px 0' }}>
        <div style={{ fontSize: 46 }}>🏆</div>
        <div style={{ fontSize: 19, fontWeight: 900, color: '#fff' }}>Stark gespielt!</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: ME.color }}>Platz 1 · {ME.name}</div>
      </div>
    </CozyCard>
  );
}

// ── Haupt-Komponente ─────────────────────────────────────────────────────────
export function QQDemoShowcase() {
  const beats = useMemo(buildBeats, []);
  const [beat, setBeat] = useState(0);
  const [paused, setPaused] = useState(false);

  // Beat-Timer: pro Beat eigene Dauer (manche Story-Momente brauchen laenger).
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setBeat((b) => (b + 1) % beats.length), beats[beat].ms);
    return () => clearTimeout(t);
  }, [beat, paused, beats]);

  // Augen-Reaktion: beim Lobby-Beat alle wecken, beim „dran"-Beat das Team.
  const cur = beats[beat];
  useEffect(() => {
    if (cur.beamer === 'lobby') wakeAllAvatars(2600);
    if (cur.highlightTeam) wakeTeamAvatar(cur.highlightTeam, 2600);
  }, [beat, cur]);

  // Maus-Parallax-Tilt (premium 3D-Gefuehl).
  const stageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e: React.MouseEvent) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 6, y: px * 8 });
  };
  const onLeave = () => { setTilt({ x: 0, y: 0 }); setPaused(false); };

  // Beamer-Board-Groesse (px) aus dem 16:9-Frame heraus geschaetzt.
  const beamerW = 'min(92vw, 560px)';

  return (
    <AvatarSetProvider value="cozy3d">
      {/* echte Keyframes (Beamer-Grid + Team-Card) global verfuegbar machen */}
      <style>{QQ_BEAMER_CSS}</style>
      <style>{TEAM_CSS}</style>
      <style>{`
        @keyframes demoIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes demoPop { 0%{opacity:0;transform:scale(0.7)} 60%{transform:scale(1.06)} 100%{opacity:1;transform:scale(1)} }
        @keyframes demoGlow { 0%,100%{opacity:0.5} 50%{opacity:0.85} }
      `}</style>

      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
        {/* Caption */}
        <div key={`cap-${beat}`} style={{
          fontSize: 'clamp(15px, 2vw, 20px)', color: '#e2e8f0', fontWeight: 700,
          textAlign: 'center', maxWidth: 640, minHeight: 52, lineHeight: 1.35,
          animation: 'demoIn 0.5s ease both',
        }}>
          {cur.caption}
        </div>

        {/* 3D-Buehne */}
        <div
          ref={stageRef}
          onMouseEnter={() => setPaused(true)}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          style={{
            position: 'relative', width: '100%',
            display: 'flex', flexWrap: 'wrap', gap: 'clamp(20px, 4vw, 56px)',
            justifyContent: 'center', alignItems: 'center',
            perspective: 1600, perspectiveOrigin: '50% 40%',
            padding: '12px 0 8px',
          }}
        >
          {/* Brand-Glow hinter den Geraeten */}
          <div aria-hidden style={{
            position: 'absolute', inset: '-6% 4% 8%', pointerEvents: 'none', zIndex: 0,
            background: 'radial-gradient(ellipse 60% 70% at 38% 50%, rgba(236,72,153,0.20), transparent 65%), radial-gradient(ellipse 50% 60% at 78% 55%, rgba(99,102,241,0.16), transparent 65%)',
            filter: 'blur(12px)', animation: 'demoGlow 6s ease-in-out infinite',
          }} />

          {/* ── Beamer / TV (16:9) ── */}
          <figure style={{
            margin: 0, position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y - 4}deg)`,
            transformStyle: 'preserve-3d', transition: 'transform 0.25s ease-out',
          }}>
            <div style={{
              width: beamerW, aspectRatio: '16 / 9', borderRadius: 18, overflow: 'hidden',
              background: COZY_BG, position: 'relative', containerType: 'size',
              border: '2px solid rgba(255,255,255,0.10)',
              boxShadow: '0 40px 90px -20px rgba(0,0,0,0.7), 0 0 0 7px #0c1020, 0 0 0 8px rgba(255,255,255,0.06)',
            }}>
              <BeamerScene beat={cur} />
            </div>
            {/* Monitor-Fuss */}
            <div style={{ width: '20%', height: 10, borderRadius: '0 0 8px 8px', background: 'linear-gradient(180deg,#1a2036,#0c1020)', transform: 'translateY(-2px)' }} />
            <div style={{ width: '34%', height: 5, borderRadius: 99, background: '#0c1020', transform: 'translateY(-4px)' }} />
            <figcaption style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, marginTop: -2 }}>📺 Beamer / TV</figcaption>
          </figure>

          {/* ── Handy (9:16) ── */}
          <figure style={{
            margin: 0, position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y + 6}deg)`,
            transformStyle: 'preserve-3d', transition: 'transform 0.25s ease-out',
          }}>
            <div style={{
              height: 'min(62vh, 380px)', aspectRatio: '9 / 19.5', borderRadius: 38, padding: 9,
              background: 'linear-gradient(160deg,#23283a,#0b0e18)', position: 'relative',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 40px 90px -20px rgba(0,0,0,0.75), inset 0 0 0 2px rgba(0,0,0,0.6)',
            }}>
              {/* Dynamic-Island-Notch */}
              <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', width: 74, height: 20, borderRadius: 99, background: '#05070d', zIndex: 5 }} />
              <div style={{ width: '100%', height: '100%', borderRadius: 30, overflow: 'hidden', background: COZY_BG, position: 'relative', containerType: 'size' }}>
                <PhoneScene beat={cur} />
              </div>
            </div>
            <figcaption style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>📱 Dein Handy</figcaption>
          </figure>
        </div>

        {/* Beat-Punkte */}
        <div style={{ display: 'flex', gap: 8 }}>
          {beats.map((_, i) => (
            <button key={i} aria-label={`Szene ${i + 1}`} onClick={() => setBeat(i)} style={{
              width: i === beat ? 24 : 8, height: 8, borderRadius: 99, border: 0, cursor: 'pointer', padding: 0,
              background: i === beat ? '#EC4899' : 'rgba(148,163,184,0.4)', transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
      </section>
    </AvatarSetProvider>
  );
}

// ── Beamer-Render (echte GridDisplay + Banner-Overlays) ──────────────────────
function BeamerScene({ beat }: { beat: Beat }) {
  if (beat.beamer === 'lobby') return <BeamerLobby />;
  if (beat.beamer === 'question') return <BeamerQuestionBanner />;
  if (beat.beamer === 'winner') {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.25 }}>
          <DemoBoard beat={beat} />
        </div>
        <BeamerWinner />
      </div>
    );
  }
  // board
  return (
    <div key={`b-${beat.caption}`} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'demoIn 0.5s ease both' }}>
      <DemoBoard beat={beat} />
    </div>
  );
}

function DemoBoard({ beat }: { beat: Beat }) {
  // Board-Pixelgroesse aus Container-Query-Hoehe (cqh): ~78% der Frame-Hoehe.
  return (
    <div style={{ width: '78cqh', height: '78cqh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ transform: 'scale(1)', transformOrigin: 'center' }}>
        <GridDisplay state={beat.state} maxSize={280} highlightTeam={beat.highlightTeam ?? null} />
      </div>
    </div>
  );
}

// ── Handy-Render (echte QuestionCard oder Light-Card) ────────────────────────
function PhoneScene({ beat }: { beat: Beat }) {
  const wrap: CSSProperties = { position: 'absolute', inset: 0, padding: '54px 14px 18px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: "'Nunito','Inter',sans-serif" };
  if (beat.phone === 'question') {
    return (
      <div key={`pq-${beat.caption}`} style={{ ...wrap, justifyContent: 'flex-start', animation: 'demoIn 0.5s ease both' }}>
        <QuestionCard state={beat.state} myTeamId={ME.id} emit={() => {}} roomCode="COZY" lang="de" />
      </div>
    );
  }
  return (
    <div key={`p-${beat.phone}-${beat.caption}`} style={{ ...wrap, animation: 'demoIn 0.5s ease both' }}>
      {beat.phone === 'lobby' && <PhoneLobby />}
      {beat.phone === 'standings' && <PhoneStandings board={beat.state.grid.map((row) => row.map((c) => (c.ownerId ? TEAMS.findIndex((t) => t.id === c.ownerId) : -1)))} />}
      {beat.phone === 'winner' && <PhoneWinner />}
    </div>
  );
}
