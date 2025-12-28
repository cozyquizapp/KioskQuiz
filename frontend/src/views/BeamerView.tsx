import { useEffect, useMemo, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import {
  AnyQuestion,
  BeamerShowQuestionPayload,
  QuizCategory,
  DecorationKey,
  QuestionPhase,
  SlotTransitionMeta,
  Team,
  SyncStatePayload,
  Language,
  StateUpdatePayload,
  CozyGameState,
  PotatoState
} from '@shared/quizTypes';
import { fetchCurrentQuestion, fetchLanguage, fetchTimer, QuestionMeta } from '../api';
import { connectToRoom } from '../socket';
import { categoryColors } from '../categoryColors';
import { categoryLabels } from '../categoryLabels';
import { categoryIcons } from '../categoryAssets';
import { DECORATION_ICONS } from '../config/questionDecorations';
import BeamerLobbyView from './BeamerLobbyView';
import BeamerSlotView from './BeamerSlotView';
import BeamerQuestionView from './BeamerQuestionView';
import { introSlides as INTRO_SLIDE_MAP, IntroSlide } from '../introSlides';
import { loadPlayDraft } from '../utils/draft';

type Lang = Language;
type BaseScreen = 'lobby' | 'slot' | 'question' | 'intro';
type BeamerViewMode = 'lobby' | 'categorySlot' | 'question' | 'calculating' | 'answer' | 'intro';
const mapStateToScreenState = (state: CozyGameState): BaseScreen => {
  switch (state) {
    case 'INTRO':
      return 'intro';
    case 'Q_ACTIVE':
    case 'Q_LOCKED':
    case 'Q_REVEAL':
      return 'question';
    default:
      return 'lobby';
  }
};

type BeamerProps = { roomCode: string };

const SLOT_ITEM_HEIGHT = 70;

const translations = {
  de: {
    lobbyTitle: "Gleich geht's los.",
    lobbySubtitle: 'Macht es euch gemütlich - der Admin legt gleich los.',
    codeLabel: 'Code',
    languageLabel: 'Sprache',
    waitingForHost: 'Warten auf Admin ...',
    teamsInRoom: 'Teams im Raum',
    waitingForQuestion: 'Warten auf Admin ...',
    timeLeft: (s: number) => `${s}s`,
    timeUp: 'Zeit abgelaufen',
    noTimer: 'Kein Timer aktiv',
    calculating: 'Wir rechnen die Loesung aus... Bitte einen Moment geduldig sein.',
    answerLabel: 'Antwort',
    answerFallback: 'Antwort wird eingeblendet.',
    slotTitle: 'Naechste Kategorie',
    slotHint: 'Macht euch bereit - gleich seht ihr die Frage auf dem Beamer.',
    mixedMechanic: 'Gemischte TÃ¼te - Sondermechanik.',
    questionLabel: (index: number, total: number) => `Frage ${index}/${total}`,
    footerMeta: (
      globalIndex: number,
      globalTotal: number,
      categoryLabel: string,
      categoryIndex: number,
      categoryTotal: number
    ) => `${globalIndex}/${globalTotal} Fragen | ${categoryLabel} ${categoryIndex}/${categoryTotal}`,
    teamsReady: (ready: number, total: number) => `${ready}/${total} bereit`
  },
  en: {
    lobbyTitle: "We'll start in a moment.",
    lobbySubtitle: 'Get cozy - the host will start soon.',
    codeLabel: 'Code',
    languageLabel: 'Language',
    waitingForHost: 'Waiting for host ...',
    teamsInRoom: 'Teams in room',
    waitingForQuestion: 'Waiting for host ...',
    timeLeft: (s: number) => `${s}s`,
    timeUp: "Time's up",
    noTimer: 'No timer running',
    calculating: "We're calculating the result... Please wait a moment.",
    answerLabel: 'Answer',
    answerFallback: 'Answer will appear shortly.',
    slotTitle: 'Next category',
    slotHint: 'Get ready - the next question is about to appear.',
    mixedMechanic: 'Mixed bag - special mechanic.',
    questionLabel: (index: number, total: number) => `Question ${index}/${total}`,
    footerMeta: (
      globalIndex: number,
      globalTotal: number,
      categoryLabel: string,
      categoryIndex: number,
      categoryTotal: number
    ) => `${globalIndex}/${globalTotal} questions | ${categoryLabel} ${categoryIndex}/${categoryTotal}`,
    teamsReady: (ready: number, total: number) => `${ready}/${total} ready`
  }
} as const;

const translationsBoth = {
  lobbyTitle: `${translations.de.lobbyTitle} / ${translations.en.lobbyTitle}`,
  lobbySubtitle: `${translations.de.lobbySubtitle} / ${translations.en.lobbySubtitle}`,
  codeLabel: `${translations.de.codeLabel} / ${translations.en.codeLabel}`,
  languageLabel: `${translations.de.languageLabel} / ${translations.en.languageLabel}`,
  waitingForHost: `${translations.de.waitingForHost} / ${translations.en.waitingForHost}`,
  teamsInRoom: `${translations.de.teamsInRoom} / ${translations.en.teamsInRoom}`,
  waitingForQuestion: `${translations.de.waitingForQuestion} / ${translations.en.waitingForQuestion}`,
  timeLeft: (s: number) => `${translations.de.timeLeft(s)} / ${translations.en.timeLeft(s)}`,
  timeUp: `${translations.de.timeUp} / ${translations.en.timeUp}`,
  noTimer: `${translations.de.noTimer} / ${translations.en.noTimer}`,
  calculating: `${translations.de.calculating} / ${translations.en.calculating}`,
  answerLabel: `${translations.de.answerLabel} / ${translations.en.answerLabel}`,
  answerFallback: `${translations.de.answerFallback} / ${translations.en.answerFallback}`,
  slotTitle: `${translations.de.slotTitle} / ${translations.en.slotTitle}`,
  slotHint: `${translations.de.slotHint} / ${translations.en.slotHint}`,
  mixedMechanic: `${translations.de.mixedMechanic} / ${translations.en.mixedMechanic}`,
  questionLabel: (index: number, total: number) =>
    `${translations.de.questionLabel(index, total)} / ${translations.en.questionLabel(index, total)}`,
  footerMeta: (
    globalIndex: number,
    globalTotal: number,
    categoryLabel: string,
    categoryIndex: number,
    categoryTotal: number
  ) => `${translations.de.footerMeta(globalIndex, globalTotal, categoryLabel, categoryIndex, categoryTotal)} / ${translations.en.footerMeta(globalIndex, globalTotal, categoryLabel, categoryIndex, categoryTotal)}`,
  teamsReady: (ready: number, total: number) => `${translations.de.teamsReady(ready, total)} / ${translations.en.teamsReady(ready, total)}`
};


const CATEGORY_DESCRIPTIONS: Record<QuizCategory, Record<'de' | 'en', string>> = {
  Schaetzchen: {
    de: 'Hier \u00e4\u0068lt euer Gef\u00fchl f\u00fcr Zahlen und Gr\u00f6\u00dfen.',
    en: 'Here your sense for numbers and sizes matters.'
  },
  'Mu-Cho': {
    de: 'Hier entscheidet ihr euch clever zwischen vier Optionen.',
    en: 'Make the best choice between four options.'
  },
  Stimmts: {
    de: 'Raten oder wissen? Wahr oder falsch.',
    en: 'True or false? Trust your gut or knowledge.'
  },
  Cheese: {
    de: 'Alles rund ums Motiv \u2013 genau hinschauen.',
    en: 'All about the picture \u2013 look closely.'
  },
  GemischteTuete: {
    de: 'Gemischte T\u00fcte: ein bisschen von allem.',
    en: 'Mixed bag: a bit of everything.'
  }
};

const formatSeconds = (ms: number) => Math.max(0, Math.ceil(ms / 1000));

const normalizeLang = (lang: Lang): 'de' | 'en' => (lang === 'both' ? 'de' : lang);
const slidesForLanguage = (lang: Lang) => INTRO_SLIDE_MAP[normalizeLang(lang)];

const combineDisplay = (de: string, en: string, lang: Lang) => {
  if (lang === 'both') {
    if (de === en) return de;
    return `${de} / ${en}`;
  }
  return lang === 'en' ? en : de;
};

const getCategoryLabel = (key: QuizCategory, lang: Lang) => {
  const labels = categoryLabels[key];
  const de = labels?.de ?? key;
  const en = labels?.en ?? de;
  return combineDisplay(de, en, lang);
};

const getCategoryDescription = (key: QuizCategory, lang: Lang) => {
  const base = CATEGORY_DESCRIPTIONS[key];
  const de = base?.de ?? '';
  const en = base?.en ?? de;
  return combineDisplay(de, en, lang);
};

const pillRule: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 13,
  letterSpacing: '0.06em',
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.08)',
  color: '#e2e8f0',
  textTransform: 'uppercase',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6
};

