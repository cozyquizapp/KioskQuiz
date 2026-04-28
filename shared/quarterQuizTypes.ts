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
  SCHAETZCHEN:   { de: 'Schätzchen',   en: 'Close Call',    emoji: '🎯' },
  MUCHO:         { de: 'Mu-Cho',       en: 'Mu-Cho',        emoji: '🅰️' },
  BUNTE_TUETE:   { de: 'Bunte Tüte',   en: 'Lucky Bag',     emoji: '🎁' },
  ZEHN_VON_ZEHN: { de: '10 von 10',    en: 'All In',        emoji: '🎰' },
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

// ── Team palette (derived from QQ_AVATARS, kept for legacy reference) ────────
// Each avatar has its own signature color — teams pick an avatar+color pair.
// Order matches QQ_AVATARS so fallback indexing stays in sync with avatar rings.
export const QQ_TEAM_PALETTE: string[] = [
  '#FA507F', // shiba (label: Hund)
  '#9DCB2F', // faultier
  '#266FD3', // pinguin
  '#9A65D5', // koala
  '#FEC814', // giraffe
  '#68B4A5', // waschbaer
  '#FF751F', // kuh
  '#F84326', // capybara
];

// ── Game constants ────────────────────────────────────────────────────────────
export const QQ_PHASES_COUNT          = 3;
export const QQ_QUESTIONS_PER_PHASE   = 5;
export const QQ_TOTAL_QUESTIONS       = QQ_PHASES_COUNT * QQ_QUESTIONS_PER_PHASE; // 15
export const QQ_MAX_STEALS_PER_PHASE  = 2;
export const QQ_MAX_JOKERS_PER_GAME   = 2;
export const QQ_MAX_STAPELS_PER_GAME  = 3;  // Stapel-Cap pro Team pro Spiel (verhindert Snowball-Effekt)
export const QQ_MAX_TEAMS             = 8;
export const QQ_MIN_TEAMS             = 2;

export function qqGridSize(teamCount: number): number {
  if (teamCount <= 2) return 4;   // 4×4 = 16
  if (teamCount === 3) return 5;  // 5×5 = 25
  if (teamCount <= 5) return 6;   // 6×6 = 36
  if (teamCount <= 7) return 7;   // 7×7 = 49
  return 8;                        // 8-10 teams → 8×8 = 64
}

// ── Phase flow ────────────────────────────────────────────────────────────────
export type QQPhase =
  | 'LOBBY'             // Waiting for teams to join + avatar selection
  | 'RULES'             // Rules presentation (moderator-controlled, before game start)
  | 'TEAMS_REVEAL'      // One-time epic team reveal after rules, before phase 1
  | 'PHASE_INTRO'       // Animated intro for each phase (1/2/3)
  | 'QUESTION_ACTIVE'   // Question visible, teams answering
  | 'QUESTION_REVEAL'   // Answer shown, winning team about to place
  | 'PLACEMENT'         // Winning team places / steals a cell
  | 'COMEBACK_CHOICE'   // Last-place team picks comeback action before Phase 3
  | 'CONNECTIONS_4X4'   // 4×4 Connections Finalrunde (eigenes Mini-Game, Sub-Phase via state.connections.phase)
  | 'PAUSED'            // Moderator-triggered pause — shows records/leaderboard
  | 'GAME_OVER'         // Final state, territory winner shown
  | 'THANKS';           // Danke-fürs-Spielen-Folie mit QR nach der Siegerehrung

export type QQGamePhaseIndex = 1 | 2 | 3 | 4;

// ── Grid ──────────────────────────────────────────────────────────────────────
export interface QQCell {
  row: number;
  col: number;
  ownerId: string | null;  // teamId or null = unclaimed
  jokerFormed: boolean;    // this cell is part of a 2×2 already triggered
  frozen?: boolean;        // frozen for 1 question (cannot be stolen)
  stuck?: boolean;         // permanently frozen via Stapeln (counts 2 pts, cannot be stolen)
  shielded?: boolean;      // protected until end of game (cannot be stolen/swapped). Max 2 per team per game.
  sandLockTtl?: number;    // Sanduhr-Sperre: cell is neutralized for N more questions
                           //   (set to 3 on lock, decremented at each question advance,
                           //   cleared when 0 — cell becomes a normal empty cell)
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
  /** Optionaler Wert pro Item (z.B. Lebensdauer „1 Tag", Höhe „8848 m") — wird im
   *  Reveal als Pill neben dem Item-Text angezeigt. Index korrespondiert zu `items[]`. */
  itemValues?: string[];
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
  // Floating decoration emojis (override category defaults)
  emojis?: string[];
  // Per-question background music (uploaded MP3)
  musicUrl?: string;
  // Moderator host note — shown in /moderator during this question (private, not on beamer)
  hostNote?: string;
  // Fun/interesting fact about the topic — optional, moderator can drop it to lighten the mood.
  // Private, shown only in /moderator + host cheatsheet, never on beamer or team.
  funFact?: string;
  funFactEn?: string;
}

