import cors from 'cors';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';


import * as Sentry from '@sentry/node';
// import { createClient } from 'redis'; // Removed: using NodeCache instead
import NodeCache from 'node-cache';

Sentry.init({
  dsn: process.env.SENTRY_DSN || '', // Requires env var on production
  tracesSampleRate: 1.0,
  enabled: !!process.env.SENTRY_DSN // Only enable if DSN provided
});

// Initialize cache (default TTL: 10 minutes)
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
// Studio/Bingo/Builder-Reste entfernt
import {
  AnyQuestion,
  AnswerEntry,
  AnswerTieBreaker,
  BingoBoard,
  QuestionPhase,
  QuizTemplate,
  ScreenState,
  Team,
  TeamStatusSnapshot,
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
  BunteTuetePayload,
  CozyQuizDraft,
  NextStageHint,
  CozyQuizMeta,
  CozyQuestionSlotTemplate,
  EstimateQuestion,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  ImageQuestion,
  BettingQuestion
} from '../../shared/quizTypes';
import { COZY_SLOT_TEMPLATE } from '../../shared/cozyTemplate';
import { CATEGORY_CONFIG } from '../../shared/categoryConfig';
import { mixedMechanicMap } from '../../shared/mixedMechanics';
import { EUROVISION_THEME, isEurovisionDraftTitle } from '../../shared/eurovisionTheme';
import { questions, questionById } from './data/questions';
import { defaultBlitzPool } from './data/quizzes';
import { QuizMeta, Language } from '../../shared/quizTypes';
import { registerQQHandlers, broadcastQQ } from './quarterQuiz/qqSocketHandlers';
import { getQQRoom, qqJoinTeam, qqKickTeam, qqSubmitAnswer, qqPlaceCell, qqStealCell, qqStartFinalBetting, qqSubmitFinalBet, qqResolveFinalBets, updateTerritories, qqAdvanceFinalReveal, qqBetSlotsCount, detectTieBreakerCandidates, qqStartTieBreaker } from './quarterQuiz/qqRooms';
import { flushAllPendingSaves } from './quarterQuiz/qqPersist';
import { QQ_AVATARS, getRandomFunnyNames, QQ_MAX_TEAMS_LARGE, qqMegaFactionName, qqMegaFactionSlug, qqCozyWolfForSlot } from '../../shared/quarterQuizTypes';
import { defaultQuizzes } from './data/quizzes';
import { normalizeText, similarityScore } from '../../shared/textNormalization';
import {
  DEBUG,
  ROOM_IDLE_CLEANUP_MS,
} from './constants';
import { INTRO_SLIDES } from './config/introSlides';
import {
  applyGameAction,
  CozyGameState,
  GameStateAction
} from './game/stateMachine';
import { connectDB, isDBConnected, getMongoEnvSource } from './db/mongo';
import { 
  getCustomQuestionsFromDB, 
  initializeDefaultQuestions,
  getCozyDraftFromDB,
  saveCozyDraftToDB,
  getAllQQDraftsFromDB,
  getQQDraftFromDB,
  saveQQDraftToDB,
  deleteQQDraftFromDB,
  getQQIdeasFromDB,
  saveQQIdeaToDB,
  deleteQQIdeaFromDB,
  getAllCozyGamesFromDB,
  getCozyGameFromDB,
  saveCozyGameToDB,
  deleteCozyGameFromDB,
  seedCozyGamesIfMissing,
  syncCozyGameSeedFlags,
  syncCozyGameSeedI18n,
  syncCozyGameSeedArchived,
  getQQGameResults,
  deleteQQGameResult,
  deleteAllQQGameResults,
  saveQQFeedbackToDB,
  getQQFeedbackFromDB,
  deleteQQFeedbackFromDB,
  getQQUsageMap,
  getQQVenues,
  clearQQQuestionUsage,
  getQQLibraryItems,
  getQQLibraryItem,
  upsertQQLibraryItem,
  deleteQQLibraryItem,
  bulkUpsertQQLibrarySeed,
  getQQLibraryTopics,
} from './db/schemas';
import { COZY_LIBRARY_SEED } from './data/qqCozyLibrarySeed';
import { QQ_ORDER_LIBRARY_SEED } from './data/qqOrderQuestionsSeed';
import { COZY_GAME_V1_SEED } from '../../shared/cozyGameTypes';
import { QQ_DEFAULT_THEME_ID } from '../../shared/qqThemeIds';
import {
  runTriviaDbImport, getImportStatus, recategorizeTriviaDbItems,
  getTranslationStats, testDeeplConnection,
  runRetranslate, getRetranslateStatus,
} from './data/triviaDbImport';
import { ergaenzeFragenThemen } from './data/qqFragenThemen';

// --- Server setup ----------------------------------------------------------
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
// Security-Audit 2026-07-05 (#2): Kein hardcodierter Prod-Fallback mehr.
// In Prod MUSS ADMIN_PIN als Env gesetzt sein — sonst fail-fast beim Start,
// damit der Server nicht versehentlich mit einer oeffentlich bekannten PIN
// online geht. Nur im Dev greift ein lokaler Default fuer schnelle Iteration.
const ADMIN_PIN = resolveAdminPin();
function resolveAdminPin(): string {
  const pin = process.env.ADMIN_PIN;
  if (pin && pin.length >= 4) return pin;
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] ADMIN_PIN fehlt oder ist zu kurz (min. 4 Zeichen). In Produktion erforderlich — Start abgebrochen.');
    process.exit(1);
  }
  return '2506'; // nur lokaler Dev-Fallback — in Prod unerreichbar (fail-fast oben)
}
// Security-Audit 2026-07-05 (#3/#4/#5): PIN-Guard fuer Write-Endpunkte + den
// sensiblen Feedback-Read. Der PIN kommt vom Frontend automatisch als
// x-admin-pin-Header (globaler fetch-Interceptor in main.tsx, gespeist aus
// sessionStorage['qq_admin_pin'] der PinGate) — kann aber auch als body.pin /
// query.pin geschickt werden (z.B. Wolf haengt ?pin=... an den Feedback-URL).
// 2026-07-27 (Security-Audit): Dev-Bypass fail-secure gemacht. Frueher
// '!== production' → offen, falls Coolify NODE_ENV nicht auf 'production' setzt
// (die Backend-Env-Liste fuehrt NODE_ENV gar nicht). Jetzt: Bypass NUR bei
// explizitem NODE_ENV=development ODER lokal OHNE MONGODB_URI (Wolf-Regel 'nie
// gegen Prod', Harness startet mit `env -u MONGODB_URI`; Prod hat MONGODB_URI
// IMMER gesetzt). Unset NODE_ENV zaehlt damit als Prod → PIN erforderlich.
const DEV_BYPASS = process.env.NODE_ENV === 'development'
  || (process.env.NODE_ENV !== 'production' && !process.env.MONGODB_URI);
// In Dev (DEV_BYPASS) uebersprungen, damit lokale Iteration ohne PIN laeuft;
// die echten Daten liegen nur in Prod.
function requirePin(req: any, res: any, next: any): void {
  if (DEV_BYPASS) return next();
  const pin = req.headers?.['x-admin-pin'] ?? req.body?.pin ?? req.query?.pin;
  if (!pin || pin !== ADMIN_PIN) {
    res.status(403).json({ error: 'PIN erforderlich' });
    return;
  }
  next();
}
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:4173'];

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://unpkg.com', 'https://*.tile.openstreetmap.org'],
      connectSrc: ["'self'", 'wss:', 'ws:', ...ALLOWED_ORIGINS],
      mediaSrc: ["'self'", 'blob:', 'https://res.cloudinary.com'],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb' }));

// Rate limiting: 100 req/min per IP for API routes
const apiLimiter = rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false });
app.use('/api/', apiLimiter);
// Stricter limit for uploads: 10 req/min per IP
const uploadLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });
app.use('/api/upload', uploadLimiter);

const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;
const isCloudinaryEnabled = Boolean(cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret);

if (isCloudinaryEnabled) {
  cloudinary.config({
    cloud_name: cloudinaryCloudName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret,
    secure: true
  });
} else {
  console.warn('⚠️ Cloudinary nicht konfiguriert - nutze lokalen Upload-Speicher');
}

// static files for uploads
const uploadRoot = path.join(__dirname, '..', '..', 'uploads');
const uploadDir = path.join(uploadRoot, 'questions');

// Healthcheck / Room-Check
// ── Welche Fassung laeuft auf diesem Server? ────────────────────────────────
// 2026-08-25 (Wolf: „das problem besteht seit 10 pushes... wie machen wirs?").
// Backend und Frontend werden getrennt ausgeliefert (Coolify und Vercel) und
// sind nie zur selben Sekunde da. Wessen Fassung gerade laeuft, war von aussen
// nicht zu sehen - und ohne das sucht man Fehler im Code, die im Deployment
// liegen. Einmal beim Start bestimmt, danach unveraenderlich.
export const QQ_SERVER_BUILD: string = (() => {
  const ausUmgebung = process.env.SOURCE_COMMIT
    ?? process.env.GIT_COMMIT
    ?? process.env.RAILWAY_GIT_COMMIT_SHA
    ?? process.env.COOLIFY_GIT_COMMIT;
  if (ausUmgebung) return ausUmgebung.slice(0, 8);
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('child_process')
      .execSync('git rev-parse --short=8 HEAD', { encoding: 'utf8' })
      .trim();
  } catch {
    return 'unbekannt';
  }
})();

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    db: isDBConnected() ? 'connected' : 'fallback',
    uptime: process.uptime(),
    build: QQ_SERVER_BUILD,
  });
});

// 2026-04-28: Self-Keep-Alive für Render Free-Tier.
// Render schläft Services nach 15 Min Inaktivität ein. Während aktivem
// Spiel sollte das eh nicht passieren (Socket-Traffic wirkt als Activity),
// aber: User hat im Autoplay-Test Render-Sleeps beobachtet. Möglicher Grund:
// nur Outbound-Socket-Traffic, kein Inbound HTTP. Render zählt eventuell
// nur HTTP-Requests als Activity → Self-Ping alle 10 Min via öffentlicher
// URL.
// RENDER_EXTERNAL_URL wird von Render automatisch als ENV gesetzt.
// Für lokales Dev: Self-Ping wird übersprungen wenn URL fehlt.
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  setInterval(async () => {
    try {
      await fetch(`${RENDER_URL}/api/health`).catch(() => {});
    } catch { /* ignore */ }
  }, 10 * 60 * 1000); // 10 Min
  console.log(`[keepalive] Self-ping every 10 min to ${RENDER_URL}/api/health`);
}

app.post('/api/translate', async (req, res) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const source = req.body?.source === 'en' ? 'en' : 'de';
    const target = req.body?.target === 'de' ? 'de' : 'en';

    if (!text) return res.status(400).json({ error: 'text erforderlich' });
    if (source === target) return res.json({ translatedText: text });

    // 2026-09-05: MyMemory nimmt hoechstens 500 Zeichen. Laengere Anfragen
    // beantwortet der Dienst mit HTTP 200 und der Fehlermeldung IM
    // Uebersetzungsfeld. Vorher pruefte diese Route nur `response.ok`, gab
    // die Meldung als Uebersetzung zurueck, und der Builder schrieb sie in
    // den Satz. Gemessen im Live-Export vom 05.09.: genau eine Frage hat
    // einen deutschen Fun Fact ueber 500 Zeichen (tonight-p3-q1, 554), und
    // genau diese eine traegt als englischen Fun Fact den Satz
    // „QUERY LENGTH LIMIT EXCEEDED. MAX ALLOWED QUERY : 500 CHARS". Der stand
    // damit auf der Buehne.
    const MAX_ZEICHEN = 500;
    if (text.length > MAX_ZEICHEN) {
      return res.status(413).json({
        error: `Zu lang fuer den Uebersetzungsdienst: ${text.length} von hoechstens ${MAX_ZEICHEN} Zeichen. Bitte von Hand uebersetzen oder kuerzen.`,
      });
    }

    const params = new URLSearchParams({ q: text, langpair: `${source}|${target}` });
    const response = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`);
    if (!response.ok) {
      return res.status(502).json({ error: 'Übersetzungsdienst nicht erreichbar' });
    }
    const data = await response.json() as {
      responseStatus?: number | string;
      responseDetails?: string;
      responseData?: { translatedText?: string };
    };
    const translated = data?.responseData?.translatedText?.trim();
    if (!translated) return res.status(502).json({ error: 'Keine Übersetzung erhalten' });

    // Der Dienst meldet seinen eigenen Status im Rumpf, unabhaengig vom
    // HTTP-Status. Alles ausser 200 ist eine Fehlermeldung, kein Text.
    const status = Number(data.responseStatus);
    if (Number.isFinite(status) && status !== 200) {
      return res.status(502).json({ error: `Übersetzungsdienst: ${data.responseDetails || status}` });
    }
    // Und der Riegel fuer den Fall, dass der Status mal fehlt: eine Antwort,
    // die komplett in Grossbuchstaben steht, waehrend die Vorlage es nicht
    // tut, ist keine Uebersetzung, sondern eine Fehlermeldung.
    const schreitGross = (t: string) => t === t.toUpperCase() && /[A-Z]{4}/.test(t);
    if (schreitGross(translated) && !schreitGross(text)) {
      return res.status(502).json({ error: `Übersetzungsdienst antwortete mit einer Meldung statt mit Text: „${translated.slice(0, 80)}"` });
    }

    return res.json({ translatedText: translated });
  } catch (err) {
    console.error('Fehler bei Übersetzung:', err);
    return res.status(500).json({ error: 'Übersetzung fehlgeschlagen' });
  }
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


const audioUploadDir = path.join(uploadRoot, 'audio');
const audioUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      try {
        if (!fs.existsSync(audioUploadDir)) fs.mkdirSync(audioUploadDir, { recursive: true });
      } catch { /* ignore */ }
      cb(null, audioUploadDir);
    },
    filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Nur Audioformate erlaubt'));
  }
});

const extractCloudinaryPublicId = (url: string): string | null => {
  try {
    const marker = '/upload/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    const afterUpload = url.slice(idx + marker.length);
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    const withoutQuery = withoutVersion.split('?')[0];
    const ext = path.extname(withoutQuery);
    if (!ext) return withoutQuery || null;
    return withoutQuery.slice(0, -ext.length);
  } catch {
    return null;
  }
};

const uploadLocalFileToCloudinary = async (
  localPath: string,
  folder: 'questions' | 'blitz' | 'audio'
): Promise<string> => {
  // Cloudinary behandelt Audio/Video unter resource_type 'video'.
  const resourceType: 'image' | 'video' = folder === 'audio' ? 'video' : 'image';
  const result = await cloudinary.uploader.upload(localPath, {
    folder: `cozyquiz/${folder}`,
    resource_type: resourceType,
  });
  return result.secure_url;
};

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
  globalMuted: boolean;
  undoSnapshots: RoomUndoSnapshot[];
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
  mapSplitShown: boolean;
  mapPinStep: number;
  avatarsEnabled: boolean;
  halftimeTriggered?: boolean;
  finalsTriggered?: boolean;
  // Lobby Stats Tracking
  statsAnswerTimings: Map<string, { teamName: string; timeMs: number; answer: unknown; isCorrect: boolean; questionId: string; timestamp: number }[]>;
  statsFunnyAnswers: Map<string, { teamName: string; answer: string; questionId: string; markedAt: number }[]>;
  statsWrongAnswerCounts: Map<string, Map<string, number>>;
  timerPausedAt?: number | null;
  timerRemainingMs?: number | null;
  questionHistory: Array<{ questionId: string; answers: Record<string, AnswerEntry> }>;
};

type RoomUndoSnapshot = {
  gameState: CozyGameState;
  questionPhase: QuestionPhase;
  currentQuestionId: string | null;
  answers: Record<string, AnswerEntry>;
  teams: Record<string, Team>;
  remainingQuestionIds: string[];
  askedQuestionIds: string[];
  nextStage: NextStageHint | null;
  screen: ScreenState;
  scoreboardOverlayForced: boolean;
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




const BLITZ_SETS = 3;
const BLITZ_ITEMS_PER_SET = 5;
const BLITZ_DISPLAY_TIME_MS = 30000; // Image display phase
const BLITZ_ANSWER_TIME_MS = 30000;  // Answer input phase
const BLITZ_CATEGORY_COUNT = 9; // 3×3 grid: 2 bans + 1 pick + 2 random = 5 min, 9 gives comfortable buffer
const RUNDLAUF_CATEGORY_COUNT = 6; // 2 bans + 1 pick + 3 remaining (2 random) = 6
const RUNDLAUF_ROUND_POINTS = 3; // TODO(RUNDLAUF): confirm points per round win



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
const mongoUriConfigured = Boolean((process.env.MONGODB_URI || process.env.DATABASE_URL)?.trim());

const ensureDraftDbConnection = async (): Promise<boolean> => {
  if (isDBConnected()) return true;
  if (!mongoUriConfigured) return false;
  return connectDB();
};

// Initialize with default on first run

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
  let loaded: unknown = null;
  if (fs.existsSync(cozyDraftsPath)) {
    // Dev / lokal: aus File-System lesen (erlaubt persistCozyDrafts() spaeter)
    loaded = JSON.parse(fs.readFileSync(cozyDraftsPath, 'utf-8'));
  } else {
    // Production-Build (Render): tsc kopiert JSON-Files NICHT ins dist/.
    // require() mit resolveJsonModule:true inlined das File zur Compile-Zeit
    // → JSON-Inhalt ist auch im dist-Build verfuegbar.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    loaded = require('./data/cozyQuizDrafts.json');
  }
  cozyDrafts = Array.isArray(loaded) && loaded.length > 0
    ? (loaded as CozyQuizDraft[])
    : [createDefaultDemoDraft()];
} catch {
  // Fallback: create default draft if JSON is corrupted
  console.error(`Fehler beim Laden von ${cozyDraftsPath} - nutze Demo-Draft als Fallback`);
  cozyDrafts = [createDefaultDemoDraft()];
}


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

// 2026-05-01: Auto-Seed Repo-Drafts in MongoDB. Wenn ein Draft im
// cozyQuizDrafts.json existiert aber nicht in DB, wird er einmalig
// gepusht. Existing DB-Drafts werden NICHT &uuml;berschrieben (User-Edits
// bleiben). L&auml;uft nach DB-Connect; failt silently wenn DB offline.
const seedRepoDraftsToDb = async (): Promise<void> => {
  console.log(`[seed] Pruefe ${cozyDrafts.length} Repo-Drafts auf DB-Sync...`);
  const dbReady = await ensureDraftDbConnection();
  if (!dbReady) {
    console.log('[seed] DB nicht verbunden - skip');
    return;
  }
  let pushedCount = 0;
  for (const repoDraft of cozyDrafts) {
    try {
      const exists = await getCozyDraftFromDB(repoDraft.id);
      if (!exists) {
        await saveCozyDraftToDB(repoDraft);
        console.log(`[seed] Repo-Draft "${repoDraft.id}" in MongoDB gepusht`);
        pushedCount++;
      }
    } catch (err) {
      console.warn(`[seed] Konnte Draft "${repoDraft.id}" nicht seeden:`, (err as Error).message);
    }
  }
  console.log(`[seed] Fertig - ${pushedCount} neue Drafts gepusht, ${cozyDrafts.length - pushedCount} schon in DB`);
};
// Fire-and-forget; Seeding blockt Server-Start nicht.
seedRepoDraftsToDb().catch(err => console.warn('[seed] Fehler:', err));








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


const getConnectedTeamIds = (room: RoomState) =>
  Object.keys(room.connectedTeams).filter((teamId) => room.connectedTeams[teamId] > 0);



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








const log = (roomCode: string, message: string, ...args: unknown[]) => {
  if (!DEBUG) return;
  console.log(`[${roomCode}] ${message}`, ...args);
};


const BLITZ_SIMILARITY_THRESHOLD = 0.85;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');





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
    const bestCorrect = Math.max(first.correct, second?.correct ?? 0);
    if (bestCorrect === 0) {
      // No one got any answers right — no points awarded
    } else if (!second || first.correct === second.correct) {
      provisional[first.teamId].pointsAwarded = 1;
      if (second) provisional[second.teamId].pointsAwarded = 1;
      if (room.teams[first.teamId]) room.teams[first.teamId].score = (room.teams[first.teamId].score ?? 0) + 1;
      if (second && room.teams[second.teamId])
        room.teams[second.teamId].score = (room.teams[second.teamId].score ?? 0) + 1;
    } else if (first.correct > second.correct) {
      provisional[first.teamId].pointsAwarded = 3;
      if (room.teams[first.teamId]) room.teams[first.teamId].score = (room.teams[first.teamId].score ?? 0) + 3;
    } else {
      provisional[second.teamId].pointsAwarded = 3;
      if (room.teams[second.teamId]) room.teams[second.teamId].score = (room.teams[second.teamId].score ?? 0) + 3;
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

  const bestCorrect = activeTeams[0]?.correct ?? 0;
  let currentPlace = 1;
  for (let i = 0; i < activeTeams.length; ) {
    const same = activeTeams.filter((entry) => entry.correct === activeTeams[i].correct);
    const points = bestCorrect === 0 ? 0 : currentPlace === 1 ? 3 : currentPlace === 2 ? 1 : 0;
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


const clearRundlaufTurnTimer = (roomCode: string) => {
  const timer = rundlaufTurnTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    rundlaufTurnTimers.delete(roomCode);
  }
};


// Teams that can still take a turn: connected AND not eliminated (used for turn navigation)

// Teams still in the round: not eliminated regardless of connection (used for round-over checks)






















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
  const funFactDe = (question as any).funFact;
  const funFactEn = (question as any).funFactEn;
  if (funFactDe || funFactEn) {
    base.funFactDe = funFactDe;
    base.funFactEn = funFactEn;
    base.funFact = combineText(funFactDe, funFactEn, language);
  }

  if (question.mechanic === 'multipleChoice' || question.mechanic === 'betting') {
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



const translateText = async (text: string, src = 'DE', tgt = 'EN'): Promise<string> => {
  if (!text?.trim()) return text;
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) return text;
  try {
    const res = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: [text], source_lang: src.toUpperCase(), target_lang: tgt.toUpperCase() }),
    });
    const data = await res.json() as any;
    const translated: string = data?.translations?.[0]?.text?.trim();
    return translated && translated !== text ? translated : text;
  } catch {
    return text;
  }
};


// Translate only fields that are missing (used as fallback in createSession for old questions)







const normalizeString = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();








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
    } else if (payload.kind === 'map') {
      const t = payload.target;
      if (!t || typeof t.lat !== 'number' || typeof t.lng !== 'number') {
        issues.push('Karten-Variante benötigt gültige Zielkoordinaten (lat/lng).');
      }
    }
  }
  return issues;
};


type BunteEvaluationResult = {
  awardedPoints: number;
  awardedDetail: string | null;
  isCorrect: boolean;
  tieBreaker?: AnswerTieBreaker | null;
};






const sanitizeQuestionForTeams = (question: AnyQuestion): AnyQuestion => {
  const q = { ...(question as any) };
  // Remove correct answer fields so teams cannot see them via team:show-question
  delete q.answer;
  delete q.answerEn;
  delete q.targetValue;    // estimate: correct number
  delete q.correctIndex;   // MC / betting: which option is correct
  delete q.isTrue;         // trueFalse: correct value
  delete q.correctOrder;   // sortItems: correct ordering
  delete q.correctOrderEn;
  delete q.funFact;        // moderation notes
  delete q.funFactEn;
  delete q.funFactDe;
  // Sanitize bunteTuete fotosprint items
  if (q.bunteTuete?.blitzItems) {
    q.bunteTuete = {
      ...q.bunteTuete,
      correctOrder: undefined,
      blitzItems: q.bunteTuete.blitzItems.map((item: any) => {
        const { answer: _a, ...rest } = item;
        return rest;
      })
    };
  }
  return q as AnyQuestion;
};

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
    color: team.color,
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
        tieBreaker: entry.tieBreaker ?? null,
        deviation: entry.deviation ?? null,
        bestDeviation: entry.bestDeviation ?? null,
        betPoints: entry.betPoints,
        betPool: entry.betPool
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
    // stateUpdate goes to all clients (beamer + teams); beamer needs full data for reveals.
    // Teams receive sanitized question separately via team:show-question event.
    ...(localized !== null ? { currentQuestion: localized } : {}),
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
    mapSplitShown: room.mapSplitShown,
    mapPinStep: room.mapPinStep,
    avatarsEnabled: room.avatarsEnabled,
    results,
    liveAnswers,
    warnings: warnings.length ? warnings : undefined,
    supportsBingo: Boolean(room.bingoEnabled),
    top5FoundSlots: (() => {
      if (includeResults) return undefined; // only during active phase
      const bunte = (activeQuestion as any)?.bunteTuete;
      if (!bunte || bunte.kind !== 'top5') return undefined;
      const target: string[] = Array.isArray(bunte.correctOrder) ? bunte.correctOrder : [];
      const targetLabels: string[] = (bunte.items ?? []).map((i: any) => i.label?.trim().toLowerCase()).filter(Boolean);
      const targetNormalized = Array.from(new Set([
        ...target.map((t: string) => t?.trim().toLowerCase()).filter(Boolean),
        ...targetLabels
      ]));
      return target.map((_: string, slotIdx: number) => {
        const slotNorm = targetNormalized[slotIdx];
        if (!slotNorm) return false;
        return Object.values(room.answers).some((ans) => {
          const submission = ans.value as any;
          if (!Array.isArray(submission?.order)) return false;
          return submission.order.some((val: string) =>
            typeof val === 'string' && normalizeText(val) === slotNorm
          );
        });
      });
    })()
  };

  return payload;
};

const broadcastState = (room: RoomState) => {
  io.to(room.roomCode).emit('server:stateUpdate', buildStateUpdatePayload(room));
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

// 2026-07-08 (Wolf 'legacy read-only weg'): Die Legacy-Read-Routen
// GET /api/questions und /api/questions/custom entfernt — bedienten nur den
// bereits geloeschten Frontend-Fragen-Editor-Stack; kein Live-Aufruf mehr
// (grep frontend/src → 0 Treffer). /api/catalogs + /api/quizzes bleiben.

// Katalogliste

app.get('/api/questions/custom/export', requirePin, async (_req, res) => {
  try {
    let customQs: AnyQuestion[];
    
    if (isDBConnected()) {
      customQs = await getCustomQuestionsFromDB();
    } else {
      customQs = customQuestions;
    }

    res.json({ questions: customQs });
  } catch (err) {
    res.status(500).json({ error: 'Export fehlgeschlagen' });
  }
});



// Bild-Upload
app.post('/api/upload/question-image', requirePin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Kein Bild erhalten' });
  const { questionId } = req.body as { questionId?: string };
  const localUrl = `/uploads/questions/${req.file.filename}`;

  try {
    const finalUrl = isCloudinaryEnabled
      ? await uploadLocalFileToCloudinary(req.file.path, 'questions')
      : localUrl;

    if (questionId) {
      questionImageMap[questionId] = finalUrl;
      persistQuestionImages();
    }

    return res.json({ imageUrl: finalUrl });
  } catch (err) {
    console.error('Fehler beim Question-Image Upload:', err);
    return res.status(500).json({ error: 'Bild konnte nicht hochgeladen werden' });
  } finally {
    if (isCloudinaryEnabled && req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // ignore cleanup errors
      }
    }
  }
});

// Audio upload (music per question / sound slots)
app.post('/api/upload/question-audio', requirePin, audioUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Audiodatei erhalten' });
  const localUrl = `/uploads/audio/${req.file.filename}`;

  try {
    const finalUrl = isCloudinaryEnabled
      ? await uploadLocalFileToCloudinary(req.file.path, 'audio')
      : localUrl;
    return res.json({ audioUrl: finalUrl });
  } catch (err) {
    console.error('Fehler beim Audio-Upload:', err);
    return res.status(500).json({ error: 'Audio konnte nicht hochgeladen werden' });
  } finally {
    if (isCloudinaryEnabled && req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
  }
});

// Blitz image upload


app.delete('/api/upload/question-image', requirePin, (req, res) => {
  const { questionId, imageUrl } = req.body as { questionId?: string; imageUrl?: string };
  const url = imageUrl || (questionId ? questionImageMap[questionId] : null);
  if (!url) return res.status(400).json({ error: 'imageUrl oder questionId fehlt' });

  if (isCloudinaryEnabled && url.startsWith('https://res.cloudinary.com/')) {
    const publicId = extractCloudinaryPublicId(url);
    if (publicId) {
      cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => {
        // ignore delete errors for non-blocking UX
      });
    }
    if (questionId && questionImageMap[questionId]) {
      delete questionImageMap[questionId];
      persistQuestionImages();
    }
    return res.json({ ok: true });
  }

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

// PIN verification endpoint (used by PinGate)
app.post('/api/verify-pin', (req, res) => {
  const { pin } = req.body as { pin?: string };
  if (!pin || pin !== ADMIN_PIN) {
    return res.status(401).json({ ok: false, error: 'Falscher PIN' });
  }
  return res.json({ ok: true });
});

// Admin Session Generation Endpoint
// POST /api/rooms/:roomCode/admin-session - Creates a new admin session token

// GET alias for environments where POST may be restricted














// Slot-Intro ausloesen, ohne Frage-Reihenfolge anzupassen

// Intro-Slides auf Beamer schicken



// Team join (mit Bingo-Board)

// Antworten (speichern, keine Auto-Evaluation)

// Antworten automatisch bewerten (ohne reveal)

// // Legacy Pfad fuer Schaetzfrage / generisch -> gleiche Logik

// Ergebnisse aufdecken + Scores gutschreiben





// Bingo markieren

// Scoreboard

// Ergebnis-Export (JSON oder CSV)



// Lobby Stats

// Mark answer as funny/best

// Timer



// Mute/Unmute


// Pause Toggle

// Sprache


// Fotoblitz timer settings


// Frage-Metadaten setzen (z. B. mixedMechanic)
// 2026-07-08 (Wolf): Legacy-Write-Endpoints /api/questions* entfernt. Sie wurden
// nur vom geloeschten /fragen + /katalog aufgerufen, waren UNGESCHUETZT und
// schrieben direkt in die Live-Runtime-Registry (questions/questionById) bzw. in
// questionOverrideMap — ein kleines Einfallstor. Runtime-Reads/-Helfer bleiben.

// Quizzes löschen

// --- Lobby Stats Helper Functions ---


// --- Room Cleanup (Memory Management) ---
const ROOM_IDLE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Check every hour

// Clear all timers associated with a room before deleting it to prevent orphaned callbacks
const deleteRoom = (code: string) => {
  const room = rooms.get(code);
  if (room) {
    clearQuestionTimers(room);
    clearBlitzRoundIntroTimer(room);
    if (room.rundlaufRoundIntroTimeout) {
      clearTimeout(room.rundlaufRoundIntroTimeout);
      room.rundlaufRoundIntroTimeout = null;
    }
  }
  clearBlitzItemTimer(code);
  clearBlitzSetTimer(code);
  clearRundlaufTurnTimer(code);
  rooms.delete(code);
};

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
    roomsToDelete.forEach(code => deleteRoom(code));
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
// ── Die alte Engine ist raus (2026-08-30) ────────────────────────────────────
// Hier lag `io.on('connection')` mit 961 Zeilen: host:auth, host:next, die
// Blitz- und Rundlauf-Runden, map:showSplit, beamer:show-rules. Das war die
// Engine vor CozyQuiz. Keines dieser Ereignisse wurde vom heutigen Frontend
// noch aufgerufen (2026-08-30 gemessen: 0 Treffer fuer host:, map:,
// beamer:show-rules und joinRoom in frontend/src, und auch keines in scripts/
// oder tests/). CozyQuiz bringt sein eigenes `io.on('connection')` mit,
// inklusive eigenem disconnect: qqSocketHandlers.ts Z1085 und Z3672. Der
// Legacy-disconnect fasste nur die alte `rooms`-Map an, nie einen QQ-Raum.


// Periodic cleanup (30-min idle rooms)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivityAt > ROOM_IDLE_CLEANUP_MS) {
      deleteRoom(code);
      log(code, 'Room removed due to inactivity');
    }
  }
}, ROOM_IDLE_CLEANUP_MS);

