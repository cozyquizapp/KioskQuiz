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
// ...existing code...
import { featureFlags } from '../config/features';
import { BeamerFrame, BeamerScoreboardCard } from '../components/beamer';
import { LobbyStatsDisplay } from '../components/LobbyStatsDisplay';
import { createConfetti } from '../utils/confetti';
import { AVATARS } from '../config/avatars';
import { getAvatarSize } from '../config/avatarSizes';
import type { AvatarOption } from '../config/avatars';
import { hasStateBasedRendering, getAvatarStatePath, type AvatarState } from '../config/avatarStates';

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

const getAvatarById = (avatarId?: string) => AVATARS.find((a) => a.id === avatarId) || AVATARS[0];

const AvatarMedia: React.FC<{ avatar: AvatarOption; style?: React.CSSProperties; alt?: string }> = ({ avatar, style, alt }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !avatar.isVideo) return;
    
    let direction = 1; // 1 = forward, -1 = backward
    
    const handleTimeUpdate = () => {
      if (direction === 1 && video.currentTime >= video.duration - 0.05) {
        direction = -1;
        video.playbackRate = -1;
      } else if (direction === -1 && video.currentTime <= 0.05) {
        direction = 1;
        video.playbackRate = 1;
      }
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [avatar.id, avatar.isVideo]);
  
  if (avatar.isVideo && avatar.videoSrc) {
    return (
      <video
        ref={videoRef}
        src={avatar.videoSrc}
        autoPlay
        loop
        muted
        playsInline
        style={{ ...style, objectFit: 'cover', overflow: 'hidden' }}
      />
    );
  }
  return <img src={avatar.dataUri} alt={alt || avatar.name} style={style} />;
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
    de: 'Bunte Tüte: Ranking, Präzision, Ordnung.',
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

// Separate component for walking avatars with position tracking
const BeamerWalkingAvatar: React.FC<{
  teamId: string;
  teamName: string;
  avatar: AvatarOption;
  currentState: AvatarState;
  size: number;
  duration: number;
  walkIndex: number;
}> = ({ teamId, teamName, avatar, currentState, size, duration, walkIndex }) => {
  const [walkFrame, setWalkFrame] = useState<1 | 2>(1);
  const isStateBased = hasStateBasedRendering(avatar.id);

  useEffect(() => {
    if (!isStateBased || currentState !== 'walking') {
      setWalkFrame(1);
      return;
    }
    const frame1Ms = 340;
    const frame2Ms = 240;
    let timer = 0;
    const tick = (nextFrame: 1 | 2) => {
      setWalkFrame(nextFrame);
      const delay = nextFrame === 1 ? frame1Ms : frame2Ms;
      timer = window.setTimeout(() => tick(nextFrame === 1 ? 2 : 1), delay);
    };
    tick(1);
    return () => window.clearTimeout(timer);
  }, [isStateBased, currentState]);

  const imageSrc = isStateBased
    ? getAvatarStatePath(avatar.id, currentState, walkFrame) || avatar.svg || avatar.dataUri
    : avatar.svg || avatar.dataUri;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        width: size,
        height: size,
        animation: `beamer-walk-${walkIndex} ${duration}s linear infinite`,
        animationPlayState: currentState === 'walking' ? 'running' : 'paused',
        animationFillMode: 'both',
        pointerEvents: 'none',
        zIndex: 50
      }}
    >
      <img
        src={imageSrc}
        alt={teamName}
        loading="eager"
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
        }}
        onError={(e) => {
          console.error(`Failed to load avatar image: ${imageSrc}`, e);
          if (e.currentTarget.src !== avatar.dataUri) {
            e.currentTarget.src = avatar.dataUri;
          }
        }}
        onLoad={() => console.log(`Avatar loaded: ${imageSrc}`)}
      />
    </div>
  );
};

