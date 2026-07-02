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
  CHEESE:        { de: 'Schau mal!',   en: 'Picture This',  emoji: '📸' },
};

// ── Bunte Tüte sub-mechanics ──────────────────────────────────────────────────
export type QQBunteTueteKind =
  | 'hotPotato' | 'top5' | 'oneOfEight' | 'order' | 'map'
  | 'onlyConnect' | 'bluff';

export const QQ_BUNTE_TUETE_LABELS: Record<QQBunteTueteKind, { de: string; en: string; emoji: string }> = {
  hotPotato:   { de: 'Heiße Kartoffel', en: 'Hot Potato', emoji: '🥔' },
  top5:        { de: 'Top 5',           en: 'Top 5',      emoji: '🏆' },
  oneOfEight:  { de: 'Imposter',        en: 'Imposter',   emoji: '🕵️' },
  order:       { de: 'Fix It',          en: 'Fix It',     emoji: '🔀' },
  map:         { de: 'Pin It',          en: 'Pin It',     emoji: '📍' },
  onlyConnect: { de: '4 gewinnt',       en: 'Connect 4',  emoji: '🧩' },
  bluff:       { de: 'Bluff',           en: 'Bluff',      emoji: '🎭' },
};

export const QQ_CATEGORY_COLORS: Record<QQCategory, string> = {
  SCHAETZCHEN:   '#F59E0B',
  MUCHO:         '#3B82F6',
  BUNTE_TUETE:   '#EF4444',
  ZEHN_VON_ZEHN: '#22C55E',
  CHEESE:        '#8B5CF6',
};

// ── Topics (Wissensgebiete) ───────────────────────────────────────────────────
// Cross-category Thema-Tag: orthogonal zur Mechanik (SCHAETZCHEN/MUCHO/...).
// Free-text-Feld an QQQuestion, diese Liste dient als Vorschläge/Filter im
// CozyLibrary-UI. Wolf kann eigene Topics setzen — die Konstante ist nur Default.
export const QQ_TOPICS = [
  'Musik', 'Film & TV', 'Sport', 'Geschichte', 'Geographie',
  'Wissenschaft', 'Mathematik', 'Kultur', 'Promis', 'Literatur',
  'Essen & Trinken', 'Spiele', 'Technologie', 'Natur & Tiere',
  'Allgemeinwissen', 'Politik', 'Sprache', 'Kunst', 'Religion', 'Wirtschaft',
] as const;
export type QQTopic = typeof QQ_TOPICS[number];

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
export const QQ_MAX_TEAMS_LARGE       = 25; // Groß-Gruppen-Modus (largeGroupMode): Bar-Race statt Grid
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
  | 'FINAL_BETTING'     // Vor Final-Phase: Teams setzen Wetten auf andere Teams. State in finalBets.
  | 'FINAL_REVEAL'      // Nach Final-Phase: dramatische Score-Cascade-Auflösung. State in finalBetResolution.
  | 'COZY_GAME'         // CozyGame-Round (analog Real-Life-Mini-Spiel). Sub-Phasen in cozyGame.phase. Siehe shared/cozyGameTypes.ts.
  | 'PAUSED'            // Moderator-triggered pause — shows records/leaderboard
  | 'GAME_OVER'         // Final state, territory winner shown
  | 'THANKS';           // Danke-fürs-Spielen-Folie mit QR nach der Siegerehrung

export type QQGamePhaseIndex = 1 | 2 | 3 | 4;

// ── Grid ──────────────────────────────────────────────────────────────────────
export interface QQCell {
  row: number;
  col: number;
  ownerId: string | null;  // teamId or null = unclaimed
  jokerFormed: boolean;    // VISUAL flag (Stern auf der Cell) — wird nach Placement zurueckgesetzt
  jokerCounted?: boolean;  // LOGISCHER Flag — verhindert Re-Detection desselben Patterns auf naechster Frage (B5/B13)
  frozen?: boolean;        // frozen for 1 question (cannot be stolen)
  stuck?: boolean;         // permanently frozen via Stapeln (counts 2 pts, cannot be stolen)
  shielded?: boolean;      // protected until end of game (cannot be stolen/swapped). Max 2 per team per game.
  sandLockTtl?: number;    // Sanduhr-Sperre: cell is neutralized for N more questions
                           //   (set to 3 on lock, decremented at each question advance,
                           //   cleared when 0 — cell becomes a normal empty cell)
  stackBonus?: number;     // Connections-Finale Stapel-Bonus: jeder Stack +1 Pkt zur Team-Score.
                           //   Multi-Stack erlaubt (gleiche Cell mehrfach). Implizit auch stuck=true.
  /** 2026-05-25 (Wolf Final-Wager v4): Story-Stamps die in der FINAL_REVEAL-Phase
   *  auf eigene Cells gelegt werden — Bonus-Punkte aus Awards/Bets/Sympathie als
   *  visuelle Marker (🐢/⚡/🦝/🪙/💞). Pro Stamp +1 zum largestConnected (kein
   *  Multiplier — linear). Stack-Cap der normalen Phase gilt hier nicht. */
  revealStamps?: Array<{
    kind: 'underdog' | 'speedy' | 'meisterklauer' | 'bet' | 'sympathy';
    teamId: string;
  }>;
}

export type QQGrid = QQCell[][];  // [row][col]

// ── Bunte Tüte sub-mechanic payloads ─────────────────────────────────────────

export interface QQBunteTueteTop5 {
  kind: 'top5';
  answers: string[];      // up to 5 correct answers (DE)
  answersEn?: string[];   // EN versions
  // 2026-05-24 (Wolf-Live-Test): pro-Antwort optionale Alias-Liste.
  // aliases[i] gilt fuer answers[i] UND answersEn[i] (sprachübergreifend).
  // Beispiel: answers[1]='Großbritannien' → aliases[1]=['UK', 'GB', 'Britain'].
  // Backend matched submitted-Text gegen answer + answerEn + alle Aliases.
  aliases?: string[][];
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

/**
 * 4 gewinnt / Connect 4: 4 Hinweise werden nacheinander aufgedeckt. Teams
 * raten den verbindenden Begriff per Freitext. Wer als Erstes richtig liegt
 * gewinnt — bei Tie alle aus dem Tie, schnellstes setzt zuerst (wie sonst).
 * Anti-Spam: 1 Tipp ist frei, danach gesperrt.
 */
export interface QQBunteTueteOnlyConnect {
  kind: 'onlyConnect';
  /** Genau 4 Hinweise. Werden Index-für-Index aufgedeckt. */
  hints: string[];
  hintsEn?: string[];
  /** Kanonische Antwort. */
  answer: string;
  answerEn?: string;
  /** Optionale Alternativ-Schreibweisen — Match wie bei CHEESE
   *  (case-insensitive, substring/sub-substring). */
  acceptedAnswers?: string[];
  acceptedAnswersEn?: string[];
}

/**
 * Bluff / Fibbage-Style: obskure Frage, jedes Team tippt eine erfundene
 * Antwort. Phase 2: alle Bluffs + die echte Antwort werden gemischt
 * angezeigt, Teams stimmen ab. Doppelte Punktquelle:
 *   - +2 Teilpunkte für Team das die echte Antwort wählt
 *   - +1 Teilpunkt pro Team, das auf deinen Bluff reinfällt
 * Wer am Ende meiste Teilpunkte → setzt (wie Top5).
 */
export interface QQBunteTueteBluff {
  kind: 'bluff';
  /** Frage-Text wird aus QQQuestion.text/textEn übernommen. */
  /** Echte Antwort. */
  realAnswer: string;
  realAnswerEn?: string;
}

export type QQBunteTuetePayload =
  | QQBunteTueteTop5
  | QQBunteTueteOneOfEight
  | QQBunteTueteOrder
  | QQBunteTueteMap
  | QQBunteTueteHotPotato
  | QQBunteTueteOnlyConnect
  | QQBunteTueteBluff;

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
  /** 2026-05-07: SCHAETZCHEN-Format-Hint. true = Jahreszahl (kein Tausender-
   *  Punkt, sinnvoller Range ~1000-2200). false/undefined = freie Zahl mit
   *  default Tausender-Formatierung. Beeinflusst Display + /team-Input. */
  isYearAnswer?: boolean;
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
  /** 2026-05-07: pro Frage waehlbarer Musik-Modus.
   *  - 'auto' (default): laeuft waehrend QUESTION_ACTIVE + QUESTION_REVEAL
   *  - 'duringActive': nur waehrend Frage, stoppt beim Reveal
   *  - 'revealOnly': erst beim Reveal — Climax-Variante (z.B. ESC-Sieger-Song
   *     spielt erst wenn das Sieger-Jahr aufgedeckt wird)
   *  - 'audioQuestion': wie duringActive, plus visueller '🎧 Hoere genau hin'-Hinweis
   */
  musicMode?: 'auto' | 'duringActive' | 'revealOnly' | 'audioQuestion';
  // Moderator host note — shown in /moderator during this question (private, not on beamer)
  hostNote?: string;
  // Fun/interesting fact about the topic — optional, moderator can drop it to lighten the mood.
  // Private, shown only in /moderator + host cheatsheet, never on beamer or team.
  funFact?: string;
  funFactEn?: string;
  /** 2026-05-11: Wissensgebiet-Tag (Musik/Geo/Promis/...) für CozyLibrary-Filter.
   *  Orthogonal zur Mechanik — ermöglicht Mix-Quizze mit Varianz über Themen.
   *  Free-text, Vorschläge siehe QQ_TOPICS. */
  topic?: string;
}

