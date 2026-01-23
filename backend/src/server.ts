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
  TeamStatusSnapshot,
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
  CozyPotatoThemeInput
} from '../../shared/quizTypes';
import { COZY_SLOT_TEMPLATE } from '../../shared/cozyTemplate';
import { CATEGORY_CONFIG } from '../../shared/categoryConfig';
import { mixedMechanicMap } from '../../shared/mixedMechanics';
import { questions, questionById } from './data/questions';
import { defaultBlitzPool } from './data/quizzes';
import { QuizMeta, Language, PotatoPhase } from '../../shared/quizTypes';
import { defaultQuizzes } from './data/quizzes';
import { normalizeText, similarityScore } from '../../shared/textNormalization';
import {
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
  rundlauf?: RundlaufConfig | null;
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
    rundlauf: q.rundlauf ?? null,
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
    rundlauf: stored.rundlauf ?? null,
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
const BLITZ_ITEM_INTERVAL_MS = Math.floor(BLITZ_ANSWER_TIME_MS / BLITZ_ITEMS_PER_SET);
const BLITZ_CATEGORY_COUNT = 5;
const POTATO_THEME_RECOMMENDED_MIN = 14;
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

const PHOTO_SPRINT_CATEGORIES: QuizBlitzTheme[] = [
  {
    id: 'PROMIS_AUGEN',
    title: 'PROMIS - AUGEN',
    items: [
      { id: 'promis_augen_01', prompt: 'promis_augen_01', answer: 'promis_augen_01', aliases: [] },
      { id: 'promis_augen_02', prompt: 'promis_augen_02', answer: 'promis_augen_02', aliases: [] },
      { id: 'promis_augen_03', prompt: 'promis_augen_03', answer: 'promis_augen_03', aliases: [] },
      { id: 'promis_augen_04', prompt: 'promis_augen_04', answer: 'promis_augen_04', aliases: [] },
      { id: 'promis_augen_05', prompt: 'promis_augen_05', answer: 'promis_augen_05', aliases: [] }
    ]
  },
  {
    id: 'TIERBABYS',
    title: 'TIERBABYS',
    items: [
      { id: 'tierbaby_01', prompt: 'tierbaby_01', answer: 'tierbaby_01', aliases: [] },
      { id: 'tierbaby_02', prompt: 'tierbaby_02', answer: 'tierbaby_02', aliases: [] },
      { id: 'tierbaby_03', prompt: 'tierbaby_03', answer: 'tierbaby_03', aliases: [] },
      { id: 'tierbaby_04', prompt: 'tierbaby_04', answer: 'tierbaby_04', aliases: [] },
      { id: 'tierbaby_05', prompt: 'tierbaby_05', answer: 'tierbaby_05', aliases: [] }
    ]
  },
  {
    id: 'LANDMARKS',
    title: 'LANDMARKS',
    items: [
      { id: 'lm_01', prompt: 'lm_01', answer: 'lm_01', aliases: [] },
      { id: 'lm_02', prompt: 'lm_02', answer: 'lm_02', aliases: [] },
      { id: 'lm_03', prompt: 'lm_03', answer: 'lm_03', aliases: [] },
      { id: 'lm_04', prompt: 'lm_04', answer: 'lm_04', aliases: [] },
      { id: 'lm_05', prompt: 'lm_05', answer: 'lm_05', aliases: [] }
    ]
  },
  {
    id: 'LOGOS',
    title: 'LOGOS',
    items: [
      { id: 'logo_01', prompt: 'logo_01', answer: 'logo_01', aliases: [] },
      { id: 'logo_02', prompt: 'logo_02', answer: 'logo_02', aliases: [] },
      { id: 'logo_03', prompt: 'logo_03', answer: 'logo_03', aliases: [] },
      { id: 'logo_04', prompt: 'logo_04', answer: 'logo_04', aliases: [] },
      { id: 'logo_05', prompt: 'logo_05', answer: 'logo_05', aliases: [] }
    ]
  },
  {
    id: 'ESSEN_CLOSEUP',
    title: 'ESSEN CLOSE-UP',
    items: [
      { id: 'food_01', prompt: 'food_01', answer: 'food_01', aliases: [] },
      { id: 'food_02', prompt: 'food_02', answer: 'food_02', aliases: [] },
      { id: 'food_03', prompt: 'food_03', answer: 'food_03', aliases: [] },
      { id: 'food_04', prompt: 'food_04', answer: 'food_04', aliases: [] },
      { id: 'food_05', prompt: 'food_05', answer: 'food_05', aliases: [] }
    ]
  },
  {
    id: 'FILMSTILLS',
    title: 'FILMSTILLS',
    items: [
      { id: 'film_01', prompt: 'film_01', answer: 'film_01', aliases: [] },
      { id: 'film_02', prompt: 'film_02', answer: 'film_02', aliases: [] },
      { id: 'film_03', prompt: 'film_03', answer: 'film_03', aliases: [] },
      { id: 'film_04', prompt: 'film_04', answer: 'film_04', aliases: [] },
      { id: 'film_05', prompt: 'film_05', answer: 'film_05', aliases: [] }
    ]
  }
];

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
      } as any,
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
      } as any,
      {
        id: 'demo-q03',
        question: 'Die Erde ist flach.',
        questionEn: 'The Earth is flat.',
        points: 100,
        segmentIndex: 0,
        category: 'Stimmts',
        mechanic: 'trueFalse',
        isTrue: false
      } as any,
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
      } as any,
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
      } as any
    ],
    potatoPool: [
      { id: 'theme-1', title: 'Europäische Hauptstädte' },
      { id: 'theme-2', title: 'Deutsche Flüsse' },
      { id: 'theme-3', title: 'Berühmte Musiker' },
      { id: 'theme-4', title: 'Olympische Sportarten' },
      { id: 'theme-5', title: 'Automobilmarken' },
      { id: 'theme-6', title: 'Disney Filme' },
      { id: 'theme-7', title: 'Afrikanische Säugetiere' },
      { id: 'theme-8', title: 'Obstarten' },
      { id: 'theme-9', title: 'Gemüsesorten' },
      { id: 'theme-10', title: 'Musikinstrumente' },
      { id: 'theme-11', title: 'US Bundesstaaten' },
      { id: 'theme-12', title: 'Deutsche Bundesländer' },
      { id: 'theme-13', title: 'Länder mit A' },
      { id: 'theme-14', title: 'Länder mit S' }
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
  };
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