const BeamerView = ({ roomCode }: BeamerProps) => {
  const slotSpinMs = 2400;
  const slotHoldMs = 1200;
  const slotIntervalMs = 260;
  const slotScale = 1;
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
  const [showConfetti, setShowConfetti] = useState(false);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [solution, setSolution] = useState<string | undefined>(undefined);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamStatus, setTeamStatus] = useState<StateUpdatePayload['teamStatus']>([]);
  const [questionPhase, setQuestionPhase] = useState<QuestionPhase>('answering');

  const [blitz, setBlitz] = useState<BlitzState | null>(null);
  const [rundlauf, setRundlauf] = useState<RundlaufState | null>(null);
  const [oneOfEight, setOneOfEight] = useState<StateUpdatePayload['oneOfEight'] | null>(null);
  // Random start animation: cycle through team names before landing on the actual start team
  const [oneOfEightSpinTeamId, setOneOfEightSpinTeamId] = useState<string | null>(null);
  const [oneOfEightSpinDone, setOneOfEightSpinDone] = useState(false);
  const oneOfEightSpinRef = useRef<{ questionId: string | null; timer: number | null }>({ questionId: null, timer: null });
  const [blitzItemTick, setBlitzItemTick] = useState(0);
  const [blitzTick, setBlitzTick] = useState(0);
  const [rundlaufTick, setRundlaufTick] = useState(0);
  const [answerResults, setAnswerResults] = useState<StateUpdatePayload['results'] | null>(null);
  const [mediaIsPortrait, setMediaIsPortrait] = useState<boolean | null>(null);
  const [blitzImageIsPortrait, setBlitzImageIsPortrait] = useState<boolean | null>(null);
  // Image-reveal sequence: show image full-screen first, then slide in question after delay
  const [imageRevealDone, setImageRevealDone] = useState(true);
  const imageRevealTimerRef = useRef<number | null>(null);

  // Blitz CATEGORY_SHOWCASE animation state
  const [showcasePhase, setShowcasePhase] = useState<'POOL_ANIMATION' | 'FINAL_CARDS'>('POOL_ANIMATION');
  const [slotPositions, setSlotPositions] = useState<string[]>([]);

  // Rundlauf CATEGORY_SHOWCASE animation state
  const [rundlaufShowcasePhase, setRundlaufShowcasePhase] = useState<'POOL_ANIMATION' | 'FINAL_CARDS'>('POOL_ANIMATION');
  const [rundlaufSlotPositions, setRundlaufSlotPositions] = useState<string[]>([]);
  const rundlaufShowcaseAnimStarted = useRef(false);

  const [revealStamp, setRevealStamp] = useState(0);
  const [estimateDisplay, setEstimateDisplay] = useState<string | null>(null);
  const [muChoHopIndex, setMuChoHopIndex] = useState<number | null>(null);
  const [muChoLockedIndex, setMuChoLockedIndex] = useState<number | null>(null);

  const [questionProgress, setQuestionProgress] = useState<StateUpdatePayload['questionProgress'] | null>(null);
  const [lastQuestion, setLastQuestion] = useState<{ text: string; category?: QuizCategory | string } | null>(null);
  const [showLastQuestion, setShowLastQuestion] = useState(true);
  const previousQuestionRef = useRef<AnyQuestion | null>(null);
  const previousGameStateRef = useRef<CozyGameState>('LOBBY');
  const showcaseAnimStarted = useRef(false);
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
  const [avatarsEnabled, setAvatarsEnabled] = useState(false);

  const [lobbyQrLocked, setLobbyQrLocked] = useState(false);
  
  // Track avatar states for each team (for live emotion display)
  const [teamAvatarStates, setTeamAvatarStates] = useState<Record<string, AvatarState>>({});
  
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
  const confettiRef = useRef<ReturnType<typeof createConfetti> | null>(null);
  const prevGameStateRef = useRef<CozyGameState | null>(null);

  const categories = useMemo(() => Object.keys(categoryLabels) as QuizCategory[], []);
  const effectiveLang = language === 'both' ? 'de' : language;
  const t = language === 'both' ? translationsBoth : translations[effectiveLang];

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

  useEffect(() => { setBlitzImageIsPortrait(null); }, [blitz?.itemIndex]);

  // Image reveal: show image full-screen for 10s when a new image question appears,
  // then slide in the question card alongside it
  useEffect(() => {
    if (imageRevealTimerRef.current) window.clearTimeout(imageRevealTimerRef.current);
    const qMediaUrl =
      (question as any)?.media?.url ||
      (question as any)?.mediaUrl ||
      (question as any)?.imageUrl ||
      (question as any)?.image || null;
    if (qMediaUrl) {
      setImageRevealDone(false);
      imageRevealTimerRef.current = window.setTimeout(() => setImageRevealDone(true), 10000);
    } else {
      setImageRevealDone(true);
    }
    return () => { if (imageRevealTimerRef.current) window.clearTimeout(imageRevealTimerRef.current); };
  }, [question?.id]);

  // oneOfEight: random team picker spin animation when question starts
  useEffect(() => {
    const isOneOfEightQ = (question as any)?.bunteTuete?.kind === 'oneOfEight';
    if (!isOneOfEightQ || !oneOfEight?.activeTeamId || !oneOfEight?.turnOrder?.length) {
      setOneOfEightSpinDone(false);
      setOneOfEightSpinTeamId(null);
      if (oneOfEightSpinRef.current.timer) window.clearTimeout(oneOfEightSpinRef.current.timer);
      oneOfEightSpinRef.current.timer = null;
      return;
    }
    if (oneOfEight.usedChoiceIds.length > 0) {
      // Already in progress — no spin needed
      setOneOfEightSpinDone(true);
      return;
    }
    if (oneOfEightSpinRef.current.questionId === question?.id) return; // already ran for this question
    oneOfEightSpinRef.current.questionId = question?.id ?? null;
    setOneOfEightSpinDone(false);

    const order = oneOfEight.turnOrder;
    let step = 0;
    const totalSteps = 14;
    const finalTeamId = oneOfEight.activeTeamId;
    const spin = () => {
      const delay = step < 8 ? 120 : step < 12 ? 200 : 340;
      oneOfEightSpinRef.current.timer = window.setTimeout(() => {
        const idx = step % order.length;
        setOneOfEightSpinTeamId(order[idx]);
        step += 1;
        if (step < totalSteps) {
          spin();
        } else {
          setOneOfEightSpinTeamId(finalTeamId);
          setOneOfEightSpinDone(true);
        }
      }, delay);
    };
    spin();
    return () => { if (oneOfEightSpinRef.current.timer) window.clearTimeout(oneOfEightSpinRef.current.timer); };
  }, [question?.id, oneOfEight?.activeTeamId]);

  useEffect(() => {
    if (!blitz?.deadline) {
      setBlitzTick(0);
      return () => undefined;
    }
    const id = window.setInterval(() => setBlitzTick((tick) => tick + 1), 400);
    return () => window.clearInterval(id);
  }, [blitz?.deadline]);

  useEffect(() => {
    if (!rundlauf?.deadline) {
      setRundlaufTick(0);
      return () => undefined;
    }
    const id = window.setInterval(() => setRundlaufTick((tick) => tick + 1), 400);
    return () => window.clearInterval(id);
  }, [rundlauf?.deadline]);

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
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), 1600);
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

  // Blitz CATEGORY_SHOWCASE animation effect
  useEffect(() => {
    if (gameState !== 'BLITZ_CATEGORY_SHOWCASE' || !blitz) {
      // Reset when leaving CATEGORY_SHOWCASE
      setShowcasePhase('POOL_ANIMATION');
      setSlotPositions([]);
      showcaseAnimStarted.current = false;
      return undefined;
    }

    // Guard: only start animation once per CATEGORY_SHOWCASE entry
    // (blitz object reference changes on every broadcastState, causing resets)
    if (showcaseAnimStarted.current) return undefined;
    showcaseAnimStarted.current = true;

    const pool = blitz.pool ?? [];
    const selectedThemes = blitz.selectedThemes ?? [];
    const bannedIds = new Set(Object.values(blitz.bans ?? {}).flat());
    const pickedTheme = selectedThemes[0];
    const randomThemes = selectedThemes.slice(1, 3);
    const allAvailable = pool.filter(t => !bannedIds.has(t.id) && t.id !== pickedTheme?.id);

    if (allAvailable.length < 2) {
      return undefined;
    }

    // Initialize with random positions
    const shuffled = [...allAvailable].sort(() => Math.random() - 0.5);
    setSlotPositions([shuffled[0]?.id || '', shuffled[1]?.id || '']);

    // Animate slot positions - 300ms per jump
    const slotInterval = setInterval(() => {
      const newShuffled = [...allAvailable].sort(() => Math.random() - 0.5);
      setSlotPositions([newShuffled[0]?.id || '', newShuffled[1]?.id || '']);
    }, 300);

    // After 2.8s, stop slots and show final picks
    const finalizeTimeout = setTimeout(() => {
      clearInterval(slotInterval);
      setSlotPositions([randomThemes[0]?.id || '', randomThemes[1]?.id || '']);
    }, 2800);

    // After 3.8s, transition to final cards (1s pause to see final picks in pool)
    const transitionTimeout = setTimeout(() => {
      setShowcasePhase('FINAL_CARDS');
    }, 3800);

    return () => {
      clearInterval(slotInterval);
      clearTimeout(finalizeTimeout);
      clearTimeout(transitionTimeout);
    };
  }, [gameState, blitz]);

  // Rundlauf CATEGORY_SHOWCASE animation effect
  useEffect(() => {
    if (gameState !== 'RUNDLAUF_CATEGORY_SHOWCASE' || !rundlauf) {
      setRundlaufShowcasePhase('POOL_ANIMATION');
      setRundlaufSlotPositions([]);
      rundlaufShowcaseAnimStarted.current = false;
      return undefined;
    }

    if (rundlaufShowcaseAnimStarted.current) return undefined;
    rundlaufShowcaseAnimStarted.current = true;

    const pool = rundlauf.pool ?? [];
    const selected = rundlauf.selected ?? [];
    const bannedIds = new Set(rundlauf.bans ?? []);
    const pinnedId = rundlauf.pinned?.id ?? null;
    const randomCategories = selected.filter(s => s.id !== pinnedId);
    const allAvailable = pool.filter(t => !bannedIds.has(t.id) && t.id !== pinnedId);

    if (allAvailable.length < 2) {
      setRundlaufShowcasePhase('FINAL_CARDS');
      return undefined;
    }

    // Initialize with random positions
    const shuffled = [...allAvailable].sort(() => Math.random() - 0.5);
    setRundlaufSlotPositions([shuffled[0]?.id || '', shuffled[1]?.id || '']);

    // Animate slot positions - 300ms per jump
    const slotInterval = setInterval(() => {
      const newShuffled = [...allAvailable].sort(() => Math.random() - 0.5);
      setRundlaufSlotPositions([newShuffled[0]?.id || '', newShuffled[1]?.id || '']);
    }, 300);

    // After 2.8s, stop slots and show final picks
    const finalizeTimeout = setTimeout(() => {
      clearInterval(slotInterval);
      setRundlaufSlotPositions([randomCategories[0]?.id || '', randomCategories[1]?.id || '']);
    }, 2800);

    // After 3.8s, transition to final cards
    const transitionTimeout = setTimeout(() => {
      setRundlaufShowcasePhase('FINAL_CARDS');
    }, 3800);

    return () => {
      clearInterval(slotInterval);
      clearTimeout(finalizeTimeout);
      clearTimeout(transitionTimeout);
    };
  }, [gameState, rundlauf]);






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
      console.log('📊 stateUpdate:', { state: payload.state, hasScores: !!payload.scores?.length, scoreCnt: payload.scores?.length });
      setGameState(payload.state);
      setScreen(mapStateToScreenState(payload.state));
      if (payload.scores?.length) {
        console.log('📊 Updating teams from scores:', payload.scores);
        setTeams(
          payload.scores.map((entry) => ({
            id: entry.id,
            name: entry.name,
            score: entry.score,
            avatarId: entry.avatarId
          }))
        );
      }
      // Don't clear teams in LOBBY state, they come from teamsReady event
      // Only update from scores when there are actual scores
      
      if (payload.currentQuestion !== undefined) {
        setQuestion(payload.currentQuestion);
        if (payload.currentQuestion) {
          setAnswerResults(null);
          setMediaIsPortrait(null);
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

      if (payload.blitz !== undefined) {
        setBlitz(payload.blitz ?? null);
      }
      if (payload.rundlauf !== undefined) {
        setRundlauf(payload.rundlauf ?? null);
      }
      if (payload.oneOfEight !== undefined) {
        setOneOfEight(payload.oneOfEight ?? null);
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
      if (payload.avatarsEnabled !== undefined) {
        setAvatarsEnabled(payload.avatarsEnabled !== false);
      }
      if (payload.teamStatus !== undefined) {
        setTeamStatus(payload.teamStatus ?? []);
      }
    };
    socket.on('server:stateUpdate', onStateUpdate);

    // Listen for avatar state changes from teams
    const onAvatarStateChanged = (payload: { teamId: string; state: AvatarState; timestamp: number }) => {
      const { teamId, state } = payload;
      setTeamAvatarStates(prev => ({ ...prev, [teamId]: state }));
      
      // Auto-reset to walking after animation sequence completes
      if (state === 'gesture') {
        console.log('🎨 Beamer: Avatar state changed', { teamId, state });
        // After happy state completes, return to walking
        setTimeout(() => {
          setTeamAvatarStates(prev => {
            if (prev[teamId] === 'happy' || prev[teamId] === 'gesture') {
              console.log('🎨 Beamer: Resetting to walking', { teamId });
              return { ...prev, [teamId]: 'walking' };
            }
            return prev;
          });
        }, 2200); // gesture + happy sequence buffer
      }
    };
    socket.on('team:avatarStateChanged', onAvatarStateChanged);

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
      console.log('📍 teamsReady event received:', tTeams);
      setTeams(tTeams ?? []);
    });

    return () => {
      socket.off('server:stateUpdate', onStateUpdate);
      socket.off('team:avatarStateChanged', onAvatarStateChanged);
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

  // Confetti effect for awards
  useEffect(() => {
    if (gameState === 'SIEGEREHRUNG' && prevGameStateRef.current !== 'SIEGEREHRUNG') {
      if (!confettiRef.current && typeof document !== 'undefined') {
        confettiRef.current = createConfetti(document.body);
      }
      setTimeout(() => {
        confettiRef.current?.explosion(300);
        setTimeout(() => confettiRef.current?.rain(4000), 500);
      }, 300);
    }
    if (gameState === 'RUNDLAUF_SCOREBOARD_FINAL' && prevGameStateRef.current !== 'RUNDLAUF_SCOREBOARD_FINAL') {
      if (!confettiRef.current && typeof document !== 'undefined') {
        confettiRef.current = createConfetti(document.body);
      }
      setTimeout(() => {
        confettiRef.current?.explosion(200);
        setTimeout(() => confettiRef.current?.rain(3000), 400);
      }, 200);
    }
    prevGameStateRef.current = gameState;
  }, [gameState]);

  // Cleanup confetti on unmount
  useEffect(() => {
    return () => {
      if (confettiRef.current) {
        confettiRef.current.destroy();
        confettiRef.current = null;
      }
    };
  }, []);

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

  const showChoiceAvatars = gameState === 'Q_REVEAL';
  const choiceAvatars = useMemo(() => {
    if (!question || !showChoiceAvatars) return [] as Array<string[]>;
    const q: any = question;
    const isMultipleChoice = question.mechanic === 'multipleChoice' || question.type === 'MU_CHO';
    const isTrueFalse = question.mechanic === 'trueFalse' || (question as any).type === 'TRUE_FALSE';
    const opts = isMultipleChoice
      ? (language === 'en' && Array.isArray(q.optionsEn) && q.optionsEn.length ? q.optionsEn : q.options)
      : isTrueFalse
      ? ['true', 'false']
      : null;
    if (!Array.isArray(opts) || opts.length === 0) return [] as Array<string[]>;
    const buckets: Array<string[]> = Array.from({ length: opts.length }, () => []);
    const normalizeChoiceIndex = (answer: any): number | null => {
      if (answer === null || answer === undefined) return null;
      if (typeof answer === 'number' && Number.isFinite(answer)) return answer;
      if (typeof answer === 'boolean') return answer ? 0 : 1;
      if (typeof answer === 'string') {
        const trimmed = answer.trim();
        if (/^[A-Z]$/.test(trimmed)) {
          return trimmed.charCodeAt(0) - 65;
        }
        if (trimmed === 'true') return 0;
        if (trimmed === 'false') return 1;
        const idx = opts.findIndex((opt: string) => String(opt).trim() === trimmed);
        return idx >= 0 ? idx : null;
      }
      return null;
    };
    (teamStatus || [])
      .filter((team) => team.answer !== undefined)
      .forEach((team) => {
        const idx = normalizeChoiceIndex(team.answer);
        if (idx !== null && idx >= 0 && idx < buckets.length) {
          buckets[idx].push(team.avatarId || '');
        }
      });
    return buckets;
  }, [question?.id, question?.type, question?.mechanic, teamStatus, language, showChoiceAvatars]);

  const bunteChoiceAvatars = useMemo(() => {
    if (!question || !showChoiceAvatars) return {} as Record<string, string[]>;
    const q: any = question;
    const payload = q.bunteTuete as { kind?: string; statements?: Array<{ id: string }> } | undefined;
    if (!payload || payload.kind !== 'oneOfEight' || !Array.isArray(payload.statements)) {
      return {} as Record<string, string[]>;
    }
    const buckets: Record<string, string[]> = {};
    payload.statements.forEach((statement) => {
      buckets[String(statement.id)] = [];
    });
    (teamStatus || [])
      .filter((team) => team.answer && typeof team.answer === 'object' && team.answer.kind === 'oneOfEight')
      .forEach((team) => {
        const choiceId = String(team.answer.choiceId ?? '').trim();
        if (!choiceId || !buckets[choiceId]) return;
        buckets[choiceId].push(team.avatarId || '');
      });
    return buckets;
  }, [question?.id, teamStatus, showChoiceAvatars]);

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

  const blitzCountdown = useMemo(() => {
    if (!blitz?.deadline) return null;
    return Math.max(0, Math.ceil((blitz.deadline - Date.now()) / 1000));
  }, [blitz?.deadline, blitzTick]);
  const blitzItemSeconds = useMemo(() => {
    if (!blitz?.itemDeadline) return null;
    return Math.max(0, Math.ceil((blitz.itemDeadline - Date.now()) / 1000));
  }, [blitz?.itemDeadline, blitzItemTick]);
  const rundlaufCountdown = useMemo(() => {
    if (!rundlauf?.deadline) return null;
    return Math.max(0, Math.ceil((rundlauf.deadline - Date.now()) / 1000));
  }, [rundlauf?.deadline, rundlaufTick]);
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
          (gameState === 'BLITZ' && blitz?.phase === 'PLAYING'))
    );
  const progressValue = showTurnProgress
    ? Math.max(0, Math.min(1, remainingMs / (timerDurationMs || 1)))
    : null;
  const roundWord = language === 'en' ? 'ROUND' : 'RUNDE';
  const progressText = totalQuestions ? `${roundWord} ${normalizedRound}/${totalQuestions}` : undefined;

  const activeCategory = categories[highlightedCategoryIndex] ?? categories[0];
  const readyCount = teams.filter((tTeam) => tTeam.isReady).length;

  const currentCategory = question?.category ?? slotMeta?.categoryId;
  const accentColor = (currentCategory && categoryColors[currentCategory as QuizCategory]) || '#9fbfd3';
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

  const pageStyle = useMemo<React.CSSProperties>(
    () => ({
      position: 'relative',
      height: '100vh',
      boxSizing: 'border-box',
      background: 'var(--bg)',
      backgroundSize: '200% 200%',
      animation: 'ambient-shift 28s ease-in-out infinite',
      color: '#e2e8f0',
      overflow: 'hidden',
      padding: '20px 18px',
      fontFamily: 'var(--font)',
      display: 'flex',
      flexDirection: 'column',
    }),
    []
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
            transition: 'opacity 350ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)'
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
        <>
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
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-game)', fontWeight: 700 }}>
                  <img
                    src={teamJoinQr}
                    alt="Team QR"
                    style={{ width: 180, height: 180, borderRadius: 12, border: '3px solid #111827', background: '#fff', padding: 6, marginBottom: 6, display: 'block' }}
                  />
                  <div style={{ fontSize: 16, color: '#111827', letterSpacing: '0.04em' }}>{joinDisplay}</div>
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
            </div>
          </BeamerFrame>
          <LobbyStatsDisplay roomCode={roomCode} language={language} />
        </>
      );
    }
    return (
      <>
        <BeamerLobbyView
          t={t}
          language={language}
          categories={featureFlags.showLegacyCategories ? categories : []}
          highlightedCategoryIndex={highlightedCategoryIndex}
          categoryColors={categoryColors}
          categoryIcons={categoryIcons}
          categoryProgress={categoryProgress}
          categoryTotals={categoryTotals}
          getCategoryLabel={getCategoryLabel}
          getCategoryDescription={getCategoryDescription}
        />
      <LobbyStatsDisplay roomCode={roomCode} language={language} />
      </>
    );
  };

  const renderQuestionFrame = () => (
    <div
      style={{
        ...cardFrame,
        opacity: questionFlyIn ? 0 : 1,
        transform: questionFlyIn ? 'translateY(40px)' : 'translateY(0)',
        transition: 'opacity 500ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)'
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
    entries: Array<{ id: string; name: string; score?: number | null; avatarId?: string }>,
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
    const maxScore = entries.reduce((max, e) => Math.max(max, e.score ?? 0), 0);
    return (
      <div className={`beamer-scoreboard-grid${options?.className ? ` ${options.className}` : ''}`}>
        {entries.map((entry, idx) => {
          const avatar = getAvatarById(entry.avatarId);
          return (
          <BeamerScoreboardCard
            key={`cozy-score-${entry.id}-${idx}`}
            rank={idx + 1}
            name={entry.name}
            avatarSrc={avatarsEnabled ? avatar?.dataUri : null}
            score={entry.score ?? 0}
            detail={options?.detailMap?.[entry.id] ?? null}
            highlight={Boolean(options?.highlightTop && idx < 3)}
            maxScore={maxScore}
          />
        );
        })}
      </div>
    );
  };

  const renderCozyIntroContent = (): JSX.Element => {
    const showQr = Boolean(teamJoinQr && ((gameState === 'LOBBY' && !lobbyQrLocked) || debugMode));
    const joinDisplay = teamJoinLink ? teamJoinLink.replace(/^https?:\/\//i, '') : '';
    const joinTitle =
      language === 'en'
        ? '📱 Scan to join'
        : language === 'both'
        ? '📱 Scannen / Scan to join'
        : '📱 Jetzt scannen & beitreten';
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
                <div className="cozyLobbyTeamsEmpty">
                  Schnapp dir dein Handy 📱<br />und tritt dem Quiz bei
                </div>
              ) : (
                sortedTeams.map((team) => {
                  const avatar = getAvatarById(team.avatarId);
                  return (
                    <div className="cozyLobbyTeamRow" key={team.id}>
                      <span className="cozyLobbyStatusDot online" />
                      {avatarsEnabled && avatar && (
                        <AvatarMedia
                          avatar={avatar}
                          style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)' }}
                        />
                      )}
                      <span className="cozyLobbyTeamName">{team.name || 'Team'}</span>
                      <span className="cozyLobbyTeamStatus">{statusOnline}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {showQr && teamJoinQr && (
            <div className="cozyLobbyQrPane" style={{ position: 'relative', overflow: 'visible' }}>
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
    const dePrompt = q.prompt || q.bunteTuete?.prompt || '';
    const enPrompt = q.promptEn || q.bunteTuete?.promptEn || '';
    if (language === 'both') {
      if (dePrompt && enPrompt) return `${dePrompt} / ${enPrompt}`;
      return dePrompt || enPrompt || undefined;
    }
    if (language === 'en') return enPrompt || dePrompt || undefined;
    return dePrompt || undefined;
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
          {mcOptions.map((opt: string, idx: number) => {
            const avatars = choiceAvatars?.[idx] || [];
            return (
              <div className="beamer-card" key={`opt-${idx}`} style={{ position: 'relative', paddingBottom: 34 }}>
                <strong>{String.fromCharCode(65 + idx)}.</strong> {opt}
                {showChoiceAvatars && avatars.length > 0 && (
                  <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {avatars.map((avatarId, avatarIdx) => {
                      const avatar = getAvatarById(avatarId);
                      return avatar ? (
                        <AvatarMedia
                          key={`${avatarId}-${avatarIdx}`}
                          avatar={avatar}
                          style={{ width: 22, height: 22, borderRadius: 7, border: '1px solid rgba(255,255,255,0.2)' }}
                        />
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    if (q?.mechanic === 'trueFalse' || q?.type === 'TRUE_FALSE') {
      const labels = [language === 'de' ? 'Wahr' : 'True', language === 'de' ? 'Falsch' : 'False'];
      return (
        <div className="beamer-grid">
          {labels.map((label, idx) => {
            const avatars = choiceAvatars?.[idx] || [];
            return (
              <div className="beamer-card" key={`tf-${idx}`} style={{ position: 'relative', paddingBottom: 34 }}>
                <strong>{idx === 0 ? 'A' : 'B'}.</strong> {label}
                {showChoiceAvatars && avatars.length > 0 && (
                  <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {avatars.map((avatarId, avatarIdx) => {
                      const avatar = getAvatarById(avatarId);
                      return avatar ? (
                        <AvatarMedia
                          key={`${avatarId}-${avatarIdx}`}
                          avatar={avatar}
                          style={{ width: 22, height: 22, borderRadius: 7, border: '1px solid rgba(255,255,255,0.2)' }}
                        />
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    const bunte = q.bunteTuete;
    if (bunte?.items?.length && bunte.kind !== 'top5') {
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
    if (bunte?.statements?.length && bunte?.kind === 'oneOfEight') {
      const usedIds = new Set((oneOfEight?.usedChoiceIds ?? []).map((id: string) => id.toLowerCase()));
      const displayTeamId = oneOfEightSpinDone ? oneOfEight?.activeTeamId : oneOfEightSpinTeamId;
      const displayTeamName = displayTeamId
        ? (teamStatus?.find((t) => t.id === displayTeamId)?.name ?? displayTeamId)
        : null;
      const spinning = !oneOfEightSpinDone && !!oneOfEightSpinTeamId;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
          {/* Active team banner */}
          {displayTeamName && !oneOfEight?.finished && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '10px 20px',
              borderRadius: 16,
              background: spinning ? '#374151' : '#111827',
              color: '#f9fafb',
              fontFamily: 'var(--font-game)',
              fontWeight: 800,
              fontSize: 'clamp(18px, 2.2vw, 28px)',
              letterSpacing: '0.04em',
              transition: 'background 0.2s',
              boxShadow: '0 3px 0 #374151'
            }}>
              <span style={{ opacity: 0.6, fontSize: '0.75em' }}>{language === 'de' ? 'Am Zug:' : 'Up:'}</span>
              <span style={{
                animation: spinning ? 'beamerFade 0.15s ease' : 'none',
                display: 'inline-block'
              }}>{displayTeamName}</span>
            </div>
          )}
          <div className="beamer-grid">
            {bunte.statements.map((statement: any) => {
              const isUsed = usedIds.has(String(statement.id).toLowerCase());
              return (
                <div
                  key={statement.id}
                  className="beamer-card"
                  style={{
                    position: 'relative',
                    paddingBottom: 34,
                    opacity: isUsed ? 0.35 : 1,
                    transition: 'opacity 0.4s ease',
                    textDecoration: isUsed ? 'line-through' : 'none'
                  }}
                >
                  <strong>{statement.id}.</strong> {statement.text}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    if (bunte?.statements?.length) {
      return (
        <div className="beamer-grid">
          {bunte.statements.map((statement: any) => (
            <div className="beamer-card" key={statement.id} style={{ position: 'relative', paddingBottom: 34 }}>
              <strong>{statement.id}.</strong> {statement.text}
              {showChoiceAvatars && bunteChoiceAvatars[String(statement.id)]?.length ? (
                <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {bunteChoiceAvatars[String(statement.id)].map((avatarId, avatarIdx) => {
                    const avatar = getAvatarById(avatarId);
                    return avatar ? (
                      <AvatarMedia
                        key={`${avatarId}-${avatarIdx}`}
                        avatar={avatar}
                        style={{ width: 22, height: 22, borderRadius: 7, border: '1px solid rgba(255,255,255,0.2)' }}
                      />
                    ) : null;
                  })}
                </div>
              ) : null}
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

  const renderTop5Confetti = (): JSX.Element | null => {
    if (!showConfetti) return null;
    return (
      <div className="confetti-overlay" aria-hidden>
        {[...Array(30)].map((_, i) => {
          const left = Math.round((i / 30) * 100);
          const delay = (i % 10) * 80;
          const size = 6 + (i % 4);
          const hueShift = (i * 17) % 360;
          return (
            <span
              key={`confetti-${revealStamp}-${i}`}
              className="confetti-piece"
              style={{ left: `${left}%`, animationDelay: `${delay}ms`, width: size, height: size, background: accentColor, filter: `hue-rotate(${hueShift}deg)` }}
            />
          );
        })}
      </div>
    );
  };

  const formatTeamAnswer = (answer: any): string => {
    if (!question || answer === null || answer === undefined) return '-';
    
    if (question.mechanic === 'multipleChoice') {
      const q = question as any;
      const opts = q.options || [];
      const num = typeof answer === 'number' ? answer : typeof answer === 'string' && answer.trim() !== '' && !Number.isNaN(Number(answer)) ? Number(answer) : null;
      if (num !== null && num >= 0 && num < opts.length) {
        const letter = String.fromCharCode(65 + num);
        return `${letter} – ${opts[num]}`;
      }
    }
    
    if (question.mechanic === 'trueFalse') {
      if (answer === true || answer === 'true') return language === 'de' ? 'Wahr' : 'True';
      if (answer === false || answer === 'false') return language === 'de' ? 'Falsch' : 'False';
    }
    
    if (typeof answer === 'string') return answer;
    if (typeof answer === 'number') return String(answer);
    if (Array.isArray(answer)) return answer.join(', ');
    if (typeof answer === 'object' && 'order' in answer && Array.isArray(answer.order)) {
      return answer.order.join(' → ');
    }
    return JSON.stringify(answer);
  };

  const renderTeamAnswersSection = (): JSX.Element | null => {
    // Use answerResults if available (phase=reveal with full evaluation)
    if (answerResults?.length) {
      return (
        <div className="beamer-stack">
          <div className="beamer-label">
            {language === 'de' ? 'Team-Antworten' : language === 'both' ? 'Team-Antworten / Team answers' : 'Team answers'}
          </div>
          <div className="beamer-scoreboard-grid">
            {answerResults.map((entry, idx) => {
              const answerText = (() => {
                if (entry.answer === null || entry.answer === undefined) return '-';
                if (typeof entry.answer === 'string') return entry.answer;
                if (typeof entry.answer === 'number') return String(entry.answer);
                if (Array.isArray(entry.answer)) return entry.answer.join(', ');
                if (typeof entry.answer === 'object') {
                  if ('order' in entry.answer && Array.isArray(entry.answer.order)) {
                    return entry.answer.order.join(' → ');
                  }
                  return JSON.stringify(entry.answer);
                }
                return String(entry.answer);
              })();
              const isCorrect = entry.isCorrect === true;
              const backgroundColor = isCorrect 
                ? 'rgba(34,197,94,0.12)' 
                : entry.isCorrect === false
                ? 'rgba(239,68,68,0.12)'
                : 'rgba(107,114,128,0.12)';
              const borderColor = isCorrect 
                ? 'rgba(34,197,94,0.3)' 
                : entry.isCorrect === false
                ? 'rgba(239,68,68,0.3)'
                : 'rgba(107,114,128,0.3)';
              return (
                <div
                  key={`team-answer-${entry.teamId}-${idx}`}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    background: backgroundColor,
                    color: '#e2e8f0',
                    willChange: 'transform, opacity',
                    animation: `${isCorrect ? 'correctGlow 0.8s ease-out, ' : ''}beamerRevealItem 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)`,
                    animationDelay: `${idx * 80}ms`,
                    animationFillMode: 'backwards'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <strong>{entry.teamName || entry.teamId}</strong>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, wordBreak: 'break-word' }}>
                        {answerText}
                      </div>
                    </div>
                    <div>
                      {isCorrect && <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span>}
                      {entry.isCorrect === false && <span style={{ color: '#ef4444', fontWeight: 700 }}>✗</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    
    // Otherwise, show answers from teamStatus during evaluation phase
    const teamsWithAnswers = teamStatus?.filter(t => t.answer !== undefined) || [];
    if (!teamsWithAnswers.length) return null;
    
    return (
      <div className="beamer-stack">
        <div className="beamer-label">
          {language === 'de' ? 'Team-Antworten' : language === 'both' ? 'Team-Antworten / Team answers' : 'Team answers'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }} className="stagger-container">
          {teamsWithAnswers.map((team, idx) => {
            const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#10b981', '#f87171', '#60a5fa'];
            const accentColor = colors[idx % colors.length];
            const answerText = formatTeamAnswer(team.answer);
            return (
              <div
                key={`team-answer-${team.id}-${idx}`}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: `1px solid ${accentColor}44`,
                  borderLeft: `4px solid ${accentColor}`,
                  color: '#e2e8f0',
                  background: `${accentColor}0d`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  willChange: 'transform, opacity',
                  animation: `beamerRevealItem 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)`,
                  animationDelay: `${idx * 60}ms`,
                  animationFillMode: 'backwards'
                }}
              >
                <strong style={{ color: accentColor, fontSize: 13, fontWeight: 800 }}>{team.name || team.id}</strong>
                <div style={{ fontSize: 13, color: '#e2e8f0', wordBreak: 'break-word', lineHeight: 1.4 }}>
                  {answerText}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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
        case 'BLITZ_SELECTION_COMPLETE':
          return 'SELECTION_COMPLETE';
        case 'BLITZ_CATEGORY_SHOWCASE':
          return 'CATEGORY_SHOWCASE';
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
    if (phase === 'READY' || phase === 'BANNING') {
      const randomIds = new Set(
        selectedThemes.filter((entry) => entry.id !== pinnedTheme?.id).map((entry) => entry.id)
      );
      const statusLine = selectedThemes.length
        ? selectedThemes.map((entry, idx) => `R${idx + 1}: ${entry.title}`).join(' · ')
        : null;
      return (
        <div className="blitz-stack">
          {/* Compact rule hint — header already shows FOTOSPRINT / Kategorienwahl */}
          <div style={{
            fontSize: 13, fontWeight: 700, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            padding: '7px 16px', background: '#e5e7eb',
            borderRadius: 999, alignSelf: 'center'
          }}>
            {phase === 'READY'
              ? 'Bereit — Auswahl startet gleich'
              : 'Platz 1 streicht 2 · Letzter Platz wählt'}
          </div>
          <div className="beamer-select-grid">
            {pool.length ? (
              pool.map((theme) => {
                const isBanned = bannedIds.has(theme.id);
                const isPick = pinnedTheme?.id === theme.id;
                const isRandom = randomIds.has(theme.id);
                const badge = isPick ? 'PICK' : isRandom ? 'RANDOM' : isBanned ? 'BANNED' : '';
                const cardClasses = [
                  'beamer-select-card',
                  isBanned ? 'banned' : '',
                  isPick ? 'picked' : ''
                ].filter(Boolean).join(' ');
                return (
                  <div key={theme.id} className={cardClasses}>
                    <div className="beamer-select-title">{theme.title}</div>
                    {badge && <span className={`beamer-select-badge ${badge.toLowerCase()}`}>{badge}</span>}
                  </div>
                );
              })
            ) : (
              <div className="beamer-select-card">Keine Themen verfügbar</div>
            )}
          </div>
          {statusLine && <div className="beamer-select-status">{statusLine}</div>}
        </div>
      );
    }

    if (phase === 'CATEGORY_SHOWCASE') {
      const pickedTheme = selectedThemes[0]; // Team picked this
      const randomThemes = selectedThemes.slice(1, 3); // 2 random picks
      const allAvailable = pool.filter(t => !bannedIds.has(t.id) && t.id !== pickedTheme?.id);

      // Note: showcasePhase and slotPositions are now component-level state
      // Animation logic is in useEffect outside this render function

      // Phase 1: Show full pool with animated slot overlays
      if (showcasePhase === 'POOL_ANIMATION') {
        const slot1Id = slotPositions[0];
        const slot2Id = slotPositions[1];

        return (
          <div className="blitz-stack">
            <div className="beamer-intro-card">
              <h2>🎰 KATEGORIE-AUSWAHL</h2>
              <p>Die 3 Themen werden ausgewählt...</p>
            </div>
            <div className="blitz-pool-grid" style={{ position: 'relative' }}>
              {(pool.length >= 12 ? pool.slice(0, 12) : pool.length >= 9 ? pool.slice(0, 9) : pool).map((theme) => {
                const isPicked = theme.id === pickedTheme?.id;
                const isBanned = bannedIds.has(theme.id);
                const isSlot1 = theme.id === slot1Id;
                const isSlot2 = theme.id === slot2Id;

                const cardClasses = [
                  'beamer-select-card',
                  isBanned ? 'banned' : '',
                  isPicked ? 'picked' : ''
                ].filter(Boolean).join(' ');

                // Badge: picked uses same style as BANNING phase
                const badge = isPicked ? 'PICK' : '';
                return (
                  <div
                    key={theme.id}
                    className={cardClasses}
                    style={{
                      position: 'relative',
                      outline: (isSlot1 || isSlot2) ? '3px solid rgba(74, 222, 128, 0.9)' : undefined,
                      outlineOffset: (isSlot1 || isSlot2) ? '2px' : undefined,
                      background: (isSlot1 || isSlot2) ? 'rgba(74, 222, 128, 0.18)' : undefined,
                      boxShadow: (isSlot1 || isSlot2) ? '0 0 20px rgba(74, 222, 128, 0.55)' : undefined,
                      transition: 'outline 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    <div className="beamer-select-title">{theme.title}</div>
                    {badge && <span className={`beamer-select-badge ${badge.toLowerCase()}`}>{badge}</span>}
                    {isSlot1 && <span className="beamer-select-badge random" style={{ left: '-10px', right: 'auto' }}>🎲 R1</span>}
                    {isSlot2 && <span className="beamer-select-badge random" style={{ left: '-10px', right: 'auto' }}>🎲 R2</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // Phase 2: Final cards (zoom effect)
      const cardBase: React.CSSProperties = {
        borderRadius: '20px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        padding: '44px 28px 28px',
      };
      const badgeBase: React.CSSProperties = {
        position: 'absolute',
        top: '-15px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '6px 22px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      };
      return (
        <div className="blitz-stack" style={{ padding: '20px 24px', animation: 'zoomIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
          {/* Header */}
          <div style={{
            fontSize: '26px', fontWeight: '900', color: '#111827',
            textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em',
            flexShrink: 0, animation: 'slideInDown 0.5s ease-out'
          }}>
            🎯 Die 3 Themen für diese Runde
          </div>

          {/* Main Grid — fills remaining height */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px', width: '100%', flex: 1, minHeight: 0
          }}>
            {/* Picked Theme */}
            <div style={{
              ...cardBase,
              background: 'linear-gradient(135deg, rgba(96,165,250,0.25), rgba(59,130,246,0.15))',
              border: '3px solid rgba(96,165,250,0.7)',
              boxShadow: '0 4px 0 rgba(59,130,246,0.4), 0 8px 24px rgba(59,130,246,0.15)',
              animation: 'scaleInCenter 0.55s cubic-bezier(0.34,1.56,0.64,1) 1.5s both',
            }}>
              <div style={{ ...badgeBase, background: '#3b82f6', color: '#ffffff' }}>GEWÄHLT</div>
              <div style={{ fontSize: '52px' }}>{pickedTheme?.title.match(/[🏗️🎬🎮🏀🏟️🏎️⛰️🎭🌍🎨🎵🍔]/)?.[0] || '🎯'}</div>
              <div style={{ fontSize: '30px', fontWeight: '900', color: '#111827', lineHeight: 1.2 }}>
                {pickedTheme?.title.replace(/[🏗️🎬🎮🏀🏟️🏎️⛰️🎭🌍🎨🎵🍔]/g, '').trim() || 'Thema 1'}
              </div>
            </div>

            {/* Random Picks — staggered 1.5s apart */}
            {randomThemes.map((theme, idx) => (
              <div
                key={`random-${theme.id}-${idx}`}
                style={{
                  ...cardBase,
                  background: 'linear-gradient(135deg, rgba(74,222,128,0.2), rgba(34,197,94,0.1))',
                  border: '3px solid rgba(74,222,128,0.6)',
                  boxShadow: '0 4px 0 rgba(34,197,94,0.35), 0 8px 24px rgba(34,197,94,0.15)',
                  animation: `scaleInCenter 0.55s cubic-bezier(0.34,1.56,0.64,1) ${1.5 + idx * 1.5}s both`,
                }}
              >
                <div style={{ ...badgeBase, background: '#22c55e', color: '#ffffff' }}>RANDOM {idx + 1}</div>
                <div style={{ fontSize: '52px' }}>{theme?.title.match(/[🏗️🎬🎮🏀🏟️🏎️⛰️🎭🌍🎨🎵🍔]/)?.[0] || '🎲'}</div>
                <div style={{ fontSize: '30px', fontWeight: '900', color: '#111827', lineHeight: 1.2 }}>
                  {theme?.title.replace(/[🏗️🎬🎮🏀🏟️🏎️⛰️🎭🌍🎨🎵🍔]/g, '').trim() || `Thema ${idx + 2}`}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            flexShrink: 0, fontSize: '18px', fontWeight: '700', color: '#6b7280',
            textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.15em',
            animation: 'fadeIn 0.6s ease-in 0.6s both'
          }}>
            ⏱️ Start in wenigen Sekunden...
          </div>
        </div>
      );
    }

    if (phase === 'ROUND_INTRO') {
      const countdownNumber = blitzCountdown !== null && blitzCountdown > 0 ? blitzCountdown : null;
      return (
        <div className="beamer-stack blitz-stack">
          <div className="beamer-intro-card">
            <h2>FOTOSPRINT</h2>
            <p>{blitz.theme?.title || '-'}</p>
            {countdownNumber !== null && (
              <div style={{
                fontSize: '80px',
                fontWeight: '900',
                color: '#15803d',
                marginTop: '30px',
                animation: 'pulse 0.5s ease-in-out infinite'
              }}>
                {countdownNumber}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (phase === 'SELECTION_COMPLETE') {
      const pickedTheme = selectedThemes[0];
      const randomThemes = selectedThemes.slice(1);
      return (
        <div className="beamer-stack blitz-stack">
          <div className="beamer-intro-card">
            <h2>DIE 3 THEMEN SIND AUSGELOST!</h2>
            <p style={{ fontSize: '18px', marginBottom: '30px', opacity: 0.9 }}>Gleich geht es los...</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '30px' }}>
            {pickedTheme && (
              <div
                className="blitz-theme-pop"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.2))',
                  border: '2px solid rgba(59, 130, 246, 0.6)',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '12px',
                  minHeight: '140px',
                  animationDelay: '0s'
                } as any}
              >
                <div style={{ fontSize: '14px', color: '#1d4ed8', fontWeight: '700', textTransform: 'uppercase' }}>
                  Platz 1 wählt
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#111827' }}>
                  {pickedTheme.title}
                </div>
              </div>
            )}
            {randomThemes.map((theme, idx) => (
              <div
                key={`random-${idx}-${theme.id}`}
                className="blitz-theme-pop"
                style={{
                  background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.15))',
                  border: '2px solid rgba(74, 222, 128, 0.5)',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '12px',
                  minHeight: '140px',
                  animationDelay: `${0.2 + idx * 0.15}s`
                }}
              >
                <div style={{ fontSize: '14px', color: '#15803d', fontWeight: '700', textTransform: 'uppercase' }}>
                  Zufällig
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#111827' }}>
                  {theme.title}
                </div>
              </div>
            ))}
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
    const items = blitz.items ?? [];
    const totalItems = Math.max(1, items.length || 5);
    const maxIndex = totalItems - 1;
    // Use itemIndex for both DISPLAYING and PLAYING phases
    const isActivePhase = blitz.phase === 'PLAYING' || blitz.phase === 'DISPLAYING';
    const rawIndex = isActivePhase
      ? typeof blitz.itemIndex === 'number' && blitz.itemIndex >= 0
        ? blitz.itemIndex
        : 0
      : maxIndex;
    const activeIndex = Math.min(maxIndex, Math.max(0, rawIndex));
    const activeItem = items[activeIndex];
    const timeline = Array.from({ length: totalItems }, (_, idx) => {
      if (!isActivePhase) return idx <= activeIndex ? 'done' : 'pending';
      if (idx < activeIndex) return 'done';
      if (idx === activeIndex) return 'current';
      return 'pending';
    });
    const resultsMap = blitz.results || {};
    const scoreboardReady = Object.keys(resultsMap).length > 0;
    const setFinished = blitz.phase !== 'PLAYING';
    const waitingForReveal = setFinished && !scoreboardReady;

    return (
      <div className="beamer-stack blitz-stack">

        {(blitz.phase === 'PLAYING' || blitz.phase === 'DISPLAYING') ? (
          <>
            <div className="beamer-card blitz-current-card">
              {activeItem?.mediaUrl && (
                <img
                  src={activeItem.mediaUrl}
                  alt={`Item ${activeIndex + 1}`}
                  className="blitz-current-image"
                  style={blitzImageIsPortrait ? { objectFit: 'contain', background: '#111' } : undefined}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setBlitzImageIsPortrait(img.naturalHeight > img.naturalWidth);
                  }}
                />
              )}
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
                <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '8px' }}>
                  {language === 'de' ? 'Lösungen' : 'Solutions'}
                </div>
                {/* All 5 images in one row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '10px',
                  width: '100%'
                }}>
                  {items.map((item, idx) => (
                    <div key={`solution-${item.id}-${idx}`} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      padding: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {item.mediaUrl && (
                        <img
                          src={item.mediaUrl}
                          alt={item.prompt || `Item ${idx + 1}`}
                          style={{
                            width: '100%',
                            aspectRatio: '1',
                            objectFit: 'cover',
                            borderRadius: '6px'
                          }}
                        />
                      )}
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#111827',
                        textAlign: 'center'
                      }}>
                        {item.prompt || `Item ${idx + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Scoreboard below */}
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                  {renderCozyScoreboardGrid(sortedScoreTeams, { highlightTop: true, detailMap })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };



  const renderCozyAwardsContent = (): JSX.Element => {
    const medals = ['🥇', '🥈', '🥉'];
    
    // Trigger confetti when awards are shown
    useEffect(() => {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }, []);

    return (
      <div className="beamer-stack" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Liquid blob backgrounds */}
        <div className="liquid-bg" style={{ top: -100, left: -100 }} />
        <div className="liquid-bg" style={{ bottom: -100, right: -100, animationDelay: '5s' }} />
        <div className="beamer-intro-card gradient-mesh" style={{ 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(236, 72, 153, 0.1), rgba(20, 184, 166, 0.1))',
          backgroundSize: '200% 200%',
          animation: 'gradient-flow 8s ease infinite'
        }}>
          <h2 style={{ 
            fontSize: 42, 
            marginBottom: 8,
            animation: 'shake-celebrate 0.5s ease-in-out'
          }}>
            {language === 'de' ? '🎉 Siegerehrung 🎉' : language === 'both' ? '🎉 Siegerehrung / Awards 🎉' : '🎉 Awards 🎉'}
          </h2>
          <p style={{ fontSize: 18, opacity: 0.9 }}>
            {language === 'de'
              ? 'Top Teams des Abends'
              : language === 'both'
              ? 'Top Teams des Abends / Top teams tonight'
              : 'Top teams tonight'}
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 20 }}>
          {sortedScoreTeams.slice(0, 3).map((team, idx) => {
            const medal = medals[idx];
            const colors = ['#fbbf24', '#e5e7eb', '#f97316'];
            const neonClasses = ['neon-gold', 'neon-silver', 'neon-bronze'];
            const color = colors[idx];
            const neonClass = neonClasses[idx];
            const avatar = getAvatarById(team.avatarId);
            return (
              <div
                key={team.id}
                className="card-3d glass-ultra shimmer-card hover-spring"
                style={{
                  padding: '24px 20px',
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${color}18, ${color}08)`,
                  border: `2px solid ${color}`,
                  textAlign: 'center',
                  animation: `spring-entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), pulse-depth 3s ease-in-out ${idx * 0.3}s infinite`,
                  animationDelay: `${idx * 150}ms, ${idx * 0.3}s`,
                  animationFillMode: 'backwards',
                  transform: idx === 0 ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: `0 0 30px ${color}44, 0 8px 32px rgba(0,0,0,0.3)`,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Cyber scan effect for winner */}
                {avatar && (
                  <AvatarMedia
                    avatar={avatar}
                    style={{ width: 48, height: 48, borderRadius: 14, border: `2px solid ${color}99`, marginBottom: 10 }}
                  />
                )}
                {idx === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                    animation: 'cyber-scan 2s linear infinite',
                    opacity: 0.7
                  }} />
                )}
                <div style={{ fontSize: 56, marginBottom: 12, filter: `drop-shadow(0 0 10px ${color})` }}>
                  {medal}
                </div>
                <div className={neonClass} style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>
                  {idx + 1}.
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 14, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  {team.name}
                </div>
                <div style={{ 
                  fontSize: 36, 
                  fontWeight: 900, 
                  background: `linear-gradient(135deg, ${color}, ${color}cc)`, 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                  filter: `drop-shadow(0 0 8px ${color}88)`
                }}>
                  {team.score}
                </div>
              </div>
            );
          })}
        </div>
        {sortedScoreTeams.length > 3 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, fontWeight: 600 }}>
              {language === 'de' ? 'Weitere Platzierungen' : 'Other rankings'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {sortedScoreTeams.slice(3).map((team, idx) => (
                <div
                  key={team.id}
                  className="glass-reflective hover-spring"
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
                      {idx + 4}. {team.name}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#94a3b8' }}>
                    {team.score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  const renderCozyScene = () => {
    const sceneKey = `${gameState}-${question?.id ?? 'none'}-${blitz?.phase ?? 'idle'}-${rundlauf?.roundIndex ?? 'nr'}`;
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

    const renderRevealAnswersList = (): JSX.Element => {
      const fallbackColors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#10b981', '#f87171', '#60a5fa'];
      const teamColorMap = Object.fromEntries((teamStatus ?? []).map(t => [t.id, t.color]));
      const label = language === 'de' ? 'Team-Antworten' : language === 'both' ? 'Team-Antworten / Answers' : 'Team answers';
      const isEstimate = question?.type === 'SCHAETZCHEN' || (question as any)?.mechanic === 'estimate';
      const isBetting = (question as any)?.mechanic === 'betting';
      const formatAnswer = (answer: any): string => {
        if (answer === null || answer === undefined) return '–';
        if (typeof answer === 'string') return answer;
        if (typeof answer === 'number') return String(answer);
        if (Array.isArray(answer)) return answer.join(', ');
        if (typeof answer === 'object' && 'order' in answer && Array.isArray(answer.order)) return answer.order.join(' → ');
        return JSON.stringify(answer);
      };
      if (answerResults?.length) {
        // For estimate questions: sort by deviation ascending (closest first)
        const sorted = isEstimate
          ? [...answerResults].sort((a, b) => {
              const da = a.tieBreaker?.primary ?? Infinity;
              const db = b.tieBreaker?.primary ?? Infinity;
              return da - db;
            })
          : answerResults;
        return (
          <>
            <div className="cozyRevealAnswersLabel">{label}</div>
            {sorted.map((entry, idx) => {
              const isCorrect = entry.isCorrect === true;
              const isWrong = entry.isCorrect === false;
              const teamColor = teamColorMap[entry.teamId] || fallbackColors[idx % fallbackColors.length];
              const resultColor = isCorrect ? '#16a34a' : isWrong ? '#dc2626' : teamColor;
              const deviation = entry.tieBreaker?.primary;
              const devLabel = isEstimate && deviation !== undefined && Number.isFinite(deviation)
                ? (language === 'de' ? `±${Math.round(deviation * 100) / 100}` : `±${Math.round(deviation * 100) / 100}`)
                : null;
              const isTopRank = isEstimate && idx === 0;
              return (
                <div
                  key={`reveal-ans-${entry.teamId}-${idx}`}
                  className={`cozyRevealAnswerRow${isTopRank ? ' estimate-winner' : ''}`}
                  style={{
                    borderLeftColor: isEstimate ? resultColor : teamColor,
                    borderLeftWidth: isTopRank ? 6 : 4,
                    background: isTopRank ? `${resultColor}20` : isCorrect ? '#f0fdf420' : isWrong ? '#fef2f220' : `${teamColor}12`,
                    animationDelay: `${idx * 90}ms`
                  }}
                >
                  <div className="cozyRevealAnswerTop">
                    <span className="cozyRevealAnswerRank" style={{ color: '#6b7280' }}>
                      {isEstimate ? `#${idx + 1}` : ''}
                    </span>
                    <span className="cozyRevealAnswerTeam" style={{ color: isEstimate ? resultColor : teamColor, fontWeight: isTopRank ? 900 : 800 }}>
                      {entry.teamName || entry.teamId}
                    </span>
                    <span className="cozyRevealAnswerResult" style={{ color: resultColor, fontWeight: 900 }}>
                      {isEstimate
                        ? (isCorrect ? '🏆' : devLabel ?? '–')
                        : isBetting
                        ? (isCorrect ? '✓' : isWrong ? '✗' : '–')
                        : (isCorrect ? '✓' : isWrong ? '✗' : '–')}
                    </span>
                  </div>
                  <div className="cozyRevealAnswerText" style={{ fontWeight: isTopRank ? 700 : 400 }}>
                    {isBetting
                      ? <span style={{ fontWeight: 700, color: isCorrect ? '#16a34a' : isWrong ? '#dc2626' : '#374151' }}>
                          {entry.betPoints ?? 0} / {entry.betPool ?? 10} Pkt. auf richtiger Antwort
                        </span>
                      : formatTeamAnswer(entry.answer)}
                  </div>
                </div>
              );
            })}
          </>
        );
      }
      const teamsWithAnswers = (teamStatus ?? []).filter(t => t.answer !== undefined);
      return (
        <>
          <div className="cozyRevealAnswersLabel">{label}</div>
          {teamsWithAnswers.map((team, idx) => {
            const teamColor = team.color || fallbackColors[idx % fallbackColors.length];
            return (
              <div
                key={`reveal-ans-${team.id}-${idx}`}
                className="cozyRevealAnswerRow"
                style={{ borderLeftColor: teamColor, background: `${teamColor}18`, animationDelay: `${idx * 70}ms` }}
              >
                <div className="cozyRevealAnswerTop">
                  <span className="cozyRevealAnswerTeam" style={{ color: teamColor }}>{team.name || team.id}</span>
                </div>
                <div className="cozyRevealAnswerText">{formatTeamAnswer(team.answer)}</div>
              </div>
            );
          })}
        </>
      );
    };

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
          if ((question as any)?.bunteTuete?.kind === 'top5') {
            const top5 = Array.isArray((question as any).bunteTuete.correctOrder) ? (question as any).bunteTuete.correctOrder : [];
            const itemMap = new Map(
              Array.isArray((question as any).bunteTuete.items)
                ? (question as any).bunteTuete.items.map((item: any) => [item.id, item.label])
                : []
            );
            const resolveLabel = (value: string) => String(itemMap.get(value) ?? value);
            return (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {top5.map((item: string, idx: number) => (
                  <div
                    key={`top5-${idx}-${item}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: '#ffffff', border: '1.5px solid #e5e7eb',
                      borderRadius: 12, padding: '10px 18px',
                      boxShadow: '0 2px 0 #e5e7eb',
                      fontFamily: 'var(--font-game)', fontWeight: 700, fontSize: 20,
                      color: '#111827',
                    }}
                  >
                    <span style={{ color: '#9ca3af', fontSize: 16, fontWeight: 800, minWidth: 22 }}>{idx + 1}.</span>
                    {resolveLabel(item)}
                  </div>
                ))}
              </div>
            );
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

      const isTop5 = (question as any)?.bunteTuete?.kind === 'top5';
      const hasSubmissions = phase !== 'reveal' && (teamStatus?.some(t => t.submitted) ?? false);
      // Split layout: image takes half the screen, question card takes the other half
      const showSplitLayout = !!mediaUrl && phase !== 'reveal';
      // During reveal: only use 2-column layout when team answers are actually present
      const hasRevealAnswers = phase === 'reveal' && !isTop5 &&
        !!(answerResults?.length || teamStatus?.some(t => t.answer !== undefined));
      // Image-only phase: first 10s show image full-screen, then question slides in
      const showImageOnly = showSplitLayout && phase === 'active' && !imageRevealDone;

      const onMediaLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setMediaIsPortrait(img.naturalHeight > img.naturalWidth);
      };
      // Handle cached images that never fire onLoad
      const onMediaRef = (el: HTMLImageElement | null) => {
        if (el?.complete && el.naturalHeight > 0) {
          setMediaIsPortrait(el.naturalHeight > el.naturalWidth);
        }
      };

      const heroEl = (
        <div className={`cozyQuestionHero${phase === 'locked' ? ' locked' : ''}${phase === 'reveal' && !hasRevealAnswers ? ' reveal-solo' : ''}`}>
          <div className="cozyQuestionHeroHeader cozyQuestionHeroHeaderSolo" />
          <div className="cozyQuestionText">{questionTextLocalized}</div>
          {promptText && <div className="cozyQuestionHint">{promptText}</div>}
          {/* Image: only during active/locked phase — hidden during reveal (was cut-off/cropped) */}
          {!showSplitLayout && mediaUrl && phase !== 'reveal' && (
            <div className={`cozyQuestionMedia${mediaIsPortrait ? ' portrait' : ''}`}>
              <img src={mediaUrl} alt="" onLoad={onMediaLoad} />
            </div>
          )}
          <div className="cozyQuestionBody">{renderHeroBody()}</div>
          {phase !== 'reveal' && Array.isArray(teamStatus) && teamStatus.length > 0 && (() => {
            const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#10b981'];
            const connectedTeams = teamStatus.filter(t => t.connected);
            const allSubmitted = connectedTeams.length > 0 && connectedTeams.every(t => t.submitted);
            if (allSubmitted) {
              return (
                <div className="cozyTeamStatusBar">
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '6px 20px', borderRadius: 999,
                    background: '#942d59', color: '#fff',
                    fontWeight: 700, fontSize: 20,
                    boxShadow: '0 3px 0 #6b1e3f'
                  }}>
                    Weiter →
                  </span>
                </div>
              );
            }
            return (
              <div className="cozyTeamStatusBar">
                {teamStatus.map((team, idx) => {
                  const accentColor = colors[idx % colors.length];
                  return (
                    <div
                      key={team.id}
                      className="cozyTeamStatusChip"
                      style={{ borderLeft: `3px solid ${accentColor}`, transition: 'all 0.3s ease' }}
                    >
                      <span
                        className={`cozyTeamStatusDot ${team.connected ? 'online' : 'offline'}`}
                        style={{ backgroundColor: team.submitted ? accentColor : 'transparent', border: `2px solid ${accentColor}` }}
                      />
                      <span className="cozyTeamStatusName" style={{ color: accentColor, fontWeight: team.submitted ? 700 : 500 }}>
                        {team.name || 'Team'}
                      </span>
                      {team.submitted && <span style={{ color: accentColor, fontWeight: 700, fontSize: 15 }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      );

      return (
        <BeamerFrame
          {...baseFrameProps}
          title={questionTitle}
          subtitle={questionSubtitle}
          badgeLabel={undefined}
          badgeTone={undefined}
          progressText={undefined}
          footerMessage={undefined}
          status={phase === 'active' ? 'active' : phase === 'locked' ? 'locked' : 'final'}
        >
          {showSplitLayout ? (
            /* Image question: split layout (portrait=side-by-side, landscape=stacked) */
            <div className={`cozyMediaLayout ${mediaIsPortrait === false ? 'landscape-split' : 'portrait-split'}${showImageOnly ? ' image-only' : ''}`}>
              {heroEl}
              <div className="cozyExternalMedia">
                <img src={mediaUrl!} alt="" ref={onMediaRef} onLoad={onMediaLoad} />
              </div>
            </div>
          ) : (
            /* No image or reveal: original grid layout */
            <div className={`cozyQuestionGrid ${hasRevealAnswers ? 'phase-reveal' : `cozyQuestionGridSolo${hasSubmissions ? ' has-submissions' : ''}`}`}>
              {heroEl}
              {hasRevealAnswers && (
                <div className="cozyRevealAnswersPanel">
                  {renderRevealAnswersList()}
                </div>
              )}
            </div>
          )}
          {phase === 'reveal' && renderTop5Confetti()}
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
          progressText={undefined}
          badgeLabel={showSetBadge ? setLabel : undefined}
          badgeTone={showSetBadge ? 'accent' : undefined}
          footerMessage={undefined}
          status={blitzPhase === 'PLAYING' ? 'active' : 'info'}
        >
          {renderCozyBlitzContent()}
        </BeamerFrame>
      );
    };



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

      if (gameState === 'RUNDLAUF_SELECTION_COMPLETE') {
        const pickedCategory = selected[0];
        const randomCategories = selected.slice(1);
        return (
          <BeamerFrame
            key={`${sceneKey}-rundlauf-selection-complete`}
            {...baseFrameProps}
            title="K.O.-RALLYE"
            subtitle={language === 'de' ? 'Die 3 Kategorien sind ausgelost!' : '3 Categories selected!'}
            badgeLabel="BEREIT"
            badgeTone="accent"
            footerMessage={language === 'de' ? 'Gleich geht es los...' : 'Starting soon...'}
            status="info"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '20px' }}>
              {pickedCategory && (
                <div
                  className="rundlauf-theme-pop"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.2))',
                    border: '2px solid rgba(59, 130, 246, 0.6)',
                    borderRadius: '16px',
                    padding: '24px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '12px',
                    minHeight: '140px',
                    animation: 'scaleInCenter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  } as any}
                >
                  <div style={{ fontSize: '14px', color: '#1d4ed8', fontWeight: '700', textTransform: 'uppercase' }}>
                    Letzter wählt
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#111827' }}>
                    {pickedCategory.title}
                  </div>
                </div>
              )}
              {randomCategories.map((cat, idx) => (
                <div
                  key={`random-${idx}-${cat.id}`}
                  className="rundlauf-theme-pop"
                  style={{
                    background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.15))',
                    border: '2px solid rgba(74, 222, 128, 0.5)',
                    borderRadius: '16px',
                    padding: '24px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '12px',
                    minHeight: '140px',
                    animation: `slideInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.2 + idx * 0.15}s both`
                  }}
                >
                  <div style={{ fontSize: '14px', color: '#15803d', fontWeight: '700', textTransform: 'uppercase' }}>
                    Zufällig
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#111827' }}>
                    {cat.title}
                  </div>
                </div>
              ))}
            </div>
          </BeamerFrame>
        );
      }

      if (gameState === 'RUNDLAUF_CATEGORY_SHOWCASE') {
        const pickedCategory = selected.find(s => s.id === pinnedId) || selected[0];
        const randomCategories = selected.filter(s => s.id !== pinnedId);
        const allAvailable = pool.filter(t => !bans.has(t.id) && t.id !== pinnedId);

        // Phase 1: Pool animation with slot machine for random picks
        if (rundlaufShowcasePhase === 'POOL_ANIMATION') {
          const slot1Id = rundlaufSlotPositions[0];
          const slot2Id = rundlaufSlotPositions[1];
          const displayPool = pool.length >= 12 ? pool.slice(0, 12) : pool.length >= 9 ? pool.slice(0, 9) : pool;

          return (
            <BeamerFrame
              key={`${sceneKey}-rundlauf-showcase-pool`}
              {...baseFrameProps}
              title="K.O.-RALLYE"
              subtitle={language === 'de' ? 'Zufällige Kategorienwahl' : 'Random category draw'}
              progressText={undefined}
              badgeLabel={undefined}
              footerMessage={language === 'de' ? 'Die Kategorien werden ausgelost...' : 'Drawing categories...'}
              status="info"
            >
              <div className="blitz-stack">
                <div className="blitz-pool-grid" style={{ position: 'relative' }}>
                  {displayPool.map((entry) => {
                    const isBanned = bans.has(entry.id);
                    const isPicked = entry.id === pinnedId;
                    const isSlot1 = entry.id === slot1Id;
                    const isSlot2 = entry.id === slot2Id;

                    const cardClasses = [
                      'beamer-select-card',
                      isBanned ? 'banned' : '',
                      isPicked ? 'picked' : ''
                    ].filter(Boolean).join(' ');

                    const badge = isPicked ? 'PICK' : isBanned ? 'BANNED' : '';
                    return (
                      <div
                        key={entry.id}
                        className={cardClasses}
                        style={{
                          position: 'relative',
                          outline: (isSlot1 || isSlot2) ? '3px solid rgba(74, 222, 128, 0.9)' : undefined,
                          outlineOffset: (isSlot1 || isSlot2) ? '2px' : undefined,
                          background: (isSlot1 || isSlot2) ? 'rgba(74, 222, 128, 0.18)' : undefined,
                          boxShadow: (isSlot1 || isSlot2) ? '0 0 20px rgba(74, 222, 128, 0.55)' : undefined,
                          transition: 'outline 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
                        }}
                      >
                        <div className="beamer-select-title">{entry.title}</div>
                        {badge && <span className={`beamer-select-badge ${badge.toLowerCase()}`}>{badge}</span>}
                        {isSlot1 && <span className="beamer-select-badge random" style={{ left: '-10px', right: 'auto' }}>🎲 R2</span>}
                        {isSlot2 && <span className="beamer-select-badge random" style={{ left: '-10px', right: 'auto' }}>🎲 R3</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </BeamerFrame>
          );
        }

        // Phase 2: Final cards (3 selected categories)
        const cardBase: React.CSSProperties = {
          borderRadius: '20px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          padding: '44px 28px 28px',
        };
        const badgeBase: React.CSSProperties = {
          position: 'absolute',
          top: '-15px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 22px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        };
        return (
          <BeamerFrame
            key={`${sceneKey}-rundlauf-showcase-final`}
            {...baseFrameProps}
            title="K.O.-RALLYE"
            subtitle={language === 'de' ? 'Die 3 Kategorien' : '3 Categories'}
            progressText={undefined}
            badgeLabel="LOS GEHT'S"
            badgeTone="accent"
            footerMessage={language === 'de' ? 'Start in wenigen Sekunden...' : 'Starting soon...'}
            status="info"
          >
            <div className="blitz-stack" style={{ padding: '20px 24px', animation: 'zoomIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '24px', width: '100%', flex: 1, minHeight: 0
              }}>
                {/* Picked category */}
                <div style={{
                  ...cardBase,
                  background: 'linear-gradient(135deg, rgba(96,165,250,0.25), rgba(59,130,246,0.15))',
                  border: '3px solid rgba(96,165,250,0.7)',
                  boxShadow: '0 4px 0 rgba(59,130,246,0.4), 0 8px 24px rgba(59,130,246,0.15)',
                  animation: 'scaleInCenter 0.55s cubic-bezier(0.34,1.56,0.64,1) 1.5s both',
                }}>
                  <div style={{ ...badgeBase, background: '#3b82f6', color: '#ffffff' }}>GEWÄHLT</div>
                  <div style={{ fontSize: '30px', fontWeight: '900', color: '#111827', lineHeight: 1.2 }}>
                    {pickedCategory?.title || 'Kategorie 1'}
                  </div>
                </div>
                {/* Random categories — staggered 1.5s apart */}
                {randomCategories.map((cat, idx) => (
                  <div
                    key={`random-${cat.id}-${idx}`}
                    style={{
                      ...cardBase,
                      background: 'linear-gradient(135deg, rgba(74,222,128,0.2), rgba(34,197,94,0.1))',
                      border: '3px solid rgba(74,222,128,0.6)',
                      boxShadow: '0 4px 0 rgba(34,197,94,0.35), 0 8px 24px rgba(34,197,94,0.15)',
                      animation: `scaleInCenter 0.55s cubic-bezier(0.34,1.56,0.64,1) ${1.5 + idx * 1.5}s both`,
                    }}
                  >
                    <div style={{ ...badgeBase, background: '#22c55e', color: '#ffffff' }}>ZUFÄLLIG {idx + 1}</div>
                    <div style={{ fontSize: '30px', fontWeight: '900', color: '#111827', lineHeight: 1.2 }}>
                      {cat.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </BeamerFrame>
        );
      }

      if (gameState === 'RUNDLAUF_ROUND_INTRO') {
        const countdownNumber = rundlaufCountdown !== null && rundlaufCountdown > 0 ? rundlaufCountdown : null;
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
              {countdownNumber !== null && (
                <div style={{
                  fontSize: '80px',
                  fontWeight: '900',
                  color: '#15803d',
                  marginTop: '30px',
                  animation: 'pulse 0.5s ease-in-out infinite'
                }}>
                  {countdownNumber}
                </div>
              )}
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
      case 'BLITZ_SELECTION_COMPLETE':
      case 'BLITZ_CATEGORY_SHOWCASE':
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
      case 'RUNDLAUF_SELECTION_COMPLETE':
      case 'RUNDLAUF_CATEGORY_SHOWCASE':
      case 'RUNDLAUF_ROUND_INTRO':
      case 'RUNDLAUF_PLAY':
      case 'RUNDLAUF_ROUND_END':
      case 'RUNDLAUF_SCOREBOARD_FINAL':
        return renderRundlaufFrame();
      case 'SIEGEREHRUNG':
        return renderAwardsFrame();

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


  const renderBlitzView = () => {
    const shared = renderCozyBlitzContent();
    if (!shared) return renderScoreboard();
    return <div style={cardFrame}>{shared}</div>;
  };

  return (
    <main style={{...pageStyle, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale'}} className={featureFlags.isCozyMode ? `cozy-beamer-shell${gameState === 'LOBBY' ? ' cozy-beamer-lobby' : ''}` : undefined}>
      {showTechnicalHud && offlineBar(connectionStatus, language, handleReconnect)}
      {toast && <div style={toastStyle}>{toast}</div>}
      
      {/* Walking Animals at Bottom of Screen */}
      {avatarsEnabled && teams.filter(t => t.id && t.avatarId).map((team, index) => {
        const avatar = AVATARS.find(a => a.id === team.avatarId);
        if (!avatar) return null;
        
        // Get current state for this team (default to walking)
        const currentState = teamAvatarStates[team.id] || 'walking';
        
        // Calculate speed based on animal size - larger = slower, smaller = faster
        const sizeRatio = getAvatarSize(team.avatarId);
        const avatarSize = Math.round(55 + sizeRatio * 35);
        const baseSpeed = 120; // Base duration in seconds (slower = calmer)
        const speedVariation = (1.0 - sizeRatio) * 50; // 0-50s variation for more difference
        const duration = Math.round(baseSpeed + speedVariation + (index * 12)); // 120-182s range
        
        return (
          <BeamerWalkingAvatar
            key={`walking-${team.id}`}
            teamId={team.id}
            teamName={team.name}
            avatar={avatar}
            currentState={currentState}
            size={avatarSize}
            duration={duration}
            walkIndex={index % 3}
          />
        );
      })}
      
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
              Kategorie: {getCategoryLabel(lastQuestion.category as QuizCategory, effectiveLang)}
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
  width: '100%',
  margin: '0 auto',
  padding: '0 16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
};
const offlineBar = (
  status: 'connecting' | 'connected' | 'disconnected',
  lang: Lang,
  onReconnect: () => void
) =>
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
                onClick={onReconnect}
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


















