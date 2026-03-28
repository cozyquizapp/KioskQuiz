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
  SCHAETZCHEN:   { de: 'Schätzchen',  en: 'Estimate',    emoji: '🍯' },
  MUCHO:         { de: 'Mu-cho',      en: 'Mu-cho',      emoji: '🎵' },
  BUNTE_TUETE:   { de: 'Bunte Tüte',  en: 'Mixed Bag',   emoji: '🎁' },
  ZEHN_VON_ZEHN: { de: '10 von 10',   en: '10 of 10',    emoji: '🔟' },
  CHEESE:        { de: 'Cheese',      en: 'Cheese',      emoji: '🧀' },
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

export type QQGamePhaseIndex = 1 | 2 | 3;

// ── Grid ──────────────────────────────────────────────────────────────────────
export interface QQCell {
  row: number;
  col: number;
  ownerId: string | null;  // teamId or null = unclaimed
  jokerFormed: boolean;    // this cell is part of a 2×2 already triggered
}

export type QQGrid = QQCell[][];  // [row][col]

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

export interface QQStartGamePayload      { roomCode: string; questions: QQQuestion[]; language: QQLanguage; }
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