// ── Per-team per-phase stats ──────────────────────────────────────────────────
export interface QQTeamPhaseStats {
  stealsUsed: number;       // Phase 2: max QQ_MAX_STEALS_PER_PHASE
  jokersEarned: number;     // max QQ_MAX_JOKERS_PER_GAME over the whole game (not reset per phase)
  placementsLeft: number;   // Phase 2 "2 setzen": how many still pending
  pendingJokerBonus?: number; // legacy: joker bonus postponed until PLACE_2 finishes (no longer used, kept for state compatibility)
  pendingMultiSlot?: number;  // PLACE_2 slots deferred while a joker bonus is placed first
  shieldsUsed?: number;       // Phase 3+: how many shields this team has used this game (max 2) — DEPRECATED, Schild gedroppt
  stapelsUsed?: number;       // Phase 3+: wie viele Stapel das Team in diesem Spiel verbraucht hat (max QQ_MAX_STAPELS_PER_GAME)
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

// ── Comeback Higher/Lower Mini-Game ──────────────────────────────────────────
// Letztes Team (oder mehrere tied-letzten) spielt vor der Klau-Phase
// Higher-or-Lower: pro richtig geratener Vergleich ein Feld klauen.
// Format A (pair):   Zwei vergleichbare Objekte + gleiche Einheit
//                    → Frage wird automatisch generiert.
// Format B (anchor): Fester Anker-Text + Vergleichswert mit freier Frage-
//                    Formulierung (mehr Erzähl-Flair, individuell gepflegt).
export type QQHLPairKind = 'pair' | 'anchor';
export type QQHLChoice = 'higher' | 'lower';

export interface QQHLPair {
  id: string;
  kind: QQHLPairKind;
  category: string;          // Online/Promis/Sport/Filme/Geografie/Wirtschaft/Nerdy
  unit: string;              // z.B. "Einwohner", "m", "€", "Follower", "Oscars"
  // Format A: Label + Wert für beide Seiten
  // Format B: anchorLabel/anchorValue = fest, subjectLabel/subjectValue = Überraschung
  anchorLabel: string;       // "Berlin" (pair) oder "Eiffelturm" (anchor)
  anchorValue: number;
  subjectLabel: string;      // "München" (pair) oder "Freiheitsstatue" (anchor)
  subjectValue: number;
  /** Freie Text-Überschreibung (nur für anchor-kind): komplette Frage-Formulierung.
   *  Ohne wird automatisch generiert aus den Labels + Unit. */
  customQuestion?: string;
}

/** Moderator-wählbare Zeit pro H/L-Runde. */
export const QQ_COMEBACK_HL_TIMER_DEFAULT_SEC = 10;

// ── 4×4 Connections (Finalrunde) ─────────────────────────────────────────────
// 16 Begriffe in 4×4 Raster. 4 Gruppen à 4 Items. Teams jagen parallel und
// markieren bis zu 4 Items zum Submit. Pro gefundener Gruppe gibts 1 Aktion.
// Ranking nach gefundenen Gruppen (DESC), Tie-Break nach finishedAt (ASC).

/** Default-Werte. Im Setup pro Spiel anpassbar. */
export const QQ_CONNECTIONS_TIMER_DEFAULT_SEC = 180;          // 3 Min
export const QQ_CONNECTIONS_TIMER_MIN_SEC = 60;
export const QQ_CONNECTIONS_TIMER_MAX_SEC = 600;
export const QQ_CONNECTIONS_MAX_FAILS_DEFAULT = 2;

/**
 * Fallback-Payload für 4×4. Wird verwendet wenn ein Run keine eigene Payload
 * im Draft hat (Editor folgt). Erste Drafts haben oft noch keinen 4×4-Eintrag,
 * daher der hardcoded Default.
 */
export const QQ_CONNECTIONS_FALLBACK_PAYLOAD: QQConnectionsPayload = {
  groups: [
    { id: 'g1', name: 'Kaffeesorten',        nameEn: 'Coffee types',  items: ['Java', 'Mocha', 'Latte', 'Espresso'], difficulty: 1 },
    { id: 'g2', name: 'Programmiersprachen', nameEn: 'Languages',     items: ['Python', 'Ruby', 'Swift', 'Rust'],    difficulty: 2 },
    { id: 'g3', name: 'Edelsteine',          nameEn: 'Gemstones',     items: ['Diamant', 'Saphir', 'Smaragd', 'Topas'], difficulty: 3 },
    { id: 'g4', name: 'Apple-Produkte',      nameEn: 'Apple products',items: ['iPhone', 'iPad', 'MacBook', 'Watch'], difficulty: 4 },
  ],
};

export interface QQConnectionsGroup {
  id: string;             // 'g1' | 'g2' | 'g3' | 'g4'
  name: string;           // Gruppen-Bezeichnung, z.B. „Kaffeesorten"
  nameEn?: string;
  items: string[];        // genau 4
  itemsEn?: string[];
  /** 1=einfach, 4=schwer — nur visueller Cue (Farbe/Label im Reveal). */
  difficulty?: 1 | 2 | 3 | 4;
}

export interface QQConnectionsPayload {
  /** Genau 4 Gruppen à 4 Items → 16 Items insgesamt. */
  groups: QQConnectionsGroup[];
  /** Optional: feste Item-Reihenfolge im 4×4 Raster (16 strings).
   *  Ohne → Server shuffelt einmal beim Start. */
  itemOrder?: string[];
}

export interface QQConnectionsTeamProgress {
  /** Gruppen-IDs in Reihenfolge des Findens. */
  foundGroupIds: string[];
  /** Falsch-Submits dieses Teams. */
  failedAttempts: number;
  /** True, sobald failedAttempts >= maxFailedAttempts. */
  isLockedOut: boolean;
  /** Aktuelle Vor-Submit-Auswahl (max 4 Items). */
  selectedItems: string[];
  /** Timestamp bei dem das Team „fertig" wurde (4. Gruppe gefunden ODER lockout). */
  finishedAt: number | null;
}

export interface QQConnectionsState {
  payload: QQConnectionsPayload;
  /** Effektive Item-Reihenfolge (16 strings) — vom Server fixiert beim Start. */
  itemOrder: string[];
  /** Konfiguration zum Spielzeitpunkt fixiert. */
  durationSec: number;
  maxFailedAttempts: number;
  /** Server-Timestamps (ms). */
  startedAt: number;
  endsAt: number;
  /** Pro Team Fortschritt. */
  teamProgress: Record<string, QQConnectionsTeamProgress>;
  /** Sub-Phase innerhalb der Connections-Runde:
   *  - 'intro'     = Mechanik-Erklärung (Moderator advanced)
   *  - 'active'    = Spielzeit (Teams tippen)
   *  - 'reveal'   = Auflösung — alle Gruppen gefärbt, Ranking sichtbar
   *  - 'placement' = Aktionen abarbeiten (Top-Team setzt zuerst, dann nächstes …)
   *  - 'done'      = alle Aktionen verbraucht → Übergang zu nächster Phase */
  phase: 'intro' | 'active' | 'reveal' | 'placement' | 'done';
  /** Reihenfolge der Teams für Placement (sortiert: foundCount DESC, finishedAt ASC). */
  placementOrder: string[];
  /** Aktuelles Team in Placement (= placementOrder[placementCursor]). */
  placementCursor: number;
  /** Wie viele Aktionen das aktuelle Team noch setzen darf (zählt von foundGroupIds.length runter). */
  placementRemaining: number;
}

export interface QQComebackHLState {
  /** Anzahl der H/L-Runden insgesamt (1..3, abh. von Balance + tied-Last-Cap). */
  rounds: number;
  /** Aktuelle Runde (0..rounds-1). */
  round: number;
  /** Alle Teams, die gleichzeitig mitspielen (1 bei Solo-Last, ≥2 bei Tied-Last). */
  teamIds: string[];
  /** Aktuelle Frage der Runde. */
  currentPair: QQHLPair | null;
  /** Pro Team die gewählte Antwort dieser Runde. */
  answers: Record<string, QQHLChoice>;
  /** Teams, die in der aktuellen Runde bereits geantwortet haben (für Progress). */
  answeredThisRound: string[];
  /** Korrekt in der aktuellen Runde (erst nach Reveal gefüllt). */
  correctThisRound: string[];
  /** Gesamtzahl geklauter Felder pro Team über alle Runden hinweg
   *  (= Anzahl richtig geratener H/L Runden des Teams). */
  winnings: Record<string, number>;
  /** Phasen innerhalb des Mini-Games: intro → question → reveal → done → steal. */
  phase: 'intro' | 'question' | 'reveal' | 'done' | 'steal';
  /** Timer für die aktuelle Runde (ms timestamp). */
  timerEndsAt: number | null;
  /** Schon benutzte Pair-IDs (Dedupe innerhalb eines Spiels). */
  usedPairIds: string[];
  /** Queue an Teams, die noch Felder klauen müssen (gesetzt beim Übergang zu 'steal'). */
  stealQueue: string[];
  /** Team das aktuell klaut (oberstes der Queue). */
  currentStealer: string | null;
  /** Wie viele Felder das aktuelle Stealing-Team noch klauen darf (von winnings). */
  currentStealerRemaining: number;
}

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
  | 'animatedAvatar'
  | 'emojiStack';

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
  animIn?: 'none' | 'fadeUp' | 'fadeIn' | 'pop' | 'slideLeft' | 'slideRight'
         | 'cardFlip' | 'typewriter' | 'bounceIn' | 'slotDrop' | 'swingIn';
  animDelay?: number;
  animDuration?: number;
  // Looping animation (applied after entrance, or independently)
  animLoop?: 'none' | 'pulse' | 'bounce' | 'wiggle' | 'shake' | 'float';
  animLoopDuration?: number;
  // ph_options specific overrides
  columns?: number;          // grid column count (default: 2 for MUCHO, 3 for ZEHN)
  optionRadius?: number;     // tile border radius (default: 14)
  optionColorScheme?: 'category' | 'mono' | 'dark'; // color scheme for option tiles
  // Animated Avatar (only for type === 'animatedAvatar')
  avatarId?: string; // Which avatar to show
  animType?: 'wiggle' | 'walk' | 'bounce' | 'float' | 'spin' | 'pulse' | 'shake' | 'dance' | 'peek' | 'flip';
  // Animation type for avatar
  avatarAnimDuration?: number; // seconds
  avatarAnimDelay?: number; // seconds
  // Emoji Stack Compositor (only for type === 'emojiStack')
  emojiLayers?: EmojiLayer[];
}