type PotatoThemeDefinition = {
  id: string;
  title: string;
  allowedAnswers: string[];
  allowedNormalized: string[];
  aliases: Record<string, string[]>;
  aliasNormalized: string[];
};

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
        mediaUrl: (item as any).mediaUrl
      }))
    };
  });

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
  rundlauf: sanitizeRundlaufDraft(draft.rundlauf ?? null),
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
    rundlauf: sanitizeRundlaufDraft(payload.rundlauf ?? draft.rundlauf),
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
      rundlauf: finalized.rundlauf ?? null,
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
app.use('/api/studio', studioRoutes);

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
      finalsTriggered: false
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
  }, durationMs + 20);
  io.to(room.roomCode).emit('timerStarted', { endsAt });
};

const log = (roomCode: string, message: string, ...args: unknown[]) => {
  if (!DEBUG) return;
  console.log(`[${roomCode}] ${message}`, ...args);
};

const POTATO_ROUNDS = 3;
const POTATO_ANSWER_TIME_MS = 30000;
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

const initializePotatoStage = (room: RoomState, payload?: { themes?: string[]; themesText?: string }) => {
  const parsed = sanitizePotatoPool(payload?.themes) || sanitizePotatoPool(payload?.themesText);
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
  room.nextStage = null;
  recomputeRoomWarnings(room);
  applyRoomState(room, { type: 'FORCE', next: 'POTATO' });
};

