import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  fetchCurrentQuestion,
  fetchQuestions,
  startTimer,
  stopTimer,
  setLanguage,
  fetchQuizzes,
  useQuiz,
  overrideAnswer,
  kickTeam,
  fetchAnswers,
  fetchTimer,
  fetchScoreboard,
  postQuestionStats,
  postRunStats,
  fetchLeaderboard,
  fetchHealth,
  listPublishedQuizzes
} from '../api';
import { AnswerEntry, AnyQuestion, QuizTemplate, Language, CozyGameState, RundlaufState } from '@shared/quizTypes';
import { categoryColors } from '../categoryColors';
import { categoryIcons } from '../categoryAssets';
import { useQuizSocket } from '../hooks/useQuizSocket';
import TimerCard from '../components/moderator/TimerCard';
import AnswerList from '../components/moderator/AnswerList';
import TeamsList from '../components/moderator/TeamsList';
import ActionButtons from '../components/moderator/ActionButtons';
import StatusDot from '../components/moderator/StatusDot';
import LeaderboardPanel from '../components/moderator/LeaderboardPanel';
import { loadPlayDraft } from '../utils/draft';
import { connectControlSocket } from '../socket';
import { featureFlags } from '../config/features';

const DEFAULT_ROOM_CODE = featureFlags.singleSessionRoomCode || 'MAIN';
const SINGLE_SESSION_MODE = featureFlags.singleSessionMode;

type AnswersState = {
  answers: Record<string, (AnswerEntry & { answer?: unknown })>;
  teams: Record<string, { name: string; isReady?: boolean }>;
  solution?: string;
};

type Phase = 'setup' | 'question' | 'evaluating' | 'final';
type ViewPhase = 'pre' | 'lobby' | 'intro' | 'quiz';
type LeaderboardRun = { quizId: string; date: string; winners: string[]; scores?: Record<string, number> };
type NextActionHintDetails = { hotkey: string; label: string; detail: string; context?: string };

const card: React.CSSProperties = {
  background: 'rgba(10,14,24,0.92)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  padding: 16,
  boxShadow: '0 14px 32px rgba(0,0,0,0.32)',
  backdropFilter: 'blur(10px)',
  overflow: 'hidden'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#0f172a',
  color: '#e5e7eb',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  fontWeight: 600
};

const timerButtonStyle: React.CSSProperties = {
  ...inputStyle,
  width: 90,
  padding: '8px 10px',
  overflow: 'hidden',
  borderRadius: 12
};

const statChip: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 9999,
  padding: '6px 10px',
  fontSize: 12,
  color: '#cbd5e1',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  lineHeight: 1
};

const actionWrap: React.CSSProperties = {
  background: 'rgba(12,16,26,0.82)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14,
  padding: 12,
  boxShadow: '0 12px 26px rgba(0,0,0,0.28)',
  backdropFilter: 'blur(10px)',
  overflow: 'hidden'
};

const pillStyle = (tone: 'setup' | 'live' | 'eval' | 'final'): React.CSSProperties => {
  const map = {
    setup: { bg: 'rgba(99,229,255,0.12)', border: 'rgba(99,229,255,0.4)', color: '#7dd3fc' },
    live: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.4)', color: '#86efac' },
    eval: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.4)', color: '#fcd34d' },
    final: { bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.4)', color: '#7dd3fc' }
  } as const;
  const p = map[tone];
  return {
    padding: '6px 10px',
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: '0.06em',
    background: p.bg,
    border: `1px solid ${p.border}`,
    color: p.color,
    textTransform: 'uppercase'
  };
};

const pill = (text: string, tone: 'setup' | 'live' | 'eval' | 'final') => <span style={pillStyle(tone)}>{text}</span>;

const buildQrUrl = (url: string, size = 180) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const COZY_BLITZ_MIN = 3;

const isCozyPlayableQuiz = (quiz: QuizTemplate): boolean => {
  const questionCount = Array.isArray(quiz.questionIds) ? quiz.questionIds.length : 0;
  const blitzCount = quiz.blitz?.pool?.length ?? 0;
  return questionCount === 20 && blitzCount >= COZY_BLITZ_MIN;
};

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!target) return false;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toUpperCase();
  return TYPING_TAGS.has(tagName);
};

