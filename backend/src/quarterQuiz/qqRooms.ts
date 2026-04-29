// ── Quarter Quiz — Room state & mutations ─────────────────────────────────────

import {
  QQGrid, QQPhase, QQGamePhaseIndex, QQTeam, QQTeamPhaseStats,
  QQQuestion, QQStateUpdate, QQPendingAction, QQComebackAction,
  QQLanguage, QQ_TEAM_PALETTE, QQ_AVATARS, QQ_QUESTIONS_PER_PHASE,
  QQ_MAX_STEALS_PER_PHASE, QQ_MAX_JOKERS_PER_GAME, QQ_MAX_STAPELS_PER_GAME, QQ_MAX_TEAMS,
  qqGridSize, QQBuzzEntry, QQAnswerEntry,
  QQComebackHLState, QQHLChoice, QQ_COMEBACK_HL_TIMER_DEFAULT_SEC,
  QQConnectionsState, QQ_CONNECTIONS_TIMER_DEFAULT_SEC, QQ_CONNECTIONS_MAX_FAILS_DEFAULT,
  QQ_CONNECTIONS_FALLBACK_PAYLOAD,
  QQ_ONLY_CONNECT_HINT_DURATION_DEFAULT_SEC,
  QQ_BLUFF_WRITE_DURATION_DEFAULT_SEC, QQ_BLUFF_VOTE_DURATION_DEFAULT_SEC,
} from '../../../shared/quarterQuizTypes';
import {
  buildEmptyGrid, computeTerritories, detectNewJokers,
  markJokerCells, findLastPlace,
} from './qqBfs';
import { qqHLPickPair, qqHLCorrectAnswer, qqComebackHLRounds } from './qqHLData';
import { similarityScore, normalizeText } from '../../../shared/textNormalization';

// ── Error ─────────────────────────────────────────────────────────────────────
export class QQError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'QQError';
  }
}

// ── Internal room state (server-side only) ────────────────────────────────────
export interface QQRoomState {
  roomCode: string;
  phase: QQPhase;
  gamePhaseIndex: QQGamePhaseIndex;
  questionIndex: number;        // 0-14 global
  gridSize: number;
  grid: QQGrid;
  teams: Record<string, QQTeam>;
  joinOrder: string[];          // teamIds in join order
  teamPhaseStats: Record<string, QQTeamPhaseStats>;
  /** Game-Total Steals pro Team (kumulativ ueber alle Phasen + Comeback).
   *  `teamPhaseStats[id].stealsUsed` resettet pro Phase und ist nur fuer
   *  den Phase-2-Cap zustaendig — fuer Summary brauchen wir den Lifetime-Wert. */
  teamTotalSteals: Record<string, number>;
  questions: QQQuestion[];      // ordered 0-14
  currentQuestion: QQQuestion | null;
  revealedAnswer: string | null;
  correctTeamId: string | null;
  pendingFor: string | null;
  pendingAction: QQPendingAction | null;
  comebackTeamId: string | null;
  comebackAction: QQComebackAction | null;
  // Comeback-Klau vom Führenden (fix, keine Wahl mehr): 1 Leader → 2 Felder,
  // ≥2 gleichauf → 1 Feld von jedem.
  comebackStealTargets: string[];
  comebackStealsDone: string[];
  /** Higher/Lower-Mini-Game-State fuer Comeback. Null wenn gerade kein Comeback
   *  laeuft oder H/L uebersprungen wird (4+ tied last). */
  comebackHL: QQComebackHLState | null;
  /** Moderator-einstellbar: Timer pro H/L-Runde in Sekunden. */
  comebackHLTimerSec: number;
  /** 4×4 Connections — null wenn nicht aktiv. */
  connections: QQConnectionsState | null;
  /** Default-Timer für Connections (im Setup anpassbar). */
  connectionsTimerSec: number;
  /** Default-Fehlversuche bei Connections (im Setup anpassbar). */
  connectionsMaxFails: number;
  /** Timer-Handle für Connections-Auto-Reveal. Not persisted. */
  _connectionsTimerHandle: ReturnType<typeof setTimeout> | null;
  /** Setup-Toggle: spielt die Finalrunde 4×4 Connections in diesem Run? Default true. */
  connectionsEnabled: boolean;
  /** Setup-Toggle: Kategorie-Reihenfolge innerhalb jeder Runde randomisieren? Default true. */
  shuffleQuestionsInRound: boolean;
  swapFirstCell: { row: number; col: number; ownerId: string } | null;
  language: QQLanguage;
  // Timer
  timerDurationSec: number;
  timerEndsAt: number | null;
  timerHandle: ReturnType<typeof setTimeout> | null;
  // Answers
  answers: QQAnswerEntry[];
  allAnswered: boolean;  // true when every connected team has submitted
  // Buzz (Hot Potato)
  buzzQueue: QQBuzzEntry[];
  // Hot Potato state
  hotPotatoActiveTeamId: string | null;
  hotPotatoEliminated: string[];
  hotPotatoLastAnswer: string | null;
  hotPotatoTurnEndsAt: number | null;
  hotPotatoUsedAnswers: string[];
  hotPotatoAnswerAuthors: string[];     // parallel array of teamIds
  hotPotatoQualified: string[];         // teams that have given >=1 accepted answer; only they can win
  _hotPotatoTimerHandle: ReturnType<typeof setTimeout> | null;
  /** Timer-Handle fuer den H/L-Mini-Game-Auto-Reveal bei Timeout. Not persisted. */
  _comebackHLTimerHandle: ReturnType<typeof setTimeout> | null;
  // Imposter (oneOfEight) round-robin state
  imposterActiveTeamId: string | null;
  imposterQueue: string[];          // round-robin order
  imposterChosenIndices: number[];  // statement indices already picked (correct ones)
  imposterEliminated: string[];     // teams who picked the false statement
  // 4 gewinnt / Connect 4 (BUNTE_TUETE kind=onlyConnect)
  onlyConnectHintIndices: Record<string, number>;                            // teamId → 0..3 (per-team hint level)
  onlyConnectHintRevealedAt: Record<string, number>;                         // teamId → timestamp last hint unlock
  onlyConnectLockedTeams: string[];                                         // gesperrte Teams (3 Strikes)
  onlyConnectStrikes: Record<string, number>;                               // teamId → wrong-guess count (max 3)
  onlyConnectWinnerTeamId: string | null;                                   // erstes richtiges Team
  onlyConnectWinnerHintIdx: number | null;                                  // Hint-Index bei Gewinn
  onlyConnectGuesses: Array<{ teamId: string; text: string; correct: boolean; submittedAt: number; atHintIdx: number }>;
  onlyConnectHintDurationSec: number;                                       // Sekunden zwischen Hint-Reveals
  _onlyConnectHintTimerHandle: ReturnType<typeof setTimeout> | null;        // Auto-Advance-Timer (nicht persistiert)
  _onlyConnectStartedAt?: number;                                            // ms-Timestamp Round-Start (für Min-Duration-Gate gegen Insta-End)
  // Bluff (BUNTE_TUETE kind=bluff)
  bluffPhase: 'write' | 'review' | 'vote' | 'reveal' | null;
  bluffWriteEndsAt: number | null;
  bluffVoteEndsAt: number | null;
  bluffSubmissions: Record<string, string>;
  bluffOptions: import('../../../shared/quarterQuizTypes').QQBluffOption[];
  bluffOptionsByTeam: Record<string, import('../../../shared/quarterQuizTypes').QQBluffOption[]>;
  bluffVotes: Record<string, string>;
  bluffPoints: Record<string, import('../../../shared/quarterQuizTypes').QQBluffPoints>;
  bluffWriteDurationSec: number;
  bluffVoteDurationSec: number;
  bluffModeratorReview: boolean;
  bluffRejected: string[];
  _bluffWriteTimerHandle: ReturnType<typeof setTimeout> | null;
  _bluffVoteTimerHandle: ReturnType<typeof setTimeout> | null;
  // CHEESE (Picture This) — moderator-controlled image reveal
  imageRevealed: boolean;
  // CozyGuessr (BUNTE_TUETE kind=map) — moderator-controlled progressive reveal
  // 0 = keine Pins, 1 = Target allein, 2+ = Target + n schlechteste Teams, N+1 = Ranking-Panel
  mapRevealStep: number;
  // Auto-advance timer für Map-Pin-Reveal (zwischen step 1 und 1+validCount)
  _mapRevealTimerHandle: ReturnType<typeof setTimeout> | null;
  // Comeback-Erklärung — moderator-gesteuerte Intro-Slides vor den 3 Optionen
  // 0 = Was ist Comeback, 1 = warum DIESES Team, 2 = Optionen zeigen
  comebackIntroStep: number;
  // MUCHO — moderator-gesteuerter Akt-1-Voter-Reveal (pro Klick eine Option mit ≥1 Voter)
  // 0 = Antwort aufgedeckt, keine Voter sichtbar
  // 1..k = Voter der k-ten nicht-leeren Option eingeblendet (leere Options werden übersprungen)
  // k+1 = „Jäger starten" → Akt 2+3 laufen frontend-seitig zeitgesteuert ab
  muchoRevealStep: number;
  // ZEHN_VON_ZEHN — moderator-gesteuerter Step-Reveal analog MUCHO
  // 0 = alle Chips sichtbar außer höchstem Bet pro Option, keine Grün-Markierung
  // 1 = höchste Bets pro Option 1/2/3 zeitgesteuert kaskadiert
  // 2 = „Jäger starten" → Jäger-Animation + Winner-Card frontend-seitig
  zvzRevealStep: number;
  // CHEESE — moderator-gesteuerter Step-Reveal
  // 0 = nur die Eingaben sichtbar, keine Lösung grün, keine Avatare
  // 1 = Lösung grün + Shimmer
  // 2 = Avatare cascaded + Winner-Card
  cheeseRevealStep: number;
  // Last placed cell for beamer animation
  lastPlacedCell: { row: number; col: number; teamId: string; wasSteal?: boolean } | null;
  // Frozen cells (expire after next placement)
  frozenCells: { row: number; col: number }[];
  // Shielded cells — protected against steal/swap/ban until end of current phase
  shieldedCells: { row: number; col: number }[];
  // Internal round-robin index for Hot Potato (not sent to clients)
  _hotPotatoRoundRobinIdx?: number;
  // Internal: stored timer expiry callback for mid-round restarts
  _timerOnExpire: (() => void) | null;
  // Settings
  avatarsEnabled: boolean;
  totalPhases: 3 | 4;
  theme?: import('../../../shared/quarterQuizTypes').QQTheme;
  draftId?: string;
  draftTitle?: string;
  slideTemplates?: import('../../../shared/quarterQuizTypes').QQSlideTemplates;
  soundConfig?: import('../../../shared/quarterQuizTypes').QQSoundConfig;
  lastActivityAt: number;
  _placementQueue?: string[];
  // Snapshot ALLER Teams mit korrekter Antwort (gesetzt bei applyAutoEval/qqMarkCorrect,
  // BEVOR _placementQueue durch Platzierungen leergeshiftet wird). Quelle für die
  // Summary-Stats — nicht aus _placementQueue rekonstruieren.
  _currentQuestionWinners?: string[];
  // Grid-Snapshot vor Comeback-Steal — erlaubt Undo, auch wenn das Comeback-Team
  // schon 1 oder mehrere Felder geklaut hat. Beim Abschluss des Comebacks
  // (alle Felder geklaut ODER Skip) wird das Feld gelöscht.
  _comebackGridSnapshot?: QQGrid;
  _comebackStatsSnapshot?: { placementsLeft: number };
  // Comeback-Steal-Pause: nach jedem einzelnen Klau wird auf Moderator-Space gewartet,
  // bevor das Comeback-Team das naechste Feld klauen darf bzw. das naechste Team
  // an die Reihe kommt. Solange dieses Flag true ist: pendingFor=null, kein Klick.
  _comebackStealPaused?: boolean;
  // Sound. `globalMuted` wird im Snapshot als (musicMuted && sfxMuted) abgeleitet
  // und ist daher kein eigener State-Slot mehr.
  musicMuted: boolean;
  sfxMuted: boolean;
  volume: number; // 0–1
  // Setup/Lobby split — false means moderator is still in Setup; Beamer shows pre-game wait-screen.
  setupDone: boolean;
  // 3D grid
  enable3DTransition: boolean;
  // Rules presentation
  rulesSlideIndex: number;
  // Teams reveal animation anchor (set when entering TEAMS_REVEAL)
  teamsRevealStartedAt: number | null;
  // Phase intro sub-step (see qqActivateQuestion for step flow)
  introStep: number;
  // Categories already introduced with explanation (key: category name, or 'BUNTE_TUETE:kind' for sub-mechanics)
  seenCategories: string[];
  // Pause: stores the phase to return to when resuming
  _phaseBeforePause: QQPhase | null;
  _timerRemainingMs?: number;
  // Hot-Potato-Per-Turn-Timer beim Pause einfrieren
  _hotPotatoOnExpire?: (() => void) | null;
  _hotPotatoTurnRemainingMs?: number;
  // Bluff-Timer beim Pause einfrieren — Callbacks werden in den Start-Funktionen
  // gespeichert, damit qqResume() ohne erneuten Closure-Capture re-arm kann.
  _bluffWriteOnExpire?: (() => void) | null;
  _bluffWriteRemainingMs?: number;
  _bluffVoteOnExpire?: (() => void) | null;
  _bluffVoteRemainingMs?: number;
  // Connections-Timer beim Pause einfrieren
  _connectionsOnExpire?: (() => void) | null;
  _connectionsRemainingMs?: number;
  // Fun stats — accumulated across questions
  questionHistory: Array<{
    questionText: string;
    category: string;
    answers: Array<{ teamId: string; teamName: string; text: string; submittedAt: number }>;
    correctTeamId: string | null;
    correctTeamIds?: string[];
  }>;
  funnyAnswers: Array<{ teamId: string; teamName: string; text: string; questionText: string }>;
}

// ── In-process room map ───────────────────────────────────────────────────────
const qqRooms = new Map<string, QQRoomState>();

const QQ_ROOM_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

/** Periodically clean up stale QQ rooms (no activity for 4 hours). */
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of qqRooms) {
    if (now - room.lastActivityAt > QQ_ROOM_TTL_MS) {
      qqStopTimer(room);
      qqClearHotPotatoTimer(room);
      if (room._mapRevealTimerHandle) { clearTimeout(room._mapRevealTimerHandle); room._mapRevealTimerHandle = null; }
      qqRooms.delete(code);
    }
  }
}, 10 * 60 * 1000); // check every 10 min

export function getQQRoom(roomCode: string): QQRoomState | undefined {
  return qqRooms.get(roomCode);
}

/** Insert a pre-built room (used by persistence layer to restore state on startup). */
export function insertQQRoom(room: QQRoomState): void {
  qqRooms.set(room.roomCode, room);
}

/** Debug / admin: iterate all rooms. */
export function getAllQQRooms(): QQRoomState[] {
  return Array.from(qqRooms.values());
}

export function ensureQQRoom(roomCode: string): QQRoomState {
  let room = qqRooms.get(roomCode);
  if (!room) {
    room = {
      roomCode,
      phase: 'LOBBY',
      gamePhaseIndex: 1,
      questionIndex: 0,
      gridSize: 5,
      grid: buildEmptyGrid(5),
      teams: {},
      joinOrder: [],
      teamPhaseStats: {},
      teamTotalSteals: {},
      questions: [],
      currentQuestion: null,
      revealedAnswer: null,
      correctTeamId: null,
      pendingFor: null,
      pendingAction: null,
      comebackTeamId: null,
      comebackAction: null,
      comebackStealTargets: [],
      comebackStealsDone: [],
      comebackHL: null,
      comebackHLTimerSec: QQ_COMEBACK_HL_TIMER_DEFAULT_SEC,
      connections: null,
      connectionsTimerSec: QQ_CONNECTIONS_TIMER_DEFAULT_SEC,
      connectionsMaxFails: QQ_CONNECTIONS_MAX_FAILS_DEFAULT,
      _connectionsTimerHandle: null,
      connectionsEnabled: true,
      shuffleQuestionsInRound: true,
      swapFirstCell: null,
      language: 'both',
      timerDurationSec: 30,
      timerEndsAt: null,
      timerHandle: null,
      answers: [],
      allAnswered: false,
      buzzQueue: [],
      hotPotatoActiveTeamId: null,
      hotPotatoEliminated: [],
      hotPotatoLastAnswer: null,
      hotPotatoTurnEndsAt: null,
      hotPotatoUsedAnswers: [],
      hotPotatoAnswerAuthors: [],
      hotPotatoQualified: [],
      _hotPotatoTimerHandle: null,
      _comebackHLTimerHandle: null,
      imposterActiveTeamId: null,
      imposterQueue: [],
      imposterChosenIndices: [],
      imposterEliminated: [],
      onlyConnectHintIndices: {},
      onlyConnectHintRevealedAt: {},
      onlyConnectLockedTeams: [],
      onlyConnectStrikes: {},
      onlyConnectWinnerTeamId: null,
      onlyConnectWinnerHintIdx: null,
      onlyConnectGuesses: [],
      onlyConnectHintDurationSec: QQ_ONLY_CONNECT_HINT_DURATION_DEFAULT_SEC,
      _onlyConnectHintTimerHandle: null,
      bluffPhase: null,
      bluffWriteEndsAt: null,
      bluffVoteEndsAt: null,
      bluffSubmissions: {},
      bluffOptions: [],
      bluffOptionsByTeam: {},
      bluffVotes: {},
      bluffPoints: {},
      bluffWriteDurationSec: QQ_BLUFF_WRITE_DURATION_DEFAULT_SEC,
      bluffVoteDurationSec: QQ_BLUFF_VOTE_DURATION_DEFAULT_SEC,
      bluffModeratorReview: false,
      bluffRejected: [],
      _bluffWriteTimerHandle: null,
      _bluffVoteTimerHandle: null,
      lastPlacedCell: null,
      frozenCells: [],
      shieldedCells: [],
      imageRevealed: false,
      mapRevealStep: 0,
      _mapRevealTimerHandle: null,
      comebackIntroStep: 0,
      muchoRevealStep: 0,
      zvzRevealStep: 0,
      cheeseRevealStep: 0,
      _timerOnExpire: null,
      avatarsEnabled: true,
      totalPhases: 3,
      lastActivityAt: Date.now(),
      musicMuted: false,
      sfxMuted: false,
      volume: 0.8,
      setupDone: false,
      enable3DTransition: false,
      rulesSlideIndex: 0,
      teamsRevealStartedAt: null,
      introStep: 0,
      seenCategories: [],
      _phaseBeforePause: null,
      questionHistory: [],
      funnyAnswers: [],
    };
    qqRooms.set(roomCode, room);
  }
  return room;
}

// ── Team management ───────────────────────────────────────────────────────────
export function qqJoinTeam(
  room: QQRoomState,
  teamId: string,
  teamName: string,
  avatarId: string
): void {
  if (room.teams[teamId]) {
    // Rejoin — check avatar exclusivity (another team may have taken it in the meantime)
    const takenBy = Object.values(room.teams).find(t => t.id !== teamId && t.avatarId === avatarId);
    const safeAvatarId = takenBy ? room.teams[teamId].avatarId : avatarId; // keep old if taken
    room.teams[teamId].name      = teamName;
    room.teams[teamId].avatarId  = safeAvatarId;
    // Sync color to (possibly new) avatar's signature color
    const newAvatar = QQ_AVATARS.find(a => a.id === safeAvatarId);
    if (newAvatar?.color) room.teams[teamId].color = newAvatar.color;
    room.teams[teamId].connected = true;
    return;
  }
  // New team — only in LOBBY
  if (room.phase !== 'LOBBY') {
    throw new QQError('GAME_STARTED', 'Das Spiel hat bereits begonnen.');
  }
  const existingCount = Object.keys(room.teams).length;
  if (existingCount >= QQ_MAX_TEAMS) {
    throw new QQError('ROOM_FULL', `Maximale Teamanzahl (${QQ_MAX_TEAMS}) erreicht.`);
  }
  // Avatar exclusivity: each avatar can only be chosen by one team
  const avatarTaken = Object.values(room.teams).some(t => t.avatarId === avatarId);
  if (avatarTaken) {
    throw new QQError('AVATAR_TAKEN', 'Dieser Avatar ist bereits vergeben.');
  }
  // Name exclusivity: gleiche Namen verwirren Mod + Reveals (case-insensitive,
  // getrimmt — „Wölfe" und „wölfe " gelten als identisch).
  const nameLower = (teamName ?? '').trim().toLowerCase();
  if (nameLower) {
    const nameTaken = Object.values(room.teams).some(t => (t.name ?? '').trim().toLowerCase() === nameLower);
    if (nameTaken) {
      throw new QQError('NAME_TAKEN', 'Dieser Team-Name ist bereits vergeben.');
    }
  }
  // Color is derived from the chosen avatar (each avatar has a fixed signature color)
  const avatar = QQ_AVATARS.find(a => a.id === avatarId);
  const color = avatar?.color ?? QQ_TEAM_PALETTE[existingCount % QQ_TEAM_PALETTE.length];
  room.teams[teamId] = {
    id: teamId,
    name: teamName,
    color,
    avatarId,
    connected: true,
    totalCells: 0,
    largestConnected: 0,
  };
  room.joinOrder.push(teamId);
  room.teamPhaseStats[teamId] = emptyPhaseStats();
  room.teamTotalSteals[teamId] = 0;
}

export function qqSetTeamConnected(
  room: QQRoomState,
  teamId: string,
  connected: boolean
): void {
  if (room.teams[teamId]) {
    room.teams[teamId].connected = connected;
  }
}

// Moderator-Rename waehrend Lobby/Spiel. Laesst id/color/avatar unveraendert,
// aendert nur den Display-Namen. Leere oder >40 Zeichen Eingaben werden abgewiesen.
export function qqRenameTeam(room: QQRoomState, teamId: string, newName: string): void {
  const t = room.teams[teamId];
  if (!t) return;
  const trimmed = (newName ?? '').trim();
  if (trimmed.length === 0) throw new QQError('INVALID_NAME', 'Team-Name darf nicht leer sein.');
  if (trimmed.length > 40) throw new QQError('INVALID_NAME', 'Team-Name zu lang (max 40 Zeichen).');
  t.name = trimmed;
  room.lastActivityAt = Date.now();
}

export function qqKickTeam(room: QQRoomState, teamId: string): void {
  if (!room.teams[teamId]) return;
  // Only kick in LOBBY — during game just disconnect
  if (room.phase === 'LOBBY') {
    delete room.teams[teamId];
    room.joinOrder = room.joinOrder.filter(id => id !== teamId);
    delete room.teamPhaseStats[teamId];
  } else {
    room.teams[teamId].connected = false;
  }
  room.answers  = room.answers.filter(a => a.teamId !== teamId);
  room.buzzQueue = room.buzzQueue.filter(b => b.teamId !== teamId);
}

function emptyPhaseStats(): QQTeamPhaseStats {
  return { stealsUsed: 0, jokersEarned: 0, placementsLeft: 0, pendingJokerBonus: 0, stapelsUsed: 0 };
}

