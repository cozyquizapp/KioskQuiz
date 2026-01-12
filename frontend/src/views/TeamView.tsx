import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AnyQuestion,
  MultipleChoiceQuestion,
  SortItemsQuestion,
  BingoBoard,
  Language,
  StateUpdatePayload,
  CozyGameState,
  Team,
  BlitzState,
  PotatoState,
  BunteTuetePayload,
  RundlaufState
} from '@shared/quizTypes';
import {
  fetchCurrentQuestion,
  joinRoom,
  submitAnswer,
  fetchBingoBoard,
  markBingoCell,
  fetchLanguage,
  setLanguage as setLanguageApi
} from '../api';
import { theme } from '../theme';
import { getDraftTheme } from '../utils/draft';
import { connectToRoom, SOCKET_URL } from '../socket';
import { categoryColors } from '../categoryColors';
import { categoryLabels } from '../categoryLabels';
import { categoryIcons } from '../categoryAssets';
import { PrimaryButton, Pill } from '../components/uiPrimitives';
import { SyncStatePayload } from '@shared/quizTypes';
import { featureFlags } from '../config/features';
import { CountUpNumber } from '../components/CountUpNumber';
import { SkeletonCard, PulseIndicator } from '../components/AnimatedComponents';
import {
  pageStyleTeam,
  contentShell,
  footerLogo,
  hourglassStyle,
  headerBarTeam,
  pillSmall,
  logoBadge,
  heroCard,
  heroIcon,
  eyebrow,
  metaRow,
  metaChip,
  glassCard,
  pillLabel,
  heading,
  mutedText,
  softDivider,
  inputStyle,
  primaryButton,
  choiceButton,
  progressOuter,
  progressInner,
  progressKnob,
  questionShell,
  gradientHalo,
  questionHeader,
  categoryChip,
  chipIcon,
  connectionPill,
  timerPill,
  questionStyleTeam
} from './teamStyles';

type Phase = 'notJoined' | 'waitingForQuestion' | 'intro' | 'answering' | 'waitingForResult' | 'showResult';

type OfflineBarProps = {
  disconnected: boolean;
  language: Language;
  onReconnect: () => void;
};

function OfflineBar({ disconnected, language, onReconnect }: OfflineBarProps) {
  if (!disconnected) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 12px',
        borderRadius: 12,
        background: 'rgba(239,68,68,0.14)',
        border: '1px solid rgba(239,68,68,0.45)',
        color: '#fecdd3',
        fontWeight: 700,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}
    >
      {language === 'de' ? 'Offline - bitte erneut verbinden' : 'Offline - please reconnect'}
      <button
        style={{
          padding: '6px 10px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.25)',
          background: 'rgba(255,255,255,0.08)',
          color: '#e5e7eb',
          fontWeight: 700,
          cursor: 'pointer'
        }}
        onClick={onReconnect}
      >
        {language === 'de' ? 'Neu verbinden' : 'Reconnect'}
      </button>
    </div>
  );
}

interface TeamViewProps {
  roomCode: string;
}

const COPY = {
  de: {
    send: 'Antwort senden',
    waiting: 'Antwort eingeloggt! Bitte warten...',
    waitingSoon: 'Quiz startet gleich ...',
    waitingStart: 'Warte auf Quizstart ...',
    waitingJoin: 'Bitte beitreten, dann geht es gleich los.',
    waitingAdmin: 'Warte auf Admin ...',
    joinWelcome: 'Willkommen beim Cozy Kiosk Quiz',
    joinHint: "Gib deinen Teamnamen ein, bestaetige und dann geht's los.",
    timerActiveLabel: 'Timer aktiv',
    timerDoneLabel: 'Zeit vorbei',
    evaluating: 'Wir pruefen alle Antworten ...',
    bingoTitle: 'Bingo',
    bingoReady: 'Du hast die Frage richtig - setze jetzt ein X auf ein freies Feld der aktuellen Kategorie.',
    readyOn: 'Wir sind bereit',
    readyOff: 'Wir sind noch nicht bereit',
    joinTitle: 'Team beitreten',
    joinPlaceholder: 'Teamname',
    joinButton: 'Beitreten',
    waitingMsg: 'Bitte wartet auf die naechste Frage ...',
    tfTrue: 'Wahr',
    tfFalse: 'Falsch',
    inputNumber: (unit?: string) => (unit ? `Zahl (${unit}) eingeben` : 'Zahl eingeben'),
    inputOrder: 'Reihenfolge eingeben',
    inputAnswer: 'Antwort eingeben',
    timeLeft: (s: number) => `${s}s verbleibend`,
    resultTitle: (correct: boolean | null) =>
      correct === null ? 'Ergebnis' : correct ? 'Richtig!' : 'Leider falsch',
    loginError: 'Bitte zuerst beitreten.',
    markError: 'Du kannst ein Feld nur nach einer richtigen Antwort markieren.',
    kicked: 'Du wurdest vom Admin entfernt. Bitte neu beitreten.',
    estimateBest: 'Ihr wart am naechsten dran!',
    estimateWorse: 'Leider weiter weg als das beste Team.',
    betHint: (pool: number) => `Verteile genau ${pool} Punkte auf A/B/C.`,
    betRemaining: (remaining: number) =>
      remaining === 0 ? 'Alle Punkte verteilt.' : `${remaining} Punkt(e) uebrig.`,
    betInvalid: 'Bitte genau 10 Punkte verteilen.'
  },
  en: {
    send: 'Submit answer',
    waiting: 'Answer submitted! Please wait...',
    waitingSoon: 'Quiz starting soon ...',
    waitingStart: 'Waiting for quiz start ...',
    waitingJoin: 'Please join to get started.',
    waitingAdmin: 'Waiting for host ...',
    joinWelcome: 'Welcome to Cozy Kiosk Quiz',
    joinHint: 'Enter your team name, confirm, and off you go.',
    timerActiveLabel: 'Timer active',
    timerDoneLabel: 'Time is up',
    evaluating: 'We are checking all answers ...',
    bingoTitle: 'Bingo',
    bingoReady: 'You answered correctly - place an X on a free cell of the current category.',
    readyOn: 'We are ready',
    readyOff: 'We are not ready yet',
    joinTitle: 'Join team',
    joinPlaceholder: 'Team name',
    joinButton: 'Join',
    waitingMsg: 'Please wait for the next question ...',
    tfTrue: 'True',
    tfFalse: 'False',
    inputNumber: (unit?: string) => (unit ? `Enter number (${unit})` : 'Enter number'),
    inputOrder: 'Enter order',
    inputAnswer: 'Enter answer',
    timeLeft: (s: number) => `${s}s remaining`,
    resultTitle: (correct: boolean | null) =>
      correct === null ? 'Result' : correct ? 'Correct!' : 'Incorrect',
    estimateBest: 'You were the closest!',
    estimateWorse: 'Further off than the best team.',
    betHint: (pool: number) => `Spread exactly ${pool} points across A/B/C.`,
    betRemaining: (remaining: number) =>
      remaining === 0 ? 'All points allocated.' : `${remaining} point(s) left.`,
    betInvalid: 'Please allocate the full 10 points.',
    loginError: 'Please join first.',
    markError: 'You can only mark a field after a correct answer.',
    kicked: 'You were removed by the admin. Please rejoin.'
  }
} as const;