// ── Per-team per-phase stats ──────────────────────────────────────────────────
export interface QQTeamPhaseStats {
  stealsUsed: number;       // Phase 2: max QQ_MAX_STEALS_PER_PHASE
  jokersEarned: number;     // max QQ_MAX_JOKERS_PER_GAME over the whole game (not reset per phase)
  jokersThisPhase?: number; // 2026-05-05 (Wolf 'pro Runde max 1 Joker'): per-phase counter, reset bei Phase-Wechsel
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
  /** 2026-05-04: Optionales Emoji-Override fuer den Avatar-Inhalt. Wenn gesetzt,
   *  ueberschreibt es den Set-Default-Emoji aus avatarSets[setId].avatars[slot].
   *  Wird im /team-SetupFlow vom Spieler frei aus dem Set-Pool gewaehlt
   *  (Eindeutigkeit: jeder Emoji nur einmal pro Room). avatarId bleibt der
   *  Color-Slot-Schluessel — Farbe folgt also immer dem Slot, der Inhalt nicht. */
  emoji?: string;
  connected: boolean;
  totalCells: number;       // derived: how many cells owned
  largestConnected: number; // derived: largest connected territory (BFS)
  /** 2026-05-06 (Wolf 'in der Lobby anzeigen wenn Team mit Stammcode
   *  eingeloggt — willkommen zurueck, X. Mal dabei'): vom Backend beim
   *  qq:joinTeam async aus QQRegularTeamModel populiert. Optional, da
   *  neue Teams ohne Historie kein Eintrag haben. */
  gamesPlayed?: number;
  wins?: number;
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

  // 2026-05-10 (Wolf-Bug 'Comeback Frage DE in EN-Spiel'): EN-Parallel-Felder.
  // Frontend fällt auf DE zurück wenn EN fehlt (Backward-Compat zu alten
  // Einträgen ohne *En).
  unitEn?: string;
  anchorLabelEn?: string;
  subjectLabelEn?: string;
  customQuestionEn?: string;
}

/** Moderator-wählbare Zeit pro H/L-Runde. */
// 2026-04-30 v3 round 11 (User-Wunsch '20 sec pro frage'): 10 → 20s default.
export const QQ_COMEBACK_HL_TIMER_DEFAULT_SEC = 20;

/** Default Sekunden zwischen Hint-Reveals bei 4 gewinnt / Only Connect. */
export const QQ_ONLY_CONNECT_HINT_DURATION_DEFAULT_SEC = 15;

/** Bluff: Default-Sekunden für Schreib- und Vote-Phase. */
export const QQ_BLUFF_WRITE_DURATION_DEFAULT_SEC = 30;
export const QQ_BLUFF_VOTE_DURATION_DEFAULT_SEC = 30;

/**
 * Eine Bluff-Voting-Option. Entweder die echte Antwort oder ein Team-Bluff.
 * Bei Duplikat-Bluffs werden contributors gemerged (z.B. ['t1', 't3'] wenn
 * beide denselben Bluff geschrieben haben).
 */
export interface QQBluffOption {
  /** Stable ID (für vote-Auswahl). 'real' für die echte Antwort, sonst random/teambased. */
  id: string;
  /** Sichtbarer Bluff-Text. */
  text: string;
  /** 'real' = echte Antwort, 'team' = Team-Bluff (mit mind. 1 contributor). */
  source: 'real' | 'team';
  /** Team-IDs die diesen Bluff geschrieben haben (leer bei 'real'). */
  contributors: string[];
}

