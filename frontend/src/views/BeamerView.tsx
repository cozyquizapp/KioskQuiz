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
  SyncStatePayload
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
import { introSlides as INTRO_SLIDES } from '../introSlides';

type Lang = 'de' | 'en';
type BaseScreen = 'lobby' | 'slot' | 'question' | 'intro';
type BeamerViewMode = 'lobby' | 'categorySlot' | 'question' | 'calculating' | 'answer' | 'rules' | 'intro';

type BeamerProps = { roomCode: string };

const SLOT_ITEM_HEIGHT = 70;
const SLOT_SPIN_DURATION = 1400;

const translations = {
  de: {
    lobbyTitle: "Gleich geht's los.",
    lobbySubtitle: 'Macht es euch gemÃ¼tlich - der Admin legt gleich los.',
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
    slotTitle: 'NÃ¤chste Kategorie',
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

const CATEGORY_DESCRIPTIONS: Record<QuizCategory, Record<Lang, string>> = {
  Schaetzchen: {
    de: 'Hier zÃ¤hlt euer GefÃ¼hl fÃ¼r Zahlen und GrÃ¶ÃŸen.',
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
    de: 'Alles rund ums Motiv - genau hinschauen.',
    en: 'All about the picture - look closely.'
  },
  GemischteTuete: {
    de: 'Gemischte TÃ¼te: ein bisschen von allem.',
    en: 'Mixed bag: a bit of everything.'
  }
};

const formatSeconds = (ms: number) => Math.max(0, Math.ceil(ms / 1000));

const getCategoryLabel = (key: QuizCategory, lang: Lang) => categoryLabels[key]?.[lang] ?? key;

const getCategoryDescription = (key: QuizCategory, lang: Lang) => CATEGORY_DESCRIPTIONS[key]?.[lang] ?? '';

const BeamerView = ({ roomCode }: BeamerProps) => {
  const [screen, setScreen] = useState<BaseScreen>('lobby');
  const [showRules, setShowRules] = useState(false);
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
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [toast, setToast] = useState<string | null>(null);
  const [connectionStuck, setConnectionStuck] = useState(false);
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
  const [introSlides, setIntroSlides] = useState(INTRO_SLIDES);
  const [introIndex, setIntroIndex] = useState(0);
  const introTimerRef = useRef<number | null>(null);

  const timerRef = useRef<number | null>(null);
  const slotTimeoutRef = useRef<number | null>(null);

  const categories = useMemo(() => Object.keys(categoryLabels) as QuizCategory[], []);
  const t = translations[language];
  const handleReconnect = () => {
    setConnectionStatus('connecting');
    setToast(language === 'de' ? 'Verbindung wird aufgebaut...' : 'Reconnecting...');
    setTimeout(() => setToast(null), 2000);
    window.location.reload();
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

  // sockets
  useEffect(() => {
    setConnectionStatus('connecting');
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
      setShowRules(false);
      setQuestion(null);
      setQuestionMeta(null);
      setEvaluating(false);
      setAnswerVisible(false);
      setSolution(undefined);
      setQuestionPhase('answering');
      setSlotExiting(false);
    });

    socket.on('beamer:show-intro', (payload: { slides?: typeof INTRO_SLIDES }) => {
      setIntroSlides(payload?.slides ?? INTRO_SLIDES);
      setIntroIndex(0);
      setScreen('intro');
      setShowRules(false);
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
          setShowRules(false);
        }, 520);
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
      setShowRules(false);
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

    socket.on('languageChanged', ({ language: lang }: { language: Lang }) => {
      setLanguage(lang);
    });

    socket.on('beamer:show-rules', () => {
      setShowRules(true);
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
      setAnswerVisible(true); // Lösung direkt einblenden
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
      socket.disconnect();
    };
  }, [roomCode, language]);

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
    }, SLOT_SPIN_DURATION);

    return () => {
      if (slotTimeoutRef.current) {
        window.clearTimeout(slotTimeoutRef.current);
        slotTimeoutRef.current = null;
      }
    };
  }, [categories, slotMeta]);

  // rotate lobby category highlights
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
    viewMode === 'lobby' && categories.length > 0
      ? categoryColors[categories[highlightedCategoryIndex] as QuizCategory] ?? '#6dd5fa'
      : '#6dd5fa';
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
    return (
      <div style={{ ...cardFrame, padding: 0 }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 1100,
            margin: '0 auto',
            borderRadius: 28,
            padding: '28px 26px',
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(13,15,20,0.78)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
            overflow: 'hidden',
            minHeight: 280,
            transition: 'opacity 240ms ease, transform 240ms ease'
          }}
        >
          <div style={rulesHalo} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={pillRule}>{slide.badge || 'Intro'}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {introSlides.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setIntroIndex(i)}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: i === introIndex ? '#fbbf24' : 'rgba(255,255,255,0.25)',
                    transform: i === introIndex ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 120ms ease',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ color: '#cbd5e1', fontSize: 16, marginBottom: 6 }}>{slide.subtitle}</div>
          <div style={{ color: '#e2e8f0', fontSize: 34, fontWeight: 900, lineHeight: 1.2, marginBottom: 12 }}>
            {slide.title}
          </div>
          <div style={{ color: '#cbd5e1', fontSize: 18, lineHeight: 1.5 }}>{slide.body}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              style={{ ...cardButtonStyle, background: '#1f2733', color: '#e2e8f0' }}
              onClick={() => setIntroIndex((i) => (i - 1 + introSlides.length) % introSlides.length)}
            >
              Zurück
            </button>
            <button
              style={{ ...cardButtonStyle, background: '#fbbf24', color: '#0f141d' }}
              onClick={() => setIntroIndex((i) => (i + 1) % introSlides.length)}
            >
              Weiter
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main style={pageStyle}>
      {offlineBar(connectionStatus, language)}
      {toast && <div style={toastStyle}>{toast}</div>}
      <div style={beamerAurora(lobbyActiveColor)} />
      <div style={beamerGrid} />
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
        {viewMode === 'intro' && renderIntro()}
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
              ? 'Keine Verbindung seit >5s. Bitte WLAN/Backend prüfen.'
              : 'No connection for >5s. Please check Wi-Fi/backend.'}
          </div>
        )}
        {showRules && (
          <div style={cardFrame}>
            <section style={rulesCard}>
              <div style={rulesHalo} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ ...pillRule, background: 'rgba(255,255,255,0.1)' }}>Regeln</div>
                <div style={{ ...pillRule, background: 'rgba(0,0,0,0.35)' }}>{roomCode}</div>
              </div>
              <h1 style={rulesTitle}>Cozy Bingo Quiz</h1>
              <p style={rulesSubtitle}>
                1) Alle Teams beitreten & "Wir sind bereit" drücken. 2) Fragen kommen nacheinander. 3) Timer beachten, Antworten fixen. 4) Bei richtiger Antwort ein Bingo-Feld markieren.
              </p>
              <div style={rulesList}>
                <div style={pillRule}>Punkte pro Frage</div>
                <div style={pillRule}>Timer auto-stopp bei allen Antworten</div>
                <div style={pillRule}>Bingo nach korrekter Antwort</div>
              </div>
              <div style={{ marginTop: 12, color: 'rgba(226,232,240,0.7)', fontSize: 14 }}>
                Der Admin startet die erste Frage, sobald alle bereit sind.
              </div>
            </section>
          </div>
        )}
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
      </div>
    </main>
  );
};