// --- Error Handling ---------------------------------------------------------
// Express error handler (must be last)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Express Error]', err.message);
  Sentry.captureException(err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
  Sentry.captureException(new Error(`Unhandled Rejection: ${reason}`));
});

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]', error);
  Sentry.captureException(error);
  // Exit after logging - cannot recover from uncaught exceptions
  process.exit(1);
});

// --- Start server -----------------------------------------------------------
const listenWithFallback = (port: number, attemptsLeft: number) => {
  httpServer
    .listen(port, async () => {
      console.log(`Quiz-Backend läuft auf Port ${port}`);
      
      // Validate required environment variables
      if (!(process.env.MONGODB_URI || process.env.DATABASE_URL)) {
        console.warn('⚠️ MONGODB_URI nicht gesetzt - nutze In-Memory Fallback');
      }
      console.log(`Mongo env source: ${getMongoEnvSource()}`);
      if (!process.env.SENTRY_DSN) {
        console.warn('⚠️ SENTRY_DSN nicht gesetzt - Fehlertracking deaktiviert');
      }
      
      // Initialize MongoDB
      try {
        const connected = await connectDB();
        if (connected) {
          await initializeDefaultQuestions(questions);
          // 2026-05-11: CozyLibrary-Seed bei erstem Start. Idempotent — bulkUpsert
          // mit source='seed' überschreibt bestehende seed-Items, lässt Wolfs
          // eigene Items unangetastet. Pre-existing Wolf-Items mit gleicher ID
          // werden überschrieben — unwahrscheinlich, da seed-IDs 'lib-*' Prefix.
          try {
            const seedCount = await bulkUpsertQQLibrarySeed(COZY_LIBRARY_SEED);
            if (seedCount > 0) console.log(`✓ CozyLibrary Seed: ${seedCount} Items upserted`);
          } catch (err) {
            console.warn('CozyLibrary Seed fehlgeschlagen:', err);
          }
          // 2026-05-25 (Wolf 'order-fragen auto-seed'): 50 Bunte-Tuete-Order-
          // Fragen idempotent upserten. Quelle: backend/src/data/qqOrderQuestionsSeed.ts
          try {
            const orderCount = await bulkUpsertQQLibrarySeed(QQ_ORDER_LIBRARY_SEED);
            if (orderCount > 0) console.log(`✓ CozyLibrary Order-Seed: ${orderCount} Items upserted`);
          } catch (err) {
            console.warn('CozyLibrary Order-Seed fehlgeschlagen:', err);
          }
          // 2026-05-25 (Wolf 'alle bluff durch fix-it außer eurovision' +
          // 'leere fix-it kategorie fixen'):
          // One-time-Migration ueber alle Drafts:
          //  1. bunteTuete.kind === 'bluff' → swap zu random Order-Frage
          //  2. bunteTuete.kind === 'order' MIT < 2 Items (broken snapshot)
          //     → swap zu random Order-Frage
          // Quelle: QQ_ORDER_LIBRARY_SEED (in-memory, immer aktuell)
          // Eurovision-Drafts werden komplett skipped.
          try {
            const drafts = await getAllQQDraftsFromDB();
            const orderPool = QQ_ORDER_LIBRARY_SEED;
            let migratedDrafts = 0;
            let migratedBluff = 0;
            let migratedBrokenOrder = 0;
            for (const draft of drafts) {
              const title = String(draft.title ?? '').toLowerCase();
              if (title.includes('eurovision') || title.includes('esc')) continue;
              const questions = Array.isArray(draft.questions) ? draft.questions : [];
              let dirty = false;
              const newQuestions = questions.map((q: any) => {
                const bt = q?.bunteTuete;
                const isBluff = bt?.kind === 'bluff';
                const isBrokenOrder = bt?.kind === 'order'
                  && (!Array.isArray(bt.items) || bt.items.length < 2);
                if (!isBluff && !isBrokenOrder) return q;
                const pick = orderPool[Math.floor(Math.random() * orderPool.length)] as any;
                dirty = true;
                if (isBluff) migratedBluff++;
                else migratedBrokenOrder++;
                return {
                  ...q,
                  text: pick.text,
                  textEn: pick.textEn,
                  answer: pick.answer,
                  answerEn: pick.answerEn,
                  funFact: pick.funFact,
                  funFactEn: pick.funFactEn,
                  bunteTuete: pick.bunteTuete,
                };
              });
              if (dirty) {
                migratedDrafts++;
                await saveQQDraftToDB({ ...draft, questions: newQuestions });
              }
            }
            if (migratedDrafts > 0) {
              console.log(`✓ Bunte-Tuete Migration: ${migratedBluff} Bluff + ${migratedBrokenOrder} broken-Order in ${migratedDrafts} Drafts ersetzt (Eurovision-Drafts skipped)`);
            }
          } catch (err) {
            console.warn('Bunte-Tuete Migration fehlgeschlagen:', err);
          }
          // 2026-05-17: CozyGames V1-Seed (12 Spiele). Idempotent — nur Spiele die
          // noch nicht in der DB sind werden eingefügt. Wolf-Edits bleiben unangetastet.
          try {
            const cgInserted = await seedCozyGamesIfMissing(COZY_GAME_V1_SEED);
            if (cgInserted > 0) console.log(`✓ CozyGames Seed: ${cgInserted} V1-Spiele eingefügt`);
          } catch (err) {
            console.warn('CozyGames Seed fehlgeschlagen:', err);
          }
          // 2026-05-19: parallel-Flag-Migration. Zieht das neue parallel-Feld
          // aus dem Seed-File auf existing DB-Einträge nach (war vorher undefined).
          try {
            const cgSynced = await syncCozyGameSeedFlags(COZY_GAME_V1_SEED);
            if (cgSynced > 0) console.log(`✓ CozyGames parallel-Sync: ${cgSynced} Spiele aktualisiert`);
          } catch (err) {
            console.warn('CozyGames parallel-Sync fehlgeschlagen:', err);
          }
          // 2026-05-20: i18n-Migration. Zieht nameEn + descriptionEn auf
          // existing DB-Eintraege nach. Wolf-Edits bleiben unangetastet.
          try {
            const cgI18n = await syncCozyGameSeedI18n(COZY_GAME_V1_SEED);
            if (cgI18n > 0) console.log(`✓ CozyGames i18n-Sync: ${cgI18n} Spiele EN-uebersetzt`);
          } catch (err) {
            console.warn('CozyGames i18n-Sync fehlgeschlagen:', err);
          }
          // 2026-07-09: archived-Migration. Zieht archived:true (deprecatete
          // Seed-Spiele) auf existing DB-Eintraege. Einseitig — Wolf-Edits safe.
          try {
            const cgArch = await syncCozyGameSeedArchived(COZY_GAME_V1_SEED);
            if (cgArch > 0) console.log(`✓ CozyGames archived-Sync: ${cgArch} Spiele archiviert`);
          } catch (err) {
            console.warn('CozyGames archived-Sync fehlgeschlagen:', err);
          }
          console.log('✓ MongoDB bereit');
        } else {
          console.warn('⚠️ MongoDB nicht verfügbar, nutze In-Memory Fallback');
        }
      } catch (err) {
        console.warn('⚠️ MongoDB nicht verfügbar, nutze In-Memory Fallback:', err);
      }
      
      console.log('✓ Server bereit');
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


// Graceful shutdown
// 2026-05-02 (Persistence-Audit P-5): vor dem httpServer-Close erst alle
// pendingSaves von qqPersist synchron wegschreiben — sonst verlieren wir bis
// zu 2s Aktionen der letzten Mod-Klicks vor Render-Sleep/Restart.
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`⚠️ ${signal} empfangen, fahre Server herunter...`);
  try {
    await flushAllPendingSaves();
    console.log('✓ Pending QQ-Saves gefluscht');
  } catch (err: any) {
    console.warn('Pending-Save-Flush fehlgeschlagen:', err?.message ?? err);
  }
  httpServer.close(() => {
    console.log('✓ HTTP Server geschlossen');
    process.exit(0);
  });
}

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Erzwungenes Herunterfahren nach Timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});




type AckFn<T = unknown> = (payload: T) => void;

// ── Quarter Quiz REST ─────────────────────────────────────────────────────────
app.get('/api/qq/questions/default', (_req, res) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'data', 'qqDefaultQuestions.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch {
    res.status(500).json({ error: 'Could not load default questions' });
  }
});

// Convert a CozyQuiz draft (20 questions) → 15 QQ questions
// Mapping: CozyQuiz slot indices → QQ category / phase
const QQ_DRAFT_MAPPING: Array<[number, string, number, number]> = [
  // [draftSlotIndex, qqCategory, phaseIndex, questionIndexInPhase]
  // ── Phase 1 ──
  [1,  'SCHAETZCHEN',   1, 0],
  [0,  'MUCHO',         1, 1],
  [4,  'BUNTE_TUETE',   1, 2],
  [2,  'ZEHN_VON_ZEHN', 1, 3],
  [3,  'CHEESE',        1, 4],
  // ── Phase 2 ──
  [9,  'SCHAETZCHEN',   2, 0],
  [8,  'MUCHO',         2, 1],
  [5,  'BUNTE_TUETE',   2, 2],
  [10, 'ZEHN_VON_ZEHN', 2, 3],
  [7,  'CHEESE',        2, 4],
  // ── Phase 3 ──
  [14, 'SCHAETZCHEN',   3, 0],
  [13, 'MUCHO',         3, 1],
  [6,  'BUNTE_TUETE',   3, 2],
  [15, 'ZEHN_VON_ZEHN', 3, 3], // slot 15 = BUNTE_TUETE in Cozy, repurposed
  [11, 'CHEESE',        3, 4],
];

const QQ_DRAFT_MAPPING_4: Array<[number, string, number, number]> = [
  // Phase 1
  [1,  'SCHAETZCHEN',   1, 0],
  [0,  'MUCHO',         1, 1],
  [4,  'BUNTE_TUETE',   1, 2],
  [2,  'ZEHN_VON_ZEHN', 1, 3],
  [3,  'CHEESE',        1, 4],
  // Phase 2
  [9,  'SCHAETZCHEN',   2, 0],
  [8,  'MUCHO',         2, 1],
  [5,  'BUNTE_TUETE',   2, 2],
  [10, 'ZEHN_VON_ZEHN', 2, 3],
  [7,  'CHEESE',        2, 4],
  // Phase 3
  [14, 'SCHAETZCHEN',   3, 0],
  [13, 'MUCHO',         3, 1],
  [6,  'BUNTE_TUETE',   3, 2],
  [15, 'ZEHN_VON_ZEHN', 3, 3],
  [11, 'CHEESE',        3, 4],
  // Phase 4
  [18, 'SCHAETZCHEN',   4, 0],
  [17, 'MUCHO',         4, 1],
  [19, 'BUNTE_TUETE',   4, 2],
  [12, 'ZEHN_VON_ZEHN', 4, 3],
  [16, 'CHEESE',        4, 4],
];

function qqExtractAnswer(q: AnyQuestion): string {
  if (q.mechanic === 'multipleChoice') {
    const mc = q as MultipleChoiceQuestion;
    return mc.options?.[mc.correctIndex] ?? '?';
  }
  if (q.mechanic === 'estimate') {
    const eq = q as EstimateQuestion;
    return `${eq.targetValue}${eq.unit ? ' ' + eq.unit : ''}`;
  }
  if (q.mechanic === 'trueFalse') {
    return (q as TrueFalseQuestion).isTrue ? 'Stimmt' : 'Stimmt nicht';
  }
  if (q.mechanic === 'imageQuestion') {
    return (q as ImageQuestion).answer || '?';
  }
  if (q.mechanic === 'betting') {
    const bq = q as BettingQuestion;
    return bq.options?.[bq.correctIndex] ?? '?';
  }
  // BunteTüte / custom — extract best available answer text
  const bt = (q as any).bunteTuete;
  if (bt) {
    if (bt.kind === 'top5' && Array.isArray(bt.correctOrder))
      return bt.correctOrder.join(', ');
    if (bt.kind === 'oneOfEight' && Array.isArray(bt.statements)) {
      const wrong = bt.statements.find((s: any) => s.isFalse);
      return wrong ? `Falsch: ${wrong.text}` : '?';
    }
    if (bt.kind === 'order' && Array.isArray(bt.items))
      return bt.items.map((i: any) => i.label ?? i).join(' → ');
    if (bt.kind === 'precision' && Array.isArray(bt.ladder) && bt.ladder[0])
      return bt.ladder[0].acceptedAnswers?.[0] ?? bt.ladder[0].label ?? '?';
  }
  return '?';
}

function qqExtractAnswerEn(q: AnyQuestion): string | undefined {
  if (q.mechanic === 'multipleChoice') {
    const mc = q as MultipleChoiceQuestion;
    return mc.optionsEn?.[mc.correctIndex];
  }
  if (q.mechanic === 'imageQuestion') {
    return (q as ImageQuestion).answerEn;
  }
  return undefined;
}

app.get('/api/qq/questions/from-draft/:draftId', async (req, res) => {
  try {
    const draftId = req.params.draftId;
    let draft: CozyQuizDraft | null = null;

    if (await ensureDraftDbConnection()) {
      draft = await getCozyDraftFromDB(draftId);
    } else {
      draft = cozyDrafts.find(d => d.id === draftId) ?? null;
    }
    if (!draft) return res.status(404).json({ error: 'Draft nicht gefunden' });

    const qs = draft.questions;
    const phases = req.query.phases === '4' ? 4 : 3;
    const mapping = phases === 4 ? QQ_DRAFT_MAPPING_4 : QQ_DRAFT_MAPPING;
    const minSlots = phases === 4 ? 20 : 16;
    if (!Array.isArray(qs) || qs.length < minSlots) {
      return res.status(400).json({ error: `Draft hat zu wenige Fragen (${qs?.length ?? 0}, benötigt ${minSlots})` });
    }

    const result = mapping.map(([slotIdx, category, phaseIndex, questionIndexInPhase]) => {
      const q = qs[slotIdx];
      const entry: any = {
        id: `${draftId}-qq-p${phaseIndex}-q${questionIndexInPhase}`,
        category,
        phaseIndex,
        questionIndexInPhase,
        text:     q?.question || `Frage ${slotIdx + 1}`,
        textEn:   q?.questionEn ?? undefined,
        answer:   q ? qqExtractAnswer(q) : '?',
        answerEn: q ? qqExtractAnswerEn(q) : undefined,
      };
      // Pass through targetValue for Schätzchen (estimate) questions
      if (category === 'SCHAETZCHEN' && q?.mechanic === 'estimate' && (q as any).targetValue != null) {
        entry.targetValue = (q as any).targetValue;
      }
      return entry;
    });

    res.json(result);
  } catch (err) {
    console.error('[QQ] Draft-Konvertierung fehlgeschlagen:', err);
    res.status(500).json({ error: 'Konvertierungsfehler' });
  }
});

// ── Quarter Quiz Builder — Draft CRUD ──────────────────────────────────────────
const qqDraftsPath = path.join(__dirname, 'data', 'qqDrafts.json');
let qqDrafts: Array<{
  id: string; title: string; phases: 2 | 3 | 4; language: string;
  questions: any[]; createdAt: number; updatedAt: number;
}> = [];

function persistQQDrafts() {
  try {
    fs.writeFileSync(qqDraftsPath, JSON.stringify(qqDrafts, null, 2), 'utf-8');
  } catch { /* ignore persistence issues */ }
}

