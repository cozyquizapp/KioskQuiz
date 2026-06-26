// QQDemoShowcase — der Landing-Hero: ein grosser, automatisch + langsam laufender,
// SYNCHRONER Beamer+Handy-Durchlauf, der den echten Quiz-Ablauf zeigt (nicht nur
// das Brett): Lobby → Kategorie-Splash → Frage (Beamer & Handy zeigen DENSELBEN
// Moment) → Auflösung → Feld erobert → 2. Kategorie (Abwechslung) → Brett waechst
// → Taktik → Sieger. Gerendert mit den ECHTEN App-Views (GridDisplay + Team-
// QuestionCard) via gescriptetem QQStateUpdate. Kein Backend, keine Sounds.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { QQStateUpdate, QQTeam, QQCell, QQQuestion, QQCategory } from '../../../shared/quarterQuizTypes';
import { QQ_CATEGORY_COLORS, QQ_CATEGORY_LABELS } from '../../../shared/quarterQuizTypes';
import { AvatarSetProvider } from '../avatarSetContext';
import { GridDisplay } from './CozyQuizGridDisplay';
import { QuestionCard } from './CozyQuizTeamQuestionCard';
import { QQTeamAvatar } from './QQTeamAvatar';
import { CozyCard } from './CozyQuizTeamPrimitives';
import { wakeAllAvatars, wakeTeamAvatar } from '../avatarAwake';
import { QQ_BEAMER_CSS } from '../qqShared';
import { TEAM_CSS } from './qqTeamStyles';

const COZY_BG = 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 60%, #0A0E22 100%)';

// Logische Geraete-Aufloesungen (px), in denen die echten Views rendern.
export const BEAMER = { w: 1024, h: 576 };
export const PHONE = { w: 360, h: 780 };

export function DemoKeyframes() {
  return (
    <>
      <style>{QQ_BEAMER_CSS}</style>
      <style>{TEAM_CSS}</style>
      <style>{`
        @keyframes demoIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes demoPop { 0%{opacity:0;transform:scale(0.7)} 60%{transform:scale(1.06)} 100%{opacity:1;transform:scale(1)} }
        @keyframes demoGlow { 0%,100%{opacity:0.5} 50%{opacity:0.85} }
        @keyframes demoSplash { 0%{opacity:0;transform:scale(0.85)} 100%{opacity:1;transform:scale(1)} }
      `}</style>
    </>
  );
}

// ── Teams (echte Avatar-Slots: avatarId = Farb-Slot, emoji = cozy3d-Slug) ────
type DemoTeam = { id: string; name: string; avatarId: string; emoji: string; color: string };
export const TEAMS: DemoTeam[] = [
  { id: 't0', name: 'Füchse', avatarId: 'fox',     emoji: 'fuchs', color: '#F97316' },
  { id: 't1', name: 'Eulen',  avatarId: 'panda',   emoji: 'eule',  color: '#14B8A6' },
  { id: 't2', name: 'Katzen', avatarId: 'rabbit',  emoji: 'katze', color: '#A855F7' },
  { id: 't3', name: 'Bären',  avatarId: 'cow',     emoji: 'baer',  color: '#EC4899' },
];
export const ME = TEAMS[0];

export const GRID = 5;

export const QUESTION: QQQuestion = {
  id: 'demo-q', category: 'MUCHO', phaseIndex: 1, questionIndexInPhase: 0,
  text: 'Welche Stadt hat die meisten Brücken?', answer: '0',
  options: ['Hamburg', 'Venedig', 'Amsterdam', 'Berlin'], correctOptionIndex: 0,
};
export const QUESTION2: QQQuestion = {
  id: 'demo-q2', category: 'SCHAETZCHEN', phaseIndex: 1, questionIndexInPhase: 1,
  text: 'Wie viele Brücken hat Hamburg ungefähr?', answer: '2500',
  targetValue: 2500, unit: 'Brücken',
};

// ── Brett-Progression (Owner-Index pro Zelle, -1 = leer) ─────────────────────
export type Board = number[][];
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
const B_STEAL: Board = [
  [0, 1, -1, 1, 1],
  [0, -1, -1, 1, -1],
  [-1, -1, 2, -1, 3],
  [2, 2, -1, 3, 3],
  [-1, 2, -1, -1, 3],
];
const STUCK_CELL = { r: 4, c: 4 };