export interface QQBluffPoints {
  /** +2 wenn das Team die echte Antwort gefunden hat. */
  foundReal: number;
  /** +1 pro anderem Team das auf den eigenen Bluff reingefallen ist. */
  blufferBonus: number;
  /** Sonderbonus +3 wenn das Team versehentlich die echte Antwort getippt hat. */
  truthAccident: number;
  /** Summe für Tie-Break / Aktion-Auswertung. */
  total: number;
}

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
  /** 2026-05-10 (Wolf-Wunsch): CHEESE-Layout-Override pro Frage. Bei 'landscape'
   *  wird Image fullscreen + Card-Overlay unten gerendert; bei 'portrait'
   *  2-Spalten-Layout (Bild links, Card rechts). Wenn nicht gesetzt
   *  (= undefined), fällt der Beamer auf Auto-Detection zurück (Image-Dimension-
   *  basiert) — Backward-Compat zu alten Drafts. Nur für category=CHEESE relevant. */
  cheeseLayout?: 'landscape' | 'portrait';
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
  /** 2026-05-07 (Wolf-ESC-Sidequest): Pro-Draft optionales Lobby-BG-Bild.
   *  URL zu einem Bild oder SVG, wird in der LOBBY ueber den Standard-BG
   *  gelegt. Default undefined = Standard-BG bleibt. */
  lobbyBackgroundUrl?: string;
  /** Optional separates BG-Bild fuer Pause-Phase. Default = lobbyBackgroundUrl. */
  pauseBackgroundUrl?: string;
  /** Optional BG-Bild fuer PhaseIntro (Halbfinale 1, etc.). Default = lobbyBackgroundUrl. */
  phaseIntroBackgroundUrl?: string;
  /** Optional Logo-Bild fuer Branding-Pillen (z.B. Eurovision-Logo statt 🎤-Emoji). */
  logoUrl?: string;
  /** Pro-Draft Phasen-Namen Override (z.B. 'Halbfinale 1' statt 'Runde 1').
   *  Array-Index 0 = Phase 1, ... Default = Standard-Namen aus bt.phase.names. */
  phaseNames?: { de?: string[]; en?: string[] };
  /** Pro-Draft Welcome-Greeting in der LOBBY. Default = Standard-Welcome. */
  welcomeText?: { de?: string; en?: string };
  /** Master-Flag fuer Eurovision-spezifische UX-Akzente (Twelve-Points-
   *  Sticker bei richtiger Antwort, Mikrofon-Trophy statt 🏆, etc.).
   *  Andere Drafts ohne Flag = unveraendertes Verhalten. */
  eurovisionMode?: boolean;
  /** 2026-05-07: Pro-Draft Wunsch-Avatar-Set (z.B. 'esc' fuer Eurovision-
   *  Watchparty → Bots ziehen Flaggen statt zufaelliger MEGA-Pool-Emojis).
   *  Mod-SetupView wechselt beim Draft-Auswahl automatisch auf dieses Set,
   *  Wolf kann's manuell ueberschreiben. */
  preferredAvatarSetId?: string;
  /** 2026-05-07 (Wolf-ESC 'wie geil waere ein 10sec intro video'): optionales
   *  Welcome-Video das hinter dem CozyQuiz-Wordmark in der QuizIntroOverlay
   *  laeuft. Browser-autoplay-policy: muted by default (kein User-Gesture
   *  noetig). Datei kommt in public/themes/. Default undefined = kein Video. */
  welcomeVideoUrl?: string;
  /** 2026-05-07 (Wolf 'ich kann dir spezielle bgs fuer smartphones geben'):
   *  Phone-spezifisches BG (portrait 9:19). Wenn nicht gesetzt, faellt /team
   *  auf lobbyBackgroundUrl zurueck (mit object-fit cover). */
  mobileBackgroundUrl?: string;
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
  // Aktion-spezifische Sounds (Trinity: Place/Steal/Stapel + Team-Join)
  // 2026-04-30: shieldActivate / sanduhrFlip / swapActivate entfernt (Mechaniken tot).
  | 'stapelStamp' | 'teamJoin'
  // Reveal-Stages (2026-04-30): Differenzieren zwischen Loesung-faerbt-sich-gruen
  // (correct/reveal-Slot), Sieger-Card-Einblendung (winnerCardReveal), Grid-
  // Einblendung in PLACEMENT-Phase (gridReveal) und Action-Card-Einblendung
  // ('eure aktion diese runde…' — actionMenuReveal).
  | 'winnerCardReveal' | 'gridReveal' | 'actionMenuReveal' | 'climaxFinish' | 'revealHighlight' | 'goodLuckFanfare' | 'finaleMusic' | 'comebackMusic'
  // 2026-05-07 (Sound-Audit P2.1): Timer-Ticks customizable. Vorher Synth-only,
  // nicht im Mod-Panel sichtbar. Default leer = Synth-Fallback wie bisher.
  | 'timerTick' | 'timerUrgent'
  // 2026-05-13 (Wolf 'fuer die race phase, sowohl countdown als auch rennen,
  // aber auch der moment wo das treppchen reinkommt, brauche ich eigene mp3
  // slots'): Final-Reveal Race-Phase 3-Slot-Trio. Alle drei mit Fallback auf
  // den bisherigen Default-Cue (Tick / WoodKnock / WinnerCardReveal) wenn der
  // Slot leer ist — Wolf kann sie schrittweise befuellen.
  | 'raceCountdown' | 'raceLoop' | 'racePodium' | 'raceWinner' | 'raceTeamFall'
  | 'specialAwardReveal'
  // 2026-05-17 (Wolf-Feature CozyGames): Glücksrad-Spin + Stop-Snap.
  // 2026-05-19 (Wolf): cozyGameIntro = Anticipation-Chime beim 🪅-Mount.
  | 'cozyGameIntro' | 'cozyGameWheelTick' | 'cozyGameWheelStop' | 'cozyGameStart'
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
  // Aktions-Sounds (Trinity)
  stapelStamp?: string;
  teamJoin?: string;
  // Reveal-Stages
  winnerCardReveal?: string;
  gridReveal?: string;
  actionMenuReveal?: string;
  climaxFinish?: string;
  revealHighlight?: string;
  goodLuckFanfare?: string;
  // 2026-05-07: Timer-Tick + Urgent-Tick customizable
  timerTick?: string;
  timerUrgent?: string;
  finaleMusic?: string;
  comebackMusic?: string;
  // Race-Phase im Final-Reveal (Wolf 2026-05-13).
  raceCountdown?: string;  // 3-2-1-GO Stinger vor Race-Start
  raceLoop?: string;       // Hauptsound waehrend Race (loop, stoppt bei Gewinner)
  raceTeamFall?: string;   // Sound wenn ein Team aus dem Race faellt (pro Fall)
  raceWinner?: string;     // Sound wenn Gewinner entschieden ist (vor Treppchen)
  racePodium?: string;     // Whoosh/Fanfare beim Treppchen-Aufstieg
  specialAwardReveal?: string; // Pro Special-Award-Card-Flip (3x hintereinander)
  // CozyGame-Sounds (2026-05-17). Synth-Fallback wenn leer.
  cozyGameIntro?: string;       // 🪅 Intro-Mount-Anticipation
  cozyGameWheelTick?: string;  // tickender Pointer waehrend Spin
  cozyGameWheelStop?: string;  // Final-Snap beim Rad-Stopp
  cozyGameStart?: string;       // 60s-Timer-Start ("Los geht's"-Cue)
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
  stapelStamp:         '🏯 Stapeln (Stempel-Thud)',
  teamJoin:             '👋 Team tritt bei',
  winnerCardReveal:    '🏆 Sieger-Card erscheint',
  gridReveal:          '🗺️ Grid erscheint (Placement)',
  actionMenuReveal:    '🎯 Action-Card erscheint („eure Aktion …")',
  climaxFinish:        '🏆 Climax-Finish (WinnerCard / Sieger-Krönung)',
  revealHighlight:     '✨ Reveal-Highlight (grünes Antwortfeld erscheint)',
  goodLuckFanfare:     '🍀 Viel-Glück-Fanfare (Teams-Reveal Outro)',
  finaleMusic:         '🏁 Finale-Musik (4×4 Großes Finale Loop)',
  comebackMusic:       '🔥 Comeback-Musik (H/L-Mini-Game Loop)',
  timerTick:           '⏱ Timer-Tick (jede Sekunde unter 10s)',
  timerUrgent:         '⏰ Timer-Urgent-Tick (unter 5s)',
  raceCountdown:       '🏁 Race-Countdown (3-2-1-GO vor Race)',
  raceLoop:            '🏃 Race-Sound (Loop während Avatare rennen)',
  raceTeamFall:        '💥 Race-Team-Fall (pro Team das rausfällt)',
  raceWinner:          '🥇 Race-Winner (sobald Sieger entschieden)',
  racePodium:          '🏆 Treppchen-Aufstieg (Whoosh wenn Podium reinkommt)',
  specialAwardReveal:  '🏅 Special-Award-Reveal (pro Card-Flip, 3x in Drumroll-Folge)',
  cozyGameIntro:       '🪅 CozyGame-Intro (Anticipation-Chime beim Mount)',
  cozyGameWheelTick:   '🎲 CozyGame-Rad-Tick (Pointer-Tick während Spin)',
  cozyGameWheelStop:   '🎲 CozyGame-Rad-Stop (Final-Snap-Sound bei Rad-Landung)',
  cozyGameStart:       '🎲 CozyGame-Start (Los-geht\'s-Cue bei Timer-Start)',
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
  // 2026-04-30: leer = Pool-Logik in startLobbyLoop greift (4 Tracks geshuffelt).
  // Vorher: '/sounds/lobby-welcome.mp3' (existierte nicht, war Legacy).
  lobbyWelcome:  '',
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
  stapelStamp:         '',
  teamJoin:            '',
  winnerCardReveal:    '',
  gridReveal:          '',
  actionMenuReveal:    '',
  climaxFinish:        '',
  revealHighlight:     '',
  goodLuckFanfare:     '',
  finaleMusic:         '',
  comebackMusic:       '',
  timerTick:           '',
  timerUrgent:         '',
  raceCountdown:       '',
  raceLoop:            '',
  raceTeamFall:        '',
  raceWinner:          '',
  racePodium:          '',
  specialAwardReveal:  '',
  cozyGameIntro:       '',
  cozyGameWheelTick:   '',
  cozyGameWheelStop:   '',
  cozyGameStart:       '',
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
  phases: 2 | 3 | 4;
  language: QQLanguage;
  questions: QQQuestion[];
  /** 2026-05-05 (Wolf-Wunsch): Connections-Finale-Set pro Draft.
   *  Wenn nicht gesetzt → Backend nutzt Default/Hardcoded. Wenn gesetzt
   *  → Mod startet Connections mit diesem Set. */
  connections?: QQConnectionsPayload;
  /** Connections-Konfig: Spielzeit + max Fehler pro Team. */
  connectionsDurationSec?: number;   // default 180
  connectionsMaxFails?: number;       // default 4
  theme?: QQTheme;
  slideTemplates?: QQSlideTemplates;
  soundConfig?: QQSoundConfig;
  /** 2026-05-17 (Wolf-Wunsch): CozyGames aktivieren — analoge Real-Life-Mini-Spiele
   *  nach Runde 1 + als Final-Kategorie-Slot. Doku: COZYGAMES.md im Repo-Root. */
  cozyGamesEnabled?: boolean;
  /** IDs aus dem CozyGames-Katalog die für diesen Quiz aktiv sind (max 8 fürs Rad).
   *  Wird nur konsumiert wenn cozyGamesEnabled === true. */
  cozyGamesPool?: string[];
  /** 2026-05-17 (Wolf): Comeback-Mechanik (Higher/Lower-Mini-Game vor Final-Runde)
   *  kann pro Draft/Quiz deaktiviert werden. Default true (Backward-Compat).
   *  Wenn false: kein Comeback-Step, Rules-Slide ausblenden, Phase wechselt
   *  direkt von vorletzter zur Final-Runde. */
  comebackEnabled?: boolean;
  /** 2026-06-13 (Show-Prep-Wizard): Vorgeplante Default-Timerdauer pro Quiz.
   *  Wird beim Raum-Setup angewandt, damit „vorausplanen → Venue nur Start"
   *  funktioniert (Timer ist sonst nur pro-Raum). undefined → 30s-Default. */
  defaultTimerSec?: number;
  createdAt: number;
  updatedAt: number;
}

