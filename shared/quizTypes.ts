// Zentrale Typdefinitionen für Fragen, Mechaniken und Räume

export type QuizCategory =
  | 'Schaetzchen'
  | 'Mu-Cho'
  | 'Stimmts'
  | 'Cheese'
  | 'GemischteTuete';

export type MixedMechanicId =
  | 'sortieren'
  | 'praezise-antwort'
  | 'wer-bietet-mehr'
  | 'eine-falsch'
  | 'three-clue-race'
  | 'vier-woerter-eins';

export type MixedMechanicDetails =
  | {
      type: 'sortieren';
      items: string[];
      direction: 'north-south' | 'west-east' | 'chronological';
    }
  | {
      type: 'praezise-antwort';
      targetHint?: string;
    }
  | {
      type: 'wer-bietet-mehr';
      topic: string;
      minCount?: number;
    }
  | {
      type: 'eine-falsch';
      statements: string[];
      falseIndex: number;
    }
  | {
      type: 'three-clue-race';
      clues: string[];
      scoring?: { first?: number; second?: number; third?: number };
    }
  | {
      type: 'vier-woerter-eins';
      words: string[];
      solution: string;
    };

export type MechanicType =
  | 'estimate'
  | 'multipleChoice'
  | 'trueFalse'
  | 'imageQuestion'
  | 'sortItems'
  | 'betting'
  | 'custom';

export type DecorationKey =
  | 'moon'
  | 'earth'
  | 'cheese'
  | 'target'
  | 'ruler'
  | 'measuringCup'
  | 'dice'
  | 'questionBag'
  | 'camera'
  | 'filmStrip'
  | 'lightbulb'
  | 'book'
  | 'stopwatch';
// erweiterbar

export interface MediaBlock {
  type: 'image' | 'audio' | 'video';
  url: string;
  alt?: string;
}

export type CozyQuestionType = 'MU_CHO' | 'SCHAETZCHEN' | 'STIMMTS' | 'CHEESE' | 'BUNTE_TUETE';

export interface BunteTueteListItem {
  id: string;
  label: string;
  description?: string;
  mediaUrl?: string;
}

export interface BunteTueteTop5Payload {
  kind: 'top5';
  prompt: string;
  items: BunteTueteListItem[];
  correctOrder: string[];
  scoringMode?: 'position' | 'contains';
  maxPoints?: number;
}

export interface BunteTuetePrecisionStep {
  label: string;
  acceptedAnswers: string[];
  points: number;
}

export interface BunteTuetePrecisionPayload {
  kind: 'precision';
  prompt: string;
  ladder: BunteTuetePrecisionStep[];
  similarityThreshold?: number;
  maxPoints?: number;
}

export interface BunteTueteOneOfEightPayload {
  kind: 'oneOfEight';
  prompt: string;
  statements: Array<{ id: string; text: string; isFalse?: boolean }>;
  chooseMode?: 'letter' | 'id';
  maxPoints?: number;
}

export interface BunteTueteOrderPayload {
  kind: 'order';
  prompt: string;
  items: BunteTueteListItem[];
  criteriaOptions: Array<{ id: string; label: string; direction?: 'asc' | 'desc' | 'custom'; description?: string }>;
  defaultCriteriaId?: string;
  correctByCriteria: Record<string, string[]>;
  partialPoints?: number;
  fullPoints?: number;
  maxPoints?: number;
}

export type BunteTuetePayload =
  | BunteTueteTop5Payload
  | BunteTuetePrecisionPayload
  | BunteTueteOneOfEightPayload
  | BunteTueteOrderPayload;

export interface BunteTueteTop5Submission {
  kind: 'top5';
  order: string[];
}

export interface BunteTuetePrecisionSubmission {
  kind: 'precision';
  text: string;
}

export interface BunteTueteOneOfEightSubmission {
  kind: 'oneOfEight';
  choiceId: string;
}

export interface BunteTueteOrderSubmission {
  kind: 'order';
  order: string[];
  criteriaId?: string;
}

export type BunteTueteSubmission =
  | BunteTueteTop5Submission
  | BunteTuetePrecisionSubmission
  | BunteTueteOneOfEightSubmission
  | BunteTueteOrderSubmission;

export type CozyAnswerValue =
  | string
  | number
  | string[]
  | number[]
  | BunteTueteSubmission
  | null;