// ── Game start ────────────────────────────────────────────────────────────────
export function qqStartGame(
  room: QQRoomState,
  questions: QQQuestion[],
  language: QQLanguage,
  phases: 3 | 4 = 3,
  theme?: import('../../../shared/quarterQuizTypes').QQTheme,
  draftId?: string,
  draftTitle?: string,
  slideTemplates?: import('../../../shared/quarterQuizTypes').QQSlideTemplates,
  soundConfig?: import('../../../shared/quarterQuizTypes').QQSoundConfig,
): void {
  const teamCount = Object.keys(room.teams).length;
  if (teamCount < 1) {
    throw new QQError('NOT_ENOUGH_TEAMS', 'Mindestens 1 Team erforderlich.');
  }
  if (questions.length !== phases * 5) {
    throw new QQError('WRONG_QUESTION_COUNT', `${phases * 5} Fragen erwartet, ${questions.length} erhalten.`);
  }

  // Validate questions: catch missing correctOptionIndex / options for choice-based
  // categories BEFORE the game starts — silent failures during reveal are
  // live-event-killers (no winner emerges, moderator panics).
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const tag = `Frage ${i + 1} (${q.category})`;
    if (q.category === 'MUCHO') {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new QQError('INVALID_QUESTION', `${tag}: MUCHO benötigt genau 4 Optionen.`);
      }
      if (q.correctOptionIndex == null || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
        throw new QQError('INVALID_QUESTION', `${tag}: MUCHO correctOptionIndex fehlt oder außerhalb 0-3.`);
      }
    } else if (q.category === 'ZEHN_VON_ZEHN') {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new QQError('INVALID_QUESTION', `${tag}: ZEHN_VON_ZEHN benötigt mindestens 2 Optionen.`);
      }
      if (q.correctOptionIndex == null || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
        throw new QQError('INVALID_QUESTION', `${tag}: ZEHN_VON_ZEHN correctOptionIndex fehlt oder außerhalb 0-${q.options.length - 1}.`);
      }
    } else if (q.category === 'SCHAETZCHEN') {
      if (q.targetValue == null || Number.isNaN(q.targetValue)) {
        throw new QQError('INVALID_QUESTION', `${tag}: SCHAETZCHEN benötigt einen numerischen targetValue.`);
      }
    }
    // BUNTE_TUETE / CHEESE haben eigene Payload-Formen → kein generischer Check.
  }

  // ── Shuffle innerhalb der Runde ────────────────────────────────────────────
  // Wenn shuffleQuestionsInRound aktiv ist, mischen wir die 5 Fragen jeder
  // Runde untereinander durch (Phase-Zuordnung bleibt erhalten). Anti-Adjacency
  // an Rundengrenzen: wenn die letzte Frage von Runde N und die erste von Runde
  // N+1 dieselbe Kategorie haben, swappen wir Frage 1 von Runde N+1 mit einer
  // anderen Frage derselben Runde (falls vorhanden).
  let processedQuestions = questions;
  if (room.shuffleQuestionsInRound) {
    const byPhase: Record<number, QQQuestion[]> = {};
    for (const q of questions) {
      const p = q.phaseIndex;
      if (!byPhase[p]) byPhase[p] = [];
      byPhase[p].push(q);
    }
    for (const p of Object.keys(byPhase)) {
      const arr = byPhase[Number(p)];
      // Fisher-Yates
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    const phaseList = Object.keys(byPhase).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < phaseList.length; i++) {
      const prev = byPhase[phaseList[i - 1]];
      const curr = byPhase[phaseList[i]];
      const lastCat = prev[prev.length - 1].category;
      if (curr[0].category === lastCat && curr.length > 1) {
        // Swap mit erstem nicht-gleichen Kandidaten
        const swapIdx = curr.findIndex(q => q.category !== lastCat);
        if (swapIdx > 0) {
          [curr[0], curr[swapIdx]] = [curr[swapIdx], curr[0]];
        }
      }
    }
    processedQuestions = phaseList.flatMap(p => byPhase[p]);
    // questionIndexInPhase neu setzen (für UI-Konsistenz)
    let iInPhase = 0;
    let lastPhase = -1;
    processedQuestions = processedQuestions.map(q => {
      if (q.phaseIndex !== lastPhase) { iInPhase = 0; lastPhase = q.phaseIndex; }
      const updated = { ...q, questionIndexInPhase: iInPhase };
      iInPhase++;
      return updated;
    });
  }

  const gs = qqGridSize(teamCount);
  room.gridSize = gs;
  room.grid     = buildEmptyGrid(gs);
  room.questions = processedQuestions;
  room.totalPhases = phases;
  room.language  = language;
  room.questionIndex  = 0;
  room.gamePhaseIndex = 1;
  room.phase          = 'RULES';
  // -2 = Willkommen-Folie ("Willkommen beim BLOCK QUIZ / QUARTER QUIZ")
  // -1 = Regel-Intro ("Jetzt kommen die Regeln — gut aufpassen!")
  //  0..= Regel-Folien
  // Moderator schaltet jeweils per "Weiter".
  room.rulesSlideIndex = -2;
  room.teamsRevealStartedAt = null;
  room.introStep      = 0;
  room.currentQuestion = processedQuestions[0];
  room.revealedAnswer  = null;
  room.correctTeamId   = null;
  room.pendingFor      = null;
  room.pendingAction   = null;
  room.comebackTeamId  = null;
  room.comebackAction  = null;
  room.comebackStealTargets = [];
  room.comebackStealsDone   = [];
  room.comebackHL      = null;
  room.swapFirstCell   = null;
  room.theme           = theme;
  room.draftId         = draftId;
  room.draftTitle      = draftTitle;
  room.slideTemplates  = slideTemplates;
  room.soundConfig     = soundConfig;

  // Reset all phase stats
  for (const id of room.joinOrder) {
    room.teamPhaseStats[id] = emptyPhaseStats();
    room.teamTotalSteals[id] = 0;
  }
  room.lastActivityAt = Date.now();
}

// ── Timer helpers ─────────────────────────────────────────────────────────────
export function qqStopTimer(room: QQRoomState): void {
  if (room.timerHandle) {
    clearTimeout(room.timerHandle);
    room.timerHandle = null;
  }
  room.timerEndsAt = null;
  room._timerOnExpire = null;
}

// onExpire is called by the socket handler to broadcast when timer ends
export function qqStartTimer(
  room: QQRoomState,
  onExpire: () => void
): void {
  qqStopTimer(room);
  room._timerOnExpire = onExpire;
  const durationMs   = room.timerDurationSec * 1000;
  room.timerEndsAt   = Date.now() + durationMs;
  room.timerHandle   = setTimeout(() => {
    room.timerHandle = null;
    room.timerEndsAt = null;
    room._timerOnExpire = null;
    onExpire();
  }, durationMs);
}

export function qqSetTimerDuration(room: QQRoomState, durationSec: number): void {
  room.timerDurationSec = Math.max(5, Math.min(120, durationSec));
  // If a timer is currently running, restart it with the new duration
  if (room.timerHandle && room._timerOnExpire) {
    qqStartTimer(room, room._timerOnExpire);
  }
  // Falls pausiert: Rest auf neue Dauer setzen, damit Resume die neue
  // Einstellung verwendet (sonst würde der alte Rest aus Pre-Pause weitergeführt).
  else if (room.phase === 'PAUSED' && room._timerRemainingMs != null) {
    room._timerRemainingMs = room.timerDurationSec * 1000;
  }
}

// ── Answer submission ─────────────────────────────────────────────────────────
export function qqSubmitAnswer(
  room: QQRoomState,
  teamId: string,
  answer: string
): { allAnswered: boolean } {
  if (room.phase !== 'QUESTION_ACTIVE') {
    throw new QQError('WRONG_PHASE', 'Antworten nur bei aktiver Frage möglich.');
  }
  assertTeam(room, teamId);
  // Only one answer per team per question
  if (room.answers.some(a => a.teamId === teamId)) {
    // Update existing answer
    const existing = room.answers.find(a => a.teamId === teamId)!;
    existing.text = answer.trim();
    existing.submittedAt = Date.now();
  } else {
    room.answers.push({ teamId, text: answer.trim(), submittedAt: Date.now() });
  }
  room.lastActivityAt = Date.now();
  const connectedTeams = room.joinOrder.filter(id => room.teams[id]?.connected);
  const allAnswered = connectedTeams.every(id => room.answers.some(a => a.teamId === id));
  room.allAnswered = allAnswered;
  // Stop timer when all teams have answered
  if (allAnswered) {
    qqStopTimer(room);
  }
  return { allAnswered };
}

export function qqClearAnswers(room: QQRoomState): void {
  room.answers = [];
  room.allAnswered = false;
}

// Push current question + answers into history (idempotent per question).
// Called whenever we transition away from a question so every question is
// captured for summary stats — not just phase boundaries.
export function qqFlushQuestionToHistory(room: QQRoomState): void {
  if (!room.currentQuestion) return;

  const isHotPotato = room.currentQuestion.category === 'BUNTE_TUETE'
    && room.currentQuestion.bunteTuete?.kind === 'hotPotato';

  // Hot Potato hat keine room.answers — Antworten laufen ueber hotPotatoAnswerAuthors.
  // Fuer faire Summary-Stats synthetische Antwort-Eintraege fuer alle Teilnehmer bauen,
  // damit Sieg/Teilnahme korrekt gezaehlt werden (sonst „1/13 Trefferquote"-Bug).
  let answers: { teamId: string; teamName: string; text: string; submittedAt: number }[];
  if (isHotPotato) {
    const participantIds = Array.from(new Set<string>([
      ...room.hotPotatoAnswerAuthors,
      ...room.hotPotatoEliminated,
      ...room.hotPotatoQualified,
    ]));
    if (participantIds.length === 0) return; // niemand teilgenommen → skip
    const now = Date.now();
    answers = participantIds.map(id => ({
      teamId: id,
      teamName: room.teams[id]?.name ?? id,
      text: room.hotPotatoEliminated.includes(id) ? '✗ eliminiert' : '✓ überlebt',
      submittedAt: now,
    }));
  } else {
    if (room.answers.length === 0) return;
    answers = room.answers.map(a => ({
      teamId: a.teamId,
      teamName: room.teams[a.teamId]?.name ?? a.teamId,
      text: a.text,
      submittedAt: a.submittedAt,
    }));
  }

  const qIdx = room.questionIndex;
  const alreadyPushed = (room.questionHistory as any[]).some(h => h._qIndex === qIdx);
  if (alreadyPushed) return;
  // Quelle der Wahrheit: _currentQuestionWinners (gesetzt bei applyAutoEval/qqMarkCorrect).
  // Fallback auf correctTeamId + _placementQueue für ältere Räume; letzteres ist aber
  // unzuverlässig, weil _placementQueue während PLACEMENT leergeshiftet wird.
  const snapshot = (room._currentQuestionWinners ?? []).filter(Boolean);
  const correctIds = snapshot.length > 0
    ? snapshot
    : [
        ...(room.correctTeamId ? [room.correctTeamId] : []),
        ...((room['_placementQueue'] as string[] | undefined) ?? []),
      ];
  const uniqueIds = Array.from(new Set(correctIds));
  room.questionHistory.push({
    _qIndex: qIdx,
    questionText: room.currentQuestion.answer ?? room.currentQuestion.text ?? '',
    category: room.currentQuestion.category,
    answers,
    correctTeamId: room.correctTeamId,
    correctTeamIds: uniqueIds,
  } as any);
}

// ── Buzz in ───────────────────────────────────────────────────────────────────
export function qqBuzzIn(room: QQRoomState, teamId: string): void {
  if (room.phase !== 'QUESTION_ACTIVE') {
    throw new QQError('WRONG_PHASE', 'Buzzen nur bei aktiver Frage möglich.');
  }
  assertTeam(room, teamId);
  // Prevent double-buzz from same team
  if (room.buzzQueue.some(b => b.teamId === teamId)) return;
  room.buzzQueue.push({ teamId, buzzedAt: Date.now() });
  room.lastActivityAt = Date.now();
}

export function qqClearBuzz(room: QQRoomState): void {
  room.buzzQueue = [];
}

// ── Question flow ─────────────────────────────────────────────────────────────
export function qqActivateQuestion(
  room: QQRoomState,
  onTimerExpire: () => void
): void {
  assertPhase(room, ['PHASE_INTRO', 'PLACEMENT', 'COMEBACK_CHOICE']);
  // Prevent ghost-activation right after game start (button swap race condition)
  if (room.phase === 'PHASE_INTRO' && room.questionIndex === 0 && room.introStep === 0 && Date.now() - room.lastActivityAt < 1500) {
    return; // silently ignore — game just started
  }
  // Phase intro sub-steps (moderator presses Space to advance each):
  //   First question of round: 0=round title → 1=rule reminder → 2=category → (3=cat explain if new) → activate
  //   Question 2+:             0=category → (1=cat explain if new) → activate
  if (room.phase === 'PHASE_INTRO') {
    const questionInPhase = (room.questionIndex % QQ_QUESTIONS_PER_PHASE);
    const isFirstOfRound = questionInPhase === 0;
    const catRevealStep = isFirstOfRound ? 2 : 0; // step at which category is shown

    // Steps before category reveal: advance
    if (isFirstOfRound && room.introStep < catRevealStep) {
      room.introStep += 1;
      // If we just landed on catRevealStep AND the category is new,
      // skip the simple reveal and jump straight to explanation
      if (room.introStep === catRevealStep) {
        const q = room.currentQuestion;
        const catKey = q?.category === 'BUNTE_TUETE' && q.bunteTuete
          ? `BUNTE_TUETE:${q.bunteTuete.kind}` : (q?.category ?? '');
        if (catKey && !room.seenCategories.includes(catKey)) {
          room.seenCategories.push(catKey);
          room.introStep = catRevealStep + 1; // jump to explanation
        }
      }
      room.lastActivityAt = Date.now();
      return;
    }

    // At category reveal step (non-first question, or first question with already-seen category)
    if (room.introStep === catRevealStep) {
      const q = room.currentQuestion;
      const catKey = q?.category === 'BUNTE_TUETE' && q.bunteTuete
        ? `BUNTE_TUETE:${q.bunteTuete.kind}` : (q?.category ?? '');
      if (catKey && !room.seenCategories.includes(catKey)) {
        // New category: show explanation
        room.seenCategories.push(catKey);
        room.introStep = catRevealStep + 1;
        room.lastActivityAt = Date.now();
        return;
      }
      // Category already seen — fall through to activate
    }
    // At explanation step: fall through to activate
  }
  // Accumulate previous question's answers into history before clearing
  qqFlushQuestionToHistory(room);
  room.phase          = 'QUESTION_ACTIVE';
  room.revealedAnswer = null;
  room.correctTeamId  = null;
  room._currentQuestionWinners = [];
  room.pendingFor     = null;
  room.pendingAction  = null;
  room.answers        = [];
  room.buzzQueue      = [];
  room.lastPlacedCell = null;
  room.hotPotatoActiveTeamId = null;
  room.hotPotatoEliminated   = [];
  room.hotPotatoLastAnswer   = null;
  room.hotPotatoTurnEndsAt   = null;
  room.hotPotatoUsedAnswers  = [];
  room.hotPotatoAnswerAuthors = [];
  room.hotPotatoQualified    = [];
  if (room._hotPotatoTimerHandle) { clearTimeout(room._hotPotatoTimerHandle); room._hotPotatoTimerHandle = null; }
  room.lastActivityAt = Date.now();
  // CHEESE: image + question shown together, so imageRevealed is true immediately
  room.imageRevealed  = room.currentQuestion?.category === 'CHEESE';
  // CozyGuessr (map) reveal — pro Frage bei 0 starten, evtl. laufenden Auto-Timer stoppen
  room.mapRevealStep  = 0;
  if (room._mapRevealTimerHandle) { clearTimeout(room._mapRevealTimerHandle); room._mapRevealTimerHandle = null; }
  // MUCHO Akt-1-Step — pro Frage bei 0 starten
  room.muchoRevealStep = 0;
  room.zvzRevealStep = 0;
  room.cheeseRevealStep = 0;
  // 4 gewinnt + Bluff: State pro Frage zurücksetzen (Sub-Mechanik wird via socket
  // qq:activateQuestion-Handler nachträglich gestartet, damit Callbacks gebunden werden können).
  qqOnlyConnectReset(room);
  qqBluffReset(room);
  // Hot Potato has its own per-turn timer (hotPotatoTurnEndsAt) — no global question timer.
  // Bluff hat eigene write/vote-Timer.
  // 4 gewinnt nutzt seit 2026-04-28 wieder den Standard-Timer (User-Wunsch:
  // 'gleicher Flow wie alle Kategorien'). Hints werden global synchron auto-
  // advanced via interner qqOnlyConnectStart-Timer.
  const isHotPotato = room.currentQuestion?.category === 'BUNTE_TUETE'
    && room.currentQuestion.bunteTuete?.kind === 'hotPotato';
  const isBluff = room.currentQuestion?.category === 'BUNTE_TUETE'
    && room.currentQuestion.bunteTuete?.kind === 'bluff';
  if (isHotPotato || isBluff) {
    qqStopTimer(room);
  } else {
    qqStartTimer(room, onTimerExpire);
  }
}

export function qqShowImage(room: QQRoomState, onTimerExpire?: () => void): void {
  assertPhase(room, ['QUESTION_ACTIVE']);
  room.imageRevealed  = true;
  room.lastActivityAt = Date.now();
  // CHEESE: start timer now that the image is shown
  if (onTimerExpire) {
    qqStartTimer(room, onTimerExpire);
  }
}

export function qqRevealAnswer(room: QQRoomState): void {
  assertPhase(room, ['QUESTION_ACTIVE']);
  qqStopTimer(room);
  const q = room.currentQuestion;
  room.phase          = 'QUESTION_REVEAL';
  let revAns = room.language === 'en' && q?.answerEn ? q.answerEn : (q?.answer ?? '');
  // SCHAETZCHEN: if no answer text, fall back to formatted targetValue
  if (!revAns && q?.category === 'SCHAETZCHEN' && q.targetValue != null) {
    revAns = q.targetValue.toLocaleString('de-DE');
  }
  room.revealedAnswer = revAns;
  room.lastActivityAt = Date.now();
}

/**
 * Auto-evaluate Schätzchen: find the team whose numeric answer is closest
 * to the targetValue. Returns the winning teamId or null if no valid answers.
 */