const BeamerView = ({ roomCode }: BeamerProps) => {
  const draftTheme = loadPlayDraft()?.theme;
  const slotSpinMs = (draftTheme as any)?.slotSpinMs ?? 2400;
  const slotHoldMs = (draftTheme as any)?.slotHoldMs ?? 1200;
  const slotIntervalMs = (draftTheme as any)?.slotIntervalMs ?? 260;
  const slotScale = (draftTheme as any)?.slotScale ?? 1;
  const [screen, setScreen] = useState<BaseScreen>('lobby');
  const [gameState, setGameState] = useState<CozyGameState>('LOBBY');
  const [slotMeta, setSlotMeta] = useState<SlotTransitionMeta | null>(null);
  const [slotSequence, setSlotSequence] = useState<QuizCategory[]>([]);
  const [slotOffset, setSlotOffset] = useState(0);
  const [slotRolling, setSlotRolling] = useState(false);
  const [slotExiting, setSlotExiting] = useState(false);
  const [question, setQuestion] = useState<AnyQuestion | null>(null);
  const [questionMeta, setQuestionMeta] = useState<QuestionMeta | null>(null);
  const [language, setLanguage] = useState<Lang>('de');
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [timerDurationMs, setTimerDurationMs] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [highlightedCategoryIndex, setHighlightedCategoryIndex] = useState(0);
  const [evaluating, setEvaluating] = useState(false);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [solution, setSolution] = useState<string | undefined>(undefined);
  const [teams, setTeams] = useState<Team[]>([]);
  const [questionPhase, setQuestionPhase] = useState<QuestionPhase>('answering');
  const [potato, setPotato] = useState<PotatoState | null>(null);
  const [potatoTick, setPotatoTick] = useState(0);
  const [lastQuestion, setLastQuestion] = useState<{ text: string; category?: QuizCategory | string } | null>(null);
  const [showLastQuestion, setShowLastQuestion] = useState(true);
  const previousQuestionRef = useRef<AnyQuestion | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [toast, setToast] = useState<string | null>(null);
  const [connectionStuck, setConnectionStuck] = useState(false);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const [categoryProgress, setCategoryProgress] = useState<Record<QuizCategory, number>>(() =>
    (Object.keys(categoryLabels) as QuizCategory[]).reduce(
      (acc, key) => ({ ...acc, [key]: 0 }),
      {} as Record<QuizCategory, number>
    )
  );
  const [categoryTotals, setCategoryTotals] = useState<Record<QuizCategory, number>>(() =>
    (Object.keys(categoryLabels) as QuizCategory[]).reduce(
      (acc, key) => ({ ...acc, [key]: 5 }),
      {} as Record<QuizCategory, number>
    )
  );
  const [questionFlyIn, setQuestionFlyIn] = useState(false);
  const [introSlides, setIntroSlides] = useState<IntroSlide[]>(slidesForLanguage(language));
  const [introIndex, setIntroIndex] = useState(0);
  const introTimerRef = useRef<number | null>(null);

  const timerRef = useRef<number | null>(null);
  const slotTimeoutRef = useRef<number | null>(null);
  const reconnectTimeoutsRef = useRef<number[]>([]);
  const connectionStatusRef = useRef(connectionStatus);

  const categories = useMemo(() => Object.keys(categoryLabels) as QuizCategory[], []);
  const t = language === 'both' ? translationsBoth : translations[language === 'both' ? 'de' : language];

  const clearReconnectTimeouts = () => {
    reconnectTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    reconnectTimeoutsRef.current = [];
  };

  const scheduleReconnectAttempt = (delayMs: number) => {
    const id = window.setTimeout(() => {
      if (connectionStatusRef.current !== 'connected') {
        setReconnectNonce((n) => n + 1);
      }
    }, delayMs);
    reconnectTimeoutsRef.current.push(id);
  };

  const handleReconnect = () => {
    setConnectionStatus('connecting');
    setConnectionStuck(false);
    const reconnectText =
      language === 'both'
        ? 'Verbindung wird aufgebaut... / Reconnecting...'
        : language === 'de'
        ? 'Verbindung wird aufgebaut...'
        : 'Reconnecting...';
    setToast(reconnectText);
    setTimeout(() => setToast(null), 2000);
    clearReconnectTimeouts();
    setReconnectNonce((n) => n + 1);
    scheduleReconnectAttempt(1500);
    scheduleReconnectAttempt(4000);
  };

  const toastStyle: React.CSSProperties = {
    position: 'fixed',
    right: 16,
    bottom: 16,
    padding: '10px 14px',
    borderRadius: 12,
    background: 'rgba(15,23,42,0.9)',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
    zIndex: 20
  };

  const connectionPill = (status: 'connecting' | 'connected' | 'disconnected'): React.CSSProperties => {
    const map = {
      connected: { bg: 'rgba(34,197,94,0.16)', border: 'rgba(34,197,94,0.5)', color: '#22c55e' },
      connecting: { bg: 'rgba(245,158,11,0.16)', border: 'rgba(245,158,11,0.5)', color: '#f59e0b' },
      disconnected: { bg: 'rgba(239,68,68,0.16)', border: 'rgba(239,68,68,0.5)', color: '#ef4444' }
    } as const;
    const palette = map[status];
    return {
      padding: '6px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '0.05em',
      background: palette.bg,
      border: `1px solid ${palette.border}`,
      color: palette.color,
      textTransform: 'uppercase'
    };
  };

  // timer tick
  useEffect(() => {
    if (!timerEndsAt) {
      setRemainingMs(0);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    const tick = () => {
      const diff = timerEndsAt - Date.now();
      setRemainingMs(Math.max(0, diff));
      if (diff <= 0 && timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    tick();
    timerRef.current = window.setInterval(tick, 250);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerEndsAt]);

  // warn if disconnected > 5s
  useEffect(() => {
    if (connectionStatus !== 'disconnected') {
      setConnectionStuck(false);
      return;
    }
    const id = window.setTimeout(() => setConnectionStuck(true), 5000);
    return () => window.clearTimeout(id);
  }, [connectionStatus]);

  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  useEffect(() => {
    if (gameState !== 'POTATO') {
      setPotatoTick(0);
      return undefined;
    }
    const id = window.setInterval(() => setPotatoTick((tick) => tick + 1), 500);
    return () => window.clearInterval(id);
  }, [gameState]);

  useEffect(() => {
    const prev = previousQuestionRef.current;
    if (prev && question && prev.id !== question.id) {
      setLastQuestion({ text: prev.question, category: (prev as any)?.category });
    } else if (prev && !question && !lastQuestion) {
      setLastQuestion({ text: prev.question, category: (prev as any)?.category });
    }
    previousQuestionRef.current = question;
  }, [question, lastQuestion]);

  useEffect(() => {
    if (lastQuestion) setShowLastQuestion(true);
  }, [lastQuestion]);

  // initial fetch
  useEffect(() => {
    fetchLanguage(roomCode)
      .then((res) => res.language && setLanguage(res.language))
      .catch(() => undefined);
    fetchCurrentQuestion(roomCode)
      .then((res) => {
        if (res.question) {
          setQuestion(res.question);
          setQuestionMeta(res.meta ?? null);
          setScreen('question');
        }
      })
      .catch(() => undefined);
    fetchTimer(roomCode)
      .then((res) => {
        const ends = res?.timer?.endsAt ?? null;
        if (ends) {
          const duration = ends - Date.now();
          setTimerEndsAt(ends);
          setTimerDurationMs(duration > 0 ? duration : null);
        }
      })
      .catch(() => undefined);
  }, [roomCode]);

  useEffect(() => {
    return () => {
      clearReconnectTimeouts();
    };
  }, []);

  // sockets
  useEffect(() => {
    setConnectionStatus('connecting');
    setConnectionStuck(false);
    clearReconnectTimeouts();
    const socket: Socket = connectToRoom(roomCode);

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setToast(language === 'de' ? 'Verbindung wiederhergestellt' : 'Connection restored');
      setConnectionStuck(false);
      setTimeout(() => setToast(null), 2200);
    });
    socket.on('disconnect', () => setConnectionStatus('disconnected'));
    socket.on('connect_error', () => setConnectionStatus('disconnected'));
    socket.io?.on?.('reconnect_attempt', () => setConnectionStatus('connecting'));

    socket.on('syncState', (payload: SyncStatePayload) => {
      setLanguage(payload.language);
      setTimerEndsAt(payload.timerEndsAt);
      setScreen(payload.screen === 'slot' ? 'slot' : payload.question ? 'question' : 'lobby');
      setQuestion(payload.question);
      setQuestionMeta(payload.questionMeta ?? null);
      setSlotMeta(payload.slotMeta ?? null);
      setQuestionPhase(payload.questionPhase);
    });

    socket.on('beamer:show-slot-transition', (meta: SlotTransitionMeta) => {
      setSlotMeta(meta);
      setScreen('slot');
      setQuestion(null);
      setQuestionMeta(null);
      setEvaluating(false);
      setAnswerVisible(false);
      setSolution(undefined);
      setQuestionPhase('answering');
      setSlotExiting(false);
    });

    socket.on('beamer:show-intro', (payload: { slides?: IntroSlide[] }) => {
      setIntroSlides(payload?.slides ?? slidesForLanguage(language));
      setIntroIndex(0);
      setScreen('intro');
      setQuestion(null);
      setQuestionMeta(null);
      setEvaluating(false);
      setAnswerVisible(false);
      setSolution(undefined);
    });

    socket.on('beamer:show-question', (payload: BeamerShowQuestionPayload) => {
      // if slot animation is visible, exit it smoothly before showing question
      if (slotMeta) {
        setSlotExiting(true);
        window.setTimeout(() => {
          setSlotExiting(false);
          setQuestion(payload.question);
          setQuestionMeta(payload.meta ?? null);
          setSlotMeta(null);
          setScreen('question');
          setEvaluating(false);
          setAnswerVisible(false);
          setSolution(undefined);
          setQuestionPhase('answering');
          setQuestionFlyIn(true);
          requestAnimationFrame(() => setQuestionFlyIn(false));
        }, slotHoldMs);
        return;
      }
      setQuestion(payload.question);
      setQuestionMeta(payload.meta ?? null);
      setSlotMeta(null);
      setScreen('question');
      setEvaluating(false);
      setAnswerVisible(false);
      setSolution(undefined);
      setQuestionPhase('answering');
      setQuestionFlyIn(true);
      requestAnimationFrame(() => setQuestionFlyIn(false));
    });

    socket.on('questionStarted', ({ meta }: { meta?: QuestionMeta }) => {
      setQuestionMeta(meta ?? null);
      setScreen('question');
      setQuestionPhase('answering');
      setSlotMeta(null);
      setSlotExiting(false);
    });

    socket.on('timerStarted', ({ endsAt }: { endsAt: number }) => {
      setTimerEndsAt(endsAt);
      setTimerDurationMs(endsAt - Date.now());
    });

    socket.on('timerStopped', () => {
      setTimerEndsAt(null);
      setRemainingMs(0);
      setTimerDurationMs(null);
    });
    const onStateUpdate = (payload: StateUpdatePayload) => {
      setGameState(payload.state);
      setScreen(mapStateToScreenState(payload.state));
      if (payload.scores?.length) {
        setTeams(
          payload.scores.map((entry) => ({
            id: entry.id,
            name: entry.name,
            score: entry.score
          }))
        );
      }
      if (payload.currentQuestion !== undefined) {
        setQuestion(payload.currentQuestion);
      }
      if (payload.timer) {
        setTimerEndsAt(payload.timer.endsAt);
        setTimerDurationMs(payload.timer.endsAt ? payload.timer.endsAt - Date.now() : null);
      }
      if (payload.potato !== undefined) {
        setPotato(payload.potato ?? null);
      }
    };
    socket.on('server:stateUpdate', onStateUpdate);

    socket.on('languageChanged', ({ language: lang }: { language: Lang }) => {
      setLanguage(lang);
    });

    socket.on('beamer:show-rules', () => {
      setScreen('lobby');
      setSlotMeta(null);
      setQuestion(null);
      setQuestionMeta(null);
      setAnswerVisible(false);
      setSolution(undefined);
      setQuestionPhase('idle');
    });

    socket.on('evaluation:started', () => {
      setEvaluating(true);
      setAnswerVisible(false);
      setQuestionPhase('evaluated');
    });

    socket.on('answersEvaluated', ({ solution: sol }: { solution?: string }) => {
      setSolution(sol);
      setEvaluating(false);
      setAnswerVisible(true); // LÃ¶sung direkt einblenden
      setQuestionPhase('evaluated');
    });

    socket.on('evaluation:revealed', () => {
      setEvaluating(false);
      setAnswerVisible(true);
      setQuestionPhase('revealed');
    });

    socket.on('teamsReady', ({ teams: tTeams }: { teams: Team[] }) => {
      setTeams(tTeams ?? []);
    });

    return () => {
      socket.off('server:stateUpdate', onStateUpdate);
      socket.disconnect();
    };
  }, [roomCode, language, reconnectNonce]);

  // slot animation
  useEffect(() => {
    if (!slotMeta) {
      setSlotSequence([]);
      setSlotRolling(false);
      return;
    }

    const sequence = [...categories, ...categories, slotMeta.categoryId];
    setSlotSequence(sequence);
    setSlotOffset(0);
    setSlotRolling(true);

    requestAnimationFrame(() => {
      setSlotOffset(Math.max(0, (sequence.length - 3) * SLOT_ITEM_HEIGHT));
    });

    if (slotTimeoutRef.current) {
      window.clearTimeout(slotTimeoutRef.current);
    }
    slotTimeoutRef.current = window.setTimeout(() => {
      setSlotRolling(false);
      // keep slot view visible until the actual question payload arrives
    }, slotSpinMs);

    return () => {
      if (slotTimeoutRef.current) {
        window.clearTimeout(slotTimeoutRef.current);
        slotTimeoutRef.current = null;
      }
    };
  }, [categories, slotMeta]);

  // roTÃ¼te lobby category highlights
  useEffect(() => {
    if (categories.length === 0) return;
    if (screen !== 'lobby') return;
    const interval = window.setInterval(
      () => setHighlightedCategoryIndex((i) => (i + 1) % categories.length),
      5000
    );
    return () => {
      window.clearInterval(interval);
    };
  }, [categories.length, screen]);

  // intro auto-advance
  useEffect(() => {
    if (screen !== 'intro') {
      if (introTimerRef.current) {
        window.clearInterval(introTimerRef.current);
        introTimerRef.current = null;
      }
      return;
    }
    introTimerRef.current = window.setInterval(() => {
      setIntroIndex((prev) => (prev + 1) % introSlides.length);
    }, 8000);
    return () => {
      if (introTimerRef.current) {
        window.clearInterval(introTimerRef.current);
        introTimerRef.current = null;
      }
    };
  }, [screen, introSlides.length]);

// sync intro slides to current language
useEffect(() => {
    setIntroSlides(slidesForLanguage(language));
    setIntroIndex(0);
  }, [language]);

  // category progress from meta
  useEffect(() => {
    if (question && questionMeta?.categoryIndex) {
      setCategoryProgress((prev) => ({
        ...prev,
        [question.category]: Math.max(prev[question.category] ?? 0, questionMeta.categoryIndex)
      }));
      setCategoryTotals((prev) => ({
        ...prev,
        [question.category]: questionMeta.categoryTotal ?? prev[question.category] ?? 5
      }));
    }
  }, [question, questionMeta]);

  useEffect(() => {
    if (slotMeta) {
      setCategoryTotals((prev) => ({
        ...prev,
        [slotMeta.categoryId]:
          slotMeta.totalQuestionsInCategory ?? prev[slotMeta.categoryId] ?? 5
      }));
    }
  }, [slotMeta]);

  const viewMode: BeamerViewMode =
    screen === 'intro'
      ? 'intro'
      : screen === 'slot' && slotMeta
      ? 'categorySlot'
      : questionPhase === 'revealed' || answerVisible
      ? 'answer'
      : questionPhase === 'evaluated' || evaluating
      ? 'calculating'
      : screen === 'question'
      ? 'question'
      : 'lobby';

  const isScoreboardState =
    gameState === 'SCOREBOARD' || gameState === 'SCOREBOARD_PAUSE' || gameState === 'AWARDS';
  const isPotatoStage = gameState === 'POTATO' && potato;
  const sortedScoreTeams = [...teams].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const potatoCountdown = useMemo(() => {
    if (!potato?.deadline) return null;
    return Math.max(0, Math.ceil((potato.deadline - Date.now()) / 1000));
  }, [potato?.deadline, potatoTick]);

  const activeCategory = categories[highlightedCategoryIndex] ?? categories[0];
  const readyCount = teams.filter((tTeam) => tTeam.isReady).length;

  const currentCategory = question?.category ?? slotMeta?.categoryId;
  const categoryLabel = currentCategory ? getCategoryLabel(currentCategory, language) : '';
  const categoryTotal =
    currentCategory && categoryTotals[currentCategory]
      ? categoryTotals[currentCategory]
      : questionMeta?.categoryTotal ?? 5;
  const categoryIndex =
    questionMeta?.categoryIndex ??
    (currentCategory ? Math.max(1, categoryProgress[currentCategory] || 1) : 1);

  const questionText =
    question && language === 'en' && (question as any)?.questionEn
      ? (question as any).questionEn
      : question?.question;

  const timerText =
    timerEndsAt && remainingMs > 0
      ? t.timeLeft(formatSeconds(remainingMs))
      : timerEndsAt
      ? t.timeUp
      : t.noTimer;

  const progress =
    timerEndsAt && timerDurationMs
      ? Math.max(0, Math.min(1, remainingMs / timerDurationMs))
      : 0;

  const pageStyle = useMemo(
    () => ({
      position: 'relative',
      minHeight: '100vh',
      background: draftTheme?.background ? undefined : 'var(--bg) url("/background.png") center/cover fixed',
      backgroundImage: draftTheme?.background ? `url(${draftTheme.background})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: '#e2e8f0',
      overflow: 'hidden',
      padding: '28px 18px',
      fontFamily: draftTheme?.font ? `${draftTheme.font}, "Inter", sans-serif` : undefined
    }),
    [draftTheme?.background, draftTheme?.font]
  );

  const footerMeta =
    questionMeta &&
    t.footerMeta(
      questionMeta.globalIndex,
      questionMeta.globalTotal,
      categoryLabel ? categoryLabel.toUpperCase() : '?',
      questionMeta.categoryIndex,
      questionMeta.categoryTotal
    );

  const showCalculating = viewMode === 'calculating';
  const showAnswer = viewMode === 'answer';

  const cardColor = currentCategory ? categoryColors[currentCategory] ?? '#e1b75d' : '#e1b75d';
  const lobbyActiveColor =
    draftTheme?.color ||
    (viewMode === 'lobby' && categories.length > 0
      ? categoryColors[categories[highlightedCategoryIndex] as QuizCategory] ?? '#6dd5fa'
      : '#6dd5fa');
  const leftDecorationSrc =
    question && (question as any).decorationLeft
      ? DECORATION_ICONS[(question as any).decorationLeft as DecorationKey]
      : undefined;
  const rightDecorationSrc =
    question && (question as any).decorationRight
      ? DECORATION_ICONS[(question as any).decorationRight as DecorationKey]
      : undefined;

  const renderIntro = () => {
    const slide = introSlides[introIndex % introSlides.length];
    const backLabel = language === 'de' ? 'Zurueck' : 'Back';
    const nextLabel = language === 'de' ? 'Weiter' : 'Next';
    return (
      <div style={{ ...cardFrame, padding: 0 }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 1180,
            margin: '0 auto',
            borderRadius: 32,
            padding: '34px 32px',
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'linear-gradient(140deg, rgba(13,15,20,0.94), rgba(14,17,27,0.85))',
            boxShadow: '0 30px 64px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            minHeight: 360,
            transition: 'opacity 240ms ease, transform 240ms ease'
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 30% 30%, rgba(243,195,103,0.16), transparent 48%), radial-gradient(circle at 80% 15%, rgba(108,122,255,0.18), transparent 45%)',
              pointerEvents: 'none',
              opacity: 0.9
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative', zIndex: 1 }}>
            <div style={{ ...pillRule, fontSize: 12, padding: '10px 14px', background: 'rgba(243,195,103,0.16)', borderColor: 'rgba(243,195,103,0.45)', color: '#fde68a' }}>
              {slide.badge || 'Intro'}
            </div>
            <div style={{ ...pillRule, background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.16)', color: '#e2e8f0' }}>
              {introIndex + 1}/{introSlides.length}
            </div>
          </div>
          <div style={{ color: '#cbd5e1', fontSize: 18, letterSpacing: '0.02em', marginBottom: 10, position: 'relative', zIndex: 1 }}>{slide.subtitle}</div>
          <div
            style={{
              color: '#f8fafc',
              fontSize: 42,
              fontWeight: 900,
              lineHeight: 1.15,
              marginBottom: 14,
              position: 'relative',
              zIndex: 1
            }}
          >
            {slide.title}
          </div>
          <div style={{ color: '#e2e8f0', fontSize: 20, lineHeight: 1.6, maxWidth: 860, position: 'relative', zIndex: 1 }}>{slide.body}</div>
        </div>
      </div>
    );
  };

  const renderScoreboard = () => (
    <div style={cardFrame}>
      {/* TODO(DESIGN_LATER): Scoreboard styling */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          marginBottom: 16,
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}
      >
        {language === 'de' ? 'Scoreboard' : 'Scoreboard'}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {sortedScoreTeams.length === 0 && (
          <div style={{ color: '#94a3b8' }}>
            {language === 'de' ? 'Noch keine Teams' : 'No teams yet'}
          </div>
        )}
        {sortedScoreTeams.map((team, idx) => (
          <div
            key={team.id}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: 12,
              alignItems: 'center',
              padding: '10px 14px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.25)'
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 800 }}>{idx + 1}.</span>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{team.name}</span>
            <span style={{ fontSize: 20, fontWeight: 900 }}>{team.score ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
  const renderPotatoView = () => {
    if (!potato) return renderScoreboard();
    const roundTotal = potato.selectedThemes?.length ?? 0;
    const roundLabel =
      roundTotal > 0 && potato.roundIndex >= 0 ? `${potato.roundIndex + 1}/${roundTotal}` : roundTotal > 0 ? `0/${roundTotal}` : '—';
    const activeTeamName = potato.activeTeamId
      ? teams.find((t) => t.id === potato.activeTeamId)?.name || potato.activeTeamId
      : null;
    const bans = potato.bans || {};
    const banLimits = potato.banLimits || {};
    const selectedThemes = potato.selectedThemes || [];
    const lives = potato.lives || {};
    const turnOrder = potato.turnOrder.length ? potato.turnOrder : Object.keys(lives);
    const lastWinner =
      potato.lastWinnerId && teams.find((t) => t.id === potato.lastWinnerId)
        ? teams.find((t) => t.id === potato.lastWinnerId)?.name
        : potato.lastWinnerId || null;
    const infoCopy =
      language === 'de'
        ? 'Max. 5 Sekunden pro Antwort · doppelte Antworten = Strike.'
        : language === 'both'
        ? 'Max. 5 Sekunden / max. 5 seconds. Duplicate answers = strike.'
        : 'Max. 5 seconds per answer · duplicate answers = strike.';
    return (
      <div style={cardFrame}>
        <div
          style={{
            borderRadius: 32,
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'linear-gradient(140deg, rgba(13,15,20,0.94), rgba(14,17,27,0.85))',
            padding: '28px 26px',
            minHeight: 320,
            boxShadow: '0 30px 64px rgba(0,0,0,0.55)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
              flexWrap: 'wrap',
              gap: 10
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '0.06em' }}>
              {language === 'de'
                ? 'Heisse Kartoffel'
                : language === 'both'
                ? 'Heisse Kartoffel / Hot Potato'
                : 'Hot Potato'}
            </div>
            <div style={{ ...pillRule, borderColor: 'rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.12)' }}>
              Runde {roundLabel}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {potato.phase === 'BANNING' && (
              <>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {language === 'de'
                    ? 'Teams bannen noch Themen'
                    : language === 'both'
                    ? 'Teams bannen Themen / teams ban topics'
                    : 'Teams are banning topics'}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedThemes.length > 0 ? (
                    selectedThemes.map((theme, idx) => (
                      <span key={`beamer-theme-${idx}`} style={{ ...pillRule, fontSize: 14 }}>
                        {theme}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#94a3b8' }}>
                      {language === 'de' ? 'Themen werden vorbereitet.' : 'Topics will be drawn soon.'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {sortedScoreTeams.map((team) => (
                    <div
                      key={`ban-show-${team.id}`}
                      style={{
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 16,
                        padding: '10px 12px',
                        background: 'rgba(0,0,0,0.35)',
                        display: 'grid',
                        gap: 4
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{team.name}</div>
                      <div style={{ fontSize: 14, color: '#cbd5e1' }}>
                        {language === 'de' ? 'Bans' : language === 'both' ? 'Bans / Verbote' : 'Bans'} ({banLimits[team.id] ?? 0}):
                        {' '}
                        {bans[team.id]?.length ? bans[team.id].join(', ') : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {potato.phase === 'PLAYING' && (
              <>
                <div style={{ fontSize: 20, fontWeight: 800 }}>
                  {language === 'de' ? 'Thema' : language === 'both' ? 'Thema / Topic' : 'Topic'}:{' '}
                  {potato.currentTheme || '—'}
                </div>
                <div style={{ fontSize: 16, color: '#cbd5e1' }}>
                  {language === 'de'
                    ? 'Aktives Team'
                    : language === 'both'
                    ? 'Team am Zug / Active team'
                    : 'Active team'}
                  : {activeTeamName || '—'}
                </div>
                <div style={{ fontSize: 16, color: potatoCountdown !== null && potatoCountdown <= 1 ? '#f87171' : '#cbd5e1' }}>
                  {potatoCountdown !== null ? `${potatoCountdown}s · ${infoCopy}` : infoCopy}
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {turnOrder.map((teamId) => (
                    <div
                      key={`turn-${teamId}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 14,
                        border:
                          teamId === potato.activeTeamId
                            ? '1px solid rgba(251,191,36,0.45)'
                            : '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(0,0,0,0.35)'
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{teams.find((t) => t.id === teamId)?.name || teamId}</span>
                      <span style={{ fontWeight: 800 }}>{'❤'.repeat(Math.max(1, lives[teamId] ?? 0))}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>
                  {language === 'de'
                    ? `${potato.usedAnswers?.length || 0} Antworten wurden schon genannt.`
                    : language === 'both'
                    ? `${potato.usedAnswers?.length || 0} Antworten wurden genannt / answers used.`
                    : `${potato.usedAnswers?.length || 0} answers already used.`}
                </div>
              </>
            )}
            {potato.phase === 'ROUND_END' && (
              <>
                <div style={{ fontSize: 20, fontWeight: 800 }}>
                  {language === 'de'
                    ? 'Runde beendet'
                    : language === 'both'
                    ? 'Runde beendet / Round finished'
                    : 'Round finished'}
                </div>
                {lastWinner && (
                  <div style={{ fontSize: 18, color: '#bbf7d0', fontWeight: 800 }}>
                    {language === 'de' ? 'Sieger' : language === 'both' ? 'Sieger / Winner' : 'Winner'}: {lastWinner}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedThemes.map((theme, idx) => (
                    <span
                      key={`done-theme-${idx}`}
                      style={{
                        ...pillRule,
                        background: idx <= potato.roundIndex ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.08)',
                        borderColor: idx <= potato.roundIndex ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.14)'
                      }}
                    >
                      {theme}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 16, color: '#cbd5e1' }}>
                  {language === 'de'
                    ? 'Moderator startet gleich die nächste Runde.'
                    : language === 'both'
                    ? 'Moderator startet gleich / Host starts next round soon.'
                    : 'Host will start the next round soon.'}
                </div>
              </>
            )}
            {potato.phase === 'DONE' && (
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                {language === 'de'
                  ? 'Finale abgeschlossen. Awards folgen!'
                  : language === 'both'
                  ? 'Finale abgeschlossen / Final complete.'
                  : 'Final complete. Awards incoming.'}
              </div>
            )}
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              {language === 'de' ? 'Scoreboard' : 'Scoreboard'}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {sortedScoreTeams.map((team, idx) => (
                <div
                  key={`score-potato-${team.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(0,0,0,0.4)'
                  }}
                >
                  <span style={{ fontWeight: 900 }}>{idx + 1}.</span>
                  <span style={{ fontWeight: 700 }}>{team.name}</span>
                  <span style={{ fontWeight: 900 }}>{team.score ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main style={pageStyle}>
      {offlineBar(connectionStatus, language)}
      {toast && <div style={toastStyle}>{toast}</div>}
      {draftTheme?.logoUrl && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 40 }}>
          <img src={draftTheme.logoUrl} alt="Logo" style={{ maxHeight: 70, objectFit: 'contain' }} />
        </div>
      )}
      <div style={beamerAurora(lobbyActiveColor)} />
      <div style={beamerShell}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
          <span style={connectionPill(connectionStatus)}>
            {language === 'de'
              ? connectionStatus === 'connected'
                ? 'Verbunden'
                : connectionStatus === 'connecting'
                ? 'Verbinde...'
                : 'Getrennt'
              : connectionStatus === 'connected'
              ? 'Online'
              : connectionStatus === 'connecting'
              ? 'Reconnecting...'
              : 'Offline'}
            {connectionStatus === 'disconnected' && (
              <button
                style={{
                  marginLeft: 10,
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
                {language === 'de' ? 'Neu laden' : 'Reload'}
              </button>
            )}
          </span>
        </div>
        {connectionStuck && (
          <div
            style={{
              marginBottom: 8,
              padding: '8px 10px',
              borderRadius: 12,
              border: '1px solid rgba(245,158,11,0.6)',
              background: 'rgba(245,158,11,0.12)',
              color: '#fbbf24',
              fontWeight: 800
            }}
          >
            {language === 'de'
              ? 'Keine Verbindung seit >5s. Bitte WLAN/Backend prüfen. / No connection for >5s. Check Wi-Fi/backend.'
              : 'No connection for >5s. Please check Wi-Fi/backend.'}
          </div>
        )}
        {isPotatoStage ? (
          renderPotatoView()
        ) : isScoreboardState ? (
          renderScoreboard()
        ) : (
          <>
            {viewMode === 'intro' && renderIntro()}
            {viewMode === 'lobby' && (
              <BeamerLobbyView
                t={t}
                language={language}
                roomCode={roomCode}
                readyCount={readyCount}
                teamsCount={teams.length || 0}
                categories={categories}
                highlightedCategoryIndex={highlightedCategoryIndex}
                categoryColors={categoryColors}
                categoryIcons={categoryIcons}
                categoryProgress={categoryProgress}
                categoryTotals={categoryTotals}
                getCategoryLabel={getCategoryLabel}
                getCategoryDescription={getCategoryDescription}
              />
            )}

            {viewMode === 'categorySlot' && slotMeta && (
              <div style={cardFrame}>
                <BeamerSlotView
                  t={t}
                  language={language}
                  slotMeta={slotMeta}
                  categories={categories}
                  categoryColors={categoryColors}
                  categoryIcons={categoryIcons}
                  slotSequence={slotSequence}
                  slotOffset={slotOffset}
                  slotRolling={slotRolling}
                  exiting={slotExiting}
                  getCategoryLabel={getCategoryLabel}
                  getCategoryDescription={getCategoryDescription}
                  spinIntervalMs={slotIntervalMs}
                  totalSpinMs={slotSpinMs}
                  scale={slotScale}
                />
              </div>
            )}

            {(viewMode === 'question' || viewMode === 'calculating' || viewMode === 'answer') && (
              <div
                style={{
                  ...cardFrame,
                  opacity: questionFlyIn ? 0 : 1,
                  transform: questionFlyIn ? 'translateY(40px)' : 'translateY(0)',
                  transition: 'opacity 420ms ease, transform 420ms ease'
                }}
              >
                <BeamerQuestionView
                  showCalculating={showCalculating}
                  showAnswer={showAnswer}
                  categoryLabel={categoryLabel}
                  questionMeta={questionMeta}
                  timerText={timerText}
                  progress={progress}
                  hasTimer={Boolean(timerEndsAt)}
                  question={question}
                  questionText={questionText}
                  t={t}
                  solution={solution}
                  footerMeta={footerMeta}
                  cardColor={cardColor}
                  leftDecorationSrc={leftDecorationSrc}
                  rightDecorationSrc={rightDecorationSrc}
                />
              </div>
            )}
          </>
        )}
      </div>
      {lastQuestion && showLastQuestion && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            maxWidth: 340,
            padding: '12px 14px',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'rgba(15,23,42,0.92)',
            boxShadow: '0 18px 42px rgba(0,0,0,0.42)',
            backdropFilter: 'blur(8px)',
            zIndex: 40
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>Letzte Frage</div>
          <div style={{ fontWeight: 800, marginTop: 4 }}>{lastQuestion.text}</div>
          {lastQuestion.category && (
            <div style={{ color: '#cbd5e1', fontSize: 12, marginTop: 2 }}>
              Kategorie: {getCategoryLabel(lastQuestion.category as QuizCategory)}
            </div>
          )}
          <button
            style={{
              marginTop: 10,
              padding: '6px 10px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e5e7eb',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            onClick={() => setShowLastQuestion(false)}
          >
            Overlay ausblenden
          </button>
        </div>
      )}
      {lastQuestion && !showLastQuestion && (
        <button
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'rgba(0,0,0,0.65)',
            color: '#e2e8f0',
            fontWeight: 800,
            cursor: 'pointer',
            zIndex: 35
          }}
          onClick={() => setShowLastQuestion(true)}
        >
          Letzte Frage anzeigen
        </button>
      )}
    </main>
  );
};

const beamerAurora = (color: string): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  background: `radial-gradient(circle at 20% 20%, ${color}33, transparent 32%), radial-gradient(circle at 80% 0%, ${color}26, transparent 38%)`,
  filter: 'blur(8px)',
  animation: 'aurora-shift 16s ease-in-out infinite'
});

const beamerShell: React.CSSProperties = {
  position: 'relative',
  maxWidth: 1380,
  margin: '0 auto',
  padding: '0 16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12
};
const offlineBar = (status: typeof connectionStatus, lang: Lang) =>
    status === 'connected'
      ? null
      : (
          <div
            style={{
              position: 'fixed',
              top: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '8px 12px',
              borderRadius: 12,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.45)',
              color: '#fecdd3',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              zIndex: 25
            }}
          >
            {status === 'connecting'
              ? lang === 'de'
                ? 'Verbinde erneut ...'
                : 'Reconnecting ...'
              : lang === 'de'
              ? 'Offline - Bitte neu laden'
              : 'Offline - please reload'}
            {status === 'disconnected' && (
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
                {lang === 'de' ? 'Neu laden' : 'Reload'}
              </button>
            )}
          </div>
        );

const cardButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  cursor: 'pointer',
  fontWeight: 700
};

const cardFrame: React.CSSProperties = {
  position: 'relative',
  borderRadius: 24,
  border: 'none',
  background: 'transparent',
  boxShadow: 'none',
  padding: 0
};

export default BeamerView;

















