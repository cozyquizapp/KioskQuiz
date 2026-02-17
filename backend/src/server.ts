import cors from 'cors';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';


import * as Sentry from '@sentry/node';
// import { createClient } from 'redis'; // Removed: using NodeCache instead
import NodeCache from 'node-cache';

Sentry.init({
  dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0', // TODO: Replace with your real DSN
  tracesSampleRate: 1.0,
});

// Initialize cache (default TTL: 10 minutes)
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
// Studio/Bingo/Builder-Reste entfernt
import {
  validateTeamName,
  validateAnswer,
  validateQuizId,
  validateRoomCode,
  validateLanguage,
  validateQuestionId,
  validateNumber,
  validateTeamId
} from './validation';
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
  TeamStatusSnapshot,
  SyncStatePayload,
  StateUpdatePayload,
  BlitzState,
  BlitzPhase,
  BlitzSetResult,
  BlitzThemeOption,
  BlitzItemView,
  RundlaufState,
  RundlaufCategoryOption,
  RundlaufAttempt,
  RundlaufConfig,
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
  NextStageHint,
  CozyQuizMeta,
  CozyQuestionSlotTemplate,
  LobbyStats,
  FastestAnswer,
  FunnyAnswer,
  CommonWrongAnswer,
  EstimateQuestion,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  ImageQuestion,
  SortItemsQuestion
} from '../../shared/quizTypes';
import { COZY_SLOT_TEMPLATE } from '../../shared/cozyTemplate';
import { CATEGORY_CONFIG } from '../../shared/categoryConfig';
import { mixedMechanicMap } from '../../shared/mixedMechanics';
import { questions, questionById } from './data/questions';
import { defaultBlitzPool } from './data/quizzes';
import { QuizMeta, Language } from '../../shared/quizTypes';
import { defaultQuizzes } from './data/quizzes';
import { normalizeText, similarityScore } from '../../shared/textNormalization';
import {
  BLITZ_CATEGORY_SHOWCASE_MS,
  BLITZ_ROUND_INTRO_MS,
  DEBUG,
  DEFAULT_QUESTION_TIME,
  QUESTION_INTRO_MS,
  ROOM_IDLE_CLEANUP_MS,
  SLOT_DURATION_MS
} from './constants';
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
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors());
app.use(express.json());

// static files for uploads
const uploadRoot = path.join(__dirname, '..', '..', 'uploads');
const uploadDir = path.join(uploadRoot, 'questions');
const blitzUploadDir = path.join(uploadRoot, 'blitz');

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

app.use('/uploads', express.static(uploadRoot));

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

const blitzUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      try {
        if (!fs.existsSync(blitzUploadDir)) fs.mkdirSync(blitzUploadDir, { recursive: true });
      } catch {
        // ignore mkdir errors
      }
      cb(null, blitzUploadDir);
    },
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
  connectedTeams: Record<string, number>;
  currentQuestionId: string | null;
  answers: Record<string, AnswerEntry>;
  quizId: string | null;
  questionOrder: string[];
  remainingQuestionIds: string[];
  askedQuestionIds: string[];
  teamBoards: Record<string, BingoBoard>;
  bingoEnabled: boolean;
  timerEndsAt: number | null;
  questionTimerDurationMs: number | null;
  questionIntroTimeout: NodeJS.Timeout | null;
  questionTimerTimeout: NodeJS.Timeout | null;
  screen: ScreenState;
  questionPhase: QuestionPhase;
  lastActivityAt: number;
  language: Language;
  gameState: CozyGameState;
  stateHistory: CozyGameState[];
  segmentTwoBaselineScores: Record<string, number> | null;
  blitzPool: BlitzThemeOption[];
  blitzThemeLibrary: Record<string, QuizBlitzTheme>;
  blitzDisplayTimeMs: number;
  blitzAnswerTimeMs: number;
  blitzBans: Record<string, string[]>;
  blitzBanLimits: Record<string, number>;
  blitzSelectedThemes: BlitzThemeOption[];
  blitzSetIndex: number;
  blitzPhase: BlitzPhase;
  blitzDeadlineAt: number | null;
  blitzTheme: BlitzThemeOption | null;
  blitzPinnedTheme: BlitzThemeOption | null;
  blitzTopTeamId: string | null;
  blitzLastTeamId: string | null;
  blitzItems: BlitzItemView[];
  blitzItemIndex: number;
  blitzItemDeadlineAt: number | null;
  blitzItemDurationMs: number | null;
  blitzItemSolutions: { id: string; answer: string; aliases: string[] }[];
  blitzAnswersByTeam: Record<string, string[]>;
  blitzResultsByTeam: Record<string, BlitzSetResult>;
  blitzSubmittedTeamIds: string[];
  blitzRoundIntroTimeout: NodeJS.Timeout | null;
  rundlaufPool: RundlaufCategoryOption[];
  rundlaufPresetPool: RundlaufCategoryOption[];
  rundlaufBans: string[];
  rundlaufSelectedCategories: RundlaufCategoryOption[];
  rundlaufPinnedCategory: RundlaufCategoryOption | null;
  rundlaufTopTeamId: string | null;
  rundlaufLastTeamId: string | null;
  rundlaufRoundIndex: number;
  rundlaufTurnOrder: string[];
  rundlaufActiveTeamId: string | null;
  rundlaufEliminatedTeamIds: string[];
  rundlaufUsedAnswers: string[];
  rundlaufUsedAnswersNormalized: string[];
  rundlaufLastAttempt: RundlaufAttempt | null;
  rundlaufDeadlineAt: number | null;
  rundlaufTurnStartedAt: number | null;
  rundlaufTurnDurationMs: number;
  rundlaufPointsWinner: number;
  rundlaufPointsTie: number;
  // One-of-Eight (Bunte Tüte) turn-based state
  oneOfEightTurnOrder: string[];
  oneOfEightTurnIndex: number;
  oneOfEightActiveTeamId: string | null;
  oneOfEightUsedChoiceIds: string[];
  oneOfEightLoserTeamId: string | null;
  oneOfEightWinnerTeamIds: string[];
  oneOfEightFinished: boolean;
  rundlaufRoundWinners: string[];
  rundlaufRoundIntroTimeout: NodeJS.Timeout | null;
  validationWarnings: string[];
  nextStage: NextStageHint | null;
  scoreboardOverlayForced: boolean;
  halftimeTriggered?: boolean;
  finalsTriggered?: boolean;
  // Lobby Stats Tracking
  statsAnswerTimings: Map<string, { teamName: string; timeMs: number; answer: unknown; isCorrect: boolean; questionId: string; timestamp: number }[]>;
  statsFunnyAnswers: Map<string, { teamName: string; answer: string; questionId: string; markedAt: number }[]>;
  statsWrongAnswerCounts: Map<string, Map<string, number>>;
};