export interface EmojiLayer {
  emoji: string;
  offsetX: number;  // % relative to element size (−50 to +50)
  offsetY: number;
  scale: number;    // 1 = normal
  rotation: number; // degrees
  animType?: 'none' | 'float' | 'bounce' | 'spin' | 'pulse' | 'shake' | 'wiggle';
}

export type QQSlideTemplateType =
  | 'LOBBY'
  | 'PHASE_INTRO_1' | 'PHASE_INTRO_2' | 'PHASE_INTRO_3' | 'PHASE_INTRO_4'
  | 'QUESTION_SCHAETZCHEN' | 'QUESTION_MUCHO' | 'QUESTION_BUNTE_TUETE'
  | 'QUESTION_ZEHN' | 'QUESTION_CHEESE'
  | 'REVEAL' | 'PLACEMENT' | 'COMEBACK_CHOICE' | 'GAME_OVER';

export interface QQSlideTemplate {
  type: QQSlideTemplateType;
  background: string;
  elements: QQSlideElement[];
  transitionIn?: 'fade' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'zoom' | 'zoomOut' | 'flip' | 'drop' | 'swirl';
  transitionDuration?: number;
}

// Keys: QQSlideTemplateType for category defaults, or 'q-${questionId}' for per-question overrides
export type QQSlideTemplates = Partial<Record<string, QQSlideTemplate>>;

