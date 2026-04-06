// ── Quarter Quiz / Quartier Quiz — Shared Types ──────────────────────────────
// EN: Quarter Quiz  |  DE: Quartier Quiz
// 2–5 teams, territory grid game, 3 phases × 5 questions = 15 total

export type QQLanguage = 'de' | 'en' | 'both';

// ── Categories ────────────────────────────────────────────────────────────────
export type QQCategory =
  | 'SCHAETZCHEN'    // Schätzchen  🍯
  | 'MUCHO'          // Mu-cho      🎵
  | 'BUNTE_TUETE'    // Bunte Tüte  🎁
  | 'ZEHN_VON_ZEHN'  // 10 von 10  🔟
  | 'CHEESE';        // Cheese      🧀

export const QQ_CATEGORIES: QQCategory[] = [
  'SCHAETZCHEN', 'MUCHO', 'BUNTE_TUETE', 'ZEHN_VON_ZEHN', 'CHEESE'
];

export const QQ_CATEGORY_LABELS: Record<QQCategory, { de: string; en: string; emoji: string }> = {
  SCHAETZCHEN:   { de: 'Schätzchen',   en: 'Close Call',    emoji: '🍯' },
  MUCHO:         { de: 'Mu-Cho',       en: 'Mu-Cho',        emoji: '🎵' },
  BUNTE_TUETE:   { de: 'Bunte Tüte',   en: 'Lucky Bag',     emoji: '🎁' },
  ZEHN_VON_ZEHN: { de: 'All In',       en: 'All In',        emoji: '🎰' },
  CHEESE:        { de: 'Picture This', en: 'Picture This',  emoji: '📸' },
};

// ── Bunte Tüte sub-mechanics ──────────────────────────────────────────────────
export type QQBunteTueteKind = 'hotPotato' | 'top5' | 'oneOfEight' | 'order' | 'map';

export const QQ_BUNTE_TUETE_LABELS: Record<QQBunteTueteKind, { de: string; en: string; emoji: string }> = {
  hotPotato:  { de: 'Heiße Kartoffel', en: 'Hot Potato', emoji: '🥔' },
  top5:       { de: 'Top 5',           en: 'Top 5',      emoji: '🏆' },
  oneOfEight: { de: 'Imposter',        en: 'Imposter',   emoji: '🕵️' },
  order:      { de: 'Fix It',          en: 'Fix It',     emoji: '🔀' },
  map:        { de: 'Pin It',          en: 'Pin It',     emoji: '📍' },
};

export const QQ_CATEGORY_COLORS: Record<QQCategory, string> = {
  SCHAETZCHEN:   '#F59E0B',
  MUCHO:         '#3B82F6',
  BUNTE_TUETE:   '#EF4444',
  ZEHN_VON_ZEHN: '#22C55E',
  CHEESE:        '#8B5CF6',
};

// ── Team palette (up to 5 teams) ──────────────────────────────────────────────
export const QQ_TEAM_PALETTE: string[] = [
  '#3B82F6',  // blue
  '#EF4444',  // red
  '#F97316',  // orange
  '#22C55E',  // green
  '#8B5CF6',  // violet
];

// ── Game constants ────────────────────────────────────────────────────────────
export const QQ_PHASES_COUNT          = 3;
export const QQ_QUESTIONS_PER_PHASE   = 5;
export const QQ_TOTAL_QUESTIONS       = QQ_PHASES_COUNT * QQ_QUESTIONS_PER_PHASE; // 15
export const QQ_MAX_STEALS_PER_PHASE  = 2;
export const QQ_MAX_JOKERS_PER_PHASE  = 2;
export const QQ_MAX_TEAMS             = 5;
export const QQ_MIN_TEAMS             = 2;

export function qqGridSize(teamCount: number): number {
  if (teamCount <= 2) return 4;
  if (teamCount === 3) return 5;
  if (teamCount <= 4) return 6;
  return 6; // 5 teams
}

