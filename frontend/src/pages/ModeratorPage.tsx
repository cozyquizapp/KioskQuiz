import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  fetchCurrentQuestion,
  fetchQuestions,
  startTimer,
  stopTimer,
  setLanguage,
  toggleMute,
  togglePause,
  fetchMuteStatus,
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
  listPublishedQuizzes,
  listCozyDrafts,
  fetchCozyDraft,
  API_BASE
} from '../api';
import { AnswerEntry, AnyQuestion, QuizTemplate, Language, CozyGameState, RundlaufState } from '@shared/quizTypes';
import { categoryColors } from '../categoryColors';
import { useQuizSocket } from '../hooks/useQuizSocket';
import { useLiveAnswers, type AnswersState } from '../hooks/useLiveAnswers';
import TimerCard from '../components/moderator/TimerCard';
import AnswerList from '../components/moderator/AnswerList';
import TeamsList from '../components/moderator/TeamsList';
import ActionButtons from '../components/moderator/ActionButtons';
import StatusDot from '../components/moderator/StatusDot';
import LeaderboardPanel from '../components/moderator/LeaderboardPanel';
// ...existing code...
import { connectControlSocket } from '../socket';
import { featureFlags } from '../config/features';

const DEFAULT_ROOM_CODE = featureFlags.singleSessionRoomCode || 'MAIN';
const SINGLE_SESSION_MODE = featureFlags.singleSessionMode;

type Phase = 'setup' | 'question' | 'evaluating' | 'final';
type ViewPhase = 'pre' | 'lobby' | 'intro' | 'quiz';
type LeaderboardRun = { quizId: string; date: string; winners: string[]; scores?: Record<string, number> };
type NextActionHintDetails = { hotkey: string; label: string; detail: string; context?: string };

const card: React.CSSProperties = {
  background: 'rgba(11, 35, 67, 0.88)',
  border: '1px solid rgba(240,95,178,0.22)',
  borderRadius: 'var(--radius)',
  padding: 16,
  boxShadow: '0 16px 34px rgba(0,0,0,0.38)',
  overflow: 'hidden'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(240,95,178,0.24)',
  background: 'rgba(5,5,5,0.55)',
  color: '#ffe4f2',
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
  background: 'rgba(240,95,178,0.1)',
  border: '1px solid rgba(240,95,178,0.24)',
  borderRadius: 9999,
  padding: '6px 10px',
  fontSize: 12,
  color: '#ffd1e8',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  lineHeight: 1
};

const actionWrap: React.CSSProperties = {
  background: 'rgba(5,5,5,0.45)',
  border: '1px solid rgba(240,95,178,0.22)',
  borderRadius: 'var(--radius)',
  padding: 12,
  boxShadow: '0 12px 26px rgba(0,0,0,0.32)',
  overflow: 'hidden'
};