// ── QQ Sound Config ───────────────────────────────────────────────────────────
/**
 * Per-draft custom sounds. Each slot maps to a game event.
 *
 * Fallback chain pro Slot:
 *   1. enabled[slot] === false → komplett stumm
 *   2. config[slot] gesetzt    → custom URL abspielen
 *   3. sonst                   → Default-WAV aus /sounds/<slot>.wav
 *   4. Default-WAV fehlt       → Web-Audio-Synth (letzte Rettung)
 *
 * Supported formats: MP3, OGG, WAV (browser-native via HTMLAudioElement).
 */
export type QQSoundSlot =
  | 'timerLoop' | 'timesUp' | 'fieldPlaced' | 'steal'
  | 'correct'   | 'wrong'   | 'reveal'      | 'fanfare'
  | 'lobbyWelcome' | 'gameOver' | 'teamReveal'
  | 'questionStart' | 'roundStart'
  // Pro-Kategorie Hintergrundmusik (laeuft waehrend QUESTION_ACTIVE
  // statt timerLoop wenn gesetzt). Frage-eigenes musicUrl hat weiter
  // hoechste Prio, dann diese Kategorie-Slots, dann timerLoop.
  | 'catMusicSchaetzchen' | 'catMusicMucho' | 'catMusicBunteTuete'
  | 'catMusicZehnVonZehn' | 'catMusicCheese'
  // Aktion-spezifische Sounds (passend zu den Mikro-Animationen)
  | 'shieldActivate' | 'stapelStamp' | 'sanduhrFlip' | 'teamJoin' | 'swapActivate'
  // Kategorie-spezifische Reveal-/Correct-/Wrong-Sounds. Fallen auf generische
  // correct/wrong/reveal-Slots zurueck wenn nicht gesetzt.
  | 'correctSchaetzchen' | 'correctMucho' | 'correctBunteTuete' | 'correctZehnVonZehn' | 'correctCheese'
  | 'wrongSchaetzchen'   | 'wrongMucho'   | 'wrongBunteTuete'   | 'wrongZehnVonZehn'   | 'wrongCheese'
  | 'revealSchaetzchen'  | 'revealMucho'  | 'revealBunteTuete'  | 'revealZehnVonZehn'  | 'revealCheese'
  | 'questionStartSchaetzchen' | 'questionStartMucho' | 'questionStartBunteTuete' | 'questionStartZehnVonZehn' | 'questionStartCheese';

export interface QQSoundConfig {
  timerLoop?: string;        // looping music while timer runs
  timesUp?: string;          // timer expired buzzer
  fieldPlaced?: string;      // team places a cell
  steal?: string;            // team steals an enemy cell
  correct?: string;          // correct answer fanfare
  wrong?: string;            // wrong / no answer
  reveal?: string;           // answer revealed
  fanfare?: string;          // phase intro / big moment
  lobbyWelcome?: string;     // lobby ambient / welcome
  gameOver?: string;         // game over jingle
  teamReveal?: string;       // per-team slam on TeamsRevealView
  questionStart?: string;    // new question / category change cue
  roundStart?: string;       // new round (phase/round change)
  // Pro-Kategorie Background-Loop (siehe Kommentar oben).
  catMusicSchaetzchen?: string;
  catMusicMucho?: string;
  catMusicBunteTuete?: string;
  catMusicZehnVonZehn?: string;
  catMusicCheese?: string;
  // Aktions-Sounds
  shieldActivate?: string;
  stapelStamp?: string;
  sanduhrFlip?: string;
  teamJoin?: string;
  swapActivate?: string;
  // Kategorie-spezifische Sounds (fallen auf generic correct/wrong/reveal zurueck)
  correctSchaetzchen?: string;  correctMucho?: string;  correctBunteTuete?: string;  correctZehnVonZehn?: string;  correctCheese?: string;
  wrongSchaetzchen?: string;    wrongMucho?: string;    wrongBunteTuete?: string;    wrongZehnVonZehn?: string;    wrongCheese?: string;
  revealSchaetzchen?: string;   revealMucho?: string;   revealBunteTuete?: string;   revealZehnVonZehn?: string;   revealCheese?: string;
  questionStartSchaetzchen?: string; questionStartMucho?: string; questionStartBunteTuete?: string; questionStartZehnVonZehn?: string; questionStartCheese?: string;
  /** Per-Slot-Mute (unabhängig von Upload). Fehlt = enabled (default). */
  enabled?: Partial<Record<QQSoundSlot, boolean>>;
  /**
   * Pro Slot optional ein Synth-Preset wählen (z.B. 'classic', 'retro', 'chime').
   * Greift nur, wenn keine Custom-URL gesetzt ist. Fehlt = Default-WAV wie bisher.
   * Gültige Preset-IDs stehen in `SYNTH_PRESETS` (frontend/src/utils/sounds.ts).
   */
  preset?: Partial<Record<QQSoundSlot, string>>;
}

