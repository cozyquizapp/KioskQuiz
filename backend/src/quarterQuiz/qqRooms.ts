// ── Quarter Quiz — Room state & mutations ─────────────────────────────────────

import {
  QQGrid, QQPhase, QQGamePhaseIndex, QQTeam, QQTeamPhaseStats,
  QQQuestion, QQStateUpdate, QQPendingAction, QQComebackAction,
  QQLanguage, QQ_TEAM_PALETTE, QQ_AVATARS, QQ_QUESTIONS_PER_PHASE,
  QQ_MAX_STEALS_PER_PHASE, QQ_MAX_JOKERS_PER_GAME, QQ_MAX_TEAMS,
  qqGridSize, QQBuzzEntry, QQAnswerEntry,
} from '../../../shared/quarterQuizTypes';
import {
  buildEmptyGrid, computeTerritories, detectNewJokers,
  markJokerCells, findLastPlace, detectPlusForStuck,
} from './qqBfs';

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
  questions: QQQuestion[];      // ordered 0-14
  currentQuestion: QQQuestion | null;
  revealedAnswer: string | null;
  correctTeamId: string | null;
  pendingFor: string | null;
  pendingAction: QQPendingAction | null;
  comebackTeamId: string | null;
  comebackAction: QQComebackAction | null;
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
  _hotPotatoTimerHandle: ReturnType<typeof setTimeout> | null;
  // Imposter (oneOfEight) round-robin state
  imposterActiveTeamId: string | null;
  imposterQueue: string[];          // round-robin order
  imposterChosenIndices: number[];  // statement indices already picked (correct ones)
  imposterEliminated: string[];     // teams who picked the false statement
  // CHEESE (Picture This) — moderator-controlled image reveal
  imageRevealed: boolean;
  // CozyGuessr (BUNTE_TUETE kind=map) — moderator-controlled progressive reveal
  // 0 = keine Pins, 1 = Target allein, 2+ = Target + n schlechteste Teams, N+1 = Ranking-Panel
  mapRevealStep: number;
  // Comeback-Erklärung — moderator-gesteuerte Intro-Slides vor den 3 Optionen
  // 0 = Was ist Comeback, 1 = warum DIESES Team, 2 = Optionen zeigen
  comebackIntroStep: number;
  // Last placed cell for beamer animation
  lastPlacedCell: { row: number; col: number; teamId: string; wasSteal?: boolean } | null;
  // Frozen cells (expire after next placement)
  frozenCells: { row: number; col: number }[];
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
  // Sound
  globalMuted: boolean;
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
      qqRooms.delete(code);
    }
  }
}, 10 * 60 * 1000); // check every 10 min