// ── State broadcast (server → all clients) ────────────────────────────────────
export interface QQStateUpdate {
  /** 2026-05-19: Server-Date.now() zum Zeitpunkt des Builds. Frontend rechnet
   *  daraus einen Clock-Offset (Client-PC vs Server-PC) und nutzt diesen für
   *  Timer-Berechnungen via `getServerNow()`. Verhindert Anzeige-Drift wenn
   *  z.B. der Beamer-PC eine schiefe Systemuhr hat. */
  serverTime: number;
  roomCode: string;
  phase: QQPhase;
  gamePhaseIndex: QQGamePhaseIndex;
  questionIndex: number;       // 0-14 global
  gridSize: number;
  grid: QQGrid;
  teams: QQTeam[];
  /** 2026-05-24 (Refactor #2 Drift-Killer): kanonische Ranking-Sortierung pro
   *  State-Update. Sortiert nach tieBreakerWinnerId-Override → largestConnected
   *  desc → totalCells desc → join-Order. Frontend-Views sollen diese nutzen
   *  statt eigene Sortierung — sonst Drift zwischen Mod, Beamer, Team-View. */
  sortedTeamIds?: string[];
  /** 2026-05-24 (Wolf-Bug Bot-Pause): Wenn true, fuehren Backend-Helper
   *  (maybeAutoSimulateAnswers, maybeAutoPlace, maybeAutoComebackChoice)
   *  keine Bot-Aktionen mehr aus. Mod-Toggle ueber qq:setBotsPaused. */
  botsPaused?: boolean;
  teamPhaseStats: Record<string, QQTeamPhaseStats>;
  currentQuestion: QQQuestion | null;
  revealedAnswer: string | null;
  correctTeamId: string | null;
  // Alle Gewinner der aktuellen Frage in Placement-Reihenfolge (fastest zuerst).
  // Wird für "du warst richtig, aber nicht schnellstes"-Hinweise im /team genutzt.
  currentQuestionWinners?: string[];
  // 2026-05-02: Tie-Breaker am Spielende. Wenn ≥2 Teams identische
  // (largestConnected, totalCells) haben, listet `tieBreakerCandidates` sie
  // — Mod resolved manuell, danach steht der Sieger in `tieBreakerWinnerId`.
  tieBreakerCandidates?: string[];
  tieBreakerWinnerId?: string | null;
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
  timerExpired?: boolean;            // 2026-05-02: true wenn Timer regulaer abgelaufen (nicht via Reveal/Stop)
  // Answers (all submissions this question)
  answers: QQAnswerEntry[];
  // 2026-05-02: Pro-Team-Hits fuer Top5/Order. Backend matcht mit
  // similarityScore>=0.8 (fuzzy); Frontend liest die Indizes/booleans
  // statt eigene strict-Match-Logik zu fahren.
  top5HitsByTeam?: Record<string, number[]>;       // teamId -> indices in correctAll (concat answers + answersEn)
  orderHitsByTeam?: Record<string, boolean[]>;     // teamId -> per-position correctness
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
  // 2026-05-12 (Wolf-Bug 'Reihenfolge im Halbkreis stimmt nicht'):
  // Backend-Score-Sortierung muss ins Frontend, damit die Semicircle-Slots
  // (links=next, rechts=prev) zur Backend-Rotation passen. Ohne diese Order
  // fiel das Frontend auf alphabetische Name-Sortierung zurueck — die
  // mismatchte mit nextRoundRobinTeam().
  hotPotatoOrder?: string[];            // team-ids in Backend-Rotation-Reihenfolge
  // 2026-05-06: Slot-Machine Intro vor dem ersten Hot-Potato-Zug.
  // 'rolling' = Slot dreht (visualisiert das schon-bekannte Random-Team auf
  //             dem Beamer als Slot-Roll); Timer steht still, /team noch
  //             ohne Antwortfeld.
  // 'landed'  = Slot-Animation visuell abgeschlossen, Sieger steht, aber
  //             Turn-Timer laeuft NOCH NICHT — Mod kann muendlich announcen,
  //             dann mit Space den Timer starten (3-Phasen-Flow).
  // 'finished'= Slot ist gelandet, Turn-Timer laeuft, Eingabe freigegeben.
  // null/undef = noch keine Hot-Potato-Frage aktiv.
  hotPotatoSlotState?: 'rolling' | 'landed' | 'finished' | null;
  // Imposter (oneOfEight round-robin)
  imposterActiveTeamId: string | null;
  imposterChosenIndices: number[];      // statement indices already chosen (correct ones removed)
  imposterEliminated: string[];         // teamIds eliminated (chose the false statement)
  // 4 gewinnt / Connect 4 (BUNTE_TUETE kind=onlyConnect)
  /** Per-Team Hint-Index (0..3). Jedes Team schaltet individuell frei → Strategie:
   *  weniger Hinweise = mehr Punkte. Beamer zeigt min(...indices) damit kein Spoiler. */
  onlyConnectHintIndices: Record<string, number>;
  /** Per-Team Timestamp wann der aktuelle Hinweis freigeschaltet wurde. */
  onlyConnectHintRevealedAt: Record<string, number>;
  /** Teams die nach 3 Strikes gesperrt wurden — keine weiteren Tipps mehr. */
  onlyConnectLockedTeams: string[];
  /** Strikes pro Team (0..3). 3 Strikes → locked. */
  onlyConnectStrikes: Record<string, number>;
  /** Erstes richtig-tippendes Team. Null wenn noch keiner.
   *  (Wird primär für Display genutzt — die Eval-Liste kommt aus onlyConnectGuesses.) */
  onlyConnectWinnerTeamId: string | null;
  /** Bei welchem Hint-Index (0..3) wurde gelöst — für Punkte-Skala. */
  onlyConnectWinnerHintIdx: number | null;
  /** Per-Team Submission (für Beamer-Display + Logging). */
  onlyConnectGuesses: Array<{ teamId: string; text: string; correct: boolean; submittedAt: number; atHintIdx: number }>;
  /** Deprecated mit Per-Team-Modell — bleibt im Type aus Backward-Compat. */
  onlyConnectHintDurationSec: number;
  // Bluff (BUNTE_TUETE kind=bluff)
  /** Aktuelle Bluff-Sub-Phase. Null wenn nicht aktiv. */
  bluffPhase: 'write' | 'review' | 'vote' | 'reveal' | null;
  /** Server-Timestamp Ende der Schreib-Phase (write). */
  bluffWriteEndsAt: number | null;
  /** Server-Timestamp Ende der Vote-Phase. */
  bluffVoteEndsAt: number | null;
  /** Per-Team eingereichter Bluff-Text. */
  bluffSubmissions: Record<string, string>;
  /** Globaler Pool aller Voting-Optionen (real + alle Team-Bluffs nach Dedupe).
   *  Wird für Reveal/Eval genutzt. Beamer zeigt diesen Pool im Reveal. */
  bluffOptions: QQBluffOption[];
  /** Per-Team random 4er-Subset (real + 3 zufällige andere Bluffs). Jedes
   *  Team sieht NUR seine eigenen 4 Optionen → kompakter & vermeidet
   *  Beamer-Spoiler bei vielen Teams. */
  bluffOptionsByTeam: Record<string, QQBluffOption[]>;
  /** Per-Team gewählte Option-ID (vote phase). */
  bluffVotes: Record<string, string>;
  /** Per-Team computed Teilpunkte (reveal phase). */
  bluffPoints: Record<string, QQBluffPoints>;
  /** Moderator-konfigurierbar: Sekunden für Schreib-Phase. */
  bluffWriteDurationSec: number;
  /** Moderator-konfigurierbar: Sekunden für Vote-Phase. */
  bluffVoteDurationSec: number;
  /** Setup-Toggle: Moderator-Vorprüfung der Bluffs vor Voting? Default false. */
  bluffModeratorReview: boolean;
  /** Bei review: Bluffs die der Moderator gelöscht/zensiert hat (teamId-set). */
  bluffRejected: string[];
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
  totalPhases: 2 | 3 | 4;
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
  // 2026-07-02 (Wolf): Format-Wahl im Wizard-Schritt 0 (Cozy vs. Mega). Solange
  // false, zeigt der Beamer den neutralen Welcome (Brand, kein Grid/keine Faktion) —
  // erst nach der Wahl kippt er auf die format-spezifische Pre-Game-Ansicht.
  formatSelected?: boolean;
  // Mod waehlt im Setup ein Avatar-Theme fuer dieses Quiz. Default 'all'
  // (Emoji-Standard, freie Auswahl). 'cozyCast' = klassische PNG-Avatare.
  // Werte: 'all' | 'cozyAnimals' | 'cozyCast' | 'halloween' | 'christmas' |
  //        'pub' | 'scifi' | 'sport' | 'tropical' | 'fantasy'
  avatarSetId?: string;
  // 2026-06-24: gewaehltes Buehnen-Design (Skin) — 'cozy'|'studioMono'|'softPop'|'neoBrutal'.
  themeId?: string;
  // Bei Set 'all' wuerfelt der Server 8 Slot-Emojis quer durch alle Themen,
  // damit's nicht immer Cozy-Tiere sind. Bei anderen Sets ungenutzt
  // (Renderer nimmt Set-eigene Emojis aus avatarSets.ts).
  avatarSetEmojis?: string[];
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
  // ── Final-Wager-Mechanik (eigene Phase FINAL_BETTING vor letzter Spiel-Phase) ──
  // Teams setzen vor der Final-Runde Felder als „Wette" auf ein anderes (oder eigenes)
  // Team. Cap: max floor(eigene_Felder / 2). Pro gewettetes Feld auf das Sieger-Team
  // der Final-Runde = +1 Bonus-Coin im End-Score (Felder bleiben am Brett, Cells
  // werden nicht visuell konvertiert — Bonus läuft als separate Pile).
  // 2026-05-09 Refactor: Tipp-Variante. Pro Team 1 Tipp (oder kein Tipp).
  // Bonus = Anzahl Final-Kategorien-Wins des getippten Teams (0-5). Mutual-Pair
  // (A→B && B→A) gibt zusätzlich +1 Sympathie-Bonus für beide Teams.
  // KEIN Verlust mehr — niedrigster Bonus = 0, kein Cell-Removal, keine Strafe.
  finalBets: Record<string, QQFinalBet | null>;       // teamId → 1 Tipp oder null
  finalBettingSubmitted: Record<string, boolean>;     // teamId → has-submitted-flag
  /** 2026-05-24: Intro-Slide-Flag vor der eigentlichen Bet-Phase. false beim
   *  Start, true sobald Mod via Space dismissed. Default true für Backwards-
   *  Compat (alte Saves ohne Feld → kein Intro). */
  finalBettingIntroDone?: boolean;
  /** Lifetime-Steal-Counter pro Team (kumulativ über alle Phasen) — fließt
   *  in den „Meisterklauer"-End-Award am Ende des Spiels ein. Backend-Source:
   *  room.teamTotalSteals (increment in qqStealCell). */
  teamTotalSteals: Record<string, number>;
  /** End-Awards (Mario-Party-Style) — wird beim qqResolveFinalBets berechnet.
   *  null wenn noch nicht resolved oder kein klarer Sieger pro Award. */
  endAwards: QQEndAwards | null;
  /** Pro Final-Phase-Frage akkumulierte Wins pro Team. Wird beim Wechsel in
   *  die nächste Final-Frage (qqNextQuestion innerhalb der letzten Phase)
   *  aus dem Cells-Delta gegen den vorhergegangenen Snapshot berechnet. */
  finalPhaseWins: Record<string, number>;             // teamId → count of final-cat wins (0-5)
  /** Letzter Cells-Snapshot zum Delta-Tracking pro Final-Frage. Wird bei
   *  qqStartFinalBetting + nach jeder Final-Frage aktualisiert. */
  finalLastSnapshot: Record<string, number> | null;
  /** 2026-05-09 (Wolf): Recap-Step zwischen Final-Fragen.
   *  0 = normal flow / kein Recap sichtbar.
   *  1 = Recap-Slide ist sichtbar (Mod-Space schaltet zu next-Frage).
   *  Backend setzt das nach jedem qq:nextQuestion in der Final-Phase auf 1
   *  (statt direkt zur nächsten Frage zu wechseln); zweiter Mod-Space
   *  setzt es zurück auf 0 und löst den eigentlichen Wechsel aus. */
  finalRecapStep: 0 | 1;
  /** Letzte Frage-Winner-IDs (für Recap-Highlight). null wenn noch nichts. */
  finalRecapJustWon: string[] | null;
  /** 2026-05-09 (Wolf End-Flow): Mehr-Step-Choreo in der FINAL_REVEAL-Phase.
   *  0 = Title-Hold, 1 = Grid-Reveal, 2..N+1 = Bet-Reveal pro Team
   *  (aufsteigend nach Bonus), N+2..N+7 = 3 Awards × 2 Steps (Card-Reveal +
   *  Avatar-Punkt), N+8..2N+7 = Ranking-Slides last→first (single bis #4,
   *  Treppchen ab #3), 2N+8 = → Thanks. Mod-Space increments. */
  finalRevealStep: number;
  /** 2026-05-25 (Wolf Final-Wager v4): Pending Stack-Placement waehrend
   *  FINAL_REVEAL. Wird beim Step-Advance gesetzt, vom Team via
   *  qq:finalRevealPlaceStack abgearbeitet. null = kein pending Placement. */
  finalRevealPendingStacks?: {
    teamId: string;
    kinds: Array<'underdog' | 'speedy' | 'meisterklauer' | 'bet' | 'sympathy'>;
  } | null;
  finalRoundWinners: string[] | null;                 // Legacy/optional: bei Tie alle gemeinsam — UI-Hinweis nur
  finalBetResolution: Record<string, QQFinalBetResolution> | null; // teamId → resolved bonus
  /** Setup-Toggle: aktiviert die Final-Wager-Mechanik. Wenn true, lösen Space-
   *  Hotkey + Autoplay den Bet-Phase-Übergang automatisch aus (vor letzter
   *  Phase = Bet-Phase, nach letzter Frage = Resolve). Default false. */
  finalWagerEnabled: boolean;
  /** 2026-05-09 v2: Frage-Recap-Daten für THANKS-Page-News-Ticker. Slim-
   *  Variante (nur winner-relevante Felder), volle Daten bleiben in der
   *  Summary-Save-Pipeline. bunteTueteKind erlaubt dem Ticker das Sub-
   *  spezifische Emoji (🎭 Bluff / 🧩 onlyConnect / ...) statt 🎁. */
  questionHistory?: Array<{
    questionText: string;
    category: string;
    bunteTueteKind?: string;
    correctTeamId: string | null;
    correctTeamIds?: string[];
  }>;
  /** 2026-05-10 (Wolf-Bug 'geteilter Summary-Link wird nach nächstem Spiel
   *  überschrieben'): Beim GAME_OVER → THANKS gesetzt. ThanksView nutzt diese
   *  Game-Result-ID für den QR-Link (`/summary/by-id/{id}`) statt nur
   *  `/summary/{roomCode}`, damit jeder geteilte Link stabil bleibt — auch
   *  wenn der RoomCode (SINGLE_SESSION_MODE = MAIN) wieder verwendet wird. */
  lastGameResultId?: string | null;
  /** 2026-05-17 (Wolf-Feature CozyGames): Round-State während COZY_GAME-Phase.
   *  null wenn nicht aktiv. Doku: COZYGAMES.md im Repo-Root, Types in
   *  shared/cozyGameTypes.ts. */
  cozyGame?: import('./cozyGameTypes').CozyGameRoundState | null;
  /** Setup-Toggle: aktiviert CozyGames in diesem Run. Default false. */
  cozyGamesEnabled?: boolean;
  /** Aktive CozyGame-IDs (Builder-Auswahl, max 8). */
  cozyGamesPool?: string[];
  /** Setup-Toggle: aktiviert Comeback-Mechanik (H/L vor Final). Default true. */
  comebackEnabled?: boolean;
  /** Setup-Toggle: Groß-Gruppen-Modus (bis 25 Teams). Bar-Race-Score statt Grid,
   *  Top-5-schnellste-Reveal statt Placement. Default false. */
  largeGroupMode?: boolean;
  /** Setup-Sub-Modus (2026-07-01, Wolf Idee 2): Genestete Teams — 8 Eltern-Teams
   *  à bis zu 3 Sub-Teams (eigene Handys, unabhängiges Antworten), Punkte fließen
   *  ins Eltern-Team. Impliziert largeGroupMode. Bar-Race gruppiert nach avatarId
   *  (= Eltern-Team) → 8 Balken statt 24. Default false. */
  nestedTeams?: boolean;
  /** Modell B (2026-07-02): per-Frage-Ranking der Haupt-Teams (Farben) fürs
   *  Mega-Event-Reveal. Vom Backend bei qqStartPlacement gesetzt, auf null bei
   *  neuer Frage. Sortiert nach Rang (0 = beste). */
  megaQuestionRanking?: QQMegaRankEntry[] | null;
  /** Mega Event: 3 Faktions-Awards am Spielende (avatarId je Award, null wenn
   *  keiner). Vom Backend am Spielende berechnet. */
  megaAwards?: QQMegaAwards | null;
}

