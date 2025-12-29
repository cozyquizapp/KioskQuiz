import cors from 'cors';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import studioRoutes from './routes/studio';
import {
  AnyQuestion,
  AnswerEntry,
  AnswerTieBreaker,
  BingoBoard,
  QuestionPhase,
  QuizCategory,
  QuizTemplate,
  ScreenState,
  SlotTransitionMeta,
  Team,
  SyncStatePayload,
  StateUpdatePayload,
  PotatoState,
  PotatoAttempt,
  PotatoConflict,
  BlitzState,
  BlitzPhase,
  BlitzSetResult,
  BlitzThemeOption,
  BlitzItemView,
  QuizBlitzTheme,
  QuizBlitzItem,
  CozyQuestionType,
  BunteTueteSubmission,
  BunteTueteTop5Submission,
  BunteTuetePrecisionSubmission,
  BunteTueteOneOfEightSubmission,
  BunteTueteOrderSubmission,
  BunteTuetePayload,
  CozyQuizDraft,
  CozyQuizMeta,
  CozyQuestionSlotTemplate,
  CozyPotatoThemeInput
} from '../../shared/quizTypes';
import { COZY_SLOT_TEMPLATE } from '../../shared/cozyTemplate';
import { CATEGORY_CONFIG } from '../../shared/categoryConfig';
import { mixedMechanicMap } from '../../shared/mixedMechanics';
import { questions, questionById } from './data/questions';
import { QuizMeta, Language, PotatoPhase } from '../../shared/quizTypes';
import { defaultQuizzes } from './data/quizzes';
import { normalizeText, similarityScore } from '../../shared/textNormalization';
import { DEBUG, DEFAULT_QUESTION_TIME, ROOM_IDLE_CLEANUP_MS, SLOT_DURATION_MS } from './constants';
import { INTRO_SLIDES } from './config/introSlides';
import {
  applyGameAction,
  INITIAL_GAME_STATE,
  CozyGameState,
  isQuestionInputOpen,
  GameStateAction
} from './game/stateMachine';

// --- Server setup ----------------------------------------------------------
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// static files for uploads
const uploadRoot = path.join(__dirname, '..', '..', 'uploads');
const uploadDir = path.join(uploadRoot, 'questions');

// Healthcheck / Room-Check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/rooms/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  return res.json({
    ok: true,
    room: roomCode,
    teams: Object.values(room.teams).length,
    hasQuestion: Boolean(room.currentQuestionId)
  });
});
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadRoot));
app.use('/api/studio', studioRoutes);

// usage tracking
const usagePath = path.join(__dirname, 'data', 'questionUsage.json');
type UsageEntry = { usedIn?: string[]; lastUsedAt?: string | null };
let questionUsageMap: Record<string, UsageEntry> = {};
try {
  if (fs.existsSync(usagePath)) {
    questionUsageMap = JSON.parse(fs.readFileSync(usagePath, 'utf-8'));
  }
} catch {
  questionUsageMap = {};
}
const persistQuestionUsage = () => {
  try {
    fs.writeFileSync(usagePath, JSON.stringify(questionUsageMap, null, 2), 'utf-8');
  } catch {
    // ignore
  }
};

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Nur Bildformate erlaubt'));
  }
});

// --- Types & State ---------------------------------------------------------
type RoomState = {
  roomCode: string;
  teams: Record<string, Team>;
  currentQuestionId: string | null;
  answers: Record<string, AnswerEntry>;
  quizId: string | null;
  questionOrder: string[];
  remainingQuestionIds: string[];
  askedQuestionIds: string[];
  teamBoards: Record<string, BingoBoard>;
  bingoEnabled: boolean;
  timerEndsAt: number | null;
  screen: ScreenState;
  questionPhase: QuestionPhase;
  lastActivityAt: number;
  language: Language;
  gameState: CozyGameState;
  stateHistory: CozyGameState[];
  potatoPool: PotatoThemeDefinition[];
  potatoBans: Record<string, PotatoThemeDefinition[]>;
  potatoBanLimits: Record<string, number>;
  potatoSelectedThemes: PotatoThemeDefinition[];
  potatoRoundIndex: number;
  potatoTurnOrder: string[];
  potatoLives: Record<string, number>;
  potatoUsedAnswers: string[];
  potatoUsedAnswersNormalized: string[];
  potatoLastAttempt: PotatoAttempt | null;
  potatoActiveTeamId: string | null;
  potatoPhase: PotatoPhase;
  potatoDeadlineAt: number | null;
  potatoTurnStartedAt: number | null;
  potatoTurnDurationMs: number;
  potatoLastWinnerId: string | null;
  potatoCurrentTheme: PotatoThemeDefinition | null;
  potatoLastConflict: PotatoConflict | null;
  segmentTwoBaselineScores: Record<string, number> | null;
  presetPotatoPool: PotatoThemeDefinition[];
  blitzPool: BlitzThemeOption[];
  blitzThemeLibrary: Record<string, QuizBlitzTheme>;
  blitzBans: Record<string, string[]>;
  blitzBanLimits: Record<string, number>;
  blitzSelectedThemes: BlitzThemeOption[];
  blitzSetIndex: number;
  blitzPhase: BlitzPhase;
  blitzDeadlineAt: number | null;
  blitzTheme: BlitzThemeOption | null;
  blitzItems: BlitzItemView[];
  blitzItemSolutions: { id: string; answer: string; aliases: string[] }[];
  blitzAnswersByTeam: Record<string, string[]>;
  blitzResultsByTeam: Record<string, BlitzSetResult>;
  blitzSubmittedTeamIds: string[];
  validationWarnings: string[];
};

const rooms = new Map<string, RoomState>();
const quizzes = new Map<string, QuizTemplate>(defaultQuizzes.map((q) => [q.id, q]));

const questionImagesPath = path.join(__dirname, 'data', 'questionImages.json');
let questionImageMap: Record<string, string> = {};
try {
  if (fs.existsSync(questionImagesPath)) {
    questionImageMap = JSON.parse(fs.readFileSync(questionImagesPath, 'utf-8'));
  }
} catch {
  questionImageMap = {};
}

// quiz layouts (presentation)
const quizLayoutPath = path.join(__dirname, 'data', 'quizLayouts.json');
type QuizLayout = {
  backgrounds?: { gradientA: string; gradientB: string; overlay: number };
  includeIntroOutro?: boolean;
  includeRuleSlides?: boolean;
  overrides?: Record<string, any>;
};
let quizLayoutMap: Record<string, QuizLayout> = {};
try {
  if (fs.existsSync(quizLayoutPath)) {
    quizLayoutMap = JSON.parse(fs.readFileSync(quizLayoutPath, 'utf-8'));
  }
} catch {
  quizLayoutMap = {};
}
const persistQuizLayouts = () => {
  try {
    fs.writeFileSync(quizLayoutPath, JSON.stringify(quizLayoutMap, null, 2), 'utf-8');
  } catch {
    // ignore
  }
};

// stats / leaderboard (minimal)
const statsPath = path.join(__dirname, 'data', 'quizStats.json');
type RunEntry = { quizId: string; date: string; winners: string[]; scores?: Record<string, number> };
type QuestionStat = { questionId: string; total: number; correct?: number; breakdown?: Record<string, number> };
type StatsState = { runs: RunEntry[]; questions: Record<string, QuestionStat> };
let statsState: StatsState = { runs: [], questions: {} };
try {
  if (fs.existsSync(statsPath)) {
    statsState = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
  }
} catch {
  statsState = { runs: [], questions: {} };
}
const persistStats = () => {
  try {
    fs.writeFileSync(statsPath, JSON.stringify(statsState, null, 2), 'utf-8');
  } catch {
    // ignore
  }
};

// --- Quiz Layout Endpoints --------------------------------------------------
app.get('/api/quizzes/:quizId/layout', (req, res) => {
  const { quizId } = req.params;
  const layout = quizLayoutMap[quizId] || null;
  res.json({ layout });
});

app.post('/api/quizzes/:quizId/layout', (req, res) => {
  const { quizId } = req.params;
  const payload = req.body as QuizLayout;
  quizLayoutMap[quizId] = {
    backgrounds: payload.backgrounds,
    includeIntroOutro: payload.includeIntroOutro,
    includeRuleSlides: payload.includeRuleSlides,
    overrides: payload.overrides
  };
  persistQuizLayouts();
  res.json({ ok: true, layout: quizLayoutMap[quizId] });
});

// Published quizzes (playable)
const publishedQuizzesPath = path.join(__dirname, 'data', 'publishedQuizzes.json');
type PublishedQuiz = {
  id: string;
  name: string;
  questionIds: string[];
  theme?: any;
  layout?: any;
  language?: string;
  meta?: QuizMeta | null;
  blitz?: { pool: QuizBlitzTheme[] } | null;
  potatoPool?: CozyPotatoThemeInput[] | null;
  enableBingo?: boolean;
};
let publishedQuizzes: PublishedQuiz[] = [];
try {
  if (fs.existsSync(publishedQuizzesPath)) {
    publishedQuizzes = JSON.parse(fs.readFileSync(publishedQuizzesPath, 'utf-8'));
  }
} catch {
  publishedQuizzes = [];
}
// load published into quizzes map
publishedQuizzes.forEach((q) => {
  const meta: QuizMeta = q.meta
    ? { ...q.meta }
    : q.language
    ? { language: q.language as Language }
    : {};
  if (!meta.language && q.language) {
    meta.language = q.language as Language;
  }
  quizzes.set(q.id, {
    id: q.id,
    name: q.name,
    mode: 'ordered',
    questionIds: q.questionIds,
    meta,
    blitz: q.blitz ?? null,
    potatoPool: q.potatoPool ?? null,
    enableBingo: q.enableBingo ?? false
  });
});
const persistPublished = () => {
  try {
    fs.writeFileSync(publishedQuizzesPath, JSON.stringify(publishedQuizzes, null, 2), 'utf-8');
  } catch {
    // ignore
  }
};

const upsertPublishedQuiz = (payload: PublishedQuiz) => {
  const stored: PublishedQuiz = {
    ...payload,
    meta: payload.meta ?? (payload.language ? { language: payload.language as Language } : null),
    language: payload.language ?? payload.meta?.language
  };
  const idx = publishedQuizzes.findIndex((q) => q.id === stored.id);
  if (idx >= 0) publishedQuizzes[idx] = stored;
  else publishedQuizzes.push(stored);

  const meta: QuizMeta =
    stored.meta && typeof stored.meta === 'object'
      ? { ...stored.meta }
      : stored.language
      ? { language: stored.language as Language }
      : {};
  if (!meta.language && stored.language) {
    meta.language = stored.language as Language;
  }

  quizzes.set(stored.id, {
    id: stored.id,
    name: stored.name,
    mode: 'ordered',
    questionIds: stored.questionIds,
    meta,
    blitz: stored.blitz ?? null,
    potatoPool: stored.potatoPool ?? null,
    enableBingo: stored.enableBingo ?? false
  });

  if (stored.layout || stored.theme) {
    quizLayoutMap[stored.id] = { overrides: { layout: stored.layout, theme: stored.theme } };
    persistQuizLayouts();
  }
  persistPublished();
  return stored;
};

app.get('/api/quizzes/published', (_req, res) => {
  res.json({ quizzes: publishedQuizzes });
});

app.post('/api/quizzes/publish', (req, res) => {
  const payload = req.body as PublishedQuiz;
  if (!payload?.id || !payload?.name || !Array.isArray(payload.questionIds)) {
    return res.status(400).json({ error: 'id, name, questionIds erforderlich' });
  }
  const stored = upsertPublishedQuiz(payload);
  res.json({ ok: true, quiz: stored });
});

const BLITZ_SETS = 3;
const BLITZ_ITEMS_PER_SET = 5;
const BLITZ_ANSWER_TIME_MS = 30000;

// Cozy60 Studio Drafts / Builder
const cozyDraftsPath = path.join(__dirname, 'data', 'cozyQuizDrafts.json');
let cozyDrafts: CozyQuizDraft[] = [];
try {
  if (fs.existsSync(cozyDraftsPath)) {
    cozyDrafts = JSON.parse(fs.readFileSync(cozyDraftsPath, 'utf-8'));
  }
} catch {
  cozyDrafts = [];
}
const persistCozyDrafts = () => {
  try {
    fs.writeFileSync(cozyDraftsPath, JSON.stringify(cozyDrafts, null, 2), 'utf-8');
  } catch {
    // ignore persistence issues, builder kann erneut speichern
  }
};

const BLITZ_PLACEHOLDER_TITLES = [
  'City Skylines',
  'Snack Attack',
  'Pop Lyrics',
  'Streaming Gesichter',
  'Travel Icons',
  'Retro Games',
  'Sport Flash',
  'Emoji Stories',
  'Logo Guessing',
  'Fashion Notes',
  'Nature Closeups',
  'Art Classics',
  'World Records',
  'Random Mix'
];

type PotatoThemeDefinition = {
  id: string;
  title: string;
  allowedAnswers: string[];
  allowedNormalized: string[];
  aliases: Record<string, string[]>;
  aliasNormalized: string[];
};

const buildPlaceholderBlitzPool = (draftId: string): QuizBlitzTheme[] =>
  BLITZ_PLACEHOLDER_TITLES.map((title, themeIdx) => ({
    id: `${draftId}-blitz-${themeIdx + 1}`,
    title,
    items: Array.from({ length: BLITZ_ITEMS_PER_SET }).map((_, itemIdx) => ({
      id: `${draftId}-blitz-${themeIdx + 1}-${itemIdx + 1}`,
      prompt: `Motiv ${itemIdx + 1}`,
      answer: '',
      aliases: []
    }))
  }));

const buildPlaceholderPotatoPool = (): PotatoThemeDefinition[] =>
  DEFAULT_POTATO_THEMES.map((title, idx) => ({
    id: `default-potato-${idx + 1}`,
    title,
    allowedAnswers: [],
    allowedNormalized: [],
    aliases: {},
    aliasNormalized: []
  }));

const ensureCozyMeta = (meta?: Partial<CozyQuizMeta>): CozyQuizMeta => ({
  title: meta?.title?.trim() || 'Neues Cozy Quiz 60',
  language: meta?.language ?? 'de',
  date: typeof meta?.date === 'number' ? meta.date : Date.now(),
  description: meta?.description?.trim() || null
});

const createBuntePayloadForSlot = (slot: CozyQuestionSlotTemplate, baseId: string, defaultPoints: number): BunteTuetePayload => {
  const maxPoints = slot.segmentIndex === 0 ? Math.max(defaultPoints, 2) : Math.max(defaultPoints, 3);
  if (slot.bunteKind === 'precision') {
    return {
      kind: 'precision',
      prompt: 'Praezisiere eure Antwort. Ladder von exakt bis grob.',
      ladder: [
        { label: 'Exakt', acceptedAnswers: [''], points: maxPoints },
        { label: 'Nah dran', acceptedAnswers: [''], points: Math.max(1, maxPoints - 1) }
      ],
      similarityThreshold: 0.82,
      maxPoints
    };
  }
  if (slot.bunteKind === 'oneOfEight') {
    const statements = Array.from({ length: 8 }).map((_, idx) => ({
      id: String.fromCharCode(65 + idx),
      text: `Statement ${idx + 1}`,
      isFalse: idx === 0
    }));
    return {
      kind: 'oneOfEight',
      prompt: 'Sieben Aussagen stimmen, eine ist falsch.',
      statements,
      chooseMode: 'id',
      maxPoints
    };
  }
  if (slot.bunteKind === 'order') {
    const items = Array.from({ length: 4 }).map((_, idx) => ({
      id: `${baseId}-item-${idx + 1}`,
      label: `Item ${idx + 1}`
    }));
    const criteriaId = 'default';
    return {
      kind: 'order',
      prompt: 'Ordnet die Items nach dem gewaehlten Kriterium.',
      items,
      criteriaOptions: [{ id: criteriaId, label: 'Standard', direction: 'asc' }],
      defaultCriteriaId: criteriaId,
      correctByCriteria: {
        [criteriaId]: items.map((item) => item.id)
      },
      partialPoints: Math.max(1, Math.floor(maxPoints / 2)),
      fullPoints: maxPoints,
      maxPoints
    };
  }
  // default to Top5
  const items = Array.from({ length: 5 }).map((_, idx) => ({
    id: `${baseId}-top-${idx + 1}`,
    label: `Option ${idx + 1}`
  }));
  return {
    kind: 'top5',
    prompt: 'Ordnet die fuenf Eintraege. 1 = oberste Position.',
    items,
    correctOrder: items.map((item) => item.id),
    scoringMode: 'position',
    maxPoints
  };
};

const createQuestionFromSlot = (slot: CozyQuestionSlotTemplate, draftId: string): AnyQuestion => {
  const questionId = `${draftId}-q${String(slot.index + 1).padStart(2, '0')}`;
  const baseQuestion = {
    id: questionId,
    question: slot.label,
    points: slot.defaultPoints,
    segmentIndex: slot.segmentIndex
  };
  if (slot.type === 'MU_CHO') {
    return {
      ...baseQuestion,
      category: 'Mu-Cho',
      mechanic: 'multipleChoice',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0
    } as AnyQuestion;
  }
  if (slot.type === 'SCHAETZCHEN') {
    return {
      ...baseQuestion,
      category: 'Schaetzchen',
      mechanic: 'estimate',
      targetValue: 0,
      unit: ''
    } as AnyQuestion;
  }
  if (slot.type === 'STIMMTS') {
    return {
      ...baseQuestion,
      category: 'Stimmts',
      mechanic: 'betting',
      options: ['Option A', 'Option B', 'Option C'],
      correctIndex: 0,
      pointsPool: 10
    } as AnyQuestion;
  }
  if (slot.type === 'CHEESE') {
    return {
      ...baseQuestion,
      category: 'Cheese',
      mechanic: 'imageQuestion',
      answer: '',
      imageUrl: ''
    } as AnyQuestion;
  }
  return {
    ...baseQuestion,
    category: 'GemischteTuete',
    mechanic: 'custom',
    type: 'BUNTE_TUETE',
    bunteTuete: createBuntePayloadForSlot(slot, questionId, slot.defaultPoints)
  } as AnyQuestion;
};