function TeamView({ roomCode }: TeamViewProps) {
  const draftTheme = getDraftTheme();
  const teamMarker = 'teamview-marker-2026-01-02b';
  if (typeof window !== 'undefined') {
    const win = window as unknown as { __TEAMVIEW_RENDERED?: boolean; __TEAMVIEW_RENDER_COUNT?: number };
    win.__TEAMVIEW_RENDERED = true;
    win.__TEAMVIEW_RENDER_COUNT = (win.__TEAMVIEW_RENDER_COUNT ?? 0) + 1;
    (win as any).__TEAMVIEW_MARKER = teamMarker;
  }
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [question, setQuestion] = useState<AnyQuestion | null>(null);
  const [questionMeta, setQuestionMeta] = useState<any | null>(null);
  const [answer, setAnswer] = useState<any>('');
  const [bettingPoints, setBettingPoints] = useState<[number, number, number]>([0, 0, 0]);
  const [bunteTop5Order, setBunteTop5Order] = useState<string[]>([]);
  const [buntePrecisionText, setBuntePrecisionText] = useState('');
  const [bunteOneChoice, setBunteOneChoice] = useState('');
  const [bunteOrderSelection, setBunteOrderSelection] = useState<string[]>([]);
  const [bunteOrderCriteria, setBunteOrderCriteria] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [board, setBoard] = useState<BingoBoard>([]);
  const [phase, setPhase] = useState<Phase>('notJoined');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultCorrect, setResultCorrect] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [timerDuration, setTimerDuration] = useState<number>(30);
  const [transitioning, setTransitioning] = useState(false);
  const [canMarkBingo, setCanMarkBingo] = useState(false);
  const [showBingoPanel, setShowBingoPanel] = useState(false);
  const [supportsBingo, setSupportsBingo] = useState(false);
  const bingoEnabled = featureFlags.showBingo && supportsBingo;
  const [timerTick, setTimerTick] = useState(0);
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('teamLanguage');
    return saved === 'de' || saved === 'en' || saved === 'both' ? (saved as Language) : 'de';
  });
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [allowReadyToggle, setAllowReadyToggle] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [socketError, setSocketError] = useState<string | null>(null);
  const [hasStateUpdate, setHasStateUpdate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [resultPoints, setResultPoints] = useState<number | null>(null);
  const [resultDetail, setResultDetail] = useState<string | null>(null);
  const [feedbackAnimation, setFeedbackAnimation] = useState<'success' | 'error' | null>(null);
  const [gameState, setGameState] = useState<CozyGameState>('LOBBY');
  const [scoreboard, setScoreboard] = useState<StateUpdatePayload['scores']>([]);
  const [potatoState, setPotatoState] = useState<PotatoState | null>(null);
  const [blitzState, setBlitzState] = useState<BlitzState | null>(null);
  const [rundlaufState, setRundlaufState] = useState<RundlaufState | null>(null);
  const [blitzAnswers, setBlitzAnswers] = useState<string[]>(['', '', '', '', '']);
  const [blitzSubmitted, setBlitzSubmitted] = useState(false);
  const [potatoTick, setPotatoTick] = useState(0);
  const [potatoInput, setPotatoInput] = useState('');
  const [potatoSubmitting, setPotatoSubmitting] = useState(false);
  const [potatoError, setPotatoError] = useState<string | null>(null);
  const [showPotatoOkToast, setShowPotatoOkToast] = useState(false);
  // TODO(LEGACY): Potato ist deaktiviert; nur anzeigen, wenn Legacy-Panels aktiv sind.
  const showPotatoUI = featureFlags.showLegacyPanels;

  useEffect(() => {
    if (!showPotatoUI && potatoState) {
      setPotatoState(null);
    }
  }, [showPotatoUI, potatoState]);
  const [rundlaufInput, setRundlaufInput] = useState('');
  const [rundlaufSubmitting, setRundlaufSubmitting] = useState(false);
  const [rundlaufError, setRundlaufError] = useState<string | null>(null);
  const savedIdRef = useRef<string | null>(null);
  const answerSubmittedRef = useRef(false);
  const lastQuestionIdRef = useRef<string | null>(null);

  const socketRef = useRef<ReturnType<typeof connectToRoom> | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recoveringRef = useRef(false);
  const potatoInputRef = useRef<HTMLInputElement | null>(null);
  const lastPotatoActiveRef = useRef<string | null>(null);
  const potatoToastTimeoutRef = useRef<number | null>(null);
  const blitzInputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [reconnectKey, setReconnectKey] = useState(0);
  function storageKey(suffix: string) {
    return `team:${roomCode}:${suffix}`;
  }
  useEffect(() => {
    answerSubmittedRef.current = answerSubmitted;
  }, [answerSubmitted]);

  useEffect(() => {
    if (gameState === 'Q_ACTIVE') {
      setPhase(answerSubmittedRef.current ? 'waitingForResult' : 'answering');
    } else if (gameState === 'QUESTION_INTRO') {
      setPhase('intro');
    } else if (gameState === 'Q_LOCKED') {
      setPhase('waitingForResult');
    } else if (gameState === 'Q_REVEAL') {
      setPhase('showResult');
    } else if (teamId) {
      setPhase('waitingForQuestion');
    } else {
      setPhase('notJoined');
    }
  }, [gameState, teamId]);

  useEffect(() => {
    if (!teamId) {
      setPotatoSubmitting(false);
      lastPotatoActiveRef.current = null;
      return;
    }
    const activeId = potatoState?.activeTeamId ?? null;
    const wasActive = lastPotatoActiveRef.current === teamId;
    const isActive = activeId === teamId;
    const lastAttempt = potatoState?.lastAttempt ?? null;

    if (isActive && activeId !== lastPotatoActiveRef.current && potatoInputRef.current) {
      potatoInputRef.current.focus();
      setPotatoError(null);
    }

    if (!isActive && wasActive) {
      setPotatoSubmitting(false);
      setPotatoInput('');
    }

    if (lastAttempt && lastAttempt.teamId === teamId) {
      if (potatoSubmitting) {
        setPotatoSubmitting(false);
      }
      if (lastAttempt.verdict === 'ok') {
        setPotatoInput('');
        setPotatoError(null);
      }
    }

    if (!potatoState || potatoState.phase !== 'PLAYING') {
      setPotatoSubmitting(false);
    }

    lastPotatoActiveRef.current = activeId;
  }, [
    potatoState?.activeTeamId,
    potatoState?.lastAttempt?.id,
    potatoState?.lastAttempt?.verdict,
    potatoState?.phase,
    teamId,
    potatoSubmitting
  ]);

  useEffect(() => {
    if (!teamId) return;
    const activeId = rundlaufState?.activeTeamId ?? null;
    const attempt = rundlaufState?.lastAttempt ?? null;
    if (activeId !== teamId) {
      setRundlaufSubmitting(false);
      setRundlaufError(null);
      setRundlaufInput('');
      return;
    }
    if (attempt && attempt.teamId === teamId) {
      if (attempt.verdict === 'ok') {
        setRundlaufInput('');
        setRundlaufError(null);
      }
      if (attempt.verdict === 'dup') {
        setRundlaufError(language === 'de' ? 'Doppelte Antwort.' : 'Duplicate answer.');
      }
      if (attempt.verdict === 'invalid') {
        setRundlaufError(language === 'de' ? 'Ungueltig.' : 'Invalid.');
      }
    }
  }, [rundlaufState?.activeTeamId, rundlaufState?.lastAttempt?.id, teamId, language]);

  useEffect(() => {
    if (!teamId) return;
    const attempt = potatoState?.lastAttempt;
    if (attempt && attempt.teamId === teamId && attempt.verdict === 'ok') {
      setShowPotatoOkToast(true);
      if (potatoToastTimeoutRef.current) {
        window.clearTimeout(potatoToastTimeoutRef.current);
      }
      potatoToastTimeoutRef.current = window.setTimeout(() => setShowPotatoOkToast(false), 800);
    } else if (attempt && attempt.teamId === teamId && attempt.verdict !== 'pending') {
      setShowPotatoOkToast(false);
    }
  }, [potatoState?.lastAttempt?.id, potatoState?.lastAttempt?.verdict, teamId]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const id = window.setInterval(() => setPotatoTick((tick) => tick + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!question || question.type !== 'BUNTE_TUETE' || !question.bunteTuete) {
      setBunteTop5Order([]);
      setBunteOrderSelection([]);
      return;
    }
    const payload = question.bunteTuete as BunteTuetePayload;
    if (payload.kind === 'top5') {
      setBunteTop5Order((prev) =>
        prev.length === payload.items.length ? prev : Array(payload.items.length).fill('')
      );
    }
    if (payload.kind === 'order') {
      setBunteOrderSelection((prev) =>
        prev.length === payload.items.length ? prev : Array(payload.items.length).fill('')
      );
      setBunteOrderCriteria(payload.defaultCriteriaId ?? payload.criteriaOptions?.[0]?.id ?? null);
    }
  }, [question?.id]);

  // inject animations once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'teamview-anim-style';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.innerHTML = `
      @keyframes hourglass-wiggle {
        0% { transform: translateY(0) rotate(-4deg); }
        50% { transform: translateY(-4px) rotate(0deg); }
        100% { transform: translateY(0) rotate(4deg); }
      }
      @keyframes sendPulse {
        0% { box-shadow: 0 12px 26px rgba(0,0,0,0.25); transform: translateY(0) scale(1); }
        50% { box-shadow: 0 16px 38px rgba(0,0,0,0.35), 0 0 0 6px rgba(255,255,255,0.08); transform: translateY(-2px) scale(1.01); }
        100% { box-shadow: 0 12px 26px rgba(0,0,0,0.25); transform: translateY(0) scale(1); }
      }
      @keyframes timeup-pulse {
        0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
        100% { box-shadow: 0 0 0 14px rgba(239,68,68,0); }
      }`;
      document.head.appendChild(style);
    }
  }, []);

  // Load persisted team (for reconnects)
  useEffect(() => {
    const savedName = localStorage.getItem(storageKey('name'));
    const savedId = localStorage.getItem(storageKey('id'));
    if (savedName) setTeamName(savedName);
    if (savedId) {
      savedIdRef.current = savedId;
    }
  }, [roomCode]);

  useEffect(
    () => () => {
      if (potatoToastTimeoutRef.current) {
        window.clearTimeout(potatoToastTimeoutRef.current);
      }
    },
    []
  );

  const t = <K extends keyof (typeof COPY)['de']>(key: K) => {
    const deVal = COPY.de[key] as any;
    const enVal = (COPY.en as any)[key] as any;
    if (language === 'both') {
      if (typeof deVal === 'function' && typeof enVal === 'function') {
        return ((...args: any[]) => `${deVal(...args)} / ${enVal(...args)}`) as any;
      }
      if (typeof deVal === 'string' && typeof enVal === 'string') {
        return `${deVal} / ${enVal}` as any;
      }
    }
    return (COPY as any)[language]?.[key] ?? COPY.de[key];
  }
  function inlineCopy(de: string, en: string) {
    if (language === 'en') return en;
    if (language === 'both') return `${de} / ${en}`;
    return de;
  }
  const scoreboardLookup = useMemo(() => {
    const map: Record<string, { name: string; score: number }> = {};
    scoreboard.forEach((entry) => {
      map[entry.id] = { name: entry.name, score: entry.score ?? 0 };
    });
    return map;
  }, [scoreboard]);
  const sortedScoreboard = useMemo(
    () => [...scoreboard].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [scoreboard]
  );
  const potatoCountdown = useMemo(() => {
    if (!potatoState?.deadline) return null;
    return Math.max(0, Math.ceil((potatoState.deadline - Date.now()) / 1000));
  }, [potatoState?.deadline, potatoTick]);
  const potatoDeadlinePassed = potatoCountdown !== null && potatoCountdown <= 0;
  const blitzCountdown = useMemo(() => {
    if (!blitzState?.deadline) return null;
    return Math.max(0, Math.ceil((blitzState.deadline - Date.now()) / 1000));
  }, [blitzState?.deadline, timerTick]);
  const teamCount = useMemo(() => {
    const scoreCount = scoreboard.length;
    if (scoreCount) return scoreCount;
    return blitzState?.submissions?.length ?? 0;
  }, [scoreboard, blitzState?.submissions?.length]);
  const blitzItems = blitzState?.items ?? [];
  const totalBlitzItems = blitzItems.length || 5;
  const activeBlitzItemIndex = useMemo(() => {
    if (!totalBlitzItems) return 0;
    const rawIndex = blitzState?.itemIndex ?? 0;
    return Math.min(totalBlitzItems - 1, Math.max(0, rawIndex));
  }, [blitzState?.itemIndex, totalBlitzItems]);
  const blitzItemCountdown = useMemo(() => {
    if (!blitzState?.itemDeadline) return null;
    return Math.max(0, Math.ceil((blitzState.itemDeadline - Date.now()) / 1000));
  }, [blitzState?.itemDeadline, timerTick]);
  const isBlitzPlaying =
    gameState === 'BLITZ_PLAYING' || (gameState === 'BLITZ' && blitzState?.phase === 'PLAYING');
  const isPotatoActiveTurn =
    showPotatoUI &&
    gameState === 'POTATO' &&
    potatoState?.phase === 'PLAYING' &&
    potatoState?.activeTeamId === teamId;
  const isRundlaufActiveTurn = gameState === 'RUNDLAUF_PLAY' && rundlaufState?.activeTeamId === teamId;

  useEffect(() => {
    if (!teamId) return;
    setBlitzSubmitted(Boolean(blitzState?.submissions?.includes(teamId)));
    if (!isBlitzPlaying) {
      setBlitzAnswers(['', '', '', '', '']);
    }
  }, [teamId, blitzState, isBlitzPlaying]);

  useEffect(() => {
    if (!isBlitzPlaying) return;
    if (blitzSubmitted) return;
    const ref = blitzInputsRef.current[activeBlitzItemIndex];
    if (ref && document.activeElement !== ref) {
      ref.focus({ preventScroll: true });
      if (typeof ref.select === 'function') {
        ref.select();
      }
    }
  }, [isBlitzPlaying, blitzSubmitted, activeBlitzItemIndex]);

  function handleReconnect() {
    setConnectionStatus('connecting');
    setReconnectKey((v) => v + 1);
  }

  function updateLanguage(lang: Language) {
    setLanguageState(lang);
    localStorage.setItem('teamLanguage', lang);
    setLanguageApi(roomCode, lang).catch(() => undefined);
  }

  // Socket connection & live updates
  useEffect(() => {
    const socket = connectToRoom(roomCode);
    socketRef.current = socket;
    setConnectionStatus('connecting');

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setSocketError(null);
      setToast(null);
    });
    socket.on('disconnect', () => setConnectionStatus('disconnected'));
    socket.on('connect_error', (err) => {
      setSocketError(err?.message || 'Socket error');
      setConnectionStatus('disconnected');
    });
    socket.io?.on?.('reconnect_attempt', () => setConnectionStatus('connecting'));

    socket.on('syncState', (payload: SyncStatePayload) => {
      setHasStateUpdate(true);
      const hasTeam = Boolean(teamId);
      if (!hasTeam) {
        setQuestion(null);
        setQuestionMeta(null);
        setPhase('notJoined');
        setAllowReadyToggle(true);
        setAnswerSubmitted(false);
        setEvaluating(false);
        setTimerEndsAt(null);
        setShowBingoPanel(false);
        setCanMarkBingo(false);
        return;
      }
      if (payload.language) {
        setLanguageState(payload.language);
        localStorage.setItem('teamLanguage', payload.language);
      }
      if (payload.question) {
        resetInputs();
        setQuestion(payload.question);
        setQuestionMeta(payload.questionMeta);
        setPhase(
          payload.questionPhase === 'revealed'
            ? 'showResult'
            : payload.questionPhase === 'evaluated'
            ? 'waitingForResult'
            : 'answering'
        );
        setAllowReadyToggle(false);
        setAnswerSubmitted(false);
        setResultMessage(null);
        setResultCorrect(null);
        setSolution(null);
        setIsFinal(false);
        setShowBingoPanel(false);
        setCanMarkBingo(false);
      } else {
        resetInputs();
        setQuestion(null);
        setQuestionMeta(null);
        setPhase(teamId ? 'waitingForQuestion' : 'notJoined');
        setAllowReadyToggle(true);
        setShowBingoPanel(false);
        setCanMarkBingo(false);
      }
      setTimerEndsAt(payload.timerEndsAt ?? null);
      if (payload.timerEndsAt) {
        const remaining = Math.max(0, Math.ceil((payload.timerEndsAt - Date.now()) / 1000));
        setTimerDuration(remaining || 30);
      }
    });

    socket.on('team:show-question', ({ question: q }) => {
      if (!teamId) return;
      resetInputs();
      setQuestion(q);
      setPhase('answering');
      setAllowReadyToggle(false);
      setAnswerSubmitted(false);
      setResultMessage(null);
      setResultCorrect(null);
      setShowBingoPanel(false);
      setCanMarkBingo(false);
    });

    socket.on('timerStarted', ({ endsAt }) => {
      setTimerEndsAt(endsAt);
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimerDuration(remaining || 30);
    });
    socket.on('timerStopped', () => setTimerEndsAt(null));
    const onStateUpdate = (payload: StateUpdatePayload) => {
      setHasStateUpdate(true);
      setGameState(payload.state);
      const teamSnapshot = teamId ? payload.teamStatus?.find((team) => team.id === teamId) : undefined;
      if (teamSnapshot && typeof teamSnapshot.submitted === 'boolean') {
        setAnswerSubmitted(teamSnapshot.submitted);
      }
      if (payload.scores) {
        setScoreboard(payload.scores);
      }
      if (payload.potato !== undefined) {
        if (showPotatoUI) {
          setPotatoState(payload.potato ?? null);
        }
      }
      if (payload.blitz !== undefined) {
        setBlitzState(payload.blitz ?? null);
      }
      if (payload.rundlauf !== undefined) {
        setRundlaufState(payload.rundlauf ?? null);
      }
      if (payload.currentQuestion !== undefined) {
        if (payload.currentQuestion) {
          const nextId = payload.currentQuestion.id;
          if (nextId && lastQuestionIdRef.current !== nextId) {
            lastQuestionIdRef.current = nextId;
            resetInputs();
            setAnswerSubmitted(false);
            setResultMessage(null);
            setResultCorrect(null);
            setSolution(null);
          }
          setQuestion(payload.currentQuestion);
          if (payload.state === 'QUESTION_INTRO') {
            setPhase('intro');
          } else if (payload.state === 'Q_ACTIVE') {
            const submitted = teamSnapshot?.submitted ?? answerSubmittedRef.current;
            setPhase(submitted ? 'waitingForResult' : 'answering');
          } else if (payload.state === 'Q_LOCKED') {
            setPhase('waitingForResult');
          } else if (payload.state === 'Q_REVEAL') {
            setPhase('showResult');
          } else if (teamId) {
            setPhase('waitingForQuestion');
          }
        } else if (teamId) {
          setPhase('waitingForQuestion');
          setQuestion(null);
        }
      }
      if (payload.timer) {
        setTimerEndsAt(payload.timer.endsAt ?? null);
        if (payload.timer.durationMs && payload.timer.durationMs > 0) {
          setTimerDuration(Math.max(1, Math.round(payload.timer.durationMs / 1000)));
        }
      }
      if (payload.results && teamId) {
        const entry = payload.results.find((res) => res.teamId === teamId);
        if (entry) {
          if (typeof entry.awardedPoints === 'number') {
            setResultPoints(entry.awardedPoints);
            // Trigger feedback animation
            if (entry.awardedPoints > 0) {
              setFeedbackAnimation('success');
              setTimeout(() => setFeedbackAnimation(null), 1000);
            } else {
              setFeedbackAnimation('error');
              setTimeout(() => setFeedbackAnimation(null), 500);
            }
          } else {
            setResultPoints(null);
          }
          setResultDetail(entry.awardedDetail ?? null);
        }
      }
      if (typeof payload.supportsBingo === 'boolean') {
        setSupportsBingo(payload.supportsBingo);
      }
    };
    socket.on('server:stateUpdate', onStateUpdate);

    socket.on('evaluation:started', () => {
      setPhase('waitingForResult');
      setEvaluating(true);
      setIsFinal(false);
    });
    socket.on('answersEvaluated', ({ answers }) => {
      setEvaluating(false);
      if (teamId && answers && answers[teamId]) {
        const entry = answers[teamId];
        setResultCorrect(Boolean(entry.isCorrect));
        if (entry.deviation !== undefined && entry.bestDeviation !== undefined) {
          if (entry.deviation === entry.bestDeviation) {
            setResultMessage(t('estimateBest'));
          } else {
            setResultMessage(t('estimateWorse'));
          }
        }
        if (typeof entry.awardedPoints === 'number') setResultPoints(entry.awardedPoints);
        if ((entry as any).awardedDetail) setResultDetail((entry as any).awardedDetail);
        setPhase('waitingForResult');
      }
    });
    socket.on(
      'teamResult',
      ({
        teamId: tId,
        isCorrect,
        deviation,
        bestDeviation,
        solution: sol,
        awardedPoints,
        awardedDetail
      }) => {
        if (tId !== teamId) return;
        setResultCorrect(Boolean(isCorrect));
        if (deviation !== undefined && bestDeviation !== undefined) {
          setResultMessage(
            deviation === bestDeviation ? t('estimateBest') : t('estimateWorse')
          );
        }
        setPhase('showResult');
        if (isCorrect) {
          setCanMarkBingo(true);
          setShowBingoPanel(true);
        }
        if (typeof awardedPoints === 'number') setResultPoints(awardedPoints);
        if (awardedDetail) setResultDetail(awardedDetail);
        if (sol) setSolution(sol);
        setIsFinal(true);
      }
    );
    socket.on('teamKicked', ({ teamId: kicked }) => {
      if (kicked === teamId) {
        setMessage(t('kicked'));
        setTeamId(null);
        setPhase('notJoined');
      }
    });
    socket.on('languageChanged', ({ language: lang }) => {
      if (lang === 'de' || lang === 'en' || lang === 'both') setLanguageState(lang);
    });

    return () => {
      socket.off('server:stateUpdate', onStateUpdate);
      socket.disconnect();
    };
  }, [roomCode, teamId, language, reconnectKey]);

  // Timer tick for smooth progress animations
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerEndsAt]);

  function connectionStatusPill() {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span
          style={connectionPill(connectionStatus)}
          title={
            connectionStatus === 'connected'
              ? language === 'de'
                ? 'Verbunden'
                : 'Online'
              : connectionStatus === 'connecting'
              ? language === 'de'
                ? 'Verbinde...'
                : 'Connecting...'
              : language === 'de'
              ? 'Getrennt'
              : 'Offline'
          }
        />
        {connectionStatus === 'disconnected' && (
          <button
            style={{
              padding: '6px 10px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.22)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e5e7eb',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            onClick={handleReconnect}
          >
            {language === 'de' ? 'Erneut verbinden' : 'Reconnect'}
          </button>
        )}
      </div>
    );
  }

  function resetInputs() {
    setAnswer('');
    setBettingPoints([0, 0, 0]);
    setBunteTop5Order([]);
    setBuntePrecisionText('');
    setBunteOneChoice('');
    setBunteOrderSelection([]);
    setBunteOrderCriteria(null);
    setResultPoints(null);
    setResultDetail(null);
  }

  function applyRankingSelection(current: string[], index: number, value: string) {
    const next = [...current];
    next[index] = value;
    if (value) {
      next.forEach((entry, idx) => {
        if (idx !== index && entry === value) next[idx] = '';
      });
    }
    return next;
  }

  const loadQuestion = async () => {
    const data = await fetchCurrentQuestion(roomCode);
    setQuestion(data.question);
    if (data.question) {
      resetInputs();
      setPhase('answering');
      setResultMessage(null);
      setAllowReadyToggle(false);
    } else {
      resetInputs();
      setPhase('waitingForQuestion');
      setResultMessage(null);
      setAllowReadyToggle(true);
    }
  };

  const handleJoin = async (useSavedId = false) => {
    try {
      const cleanName = teamName.trim();
      if (!cleanName) {
        setMessage(language === 'de' ? 'Teamname fehlt.' : 'Team name required.');
        return;
      }
      if (!roomCode) {
        setMessage(language === 'de' ? 'Roomcode fehlt.' : 'Room code missing.');
        return;
      }
      const socket = socketRef.current;
      const payload = await new Promise<{ team: Team; board?: BingoBoard }>((resolve, reject) => {
        if (!socket) {
          // TODO(LEGACY): remove REST fallback once socket join stabilisiert
          joinRoom(roomCode, cleanName, useSavedId ? savedIdRef.current ?? undefined : undefined)
            .then((res) => resolve(res))
            .catch(reject);
          return;
        }
        socket.emit(
          'team:join',
          { roomCode, teamName: cleanName, teamId: useSavedId ? savedIdRef.current ?? undefined : undefined },
          (resp?: { ok: boolean; error?: string; team?: Team; board?: BingoBoard }) => {
            if (!resp?.ok || !resp?.team) {
              reject(new Error(resp?.error || 'Beitritt fehlgeschlagen'));
            } else {
              resolve({ team: resp.team, board: resp.board });
            }
          }
        );
      });
      const data = payload;
      setTeamId(data.team.id);
      localStorage.setItem(storageKey('name'), cleanName);
      localStorage.setItem(storageKey('id'), data.team.id);
      savedIdRef.current = data.team.id;
      if (data.board) {
        setBoard(data.board);
      } else {
        const fetched = await fetchBingoBoard(roomCode, data.team.id);
        setBoard(fetched.board);
      }
      try {
        const langRes = await fetchLanguage(roomCode);
        if (langRes?.language) {
          setLanguageState(langRes.language);
          localStorage.setItem('teamLanguage', langRes.language);
        }
      } catch {
        // ignore
      }
      await loadQuestion();
      setMessage(null);
    } catch (err) {
      setMessage(
          language === 'de'
          ? `Beitritt fehlgeschlagen (${SOCKET_URL}). Bitte Raumcode/Verbindung pruefen.`
          : `Join failed (${SOCKET_URL}). Please check room code/connection.`
        );
    }
  };

  const handleSubmit = async () => {
    if (!teamId) {
      if (teamName) {
        try {
          await handleJoin();
        } catch {
          setMessage(t('loginError'));
          return;
        }
      } else {
        setMessage(t('loginError'));
        return;
      }
    }
    if (!canAnswer) {
      setMessage(language === 'de' ? 'Antworten aktuell gesperrt.' : 'Answers are locked right now.');
      return;
    }
    try {
      const isBunteQuestion = question?.type === 'BUNTE_TUETE' && question?.bunteTuete;
      if (question?.mechanic === 'betting') {
        const pool = (question as any).pointsPool ?? 10;
        const sum = bettingPoints.reduce((a, b) => a + b, 0);
        if (sum !== pool) {
          setMessage(t('betInvalid'));
          return;
        }
        await submitAnswer(roomCode, teamId, bettingPoints);
        setAnswerSubmitted(true);
        setAnswer(bettingPoints);
      } else if (isBunteQuestion) {
        const payload = buildBunteSubmission(question.bunteTuete as BunteTuetePayload);
        if (!payload) return;
        await submitAnswer(roomCode, teamId, payload);
        setAnswerSubmitted(true);
      } else {
        await submitAnswer(roomCode, teamId, answer);
        setAnswerSubmitted(true);
      }
      setPhase('waitingForResult');
      setAllowReadyToggle(false);
      setTransitioning(true);
      setMessage(null);
      setTimeout(() => setTransitioning(false), 500);
    } catch (error) {
      console.error(error);
      setMessage(language === 'de' ? 'Antwort konnte nicht gesendet werden. Bitte Verbindung pruefen.' : 'Could not submit answer.');
    }
  };


  function renderAnswering() {
    return (
      <div
      style={{
        ...questionShell,
        opacity: transitioning ? 0.4 : 1,
        transform: transitioning ? 'translateY(12px) scale(0.995)' : 'translateY(0) scale(1)',
        transition: 'opacity 0.3s ease, transform 0.35s ease',
        background: 'rgba(255,255,255,0.001)',
        backdropFilter: 'blur(50px) saturate(200%) brightness(1.15)',
        color: '#e2e8f0',
        borderColor: timeUp ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.08)',
        boxShadow: timeUp
          ? 'inset 0 1px 1px rgba(255,255,255,0.05)'
          : 'inset 0 1px 1px rgba(255,255,255,0.05)',
        animation: timeUp ? 'timeup-pulse 0.35s ease-in-out 2' : undefined
      }}
    >
      <div
        style={{
          ...gradientHalo,
          background: `radial-gradient(circle at 24% 20%, ${accentColor}18, transparent 45%), radial-gradient(circle at 78% 12%, ${accentColor}08, transparent 50%)`,
          animation: 'liquid-shimmer 6s ease-in-out infinite'
        }}
      />
      <div style={questionHeader}>
        <div
          style={{
            ...categoryChip,
            background: 'rgba(255,255,255,0.001)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#f1f5f9',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
            backdropFilter: 'blur(30px) saturate(200%)'
          }}
        >
          {accentIcon && (
            <img
              src={accentIcon}
              alt={accentLabel}
              style={{
                ...chipIcon,
                transform: `translate(${layout.logoOffsetX ?? 0}px, ${layout.logoOffsetY ?? 0}px)`
              }}
            />
          )}
          <span>{accentLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ ...pillLabel, marginBottom: 0 }}>
            {isFinal
              ? language === 'de'
                ? 'Final'
                : 'Final'
              : evaluating || phase === 'waitingForResult'
              ? language === 'de'
                ? 'Host prueft...'
                : 'Host reviewing...'
              : phase === 'answering'
              ? language === 'de'
                ? 'Antworten'
                : 'Answering'
              : 'Warten'}
          </div>

        </div>
      </div>
      {isLocked && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid rgba(250,204,21,0.4)',
            background: 'rgba(250,204,21,0.12)',
            color: '#facc15',
            fontWeight: 700
          }}
        >
          {language === 'de' ? 'Antworten sind gesperrt.' : 'Answers are locked.'}
        </div>
      )}
        <h2 style={{ ...questionStyleTeam, color: '#f8fafc' }}>{question?.question ?? t('waitingMsg')}</h2>
      {(() => {
        const q: any = question;
        const mediaUrl = q?.imageUrl || q?.media?.url;
        if (!q || !mediaUrl) return null;
        return (
          <div style={{ margin: '10px 0 6px', display: 'flex', justifyContent: 'center' }}>
            <img
              src={mediaUrl}
              alt="Fragebild"
              style={{
                maxWidth: '90%',
                maxHeight: 220,
                objectFit: 'contain',
                borderRadius: 16,
                border: `1px solid ${accentColor}55`,
                boxShadow: `0 16px 32px ${accentColor}33`,
                transform: `translate(${layout.imageOffsetX ?? 0}px, ${layout.imageOffsetY ?? 0}px)`
              }}
            />
          </div>
        );
      })()}
      {hasTimer && (
        <div style={{ marginTop: 10 }} />
      )}
      <div style={{ marginTop: 10 }}>{renderInput(accentColor)}</div>
      {renderBunteDetails()}
      {timeUp && (
        <p style={{ 
          color: '#fb923c', 
          fontWeight: 700, 
          marginTop: 8,
          padding: '8px 12px',
          borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(249,115,22,0.08))',
          border: '1px solid rgba(251,146,60,0.3)',
          backdropFilter: 'blur(20px)'
        }}>
          {language === 'de' ? 'Leider ist die Zeit schon vorbei.' : 'Time is up.'}
        </p>
      )}
      <button
        style={{
          ...primaryButton,
          marginTop: 14,
          background: `linear-gradient(90deg, rgba(255,255,255,0.02) ${Math.max(0, Math.min(100, progress))}%, rgba(255,255,255,0.001) ${Math.max(0, Math.min(100, progress))}%)`,
          backdropFilter: 'blur(30px) saturate(200%) brightness(1.1)',
          color: '#f8fafc',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.06)',
          animation: 'none',
          cursor: canAnswer ? 'pointer' : 'not-allowed',
          opacity: canAnswer ? 1 : 0.6,
          transform: canAnswer ? undefined : 'scale(0.99)',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={handleSubmit}
        disabled={!canAnswer}
      >
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            fontWeight: 900
          }}
        >
          {t('send')}
        </span>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(135deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 6px, transparent 6px, transparent 12px)',
            opacity: 0.4,
            pointerEvents: 'none'
          }}
        />
      </button>
      {message && <p style={{ color: 'var(--accent-strong)', marginTop: 10 }}>{message}</p>}
    </div>
  );
  }

  function renderWaitingForResult() {
    const submittedTitle =
      language === 'both'
        ? 'Antwort gesendet ✅ / Answer sent ✅'
        : language === 'en'
        ? 'Answer sent ✅'
        : 'Antwort gesendet ✅';
    return renderWaiting(
      answerSubmitted ? submittedTitle : t('waiting'),
      language === 'de' ? 'Wir pruefen alle Antworten ...' : t('evaluating')
    );
  }

  function buildBunteSubmission(payload: BunteTuetePayload | undefined) {
    if (!question || !payload) return null;
    if (payload.kind === 'top5') {
      const values = bunteTop5Order;
      if (values.length !== payload.items.length || values.some((val) => !val)) {
        setMessage(language === 'de' ? 'Bitte alle Positionen waehlen.' : 'Please fill all positions.');
        return null;
      }
      return { kind: 'top5', order: values };
    }
    if (payload.kind === 'precision') {
      if (!buntePrecisionText.trim()) {
        setMessage(language === 'de' ? 'Bitte Antwort eingeben.' : 'Please enter an answer.');
        return null;
      }
      return { kind: 'precision', text: buntePrecisionText.trim() };
    }
    if (payload.kind === 'oneOfEight') {
      if (!bunteOneChoice) {
        setMessage(language === 'de' ? 'Bitte eine Option waehlen.' : 'Please choose an option.');
        return null;
      }
      return { kind: 'oneOfEight', choiceId: bunteOneChoice };
    }
    if (payload.kind === 'order') {
      const values = bunteOrderSelection;
      if (values.length !== payload.items.length || values.some((val) => !val)) {
        setMessage(language === 'de' ? 'Bitte jede Position belegen.' : 'Please fill every position.');
        return null;
      }
      return {
        kind: 'order',
        order: values,
        criteriaId: bunteOrderCriteria ?? undefined
      };
    }
    return null;
  }

  const handleMarkCell = async (cellIndex: number) => {
    if (!teamId) {
      setMessage(t('loginError'));
      return;
    }
    if (!canMarkBingo) return;
    try {
      const res = await markBingoCell(roomCode, teamId, cellIndex);
      setBoard(res.board);
      setCanMarkBingo(false);
      setShowBingoPanel(true);
      setMessage(null);
    } catch (err) {
      setMessage(
        language === 'de'
          ? t('markError')
          : t('markError')
      );
    }
  };

  function renderBunteInput(payload: BunteTuetePayload, accent: string) {
    if (payload.kind === 'top5') {
      return (
        <div style={{ display: 'grid', gap: 10 }}>
          {payload.items.map((item, idx) => (
            <div key={item.id} style={{ display: 'grid', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                {language === 'de' ? 'Position' : 'Position'} {idx + 1}
              </label>
              <select
                value={bunteTop5Order[idx] ?? ''}
                onChange={(e) =>
                  setBunteTop5Order((prev) => applyRankingSelection(prev, idx, e.target.value))
                }
                disabled={!canAnswer}
                style={{ ...inputStyle, background: 'rgba(0,0,0,0.45)' }}
              >
                <option value="">{language === 'de' ? 'Waehlen...' : 'Select...'}</option>
                {payload.items.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }
    if (payload.kind === 'precision') {
      return (
        <input
          className="team-answer-input"
          style={inputStyle}
          placeholder={language === 'de' ? 'Antwort eingeben' : 'Enter answer'}
          value={buntePrecisionText}
          onChange={(e) => setBuntePrecisionText(e.target.value)}
          disabled={!canAnswer}
        />
      );
    }
    if (payload.kind === 'oneOfEight') {
      return (
        <div style={{ display: 'grid', gap: 8 }}>
          {payload.statements.map((statement) => {
            const selected = bunteOneChoice === statement.id;
            return (
              <button
                key={statement.id}
                type="button"
                className={`team-choice${selected ? ' is-selected' : ''}`}
                onClick={() => setBunteOneChoice(statement.id)}
                disabled={!canAnswer}
                style={{
                  ...choiceButton,
                  justifyContent: 'flex-start',
                  border: `1px solid ${selected ? accent : 'rgba(255,255,255,0.08)'}`,
                  background: selected ? `${accent}22` : 'rgba(255,255,255,0.04)',
                  color: '#e2e8f0',
                  cursor: canAnswer ? 'pointer' : 'not-allowed'
                }}
              >
                <span style={{ fontWeight: 800, marginRight: 6 }}>{statement.id}</span>
                <span>{statement.text}</span>
              </button>
            );
          })}
        </div>
      );
    }
    if (payload.kind === 'order') {
      return (
        <div style={{ display: 'grid', gap: 12 }}>
          {payload.criteriaOptions?.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {payload.criteriaOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setBunteOrderCriteria(option.id)}
                  style={{
                    ...pillSmall,
                    borderColor: bunteOrderCriteria === option.id ? accent : 'rgba(255,255,255,0.14)',
                    background:
                      bunteOrderCriteria === option.id ? `${accent}22` : 'rgba(255,255,255,0.05)',
                    color: '#e2e8f0'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {payload.items.map((item, idx) => (
            <div key={item.id} style={{ display: 'grid', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                {language === 'de' ? 'Position' : 'Position'} {idx + 1}
              </label>
              <select
                value={bunteOrderSelection[idx] ?? ''}
                onChange={(e) =>
                  setBunteOrderSelection((prev) => applyRankingSelection(prev, idx, e.target.value))
                }
                disabled={!canAnswer}
                style={{ ...inputStyle, background: 'rgba(0,0,0,0.45)' }}
              >
                <option value="">{language === 'de' ? 'Waehlen...' : 'Select...'}</option>
                {payload.items.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  function renderBunteDetails() {
    if (!question || question.type !== 'BUNTE_TUETE' || !question.bunteTuete) {
      return null;
    }
    const payload = question.bunteTuete as BunteTuetePayload;
    if (payload.kind === 'top5' || payload.kind === 'order') {
      return (
        <div style={{ marginTop: 12 }}>
          <div style={pillLabel}>{language === 'de' ? 'Liste' : 'List'}</div>
          <ol style={{ margin: '6px 0 0', paddingInlineStart: 18, color: '#cbd5e1' }}>
            {payload.items.map((item) => (
              <li key={item.id} style={{ marginBottom: 4 }}>
                {item.label}
              </li>
            ))}
          </ol>
        </div>
      );
    }
    if (payload.kind === 'oneOfEight') {
      return (
        <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
          <div style={pillLabel}>{language === 'de' ? 'Aussagen' : 'Statements'}</div>
          {payload.statements.map((statement) => (
            <div key={statement.id} style={{ fontSize: 14, color: '#cbd5e1' }}>
              <strong style={{ marginRight: 6 }}>{statement.id}.</strong> {statement.text}
            </div>
          ))}
        </div>
      );
    }
    if (payload.kind === 'precision') {
      return (
        <div style={{ marginTop: 12, color: '#cbd5e1' }}>
          <div style={pillLabel}>{language === 'de' ? 'Hinweis' : 'Hint'}</div>
          <p style={{ margin: '4px 0 0' }}>{payload.prompt}</p>
        </div>
      );
    }
    return null;
  }

  function renderInput(accent: string) {
    if (!question) return null;
    if (question.type === 'BUNTE_TUETE' && question.bunteTuete) {
      return renderBunteInput(question.bunteTuete as BunteTuetePayload, accent);
    }
    switch (question.mechanic) {
      case 'multipleChoice': {
        const q = question as MultipleChoiceQuestion;
        return (
          <div style={{ display: 'grid', gap: 10 }}>
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                className={`team-choice${answer === String(idx) ? ' is-selected' : ''}`}
                style={{
                  ...choiceButton,
                  border: `1px solid ${accent}55`,
                  background: answer === String(idx) ? `${accent}22` : 'rgba(255,255,255,0.08)',
                  color: '#e2e8f0',
                  boxShadow: answer === String(idx) ? `0 10px 24px ${accent}35` : 'none'
                }}
                onClick={() => setAnswer(String(idx))}
                disabled={!canAnswer}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      }
      case 'betting': {
        const opts = (question as any).options ?? ['A', 'B', 'C'];
        const pool = (question as any).pointsPool ?? 10;
        const total = bettingPoints.reduce((a, b) => a + b, 0);
        const remaining = pool - total;
        const updateBet = (idx: number, value: number) => {
          const clean = Math.max(0, Math.min(pool, Math.round(value)));
          const next = [...bettingPoints] as [number, number, number];
          next[idx] = clean;
          const sum = next.reduce((a, b) => a + b, 0);
          if (sum > pool) {
            const overflow = sum - pool;
            next[idx] = Math.max(0, clean - overflow);
          }
          setBettingPoints(next);
        };
        const letters = ['A', 'B', 'C'];
        return (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ color: 'var(--muted)', fontWeight: 700 }}>{t('betHint')(pool)}</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {opts.slice(0, 3).map((opt: string, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: `1px solid ${accent}55`,
                    background: 'rgba(255,255,255,0.06)'
                  }}
                >
                  <div style={{ ...pillLabel, background: `${accent}22`, color: '#e2e8f0' }}>{letters[idx]}</div>
                  <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{opt}</div>
                  <input
                    type="number"
                    min={0}
                    max={pool}
                    value={bettingPoints[idx] ?? 0}
                    onChange={(e) => updateBet(idx, Number(e.target.value))}
                    disabled={!canAnswer}
                    className="team-answer-input"
                    style={{
                      width: 70,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: `1px solid ${accent}55`,
                      background: 'rgba(0,0,0,0.35)',
                      color: '#e2e8f0',
                      fontWeight: 800,
                      textAlign: 'center'
                    }}
                  />
                </div>
              ))}
            </div>
            <div
              style={{
                color: remaining === 0 ? '#22c55e' : remaining < 0 ? '#f87171' : '#fbbf24',
                fontWeight: 800,
                textAlign: 'right'
              }}
            >
              {t('betRemaining')(remaining)}
            </div>
          </div>
        );
      }
      case 'trueFalse':
        return (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`team-choice${answer === 'true' ? ' is-selected' : ''}`}
              style={{
                ...choiceButton,
                border: `1px solid ${accent}55`,
                background: answer === 'true' ? `${accent}22` : 'rgba(255,255,255,0.08)',
                color: '#e2e8f0',
                boxShadow: answer === 'true' ? `0 10px 24px ${accent}35` : 'none'
              }}
              onClick={() => setAnswer('true')}
              disabled={!canAnswer}
            >
              {t('tfTrue')}
            </button>
            <button
              className={`team-choice${answer === 'false' ? ' is-selected' : ''}`}
              style={{
                ...choiceButton,
                border: `1px solid ${accent}55`,
                background: answer === 'false' ? `${accent}22` : 'rgba(255,255,255,0.08)',
                color: '#e2e8f0',
                boxShadow: answer === 'false' ? `0 10px 24px ${accent}35` : 'none'
              }}
              onClick={() => setAnswer('false')}
              disabled={!canAnswer}
            >
              {t('tfFalse')}
            </button>
          </div>
        );
      case 'sortItems': {
        const q = question as SortItemsQuestion;
        return (
          <input
            className="team-answer-input"
            style={inputStyle}
            placeholder={t('inputOrder')}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!canAnswer}
          />
        );
      }
      default: {
        const unit = (question as any).unit;
        return (
          <input
            className="team-answer-input"
            style={inputStyle}
            placeholder={t('inputNumber')(unit)}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!canAnswer}
            autoFocus
          />
        );
      }
    }
  }

  function renderShowResult() {
    return (
      <div 
        className={feedbackAnimation ? (feedbackAnimation === 'success' ? 'success-animation' : 'shake-animation') : ''}
        style={{ ...glassCard, alignItems: 'center', textAlign: 'center', padding: '24px 20px' }}
      >
      <div style={pillLabel}>
        {isFinal
          ? language === 'de'
            ? 'Final'
            : 'Final'
          : evaluating
          ? language === 'de'
            ? 'Host prueft...'
            : 'Host reviewing...'
          : language === 'de'
          ? 'Ergebnis'
          : 'Result'}
      </div>
      {!evaluating && (
        <div style={{
          margin: '12px 0 0',
          padding: '12px 16px',
          borderRadius: 14,
          background: resultCorrect 
            ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(74,222,128,0.08))'
            : 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(249,115,22,0.08))',
          border: resultCorrect
            ? '1px solid rgba(34,197,94,0.3)'
            : '1px solid rgba(251,146,60,0.3)',
          backdropFilter: 'blur(20px)'
        }}>
          <p style={{ 
            margin: 0, 
            color: resultCorrect ? '#4ade80' : '#fb923c', 
            fontSize: 24, 
            fontWeight: 900,
            background: resultCorrect
              ? 'linear-gradient(135deg, #4ade80, #22c55e)'
              : 'linear-gradient(135deg, #fb923c, #f97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {t('resultTitle')(resultCorrect)}
          </p>
        </div>
      )}
      {evaluating && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '12px 0' }}>
          <PulseIndicator />
        </div>
      )}
      {answer && (
        <p style={{ margin: evaluating ? '12px 0 0' : '8px 0 0', color: '#cbd5e1', fontWeight: 700, fontSize: 14, wordBreak: 'break-word' }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{language === 'de' ? 'Eure Antwort:' : 'Your answer:'}</span>
          <br />
          {answer}
        </p>
      )}
      {resultMessage && <p style={{ margin: '8px 0 0', color: '#f3ba27' }}>{resultMessage}</p>}
      {resultPoints !== null && (
        <p style={{ margin: '8px 0 0', color: '#22c55e', fontWeight: 700 }}>
          +{resultPoints} {language === 'de' ? 'Punkte' : 'Points'}
          {resultDetail ? ` (${resultDetail})` : ''}
        </p>
      )}
      {solution && (
        <p style={{ margin: '12px 0 0', color: '#e2e8f0', fontWeight: 700, padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{language === 'de' ? 'Richtige Antwort:' : 'Correct answer:'}</span>
          <br />
          {solution}
        </p>
      )}
    </div>
    );
  }

  function renderPotatoStage() {
    if (!teamId) return renderNotJoined();
    const heading =
      language === 'en'
        ? 'Hot Potato Final'
        : language === 'both'
        ? 'Heisse Kartoffel / Hot Potato'
        : 'Heisse Kartoffel Finale';
    if (!potatoState) {
      return (
        <div style={{ ...glassCard, alignItems: 'center', textAlign: 'center', padding: '24px 20px' }}>
          <div style={pillLabel}>{heading}</div>
          <p style={{ ...mutedText, margin: 0 }}>
            {language === 'en'
              ? 'Final stage is being prepared. Stay ready!'
              : language === 'both'
              ? 'Finale wird vorbereitet / Final stage is being prepared.'
              : 'Finale wird vorbereitet. Bleibt bereit!'}
          </p>
        </div>
      );
    }
    const roundTotal = potatoState.selectedThemes?.length ?? 0;
    const phase = potatoState.phase;
    const roundLabel =
      roundTotal > 0 && potatoState.roundIndex >= 0
        ? `${potatoState.roundIndex + 1}/${roundTotal}`
        : roundTotal > 0
        ? `0/${roundTotal}`
        : language === 'en'
        ? 'Setup'
        : 'Vorbereitung';
    const activeTeamName = potatoState.activeTeamId
      ? scoreboardLookup[potatoState.activeTeamId]?.name || potatoState.activeTeamId
      : null;
    const lives = potatoState.lives || {};
    const turnOrder = potatoState.turnOrder.length ? potatoState.turnOrder : Object.keys(lives);
    const bans = potatoState.bans || {};
    const banLimits = potatoState.banLimits || {};
    const selectedThemes = potatoState.selectedThemes || [];
    const lastWinner =
      potatoState.lastWinnerId && scoreboardLookup[potatoState.lastWinnerId]
        ? scoreboardLookup[potatoState.lastWinnerId].name
        : potatoState.lastWinnerId || null;
    const infoCopy =
      language === 'en'
        ? 'Max. 30 seconds per answer - duplicates = strike.'
        : language === 'both'
        ? 'Max. 30 Sekunden pro Antwort / Max. 30 seconds per answer. Doppelte Antworten verlieren ein Leben.'
        : 'Max. 30 Sekunden pro Antwort. Doppelte Antworten verlieren ein Leben.';
    const usedAnswers = potatoState.usedAnswers || [];
    const isActiveTeam = potatoState.activeTeamId === teamId;
    const ownAttempt =
      potatoState.lastAttempt && potatoState.lastAttempt.teamId === teamId ? potatoState.lastAttempt : null;
    const relevantConflict =
      ownAttempt && potatoState.pendingConflict && potatoState.pendingConflict.answer === ownAttempt.text
        ? potatoState.pendingConflict
        : null;
    const attemptLabel = ownAttempt
      ? {
          ok: inlineCopy('OK', 'OK'),
          dup: inlineCopy('DUPLIKAT', 'DUPLICATE'),
          invalid: inlineCopy('UNGUELTIG', 'INVALID'),
          timeout: inlineCopy('TIMEOUT', 'TIMEOUT'),
          pending: inlineCopy('PRUEFUNG', 'CHECKING')
        }[ownAttempt.verdict]
      : null;
    const attemptTone = ownAttempt
      ? {
          ok: '#22c55e',
          dup: '#fbbf24',
          invalid: '#f87171',
          timeout: '#f87171',
          pending: '#cbd5e1'
        }[ownAttempt.verdict]
      : '#cbd5e1';
    const attemptMessage = (() => {
      if (!ownAttempt) return null;
      if (ownAttempt.verdict === 'ok') {
        return inlineCopy('Sitzt! Weitergeben.', 'Locked in! Keep it moving.');
      }
      if (ownAttempt.verdict === 'dup') {
        const conflictText =
          relevantConflict?.conflictingAnswer || inlineCopy('eine fruehere Antwort', 'an earlier answer');
        if (ownAttempt.reason === 'similar') {
          return inlineCopy(`Sehr aehnlich zu ${conflictText}.`, `Very similar to ${conflictText}.`);
        }
        return inlineCopy(`Schon genannt: ${conflictText}.`, `Already used: ${conflictText}.`);
      }
      if (ownAttempt.verdict === 'invalid') {
        if (ownAttempt.reason === 'not-listed') {
          return inlineCopy(
            'Nicht auf der Themenliste. Moderator entscheidet.',
            'Not on the theme list. Moderator decides.'
          );
        }
        if (ownAttempt.reason === 'empty') {
          return inlineCopy('Bitte gib etwas ein.', 'Please enter something.');
        }
        if (ownAttempt.reason === 'rejected') {
          return inlineCopy('Moderator hat abgelehnt.', 'Moderator rejected this answer.');
        }
        return inlineCopy('Ungueltig. Bitte neu versuchen.', 'Invalid, please try again.');
      }
      if (ownAttempt.verdict === 'timeout') {
        return inlineCopy('Zu spaet. Leben in Gefahr.', 'Too late. Life is in danger.');
      }
      return inlineCopy('Wird geprueft ...', 'Checking attempt ...');
    })();
    function renderScoreboardBlock() {
      return (
      <div style={{ marginTop: 10 }}>
        <div style={pillLabel}>{language === 'en' ? 'Scoreboard' : language === 'both' ? 'Scoreboard / Punkte' : 'Scoreboard'}</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
          {sortedScoreboard.length === 0 && (
            <div style={{ ...mutedText, textAlign: 'center' }}>
              {language === 'en' ? 'No teams yet.' : language === 'both' ? 'Noch keine Teams / No teams yet.' : 'Noch keine Teams.'}
            </div>
          )}
          {sortedScoreboard.map((entry, idx) => (
            <div
              key={`potato-score-${entry.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(2,6,23,0.6)'
              }}
            >
              <span style={{ fontWeight: 800 }}>{idx + 1}.</span>
              <span>{entry.name}</span>
              <CountUpNumber value={entry.score ?? 0} style={{ fontWeight: 800 }} />
            </div>
          ))}
        </div>
      </div>
    );
    }
    function renderThemes() {
      return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {selectedThemes.map((theme, idx) => {
          const done = potatoState.roundIndex >= idx;
          const current = potatoState.roundIndex === idx;
          return (
            <span
              key={`potato-theme-${idx}`}
              style={{
                ...pillSmall,
                background: current ? 'rgba(251,191,36,0.18)' : done ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.06)',
                border: current
                  ? '1px solid rgba(251,191,36,0.45)'
                  : done
                  ? '1px solid rgba(34,197,94,0.35)'
                  : '1px solid rgba(255,255,255,0.12)',
                color: '#e2e8f0'
              }}
            >
              {theme}
            </span>
          );
        })}
        {selectedThemes.length === 0 && <span style={{ ...mutedText }}>{language === 'en' ? 'Themes pending...' : 'Themen folgen...'}</span>}
      </div>
    );
    }
    function renderLives() {
      return (
      <div style={{ display: 'grid', gap: 6 }}>
        {turnOrder.map((teamId) => {
          const livesLeft = lives[teamId] ?? (Object.keys(lives).length <= 2 ? 1 : 2);
          return (
            <div
              key={`potato-life-${teamId}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                borderRadius: 12,
                border: teamId === potatoState.activeTeamId ? '1px solid rgba(248,113,113,0.4)' : '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(15,23,42,0.65)'
              }}
            >
              <span>{scoreboardLookup[teamId]?.name || teamId}</span>
              <span style={{ fontWeight: 800 }}>{'?'.repeat(Math.max(1, livesLeft))}</span>
            </div>
          );
        })}
      </div>
    );
    }

    return (
      <div style={{ ...glassCard, display: 'grid', gap: 10 }}>
        <div style={{ ...pillLabel, justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
          <span>{heading}</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {language === 'en' ? 'Round' : 'Runde'} {roundLabel}
          </span>
        </div>

        {phase === 'BANNING' && (
          <>
            <p style={mutedText}>
              {language === 'de'
                ? 'Teams bannen Themen vor dem Finale. Beobachtet, welche Themen uebrig bleiben.'
                : language === 'both'
                ? 'Teams bannen Themen / Teams are banning topics.'
                : 'Teams are banning topics before the final.'}
            </p>
            {renderThemes()}
            <div style={{ display: 'grid', gap: 6 }}>
              {sortedScoreboard.map((team) => {
                const limit = banLimits[team.id] ?? 0;
                return (
                  <div
                    key={`ban-${team.id}`}
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      padding: '8px 10px',
                      background: 'rgba(2,6,23,0.6)'
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{team.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      {language === 'en' ? 'Bans' : language === 'both' ? 'Bans / Verbote' : 'Bans'} ({limit}):
                      {' '}
                      {bans[team.id]?.length ? bans[team.id].join(', ') : '?'}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {phase === 'PLAYING' && (
          <>
            <div style={{ ...pillLabel, justifyContent: 'flex-start', gap: 8 }}>
              <span>{language === 'en' ? 'Topic' : language === 'both' ? 'Thema / Topic' : 'Thema'}:</span>
              <strong>{potatoState.currentTheme || '?'}</strong>
            </div>
            <div style={{ fontWeight: 700 }}>
              {language === 'en' ? 'Active team' : language === 'both' ? 'Team am Zug / Active team' : 'Team am Zug'}:{' '}
              {activeTeamName || '?'}
            </div>
            <div style={{ color: potatoCountdown !== null && potatoCountdown <= 1 ? '#f87171' : '#cbd5e1' }}>
              {potatoCountdown !== null ? `${Math.max(0, potatoCountdown)}s - ${infoCopy}` : infoCopy}
            </div>
            {potatoDeadlinePassed && (
              <div
                style={{
                  ...pillSmall,
                  background: 'rgba(248,113,113,0.18)',
                  borderColor: 'rgba(248,113,113,0.4)',
                  color: '#fecaca'
                }}
              >
                {language === 'en' ? 'Time is up!' : language === 'both' ? 'Zeit abgelaufen / Time is up!' : 'Zeit abgelaufen!'}
              </div>
            )}
            {renderLives()}
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {language === 'en'
                ? `${usedAnswers.length} answers already used.`
                : language === 'both'
                ? `${usedAnswers.length} Antworten genutzt / answers used.`
                : `${usedAnswers.length} Antworten bereits genutzt.`}
            </div>
            {isActiveTeam ? (
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                  {language === 'en' ? 'Your answer' : language === 'both' ? 'Deine Antwort / Your answer' : 'Deine Antwort'}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <input
                    ref={potatoInputRef}
                    className="team-answer-input"
                    style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                    value={potatoInput}
                    disabled={potatoSubmitting || potatoDeadlinePassed}
                    onChange={(e) => setPotatoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submitPotatoAnswer();
                      }
                    }}
                    placeholder={inlineCopy('Antwort eintippen ...', 'Type your answer ...')}
                  />
                  <button
                    style={{
                      ...primaryButton,
                      opacity: potatoSubmitting ? 0.7 : 1,
                      minWidth: 130
                    }}
                    disabled={potatoSubmitting || potatoDeadlinePassed}
                    onClick={submitPotatoAnswer}
                  >
                    {potatoSubmitting
                      ? inlineCopy('Sende...', 'Sending...')
                      : inlineCopy('Antwort senden', 'Submit answer')}
                  </button>
                </div>
                {showPotatoOkToast && (
                  <div
                    style={{
                      ...pillSmall,
                      background: 'rgba(34,197,94,0.15)',
                      borderColor: 'rgba(34,197,94,0.45)',
                      color: '#bbf7d0',
                      width: 'fit-content'
                    }}
                  >
                    {inlineCopy('OK Gueltig!', 'OK Accepted!')}
                  </div>
                )}
                {ownAttempt && (
                  <div
                    style={{
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 12,
                      padding: '8px 10px',
                      background: 'rgba(15,23,42,0.6)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <strong style={{ color: '#e2e8f0' }}>"{ownAttempt.text || '?'}"</strong>
                      {attemptLabel && (
                        <span
                          style={{
                            ...pillSmall,
                            background: 'transparent',
                            borderColor: attemptTone,
                            color: attemptTone
                          }}
                        >
                          {attemptLabel}
                        </span>
                      )}
                    </div>
                    {attemptMessage && (
                      <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: 13 }}>{attemptMessage}</p>
                    )}
                  </div>
                )}
                {potatoError && (
                  <div style={{ color: '#fca5a5', fontSize: 13, fontWeight: 600 }}>{potatoError}</div>
                )}
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '8px 10px',
                  background: 'rgba(2,6,23,0.5)',
                  color: '#e2e8f0',
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                {activeTeamName
                  ? inlineCopy(
                      `${activeTeamName} ist dran. Bereit halten!`,
                      `${activeTeamName} is on the clock. Stand by!`
                    )
                  : inlineCopy('Ein anderes Team ist am Zug.', 'Another team is on the clock.')}
              </div>
            )}
            {usedAnswers.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ ...pillLabel }}>
                  {language === 'en'
                    ? 'Already used'
                    : language === 'both'
                    ? 'Schon genannt / Already used'
                    : 'Schon genannt'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {usedAnswers.map((answer, idx) => (
                    <span
                      key={`potato-used-${idx}`}
                      style={{
                        ...pillSmall,
                        background: 'rgba(148,163,184,0.18)',
                        borderColor: 'rgba(148,163,184,0.4)',
                        color: '#e2e8f0'
                      }}
                    >
                      {answer}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {phase === 'ROUND_END' && (
          <>
            <div style={{ fontWeight: 700 }}>
              {language === 'en'
                ? 'Round finished'
                : language === 'both'
                ? 'Runde beendet / Round finished'
                : 'Runde beendet'}
            </div>
            {lastWinner && (
              <div style={{ color: '#bbf7d0', fontWeight: 700 }}>
                {language === 'en' ? 'Winner' : language === 'both' ? 'Sieger / Winner' : 'Sieger'}: {lastWinner}
              </div>
            )}
            {renderThemes()}
            <p style={mutedText}>
              {language === 'en'
                ? 'Host prepares the next round.'
                : language === 'both'
                ? 'Host startet gleich die naechste Runde / Host prepares next round.'
                : 'Host bereitet die naechste Runde vor.'}
            </p>
          </>
        )}

        {phase === 'DONE' && (
          <div style={{ fontWeight: 700 }}>
            {language === 'en'
              ? 'Hot Potato finished. Await the awards!'
              : language === 'both'
              ? 'Finale beendet ? Awards gleich / Hot Potato finished.'
              : 'Heisse Kartoffel beendet ? Awards gleich!'}
          </div>
        )}

        {renderScoreboardBlock()}
      </div>
    );
  }

  function submitBlitzAnswers() {
    if (!teamId || !socketRef.current) return;
    socketRef.current.emit(
      'team:submitBlitzAnswers',
      { roomCode, teamId, answers: blitzAnswers },
      (resp?: { ok?: boolean; error?: string }) => {
        if (!resp?.ok && resp?.error) {
          setToast(resp.error);
          setTimeout(() => setToast(null), 2000);
        } else {
          setBlitzSubmitted(true);
        }
      }
    );
  }

  function submitPotatoAnswer() {
    if (!teamId || !socketRef.current) return;
    if (!potatoState || potatoState.phase !== 'PLAYING') {
      setPotatoError(inlineCopy('Finale ist noch nicht aktiv.', 'Final stage has not started yet.'));
      return;
    }
    if (potatoState.activeTeamId !== teamId) {
      setPotatoError(
        inlineCopy('Nur das aktive Team darf antworten.', 'Only the active team may answer right now.')
      );
      return;
    }
    if (potatoCountdown !== null && potatoCountdown <= 0) {
      setPotatoError(inlineCopy('Zeit ist abgelaufen.', 'Time is up.'));
      return;
    }
    const trimmed = potatoInput.trim();
    if (!trimmed) {
      setPotatoError(inlineCopy('Bitte gib eine Antwort ein.', 'Please enter an answer.'));
      return;
    }
    setPotatoSubmitting(true);
    setPotatoError(null);
    socketRef.current.emit(
      'team:submitPotatoAnswer',
      { roomCode, teamId, text: trimmed },
      (resp?: { error?: string }) => {
        if (resp?.error) {
          setPotatoSubmitting(false);
          setPotatoError(resp.error);
        }
      }
    );
  }

  function submitBlitzBan(themeId: string) {
    if (!teamId || !socketRef.current) return;
    socketRef.current.emit(
      'team:blitzBanCategory',
      { roomCode, teamId, themeId },
      (resp?: { error?: string }) => {
        if (resp?.error) {
          setToast(resp.error);
          setTimeout(() => setToast(null), 2000);
        }
      }
    );
  }

  function submitBlitzPick(themeId: string) {
    if (!teamId || !socketRef.current) return;
    socketRef.current.emit(
      'team:blitzPickCategory',
      { roomCode, teamId, themeId },
      (resp?: { error?: string }) => {
        if (resp?.error) {
          setToast(resp.error);
          setTimeout(() => setToast(null), 2000);
        }
      }
    );
  }

  function submitRundlaufAnswer(pass = false) {
    if (!teamId || !socketRef.current) return;
    if (gameState !== 'RUNDLAUF_PLAY') {
      setRundlaufError(inlineCopy('K.O.-Rallye ist noch nicht aktiv.', 'Knockout relay is not active yet.'));
      return;
    }
    if (!rundlaufState || rundlaufState.activeTeamId !== teamId) {
      setRundlaufError(inlineCopy('Nur das aktive Team darf antworten.', 'Only the active team may answer.'));
      return;
    }
    if (!pass && !rundlaufInput.trim()) {
      setRundlaufError(inlineCopy('Bitte gib eine Antwort ein.', 'Please enter an answer.'));
      return;
    }
    setRundlaufSubmitting(true);
    setRundlaufError(null);
    socketRef.current.emit(
      'team:submitRundlaufAnswer',
      { roomCode, teamId, text: rundlaufInput.trim(), pass },
      (resp?: { error?: string }) => {
        setRundlaufSubmitting(false);
        if (resp?.error) {
          setRundlaufError(resp.error);
        } else if (!pass) {
          setRundlaufInput('');
        }
      }
    );
  }

  function submitRundlaufBan(categoryId: string) {
    if (!teamId || !socketRef.current) return;
    socketRef.current.emit(
      'team:rundlaufBanCategory',
      { roomCode, teamId, categoryId },
      (resp?: { error?: string }) => {
        if (resp?.error) {
          setRundlaufError(resp.error);
        }
      }
    );
  }

  function submitRundlaufPick(categoryId: string) {
    if (!teamId || !socketRef.current) return;
    socketRef.current.emit(
      'team:rundlaufPickCategory',
      { roomCode, teamId, categoryId },
      (resp?: { error?: string }) => {
        if (resp?.error) {
          setRundlaufError(resp.error);
        }
      }
    );
  }

  function renderRundlaufStage() {
    if (!teamId) return renderNotJoined();
    const state = rundlaufState;
    if (!state) {
      return (
        <div style={{ ...glassCard, textAlign: 'center' }}>
          <div style={pillLabel}>K.O.-Rallye</div>
          <p style={mutedText}>
            {language === 'de'
              ? 'K.O.-Rallye wird vorbereitet.'
              : language === 'both'
              ? 'K.O.-Rallye wird vorbereitet / Knockout relay is preparing.'
              : 'Knockout relay is preparing.'}
          </p>
        </div>
      );
    }
    const currentCategory = state.currentCategory?.title || state.selected[state.roundIndex]?.title || '?';
    const activeTeamName = state.activeTeamId ? scoreboardLookup[state.activeTeamId]?.name || state.activeTeamId : null;
    const isActive = state.activeTeamId === teamId;
    const isEliminated = state.eliminatedTeamIds?.includes(teamId);
    const winners = state.roundWinners || [];
    const winnerNames = winners.map((id) => scoreboardLookup[id]?.name || id).join(', ');
    const scoreboardBlock = (
      <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
        {sortedScoreboard.map((entry, idx) => (
          <div
            key={`rundlauf-score-${entry.id}`}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(2,6,23,0.6)'
            }}
          >
            <span style={{ fontWeight: 800 }}>{idx + 1}.</span>
            <span>{entry.name}</span>
            <span style={{ fontWeight: 800 }}>{entry.score ?? 0}</span>
          </div>
        ))}
      </div>
    );

    if (gameState === 'RUNDLAUF_PAUSE') {
      return renderWaiting(
        language === 'de' ? 'Pause – K.O.-Rallye startet gleich' : language === 'both' ? 'Pause / Knockout relay starts soon' : 'Knockout relay starts soon',
        language === 'de' ? 'Bleibt bereit.' : 'Stay ready.'
      );
    }
    if (gameState === 'RUNDLAUF_SCOREBOARD_PRE') {
      return (
        <div style={{ ...glassCard, textAlign: 'center' }}>
          <div style={pillLabel}>{language === 'de' ? 'Zwischenstand' : 'Scoreboard'}</div>
          <p style={mutedText}>{language === 'de' ? 'Platzierung vor der K.O.-Rallye.' : 'Standings before the knockout relay.'}</p>
          {scoreboardBlock}
        </div>
      );
    }
    if (gameState === 'RUNDLAUF_CATEGORY_SELECT') {
      const pool = rundlaufState?.pool ?? [];
      const bans = new Set(rundlaufState?.bans ?? []);
      const pinnedId = rundlaufState?.pinned?.id ?? null;
      const isTopTeam = Boolean(teamId && rundlaufState?.topTeamId === teamId);
      const isLastTeam = Boolean(teamId && rundlaufState?.lastTeamId === teamId);
      const banCount = rundlaufState?.bans?.length ?? 0;
      return (
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 10 }}>
          <div style={pillLabel}>{language === 'de' ? 'Kategorienwahl' : 'Category select'}</div>
          {isTopTeam && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {language === 'de'
                ? `Du bist Platz 1: streiche ${Math.max(0, 2 - banCount)} Kategorien`
                : `You are top: ban ${Math.max(0, 2 - banCount)} categories`}
            </div>
          )}
          {isLastTeam && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {language === 'de' ? 'Du bist letzter Platz: waehle 1 Kategorie' : 'You are last: pick 1 category'}
            </div>
          )}
          {!isTopTeam && !isLastTeam && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {language === 'de' ? 'Bitte warten...' : 'Please wait...'}
            </div>
          )}
          <div style={{ display: 'grid', gap: 8 }}>
            {pool.map((entry) => {
              const isBanned = bans.has(entry.id);
              const isPinned = pinnedId === entry.id;
              return (
                <div
                  key={`rundlauf-team-pick-${entry.id}`}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: isPinned ? 'rgba(96,165,250,0.15)' : 'rgba(15,23,42,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    opacity: isBanned ? 0.5 : 1
                  }}
                >
                  <span>{entry.title}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {isTopTeam && (
                      <button
                        style={{
                          ...primaryButton,
                          padding: '6px 10px',
                          fontSize: 12,
                          background: 'rgba(248,113,113,0.2)',
                          border: '1px solid rgba(248,113,113,0.4)',
                          color: '#fecaca',
                          opacity: isBanned || banCount >= 2 || isPinned ? 0.4 : 1,
                          cursor: isBanned || banCount >= 2 || isPinned ? 'not-allowed' : 'pointer'
                        }}
                        disabled={isBanned || banCount >= 2 || isPinned}
                        onClick={() => submitRundlaufBan(entry.id)}
                      >
                        {language === 'de' ? 'Bannen' : 'Ban'}
                      </button>
                    )}
                    {isLastTeam && (
                      <button
                        style={{
                          ...primaryButton,
                          padding: '6px 10px',
                          fontSize: 12,
                          background: 'rgba(34,197,94,0.2)',
                          border: '1px solid rgba(34,197,94,0.45)',
                          color: '#bbf7d0',
                          opacity: isPinned || isBanned ? 0.4 : 1,
                          cursor: isPinned || isBanned ? 'not-allowed' : 'pointer'
                        }}
                        disabled={isPinned || isBanned}
                        onClick={() => submitRundlaufPick(entry.id)}
                      >
                        {language === 'de' ? 'Waehlen' : 'Pick'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    if (gameState === 'RUNDLAUF_ROUND_INTRO') {
      return renderWaiting(
        language === 'de' ? `K.O.-Rallye – ${currentCategory}` : language === 'both' ? `K.O.-Rallye / Knockout relay – ${currentCategory}` : `Knockout relay – ${currentCategory}`,
        language === 'de' ? 'Gleich geht es los.' : 'Starting shortly.'
      );
    }
    if (gameState === 'RUNDLAUF_PLAY') {
      if (isEliminated) {
        return (
          <div style={{ ...glassCard, textAlign: 'center' }}>
            <div style={pillLabel}>{language === 'de' ? 'K.O.-Rallye' : 'Knockout relay'}</div>
            <p style={{ ...mutedText, marginBottom: 0 }}>
              {language === 'de'
                ? 'Du bist fuer diese Runde raus.'
                : language === 'both'
                ? 'Du bist raus / You are out for this round.'
                : 'You are out for this round.'}
            </p>
          </div>
        );
      }
      if (!isActive) {
        return (
          <div style={{ ...glassCard, textAlign: 'center' }}>
            <div style={pillLabel}>{language === 'de' ? 'K.O.-Rallye' : 'Knockout relay'}</div>
            <p style={mutedText}>
              {activeTeamName
                ? inlineCopy(`${activeTeamName} ist dran.`, `${activeTeamName} is up.`)
                : inlineCopy('Ein anderes Team ist dran.', 'Another team is up.')}
            </p>
            <div style={{ ...pillSmall, marginTop: 8 }}>{currentCategory}</div>
          </div>
        );
      }
      const ownAttempt = state.lastAttempt && state.lastAttempt.teamId === teamId ? state.lastAttempt : null;
      return (
        <div style={{ ...glassCard, display: 'grid', gap: 10 }}>
          <div style={pillLabel}>{language === 'de' ? 'Du bist dran' : language === 'both' ? 'Du bist dran / Your turn' : 'Your turn'}</div>
          <div style={{ fontWeight: 700 }}>{currentCategory}</div>
          <input
            className="team-answer-input"
            style={inputStyle}
            placeholder={language === 'de' ? 'Antwort eingeben' : 'Enter answer'}
            value={rundlaufInput}
            onChange={(e) => setRundlaufInput(e.target.value)}
            disabled={rundlaufSubmitting}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <PrimaryButton onClick={() => submitRundlaufAnswer(false)} disabled={rundlaufSubmitting}>
              {language === 'de' ? 'Senden' : 'Submit'}
            </PrimaryButton>
            <button
              style={{
                ...primaryButton,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                color: '#94a3b8',
                border: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(30px)',
                transition: 'all 0.3s ease',
                minHeight: 44,
                cursor: rundlaufSubmitting ? 'not-allowed' : 'pointer',
                opacity: rundlaufSubmitting ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!rundlaufSubmitting) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))';
                  e.currentTarget.style.color = '#cbd5e1';
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))';
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)';
              }}
              onClick={() => submitRundlaufAnswer(true)}
              disabled={rundlaufSubmitting}
            >
              {language === 'de' ? 'Pass' : 'Pass'}
            </button>
          </div>
          {rundlaufError && <div style={{ color: '#fbbf24', fontWeight: 700 }}>{rundlaufError}</div>}
          {ownAttempt && ownAttempt.verdict === 'pending' && (
            <div style={{ color: '#cbd5e1', fontWeight: 700 }}>
              {language === 'de' ? 'Warte auf Moderator...' : 'Waiting for host...'}
            </div>
          )}
        </div>
      );
    }
    if (gameState === 'RUNDLAUF_ROUND_END') {
      return (
        <div style={{ ...glassCard, textAlign: 'center' }}>
          <div style={pillLabel}>{language === 'de' ? 'Runde beendet' : 'Round finished'}</div>
          {winnerNames && (
            <p style={{ ...mutedText, marginBottom: 0 }}>
              {language === 'de' ? 'Gewinner' : 'Winner'}: {winnerNames}
            </p>
          )}
        </div>
      );
    }
    if (gameState === 'RUNDLAUF_SCOREBOARD_FINAL' || gameState === 'SIEGEREHRUNG') {
      return (
        <div style={{ ...glassCard, textAlign: 'center' }}>
          <div style={pillLabel}>{language === 'de' ? 'Finale' : 'Final'}</div>
          {scoreboardBlock}
        </div>
      );
    }
    return renderWaiting(language === 'de' ? 'Warten...' : 'Waiting...');
  }

  function renderBlitzStage() {
    if (!blitzState) {
      return (
        <div style={{ ...glassCard, textAlign: 'center' }}>
          <div style={pillLabel}>{language === 'de' ? 'Blitz Battle' : 'Blitz battle'}</div>
          <p style={mutedText}>{language === 'de' ? 'Host bereitet gerade den Blitz vor.' : 'Host is preparing the blitz round.'}</p>
        </div>
      );
    }
    const phase = (() => {
      switch (gameState) {
        case 'BLITZ_READY':
          return 'READY';
        case 'BLITZ_BANNING':
          return 'BANNING';
        case 'BLITZ_SET_INTRO':
          return 'ROUND_INTRO';
        case 'BLITZ_PLAYING':
          return 'PLAYING';
        case 'BLITZ_SET_END':
          return 'SET_END';
        case 'BLITZ_SCOREBOARD':
        case 'BLITZ_PAUSE':
          return 'DONE';
        default:
          return blitzState.phase ?? 'IDLE';
      }
    })();
    const canAnswer = phase === 'PLAYING' && !blitzSubmitted;
    const results = blitzState.results || {};
    const themeLabel = blitzState.theme?.title || '?';
    const submissionCount = blitzState.submissions?.length ?? 0;
    const totalTeamsLabel = teamCount ? String(teamCount) : '?';
    const currentItem = blitzItems[activeBlitzItemIndex];
    const totalItems = blitzItems.length || blitzAnswers.length || 5;
    const pool = blitzState.pool ?? [];
    const bannedIds = new Set(Object.values(blitzState.bans ?? {}).flat());
    const pinnedId = blitzState.pinnedTheme?.id ?? null;
    const isTopTeam = Boolean(teamId && blitzState.topTeamId === teamId);
    const isLastTeam = Boolean(teamId && blitzState.lastTeamId === teamId);
    const banLimit = teamId ? blitzState.banLimits?.[teamId] ?? 0 : 0;
    const banCount = teamId ? blitzState.bans?.[teamId]?.length ?? 0 : 0;
    if (phase === 'READY') {
      return (
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 10 }}>
          <div style={pillLabel}>{language === 'de' ? 'Fotosprint' : 'Photo sprint'}</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            {language === 'de' ? 'Fotosprint startet gleich' : 'Photo sprint starts soon'}
          </div>
          <div style={{ fontSize: 13, color: '#cbd5e1' }}>
            {language === 'de'
              ? 'Bitte bereit machen.'
              : 'Please get ready.'}
          </div>
          {teamId && (
            <button
              style={{
                ...primaryButton,
                background: isReady ? accentPink : `${accentPink}22`,
                color: isReady ? '#0d0f14' : '#e2e8f0',
                border: `1px solid ${accentPink}66`,
                opacity: connectionStatus === 'connected' ? 1 : 0.6,
                cursor: connectionStatus === 'connected' ? 'pointer' : 'not-allowed'
              }}
              onClick={connectionStatus === 'connected' ? toggleReady : undefined}
              disabled={connectionStatus !== 'connected'}
            >
              {isReady ? t('readyOn') : language === 'de' ? 'Bereit' : 'Ready'}
            </button>
          )}
        </div>
      );
    }
    if (phase === 'BANNING') {
      return (
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 10 }}>
          <div style={pillLabel}>{language === 'de' ? 'Fotosprint' : 'Photo sprint'}</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {language === 'de' ? 'Themen-Auswahl' : 'Theme selection'}
          </div>
          {isTopTeam && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {language === 'de'
                ? `Du bist Platz 1: streiche ${Math.max(0, banLimit - banCount)} Kategorien`
                : `You are top: ban ${Math.max(0, banLimit - banCount)} categories`}
            </div>
          )}
          {isLastTeam && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {language === 'de'
                ? 'Du bist letzter Platz: waehle 1 Kategorie'
                : 'You are last: pick 1 category'}
            </div>
          )}
          {!isTopTeam && !isLastTeam && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {language === 'de' ? 'Bitte warten, gleich geht es los.' : 'Please wait, starting soon.'}
            </div>
          )}
          <div style={{ display: 'grid', gap: 8 }}>
            {pool.map((theme) => {
              const isBanned = bannedIds.has(theme.id);
              const isPinned = pinnedId === theme.id;
              return (
                <div
                  key={`blitz-team-pick-${theme.id}`}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: isPinned ? 'rgba(96,165,250,0.15)' : 'rgba(15,23,42,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    opacity: isBanned ? 0.5 : 1
                  }}
                >
                  <span>{theme.title}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {isTopTeam && (
                      <button
                        style={{
                          ...primaryButton,
                          padding: '6px 10px',
                          fontSize: 12,
                          background: 'rgba(248,113,113,0.2)',
                          border: '1px solid rgba(248,113,113,0.4)',
                          color: '#fecaca',
                          opacity: isBanned || banCount >= banLimit || isPinned ? 0.4 : 1,
                          cursor: isBanned || banCount >= banLimit || isPinned ? 'not-allowed' : 'pointer'
                        }}
                        disabled={isBanned || banCount >= banLimit || isPinned}
                        onClick={() => submitBlitzBan(theme.id)}
                      >
                        {language === 'de' ? 'Bannen' : 'Ban'}
                      </button>
                    )}
                    {isLastTeam && (
                      <button
                        style={{
                          ...primaryButton,
                          padding: '6px 10px',
                          fontSize: 12,
                          background: 'rgba(34,197,94,0.2)',
                          border: '1px solid rgba(34,197,94,0.45)',
                          color: '#bbf7d0',
                          opacity: isPinned || isBanned ? 0.4 : 1,
                          cursor: isPinned || isBanned ? 'not-allowed' : 'pointer'
                        }}
                        disabled={isPinned || isBanned}
                        onClick={() => submitBlitzPick(theme.id)}
                      >
                        {language === 'de' ? 'Waehlen' : 'Pick'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    if (phase === 'ROUND_INTRO') {
      return (
          <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 10 }}>
          <div style={pillLabel}>{language === 'de' ? 'Fotosprint' : 'Photo sprint'}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{themeLabel}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {language === 'de' ? 'Runde startet jetzt' : 'Round is starting'}
          </div>
        </div>
      );
    }
    if (gameState === 'BLITZ_SCOREBOARD') {
      return (
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 10 }}>
          <div style={pillLabel}>{language === 'de' ? 'Zwischenstand' : 'Scoreboard'}</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {scoreboard.map((entry, idx) => (
              <div
                key={`blitz-final-${entry.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)'
                }}
              >
                <span style={{ fontWeight: 800 }}>{idx + 1}.</span>
                <span>{entry.name}</span>
                <span style={{ fontWeight: 800 }}>{entry.score ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (gameState === 'BLITZ_PAUSE') {
      return renderWaiting(language === 'de' ? 'Pause - gleich geht es weiter.' : 'Pause - back soon.', '');
    }
    return (
      <div style={{ ...glassCard, display: 'grid', gap: 10 }}>
        <div style={{ ...pillLabel, justifyContent: 'space-between', display: 'flex' }}>
          <span>{language === 'de' ? 'Blitz Battle' : 'Blitz battle'}</span>
          <span>
            Set {Math.max(1, (blitzState.setIndex ?? -1) + 1)}/3 - {language === 'de' ? 'Thema' : 'Theme'}: {themeLabel}
          </span>
        </div>
        {phase === 'PLAYING' ? (
          <>
            <div style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 600 }}>
              {language === 'de'
                ? `Item ${Math.min(activeBlitzItemIndex + 1, totalItems)}/${totalItems}`
                : `Item ${Math.min(activeBlitzItemIndex + 1, totalItems)}/${totalItems}`}
            </div>
            <div
              style={{
                padding: 14,
                borderRadius: 16,
                border: '1px solid rgba(96,165,250,0.35)',
                background: 'rgba(15,23,42,0.7)',
                display: 'grid',
                gap: 8
              }}
            >
              {currentItem?.mediaUrl && (
                <img
                  src={currentItem.mediaUrl}
                  alt={currentItem.prompt || `Blitz Item ${activeBlitzItemIndex + 1}`}
                  style={{ width: '100%', borderRadius: 14, maxHeight: 220, objectFit: 'cover' }}
                />
              )}
              <div style={{ fontSize: 18, fontWeight: 800 }}>{currentItem?.prompt || `Item ${activeBlitzItemIndex + 1}`}</div>
              {blitzItemCountdown !== null && (
                <div
                  style={{
                    ...pillLabel,
                    width: 'fit-content',
                    background: 'rgba(96,165,250,0.15)',
                    borderColor: 'rgba(96,165,250,0.4)',
                    color: '#bfdbfe'
                  }}
                >
                  {language === 'de' ? 'Item Restzeit' : 'Item time'}: {blitzItemCountdown}s
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Array.from({ length: totalItems }).map((_, idx) => {
                const status =
                  idx === activeBlitzItemIndex ? 'current' : idx < activeBlitzItemIndex ? 'done' : 'upcoming';
                const palette =
                  status === 'current'
                    ? { bg: 'rgba(96,165,250,0.2)', border: 'rgba(96,165,250,0.5)', color: '#dbeafe' }
                    : status === 'done'
                    ? { bg: 'rgba(34,197,94,0.18)', border: 'rgba(34,197,94,0.4)', color: '#bbf7d0' }
                    : { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)', color: '#cbd5e1' };
                return (
                  <span
                    key={`blitz-stage-chip-${idx}`}
                    style={{
                      ...pillLabel,
                      background: palette.bg,
                      borderColor: palette.border,
                      color: palette.color,
                      fontSize: 12
                    }}
                  >
                    {language === 'de' ? `Item ${idx + 1}` : `Item ${idx + 1}`}
                  </span>
                );
              })}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>
              {language === 'de'
                ? `Antworten: ${submissionCount}/${totalTeamsLabel}`
                : `Submissions: ${submissionCount}/${totalTeamsLabel}`}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {blitzAnswers.map((value, idx) => {
                const item = blitzItems[idx];
                const inputId = `blitz-input-${idx}`;
                const isActive = idx === activeBlitzItemIndex;
                return (
                  <div
                    key={inputId}
                    style={{
                      display: 'grid',
                      gap: 4,
                      padding: 6,
                      borderRadius: 12,
                      border: `1px solid ${isActive ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.12)'}`,
                      background: isActive ? 'rgba(96,165,250,0.08)' : 'rgba(15,23,42,0.65)'
                    }}
                  >
                    <label htmlFor={inputId} style={{ fontSize: 12, color: isActive ? '#dbeafe' : '#cbd5e1' }}>
                      {language === 'de' ? 'Item' : 'Item'} {idx + 1}
                      {item?.prompt ? ` - ${item.prompt}` : ''}
                    </label>
                    {item?.mediaUrl && (
                      <img
                        src={item.mediaUrl}
                        alt={item.prompt || `Blitz Item ${idx + 1}`}
                        style={{ width: '100%', borderRadius: 12, maxHeight: 140, objectFit: 'cover' }}
                      />
                    )}
                    <input
                      id={inputId}
                      ref={(el) => (blitzInputsRef.current[idx] = el)}
                      className={`team-answer-input${isActive ? ' is-active' : ''}`}
                      style={{
                        ...inputStyle,
                        border: isActive ? '1px solid rgba(96,165,250,0.8)' : inputStyle.border,
                        background: isActive ? 'rgba(15,78,134,0.45)' : inputStyle.background
                      }}
                      value={value}
                      disabled={!canAnswer}
                      placeholder={`${language === 'de' ? 'Antwort' : 'Answer'} ${idx + 1}`}
                      onChange={(e) =>
                        setBlitzAnswers((prev) => {
                          const next = [...prev];
                          next[idx] = e.target.value;
                          return next;
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
            <button
              style={{
                ...primaryButton,
                marginTop: 8,
                opacity: canAnswer ? 1 : 0.6,
                cursor: canAnswer ? 'pointer' : 'not-allowed'
              }}
              disabled={!canAnswer}
              onClick={submitBlitzAnswers}
            >
              {blitzSubmitted
                ? language === 'de'
                  ? 'Eingeloggt'
                  : 'Submitted'
                : language === 'de'
                ? 'Antworten senden'
                : 'Submit answers'}
            </button>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {blitzCountdown !== null && (
                <div style={{ ...pillLabel }}>
                  {language === 'de' ? 'Set Restzeit' : 'Set time'}: {blitzCountdown}s
                </div>
              )}
              {blitzItemCountdown !== null && (
                <div
                  style={{
                    ...pillLabel,
                    background: 'rgba(96,165,250,0.15)',
                    borderColor: 'rgba(96,165,250,0.4)',
                    color: '#bfdbfe'
                  }}
                >
                  {language === 'de' ? 'Aktuelles Item' : 'Current item'}: {blitzItemCountdown}s
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, color: '#cbd5e1' }}>
              {language === 'de'
                ? 'Set abgeschlossen. Warte auf das naechste.'
                : 'Set finished. Waiting for the next one.'}
            </div>
            {Object.keys(results).length > 0 && (
              <div style={{ display: 'grid', gap: 6 }}>
                {scoreboard.map((entry) => (
                  <div
                    key={`blitz-score-${entry.id}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.12)'
                    }}
                  >
                    <span>{entry.name}</span>
                    <span>{results[entry.id]?.correctCount ?? 0}/5</span>
                    <span style={{ fontWeight: 700 }}>+{results[entry.id]?.pointsAwarded ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  function renderBingo() {
    if (!bingoEnabled) return null;
    if (board.length !== 25) return null;
    const show = canMarkBingo || showBingoPanel;
    if (!show) return null;
    const activeCategory = question ? question.category : null;
    return (
      <div style={{ ...glassCard, marginTop: theme.spacing(2) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={pillLabel}>{language === 'de' ? 'Bingofeld' : 'Bingo board'}</div>
          <button
            style={{
              ...primaryButton,
              background: 'rgba(255,255,255,0.06)',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.14)',
              minHeight: 40,
              padding: '8px 12px',
              width: 'auto'
            }}
            onClick={() => setShowBingoPanel(false)}
          >
            {language === 'de' ? 'Bingofeld schliessen' : 'Close bingo board'}
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: 8,
            marginTop: 10
          }}
        >
          {board.map((cell, idx) => {
            const color = categoryColors[cell.category] ?? 'var(--surface)';
            const isActiveCategory = !activeCategory || cell.category === activeCategory;
            const isAllowed = canMarkBingo && !cell.marked && isActiveCategory;
            const icon = categoryIcons[cell.category];
            return (
              <button
                key={idx}
                onClick={() => handleMarkCell(idx)}
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: 12,
                  border: cell.marked ? '2px solid #fff' : '1px solid rgba(255,255,255,0.12)',
                  background: cell.marked ? '#0d0f14' : color,
                  color: cell.marked ? '#fff' : '#0d0f14',
                  fontWeight: 800,
                  boxShadow: cell.marked ? '0 14px 28px rgba(0,0,0,0.35)' : '0 10px 20px rgba(0,0,0,0.18)',
                  cursor: isAllowed ? 'pointer' : 'not-allowed',
                  opacity: isAllowed ? 1 : 0.45,
                  filter: isActiveCategory ? 'none' : 'grayscale(0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                disabled={!isAllowed}
              >
                {!cell.marked && icon && (
                  <img
                    src={icon}
                    alt=""
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '70%',
                      height: '70%',
                      transform: 'translate(-50%, -50%)',
                      opacity: 0.26,
                      objectFit: 'contain',
                      pointerEvents: 'none'
                    }}
                  />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>{cell.marked ? 'X' : ''}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  function renderBingoPrompt() {
    if (!bingoEnabled) return null;
    return (
      <div style={{ ...glassCard, alignItems: 'center', textAlign: 'center', padding: '20px 18px' }}>
        <div style={pillLabel}>{t('bingoTitle')}</div>
        <h3 style={{ ...heading, marginBottom: 6 }}>
          {language === 'de' ? 'Richtig! Setzt jetzt euer Feld.' : 'Correct! Place your bingo mark.'}
        </h3>
        <p style={{ ...mutedText, margin: 0 }}>
          {language === 'de'
            ? 'Waehlt ein freies Feld der aktuellen Kategorie.'
            : 'Pick a free cell of the current category.'}
        </p>
      </div>
    );
  }

  function renderNotJoined() {
    const joinDisabled = !roomCode;
    return (
      <div style={glassCard}>
        <Pill tone="muted" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Join
      </Pill>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>{language === 'en' ? 'Language' : 'Sprache'}</span>
        {([
          { key: 'de', label: 'DE', flag: '\u{1F1E9}\u{1F1EA}' },
          { key: 'en', label: 'EN', flag: '\u{1F1EC}\u{1F1E7}' },
          { key: 'both', label: 'DE+EN', flag: '\u{1F1E9}\u{1F1EA}+\u{1F1EC}\u{1F1E7}' }
        ] as { key: Language; label: string; flag: string }[]).map((opt) => (
          <button
            key={opt.key}
            style={{
              padding: '6px 10px',
              borderRadius: 10,
              border: language === opt.key ? `2px solid ${accentColor}` : '1px solid rgba(255,255,255,0.04)',
              background: language === opt.key ? `${accentColor}ee` : 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(20px)',
              color: language === opt.key ? '#0d0f14' : '#94a3b8',
              fontWeight: language === opt.key ? 900 : 600,
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: language === opt.key ? `0 8px 16px ${accentColor}44, inset 0 1px 1px rgba(255,255,255,0.2)` : 'inset 0 1px 1px rgba(255,255,255,0.02)',
              transform: language === opt.key ? 'scale(1.05)' : 'scale(1)'
            }}
            onClick={() => updateLanguage(opt.key)}
            type="button"
            className="lang-button"
          >
            <span style={{ marginRight: 6 }}>{opt.flag}</span>
            {opt.label}
          </button>
        ))}
      </div>
      <h3 style={{ ...heading, marginBottom: 8 }}>{t('joinWelcome')}</h3>
      <p style={mutedText}>{t('joinHint')}</p>
      <input
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        placeholder={t('joinPlaceholder')}
        className="team-answer-input team-join-input"
        style={{ ...inputStyle, transition: 'all 0.3s ease' }}
      />
      <PrimaryButton
        style={{
          marginTop: 12,
          opacity: joinDisabled ? 0.6 : 1,
          cursor: joinDisabled ? 'not-allowed' : 'pointer'
        }}
        onClick={!joinDisabled ? () => handleJoin(false) : undefined}
        disabled={joinDisabled}
      >
        {t('joinButton')}
      </PrimaryButton>
      {!roomCode && (
        <p style={{ color: '#f97316', marginTop: 8, fontWeight: 700 }}>
          {language === 'de' ? 'Roomcode fehlt.' : 'Room code missing.'}
        </p>
      )}
      {savedIdRef.current && (
        <button
          style={{
            ...primaryButton,
            marginTop: 8,
            background: 'rgba(255,255,255,0.02)',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(30px)',
            minHeight: 44
          }}
          onClick={() => handleJoin(true)}
        >
          {language === 'de'
            ? `Team fortsetzen${teamName ? ` (${teamName})` : ''}`
            : `Resume team${teamName ? ` (${teamName})` : ''}`}
        </button>
      )}
        {message && <p style={{ color: 'var(--accent-strong)', marginTop: 10 }}>{message}</p>}
      </div>
    );
  }

  function renderWaiting(title: string, subtitle?: string) {
    return (
      <div
        className="waiting-card"
        style={{
          ...glassCard,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: 620,
          minHeight: 280,
          background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.06))',
          borderColor: 'rgba(99, 102, 241, 0.2)',
          animation: 'liquid-shimmer 6s ease-in-out infinite'
        }}
      >
        <div style={pillLabel}>{phase === 'waitingForQuestion' ? 'WARTEN' : 'INFO'}</div>
        <h3 style={{ ...heading, marginBottom: 8, marginTop: 16, fontSize: 'clamp(24px, 5vw, 36px)' }}>{title}</h3>
        {subtitle && <p style={{ ...mutedText, marginBottom: 20 }}>{subtitle}</p>}
        {!teamId && <p style={mutedText}>{t('joinTitle')}</p>}
        <PulseIndicator style={{ fontSize: 48, color: '#a5b4fc', margin: '28px 0 0' }} />
      </div>
    );
  }

  function renderLoadingCard() {
    return (
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <SkeletonCard />
      </div>
    );
  }

  function renderErrorCard() {
    return (
      <div style={{ ...glassCard, borderColor: 'rgba(248,113,113,0.3)' }}>
        <div style={pillLabel}>{language === 'de' ? 'Fehler' : 'Error'}</div>
        <h3 style={{ ...heading, marginBottom: 6 }}>
          {language === 'de' ? 'Verbindung fehlgeschlagen' : 'Connection failed'}
        </h3>
        <p style={mutedText}>{socketError || 'Unknown error'}</p>
        <button
          style={{
            ...primaryButton,
            background: 'rgba(255,255,255,0.02)',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(30px)',
            minHeight: 44
          }}
          onClick={() => window.location.reload()}
        >
          {language === 'de' ? 'Neu laden' : 'Reload'}
        </button>
      </div>
    );
  }

  function renderByPhase() {
    if (gameState === 'SCOREBOARD_PRE_BLITZ') {
      return (
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 10 }}>
          <div style={pillLabel}>{language === 'de' ? 'Zwischenstand' : 'Scoreboard'}</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {scoreboard.map((entry, idx) => (
              <div
                key={`scoreboard-pre-${entry.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)'
                }}
              >
                <span style={{ fontWeight: 800 }}>{idx + 1}.</span>
                <span>{entry.name}</span>
                <span style={{ fontWeight: 800 }}>{entry.score ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (gameState.startsWith('RUNDLAUF') || gameState === 'SIEGEREHRUNG') {
      return renderRundlaufStage();
    }
    if (gameState === 'BLITZ' || gameState.startsWith('BLITZ_')) {
      return renderBlitzStage();
    }
    if (gameState === 'POTATO') {
      return showPotatoUI ? renderPotatoStage() : renderWaiting(t('waitingMsg'));
    }
    if (bingoEnabled && (showBingoPanel || canMarkBingo)) {
      return renderBingo();
    }
    if (bingoEnabled && canMarkBingo && isFinal) {
      return renderBingoPrompt();
    }
    switch (phase) {
      case 'notJoined':
        return renderNotJoined();
      case 'intro':
        return renderWaiting(
          language === 'de'
            ? 'Neue Frage kommt'
            : language === 'both'
            ? 'Neue Frage / New question'
            : 'New question',
          language === 'de'
            ? 'Bereit machen ...'
            : language === 'both'
            ? 'Bereit machen / Get ready ...'
            : 'Get ready ...'
        );
      case 'waitingForQuestion':
        return evaluating
          ? renderWaiting(t('evaluating'), null)
          : renderWaiting(
              waitForQuestionHeadline,
              teamId ? null : t('waitingJoin'),
              Boolean(teamId)
            );
      case 'answering':
        return renderAnswering();
      case 'waitingForResult':
        return evaluating ? renderWaiting(t('evaluating')) : renderWaitingForResult();
      case 'showResult':
        return renderShowResult();
      default:
        return evaluating
            ? renderWaiting(t('evaluating'), null)
            : renderWaiting(waitForQuestionHeadline);
    }
  };
  function toggleReady() {
    if (!teamId || !socketRef.current) return;
    const next = !isReady;
    setIsReady(next);
    socketRef.current.emit('teamReady', { roomCode, teamId, isReady: next });
  }

  const remainingSeconds = timerEndsAt ? Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000)) : 0;
  const progress =
    timerEndsAt && timerDuration > 0
      ? Math.max(0, Math.min(100, (remainingSeconds / timerDuration) * 100))
      : 0;
  const timeUp = timerEndsAt !== null && remainingSeconds <= 0;
  const questionAnsweringActive = gameState === 'Q_ACTIVE' && phase === 'answering';
  const canAnswer = questionAnsweringActive && !timeUp && !answerSubmitted;
  const waitForQuestionHeadline = gameState === 'LOBBY' ? t('waitingStart') : t('waitingMsg');
  const isLocked = gameState === 'Q_LOCKED';
  const timerContextActive = gameState === 'Q_ACTIVE' || isBlitzPlaying || isPotatoActiveTurn || isRundlaufActiveTurn;
  const hasTimer = Boolean(timerEndsAt && timerDuration > 0 && timerContextActive);
  const showTimerProgress = hasTimer && !isLocked;
  const viewState = socketError
    ? 'error'
    : !teamId
    ? 'join'
    : 'active';

  const accentCategory = (question?.category as keyof typeof categoryColors) ?? 'GemischteTuete';
  const accentColor = categoryColors[accentCategory] ?? '#d6a2ff';
  const accentPink = '#ff4f9e';
  const accentIcon = categoryIcons[accentCategory];
  const labelLang = language === 'both' ? 'de' : language;
  const accentLabel =
    categoryLabels[accentCategory]?.[labelLang] ?? categoryLabels[accentCategory]?.de ?? accentCategory;
  const layout =
    (question as any)?.layout || { imageOffsetX: 0, imageOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0 };

  const phaseLabel =
    phase === 'answering'
      ? 'Antworten'
      : phase === 'waitingForResult'
      ? 'Auswertung'
      : phase === 'showResult'
      ? 'Ergebnis'
      : 'Warten';

  const mainContent =
    viewState === 'error'
      ? renderErrorCard()
      : viewState === 'loading'
      ? renderLoadingCard()
      : viewState === 'join'
      ? renderNotJoined()
      : renderByPhase();

  return (
    <div
      id="team-root"
      style={pageStyleTeam}
      data-timer={timerTick}
      data-team-ui="1"
      data-team-marker={teamMarker}
    >
      <span style={{ display: 'none' }}>{teamMarker}</span>
      <span style={{ display: 'none' }}>
        TEAMVIEW LIVE | phase={phase} | state={gameState} | room={roomCode} | team={teamId ?? '--'}
      </span>
      <OfflineBar disconnected={connectionStatus === 'disconnected'} language={language} onReconnect={handleReconnect} />
      <div style={contentShell}>
        <header style={headerBarTeam}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              to="/menu"
              style={{ textDecoration: 'none', color: 'inherit' }}
              title={language === 'de' ? 'Menue oeffnen' : 'Open menu'}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.16)'
                }}
              >
                <img src="/logo.png?v=3" alt="Cozy Kiosk Quiz" style={{ width: 26, height: 26, borderRadius: 8, objectFit: 'contain' }} />
                <span style={{ fontWeight: 800 }}>Cozy Kiosk Quiz</span>
              </div>
            </Link>
            {teamId && (
              <Pill
                tone="neutral"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderColor: accentPink,
                  color: '#f8fafc'
                }}
              >
                {teamName || 'Team'}
              </Pill>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background:
                    connectionStatus === 'connected'
                      ? '#4ade80'
                      : connectionStatus === 'connecting'
                      ? '#facc15'
                      : '#f87171'
                }}
              />
            </div>
            {isLocked ? (
              <Pill
                tone="muted"
                style={{ background: 'rgba(250,204,21,0.2)', borderColor: 'rgba(250,204,21,0.5)', color: '#fcd34d' }}
              >
                {language === 'de' ? 'Gesperrt' : 'Locked'}
              </Pill>
            ) : null}
            {/* Timer Pill removed - using progress bar below instead */}
            {bingoEnabled && board.length === 25 && !showBingoPanel && (
              <button
                style={{
                  ...primaryButton,
                  background: 'rgba(255,255,255,0.08)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255,255,255,0.16)',
                  minHeight: 40,
                  padding: '8px 12px',
                  width: 'auto'
                }}
                onClick={() => setShowBingoPanel(true)}
              >
                {language === 'de' ? 'Bingofeld oeffnen' : 'Open bingo board'}
              </button>
            )}
          </div>
        </header>

        {showTimerProgress && (
          <div style={{ marginTop: 12 }}>
            <div style={progressOuter(accentColor)}>
              <div style={{ ...progressInner(accentColor), width: `${progress}%` }} />
            </div>
            <div style={{ marginTop: 6, color: '#cbd5e1', fontWeight: 700 }}>
              {t('timeLeft')(Math.max(0, Math.round(remainingSeconds)))}
            </div>
          </div>
        )}

        {mainContent}

        {teamId && phase === 'waitingForQuestion' && allowReadyToggle && gameState === 'LOBBY' && (
          <PrimaryButton
            style={{
              marginTop: 12,
              background: isReady 
                ? `linear-gradient(135deg, ${accentPink}cc, ${accentPink}aa)`
                : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              color: isReady ? '#0d0f14' : '#94a3b8',
              border: `1px solid ${isReady ? accentPink : 'rgba(255,255,255,0.04)'}`,
              backdropFilter: isReady ? 'blur(20px)' : 'blur(30px)',
              boxShadow: isReady 
                ? `0 12px 32px ${accentPink}66, inset 0 1px 1px rgba(255,255,255,0.3)` 
                : 'inset 0 1px 1px rgba(255,255,255,0.03)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              opacity: connectionStatus === 'connected' ? 1 : 0.5,
              cursor: connectionStatus === 'connected' ? 'pointer' : 'not-allowed',
              fontWeight: isReady ? 900 : 700,
              transform: isReady ? 'scale(1.02)' : 'scale(1)'
            }}
            onClick={connectionStatus === 'connected' ? toggleReady : undefined}
            disabled={connectionStatus !== 'connected'}
          >
            {isReady
              ? t('readyOn')
              : language === 'en'
              ? 'We are ready'
              : language === 'both'
              ? 'Wir sind bereit / We are ready'
              : 'Wir sind bereit'}
          </PrimaryButton>
        )}
        {teamId && phase === 'waitingForQuestion' && allowReadyToggle && gameState === 'LOBBY' && connectionStatus !== 'connected' && (
          <p style={{ marginTop: 6, color: '#f97316', fontWeight: 700 }}>
            {language === 'both'
              ? `Keine Verbindung (${SOCKET_URL}). Bitte neu verbinden. / Not connected (${SOCKET_URL}). Please reconnect.`
              : language === 'de'
              ? `Keine Verbindung (${SOCKET_URL}). Bitte neu verbinden.`
              : `Not connected (${SOCKET_URL}). Please reconnect.`}
          </p>
        )}
      </div>
      {bingoEnabled && board.length === 25 && !showBingoPanel && (
        <button
          onClick={() => setShowBingoPanel((v) => (canMarkBingo ? true : !v))}
          style={{
            position: 'fixed',
            bottom: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 18px',
            borderRadius: 14,
            border: `1px solid ${accentColor}66`,
            background: canMarkBingo ? `${accentColor}cc` : 'rgba(0,0,0,0.6)',
            color: canMarkBingo ? '#0d0f14' : '#e2e8f0',
            fontWeight: 800,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            boxShadow: canMarkBingo ? `0 14px 28px ${accentColor}55` : '0 12px 24px rgba(0,0,0,0.4)',
            zIndex: 35
          }}
        >
          {canMarkBingo
            ? language === 'de'
              ? 'Bingofeld oeffnen'
              : 'Open bingo board'
            : 'Bingofeld'}
        </button>
      )}
      <div style={footerLogo}>
        <img src="/logo.png?v=3" alt="Cozy Wolf" style={{ width: 120, opacity: 0.85, objectFit: 'contain' }} />
      </div>
    </div>
  );
}

export default TeamView;
