// ── Phase flow ────────────────────────────────────────────────────────────────
export type QQPhase =
  | 'LOBBY'             // Waiting for teams to join + avatar selection
  | 'PHASE_INTRO'       // Animated intro for each phase (1/2/3)
  | 'QUESTION_ACTIVE'   // Question visible, teams answering
  | 'QUESTION_REVEAL'   // Answer shown, winning team about to place
  | 'PLACEMENT'         // Winning team places / steals a cell
  | 'COMEBACK_CHOICE'   // Last-place team picks comeback action before Phase 3
  | 'GAME_OVER';        // Final state, territory winner shown

export type QQGamePhaseIndex = 1 | 2 | 3 | 4;

// ── Grid ──────────────────────────────────────────────────────────────────────
export interface QQCell {
  row: number;
  col: number;
  ownerId: string | null;  // teamId or null = unclaimed
  jokerFormed: boolean;    // this cell is part of a 2×2 already triggered
}

export type QQGrid = QQCell[][];  // [row][col]

// ── Bunte Tüte sub-mechanic payloads ─────────────────────────────────────────

export interface QQBunteTueteTop5 {
  kind: 'top5';
  answers: string[];      // up to 5 correct answers (DE)
  answersEn?: string[];   // EN versions
}

export interface QQBunteTueteOneOfEight {
  kind: 'oneOfEight';
  statements: string[];    // exactly 8 statements (DE)
  statementsEn?: string[]; // EN versions
  falseIndex: number;      // 0-7, which statement is the imposter
}

export interface QQBunteTueteOrder {
  kind: 'order';
  items: string[];         // items to sort (DE)
  itemsEn?: string[];      // EN versions
  correctOrder: number[];  // indices in correct order
  criteria?: string;       // e.g. "nach Größe", "chronologisch"
  criteriaEn?: string;
}

export interface QQBunteTueteMap {
  kind: 'map';
  lat: number;
  lng: number;
  targetLabel?: string;    // e.g. "Jungfernstieg, Hamburg"
}

export interface QQBunteTueteHotPotato {
  kind: 'hotPotato';
  // No extra fields — text/answer from parent QQQuestion
}

export type QQBunteTuetePayload =
  | QQBunteTueteTop5
  | QQBunteTueteOneOfEight
  | QQBunteTueteOrder
  | QQBunteTueteMap
  | QQBunteTueteHotPotato;

// ── Questions ─────────────────────────────────────────────────────────────────
export interface QQQuestion {
  id: string;
  category: QQCategory;
  phaseIndex: QQGamePhaseIndex;
  questionIndexInPhase: number;  // 0-4
  text: string;
  textEn?: string;
  answer: string;
  answerEn?: string;
  image?: QQQuestionImage;
  // SCHAETZCHEN
  targetValue?: number;
  unit?: string;
  unitEn?: string;
  // ZEHN_VON_ZEHN (All In) — 3 options labeled 1/2/3
  options?: string[];
  optionsEn?: string[];
  correctOptionIndex?: number;   // 0, 1, or 2
  optionImages?: (QQOptionImage | null)[];  // per-option images (MUCHO: 4, ZEHN_VON_ZEHN: 3)
  // BUNTE_TUETE — sub-mechanic payload
  bunteTuete?: QQBunteTuetePayload;
}

// ── Per-team per-phase stats ──────────────────────────────────────────────────
export interface QQTeamPhaseStats {
  stealsUsed: number;       // Phase 2: max QQ_MAX_STEALS_PER_PHASE
  jokersEarned: number;     // max QQ_MAX_JOKERS_PER_PHASE this phase
  placementsLeft: number;   // Phase 2 "2 setzen": how many still pending
}

// ── Team ──────────────────────────────────────────────────────────────────────
export interface QQTeam {
  id: string;
  name: string;
  color: string;
  avatarId: string;
  connected: boolean;
  totalCells: number;       // derived: how many cells owned
  largestConnected: number; // derived: largest connected territory (BFS)
}

// ── Comeback action ───────────────────────────────────────────────────────────
export type QQComebackAction = 'PLACE_2' | 'STEAL_1' | 'SWAP_2';