export function getQQRoom(roomCode: string): QQRoomState | undefined {
  return qqRooms.get(roomCode);
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
      questions: [],
      currentQuestion: null,
      revealedAnswer: null,
      correctTeamId: null,
      pendingFor: null,
      pendingAction: null,
      comebackTeamId: null,
      comebackAction: null,
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
      _hotPotatoTimerHandle: null,
      imposterActiveTeamId: null,
      imposterQueue: [],
      imposterChosenIndices: [],
      imposterEliminated: [],
      lastPlacedCell: null,
      frozenCells: [],
      imageRevealed: false,
      mapRevealStep: 0,
      comebackIntroStep: 0,
      _timerOnExpire: null,
      avatarsEnabled: true,
      totalPhases: 3,
      lastActivityAt: Date.now(),
      globalMuted: false,
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
  return { stealsUsed: 0, jokersEarned: 0, placementsLeft: 0, pendingJokerBonus: 0 };
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

  const gs = qqGridSize(teamCount);
  room.gridSize = gs;
  room.grid     = buildEmptyGrid(gs);
  room.questions = questions;
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
  room.currentQuestion = questions[0];
  room.revealedAnswer  = null;
  room.correctTeamId   = null;
  room.pendingFor      = null;
  room.pendingAction   = null;
  room.comebackTeamId  = null;
  room.comebackAction  = null;
  room.swapFirstCell   = null;
  room.theme           = theme;
  room.draftId         = draftId;
  room.draftTitle      = draftTitle;
  room.slideTemplates  = slideTemplates;
  room.soundConfig     = soundConfig;

  // Reset all phase stats
  for (const id of room.joinOrder) {
    room.teamPhaseStats[id] = emptyPhaseStats();
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
  if (!room.currentQuestion || room.answers.length === 0) return;
  const qIdx = room.questionIndex;
  const alreadyPushed = (room.questionHistory as any[]).some(h => h._qIndex === qIdx);
  if (alreadyPushed) return;
  const correctIds = [
    ...(room.correctTeamId ? [room.correctTeamId] : []),
    ...((room['_placementQueue'] as string[] | undefined) ?? []),
  ];
  const uniqueIds = Array.from(new Set(correctIds));
  room.questionHistory.push({
    _qIndex: qIdx,
    questionText: room.currentQuestion.answer ?? room.currentQuestion.text ?? '',
    category: room.currentQuestion.category,
    answers: room.answers.map(a => ({
      teamId: a.teamId,
      teamName: room.teams[a.teamId]?.name ?? a.teamId,
      text: a.text,
      submittedAt: a.submittedAt,
    })),
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
  if (room._hotPotatoTimerHandle) { clearTimeout(room._hotPotatoTimerHandle); room._hotPotatoTimerHandle = null; }
  room.lastActivityAt = Date.now();
  // CHEESE: image + question shown together, so imageRevealed is true immediately
  room.imageRevealed  = room.currentQuestion?.category === 'CHEESE';
  // CozyGuessr (map) reveal — pro Frage bei 0 starten
  room.mapRevealStep  = 0;
  // Hot Potato has its own per-turn timer (hotPotatoTurnEndsAt) — no global question timer
  const isHotPotato = room.currentQuestion?.category === 'BUNTE_TUETE'
    && room.currentQuestion.bunteTuete?.kind === 'hotPotato';
  if (isHotPotato) {
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

// ── SCHAETZCHEN (closest numeric estimate) ────────────────────────────────────
function evalSchaetzchen(room: QQRoomState, q: QQQuestion): QQEvalResult {
  if (q.targetValue == null) return { winnerTeamIds: [], earnedPoints: {} };

  let minDist = Infinity;
  const distMap: Array<{ teamId: string; distance: number }> = [];

  for (const ans of room.answers) {
    const parsed = Number(ans.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
    if (Number.isNaN(parsed)) continue;
    const distance = Math.abs(parsed - q.targetValue);
    distMap.push({ teamId: ans.teamId, distance });
    if (distance < minDist) minDist = distance;
  }

  if (distMap.length === 0) return { winnerTeamIds: [], earnedPoints: {} };

  // All teams at minimum distance win (tie handling)
  const winners = distMap
    .filter(d => d.distance === minDist)
    .map(d => d.teamId);

  return { winnerTeamIds: winners, earnedPoints: {} };
}

// ── CHEESE / Picture This (text match) ───────────────────────────────────────
function evalCheese(room: QQRoomState, q: QQQuestion): QQEvalResult {
  const correctDE = (q.answer ?? '').trim().toLowerCase();
  const correctEN = (q.answerEn ?? '').trim().toLowerCase();
  const correct = new Set<string>([correctDE, correctEN].filter(Boolean));

  const winners: string[] = [];
  for (const ans of room.answers) {
    const submitted = ans.text.trim().toLowerCase();
    if (submitted.length < 2) continue; // too short to be a valid answer
    const matches = [...correct].some(
      c => c && (submitted === c || submitted.includes(c) || (c.length > 3 && c.includes(submitted) && submitted.length >= 3))
    );
    if (matches) winners.push(ans.teamId);
  }

  return { winnerTeamIds: winners, earnedPoints: {} };
}

// ── BUNTE_TUETE (routes to sub-mechanic evaluators) ──────────────────────────
function evalBunteTuete(room: QQRoomState, q: QQQuestion): QQEvalResult {
  const bt = q.bunteTuete;
  if (!bt) return { winnerTeamIds: [], earnedPoints: {} };

  switch (bt.kind) {
    case 'hotPotato':  return { winnerTeamIds: [], earnedPoints: {} }; // handled via hotPotatoCorrect
    case 'oneOfEight': return evalOneOfEight(room, bt as import('../../../shared/quarterQuizTypes').QQBunteTueteOneOfEight);
    case 'top5':       return evalTop5(room, bt as import('../../../shared/quarterQuizTypes').QQBunteTueteTop5);
    case 'order':      return evalOrder(room, bt as import('../../../shared/quarterQuizTypes').QQBunteTueteOrder);
    case 'map':        return evalMap(room, bt as import('../../../shared/quarterQuizTypes').QQBunteTueteMap);
    default:           return { winnerTeamIds: [], earnedPoints: {} };
  }
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
  const correctDE = (bt.answers ?? []).map(s => s.trim().toLowerCase()).filter(Boolean);
  const correctEN = (bt.answersEn ?? []).map(s => s.trim().toLowerCase()).filter(Boolean);
  const allCorrect = new Set([...correctDE, ...correctEN]);

  if (allCorrect.size === 0) return { winnerTeamIds: [], earnedPoints: {} };

  let maxScore = 0;
  const scores: Array<{ teamId: string; score: number }> = [];

  for (const ans of room.answers) {
    const submitted = ans.text.split('|').map(s => s.trim().toLowerCase()).filter(Boolean);
    let score = 0;
    for (const s of submitted) {
      // Check if submitted answer matches any correct answer (partial match)
      const matched = [...allCorrect].some(c => c && (s === c || s.includes(c) || c.includes(s)));
      if (matched) score++;
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
  if (correctOrder.length === 0 || items.length === 0) {
    return { winnerTeamIds: [], earnedPoints: {} };
  }

  // Build the correct sequence of item texts (DE)
  const correctSequence = correctOrder.map(idx => (items[idx] ?? '').trim().toLowerCase());

  let maxScore = 0;
  const scores: Array<{ teamId: string; score: number }> = [];

  for (const ans of room.answers) {
    const submitted = ans.text.split('|').map(s => s.trim().toLowerCase()).filter(Boolean);
    let score = 0;
    for (let i = 0; i < Math.min(submitted.length, correctSequence.length); i++) {
      if (submitted[i] === correctSequence[i]) score++;
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
}

/** Begin a new turn: set deadline + auto-eliminate timer. */
function qqStartHotPotatoTurn(room: QQRoomState, onExpire: () => void): void {
  qqClearHotPotatoTimer(room);
  room.hotPotatoLastAnswer = null;
  room.hotPotatoTurnEndsAt = Date.now() + HOT_POTATO_TURN_SEC * 1000;
  room._hotPotatoTimerHandle = setTimeout(onExpire, HOT_POTATO_TURN_SEC * 1000);
}

/** Start Hot Potato: random first team, then round-robin. */
export function qqHotPotatoStart(room: QQRoomState, onTurnExpire: () => void): void {
  assertPhase(room, ['QUESTION_ACTIVE']);
  room.hotPotatoEliminated = [];
  room.hotPotatoLastAnswer = null;
  room.hotPotatoUsedAnswers = [];
  room.hotPotatoAnswerAuthors = [];
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

function nextRoundRobinTeam(room: QQRoomState): string | null {
  const alive = getAliveTeams(room);
  if (alive.length === 0) return null;
  const currentIdx = alive.indexOf(room.hotPotatoActiveTeamId ?? '');
  const nextIdx = (currentIdx + 1) % alive.length;
  room._hotPotatoRoundRobinIdx = nextIdx;
  return alive[nextIdx];
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
    const sorted = [...teamIdOrList];
    room.correctTeamId = sorted[0];
    room['_placementQueue'] = sorted.slice(1);
  } else {
    assertTeam(room, teamIdOrList);
    room.correctTeamId = teamIdOrList;
    room['_placementQueue'] = [];
  }
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
  if (room.gamePhaseIndex === 1) return 'PLACE_1';
  if (room.gamePhaseIndex === 2) {
    // If no free cells left, force steal
    const hasFreeCell = room.grid.some(row => row.some(cell => cell.ownerId === null));
    if (!hasFreeCell) return 'STEAL_1';
    return 'PLACE_2'; // team may switch to STEAL_1
  }
  return 'FREE'; // Phase 3 & 4: team picks from available actions
}

// ── Phase 2/3/4 free-action choice ───────────────────────────────────────────
export function qqChooseFreeAction(
  room: QQRoomState,
  teamId: string,
  action: 'PLACE' | 'STEAL' | 'FREEZE' | 'SWAP' | 'STAPEL'
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
    if (!hasFreeCell) throw new QQError('NO_FREE_CELL', 'Keine freien Felder mehr.');
    room.pendingAction = 'PLACE_2';
    room.teamPhaseStats[teamId].placementsLeft = 2;

  } else if (action === 'FREEZE') {
    if (room.gamePhaseIndex < 3) throw new QQError('WRONG_PHASE', 'Einfrieren erst ab Phase 3.');
    room.pendingAction = 'FREEZE_1';

  } else if (action === 'SWAP') {
    if (room.gamePhaseIndex < 4) throw new QQError('WRONG_PHASE', 'Tauschen erst ab Phase 4.');
    room.pendingAction = 'SWAP_1';
    room.swapFirstCell = null;

  } else if (action === 'STAPEL') {
    if (room.gamePhaseIndex < 4) throw new QQError('WRONG_PHASE', 'Stucken erst ab Phase 4.');
    const candidates = detectPlusForStuck(room.grid, room.gridSize, teamId);
    if (candidates.length === 0) throw new QQError('NO_PLUS', 'Kein vollständiges Plus vorhanden.');
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
  assertPhase(room, ['PLACEMENT']);
  assertPendingFor(room, teamId);
  assertValidCoord(room, row, col);

  const cell = room.grid[row][col];
  if (cell.ownerId !== null) {
    throw new QQError('CELL_OCCUPIED', 'Dieses Feld ist bereits belegt.');
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

  if (usesMultiSlot) {
    stats.placementsLeft--;
    // Joker während laufender Multi-Slot-Runde: SOFORT platzieren (vor verbleibenden Regulär-Steinen)
    // Die noch offenen Multi-Slot-Placements werden aufgeschoben in pendingMultiSlot.
    if (jokersAwarded > 0) {
      if (stats.placementsLeft > 0) {
        stats.pendingMultiSlot = (stats.pendingMultiSlot ?? 0) + stats.placementsLeft;
      }
      stats.placementsLeft = jokersAwarded;
      room.pendingAction = 'PLACE_1';
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
    room.pendingAction = 'PLACE_1';
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

  cell.ownerId = teamId;
  room.lastPlacedCell = { row, col, teamId, wasSteal: true };
  const jokersAwarded = handleJokerDetection(room, teamId);
  updateTerritories(room);

  if (jokersAwarded > 0) {
    room.teamPhaseStats[teamId].placementsLeft = jokersAwarded;
    room.pendingAction = 'PLACE_1';
    return { jokersAwarded };
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

// ── Phase 4: Stucken (permanent freeze of plus-center) ───────────────────────
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
    throw new QQError('WRONG_ACTION', 'Stucken-Modus nicht aktiv.');
  }
  // Validate plus-form
  const candidates = detectPlusForStuck(room.grid, room.gridSize, teamId);
  if (!candidates.some(c => c.r === row && c.c === col)) {
    throw new QQError('INVALID_PLUS', 'Kein gültiges Plus mit diesem Zentrum.');
  }
  const cell = room.grid[row][col];
  cell.ownerId = teamId;
  cell.stuck   = true;
  cell.frozen  = false; // stuck supersedes frozen
  room.lastPlacedCell = { row, col, teamId, wasSteal: false };
  updateTerritories(room);
  finishPlacement(room);
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

  // Tie for last place? Pick randomly among tied teams
  const tiedTeams = room.joinOrder.filter(id => {
    const r = territories[id];
    if (!r || !lastResult) return false;
    return r.largest === lastResult.largest && r.total === lastResult.total;
  });
  const comebackTeam = tiedTeams.length > 1
    ? tiedTeams[Math.floor(Math.random() * tiedTeams.length)]
    : lastTeamId;

  room.comebackTeamId    = comebackTeam;
  room.comebackAction    = null;
  room.comebackIntroStep = 0;
  room.pendingFor        = comebackTeam;
  room.pendingAction     = 'COMEBACK';
  room.phase             = 'COMEBACK_CHOICE';
  room.lastActivityAt    = Date.now();
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

/** Undo a comeback action choice — only allowed if nothing was executed yet. */
export function qqUndoComebackChoice(room: QQRoomState, teamId: string): void {
  if (room.phase !== 'PLACEMENT' || room.pendingAction !== 'COMEBACK') {
    throw new QQError('INVALID_STATE', 'Comeback kann jetzt nicht zurückgenommen werden.');
  }
  if (room.pendingFor !== teamId) {
    throw new QQError('NOT_YOUR_TURN', 'Nur das Comeback-Team kann zurücknehmen.');
  }
  // PLACE_2 already used one placement? (placementsLeft dropped below 2)
  const stats = room.teamPhaseStats[teamId];
  if (room.comebackAction === 'PLACE_2' && stats && stats.placementsLeft < 2) {
    throw new QQError('ALREADY_STARTED', 'Eine Platzierung wurde schon gemacht.');
  }
  // SWAP_2 already picked first cell?
  if (room.comebackAction === 'SWAP_2' && room.swapFirstCell) {
    room.swapFirstCell = null; // just clear partial swap, let them re-pick within same action
    room.lastActivityAt = Date.now();
    return;
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
  room.swapFirstCell   = null;
  for (const fc of room.frozenCells) {
    const cell = room.grid[fc.row]?.[fc.col];
    if (cell && !cell.stuck) cell.frozen = false;
  }
  room.frozenCells     = [];

  // Reset per-phase stats — but preserve jokersEarned (it's per-game, not per-phase)
  for (const id of room.joinOrder) {
    const prev = room.teamPhaseStats[id];
    room.teamPhaseStats[id] = {
      ...emptyPhaseStats(),
      jokersEarned: prev?.jokersEarned ?? 0,
    };
  }
  room.lastActivityAt = Date.now();
}

export function qqNextQuestion(room: QQRoomState): void {
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
      room.phase = 'GAME_OVER';
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
  room.introStep       = 0;
  room.lastActivityAt  = Date.now();
}

// ── Joker handling ────────────────────────────────────────────────────────────
function handleJokerDetection(room: QQRoomState, teamId: string): number {
  const newBlocks = detectNewJokers(room.grid, room.gridSize, teamId);
  if (newBlocks.length === 0) return 0;

  const stats = room.teamPhaseStats[teamId];
  const remaining = QQ_MAX_JOKERS_PER_GAME - stats.jokersEarned;
  const toAward = Math.min(newBlocks.length, remaining);

  for (let i = 0; i < newBlocks.length; i++) {
    markJokerCells(room.grid, newBlocks[i].r, newBlocks[i].c);
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

// ── Finish placement & advance ────────────────────────────────────────────────
function finishPlacement(room: QQRoomState): void {
  // If this was a comeback action, begin final phase now
  if (room.pendingAction === 'COMEBACK' || room.phase === 'COMEBACK_CHOICE') {
    room.pendingFor    = null;
    room.pendingAction = null;
    qqBeginPhase(room, room.totalPhases as QQGamePhaseIndex);
    return;
  }

  // --- RESET jokerFormed after joker bonus placements/steals are completed ---
  // Only reset if no more bonus placements are pending (placementsLeft == 0 for all teams)
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
    pendingFor:       room.pendingFor,
    pendingAction:    room.pendingAction,
    comebackTeamId:   room.comebackTeamId,
    comebackAction:   room.comebackAction,
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
    imposterActiveTeamId:  room.imposterActiveTeamId,
    imposterChosenIndices: room.imposterChosenIndices,
    imposterEliminated:    room.imposterEliminated,
    lastPlacedCell:        room.lastPlacedCell,
    frozenCells:      room.frozenCells,
    stuckCandidates:  room.pendingAction === 'STAPEL_1' && room.pendingFor
      ? detectPlusForStuck(room.grid, room.gridSize, room.pendingFor).map(c => ({ row: c.r, col: c.c }))
      : [],
    imageRevealed:    room.imageRevealed,
    mapRevealStep:    room.mapRevealStep,
    comebackIntroStep: room.comebackIntroStep,
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
    globalMuted:      room.globalMuted,
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

/** Pause the game — stores current phase and pauses the timer if running. */
export function qqPause(room: QQRoomState): void {
  if (room.phase === 'PAUSED') return; // already paused
  if (room.phase === 'LOBBY') throw new QQError('WRONG_PHASE', 'Kann in der Lobby nicht pausieren.');
  room._phaseBeforePause = room.phase;
  // Pause timer if running (keep timerEndsAt for display but stop the timeout)
  if (room.timerHandle) {
    clearTimeout(room.timerHandle);
    room.timerHandle = null;
    // Store remaining time so we can resume it
    if (room.timerEndsAt) {
      room._timerRemainingMs = Math.max(0, room.timerEndsAt - Date.now());
      room.timerEndsAt = null; // clear so clients don't count down
    }
  }
  room.phase = 'PAUSED';
  room.lastActivityAt = Date.now();
}

/** Resume from pause — restores previous phase and restarts timer if it was running. */
export function qqResume(room: QQRoomState): void {
  assertPhase(room, ['PAUSED']);
  if (!room._phaseBeforePause) throw new QQError('WRONG_PHASE', 'Keine Phase zum Fortsetzen.');
  room.phase = room._phaseBeforePause;
  room._phaseBeforePause = null;
  // Resume timer if there was remaining time
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
  room.imageRevealed         = false;
  room.mapRevealStep         = 0;
  room.comebackIntroStep     = 0;
  for (const id of room.joinOrder) {
    room.teamPhaseStats[id]       = emptyPhaseStats();
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
  if (!allowed.includes(room.phase)) {
    throw new QQError(
      'WRONG_PHASE',
      `Aktion nicht möglich in Phase "${room.phase}". Erwartet: ${allowed.join(', ')}.`
    );
  }
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