export interface BaseQuestion {
  id: string;
  category: QuizCategory;
  mechanic: MechanicType;
  question: string;
  questionEn?: string;
  points: number;
  createdAt?: number; // Unix ms; optional für Sortierung "zuletzt hinzugefügt"
  media?: MediaBlock;
  imageUrl?: string;
  mixedMechanic?: MixedMechanicId; // nur relevant für Gemischte Tüte
  mixedMechanicDetails?: MixedMechanicDetails | null;
  decorationLeft?: DecorationKey | null;
  decorationRight?: DecorationKey | null;
  funFact?: string | null; // Moderationsnotiz / interessanter Fakt
  usedIn?: string[]; // Liste von Quizzes/Vorlagen, in denen die Frage genutzt wurde
  lastUsedAt?: string | null; // ISO-String des letzten Einsatzes
  catalogId?: string; // optionaler Katalog/Tag
  tags?: string[];
  mediaSlots?: { count: number; urls?: string[] }; // z. B. Mixed Bag: Anzahl Bilder
  type?: CozyQuestionType;
  bunteTuete?: BunteTuetePayload | null;
  segmentIndex?: number | null;
}

export interface EstimateQuestion extends BaseQuestion {
  mechanic: 'estimate';
  targetValue: number;
  unit?: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  mechanic: 'multipleChoice';
  options: string[];
  optionsEn?: string[];
  correctIndex: number;
}

export interface TrueFalseQuestion extends BaseQuestion {
  mechanic: 'trueFalse';
  isTrue: boolean;
}

export interface ImageQuestion extends BaseQuestion {
  mechanic: 'imageQuestion';
  answer: string;
  answerEn?: string;
}

export interface SortItemsQuestion extends BaseQuestion {
  mechanic: 'sortItems';
  items: string[];
  itemsEn?: string[];
  correctOrder: string[];
  correctOrderEn?: string[];
  hint?: string;
  hintEn?: string;
}

export interface BettingQuestion extends BaseQuestion {
  mechanic: 'betting'; // Punkte verteilen auf drei Optionen
  options: string[]; // genau 3
  optionsEn?: string[];
  correctIndex: number;
  pointsPool?: number; // default 10
}

export interface BunteTueteQuestion extends BaseQuestion {
  type?: 'BUNTE_TUETE';
  bunteTuete: BunteTuetePayload;
}

export type AnyQuestion =
  | EstimateQuestion
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | ImageQuestion
  | SortItemsQuestion
  | BettingQuestion
  | BunteTueteQuestion;

export interface Team {
  id: string;
  name: string;
  score: number;
  isReady?: boolean;
}

export interface SlotTransitionMeta {
  categoryId: QuizCategory;
  categoryLabel: string;
  categoryIcon: string;
  questionIndex: number;
  totalQuestionsInCategory: number;
  mechanicId?: MixedMechanicId;
  mechanicLabel?: string;
  mechanicShortLabel?: string;
  mechanicIcon?: string;
}

export interface RoomState {
  roomCode: string;
  teams: Record<string, Team>;
  currentQuestionId: string | null;
  answers: Record<string, AnswerEntry>;
  quizId?: string | null;
  remainingQuestionIds: string[];
  teamBoards: Record<string, BingoBoard>;
  timerEndsAt: number | null;
  language?: Language;
  bingoEnabled?: boolean;
}

export type QuizMode = 'ordered' | 'random';

export interface QuizMeta {
  description?: string;
  defaultTimer?: number;
  showTimer?: boolean;
  timerMode?: 'bar' | 'numeric' | 'both';
  allowTeamAnswers?: boolean;
  defaultAnswerType?: 'text' | 'number' | 'multipleChoice';
  useBingo?: boolean;
  notes?: string;
  language?: Language; // TODO(LEGACY): remove when quiz language stored elsewhere
  date?: number;
}

export interface CategoryConfig {
  key: QuizCategory;
  displayName: string;
  shortLabel?: string;
  color?: string;
  icon?: string;
  order?: number;
}

export type Language = 'de' | 'en' | 'both';

export interface QuizBlitzItem {
  id: string;
  prompt?: string;
  mediaUrl?: string;
  answer: string;
  aliases?: string[];
}

export interface QuizBlitzTheme {
  id: string;
  title: string;
  items: QuizBlitzItem[];
}

export type CozyPotatoThemeInput =
  | string
  | {
      id?: string;
      title?: string;
      allowedAnswers?: string[];
      aliases?: Record<string, string[]>;
      allowedNormalized?: string[];
      aliasNormalized?: string[];
    };