function makeGrid(board: Board, opts?: { stuck?: { r: number; c: number } }): QQCell[][] {
  return board.map((row, r) =>
    row.map((owner, c): QQCell => ({
      row: r, col: c,
      ownerId: owner >= 0 ? TEAMS[owner].id : null,
      jokerFormed: false,
      stuck: opts?.stuck && opts.stuck.r === r && opts.stuck.c === c ? true : undefined,
    })),
  );
}
function teamsForBoard(board: Board): QQTeam[] {
  return TEAMS.map((t, idx): QQTeam => {
    const cells = board.flat().filter((o) => o === idx).length;
    return { id: t.id, name: t.name, color: t.color, avatarId: t.avatarId, emoji: t.emoji, connected: true, totalCells: cells, largestConnected: cells };
  });
}

export function buildState(args: {
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
    serverTime: now, roomCode: 'COZY', phase: args.phase, gamePhaseIndex: 2, questionIndex: 0,
    gridSize: GRID, grid, teams: teamsForBoard(args.board), teamPhaseStats: {},
    currentQuestion: args.question,
    revealedAnswer: args.correctTeamId ? (args.question?.options?.[0] ?? null) : null,
    correctTeamId: args.correctTeamId,
    pendingFor: null, pendingAction: null, comebackTeamId: null, comebackAction: null,
    comebackStealTargets: [], comebackStealsDone: [], comebackHL: null, comebackHLTimerSec: 20,
    connections: null, connectionsTimerSec: 180, connectionsMaxFails: 2, connectionsEnabled: false,
    shuffleQuestionsInRound: false, swapFirstCell: null, language: 'de',
    timerDurationSec: 20, timerEndsAt: args.phase === 'QUESTION_ACTIVE' ? now + 18000 : null,
    answers: args.answers.map((a) => ({ teamId: a.teamId, text: a.text, submittedAt: now })),
    buzzQueue: [], hotPotatoActiveTeamId: null, hotPotatoEliminated: [], hotPotatoLastAnswer: null,
    hotPotatoTurnEndsAt: null, hotPotatoUsedAnswers: [], muchoRevealStep: args.muchoRevealStep ?? 0,
  };
  return base as unknown as QQStateUpdate;
}

// ── Beat-Timeline (synchroner Beamer+Handy-Durchlauf) ────────────────────────
export type Beat = {
  ms: number;
  caption: string;
  beamer: 'lobby' | 'category' | 'question' | 'board' | 'winner';
  phone: 'lobby' | 'category' | 'question' | 'correct' | 'standings' | 'winner';
  state: QQStateUpdate;
  category?: QQCategory;
  highlightTeam?: string | null;
};

export function buildBeats(): Beat[] {
  const mk = (board: Board, phase: QQStateUpdate['phase'], question: QQQuestion | null, answers: { teamId: string; text: string }[], correct: string | null, stuck?: { r: number; c: number }) =>
    buildState({ board, phase, question, answers, correctTeamId: correct, stuck, muchoRevealStep: correct ? 9 : 0 });
  return [
    { ms: 4500, caption: 'Teams joinen per QR-Code — gespielt wird am eigenen Handy.',
      beamer: 'lobby', phone: 'lobby', state: mk(B_EMPTY, 'LOBBY', null, [], null) },
    { ms: 2800, caption: '5 Kategorien sorgen für Abwechslung — los geht’s mit Mu-Cho.',
      beamer: 'category', phone: 'category', category: 'MUCHO', state: mk(B_EMPTY, 'QUESTION_ACTIVE', QUESTION, [], null) },
    { ms: 5600, caption: 'Jedes Team tippt seine Antwort am Handy.',
      beamer: 'question', phone: 'question', category: 'MUCHO', state: mk(B_EMPTY, 'QUESTION_ACTIVE', QUESTION, [{ teamId: 't0', text: '0' }], null) },
    { ms: 4800, caption: 'Richtig? Dann erobert ihr ein Feld auf dem Brett.',
      beamer: 'board', phone: 'correct', highlightTeam: 't0', state: mk(B_FIRST, 'PLACEMENT', null, [], null) },
    { ms: 2800, caption: 'Nächste Kategorie: Schätzchen — wie nah kommt ihr ran?',
      beamer: 'category', phone: 'category', category: 'SCHAETZCHEN', state: mk(B_FIRST, 'QUESTION_ACTIVE', QUESTION2, [], null) },
    { ms: 5600, caption: 'Mal Multiple-Choice, mal schätzen, mal Bilder — nie langweilig.',
      beamer: 'question', phone: 'question', category: 'SCHAETZCHEN', state: mk(B_FIRST, 'QUESTION_ACTIVE', QUESTION2, [], null) },
    { ms: 4800, caption: 'Runde um Runde wächst euer Gebiet in eurer Farbe.',
      beamer: 'board', phone: 'standings', highlightTeam: 't2', state: mk(B_FILL, 'PLACEMENT', null, [], null) },
    { ms: 4800, caption: 'Klauen, Stapeln, Joker — Taktik entscheidet.',
      beamer: 'board', phone: 'standings', highlightTeam: 't1', state: mk(B_STEAL, 'PLACEMENT', null, [], null, STUCK_CELL) },
    { ms: 5600, caption: 'Das größte zusammenhängende Gebiet gewinnt. Buch dein CozyQuiz!',
      beamer: 'winner', phone: 'winner', state: mk(B_STEAL, 'GAME_OVER', null, [], null, STUCK_CELL) },
  ];
}