const initializeBlitzStage = (room: RoomState) => {
  const definitions = PHOTO_SPRINT_CATEGORIES.length ? PHOTO_SPRINT_CATEGORIES : DEFAULT_BLITZ_THEMES.map(buildLegacyBlitzTheme);
  const normalizedDefs = definitions.map((theme, idx) => normalizeBlitzTheme(theme, idx));
  room.blitzThemeLibrary = normalizedDefs.reduce<Record<string, QuizBlitzTheme>>((acc, theme) => {
    acc[theme.id] = theme;
    return acc;
  }, {});
  const visibleCount = Math.max(0, Math.min(BLITZ_CATEGORY_COUNT, normalizedDefs.length));
  room.blitzPool = selectBlitzVisiblePool(normalizedDefs, visibleCount);
  room.blitzBans = {};
  const standings = getTeamStandings(room);
  room.blitzTopTeamId = standings[0]?.id ?? null;
  room.blitzLastTeamId = standings.length ? standings[standings.length - 1]?.id ?? null : null;
  const activeTeamsCount = getConnectedTeamIds(room).length || Object.keys(room.teams).length;
  const dynamicBanLimit = activeTeamsCount <= 2 || visibleCount <= 4 ? 1 : 2;
  room.blitzBanLimits = room.blitzTopTeamId ? { [room.blitzTopTeamId]: dynamicBanLimit } : {};
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
  const topId = room.blitzTopTeamId;
  const lastId = room.blitzLastTeamId;
  const bans = topId ? room.blitzBans[topId]?.length ?? 0 : 0;
  const banReady = topId ? bans >= 2 : true;
  const pickReady = lastId ? Boolean(room.blitzPinnedTheme) : true;
  return banReady && pickReady;
};

const finalizeBlitzSelection = (room: RoomState) => {
  const bannedIds = new Set(Object.values(room.blitzBans).flat());
  const pinned = room.blitzPinnedTheme ?? null;
  const remaining = room.blitzPool.filter((entry) => !bannedIds.has(entry.id) && entry.id !== pinned?.id);
  const shuffled = [...remaining].sort(() => Math.random() - 0.5);
  const needed = 2; // Always pick 2 random themes
  const randomPick = shuffled.slice(0, needed);
  room.blitzSelectedThemes = pinned ? [pinned, ...randomPick] : randomPick;
  room.blitzSetIndex = -1;
  room.blitzDeadlineAt = null;
  room.blitzTheme = null;
  room.blitzPhase = 'ROUND_INTRO';
  resetBlitzCollections(room);
};

const applyBlitzBan = (room: RoomState, teamId: string, themeKey: string) => {
  if (room.blitzTopTeamId && teamId !== room.blitzTopTeamId) {
    throw new Error('Nur Platz 1 darf bannen');
  }
  const limit = room.blitzBanLimits[teamId] ?? 0;
  if (limit <= 0) throw new Error('Dieses Team darf nicht bannen');
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
  const topId = room.blitzTopTeamId;
  if (topId) {
    const required = room.blitzBanLimits[topId] ?? 0;
    const bans = room.blitzBans[topId] ?? [];
    if (required > 0 && bans.length < required) {
      throw new Error('Erst bannen, dann waehlen');
    }
  }
  if (room.blitzPinnedTheme) throw new Error('Thema bereits gewaehlt');
  const themeId = themeKey.trim();
  if (!themeId) throw new Error('Thema fehlt');
  const theme = room.blitzPool.find(
    (entry) => entry.id === themeId || entry.title.toLowerCase() === themeId.toLowerCase()
  );
  if (!theme) throw new Error('Thema nicht verfuegbar');
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
  if (room.blitzPhase !== 'PLAYING' || !room.blitzDeadlineAt) return;
  const remaining = Math.max(0, room.blitzDeadlineAt - Date.now());
  if (remaining <= 0) {
    lockBlitzSet(room);
    computeBlitzResults(room);
    broadcastState(room);
    return;
  }
  const timer = setTimeout(() => {
    blitzSetTimers.delete(room.roomCode);
    if (room.blitzPhase !== 'PLAYING') return;
    lockBlitzSet(room);
    computeBlitzResults(room);
    broadcastState(room);
  }, remaining);
  blitzSetTimers.set(room.roomCode, timer);
};