// ── Answer entry ─────────────────────────────────────────────────────────────
export interface QQAnswerEntry {
  teamId: string;
  text: string;
  submittedAt: number;  // ms timestamp — used for fastest-correct ranking
}

// ── Buzz entry (kept for Hot Potato) ─────────────────────────────────────────
export interface QQBuzzEntry {
  teamId: string;
  buzzedAt: number;
}

// ── Image support ──────────────────────────────────────────────────────────────
export type QQImageLayout    = 'none' | 'fullscreen' | 'window-left' | 'window-right' | 'cutout';
export type QQImageAnimation = 'none' | 'float' | 'zoom-in' | 'reveal' | 'slide-in';

export interface QQQuestionImage {
  url: string;
  publicId?: string;
  layout: QQImageLayout;
  animation: QQImageAnimation;
  bgRemovedUrl?: string;
  // Position/transform (set via builder canvas)
  offsetX?: number;   // -100 to 100, percentage offset from center
  offsetY?: number;   // -100 to 100, percentage offset from center
  scale?: number;     // 0.1 to 3.0, default 1.0
  rotation?: number;  // degrees 0-360
  // Visual adjustments
  opacity?: number;       // 0.0 to 1.0, default 1.0
  brightness?: number;    // 0 to 200, default 100 (%)
  contrast?: number;      // 0 to 200, default 100 (%)
  blur?: number;          // 0 to 20, default 0 (px)
  // Animation timing
  animDelay?: number;     // seconds delay before animation starts (0-5)
  animDuration?: number;  // seconds for animation duration (0.1-10)
}

// ── Option image (for MUCHO / ZEHN_VON_ZEHN answer cards) ─────────────────────
export interface QQOptionImage {
  url: string;
  publicId?: string;
  fit?: 'cover' | 'contain';  // default 'cover'
  opacity?: number;            // 0.0 to 1.0, default 1.0 — for text readability
}

// ── QQ Theme (visual customization for beamer) ────────────────────────────────
export type QQThemePreset = 'default' | 'dark' | 'neon' | 'retro' | 'nature' | 'custom';

export interface QQTheme {
  preset: QQThemePreset;
  bgColor?: string;       // background color
  accentColor?: string;   // accent highlight
  textColor?: string;     // primary text
  cardBg?: string;        // card background
  fontFamily?: string;    // e.g. 'Inter' | 'Space Grotesk'
}

export const QQ_THEME_PRESETS: Record<Exclude<QQThemePreset, 'custom'>, QQTheme> = {
  default: { preset: 'default', bgColor: '#0D0A06', accentColor: '#F59E0B', textColor: '#e2e8f0', cardBg: '#1e293b' },
  dark:    { preset: 'dark',    bgColor: '#030712', accentColor: '#6366F1', textColor: '#e2e8f0', cardBg: '#111827' },
  neon:    { preset: 'neon',    bgColor: '#0a0a0a', accentColor: '#00FF88', textColor: '#ffffff', cardBg: '#1a1a2e' },
  retro:   { preset: 'retro',   bgColor: '#1a1423', accentColor: '#FF6B9D', textColor: '#fde68a', cardBg: '#2d1b3d' },
  nature:  { preset: 'nature',  bgColor: '#0a1a0a', accentColor: '#4ADE80', textColor: '#dcfce7', cardBg: '#132a13' },
};

// ── Slide Editor ─────────────────────────────────────────────────────────────
export type QQSlideElementType =
  | 'text' | 'image' | 'rect'
  | 'ph_question' | 'ph_options' | 'ph_category' | 'ph_timer'
  | 'ph_teams' | 'ph_grid' | 'ph_answer' | 'ph_winner'
  | 'ph_phase_name' | 'ph_phase_desc' | 'ph_room_code'
  | 'ph_team_answers'
  | 'ph_question_image' | 'ph_comeback_cards' | 'ph_game_rankings'
  | 'ph_qr_code' | 'ph_counter'
  | 'ph_hot_potato' | 'ph_imposter' | 'ph_answer_count'
  | 'ph_mini_grid' | 'ph_placement_banner' | 'ph_phase_scores'
  | 'animatedAvatar';