function ModeratorPage(): React.ReactElement {
  const draftTheme = loadPlayDraft()?.theme;
  const getStoredRoom = () => {
    if (SINGLE_SESSION_MODE) return DEFAULT_ROOM_CODE;
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('moderatorRoom') || '';
  };
  const [roomCode, setRoomCode] = useState<string>(() => getStoredRoom());
  const [roomInput, setRoomInput] = useState<string>(() => getStoredRoom());
  const [language, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('moderatorLanguage');
    return saved === 'de' || saved === 'en' || saved === 'both' ? (saved as Language) : 'de';
  });
  const [question, setQuestion] = useState<AnyQuestion | null>(null);
  const [meta, setMeta] = useState<{ globalIndex?: number; globalTotal?: number; categoryKey?: string } | null>(null);
  const [answers, setAnswers] = useState<AnswersState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(() => {
    const saved = localStorage.getItem('moderatorTimerSeconds');
    return saved ? Number(saved) || 30 : 30;
  });
  const [statsView, setStatsView] = useState<'runs' | 'question'>('runs');
  const [health, setHealth] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [phase, setPhase] = useState<Phase>('setup');
  const [viewPhase, setViewPhase] = useState<ViewPhase>('pre');
  const [userViewPhase, setUserViewPhase] = useState<ViewPhase | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRun[]>([]);
  const [potatoThemeInput, setPotatoThemeInput] = useState('');
  const [potatoBanDrafts, setPotatoBanDrafts] = useState<Record<string, string>>({});
  const [potatoAnswerInput, setPotatoAnswerInput] = useState('');
  const [potatoWinnerDraft, setPotatoWinnerDraft] = useState('');
  const [blitzThemeInput, setBlitzThemeInput] = useState('');
  const [blitzBanDrafts, setBlitzBanDrafts] = useState<Record<string, string>>({});
  const [blitzPickDraft, setBlitzPickDraft] = useState('');
  const [rundlaufBanDraft, setRundlaufBanDraft] = useState('');
  const [rundlaufPickDraft, setRundlaufPickDraft] = useState('');
  const [countdownTick, setCountdownTick] = useState(0);
  const lastReportedQuestionId = React.useRef<string | null>(null);
  const [slotHoldMs, setSlotHoldMs] = useState(2400);
  const [slotExitMs, setSlotExitMs] = useState(1200);
  const [actionState, setActionState] = useState<{
    quiz: boolean;
    next: boolean;
    lock: boolean;
    timerStart: boolean;
    timerStop: boolean;
    reveal: boolean;
  }>({ quiz: false, next: false, lock: false, timerStart: false, timerStop: false, reveal: false });
  const [quizzes, setQuizzes] = useState<QuizTemplate[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string>('');
  const [creatingSession, setCreatingSession] = useState(false);
  const [showJoinScreen, setShowJoinScreen] = useState(false);
  const [showSessionSetup, setShowSessionSetup] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const singleActionMode = featureFlags.isCozyMode;
  // TODO(LEGACY): Potato is retired in Cozy60; keep backend handlers hidden for now.
  const showPotatoUI = false;

  const controlSocketRef = React.useRef<ReturnType<typeof connectControlSocket> | null>(null);
  const {
    currentQuestion: socketQuestion,
    questionMeta: socketMeta,
    answers: socketAnswers,
    teams: socketTeams,
    solution: socketSolution,
    questionPhase: socketQuestionPhase,
    scores: socketScores,
    potato: socketPotato,
    blitz,
    rundlauf: socketRundlauf,
    gameState: socketGameState,
    questionProgress: socketQuestionProgress,
    warnings: socketWarnings,
    timerEndsAt: socketTimerEndsAt,
    teamsConnected: socketTeamsConnected,
    teamStatus: socketTeamStatus,
    emit: socketEmit,
    config: socketConfig,
    nextStage: socketNextStage,
    scoreboardOverlayForced: socketScoreboardOverlayForced
  } = useQuizSocket(roomCode);
  const potato: PotatoState | null = showPotatoUI ? socketPotato ?? null : null;
  const rundlauf: RundlaufState | null = socketRundlauf ?? null;
  const normalizedGameState: CozyGameState = socketGameState ?? 'LOBBY';
  const nextStage = socketNextStage ?? null;
  const gameStateInfoMap: Record<CozyGameState, { label: string; hint: string; tone: 'setup' | 'live' | 'eval' | 'final' }> = {
    LOBBY: { label: 'Lobby', hint: 'Teams joinen gerade', tone: 'setup' },
    INTRO: { label: 'Intro', hint: 'Intro/Regeln', tone: 'setup' },
    QUESTION_INTRO: { label: 'Frage intro', hint: 'Neue Frage startet', tone: 'live' },
    Q_ACTIVE: { label: 'Frage aktiv', hint: 'Antwortphase lÃ¤uft', tone: 'live' },
    Q_LOCKED: { label: 'Gesperrt', hint: 'Host kann auflÃ¶sen', tone: 'eval' },
    Q_REVEAL: { label: 'Reveal', hint: 'Antworten werden gezeigt', tone: 'eval' },
    SCOREBOARD: { label: 'Scoreboard', hint: 'Zwischenstand wird gezeigt', tone: 'eval' },
    SCOREBOARD_PRE_BLITZ: { label: 'Scoreboard', hint: 'Standings vor Fotoblitz', tone: 'eval' },
    SCOREBOARD_PAUSE: { label: 'Pause', hint: 'Kurze Pause/im Scoreboard', tone: 'eval' },
    BLITZ: { label: 'Blitz Battle', hint: 'Schnelle Sets laufen', tone: 'live' },
    BLITZ_READY: { label: 'Fotoblitz bereit', hint: 'Teams machen sich bereit', tone: 'live' },
    BLITZ_BANNING: { label: 'Fotoblitz Auswahl', hint: 'Teams bannen/waehlen', tone: 'eval' },
    BLITZ_SET_INTRO: { label: 'Fotoblitz Intro', hint: 'Naechstes Set', tone: 'live' },
    BLITZ_PLAYING: { label: 'Fotoblitz', hint: 'Set laeuft', tone: 'live' },
    BLITZ_SET_END: { label: 'Fotoblitz Ende', hint: 'Set beendet', tone: 'eval' },
    BLITZ_SCOREBOARD: { label: 'Fotoblitz Scoreboard', hint: 'Standings nach Fotoblitz', tone: 'eval' },
    BLITZ_PAUSE: { label: 'Fotoblitz Pause', hint: 'Pause vor Frage 11', tone: 'eval' },
    POTATO: { label: 'Heisse Kartoffel', hint: 'Finale lÃ¤uft', tone: 'live' },
    AWARDS: { label: 'Awards', hint: 'Sieger werden gezeigt', tone: 'final' },
    RUNDLAUF_PAUSE: { label: 'Rundlauf Pause', hint: 'Rundlauf startet gleich', tone: 'eval' },
    RUNDLAUF_SCOREBOARD_PRE: { label: 'Rundlauf Scoreboard', hint: 'Standings vor Rundlauf', tone: 'eval' },
    RUNDLAUF_CATEGORY_SELECT: { label: 'Rundlauf Auswahl', hint: 'Kategorien waehlen', tone: 'eval' },
    RUNDLAUF_ROUND_INTRO: { label: 'Rundlauf Intro', hint: 'Runde wird gestartet', tone: 'live' },
    RUNDLAUF_PLAY: { label: 'Rundlauf', hint: 'Teams antworten reihum', tone: 'live' },
    RUNDLAUF_ROUND_END: { label: 'Rundlauf Ende', hint: 'Runde beendet', tone: 'eval' },
    RUNDLAUF_SCOREBOARD_FINAL: { label: 'Rundlauf Scoreboard', hint: 'Rundlauf abgeschlossen', tone: 'final' },
    SIEGEREHRUNG: { label: 'Siegerehrung', hint: 'Finale Anzeige', tone: 'final' }
  };
  const stateInfo = gameStateInfoMap[normalizedGameState] ?? gameStateInfoMap.LOBBY;
  const changeViewPhase = (phase: ViewPhase) => {
    setUserViewPhase(phase);
    setViewPhase(phase);
  };

  useEffect(() => {
    if (SINGLE_SESSION_MODE || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('roomCode');
    if (code) {
      setRoomCode(code.toUpperCase());
      setRoomInput(code.toUpperCase());
    }
  }, []);
  useEffect(() => {
    if (!SINGLE_SESSION_MODE || typeof window === 'undefined') return;
    localStorage.setItem('moderatorRoom', DEFAULT_ROOM_CODE);
  }, []);


  useEffect(() => {
    const socket = connectControlSocket();
    controlSocketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);

  const connectedTeams = socketTeamsConnected ?? Object.keys(answers?.teams || {}).length;
  const answersCount = Object.keys(answers?.answers || {}).length;
  const teamsCount = connectedTeams || Object.keys(answers?.teams || {}).length;
  const unreviewedCount = Object.values(answers?.answers || {}).filter((a) => (a as any).isCorrect === undefined).length;
  const scoreboard = useMemo(
    () => (socketScores ? [...socketScores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) : []),
    [socketScores]
  );
  const scoreboardOverlayForced = socketScoreboardOverlayForced ?? false;
  const questionProgressSnapshot =
    socketQuestionProgress ??
    (meta
      ? {
          asked: meta.globalIndex ?? (question ? 1 : 0),
          total: meta.globalTotal ?? 20
        }
      : { asked: question ? 1 : 0, total: 20 });
  const askedCount = questionProgressSnapshot?.asked ?? meta?.globalIndex ?? (question ? 1 : 0);
  const totalQuestions = questionProgressSnapshot?.total ?? meta?.globalTotal ?? 20;
  const isScoreboardState =
    socketGameState === 'SCOREBOARD' ||
    socketGameState === 'SCOREBOARD_PRE_BLITZ' ||
    socketGameState === 'BLITZ_SCOREBOARD';
  const isScoreboardPauseState = socketGameState === 'SCOREBOARD_PAUSE' || socketGameState === 'BLITZ_PAUSE';
  const teamLookup = useMemo(() => {
    const map: Record<string, { name: string; score: number }> = {};
    scoreboard.forEach((entry) => {
      map[entry.id] = { name: entry.name, score: entry.score ?? 0 };
    });
    Object.entries(answers?.teams || {}).forEach(([id, team]) => {
      map[id] = { name: team?.name ?? map[id]?.name ?? 'Team', score: map[id]?.score ?? (team as any)?.score ?? 0 };
    });
    return map;
  }, [answers, scoreboard]);
  const potatoActiveTeamName = potato?.activeTeamId ? teamLookup[potato.activeTeamId]?.name || potato?.activeTeamId : null;
  const blitzPhase = blitz?.phase ?? 'IDLE';
  const potatoPhase = potato?.phase ?? 'IDLE';
  const potatoDeadline = potato?.deadline ?? null;
  const potatoTimeLeft = useMemo(() => {
    if (!potatoDeadline) return null;
    return Math.max(0, Math.ceil((potatoDeadline - Date.now()) / 1000));
  }, [potatoDeadline, countdownTick]);
  const potatoRoundsTotal = potato?.selectedThemes?.length ?? 0;
  const potatoDeadlinePassed = potatoTimeLeft !== null && potatoTimeLeft <= 0;
  const potatoConflict = potato?.pendingConflict ?? null;
  const potatoRoundIndex = potato?.roundIndex ?? -1;
  const potatoFirstRoundPending = potatoPhase === 'ROUND_END' && potatoRoundIndex < 0;
  const potatoAllRoundsComplete =
    potatoPhase === 'ROUND_END' && potatoRoundsTotal > 0 && potatoRoundIndex >= potatoRoundsTotal - 1;
  const hasWinnerDraft = Boolean(potatoWinnerDraft && potatoWinnerDraft.trim());
  const potatoAutopilotEnabled = socketConfig?.potatoAutopilot ?? true;
  const potatoTimeoutAutostrikeEnabled = socketConfig?.potatoTimeoutAutostrike ?? false;
  const showPotatoConfigBadges = socketGameState === 'POTATO';
  const blitzDeadline = blitz?.deadline ?? null;
  const blitzTimeLeft = useMemo(() => {
    if (!blitzDeadline) return null;
    return Math.max(0, Math.ceil((blitzDeadline - Date.now()) / 1000));
  }, [blitzDeadline, countdownTick]);
  const rundlaufDeadline = rundlauf?.deadline ?? null;
  const rundlaufTimeLeft = useMemo(() => {
    if (!rundlaufDeadline) return null;
    return Math.max(0, Math.ceil((rundlaufDeadline - Date.now()) / 1000));
  }, [rundlaufDeadline, countdownTick]);
  const isRundlaufState = normalizedGameState.startsWith('RUNDLAUF') || normalizedGameState === 'SIEGEREHRUNG';
  const isBlitzState = normalizedGameState === 'BLITZ' || normalizedGameState.startsWith('BLITZ_');
  const blitzSetTotal = blitz?.selectedThemes?.length ?? 0;
  const blitzSetIndex = blitz?.setIndex ?? -1;
  const blitzSelectedCount = blitz?.selectedThemes?.length ?? 0;
  const blitzResultsCount = Object.keys(blitz?.results ?? {}).length;
  const questionTimerSecondsLeft = useMemo(() => {
    if (!socketTimerEndsAt) return null;
    return Math.max(0, Math.ceil((socketTimerEndsAt - Date.now()) / 1000));
  }, [socketTimerEndsAt, countdownTick]);

  function handleScoreboardAction() {
    if (!roomCode) return;
    if (normalizedGameState === 'AWARDS') {
      handleShowAwards();
      return;
    }
    if (!socketEmit) {
      setToast('Socket nicht bereit');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    socketEmit('host:toggleScoreboardOverlay', { roomCode }, (resp?: { ok?: boolean; error?: string }) => {
      if (!resp?.ok) {
        setToast(resp?.error || 'Aktion fehlgeschlagen');
        setTimeout(() => setToast(null), 2200);
      }
    });
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBlitzAction = () => {
      if (!roomCode) return;
      if (blitzPhase === 'IDLE') {
        if ((isScoreboardState || isScoreboardPauseState) && askedCount >= 10) {
          emitBlitzEvent('host:startBlitz');
        }
        return;
      }
      if (blitzPhase === 'READY') {
        emitBlitzEvent('host:blitzOpenSelection');
        return;
      }
      if (blitzPhase === 'BANNING') {
        if (blitz?.pinnedTheme || !blitz?.lastTeamId) {
          emitBlitzEvent('host:confirmBlitzThemes');
        }
        return;
      }
      if (blitzPhase === 'ROUND_INTRO') {
        return;
      }
      if (blitzPhase === 'PLAYING') {
        emitBlitzEvent('host:lockBlitzSet');
        return;
      }
      if (blitzPhase === 'SET_END') {
        if (!blitzResultsCount) {
          emitBlitzEvent('host:revealBlitzSet');
          return;
        }
        const moreSets = blitzSelectedCount === 0 || blitzSetIndex < blitzSelectedCount - 1;
        if (moreSets) {
          emitBlitzEvent('host:blitzStartSet');
        } else {
          emitBlitzEvent('host:finishBlitz');
        }
        return;
      }
      if (blitzPhase === 'DONE') {
        emitBlitzEvent('host:finishBlitz');
      }
    };

    const handlePotatoAction = () => {
      if (!roomCode) return;
      if (!potato || potatoPhase === 'IDLE') {
        if ((isScoreboardState || isScoreboardPauseState) && askedCount >= totalQuestions) {
          handlePotatoStart();
        }
        return;
      }
      if (potatoPhase === 'BANNING') {
        handlePotatoConfirmThemes();
        return;
      }
      if (potatoPhase === 'PLAYING') {
        if (potatoConflict) {
          handlePotatoStrike();
        } else {
          handlePotatoNextTurn();
        }
        return;
      }
      if (potatoPhase === 'ROUND_END') {
        if (hasWinnerDraft) {
          handlePotatoEndRound();
          return;
        }
        if (potatoFirstRoundPending) {
          handlePotatoStartRound();
          return;
        }
        if (!potatoAllRoundsComplete) {
          handlePotatoNextRound();
          return;
        }
        handlePotatoFinish();
        return;
      }
      if (potatoPhase === 'DONE') {
        handlePotatoFinish();
      }
    };

    const matchesHotkey = (event: KeyboardEvent, combos: string[]) => {
      const key = (event.key || '').toLowerCase();
      const code = (event.code || '').toLowerCase();
      return combos.some((combo) => {
        const normalized = combo.toLowerCase();
        return normalized === key || normalized === code;
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (!roomCode || showJoinScreen) return;

      if (matchesHotkey(event, ['f13', 'digit1', 'numpad1', '1'])) {
        event.preventDefault();
        handleNextQuestion();
        return;
      }
      if (!singleActionMode) {
        if (matchesHotkey(event, ['f14', 'digit2', 'numpad2', '2'])) {
          event.preventDefault();
          handleLockQuestion();
          return;
        }
        if (matchesHotkey(event, ['f15', 'digit3', 'numpad3', '3'])) {
          event.preventDefault();
          handleReveal();
          return;
        }
      }
      if (matchesHotkey(event, ['f16', 'digit4', 'numpad4', '4'])) {
        event.preventDefault();
        handleBlitzAction();
        return;
      }
      if (matchesHotkey(event, ['f17', 'digit5', 'numpad5', '5'])) {
        event.preventDefault();
        handlePotatoAction();
        return;
      }
      if (matchesHotkey(event, ['f18', 'digit6', 'numpad6', '6'])) {
        event.preventDefault();
        handleScoreboardAction();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    roomCode,
    showJoinScreen,
    potato,
    potatoPhase,
    potatoConflict,
    hasWinnerDraft,
    potatoFirstRoundPending,
    potatoAllRoundsComplete,
    totalQuestions,
    blitzPhase,
    blitzResultsCount,
    blitzSelectedCount,
    blitzSetIndex,
    isScoreboardState,
    isScoreboardPauseState,
    askedCount,
    normalizedGameState,
    socketEmit,
    handleScoreboardAction,
    handlePotatoStart,
    handlePotatoConfirmThemes,
    handlePotatoNextTurn,
    handlePotatoStrike,
    handlePotatoStartRound,
    handlePotatoEndRound,
    handlePotatoNextRound,
    handlePotatoFinish,
    emitBlitzEvent,
    handleNextQuestion,
    handleLockQuestion,
    handleReveal,
    singleActionMode
  ]);


  useEffect(() => {
    if (!roomCode) {
      setShowJoinScreen(false);
    }
  }, [roomCode]);
  useEffect(() => {
    if (showSessionSetup || showJoinScreen || !roomCode) {
      setShowSettingsPanel(false);
    }
  }, [showSessionSetup, showJoinScreen, roomCode]);





  // Load initial question + question list (for meta)
  useEffect(() => {
    const savedQuiz = localStorage.getItem('moderatorSelectedQuiz');
    const savedLang = localStorage.getItem('moderatorLanguage');
    if (savedLang === 'de' || savedLang === 'en' || savedLang === 'both') setLang(savedLang);
    if (savedQuiz) setSelectedQuiz((prev) => prev || savedQuiz);
    const loadQuizzes = async () => {
      try {
        const [res, pub] = await Promise.all([fetchQuizzes(), listPublishedQuizzes().catch(() => ({ quizzes: [] }))]);
        const merged: QuizTemplate[] = [
          ...(res.quizzes || []),
          ...(pub.quizzes || []).map((q) => ({ id: q.id, name: `${q.name} (Published)`, mode: 'ordered', questionIds: q.questionIds }))
        ];
        const filtered = featureFlags.showLegacyPanels ? merged : merged.filter(isCozyPlayableQuiz);
        setQuizzes(filtered);
        if (filtered.length) {
          setSelectedQuiz((prev) => {
            if (prev) return prev;
            const fallback = savedQuiz && filtered.find((q) => q.id === savedQuiz)?.id;
            return fallback || filtered[0]?.id || '';
          });
        }
      } catch {
        // ignore
      }
    };
    loadQuizzes();
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    localStorage.setItem('moderatorRoom', roomCode);
    const load = async () => {
      try {
        const res = await fetchCurrentQuestion(roomCode);
        setQuestion(res.question);
        setMeta(res.meta ?? null);
        const hasQuestion = Boolean(res.question);
        setPhase(hasQuestion ? 'question' : 'setup');
        setViewPhase(userViewPhase ?? (hasQuestion ? 'quiz' : 'pre'));
        await fetchQuestions(); // just to warm cache
      } catch (err) {
        setToast((err as Error).message);
      }
    };
    load();
  }, [roomCode, userViewPhase]);

  // Socket updates: separate effects to avoid re-running on every render
  useEffect(() => {
    if (socketQuestion === undefined) return;
    const nextQuestion = socketQuestion ?? null;
    setQuestion(nextQuestion);
    const hasQuestion = Boolean(nextQuestion);
    setPhase(hasQuestion ? 'question' : 'setup');
    if (hasQuestion) {
      setViewPhase(userViewPhase ?? 'quiz');
    } else if (!userViewPhase) {
      setViewPhase('pre');
    }
  }, [socketQuestion, userViewPhase]);

  useEffect(() => {
    if (socketMeta !== undefined) {
      setMeta(socketMeta ?? null);
    }
  }, [socketMeta]);

  useEffect(() => {
    if (socketAnswers || socketTeams || socketSolution) {
      setAnswers((prev) => ({
        answers: socketAnswers ?? prev?.answers ?? {},
        teams: socketTeams ?? prev?.teams ?? {},
        solution: socketSolution ?? prev?.solution
      }));
    }
  }, [socketAnswers, socketTeams, socketSolution]);

  useEffect(() => {
    if (socketQuestionPhase === 'evaluated') setPhase('evaluating');
    if (socketQuestionPhase === 'revealed') setPhase('final');
  }, [socketQuestionPhase]);

  // Auto-Stats bei Reveal
  useEffect(() => {
    if (phase !== 'final' || !question) return;
    if (lastReportedQuestionId.current === question.id) return;
    lastReportedQuestionId.current = question.id;
    const total = Object.keys(answers?.answers || {}).length;
    const correct = Object.values(answers?.answers || {}).filter((a: any) => a?.isCorrect).length;
    postQuestionStats({ questionId: question.id, total, correct }).catch(() => undefined);
  }, [phase, question, answers]);

  // Sync Beamer to lobby when Moderator switches to lobby
  useEffect(() => {
    if (viewPhase === 'lobby' && roomCode) {
      socketEmit?.('beamer:show-rules', roomCode);
    }
  }, [viewPhase, roomCode, socketEmit]);

  useEffect(() => {
    fetchLeaderboard()
      .then((res) => setLeaderboard(res.runs || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const id = window.setInterval(() => setCountdownTick((tick) => tick + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  const doAction = async (fn: () => Promise<any>, msg?: string) => {
    try {
      await fn();
      if (msg) setToast(msg);
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      setTimeout(() => setToast(null), 2500);
    }
  };

  async function loadCurrentQuestion() {
    if (!roomCode) return;
    try {
      const res = await fetchCurrentQuestion(roomCode);
      setQuestion(res.question ?? null);
      setMeta(res.meta ?? null);
      const hasQuestion = Boolean(res.question);
      setPhase(hasQuestion ? 'question' : 'setup');
      if (hasQuestion) {
        setViewPhase(userViewPhase ?? 'quiz');
      } else if (!userViewPhase) {
        setViewPhase('pre');
      }
    } catch (err) {
      setToast((err as Error).message);
    }
  }

  async function loadAnswers() {
    if (!roomCode) return;
    try {
      const res = await fetchAnswers(roomCode);
      setAnswers({
        answers: res.answers ?? {},
        teams: res.teams ?? {},
        solution: res.solution
      });
    } catch (err) {
      setToast((err as Error).message);
    }
  }

  const handleRoomConnect = () => {
    if (SINGLE_SESSION_MODE) {
      setRoomCode(DEFAULT_ROOM_CODE);
      setRoomInput(DEFAULT_ROOM_CODE);
      if (typeof window !== 'undefined') {
        localStorage.setItem('moderatorRoom', DEFAULT_ROOM_CODE);
      }
      setShowJoinScreen(false);
      return;
    }
    const code = roomInput.trim().toUpperCase();
    if (!code) {
      setToast('Roomcode fehlt');
      return;
    }
    setRoomCode(code);
    setShowJoinScreen(false);
    localStorage.setItem('moderatorRoom', code);
  };
  const handleRoomReset = () => {
    if (SINGLE_SESSION_MODE) {
      setShowSessionSetup(true);
      setShowJoinScreen(false);
      return;
    }
    setRoomCode('');
    setRoomInput('');
    localStorage.removeItem('moderatorRoom');
    setShowJoinScreen(false);
  };

  const handleCreateSession = () => {
    if (!selectedQuiz) {
      setToast('Bitte zuerst ein Quiz auswÃ¤hlen');
      return;
    }
    const socket = controlSocketRef.current;
    if (!socket) return;
    setCreatingSession(true);
    socket.emit(
      'host:createSession',
      { quizId: selectedQuiz, language },
      (resp?: { ok: boolean; roomCode?: string; error?: string }) => {
        setCreatingSession(false);
        if (!resp?.ok || !resp.roomCode) {
          setToast(resp?.error || 'Session konnte nicht erstellt werden');
          return;
        }
        const nextCode = resp.roomCode || DEFAULT_ROOM_CODE;
        setRoomCode(nextCode);
        setRoomInput(nextCode);
        localStorage.setItem('moderatorRoom', nextCode);
        setShowJoinScreen(true);
        setShowSessionSetup(false);
      }
    );
  };

  const handleOpenBeamerLink = () => {
    if (!joinLinks?.beamer) {
      setToast('Beamer-Link fehlt');
      setTimeout(() => setToast(null), 2200);
      return;
    }
    window.open(joinLinks.beamer, '_blank', 'noopener,noreferrer');
  };

  const handleCopyTeamLink = async () => {
    if (!joinLinks?.team) {
      setToast('Team-Link fehlt');
      setTimeout(() => setToast(null), 2200);
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(joinLinks.team);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = joinLinks.team;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setToast('Team-Link kopiert');
    } catch (err) {
      setToast('Kopieren nicht moeglich');
    } finally {
      setTimeout(() => setToast(null), 2200);
    }
  };

  const sendHostCommand = (
    eventName: 'host:next' | 'host:lock' | 'host:reveal',
    onSuccess?: () => void
  ) => {
    if (!roomCode) {
      setToast('Kein aktiver Roomcode');
      return;
    }
    if (!socketEmit) {
      setToast('Socket nicht bereit');
      return;
    }
    const keyMap = {
      'host:next': 'next',
      'host:lock': 'lock',
      'host:reveal': 'reveal'
    } as const;
    const key = keyMap[eventName];
    setActionState((prev) => ({ ...prev, [key]: true }));
    socketEmit(eventName, { roomCode }, (resp?: { ok: boolean; error?: string }) => {
      setActionState((prev) => ({ ...prev, [key]: false }));
      if (!resp?.ok) {
        setToast(resp?.error || 'Aktion fehlgeschlagen');
        return;
      }
      onSuccess?.();
    });
  };

  function handleNextQuestion() {
    sendHostCommand('host:next', async () => {
      await loadCurrentQuestion();
      await loadAnswers();
    });
  }

  function handleLockQuestion() {
    sendHostCommand('host:lock', async () => {
      await loadAnswers();
    });
  }

  function handleReveal() {
    sendHostCommand('host:reveal', async () => {
      await loadAnswers();
    });
  }

  function emitPotatoEvent(
    eventName:
      | 'host:startPotato'
      | 'host:banPotatoTheme'
      | 'host:confirmPotatoThemes'
      | 'host:potatoStartRound'
      | 'host:potatoSubmitTurn'
      | 'host:potatoStrikeActive'
      | 'host:potatoNextTurn'
      | 'host:potatoEndRound'
      | 'host:potatoNextRound'
      | 'host:potatoFinish'
      | 'host:potatoOverrideAttempt',
    payload?: Record<string, unknown>,
    onSuccess?: () => void
  ) {
    if (!roomCode) {
      setToast('Roomcode fehlt');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    if (!socketEmit) {
      setToast('Socket nicht bereit');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    socketEmit(eventName, { roomCode, ...(payload || {}) }, (resp?: { ok?: boolean; error?: string }) => {
      if (!resp?.ok) {
        setToast(resp?.error || 'Aktion fehlgeschlagen');
        setTimeout(() => setToast(null), 2200);
        return;
      }
      onSuccess?.();
    });
  }

  function handlePotatoStart() {
    const text = potatoThemeInput.trim();
    emitPotatoEvent('host:startPotato', text ? { themesText: text } : {}, () => setPotatoThemeInput(''));
  }

  function handlePotatoBan(teamId: string) {
    const selection = (potatoBanDrafts[teamId] || '').trim();
    if (!selection) {
      setToast('Bitte zuerst ein Thema auswÃ¤hlen');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    emitPotatoEvent('host:banPotatoTheme', { teamId, theme: selection }, () =>
      setPotatoBanDrafts((prev) => ({ ...prev, [teamId]: '' }))
    );
  }

  function handlePotatoConfirmThemes() {
    emitPotatoEvent('host:confirmPotatoThemes');
  }
  function handlePotatoStartRound() {
    emitPotatoEvent('host:potatoStartRound');
  }
  function handlePotatoNextRound() {
    emitPotatoEvent('host:potatoNextRound');
  }
  function handlePotatoFinish() {
    emitPotatoEvent('host:potatoFinish');
  }
  function handleShowAwards() {
    if (!roomCode) {
      setToast('Roomcode fehlt');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    if (!socketEmit) {
      setToast('Socket nicht bereit');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    socketEmit('host:showAwards', { roomCode }, (resp?: { ok?: boolean; error?: string }) => {
      if (!resp?.ok) {
        setToast(resp?.error || 'Aktion fehlgeschlagen');
        setTimeout(() => setToast(null), 2200);
      }
    });
  }
  function handlePotatoNextTurn() {
    emitPotatoEvent('host:potatoNextTurn');
  }
  function handlePotatoStrike() {
    emitPotatoEvent('host:potatoStrikeActive');
  }
  function handlePotatoEndRound() {
    emitPotatoEvent(
      'host:potatoEndRound',
      potatoWinnerDraft ? { winnerId: potatoWinnerDraft } : {},
      () => setPotatoWinnerDraft('')
    );
  }

  const handlePotatoSubmit = (
    verdict: 'correct' | 'strike',
    options?: { override?: boolean }
  ) => {
    if (verdict === 'correct') {
      const trimmed = potatoAnswerInput.trim();
      if (!trimmed) {
        setToast('Antwort fehlt');
        setTimeout(() => setToast(null), 2000);
        return;
      }
      emitPotatoEvent(
        'host:potatoSubmitTurn',
        { verdict, answer: trimmed, override: options?.override },
        () => setPotatoAnswerInput('')
      );
      return;
    }
    emitPotatoEvent('host:potatoSubmitTurn', { verdict });
  };

  function handlePotatoOverrideAttempt(action: 'accept' | 'acceptDuplicate' | 'reject') {
    const attemptId = potato?.lastAttempt?.id;
    if (!attemptId) {
      setToast('Kein Versuch zum Uebersteuern');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    emitPotatoEvent('host:potatoOverrideAttempt', { attemptId, action });
  }

  function emitBlitzEvent(
    eventName:
      | 'host:startBlitz'
      | 'host:banBlitzTheme'
      | 'host:confirmBlitzThemes'
      | 'host:blitzStartSet'
      | 'host:lockBlitzSet'
      | 'host:revealBlitzSet'
      | 'host:nextBlitzSet'
      | 'host:finishBlitz',
    payload?: Record<string, unknown>,
    onSuccess?: () => void
  ) {
    if (!roomCode) {
      setToast('Roomcode fehlt');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    if (!socketEmit) {
      setToast('Socket nicht bereit');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    socketEmit(eventName, { roomCode, ...(payload || {}) }, (resp?: { ok?: boolean; error?: string }) => {
      if (!resp?.ok) {
        setToast(resp?.error || 'Aktion fehlgeschlagen');
        setTimeout(() => setToast(null), 2200);
        return;
      }
      onSuccess?.();
    });
  }

  function emitRundlaufEvent(
    eventName:
      | 'host:rundlaufBanCategory'
      | 'host:rundlaufPickCategory'
      | 'host:rundlaufConfirmCategories'
      | 'host:rundlaufStartRound'
      | 'host:rundlaufMarkAnswer'
      | 'host:rundlaufEliminateTeam'
      | 'host:rundlaufNextTeam'
      | 'host:rundlaufEndRound',
    payload?: Record<string, unknown>,
    onSuccess?: () => void
  ) {
    if (!roomCode) {
      setToast('Roomcode fehlt');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    if (!socketEmit) {
      setToast('Socket nicht bereit');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    socketEmit(eventName, { roomCode, ...(payload || {}) }, (resp?: { ok?: boolean; error?: string }) => {
      if (!resp?.ok) {
        setToast(resp?.error || 'Aktion fehlgeschlagen');
        setTimeout(() => setToast(null), 2200);
        return;
      }
      onSuccess?.();
    });
  }

  function handleRundlaufBanCategory(categoryId: string) {
    if (!rundlauf?.topTeamId) {
      setToast('Platz 1 nicht verfuegbar');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    emitRundlaufEvent('host:rundlaufBanCategory', { teamId: rundlauf.topTeamId, categoryId }, () =>
      setRundlaufBanDraft('')
    );
  }

  function handleRundlaufPickCategory(categoryId: string) {
    if (!rundlauf?.lastTeamId) {
      setToast('Letzter Platz nicht verfuegbar');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    emitRundlaufEvent('host:rundlaufPickCategory', { teamId: rundlauf.lastTeamId, categoryId }, () =>
      setRundlaufPickDraft('')
    );
  }

  function handleRundlaufConfirm() {
    emitRundlaufEvent('host:rundlaufConfirmCategories');
  }

  function handleRundlaufStartRound() {
    emitRundlaufEvent('host:rundlaufStartRound');
  }

  function handleRundlaufMark(verdict: 'ok' | 'dup' | 'invalid') {
    const attemptId = rundlauf?.lastAttempt?.id;
    if (!attemptId) {
      setToast('Kein Versuch zum Bewerten');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    emitRundlaufEvent('host:rundlaufMarkAnswer', { attemptId, verdict });
  }

  function handleRundlaufEliminate(teamId: string | null) {
    if (!teamId) {
      setToast('Kein aktives Team');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    emitRundlaufEvent('host:rundlaufEliminateTeam', { teamId });
  }

  function handleRundlaufNextTeam() {
    emitRundlaufEvent('host:rundlaufNextTeam');
  }

  function handleRundlaufEndRound() {
    emitRundlaufEvent('host:rundlaufEndRound');
  }

  const structuralWarnings = useMemo(
    () => (socketWarnings || []).filter((entry): entry is string => Boolean(entry)),
    [socketWarnings]
  );

  const numericStats = useMemo(() => {
    if (!answers) return null;
    const values = Object.values(answers.answers)
      .map((a) => {
        const raw = (a as any).answer ?? (a as any).value;
        return typeof raw === 'number' ? raw : Number(raw);
      })
      .filter((v) => !Number.isNaN(v));
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = sorted[Math.floor(sorted.length / 2)];
    const avg = sorted.reduce((s, v, _, arr) => s + v / arr.length, 0);
    return { min, max, median, avg: Math.round(avg * 100) / 100, count: values.length };
  }, [answers]);

  const topTexts = useMemo(() => {
    if (!answers) return [];
    const freq: Record<string, number> = {};
    Object.values(answers.answers).forEach((a) => {
      const raw = (a as any).answer ?? (a as any).value;
      if (typeof raw === 'string') {
        const key = raw.trim() || '(leer)';
        freq[key] = (freq[key] || 0) + 1;
      }
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [answers]);

  const answerStats = useMemo(() => {
    if (!answers) return null;
    const total = Object.keys(answers.answers).length;
    const correct = Object.values(answers.answers).filter((a: any) => a?.isCorrect === true).length;
    const perOption: Record<string, number> = {};
    if (question?.mechanic === 'multipleChoice' && (question as any)?.options) {
      Object.values(answers.answers).forEach((a: any) => {
        const raw = a?.answer ?? a?.value;
        const key = raw !== undefined ? String(raw) : 'â€”';
        perOption[key] = (perOption[key] || 0) + 1;
      });
    }
    return { total, correct, perOption };
  }, [answers, question]);

  const submissionStatus = useMemo(() => {
    const hasTeamStatus = Boolean(socketTeamStatus?.length);
    const submittedIds = isBlitzState ? blitz?.submissions ?? [] : Object.keys(answers?.answers || {});
    const submittedSet = new Set(submittedIds);

    if (hasTeamStatus) {
      const connectedIds = (socketTeamStatus || [])
        .filter((team) => team.connected)
        .map((team) => team.id);
      const totalConnected = connectedIds.length;
      const submittedCount = isBlitzState
        ? connectedIds.filter((id) => submittedSet.has(id)).length
        : (socketTeamStatus || []).filter((team) => team.connected && team.submitted).length;
      const items = (socketTeamStatus || []).map((team) => ({
        id: team.id,
        name: team.name || 'Team',
        connected: team.connected,
        submitted: isBlitzState ? submittedSet.has(team.id) : team.submitted
      }));
      return { total: totalConnected, submittedCount, items };
    }

    const entries = Object.entries(teamLookup);
    const total = connectedTeams || entries.length || 0;
    const items =
      entries.length > 0
        ? entries.map(([id, info]) => ({
            id,
            name: info.name || 'Team',
            connected: Boolean(connectedTeams),
            submitted: submittedSet.has(id)
          }))
        : [];
    const submittedCount = Math.min(submittedSet.size, total || submittedSet.size);
    return { total, submittedCount, items };
  }, [teamLookup, answers, blitz?.submissions, normalizedGameState, connectedTeams, socketTeamStatus]);

  const nextActionHint = useMemo<NextActionHintDetails>(() => {
    const base: NextActionHintDetails = { hotkey: '1', label: 'WEITER', detail: 'Weiter' };
    switch (normalizedGameState) {
      case 'LOBBY':
        return { hotkey: '1', label: 'START', detail: 'Session beginnen', context: 'Teams joinen gerade' };
      case 'INTRO':
        return { hotkey: '1', label: 'WEITER', detail: 'Intro fortsetzen', context: 'Slides laufen' };
      case 'QUESTION_INTRO':
        return { hotkey: '1', label: 'WEITER', detail: 'Frage starten', context: 'Neue Frage kommt' };
      case 'Q_ACTIVE':
        return {
          hotkey: '2',
          label: 'SPERREN',
          detail: 'Antworten sperren',
          context: `Antworten ${submissionStatus.submittedCount}/${submissionStatus.total || '-'}`
        };
      case 'Q_LOCKED':
        return { hotkey: '3', label: 'AUFDECKEN', detail: 'Aufloesung zeigen', context: 'Antworten geprueft' };
      case 'Q_REVEAL':
        if (nextStage === 'BLITZ') return { hotkey: '1', label: 'WEITER', detail: 'Zu Blitz wechseln', context: 'Segment 1 beendet' };
        if (nextStage === 'POTATO') return { hotkey: '1', label: 'WEITER', detail: 'Finale starten', context: 'Segment 2 abgeschlossen' };
        return { hotkey: '1', label: 'WEITER', detail: 'Zur naechsten Frage', context: 'Reveal beendet' };
      case 'SCOREBOARD_PRE_BLITZ':
        return { hotkey: '1', label: 'WEITER', detail: 'Fotoblitz starten', context: 'Standings vor Fotoblitz' };
      case 'SCOREBOARD_PAUSE':
        if (nextStage === 'BLITZ') return { hotkey: '1', label: 'WEITER', detail: 'Blitz Battle starten', context: 'Scoreboard aktiv' };
        if (nextStage === 'POTATO') return { hotkey: '1', label: 'WEITER', detail: 'Heisse Kartoffel starten', context: 'Scoreboard aktiv' };
        if (nextStage === 'Q11') return { hotkey: '1', label: 'WEITER', detail: 'Segment 2 starten', context: 'Scoreboard aktiv' };
        return { ...base, context: 'Scoreboard aktiv' };
      case 'BLITZ':
      case 'BLITZ_READY':
      case 'BLITZ_BANNING':
      case 'BLITZ_SET_INTRO':
      case 'BLITZ_PLAYING':
      case 'BLITZ_SET_END':
      case 'BLITZ_SCOREBOARD':
      case 'BLITZ_PAUSE':
        return { hotkey: '1', label: 'WEITER', detail: 'Fotoblitz', context: `Set ${(blitz?.setIndex ?? -1) + 1}/3` };
      case 'POTATO':
        return {
          hotkey: '5',
          label: 'POTATO',
          detail: potatoPhase === 'PLAYING' ? `Team ${potatoActiveTeamName || 'Team'} am Zug` : 'Kontextaktion ausfuehren',
          context: `Autopilot ${potatoAutopilotEnabled ? 'AN' : 'AUS'}`
        };
      case 'AWARDS':
        return { hotkey: '1', label: 'WEITER', detail: 'Awards zeigen', context: 'Finale' };
      default:
        return base;
    }
  }, [
    normalizedGameState,
    nextStage,
    submissionStatus.submittedCount,
    submissionStatus.total,
    blitz?.phase,
    potatoPhase,
    potatoActiveTeamName,
    potatoAutopilotEnabled
  ]);

  const catKey = (question as any)?.category as keyof typeof categoryColors;
  const catColor = categoryColors[catKey] ?? '#6dd5fa';
  const catIcon = categoryIcons[catKey];
  const readyCount = useMemo(() => {
    const teams = Object.values(answers?.teams || {});
    const ready = teams.filter((t: any) => t?.isReady).length;
    return { ready, total: teams.length };
  }, [answers]);


  const joinScreenTeams = useMemo(() => {
    const source =
      (socketTeams && Object.keys(socketTeams).length > 0 ? socketTeams : answers?.teams) || {};
    return Object.values(source).sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
  }, [socketTeams, answers]);

  const joinLinks = useMemo(() => {
    const effectiveRoom = roomCode || (SINGLE_SESSION_MODE ? DEFAULT_ROOM_CODE : '');
    if (!effectiveRoom && !SINGLE_SESSION_MODE) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const normalizedOrigin = origin?.replace(/\/$/, '') || '';
    const buildPath = (path: string) =>
      SINGLE_SESSION_MODE ? `${normalizedOrigin}${path}` : `${normalizedOrigin}${path}?roomCode=${effectiveRoom}`;
    return {
      team: buildPath('/team'),
      beamer: buildPath('/beamer')
    };
  }, [roomCode]);






  const currentQuizName = quizzes.find((q) => q.id === selectedQuiz)?.name;
  const quizzesSorted = useMemo(() => {
    const isCozy = (quizId: string) => quizId.startsWith('cozy-quiz-60');
    return [...quizzes].sort((a, b) => {
      const cozyA = isCozy(a.id);
      const cozyB = isCozy(b.id);
      if (cozyA !== cozyB) return cozyA ? -1 : 1;
      const dateA = typeof a.meta?.date === 'number' ? (a.meta?.date as number) : 0;
      const dateB = typeof b.meta?.date === 'number' ? (b.meta?.date as number) : 0;
      if (dateA !== dateB) return dateB - dateA;
      return a.name.localeCompare(b.name);
    });
  }, [quizzes]);
  const phaseChip = (() => {
    const label =
      phase === 'question' ? 'Live' : phase === 'evaluating' ? 'Bewertung' : phase === 'final' ? 'Aufgeloest' : 'Bereit';
    const tone: 'setup' | 'live' | 'eval' | 'final' =
      phase === 'question' ? 'live' : phase === 'evaluating' ? 'eval' : phase === 'final' ? 'final' : 'setup';
    return pill(`Phase: ${label}`, tone);
  })();
  const phaseLabel =
    viewPhase === 'pre'
      ? 'Vor Quiz'
      : viewPhase === 'lobby'
      ? 'Lobby'
      : viewPhase === 'intro'
      ? 'Intro'
      : 'Quiz';

  const endQuizAndReport = async () => {
    try {
      const res = await fetchScoreboard(roomCode);
      const teams = res.teams || [];
      const sorted = [...teams].sort((a, b) => (b.score || 0) - (a.score || 0));
      const winners = sorted.slice(0, 3).map((t) => t.name);
      const scores: Record<string, number> = {};
      sorted.forEach((t) => {
        scores[t.name] = t.score || 0;
      });
      await postQuestionStats({ questionId: '__quiz_end__', total: teams.length, correct: teams.length }); // marker
      await postRunStats({
        quizId: selectedQuiz || roomCode,
        date: new Date().toISOString(),
        winners,
        scores
      });
      fetchLeaderboard()
        .then((res) => setLeaderboard(res.runs || []))
        .catch(() => undefined);
      setToast('Quiz-Stats gespeichert');
    } catch (err) {
      setToast('Quiz-Stats konnten nicht gespeichert werden');
    } finally {
      setTimeout(() => setToast(null), 2000);
    }
  };

  const renderActions = () => (
    <ActionButtons
      viewPhase={viewPhase}
      changeViewPhase={changeViewPhase}
      actionWrap={actionWrap}
      inputStyle={inputStyle}
      currentQuizName={currentQuizName}
      selectedQuiz={selectedQuiz}
      setSelectedQuiz={setSelectedQuiz}
      quizzes={quizzesSorted}
      roomCode={roomCode}
      timerSeconds={timerSeconds}
      actionState={actionState}
      setActionState={setActionState}
      doAction={doAction}
      setToast={setToast}
      primaryColor={draftTheme?.color}
      onNext={handleNextQuestion}
      onLock={handleLockQuestion}
      onReveal={handleReveal}
    />
  );

  const renderPotatoControls = () => {
    if (!showPotatoUI) return null;
    const shouldShow =
      Boolean(roomCode) && (potato || (meta?.globalIndex ?? 0) >= 19 || scoreboard.length > 0);
    if (!shouldShow) return null;
    const phase = potato?.phase ?? 'IDLE';
    const selectedThemes = potato?.selectedThemes ?? [];
    const banLimits = potato?.banLimits ?? {};
    const bans = potato?.bans ?? {};
    const pool = potato?.pool ?? [];
    const lives = potato?.lives ?? {};
    const turnOrder = potato?.turnOrder ?? [];
    const usedAnswers = potato?.usedAnswers ?? [];
    const isRoundEnd = phase === 'ROUND_END';
    const isPlaying = phase === 'PLAYING';
    const isBanning = phase === 'BANNING';
    const roundsPlayed = potato?.roundIndex ?? -1;
    const firstRoundPending = isRoundEnd && roundsPlayed < 0;
    const allRoundsComplete =
      isRoundEnd && potatoRoundsTotal > 0 && roundsPlayed >= potatoRoundsTotal - 1;
    const activeTeamName = potato?.activeTeamId ? teamLookup[potato.activeTeamId]?.name || potato.activeTeamId : null;
    const lastWinnerName = potato?.lastWinnerId ? teamLookup[potato.lastWinnerId]?.name || potato.lastWinnerId : null;
    const lastAttempt = potato?.lastAttempt ?? null;
    const lastAttemptTeamName = lastAttempt ? teamLookup[lastAttempt.teamId]?.name || lastAttempt.teamId : null;
    const relevantConflict =
      lastAttempt && potatoConflict && potatoConflict.answer === lastAttempt.text ? potatoConflict : null;
    const lastAttemptVerdictLabel = lastAttempt
      ? {
          ok: 'OK',
          dup: 'DUPLIKAT',
          invalid: 'UNGUELTIG',
          timeout: 'TIMEOUT',
          pending: 'PRUEFUNG'
        }[lastAttempt.verdict]
      : null;
    const lastAttemptTone = lastAttempt
      ? {
          ok: 'rgba(34,197,94,0.85)',
          dup: 'rgba(250,204,21,0.85)',
          invalid: 'rgba(248,113,113,0.85)',
          timeout: 'rgba(248,113,113,0.85)',
          pending: '#cbd5e1'
        }[lastAttempt.verdict]
      : '#cbd5e1';
    const lastAttemptMessage = (() => {
      if (!lastAttempt) return null;
      if (lastAttempt.verdict === 'ok') return 'Automatisch akzeptiert.';
      if (lastAttempt.verdict === 'dup') {
        if (lastAttempt.reason === 'similar') {
          return `Sehr aehnlich zu ${relevantConflict?.conflictingAnswer || 'bestehender Antwort'}.`;
        }
        return `Schon genannt: ${relevantConflict?.conflictingAnswer || 'eine andere Antwort'}.`;
      }
      if (lastAttempt.verdict === 'invalid') {
        if (lastAttempt.reason === 'not-listed') return 'Nicht in der Themenliste.';
        if (lastAttempt.reason === 'empty') return 'Team hat nichts eingegeben.';
        if (lastAttempt.reason === 'rejected') return 'Bereits abgelehnt.';
        return 'Ungueltig.';
      }
      if (lastAttempt.verdict === 'timeout') return 'Zeitlimit ueberschritten.';
      return 'Wird aktuell geprueft.';
    })();
    const canOverrideAttempt = Boolean(lastAttempt && lastAttempt.verdict !== 'ok');
    return (
      <section style={{ ...card, marginTop: 12 }}>
        {/* TODO(DESIGN_LATER): polish potato admin layout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: 14 }}>Finale Â· Heisse Kartoffel</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Phase: {phase}{' '}
              {potatoRoundsTotal > 0 && `| Runde ${(roundsPlayed >= 0 ? roundsPlayed + 1 : 0)}/${potatoRoundsTotal}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {potatoTimeLeft !== null && isPlaying && (
              <span
                style={{
                  ...statChip,
                  borderColor: 'rgba(248,113,113,0.45)',
                  color: '#fecaca',
                  background: 'rgba(248,113,113,0.12)'
                }}
              >
                Restzeit {potatoTimeLeft}s
              </span>
            )}
            {selectedThemes.length > 0 && (
              <span style={{ ...statChip, background: 'rgba(255,255,255,0.08)' }}>
                Themen: {selectedThemes.join(', ')}
              </span>
            )}
          </div>
        </div>
        {showPotatoConfigBadges && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <span
              style={{
                ...statChip,
                borderColor: potatoAutopilotEnabled ? 'rgba(34,197,94,0.45)' : 'rgba(248,113,113,0.45)',
                color: potatoAutopilotEnabled ? '#bbf7d0' : '#fecaca',
                background: potatoAutopilotEnabled ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)'
              }}
            >
              Autopilot: {potatoAutopilotEnabled ? 'AN' : 'AUS'}
            </span>
            <span
              style={{
                ...statChip,
                borderColor: potatoTimeoutAutostrikeEnabled ? 'rgba(251,191,36,0.4)' : 'rgba(148,163,184,0.4)',
                color: potatoTimeoutAutostrikeEnabled ? '#fcd34d' : '#cbd5e1',
                background: potatoTimeoutAutostrikeEnabled ? 'rgba(251,191,36,0.12)' : 'rgba(148,163,184,0.12)'
              }}
            >
              Timeout-Strike: {potatoTimeoutAutostrikeEnabled ? 'AN' : 'AUS'}
            </span>
          </div>
        )}

        <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
          {!potato && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>
                Nach Frage 20 kannst du hier die Heisse Kartoffel starten. Optional kannst du eigene Themen (eine pro Zeile)
                einfÃ¼gen, sonst nutzen wir das Standard-Set.
              </div>
              <textarea
                value={potatoThemeInput}
                onChange={(e) => setPotatoThemeInput(e.target.value)}
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                placeholder="Optional: Eigene Themen pro Zeile"
              />
              <button
                style={{
                  ...inputStyle,
                  background: 'linear-gradient(135deg, #fbbf24, #fb923c)',
                  border: '1px solid rgba(251,146,60,0.5)',
                  color: '#1f1305',
                  cursor: 'pointer'
                }}
                onClick={handlePotatoStart}
              >
                FINAL: HEISSE KARTOFFEL STARTEN
              </button>
            </div>
          )}

          {potato && isBanning && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>Bans setzen Â· {pool.length} Themen noch frei</div>
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  fontSize: 12,
                  color: '#cbd5e1'
                }}
              >
                {pool.map((theme) => (
                  <span key={theme} style={statChip}>
                    {theme}
                  </span>
                ))}
                {pool.length === 0 && <span style={{ color: '#94a3b8' }}>Keine Themen mehr verfÃ¼gbar</span>}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {scoreboard.map((team) => {
                  const limit = banLimits[team.id] ?? 0;
                  if (limit <= 0) {
                    return (
                      <div
                        key={team.id}
                        style={{
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 12,
                          padding: 10,
                          opacity: 0.6
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{team.name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Keine Bans fÃ¼r dieses Team</div>
                      </div>
                    );
                  }
                  const used = bans[team.id]?.length ?? 0;
                  const exhausted = used >= limit;
                  return (
                    <div
                      key={team.id}
                      style={{
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 12,
                        padding: 10,
                        display: 'grid',
                        gap: 6
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700 }}>{team.name}</div>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                          {used}/{limit} genutzt
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                        Bans: {bans[team.id]?.join(', ') || 'â€”'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <select
                          value={potatoBanDrafts[team.id] ?? ''}
                          onChange={(e) =>
                            setPotatoBanDrafts((prev) => ({ ...prev, [team.id]: e.target.value }))
                          }
                          disabled={exhausted || pool.length === 0}
                          style={{ ...inputStyle, flex: '1 1 220px', minWidth: 180 }}
                        >
                          <option value="">Thema wÃ¤hlen</option>
                          {pool.map((theme) => (
                            <option key={`${team.id}-${theme}`} value={theme}>
                              {theme}
                            </option>
                          ))}
                        </select>
                        <button
                          style={{
                            ...inputStyle,
                            width: 'auto',
                            background: exhausted ? 'rgba(15,23,42,0.35)' : 'rgba(37,99,235,0.2)',
                            border: '1px solid rgba(96,165,250,0.5)',
                            color: '#bfdbfe',
                            cursor: exhausted ? 'not-allowed' : 'pointer'
                          }}
                          disabled={exhausted}
                          onClick={() => handlePotatoBan(team.id)}
                        >
                          Bann setzen
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                style={{
                  ...inputStyle,
                  width: 'auto',
                  background: 'rgba(59,130,246,0.18)',
                  border: '1px solid rgba(59,130,246,0.4)',
                  color: '#bfdbfe',
                  cursor: 'pointer'
                }}
                onClick={handlePotatoConfirmThemes}
              >
                Themen auslosen und Reihenfolge festlegen
              </button>
            </div>
          )}

          {potato && isPlaying && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>
                Runde {Math.max(1, roundsPlayed + 1)} / {Math.max(1, potatoRoundsTotal)} Â· Thema:{' '}
                {potato.currentTheme || 'n/a'}
              </div>
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                Aktives Team: {activeTeamName || 'â€”'} Â· Antworten bisher: {usedAnswers.length}
              </div>
              {potatoDeadlinePassed && (
                <span
                  style={{
                    ...statChip,
                    borderColor: 'rgba(248,113,113,0.5)',
                    color: '#fecaca',
                    background: 'rgba(248,113,113,0.14)'
                  }}
                >
                  TIMEOUT â€“ bitte entscheiden
                </span>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {turnOrder.map((teamId) => (
                  <span
                    key={teamId}
                    style={{
                      ...statChip,
                      background: teamId === potato.activeTeamId ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)',
                      borderColor: teamId === potato.activeTeamId ? 'rgba(129,140,248,0.45)' : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    {teamLookup[teamId]?.name || teamId} Â· Leben {lives[teamId] ?? '-'}
                  </span>
                ))}
              </div>
              {usedAnswers.length > 0 && (
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Schon genannt</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {usedAnswers.map((answer, idx) => (
                      <span
                        key={`potato-used-admin-${idx}`}
                        style={{
                          ...statChip,
                          background: 'rgba(148,163,184,0.16)',
                          borderColor: 'rgba(148,163,184,0.35)',
                          color: '#e2e8f0'
                        }}
                      >
                        {answer}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {lastAttempt && (
                <div
                  style={{
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    padding: 12,
                    display: 'grid',
                    gap: 6,
                    background: 'rgba(15,23,42,0.55)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <div style={{ fontWeight: 700 }}>
                      {lastAttemptTeamName || lastAttempt.teamId} Â· {new Date(lastAttempt.at).toLocaleTimeString()}
                    </div>
                    {lastAttemptVerdictLabel && (
                      <span
                        style={{
                          ...statChip,
                          borderColor: lastAttemptTone,
                          color: lastAttemptTone,
                          background: 'transparent'
                        }}
                      >
                        {lastAttemptVerdictLabel}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Antwort: <strong>"{lastAttempt.text || 'â€”'}"</strong>
                  </div>
                  {relevantConflict && (
                    <div style={{ fontSize: 12, color: '#fde68a' }}>
                      Konflikt mit {relevantConflict.conflictingAnswer || 'anderer Antwort'}
                    </div>
                  )}
                  {lastAttemptMessage && <div style={{ fontSize: 13, color: '#cbd5e1' }}>{lastAttemptMessage}</div>}
                  {canOverrideAttempt && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        style={{
                          ...inputStyle,
                          width: 'auto',
                          background: 'rgba(34,197,94,0.25)',
                          border: '1px solid rgba(34,197,94,0.45)',
                          color: '#bbf7d0'
                        }}
                        onClick={() => handlePotatoOverrideAttempt('accept')}
                      >
                        Akzeptieren
                      </button>
                      {lastAttempt.verdict === 'dup' && (
                        <button
                          style={{
                            ...inputStyle,
                            width: 'auto',
                            background: 'rgba(250,204,21,0.18)',
                            border: '1px solid rgba(250,204,21,0.4)',
                            color: '#fef9c3'
                          }}
                          onClick={() => handlePotatoOverrideAttempt('acceptDuplicate')}
                        >
                          Duplikat akzeptieren
                        </button>
                      )}
                      <button
                        style={{
                          ...inputStyle,
                          width: 'auto',
                          background: 'rgba(248,113,113,0.18)',
                          border: '1px solid rgba(248,113,113,0.4)',
                          color: '#fecaca'
                        }}
                        onClick={() => handlePotatoOverrideAttempt('reject')}
                      >
                        Ablehnen
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {featureFlags.showLegacyPanels && (
                  <>
                    {/* TODO(LEGACY): Host typed potato answers fallback */}
                    <input
                      value={potatoAnswerInput}
                      onChange={(e) => setPotatoAnswerInput(e.target.value)}
                      placeholder="Antwort des Teams"
                      style={{ ...inputStyle, flex: '1 1 220px', minWidth: 200 }}
                    />
                    <button
                      style={{
                        ...inputStyle,
                        width: 'auto',
                        background: 'rgba(34,197,94,0.18)',
                        border: '1px solid rgba(34,197,94,0.45)',
                        color: '#bbf7d0',
                        cursor: 'pointer'
                      }}
                      onClick={() => handlePotatoSubmit('correct')}
                    >
                      Antwort OK
                    </button>
                    <button
                      style={{
                        ...inputStyle,
                        width: 'auto',
                        background: 'rgba(239,68,68,0.18)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        color: '#fecdd3',
                        cursor: 'pointer'
                      }}
                      onClick={() => handlePotatoSubmit('strike')}
                    >
                      Strike
                    </button>
                  </>
                )}
                <button style={{ ...inputStyle, width: 'auto' }} onClick={handlePotatoNextTurn}>
                  NÃ¤chster Zug
                </button>
                <button
                  style={{ ...inputStyle, width: 'auto', background: 'rgba(248,113,113,0.18)' }}
                  onClick={handlePotatoStrike}
                >
                  Leben -1
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  value={potatoWinnerDraft}
                  onChange={(e) => setPotatoWinnerDraft(e.target.value)}
                  style={{ ...inputStyle, flex: '1 1 200px', minWidth: 180 }}
                >
                  <option value="">Sieger wÃ¤hlen (optional)</option>
                  {turnOrder.map((teamId) => (
                    <option key={`winner-${teamId}`} value={teamId}>
                      {teamLookup[teamId]?.name || teamId}
                    </option>
                  ))}
                </select>
                <button
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    background: 'linear-gradient(135deg, #fcd34d, #f97316)',
                    color: '#1f1305',
                    cursor: 'pointer'
                  }}
                  onClick={handlePotatoEndRound}
                >
                  Runde abschlieÃŸen (+3 Punkte)
                </button>
              </div>
              {featureFlags.showLegacyPanels && potatoConflict && (
                <div
                  style={{
                    border: '1px solid rgba(248,113,113,0.45)',
                    borderRadius: 12,
                    padding: 10,
                    background: 'rgba(248,113,113,0.08)',
                    color: '#fecaca',
                    display: 'grid',
                    gap: 6
                  }}
                >
                  <div style={{ fontWeight: 800 }}>
                    {potatoConflict.type === 'duplicate' ? 'DUPLIKAT' : 'Ã„HNLICH'} erkannt
                  </div>
                  <div style={{ fontSize: 13 }}>
                    â€ž{potatoConflict.answer}â€œ
                    {potatoConflict.conflictingAnswer ? ` vs. â€ž${potatoConflict.conflictingAnswer}â€œ` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      style={{
                        ...inputStyle,
                        width: 'auto',
                        background: 'rgba(34,197,94,0.25)',
                        border: '1px solid rgba(34,197,94,0.5)',
                        color: '#bbf7d0'
                      }}
                      onClick={() => handlePotatoSubmit('correct', { override: true })}
                    >
                      Trotzdem akzeptieren
                    </button>
                    <button
                      style={{
                        ...inputStyle,
                        width: 'auto',
                        background: 'rgba(239,68,68,0.2)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        color: '#fecdd3'
                      }}
                      onClick={() => handlePotatoSubmit('strike')}
                    >
                      Strike vergeben
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {potato && isRoundEnd && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>
                {firstRoundPending
                  ? 'Bans erledigt Â· Themes bereit.'
                  : allRoundsComplete
                  ? 'Alle Runden abgeschlossen.'
                  : `Runde ${roundsPlayed + 1} beendet.`}
              </div>
              {lastWinnerName && (
                <div style={{ fontSize: 12, color: '#cbd5e1' }}>Sieger Runde: {lastWinnerName}</div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedThemes.map((theme, idx) => {
                  const done = idx <= roundsPlayed;
                  return (
                    <span
                      key={`theme-${theme}-${idx}`}
                      style={{
                        ...statChip,
                        background: done ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.05)',
                        borderColor: done ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'
                      }}
                    >
                      {theme}
                    </span>
                  );
                })}
                {selectedThemes.length === 0 && (
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Noch keine Themen ausgewÃ¤hlt</span>
                )}
              </div>
              {firstRoundPending && (
                <button
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    background: 'linear-gradient(135deg, #93c5fd, #3b82f6)',
                    color: '#0b1020',
                    cursor: 'pointer'
                  }}
                  onClick={handlePotatoStartRound}
                >
                  Runde 1 starten
                </button>
              )}
              {!firstRoundPending && !allRoundsComplete && (
                <button
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    background: 'linear-gradient(135deg, #6ee7b7, #3b82f6)',
                    color: '#0b1020',
                    cursor: 'pointer'
                  }}
                  onClick={handlePotatoNextRound}
                >
                  NÃ¤chste Runde starten
                </button>
              )}
              {allRoundsComplete && (
                <button
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    background: 'linear-gradient(135deg, #fcd34d, #f97316)',
                    color: '#1f1305',
                    cursor: 'pointer'
                  }}
                  onClick={handlePotatoFinish}
                >
                  Finale abschlieÃŸen Â· weiter zu Awards
                </button>
              )}
            </div>
          )}

          {potato && potato.phase === 'DONE' && (
            <div style={{ fontSize: 13, color: '#cbd5e1' }}>
              Heisse Kartoffel abgeschlossen. Warte auf Awards oder wechsle zum Scoreboard.
            </div>
          )}
        </div>

        {scoreboard.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Scoreboard</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {scoreboard.map((entry, idx) => (
                <div
                  key={`potato-score-${entry.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(0,0,0,0.3)'
                  }}
                >
                  <span style={{ fontWeight: 800 }}>{idx + 1}.</span>
                  <span>{entry.name}</span>
                  <span style={{ fontWeight: 800 }}>{entry.score ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderRundlaufControls = () => {
    if (!roomCode || !isRundlaufState || singleActionMode) return null;
    const pool = rundlauf?.pool ?? [];
    const bans = new Set(rundlauf?.bans ?? []);
    const pinned = rundlauf?.pinned ?? null;
    const selected = rundlauf?.selected ?? [];
    const selectedTitles = selected.map((entry) => entry.title);
    const roundIndex = rundlauf?.roundIndex ?? -1;
    const roundTotal = Math.max(1, selected.length || 3);
    const roundLabel = roundIndex >= 0 ? `${roundIndex + 1}/${roundTotal}` : `0/${roundTotal}`;
    const topTeamName = rundlauf?.topTeamId ? teamLookup[rundlauf.topTeamId]?.name || rundlauf.topTeamId : null;
    const lastTeamName = rundlauf?.lastTeamId ? teamLookup[rundlauf.lastTeamId]?.name || rundlauf.lastTeamId : null;
    const activeTeamName = rundlauf?.activeTeamId ? teamLookup[rundlauf.activeTeamId]?.name || rundlauf.activeTeamId : null;
    const currentCategoryTitle =
      rundlauf?.currentCategory?.title ??
      (roundIndex >= 0 ? selected[roundIndex]?.title : '') ??
      '';
    const lastAttempt = rundlauf?.lastAttempt ?? null;
    const lastAttemptTeamName = lastAttempt ? teamLookup[lastAttempt.teamId]?.name || lastAttempt.teamId : null;
    const lastAttemptLabel = lastAttempt
      ? {
          ok: 'OK',
          dup: 'DUP',
          invalid: 'INVALID',
          timeout: 'TIMEOUT',
          pending: 'PRUEFUNG'
        }[lastAttempt.verdict]
      : null;

    if (normalizedGameState === 'RUNDLAUF_PAUSE') {
      return (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Rundlauf Pause</div>
          <p style={{ color: '#cbd5e1' }}>Rundlauf startet gleich.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'linear-gradient(135deg, #63e5ff, #60a5fa)', color: '#0b1020' }}
              onClick={handleNextQuestion}
            >
              WEITER
            </button>
          </div>
        </section>
      );
    }

    if (normalizedGameState === 'RUNDLAUF_SCOREBOARD_PRE') {
      return (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Scoreboard vor Rundlauf</div>
          <p style={{ color: '#cbd5e1' }}>Platzierung entscheidet die Auswahl.</p>
          <div style={{ marginTop: 10 }}>{renderCompactScoreboard('Standings')}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'linear-gradient(135deg, #63e5ff, #60a5fa)', color: '#0b1020' }}
              onClick={handleNextQuestion}
            >
              WEITER
            </button>
          </div>
        </section>
      );
    }

    if (normalizedGameState === 'RUNDLAUF_CATEGORY_SELECT') {
      const banOptions = pool.filter((entry) => !bans.has(entry.id) && entry.id !== pinned?.id);
      const pickOptions = pool.filter((entry) => !bans.has(entry.id));
      return (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Kategorien waehlen</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            Platz 1 streicht 2 Kategorien, letzter Platz waehlt 1 Fix-Kategorie.
          </div>
          <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {pool.map((entry) => {
                const isBanned = bans.has(entry.id);
                const isPinned = pinned?.id === entry.id;
                const isSelected = selected.some((sel) => sel.id === entry.id);
                const label = isPinned ? 'FIX' : isBanned ? 'GEBANNT' : isSelected ? 'GEWAEHLT' : '';
                return (
                  <span
                    key={`rundlauf-cat-${entry.id}`}
                    style={{
                      ...statChip,
                      opacity: isBanned ? 0.35 : 1,
                      borderColor: isPinned ? 'rgba(96,165,250,0.6)' : 'rgba(255,255,255,0.15)',
                      background: isPinned ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.06)'
                    }}
                  >
                    {entry.title} {label ? `(${label})` : ''}
                  </span>
                );
              })}
            </div>
            {selectedTitles.length > 0 && (
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                Auswahl: {selectedTitles.map((title, idx) => `R${idx + 1}: ${title}`).join(' · ')}
              </div>
            )}
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontWeight: 700 }}>Bans (Platz 1): {topTeamName || 'n/a'}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  value={rundlaufBanDraft}
                  onChange={(e) => setRundlaufBanDraft(e.target.value)}
                  style={{ ...inputStyle, flex: '1 1 220px', minWidth: 180 }}
                >
                  <option value="">Kategorie waehlen</option>
                  {banOptions.map((entry) => (
                    <option key={`ban-${entry.id}`} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </select>
                <button
                  style={{ ...inputStyle, width: 'auto', background: 'rgba(148,163,184,0.16)' }}
                  onClick={() => {
                    const selection = rundlaufBanDraft.trim();
                    if (!selection) return;
                    handleRundlaufBanCategory(selection);
                  }}
                >
                  Bann setzen
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontWeight: 700 }}>Fix Kategorie (Letzter): {lastTeamName || 'n/a'}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  value={rundlaufPickDraft}
                  onChange={(e) => setRundlaufPickDraft(e.target.value)}
                  style={{ ...inputStyle, flex: '1 1 220px', minWidth: 180 }}
                >
                  <option value="">Kategorie waehlen</option>
                  {pickOptions.map((entry) => (
                    <option key={`pick-${entry.id}`} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </select>
                <button
                  style={{ ...inputStyle, width: 'auto', background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.4)', color: '#bbf7d0' }}
                  onClick={() => {
                    const selection = rundlaufPickDraft.trim();
                    if (!selection) return;
                    handleRundlaufPickCategory(selection);
                  }}
                >
                  Fix waehlen
                </button>
              </div>
            </div>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'linear-gradient(135deg, #63e5ff, #60a5fa)', color: '#0b1020' }}
              onClick={handleRundlaufConfirm}
            >
              Auswahl bestaetigen
            </button>
          </div>
        </section>
      );
    }

    if (normalizedGameState === 'RUNDLAUF_ROUND_INTRO') {
      return (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Rundlauf Runde {roundLabel}</div>
          <div style={{ fontSize: 13, color: '#cbd5e1' }}>Kategorie: {currentCategoryTitle || 'n/a'}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'linear-gradient(135deg, #63e5ff, #60a5fa)', color: '#0b1020' }}
              onClick={handleRundlaufStartRound}
            >
              START RUNDE
            </button>
          </div>
        </section>
      );
    }

    if (normalizedGameState === 'RUNDLAUF_PLAY') {
      return (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Rundlauf live</div>
          <div style={{ fontSize: 13, color: '#cbd5e1' }}>
            Runde {roundLabel} · Kategorie: {currentCategoryTitle || 'n/a'}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={statChip}>Aktiv: {activeTeamName || 'n/a'}</span>
            {rundlaufTimeLeft !== null && <span style={statChip}>Restzeit {rundlaufTimeLeft}s</span>}
            <span style={statChip}>Antworten: {rundlauf?.usedAnswers?.length ?? 0}</span>
          </div>
          {lastAttempt && (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontWeight: 700 }}>
                Letzter Versuch: {lastAttemptTeamName || lastAttempt.teamId}
              </div>
              <div style={{ color: '#e2e8f0' }}>{lastAttempt.text || '—'}</div>
              {lastAttemptLabel && <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>{lastAttemptLabel}</div>}
            </div>
          )}
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'rgba(34,197,94,0.18)', borderColor: 'rgba(34,197,94,0.4)', color: '#bbf7d0' }}
              onClick={() => handleRundlaufMark('ok')}
            >
              OK
            </button>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'rgba(250,204,21,0.16)', borderColor: 'rgba(250,204,21,0.4)', color: '#fde68a' }}
              onClick={() => handleRundlaufMark('dup')}
            >
              DUP
            </button>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'rgba(248,113,113,0.2)', borderColor: 'rgba(248,113,113,0.45)', color: '#fecaca' }}
              onClick={() => handleRundlaufMark('invalid')}
            >
              INVALID
            </button>
            <button
              style={{ ...inputStyle, width: 'auto' }}
              onClick={handleRundlaufNextTeam}
            >
              Naechstes Team
            </button>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'rgba(248,113,113,0.2)', borderColor: 'rgba(248,113,113,0.45)', color: '#fecaca' }}
              onClick={() => handleRundlaufEliminate(rundlauf?.activeTeamId ?? null)}
            >
              Team rausnehmen
            </button>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'rgba(148,163,184,0.16)' }}
              onClick={handleRundlaufEndRound}
            >
              Runde beenden
            </button>
          </div>
        </section>
      );
    }

    if (normalizedGameState === 'RUNDLAUF_ROUND_END') {
      const winners = (rundlauf?.roundWinners ?? []).map((id) => teamLookup[id]?.name || id);
      return (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Runde beendet</div>
          <div style={{ color: '#cbd5e1' }}>
            {winners.length ? `Sieger: ${winners.join(', ')}` : 'Keine Sieger gemeldet'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'linear-gradient(135deg, #63e5ff, #60a5fa)', color: '#0b1020' }}
              onClick={handleNextQuestion}
            >
              NAECHSTE RUNDE
            </button>
          </div>
        </section>
      );
    }

    if (normalizedGameState === 'RUNDLAUF_SCOREBOARD_FINAL') {
      return (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Rundlauf Scoreboard</div>
          {renderCompactScoreboard('Finaler Stand')}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'linear-gradient(135deg, #63e5ff, #60a5fa)', color: '#0b1020' }}
              onClick={handleNextQuestion}
            >
              WEITER ZUR SIEGEREHRUNG
            </button>
          </div>
        </section>
      );
    }

    if (normalizedGameState === 'SIEGEREHRUNG') {
      return (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Siegerehrung</div>
          {renderCompactScoreboard('Finales Ranking')}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'rgba(148,163,184,0.16)' }}
              onClick={handleNextQuestion}
            >
              ENDE
            </button>
          </div>
        </section>
      );
    }

    return null;
  };

  const renderBlitzControls = () => {
    if (featureFlags.isCozyMode) return null;
    const phase = blitz?.phase ?? 'IDLE';
    const pool = blitz?.pool ?? [];
    const selected = blitz?.selectedThemes ?? [];
    const banLimits = blitz?.banLimits ?? {};
    const bans = blitz?.bans ?? {};
    const pinnedTheme = blitz?.pinnedTheme ?? null;
    const topTeamId = blitz?.topTeamId ?? null;
    const lastTeamId = blitz?.lastTeamId ?? null;
    const topTeamName = topTeamId ? teamLookup[topTeamId]?.name || topTeamId : null;
    const lastTeamName = lastTeamId ? teamLookup[lastTeamId]?.name || lastTeamId : null;
    const submissions = blitz?.submissions ?? [];
    const results = blitz?.results ?? {};
    const setIndex = blitz?.setIndex ?? -1;
    const currentTheme = blitz?.theme;
    const showPanel = Boolean(roomCode) && (phase !== 'IDLE' || askedCount >= 9);
    if (!showPanel) return null;

    const renderBanRow = (teamId: string, teamName: string) => {
      const limit = banLimits[teamId] ?? 0;
      const used = bans[teamId]?.length ?? 0;
      const disabled = limit === 0 || used >= limit;
      return (
        <div
          key={`blitz-ban-${teamId}`}
          style={{
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 10,
            display: 'grid',
            gap: 6
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{teamName}</strong>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {used}/{limit}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#cbd5e1' }}>
            {bans[teamId]?.join(', ') || 'Keine Bans'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <select
              value={blitzBanDrafts[teamId] ?? ''}
              onChange={(e) =>
                setBlitzBanDrafts((prev) => ({
                  ...prev,
                  [teamId]: e.target.value
                }))
              }
              disabled={disabled}
              style={{ ...inputStyle, flex: '1 1 160px', minWidth: 160 }}
            >
              <option value="">Theme wÃ¤hlen</option>
              {pool.map((theme) => (
                <option key={`${teamId}-${theme.id}`} value={theme.id}>
                  {theme.title}
                </option>
              ))}
            </select>
            <button
              style={{ ...inputStyle, width: 'auto' }}
              disabled={disabled}
              onClick={() =>
                emitBlitzEvent('host:banBlitzTheme', { teamId, themeId: blitzBanDrafts[teamId], theme: blitzBanDrafts[teamId] })
              }
            >
              Bann setzen
            </button>
          </div>
        </div>
      );
    };

    return (
      <section style={{ ...card, marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: 14 }}>Blitz Battle</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Phase: {phase} Â· Set {Math.max(0, setIndex + 1)}/{Math.max(3, selected.length || 3)}
            </div>
          </div>
          {blitzTimeLeft !== null && phase === 'PLAYING' && (
            <span
              style={{
                ...statChip,
                borderColor: 'rgba(56,189,248,0.5)',
                background: 'rgba(56,189,248,0.12)',
                color: '#bae6fd'
              }}
            >
              {blitzTimeLeft}s
            </span>
          )}
        </div>

        {phase === 'IDLE' && (
          <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
            <textarea
              value={blitzThemeInput}
              onChange={(e) => setBlitzThemeInput(e.target.value)}
              style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
              placeholder="Eigene Themen (optional)"
            />
            <button
              style={{
                ...inputStyle,
                background: 'linear-gradient(135deg, #fde68a, #f97316)',
                color: '#1f1305'
              }}
              onClick={() =>
                emitBlitzEvent(
                  'host:startBlitz',
                  blitzThemeInput.trim() ? { themesText: blitzThemeInput } : {},
                  () => setBlitzThemeInput('')
                )
              }
            >
              BLITZ STARTEN
            </button>
          </div>
        )}

        {phase === 'READY' && (
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 700 }}>
              {language === 'de' ? 'Fotoblitz bereit' : 'Blitz ready'}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {topTeamName
                ? `Platz 1 (${topTeamName}) streicht 2 Themen`
                : 'Platz 1 streicht 2 Themen'}{' '}
              -
              {lastTeamName
                ? ` Letzter Platz (${lastTeamName}) waehlt 1 Thema`
                : ' Letzter Platz waehlt 1 Thema'}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {pool.map((theme) => (
                <span key={theme.id} style={statChip}>
                  {theme.title}
                </span>
              ))}
              {pool.length === 0 && <span style={{ color: '#94a3b8' }}>Keine Themen</span>}
            </div>
            <button
              style={{ ...inputStyle, width: 'auto' }}
              onClick={() => emitBlitzEvent('host:blitzOpenSelection')}
            >
              Auswahl starten
            </button>
          </div>
        )}

        {phase === 'BANNING' && selected.length === 0 && (
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Verfuegbare Themen</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {pool.map((theme) => (
                <span key={theme.id} style={statChip}>
                  {theme.title}
                </span>
              ))}
              {pool.length === 0 && <span style={{ color: '#94a3b8' }}>Keine Themen</span>}
            </div>
            {topTeamId && (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 700 }}>Bans durch Platz 1</div>
                {renderBanRow(topTeamId, topTeamName || 'Platz 1')}
              </div>
            )}
            {lastTeamId && (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 700 }}>Garantiertes Thema (letzter Platz)</div>
                {pinnedTheme ? (
                  <span
                    style={{
                      ...statChip,
                      borderColor: 'rgba(59,130,246,0.4)',
                      background: 'rgba(59,130,246,0.18)'
                    }}
                  >
                    {pinnedTheme.title}
                  </span>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select
                      value={blitzPickDraft}
                      onChange={(e) => setBlitzPickDraft(e.target.value)}
                      style={{ ...inputStyle, flex: '1 1 180px', minWidth: 180 }}
                    >
                      <option value="">Theme waehlen</option>
                      {pool.map((theme) => (
                        <option key={`pick-${theme.id}`} value={theme.id}>
                          {theme.title}
                        </option>
                      ))}
                    </select>
                    <button
                      style={{ ...inputStyle, width: 'auto' }}
                      disabled={!blitzPickDraft}
                      onClick={() => emitBlitzEvent('host:pickBlitzTheme', { teamId: lastTeamId, themeId: blitzPickDraft })}
                    >
                      Thema festlegen
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              style={{ ...inputStyle, width: 'auto' }}
              disabled={Boolean(lastTeamId && !pinnedTheme)}
              onClick={() => emitBlitzEvent('host:confirmBlitzThemes')}
            >
              Themen auslosen
            </button>
          </div>
        )}

        {selected.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>AusgewÃ¤hlte Themen</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {selected.map((theme, idx) => (
                <span
                  key={`blitz-theme-${theme.id}-${idx}`}
                  style={{
                    ...statChip,
                    background: idx === setIndex ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.05)',
                    borderColor: idx === setIndex ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'
                  }}
                >
                  {idx + 1}. {theme.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {phase === 'ROUND_INTRO' && (
          <div style={{ marginTop: 10, fontSize: 13, color: '#cbd5e1' }}>
            Runde startet gleich. Thema: {currentTheme?.title || '-'}
          </div>
        )}

        {phase === 'PLAYING' && (
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 700 }}>
              Set {Math.max(1, setIndex + 1)} Â· Thema: {currentTheme?.title || '-'}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Einsendungen: {submissions.length}/{scoreboard.length}
            </div>
            <div
              style={{
                display: 'grid',
                gap: 8,
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'
              }}
            >
              {(blitz?.items ?? []).map((item, idx) => (
                <div
                  key={item.id || `blitz-item-${idx}`}
                  style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: 10,
                    background: 'rgba(0,0,0,0.25)',
                    display: 'grid',
                    gap: 6
                  }}
                >
                  <div style={{ fontWeight: 700 }}>Item {idx + 1}</div>
                  {item.mediaUrl && (
                    <img
                      src={item.mediaUrl}
                      alt={item.prompt || `Blitz Item ${idx + 1}`}
                      style={{ width: '100%', borderRadius: 10, objectFit: 'cover', maxHeight: 140 }}
                    />
                  )}
                  {item.prompt && <div style={{ fontSize: 12, color: '#cbd5e1' }}>{item.prompt}</div>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                style={{ ...inputStyle, width: 'auto' }}
                onClick={() => emitBlitzEvent('host:lockBlitzSet')}
              >
                Set sperren
              </button>
              <button
                style={{ ...inputStyle, width: 'auto' }}
                onClick={() => emitBlitzEvent('host:revealBlitzSet')}
              >
                Ergebnisse berechnen
              </button>
            </div>
          </div>
        )}

        {phase !== 'PLAYING' && Object.keys(results || {}).length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Set-Ergebnis</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {scoreboard.map((entry) => (
                <div
                  key={`blitz-result-${entry.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: 10,
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: '8px 10px'
                  }}
                >
                  <span>{entry.name}</span>
                  <span>{results[entry.id]?.correctCount ?? 0}/5</span>
                  <span style={{ fontWeight: 700 }}>+{results[entry.id]?.pointsAwarded ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'SET_END' && setIndex < blitzSetTotal && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              style={{ ...inputStyle, width: 'auto' }}
              onClick={() => emitBlitzEvent('host:blitzStartSet')}
            >
              {setIndex < 0 ? 'Set starten' : 'NÃ¤chstes Set starten'}
            </button>
          </div>
        )}
        {phase === 'DONE' && (
          <div style={{ marginTop: 12 }}>
            <span style={{ ...statChip, background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.4)' }}>
              Blitz abgeschlossen
            </span>
          </div>
        )}
      </section>
    );
  };

  const renderStageShortcuts = () => {
    if (!featureFlags.showLegacyPanels) return null;
    const ctas: React.ReactNode[] = [];
    if (isScoreboardPauseState && blitzPhase === 'DONE') {
      ctas.push(
        <button
          key="cta-resume"
          style={{ ...inputStyle, width: 'auto', background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.4)', color: '#a7f3d0' }}
          onClick={handleNextQuestion}
        >
          Segment 2 starten
        </button>
      );
    }
    if (isScoreboardState && askedCount >= totalQuestions && potatoPhase === 'IDLE') {
      ctas.push(
        <button
          key="cta-potato"
          style={{ ...inputStyle, width: 'auto', background: 'linear-gradient(135deg, #fbbf24, #fb923c)', color: '#1f1305' }}
          onClick={handlePotatoStart}
        >
          FINAL: HEISSE KARTOFFEL
        </button>
      );
      ctas.push(
        <button
          key="cta-awards"
          style={{ ...inputStyle, width: 'auto', background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.4)', color: '#bfdbfe' }}
          onClick={handleShowAwards}
        >
          Awards / Ende
        </button>
      );
    }
  if (!ctas.length) return null;
  return (
    <section style={{ ...card, marginTop: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>Stage Actions</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{ctas}</div>
    </section>
  );
};

  const renderCompactScoreboard = (title = 'Scoreboard') => {
    const fallbackEntries = Object.entries(answers?.teams || {}).map(([id, team]) => ({
      id,
      name: team?.name || 'Team',
      score: (team as any)?.score ?? 0
    }));
    const dataset = (scoreboard.length ? scoreboard : fallbackEntries).slice(0, 6);
    const totalTeams = scoreboard.length || fallbackEntries.length;
    return (
      <section style={{ ...card, marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontWeight: 800 }}>{title}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ ...statChip, background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.35)', color: '#93c5fd' }}>
              Teams: {totalTeams || 0}
            </span>
            <span style={{ ...statChip, background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.35)', color: '#bbf7d0' }}>
              Connected: {connectedTeams || 0}
            </span>
          </div>
        </div>
        {dataset.length === 0 ? (
          <div style={{ padding: 10, borderRadius: 12, border: '1px dashed rgba(255,255,255,0.12)', color: '#94a3b8' }}>
            Noch keine Teams verbunden.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {dataset.map((entry, idx) => (
              <div
                key={`compact-score-${entry.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(0,0,0,0.35)'
                }}
              >
                <span style={{ fontWeight: 700 }}>{idx + 1}.</span>
                <span>{entry.name}</span>
                <span style={{ fontWeight: 700 }}>{entry.score ?? 0}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderWarningsPanel = () => {
    if (!structuralWarnings.length) return null;
    const showWarnings =
      showSessionSetup ||
      showJoinScreen ||
      normalizedGameState === 'LOBBY' ||
      normalizedGameState === 'SCOREBOARD_PRE_BLITZ' ||
      normalizedGameState === 'RUNDLAUF_SCOREBOARD_PRE' ||
      normalizedGameState === 'BLITZ_READY' ||
      normalizedGameState === 'RUNDLAUF_PAUSE';
    if (!showWarnings) return null;
    return (
      <details
        style={{
          ...card,
          marginTop: 12,
          border: '1px solid rgba(251,191,36,0.45)',
          background: 'rgba(120,53,15,0.35)'
        }}
      >
        <summary
          style={{
            cursor: 'pointer',
            fontWeight: 800,
            color: '#fbbf24',
            listStyle: 'none',
            outline: 'none',
            appearance: 'none',
            WebkitAppearance: 'none'
          }}
        >
          Hinweise ({structuralWarnings.length})
        </summary>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#fde68a', fontSize: 13 }}>
          {structuralWarnings.map((warning, idx) => (
            <li key={`${warning}-${idx}`}>{warning}</li>
          ))}
        </ul>
      </details>
    );
  };

  const renderNextActionHint = () => {
    if (!nextActionHint) return null;
    return (
      <div
        style={{
          display: 'grid',
          gap: 6,
          padding: 16,
          borderRadius: 16,
          border: '1px solid rgba(96,165,250,0.5)',
          background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(15,23,42,0.85))',
          minWidth: 240,
          flex: '1 1 280px'
        }}
      >
        <div style={{ fontSize: 12, color: '#cbd5e1', letterSpacing: '0.16em' }}>NAECHSTER SCHRITT</div>
        {nextActionHint.context && (
          <div style={{ fontSize: 12, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {nextActionHint.context}
          </div>
        )}
        <div style={{ fontWeight: 900, fontSize: 24 }}>
          Taste {nextActionHint.hotkey} | {nextActionHint.label}
        </div>
        <div style={{ fontSize: 15, color: '#e2e8f0' }}>{nextActionHint.detail}</div>
      </div>
    );
  };

  const renderSpecialStageHints = () => {
    const blitzStates = new Set(['BLITZ_READY', 'BLITZ_BANNING', 'BLITZ_SET_INTRO', 'BLITZ_PLAYING', 'BLITZ_SET_END']);
    const rundlaufStates = new Set([
      'RUNDLAUF_PAUSE',
      'RUNDLAUF_SCOREBOARD_PRE',
      'RUNDLAUF_CATEGORY_SELECT',
      'RUNDLAUF_ROUND_INTRO',
      'RUNDLAUF_PLAY',
      'RUNDLAUF_ROUND_END'
    ]);
    if (blitzStates.has(normalizedGameState) && blitz) {
      const topId = blitz.topTeamId ?? null;
      const topBans = topId ? blitz.bans?.[topId]?.length ?? 0 : 0;
      const pinned = blitz.pinnedTheme?.title ?? null;
      const selected = blitz.selectedThemes ?? [];
      const orderLabel = selected.length
        ? selected.map((entry, idx) => `R${idx + 1}: ${entry.title}`).join(' | ')
        : 'R1: - | R2: - | R3: -';
      return (
        <div style={{ ...card, flex: '1 1 240px', minWidth: 220, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#cbd5e1', letterSpacing: '0.16em' }}>FOTOBLITZ STATUS</div>
          <div style={{ marginTop: 6, fontSize: 13, color: '#e2e8f0' }}>Top bans: {topBans}/2</div>
          <div style={{ fontSize: 13, color: '#e2e8f0' }}>Last pick: {pinned ?? '-'}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>{orderLabel}</div>
        </div>
      );
    }
    if (rundlaufStates.has(normalizedGameState) && rundlauf) {
      const topBans = rundlauf.bans?.length ?? 0;
      const pinned = rundlauf.pinned?.title ?? null;
      const selected = rundlauf.selected ?? [];
      const orderLabel = selected.length
        ? selected.map((entry, idx) => `R${idx + 1}: ${entry.title}`).join(' | ')
        : 'R1: - | R2: - | R3: -';
      return (
        <div style={{ ...card, flex: '1 1 240px', minWidth: 220, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#cbd5e1', letterSpacing: '0.16em' }}>RUNDLAUF STATUS</div>
          <div style={{ marginTop: 6, fontSize: 13, color: '#e2e8f0' }}>Top bans: {topBans}/2</div>
          <div style={{ fontSize: 13, color: '#e2e8f0' }}>Last pick: {pinned ?? '-'}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>{orderLabel}</div>
        </div>
      );
    }
    return null;
  };

  const renderPrimaryControls = () => {
    if (!roomCode) return null;
    const actionHintCard = renderNextActionHint();
    const submissionCard = renderTeamSubmissionStatus();
    const stageHintCard = renderSpecialStageHints();
    const baseButtonStyle: React.CSSProperties = {
      ...inputStyle,
      width: '100%',
      padding: '14px 16px',
      fontSize: 16,
      fontWeight: 800,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      cursor: 'pointer'
    };
    const buttonConfigs: Array<{
      label: string;
      onClick: () => void;
      busy: boolean;
      tone: 'primary' | 'warning' | 'accent';
      disabled?: boolean;
    }> = singleActionMode
      ? [{ label: 'Weiter', onClick: handleNextQuestion, busy: actionState.next, tone: 'primary' }]
      : [
          { label: 'Weiter', onClick: handleNextQuestion, busy: actionState.next, tone: 'primary' },
          { label: 'Sperren', onClick: handleLockQuestion, busy: actionState.lock, tone: 'warning', disabled: normalizedGameState !== 'Q_ACTIVE' },
          {
            label: 'Aufdecken',
            onClick: handleReveal,
            busy: actionState.reveal,
            tone: 'accent',
            disabled: normalizedGameState !== 'Q_LOCKED' && normalizedGameState !== 'Q_REVEAL'
          }
        ];
    const toneStyle = (tone: 'primary' | 'warning' | 'accent') => {
      if (tone === 'primary') return { background: 'linear-gradient(135deg, #63e5ff, #60a5fa)', color: '#0b1020' };
      if (tone === 'warning') return { background: 'linear-gradient(135deg, #fed7aa, #fb923c)', color: '#1f1305' };
      return { background: 'linear-gradient(135deg, #c084fc, #8b5cf6)', color: '#130924' };
    };
    return (
      <section style={{ ...card, marginTop: 12 }}>
        {(actionHintCard || submissionCard || stageHintCard) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            {actionHintCard}
            {submissionCard}
            {stageHintCard}
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 10
          }}
        >
          {buttonConfigs.map(({ label, onClick, busy, tone, disabled }) => (
            <button
              key={label}
              style={{
                ...baseButtonStyle,
                ...(toneStyle(tone) as React.CSSProperties),
                opacity: busy || disabled ? 0.65 : 1,
                cursor: busy || disabled ? 'not-allowed' : 'pointer'
              }}
              onClick={busy || disabled ? undefined : onClick}
              disabled={busy || disabled}
            >
              {busy ? `${label} ...` : label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={statChip}>Antworten {answersCount}/{teamsCount || '0'}</span>
          <span style={statChip}>Teams online {connectedTeams || teamsCount || 0}</span>
          {readyCount.total > 0 && (
            <span style={statChip}>Bereit {readyCount.ready}/{readyCount.total}</span>
          )}
          <span style={statChip}>
            Timer (s)
            <input
              type="number"
              min={5}
              max={300}
              value={timerSeconds}
              onChange={(event) => {
                const val = Number(event.target.value);
                if (!Number.isFinite(val)) return;
                setTimerSeconds(val);
                localStorage.setItem('moderatorTimerSeconds', String(val));
              }}
              style={{
                marginLeft: 6,
                width: 70,
                background: 'rgba(15,23,42,0.7)',
                border: '1px solid rgba(148,163,184,0.4)',
                borderRadius: 8,
                color: '#e2e8f0',
                padding: '4px 6px'
              }}
            />
          </span>
          {questionTimerSecondsLeft !== null && (
            <span style={statChip}>Timer {questionTimerSecondsLeft}s</span>
          )}
        </div>
      </section>
    );
  };

  const renderHotkeyLegend = () => {
    if (!roomCode) return null;
    if (!featureFlags.showLegacyPanels) return null;
    return (
      <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
        Shortcuts: 1 Weiter{singleActionMode ? '' : ' | 2 Sperren | 3 Aufdecken'} | 6 Scoreboard
      </div>
    );
  };

const renderCozyStagePanel = () => {
  if (!roomCode) return null;
  if (isRundlaufState) return renderRundlaufControls();
  if (isBlitzState) return renderBlitzControls();
  if (normalizedGameState === 'POTATO') return renderPotatoControls();
  if (normalizedGameState === 'AWARDS') {
    return (
      <section style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Awards & Finale</div>
        <p style={{ color: '#cbd5e1', marginBottom: 10 }}>
          Scoreboard bitte auf dem Beamer lassen, Awards via Button triggern.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            style={{
              ...inputStyle,
              width: 'auto',
              background: 'linear-gradient(135deg, #a5b4fc, #60a5fa)',
              color: '#0b1020',
              cursor: 'pointer'
            }}
            onClick={handleShowAwards}
          >
            Awards anzeigen
          </button>
        </div>
      </section>
    );
  }
  const stageShortcuts = renderStageShortcuts();
  if (stageShortcuts) return stageShortcuts;
  return null;
};



  const renderJoinScreen = () => {
    if (!roomCode || !showJoinScreen) return null;
    const teamLink = joinLinks?.team ?? '';
    const beamerLink = joinLinks?.beamer ?? '';
    const teamDisplay = teamLink ? teamLink.replace(/^https?:\/\//i, '') : '';
    const beamerDisplay = beamerLink ? beamerLink.replace(/^https?:\/\//i, '') : '';
    const teamQr = teamLink ? buildQrUrl(teamLink) : '';
    const beamerQr = beamerLink ? buildQrUrl(beamerLink) : '';
    const connected = socketTeamsConnected ?? joinScreenTeams.length;
    return (
      <section style={{ ...card, marginTop: 12 }}>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Roomcode</div>
            <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '0.3em' }}>{roomCode}</div>
            <div style={{ fontSize: 13, color: '#cbd5e1' }}>
              {connected} {connected === 1 ? 'Team verbunden' : 'Teams verbunden'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                style={{ ...inputStyle, width: 'auto', background: 'rgba(255,255,255,0.08)', cursor: 'pointer' }}
                onClick={handleOpenBeamerLink}
              >
                Beamer oeffnen
              </button>
              <button
                style={{ ...inputStyle, width: 'auto', background: 'rgba(15,23,42,0.85)', cursor: 'pointer' }}
                onClick={handleCopyTeamLink}
              >
                Team-Link kopieren
              </button>
              <button
                style={{ ...inputStyle, width: 'auto', background: 'linear-gradient(135deg, #63e5ff, #60a5fa)', color: '#0b1020', cursor: 'pointer' }}
                onClick={() => setShowJoinScreen(false)}
              >
                Quiz starten
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
            {teamQr && (
              <div style={{ textAlign: 'center', padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Team</div>
                <img src={teamQr} alt="Team QR" style={{ width: 160, height: 160, borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)' }} />
                {teamDisplay && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{teamDisplay}</div>}
              </div>
            )}
            {beamerQr && (
              <div style={{ textAlign: 'center', padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Beamer</div>
                <img src={beamerQr} alt="Beamer QR" style={{ width: 160, height: 160, borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)' }} />
                {beamerDisplay && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{beamerDisplay}</div>}
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Teams im Raum</div>
          {joinScreenTeams.length === 0 ? (
            <span style={{ color: '#94a3b8' }}>Noch keine Teams verbunden</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {joinScreenTeams.map((team) => (
                <span
                  key={team.id || team.name}
                  style={{ ...statChip, borderRadius: 12, borderColor: 'rgba(255,255,255,0.18)' }}
                >
                  {team.name || 'Team'}
                  {team.isReady && (
                    <span style={{ fontSize: 10, marginLeft: 6, color: '#5eead4' }}>Ready</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderTeamSubmissionStatus = () => {
    if (!submissionStatus.total) return null;
    return (
      <div
        style={{
          display: 'grid',
          gap: 6,
          padding: 12,
          borderRadius: 12,
          border: '1px solid rgba(148,163,184,0.3)',
          background: 'rgba(12,16,26,0.7)'
        }}
      >
        <div style={{ fontWeight: 900 }}>
          Antworten {submissionStatus.submittedCount}
          {submissionStatus.total ? `/${submissionStatus.total}` : ''}
        </div>
        {submissionStatus.items.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {submissionStatus.items.map((team) => (
              <span
                key={team.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: `1px solid ${team.submitted ? '#22c55e55' : 'rgba(148,163,184,0.4)'}`,
                  background: team.submitted ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.12)',
                  color: '#e2e8f0',
                  fontSize: 12,
                  opacity: team.connected ? 1 : 0.55
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: team.connected ? '#22c55e' : '#64748b'
                  }}
                />
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: team.submitted ? '#38bdf8' : '#475569'
                  }}
                />
                {team.name}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };
  const renderCozyLayout = () => {
    if (!featureFlags.isCozyMode) return null;
    const stagePanel = renderCozyStagePanel();
    const warningsPanel = renderWarningsPanel();
    const scoreboardPanel = renderCompactScoreboard();
    return (
      <>
        <section style={{ ...card }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Roomcode</span>
              <span style={{ fontWeight: 900, fontSize: 28, letterSpacing: '0.3em' }}>{roomCode || '----'}</span>
            </div>
            <div style={{ display: 'grid', gap: 6, justifyItems: 'flex-start' }}>
  {pill(stateInfo.label, stateInfo.tone)}
  <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700 }}>Frage {askedCount}/{totalQuestions}</span>
</div>
            <div style={{ display: 'grid', gap: 6, justifyItems: 'flex-end' }}>
  {questionTimerSecondsLeft !== null && <span style={statChip}>Timer {questionTimerSecondsLeft}s</span>}
  {readyCount.total > 0 && normalizedGameState === 'LOBBY' && (
    <span
      style={{
        ...statChip,
        background: 'rgba(52,211,153,0.14)',
        borderColor: 'rgba(52,211,153,0.32)',
        color: '#86efac'
      }}
    >
      Bereit {readyCount.ready}/{readyCount.total}
    </span>
  )}
</div>
          </div>
          {roomCode && !showSessionSetup ? (
  <>
    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <button
        style={{
          ...inputStyle,
          width: 'auto',
          background: 'rgba(255,255,255,0.08)',
          cursor: 'pointer'
        }}
        onClick={() => setShowSettingsPanel((prev) => !prev)}
      >
        {showSettingsPanel ? 'Einstellungen schliessen' : 'Einstellungen'}
      </button>
    </div>
        {showSettingsPanel && (
      <div style={{ ...actionWrap, marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {currentQuizName && (
            <span style={{ ...statChip, background: 'rgba(99,229,255,0.14)', borderColor: 'rgba(99,229,255,0.32)', color: '#7dd3fc' }}>
              Quiz: {currentQuizName}
            </span>
          )}
          <span style={statChip}>Sprache: {language.toUpperCase()}</span>
          <button
            style={{
              ...inputStyle,
              width: 'auto',
              background: 'rgba(255,255,255,0.08)',
              cursor: 'pointer'
            }}
            onClick={handleRoomReset}
          >
            Session wechseln
          </button>
          <select
            value={language}
            onChange={(e) => {
              const val = e.target.value as Language;
              setLang(val);
              localStorage.setItem('moderatorLanguage', val);
            }}
            style={{ ...inputStyle, width: 'auto', minWidth: 120 }}
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
            <option value="both">DE/EN</option>
          </select>
          <button
            style={{
              ...inputStyle,
              width: 'auto',
              background: 'linear-gradient(135deg, #63e5ff, #60a5fa)',
              color: '#0b1020',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (!roomCode) {
                setToast('Roomcode fehlt');
                return;
              }
              doAction(() => setLanguage(roomCode, language), 'Sprache gesetzt');
            }}
          >
            Sprache setzen
          </button>
        </div>
      </div>
    )}
  </>
) : (
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {/* TODO(DESIGN_LATER): separate Session-Setup screen */}
              {(!SINGLE_SESSION_MODE || !roomCode) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                    placeholder="Roomcode eingeben"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    style={{ ...inputStyle, width: 'auto', background: 'rgba(255,255,255,0.08)', cursor: 'pointer' }}
                    onClick={handleRoomConnect}
                  >
                    Verbinden
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  value={selectedQuiz}
                  onChange={(e) => {
                    setSelectedQuiz(e.target.value);
                    localStorage.setItem('moderatorSelectedQuiz', e.target.value);
                  }}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  {quizzesSorted.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.name || quiz.id}
                    </option>
                  ))}
                </select>
                <select
                  value={language}
                  onChange={(e) => {
                    const val = e.target.value as Language;
                    setLang(val);
                    localStorage.setItem('moderatorLanguage', val);
                  }}
                  style={{ ...inputStyle, width: 140 }}
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                  <option value="both">DE+EN</option>
                </select>
                <button
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    background: 'linear-gradient(135deg, #fde68a, #f97316)',
                    color: '#1f1105',
                    cursor: creatingSession ? 'wait' : 'pointer',
                    opacity: creatingSession ? 0.7 : 1
                  }}
                  disabled={creatingSession || !selectedQuiz}
                  onClick={handleCreateSession}
                >
                  {creatingSession ? 'Session wird erstellt ...' : 'Neue Session starten'}
                </button>
                {roomCode && (
                  <button
                    style={{
                      ...inputStyle,
                      width: 'auto',
                      background: 'rgba(255,255,255,0.04)',
                      cursor: 'pointer'
                    }}
                    onClick={() => setShowSessionSetup(false)}
                  >
                    Abbrechen
                  </button>
                )}
              </div>
            </div>
          )}
        </section>


{roomCode ? (

  showJoinScreen ? (

    <>

      {renderJoinScreen()}

      {warningsPanel}

    </>

  ) : (

    <>

      {renderPrimaryControls()}

      {stagePanel}

      {warningsPanel}

      {scoreboardPanel}

      {renderHotkeyLegend()}

    </>

  )

) : (

  warningsPanel

)}





      </>
    );
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: draftTheme?.background
          ? `url(${draftTheme.background}) center/cover fixed`
          : 'url(/background.png) center/cover fixed, radial-gradient(circle at 18% 18%, rgba(99, 102, 241, 0.2), transparent 34%), radial-gradient(circle at 78% 8%, rgba(56, 189, 248, 0.16), transparent 36%), linear-gradient(180deg, #0b0f1a 0%, #0c111c 100%)',
        color: '#e2e8f0',
        padding: 12,
        maxWidth: 1100,
        margin: '0 auto',
        fontFamily: draftTheme?.font ? `${draftTheme.font}, "Inter", sans-serif` : undefined
      }}
    >
      {renderCozyLayout()}
      {featureFlags.showLegacyPanels && (
        <details style={{ marginTop: 24 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Legacy Tools</summary>
          <div style={{ marginTop: 12 }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          paddingBottom: 8,
          background: 'linear-gradient(180deg, rgba(10,13,20,0.9) 0%, rgba(10,13,20,0.74) 100%)',
          backdropFilter: 'blur(14px)'
        }}
      >
        {viewPhase === 'pre' && (
          <header
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 8
            }}
          >
            <div style={card}>
              <div
                style={{
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img
                    src="/logo.png?v=3"
                    alt="Cozy Kiosk Quiz"
                    style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain', boxShadow: 'none' }}
                  />
                  <span style={{ fontWeight: 900, fontSize: 16 }}>Cozy Kiosk Quiz</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {readyCount.total > 0 && (
                    <span style={{ ...statChip, background: 'rgba(52,211,153,0.14)', borderColor: 'rgba(52,211,153,0.32)', color: '#86efac' }}>
                      Bereit {readyCount.ready}/{readyCount.total}
                    </span>
                  )}
                  {pill(phaseLabel, 'setup')}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Aktueller Roomcode</div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 24,
                    letterSpacing: '0.3em',
                    border: '1px dashed rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    textAlign: 'center'
                  }}
                >
                  {roomCode || '----'}
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {/* TODO(DESIGN_LATER): Replace this utilitarian block with proper setup UI */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                    placeholder="Roomcode eingeben"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    style={{
                      ...inputStyle,
                      width: 'auto',
                      background: 'rgba(255,255,255,0.08)',
                      cursor: 'pointer'
                    }}
                    onClick={handleRoomConnect}
                  >
                    Verbinden
                  </button>
                </div>
                <button
                  style={{
                    ...inputStyle,
                    background: 'linear-gradient(135deg, #fde68a, #f97316)',
                    color: '#1f1105',
                    cursor: creatingSession ? 'wait' : 'pointer',
                    opacity: creatingSession ? 0.7 : 1
                  }}
                  disabled={creatingSession || !selectedQuiz}
                  onClick={handleCreateSession}
                >
                  {creatingSession ? 'Session wird erstellt ...' : 'Neue Session starten'}
                </button>
              </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={language}
                onChange={(e) => {
                  const val = e.target.value as Language;
                    setLang(val);
                    localStorage.setItem('moderatorLanguage', val);
                  }}
                  style={{ ...inputStyle, background: 'rgba(255,255,255,0.05)', color: '#f8fafc' }}
                >
                  <option value="de">Deutsch</option>
                  <option value="en">Englisch</option>
                  <option value="both">Beides</option>
                </select>
                <button
                  style={{
                    ...inputStyle,
                    background: 'linear-gradient(135deg, #63e5ff, #60a5fa)',
                    color: '#0b1020',
                    cursor: 'pointer',
                    border: '1px solid rgba(99,229,255,0.5)',
                    boxShadow: '0 18px 38px rgba(96,165,250,0.35)'
                  }}
                  onClick={() => {
                    if (!roomCode) {
                      setToast('Roomcode fehlt');
                      return;
                    }
                    doAction(() => setLanguage(roomCode, language), 'Sprache gesetzt');
                  }}
                >
                  Sprache setzen
                </button>
                <button
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    background:
                      health === 'ok'
                        ? 'rgba(34,197,94,0.16)'
                        : health === 'fail'
                        ? 'rgba(239,68,68,0.16)'
                        : 'rgba(255,255,255,0.05)',
                    border:
                      health === 'ok'
                        ? '1px solid rgba(34,197,94,0.5)'
                        : health === 'fail'
                        ? '1px solid rgba(239,68,68,0.5)'
                        : '1px solid rgba(255,255,255,0.08)',
                    color: health === 'ok' ? '#bbf7d0' : health === 'fail' ? '#fecdd3' : '#e2e8f0',
                    cursor: 'pointer'
                  }}
                  onClick={async () => {
                    try {
                      await fetchHealth();
                      setHealth('ok');
                      setToast('Backend erreichbar');
                    } catch (err) {
                      setHealth('fail');
                      setToast('Backend nicht erreichbar');
                    } finally {
                      setTimeout(() => setToast(null), 1800);
                    }
                  }}
                >
                  {health === 'ok' ? 'Health: OK' : health === 'fail' ? 'Health: Fehler' : 'Health-Check'}
                </button>
                {readyCount.total > 0 && (
                  <div
                    style={{
                      ...inputStyle,
                      width: 'auto',
                      background: 'rgba(52,211,153,0.12)',
                      border: '1px solid rgba(52,211,153,0.35)',
                      color: '#bbf7d0',
                      padding: '10px 12px',
                      fontWeight: 700
                    }}
                  >
                    Bereit {readyCount.ready}/{readyCount.total}
                  </div>
                )}
              </div>
            </div>
            <TimerCard
              cardStyle={card}
              buttonStyle={timerButtonStyle}
              timerSeconds={timerSeconds}
              onChange={(val) => {
                setTimerSeconds(val);
                if (Number.isFinite(val)) localStorage.setItem('moderatorTimerSeconds', String(val));
              }}
              onStart={() => doAction(() => startTimer(roomCode, timerSeconds), 'Timer gestartet')}
              onStop={() => doAction(() => stopTimer(roomCode), 'Timer gestoppt')}
            />
          </header>
        )}

        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['pre', 'lobby', 'intro', 'quiz'] as ViewPhase[]).map((p) => (
            <button
              key={p}
              style={{
                ...inputStyle,
                background: viewPhase === p ? 'linear-gradient(135deg, #63e5ff, #60a5fa)' : 'rgba(255,255,255,0.05)',
                color: viewPhase === p ? '#0b1020' : '#e2e8f0',
                cursor: 'pointer',
                width: 'auto',
                minWidth: 78,
                padding: '8px 10px',
                border: viewPhase === p ? '1px solid rgba(99,229,255,0.6)' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: 'none'
              }}
              onClick={() => changeViewPhase(p)}
            >
              {p === 'pre' ? 'Vor Quiz' : p === 'lobby' ? 'Lobby' : p === 'intro' ? 'Intro' : 'Quiz'}
            </button>
          ))}
          {currentQuizName && (
            <span style={{ ...statChip, background: 'rgba(99,229,255,0.14)', borderColor: 'rgba(99,229,255,0.32)', color: '#7dd3fc' }}>
              Quiz: {currentQuizName}
            </span>
          )}
          {leaderboard.slice(0, 1).map((run, idx) => (
            <span
              key={idx}
              style={{ ...statChip, background: 'rgba(52,211,153,0.14)', borderColor: 'rgba(52,211,153,0.32)', color: '#bbf7d0' }}
              title={`Letzter Run: ${new Date(run.date).toLocaleString()} | Gewinner: ${run.winners?.join(', ') || 'n/a'}`}
            >
              Letzter Run: {run.quizId} {run.winners?.[0] ? `(${run.winners[0]})` : 'n/a'}
            </span>
          ))}
        </div>

        {renderActions()}
        {renderStageShortcuts()}
      </div>

      {/* Stats Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginTop: 10 }}>
        <div style={{ ...card, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <div style={{ fontWeight: 800 }}>Stats</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['runs', 'question'] as const).map((key) => (
                <button
                  key={key}
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    minWidth: 90,
                    padding: '8px 10px',
                    cursor: 'pointer',
                    background: statsView === key ? 'linear-gradient(135deg, #63e5ff, #60a5fa)' : 'rgba(255,255,255,0.05)',
                    color: statsView === key ? '#0b1020' : '#e2e8f0',
                    border: statsView === key ? '1px solid rgba(99,229,255,0.6)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: 'none'
                  }}
                  onClick={() => setStatsView(key)}
                >
                  {key === 'runs' ? 'Runs' : 'Frage'}
                </button>
              ))}
            </div>
          </div>

          {statsView === 'runs' ? (
            <LeaderboardPanel runs={leaderboard} />
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {numericStats && (
                  <span style={statChip}>Min {numericStats.min} | Max {numericStats.max} | Median {numericStats.median} | Avg {numericStats.avg}</span>
                )}
                <span style={statChip}>{answersCount}/{teamsCount} Antworten</span>
                {topTexts.length > 0 && <span style={statChip}>Top: {topTexts.map(([k, v]) => `${k} (${v})`).join(', ')}</span>}
              </div>
              {answerStats ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: '#cbd5e1', fontSize: 12 }}>
                  <span style={statChip}>Richtig {answerStats.correct}/{answerStats.total}</span>
                  {Object.keys(answerStats.perOption || {}).length > 0 && (
                    <span style={{ ...statChip, display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                      {Object.entries(answerStats.perOption).map(([opt, count]) => (
                        <span key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ padding: '2px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 700 }}>{opt}</span>
                          <span>{count}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: 13 }}>Noch keine Antworten eingegangen.</div>
              )}
            </div>
          )}
      </div>
    </div>

    {renderPotatoControls()}
    {renderBlitzControls()}

    {/* Fehler/Info Banner oben, besser sichtbar auf Mobile */}
    {toast && (
        <div
          style={{
            position: 'fixed',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 14px',
            borderRadius: 12,
            background: toast.toLowerCase().includes('fehl') || toast.toLowerCase().includes('error') ? 'rgba(239,68,68,0.14)' : 'rgba(15,23,42,0.9)',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
            zIndex: 30,
            maxWidth: '90%',
            textAlign: 'center'
          }}
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      {/* Frage-Karte / Quiz view */}
      {viewPhase === 'quiz' && (
        <>
          <section style={{ ...card, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {question && (
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: '#0f141d',
                    border: `2px solid ${catColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  {catIcon && <img src={catIcon} alt="" style={{ width: 24, height: 24 }} />}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 800 }}>{question?.question ?? 'Keine Frage aktiv'}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {question ? `${meta?.globalIndex}/${meta?.globalTotal ?? '?'} | ${question.category}` : 'Warten auf Frage'}
                </div>
              </div>
            </div>

            {question && (
              <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: 'var(--muted)', fontSize: 12 }}>
                  {numericStats && (
                    <span style={statChip}>Min {numericStats.min} | Max {numericStats.max} | Median {numericStats.median} | Avg {numericStats.avg}</span>
                  )}
                  <span style={statChip}>{phaseChip}</span>
                  {topTexts.length > 0 && <span style={statChip}>Top: {topTexts.map(([k, v]) => `${k} (${v})`).join(', ')}</span>}
                  <span style={statChip}>{answersCount}/{teamsCount} Antworten</span>
                  {teamsCount > 0 && answersCount < teamsCount && (
                    <span style={{ ...statChip, borderColor: 'rgba(251,191,36,0.5)', color: '#fbbf24', background: 'rgba(251,191,36,0.12)', fontWeight: 700 }}>
                      Warten auf {teamsCount - answersCount} Team(s)
                    </span>
                  )}
                </div>
                {answerStats && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: '#cbd5e1', fontSize: 12 }}>
                    <span style={statChip}>Richtig {answerStats.correct}/{answerStats.total}</span>
                    {Object.keys(answerStats.perOption || {}).length > 0 && (
                      <span style={{ ...statChip, display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                        {Object.entries(answerStats.perOption).map(([opt, count]) => (
                          <span key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ padding: '2px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 700 }}>{opt}</span>
                            <span>{count}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <AnswerList
            answers={answers}
            answersCount={answersCount}
            teamsCount={teamsCount}
            unreviewedCount={unreviewedCount}
            statChip={statChip}
            inputStyle={inputStyle}
            onOverride={(teamId, isCorrect) =>
              doAction(async () => {
                await overrideAnswer(roomCode, teamId, isCorrect);
                setAnswers((prev) =>
                  prev
                    ? {
                        ...prev,
                        answers: {
                          ...prev.answers,
                          [teamId]: { ...(prev.answers[teamId] || {}), isCorrect }
                        }
                      }
                    : prev
                );
              }, isCorrect ? 'Als richtig markiert' : 'Als falsch markiert')
            }
          />
        </>
      )}

      {/* Lobby view: nur Teams und Start */}
      {viewPhase === 'lobby' && (
        <TeamsList
          answers={answers}
          inputStyle={inputStyle}
          onRefresh={() =>
            doAction(async () => {
              const res = await fetchAnswers(roomCode);
              setAnswers({
                answers: res.answers ?? {},
                teams: res.teams ?? {},
                solution: res.solution
              });
            }, 'Teams aktualisiert')
          }
          onKickAll={() =>
            doAction(async () => {
              const ids = Object.keys(answers?.teams || {});
              await Promise.all(ids.map((id) => kickTeam(roomCode, id).catch(() => undefined)));
              setAnswers((prev) =>
                prev
                  ? {
                      ...prev,
                      teams: {},
                      answers: {}
                    }
                  : prev
              );
            }, 'Teams entfernt')
          }
          onKickTeam={(teamId) =>
            doAction(async () => {
              await kickTeam(roomCode, teamId);
              setAnswers((prev) =>
                prev
                  ? {
                      ...prev,
                      teams: Object.fromEntries(Object.entries(prev.teams).filter(([id]) => id !== teamId)),
                      answers: Object.fromEntries(Object.entries(prev.answers).filter(([id]) => id !== teamId))
                    }
                  : prev
              );
            }, 'Team entfernt')
          }
        />
      )}

      {/* Intro view: Regeln + Teams */}
      {viewPhase === 'intro' && (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Regeln kurz</div>
          <ul style={{ margin: 0, paddingLeft: 16, color: '#cbd5e1', lineHeight: 1.5 }}>
            <li>Alle Teams beitreten und "Team ist bereit" klicken.</li>
            <li>Timer startet mit Frage, Antworten rechtzeitig abschicken.</li>
            <li>Schaetzfragen: am naechsten dran gewinnt.</li>
            <li>Bilder & Cheese: genau hinsehen.</li>
          </ul>
          <div style={{ marginTop: 12, fontWeight: 800 }}>Teams</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {Object.values(answers?.teams || {}).map((team) => (
              <span
                key={team.name}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: '0.06em',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: '#e2e8f0',
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <StatusDot filled={Boolean(team?.isReady)} tooltip={team?.isReady ? 'Angemeldet' : 'Nicht angemeldet'} />
                {team.name}
              </span>
            ))}
            {Object.keys(answers?.teams || {}).length === 0 && <span style={{ color: 'var(--muted)' }}>Noch keine Teams</span>}
          </div>
        </section>
      )}
      {/* Quick Exit */}
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <button
          style={{
            ...inputStyle,
            background: 'linear-gradient(135deg, #1f2937, #0f172a)',
            color: '#f8fafc',
            width: 'auto',
            padding: '10px 14px',
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: 'none'
          }}
          onClick={() => {
            changeViewPhase('pre');
            setQuestion(null);
            setMeta(null);
            setAnswers(null);
            setToast('Zurueck zum Start');
            setTimeout(() => setToast(null), 1500);
          }}
        >
          Quiz beenden (ohne Stats)
        </button>
        <button
          style={{
            ...inputStyle,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#0b1020',
            width: 'auto',
            padding: '10px 14px',
            cursor: 'pointer',
            border: '1px solid rgba(34,197,94,0.5)',
            boxShadow: '0 18px 38px rgba(22,163,74,0.35)'
          }}
          onClick={endQuizAndReport}
        >
          Quiz beenden & Stats loggen
        </button>
      </div>
          </div>
        </details>
      )}
    </main>
  );
}

export default ModeratorPage;