export interface QuizTemplate {
  id: string;
  name: string;
  mode: QuizMode;
  questionIds: string[]; // Cozy Quiz 60 nutzt 20 Fragen; Legacy-Templates ggf. 25
  meta?: QuizMeta;
  categories?: Record<QuizCategory, CategoryConfig>;
  blitz?: {
    pool: QuizBlitzTheme[];
  } | null;
  potatoPool?: CozyPotatoThemeInput[] | null;
  enableBingo?: boolean;
}

export interface CozyQuizMeta {
  title: string;
  language: Language;
  date?: number | null;
  description?: string | null;
}

export type CozyQuizDraftStatus = 'draft' | 'published';

export interface CozyQuestionSlotTemplate {
  index: number;
  segmentIndex: 0 | 1;
  type: CozyQuestionType;
  defaultPoints: number;
  label: string;
  bunteKind?: BunteTuetePayload['kind'];
}

export interface CozyQuizDraft {
  id: string;
  meta: CozyQuizMeta;
  questions: AnyQuestion[];
  blitz: { pool: QuizBlitzTheme[] };
  potatoPool: CozyPotatoThemeInput[];
  enableBingo?: boolean;
  createdAt: number;
  updatedAt: number;
  status: CozyQuizDraftStatus;
  lastPublishedAt?: number | null;
}

export interface BingoCell {
  category: QuizCategory;
  marked: boolean;
}

export type BingoBoard = BingoCell[]; // Länge 25

export interface AnswerResult {
  teamId: string;
  isCorrect: boolean;
}

export interface TimerState {
  endsAt: number | null; // Unix ms
  running: boolean;
}

export interface AnswerTieBreaker {
  label: string;
  primary: number;
  secondary?: number;
  detail?: string;
}

export interface AnswerEntry {
  value: unknown;
  isCorrect?: boolean;
  deviation?: number | null; // für Schätzfragen
  bestDeviation?: number | null;
  betPoints?: number;
  betPool?: number;
  awardedPoints?: number | null;
  awardedDetail?: string | null;
  autoGraded?: boolean;
  tieBreaker?: AnswerTieBreaker | null;
}

export interface QuestionMeta {
  globalIndex: number;
  globalTotal: number;
  categoryIndex: number;
  categoryTotal: number;
  categoryKey: QuizCategory;
  categoryName: string;
}

// Client-/Server-UI-Zustände
export type ScreenState = 'lobby' | 'slot' | 'question' | 'finished';
export type QuestionPhase = 'idle' | 'slot' | 'answering' | 'evaluated' | 'revealed';

export type CozyGameState =
  | 'LOBBY'
  | 'INTRO'
  | 'QUESTION_INTRO'
  | 'Q_ACTIVE'
  | 'Q_LOCKED'
  | 'Q_REVEAL'
  | 'SCOREBOARD'
  | 'BLITZ'
  | 'SCOREBOARD_PAUSE'
  | 'POTATO'
  | 'AWARDS'
  | 'RUNDLAUF_PAUSE'
  | 'RUNDLAUF_SCOREBOARD_PRE'
  | 'RUNDLAUF_CATEGORY_SELECT'
  | 'RUNDLAUF_ROUND_INTRO'
  | 'RUNDLAUF_PLAY'
  | 'RUNDLAUF_ROUND_END'
  | 'RUNDLAUF_SCOREBOARD_FINAL'
  | 'SIEGEREHRUNG';

export type PotatoPhase = 'IDLE' | 'BANNING' | 'PLAYING' | 'ROUND_END' | 'DONE';

export interface PotatoConflict {
  type: 'duplicate' | 'similar';
  answer: string;
  normalized: string;
  conflictingAnswer?: string | null;
}

export type PotatoVerdict = 'ok' | 'dup' | 'invalid' | 'timeout' | 'pending';

export interface PotatoAttempt {
  id: string;
  teamId: string;
  text: string;
  normalized: string;
  verdict: PotatoVerdict;
  reason?: string;
  at: number;
  overridden?: boolean;
}

export interface PotatoState {
  phase: PotatoPhase;
  pool: string[];
  bans: Record<string, string[]>;
  banLimits: Record<string, number>;
  selectedThemes: string[];
  roundIndex: number;
  turnOrder: string[];
  activeTeamId: string | null;
  lives: Record<string, number>;
  usedAnswers: string[];
  usedAnswersNormalized: string[];
  lastAttempt?: PotatoAttempt | null;
  deadline?: number | null;
  turnStartedAt?: number | null;
  turnDurationMs?: number | null;
  currentTheme?: string | null;
  lastWinnerId?: string | null;
  pendingConflict?: PotatoConflict | null;
}