// ── Sample QQ Drafts ─────────────────────────────────────────────────────────
// 5 bunt gemischte Allgemeinwissens-Drafts ("Vol. 1" bis "Vol. 5").
// Erstellt aus inspirations_now_i_know_v1.md (siehe Repo-Root).
// Imposter-Variante (BUNTE_TUETE / oneOfEight) wurde komplett vermieden —
// im Code drin aber im Quiz abgestellt.
function createSampleQQDrafts(): any[] {
  const now = Date.now();

  function q(id: string, phase: number, qi: number, cat: string, data: Record<string, any>) {
    return { id, category: cat, phaseIndex: phase, questionIndexInPhase: qi, text: '', answer: '', ...data };
  }

  // ─── 4×4-CONNECTIONS-FINALE-SETS ────────────────────────────────────────
  // 2026-05-06 (Wolf 'gerade in allen Allgemeinwissen-Drafts gleich'):
  // Eines pro Draft, statt überall denselben Default-FALLBACK. Jedes Set hat:
  //   einfach (1) - mittel (2) - schwer (3) - fies (4)
  // Die fies-Gruppen nutzen das Wortzusammensetzungs-Pattern (Bier-/Zimmer-/
  // Stern-) oder Mehrfach-Bedeutungen (Tier+Sternzeichen).
  const CONNECTIONS_PUB_KLASSIKER = {
    groups: [
      { id: 'g1', name: 'Bier-Marken', nameEn: 'Beer brands',
        items: ['Beck\'s', 'Astra', 'Krombacher', 'Jever'],
        itemsEn: ['Beck\'s', 'Astra', 'Krombacher', 'Jever'],
        difficulty: 1 as const },
      { id: 'g2', name: 'Currywurst-Beilagen', nameEn: 'Currywurst sides',
        items: ['Pommes', 'Brötchen', 'Senf', 'Mayo'],
        itemsEn: ['Fries', 'Bun', 'Mustard', 'Mayo'],
        difficulty: 2 as const },
      { id: 'g3', name: 'Asterix-Figuren', nameEn: 'Asterix characters',
        items: ['Obelix', 'Miraculix', 'Majestix', 'Idefix'],
        itemsEn: ['Obelix', 'Getafix', 'Vitalstatistix', 'Dogmatix'],
        difficulty: 3 as const },
      { id: 'g4', name: 'Vor BIER ergibt ein Wort', nameEn: '_ before BEER = word',
        items: ['Garten', 'Krug', 'Deckel', 'Fass'],
        itemsEn: ['Garden', 'Mug', 'Mat', 'Barrel'],
        difficulty: 4 as const },
    ],
  };
  const CONNECTIONS_NEUNZIGER = {
    groups: [
      { id: 'g1', name: 'Spice Girls', nameEn: 'Spice Girls',
        items: ['Sporty', 'Scary', 'Baby', 'Posh'],
        itemsEn: ['Sporty', 'Scary', 'Baby', 'Posh'],
        difficulty: 1 as const },
      { id: 'g2', name: 'Disney-Filme der 90er', nameEn: 'Disney 90s',
        items: ['Aladdin', 'Mulan', 'Tarzan', 'Hercules'],
        itemsEn: ['Aladdin', 'Mulan', 'Tarzan', 'Hercules'],
        difficulty: 2 as const },
      { id: 'g3', name: 'Boygroups der 90er', nameEn: '90s boy bands',
        items: ['Backstreet Boys', 'Take That', '*NSYNC', 'Boyzone'],
        itemsEn: ['Backstreet Boys', 'Take That', '*NSYNC', 'Boyzone'],
        difficulty: 3 as const },
      { id: 'g4', name: 'Auch Tier UND Sternzeichen', nameEn: 'Animal AND zodiac',
        items: ['Stier', 'Krebs', 'Widder', 'Skorpion'],
        itemsEn: ['Bull', 'Cancer', 'Ram', 'Scorpio'],
        difficulty: 4 as const },
    ],
  };
  const CONNECTIONS_GROSSES_KARO = {
    groups: [
      { id: 'g1', name: 'Schach-Figuren', nameEn: 'Chess pieces',
        items: ['Turm', 'Bauer', 'Läufer', 'Springer'],
        itemsEn: ['Rook', 'Pawn', 'Bishop', 'Knight'],
        difficulty: 1 as const },
      { id: 'g2', name: 'Beatles-Alben', nameEn: 'Beatles albums',
        items: ['Help!', 'Revolver', 'Abbey Road', 'Let It Be'],
        itemsEn: ['Help!', 'Revolver', 'Abbey Road', 'Let It Be'],
        difficulty: 2 as const },
      { id: 'g3', name: 'Berühmte Friedrichs', nameEn: 'Famous Friedrichs',
        items: ['Schiller', 'Nietzsche', 'Hölderlin', 'Engels'],
        itemsEn: ['Schiller', 'Nietzsche', 'Hölderlin', 'Engels'],
        difficulty: 3 as const },
      { id: 'g4', name: 'Vor ZIMMER ergibt einen Raum', nameEn: '_ before ROOM',
        items: ['Schlaf', 'Wohn', 'Bade', 'Kinder'],
        itemsEn: ['Bed', 'Living', 'Bath', 'Kid'],
        difficulty: 4 as const },
    ],
  };
  const CONNECTIONS_SUESS_SAUER = {
    groups: [
      { id: 'g1', name: 'Schokoriegel', nameEn: 'Chocolate bars',
        items: ['Snickers', 'Mars', 'Twix', 'Bounty'],
        itemsEn: ['Snickers', 'Mars', 'Twix', 'Bounty'],
        difficulty: 1 as const },
      { id: 'g2', name: 'Märchen der Brüder Grimm', nameEn: 'Grimm fairy tales',
        items: ['Rotkäppchen', 'Aschenputtel', 'Rapunzel', 'Hänsel und Gretel'],
        itemsEn: ['Little Red Riding Hood', 'Cinderella', 'Rapunzel', 'Hansel & Gretel'],
        difficulty: 2 as const },
      { id: 'g3', name: 'Kleine EU-Hauptstädte', nameEn: 'Small EU capitals',
        items: ['Riga', 'Tallinn', 'Bratislava', 'Vilnius'],
        itemsEn: ['Riga', 'Tallinn', 'Bratislava', 'Vilnius'],
        difficulty: 3 as const },
      { id: 'g4', name: 'Vor STERN ergibt ein Wort', nameEn: '_ before STAR = word',
        items: ['See', 'Schweif', 'Mauer', 'Fix'],
        itemsEn: ['Sea', 'Tail', 'Wall', 'Fix'],
        difficulty: 4 as const },
    ],
  };

  // ─── VOL. 1 ─────────────────────────────────────────────────────────────
  const v1 = 'qq-vol-1';
  const v1qs = [
    // Phase 1
    q(`${v1}-p1-0`, 1, 0, 'SCHAETZCHEN', { text: 'Wie viele Knochen hat ein erwachsener Mensch?', textEn: 'How many bones does an adult human have?', answer: '206', targetValue: 206, unit: 'Knochen', unitEn: 'bones', funFact: 'Babys werden mit etwa 270 Knochen geboren — viele verwachsen später miteinander.' }),
    q(`${v1}-p1-1`, 1, 1, 'MUCHO', { text: 'Welcher Planet hat die meisten Monde in unserem Sonnensystem (Stand 2024)?', textEn: 'Which planet has the most moons in our solar system (as of 2024)?', answer: 'Saturn', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptun'], optionsEn: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], correctOptionIndex: 1, funFact: 'Saturn hat Jupiter 2023 mit 146 bestätigten Monden überholt.' }),
    q(`${v1}-p1-2`, 1, 2, 'BUNTE_TUETE', { text: 'Nenne ein Land in Europa — reihum!', textEn: 'Name a country in Europe — one by one!', answer: 'Deutschland, Frankreich, Italien, Spanien, Portugal, Niederlande, Belgien, Luxemburg, Dänemark, Schweden, Norwegen, Finnland, Island, Irland, Vereinigtes Königreich, Polen, Tschechien, Slowakei, Österreich, Schweiz, Ungarn, Rumänien, Bulgarien, Griechenland, Kroatien, Slowenien, Serbien, Bosnien und Herzegowina, Montenegro, Nordmazedonien, Albanien, Kosovo, Estland, Lettland, Litauen, Weißrussland, Ukraine, Moldau, Russland, Türkei, Malta, Zypern, Andorra, Monaco, Liechtenstein, San Marino, Vatikanstadt', answerEn: 'Germany, France, Italy, Spain, Portugal, Netherlands, Belgium, Luxembourg, Denmark, Sweden, Norway, Finland, Iceland, Ireland, United Kingdom, Poland, Czech Republic, Slovakia, Austria, Switzerland, Hungary, Romania, Bulgaria, Greece, Croatia, Slovenia, Serbia, Bosnia and Herzegovina, Montenegro, North Macedonia, Albania, Kosovo, Estonia, Latvia, Lithuania, Belarus, Ukraine, Moldova, Russia, Turkey, Malta, Cyprus, Andorra, Monaco, Liechtenstein, San Marino, Vatican City', bunteTuete: { kind: 'hotPotato' } }),
    q(`${v1}-p1-3`, 1, 3, 'ZEHN_VON_ZEHN', { text: 'Welcher Ozean ist der größte der Erde?', textEn: 'Which ocean is the largest on Earth?', answer: 'Pazifik', options: ['Atlantik', 'Pazifik', 'Indischer Ozean'], optionsEn: ['Atlantic', 'Pacific', 'Indian Ocean'], correctOptionIndex: 1, funFact: 'Der Pazifik bedeckt etwa ein Drittel der Erdoberfläche.' }),
    q(`${v1}-p1-4`, 1, 4, 'CHEESE', { text: 'Welches Bauwerk ist hier zu sehen?', textEn: 'Which building is shown here?', answer: 'Eiffelturm', answerEn: 'Eiffel Tower' }),
    // Phase 2
    q(`${v1}-p2-0`, 2, 0, 'SCHAETZCHEN', { text: 'Wie hoch ist der Mount Everest in Metern?', textEn: 'How tall is Mount Everest in meters?', answer: '8849', targetValue: 8849, unit: 'm', funFact: 'Der Everest wächst weiter — die indische Platte schiebt ihn jährlich rund 4 mm nach oben.' }),
    q(`${v1}-p2-1`, 2, 1, 'MUCHO', { text: 'Welches Element hat das chemische Symbol „Au"?', textEn: 'Which element has the chemical symbol „Au"?', answer: 'Gold', options: ['Silber', 'Aluminium', 'Gold', 'Argon'], optionsEn: ['Silver', 'Aluminum', 'Gold', 'Argon'], correctOptionIndex: 2, funFact: '„Au" kommt vom lateinischen „aurum".' }),
    q(`${v1}-p2-2`, 2, 2, 'BUNTE_TUETE', { text: 'Sortiert diese Erfindungen chronologisch — älteste zuerst.', textEn: 'Put these inventions in chronological order — oldest first.', answer: 'Buchdruck, Dampfmaschine, Glühbirne, Internet', answerEn: 'Printing press, Steam engine, Light bulb, Internet', bunteTuete: { kind: 'order', items: ['Internet', 'Buchdruck', 'Glühbirne', 'Dampfmaschine'], itemsEn: ['Internet', 'Printing press', 'Light bulb', 'Steam engine'], correctOrder: [1, 3, 2, 0], criteria: 'chronologisch (älteste zuerst)', criteriaEn: 'chronological (oldest first)', itemValues: ['1983', 'um 1450', '1879', '1712'] }, funFact: 'Der Buchdruck mit beweglichen Lettern (Gutenberg, um 1450) machte Wissen erstmals massenhaft reproduzierbar — eine der folgenreichsten Erfindungen überhaupt.' }),
    q(`${v1}-p2-3`, 2, 3, 'ZEHN_VON_ZEHN', { text: 'In welchem Land liegt die Stadt Marrakesch?', textEn: 'In which country is the city of Marrakech located?', answer: 'Marokko', options: ['Algerien', 'Marokko', 'Tunesien'], optionsEn: ['Algeria', 'Morocco', 'Tunisia'], correctOptionIndex: 1, funFact: 'Marrakesch wird auch „die Rote Stadt" genannt.' }),
    q(`${v1}-p2-4`, 2, 4, 'CHEESE', { text: 'Welches Tier ist hier abgebildet?', textEn: 'Which animal is pictured here?', answer: 'Erdmännchen', answerEn: 'Meerkat' }),
    // Phase 3
    q(`${v1}-p3-0`, 3, 0, 'SCHAETZCHEN', { text: 'Wie viele Zähne hat ein erwachsener Mensch (inklusive Weisheitszähne)?', textEn: 'How many teeth does an adult human have (including wisdom teeth)?', answer: '32', targetValue: 32, unit: 'Zähne', unitEn: 'teeth', funFact: 'Etwa 35 % der Menschen haben gar keine Weisheitszähne.' }),
    q(`${v1}-p3-1`, 3, 1, 'MUCHO', { text: 'Welcher Fluss fließt durch Wien?', textEn: 'Which river flows through Vienna?', answer: 'Donau', options: ['Donau', 'Rhein', 'Elbe', 'Mosel'], optionsEn: ['Danube', 'Rhine', 'Elbe', 'Moselle'], correctOptionIndex: 0, funFact: 'Die Donau durchfließt 10 Länder — mehr als jeder andere Fluss der Welt.' }),
    q(`${v1}-p3-2`, 3, 2, 'BUNTE_TUETE', { text: 'Nenne eines der 5 bevölkerungsreichsten Länder der Welt (Stand 2024)!', textEn: 'Name one of the 5 most populous countries in the world (as of 2024)!', answer: 'Indien, China, USA, Indonesien, Pakistan', answerEn: 'India, China, USA, Indonesia, Pakistan', bunteTuete: { kind: 'top5', answers: ['Indien', 'China', 'USA', 'Indonesien', 'Pakistan'], answersEn: ['India', 'China', 'USA', 'Indonesia', 'Pakistan'] }, funFact: 'Indien hat 2023 China überholt.' }),
    q(`${v1}-p3-3`, 3, 3, 'ZEHN_VON_ZEHN', { text: 'Welcher Künstler malte das Werk „Sternennacht"?', textEn: 'Which artist painted „The Starry Night"?', answer: 'Vincent van Gogh', options: ['Claude Monet', 'Vincent van Gogh', 'Paul Cézanne'], optionsEn: ['Claude Monet', 'Vincent van Gogh', 'Paul Cézanne'], correctOptionIndex: 1, funFact: 'Van Gogh malte „Sternennacht" 1889 in einer Nervenheilanstalt.' }),
    q(`${v1}-p3-4`, 3, 4, 'CHEESE', { text: 'Welche Frucht ist hier zu sehen?', textEn: 'Which fruit is shown here?', answer: 'Granatapfel', answerEn: 'Pomegranate' }),
    // Phase 4
    q(`${v1}-p4-0`, 4, 0, 'SCHAETZCHEN', { text: 'In welchem Jahr fiel die Berliner Mauer?', textEn: 'In which year did the Berlin Wall fall?', answer: '1989', targetValue: 1989, funFact: 'Folge einer missverständlichen Pressekonferenz von Günter Schabowski.' }),
    q(`${v1}-p4-1`, 4, 1, 'MUCHO', { text: 'Welches Organ produziert das Hormon Insulin?', textEn: 'Which organ produces the hormone insulin?', answer: 'Bauchspeicheldrüse', options: ['Leber', 'Niere', 'Bauchspeicheldrüse', 'Milz'], optionsEn: ['Liver', 'Kidney', 'Pancreas', 'Spleen'], correctOptionIndex: 2, funFact: 'Insulin wurde 1921 entdeckt — Patent für 1 Dollar verkauft.' }),
    q(`${v1}-p4-2`, 4, 2, 'BUNTE_TUETE', { text: 'Wo stehen die Pyramiden von Gizeh?', textEn: 'Where are the Pyramids of Giza?', answer: 'Gizeh, Ägypten', answerEn: 'Giza, Egypt', bunteTuete: { kind: 'map', lat: 29.9792, lng: 31.1342, targetLabel: 'Pyramiden von Gizeh, Ägypten' }, funFact: 'Die Cheops-Pyramide war rund 3800 Jahre lang das höchste von Menschen errichtete Bauwerk der Welt.' }),
    q(`${v1}-p4-3`, 4, 3, 'ZEHN_VON_ZEHN', { text: 'Welcher Komponist schrieb die „Mondscheinsonate"?', textEn: 'Which composer wrote the „Moonlight Sonata"?', answer: 'Beethoven', options: ['Mozart', 'Beethoven', 'Chopin'], optionsEn: ['Mozart', 'Beethoven', 'Chopin'], correctOptionIndex: 1, funFact: 'Beethoven nannte sie nie so — der Titel kam erst nach seinem Tod von einem Kritiker.' }),
    q(`${v1}-p4-4`, 4, 4, 'CHEESE', { text: 'Welcher Schauspieler ist hier zu sehen?', textEn: 'Which actor is shown here?', answer: 'Leonardo DiCaprio', answerEn: 'Leonardo DiCaprio' }),
  ];

  // ─── VOL. 2 ─────────────────────────────────────────────────────────────
  const v2 = 'qq-vol-2';
  const v2qs = [
    // Phase 1
    q(`${v2}-p1-0`, 1, 0, 'SCHAETZCHEN', { text: 'Wie viele Studioalben veröffentlichten die Beatles offiziell?', textEn: 'How many studio albums did the Beatles officially release?', answer: '13', targetValue: 13, unit: 'Alben', unitEn: 'albums', funFact: 'Die Beatles waren nur 8 Jahre lang offiziell aktiv — von 1962 bis 1970.' }),
    q(`${v2}-p1-1`, 1, 1, 'MUCHO', { text: 'In welchem Jahr fanden die ersten modernen Olympischen Spiele statt?', textEn: 'In which year were the first modern Olympic Games held?', answer: '1896', options: ['1888', '1896', '1900', '1912'], optionsEn: ['1888', '1896', '1900', '1912'], correctOptionIndex: 1, funFact: 'Die ersten Spiele in Athen hatten 241 Athleten aus 14 Ländern.' }),
    q(`${v2}-p1-2`, 1, 2, 'BUNTE_TUETE', { text: 'Nenne eine Sportart, die bei den Sommer-Olympischen Spielen vertreten ist — reihum!', textEn: 'Name a sport featured in the Summer Olympics — one by one!', answer: 'Schwimmen, Leichtathletik, Turnen, Fußball, Basketball, Volleyball, Beachvolleyball, Handball, Wasserball, Tennis, Tischtennis, Badminton, Bogenschießen, Boxen, Judo, Karate, Taekwondo, Ringen, Fechten, Gewichtheben, Rudern, Kanu, Segeln, Surfen, Triathlon, Reiten, Radsport, Mountainbike, BMX, Hockey, Rugby, Golf, Skateboarden, Sportklettern, Trampolin, Synchronschwimmen, Wasserspringen, Moderner Fünfkampf, Schießen, Softball, Baseball, Hindernislauf, Marathon, Diskuswurf, Speerwurf', answerEn: 'Swimming, Athletics, Gymnastics, Football, Basketball, Volleyball, Beach Volleyball, Handball, Water Polo, Tennis, Table Tennis, Badminton, Archery, Boxing, Judo, Karate, Taekwondo, Wrestling, Fencing, Weightlifting, Rowing, Canoeing, Sailing, Surfing, Triathlon, Equestrian, Cycling, Mountain Biking, BMX, Hockey, Rugby, Golf, Skateboarding, Sport Climbing, Trampoline, Synchronized Swimming, Diving, Modern Pentathlon, Shooting, Softball, Baseball, Steeplechase, Marathon, Discus, Javelin', bunteTuete: { kind: 'hotPotato' } }),
    q(`${v2}-p1-3`, 1, 3, 'ZEHN_VON_ZEHN', { text: 'Welche Band veröffentlichte das Album „The Dark Side of the Moon"?', textEn: 'Which band released the album „The Dark Side of the Moon"?', answer: 'Pink Floyd', options: ['Led Zeppelin', 'Pink Floyd', 'The Rolling Stones'], optionsEn: ['Led Zeppelin', 'Pink Floyd', 'The Rolling Stones'], correctOptionIndex: 1, funFact: 'Hielt sich 741 Wochen in den Billboard 200 — länger als jedes andere Album.' }),
    q(`${v2}-p1-4`, 1, 4, 'CHEESE', { text: 'Welche Filmfigur ist hier zu sehen?', textEn: 'Which movie character is shown here?', answer: 'Yoda', answerEn: 'Yoda' }),
    // Phase 2
    q(`${v2}-p2-0`, 2, 0, 'SCHAETZCHEN', { text: 'Wie lange dauerte der Hundertjährige Krieg in Jahren?', textEn: 'How long did the Hundred Years\' War last in years?', answer: '116', targetValue: 116, unit: 'Jahre', unitEn: 'years', funFact: 'Tatsächlich 116 Jahre — von 1337 bis 1453.' }),
    q(`${v2}-p2-1`, 2, 1, 'MUCHO', { text: 'Welches Land gewann die Fußball-Weltmeisterschaft 2022?', textEn: 'Which country won the FIFA World Cup 2022?', answer: 'Argentinien', options: ['Brasilien', 'Frankreich', 'Argentinien', 'Deutschland'], optionsEn: ['Brazil', 'France', 'Argentina', 'Germany'], correctOptionIndex: 2, funFact: 'Argentiniens dritter WM-Titel und Lionel Messis erster.' }),
    q(`${v2}-p2-2`, 2, 2, 'BUNTE_TUETE', { text: 'Nennt die 5 größten Planeten unseres Sonnensystems.', textEn: 'Name the 5 largest planets in our solar system.', answer: 'Jupiter, Saturn, Uranus, Neptun, Erde', answerEn: 'Jupiter, Saturn, Uranus, Neptune, Earth', bunteTuete: { kind: 'top5', answers: ['Jupiter', 'Saturn', 'Uranus', 'Neptun', 'Erde'], answersEn: ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Earth'] }, funFact: 'In Jupiter würden rund 1.300 Erden hineinpassen — er ist massereicher als alle anderen Planeten zusammen.' }),
    q(`${v2}-p2-3`, 2, 3, 'ZEHN_VON_ZEHN', { text: 'Welche Streamingplattform produzierte „Stranger Things"?', textEn: 'Which streaming platform produced „Stranger Things"?', answer: 'Netflix', options: ['Amazon Prime', 'Disney+', 'Netflix'], optionsEn: ['Amazon Prime', 'Disney+', 'Netflix'], correctOptionIndex: 2, funFact: 'Wurde vor Netflix von 15 anderen Sendern abgelehnt.' }),
    q(`${v2}-p2-4`, 2, 4, 'CHEESE', { text: 'Welches Musikinstrument ist hier zu sehen?', textEn: 'Which musical instrument is shown here?', answer: 'Saxophon', answerEn: 'Saxophone' }),
    // Phase 3
    q(`${v2}-p3-0`, 3, 0, 'SCHAETZCHEN', { text: 'Wie viele Spieler stehen pro Mannschaft beim Eishockey gleichzeitig auf dem Eis (inkl. Torwart)?', textEn: 'How many players per team are on the ice at the same time in ice hockey (including the goalie)?', answer: '6', targetValue: 6, unit: 'Spieler', unitEn: 'players', funFact: 'Im Eishockey-Profibereich werden pro Spiel oft mehr als 30 Spieler eingewechselt.' }),
    q(`${v2}-p3-1`, 3, 1, 'MUCHO', { text: 'Welcher Tennisspieler hält den Rekord für die meisten Grand-Slam-Titel im Herrentennis (Stand 2024)?', textEn: 'Which tennis player holds the record for the most men\'s Grand Slam titles (as of 2024)?', answer: 'Novak Djokovic', options: ['Roger Federer', 'Rafael Nadal', 'Novak Djokovic', 'Pete Sampras'], optionsEn: ['Roger Federer', 'Rafael Nadal', 'Novak Djokovic', 'Pete Sampras'], correctOptionIndex: 2, funFact: 'Stellte 2023 mit seinem 24. Grand-Slam-Titel den Rekord von Margaret Court bei den Frauen ein.' }),
    q(`${v2}-p3-2`, 3, 2, 'BUNTE_TUETE', { text: 'Wo steht die Freiheitsstatue?', textEn: 'Where is the Statue of Liberty?', answer: 'New York City, USA', answerEn: 'New York City, USA', bunteTuete: { kind: 'map', lat: 40.6892, lng: -74.0445, targetLabel: 'Freiheitsstatue, New York' }, funFact: 'Die Freiheitsstatue war 1886 ein Geschenk Frankreichs — ihr grüner Farbton entstand erst über Jahrzehnte durch Oxidation der Kupferhaut.' }),
    q(`${v2}-p3-3`, 3, 3, 'ZEHN_VON_ZEHN', { text: 'Welcher Sänger trägt den Spitznamen „The King of Pop"?', textEn: 'Which singer carries the nickname „The King of Pop"?', answer: 'Michael Jackson', options: ['Elvis Presley', 'Michael Jackson', 'Prince'], optionsEn: ['Elvis Presley', 'Michael Jackson', 'Prince'], correctOptionIndex: 1, funFact: 'Den Titel verlieh ihm Elizabeth Taylor 1989.' }),
    q(`${v2}-p3-4`, 3, 4, 'CHEESE', { text: 'Welches Fußballstadion ist hier zu sehen?', textEn: 'Which football stadium is shown here?', answer: 'Wembley-Stadion', answerEn: 'Wembley Stadium' }),
    // Phase 4
    q(`${v2}-p4-0`, 4, 0, 'SCHAETZCHEN', { text: 'In welchem Jahr veröffentlichte Apple das erste iPhone?', textEn: 'In which year did Apple release the first iPhone?', answer: '2007', targetValue: 2007, funFact: 'Steve Jobs nannte es „drei Geräte in einem" — iPod, Telefon und Internetkommunikator.' }),
    q(`${v2}-p4-1`, 4, 1, 'MUCHO', { text: 'In welcher Stadt steht das Kolosseum?', textEn: 'In which city is the Colosseum located?', answer: 'Rom', options: ['Athen', 'Rom', 'Florenz', 'Pompeji'], optionsEn: ['Athens', 'Rome', 'Florence', 'Pompeii'], correctOptionIndex: 1, funFact: 'Konnte rund 50.000 Zuschauer fassen — und wurde manchmal sogar geflutet für Schiffsschlachten.' }),
    q(`${v2}-p4-2`, 4, 2, 'BUNTE_TUETE', { text: 'Sortiere diese vier Filme nach Erscheinungsjahr, beginnend mit dem ältesten!', textEn: 'Sort these four movies by release year, starting with the oldest!', answer: 'Star Wars, Pulp Fiction, Matrix, Inception', bunteTuete: { kind: 'order', items: ['Pulp Fiction', 'Inception', 'Star Wars', 'Matrix'], itemsEn: ['Pulp Fiction', 'Inception', 'Star Wars', 'The Matrix'], correctOrder: [2, 0, 3, 1], criteria: 'ältester Film zuerst', criteriaEn: 'oldest movie first', itemValues: ['1994', '2010', '1977', '1999'] }, funFact: 'Star Wars hieß bei Erscheinen einfach „Star Wars" — der Untertitel „Episode IV" kam erst 1981 dazu.' }),
    q(`${v2}-p4-3`, 4, 3, 'ZEHN_VON_ZEHN', { text: 'Welcher Hollywoodstar spielte die Hauptrolle in „Mission: Impossible"?', textEn: 'Which Hollywood star played the lead in „Mission: Impossible"?', answer: 'Tom Cruise', options: ['Brad Pitt', 'Tom Cruise', 'Matt Damon'], optionsEn: ['Brad Pitt', 'Tom Cruise', 'Matt Damon'], correctOptionIndex: 1, funFact: 'Macht fast alle seine Stunts selbst — inklusive Sprung vom Burj Khalifa.' }),
    q(`${v2}-p4-4`, 4, 4, 'CHEESE', { text: 'Welches Logo ist hier abgebildet?', textEn: 'Which logo is shown here?', answer: 'Nike', answerEn: 'Nike' }),
  ];

  // ─── VOL. 3 ─────────────────────────────────────────────────────────────
  const v3 = 'qq-vol-3';
  const v3qs = [
    // Phase 1
    q(`${v3}-p1-0`, 1, 0, 'SCHAETZCHEN', { text: 'Wie viele Theaterstücke schrieb William Shakespeare insgesamt (ungefähr)?', textEn: 'How many plays did William Shakespeare write in total (approximately)?', answer: '39', targetValue: 39, unit: 'Theaterstücke', unitEn: 'plays', funFact: 'Shakespeare prägte etwa 1700 neue englische Wörter.' }),
    q(`${v3}-p1-1`, 1, 1, 'MUCHO', { text: 'Welcher römische Kaiser ließ Rom angeblich brennen?', textEn: 'Which Roman emperor allegedly burned Rome down?', answer: 'Nero', options: ['Augustus', 'Caligula', 'Nero', 'Konstantin'], optionsEn: ['Augustus', 'Caligula', 'Nero', 'Constantine'], correctOptionIndex: 2, funFact: 'Historiker bezweifeln heute, dass Nero den Brand legte — er war zur Zeit des Feuers gar nicht in Rom.' }),
    q(`${v3}-p1-2`, 1, 2, 'BUNTE_TUETE', { text: 'Nenne ein Land mit einer Flagge ohne Rot — reihum!', textEn: 'Name a country whose flag has no red — one by one!', answer: 'Argentinien, Bahamas, Botswana, Bosnien und Herzegowina, Brasilien, Estland, Finnland, Griechenland, Israel, Jamaika, Kasachstan, Nigeria, Pakistan, Saudi-Arabien, Schweden, Somalia, Ukraine, Uruguay, Vatikan', answerEn: 'Argentina, Bahamas, Botswana, Bosnia and Herzegovina, Brazil, Estonia, Finland, Greece, Israel, Jamaica, Kazakhstan, Nigeria, Pakistan, Saudi Arabia, Sweden, Somalia, Ukraine, Uruguay, Vatican', bunteTuete: { kind: 'hotPotato' } }),
    q(`${v3}-p1-3`, 1, 3, 'ZEHN_VON_ZEHN', { text: 'Welcher Maler schnitt sich ein Ohr ab?', textEn: 'Which painter cut off his own ear?', answer: 'Vincent van Gogh', options: ['Pablo Picasso', 'Vincent van Gogh', 'Salvador Dalí'], optionsEn: ['Pablo Picasso', 'Vincent van Gogh', 'Salvador Dalí'], correctOptionIndex: 1, funFact: 'Van Gogh schnitt sich nur einen Teil des linken Ohrs ab.' }),
    q(`${v3}-p1-4`, 1, 4, 'CHEESE', { text: 'Welches Gemälde ist hier zu sehen?', textEn: 'Which painting is shown here?', answer: 'Mona Lisa', answerEn: 'Mona Lisa' }),
    // Phase 2
    q(`${v3}-p2-0`, 2, 0, 'SCHAETZCHEN', { text: 'In welchem Jahr begann der Erste Weltkrieg?', textEn: 'In which year did World War I begin?', answer: '1914', targetValue: 1914, funFact: 'Auslöser war das Attentat von Sarajevo am 28. Juni 1914.' }),
    q(`${v3}-p2-1`, 2, 1, 'MUCHO', { text: 'Wer schrieb den Roman „Die Verwandlung"?', textEn: 'Who wrote the novel „The Metamorphosis"?', answer: 'Franz Kafka', options: ['Thomas Mann', 'Franz Kafka', 'Hermann Hesse', 'Bertolt Brecht'], optionsEn: ['Thomas Mann', 'Franz Kafka', 'Hermann Hesse', 'Bertolt Brecht'], correctOptionIndex: 1, funFact: 'Kafka wollte vor seinem Tod, dass alle seine unveröffentlichten Werke verbrannt werden.' }),
    q(`${v3}-p2-2`, 2, 2, 'BUNTE_TUETE', { text: 'Wo liegt Istanbul? Setz einen Pin!', textEn: 'Where is Istanbul? Place a pin!', answer: 'Istanbul', bunteTuete: { kind: 'map', lat: 41.0082, lng: 28.9784, targetLabel: 'Istanbul' }, funFact: 'Istanbul ist die einzige Stadt der Welt, die auf zwei Kontinenten liegt — Europa und Asien.' }),
    q(`${v3}-p2-3`, 2, 3, 'ZEHN_VON_ZEHN', { text: 'Welche antike Kultur baute die Pyramiden von Gizeh?', textEn: 'Which ancient culture built the pyramids of Giza?', answer: 'Ägypter', options: ['Sumerer', 'Ägypter', 'Maya'], optionsEn: ['Sumerians', 'Egyptians', 'Maya'], correctOptionIndex: 1, funFact: 'Die Cheops-Pyramide war über 3800 Jahre lang das höchste Bauwerk der Welt.' }),
    q(`${v3}-p2-4`, 2, 4, 'CHEESE', { text: 'Welcher historische Anführer ist hier abgebildet?', textEn: 'Which historical leader is shown here?', answer: 'Napoleon', answerEn: 'Napoleon' }),
    // Phase 3
    q(`${v3}-p3-0`, 3, 0, 'SCHAETZCHEN', { text: 'Wie viele Tasten hat ein Standardklavier?', textEn: 'How many keys does a standard piano have?', answer: '88', targetValue: 88, unit: 'Tasten', unitEn: 'keys', funFact: '52 weiße + 36 schwarze — diese Anordnung etablierte sich um 1880.' }),
    q(`${v3}-p3-1`, 3, 1, 'MUCHO', { text: 'Wer war die erste Frau, die einen Nobelpreis gewann?', textEn: 'Who was the first woman to win a Nobel Prize?', answer: 'Marie Curie', options: ['Marie Curie', 'Mutter Teresa', 'Dorothy Hodgkin', 'Selma Lagerlöf'], optionsEn: ['Marie Curie', 'Mother Teresa', 'Dorothy Hodgkin', 'Selma Lagerlöf'], correctOptionIndex: 0, funFact: 'Bis heute die einzige Person mit Nobelpreisen in zwei verschiedenen Wissenschaften — Physik und Chemie.' }),
    q(`${v3}-p3-2`, 3, 2, 'BUNTE_TUETE', { text: 'Nennt die 5 Ozeane der Erde.', textEn: 'Name the 5 oceans of the Earth.', answer: 'Pazifik, Atlantik, Indischer Ozean, Südpolarmeer, Arktischer Ozean', answerEn: 'Pacific, Atlantic, Indian, Southern, Arctic', bunteTuete: { kind: 'top5', answers: ['Pazifik', 'Atlantik', 'Indischer Ozean', 'Südpolarmeer', 'Arktischer Ozean'], answersEn: ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Southern Ocean', 'Arctic Ocean'], aliases: [['Pazifischer Ozean', 'Stiller Ozean'], ['Atlantischer Ozean'], ['Indik'], ['Antarktischer Ozean', 'Antarktik'], ['Nordpolarmeer', 'Arktik']] }, funFact: 'Das Südpolarmeer (Antarktischer Ozean) wurde erst 2000 offiziell als fünfter Ozean anerkannt.' }),
    q(`${v3}-p3-3`, 3, 3, 'ZEHN_VON_ZEHN', { text: 'Welche Sprache wird im Vatikan offiziell gesprochen?', textEn: 'Which language is officially spoken in the Vatican?', answer: 'Latein', options: ['Italienisch', 'Latein', 'Französisch'], optionsEn: ['Italian', 'Latin', 'French'], correctOptionIndex: 1, funFact: 'Sogar Geldautomaten zeigen Latein an.' }),
    q(`${v3}-p3-4`, 3, 4, 'CHEESE', { text: 'Welches berühmte Bauwerk ist hier zu sehen?', textEn: 'Which famous landmark is shown here?', answer: 'Akropolis', answerEn: 'Acropolis' }),
    // Phase 4
    q(`${v3}-p4-0`, 4, 0, 'SCHAETZCHEN', { text: 'Wie viele Zeilen hat ein klassisches Sonett?', textEn: 'How many lines does a classic sonnet have?', answer: '14', targetValue: 14, unit: 'Zeilen', unitEn: 'lines', funFact: 'Petrarca schrieb 366 Sonette an seine Geliebte Laura.' }),
    q(`${v3}-p4-1`, 4, 1, 'MUCHO', { text: 'Welche Königin Ägyptens hatte Beziehungen zu Julius Cäsar und Marcus Antonius?', textEn: 'Which Queen of Egypt had relationships with both Julius Caesar and Mark Antony?', answer: 'Kleopatra', options: ['Nofretete', 'Hatschepsut', 'Kleopatra', 'Isis'], optionsEn: ['Nefertiti', 'Hatshepsut', 'Cleopatra', 'Isis'], correctOptionIndex: 2, funFact: 'Kleopatra lebte näher an der Mondlandung als am Bau der Pyramiden.' }),
    q(`${v3}-p4-2`, 4, 2, 'BUNTE_TUETE', { text: 'Sortiert diese Datenmengen von klein nach groß.', textEn: 'Sort these data sizes from smallest to largest.', answer: 'Kilobyte, Megabyte, Gigabyte, Terabyte', answerEn: 'Kilobyte, Megabyte, Gigabyte, Terabyte', bunteTuete: { kind: 'order', items: ['Gigabyte', 'Kilobyte', 'Terabyte', 'Megabyte'], itemsEn: ['Gigabyte', 'Kilobyte', 'Terabyte', 'Megabyte'], correctOrder: [1, 3, 0, 2], criteria: 'von klein nach groß', criteriaEn: 'smallest to largest', itemValues: ['10⁹ Byte', '10³ Byte', '10¹² Byte', '10⁶ Byte'] }, funFact: 'Jede Stufe ist das 1.000-Fache der vorigen: ein Terabyte entspricht rund einer Milliarde Kilobyte.' }),
    q(`${v3}-p4-3`, 4, 3, 'ZEHN_VON_ZEHN', { text: 'Welcher griechische Philosoph war Schüler von Sokrates und Lehrer von Aristoteles?', textEn: 'Which Greek philosopher was a student of Socrates and teacher of Aristotle?', answer: 'Platon', options: ['Platon', 'Pythagoras', 'Epikur'], optionsEn: ['Plato', 'Pythagoras', 'Epicurus'], correctOptionIndex: 0, funFact: 'Platons echter Name war Aristokles — „Platon" („der Breite") war ein Spitzname.' }),
    q(`${v3}-p4-4`, 4, 4, 'CHEESE', { text: 'Welche Skulptur ist hier abgebildet?', textEn: 'Which sculpture is shown here?', answer: 'Der Denker', answerEn: 'The Thinker' }),
  ];

  // ─── VOL. 4 ─────────────────────────────────────────────────────────────
  const v4 = 'qq-vol-4';
  const v4qs = [
    // Phase 1
    q(`${v4}-p1-0`, 1, 0, 'SCHAETZCHEN', { text: 'Wie viele Tasten hat eine Standard-QWERTZ-Tastatur (deutsche Variante, ohne Numpad)?', textEn: 'How many keys does a standard QWERTZ keyboard have (German layout, without numpad)?', answer: '87', targetValue: 87, unit: 'Tasten', unitEn: 'keys', funFact: 'Die QWERTZ-Anordnung wurde 1868 erfunden — angeblich um Hebel-Verhakungen zu verhindern.' }),
    q(`${v4}-p1-1`, 1, 1, 'MUCHO', { text: 'Wer gilt als Erfinder der Glühbirne (in der modernen, kommerziell erfolgreichen Form)?', textEn: 'Who is considered the inventor of the light bulb (modern, commercially successful form)?', answer: 'Thomas Edison', options: ['Nikola Tesla', 'Thomas Edison', 'Alessandro Volta', 'Werner von Siemens'], optionsEn: ['Nikola Tesla', 'Thomas Edison', 'Alessandro Volta', 'Werner von Siemens'], correctOptionIndex: 1, funFact: 'Edison probierte über 6000 Materialien als Glühfaden aus.' }),
    q(`${v4}-p1-2`, 1, 2, 'BUNTE_TUETE', { text: 'Wo liegt der Eiffelturm?', textEn: 'Where is the Eiffel Tower?', answer: 'Paris, Frankreich', answerEn: 'Paris, France', bunteTuete: { kind: 'map', lat: 48.8584, lng: 2.2945, targetLabel: 'Eiffelturm, Paris' }, funFact: 'Der Eiffelturm war als temporäres Bauwerk für die Weltausstellung 1889 gedacht und sollte nach 20 Jahren wieder abgerissen werden.' }),
    q(`${v4}-p1-3`, 1, 3, 'ZEHN_VON_ZEHN', { text: 'Welche Programmiersprache wurde nach einer britischen Comedy-Truppe benannt?', textEn: 'Which programming language was named after a British comedy troupe?', answer: 'Python', options: ['Java', 'Python', 'Ruby'], optionsEn: ['Java', 'Python', 'Ruby'], correctOptionIndex: 1, funFact: 'Erfinder Guido van Rossum benannte Python nach „Monty Python\'s Flying Circus".' }),
    q(`${v4}-p1-4`, 1, 4, 'CHEESE', { text: 'Welches Gewürz ist hier zu sehen?', textEn: 'Which spice is shown here?', answer: 'Zimt', answerEn: 'Cinnamon' }),
    // Phase 2
    q(`${v4}-p2-0`, 2, 0, 'SCHAETZCHEN', { text: 'Wie viele Megabyte hat 1 Gigabyte (offiziell, dezimal)?', textEn: 'How many megabytes are in 1 gigabyte (official, decimal)?', answer: '1000', targetValue: 1000, unit: 'MB', funFact: 'Die erste kommerzielle Festplatte (IBM 1956) wog über eine Tonne und speicherte 5 MB.' }),
    q(`${v4}-p2-1`, 2, 1, 'MUCHO', { text: 'Welche Firma entwickelte das Betriebssystem Windows?', textEn: 'Which company developed the Windows operating system?', answer: 'Microsoft', options: ['Apple', 'IBM', 'Microsoft', 'Intel'], optionsEn: ['Apple', 'IBM', 'Microsoft', 'Intel'], correctOptionIndex: 2, funFact: 'Bill Gates und Paul Allen gründeten Microsoft 1975 — beide hatten ihr Studium dafür abgebrochen.' }),
    q(`${v4}-p2-2`, 2, 2, 'BUNTE_TUETE', { text: 'Nennt die 5 Großen Seen Nordamerikas.', textEn: 'Name the 5 Great Lakes of North America.', answer: 'Oberer See, Michigansee, Huronsee, Eriesee, Ontariosee', answerEn: 'Superior, Michigan, Huron, Erie, Ontario', bunteTuete: { kind: 'top5', answers: ['Oberer See', 'Michigansee', 'Huronsee', 'Eriesee', 'Ontariosee'], answersEn: ['Lake Superior', 'Lake Michigan', 'Lake Huron', 'Lake Erie', 'Lake Ontario'], aliases: [['Lake Superior'], ['Lake Michigan'], ['Lake Huron'], ['Lake Erie'], ['Lake Ontario']] }, funFact: 'Eselsbrücke „HOMES": Huron, Ontario, Michigan, Erie, Superior. Zusammen halten sie rund 21 % des flüssigen Süßwassers der Erde.' }),
    q(`${v4}-p2-3`, 2, 3, 'ZEHN_VON_ZEHN', { text: 'Welche Firma stellt den Suchmaschinen-Marktführer Google her?', textEn: 'Which company owns the market-leading search engine Google?', answer: 'Alphabet', options: ['Meta', 'Alphabet', 'Amazon'], optionsEn: ['Meta', 'Alphabet', 'Amazon'], correctOptionIndex: 1, funFact: 'Google hieß ursprünglich „BackRub" — und wurde nach „Googol" umbenannt, der Zahl mit 100 Nullen.' }),
    q(`${v4}-p2-4`, 2, 4, 'CHEESE', { text: 'Welches Werkzeug ist hier abgebildet?', textEn: 'Which tool is shown here?', answer: 'Schraubenschlüssel', answerEn: 'Wrench' }),
    // Phase 3
    q(`${v4}-p3-0`, 3, 0, 'SCHAETZCHEN', { text: 'Wie viele Pizzen werden in Italien jährlich pro Person konsumiert (Durchschnitt)?', textEn: 'How many pizzas does an average person in Italy consume per year?', answer: '30', targetValue: 30, unit: 'Pizzen', unitEn: 'pizzas', funFact: 'Die Pizza Margherita wurde 1889 für Königin Margherita von Savoyen kreiert.' }),
    q(`${v4}-p3-1`, 3, 1, 'MUCHO', { text: 'Aus welcher Pflanze wird Schokolade hergestellt?', textEn: 'From which plant is chocolate made?', answer: 'Kakaobohne', options: ['Kaffeebohne', 'Kakaobohne', 'Sojabohne', 'Vanilleschote'], optionsEn: ['Coffee bean', 'Cocoa bean', 'Soybean', 'Vanilla pod'], correctOptionIndex: 1, funFact: 'Die Azteken nutzten Kakaobohnen als Zahlungsmittel.' }),
    q(`${v4}-p3-2`, 3, 2, 'BUNTE_TUETE', { text: 'Sortiere diese vier Erfindungen nach Erfindungsjahr, beginnend mit der ältesten!', textEn: 'Sort these four inventions by year, starting with the oldest!', answer: 'Buchdruck, Telefon, Fernsehen, Internet', answerEn: 'Printing press, Telephone, Television, Internet', bunteTuete: { kind: 'order', items: ['Telefon', 'Internet', 'Buchdruck', 'Fernsehen'], itemsEn: ['Telephone', 'Internet', 'Printing press', 'Television'], correctOrder: [2, 0, 3, 1], criteria: 'älteste zuerst', criteriaEn: 'oldest first', itemValues: ['1876', '1969', '~1450', '1925'] }, funFact: 'Gutenbergs Buchdruck war in China schon 400 Jahre früher bekannt — wurde dort aber nie populär.' }),
    q(`${v4}-p3-3`, 3, 3, 'ZEHN_VON_ZEHN', { text: 'Welches Land ist Heimat des Käses Camembert?', textEn: 'Which country is the home of Camembert cheese?', answer: 'Frankreich', options: ['Italien', 'Schweiz', 'Frankreich'], optionsEn: ['Italy', 'Switzerland', 'France'], correctOptionIndex: 2, funFact: 'Camembert wurde 1791 in der Normandie erfunden.' }),
    q(`${v4}-p3-4`, 3, 4, 'CHEESE', { text: 'Welche Frucht ist hier zu sehen?', textEn: 'Which fruit is shown here?', answer: 'Drachenfrucht', answerEn: 'Dragon fruit' }),
    // Phase 4
    q(`${v4}-p4-0`, 4, 0, 'SCHAETZCHEN', { text: 'Wie viele Sprachen werden weltweit ungefähr gesprochen?', textEn: 'Approximately how many languages are spoken worldwide?', answer: '7000', targetValue: 7000, unit: 'Sprachen', unitEn: 'languages', funFact: 'Etwa 40 % aller Sprachen gelten als bedroht — alle zwei Wochen stirbt eine aus.' }),
    q(`${v4}-p4-1`, 4, 1, 'MUCHO', { text: 'In welchem Land wurde der Espresso erfunden?', textEn: 'In which country was espresso invented?', answer: 'Italien', options: ['Frankreich', 'Italien', 'Spanien', 'Türkei'], optionsEn: ['France', 'Italy', 'Spain', 'Turkey'], correctOptionIndex: 1, funFact: 'Die erste Espressomaschine wurde 1884 in Turin patentiert.' }),
    q(`${v4}-p4-2`, 4, 2, 'BUNTE_TUETE', { text: 'Nenne eine der 5 bevölkerungsreichsten Städte der Welt (Stand 2024, Metropolregion)!', textEn: 'Name one of the 5 most populous cities in the world (as of 2024, metropolitan area)!', answer: 'Tokio, Delhi, Shanghai, São Paulo, Mexiko-Stadt', answerEn: 'Tokyo, Delhi, Shanghai, São Paulo, Mexico City', bunteTuete: { kind: 'top5', answers: ['Tokio', 'Delhi', 'Shanghai', 'São Paulo', 'Mexiko-Stadt'], answersEn: ['Tokyo', 'Delhi', 'Shanghai', 'São Paulo', 'Mexico City'] }, funFact: 'In Tokios Metropolregion leben rund 37 Millionen Menschen — mehr als in ganz Kanada.' }),
    q(`${v4}-p4-3`, 4, 3, 'ZEHN_VON_ZEHN', { text: 'Welches Tier ist das schnellste an Land?', textEn: 'Which animal is the fastest on land?', answer: 'Gepard', options: ['Löwe', 'Gepard', 'Pferd'], optionsEn: ['Lion', 'Cheetah', 'Horse'], correctOptionIndex: 1, funFact: 'Geparde erreichen bis zu 110 km/h — können diese Geschwindigkeit aber nur 20–30 Sekunden lang halten.' }),
    q(`${v4}-p4-4`, 4, 4, 'CHEESE', { text: 'Welches Verkehrsmittel ist hier abgebildet?', textEn: 'Which means of transport is shown here?', answer: 'Heißluftballon', answerEn: 'Hot air balloon' }),
  ];

  // ─── VOL. 5 ─────────────────────────────────────────────────────────────
  const v5 = 'qq-vol-5';
  const v5qs = [
    // Phase 1
    q(`${v5}-p1-0`, 1, 0, 'SCHAETZCHEN', { text: 'Wie viele Felder hat ein Schachbrett?', textEn: 'How many squares does a chess board have?', answer: '64', targetValue: 64, unit: 'Felder', unitEn: 'squares', funFact: 'Es gibt mehr mögliche Schachpartien als Atome im beobachtbaren Universum.' }),
    q(`${v5}-p1-1`, 1, 1, 'MUCHO', { text: 'In welcher Sportart wird der Begriff „Birdie" verwendet?', textEn: 'In which sport is the term „birdie" used?', answer: 'Golf', options: ['Tennis', 'Golf', 'Bowling', 'Cricket'], optionsEn: ['Tennis', 'Golf', 'Bowling', 'Cricket'], correctOptionIndex: 1, funFact: '„Birdie" entstand um 1899 in den USA — „Bird" war damals Slang für „großartig".' }),
    q(`${v5}-p1-2`, 1, 2, 'BUNTE_TUETE', { text: 'Wo steht die Christusstatue Cristo Redentor?', textEn: 'Where is the Christ the Redeemer statue?', answer: 'Rio de Janeiro, Brasilien', answerEn: 'Rio de Janeiro, Brazil', bunteTuete: { kind: 'map', lat: -22.9519, lng: -43.2105, targetLabel: 'Cristo Redentor, Rio de Janeiro' }, funFact: 'Die 38 Meter hohe Statue auf dem Corcovado wurde 1931 eingeweiht und 2007 zu einem der neuen sieben Weltwunder gewählt.' }),
    q(`${v5}-p1-3`, 1, 3, 'ZEHN_VON_ZEHN', { text: 'Welche Sportart wird mit einem Schläger und einem Federball gespielt?', textEn: 'Which sport is played with a racket and a shuttlecock?', answer: 'Badminton', options: ['Tennis', 'Squash', 'Badminton'], optionsEn: ['Tennis', 'Squash', 'Badminton'], correctOptionIndex: 2, funFact: 'Federbälle erreichen beim Profi-Badminton über 400 km/h — schneller als bei jeder anderen Schlägersportart.' }),
    q(`${v5}-p1-4`, 1, 4, 'CHEESE', { text: 'Welcher Sportler ist hier zu sehen?', textEn: 'Which athlete is shown here?', answer: 'Usain Bolt', answerEn: 'Usain Bolt' }),
    // Phase 2
    q(`${v5}-p2-0`, 2, 0, 'SCHAETZCHEN', { text: 'Wie viele Spieler stehen pro Mannschaft beim Volleyball gleichzeitig auf dem Feld?', textEn: 'How many players per team are on the court at the same time in volleyball?', answer: '6', targetValue: 6, unit: 'Spieler', unitEn: 'players', funFact: 'Volleyball wurde 1895 in den USA als sanftere Alternative zu Basketball erfunden.' }),
    q(`${v5}-p2-1`, 2, 1, 'MUCHO', { text: 'In welchem Land wurde Judo erfunden?', textEn: 'In which country was judo invented?', answer: 'Japan', options: ['China', 'Japan', 'Korea', 'Thailand'], optionsEn: ['China', 'Japan', 'Korea', 'Thailand'], correctOptionIndex: 1, funFact: 'Judo bedeutet wörtlich „sanfter Weg" — Erfinder Jigorō Kanō wollte 1882 eine weniger gefährliche Form des Jiu-Jitsu schaffen.' }),
    q(`${v5}-p2-2`, 2, 2, 'BUNTE_TUETE', { text: 'Nenne eines der 5 schwersten Landtiere der Welt!', textEn: 'Name one of the 5 heaviest land animals!', answer: 'Afrikanischer Elefant, Asiatischer Elefant, Flusspferd, Breitmaulnashorn, Giraffe', answerEn: 'African elephant, Asian elephant, Hippopotamus, White rhinoceros, Giraffe', bunteTuete: { kind: 'top5', answers: ['Afrikanischer Elefant', 'Asiatischer Elefant', 'Flusspferd', 'Breitmaulnashorn', 'Giraffe'], answersEn: ['African elephant', 'Asian elephant', 'Hippopotamus', 'White rhinoceros', 'Giraffe'] }, funFact: 'Ein ausgewachsener Afrikanischer Elefantenbulle kann bis zu 6 Tonnen wiegen.' }),
    q(`${v5}-p2-3`, 2, 3, 'ZEHN_VON_ZEHN', { text: 'Welches ist das größte Säugetier der Welt?', textEn: 'What is the largest mammal in the world?', answer: 'Blauwal', options: ['Afrikanischer Elefant', 'Pottwal', 'Blauwal'], optionsEn: ['African elephant', 'Sperm whale', 'Blue whale'], correctOptionIndex: 2, funFact: 'Das Herz eines Blauwals wiegt allein rund 180 kg.' }),
    q(`${v5}-p2-4`, 2, 4, 'CHEESE', { text: 'Welche Pflanze ist hier zu sehen?', textEn: 'Which plant is shown here?', answer: 'Sonnenblume', answerEn: 'Sunflower' }),
    // Phase 3
    q(`${v5}-p3-0`, 3, 0, 'SCHAETZCHEN', { text: 'Wie viele Minuten dauert ein offizielles Fußballspiel (reine Spielzeit, ohne Nachspielzeit)?', textEn: 'How many minutes does an official football match last (regulation time)?', answer: '90', targetValue: 90, unit: 'Minuten', unitEn: 'minutes', funFact: 'Die längste Nachspielzeit in einem WM-Spiel betrug 14 Minuten — Iran gegen England 2022.' }),
    q(`${v5}-p3-1`, 3, 1, 'MUCHO', { text: 'Welches Gas atmen Pflanzen für die Photosynthese ein?', textEn: 'Which gas do plants take in for photosynthesis?', answer: 'Kohlendioxid', options: ['Sauerstoff', 'Stickstoff', 'Kohlendioxid', 'Methan'], optionsEn: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Methane'], correctOptionIndex: 2, funFact: 'Eine ausgewachsene Buche produziert ~5 kg Sauerstoff pro Tag — genug für rund 10 Menschen.' }),
    q(`${v5}-p3-2`, 3, 2, 'BUNTE_TUETE', { text: 'Sortiere diese vier Berge nach Höhe, beginnend mit dem höchsten!', textEn: 'Sort these four mountains by height, starting with the highest!', answer: 'Mont Blanc, Matterhorn, Großglockner, Zugspitze', bunteTuete: { kind: 'order', items: ['Großglockner', 'Zugspitze', 'Mont Blanc', 'Matterhorn'], itemsEn: ['Grossglockner', 'Zugspitze', 'Mont Blanc', 'Matterhorn'], correctOrder: [2, 3, 0, 1], criteria: 'höchster zuerst', criteriaEn: 'tallest first', itemValues: ['3798 m', '2962 m', '4810 m', '4478 m'] }, funFact: 'Das Matterhorn wurde erst 1865 erstbestiegen — vier der sieben Erstbesteiger starben beim Abstieg.' }),
    q(`${v5}-p3-3`, 3, 3, 'ZEHN_VON_ZEHN', { text: 'In welcher Sportart spielen die „New York Yankees"?', textEn: 'In which sport do the „New York Yankees" play?', answer: 'Baseball', options: ['Baseball', 'Basketball', 'American Football'], optionsEn: ['Baseball', 'Basketball', 'American football'], correctOptionIndex: 0, funFact: 'Die Yankees haben 27 World-Series-Titel gewonnen — mehr als jedes andere Team in der MLB.' }),
    q(`${v5}-p3-4`, 3, 4, 'CHEESE', { text: 'Welcher Wissenschaftler ist hier abgebildet?', textEn: 'Which scientist is shown here?', answer: 'Albert Einstein', answerEn: 'Albert Einstein' }),
    // Phase 4
    q(`${v5}-p4-0`, 4, 0, 'SCHAETZCHEN', { text: 'Wie schnell ist die Lichtgeschwindigkeit ungefähr (in Kilometern pro Sekunde)?', textEn: 'How fast is the speed of light approximately (in kilometers per second)?', answer: '299792', targetValue: 299792, unit: 'km/s', funFact: 'Sonnenlicht braucht etwa 8 Minuten und 20 Sekunden, um zur Erde zu gelangen.' }),
    q(`${v5}-p4-1`, 4, 1, 'MUCHO', { text: 'Wer hält den 100-Meter-Sprint-Weltrekord der Männer (Stand 2024)?', textEn: 'Who holds the men\'s 100-meter sprint world record (as of 2024)?', answer: 'Usain Bolt', options: ['Carl Lewis', 'Usain Bolt', 'Yohan Blake', 'Tyson Gay'], optionsEn: ['Carl Lewis', 'Usain Bolt', 'Yohan Blake', 'Tyson Gay'], correctOptionIndex: 1, funFact: 'Bolts Weltrekord von 9,58 Sekunden steht seit der WM 2009 in Berlin.' }),
    q(`${v5}-p4-2`, 4, 2, 'BUNTE_TUETE', { text: 'Sortiert diese Epochen chronologisch — älteste zuerst.', textEn: 'Put these eras in chronological order — oldest first.', answer: 'Antike, Mittelalter, Renaissance, Moderne', answerEn: 'Antiquity, Middle Ages, Renaissance, Modern era', bunteTuete: { kind: 'order', items: ['Renaissance', 'Antike', 'Moderne', 'Mittelalter'], itemsEn: ['Renaissance', 'Antiquity', 'Modern era', 'Middle Ages'], correctOrder: [1, 3, 0, 2], criteria: 'chronologisch (älteste zuerst)', criteriaEn: 'chronological (oldest first)', itemValues: ['ab ~1400', 'bis ~500', 'ab ~1800', '~500–1500'] }, funFact: 'Die Renaissance („Wiedergeburt") knüpfte bewusst an die Antike an und läutete den Übergang vom Mittelalter zur Neuzeit ein.' }),
    q(`${v5}-p4-3`, 4, 3, 'ZEHN_VON_ZEHN', { text: 'Welche Naturgewalt misst die Richterskala?', textEn: 'Which natural phenomenon does the Richter scale measure?', answer: 'Erdbeben', options: ['Erdbeben', 'Wirbelstürme', 'Vulkanausbrüche'], optionsEn: ['Earthquakes', 'Hurricanes', 'Volcanic eruptions'], correctOptionIndex: 0, funFact: 'Die Richterskala ist logarithmisch — Stärke 7 setzt rund 32-mal mehr Energie frei als Stärke 6.' }),
    q(`${v5}-p4-4`, 4, 4, 'CHEESE', { text: 'Welcher Vogel ist hier zu sehen?', textEn: 'Which bird is shown here?', answer: 'Flamingo', answerEn: 'Flamingo' }),
  ];

  // ─── PITCH-DEMO ─────────────────────────────────────────────────────────
  // 2026-07-05: Kurzes 2-Runden-Set fuer den Cafe-Pitch. Leicht + Publikums-
  // freundlich (die Zuschauer sollen sich schlau fuehlen), alle 5 Mechaniken
  // einmal, damit die Vielfalt sofort sichtbar ist. CHEESE nutzt stabile
  // Wikimedia-Bilder (im Builder gegen cafe-eigene Fotos tauschbar).
  const pd = 'qq-pitch-demo';
  const pdqs = [
    // Runde 1 — Aufwaermen
    q(`${pd}-p1-0`, 1, 0, 'SCHAETZCHEN', { text: 'Wie viele Bundesländer hat Deutschland?', textEn: 'How many states does Germany have?', answer: '16', targetValue: 16, unit: 'Länder', unitEn: 'states', funFact: 'Das kleinste ist Bremen, das größte Bayern.' }),
    q(`${pd}-p1-1`, 1, 1, 'MUCHO', { text: 'In welcher Stadt steht das Brandenburger Tor?', textEn: 'In which city is the Brandenburg Gate?', answer: 'Berlin', options: ['Hamburg', 'Berlin', 'München', 'Köln'], optionsEn: ['Hamburg', 'Berlin', 'Munich', 'Cologne'], correctOptionIndex: 1, funFact: 'Das Brandenburger Tor wurde 1791 vollendet — nach dem Vorbild der Athener Akropolis.' }),
    // 2026-07-20 (Wolf): war hotPotato → jetzt crowdTop (Top-Antworten). Nicht
    // geloescht, sondern umgestellt: die Phasen-Mathematik rechnet fest mit 5
    // Fragen je Runde, ein Loeschen haette die Runde auf 4 verkuerzt. crowdTop
    // passt inhaltlich 1:1 („nenne EIN Getraenk") und fehlte dem Pitch noch
    // (top5 sitzt schon in R2.3).
    q(`${pd}-p1-2`, 1, 2, 'BUNTE_TUETE', { text: 'Nenne EIN Getränk, das man in einer Bar bestellt.', textEn: 'Name ONE drink you order at a bar.', answer: 'Bier, Wein, Cola, Wasser, Gin Tonic, Aperol Spritz', answerEn: 'Beer, Wine, Cola, Water, Gin and tonic, Aperol Spritz', bunteTuete: { kind: 'crowdTop', answers: [
      { label: 'Bier', labelEn: 'Beer', aliases: ['Pils', 'Helles', 'Weizen'], aliasesEn: ['Lager', 'Ale'] },
      { label: 'Wein', labelEn: 'Wine', aliases: ['Weißwein', 'Rotwein'], aliasesEn: ['White wine', 'Red wine'] },
      { label: 'Cola', labelEn: 'Cola', aliases: ['Coca Cola'], aliasesEn: ['Coke'] },
      { label: 'Wasser', labelEn: 'Water', aliases: ['Mineralwasser'], aliasesEn: ['Sparkling water'] },
      { label: 'Gin Tonic', labelEn: 'Gin and tonic', aliases: ['Gin'], aliasesEn: ['Gin'] },
      { label: 'Aperol Spritz', labelEn: 'Aperol Spritz', aliases: ['Aperol'], aliasesEn: ['Aperol'] },
    ] }, funFact: 'Der wohl älteste Cocktail der Welt ist der Sazerac — erfunden Mitte des 19. Jahrhunderts in New Orleans.' }),
    q(`${pd}-p1-3`, 1, 3, 'ZEHN_VON_ZEHN', { text: 'Welches Tier ist bekannt für seinen sehr langen Hals?', textEn: 'Which animal is known for its very long neck?', answer: 'Giraffe', options: ['Elefant', 'Giraffe', 'Zebra'], optionsEn: ['Elephant', 'Giraffe', 'Zebra'], correctOptionIndex: 1, funFact: 'Eine Giraffe hat trotz des langen Halses genau 7 Halswirbel — genau wie der Mensch.' }),
    q(`${pd}-p1-4`, 1, 4, 'CHEESE', { text: 'Welches Bauwerk ist hier zu sehen?', textEn: 'Which landmark is shown here?', answer: 'Eiffelturm', answerEn: 'Eiffel Tower', image: { url: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg', layout: 'fullscreen' as const, animation: 'none' as const }, funFact: 'Der Eiffelturm war als temporäres Bauwerk für die Weltausstellung 1889 gedacht.' }),
    // Runde 2 — Finale
    q(`${pd}-p2-0`, 2, 0, 'SCHAETZCHEN', { text: 'Wie viele Tasten hat ein Standardklavier?', textEn: 'How many keys does a standard piano have?', answer: '88', targetValue: 88, unit: 'Tasten', unitEn: 'keys', funFact: '52 weiße und 36 schwarze Tasten.' }),
    q(`${pd}-p2-1`, 2, 1, 'MUCHO', { text: 'Welches Land wurde 2014 Fußball-Weltmeister?', textEn: 'Which country won the 2014 FIFA World Cup?', answer: 'Deutschland', options: ['Brasilien', 'Deutschland', 'Argentinien', 'Spanien'], optionsEn: ['Brazil', 'Germany', 'Argentina', 'Spain'], correctOptionIndex: 1, funFact: 'Das Finale gegen Argentinien entschied Mario Götze in der Verlängerung.' }),
    q(`${pd}-p2-2`, 2, 2, 'BUNTE_TUETE', { text: 'Nennt die 5 größten Planeten unseres Sonnensystems.', textEn: 'Name the 5 largest planets in our solar system.', answer: 'Jupiter, Saturn, Uranus, Neptun, Erde', answerEn: 'Jupiter, Saturn, Uranus, Neptune, Earth', bunteTuete: { kind: 'top5', answers: ['Jupiter', 'Saturn', 'Uranus', 'Neptun', 'Erde'], answersEn: ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Earth'] }, funFact: 'In Jupiter würden rund 1.300 Erden hineinpassen.' }),
    q(`${pd}-p2-3`, 2, 3, 'ZEHN_VON_ZEHN', { text: 'Welcher Fluss fließt durch Paris?', textEn: 'Which river flows through Paris?', answer: 'Seine', options: ['Seine', 'Rhein', 'Themse'], optionsEn: ['Seine', 'Rhine', 'Thames'], correctOptionIndex: 0, funFact: 'Über die Seine führen in Paris 37 Brücken.' }),
    q(`${pd}-p2-4`, 2, 4, 'CHEESE', { text: 'Welches Tier ist hier zu sehen?', textEn: 'Which animal is shown here?', answer: 'Panda', answerEn: 'Panda', image: { url: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Grosser_Panda.JPG', layout: 'fullscreen' as const, animation: 'none' as const }, funFact: 'Ein Großer Panda frisst bis zu 38 kg Bambus pro Tag.' }),
  ];

  return [
    // 2026-07-05: Pitch-Demo zuerst (oben im Draft-Picker, schnell zu finden).
    { id: pd, title: '✨ Pitch-Demo · Café (2 Runden)', phases: 2 as const, language: 'both', questions: pdqs, createdAt: now, updatedAt: now },
    // 2026-05-06 (Wolf 'gerade in allen Allgemeinwissen-Drafts gleich'):
    // Pro Draft eigenes 4×4-Connections-Set damit das Finale unterschiedlich
    // ist. Default-FALLBACK (Kaffee/Programmiersprachen/Edelsteine/Apple)
    // bleibt aber als 5tes Set in Vol. 5 erhalten — passt thematisch.
    { id: v1, title: '🧠 Allgemeinwissen Vol. 1', phases: 4 as const, language: 'both', questions: v1qs, connections: CONNECTIONS_PUB_KLASSIKER, createdAt: now - 5000, updatedAt: now - 5000 },
    { id: v2, title: '🧠 Allgemeinwissen Vol. 2', phases: 4 as const, language: 'both', questions: v2qs, connections: CONNECTIONS_NEUNZIGER, createdAt: now - 4000, updatedAt: now - 4000 },
    { id: v3, title: '🧠 Allgemeinwissen Vol. 3', phases: 4 as const, language: 'both', questions: v3qs, connections: CONNECTIONS_GROSSES_KARO, createdAt: now - 3000, updatedAt: now - 3000 },
    { id: v4, title: '🧠 Allgemeinwissen Vol. 4', phases: 4 as const, language: 'both', questions: v4qs, connections: CONNECTIONS_SUESS_SAUER, createdAt: now - 2000, updatedAt: now - 2000 },
    { id: v5, title: '🧠 Allgemeinwissen Vol. 5', phases: 4 as const, language: 'both', questions: v5qs, createdAt: now - 1000, updatedAt: now - 1000 },
  ];
}


// Load persisted QQ drafts on startup
try {
  if (fs.existsSync(qqDraftsPath)) {
    const loaded = JSON.parse(fs.readFileSync(qqDraftsPath, 'utf-8'));
    if (Array.isArray(loaded)) qqDrafts = loaded;
    // 2026-09-05: Wissensgebiete nachtragen, falls die Datei aus einer Zeit
    // stammt, in der es sie noch nicht gab. Nur fehlende, nie ueberschreiben.
    if (ergaenzeFragenThemen(qqDrafts) > 0) persistQQDrafts();
  }
} catch {
  console.error('Fehler beim Laden von qqDrafts.json');
}

// Seed sample drafts if none exist
if (qqDrafts.length === 0) {
  qqDrafts = createSampleQQDrafts();
  ergaenzeFragenThemen(qqDrafts);
  persistQQDrafts();
}

// 2026-05-01: Extra-Test-Drafts (Harry Potter, Hamburg) mergen.
// File-only Drafts werden in /api/qq/drafts ohnehin nach DB synced
// (siehe Line ~8300), also reicht's hier qqDrafts in-memory zu erweitern.
{
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { QQ_EXTRA_TEST_DRAFTS } = require('./data/qqExtraTestDrafts') as {
    QQ_EXTRA_TEST_DRAFTS: typeof qqDrafts;
  };
  const existingIds = new Set(qqDrafts.map((d) => d.id));
  const missing = QQ_EXTRA_TEST_DRAFTS.filter((d) => !existingIds.has(d.id));
  if (missing.length > 0) {
    qqDrafts = [...qqDrafts, ...missing];
    console.log(`[seed-qq] ${missing.length} Extra-Test-Drafts geladen (${missing.map((d) => d.id).join(', ')})`);
  }
}

// 2026-07-05: Pitch-Demo-Draft sicherstellen. Neuer Draft `qq-pitch-demo`
// erscheint auf Live-Servern mit bestehender File/DB nicht ueber den
// length===0-Seed (und die qq-vol-*-Migrationen fassen ihn nicht an). Idempotent
// aus dem Source einfuegen — GET /api/qq/drafts synct file-only Drafts in die DB.
{
  if (!qqDrafts.some((d) => d.id === 'qq-pitch-demo')) {
    const pitch = createSampleQQDrafts().find((d) => d.id === 'qq-pitch-demo');
    if (pitch) {
      qqDrafts = [pitch, ...qqDrafts];
      persistQQDrafts();
      console.log('[seed-qq] Pitch-Demo-Draft (qq-pitch-demo) hinzugefuegt');
    }
  }
}

// Migrate: mark the 4 newer sample drafts with 🆕 if not already tagged
{
  const newIds = ['qq-sample-hamburg', 'qq-sample-natur-tiere', 'qq-sample-sport', 'qq-sample-essen-trinken'];
  let changed = false;
  for (const d of qqDrafts) {
    if (newIds.includes(d.id) && !d.title.startsWith('🆕')) {
      d.title = `🆕 ${d.title}`;
      changed = true;
    }
  }
  if (changed) persistQQDrafts();
}

// ── Migration: alte Themen-Sample-Drafts entfernen ────────────────────────
// Stand 2026-04-27: Die alten Themen-Drafts (qq-sample-allgemeinwissen,
// qq-sample-popkultur, qq-sample-hamburg, qq-sample-natur-tiere, qq-sample-
// sport, qq-sample-essen-trinken) wurden ersetzt durch 5 bunt gemischte
// Allgemeinwissens-Drafts (qq-vol-1 bis qq-vol-5). Diese Migration räumt
// persistierte Drafts mit alten Sample-IDs aus File + DB auf.
function isLegacySampleDraft(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith('qq-sample-');
}

// Initial-Cleanup auf file-backed drafts beim Startup
{
  const before = qqDrafts.length;
  qqDrafts = qqDrafts.filter(d => !isLegacySampleDraft(d.id));
  const removed = before - qqDrafts.length;
  if (removed > 0) {
    persistQQDrafts();
    console.log(`[migration] Removed ${removed} legacy qq-sample-* drafts from file storage`);
  }
}

// ── Migration 2026-04-28: qq-vol-* Drafts mit 4 gewinnt + Bluff anreichern ─
// Bestehende Drafts (file + DB) ohne onlyConnect/bluff-Fragen werden mit dem
// aktuellen Seed-Inhalt überschrieben. Verhindert dass alte Production-Drafts
// die neuen Sub-Mechaniken nicht zeigen.
// 2026-07-03 (Wolf: onlyConnect/bluff sind deaktiviert): frueher markierten diese
// Mechaniken die „neue" Version, jetzt sind sie die veraltete. Die Migration
// bereinigt qq-vol-* Drafts, die sie noch enthalten, mit dem (jetzt bereinigten)
// Sample aus createSampleQQDrafts. Name gibt die aktuelle Semantik wieder.
function draftHasDeactivatedMechanic(draft: any): boolean {
  return Array.isArray(draft?.questions) && draft.questions.some((q: any) =>
    q?.bunteTuete?.kind === 'onlyConnect' || q?.bunteTuete?.kind === 'bluff'
  );
}
function isQQVolDraft(id: string | undefined | null): boolean {
  return typeof id === 'string' && /^qq-vol-[1-5]$/.test(id);
}
{
  const fresh = createSampleQQDrafts();
  const freshById = new Map(fresh.map(d => [d.id, d]));
  let changed = false;
  for (let i = 0; i < qqDrafts.length; i++) {
    const d = qqDrafts[i];
    if (!isQQVolDraft(d.id)) continue;
    if (!draftHasDeactivatedMechanic(d)) continue;  // nur Drafts MIT onlyConnect/bluff bereinigen
    const fd = freshById.get(d.id);
    if (!fd) continue;
    qqDrafts[i] = { ...fd, updatedAt: Date.now() };
    changed = true;
  }
  if (changed) {
    persistQQDrafts();
    console.log('[migration] Refreshed qq-vol-* drafts in file storage with 4 gewinnt + Bluff');
  }
}

// ── Migration 2026-05-07: hotPotato-Fragen in qq-vol-* Drafts refreshen ──
// Wolfs Frage-Aktualisierungen am Source (z.B. Vol-3 p1-2 'Buch der
// Weltliteratur' → 'Land mit Flagge ohne Rot') landen sonst nie in der
// File/DB-Persistierung, weil die Sub-Mechanics-Migration nach erstem Run
// alle qq-vol-* mit onlyConnect/bluff als „aktuell" markiert und ueberspringt.
//
// Diese Migration vergleicht hotPotato-Fragen pro qq-vol-* Draft mit dem
// aktuellen Source-Inhalt; bei Abweichung wird ueberschrieben. Idempotent —
// laeuft jedes Mal, aendert aber nichts wenn Text/Answer schon matchen.
{
  const fresh = createSampleQQDrafts();
  const freshById = new Map(fresh.map(d => [d.id, d]));
  let changed = false;
  for (const d of qqDrafts) {
    if (!isQQVolDraft(d.id)) continue;
    const fd = freshById.get(d.id);
    if (!fd || !Array.isArray((fd as any).questions)) continue;
    const freshQs = (fd as any).questions as any[];
    const liveQs = (d as any).questions as any[] | undefined;
    if (!Array.isArray(liveQs)) continue;
    for (let i = 0; i < liveQs.length; i++) {
      const lq = liveQs[i];
      if (lq?.bunteTuete?.kind !== 'hotPotato') continue;
      const fq = freshQs.find(fx => fx?.id === lq?.id);
      if (!fq || fq?.bunteTuete?.kind !== 'hotPotato') continue;
      const drift = lq.text !== fq.text
        || lq.textEn !== fq.textEn
        || lq.answer !== fq.answer
        || lq.answerEn !== fq.answerEn;
      if (drift) {
        liveQs[i] = { ...lq, text: fq.text, textEn: fq.textEn, answer: fq.answer, answerEn: fq.answerEn };
        d.updatedAt = Date.now();
        changed = true;
      }
    }
  }
  if (changed) {
    persistQQDrafts();
    console.log('[migration] hotPotato-Fragen in qq-vol-* Drafts auf Source-Stand gebracht');
  }
}

// ── Migration 2026-05-07: MC-Optionen in qq-vol-* Drafts refreshen ──
// Wolf-Bug: ZehnVonZehn-Optionen in DB waren korrupted ('Picasso-Geschwurbel'
// statt sauberer Antwort, Vincent van Gogh fehlte). Pro Frage mit
// `options`-Array das Source-Array vergleichen, bei Drift komplett
// ueberschreiben. Wirkt zusaetzlich zur DB-Migration in /api/qq/drafts.
{
  const fresh = createSampleQQDrafts();
  const freshById = new Map(fresh.map(d => [d.id, d]));
  let changed = false;
  for (const d of qqDrafts) {
    if (!isQQVolDraft(d.id)) continue;
    const fd = freshById.get(d.id);
    if (!fd || !Array.isArray((fd as any).questions)) continue;
    const freshQs = (fd as any).questions as any[];
    const liveQs = (d as any).questions as any[] | undefined;
    if (!Array.isArray(liveQs)) continue;
    for (let i = 0; i < liveQs.length; i++) {
      const lq = liveQs[i];
      if (!Array.isArray(lq?.options)) continue;
      const fq = freshQs.find(fx => fx?.id === lq?.id);
      if (!fq || !Array.isArray(fq.options)) continue;
      const optsDrift = JSON.stringify(lq.options) !== JSON.stringify(fq.options)
        || JSON.stringify(lq.optionsEn ?? null) !== JSON.stringify(fq.optionsEn ?? null)
        || (lq.correctOptionIndex ?? null) !== (fq.correctOptionIndex ?? null)
        || lq.text !== fq.text
        || lq.textEn !== fq.textEn
        || lq.answer !== fq.answer
        || lq.answerEn !== fq.answerEn;
      if (optsDrift) {
        liveQs[i] = {
          ...lq,
          text: fq.text, textEn: fq.textEn,
          answer: fq.answer, answerEn: fq.answerEn,
          options: fq.options, optionsEn: fq.optionsEn,
          correctOptionIndex: fq.correctOptionIndex,
        };
        d.updatedAt = Date.now();
        changed = true;
      }
    }
  }
  if (changed) {
    persistQQDrafts();
    console.log('[migration] MC-Optionen in qq-vol-* Drafts auf Source-Stand gebracht');
  }
}

// ── Migration 2026-07-20: fehlende EN-Felder der order-Fragen nachziehen ──
// Der neue EN-Checker (scripts/check-en-drafts.mjs) fand 6 harte Luecken: vier
// `order`-Fragen ohne `bunteTuete.itemsEn`, zwei davon zusaetzlich ohne
// `criteriaEn`. Im EN-Spiel stand dort garantiert Deutsch auf der Buehne.
//
// Warum ueberhaupt eine Migration: File/DB gewinnen ueber den Source
// (createSampleQQDrafts laeuft nur bei length===0), eine reine Source-Aenderung
// haette den Live-Server also nie erreicht.
//
// ⚠️ Bewusst ANDERS als die Migrationen darueber: die ueberschreiben bei Drift,
// diese fuellt NUR fehlende Felder. Uebersetzungen, die Wolf im Studio oder per
// /api/qq/drafts/:id/translate gemacht hat, bleiben damit unangetastet.
// Deckt beide Quellen ab: qq-vol-* (createSampleQQDrafts) + die Extra-Test-
// Drafts (Harry Potter, Hamburg), die sonst nur "add if missing" kennen.
{
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { QQ_EXTRA_TEST_DRAFTS } = require('./data/qqExtraTestDrafts') as { QQ_EXTRA_TEST_DRAFTS: any[] };
  const freshById = new Map<string, any>(
    [...createSampleQQDrafts(), ...QQ_EXTRA_TEST_DRAFTS].map((d: any) => [d.id, d])
  );
  let filled = 0;
  for (const d of qqDrafts as any[]) {
    const fd = freshById.get(d.id);
    if (!fd || !Array.isArray(d.questions) || !Array.isArray(fd.questions)) continue;
    for (const lq of d.questions) {
      const bt = lq?.bunteTuete;
      if (!bt || bt.kind !== 'order') continue;
      const fq = fd.questions.find((fx: any) => fx?.id === lq?.id);
      const fbt = fq?.bunteTuete;
      if (!fbt || fbt.kind !== 'order') continue;
      // Nur fuellen wenn leer. itemsEn zusaetzlich nur, wenn die Laenge zu den
      // DE-items passt — ein Laengen-Mismatch wuerde die Index-Zuordnung zu
      // correctOrder zerreissen und die Frage unloesbar machen.
      if (!Array.isArray(bt.itemsEn) && Array.isArray(fbt.itemsEn)
          && Array.isArray(bt.items) && fbt.itemsEn.length === bt.items.length) {
        bt.itemsEn = [...fbt.itemsEn];
        d.updatedAt = Date.now();
        filled++;
      }
      if (!bt.criteriaEn && fbt.criteriaEn) {
        bt.criteriaEn = fbt.criteriaEn;
        d.updatedAt = Date.now();
        filled++;
      }
    }
  }
  if (filled > 0) {
    persistQQDrafts();
    console.log(`[migration] ${filled} fehlende EN-Felder in order-Fragen nachgezogen`);
  }
}

// ── Migration 2026-05-06: pro qq-vol-* Draft eigenes 4×4-Connections-Set ──
// Vorher hatten alle Drafts den Default-Fallback (Kaffee/Programmiersprachen/
// Edelsteine/Apple). Jetzt liefert createSampleQQDrafts pro Draft ein eigenes
// Set. Diese Migration mergt das `connections`-Feld in vorhandene Drafts die
// es noch nicht haben. Idempotent.
{
  const fresh = createSampleQQDrafts();
  const freshById = new Map(fresh.map(d => [d.id, d]));
  let changed = false;
  for (const d of qqDrafts) {
    if (!isQQVolDraft(d.id)) continue;
    if ((d as any).connections) continue;
    const fd = freshById.get(d.id);
    const newConn = (fd as any)?.connections;
    if (!newConn) continue;
    (d as any).connections = newConn;
    d.updatedAt = Date.now();
    changed = true;
  }
  if (changed) {
    persistQQDrafts();
    console.log('[migration] Connections-Set pro qq-vol-* Draft hinzugefuegt');
  }
}

// ── Migration 2026-04-28: CHEESE-Bilder via Wikipedia REST API anreichern ─
// CHEESE-Fragen in qq-vol-* Drafts haben keine `image.url`. Wir holen pro
// Frage den Thumbnail aus der Wikipedia-Summary-API (DE bevorzugt, EN als
// Fallback) und persistieren in den Draft. Einmalig pro Draft (idempotent).
const QQ_CHEESE_WIKIPEDIA_TITLES: Record<string, { de?: string; en?: string }> = {
  // Vol 1
  'qq-vol-1-p1-4': { de: 'Eiffelturm', en: 'Eiffel_Tower' },
  'qq-vol-1-p2-4': { de: 'Erdmännchen', en: 'Meerkat' },
  'qq-vol-1-p3-4': { de: 'Granatapfel', en: 'Pomegranate' },
  'qq-vol-1-p4-4': { de: 'Leonardo_DiCaprio', en: 'Leonardo_DiCaprio' },
  // Vol 2
  'qq-vol-2-p1-4': { en: 'Yoda' }, // DE-Artikel hat kein Bild
  'qq-vol-2-p2-4': { de: 'Saxophon', en: 'Saxophone' },
  'qq-vol-2-p3-4': { en: 'Wembley_Stadium' }, // DE-Artikel hat kein Bild
  'qq-vol-2-p4-4': { de: 'Nike_(Unternehmen)', en: 'Nike,_Inc.' },
  // Vol 3
  'qq-vol-3-p1-4': { de: 'Mona_Lisa', en: 'Mona_Lisa' },
  'qq-vol-3-p2-4': { en: 'Napoleon' }, // DE liefert Wappen statt Porträt
  'qq-vol-3-p3-4': { de: 'Akropolis_(Athen)', en: 'Acropolis_of_Athens' },
  'qq-vol-3-p4-4': { de: 'Der_Denker', en: 'The_Thinker' },
  // Vol 4
  'qq-vol-4-p1-4': { de: 'Zimt', en: 'Cinnamon' },
  'qq-vol-4-p2-4': { de: 'Schraubenschlüssel', en: 'Wrench' },
  'qq-vol-4-p3-4': { de: 'Pitahaya', en: 'Pitaya' },
  'qq-vol-4-p4-4': { de: 'Heißluftballon', en: 'Hot_air_balloon' },
  // Vol 5
  'qq-vol-5-p1-4': { de: 'Usain_Bolt', en: 'Usain_Bolt' },
  'qq-vol-5-p2-4': { de: 'Sonnenblume', en: 'Common_sunflower' },
  'qq-vol-5-p3-4': { de: 'Albert_Einstein', en: 'Albert_Einstein' },
  'qq-vol-5-p4-4': { de: 'Flamingos', en: 'Flamingo' },
};

async function fetchWikipediaThumbnail(title: string, lang: 'de' | 'en'): Promise<string | null> {
  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CozyQuiz-CheeseImageEnricher/1.0 (cozyquiz.app)' },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    // Bevorzuge originalimage (höhere Auflösung) wenn da, sonst thumbnail
    return data?.originalimage?.source ?? data?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

// 2026-09-05: Die Quelle des Titels ist jetzt zweistufig. Zuerst das Feld
// `wikipediaTitle` an der Frage selbst, dann die alte ID-Tabelle oben. Grund:
// die Tabelle haengt an festen Fragen-IDs und funktioniert deshalb nur bei
// qq-vol-*. Saetze, die der Builder anlegt, tragen einen Zeitstempel in der
// Entwurfs-ID, ihre Fragen-IDs sind also jedes Mal andere.
//
// ⚠️ NICHT VERIFIZIERT, WELCHE TITEL TREFFEN: aus dem Container ist
// wikipedia.org nicht erreichbar (Agent-Proxy, 403 "Host not in allowlist").
// Ein Titel, den es nicht gibt, oder ein Artikel ohne Bild faellt hier still
// durch. Deshalb protokolliert der Aufrufer jede CHEESE-Frage, die leer
// bleibt, und `scripts/bilder-pruefen.mjs` listet sie ausserhalb des
// Containers auf. Eine leere Schau-mal-Folie faellt sonst erst am Abend auf.
function cheeseWikipediaTitles(q: any): { de?: string; en?: string } | null {
  const amFeld = q?.wikipediaTitle;
  if (amFeld && (amFeld.de || amFeld.en)) return amFeld;
  return QQ_CHEESE_WIKIPEDIA_TITLES[q?.id] ?? null;
}

async function enrichCheeseImagesInDraft(draft: any): Promise<boolean> {
  if (!Array.isArray(draft?.questions)) return false;
  let changed = false;
  for (const q of draft.questions) {
    if (q?.category !== 'CHEESE') continue;
    if (q?.image?.url) continue; // schon ein Bild
    const titles = cheeseWikipediaTitles(q);
    if (!titles) continue;
    let url: string | null = null;
    let quelle: string | undefined;
    if (titles.de) {
      url = await fetchWikipediaThumbnail(titles.de, 'de');
      if (url) quelle = `https://de.wikipedia.org/wiki/${encodeURIComponent(titles.de)}`;
    }
    if (!url && titles.en) {
      url = await fetchWikipediaThumbnail(titles.en, 'en');
      if (url) quelle = `https://en.wikipedia.org/wiki/${encodeURIComponent(titles.en)}`;
    }
    if (url) {
      q.image = { url, layout: 'fullscreen', animation: 'none', quelle };
      changed = true;
    } else {
      console.warn(`[cheese-bild] ${draft?.id}/${q?.id}: kein Bild gefunden (${JSON.stringify(titles)})`);
    }
  }
  return changed;
}

// Migration läuft asynchron im Hintergrund (kein await — Server-Start nicht blockieren).
(async () => {
  try {
    let anyChanged = false;
    for (const d of qqDrafts) {
      // 2026-09-05: der Filter auf qq-vol-* ist weg. Er war der Grund, warum
      // die drei Schau-mal-Folien im Hamburg-Satz leer blieben, obwohl der
      // Mechanismus daneben lag. Jetzt entscheidet der Inhalt: wer einen
      // Titel hat, bekommt ein Bild.
      const c = await enrichCheeseImagesInDraft(d);
      if (c) anyChanged = true;
    }
    if (anyChanged) {
      persistQQDrafts();
      // Cache invalidieren — sonst sehen Frontend-Clients die ersten 2 min
      // noch Drafts ohne Bilder (cache.set in GET /api/qq/drafts).
      cache.del('qqDrafts');
      console.log('[migration] Enriched CHEESE images in qq-vol-* drafts (file storage)');
    }
  } catch (err) {
    console.error('[migration] CHEESE-image enrichment failed:', err);
  }
})();

app.get('/api/qq/drafts', async (_req, res) => {
  const cached = cache.get<any[]>('qqDrafts');
  if (cached) return res.json(cached);
  if (await ensureDraftDbConnection()) {
    const dbDrafts = await getAllQQDraftsFromDB();
    // Cleanup: alte qq-sample-* Drafts aus DB löschen (Migration 2026-04-27).
    const legacyDrafts = dbDrafts.filter((d: any) => isLegacySampleDraft(d.id));
    if (legacyDrafts.length > 0) {
      for (const ld of legacyDrafts) {
        try { await deleteQQDraftFromDB(ld.id); } catch { /* ignore */ }
      }
      console.log(`[migration] Removed ${legacyDrafts.length} legacy qq-sample-* drafts from DB`);
    }
    let cleanDbDrafts = dbDrafts.filter((d: any) => !isLegacySampleDraft(d.id));
    // Migration 2026-04-28: qq-vol-* ohne onlyConnect/bluff in DB überschreiben
    const fresh = createSampleQQDrafts();
    const freshById = new Map(fresh.map(d => [d.id, d]));
    let dbVolRefreshed = 0;
    for (let i = 0; i < cleanDbDrafts.length; i++) {
      const d: any = cleanDbDrafts[i];
      if (!isQQVolDraft(d.id)) continue;
      if (!draftHasDeactivatedMechanic(d)) continue;  // nur Drafts MIT onlyConnect/bluff bereinigen
      const fd = freshById.get(d.id);
      if (!fd) continue;
      const refreshed = { ...fd, updatedAt: Date.now() };
      cleanDbDrafts[i] = refreshed;
      try { await saveQQDraftToDB(refreshed); } catch { /* ignore */ }
      dbVolRefreshed++;
    }
    if (dbVolRefreshed > 0) {
      console.log(`[migration] Refreshed ${dbVolRefreshed} qq-vol-* drafts in DB with 4 gewinnt + Bluff`);
    }
    // ── Migration 2026-09-05: Wissensgebiete (topic) nachtragen ─────────────
    // Wolf: „trag die topics in die saetze ein". Ohne das misst
    // scripts/fragen-themen.mjs die Bibliothek und nicht den Abend.
    // ⚠️ STRENG ADDITIV: nur Fragen OHNE topic bekommen eins, ein im Builder
    // gesetztes Gebiet wird nie ueberschrieben. Gespeichert wird nur, was sich
    // wirklich geaendert hat, sonst schriebe dieser Endpunkt bei jedem Aufruf.
    let dbThemen = 0;
    for (const d of cleanDbDrafts as any[]) {
      const n = ergaenzeFragenThemen([d]);
      if (n > 0) {
        d.updatedAt = Date.now();
        try { await saveQQDraftToDB(d); dbThemen += n; } catch { /* ignore */ }
      }
    }
    if (dbThemen > 0) {
      console.log(`[migration] ${dbThemen} Fragen haben ein Wissensgebiet bekommen`);
    }
    // ── 2026-09-05: CHEESE-Bilder auch fuer Saetze aus der DB ───────────────
    // Die Anreicherung beim Start laeuft nur ueber die Datei-Entwuerfe. Was in
    // der DB liegt, hat sie nie gesehen, und die DB gewinnt beim Lesen. Genau
    // deshalb blieben die drei Schau-mal-Folien im Hamburg-Satz leer, obwohl
    // der Satz seit Monaten existiert.
    // Nur Fragen OHNE Bild werden angefasst, ein hochgeladenes Bild bleibt
    // also unberuehrt. Gespeichert wird nur bei echter Aenderung.
    let dbBilder = 0;
    for (const d of cleanDbDrafts as any[]) {
      const braucht = (d?.questions ?? []).some((q: any) =>
        q?.category === 'CHEESE' && !q?.image?.url && cheeseWikipediaTitles(q));
      if (!braucht) continue;
      if (await enrichCheeseImagesInDraft(d)) {
        d.updatedAt = Date.now();
        try { await saveQQDraftToDB(d); dbBilder++; } catch { /* ignore */ }
      }
    }
    if (dbBilder > 0) {
      console.log(`[migration] CHEESE-Bilder in ${dbBilder} DB-Entwuerfen ergaenzt`);
    }
    // ── 2026-09-05: eine kaputte Frage in den zwei Testsaetzen reparieren ───
    // Gemessen im Live-Export: in `qq-test-hamburg` und `qq-test-harry-potter`
    // steht auf Platz p3-2 nicht die themenpassende Fix-It-Frage aus der
    // Quelle, sondern generisches Fuellmaterial (Tier-Lebenserwartung
    // beziehungsweise Spotify-Streams). Beide Saetze, derselbe Platz, also
    // ein alter Kopierfehler und keine Absicht.
    //
    // ⚠️ BEWUSST ENG: nur diese eine Frage, nur in diesen zwei Entwuerfen, und
    // nur wenn dort noch genau der bekannte Fuelltext steht. Die Alternative
    // waere gewesen, die Quelle generell fuer massgeblich zu erklaeren und bei
    // Abweichung zu ueberschreiben. Das haette jede spaetere Aenderung im
    // Builder still zurueckgedreht, und Hamburg soll ja gerade wachsen.
    {
      const KAPUTT: Record<string, string> = {
        'qq-test-hamburg-p3-2': 'Sortiere die Tiere nach durchschnittlicher Lebenserwartung.',
        'qq-test-harry-potter-p3-2': 'Sortiere die Songs nach Spotify-Gesamtstreams.',
      };
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { QQ_EXTRA_TEST_DRAFTS } = require('./data/qqExtraTestDrafts') as { QQ_EXTRA_TEST_DRAFTS: any[] };
      const quelleById = new Map<string, any>(QQ_EXTRA_TEST_DRAFTS.map((d: any) => [d.id, d]));
      let repariert = 0;
      for (const d of cleanDbDrafts as any[]) {
        const quelle = quelleById.get(d?.id);
        if (!quelle || !Array.isArray(d?.questions)) continue;
        let dirty = false;
        for (let i = 0; i < d.questions.length; i++) {
          const lq = d.questions[i];
          const erwartetKaputt = KAPUTT[lq?.id];
          if (!erwartetKaputt || lq?.text !== erwartetKaputt) continue;
          const qq = quelle.questions.find((x: any) => x?.id === lq?.id);
          if (!qq) continue;
          d.questions[i] = { ...lq, ...qq };
          dirty = true;
        }
        if (dirty) {
          d.updatedAt = Date.now();
          try { await saveQQDraftToDB(d); repariert++; } catch { /* ignore */ }
        }
      }
      if (repariert > 0) {
        console.log(`[migration] Fuellfrage p3-2 in ${repariert} Testsatz/-saetzen aus der Quelle ersetzt`);
      }
    }
    // ── 2026-09-05: fehlende EN-Felder und wikipediaTitle aus der Quelle ────
    // Fuellt NUR, was fehlt. Ein im Builder gesetzter Wert bleibt stehen.
    // Betrifft die Repo-Testsaetze, deren DB-Kopie sonst nie erfaehrt, dass
    // die Quelle inzwischen englische Antworten und Fun Facts hat.
    {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { QQ_EXTRA_TEST_DRAFTS } = require('./data/qqExtraTestDrafts') as { QQ_EXTRA_TEST_DRAFTS: any[] };
      const quelleById = new Map<string, any>(QQ_EXTRA_TEST_DRAFTS.map((d: any) => [d.id, d]));
      const FELDER = ['answerEn', 'funFact', 'funFactEn', 'unitEn', 'wikipediaTitle'] as const;
      let gefuellt = 0;
      for (const d of cleanDbDrafts as any[]) {
        const quelle = quelleById.get(d?.id);
        if (!quelle || !Array.isArray(d?.questions)) continue;
        let dirty = false;
        for (const lq of d.questions) {
          const qq = quelle.questions.find((x: any) => x?.id === lq?.id);
          if (!qq) continue;
          for (const f of FELDER) {
            const leer = lq[f] === undefined || lq[f] === null || lq[f] === '';
            if (leer && qq[f] !== undefined) { lq[f] = qq[f]; dirty = true; }
          }
        }
        if (dirty) {
          d.updatedAt = Date.now();
          try { await saveQQDraftToDB(d); gefuellt++; } catch { /* ignore */ }
        }
      }
      if (gefuellt > 0) {
        console.log(`[migration] Fehlende EN-Felder in ${gefuellt} Testsatz/-saetzen aus der Quelle gefuellt`);
      }
    }
    // 2026-05-07 (Wolf 'Weltliteratur-Frage sollte laengst durch Flagge-ohne-
    // Rot ersetzt sein'): hotPotato-Fragen pro qq-vol-* Draft auf Source-Stand
    // bringen. Idempotent — nur bei Drift wird ueberschrieben + persistiert.
    let dbHpRefreshed = 0;
    for (let i = 0; i < cleanDbDrafts.length; i++) {
      const d: any = cleanDbDrafts[i];
      if (!isQQVolDraft(d.id)) continue;
      const fd = freshById.get(d.id);
      if (!fd || !Array.isArray((fd as any).questions)) continue;
      const freshQs = (fd as any).questions as any[];
      const liveQs = d.questions as any[] | undefined;
      if (!Array.isArray(liveQs)) continue;
      let dirty = false;
      for (let j = 0; j < liveQs.length; j++) {
        const lq = liveQs[j];
        if (lq?.bunteTuete?.kind !== 'hotPotato') continue;
        const fq = freshQs.find(fx => fx?.id === lq?.id);
        if (!fq || fq?.bunteTuete?.kind !== 'hotPotato') continue;
        const drift = lq.text !== fq.text
          || lq.textEn !== fq.textEn
          || lq.answer !== fq.answer
          || lq.answerEn !== fq.answerEn;
        if (drift) {
          liveQs[j] = { ...lq, text: fq.text, textEn: fq.textEn, answer: fq.answer, answerEn: fq.answerEn };
          dirty = true;
        }
      }
      if (dirty) {
        d.updatedAt = Date.now();
        try { await saveQQDraftToDB(d); } catch { /* ignore */ }
        dbHpRefreshed++;
      }
    }
    if (dbHpRefreshed > 0) {
      console.log(`[migration] Refreshed hotPotato questions in ${dbHpRefreshed} DB drafts (Vol-3 Weltliteratur etc.)`);
    }
    // 2026-05-07 (Wolf-Bug 'Picasso-Geschwurbel als Option, Vincent van Gogh
    // fehlt'): MC-Optionen (ZEHN_VON_ZEHN, MUCHO, etc.) wurden in der DB
    // durch alte AI-Translate-Runs korrupted. Migration: pro qq-vol-* Frage
    // mit `options`-Array das Source-Array vergleichen, bei Drift komplett
    // ueberschreiben (options, optionsEn, correctOptionIndex). Idempotent.
    let dbOptsRefreshed = 0;
    for (let i = 0; i < cleanDbDrafts.length; i++) {
      const d: any = cleanDbDrafts[i];
      if (!isQQVolDraft(d.id)) continue;
      const fd = freshById.get(d.id);
      if (!fd || !Array.isArray((fd as any).questions)) continue;
      const freshQs = (fd as any).questions as any[];
      const liveQs = d.questions as any[] | undefined;
      if (!Array.isArray(liveQs)) continue;
      let dirty = false;
      for (let j = 0; j < liveQs.length; j++) {
        const lq = liveQs[j];
        if (!Array.isArray(lq?.options)) continue;
        const fq = freshQs.find(fx => fx?.id === lq?.id);
        if (!fq || !Array.isArray(fq.options)) continue;
        const optsDrift = JSON.stringify(lq.options) !== JSON.stringify(fq.options)
          || JSON.stringify(lq.optionsEn ?? null) !== JSON.stringify(fq.optionsEn ?? null)
          || (lq.correctOptionIndex ?? null) !== (fq.correctOptionIndex ?? null)
          || lq.text !== fq.text
          || lq.textEn !== fq.textEn
          || lq.answer !== fq.answer
          || lq.answerEn !== fq.answerEn;
        if (optsDrift) {
          liveQs[j] = {
            ...lq,
            text: fq.text, textEn: fq.textEn,
            answer: fq.answer, answerEn: fq.answerEn,
            options: fq.options, optionsEn: fq.optionsEn,
            correctOptionIndex: fq.correctOptionIndex,
          };
          dirty = true;
        }
      }
      if (dirty) {
        d.updatedAt = Date.now();
        try { await saveQQDraftToDB(d); } catch { /* ignore */ }
        dbOptsRefreshed++;
      }
    }
    if (dbOptsRefreshed > 0) {
      console.log(`[migration] Refreshed MC-options in ${dbOptsRefreshed} DB drafts (Vol-3 Picasso-Geschwurbel etc.)`);
    }
    // 2026-07-20: DB-Gegenstueck zur EN-Luecken-Migration beim Startup.
    // Die Startup-Variante patcht nur qqDrafts (Datei/Speicher) — live kommen
    // die Drafts aber aus Mongo, also greift sie dort NICHT. Ohne diesen Block
    // blieben die 6 Luecken auf dem Live-Server bestehen (empirisch: check:en
    // gruen, check:en:live weiter 6 Fehler).
    //
    // Deckt qq-vol-* UND die Extra-Test-Drafts ab (deshalb kein isQQVolDraft-
    // Filter, sondern schlicht "kennt der Source diesen Draft?").
    // Fuellt NUR fehlende Felder — nie ueberschreiben, sonst waeren Studio-
    // bzw. /translate-Uebersetzungen weg.
    {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { QQ_EXTRA_TEST_DRAFTS } = require('./data/qqExtraTestDrafts') as { QQ_EXTRA_TEST_DRAFTS: any[] };
      const enById = new Map<string, any>([...fresh, ...QQ_EXTRA_TEST_DRAFTS].map((d: any) => [d.id, d]));
      let dbEnFilled = 0;
      for (let i = 0; i < cleanDbDrafts.length; i++) {
        const d: any = cleanDbDrafts[i];
        const fd = enById.get(d.id);
        if (!fd || !Array.isArray(d.questions) || !Array.isArray(fd.questions)) continue;
        let dirty = false;
        for (const lq of d.questions) {
          const bt = lq?.bunteTuete;
          if (!bt || bt.kind !== 'order') continue;
          const fbt = fd.questions.find((fx: any) => fx?.id === lq?.id)?.bunteTuete;
          if (!fbt || fbt.kind !== 'order') continue;
          // Laengen-Check: ein Mismatch wuerde die Index-Zuordnung zu
          // correctOrder zerreissen und die Frage unloesbar machen.
          if (!Array.isArray(bt.itemsEn) && Array.isArray(fbt.itemsEn)
              && Array.isArray(bt.items) && fbt.itemsEn.length === bt.items.length) {
            bt.itemsEn = [...fbt.itemsEn];
            dirty = true;
          }
          if (!bt.criteriaEn && fbt.criteriaEn) {
            bt.criteriaEn = fbt.criteriaEn;
            dirty = true;
          }
        }
        if (dirty) {
          d.updatedAt = Date.now();
          try { await saveQQDraftToDB(d); } catch { /* ignore */ }
          dbEnFilled++;
        }
      }
      if (dbEnFilled > 0) {
        console.log(`[migration] EN-Luecken in order-Fragen gefuellt: ${dbEnFilled} DB-Draft(s)`);
      }
    }
    // CHEESE-Image-Enrichment in DB (idempotent — pro Frage erst wenn image fehlt)
    let dbCheeseEnriched = 0;
    for (let i = 0; i < cleanDbDrafts.length; i++) {
      const d: any = cleanDbDrafts[i];
      if (!isQQVolDraft(d.id)) continue;
      const c = await enrichCheeseImagesInDraft(d);
      if (c) {
        try { await saveQQDraftToDB(d); } catch { /* ignore */ }
        dbCheeseEnriched++;
      }
    }
    if (dbCheeseEnriched > 0) {
      console.log(`[migration] Enriched CHEESE images in ${dbCheeseEnriched} DB drafts via Wikipedia`);
    }
    // 2026-05-17 (CozyGames-Auto-Fill): Drafts ohne cozyGamesPool bekommen
    // 8 random Seed-Spiele. Idempotent — nur fehlende/leere Pools werden
    // befüllt. cozyGamesEnabled bleibt unverändert (Wolf entscheidet pro
    // Quiz im Builder oder Mod-Quick-Settings).
    let dbCozyGamesAutoFilled = 0;
    const cozyGameSeedIds = COZY_GAME_V1_SEED.map(g => g.id);
    for (let i = 0; i < cleanDbDrafts.length; i++) {
      const d: any = cleanDbDrafts[i];
      const hasPool = Array.isArray(d.cozyGamesPool) && d.cozyGamesPool.length > 0;
      if (hasPool) continue;
      const shuffled = [...cozyGameSeedIds].sort(() => Math.random() - 0.5);
      d.cozyGamesPool = shuffled.slice(0, 8);
      d.updatedAt = Date.now();
      try { await saveQQDraftToDB(d); } catch { /* ignore */ }
      dbCozyGamesAutoFilled++;
    }
    if (dbCozyGamesAutoFilled > 0) {
      console.log(`[migration] Auto-filled CozyGames-Pool in ${dbCozyGamesAutoFilled} DB drafts (8 random Seed-Spiele pro Draft)`);
    }
    // Same für File-Drafts
    for (let i = 0; i < qqDrafts.length; i++) {
      const d: any = qqDrafts[i];
      const hasPool = Array.isArray(d.cozyGamesPool) && d.cozyGamesPool.length > 0;
      if (hasPool) continue;
      const shuffled = [...cozyGameSeedIds].sort(() => Math.random() - 0.5);
      d.cozyGamesPool = shuffled.slice(0, 8);
      d.updatedAt = Date.now();
    }
    persistQQDrafts();
    // Merge any file-backed drafts that aren't yet in DB
    const dbIds = new Set(cleanDbDrafts.map((d: any) => d.id));
    const fileDrafts = qqDrafts.filter(d => !dbIds.has(d.id));
    // Sync file-only drafts into DB for future
    for (const fd of fileDrafts) {
      try { await saveQQDraftToDB(fd); } catch { /* ignore */ }
    }
    const merged = [...cleanDbDrafts, ...fileDrafts].sort((a: any, b: any) => b.updatedAt - a.updatedAt);
    // 2026-05-07 (Wolf 'kurz war eurovision design da, jetzt wieder weg'):
    // Cache-Bug — die LIST-Antwort wurde gecacht ohne Auto-Heal, dadurch hat
    // der Builder bei activeDraft = drafts.find(...) immer den stale Theme
    // bekommen + beim naechsten saveDraftRaw-PUT die DB-Heilung wieder
    // ueberschrieben. Jetzt Heal-Pass auch hier inline (gleiche Logik wie der
    // Single-GET-Heal): ESC-Drafts kriegen das EUROVISION_THEME gemerged,
    // Non-ESC-Drafts mit ESC-lobbyWelcome-URL wird der Slot geleert.
    const escUrlsInList = new Set<string>();
    for (const d of merged as any[]) {
      if (!isEurovisionDraftTitle(d?.title)) continue;
      const u = d?.soundConfig?.lobbyWelcome;
      if (typeof u === 'string' && u.length > 0) escUrlsInList.add(u);
    }
    let healedCount = 0;
    for (let i = 0; i < merged.length; i++) {
      const d: any = merged[i];
      // 1) ESC-Theme-Heal
      if (isEurovisionDraftTitle(d?.title)) {
        const existing = (d.theme ?? {}) as Record<string, any>;
        let needs = false;
        for (const [k, v] of Object.entries(EUROVISION_THEME)) {
          if (JSON.stringify(existing[k]) !== JSON.stringify(v)) { needs = true; break; }
        }
        if (needs) {
          d.theme = { ...existing, ...EUROVISION_THEME };
          try { await saveQQDraftToDB(d); healedCount++; } catch { /* ignore */ }
        }
      }
      // 2) Non-ESC mit kontaminierter lobbyWelcome
      else {
        const u = d?.soundConfig?.lobbyWelcome;
        if (typeof u === 'string' && u.length > 0 && escUrlsInList.has(u)) {
          const cfg = { ...(d.soundConfig ?? {}) };
          delete cfg.lobbyWelcome;
          d.soundConfig = cfg;
          try { await saveQQDraftToDB(d); healedCount++; } catch { /* ignore */ }
        }
      }
    }
    if (healedCount > 0) {
      console.log(`[esc-heal-list] ${healedCount} Drafts geheilt (ESC-Theme oder Sound-Contamination).`);
    }
    cache.set('qqDrafts', merged, 120);
    return res.json(merged);
  }
  const sorted = [...qqDrafts].sort((a, b) => b.updatedAt - a.updatedAt);
  cache.set('qqDrafts', sorted, 120);
  res.json(sorted);
});

app.post('/api/qq/drafts', requirePin, async (req, res) => {
  const body = req.body;
  if (!body || typeof body.title !== 'string' || body.title.length > 200) return res.status(400).json({ error: 'Ungültiger Titel' });
  if (body.phases !== 2 && body.phases !== 3 && body.phases !== 4) return res.status(400).json({ error: 'Phasen muss 2, 3 oder 4 sein' });
  if (!Array.isArray(body.questions) || body.questions.length > 50) return res.status(400).json({ error: 'Ungültige Fragen' });
  const draft = { ...body, id: body.id || `qq-draft-${Date.now().toString(36)}`, createdAt: Date.now(), updatedAt: Date.now() };
  if (await ensureDraftDbConnection()) {
    try {
      const saved = await saveQQDraftToDB(draft);
      cache.del('qqDrafts');
      return res.json(saved);
    } catch { /* fall through to in-memory */ }
  }
  qqDrafts.unshift(draft);
  persistQQDrafts();
  cache.del('qqDrafts');
  res.json(draft);
});

// 2026-05-07 (Wolf-Bug 'Beamer ist nicht im Eurovision-Design'): Auto-Heal
// fuer ESC-Drafts, die frueh in der Session erstellt wurden bevor das Theme-
// Template `eurovisionMode` + alle Bilder/Welcome-Texte hatte. Wenn der Title
// 'Eurovision' enthaelt aber `theme.eurovisionMode` fehlt, mergt der Server
// das kanonische Theme aus shared/eurovisionTheme.ts ein und persistiert.
// Damit muss Wolf nie manuell repairen.
async function autoHealEurovisionDraft(draft: any): Promise<any> {
  if (!draft) return draft;
  if (!isEurovisionDraftTitle(draft.title)) return draft;
  // 2026-05-07 v2 (Wolf 'ich sehe immernoch nicht das eurovision design'):
  // Vorher wurde nur eurovisionMode geprueft. Jetzt: pruefe ob ALLE Felder
  // aus EUROVISION_THEME bereits gesetzt sind. Wenn ein einziges fehlt
  // (typisch bei stale Drafts wo Theme nur teilweise migriert wurde) →
  // mergen + persistieren. Idempotent, schreibt nur bei tatsaechlicher
  // Aenderung.
  const existingTheme = (draft.theme ?? {}) as Record<string, any>;
  let needsHeal = false;
  for (const [key, val] of Object.entries(EUROVISION_THEME)) {
    if (JSON.stringify(existingTheme[key]) !== JSON.stringify(val)) {
      needsHeal = true;
      break;
    }
  }
  if (!needsHeal) return draft;
  const healed = { ...draft, theme: { ...existingTheme, ...EUROVISION_THEME } };
  if (await ensureDraftDbConnection()) {
    try {
      await saveQQDraftToDB(healed);
      cache.del('qqDrafts');
      console.log(`[esc-heal] Eurovision-Theme auf Draft "${draft.title}" (${draft.id}) gemerged.`);
    } catch (err) {
      console.error('[esc-heal] persist failed:', err);
    }
  }
  return healed;
}

// 2026-05-07 (Wolf-Bug 'waehrend regeln laeuft Europa-Hymne in einigen
// quizzen'): wenn Wolf via 'Sounds auf alle Fragensaetze uebernehmen' die
// ESC-lobbyWelcome-URL in alle Drafts gepusht hat, spielen jetzt Non-ESC-
// Quizze die EU-Hymne in Lobby/Rules/Pause. Cross-Contamination-Detektion:
// Wenn ein Non-ESC-Draft die GLEICHE lobbyWelcome-URL hat wie ein ESC-Draft,
// ist das ein Apply-All-Artefakt — wir loeschen den Slot auf dem Non-ESC-
// Draft, damit der 4-Track-Pool-Fallback wieder greift. ESC-Drafts behalten
// ihren Sound. Heuristik nur Title-basiert ('Eurovision' im Title), kein
// separater Marker noetig.
let escLobbyUrlsCache: Set<string> | null = null;
let escLobbyUrlsCachedAt = 0;
async function getEurovisionLobbyUrls(): Promise<Set<string>> {
  const now = Date.now();
  if (escLobbyUrlsCache && (now - escLobbyUrlsCachedAt) < 30_000) return escLobbyUrlsCache;
  const urls = new Set<string>();
  if (await ensureDraftDbConnection()) {
    try {
      const all = await getAllQQDraftsFromDB();
      for (const d of all as any[]) {
        if (!isEurovisionDraftTitle(d?.title)) continue;
        const u = d?.soundConfig?.lobbyWelcome;
        if (typeof u === 'string' && u.length > 0) urls.add(u);
      }
    } catch { /* fall through */ }
  }
  escLobbyUrlsCache = urls;
  escLobbyUrlsCachedAt = now;
  return urls;
}
async function autoHealLobbySoundContamination(draft: any): Promise<any> {
  if (!draft) return draft;
  if (isEurovisionDraftTitle(draft.title)) return draft; // ESC-Drafts behalten ihren Sound
  const u = draft?.soundConfig?.lobbyWelcome;
  if (typeof u !== 'string' || u.length === 0) return draft;
  const escUrls = await getEurovisionLobbyUrls();
  if (!escUrls.has(u)) return draft;
  const cfg = { ...(draft.soundConfig ?? {}) };
  delete (cfg as any).lobbyWelcome;
  const healed = { ...draft, soundConfig: cfg };
  if (await ensureDraftDbConnection()) {
    try {
      await saveQQDraftToDB(healed);
      cache.del('qqDrafts');
      console.log(`[sound-heal] ESC-lobbyWelcome aus Non-ESC-Draft "${draft.title}" (${draft.id}) entfernt.`);
    } catch (err) {
      console.error('[sound-heal] persist failed:', err);
    }
  }
  return healed;
}

app.get('/api/qq/drafts/:id', async (req, res) => {
  // Legacy qq-sample-* Drafts wurden 2026-04-27 ersetzt — direkt 404.
  if (isLegacySampleDraft(req.params.id)) {
    return res.status(404).json({ error: 'Draft nicht gefunden (veraltet — bitte aus aktueller Liste wählen)' });
  }
  if (await ensureDraftDbConnection()) {
    let draft = await getQQDraftFromDB(req.params.id);
    if (draft) {
      draft = await autoHealEurovisionDraft(draft);
      draft = await autoHealLobbySoundContamination(draft);
      return res.json(draft);
    }
  }
  let draft = qqDrafts.find(d => d.id === req.params.id);
  if (!draft) return res.status(404).json({ error: 'Draft nicht gefunden' });
  draft = await autoHealEurovisionDraft(draft);
  draft = await autoHealLobbySoundContamination(draft);
  res.json(draft);
});

/**
 * 2026-05-20: Per-Draft Translate-Endpoint. Wolf-Idee: nur Fragen IM Draft
 * uebersetzen (statt blind alle 694 EN-only Library-Items) = spart DeepL-
 * Kontingent erheblich.
 *
 * Bidirektional: ergaenzt fehlende DE aus EN (oder umgekehrt). Idempotent —
 * schon-uebersetzte Felder werden geskippt. Throttle 60ms wie Library-Sync.
 *
 * Felder: text, answer, options[], unit (bei Schaetzchen). Bei BunteTuete-
 * Subkinds: answers[]/answersEn[] (Top5), items[]/itemsEn[] (Order),
 * hints[]/hintsEn[] (OnlyConnect).
 */
async function translateQQDraftQuestions(questions: any[]): Promise<{ updated: any[]; translatedFields: number }> {
  let translatedFields = 0;
  const updated: any[] = [];
  for (const q of questions) {
    const out: any = { ...q };
    const translatePair = async (deField: string, enField: string) => {
      const de = (out[deField] ?? '').trim();
      const en = (out[enField] ?? '').trim();
      if (!de && en) {
        const t = await translateText(en, 'EN', 'DE');
        if (t && t !== en) { out[deField] = t; translatedFields++; }
        await new Promise(r => setTimeout(r, 60));
      } else if (de && !en) {
        const t = await translateText(de, 'DE', 'EN');
        if (t && t !== de) { out[enField] = t; translatedFields++; }
        await new Promise(r => setTimeout(r, 60));
      }
    };
    const translateArrayPair = async (deKey: string, enKey: string, parent: any = out) => {
      const deArr: string[] = Array.isArray(parent[deKey]) ? parent[deKey] : [];
      const enArr: string[] = Array.isArray(parent[enKey]) ? parent[enKey] : [];
      const len = Math.max(deArr.length, enArr.length);
      if (len === 0) return;
      const outDe = [...deArr];
      const outEn = [...enArr];
      for (let i = 0; i < len; i++) {
        const d = (outDe[i] ?? '').trim();
        const e = (outEn[i] ?? '').trim();
        if (!d && e) {
          const t = await translateText(e, 'EN', 'DE');
          if (t && t !== e) { outDe[i] = t; translatedFields++; }
          await new Promise(r => setTimeout(r, 60));
        } else if (d && !e) {
          const t = await translateText(d, 'DE', 'EN');
          if (t && t !== d) { outEn[i] = t; translatedFields++; }
          await new Promise(r => setTimeout(r, 60));
        }
      }
      parent[deKey] = outDe;
      parent[enKey] = outEn;
    };

    await translatePair('text', 'textEn');
    await translatePair('answer', 'answerEn');
    await translatePair('unit', 'unitEn');
    await translatePair('customQuestion', 'customQuestionEn');
    await translateArrayPair('options', 'optionsEn');

    // BunteTuete-Subkinds — pro Mechanik andere Felder
    if (out.bunteTuete && typeof out.bunteTuete === 'object') {
      const bt = { ...out.bunteTuete };
      const kind = bt.kind;
      if (kind === 'top5') {
        await translateArrayPair('answers', 'answersEn', bt);
      } else if (kind === 'order') {
        await translateArrayPair('items', 'itemsEn', bt);
      } else if (kind === 'onlyConnect') {
        await translateArrayPair('hints', 'hintsEn', bt);
        await translateArrayPair('acceptedAnswers', 'acceptedAnswersEn', bt);
        // single answer
        const de = (bt.answer ?? '').trim();
        const en = (bt.answerEn ?? '').trim();
        if (!de && en) {
          const t = await translateText(en, 'EN', 'DE');
          if (t && t !== en) { bt.answer = t; translatedFields++; }
          await new Promise(r => setTimeout(r, 60));
        } else if (de && !en) {
          const t = await translateText(de, 'DE', 'EN');
          if (t && t !== de) { bt.answerEn = t; translatedFields++; }
          await new Promise(r => setTimeout(r, 60));
        }
      } else if (kind === 'oneOfEight') {
        await translateArrayPair('truths', 'truthsEn', bt);
        const de = (bt.lie ?? '').trim();
        const en = (bt.lieEn ?? '').trim();
        if (!de && en) {
          const t = await translateText(en, 'EN', 'DE');
          if (t && t !== en) { bt.lie = t; translatedFields++; }
        } else if (de && !en) {
          const t = await translateText(de, 'DE', 'EN');
          if (t && t !== de) { bt.lieEn = t; translatedFields++; }
        }
        await new Promise(r => setTimeout(r, 60));
      }
      out.bunteTuete = bt;
    }

    updated.push(out);
  }
  return { updated, translatedFields };
}

/** Counter: wieviele Frage-Felder brauchen Uebersetzung? Hilft Frontend-Button
 *  einen sinnvollen Counter zu zeigen ('🌐 Uebersetzen (12 fehlend)'). */

app.post('/api/qq/drafts/:id/translate', async (req, res) => {
  const { pin } = req.body as { pin?: string };
  if (!pin || pin !== ADMIN_PIN) return res.status(403).json({ error: 'PIN falsch' });
  if (!process.env.DEEPL_API_KEY) return res.status(503).json({ error: 'DEEPL_API_KEY nicht gesetzt' });
  let draft: any = null;
  if (await ensureDraftDbConnection()) {
    try { draft = await getQQDraftFromDB(req.params.id); } catch { /* fall through */ }
  }
  if (!draft) {
    draft = qqDrafts.find(d => d.id === req.params.id);
  }
  if (!draft) return res.status(404).json({ error: 'Draft nicht gefunden' });
  if (!Array.isArray(draft.questions)) return res.status(400).json({ error: 'Draft hat keine Fragen' });
  const { updated, translatedFields } = await translateQQDraftQuestions(draft.questions);
  const newDraft = { ...draft, questions: updated, updatedAt: Date.now() };
  if (await ensureDraftDbConnection()) {
    try {
      const saved = await saveQQDraftToDB(newDraft);
      cache.del('qqDrafts');
      return res.json({ ok: true, translatedFields, draft: saved });
    } catch { /* fall through */ }
  }
  const idx = qqDrafts.findIndex(d => d.id === req.params.id);
  if (idx >= 0) qqDrafts[idx] = newDraft;
  else qqDrafts.unshift(newDraft);
  persistQQDrafts();
  cache.del('qqDrafts');
  res.json({ ok: true, translatedFields, draft: newDraft });
});

app.put('/api/qq/drafts/:id', requirePin, async (req, res) => {
  const body = req.body;
  if (!body || typeof body.title !== 'string' || body.title.length > 200) return res.status(400).json({ error: 'Ungültiger Titel' });
  if (!Array.isArray(body.questions) || body.questions.length > 50) return res.status(400).json({ error: 'Ungültige Fragen' });
  const updated = { ...body, id: req.params.id, updatedAt: Date.now() };
  if (await ensureDraftDbConnection()) {
    try {
      const saved = await saveQQDraftToDB(updated);
      cache.del('qqDrafts');
      return res.json(saved);
    } catch { /* fall through */ }
  }
  const idx = qqDrafts.findIndex(d => d.id === req.params.id);
  if (idx === -1) {
    qqDrafts.unshift(updated);
    persistQQDrafts();
    cache.del('qqDrafts');
    return res.json(updated);
  }
  qqDrafts[idx] = { ...qqDrafts[idx], ...req.body, updatedAt: Date.now() };
  persistQQDrafts();
  cache.del('qqDrafts');
  res.json(qqDrafts[idx]);
});

app.delete('/api/qq/drafts/:id', requirePin, async (req, res) => {
  if (await ensureDraftDbConnection()) {
    await deleteQQDraftFromDB(req.params.id);
  }
  qqDrafts = qqDrafts.filter(d => d.id !== req.params.id);
  persistQQDrafts();
  cache.del('qqDrafts');
  res.json({ ok: true });
});

// ── CozyGames Katalog (Mini-Game-Bibliothek) ─────────────────────────────────
// 2026-05-17: Editor unter /cozygames im Frontend. CRUD analog QQ-Drafts.
// V1-Seed (12 Spiele) wird beim ersten Backend-Start eingefügt. Wolf kann via
// Editor neue Spiele anlegen, V1-Seed-Spiele archivieren (isSeed bleibt true →
// nicht löschbar, nur archived-Flag setzen).

app.get('/api/cozygames', async (_req, res) => {
  if (await ensureDraftDbConnection()) {
    try {
      const games = await getAllCozyGamesFromDB();
      return res.json(games);
    } catch (err) {
      console.error('[cozygames] GET-list failed:', err);
      return res.status(500).json({ error: 'Fehler beim Laden CozyGames' });
    }
  }
  // Fallback ohne DB: V1-Seed direkt zurückgeben.
  res.json(COZY_GAME_V1_SEED);
});

app.get('/api/cozygames/:id', async (req, res) => {
  if (await ensureDraftDbConnection()) {
    const game = await getCozyGameFromDB(req.params.id);
    if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden' });
    return res.json(game);
  }
  const fallback = COZY_GAME_V1_SEED.find(g => g.id === req.params.id);
  if (!fallback) return res.status(404).json({ error: 'Spiel nicht gefunden' });
  res.json(fallback);
});

app.post('/api/cozygames', requirePin, async (req, res) => {
  const body = req.body ?? {};
  if (!body.id || typeof body.id !== 'string') {
    return res.status(400).json({ error: 'id-Feld fehlt' });
  }
  if (!body.name || typeof body.name !== 'string') {
    return res.status(400).json({ error: 'name-Feld fehlt' });
  }
  const now = Date.now();
  const game = {
    id: body.id,
    emoji: typeof body.emoji === 'string' ? body.emoji : '🎲',
    name: body.name,
    description: typeof body.description === 'string' ? body.description : '',
    materialTags: Array.isArray(body.materialTags) ? body.materialTags.filter((t: any) => typeof t === 'string') : [],
    setting: typeof body.setting === 'string' ? body.setting : 'tisch',
    noiseLevel: typeof body.noiseLevel === 'string' ? body.noiseLevel : 'leise',
    scoringType: typeof body.scoringType === 'string' ? body.scoringType : 'countIn60s',
    scoringNote: typeof body.scoringNote === 'string' ? body.scoringNote : '',
    isSeed: body.isSeed === true,
    archived: body.archived === true,
    createdAt: typeof body.createdAt === 'number' ? body.createdAt : now,
    updatedAt: now,
  };
  if (await ensureDraftDbConnection()) {
    try {
      await saveCozyGameToDB(game);
      return res.json(game);
    } catch (err) {
      console.error('[cozygames] POST failed:', err);
      return res.status(500).json({ error: 'Fehler beim Speichern' });
    }
  }
  res.status(503).json({ error: 'DB nicht verfügbar' });
});

app.put('/api/cozygames/:id', requirePin, async (req, res) => {
  const body = req.body ?? {};
  const id = req.params.id;
  if (!(await ensureDraftDbConnection())) {
    return res.status(503).json({ error: 'DB nicht verfügbar' });
  }
  const existing = await getCozyGameFromDB(id);
  if (!existing) return res.status(404).json({ error: 'Spiel nicht gefunden' });
  const merged = {
    ...existing,
    ...body,
    id,                                 // id darf nicht überschrieben werden
    isSeed: existing.isSeed === true,   // isSeed-Flag bleibt erhalten (Source-of-Truth-Marker)
    createdAt: existing.createdAt,      // createdAt nicht überschreibbar
    updatedAt: Date.now(),
  };
  try {
    await saveCozyGameToDB(merged);
    res.json(merged);
  } catch (err) {
    console.error('[cozygames] PUT failed:', err);
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
});

app.delete('/api/cozygames/:id', requirePin, async (req, res) => {
  if (!(await ensureDraftDbConnection())) {
    return res.status(503).json({ error: 'DB nicht verfügbar' });
  }
  const existing = await getCozyGameFromDB(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Spiel nicht gefunden' });
  // V1-Seed-Spiele werden nicht hart gelöscht — nur via archived=true ausgeblendet.
  if (existing.isSeed === true) {
    const archived = { ...existing, archived: true, updatedAt: Date.now() };
    await saveCozyGameToDB(archived);
    return res.json({ ok: true, archived: true });
  }
  const ok = await deleteCozyGameFromDB(req.params.id);
  res.json({ ok });
});

// QQ Game Results — history & stats
app.get('/api/qq/results', async (_req, res) => {
  try {
    const results = await getQQGameResults(100);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden der Spielergebnisse' });
  }
});

// QQ Leaderboard — aggregated wins + recent games
app.get('/api/qq/leaderboard', async (_req, res) => {
  try {
    const allResults = await getQQGameResults(200);
    // 2026-05-07 (Wolf 'ESC-Teams sollen nicht in den All-Tabellen erscheinen'):
    // Eurovision-Edition-Spiele werden weiterhin in der DB persistiert
    // (Summary funktioniert per roomCode-Lookup), aber aus den aggregierten
    // Leaderboard-/Recent-Tabellen rausgefiltert. So bleibt die Pub-Quiz-
    // Stats-Liste sauber, ohne dass Wolf manuell resetten muss.
    const results = allResults.filter((r: any) => !r?.eurovisionMode);
    const wins: Record<string, number> = {};
    const gamesPlayed: Record<string, number> = {};
    // 2026-04-28: pro Name auch avatarId + lastPlayedAt mitspeichern, damit
    // die Beamer-Bestenliste Avatare und 'hat gespielt am'-Datum zeigen kann.
    // Wir nehmen die avatarId des JÜNGSTEN Auftritts (Teams können Avatare
    // wechseln zwischen Spielen).
    const avatarById: Record<string, string | null> = {};
    const lastPlayedAt: Record<string, number> = {};
    // Results sind nach playedAt DESC sortiert (frischeste zuerst) — siehe
    // getQQGameResults. Daher 'first wins' für avatarId/lastPlayedAt.
    for (const r of results) {
      if (Array.isArray(r.teams)) {
        for (const t of r.teams) {
          if (t?.name) {
            gamesPlayed[t.name] = (gamesPlayed[t.name] || 0) + 1;
            if (avatarById[t.name] === undefined && t.avatarId) {
              avatarById[t.name] = t.avatarId;
            }
            if (lastPlayedAt[t.name] === undefined && typeof r.playedAt === 'number') {
              lastPlayedAt[t.name] = r.playedAt;
            }
          }
        }
      }
      if (r.winner) wins[r.winner] = (wins[r.winner] || 0) + 1;
    }
    const leaderboard = Object.entries(wins)
      .map(([name, w]) => ({
        name,
        wins: w,
        games: gamesPlayed[name] || w,
        avatarId: avatarById[name] ?? null,
        lastPlayedAt: lastPlayedAt[name] ?? null,
      }))
      .sort((a, b) => b.wins - a.wins || b.games - a.games)
      .slice(0, 10);
    const recent = results.slice(0, 5).map(r => ({
      winner: r.winner,
      teams: Array.isArray(r.teams) ? r.teams.map((t: any) => ({ name: t.name, score: t.score })) : [],
      playedAt: r.playedAt,
      draftTitle: r.draftTitle,
    }));

    // ── Fun stats ────────────────────────────────────────────────────────
    // Highest single-team score ever
    let highestScore: { teamName: string; score: number; draftTitle: string } | null = null;
    // Closest game (smallest score gap between 1st and 2nd)
    let closestGame: { teams: string[]; gap: number; draftTitle: string } | null = null;
    // Win streak (consecutive wins by same team, most recent)
    let winStreak: { teamName: string; streak: number } | null = null;
    // Most games played
    let mostGames: { teamName: string; games: number } | null = null;
    // Fastest answer (smallest submittedAt - questionStart proxy)
    let fastestAnswer: { teamName: string; text: string; questionText: string; ms: number } | null = null;
    // Funny answers (random pick from all marked funny answers)
    const allFunny: Array<{ teamName: string; text: string; questionText: string }> = [];

    // ── Neue Stats: Aggregate per Team ─────────────────────────────────────
    const jokerTotals: Record<string, number> = {};
    const stealTotals: Record<string, number> = {};
    // Kategorie-Meister: teamName → category → correct count
    const catCorrect: Record<string, Record<string, number>> = {};
    // Bunte-Tüte Hot-Potato: teamName → correct count
    const potatoCorrect: Record<string, number> = {};
    // Comeback-King: Team wurde letzter zur Halbzeit aber gewann
    const comebackWins: Record<string, number> = {};
    // Perfekte Runden: Team hatte eine komplette Runde korrekt
    const perfectRounds: Array<{ teamName: string; draftTitle: string; playedAt: number }> = [];
    // Speed-Demon: kumulative Ränge bei korrekten Antworten (1 = schnellstes korrekt)
    const speedRankSum: Record<string, number> = {};
    const speedRankCount: Record<string, number> = {};

    // Heute-Filter
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayStart = startOfDay.getTime();
    let todayGames = 0;
    let todayHighlight: { teamName: string; score: number; draftTitle: string } | null = null;
    const todayWinners: string[] = [];

    for (const r of results) {
      const teams = Array.isArray(r.teams) ? r.teams : [];
      // Today-Filter
      const isToday = typeof r.playedAt === 'number' && r.playedAt >= todayStart && r.playedAt <= now;
      if (isToday) {
        todayGames += 1;
        if (r.winner) todayWinners.push(r.winner);
        for (const t of teams) {
          if (t?.score != null && t.name && (!todayHighlight || t.score > todayHighlight.score)) {
            todayHighlight = { teamName: t.name, score: t.score, draftTitle: r.draftTitle ?? '' };
          }
        }
      }
      // Joker / Steal per-team Aggregate
      for (const t of teams) {
        if (!t?.name) continue;
        if (typeof t.jokersEarned === 'number') {
          jokerTotals[t.name] = (jokerTotals[t.name] || 0) + t.jokersEarned;
        }
        if (typeof t.stealsUsed === 'number') {
          stealTotals[t.name] = (stealTotals[t.name] || 0) + t.stealsUsed;
        }
      }
      // Highest score
      for (const t of teams) {
        if (t?.score != null && t.name && (!highestScore || t.score > highestScore.score)) {
          highestScore = { teamName: t.name, score: t.score, draftTitle: r.draftTitle ?? '' };
        }
      }
      // Closest game
      if (teams.length >= 2) {
        const sorted = [...teams].filter((t: any) => t?.score != null).sort((a: any, b: any) => b.score - a.score);
        if (sorted.length >= 2) {
          const gap = (sorted[0] as any).score - (sorted[1] as any).score;
          if (!closestGame || gap < closestGame.gap) {
            closestGame = {
              teams: [(sorted[0] as any).name, (sorted[1] as any).name],
              gap,
              draftTitle: r.draftTitle ?? '',
            };
          }
        }
      }
      // Funny answers
      if (Array.isArray((r as any).funnyAnswers)) {
        for (const fa of (r as any).funnyAnswers) {
          if (fa?.teamName && fa?.text) {
            allFunny.push({ teamName: fa.teamName, text: fa.text, questionText: fa.questionText ?? '' });
          }
        }
      }
      // Fastest answer from questionHistory + Kategorie-Meister + Hot-Potato-Boss + Speed-Demon
      if (Array.isArray((r as any).questionHistory)) {
        const qh_arr = (r as any).questionHistory as any[];
        // teamId → teamName Lookup für diese Partie
        const idToName: Record<string, string> = {};
        for (const t of teams) {
          if (t?.id && t.name) idToName[t.id] = t.name;
        }
        for (const qh of qh_arr) {
          if (!Array.isArray(qh?.answers) || qh.answers.length === 0) continue;
          const firstAnswer = qh.answers.reduce((min: any, a: any) =>
            a.submittedAt < min.submittedAt ? a : min, qh.answers[0]);
          // Approximate speed: difference between first and second answer, or just use raw submittedAt as proxy
          // We use the fastest answer relative to question start (submittedAt itself is absolute ms timestamp)
          // Compare answers within same question: fastest = smallest submittedAt
          if (qh.answers.length >= 2) {
            const sortedAns = [...qh.answers].sort((a: any, b: any) => a.submittedAt - b.submittedAt);
            const speedMs = sortedAns[1].submittedAt - sortedAns[0].submittedAt;
            if (speedMs > 0 && (!fastestAnswer || speedMs < fastestAnswer.ms)) {
              // The fastest team beat the second by this margin
              fastestAnswer = {
                teamName: sortedAns[0].teamName ?? sortedAns[0].teamId,
                text: sortedAns[0].text,
                questionText: qh.questionText ?? '',
                ms: speedMs,
              };
            }
          }

          // Kategorie-Meister + Hot-Potato-Boss: Korrekte Antworten pro Team + Kategorie zählen
          const winners: string[] = Array.isArray(qh.correctTeamIds) && qh.correctTeamIds.length > 0
            ? qh.correctTeamIds
            : (qh.correctTeamId ? [qh.correctTeamId] : []);
          const cat: string | undefined = qh.category ?? qh.categoryId;
          const isHotPotato = cat === 'BUNTE_TUETE' && (qh.bunteTuete?.kind === 'hotPotato');
          for (const wid of winners) {
            const wname = idToName[wid] ?? wid;
            if (cat) {
              catCorrect[wname] ??= {};
              catCorrect[wname][cat] = (catCorrect[wname][cat] || 0) + 1;
            }
            if (isHotPotato) {
              potatoCorrect[wname] = (potatoCorrect[wname] || 0) + 1;
            }
          }

          // Speed-Demon: welches korrekte Team war das SCHNELLSTE korrekte
          if (winners.length > 0) {
            const correctAnswers = qh.answers
              .filter((a: any) => winners.includes(a.teamId))
              .sort((a: any, b: any) => a.submittedAt - b.submittedAt);
            correctAnswers.forEach((a: any, rankIdx: number) => {
              const tname = a.teamName ?? idToName[a.teamId] ?? a.teamId;
              speedRankSum[tname] = (speedRankSum[tname] || 0) + (rankIdx + 1);
              speedRankCount[tname] = (speedRankCount[tname] || 0) + 1;
            });
          }
        }

        // Perfekte Runde: für jede Phase / Runde checken, ob ein Team JEDE Frage korrekt hatte
        const byPhase: Record<string, any[]> = {};
        for (const qh of qh_arr) {
          const phase = String(qh.phase ?? qh.round ?? 0);
          byPhase[phase] ??= [];
          byPhase[phase].push(qh);
        }
        for (const [phase, qhs] of Object.entries(byPhase)) {
          if (qhs.length < 3) continue; // zu wenig Fragen = nicht signifikant
          const teamCorrectCount: Record<string, number> = {};
          for (const qh of qhs) {
            const winners: string[] = Array.isArray(qh.correctTeamIds) && qh.correctTeamIds.length > 0
              ? qh.correctTeamIds
              : (qh.correctTeamId ? [qh.correctTeamId] : []);
            for (const wid of winners) {
              teamCorrectCount[wid] = (teamCorrectCount[wid] || 0) + 1;
            }
          }
          for (const [tid, cnt] of Object.entries(teamCorrectCount)) {
            if (cnt === qhs.length) {
              const tname = idToName[tid] ?? tid;
              perfectRounds.push({
                teamName: tname,
                draftTitle: r.draftTitle ?? '',
                playedAt: r.playedAt ?? 0,
              });
            }
          }
        }

        // Comeback-King: Team war vor der letzten Runde letzter, gewann dann trotzdem
        const phases = Object.keys(byPhase).map(p => Number(p)).filter(p => !isNaN(p)).sort((a, b) => a - b);
        if (phases.length >= 2 && r.winner) {
          const lastPhase = phases[phases.length - 1];
          const preLast = phases.slice(0, -1);
          // Score pro Team bis vor der letzten Runde (über jokersEarned + correct als Proxy)
          const preScore: Record<string, number> = {};
          for (const p of preLast) {
            for (const qh of byPhase[String(p)]) {
              const winners: string[] = Array.isArray(qh.correctTeamIds) && qh.correctTeamIds.length > 0
                ? qh.correctTeamIds
                : (qh.correctTeamId ? [qh.correctTeamId] : []);
              for (const wid of winners) {
                const tname = idToName[wid] ?? wid;
                preScore[tname] = (preScore[tname] || 0) + 1;
              }
            }
          }
          const preEntries = teams
            .map((t: any) => ({ name: t?.name, score: preScore[t?.name] ?? 0 }))
            .filter((x: any) => !!x.name);
          if (preEntries.length >= 2) {
            const minScore = Math.min(...preEntries.map((x: any) => x.score));
            const isLoserBeforeLast = preEntries.some((x: any) => x.name === r.winner && x.score === minScore);
            if (isLoserBeforeLast && preEntries.length > 2 && minScore < Math.max(...preEntries.map((x: any) => x.score))) {
              comebackWins[r.winner] = (comebackWins[r.winner] || 0) + 1;
            }
          }
        }
      }
    }

    // Win streak (from most recent games backwards)
    if (results.length > 0) {
      const recentWinners = results.map(r => r.winner).filter(Boolean) as string[];
      if (recentWinners.length > 0) {
        // Find longest streak for any team
        const streaks: Record<string, number> = {};
        let currentTeam = recentWinners[0];
        let currentStreak = 1;
        streaks[currentTeam] = 1;
        for (let i = 1; i < recentWinners.length; i++) {
          if (recentWinners[i] === currentTeam) {
            currentStreak++;
            if (currentStreak > (streaks[currentTeam] || 0)) streaks[currentTeam] = currentStreak;
          } else {
            currentTeam = recentWinners[i];
            currentStreak = 1;
            if (!streaks[currentTeam] || 1 > streaks[currentTeam]) streaks[currentTeam] = 1;
          }
        }
        const best = Object.entries(streaks).sort((a, b) => b[1] - a[1])[0];
        if (best && best[1] >= 2) {
          winStreak = { teamName: best[0], streak: best[1] };
        }
      }
    }

    // Most games
    const mostGamesEntry = Object.entries(gamesPlayed).sort((a, b) => b[1] - a[1])[0];
    if (mostGamesEntry && mostGamesEntry[1] >= 2) {
      mostGames = { teamName: mostGamesEntry[0], games: mostGamesEntry[1] };
    }

    // Pick up to 3 random funny answers
    const funnyPicks = allFunny.length <= 3 ? allFunny
      : allFunny.sort(() => Math.random() - 0.5).slice(0, 3);

    // Joker-King / Steal-Master
    const pickTop = (m: Record<string, number>, min = 1): { teamName: string; total: number } | null => {
      const sorted = Object.entries(m).sort((a, b) => b[1] - a[1]);
      if (sorted.length === 0 || sorted[0][1] < min) return null;
      return { teamName: sorted[0][0], total: sorted[0][1] };
    };
    const jokerKing = pickTop(jokerTotals, 1);
    const stealMaster = pickTop(stealTotals, 1);
    const potatoBoss = pickTop(potatoCorrect, 2);

    // Kategorie-Meister: Top-3 Teams, für jedes seine stärkste Kategorie
    const categoryMasters: Array<{ teamName: string; category: string; count: number }> = [];
    const teamTotals: Array<[string, number]> = Object.entries(catCorrect)
      .map(([name, cats]) => [name, Object.values(cats).reduce((a, b) => a + b, 0)] as [string, number])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    for (const [name] of teamTotals) {
      const cats = catCorrect[name];
      const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
      if (topCat && topCat[1] >= 2) {
        categoryMasters.push({ teamName: name, category: topCat[0], count: topCat[1] });
      }
    }

    // Perfekte Runden: neueste 5
    const perfectRoundsOut = perfectRounds
      .sort((a, b) => b.playedAt - a.playedAt)
      .slice(0, 5)
      .map(x => ({ teamName: x.teamName, draftTitle: x.draftTitle }));

    // Speed-Demon: Team mit bestem (niedrigstem) durchschnittlichen Rang bei korrekten Antworten,
    // gewichtet mit mindestens 5 Korrekten um Einzelausreißer zu vermeiden
    let speedDemon: { teamName: string; avgRank: number; samples: number } | null = null;
    for (const [name, sum] of Object.entries(speedRankSum)) {
      const cnt = speedRankCount[name] || 0;
      if (cnt < 5) continue;
      const avg = sum / cnt;
      if (!speedDemon || avg < speedDemon.avgRank) {
        speedDemon = { teamName: name, avgRank: avg, samples: cnt };
      }
    }

    // Comeback-King
    const comebackKing = pickTop(comebackWins, 1);

    // Underdog: Team mit weniger als 3 Spielen aber mindestens 1 Sieg
    let underdog: { teamName: string; games: number; wins: number } | null = null;
    for (const [name, w] of Object.entries(wins)) {
      const g = gamesPlayed[name] || w;
      if (g < 3 && w >= 1 && (!underdog || w / g > underdog.wins / underdog.games)) {
        underdog = { teamName: name, games: g, wins: w };
      }
    }

    // Today-Stats
    let todayStats: { games: number; topScore: { teamName: string; score: number; draftTitle: string } | null; topWinner: { teamName: string; wins: number } | null } | null = null;
    if (todayGames >= 1) {
      const twMap: Record<string, number> = {};
      for (const w of todayWinners) twMap[w] = (twMap[w] || 0) + 1;
      const tw = Object.entries(twMap).sort((a, b) => b[1] - a[1])[0];
      todayStats = {
        games: todayGames,
        topScore: todayHighlight,
        topWinner: tw ? { teamName: tw[0], wins: tw[1] } : null,
      };
    }

    res.json({
      leaderboard, recent, totalGames: results.length,
      funStats: {
        highestScore, closestGame, winStreak, mostGames, fastestAnswer, funnyAnswers: funnyPicks,
        jokerKing, stealMaster, potatoBoss, comebackKing, underdog, speedDemon,
        categoryMasters, perfectRounds: perfectRoundsOut, todayStats,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden des Leaderboards' });
  }
});

// QQ Game Results — delete single entry
// 2026-07-27 (Security-Audit): requirePin ergaenzt — vorher unauth, jeder mit der
// URL konnte Ergebnisse loeschen (IDOR) bzw. das ganze Leaderboard wipen.
app.delete('/api/qq/gameresults/:id', requirePin, async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'id fehlt' });
  const deleted = await deleteQQGameResult(id);
  if (!deleted) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json({ ok: true });
});

// QQ Game Results — delete all (reset leaderboard)
app.delete('/api/qq/gameresults', requirePin, async (_req, res) => {
  const count = await deleteAllQQGameResults();
  res.json({ ok: true, deleted: count });
});

// ── QQ Summary ────────────────────────────────────────────────────────────────
// Public, kein PinGate — Spieler scannen den QR-Code nach Game-Over.
app.get('/api/qq/summary/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    // 2026-05-12 (Wolf-Bug 'Summary zeigt falsche Teams'): wenn aktuell ein
    // Spiel im Room laeuft (nicht in GAME_OVER/THANKS), das NEUER ist als der
    // letzte gespeicherte Game-Result fuer diesen RoomCode, lieferten wir
    // sonst stale-Data aus dem vorherigen Spiel. Jetzt: 404 mit Hinweis dass
    // ein Spiel laeuft. Der by-id-Endpoint bleibt der stabile Lookup fuer
    // einzelne Spiele.
    const liveRoom = getQQRoom(roomCode);
    const results = await getQQGameResults(200);
    const hit = results.find((r: any) => r.roomCode === roomCode);
    if (liveRoom && liveRoom.phase !== 'GAME_OVER' && liveRoom.phase !== 'THANKS') {
      const lastActivityAt = (liveRoom as any).lastActivityAt ?? 0;
      const hitPlayedAt = (hit as any)?.playedAt ?? 0;
      // Wenn live-Aktivitaet neuer als das gespeicherte Ergebnis: stale-Antwort
      // verhindern. Spieler-Hinweis: 'Quiz laeuft noch, scan nochmal am Ende'.
      if (lastActivityAt > hitPlayedAt) {
        return res.status(409).json({
          error: 'Quiz läuft noch',
          message: 'Das Spiel ist noch nicht zu Ende. Scan den QR-Code nochmal am Schluss.',
          gameRunning: true,
        });
      }
    }
    if (!hit) return res.status(404).json({ error: 'Kein Ergebnis für diesen Raum gefunden.' });
    // 2026-05-09 (Wolf): Brett wird jetzt auf der Summary-Page angezeigt —
    // Owner-IDs reichen (cellOwners statt full grid), kompakter im Payload.
    const grid = (hit as any).grid as Array<Array<{ ownerId: string | null }>> | undefined;
    const gridSize = grid?.length ?? 0;
    const cellOwners = grid
      ? grid.map(row => row.map(c => c?.ownerId ?? null))
      : null;
    res.json({
      id: hit.id,
      roomCode: hit.roomCode,
      playedAt: hit.playedAt,
      draftTitle: hit.draftTitle,
      winner: hit.winner,
      phases: hit.phases,
      teams: hit.teams ?? [],
      funnyAnswers: hit.funnyAnswers ?? [],
      // 2026-05-07: avatarSetId + avatarSetEmojis durchreichen damit /summary
      // die korrekten Spieler-Emojis rendert (Wolf-Bug 'summary emojis fehlen').
      avatarSetId: hit.avatarSetId ?? 'all',
      avatarSetEmojis: hit.avatarSetEmojis ?? null,
      // 2026-05-09 (Wolf): Brett-Daten für Summary-Render
      gridSize,
      cellOwners,
      // 2026-05-09: 3 End-Awards (Underdog/Meisterklauer/Speedy) durchreichen
      // damit Summary-Page die gleichen Ehrentitel zeigt wie der Recap-Strip.
      endAwards: (hit as any).endAwards ?? null,
      // 2026-07-02 (Mega Event): Modus-Flags + Faktions-Awards durchreichen.
      largeGroupMode: !!(hit as any).largeGroupMode,
      nestedTeams: !!(hit as any).nestedTeams,
      megaAwards: (hit as any).megaAwards ?? null,
      // 2026-05-10 (Wolf-Audit P2): eurovisionMode durchreichen damit Summary
      // im ESC-Mode Hot-Pink (#FF2D7B) statt Standard-Brand-Pink (#EC4899) nutzt.
      eurovisionMode: !!(hit as any).eurovisionMode,
      // 2026-06-25 (Wolf): Bühnen-Skin durchreichen damit Summary in Mono/etc.
      // dieselbe Lackierung zeigt wie der Beamer (applyThemeVars im Frontend).
      themeId: (hit as any).themeId ?? QQ_DEFAULT_THEME_ID,
    });
  } catch (err) {
    console.error('QQ summary error:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Zusammenfassung.' });
  }
});

// 2026-05-10 (Wolf-Bug 'geteilter Spieler-Link wird beim nächsten Spiel
// überschrieben'): Stabiler Summary-Lookup per game-id. Bei
// SINGLE_SESSION_MODE = MAIN recycled der RoomCode pro Spiel — der by-id-
// Endpoint findet auch alte Spiele in der DB stabil (DB hat kein TTL,
// nur das LIMIT(200) in getQQGameResults begrenzt).
app.get('/api/qq/summary/by-id/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const results = await getQQGameResults(200);
    const hit = results.find((r: any) => r.id === gameId);
    if (!hit) return res.status(404).json({ error: 'Kein Ergebnis für diese Spiel-ID gefunden.' });
    const grid = (hit as any).grid as Array<Array<{ ownerId: string | null }>> | undefined;
    const gridSize = grid?.length ?? 0;
    const cellOwners = grid
      ? grid.map(row => row.map(c => c?.ownerId ?? null))
      : null;
    res.json({
      id: hit.id,
      roomCode: hit.roomCode,
      playedAt: hit.playedAt,
      draftTitle: hit.draftTitle,
      winner: hit.winner,
      phases: hit.phases,
      teams: hit.teams ?? [],
      funnyAnswers: hit.funnyAnswers ?? [],
      avatarSetId: hit.avatarSetId ?? 'all',
      avatarSetEmojis: hit.avatarSetEmojis ?? null,
      gridSize,
      cellOwners,
      endAwards: (hit as any).endAwards ?? null,
      largeGroupMode: !!(hit as any).largeGroupMode,
      nestedTeams: !!(hit as any).nestedTeams,
      megaAwards: (hit as any).megaAwards ?? null,
      eurovisionMode: !!(hit as any).eurovisionMode,
      // 2026-06-25 (Wolf): Bühnen-Skin durchreichen damit Summary in Mono/etc.
      // dieselbe Lackierung zeigt wie der Beamer (applyThemeVars im Frontend).
      themeId: (hit as any).themeId ?? QQ_DEFAULT_THEME_ID,
    });
  } catch (err) {
    console.error('QQ summary by-id error:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Zusammenfassung.' });
  }
});

// ── QQ Recap (Mod-only Detail-View, 2026-05-24 Wolf-Live-Test #9) ────────────
// Liefert ALLES was im Game-Result steckt: questionHistory, full grid,
// teamStats. Mod-Reflexions-Tool, nicht für Spieler gedacht.
app.get('/api/qq/recap/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const results = await getQQGameResults(200);
    const hit: any = results.find((r: any) => r.id === gameId);
    if (!hit) return res.status(404).json({ error: 'Kein Spiel mit dieser ID gefunden.' });
    res.json({
      id: hit.id,
      roomCode: hit.roomCode,
      playedAt: hit.playedAt,
      draftTitle: hit.draftTitle,
      winner: hit.winner,
      phases: hit.phases,
      language: hit.language ?? 'both',
      teams: hit.teams ?? [],
      funnyAnswers: hit.funnyAnswers ?? [],
      avatarSetId: hit.avatarSetId ?? 'all',
      avatarSetEmojis: hit.avatarSetEmojis ?? null,
      grid: hit.grid ?? null,
      gridSize: Array.isArray(hit.grid) ? hit.grid.length : 0,
      questionHistory: hit.questionHistory ?? [],
      endAwards: hit.endAwards ?? null,
      largeGroupMode: !!hit.largeGroupMode,
      nestedTeams: !!hit.nestedTeams,
      megaAwards: hit.megaAwards ?? null,
      eurovisionMode: !!hit.eurovisionMode,
    });
  } catch (err) {
    console.error('QQ recap error:', err);
    res.status(500).json({ error: 'Fehler beim Laden des Recaps.' });
  }
});

// ── QQ Feedback ───────────────────────────────────────────────────────────────
// Spieler-Feedback von der Summary-Seite — persistent in MongoDB
// (Render Free Tier hat kein stabiles Filesystem).
type QQFeedbackType = 'bug' | 'feedback' | 'idea' | 'praise';
type QQFeedbackPlayAgain = 'yes' | 'maybe' | 'no';
type QQFeedbackLength = 'short' | 'ok' | 'long';
type QQFeedbackContactIntent = 'date' | 'booking' | 'response';
type QQFeedbackEntry = {
  id: string;
  submittedAt: number;
  roomCode: string | null;
  teamName: string | null;
  rating: number | null;
  text: string;
  contact: string | null;
  // Erweiterte Felder — legacy-Eintraege haben sie schlicht nicht (Mongo strict:false).
  type?: QQFeedbackType;
  playAgain?: QQFeedbackPlayAgain | null;
  favoriteCategory?: string | null;   // QQ category id, z.B. 'MUCHO'
  lengthFeel?: QQFeedbackLength | null;
  surprise?: string | null;
  contactIntent?: QQFeedbackContactIntent[] | null;
};
// ── QQ Crash-Reporting ───────────────────────────────────────────────────────
// Append-only JSON-File für Client-side Crashes (Moderator/Beamer/Team).
// Damit wir sporadische Crashes reproduzieren können.
const qqCrashPath = path.join(__dirname, 'data', 'qqCrashes.json');
const qqCrashMaxEntries = 500;
type QQCrashEntry = {
  id: string;
  ts: number;
  source: string;
  roomCode?: string | null;
  kind: string;
  message: string;
  stack?: string | null;
  componentStack?: string | null;
  url?: string | null;
  userAgent?: string | null;
};
function appendQQCrash(entry: QQCrashEntry): void {
  try {
    const dir = path.dirname(qqCrashPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    let list: QQCrashEntry[] = [];
    if (fs.existsSync(qqCrashPath)) {
      try { list = JSON.parse(fs.readFileSync(qqCrashPath, 'utf-8')); } catch { list = []; }
    }
    list.push(entry);
    if (list.length > qqCrashMaxEntries) list = list.slice(-qqCrashMaxEntries);
    fs.writeFileSync(qqCrashPath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('QQ crash write failed:', err);
  }
}
app.post('/api/qq/crashReport', (req, res) => {
  try {
    const b = req.body ?? {};
    const entry: QQCrashEntry = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      ts: typeof b.ts === 'number' ? b.ts : Date.now(),
      source: String(b.source || 'unknown').slice(0, 40),
      roomCode: b.roomCode ? String(b.roomCode).slice(0, 20) : null,
      kind: String(b.kind || 'unknown').slice(0, 20),
      message: String(b.message || '').slice(0, 2000),
      stack: b.stack ? String(b.stack).slice(0, 8000) : null,
      componentStack: b.componentStack ? String(b.componentStack).slice(0, 8000) : null,
      url: b.url ? String(b.url).slice(0, 500) : null,
      userAgent: b.userAgent ? String(b.userAgent).slice(0, 500) : null,
    };
    console.warn('[QQ CRASH]', entry.source, entry.kind, entry.message, entry.roomCode ?? '');
    // Stack + Component-Stack mitloggen (erste Frames) — sonst steht der eigentliche
    // Crash-Ort nur in qqCrashes.json und nicht in den Coolify-Logs.
    if (entry.stack) console.warn('[QQ CRASH stack]', String(entry.stack).split('\n').slice(0, 4).join(' | '));
    if (entry.componentStack) console.warn('[QQ CRASH component]', String(entry.componentStack).split('\n').slice(0, 4).join(' | '));
    appendQQCrash(entry);
    res.json({ ok: true });
  } catch (err) {
    console.error('QQ crashReport error:', err);
    res.status(500).json({ ok: false });
  }
});

// Admin-Abruf der letzten Client-Crashes (inkl. Stack/componentStack), damit
// minifizierte Prod-Crashes ohne Sentry-Login diagnostizierbar sind.
// GET /api/qq/crashes?pin=XXXX[&q=startsWith][&limit=30]
app.get('/api/qq/crashes', (req, res) => {
  const pin = (req.query.pin as string) ?? req.headers?.['x-admin-pin'];
  if (!pin || pin !== ADMIN_PIN) return res.status(403).json({ error: 'PIN falsch' });
  try {
    let list: QQCrashEntry[] = [];
    if (fs.existsSync(qqCrashPath)) {
      try { list = JSON.parse(fs.readFileSync(qqCrashPath, 'utf-8')); } catch { list = []; }
    }
    const q = req.query.q ? String(req.query.q).toLowerCase() : '';
    if (q) list = list.filter(e =>
      (e.message || '').toLowerCase().includes(q) ||
      (e.stack || '').toLowerCase().includes(q) ||
      (e.componentStack || '').toLowerCase().includes(q));
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '30'), 10) || 30));
    res.json({ ok: true, total: list.length, entries: list.slice(-limit).reverse() });
  } catch (err) {
    console.error('QQ crashes read error:', err);
    res.status(500).json({ ok: false });
  }
});

// ── Dev-only: Fill room with dummy teams for layout testing ──────────────────
// 2026-05-19 (Security-Audit S3): vorher hardcoded true → jeder Pub-Gast
// konnte /dev/fillTeams spammen. NODE_ENV-Gate blockierte aber Wolf-Mod
// in Prod auch.
// 2026-05-20: PIN-Gate statt Env-Gate. Endpoints bleiben in Prod erreichbar,
// brauchen aber den ADMIN_PIN (kommt vom Frontend-Mod-Panel mit Adminrechten).
// Pub-Gaeste sehen 403, Wolf-Mod kann weiter Bots adden.
// In Dev (NODE_ENV !== 'production') wird der PIN-Check ueberspringt fuer
// schnellere Iteration.
function assertDevAccess(req: any, res: any): boolean {
  if (DEV_BYPASS) return true; // dev: kein Check (fail-secure, siehe DEV_BYPASS)
  const pin = req.body?.pin ?? req.query?.pin ?? req.headers?.['x-admin-pin'];
  if (!pin || pin !== ADMIN_PIN) {
    res.status(403).json({ error: 'PIN erforderlich' });
    return false;
  }
  return true;
}
app.post('/api/qq/:roomCode/dev/fillTeams', (req, res) => {
  if (!assertDevAccess(req, res)) return;
  const { roomCode } = req.params;
  const room = getQQRoom(roomCode);
  if (!room) return res.status(404).json({ error: 'Raum nicht gefunden' });
  if (room.phase !== 'LOBBY') return res.status(400).json({ error: 'Nur in Lobby möglich' });
  // Groß-Modus erlaubt QQ_MAX_TEAMS_LARGE Bots (sonst max 8).
  // ⚠️ 2026-08-28: hier standen „bis 25 Bots" und „max 24 (8 Eltern × 3
  // Sub-Teams)". Beide Zahlen sind seit dem 10.07. falsch - der Deckel steht
  // auf 40 (8 Fraktionen a 5). Der CODE war nie falsch, er liest die
  // Konstante; nur die Kommentare und der Wizard-Text behaupteten 25.
  const cap = (room.nestedTeams || room.largeGroupMode) ? QQ_MAX_TEAMS_LARGE : 8;
  const count = Math.min(cap, Math.max(1, Number(req.body?.count) || cap));
  const existing = Object.keys(room.teams).length;
  const toAdd = Math.max(0, count - existing);
  // 2026-05-04: random witzige Pub-Quiz-Namen statt fester DUMMY_NAMES.
  // Pool kommt aus shared/quarterQuizTypes; wir ziehen toAdd Namen ohne Wdh.
  // Schon verwendete Namen im Raum werden uebersprungen (sehr selten Konflikt).
  const usedNames = new Set(Object.values(room.teams).map((t: any) => (t.name ?? '').toLowerCase()));
  // 2026-05-05 (Wolf 'gibts namen auch auf en?'): Sprache aus room.language
  // ableiten — 'both' und 'de' fallen auf DE-Pool, 'en' auf EN-Pool.
  const botLang: 'de' | 'en' = room.language === 'en' ? 'en' : 'de';
  // 2026-05-07 (Wolf 'gib den dummys passende eurovision songcontest namen'):
  // wenn room.theme.eurovisionMode → ESC-Bot-Name-Pool (Douze-Pointer,
  // Couch-Wolves, etc.) statt Standard-Funny-Pool.
  const escBotNames = !!(room.theme as any)?.eurovisionMode;
  const namePicks = getRandomFunnyNames(Math.max(toAdd, 8), botLang, escBotNames)
    .filter(n => !usedNames.has(n.toLowerCase()));
  // 2026-05-07 (Wolf-Bug 'dummys benutzen nicht das gewaehlte Set'): Bot-Avatar-
  // Pool kommt vom Frontend (aktives Set: ESC-Flaggen / MEGA_POOL bei 'all' /
  // Set-Defaults sonst). Bots ziehen ohne Wiederholung; wenn Pool zu klein,
  // Wiederholung erlaubt. Schon belegte Emojis (echte Spieler) werden gefiltert.
  const setAvatarsRaw = Array.isArray(req.body?.setAvatars) ? (req.body.setAvatars as string[]) : [];
  const usedEmojis = new Set(Object.values(room.teams).map((t: any) => t.emoji).filter(Boolean));
  const emojiPool = setAvatarsRaw.filter(e => typeof e === 'string' && e.length > 0 && !usedEmojis.has(e));
  // Shuffle pool damit Bots zufällig wirken (sonst immer dieselbe Reihenfolge)
  for (let i = emojiPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [emojiPool[i], emojiPool[j]] = [emojiPool[j], emojiPool[i]];
  }
  let added = 0;
  const usedAvatars = new Set(Object.values(room.teams).map((t: any) => t.avatarId));
  if (room.nestedTeams) {
    // 2026-07-02 (Idee 2 Test ohne echte Handys): 3 Sub-Teams pro Avatar
    // (= Eltern-Team). Emoji bewusst undefined → alle Sub-Teams eines Avatars
    // zeigen denselben Slot-Default → Eltern-Avatar konsistent. Namen aus dem
    // Funny-Pool (testet Reveal + Lobby-Chips mit variierenden Namen).
    // 2026-07-04 (Wolf 'nur 6 statt 8, zwei mit 6/6 Handys'): bestehende Sub-
    // Team-Anzahl pro Fraktion beachten und IMMER die leerste Fraktion (< 3
    // Handys) zuerst fuellen. Vorher stapelte inkrementelles Nachfuellen
    // (+18 dann +24) 6 neue Handys auf die ersten zwei Fraktionen (6/6) statt
    // Einspruch/Risiko zu fuellen → nur 6 statt 8 Fraktionen sichtbar.
    const countByAv = new Map<string, number>();
    for (const t of Object.values(room.teams)) {
      const av = (t as any).avatarId;
      if (av) countByAv.set(av, (countByAv.get(av) ?? 0) + 1);
    }
    // 2026-07-12 (Wolf '40 eingestellt, nur 24 kamen'): Sub-Teams pro Fraktion
    // dynamisch aus der Zielzahl statt hart 3 → count=40 → 5 pro Fraktion (8×5),
    // 24 → 3, 16 → 2. So erreicht der Bot-Fill den eingestellten Wert (bis Cap 40).
    const perFactionMax = Math.max(1, Math.ceil(count / QQ_AVATARS.length));
    while (added < toAdd) {
      // Fraktion mit den wenigsten Sub-Teams waehlen (QQ_AVATARS-Reihenfolge
      // bei Gleichstand → gleichmaessige Round-Robin-Verteilung ueber alle 8).
      let targetAv: string | null = null;
      let min = perFactionMax;
      for (const av of QQ_AVATARS) {
        const have = countByAv.get(av.id) ?? 0;
        if (have < min) { min = have; targetAv = av.id; }
      }
      if (!targetAv || min >= perFactionMax) break; // alle 8 Fraktionen bis perFactionMax voll
      const have = countByAv.get(targetAv) ?? 0;
      const teamId = `dev-${targetAv}-${have}-${Math.random().toString(36).slice(2, 7)}`;
      // 2026-07-04 (Wolf 'Namen falsch'): Sub-Teams heissen nach der FRAKTION
      // (wie echte Handys via qqJoinTeam:teamName) — NICHT nach dem Funny-Pool.
      // Vorher hatte namePicks[] Vorrang → Bots zeigten Fantasienamen statt
      // Fraktionsnamen, was die Handy-Zuordnung im Moderator verwirrte.
      const name = qqMegaFactionName(targetAv, botLang === 'en' ? 'en' : 'de');
      try {
        // Emoji = Fraktions-Wappen-Slug → Bots zeigen das Wappen wie echte Handys.
        qqJoinTeam(room, teamId, name, targetAv, qqMegaFactionSlug(targetAv));
        if (room.teams[teamId]) (room.teams[teamId] as any)._dummy = true;
        added++;
      } catch { /* Join fehlgeschlagen — Fraktion trotzdem hochzaehlen (kein Loop) */ }
      countByAv.set(targetAv, have + 1);
    }
  } else if (room.largeGroupMode) {
    // Groß-Modus: bis 40 Teams > 8 Avatar-Slots → Slots zyklisch wiederverwenden
    // (qqJoinTeam-Exklusivität ist im Groß-Modus relaxed). Tier/Emoji aus Pool.
    let guard = 0;
    while (added < toAdd && guard < toAdd * 3 + 5) {
      guard++;
      const av = QQ_AVATARS[added % QQ_AVATARS.length];
      const teamId = `dev-${av.id}-${Math.random().toString(36).slice(2, 7)}`;
      const name = namePicks[added] ?? `Team ${added + 1}`;
      const botEmoji = emojiPool[added] ?? undefined;
      try {
        qqJoinTeam(room, teamId, name, av.id, botEmoji);
        if (room.teams[teamId]) (room.teams[teamId] as any)._dummy = true;
        added++;
      } catch { added++; }
    }
  } else {
    // 2026-07-21 (Wolf 'wölfe haben in botrunden noch nicht ihre namen'): bei
    // aktivem Cozy Pack bekommt jeder Bot den Namen UND den Wolf-Slug seines
    // Farb-Slots (slot-gebunden, wie ein echter Spieler beim Wolf-Pick) statt
    // Funny-Pool + geshuffeltem Emoji. Deckt auch den ?run=1-Harness ab, der
    // gar keine setAvatars schickt (room.avatarSetId ist die Quelle).
    const wolfSet = room.avatarSetId === 'cozyWolves';
    for (const av of QQ_AVATARS) {
      if (added >= toAdd) break;
      if (usedAvatars.has(av.id)) continue;
      const teamId = `dev-${av.id}-${Math.random().toString(36).slice(2, 7)}`;
      const wolf = wolfSet ? qqCozyWolfForSlot(av.id) : undefined;
      const name = wolf?.name ?? namePicks[added] ?? `Team ${av.label}`;
      // Bot-Emoji: Cozy-Pack → Slot-Wolf-Slug; sonst Pool oder undefined (= Set-Slot-Default).
      const botEmoji = wolf?.slug ?? emojiPool[added] ?? undefined;
      try {
        qqJoinTeam(room, teamId, name, av.id, botEmoji);
        // Dummies haben keinen Socket — connected-Flag explizit true lassen
        // (markiert sie auch nach eventuellen Reconnect-Checks als „anwesend")
        if (room.teams[teamId]) (room.teams[teamId] as any)._dummy = true;
        added++;
      } catch { /* skip on error (avatar taken etc.) */ }
    }
  }
  // Auch bestehende Dummies sicher auf connected=true halten
  for (const t of Object.values(room.teams) as any[]) {
    if (t._dummy) t.connected = true;
  }
  broadcastQQ(io, roomCode);
  res.json({ added, total: Object.keys(room.teams).length });
});

// Ideen-Inbox: mobil schnell erfassen, ohne daraus sofort eine Quizfrage zu machen.
app.get('/api/qq/ideas', requirePin, async (_req, res) => res.json(await getQQIdeasFromDB()));
app.post('/api/qq/ideas', requirePin, async (req, res) => {
  const body = req.body ?? {};
  if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 2000) return res.status(400).json({ error: 'Bitte beschreibe deine Idee.' });
  const idea = { id: `qq-idea-${Date.now().toString(36)}`, text: body.text.trim(), sourceUrl: typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : '', kind: typeof body.kind === 'string' ? body.kind : 'alltagsfund', notes: typeof body.notes === 'string' ? body.notes : '', status: 'new', createdAt: Date.now(), updatedAt: Date.now() };
  res.json(await saveQQIdeaToDB(idea));
});
app.put('/api/qq/ideas/:id', requirePin, async (req, res) => {
  const existing = (await getQQIdeasFromDB()).find((idea: any) => idea.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Idee nicht gefunden' });
  const body = req.body ?? {};
  const status = ['new', 'research', 'playable', 'tested', 'gold', 'retired'].includes(body.status) ? body.status : existing.status;
  res.json(await saveQQIdeaToDB({ ...existing, ...body, id: existing.id, status, updatedAt: Date.now() }));
});
app.delete('/api/qq/ideas/:id', requirePin, async (req, res) => res.json({ ok: await deleteQQIdeaFromDB(req.params.id) }));

// Entfernt ausschließlich Bot-Teams und nur vor dem Spielstart. Damit kann der
// Test-Modus im Moderator wieder sauber in eine echte, leere Lobby wechseln.
app.post('/api/qq/:roomCode/dev/clearBots', (req, res) => {
  if (!assertDevAccess(req, res)) return;
  const { roomCode } = req.params;
  const room = getQQRoom(roomCode);
  if (!room) return res.status(404).json({ error: 'Raum nicht gefunden' });
  if (room.phase !== 'LOBBY') return res.status(400).json({ error: 'Bots können nur in der Lobby entfernt werden' });

  const botIds = Object.values(room.teams)
    .filter((team: any) => team._dummy)
    .map((team: any) => team.id);
  for (const teamId of botIds) qqKickTeam(room, teamId);
  (room as any).botsPaused = false;
  broadcastQQ(io, roomCode);
  res.json({ removed: botIds.length, total: Object.keys(room.teams).length });
});

app.post('/api/qq/:roomCode/dev/simAnswers', (req, res) => {
  if (!assertDevAccess(req, res)) return;
  const { roomCode } = req.params;
  const room = getQQRoom(roomCode);
  if (!room) return res.status(404).json({ error: 'Raum nicht gefunden' });
  if (room.phase !== 'QUESTION_ACTIVE') return res.status(400).json({ error: 'Nur bei aktiver Frage' });
  const q = room.currentQuestion;
  if (!q) return res.status(400).json({ error: 'Keine Frage geladen' });
  const correctRate = Math.min(1, Math.max(0, Number(req.body?.correctRate ?? 0.6)));
  const stagger = req.body?.stagger !== false; // default: staggered
  // 2026-08-29: `texts` setzt die Abgaben AUSDRUECKLICH, reihum auf die Teams,
  // die noch nichts abgegeben haben. Grund: eine Layout-Falle hing an den
  // Tippwerten (Zahlenstrahl, Kacheln am rechten Rand). Mit gewuerfelten
  // Antworten laesst sie sich nicht reproduzieren, man wiederholt nur den
  // Zufall - und ein Befund, der nicht auf Ansage rot wird, ist keiner.
  const texte: string[] = Array.isArray(req.body?.texts)
    ? req.body.texts.map((x: unknown) => String(x)).filter((x: string) => x.length > 0)
    : [];
  // Für Dummies vor dem Simulieren sicherstellen, dass sie connected sind (sonst bleibt allAnswered=false)
  for (const t of Object.values(room.teams) as any[]) {
    if (t._dummy) t.connected = true;
  }
  // ⚠️ Mit `texts` wird ueberschrieben, nicht ergaenzt. Die Bots antworten von
  // selbst (qqStandardBotAI), also war beim ersten Anlauf ein Teil der Tafel
  // schon gefuellt, und der Filter „hat noch nicht abgegeben" liess genau die
  // gewuerfelten Werte stehen, die man loswerden wollte. Ergebnis: ein Lauf
  // rot, der naechste gruen, mit denselben Vorgaben.
  if (texte.length) room.answers = [];
  const teams = Object.values(room.teams).filter((t: any) => !room.answers.some((a: any) => a.teamId === t.id));

  let texteIdx = 0;
  function pickAnswer(forTeam: any): string {
    if (texte.length) return texte[texteIdx++ % texte.length];
    const beCorrect = Math.random() < correctRate;
    if (q!.category === 'MUCHO' && q!.options) {
      const idx = beCorrect && q!.correctOptionIndex != null
        ? q!.correctOptionIndex
        : Math.floor(Math.random() * q!.options.length);
      return String(idx);
    } else if (q!.category === 'SCHAETZCHEN') {
      const target = q!.targetValue ?? 100;
      const noise = beCorrect ? target * 0.1 : target * (0.5 + Math.random());
      return String(Math.max(0, Math.round(target + (Math.random() - 0.5) * noise * 2)));
    } else if (q!.category === 'ZEHN_VON_ZEHN' && q!.options) {
      const pts = Array(q!.options.length).fill(0);
      let remaining = 10;
      while (remaining > 0) {
        const idx = Math.floor(Math.random() * q!.options.length);
        const give = Math.min(remaining, Math.ceil(Math.random() * 5));
        pts[idx] += give;
        remaining -= give;
      }
      return pts.join(',');
    } else if (q!.category === 'CHEESE' || q!.category === 'BUNTE_TUETE') {
      // 2026-08-23: bei Top 5 und Fix It liegt die Loesung NICHT in `answer`,
      // sondern als Liste in `bunteTuete.answers`. Der Fallback lief deshalb
      // immer auf 'Test', kein Bot hat je getroffen, und die Aufloesungs-Tafel
      // stand in jeder Aufnahme auf null Treffern - also war genau der Teil
      // der Folie unsichtbar, den man pruefen wollte. Wer richtig sein soll,
      // zieht jetzt einen echten Eintrag aus der Liste.
      const liste: string[] = ((q as any).bunteTuete?.answers ?? [])
        .map((x: unknown) => String(x).trim()).filter(Boolean);
      if (beCorrect && liste.length) return liste[Math.floor(Math.random() * liste.length)];
      const fallback = (q as any).correctAnswer || (q as any).answer || 'Test';
      return beCorrect ? String(fallback) : `Dummy ${Math.random().toString(36).slice(2, 6)}`;
    }
    // avoid unused-warning noise
    void forTeam;
    return `Dummy ${Math.random().toString(36).slice(2, 6)}`;
  }

  if (!stagger) {
    // Legacy: alle sofort einfliegen
    let answered = 0;
    for (const t of teams as any[]) {
      try { qqSubmitAnswer(room, t.id, pickAnswer(t)); answered++; } catch { /* skip */ }
    }
    broadcastQQ(io, roomCode);
    return res.json({ answered, staggered: false });
  }

  // Gestaffelt: verteile Submits gleichmäßig über das sichere Fenster, bevor der Timer ausläuft.
  // Sicherheitsmarge: mind. 1.2s vor timerEndsAt, damit der Phasenwechsel uns nicht abschneidet.
  const now = Date.now();
  const rawRemaining = room.timerEndsAt ? room.timerEndsAt - now : 15_000;
  const safeWindow = Math.min(18_000, rawRemaining - 1_200);

  // Zu wenig Zeit übrig → sofort alle submitten
  if (safeWindow < 500 || teams.length === 0) {
    let answered = 0;
    for (const t of teams as any[]) {
      try { qqSubmitAnswer(room, t.id, pickAnswer(t)); answered++; } catch { /* skip */ }
    }
    broadcastQQ(io, roomCode);
    return res.json({ answered, staggered: false, reason: 'timer-too-short' });
  }

  // Gleichmäßig verteilen mit leichtem Jitter (±15% des Slots)
  const slot = safeWindow / teams.length;
  // Reihenfolge shufflen, damit nicht immer Team1 zuerst
  const order = [...teams].sort(() => Math.random() - 0.5);
  order.forEach((t: any, i: number) => {
    const base = 250 + slot * i;
    const jitter = slot * 0.3 * (Math.random() - 0.5);
    const delay = Math.max(250, Math.min(safeWindow, base + jitter));
    setTimeout(() => {
      const live = getQQRoom(roomCode);
      if (!live || live.phase !== 'QUESTION_ACTIVE' || live.currentQuestion?.id !== q.id) return;
      if (live.answers.some((a: any) => a.teamId === t.id)) return;
      try {
        qqSubmitAnswer(live, t.id, pickAnswer(t));
        broadcastQQ(io, roomCode);
      } catch { /* skip */ }
    }, delay);
  });
  res.json({ scheduled: teams.length, staggered: true, windowMs: safeWindow });
});

app.post('/api/qq/:roomCode/dev/autoPlace', (req, res) => {
  if (!assertDevAccess(req, res)) return;
  const { roomCode } = req.params;
  const room = getQQRoom(roomCode);
  if (!room) return res.status(404).json({ error: 'Raum nicht gefunden' });
  if (room.phase !== 'PLACEMENT') return res.status(400).json({ error: 'Nur in PLACEMENT-Phase' });
  const teamId = room.pendingFor;
  const action = room.pendingAction;
  if (!teamId || !action) return res.status(400).json({ error: 'Kein Team zur Platzierung' });

  // Collect free / opponent cells
  const free: Array<{ row: number; col: number }> = [];
  const oppFree: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < room.grid.length; r++) {
    for (let c = 0; c < room.grid[r].length; c++) {
      const cell = room.grid[r][c];
      if (cell.ownerId === null) free.push({ row: r, col: c });
      else if (cell.ownerId !== teamId && !cell.stuck) oppFree.push({ row: r, col: c });
    }
  }

  const pick = (arr: typeof free) => arr[Math.floor(Math.random() * arr.length)];
  let mode: 'place' | 'steal' | null = null;
  let target: { row: number; col: number } | undefined;

  if (action === 'PLACE_1' || action === 'PLACE_2') {
    if (!free.length) return res.status(400).json({ error: 'Kein freies Feld' });
    mode = 'place'; target = pick(free);
  } else if (action === 'STEAL_1') {
    if (!oppFree.length) return res.status(400).json({ error: 'Kein Gegnerfeld' });
    mode = 'steal'; target = pick(oppFree);
  } else if (action === 'FREE' || action === 'COMEBACK') {
    // Prefer placing if possible, else steal
    if (free.length) { mode = 'place'; target = pick(free); }
    else if (oppFree.length) { mode = 'steal'; target = pick(oppFree); }
    else return res.status(400).json({ error: 'Keine g\u00fcltige Option' });
  } else {
    return res.status(400).json({ error: `Action ${action} nicht unterst\u00fctzt` });
  }

  try {
    if (mode === 'place') qqPlaceCell(room, teamId, target!.row, target!.col);
    else qqStealCell(room, teamId, target!.row, target!.col);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Platzierung fehlgeschlagen' });
  }
  broadcastQQ(io, roomCode);
  res.json({ mode, target, team: teamId });
});

// 2026-05-25 (Wolf 'mod-test-modus mit skip-buttons'): Skip-Endpoint fuer
// Test-Modus. Setzt den Game-State direkt auf eine spaetere Phase, ohne
// die Quiz-Fragen durchzuspielen. Grid wird teilweise mit Random-Owner
// gefuellt damit Scores realistisch streuen.
//
// target-Werte:
//   'phase-2' | 'phase-3' | 'phase-4'  → PHASE_INTRO der Ziel-Phase
//   'final-bet'                         → FINAL_BETTING (Intro-Slide aktiv)
//   'final-reveal'                      → FINAL_REVEAL Step 0 (Title-Hold)
//   'game-over'                         → GAME_OVER mit aufgeloestem Endstand
//   'stechen'                           → TIEBREAKER_QUESTION (Schaetz-Stechen)
//
// 2026-08-23: 'game-over' und 'stechen' sind dazugekommen, weil beide Folien
// bis dahin NIE angesehen worden waren. Erreichbar sind sie im echten Ablauf
// nur ueber einen Gleichstand am Spielende, und den kann man nicht bestellen.
// 'stechen' erzwingt deshalb zwei Kandidaten und startet das Stechen; ohne das
// wirft qqStartTieBreaker 'Kein Gleichstand zum Stechen vorhanden'.
//
// KEIN DB-Save — TestMode disabled persistGameResult via separatem Flag.
app.post('/api/qq/:roomCode/dev/skipTo', (req, res) => {
  if (!assertDevAccess(req, res)) return;
  const { roomCode } = req.params;
  const room = getQQRoom(roomCode);
  if (!room) return res.status(404).json({ error: 'Raum nicht gefunden' });
  if (room.phase === 'LOBBY') return res.status(400).json({ error: 'Spiel noch nicht gestartet' });

  const target = String(req.body?.target ?? '');
  const allTeamIds = Object.keys(room.teams);
  if (allTeamIds.length === 0) return res.status(400).json({ error: 'Keine Teams' });

  // Helper: Grid randomly mit ownerIds fuellen (pro skipped Phase ~3 Cells pro Team)
  const fillGrid = (skippedPhases: number) => {
    const cellsPerTeam = Math.max(1, skippedPhases * 3);
    const gridSize = room.grid.length;
    const allCells: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (room.grid[r][c].ownerId === null) allCells.push({ r, c });
      }
    }
    // Shuffle
    for (let i = allCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
    }
    const total = Math.min(allCells.length, allTeamIds.length * cellsPerTeam);
    for (let k = 0; k < total; k++) {
      const { r, c } = allCells[k];
      const ownerId = allTeamIds[k % allTeamIds.length];
      room.grid[r][c].ownerId = ownerId;
    }
  };

  // Helper: Phase-Wechsel ohne qqBeginPhase-Side-Effects
  const goToPhaseIntro = (phaseIdx: number) => {
    const idx = Math.max(1, Math.min(room.totalPhases ?? 4, phaseIdx));
    const skippedPhases = idx - 1;
    fillGrid(skippedPhases);
    // 2026-05-25 (Wolf-Bug 'münzen mitten in der finalen runde'): wenn der
    // Mod im Test-Modus von FINAL_REVEAL zurueck auf phase-X springt, blieben
    // revealStamps auf den Cells haengen → Coins/Stamps tauchten in Phase 4
    // auf. Bei einem Zurueck-Sprung clearen wir alle Reveal-State.
    for (const row of room.grid) {
      for (const cell of row) {
        if (cell.revealStamps) cell.revealStamps = [];
      }
    }
    room.finalRevealPendingStacks = null;
    room.finalRevealStep = 0;
    room.finalBetResolution = null;
    room.finalBets = {};
    room.finalBettingSubmitted = {};
    room.finalPhaseWins = {};
    room.endAwards = null;
    updateTerritories(room);
    room.phase = 'PHASE_INTRO';
    room.gamePhaseIndex = idx as any;
    room.introStep = 0;
    room.questionIndex = (idx - 1) * 5;
    room.currentQuestion = room.questions?.[room.questionIndex] ?? null;
    room.revealedAnswer = null;
    room.correctTeamId = null;
    room.pendingFor = null;
    room.pendingAction = null;
    room.answers = [];
  };

  if (target === 'phase-2' || target === 'phase-3' || target === 'phase-4') {
    const idx = Number(target.slice(-1));
    goToPhaseIntro(idx);
  } else if (target === 'final-bet') {
    // Erst alle Vor-Phasen simulieren (Grid füllen bis kurz vor Final)
    goToPhaseIntro(room.totalPhases ?? 4);
    // Dann FINAL_BETTING starten (qqStartFinalBetting cleart Grid nicht, nur Bet-State)
    try { qqStartFinalBetting(room); } catch {}
    (room as any)._pendingAutoFinalBets = true;
  } else if (target === 'final-reveal' || target === 'game-over' || target === 'stechen') {
    // Full skip bis FINAL_REVEAL Step 0
    goToPhaseIntro(room.totalPhases ?? 4);
    try { qqStartFinalBetting(room); } catch {}
    // Intro sofort durch (qqSubmitFinalBet blockt sonst — siehe Z. 5677)
    (room as any).finalBettingIntroDone = true;
    // Bots zufällige Bets setzen
    const teamIds = allTeamIds;
    for (const id of teamIds) {
      const others = teamIds.filter(t => t !== id);
      const tgt = others[Math.floor(Math.random() * others.length)] ?? id;
      try { qqSubmitFinalBet(room, id, { targetTeamId: tgt }); } catch {}
    }
    // 2026-05-25 (Wolf-Bug 'betting phase wird nicht simuliert, keiner
    // bekommt punkte vom betting'): finalPhaseWins ist 0 fuer alle weil
    // die Final-Phase nicht gespielt wurde → qqResolveFinalBets liefert
    // totalBonus=0 fuer alle. Fix: 5 Final-Fragen mock-simulieren mit
    // 80%-Chance-pro-Frage einen random Winner. Resultiert in 0-3 wins
    // pro Team, was realistische Bet-Bonus-Streuung erzeugt.
    for (const id of teamIds) room.finalPhaseWins[id] = 0;
    for (let i = 0; i < 5; i++) {
      if (Math.random() < 0.8) {
        const winner = teamIds[Math.floor(Math.random() * teamIds.length)];
        room.finalPhaseWins[winner] = (room.finalPhaseWins[winner] ?? 0) + 1;
      }
    }
    // Final-Wager auflösen → setzt phase=FINAL_REVEAL, step=0. Nebenbei fuellt
    // das room.endAwards, und genau die braucht die Siegerehrung.
    try { qqResolveFinalBets(room); } catch {}

    // 2026-08-23: Spielende und Stechen setzen auf demselben Zustand auf. Sie
    // ueberspringen nur die Final-Aufloesung, statt sie nachzubauen - sonst
    // haetten sie eine zweite, leicht abweichende Simulation des Abends.
    if (target === 'game-over' || target === 'stechen') {
      updateTerritories(room);
      room.phase = 'GAME_OVER';
      detectTieBreakerCandidates(room);
    }
    if (target === 'stechen') {
      // Gleichstand erzwingen: die zwei staerksten Teams sind die Kandidaten.
      // Im echten Spiel kommt das aus detectTieBreakerCandidates, hier aus der
      // Rangliste - sonst haengt die Aufnahme daran, ob der Zufall einen Tie
      // erzeugt hat.
      if ((room.tieBreakerCandidates ?? []).length < 2) {
        const nachStaerke = [...allTeamIds].sort(
          (a, b) => ((room.teams as any)[b]?.largestConnected ?? 0)
                  - ((room.teams as any)[a]?.largestConnected ?? 0),
        );
        room.tieBreakerCandidates = nachStaerke.slice(0, 2);
      }
      qqStartTieBreaker(room, 20);
    }
  } else {
    return res.status(400).json({ error: `Unbekanntes target: ${target}` });
  }

  broadcastQQ(io, roomCode);
  res.json({ ok: true, target, phase: room.phase, gamePhaseIndex: room.gamePhaseIndex });
});

// 2026-07-19 (Finale-Score-Audit, dev-only): pro-Team Score-Aufschluesselung, um
// die Bet-Doppelzaehlung zu beweisen (largestConnected inkl. Stamps vs totalBonus).
app.get('/api/qq/:roomCode/dev/dumpScore', (req, res) => {
  if (!assertDevAccess(req, res)) return;
  const room = getQQRoom(req.params.roomCode);
  if (!room) return res.status(404).json({ error: 'Raum nicht gefunden' });
  const aw = room.endAwards;
  const awPts = (id: string) =>
    (aw?.underdog === id ? 2 : 0) + (aw?.meisterklauer === id ? 1 : 0) + (aw?.speedy === id ? 1 : 0);
  const rows = Object.values(room.teams).map((t: any) => {
    const bonus = room.finalBetResolution?.[t.id]?.totalBonus ?? 0;
    let stamps = 0;
    for (const row of room.grid) for (const c of row) {
      if (c.ownerId === t.id && c.revealStamps) stamps += c.revealStamps.length;
    }
    const largest = t.largestConnected ?? 0;
    const ap = awPts(t.id);
    return {
      name: t.name,
      largestConnected: largest,
      totalCells: t.totalCells ?? 0,
      totalBonus: bonus,
      awardPoints: ap,
      stampsOnGrid: stamps,
      finalTotal: largest + bonus + ap, // = qqFinalTotal (FE/BE Single-Source)
    };
  });
  res.json({ phase: room.phase, step: room.finalRevealStep, betSlotsCount: qqBetSlotsCount(room), rows });
});

// 2026-07-19 (Finale-Score-Audit, dev-only): Finale server-seitig N Steps advancen
// (platziert Bet-Stamps via qqFlushPendingStacks) — ohne Moderator-Socket.
app.post('/api/qq/:roomCode/dev/advanceFinal', (req, res) => {
  if (!assertDevAccess(req, res)) return;
  const room = getQQRoom(req.params.roomCode);
  if (!room) return res.status(404).json({ error: 'Raum nicht gefunden' });
  const steps = Math.max(1, Math.min(50, Number(req.body?.steps ?? 1)));
  const from = room.finalRevealStep;
  for (let i = 0; i < steps; i++) {
    if (room.phase !== 'FINAL_REVEAL') break;
    (room as any).__lastFinalAdvanceAt = 0; // Bounce-Guard umgehen fuers Skript
    qqAdvanceFinalReveal(room);
  }
  broadcastQQ(io, req.params.roomCode);
  res.json({ ok: true, from, step: room.finalRevealStep, phase: room.phase });
});

app.post('/api/qq/feedback', async (req, res) => {
  const body = req.body as Partial<QQFeedbackEntry> & { text?: string };
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 2000) : '';
  if (!text) return res.status(400).json({ error: 'Text fehlt.' });

  const typeOk = (v: unknown): v is QQFeedbackType =>
    v === 'bug' || v === 'feedback' || v === 'idea' || v === 'praise';
  const playAgainOk = (v: unknown): v is QQFeedbackPlayAgain =>
    v === 'yes' || v === 'maybe' || v === 'no';
  const lengthOk = (v: unknown): v is QQFeedbackLength =>
    v === 'short' || v === 'ok' || v === 'long';
  const intentOk = (v: unknown): v is QQFeedbackContactIntent =>
    v === 'date' || v === 'booking' || v === 'response';
  const VALID_CATEGORIES = new Set(['SCHAETZCHEN', 'MUCHO', 'BUNTE_TUETE', 'ZEHN_VON_ZEHN', 'CHEESE']);

  const entry: QQFeedbackEntry = {
    id: `qqf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    submittedAt: Date.now(),
    roomCode: typeof body.roomCode === 'string' ? body.roomCode.slice(0, 32) : null,
    teamName: typeof body.teamName === 'string' ? body.teamName.slice(0, 64) : null,
    rating: typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5 ? Math.round(body.rating) : null,
    text,
    contact: typeof body.contact === 'string' ? body.contact.trim().slice(0, 200) : null,
    type: typeOk(body.type) ? body.type : 'feedback',
    playAgain: playAgainOk(body.playAgain) ? body.playAgain : null,
    favoriteCategory: typeof body.favoriteCategory === 'string' && VALID_CATEGORIES.has(body.favoriteCategory)
      ? body.favoriteCategory : null,
    lengthFeel: lengthOk(body.lengthFeel) ? body.lengthFeel : null,
    surprise: typeof body.surprise === 'string' ? body.surprise.trim().slice(0, 500) || null : null,
    contactIntent: Array.isArray(body.contactIntent)
      ? (body.contactIntent.filter(intentOk) as QQFeedbackContactIntent[]).slice(0, 3)
      : null,
  };
  try {
    await saveQQFeedbackToDB(entry);
    res.json({ ok: true, id: entry.id });
  } catch {
    res.status(500).json({ error: 'Feedback konnte nicht gespeichert werden.' });
  }
});
app.get('/api/qq/feedback', requirePin, async (_req, res) => {
  // Security-Audit 2026-07-05 (#4): Kontaktdaten (E-Mail/Telefon aus contactIntent)
  // NICHT mehr offen lesbar. Kein Frontend-Consumer — Wolf ruft mit ?pin=... auf.
  // Neueste zuerst (sort via getQQFeedbackFromDB).
  const list = await getQQFeedbackFromDB(500);
  res.json(list);
});
app.delete('/api/qq/feedback/:id', async (req, res) => {
  const { pin } = req.body as { pin?: string };
  if (pin !== ADMIN_PIN) return res.status(403).json({ error: 'PIN falsch' });
  const ok = await deleteQQFeedbackFromDB(req.params.id);
  res.json({ ok });
});

// ── CozyLibrary: Question Usage ───────────────────────────────────────────────
// 2026-05-11: Map questionId → { usageCount, lastUsedAt, recentUses[] }.
// CozyLibrary nutzt das um pro Frage eine "schon X mal gespielt" Badge + die
// letzten Pubs/Drafts zu zeigen. Bei DB-Down: leeres Objekt (kein 500).
app.get('/api/qq/library/usage', async (_req, res) => {
  if (!isDBConnected()) return res.json({});
  try {
    const map = await getQQUsageMap();
    res.json(map);
  } catch (err) {
    console.error('[/api/qq/library/usage] error:', err);
    res.json({});
  }
});

app.delete('/api/qq/library/usage', async (req, res) => {
  const { pin } = req.body as { pin?: string };
  if (pin !== ADMIN_PIN) return res.status(403).json({ error: 'PIN falsch' });
  const deleted = await clearQQQuestionUsage();
  res.json({ ok: true, deleted });
});

// 2026-07-08 (Wolf): Liste bisher getaggter Locations — Autocomplete im
// Moderator-Setup + „bei Ort X schon gespielt"-Filter in der CozyLibrary.
app.get('/api/qq/venues', async (_req, res) => {
  if (!isDBConnected()) return res.json([]);
  try {
    res.json(await getQQVenues());
  } catch (err) {
    console.error('[/api/qq/venues] error:', err);
    res.json([]);
  }
});

// ── CozyLibrary: Pool-Items ───────────────────────────────────────────────────
// 2026-05-11: Lose Library-Items als Quelle für CozyBuilder-Import.
// GET liefert paginiert + filterbar, POST/PUT/DELETE für Wolf-eigene Items.
app.get('/api/qq/library/items', async (req, res) => {
  if (!isDBConnected()) return res.json({ items: [], total: 0 });
  const { search, category, topic, source, limit, offset } = req.query as Record<string, string>;
  const result = await getQQLibraryItems({
    search, category, topic, source,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  res.json(result);
});

app.get('/api/qq/library/items/:id', async (req, res) => {
  const item = await getQQLibraryItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(item);
});

app.get('/api/qq/library/topics', async (_req, res) => {
  if (!isDBConnected()) return res.json([]);
  const topics = await getQQLibraryTopics();
  res.json(topics);
});

app.post('/api/qq/library/items', requirePin, async (req, res) => {
  const item = req.body;
  if (!item?.id || !item?.category) return res.status(400).json({ error: 'id + category erforderlich' });
  await upsertQQLibraryItem({ ...item, source: item.source || 'wolf' });
  res.json({ ok: true });
});

app.delete('/api/qq/library/items/:id', requirePin, async (req, res) => {
  const { pin } = req.body as { pin?: string };
  if (pin !== ADMIN_PIN) return res.status(403).json({ error: 'PIN falsch' });
  const ok = await deleteQQLibraryItem(req.params.id);
  res.json({ ok });
});

// Re-Seed (admin): überschreibt nur 'seed'-Items, lässt Wolf-eigene unangetastet
app.post('/api/qq/library/reseed', async (req, res) => {
  const { pin } = req.body as { pin?: string };
  if (pin !== ADMIN_PIN) return res.status(403).json({ error: 'PIN falsch' });
  const count = await bulkUpsertQQLibrarySeed(COZY_LIBRARY_SEED);
  res.json({ ok: true, count });
});

// ── TriviaDB-Import (Massen-Pool für 10k+) ────────────────────────────────────
// 2026-05-11: Admin-getriggerter Background-Import. ~5–6k frei lizenzierte
// Trivia-Fragen aus opentdb.com → DeepL-Übersetzung von text+answer → DB.
// Läuft async — Status pollen via GET /api/qq/library/import-status.
app.post('/api/qq/library/import-triviadb', async (req, res) => {
  const { pin, targetCount, translate } = req.body as { pin?: string; targetCount?: number; translate?: boolean };
  if (pin !== ADMIN_PIN) return res.status(403).json({ error: 'PIN falsch' });
  if (!isDBConnected()) return res.status(503).json({ error: 'DB nicht verbunden' });
  const status = await runTriviaDbImport({
    targetCount: typeof targetCount === 'number' ? targetCount : 5000,
    translate: translate !== false,
  });
  res.json({ ok: true, status });
});

app.get('/api/qq/library/import-status', (_req, res) => {
  res.json(getImportStatus());
});

// Re-Migration: existierende triviadb-Items nachträglich re-kategorisieren
// (SCHAETZCHEN-Detection für numerische Antworten).
app.post('/api/qq/library/recategorize-triviadb', async (req, res) => {
  const { pin } = req.body as { pin?: string };
  if (pin !== ADMIN_PIN) return res.status(403).json({ error: 'PIN falsch' });
  if (!isDBConnected()) return res.status(503).json({ error: 'DB nicht verbunden' });
  const result = await recategorizeTriviaDbItems();
  res.json({ ok: true, ...result });
});

// Translation-Stats: wieviele Items haben DE-Text, wieviele nur EN.
app.get('/api/qq/library/translation-stats', async (_req, res) => {
  if (!isDBConnected()) return res.json({ total: 0, withDe: 0, withoutDe: 0, deeplKeyPresent: false, deeplKeyType: 'none' });
  const stats = await getTranslationStats();
  res.json(stats);
});

// DeepL-Connection-Test: prueft ob der Key tatsaechlich antwortet (Pro/Free).
app.post('/api/qq/library/test-deepl', async (req, res) => {
  const { pin } = req.body as { pin?: string };
  if (pin !== ADMIN_PIN) return res.status(403).json({ error: 'PIN falsch' });
  const result = await testDeeplConnection();
  res.json(result);
});

// Re-Translate-Pipeline: laeuft durch alle EN-only triviadb-Items und versucht
// DeepL nochmal. Idempotent — bereits uebersetzte Items werden geskippt.
app.post('/api/qq/library/retranslate', async (req, res) => {
  const { pin, maxItems } = req.body as { pin?: string; maxItems?: number };
  if (pin !== ADMIN_PIN) return res.status(403).json({ error: 'PIN falsch' });
  if (!isDBConnected()) return res.status(503).json({ error: 'DB nicht verbunden' });
  const status = await runRetranslate(typeof maxItems === 'number' ? maxItems : 5000);
  res.json({ ok: true, status });
});

app.get('/api/qq/library/retranslate-status', (_req, res) => {
  res.json(getRetranslateStatus());
});

// ── QQ Upcoming Events ────────────────────────────────────────────────────────
// Wolf editiert das File manuell; Summary-Seite liest es für "Nächste Quizze".
const qqUpcomingPath = path.join(__dirname, 'data', 'qqUpcoming.json');
type QQUpcomingEvent = {
  id: string;
  date: string;      // ISO-Datum 'YYYY-MM-DD'
  time?: string;     // 'HH:MM'
  location: string;
  city?: string;
  link?: string;
  note?: string;
};
function loadQQUpcoming(): QQUpcomingEvent[] {
  try {
    if (fs.existsSync(qqUpcomingPath)) return JSON.parse(fs.readFileSync(qqUpcomingPath, 'utf-8'));
  } catch {}
  return [];
}
app.get('/api/qq/upcoming', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const events = loadQQUpcoming()
    .filter(e => !e.date || e.date >= today)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  res.json(events);
});

// Background removal via Cloudinary e_background_removal
app.post('/api/qq/remove-bg', (req, res) => {
  const { imageUrl } = req.body as { imageUrl?: string };
  if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.length > 2048) return res.status(400).json({ error: 'imageUrl fehlt oder ungültig' });
  if (!/^https?:\/\//i.test(imageUrl)) return res.status(400).json({ error: 'Ungültige URL' });
  try {
    // Apply Cloudinary bg removal transformation (requires AI add-on)
    const bgRemovedUrl = imageUrl.includes('/upload/')
      ? imageUrl.replace('/upload/', '/upload/e_background_removal/')
      : imageUrl;
    res.json({ bgRemovedUrl });
  } catch {
    res.status(500).json({ error: 'Fehler bei Hintergrundentfernung' });
  }
});

// ── Quarter Quiz handlers ─────────────────────────────────────────────────────
registerQQHandlers(io);

// End of server module

