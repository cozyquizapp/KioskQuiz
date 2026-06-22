/**
 * QQShowroomPage — öffentlicher Auto-Play-Trailer „Was ist ein CozyQuiz?".
 *
 * 2026-06-22 (Wolf): zeigt die ECHTEN Beamer-Views (TeamsReveal → Frage →
 * Auflösung → Treppchen → Thanks) mit vorgefertigtem Mock-State — kein Nachbau.
 * Im nativen 16:9-Querformat, auf den Mobile-Screen gefittet (das 1920×1080-
 * Canvas wird wie ein Video herunterskaliert, genau wie der echte SlideStage).
 * Loopt, Stories-Fortschritt, Tippen = Pause. Zwei Use-Cases: unterwegs aufm
 * iPhone herzeigen + öffentliche QR-Landing („was mache ich").
 *
 * Route /showroom, NICHT PIN-gegated. Reuse echter Views = identisches Bild
 * zum Beamer, kein Drift. Pro Szene Error-Boundary (falls eine View ohne den
 * vollen Live-State stolpert, wird die Szene übersprungen statt White-Screen).
 */
import { Component, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { TeamsRevealView } from '../components/CozyQuizTeamsRevealView';
import { QuestionView } from '../components/CozyQuizQuestionView';
import { GameOverView } from '../components/CozyQuizGameOverView';
import { ThanksView } from './QQBeamerPage';

const PINK = '#ec4899';

// ── Mock-Daten (aus dem bewährten Thanks-Test-Muster) ───────────────────────
const TEAMS = [
  { id: 't1', name: 'Die Pinguine', color: '#3B82F6', avatarId: 'penguin', emoji: '🐧', connected: true, totalCells: 9, largestConnected: 6 },
  { id: 't2', name: 'Wolfsrudel',   color: '#EC4899', avatarId: 'wolf',    emoji: '🐺', connected: true, totalCells: 6, largestConnected: 4 },
  { id: 't3', name: 'Koala Krew',   color: '#22C55E', avatarId: 'koala',   emoji: '🐨', connected: true, totalCells: 6, largestConnected: 3 },
  { id: 't4', name: 'Eulen-Crew',   color: '#A855F7', avatarId: 'owl',     emoji: '🦉', connected: true, totalCells: 4, largestConnected: 2 },
] as unknown as QQStateUpdate['teams'];

function buildGrid(): QQStateUpdate['grid'] {
  const total = TEAMS.reduce((s, t) => s + ((t as any).totalCells ?? 0), 0) || 25;
  const ids: (string | null)[] = [];
  for (const t of TEAMS) {
    const n = Math.round((((t as any).totalCells ?? 0) / total) * 25);
    for (let i = 0; i < n; i++) ids.push((t as any).id);
  }
  while (ids.length < 25) ids.push((TEAMS as any)[0]?.id ?? null);
  ids.length = 25;
  return Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => ({ row: r, col: c, ownerId: ids[r * 5 + c] ?? null, jokerFormed: false, placedBy: ids[r * 5 + c] ?? null }))
  ) as unknown as QQStateUpdate['grid'];
}

const MOCK_QUESTION = {
  id: 'q1', category: 'SCHAETZCHEN', phaseIndex: 1, questionIndexInPhase: 0,
  text: 'Wie hoch ist der Eiffelturm?', answer: '330', targetValue: 330, unit: 'm',
} as unknown as QQStateUpdate['currentQuestion'];

function baseState(): QQStateUpdate {
  return {
    roomCode: 'DEMO', phase: 'THANKS', setupDone: true, gamePhaseIndex: 4,
    questionIndex: 24, gridSize: 5, grid: buildGrid(), teams: TEAMS,
    teamPhaseStats: {}, currentQuestion: null, revealedAnswer: null, correctTeamId: null,
    pendingFor: null, pendingAction: null, comebackTeamId: null, comebackAction: null,
    comebackStealTargets: [], comebackStealsDone: [], swapFirstCell: null, language: 'de',
    timerDurationSec: 20, timerEndsAt: null, answers: [], buzzQueue: [],
    hotPotatoActiveTeamId: null, hotPotatoEliminated: [], hotPotatoLastAnswer: null,
    hotPotatoTurnEndsAt: null, hotPotatoUsedAnswers: [], imposterActiveTeamId: null,
    imposterChosenIndices: [], imposterEliminated: [], lastPlacedCell: null, imageRevealed: false,
    avatarsEnabled: true, totalPhases: 4, globalMuted: false, musicMuted: false, sfxMuted: false,
    volume: 0.8, frozenCells: [], shieldedCells: [], stuckCandidates: [], rulesSlideIndex: 0,
    introStep: 0, categoryIsNew: false, allAnswered: false, enable3DTransition: false,
    teamsRevealStartedAt: null, mapRevealStep: 0, comebackIntroStep: 0, muchoRevealStep: 0,
    zvzRevealStep: 0, cheeseRevealStep: 0, finalBets: {}, finalBettingSubmitted: {},
    finalPhaseWins: {}, finalLastSnapshot: null, finalRecapStep: 0, finalRecapJustWon: null,
    finalRevealStep: 0, finalRoundWinners: null,
    finalBetResolution: {
      t1: { targetTeamId: 't2', mutualWith: 't2', totalBonus: 4, baseBonus: 3, sympathyBonus: 1 },
      t2: { targetTeamId: 't1', mutualWith: 't1', totalBonus: 4, baseBonus: 3, sympathyBonus: 1 },
      t3: { targetTeamId: 't1', mutualWith: null, totalBonus: 2, baseBonus: 2, sympathyBonus: 0 },
      t4: { targetTeamId: 't1', mutualWith: null, totalBonus: 0, baseBonus: 0, sympathyBonus: 0 },
    } as any,
    endAwards: { underdog: 't4', meisterklauer: 't3', speedy: 't1', meisterklauerCount: 4, speedyAvgMs: -1200 } as any,
    finalWagerEnabled: true, teamTotalSteals: {}, questionHistory: [],
    serverTime: Date.now(),
  } as unknown as QQStateUpdate;
}