// ── „Projiziert"-Overlay (Bloom + Vignette + Körnung) ────────────────────────
const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
export function ProjectedFX({ radius }: { radius: number }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: radius, background: 'radial-gradient(130% 90% at 50% 14%, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 38%, transparent 62%)', mixBlendMode: 'screen' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: radius, boxShadow: 'inset 0 0 100px rgba(4,6,14,0.5)' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: radius, backgroundImage: GRAIN, backgroundSize: '140px 140px', opacity: 0.045, mixBlendMode: 'overlay' }} />
    </>
  );
}

// ── Scaled-Device ────────────────────────────────────────────────────────────
export function ScaledScreen({ logicalW, logicalH, radius, fit, children, overlay, style }: {
  logicalW: number; logicalH: number; radius: number;
  fit: 'width' | 'height'; children: ReactNode; overlay?: ReactNode; style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const update = () => setW(el.clientWidth);
    const ro = new ResizeObserver(update); ro.observe(el); update();
    return () => ro.disconnect();
  }, []);
  const scale = w > 0 ? w / logicalW : 0;
  return (
    <div ref={ref} style={{
      aspectRatio: `${logicalW} / ${logicalH}`,
      ...(fit === 'width' ? { width: '100%' } : { height: '100%' }),
      position: 'relative', overflow: 'hidden', borderRadius: radius, background: COZY_BG, ...style,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: logicalW, height: logicalH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
      {overlay}
    </div>
  );
}

// ── Helfer ───────────────────────────────────────────────────────────────────
function DemoAvatar({ team, size }: { team: DemoTeam; size: number | string }) {
  return <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={size} teamId={team.id} eyes="open" />;
}
const catColor = (c: QQCategory) => QQ_CATEGORY_COLORS[c];
const catLabel = (c: QQCategory) => QQ_CATEGORY_LABELS[c];

// ── Beamer-Szenen (logische 1024×576) ────────────────────────────────────────
function BeamerCategory({ category }: { category: QQCategory }) {
  const color = catColor(category); const label = catLabel(category);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: '#fff', background: `radial-gradient(circle at 50% 42%, ${color}33, transparent 62%)` }}>
      <div style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800 }}>Kategorie</div>
      <div style={{ fontSize: 110, lineHeight: 1, animation: 'demoSplash 0.5s var(--qq-ease-bounce, cubic-bezier(0.2,1.2,0.3,1)) both', filter: `drop-shadow(0 6px 30px ${color}88)` }}>{label.emoji}</div>
      <div style={{ fontSize: 60, fontWeight: 900, color, textShadow: `0 0 30px ${color}55` }}>{label.de}</div>
    </div>
  );
}

