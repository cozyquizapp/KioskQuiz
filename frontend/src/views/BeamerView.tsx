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
  PotatoState,
  PotatoVerdict,
  BlitzState,
  RundlaufState
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
import { featureFlags } from '../config/features';
import { BeamerFrame, BeamerScoreboardCard } from '../components/beamer';

const usePrefersReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReduced(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);
  return prefersReduced;
};

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
const buildQrUrl = (url: string) => `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;

type FrameBaseProps = {
  scene: string;
  leftLabel: string;
  leftHint?: string;
  progressText?: string;
  progressValue?: number | null;
  timerText?: string;
};

const translations = {
  de: {
    lobbyTitle: "Gleich geht's los.",
    lobbySubtitle: 'Macht es euch gemuetlich - der Moderator legt gleich los.',
    codeLabel: 'Code',
    languageLabel: 'Sprache',
    waitingForHost: 'Warten auf Moderator ...',
    teamsInRoom: 'Teams im Raum',
    waitingForQuestion: 'Warten auf Moderator ...',
    timeLeft: (s: number) => `${s}s`,
    timeUp: 'Zeit abgelaufen',
    noTimer: 'Kein Timer aktiv',
    calculating: 'Wir rechnen die Loesung aus... Bitte einen Moment geduldig sein.',
    answerLabel: 'Antwort',
    answerFallback: 'Antwort wird eingeblendet.',
    slotTitle: 'Naechste Kategorie',
    slotHint: 'Macht euch bereit - gleich seht ihr die Frage auf dem Beamer.',
    mixedMechanic: 'Gemischte Tüte - Sondermechanik.',
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
    de: 'Treffsicher schaetzen - Naehe zaehlt.',
    en: 'Here your sense for numbers and sizes matters.'
  },
  'Mu-Cho': {
    de: 'Vier Optionen, eine Entscheidung.',
    en: 'Make the best choice between four options.'
  },
  Stimmts: {
    de: 'Drei Aussagen, nur eine ist wahr.',
    en: 'Three statements, only one is true.'
  },
  Cheese: {
    de: 'Ein Bild. Ein Blick. Eine Loesung.',
    en: 'All about the picture \u2013 look closely.'
  },
  GemischteTuete: {
    de: 'Bunte Tuete: Ranking, Praezision, Ordnung.',
    en: 'Mixed bag: rankings, precision, order.'
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
  const [lobbyHighlightIndex, setLobbyHighlightIndex] = useState(0);
  const [evaluating, setEvaluating] = useState(false);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [solution, setSolution] = useState<string | undefined>(undefined);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamStatus, setTeamStatus] = useState<StateUpdatePayload['teamStatus']>([]);
  const [questionPhase, setQuestionPhase] = useState<QuestionPhase>('answering');
  const [potato, setPotato] = useState<PotatoState | null>(null);
  const [blitz, setBlitz] = useState<BlitzState | null>(null);
  const [rundlauf, setRundlauf] = useState<RundlaufState | null>(null);
  const [blitzItemTick, setBlitzItemTick] = useState(0);
  const [blitzTick, setBlitzTick] = useState(0);
  const [answerResults, setAnswerResults] = useState<StateUpdatePayload['results'] | null>(null);
  const [potatoTick, setPotatoTick] = useState(0);
  const [potatoAttemptOverlay, setPotatoAttemptOverlay] = useState<{
    id: string;
    verdict: PotatoVerdict;
    text: string;
    teamName: string | null;
    reason?: string;
  } | null>(null);
  const [revealStamp, setRevealStamp] = useState(0);
  const [estimateDisplay, setEstimateDisplay] = useState<string | null>(null);
  const [muChoHopIndex, setMuChoHopIndex] = useState<number | null>(null);
  const [muChoLockedIndex, setMuChoLockedIndex] = useState<number | null>(null);
  const potatoOverlayTimeoutRef = useRef<number | null>(null);
  const [questionProgress, setQuestionProgress] = useState<StateUpdatePayload['questionProgress'] | null>(null);
  const [lastQuestion, setLastQuestion] = useState<{ text: string; category?: QuizCategory | string } | null>(null);
  const [showLastQuestion, setShowLastQuestion] = useState(true);
  const previousQuestionRef = useRef<AnyQuestion | null>(null);
  const previousGameStateRef = useRef<CozyGameState>('LOBBY');
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
  const [scoreboardOverlayForced, setScoreboardOverlayForced] = useState(false);
  // TODO(LEGACY): Potato ist deaktiviert; nur anzeigen, wenn Legacy-Panels aktiv sind.
  const showPotatoUI = featureFlags.showLegacyPanels;
  const [lobbyQrLocked, setLobbyQrLocked] = useState(false);
  const debugMode = useMemo(
    () =>
      featureFlags.showLegacyPanels ||
      (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'),
    []
  );
  const joinLinks = useMemo(() => {
    const effectiveRoom = roomCode || (featureFlags.singleSessionMode ? featureFlags.singleSessionRoomCode : '');
    if (!featureFlags.singleSessionMode && !effectiveRoom) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (!origin) return null;
    const normalizedOrigin = origin.replace(/\/$/, '');
    const buildPath = (path: string) =>
      featureFlags.singleSessionMode
        ? `${normalizedOrigin}${path}`
        : `${normalizedOrigin}${path}?roomCode=${effectiveRoom}`;
    return {
      team: buildPath('/team'),
      beamer: buildPath('/beamer')
    };
  }, [roomCode]);
  const teamJoinLink = joinLinks?.team ?? null;
  const teamJoinQr = teamJoinLink ? buildQrUrl(teamJoinLink) : null;
  const showTechnicalHud = !featureFlags.isCozyMode || debugMode;
  const allowLegacyOverlays = !featureFlags.isCozyMode || debugMode || featureFlags.showLegacyPanels;
  const prefersReducedMotion = usePrefersReducedMotion();

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

  useEffect(() => {
    if (!blitz?.itemDeadline) {
      setBlitzItemTick(0);
      return () => undefined;
    }
    const id = window.setInterval(() => setBlitzItemTick((tick) => tick + 1), 300);
    return () => window.clearInterval(id);
  }, [blitz?.itemDeadline]);

  useEffect(() => {
    if (!blitz?.deadline) {
      setBlitzTick(0);
      return () => undefined;
    }
    const id = window.setInterval(() => setBlitzTick((tick) => tick + 1), 400);
    return () => window.clearInterval(id);
  }, [blitz?.deadline]);

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
    if (previousGameStateRef.current !== 'Q_REVEAL' && gameState === 'Q_REVEAL') {
      setRevealStamp((stamp) => stamp + 1);
    }
    previousGameStateRef.current = gameState;
    if (gameState !== 'Q_REVEAL') {
      setEstimateDisplay(null);
      setMuChoHopIndex(null);
      setMuChoLockedIndex(null);
    }
  }, [gameState]);

  useEffect(() => {
    if (!featureFlags.isCozyMode) {
      return undefined;
    }
    if (gameState !== 'LOBBY' && gameState !== 'INTRO') {
      return undefined;
    }
    const id = window.setInterval(() => setLobbyHighlightIndex((idx) => idx + 1), 5000);
    return () => window.clearInterval(id);
  }, [gameState, featureFlags.isCozyMode]);

  useEffect(() => {
    if (!showPotatoUI || gameState !== 'POTATO') {
      setPotatoTick(0);
      return undefined;
    }
    const id = window.setInterval(() => setPotatoTick((tick) => tick + 1), 500);
    return () => window.clearInterval(id);
  }, [gameState, showPotatoUI]);

  useEffect(() => {
    if (!showPotatoUI) return;
    if (!potato?.lastAttempt || potato?.phase !== 'PLAYING') return;
    const attempt = potato.lastAttempt;
    const teamName = teams.find((team) => team.id === attempt.teamId)?.name || attempt.teamId;
    setPotatoAttemptOverlay({
      id: attempt.id,
      verdict: attempt.verdict,
      text: attempt.text,
      teamName,
      reason: attempt.reason || undefined
    });
    if (potatoOverlayTimeoutRef.current) {
      window.clearTimeout(potatoOverlayTimeoutRef.current);
    }
    potatoOverlayTimeoutRef.current = window.setTimeout(() => setPotatoAttemptOverlay(null), 1600);
  }, [potato?.lastAttempt?.id, potato?.phase, potato?.lastAttempt?.verdict, teams, showPotatoUI]);

  useEffect(() => {
    if (!showPotatoUI) return;
    if (potato?.phase === 'PLAYING') return;
    if (potatoOverlayTimeoutRef.current) {
      window.clearTimeout(potatoOverlayTimeoutRef.current);
      potatoOverlayTimeoutRef.current = null;
    }
    setPotatoAttemptOverlay(null);
  }, [potato?.phase, showPotatoUI]);

  useEffect(
    () => () => {
      if (potatoOverlayTimeoutRef.current) {
        window.clearTimeout(potatoOverlayTimeoutRef.current);
      }
    },
    []
  );

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
    if (!question || question.type !== 'SCHAETZCHEN') {
      setEstimateDisplay(null);
      return;
    }
    if (gameState !== 'Q_REVEAL') {
      setEstimateDisplay(null);
      return;
    }
    const q: any = question;
    const unit = q.unit || q.answerUnit;
    const numericTargetRaw =
      typeof q.correctValue === 'number'
        ? q.correctValue
        : typeof q.answer === 'number'
        ? q.answer
        : typeof q.solution === 'number'
        ? q.solution
        : parseFloat(q.solution);
    if (!Number.isFinite(numericTargetRaw) || prefersReducedMotion) {
      setEstimateDisplay(formatEstimateValue(numericTargetRaw || q.solution || q.answerText || '', unit));
      return;
    }
    let frameId: number;
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      if (progress >= 1) {
        setEstimateDisplay(formatEstimateValue(numericTargetRaw, unit));
        return;
      }
      const variance = Math.max(1, Math.abs(numericTargetRaw) * (1 - progress));
      const randomValue = numericTargetRaw + (Math.random() - 0.5) * variance;
      setEstimateDisplay(formatEstimateValue(randomValue, unit));
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [question?.id, question?.type, gameState, revealStamp, prefersReducedMotion, language]);

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

  useEffect(() => {
    if (gameState !== 'LOBBY' && !lobbyQrLocked) {
      setLobbyQrLocked(true);
    } else if (gameState === 'LOBBY' && lobbyQrLocked && (questionProgress?.asked ?? 0) <= 0) {
      setLobbyQrLocked(false);
    }
  }, [gameState, lobbyQrLocked, questionProgress?.asked]);

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
        if (payload.currentQuestion) {
          setAnswerResults(null);
        }
      }
      if (payload.timer) {
        setTimerEndsAt(payload.timer.endsAt ?? null);
        if (payload.timer.durationMs && payload.timer.durationMs > 0) {
          setTimerDurationMs(payload.timer.durationMs);
        } else if (payload.timer.endsAt) {
          setTimerDurationMs(payload.timer.endsAt - Date.now());
        } else {
          setTimerDurationMs(null);
        }
      }
      if (payload.potato !== undefined) {
        if (showPotatoUI) {
          setPotato(payload.potato ?? null);
        }
      }
      if (payload.blitz !== undefined) {
        setBlitz(payload.blitz ?? null);
      }
      if (payload.rundlauf !== undefined) {
        setRundlauf(payload.rundlauf ?? null);
      }
      if (payload.results !== undefined) {
        setAnswerResults(payload.results ?? null);
      }
      if (payload.questionProgress !== undefined) {
        setQuestionProgress(payload.questionProgress ?? null);
      }
      if (payload.scoreboardOverlayForced !== undefined) {
        setScoreboardOverlayForced(Boolean(payload.scoreboardOverlayForced));
      }
      if (payload.teamStatus !== undefined) {
        setTeamStatus(payload.teamStatus ?? []);
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
      setAnswerVisible(false);
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

  useEffect(() => {
    if (!showPotatoUI && potato) {
      setPotato(null);
    }
  }, [showPotatoUI, potato]);

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

  // roTüte lobby category highlights
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

  const rawViewMode: BeamerViewMode =
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
  const viewMode: BeamerViewMode =
    !featureFlags.showLegacyCategories && rawViewMode === 'categorySlot' ? 'question' : rawViewMode;

  const isScoreboardState =
    gameState === 'SCOREBOARD' || gameState === 'SCOREBOARD_PAUSE' || gameState === 'AWARDS';
  const isPotatoStage = showPotatoUI && gameState === 'POTATO' && potato;
  const derivedQuestionProgress =
    questionProgress ??
    (questionMeta
      ? { asked: questionMeta.globalIndex ?? (question ? 1 : 0), total: questionMeta.globalTotal ?? 20 }
      : { asked: question ? 1 : 0, total: 20 });
  const isBlitzStage = gameState === 'BLITZ' && blitz;
  const sortedScoreTeams = [...teams].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const teamNameLookup = useMemo(() => {
    const map: Record<string, string> = {};
    teams.forEach((t) => {
      map[t.id] = t.name;
    });
    return map;
  }, [teams]);
  const revealResultRows = useMemo(() => {
    if (!answerResults?.length) return [];
    return [...answerResults]
      .map((entry) => ({
        ...entry,
        displayName: teamNameLookup[entry.teamId] || entry.teamName || entry.teamId
      }))
      .sort((a, b) => (b.awardedPoints ?? 0) - (a.awardedPoints ?? 0));
  }, [answerResults, teamNameLookup]);
  const mcOptions = useMemo(() => {
    if (!question) return null;
    const q: any = question;
    const opts =
      language === 'en' && Array.isArray(q.optionsEn) && q.optionsEn.length ? q.optionsEn : q.options;
    return Array.isArray(opts) ? opts : null;
  }, [question?.id, language]);

  useEffect(() => {
    if (!question || question.type !== 'MU_CHO') {
      setMuChoHopIndex(null);
      setMuChoLockedIndex(null);
      return;
    }
    if (gameState !== 'Q_REVEAL') {
      setMuChoHopIndex(null);
      setMuChoLockedIndex(null);
      return;
    }
    const q: any = question;
    const totalOptions = mcOptions?.length ?? 0;
    const correctIndex =
      typeof q.correctIndex === 'number'
        ? q.correctIndex
        : typeof q.correct === 'number'
        ? q.correct
        : typeof q.correctAnswer === 'number'
        ? q.correctAnswer
        : Array.isArray(q.correctAnswers)
        ? q.correctAnswers[0]
        : null;
    if (correctIndex === null) return;
    if (prefersReducedMotion || totalOptions === 0) {
      setMuChoHopIndex(correctIndex);
      setMuChoLockedIndex(correctIndex);
      return;
    }
    const hops = Array.from({ length: 6 }, () => Math.floor(Math.random() * totalOptions));
    hops.push(correctIndex);
    let hopIdx = 0;
    const hopTimer = window.setInterval(() => {
      const nextIdx = hops[Math.min(hopIdx, hops.length - 1)];
      setMuChoHopIndex(nextIdx);
      if (hopIdx >= hops.length - 1) {
        setMuChoLockedIndex(correctIndex);
        window.clearInterval(hopTimer);
      }
      hopIdx += 1;
    }, 110);
    return () => window.clearInterval(hopTimer);
  }, [question?.id, question?.type, mcOptions?.length, gameState, revealStamp, prefersReducedMotion]);
  const mcCorrectIndex = useMemo(() => {
    if (!question || question.type !== 'MU_CHO') return null;
    const q: any = question;
    if (typeof q.correctIndex === 'number') return q.correctIndex;
    if (typeof q.correct === 'number') return q.correct;
    if (typeof q.correctAnswer === 'number') return q.correctAnswer;
    if (Array.isArray(q.correctAnswers) && typeof q.correctAnswers[0] === 'number') {
      return q.correctAnswers[0];
    }
    return null;
  }, [question?.id, question?.type]);
  const potatoCountdown = useMemo(() => {
    if (!potato?.deadline) return null;
    return Math.max(0, Math.ceil((potato.deadline - Date.now()) / 1000));
  }, [potato?.deadline, potatoTick]);
  const blitzCountdown = useMemo(() => {
    if (!blitz?.deadline) return null;
    return Math.max(0, Math.ceil((blitz.deadline - Date.now()) / 1000));
  }, [blitz?.deadline, blitzTick]);
  const blitzItemSeconds = useMemo(() => {
    if (!blitz?.itemDeadline) return null;
    return Math.max(0, Math.ceil((blitz.itemDeadline - Date.now()) / 1000));
  }, [blitz?.itemDeadline, blitzItemTick]);
  const totalQuestions = derivedQuestionProgress?.total ?? questionMeta?.globalTotal ?? 20;
  const rawRoundIndex = questionMeta?.globalIndex ?? derivedQuestionProgress?.asked ?? 0;
  const currentRoundNumber =
    gameState === 'Q_ACTIVE' || gameState === 'Q_LOCKED' || gameState === 'Q_REVEAL'
      ? questionMeta?.globalIndex ?? (rawRoundIndex > 0 ? rawRoundIndex : 1)
      : rawRoundIndex;
  const normalizedRound = Math.max(1, Math.min(totalQuestions || 20, currentRoundNumber || 1));
  const showTurnProgress =
    Boolean(
      timerDurationMs &&
        timerEndsAt &&
        (gameState === 'Q_ACTIVE' ||
          (gameState === 'BLITZ' && blitz?.phase === 'PLAYING') ||
          (showPotatoUI && gameState === 'POTATO' && potato?.phase === 'PLAYING'))
    );
  const progressValue = showTurnProgress
    ? Math.max(0, Math.min(1, remainingMs / (timerDurationMs || 1)))
    : null;
  const roundWord = language === 'en' ? 'ROUND' : 'RUNDE';
  const progressText = totalQuestions ? `${roundWord} ${normalizedRound}/${totalQuestions}` : undefined;

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
  const cozyRailOrder: QuizCategory[] = ['Cheese', 'Schaetzchen', 'Mu-Cho', 'Stimmts', 'GemischteTuete'];
  const heroCategoryKey =
    ((question?.category as QuizCategory) ??
      cozyRailOrder[(Math.abs(lobbyHighlightIndex) % cozyRailOrder.length)]) || cozyRailOrder[0];
  const cozyRailItems = cozyRailOrder.map((cat) => ({
    key: cat,
    label: getCategoryLabel(cat, language),
    description: getCategoryDescription(cat, language),
    icon: categoryIcons[cat]
  }));
  const headerLeftLabel = featureFlags.isCozyMode ? '' : 'Cozy Quiz 60';
  const headerLeftHint = undefined;
  const headerTimerText = showTurnProgress ? `${formatSeconds(remainingMs)}s` : undefined;

  const questionText =
    question && language === 'en' && (question as any)?.questionEn
      ? (question as any).questionEn.trim()
      : question?.question?.split('/')[0]?.trim() ?? question?.question;

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
      background: draftTheme?.background
        ? `url(${draftTheme.background}) center/cover fixed`
        : 'url("/background.png") center/cover fixed',
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
  const renderLobbyScene = () => {
    if (featureFlags.isCozyMode && !featureFlags.showLegacyCategories) {
      const steps =
        language === 'de'
          ? ['QR scannen oder Code eingeben.', 'Moderator waehlt Sprache & Quiz.', 'Bereit fuer Cozy Quiz 60.']
          : language === 'both'
          ? ['QR scannen / scan QR code.', 'Moderator waehlt Sprache / selects language.', 'Bereit fuer Cozy Quiz 60 / Get ready.']
          : ['Scan QR or enter the room code.', 'Host selects language & quiz.', 'Get ready for Cozy Quiz 60.'];
      const connectedInfo =
        readyCount > 0
          ? `${readyCount}/${teams.length || 0} ${language === 'de' ? 'bereit' : language === 'both' ? 'bereit / ready' : 'ready'}`
          : `${teams.length || 0} ${
              language === 'de' ? 'Teams verbunden' : language === 'both' ? 'Teams verbunden / connected' : 'teams connected'
            }`;
      const joinDisplay = teamJoinLink ? teamJoinLink.replace(/^https?:\/\//i, '') : '';
      return (
        <BeamerFrame
          scene="lobby"
          leftLabel={headerLeftLabel}
          leftHint={headerLeftHint}
          title={language === 'de' ? 'Room offen' : language === 'both' ? 'Room offen / room open' : 'Room open'}
          subtitle={
            language === 'de'
              ? 'Moderator startet gleich'
              : language === 'both'
              ? 'Moderator startet / host starts soon'
              : 'Moderator starts soon'
          }
          badgeLabel="LOBBY"
          badgeTone="muted"
          progressText={progressText}
          progressValue={progressValue}
          timerText={headerTimerText}
          footerMessage={
            language === 'de'
              ? 'Teams via QR oder Code beitreten lassen'
              : language === 'both'
              ? 'Teams via QR / Code beitreten lassen'
              : 'Let teams join via QR or code'
          }
          status="info"
          rightNode={
            teamJoinQr ? (
              <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
                <img
                  src={teamJoinQr}
                  alt="Team QR"
                  style={{ width: 160, height: 160, borderRadius: 16, border: '1px solid rgba(255,255,255,0.2)', marginBottom: 6 }}
                />
                <div>{joinDisplay}</div>
              </div>
            ) : undefined
          }
        >
          <div className="beamer-stack">
            <div className="beamer-intro-card">
              <h2>{language === 'de' ? 'Room Code' : language === 'both' ? 'Room Code / Code' : 'Room code'}</h2>
              <p style={{ fontSize: 48, fontWeight: 800 }}>{roomCode || '----'}</p>
              <p>{connectedInfo}</p>
            </div>
            <div className="beamer-list">
              {steps.map((textLine) => (
                <span key={`lobby-line-${textLine}`}>{textLine}</span>
              ))}
            </div>
            {sortedScoreTeams.length > 0 && (
              <>
                <div className="beamer-label">
                  {language === 'de'
                    ? 'Teams im Raum'
                    : language === 'both'
                    ? 'Teams im Raum / Teams in room'
                    : 'Teams in room'}
                </div>
                {renderCozyScoreboardGrid(sortedScoreTeams.slice(0, 6))}
              </>
            )}
          </div>
        </BeamerFrame>
      );
    }
    return (
      <BeamerLobbyView
        t={t}
        language={language}
        roomCode={roomCode}
        readyCount={readyCount}
        teamsCount={teams.length || 0}
        categories={featureFlags.showLegacyCategories ? categories : []}
        highlightedCategoryIndex={highlightedCategoryIndex}
        categoryColors={categoryColors}
        categoryIcons={categoryIcons}
        categoryProgress={categoryProgress}
        categoryTotals={categoryTotals}
        getCategoryLabel={getCategoryLabel}
        getCategoryDescription={getCategoryDescription}
      />
    );
  };

  const renderQuestionFrame = () => (
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
  );
  const renderCozyScoreboardGrid = (
    entries: Array<{ id: string; name: string; score?: number | null }>,
    options?: {
      highlightTop?: boolean;
      detailMap?: Record<string, string | null | undefined>;
      className?: string;
    }
  ): JSX.Element => {
    if (!entries.length) {
      return (
        <div className="beamer-intro-card">
          <h2>{language === 'de' ? 'Noch keine Teams' : 'No teams yet'}</h2>
          <p>{language === 'de' ? 'Wartet auf Beitritte.' : 'Waiting for teams to join.'}</p>
        </div>
      );
    }
    return (
      <div className={`beamer-scoreboard-grid${options?.className ? ` ${options.className}` : ''}`}>
        {entries.map((entry, idx) => (
          <BeamerScoreboardCard
            key={`cozy-score-${entry.id}-${idx}`}
            rank={idx + 1}
            name={entry.name}
            score={entry.score ?? 0}
            detail={options?.detailMap?.[entry.id] ?? null}
            highlight={Boolean(options?.highlightTop && idx < 3)}
          />
        ))}
      </div>
    );
  };

  const renderCozyIntroContent = (): JSX.Element => {
    const showQr = Boolean(teamJoinQr && ((gameState === 'LOBBY' && !lobbyQrLocked) || debugMode));
    const joinDisplay = teamJoinLink ? teamJoinLink.replace(/^https?:\/\//i, '') : '';
    const joinTitle =
      language === 'en'
        ? 'Scan to join'
        : language === 'both'
        ? 'Scannen / Scan to join'
        : 'Jetzt scannen & beitreten';
    const titleText =
      language === 'en'
        ? 'Welcome to Cozy Wolf Quiz'
        : language === 'both'
        ? 'Willkommen / Welcome'
        : 'Willkommen zum Cozy Wolf Quiz';
    const subtitleText =
      language === 'en'
        ? 'Connect your team and get ready.'
        : language === 'both'
        ? 'Teams verbinden / Connect teams'
        : 'Teams verbinden und bereit machen.';
    const statusReady = language === 'en' ? 'ready' : language === 'both' ? 'bereit / ready' : 'bereit';
    const statusOnline = language === 'en' ? 'online' : language === 'both' ? 'online / connected' : 'online';
    const sortedTeams = [...teams].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return (
      <div className="cozyLobbyShell">
        <div className="cozyLobbyHeader">
          <img src="/logo.png?v=3" alt="Cozy Wolf" />
          <div>
            <div className="cozyLobbyTitle">{titleText}</div>
            <div className="cozyLobbySubtitle">{subtitleText}</div>
          </div>
        </div>
        <div className="cozyLobbyMain">
          <div className="cozyLobbyTeams">
            <div className="cozyLobbyTeamsHeader">
              <span>Teams</span>
              <span>{teams.length || 0}</span>
            </div>
            <div className="cozyLobbyTeamsList">
              {sortedTeams.length === 0 ? (
                <div className="cozyLobbyTeamsEmpty">Noch keine Teams verbunden</div>
              ) : (
                sortedTeams.map((team) => {
                  const isReady = Boolean(team.isReady);
                  return (
                    <div className="cozyLobbyTeamRow" key={team.id}>
                      <span className={`cozyLobbyStatusDot ${isReady ? 'ready' : 'online'}`} />
                      <span className="cozyLobbyTeamName">{team.name || 'Team'}</span>
                      <span className="cozyLobbyTeamStatus">{isReady ? statusReady : statusOnline}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {showQr && teamJoinQr && (
            <div className="cozyLobbyQrPane">
              <div className="cozyLobbyQrTitle">{joinTitle}</div>
              {joinDisplay && <div className="cozyLobbyQrLink">{joinDisplay}</div>}
              <img src={teamJoinQr} alt="Team QR" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const getQuestionPromptText = (): string | undefined => {
    if (!question) return undefined;
    const q: any = question;
    if (language === 'both' && q.promptEn) {
      return `${q.prompt ?? ''}${q.promptEn ? ` / ${q.promptEn}` : ''}`;
    }
    if (language === 'en' && q.promptEn) return q.promptEn;
    if (q.prompt) return q.prompt;
    if (q.bunteTuete?.prompt) return q.bunteTuete.prompt;
    return undefined;
  };

  const formatEstimateValue = (value: number | string | null | undefined, unit?: string): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number' && Number.isFinite(value)) {
      const formatter = new Intl.NumberFormat(language === 'en' ? 'en-US' : 'de-DE', {
        maximumFractionDigits: 2
      });
      return `${formatter.format(value)}${unit ? ` ${unit}` : ''}`;
    }
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  const renderQuestionCardGrid = (): JSX.Element | null => {
    if (!question) return null;
    const q: any = question;
    const mcOptions =
      language === 'en' && Array.isArray(q.optionsEn) && q.optionsEn.length ? q.optionsEn : q.options;
    if (Array.isArray(mcOptions) && mcOptions.length) {
      return (
        <div className="beamer-grid">
          {mcOptions.map((opt: string, idx: number) => (
            <div className="beamer-card" key={`opt-${idx}`}>
              <strong>{String.fromCharCode(65 + idx)}.</strong> {opt}
            </div>
          ))}
        </div>
      );
    }
    const bunte = q.bunteTuete;
    if (bunte?.items?.length) {
      return (
        <div className="beamer-grid">
          {bunte.items.map((item: any) => (
            <div className="beamer-card" key={item.id || item.label}>
              {item.label || item.text || item.prompt || item.id}
            </div>
          ))}
        </div>
      );
    }
    if (bunte?.statements?.length) {
      return (
        <div className="beamer-grid">
          {bunte.statements.map((statement: any) => (
            <div className="beamer-card" key={statement.id}>
              <strong>{statement.id}.</strong> {statement.text}
            </div>
          ))}
        </div>
      );
    }
    if (bunte?.ladder?.length) {
      return (
        <div className="beamer-grid">
          {bunte.ladder.map((step: any) => (
            <div className="beamer-card" key={step.label}>
              <strong>{step.label}</strong>
              <span>{language === 'de' ? `${step.points} Punkte` : `${step.points} pts`}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderRevealResultsSection = (): JSX.Element | null => {
    if (!revealResultRows.length) return null;
    return (
      <div className="beamer-stack">
        <div className="beamer-label">
          {language === 'de' ? 'Teamwertung' : language === 'both' ? 'Teamwertung / Team results' : 'Team results'}
        </div>
        <div className="beamer-scoreboard-grid">
          {revealResultRows.map((entry, idx) => {
            const pointsLabel =
              typeof entry.awardedPoints === 'number'
                ? `${entry.awardedPoints >= 0 ? '+' : ''}${entry.awardedPoints}`
                : entry.awardedDetail || '';
            const detailLabel = entry.awardedDetail
              ? entry.awardedDetail
              : entry.isCorrect
              ? language === 'de'
                ? 'Richtig'
                : 'Correct'
              : language === 'de'
              ? 'Offen'
              : 'Pending';
            return (
              <BeamerScoreboardCard
                key={`result-${entry.teamId}-${idx}`}
                rank={idx + 1}
                name={entry.displayName || entry.teamId}
                score={pointsLabel}
                detail={detailLabel}
                highlight={Boolean(entry.isCorrect)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderCozyBlitzContent = (): JSX.Element | null => {
    if (!blitz) return null;
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
          return blitz.phase ?? 'IDLE';
      }
    })();
    const pool = blitz.pool ?? [];
    const bannedIds = new Set(Object.values(blitz.bans ?? {}).flat());
    const selectedThemes = blitz.selectedThemes ?? [];
    const pinnedTheme = blitz.pinnedTheme ?? null;
    const totalSets = Math.max(1, selectedThemes.length || 3);

    if (phase === 'READY' || phase === 'BANNING') {
      const headline = phase === 'READY' ? 'FOTOSPRINT BEREIT' : 'FOTOSPRINT AUSWAHL';
      const selectedIds = new Set(selectedThemes.map((entry) => entry.id));
      const randomIds = new Set(
        selectedThemes.filter((entry) => entry.id !== pinnedTheme?.id).map((entry) => entry.id)
      );
      const statusLine = selectedThemes.length
        ? selectedThemes.map((entry, idx) => `R${idx + 1}: ${entry.title}`).join(' | ')
        : null;
      return (
        <div className="beamer-stack blitz-stack">
          <div className="beamer-intro-card">
            <h2>{headline}</h2>
            <p>Platz 1 streicht 2 Themen, letzter Platz waehlt 1 Thema.</p>
          </div>
          <div className="beamer-select-grid">
            {pool.length ? (
              pool.map((theme) => {
                const isBanned = bannedIds.has(theme.id);
                const isPick = pinnedTheme?.id === theme.id;
                const isRandom = randomIds.has(theme.id);
                const badge = isPick ? 'PICK' : isRandom ? 'RANDOM' : isBanned ? 'BANNED' : '';
                return (
                  <div key={theme.id} className={`beamer-select-card${isBanned ? ' banned' : ''}`}>
                    <div className="beamer-select-title">{theme.title}</div>
                    {badge && <span className={`beamer-select-badge ${badge.toLowerCase()}`}>{badge}</span>}
                  </div>
                );
              })
            ) : (
              <div className="beamer-select-card">Keine Themen verfuegbar</div>
            )}
          </div>
          {statusLine && <div className="beamer-select-status">{statusLine}</div>}
        </div>
      );
    }

    if (phase === 'ROUND_INTRO') {
      return (
        <div className="beamer-stack blitz-stack">
          <div className="beamer-intro-card">
            <h2>FOTOSPRINT</h2>
            <p>{blitz.theme?.title || '-'}</p>
          </div>
        </div>
      );
    }

    if (phase === 'SET_END' && (blitz.setIndex ?? -1) < 0 && selectedThemes.length) {
      return (
        <div className="beamer-stack blitz-stack">
          <div className="beamer-intro-card">
            <h2>FOTOSPRINT STARTET</h2>
            <p>Die 3 Themen stehen fest.</p>
          </div>
          <div className="beamer-list">
            {selectedThemes.map((theme, idx) => (
              <span key={`blitz-selected-${theme.id}-${idx}`}>{idx + 1}. {theme.title}</span>
            ))}
          </div>
        </div>
      );
    }


    const detailMap: Record<string, string> = {};
    Object.entries(blitz.results || {}).forEach(([teamId, stats]) => {
      const awarded = stats.pointsAwarded ?? 0;
      const awardedLabel = `${awarded >= 0 ? '+' : ''}${awarded}`;
      detailMap[teamId] = `${stats.correctCount ?? 0}/5 · ${awardedLabel}`;
    });
    const submissions = blitz.submissions?.length ?? 0;
    const items = blitz.items ?? [];
    const totalItems = Math.max(1, items.length || 5);
    const maxIndex = totalItems - 1;
    const rawIndex =
      blitz.phase === 'PLAYING'
        ? typeof blitz.itemIndex === 'number' && blitz.itemIndex >= 0
          ? blitz.itemIndex
          : 0
        : maxIndex;
    const activeIndex = Math.min(maxIndex, Math.max(0, rawIndex));
    const activeItem = items[activeIndex];
    const timeline = Array.from({ length: totalItems }, (_, idx) => {
      if (blitz.phase !== 'PLAYING') return idx <= activeIndex ? 'done' : 'pending';
      if (idx < activeIndex) return 'done';
      if (idx === activeIndex) return 'current';
      return 'pending';
    });
    const setLabel = `${Math.max(1, (blitz.setIndex ?? -1) + 1)}/${totalSets}`;
    const resultsMap = blitz.results || {};
    const scoreboardReady = Object.keys(resultsMap).length > 0;
    const setFinished = blitz.phase !== 'PLAYING';
    const waitingForReveal = setFinished && !scoreboardReady;

    return (
      <div className="beamer-stack blitz-stack">
        <div className="beamer-question-main">
          <div className="beamer-question-category">
            {language === 'de'
              ? 'Blitz Battle'
              : language === 'both'
              ? 'Blitz Battle / Blitz'
              : 'Blitz Battle'}{' '}
            ? Set {setLabel}
          </div>
          <div className="beamer-question-text">{blitz.theme?.title || '-'}</div>
          <div className="beamer-list">
            <span>
              {language === 'de'
                ? `Antworten ${submissions}/${teams.length}`
                : language === 'both'
                ? `Antworten ${submissions}/${teams.length} / Submissions`
                : `Submissions ${submissions}/${teams.length}`}
            </span>
            {blitzCountdown !== null && <span className="beamer-countdown">{blitzCountdown}s</span>}
            {blitzItemSeconds !== null && blitz.phase === 'PLAYING' && (
              <span className="beamer-countdown beamer-countdown-secondary">
                {language === 'de' ? 'Item' : 'Item'} {Math.max(0, blitzItemSeconds)}s
              </span>
            )}
          </div>
        </div>

        {blitz.phase === 'PLAYING' ? (
          <>
            <div className="beamer-card blitz-current-card">
              {activeItem?.mediaUrl && (
                <img
                  src={activeItem.mediaUrl}
                  alt={activeItem.prompt || `Blitz ${activeIndex + 1}`}
                  className="blitz-current-image"
                />
              )}
              <div className="blitz-item-title">
                {activeItem?.prompt ||
                  `${language === 'de' ? 'Item' : 'Item'} ${activeIndex + 1}/${totalItems}`}
              </div>
              <div className="blitz-item-meta">
                {language === 'de' ? 'Item' : 'Item'} {activeIndex + 1}/{totalItems}
              </div>
            </div>
            <div className="blitz-timeline">
              {timeline.map((status, idx) => (
                <div key={`blitz-step-${idx}`} className={`blitz-chip ${status}`}>
                  <span>{idx + 1}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="beamer-card blitz-results-card">
            {waitingForReveal && (
              <div className="blitz-results-pending">
                {language === 'de'
                  ? 'Set abgeschlossen. Moderator zeigt gleich die Ergebnisse.'
                  : language === 'both'
                  ? 'Set abgeschlossen / Waiting for reveal.'
                  : 'Set finished. Waiting for reveal.'}
              </div>
            )}
            {scoreboardReady && (
              <>
                <div className="beamer-question-category">
                  {language === 'de' ? 'Set-Ergebnis' : language === 'both' ? 'Set-Ergebnis / Result' : 'Set result'}
                </div>
                {renderCozyScoreboardGrid(sortedScoreTeams, { highlightTop: true, detailMap })}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCozyPotatoContent = (): JSX.Element | null => {
    if (!potato) return null;
    const turnOrder = potato.turnOrder.length ? potato.turnOrder : Object.keys(potato.lives || {});
    const lives = potato.lives || {};
    const activeName = potato.activeTeamId ? teamNameLookup[potato.activeTeamId] || potato.activeTeamId : null;
    return (
      <div className="beamer-stack">
        <div className="beamer-question-main">
          <div className="beamer-question-category">
            {language === 'de' ? 'Aktuelles Thema' : language === 'both' ? 'Thema / Theme' : 'Theme'}
          </div>
          <div className="beamer-question-text">{potato.currentTheme || '-'}</div>
          <div className="beamer-list">
            {activeName && (
              <span>
                {language === 'de'
                  ? `Dran: ${activeName}`
                  : language === 'both'
                  ? `Dran / Up: ${activeName}`
                  : `Up: ${activeName}`}
              </span>
            )}
            {potatoCountdown !== null && <span className="beamer-countdown">{potatoCountdown}s</span>}
            {potato.usedAnswers && (
              <span>
                {language === 'de'
                  ? `${potato.usedAnswers.length} Antworten genannt`
                  : `${potato.usedAnswers.length} answers used`}
              </span>
            )}
          </div>
          {potato.pendingConflict && (
            <span className="beamer-conflict-badge">
              {potato.pendingConflict.type === 'duplicate'
                ? language === 'de'
                  ? 'Duplikat'
                  : 'Duplicate'
                : language === 'de'
                ? 'Konflikt'
                : 'Conflict'}
            </span>
          )}
        </div>
        <div className="beamer-grid">
          {turnOrder.map((teamId) => {
            const name = teamNameLookup[teamId] || teamId;
            const livesCount = lives[teamId] ?? 0;
            const hearts = livesCount > 0 ? `${livesCount}x` : '-';
            return (
              <div className={`beamer-card${teamId === potato.activeTeamId ? ' highlight' : ''}`} key={`life-${teamId}`}>
                <strong>{name}</strong>
                <span>{hearts}</span>
              </div>
            );
          })}
        </div>
        {potato.selectedThemes?.length ? (
          <div className="beamer-grid">
            {potato.selectedThemes.map((theme, idx) => (
              <div className="beamer-card" key={`theme-${idx}`}>
                {theme}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const renderCozyAwardsContent = (): JSX.Element => (
    <div className="beamer-stack">
      <div className="beamer-intro-card">
        <h2>{language === 'de' ? 'Siegerehrung' : language === 'both' ? 'Siegerehrung / Awards' : 'Awards'}</h2>
        <p>
          {language === 'de'
            ? 'Top Teams des Abends'
            : language === 'both'
            ? 'Top Teams des Abends / Top teams tonight'
            : 'Top teams tonight'}
        </p>
      </div>
      {renderCozyScoreboardGrid(sortedScoreTeams, { highlightTop: true })}
    </div>
  );
  const renderCozyScene = () => {
    const sceneKey = `${gameState}-${question?.id ?? 'none'}-${blitz?.phase ?? 'idle'}-${potato?.phase ?? 'idle'}-${rundlauf?.roundIndex ?? 'nr'}`;
    const baseFrameProps: FrameBaseProps = {
      scene: (gameState || 'lobby').toLowerCase(),
      leftLabel: headerLeftLabel,
      leftHint: headerLeftHint,
      progressText,
      progressValue,
      timerText: headerTimerText
    };
    const badgeInfo =
      gameState === 'BLITZ'
        ? { label: `SET ${(blitz?.setIndex ?? -1) + 1}/3`, tone: 'accent' as const }
        : gameState === 'POTATO'
        ? { label: language === 'de' ? 'Finale' : 'Final', tone: 'warning' as const }
        : gameState === 'AWARDS'
        ? { label: 'FINAL', tone: 'success' as const }
        : undefined;
    const questionTitle = `RUNDE ${normalizedRound}/${totalQuestions || 20}`;
    const questionSubtitle = undefined;
    const promptText = getQuestionPromptText();
    const mediaUrl =
      (question as any)?.media?.url ||
      (question as any)?.mediaUrl ||
      (question as any)?.imageUrl ||
      (question as any)?.image ||
      null;
    
    // Extract German text (remove anything after '/')
    const getGermanText = (text?: string): string => {
      if (!text) return '';
      return text.split('/')[0].trim();
    };
    
    // Extract English text (prioritize questionEn, fallback to after '/')
    const getEnglishText = (enText?: string, questionText?: string): string => {
      if (enText) return enText.trim();
      if (questionText) {
        const parts = questionText.split('/');
        return parts.length > 1 ? parts[1].trim() : '';
      }
      return '';
    };
    
    const germanText = getGermanText(question?.question);
    const englishText = getEnglishText(question?.questionEn, question?.question);
    
    const questionTextLocalized =
      language === 'both' && germanText && englishText
        ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <div>{germanText}</div>
              <div style={{
                width: '100%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                margin: '4px 0'
              }} />
              <div>{englishText}</div>
            </div>
          )
        : language === 'en'
        ? englishText || germanText || ''
        : germanText || englishText || '';

    const renderQuestionFrameCozy = (phase: 'active' | 'locked' | 'reveal') => {
      const promptText = getQuestionPromptText();
      const mediaUrl =
        (question as any)?.media?.url ||
        (question as any)?.mediaUrl ||
        (question as any)?.imageUrl ||
        (question as any)?.image ||
        null;

      const renderMultipleChoiceList = (showReveal: boolean) => {
        if (!mcOptions?.length) return null;
        return (
          <div className="cozyOptionList">
            {mcOptions.map((option, idx) => {
              const hopMatch = muChoLockedIndex ?? mcCorrectIndex;
              const isHop = showReveal && muChoHopIndex === idx && hopMatch !== idx;
              const isCorrect = showReveal && hopMatch === idx;
              return (
                <div
                  key={`mc-option-${idx}`}
                  className={`cozyOption${isHop ? ' hopping' : ''}${isCorrect ? ' correct' : ''}`}
                >
                  <span className="cozyOptionPrefix">{String.fromCharCode(65 + idx)}.</span>
                  <span>{option}</span>
                </div>
              );
            })}
          </div>
        );
      };

      const renderHeroBody = () => {
        if (!question) {
          return (
            <div className="cozyQuestionEmpty">
              <p>{language === 'de' ? 'Keine Frage aktiv' : 'No active question'}</p>
            </div>
          );
        }
        if (phase === 'reveal') {
          if (question.type === 'SCHAETZCHEN') {
            return (
              <div className="cozyRevealNumber">
                <span className={estimateDisplay ? 'is-ready' : ''}>
                  {estimateDisplay || solution || '—'}
                </span>
                {solution && <div className="cozyRevealLabel">{solution}</div>}
              </div>
            );
          }
          if (question.type === 'MU_CHO') {
            return renderMultipleChoiceList(true);
          }
          return (
            <div className="cozyRevealGeneric">
              {solution ||
                (language === 'de'
                  ? 'Auflösung eingeblendet'
                  : language === 'both'
                  ? 'Auflösung / Reveal'
                  : 'Solution')}
            </div>
          );
        }
        if (question.type === 'MU_CHO') {
          return renderMultipleChoiceList(false);
        }
        const supplement = renderQuestionCardGrid();
        if (supplement) {
          return <div className="cozyQuestionSupplement">{supplement}</div>;
        }
        return null;
      };

      return (
        <BeamerFrame
          key={`${sceneKey}-${phase}`}
          {...baseFrameProps}
          title={questionTitle}
          subtitle={questionSubtitle}
          badgeLabel={undefined}
          badgeTone={undefined}
          progressText={undefined}
          footerMessage={undefined}
          status={phase === 'active' ? 'active' : phase === 'locked' ? 'locked' : 'final'}
        >
          <div className="cozyQuestionGrid cozyQuestionGridSolo">
            <div className={`cozyQuestionHero${phase === 'locked' ? ' locked' : ''}`}>
              <div className="cozyQuestionHeroHeader cozyQuestionHeroHeaderSolo">
                {phase !== 'reveal' && (
                  <div className={`cozyQuestionPhaseBadge${phase === 'locked' ? ' locked' : ''}`}>
                    {phase === 'active' ? (
                      language === 'de' ? (
                        <span>Antworten offen <span className="lang-sep">·</span> Answers open</span>
                      ) : (
                        <span>Answers open <span className="lang-sep">·</span> Antworten offen</span>
                      )
                    ) : (
                      language === 'de' ? (
                        <span>🔒 Gesperrt <span className="lang-sep">·</span> Locked</span>
                      ) : (
                        <span>🔒 Locked <span className="lang-sep">·</span> Gesperrt</span>
                      )
                    )}
                  </div>
                )}
              </div>
              <div className="cozyQuestionText">{questionTextLocalized}</div>
              {promptText && <div className="cozyQuestionHint">{promptText}</div>}
              {mediaUrl && (
                <div className={`cozyQuestionMedia${phase === 'reveal' ? ' reveal' : ''}`}>
                  <img src={mediaUrl} alt="" />
                </div>
              )}
              <div className="cozyQuestionBody">{renderHeroBody()}</div>
              {phase !== 'reveal' && teamStatus?.length > 0 && (
                <div className="cozyTeamStatusBar">
                  {teamStatus.map((team) => (
                    <div key={team.id} className="cozyTeamStatusChip">
                      <span className={`cozyTeamStatusDot ${team.connected ? 'online' : 'offline'}`} />
                      <span className="cozyTeamStatusName">{team.name || 'Team'}</span>
                      <span className={`cozyTeamAnswerDot ${team.submitted ? 'submitted' : ''}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {phase === 'reveal' && renderRevealResultsSection()}
        </BeamerFrame>
      );
    };

    const renderQuestionIntroFrame = () => (
      <BeamerFrame
        key={`${sceneKey}-question-intro`}
        {...baseFrameProps}
        title=""
        subtitle=""
        badgeLabel={undefined}
        badgeTone={undefined}
        footerMessage={undefined}
        hideHeader
        status="info"
      >
        <div className="cozyQuestionIntro">
          <div className="cozyQuestionIntroTitle">
            {language === 'de' ? 'Neue Frage kommt' : language === 'both' ? 'Neue Frage / New question' : 'New question'}
          </div>
          <div className="cozyQuestionIntroSub">
            {language === 'de' ? 'Bereit machen' : language === 'both' ? 'Bereit machen / Get ready' : 'Get ready'}
          </div>
        </div>
      </BeamerFrame>
    );

    const renderScoreboardFrame = (mode: 'scoreboard' | 'pause') => (
      <BeamerFrame
        key={`${sceneKey}-${mode}`}
        {...baseFrameProps}
        title={mode === 'pause' ? 'PAUSE' : 'ZWISCHENSTAND'}
        subtitle={language === 'de' ? 'Aktuelle Punkte' : 'Current points'}
        badgeLabel={badgeInfo?.label}
        badgeTone={badgeInfo?.tone}
        footerMessage={
          mode === 'pause'
            ? language === 'de'
              ? 'Kurze Pause – gleich geht es weiter.'
              : 'Short break – back soon.'
            : language === 'de'
            ? 'Zwischenstand anzeigen'
            : 'Showing standings'
        }
        status="info"
      >
        {renderCozyScoreboardGrid(sortedScoreTeams, { highlightTop: mode === 'scoreboard' })}
      </BeamerFrame>
    );

    const renderBlitzFrame = () => {
      const blitzPhase = (() => {
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
            return blitz?.phase ?? 'IDLE';
        }
      })();
      const totalSets = Math.max(1, blitz?.selectedThemes?.length || 3);
      const setLabel = `SET ${Math.max(1, (blitz?.setIndex ?? -1) + 1)}/${totalSets}`;
      const subtitle =
        blitzPhase === 'PLAYING' || blitzPhase === 'ROUND_INTRO'
          ? blitz?.theme?.title || ''
          : blitzPhase === 'BANNING' || blitzPhase === 'READY'
          ? 'Kategorienwahl'
          : blitzPhase === 'SET_END'
          ? 'Set Ergebnis'
          : '';
      const showSetBadge = blitzPhase === 'PLAYING' || blitzPhase === 'ROUND_INTRO' || blitzPhase === 'SET_END';
      return (
        <BeamerFrame
          key={`${sceneKey}-blitz`}
          {...baseFrameProps}
          title="FOTOSPRINT"
          subtitle={subtitle}
          badgeLabel={showSetBadge ? setLabel : undefined}
          badgeTone={showSetBadge ? 'accent' : undefined}
          footerMessage={undefined}
          status={blitzPhase === 'PLAYING' ? 'active' : 'info'}
        >
          {renderCozyBlitzContent()}
        </BeamerFrame>
      );
    };

    const renderPotatoFrame = () => (
      <BeamerFrame
        key={`${sceneKey}-potato`}
        {...baseFrameProps}
        title="HEISSE KARTOFFEL"
        subtitle={language === 'de' ? 'Finale Stage' : 'Final stage'}
        badgeLabel={language === 'de' ? 'FINAL' : 'FINAL'}
        badgeTone="warning"
        footerMessage={
          potato?.phase === 'PLAYING'
            ? language === 'de'
              ? '30 Sekunden pro Antwort'
              : '30 seconds per answer'
            : language === 'de'
            ? 'Moderator entscheidet'
            : 'Host resolving'
        }
        status="active"
      >
        {renderCozyPotatoContent()}
      </BeamerFrame>
    );

    const renderRundlaufFrame = () => {
      const pool = rundlauf?.pool ?? [];
      const bans = new Set(rundlauf?.bans ?? []);
      const pinnedId = rundlauf?.pinned?.id ?? null;
      const selected = rundlauf?.selected ?? [];
      const selectedIds = new Set(selected.map((entry) => entry.id));
      const roundTotal = Math.max(1, selected.length || 3);
      const roundIndex = rundlauf?.roundIndex ?? -1;
      const roundLabel = roundIndex >= 0 ? `${roundIndex + 1}/${roundTotal}` : `0/${roundTotal}`;
      const currentCategoryTitle =
        rundlauf?.currentCategory?.title ??
        (roundIndex >= 0 ? selected[roundIndex]?.title : '') ??
        '';
      const activeTeamName = rundlauf?.activeTeamId
        ? teams.find((t) => t.id === rundlauf.activeTeamId)?.name || rundlauf.activeTeamId
        : null;
      const eliminatedSet = new Set(rundlauf?.eliminatedTeamIds ?? []);
      const eliminatedNames = (rundlauf?.eliminatedTeamIds ?? [])
        .map((id) => teams.find((t) => t.id === id)?.name || id)
        .filter(Boolean);
      const winners = (rundlauf?.roundWinners ?? []).map(
        (id) => teams.find((t) => t.id === id)?.name || id
      );

      if (gameState === 'RUNDLAUF_PAUSE') {
        return (
          <BeamerFrame
            key={`${sceneKey}-rundlauf-pause`}
            {...baseFrameProps}
            title="PAUSE"
            subtitle={language === 'de' ? 'K.O.-Rallye startet gleich' : 'Knockout relay starts soon'}
            badgeLabel="K.O.-RALLYE"
            badgeTone="accent"
            footerMessage={language === 'de' ? 'Moderator startet, sobald bereit.' : 'Host will start soon.'}
            status="info"
          >
            {renderCozyScoreboardGrid(sortedScoreTeams, { highlightTop: true })}
          </BeamerFrame>
        );
      }

      if (gameState === 'RUNDLAUF_SCOREBOARD_PRE') {
        return (
          <BeamerFrame
            key={`${sceneKey}-rundlauf-pre`}
            {...baseFrameProps}
            title="ZWISCHENSTAND"
            subtitle={language === 'de' ? 'Vor der K.O.-Rallye' : 'Before the knockout relay'}
            badgeLabel="K.O.-RALLYE"
            badgeTone="accent"
            footerMessage={language === 'de' ? 'Platzierung entscheidet die Auswahl.' : 'Standings decide picks.'}
            status="info"
          >
            {renderCozyScoreboardGrid(sortedScoreTeams, { highlightTop: true })}
          </BeamerFrame>
        );
      }

      if (gameState === 'RUNDLAUF_CATEGORY_SELECT') {
        const randomIds = new Set(
          selected.filter((entry) => entry.id !== pinnedId).map((entry) => entry.id)
        );
        const statusLine = selected.length
          ? selected.map((entry, idx) => `R${idx + 1}: ${entry.title}`).join(' | ')
          : null;
        return (
          <BeamerFrame
            key={`${sceneKey}-rundlauf-select`}
            {...baseFrameProps}
            title="K.O.-RALLYE"
            subtitle={language === 'de' ? 'Kategorienwahl' : 'Category selection'}
            badgeLabel="AUSWAHL"
            badgeTone="accent"
            footerMessage={language === 'de' ? 'Platz 1 streicht, letzter waehlt.' : 'Top bans, last picks.'}
            status="info"
          >
            <div className="beamer-stack">
              <div className="beamer-select-grid">
                {pool.map((entry) => {
                  const isBanned = bans.has(entry.id);
                  const isPick = pinnedId === entry.id;
                  const isRandom = randomIds.has(entry.id);
                  const badge = isPick ? 'PICK' : isRandom ? 'RANDOM' : isBanned ? 'BANNED' : '';
                  return (
                    <div
                      key={`rundlauf-cat-${entry.id}`}
                      className={`beamer-select-card${isBanned ? ' banned' : ''}`}
                    >
                      <div className="beamer-select-title">{entry.title}</div>
                      {badge && <span className={`beamer-select-badge ${badge.toLowerCase()}`}>{badge}</span>}
                    </div>
                  );
                })}
              </div>
              {statusLine && <div className="beamer-select-status">{statusLine}</div>}
            </div>
          </BeamerFrame>
        );
      }

      if (gameState === 'RUNDLAUF_ROUND_INTRO') {
        return (
          <BeamerFrame
            key={`${sceneKey}-rundlauf-intro`}
            {...baseFrameProps}
            title="K.O.-RALLYE"
            subtitle={currentCategoryTitle || ''}
            badgeLabel={`RUNDE ${roundLabel}`}
            badgeTone="accent"
            footerMessage={language === 'de' ? 'Gleich geht es los.' : 'Get ready.'}
            status="info"
          >
            <div className="beamer-intro-card">
              <h2>{currentCategoryTitle || 'Kategorie'}</h2>
              <p>
                {language === 'de'
                  ? 'Reihum antworten - wer nichts weiss, fliegt raus.'
                  : 'Take turns answering - pass means eliminated.'}
              </p>
            </div>
          </BeamerFrame>
        );
      }

      if (gameState === 'RUNDLAUF_PLAY') {
        const lastAttempt = rundlauf?.lastAttempt ?? null;
        const lastAttemptName = lastAttempt
          ? teams.find((t) => t.id === lastAttempt.teamId)?.name || lastAttempt.teamId
          : null;
        return (
          <BeamerFrame
            key={`${sceneKey}-rundlauf-play`}
            {...baseFrameProps}
            title="K.O.-RALLYE"
            subtitle={currentCategoryTitle || ''}
            badgeLabel={`RUNDE ${roundLabel}`}
            badgeTone="accent"
            footerMessage={language === 'de' ? 'Reihum antworten' : 'Take turns'}
            status="active"
          >
            <div className="beamer-stack">
              <div className="beamer-intro-card">
                <h2>{currentCategoryTitle || 'Kategorie'}</h2>
                <p>{activeTeamName ? `Team dran: ${activeTeamName}` : 'Team dran: ?'}</p>
                {lastAttempt && (
                  <p style={{ marginTop: 8 }}>
                    {lastAttemptName ? `${lastAttemptName}: ` : ''}
                    {lastAttempt.text || (language === 'de' ? 'Keine Eingabe' : 'No answer')}
                  </p>
                )}
              </div>
              {rundlauf?.usedAnswers?.length ? (
                <div className="beamer-grid">
                  {rundlauf.usedAnswers.slice(-12).map((answer, idx) => (
                    <div className="beamer-card" key={`rundlauf-ans-${idx}`}>
                      {answer}
                    </div>
                  ))}
                </div>
              ) : null}
              {eliminatedNames.length > 0 && (
                <div className="beamer-card" style={{ opacity: 0.8 }}>
                  <div style={{ fontWeight: 700 }}>
                    {language === 'de' ? 'Ausgeschieden:' : 'Eliminated:'}
                  </div>
                  <div style={{ marginTop: 6 }}>{eliminatedNames.join(', ')}</div>
                </div>
              )}
            </div>
          </BeamerFrame>
        );
      }

      if (gameState === 'RUNDLAUF_ROUND_END') {
        const label =
          winners.length > 0
            ? `${language === 'de' ? 'Rundensieger:' : 'Round winners:'} ${winners.join(', ')}`
            : language === 'de'
            ? 'Runde beendet'
            : 'Round finished';
        return (
          <BeamerFrame
            key={`${sceneKey}-rundlauf-end`}
            {...baseFrameProps}
            title="RUNDLAUF"
            subtitle={language === 'de' ? 'Runde beendet' : 'Round finished'}
            badgeLabel={`RUNDE ${roundLabel}`}
            badgeTone="accent"
            footerMessage={label}
            status="final"
          >
            {renderCozyScoreboardGrid(sortedScoreTeams, { highlightTop: true })}
          </BeamerFrame>
        );
      }

      if (gameState === 'RUNDLAUF_SCOREBOARD_FINAL') {
        return (
          <BeamerFrame
            key={`${sceneKey}-rundlauf-final`}
            {...baseFrameProps}
            title="ZWISCHENSTAND"
            subtitle={language === 'de' ? 'Nach der K.O.-Rallye' : 'After the knockout relay'}
            badgeLabel="K.O.-RALLYE"
            badgeTone="accent"
            footerMessage={language === 'de' ? 'Finale Punkte werden gezeigt.' : 'Final points shown.'}
            status="final"
          >
            {renderCozyScoreboardGrid(sortedScoreTeams, {
              highlightTop: true,
              className: 'rundlauf-final'
            })}
          </BeamerFrame>
        );
      }

      return (
        <BeamerFrame
          key={`${sceneKey}-rundlauf-fallback`}
          {...baseFrameProps}
          title="K.O.-RALLYE"
          subtitle={language === 'de' ? 'Warten...' : 'Waiting...'}
          badgeLabel="K.O.-RALLYE"
          badgeTone="accent"
          status="info"
        >
          {renderCozyScoreboardGrid(sortedScoreTeams, { highlightTop: true })}
        </BeamerFrame>
      );
    };

    const renderAwardsFrame = () => (
      <BeamerFrame
        key={`${sceneKey}-awards`}
        {...baseFrameProps}
        title="SIEGEREHRUNG"
        subtitle={language === 'de' ? 'Finales Ranking' : 'Final ranking'}
        badgeLabel="FINAL"
        badgeTone="success"
        footerMessage={language === 'de' ? 'Glückwunsch an alle Teams' : 'Congrats to all teams'}
        status="final"
      >
        {renderCozyAwardsContent()}
      </BeamerFrame>
    );

    switch (gameState) {
      case 'QUESTION_INTRO':
        return renderQuestionIntroFrame();
      case 'INTRO':
      case 'LOBBY':
        return (
          <BeamerFrame
            key={`${sceneKey}-intro`}
            {...baseFrameProps}
            leftLabel=""
            leftHint={undefined}
            title=""
            subtitle=""
            badgeLabel={undefined}
            badgeTone={undefined}
            progressText={undefined}
            progressValue={null}
            timerText={undefined}
            footerMessage={undefined}
            hideHeader
            status="info"
          >
            {renderCozyIntroContent()}
          </BeamerFrame>
        );
      case 'Q_ACTIVE':
        return renderQuestionFrameCozy('active');
      case 'Q_LOCKED':
        return renderQuestionFrameCozy('locked');
      case 'Q_REVEAL':
        return renderQuestionFrameCozy('reveal');
      case 'SCOREBOARD':
        return renderScoreboardFrame('scoreboard');
      case 'SCOREBOARD_PRE_BLITZ':
        return renderScoreboardFrame('scoreboard');
      case 'SCOREBOARD_PAUSE':
        return renderScoreboardFrame('pause');
      case 'BLITZ':
      case 'BLITZ_READY':
      case 'BLITZ_BANNING':
      case 'BLITZ_SET_INTRO':
      case 'BLITZ_PLAYING':
      case 'BLITZ_SET_END':
        return renderBlitzFrame();
      case 'BLITZ_SCOREBOARD':
        return renderScoreboardFrame('scoreboard');
      case 'BLITZ_PAUSE':
        return renderScoreboardFrame('pause');
      case 'RUNDLAUF_PAUSE':
      case 'RUNDLAUF_SCOREBOARD_PRE':
      case 'RUNDLAUF_CATEGORY_SELECT':
      case 'RUNDLAUF_ROUND_INTRO':
      case 'RUNDLAUF_PLAY':
      case 'RUNDLAUF_ROUND_END':
      case 'RUNDLAUF_SCOREBOARD_FINAL':
        return renderRundlaufFrame();
      case 'SIEGEREHRUNG':
        return renderAwardsFrame();
      case 'POTATO':
        return showPotatoUI ? renderPotatoFrame() : renderScoreboardFrame('pause');
      case 'AWARDS':
        return renderAwardsFrame();
      default:
        return (
          <BeamerFrame
            key={`${sceneKey}-fallback`}
            {...baseFrameProps}
            title="ZWISCHENSTAND"
            subtitle={language === 'de' ? 'Status' : 'Status'}
            badgeLabel={badgeInfo?.label}
            badgeTone={badgeInfo?.tone}
            footerMessage={language === 'de' ? 'Warten auf den nächsten Schritt' : 'Waiting for next step'}
            status="info"
          >
            {renderCozyScoreboardGrid(sortedScoreTeams, { highlightTop: true })}
          </BeamerFrame>
        );
    }
  };
  const renderPotatoView = () => {
    if (!potato) return renderScoreboard();
    const roundTotal = potato.selectedThemes?.length ?? 0;
    const roundLabel =
      roundTotal > 0 && potato.roundIndex >= 0 ? `${potato.roundIndex + 1}/${roundTotal}` : roundTotal > 0 ? `0/${roundTotal}` : '?';
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
        ? 'Max. 30 Sekunden pro Antwort – doppelte Antworten = Strike.'
        : language === 'both'
        ? 'Max. 30 Sekunden / max. 30 seconds. Duplicate answers = strike.'
        : 'Max. 30 seconds per answer – duplicate answers = strike.';
    const attemptOverlay = potato.phase === 'PLAYING' ? potatoAttemptOverlay : null;
    const overlayVerdictText = (verdict: PotatoVerdict) => {
      if (language === 'en') {
        return verdict === 'ok'
          ? 'ACCEPTED'
          : verdict === 'dup'
          ? 'DUPLICATE'
          : verdict === 'invalid'
          ? 'INVALID'
          : verdict === 'timeout'
          ? 'TIMEOUT'
          : 'CHECKING';
      }
      if (language === 'both') {
        return verdict === 'ok'
          ? 'AKZEPTIERT / ACCEPTED'
          : verdict === 'dup'
          ? 'DUPLIKAT / DUPLICATE'
          : verdict === 'invalid'
          ? 'UNGUELTIG / INVALID'
          : verdict === 'timeout'
          ? 'ZEIT / TIMEOUT'
          : 'PRUEFUNG / CHECKING';
      }
      if (verdict === 'ok') return 'AKZEPTIERT';
      if (verdict === 'dup') return 'DUPLIKAT';
      if (verdict === 'invalid') return 'UNGUELTIG';
      if (verdict === 'timeout') return 'TIMEOUT';
      return 'PRUEFUNG';
    };
    const overlayReasonText = (reason?: string) => {
      if (!reason) return null;
      if (reason === 'duplicate')
        return language === 'en' ? 'Already used' : language === 'both' ? 'Schon genannt / Already used' : 'Schon genannt';
      if (reason === 'similar')
        return language === 'en' ? 'Very similar' : language === 'both' ? 'Sehr aehnlich / Very similar' : 'Sehr aehnlich';
      if (reason === 'not-listed')
        return language === 'en' ? 'Not on list' : language === 'both' ? 'Nicht gelistet / Not on list' : 'Nicht gelistet';
      if (reason === 'timeout')
        return language === 'en' ? 'Too late' : language === 'both' ? 'Zu spaet / Too late' : 'Zu spaet';
      if (reason === 'empty')
        return language === 'en' ? 'No answer' : language === 'both' ? 'Keine Antwort / No answer' : 'Keine Antwort';
      return null;
    };
    return (
      <div style={{ position: 'relative' }}>
        {attemptOverlay && (
          <div className={`potato-attempt-overlay verdict-${attemptOverlay.verdict}`}>
            <div className="potato-attempt-team">{attemptOverlay.teamName || 'Team'}</div>
            <div className="potato-attempt-text">"{attemptOverlay.text || '?'}"</div>
            <div className="potato-attempt-meta">
              <span>{overlayVerdictText(attemptOverlay.verdict)}</span>
              {overlayReasonText(attemptOverlay.reason) && <span>{overlayReasonText(attemptOverlay.reason)}</span>}
            </div>
          </div>
        )}
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
                          {language === 'de' ? 'Bans' : language === 'both' ? 'Bans / Verbote' : 'Bans'} ({banLimits[team.id] ?? 0}):{' '}
                          {bans[team.id]?.length ? bans[team.id].join(', ') : '?'}
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
                    {potato.currentTheme || '?'}
                  </div>
                  <div style={{ fontSize: 16, color: '#cbd5e1' }}>
                    {language === 'de'
                      ? 'Aktives Team'
                      : language === 'both'
                      ? 'Team am Zug / Active team'
                      : 'Active team'}
                    : {activeTeamName || '-'}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      color: potatoCountdown !== null && potatoCountdown <= 1 ? '#f87171' : '#cbd5e1'
                    }}
                  >
                    {potatoCountdown !== null ? `${Math.max(0, potatoCountdown)}s ? ${infoCopy}` : infoCopy}
                  </div>
                  {potatoCountdown !== null && potatoCountdown <= 0 && (
                    <div
                      style={{
                        ...pillRule,
                        background: 'rgba(248,113,113,0.18)',
                        borderColor: 'rgba(248,113,113,0.4)',
                        color: '#fecaca'
                      }}
                    >
                      {language === 'de'
                        ? 'Zeit abgelaufen!'
                        : language === 'both'
                        ? 'Zeit abgelaufen / Time is up!'
                        : 'Time is up!'}
                    </div>
                  )}
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
                        <span style={{ fontWeight: 800 }}>{'?'.repeat(Math.max(1, lives[teamId] ?? 0))}</span>
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
                  {potato.usedAnswers?.length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {potato.usedAnswers.map((answer, idx) => (
                        <span
                          key={`potato-used-chip-${idx}`}
                          style={{
                            ...pillRule,
                            fontSize: 14,
                            background: 'rgba(15,23,42,0.45)',
                            borderColor: 'rgba(148,163,184,0.35)',
                            color: '#e2e8f0'
                          }}
                        >
                          {answer}
                        </span>
                      ))}
                    </div>
                  ) : null}
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
                      ? 'Moderator startet gleich die n?chste Runde.'
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

  const renderBlitzView = () => {
    const shared = renderCozyBlitzContent();
    if (!shared) return renderScoreboard();
    return <div style={cardFrame}>{shared}</div>;
  };

  return (
    <main style={pageStyle} className={featureFlags.isCozyMode ? 'cozy-beamer-shell' : undefined}>
      {showTechnicalHud && offlineBar(connectionStatus, language)}
      {toast && <div style={toastStyle}>{toast}</div>}
      {(featureFlags.showLegacyPanels || !featureFlags.isCozyMode) && draftTheme?.logoUrl && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 40 }}>
          <img src={draftTheme.logoUrl} alt="Logo" style={{ maxHeight: 70, objectFit: 'contain' }} />
        </div>
      )}
      <div style={beamerAurora(lobbyActiveColor)} />
      <div style={beamerShell}>
        {showTechnicalHud && (
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
        )}
        {showTechnicalHud && connectionStuck && (
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
        {scoreboardOverlayForced ? (
          renderScoreboard()
        ) : featureFlags.isCozyMode ? (
          renderCozyScene()
        ) : isBlitzStage ? (
          renderBlitzView()
        ) : isPotatoStage ? (
          renderPotatoView()
        ) : isScoreboardState ? (
          renderScoreboard()
        ) : (
          <>
            {viewMode === 'intro' && renderIntro()}
            {viewMode === 'lobby' && renderLobbyScene()}

            {featureFlags.showLegacyCategories && viewMode === 'categorySlot' && slotMeta && (
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

            {(viewMode === 'question' || viewMode === 'calculating' || viewMode === 'answer') && renderQuestionFrame()}
          </>
        )}
      </div>
      {allowLegacyOverlays && lastQuestion && showLastQuestion && (
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
      {allowLegacyOverlays && lastQuestion && !showLastQuestion && (
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
  background: 'transparent',
  filter: 'none',
  animation: 'none',
  display: 'none'
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


