export type BlitzPhase = 'IDLE' | 'READY' | 'BANNING' | 'ROUND_INTRO' | 'PLAYING' | 'SET_END' | 'DONE';

export type RundlaufVerdict = 'ok' | 'dup' | 'invalid' | 'timeout' | 'pending';

export interface RundlaufCategoryOption {
  id: string;
  title: string;
}

export interface RundlaufAttempt {
  id: string;
  teamId: string;
  text: string;
  normalized: string;
  verdict: RundlaufVerdict;
  reason?: string;
  at: number;
}

export interface RundlaufState {
  pool: RundlaufCategoryOption[];
  bans: string[];
  selected: RundlaufCategoryOption[];
  pinned?: RundlaufCategoryOption | null;
  topTeamId?: string | null;
  lastTeamId?: string | null;
  roundIndex: number;
  turnOrder: string[];
  activeTeamId: string | null;
  eliminatedTeamIds: string[];
  usedAnswers: string[];
  usedAnswersNormalized: string[];
  lastAttempt?: RundlaufAttempt | null;
  deadline?: number | null;
  turnStartedAt?: number | null;
  turnDurationMs?: number | null;
  currentCategory?: RundlaufCategoryOption | null;
  roundWinners?: string[];
}

export interface BlitzThemeOption {
  id: string;
  title: string;
}

export interface BlitzItemView {
  id: string;
  prompt?: string | null;
  mediaUrl?: string | null;
}

export interface BlitzSetResult {
  correctCount: number;
  pointsAwarded: number;
}

export interface BlitzState {
  phase: BlitzPhase;
  pool: BlitzThemeOption[];
  bans: Record<string, string[]>;
  banLimits: Record<string, number>;
  selectedThemes: BlitzThemeOption[];
  pinnedTheme?: BlitzThemeOption | null;
  topTeamId?: string | null;
  lastTeamId?: string | null;
  setIndex: number;
  deadline?: number | null;
  theme?: BlitzThemeOption | null;
  items: BlitzItemView[];
  submissions: string[];
  results: Record<string, BlitzSetResult>;
  itemIndex?: number;
  itemDeadline?: number | null;
  itemDurationMs?: number | null;
}

export type SyncStatePayload = {
  screen: ScreenState;
  language: Language;
  questionPhase: QuestionPhase;
  timerEndsAt: number | null;
  question: AnyQuestion | null;
  questionMeta: QuestionMeta | null;
  slotMeta?: SlotTransitionMeta | null;
};

export type NextStageHint = 'BLITZ' | 'BLITZ_PAUSE' | 'Q11' | 'POTATO' | 'RUNDLAUF';

export type TeamStatusSnapshot = {
  id: string;
  name: string;
  connected: boolean;
  submitted: boolean;
  isReady?: boolean;
};

export type StateUpdatePayload = {
  roomCode: string;
  state: CozyGameState;
  phase: QuestionPhase;
  currentQuestion: AnyQuestion | null;
  timer: { endsAt: number | null; running: boolean; durationMs?: number | null };
  scores: Array<{ id: string; name: string; score: number }>;
  teamsConnected: number;
  teamStatus?: TeamStatusSnapshot[];
  questionProgress?: { asked: number; total: number };
  potato?: PotatoState | null;
  blitz?: BlitzState | null;
  rundlauf?: RundlaufState | null;
  nextStage?: NextStageHint | null;
  scoreboardOverlayForced?: boolean;
  results?: AnswerAwardSnapshot[];
  warnings?: string[];
  supportsBingo?: boolean;
  config?: {
    potatoAutopilot: boolean;
    potatoTimeoutAutostrike: boolean;
  };
};

export interface AnswerAwardSnapshot {
  teamId: string;
  teamName?: string;
  answer?: unknown;
  isCorrect?: boolean;
  awardedPoints?: number | null;
  awardedDetail?: string | null;
  tieBreaker?: AnswerTieBreaker | null;
}

// Event-Payloads (optional gemeinsame Nutzung)
export type BeamerShowSlotTransitionPayload = SlotTransitionMeta;

export type BeamerShowQuestionPayload = {
  question: AnyQuestion;
  meta?: {
    globalIndex: number;
    globalTotal: number;
    categoryIndex: number;
    categoryTotal: number;
    categoryKey: string;
    categoryName: string;
  } | null;
};

export type TeamShowQuestionPayload = {
  question: AnyQuestion | null;
  totalTime?: number;
};

export type AdminNextQuestionPayload = { roomCode: string };
export type TeamReadyPayload = { roomCode: string; teamId: string; isReady: boolean };