function BeamerQuestionBanner({ q }: { q: QQQuestion }) {
  const color = catColor(q.category); const label = catLabel(q.category);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '52px 64px', color: '#fff', fontFamily: "'Bricolage Grotesque','Inter',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ padding: '8px 24px', borderRadius: 999, fontWeight: 900, fontSize: 24, background: color, boxShadow: `0 0 28px ${color}77` }}>{label.de}</span>
        <span style={{ marginLeft: 'auto', fontSize: 40, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>0:12</span>
      </div>
      <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.12, margin: 'auto 0', textAlign: 'center', maxWidth: 800, alignSelf: 'center' }}>{q.text}</div>
      {q.options ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {q.options.map((o, i) => (
            <div key={o} style={{ padding: '22px 26px', borderRadius: 18, fontWeight: 800, fontSize: 28, background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.14)', animation: `demoPop 0.4s ease ${0.08 * i}s both` }}>
              <span style={{ color, fontWeight: 900, marginRight: 12 }}>{String.fromCharCode(65 + i)}</span>{o}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '18px 28px', borderRadius: 18, background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.14)', fontWeight: 800, fontSize: 30 }}>
          <span style={{ color }}>≈</span> Tippt eure Schätzung ein{q.unit ? ` (${q.unit})` : ''}
        </div>
      )}
    </div>
  );
}

function BeamerLobby() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, color: '#fff', padding: 48 }}>
      <div style={{ fontSize: 56, fontWeight: 900, textAlign: 'center' }}>
        Willkommen bei <span style={{ background: 'linear-gradient(135deg,#F472B6,#A21247)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CozyQuiz</span>
      </div>
      <div style={{ fontSize: 26, color: '#cbd5e1', fontWeight: 600 }}>Scannt den QR-Code mit dem Handy</div>
      <div style={{ display: 'flex', gap: 44, marginTop: 12 }}>
        {TEAMS.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, animation: `demoPop 0.45s var(--qq-ease-bounce, cubic-bezier(0.2,1.2,0.3,1)) ${0.1 + i * 0.12}s both` }}>
            <DemoAvatar team={t} size={108} />
            <span style={{ fontSize: 22, fontWeight: 800 }}>{t.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BeamerWinner({ beat }: { beat: Beat }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.22 }}>
        <GridDisplay state={beat.state} maxSize={430} highlightTeam={null} />
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, color: '#fff', background: 'radial-gradient(circle at 50% 40%, rgba(236,72,153,0.20), transparent 62%)', padding: 40 }}>
        <div style={{ fontSize: 72 }}>🏆</div>
        <div style={{ position: 'relative' }}>
          <span aria-hidden style={{ position: 'absolute', top: -46, left: '50%', transform: 'translateX(-50%)', fontSize: 48 }}>👑</span>
          <DemoAvatar team={ME} size={128} />
        </div>
        <div style={{ fontSize: 40, fontWeight: 900 }}>Sieger: {ME.name}</div>
      </div>
    </div>
  );
}

function DemoBoard({ beat }: { beat: Beat }) {
  return (
    <div key={`b-${beat.caption}`} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'demoIn 0.5s ease both' }}>
      <GridDisplay state={beat.state} maxSize={470} highlightTeam={beat.highlightTeam ?? null} />
    </div>
  );
}

export function BeamerScene({ beat }: { beat: Beat }) {
  if (beat.beamer === 'lobby') return <BeamerLobby />;
  if (beat.beamer === 'category' && beat.category) return <BeamerCategory category={beat.category} />;
  if (beat.beamer === 'question' && beat.state.currentQuestion) return <BeamerQuestionBanner q={beat.state.currentQuestion} />;
  if (beat.beamer === 'winner') return <BeamerWinner beat={beat} />;
  return <DemoBoard beat={beat} />;
}