const buildDefaultCozyQuestions = (draftId: string): AnyQuestion[] =>
  COZY_SLOT_TEMPLATE.map((slot) => createQuestionFromSlot(slot, draftId));

const hydrateCozyDraft = (draft: CozyQuizDraft): CozyQuizDraft => ({
  ...draft,
  meta: ensureCozyMeta(draft.meta),
  questions: Array.isArray(draft.questions) && draft.questions.length === 20 ? draft.questions : buildDefaultCozyQuestions(draft.id),
  blitz: draft.blitz && Array.isArray(draft.blitz.pool) ? draft.blitz : { pool: buildPlaceholderBlitzPool(draft.id) },
  potatoPool: Array.isArray(draft.potatoPool) ? draft.potatoPool : buildPlaceholderPotatoPool(),
  enableBingo: Boolean(draft.enableBingo),
  status: draft.status || 'draft',
  createdAt: draft.createdAt || Date.now(),
  updatedAt: draft.updatedAt || Date.now(),
  lastPublishedAt: draft.lastPublishedAt ?? null
});

cozyDrafts = cozyDrafts.map((draft) => hydrateCozyDraft(draft));

const createNewCozyDraft = (meta?: Partial<CozyQuizMeta>): CozyQuizDraft => {
  const id = `cozy-draft-${uuid().slice(0, 8)}`;
  const now = Date.now();
  return {
    id,
    meta: ensureCozyMeta(meta),
    questions: buildDefaultCozyQuestions(id),
    blitz: { pool: buildPlaceholderBlitzPool(id) },
    potatoPool: buildPlaceholderPotatoPool(),
    enableBingo: false,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    lastPublishedAt: null
  };
};

const summarizeCozyDraft = (draft: CozyQuizDraft) => ({
  id: draft.id,
  title: draft.meta.title,
  language: draft.meta.language,
  date: draft.meta.date ?? null,
  status: draft.status,
  updatedAt: draft.updatedAt,
  createdAt: draft.createdAt,
  questionCount: draft.questions.length,
  potatoCount: draft.potatoPool.length,
  blitzThemes: draft.blitz?.pool.length ?? 0
});

const sanitizeCozyQuestions = (draftId: string, payload?: AnyQuestion[]): AnyQuestion[] => {
  const fallback = buildDefaultCozyQuestions(draftId);
  if (!Array.isArray(payload) || payload.length !== COZY_SLOT_TEMPLATE.length) {
    return fallback;
  }
  return payload.map((entry, idx) => {
    const fallbackQuestion = fallback[idx];
    if (!entry || typeof entry !== 'object') return fallbackQuestion;
    const merged = {
      ...fallbackQuestion,
      ...(entry as AnyQuestion)
    } as AnyQuestion;
    const rawId = (entry as AnyQuestion).id;
    merged.id = typeof rawId === 'string' && rawId.trim() ? rawId.trim() : fallbackQuestion.id;
    merged.points = Number((entry as any)?.points) || fallbackQuestion.points;
    (merged as any).segmentIndex = COZY_SLOT_TEMPLATE[idx].segmentIndex;
    if (!(entry as any)?.bunteTuete && fallbackQuestion && (fallbackQuestion as any).bunteTuete) {
      (merged as any).bunteTuete = (fallbackQuestion as any).bunteTuete;
    }
    return merged;
  });
};

const sanitizeBlitzPool = (draftId: string, pool?: QuizBlitzTheme[] | null): QuizBlitzTheme[] => {
  const fallbackPool = buildPlaceholderBlitzPool(draftId);
  if (!Array.isArray(pool) || !pool.length) {
    return fallbackPool;
  }
  return pool.map((theme, idx) => {
    const fallback = fallbackPool[idx] || fallbackPool[idx % fallbackPool.length];
    const baseId = typeof theme?.id === 'string' && theme.id.trim() ? theme.id.trim() : `${draftId}-blitz-${idx + 1}`;
    const baseTitle = theme?.title?.trim() || fallback.title || `Blitz-Thema ${idx + 1}`;
    const sourceItems = Array.isArray(theme?.items) && theme.items.length ? theme.items : fallback.items;
    const normalizedItems: QuizBlitzItem[] = sourceItems
      .slice(0, BLITZ_ITEMS_PER_SET)
      .map((item, itemIdx) => ({
        id: typeof item?.id === 'string' && item.id.trim() ? item.id.trim() : `${baseId}-${itemIdx + 1}`,
        prompt: typeof item?.prompt === 'string' ? item.prompt : fallback.items[itemIdx]?.prompt ?? `Motiv ${itemIdx + 1}`,
        mediaUrl: typeof item?.mediaUrl === 'string' ? item.mediaUrl : fallback.items[itemIdx]?.mediaUrl,
        answer: typeof item?.answer === 'string' ? item.answer : '',
        aliases: Array.isArray(item?.aliases) ? item.aliases.filter((alias): alias is string => typeof alias === 'string') : []
      }));
    while (normalizedItems.length < BLITZ_ITEMS_PER_SET) {
      const fillerIdx = normalizedItems.length;
      normalizedItems.push({
        id: `${baseId}-${fillerIdx + 1}`,
        prompt: `Motiv ${fillerIdx + 1}`,
        answer: '',
        aliases: []
      });
    }
    return {
      id: baseId,
      title: baseTitle,
      items: normalizedItems
    };
  });
};

const normalizePotatoThemeEntry = (value: unknown, idx: number): PotatoThemeDefinition | null => {
  if (typeof value === 'string') {
    const title = value.trim();
    if (!title) return null;
    const baseId = slugify(title) || `potato-theme-${idx + 1}`;
    return {
      id: baseId,
      title,
      allowedAnswers: [],
      allowedNormalized: [],
      aliases: {},
      aliasNormalized: []
    };
  }
  if (!value || typeof value !== 'object') return null;
  const source = value as {
    id?: string;
    title?: string;
    allowedAnswers?: unknown;
    aliases?: Record<string, unknown>;
  };
  const safeTitle =
    typeof source.title === 'string' && source.title.trim()
      ? source.title.trim()
      : typeof source.id === 'string' && source.id.trim()
      ? source.id.trim()
      : `Potato Theme ${idx + 1}`;
  const baseId =
    typeof source.id === 'string' && source.id.trim()
      ? source.id.trim()
      : slugify(safeTitle) || `potato-theme-${idx + 1}`;
  const allowedAnswers = Array.isArray(source.allowedAnswers)
    ? source.allowedAnswers
        .map((entry) => String(entry ?? '').trim())
        .filter((entry) => entry.length > 0)
    : [];
  const aliasValues: string[] = [];
  const aliasMap: Record<string, string[]> = {};
  if (source.aliases && typeof source.aliases === 'object') {
    Object.entries(source.aliases).forEach(([canonicalRaw, list]) => {
      if (!Array.isArray(list)) return;
      const canonical = String(canonicalRaw ?? '').trim();
      if (!canonical) return;
      const cleaned = Array.from(
        new Set(
          list
            .map((alias) => String(alias ?? '').trim())
            .filter((alias) => alias.length > 0)
        )
      );
      if (!cleaned.length) return;
      aliasMap[canonical] = cleaned;
      cleaned.forEach((entry) => aliasValues.push(entry));
    });
  }
  const allowedNormalized = allowedAnswers
    .map((entry) => normalizeText(entry))
    .filter((entry) => entry.length > 0);
  const aliasNormalized = aliasValues.map((entry) => normalizeText(entry)).filter((entry) => entry.length > 0);
  return {
    id: baseId,
    title: safeTitle,
    allowedAnswers,
    allowedNormalized,
    aliases: aliasMap,
    aliasNormalized
  };
};

const sanitizePotatoPool = (input?: unknown): PotatoThemeDefinition[] => {
  const normalized: PotatoThemeDefinition[] = [];
  const pushTheme = (theme: PotatoThemeDefinition | null) => {
    if (!theme) return;
    let finalId = theme.id || `potato-theme-${normalized.length + 1}`;
    let suffix = 1;
    while (normalized.some((entry) => entry.id === finalId)) {
      finalId = `${theme.id || `potato-theme-${normalized.length + 1}`}-${suffix++}`;
    }
    normalized.push({ ...theme, id: finalId });
  };
  if (Array.isArray(input)) {
    input.forEach((entry, idx) => pushTheme(normalizePotatoThemeEntry(entry, idx)));
  } else if (typeof input === 'string' && input.trim()) {
    input
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .forEach((entry, idx) => pushTheme(normalizePotatoThemeEntry(entry, idx)));
  }
  if (normalized.length) return normalized;
  return buildPlaceholderPotatoPool();
};

const clonePotatoThemes = (themes: PotatoThemeDefinition[]) => themes.map((theme) => ({ ...theme }));

const applyDraftUpdate = (draft: CozyQuizDraft, payload: Partial<CozyQuizDraft>): CozyQuizDraft => {
  const metaSource = payload.meta ? { ...draft.meta, ...payload.meta } : draft.meta;
  const updated: CozyQuizDraft = {
    ...draft,
    meta: ensureCozyMeta(metaSource),
    questions: payload.questions ? sanitizeCozyQuestions(draft.id, payload.questions as AnyQuestion[]) : draft.questions,
    blitz: { pool: sanitizeBlitzPool(draft.id, payload.blitz?.pool ?? draft.blitz?.pool) },
    potatoPool: sanitizePotatoPool(payload.potatoPool ?? draft.potatoPool),
    enableBingo: payload.enableBingo ?? draft.enableBingo,
    updatedAt: Date.now()
  };
  return hydrateCozyDraft(updated);
};

const findCozyDraftIndex = (draftId: string) => cozyDrafts.findIndex((draft) => draft.id === draftId);

const getCozyDraftOrFail = (draftId: string) => {
  const index = findCozyDraftIndex(draftId);
  if (index === -1) {
    throw new Error('Draft nicht gefunden');
  }
  return { draft: cozyDrafts[index], index };
};

// --- Stats Endpoints (minimal) ----------------------------------------------
app.get('/api/stats/leaderboard', (_req, res) => {
  const runs = statsState.runs.slice(-10).reverse();
  res.json({ runs });
});

app.post('/api/stats/run', (req, res) => {
  const entry = req.body as RunEntry;
  if (!entry.quizId || !entry.date || !Array.isArray(entry.winners)) {
    return res.status(400).json({ error: 'quizId, date, winners required' });
  }
  statsState.runs.push(entry);
  if (statsState.runs.length > 50) statsState.runs = statsState.runs.slice(-50);
  persistStats();
  res.json({ ok: true });
});

app.post('/api/stats/question', (req, res) => {
  const { questionId, correct, total, breakdown } = req.body as { questionId: string; correct?: number; total?: number; breakdown?: Record<string, number> };
  if (!questionId) return res.status(400).json({ error: 'questionId required' });
  const existing = statsState.questions[questionId] || { questionId, total: 0, correct: 0, breakdown: {} };
  existing.total += total ?? 0;
  if (typeof correct === 'number') existing.correct = (existing.correct || 0) + correct;
  if (breakdown) {
    existing.breakdown = existing.breakdown || {};
    Object.entries(breakdown).forEach(([key, val]) => {
      existing.breakdown![key] = (existing.breakdown![key] || 0) + val;
    });
  }
  statsState.questions[questionId] = existing;
  persistStats();
  res.json({ ok: true, stat: existing });
});

app.get('/api/stats/question/:questionId', (req, res) => {
  const stat = statsState.questions[req.params.questionId] || null;
  res.json({ stat });
});

// Cozy60 Builder API
app.get('/api/studio/cozy60', (_req, res) => {
  const list = [...cozyDrafts]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((draft) => summarizeCozyDraft(draft));
  res.json({ drafts: list });
});