const rooms = new Map<string, RoomState>();
const quizzes = new Map<string, QuizTemplate>(defaultQuizzes.map((q) => [q.id, q]));
const blitzItemTimers = new Map<string, NodeJS.Timeout>();
const blitzSetTimers = new Map<string, NodeJS.Timeout>();
const rundlaufTurnTimers = new Map<string, NodeJS.Timeout>();

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
type AllTimeFunnyEntry = {
  teamName: string;
  answer: string;
  questionText: string;
  questionId: string;
  quizId?: string;
  date: string;
  markedAt: number;
};
type StatsState = { runs: RunEntry[]; questions: Record<string, QuestionStat>; funnyAnswers: AllTimeFunnyEntry[] };
let statsState: StatsState = { runs: [], questions: {}, funnyAnswers: [] };
try {
  if (fs.existsSync(statsPath)) {
    statsState = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
  }
} catch {
  statsState = { runs: [], questions: {}, funnyAnswers: [] };
}
if (!Array.isArray(statsState.funnyAnswers)) statsState.funnyAnswers = [];
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
  const cacheKey = `quizLayout_${quizId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ layout: cached });
  }
  const layout = quizLayoutMap[quizId] || null;
  cache.set(cacheKey, layout);
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
  cache.del(`quizLayout_${quizId}`);
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
  rundlauf?: RundlaufConfig | null;
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
    rundlauf: q.rundlauf ?? null,
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
    rundlauf: stored.rundlauf ?? null,
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
  const cacheKey = 'publishedQuizzes';
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ quizzes: cached });
  }
  cache.set(cacheKey, publishedQuizzes);
  res.json({ quizzes: publishedQuizzes });
});

app.post('/api/quizzes/publish', (req, res) => {
  const payload = req.body as PublishedQuiz;
  if (!payload?.id || !payload?.name || !Array.isArray(payload.questionIds)) {
    return res.status(400).json({ error: 'id, name, questionIds erforderlich' });
  }
  const stored = upsertPublishedQuiz(payload);
  cache.del('publishedQuizzes');
  res.json({ ok: true, quiz: stored });
});

const BLITZ_SETS = 3;
const BLITZ_ITEMS_PER_SET = 5;
const BLITZ_DISPLAY_TIME_MS = 30000; // Image display phase
const BLITZ_ANSWER_TIME_MS = 30000;  // Answer input phase
const BLITZ_ITEM_INTERVAL_MS = Math.floor(BLITZ_DISPLAY_TIME_MS / BLITZ_ITEMS_PER_SET);
const BLITZ_CATEGORY_COUNT = 10; // 2 bans + 1 pick + 2 random (min 5 total) → 10 gives good buffer
const BLITZ_THEME_RECOMMENDED_MIN = 9;
const RUNDLAUF_ROUNDS = 3;
const RUNDLAUF_CATEGORY_COUNT = 3;
const RUNDLAUF_TURN_TIME_MS = (() => {
  const raw = Number(process.env.RUNDLAUF_TURN_TIME_MS ?? 7000);
  if (!Number.isFinite(raw)) return 7000;
  return Math.max(3000, Math.floor(raw));
})();
const RUNDLAUF_ROUND_POINTS = 3; // TODO(RUNDLAUF): confirm points per round win
const RUNDLAUF_SIMILARITY_THRESHOLD = 0.85;

const BLITZ_POOL_CORE: QuizBlitzTheme[] = defaultBlitzPool;

const RUN_LOOP_CATEGORIES: RundlaufCategoryOption[] = [
  { id: 'HAUPTSTAEDTE_AFRIKA', title: 'HAUPTSTAEDTE AFRIKA' },
  { id: 'HAUPTSTAEDTE_EUROPA', title: 'HAUPTSTAEDTE EUROPA' },
  { id: 'DEUTSCHE_STAEDTE', title: 'DEUTSCHE STAEDTE' },
  { id: 'DEUTSCHE_BUNDESLAENDER', title: 'DEUTSCHE BUNDESLAENDER' },
  { id: 'US_BUNDESSTAATEN', title: 'US BUNDESSTAATEN' },
  { id: 'LAENDER_MIT_S', title: 'LAENDER MIT S' },
  { id: 'DISNEY_FILME', title: 'DISNEY FILME' },
  { id: 'AUTOMOBILMARKEN', title: 'AUTOMOBILMARKEN' },
  { id: 'AFRIKANISCHE_SAEUGETIERE', title: 'AFRIKANISCHE SAEUGETIERE' },
  { id: 'OLYMPISCHE_SPORTARTEN', title: 'OLYMPISCHE SPORTARTEN' },
  { id: 'LAENDER_MIT_A', title: 'LAENDER MIT A' },
  { id: 'FRUECHTE', title: 'FRUECHTE' },
  { id: 'GEMUESESORTEN', title: 'GEMUESESORTEN' },
  { id: 'EUROPAEISCHE_FLUESSE', title: 'EUROPAEISCHE FLUESSE' },
  { id: 'MUSIKINSTRUMENTE', title: 'MUSIKINSTRUMENTE' }
];

const RUN_LOOP_DATA: Record<string, string[]> = {
  HAUPTSTAEDTE_AFRIKA: [
    'kairo',
    'rabat',
    'tunis',
    'algier',
    'tripolis',
    'dakar',
    'accra',
    'abuja',
    'addis abeba',
    'nairobi',
    'khartoum',
    'kampala',
    'kinshasa',
    'luanda',
    'libreville',
    'lusaka',
    'harare',
    'gaborone',
    'pretoria',
    'maputo'
  ],
  HAUPTSTAEDTE_EUROPA: [
    'berlin',
    'paris',
    'london',
    'madrid',
    'rom',
    'lissabon',
    'amsterdam',
    'bruessel',
    'wien',
    'warschau',
    'prag',
    'budapest',
    'bukarest',
    'athen',
    'oslo',
    'stockholm',
    'kopenhagen',
    'helsinki',
    'dublin',
    'bratislava',
    'belgrad',
    'sofia',
    'zagreb',
    'tallinn',
    'riga',
    'vilnius'
  ],
  DEUTSCHE_STAEDTE: [
    'berlin',
    'hamburg',
    'muenchen',
    'koeln',
    'frankfurt',
    'stuttgart',
    'duesseldorf',
    'dortmund',
    'essen',
    'leipzig',
    'bremen',
    'dresden',
    'hannover',
    'nuernberg',
    'duisburg',
    'bochum',
    'wuppertal',
    'bielefeld',
    'bonn',
    'muenster'
  ],
  DEUTSCHE_BUNDESLAENDER: [
    'bayern',
    'baden-wuerttemberg',
    'niedersachsen',
    'nordrhein-westfalen',
    'hessen',
    'sachsen',
    'rheinland-pfalz',
    'thueringen',
    'brandenburg',
    'sachsen-anhalt',
    'schleswig-holstein',
    'mecklenburg-vorpommern',
    'saarland',
    'berlin',
    'bremen',
    'hamburg'
  ],
  US_BUNDESSTAATEN: [
    'alabama',
    'alaska',
    'arizona',
    'arkansas',
    'california',
    'colorado',
    'connecticut',
    'delaware',
    'florida',
    'georgia',
    'hawaii',
    'idaho',
    'illinois',
    'indiana',
    'iowa',
    'kansas',
    'kentucky',
    'louisiana',
    'maine',
    'maryland',
    'massachusetts',
    'michigan',
    'minnesota',
    'mississippi',
    'missouri',
    'montana',
    'nebraska',
    'nevada',
    'new hampshire',
    'new jersey',
    'new mexico',
    'new york',
    'north carolina',
    'north dakota',
    'ohio',
    'oklahoma',
    'oregon',
    'pennsylvania',
    'rhode island',
    'south carolina',
    'south dakota',
    'tennessee',
    'texas',
    'utah',
    'vermont',
    'virginia',
    'washington',
    'west virginia',
    'wisconsin',
    'wyoming'
  ],
  LAENDER_MIT_S: [
    'spanien',
    'schweden',
    'schweiz',
    'slowakei',
    'slowenien',
    'serbien',
    'syrien',
    'sudan',
    'suedsudan',
    'somalia',
    'suedafrika',
    'suedkorea',
    'saudi-arabien',
    'senegal',
    'sierra leone',
    'singapur',
    'sri lanka',
    'suriname',
    'swasiland'
  ],
  DISNEY_FILME: [
    'frozen',
    'moana',
    'aladdin',
    'mulan',
    'bambi',
    'dumbo',
    'cinderella',
    'schneewittchen',
    'dornroeschen',
    'pocahontas',
    'arielle',
    'beauty and the beast',
    'der koenig der loewen',
    'toy story',
    'findet nemo',
    'up',
    'wall-e',
    'coco',
    'ratatouille',
    'die unglaublichen',
    'cars',
    'monsters inc',
    'brave',
    'vaiana',
    'rapunzel'
  ],
  AUTOMOBILMARKEN: [
    'audi',
    'bmw',
    'mercedes',
    'volkswagen',
    'porsche',
    'opel',
    'ford',
    'toyota',
    'honda',
    'nissan',
    'mazda',
    'hyundai',
    'kia',
    'volvo',
    'saab',
    'peugeot',
    'renault',
    'citroen',
    'fiat',
    'alfa romeo',
    'ferrari',
    'lamborghini',
    'maserati',
    'jaguar',
    'land rover',
    'mini',
    'tesla',
    'chevrolet',
    'jeep',
    'dodge',
    'subaru',
    'lexus',
    'infiniti',
    'mitsubishi',
    'suzuki'
  ],
  AFRIKANISCHE_SAEUGETIERE: [
    'loewe',
    'elefant',
    'giraffe',
    'zebra',
    'nashorn',
    'flusspferd',
    'leopard',
    'gepard',
    'hyaene',
    'gorilla',
    'schimpanse',
    'pavian',
    'gnu',
    'antilope',
    'gazelle',
    'impala',
    'bueffel',
    'warzenschwein',
    'erdmaennchen',
    'kaenguru-ratte',
    'serval',
    'caracal',
    'honigdachs',
    'stachelschwein'
  ],
  OLYMPISCHE_SPORTARTEN: [
    'leichtathletik',
    'schwimmen',
    'turnen',
    'fussball',
    'basketball',
    'volleyball',
    'handball',
    'hockey',
    'tennis',
    'tischtennis',
    'badminton',
    'judo',
    'ringen',
    'boxen',
    'fechten',
    'schiessen',
    'bogenschiessen',
    'reiten',
    'rudern',
    'kanu',
    'segeln',
    'radfahren',
    'triathlon',
    'gewichtheben',
    'golf',
    'rugby',
    'baseball',
    'softball',
    'taekwondo',
    'karate',
    'skateboarding',
    'klettern',
    'surfen'
  ],
  LAENDER_MIT_A: [
    'afghanistan',
    'aegypten',
    'albanien',
    'algerien',
    'andorra',
    'angola',
    'antigua und barbuda',
    'aequatorialguinea',
    'argentinien',
    'armenien',
    'aserbaidschan',
    'australien',
    'oesterreich',
    'aethiopien',
    'aruba',
    'anguilla',
    'american samoa',
    'aland islands',
    'ascension island',
    'arab. emirate',
    'arabische emirate'
  ],
  FRUECHTE: [
    'apfel',
    'birne',
    'banane',
    'orange',
    'zitrone',
    'grapefruit',
    'mandarine',
    'erdbeere',
    'himbeere',
    'brombeere',
    'blaubeere',
    'kirsche',
    'pflaume',
    'pfirsich',
    'aprikose',
    'nektarine',
    'traube',
    'wassermelone',
    'honigmelone',
    'ananas',
    'mango',
    'papaya',
    'kiwi',
    'feige',
    'granatapfel'
  ],
  GEMUESESORTEN: [
    'tomate',
    'gurke',
    'paprika',
    'zucchini',
    'aubergine',
    'kuerbis',
    'karotte',
    'kartoffel',
    'zwiebel',
    'knoblauch',
    'brokkoli',
    'blumenkohl',
    'rosenkohl',
    'kohl',
    'spinat',
    'salat',
    'radieschen',
    'rettich',
    'sellerie',
    'lauch',
    'spargel',
    'erbsen',
    'bohnen',
    'mais',
    'rote bete'
  ],
  EUROPAEISCHE_FLUESSE: [
    'donau',
    'rhein',
    'elbe',
    'oder',
    'weser',
    'main',
    'mosel',
    'neckar',
    'seine',
    'loire',
    'rhone',
    'themse',
    'po',
    'tiber',
    'weichsel',
    'wolga',
    'dnjepr',
    'don',
    'duero',
    'tajo',
    'ebro'
  ],
  MUSIKINSTRUMENTE: [
    'gitarre',
    'klavier',
    'geige',
    'cello',
    'kontrabass',
    'bratsche',
    'floete',
    'oboe',
    'klarinette',
    'fagott',
    'saxophon',
    'trompete',
    'posaune',
    'horn',
    'tuba',
    'schlagzeug',
    'harfe',
    'akkordeon',
    'orgel',
    'mundharmonika',
    'xylophon',
    'triangel',
    'tamburin',
    'ukulele',
    'banjo'
  ]
};

const RUNDLAUF_DEFAULT_POINTS_TIE = 1;

const slugifyRundlaufId = (value: string) =>
  value
    .toString()
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const normalizeRundlaufPool = (pool?: string[] | null): RundlaufCategoryOption[] => {
  if (!Array.isArray(pool)) return [];
  const mapped = pool
    .map((entry) => String(entry ?? '').trim())
    .filter((entry) => entry.length > 0)
    .map((entry, idx) => ({
      id: slugifyRundlaufId(entry) || `RUNDLAUF_${idx + 1}`,
      title: entry
    }));
  const deduped: RundlaufCategoryOption[] = [];
  mapped.forEach((entry) => {
    if (!deduped.find((item) => item.id === entry.id)) deduped.push(entry);
  });
  return deduped;
};

const normalizeRundlaufConfig = (config?: RundlaufConfig | null) => {
  const pool = normalizeRundlaufPool(config?.pool ?? null);
  const turnDurationMs =
    typeof config?.turnDurationMs === 'number' && Number.isFinite(config.turnDurationMs)
      ? Math.max(3000, Math.floor(config.turnDurationMs))
      : undefined;
  const pointsWinner =
    typeof config?.pointsWinner === 'number' && Number.isFinite(config.pointsWinner)
      ? Math.max(0, Math.floor(config.pointsWinner))
      : undefined;
  const pointsTie =
    typeof config?.pointsTie === 'number' && Number.isFinite(config.pointsTie)
      ? Math.max(0, Math.floor(config.pointsTie))
      : undefined;
  return { pool, turnDurationMs, pointsWinner, pointsTie };
};

const sanitizeRundlaufDraft = (config?: RundlaufConfig | null): RundlaufConfig => {
  const pool = normalizeRundlaufPool(config?.pool ?? null).map((entry) => entry.title);
  const turnDurationMs =
    typeof config?.turnDurationMs === 'number' && Number.isFinite(config.turnDurationMs)
      ? Math.max(3000, Math.floor(config.turnDurationMs))
      : undefined;
  const pointsWinner =
    typeof config?.pointsWinner === 'number' && Number.isFinite(config.pointsWinner)
      ? Math.max(0, Math.floor(config.pointsWinner))
      : undefined;
  const pointsTie =
    typeof config?.pointsTie === 'number' && Number.isFinite(config.pointsTie)
      ? Math.max(0, Math.floor(config.pointsTie))
      : undefined;
  return { pool, turnDurationMs, pointsWinner, pointsTie };
};

// Cozy60 Studio Drafts / Builder
const cozyDraftsPath = path.join(__dirname, 'data', 'cozyQuizDrafts.json');
let cozyDrafts: CozyQuizDraft[] = [];

// Initialize with default on first run
let persistCozyDrafts = () => {
  try {
    fs.writeFileSync(cozyDraftsPath, JSON.stringify(cozyDrafts, null, 2), 'utf-8');
  } catch {
    // ignore persistence issues, builder kann erneut speichern
  }
};

// Default demo draft when no persisted drafts exist
const createDefaultDemoDraft = (): CozyQuizDraft => {
  const now = Date.now();
  return {
    id: 'cozy-demo-schnellstart',
    meta: {
      title: '🎯 Demo Quiz – Schnellstart',
      language: 'de',
      date: null,
      description: 'Kurzes Probe-Quiz zum Testen aller Mechaniken – im Builder anpassen!'
    },
    questions: [
      {
        id: 'demo-q01',
        question: 'Wie viele Einwohner hat Berlin?',
        questionEn: 'How many inhabitants does Berlin have?',
        points: 100,
        segmentIndex: 0,
        category: 'Schaetzchen',
        mechanic: 'estimate',
        targetValue: 3700000,
        unit: 'Einwohner'
      } as EstimateQuestion,
      {
        id: 'demo-q02',
        question: 'Was ist die Hauptstadt von Frankreich?',
        questionEn: 'What is the capital of France?',
        points: 100,
        segmentIndex: 0,
        category: 'Mu-Cho',
        mechanic: 'multipleChoice',
        options: ['Paris', 'Lyon', 'Marseille', 'Toulouse'],
        correctIndex: 0
      } as MultipleChoiceQuestion,
      {
        id: 'demo-q03',
        question: 'Die Erde ist flach.',
        questionEn: 'The Earth is flat.',
        points: 100,
        segmentIndex: 0,
        category: 'Stimmts',
        mechanic: 'trueFalse',
        isTrue: false
      } as TrueFalseQuestion,
      {
        id: 'demo-q04',
        question: 'Welche Stadt liegt am weitesten nördlich?',
        questionEn: 'Which city is located furthest north?',
        points: 100,
        segmentIndex: 0,
        category: 'Mu-Cho',
        mechanic: 'multipleChoice',
        options: ['Hamburg', 'München', 'Berlin', 'Köln'],
        correctIndex: 0
      } as MultipleChoiceQuestion,
      {
        id: 'demo-q05',
        question: 'Wie viele Bundesländer hat Deutschland?',
        questionEn: 'How many federal states does Germany have?',
        points: 100,
        segmentIndex: 0,
        category: 'Schaetzchen',
        mechanic: 'estimate',
        targetValue: 16,
        unit: 'Bundesländer'
      } as EstimateQuestion
    ],
    blitz: {
      pool: [
        {
          id: 'blitz-demo-1',
          title: 'Europäische Hauptstädte',
          items: [
            { id: 'b1-1', prompt: 'Hauptstadt von Italien', answer: 'Rom' },
            { id: 'b1-2', prompt: 'Hauptstadt von Spanien', answer: 'Madrid' },
            { id: 'b1-3', prompt: 'Hauptstadt von Polen', answer: 'Warschau' },
            { id: 'b1-4', prompt: 'Hauptstadt von Österreich', answer: 'Wien' },
            { id: 'b1-5', prompt: 'Hauptstadt von Niederlande', answer: 'Amsterdam' }
          ]
        },
        {
          id: 'blitz-demo-2',
          title: 'Deutsche Bundesländer',
          items: [
            { id: 'b2-1', prompt: 'Bundesland mit München', answer: 'Bayern' },
            { id: 'b2-2', prompt: 'Bundesland mit Hamburg', answer: 'Hamburg' },
            { id: 'b2-3', prompt: 'Bundesland mit Stuttgart', answer: 'Baden-Württemberg' },
            { id: 'b2-4', prompt: 'Bundesland mit Hannover', answer: 'Niedersachsen' },
            { id: 'b2-5', prompt: 'Bundesland mit Dresden', answer: 'Sachsen' }
          ]
        },
        {
          id: 'blitz-demo-3',
          title: 'Bekannte Marken',
          items: [
            { id: 'b3-1', prompt: 'Swoosh-Logo', answer: 'Nike' },
            { id: 'b3-2', prompt: 'Angebissener Apfel', answer: 'Apple' },
            { id: 'b3-3', prompt: 'Drei Streifen', answer: 'Adidas' },
            { id: 'b3-4', prompt: 'Goldene Bögen', answer: 'McDonalds' },
            { id: 'b3-5', prompt: 'Blauer Elefant', answer: 'WDR' }
          ]
        },
        {
          id: 'blitz-demo-4',
          title: 'Olympische Sportarten',
          items: [
            { id: 'b4-1', prompt: 'Mit Schläger über Netz', answer: 'Tennis' },
            { id: 'b4-2', prompt: 'Im Pool mit Bahnen', answer: 'Schwimmen' },
            { id: 'b4-3', prompt: 'Mit Ball ins Tor', answer: 'Fußball' },
            { id: 'b4-4', prompt: 'Auf Matten turnen', answer: 'Turnen' },
            { id: 'b4-5', prompt: 'Mit Pfeil und Bogen', answer: 'Bogenschießen' }
          ]
        },
        {
          id: 'blitz-demo-5',
          title: 'Beliebte Gerichte',
          items: [
            { id: 'b5-1', prompt: 'Italienisch mit Käse', answer: 'Pizza' },
            { id: 'b5-2', prompt: 'Zwischen zwei Brötchen', answer: 'Burger' },
            { id: 'b5-3', prompt: 'Lange dünne Nudeln', answer: 'Spaghetti' },
            { id: 'b5-4', prompt: 'Frittierte Kartoffeln', answer: 'Pommes' },
            { id: 'b5-5', prompt: 'Im Fladenbrot', answer: 'Döner' }
          ]
        },
        {
          id: 'blitz-demo-6',
          title: 'Berühmte Filme',
          items: [
            { id: 'b6-1', prompt: 'Eiskönigin', answer: 'Frozen' },
            { id: 'b6-2', prompt: 'Löwenkönig', answer: 'Der König der Löwen' },
            { id: 'b6-3', prompt: 'Spielzeug wird lebendig', answer: 'Toy Story' },
            { id: 'b6-4', prompt: 'Clownfisch sucht Sohn', answer: 'Findet Nemo' },
            { id: 'b6-5', prompt: 'Zauberer mit Brille', answer: 'Harry Potter' }
          ]
        },
        {
          id: 'blitz-demo-7',
          title: 'Musikinstrumente',
          items: [
            { id: 'b7-1', prompt: 'Mit 6 Saiten', answer: 'Gitarre' },
            { id: 'b7-2', prompt: 'Schwarz-weiße Tasten', answer: 'Klavier' },
            { id: 'b7-3', prompt: 'Mit Stöcken schlagen', answer: 'Schlagzeug' },
            { id: 'b7-4', prompt: 'Blasen mit Löchern', answer: 'Flöte' },
            { id: 'b7-5', prompt: 'Mit Bogen streichen', answer: 'Geige' }
          ]
        },
        {
          id: 'blitz-demo-8',
          title: 'Tiere in Afrika',
          items: [
            { id: 'b8-1', prompt: 'König der Tiere', answer: 'Löwe' },
            { id: 'b8-2', prompt: 'Größtes Landtier', answer: 'Elefant' },
            { id: 'b8-3', prompt: 'Langer Hals', answer: 'Giraffe' },
            { id: 'b8-4', prompt: 'Schwarz-weiß gestreift', answer: 'Zebra' },
            { id: 'b8-5', prompt: 'Mit Horn vorne', answer: 'Nashorn' }
          ]
        },
        {
          id: 'blitz-demo-9',
          title: 'Obstarten',
          items: [
            { id: 'b9-1', prompt: 'Rot und rund', answer: 'Apfel' },
            { id: 'b9-2', prompt: 'Gelb und krumm', answer: 'Banane' },
            { id: 'b9-3', prompt: 'Orange Zitrusfrucht', answer: 'Orange' },
            { id: 'b9-4', prompt: 'Grün oder rot, klein', answer: 'Traube' },
            { id: 'b9-5', prompt: 'Braun und behaart', answer: 'Kiwi' }
          ]
        }
      ]
    },
    updatedAt: now,
    createdAt: now,
    status: 'draft',
    rundlauf: {
      pool: ['Europäische Hauptstädte', 'Deutsche Flüsse', 'Berühmte Musiker', 'Olympische Sportarten', 'Automobilmarken', 'Fruechte', 'Weltmeere', 'Chemische Elemente', 'Fußball Bundesligisten'],
      turnDurationMs: 7000,
      pointsWinner: 3,
      pointsTie: 1
    },
    enableBingo: false
  } as CozyQuizDraft;
};

try {
  if (fs.existsSync(cozyDraftsPath)) {
    const loaded = JSON.parse(fs.readFileSync(cozyDraftsPath, 'utf-8'));
    cozyDrafts = Array.isArray(loaded) && loaded.length > 0 ? loaded : [createDefaultDemoDraft()];
  } else {
    // File doesn't exist, create with default
    cozyDrafts = [createDefaultDemoDraft()];
    persistCozyDrafts();
  }
} catch {
  // Fallback: create default draft if JSON is corrupted
  cozyDrafts = [createDefaultDemoDraft()];
}

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

const buildPlaceholderBlitzPool = (draftId: string): QuizBlitzTheme[] =>
  defaultBlitzPool.map((theme, themeIdx) => {
    const baseId = theme.id || `blitz-${themeIdx + 1}`;
    return {
      id: `${draftId}-${baseId}`,
      title: theme.title,
      items: theme.items.map((item, itemIdx) => ({
        id: `${draftId}-${baseId}-${itemIdx + 1}`,
        prompt: item.prompt,
        answer: item.answer,
        aliases: item.aliases,
        mediaUrl: typeof (item as any)?.mediaUrl === 'string' ? (item as any).mediaUrl : undefined
      }))
    };
  });

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
  rundlauf: sanitizeRundlaufDraft(draft.rundlauf ?? null),
  enableBingo: Boolean(draft.enableBingo),
  status: draft.status || 'draft',
  createdAt: draft.createdAt || Date.now(),
  updatedAt: draft.updatedAt || Date.now(),
  lastPublishedAt: draft.lastPublishedAt ?? null
} as CozyQuizDraft);

cozyDrafts = cozyDrafts.map((draft) => hydrateCozyDraft(draft));

const createNewCozyDraft = (meta?: Partial<CozyQuizMeta>): CozyQuizDraft => {
  const id = `cozy-draft-${uuid().slice(0, 8)}`;
  const now = Date.now();
  return {
    id,
    meta: ensureCozyMeta(meta),
    questions: buildDefaultCozyQuestions(id),
    blitz: { pool: buildPlaceholderBlitzPool(id) },
    rundlauf: sanitizeRundlaufDraft({
      pool: RUN_LOOP_CATEGORIES.map((entry) => entry.title),
      turnDurationMs: RUNDLAUF_TURN_TIME_MS,
      pointsWinner: RUNDLAUF_ROUND_POINTS,
      pointsTie: RUNDLAUF_DEFAULT_POINTS_TIE
    }),
    enableBingo: false,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    lastPublishedAt: null
  } as CozyQuizDraft;
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
    
    // Cast to any for merge (entry might be partial/custom format)
    const entryAny = entry as any;
    const merged = {
      ...fallbackQuestion,
      ...entryAny
    } as AnyQuestion;
    
    // Safe ID assignment
    const rawId = entryAny?.id;
    if (typeof rawId === 'string' && rawId.trim()) {
      merged.id = rawId.trim();
    }
    
    // Safe points assignment with type-check
    const entryPoints = entryAny?.points;
    if (typeof entryPoints === 'number') {
      merged.points = entryPoints;
    } else {
      merged.points = fallbackQuestion.points;
    }
    
    // Safe segment index from template
    const template = COZY_SLOT_TEMPLATE[idx];
    if (template && typeof template.segmentIndex === 'number') {
      (merged as any).segmentIndex = template.segmentIndex;
    }
    
    // Safe bunteTuete inheritance
    if (!entryAny?.bunteTuete && fallbackQuestion && (fallbackQuestion as any).bunteTuete) {
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

const applyDraftUpdate = (draft: CozyQuizDraft, payload: Partial<CozyQuizDraft>): CozyQuizDraft => {
  const metaSource = payload.meta ? { ...draft.meta, ...payload.meta } : draft.meta;
  const updated = {
    ...draft,
    meta: ensureCozyMeta(metaSource),
    questions: payload.questions ? sanitizeCozyQuestions(draft.id, payload.questions as AnyQuestion[]) : draft.questions,
    blitz: { pool: sanitizeBlitzPool(draft.id, payload.blitz?.pool ?? draft.blitz?.pool) },
    rundlauf: sanitizeRundlaufDraft(payload.rundlauf ?? draft.rundlauf),
    enableBingo: payload.enableBingo ?? draft.enableBingo,
    updatedAt: Date.now()
  } as CozyQuizDraft;
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
type AllTimeTeamStat = { teamName: string; wins: number; games: number; totalScore: number; avgScore: number | null };
const buildAllTimeLeaderboard = (state: StatsState) => {
  const teamStats = new Map<string, { wins: number; games: number; totalScore: number; scoredGames: number }>();

  state.runs.forEach((run) => {
    const winners = Array.isArray(run.winners) ? run.winners : [];
    winners.forEach((name) => {
      const entry = teamStats.get(name) || { wins: 0, games: 0, totalScore: 0, scoredGames: 0 };
      entry.wins += 1;
      teamStats.set(name, entry);
    });

    if (run.scores) {
      Object.entries(run.scores).forEach(([name, score]) => {
        const entry = teamStats.get(name) || { wins: 0, games: 0, totalScore: 0, scoredGames: 0 };
        entry.games += 1;
        entry.totalScore += score ?? 0;
        entry.scoredGames += 1;
        teamStats.set(name, entry);
      });
    } else {
      winners.forEach((name) => {
        const entry = teamStats.get(name) || { wins: 0, games: 0, totalScore: 0, scoredGames: 0 };
        entry.games += 1;
        teamStats.set(name, entry);
      });
    }
  });

  const topTeams: AllTimeTeamStat[] = Array.from(teamStats.entries())
    .map(([teamName, entry]) => ({
      teamName,
      wins: entry.wins,
      games: entry.games,
      totalScore: entry.totalScore,
      avgScore: entry.scoredGames > 0 ? Math.round(entry.totalScore / entry.scoredGames) : null
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if ((b.avgScore ?? 0) !== (a.avgScore ?? 0)) return (b.avgScore ?? 0) - (a.avgScore ?? 0);
      return b.games - a.games;
    })
    .slice(0, 10);

  const funnyAnswers = [...(state.funnyAnswers || [])]
    .sort((a, b) => b.markedAt - a.markedAt)
    .slice(0, 10);

  return {
    topTeams,
    funnyAnswers,
    lastUpdated: Date.now()
  };
};

app.get('/api/stats/leaderboard', (_req, res) => {
  const runs = statsState.runs.slice(-10).reverse();
  const allTime = buildAllTimeLeaderboard(statsState);
  res.json({ runs, allTime });
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
      rundlauf: finalized.rundlauf ?? null,
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

app.post('/api/studio/cozy60/:id/duplicate', (req, res) => {
  try {
    const { draft } = getCozyDraftOrFail(req.params.id);
    const newTitle = typeof req.body?.newTitle === 'string' ? req.body.newTitle : `${draft.meta.title} (Kopie)`;
    
    const newDraft: CozyQuizDraft = {
      ...JSON.parse(JSON.stringify(draft)), // Deep clone
      id: `cozy-draft-${uuid().slice(0, 8)}`,
      meta: {
        ...draft.meta,
        title: newTitle
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastPublishedAt: undefined
    };
    
    cozyDrafts.push(newDraft);
    persistCozyDrafts();
    res.json({ draft: newDraft, warnings: collectCozyDraftWarnings(newDraft) });
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Draft nicht gefunden' ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

// Register studio routes AFTER cozy60 routes so specific routes match first

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
      connectedTeams: {},
      currentQuestionId: null,
      answers: {},
      quizId: null,
      questionOrder: [],
      remainingQuestionIds: [],
      askedQuestionIds: [],
      teamBoards: {},
      bingoEnabled: false,
      timerEndsAt: null,
      questionTimerDurationMs: null,
      questionIntroTimeout: null,
      questionTimerTimeout: null,
      screen: 'lobby',
      questionPhase: 'idle',
      lastActivityAt: Date.now(),
      language: 'de',
      gameState: INITIAL_GAME_STATE,
      stateHistory: [INITIAL_GAME_STATE],
      segmentTwoBaselineScores: null,
      blitzPool: [],
      blitzThemeLibrary: {},
      blitzDisplayTimeMs: BLITZ_DISPLAY_TIME_MS,
      blitzAnswerTimeMs: BLITZ_ANSWER_TIME_MS,
      blitzBans: {},
      blitzBanLimits: {},
      blitzSelectedThemes: [],
      blitzSetIndex: -1,
      blitzPhase: 'IDLE',
      blitzDeadlineAt: null,
      blitzTheme: null,
      blitzPinnedTheme: null,
      blitzTopTeamId: null,
      blitzLastTeamId: null,
      blitzItems: [],
      blitzItemIndex: -1,
      blitzItemDeadlineAt: null,
      blitzItemDurationMs: null,
      blitzItemSolutions: [],
      blitzAnswersByTeam: {},
      blitzResultsByTeam: {},
      blitzSubmittedTeamIds: [],
      blitzRoundIntroTimeout: null,
      rundlaufPool: [],
      rundlaufPresetPool: [...RUN_LOOP_CATEGORIES],
      rundlaufBans: [],
      rundlaufSelectedCategories: [],
      rundlaufPinnedCategory: null,
      rundlaufTopTeamId: null,
      rundlaufLastTeamId: null,
      rundlaufRoundIndex: -1,
      rundlaufTurnOrder: [],
      rundlaufActiveTeamId: null,
      rundlaufEliminatedTeamIds: [],
      rundlaufUsedAnswers: [],
      rundlaufUsedAnswersNormalized: [],
      rundlaufLastAttempt: null,
      rundlaufDeadlineAt: null,
      rundlaufTurnStartedAt: null,
      rundlaufTurnDurationMs: RUNDLAUF_TURN_TIME_MS,
      rundlaufPointsWinner: RUNDLAUF_ROUND_POINTS,
      rundlaufPointsTie: RUNDLAUF_DEFAULT_POINTS_TIE,
      rundlaufRoundWinners: [],
      rundlaufRoundIntroTimeout: null,
      oneOfEightTurnOrder: [],
      oneOfEightTurnIndex: 0,
      oneOfEightActiveTeamId: null,
      oneOfEightUsedChoiceIds: [],
      oneOfEightLoserTeamId: null,
      oneOfEightWinnerTeamIds: [],
      oneOfEightFinished: false,
      validationWarnings: [],
      nextStage: null,
      scoreboardOverlayForced: false,
      halftimeTriggered: false,
      finalsTriggered: false,
      statsAnswerTimings: new Map(),
      statsFunnyAnswers: new Map(),
      statsWrongAnswerCounts: new Map()
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rooms.get(code)!;
};

const touchRoom = (room: RoomState) => {
  room.lastActivityAt = Date.now();
};

const getConnectedTeamIds = (room: RoomState) =>
  Object.keys(room.connectedTeams).filter((teamId) => room.connectedTeams[teamId] > 0);

const markTeamConnected = (room: RoomState, teamId: string) => {
  room.connectedTeams[teamId] = (room.connectedTeams[teamId] ?? 0) + 1;
};

const markTeamDisconnected = (room: RoomState, teamId: string) => {
  if (!room.connectedTeams[teamId]) return;
  room.connectedTeams[teamId] -= 1;
  if (room.connectedTeams[teamId] <= 0) {
    delete room.connectedTeams[teamId];
    if (room.gameState === 'RUNDLAUF_PLAY' && room.rundlaufActiveTeamId === teamId) {
      advanceRundlaufTurn(room);
    }
  }
};

const clearQuestionTimers = (room: RoomState) => {
  if (room.questionIntroTimeout) {
    clearTimeout(room.questionIntroTimeout);
    room.questionIntroTimeout = null;
  }
  if (room.questionTimerTimeout) {
    clearTimeout(room.questionTimerTimeout);
    room.questionTimerTimeout = null;
  }
};

const startQuestionTimer = (room: RoomState, durationMs: number) => {
  clearQuestionTimers(room);
  const endsAt = Date.now() + durationMs;
  room.timerEndsAt = endsAt;
  room.questionTimerDurationMs = durationMs;
  room.questionTimerTimeout = setTimeout(() => {
    if (room.gameState !== 'Q_ACTIVE') return;
    if (!room.timerEndsAt) return;
    clearQuestionTimers(room);
    evaluateCurrentQuestion(room);
    // Auto-reveal for estimate questions with ≤1 answer (skip Q_LOCKED)
    const q = room.currentQuestionId ? questionById.get(room.currentQuestionId) : null;
    if (q?.mechanic === 'estimate' && Object.keys(room.answers).length <= 1) {
      revealAnswersForRoom(room);
    }
  }, durationMs + 20);
  io.to(room.roomCode).emit('timerStarted', { endsAt });
};

const log = (roomCode: string, message: string, ...args: unknown[]) => {
  if (!DEBUG) return;
  console.log(`[${roomCode}] ${message}`, ...args);
};

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

const selectBlitzVisiblePool = (themes: QuizBlitzTheme[], visibleCount: number) => {
  const pool = [...themes];
  pool.sort(() => Math.random() - 0.5);
  return pool.slice(0, Math.max(0, Math.min(visibleCount, pool.length))).map(toBlitzOption);
};

const getTeamStandings = (room: RoomState) =>
  Object.values(room.teams)
    .map((team) => ({
      id: team.id,
      name: team.name,
      score: team.score ?? 0
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.name || '').localeCompare(b.name || '');
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

const initializeBlitzStage = (room: RoomState) => {
  const definitions = BLITZ_POOL_CORE.length ? BLITZ_POOL_CORE : DEFAULT_BLITZ_THEMES.map(buildLegacyBlitzTheme);
  const normalizedDefs = definitions.map((theme, idx) => normalizeBlitzTheme(theme, idx));
  room.blitzThemeLibrary = normalizedDefs.reduce<Record<string, QuizBlitzTheme>>((acc, theme) => {
    acc[theme.id] = theme;
    return acc;
  }, {});
  const visibleCount = Math.max(0, Math.min(BLITZ_CATEGORY_COUNT, normalizedDefs.length));
  room.blitzPool = selectBlitzVisiblePool(normalizedDefs, visibleCount);
  room.blitzBans = {};
  const standings = getTeamStandings(room);

  // Always assign exactly one top team (first in sorted standings) and one last team.
  // Using the same simple logic as host:blitzOpenSelection for consistency.
  const topStanding = standings[0];
  const lastStanding = standings[standings.length - 1];
  const topScore = topStanding?.score ?? 0;
  const lastScore = lastStanding?.score ?? 0;

  room.blitzTopTeamId = topStanding?.id ?? null;
  // Only skip the pick (null) when all teams are truly equal – no meaningful "last place"
  room.blitzLastTeamId = (topScore !== lastScore && lastStanding)
    ? lastStanding.id
    : null;
  // Top team always bans exactly 2 categories
  room.blitzBanLimits = room.blitzTopTeamId ? { [room.blitzTopTeamId]: 2 } : {};
  
  room.blitzPinnedTheme = null;
  room.blitzSelectedThemes = [];
  room.blitzSetIndex = -1;
  room.blitzPhase = 'READY';
  room.blitzDeadlineAt = null;
  room.blitzTheme = null;
  room.blitzItems = [];
  room.blitzItemSolutions = [];
  resetBlitzCollections(room);
  recomputeRoomWarnings(room);
  room.nextStage = null;
  applyRoomState(room, { type: 'FORCE', next: 'BLITZ_READY' });
  return room.blitzPool;
};

const hasBlitzSelectionReady = (room: RoomState) => {
  // Check if all teams with ban limits have finished banning
  const teamsWithBanLimits = Object.keys(room.blitzBanLimits);
  const allBansComplete = teamsWithBanLimits.every(teamId => {
    const required = room.blitzBanLimits[teamId] ?? 0;
    const bans = room.blitzBans[teamId]?.length ?? 0;
    return bans >= required;
  });
  
  // Check if pick is ready (at least one theme pinned, or no last team)
  const pickReady = Boolean(room.blitzPinnedTheme) || !room.blitzLastTeamId;
  
  return allBansComplete && pickReady;
};

const finalizeBlitzSelection = (room: RoomState) => {
  const bannedIds = new Set(Object.values(room.blitzBans).flat());
  const pinned = room.blitzPinnedTheme ?? null;
  const remaining = room.blitzPool.filter((entry) => !bannedIds.has(entry.id) && entry.id !== pinned?.id);
  const shuffled = [...remaining].sort(() => Math.random() - 0.5);
  
  // Determine how many random themes to pick
  // If multiple top teams (each banned 1) and last team picked 1: only 1 random theme
  // Otherwise: 2 random themes
  const topTeamsCount = Object.keys(room.blitzBanLimits).length;
  const totalBans = Object.values(room.blitzBans).flat().length;
  const needed = (topTeamsCount >= 2 && pinned) ? 1 : 2;
  
  const randomPick = shuffled.slice(0, needed);
  room.blitzSelectedThemes = pinned ? [pinned, ...randomPick] : randomPick;
  room.blitzSetIndex = -1;
  room.blitzDeadlineAt = null;
  room.blitzTheme = null;
  resetBlitzCollections(room);
};

const applyBlitzBan = (room: RoomState, teamId: string, themeKey: string) => {
  // Check if this team is allowed to ban
  const limit = room.blitzBanLimits[teamId] ?? 0;
  if (limit <= 0) throw new Error('Dieses Team darf nicht bannen');
  
  if (room.blitzPinnedTheme) {
    throw new Error('Thema bereits gewaehlt');
  }
  const bans = room.blitzBans[teamId] ?? [];
  if (bans.length >= limit) throw new Error('Ban-Limit erreicht');
  const themeId = themeKey.trim();
  if (!themeId) throw new Error('Thema fehlt');
  const theme = room.blitzPool.find(
    (entry) => entry.id === themeId || entry.title.toLowerCase() === themeId.toLowerCase()
  );
  if (!theme) throw new Error('Thema nicht verfuegbar');
  if (bans.includes(theme.id)) throw new Error('Thema bereits gebannt');
  room.blitzBans[teamId] = [...bans, theme.id];
};

const applyBlitzPick = (room: RoomState, teamId: string, themeKey: string) => {
  if (room.blitzLastTeamId && teamId !== room.blitzLastTeamId) {
    throw new Error('Nur letzter Platz darf waehlen');
  }
  // Check if all bans are complete
  const teamsWithBanLimits = Object.keys(room.blitzBanLimits);
  const allBansComplete = teamsWithBanLimits.every(tId => {
    const required = room.blitzBanLimits[tId] ?? 0;
    const bans = room.blitzBans[tId]?.length ?? 0;
    return bans >= required;
  });
  if (!allBansComplete) {
    throw new Error('Erst bannen, dann waehlen');
  }
  const themeId = themeKey.trim();
  if (!themeId) throw new Error('Thema fehlt');
  const theme = room.blitzPool.find(
    (entry) => entry.id === themeId || entry.title.toLowerCase() === themeId.toLowerCase()
  );
  if (!theme) throw new Error('Thema nicht verfuegbar');
  const bannedIds = new Set(Object.values(room.blitzBans).flat());
  if (bannedIds.has(theme.id)) throw new Error('Thema gebannt');
  room.blitzPinnedTheme = theme;
};

const clearBlitzItemTimer = (roomCode: string) => {
  const timer = blitzItemTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    blitzItemTimers.delete(roomCode);
  }
};

const clearBlitzSetTimer = (roomCode: string) => {
  const timer = blitzSetTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    blitzSetTimers.delete(roomCode);
  }
};

const clearBlitzRoundIntroTimer = (room: RoomState) => {
  if (room.blitzRoundIntroTimeout) {
    clearTimeout(room.blitzRoundIntroTimeout);
    room.blitzRoundIntroTimeout = null;
  }
};

const scheduleBlitzSetTimer = (room: RoomState) => {
  clearBlitzSetTimer(room.roomCode);
  // Support both DISPLAYING and PLAYING phases
  if ((room.blitzPhase !== 'PLAYING' && room.blitzPhase !== 'DISPLAYING') || !room.blitzDeadlineAt) return;
  const remaining = Math.max(0, room.blitzDeadlineAt - Date.now());

  console.log('[BLITZ TIMER] Scheduling for phase:', room.blitzPhase, '| Remaining:', remaining, 'ms');

  if (remaining <= 0) {
    if (room.blitzPhase === 'DISPLAYING') {
      lockBlitzSet(room); // Transition to PLAYING
    } else {
      lockBlitzSet(room);
      computeBlitzResults(room);
    }
    broadcastState(room);
    return;
  }
  const timer = setTimeout(() => {
    blitzSetTimers.delete(room.roomCode);
    console.log('[BLITZ TIMER] Timer fired for phase:', room.blitzPhase);
    if (room.blitzPhase === 'DISPLAYING') {
      lockBlitzSet(room); // Transition to PLAYING
      broadcastState(room);
    } else if (room.blitzPhase === 'PLAYING') {
      lockBlitzSet(room);
      computeBlitzResults(room);
      broadcastState(room);
    }
  }, remaining);
  blitzSetTimers.set(room.roomCode, timer);
};

const scheduleBlitzItemTicker = (room: RoomState, broadcast = false) => {
  clearBlitzItemTimer(room.roomCode);
  if (room.blitzPhase !== 'PLAYING' && room.blitzPhase !== 'DISPLAYING') {
    room.blitzItemDeadlineAt = null;
    room.blitzItemDurationMs = null;
    if (broadcast) broadcastState(room);
    return;
  }

  // ROBUST: Ensure we have items before starting ticker
  if (!room.blitzItems || room.blitzItems.length === 0) {
    console.error('[BLITZ TICKER] ERROR: No items to display!');
    if (broadcast) broadcastState(room);
    return;
  }

  const itemCount = room.blitzItems.length || BLITZ_ITEMS_PER_SET;
  const maxIndex = Math.max(0, itemCount - 1);
  const displayTotalMs = Number.isFinite(room.blitzDisplayTimeMs) && room.blitzDisplayTimeMs
    ? room.blitzDisplayTimeMs
    : BLITZ_DISPLAY_TIME_MS;
  const itemIntervalMs = Math.max(1000, Math.floor(displayTotalMs / itemCount));
  const now = Date.now();

  console.log('[BLITZ TICKER] Phase:', room.blitzPhase, '| Current index:', room.blitzItemIndex, '/', maxIndex, '| Interval:', itemIntervalMs, 'ms');

  if (room.blitzItemIndex >= maxIndex) {
    room.blitzItemDeadlineAt = room.blitzDeadlineAt;
    room.blitzItemDurationMs = room.blitzDeadlineAt ? Math.max(0, room.blitzDeadlineAt - now) : null;
    console.log('[BLITZ TICKER] Reached last item, no more rotation');
    if (broadcast) broadcastState(room);
    return;
  }
  room.blitzItemDeadlineAt = now + itemIntervalMs;
  room.blitzItemDurationMs = itemIntervalMs;
  if (broadcast) broadcastState(room);
  const timer = setTimeout(() => {
    blitzItemTimers.delete(room.roomCode);
    if (room.blitzPhase !== 'PLAYING' && room.blitzPhase !== 'DISPLAYING') return;
    const newIndex = Math.min(maxIndex, room.blitzItemIndex < 0 ? 0 : room.blitzItemIndex + 1);
    console.log('[BLITZ TICKER] Rotating to item', newIndex, '/', maxIndex);
    room.blitzItemIndex = newIndex;
    scheduleBlitzItemTicker(room, true);
  }, itemIntervalMs);
  blitzItemTimers.set(room.roomCode, timer);
};

const resetBlitzCollections = (room: RoomState) => {
  room.blitzAnswersByTeam = {};
  room.blitzResultsByTeam = {};
  room.blitzSubmittedTeamIds = [];
  room.blitzItemIndex = -1;
  room.blitzItemDeadlineAt = null;
  room.blitzItemDurationMs = null;
  clearBlitzItemTimer(room.roomCode);
  clearBlitzSetTimer(room.roomCode);
  clearBlitzRoundIntroTimer(room);
};

const startBlitzSet = (room: RoomState) => {
  console.log('[BLITZ] startBlitzSet called | Current phase:', room.blitzPhase, '| GameState:', room.gameState);

  // Only allow starting a new set if we're not already playing
  if (room.blitzPhase === 'PLAYING' || room.blitzPhase === 'ROUND_INTRO' || room.blitzPhase === 'DISPLAYING') {
    throw new Error('Blitz-Set laeuft bereits');
  }
  if (room.blitzSelectedThemes.length < 1) {
    throw new Error('Nicht genug Blitz-Themen ausgewaehlt');
  }
  const totalSets = Math.min(BLITZ_SETS, room.blitzSelectedThemes.length);
  if (room.blitzSetIndex >= totalSets - 1) {
    throw new Error('Alle Blitz-Sets wurden gespielt');
  }
  // Clear pinned theme for next set selection
  room.blitzPinnedTheme = null;
  const nextIndex = room.blitzSetIndex + 1;
  room.blitzSetIndex = nextIndex;
  room.blitzTheme = room.blitzSelectedThemes[nextIndex] ?? null;
  console.log('[BLITZ] Selected theme:', room.blitzTheme?.title, '| Index:', nextIndex);

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
    console.log('[BLITZ] Loaded', views.length, 'items from theme');
  } else {
    const placeholder = buildLegacyBlitzTheme(room.blitzTheme?.title || `Set ${nextIndex + 1}`);
    const { views, solutions } = selectBlitzItems(placeholder);
    room.blitzItems = views;
    room.blitzItemSolutions = solutions;
    room.blitzThemeLibrary[placeholder.id] = placeholder;
    room.blitzTheme = toBlitzOption(placeholder);
    console.log('[BLITZ] Created placeholder with', views.length, 'items');
  }
  resetBlitzCollections(room);
  room.blitzPhase = 'ROUND_INTRO';
  room.blitzDeadlineAt = Date.now() + BLITZ_ROUND_INTRO_MS;
  room.blitzItemIndex = 0;
  applyRoomState(room, { type: 'FORCE', next: 'BLITZ_SET_INTRO' });
  console.log('[BLITZ] Entering ROUND_INTRO phase with', BLITZ_ROUND_INTRO_MS, 'ms countdown');
  broadcastState(room);
  clearBlitzRoundIntroTimer(room);
  room.blitzRoundIntroTimeout = setTimeout(() => {
    room.blitzRoundIntroTimeout = null;
    console.log('[BLITZ] ROUND_INTRO timeout fired | Current phase:', room.blitzPhase, '| State:', room.gameState);

    // ROBUST FIX: Don't fail silently - always try to start DISPLAYING
    if (room.blitzPhase !== 'ROUND_INTRO') {
      console.log('[BLITZ] WARNING: Phase changed to', room.blitzPhase, '- forcing back to ROUND_INTRO');
      room.blitzPhase = 'ROUND_INTRO';
    }

    applyRoomState(room, { type: 'FORCE', next: 'BLITZ_PLAYING' });
    room.blitzPhase = 'DISPLAYING';
    room.blitzDeadlineAt = Date.now() + room.blitzDisplayTimeMs;
    room.blitzItemIndex = 0;
    console.log('[BLITZ] ✓ Starting DISPLAYING phase | Display time:', room.blitzDisplayTimeMs, 'ms | Items:', room.blitzItems.length);

    // CRITICAL: Always start item ticker
    try {
      scheduleBlitzItemTicker(room, true);
      scheduleBlitzSetTimer(room);
      console.log('[BLITZ] ✓ Timers started successfully');
    } catch (error) {
      console.error('[BLITZ] ✗ ERROR starting timers:', error);
    }

    broadcastState(room);
  }, BLITZ_ROUND_INTRO_MS);
};

const lockBlitzSet = (room: RoomState) => {
  if (room.blitzPhase === 'DISPLAYING') {
    // Transition from display to answer phase
    room.blitzPhase = 'PLAYING';
    room.blitzDeadlineAt = Date.now() + room.blitzAnswerTimeMs;
    clearBlitzItemTimer(room.roomCode);
    clearBlitzSetTimer(room.roomCode);
    scheduleBlitzSetTimer(room);
    return;
  }
  if (room.blitzPhase !== 'PLAYING') return;
  room.blitzPhase = 'SET_END';
  room.blitzDeadlineAt = null;
  clearBlitzItemTimer(room.roomCode);
  clearBlitzSetTimer(room.roomCode);
  room.blitzItemDeadlineAt = null;
  room.blitzItemDurationMs = null;
  applyRoomState(room, { type: 'FORCE', next: 'BLITZ_SET_END' });
};

const enforceBlitzDeadline = (room: RoomState) => {
  if (room.blitzDeadlineAt && Date.now() > room.blitzDeadlineAt) {
    const phaseBefore = room.blitzPhase;
    if (phaseBefore === 'DISPLAYING' || phaseBefore === 'PLAYING') {
      lockBlitzSet(room);
      // After lockBlitzSet, phase might have changed
      if (phaseBefore === 'PLAYING') {
        computeBlitzResults(room);
      }
    }
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
  const totalSets = Math.min(BLITZ_SETS, room.blitzSelectedThemes.length || BLITZ_SETS);
  if (teamCount <= 1) {
    room.blitzResultsByTeam = provisional;
    room.blitzPhase = 'SET_END';
    room.blitzDeadlineAt = null;
    applyRoomState(room, { type: 'FORCE', next: 'BLITZ_SET_END' });
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
    applyRoomState(room, { type: 'FORCE', next: 'BLITZ_SET_END' });
    if (room.blitzSetIndex >= totalSets - 1) {
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
  applyRoomState(room, { type: 'FORCE', next: 'BLITZ_SET_END' });
  if (room.blitzSetIndex >= totalSets - 1) {
    finishBlitzStage(room);
  }
};

const finishBlitzStage = (room: RoomState) => {
  room.blitzPhase = 'DONE';
  room.blitzDeadlineAt = null;
  room.blitzTheme = null;
  room.blitzPinnedTheme = null;
  room.blitzItems = [];
  room.blitzItemIndex = -1;
  room.blitzItemDeadlineAt = null;
  room.blitzItemDurationMs = null;
  clearBlitzItemTimer(room.roomCode);
  clearBlitzSetTimer(room.roomCode);
  clearBlitzRoundIntroTimer(room);
  room.blitzItemSolutions = [];
  room.nextStage = null;
  applyRoomState(room, { type: 'FORCE', next: 'BLITZ_SCOREBOARD' });
};

const buildRundlaufCategoryPool = (
  visibleCount: number,
  source?: RundlaufCategoryOption[]
): RundlaufCategoryOption[] => {
  const base = source && source.length ? source : RUN_LOOP_CATEGORIES;
  const pool = [...base];
  pool.sort(() => Math.random() - 0.5);
  const limit = Math.max(1, Math.min(visibleCount, pool.length));
  return pool.slice(0, limit);
};

const clearRundlaufTurnTimer = (roomCode: string) => {
  const timer = rundlaufTurnTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    rundlaufTurnTimers.delete(roomCode);
  }
};

const clearRundlaufRoundIntroTimer = (room: RoomState) => {
  if (room.rundlaufRoundIntroTimeout) {
    clearTimeout(room.rundlaufRoundIntroTimeout);
    room.rundlaufRoundIntroTimeout = null;
  }
};

const aliveRundlaufTeams = (room: RoomState) => {
  const connected = new Set(getConnectedTeamIds(room));
  const eliminated = new Set(room.rundlaufEliminatedTeamIds);
  return room.rundlaufTurnOrder.filter((teamId) => connected.has(teamId) && !eliminated.has(teamId));
};

const scheduleRundlaufTurnTimer = (room: RoomState) => {
  clearRundlaufTurnTimer(room.roomCode);
  if (room.gameState !== 'RUNDLAUF_PLAY' || !room.rundlaufActiveTeamId) {
    room.rundlaufTurnStartedAt = null;
    room.rundlaufDeadlineAt = null;
    return;
  }
  room.rundlaufTurnStartedAt = Date.now();
  const turnMs = room.rundlaufTurnDurationMs || RUNDLAUF_TURN_TIME_MS;
  room.rundlaufDeadlineAt = room.rundlaufTurnStartedAt + turnMs;
  room.rundlaufTurnDurationMs = turnMs;
  const timer = setTimeout(() => {
    rundlaufTurnTimers.delete(room.roomCode);
    if (room.gameState !== 'RUNDLAUF_PLAY') return;
    if (!room.rundlaufActiveTeamId) return;
    const attempt: RundlaufAttempt = {
      id: uuid(),
      teamId: room.rundlaufActiveTeamId,
      text: '',
      normalized: '',
      verdict: 'timeout',
      reason: 'timeout',
      at: Date.now()
    };
    room.rundlaufLastAttempt = attempt;
    const eliminated = new Set(room.rundlaufEliminatedTeamIds);
    eliminated.add(room.rundlaufActiveTeamId);
    room.rundlaufEliminatedTeamIds = Array.from(eliminated);
    if (aliveRundlaufTeams(room).length <= 1) {
      const winners = aliveRundlaufTeams(room);
      const uniqueWinners = Array.from(new Set(winners));
      uniqueWinners.forEach((teamId) => {
        if (room.teams[teamId]) {
          room.teams[teamId].score = (room.teams[teamId].score ?? 0) + RUNDLAUF_ROUND_POINTS;
        }
      });
      room.rundlaufRoundWinners = uniqueWinners;
      room.rundlaufActiveTeamId = null;
      room.rundlaufDeadlineAt = null;
      room.rundlaufTurnStartedAt = null;
      applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_ROUND_END' });
    } else {
      const alive = aliveRundlaufTeams(room);
      const currentIdx = alive.indexOf(room.rundlaufActiveTeamId);
      const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % alive.length : 0;
      room.rundlaufActiveTeamId = alive[nextIdx] ?? null;
      scheduleRundlaufTurnTimer(room);
    }
    broadcastState(room);
  }, turnMs);
  rundlaufTurnTimers.set(room.roomCode, timer);
};

const setRundlaufActiveTeam = (room: RoomState, teamId: string | null) => {
  room.rundlaufActiveTeamId = teamId;
  room.rundlaufLastAttempt = null;
  scheduleRundlaufTurnTimer(room);
};

const assignRundlaufTurnOrder = (room: RoomState) => {
  room.rundlaufTurnOrder = getTeamsByScore(room, 'desc').map((team) => team.id);
};

const advanceRundlaufTurn = (room: RoomState) => {
  const alive = aliveRundlaufTeams(room);
  if (alive.length <= 1) {
    const winners = alive;
    const uniqueWinners = Array.from(new Set(winners));
    uniqueWinners.forEach((teamId) => {
      if (room.teams[teamId]) {
        room.teams[teamId].score = (room.teams[teamId].score ?? 0) + RUNDLAUF_ROUND_POINTS;
      }
    });
    room.rundlaufRoundWinners = uniqueWinners;
    room.rundlaufActiveTeamId = null;
    room.rundlaufDeadlineAt = null;
    room.rundlaufTurnStartedAt = null;
    applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_ROUND_END' });
    clearRundlaufTurnTimer(room.roomCode);
    return;
  }
  const currentIdx = alive.indexOf(room.rundlaufActiveTeamId ?? '');
  const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % alive.length : 0;
  setRundlaufActiveTeam(room, alive[nextIdx] ?? null);
};

const eliminateRundlaufTeam = (room: RoomState, teamId: string, reason?: string) => {
  const eliminated = new Set(room.rundlaufEliminatedTeamIds);
  eliminated.add(teamId);
  room.rundlaufEliminatedTeamIds = Array.from(eliminated);
  if (reason) {
    room.rundlaufLastAttempt = {
      id: uuid(),
      teamId,
      text: '',
      normalized: '',
      verdict: 'invalid',
      reason,
      at: Date.now()
    };
  }
  if (room.rundlaufActiveTeamId === teamId) {
    advanceRundlaufTurn(room);
  } else if (aliveRundlaufTeams(room).length <= 1) {
    advanceRundlaufTurn(room);
  }
};

const initializeRundlaufStage = (room: RoomState) => {
  const pool = buildRundlaufCategoryPool(RUNDLAUF_CATEGORY_COUNT, room.rundlaufPresetPool);
  const standings = getTeamStandings(room);
  room.rundlaufPool = pool;
  room.rundlaufBans = [];
  room.rundlaufSelectedCategories = [];
  room.rundlaufPinnedCategory = null;
  room.rundlaufTopTeamId = standings[0]?.id ?? null;
  room.rundlaufLastTeamId = standings.length ? standings[standings.length - 1]?.id ?? null : null;
  room.rundlaufRoundIndex = -1;
  room.rundlaufTurnOrder = [];
  room.rundlaufActiveTeamId = null;
  room.rundlaufEliminatedTeamIds = [];
  room.rundlaufUsedAnswers = [];
  room.rundlaufUsedAnswersNormalized = [];
  room.rundlaufLastAttempt = null;
  room.rundlaufDeadlineAt = null;
  room.rundlaufTurnStartedAt = null;
  room.rundlaufTurnDurationMs =
    Number.isFinite(room.rundlaufTurnDurationMs) && room.rundlaufTurnDurationMs > 0
      ? room.rundlaufTurnDurationMs
      : RUNDLAUF_TURN_TIME_MS;
  room.rundlaufRoundWinners = [];
  room.rundlaufRoundIntroTimeout = null;
  room.nextStage = 'RUNDLAUF';
  clearRundlaufTurnTimer(room.roomCode);
  applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_PAUSE' });
};

const hasRundlaufSelectionReady = (room: RoomState) => {
  const topId = room.rundlaufTopTeamId;
  const lastId = room.rundlaufLastTeamId;
  const banCount = topId ? room.rundlaufBans.filter((id) => Boolean(id)).length : 0;
  const banReady = topId ? banCount >= 2 : true;
  const pickReady = lastId ? Boolean(room.rundlaufPinnedCategory) : true;
  return banReady && pickReady;
};

const finalizeRundlaufSelection = (room: RoomState) => {
  const banned = new Set(room.rundlaufBans);
  const pinned = room.rundlaufPinnedCategory ?? null;
  const remaining = room.rundlaufPool.filter((entry) => !banned.has(entry.id) && entry.id !== pinned?.id);
  const shuffled = [...remaining].sort(() => Math.random() - 0.5);
  const needed = 2; // Always pick 2 random categories
  const randomPick = shuffled.slice(0, needed);
  room.rundlaufSelectedCategories = pinned ? [pinned, ...randomPick] : randomPick;
  room.rundlaufRoundIndex = -1;
  room.rundlaufRoundWinners = [];
  room.rundlaufActiveTeamId = null;
  room.rundlaufDeadlineAt = null;
  room.rundlaufTurnStartedAt = null;
  clearRundlaufTurnTimer(room.roomCode);
};

const applyRundlaufBan = (room: RoomState, teamId: string, categoryKey: string) => {
  if (room.rundlaufTopTeamId && teamId !== room.rundlaufTopTeamId) {
    throw new Error('Nur Platz 1 darf bannen');
  }
  const limit = Math.min(2, Math.max(0, room.rundlaufPool.length - 1));
  const used = room.rundlaufBans.filter(Boolean).length;
  if (used >= limit) throw new Error('Ban-Limit erreicht');
  const categoryId = categoryKey.trim();
  if (!categoryId) throw new Error('Kategorie fehlt');
  const entry = room.rundlaufPool.find(
    (item) => item.id === categoryId || item.title.toLowerCase() === categoryId.toLowerCase()
  );
  if (!entry) throw new Error('Kategorie nicht verfuegbar');
  if (room.rundlaufPinnedCategory?.id === entry.id) throw new Error('Kategorie ist bereits ausgewaehlt');
  if (room.rundlaufBans.includes(entry.id)) throw new Error('Kategorie bereits gebannt');
  room.rundlaufBans = [...room.rundlaufBans, entry.id];
};

const applyRundlaufPick = (room: RoomState, teamId: string, categoryKey: string) => {
  if (room.rundlaufLastTeamId && teamId !== room.rundlaufLastTeamId) {
    throw new Error('Nur letzter Platz darf waehlen');
  }
  if (room.rundlaufPinnedCategory) throw new Error('Kategorie bereits gewaehlt');
  const categoryId = categoryKey.trim();
  if (!categoryId) throw new Error('Kategorie fehlt');
  const entry = room.rundlaufPool.find(
    (item) => item.id === categoryId || item.title.toLowerCase() === categoryId.toLowerCase()
  );
  if (!entry) throw new Error('Kategorie nicht verfuegbar');
  room.rundlaufPinnedCategory = entry;
};

const startRundlaufRound = (room: RoomState) => {
  if (room.rundlaufSelectedCategories.length === 0) {
    throw new Error('Keine Rundlauf-Kategorien gesetzt');
  }
  if (room.rundlaufRoundIndex >= RUNDLAUF_ROUNDS - 1) {
    throw new Error('Alle Rundlauf-Runden gespielt');
  }
  const nextIndex = room.rundlaufRoundIndex + 1;
  if (!room.rundlaufSelectedCategories[nextIndex]) {
    throw new Error('Nicht genug Rundlauf-Kategorien vorhanden');
  }
  room.rundlaufRoundIndex = nextIndex;
  room.rundlaufRoundWinners = [];
  room.rundlaufEliminatedTeamIds = [];
  room.rundlaufUsedAnswers = [];
  room.rundlaufUsedAnswersNormalized = [];
  room.rundlaufLastAttempt = null;
  assignRundlaufTurnOrder(room);
  applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_PLAY' });
  const alive = aliveRundlaufTeams(room);
  setRundlaufActiveTeam(room, alive[0] ?? null);
};

const evaluateRundlaufAttempt = (room: RoomState, teamId: string, rawInput: string): RundlaufAttempt => {
  if (room.gameState !== 'RUNDLAUF_PLAY') throw new Error('Rundlauf nicht aktiv');
  if (!room.rundlaufActiveTeamId) throw new Error('Kein aktives Team');
  if (room.rundlaufActiveTeamId !== teamId) throw new Error('Team ist nicht am Zug');
  if (room.rundlaufDeadlineAt && Date.now() > room.rundlaufDeadlineAt) {
    return {
      id: uuid(),
      teamId,
      text: '',
      normalized: '',
      verdict: 'timeout',
      reason: 'timeout',
      at: Date.now()
    };
  }
  const text = (rawInput ?? '').trim().slice(0, 160);
  const normalized = text ? normalizeText(text) : '';
  if (!text) {
    return {
      id: uuid(),
      teamId,
      text,
      normalized,
      verdict: 'invalid',
      reason: 'empty',
      at: Date.now()
    };
  }
  if (room.rundlaufUsedAnswersNormalized.includes(normalized)) {
    return {
      id: uuid(),
      teamId,
      text,
      normalized,
      verdict: 'dup',
      reason: 'duplicate',
      at: Date.now()
    };
  }
  let bestScore = 0;
  room.rundlaufUsedAnswersNormalized.forEach((entry) => {
    bestScore = Math.max(bestScore, similarityScore(entry, normalized));
  });
  if (bestScore >= RUNDLAUF_SIMILARITY_THRESHOLD) {
    return {
      id: uuid(),
      teamId,
      text,
      normalized,
      verdict: 'dup',
      reason: 'similar',
      at: Date.now()
    };
  }
  const currentCategoryId = room.rundlaufSelectedCategories[room.rundlaufRoundIndex]?.id;
  const allowedList = currentCategoryId ? RUN_LOOP_DATA[currentCategoryId] : null;
  if (allowedList && allowedList.length) {
    const allowedNormalized = allowedList.map((entry) => normalizeText(entry));
    const bestAllowedScore = allowedNormalized.reduce(
      (best, entry) => Math.max(best, similarityScore(entry, normalized)),
      0
    );
    if (bestAllowedScore < RUNDLAUF_SIMILARITY_THRESHOLD) {
      return {
        id: uuid(),
        teamId,
        text,
        normalized,
        verdict: 'invalid',
        reason: 'not-listed',
        at: Date.now()
      };
    }
  }
  return {
    id: uuid(),
    teamId,
    text,
    normalized,
    verdict: 'ok',
    at: Date.now()
  };
};

const maybeEndRundlaufOnExhaustedList = (room: RoomState) => {
  if (room.gameState !== 'RUNDLAUF_PLAY') return false;
  const currentCategoryId = room.rundlaufSelectedCategories[room.rundlaufRoundIndex]?.id;
  const allowedList = currentCategoryId ? RUN_LOOP_DATA[currentCategoryId] : null;
  if (!allowedList || allowedList.length === 0) return false;
  const allowedNormalized = allowedList.map((entry) => normalizeText(entry));
  const used = new Set(room.rundlaufUsedAnswersNormalized);
  const allUsed = allowedNormalized.every((entry) => used.has(entry));
  if (!allUsed) return false;
  const winners = aliveRundlaufTeams(room);
  winners.forEach((teamId) => {
    if (room.teams[teamId]) {
      room.teams[teamId].score = (room.teams[teamId].score ?? 0) + RUNDLAUF_ROUND_POINTS;
    }
  });
  room.rundlaufRoundWinners = winners;
  room.rundlaufActiveTeamId = null;
  room.rundlaufDeadlineAt = null;
  room.rundlaufTurnStartedAt = null;
  clearRundlaufTurnTimer(room.roomCode);
  applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_ROUND_END' });
  return true;
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
  const rundlaufConfig = normalizeRundlaufConfig(template.rundlauf ?? null);

  room.quizId = quizId;
  room.questionOrder = [...questionIds];
  room.remainingQuestionIds = [...questionIds];
  room.askedQuestionIds = [];
  room.currentQuestionId = null;
  room.answers = {};
  room.timerEndsAt = null;
  room.questionTimerDurationMs = null;
  room.screen = 'lobby';
  room.questionPhase = 'answering';
  room.bingoEnabled = Boolean(template.enableBingo ?? template.meta?.useBingo);
  room.nextStage = null;
  room.scoreboardOverlayForced = false;
  room.halftimeTriggered = false;
  room.finalsTriggered = false;
  room.segmentTwoBaselineScores = null;
  room.blitzPhase = 'IDLE';
  const normalizedThemes = (template.blitz?.pool || []).map((theme, idx) => normalizeBlitzTheme(theme, idx));
  room.blitzThemeLibrary = normalizedThemes.reduce<Record<string, QuizBlitzTheme>>((acc, theme) => {
    acc[theme.id] = theme;
    return acc;
  }, {});
  room.blitzPool = normalizedThemes.map(toBlitzOption);
  room.blitzDisplayTimeMs = BLITZ_DISPLAY_TIME_MS;
  room.blitzAnswerTimeMs = BLITZ_ANSWER_TIME_MS;
  room.blitzBans = {};
  room.blitzBanLimits = {};
  room.blitzSelectedThemes = [];
  room.blitzSetIndex = -1;
  room.blitzDeadlineAt = null;
  room.blitzTheme = null;
  room.blitzPinnedTheme = null;
  room.blitzTopTeamId = null;
  room.blitzLastTeamId = null;
  room.blitzItems = [];
  room.blitzItemSolutions = [];
  room.blitzAnswersByTeam = {};
  room.blitzResultsByTeam = {};
  room.blitzSubmittedTeamIds = [];
  room.blitzRoundIntroTimeout = null;
  room.rundlaufPool = [];
  room.rundlaufPresetPool = rundlaufConfig.pool.length ? rundlaufConfig.pool : [...RUN_LOOP_CATEGORIES];
  room.rundlaufBans = [];
  room.rundlaufSelectedCategories = [];
  room.rundlaufPinnedCategory = null;
  room.rundlaufTopTeamId = null;
  room.rundlaufLastTeamId = null;
  room.rundlaufRoundIndex = -1;
  room.rundlaufTurnOrder = [];
  room.rundlaufActiveTeamId = null;
  room.rundlaufEliminatedTeamIds = [];
  room.rundlaufUsedAnswers = [];
  room.rundlaufUsedAnswersNormalized = [];
  room.rundlaufLastAttempt = null;
  room.rundlaufDeadlineAt = null;
  room.rundlaufTurnStartedAt = null;
  room.rundlaufTurnDurationMs = rundlaufConfig.turnDurationMs ?? RUNDLAUF_TURN_TIME_MS;
  room.rundlaufPointsWinner = rundlaufConfig.pointsWinner ?? RUNDLAUF_ROUND_POINTS;
  room.rundlaufPointsTie = rundlaufConfig.pointsTie ?? RUNDLAUF_DEFAULT_POINTS_TIE;
  room.rundlaufRoundWinners = [];
  room.rundlaufRoundIntroTimeout = null;
  room.oneOfEightTurnOrder = [];
  room.oneOfEightTurnIndex = 0;
  room.oneOfEightActiveTeamId = null;
  room.oneOfEightUsedChoiceIds = [];
  room.oneOfEightLoserTeamId = null;
  room.oneOfEightWinnerTeamIds = [];
  room.oneOfEightFinished = false;
  recomputeRoomWarnings(room);
  applyRoomState(room, { type: 'START_SESSION' });
  broadcastTeamsReady(room);
  broadcastState(room);
  return questionIds.length;
};

const restartRoomSession = (room: RoomState) => {
  if (!room.quizId) throw new Error('Kein Quiz aktiv');
  clearQuestionTimers(room);
  clearBlitzItemTimer(room.roomCode);
  clearBlitzSetTimer(room.roomCode);
  clearBlitzRoundIntroTimer(room);
  clearRundlaufTurnTimer(room.roomCode);
  Object.values(room.teams).forEach((team) => {
    team.score = 0;
    team.isReady = false;
  });
  configureRoomForQuiz(room, room.quizId);
  return { quizId: room.quizId };
};

const joinTeamToRoom = (room: RoomState, teamName: string, teamId?: string, avatarId?: string) => {
  const cleanName = teamName.trim();
  if (!cleanName) throw new Error('teamName missing');

  if (teamId && room.teams[teamId]) {
    room.teams[teamId].name = cleanName;
    if (avatarId) room.teams[teamId].avatarId = avatarId;
    if (!room.teamBoards[teamId]) room.teamBoards[teamId] = generateBingoBoard();
    broadcastTeamsReady(room);
    broadcastState(room);
    return { team: room.teams[teamId], board: room.teamBoards[teamId], created: false };
  }

  const existingByName = Object.values(room.teams).find((t) => t.name === cleanName);
  if (existingByName) {
    if (avatarId) existingByName.avatarId = avatarId;
    if (!room.teamBoards[existingByName.id]) room.teamBoards[existingByName.id] = generateBingoBoard();
    broadcastTeamsReady(room);
    broadcastState(room);
    return { team: existingByName, board: room.teamBoards[existingByName.id], created: false };
  }

  const newTeam: Team = { id: uuid(), name: cleanName, score: 0, isReady: false, avatarId: avatarId || undefined };
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

const levenshteinDistance = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 0;
  
  const costs = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return costs[shorter.length];
};

const normalizeAnswer = (value: unknown) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '';
  return raw
    .replace(/\u00e4/g, 'ae')
    .replace(/\u00f6/g, 'oe')
    .replace(/\u00fc/g, 'ue')
    .replace(/\u00df/g, 'ss')
    .replace(/&/g, ' und ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const matchesAnswer = (userInput: unknown, expected: unknown) => {
  const user = normalizeAnswer(userInput);
  const expectedNorm = normalizeAnswer(expected);
  if (!user || !expectedNorm) return false;
  
  // Exakter Match
  if (user === expectedNorm) return true;
  
  // Substring Match (für kurze Antworten)
  const userLen = user.length;
  const expectedLen = expectedNorm.length;
  if (userLen < 4) return false;
  if (expectedLen > 10 && userLen < Math.ceil(expectedLen * 0.4)) return false;
  if (expectedNorm.includes(user) || user.includes(expectedNorm)) return true;
  
  // Fuzzy Match mit Levenshtein Distance (für Schreibfehler)
  const longer = userLen > expectedLen ? user : expectedNorm;
  const shorter = userLen > expectedLen ? expectedNorm : user;
  const distance = levenshteinDistance(longer, shorter);
  const similarity = (longer.length - distance) / longer.length;
  
  // Tolerant bei Schreibfehlern: 0.85 Ähnlichkeit (1-2 Fehler bei 10+ Zeichen)
  return similarity >= 0.85;
};

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

const recomputeRoomWarnings = (room: RoomState) => {
  const warnings: string[] = [];
  const blitzSize = room.blitzPool.length || Object.keys(room.blitzThemeLibrary || {}).length;
  if (blitzSize > 0 && blitzSize < BLITZ_THEME_RECOMMENDED_MIN) {
    warnings.push(`Blitz-Pool enthält nur ${blitzSize} Themen (>=${BLITZ_THEME_RECOMMENDED_MIN} empfohlen).`);
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
  const blitzThemes = draft.blitz?.pool?.length ?? 0;
  if (blitzThemes < 14) {
    warnings.push(`Blitz-Pool enthaelt nur ${blitzThemes} Themen (>=14 empfohlen).`);
  }
  const rundlaufThemes = Array.isArray(draft.rundlauf?.pool) ? draft.rundlauf.pool.length : 0;
  if (rundlaufThemes > 0 && rundlaufThemes < 6) {
    warnings.push(`Rundlauf-Pool enthaelt nur ${rundlaufThemes} Kategorien (>=6 empfohlen).`);
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
    const rawOrder = Array.isArray(submission.order) ? submission.order : [];
    const normalizedOrder = Array.from(new Set(rawOrder))
      .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
      .filter(Boolean);

    const targetRaw =
      Array.isArray(setup.correctOrder) && setup.correctOrder.length > 0
        ? setup.correctOrder
        : setup.items?.map((item: any) => item.id) ?? [];
    const targetLabels = (setup.items ?? []).map((i: any) => i.label?.trim().toLowerCase()).filter(Boolean);
    const targetNormalized = Array.from(
      new Set(
        targetRaw
          .map((t: string) => t?.trim().toLowerCase())
          .filter(Boolean)
          .concat(targetLabels)
      )
    );

    if (!targetNormalized.length) return { awardedPoints: 0, awardedDetail: null, isCorrect: false };

    const hits = normalizedOrder.filter((val) => targetNormalized.includes(val)).length;
    return {
      awardedPoints: 0, // Winner-takes-all handled after evaluating all teams
      awardedDetail: `${hits}/${targetNormalized.length} Treffer`,
      isCorrect: false,
      tieBreaker: {
        label: 'TOP5',
        primary: hits,
        secondary: hits,
        detail: 'Treffer'
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
    const deAnswer = (question as any).answer;
    const enAnswer = (question as any).answerEn;
    if (matchesAnswer(answer, deAnswer)) return true;
    if (enAnswer && matchesAnswer(answer, enAnswer)) return true;
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
  const prev = room.gameState;
  const next = applyGameAction(room.gameState, action);
  if (next !== room.gameState) {
    room.gameState = next;
    room.stateHistory = [...room.stateHistory.slice(-9), next];
    if ((next.startsWith('BLITZ') || next === 'BLITZ' || next.startsWith('RUNDLAUF')) && room.scoreboardOverlayForced) {
      room.scoreboardOverlayForced = false;
    }
    if (prev === 'RUNDLAUF_PLAY' && next !== 'RUNDLAUF_PLAY') {
      clearRundlaufTurnTimer(room.roomCode);
    }
  }
  return room.gameState;
};

const buildTimerSnapshot = (room: RoomState) => {
  let endsAt = room.timerEndsAt;
  let running = Boolean(endsAt);
  let durationMs: number | null = room.questionTimerDurationMs;

  if ((room.gameState === 'BLITZ_PLAYING' || room.gameState === 'BLITZ') && room.blitzPhase === 'DISPLAYING' && room.blitzDeadlineAt) {
    endsAt = room.blitzDeadlineAt;
    running = true;
    durationMs = room.blitzDisplayTimeMs;
  } else if ((room.gameState === 'BLITZ_PLAYING' || room.gameState === 'BLITZ') && room.blitzPhase === 'PLAYING' && room.blitzDeadlineAt) {
    endsAt = room.blitzDeadlineAt;
    running = true;
    durationMs = room.blitzAnswerTimeMs;
  } else if (room.gameState === 'RUNDLAUF_PLAY' && room.rundlaufDeadlineAt) {
    endsAt = room.rundlaufDeadlineAt;
    running = true;
    durationMs = room.rundlaufTurnDurationMs;
  } else if (!running) {
    durationMs = null;
  }

  return { endsAt, running, durationMs };
};

const buildStateUpdatePayload = (room: RoomState): StateUpdatePayload => {
  const activeQuestion = room.currentQuestionId ? questionById.get(room.currentQuestionId) : null;
  const localized = activeQuestion ? localizeQuestion(applyOverrides(activeQuestion), room.language) : null;
  const sanitized = localized ? sanitizeQuestionForTeams(localized) : null;
  const blitz: BlitzState | null =
    room.blitzPhase === 'IDLE'
      ? null
      : {
          phase: room.blitzPhase,
          pool: room.blitzPool,
          bans: room.blitzBans,
          banLimits: room.blitzBanLimits,
          selectedThemes: room.blitzSelectedThemes,
          selectionComplete: hasBlitzSelectionReady(room),
          pinnedTheme: room.blitzPinnedTheme ?? null,
          topTeamId: room.blitzTopTeamId ?? null,
          lastTeamId: room.blitzLastTeamId ?? null,
          setIndex: room.blitzSetIndex,
          deadline: room.blitzDeadlineAt,
          theme: room.blitzTheme,
          items: room.blitzItems,
          submissions: room.blitzSubmittedTeamIds,
          answers: room.blitzAnswersByTeam,
          results: room.blitzResultsByTeam,
          itemIndex: room.blitzItemIndex >= 0 ? room.blitzItemIndex : undefined,
          itemDeadline: room.blitzItemDeadlineAt ?? undefined,
          itemDurationMs: room.blitzItemDurationMs ?? undefined
        };
  const shouldIncludeRundlauf =
    room.gameState.startsWith('RUNDLAUF') || room.gameState === 'SIEGEREHRUNG' || room.rundlaufPool.length > 0;
  const currentRundlaufCategory =
    room.rundlaufRoundIndex >= 0 ? room.rundlaufSelectedCategories[room.rundlaufRoundIndex] ?? null : null;
  const rundlauf: RundlaufState | null = !shouldIncludeRundlauf
    ? null
    : (() => {
        // Get available answers for current category
        const currentCatId = room.rundlaufSelectedCategories[room.rundlaufRoundIndex]?.id;
        const allAnswers = currentCatId ? RUN_LOOP_DATA[currentCatId] || [] : [];
        const allAnswersNormalized = new Set(allAnswers.map((a) => normalizeText(a)));
        const usedNormalized = new Set(room.rundlaufUsedAnswersNormalized);
        const remainingAnswers = Array.from(allAnswersNormalized).filter((a) => !usedNormalized.has(a));

        return {
          pool: room.rundlaufPool,
          bans: room.rundlaufBans,
          selected: room.rundlaufSelectedCategories,
          pinned: room.rundlaufPinnedCategory ?? null,
          topTeamId: room.rundlaufTopTeamId ?? null,
          lastTeamId: room.rundlaufLastTeamId ?? null,
          roundIndex: room.rundlaufRoundIndex,
          turnOrder: room.rundlaufTurnOrder,
          activeTeamId: room.rundlaufActiveTeamId,
          eliminatedTeamIds: room.rundlaufEliminatedTeamIds,
          usedAnswers: room.rundlaufUsedAnswers,
          usedAnswersNormalized: room.rundlaufUsedAnswersNormalized,
          lastAttempt: room.rundlaufLastAttempt ?? null,
          deadline: room.rundlaufDeadlineAt,
          turnStartedAt: room.rundlaufTurnStartedAt,
          turnDurationMs: room.rundlaufTurnDurationMs,
          currentCategory: currentRundlaufCategory,
          roundWinners: room.rundlaufRoundWinners,
          availableAnswers: allAnswers,
          remainingAnswers
        };
      })();
  const oneOfEight = (() => {
    if (!activeQuestion) return null;
    const payload = (activeQuestion as any).bunteTuete;
    if (!payload || payload.kind !== 'oneOfEight') return null;
    return {
      turnOrder: room.oneOfEightTurnOrder,
      activeTeamId: room.oneOfEightActiveTeamId,
      usedChoiceIds: room.oneOfEightUsedChoiceIds,
      loserTeamId: room.oneOfEightLoserTeamId,
      winnerTeamIds: room.oneOfEightWinnerTeamIds,
      finished: room.oneOfEightFinished
    } satisfies StateUpdatePayload['oneOfEight'];
  })();
  const includeResults = room.questionPhase === 'evaluated' || room.questionPhase === 'revealed';
  const connectedTeamIds = getConnectedTeamIds(room);
  const teamStatus: TeamStatusSnapshot[] = Object.values(room.teams).map((team) => ({
    id: team.id,
    name: team.name,
    avatarId: team.avatarId,
    connected: connectedTeamIds.includes(team.id),
    submitted: Boolean(room.answers[team.id]),
    isReady: team.isReady,
    // Include the answer during reveal/evaluation so everyone can see what each team chose
    answer: includeResults && room.answers[team.id] ? room.answers[team.id].value : undefined
  }));
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
  const liveAnswers = !includeResults
    ? Object.entries(room.answers).map(([teamId, entry]) => ({
        teamId,
        teamName: room.teams[teamId]?.name ?? teamId,
        answer: entry.value
      }))
    : undefined;
  const warnings = [
    ...room.validationWarnings,
    ...(localized ? validateQuestionStructure(localized) : [])
  ];
  const timerSnapshot = buildTimerSnapshot(room);
  const payload: StateUpdatePayload = {
    roomCode: room.roomCode,
    state: room.gameState,
    phase: room.questionPhase,
    // Only include currentQuestion if it's not null (don't send null to clear it)
    ...(sanitized !== null ? { currentQuestion: sanitized } : {}),
    timer: {
      endsAt: timerSnapshot.endsAt,
      running: timerSnapshot.running,
      durationMs: timerSnapshot.durationMs || undefined
    },
    scores: Object.values(room.teams).map((team) => ({
      id: team.id,
      name: team.name,
      score: team.score ?? 0,
      avatarId: team.avatarId
    })),
    teamsConnected: connectedTeamIds.length,
    teamStatus,
    questionProgress: { asked: room.askedQuestionIds.length, total: room.questionOrder.length },
    blitz,
    rundlauf,
    oneOfEight,
    nextStage: room.nextStage ?? undefined,
    scoreboardOverlayForced: room.scoreboardOverlayForced,
    results,
    liveAnswers,
    warnings: warnings.length ? warnings : undefined,
    supportsBingo: Boolean(room.bingoEnabled)
  };
  
  return payload;
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
  clearQuestionTimers(room);
  applyRoomState(room, { type: 'HOST_LOCK' });
  const basePoints = getQuestionPoints(room, question);

  const buntePayload = (question as any).bunteTuete;
  if (buntePayload && buntePayload.kind === 'oneOfEight') {
    // Falls noch nicht entschieden: als Unentschieden werten
    if (!room.oneOfEightFinished) {
      concludeOneOfEight(
        room,
        question,
        null,
        [],
        'Unentschieden',
        'Unentschieden',
        'Unentschieden – falsche Aussage nicht gewählt'
      );
      return true;
    }
    return false;
  }

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
            ? { label: 'DIFF', primary: deviation, detail: 'Näher dran gewinnt' }
            : null
      };
    });
  } else if (question.mechanic === 'betting') {
    const correctIdx = (question as any).correctIndex ?? 0;
    const pool = (question as any).pointsPool ?? 10;
    const betPointsByTeam = Object.entries(room.answers).map(([teamId, ans]) => {
      const arr = Array.isArray(ans.value) ? ans.value : [0, 0, 0];
      const ptsRaw = Number(arr[correctIdx] ?? 0);
      const points = Number.isFinite(ptsRaw) ? Math.max(0, Math.min(pool, ptsRaw)) : 0;
      return { teamId, points };
    });
    const maxPoints = betPointsByTeam.reduce((max, entry) => Math.max(max, entry.points), 0);
    // Find all teams with maxPoints (winners can tie)
    const winnersWithMaxPoints = betPointsByTeam.filter(entry => entry.points === maxPoints && maxPoints > 0).map(entry => entry.teamId);
    Object.entries(room.answers).forEach(([teamId, ans]) => {
      const arr = Array.isArray(ans.value) ? ans.value : [0, 0, 0];
      const ptsRaw = Number(arr[correctIdx] ?? 0);
      const betPoints = Number.isFinite(ptsRaw) ? Math.max(0, Math.min(pool, ptsRaw)) : 0;
      const awardedPoints = winnersWithMaxPoints.includes(teamId) ? basePoints : 0;
      room.answers[teamId] = {
        ...ans,
        isCorrect: awardedPoints > 0,
        betPoints,
        betPool: pool,
        awardedPoints,
        awardedDetail: awardedPoints > 0 ? `${basePoints} Punkte` : '0 Punkte',
        autoGraded: true,
        tieBreaker: null
      };
    });
  } else if (getQuestionType(question) === 'BUNTE_TUETE') {
    const evaluations: Record<string, ReturnType<typeof evaluateBunteSubmission>> = {};
    Object.entries(room.answers).forEach(([teamId, ans]) => {
      const evaluation = evaluateBunteSubmission(question, ans.value, basePoints);
      evaluations[teamId] = evaluation;
    });

    // Winner-takes-all for TOP5: most hits gets full basePoints (or 2 in later rounds). Ties share full points each.
    if ((question as any).bunteTuete?.kind === 'top5') {
      const hitsPerTeam = Object.entries(evaluations).map(([teamId, ev]) => ({ teamId, hits: ev.tieBreaker?.primary ?? 0 }));
      const bestHits = hitsPerTeam.reduce((max, { hits }) => Math.max(max, hits), 0);
      const winners = hitsPerTeam.filter(({ hits }) => hits === bestHits && hits > 0).map(({ teamId }) => teamId);

      Object.entries(room.answers).forEach(([teamId, ans]) => {
        const ev = evaluations[teamId];
        const isWinner = winners.includes(teamId);
        room.answers[teamId] = {
          ...ans,
          isCorrect: isWinner,
          awardedPoints: isWinner ? basePoints : 0,
          awardedDetail: `${ev.tieBreaker?.primary ?? 0} Treffer${isWinner ? ' (Bestwert)' : ''}`,
          autoGraded: true,
          tieBreaker: ev.tieBreaker ?? null
        };
      });
    } else {
      Object.entries(room.answers).forEach(([teamId, ans]) => {
        const evaluation = evaluations[teamId];
        room.answers[teamId] = {
          ...ans,
          isCorrect: evaluation.isCorrect,
          awardedPoints: evaluation.awardedPoints,
          awardedDetail: evaluation.awardedDetail,
          autoGraded: true,
          tieBreaker: evaluation.tieBreaker ?? null
        };
      });
    }
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
  const cacheKey = 'questions';
  const cached = cache.get<any>(cacheKey);
  if (cached) {
    return res.json({ questions: cached });
  }
  const mapped = questions.map((q) => {
    const usage = questionUsageMap[q.id] ?? {};
    const isCustom = customQuestions.some((c) => c.id === q.id);
    return { ...applyOverrides(q), usedIn: usage.usedIn ?? [], lastUsedAt: usage.lastUsedAt ?? null, isCustom };
  });
  cache.set(cacheKey, mapped);
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

// Blitz image upload
app.post('/api/upload/blitz-image', blitzUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Kein Bild erhalten' });
  const url = `/uploads/blitz/${req.file.filename}`;
  return res.json({ imageUrl: url });
});

app.delete('/api/upload/blitz-image', (req, res) => {
  const { imageUrl } = req.body as { imageUrl?: string };
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl fehlt' });
  const filename = path.basename(imageUrl);
  const filePath = path.join(blitzUploadDir, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore
    }
  }
  return res.json({ ok: true });
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

// Admin Session Generation Endpoint
// POST /api/rooms/:roomCode/admin-session - Creates a new admin session token
app.post('/api/rooms/:roomCode/admin-session', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  const session = createAdminSession(roomCode);
  console.log(`[Auth] Admin-Session erstellt für Room ${roomCode}: ${session.token.substring(0, 8)}...`);
  return res.json({ token: session.token, expiresAt: session.expiresAt });
});

// GET alias for environments where POST may be restricted
app.get('/api/rooms/:roomCode/admin-session', (req, res) => {
  const { roomCode } = req.params;
  ensureRoom(roomCode);
  const session = createAdminSession(roomCode);
  console.log(`[Auth] Admin-Session erstellt (GET) für Room ${roomCode}: ${session.token.substring(0, 8)}...`);
  return res.json({ token: session.token, expiresAt: session.expiresAt });
});

app.post('/api/rooms/:roomCode/use-quiz', async (req, res) => {
  const { roomCode } = req.params;
  let token = req.query.token as string;
  
  // Auth check: Wenn kein Token vorhanden, versuche einen zu erstellen
  if (!token) {
    try {
      const session = createAdminSession(roomCode);
      token = session.token;
      console.log(`[Auth] Admin-Session auto-created für Room ${roomCode}`);
    } catch (err) {
      console.warn(`[Auth] Fehler beim Auto-Create der Session für ${roomCode}`, err);
    }
  }
  
  // Validate token if provided
  if (token && !validateAdminSession(roomCode, token)) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }

  const { quizId } = req.body as { quizId?: string };
  
  // Validate quiz ID
  const quizValidation = validateQuizId(quizId, quizzes);
  if (!quizValidation.valid) return res.status(400).json({ error: quizValidation.error });

  const room = ensureRoom(roomCode);
  touchRoom(room);
  const remaining = configureRoomForQuiz(room, quizValidation.value);

  io.to(roomCode).emit('quizSelected', { quizId: quizValidation.value, remaining });
  return res.json({ ok: true, quizId: quizValidation.value, remaining });
});

const enterQuestionActive = (room: RoomState, questionId: string, remainingOverride?: number) => {
  const question = questionById.get(questionId);
  if (!question) return;
  const questionWithImage = applyOverrides(question);
  room.questionIntroTimeout = null;
  room.screen = 'question';
  const meta = buildQuestionMeta(room, questionId);
  const localized = localizeQuestion(questionWithImage, room.language);
  room.questionPhase = 'answering';
  const buntePayload = (questionWithImage as any).bunteTuete;
  if (buntePayload && buntePayload.kind === 'oneOfEight') {
    startOneOfEightTurnState(room, questionWithImage);
  }
  applyRoomState(room, { type: 'FORCE', next: 'Q_ACTIVE' });
  startQuestionTimer(room, DEFAULT_QUESTION_TIME * 1000);
  io.to(room.roomCode).emit('questionStarted', {
    questionId,
    remaining: remainingOverride ?? room.remainingQuestionIds.length,
    meta
  });
  io.to(room.roomCode).emit('beamer:show-question', { question: localized, meta });
  io.to(room.roomCode).emit('team:show-question', { question: sanitizeQuestionForTeams(localized) });
  broadcastState(room);
};

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
  room.oneOfEightTurnOrder = [];
  room.oneOfEightTurnIndex = 0;
  room.oneOfEightActiveTeamId = null;
  room.oneOfEightUsedChoiceIds = [];
  room.oneOfEightLoserTeamId = null;
  room.oneOfEightWinnerTeamIds = [];
  room.oneOfEightFinished = false;
  room.timerEndsAt = null;
  room.questionTimerDurationMs = null;
  clearQuestionTimers(room);
  room.nextStage = null;
  room.askedQuestionIds = Array.from(new Set([...room.askedQuestionIds, questionId]));
  ensureSegmentTwoBaseline(room);
  room.screen = 'slot';
  room.questionPhase = 'idle';
  applyRoomState(room, { type: 'FORCE', next: 'QUESTION_INTRO' });
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

  room.questionIntroTimeout = setTimeout(() => {
    enterQuestionActive(room, questionId, remainingOverride);
  }, QUESTION_INTRO_MS);

  if (res) {
    res.json({
      ok: true,
      questionId,
      remaining: remainingOverride ?? room.remainingQuestionIds.length
    });
  }
};

const runNextQuestion = (room: RoomState) => {
  if (!room.quizId) {
    throw new Error('Kein Quiz gesetzt');
  }

  // Special end-of-segment transitions must be checked BEFORE the "no questions left" guard,
  // because after Q20 remainingQuestionIds is already empty.
  const askedCountBefore = room.askedQuestionIds.length;

  // After Q10 reveal, transition to BLITZ
  if (room.gameState === 'Q_REVEAL' && askedCountBefore === 10 && !room.halftimeTriggered) {
    room.halftimeTriggered = true;
    room.nextStage = 'BLITZ';
    applyRoomState(room, { type: 'FORCE', next: 'SCOREBOARD_PRE_BLITZ' });
    broadcastState(room);
    return { stage: room.gameState, halftimeTrigger: true };
  }

  // After Q20 reveal, transition to RUNDLAUF
  if (room.gameState === 'Q_REVEAL' && askedCountBefore === 20 && !room.finalsTriggered) {
    room.finalsTriggered = true;
    room.nextStage = 'RUNDLAUF';
    applyRoomState(room, { type: 'FORCE', next: 'SCOREBOARD' });
    broadcastState(room);
    return { stage: room.gameState, finalsTrigger: true };
  }

  // Guard: no more questions left (and no special transition applied above)
  if (room.remainingQuestionIds.length === 0) {
    throw new Error('Keine Fragen mehr');
  }

  // Otherwise start the next question normally
  const nextId = room.remainingQuestionIds.shift();
  if (!nextId) {
    throw new Error('Keine naechste Frage gefunden');
  }
  startQuestionWithSlot(room, nextId, room.remainingQuestionIds.length);
  Object.values(room.teams).forEach((t) => (t.isReady = false));
  broadcastTeamsReady(room);
  return { questionId: nextId, remaining: room.remainingQuestionIds.length };
};

const startOneOfEightTurnState = (room: RoomState, question: AnyQuestion) => {
  const statements = ((question as any).bunteTuete?.statements as Array<{ id: string }> | undefined) || [];
  const teamIds = getConnectedTeamIds(room);
  const order = teamIds.length ? [...teamIds] : Object.keys(room.teams);
  room.oneOfEightTurnOrder = order;
  room.oneOfEightTurnIndex = 0;
  room.oneOfEightActiveTeamId = order[0] ?? null;
  room.oneOfEightUsedChoiceIds = [];
  room.oneOfEightLoserTeamId = null;
  room.oneOfEightWinnerTeamIds = [];
  room.oneOfEightFinished = statements.length === 0 || order.length === 0;
  if (room.oneOfEightFinished) {
    room.oneOfEightActiveTeamId = null;
  }
};

const concludeOneOfEight = (
  room: RoomState,
  question: AnyQuestion,
  loserTeamId: string | null,
  winnerTeamIds: string[],
  detailWinner: string,
  detailLoser: string,
  detailNeutral: string
) => {
  const basePoints = getQuestionPoints(room, question);
  const winnerSet = new Set(winnerTeamIds);
  Object.keys(room.teams).forEach((id) => {
    const existing = room.answers[id] || { value: null };
    let awardedPoints = 0;
    let isCorrect = false;
    let awardedDetail: string | null = null;
    if (winnerSet.has(id)) {
      awardedPoints = basePoints;
      isCorrect = true;
      awardedDetail = detailWinner;
    } else if (loserTeamId && id === loserTeamId) {
      awardedDetail = detailLoser;
    } else {
      awardedDetail = detailNeutral;
    }
    room.answers[id] = {
      ...existing,
      isCorrect,
      awardedPoints,
      awardedDetail,
      autoGraded: true,
      tieBreaker: null
    };
  });

  room.oneOfEightWinnerTeamIds = winnerTeamIds;
  room.oneOfEightLoserTeamId = loserTeamId;
  room.oneOfEightFinished = true;
  room.oneOfEightActiveTeamId = null;
  room.questionPhase = 'evaluated';
  room.timerEndsAt = null;
  applyRoomState(room, { type: 'HOST_LOCK' });

  const solution = formatSolution(question, room.language);
  broadcastState(room);
  io.to(room.roomCode).emit('evaluation:started');
  io.to(room.roomCode).emit('answersEvaluated', { answers: room.answers, solution });
  io.to(room.roomCode).emit('timerStopped');
};

const advanceOneOfEightTurn = (room: RoomState) => {
  room.oneOfEightTurnIndex += 1;
  const nextTeam = room.oneOfEightTurnOrder[room.oneOfEightTurnIndex] ?? null;
  room.oneOfEightActiveTeamId = nextTeam ?? null;
};

const handleOneOfEightSubmission = (
  room: RoomState,
  question: AnyQuestion,
  teamId: string,
  answer: unknown
) => {
  const payload = answer as { choiceId?: string };
  const choiceId = typeof payload?.choiceId === 'string' ? payload.choiceId.trim() : '';
  if (!choiceId) throw new Error('Antwort ungültig');
  if (room.oneOfEightFinished) throw new Error('Runde bereits beendet');
  if (room.oneOfEightActiveTeamId && room.oneOfEightActiveTeamId !== teamId) {
    throw new Error('Dieses Team ist nicht am Zug');
  }

  const statements = ((question as any).bunteTuete?.statements as Array<{ id: string; isFalse?: boolean }> | undefined) || [];
  const choiceNormalized = choiceId.toLowerCase();
  const alreadyUsed = room.oneOfEightUsedChoiceIds.some((id) => id.toLowerCase() === choiceNormalized);
  if (alreadyUsed) throw new Error('Antwort wurde schon gewählt');

  room.answers[teamId] = { value: payload };
  room.oneOfEightUsedChoiceIds.push(choiceId);

  const falseStmt = statements.find((stmt) => stmt.isFalse);
  const pickedFalse = falseStmt && choiceNormalized === String(falseStmt.id).toLowerCase();

  if (pickedFalse) {
    const winners = room.oneOfEightTurnOrder.filter((id) => id !== teamId && room.teams[id]);
    concludeOneOfEight(
      room,
      question,
      teamId,
      winners,
      'Gewonnen durch Fehlpick',
      'Falsche Aussage gewählt',
      'Keine Auswahl'
    );
    return;
  }

  // Keine falsche Aussage gewählt: weiter zum nächsten Team oder Unentschieden, wenn alle durch sind
  const submissions = room.oneOfEightUsedChoiceIds.length;
  const maxTurns = Math.min(statements.length || 0, room.oneOfEightTurnOrder.length || statements.length || 0);
  advanceOneOfEightTurn(room);

  if (submissions >= maxTurns || room.oneOfEightUsedChoiceIds.length >= (statements.length || 0)) {
    concludeOneOfEight(
      room,
      question,
      null,
      [],
      'Unentschieden',
      'Unentschieden',
      'Unentschieden – falsche Aussage nicht gewählt'
    );
    return;
  }

  broadcastState(room);
};

const shouldShowSegmentScoreboard = (room: RoomState) => {
  const askedCount = room.askedQuestionIds.length;
  return askedCount === 10 || askedCount === 20 || room.remainingQuestionIds.length === 0;
};

const handleHostNextAdvance = (room: RoomState) => {
  // LOBBY: No ready check - moderator decides when to start
  // Teams don't need to confirm ready status anymore
  if (room.gameState === 'QUESTION_INTRO' && room.currentQuestionId) {
    clearQuestionTimers(room);
    enterQuestionActive(room, room.currentQuestionId, room.remainingQuestionIds.length);
    return { stage: room.gameState };
  }
  if (room.gameState === 'Q_ACTIVE') {
    applyRoomState(room, { type: 'HOST_LOCK' });
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'Q_LOCKED') {
    const payload = revealAnswersForRoom(room);
    return { stage: room.gameState, ...payload };
  }
  if (room.gameState === 'SCOREBOARD_PRE_BLITZ') {
    initializeBlitzStage(room);
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'BLITZ_READY') {
    room.blitzPhase = 'BANNING';
    applyRoomState(room, { type: 'FORCE', next: 'BLITZ_BANNING' });
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'BLITZ_BANNING') {
    if (!hasBlitzSelectionReady(room)) {
      throw new Error('Blitz-Auswahl noch nicht abgeschlossen');
    }
    // Only transition if not already transitioning (blitzPhase check)
    if (room.blitzPhase === 'BANNING') {
      finalizeBlitzSelection(room);
      room.blitzPhase = 'SELECTION_COMPLETE';
      applyRoomState(room, { type: 'FORCE', next: 'BLITZ_SELECTION_COMPLETE' });
    }
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'BLITZ_SELECTION_COMPLETE' || room.gameState === 'BLITZ_CATEGORY_SHOWCASE') {
    // Moderator clicks "Weiter" from SELECTION_COMPLETE
    // Transition to CATEGORY_SHOWCASE for the animation
    if (room.gameState === 'BLITZ_SELECTION_COMPLETE') {
      applyRoomState(room, { type: 'FORCE', next: 'BLITZ_CATEGORY_SHOWCASE' });
      broadcastState(room);
      // Auto-transition to SET_INTRO after showcase animation (5 seconds for visibility)
      clearBlitzRoundIntroTimer(room);
      room.blitzRoundIntroTimeout = setTimeout(() => {
        room.blitzRoundIntroTimeout = null;
        if (room.gameState !== 'BLITZ_CATEGORY_SHOWCASE') return;
        startBlitzSet(room);
        broadcastState(room);
      }, BLITZ_CATEGORY_SHOWCASE_MS);
      return { stage: room.gameState };
    }
    // ROBUST FIX: Allow manual skip of CATEGORY_SHOWCASE (fallback if timeout fails)
    if (room.gameState === 'BLITZ_CATEGORY_SHOWCASE') {
      console.log('[BLITZ] Manual skip of CATEGORY_SHOWCASE via host:next - starting set');
      clearBlitzRoundIntroTimer(room);
      startBlitzSet(room);
      broadcastState(room);
      return { stage: room.gameState };
    }
  }
  if (room.gameState === 'BLITZ_SET_INTRO') {
    if (room.blitzPhase === 'ROUND_INTRO') {
      clearBlitzRoundIntroTimer(room);
      room.blitzPhase = 'DISPLAYING';
      room.blitzDeadlineAt = Date.now() + room.blitzDisplayTimeMs;
      room.blitzItemIndex = 0;
      applyRoomState(room, { type: 'FORCE', next: 'BLITZ_PLAYING' });
      scheduleBlitzItemTicker(room, true);
      scheduleBlitzSetTimer(room);
    }
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'BLITZ_PLAYING') {
    enforceBlitzDeadline(room);
    if (room.blitzPhase === 'DISPLAYING') {
      // Skip to answer phase
      lockBlitzSet(room);
    } else if (room.blitzPhase === 'PLAYING') {
      // End answer phase and compute results
      lockBlitzSet(room);
      computeBlitzResults(room);
    }
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'BLITZ_SET_END') {
    const totalSets = Math.min(BLITZ_SETS, room.blitzSelectedThemes.length || BLITZ_SETS);
    if (room.blitzSetIndex >= totalSets - 1) {
      finishBlitzStage(room);
    } else {
      startBlitzSet(room);
    }
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'BLITZ_SCOREBOARD') {
    applyRoomState(room, { type: 'FORCE', next: 'BLITZ_PAUSE' });
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'BLITZ_PAUSE') {
    return runNextQuestion(room);
  }
  if (room.gameState === 'RUNDLAUF_PAUSE') {
    applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_SCOREBOARD_PRE' });
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'RUNDLAUF_SCOREBOARD_PRE') {
    applyRoomState(room, { type: 'HOST_NEXT' });
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'RUNDLAUF_CATEGORY_SELECT') {
    if (!hasRundlaufSelectionReady(room)) {
      throw new Error('Rundlauf-Auswahl noch nicht abgeschlossen');
    }
    finalizeRundlaufSelection(room);
    applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_SELECTION_COMPLETE' });
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'RUNDLAUF_SELECTION_COMPLETE' || room.gameState === 'RUNDLAUF_CATEGORY_SHOWCASE') {
    // Moderator clicks "Weiter" from SELECTION_COMPLETE
    if (room.gameState === 'RUNDLAUF_SELECTION_COMPLETE') {
      applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_CATEGORY_SHOWCASE' });
      broadcastState(room);
      // Auto-transition to ROUND_INTRO after showcase animation (3 seconds)
      clearRundlaufRoundIntroTimer(room);
      room.rundlaufRoundIntroTimeout = setTimeout(() => {
        room.rundlaufRoundIntroTimeout = null;
        if (room.gameState !== 'RUNDLAUF_CATEGORY_SHOWCASE') return;
        applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_ROUND_INTRO' });
        broadcastState(room);
      }, 3000);
      return { stage: room.gameState };
    }
    // If already in CATEGORY_SHOWCASE, skip to ROUND_INTRO
    if (room.gameState === 'RUNDLAUF_CATEGORY_SHOWCASE') {
      applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_ROUND_INTRO' });
      broadcastState(room);
      return { stage: room.gameState };
    }
  }
  if (room.gameState === 'RUNDLAUF_ROUND_INTRO') {
    startRundlaufRound(room);
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'RUNDLAUF_PLAY') {
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'RUNDLAUF_ROUND_END') {
    if (room.rundlaufRoundIndex >= RUNDLAUF_ROUNDS - 1) {
      applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_SCOREBOARD_FINAL' });
    } else {
      applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_ROUND_INTRO' });
    }
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'RUNDLAUF_SCOREBOARD_FINAL' || room.gameState === 'SIEGEREHRUNG') {
    applyRoomState(room, { type: 'HOST_NEXT' });
    broadcastState(room);
    return { stage: room.gameState };
  }
  if (room.gameState === 'SCOREBOARD_PAUSE') {
    if (room.nextStage === 'BLITZ') {
      initializeBlitzStage(room);
      broadcastState(room);
      return { stage: room.gameState };
    }
    if (room.nextStage === 'Q11') {
      room.nextStage = null;
      applyRoomState(room, { type: 'HOST_NEXT' });
      return runNextQuestion(room);
    }
    applyRoomState(room, { type: 'HOST_NEXT' });
    return runNextQuestion(room);
  }
  if (room.gameState === 'Q_REVEAL') {
    return runNextQuestion(room);
  }
  if (room.gameState === 'SCOREBOARD') {
    const askedCount = room.askedQuestionIds.length;
    const totalQuestions = room.questionOrder.length;
    if (room.nextStage === 'BLITZ') {
      applyRoomState(room, { type: 'FORCE', next: 'SCOREBOARD_PRE_BLITZ' });
      broadcastState(room);
      return { stage: room.gameState };
    }
    const shouldStartRundlauf =
      room.nextStage === 'RUNDLAUF' ||
      askedCount >= totalQuestions ||
      room.remainingQuestionIds.length === 0;
    if (shouldStartRundlauf) {
      initializeRundlaufStage(room);
      broadcastState(room);
      return { stage: room.gameState };
    }
    if (room.remainingQuestionIds.length === 0) {
      broadcastState(room);
      return { stage: room.gameState };
    }
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

    // Update stats after evaluation
    if (room.currentQuestionId && room.statsAnswerTimings.has(room.currentQuestionId)) {
      const timings = room.statsAnswerTimings.get(room.currentQuestionId)!;
      const teamTiming = timings.find(t => t.teamName === room.teams[teamId]?.name);
      if (teamTiming) {
        teamTiming.isCorrect = isCorrect;
      }
    }

    // Track wrong answers for common mistakes
    if (!isCorrect && room.currentQuestionId) {
      if (!room.statsWrongAnswerCounts.has(room.currentQuestionId)) {
        room.statsWrongAnswerCounts.set(room.currentQuestionId, new Map());
      }
      const answerStr = String(ans.value ?? '');
      const counts = room.statsWrongAnswerCounts.get(room.currentQuestionId)!;
      const currentCount = counts.get(answerStr) || 0;
      counts.set(answerStr, currentCount + 1);
    }
  });

  room.questionPhase = 'revealed';
  const askedCount = room.askedQuestionIds.length;
  const noQuestionsLeft = room.remainingQuestionIds.length === 0;
  if (askedCount === 10) {
    room.nextStage = 'BLITZ';
  } else if (askedCount >= 20 || noQuestionsLeft) {
    room.nextStage = 'RUNDLAUF';
  } else {
    room.nextStage = null;
  }
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
  
  // Validate question ID
  const qIdValidation = validateQuestionId(questionId);
  if (!qIdValidation.valid) return res.status(400).json({ error: qIdValidation.error });
  
  if (!questionById.has(qIdValidation.value)) {
    return res.status(400).json({ error: 'Frage nicht gefunden' });
  }
  
  const room = ensureRoom(roomCode);
  touchRoom(room);
  startQuestionWithSlot(room, qIdValidation.value, room.remainingQuestionIds.length, res);
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
  const { teamName, teamId, avatarId } = req.body as { teamName?: string; teamId?: string; avatarId?: string };
  
  // Validate and sanitize input
  const roomValidation = validateRoomCode(roomCode);
  if (!roomValidation.valid) return res.status(400).json({ error: roomValidation.error });
  
  const teamNameValidation = validateTeamName(teamName);
  if (!teamNameValidation.valid) return res.status(400).json({ error: teamNameValidation.error });
  
  const room = ensureRoom(roomValidation.value);
  touchRoom(room);

  try {
    const result = joinTeamToRoom(room, teamNameValidation.value, teamId, avatarId);
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
  
  // Validate inputs
  const roomValidation = validateRoomCode(roomCode);
  if (!roomValidation.valid) return res.status(400).json({ error: roomValidation.error });
  
  const teamIdValidation = validateTeamId(teamId);
  if (!teamIdValidation.valid) return res.status(400).json({ error: teamIdValidation.error });
  
  const answerValidation = validateAnswer(answer);
  // Note: validateAnswer always returns valid=true (sanitizes but doesn't reject)
  
  const room = ensureRoom(roomValidation.value);
  touchRoom(room);
  if (!room.currentQuestionId) return res.status(400).json({ error: 'Keine aktive Frage' });
  const currentQuestion = questionById.get(room.currentQuestionId);
  if (!currentQuestion) return res.status(400).json({ error: 'Keine aktive Frage' });
  if (!room.teams[teamIdValidation.value]) return res.status(400).json({ error: 'Team unbekannt' });
  if (!isQuestionInputOpen(room.gameState)) {
    return res.status(400).json({ error: 'Antworten aktuell nicht erlaubt' });
  }

  const buntePayload = (currentQuestion as any).bunteTuete;
  if (buntePayload && buntePayload.kind === 'oneOfEight') {
    try {
      handleOneOfEightSubmission(room, currentQuestion, teamIdValidation.value, answerValidation.value);
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
    broadcastState(room);
    return res.json({ ok: true });
  }

  room.answers[teamIdValidation.value] = { value: answerValidation.value };
  
  // Record timing for stats
  if (room.timerEndsAt && room.questionTimerDurationMs) {
    const timeElapsedMs = room.questionTimerDurationMs - (room.timerEndsAt - Date.now());
    if (!room.statsAnswerTimings.has(room.currentQuestionId)) {
      room.statsAnswerTimings.set(room.currentQuestionId, []);
    }
    room.statsAnswerTimings.get(room.currentQuestionId)!.push({
      teamName: room.teams[teamIdValidation.value]?.name || 'Unknown',
      timeMs: Math.max(0, timeElapsedMs),
      answer: answerValidation.value,
      isCorrect: false, // Will be updated after evaluation
      questionId: room.currentQuestionId,
      timestamp: Date.now()
    });
  }

  io.to(roomCode).emit('answerReceived', { teamId: teamIdValidation.value });
  io.to(roomCode).emit('beamer:team-answer-update', { teamId, hasAnswered: true }); // TODO(LEGACY)

  const connectedTeamIds = getConnectedTeamIds(room);
  const activeTeamIds = connectedTeamIds.length ? connectedTeamIds : Object.keys(room.teams);
  const answeredActive = activeTeamIds.filter((activeId) => room.answers[activeId]).length;
  if (activeTeamIds.length > 0 && answeredActive >= activeTeamIds.length && room.timerEndsAt) {
    evaluateCurrentQuestion(room);
  }

  broadcastState(room);
  return res.json({ ok: true });
});

// Antworten automatisch bewerten (ohne reveal)
app.post('/api/rooms/:roomCode/resolve', (req, res) => {
  const { roomCode } = req.params;
  let token = req.query.token as string;
  
  // Auth check: Wenn kein Token vorhanden, versuche einen zu erstellen
  if (!token) {
    try {
      const session = createAdminSession(roomCode);
      token = session.token;
    } catch (err) {}
  }
  
  if (token && !validateAdminSession(roomCode, token)) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }

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
  let token = req.query.token as string;
  
  // Auth check: Wenn kein Token vorhanden, versuche einen zu erstellen
  if (!token) {
    try {
      const session = createAdminSession(roomCode);
      token = session.token;
    } catch (err) {}
  }
  
  if (token && !validateAdminSession(roomCode, token)) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }

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

// Lobby Stats
app.get('/api/rooms/:roomCode/lobby-stats', (req, res) => {
  const { roomCode } = req.params;
  const room = rooms.get(roomCode);
  if (!room) return res.status(404).json({ error: 'Room nicht gefunden' });

  const stats = buildLobbyStats(room);
  return res.json(stats);
});

// Mark answer as funny/best
app.post('/api/rooms/:roomCode/mark-funny', (req, res) => {
  const { roomCode } = req.params;
  const token = req.query.token as string;
  
  // Auth check
  if (!validateAdminSession(roomCode, token)) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }

  const { teamName, questionId, answer } = req.body as { teamName?: string; questionId?: string; answer?: string };
  const room = rooms.get(roomCode);
  if (!room) return res.status(404).json({ error: 'Room nicht gefunden' });
  if (!questionId || answer === undefined) {
    return res.status(400).json({ error: 'questionId, answer erforderlich' });
  }

  if (!room.statsFunnyAnswers.has(questionId)) {
    room.statsFunnyAnswers.set(questionId, []);
  }

  const funnies = room.statsFunnyAnswers.get(questionId)!;
  const name = teamName || 'Unknown';
  const existing = funnies.find(f => f.teamName === name);
  if (!existing) {
    const markedAt = Date.now();
    funnies.push({
      teamName: name,
      answer: String(answer),
      questionId,
      markedAt
    });

    const questionText = questionById.get(questionId)?.question || 'Unknown';
    statsState.funnyAnswers.push({
      teamName: name,
      answer: String(answer),
      questionText,
      questionId,
      quizId: room.quizId || undefined,
      date: new Date(markedAt).toISOString(),
      markedAt
    });
    if (statsState.funnyAnswers.length > 200) statsState.funnyAnswers = statsState.funnyAnswers.slice(-200);
    persistStats();
  }

  return res.json({ ok: true, stats: buildLobbyStats(room) });
});

// Timer
app.post('/api/rooms/:roomCode/timer/start', (req, res) => {
  const { roomCode } = req.params;
  const { seconds } = req.body as { seconds?: number };
  
  // Validate room code
  const roomValidation = validateRoomCode(roomCode);
  if (!roomValidation.valid) return res.status(400).json({ error: roomValidation.error });
  
  // Validate timer seconds (1-3600 seconds = 1 hour max)
  const timerValidation = validateNumber(seconds ?? DEFAULT_QUESTION_TIME, 1, 3600);
  if (!timerValidation.valid) return res.status(400).json({ error: timerValidation.error });
  
  const room = ensureRoom(roomValidation.value);
  touchRoom(room);
  const durationMs = Math.round(timerValidation.value * 1000);
  startQuestionTimer(room, durationMs);
  broadcastState(room);
  return res.json({ ok: true, endsAt: room.timerEndsAt });
});

app.post('/api/rooms/:roomCode/timer/stop', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  touchRoom(room);
  clearQuestionTimers(room);
  room.timerEndsAt = null;
  room.questionTimerDurationMs = null;
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
  return res.json({
    timer: {
      endsAt: room.timerEndsAt,
      running: Boolean(room.timerEndsAt),
      durationMs: room.questionTimerDurationMs
    }
  });
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
  
  // Validate language
  const langValidation = validateLanguage(language);
  if (!langValidation.valid) return res.status(400).json({ error: langValidation.error });
  
  const room = ensureRoom(roomCode);
  room.language = langValidation.value as any; // Allow 'both' at runtime
  touchRoom(room);
  io.to(roomCode).emit('languageChanged', { language: langValidation.value });
  broadcastState(room);
  return res.json({ ok: true, language: langValidation.value });
});

// Fotoblitz timer settings
app.post('/api/rooms/:roomCode/blitz-timers', (req, res) => {
  const { roomCode } = req.params;
  const { displayTimeMs, answerTimeMs } = req.body as { displayTimeMs?: number; answerTimeMs?: number };
  const room = ensureRoom(roomCode);
  
  if (typeof displayTimeMs === 'number' && displayTimeMs >= 5000 && displayTimeMs <= 120000) {
    room.blitzDisplayTimeMs = displayTimeMs;
  }
  if (typeof answerTimeMs === 'number' && answerTimeMs >= 5000 && answerTimeMs <= 120000) {
    room.blitzAnswerTimeMs = answerTimeMs;
  }
  
  touchRoom(room);
  broadcastState(room);
  return res.json({ 
    ok: true, 
    displayTimeMs: room.blitzDisplayTimeMs, 
    answerTimeMs: room.blitzAnswerTimeMs 
  });
});

app.get('/api/rooms/:roomCode/blitz-timers', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  return res.json({ 
    displayTimeMs: room.blitzDisplayTimeMs, 
    answerTimeMs: room.blitzAnswerTimeMs 
  });
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

// Bulk-Upload von Fragen
app.post('/api/questions/bulk', (req, res) => {
  const { questions: questionsToAdd } = req.body as { questions: Partial<AnyQuestion>[] };
  if (!Array.isArray(questionsToAdd) || questionsToAdd.length === 0) {
    return res.status(400).json({ error: 'questions array erforderlich' });
  }

  const created: AnyQuestion[] = [];
  for (const q of questionsToAdd) {
    const { id, category, mechanic, question, points = 1, ...rest } = q;
    if (!category || !mechanic || !question) continue; // Skip invalid questions
    
    const newId = id && typeof id === 'string' ? id : uuid();
    if (questionById.has(newId)) continue; // Skip duplicates
    
    const newQuestion: AnyQuestion = {
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
    
    customQuestions.push(newQuestion);
    questions.push(newQuestion);
    questionById.set(newId, newQuestion);
    created.push(newQuestion);
  }

  persistCustomQuestions();
  return res.json({ ok: true, count: created.length, questions: created });
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

// Quizzes löschen
app.delete('/api/quizzes/:id', (req, res) => {
  const { id } = req.params;
  if (!id || !quizzes.has(id)) return res.status(404).json({ error: 'Quiz nicht gefunden' });
  quizzes.delete(id);
  return res.json({ ok: true });
});

// --- Lobby Stats Helper Functions ---

const buildLobbyStats = (room: RoomState): LobbyStats => {
  const fastestAnswers: FastestAnswer[] = [];
  const funnyAnswers: FunnyAnswer[] = [];
  const commonWrongAnswersMap = new Map<string, { answer: string; count: number; teams: Set<string>; questionId: string }>();

  // Collect fastest correct answers
  const allTimings = Array.from(room.statsAnswerTimings.values()).flat();
  allTimings.sort((a, b) => a.timeMs - b.timeMs);
  const topFastestCorrect = allTimings.filter(t => t.isCorrect).slice(0, 5);

  for (const timing of topFastestCorrect) {
    const q = questionById.get(timing.questionId);
    if (q) {
      fastestAnswers.push({
        teamName: timing.teamName,
        answer: typeof timing.answer === 'string' || typeof timing.answer === 'number' ? timing.answer : String(timing.answer),
        timeMs: timing.timeMs,
        questionText: q.question,
        questionId: timing.questionId,
        isCorrect: true,
        timestamp: timing.timestamp
      });
    }
  }

  // Collect funny answers marked by moderator
  for (const funnies of room.statsFunnyAnswers.values()) {
    for (const funny of funnies) {
      const q = questionById.get(funny.questionId);
      if (q) {
        funnyAnswers.push({
          teamName: funny.teamName,
          answer: funny.answer,
          questionText: q.question,
          questionId: funny.questionId,
          markedAt: funny.markedAt,
          markedByModerator: true
        });
      }
    }
  }

  // Collect common wrong answers
  for (const [qId, answerCounts] of room.statsWrongAnswerCounts.entries()) {
    const q = questionById.get(qId);
    if (!q) continue;

    let totalAnswers = 0;
    for (const count of answerCounts.values()) {
      totalAnswers += count;
    }
    if (totalAnswers === 0) continue;

    for (const [answer, count] of answerCounts.entries()) {
      const percentage = Math.round((count / totalAnswers) * 100);
      if (percentage >= 20) { // Only show if >20% chose this
        const key = `${qId}-${answer}`;
        commonWrongAnswersMap.set(key, {
          answer,
          count,
          teams: new Set(),
          questionId: qId
        });
      }
    }
  }

  const commonWrongAnswers: CommonWrongAnswer[] = Array.from(commonWrongAnswersMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(item => ({
      answer: item.answer,
      questionText: questionById.get(item.questionId)?.question || 'Unknown',
      questionId: item.questionId,
      count: item.count,
      percentage: 0, // Will be calculated properly in future if needed
      teams: Array.from(item.teams)
    }));

  return {
    fastestAnswers,
    funnyAnswers,
    commonWrongAnswers,
    lastUpdated: Date.now()
  };
};

// --- Room Cleanup (Memory Management) ---
const ROOM_IDLE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Check every hour

const cleanupInactiveRooms = () => {
  const now = Date.now();
  const roomsToDelete: string[] = [];

  for (const [code, room] of rooms.entries()) {
    const idleTime = now - room.lastActivityAt;
    if (idleTime > ROOM_IDLE_TIMEOUT) {
      roomsToDelete.push(code);
    }
  }

  if (roomsToDelete.length > 0) {
    roomsToDelete.forEach(code => rooms.delete(code));
    console.log(`[Cleanup] Gelöschte ${roomsToDelete.length} inaktive Rooms (>${(ROOM_IDLE_TIMEOUT / 1000 / 3600).toFixed(0)}h idle)`);
  }
};

setInterval(cleanupInactiveRooms, CLEANUP_INTERVAL);

// --- Admin Session Management ---
type AdminSession = {
  roomCode: string;
  token: string;
  createdAt: number;
  expiresAt: number;
};

const adminSessions = new Map<string, AdminSession>();
const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours
const SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000;

const generateSessionToken = (): string => uuid().split('-').join('').substring(0, 32);

const createAdminSession = (roomCode: string): AdminSession => {
  const now = Date.now();
  const session: AdminSession = {
    roomCode,
    token: generateSessionToken(),
    createdAt: now,
    expiresAt: now + SESSION_DURATION
  };
  adminSessions.set(session.token, session);
  return session;
};

const validateAdminSession = (roomCode: string, token?: string): boolean => {
  if (!token) return false;
  const session = adminSessions.get(token);
  if (!session || session.roomCode !== roomCode) return false;
  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    return false;
  }
  return true;
};

// Cleanup expired sessions
setInterval(() => {
  const now = Date.now();
  let deleted = 0;
  for (const [token, session] of adminSessions.entries()) {
    if (now > session.expiresAt) {
      adminSessions.delete(token);
      deleted++;
    }
  }
  if (deleted > 0) console.log(`[Sessions] ${deleted} abgelaufene Sessions gelöscht`);
}, SESSION_CLEANUP_INTERVAL);

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
      payload: { roomCode?: string; teamName?: string; teamId?: string; avatarId?: string },
      ack?: (resp: { ok: boolean; error?: string; team?: Team; board?: BingoBoard }) => void
    ) => {
      try {
        const { roomCode, teamName, teamId, avatarId } = payload || {};
        const resolved = requireRoomCode(roomCode);
        if (!teamName) throw new Error('teamName fehlt');
        const room = ensureRoom(resolved);
        touchRoom(room);
        const result = joinTeamToRoom(room, teamName, teamId, avatarId);
        const previousTeamId = socket.data.teamId as string | undefined;
        const previousRoom = socket.data.roomCode as string | undefined;
        if (previousTeamId && previousRoom && (previousTeamId !== result.team.id || previousRoom !== room.roomCode)) {
          const oldRoom = rooms.get(previousRoom);
          if (oldRoom) {
            markTeamDisconnected(oldRoom, previousTeamId);
            broadcastState(oldRoom);
          }
        }
        if (!previousTeamId || previousTeamId !== result.team.id || previousRoom !== room.roomCode) {
          markTeamConnected(room, result.team.id);
        }
        socket.data.teamId = result.team.id;
        socket.data.roomCode = room.roomCode;
        socket.data.role = 'team';
        broadcastState(room);
        respond(ack, { ok: true, team: result.team, board: result.board });
      } catch (err) {
        respond(ack, { ok: false, error: (err as Error).message });
      }
    }
  );

  // Avatar state synchronization for beamer display
  socket.on(
    'team:avatarState',
    (payload: { roomCode?: string; teamId?: string; state?: 'walking' | 'idle' | 'gesture' | 'happy' | 'sad' }) => {
      try {
        const { roomCode, teamId, state } = payload || {};
        const resolved = normalizeRoomCode(roomCode);
        if (!resolved || !teamId || !state) {
          console.log('⚠️ Avatar state sync - missing data:', { resolved, teamId, state });
          return;
        }
        
        console.log('🎨 Backend: Broadcasting avatar state', { roomCode: resolved, teamId, state });
        
        // Broadcast avatar state to all clients in the room (especially beamer)
        io.to(resolved).emit('team:avatarStateChanged', {
          teamId,
          state,
          timestamp: Date.now()
        });
      } catch (err) {
        // Silent fail - not critical
        if (DEBUG) console.error('Avatar state sync error:', err);
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

  socket.on('host:restartSession', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => restartRoomSession(room));
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

  socket.on('host:toggleScoreboardOverlay', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      room.scoreboardOverlayForced = !room.scoreboardOverlayForced;
      broadcastState(room);
      return { forced: room.scoreboardOverlayForced };
    });
  });

  socket.on('host:showAwards', (payload: { roomCode?: string }, ack?: AckFn) => {
    withRoom(payload?.roomCode, ack, (room) => {
      applyRoomState(room, { type: 'FORCE', next: 'AWARDS' });
      broadcastState(room);
    });
  });

  socket.on(
    'host:rundlaufBanCategory',
    (payload: { roomCode?: string; teamId?: string; categoryId?: string }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.gameState !== 'RUNDLAUF_CATEGORY_SELECT') throw new Error('Rundlauf-Auswahl nicht aktiv');
        if (!payload?.teamId || !room.teams[payload.teamId]) throw new Error('Team unbekannt');
        if (room.rundlaufTopTeamId && payload.teamId !== room.rundlaufTopTeamId) {
          throw new Error('Nur Platz 1 darf bannen');
        }
        const limit = Math.min(2, Math.max(0, room.rundlaufPool.length - 1));
        if (room.rundlaufBans.length >= limit) throw new Error('Ban-Limit erreicht');
        const categoryId = (payload.categoryId ?? '').trim();
        if (!categoryId) throw new Error('Kategorie fehlt');
        const exists = room.rundlaufPool.find((entry) => entry.id === categoryId);
        if (!exists) throw new Error('Kategorie nicht verfuegbar');
        if (room.rundlaufBans.includes(categoryId)) throw new Error('Kategorie bereits gebannt');
        if (room.rundlaufPinnedCategory?.id === categoryId) throw new Error('Kategorie ist bereits ausgewaehlt');
        room.rundlaufBans = [...room.rundlaufBans, categoryId];
        broadcastState(room);
      });
    }
  );

  socket.on(
    'host:rundlaufPickCategory',
    (payload: { roomCode?: string; teamId?: string; categoryId?: string }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.gameState !== 'RUNDLAUF_CATEGORY_SELECT') throw new Error('Rundlauf-Auswahl nicht aktiv');
        if (!payload?.teamId || !room.teams[payload.teamId]) throw new Error('Team unbekannt');
        if (room.rundlaufLastTeamId && payload.teamId !== room.rundlaufLastTeamId) {
          throw new Error('Nur letzter Platz darf waehlen');
        }
        if (room.rundlaufPinnedCategory) throw new Error('Kategorie bereits gesetzt');
        const categoryId = (payload.categoryId ?? '').trim();
        if (!categoryId) throw new Error('Kategorie fehlt');
        const exists = room.rundlaufPool.find((entry) => entry.id === categoryId);
        if (!exists) throw new Error('Kategorie nicht verfuegbar');
        if (room.rundlaufBans.includes(categoryId)) throw new Error('Kategorie ist gebannt');
        room.rundlaufPinnedCategory = exists;
        broadcastState(room);
      });
    }
  );

  socket.on('host:rundlaufConfirmCategories', (payload: { roomCode?: string }, ack?: AckFn) => {
    withRoom(payload?.roomCode, ack, (room) => {
      if (room.gameState !== 'RUNDLAUF_CATEGORY_SELECT') {
        throw new Error('Rundlauf-Auswahl nicht aktiv');
      }
      if (!hasRundlaufSelectionReady(room)) {
        throw new Error('Auswahl nicht abgeschlossen');
      }
      finalizeRundlaufSelection(room);
      // Move to SELECTION_COMPLETE so moderator can start
      applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_SELECTION_COMPLETE' });
      broadcastState(room);
      return { selected: room.rundlaufSelectedCategories };
    });
  });

  socket.on(
    'team:rundlaufBanCategory',
    (payload: { roomCode?: string; teamId?: string; categoryId?: string }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.gameState !== 'RUNDLAUF_CATEGORY_SELECT') {
          throw new Error('Rundlauf-Auswahl nicht aktiv');
        }
        if (!payload?.teamId || !room.teams[payload.teamId]) throw new Error('Team unbekannt');
        applyRundlaufBan(room, payload.teamId, payload.categoryId || '');
        broadcastState(room);
      });
    }
  );

  socket.on(
    'team:rundlaufPickCategory',
    (payload: { roomCode?: string; teamId?: string; categoryId?: string }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.gameState !== 'RUNDLAUF_CATEGORY_SELECT') {
          throw new Error('Rundlauf-Auswahl nicht aktiv');
        }
        if (!payload?.teamId || !room.teams[payload.teamId]) throw new Error('Team unbekannt');
        applyRundlaufPick(room, payload.teamId, payload.categoryId || '');

        // Auto-transition if selection is complete
        if (hasRundlaufSelectionReady(room)) {
          finalizeRundlaufSelection(room);
          applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_CATEGORY_SHOWCASE' });

          // Auto-transition to ROUND_INTRO after showcase animation (5 seconds for visibility)
          clearRundlaufRoundIntroTimer(room);
          room.rundlaufRoundIntroTimeout = setTimeout(() => {
            room.rundlaufRoundIntroTimeout = null;
            if (room.gameState !== 'RUNDLAUF_CATEGORY_SHOWCASE') return;
            applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_ROUND_INTRO' });
            room.rundlaufDeadlineAt = Date.now() + BLITZ_ROUND_INTRO_MS; // Reuse same constant (2s)
            broadcastState(room);

            // Auto-start round after intro countdown
            room.rundlaufRoundIntroTimeout = setTimeout(() => {
              room.rundlaufRoundIntroTimeout = null;
              if (room.gameState !== 'RUNDLAUF_ROUND_INTRO') return;
              startRundlaufRound(room);
              broadcastState(room);
            }, BLITZ_ROUND_INTRO_MS);
          }, 3000);
        }

        broadcastState(room);
        return { pinned: room.rundlaufPinnedCategory };
      });
    }
  );

  socket.on('host:rundlaufStartRound', (payload: { roomCode?: string }, ack?: AckFn) => {
    withRoom(payload?.roomCode, ack, (room) => {
      // This is now handled by handleHostNextAdvance when in SELECTION_COMPLETE or CATEGORY_SHOWCASE
      // But keep for direct API calls if needed
      if (room.gameState === 'RUNDLAUF_SELECTION_COMPLETE') {
        applyRoomState(room, { type: 'HOST_NEXT' });
        broadcastState(room);
        return;
      }
      if (room.gameState === 'RUNDLAUF_CATEGORY_SHOWCASE') {
        applyRoomState(room, { type: 'HOST_NEXT' });
        broadcastState(room);
        return;
      }
      if (room.gameState !== 'RUNDLAUF_ROUND_INTRO') throw new Error('Rundlauf-Intro nicht aktiv');
      startRundlaufRound(room);
      broadcastState(room);
    });
  });

  socket.on(
    'team:submitRundlaufAnswer',
    (payload: { roomCode?: string; teamId?: string; text?: string; pass?: boolean }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.gameState !== 'RUNDLAUF_PLAY') throw new Error('Rundlauf ist nicht aktiv');
        if (!payload?.teamId || !room.teams[payload.teamId]) throw new Error('Team unbekannt');
        if (room.rundlaufActiveTeamId !== payload.teamId) throw new Error('Team ist nicht am Zug');
        if (payload.pass) {
          eliminateRundlaufTeam(room, payload.teamId, 'pass');
          broadcastState(room);
          return { eliminated: true };
        }
        const attempt = evaluateRundlaufAttempt(room, payload.teamId, payload?.text ?? '');
        room.rundlaufLastAttempt = attempt;
        if (attempt.verdict === 'timeout') {
          eliminateRundlaufTeam(room, payload.teamId, 'timeout');
        } else if (attempt.verdict === 'ok') {
          if (!room.rundlaufUsedAnswersNormalized.includes(attempt.normalized)) {
            room.rundlaufUsedAnswers = [...room.rundlaufUsedAnswers, attempt.text];
            room.rundlaufUsedAnswersNormalized = [...room.rundlaufUsedAnswersNormalized, attempt.normalized];
          }
          if (!maybeEndRundlaufOnExhaustedList(room)) {
            advanceRundlaufTurn(room);
          }
        }
        broadcastState(room);
        return { attempt };
      });
    }
  );

  socket.on(
    'host:rundlaufMarkAnswer',
    (payload: { roomCode?: string; attemptId?: string; verdict?: 'ok' | 'dup' | 'invalid' }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.gameState !== 'RUNDLAUF_PLAY') throw new Error('Rundlauf ist nicht aktiv');
        if (!room.rundlaufLastAttempt) throw new Error('Kein Versuch vorhanden');
        if (!payload?.attemptId || payload.attemptId !== room.rundlaufLastAttempt.id) {
          throw new Error('Attempt nicht gefunden');
        }
        const verdict = payload.verdict ?? 'invalid';
        const attempt = { ...room.rundlaufLastAttempt, verdict };
        room.rundlaufLastAttempt = attempt;
        if (verdict === 'ok') {
          if (!room.rundlaufUsedAnswersNormalized.includes(attempt.normalized)) {
            room.rundlaufUsedAnswers = [...room.rundlaufUsedAnswers, attempt.text];
            room.rundlaufUsedAnswersNormalized = [...room.rundlaufUsedAnswersNormalized, attempt.normalized];
          }
          advanceRundlaufTurn(room);
        }
        broadcastState(room);
        return { attempt };
      });
    }
  );

  socket.on('host:rundlaufEliminateTeam', (payload: { roomCode?: string; teamId?: string }, ack?: AckFn) => {
    withRoom(payload?.roomCode, ack, (room) => {
      if (room.gameState !== 'RUNDLAUF_PLAY') throw new Error('Rundlauf ist nicht aktiv');
      if (!payload?.teamId || !room.teams[payload.teamId]) throw new Error('Team unbekannt');
      eliminateRundlaufTeam(room, payload.teamId, 'eliminated');
      broadcastState(room);
    });
  });

  socket.on('host:rundlaufNextTeam', (payload: { roomCode?: string }, ack?: AckFn) => {
    withRoom(payload?.roomCode, ack, (room) => {
      if (room.gameState !== 'RUNDLAUF_PLAY') throw new Error('Rundlauf ist nicht aktiv');
      advanceRundlaufTurn(room);
      broadcastState(room);
    });
  });

  socket.on(
    'host:rundlaufEndRound',
    (payload: { roomCode?: string; winnerIds?: string[] }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.gameState !== 'RUNDLAUF_PLAY') throw new Error('Rundlauf ist nicht aktiv');
        const winners =
          payload?.winnerIds?.filter((id) => room.teams[id]) ?? aliveRundlaufTeams(room);
        const unique = Array.from(new Set(winners));
        unique.forEach((teamId) => {
          if (room.teams[teamId]) {
            room.teams[teamId].score = (room.teams[teamId].score ?? 0) + RUNDLAUF_ROUND_POINTS;
          }
        });
        room.rundlaufRoundWinners = unique;
        room.rundlaufActiveTeamId = null;
        room.rundlaufDeadlineAt = null;
        room.rundlaufTurnStartedAt = null;
        clearRundlaufTurnTimer(room.roomCode);
        applyRoomState(room, { type: 'FORCE', next: 'RUNDLAUF_ROUND_END' });
        broadcastState(room);
      });
    }
  );

  socket.on(
    'host:startBlitz',
    (payload: { roomCode?: string }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        const pool = initializeBlitzStage(room);
        broadcastState(room);
        return { pool };
      });
    }
  );

  socket.on('host:blitzOpenSelection', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      if (room.blitzPhase !== 'READY' && room.blitzPhase !== 'BANNING') {
        throw new Error('Blitz ist nicht bereit');
      }
      // Reset selection state to allow new picks/bans
      room.blitzBans = {};
      const standings = getTeamStandings(room);
      const topStanding = standings[0];
      const lastStanding = standings[standings.length - 1];
      const topScoreOs = topStanding?.score ?? 0;
      const lastScoreOs = lastStanding?.score ?? 0;
      room.blitzTopTeamId = topStanding?.id ?? null;
      // Only assign last team when there is a meaningful difference between top and last scores
      room.blitzLastTeamId = (topScoreOs !== lastScoreOs && lastStanding) ? lastStanding.id : null;
      const BAN_LIMIT = 2; // always two bans for the top team
      room.blitzBanLimits = room.blitzTopTeamId ? { [room.blitzTopTeamId]: BAN_LIMIT } : {};
      room.blitzPinnedTheme = null;
      
      room.blitzPhase = 'BANNING';
      applyRoomState(room, { type: 'FORCE', next: 'BLITZ_BANNING' });
      broadcastState(room);
      return { phase: room.blitzPhase };
    });
  });

  socket.on(
    'host:banBlitzTheme',
    (payload: { roomCode?: string; teamId?: string; theme?: string; themeId?: string }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.blitzPhase !== 'BANNING') throw new Error('Bans nicht aktiv');
        if (!payload?.teamId || !room.teams[payload.teamId]) throw new Error('Team unbekannt');
        const themeKey = (payload?.themeId || payload?.theme || '').trim();
        applyBlitzBan(room, payload.teamId, themeKey);
        recomputeRoomWarnings(room);
        broadcastState(room);
      });
    }
  );

  socket.on(
    'host:pickBlitzTheme',
    (payload: { roomCode?: string; teamId?: string; themeId?: string; theme?: string }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.blitzPhase !== 'BANNING') throw new Error('Auswahl nicht aktiv');
        if (!payload?.teamId || !room.teams[payload.teamId]) throw new Error('Team unbekannt');
        const themeKey = (payload?.themeId || payload?.theme || '').trim();
        applyBlitzPick(room, payload.teamId, themeKey);

        // Auto-finalize and transition to CATEGORY_SHOWCASE if selection is complete
        if (hasBlitzSelectionReady(room) && room.blitzPhase === 'BANNING') {
          finalizeBlitzSelection(room);

          // CRITICAL: Change phase IMMEDIATELY to prevent race conditions
          room.blitzPhase = 'SELECTION_COMPLETE';
          applyRoomState(room, { type: 'FORCE', next: 'BLITZ_CATEGORY_SHOWCASE' });

          // Auto-transition to SET_INTRO after showcase animation
          clearBlitzRoundIntroTimer(room);

          // RACE CONDITION FIX: Only set timeout if none is running
          if (!room.blitzRoundIntroTimeout) {
            const timeoutMs = BLITZ_CATEGORY_SHOWCASE_MS;
            console.log(`[BLITZ] Setting ${timeoutMs}ms timeout for showcase`);
            room.blitzRoundIntroTimeout = setTimeout(() => {
              room.blitzRoundIntroTimeout = null;
              if (room.gameState !== 'BLITZ_CATEGORY_SHOWCASE') return;
              startBlitzSet(room);
              broadcastState(room);
            }, timeoutMs);
          }
        }

        broadcastState(room);
        return { pinned: room.blitzPinnedTheme };
      });
    }
  );

  socket.on('host:confirmBlitzThemes', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      if (room.blitzPhase !== 'BANNING') {
        throw new Error('Themes koennen aktuell nicht gesetzt werden');
      }
      if (!hasBlitzSelectionReady(room)) {
        throw new Error('Auswahl nicht abgeschlossen');
      }
      finalizeBlitzSelection(room);
      // Move to SELECTION_COMPLETE so moderator can start the round
      room.blitzPhase = 'SELECTION_COMPLETE';
      applyRoomState(room, { type: 'FORCE', next: 'BLITZ_SELECTION_COMPLETE' });
      broadcastState(room);
      return { selected: room.blitzSelectedThemes };
    });
  });

  socket.on(
    'team:blitzBanCategory',
    (payload: { roomCode?: string; teamId?: string; themeId?: string }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.gameState !== 'BLITZ_BANNING') throw new Error('Blitz-Auswahl nicht aktiv');
        if (!payload?.teamId || !room.teams[payload.teamId]) throw new Error('Team unbekannt');
        applyBlitzBan(room, payload.teamId, payload.themeId || '');
        broadcastState(room);
      });
    }
  );

  socket.on(
    'team:blitzPickCategory',
    (payload: { roomCode?: string; teamId?: string; themeId?: string }, ack?: AckFn) => {
      withRoom(payload?.roomCode, ack, (room) => {
        if (room.gameState !== 'BLITZ_BANNING') throw new Error('Blitz-Auswahl nicht aktiv');
        if (!payload?.teamId || !room.teams[payload.teamId]) throw new Error('Team unbekannt');
        applyBlitzPick(room, payload.teamId, payload.themeId || '');

        // Auto-transition if selection is complete
        if (hasBlitzSelectionReady(room) && room.blitzPhase === 'BANNING') {
          console.log('[BLITZ] Pick complete, transitioning to CATEGORY_SHOWCASE');
          finalizeBlitzSelection(room);

          // CRITICAL: Change phase IMMEDIATELY to prevent race conditions
          room.blitzPhase = 'SELECTION_COMPLETE';
          applyRoomState(room, { type: 'FORCE', next: 'BLITZ_CATEGORY_SHOWCASE' });
          console.log('[BLITZ] State:', room.gameState, '| Selected:', room.blitzSelectedThemes.map(t => t.title).join(', '));

          // Auto-transition to SET_INTRO after showcase animation
          clearBlitzRoundIntroTimer(room);

          // RACE CONDITION FIX: Only set timeout if none is running
          if (!room.blitzRoundIntroTimeout) {
            const timeoutMs = BLITZ_CATEGORY_SHOWCASE_MS;
            console.log(`[BLITZ] Setting ${timeoutMs}ms timeout for showcase`);
            room.blitzRoundIntroTimeout = setTimeout(() => {
            console.log('[BLITZ] Showcase timeout fired | Current state:', room.gameState);
            room.blitzRoundIntroTimeout = null;

            // ROBUST FIX: Don't fail silently - always try to progress
            if (room.gameState !== 'BLITZ_CATEGORY_SHOWCASE' &&
                room.gameState !== 'BLITZ_SELECTION_COMPLETE') {
              console.log('[BLITZ] WARNING: Unexpected state', room.gameState, '- forcing recovery');
              applyRoomState(room, { type: 'FORCE', next: 'BLITZ_CATEGORY_SHOWCASE' });
            }

            try {
              startBlitzSet(room);
              broadcastState(room);
              console.log('[BLITZ] ✓ Set started successfully');
            } catch (error) {
              console.error('[BLITZ] ✗ ERROR starting set:', error);
              // Fallback: Reset to READY so moderator can restart
              room.blitzPhase = 'READY';
              applyRoomState(room, { type: 'FORCE', next: 'BLITZ_READY' });
              broadcastState(room);
            }
            }, timeoutMs);
          }
        }

        broadcastState(room);
        return { pinned: room.blitzPinnedTheme };
      });
    }
  );

  socket.on('host:blitzStartSet', (payload: { roomCode?: string }, ack) => {
    withRoom(payload?.roomCode, ack, (room) => {
      // This is now handled by handleHostNextAdvance when in SELECTION_COMPLETE or CATEGORY_SHOWCASE
      // But keep for direct API calls if needed
      if (room.gameState === 'BLITZ_SELECTION_COMPLETE') {
        applyRoomState(room, { type: 'HOST_NEXT' });
        broadcastState(room);
        return;
      }
      // ROBUST FIX: Allow manual skip of CATEGORY_SHOWCASE (fallback if timeout fails)
      if (room.gameState === 'BLITZ_CATEGORY_SHOWCASE') {
        console.log('[BLITZ] Manual skip of CATEGORY_SHOWCASE - clearing timeout and starting set');
        clearBlitzRoundIntroTimer(room);
        startBlitzSet(room);
        broadcastState(room);
        return;
      }
      // Legacy support for direct start
      if (room.blitzPhase !== 'SELECTION_COMPLETE' && room.blitzPhase !== 'READY') {
        throw new Error('Set kann noch nicht gestartet werden');
      }
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
      const totalSets = Math.min(BLITZ_SETS, room.blitzSelectedThemes.length || BLITZ_SETS);
      if (room.blitzSetIndex >= totalSets - 1) {
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

  socket.on('host:endQuiz', (payload: { roomCode?: string }, ack?: AckFn) => {
    try {
      const code = payload?.roomCode;
      if (!code) throw new Error('roomCode fehlt');
      const room = rooms.get(code);
      if (!room) throw new Error('Room nicht gefunden');
      
      // Save final scores to AllTime stats
      const scores: Record<string, number> = {};
      const winners: string[] = [];
      let maxScore = -1;
      
      Object.values(room.teams).forEach((team) => {
        const score = team.score ?? 0;
        scores[team.name] = score;
        if (score > maxScore) {
          maxScore = score;
          winners.length = 0;
          winners.push(team.name);
        } else if (score === maxScore && maxScore > -1) {
          winners.push(team.name);
        }
      });
      
      // Only save if teams were involved
      if (Object.keys(room.teams).length > 0) {
        const runEntry: RunEntry = {
          quizId: room.quizId || 'unknown',
          date: new Date().toISOString(),
          winners: winners.length > 0 ? winners : Object.keys(room.teams).map(id => room.teams[id].name),
          scores
        };
        statsState.runs.push(runEntry);
        if (statsState.runs.length > 100) statsState.runs = statsState.runs.slice(-100);
        persistStats();
      }
      
      // Broadcast to all connected clients in this room that quiz has ended
      io.to(code).emit('quizEnded', { reason: 'moderator-ended' });
      // Disconnect all clients from this room
      io.to(code).disconnectSockets(true);
      // Delete the room from server
      rooms.delete(code);
      log(code, 'Quiz beendet - Room gelöscht. Final scores gespeichert.');
      respond(ack, { ok: true });
    } catch (err) {
      respond(ack, { ok: false, error: (err as Error).message });
    }
  });

  socket.on(
    'team:submitBlitzAnswers',
    (
      payload: { roomCode?: string; teamId?: string; answers?: string[] },
      ack?: AckFn
    ) => {
      withRoom(payload?.roomCode, ack, (room) => {
        enforceBlitzDeadline(room);
        if (room.blitzPhase !== 'PLAYING' || (room.gameState !== 'BLITZ_PLAYING' && room.gameState !== 'BLITZ')) {
          broadcastState(room);
          throw new Error('Blitz ist nicht aktiv');
        }
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

  // Removed: teamReady event - teams don't need to signal ready status anymore

  socket.on('disconnect', () => {
    const role = socket.data.role as string | undefined;
    const teamId = socket.data.teamId as string | undefined;
    const roomCode = socket.data.roomCode as string | undefined;
    if (role !== 'team' || !teamId || !roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;
    markTeamDisconnected(room, teamId);
    const connectedTeamIds = getConnectedTeamIds(room);
    const answeredConnected = connectedTeamIds.filter((id) => room.answers[id]).length;
    if (room.gameState === 'Q_ACTIVE' && room.timerEndsAt && connectedTeamIds.length > 0) {
      if (answeredConnected >= connectedTeamIds.length) {
        clearQuestionTimers(room);
        evaluateCurrentQuestion(room);
      }
    }
    if (room.gameState === 'RUNDLAUF_PLAY' && room.rundlaufActiveTeamId === teamId) {
      advanceRundlaufTurn(room);
    }
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

// End of server module