// ── Szenen: echte Beamer-View + Phase-Override ──────────────────────────────
type Scene = { key: string; ms: number; render: (s: QQStateUpdate) => ReactNode };

const SCENES: Scene[] = [
  {
    key: 'teams', ms: 5200,
    render: (s) => <TeamsRevealView state={{ ...s, phase: 'TEAMS_REVEAL', teamsRevealStartedAt: s.serverTime - 9000 } as QQStateUpdate} />,
  },
  {
    key: 'frage', ms: 4600,
    render: (s) => <QuestionView state={{ ...s, phase: 'QUESTION_ACTIVE', currentQuestion: MOCK_QUESTION, timerEndsAt: s.serverTime + 18000 } as QQStateUpdate} revealed={false} />,
  },
  {
    key: 'reveal', ms: 4800,
    render: (s) => <QuestionView state={{ ...s, phase: 'QUESTION_REVEAL', currentQuestion: MOCK_QUESTION, revealedAnswer: '330 m', correctTeamId: 't1' } as QQStateUpdate} revealed={true} />,
  },
  {
    key: 'treppchen', ms: 6000,
    render: (s) => <GameOverView state={{ ...s, phase: 'GAME_OVER' } as QQStateUpdate} />,
  },
  {
    key: 'thanks', ms: 5400,
    render: (s) => <ThanksView state={{ ...s, phase: 'THANKS' } as QQStateUpdate} roomCode="DEMO" />,
  },
];

export default function QQShowroomPage() {
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const base = useMemo(() => baseState(), []);
  const advance = () => setScene(i => (i + 1) % SCENES.length);
  const cur = SCENES[scene];

  return (
    <div
      onClick={() => setPaused(p => !p)}
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0A0814', cursor: 'pointer', userSelect: 'none',
        fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
      }}
    >
      <style>{`@keyframes srBar { from { width: 0%; } to { width: 100%; } }`}</style>

      {/* 16:9-Bühne, auf den Mobile-Screen gefittet (wie der echte SlideStage). */}
      <MiniStage>
        <SceneBoundary sceneKey={cur.key}>
          {cur.render(base)}
        </SceneBoundary>
      </MiniStage>

      {/* Stories-Fortschrittsbalken (über der Bühne, oben). */}
      <div style={{
        position: 'absolute', top: 'max(10px, env(safe-area-inset-top))', left: 0, right: 0, zIndex: 20,
        display: 'flex', gap: 5, padding: '0 12px', pointerEvents: 'none',
      }}>
        {SCENES.map((sc, i) => (
          <div key={sc.key} style={{ flex: 1, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
            <div
              key={`${i}-${scene}`}
              onAnimationEnd={i === scene ? advance : undefined}
              style={{
                height: '100%', borderRadius: 999, background: PINK,
                width: i < scene ? '100%' : '0%',
                animation: i === scene ? `srBar ${sc.ms}ms linear forwards` : 'none',
                animationPlayState: paused ? 'paused' : 'running',
              }}
            />
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute', bottom: 'max(10px, env(safe-area-inset-bottom))', left: 0, right: 0, zIndex: 20,
        textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', pointerEvents: 'none',
      }}>
        {paused ? '▶ Tippen zum Fortsetzen' : 'CozyQuiz · tippen zum Pausieren'}
      </div>
    </div>
  );
}

// MiniStage — repliziert den echten SlideStage: 16:9-Box (auf Viewport gefittet)
// → festes 1920×1080-Canvas, per transform:scale herunterskaliert. containerType
// size, damit die cqw/cqh der echten Views korrekt aufs Canvas referenzieren.
function MiniStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      const s = Math.min(w / 1920, h / 1080);
      setScale(prev => (Math.abs(prev - s) > 0.002 ? s : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  return (
    <div ref={ref} style={{
      width: 'min(100vw, 177.78vh)', height: 'min(100vh, 56.25vw)',
      position: 'relative', overflow: 'clip', background: '#0F0817',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: 'center center',
        flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column',
        containerType: 'size',
      }}>
        {children}
      </div>
    </div>
  );
}

// Pro-Szene Error-Boundary: stolpert eine echte View ohne den vollen Live-State,
// zeigen wir einen Fallback statt White-Screen (und der Auto-Advance läuft weiter).
class SceneBoundary extends Component<{ sceneKey: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(prev: { sceneKey: string }) {
    if (prev.sceneKey !== this.props.sceneKey && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (this.state.failed) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: PINK, fontSize: 48, fontWeight: 900 }}>
          CozyQuiz
        </div>
      );
    }
    return this.props.children;
  }
}