/** Mega-Event-Faktions-Awards (Spielende). avatarId = Gewinner-Farbe je Award. */
export interface QQMegaAwards {
  /** ⚡ Schnellstes Team — am öftesten die schnellste richtige Farbe. */
  fastest: string | null;
  /** 🎯 Treffsicherstes Team — höchste Trefferquote (richtig/abgegeben). */
  sharpshooter: string | null;
  /** 🔥 Beste Aufholjagd — größter Rang-Aufstieg vom Start bis zum Ende. */
  comeback: string | null;
}

/** Modell B Mega-Event: Ergebnis EINER Farbe (Haupt-Team) für die aktuelle Frage.
 *  correct = wie viele der Sub-Handys „getroffen" haben (richtig/nah/Punkte>0),
 *  total = Anzahl Sub-Handys der Farbe, points = diese Frage vergebene Punkte
 *  (Top-5: 5/4/3/2/1 + 1 Basis wenn correct>0), rank = 0-basiert. */
export interface QQMegaRankEntry {
  avatarId: string;
  correct: number;
  total: number;
  points: number;
  rank: number;
}

/** Tipp eines Teams auf ein anderes Team (oder eigenes Team).
 *  2026-05-09 Refactor: kein Cell-Risk mehr — Tipp-Variante. */
