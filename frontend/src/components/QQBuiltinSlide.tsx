import { QQStateUpdate, QQSlideTemplateType, QQCategory } from '../../../shared/quarterQuizTypes';
import {
  LobbyView, PhaseIntroView, QuestionView, PlacementView, ComebackView, GameOverView,
  BEAMER_CSS,
} from '../pages/QQBeamerPage';

// ── Mock data (mirrors QQCustomSlide.tsx) ─────────────────────────────────────

const MOCK_TEAMS: QQStateUpdate['teams'] = [
  { id: 't1', name: 'Team Adler', color: '#3B82F6', avatarId: 'eagle', connected: true, totalCells: 5, largestConnected: 4 },
  { id: 't2', name: 'Team Fuchs', color: '#EF4444', avatarId: 'fox', connected: true, totalCells: 3, largestConnected: 3 },
];

const MOCK_GRID_SIZE = 5;
const MOCK_GRID = Array.from({ length: MOCK_GRID_SIZE }, (_, r) =>
  Array.from({ length: MOCK_GRID_SIZE }, (_, c) => ({
    row: r, col: c,
    ownerId: r < 2 ? 't1' : r > 2 ? 't2' : null,
    jokerFormed: false,
    placedBy: null,
  }))
);

const MOCK_STATE_BASE: QQStateUpdate = {
  roomCode: 'DEMO',
  phase: 'LOBBY',
  gamePhaseIndex: 1,
  questionIndex: 0,
  gridSize: MOCK_GRID_SIZE,
  grid: MOCK_GRID,
  teams: MOCK_TEAMS,
  teamPhaseStats: {},
  currentQuestion: null,
  revealedAnswer: null,
  correctTeamId: null,
  pendingFor: null,
  pendingAction: null,
  comebackTeamId: null,
  comebackAction: null,
  swapFirstCell: null,
  language: 'de',
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
  totalPhases: 3,
  globalMuted: false,
  volume: 0.8,
  frozenCells: [],
  stuckCandidates: [],
  rulesSlideIndex: 0,
};

const MOCK_QUESTION_BASE = {
  id: 'preview',
  category: 'MUCHO' as QQCategory,
  phaseIndex: 1 as const,
  questionIndexInPhase: 0,
  text: 'Beispielfrage: Was ist die Hauptstadt von Deutschland?',
  textEn: 'Sample question: What is the capital of Germany?',
  options: ['Berlin', 'Hamburg', 'München', 'Frankfurt'],
  optionsEn: ['Berlin', 'Hamburg', 'Munich', 'Frankfurt'],
  correctOptionIndex: 0,
  answer: 'Berlin',
  answerEn: 'Berlin',
};

// ── Mock state factory ────────────────────────────────────────────────────────

export function makeBuiltinMockState(templateType: QQSlideTemplateType): QQStateUpdate {
  const base = { ...MOCK_STATE_BASE };
  switch (templateType) {
    case 'LOBBY':
      return { ...base, phase: 'LOBBY', teams: MOCK_TEAMS, roomCode: 'DEMO' };

    case 'PHASE_INTRO_1':
      return { ...base, phase: 'PHASE_INTRO', gamePhaseIndex: 1 };
    case 'PHASE_INTRO_2':
      return { ...base, phase: 'PHASE_INTRO', gamePhaseIndex: 2 };
    case 'PHASE_INTRO_3':
      return { ...base, phase: 'PHASE_INTRO', gamePhaseIndex: 3 };

    case 'QUESTION_SCHAETZCHEN':
      return {
        ...base, phase: 'QUESTION_ACTIVE',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'SCHAETZCHEN' as QQCategory, text: 'Wie viele Einwohner hat Berlin?', options: ['2 Mio', '3.7 Mio', '5 Mio', '1 Mio'], answer: '3.7 Mio', targetValue: 3700000 },
        timerEndsAt: Date.now() + 20000, timerDurationSec: 20, teams: MOCK_TEAMS,
      };
    case 'QUESTION_MUCHO':
      return {
        ...base, phase: 'QUESTION_ACTIVE',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'MUCHO' as QQCategory },
        timerEndsAt: Date.now() + 20000, timerDurationSec: 20, teams: MOCK_TEAMS,
      };
    case 'QUESTION_BUNTE_TUETE':
      return {
        ...base, phase: 'QUESTION_ACTIVE',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'BUNTE_TUETE' as QQCategory, text: 'Was ist das? Bunte-Tüte-Frage!' },
        timerEndsAt: Date.now() + 20000, timerDurationSec: 20, teams: MOCK_TEAMS,
      };
    case 'QUESTION_ZEHN':
      return {
        ...base, phase: 'QUESTION_ACTIVE',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'ZEHN_VON_ZEHN' as QQCategory, text: 'Nenne 10 deutsche Städte!', options: ['1','2','3','4','5','6','7','8','9','10'] },
        timerEndsAt: Date.now() + 20000, timerDurationSec: 20, teams: MOCK_TEAMS,
      };
    case 'QUESTION_CHEESE':
      return {
        ...base, phase: 'QUESTION_ACTIVE',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'CHEESE' as QQCategory, text: 'Was siehst du auf dem Bild?' },
        timerEndsAt: Date.now() + 20000, timerDurationSec: 20, teams: MOCK_TEAMS,
      };

    case 'REVEAL':
      return {
        ...base, phase: 'QUESTION_REVEAL',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'MUCHO' as QQCategory },
        revealedAnswer: 'Berlin', correctTeamId: 't1', teams: MOCK_TEAMS,
      };

    case 'PLACEMENT':
      return {
        ...base, phase: 'PLACEMENT',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'MUCHO' as QQCategory },
        correctTeamId: 't1', teams: MOCK_TEAMS,
        grid: MOCK_GRID, gridSize: MOCK_GRID_SIZE,
      };

    case 'COMEBACK_CHOICE':
      return {
        ...base, phase: 'COMEBACK_CHOICE',
        comebackTeamId: 't2', correctTeamId: 't2', teams: MOCK_TEAMS,
      };

    case 'GAME_OVER':
      return {
        ...base, phase: 'GAME_OVER',
        correctTeamId: 't1', teams: MOCK_TEAMS,
        grid: MOCK_GRID, gridSize: MOCK_GRID_SIZE,
      };

    default:
      return base;
  }
}

// ── QQBuiltinSlide component ─────────────────────────────────────────────────

/**
 * Renders the real built-in beamer view for a given template type.
 * If `state` is provided it uses live data; otherwise it uses mock data.
 */
export function QQBuiltinSlide({ templateType, state }: {
  templateType: QQSlideTemplateType;
  state?: QQStateUpdate;
}) {
  const s = state ?? makeBuiltinMockState(templateType);
  const revealed = s.phase === 'QUESTION_REVEAL';

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: '#0D0A06',
      fontFamily: "'Nunito', system-ui, sans-serif",
      color: '#e2e8f0',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{BEAMER_CSS}</style>
      {s.phase === 'LOBBY'           && <LobbyView state={s} />}
      {s.phase === 'PHASE_INTRO'     && <PhaseIntroView state={s} />}
      {(s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL') && (
        <QuestionView key={s.currentQuestion?.id ?? 'preview'} state={s} revealed={revealed} hideCutouts />
      )}
      {s.phase === 'PLACEMENT'       && <PlacementView state={s} />}
      {s.phase === 'COMEBACK_CHOICE' && <ComebackView state={s} />}
      {s.phase === 'GAME_OVER'       && <GameOverView state={s} />}
    </div>
  );
}