// ── Handy-Szenen (logische 360×780) ──────────────────────────────────────────
function PhoneLobby() {
  return (
    <CozyCard borderColor={ME.color}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '10px 0' }}>
        <DemoAvatar team={ME} size={120} />
        <div style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>Du bist dabei!</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#cbd5e1' }}>Team {ME.name}</div>
      </div>
    </CozyCard>
  );
}
function PhoneCategory({ category }: { category: QQCategory }) {
  const color = catColor(category); const label = catLabel(category);
  return (
    <CozyCard borderColor={color}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '14px 0' }}>
        <div style={{ fontSize: 64, animation: 'demoSplash 0.5s ease both' }}>{label.emoji}</div>
        <div style={{ fontSize: 24, fontWeight: 900, color }}>{label.de}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#cbd5e1' }}>Macht euch bereit …</div>
      </div>
    </CozyCard>
  );
}
function PhoneCorrect() {
  return (
    <CozyCard borderColor="#22C55E">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '12px 0' }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46, boxShadow: '0 0 34px rgba(34,197,94,0.5)', animation: 'demoPop 0.5s var(--qq-ease-bounce, cubic-bezier(0.2,1.2,0.3,1)) both' }}>✓</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>Richtig!</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#86efac' }}>+1 Feld auf dem Brett</div>
      </div>
    </CozyCard>
  );
}
function PhoneStandings({ board }: { board: Board }) {
  const teams = teamsForBoard(board).map((t, i) => ({ ...t, demo: TEAMS[i] })).sort((a, b) => b.totalCells - a.totalCells);
  return (
    <CozyCard borderColor={ME.color}>
      <div style={{ fontSize: 16, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Zwischenstand</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {teams.map((t, rank) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 22, fontSize: 19, fontWeight: 900, color: rank === 0 ? '#FBBF24' : '#64748b' }}>{rank + 1}</span>
            <DemoAvatar team={t.demo} size={46} />
            <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', flex: 1 }}>{t.name}</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: t.color }}>{t.totalCells}</span>
          </div>
        ))}
      </div>
    </CozyCard>
  );
}
function PhoneWinner() {
  return (
    <CozyCard borderColor={ME.color}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '14px 0' }}>
        <div style={{ fontSize: 64 }}>🏆</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>Stark gespielt!</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: ME.color }}>Platz 1 · {ME.name}</div>
      </div>
    </CozyCard>
  );
}

export function PhoneScene({ beat }: { beat: Beat }) {
  const wrap: CSSProperties = { position: 'absolute', inset: 0, padding: '64px 18px 22px', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "'Nunito','Inter',sans-serif" };
  if (beat.phone === 'question') {
    return (
      <div key={`pq-${beat.caption}`} style={{ ...wrap, animation: 'demoIn 0.5s ease both' }}>
        <QuestionCard state={beat.state} myTeamId={ME.id} emit={() => {}} roomCode="COZY" lang="de" />
      </div>
    );
  }
  return (
    <div key={`p-${beat.phone}-${beat.caption}`} style={{ ...wrap, justifyContent: 'center', animation: 'demoIn 0.5s ease both' }}>
      {beat.phone === 'lobby' && <PhoneLobby />}
      {beat.phone === 'category' && beat.category && <PhoneCategory category={beat.category} />}
      {beat.phone === 'correct' && <PhoneCorrect />}
      {beat.phone === 'standings' && <PhoneStandings board={beat.state.grid.map((row) => row.map((c) => (c.ownerId ? TEAMS.findIndex((t) => t.id === c.ownerId) : -1)))} />}
      {beat.phone === 'winner' && <PhoneWinner />}
    </div>
  );
}