const pillStyle = (tone: 'setup' | 'live' | 'eval' | 'final'): React.CSSProperties => {
  const map = {
    setup: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.35)', color: '#1d4ed8' },
    live: { bg: 'rgba(22,163,74,0.1)', border: 'rgba(22,163,74,0.4)', color: '#15803d' },
    eval: { bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.4)', color: '#b45309' },
    final: { bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.4)', color: '#0369a1' }
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

const adminTokenKey = (roomCode: string) => `admin-token-${roomCode}`;

const ensureAdminSession = async (roomCode: string): Promise<string | null> => {
  if (!roomCode || typeof window === 'undefined') return null;
  const key = adminTokenKey(roomCode);
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  try {
    const res = await fetch(`/api/rooms/${roomCode}/admin-session`, { method: 'GET' });
    if (!res.ok) {
      // Silent fail for 405/404 - server may not support admin-session
      return null;
    }
    const { token } = await res.json();
    if (token) {
      sessionStorage.setItem(key, token);
      return token as string;
    }
  } catch (err) {
    // Silent fail - proceed without token
  }
  return null;
};

function ModeratorPage(): React.ReactElement {
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
  
  // Use live polling for answers - this is the single source of truth
  const { answers, overrideAnswer: hookOverrideAnswer } = useLiveAnswers(roomCode, question?.id ?? null);
  
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
  const lastTimerAppliedQuestionId = React.useRef<string | null>(null);
  const [blitzThemeInput, setBlitzThemeInput] = useState('');
  const [blitzBanDrafts, setBlitzBanDrafts] = useState<Record<string, string>>({});
  const [blitzPickDraft, setBlitzPickDraft] = useState('');
  const [blitzDisplayTimeSec, setBlitzDisplayTimeSec] = useState(30);
  const [blitzAnswerTimeSec, setBlitzAnswerTimeSec] = useState(30);
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
  const [blitzActionBusy, setBlitzActionBusy] = useState(false);
  const [quizzes, setQuizzes] = useState<QuizTemplate[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string>('');
  const [creatingSession, setCreatingSession] = useState(false);
  const [showJoinScreen, setShowJoinScreen] = useState(false);
  const [showSessionSetup, setShowSessionSetup] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [globalMuted, setGlobalMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timerIsPaused, setTimerIsPaused] = useState(false);
  const [quizHistory, setQuizHistory] = useState<{
    teams: Array<{ id: string; name: string; score: number; answers: Array<{ questionId: string; correct: boolean | null; answer: unknown }> }>;
    questions: Array<{ questionId: string; index: number }>;
  } | null>(null);
  const reconnectPromptedRef = React.useRef(false);
  const singleActionMode = featureFlags.isCozyMode;

  const controlSocketRef = React.useRef<ReturnType<typeof connectControlSocket> | null>(null);
  const emitHost = (
    event: string,
    payload: Record<string, unknown>,
    ack?: (resp?: { ok?: boolean; error?: string }) => void
  ) => {
    const ctrl = controlSocketRef.current;
    if (ctrl?.connected) {
      ctrl.emit(event, payload, ack);
      return true;
    }
    if (socketEmit) {
      socketEmit(event, payload, ack as any);
      return true;
    }
    return false;
  };
  const {
    currentQuestion: socketQuestion,
    questionMeta: socketMeta,
    answers: socketAnswers,
    teams: socketTeams,
    solution: socketSolution,
    questionPhase: socketQuestionPhase,
    scores: socketScores,
    blitz,
    rundlauf: socketRundlauf,
    gameState: socketGameState,
    questionProgress: socketQuestionProgress,
    warnings: socketWarnings,
    timerEndsAt: socketTimerEndsAt,
    teamsConnected: socketTeamsConnected,
    teamStatus: socketTeamStatus,
    connected: socketConnected,
    emit: socketEmit,
    config: socketConfig,
    nextStage: socketNextStage,
    scoreboardOverlayForced: socketScoreboardOverlayForced,
    avatarsEnabled: socketAvatarsEnabled
  } = useQuizSocket(roomCode);
  const rundlauf: RundlaufState | null = socketRundlauf ?? null;
  const normalizedGameState: CozyGameState = socketGameState ?? 'LOBBY';
  const nextStage = socketNextStage ?? null;
  const gameStateInfoMap: Record<CozyGameState, { label: string; hint: string; tone: 'setup' | 'live' | 'eval' | 'final' }> = {
    LOBBY: { label: 'Lobby', hint: 'Teams joinen gerade', tone: 'setup' },
    INTRO: { label: 'Intro', hint: 'Intro/Regeln', tone: 'setup' },
    QUESTION_INTRO: { label: 'Frage intro', hint: 'Neue Frage startet', tone: 'live' },
    Q_ACTIVE: { label: 'Frage aktiv', hint: 'Antwortphase läuft', tone: 'live' },
    Q_LOCKED: { label: 'Gesperrt', hint: 'Host kann auflösen', tone: 'eval' },
    Q_REVEAL: { label: 'Reveal', hint: 'Antworten werden gezeigt', tone: 'eval' },
    SCOREBOARD: { label: 'Scoreboard', hint: 'Zwischenstand wird gezeigt', tone: 'eval' },
    SCOREBOARD_PRE_BLITZ: { label: 'Scoreboard', hint: 'Standings vor Fotosprint', tone: 'eval' },
    SCOREBOARD_PAUSE: { label: 'Pause', hint: 'Kurze Pause/im Scoreboard', tone: 'eval' },
    BLITZ: { label: 'Fotosprint', hint: 'Schnelle Sets laufen', tone: 'live' },
    BLITZ_READY: { label: 'Fotosprint bereit', hint: 'Teams machen sich bereit', tone: 'live' },
    BLITZ_BANNING: { label: 'Fotosprint Auswahl', hint: 'Teams bannen/waehlen', tone: 'eval' },
    BLITZ_SELECTION_COMPLETE: { label: 'Fotosprint Bereit', hint: 'Auswahl fertig - Starten?', tone: 'live' },
    BLITZ_CATEGORY_SHOWCASE: { label: 'Fotosprint Animation', hint: 'Kategorie-Showcase läuft', tone: 'live' },
    BLITZ_SET_INTRO: { label: 'Fotosprint Intro', hint: 'Naechstes Set', tone: 'live' },
    BLITZ_PLAYING: { label: 'Fotosprint', hint: 'Set laeuft', tone: 'live' },
    BLITZ_SET_END: { label: 'Fotosprint Ende', hint: 'Set beendet', tone: 'eval' },
    BLITZ_SCOREBOARD: { label: 'Fotosprint Scoreboard', hint: 'Standings nach Fotosprint', tone: 'eval' },
    BLITZ_PAUSE: { label: 'Fotosprint Pause', hint: 'Pause vor Frage 11', tone: 'eval' },
    POTATO: { label: 'Potato (entfernt)', hint: 'Deaktiviert', tone: 'eval' },
    AWARDS: { label: 'Awards', hint: 'Sieger werden gezeigt', tone: 'final' },
    RUNDLAUF_PAUSE: { label: 'K.O.-Rallye Pause', hint: 'K.O.-Rallye startet gleich', tone: 'eval' },
    RUNDLAUF_SCOREBOARD_PRE: { label: 'K.O.-Rallye Scoreboard', hint: 'Standings vor K.O.-Rallye', tone: 'eval' },
    RUNDLAUF_CATEGORY_SELECT: { label: 'K.O.-Rallye Auswahl', hint: 'Kategorien waehlen', tone: 'eval' },
    RUNDLAUF_SELECTION_COMPLETE: { label: 'K.O.-Rallye Bereit', hint: 'Auswahl fertig - Starten?', tone: 'live' },
    RUNDLAUF_CATEGORY_SHOWCASE: { label: 'K.O.-Rallye Animation', hint: 'Kategorie-Showcase läuft', tone: 'live' },
    RUNDLAUF_ROUND_INTRO: { label: 'K.O.-Rallye Intro', hint: 'Runde wird gestartet', tone: 'live' },
    RUNDLAUF_PLAY: { label: 'K.O.-Rallye', hint: 'Teams antworten reihum', tone: 'live' },
    RUNDLAUF_ROUND_END: { label: 'K.O.-Rallye Ende', hint: 'Runde beendet', tone: 'eval' },
    RUNDLAUF_SCOREBOARD_FINAL: { label: 'K.O.-Rallye Scoreboard', hint: 'K.O.-Rallye abgeschlossen', tone: 'final' },
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
    if (!roomCode) return;
    ensureAdminSession(roomCode).catch(() => {
      // Silent fail � endpoint may not exist on older backends
    });
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;
    // Load Fotoblitz timer settings
    const loadBlitzTimers = async () => {
      try {
        const token = localStorage.getItem('adminToken') || '';
        const response = await fetch(`${API_BASE}/rooms/${roomCode}/blitz-timers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setBlitzDisplayTimeSec(Math.round(data.displayTimeMs / 1000));
          setBlitzAnswerTimeSec(Math.round(data.answerTimeMs / 1000));
        }
      } catch (err) {
        console.error('Failed to load blitz timers:', err);
      }
    };
    loadBlitzTimers();
  }, [roomCode]);

  useEffect(() => {
    if (reconnectPromptedRef.current) return;
    if (!socketGameState) return;
    reconnectPromptedRef.current = true;
    if (socketGameState !== 'LOBBY') {
      setShowReconnectModal(true);
    }
  }, [socketGameState]);

  // Reset timer pause state when question ends
  useEffect(() => {
    if (normalizedGameState !== 'Q_ACTIVE') {
      setTimerIsPaused(false);
    }
  }, [normalizedGameState]);


  useEffect(() => {
    const socket = connectControlSocket();
    controlSocketRef.current = socket;
    const onQuizEndedHistory = (payload: { reason?: string; history?: typeof quizHistory }) => {
      if (payload?.history) {
        setQuizHistory(payload.history);
      }
    };
    socket.on('quizEnded', onQuizEndedHistory);
    return () => {
      socket.off('quizEnded', onQuizEndedHistory);
      socket.disconnect();
    };
  }, []);

  const connectedTeams = Object.keys(answers?.teams || {}).length;
  const answersCount = Object.keys(answers?.answers || {}).length;
  const teamsCount = connectedTeams || Object.keys(answers?.teams || {}).length;
  const unreviewedCount = Object.values(answers?.answers || {}).filter((a) => (a as any).isCorrect === undefined).length;
  const scoreboard = useMemo(
    () => (socketScores ? [...socketScores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) : []),
    [socketScores]
  );
  const scoreboardOverlayForced = socketScoreboardOverlayForced ?? false;
  const avatarsEnabled = socketAvatarsEnabled ?? true;
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
  const blitzPhase = blitz?.phase ?? 'IDLE';
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
  const timerActive = socketTimerEndsAt && socketTimerEndsAt > Date.now();

  function handleScoreboardAction() {
    if (!roomCode) return;
    if (normalizedGameState === 'AWARDS') {
      handleShowAwards();
      return;
    }
    if (!socketConnected) {
      setToast('Socket nicht verbunden');
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

  function handleToggleAvatars() {
    if (!roomCode || !socketConnected) return;
    socketEmit('host:toggleAvatars', { roomCode }, (resp?: { ok?: boolean; error?: string }) => {
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
        if (socketGameState !== 'QUESTION_INTRO') {
          handleNextQuestion();
        }
        return;
      }
      if (matchesHotkey(event, ['f17', 'digit5', 'numpad5', '5'])) {
        event.preventDefault();
        handleStepBack();
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
    emitBlitzEvent,
    handleNextQuestion,
    handleStepBack,
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
        const [res, pub, cozy] = await Promise.all([
          fetchQuizzes(),
          listPublishedQuizzes().catch(() => ({ quizzes: [] })),
          listCozyDrafts().catch(() => ({ drafts: [] }))
        ]);
        const merged: QuizTemplate[] = [
          ...(res.quizzes || []),
          ...(pub.quizzes || []).map((q) => ({ id: q.id, name: `${q.name} (Published)`, mode: 'ordered', questionIds: q.questionIds })),
          ...(cozy.drafts || []).map((d: any) => ({ id: d.id, name: `${d.title} (Draft)`, mode: 'cozy60', questionIds: [] }))
        ];
        const filtered = merged.filter((q) => (q as any).mode === 'cozy60' || isCozyPlayableQuiz(q));
        const usable = filtered.length ? filtered : merged; // Fallback: zeige auch kurze Demo-Quizzes, sonst ist die Liste leer
        setQuizzes(usable);
        if (usable.length) {
          setSelectedQuiz((prev) => {
            if (prev && usable.find((q) => q.id === prev)) return prev;
            const fallback = savedQuiz && usable.find((q) => q.id === savedQuiz)?.id;
            return fallback || usable[0]?.id || '';
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
        setViewPhase((prev) => {
          if (userViewPhase) return userViewPhase;
          if (hasQuestion) return 'quiz';
          return prev === 'quiz' ? 'quiz' : 'pre';
        });
        await fetchQuestions(); // just to warm cache
      } catch (err) {
        setToast((err as Error).message);
      }
    };
    load();
  }, [roomCode, userViewPhase]);

  // Load initial mute status
  useEffect(() => {
    if (!roomCode) return;
    fetchMuteStatus(roomCode)
      .then(res => setGlobalMuted(res.muted))
      .catch(() => {});
  }, [roomCode]);

  // Socket updates: separate effects to avoid re-running on every render
  useEffect(() => {
    if (socketQuestion === undefined) return;
    const nextQuestion = socketQuestion ?? null;
    setQuestion(nextQuestion);
    const hasQuestion = Boolean(nextQuestion);
    setPhase(hasQuestion ? 'question' : 'setup');
    // Change viewPhase to 'quiz' when we get a question
    if (hasQuestion) {
      changeViewPhase('quiz');
    }
  }, [socketQuestion]);

  useEffect(() => {
    if (socketMeta !== undefined) {
      setMeta(socketMeta ?? null);
    }
  }, [socketMeta]);

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

  // Ensure the question timer uses the configured duration instead of the backend default
  useEffect(() => {
    if (!roomCode || !socketQuestion?.id || socketGameState !== 'Q_ACTIVE') return;
    if (lastTimerAppliedQuestionId.current === socketQuestion.id) return;
    lastTimerAppliedQuestionId.current = socketQuestion.id;
    startTimer(roomCode, timerSeconds).catch(() => undefined);
  }, [roomCode, socketQuestion?.id, socketGameState, timerSeconds]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const id = window.setInterval(() => setCountdownTick((tick) => tick + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  // Toast when all teams have answered during Q_ACTIVE
  const allAnsweredToastShownRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (normalizedGameState !== 'Q_ACTIVE') { allAnsweredToastShownRef.current = null; return; }
    if (!teamsCount || answersCount < teamsCount) return;
    const key = `${question?.id}-${teamsCount}`;
    if (allAnsweredToastShownRef.current === key) return;
    allAnsweredToastShownRef.current = key;
    setToast(`✅ Alle ${teamsCount} Teams haben geantwortet!`);
    setTimeout(() => setToast(null), 3500);
  }, [answersCount, teamsCount, normalizedGameState, question?.id]);

  // Keyboard shortcuts for moderator
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input field
      if (isTypingTarget(e.target)) return;
      
      // Don't process if no room active
      if (!roomCode) return;
      
      // Space: Smart next action based on state
      if (e.code === 'Space') {
        e.preventDefault();
        if (socketGameState === 'Q_LOCKED') {
          handleReveal();
        } else if (socketGameState === 'Q_REVEAL' || socketGameState === 'Q_ACTIVE') {
          handleNextQuestion();
        } else if (socketGameState === 'LOBBY') {
          doAction(() => fetch(`/api/rooms/${roomCode}/start-quiz`, { method: 'POST' }), 'Quiz gestartet');
        }
      }
      
      // L: Lock question (stop answers)
      if (e.code === 'KeyL' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (socketGameState === 'Q_ACTIVE') {
          handleLockQuestion();
        }
      }
      
      // R: Reveal answer
      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (socketGameState === 'Q_LOCKED') {
          handleReveal();
        }
      }
      
      // T: Toggle timer
      if (e.code === 'KeyT' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (timerActive) {
          doAction(() => stopTimer(roomCode), 'Timer gestoppt');
        } else if (socketGameState === 'Q_ACTIVE') {
          doAction(() => startTimer(roomCode, timerSeconds), 'Timer gestartet');
        }
      }
      
      // N: Next question (force skip)
      if (e.code === 'KeyN' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleNextQuestion();
      }

      // U: Undo / one step back
      if (e.code === 'KeyU' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleStepBack();
      }
      
      // S: Show scoreboard
      if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        doAction(() => fetch(`${API_BASE}/rooms/${roomCode}/scoreboard`, { method: 'POST' }), 'Scoreboard angezeigt');
      }

      // F16: Toggle Mute
      if (e.code === 'F16') {
        e.preventDefault();
        handleToggleMute();
      }

      // F20: Toggle Pause
      if (e.code === 'F20') {
        e.preventDefault();
        handleTogglePause();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [roomCode, socketGameState, timerActive, timerSeconds]);

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
      setViewPhase((prev) => {
        if (userViewPhase) return userViewPhase;
        if (hasQuestion) return 'quiz';
        return prev === 'quiz' ? 'quiz' : 'pre';
      });
    } catch (err) {
      setToast((err as Error).message);
    }
  }

  // Answers are now managed by useLiveAnswers hook via polling
  
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
    // Send explicit end-quiz event to server to disconnect all teams
    if (roomCode) {
      const emitted = emitHost('host:endQuiz', { roomCode }, (resp?: { ok?: boolean; error?: string }) => {
        if (!resp?.ok) {
          console.error('Failed to end quiz:', resp?.error);
        }
        // Clear local state regardless
        setRoomCode('');
        setRoomInput('');
        localStorage.removeItem('moderatorRoom');
        setShowJoinScreen(false);
      });
      if (!emitted) {
        // Fallback if socket not available
        setRoomCode('');
        setRoomInput('');
        localStorage.removeItem('moderatorRoom');
        setShowJoinScreen(false);
      }
    } else {
      setRoomCode('');
      setRoomInput('');
      localStorage.removeItem('moderatorRoom');
      setShowJoinScreen(false);
    }
  };

  const handleCreateSession = async () => {
    if (!selectedQuiz) {
      setToast('Bitte zuerst ein Quiz ausw�hlen');
      return;
    }
    const socket = controlSocketRef.current;
    if (!socket || !socket.connected) {
      setToast(`Socket nicht verbunden (${socket ? 'disconnected' : 'null'}) – Seite neu laden`);
      return;
    }
    console.log('[handleCreateSession] emitting host:createSession', { quizId: selectedQuiz, socketId: socket.id, transport: (socket as any).io?.engine?.transport?.name });
    setCreatingSession(true);
    
        // Timeout nach 10 Sekunden falls keine Antwort kommt
        const timeoutId = setTimeout(() => {
          setCreatingSession(false);
          setToast('Session-Erstellung timeout - bitte erneut versuchen');
        }, 10000);
    
    socket.emit(
      'host:createSession',
      { quizId: selectedQuiz, language },
      async (resp?: { ok: boolean; roomCode?: string; error?: string }) => {
          clearTimeout(timeoutId);
        
        if (!resp?.ok || !resp.roomCode) {
          setCreatingSession(false);
          setToast(resp?.error || 'Session konnte nicht erstellt werden');
          return;
        }
        const nextCode = resp.roomCode || DEFAULT_ROOM_CODE;
        
        // Session ist bereits durch host:createSession konfiguriert (quiz + sprache)
        try {
          await ensureAdminSession(nextCode);
        } catch (err) {
          console.warn('Admin-Session konnte nicht erstellt werden:', err);
        }
        
        setRoomCode(nextCode);
        setRoomInput(nextCode);
        localStorage.setItem('moderatorRoom', nextCode);
        setShowJoinScreen(true);
        setShowSessionSetup(false);
        setCreatingSession(false);
        setToast(`Session ${nextCode} bereit � Quiz geladen!`);
        setTimeout(() => setToast(null), 2500);
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
    eventName: 'host:next' | 'host:lock' | 'host:reveal' | 'host:back',
    onSuccess?: () => void
  ) => {
    if (!roomCode) {
      setToast('Kein aktiver Roomcode');
      return;
    }
    const keyMap = {
      'host:next': 'next',
      'host:lock': 'lock',
      'host:reveal': 'reveal',
      'host:back': 'next'
    } as const;
    const key = keyMap[eventName];
    setActionState((prev) => ({ ...prev, [key]: true }));
    const emitted = emitHost(eventName, { roomCode }, (resp?: { ok: boolean; error?: string }) => {
      setActionState((prev) => ({ ...prev, [key]: false }));
      if (!resp?.ok) {
        setToast(resp?.error || 'Aktion fehlgeschlagen');
        return;
      }
      onSuccess?.();
    });
    if (!emitted) {
      setActionState((prev) => ({ ...prev, [key]: false }));
      setToast('Socket nicht verbunden');
    }
  };

  function handleNextQuestion() {
    sendHostCommand('host:next', async () => {
      await loadCurrentQuestion();
      // Answers will be updated by useLiveAnswers polling
    });
  }

  function handleLockQuestion() {
    sendHostCommand('host:lock', async () => {
      // Answers will be updated by useLiveAnswers polling
    });
  }

  function handleReveal() {
    sendHostCommand('host:reveal', async () => {
      // Answers will be updated by useLiveAnswers polling
    });
  }

  function handleStepBack() {
    sendHostCommand('host:back', async () => {
      await loadCurrentQuestion();
      setToast('Ein Schritt zurück');
      setTimeout(() => setToast(null), 1800);
    });
  }

  function handleSkipQuestion() {
    if (!roomCode) {
      setToast('Kein aktiver Roomcode');
      return;
    }
    const emitted = emitHost('host:skipQuestion', { roomCode }, (resp?: { ok?: boolean; error?: string }) => {
      if (!resp?.ok) {
        setToast(resp?.error || 'Überspringen fehlgeschlagen');
      }
    });
    if (!emitted) setToast('Socket nicht verbunden');
  }

  function handlePauseTimer() {
    if (!roomCode) return;
    const emitted = emitHost('host:pauseTimer', { roomCode }, (resp?: { ok?: boolean; error?: string }) => {
      if (resp?.ok) {
        setTimerIsPaused(true);
      } else {
        setToast(resp?.error || 'Timer pausieren fehlgeschlagen');
      }
    });
    if (!emitted) setToast('Socket nicht verbunden');
  }

  function handleResumeTimer() {
    if (!roomCode) return;
    const emitted = emitHost('host:resumeTimer', { roomCode }, (resp?: { ok?: boolean; error?: string }) => {
      if (resp?.ok) {
        setTimerIsPaused(false);
      } else {
        setToast(resp?.error || 'Timer fortsetzen fehlgeschlagen');
      }
    });
    if (!emitted) setToast('Socket nicht verbunden');
  }

  function handleExtendTimer() {
    if (!roomCode) return;
    const emitted = emitHost('host:extendTimer', { roomCode, addSeconds: 30 }, (resp?: { ok?: boolean; error?: string }) => {
      if (!resp?.ok) {
        setToast(resp?.error || 'Timer verlängern fehlgeschlagen');
      }
    });
    if (!emitted) setToast('Socket nicht verbunden');
  }

  function handleToggleMute() {
    if (!roomCode) return;
    doAction(async () => {
      const result = await toggleMute(roomCode);
      setGlobalMuted(result.muted);
      return result;
    }, globalMuted ? 'Ton an' : 'Ton aus');
  }

  function handleTogglePause() {
    if (!roomCode) return;
    doAction(async () => {
      const result = await togglePause(roomCode);
      setIsPaused(result.paused);
      return result;
    }, isPaused ? 'Fortgesetzt' : 'Pausiert');
  }

  function handleReconnectSession() {
    setShowReconnectModal(false);
  }

  function handleRestartSession() {
    if (!roomCode) {
      setToast('Roomcode fehlt');
      return;
    }
    setShowReconnectModal(false);
    const emitted = emitHost('host:restartSession', { roomCode }, (resp?: { ok?: boolean; error?: string }) => {
      if (!resp?.ok) {
        setToast(resp?.error || 'Restart fehlgeschlagen');
        return;
      }
      loadCurrentQuestion().catch(() => undefined);
      // Answers will be updated by useLiveAnswers polling
    });
    if (!emitted) {
      setToast('Socket nicht verbunden');
    }
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
    if (blitzActionBusy) return;
    if (!roomCode) {
      setToast('Roomcode fehlt');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    setBlitzActionBusy(true);
    const emitted = emitHost(eventName, { roomCode, ...(payload || {}) }, (resp?: { ok?: boolean; error?: string }) => {
      setBlitzActionBusy(false);
      if (!resp?.ok) {
        setToast(resp?.error || 'Aktion fehlgeschlagen');
        setTimeout(() => setToast(null), 2200);
        return;
      }
      onSuccess?.();
    });
    if (!emitted) {
      setBlitzActionBusy(false);
      setToast('Socket nicht verbunden');
      setTimeout(() => setToast(null), 2000);
    }
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
    if (!socketConnected) {
      setToast('Socket nicht verbunden');
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
        const key = raw !== undefined ? String(raw) : '—';
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
        return { hotkey: '3', label: 'AUFDECKEN', detail: 'Auflösung zeigen', context: 'Antworten geprüft' };
      case 'Q_REVEAL':
        if (nextStage === 'BLITZ') return { hotkey: '1', label: 'WEITER', detail: 'Zu Fotosprint wechseln', context: 'Segment 1 beendet' };
        return { hotkey: '1', label: 'WEITER', detail: 'Zur nächsten Frage', context: 'Reveal beendet' };
      case 'SCOREBOARD_PRE_BLITZ':
        return { hotkey: '1', label: 'WEITER', detail: 'Fotosprint starten', context: 'Standings vor Fotosprint' };
      case 'SCOREBOARD_PAUSE':
        if (nextStage === 'BLITZ') return { hotkey: '1', label: 'WEITER', detail: 'Fotosprint starten', context: 'Scoreboard aktiv' };
        if (nextStage === 'Q11') return { hotkey: '1', label: 'WEITER', detail: 'Segment 2 starten', context: 'Scoreboard aktiv' };
        return { ...base, context: 'Scoreboard aktiv' };
      case 'BLITZ':
      case 'BLITZ_READY':
      case 'BLITZ_BANNING':
      case 'BLITZ_SELECTION_COMPLETE':
      case 'BLITZ_CATEGORY_SHOWCASE':
      case 'BLITZ_SET_INTRO':
      case 'BLITZ_PLAYING':
      case 'BLITZ_SET_END':
      case 'BLITZ_SCOREBOARD':
      case 'BLITZ_PAUSE':
        return { hotkey: '1', label: 'WEITER', detail: 'Fotosprint', context: `Set ${(blitz?.setIndex ?? -1) + 1}/3` };
      case 'POTATO':
        return { hotkey: '-', label: 'Potato deaktiviert', detail: 'Nicht verwendet', context: '�' };
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
    blitz?.phase
  ]);

  const catKey = (question as any)?.category as keyof typeof categoryColors;
  const catColor = categoryColors[catKey] ?? '#6dd5fa';
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
      primaryColor={undefined}
      onNext={handleNextQuestion}
      onLock={handleLockQuestion}
      onReveal={handleReveal}
      ensureAdminSession={ensureAdminSession}
    />
  );

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
          <div style={{ fontWeight: 800, marginBottom: 6 }}>K.O.-Rallye Pause</div>
          <p style={{ color: '#6b7280' }}>K.O.-Rallye startet gleich.</p>
        </section>
      );
    }

    if (normalizedGameState === 'RUNDLAUF_SCOREBOARD_PRE') {
      return (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Scoreboard vor K.O.-Rallye</div>
          <p style={{ color: '#6b7280' }}>Platzierung entscheidet die Auswahl.</p>
          <div style={{ marginTop: 10 }}>{renderCompactScoreboard('Standings')}</div>
        </section>
      );
    }

    if (normalizedGameState === 'RUNDLAUF_CATEGORY_SELECT') {
      const banOptions = pool.filter((entry) => !bans.has(entry.id) && entry.id !== pinned?.id);
      const pickOptions = pool.filter((entry) => !bans.has(entry.id));
      return (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Kategorien waehlen</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
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
                      borderColor: isPinned ? 'rgba(59,130,246,0.5)' : '#e5e7eb',
                      background: isPinned ? 'rgba(59,130,246,0.1)' : '#f3f4f6'
                    }}
                  >
                    {entry.title} {label ? `(${label})` : ''}
                  </span>
                );
              })}
            </div>
            {selectedTitles.length > 0 && (
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Auswahl: {selectedTitles.map((title, idx) => `R${idx + 1}: ${title}`).join(' � ')}
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
                  style={{ ...inputStyle, width: 'auto', background: 'rgba(22,163,74,0.1)', borderColor: 'rgba(22,163,74,0.4)', color: '#15803d' }}
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

    if (normalizedGameState === 'RUNDLAUF_SELECTION_COMPLETE') {
      return (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Auswahl abgeschlossen</div>
          <div style={{ fontSize: 13, color: '#374151' }}>
            {selectedTitles.length > 0
              ? selectedTitles.map((title, idx) => `R${idx + 1}: ${title}`).join(' | ')
              : 'Kategorien bereit'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'linear-gradient(135deg, #63e5ff, #60a5fa)', color: '#0b1020' }}
              onClick={handleNextQuestion}
            >
              SHOWCASE STARTEN
            </button>
          </div>
        </section>
      );
    }

    if (normalizedGameState === 'RUNDLAUF_CATEGORY_SHOWCASE') {
      return (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Kategorie-Showcase</div>
          <div style={{ fontSize: 13, color: '#374151' }}>Animation laeuft auf dem Beamer...</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'rgba(148,163,184,0.16)' }}
              onClick={handleNextQuestion}
            >
              UEBERSPRINGEN
            </button>
          </div>
        </section>
      );
    }

    if (normalizedGameState === 'RUNDLAUF_ROUND_INTRO') {
      return (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>K.O.-Rallye Runde {roundLabel}</div>
          <div style={{ fontSize: 13, color: '#374151' }}>Kategorie: {currentCategoryTitle || 'n/a'}</div>
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
      const remainingCount = rundlauf?.remainingAnswers?.length ?? 0;
      const totalCount = rundlauf?.availableAnswers?.length ?? 0;
      return (
        <section style={{ ...card, marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>K.O.-Rallye live</div>
          <div style={{ fontSize: 13, color: '#374151' }}>
            Runde {roundLabel} � Kategorie: {currentCategoryTitle || 'n/a'}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={statChip}>Aktiv: {activeTeamName || 'n/a'}</span>
            {rundlaufTimeLeft !== null && <span style={statChip}>Restzeit {rundlaufTimeLeft}s</span>}
            <span style={statChip}>Antworten: {rundlauf?.usedAnswers?.length ?? 0}/{totalCount}</span>
            {remainingCount > 0 && <span style={{...statChip, background: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)', color: '#1d4ed8'}}>�brig: {remainingCount}</span>}
          </div>

          {/* Remaining answers hint */}
          {totalCount > 0 && remainingCount > 0 && remainingCount <= 5 && (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: '#1d4ed8' }}>Noch {remainingCount} Antwort{remainingCount !== 1 ? 'en' : ''} �brig:</div>
              <div style={{ fontSize: 12, color: '#374151', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(rundlauf?.remainingAnswers ?? []).slice(0, 10).map((answer, idx) => (
                  <span key={idx} style={{ background: 'rgba(148,163,184,0.2)', padding: '4px 8px', borderRadius: 4 }}>
                    {answer}
                  </span>
                ))}
                {remainingCount > 10 && <span style={{ color: '#6b7280' }}>... +{remainingCount - 10} mehr</span>}
              </div>
            </div>
          )}

          {lastAttempt && (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                Letzter Versuch: {lastAttemptTeamName || lastAttempt.teamId}
              </div>
              <div style={{ color: '#111827', fontSize: 14 }}>{lastAttempt.text || '�'}</div>
              {lastAttemptLabel && <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>{lastAttemptLabel}</div>}
              
              {/* Validation hint: show if answer is similar to any available answer */}
              {lastAttempt.verdict === 'invalid' && lastAttempt.reason === 'not-listed' && rundlauf?.availableAnswers && (
                <div style={{ marginTop: 8, padding: 8, background: 'rgba(248,113,113,0.1)', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginBottom: 4 }}>�hnliche Antworten:</div>
                  <div style={{ fontSize: 12, color: '#fecaca', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {rundlauf.availableAnswers.slice(0, 5).map((answer, idx) => (
                      <span key={idx} style={{ background: 'rgba(248,113,113,0.2)', padding: '3px 6px', borderRadius: 3 }}>
                        {answer}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'rgba(34,197,94,0.18)', borderColor: 'rgba(34,197,94,0.4)', color: '#15803d' }}
              onClick={() => handleRundlaufMark('ok')}
            >
              OK
            </button>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'rgba(250,204,21,0.16)', borderColor: 'rgba(250,204,21,0.4)', color: '#92400e' }}
              onClick={() => handleRundlaufMark('dup')}
            >
              DUP
            </button>
            <button
              style={{ ...inputStyle, width: 'auto', background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.4)', color: '#dc2626' }}
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
              style={{ ...inputStyle, width: 'auto', background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.4)', color: '#dc2626' }}
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
          <div style={{ color: '#374151' }}>
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
          <div style={{ fontWeight: 800, marginBottom: 6 }}>K.O.-Rallye Scoreboard</div>
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
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              {used}/{limit}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#374151' }}>
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
              <option value="">Theme wählen</option>
              {pool.map((theme) => (
                <option key={`${teamId}-${theme.id}`} value={theme.id}>
                  {theme.title}
                </option>
              ))}
            </select>
            <button
              style={{ ...inputStyle, width: 'auto' }}
              disabled={disabled || blitzActionBusy}
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
            <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: 14 }}>Fotosprint</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Phase: {phase} · Set {Math.max(0, setIndex + 1)}/{Math.max(3, selected.length || 3)}
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
              disabled={blitzActionBusy}
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
              {language === 'de' ? 'Fotosprint bereit' : 'Photo sprint ready'}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
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
              {pool.length === 0 && <span style={{ color: '#6b7280' }}>Keine Themen</span>}
            </div>
            <button
              style={{ ...inputStyle, width: 'auto' }}
              disabled={blitzActionBusy}
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
              {pool.length === 0 && <span style={{ color: '#6b7280' }}>Keine Themen</span>}
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
                      disabled={!blitzPickDraft || blitzActionBusy}
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
              disabled={Boolean(lastTeamId && !pinnedTheme) || blitzActionBusy}
              onClick={() => emitBlitzEvent('host:confirmBlitzThemes')}
            >
              Themen auslosen
            </button>
          </div>
        )}

        {selected.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Ausgewählte Themen</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {selected.map((theme, idx) => (
                <span
                  key={`blitz-theme-${theme.id}-${idx}`}
                  style={{
                    ...statChip,
                    background: idx === setIndex ? 'rgba(59,130,246,0.12)' : '#f3f4f6',
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
          <div style={{ marginTop: 10, fontSize: 13, color: '#374151' }}>
            Runde startet gleich. Thema: {currentTheme?.title || '-'}
          </div>
        )}

        {phase === 'SELECTION_COMPLETE' && (
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 700, color: '#4ade80' }}>Auswahl fertig!</div>
            <div style={{ fontSize: 12, color: '#374151' }}>
              Die 3 Themen sind ausgelost. Jetzt kann die erste Runde starten.
            </div>
            <button
              style={{
                ...inputStyle,
                background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                color: '#0b1020',
                fontWeight: 700
              }}
              disabled={blitzActionBusy}
              onClick={() => emitBlitzEvent('host:blitzStartSet')}
            >
              ▶ Set starten
            </button>
          </div>
        )}

        {phase === 'PLAYING' && (
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 700 }}>
              Set {Math.max(1, setIndex + 1)} · Thema: {currentTheme?.title || '-'}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Einsendungen: {submissions.length}/{scoreboard.length}
            </div>
            
            {/* Blitz Antworten anzeigen */}
            {(blitz?.answers && Object.keys(blitz.answers).length > 0) && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Abgeschickte Antworten:</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {Object.entries(blitz.answers).map(([teamId, teamAnswers]) => {
                    const teamName = teamLookup[teamId]?.name || teamId;
                    return (
                      <div
                        key={`blitz-ans-${teamId}`}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: 12,
                          padding: '8px 10px',
                          background: '#f8fafc'
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{teamName}</div>
                        <div style={{ fontSize: 12, color: '#374151' }}>
                          {teamAnswers.length > 0 ? teamAnswers.join(', ') : 'Keine Antworten'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
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
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: 10,
                    background: '#f9fafb',
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
                  {item.prompt && <div style={{ fontSize: 12, color: '#374151' }}>{item.prompt}</div>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                style={{ ...inputStyle, width: 'auto' }}
                disabled={blitzActionBusy}
                onClick={() => emitBlitzEvent('host:lockBlitzSet')}
              >
                Set sperren
              </button>
              <button
                style={{ ...inputStyle, width: 'auto' }}
                disabled={blitzActionBusy}
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
              disabled={blitzActionBusy}
              onClick={() => emitBlitzEvent('host:blitzStartSet')}
            >
              {setIndex < 0 ? 'Set starten' : 'Nächstes Set starten'}
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
            <span style={{ ...statChip, background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.3)', color: '#1d4ed8' }}>
              Teams: {totalTeams || 0}
            </span>
            <span style={{ ...statChip, background: 'rgba(22,163,74,0.08)', borderColor: 'rgba(22,163,74,0.3)', color: '#15803d' }}>
              Connected: {connectedTeams || 0}
            </span>
          </div>
        </div>
        {dataset.length === 0 ? (
          <div style={{ padding: 10, borderRadius: 12, border: '1px dashed #d1d5db', color: '#6b7280' }}>
            Noch keine Teams verbunden.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {dataset.map((entry, idx) => (
              <div
                key={`compact-score-${entry.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto auto',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)'
                }}
              >
                <span style={{ fontWeight: 700 }}>{idx + 1}.</span>
                <span>{entry.name}</span>
                <span style={{ fontWeight: 700 }}>{entry.score ?? 0}</span>
                <button
                  style={{
                    ...inputStyle,
                    background: 'rgba(239,68,68,0.14)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.4)',
                    width: 'auto',
                    padding: '4px 8px',
                    fontSize: 11
                  }}
                  onClick={() =>
                    doAction(async () => {
                      await kickTeam(roomCode, entry.id);
                    }, 'Team entfernt')
                  }
                  title="Team entfernen"
                >
                  Kick
                </button>
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
          border: '1px solid rgba(251,191,36,0.5)',
          background: '#fffbeb'
        }}
      >
        <summary
          style={{
            cursor: 'pointer',
            fontWeight: 800,
            color: '#92400e',
            listStyle: 'none',
            outline: 'none',
            appearance: 'none',
            WebkitAppearance: 'none'
          }}
        >
          Hinweise ({structuralWarnings.length})
        </summary>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#78350f', fontSize: 13 }}>
          {structuralWarnings.map((warning, idx) => (
            <li key={`${warning}-${idx}`}>{warning}</li>
          ))}
        </ul>
      </details>
    );
  };

  const renderNextActionHint = () => {
    if (!nextActionHint) return null;
    const actionMap: Record<string, { handler: () => void; busy: boolean; bg: string; shadow: string; hotkeyLabel: string }> = {
      'WEITER':    { handler: handleNextQuestion,  busy: actionState.next,   bg: '#16a34a', shadow: '#15803d', hotkeyLabel: '[SPACE]' },
      'START':     { handler: handleNextQuestion,  busy: actionState.next,   bg: '#16a34a', shadow: '#15803d', hotkeyLabel: '[SPACE]' },
      'SPERREN':   { handler: handleLockQuestion,  busy: actionState.lock,   bg: '#d97706', shadow: '#b45309', hotkeyLabel: '[2]' },
      'AUFDECKEN': { handler: handleReveal,        busy: actionState.reveal, bg: '#b45309', shadow: '#92400e', hotkeyLabel: '[3]' },
    };
    const action = actionMap[nextActionHint.label];
    const bg = action?.bg ?? '#1e3a5f';
    const shadow = action?.shadow ?? '#0f2040';
    const hotkeyLabel = action?.hotkeyLabel ?? `[${nextActionHint.hotkey}]`;
    const busy = action?.busy ?? false;
    return (
      <button
        onClick={busy ? undefined : (action?.handler ?? undefined)}
        disabled={busy}
        style={{
          width: '100%',
          padding: '20px 22px',
          borderRadius: 18,
          border: 'none',
          background: busy ? '#e5e7eb' : bg,
          color: '#ffffff',
          cursor: busy ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          display: 'grid',
          gap: 6,
          boxShadow: busy ? 'none' : `0 6px 0 ${shadow}, 0 16px 32px rgba(0,0,0,0.35)`,
          transition: 'transform 0.1s ease, box-shadow 0.1s ease',
          opacity: busy ? 0.65 : 1,
          minHeight: 90
        }}
        onMouseDown={(e) => { if (!busy) e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = `0 3px 0 ${shadow}`; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 6px 0 ${shadow}, 0 16px 32px rgba(0,0,0,0.35)`; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 6px 0 ${shadow}, 0 16px 32px rgba(0,0,0,0.35)`; }}
      >
        <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.18em', textTransform: 'uppercase' }}>NÄCHSTER SCHRITT</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', fontFamily: 'monospace', flexShrink: 0 }}>
            {hotkeyLabel}
          </span>
          <span style={{ fontWeight: 900, fontSize: 28, letterSpacing: '0.02em' }}>
            {busy ? `${nextActionHint.label} …` : nextActionHint.label}
          </span>
        </div>
        {nextActionHint.context && (
          <div style={{ fontSize: 12, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {nextActionHint.context}
          </div>
        )}
      </button>
    );
  };

  const renderReconnectModal = () => {
    if (!showReconnectModal) return null;
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2,6,23,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}
      >
        <div style={{ ...card, maxWidth: 420, width: '92%', textAlign: 'left' }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>Session aktiv</div>
          <div style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
            Eine Session läuft bereits. Willst du reconnecten oder neu starten?
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <button
              style={{ ...inputStyle, background: 'linear-gradient(135deg, #63e5ff, #60a5fa)', color: '#0b1020' }}
              onClick={handleReconnectSession}
            >
              Reconnect
            </button>
            <button
              style={{ ...inputStyle, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)' }}
              onClick={handleRestartSession}
            >
              Restart (setzt Lobby)
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSpecialStageHints = () => {
    const blitzStates = new Set(['BLITZ_READY', 'BLITZ_BANNING', 'BLITZ_SELECTION_COMPLETE', 'BLITZ_CATEGORY_SHOWCASE', 'BLITZ_SET_INTRO', 'BLITZ_PLAYING', 'BLITZ_SET_END']);
    const rundlaufStates = new Set([
      'RUNDLAUF_PAUSE',
      'RUNDLAUF_SCOREBOARD_PRE',
      'RUNDLAUF_CATEGORY_SELECT',
      'RUNDLAUF_SELECTION_COMPLETE',
      'RUNDLAUF_CATEGORY_SHOWCASE',
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
          <div style={{ fontSize: 12, color: '#6b7280', letterSpacing: '0.16em' }}>FOTOSPRINT STATUS</div>
          <div style={{ marginTop: 6, fontSize: 13, color: '#111827' }}>Top bans: {topBans}/2</div>
          <div style={{ fontSize: 13, color: '#111827' }}>Last pick: {pinned ?? '-'}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>{orderLabel}</div>
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
          <div style={{ fontSize: 12, color: '#6b7280', letterSpacing: '0.16em' }}>RUNDLAUF STATUS</div>
          <div style={{ marginTop: 6, fontSize: 13, color: '#111827' }}>Top bans: {topBans}/2</div>
          <div style={{ fontSize: 13, color: '#111827' }}>Last pick: {pinned ?? '-'}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>{orderLabel}</div>
        </div>
      );
    }
    return null;
  };

  const renderPrimaryControls = () => {
    if (!roomCode) return null;
    const formatAnswerValue = (value: unknown): string => {
      if (value === null || value === undefined) return '—';
      if (typeof value === 'string') return value.trim() || '—';
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      if (Array.isArray(value)) return value.join(', ');
      if (typeof value === 'object') {
        const maybeOrder = value as { order?: unknown[] };
        if (Array.isArray(maybeOrder.order)) return maybeOrder.order.join(' → ');
        return JSON.stringify(value);
      }
      return String(value);
    };

    const answerRows = Object.entries(answers?.answers || {})
      .map(([teamId, answerEntry]) => {
        const entry = answerEntry as any;
        const raw = entry?.answer ?? entry?.value;
        return {
          teamId,
          teamName: teamLookup[teamId]?.name || answers?.teams?.[teamId]?.name || teamId,
          answer: formatAnswerValue(raw),
          isCorrect: entry?.isCorrect as boolean | undefined
        };
      })
      .sort((a, b) => a.teamName.localeCompare(b.teamName));

    const nextAction = (() => {
      const label = nextActionHint?.label ?? 'WEITER';
      if (label === 'SPERREN') {
        return { onClick: handleLockQuestion, busy: actionState.lock, hotkey: '[2]', style: 'bg-[#d97706] ring-[#d97706]/40' };
      }
      if (label === 'AUFDECKEN') {
        return { onClick: handleReveal, busy: actionState.reveal, hotkey: '[3]', style: 'bg-[#b10a6c] ring-[#f05fb2]/40' };
      }
      return { onClick: handleNextQuestion, busy: actionState.next, hotkey: '[SPACE]', style: 'bg-[#b10a6c] ring-[#f05fb2]/40' };
    })();

    const adjustTimer = (delta: number) => {
      const val = Math.max(5, Math.min(300, timerSeconds + delta));
      setTimerSeconds(val);
      localStorage.setItem('moderatorTimerSeconds', String(val));
    };
    const noAnswers = answersCount === 0 && normalizedGameState === 'Q_ACTIVE';
    const connectedCount = connectedTeams || teamsCount || 0;
    const funFactDe = ((question as any)?.funFactDe ?? (question as any)?.funFact ?? '').trim();
    const funFactEn = ((question as any)?.funFactEn ?? '').trim();
    const hasFunFact = Boolean(funFactDe || funFactEn);
    return (
      <section className="moderator-primary-controls z-10 mt-3 rounded-3xl border border-[#f05fb244] bg-[#0b2343]/95 p-3 shadow-[0_20px_40px_rgba(0,0,0,0.45)] backdrop-blur md:sticky md:top-2">
        <div className="mb-3 rounded-2xl border border-[#f05fb233] bg-[#050505]/55 p-3">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#f05fb2]">Aktuelle Frage</p>
          <p className="text-lg font-extrabold leading-tight text-[#ffe4f2] sm:text-2xl">{question?.question ?? 'Keine Frage aktiv'}</p>
          {hasFunFact && (
            <div className="mt-2 rounded-xl border border-[#f05fb244] bg-[#0b2343]/55 p-2">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#ffb8df]">Moderationsinfo (DE / EN)</p>
              <p className="mt-1 text-xs font-semibold text-[#ffd1e8]"><span className="text-[#ff9ed1]">DE:</span> {funFactDe || '—'}</p>
              <p className="mt-1 text-xs font-semibold text-[#cfe8ff]"><span className="text-[#93c5fd]">EN:</span> {funFactEn || '—'}</p>
            </div>
          )}
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#ffb8df]">Lösung</p>
          <p className="text-base font-black text-[#ffd1e8] sm:text-xl">{socketSolution || answers?.solution || '—'}</p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.4fr_1fr]">
          <button
            onClick={nextAction.busy ? undefined : nextAction.onClick}
            disabled={nextAction.busy}
            className={`moderator-next-action min-h-[132px] rounded-3xl p-4 text-left text-white shadow-[0_12px_28px_rgba(0,0,0,0.4)] ring-2 transition touch-manipulation sm:min-h-[160px] sm:p-5 ${nextAction.style} ${nextAction.busy ? 'cursor-not-allowed opacity-60' : 'hover:scale-[1.01] active:scale-[0.99]'}`}
          >
            <div className="mb-3 inline-flex rounded-lg bg-black/30 px-3 py-1 text-xs font-black tracking-[0.14em]">NÄCHSTER SCHRITT</div>
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-white/20 px-3 py-1 font-mono text-sm font-black">{nextAction.hotkey}</span>
              <span className="moderator-next-action-label text-2xl font-black tracking-wide sm:text-3xl xl:text-4xl">{nextAction.busy ? `${nextActionHint.label} …` : nextActionHint.label}</span>
            </div>
            {nextActionHint.context && <p className="moderator-next-action-context mt-3 text-sm font-semibold uppercase tracking-[0.1em] text-white/80">{nextActionHint.context}</p>}
          </button>

          <div className="moderator-answers-panel rounded-3xl border border-[#f05fb233] bg-[#050505]/55 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f05fb2]">Antworten-Kontrolle</p>
              <span className="rounded-md bg-[#f05fb21a] px-2 py-1 text-xs font-bold text-[#ffd1e8]">{answersCount}/{teamsCount || 0}</span>
            </div>
            <div className="moderator-answer-scroll max-h-[44vh] space-y-2 overflow-y-auto pr-1 sm:max-h-[320px] lg:max-h-[360px]">
              {answerRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#f05fb244] p-4 text-center text-sm text-[#ffc1e3]">Noch keine Antworten</div>
              ) : (
                answerRows.map((row) => {
                  const autoCorrect = row.isCorrect === true;
                  const autoWrong = row.isCorrect === false;
                  const needsReview = row.isCorrect === undefined;
                  return (
                    <div
                      key={row.teamId}
                      className="moderator-answer-row grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl p-2"
                      style={{
                        background: autoCorrect ? 'rgba(20,83,45,0.7)' : autoWrong ? 'rgba(80,20,30,0.7)' : 'rgba(11,35,67,0.8)',
                        border: autoCorrect ? '1px solid rgba(74,222,128,0.35)' : autoWrong ? '1px solid rgba(248,113,113,0.35)' : '1px solid rgba(240,95,178,0.18)',
                      }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-[#ffe4f2]">{row.teamName}</p>
                        <p className="truncate text-xs" style={{ color: autoCorrect ? '#86efac' : autoWrong ? '#fca5a5' : 'rgba(255,209,232,0.85)' }}>{row.answer}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {needsReview ? (
                          <>
                            <button
                              className="min-h-[42px] min-w-[42px] rounded-md border border-[#67b58f] bg-[#1f6b50]/65 px-2.5 py-1 text-xs font-black text-[#d6ffe8] hover:bg-[#24805e] touch-manipulation"
                              onClick={() => doAction(async () => { await hookOverrideAnswer(row.teamId, true); }, 'Als richtig markiert')}
                              title="Richtig"
                            >✓</button>
                            <button
                              className="min-h-[42px] min-w-[42px] rounded-md border border-[#d68598] bg-[#7e2e46]/65 px-2.5 py-1 text-xs font-black text-[#ffd6df] hover:bg-[#9d3858] touch-manipulation"
                              onClick={() => doAction(async () => { await hookOverrideAnswer(row.teamId, false); }, 'Als falsch markiert')}
                              title="Falsch"
                            >✕</button>
                          </>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className="rounded-md px-2.5 py-1 text-sm font-black"
                              style={{ background: autoCorrect ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)', color: autoCorrect ? '#4ade80' : '#f87171' }}
                            >{autoCorrect ? '✓ Richtig' : '✕ Falsch'}</span>
                            <div className="flex gap-1">
                              <button
                                className="rounded px-1.5 py-0.5 text-[10px] font-bold text-[#86efac]/60 hover:text-[#86efac] touch-manipulation"
                                onClick={() => doAction(async () => { await hookOverrideAnswer(row.teamId, true); }, 'Als richtig markiert')}
                                title="Override: Richtig"
                              >✓</button>
                              <button
                                className="rounded px-1.5 py-0.5 text-[10px] font-bold text-[#fca5a5]/60 hover:text-[#fca5a5] touch-manipulation"
                                onClick={() => doAction(async () => { await hookOverrideAnswer(row.teamId, false); }, 'Als falsch markiert')}
                                title="Override: Falsch"
                              >✕</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="moderator-secondary-actions mt-3 grid gap-2 sm:grid-cols-6">
          <button
            onClick={handleStepBack}
            className="min-h-[48px] rounded-xl border border-[#8aa0ff] bg-[#273b8a]/80 px-3 py-2 text-left text-sm font-extrabold text-[#dde5ff] touch-manipulation"
          >
            Zurück <span className="ml-2 rounded bg-black/25 px-2 py-0.5 font-mono text-[11px]">[U/F17/5]</span>
          </button>
          <button
            onClick={handleLockQuestion}
            disabled={actionState.lock || normalizedGameState !== 'Q_ACTIVE'}
            className="min-h-[48px] rounded-xl border border-[#d7a46f] bg-[#8b5e2b]/75 px-3 py-2 text-left text-sm font-extrabold text-[#ffe9d1] touch-manipulation disabled:opacity-50"
          >
            Sperren <span className="ml-2 rounded bg-black/25 px-2 py-0.5 font-mono text-[11px]">[2]</span>
          </button>
          <button
            onClick={handleReveal}
            disabled={actionState.reveal || (normalizedGameState !== 'Q_LOCKED' && normalizedGameState !== 'Q_REVEAL')}
            className="min-h-[48px] rounded-xl border border-[#f05fb2] bg-[#b10a6c]/75 px-3 py-2 text-left text-sm font-extrabold text-[#ffe4f2] touch-manipulation disabled:opacity-50"
          >
            Aufdecken <span className="ml-2 rounded bg-black/25 px-2 py-0.5 font-mono text-[11px]">[3]</span>
          </button>
          {(normalizedGameState === 'Q_ACTIVE' || normalizedGameState === 'Q_LOCKED') && (
            <button
              onClick={handleSkipQuestion}
              className="min-h-[48px] rounded-xl border border-[#64748b] bg-[#1e293b]/80 px-3 py-2 text-left text-sm font-extrabold text-[#94a3b8] touch-manipulation"
            >
              ⏭ Überspringen
            </button>
          )}
          {normalizedGameState === 'Q_ACTIVE' && (
            <>
              {timerIsPaused ? (
                <button
                  onClick={handleResumeTimer}
                  className="min-h-[48px] rounded-xl border border-[#86efac] bg-[#14532d]/80 px-3 py-2 text-left text-sm font-extrabold text-[#bbf7d0] touch-manipulation"
                >
                  ▶ Weiter
                </button>
              ) : (
                <button
                  onClick={handlePauseTimer}
                  className="min-h-[48px] rounded-xl border border-[#fde68a] bg-[#713f12]/80 px-3 py-2 text-left text-sm font-extrabold text-[#fef9c3] touch-manipulation"
                >
                  ⏸ Pause
                </button>
              )}
              <button
                onClick={handleExtendTimer}
                className="min-h-[48px] rounded-xl border border-[#a5b4fc] bg-[#1e1b4b]/80 px-3 py-2 text-left text-sm font-extrabold text-[#e0e7ff] touch-manipulation"
              >
                +30s
              </button>
            </>
          )}
          <button
            onClick={handleScoreboardAction}
            className="min-h-[48px] rounded-xl border border-[#5a93c7] bg-[#254a78]/80 px-3 py-2 text-left text-sm font-extrabold text-[#cfe8ff] touch-manipulation"
          >
            Scoreboard <span className="ml-2 rounded bg-black/25 px-2 py-0.5 font-mono text-[11px]">[F4/F6]</span>
          </button>
          <button
            onClick={handleToggleMute}
            className={`min-h-[48px] rounded-xl border px-3 py-2 text-left text-sm font-extrabold touch-manipulation ${
              globalMuted 
                ? 'border-red-500 bg-red-900/75 text-red-100' 
                : 'border-green-500 bg-green-900/75 text-green-100'
            }`}
          >
            {globalMuted ? '🔇 Muted' : '🔊 Sound'} <span className="ml-2 rounded bg-black/25 px-2 py-0.5 font-mono text-[11px]">[F16]</span>
          </button>
          <button
            onClick={handleTogglePause}
            className={`min-h-[48px] rounded-xl border px-3 py-2 text-left text-sm font-extrabold touch-manipulation ${
              isPaused 
                ? 'border-yellow-500 bg-yellow-900/75 text-yellow-100' 
                : 'border-purple-500 bg-purple-900/75 text-purple-100'
            }`}
          >
            {isPaused ? '▶️ Resume' : '⏸️ Pause'} <span className="ml-2 rounded bg-black/25 px-2 py-0.5 font-mono text-[11px]">[F20]</span>
          </button>
        </div>

        <div className="moderator-status-row mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className={`rounded-md border px-2 py-1 ${noAnswers ? 'border-red-400/60 text-red-200' : 'border-[#f05fb255] text-[#ffd1e8]'}`}>Antworten {answersCount}/{teamsCount || 0}</span>
          <span className="rounded-md border border-[#5a93c755] px-2 py-1 text-[#cfe8ff]">{connectedCount} {connectedCount === 1 ? 'Team' : 'Teams'}</span>
          {readyCount.total > 0 && <span className="rounded-md border border-[#67b58f66] px-2 py-1 text-[#d6ffe8]">Bereit {readyCount.ready}/{readyCount.total}</span>}
          {questionTimerSecondsLeft !== null && <span className="rounded-md border border-[#d7a46f66] px-2 py-1 text-[#ffe9d1]">⏱ {questionTimerSecondsLeft}s</span>}
          <span className="moderator-timer-adjust inline-flex items-center gap-1 rounded-md border border-[#f05fb244] px-1.5 py-1">
            <button onClick={() => adjustTimer(-5)} className="min-h-[32px] min-w-[32px] rounded bg-[#0b2343] px-2 font-black text-[#ffd1e8] touch-manipulation">−</button>
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
              className="h-8 w-14 rounded border border-[#f05fb244] bg-[#050505] px-1 py-0.5 text-center text-[#ffe4f2]"
            />
            <button onClick={() => adjustTimer(5)} className="min-h-[32px] min-w-[32px] rounded bg-[#0b2343] px-2 font-black text-[#ffd1e8] touch-manipulation">+</button>
          </span>
        </div>
      </section>
    );
  };

  const renderHotkeyLegend = () => {
    if (!roomCode) return null;
    const entries: Array<{ keys: string[]; label: string }> = [
      { keys: ['F13', 'SPACE', '1'], label: 'Nächste Aktion' },
      { keys: ['T'], label: 'Timer' },
      { keys: ['F17', 'U', '5'], label: 'Ein Schritt zurück' },
      ...(singleActionMode ? [] : [
        { keys: ['F14', '2'], label: 'Sperren' },
        { keys: ['F15', '3'], label: 'Aufdecken' },
      ]),
      { keys: ['F16'], label: 'Mute/Unmute' },
      { keys: ['F18', '6'], label: 'Scoreboard' },
      { keys: ['F20'], label: 'Pause' },
    ];
    return (
      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '6px 14px', alignItems: 'center' }}>
        {entries.map(({ keys, label }) => (
          <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6b7280' }}>
            {keys.map((k, i) => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ padding: '1px 6px', borderRadius: 5, background: '#e5e7eb', color: '#374151', fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{k}</span>
                {i < keys.length - 1 && <span style={{ color: '#d1d5db' }}>/</span>}
              </span>
            ))}
            <span style={{ marginLeft: 2 }}>{label}</span>
          </span>
        ))}
      </div>
    );
  };

const renderCozyStagePanel = () => {
  if (!roomCode) return null;
  if (isRundlaufState) return renderRundlaufControls();
  if (isBlitzState) return renderBlitzControls();
  if (normalizedGameState === 'AWARDS') {
    return (
      <section style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Awards & Finale</div>
        <p style={{ color: '#374151', marginBottom: 10 }}>
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
    const connected =
      socketTeamsConnected === null || socketTeamsConnected === undefined
        ? joinScreenTeams.length
        : Math.max(socketTeamsConnected, joinScreenTeams.length);
    return (
      <section style={{ ...card, marginTop: 12 }}>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 13, color: '#374151' }}>
              {connected} {connected === 1 ? 'Team verbunden' : 'Teams verbunden'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
                onClick={handleOpenBeamerLink}
              >
                Beamer oeffnen
              </button>
              <button
                style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
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
          <div />
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Teams im Raum</div>
          {joinScreenTeams.length === 0 ? (
            <span style={{ color: '#6b7280' }}>Noch keine Teams verbunden</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {joinScreenTeams.map((team) => (
                <span
                  key={team.id || team.name}
                  style={{ ...statChip, borderRadius: 12 }}
                >
                  {team.name || 'Team'}
                  {team.isReady && (
                    <span style={{ fontSize: 10, marginLeft: 6, color: '#16a34a' }}>Ready</span>
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
          border: '1px solid #e5e7eb',
          background: '#f9fafb'
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
                  color: '#111827',
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
  // ─── Mobile-first state-driven layout ───────────────────────────────────────
  const renderMobileLayout = () => {
    if (!featureFlags.isCozyMode) return null;

    const gs = normalizedGameState;
    const isLobby = gs === 'LOBBY';
    const isActive = gs === 'Q_ACTIVE';
    const isLocked = gs === 'Q_LOCKED';
    const isReveal = gs === 'Q_REVEAL';
    const isBoard = isScoreboardState || isScoreboardPauseState;
    const isBlitzOrRundlauf = gs.startsWith('BLITZ') || gs.startsWith('RUNDLAUF') || gs === 'AWARDS' || gs === 'SIEGEREHRUNG';

    // Solution
    const solutionText = socketSolution || answers?.solution;

    // Answer rows (same logic as renderPrimaryControls)
    const formatAnswerValue = (value: unknown): string => {
      if (value === null || value === undefined) return '—';
      if (Array.isArray(value)) return value.join(', ');
      if (typeof value === 'object') {
        const maybeOrder = value as { order?: unknown[] };
        if (Array.isArray(maybeOrder.order)) return maybeOrder.order.join(' → ');
        return JSON.stringify(value);
      }
      return String(value);
    };
    const answerRowsMob = Object.entries(answers?.answers || {}).map(([teamId, answerEntry]) => {
      const entry = answerEntry as any;
      const raw = entry?.answer ?? entry?.value;
      return { teamId, teamName: teamLookup[teamId]?.name || answers?.teams?.[teamId]?.name || teamId, answer: formatAnswerValue(raw), isCorrect: entry?.isCorrect as boolean | undefined };
    }).sort((a, b) => a.teamName.localeCompare(b.teamName));
    const unreviewedRowsMob = answerRowsMob.filter(r => r.isCorrect === undefined);
    const reviewedCorrect = answerRowsMob.filter(r => r.isCorrect === true).length;
    const reviewedWrong = answerRowsMob.filter(r => r.isCorrect === false).length;

    // Fun fact
    const funFactDe = ((question as any)?.funFactDe ?? (question as any)?.funFact ?? '').trim();
    const funFactEn = ((question as any)?.funFactEn ?? '').trim();
    const hasFunFact = Boolean(funFactDe || funFactEn);

    // Primary action
    const nextAction = (() => {
      if (gs === 'LOBBY') return { label: 'START', handler: handleNextQuestion, busy: actionState.next, color: '#16a34a' };
      if (isActive) return { label: 'SPERREN', handler: handleLockQuestion, busy: actionState.lock, color: '#d97706' };
      if (isLocked) return { label: 'AUFDECKEN', handler: handleReveal, busy: actionState.reveal, color: '#b10a6c' };
      return { label: nextActionHint?.label ?? 'WEITER', handler: handleNextQuestion, busy: actionState.next, color: '#16a34a' };
    })();

    // QR / join links
    const teamLink = joinLinks?.team ?? '';
    const teamQr = teamLink ? buildQrUrl(teamLink, 200) : '';

    // Lobby content
    const renderLobbyContent = () => (
      <div className="space-y-3">
        <p className="text-sm text-[#94a3b8]">
          {joinScreenTeams.length === 0 ? 'Warte auf Teams…' : `${joinScreenTeams.length} ${joinScreenTeams.length === 1 ? 'Team' : 'Teams'} verbunden`}
        </p>
        {joinScreenTeams.length > 0 && (
          <div className="rounded-2xl bg-[#0b2343]/70 border border-[#f05fb222] p-3">
            <div className="flex flex-wrap gap-2">
              {joinScreenTeams.map((team) => (
                <span key={team.id || team.name} className="rounded-full px-3 py-1 text-sm font-bold text-[#ffd1e8]" style={{ background: 'rgba(240,95,178,0.12)', border: '1px solid rgba(240,95,178,0.25)' }}>
                  {team.name || 'Team'}{team.isReady && <span className="ml-1 text-[10px] text-[#4ade80]">✓</span>}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={handleOpenBeamerLink} className="flex-1 rounded-xl border border-[#a5b4fc] bg-[#1e1b4b]/80 py-3 text-sm font-bold text-[#e0e7ff] touch-manipulation">Beamer öffnen</button>
          <button onClick={handleCopyTeamLink} className="flex-1 rounded-xl border border-[#f05fb244] bg-[#0b2343]/80 py-3 text-sm font-bold text-[#ffd1e8] touch-manipulation">Link kopieren</button>
        </div>
      </div>
    );

    // Q_ACTIVE content
    const liveAnswerRows = Object.entries(socketAnswers || {}).map(([teamId, entry]) => {
      const value = (entry as any)?.value;
      const teamName = teamLookup[teamId]?.name || socketTeamStatus?.find((t) => t.id === teamId)?.name || teamId;
      const q = question as any;
      let displayValue = formatAnswerValue(value);
      let autoCorrect: boolean | null = null;
      if ((q?.mechanic === 'multipleChoice' || q?.type === 'MU_CHO') && value !== null && value !== undefined) {
        const idx = parseInt(String(value), 10);
        const letter = ['A', 'B', 'C', 'D', 'E'][idx] ?? String(idx);
        const optText = q.options?.[idx];
        displayValue = optText ? `${letter}: ${optText}` : letter;
        if (typeof q.correctIndex === 'number') autoCorrect = idx === q.correctIndex;
      }
      return { teamId, teamName, displayValue, autoCorrect };
    }).sort((a, b) => a.teamName.localeCompare(b.teamName));

    const renderActiveContent = () => (
      <div className="space-y-3">
        <div className="rounded-2xl bg-[#0b2343]/90 border border-[#f05fb233] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f05fb2] mb-1">Frage {askedCount}/{totalQuestions}{question && (question as any).categoryKey ? ` · ${(question as any).categoryKey}` : ''}</p>
          <p className="text-base font-extrabold text-[#ffe4f2] leading-snug">{question?.question ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-full px-3 py-1.5 text-sm font-black" style={{ background: answersCount >= (teamsCount || 1) ? 'rgba(34,197,94,0.2)' : 'rgba(240,95,178,0.12)', border: `1px solid ${answersCount >= (teamsCount || 1) ? 'rgba(74,222,128,0.4)' : 'rgba(240,95,178,0.25)'}`, color: answersCount >= (teamsCount || 1) ? '#4ade80' : '#ffd1e8' }}>
            {answersCount}/{teamsCount || 0} geantwortet
          </span>
          {questionTimerSecondsLeft !== null && (
            <span className="rounded-full px-3 py-1.5 text-sm font-black" style={{ background: questionTimerSecondsLeft <= 5 ? 'rgba(239,68,68,0.2)' : questionTimerSecondsLeft <= 10 ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${questionTimerSecondsLeft <= 5 ? 'rgba(248,113,113,0.4)' : questionTimerSecondsLeft <= 10 ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.1)'}`, color: questionTimerSecondsLeft <= 5 ? '#f87171' : questionTimerSecondsLeft <= 10 ? '#fde047' : '#94a3b8' }}>
              ⏱ {questionTimerSecondsLeft}s
            </span>
          )}
        </div>
        {liveAnswerRows.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f05fb2]">Eingehende Antworten</p>
            {liveAnswerRows.map((row) => (
              <div key={row.teamId} className="grid gap-2 items-center rounded-xl px-2 py-1.5" style={{ gridTemplateColumns: '1fr auto auto auto', background: 'rgba(11,35,67,0.8)', border: '1px solid rgba(240,95,178,0.15)' }}>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-[#ffe4f2] truncate">{row.teamName}</p>
                  <p className="text-[11px] text-[#ffd1e8]/70 truncate">{row.displayValue}</p>
                </div>
                <span className="text-base leading-none" title={row.autoCorrect === true ? 'Richtig' : row.autoCorrect === false ? 'Falsch' : 'Offen'}>
                  {row.autoCorrect === true ? '✅' : row.autoCorrect === false ? '❌' : '⏳'}
                </span>
                <button className="min-h-[36px] min-w-[36px] rounded-lg border border-[#67b58f] bg-[#1f6b50]/65 text-sm font-black text-[#d6ffe8] touch-manipulation" onClick={() => doAction(async () => { await hookOverrideAnswer(row.teamId, true); }, '✓')} title="Als richtig markieren">✓</button>
                <button className="min-h-[36px] min-w-[36px] rounded-lg border border-[#d68598] bg-[#7e2e46]/65 text-sm font-black text-[#ffd6df] touch-manipulation" onClick={() => doAction(async () => { await hookOverrideAnswer(row.teamId, false); }, '✕')} title="Als falsch markieren">✕</button>
              </div>
            ))}
          </div>
        )}
        {hasFunFact && (
          <details className="rounded-2xl bg-[#0b2343]/70 border border-[#f05fb222] overflow-hidden">
            <summary className="px-3 py-2.5 text-xs font-black uppercase tracking-widest text-[#f05fb2] cursor-pointer select-none">Moderationsinfo</summary>
            <div className="px-3 pb-3 space-y-1">
              {funFactDe && <p className="text-xs text-[#ffd1e8]"><span className="text-[#f05fb2] font-black">DE</span> {funFactDe}</p>}
              {funFactEn && <p className="text-xs text-[#93c5fd]"><span className="text-[#60a5fa] font-black">EN</span> {funFactEn}</p>}
            </div>
          </details>
        )}
        {solutionText && (
          <details className="rounded-2xl bg-[#0b2343]/70 border border-[rgba(74,222,128,0.2)] overflow-hidden">
            <summary className="px-3 py-2.5 text-xs font-black uppercase tracking-widest text-[#4ade80] cursor-pointer select-none">Lösung (vertraulich)</summary>
            <p className="px-3 pb-3 text-base font-black text-[#d6ffe8]">{solutionText}</p>
          </details>
        )}
      </div>
    );

    // Q_LOCKED content
    const renderLockedContent = () => (
      <div className="space-y-3">
        {solutionText && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(20,83,45,0.6)', border: '1px solid rgba(74,222,128,0.35)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4ade80] mb-1">Lösung</p>
            <p className="text-2xl font-black text-[#d6ffe8]">{solutionText}</p>
          </div>
        )}
        {answerRowsMob.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f05fb2]">
                Antworten ({answerRowsMob.length})
              </p>
              <span className="text-[10px] font-bold text-[#94a3b8]">
                {reviewedCorrect}✓ {reviewedWrong}✕{unreviewedRowsMob.length > 0 ? ` ${unreviewedRowsMob.length}⏳` : ''}
              </span>
            </div>
            {answerRowsMob.map((row) => {
              const isCorrect = row.isCorrect === true;
              const isWrong = row.isCorrect === false;
              const isPending = row.isCorrect === undefined;
              return (
                <div
                  key={row.teamId}
                  className="grid gap-2 items-center rounded-xl px-2 py-1.5"
                  style={{
                    gridTemplateColumns: '1fr auto auto auto',
                    background: isCorrect ? 'rgba(20,83,45,0.5)' : isWrong ? 'rgba(126,46,70,0.4)' : 'rgba(11,35,67,0.8)',
                    border: `1px solid ${isCorrect ? 'rgba(74,222,128,0.3)' : isWrong ? 'rgba(248,113,113,0.3)' : 'rgba(240,95,178,0.15)'}`
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-[#ffe4f2] truncate">{row.teamName}</p>
                    <p className="text-[11px] text-[#ffd1e8]/70 truncate">{row.answer || '—'}</p>
                  </div>
                  <span className="text-base leading-none" title={isCorrect ? 'Richtig' : isWrong ? 'Falsch' : 'Ausstehend'}>
                    {isCorrect ? '✅' : isWrong ? '❌' : '⏳'}
                  </span>
                  <button
                    className="min-h-[36px] min-w-[36px] rounded-lg border border-[#67b58f] bg-[#1f6b50]/65 text-sm font-black text-[#d6ffe8] touch-manipulation"
                    style={{ opacity: isCorrect ? 0.45 : 1 }}
                    onClick={() => doAction(async () => { await hookOverrideAnswer(row.teamId, true); }, '✓')}
                    title="Als richtig markieren"
                  >✓</button>
                  <button
                    className="min-h-[36px] min-w-[36px] rounded-lg border border-[#d68598] bg-[#7e2e46]/65 text-sm font-black text-[#ffd6df] touch-manipulation"
                    style={{ opacity: isWrong ? 0.45 : 1 }}
                    onClick={() => doAction(async () => { await hookOverrideAnswer(row.teamId, false); }, '✕')}
                    title="Als falsch markieren"
                  >✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );

    // Q_REVEAL content
    const renderRevealContent = () => (
      <div className="space-y-3">
        {solutionText && (
          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(20,83,45,0.5)', border: '1px solid rgba(74,222,128,0.3)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4ade80] mb-1">Richtige Antwort</p>
            <p className="text-2xl font-black text-[#d6ffe8]">{solutionText}</p>
          </div>
        )}
        {reviewedCorrect > 0 && (
          <p className="text-center text-sm text-[#94a3b8]">{reviewedCorrect}/{answerRowsMob.length} Teams richtig</p>
        )}
        {scoreboard.length > 0 && (
          <div className="rounded-2xl bg-[#0b2343]/70 border border-[#f05fb222] overflow-hidden">
            <p className="px-3 pt-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#f05fb2]">Aktueller Stand</p>
            <div className="px-3 pb-2 mt-1 space-y-1">
              {scoreboard.slice(0, 5).map((team, i) => (
                <div key={team.id} className="flex items-center justify-between text-sm">
                  <span className="text-[#94a3b8] font-bold w-5">{i + 1}.</span>
                  <span className="flex-1 font-bold text-[#ffd1e8] truncate">{team.name}</span>
                  <span className="font-black text-[#ffe4f2]">{team.score ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    // Scoreboard content
    const renderBoardContent = () => (
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f05fb2]">Scoreboard</p>
        {scoreboard.map((team, i) => (
          <div key={team.id} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: i < 3 ? 'rgba(240,95,178,0.1)' : 'rgba(11,35,67,0.5)', border: '1px solid rgba(240,95,178,0.15)' }}>
            <span className="text-base font-black w-6 text-center" style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : '#64748b' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
            <span className="flex-1 font-bold text-[#ffd1e8] truncate">{team.name}</span>
            <span className="font-black text-[#ffe4f2] text-lg">{team.score ?? 0}</span>
          </div>
        ))}
      </div>
    );

    const stateContent = isLobby ? renderLobbyContent()
      : isActive ? renderActiveContent()
      : isLocked ? renderLockedContent()
      : isReveal ? renderRevealContent()
      : isBoard ? renderBoardContent()
      : isBlitzOrRundlauf ? renderCozyStagePanel()
      : null;

    // Settings overlay
    const settingRow = (label: string, children: React.ReactNode) => (
      <div className="space-y-1.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">{label}</span>
        <div className="flex gap-2 flex-wrap items-center">{children}</div>
      </div>
    );
    const stepBtn = (label: string, onClick: () => void) => (
      <button onClick={onClick} className="w-10 h-10 rounded-lg text-lg font-black touch-manipulation" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffe4f2' }}>{label}</button>
    );
    const renderSettings = () => (
      <div className="border-b border-[rgba(240,95,178,0.15)] bg-[#050a14] px-3 py-3 space-y-4 overflow-y-auto max-h-[60dvh]">

        {settingRow('Sprache', (['de', 'both', 'en'] as Language[]).map(lang => (
          <button key={lang} onClick={() => doAction(async () => { await setLanguage(roomCode, lang); setLang(lang); }, `Sprache: ${lang}`)}
            className="rounded-lg px-3 py-1.5 text-sm font-black touch-manipulation"
            style={{ background: language === lang ? '#942d59' : 'rgba(255,255,255,0.06)', color: language === lang ? '#fff' : '#94a3b8', border: `1px solid ${language === lang ? '#942d59' : 'rgba(255,255,255,0.1)'}` }}>
            {lang.toUpperCase()}
          </button>
        )))}

        {settingRow('Quiz', (
          <button onClick={() => setShowSessionSetup(true)} className="rounded-lg px-3 py-1.5 text-sm font-bold touch-manipulation flex-1"
            style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)', color: '#93c5fd' }}>
            {currentQuizName || '⚠ Kein Quiz — auswählen'}
          </button>
        ))}

        {settingRow('Timer (Sekunden)', <>
          {stepBtn('−', () => { const v = Math.max(5, timerSeconds - 5); setTimerSeconds(v); localStorage.setItem('moderatorTimerSeconds', String(v)); })}
          <span className="text-lg font-black text-[#ffe4f2] w-12 text-center">{timerSeconds}s</span>
          {stepBtn('+', () => { const v = Math.min(300, timerSeconds + 5); setTimerSeconds(v); localStorage.setItem('moderatorTimerSeconds', String(v)); })}
        </>)}

        {settingRow('Avatare', (
          <button onClick={handleToggleAvatars} className="rounded-lg px-3 py-1.5 text-sm font-bold touch-manipulation"
            style={{ background: avatarsEnabled ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${avatarsEnabled ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.1)'}`, color: avatarsEnabled ? '#4ade80' : '#94a3b8' }}>
            {avatarsEnabled ? '🐾 Avatare an' : '🐾 Avatare aus'}
          </button>
        ))}

        {settingRow('Fotosprint-Timer', <>
          <span className="text-xs text-[#64748b]">Anzeige</span>
          {stepBtn('−', () => { const v = Math.max(5, blitzDisplayTimeSec - 5); setBlitzDisplayTimeSec(v); doAction(() => fetch(`${API_BASE}/rooms/${roomCode}/blitz-timers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayTimeMs: v * 1000, answerTimeMs: blitzAnswerTimeSec * 1000 }) }), ''); })}
          <span className="text-sm font-black text-[#ffe4f2] w-10 text-center">{blitzDisplayTimeSec}s</span>
          {stepBtn('+', () => { const v = Math.min(120, blitzDisplayTimeSec + 5); setBlitzDisplayTimeSec(v); doAction(() => fetch(`${API_BASE}/rooms/${roomCode}/blitz-timers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayTimeMs: v * 1000, answerTimeMs: blitzAnswerTimeSec * 1000 }) }), ''); })}
          <span className="text-xs text-[#64748b] ml-2">Antwort</span>
          {stepBtn('−', () => { const v = Math.max(5, blitzAnswerTimeSec - 5); setBlitzAnswerTimeSec(v); doAction(() => fetch(`${API_BASE}/rooms/${roomCode}/blitz-timers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayTimeMs: blitzDisplayTimeSec * 1000, answerTimeMs: v * 1000 }) }), ''); })}
          <span className="text-sm font-black text-[#ffe4f2] w-10 text-center">{blitzAnswerTimeSec}s</span>
          {stepBtn('+', () => { const v = Math.min(120, blitzAnswerTimeSec + 5); setBlitzAnswerTimeSec(v); doAction(() => fetch(`${API_BASE}/rooms/${roomCode}/blitz-timers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayTimeMs: blitzDisplayTimeSec * 1000, answerTimeMs: v * 1000 }) }), ''); })}
        </>)}

        {settingRow('Aktionen', <>
          <button onClick={() => window.open('/qrcode', '_blank', 'noopener,noreferrer')} className="rounded-lg px-3 py-1.5 text-sm font-bold touch-manipulation" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>QR-Code</button>
          <button onClick={handleToggleMute} className="rounded-lg px-3 py-1.5 text-sm font-bold touch-manipulation" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>{globalMuted ? '🔇 Ton an' : '🔊 Ton aus'}</button>
          <button onClick={handleOpenBeamerLink} className="rounded-lg px-3 py-1.5 text-sm font-bold touch-manipulation" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>Beamer</button>
          <button onClick={() => setShowReconnectModal(true)} className="rounded-lg px-3 py-1.5 text-sm font-bold touch-manipulation" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>Neustart</button>
        </>)}

      </div>
    );

    // Secondary action buttons row
    const renderSecondaryActions = () => {
      const btns: { label: string; onClick: () => void; color?: string }[] = [];
      if (isActive) {
        if (timerIsPaused) btns.push({ label: '▶ Weiter', onClick: handleResumeTimer });
        else btns.push({ label: '⏸ Pause', onClick: handlePauseTimer });
        btns.push({ label: '+30s', onClick: handleExtendTimer });
      }
      btns.push({ label: '↩ Zurück', onClick: handleStepBack });
      if (isActive || isLocked) btns.push({ label: '⏭ Skip', onClick: handleSkipQuestion });
      btns.push({ label: '📊', onClick: handleScoreboardAction });
      return (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {btns.map((btn) => (
            <button key={btn.label} onClick={btn.onClick} className="flex-shrink-0 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm font-bold text-[#94a3b8] touch-manipulation whitespace-nowrap">{btn.label}</button>
          ))}
        </div>
      );
    };

    return (
      <>
        {/* Toast */}
        {toast && (
          <div className="fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-[#0b2343] border border-[#f05fb244] px-4 py-2 text-sm font-bold text-[#ffe4f2] shadow-xl pointer-events-none">
            {toast}
          </div>
        )}
        <div className="flex flex-col h-[100dvh] bg-[#050505] text-[#ffe4f2]" style={{ fontFamily: 'var(--font)' }}>
          {/* Header */}
          <header className="flex items-center gap-3 px-3 py-2.5 border-b border-[rgba(240,95,178,0.15)] bg-[#050a14]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-[0.2em] text-[#ffe4f2]">{roomCode || '----'}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase" style={{ background: stateInfo.tone === 'live' ? 'rgba(239,68,68,0.2)' : stateInfo.tone === 'eval' ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.08)', color: stateInfo.tone === 'live' ? '#f87171' : stateInfo.tone === 'eval' ? '#fde047' : '#94a3b8' }}>{stateInfo.label}</span>
                {!isLobby && <span className="text-[11px] text-[#64748b] font-bold">{askedCount}/{totalQuestions}</span>}
              </div>
              {currentQuizName && <p className="text-[10px] text-[#64748b] truncate">{currentQuizName}</p>}
            </div>
            <button onClick={() => setShowSettingsPanel(p => !p)} className="w-10 h-10 flex items-center justify-center rounded-xl touch-manipulation" style={{ background: showSettingsPanel ? 'rgba(240,95,178,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showSettingsPanel ? 'rgba(240,95,178,0.4)' : 'rgba(255,255,255,0.08)'}` }}>⚙️</button>
          </header>

          {/* Settings panel */}
          {showSettingsPanel && renderSettings()}

          {/* Quiz setup overlay */}
          {showSessionSetup && (
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f05fb2]">Quiz auswählen</p>
              <select
                value={selectedQuiz}
                onChange={e => { setSelectedQuiz(e.target.value); localStorage.setItem('moderatorSelectedQuiz', e.target.value); }}
                className="w-full rounded-xl px-3 py-3 text-sm font-bold bg-[#0b2343] border border-[#f05fb244] text-[#ffe4f2] touch-manipulation"
              >
                <option value="">— Quiz wählen —</option>
                {quizzesSorted.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
              <button
                disabled={!selectedQuiz || creatingSession}
                onClick={handleCreateSession}
                className="w-full min-h-[56px] rounded-2xl text-lg font-black text-white touch-manipulation disabled:opacity-50"
                style={{ background: '#16a34a', boxShadow: '0 6px 0 rgba(0,0,0,0.4)' }}
              >
                {creatingSession ? 'Erstelle Session…' : 'Session starten'}
              </button>
              {roomCode && (
                <button onClick={() => setShowSessionSetup(false)} className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] py-2 text-sm font-bold text-[#94a3b8] touch-manipulation">
                  Abbrechen
                </button>
              )}
            </div>
          )}

          {/* Scrollable content */}
          {!showSessionSetup && (
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              {stateContent}
              {renderWarningsPanel()}
            </div>
          )}

          {/* Bottom action bar */}
          {!showSessionSetup && (
            <div className="border-t border-[rgba(240,95,178,0.15)] bg-[#050a14] px-3 pt-2 pb-3">
              <button
                disabled={nextAction.busy}
                onClick={nextAction.busy ? undefined : nextAction.handler}
                className="w-full min-h-[60px] rounded-2xl text-xl font-black text-white shadow-lg touch-manipulation disabled:opacity-50"
                style={{ background: nextAction.color, boxShadow: `0 6px 0 rgba(0,0,0,0.4)` }}
              >
                {nextAction.busy ? '…' : nextAction.label}
              </button>
              {renderSecondaryActions()}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <main
      className="page-transition-enter-active moderator-jackbox h-[100dvh] overflow-hidden bg-[#050505] text-[#ffe4f2]"
      style={{
        boxSizing: 'border-box',
        fontFamily: 'var(--font)'
      }}
    >
      {renderReconnectModal()}
      {renderMobileLayout()}
    </main>
  );
}

export default ModeratorPage;