export interface QQFinalBet {
  targetTeamId: string;
}

/** End-Awards (Mario-Party-Style): 3 Bonus-Awards die bei qqResolveFinalBets
 *  berechnet werden. Jeder Award gibt +1 Punkt im End-Score. */
export interface QQEndAwards {
  /** Team mit niedrigstem totalCells (Trostpreis). null wenn alle gleichauf. */
  underdog: string | null;
  /** Team mit meisten Steals (kumulativ). null wenn niemand geklaut hat. */
  meisterklauer: string | null;
  /** Anzahl Klaus des Meisterklauers (zur Anzeige). */
  meisterklauerCount: number;
  /** Speedy-Gonzales-Award: Team das am ÖFTESTEN als Erster (mit korrekter
   *  Antwort) eingereicht hat. Tie-Break: niedrigste avg-Reaktionszeit.
   *  null wenn keine Daten. */
  speedy: string | null;
  /** Avg-Reaktionszeit in ms (Tie-Break + FunFact-Stat). */
  speedyAvgMs: number;
  /** 2026-05-23 (Wolf-Live-Test #N): Count "wie oft war Team als erstes
   *  Korrekt-Submitter". Primärer Award-Wert. Optional für Backward-Compat
   *  mit alten Game-Results vor diesem Date. */
  speedyFirstCount?: number;
}

/** Pro Team aufgelöstes Final-Tipp-Ergebnis.
 *  bonus = N Final-Kat-Wins des getippten Teams + 1 wenn mutual.
 *  KEIN Verlust mehr (kein lostBets, keine Cell-Removal). */
