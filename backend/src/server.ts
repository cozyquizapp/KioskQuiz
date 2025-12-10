import cors from 'cors';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  AnyQuestion,
  AnswerEntry,
  BingoBoard,
  QuestionPhase,
  QuizCategory,
  QuizTemplate,
  ScreenState,
  SlotTransitionMeta,
  Team,
  SyncStatePayload
} from '../../shared/quizTypes';
import { CATEGORY_CONFIG } from '../../shared/categoryConfig';
import { mixedMechanicMap } from '../../shared/mixedMechanics';
import { questions, questionById } from './data/questions';
import { QuizMeta, Language } from '../../shared/quizTypes';
import { defaultQuizzes } from './data/quizzes';
import { DEBUG, DEFAULT_QUESTION_TIME, ROOM_IDLE_CLEANUP_MS, SLOT_DURATION_MS } from './constants';
import { INTRO_SLIDES } from './config/introSlides';

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
  timerEndsAt: number | null;
  screen: ScreenState;
  questionPhase: QuestionPhase;
  lastActivityAt: number;
  language: Language;
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
type QuestionOverride = { mixedMechanic?: string | null; imageOffsetX?: number; imageOffsetY?: number; logoOffsetX?: number; logoOffsetY?: number };
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
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      roomCode,
      teams: {},
      currentQuestionId: null,
      answers: {},
      quizId: null,
      questionOrder: [],
      remainingQuestionIds: [],
      askedQuestionIds: [],
      teamBoards: {},
      timerEndsAt: null,
      screen: 'lobby',
      questionPhase: 'idle',
      lastActivityAt: Date.now(),
      language: 'de'
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rooms.get(roomCode)!;
};

const touchRoom = (room: RoomState) => {
  room.lastActivityAt = Date.now();
};

const log = (roomCode: string, message: string, ...args: unknown[]) => {
  if (!DEBUG) return;
  console.log(`[${roomCode}] ${message}`, ...args);
};

const generateBingoBoard = (): BingoBoard => {
  const categories: QuizCategory[] = [];
  (['Schaetzchen', 'Mu-Cho', 'Stimmts', 'Cheese', 'GemischteTuete'] as QuizCategory[]).forEach((c) => {
    for (let i = 0; i < 5; i += 1) categories.push(c);
  });
  for (let i = categories.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [categories[i], categories[j]] = [categories[j], categories[i]];
  }
  return categories.map((cat) => ({ category: cat, marked: false }));
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
  if (language === 'both') return `${deVal ?? ''}${deVal && enVal ? ' / ' : ''}${enVal}` as T;
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

const broadcastTeamsReady = (room: RoomState) => {
  const teamsArr = Object.values(room.teams);
  io.to(room.roomCode).emit('teamsReady', { teams: teamsArr });
};

const normalizeString = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

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

const evaluateCurrentQuestion = (room: RoomState): boolean => {
  if (!room.currentQuestionId) return false;
  if (room.questionPhase === 'evaluated' || room.questionPhase === 'revealed') return false;
  const question = questionById.get(room.currentQuestionId);
  if (!question) return false;

  let bestDeviation: number | null = null;
  if (question.mechanic === 'estimate') {
    // Ermittelt das Team mit der geringsten Abweichung
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
    bestDeviation = Number.isFinite(minDiff) ? minDiff : null;
    Object.entries(room.answers).forEach(([teamId, ans]) => {
      const p = parsed.find((x) => x.teamId === teamId);
      const isCorrect = p ? p.diff === minDiff : false;
      room.answers[teamId] = { ...ans, isCorrect, deviation: p?.diff ?? null, bestDeviation };
    });
  } else {
    Object.entries(room.answers).forEach(([teamId, ans]) => {
      room.answers[teamId] = { ...ans, isCorrect: evaluateAnswer(question, ans.value) };
    });
  }

  room.questionPhase = 'evaluated';
  room.timerEndsAt = null;
  const solution = formatSolution(question, room.language);
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
  const template = quizzes.get(quizId)!;
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
  room.screen = 'lobby';
  room.questionPhase = 'answering';
  broadcastTeamsReady(room);

  io.to(roomCode).emit('quizSelected', { quizId, remaining: room.remainingQuestionIds.length });
  return res.json({ ok: true, quizId, remaining: room.remainingQuestionIds.length });
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
  room.screen = 'slot';
  room.questionPhase = 'answering';

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
  }, SLOT_DURATION_MS);

  if (res) {
    res.json({
      ok: true,
      questionId,
      remaining: remainingOverride ?? room.remainingQuestionIds.length
    });
  }
};

app.post('/api/rooms/:roomCode/next-question', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  touchRoom(room);
  if (!room.quizId || room.remainingQuestionIds.length === 0) {
    return res.status(400).json({ error: 'Keine Fragen mehr oder kein Quiz gesetzt' });
  }
  const nextId = room.remainingQuestionIds.shift();
  if (!nextId) {
    return res.status(400).json({ error: 'Keine naechste Frage gefunden' });
  }
  startQuestionWithSlot(room, nextId, room.remainingQuestionIds.length, res);
  Object.values(room.teams).forEach((t) => (t.isReady = false));
  broadcastTeamsReady(room);
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
  res.json({ ok: true, slotMeta });
});

