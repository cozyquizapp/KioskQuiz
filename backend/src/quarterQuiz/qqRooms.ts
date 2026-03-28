// ── Quarter Quiz — Room state & mutations ─────────────────────────────────────

import {
  QQGrid, QQPhase, QQGamePhaseIndex, QQTeam, QQTeamPhaseStats,
  QQQuestion, QQStateUpdate, QQPendingAction, QQComebackAction,
  QQLanguage, QQ_TEAM_PALETTE, QQ_QUESTIONS_PER_PHASE,
  QQ_MAX_STEALS_PER_PHASE, QQ_MAX_JOKERS_PER_PHASE,
  qqGridSize, QQBuzzEntry, QQAnswerEntry,
} from '../../../shared/quarterQuizTypes';
import {
  buildEmptyGrid, computeTerritories, detectNewJokers,
  markJokerCells, findLastPlace,
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
  // Buzz (Hot Potato)
  buzzQueue: QQBuzzEntry[];
  // Settings
  avatarsEnabled: boolean;
  totalPhases: 3 | 4;
  lastActivityAt: number;
}

// ── In-process room map ───────────────────────────────────────────────────────
const qqRooms = new Map<string, QQRoomState>();

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
      buzzQueue: [],
      avatarsEnabled: true,
      totalPhases: 3,
      lastActivityAt: Date.now(),
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
  if (room.phase !== 'LOBBY') {
    throw new QQError('GAME_STARTED', 'Das Spiel hat bereits begonnen.');
  }
  const existingCount = Object.keys(room.teams).length;
  if (existingCount >= 5) {
    throw new QQError('ROOM_FULL', 'Maximale Teamanzahl (5) erreicht.');
  }
  if (room.teams[teamId]) {
    // Rejoin — update avatar/name, keep color
    room.teams[teamId].name      = teamName;
    room.teams[teamId].avatarId  = avatarId;
    room.teams[teamId].connected = true;
    return;
  }
  const colorIndex = existingCount % QQ_TEAM_PALETTE.length;
  room.teams[teamId] = {
    id: teamId,
    name: teamName,
    color: QQ_TEAM_PALETTE[colorIndex],
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
  return { stealsUsed: 0, jokersEarned: 0, placementsLeft: 0 };
}