export interface QQSlideElement {
  id: string;
  type: QQSlideElementType;
  x: number;           // 0–100 (% of canvas width)
  y: number;           // 0–100 (% of canvas height)
  w: number;           // 0–100 (% of canvas width)
  h: number;           // 0–100 (% of canvas height)
  rotation?: number;
  zIndex?: number;
  opacity?: number;
  // Text
  text?: string;
  fontSize?: number;   // vw-equivalent: % of canvas width
  fontWeight?: number;
  fontFamily?: string; // e.g. 'Nunito', 'Georgia', 'Impact'
  fontStyle?: 'normal' | 'italic';
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
  // Image
  imageUrl?: string;
  objectFit?: 'cover' | 'contain';
  // Shape / background
  background?: string;
  borderRadius?: number;
  border?: string;
  // Entrance animation
  animIn?: 'none' | 'fadeUp' | 'fadeIn' | 'pop' | 'slideLeft' | 'slideRight';
  animDelay?: number;
  animDuration?: number;
  // Animated Avatar (only for type === 'animatedAvatar')
  avatarId?: string; // Which avatar to show
  animType?: 'wiggle' | 'walk' | 'bounce';
  // Animation type for avatar
  avatarAnimDuration?: number; // seconds
  avatarAnimDelay?: number; // seconds
}

export type QQSlideTemplateType =
  | 'LOBBY'
  | 'PHASE_INTRO_1' | 'PHASE_INTRO_2' | 'PHASE_INTRO_3'
  | 'QUESTION_SCHAETZCHEN' | 'QUESTION_MUCHO' | 'QUESTION_BUNTE_TUETE'
  | 'QUESTION_ZEHN' | 'QUESTION_CHEESE'
  | 'REVEAL' | 'PLACEMENT' | 'COMEBACK_CHOICE' | 'GAME_OVER';

export interface QQSlideTemplate {
  type: QQSlideTemplateType;
  background: string;
  elements: QQSlideElement[];
  transitionIn?: 'fade' | 'slideUp' | 'zoom';
  transitionDuration?: number;
}

export type QQSlideTemplates = Partial<Record<QQSlideTemplateType, QQSlideTemplate>>;

// ── QQ Draft (builder) ────────────────────────────────────────────────────────
export interface QQDraft {
  id: string;
  title: string;
  phases: 3 | 4;
  language: QQLanguage;
  questions: QQQuestion[];
  theme?: QQTheme;
  slideTemplates?: QQSlideTemplates;
  createdAt: number;
  updatedAt: number;
}

// ── State broadcast (server → all clients) ────────────────────────────────────
export interface QQStateUpdate {
  roomCode: string;
  phase: QQPhase;
  gamePhaseIndex: QQGamePhaseIndex;
  questionIndex: number;       // 0-14 global
  gridSize: number;
  grid: QQGrid;
  teams: QQTeam[];
  teamPhaseStats: Record<string, QQTeamPhaseStats>;
  currentQuestion: QQQuestion | null;
  revealedAnswer: string | null;
  correctTeamId: string | null;
  pendingFor: string | null;         // teamId that must act (place/steal/comeback)
  pendingAction: QQPendingAction | null;
  comebackTeamId: string | null;
  comebackAction: QQComebackAction | null;
  swapFirstCell: { row: number; col: number } | null;  // for SWAP_2 mid-action
  language: QQLanguage;
  // Timer
  timerDurationSec: number;
  timerEndsAt: number | null;        // ms timestamp, null = not running
  // Answers (all submissions this question)
  answers: QQAnswerEntry[];
  // Buzz queue (ordered by speed, for Hot Potato)
  buzzQueue: QQBuzzEntry[];
  // Hot Potato
  hotPotatoActiveTeamId: string | null;
  hotPotatoEliminated: string[];
  hotPotatoLastAnswer: string | null;   // last submitted answer text (for moderator)
  hotPotatoTurnEndsAt: number | null;   // ms timestamp when current turn expires
  // Imposter (oneOfEight round-robin)
  imposterActiveTeamId: string | null;
  imposterChosenIndices: number[];      // statement indices already chosen (correct ones removed)
  imposterEliminated: string[];         // teamIds eliminated (chose the false statement)
  // Last placed cell — for beamer placement animation
  lastPlacedCell: { row: number; col: number; teamId: string } | null;
  // Settings
  avatarsEnabled: boolean;
  totalPhases: 3 | 4;
  theme?: QQTheme;
  // Draft reference (for slide template lookup on beamer)
  draftId?: string;
}