export const QQ_SOUND_SLOT_LABELS: Record<QQSoundSlot, string> = {
  timerLoop:     '⏱ Timer-Loop (läuft während Frage)',
  timesUp:       '⏰ Zeit abgelaufen',
  fieldPlaced:   '📍 Feld gesetzt',
  steal:         '⚡ Feld geklaut',
  correct:       '✅ Richtige Antwort',
  wrong:         '❌ Falsche / keine Antwort',
  reveal:        '🔍 Antwort aufgedeckt',
  fanfare:       '🎉 Phasen-Intro / großer Moment',
  lobbyWelcome:  '🎵 Lobby- & Pause-Musik',
  gameOver:      '🏆 Spielende',
  teamReveal:    '🎬 Team-Reveal („Heute spielen…")',
  questionStart: '❓ Neue Frage / Kategoriewechsel',
  roundStart:    '🔔 Neue Runde',
  catMusicSchaetzchen: '🎯 Schätzchen-Musik (Frage-Loop)',
  catMusicMucho:       '🅰️ Mu-Cho-Musik (Frage-Loop)',
  catMusicBunteTuete:  '🎁 Bunte-Tüte-Musik (Frage-Loop)',
  catMusicZehnVonZehn: '🎰 Quizzichoice-Musik (Frage-Loop)',
  catMusicCheese:      '🧀 Cheese-Musik (Frage-Loop)',
  shieldActivate:      '🛡️ Schild aktivieren',
  stapelStamp:         '📌 Stempel-Thud',
  sanduhrFlip:         '⏳ Sanduhr umdrehen',
  teamJoin:            '👋 Team tritt bei',
  swapActivate:        '🔄 Tauschen',
  // Kategorie-spezifisch (Fallback auf generisch wenn nicht gesetzt)
  correctSchaetzchen:   '✅ Richtig · Schätzchen',
  correctMucho:         '✅ Richtig · Mu-Cho',
  correctBunteTuete:    '✅ Richtig · Bunte Tüte',
  correctZehnVonZehn:   '✅ Richtig · Quizzichoice',
  correctCheese:        '✅ Richtig · Cheese',
  wrongSchaetzchen:     '❌ Falsch · Schätzchen',
  wrongMucho:           '❌ Falsch · Mu-Cho',
  wrongBunteTuete:      '❌ Falsch · Bunte Tüte',
  wrongZehnVonZehn:     '❌ Falsch · Quizzichoice',
  wrongCheese:          '❌ Falsch · Cheese',
  revealSchaetzchen:    '🔍 Reveal · Schätzchen',
  revealMucho:          '🔍 Reveal · Mu-Cho',
  revealBunteTuete:     '🔍 Reveal · Bunte Tüte',
  revealZehnVonZehn:    '🔍 Reveal · Quizzichoice',
  revealCheese:         '🔍 Reveal · Cheese',
  questionStartSchaetzchen: '❓ Frage-Start · Schätzchen',
  questionStartMucho:       '❓ Frage-Start · Mu-Cho',
  questionStartBunteTuete:  '❓ Frage-Start · Bunte Tüte',
  questionStartZehnVonZehn: '❓ Frage-Start · Quizzichoice',
  questionStartCheese:      '❓ Frage-Start · Cheese',
};

/** Pfade zu den Default-WAVs in /frontend/public/sounds/. */
export const QQ_SOUND_DEFAULT_URLS: Record<QQSoundSlot, string> = {
  timerLoop:     '/sounds/timer-loop.wav',
  timesUp:       '/sounds/times-up.wav',
  fieldPlaced:   '/sounds/field-placed.wav',
  steal:         '/sounds/steal.wav',
  correct:       '/sounds/correct.wav',
  wrong:         '/sounds/wrong.wav',
  reveal:        '/sounds/reveal.wav',
  fanfare:       '/sounds/fanfare.wav',
  lobbyWelcome:  '/sounds/lobby-welcome.mp3',
  gameOver:      '/sounds/game-over.wav',
  teamReveal:    '/sounds/field-placed.wav',
  // Leer = synth-Fallback bis Moderator eigene Datei lädt.
  questionStart: '',
  roundStart:    '',
  // Kategorie-Musik: leer = fallback auf timerLoop. Moderator kann pro
  // Kategorie eigene MP3 hochladen (im Sound-Panel).
  catMusicSchaetzchen: '',
  catMusicMucho:       '',
  catMusicBunteTuete:  '',
  catMusicZehnVonZehn: '',
  catMusicCheese:      '',
  // Aktions-Sounds: leer = Synth-Fallback bis Moderator eigene Datei laedt.
  shieldActivate:      '',
  stapelStamp:         '',
  sanduhrFlip:         '',
  teamJoin:            '',
  swapActivate:        '',
  // Kategorie-spezifisch: leer = fallback auf generisches correct/wrong/reveal/questionStart.
  correctSchaetzchen: '', correctMucho: '', correctBunteTuete: '', correctZehnVonZehn: '', correctCheese: '',
  wrongSchaetzchen:   '', wrongMucho:   '', wrongBunteTuete:   '', wrongZehnVonZehn:   '', wrongCheese:   '',
  revealSchaetzchen:  '', revealMucho:  '', revealBunteTuete:  '', revealZehnVonZehn:  '', revealCheese:  '',
  questionStartSchaetzchen: '', questionStartMucho: '', questionStartBunteTuete: '', questionStartZehnVonZehn: '', questionStartCheese: '',
};