const pageStyle: React.CSSProperties = {
  position: 'relative',
  minHeight: '100vh',
  background: 'var(--bg) url("/background.png") center/cover fixed',
  color: '#e2e8f0',
  overflow: 'hidden',
  padding: '28px 18px'
};

const beamerAurora = (color: string): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  background: `radial-gradient(circle at 20% 20%, ${color}33, transparent 32%), radial-gradient(circle at 80% 0%, ${color}26, transparent 38%)`,
  filter: 'blur(8px)',
  animation: 'aurora-shift 16s ease-in-out infinite'
});

const beamerGrid: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
  backgroundSize: '52px 52px',
  opacity: 0.25,
  pointerEvents: 'none'
};

  const beamerShell: React.CSSProperties = {
    position: 'relative',
    maxWidth: 1240,
    margin: '0 auto'
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
              ? 'Offline – Bitte neu laden'
              : 'Offline – please reload'}
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

const rulesCard: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 1100,
  margin: '0 auto',
  padding: '28px 26px',
  borderRadius: 28,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(13,15,20,0.78)',
  boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
  overflow: 'hidden'
};

const rulesHalo: React.CSSProperties = {
  position: 'absolute',
  inset: -20,
  background:
    'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08), transparent 42%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.12), transparent 40%)',
  opacity: 0.6,
  filter: 'blur(16px)',
  pointerEvents: 'none'
};

const rulesTitle: React.CSSProperties = {
  margin: '8px 0 10px',
  fontSize: 38,
  lineHeight: 1.2,
  color: '#e2e8f0',
  fontWeight: 900
};

const rulesSubtitle: React.CSSProperties = {
  margin: '0 0 12px',
  color: 'rgba(226,232,240,0.75)',
  fontSize: 16,
  lineHeight: 1.5
};

const rulesList: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  marginTop: 8
};

const pillRule: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  color: '#e2e8f0',
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontSize: 12
};

export default BeamerView;