export type QQPendingAction =
  | 'PLACE_1'    // Phase 1: place 1 cell
  | 'PLACE_2'    // Phase 2: still placing 2 cells (placementsLeft = 1 or 2)
  | 'STEAL_1'    // Phase 2 steal or Phase 3 steal
  | 'FREE'       // Phase 3: place OR steal, team/moderator decides
  | 'COMEBACK';  // before Phase 3: comeback team acts

// ── Socket event payloads (client → server) ───────────────────────────────────
export interface QQJoinModeratorPayload  { roomCode: string; }
export interface QQJoinBeamerPayload     { roomCode: string; }
export interface QQJoinTeamPayload       { roomCode: string; teamId: string; teamName: string; avatarId: string; }

export interface QQStartGamePayload      { roomCode: string; questions: QQQuestion[]; language: QQLanguage; phases: 3 | 4; theme?: QQTheme; draftId?: string; draftTitle?: string; }
export interface QQRevealAnswerPayload   { roomCode: string; }
export interface QQMarkCorrectPayload    { roomCode: string; teamId: string; }
export interface QQMarkWrongPayload      { roomCode: string; }
export interface QQPlaceCellPayload      { roomCode: string; teamId: string; row: number; col: number; }
export interface QQStealCellPayload      { roomCode: string; teamId: string; row: number; col: number; }
export interface QQChooseFreeActionPayload { roomCode: string; teamId: string; action: 'PLACE' | 'STEAL'; }
export interface QQComebackChoicePayload { roomCode: string; teamId: string; action: QQComebackAction; }
export interface QQSwapCellsPayload      { roomCode: string; teamId: string; rowA: number; colA: number; rowB: number; colB: number; }
export interface QQNextQuestionPayload   { roomCode: string; }
export interface QQSetLanguagePayload    { roomCode: string; language: QQLanguage; }
export interface QQResetRoomPayload      { roomCode: string; }
export interface QQSubmitAnswerPayload   { roomCode: string; teamId: string; answer: string; }
export interface QQBuzzInPayload         { roomCode: string; teamId: string; }
export interface QQSetTimerPayload       { roomCode: string; durationSec: number; }
export interface QQSetAvatarsPayload     { roomCode: string; enabled: boolean; }

// ── Ack response ──────────────────────────────────────────────────────────────
export interface QQAck {
  ok: boolean;
  error?: string;
  code?: string;
}

// ── Available avatars ─────────────────────────────────────────────────────────
export const QQ_AVATARS = [
  { id: 'fox',    emoji: '🦊', label: 'Fox'    },
  { id: 'bear',   emoji: '🐻', label: 'Bear'   },
  { id: 'owl',    emoji: '🦉', label: 'Owl'    },
  { id: 'rabbit', emoji: '🐰', label: 'Rabbit' },
  { id: 'cat',    emoji: '🐱', label: 'Cat'    },
  { id: 'dog',    emoji: '🐶', label: 'Dog'    },
  { id: 'panda',  emoji: '🐼', label: 'Panda'  },
  { id: 'tiger',  emoji: '🐯', label: 'Tiger'  },
  { id: 'frog',   emoji: '🐸', label: 'Frog'   },
  { id: 'penguin',emoji: '🐧', label: 'Penguin'},
  { id: 'wolf',   emoji: '🐺', label: 'Wolf'   },
  { id: 'duck',   emoji: '🦆', label: 'Duck'   },
];

export function qqGetAvatar(avatarId: string) {
  return QQ_AVATARS.find(a => a.id === avatarId) ?? QQ_AVATARS[0];
}