// ── Game start ────────────────────────────────────────────────────────────────
export function qqStartGame(
  room: QQRoomState,
  questions: QQQuestion[],
  language: QQLanguage,
  phases: 3 | 4 = 3
): void {
  const teamCount = Object.keys(room.teams).length;
  if (teamCount < 2) {
    throw new QQError('NOT_ENOUGH_TEAMS', 'Mindestens 2 Teams erforderlich.');
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
  room.phase          = 'PHASE_INTRO';
  room.currentQuestion = questions[0];
  room.revealedAnswer  = null;
  room.correctTeamId   = null;
  room.pendingFor      = null;
  room.pendingAction   = null;
  room.comebackTeamId  = null;
  room.comebackAction  = null;
  room.swapFirstCell   = null;

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
}

// onExpire is called by the socket handler to broadcast when timer ends
export function qqStartTimer(
  room: QQRoomState,
  onExpire: () => void
): void {
  qqStopTimer(room);
  const durationMs   = room.timerDurationSec * 1000;
  room.timerEndsAt   = Date.now() + durationMs;
  room.timerHandle   = setTimeout(() => {
    room.timerHandle = null;
    room.timerEndsAt = null;
    onExpire();
  }, durationMs);
}

export function qqSetTimerDuration(room: QQRoomState, durationSec: number): void {
  room.timerDurationSec = Math.max(5, Math.min(120, durationSec));
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
  return { allAnswered };
}

export function qqClearAnswers(room: QQRoomState): void {
  room.answers = [];
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
  room.phase          = 'QUESTION_ACTIVE';
  room.revealedAnswer = null;
  room.correctTeamId  = null;
  room.pendingFor     = null;
  room.pendingAction  = null;
  room.answers        = [];
  room.buzzQueue      = [];
  room.lastActivityAt = Date.now();
  qqStartTimer(room, onTimerExpire);
}

export function qqRevealAnswer(room: QQRoomState): void {
  assertPhase(room, ['QUESTION_ACTIVE']);
  qqStopTimer(room);
  const q = room.currentQuestion;
  room.phase          = 'QUESTION_REVEAL';
  room.revealedAnswer = room.language === 'en' && q?.answerEn ? q.answerEn : (q?.answer ?? '');
  room.lastActivityAt = Date.now();
}

export function qqMarkCorrect(room: QQRoomState, teamId: string): void {
  assertPhase(room, ['QUESTION_REVEAL']);
  assertTeam(room, teamId);

  room.correctTeamId = teamId;
  room.pendingFor    = teamId;
  room.phase         = 'PLACEMENT';

  const action = pendingActionForPhase(room, teamId);
  room.pendingAction = action;

  if (action === 'PLACE_2') {
    room.teamPhaseStats[teamId].placementsLeft = 2;
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
  teamId: string
): QQPendingAction {
  if (room.gamePhaseIndex === 1) return 'PLACE_1';
  if (room.gamePhaseIndex === 2) return 'PLACE_2'; // moderator/team may switch to STEAL_1
  return 'FREE'; // Phase 3
}

// ── Phase 3 free-action choice ────────────────────────────────────────────────
export function qqChooseFreeAction(
  room: QQRoomState,
  teamId: string,
  action: 'PLACE' | 'STEAL'
): void {
  assertPhase(room, ['PLACEMENT']);
  assertPendingFor(room, teamId);
  if (room.gamePhaseIndex !== 2 && room.pendingAction !== 'FREE') {
    throw new QQError('WRONG_PHASE', 'Nur in Phase 2 oder 3 wählbar.');
  }
  if (action === 'STEAL') {
    if (room.gamePhaseIndex === 2) {
      const stats = room.teamPhaseStats[teamId];
      if (stats.stealsUsed >= QQ_MAX_STEALS_PER_PHASE) {
        throw new QQError('STEAL_LIMIT', 'Bereits 2× geklaut in dieser Phase.');
      }
    }
    room.pendingAction = 'STEAL_1';
  } else {
    room.pendingAction = room.gamePhaseIndex === 2 ? 'PLACE_2' : 'PLACE_1';
    if (room.gamePhaseIndex === 2) {
      room.teamPhaseStats[teamId].placementsLeft = 2;
    }
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
  const jokersAwarded = handleJokerDetection(room, teamId);
  updateTerritories(room);

  if (action === 'PLACE_2') {
    room.teamPhaseStats[teamId].placementsLeft--;
    if (room.teamPhaseStats[teamId].placementsLeft > 0) {
      // Still need one more placement
      return { jokersAwarded };
    }
  }

  if (action === 'COMEBACK' && room.comebackAction === 'PLACE_2') {
    room.teamPhaseStats[teamId].placementsLeft--;
    if (room.teamPhaseStats[teamId].placementsLeft > 0) {
      return { jokersAwarded };
    }
  }

  // Placement complete — check if we need joker bonus placements
  if (jokersAwarded > 0) {
    // Joker bonus: team gets to place jokersAwarded more free cells
    // We keep pendingFor and set a special joker action
    room.teamPhaseStats[teamId].placementsLeft = jokersAwarded;
    room.pendingAction = 'PLACE_1'; // one at a time
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

  room.comebackTeamId = lastTeamId;
  room.comebackAction = null;
  room.pendingFor     = lastTeamId;
  room.pendingAction  = 'COMEBACK';
  room.phase          = 'COMEBACK_CHOICE';
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

// ── Phase transitions ─────────────────────────────────────────────────────────
export function qqBeginPhase(room: QQRoomState, phaseIndex: QQGamePhaseIndex): void {
  room.gamePhaseIndex = phaseIndex;
  room.phase          = 'PHASE_INTRO';
  room.questionIndex  = (phaseIndex - 1) * QQ_QUESTIONS_PER_PHASE;
  room.currentQuestion = room.questions[room.questionIndex] ?? null;
  room.revealedAnswer  = null;
  room.correctTeamId   = null;
  room.pendingFor      = null;
  room.pendingAction   = null;
  room.comebackTeamId  = null;
  room.comebackAction  = null;
  room.swapFirstCell   = null;

  // Reset per-phase stats
  for (const id of room.joinOrder) {
    room.teamPhaseStats[id] = emptyPhaseStats();
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

  const nextIndex = room.questionIndex + 1;

  // End of phase?
  if (nextIndex >= room.gamePhaseIndex * QQ_QUESTIONS_PER_PHASE) {
    const next = (room.gamePhaseIndex + 1) as QQGamePhaseIndex;
    if (room.gamePhaseIndex >= room.totalPhases) {
      room.phase = 'GAME_OVER';
    } else if (next === room.totalPhases) {
      // Before final phase → comeback
      qqTriggerComeback(room);
    } else {
      qqBeginPhase(room, next);
    }
    return;
  }

  room.questionIndex   = nextIndex;
  room.currentQuestion = room.questions[nextIndex] ?? null;
  room.revealedAnswer  = null;
  room.correctTeamId   = null;
  room.pendingFor      = null;
  room.pendingAction   = null;
  room.phase           = 'QUESTION_ACTIVE';
  room.lastActivityAt  = Date.now();
}

// ── Joker handling ────────────────────────────────────────────────────────────
function handleJokerDetection(room: QQRoomState, teamId: string): number {
  const newBlocks = detectNewJokers(room.grid, room.gridSize, teamId);
  if (newBlocks.length === 0) return 0;

  const stats = room.teamPhaseStats[teamId];
  const remaining = QQ_MAX_JOKERS_PER_PHASE - stats.jokersEarned;
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

  room.pendingFor    = null;
  room.pendingAction = null;
  room.phase         = 'QUESTION_REVEAL'; // Stay on reveal, moderator advances
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
    buzzQueue:        room.buzzQueue,
    avatarsEnabled:   room.avatarsEnabled,
    totalPhases:      room.totalPhases,
  };
}

// ── Reset ─────────────────────────────────────────────────────────────────────
export function qqResetRoom(room: QQRoomState): void {
  qqStopTimer(room);
  room.answers         = [];
  room.buzzQueue       = [];
  const gs = room.gridSize;
  room.phase           = 'LOBBY';
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
  for (const id of room.joinOrder) {
    room.teamPhaseStats[id]       = emptyPhaseStats();
    room.teams[id].totalCells     = 0;
    room.teams[id].largestConnected = 0;
  }
  room.totalPhases = 3;
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