export interface QQFinalBetResolution {
  /** Auf welches Team das Team getippt hat. null = kein Tipp abgegeben. */
  targetTeamId: string | null;
  /** Wins des getippten Teams (0-5). */
  targetWins: number;
  /** +1 wenn mutual-Pair (A→B && B→A). 0 sonst. */
  sympathyBonus: 0 | 1;
  /** Sum: targetWins + sympathyBonus. */
  totalBonus: number;
  /** Bei mutual-Pair: teamId des Sympathie-Partners. */
  mutualWith: string | null;
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
  | 'STAPEL_BONUS' // Connections-Finale: Stapel-Bonus pro erratener Gruppe; eigene Cell, multi-stack erlaubt, +1 Pkt pro Stapel.
  | 'COMEBACK';  // before final phase: comeback team acts

// ── Socket event payloads (client → server) ───────────────────────────────────
export interface QQJoinModeratorPayload  { roomCode: string; pin?: string; }
export interface QQJoinBeamerPayload     { roomCode: string; }
export interface QQJoinTeamPayload       { roomCode: string; teamId: string; teamName: string; avatarId: string; emoji?: string; }

export interface QQStartGamePayload      { roomCode: string; questions: QQQuestion[]; language: QQLanguage; phases: 2 | 3 | 4; theme?: QQTheme; draftId?: string; draftTitle?: string; slideTemplates?: QQSlideTemplates; soundConfig?: QQSoundConfig; connections?: QQConnectionsPayload; connectionsDurationSec?: number; connectionsMaxFails?: number; cozyGamesEnabled?: boolean; cozyGamesPool?: string[]; comebackEnabled?: boolean; largeGroupMode?: boolean; nestedTeams?: boolean; }
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
// Final-Betting-Phase
/** Mod startet die Final-Betting-Phase (vor letzter Spiel-Phase) */
export interface QQStartFinalBettingPayload { roomCode: string; }
/** Team submitted seinen Tipp. bet = null bedeutet bewusst kein Tipp (= 0 Bonus-Chance). */
export interface QQSubmitFinalBetPayload    { roomCode: string; teamId: string; bet: QQFinalBet | null; }
/** Mod beendet die Bet-Phase + startet die Final-Phase (auch wenn nicht alle gesubmittet haben) */
export interface QQFinishFinalBettingPayload { roomCode: string; }
/** Mod löst Final-Reveal aus (nach letzter Frage der Final-Phase) */
export interface QQResolveFinalBetsPayload  { roomCode: string; }
/** Mod-Toggle im Setup: aktiviert Final-Wager-Mechanik */
export interface QQSetFinalWagerEnabledPayload { roomCode: string; enabled: boolean; }

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
// 2026-05-05 (Wolf-Klaerung 'eine farbe pro team ueberall'): Avatar-Slot-
// Farben entsprechen jetzt der 8-Farben-Brett-Palette mit 45°-Hue-Spread.
// Vorher: cow (#F59E0B amber) vs unicorn (#FACC15 yellow) → warm-gelb-Konflikt;
// cat (#EF4444 red) vs fox (#EC4899 pink) → rot-pink-Konflikt. Jetzt:
// alle 8 Slots klar unterscheidbar UND team.color = Cell-Farbe = Standings-
// Farbe (eine Quelle, nicht zwei Paletten parallel).
export const QQ_AVATARS = [
  { id: 'fox',     slug: 'shiba',     emoji: '🐕', label: 'Hund',      labelEn: 'Dog',      color: '#F97316', hoodie: '#0EA5E9' },
  { id: 'frog',    slug: 'faultier',  emoji: '🦥', label: 'Faultier',  labelEn: 'Sloth',    color: '#22C55E', hoodie: '#7C2D12' },
  { id: 'panda',   slug: 'pinguin',   emoji: '🐧', label: 'Pinguin',   labelEn: 'Penguin',  color: '#14B8A6', hoodie: '#FDE047' },
  { id: 'rabbit',  slug: 'koala',     emoji: '🐨', label: 'Koala',     labelEn: 'Koala',    color: '#A855F7', hoodie: '#EAB308' },
  { id: 'unicorn', slug: 'giraffe',   emoji: '🦒', label: 'Giraffe',   labelEn: 'Giraffe',  color: '#FACC15', hoodie: '#5B21B6' },
  { id: 'raccoon', slug: 'waschbaer', emoji: '🦝', label: 'Waschbär',  labelEn: 'Raccoon',  color: '#3B82F6', hoodie: '#F59E0B' },
  { id: 'cow',     slug: 'kuh',       emoji: '🐄', label: 'Kuh',       labelEn: 'Cow',      color: '#EC4899', hoodie: '#581C87' },
  { id: 'cat',     slug: 'capybara',  emoji: '🐹', label: 'Capybara',  labelEn: 'Capybara', color: '#EF4444', hoodie: '#166534' },
] as const;

export type QQAvatar = typeof QQ_AVATARS[number] & { image: string; imageClosed: string };

// ── Mega-Event-Faktionen (2026-07-02, Wolf) ──────────────────────────────────
// Im Mega Event bekommen die 8 Farb-Slots eine eigene, charakterstarke Identität:
// cozy/schlaue Tiere mit alliterativen „Wortwitz"-Namen (statt „Team Hund").
// slug = cozy3d-Avatar (via teamEmoji auf die Farb-Disc gerendert). Rein
// Display-Layer, nur largeGroupMode — Normal-Modus behält die Default-Avatare.
// „Cozy Universe" (Wolf 2026-07-02): die 8 sind echte Fraktionen mit eigener
// Identität — Tier + Farbe + Witz-Name + Motto (+ Wappen via <FactionCrest>).
export const QQ_MEGA_FACTIONS = [
  { avatarId: 'fox',     slug: 'dachs',    nameDe: 'Denkfaule Dachse',   nameEn: 'Lazy-Brain Badgers',  mottoDe: 'Langsam, aber gründlich.',   mottoEn: 'Slow but thorough.' },
  { avatarId: 'frog',    slug: 'otter',    nameDe: 'Oberschlaue Otter',  nameEn: 'Overly-Smart Otters', mottoDe: 'Immer eine Antwort parat.',  mottoEn: 'Always an answer ready.' },
  { avatarId: 'panda',   slug: 'panda',    nameDe: 'Pfiffige Pandas',    nameEn: 'Sharp Pandas',        mottoDe: 'Charmant & clever.',         mottoEn: 'Charming & clever.' },
  { avatarId: 'rabbit',  slug: 'koala',    nameDe: 'Kluge Koalas',       nameEn: 'Clever Koalas',       mottoDe: 'Ausgeschlafen zum Sieg.',    mottoEn: 'Well-rested for the win.' },
  { avatarId: 'unicorn', slug: 'lama',     nameDe: 'Lässige Lamas',      nameEn: 'Laid-back Llamas',    mottoDe: 'Cool bleiben, Punkte machen.', mottoEn: 'Stay cool, score points.' },
  { avatarId: 'raccoon', slug: 'gorilla',  nameDe: 'Grübelnde Gorillas', nameEn: 'Pondering Gorillas',  mottoDe: 'Erst denken, dann brüllen.', mottoEn: 'Think first, roar later.' },
  { avatarId: 'cow',     slug: 'baer',     nameDe: 'Belesene Bären',     nameEn: 'Well-read Bears',     mottoDe: 'Wissen ist Honig.',          mottoEn: 'Knowledge is honey.' },
  { avatarId: 'cat',     slug: 'capybara', nameDe: 'Clevere Capybaras',  nameEn: 'Clever Capybaras',    mottoDe: 'Ganz entspannt vorne.',      mottoEn: 'Chilled to the top.' },
] as const;

export function qqMegaFaction(avatarId: string) {
  return QQ_MEGA_FACTIONS.find(f => f.avatarId === avatarId);
}
/** Fraktions-Motto (Cozy Universe) — Einzeiler unter dem Wappen. */
export function qqMegaFactionMotto(avatarId: string, lang: 'de' | 'en'): string {
  const f = qqMegaFaction(avatarId);
  return f ? (lang === 'en' ? f.mottoEn : f.mottoDe) : '';
}
export function qqMegaFactionName(avatarId: string, lang: 'de' | 'en'): string {
  const f = qqMegaFaction(avatarId);
  return f ? (lang === 'en' ? f.nameEn : f.nameDe) : avatarId;
}
/** Faktions-Avatar-Slug (cozy3d) je Farb-Slot — als teamEmoji an QQTeamAvatar. */
export function qqMegaFactionSlug(avatarId: string): string | undefined {
  return qqMegaFaction(avatarId)?.slug;
}
/** Reverse-Lookup über die Slot-Farbe (für Listen ohne avatarId, z.B. Recap-Index). */
export function qqMegaFactionByColor(color: string) {
  const av = QQ_AVATARS.find(a => a.color.toLowerCase() === color.toLowerCase());
  return av ? qqMegaFaction(av.id) : undefined;
}

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

/** 2026-05-05 (Wolf-Wahl 3B): 8-Slot-Brett-Palette mit maximalem Hue-Spread.
 *  Wird auf den Spielfeld-Cells verwendet damit keine zwei Teams aehnliche
 *  Farben am Brett haben (auch wenn ihre Avatar-Farben sich aehneln, z.B.
 *  pink+rot oder yellow+amber). Team-Identity (Avatar-Farbe / Name-Color
 *  in Standings, Score, Comeback etc.) bleibt unangetastet — nur das
 *  BRETT erhaelt die gemappte Palette-Farbe. Mapping: Team-Slot via
 *  joinOrder.indexOf(teamId) → palette[slot % 8]. */
export const QQ_BOARD_PALETTE = [
  '#EF4444', // red
  '#F97316', // orange
  '#FACC15', // yellow
  '#22C55E', // green
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#A855F7', // purple
  '#EC4899', // pink
] as const;

/** Akzeptiert entweder ein joinOrder string[] (Backend) oder ein teams[]
 *  array (Frontend, das einfacher zugaenglich ist). */
export function qqGetBoardColor(
  teamId: string,
  source: string[] | { id: string }[] | undefined
): string {
  if (!source || source.length === 0) return QQ_BOARD_PALETTE[0];
  let idx: number;
  if (typeof source[0] === 'string') {
    idx = (source as string[]).indexOf(teamId);
  } else {
    idx = (source as { id: string }[]).findIndex(t => t.id === teamId);
  }
  if (idx < 0) return QQ_BOARD_PALETTE[0];
  return QQ_BOARD_PALETTE[idx % QQ_BOARD_PALETTE.length];
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

// ── 2026-05-04: Witzige Team-Namen + Default-Emoji-Pool ──────────────────
// Genutzt von:
//   - Backend server.ts /dev/fillTeams (Dummy-Spawner) → random Namen
//   - Backend qq:setAvatarSet bei 'all' → 8 zufaellige Slot-Emojis
//   - Frontend /testpage Spielwiese (statisch, kein Random-Mount mehr)

/** Pub-Quiz-typische Team-Namen — quer durch alle Stile, easter eggs erlaubt.
 *  Mix aus kurzen (passen ohne Truncate auf jede Lobby-Karte) und ein paar
 *  laengeren (kommen dann via Wrap auf 2 Zeilen). */
export const FUNNY_TEAM_NAMES: string[] = [
  // Kurz (≤ 12 Z.) — passen sicher
  'Quiz Khalifa', 'Käpt\'n Kluk', 'Eulen-Spiegel', 'Wolfsrudel',
  'Brain-Trust', 'Nicht Zuhause', 'Quiz-Mafia', 'Cozy Cats',
  'Couch-Wolves', 'Hirnsturm', 'Quiz-Asse', 'Trivia-Trio',
  'Glühbirnen', 'Bierdeckel', 'Wissens-Wölfe',
  'Frag-Tiger', 'Smarty Pants', 'Käse-Kenner', 'Pubquatscher',
  // Mittel (13-17 Z.) — Wrap moeglich
  'Google sei Dank', 'Synapsen-Salat', 'Fakten-Faktor',
  'Pub-Crawl-Profis', 'Anonyme Allwisser', 'Fakt oder Fiktion',
  'Die Couch-Quizzer', 'Schlaubi-Schlümpfe',
  // Lang (≥ 18 Z.) — auf jeden Fall Wrap
  'Schon Wieder Falsch', 'Halbwissen Gold Wert', 'Drei Halbe Ne Ganze',
  'Frag-Mich-Was-Leichtes', 'Zwischen Bier und Bildung',
];

/** Englische Pub-Quiz-Team-Namen — Wortspiele, Easter Eggs, leicht britisch.
 *  Mix kurz/mittel/lang wie die deutsche Liste. */
export const FUNNY_TEAM_NAMES_EN: string[] = [
  // Kurz (≤ 12 Z.)
  'Quiz Khalifa', 'The Smartinis', 'Cozy Cats', 'Couch Wolves',
  'Brain Trust', 'Quiz Mafia', 'Trivia Trio', 'Smarty Pants',
  'Cheese Heads', 'Pub Wizards', 'The Knowists', 'Beer Goggles',
  'Wolfpack', 'Brainstormers', 'Lightbulbs',
  // Mittel (13-17 Z.)
  'Google Says So', 'Synapse Salad', 'Fact Hunters',
  'The Pub Profs', 'Anonymous Aces', 'Fact or Fiction',
  'The Couch Quizzers', 'Half-Smart Heroes',
  // Lang (≥ 18 Z.)
  'Wrong Again, Sorry', 'Worth Your Half-Knowledge', 'Three Halves Make One',
  'Just Ask Us Easy Ones', 'Between Beers and Brains',
];

/** Liefert die passende Witz-Namen-Liste je nach Sprache. */
export function getFunnyTeamNames(lang: 'de' | 'en'): string[] {
  return lang === 'en' ? FUNNY_TEAM_NAMES_EN : FUNNY_TEAM_NAMES;
}

/** 2026-05-07 (Wolf 'gib den dummys passende eurovision songcontest namen'):
 *  Eurovision-themed Bot-Namen. Nutzt der Backend-fillTeams-Endpoint wenn
 *  room.theme.eurovisionMode aktiv ist. Mix aus ESC-Phrasen, klassischen
 *  Sieger-Country-Klischees und Watchparty-Insider-Witzen. */
export const ESC_TEAM_NAMES_DE: string[] = [
  'Douze-Pointer', 'Twelve-Punkte-Gang', 'Couch-Wolves',
  'Schlager-Mafia', 'Wiener Würstchen', 'Halbfinal-Helden',
  'Glitter-Squad', 'Pyro-Pioniere', 'Ohrwurm-Gang',
  'Bühnen-Bandits', 'Diva-Detektive', 'Lichtshow-Liga',
  'Vinyl-Verschwörer', 'Klangkommando', 'Bonsoir-Brigade',
  'Allez-Allez-Allstars', 'Halbplayback-Heroes', 'Confetti-Crew',
  'Rampensau-Republik', 'Eurodance-Elite', 'Songbird-Society',
  'Trommelwirbel-Truppe', 'Nul-Points-Phobiker',
];

export const ESC_TEAM_NAMES_EN: string[] = [
  'Douze-Pointers', 'Twelve-Point-Gang', 'Couch-Wolves',
  'Schlager-Squad', 'Vienna-Voters', 'Semi-Final-Heroes',
  'Glitter-Squad', 'Pyro-Pioneers', 'Earworm-Gang',
  'Stage-Bandits', 'Diva-Detectives', 'Lightshow-League',
  'Vinyl-Conspirators', 'Sound-Squad', 'Bonsoir-Brigade',
  'Allez-Allez-Allstars', 'Half-Playback-Heroes', 'Confetti-Crew',
  'Limelight-Republic', 'Eurodance-Elite', 'Songbird-Society',
  'Drumroll-Troupe', 'Nul-Points-Phobics',
];

export function getEscTeamNames(lang: 'de' | 'en'): string[] {
  return lang === 'en' ? ESC_TEAM_NAMES_EN : ESC_TEAM_NAMES_DE;
}

/** Emoji-Pool fuer Random-Slot-Emojis bei Set 'all' und Dummy-Avatare.
 *  Quer durch alle Themen — Cozy-Tiere, Halloween, Sci-Fi, Fantasy, Essen.
 *  Bewusst verschiedene Welten gemischt, damit's bei 'all' bunt wirkt. */
export const DUMMY_EMOJI_POOL: string[] = [
  '🐶', '🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '🦋',
  '🦄', '🐙', '🦖', '🐲', '🦅', '🦉', '🐺', '🦝',
  '🦒', '🐧', '🦦', '🦔', '🐹', '🦥',
  '🎃', '👻', '🦇', '🧙', '🧛', '💀',
  '🚀', '👽', '🤖', '🛸', '🪐', '👾',
  '🍕', '🍔', '🌮', '🍩', '🌶️',
  '⚡', '🌈', '💎', '🔥', '🎯', '🎲', '🃏', '🧩', '🎮', '🏆',
];

/** Liefert n zufaellige Emojis aus dem Pool, ohne Wiederholung.
 *  Wenn n > Pool-Groesse: faellt zurueck auf normales Random (mit Wdh.). */
export function getRandomDummyEmojis(n: number): string[] {
  const pool = [...DUMMY_EMOJI_POOL];
  const out: string[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  // Falls n > Pool: mit Wdh. auffuellen
  while (out.length < n) {
    out.push(DUMMY_EMOJI_POOL[Math.floor(Math.random() * DUMMY_EMOJI_POOL.length)]);
  }
  return out;
}

/** Liefert n zufaellige witzige Team-Namen, ohne Wiederholung.
 *  2026-05-05 (Wolf 'gibts namen auch auf en?'): lang-Param ergaenzt,
 *  defaults DE fuer Backward-Kompatibilitaet. */
export function getRandomFunnyNames(n: number, lang: 'de' | 'en' = 'de', eurovisionMode = false): string[] {
  const source = eurovisionMode ? getEscTeamNames(lang) : getFunnyTeamNames(lang);
  const pool = [...source];
  const out: string[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  while (out.length < n) {
    out.push(source[Math.floor(Math.random() * source.length)]);
  }
  return out;
}

// ── 2026-05-04: Team-Display-Name Helper ─────────────────────────────────
/**
 * Liefert den Anzeigenamen eines Teams. In „Listen-Kontexten" (ewige
 * Tabelle, Game-Over-Recap, Summary-Standings) wird optional ein
 * „Team "-Prefix vorangestellt — aber nur wenn der Name das nicht selbst
 * schon mitbringt (Artikel-Anfang, „Team", Emoji am Anfang).
 *
 * Beispiele mit `withPrefix=true`:
 *   "Sonnenblume"      -> "Team Sonnenblume"
 *   "Die Schlümpfe"    -> "Die Schlümpfe"          (Artikel)
 *   "Team Wolfsrudel"  -> "Team Wolfsrudel"        (schon prefix)
 *   "🐺 Rudel"         -> "🐺 Rudel"               (Emoji-Anfang)
 *   "Quiz Khalifa"     -> "Team Quiz Khalifa"
 */
export function teamDisplayName(name: string, withPrefix = false): string {
  const trimmed = (name ?? '').trim();
  if (!withPrefix || !trimmed) return trimmed;
  if (/^team\s/i.test(trimmed)) return trimmed;
  if (/^(die|der|das|den|dem|des|the)\s/i.test(trimmed)) return trimmed;
  // Erstes Zeichen ist kein Buchstabe → schon stylisiert (Emoji, „!Quiz!", etc.)
  if (!/^\p{Letter}/u.test(trimmed)) return trimmed;
  return `Team ${trimmed}`;
}