export function qqAutoEvaluateEstimate(room: QQRoomState): string | null {
  const q = room.currentQuestion;
  if (!q || q.category !== 'SCHAETZCHEN' || q.targetValue == null) return null;
  if (room.phase !== 'QUESTION_REVEAL') return null;

  let best: { teamId: string; distance: number } | null = null;
  for (const ans of room.answers) {
    const parsed = Number(ans.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
    if (Number.isNaN(parsed)) continue;
    const distance = Math.abs(parsed - q.targetValue);
    if (!best || distance < best.distance || (distance === best.distance && ans.submittedAt < (room.answers.find(a => a.teamId === best!.teamId)?.submittedAt ?? Infinity))) {
      best = { teamId: ans.teamId, distance };
    }
  }
  return best?.teamId ?? null;
}

// ── Full auto-evaluation for all categories ───────────────────────────────────

/**
 * Auto-evaluate all submitted answers for the current question.
 * Sets `isCorrect` on each QQAnswerEntry and returns an array of winning teamIds
 * (may be multiple on ties). Returns [] if no deterministic winner can be found.
 *
 * Must be called in QUESTION_REVEAL phase (after qqRevealAnswer).
 */
export interface QQEvalResult {
  /** TeamIds that are considered correct / winners */
  winnerTeamIds: string[];
  /**
   * For ZEHN_VON_ZEHN: points each team earns (keyed by teamId).
   * For other categories: empty object (no point calculation here).
   */
  earnedPoints: Record<string, number>;
}

export function qqEvaluateAnswers(room: QQRoomState): QQEvalResult {
  const q = room.currentQuestion;
  if (!q || room.phase !== 'QUESTION_REVEAL') {
    return { winnerTeamIds: [], earnedPoints: {} };
  }

  switch (q.category) {
    case 'MUCHO':       return evalMucho(room, q);
    case 'ZEHN_VON_ZEHN': return evalAllIn(room, q);
    case 'SCHAETZCHEN': return evalSchaetzchen(room, q);
    case 'CHEESE':      return evalCheese(room, q);
    case 'BUNTE_TUETE': return evalBunteTuete(room, q);
    default:            return { winnerTeamIds: [], earnedPoints: {} };
  }
}

// ── MUCHO (multiple choice A/B/C/D) ──────────────────────────────────────────
function evalMucho(room: QQRoomState, q: QQQuestion): QQEvalResult {
  if (q.correctOptionIndex == null) return { winnerTeamIds: [], earnedPoints: {} };

  const LETTER_TO_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  const winners: string[] = [];

  for (const ans of room.answers) {
    const text = ans.text.trim().toUpperCase();
    let submittedIndex: number | null = null;

    // Accept "A"/"B"/"C"/"D"
    if (text in LETTER_TO_INDEX) {
      submittedIndex = LETTER_TO_INDEX[text];
    } else {
      // Accept "0"/"1"/"2"/"3"
      const n = parseInt(text, 10);
      if (!Number.isNaN(n) && n >= 0 && n <= 3) submittedIndex = n;
    }

    if (submittedIndex === q.correctOptionIndex) {
      winners.push(ans.teamId);
    }
  }

  return { winnerTeamIds: winners, earnedPoints: {} };
}

// ── ZEHN_VON_ZEHN / All In (bet distribution "4,3,3") ────────────────────────
// Teams distribute 10 points across 3 options as "pts0,pts1,pts2".
// The points bet on the correct option = their earned points.
function evalAllIn(room: QQRoomState, q: QQQuestion): QQEvalResult {
  if (q.correctOptionIndex == null) return { winnerTeamIds: [], earnedPoints: {} };

  // Anzahl Optionen flexibel — historisch war's hardcoded 3, aber die UI erlaubt
  // 2-4 Optionen (Ja/Nein bis vierfach). parts.length muss zu q.options passen.
  const expectedLen = q.options?.length ?? 0;

  const earnedPoints: Record<string, number> = {};
  let maxPoints = 0;

  for (const ans of room.answers) {
    const parts = ans.text.split(',').map(s => parseInt(s.trim(), 10));
    if (expectedLen > 0 && parts.length !== expectedLen) continue;
    if (parts.length < 2 || parts.some(Number.isNaN)) continue;
    const earned = parts[q.correctOptionIndex] ?? 0;
    earnedPoints[ans.teamId] = earned;
    if (earned > maxPoints) maxPoints = earned;
  }

  // Winners = teams who bet the most on the correct option (all who tied at max)
  const winners: string[] = maxPoints > 0
    ? Object.entries(earnedPoints)
        .filter(([, pts]) => pts === maxPoints)
        .map(([tid]) => tid)
    : [];

  return { winnerTeamIds: winners, earnedPoints };
}

// ── SCHAETZCHEN (closest numeric estimate + Cozy-Range-Bonus) ────────────────
// Adaptive %-Range nach Wertgröße — vermeidet, dass 5% bei 24 Stück (=±1.2)
// zu eng oder bei 1 Mio Einwohnern (=±50k) zu großzügig wird.
function schaetzchenRangeAbs(targetValue: number): number {
  const abs = Math.abs(targetValue);
  if (abs < 100)        return abs * 0.20;
  if (abs < 1000)       return abs * 0.10;
  if (abs < 10000)      return abs * 0.07;
  if (abs < 1_000_000)  return abs * 0.05;
  return abs * 0.03;
}

function evalSchaetzchen(room: QQRoomState, q: QQQuestion): QQEvalResult {
  if (q.targetValue == null) return { winnerTeamIds: [], earnedPoints: {} };

  // Distanz pro Team berechnen, ungueltige Antworten ueberspringen.
  const distMap: Array<{ teamId: string; distance: number; submittedAt: number }> = [];
  for (const ans of room.answers) {
    const parsed = Number(ans.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
    if (Number.isNaN(parsed)) continue;
    const distance = Math.abs(parsed - q.targetValue);
    distMap.push({ teamId: ans.teamId, distance, submittedAt: ans.submittedAt });
  }

  if (distMap.length === 0) return { winnerTeamIds: [], earnedPoints: {} };

  // Sortiere primaer nach Distanz, sekundaer nach Antwortzeit (schnellstes
  // Team zuerst bei Tie).
  distMap.sort((a, b) => a.distance - b.distance || a.submittedAt - b.submittedAt);
  const minDist = distMap[0].distance;

  // Closest-Winner: alle Teams mit minimaler Distanz (echte Distanz-Ties).
  const closestWinners = distMap
    .filter(d => d.distance === minDist)
    .map(d => d.teamId);

  // Secondary-Winner ('Cozy-Range'): das naechst-naechste Team (also nach den
  // Closest-Tied-Teams), wenn es innerhalb der adaptiven Range liegt. Nur 1
  // Team — vermeidet Grid-Inflation. Closest-Trophy bleibt beim Closest.
  const rangeAbs = schaetzchenRangeAbs(q.targetValue);
  let secondaryWinner: string | null = null;
  for (const d of distMap) {
    if (closestWinners.includes(d.teamId)) continue;
    if (d.distance > rangeAbs) break; // nicht in Range, Sortierung garantiert dass alle danach noch weiter weg sind
    secondaryWinner = d.teamId;
    break;
  }

  const winners = [...closestWinners];
  if (secondaryWinner) winners.push(secondaryWinner);
  return { winnerTeamIds: winners, earnedPoints: {} };
}

// ── CHEESE / Picture This (text match) ───────────────────────────────────────
// B11 (2026-04-29): Fuzzy-Match via similarityScore (>=0.8) — toleriert
// Tippfehler ('eifelturm' → 'eiffelturm') und Article-Strip; HotPotato/
// OnlyConnect benutzen denselben Helper.
function evalCheese(room: QQRoomState, q: QQQuestion): QQEvalResult {
  const correctRaw = [q.answer, q.answerEn].filter(Boolean) as string[];
  const correct = correctRaw.filter(c => c.trim().length >= 2);

  const winners: string[] = [];
  for (const ans of room.answers) {
    const submitted = ans.text.trim();
    if (normalizeText(submitted).length < 2) continue;
    const matches = correct.some(c => similarityScore(submitted, c) >= 0.8);
    if (matches) winners.push(ans.teamId);
  }

  return { winnerTeamIds: winners, earnedPoints: {} };
}

// ── BUNTE_TUETE (routes to sub-mechanic evaluators) ──────────────────────────
function evalBunteTuete(room: QQRoomState, q: QQQuestion): QQEvalResult {
  const bt = q.bunteTuete;
  if (!bt) return { winnerTeamIds: [], earnedPoints: {} };

  switch (bt.kind) {
    case 'hotPotato':   return { winnerTeamIds: [], earnedPoints: {} }; // handled via hotPotatoCorrect
    case 'oneOfEight':  return evalOneOfEight(room, bt as import('../../../shared/quarterQuizTypes').QQBunteTueteOneOfEight);
    case 'top5':        return evalTop5(room, bt as import('../../../shared/quarterQuizTypes').QQBunteTueteTop5);
    case 'order':       return evalOrder(room, bt as import('../../../shared/quarterQuizTypes').QQBunteTueteOrder);
    case 'map':         return evalMap(room, bt as import('../../../shared/quarterQuizTypes').QQBunteTueteMap);
    case 'onlyConnect': return evalOnlyConnect(room);
    case 'bluff':       return evalBluff(room);
    default:            return { winnerTeamIds: [], earnedPoints: {} };
  }
}

// onlyConnect Multi-Winner: alle Teams die während QUESTION_ACTIVE richtig
// getippt haben gelten als Sieger. Reihenfolge:
//   1. atHintIdx ASC (wer mit weniger Hinweisen löste)
//   2. submittedAt ASC (bei gleichem Hint-Index: schnelleres Team zuerst)
// Alle bekommen eine Aktion (1 Feld). Earned points nur als Stat-Anzeige.
function evalOnlyConnect(room: QQRoomState): QQEvalResult {
  const correct = (room.onlyConnectGuesses ?? [])
    .filter(g => g.correct)
    .sort((a, b) => (a.atHintIdx - b.atHintIdx) || (a.submittedAt - b.submittedAt));
  if (correct.length === 0) return { winnerTeamIds: [], earnedPoints: {} };
  const winnerTeamIds: string[] = [];
  const earnedPoints: Record<string, number> = {};
  for (const g of correct) {
    if (winnerTeamIds.includes(g.teamId)) continue; // dedupe — sollte nicht passieren wegen 1-Versuch
    winnerTeamIds.push(g.teamId);
    earnedPoints[g.teamId] = Math.max(1, 4 - g.atHintIdx);
  }
  return { winnerTeamIds, earnedPoints };
}

// oneOfEight: teams submit the index (as string) of the statement they think is false
function evalOneOfEight(
  room: QQRoomState,
  bt: import('../../../shared/quarterQuizTypes').QQBunteTueteOneOfEight
): QQEvalResult {
  const correctIdx = bt.falseIndex;
  const winners: string[] = [];

  for (const ans of room.answers) {
    const submitted = parseInt(ans.text.trim(), 10);
    if (!Number.isNaN(submitted) && submitted === correctIdx) {
      winners.push(ans.teamId);
    }
  }

  return { winnerTeamIds: winners, earnedPoints: {} };
}

// top5: teams submit pipe-separated answers; score = number of answers that match correct list
// Winner = team with highest score
function evalTop5(
  room: QQRoomState,
  bt: import('../../../shared/quarterQuizTypes').QQBunteTueteTop5
): QQEvalResult {
  // B11 (2026-04-29): Fuzzy-Match via similarityScore (>=0.8) — toleriert
  // Tippfehler bei den 5 Antworten ('leonardo dicaprio' → 'leonardo di caprio').
  const correctAll = ([...(bt.answers ?? []), ...(bt.answersEn ?? [])])
    .map(s => s.trim())
    .filter(Boolean);

  if (correctAll.length === 0) return { winnerTeamIds: [], earnedPoints: {} };

  let maxScore = 0;
  const scores: Array<{ teamId: string; score: number }> = [];

  for (const ans of room.answers) {
    const submitted = ans.text.split('|').map(s => s.trim()).filter(Boolean);
    let score = 0;
    const matchedCorrect = new Set<number>();
    for (const s of submitted) {
      // Find first correct answer that fuzzy-matches and isn't already counted —
      // verhindert dass eine einzige Eingabe mehrere richtige Antworten claimt.
      for (let i = 0; i < correctAll.length; i++) {
        if (matchedCorrect.has(i)) continue;
        if (similarityScore(s, correctAll[i]) >= 0.8) {
          matchedCorrect.add(i);
          score++;
          break;
        }
      }
    }
    scores.push({ teamId: ans.teamId, score });
    if (score > maxScore) maxScore = score;
  }

  if (maxScore === 0) return { winnerTeamIds: [], earnedPoints: {} };

  const winners = scores.filter(s => s.score === maxScore).map(s => s.teamId);
  return { winnerTeamIds: winners, earnedPoints: {} };
}

// order (Fix It): teams submit pipe-separated items in their chosen order
// Score = number of items in the correct position vs correctOrder
// Winner = highest score
function evalOrder(
  room: QQRoomState,
  bt: import('../../../shared/quarterQuizTypes').QQBunteTueteOrder
): QQEvalResult {
  const correctOrder = bt.correctOrder ?? [];
  const items = bt.items ?? [];
  const itemsEn = (bt as any).itemsEn ?? [];
  if (correctOrder.length === 0 || items.length === 0) {
    return { winnerTeamIds: [], earnedPoints: {} };
  }

  // Build the correct sequences in DE *and* EN — teams may submit either language,
  // and bots submit DE. Also accept numeric index submissions (older clients).
  const correctDE = correctOrder.map(idx => (items[idx] ?? '').trim().toLowerCase());
  const correctEN = correctOrder.map(idx => (itemsEn[idx] ?? '').trim().toLowerCase());

  let maxScore = 0;
  const scores: Array<{ teamId: string; score: number }> = [];

  for (const ans of room.answers) {
    const submitted = ans.text.split('|').map(s => s.trim().toLowerCase()).filter(Boolean);
    let score = 0;
    for (let i = 0; i < Math.min(submitted.length, correctOrder.length); i++) {
      const s = submitted[i];
      // Index match (old format): "0|1|2"
      const asIdx = Number(s);
      if (Number.isFinite(asIdx) && asIdx === correctOrder[i]) { score++; continue; }
      // Text match DE or EN
      if (correctDE[i] && s === correctDE[i]) { score++; continue; }
      if (correctEN[i] && s === correctEN[i]) { score++; continue; }
    }
    scores.push({ teamId: ans.teamId, score });
    if (score > maxScore) maxScore = score;
  }

  if (maxScore === 0) return { winnerTeamIds: [], earnedPoints: {} };

  const winners = scores.filter(s => s.score === maxScore).map(s => s.teamId);
  return { winnerTeamIds: winners, earnedPoints: {} };
}

// map (Pin It): teams submit "lat,lng"; closest team to target wins
// Uses simple Euclidean distance (sufficient for game purposes)
function evalMap(
  room: QQRoomState,
  bt: import('../../../shared/quarterQuizTypes').QQBunteTueteMap
): QQEvalResult {
  const targetLat = bt.lat;
  const targetLng = bt.lng;

  let minDist = Infinity;
  const distMap: Array<{ teamId: string; distance: number }> = [];

  for (const ans of room.answers) {
    const parts = ans.text.split(',');
    if (parts.length < 2) continue;
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    // Simple Pythagorean distance (fine for relative ranking across a small area)
    const dLat = lat - targetLat;
    const dLng = lng - targetLng;
    const distance = Math.sqrt(dLat * dLat + dLng * dLng);
    distMap.push({ teamId: ans.teamId, distance });
    if (distance < minDist) minDist = distance;
  }

  if (distMap.length === 0) return { winnerTeamIds: [], earnedPoints: {} };

  const winners = distMap.filter(d => d.distance === minDist).map(d => d.teamId);
  return { winnerTeamIds: winners, earnedPoints: {} };
}

// ── Hot Potato (Bunte Tüte) ───────────────────────────────────────────────────

const HOT_POTATO_TURN_SEC = 30;

/** Clear turn timer for hot potato. */
export function qqClearHotPotatoTimer(room: QQRoomState): void {
  if (room._hotPotatoTimerHandle) {
    clearTimeout(room._hotPotatoTimerHandle);
    room._hotPotatoTimerHandle = null;
  }
  room.hotPotatoTurnEndsAt = null;
  room._hotPotatoOnExpire = null;
}

/** Begin a new turn: set deadline + auto-eliminate timer. */
function qqStartHotPotatoTurn(room: QQRoomState, onExpire: () => void): void {
  qqClearHotPotatoTimer(room);
  room.hotPotatoLastAnswer = null;
  room.hotPotatoTurnEndsAt = Date.now() + HOT_POTATO_TURN_SEC * 1000;
  room._hotPotatoOnExpire = onExpire;
  room._hotPotatoTimerHandle = setTimeout(onExpire, HOT_POTATO_TURN_SEC * 1000);
}

/** Start Hot Potato: random first team, then round-robin. */
export function qqHotPotatoStart(room: QQRoomState, onTurnExpire: () => void): void {
  assertPhase(room, ['QUESTION_ACTIVE']);
  room.hotPotatoEliminated = [];
  room.hotPotatoLastAnswer = null;
  room.hotPotatoUsedAnswers = [];
  room.hotPotatoAnswerAuthors = [];
  room.hotPotatoQualified = [];
  const alive = getAliveTeams(room);
  if (alive.length === 0) return;
  // Random start index stored in room for round-robin tracking
  const startIdx = Math.floor(Math.random() * alive.length);
  room._hotPotatoRoundRobinIdx = startIdx;
  room.hotPotatoActiveTeamId = alive[startIdx];
  room.lastActivityAt = Date.now();
  qqStartHotPotatoTurn(room, onTurnExpire);
}

/** Eliminate the active team (wrong/too slow), advance to next in round-robin order. */
export function qqHotPotatoEliminate(room: QQRoomState, onTurnExpire?: () => void): string | null {
  assertPhase(room, ['QUESTION_ACTIVE']);
  if (!room.hotPotatoActiveTeamId) {
    throw new QQError('NO_ACTIVE_TEAM', 'Kein aktives Hot-Potato-Team.');
  }
  qqClearHotPotatoTimer(room);
  room.hotPotatoEliminated.push(room.hotPotatoActiveTeamId);
  const next = nextRoundRobinTeam(room);
  room.hotPotatoActiveTeamId = next;
  room.hotPotatoLastAnswer = null;
  room.lastActivityAt = Date.now();
  if (next && onTurnExpire) qqStartHotPotatoTurn(room, onTurnExpire);
  return next;
}

/** Force-eliminate a specific team (nicht unbedingt active). Wird genutzt,
 *  wenn ein Team offline geht oder der Moderator manuell ausschließt. Falls
 *  das betroffene Team aktiv war, rückt die Round-Robin zum nächsten Team. */
export function qqHotPotatoForceEliminate(
  room: QQRoomState,
  teamId: string,
  onTurnExpire?: () => void,
): string | null {
  assertPhase(room, ['QUESTION_ACTIVE']);
  if (!room.joinOrder.includes(teamId)) {
    throw new QQError('NO_SUCH_TEAM', 'Unbekanntes Team.');
  }
  if (room.hotPotatoEliminated.includes(teamId)) {
    throw new QQError('ALREADY_ELIMINATED', 'Team ist bereits raus.');
  }
  qqClearHotPotatoTimer(room);
  room.hotPotatoEliminated.push(teamId);
  if (room.hotPotatoActiveTeamId === teamId) {
    const next = nextRoundRobinTeam(room);
    room.hotPotatoActiveTeamId = next;
    room.hotPotatoLastAnswer = null;
    if (next && onTurnExpire) qqStartHotPotatoTurn(room, onTurnExpire);
  } else if (room.hotPotatoActiveTeamId && onTurnExpire) {
    // Aktives Team bleibt dran — Timer neu starten.
    qqStartHotPotatoTurn(room, onTurnExpire);
  }
  room.lastActivityAt = Date.now();
  return room.hotPotatoActiveTeamId;
}

/** Advance round-robin to next alive team WITHOUT eliminating current. */
export function qqHotPotatoNext(room: QQRoomState, onTurnExpire?: () => void): string | null {
  assertPhase(room, ['QUESTION_ACTIVE']);
  qqClearHotPotatoTimer(room);
  const next = nextRoundRobinTeam(room);
  room.hotPotatoActiveTeamId = next;
  room.hotPotatoLastAnswer = null;
  room.lastActivityAt = Date.now();
  if (next && onTurnExpire) qqStartHotPotatoTurn(room, onTurnExpire);
  return next;
}

/** Team submits their Hot Potato answer text. */
export function qqHotPotatoSubmitAnswer(room: QQRoomState, teamId: string, answer: string): void {
  assertPhase(room, ['QUESTION_ACTIVE']);
  if (room.hotPotatoActiveTeamId !== teamId) {
    throw new QQError('NOT_YOUR_TURN', 'Du bist gerade nicht dran.');
  }
  qqClearHotPotatoTimer(room);
  room.hotPotatoLastAnswer = answer;
  room.lastActivityAt = Date.now();
}

function getAliveTeams(room: QQRoomState): string[] {
  return room.joinOrder.filter(
    id => !room.hotPotatoEliminated.includes(id) && room.teams[id]?.connected
  );
}

/** Markiere ein Team als qualifiziert (hat ≥1 akzeptierte Antwort gegeben). */
export function qqHotPotatoMarkQualified(room: QQRoomState, teamId: string): void {
  if (!room.hotPotatoQualified.includes(teamId)) {
    room.hotPotatoQualified.push(teamId);
  }
}

/**
 * Prüft, ob die Hot-Potato-Runde endet.
 *
 * Regeln:
 *  - Alle Teams spielen reihum weiter, solange ≥2 Teams alive sind UND noch
 *    gültige Antworten im Pool verfügbar sind.
 *  - Sieger: genau 1 Team alive → es gewinnt (hat jede Runde richtig geantwortet).
 *  - Pool erschöpft mit ≥2 Teams alive → alle alive-Teams gewinnen geteilt
 *    (werden als string[] zurückgegeben, Reveal-Logik nutzt qqMarkCorrect(array)).
 *  - '' → alle eliminiert, kein Sieger.
 *  - null → weiterspielen.
 */
export function qqHotPotatoCheckWinner(room: QQRoomState): string | string[] | null | '' {
  const alive = getAliveTeams(room);
  if (alive.length === 0) return '';
  // Mindestens-eine-Runde-Schutz: alive-Team(s) müssen mind. 1× am Zug
  // gewesen sein bevor die Runde endet. Sonst kann ein User „abgebrochen"
  // werden ohne je Eingabe gehabt zu haben (z.B. wenn alle Dummies früh
  // ausscheiden und der echte User sole-survivor ist ohne je geantwortet
  // zu haben). User-Wunsch 2026-04-28.
  const aliveHadTurn = alive.every(id =>
    room.hotPotatoQualified.includes(id) || room.hotPotatoEliminated.includes(id)
  );
  // 2026-04-28-Bug-Fix: Wenn das letzte alive-Team gerade ACTIVE ist aber
  // noch NICHT auf diese Runde geantwortet hat, dürfen wir nicht als Winner
  // declaren — sie sollen ihre Runde noch tippen können. (User-Bug: 'letzte
  // Person durfte nichts eintippen aber hat gewonnen'.) Erst wenn sie
  // entweder schon eine Antwort abgegeben hat ODER sie nicht das aktive Team
  // ist (jemand anderes wurde gerade eliminiert), zählt sie als Winner.
  if (alive.length === 1 && aliveHadTurn) {
    const last = alive[0];
    const isActiveButHasntAnswered =
      room.hotPotatoActiveTeamId === last && !room.hotPotatoLastAnswer;
    if (!isActiveButHasntAnswered) return last;
  }

  // Pool-Erschöpfung: wenn alle gültigen Antworten der Frage verbraucht sind,
  // kann kein neuer Antwort-Turn mehr gespielt werden → Runde endet.
  // Alle Überlebenden haben "in der Zeit richtig geantwortet" → Shared Win.
  const q = room.currentQuestion;
  if (q && q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') {
    const validAnswers = (q.answer || '')
      .split(/[,;]/)
      .map(a => a.replace(/[…\.]+$/, '').trim())
      .filter(a => a.length > 0);
    if (validAnswers.length > 0 && room.hotPotatoUsedAnswers.length >= validAnswers.length && aliveHadTurn) {
      return alive;
    }
  }

  return null;
}

function nextRoundRobinTeam(room: QQRoomState): string | null {
  const alive = getAliveTeams(room);
  if (alive.length === 0) return null;
  // joinOrder ist die stabile Rotations-Reihenfolge — wir gehen vom aktuell
  // aktiven Team in joinOrder vorwärts, bis wir ein noch aliveTeam finden.
  // (Wichtig: wenn das aktuelle Team gerade eliminiert wurde, ist es nicht
  // mehr in `alive`, aber sein Slot in joinOrder gibt die Position vor.)
  const order = room.joinOrder;
  const startPos = order.indexOf(room.hotPotatoActiveTeamId ?? '');
  if (startPos < 0) return alive[0];
  for (let i = 1; i <= order.length; i++) {
    const candidate = order[(startPos + i) % order.length];
    if (alive.includes(candidate)) return candidate;
  }
  return null;
}

// ── Imposter (oneOfEight) round-robin ─────────────────────────────────────────

/** Start Imposter round: random team begins, set up round-robin queue. */
export function qqImposterStart(room: QQRoomState): void {
  assertPhase(room, ['QUESTION_ACTIVE']);
  room.imposterEliminated = [];
  room.imposterChosenIndices = [];
  const teams = room.joinOrder.filter(id => room.teams[id]?.connected);
  if (teams.length === 0) return;
  const startIdx = Math.floor(Math.random() * teams.length);
  // Build queue starting from random position, then round-robin
  room.imposterQueue = [
    ...teams.slice(startIdx),
    ...teams.slice(0, startIdx),
  ];
  room.imposterActiveTeamId = room.imposterQueue[0];
  room.lastActivityAt = Date.now();
}

/**
 * Active team chooses a statement.
 * Returns: { eliminated: false } if statement was correct (round continues),
 *          { eliminated: true, allWin: false } if it was the false one (team eliminated),
 *          { eliminated: false, allWin: true } if all correct statements are gone (everyone wins).
 */
export function qqImposterChoose(
  room: QQRoomState,
  teamId: string,
  statementIndex: number,
): { eliminated: boolean; allWin: boolean } {
  assertPhase(room, ['QUESTION_ACTIVE']);

  if (room.imposterActiveTeamId !== teamId) {
    throw new QQError('NOT_YOUR_TURN', 'Dieses Team ist gerade nicht dran (Imposter).');
  }

  const q = room.currentQuestion;
  if (!q || q.bunteTuete?.kind !== 'oneOfEight') {
    throw new QQError('WRONG_CATEGORY', 'Keine oneOfEight-Frage aktiv.');
  }

  const { falseIndex } = q.bunteTuete;
  const totalStatements = q.bunteTuete.statements.length; // 8

  if (statementIndex < 0 || statementIndex >= totalStatements) {
    throw new QQError('INVALID_INDEX', `Ungültiger Statement-Index: ${statementIndex}.`);
  }
  if (room.imposterChosenIndices.includes(statementIndex)) {
    throw new QQError('ALREADY_CHOSEN', 'Diese Aussage wurde bereits gewählt.');
  }

  if (statementIndex === falseIndex) {
    // Team chose the false statement — eliminated
    room.imposterEliminated.push(teamId);
    // Auto-advance to next surviving team
    const currentPos = room.imposterQueue.indexOf(teamId);
    let nextTeamId: string | null = null;
    for (let i = 1; i <= room.imposterQueue.length; i++) {
      const candidate = room.imposterQueue[(currentPos + i) % room.imposterQueue.length];
      if (!room.imposterEliminated.includes(candidate) && room.teams[candidate]?.connected) {
        nextTeamId = candidate;
        break;
      }
    }
    room.imposterActiveTeamId = nextTeamId;
    room.lastActivityAt = Date.now();
    return { eliminated: true, allWin: false };
  }

  // Correct statement — mark as chosen, advance round-robin
  room.imposterChosenIndices.push(statementIndex);

  // Check if only the false statement remains → everyone still in wins
  const remaining = totalStatements - room.imposterChosenIndices.length;
  if (remaining <= 1) {
    // Only the false one left — all surviving teams win
    room.imposterActiveTeamId = null;
    room.lastActivityAt = Date.now();
    return { eliminated: false, allWin: true };
  }

  // Advance to next team in queue (skip eliminated teams)
  const currentPos = room.imposterQueue.indexOf(teamId);
  let nextTeamId: string | null = null;
  for (let i = 1; i <= room.imposterQueue.length; i++) {
    const candidate = room.imposterQueue[(currentPos + i) % room.imposterQueue.length];
    if (!room.imposterEliminated.includes(candidate) && room.teams[candidate]?.connected) {
      nextTeamId = candidate;
      break;
    }
  }
  room.imposterActiveTeamId = nextTeamId;
  room.lastActivityAt = Date.now();
  return { eliminated: false, allWin: false };
}

/** Force-eliminate a team in Imposter (offline/rule violation). Rückt Round-Robin
 *  weiter, falls das betroffene Team aktiv war. */
export function qqImposterForceEliminate(room: QQRoomState, teamId: string): string | null {
  assertPhase(room, ['QUESTION_ACTIVE']);
  if (!room.joinOrder.includes(teamId)) {
    throw new QQError('NO_SUCH_TEAM', 'Unbekanntes Team.');
  }
  if (room.imposterEliminated.includes(teamId)) {
    throw new QQError('ALREADY_ELIMINATED', 'Team ist bereits raus.');
  }
  room.imposterEliminated.push(teamId);
  if (room.imposterActiveTeamId === teamId) {
    const currentPos = room.imposterQueue.indexOf(teamId);
    let nextTeamId: string | null = null;
    for (let i = 1; i <= room.imposterQueue.length; i++) {
      const candidate = room.imposterQueue[(currentPos + i) % room.imposterQueue.length];
      if (!room.imposterEliminated.includes(candidate) && room.teams[candidate]?.connected) {
        nextTeamId = candidate;
        break;
      }
    }
    room.imposterActiveTeamId = nextTeamId;
  }
  room.lastActivityAt = Date.now();
  return room.imposterActiveTeamId;
}

// Moderator transitions from QUESTION_REVEAL → PLACEMENT using the
// correctTeamId that was already set by applyAutoEval during reveal.
export function qqStartPlacement(room: QQRoomState): void {
  assertPhase(room, ['QUESTION_REVEAL']);
  if (!room.correctTeamId) {
    // No winner — skip placement, go to next question intro
    qqNextQuestion(room);
    return;
  }
  const teamId = room.correctTeamId;
  room.pendingFor = teamId;
  room.phase = 'PLACEMENT';
  const action = pendingActionForPhase(room, teamId);
  room.pendingAction = action;
  if (action === 'PLACE_2') {
    room.teamPhaseStats[teamId].placementsLeft = 2;
  }
  room.lastActivityAt = Date.now();
}

// Mark correct: only sets correctTeamId + placement queue, stays in QUESTION_REVEAL.
// Moderator triggers PLACEMENT separately via qq:startPlacement.
export function qqMarkCorrect(room: QQRoomState, teamIdOrList: string | string[]): void {
  assertPhase(room, ['QUESTION_REVEAL']);

  if (Array.isArray(teamIdOrList)) {
    // Nach Antwortzeit sortieren (schnellstes Team zuerst), damit Placement-Queue
    // fair bleibt — historisch wurde Array-Reihenfolge vom Caller benutzt, die
    // bei Hot-Potato/Imposter-Tie-Scenarios zufällig war.
    const sorted = [...teamIdOrList].sort((a, b) => {
      const aAt = room.answers.find(x => x.teamId === a)?.submittedAt ?? Infinity;
      const bAt = room.answers.find(x => x.teamId === b)?.submittedAt ?? Infinity;
      return aAt - bAt;
    });
    room.correctTeamId = sorted[0];
    room['_placementQueue'] = sorted.slice(1);
  } else {
    assertTeam(room, teamIdOrList);
    room.correctTeamId = teamIdOrList;
    room['_placementQueue'] = [];
  }
  // Snapshot für Summary-Stats — additiv, falls Moderator nachträglich weitere
  // Teams als richtig markiert (z.B. CHEESE/SCHAETZCHEN-Toleranz von Hand).
  const ids = Array.isArray(teamIdOrList) ? teamIdOrList : [teamIdOrList];
  const prev = new Set(room._currentQuestionWinners ?? []);
  for (const id of ids) prev.add(id);
  room._currentQuestionWinners = Array.from(prev);
  room.lastActivityAt = Date.now();
}

// Undo a winner-mark while still in QUESTION_REVEAL. Moderator safety net for
// "oops, wrong team" clicks — clears correctTeamId + placement queue + snapshot
// so the reveal UI returns to "Gewinner wählen" state.
export function qqUndoMarkCorrect(room: QQRoomState): void {
  assertPhase(room, ['QUESTION_REVEAL']);
  room.correctTeamId = null;
  room.pendingFor    = null;
  room.pendingAction = null;
  delete room['_placementQueue'];
  room._currentQuestionWinners = [];
  room.lastActivityAt = Date.now();
}

export function qqMarkWrong(room: QQRoomState): void {
  assertPhase(room, ['QUESTION_REVEAL']);
  room.correctTeamId = null;
  room.pendingFor    = null;
  room.pendingAction = null;
  qqNextQuestion(room);
}

function pendingActionForPhase(
  room: QQRoomState,
  _teamId: string
): QQPendingAction {
  const hasFreeCell = room.grid.some(row => row.some(cell => cell.ownerId === null));
  if (room.gamePhaseIndex === 1) {
    // Phase 1 is pre-comeback; if the grid is full, team can only steal.
    if (!hasFreeCell) return 'STEAL_1';
    return 'PLACE_1';
  }
  if (room.gamePhaseIndex === 2) {
    if (!hasFreeCell) return 'STEAL_1';
    return 'PLACE_2'; // team may switch to STEAL_1
  }
  // Phase 3 & 4: free choice — auch wenn Grid voll. (User-Bug 2026-04-28:
  // 'Stapeln ging gar nicht ab Runde 3, er ist direkt zum Klauen gesprungen'.
  // Vorher war 'STEAL_1' bei vollem Grid Default → FREE-Menu wurde übersprungen
  // → User konnte nicht stapeln. Jetzt bleiben wir in FREE — die Team-UI
  // versteckt den PLACE-Button automatisch wenn keine freien Felder, aber
  // STAPEL-Button bleibt sichtbar.)
  return 'FREE';
}

// ── Phase 2/3/4 free-action choice ───────────────────────────────────────────
export function qqChooseFreeAction(
  room: QQRoomState,
  teamId: string,
  action: 'PLACE' | 'STEAL' | 'FREEZE' | 'SANDUHR' | 'SHIELD' | 'SWAP' | 'STAPEL'
): void {
  assertPhase(room, ['PLACEMENT']);
  assertPendingFor(room, teamId);
  if (room.pendingAction !== 'FREE' && room.gamePhaseIndex !== 2) {
    throw new QQError('WRONG_PHASE', 'Aktion nur in Phase 2+ wählbar.');
  }

  const hasFreeCell = room.grid.some(row => row.some(cell => cell.ownerId === null));

  if (action === 'STEAL') {
    if (room.gamePhaseIndex === 2) {
      const stats = room.teamPhaseStats[teamId];
      if (stats.stealsUsed >= QQ_MAX_STEALS_PER_PHASE) {
        throw new QQError('STEAL_LIMIT', 'Bereits 2× geklaut in dieser Phase.');
      }
    }
    room.pendingAction = 'STEAL_1';

  } else if (action === 'PLACE') {
    // R1/R2: Default-PLACE laeuft via PLACE_1/PLACE_2-Action.
    // R3+R4: PLACE bleibt erlaubt SOLANGE freie Felder existieren — sobald Grid
    //        voll ist, koennen Teams nur noch klauen/spezial-Aktionen nutzen.
    if (!hasFreeCell) throw new QQError('NO_FREE_CELL', 'Keine freien Felder mehr.');
    room.pendingAction = 'PLACE_2';
    room.teamPhaseStats[teamId].placementsLeft = 2;

  } else if (action === 'FREEZE') {
    // Legacy — nicht mehr im FE-Menü, aber Handler bleibt für Abwärtskompatibilität.
    if (room.gamePhaseIndex < 3) throw new QQError('WRONG_PHASE', 'Einfrieren erst ab Phase 3.');
    room.pendingAction = 'FREEZE_1';

  } else if (action === 'SANDUHR') {
    // Bann (intern SANDUHR): ab Phase 3, pro Frage frei wählbar (kein Budget).
    // R4: Bann bleibt verfuegbar — additive Klimakurve (jede Runde +1 Tool).
    if (room.gamePhaseIndex < 3) throw new QQError('WRONG_PHASE', 'Bann erst ab Runde 3.');
    // Ziel: Gegnerfelder ODER leere Felder (jeweils nicht stuck/shielded/schon gesperrt).
    const hasTarget = room.grid.some(row => row.some(cell =>
      cell.ownerId !== teamId && !cell.stuck && !cell.shielded && !cell.sandLockTtl));
    if (!hasTarget) throw new QQError('NO_TARGET', 'Kein bannbares Feld vorhanden.');
    room.pendingAction = 'SANDUHR_1';

  } else if (action === 'SHIELD') {
    // Schild: nur Phase 3, max 2 pro Spiel pro Team, hält bis Spielende.
    if (room.gamePhaseIndex !== 3) throw new QQError('WRONG_PHASE', 'Schild nur in Runde 3.');
    const stats = room.teamPhaseStats[teamId];
    if ((stats.shieldsUsed ?? 0) >= 2) throw new QQError('SHIELD_LIMIT', 'Bereits 2 Schilde verbraucht.');
    const hasOwn = room.grid.some(row => row.some(cell => cell.ownerId === teamId));
    if (!hasOwn) throw new QQError('NO_OWN_CELL', 'Keine eigenen Felder zum Schützen.');
    room.pendingAction = 'SHIELD_1';

  } else if (action === 'SWAP') {
    if (room.gamePhaseIndex < 4) throw new QQError('WRONG_PHASE', 'Tauschen erst ab Phase 4.');
    room.pendingAction = 'SWAP_1';
    room.swapFirstCell = null;

  } else if (action === 'STAPEL') {
    if (room.gamePhaseIndex < 3) throw new QQError('WRONG_PHASE', 'Stapeln erst ab Runde 3.');
    const stats = room.teamPhaseStats[teamId];
    if ((stats.stapelsUsed ?? 0) >= QQ_MAX_STAPELS_PER_GAME) {
      throw new QQError('STAPEL_LIMIT', `Bereits ${QQ_MAX_STAPELS_PER_GAME} Stapel verbraucht.`);
    }
    const hasOwn = room.grid.some(row => row.some(cell =>
      cell.ownerId === teamId && !cell.stuck));
    if (!hasOwn) throw new QQError('NO_OWN_CELL', 'Kein eigenes Feld zum Stapeln.');
    room.pendingAction = 'STAPEL_1';
  }

  room.lastActivityAt = Date.now();
}

// ── Cell placement ────────────────────────────────────────────────────────────
export function qqPlaceCell(
  room: QQRoomState,
  teamId: string,
  row: number,
  col: number
): { jokersAwarded: number } {
  // assertPhase(['PLACEMENT']) erlaubt automatisch auch CONNECTIONS_4X4 +
  // c.phase==='placement' (siehe assertPhase-Helper).
  assertPhase(room, ['PLACEMENT']);
  assertPendingFor(room, teamId);
  assertValidCoord(room, row, col);

  const cell = room.grid[row][col];
  if (cell.ownerId !== null) {
    throw new QQError('CELL_OCCUPIED', 'Dieses Feld ist bereits belegt.');
  }
  if (cell.sandLockTtl && cell.sandLockTtl > 0) {
    throw new QQError('SAND_LOCKED', 'Feld ist gebannt.');
  }

  const action = room.pendingAction;
  if (action !== 'PLACE_1' && action !== 'PLACE_2' && action !== 'FREE' && action !== 'COMEBACK') {
    throw new QQError('WRONG_ACTION', 'Klauen-Modus aktiv — wähle ein Gegnerfeld.');
  }

  cell.ownerId = teamId;
  room.lastPlacedCell = { row, col, teamId, wasSteal: false };
  const jokersAwarded = handleJokerDetection(room, teamId);
  updateTerritories(room);
  const stats = room.teamPhaseStats[teamId];

  // Jede PLACE_2 / COMEBACK-PLACE_2 / PLACE_1-Joker-Bonus-Runde benutzt placementsLeft.
  const usesMultiSlot =
    (action === 'PLACE_2') ||
    (action === 'COMEBACK' && room.comebackAction === 'PLACE_2') ||
    (action === 'PLACE_1' && stats.placementsLeft > 0); // joker-bonus-Runde

  // 2026-04-28: User-Wunsch 'Joker = 1 Aktion der aktuellen Runde'. Helper
  // jokerBonusAction(room) liefert PLACE_1 / FREE / STEAL_1 je nach Phase
  // und Grid-State.
  if (usesMultiSlot) {
    stats.placementsLeft--;
    // Joker während laufender Multi-Slot-Runde: SOFORT platzieren (vor verbleibenden Regulär-Steinen)
    // Die noch offenen Multi-Slot-Placements werden aufgeschoben in pendingMultiSlot.
    if (jokersAwarded > 0) {
      if (stats.placementsLeft > 0) {
        stats.pendingMultiSlot = (stats.pendingMultiSlot ?? 0) + stats.placementsLeft;
      }
      stats.placementsLeft = jokersAwarded;
      room.pendingAction = jokerBonusAction(room);
      return { jokersAwarded };
    }
    if (stats.placementsLeft > 0) {
      return { jokersAwarded };
    }
  }

  // Placement complete — direkter Joker-Bonus (aus PLACE_1 ohne pending)?
  const direct = usesMultiSlot ? 0 : jokersAwarded;
  if (direct > 0) {
    stats.placementsLeft = direct;
    room.pendingAction = jokerBonusAction(room);
    return { jokersAwarded: direct };
  }

  // Falls noch aufgeschobene Multi-Slot-Placements existieren (nach Joker-Bonus) → wiederaufnehmen
  if ((stats.pendingMultiSlot ?? 0) > 0) {
    stats.placementsLeft = stats.pendingMultiSlot!;
    stats.pendingMultiSlot = 0;
    room.pendingAction = 'PLACE_1';
    return { jokersAwarded };
  }

  finishPlacement(room);
  return { jokersAwarded };
}

// ── Cell steal ────────────────────────────────────────────────────────────────
export function qqStealCell(
  room: QQRoomState,
  teamId: string,
  row: number,
  col: number
): { jokersAwarded: number } {
  assertPhase(room, ['PLACEMENT']);
  assertPendingFor(room, teamId);
  assertValidCoord(room, row, col);

  const cell = room.grid[row][col];
  if (cell.ownerId === null) {
    throw new QQError('CELL_EMPTY', 'Leeres Feld — benutze "Setzen" für freie Felder.');
  }
  if (cell.ownerId === teamId) {
    throw new QQError('OWN_CELL', 'Du kannst dein eigenes Feld nicht klauen.');
  }
  if (cell.frozen || cell.stuck) {
    throw new QQError('FROZEN_CELL', 'Dieses Feld ist eingefroren und kann nicht geklaut werden.');
  }
  if (cell.shielded) {
    throw new QQError('SHIELDED_CELL', 'Dieses Feld ist geschützt und kann nicht geklaut werden.');
  }

  const action = room.pendingAction;
  if (action !== 'STEAL_1' && action !== 'FREE' && action !== 'COMEBACK') {
    throw new QQError('WRONG_ACTION', 'Kein Klau-Modus aktiv.');
  }

  // Phase 2 steal limit check
  if (room.gamePhaseIndex === 2 && action === 'STEAL_1') {
    const stats = room.teamPhaseStats[teamId];
    if (stats.stealsUsed >= QQ_MAX_STEALS_PER_PHASE) {
      throw new QQError('STEAL_LIMIT', 'Bereits 2× geklaut in dieser Phase.');
    }
    stats.stealsUsed++;
  }
  // Game-Total-Steals (fuer Summary „Geklaut"-Counter). Phase-Reset von
  // teamPhaseStats[id].stealsUsed wuerde sonst die Statistik vernichten.
  room.teamTotalSteals[teamId] = (room.teamTotalSteals[teamId] ?? 0) + 1;

  // Comeback-Klau: nur Leader-Territorium erlaubt, bei ≥2 Leadern zusätzlich
  // genau 1 pro Leader (kein doppeltes Beklauen eines Teams).
  const isComeback = action === 'COMEBACK' && room.comebackTeamId === teamId;
  if (isComeback) {
    const targets = room.comebackStealTargets ?? [];
    if (targets.length > 0 && !targets.includes(cell.ownerId)) {
      throw new QQError('WRONG_TARGET', 'Beim Comeback darf nur aus Führenden-Gebiet geklaut werden.');
    }
    if (targets.length >= 2 && (room.comebackStealsDone ?? []).includes(cell.ownerId)) {
      throw new QQError('ALREADY_STOLEN', 'Von diesem Team wurde bereits geklaut – wähle einen anderen Leader.');
    }
  }

  const prevOwner = cell.ownerId;
  cell.ownerId = teamId;
  room.lastPlacedCell = { row, col, teamId, wasSteal: true };
  const jokersAwarded = handleJokerDetection(room, teamId);
  updateTerritories(room);

  if (jokersAwarded > 0) {
    room.teamPhaseStats[teamId].placementsLeft = jokersAwarded;
    room.pendingAction = jokerBonusAction(room);
    return { jokersAwarded };
  }

  // Comeback-Multi-Steal: placementsLeft pro Klau dekrementieren, erst bei 0
  // die Phase abschließen.
  if (isComeback) {
    const stats = room.teamPhaseStats[teamId];
    if (prevOwner) room.comebackStealsDone = [...(room.comebackStealsDone ?? []), prevOwner];
    if (stats && stats.placementsLeft > 0) stats.placementsLeft--;

    // Neuer H/L-Comeback-Flow? Steal-Nachbearbeitung uebernimmt entweder
    // - Leader-Recompute (bleibt in PLACEMENT mit aktualisierten Targets) oder
    // - naechstes Team aus der Queue holen oder
    // - Comeback abschliessen → Finale.
    if (room.comebackHL && room.comebackHL.phase === 'steal') {
      qqComebackStealAfterOne(room);
      return { jokersAwarded };
    }

    // Legacy-Comeback (ohne H/L — aktuell nicht mehr genutzt, bleibt als
    // Fallback fuer evtl. Szenarien ohne Mini-Game).
    if (stats && stats.placementsLeft > 0) {
      return { jokersAwarded };
    }
  }

  finishPlacement(room);
  return { jokersAwarded };
}

// ── Swap (comeback action) ────────────────────────────────────────────────────
export function qqSwapCells(
  room: QQRoomState,
  teamId: string,
  rowA: number, colA: number,
  rowB: number, colB: number
): void {
  assertPhase(room, ['PLACEMENT']);
  assertPendingFor(room, teamId);
  assertValidCoord(room, rowA, colA);
  assertValidCoord(room, rowB, colB);
  if (room.comebackAction !== 'SWAP_2') {
    throw new QQError('WRONG_ACTION', 'Tausch nicht verfügbar.');
  }

  const cellA = room.grid[rowA][colA];
  const cellB = room.grid[rowB][colB];

  if (cellA.ownerId === null || cellB.ownerId === null) {
    throw new QQError('EMPTY_CELL', 'Beide Tauschfelder müssen belegt sein.');
  }
  if (cellA.ownerId === teamId || cellB.ownerId === teamId) {
    throw new QQError('OWN_CELL', 'Nur Felder von anderen Teams können getauscht werden.');
  }
  if (cellA.ownerId === cellB.ownerId) {
    throw new QQError('SAME_TEAM', 'Felder müssen von verschiedenen Teams sein.');
  }
  if (cellA.shielded || cellB.shielded) {
    throw new QQError('SHIELDED_CELL', 'Ein geschütztes Feld kann nicht getauscht werden.');
  }

  const tmpOwner = cellA.ownerId;
  cellA.ownerId  = cellB.ownerId;
  cellB.ownerId  = tmpOwner;

  updateTerritories(room);
  finishPlacement(room);
}

// ── Phase 4: Swap 1 (own + enemy) — 2-step ───────────────────────────────────
/**
 * Phase 4 Tauschen: team picks their own cell first, then an enemy cell.
 * Call twice — first with own cell, second with enemy cell to complete swap.
 */
export function qqSwapOneCell(
  room: QQRoomState,
  teamId: string,
  row: number,
  col: number
): { done: boolean } {
  assertPhase(room, ['PLACEMENT']);
  assertPendingFor(room, teamId);
  assertValidCoord(room, row, col);
  if (room.pendingAction !== 'SWAP_1') {
    throw new QQError('WRONG_ACTION', 'Tauschen-Modus nicht aktiv.');
  }

  const cell = room.grid[row][col];

  if (!room.swapFirstCell) {
    // Step 1: pick own cell
    if (cell.ownerId !== teamId) {
      throw new QQError('NOT_OWN_CELL', 'Zuerst ein eigenes Feld auswählen.');
    }
    room.swapFirstCell = { row, col, ownerId: teamId };
    room.lastActivityAt = Date.now();
    return { done: false };
  } else {
    // Step 2: pick enemy cell
    if (cell.ownerId === null) {
      throw new QQError('EMPTY_CELL', 'Zielfeld muss einem anderen Team gehören.');
    }
    if (cell.ownerId === teamId) {
      throw new QQError('OWN_CELL', 'Zielfeld muss einem anderen Team gehören.');
    }
    if (cell.stuck || cell.frozen) {
      throw new QQError('FROZEN_CELL', 'Dieses Feld ist eingefroren.');
    }
    if (cell.shielded) {
      throw new QQError('SHIELDED_CELL', 'Dieses Feld ist geschützt und kann nicht getauscht werden.');
    }
    const ownCell = room.grid[room.swapFirstCell.row][room.swapFirstCell.col];
    const enemyOwner = cell.ownerId;
    cell.ownerId     = teamId;
    ownCell.ownerId  = enemyOwner;
    room.lastPlacedCell = { row, col, teamId, wasSteal: false };
    room.swapFirstCell  = null;
    updateTerritories(room);
    finishPlacement(room);
    return { done: true };
  }
}

// ── Phase 3/4: Freeze cell (1 question protection) ───────────────────────────
export function qqFreezeCell(
  room: QQRoomState,
  teamId: string,
  row: number,
  col: number
): void {
  assertPhase(room, ['PLACEMENT']);
  assertPendingFor(room, teamId);
  assertValidCoord(room, row, col);
  if (room.pendingAction !== 'FREEZE_1') {
    throw new QQError('WRONG_ACTION', 'Einfrieren-Modus nicht aktiv.');
  }
  const cell = room.grid[row][col];
  if (cell.ownerId !== teamId) {
    throw new QQError('NOT_OWN_CELL', 'Nur eigene Felder einfrieren.');
  }
  if (cell.stuck) {
    throw new QQError('ALREADY_STUCK', 'Dieses Feld ist bereits permanent eingefroren.');
  }
  cell.frozen = true;
  room.frozenCells.push({ row, col });
  updateTerritories(room);
  finishPlacement(room);
}

// ── Phase 4: Stapeln (permanent-freeze eigenes Feld) ─────────────────────────
// Historisch verlangte Stapeln ein Plus-Form-Zentrum. Ab CozyQuiz Option-C ist
// die Form-Bedingung entfernt: jedes eigene Feld darf gestapelt werden.
export function qqStuckCell(
  room: QQRoomState,
  teamId: string,
  row: number,
  col: number
): void {
  assertPhase(room, ['PLACEMENT']);
  assertPendingFor(room, teamId);
  assertValidCoord(room, row, col);
  if (room.pendingAction !== 'STAPEL_1') {
    throw new QQError('WRONG_ACTION', 'Stapeln-Modus nicht aktiv.');
  }
  const cell = room.grid[row][col];
  if (cell.ownerId !== teamId) {
    throw new QQError('NOT_OWN_CELL', 'Nur eigene Felder können gestapelt werden.');
  }
  if (cell.stuck) {
    throw new QQError('ALREADY_STUCK', 'Dieses Feld ist bereits gestapelt.');
  }
  cell.stuck    = true;
  cell.frozen   = false;   // stuck supersedes frozen
  cell.shielded = false;   // Stapeln löst Schild auf (permanenter Schutz reicht aus)
  // Stapel-Counter pro Spiel hochsetzen (Cap: QQ_MAX_STAPELS_PER_GAME).
  const stats = room.teamPhaseStats[teamId];
  stats.stapelsUsed = (stats.stapelsUsed ?? 0) + 1;
  room.lastPlacedCell = { row, col, teamId, wasSteal: false };
  updateTerritories(room);
  finishPlacement(room);
}

// ── Phase 3: Bann (intern SANDUHR — frei wählbar pro Frage, kein Budget) ──
// Ziel: gegnerisches ODER leeres Feld. Stuck/Shielded blockt. Nach 3 Fragen wird
// die Sperre aufgehoben → Feld ist leer und kann normal besetzt werden.
export function qqSandLockCell(
  room: QQRoomState,
  teamId: string,
  row: number,
  col: number
): void {
  assertPhase(room, ['PLACEMENT']);
  assertPendingFor(room, teamId);
  assertValidCoord(room, row, col);
  if (room.pendingAction !== 'SANDUHR_1') {
    throw new QQError('WRONG_ACTION', 'Bann-Modus nicht aktiv.');
  }
  const cell = room.grid[row][col];
  if (cell.ownerId === teamId) {
    throw new QQError('OWN_CELL', 'Eigenes Feld kann nicht gebannt werden.');
  }
  if (cell.stuck) {
    throw new QQError('STUCK_CELL', 'Gestapeltes Feld lässt sich nicht bannen.');
  }
  if (cell.shielded) {
    throw new QQError('SHIELDED_CELL', 'Feld ist geschützt — Bann prallt ab.');
  }
  if (cell.sandLockTtl && cell.sandLockTtl > 0) {
    throw new QQError('ALREADY_LOCKED', 'Feld ist bereits gebannt.');
  }
  cell.ownerId     = null;
  cell.frozen      = false;
  cell.jokerFormed = false;
  cell.sandLockTtl = 3;
  room.lastPlacedCell = { row, col, teamId, wasSteal: false };
  updateTerritories(room);
  finishPlacement(room);
}

// ── Phase 3: Schild (max 2 pro Spiel: 1 spezifisches eigenes Feld schützen) ──
// Spieler wählt das Ziel-Feld; nur diese eine Zelle wird `shielded = true`.
// Schild hält bis Spielende. Frühere Variante "schütze ganzes Cluster" wurde
// abgelöst — fühlte sich pay-to-win-mäßig an, weil 1 Schild 6+ Felder absicherte.
export function qqShieldCell(
  room: QQRoomState,
  teamId: string,
  row: number,
  col: number
): void {
  assertPhase(room, ['PLACEMENT']);
  assertPendingFor(room, teamId);
  if (room.pendingAction !== 'SHIELD_1') {
    throw new QQError('WRONG_ACTION', 'Schild-Modus nicht aktiv.');
  }
  if (row < 0 || row >= room.gridSize || col < 0 || col >= room.gridSize) {
    throw new QQError('OUT_OF_RANGE', 'Feld außerhalb des Spielbretts.');
  }
  const cell = room.grid[row][col];
  if (cell.ownerId !== teamId) {
    throw new QQError('NOT_OWN_CELL', 'Schild nur auf eigenen Feldern.');
  }
  if (cell.shielded) {
    throw new QQError('ALREADY_SHIELDED', 'Feld ist bereits geschützt.');
  }
  cell.shielded = true;
  room.shieldedCells.push({ row, col });
  const stats = room.teamPhaseStats[teamId];
  stats.shieldsUsed = (stats.shieldsUsed ?? 0) + 1;
  updateTerritories(room);
  finishPlacement(room);
}

/** @deprecated Backwards-compat: jetzt verlangt `qqShieldCell` row/col.
 *  Alte Aufrufer sollten die spezifische Zelle übergeben. */
export function qqShieldCluster(
  room: QQRoomState,
  teamId: string,
  row?: number,
  col?: number
): void {
  if (row == null || col == null) {
    throw new QQError('TARGET_REQUIRED', 'Schild benötigt jetzt ein Ziel-Feld (row/col).');
  }
  qqShieldCell(room, teamId, row, col);
}

// ── Comeback (before Phase 3) ─────────────────────────────────────────────────
export function qqTriggerComeback(room: QQRoomState): void {
  const territories = computeTerritories(room.grid, room.gridSize);
  const lastTeamId  = findLastPlace(territories, room.joinOrder);
  const finalPhase  = room.totalPhases as QQGamePhaseIndex;

  if (!lastTeamId) {
    // No cells placed yet, skip comeback
    qqBeginPhase(room, finalPhase);
    return;
  }

  // Check if all teams are even — skip comeback if gap is 0
  const lastResult  = territories[lastTeamId];
  const allResults  = room.joinOrder.map(id => territories[id]?.largest ?? 0);
  const maxLargest  = Math.max(...allResults);
  if (lastResult && lastResult.largest >= maxLargest) {
    qqBeginPhase(room, finalPhase);
    return;
  }

  // Alle Teams auf dem letzten Platz (Gleichstand bei largest UND total) —
  // spielen das H/L-Mini-Game GEMEINSAM (jeder Richtige = 1 Feld).
  const tiedLastTeams = room.joinOrder.filter(id => {
    const r = territories[id];
    if (!r || !lastResult) return false;
    return r.largest === lastResult.largest && r.total === lastResult.total;
  });

  // Balance-Rechnung: Runden = min(basis vom Gap, cap von tied-Last-Count).
  // 4+ tied last → 0 Runden = komplett skippen (sonst zu viel geklaut).
  const gap = maxLargest - lastResult.largest;
  const rounds = qqComebackHLRounds(gap, tiedLastTeams.length);
  if (rounds === 0) {
    // Kein Comeback ausspielen — direkt ins Finale
    qqBeginPhase(room, finalPhase);
    return;
  }

  // Führende ermitteln (fuer die spaetere Klau-Phase — wird dynamisch
  // nach jedem Klau neu berechnet).
  const leaders = qqComebackComputeLeaders(room, tiedLastTeams);

  // Erstes „Haupt-Comeback-Team" fuer Anzeigezwecke (falls UI nur eins zeigt):
  // nehmen das mit der hoechsten joinOrder-Position. Bei Solo-Last-Team = das
  // eine, bei Tied-Last = alle spielen gleichzeitig.
  const primaryComebackTeam = tiedLastTeams[0];

  room.comebackTeamId       = primaryComebackTeam;
  room.comebackAction       = null;
  room.comebackStealTargets = leaders;
  room.comebackStealsDone   = [];
  room.comebackIntroStep    = 0;
  room.pendingFor           = null;   // waehrend H/L-Intro niemand pending
  room.pendingAction        = 'COMEBACK';
  room.phase                = 'COMEBACK_CHOICE';
  // H/L-Mini-Game-State vorbereiten
  room.comebackHL = {
    rounds,
    round: 0,
    teamIds: tiedLastTeams,
    currentPair: null,
    answers: {},
    answeredThisRound: [],
    correctThisRound: [],
    winnings: Object.fromEntries(tiedLastTeams.map(id => [id, 0])),
    phase: 'intro',
    timerEndsAt: null,
    usedPairIds: [],
    stealQueue: [],
    currentStealer: null,
    currentStealerRemaining: 0,
  };
  room.lastActivityAt = Date.now();
}

/** Berechnet aktuelle Leader-Teams (alle mit maximalem largestConnected,
 *  die NICHT selbst im H/L-Mini-Game sitzen).
 *  Wird beim Setup aufgerufen und nach jedem Klau neu. */
export function qqComebackComputeLeaders(room: QQRoomState, excludeIds: string[]): string[] {
  const t = computeTerritories(room.grid, room.gridSize);
  const exclude = new Set(excludeIds);
  const largestPerTeam = room.joinOrder.map(id => ({ id, largest: t[id]?.largest ?? 0 }));
  const maxL = Math.max(0, ...largestPerTeam.map(x => x.largest));
  if (maxL === 0) return [];
  return largestPerTeam.filter(x => x.largest === maxL && !exclude.has(x.id)).map(x => x.id);
}

/** Startet (oder wechselt zu) die nächste H/L-Frage-Runde.
 *  Waehlt zufaellig ein unbenutztes Paar, setzt Timer, reset Answers. */
export function qqComebackHLStartRound(room: QQRoomState): void {
  const hl = room.comebackHL;
  if (!hl) throw new QQError('INVALID_STATE', 'Kein H/L-State.');
  const pair = qqHLPickPair(hl.usedPairIds);
  hl.currentPair = pair;
  hl.usedPairIds = [...hl.usedPairIds, pair.id];
  hl.answers = {};
  hl.answeredThisRound = [];
  hl.correctThisRound = [];
  hl.phase = 'question';
  const durationMs = (room.comebackHLTimerSec ?? QQ_COMEBACK_HL_TIMER_DEFAULT_SEC) * 1000;
  hl.timerEndsAt = Date.now() + durationMs;
  room.lastActivityAt = Date.now();
}

/** Team gibt seine H/L-Antwort ab. Record-only — Reveal erfolgt separat. */
export function qqComebackHLSubmitAnswer(
  room: QQRoomState,
  teamId: string,
  choice: QQHLChoice
): void {
  const hl = room.comebackHL;
  if (!hl) throw new QQError('INVALID_STATE', 'Kein H/L-State.');
  if (hl.phase !== 'question') throw new QQError('INVALID_STATE', 'H/L gerade nicht aktiv.');
  if (!hl.teamIds.includes(teamId)) {
    throw new QQError('NOT_YOUR_TURN', 'Nur Comeback-Teams duerfen antworten.');
  }
  hl.answers[teamId] = choice;
  if (!hl.answeredThisRound.includes(teamId)) hl.answeredThisRound.push(teamId);
  room.lastActivityAt = Date.now();
}

/** Reveal der aktuellen H/L-Runde: berechnet welche Teams richtig lagen,
 *  aktualisiert Winnings, setzt Phase 'reveal'. */
export function qqComebackHLReveal(room: QQRoomState): void {
  const hl = room.comebackHL;
  if (!hl || !hl.currentPair) throw new QQError('INVALID_STATE', 'Kein H/L-State/Paar.');
  if (hl.phase !== 'question') return; // idempotent
  const correctChoice = qqHLCorrectAnswer(hl.currentPair);
  hl.correctThisRound = hl.teamIds.filter(id => hl.answers[id] === correctChoice);
  for (const id of hl.correctThisRound) {
    hl.winnings[id] = (hl.winnings[id] ?? 0) + 1;
  }
  hl.phase = 'reveal';
  hl.timerEndsAt = null;
  room.lastActivityAt = Date.now();
}

/** Nach dem Reveal: naechste Runde oder - wenn alle Runden gespielt - ueber
 *  in die Klau-Phase. */
export function qqComebackHLAdvance(room: QQRoomState): void {
  const hl = room.comebackHL;
  if (!hl) throw new QQError('INVALID_STATE', 'Kein H/L-State.');
  if (hl.phase !== 'reveal') return;
  const next = hl.round + 1;
  if (next < hl.rounds) {
    hl.round = next;
    qqComebackHLStartRound(room);
    return;
  }
  // Alle Runden gespielt → Steal-Phase setup
  qqComebackStealSetup(room);
}

/** Baut die Steal-Queue: Teams mit Winnings > 0, sortiert nach joinOrder.
 *  Erstes Team wird zum aktuellen Stealer, faehrt in PLACEMENT. */
export function qqComebackStealSetup(room: QQRoomState): void {
  const hl = room.comebackHL;
  if (!hl) throw new QQError('INVALID_STATE', 'Kein H/L-State.');
  // Queue: alle Teams mit >=1 Richtig
  const queue = hl.teamIds
    .filter(id => (hl.winnings[id] ?? 0) > 0)
    .sort((a, b) => room.joinOrder.indexOf(a) - room.joinOrder.indexOf(b));
  hl.stealQueue = queue;
  hl.phase = 'steal';
  if (queue.length === 0) {
    // Kein Team hat richtig geraten → direkt Finale
    qqComebackFinishAllAndGoToFinale(room);
    return;
  }
  qqComebackStealStartNext(room);
}

/** Pop das naechste Team aus der Queue und richtet den Steal-Zug ein. */
export function qqComebackStealStartNext(room: QQRoomState): void {
  const hl = room.comebackHL;
  if (!hl) return;
  const next = hl.stealQueue.shift();
  if (!next) {
    qqComebackFinishAllAndGoToFinale(room);
    return;
  }
  hl.currentStealer = next;
  hl.currentStealerRemaining = hl.winnings[next] ?? 0;
  // Recompute Leaders (ohne alle HL-Teams, damit tied-lasts sich nicht gegenseitig klauen)
  const leaders = qqComebackComputeLeaders(room, hl.teamIds);
  room.comebackStealTargets = leaders;
  room.comebackStealsDone = [];
  if (leaders.length === 0 || hl.currentStealerRemaining === 0) {
    // Kein Leader zum Klauen → direkt weiter
    qqComebackStealStartNext(room);
    return;
  }
  // In Klau-Phase: PLACEMENT + pendingFor = stealer
  room.phase             = 'PLACEMENT';
  room.pendingFor        = next;
  room.pendingAction     = 'COMEBACK';
  room.comebackTeamId    = next;
  room.comebackAction    = 'STEAL_1';
  room.teamPhaseStats[next].placementsLeft = hl.currentStealerRemaining;
  // Snapshot pro Team fuer Undo
  room._comebackGridSnapshot  = room.grid.map(r => r.map(c => ({ ...c })));
  room._comebackStatsSnapshot = { placementsLeft: hl.currentStealerRemaining };
  room.lastActivityAt = Date.now();
}

/** Nach einem Klau: dekrementiert Remaining + setzt Pause. Der Moderator muss
 *  Space druecken (qqNextQuestion → qqComebackStealResume), damit das naechste
 *  Feld geklaut werden kann bzw. das naechste Team dran kommt. */
export function qqComebackStealAfterOne(room: QQRoomState): void {
  const hl = room.comebackHL;
  if (!hl || !hl.currentStealer) return;
  hl.currentStealerRemaining = Math.max(0, hl.currentStealerRemaining - 1);
  // placementsLeft wurde vom Caller (qqSteal) bereits dekrementiert.
  // Pause: Team kann nicht weiterklicken, Moderator muss bestaetigen.
  room._comebackStealPaused = true;
  room.pendingFor = null;
  room.lastActivityAt = Date.now();
}

/** Wird vom Moderator-Space (qqNextQuestion) ausgeloest, wenn der Steal-Flow
 *  gerade pausiert. Holt entweder das naechste Feld fuer den selben Stealer,
 *  springt zum naechsten Team in der Queue oder beendet das Comeback. */
export function qqComebackStealResume(room: QQRoomState): void {
  const hl = room.comebackHL;
  if (!hl || !hl.currentStealer) {
    delete room._comebackStealPaused;
    return;
  }
  delete room._comebackStealPaused;

  if (hl.currentStealerRemaining <= 0) {
    qqComebackStealStartNext(room);
    return;
  }
  // Team klaut weiter: Leader-Recompute, weil sich Punktstand veraendert hat.
  const leaders = qqComebackComputeLeaders(room, hl.teamIds);
  room.comebackStealTargets = leaders;
  room.comebackStealsDone = [];
  if (leaders.length === 0) {
    qqComebackStealStartNext(room);
    return;
  }
  // pendingFor zurueck auf den aktuellen Stealer, damit die Klau-Klicks wieder
  // angenommen werden.
  room.pendingFor    = hl.currentStealer;
  room.pendingAction = 'COMEBACK';
  room.phase         = 'PLACEMENT';
  room.lastActivityAt = Date.now();
}

/** Comeback komplett abschliessen und ins Finale wechseln. */
export function qqComebackFinishAllAndGoToFinale(room: QQRoomState): void {
  const finalPhase = room.totalPhases as QQGamePhaseIndex;
  room.comebackHL        = null;
  room.comebackTeamId    = null;
  room.comebackAction    = null;
  room.comebackStealTargets = [];
  room.comebackStealsDone   = [];
  room.pendingFor        = null;
  room.pendingAction     = null;
  delete room._comebackStealPaused;
  qqBeginPhase(room, finalPhase);
}

/** Startet direkt die Klau-Aktion nach dem letzten Intro-Step. Ersetzt die
 *  frühere Dreifach-Wahl (PLACE_2/STEAL_1/SWAP_2). Bei 1 Leader → 2 Felder,
 *  bei ≥2 Leadern → genau 1 Feld von jedem. Das Comeback-Team wählt die
 *  Zellen aus den Territorien der Leader. */
export function qqComebackAutoApplySteal(room: QQRoomState): void {
  assertPhase(room, ['COMEBACK_CHOICE']);
  const teamId = room.comebackTeamId;
  if (!teamId) {
    throw new QQError('INVALID_STATE', 'Kein Comeback-Team gesetzt.');
  }
  const targets = room.comebackStealTargets ?? [];
  if (targets.length === 0) {
    // Kein Leader (z.B. alle gleichauf mit Comeback-Team) → direkt Finalphase
    room.pendingFor    = null;
    room.pendingAction = null;
    qqBeginPhase(room, room.totalPhases as QQGamePhaseIndex);
    return;
  }
  const count = targets.length === 1 ? 2 : targets.length;

  room.comebackAction = 'STEAL_1';
  room.phase          = 'PLACEMENT';
  room.pendingAction  = 'COMEBACK';
  room.pendingFor     = teamId;
  room.teamPhaseStats[teamId].placementsLeft = count;
  room.comebackStealsDone = [];
  // Snapshot grid + stats, damit der Moderator auch nach 1-N Steals noch
  // "Rückgängig" drücken kann (Undo restauriert den Zustand vor dem ersten Klau).
  room._comebackGridSnapshot  = room.grid.map(r => r.map(c => ({ ...c })));
  room._comebackStatsSnapshot = { placementsLeft: count };
  room.lastActivityAt = Date.now();
}

export function qqApplyComebackChoice(
  room: QQRoomState,
  teamId: string,
  action: QQComebackAction
): void {
  assertPhase(room, ['COMEBACK_CHOICE']);
  assertPendingFor(room, teamId);

  room.comebackAction = action;
  room.phase          = 'PLACEMENT';

  if (action === 'PLACE_2') {
    room.pendingAction = 'COMEBACK';
    room.teamPhaseStats[teamId].placementsLeft = 2;
  } else if (action === 'STEAL_1') {
    room.pendingAction = 'COMEBACK';
  } else if (action === 'SWAP_2') {
    room.pendingAction = 'COMEBACK';
    room.swapFirstCell = null;
  }
  room.lastActivityAt = Date.now();
}

/** Undo a comeback action choice — restaures grid + stats via snapshot
 *  if der Moderator während des Klau-Zuges zurücknimmt. Bei der neuen
 *  Auto-Steal-Mechanik heißt Undo: alle in diesem Zug geklauten Felder
 *  zurückgeben und dem Team erneut die Auswahl geben. */
export function qqUndoComebackChoice(room: QQRoomState, teamId: string): void {
  // Waehrend der Steal-Pause ist pendingFor=null → trotzdem Undo zulassen,
  // wenn das Team mit dem Comeback-Team uebereinstimmt.
  const isPausedForTeam = !!room._comebackStealPaused && room.comebackTeamId === teamId;
  if (room.phase !== 'PLACEMENT' || room.pendingAction !== 'COMEBACK') {
    throw new QQError('INVALID_STATE', 'Comeback kann jetzt nicht zurückgenommen werden.');
  }
  if (room.pendingFor !== teamId && !isPausedForTeam) {
    throw new QQError('NOT_YOUR_TURN', 'Nur das Comeback-Team kann zurücknehmen.');
  }
  // Pause beim Undo aufheben: Snapshot-Restore setzt eh die ganze Comeback-Phase neu auf.
  delete room._comebackStealPaused;
  // SWAP_2 already picked first cell?
  if (room.comebackAction === 'SWAP_2' && room.swapFirstCell) {
    room.swapFirstCell = null; // just clear partial swap, let them re-pick within same action
    room.lastActivityAt = Date.now();
    return;
  }

  const stats = room.teamPhaseStats[teamId];

  // Neue Mechanik: Snapshot existiert → auch nach 1-N Klau-Schritten zurückgehen.
  if (room._comebackGridSnapshot) {
    room.grid = room._comebackGridSnapshot.map(r => r.map(c => ({ ...c })));
    updateTerritories(room);
    if (stats && room._comebackStatsSnapshot) {
      stats.placementsLeft = room._comebackStatsSnapshot.placementsLeft;
    }
    room.comebackStealsDone = [];
    delete room._comebackGridSnapshot;
    delete room._comebackStatsSnapshot;
    // Zurück zur COMEBACK_CHOICE-Phase, damit der Moderator die Intro-Schritte
    // erneut durchlaufen kann (Schritt-Index auf 0 zurück).
    room.phase = 'COMEBACK_CHOICE';
    room.comebackAction = null;
    room.comebackIntroStep = 0;
    room.lastActivityAt = Date.now();
    return;
  }

  // Legacy/PLACE_2: blockieren wenn schon gesetzt wurde
  if (room.comebackAction === 'PLACE_2' && stats && stats.placementsLeft < 2) {
    throw new QQError('ALREADY_STARTED', 'Eine Platzierung wurde schon gemacht.');
  }
  // Reset to choice phase so team can pick again
  room.phase = 'COMEBACK_CHOICE';
  room.comebackAction = null;
  if (stats) stats.placementsLeft = 0;
  room.lastActivityAt = Date.now();
}

// ── Phase transitions ─────────────────────────────────────────────────────────
export function qqBeginPhase(room: QQRoomState, phaseIndex: QQGamePhaseIndex): void {
  room.gamePhaseIndex = phaseIndex;
  room.phase          = 'PHASE_INTRO';
  room.introStep      = 0;
  room.questionIndex  = (phaseIndex - 1) * QQ_QUESTIONS_PER_PHASE;
  room.currentQuestion = room.questions[room.questionIndex] ?? null;
  room.revealedAnswer  = null;
  room.correctTeamId   = null;
  room.pendingFor      = null;
  room.pendingAction   = null;
  room.comebackTeamId  = null;
  room.comebackAction  = null;
  room.comebackStealTargets = [];
  room.comebackStealsDone   = [];
  room.comebackHL      = null;
  delete room._comebackStealPaused;
  room.swapFirstCell   = null;
  for (const fc of room.frozenCells) {
    const cell = room.grid[fc.row]?.[fc.col];
    if (cell && !cell.stuck) cell.frozen = false;
  }
  room.frozenCells     = [];
  // Schilde halten bis Spielende (max 2 pro Team) — kein Reset am Phasenende mehr.
  // Bann-TTL läuft pro Frage runter, nicht pro Phase — kein Reset hier.

  // Reset per-phase stats — aber jokersEarned (game-wide) und shieldsUsed (game-wide) erhalten
  for (const id of room.joinOrder) {
    const prev = room.teamPhaseStats[id];
    room.teamPhaseStats[id] = {
      ...emptyPhaseStats(),
      jokersEarned: prev?.jokersEarned ?? 0,
      shieldsUsed:  prev?.shieldsUsed ?? 0,
      stapelsUsed:  prev?.stapelsUsed ?? 0,
    };
  }
  room.lastActivityAt = Date.now();
}

export function qqNextQuestion(room: QQRoomState): void {
  // Comeback-Steal-Pause: zwischen einzelnen Klau-Aktionen wartet das Spiel auf
  // Moderator-Space. Hier weiter zum naechsten Steal/Team — ohne andere Logik.
  if (room._comebackStealPaused) {
    qqComebackStealResume(room);
    return;
  }

  // 4×4-Finale: wenn die Sub-Phase 'done' ist (alle Aktionen platziert), führt
  // Moderator-Space zu GAME_OVER über. Connections-State wird dabei aufgeräumt.
  if (room.phase === 'CONNECTIONS_4X4' && room.connections?.phase === 'done') {
    updateTerritories(room);
    room.connections = null;
    room.phase = 'GAME_OVER';
    return;
  }

  // Double-Press-Guard: Wenn der Moderator Space/„Nächste Frage" doppelt drückt,
  // darf der 2. Call nicht ein zweites Mal Comeback triggern. Phase ist nach dem
  // 1. Call bereits COMEBACK_CHOICE / PHASE_INTRO / GAME_OVER — in diesen Zuständen
  // ist „weiter" nicht die Aufgabe von qqNextQuestion. Stille Rückgabe statt Throw,
  // damit der Client keinen Fehler anzeigt.
  if (room.phase !== 'PLACEMENT' && room.phase !== 'QUESTION_REVEAL') {
    return;
  }

  // Space-Gate nach Comeback: Nach Abschluss der Comeback-Aktion bleibt das Spiel
  // in PLACEMENT (pendingFor=null, comebackTeamId gesetzt). Der Moderator-Space
  // führt hier direkt in die Finalphase – damit die Placement-Animation in Ruhe
  // auslaufen kann, bevor die Runden-Intro startet.
  if (
    !room.pendingFor &&
    room.phase === 'PLACEMENT' &&
    room.comebackTeamId != null &&
    room.comebackAction != null
  ) {
    qqBeginPhase(room, room.totalPhases as QQGamePhaseIndex);
    return;
  }

  // Block if placement is still pending
  const stats = room.pendingFor
    ? room.teamPhaseStats[room.pendingFor]
    : null;
  if (stats && stats.placementsLeft > 0) {
    throw new QQError(
      'PLACEMENT_PENDING',
      `${stats.placementsLeft} Platzierung(en) noch ausstehend.`
    );
  }

  qqStopTimer(room);

  // Persist this question's answers into history BEFORE clearing, so every
  // question (not just the last-of-phase) contributes to summary stats.
  qqFlushQuestionToHistory(room);

  const nextIndex = room.questionIndex + 1;

  // End of phase?
  if (nextIndex >= room.gamePhaseIndex * QQ_QUESTIONS_PER_PHASE) {
    const next = (room.gamePhaseIndex + 1) as QQGamePhaseIndex;
    if (room.gamePhaseIndex >= room.totalPhases) {
      updateTerritories(room);
      // Letzte Quiz-Runde durch — wenn 4×4-Finale aktiviert, springen wir
      // erst dorthin (Sub-Phase 'intro'). Sonst direkt GAME_OVER.
      if (room.connectionsEnabled) {
        qqConnectionsStart(room, QQ_CONNECTIONS_FALLBACK_PAYLOAD, {
          durationSec: room.connectionsTimerSec,
          maxFailedAttempts: room.connectionsMaxFails,
        });
      } else {
        room.phase = 'GAME_OVER';
      }
    } else if (next === room.totalPhases) {
      // Before final phase → comeback
      qqTriggerComeback(room);
    } else {
      qqBeginPhase(room, next);
    }
    return;
  }

  // Einfrieren wirkt genau eine Frage — beim Übergang zur nächsten Frage auftauen.
  for (const fc of room.frozenCells) {
    const cell = room.grid[fc.row]?.[fc.col];
    if (cell && !cell.stuck) cell.frozen = false;
  }
  room.frozenCells = [];

  // Sanduhr-Sperre: Countdown auf allen gesperrten Feldern um 1 reduzieren.
  // Bei TTL=0 wird die Sperre aufgehoben → Feld ist normal leer.
  for (let r = 0; r < room.gridSize; r++) {
    for (let c = 0; c < room.gridSize; c++) {
      const cell = room.grid[r][c];
      if (cell.sandLockTtl && cell.sandLockTtl > 0) {
        cell.sandLockTtl -= 1;
        if (cell.sandLockTtl <= 0) delete cell.sandLockTtl;
      }
    }
  }

  room.questionIndex   = nextIndex;
  room.currentQuestion = room.questions[nextIndex] ?? null;
  room.revealedAnswer  = null;
  room.correctTeamId   = null;
  room.pendingFor      = null;
  room.pendingAction   = null;
  room.answers         = [];
  room.buzzQueue       = [];
  room.hotPotatoActiveTeamId = null;
  room.hotPotatoEliminated   = [];
  room.hotPotatoLastAnswer   = null;
  room.hotPotatoTurnEndsAt   = null;
  if (room._hotPotatoTimerHandle) { clearTimeout(room._hotPotatoTimerHandle); room._hotPotatoTimerHandle = null; }
  room.imposterActiveTeamId  = null;
  room.imposterQueue         = [];
  room.imposterChosenIndices = [];
  room.imposterEliminated    = [];
  delete room._placementQueue;
  room.phase           = 'PHASE_INTRO';
  // Q2+ mit NEUER Kategorie: plain-Reveal überspringen, direkt zur Explanation.
  // So sieht der Mod nicht 2x die gleiche Kategorie-Folie (z.B. MUCHO → MUCHO).
  {
    const q = room.currentQuestion;
    const catKey = q?.category === 'BUNTE_TUETE' && q.bunteTuete
      ? `BUNTE_TUETE:${q.bunteTuete.kind}` : (q?.category ?? '');
    const questionInPhase = room.questionIndex % QQ_QUESTIONS_PER_PHASE;
    const isFirstOfRound = questionInPhase === 0;
    const isNewCat = !!catKey && !room.seenCategories.includes(catKey);
    if (!isFirstOfRound && isNewCat) {
      room.seenCategories.push(catKey);
      room.introStep = 1; // = catRevealStep + 1 (Explanation-Step für q2+)
    } else {
      room.introStep = 0;
    }
  }
  room.lastActivityAt  = Date.now();
}

// ── Joker handling ────────────────────────────────────────────────────────────
// Joker-Pattern: 2x2 Block ODER 4-in-a-row Linie (horizontal/vertikal).
// Beide Patterns geben 1 Bonus-Cell pro Pattern. Cap: QQ_MAX_JOKERS_PER_GAME (=2).
function handleJokerDetection(room: QQRoomState, teamId: string): number {
  const stats = room.teamPhaseStats[teamId];
  // 2026-04-28-Bug-Fix: User-Feedback 'Sterne auf großen Grids ohne dass Joker
  // da war'. Sobald das Team-Cap erreicht ist, keine neuen Joker mehr
  // detektieren UND auch keine Cells mehr markieren — sonst füllt sich das
  // Grid Ende-Game mit „⭐"-Markierungen ohne Belohnung.
  if (stats.jokersEarned >= QQ_MAX_JOKERS_PER_GAME) {
    return 0;
  }

  const newBlocks = detectNewJokers(room.grid, room.gridSize, teamId);
  if (newBlocks.length === 0) return 0;

  const remaining = QQ_MAX_JOKERS_PER_GAME - stats.jokersEarned;
  let toAward = Math.min(newBlocks.length, remaining);

  // Comeback-Place-Cap: max 3 Felder Gesamtgewinn (2 Place + max 1 Joker-Bonus).
  // Ohne diesen Cap könnte ein Team mit 2x2-Joker während Comeback 4 Felder
  // bekommen und vom Letzten direkt auf Platz 1 springen — zu krasser Swing.
  if (room.pendingAction === 'COMEBACK' && room.comebackAction === 'PLACE_2') {
    toAward = Math.min(toAward, 1);
  }

  // Markiere NUR die ersten `toAward` Blocks — Cells über dem Cap sind nicht
  // belohnt und sollen visuell auch nicht als Joker erscheinen.
  for (let i = 0; i < toAward; i++) {
    markJokerCells(room.grid, newBlocks[i].cells);
  }

  stats.jokersEarned += toAward;
  return toAward;
}

// ── Territory update ──────────────────────────────────────────────────────────
function updateTerritories(room: QQRoomState): void {
  const results = computeTerritories(room.grid, room.gridSize);
  for (const id of room.joinOrder) {
    const r = results[id] ?? { total: 0, largest: 0 };
    room.teams[id].totalCells       = r.total;
    room.teams[id].largestConnected = r.largest;
  }
}

// ── Skip current placement (grid voll / Team kann nichts tun) ────────────────
// Öffentlicher Wrapper um finishPlacement: räumt Multi-Slot-Reste auf und
// springt zum nächsten Team in der _placementQueue oder beendet die Runde.
// Wird verwendet, wenn (a) ein Dummy keinen gültigen Zug hat, (b) der Moderator
// per Skip-Button das aktuelle Team überspringt.
export function qqSkipCurrentPlacement(room: QQRoomState): void {
  // Erlaubt regulären PLACEMENT-Skip ODER Connections-Placement-Skip (Finale).
  const isConnPlacement = room.phase === 'CONNECTIONS_4X4' && room.connections?.phase === 'placement';
  if (!isConnPlacement && room.phase !== 'PLACEMENT') return;
  if (!room.pendingFor) return;
  const teamId = room.pendingFor;
  // Multi-Slot-Reste (PLACE_2, Joker-Bonus, pendingMultiSlot) verwerfen,
  // damit finishPlacement nicht in einer halben Runde hängen bleibt.
  const stats = room.teamPhaseStats[teamId];
  if (stats) {
    stats.placementsLeft = 0;
    stats.pendingMultiSlot = 0;
  }
  // Bei Connections-Placement: alle restlichen Slots des aktuellen Teams
  // verwerfen + zum nächsten Team springen.
  if (isConnPlacement && room.connections) {
    room.connections.placementRemaining = 0;
    qqConnectionsAfterPlacement(room);
    return;
  }
  finishPlacement(room);
}

// ── Finish placement & advance ────────────────────────────────────────────────
function finishPlacement(room: QQRoomState): void {
  // Wenn das Comeback fertig ist: NICHT automatisch in die Finalphase wechseln,
  // sondern in PLACEMENT bleiben (mit pendingFor=null), damit der Moderator per
  // Space-Druck die Finalphase auslöst (qqNextQuestion erkennt den Zustand).
  if (room.pendingAction === 'COMEBACK' || room.phase === 'COMEBACK_CHOICE') {
    room.pendingFor    = null;
    room.pendingAction = null;
    room.phase         = 'PLACEMENT';
    // Comeback ist abgeschlossen (oder geskippt) — Snapshot verwerfen,
    // damit ein späterer Undo den Finale-Grid nicht retten kann.
    delete room._comebackGridSnapshot;
    delete room._comebackStatsSnapshot;
    room.lastActivityAt = Date.now();
    return;
  }

  // --- RESET jokerFormed cells of the team that just finished placing ---
  // User-Wunsch 2026-04-28: Sterne sollen direkt nach dem Joker-Placement
  // verschwinden (Avatare wieder sichtbar), nicht erst wenn ALLE Teams done.
  // Wir resetten pro Team das gerade fertig wurde — neue Formationen setzen
  // jokerFormed wieder.
  const justFinishedTeam = room.pendingFor;
  if (justFinishedTeam) {
    const stats = room.teamPhaseStats[justFinishedTeam];
    if (stats && stats.placementsLeft === 0) {
      for (let r = 0; r < room.gridSize; r++) {
        for (let c = 0; c < room.gridSize; c++) {
          if (room.grid[r][c].ownerId === justFinishedTeam) {
            room.grid[r][c].jokerFormed = false;
          }
        }
      }
    }
  }
  // Globaler Fallback: wenn alle Teams fertig sind, ALLE jokerFormed reset.
  const allDone = Object.values(room.teamPhaseStats).every(stats => stats.placementsLeft === 0);
  if (allDone) {
    for (let r = 0; r < room.gridSize; r++) {
      for (let c = 0; c < room.gridSize; c++) {
        room.grid[r][c].jokerFormed = false;
      }
    }
  }

  // Enhanced: If placement queue exists, process next team
  if (room["_placementQueue"] && Array.isArray(room["_placementQueue"])) {
    const next = room["_placementQueue"].shift();
    if (next) {
      room.correctTeamId = next;
      room.pendingFor    = next;
      const action = pendingActionForPhase(room, next);
      room.pendingAction = action;
      if (action === 'PLACE_2') {
        room.teamPhaseStats[next].placementsLeft = 2;
      }
      room.phase = 'PLACEMENT';
      room.lastActivityAt = Date.now();
      return;
    } else {
      // Queue empty, clean up
      delete room["_placementQueue"];
    }
  }

  // Frozen cells bleiben bis zur nächsten Frage sichtbar — Reset passiert in qqNextQuestion.

  // 2026-04-28-Bug-Fix: Wenn wir gerade im Connections-Placement sind, NICHT
  // die Phase auf 'PLACEMENT' überschreiben — sonst geht das Finale-Routing
  // kaputt (qqConnectionsAfterPlacement im Caller setzt pendingFor selbst,
  // hier nichts überschreiben).
  if (room.phase === 'CONNECTIONS_4X4' && room.connections?.phase === 'placement') {
    // pendingFor + pendingAction werden im Caller via qqConnectionsAfterPlacement
    // korrekt für die nächste Aktion / Team gesetzt — hier NICHT nullen.
    room.lastActivityAt = Date.now();
    return;
  }

  room.pendingFor    = null;
  room.pendingAction = null;
  // Stay in PLACEMENT with pendingFor=null so moderator sees "Nächste Frage"
  // (NOT QUESTION_REVEAL — that would loop back to "Felder setzen")
  room.phase         = 'PLACEMENT';
  room.lastActivityAt = Date.now();
}

// ── Broadcast payload builder ─────────────────────────────────────────────────
export function buildQQStateUpdate(room: QQRoomState): QQStateUpdate {
  return {
    roomCode:         room.roomCode,
    phase:            room.phase,
    gamePhaseIndex:   room.gamePhaseIndex,
    questionIndex:    room.questionIndex,
    gridSize:         room.gridSize,
    grid:             room.grid,
    teams:            Object.values(room.teams),
    teamPhaseStats:   room.teamPhaseStats,
    currentQuestion:  room.currentQuestion,
    revealedAnswer:   room.revealedAnswer,
    correctTeamId:    room.correctTeamId,
    currentQuestionWinners: room._currentQuestionWinners ?? [],
    pendingFor:       room.pendingFor,
    pendingAction:    room.pendingAction,
    comebackTeamId:   room.comebackTeamId,
    comebackAction:   room.comebackAction,
    comebackStealTargets: room.comebackStealTargets ?? [],
    comebackStealsDone:   room.comebackStealsDone ?? [],
    comebackStealPaused:  !!room._comebackStealPaused,
    comebackHL:           room.comebackHL ?? null,
    comebackHLTimerSec:   room.comebackHLTimerSec ?? 10,
    connections:          room.connections ?? null,
    connectionsTimerSec:  room.connectionsTimerSec ?? QQ_CONNECTIONS_TIMER_DEFAULT_SEC,
    connectionsMaxFails:  room.connectionsMaxFails ?? QQ_CONNECTIONS_MAX_FAILS_DEFAULT,
    connectionsEnabled:   room.connectionsEnabled ?? true,
    shuffleQuestionsInRound: room.shuffleQuestionsInRound ?? true,
    swapFirstCell:    room.swapFirstCell
      ? { row: room.swapFirstCell.row, col: room.swapFirstCell.col }
      : null,
    language:         room.language,
    timerDurationSec: room.timerDurationSec,
    timerEndsAt:      room.timerEndsAt,
    answers:          room.answers,
    allAnswered:      room.allAnswered,
    buzzQueue:        room.buzzQueue,
    hotPotatoActiveTeamId: room.hotPotatoActiveTeamId,
    hotPotatoEliminated:   room.hotPotatoEliminated,
    hotPotatoLastAnswer:   room.hotPotatoLastAnswer,
    hotPotatoTurnEndsAt:   room.hotPotatoTurnEndsAt,
    hotPotatoUsedAnswers:  room.hotPotatoUsedAnswers,
    hotPotatoAnswerAuthors: room.hotPotatoAnswerAuthors,
    hotPotatoQualified:    room.hotPotatoQualified,
    imposterActiveTeamId:  room.imposterActiveTeamId,
    imposterChosenIndices: room.imposterChosenIndices,
    imposterEliminated:    room.imposterEliminated,
    onlyConnectHintIndices:      room.onlyConnectHintIndices ?? {},
    onlyConnectHintRevealedAt:   room.onlyConnectHintRevealedAt ?? {},
    onlyConnectLockedTeams:      room.onlyConnectLockedTeams ?? [],
    onlyConnectStrikes:          room.onlyConnectStrikes ?? {},
    onlyConnectWinnerTeamId:     room.onlyConnectWinnerTeamId ?? null,
    onlyConnectWinnerHintIdx:    room.onlyConnectWinnerHintIdx ?? null,
    onlyConnectGuesses:          room.onlyConnectGuesses ?? [],
    onlyConnectHintDurationSec:  room.onlyConnectHintDurationSec ?? QQ_ONLY_CONNECT_HINT_DURATION_DEFAULT_SEC,
    bluffPhase:                  room.bluffPhase ?? null,
    bluffWriteEndsAt:            room.bluffWriteEndsAt ?? null,
    bluffVoteEndsAt:             room.bluffVoteEndsAt ?? null,
    bluffSubmissions:            room.bluffSubmissions ?? {},
    bluffOptions:                room.bluffOptions ?? [],
    bluffOptionsByTeam:          room.bluffOptionsByTeam ?? {},
    bluffVotes:                  room.bluffVotes ?? {},
    bluffPoints:                 room.bluffPoints ?? {},
    bluffWriteDurationSec:       room.bluffWriteDurationSec ?? QQ_BLUFF_WRITE_DURATION_DEFAULT_SEC,
    bluffVoteDurationSec:        room.bluffVoteDurationSec ?? QQ_BLUFF_VOTE_DURATION_DEFAULT_SEC,
    bluffModeratorReview:        room.bluffModeratorReview ?? false,
    bluffRejected:               room.bluffRejected ?? [],
    lastPlacedCell:        room.lastPlacedCell,
    frozenCells:      room.frozenCells,
    shieldedCells:    room.shieldedCells,
    stuckCandidates:  [],
    imageRevealed:    room.imageRevealed,
    mapRevealStep:    room.mapRevealStep,
    comebackIntroStep: room.comebackIntroStep,
    muchoRevealStep:  room.muchoRevealStep,
    zvzRevealStep:    room.zvzRevealStep,
    cheeseRevealStep: room.cheeseRevealStep,
    avatarsEnabled:   room.avatarsEnabled,
    totalPhases:      room.totalPhases,
    schedule:         room.questions.map(q => ({
      phase: q.phaseIndex,
      category: q.category,
      bunteTueteKind: q.bunteTuete?.kind,
    })),
    theme:            room.theme,
    draftId:          room.draftId,
    slideTemplates:   room.slideTemplates,
    globalMuted:      room.musicMuted && room.sfxMuted,
    musicMuted:       room.musicMuted,
    sfxMuted:         room.sfxMuted,
    volume:           room.volume,
    soundConfig:      room.soundConfig,
    setupDone:        room.setupDone,
    enable3DTransition: room.enable3DTransition,
    rulesSlideIndex:  room.rulesSlideIndex,
    teamsRevealStartedAt: room.teamsRevealStartedAt,
    introStep:        room.introStep,
    categoryIsNew:    (() => {
      const q = room.currentQuestion;
      if (!q) return false;
      const catKey = q.category === 'BUNTE_TUETE' && q.bunteTuete
        ? `BUNTE_TUETE:${q.bunteTuete.kind}` : q.category;
      // It's "new" if it was just added (i.e. it's in seenCategories but was added for THIS question)
      // Simpler: it's in seenCategories AND the intro is showing the explanation step
      const questionInPhase = room.questionIndex % QQ_QUESTIONS_PER_PHASE;
      const catRevealStep = questionInPhase === 0 ? 2 : 0;
      return room.introStep === catRevealStep + 1 && room.seenCategories.includes(catKey);
    })(),
  };
}

// ── Rules presentation ────────────────────────────────────────────────────────

/** Transition from LOBBY to RULES presentation.
 *  -2 = Willkommen-Folie, -1 = Regel-Intro, 0..= Regel-Folien.
 *  Weiter-Klick erhöht jeweils um 1. */
export function qqStartRules(room: QQRoomState): void {
  assertPhase(room, ['LOBBY']);
  room.phase = 'RULES';
  room.rulesSlideIndex = -2;
  room.lastActivityAt = Date.now();
}

/** Advance to next rules slide (wraps at end). */
export function qqRulesNext(room: QQRoomState): void {
  assertPhase(room, ['RULES']);
  room.rulesSlideIndex += 1;
  room.lastActivityAt = Date.now();
}

/** Go back to previous rules slide.
 *  Untergrenze ist -2 (Willkommen), dann -1 (Regel-Intro), dann 0..
 *  Damit kann der Moderator vollständig zurückspulen. */
export function qqRulesPrev(room: QQRoomState): void {
  assertPhase(room, ['RULES']);
  room.rulesSlideIndex = Math.max(-2, room.rulesSlideIndex - 1);
  room.lastActivityAt = Date.now();
}

// ── Teams reveal (one-time, nach Rules vor Phase 1) ───────────────────────────

/** Start the epic team-reveal animation. Called when moderator finishes rules. */
export function qqStartTeamsReveal(room: QQRoomState): void {
  assertPhase(room, ['RULES']);
  room.phase = 'TEAMS_REVEAL';
  room.teamsRevealStartedAt = Date.now();
  room.lastActivityAt = Date.now();
}

/** Finish teams reveal (auto after animation or moderator-skip) → PHASE_INTRO. */
export function qqFinishTeamsReveal(room: QQRoomState): void {
  assertPhase(room, ['TEAMS_REVEAL']);
  room.phase = 'PHASE_INTRO';
  room.introStep = 0;
  room.teamsRevealStartedAt = null;
  room.lastActivityAt = Date.now();
}

// ── Pause / Resume ───────────────────────────────────────────────────────────

/** Pause the game — stores current phase and pauses ALLE Timer (main question
 *  timer + Hot-Potato-Turn-Timer). Map-Reveal-Auto-Timer wird ebenfalls gestoppt,
 *  aber nicht restauriert — Pins werden einfach ab Resume weiter manuell
 *  getriggert. */
export function qqPause(room: QQRoomState): void {
  if (room.phase === 'PAUSED') return; // already paused
  if (room.phase === 'LOBBY') throw new QQError('WRONG_PHASE', 'Kann in der Lobby nicht pausieren.');
  room._phaseBeforePause = room.phase;
  // Pause Haupt-Timer (Frage-Timer)
  if (room.timerHandle) {
    clearTimeout(room.timerHandle);
    room.timerHandle = null;
    if (room.timerEndsAt) {
      room._timerRemainingMs = Math.max(0, room.timerEndsAt - Date.now());
      room.timerEndsAt = null;
    }
  }
  // Pause Hot-Potato-Turn-Timer (sonst wird Team während Pause auto-eliminiert)
  if (room._hotPotatoTimerHandle) {
    clearTimeout(room._hotPotatoTimerHandle);
    room._hotPotatoTimerHandle = null;
    if (room.hotPotatoTurnEndsAt) {
      room._hotPotatoTurnRemainingMs = Math.max(0, room.hotPotatoTurnEndsAt - Date.now());
      room.hotPotatoTurnEndsAt = null;
    }
  }
  // Pause Map-Reveal-Auto-Timer (Pins stoppen — Moderator triggert weiter nach Resume)
  if (room._mapRevealTimerHandle) {
    clearTimeout(room._mapRevealTimerHandle);
    room._mapRevealTimerHandle = null;
  }
  // Pause Bluff-Write-Timer (sonst springt von write → review/vote während Pause)
  if (room._bluffWriteTimerHandle) {
    clearTimeout(room._bluffWriteTimerHandle);
    room._bluffWriteTimerHandle = null;
    if (room.bluffWriteEndsAt) {
      room._bluffWriteRemainingMs = Math.max(0, room.bluffWriteEndsAt - Date.now());
      room.bluffWriteEndsAt = null;
    }
  }
  // Pause Bluff-Vote-Timer (sonst springt von vote → reveal während Pause)
  if (room._bluffVoteTimerHandle) {
    clearTimeout(room._bluffVoteTimerHandle);
    room._bluffVoteTimerHandle = null;
    if (room.bluffVoteEndsAt) {
      room._bluffVoteRemainingMs = Math.max(0, room.bluffVoteEndsAt - Date.now());
      room.bluffVoteEndsAt = null;
    }
  }
  // Pause Connections-Timer (sonst Auto-Reveal/Lockout während Pause)
  if (room._connectionsTimerHandle) {
    clearTimeout(room._connectionsTimerHandle);
    room._connectionsTimerHandle = null;
    if (room.connections?.endsAt) {
      room._connectionsRemainingMs = Math.max(0, room.connections.endsAt - Date.now());
      room.connections.endsAt = 0;
    }
  }
  room.phase = 'PAUSED';
  room.lastActivityAt = Date.now();
}

/** Resume from pause — restores previous phase and restarts ALLE Timer. */
export function qqResume(room: QQRoomState): void {
  assertPhase(room, ['PAUSED']);
  if (!room._phaseBeforePause) throw new QQError('WRONG_PHASE', 'Keine Phase zum Fortsetzen.');
  room.phase = room._phaseBeforePause;
  room._phaseBeforePause = null;
  // Resume Haupt-Timer
  if (room._timerRemainingMs != null && room._timerRemainingMs > 0 && room._timerOnExpire) {
    const remainMs = room._timerRemainingMs;
    room.timerEndsAt = Date.now() + remainMs;
    const onExpire = room._timerOnExpire;
    room.timerHandle = setTimeout(() => {
      room.timerHandle = null;
      room.timerEndsAt = null;
      room._timerOnExpire = null;
      onExpire();
    }, remainMs);
  }
  delete room._timerRemainingMs;
  // Resume Hot-Potato-Turn-Timer
  if (room._hotPotatoTurnRemainingMs != null && room._hotPotatoTurnRemainingMs > 0 && room._hotPotatoOnExpire) {
    const remainMs = room._hotPotatoTurnRemainingMs;
    room.hotPotatoTurnEndsAt = Date.now() + remainMs;
    const onExpire = room._hotPotatoOnExpire;
    room._hotPotatoTimerHandle = setTimeout(onExpire, remainMs);
  }
  delete room._hotPotatoTurnRemainingMs;
  // Resume Bluff-Write-Timer
  if (room._bluffWriteRemainingMs != null && room._bluffWriteRemainingMs > 0 && room._bluffWriteOnExpire) {
    const remainMs = room._bluffWriteRemainingMs;
    room.bluffWriteEndsAt = Date.now() + remainMs;
    const onExpire = room._bluffWriteOnExpire;
    room._bluffWriteTimerHandle = setTimeout(() => {
      room._bluffWriteTimerHandle = null;
      room._bluffWriteOnExpire = null;
      onExpire();
    }, remainMs);
  }
  delete room._bluffWriteRemainingMs;
  // Resume Bluff-Vote-Timer
  if (room._bluffVoteRemainingMs != null && room._bluffVoteRemainingMs > 0 && room._bluffVoteOnExpire) {
    const remainMs = room._bluffVoteRemainingMs;
    room.bluffVoteEndsAt = Date.now() + remainMs;
    const onExpire = room._bluffVoteOnExpire;
    room._bluffVoteTimerHandle = setTimeout(() => {
      room._bluffVoteTimerHandle = null;
      room._bluffVoteOnExpire = null;
      onExpire();
    }, remainMs);
  }
  delete room._bluffVoteRemainingMs;
  // Resume Connections-Timer
  if (room._connectionsRemainingMs != null && room._connectionsRemainingMs > 0
      && room._connectionsOnExpire && room.connections) {
    const remainMs = room._connectionsRemainingMs;
    room.connections.endsAt = Date.now() + remainMs;
    const onExpire = room._connectionsOnExpire;
    room._connectionsTimerHandle = setTimeout(() => {
      room._connectionsTimerHandle = null;
      room._connectionsOnExpire = null;
      onExpire();
    }, remainMs);
  }
  delete room._connectionsRemainingMs;
  room.lastActivityAt = Date.now();
}

// ── Reset ─────────────────────────────────────────────────────────────────────
export function qqResetRoom(room: QQRoomState): void {
  qqStopTimer(room);
  qqClearHotPotatoTimer(room);
  delete room._placementQueue;
  room.answers         = [];
  room.buzzQueue       = [];
  const gs = room.gridSize;
  room.phase           = 'LOBBY';
  room.setupDone       = false;
  room.gamePhaseIndex  = 1;
  room.questionIndex   = 0;
  room.grid            = buildEmptyGrid(gs);
  room.currentQuestion = null;
  room.revealedAnswer  = null;
  room.correctTeamId   = null;
  room.pendingFor      = null;
  room.pendingAction   = null;
  room.comebackTeamId  = null;
  room.comebackAction  = null;
  room.comebackStealTargets = [];
  room.comebackStealsDone   = [];
  room.comebackHL      = null;
  room.swapFirstCell   = null;
  room.hotPotatoActiveTeamId = null;
  room.hotPotatoEliminated   = [];
  room.hotPotatoUsedAnswers  = [];
  room.hotPotatoAnswerAuthors = [];
  room.imposterActiveTeamId  = null;
  room.imposterQueue         = [];
  room.imposterChosenIndices = [];
  room.imposterEliminated    = [];
  room.lastPlacedCell        = null;
  room.frozenCells           = [];
  for (const row of room.grid) for (const cell of row) cell.shielded = false;
  room.shieldedCells         = [];
  room.imageRevealed         = false;
  room.mapRevealStep         = 0;
  if (room._mapRevealTimerHandle) { clearTimeout(room._mapRevealTimerHandle); room._mapRevealTimerHandle = null; }
  room.comebackIntroStep     = 0;
  room.muchoRevealStep       = 0;
  room.zvzRevealStep         = 0;
  room.cheeseRevealStep      = 0;
  for (const id of room.joinOrder) {
    room.teamPhaseStats[id]       = emptyPhaseStats();
    room.teamTotalSteals[id]      = 0;
    room.teams[id].totalCells     = 0;
    room.teams[id].largestConnected = 0;
  }
  room.totalPhases = 3;
  room.rulesSlideIndex = 0;
  room.teamsRevealStartedAt = null;
  room.seenCategories = [];
  room.questionHistory = [];
  room.funnyAnswers = [];
  room.lastActivityAt = Date.now();
}

// ── Guard helpers ─────────────────────────────────────────────────────────────
function assertPhase(room: QQRoomState, allowed: QQPhase[]): void {
  // 2026-04-28: Connections-Placement-Phase wirkt wie ein PLACEMENT (User-Wunsch
  // Finale-Aktionen = volle Round-4-Menü). Wenn die Funktion PLACEMENT erlaubt,
  // gleiches Verhalten in CONNECTIONS_4X4 + c.phase==='placement'.
  if (allowed.includes('PLACEMENT') &&
      room.phase === 'CONNECTIONS_4X4' &&
      room.connections?.phase === 'placement') {
    return;
  }
  if (!allowed.includes(room.phase)) {
    throw new QQError(
      'WRONG_PHASE',
      `Aktion nicht möglich in Phase "${room.phase}". Erwartet: ${allowed.join(', ')}.`
    );
  }
}

/** Joker-Bonus pendingAction: gibt 1 Aktion der aktuellen Runde — Phase 1 nur
 *  PLACE_1, Phase 2+ FREE wenn Grid frei sonst STEAL_1. */
function jokerBonusAction(room: QQRoomState): NonNullable<QQRoomState['pendingAction']> {
  if (room.gamePhaseIndex === 1) return 'PLACE_1';
  const hasFreeCellNow = room.grid.some(r => r.some(c => c.ownerId === null));
  return hasFreeCellNow ? 'FREE' : 'STEAL_1';
}

function assertTeam(room: QQRoomState, teamId: string): void {
  if (!room.teams[teamId]) {
    throw new QQError('UNKNOWN_TEAM', `Team "${teamId}" nicht gefunden.`);
  }
}

function assertPendingFor(room: QQRoomState, teamId: string): void {
  if (room.pendingFor !== teamId) {
    throw new QQError('NOT_YOUR_TURN', 'Dieses Team ist gerade nicht dran.');
  }
}

function assertValidCoord(room: QQRoomState, row: number, col: number): void {
  if (
    typeof row !== 'number' || typeof col !== 'number' ||
    row < 0 || row >= room.gridSize ||
    col < 0 || col >= room.gridSize
  ) {
    throw new QQError('INVALID_COORD', `Ungültige Koordinate (${row}, ${col}).`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4×4 CONNECTIONS — Finalrunde
// ═══════════════════════════════════════════════════════════════════════════════
// Eigenständige Mini-Game-Phase. Teams jagen parallel: 16 Items in 4×4-Raster,
// 4 Gruppen à 4 Items. Pro gefundene Gruppe = 1 Aktion. Reihenfolge der Aktionen:
// foundCount DESC, dann finishedAt ASC (schnellster zuerst bei Tie).

function clearConnectionsTimer(room: QQRoomState): void {
  if (room._connectionsTimerHandle) {
    clearTimeout(room._connectionsTimerHandle);
    room._connectionsTimerHandle = null;
  }
}

/** Fisher-Yates shuffle für Item-Reihenfolge. */
function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Initialisiert eine Connections-Runde.
 * Übergänge: phase = 'CONNECTIONS_4X4', state.connections.phase = 'intro'.
 * Moderator muss dann advance() rufen, um auf 'active' zu wechseln (Timer-Start).
 */
export function qqConnectionsStart(
  room: QQRoomState,
  payload: import('../../../shared/quarterQuizTypes').QQConnectionsPayload,
  opts?: { durationSec?: number; maxFailedAttempts?: number; onTimeout?: () => void }
): void {
  if (!payload.groups || payload.groups.length !== 4) {
    throw new QQError('CONNECTIONS_INVALID', 'Connections braucht genau 4 Gruppen.');
  }
  for (const g of payload.groups) {
    if (!g.items || g.items.length !== 4) {
      throw new QQError('CONNECTIONS_INVALID', `Gruppe „${g.name}" braucht genau 4 Items.`);
    }
  }

  clearConnectionsTimer(room);

  const allItems = payload.groups.flatMap(g => g.items);
  const itemOrder = payload.itemOrder && payload.itemOrder.length === 16
    ? payload.itemOrder.slice()
    : shuffleArray(allItems);

  const durationSec = opts?.durationSec ?? room.connectionsTimerSec;
  const maxFails = opts?.maxFailedAttempts ?? room.connectionsMaxFails;

  const teamProgress: Record<string, import('../../../shared/quarterQuizTypes').QQConnectionsTeamProgress> = {};
  for (const teamId of room.joinOrder) {
    teamProgress[teamId] = {
      foundGroupIds: [],
      failedAttempts: 0,
      isLockedOut: false,
      selectedItems: [],
      finishedAt: null,
    };
  }

  const now = Date.now();
  room.connections = {
    payload,
    itemOrder,
    durationSec,
    maxFailedAttempts: maxFails,
    startedAt: now,
    endsAt: now + durationSec * 1000,
    teamProgress,
    phase: 'intro',
    placementOrder: [],
    placementCursor: 0,
    placementRemaining: 0,
  };
  room.phase = 'CONNECTIONS_4X4';
  room.lastActivityAt = now;
}

/** Wechselt von 'intro' auf 'active' und startet den Timer. */
export function qqConnectionsBegin(room: QQRoomState, onTimeout: () => void): void {
  const c = room.connections;
  if (!c) throw new QQError('NOT_ACTIVE', 'Keine Connections-Runde aktiv.');
  if (c.phase !== 'intro') throw new QQError('WRONG_SUBPHASE', `Connections-Phase ist „${c.phase}".`);

  const now = Date.now();
  c.startedAt = now;
  c.endsAt = now + c.durationSec * 1000;
  c.phase = 'active';

  clearConnectionsTimer(room);
  room._connectionsOnExpire = onTimeout;
  room._connectionsTimerHandle = setTimeout(() => {
    room._connectionsTimerHandle = null;
    room._connectionsOnExpire = null;
    onTimeout();
  }, c.durationSec * 1000);
  room.lastActivityAt = now;
}

/** Toggle Item-Auswahl beim Team. Max 4 ausgewählt. Locked-out Teams werden ignoriert. */
export function qqConnectionsSelectItem(
  room: QQRoomState,
  teamId: string,
  item: string
): void {
  const c = room.connections;
  if (!c || c.phase !== 'active') return;
  const tp = c.teamProgress[teamId];
  if (!tp || tp.isLockedOut || tp.finishedAt != null) return;
  if (!c.itemOrder.includes(item)) return;
  // Items aus bereits gefundenen Gruppen sind tot
  const usedItems = new Set<string>();
  for (const gid of tp.foundGroupIds) {
    const g = c.payload.groups.find(g => g.id === gid);
    g?.items.forEach(it => usedItems.add(it));
  }
  if (usedItems.has(item)) return;

  const idx = tp.selectedItems.indexOf(item);
  if (idx >= 0) {
    tp.selectedItems.splice(idx, 1);
  } else if (tp.selectedItems.length < 4) {
    tp.selectedItems.push(item);
  }
  room.lastActivityAt = Date.now();
}

/**
 * Submit der aktuellen 4-Item-Auswahl. Returnt das Ergebnis (group | null bei Fail).
 * Bei Treffer: foundGroupIds += group, selectedItems geleert.
 * Bei Fail: failedAttempts++, ggf. lockout.
 */
export function qqConnectionsSubmitGroup(
  room: QQRoomState,
  teamId: string
): { matched: boolean; groupId: string | null; locked: boolean; finished: boolean } {
  const c = room.connections;
  if (!c || c.phase !== 'active') {
    return { matched: false, groupId: null, locked: false, finished: false };
  }
  const tp = c.teamProgress[teamId];
  if (!tp) return { matched: false, groupId: null, locked: false, finished: false };
  if (tp.isLockedOut || tp.finishedAt != null) {
    return { matched: false, groupId: null, locked: true, finished: tp.finishedAt != null };
  }
  if (tp.selectedItems.length !== 4) {
    return { matched: false, groupId: null, locked: false, finished: false };
  }

  // Match? — gibt es eine Gruppe deren Items genau die Auswahl sind?
  const sel = new Set(tp.selectedItems);
  const matchedGroup = c.payload.groups.find(g =>
    !tp.foundGroupIds.includes(g.id) &&
    g.items.length === 4 &&
    g.items.every(it => sel.has(it))
  );

  const now = Date.now();
  room.lastActivityAt = now;

  if (matchedGroup) {
    tp.foundGroupIds.push(matchedGroup.id);
    tp.selectedItems = [];
    const finished = tp.foundGroupIds.length >= 4;
    if (finished) tp.finishedAt = now;
    return { matched: true, groupId: matchedGroup.id, locked: false, finished };
  } else {
    tp.failedAttempts += 1;
    tp.selectedItems = [];
    const locked = tp.failedAttempts >= c.maxFailedAttempts;
    if (locked) {
      tp.isLockedOut = true;
      tp.finishedAt = now;
    }
    return { matched: false, groupId: null, locked, finished: locked };
  }
}

/** Sind alle aktiven Teams fertig (4 Gruppen oder lockout)? */
export function qqConnectionsAllDone(room: QQRoomState): boolean {
  const c = room.connections;
  if (!c) return false;
  for (const teamId of room.joinOrder) {
    if (!room.teams[teamId]?.connected) continue;
    const tp = c.teamProgress[teamId];
    if (!tp) continue;
    if (tp.finishedAt == null) return false;
  }
  return true;
}

/** Übergang active → reveal. Stoppt Timer. */
export function qqConnectionsToReveal(room: QQRoomState): void {
  const c = room.connections;
  if (!c) return;
  clearConnectionsTimer(room);
  c.phase = 'reveal';
  // Teams ohne finishedAt bekommen jetzt einen (= Timer-End-Zeitpunkt).
  const now = Date.now();
  for (const teamId of room.joinOrder) {
    const tp = c.teamProgress[teamId];
    if (tp && tp.finishedAt == null) tp.finishedAt = now;
  }
  // Placement-Order bestimmen: foundCount DESC, finishedAt ASC.
  const sorted = room.joinOrder
    .filter(teamId => room.teams[teamId])
    .map(teamId => ({
      teamId,
      foundCount: c.teamProgress[teamId]?.foundGroupIds.length ?? 0,
      finishedAt: c.teamProgress[teamId]?.finishedAt ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) =>
      (b.foundCount - a.foundCount) || (a.finishedAt - b.finishedAt)
    );
  c.placementOrder = sorted.filter(s => s.foundCount > 0).map(s => s.teamId);
  c.placementCursor = 0;
  c.placementRemaining = c.placementOrder.length > 0
    ? c.teamProgress[c.placementOrder[0]].foundGroupIds.length
    : 0;
  room.lastActivityAt = now;
}

/** Wechsel reveal → placement. Setzt pendingFor auf das Top-Team.
 *  User-Wunsch 2026-04-28: Finale-Aktionen sind volle Round-3/4-Aktionen
 *  (PLACE/STEAL/STAPEL/SANDUHR/SHIELD/SWAP je Phase). pendingAction='FREE'
 *  öffnet das Action-Menü; Helper-Funktionen erlauben jetzt CONNECTIONS_4X4
 *  + c.phase==='placement' wie reguläre PLACEMENT. */
export function qqConnectionsToPlacement(room: QQRoomState): void {
  const c = room.connections;
  if (!c) return;
  c.phase = 'placement';
  if (c.placementOrder.length === 0) {
    // Niemand hat Aktionen verdient → direkt zu done.
    c.phase = 'done';
    room.pendingFor = null;
    room.pendingAction = null;
    return;
  }
  room.pendingFor = c.placementOrder[0];
  // Phase 1 hat technisch keine STEAL/STAPEL — aber Connections findet erst
  // nach Phase 4 statt, also FREE ist hier safe.
  room.pendingAction = 'FREE';
  c.placementCursor = 0;
  c.placementRemaining = c.teamProgress[c.placementOrder[0]].foundGroupIds.length;
  room.lastActivityAt = Date.now();
}

/**
 * Aufruf nach jedem Placement während der Connections-Placement-Phase.
 * Dekrementiert remaining und schaltet ggf. zum nächsten Team weiter.
 * Returnt true, wenn alle Aktionen abgearbeitet wurden (→ phase='done').
 */
export function qqConnectionsAfterPlacement(room: QQRoomState): boolean {
  const c = room.connections;
  if (!c || c.phase !== 'placement') return false;
  c.placementRemaining -= 1;
  if (c.placementRemaining > 0) {
    // selbes Team setzt nochmal — wieder mit voller Action-Auswahl
    room.pendingFor = c.placementOrder[c.placementCursor];
    room.pendingAction = 'FREE';
    return false;
  }
  // Nächstes Team
  c.placementCursor += 1;
  if (c.placementCursor >= c.placementOrder.length) {
    c.phase = 'done';
    room.pendingFor = null;
    room.pendingAction = null;
    return true;
  }
  const nextTeam = c.placementOrder[c.placementCursor];
  c.placementRemaining = c.teamProgress[nextTeam].foundGroupIds.length;
  room.pendingFor = nextTeam;
  room.pendingAction = 'FREE';
  return false;
}

/** Räumt Connections-State + Timer auf — z.B. nach Phase done oder Reset. */
export function qqConnectionsClear(room: QQRoomState): void {
  clearConnectionsTimer(room);
  room.connections = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4 GEWINNT / Only Connect — BunteTüete Sub-Mechanik
// ═══════════════════════════════════════════════════════════════════════════════
// 4 Hinweise werden nacheinander aufgedeckt. Teams raten Verbindungs-Begriff
// per Freitext. 1 Tipp ist frei, falsch → gesperrt für die Frage.
// Wer richtig liegt: bekommt Teilpunkte (4 bei Hint-1 ... 1 bei Hint-4).
// Auswertung läuft wie bei Top-5: meiste Teilpunkte → Aktion, schnellster bei Tie.

function clearOnlyConnectHintTimer(room: QQRoomState): void {
  if (room._onlyConnectHintTimerHandle) {
    clearTimeout(room._onlyConnectHintTimerHandle);
    room._onlyConnectHintTimerHandle = null;
  }
}

function normalizeOnlyConnectGuess(s: string): string {
  return (s ?? '').trim().toLowerCase();
}

/** Match wie bei CHEESE: case-insensitive, substring/eq. */
function onlyConnectMatches(submitted: string, accepted: string[]): boolean {
  const sub = normalizeOnlyConnectGuess(submitted);
  if (sub.length < 2) return false;
  return accepted.some(c => {
    const cc = normalizeOnlyConnectGuess(c);
    if (!cc) return false;
    return sub === cc || sub.includes(cc) || (cc.length > 3 && cc.includes(sub) && sub.length >= 3);
  });
}

/** Reset onlyConnect-State (z.B. beim Wechsel zur nächsten Frage). */
export function qqOnlyConnectReset(room: QQRoomState): void {
  clearOnlyConnectHintTimer(room);
  room.onlyConnectHintIndices = {};
  room.onlyConnectHintRevealedAt = {};
  room.onlyConnectLockedTeams = [];
  room.onlyConnectStrikes = {};
  room.onlyConnectWinnerTeamId = null;
  room.onlyConnectWinnerHintIdx = null;
  room.onlyConnectGuesses = [];
}

/** Strikes-Limit für 4 gewinnt: nach N falschen Tipps wird das Team gesperrt.
 *  User-Wunsch 2026-04-28: '3 strikes statt 1'. */
export const QQ_ONLY_CONNECT_MAX_STRIKES = 3;

/**
 * Start: jedes verbundene Team beginnt bei Hint-Index 0.
 * Reset zuerst (falls vorherige Frage State hinterlassen hat).
 *
 * 4 gewinnt nutzt seit 2026-04-28 wieder den Standard-Question-Flow:
 * - Question-Timer läuft (qqStartTimer) wie bei Mucho/Schätzchen
 * - Hints werden GLOBAL synchron alle ~timerDurationSec/4 Sekunden
 *   automatisch aufgedeckt (kein Per-Team-Unlock mehr)
 * - Score: 4-atHintIdx Punkte basierend auf globalem Hint-Stand zur
 *   Submit-Zeit
 *
 * onAdvanceTick wird vom Caller geliefert um nach jedem Hint-Advance
 * zu broadcasten.
 */
export function qqOnlyConnectStart(room: QQRoomState, onAdvanceTick?: () => void): void {
  qqOnlyConnectReset(room);
  const now = Date.now();
  for (const teamId of room.joinOrder) {
    if (!room.teams[teamId]) continue;
    room.onlyConnectHintIndices[teamId] = 0;
    room.onlyConnectHintRevealedAt[teamId] = now;
  }
  room.lastActivityAt = now;
  // B2 (2026-04-29): Min-Duration-Gate gegen Insta-End mit Dummies — die
  // Runde darf nicht in <2.5s vorbei sein, sonst sieht der Spieler nichts.
  room._onlyConnectStartedAt = now;

  // Hint-Advance-Timer: nach 1/4 Question-Time → Hint 2, dann 2/4 → Hint 3,
  // 3/4 → Hint 4. Letzter Tick erreicht Index 3 (alle 4 Hints sichtbar).
  // Question-Timer läuft separat und triggert bei Ablauf den standard
  // qq:revealAnswer-Pfad.
  const totalMs = (room.timerDurationSec ?? 30) * 1000;
  const stepMs = Math.max(2000, Math.floor(totalMs / 4)); // mind. 2s zwischen Hints
  let nextStep = 1; // Start bei 0, erster Tick erhöht auf 1
  const tick = (): void => {
    const live = room; // closure
    if (live.phase !== 'QUESTION_ACTIVE') return;
    if (live.currentQuestion?.bunteTuete?.kind !== 'onlyConnect') return;
    if (nextStep > 3) return;
    qqOnlyConnectAdvanceAllTeams(live, nextStep);
    nextStep += 1;
    if (onAdvanceTick) try { onAdvanceTick(); } catch {}
    // Nach Hint-Advance: falls alle Teams schon fertig (z.B. Dummies haben
    // früher locked/correct'd), JETZT AutoFinish — vorher wurde es vom
    // MinHint-Gate blockiert. (2026-04-28 Bug-Fix: Dummies durften nicht mehr
    // in unter 5s die Runde beenden bevor irgendwas sichtbar wurde.)
    if (qqOnlyConnectCanAutoFinish(live)) {
      qqOnlyConnectAutoFinish(live);
      live._onlyConnectHintTimerHandle = null;
      if (onAdvanceTick) try { onAdvanceTick(); } catch {}
      return;
    }
    if (nextStep <= 3) {
      live._onlyConnectHintTimerHandle = setTimeout(tick, stepMs);
    } else {
      live._onlyConnectHintTimerHandle = null;
    }
  };
  room._onlyConnectHintTimerHandle = setTimeout(tick, stepMs);
}

/**
 * Globaler Hint-Advance: setzt ALLE Teams (die noch nicht richtig/gesperrt
 * sind) auf den gegebenen Hint-Index. Wird vom Auto-Timer aufgerufen.
 */
export function qqOnlyConnectAdvanceAllTeams(room: QQRoomState, hintIdx: number): void {
  const idx = Math.max(0, Math.min(3, hintIdx));
  const now = Date.now();
  for (const teamId of room.joinOrder) {
    if (!room.teams[teamId]) continue;
    // Locked-Out / schon korrekte Teams trotzdem mit anheben — sehen die
    // Hints am Beamer eh, aber atHintIdx-Score wurde schon eingefroren.
    room.onlyConnectHintIndices[teamId] = idx;
    room.onlyConnectHintRevealedAt[teamId] = now;
  }
  room.lastActivityAt = now;
}

/**
 * Per-Team Hint-Advance — DEPRECATED seit 2026-04-28.
 * Bleibt für Backward-Compat falls alte Clients noch das Socket triggern,
 * aber rechnet jetzt einfach den globalen Tick weiter (alle Teams synchron).
 */
export function qqOnlyConnectAdvanceTeamHint(room: QQRoomState, _teamId: string): number | null {
  const cur = Math.max(0, Math.min(3, ...Object.values(room.onlyConnectHintIndices ?? { _: 0 })));
  if (cur >= 3) return cur;
  qqOnlyConnectAdvanceAllTeams(room, cur + 1);
  return cur + 1;
}

/** Globaler min-Index across alle Teams — für Beamer-Anzeige (kein Spoiler). */
export function qqOnlyConnectGlobalMinHint(room: QQRoomState): number {
  const values = Object.values(room.onlyConnectHintIndices);
  if (values.length === 0) return 0;
  return Math.min(...values);
}

/**
 * Team submittet einen Tipp. Multi-Winner-Modell:
 * - Mehrere Teams können richtig liegen — jedes hat 1 Versuch.
 * - Falsch → gesperrt für die Frage.
 * - Richtig → in onlyConnectGuesses mit atHintIdx + submittedAt vermerkt.
 *   Mehrere richtige → bei Auswertung sortiert nach (atHintIdx ASC, submittedAt ASC).
 * - onlyConnectWinnerTeamId / WinnerHintIdx werden vom ERSTEN Korrekten gefüllt
 *   (für Beamer-Display) — alle weiteren landen nur in onlyConnectGuesses.
 */
export function qqOnlyConnectSubmitGuess(
  room: QQRoomState,
  teamId: string,
  text: string
): { matched: boolean; locked: boolean; alreadyAnswered: boolean } {
  if (!room.teams[teamId]) {
    return { matched: false, locked: false, alreadyAnswered: false };
  }
  // 1 Versuch pro Team — egal ob locked oder schon richtig
  if (room.onlyConnectLockedTeams.includes(teamId)) {
    return { matched: false, locked: true, alreadyAnswered: true };
  }
  const alreadyCorrect = room.onlyConnectGuesses.some(g => g.teamId === teamId && g.correct);
  if (alreadyCorrect) {
    return { matched: false, locked: false, alreadyAnswered: true };
  }
  const q = room.currentQuestion;
  const oc = q?.bunteTuete?.kind === 'onlyConnect' ? q.bunteTuete : null;
  if (!oc) {
    return { matched: false, locked: false, alreadyAnswered: false };
  }
  const accepted = [
    oc.answer,
    ...(oc.acceptedAnswers ?? []),
    oc.answerEn ?? '',
    ...(oc.acceptedAnswersEn ?? []),
  ].filter(Boolean);
  const isMatch = onlyConnectMatches(text, accepted);
  const now = Date.now();
  // Per-Team-Modell: atHintIdx = der eigene Hint-Stand des Teams
  const atHintIdx = Math.max(0, room.onlyConnectHintIndices[teamId] ?? 0);
  room.onlyConnectGuesses.push({
    teamId, text: String(text ?? '').slice(0, 200),
    correct: isMatch, submittedAt: now, atHintIdx,
  });
  if (isMatch) {
    // Erstes Korrektes setzt die Display-Infos, weitere bleiben „still" und
    // landen nur in onlyConnectGuesses für die Eval.
    if (!room.onlyConnectWinnerTeamId) {
      room.onlyConnectWinnerTeamId = teamId;
      room.onlyConnectWinnerHintIdx = atHintIdx;
    }
    // Timer NICHT mehr clearen — andere Teams können noch tippen.
  } else {
    // Strike erhöhen — erst nach QQ_ONLY_CONNECT_MAX_STRIKES Fehlern locked.
    // (User-Wunsch 2026-04-28: '3 strikes statt 1', mehr Spielzeit pro Team.)
    const before = room.onlyConnectStrikes[teamId] ?? 0;
    room.onlyConnectStrikes[teamId] = before + 1;
    if (room.onlyConnectStrikes[teamId] >= QQ_ONLY_CONNECT_MAX_STRIKES) {
      room.onlyConnectLockedTeams.push(teamId);
    }
  }
  room.lastActivityAt = now;
  const nowLocked = room.onlyConnectLockedTeams.includes(teamId);
  return { matched: isMatch, locked: !isMatch && nowLocked, alreadyAnswered: false };
}

/** True wenn alle verbundenen Teams entweder richtig liegen oder gesperrt sind.
 *  B2 (2026-04-29): Defensive — bei 0 verbundenen Teams NICHT vacuous-true zurueckgeben,
 *  sonst koennte AllDone+MinHint-Combo bei kurzzeitigem disconnect-Glitch AutoFinish triggern. */
export function qqOnlyConnectAllDone(room: QQRoomState): boolean {
  let counted = 0;
  for (const teamId of room.joinOrder) {
    const t = room.teams[teamId];
    if (!t || !t.connected) continue;
    counted++;
    const correct = room.onlyConnectGuesses.some(g => g.teamId === teamId && g.correct);
    const locked = room.onlyConnectLockedTeams.includes(teamId);
    if (!correct && !locked) return false;
  }
  return counted > 0;
}

/** B2 (2026-04-29): Hartes Min-Duration-Gate — Runde darf nicht in unter 2.5s
 *  vorbei sein. Greift falls AllDone+MinHint sofort beide true werden (z.B.
 *  Dummies locken sich gegenseitig schnell ab). User-Wunsch: 'mind. so lange,
 *  dass man was sieht'. */
function onlyConnectMinDurationReached(room: QQRoomState): boolean {
  if (!room._onlyConnectStartedAt) return true; // legacy: kein Gate, falls Feld nie gesetzt
  return Date.now() - room._onlyConnectStartedAt >= 2500;
}

/** Combiner fuer alle AutoFinish-Gates — eine Quelle der Wahrheit. */
export function qqOnlyConnectCanAutoFinish(room: QQRoomState): boolean {
  return qqOnlyConnectAllDone(room)
    && qqOnlyConnectMinHintReached(room)
    && onlyConnectMinDurationReached(room);
}

/** Min-Hint-Gate für AutoFinish: 4 gewinnt darf nicht beendet werden bevor
 *  mindestens Hint 2 (idx=1) sichtbar war — sonst beenden Dummies in einer
 *  reinen Test-Lobby die Runde in 5s und der User sieht nichts. (Bug
 *  2026-04-28: 'runde bricht direkt ab ohne dass jemand gespielt hat'). */
export function qqOnlyConnectMinHintReached(room: QQRoomState): boolean {
  const indices = Object.values(room.onlyConnectHintIndices ?? {});
  if (indices.length === 0) return false;
  return Math.max(...indices) >= 1;
}

/** Moderator-Force-Reveal: setzt ALLE Teams auf Hint 3 (= alle Hinweise sichtbar). */
export function qqOnlyConnectRevealAll(room: QQRoomState): void {
  clearOnlyConnectHintTimer(room);
  const now = Date.now();
  for (const teamId of room.joinOrder) {
    if (!room.teams[teamId]) continue;
    room.onlyConnectHintIndices[teamId] = 3;
    room.onlyConnectHintRevealedAt[teamId] = now;
  }
}

/**
 * Auto-Transition zu QUESTION_REVEAL + markCorrect für onlyConnect-Fragen.
 * Wird aufgerufen wenn alle Teams fertig sind oder der Hint-Timer ausgelaufen
 * ist. Idempotent — nur 1× pro Frage (Phase wechsel verhindert Re-Entry).
 */
export function qqOnlyConnectAutoFinish(room: QQRoomState): void {
  if (room.phase !== 'QUESTION_ACTIVE') return;
  const q = room.currentQuestion;
  if (!q || q.bunteTuete?.kind !== 'onlyConnect') return;
  clearOnlyConnectHintTimer(room);
  // Standard-Reveal-Phase setzen
  room.phase = 'QUESTION_REVEAL';
  const oc = q.bunteTuete;
  const revAns = (room.language === 'en' && oc.answerEn ? oc.answerEn : oc.answer) ?? '';
  room.revealedAnswer = revAns;
  qqStopTimer(room);
  // Mark Winner: alle korrekten Teams in Reihenfolge (atHintIdx ASC, submittedAt ASC)
  const evalResult = evalOnlyConnect(room);
  if (evalResult.winnerTeamIds.length > 0) {
    qqMarkCorrect(room, evalResult.winnerTeamIds);
  }
  room.lastActivityAt = Date.now();
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLUFF (Fibbage-Style) — BunteTüete Sub-Mechanik
// ═══════════════════════════════════════════════════════════════════════════════
// 3 Phasen:
//   write: jedes Team tippt eine plausible Falsch-Antwort.
//   review (optional): Moderator filtert Spam/Beleidigungen raus.
//   vote: Bluffs + echte Antwort gemischt → Teams stimmen ab.
//   reveal: echte Antwort hervorgehoben, Punkte verteilt.
// Punkte (Teilpunkte wie Top5):
//   +2 wenn Team die echte Antwort gewählt hat.
//   +1 für jeden Reinfall auf den eigenen Bluff.
//   +3 Sonderbonus wenn Team versehentlich genau die echte Antwort getippt hat.
// Aktion-Vergabe wie Top5: meiste Teilpunkte → setzt; Tie = alle, schnellster zuerst.

function clearBluffWriteTimer(room: QQRoomState): void {
  if (room._bluffWriteTimerHandle) {
    clearTimeout(room._bluffWriteTimerHandle);
    room._bluffWriteTimerHandle = null;
  }
}
function clearBluffVoteTimer(room: QQRoomState): void {
  if (room._bluffVoteTimerHandle) {
    clearTimeout(room._bluffVoteTimerHandle);
    room._bluffVoteTimerHandle = null;
  }
}
function clearBluffTimers(room: QQRoomState): void {
  clearBluffWriteTimer(room);
  clearBluffVoteTimer(room);
}

function normalizeBluffText(s: string): string {
  return (s ?? '').trim().replace(/\s+/g, ' ');
}

/** Fisher-Yates shuffle und nimm die ersten N Elemente. */
function pickRandomN<T>(arr: T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}
function bluffMatchesReal(submitted: string, real: string, realEn?: string): boolean {
  const sub = normalizeBluffText(submitted).toLowerCase();
  if (sub.length < 1) return false;
  const candidates = [real, realEn ?? ''].map(c => normalizeBluffText(c).toLowerCase()).filter(Boolean);
  return candidates.some(c => c === sub);
}

/** Reset Bluff-State (z.B. beim Frage-Wechsel). */
export function qqBluffReset(room: QQRoomState): void {
  clearBluffTimers(room);
  room.bluffPhase = null;
  room.bluffWriteEndsAt = null;
  room.bluffVoteEndsAt = null;
  room.bluffSubmissions = {};
  room.bluffOptions = [];
  room.bluffOptionsByTeam = {};
  room.bluffVotes = {};
  room.bluffPoints = {};
  room.bluffRejected = [];
}

/** Phase 1 starten: Schreib-Phase. */
export function qqBluffStartWrite(
  room: QQRoomState,
  onWriteTimeout: () => void
): void {
  qqBluffReset(room);
  const now = Date.now();
  room.bluffPhase = 'write';
  room.bluffWriteEndsAt = now + (room.bluffWriteDurationSec ?? QQ_BLUFF_WRITE_DURATION_DEFAULT_SEC) * 1000;
  clearBluffWriteTimer(room);
  room._bluffWriteOnExpire = onWriteTimeout;
  room._bluffWriteTimerHandle = setTimeout(() => {
    room._bluffWriteTimerHandle = null;
    room._bluffWriteOnExpire = null;
    onWriteTimeout();
  }, (room.bluffWriteDurationSec ?? QQ_BLUFF_WRITE_DURATION_DEFAULT_SEC) * 1000);
  room.lastActivityAt = now;
}

/** Team submittet einen Bluff-Text (write phase). */
export function qqBluffSubmit(
  room: QQRoomState,
  teamId: string,
  text: string
): void {
  if (room.bluffPhase !== 'write') return;
  if (!room.teams[teamId]) return;
  const cleaned = normalizeBluffText(text).slice(0, 200);
  if (!cleaned) {
    delete room.bluffSubmissions[teamId];
    return;
  }
  room.bluffSubmissions[teamId] = cleaned;
  room.lastActivityAt = Date.now();
}

/** Sind alle verbundenen Teams mit ihrem Bluff fertig? */
export function qqBluffAllSubmitted(room: QQRoomState): boolean {
  for (const teamId of room.joinOrder) {
    const t = room.teams[teamId];
    if (!t || !t.connected) continue;
    const sub = room.bluffSubmissions[teamId];
    if (!sub || !sub.trim()) return false;
  }
  return true;
}

/**
 * Übergang write → review (wenn moderatorReview an) ODER write → vote.
 * Wird aufgerufen wenn alle eingereicht haben oder Timer abgelaufen ist.
 */
export function qqBluffAdvanceFromWrite(
  room: QQRoomState,
  onVoteTimeout: () => void
): void {
  if (room.bluffPhase !== 'write') return;
  clearBluffWriteTimer(room);
  if (room.bluffModeratorReview) {
    room.bluffPhase = 'review';
    room.lastActivityAt = Date.now();
    return;
  }
  qqBluffEnterVote(room, onVoteTimeout);
}

/** Moderator: nach Review weiter zu Vote. */
export function qqBluffFinishReview(
  room: QQRoomState,
  onVoteTimeout: () => void
): void {
  if (room.bluffPhase !== 'review') return;
  qqBluffEnterVote(room, onVoteTimeout);
}

/** Moderator-Review: einzelnen Bluff ablehnen (zensiert). */
export function qqBluffRejectSubmission(room: QQRoomState, teamId: string): void {
  if (room.bluffPhase !== 'review') return;
  if (!room.bluffRejected.includes(teamId)) {
    room.bluffRejected.push(teamId);
  }
  room.lastActivityAt = Date.now();
}
export function qqBluffUnrejectSubmission(room: QQRoomState, teamId: string): void {
  if (room.bluffPhase !== 'review') return;
  room.bluffRejected = room.bluffRejected.filter(id => id !== teamId);
  room.lastActivityAt = Date.now();
}

/** Vote-Phase aufbauen: Optionen mergen, mit echter Antwort mischen, Timer starten. */
function qqBluffEnterVote(
  room: QQRoomState,
  onVoteTimeout: () => void
): void {
  const q = room.currentQuestion;
  const bt = q?.bunteTuete?.kind === 'bluff' ? q.bunteTuete : null;
  const realDe = bt?.realAnswer ?? q?.answer ?? '';
  const realEn = bt?.realAnswerEn ?? q?.answerEn ?? '';

  // Sammle Bluffs: ignoriere abgelehnte + leere; merge Duplikate (case-insensitive).
  // Bluff = echte Antwort → wird ausgeblendet (truthAccident-Bonus später).
  const bluffsByNormalized = new Map<string, { text: string; contributors: string[] }>();
  for (const teamId of Object.keys(room.bluffSubmissions)) {
    if (room.bluffRejected.includes(teamId)) continue;
    const text = normalizeBluffText(room.bluffSubmissions[teamId]);
    if (!text) continue;
    if (bluffMatchesReal(text, realDe, realEn)) continue;  // truthAccident, kein Bluff-Eintrag
    const key = text.toLowerCase();
    const existing = bluffsByNormalized.get(key);
    if (existing) {
      existing.contributors.push(teamId);
    } else {
      bluffsByNormalized.set(key, { text, contributors: [teamId] });
    }
  }

  // Globaler Pool: real + alle merged Bluffs.
  const allOptions: import('../../../shared/quarterQuizTypes').QQBluffOption[] = [
    { id: 'real', text: realDe, source: 'real', contributors: [] },
  ];
  let nextId = 1;
  for (const { text, contributors } of bluffsByNormalized.values()) {
    allOptions.push({ id: `b${nextId++}`, text, source: 'team', contributors });
  }

  // Per-Team Subset: jedes Team sieht real + 3 zufällige ANDERE Bluffs (nicht
  // den eigenen). Bei wenigen Teams (<4 Bluffs verfügbar) so viele wie möglich.
  const teamBluffs = allOptions.filter(o => o.source === 'team');
  const realOption = allOptions.find(o => o.source === 'real')!;
  const optionsByTeam: Record<string, import('../../../shared/quarterQuizTypes').QQBluffOption[]> = {};
  const SUBSET_SIZE = 4;  // real + 3 weitere
  for (const teamId of room.joinOrder) {
    if (!room.teams[teamId]) continue;
    // Teilnahme-Bluffs: nicht der eigene
    const candidates = teamBluffs.filter(o => !o.contributors.includes(teamId));
    // Random pick min(3, candidates.length)
    const picked = pickRandomN(candidates, SUBSET_SIZE - 1);
    const teamSet = [realOption, ...picked];
    // Shuffle (real-Option soll nicht immer erste sein)
    for (let i = teamSet.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teamSet[i], teamSet[j]] = [teamSet[j], teamSet[i]];
    }
    optionsByTeam[teamId] = teamSet;
  }

  const now = Date.now();
  room.bluffOptions = allOptions;
  room.bluffOptionsByTeam = optionsByTeam;
  room.bluffVotes = {};
  room.bluffPhase = 'vote';
  room.bluffVoteEndsAt = now + (room.bluffVoteDurationSec ?? QQ_BLUFF_VOTE_DURATION_DEFAULT_SEC) * 1000;
  clearBluffVoteTimer(room);
  room._bluffVoteOnExpire = onVoteTimeout;
  room._bluffVoteTimerHandle = setTimeout(() => {
    room._bluffVoteTimerHandle = null;
    room._bluffVoteOnExpire = null;
    onVoteTimeout();
  }, (room.bluffVoteDurationSec ?? QQ_BLUFF_VOTE_DURATION_DEFAULT_SEC) * 1000);
  room.lastActivityAt = now;
}

/** Team votet für eine Option-ID (vote phase). Eigener Bluff verboten. */
export function qqBluffVote(
  room: QQRoomState,
  teamId: string,
  optionId: string
): { ok: boolean; reason?: string } {
  if (room.bluffPhase !== 'vote') return { ok: false, reason: 'WRONG_PHASE' };
  if (!room.teams[teamId]) return { ok: false, reason: 'UNKNOWN_TEAM' };
  // Validate gegen das Team-eigene Subset (oder Fallback auf globalen Pool)
  const teamOpts = room.bluffOptionsByTeam[teamId] ?? room.bluffOptions;
  const opt = teamOpts.find(o => o.id === optionId);
  if (!opt) return { ok: false, reason: 'UNKNOWN_OPTION' };
  if (opt.source === 'team' && opt.contributors.includes(teamId)) {
    return { ok: false, reason: 'OWN_BLUFF' };
  }
  room.bluffVotes[teamId] = optionId;
  room.lastActivityAt = Date.now();
  return { ok: true };
}

/** Sind alle verbundenen Teams mit ihrem Vote fertig? */
export function qqBluffAllVoted(room: QQRoomState): boolean {
  for (const teamId of room.joinOrder) {
    const t = room.teams[teamId];
    if (!t || !t.connected) continue;
    if (!room.bluffVotes[teamId]) return false;
  }
  return true;
}

/** Vote → reveal. Berechnet Teilpunkte. */
export function qqBluffAdvanceFromVote(room: QQRoomState): void {
  if (room.bluffPhase !== 'vote') return;
  clearBluffVoteTimer(room);

  const q = room.currentQuestion;
  const bt = q?.bunteTuete?.kind === 'bluff' ? q.bunteTuete : null;
  const realDe = bt?.realAnswer ?? q?.answer ?? '';
  const realEn = bt?.realAnswerEn ?? q?.answerEn ?? '';

  // Punkte initialisieren
  const points: Record<string, import('../../../shared/quarterQuizTypes').QQBluffPoints> = {};
  for (const teamId of room.joinOrder) {
    if (!room.teams[teamId]) continue;
    points[teamId] = { foundReal: 0, blufferBonus: 0, truthAccident: 0, total: 0 };
  }

  // truthAccident: Teams die genau die echte Antwort getippt hatten
  for (const teamId of Object.keys(room.bluffSubmissions)) {
    const text = room.bluffSubmissions[teamId];
    if (bluffMatchesReal(text, realDe, realEn) && points[teamId]) {
      points[teamId].truthAccident = 3;
    }
  }

  // foundReal: Teams die für die 'real'-Option gevotet haben
  const realOpt = room.bluffOptions.find(o => o.source === 'real');
  if (realOpt) {
    for (const teamId of Object.keys(room.bluffVotes)) {
      if (room.bluffVotes[teamId] === realOpt.id && points[teamId]) {
        points[teamId].foundReal = 2;
      }
    }
  }

  // blufferBonus: für jedes Team-Bluff: jeder Reinfall = +1 für jeden contributor.
  for (const opt of room.bluffOptions) {
    if (opt.source !== 'team') continue;
    let foolCount = 0;
    for (const teamId of Object.keys(room.bluffVotes)) {
      if (room.bluffVotes[teamId] === opt.id && !opt.contributors.includes(teamId)) {
        foolCount += 1;
      }
    }
    if (foolCount === 0) continue;
    // Bei merged Bluffs: jeder contributor bekommt foolCount/contributors.length (gerundet)
    // ABER: User-Spec sagt Punkte teilen. Praxis: jeder bekommt foolCount voll, simpler.
    // Mein Default: foolCount durch contributors teilen, mindestens 1 wenn foolCount > 0.
    const each = Math.max(1, Math.floor(foolCount / opt.contributors.length));
    for (const c of opt.contributors) {
      if (points[c]) points[c].blufferBonus += each;
    }
  }

  // Total
  for (const teamId of Object.keys(points)) {
    const p = points[teamId];
    p.total = p.foundReal + p.blufferBonus + p.truthAccident;
  }

  room.bluffPoints = points;
  room.bluffPhase = 'reveal';
  // Auto-Transition zu QUESTION_REVEAL + markCorrect: das offizielle Phase-
  // Bookkeeping macht die Standard-Pipeline möglich (Placement-Queue, Aktionen,
  // …). Der Beamer rendert weiterhin BluffBeamerView, weil das auf der
  // Frage-kind matched, nicht auf room.phase.
  if (room.phase === 'QUESTION_ACTIVE') {
    room.phase = 'QUESTION_REVEAL';
    const q = room.currentQuestion;
    let revAns = room.language === 'en' && q?.answerEn ? q.answerEn : (q?.answer ?? '');
    if (!revAns && q?.bunteTuete?.kind === 'bluff') {
      revAns = q.bunteTuete.realAnswer ?? '';
    }
    room.revealedAnswer = revAns;
    qqStopTimer(room);
    // Auto-mark Winner: meiste Teilpunkte → Placement-Queue
    const evalResult = evalBluff(room);
    if (evalResult.winnerTeamIds.length > 0) {
      qqMarkCorrect(room, evalResult.winnerTeamIds);
    }
  }
  room.lastActivityAt = Date.now();
}

/** Eval bei QUESTION_REVEAL: meiste Teilpunkte gewinnt; Tie = alle, schnellste zuerst. */
export function evalBluff(room: QQRoomState): { winnerTeamIds: string[]; earnedPoints: Record<string, number> } {
  const points = room.bluffPoints ?? {};
  const teamIds = Object.keys(points);
  if (teamIds.length === 0) return { winnerTeamIds: [], earnedPoints: {} };
  let max = 0;
  for (const id of teamIds) max = Math.max(max, points[id]?.total ?? 0);
  if (max === 0) return { winnerTeamIds: [], earnedPoints: {} };
  const winners = teamIds.filter(id => (points[id]?.total ?? 0) === max);
  const earnedPoints: Record<string, number> = {};
  for (const id of teamIds) earnedPoints[id] = points[id]?.total ?? 0;
  return { winnerTeamIds: winners, earnedPoints };
}