app.post('/api/studio/cozy60', (req, res) => {
  try {
    const meta = req.body?.meta as Partial<CozyQuizMeta> | undefined;
    const draft = createNewCozyDraft(meta);
    cozyDrafts.push(draft);
    persistCozyDrafts();
    res.json({ draft, warnings: collectCozyDraftWarnings(draft) });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/api/studio/cozy60/:id', (req, res) => {
  try {
    const { draft } = getCozyDraftOrFail(req.params.id);
    res.json({ draft, warnings: collectCozyDraftWarnings(draft) });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

app.put('/api/studio/cozy60/:id', (req, res) => {
  try {
    const { draft, index } = getCozyDraftOrFail(req.params.id);
    const updated = applyDraftUpdate(draft, (req.body as Partial<CozyQuizDraft>) || {});
    cozyDrafts[index] = updated;
    persistCozyDrafts();
    res.json({ draft: updated, warnings: collectCozyDraftWarnings(updated) });
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Draft nicht gefunden' ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

app.post('/api/studio/cozy60/:id/publish', (req, res) => {
  try {
    const { draft, index } = getCozyDraftOrFail(req.params.id);
    const updates = (req.body?.draft || req.body?.updates) as Partial<CozyQuizDraft> | undefined;
    const updatedDraft = updates ? applyDraftUpdate(draft, updates) : draft;
    const now = Date.now();
    const finalized: CozyQuizDraft = {
      ...updatedDraft,
      status: 'published',
      lastPublishedAt: now,
      updatedAt: now
    };
    cozyDrafts[index] = finalized;
    const requestedQuizId = typeof req.body?.quizId === 'string' ? req.body.quizId : undefined;
    const quizId = buildQuizIdFromDraft(finalized, requestedQuizId);
    finalized.questions.forEach((question) => upsertCustomQuestion(question));
    persistCustomQuestions();

    const publishedMeta: QuizMeta = {
      description: finalized.meta.description || undefined,
      date: finalized.meta.date ?? now,
      language: finalized.meta.language
    };

    const publishedPayload: PublishedQuiz = {
      id: quizId,
      name: finalized.meta.title,
      questionIds: finalized.questions.map((question) => question.id),
      language: finalized.meta.language,
      meta: publishedMeta,
      blitz: finalized.blitz,
      potatoPool: finalized.potatoPool,
      enableBingo: finalized.enableBingo
    };
    upsertPublishedQuiz(publishedPayload);
    persistCozyDrafts();
    res.json({ ok: true, draft: finalized, quizId, warnings: collectCozyDraftWarnings(finalized) });
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Draft nicht gefunden' ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

// Custom Questions (erstellte/aktualisierte Fragen)
const customQuestionsPath = path.join(__dirname, 'data', 'customQuestions.json');
let customQuestions: AnyQuestion[] = [];
try {
  if (fs.existsSync(customQuestionsPath)) {
    customQuestions = JSON.parse(fs.readFileSync(customQuestionsPath, 'utf-8'));
  }
} catch {
  customQuestions = [];
}
// merge custom into base collections
customQuestions.forEach((q) => {
  questions.push(q);
  questionById.set(q.id, q);
});

// overrides (z. B. mixedMechanic)
const questionOverridesPath = path.join(__dirname, 'data', 'questionOverrides.json');
type QuestionOverride = {
  mixedMechanic?: string | null;
  imageOffsetX?: number;
  imageOffsetY?: number;
  logoOffsetX?: number;
  logoOffsetY?: number;
  catalogId?: string | null;
  mediaSlots?: { count: number; urls?: string[] } | null;
};
let questionOverrideMap: Record<string, QuestionOverride> = {};
try {
  if (fs.existsSync(questionOverridesPath)) {
    questionOverrideMap = JSON.parse(fs.readFileSync(questionOverridesPath, 'utf-8'));
  }
} catch {
  questionOverrideMap = {};
}

// --- Helpers ---------------------------------------------------------------
const ensureRoom = (roomCode: string): RoomState => {
  const normalized = (roomCode || '').trim().toUpperCase();
  const code = normalized || roomCode;
  if (!rooms.has(code)) {
    rooms.set(code, {
      roomCode: code,
      teams: {},
      currentQuestionId: null,
      answers: {},
      quizId: null,
      questionOrder: [],
      remainingQuestionIds: [],
      askedQuestionIds: [],
      teamBoards: {},
      bingoEnabled: false,
      timerEndsAt: null,
      screen: 'lobby',
      questionPhase: 'idle',
      lastActivityAt: Date.now(),
      language: 'de',
      gameState: INITIAL_GAME_STATE,
      stateHistory: [INITIAL_GAME_STATE],
      potatoPool: [],
      potatoBans: {},
      potatoBanLimits: {},
      potatoSelectedThemes: [],
      potatoRoundIndex: -1,
      potatoTurnOrder: [],
      potatoLives: {},
      potatoUsedAnswers: [],
      potatoUsedAnswersNormalized: [],
      potatoLastAttempt: null,
      potatoActiveTeamId: null,
      potatoPhase: 'IDLE',
      potatoDeadlineAt: null,
      potatoTurnStartedAt: null,
      potatoTurnDurationMs: POTATO_ANSWER_TIME_MS,
      potatoLastWinnerId: null,
      potatoCurrentTheme: null,
      potatoLastConflict: null,
      segmentTwoBaselineScores: null,
      presetPotatoPool: [],
      blitzPool: [],
      blitzThemeLibrary: {},
      blitzBans: {},
      blitzBanLimits: {},
      blitzSelectedThemes: [],
      blitzSetIndex: -1,
      blitzPhase: 'IDLE',
      blitzDeadlineAt: null,
      blitzTheme: null,
      blitzItems: [],
      blitzItemSolutions: [],
      blitzAnswersByTeam: {},
      blitzResultsByTeam: {},
      blitzSubmittedTeamIds: [],
      validationWarnings: []
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rooms.get(code)!;
};

const touchRoom = (room: RoomState) => {
  room.lastActivityAt = Date.now();
};

const log = (roomCode: string, message: string, ...args: unknown[]) => {
  if (!DEBUG) return;
  console.log(`[${roomCode}] ${message}`, ...args);
};

const POTATO_ROUNDS = 3;
const POTATO_ANSWER_TIME_MS = 5000;
const DEFAULT_POTATO_THEMES = [
  'Songs mit Städtenamen',
  'Filme aus den 90ern',
  'Berühmte Duos',
  'Kartoffelgerichte',
  'Sportarten mit Ball',
  'Wörter mit Doppelbuchstaben',
  'Fragen zu Europa',
  'Süßigkeitenmarken',
  'Fabelwesen',
  'Berge in Europa',
  'Streetfood Klassiker',
  'Streaming Hits',
  'Nordische Mythen',
  'Retro Spielkonsolen'
]; // TODO(LEGACY): durch echtes Themen-Set ersetzen
const sanitizeThemeList = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((val) => String(val ?? '').trim())
          .filter((val) => val.length > 0)
      )
    );
  }
  if (typeof input === 'string') {
    return sanitizeThemeList(input.split(/\r?\n/));
  }
  return [];
};

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 4;
const SINGLE_SESSION_MODE = (() => {
  const source =
    process.env.SINGLE_SESSION_MODE !== undefined
      ? process.env.SINGLE_SESSION_MODE
      : process.env.COZY_SINGLE_SESSION !== undefined
      ? process.env.COZY_SINGLE_SESSION
      : 'true';
  return source?.toString().trim().toLowerCase() === 'true';
})();
const DEFAULT_ROOM_CODE = ((process.env.SINGLE_SESSION_ROOM_CODE || 'MAIN').toString().trim().toUpperCase() || 'MAIN');
const POTATO_SIMILARITY_THRESHOLD = 0.85;
const POTATO_AUTOPILOT = (() => {
  const raw = process.env.POTATO_AUTOPILOT;
  if (raw === undefined || raw === null) return true;
  return raw.toString().trim().toLowerCase() !== 'false';
})();
const POTATO_TIMEOUT_AUTOSTRIKE = (() => {
  const raw = process.env.POTATO_TIMEOUT_AUTOSTRIKE;
  if (raw === undefined || raw === null) return false;
  return raw.toString().trim().toLowerCase() === 'true';
})();
const BLITZ_SIMILARITY_THRESHOLD = 0.85;
const DEFAULT_BLITZ_THEMES = [
  'Musik',
  'Filme',
  'Serien',
  'Städte',
  'Sportarten',
  'Snacks',
  'Schauspieler',
  'Cartoons',
  'Videospiele',
  'Tiere'
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildQuizIdFromDraft = (draft: CozyQuizDraft, requested?: string | null) => {
  if (requested && requested.trim()) return requested.trim();
  const base = slugify(draft.meta?.title || draft.id);
  return base ? `cozy-quiz-${base}` : `cozy-quiz-${draft.id}`;
};

const buildLegacyBlitzTheme = (title: string): QuizBlitzTheme => {
  const slug = slugify(title) || `theme-${Date.now()}`;
  const items: QuizBlitzItem[] = Array.from({ length: BLITZ_ITEMS_PER_SET }).map((_, idx) => ({
    id: `${slug}-${idx + 1}`,
    prompt: `${title} ${idx + 1}`,
    answer: `${title} ${idx + 1}`,
    aliases: []
  }));
  return { id: slug, title, items };
};

const toBlitzOption = (theme: QuizBlitzTheme): BlitzThemeOption => ({
  id: theme.id,
  title: theme.title
});

const normalizeBlitzTheme = (theme: QuizBlitzTheme, fallbackIndex = 0): QuizBlitzTheme => {
  const safeTitle = theme.title?.trim() || `Blitz-Thema ${fallbackIndex + 1}`;
  const baseId = theme.id?.trim() || `${slugify(safeTitle)}-${fallbackIndex}`;
  const normalizedItems = (theme.items || []).map((item, idx) => ({
    ...item,
    id: item.id?.trim() || `${baseId}-${idx + 1}`
  }));
  return { ...theme, id: baseId, title: safeTitle, items: normalizedItems };
};

const selectBlitzItems = (
  theme: QuizBlitzTheme
): { views: BlitzItemView[]; solutions: { id: string; answer: string; aliases: string[] }[] } => {
  const pool = theme.items && theme.items.length > 0 ? [...theme.items] : buildLegacyBlitzTheme(theme.title).items;
  const extended: QuizBlitzItem[] = [];
  while (extended.length < BLITZ_ITEMS_PER_SET) {
    extended.push(...pool);
  }
  const chosen = extended.slice(0, BLITZ_ITEMS_PER_SET);
  const views: BlitzItemView[] = chosen.map((item) => ({
    id: item.id,
    prompt: item.prompt ?? null,
    mediaUrl: item.mediaUrl ?? null
  }));
  const solutions = chosen.map((item) => ({
    id: item.id,
    answer: item.answer,
    aliases: item.aliases ?? []
  }));
  return { views, solutions };
};

const generateRoomCode = () => {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    const idx = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[idx];
  }
  return code;
};

const createRoomCode = () => {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }
  return code;
};

const normalizeRoomCode = (value?: string | null) => {
  const raw = (value || '').trim().toUpperCase();
  if (raw) return raw;
  return SINGLE_SESSION_MODE ? DEFAULT_ROOM_CODE : undefined;
};

const requireRoomCode = (value?: string | null) => {
  const normalized = normalizeRoomCode(value);
  if (!normalized) throw new Error('roomCode fehlt');
  return normalized;
};

const getSegmentTwoGain = (room: RoomState, teamId: string) => {
  const baseline = room.segmentTwoBaselineScores?.[teamId];
  const current = room.teams[teamId]?.score ?? 0;
  if (baseline === undefined || baseline === null) return 0;
  return current - baseline;
};

const compareTeamsWithTieBreak = (
  room: RoomState,
  a: Team,
  b: Team,
  direction: 'asc' | 'desc'
) => {
  const dir = direction === 'asc' ? 1 : -1;
  const scoreDiff = ((a.score ?? 0) - (b.score ?? 0)) * dir;
  if (scoreDiff !== 0) return scoreDiff;
  const gainDiff = (getSegmentTwoGain(room, a.id) - getSegmentTwoGain(room, b.id)) * dir;
  if (gainDiff !== 0) return gainDiff;
  return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
};

const getTeamsByScore = (room: RoomState, direction: 'asc' | 'desc' = 'desc') =>
  Object.values(room.teams).sort((a, b) => compareTeamsWithTieBreak(room, a, b, direction));

const computePotatoBanLimits = (room: RoomState): Record<string, number> => {
  const teams = getTeamsByScore(room, 'desc');
  const limits: Record<string, number> = {};
  if (teams.length <= 1) return limits;
  if (teams.length === 2) {
    limits[teams[0].id] = 2;
    limits[teams[1].id] = 1;
    return limits;
  }
  if (teams.length >= 3 && teams.length <= 6) {
    teams.forEach((t, idx) => {
      limits[t.id] = 1;
      if (idx === 0) limits[t.id] = 2;
    });
    return limits;
  }
  teams.forEach((team, idx) => {
    if (idx === 0) limits[team.id] = 2;
    else if (idx === 1 || idx === 2) limits[team.id] = 1;
    else limits[team.id] = 0;
  });
  return limits;
};

const alivePotatoTeams = (room: RoomState) =>
  room.potatoTurnOrder.filter((teamId) => (room.potatoLives[teamId] ?? 0) > 0);

const assignPotatoTurnOrder = (room: RoomState) => {
  const teamsDesc = getTeamsByScore(room, 'desc');
  if (teamsDesc.length <= 2) {
    room.potatoTurnOrder = teamsDesc.map((t) => t.id);
    return;
  }
  room.potatoTurnOrder = getTeamsByScore(room, 'asc').map((t) => t.id);
};

const initialPotatoLives = (room: RoomState) => {
  const teamCount = Object.keys(room.teams).length;
  const lives: Record<string, number> = {};
  Object.keys(room.teams).forEach((teamId) => {
    lives[teamId] = teamCount <= 2 ? 1 : 2;
  });
  return lives;
};

const setPotatoActiveTeam = (room: RoomState, teamId: string | null) => {
  room.potatoActiveTeamId = teamId;
  if (teamId) {
    room.potatoTurnStartedAt = Date.now();
    room.potatoDeadlineAt = room.potatoTurnStartedAt + POTATO_ANSWER_TIME_MS;
    room.potatoTurnDurationMs = POTATO_ANSWER_TIME_MS;
  } else {
    room.potatoTurnStartedAt = null;
    room.potatoDeadlineAt = null;
  }
};

const setFirstPotatoTurn = (room: RoomState) => {
  const alive = alivePotatoTeams(room);
  setPotatoActiveTeam(room, alive[0] ?? null);
};

const advancePotatoTurn = (room: RoomState) => {
  const alive = alivePotatoTeams(room);
  if (!alive.length) {
    setPotatoActiveTeam(room, null);
    return;
  }
  const currentIdx = alive.indexOf(room.potatoActiveTeamId ?? '');
  const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % alive.length : 0;
  setPotatoActiveTeam(room, alive[nextIdx]);
  room.potatoLastConflict = null;
};

const completePotatoRound = (room: RoomState, winnerId: string | null) => {
  room.potatoPhase = 'ROUND_END';
  setPotatoActiveTeam(room, null);
  room.potatoLastConflict = null;
  room.potatoLastWinnerId = winnerId;
  if (winnerId && room.teams[winnerId]) {
    room.teams[winnerId].score = (room.teams[winnerId].score ?? 0) + 3;
  }
};

const applyPotatoStrike = (room: RoomState, teamId: string) => {
  if (!room.potatoLives[teamId]) return;
  room.potatoLives[teamId] = Math.max(0, room.potatoLives[teamId] - 1);
  room.potatoLastConflict = null;
  const alive = alivePotatoTeams(room);
  if (alive.length <= 1) {
    completePotatoRound(room, alive[0] ?? null);
    return;
  }
  advancePotatoTurn(room);
};

const maybeAutoAdvancePotato = (room: RoomState) => {
  if (!POTATO_AUTOPILOT) return;
  if (room.potatoPhase !== 'PLAYING') return;
  advancePotatoTurn(room);
};

const maybeHandlePotatoTimeoutAutoStrike = (room: RoomState) => {
  if (!POTATO_TIMEOUT_AUTOSTRIKE) return;
  if (room.potatoPhase !== 'PLAYING') return;
  if (!room.potatoActiveTeamId) return;
  applyPotatoStrike(room, room.potatoActiveTeamId);
};

const handlePotatoAttemptAftermath = (room: RoomState, attempt: PotatoAttempt) => {
  if (attempt.verdict === 'timeout') {
    maybeHandlePotatoTimeoutAutoStrike(room);
    return;
  }
  if (attempt.verdict === 'ok') {
    maybeAutoAdvancePotato(room);
  }
};

const startPotatoRound = (room: RoomState) => {
  if (room.potatoSelectedThemes.length === 0) {
    throw new Error('Keine Themen für Heisse Kartoffel ausgewählt');
  }
  if (room.potatoRoundIndex >= POTATO_ROUNDS - 1) {
    throw new Error('Alle Runden wurden bereits gespielt');
  }
  const nextIndex = room.potatoRoundIndex + 1;
  if (!room.potatoSelectedThemes[nextIndex]) {
    throw new Error('Nicht genug Themen vorhanden');
  }
  room.potatoRoundIndex = nextIndex;
  room.potatoPhase = 'PLAYING';
  assignPotatoTurnOrder(room);
  room.potatoLives = initialPotatoLives(room);
  room.potatoUsedAnswers = [];
  room.potatoUsedAnswersNormalized = [];
  room.potatoLastAttempt = null;
  room.potatoCurrentTheme = room.potatoSelectedThemes[nextIndex] ?? null;
  room.potatoLastConflict = null;
  room.potatoActiveTeamId = null;
  setFirstPotatoTurn(room);
};

const evaluatePotatoAttempt = (
  room: RoomState,
  teamId: string,
  rawInput: string,
  options?: { overrideDuplicate?: boolean }
): PotatoAttempt => {
  if (room.potatoPhase !== 'PLAYING') throw new Error('Keine aktive Runde');
  if (!room.potatoActiveTeamId) throw new Error('Kein aktives Team');
  if (room.potatoActiveTeamId !== teamId) throw new Error('Dieses Team ist nicht am Zug');
  const text = (rawInput ?? '').trim().slice(0, 160);
  const normalized = text ? normalizeText(text) : '';
  const attempt: PotatoAttempt = {
    id: uuid(),
    teamId,
    text,
    normalized,
    verdict: 'pending',
    at: Date.now()
  };
  if (!text) {
    attempt.verdict = 'invalid';
    attempt.reason = 'empty';
    room.potatoLastAttempt = attempt;
    return attempt;
  }
  if (room.potatoDeadlineAt && Date.now() > room.potatoDeadlineAt) {
    attempt.verdict = 'timeout';
    attempt.reason = 'timeout';
    room.potatoLastAttempt = attempt;
    return attempt;
  }
  const duplicateIdx = room.potatoUsedAnswersNormalized.findIndex((entry) => entry === normalized);
  if (duplicateIdx >= 0 && !options?.overrideDuplicate) {
    attempt.verdict = 'dup';
    attempt.reason = 'duplicate';
    room.potatoLastConflict = {
      type: 'duplicate',
      answer: text,
      normalized,
      conflictingAnswer: room.potatoUsedAnswers[duplicateIdx] ?? null
    };
    room.potatoLastAttempt = attempt;
    return attempt;
  }
  if (!options?.overrideDuplicate) {
    let bestIdx = -1;
    let bestScore = 0;
    room.potatoUsedAnswersNormalized.forEach((entry, idx) => {
      const score = similarityScore(entry, normalized);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0 && bestScore >= POTATO_SIMILARITY_THRESHOLD) {
      attempt.verdict = 'dup';
      attempt.reason = 'similar';
      room.potatoLastConflict = {
        type: 'similar',
        answer: text,
        normalized,
        conflictingAnswer: room.potatoUsedAnswers[bestIdx] ?? null
      };
      room.potatoLastAttempt = attempt;
      return attempt;
    }
  }
  const theme = room.potatoCurrentTheme;
  if (theme && theme.allowedNormalized.length) {
    const allowedPool = [...theme.allowedNormalized, ...theme.aliasNormalized];
    if (!allowedPool.includes(normalized)) {
      attempt.verdict = 'invalid';
      attempt.reason = 'not-listed';
      room.potatoLastConflict = null;
      room.potatoLastAttempt = attempt;
      return attempt;
    }
  }
  attempt.verdict = 'ok';
  room.potatoLastConflict = null;
  room.potatoUsedAnswers = [...room.potatoUsedAnswers, text];
  room.potatoUsedAnswersNormalized = [...room.potatoUsedAnswersNormalized, normalized];
  room.potatoLastAttempt = attempt;
  return attempt;
};

const finishPotatoStage = (room: RoomState) => {
  room.potatoPhase = 'DONE';
  setPotatoActiveTeam(room, null);
  room.potatoLastConflict = null;
  applyRoomState(room, { type: 'FORCE', next: 'AWARDS' });
};

const resetBlitzCollections = (room: RoomState) => {
  room.blitzAnswersByTeam = {};
  room.blitzResultsByTeam = {};
  room.blitzSubmittedTeamIds = [];
};

const startBlitzSet = (room: RoomState) => {
  if (room.blitzPhase === 'PLAYING') throw new Error('Blitz-Set läuft bereits');
  if (room.blitzSelectedThemes.length < BLITZ_SETS) {
    throw new Error('Nicht genug Blitz-Themen ausgewählt');
  }
  if (room.blitzSetIndex >= BLITZ_SETS - 1) {
    throw new Error('Alle Blitz-Sets wurden gespielt');
  }
  const nextIndex = room.blitzSetIndex + 1;
  room.blitzSetIndex = nextIndex;
  room.blitzTheme = room.blitzSelectedThemes[nextIndex] ?? null;
  const themeDef = room.blitzTheme ? room.blitzThemeLibrary[room.blitzTheme.id] : null;
  if (!themeDef) {
    const fallback = buildLegacyBlitzTheme(room.blitzTheme?.title || `Set ${nextIndex + 1}`);
    room.blitzThemeLibrary[fallback.id] = fallback;
  }
  const resolvedTheme = room.blitzTheme ? room.blitzThemeLibrary[room.blitzTheme.id] : null;
  if (resolvedTheme) {
    const { views, solutions } = selectBlitzItems(resolvedTheme);
    room.blitzItems = views;
    room.blitzItemSolutions = solutions;
  } else {
    const placeholder = buildLegacyBlitzTheme(room.blitzTheme?.title || `Set ${nextIndex + 1}`);
    const { views, solutions } = selectBlitzItems(placeholder);
    room.blitzItems = views;
    room.blitzItemSolutions = solutions;
    room.blitzThemeLibrary[placeholder.id] = placeholder;
    room.blitzTheme = toBlitzOption(placeholder);
  }
  resetBlitzCollections(room);
  room.blitzPhase = 'PLAYING';
  room.blitzDeadlineAt = Date.now() + BLITZ_ANSWER_TIME_MS;
};

const lockBlitzSet = (room: RoomState) => {
  if (room.blitzPhase !== 'PLAYING') return;
  room.blitzPhase = 'SET_END';
  room.blitzDeadlineAt = null;
};

const enforceBlitzDeadline = (room: RoomState) => {
  if (room.blitzPhase === 'PLAYING' && room.blitzDeadlineAt && Date.now() > room.blitzDeadlineAt) {
    lockBlitzSet(room);
  }
};

const computeBlitzResults = (room: RoomState) => {
  if (!room.blitzItems.length) throw new Error('Keine Blitz-Items gesetzt');
  const teamIds = Object.keys(room.teams);
  const provisional: Record<string, BlitzSetResult> = {};
  teamIds.forEach((teamId) => {
    const answers = room.blitzAnswersByTeam[teamId] ?? [];
    let correctCount = 0;
    answers.slice(0, BLITZ_ITEMS_PER_SET).forEach((answer, idx) => {
      const solution = room.blitzItemSolutions[idx];
      if (!solution) return;
      const normalized = normalizeText(answer);
      const variants = [solution.answer, ...(solution.aliases || [])].map((entry) => normalizeText(entry));
      const bestScore = variants.reduce((max, candidate) => Math.max(max, similarityScore(candidate, normalized)), 0);
      if (bestScore >= BLITZ_SIMILARITY_THRESHOLD) {
        correctCount += 1;
      }
    });
    provisional[teamId] = { correctCount, pointsAwarded: 0 };
  });

  const standings = teamIds
    .map((teamId) => ({
      teamId,
      correct: provisional[teamId]?.correctCount ?? 0
    }))
    .sort((a, b) => b.correct - a.correct);

  const activeTeams = standings.filter((entry) => room.teams[entry.teamId]);
  const teamCount = activeTeams.length;
  if (teamCount <= 1) {
    room.blitzResultsByTeam = provisional;
    room.blitzPhase = 'SET_END';
    room.blitzDeadlineAt = null;
    return;
  }

  if (teamCount <= 2) {
    const [first, second] = activeTeams;
    if (!first) return;
    if (!second || first.correct === second.correct) {
      provisional[first.teamId].pointsAwarded = 1;
      if (second) provisional[second.teamId].pointsAwarded = 1;
      if (room.teams[first.teamId]) room.teams[first.teamId].score = (room.teams[first.teamId].score ?? 0) + 1;
      if (second && room.teams[second.teamId])
        room.teams[second.teamId].score = (room.teams[second.teamId].score ?? 0) + 1;
    } else if (first.correct > second.correct) {
      provisional[first.teamId].pointsAwarded = 2;
      if (room.teams[first.teamId]) room.teams[first.teamId].score = (room.teams[first.teamId].score ?? 0) + 2;
    } else {
      provisional[second.teamId].pointsAwarded = 2;
      if (room.teams[second.teamId]) room.teams[second.teamId].score = (room.teams[second.teamId].score ?? 0) + 2;
    }
    room.blitzResultsByTeam = provisional;
    room.blitzPhase = 'SET_END';
    room.blitzDeadlineAt = null;
    if (room.blitzSetIndex >= BLITZ_SETS - 1) {
      finishBlitzStage(room);
    }
    return;
  }

  let currentPlace = 1;
  for (let i = 0; i < activeTeams.length; ) {
    const same = activeTeams.filter((entry) => entry.correct === activeTeams[i].correct);
    const points = currentPlace === 1 ? 2 : currentPlace === 2 ? 1 : 0;
    same.forEach((entry) => {
      provisional[entry.teamId].pointsAwarded = points;
      if (points > 0 && room.teams[entry.teamId]) {
        room.teams[entry.teamId].score = (room.teams[entry.teamId].score ?? 0) + points;
      }
    });
    i += same.length;
    currentPlace += same.length;
    if (currentPlace > 2) break;
  }
  room.blitzResultsByTeam = provisional;
  room.blitzPhase = 'SET_END';
  room.blitzDeadlineAt = null;
  if (room.blitzSetIndex >= BLITZ_SETS - 1) {
    finishBlitzStage(room);
  }
};

const finishBlitzStage = (room: RoomState) => {
  room.blitzPhase = 'DONE';
  room.blitzDeadlineAt = null;
  room.blitzTheme = null;
  room.blitzItems = [];
  room.blitzItemSolutions = [];
  applyRoomState(room, { type: 'FORCE', next: 'SCOREBOARD_PAUSE' });
};

const baseBingoCategories: QuizCategory[] = (['Schaetzchen', 'Mu-Cho', 'Stimmts', 'Cheese', 'GemischteTuete'] as QuizCategory[]).flatMap(
  (c) => Array.from({ length: 5 }, () => c)
);

const hasTripleSequence = (categories: QuizCategory[]) => {
  const idx = (row: number, col: number) => row * 5 + col;
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col <= 2; col += 1) {
      const a = categories[idx(row, col)];
      const b = categories[idx(row, col + 1)];
      const c = categories[idx(row, col + 2)];
      if (a === b && b === c) return true;
    }
  }
  for (let col = 0; col < 5; col += 1) {
    for (let row = 0; row <= 2; row += 1) {
      const a = categories[idx(row, col)];
      const b = categories[idx(row + 1, col)];
      const c = categories[idx(row + 2, col)];
      if (a === b && b === c) return true;
    }
  }
  return false;
};

const shuffleCategories = () => {
  const pool = [...baseBingoCategories];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
};

const generateBingoBoard = (): BingoBoard => {
  let candidate = shuffleCategories();
  let attempts = 0;
  while (hasTripleSequence(candidate) && attempts < 200) {
    candidate = shuffleCategories();
    attempts += 1;
  }
  return candidate.map((cat) => ({ category: cat, marked: false }));
};

const computeCategoryTotals = (order: string[]): Record<QuizCategory, number> => {
  const totals: Record<QuizCategory, number> = {
    Schaetzchen: 0,
    'Mu-Cho': 0,
    Stimmts: 0,
    Cheese: 0,
    GemischteTuete: 0
  };
  order.forEach((id) => {
    const q = questionById.get(id);
    if (q) totals[q.category] += 1;
  });
  return totals;
};

const buildQuestionMeta = (room: RoomState, questionId: string) => {
  const order = room.questionOrder.length > 0 ? room.questionOrder : questions.map((q) => q.id);
  const question = questionById.get(questionId);
  if (!question) return null;

  const position = order.findIndex((id) => id === questionId);
  const globalIndex = Math.max(0, position) + 1;
  const globalTotal = order.length || questions.length;
  const totals = computeCategoryTotals(order);
  const categoryTotal = totals[question.category] || 0;
  const categoryIndex =
    position >= 0
      ? order.slice(0, position + 1).filter((id) => questionById.get(id)?.category === question.category).length
      : 1;

  const deLabel = CATEGORY_CONFIG[question.category]?.label ?? question.category;
  const enLabel = CATEGORY_CONFIG[question.category]?.labelEn ?? deLabel;
  const categoryName = combineText(deLabel, enLabel, room.language);

  return {
    globalIndex,
    globalTotal,
    categoryIndex,
    categoryTotal,
    categoryKey: question.category,
    categoryName
  };
};

const buildSlotMeta = (
  question: AnyQuestion,
  indexInCategory: number,
  totalInCategory: number,
  language: Language
): SlotTransitionMeta => {
  const cfg = CATEGORY_CONFIG[question.category];
  const deLabel = cfg?.label ?? question.category;
  const enLabel = cfg?.labelEn ?? deLabel;
  const label = combineText(deLabel, enLabel, language);

  const meta: SlotTransitionMeta = {
    categoryId: question.category,
    categoryLabel: label,
    categoryIcon: cfg?.icon ?? '/logo.png',
    questionIndex: indexInCategory,
    totalQuestionsInCategory: totalInCategory
  };

  if (question.category === 'GemischteTuete' && question.mixedMechanic) {
    const info = mixedMechanicMap[question.mixedMechanic];
    if (info) {
      meta.mechanicId = info.id;
      meta.mechanicLabel = info.label;
      meta.mechanicShortLabel = info.shortLabel;
      meta.mechanicIcon = info.icon;
    }
  }
  return meta;
};

const buildSyncState = (room: RoomState): SyncStatePayload => {
  const question = room.currentQuestionId ? questionById.get(room.currentQuestionId) : null;
  const localized = question ? localizeQuestion(applyOverrides(question), room.language) : null;
  const meta = question && room.currentQuestionId ? buildQuestionMeta(room, room.currentQuestionId) : null;
  const slotMeta = null;
  return {
    screen: room.screen,
    language: room.language,
    questionPhase: room.questionPhase,
    timerEndsAt: room.timerEndsAt,
    question: localized ?? null,
    questionMeta: meta,
    slotMeta
  };
};

const applyOverrides = (question: AnyQuestion): AnyQuestion => {
  let q: AnyQuestion = question;
  if (questionImageMap[question.id]) {
    q = { ...q, imageUrl: questionImageMap[question.id] };
  }
  const override = questionOverrideMap[question.id];
  if (override?.mixedMechanic) {
    q = { ...q, mixedMechanic: override.mixedMechanic as any };
  }
  if (override?.catalogId !== undefined) {
    q = { ...q, catalogId: override.catalogId || 'default' };
  } else if (!(q as any).catalogId) {
    q = { ...q, catalogId: 'default' };
  }
  if (override?.mediaSlots) {
    q = { ...q, mediaSlots: override.mediaSlots || undefined };
  }
  if (
    override &&
    (override.imageOffsetX !== undefined ||
      override.imageOffsetY !== undefined ||
      override.logoOffsetX !== undefined ||
      override.logoOffsetY !== undefined)
  ) {
    q = {
      ...(q as any),
      layout: {
        imageOffsetX: override.imageOffsetX ?? 0,
        imageOffsetY: override.imageOffsetY ?? 0,
        logoOffsetX: override.logoOffsetX ?? 0,
        logoOffsetY: override.logoOffsetY ?? 0
      }
    } as AnyQuestion;
  }
  return q as AnyQuestion;
};

const combineText = <T extends string | undefined>(deVal: T, enVal: T, language: Language): T => {
  if (!enVal) return deVal;
  if (language === 'en') return enVal;
  if (language === 'both') {
    if ((deVal ?? '') === (enVal ?? '')) return deVal;
    return `${deVal ?? ''}${deVal && enVal ? ' / ' : ''}${enVal}` as T;
  }
  return deVal;
};

const combineArray = (deArr: string[], enArr: string[] | undefined, language: Language) => {
  if (!enArr || language === 'de') return deArr;
  if (language === 'en') return enArr;
  const max = Math.max(deArr.length, enArr.length);
  const combined: string[] = [];
  for (let i = 0; i < max; i += 1) {
    const deVal = deArr[i] ?? '';
    const enVal = enArr[i] ?? '';
    combined.push(combineText(deVal, enVal, language));
  }
  return combined;
};

const localizeQuestion = (question: AnyQuestion, language: Language): AnyQuestion => {
  const base: any = { ...question };
  if (questionImageMap[question.id]) base.imageUrl = questionImageMap[question.id];
  base.question = combineText(question.question, (question as any).questionEn, language);

  if (question.mechanic === 'multipleChoice') {
    const deOptions = (question as any).options ?? [];
    base.options = combineArray(deOptions, (question as any).optionsEn, language);
  }
  if (question.mechanic === 'sortItems') {
    const deItems = (question as any).items ?? [];
    base.items = combineArray(deItems, (question as any).itemsEn, language);
    const deOrder = (question as any).correctOrder ?? [];
    base.correctOrder = combineArray(deOrder, (question as any).correctOrderEn, language);
    const hintDe = (question as any).hint;
    const hintEn = (question as any).hintEn;
    if (hintDe || hintEn) base.hint = combineText(hintDe, hintEn, language);
  }
  if (question.mechanic === 'imageQuestion') {
    base.answer = combineText((question as any).answer, (question as any).answerEn, language);
  }
  return base as AnyQuestion;
};

const persistQuestionImages = () => {
  try {
    fs.mkdirSync(path.dirname(questionImagesPath), { recursive: true });
    fs.writeFileSync(questionImagesPath, JSON.stringify(questionImageMap, null, 2), 'utf-8');
  } catch (err) {
    console.error('Konnte questionImages nicht speichern', err);
  }
};

const persistQuestionOverrides = () => {
  try {
    fs.mkdirSync(path.dirname(questionOverridesPath), { recursive: true });
    fs.writeFileSync(questionOverridesPath, JSON.stringify(questionOverrideMap, null, 2), 'utf-8');
  } catch (err) {
    console.error('Konnte questionOverrides nicht speichern', err);
  }
};

const persistCustomQuestions = () => {
  try {
    fs.mkdirSync(path.dirname(customQuestionsPath), { recursive: true });
    fs.writeFileSync(customQuestionsPath, JSON.stringify(customQuestions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Konnte customQuestions nicht speichern', err);
  }
};

const upsertCustomQuestion = (question: AnyQuestion) => {
  const baseIndex = questions.findIndex((entry) => entry.id === question.id);
  if (baseIndex >= 0) questions[baseIndex] = question;
  else questions.push(question);
  questionById.set(question.id, question);
  const customIndex = customQuestions.findIndex((entry) => entry.id === question.id);
  if (customIndex >= 0) customQuestions[customIndex] = question;
  else customQuestions.push(question);
};

const broadcastTeamsReady = (room: RoomState) => {
  const teamsArr = Object.values(room.teams);
  io.to(room.roomCode).emit('teamsReady', { teams: teamsArr });
};

const ensureSegmentTwoBaseline = (room: RoomState) => {
  if (room.segmentTwoBaselineScores || room.askedQuestionIds.length <= 10) return;
  room.segmentTwoBaselineScores = {};
  Object.values(room.teams).forEach((team) => {
    room.segmentTwoBaselineScores![team.id] = team.score ?? 0;
  });
};

const configureRoomForQuiz = (room: RoomState, quizId: string) => {
  const template = quizzes.get(quizId);
  if (!template) throw new Error('Quiz template not found');
  const questionIds =
    template.mode === 'random'
      ? [...template.questionIds].sort(() => Math.random() - 0.5)
      : [...template.questionIds];

  room.quizId = quizId;
  room.questionOrder = [...questionIds];
  room.remainingQuestionIds = [...questionIds];
  room.askedQuestionIds = [];
  room.currentQuestionId = null;
  room.answers = {};
  room.timerEndsAt = null;
  room.screen = 'lobby';
  room.questionPhase = 'answering';
  room.bingoEnabled = Boolean(template.enableBingo ?? template.meta?.useBingo);
  room.potatoPhase = 'IDLE';
  room.potatoPool = [];
  room.presetPotatoPool = sanitizePotatoPool(template.potatoPool ?? []);
  room.potatoBans = {};
  room.potatoBanLimits = {};
  room.potatoSelectedThemes = [];
  room.potatoRoundIndex = -1;
  room.potatoTurnOrder = [];
  room.potatoLives = {};
  room.potatoUsedAnswers = [];
  room.potatoUsedAnswersNormalized = [];
  room.potatoLastAttempt = null;
  room.potatoActiveTeamId = null;
  room.potatoDeadlineAt = null;
  room.potatoTurnStartedAt = null;
  room.potatoTurnDurationMs = POTATO_ANSWER_TIME_MS;
  room.potatoLastWinnerId = null;
  room.potatoCurrentTheme = null;
  room.potatoLastConflict = null;
  room.segmentTwoBaselineScores = null;
  room.blitzPhase = 'IDLE';
  const normalizedThemes = (template.blitz?.pool || []).map((theme, idx) => normalizeBlitzTheme(theme, idx));
  room.blitzThemeLibrary = normalizedThemes.reduce<Record<string, QuizBlitzTheme>>((acc, theme) => {
    acc[theme.id] = theme;
    return acc;
  }, {});
  room.blitzPool = normalizedThemes.map(toBlitzOption);
  room.blitzBans = {};
  room.blitzBanLimits = {};
  room.blitzSelectedThemes = [];
  room.blitzSetIndex = -1;
  room.blitzDeadlineAt = null;
  room.blitzTheme = null;
  room.blitzItems = [];
  room.blitzItemSolutions = [];
  room.blitzAnswersByTeam = {};
  room.blitzResultsByTeam = {};
  room.blitzSubmittedTeamIds = [];
  recomputeRoomWarnings(room);
  applyRoomState(room, { type: 'START_SESSION' });
  broadcastTeamsReady(room);
  broadcastState(room);
  return questionIds.length;
};

const joinTeamToRoom = (room: RoomState, teamName: string, teamId?: string) => {
  const cleanName = teamName.trim();
  if (!cleanName) throw new Error('teamName missing');

  if (teamId && room.teams[teamId]) {
    room.teams[teamId].name = cleanName;
    if (!room.teamBoards[teamId]) room.teamBoards[teamId] = generateBingoBoard();
    broadcastTeamsReady(room);
    broadcastState(room);
    return { team: room.teams[teamId], board: room.teamBoards[teamId], created: false };
  }

  const existingByName = Object.values(room.teams).find((t) => t.name === cleanName);
  if (existingByName) {
    if (!room.teamBoards[existingByName.id]) room.teamBoards[existingByName.id] = generateBingoBoard();
    broadcastTeamsReady(room);
    broadcastState(room);
    return { team: existingByName, board: room.teamBoards[existingByName.id], created: false };
  }

  const newTeam: Team = { id: uuid(), name: cleanName, score: 0, isReady: false };
  room.teams[newTeam.id] = newTeam;
  room.teamBoards[newTeam.id] = generateBingoBoard();
  if (room.segmentTwoBaselineScores) {
    room.segmentTwoBaselineScores[newTeam.id] = newTeam.score ?? 0;
  }
  broadcastTeamsReady(room);
  broadcastState(room);
  return { team: newTeam, board: room.teamBoards[newTeam.id], created: true };
};

const normalizeString = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const getQuestionType = (question: AnyQuestion): CozyQuestionType => {
  if ((question as any).type) return (question as any).type as CozyQuestionType;
  switch (question.mechanic) {
    case 'estimate':
      return 'SCHAETZCHEN';
    case 'betting':
    case 'trueFalse':
      return 'STIMMTS';
    case 'imageQuestion':
      return 'CHEESE';
    default:
      return 'MU_CHO';
  }
};

const getQuestionPoints = (room: RoomState, question: AnyQuestion): number => {
  const raw = Number((question as any).points);
  if (Number.isFinite(raw) && raw > 0) return raw;
  const segmentIndex = (question as any).segmentIndex;
  if (segmentIndex === 0) return 1;
  if (segmentIndex === 1) return 2;
  const orderIndex = room.questionOrder.findIndex((id) => id === question.id);
  if (orderIndex >= 0 && orderIndex >= 10) return 2;
  return 1;
};

const getBunteMaxAward = (question: AnyQuestion, fallback: number): number => {
  const payload = (question as any)?.bunteTuete;
  if (payload && typeof payload.maxPoints === 'number' && payload.maxPoints > 0) {
    return payload.maxPoints;
  }
  const segmentIndex = (question as any).segmentIndex;
  if (segmentIndex === 0) return 2;
  if (segmentIndex === 1) return 3;
  return fallback;
};

const effectivePotatoPool = (room: RoomState) =>
  room.potatoPool.length ? room.potatoPool : room.presetPotatoPool;

const recomputeRoomWarnings = (room: RoomState) => {
  const warnings: string[] = [];
  const potatoSize = effectivePotatoPool(room).length;
  if (potatoSize > 0 && potatoSize < 14) {
    warnings.push(`Potato-Pool enthält nur ${potatoSize} Themen (>=14 empfohlen).`);
  }
  const blitzSize = room.blitzPool.length || Object.keys(room.blitzThemeLibrary || {}).length;
  if (blitzSize > 0 && blitzSize < 14) {
    warnings.push(`Blitz-Pool enthält nur ${blitzSize} Themen (>=14 empfohlen).`);
  }
  room.validationWarnings = warnings;
};

const validateQuestionStructure = (question: AnyQuestion): string[] => {
  const issues: string[] = [];
  if (question.mechanic === 'sortItems') {
    const correctOrder = (question as any).correctOrder;
    if (!Array.isArray(correctOrder) || correctOrder.length === 0) {
      issues.push('Sortierfrage ohne gültige correctOrder.');
    }
  }
  if (question.mechanic === 'estimate' && (question as any).targetValue === undefined) {
    issues.push('Schätzfrage ohne targetValue.');
  }
  if ((question as any).type === 'BUNTE_TUETE' && (question as any).bunteTuete) {
    const payload = (question as any).bunteTuete;
    if (payload.kind === 'top5') {
      if (!Array.isArray(payload.items) || payload.items.length < 5) {
        issues.push('TOP5 benötigt mindestens 5 Items.');
      }
      if (!Array.isArray(payload.correctOrder) || payload.correctOrder.length !== payload.items.length) {
        issues.push('TOP5 hat keine vollständige correctOrder.');
      }
    } else if (payload.kind === 'precision') {
      if (!Array.isArray(payload.ladder) || payload.ladder.length === 0) {
        issues.push('Precision-Ladder benötigt mindestens einen Step.');
      } else if (!payload.ladder.every((step: { acceptedAnswers: string[] }) => Array.isArray(step.acceptedAnswers) && step.acceptedAnswers.length > 0)) {
        issues.push('Precision-Ladder enthält Steps ohne akzeptierte Antworten.');
      }
    } else if (payload.kind === 'oneOfEight') {
      if (!Array.isArray(payload.statements) || payload.statements.length < 8) {
        issues.push('8-Dinge-Variante benötigt 8 Aussagen.');
      }
      if (!payload.statements.some((stmt: { isFalse?: boolean }) => stmt.isFalse)) {
        issues.push('8-Dinge-Variante markiert keine falsche Aussage.');
      }
    } else if (payload.kind === 'order') {
      if (!Array.isArray(payload.items) || payload.items.length === 0) {
        issues.push('Ordnen-Variante benötigt Items.');
      }
      if (!Array.isArray(payload.criteriaOptions) || payload.criteriaOptions.length === 0) {
        issues.push('Ordnen-Variante benötigt mindestens ein Kriterium.');
      }
      if (!payload.correctByCriteria || !Object.keys(payload.correctByCriteria).length) {
        issues.push('Ordnen-Variante ohne correctByCriteria.');
      } else {
        Object.entries(payload.correctByCriteria).forEach(([criteriaId, sequence]) => {
          if (!Array.isArray(sequence) || (payload.items && sequence.length !== payload.items.length)) {
            issues.push(`Ordnen-Kriterium ${criteriaId} hat keine vollständige Reihenfolge.`);
          }
        });
      }
    }
  }
  return issues;
};

const collectCozyDraftWarnings = (draft: CozyQuizDraft): string[] => {
  const warnings: string[] = [];
  const potatoSize = Array.isArray(draft.potatoPool) ? draft.potatoPool.length : 0;
  if (potatoSize < 14) {
    warnings.push(`Potato-Pool enthaelt nur ${potatoSize} Themen (>=14 empfohlen).`);
  }
  const blitzThemes = draft.blitz?.pool?.length ?? 0;
  if (blitzThemes < 14) {
    warnings.push(`Blitz-Pool enthaelt nur ${blitzThemes} Themen (>=14 empfohlen).`);
  }
  if (draft.questions.length !== COZY_SLOT_TEMPLATE.length) {
    warnings.push(`Fragen-Slots unvollstaendig: ${draft.questions.length}/${COZY_SLOT_TEMPLATE.length}.`);
  }
  draft.questions.forEach((question, idx) => {
    const issues = validateQuestionStructure(question);
    issues.forEach((issue) => warnings.push(`F${idx + 1}: ${issue}`));
  });
  return warnings;
};

type BunteEvaluationResult = {
  awardedPoints: number;
  awardedDetail: string | null;
  isCorrect: boolean;
  tieBreaker?: AnswerTieBreaker | null;
};

const quantizePoints = (value: number, limit: number): number => {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.min(limit, Math.max(0, value));
  return Math.round(clamped * 100) / 100;
};

const evaluateBunteSubmission = (
  question: AnyQuestion,
  submission: unknown,
  maxPoints: number
): BunteEvaluationResult => {
  const setup = (question as any).bunteTuete;
  const payload = submission as BunteTueteSubmission;
  if (!setup || !payload || typeof payload !== 'object' || payload.kind !== setup.kind) {
    return { awardedPoints: 0, awardedDetail: 'Keine gültige Eingabe', isCorrect: false, tieBreaker: null };
  }
  const segmentCap = getBunteMaxAward(question, maxPoints);
  const safeMax = Math.max(1, Math.min(maxPoints, segmentCap));
  if (setup.kind === 'top5') {
    const submission = payload as BunteTueteTop5Submission;
    const order = Array.isArray(submission.order) ? submission.order : [];
    const target =
      Array.isArray(setup.correctOrder) && setup.correctOrder.length > 0
        ? setup.correctOrder
        : setup.items?.map((item: any) => item.id) ?? [];
    if (!target.length) return { awardedPoints: 0, awardedDetail: null, isCorrect: false };
    let positionMatches = 0;
    target.forEach((correctId: string, idx: number) => {
      if (order[idx] === correctId) positionMatches += 1;
    });
    if (setup.scoringMode === 'contains') {
      const hits = Array.from(new Set(order.filter(Boolean))).filter((id) => target.includes(id)).length;
      const containsOnly = Math.max(0, hits - positionMatches);
      const weighted = positionMatches * 2 + containsOnly; // Wertung: exakte Position doppelt so stark wie bloß enthalten
      const normalized = weighted / Math.max(target.length * 2, 1);
      const points = quantizePoints(normalized * safeMax, safeMax);
      return {
        awardedPoints: points,
        awardedDetail: `Pos ${positionMatches}/${target.length}, enthält ${hits}/${target.length}`,
        isCorrect: hits >= target.length,
        tieBreaker: {
          label: 'TOP5',
          primary: positionMatches,
          secondary: hits,
          detail: 'Positionen vor Contains'
        }
      };
    }
    const normalized = positionMatches / (target.length || 1);
    const points = quantizePoints(normalized * safeMax, safeMax);
    return {
      awardedPoints: points,
      awardedDetail: `${positionMatches}/${target.length} Positionen`,
      isCorrect: positionMatches >= target.length,
      tieBreaker: {
        label: 'TOP5',
        primary: positionMatches,
        secondary: positionMatches,
        detail: 'Positionen'
      }
    };
  }
  if (setup.kind === 'precision') {
    const submission = payload as BunteTuetePrecisionSubmission;
    const text = typeof submission.text === 'string' ? submission.text.trim() : '';
    if (!text) return { awardedPoints: 0, awardedDetail: 'Keine Antwort', isCorrect: false };
    const normalized = normalizeText(text);
    const threshold = typeof setup.similarityThreshold === 'number' ? setup.similarityThreshold : 0.85;
    let bestPoints = 0;
    let bestLabel: string | null = null;
    (setup.ladder || []).forEach((step: { label: string; acceptedAnswers: string[]; points: number }) => {
      (step.acceptedAnswers || []).forEach((candidate) => {
        const score = similarityScore(normalized, normalizeText(candidate));
        if (score >= threshold && step.points > bestPoints) {
          bestPoints = Math.min(step.points, safeMax);
          bestLabel = step.label;
        }
      });
    });
    return {
      awardedPoints: bestPoints,
      awardedDetail: bestLabel ? `Treffer: ${bestLabel}` : null,
      isCorrect: bestPoints >= safeMax,
      tieBreaker: null
    };
  }
  if (setup.kind === 'oneOfEight') {
    const submission = payload as BunteTueteOneOfEightSubmission;
    const selection = typeof submission.choiceId === 'string' ? submission.choiceId.trim() : '';
    const falseStatement = (setup.statements || []).find((stmt: { id: string; isFalse?: boolean }) => stmt.isFalse);
    const isMatch =
      Boolean(falseStatement) &&
      selection &&
      selection.toLowerCase() === String(falseStatement?.id ?? '').toLowerCase();
    return {
      awardedPoints: isMatch ? safeMax : 0,
      awardedDetail: selection ? `Gewählt: ${selection.toUpperCase()}` : null,
      isCorrect: Boolean(isMatch),
      tieBreaker: null
    };
  }
  if (setup.kind === 'order') {
    const submission = payload as BunteTueteOrderSubmission;
    const selectedCriteria =
      submission.criteriaId || setup.defaultCriteriaId || Object.keys(setup.correctByCriteria || {})[0];
    const expected = (setup.correctByCriteria || {})[selectedCriteria] || [];
    const order = Array.isArray(submission.order) ? submission.order : [];
    let matches = 0;
    expected.forEach((val: string, idx: number) => {
      if (order[idx] === val) matches += 1;
    });
    const perIndexWeight =
      typeof setup.partialPoints === 'number' && setup.partialPoints > 0
        ? setup.partialPoints
        : safeMax / Math.max(expected.length, 1);
    let points = quantizePoints(matches * perIndexWeight, safeMax);
    const isCorrect = expected.length > 0 && matches === expected.length;
    if (isCorrect && typeof setup.fullPoints === 'number') {
      points = quantizePoints(setup.fullPoints, safeMax);
    }
    return {
      awardedPoints: points,
      awardedDetail: expected.length ? `${matches}/${expected.length} Positionen` : null,
      isCorrect,
      tieBreaker: expected.length
        ? {
            label: 'ORDNEN',
            primary: matches,
            secondary: expected.length,
            detail: 'Positionen korrekt'
          }
        : null
    };
  }
  return { awardedPoints: 0, awardedDetail: null, isCorrect: false, tieBreaker: null };
};

const evaluateAnswer = (question: AnyQuestion, answer: unknown): boolean => {
  if (!question) return false;
  if (question.mechanic === 'estimate') {
    const target = (question as any).targetValue;
    if (target === undefined || target === null) return false;
    const num = Number(String(answer).replace(',', '.'));
    if (!Number.isFinite(num)) return false;
    const tolerance = Math.max(Math.abs(target) * 0.05, 1); // 5% oder mindestens 1
    return Math.abs(num - target) <= tolerance;
  }
  if (question.mechanic === 'multipleChoice') {
    const idx = Number(answer);
    return idx === (question as any).correctIndex;
  }
  if (question.mechanic === 'betting') {
    // Bewertung erfolgt in evaluateCurrentQuestion; hier keine Einzelpruefung
    return false;
  }
  if (question.mechanic === 'trueFalse') {
    const boolVal = String(answer).toLowerCase() === 'true';
    return boolVal === (question as any).isTrue;
  }
  const order = (question as any).correctOrder as string[] | undefined;
  const orderEn = (question as any).correctOrderEn as string[] | undefined;
  if (order && order.length > 0) {
    const orderStr = normalizeString(answer).replace(/\s+/g, '');
    const targetOrder = order.join(',').toLowerCase();
    const targetOrderEn = orderEn ? orderEn.join(',').toLowerCase() : undefined;
    if (orderStr === targetOrder.replace(/\s+/g, '')) return true;
    if (targetOrderEn && orderStr === targetOrderEn.replace(/\s+/g, '')) return true;
    return false;
  }
  if ((question as any).answer) {
    const normalized = normalizeString(answer);
    const deAnswer = normalizeString((question as any).answer);
    const enAnswer = (question as any).answerEn ? normalizeString((question as any).answerEn) : null;
    if (normalized === deAnswer) return true;
    if (enAnswer && normalized === enAnswer) return true;
    return false;
  }
  return false;
};

const formatSolution = (question: AnyQuestion, language: Language): string | undefined => {
  if (!question) return undefined;
  if (question.mechanic === 'estimate') {
    const unit = (question as any).unit ? ` ${(question as any).unit}` : '';
    return `${(question as any).targetValue ?? ''}${unit}`.trim();
  }
  if (question.mechanic === 'multipleChoice') {
    const idx = (question as any).correctIndex;
    if (idx === undefined) return undefined;
    const opts = combineArray(
      (question as any).options ?? [],
      (question as any).optionsEn,
      language
    );
    return Array.isArray(opts) ? opts[idx] : undefined;
  }
  if (question.mechanic === 'betting') {
    const idx = (question as any).correctIndex;
    const opts = combineArray((question as any).options ?? [], (question as any).optionsEn, language);
    return Array.isArray(opts) ? opts[idx] : undefined;
  }
  if (question.mechanic === 'trueFalse') {
    const de = (question as any).isTrue ? 'Wahr' : 'Falsch';
    const en = (question as any).isTrue ? 'True' : 'False';
    return combineText(de, en, language);
  }
  if ((question as any).correctOrder) {
    const ord = combineArray(
      (question as any).correctOrder ?? [],
      (question as any).correctOrderEn,
      language
    );
    return Array.isArray(ord) ? ord.join(' / ') : undefined;
  }
  const deAnswer = (question as any).answer ?? undefined;
  const enAnswer = (question as any).answerEn ?? undefined;
  return combineText(deAnswer, enAnswer, language);
};

const sanitizeQuestionForTeams = (question: AnyQuestion): AnyQuestion => question;

const applyRoomState = (room: RoomState, action: GameStateAction) => {
  const next = applyGameAction(room.gameState, action);
  if (next !== room.gameState) {
    room.gameState = next;
    room.stateHistory = [...room.stateHistory.slice(-9), next];
  }
  return room.gameState;
};

const buildStateUpdatePayload = (room: RoomState): StateUpdatePayload => {
  const activeQuestion = room.currentQuestionId ? questionById.get(room.currentQuestionId) : null;
  const localized = activeQuestion ? localizeQuestion(applyOverrides(activeQuestion), room.language) : null;
  const sanitized = localized ? sanitizeQuestionForTeams(localized) : null;
  const potato: PotatoState | null =
    room.potatoPhase === 'IDLE'
      ? null
      : {
          phase: room.potatoPhase,
          pool: room.potatoPool.map((theme) => theme.title),
          bans: Object.entries(room.potatoBans).reduce<Record<string, string[]>>((acc, [teamId, themes]) => {
            acc[teamId] = themes.map((theme) => theme.title);
            return acc;
          }, {}),
          banLimits: room.potatoBanLimits,
          selectedThemes: room.potatoSelectedThemes.map((theme) => theme.title),
          roundIndex: room.potatoRoundIndex,
          turnOrder: room.potatoTurnOrder,
          activeTeamId: room.potatoActiveTeamId,
          lives: room.potatoLives,
          usedAnswers: room.potatoUsedAnswers,
          usedAnswersNormalized: room.potatoUsedAnswersNormalized,
          lastAttempt: room.potatoLastAttempt ?? null,
          deadline: room.potatoDeadlineAt,
          turnStartedAt: room.potatoTurnStartedAt,
          turnDurationMs: room.potatoTurnDurationMs,
          currentTheme: room.potatoCurrentTheme?.title ?? null,
          lastWinnerId: room.potatoLastWinnerId,
          pendingConflict: room.potatoLastConflict
        };
  const blitz: BlitzState | null =
    room.blitzPhase === 'IDLE'
      ? null
      : {
          phase: room.blitzPhase,
          pool: room.blitzPool,
          bans: room.blitzBans,
          banLimits: room.blitzBanLimits,
          selectedThemes: room.blitzSelectedThemes,
          setIndex: room.blitzSetIndex,
          deadline: room.blitzDeadlineAt,
          theme: room.blitzTheme,
          items: room.blitzItems,
          submissions: room.blitzSubmittedTeamIds,
          results: room.blitzResultsByTeam
        };
  const includeResults = room.questionPhase === 'evaluated' || room.questionPhase === 'revealed';
  const results = includeResults
    ? Object.entries(room.answers).map(([teamId, entry]) => ({
        teamId,
        teamName: room.teams[teamId]?.name ?? teamId,
        answer: entry.value,
        isCorrect: entry.isCorrect,
        awardedPoints: entry.awardedPoints ?? null,
        awardedDetail: entry.awardedDetail ?? null,
        tieBreaker: entry.tieBreaker ?? null
      }))
    : undefined;
  const warnings = [
    ...room.validationWarnings,
    ...(localized ? validateQuestionStructure(localized) : [])
  ];
  return {
    roomCode: room.roomCode,
    state: room.gameState,
    phase: room.questionPhase,
    currentQuestion: sanitized,
    timer: { endsAt: room.timerEndsAt, running: Boolean(room.timerEndsAt) },
    scores: Object.values(room.teams).map((team) => ({
      id: team.id,
      name: team.name,
      score: team.score ?? 0
    })),
    teamsConnected: Object.keys(room.teams).length,
    questionProgress: { asked: room.askedQuestionIds.length, total: room.questionOrder.length },
    potato,
    blitz,
    results,
    warnings: warnings.length ? warnings : undefined,
    supportsBingo: Boolean(room.bingoEnabled),
    config: {
      potatoAutopilot: POTATO_AUTOPILOT,
      potatoTimeoutAutostrike: POTATO_TIMEOUT_AUTOSTRIKE
    }
  };
};

const broadcastState = (room: RoomState) => {
  io.to(room.roomCode).emit('server:stateUpdate', buildStateUpdatePayload(room));
};
const broadcastStateByCode = (roomCode: string) => {
  const room = rooms.get(roomCode);
  if (room) broadcastState(room);
};

const evaluateCurrentQuestion = (room: RoomState): boolean => {
  if (!room.currentQuestionId) return false;
  if (room.questionPhase === 'evaluated' || room.questionPhase === 'revealed') return false;
  const question = questionById.get(room.currentQuestionId);
  if (!question) return false;
  applyRoomState(room, { type: 'HOST_LOCK' });
  const basePoints = getQuestionPoints(room, question);

  if (question.mechanic === 'estimate') {
    const parsed = Object.entries(room.answers).map(([teamId, ans]) => {
      const num = Number(String(ans.value ?? '').replace(',', '.'));
      return {
        teamId,
        diff:
          Number.isFinite(num) && (question as any).targetValue !== undefined
            ? Math.abs(num - (question as any).targetValue)
            : Number.POSITIVE_INFINITY
      };
    });
    const minDiff = parsed.reduce((m, p) => Math.min(m, p.diff), Number.POSITIVE_INFINITY);
    const bestDeviation = Number.isFinite(minDiff) ? minDiff : null;
    Object.entries(room.answers).forEach(([teamId, ans]) => {
      const p = parsed.find((x) => x.teamId === teamId);
      const isCorrect = p ? p.diff === minDiff : false;
      const awardedPoints = isCorrect ? basePoints : 0;
      const deviation = p?.diff ?? null;
      room.answers[teamId] = {
        ...ans,
        isCorrect,
        deviation,
        bestDeviation,
        awardedPoints,
                awardedDetail:
          deviation !== null && Number.isFinite(deviation) ? `Diff ${Math.round(deviation * 100) / 100}` : null,
        autoGraded: true,
        tieBreaker:
          deviation !== null && Number.isFinite(deviation)
            ? { label: 'DIFF', primary: deviation, detail: 'Naeher dran gewinnt' }
            : null
      };
    });
  } else if (question.mechanic === 'betting') {
    const correctIdx = (question as any).correctIndex ?? 0;
    const pool = (question as any).pointsPool ?? 10;
    Object.entries(room.answers).forEach(([teamId, ans]) => {
      const arr = Array.isArray(ans.value) ? ans.value : [0, 0, 0];
      const ptsRaw = Number(arr[correctIdx] ?? 0);
      const awardedPoints = Number.isFinite(ptsRaw) ? Math.max(0, Math.min(pool, ptsRaw)) : 0;
      room.answers[teamId] = {
        ...ans,
        isCorrect: awardedPoints > 0,
        betPoints: awardedPoints,
        betPool: pool,
        awardedPoints,
        awardedDetail: `${awardedPoints}/${pool} Punkte`,
        autoGraded: true,
        tieBreaker: null
      };
    });
  } else if (getQuestionType(question) === 'BUNTE_TUETE') {
    Object.entries(room.answers).forEach(([teamId, ans]) => {
      const evaluation = evaluateBunteSubmission(question, ans.value, basePoints);
      room.answers[teamId] = {
        ...ans,
        isCorrect: evaluation.isCorrect,
        awardedPoints: evaluation.awardedPoints,
        awardedDetail: evaluation.awardedDetail,
        autoGraded: true,
        tieBreaker: evaluation.tieBreaker ?? null
      };
    });
  } else {
    Object.entries(room.answers).forEach(([teamId, ans]) => {
      const isCorrect = evaluateAnswer(question, ans.value);
      room.answers[teamId] = {
        ...ans,
        isCorrect,
        awardedPoints: isCorrect ? basePoints : 0,
        autoGraded: true,
        tieBreaker: null
      };
    });
  }

  room.questionPhase = 'evaluated';
  room.timerEndsAt = null;
  const solution = formatSolution(question, room.language);
  broadcastState(room);
  io.to(room.roomCode).emit('evaluation:started');
  io.to(room.roomCode).emit('answersEvaluated', { answers: room.answers, solution });
  io.to(room.roomCode).emit('timerStopped');
  return true;
};

// --- API Routes -------------------------------------------------------------
app.get('/api/health', (_req, res) => res.json({ ok: true }));

if (DEBUG) {
  app.get('/debug/state/:roomCode', (req, res) => {
    const game = rooms.get(req.params.roomCode);
    if (!game) return res.status(404).json({ error: 'not-found' });
    return res.json(game);
  });
}

app.get('/api/questions', (_req, res) => {
  const mapped = questions.map((q) => {
    const usage = questionUsageMap[q.id] ?? {};
    const isCustom = customQuestions.some((c) => c.id === q.id);
    return { ...applyOverrides(q), usedIn: usage.usedIn ?? [], lastUsedAt: usage.lastUsedAt ?? null, isCustom };
  });
  res.json({ questions: mapped });
});

app.get('/api/questions/custom', (_req, res) => {
  const mapped = customQuestions.map((q) => {
    const usage = questionUsageMap[q.id] ?? {};
    return { ...applyOverrides(q), usedIn: usage.usedIn ?? [], lastUsedAt: usage.lastUsedAt ?? null, isCustom: true };
  });
  res.json({ questions: mapped });
});

// Katalogliste
app.get('/api/catalogs', (_req, res) => {
  const set = new Set<string>();
  [...questions, ...customQuestions].forEach((q) => set.add((q as any).catalogId || 'default'));
  res.json({ catalogs: Array.from(set).sort() });
});

app.get('/api/questions/custom/export', (_req, res) => {
  res.json({ questions: customQuestions });
});

app.get('/api/quizzes', (_req, res) => {
  res.json({ quizzes: Array.from(quizzes.values()) });
});

app.post('/api/quizzes/custom', (req, res) => {
  const { name, questionIds, meta, categories, mode } = req.body as {
    name?: string;
    questionIds?: string[];
    meta?: unknown;
    categories?: unknown;
    mode?: 'ordered' | 'random';
  };
  if (!name || !Array.isArray(questionIds)) return res.status(400).json({ error: 'name oder questionIds fehlen' });
  if (questionIds.length !== 25) return res.status(400).json({ error: 'Es muessen genau 25 questionIds sein' });

  const counts: Record<QuizCategory, number> = {
    Schaetzchen: 0,
    'Mu-Cho': 0,
    Stimmts: 0,
    Cheese: 0,
    GemischteTuete: 0
  };
  for (const id of questionIds) {
    const q = questionById.get(id);
    if (!q) return res.status(400).json({ error: `Unbekannte questionId: ${id}` });
    counts[q.category] = (counts[q.category] ?? 0) + 1;
  }
  if (!Object.values(counts).every((c) => c === 5)) {
    return res.status(400).json({ error: 'Jede Kategorie muss genau 5 Fragen enthalten' });
  }

  const id = `custom-${Date.now()}`;
  const template: QuizTemplate = {
    id,
    name,
    mode: mode === 'ordered' || mode === 'random' ? mode : 'random',
    questionIds: [...questionIds],
    meta,
    categories
  } as QuizTemplate;
  quizzes.set(id, template);
  // usage aktualisieren
  const now = new Date().toISOString();
  questionIds.forEach((qid) => {
    const entry = questionUsageMap[qid] ?? { usedIn: [], lastUsedAt: null };
    const set = new Set(entry.usedIn ?? []);
    set.add(name);
    questionUsageMap[qid] = { usedIn: Array.from(set), lastUsedAt: now };
  });
  persistQuestionUsage();

  return res.status(201).json({ quiz: template });
});

// Bild-Upload
app.post('/api/upload/question-image', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Kein Bild erhalten' });
  const { questionId } = req.body as { questionId?: string };
  const url = `/uploads/questions/${req.file.filename}`;
  if (questionId) {
    questionImageMap[questionId] = url;
    persistQuestionImages();
  }
  return res.json({ imageUrl: url });
});

app.delete('/api/upload/question-image', (req, res) => {
  const { questionId, imageUrl } = req.body as { questionId?: string; imageUrl?: string };
  const url = imageUrl || (questionId ? questionImageMap[questionId] : null);
  if (!url) return res.status(400).json({ error: 'imageUrl oder questionId fehlt' });
  const filename = path.basename(url);
  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore
    }
  }
  if (questionId && questionImageMap[questionId]) {
    delete questionImageMap[questionId];
    persistQuestionImages();
  }
  return res.json({ ok: true });
});

app.post('/api/rooms/:roomCode/use-quiz', (req, res) => {
  const { roomCode } = req.params;
  const { quizId } = req.body as { quizId?: string };
  if (!quizId || !quizzes.has(quizId)) return res.status(400).json({ error: 'Ungueltiges quizId' });

  const room = ensureRoom(roomCode);
  touchRoom(room);
  const remaining = configureRoomForQuiz(room, quizId);

  io.to(roomCode).emit('quizSelected', { quizId, remaining }); // TODO(LEGACY): remove when stateUpdate adopted
  return res.json({ ok: true, quizId, remaining });
});

const startQuestionWithSlot = (
  room: RoomState,
  questionId: string,
  remainingOverride?: number,
  res?: express.Response
) => {
  touchRoom(room);
  const question = questionById.get(questionId);
  const questionWithImage = question ? applyOverrides(question) : null;
  if (!questionWithImage) {
    if (res) res.status(400).json({ error: 'Ungueltige questionId' });
    return;
  }

  room.currentQuestionId = questionId;
  room.answers = {};
  room.timerEndsAt = null;
  room.askedQuestionIds = Array.from(new Set([...room.askedQuestionIds, questionId]));
  ensureSegmentTwoBaseline(room);
  room.screen = 'slot';
  room.questionPhase = 'answering';
  applyRoomState(room, { type: 'FORCE', next: 'Q_ACTIVE' });
  broadcastState(room);

  const askedInCategory = room.askedQuestionIds.filter(
    (id) => questionById.get(id)?.category === questionWithImage.category
  ).length;
  const totalInCategory = room.questionOrder.filter(
    (id) => questionById.get(id)?.category === questionWithImage.category
  ).length;

  const slotMeta = buildSlotMeta(
    questionWithImage,
    Math.max(0, askedInCategory - 1),
    totalInCategory || 5,
    room.language
  );
  log(room.roomCode, `Slot-Transition for question ${questionWithImage.id}`);
  io.to(room.roomCode).emit('beamer:show-slot-transition', slotMeta);

  setTimeout(() => {
    room.screen = 'question';
    const meta = buildQuestionMeta(room, questionId);
    const localized = localizeQuestion(questionWithImage, room.language);
    io.to(room.roomCode).emit('questionStarted', {
      questionId,
      remaining: remainingOverride ?? room.remainingQuestionIds.length,
      meta
    });
    io.to(room.roomCode).emit('beamer:show-question', { question: localized, meta });
    io.to(room.roomCode).emit('team:show-question', { question: sanitizeQuestionForTeams(localized) });
    broadcastState(room);
  }, SLOT_DURATION_MS);

  if (res) {
    res.json({
      ok: true,
      questionId,
      remaining: remainingOverride ?? room.remainingQuestionIds.length
    });
  }
};

const runNextQuestion = (room: RoomState) => {
  if (!room.quizId || room.remainingQuestionIds.length === 0) {
    throw new Error('Keine Fragen mehr oder kein Quiz gesetzt');
  }
  const nextId = room.remainingQuestionIds.shift();
  if (!nextId) {
    throw new Error('Keine naechste Frage gefunden');
  }
  startQuestionWithSlot(room, nextId, room.remainingQuestionIds.length);
  Object.values(room.teams).forEach((t) => (t.isReady = false));
  broadcastTeamsReady(room);
  return { questionId: nextId, remaining: room.remainingQuestionIds.length };
};

const shouldShowSegmentScoreboard = (room: RoomState) => {
  const askedCount = room.askedQuestionIds.length;
  return askedCount === 10 || askedCount === 20 || room.remainingQuestionIds.length === 0;
};

const handleHostNextAdvance = (room: RoomState) => {
  if (room.gameState === 'Q_REVEAL' && shouldShowSegmentScoreboard(room)) {
    applyRoomState(room, { type: 'HOST_NEXT' });
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'SCOREBOARD') {
    if (room.remainingQuestionIds.length === 0) {
      broadcastState(room);
      return { stage: room.gameState };
    }
    applyRoomState(room, { type: 'HOST_NEXT' });
    return runNextQuestion(room);
  }
  if (room.gameState === 'SCOREBOARD_PAUSE') {
    applyRoomState(room, { type: 'HOST_NEXT' });
    return runNextQuestion(room);
  }
  return runNextQuestion(room);
};

const revealAnswersForRoom = (room: RoomState) => {
  if (!room.currentQuestionId) throw new Error('Keine aktive Frage');
  const question = questionById.get(room.currentQuestionId);
  if (!question) throw new Error('Frage nicht gefunden');

  if (room.questionPhase === 'answering') {
    evaluateCurrentQuestion(room);
  }
  if (room.questionPhase === 'revealed') {
    return { answers: room.answers, teams: room.teams };
  }

  applyRoomState(room, { type: 'HOST_REVEAL' });
  const basePoints = getQuestionPoints(room, question);
  Object.entries(room.answers).forEach(([teamId, ans]) => {
    const isCorrect = ans.isCorrect ?? evaluateAnswer(question, ans.value);
    const deviation = ans.deviation ?? null;
    const bestDeviation = ans.bestDeviation ?? null;
    const awardedPoints =
      ans.awardedPoints !== undefined && ans.awardedPoints !== null
        ? ans.awardedPoints
        : isCorrect
        ? basePoints
        : 0;
    room.answers[teamId] = {
      ...ans,
      isCorrect,
      deviation,
      bestDeviation,
      awardedPoints
    };
    if (awardedPoints > 0 && room.teams[teamId]) {
      room.teams[teamId].score = (room.teams[teamId].score ?? 0) + awardedPoints;
    }
    io.to(room.roomCode).emit('teamResult', {
      teamId,
      isCorrect,
      deviation,
      bestDeviation,
      awardedPoints,
      awardedDetail: room.answers[teamId].awardedDetail ?? null
    });
  });

  room.questionPhase = 'revealed';
  broadcastState(room);
  io.to(room.roomCode).emit('scoreUpdated'); // TODO(LEGACY): scoreboard now via stateUpdate
  io.to(room.roomCode).emit('evaluation:revealed');
  return { answers: room.answers, teams: room.teams };
};

app.post('/api/rooms/:roomCode/next-question', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  touchRoom(room);
  try {
    const result = runNextQuestion(room);
    if (res.headersSent) return;
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/api/rooms/:roomCode/start-question', (req, res) => {
  const { roomCode } = req.params;
  const { questionId } = req.body as { questionId?: string };
  if (!questionId || !questionById.has(questionId)) {
    return res.status(400).json({ error: 'Ungueltige questionId' });
  }
  const room = ensureRoom(roomCode);
  touchRoom(room);
  startQuestionWithSlot(room, questionId, room.remainingQuestionIds.length, res);
  Object.values(room.teams).forEach((t) => (t.isReady = false));
  broadcastTeamsReady(room);
});

// Slot-Intro ausloesen, ohne Frage-Reihenfolge anzupassen
app.post('/api/rooms/:roomCode/slot-intro', (req, res) => {
  const { roomCode } = req.params;
  const { questionId } = req.body as { questionId?: string };
  if (!questionId || !questionById.has(questionId)) {
    return res.status(400).json({ error: 'Ungueltige questionId' });
  }
  const room = ensureRoom(roomCode);
  touchRoom(room);
  const question = questionById.get(questionId)!;
  const localized = localizeQuestion(applyOverrides(question), room.language);
  const askedInCategory = room.askedQuestionIds.filter((id) => questionById.get(id)?.category === question.category).length;
  const totalInCategory = room.questionOrder.filter((id) => questionById.get(id)?.category === question.category).length || 5;
  const slotMeta = buildSlotMeta(localized, Math.max(0, askedInCategory - 1), totalInCategory, room.language);
  log(room.roomCode, `Slot intro only for question ${questionId}`);
  io.to(room.roomCode).emit('beamer:show-slot-transition', slotMeta);
  broadcastState(room);
  res.json({ ok: true, slotMeta });
});

// Intro-Slides auf Beamer schicken
app.post('/api/rooms/:roomCode/show-intro', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  touchRoom(room);
  room.screen = 'intro' as ScreenState;
  applyRoomState(room, { type: 'FORCE', next: 'INTRO' });
  broadcastState(room);
  io.to(room.roomCode).emit('beamer:show-intro', { slides: INTRO_SLIDES });
  res.json({ ok: true });
});

app.get('/api/rooms/:roomCode/current-question', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  touchRoom(room);
  if (!room.currentQuestionId) return res.json({ question: null });
  const question = questionById.get(room.currentQuestionId);
  if (!question) return res.json({ question: null });
  const meta = buildQuestionMeta(room, room.currentQuestionId);
  const localized = localizeQuestion(applyOverrides(question), room.language);
  return res.json({ question: localized, meta });
});

// Team join (mit Bingo-Board)
app.post('/api/rooms/:roomCode/join', (req, res) => {
  const { roomCode } = req.params;
  const { teamName, teamId } = req.body as { teamName?: string; teamId?: string };
  if (!teamName) return res.status(400).json({ error: 'teamName fehlt' });
  const room = ensureRoom(roomCode);
  touchRoom(room);

  try {
    const result = joinTeamToRoom(room, teamName, teamId);
    const payload = { team: result.team, roomCode, board: result.board };
    return result.created ? res.status(201).json(payload) : res.json(payload);
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

// Antworten (speichern, keine Auto-Evaluation)
app.post('/api/rooms/:roomCode/answer', (req, res) => {
  const { roomCode } = req.params;
  const { teamId, answer } = req.body as { teamId?: string; answer?: unknown };
  const room = ensureRoom(roomCode);
  touchRoom(room);
  if (!room.currentQuestionId) return res.status(400).json({ error: 'Keine aktive Frage' });
  if (!teamId || !room.teams[teamId]) return res.status(400).json({ error: 'Team unbekannt' });
  if (!isQuestionInputOpen(room.gameState)) {
    return res.status(400).json({ error: 'Antworten aktuell nicht erlaubt' });
  }

  room.answers[teamId] = { value: answer };
  io.to(roomCode).emit('answerReceived', { teamId });
  io.to(roomCode).emit('beamer:team-answer-update', { teamId, hasAnswered: true }); // TODO(LEGACY)

  const teamCount = Object.keys(room.teams).length;
  const answerCount = Object.keys(room.answers).length;
  if (teamCount > 0 && answerCount >= teamCount && room.timerEndsAt) {
    room.timerEndsAt = null;
    io.to(roomCode).emit('timerStopped');
    evaluateCurrentQuestion(room);
  }

  broadcastState(room);
  return res.json({ ok: true });
});

// Antworten automatisch bewerten (ohne reveal)
app.post('/api/rooms/:roomCode/resolve', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  touchRoom(room);
  if (!room.currentQuestionId) return res.status(400).json({ error: 'Keine aktive Frage' });
  const ran = evaluateCurrentQuestion(room);
  if (!ran) return res.status(400).json({ error: 'Keine Auswertung moeglich' });
  return res.json({ ok: true, answers: room.answers });
});

// // Legacy Pfad fuer Schaetzfrage / generisch -> gleiche Logik
app.post('/api/rooms/:roomCode/resolve/estimate', (req, res) => {
  const { roomCode } = req.params;
  req.url = `/api/rooms/${roomCode}/resolve`;
  return app._router.handle(req, res);
});
app.post('/api/rooms/:roomCode/resolve/generic', (req, res) => {
  const { roomCode } = req.params;
  req.url = `/api/rooms/${roomCode}/resolve`;
  return app._router.handle(req, res);
});

// Ergebnisse aufdecken + Scores gutschreiben
app.post('/api/rooms/:roomCode/reveal', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  touchRoom(room);
  try {
    const payload = revealAnswersForRoom(room);
    return res.json({ ok: true, ...payload });
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/api/rooms/:roomCode/answers', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  touchRoom(room);
  const solution = room.currentQuestionId
    ? formatSolution(questionById.get(room.currentQuestionId)!, room.language)
    : undefined;
  return res.json({ answers: room.answers, teams: room.teams, solution });
});

app.delete('/api/rooms/:roomCode/teams/:teamId', (req, res) => {
  const { roomCode, teamId } = req.params;
  const room = ensureRoom(roomCode);
  touchRoom(room);

  if (!teamId || !room.teams[teamId]) return res.status(404).json({ error: 'Team nicht gefunden' });

  delete room.teams[teamId];
  delete room.teamBoards[teamId];
  delete room.answers[teamId];

  broadcastTeamsReady(room);
  io.to(roomCode).emit('teamKicked', { teamId });
  broadcastState(room);

  return res.json({ ok: true });
});

app.post('/api/rooms/:roomCode/answers/override', (req, res) => {
  const { roomCode } = req.params;
  const { teamId, isCorrect } = req.body as { teamId?: string; isCorrect?: boolean };
  const room = ensureRoom(roomCode);
  touchRoom(room);
  if (!teamId || typeof isCorrect !== 'boolean') return res.status(400).json({ error: 'teamId oder isCorrect fehlt' });
  if (!room.answers[teamId]) room.answers[teamId] = { value: null };
  const previous = room.answers[teamId].isCorrect;
  room.answers[teamId].isCorrect = isCorrect;

  // Score anpassen, falls bereits aufgedeckt
  if (room.questionPhase === 'revealed' && room.currentQuestionId) {
    const question = questionById.get(room.currentQuestionId);
    const pts = (question as any)?.points ?? 1;
    if (room.teams[teamId]) {
      const delta = (isCorrect ? pts : 0) - (previous ? pts : 0);
      room.teams[teamId].score = (room.teams[teamId].score ?? 0) + delta;
    }

    io.to(roomCode).emit('teamResult', { teamId, isCorrect });
    io.to(roomCode).emit('scoreUpdated'); // TODO(LEGACY)
    broadcastState(room);
    return res.json({ ok: true });
  }

  broadcastState(room);
  return res.json({ ok: true });
});

// Bingo markieren
app.post('/api/rooms/:roomCode/bingo/mark', (req, res) => {
  const { roomCode } = req.params;
  const { teamId, cellIndex } = req.body as { teamId?: string; cellIndex?: number };
  const room = ensureRoom(roomCode);
  touchRoom(room);
  if (!teamId || !room.teams[teamId]) return res.status(400).json({ error: 'Team unbekannt' });
  if (cellIndex === undefined || cellIndex < 0 || cellIndex > 24)
    return res.status(400).json({ error: 'cellIndex ungueltig' });
  const board = room.teamBoards[teamId];
  if (!board) return res.status(400).json({ error: 'Kein Board' });
  if (board[cellIndex].marked) return res.status(400).json({ error: 'Feld bereits markiert' });

  // Optional: nur aktuelle Kategorie erlauben
  if (room.currentQuestionId) {
    const q = questionById.get(room.currentQuestionId);
    if (q && q.category !== board[cellIndex].category) {
      return res.status(400).json({ error: 'Falsche Kategorie' });
    }
  }

  board[cellIndex].marked = true;
  io.to(roomCode).emit('bingoUpdated', { teamId, board }); // TODO(LEGACY)
  broadcastState(room);
  return res.json({ ok: true, board });
});

// Scoreboard
app.get('/api/rooms/:roomCode/scoreboard', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  touchRoom(room);
  const teams = Object.values(room.teams);
  return res.json({ teams, boards: room.teamBoards });
});

// Ergebnis-Export (JSON oder CSV)
const buildResultRows = (room: RoomState) => {
  const rows: Array<{
    teamId: string;
    teamName: string;
    score: number;
    questionId: string;
    questionText: string;
    category: QuizCategory;
    answer: unknown;
    isCorrect: boolean | null | undefined;
    deviation: number | null | undefined;
    bestDeviation: number | null | undefined;
  }> = [];

  const teams = Object.values(room.teams);
  const answeredIds = room.askedQuestionIds.length ? room.askedQuestionIds : room.questionOrder;

  answeredIds.forEach((qid) => {
    const q = questionById.get(qid);
    if (!q) return;
    teams.forEach((team) => {
      const ans = room.answers[team.id];
      rows.push({
        teamId: team.id,
        teamName: team.name,
        score: team.score ?? 0,
        questionId: qid,
        questionText: (q as any).question ?? '',
        category: q.category,
        answer: ans?.value ?? null,
        isCorrect: ans?.isCorrect,
        deviation: ans?.deviation,
        bestDeviation: ans?.bestDeviation
      });
    });
  });

  return rows;
};

const rowsToCsv = (rows: ReturnType<typeof buildResultRows>) => {
  const header = [
    'teamId',
    'teamName',
    'score',
    'questionId',
    'questionText',
    'category',
    'answer',
    'isCorrect',
    'deviation',
    'bestDeviation'
  ];
  const escape = (v: unknown) => {
    const str = v === null || v === undefined ? '' : String(v);
    const needsQuote = str.includes('"') || str.includes(',') || str.includes('\n');
    const safe = str.replace(/"/g, '""');
    return needsQuote ? `"${safe}"` : safe;
  };
  const lines = rows.map((r) =>
    [
      r.teamId,
      r.teamName,
      r.score,
      r.questionId,
      r.questionText,
      r.category,
      r.answer ?? '',
      r.isCorrect ?? '',
      r.deviation ?? '',
      r.bestDeviation ?? ''
    ].map(escape).join(',')
  );
  return [header.join(','), ...lines].join('\n');
};

app.get('/api/rooms/:roomCode/export', (req, res) => {
  const { roomCode } = req.params;
  const format = (req.query as { format?: string }).format;
  const room = rooms.get(roomCode);
  if (!room) return res.status(404).json({ error: 'Room nicht gefunden' });

  const rows = buildResultRows(room);
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=\"${roomCode}-results.csv\"`);
    return res.send(rowsToCsv(rows));
  }
  return res.json({ room: roomCode, results: rows });
});

// Timer
app.post('/api/rooms/:roomCode/timer/start', (req, res) => {
  const { roomCode } = req.params;
  const { seconds } = req.body as { seconds?: number };
  const room = ensureRoom(roomCode);
  touchRoom(room);
  const secs = Number(seconds ?? DEFAULT_QUESTION_TIME);
  if (!Number.isFinite(secs) || secs <= 0) return res.status(400).json({ error: 'seconds muss > 0 sein' });
  const endsAt = Date.now() + secs * 1000;
  room.timerEndsAt = endsAt;
  io.to(roomCode).emit('timerStarted', { endsAt });
  broadcastState(room);
  return res.json({ ok: true, endsAt });
});

app.post('/api/rooms/:roomCode/timer/stop', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  touchRoom(room);
  room.timerEndsAt = null;
  io.to(roomCode).emit('timerStopped');
   // automatisches Bewerten, wenn noch nicht erfolgt
  evaluateCurrentQuestion(room);
  broadcastState(room);
  return res.json({ ok: true });
});

app.get('/api/rooms/:roomCode/timer', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  touchRoom(room);
  return res.json({ timer: { endsAt: room.timerEndsAt, running: Boolean(room.timerEndsAt) } });
});

// Sprache
app.get('/api/rooms/:roomCode/language', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  return res.json({ language: room.language });
});

app.post('/api/rooms/:roomCode/language', (req, res) => {
  const { roomCode } = req.params;
  const { language } = req.body as { language?: Language };
  if (language !== 'de' && language !== 'en' && language !== 'both')
    return res.status(400).json({ error: 'language muss de, en oder both sein' });
  const room = ensureRoom(roomCode);
  room.language = language;
  touchRoom(room);
  io.to(roomCode).emit('languageChanged', { language });
  broadcastState(room);
  return res.json({ ok: true, language });
});

// Frage-Metadaten setzen (z. B. mixedMechanic)
app.post('/api/questions/:id/meta', (req, res) => {
  const { id } = req.params;
  const { mixedMechanic, catalogId, mediaSlots } = req.body as { mixedMechanic?: string | null; catalogId?: string | null; mediaSlots?: { count?: number; urls?: string[] } | null };
  if (!id || !questionById.has(id)) return res.status(404).json({ error: 'Frage nicht gefunden' });
  const question = questionById.get(id)!;
  if (mixedMechanic && question.category !== 'GemischteTuete') {
    return res.status(400).json({ error: 'mixedMechanic nur f?r Gemischte T?te erlaubt' });
  }
  if (!questionOverrideMap[id]) questionOverrideMap[id] = {};
  questionOverrideMap[id].mixedMechanic = mixedMechanic ?? null;
  if (catalogId !== undefined) {
    questionOverrideMap[id].catalogId = catalogId || null;
  }
  if (mediaSlots) {
    const count = typeof mediaSlots.count === 'number' ? Math.max(1, Math.min(6, Math.round(mediaSlots.count))) : undefined;
    questionOverrideMap[id].mediaSlots = { count: count ?? mediaSlots.urls?.length ?? 0, urls: mediaSlots.urls };
  }
  persistQuestionOverrides();
  return res.json({ ok: true, override: questionOverrideMap[id] });
});

// Frage-Layout (Offsets) setzen
app.post('/api/questions/:id/layout', (req, res) => {
  const { id } = req.params;
  const { imageOffsetX, imageOffsetY, logoOffsetX, logoOffsetY } = req.body as {
    imageOffsetX?: number;
    imageOffsetY?: number;
    logoOffsetX?: number;
    logoOffsetY?: number;
  };
  if (!id || !questionById.has(id)) return res.status(404).json({ error: 'Frage nicht gefunden' });
  if (!questionOverrideMap[id]) questionOverrideMap[id] = {};
  const clamp = (n: number | undefined) =>
    typeof n === 'number' && Number.isFinite(n) ? Math.max(-100, Math.min(100, n)) : 0;
  questionOverrideMap[id].imageOffsetX = clamp(imageOffsetX);
  questionOverrideMap[id].imageOffsetY = clamp(imageOffsetY);
  questionOverrideMap[id].logoOffsetX = clamp(logoOffsetX);
  questionOverrideMap[id].logoOffsetY = clamp(logoOffsetY);
  persistQuestionOverrides();
  return res.json({ ok: true, override: questionOverrideMap[id] });
});

// Layout-Offsets zur?cksetzen
app.delete('/api/questions/:id/layout', (req, res) => {
  const { id } = req.params;
  if (!id || !questionById.has(id)) return res.status(404).json({ error: 'Frage nicht gefunden' });
  if (questionOverrideMap[id]) {
    delete questionOverrideMap[id].imageOffsetX;
    delete questionOverrideMap[id].imageOffsetY;
    delete questionOverrideMap[id].logoOffsetX;
    delete questionOverrideMap[id].logoOffsetY;
    persistQuestionOverrides();
  }
  return res.json({ ok: true });
});

// Neue Frage anlegen
app.post('/api/questions', (req, res) => {
  const { id, category, mechanic, question, points = 1, ...rest } = req.body as Partial<AnyQuestion>;
  if (!category || !mechanic || !question) {
    return res.status(400).json({ error: 'category, mechanic, question erforderlich' });
  }
  const newId = id && typeof id === 'string' ? id : uuid();
  if (questionById.has(newId)) return res.status(400).json({ error: 'ID bereits vorhanden' });
  const created: AnyQuestion = {
    id: newId,
    category: category as QuizCategory,
    mechanic: mechanic as AnyQuestion['mechanic'],
    question,
    points: Number(points) || 1,
    createdAt: Date.now(),
    catalogId: (rest as any)?.catalogId || 'default',
    mediaSlots: (rest as any)?.mediaSlots,
    ...(rest as any)
  };
  customQuestions.push(created);
  questions.push(created);
  questionById.set(newId, created);
  persistCustomQuestions();
  return res.json({ ok: true, question: created });
});

// Frage aktualisieren (nur f?r Custom empfohlen)
app.put('/api/questions/:id', (req, res) => {
  const { id } = req.params;
  if (!questionById.has(id)) return res.status(404).json({ error: 'Frage nicht gefunden' });
  const prev = questionById.get(id)!;
  const updated = { ...prev, ...req.body, id, updatedAt: Date.now() };
  // replace in customQuestions if exists, else allow patching base in-memory
  const idx = customQuestions.findIndex((q) => q.id === id);
  if (idx >= 0) {
    customQuestions[idx] = updated;
    persistCustomQuestions();
  }
  const baseIdx = questions.findIndex((q) => q.id === id);
  if (baseIdx >= 0) questions[baseIdx] = updated;
  questionById.set(id, updated);
  return res.json({ ok: true, question: updated });
});

// Quizzes l?schen
app.delete('/api/quizzes/:id', (req, res) => {
  const { id } = req.params;
  if (!id || !quizzes.has(id)) return res.status(404).json({ error: 'Quiz nicht gefunden' });
  quizzes.delete(id);
  return res.json({ ok: true });
});

// --- Socket.IO --------------------------------------------------------------
io.on('connection', (socket: Socket) => {
  socket.on('joinRoom', (roomCode: string) => {
    const resolved = normalizeRoomCode(roomCode);
    if (!resolved) {
      socket.emit('error', 'roomCode fehlt');
      return;
    }
    socket.join(resolved);
    const room = ensureRoom(resolved);
    const snapshot = buildSyncState(room);
    socket.emit('syncState', snapshot);
    socket.emit('server:stateUpdate', buildStateUpdatePayload(room));
  });
  socket.on(
    'host:createSession',
    (
      payload: { quizId?: string; language?: Language },
      ack?: (resp: { ok: boolean; roomCode?: string; error?: string }) => void
    ) => {
      try {
        const { quizId, language } = payload || {};
        if (!quizId || !quizzes.has(quizId)) throw new Error('quizId fehlt oder unbekannt');
        const code = SINGLE_SESSION_MODE ? DEFAULT_ROOM_CODE : createRoomCode();
        if (SINGLE_SESSION_MODE) {
          rooms.delete(code);
        }
        const room = ensureRoom(code);
        if (language === 'de' || language === 'en' || language === 'both') {
          room.language = language;
        }
        configureRoomForQuiz(room, quizId);
        broadcastStateByCode(room.roomCode);
        respond(ack, { ok: true, roomCode: code, state: buildStateUpdatePayload(room) });
      } catch (err) {
        respond(ack, { ok: false, error: (err as Error).message });
      }
    }
  );

  socket.on(
    'team:join',
    (
      payload: { roomCode?: string; teamName?: string; teamId?: string },
      ack?: (resp: { ok: boolean; error?: string; team?: Team; board?: BingoBoard }) => void
    ) => {
      try {
        const { roomCode, teamName, teamId } = payload || {};
        const resolved = requireRoomCode(roomCode);
        if (!teamName) throw new Error('teamName fehlt');
        const room = ensureRoom(resolved);
        touchRoom(room);
        const result = joinTeamToRoom(room, teamName, teamId);
        respond(ack, { ok: true, team: result.team, board: result.board });
      } catch (err) {
        respond(ack, { ok: false, error: (err as Error).message });
      }
    }
  );

  const withRoom = (
    roomCode: string | undefined,
    ack: unknown,
    handler: (room: RoomState) => unknown
  ) => {
    const resolved = normalizeRoomCode(roomCode);
    if (!resolved) {
      respond(ack, { ok: false, error: 'roomCode fehlt' });
      return;
    }
    const room = ensureRoom(resolved);
    touchRoom(room);
    try {
      const result = handler(room);
      respond(ack, { ok: true, ...((result || {}) as object) });
    } catch (err) {
      respond(ack, { ok: false, error: (err as Error).message });
    }
  };

  socket.on('host:next', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => handleHostNextAdvance(room));
  });

  socket.on('host:lock', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      const success = evaluateCurrentQuestion(room);
      return { locked: success };
    });
  });

  socket.on('host:reveal', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => revealAnswersForRoom(room));
  });

  socket.on(
    'host:startPotato',
    (
      payload: { roomCode?: string; themes?: string[]; themesText?: string },
      ack?: AckFn
    ) => {
      withRoom(payload?.roomCode, ack, (room) => {
        const parsed =
          sanitizePotatoPool(payload?.themes) || sanitizePotatoPool(payload?.themesText);
        const fallbackPool =
          room.presetPotatoPool.length >= POTATO_ROUNDS
            ? clonePotatoThemes(room.presetPotatoPool)
            : buildPlaceholderPotatoPool();
        const pool = parsed.length >= POTATO_ROUNDS ? clonePotatoThemes(parsed) : fallbackPool;
        if (pool.length < POTATO_ROUNDS) {
          throw new Error('Mindestens drei Themen erforderlich');
        }
        room.potatoPool = pool;
        room.potatoBans = {};
        room.potatoBanLimits = computePotatoBanLimits(room);
        room.potatoSelectedThemes = [];
        room.potatoRoundIndex = -1;
        room.potatoTurnOrder = [];
        room.potatoLives = {};
        room.potatoUsedAnswers = [];
        room.potatoUsedAnswersNormalized = [];
        room.potatoActiveTeamId = null;
        room.potatoPhase = 'BANNING';
        room.potatoDeadlineAt = null;
        room.potatoTurnStartedAt = null;
        room.potatoTurnDurationMs = POTATO_ANSWER_TIME_MS;
        room.potatoLastWinnerId = null;
        room.potatoCurrentTheme = null;
        room.potatoLastConflict = null;
        room.potatoLastAttempt = null;
        recomputeRoomWarnings(room);
        applyRoomState(room, { type: 'FORCE', next: 'POTATO' });
        broadcastState(room);
        return { pool: room.potatoPool };
      });
    }
  );

  socket.on(
    'host:banPotatoTheme',
    (payload: { roomCode?: string; teamId?: string; theme?: string }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.potatoPhase !== 'BANNING') throw new Error('Bans nicht aktiv');
        if (!payload?.teamId || !room.teams[payload.teamId]) throw new Error('Team unbekannt');
        const limit = room.potatoBanLimits[payload.teamId] ?? 0;
        if (limit <= 0) throw new Error('Dieses Team darf nicht bannen');
        const current = room.potatoBans[payload.teamId] ?? [];
        if (current.length >= limit) throw new Error('Ban-Limit erreicht');
        const themeName = (payload?.theme || '').trim();
        if (!themeName) throw new Error('Theme fehlt');
        const index = room.potatoPool.findIndex(
          (t) => t.title.toLowerCase() === themeName.toLowerCase()
        );
        if (index === -1) throw new Error('Theme nicht verfügbar');
        const actualTheme = room.potatoPool.splice(index, 1)[0];
        room.potatoBans[payload.teamId] = [...current, actualTheme];
        recomputeRoomWarnings(room);
        broadcastState(room);
      });
    }
  );

  socket.on('host:confirmPotatoThemes', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      if (room.potatoPhase !== 'BANNING' && room.potatoPhase !== 'ROUND_END') {
        throw new Error('Themes können aktuell nicht gesetzt werden');
      }
      if (room.potatoPool.length < POTATO_ROUNDS) {
        throw new Error('Nicht genug Themen übrig');
      }
      const shuffled = [...room.potatoPool].sort(() => Math.random() - 0.5);
      room.potatoSelectedThemes = shuffled.slice(0, POTATO_ROUNDS);
      room.potatoPhase = 'ROUND_END';
      room.potatoRoundIndex = -1;
      room.potatoCurrentTheme = null;
      room.potatoUsedAnswers = [];
      room.potatoUsedAnswersNormalized = [];
      room.potatoLives = {};
      room.potatoTurnOrder = [];
      room.potatoLastConflict = null;
      setPotatoActiveTeam(room, null);
      broadcastState(room);
      return { selected: room.potatoSelectedThemes };
    });
  });

  socket.on('host:potatoStartRound', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      startPotatoRound(room);
      broadcastState(room);
    });
  });

  socket.on(
    'host:potatoSubmitTurn',
    (
      payload: {
        roomCode?: string;
        answer?: string;
        verdict: 'correct' | 'strike';
        override?: boolean;
      },
      ack
    ) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.potatoPhase !== 'PLAYING') throw new Error('Keine aktive Runde');
        if (!room.potatoActiveTeamId) throw new Error('Kein aktives Team');
        if (payload.verdict === 'correct') {
          const attempt = evaluatePotatoAttempt(
            room,
            room.potatoActiveTeamId,
            payload?.answer ?? '',
            { overrideDuplicate: payload?.override }
          );
          handlePotatoAttemptAftermath(room, attempt);
          broadcastState(room);
          return { attempt };
        } else {
          applyPotatoStrike(room, room.potatoActiveTeamId);
          broadcastState(room);
          return { strike: true };
        }
      });
    }
  );

  socket.on(
    'team:submitPotatoAnswer',
    (payload: { roomCode?: string; teamId?: string; text?: string }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (!payload?.teamId) throw new Error('teamId fehlt');
        const attempt = evaluatePotatoAttempt(room, payload.teamId, payload?.text ?? '');
         handlePotatoAttemptAftermath(room, attempt);
        broadcastState(room);
        return { attempt };
      });
    }
  );

  socket.on('host:potatoStrikeActive', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      if (!room.potatoActiveTeamId) throw new Error('Kein aktives Team');
      applyPotatoStrike(room, room.potatoActiveTeamId);
      broadcastState(room);
    });
  });

  socket.on('host:potatoNextTurn', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      advancePotatoTurn(room);
      broadcastState(room);
    });
  });

  socket.on(
    'host:potatoOverrideAttempt',
    (
      payload: { roomCode?: string; attemptId?: string; action: 'accept' | 'acceptDuplicate' | 'reject' },
      ack?: AckFn
    ) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (!room.potatoLastAttempt) throw new Error('Kein Versuch vorhanden');
        if (!payload?.attemptId || room.potatoLastAttempt.id !== payload.attemptId) {
          throw new Error('Attempt nicht gefunden');
        }
        const attempt = { ...room.potatoLastAttempt };
        if (payload.action === 'accept' || payload.action === 'acceptDuplicate') {
          if (attempt.verdict !== 'ok') {
            const alreadyUsed = room.potatoUsedAnswersNormalized.includes(attempt.normalized);
            if (!alreadyUsed) {
              room.potatoUsedAnswers = [...room.potatoUsedAnswers, attempt.text];
              room.potatoUsedAnswersNormalized = [...room.potatoUsedAnswersNormalized, attempt.normalized];
            }
            attempt.verdict = 'ok';
            attempt.reason = payload.action === 'acceptDuplicate' ? 'duplicate-override' : undefined;
            attempt.overridden = true;
            room.potatoLastConflict = null;
            room.potatoLastAttempt = attempt;
            handlePotatoAttemptAftermath(room, attempt);
          }
        } else if (payload.action === 'reject') {
          attempt.verdict = 'invalid';
          attempt.reason = 'rejected';
          attempt.overridden = true;
          room.potatoLastConflict = null;
          room.potatoLastAttempt = attempt;
        }
        broadcastState(room);
        return { attempt: room.potatoLastAttempt };
      });
    }
  );

  socket.on(
    'host:potatoEndRound',
    (payload: { roomCode?: string; winnerId?: string | null }, ack) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.potatoPhase !== 'PLAYING') {
          throw new Error('Runde ist nicht aktiv');
        }
        const winnerId =
          payload?.winnerId && room.teams[payload.winnerId] ? payload.winnerId : null;
        if (!winnerId) {
          const alive = alivePotatoTeams(room);
          if (!alive.length) throw new Error('Kein Team verfügbar');
          completePotatoRound(room, alive[0]);
        } else {
          completePotatoRound(room, winnerId);
        }
        broadcastState(room);
      });
    }
  );

  socket.on('host:potatoNextRound', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      if (room.potatoPhase !== 'ROUND_END') {
        throw new Error('Runde ist noch aktiv');
      }
      if (room.potatoRoundIndex >= POTATO_ROUNDS - 1) {
        throw new Error('Alle Runden abgeschlossen');
      }
      startPotatoRound(room);
      broadcastState(room);
    });
  });

  socket.on('host:potatoFinish', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      finishPotatoStage(room);
      broadcastState(room);
    });
  });

  socket.on('host:showAwards', (payload: { roomCode?: string }, ack?: AckFn) => {
    withRoom(payload?.roomCode, ack, (room) => {
      applyRoomState(room, { type: 'FORCE', next: 'AWARDS' });
      broadcastState(room);
    });
  });

  socket.on(
    'host:startBlitz',
    (
      payload: { roomCode?: string; themes?: string[]; themesText?: string },
      ack?: AckFn
    ) => {
      withRoom(payload?.roomCode, ack, (room) => {
        const requested = Array.isArray(payload?.themes)
          ? payload?.themes.map((entry) => String(entry))
          : [];
        const resolvedRequested = requested
          .map((id) => room.blitzThemeLibrary[id])
          .filter((theme): theme is QuizBlitzTheme => Boolean(theme));
        const fallbackNames =
          sanitizeThemeList(payload?.themes) || sanitizeThemeList(payload?.themesText);
        let definitions: QuizBlitzTheme[] = [];
        if (resolvedRequested.length >= BLITZ_SETS) {
          definitions = resolvedRequested;
        } else if (Object.keys(room.blitzThemeLibrary).length >= BLITZ_SETS) {
          definitions = Object.values(room.blitzThemeLibrary);
        } else {
          const legacyNames = fallbackNames.length >= BLITZ_SETS ? fallbackNames : DEFAULT_BLITZ_THEMES.slice();
          if (legacyNames.length < BLITZ_SETS) {
            throw new Error('Mindestens drei Themen erforderlich');
          }
          definitions = legacyNames.map((title, idx) => {
            // TODO(LEGACY): Replace placeholder Blitz content with curated assets when Studio supports it.
            return buildLegacyBlitzTheme(title || `Legacy ${idx + 1}`);
          });
        }
        const normalizedDefs = definitions.map((theme, idx) => normalizeBlitzTheme(theme, idx));
        normalizedDefs.forEach((theme) => {
          room.blitzThemeLibrary[theme.id] = theme;
        });
        room.blitzPool = normalizedDefs.map(toBlitzOption);
        room.blitzBans = {};
        room.blitzBanLimits = computePotatoBanLimits(room);
        room.blitzSelectedThemes = [];
        room.blitzSetIndex = -1;
        room.blitzPhase = 'BANNING';
        room.blitzDeadlineAt = null;
        room.blitzTheme = null;
        room.blitzItems = [];
        room.blitzItemSolutions = [];
        resetBlitzCollections(room);
        recomputeRoomWarnings(room);
        applyRoomState(room, { type: 'FORCE', next: 'BLITZ' });
        broadcastState(room);
        return { pool: room.blitzPool };
      });
    }
  );

  socket.on(
    'host:banBlitzTheme',
    (payload: { roomCode?: string; teamId?: string; theme?: string; themeId?: string }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.blitzPhase !== 'BANNING') throw new Error('Bans nicht aktiv');
        if (!payload?.teamId || !room.teams[payload.teamId]) throw new Error('Team unbekannt');
        const limit = room.blitzBanLimits[payload.teamId] ?? 0;
        if (limit <= 0) throw new Error('Dieses Team darf nicht bannen');
        const bans = room.blitzBans[payload.teamId] ?? [];
        if (bans.length >= limit) throw new Error('Ban-Limit erreicht');
        const themeKey = (payload?.themeId || payload?.theme || '').trim();
        if (!themeKey) throw new Error('Theme fehlt');
        const index = room.blitzPool.findIndex(
          (entry) => entry.id === themeKey || entry.title.toLowerCase() === themeKey.toLowerCase()
        );
        if (index === -1) throw new Error('Theme nicht verfügbar');
        const actualTheme = room.blitzPool.splice(index, 1)[0];
        room.blitzBans[payload.teamId] = [...bans, actualTheme.title];
        recomputeRoomWarnings(room);
        broadcastState(room);
      });
    }
  );

  socket.on('host:confirmBlitzThemes', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      if (room.blitzPhase !== 'BANNING' && room.blitzPhase !== 'SET_END') {
        throw new Error('Themes können aktuell nicht gesetzt werden');
      }
      if (room.blitzPool.length < BLITZ_SETS) {
        throw new Error('Nicht genug Themen übrig');
      }
      const shuffled = [...room.blitzPool].sort(() => Math.random() - 0.5);
      room.blitzSelectedThemes = shuffled.slice(0, BLITZ_SETS);
      room.blitzSetIndex = -1;
      room.blitzPhase = 'SET_END';
      room.blitzDeadlineAt = null;
      resetBlitzCollections(room);
      broadcastState(room);
      return { selected: room.blitzSelectedThemes };
    });
  });

  socket.on('host:blitzStartSet', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      startBlitzSet(room);
      broadcastState(room);
    });
  });

  socket.on('host:lockBlitzSet', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      enforceBlitzDeadline(room);
      lockBlitzSet(room);
      broadcastState(room);
    });
  });

  socket.on('host:revealBlitzSet', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      if (room.blitzPhase === 'PLAYING') {
        lockBlitzSet(room);
      }
      if (room.blitzPhase !== 'SET_END') throw new Error('Set noch nicht abgeschlossen');
      computeBlitzResults(room);
      broadcastState(room);
    });
  });

  socket.on('host:nextBlitzSet', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      if (room.blitzSetIndex >= BLITZ_SETS - 1) {
        throw new Error('Alle Sets gespielt');
      }
      startBlitzSet(room);
      broadcastState(room);
    });
  });

  socket.on('host:finishBlitz', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      finishBlitzStage(room);
      broadcastState(room);
    });
  });

  socket.on(
    'team:submitBlitzAnswers',
    (
      payload: { roomCode?: string; teamId?: string; answers?: string[] },
      ack?: AckFn
    ) => {
      withRoom(payload?.roomCode, ack, (room) => {
        enforceBlitzDeadline(room);
        if (room.blitzPhase !== 'PLAYING') throw new Error('Blitz ist nicht aktiv');
        if (room.blitzDeadlineAt && Date.now() > room.blitzDeadlineAt) {
          lockBlitzSet(room);
          broadcastState(room);
          throw new Error('Zeit abgelaufen');
        }
        if (!payload?.teamId || !room.teams[payload.teamId]) {
          throw new Error('Team unbekannt');
        }
        const answers = Array.isArray(payload.answers) ? payload.answers : [];
        room.blitzAnswersByTeam[payload.teamId] = answers
          .map((value) => String(value ?? '').slice(0, 120))
          .slice(0, BLITZ_ITEMS_PER_SET);
        if (!room.blitzSubmittedTeamIds.includes(payload.teamId)) {
          room.blitzSubmittedTeamIds = [...room.blitzSubmittedTeamIds, payload.teamId];
        }
        broadcastState(room);
        return { submitted: true };
      });
    }
  );

  socket.on('beamer:show-rules', (roomCode: string) => {
    const room = ensureRoom(roomCode);
    room.screen = 'lobby';
    room.questionPhase = 'idle';
    io.to(roomCode).emit('beamer:show-rules');
  });

  socket.on('teamReady', ({ roomCode, teamId, isReady }: { roomCode: string; teamId: string; isReady: boolean }) => {
    const room = ensureRoom(roomCode);
    const team = room.teams[teamId];
    if (!team) return;
    team.isReady = isReady;
    broadcastTeamsReady(room);
    broadcastState(room);
  });
});

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivityAt > ROOM_IDLE_CLEANUP_MS) {
      rooms.delete(code);
      log(code, 'Room removed due to inactivity');
    }
  }
}, ROOM_IDLE_CLEANUP_MS);

// --- Start server -----------------------------------------------------------
const listenWithFallback = (port: number, attemptsLeft: number) => {
  httpServer
    .listen(port, () => {
      console.log(`Quiz-Backend l?uft auf Port ${port}`);
    })
    .on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
        const nextPort = port + 1;
        console.warn(`Port ${port} belegt, versuche ${nextPort} ...`);
        httpServer.close(() => listenWithFallback(nextPort, attemptsLeft - 1));
      } else {
        console.error('Serverstart fehlgeschlagen:', err);
        process.exit(1);
      }
    });
};

listenWithFallback(PORT, 3);




type AckFn<T = unknown> = (payload: T) => void;
const respond = <T>(ack: unknown, payload: T) => {
  if (typeof ack === 'function') {
    (ack as AckFn<T>)(payload);
  }
};
