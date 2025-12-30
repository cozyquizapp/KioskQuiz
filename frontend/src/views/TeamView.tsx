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
  BunteTuetePayload
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
import { featureFlags } from '../config/features';

type Phase = 'notJoined' | 'waitingForQuestion' | 'answering' | 'waitingForResult' | 'showResult';

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
  const [toast, setToast] = useState<string | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [resultPoints, setResultPoints] = useState<number | null>(null);
  const [resultDetail, setResultDetail] = useState<string | null>(null);
  const [gameState, setGameState] = useState<CozyGameState>('LOBBY');
  const [scoreboard, setScoreboard] = useState<StateUpdatePayload['scores']>([]);
  const [potatoState, setPotatoState] = useState<PotatoState | null>(null);
  const [blitzState, setBlitzState] = useState<BlitzState | null>(null);
  const [blitzAnswers, setBlitzAnswers] = useState<string[]>(['', '', '', '', '']);
  const [blitzSubmitted, setBlitzSubmitted] = useState(false);
  const [potatoTick, setPotatoTick] = useState(0);
  const [potatoInput, setPotatoInput] = useState('');
  const [potatoSubmitting, setPotatoSubmitting] = useState(false);
  const [potatoError, setPotatoError] = useState<string | null>(null);
  const [showPotatoOkToast, setShowPotatoOkToast] = useState(false);
  const savedIdRef = useRef<string | null>(null);

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
    if (gameState === 'Q_ACTIVE') {
      setPhase('answering');
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
  const isBlitzPlaying = gameState === 'BLITZ' && blitzState?.phase === 'PLAYING';
  const isPotatoActiveTurn =
    gameState === 'POTATO' &&
    potatoState?.phase === 'PLAYING' &&
    potatoState?.activeTeamId === teamId;

  useEffect(() => {
    if (!teamId) return;
    setBlitzSubmitted(Boolean(blitzState?.submissions?.includes(teamId)));
    if (blitzState?.phase !== 'PLAYING') {
      setBlitzAnswers(['', '', '', '', '']);
    }
  }, [teamId, blitzState]);

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
      setToast(null);
    });
    socket.on('disconnect', () => setConnectionStatus('disconnected'));
    socket.io?.on?.('reconnect_attempt', () => setConnectionStatus('connecting'));

    socket.on('syncState', (payload: SyncStatePayload) => {
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
      setGameState(payload.state);
      if (payload.scores) {
        setScoreboard(payload.scores);
      }
      if (payload.potato !== undefined) {
        setPotatoState(payload.potato ?? null);
      }
      if (payload.blitz !== undefined) {
        setBlitzState(payload.blitz ?? null);
      }
      if (payload.currentQuestion !== undefined) {
        if (payload.currentQuestion) {
          setQuestion(payload.currentQuestion);
          setPhase('answering');
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
          if (typeof entry.awardedPoints === 'number') setResultPoints(entry.awardedPoints);
          else setResultPoints(null);
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
        // Zeige Ergebnis direkt nach der Bewertung; finale Korrektur kommt ggf. über teamResult.
        setPhase('showResult');
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
        background: 'rgba(12,15,22,0.9)',
        color: '#e2e8f0',
        borderColor: timeUp ? 'rgba(239,68,68,0.9)' : `${accentColor}66`,
        boxShadow: timeUp
          ? '0 0 0 3px rgba(239,68,68,0.35), 0 24px 40px rgba(0,0,0,0.45)'
          : `0 22px 40px ${accentColor}33`,
        animation: timeUp ? 'timeup-pulse 0.35s ease-in-out 2' : undefined
      }}
    >
      <div style={questionHeader}>
        <div
          style={{
            ...categoryChip,
            background: 'rgba(0,0,0,0.45)',
            border: `1px solid ${accentColor}66`,
            color: '#e2e8f0'
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
          {hasTimer && (
            <div
              style={{
                ...timerPill,
                background: 'rgba(0,0,0,0.35)',
                border: `1px solid ${accentColor}66`,
                color: '#e2e8f0'
              }}
            >
              {t('timeLeft')(Math.round(remainingSeconds))}
            </div>
          )}
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
        <p style={{ color: '#ef4444', fontWeight: 700, marginTop: 8 }}>
          Leider ist die Zeit schon vorbei.
        </p>
      )}
      <button
        style={{
          ...primaryButton,
          marginTop: 14,
          background: `linear-gradient(90deg, ${accentColor} ${Math.max(0, Math.min(100, progress))}%, rgba(255,255,255,0.08) ${Math.max(0, Math.min(100, progress))}%)`,
          color: '#0d0f14',
          boxShadow: `0 16px 30px ${accentColor}55`,
          border: `1px solid ${accentColor}66`,
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
    return renderWaiting(
      t('waiting'),
      language === 'de' ? 'Wir pruefen alle Antworten ...' : t('evaluating')
    );
  }

  function buildBunteSubmission(payload: BunteTuetePayload | undefined) {
    if (!question || !payload) return null;
    if (payload.kind === 'top5') {
      const values = bunteTop5Order;
      if (values.length !== payload.items.length || values.some((val) => !val)) {
        setMessage(language === 'de' ? 'Bitte alle Positionen wählen.' : 'Please fill all positions.');
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
        setMessage(language === 'de' ? 'Bitte eine Option wählen.' : 'Please choose an option.');
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
                <option value="">{language === 'de' ? 'Wählen...' : 'Select...'}</option>
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
                <option value="">{language === 'de' ? 'Wählen...' : 'Select...'}</option>
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
      <div style={{ ...glassCard, alignItems: 'center', textAlign: 'center', padding: '24px 20px' }}>
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
      <p style={{ margin: 0, color: resultCorrect ? '#22c55e' : '#ef4444', fontSize: 24, fontWeight: 900 }}>
        {t('resultTitle')(resultCorrect)}
      </p>
      {resultMessage && <p style={{ margin: 0, color: 'var(--muted)' }}>{resultMessage}</p>}
      {resultPoints !== null && (
        <p style={{ margin: '6px 0 0', color: '#fde68a', fontWeight: 700 }}>
          {language === 'de' ? 'Punkte' : 'Points'}: {resultPoints}
          {resultDetail ? ` · ${resultDetail}` : ''}
        </p>
      )}
      {solution && (
        <p style={{ margin: '8px 0 0', color: '#e2e8f0', fontWeight: 700 }}>
          {language === 'de' ? 'Loesung:' : 'Solution:'} {solution}
        </p>
      )}
    </div>
    );
  }
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
          relevantConflict?.conflictingAnswer || inlineCopy('eine frühere Antwort', 'an earlier answer');
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
      return inlineCopy('Wird geprüft ...', 'Checking attempt ...');
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
              <span style={{ fontWeight: 800 }}>{entry.score ?? 0}</span>
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
                ? 'Teams bannen Themen vor dem Finale. Beobachtet, welche Themen übrig bleiben.'
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
                    {inlineCopy('✅ Gültig!', '✅ Accepted!')}
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
                ? 'Host startet gleich die nächste Runde / Host prepares next round.'
                : 'Host bereitet die nächste Runde vor.'}
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

  function renderBlitzStage() {
    if (!blitzState) {
      return (
        <div style={{ ...glassCard, textAlign: 'center' }}>
          <div style={pillLabel}>{language === 'de' ? 'Blitz Battle' : 'Blitz battle'}</div>
          <p style={mutedText}>{language === 'de' ? 'Host bereitet gerade den Blitz vor.' : 'Host is preparing the blitz round.'}</p>
        </div>
      );
    }
    const canAnswer = blitzState.phase === 'PLAYING' && !blitzSubmitted;
    const results = blitzState.results || {};
    const themeLabel = blitzState.theme?.title || '?';
    const submissionCount = blitzState.submissions?.length ?? 0;
    const currentItem = blitzItems[activeBlitzItemIndex];
    const totalItems = blitzItems.length || blitzAnswers.length || 5;
    return (
      <div style={{ ...glassCard, display: 'grid', gap: 10 }}>
        <div style={{ ...pillLabel, justifyContent: 'space-between', display: 'flex' }}>
          <span>{language === 'de' ? 'Blitz Battle' : 'Blitz battle'}</span>
          <span>
            Set {Math.max(1, (blitzState.setIndex ?? -1) + 1)}/3 • {language === 'de' ? 'Thema' : 'Theme'}: {themeLabel}
          </span>
        </div>
        {blitzState.phase === 'PLAYING' ? (
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
                ? `Antworten: ${submissionCount}/${teams.length}`
                : `Submissions: ${submissionCount}/${teams.length}`}
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
                      {item?.prompt ? ` · ${item.prompt}` : ''}
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
                ? 'Set abgeschlossen. Warte auf das nächste.'
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
            {language === 'de' ? 'Bingofeld schließen' : 'Close bingo board'}
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
            ? 'Wählt ein freies Feld der aktuellen Kategorie.'
            : 'Pick a free cell of the current category.'}
        </p>
      </div>
    );
  }

  function renderNotJoined() {
    return (
      <div style={{ ...glassCard, borderColor: 'rgba(255,255,255,0.14)' }}>
        <Pill tone="muted" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Join
      </Pill>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>{language === 'en' ? 'Language' : 'Sprache'}</span>
        {([
          { key: 'de', label: 'DE', flag: '🇩🇪' },
          { key: 'en', label: 'EN', flag: '🇬🇧' },
          { key: 'both', label: 'DE+EN', flag: '🇩🇪+🇬🇧' }
        ] as { key: Language; label: string; flag: string }[]).map((opt) => (
          <button
            key={opt.key}
            style={{
              padding: '6px 10px',
              borderRadius: 10,
              border: language === opt.key ? '1px solid rgba(255,255,255,0.45)' : '1px solid rgba(255,255,255,0.14)',
              background: language === opt.key ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
              color: '#e2e8f0',
              fontWeight: 800,
              cursor: 'pointer'
            }}
            onClick={() => updateLanguage(opt.key)}
            type="button"
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
        style={inputStyle}
      />
      <PrimaryButton style={{ marginTop: 12 }} onClick={() => handleJoin(false)}>
        {t('joinButton')}
      </PrimaryButton>
      {savedIdRef.current && (
        <button
          style={{
            ...primaryButton,
            marginTop: 8,
            background: 'rgba(255,255,255,0.1)',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.2)',
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
      style={{
        ...glassCard,
        textAlign: 'center',
        alignItems: 'center',
        maxWidth: 620,
        background: 'rgba(16,20,31,0.8)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
      }}
    >
      <div style={pillLabel}>{phase === 'waitingForQuestion' ? 'Warten' : 'Info'}</div>
      <h3 style={{ ...heading, marginBottom: 4 }}>{title}</h3>
        {subtitle && <p style={mutedText}>{subtitle}</p>}
        {!teamId && <p style={mutedText}>{t('joinTitle')}</p>}
        <div style={hourglassStyle}>{'\u23F3'}</div>
        {hasTimer && (
        <>
          <div style={softDivider} />
          <div style={progressOuter(accentColor)}>
            <div style={{ ...progressInner(accentColor), width: `${progress}%` }} />
          </div>
          <div style={{ marginTop: 6, color: 'var(--muted)', fontWeight: 700 }}>
            {t('timeLeft')(Math.round(remainingSeconds))}
          </div>
        </>
      )}
      </div>
    );
  }

  function renderByPhase() {
    if (gameState === 'BLITZ') {
      return renderBlitzStage();
    }
    if (gameState === 'POTATO') {
      return renderPotatoStage();
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
      case 'waitingForQuestion':
        return evaluating
          ? renderWaiting(t('evaluating'), null)
          : renderWaiting(
              t('waitingSoon') ?? COPY.en.waitingSoon,
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
            : renderWaiting(t('waitingMsg'));
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
  const canAnswer = questionAnsweringActive && !timeUp;
  const isLocked = gameState === 'Q_LOCKED';
  const timerContextActive = questionAnsweringActive || isBlitzPlaying || isPotatoActiveTurn;
  const hasTimer = Boolean(timerEndsAt && timerDuration > 0 && timerContextActive);
  const showTimerProgress = hasTimer && !isLocked;

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

  return (
    <div style={pageStyleTeam} data-timer={timerTick}>
      <OfflineBar disconnected={connectionStatus === 'disconnected'} language={language} onReconnect={handleReconnect} />
      <div style={contentShell}>
        <header style={headerBarTeam}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              to="/menu"
              style={{ textDecoration: 'none', color: 'inherit' }}
              title={language === 'de' ? 'Menü öffnen' : 'Open menu'}
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
                <img src="/logo.png" alt="Cozy Kiosk Quiz" style={{ width: 26, height: 26, borderRadius: 8, objectFit: 'contain' }} />
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
            ) : hasTimer ? (
              <Pill tone="muted" style={{ background: 'rgba(0,0,0,0.4)', borderColor: accentColor, color: '#e2e8f0' }}>
                {timeUp ? t('timerDoneLabel') : t('timerActiveLabel')}
              </Pill>
            ) : null}
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
                {language === 'de' ? 'Bingofeld öffnen' : 'Open bingo board'}
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

        {renderByPhase()}

        {featureFlags.showLegacyPanels && teamId && phase === 'waitingForQuestion' && allowReadyToggle && (
          <PrimaryButton
            style={{
              marginTop: 12,
              background: isReady ? accentPink : `${accentPink}22`,
              color: isReady ? '#0d0f14' : '#e2e8f0',
              border: `1px solid ${accentPink}66`,
              boxShadow: isReady ? `0 12px 26px ${accentPink}55` : `0 14px 26px ${accentPink}33`,
              opacity: connectionStatus === 'connected' ? 1 : 0.6,
              cursor: connectionStatus === 'connected' ? 'pointer' : 'not-allowed'
            }}
            onClick={connectionStatus === 'connected' ? toggleReady : undefined}
            disabled={connectionStatus !== 'connected'}
          >
            {isReady
              ? t('readyOn')
              : language === 'en'
              ? 'Our team is ready'
              : language === 'both'
              ? 'Unser Team ist bereit / Our team is ready'
              : 'Unser Team ist bereit'}
          </PrimaryButton>
        )}
        {featureFlags.showLegacyPanels && teamId && phase === 'waitingForQuestion' && allowReadyToggle && connectionStatus !== 'connected' && (
          <p style={{ marginTop: 6, color: '#f97316', fontWeight: 700 }}>
            {language === 'both'
              ? `Keine Verbindung zum Server (${SOCKET_URL}). Bitte neu verbinden. / Not connected to server (${SOCKET_URL}). Please reconnect.`
              : language === 'de'
              ? `Keine Verbindung zum Server (${SOCKET_URL}). Bitte neu verbinden.`
              : `Not connected to server (${SOCKET_URL}). Please reconnect.`}
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
              ? 'Bingofeld öffnen'
              : 'Open bingo board'
            : 'Bingofeld'}
        </button>
      )}
      <div style={footerLogo}>
        <img src="/logo.png" alt="Cozy Wolf" style={{ width: 120, opacity: 0.85, objectFit: 'contain' }} />
      </div>
    </div>
  );
}

export default TeamView;
