// Intro-Slides auf Beamer schicken
app.post('/api/rooms/:roomCode/show-intro', (req, res) => {
  const { roomCode } = req.params;
  const room = ensureRoom(roomCode);
  touchRoom(room);
  room.screen = 'intro' as ScreenState;
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

  // Rejoin explizit per teamId erlauben
  if (teamId && room.teams[teamId]) {
    room.teams[teamId].name = teamName;
    if (!room.teamBoards[teamId]) room.teamBoards[teamId] = generateBingoBoard();
    broadcastTeamsReady(room);
    return res.json({ team: room.teams[teamId], roomCode, board: room.teamBoards[teamId] });
  }

  // Falls Name bereits existiert: bestehendes Team zurückgeben (für Rejoin per Name)
  const existingByName = Object.values(room.teams).find((t) => t.name === teamName);
  if (existingByName) {
    if (!room.teamBoards[existingByName.id]) room.teamBoards[existingByName.id] = generateBingoBoard();
    broadcastTeamsReady(room);
    return res.json({ team: existingByName, roomCode, board: room.teamBoards[existingByName.id] });
  }

  // Immer neues Team anlegen (keine Wiederverwendung nur nach Name)
  const newTeam: Team = { id: uuid(), name: teamName, score: 0, isReady: false };
  room.teams[newTeam.id] = newTeam;
  room.teamBoards[newTeam.id] = generateBingoBoard();
  broadcastTeamsReady(room);
  return res.status(201).json({ team: newTeam, roomCode, board: room.teamBoards[newTeam.id] });
});

// Antworten (speichern, keine Auto-Evaluation)
app.post('/api/rooms/:roomCode/answer', (req, res) => {
  const { roomCode } = req.params;
  const { teamId, answer } = req.body as { teamId?: string; answer?: unknown };
  const room = ensureRoom(roomCode);
  touchRoom(room);
  if (!room.currentQuestionId) return res.status(400).json({ error: 'Keine aktive Frage' });
  if (!teamId || !room.teams[teamId]) return res.status(400).json({ error: 'Team unbekannt' });

  room.answers[teamId] = { value: answer };
  io.to(roomCode).emit('answerReceived', { teamId });
  io.to(roomCode).emit('beamer:team-answer-update', { teamId, hasAnswered: true });

  const teamCount = Object.keys(room.teams).length;
  const answerCount = Object.keys(room.answers).length;
  if (teamCount > 0 && answerCount >= teamCount && room.timerEndsAt) {
    room.timerEndsAt = null;
    io.to(roomCode).emit('timerStopped');
    evaluateCurrentQuestion(room);
  }

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
  if (!room.currentQuestionId) return res.status(400).json({ error: 'Keine aktive Frage' });
  const question = questionById.get(room.currentQuestionId);
  if (!question) return res.status(400).json({ error: 'Frage nicht gefunden' });

  // Falls noch nicht ausgewertet, zuerst bewerten
  if (room.questionPhase === 'answering') {
    evaluateCurrentQuestion(room);
  }
  if (room.questionPhase === 'revealed') {
    return res.json({ ok: true, answers: room.answers, teams: room.teams });
  }

  const points = (question as any).points ?? 1;
  Object.entries(room.answers).forEach(([teamId, ans]) => {
    const isCorrect = ans.isCorrect ?? evaluateAnswer(question, ans.value);
    const deviation = ans.deviation ?? null;
    const bestDeviation = ans.bestDeviation ?? null;
    room.answers[teamId] = { ...ans, isCorrect, deviation, bestDeviation };
    if (isCorrect && room.teams[teamId]) {
      room.teams[teamId].score = (room.teams[teamId].score ?? 0) + points;
    }
    io.to(roomCode).emit('teamResult', { teamId, isCorrect, deviation, bestDeviation });
  });

  room.questionPhase = 'revealed';
  io.to(roomCode).emit('scoreUpdated');
  io.to(roomCode).emit('evaluation:revealed');
  return res.json({ ok: true, answers: room.answers, teams: room.teams });
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
    io.to(roomCode).emit('scoreUpdated');
    return res.json({ ok: true });
  }

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
  io.to(roomCode).emit('bingoUpdated', { teamId, board });
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
  return res.json({ ok: true, language });
});

// Frage-Metadaten setzen (z. B. mixedMechanic)
app.post('/api/questions/:id/meta', (req, res) => {
  const { id } = req.params;
  const { mixedMechanic } = req.body as { mixedMechanic?: string | null };
  if (!id || !questionById.has(id)) return res.status(404).json({ error: 'Frage nicht gefunden' });
  const question = questionById.get(id)!;
  if (mixedMechanic && question.category !== 'GemischteTuete') {
    return res.status(400).json({ error: 'mixedMechanic nur f?r Gemischte T?te erlaubt' });
  }
  if (!questionOverrideMap[id]) questionOverrideMap[id] = {};
  questionOverrideMap[id].mixedMechanic = mixedMechanic ?? null;
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
    socket.join(roomCode);
    const room = ensureRoom(roomCode);
    const snapshot = buildSyncState(room);
    socket.emit('syncState', snapshot);
  });

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





