// ── QQ Draft (builder) ────────────────────────────────────────────────────────
export interface QQDraft {
  id: string;
  title: string;
  phases: 3 | 4;
  language: QQLanguage;
  questions: QQQuestion[];
  theme?: QQTheme;
  slideTemplates?: QQSlideTemplates;
  soundConfig?: QQSoundConfig;
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
  // Alle Gewinner der aktuellen Frage in Placement-Reihenfolge (fastest zuerst).
  // Wird für "du warst richtig, aber nicht schnellstes"-Hinweise im /team genutzt.
  currentQuestionWinners?: string[];
  pendingFor: string | null;         // teamId that must act (place/steal/comeback)
  pendingAction: QQPendingAction | null;
  comebackTeamId: string | null;
  comebackAction: QQComebackAction | null;
  // Comeback-Klau: Team-IDs der aktuellen Führenden, aus deren Territorium
  // das Comeback-Team klauen darf. Bei 1 Führendem → 2 Felder von dem einen,
  // bei ≥2 Führenden → genau 1 Feld von jedem.
  comebackStealTargets: string[];
  comebackStealsDone: string[];        // bereits beklaute Leader-Teams
  /** True nach jedem einzelnen Comeback-Klau bis Moderator Space drueckt. */
  comebackStealPaused?: boolean;
  /** Higher/Lower-Mini-Game-State. Null = nicht aktiv bzw. Comeback ohne H/L. */
  comebackHL: QQComebackHLState | null;
  /** Moderator-einstellbarer Timer pro H/L-Runde in Sekunden (Default 10s). */
  comebackHLTimerSec: number;
  /** 4×4 Connections Finalrunde — null wenn nicht aktiv. */
  connections: QQConnectionsState | null;
  /** Moderator-einstellbarer Default-Timer in Sekunden für Connections (Default 180s). */
  connectionsTimerSec: number;
  /** Moderator-einstellbare Fehlversuche bei Connections (Default 2). */
  connectionsMaxFails: number;
  /** Setup-Toggle: Finalrunde 4×4 Connections in diesem Run spielen? Default true. */
  connectionsEnabled: boolean;
  /** Setup-Toggle: Kategorie-Reihenfolge innerhalb jeder Runde randomisieren? Default true. */
  shuffleQuestionsInRound: boolean;
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
  hotPotatoUsedAnswers: string[];       // accepted answers shown on beamer
  hotPotatoAnswerAuthors?: string[];    // teamId per index in hotPotatoUsedAnswers (parallel array)
  hotPotatoQualified?: string[];        // teams that have given >=1 accepted answer; only they can win the round
  // Imposter (oneOfEight round-robin)
  imposterActiveTeamId: string | null;
  imposterChosenIndices: number[];      // statement indices already chosen (correct ones removed)
  imposterEliminated: string[];         // teamIds eliminated (chose the false statement)
  // Last placed cell — for beamer placement animation
  lastPlacedCell: { row: number; col: number; teamId: string; wasSteal?: boolean } | null;
  // Cells temporarily frozen (expire after next placement), already reflected in grid.frozen
  frozenCells: { row: number; col: number }[];
  // Cells shielded until end of current phase, already reflected in grid.shielded
  shieldedCells: { row: number; col: number }[];
  // Cells available to Stucken for pendingFor team (plus-centers)
  stuckCandidates: { row: number; col: number }[];
  // CHEESE (Picture This) — moderator-controlled image reveal
  imageRevealed: boolean;
  // CozyGuessr (BUNTE_TUETE kind=map) — moderator-controlled progressive reveal
  // 0 = nichts, 1 = Target, 2..N+1 = Target + worst→best Team-Pins, N+2 = Ranking-Panel
  mapRevealStep: number;
  // Comeback — moderator-gesteuerte Intro-Slides (0 = "was ist Comeback", 1 = "warum diese Team", 2 = Optionen)
  comebackIntroStep: number;
  // MUCHO — moderator-gesteuerter Akt-1-Voter-Reveal
  // 0 = Antwort aufgedeckt ohne Voter, 1..k = Voter der k-ten nicht-leeren Option,
  // k+1 = „Jäger starten" (Akt 2+3 laufen auf Beamer zeitgesteuert)
  muchoRevealStep: number;
  // ZEHN_VON_ZEHN Step-Reveal: 0=Default-Chips sichtbar, 1=höchste Bets cascaded, 2=Jäger+Winner
  zvzRevealStep: number;
  // CHEESE Step-Reveal: 0=nur Eingaben sichtbar, 1=Lösung grün, 2=Avatare+Winner
  cheeseRevealStep: number;
  // Settings
  avatarsEnabled: boolean;
  totalPhases: 3 | 4;
  theme?: QQTheme;
  // Draft reference (for slide template lookup on beamer)
  draftId?: string;
  slideTemplates?: QQSlideTemplates;
  // Sound
  globalMuted: boolean;  // legacy: true = musicMuted + sfxMuted
  musicMuted: boolean;   // mutes: timerLoop, lobbyWelcome, question musicUrl
  sfxMuted: boolean;     // mutes: all SFX (correct, wrong, reveal, fanfare, fieldPlaced, steal, ticks, gameOver)
  volume: number; // 0–1
  soundConfig?: QQSoundConfig;  // custom sound URLs (override synth)
  // Setup/Lobby-Zweiteilung: wenn false und phase === LOBBY, zeigt der Beamer den Pre-Game-Wartescreen (Leaderboard/Rekorde).
  setupDone: boolean;
  // 3D grid
  enable3DTransition: boolean; // moderator toggle: 2D→3D "drive" animation on first placement per question
  rulesSlideIndex: number;  // current slide index during RULES phase (0-based)
  teamsRevealStartedAt: number | null;  // timestamp for TEAMS_REVEAL animation anchor
  introStep: number;  // sub-step within PHASE_INTRO (see backend qqActivateQuestion for flow)
  categoryIsNew: boolean; // true when introStep is showing category explanation for first time
  // Set when all connected teams have submitted answers (before moderator reveals)
  allAnswered: boolean;
  // Schedule für Fortschrittsbaum — kompakte Ansicht aller Fragen im Quiz.
  schedule?: QQScheduleEntry[];
}

