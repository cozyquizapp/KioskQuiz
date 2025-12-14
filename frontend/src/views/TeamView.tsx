import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnyQuestion, MultipleChoiceQuestion, SortItemsQuestion, BingoBoard, Language } from '@shared/quizTypes';
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

type Phase = 'notJoined' | 'waitingForQuestion' | 'answering' | 'waitingForResult' | 'showResult';

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
  const savedIdRef = useRef<string | null>(null);

  const socketRef = useRef<ReturnType<typeof connectToRoom> | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recoveringRef = useRef(false);
  const [reconnectKey, setReconnectKey] = useState(0);
  const storageKey = (suffix: string) => `team:${roomCode}:${suffix}`;

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
  };

  const handleReconnect = () => {
    setConnectionStatus('connecting');
    setReconnectKey((v) => v + 1);
  };

  const updateLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('teamLanguage', lang);
    setLanguageApi(roomCode, lang).catch(() => undefined);
  };

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
        // Zeige Ergebnis direkt nach der Bewertung; finale Korrektur kommt ggf. über teamResult.
        setPhase('showResult');
      }
    });
    socket.on('teamResult', ({ teamId: tId, isCorrect, deviation, bestDeviation, solution: sol }) => {
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
      if (sol) setSolution(sol);
      setIsFinal(true);
    });
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

  const connectionStatusPill = () => (
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

  const resetInputs = () => {
    setAnswer('');
    setBettingPoints([0, 0, 0]);
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
        setMessage(language === 'de' ? 'Teamname fehlt.' : 'Team name required.');
        return;
      }
      const data = await joinRoom(roomCode, cleanName, useSavedId ? savedIdRef.current ?? undefined : undefined);
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

  const offlineBar = () =>
    connectionStatus === 'disconnected' ? (
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
          onClick={handleReconnect}
        >
          {language === 'de' ? 'Neu verbinden' : 'Reconnect'}
        </button>
      </div>
    ) : null;

  const renderAnswering = () => (
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

  const renderWaitingForResult = () =>
    renderWaiting(
      t('waiting'),
      language === 'de' ? 'Wir pruefen alle Antworten ...' : t('evaluating')
    );

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
    if (!canAnswer) return;
    try {
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
      } else {
        await submitAnswer(roomCode, teamId, answer);
        setAnswerSubmitted(true);
      }
      setPhase('waitingForResult');
      setAllowReadyToggle(false);
      setTransitioning(true);
      setTimeout(() => setTransitioning(false), 400);
      setMessage(null);
    } catch (err) {
      setMessage(
        language === 'de'
          ? 'Antwort konnte nicht gesendet werden. Bitte Verbindung prüfen.'
          : 'Could not send answer. Please check connection.'
      );
    }
  };

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

  const renderInput = (accent: string) => {
    if (!question) return null;
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
  };

  const renderShowResult = () => (
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
      {solution && (
        <p style={{ margin: '8px 0 0', color: '#e2e8f0', fontWeight: 700 }}>
          {language === 'de' ? 'Loesung:' : 'Solution:'} {solution}
        </p>
      )}
    </div>
  );

  const renderBingo = () => {
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
                    style={{ position: 'absolute', inset: 10, opacity: 0.26, objectFit: 'contain' }}
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

  const renderBingoPrompt = () => (
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

  const renderNotJoined = () => (
    <div style={{ ...glassCard, borderColor: 'rgba(255,255,255,0.14)' }}>
      <Pill tone="muted" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Join
      </Pill>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>{language === 'en' ? 'Language' : 'Sprache'}</span>
        {([
          { key: 'de', label: 'DE', flag: '🇩🇪' },
          { key: 'en', label: 'EN', flag: '🇬🇧' },
          { key: 'both', label: 'DE+EN', flag: '🌐' }
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

  const renderWaiting = (title: string, subtitle?: string) => (
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

  const renderByPhase = () => {
    if (showBingoPanel || canMarkBingo) {
      return renderBingo();
    }
    if (canMarkBingo && isFinal) {
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
  const toggleReady = () => {
    if (!teamId || !socketRef.current) return;
    const next = !isReady;
    setIsReady(next);
    socketRef.current.emit('teamReady', { roomCode, teamId, isReady: next });
  };

  const remainingSeconds = timerEndsAt ? Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000)) : 0;
  const progress =
    timerEndsAt && timerDuration > 0
      ? Math.max(0, Math.min(100, (remainingSeconds / timerDuration) * 100))
      : 0;
  const timeUp = timerEndsAt !== null && remainingSeconds <= 0;
  const canAnswer = phase === 'answering' && !timeUp;
  const hasTimer = Boolean(
    question &&
    timerEndsAt &&
    timerDuration > 0 &&
    (phase === 'answering' || phase === 'waitingForResult')
  );

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
      {offlineBar()}
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
            {hasTimer && (
              <Pill tone="muted" style={{ background: 'rgba(0,0,0,0.4)', borderColor: accentColor, color: '#e2e8f0' }}>
                {timeUp ? t('timerDoneLabel') : t('timerActiveLabel')}
              </Pill>
            )}
            {board.length === 25 && !showBingoPanel && (
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

        {renderByPhase()}

        {teamId && phase === 'waitingForQuestion' && allowReadyToggle && (
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
        {teamId && phase === 'waitingForQuestion' && allowReadyToggle && connectionStatus !== 'connected' && (
          <p style={{ marginTop: 6, color: '#f97316', fontWeight: 700 }}>
            {language === 'both'
              ? `Keine Verbindung zum Server (${SOCKET_URL}). Bitte neu verbinden. / Not connected to server (${SOCKET_URL}). Please reconnect.`
              : language === 'de'
              ? `Keine Verbindung zum Server (${SOCKET_URL}). Bitte neu verbinden.`
              : `Not connected to server (${SOCKET_URL}). Please reconnect.`}
          </p>
        )}
      </div>
      {board.length === 25 && !showBingoPanel && (
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
        <img
          src={draftTheme?.logoUrl || '/cozy-logo.svg'}
          alt="cozy"
          style={{ width: 120, opacity: 0.8, objectFit: 'contain' }}
        />
      </div>
    </div>
  );
}

export default TeamView;
