const scheduleBlitzItemTicker = (room: RoomState, broadcast = false) => {
  clearBlitzItemTimer(room.roomCode);
  if (room.blitzPhase !== 'PLAYING') {
    room.blitzItemDeadlineAt = null;
    room.blitzItemDurationMs = null;
    if (broadcast) broadcastState(room);
    return;
  }
  const itemCount = room.blitzItems.length || BLITZ_ITEMS_PER_SET;
  const maxIndex = Math.max(0, itemCount - 1);
  const now = Date.now();
  if (room.blitzItemIndex >= maxIndex) {
    room.blitzItemDeadlineAt = room.blitzDeadlineAt;
    room.blitzItemDurationMs = room.blitzDeadlineAt ? Math.max(0, room.blitzDeadlineAt - now) : null;
    if (broadcast) broadcastState(room);
    return;
  }
  room.blitzItemDeadlineAt = now + BLITZ_ITEM_INTERVAL_MS;
  room.blitzItemDurationMs = BLITZ_ITEM_INTERVAL_MS;
  if (broadcast) broadcastState(room);
  const timer = setTimeout(() => {
    blitzItemTimers.delete(room.roomCode);
    if (room.blitzPhase !== 'PLAYING') return;
    room.blitzItemIndex = Math.min(maxIndex, room.blitzItemIndex < 0 ? 0 : room.blitzItemIndex + 1);
    scheduleBlitzItemTicker(room, true);
  }, BLITZ_ITEM_INTERVAL_MS);
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
  if (room.blitzPhase === 'PLAYING' || room.blitzPhase === 'ROUND_INTRO') throw new Error('Blitz-Set laeuft bereits');
  if (room.blitzSelectedThemes.length < 1) {
    throw new Error('Nicht genug Blitz-Themen ausgewaehlt');
  }
  const totalSets = Math.min(BLITZ_SETS, room.blitzSelectedThemes.length);
  if (room.blitzSetIndex >= totalSets - 1) {
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
  room.blitzPhase = 'ROUND_INTRO';
  room.blitzDeadlineAt = null;
  room.blitzItemIndex = 0;
  applyRoomState(room, { type: 'FORCE', next: 'BLITZ_SET_INTRO' });
  broadcastState(room);
  clearBlitzRoundIntroTimer(room);
  room.blitzRoundIntroTimeout = setTimeout(() => {
    room.blitzRoundIntroTimeout = null;
    if (room.blitzPhase !== 'ROUND_INTRO') return;
    applyRoomState(room, { type: 'FORCE', next: 'BLITZ_PLAYING' });
    room.blitzPhase = 'PLAYING';
    room.blitzDeadlineAt = Date.now() + BLITZ_ANSWER_TIME_MS;
    room.blitzItemIndex = 0;
    scheduleBlitzItemTicker(room, true);
    scheduleBlitzSetTimer(room);
  }, BLITZ_ROUND_INTRO_MS);
};

const lockBlitzSet = (room: RoomState) => {
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
  if (room.blitzPhase === 'PLAYING' && room.blitzDeadlineAt && Date.now() > room.blitzDeadlineAt) {
    lockBlitzSet(room);
    computeBlitzResults(room);
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
  if (user === expectedNorm) return true;
  const userLen = user.length;
  const expectedLen = expectedNorm.length;
  if (userLen < 4) return false;
  if (expectedLen > 10 && userLen < Math.ceil(expectedLen * 0.4)) return false;
  return expectedNorm.includes(user) || user.includes(expectedNorm);
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

const effectivePotatoPool = (room: RoomState) =>
  room.potatoPool.length ? room.potatoPool : room.presetPotatoPool;

const recomputeRoomWarnings = (room: RoomState) => {
  const warnings: string[] = [];
  const potatoSize = effectivePotatoPool(room).length;
  if (potatoSize > 0 && potatoSize < POTATO_THEME_RECOMMENDED_MIN) {
    warnings.push(`Potato-Pool enthält nur ${potatoSize} Themen (>=${POTATO_THEME_RECOMMENDED_MIN} empfohlen).`);
  }
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
  const potatoSize = Array.isArray(draft.potatoPool) ? draft.potatoPool.length : 0;
  if (potatoSize < 14) {
    warnings.push(`Potato-Pool enthaelt nur ${potatoSize} Themen (>=14 empfohlen).`);
  }
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
        if (score >= thr