export interface QQScheduleEntry {
  phase: QQGamePhaseIndex;
  category: QQCategory;
  bunteTueteKind?: QQBunteTueteKind;
}

export type QQPendingAction =
  | 'PLACE_1'    // Phase 1: place 1 cell
  | 'PLACE_2'    // Phase 2+: place 2 cells (placementsLeft = 1 or 2)
  | 'STEAL_1'    // Phase 2 steal or Phase 3/4 steal
  | 'FREE'       // Phase 3/4: team picks action (place/steal/bann/shield in R3, steal/swap/stapel in R4)
  | 'FREEZE_1'   // (legacy, unused) freeze 1 own cell for next question
  | 'SANDUHR_1'  // Phase 3: Bann — lock 1 enemy/empty cell for 3 questions (per-question free choice, no budget)
  | 'SHIELD_1'   // Phase 3: shield 1 own cell (player picks target) until end of game (max 2 per team)
  | 'SWAP_1'     // Phase 4: swap 1 own + 1 enemy cell (2-step: pick own, then enemy)
  | 'STAPEL_1'   // Phase 4: stapeln - pick own cell (permanently frozen, 2 pts)
  | 'COMEBACK';  // before final phase: comeback team acts

// ── Socket event payloads (client → server) ───────────────────────────────────
export interface QQJoinModeratorPayload  { roomCode: string; }
export interface QQJoinBeamerPayload     { roomCode: string; }
export interface QQJoinTeamPayload       { roomCode: string; teamId: string; teamName: string; avatarId: string; }

export interface QQStartGamePayload      { roomCode: string; questions: QQQuestion[]; language: QQLanguage; phases: 3 | 4; theme?: QQTheme; draftId?: string; draftTitle?: string; slideTemplates?: QQSlideTemplates; soundConfig?: QQSoundConfig; }
export interface QQRevealAnswerPayload   { roomCode: string; }
export interface QQShowImagePayload      { roomCode: string; }
export interface QQMarkCorrectPayload    { roomCode: string; teamId: string; }
export interface QQMarkWrongPayload      { roomCode: string; }
export interface QQUndoMarkCorrectPayload { roomCode: string; }
export interface QQPlaceCellPayload      { roomCode: string; teamId: string; row: number; col: number; }
export interface QQStealCellPayload      { roomCode: string; teamId: string; row: number; col: number; }
export interface QQChooseFreeActionPayload { roomCode: string; teamId: string; action: 'PLACE' | 'STEAL' | 'FREEZE' | 'SANDUHR' | 'SHIELD' | 'SWAP' | 'STAPEL'; }
export interface QQComebackChoicePayload { roomCode: string; teamId: string; action: QQComebackAction; }
export interface QQSwapCellsPayload      { roomCode: string; teamId: string; rowA: number; colA: number; rowB: number; colB: number; }
export interface QQSwapOneCellPayload    { roomCode: string; teamId: string; row: number; col: number; }  // Phase 4: pick own then enemy (2 calls)
export interface QQFreezeCellPayload     { roomCode: string; teamId: string; row: number; col: number; }
export interface QQSandLockCellPayload   { roomCode: string; teamId: string; row: number; col: number; }
/** Schild: schützt 1 eigenes Feld (Spieler wählt Target). Max 2 pro Team pro Spiel.
 *  Frühere Variante "shield largest cluster" ist abgelöst — daher row/col Pflicht.
 *  Alter Name `QQShieldClusterPayload` als Alias für Backward-Compat behalten. */
