import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AnyQuestion,
  MultipleChoiceQuestion,
  SortItemsQuestion,
  Language,
  StateUpdatePayload,
  CozyGameState,
  Team,
  BlitzState,
  BunteTuetePayload,
  RundlaufState
} from '@shared/quizTypes';
import {
  fetchCurrentQuestion,
  joinRoom,
  submitAnswer,
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
        top: 'calc(8px + env(safe-area-inset-top))',
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
    evaluating: 'Wir prüfen alle Antworten ...',
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
    kicked: 'Du wurdest vom Admin entfernt. Bitte neu beitreten.',
    estimateBest: 'Ihr wart am nächsten dran!',
    estimateWorse: 'Leider weiter weg als das beste Team.',
    betHint: (pool: number) => `Verteile genau ${pool} Punkte auf A/B/C.`,
    betRemaining: (remaining: number) =>
      remaining === 0 ? 'Alle Punkte verteilt.' : `${remaining} Punkt(e) übrig.`,
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
    kicked: 'You were removed by the admin. Please rejoin.'
  }
} as const;

// Feedback only makes sense for questions with numeric proximity (estimate / precision variants)
const isClosenessQuestion = (q: AnyQuestion | null) => {
  if (!q) return false;
  if (q.mechanic === 'estimate') return true;
  const bunte = (q as any)?.bunteTuete;
  if (bunte && bunte.kind === 'precision') return true;
  const mixedType = (q as any)?.mixedMechanic;
  if (mixedType === 'praezise-antwort') return true;
  return false;
};

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
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [phase, setPhase] = useState<Phase>('notJoined');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultCorrect, setResultCorrect] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [timerDuration, setTimerDuration] = useState<number>(30);
  const [transitioning, setTransitioning] = useState(false);
  const [timerTick, setTimerTick] = useState(0);
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('teamLanguage');
    const lang = saved === 'de' || saved === 'en' || saved === 'both' ? (saved as Language) : 'de';
    // Team-View soll nur einsprachig sein, nicht 'both'
    return lang === 'both' ? 'de' : lang;
  });

  // Helper-Funktionen für Message
  const showError = (text: string) => setMessage({ text, type: 'error' });
  const showSuccess = (text: string) => setMessage({ text, type: 'success' });
  const clearMessage = () => setMessage(null);
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
  const [teamStatus, setTeamStatus] = useState<StateUpdatePayload['teamStatus']>([]);
  const [blitzState, setBlitzState] = useState<BlitzState | null>(null);
  const [rundlaufState, setRundlaufState] = useState<RundlaufState | null>(null);
  const [blitzAnswers, setBlitzAnswers] = useState<string[]>(['', '', '', '', '']);
  const [blitzSubmitted, setBlitzSubmitted] = useState(false);
  const [blitzSelectionBusy, setBlitzSelectionBusy] = useState(false);
  const [rundlaufInput, setRundlaufInput] = useState('');
  const [rundlaufSubmitting, setRundlaufSubmitting] = useState(false);
  const [rundlaufError, setRundlaufError] = useState<string | null>(null);
  const savedIdRef = useRef<string | null>(null);
  const answerSubmittedRef = useRef(false);
  const lastQuestionIdRef = useRef<string | null>(null);

  const socketRef = useRef<ReturnType<typeof connectToRoom> | null>(null);
  const intervalRef = useRef<number | null>(null);
  const recoveringRef = useRef(false);
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
    if (!question || question.type !== 'BUNTE_TUETE' || !question.bunteTuete) {
      setBunteTop5Order([]);
      setBunteOrderSelection([]);
      return;
    }
    const payload = question.bunteTuete as BunteTuetePayload;
    if (payload.kind === 'top5') {
      setBunteTop5Order(Array(5).fill(''));
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
      // Cleanup effects
    },
    []
  );

  const t = <K extends keyof (typeof COPY)['de']>(key: K) => {
    const deVal = COPY.de[key];
    const enVal = COPY.en[key];
    if (language === 'both') {
      if (typeof deVal === 'function' && typeof enVal === 'function') {
        return ((...args: any[]) => `${deVal(...args)} / ${enVal(...args)}`) as any;
      }
      if (typeof deVal === 'string' && typeof enVal === 'string') {
        return `${deVal} / ${enVal}` as any;
      }
    }
    const langKey = language as keyof typeof COPY;
    return COPY[langKey]?.[key] ?? COPY.de[key];
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
  const isRundlaufActiveTurn = gameState === 'RUNDLAUF_PLAY' && rundlaufState?.activeTeamId === teamId;

  useEffect(() => {
    if (!teamId) return;
    setBlitzSubmitted(Boolean(blitzState?.submissions?.includes(teamId)));
    if (!isBlitzPlaying) {
      setBlitzAnswers(['', '', '', '', '']);
    }
  }, [teamId, blitzState, isBlitzPlaying]);

  useEffect(() => {
    if (blitzState?.phase !== 'BANNING') {
      setBlitzSelectionBusy(false);
      return;
    }
    if (blitzState?.pinnedTheme) {
      setBlitzSelectionBusy(false);
      return;
    }
  }, [blitzState?.phase, blitzState?.pinnedTheme?.id, blitzState?.bans]);

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
    // Team-View soll nur einsprachig sein, nicht 'both'
    const singleLang = lang === 'both' ? 'de' : lang;
    setLanguageState(singleLang);
    localStorage.setItem('teamLanguage', singleLang);
    setLanguageApi(roomCode, singleLang).catch(() => undefined);
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
        return;
      }
      if (payload.language) {
        // Team-View soll nur einsprachig sein, nicht 'both'
        const singleLang = payload.language === 'both' ? 'de' : payload.language;
        setLanguageState(singleLang);
        localStorage.setItem('teamLanguage', singleLang);
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
      } else {
        resetInputs();
        setQuestion(null);
        setQuestionMeta(null);
        setPhase(teamId ? 'waitingForQuestion' : 'notJoined');
        setAllowReadyToggle(true);
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
      if (payload.teamStatus) {
        setTeamStatus(payload.teamStatus);
      }
      if (payload.blitz !== undefined) {
        setBlitzState(payload.blitz ?? null);
      }
      if (payload.rundlauf !== undefined) {
        setRundlaufState(payload.rundlauf ?? null);
      }
      // Only update question if explicitly provided and not null
      if (payload.currentQuestion !== undefined && payload.currentQuestion !== null) {
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
          {
            const dev = (entry as any)?.deviation;
            const bestDev = (entry as any)?.bestDeviation;
            if (
              isClosenessQuestion(question) &&
              typeof dev === 'number' &&
              typeof bestDev === 'number' &&
              Number.isFinite(dev) &&
              Number.isFinite(bestDev)
            ) {
              setResultMessage(dev === bestDev ? t('estimateBest') : t('estimateWorse'));
            }
          }
        }
      }
    };
    socket.on('server:stateUpdate', onStateUpdate);

    socket.on('evaluation:started', () => {
      setPhase('waitingForResult');
      setEvaluating(true);
      setIsFinal(false);
    });
    socket.on('answersEvaluated', ({ answers, solution: sol }: { answers?: Record<string, any>; solution?: string }) => {
      setEvaluating(false);
      if (sol) setSolution(sol);
      if (teamId && answers && answers[teamId]) {
        const entry = answers[teamId];
        setResultCorrect(Boolean(entry.isCorrect));
        {
          const dev = (entry as any)?.deviation;
          const bestDev = (entry as any)?.bestDeviation;
          if (
            isClosenessQuestion(question) &&
            typeof dev === 'number' &&
            typeof bestDev === 'number' &&
            Number.isFinite(dev) &&
            Number.isFinite(bestDev)
          ) {
            setResultMessage(dev === bestDev ? t('estimateBest') : t('estimateWorse'));
          }
        }
        if (typeof entry.awardedPoints === 'number') setResultPoints(entry.awardedPoints);
        const detail = (entry as any)?.awardedDetail;
        if (detail) setResultDetail(detail);
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
        if (
          isClosenessQuestion(question) &&
          typeof deviation === 'number' &&
          typeof bestDeviation === 'number' &&
          Number.isFinite(deviation) &&
          Number.isFinite(bestDeviation)
        ) {
          setResultMessage(deviation === bestDeviation ? t('estimateBest') : t('estimateWorse'));
        }
        setPhase('showResult');
        if (typeof awardedPoints === 'number') setResultPoints(awardedPoints);
        if (awardedDetail) setResultDetail(awardedDetail);
        if (sol) setSolution(sol);
        setIsFinal(true);
      }
    );
    socket.on('teamKicked', ({ teamId: kicked }) => {
      if (kicked === teamId) {
        showError(t('kicked'));
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

  const updateTop5Text = (index: number, value: string) => {
    setBunteTop5Order((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

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
        showError(language === 'de' ? 'Teamname fehlt.' : 'Team name required.');
        return;
      }
      if (!roomCode) {
        showError(language === 'de' ? 'Roomcode fehlt.' : 'Room code missing.');
        return;
      }
      const socket = socketRef.current;
      const payload = await new Promise<{ team: Team }>((resolve, reject) => {
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
          (resp?: { ok: boolean; error?: string; team?: Team }) => {
            if (!resp?.ok || !resp?.team) {
              reject(new Error(resp?.error || 'Beitritt fehlgeschlagen'));
            } else {
              resolve({ team: resp.team });
            }
          }
        );
      });
      const data = payload;
      setTeamId(data.team.id);
      localStorage.setItem(storageKey('name'), cleanName);
      localStorage.setItem(storageKey('id'), data.team.id);
      savedIdRef.current = data.team.id;
      try {
        const langRes = await fetchLanguage(roomCode);
        if (langRes?.language) {
          // Team-View soll nur einsprachig sein, nicht 'both'
          const singleLang = langRes.language === 'both' ? 'de' : langRes.language;
          setLanguageState(singleLang);
          localStorage.setItem('teamLanguage', singleLang);
        }
      } catch {
        // ignore
      }
      await loadQuestion();
      clearMessage();
    } catch (err) {
      showError(
          language === 'de'
          ? `Beitritt fehlgeschlagen (${SOCKET_URL}). Bitte Raumcode/Verbindung prüfen.`
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
          showError(t('loginError'));
          return;
        }
      } else {
        showError(t('loginError'));
        return;
      }
    }
    if (!canAnswer) {
      showError(language === 'de' ? 'Antworten aktuell gesperrt.' : 'Answers are locked right now.');
      return;
    }
    try {
      const isBunteQuestion = question?.type === 'BUNTE_TUETE' && question?.bunteTuete;
      if (question?.mechanic === 'betting') {
        const pool = (question as any).pointsPool ?? 10;
        const sum = bettingPoints.reduce((a, b) => a + b, 0);
        if (sum !== pool) {
          showError(t('betInvalid'));
          return;
        }
        if (!teamId) return;
        await submitAnswer(roomCode, teamId, bettingPoints);
        setAnswerSubmitted(true);
        setAnswer(bettingPoints);
      } else if (isBunteQuestion) {
        const payload = buildBunteSubmission(question.bunteTuete as BunteTuetePayload);
        if (!payload || !teamId) return;
        await submitAnswer(roomCode, teamId, payload);
        setAnswerSubmitted(true);
      } else {
        if (!teamId) return;
        await submitAnswer(roomCode, teamId, answer);
        setAnswerSubmitted(true);
      }
      setPhase('waitingForResult');
      setAllowReadyToggle(false);
      setTransitioning(true);
      clearMessage();
      setTimeout(() => setTransitioning(false), 500);
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : (language === 'de' ? 'Antwort konnte nicht gesendet werden.' : 'Could not submit answer.');
      const normalized = msg.toLowerCase();
      if (normalized.includes('team unbekannt') || normalized.includes('team unknown')) {
        // Team-ID ist ungültig (Session neu gestartet oder altes Team). Erzwinge Rejoin.
        localStorage.removeItem(storageKey('id'));
        savedIdRef.current = null;
        setTeamId(null);
        setPhase('notJoined');
        showError(language === 'de' ? 'Team nicht mehr verbunden. Bitte neu beitreten.' : 'Team not recognized. Please rejoin.');
        return;
      }
      showError(msg);
    }
  };


  function renderAnswering() {
    return (
      <div
        key={question?.id || phase}
        className="glass-reflective shimmer-card"
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
          animation: timeUp
            ? 'timeup-pulse 0.35s ease-in-out 2'
            : 'spring-entrance 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          position: 'relative',
          overflow: 'hidden'
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
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#f1f5f9',
            boxShadow: '0 0 12px rgba(255,79,158,0.08), inset 0 1px 1px rgba(255,255,255,0.06)',
            backdropFilter: 'blur(30px) saturate(200%)',
            transition: 'all 0.3s ease'
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
          {/* Only logo in header; label removed to keep header minimal */}
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
        <h2
          style={{
            ...questionStyleTeam,
            color: '#f8fafc',
            animation: 'fadeSlideUpStrong 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both'
          }}
        >
          {question?.question?.split('/')[0]?.trim() ?? question?.question ?? t('waitingMsg')}
        </h2>
      {(() => {
        const q: any = question;
        const mediaUrl = q?.imageUrl || q?.media?.url;
        if (!q || !mediaUrl) return null;
        return (
          <div
            style={{
              margin: '10px 0 6px',
              display: 'flex',
              justifyContent: 'center',
              animation: 'fadeSlideUpStrong 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
              animationDelay: '60ms'
            }}
          >
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
          background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
          backdropFilter: 'blur(30px) saturate(200%) brightness(1.1)',
          color: '#f8fafc',
          boxShadow: canAnswer ? '0 4px 20px rgba(255,79,158,0.25), inset 0 1px 1px rgba(255,255,255,0.1)' : 'inset 0 1px 1px rgba(255,255,255,0.05)',
          border: canAnswer ? '1px solid rgba(255,79,158,0.5)' : '1px solid rgba(255,255,255,0.06)',
          animation: canAnswer ? 'popSoft 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
          cursor: canAnswer ? 'pointer' : 'not-allowed',
          opacity: canAnswer ? 1 : 0.6,
          transform: canAnswer ? undefined : 'scale(0.99)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4
        }}
        onClick={handleSubmit}
        disabled={!canAnswer}
      >
        {hasTimer && canAnswer && (
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              right: `${Math.max(0, Math.min(100, 100 - progress))}%`,
              background: `linear-gradient(90deg, rgba(255,79,158,0.08) 0%, rgba(217,70,239,0.12) 50%, rgba(255,79,158,0.06) 100%)`,
              boxShadow: 'inset 0 0 12px rgba(255,79,158,0.15)',
              borderRadius: 12,
              zIndex: 0,
              pointerEvents: 'none',
              transition: 'right 100ms ease-out'
            }}
          />
        )}
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            fontWeight: 900
          }}
        >
          {t('send')}
        </span>
        {hasTimer && remainingSeconds > 0 && (
          <span
            style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              fontSize: remainingSeconds <= 10 ? 20 : 16,
              fontWeight: 900,
              color: remainingSeconds <= 10
                ? `hsl(0, 100%, ${Math.max(35, 60 - remainingSeconds * 2)}%)`
                : '#cbd5e1',
              opacity: 1,
              animation: remainingSeconds <= 10 ? 'pulse-timer 0.8s ease-in-out infinite' : 'none',
              textShadow: remainingSeconds <= 5 ? '0 0 10px rgba(255, 79, 158, 0.6)' : 'none'
            }}
          >
            {Math.max(0, remainingSeconds)}s
          </span>
        )}
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(135deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 6px, transparent 6px, transparent 12px)',
            opacity: 0.3,
            pointerEvents: 'none'
          }}
        />
      </button>
      {message && <div className={`message-state message-${message.type}`}>{message.text}</div>}
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
      language === 'de' ? 'Wir prüfen alle Antworten ...' : t('evaluating')
    );
  }

  function buildBunteSubmission(payload: BunteTuetePayload | undefined) {
    if (!question || !payload) return null;
    if (payload.kind === 'top5') {
      const values = bunteTop5Order.map((v) => (v || '').trim()).filter(Boolean).slice(0, 5);
      if (values.length === 0) {
        showError(language === 'de' ? 'Mindestens eine Antwort eingeben.' : 'Enter at least one answer.');
        return null;
      }
      return { kind: 'top5', order: values };
    }
    if (payload.kind === 'precision') {
      if (!buntePrecisionText.trim()) {
        showError(language === 'de' ? 'Bitte Antwort eingeben.' : 'Please enter an answer.');
        return null;
      }
      return { kind: 'precision', text: buntePrecisionText.trim() };
    }
    if (payload.kind === 'oneOfEight') {
      if (!bunteOneChoice) {
        showError(language === 'de' ? 'Bitte eine Option waehlen.' : 'Please choose an option.');
        return null;
      }
      return { kind: 'oneOfEight', choiceId: bunteOneChoice };
    }
    if (payload.kind === 'order') {
      const values = bunteOrderSelection;
      if (values.length !== payload.items.length || values.some((val) => !val)) {
        showError(language === 'de' ? 'Bitte jede Position belegen.' : 'Please fill every position.');
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

  function renderBunteInput(payload: BunteTuetePayload, accent: string) {
    if (payload.kind === 'top5') {
      const maxEntries = 5;
      return (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ color: '#cbd5e1', fontSize: 12 }}>
            {language === 'de'
              ? 'Bis zu 5 Antworten, Reihenfolge egal.'
              : 'Up to 5 answers, order irrelevant.'}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {Array.from({ length: maxEntries }).map((_, idx) => (
              <input
                key={idx}
                className="team-answer-input"
                style={inputStyle}
                placeholder={`${language === 'de' ? 'Antwort' : 'Answer'} ${idx + 1}`}
                value={bunteTop5Order[idx] ?? ''}
                onChange={(e) => updateTop5Text(idx, e.target.value)}
                disabled={!canAnswer}
              />
            ))}
          </div>
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
        <div style={{ display: 'grid', gap: 8 }} className="stagger-container">
          {payload.statements.map((statement) => {
            const selected = bunteOneChoice === statement.id;
            return (
              <button
                key={statement.id}
                type="button"
                className={`team-choice shimmer-card hover-spring btn-ripple${selected ? ' is-selected' : ''}`}
                onClick={() => setBunteOneChoice(statement.id)}
                disabled={!canAnswer}
                style={{
                  ...choiceButton,
                  justifyContent: 'flex-start',
                  border: `1px solid ${selected ? accent : 'rgba(255,255,255,0.08)'}`,
                  background: selected ? `${accent}22` : 'rgba(255,255,255,0.04)',
                  color: '#e2e8f0',
                  cursor: canAnswer ? 'pointer' : 'not-allowed',
                  overflow: 'hidden',
                  position: 'relative'
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
    if (payload.kind === 'order') {
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

  function renderTop5Solution() {
    if (!question || question.type !== 'BUNTE_TUETE' || !question.bunteTuete) return null;
    if (!(phase === 'showResult' || isFinal)) return null;
    const payload = question.bunteTuete as BunteTuetePayload;
    if (payload.kind !== 'top5') return null;
    const top5 = Array.isArray(payload.correctOrder) ? payload.correctOrder : [];
    if (!top5.length) return null;
    const itemMap = new Map(
      Array.isArray(payload.items) ? payload.items.map((item) => [item.id, item.label]) : []
    );
    const resolveLabel = (value: string) => itemMap.get(value) || value;
    return (
      <div
        style={{
          margin: '12px 0 0',
          color: '#e2e8f0',
          fontWeight: 700,
          padding: '10px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <div style={{ color: '#94a3b8', fontSize: 12 }}>
          {language === 'de' ? 'Top 5 Lösung:' : 'Top 5 solution:'}
        </div>
        <ol style={{ margin: '6px 0 0', paddingInlineStart: 18 }}>
          {top5.map((entry, idx) => (
            <li key={`${idx}-${entry}`} style={{ marginBottom: 4 }}>
              {resolveLabel(entry)}
            </li>
          ))}
        </ol>
      </div>
    );
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
          <div style={{ display: 'grid', gap: 10 }} className="stagger-container">
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                className={`team-choice shimmer-card hover-spring btn-ripple${answer === String(idx) ? ' is-selected' : ''}`}
                style={{
                  ...choiceButton,
                  border: `1px solid ${accent}55`,
                  background: answer === String(idx) ? `${accent}22` : 'rgba(255,255,255,0.08)',
                  color: '#e2e8f0',
                  boxShadow: answer === String(idx) ? `0 10px 24px ${accent}35` : 'none',
                  overflow: 'hidden',
                  position: 'relative'
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
        const opts = Array.isArray((question as any)?.options) ? (question as any).options : ['A', 'B', 'C'];
        const pool = typeof (question as any)?.pointsPool === 'number' ? (question as any).pointsPool : 10;
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
      case 'imageQuestion': {
        return (
          <input
            className="team-answer-input"
            style={inputStyle}
            placeholder={t('inputAnswer')}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!canAnswer}
            autoFocus
          />
        );
      }
      default: {
        const unit = typeof (question as any)?.unit === 'string' ? (question as any).unit : undefined;
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

  const formatSubmittedAnswer = (raw: any) => {
    if (!question) return String(raw ?? '');
    if (question.mechanic === 'multipleChoice') {
      const q = question as MultipleChoiceQuestion;
      const opts = language === 'en' && q.optionsEn?.length ? q.optionsEn : q.options;
      const num = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw)) ? Number(raw) : null;
      // Answer is stored as 0-based index, use it directly
      const idx = num;
      if (idx !== null && idx >= 0 && idx < opts.length) {
        const letter = String.fromCharCode(65 + idx);
        return `${letter} – ${opts[idx]}`;
      }
      return typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
    }
    if (question.mechanic === 'betting') {
      const q = question as BettingQuestion;
      const opts = language === 'en' && q.optionsEn?.length ? q.optionsEn : q.options;
      if (Array.isArray(raw)) {
        return raw
          .slice(0, 3)
          .map((points, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const label = opts?.[idx] ? ` ${opts[idx]}` : '';
            return `${letter}${label}: ${points}`;
          })
          .join(' | ');
      }
      return typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
    }
    if (question.mechanic === 'trueFalse') {
      if (raw === true || raw === 'true') return t('tfTrue');
      if (raw === false || raw === 'false') return t('tfFalse');
    }
    return typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
  };

  function renderShowResult() {
    const isCorrect = resultCorrect === true;
    const isIncorrect = resultCorrect === false;
    return (
      <div 
        className={`card-tilt ${feedbackAnimation ? (feedbackAnimation === 'success' ? 'success-animation' : 'shake-animation') : ''}`}
        style={{ ...glassCard, alignItems: 'center', textAlign: 'center', padding: '24px 20px' }}
      >
      <div style={{
        ...pillLabel,
        background: 'linear-gradient(135deg, rgba(255,79,158,0.15), rgba(217,70,239,0.12))',
        border: '1px solid rgba(255,79,158,0.4)',
        color: '#ffc9e3',
        textShadow: '0 0 12px rgba(255,79,158,0.3)'
      }}>
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
          background: isCorrect
            ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(74,222,128,0.08))'
            : isIncorrect
              ? 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(220,38,38,0.08))'
              : 'linear-gradient(135deg, rgba(148,163,184,0.12), rgba(100,116,139,0.08))',
          border: isCorrect
            ? '1px solid rgba(34,197,94,0.3)'
            : isIncorrect
              ? '1px solid rgba(239,68,68,0.35)'
              : '1px solid rgba(148,163,184,0.35)',
          backdropFilter: 'blur(20px)'
        }}>
          <p style={{ 
            margin: 0, 
            color: isCorrect ? '#4ade80' : isIncorrect ? '#ef4444' : '#cbd5e1', 
            fontSize: 24, 
            fontWeight: 900,
            background: isCorrect
              ? 'linear-gradient(135deg, #4ade80, #22c55e)'
              : isIncorrect
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #e2e8f0, #94a3b8)',
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
          {formatSubmittedAnswer(answer)}
        </p>
      )}
      {/* Show other teams' answers during evaluation */}
      {evaluating && teamStatus && teamStatus.length > 1 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 12, fontWeight: 600 }}>
            {language === 'de' ? 'Andere Teams' : 'Other teams'}
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="stagger-container">
            {teamStatus
              .filter(t => t.id !== teamId && t.answer !== undefined)
              .map((team, idx) => {
                const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#10b981', '#f87171', '#60a5fa'];
                const accentColor = colors[idx % colors.length];
                return (
                  <div
                    key={team.id}
                    className="glass-reflective shimmer-card"
                    style={{
                      padding: '14px',
                      borderRadius: 12,
                      border: `1.5px solid ${accentColor}22`,
                      borderLeft: `3px solid ${accentColor}`,
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <div style={{ color: accentColor, fontWeight: 700, marginBottom: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.3px' }}>
                      <span style={{ fontSize: 18 }}>●</span>
                      {team.name}
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word', paddingLeft: 24, fontWeight: 500 }}>
                      {formatSubmittedAnswer(team.answer)}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
      {resultMessage && <div className="message-state message-accent">{resultMessage}</div>}
      {resultPoints !== null && (
        <div className="message-state message-success">
          +{resultPoints} {language === 'de' ? 'Punkte' : 'Points'}
          {resultDetail ? ` (${resultDetail})` : ''}
        </div>
      )}
      {solution && (
        <p style={{ margin: '12px 0 0', color: '#e2e8f0', fontWeight: 700, padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{language === 'de' ? 'Richtige Antwort:' : 'Correct answer:'}</span>
          <br />
          {solution}
        </p>
      )}
      {renderTop5Solution()}
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

  function submitBlitzBan(themeId: string) {
    if (!teamId || !socketRef.current) return;
    if (blitzSelectionBusy) return;
    setBlitzSelectionBusy(true);
    socketRef.current.emit(
      'team:blitzBanCategory',
      { roomCode, teamId, themeId },
      (resp?: { error?: string }) => {
        setBlitzSelectionBusy(false);
        if (resp?.error) {
          setToast(resp.error);
          setTimeout(() => setToast(null), 2000);
        }
      }
    );
  }

  function submitBlitzPick(themeId: string) {
    if (!teamId || !socketRef.current) return;
    if (blitzSelectionBusy) return;
    setBlitzSelectionBusy(true);
    socketRef.current.emit(
      'team:blitzPickCategory',
      { roomCode, teamId, themeId },
      (resp?: { error?: string }) => {
        setBlitzSelectionBusy(false);
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
        <div style={{ ...glassCard, textAlign: 'center' }} className="card-tilt">
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
    const medals = ['🥇', '🥈', '🥉'];
    const scoreboardBlock = (
      <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
        {sortedScoreboard.map((entry, idx) => {
          const medal = medals[idx] || '';
          const colors = ['#fbbf24', '#e5e7eb', '#f97316'];
          const medalColor = colors[idx] || '#94a3b8';
          return (
            <div
              key={`rundlauf-score-${entry.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto auto 1fr auto',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                border: idx < 3 ? `1.5px solid ${medalColor}44` : '1px solid rgba(255,255,255,0.08)',
                background: idx < 3 ? `${medalColor}11` : 'rgba(2,6,23,0.6)',
                alignItems: 'center',
                transition: 'all 0.3s ease',
                animation: `slideInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)`,
                animationDelay: `${idx * 60}ms`,
                animationFillMode: 'backwards'
              }}
              onMouseEnter={(e) => {
                if (idx < 3) {
                  (e.currentTarget as HTMLElement).style.borderColor = `${medalColor}88`;
                  (e.currentTarget as HTMLElement).style.background = `${medalColor}22`;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (idx < 3) {
                  (e.currentTarget as HTMLElement).style.borderColor = `${medalColor}44`;
                  (e.currentTarget as HTMLElement).style.background = `${medalColor}11`;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 900 }}>{medal || idx + 1}</span>
              <span style={{ fontWeight: 800, color: medal ? medalColor : '#e2e8f0' }}>
                {idx < 3 ? idx + 1 : idx + 1}
              </span>
              <span style={{ color: '#e2e8f0' }}>{entry.name}</span>
              <span style={{ fontWeight: 800, color: medal ? medalColor : '#94a3b8' }}>{entry.score ?? 0}</span>
            </div>
          );
        })}
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
        <div style={{ ...glassCard, textAlign: 'center' }} className="card-tilt">
          <div style={{...pillLabel, background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.15))', border: '1px solid rgba(59,130,246,0.5)', color: '#93c5fd'}}>📊 {language === 'de' ? 'Zwischenstand' : 'Scoreboard'}</div>
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
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 10 }} className="card-tilt">
          <div style={{...pillLabel, background: 'linear-gradient(135deg, rgba(147,51,234,0.2), rgba(126,34,206,0.15))', border: '1px solid rgba(147,51,234,0.5)', color: '#e9d5ff'}}>🎯 {language === 'de' ? 'Kategorienwahl' : 'Category select'}</div>
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
            {pool.map((entry, idx) => {
              const isBanned = bans.has(entry.id);
              const isPinned = pinnedId === entry.id;
              return (
                <div
                  key={`rundlauf-team-pick-${entry.id}`}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: isPinned ? '2px solid rgba(96,165,250,0.6)' : isBanned ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(255,255,255,0.12)',
                    background: isPinned ? 'rgba(96,165,250,0.2)' : isBanned ? 'rgba(248,113,113,0.08)' : 'rgba(15,23,42,0.5)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    opacity: isBanned ? 0.6 : 1,
                    animation: `fade-transition-enter 0.4s ease ${idx * 0.08}s backwards`,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span style={{ fontWeight: isPinned ? 700 : 400 }}>{isPinned ? '✓ ' : ''}{entry.title}</span>
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
          <div style={{ ...glassCard, textAlign: 'center' }} className="card-tilt">
            <div style={{...pillLabel, background: 'linear-gradient(135deg, rgba(248,113,113,0.2), rgba(239,68,68,0.15))', border: '1px solid rgba(248,113,113,0.5)', color: '#fecaca'}}>❌ {language === 'de' ? 'K.O.-Rallye' : 'Knockout relay'}</div>
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
          <div style={{ ...glassCard, textAlign: 'center' }} className="card-tilt">
            <div style={{...pillLabel, background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(147,51,234,0.15))', border: '1px solid rgba(168,85,247,0.5)', color: '#e9d5ff'}}>⏳ {language === 'de' ? 'K.O.-Rallye' : 'Knockout relay'}</div>
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
        <div style={{ ...glassCard, display: 'grid', gap: 10 }} className="card-tilt">
          <div style={{...pillLabel, background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.15))', border: '1px solid rgba(34,197,94,0.5)', color: '#bbf7d0'}}>⚡ {language === 'de' ? 'Du bist dran' : language === 'both' ? 'Du bist dran / Your turn' : 'Your turn'}</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#e2e8f0' }}>📂 {currentCategory}</div>
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
        <div style={{ ...glassCard, textAlign: 'center' }} className="card-tilt">
          <div style={{...pillLabel, background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.15))', border: '1px solid rgba(34,197,94,0.5)', color: '#bbf7d0'}}>✅ {language === 'de' ? 'Runde beendet' : 'Round finished'}</div>
          {winnerNames && (
            <p style={{ ...mutedText, marginBottom: 0 }}>
              {language === 'de' ? 'Gewinner' : 'Winner'}: {winnerNames}
            </p>
          )}
        </div>
      );
    }
    if (gameState === 'RUNDLAUF_SCOREBOARD_FINAL' || gameState === 'SIEGEREHRUNG') {
      const topThree = scoreboard.slice(0, 3);
      const rest = scoreboard.slice(3);
      return (
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 16 }} className="card-tilt page-transition-enter-active">
          <div style={{...pillLabel, background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.15))', border: '1px solid rgba(16,185,129,0.5)', color: '#6ee7b7'}}>
            {gameState === 'SIEGEREHRUNG' ? '🎉 ' : '🏁 '}{language === 'de' ? 'Finale' : 'Final'}{gameState === 'SIEGEREHRUNG' ? ' 🎉' : ' 🏁'}
          </div>
          
          {/* Podium Top 3 */}
          {topThree.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              {[1, 0, 2].map((idx) => {
                const entry = topThree[idx];
                if (!entry) return null;
                const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                const heights = { 1: '100px', 2: '80px', 3: '70px' };
                const colors = { 
                  1: 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(251,146,60,0.2))',
                  2: 'linear-gradient(135deg, rgba(203,213,225,0.25), rgba(148,163,184,0.15))',
                  3: 'linear-gradient(135deg, rgba(205,127,50,0.25), rgba(180,83,9,0.15))'
                };
                const borderColors = {
                  1: 'rgba(251,191,36,0.6)',
                  2: 'rgba(203,213,225,0.5)',
                  3: 'rgba(205,127,50,0.5)'
                };
                return (
                  <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      fontSize: actualRank === 1 ? 32 : 24,
                      animation: actualRank === 1 ? 'pulse-depth 2s ease-in-out infinite' : 'none'
                    }}>
                      {actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : '🥉'}
                    </div>
                    <div
                      className={actualRank === 1 ? 'winner-spotlight' : undefined}
                      style={{
                      background: colors[actualRank as 1 | 2 | 3],
                      border: `2px solid ${borderColors[actualRank as 1 | 2 | 3]}`,
                      borderRadius: 12,
                      padding: '12px 8px',
                      height: heights[actualRank as 1 | 2 | 3],
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      width: '100%',
                      backdropFilter: 'blur(10px)',
                      animation: `spring-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.15}s backwards`
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, wordBreak: 'break-word' }}>{entry.name}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: actualRank === 1 ? '#fcd34d' : actualRank === 2 ? '#e2e8f0' : '#fdba74' }}>
                        {entry.score ?? 0}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Rest of teams */}
          {rest.length > 0 && (
            <div style={{ display: 'grid', gap: 6 }}>
              {rest.map((entry, idx) => (
                <div
                  key={`final-${entry.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(15,23,42,0.4)',
                    animation: `fade-transition-enter 0.4s ease ${(idx + 3) * 0.1}s backwards`
                  }}
                >
                  <span style={{ fontWeight: 800, color: '#94a3b8' }}>{idx + 4}.</span>
                  <span style={{ fontSize: 14 }}>{entry.name}</span>
                  <span style={{ fontWeight: 800 }}>{entry.score ?? 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return renderWaiting(language === 'de' ? 'Warten...' : 'Waiting...');
  }

  function renderBlitzStage() {
    if (!blitzState) {
      return (
        <div style={{ ...glassCard, textAlign: 'center' }} className="card-tilt">
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
    const canAnswer = (phase === 'PLAYING' || phase === 'DISPLAYING') && !blitzSubmitted;
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
    const bansRemaining = Math.max(0, banLimit - banCount);
    const topBanLimit = blitzState.topTeamId ? blitzState.banLimits?.[blitzState.topTeamId] ?? 0 : 0;
    const topBanCount = blitzState.topTeamId ? blitzState.bans?.[blitzState.topTeamId]?.length ?? 0 : 0;
    const banPhaseDone = topBanLimit === 0 || topBanCount >= topBanLimit;
    const selectionLocked = Boolean(blitzState.pinnedTheme);
    const pickUnlocked = banPhaseDone;
    const canShowBan = isTopTeam && !selectionLocked && !banPhaseDone;
    const canShowPick = isLastTeam && pickUnlocked && !selectionLocked;
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
            <PrimaryButton
              style={{
                background: isReady
                  ? `linear-gradient(135deg, ${accentPink}, rgba(217, 70, 239, 0.85))`
                  : 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                border: isReady ? `1px solid ${accentPink}` : '1px solid rgba(255,255,255,0.12)',
                boxShadow: isReady ? `0 0 24px ${accentPink}35, 0 6px 22px ${accentPink}35` : 'none',
                color: '#f8fafc',
                minHeight: 48,
                width: '100%'
              }}
              onClick={connectionStatus === 'connected' ? toggleReady : undefined}
              disabled={connectionStatus !== 'connected'}
            >
              {isReady ? t('readyOn') : language === 'de' ? 'Bereit' : 'Ready'}
            </PrimaryButton>
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
          {canShowBan && (
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
              {language === 'de'
                ? `✓ Du bist Platz 1: bannen Sie ${bansRemaining} Kategorien (${banCount}/${banLimit} erledigt)`
                : `✓ You are top: ban ${bansRemaining} categories (${banCount}/${banLimit} done)`}
            </div>
          )}
          {isTopTeam && pickUnlocked && !selectionLocked && (
            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
              {language === 'de'
                ? '✓ Alle Bans erledigt – warte auf Auswahl'
                : '✓ All bans done – waiting for pick'}
            </div>
          )}
          {isLastTeam && !pickUnlocked && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {language === 'de'
                ? 'Bitte warten bis Platz 1 fertig gebannt hat.'
                : 'Please wait until team 1 finishes banning.'}
            </div>
          )}
          {canShowPick && (
            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
              {language === 'de'
                ? '✓ Deine Runde: waehlen Sie 1 Kategorie'
                : '✓ Your turn: pick 1 category'}
            </div>
          )}
          {!canShowBan && !canShowPick && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {language === 'de' ? 'Bitte warten, Auswahl läuft...' : 'Please wait, selection in progress...'}
            </div>
          )}
          {canShowBan || canShowPick ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {pool.map((theme) => {
                const isBanned = bannedIds.has(theme.id);
                const isPinned = pinnedId === theme.id;
                const canBan = canShowBan && banCount < banLimit && !isBanned && !isPinned && !blitzSelectionBusy;
                const canPick = canShowPick && !isBanned && !isPinned && !blitzSelectionBusy;
                return (
                  <div
                    key={`blitz-team-pick-${theme.id}`}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 12,
                      border: isPinned 
                        ? '2px solid rgba(34,197,94,0.6)' 
                        : '1px solid rgba(255,255,255,0.12)',
                      background: isPinned 
                        ? 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.15))' 
                        : 'rgba(15,23,42,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      opacity: isBanned ? 0.5 : 1,
                      transform: isBanned ? 'scale(0.95)' : isPinned ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: isPinned 
                        ? '0 0 20px rgba(34,197,94,0.3), 0 8px 24px rgba(0,0,0,0.2)' 
                        : 'none',
                      transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      filter: isBanned ? 'grayscale(40%)' : 'none'
                    }}
                  >
                    <span style={{ 
                      textDecoration: isBanned ? 'line-through' : 'none',
                      fontWeight: isPinned ? 700 : 400,
                      color: isPinned ? '#a7f3d0' : 'inherit'
                    }}>
                      {theme.title}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {canShowBan && (
                        <button
                          style={{
                            ...primaryButton,
                            padding: '6px 10px',
                            fontSize: 12,
                            background: 'rgba(248,113,113,0.2)',
                            border: '1px solid rgba(248,113,113,0.4)',
                            color: '#fecaca',
                            opacity: canBan ? 1 : 0.35,
                            cursor: canBan ? 'pointer' : 'not-allowed'
                          }}
                          disabled={!canBan}
                          onClick={() => submitBlitzBan(theme.id)}
                        >
                          {language === 'de' ? 'Bannen' : 'Ban'}
                        </button>
                      )}
                      {canShowPick && (
                        <button
                          style={{
                            ...primaryButton,
                            padding: '6px 10px',
                            fontSize: 12,
                            background: 'rgba(34,197,94,0.2)',
                            border: '1px solid rgba(34,197,94,0.45)',
                            color: '#bbf7d0',
                            opacity: canPick ? 1 : 0.35,
                            cursor: canPick ? 'pointer' : 'not-allowed'
                          }}
                          disabled={!canPick}
                          onClick={() => submitBlitzPick(theme.id)}
                        >
                          {language === 'de' ? 'Wählen' : 'Pick'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 14, color: '#94a3b8' }}>
              {language === 'de'
                ? 'Wartet auf andere Teams...'
                : 'Waiting for other teams...'}
            </div>
          )}
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
      const topThree = scoreboard.slice(0, 3);
      const rest = scoreboard.slice(3);
      return (
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 16 }} className="card-tilt page-transition-enter-active">
          <div style={{...pillLabel, background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,146,60,0.15))', border: '1px solid rgba(251,191,36,0.5)', color: '#fcd34d'}}>
            🏆 {language === 'de' ? 'Zwischenstand' : 'Scoreboard'}
          </div>
          
          {/* Podium Top 3 */}
          {topThree.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              {[1, 0, 2].map((idx) => {
                const entry = topThree[idx];
                if (!entry) return null;
                const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                const heights = { 1: '100px', 2: '80px', 3: '70px' };
                const colors = { 
                  1: 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(251,146,60,0.2))',
                  2: 'linear-gradient(135deg, rgba(203,213,225,0.25), rgba(148,163,184,0.15))',
                  3: 'linear-gradient(135deg, rgba(205,127,50,0.25), rgba(180,83,9,0.15))'
                };
                const borderColors = {
                  1: 'rgba(251,191,36,0.6)',
                  2: 'rgba(203,213,225,0.5)',
                  3: 'rgba(205,127,50,0.5)'
                };
                return (
                  <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      fontSize: actualRank === 1 ? 32 : 24,
                      animation: actualRank === 1 ? 'pulse-depth 2s ease-in-out infinite' : 'none'
                    }}>
                      {actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : '🥉'}
                    </div>
                    <div
                      className={actualRank === 1 ? 'winner-spotlight' : undefined}
                      style={{
                      background: colors[actualRank as 1 | 2 | 3],
                      border: `2px solid ${borderColors[actualRank as 1 | 2 | 3]}`,
                      borderRadius: 12,
                      padding: '12px 8px',
                      height: heights[actualRank as 1 | 2 | 3],
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      width: '100%',
                      backdropFilter: 'blur(10px)',
                      animation: `spring-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.15}s backwards`
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, wordBreak: 'break-word' }}>{entry.name}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: actualRank === 1 ? '#fcd34d' : actualRank === 2 ? '#e2e8f0' : '#fdba74' }}>
                        {entry.score ?? 0}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Rest of teams */}
          {rest.length > 0 && (
            <div style={{ display: 'grid', gap: 6 }}>
              {rest.map((entry, idx) => (
                <div
                  key={`blitz-final-${entry.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(15,23,42,0.4)',
                    animation: `fade-transition-enter 0.4s ease ${(idx + 3) * 0.1}s backwards`
                  }}
                >
                  <span style={{ fontWeight: 800, color: '#94a3b8' }}>{idx + 4}.</span>
                  <span style={{ fontSize: 14 }}>{entry.name}</span>
                  <span style={{ fontWeight: 800 }}>{entry.score ?? 0}</span>
                </div>
              ))}
            </div>
          )}
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

  function renderNotJoined() {
    const joinDisabled = !roomCode;
    return (
      <div key="join-screen" style={{ ...glassCard, animation: 'fadeSlideUpStrong 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
        <Pill tone="muted" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Join
      </Pill>
      <h3 style={{ ...heading, marginBottom: 8 }}>{t('joinWelcome')}</h3>
      <p style={mutedText}>{t('joinHint')}</p>
      <input
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        placeholder={t('joinPlaceholder')}
        className="team-answer-input team-join-input"
        style={{ 
          ...inputStyle, 
          transition: 'all 0.25s ease',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLInputElement).style.boxShadow = `inset 0 2px 4px rgba(0,0,0,0.3), 0 0 12px ${accentColor}77`;
          (e.currentTarget as HTMLInputElement).style.borderColor = accentColor;
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLInputElement).style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.3)';
          (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)';
        }}
      />
      <PrimaryButton
        style={{
          marginTop: 12,
          opacity: joinDisabled ? 0.5 : 1,
          cursor: joinDisabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: 'scale(1)',
          boxShadow: joinDisabled ? 'none' : '0 8px 20px rgba(99,229,255,0.3)'
        }}
        onMouseEnter={(e) => {
          if (!joinDisabled) {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 28px rgba(99,229,255,0.5)';
          }
        }}
        onMouseLeave={(e) => {
          if (!joinDisabled) {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(99,229,255,0.3)';
          }
        }}
        onClick={!joinDisabled ? () => handleJoin(false) : undefined}
        disabled={joinDisabled}
      >
        {t('joinButton')}
      </PrimaryButton>
      {!roomCode && (
        <div className="message-state message-error">
          {language === 'de' ? 'Roomcode fehlt.' : 'Room code missing.'}
        </div>
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
        {message && <div className={`message-state message-${message.type}`}>{message.text}</div>}
      </div>
    );
  }

  function renderWaiting(title: string, subtitle?: string) {
    return (
      <div
        key={`waiting-${phase}-${title}`}
        className="waiting-card glass-reflective shimmer-card float-parallax"
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
          animation: 'spring-entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          willChange: 'transform, opacity',
          position: 'relative',
          overflow: 'hidden'
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
      <div key="loading-screen" style={{ maxWidth: 620, margin: '0 auto', animation: 'fadeSlideUpStrong 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
        <SkeletonCard />
      </div>
    );
  }

  function renderErrorCard() {
    return (
      <div key="error-screen" style={{ ...glassCard, borderColor: 'rgba(248,113,113,0.3)', animation: 'fadeSlideUpStrong 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
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

  const remainingSeconds = useMemo(() => 
    timerEndsAt ? Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000)) : 0,
    [timerEndsAt, timerTick]
  );
  const progress =
    timerEndsAt && timerDuration > 0
      ? Math.max(0, Math.min(100, (remainingSeconds / timerDuration) * 100))
      : 0;
  const timeUp = timerEndsAt !== null && remainingSeconds <= 0;
  const questionAnsweringActive = gameState === 'Q_ACTIVE' && phase === 'answering';
  const canAnswer = questionAnsweringActive && !timeUp && !answerSubmitted;
  const waitForQuestionHeadline = gameState === 'LOBBY' ? t('waitingStart') : t('waitingMsg');
  const isLocked = gameState === 'Q_LOCKED';
    const timerContextActive = gameState === 'Q_ACTIVE' || isBlitzPlaying || isRundlaufActiveTurn;
  const hasTimer = Boolean(timerEndsAt && timerDuration > 0 && timerContextActive);
  const showTimerProgress = hasTimer && !isLocked && gameState === 'Q_ACTIVE';
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
    (question as any)?.layout ?? { imageOffsetX: 0, imageOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0 };

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
      style={{...pageStyleTeam, position: 'relative', overflow: 'hidden'}}
      data-timer={timerTick}
      data-team-ui="1"
      data-team-marker={teamMarker}
    >
      {/* Liquid blob backgrounds */}
      <div className="liquid-bg" style={{ top: 100, left: -150, opacity: 0.6 }} />
      <div className="liquid-bg" style={{ bottom: 100, right: -150, animationDelay: '7s', opacity: 0.6 }} />
      <span style={{ display: 'none' }}>{teamMarker}</span>
      <span style={{ display: 'none' }}>
        TEAMVIEW LIVE | phase={phase} | state={gameState} | room={roomCode} | team={teamId ?? '--'}
      </span>
      <OfflineBar disconnected={connectionStatus === 'disconnected'} language={language} onReconnect={handleReconnect} />
      <div style={contentShell}>
        <header style={{
          ...headerBarTeam,
          border: '1px solid transparent',
          backgroundImage: 'linear-gradient(rgba(13, 15, 20, 0.9), rgba(13, 15, 20, 0.9)), linear-gradient(135deg, rgba(255,79,158,0.5), rgba(217,70,239,0.5), rgba(168,85,247,0.5), rgba(255,79,158,0.5))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          animation: 'border-gradient 6s ease infinite',
          backgroundSize: '100% 100%, 300% 300%'
        }}>
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
                  border: 'none'
                }}
              >
                <img src="/logo.png?v=3" alt="Logo" style={{ width: 26, height: 26, borderRadius: 8, objectFit: 'contain' }} />
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
                style={{ background: 'rgba(250,204,21,0.2)', borderColor: 'transparent', color: '#fcd34d', fontSize: 18 }}
              >
                🔒
              </Pill>
            ) : null}
            {/* Timer Pill removed - using progress bar below instead */}
          </div>
        </header>

        {/* Timer progress bar removed - now integrated in Submit button with enhanced styling */}

        {/* Toast notifications for Blitz/Rundlauf errors */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid rgba(239,68,68,0.4)',
              background: 'rgba(239,68,68,0.15)',
              color: '#fca5a5',
              fontWeight: 600,
              fontSize: 14,
              maxWidth: '90%',
              textAlign: 'center',
              boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
              animation: 'slideDown 0.3s ease-out'
            }}
          >
            {toast}
          </div>
        )}

        {mainContent}

        {teamId && phase === 'waitingForQuestion' && allowReadyToggle && gameState === 'LOBBY' && (
          <PrimaryButton
            style={{
              marginTop: 12,
              background: isReady 
                ? `linear-gradient(135deg, rgba(255,79,158,0.18), rgba(217,70,239,0.15))`
                : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              color: isReady ? '#ffc9e3' : '#94a3b8',
              border: `1px solid ${isReady ? 'rgba(255,79,158,0.4)' : 'rgba(255,255,255,0.04)'}`,
              backdropFilter: 'blur(30px)',
              boxShadow: isReady 
                ? `0 4px 16px rgba(255,79,158,0.2), inset 0 1px 1px rgba(255,255,255,0.1)` 
                : 'inset 0 1px 1px rgba(255,255,255,0.03)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              opacity: connectionStatus === 'connected' ? 1 : 0.5,
              cursor: connectionStatus === 'connected' ? 'pointer' : 'not-allowed',
              fontWeight: isReady ? 800 : 700,
              transform: isReady ? 'scale(1.01)' : 'scale(1)'
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
          <div className="message-state message-error">
            {language === 'both'
              ? `Keine Verbindung (${SOCKET_URL}). Bitte neu verbinden. / Not connected (${SOCKET_URL}). Please reconnect.`
              : language === 'de'
              ? `Keine Verbindung (${SOCKET_URL}). Bitte neu verbinden.`
              : `Not connected (${SOCKET_URL}). Please reconnect.`}
          </div>
        )}
      </div>
      <div style={footerLogo}>
        <img src="/logo.png?v=3" alt="Cozy Wolf" style={{ width: 120, opacity: 0.85, objectFit: 'contain' }} />
      </div>
    </div>
  );
}

export default TeamView;

























          
