// ── Haupt-Komponente (auto-play, gross, synchron) ────────────────────────────
export function QQDemoShowcase() {
  const beats = useMemo(buildBeats, []);
  const [beat, setBeat] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setBeat((b) => (b + 1) % beats.length), beats[beat].ms);
    return () => clearTimeout(t);
  }, [beat, paused, beats]);

  const cur = beats[beat];
  useEffect(() => {
    if (cur.beamer === 'lobby') wakeAllAvatars(2600);
    if (cur.highlightTeam) wakeTeamAvatar(cur.highlightTeam, 2600);
  }, [beat, cur]);

  const stageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e: React.MouseEvent) => {
    const el = stageRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setTilt({ x: -(((e.clientY - r.top) / r.height) - 0.5) * 4, y: (((e.clientX - r.left) / r.width) - 0.5) * 5 });
  };
  const onLeave = () => { setTilt({ x: 0, y: 0 }); setPaused(false); };

  return (
    <AvatarSetProvider value="cozy3d">
      <DemoKeyframes />
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, width: '100%' }}>
        <div key={`cap-${beat}`} style={{
          fontSize: 'clamp(16px, 2.2vw, 24px)', color: '#f1f5f9', fontWeight: 800,
          textAlign: 'center', maxWidth: 760, minHeight: 60, lineHeight: 1.3,
          animation: 'demoIn 0.5s ease both', textShadow: '0 2px 18px rgba(0,0,0,0.4)',
        }}>
          {cur.caption}
        </div>

        <div ref={stageRef}
          onMouseEnter={() => setPaused(true)} onMouseMove={onMove} onMouseLeave={onLeave}
          style={{
            position: 'relative', width: '100%', borderRadius: 28, overflow: 'hidden',
            padding: 'clamp(32px,5vw,64px) clamp(14px,2.5vw,36px) clamp(40px,6vw,72px)',
            background: 'radial-gradient(125% 95% at 50% 2%, #0b1020 0%, #06080f 55%, #04050b 100%)',
            boxShadow: 'inset 0 0 150px rgba(0,0,0,0.88)',
            perspective: 1800, perspectiveOrigin: '50% 42%',
          }}>
          <div aria-hidden style={{
            position: 'absolute', left: '4%', right: '4%', bottom: '4%', height: '34%', pointerEvents: 'none', zIndex: 0,
            background: 'radial-gradient(ellipse 58% 100% at 40% 0%, rgba(120,140,230,0.16), transparent 70%), radial-gradient(ellipse 30% 100% at 80% 0%, rgba(236,72,153,0.12), transparent 70%)',
            filter: 'blur(30px)',
          }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,4vw,64px)', justifyContent: 'center', alignItems: 'center' }}>
            {/* Beamer */}
            <figure style={{
              margin: 0, position: 'relative', width: 'min(94vw, 720px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y - 3}deg)`, transformStyle: 'preserve-3d', transition: 'transform 0.3s ease-out',
            }}>
              <div aria-hidden style={{ position: 'absolute', inset: '-14% -8% 8%', pointerEvents: 'none', zIndex: -1, background: 'radial-gradient(ellipse 60% 60% at 50% 42%, rgba(99,102,241,0.26), rgba(236,72,153,0.10) 46%, transparent 72%)', filter: 'blur(36px)', animation: 'demoGlow 6s ease-in-out infinite' }} />
              <ScaledScreen logicalW={BEAMER.w} logicalH={BEAMER.h} radius={16} fit="width" overlay={<ProjectedFX radius={16} />}
                style={{ border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 50px 110px -28px rgba(0,0,0,0.82), 0 0 80px rgba(99,102,241,0.20), 0 0 0 1px rgba(255,255,255,0.07)' }}>
                <BeamerScene beat={cur} />
              </ScaledScreen>
              <span style={{ fontSize: 11, color: '#5b6780', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Beamer</span>
            </figure>

            {/* Handy */}
            <figure style={{
              margin: 0, position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y + 5}deg) translateY(6px)`, transformStyle: 'preserve-3d', transition: 'transform 0.3s ease-out',
            }}>
              <div aria-hidden style={{ position: 'absolute', inset: '-12% -22% 4%', pointerEvents: 'none', zIndex: -1, background: 'radial-gradient(ellipse 55% 60% at 50% 45%, rgba(236,72,153,0.20), transparent 70%)', filter: 'blur(32px)', animation: 'demoGlow 6s ease-in-out infinite 1.5s' }} />
              <div style={{
                height: 'min(66vh, 500px)', display: 'inline-flex', padding: 9, borderRadius: 44, position: 'relative',
                background: 'linear-gradient(155deg,#262b3d 0%,#0c0f1a 70%)', border: '1px solid rgba(255,255,255,0.14)',
                boxShadow: '0 50px 110px -28px rgba(0,0,0,0.86), 0 0 50px rgba(236,72,153,0.16)',
              }}>
                <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', width: 90, height: 23, borderRadius: 99, background: '#05070d', zIndex: 5 }} />
                <ScaledScreen logicalW={PHONE.w} logicalH={PHONE.h} radius={36} fit="height">
                  <PhoneScene beat={cur} />
                </ScaledScreen>
              </div>
              <span style={{ fontSize: 11, color: '#5b6780', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase' }}>Dein Handy</span>
            </figure>
          </div>
        </div>

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