export interface QQShieldCellPayload     { roomCode: string; teamId: string; row: number; col: number; }
export type QQShieldClusterPayload = QQShieldCellPayload;
export interface QQStapelCellPayload     { roomCode: string; teamId: string; row: number; col: number; }  // center of plus (Stapeln)
export interface QQStartRulesPayload     { roomCode: string; }
export interface QQRulesNextPayload      { roomCode: string; }
export interface QQRulesPrevPayload      { roomCode: string; }
export interface QQRulesFinishPayload    { roomCode: string; }  // end rules → start game
export interface QQNextQuestionPayload   { roomCode: string; }
export interface QQSetLanguagePayload    { roomCode: string; language: QQLanguage; }
export interface QQResetRoomPayload      { roomCode: string; }
export interface QQSubmitAnswerPayload   { roomCode: string; teamId: string; answer: string; }
export interface QQBuzzInPayload         { roomCode: string; teamId: string; }
export interface QQSetTimerPayload       { roomCode: string; durationSec: number; }
export interface QQSetAvatarsPayload     { roomCode: string; enabled: boolean; }
export interface QQSetMutedPayload       { roomCode: string; muted: boolean; }
export interface QQSetMusicMutedPayload  { roomCode: string; muted: boolean; }
export interface QQSetSfxMutedPayload    { roomCode: string; muted: boolean; }
export interface QQSetVolumePayload        { roomCode: string; volume: number; }
export interface QQUpdateSoundConfigPayload { roomCode: string; soundConfig: QQSoundConfig; }
export interface QQSetEnable3DPayload     { roomCode: string; enabled: boolean; }

// ── Ack response ──────────────────────────────────────────────────────────────
export interface QQAck {
  ok: boolean;
  error?: string;
  code?: string;
}

// ── Available avatars (CozyCast PNG-Badges) ──────────────────────────────────
// 8 Tier-Badges im CozyWolf-Brand-Style (team-farbiger Ring + illustrierter
// Charakter, fertig gerendert in Canva). Die `id`s bleiben aus Legacy-Gründen
// englisch (DB-Sessions in flight haben noch alte IDs), Inhalte zeigen aber
// die neuen CozyCast-Tiere. `image` zeigt auf die PNGs unter
// /avatars/cozy-cast/avatar-{slug}.png. Die Reihenfolge: erste 4 sind die
// kontrastreichsten Picks für kleine Team-Counts.
export const QQ_AVATARS = [
  { id: 'fox',     slug: 'shiba',     emoji: '🐕', label: 'Hund',      labelEn: 'Dog',      color: '#FA507F', hoodie: '#0EA5E9' },
  { id: 'frog',    slug: 'faultier',  emoji: '🦥', label: 'Faultier',  labelEn: 'Sloth',    color: '#9DCB2F', hoodie: '#7C2D12' },
  { id: 'panda',   slug: 'pinguin',   emoji: '🐧', label: 'Pinguin',   labelEn: 'Penguin',  color: '#266FD3', hoodie: '#FDE047' },
  { id: 'rabbit',  slug: 'koala',     emoji: '🐨', label: 'Koala',     labelEn: 'Koala',    color: '#9A65D5', hoodie: '#EAB308' },
  { id: 'unicorn', slug: 'giraffe',   emoji: '🦒', label: 'Giraffe',   labelEn: 'Giraffe',  color: '#FEC814', hoodie: '#5B21B6' },
  { id: 'raccoon', slug: 'waschbaer', emoji: '🦝', label: 'Waschbär',  labelEn: 'Raccoon',  color: '#68B4A5', hoodie: '#F59E0B' },
  { id: 'cow',     slug: 'kuh',       emoji: '🐄', label: 'Kuh',       labelEn: 'Cow',      color: '#FF751F', hoodie: '#581C87' },
  { id: 'cat',     slug: 'capybara',  emoji: '🐹', label: 'Capybara',  labelEn: 'Capybara', color: '#F84326', hoodie: '#166534' },
] as const;

export type QQAvatar = typeof QQ_AVATARS[number] & { image: string; imageClosed: string };

export function qqGetAvatar(avatarId: string): QQAvatar {
  const av = QQ_AVATARS.find(a => a.id === avatarId) ?? QQ_AVATARS[0];
  return {
    ...av,
    image: `/avatars/cozy-cast/avatar-${av.slug}.png`,
    imageClosed: `/avatars/cozy-cast/avatar-${av.slug}-closed.png`,
  };
}

export function qqAvatarLabel(avatarId: string, lang: 'de' | 'en'): string {
  const av = QQ_AVATARS.find(a => a.id === avatarId) ?? QQ_AVATARS[0];
  return lang === 'en' ? av.labelEn : av.label;
}

/** Live Team-Farbe aus dem Avatar ableiten — `team.color` kann stale sein,
 *  weil es beim Beitritt gespeichert wird und Palette-Updates nicht mitbekommt.
 *  Für UI immer diese Variante nutzen, nicht `team.color` direkt. */
export function qqTeamColor(team: { avatarId?: string; color?: string }): string {
  if (team.avatarId) {
    const av = QQ_AVATARS.find(a => a.id === team.avatarId);
    if (av) return av.color;
  }
  return team.color ?? QQ_AVATARS[0].color;
}
