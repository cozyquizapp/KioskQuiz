// ── Quarter Quiz — Socket event handlers ─────────────────────────────────────

import { Server as SocketIOServer } from 'socket.io';
import { saveQQGameResult, getQQRegularTeam, upsertQQRegularTeams, getAllCozyGamesFromDB } from '../db/schemas';
import {
  QQJoinModeratorPayload, QQJoinBeamerPayload, QQJoinTeamPayload,
  QQStartGamePayload, QQRevealAnswerPayload, QQShowImagePayload, QQMarkCorrectPayload,
  QQMarkWrongPayload, QQUndoMarkCorrectPayload, QQPlaceCellPayload, QQStealCellPayload,
  QQChooseFreeActionPayload, QQComebackChoicePayload, QQSwapCellsPayload,
  QQNextQuestionPayload, QQSetLanguagePayload, QQResetRoomPayload,
  QQBuzzInPayload, QQSetTimerPayload, QQSetAvatarsPayload,
  QQSetMutedPayload, QQSetMusicMutedPayload, QQSetSfxMutedPayload, QQSetVolumePayload, QQUpdateSoundConfigPayload, QQSetEnable3DPayload,
  QQSubmitAnswerPayload, QQAck,
  QQFreezeCellPayload, QQStapelCellPayload, QQSwapOneCellPayload,
  QQShieldClusterPayload, QQShieldCellPayload, QQSandLockCellPayload,
  QQStartRulesPayload, QQRulesNextPayload, QQRulesPrevPayload, QQRulesFinishPayload,
  QQStartFinalBettingPayload, QQSubmitFinalBetPayload, QQFinishFinalBettingPayload, QQResolveFinalBetsPayload,
  QQSetFinalWagerEnabledPayload,
  getRandomDummyEmojis,
} from '../../../shared/quarterQuizTypes';
import { scheduleSave, loadAllRooms, deleteSavedRoom } from './qqPersist';
import {
  ensureQQRoom, getQQRoom, insertQQRoom, buildQQStateUpdate, QQError,
  qqJoinTeam, qqSetTeamConnected, qqStartGame, qqActivateQuestion,
  qqRevealAnswer, qqShowImage, qqMarkCorrect, qqMarkWrong, qqUndoMarkCorrect, qqPlaceCell, qqStealCell,
  qqChooseFreeAction, qqApplyComebackChoice, qqComebackAutoApplySteal, qqSwapCells,
  qqComebackHLStartRound, qqComebackHLSubmitAnswer, qqComebackHLReveal, qqComebackHLAdvance,
  qqComebackFinishAllAndGoToFinale,
  qqSwapOneCell, qqFreezeCell, qqStuckCell, qqStapelBonusCell, qqSandLockCell, qqShieldCell,
  qqStartRules, qqRulesNext, qqRulesPrev,
  qqStartTeamsReveal, qqFinishTeamsReveal,
  qqUndoComebackChoice,
  qqAddCoWinner, qqRemoveWinner, qqResolveTieBreaker,
  qqStartTieBreaker, qqTieBreakerAnswer, qqRevealTieBreaker, qqCancelTieBreaker,
  qqNextQuestion, qqResetRoom, qqTriggerComeback, qqPause, qqResume,
  qqBuzzIn, qqClearBuzz, qqSetTimerDuration, qqStopTimer,
  qqSubmitAnswer, qqClearAnswers, qqKickTeam, qqRenameTeam, qqStartPlacement,
  qqAutoEvaluateEstimate, qqEvaluateAnswers,
  qqHotPotatoStart, qqHotPotatoFinishSlot,
  qqHotPotatoEliminate, qqHotPotatoForceEliminate, qqHotPotatoNext, qqHotPotatoSubmitAnswer,
  qqClearHotPotatoTimer, qqHotPotatoMarkQualified, qqHotPotatoCheckWinner,
  qqHotPotatoIsAllAliveDisconnected, qqHotPotatoForceFinishAllDisconnected,
  qqImposterStart, qqImposterChoose, qqImposterForceEliminate,
  qqFlushQuestionToHistory,
  qqSkipCurrentPlacement,
  qqConnectionsStart, qqConnectionsBegin, qqConnectionsSelectItem,
  qqConnectionsSubmitGroup, qqConnectionsAllDone, qqConnectionsToReveal,
  qqConnectionsToPlacement, qqConnectionsAfterPlacement, qqConnectionsClear,
  qqOnlyConnectStart, qqOnlyConnectAdvanceTeamHint, qqOnlyConnectSubmitGuess,
  qqOnlyConnectRevealAll, qqOnlyConnectReset, qqOnlyConnectAllDone,
  qqOnlyConnectAutoFinish, qqOnlyConnectMinHintReached, qqOnlyConnectCanAutoFinish,
  qqBluffStartWrite, qqBluffSubmit, qqBluffAllSubmitted, qqBluffAdvanceFromWrite,
  qqBluffFinishReview, qqBluffRejectSubmission, qqBluffUnrejectSubmission,
  qqBluffVote, qqBluffAllVoted, qqBluffAdvanceFromVote, qqBluffReset,
  qqStartFinalBetting, qqSubmitFinalBet, qqFinishFinalBetting, qqFinishFinalBettingIntro, qqResolveFinalBets, qqUndoLastAction,
  qqFinalRevealPlaceStack,
  qqGoBackSlide,
  qqSetFinalWagerEnabled,
  qqCozyGameStart, qqCozyGameAdvanceFromIntro, qqCozyGameWheelLanded,
  qqCozyGameStartGame, qqCozyGameStopGame, qqCozyGameSelectWinner,
  qqCozyGameAdvanceToPlacement, qqCozyGameCancel,
  qqCozyGameNextSequenceTeam,
  qqCozyGameTimerPause, qqCozyGameTimerResume,
  qqCozyGameTimerReset, qqCozyGameTimerAdjust,
} from './qqRooms';
import {
  QQ_CONNECTIONS_TIMER_MIN_SEC, QQ_CONNECTIONS_TIMER_MAX_SEC,
  QQConnectionsPayload,
} from '../../../shared/quarterQuizTypes';
import { normalizeText, similarityScore } from '../../../shared/textNormalization';
import { pickDummyAction, DummyActionChoice, DummyActionKind } from './qqDummyAI';
import {
  bluffWriteTimeout, bluffVoteTimeout,
  maybeAutoBluffWrite, maybeAutoBluffVote,
} from './qqBluffAI';
import {
  hotPotatoTurnExpiredFor, maybeAutoHotPotato, maybeAutoImposter,
} from './qqHotPotatoAI';
import { maybeAutoConnections, stopConnectionsAiTimers } from './qqConnectionsAI';
import { maybeAutoOnlyConnect, stopOnlyConnectAiTimers } from './qqOnlyConnectAI';
import {
  maybeAutoComebackChoice, scheduleHLAutoReveal, clearHLAutoReveal, maybeDummyAnswerHL,
} from './qqComebackHLAI';
import { maybeAutoFinalBets, maybeAutoSimulateAnswers } from './qqStandardBotAI';

type AckFn = (payload: QQAck) => void;

function ok(ack: unknown): void {
  if (typeof ack === 'function') (ack as AckFn)({ ok: true });
}

function fail(ack: unknown, error: unknown): void {
  if (error instanceof QQError) {
    if (typeof ack === 'function')
      (ack as AckFn)({ ok: false, error: error.message, code: error.code });
  } else {
    console.error('[QQ] Unexpected error:', error);
    if (typeof ack === 'function')
      (ack as AckFn)({ ok: false, error: 'Interner Fehler', code: 'INTERNAL' });
  }
}

// ── Moderator-Auth (Security-Audit 2026-06-13) ──────────────────────────────
// Mod-Socket-Events waren bisher server-seitig UNGESCHUETZT: jeder mit dem
// Raumcode (steht auf dem Beamer) konnte via DevTools qq:startGame/nextQuestion/
// kickTeam/... feuern und das Spiel uebernehmen. Der ADMIN_PIN wurde nur auf den
// REST-Routen geprueft, nie auf einem Socket-Event.
// Fix: ein socket.use-Gate (siehe registerQQHandlers) laesst nur PUBLIC/Team-
// Events fuer nicht-authentifizierte Sockets durch; alles andere braucht
// socket.data.qqIsMod (gesetzt in qq:joinModerator bei korrektem PIN).
const QQ_ADMIN_PIN = process.env.ADMIN_PIN || '2506';

// Events, die JEDER Client (Team-Phone, Beamer, noch-nicht-Mod) senden darf.
// Quelle: alle assertOwnTeam-Events + alle qq:-Events, die die Team-Seite
// (QQTeamPage + CozyQuizTeam*-Komponenten) emittiert + Handshake. Der Beamer
// emittiert NUR joinBeamer. ALLES HIER NICHT GELISTETE ist Mod-only.
// ⚠️ Bei neuen TEAM-Events hier eintragen, sonst werden sie fuer Teams blockiert.
const QQ_PUBLIC_EVENTS = new Set<string>([
  // Handshake / Join
  'qq:ping', 'qq:joinTeam', 'qq:joinBeamer', 'qq:joinModerator', 'qq:lookupRegularTeam',
  // Team-Eingaben (Antwort / Buzzer / Reaktion)
  'qq:submitAnswer', 'qq:revokeAnswer', 'qq:buzzIn', 'qq:reaction',
  // Team-Grid-Aktionen (CozyQuizTeamActionCards)
  'qq:placeCell', 'qq:stealCell', 'qq:chooseFreeAction',
  'qq:sandLockCell', 'qq:shieldCell', 'qq:shieldCluster', 'qq:stapelCell',
  'qq:swapCells', 'qq:swapOneCell', 'qq:freezeCell', 'qq:finalRevealPlaceStack',
  // Minispiele (Team spielt aktiv mit)
  'qq:hotPotatoAnswer', 'qq:imposterChoose',
  'qq:comebackChoice', 'qq:comebackHLAnswer', 'qq:comebackUndo',
  'qq:connectionsSelectItem', 'qq:connectionsSubmit',
  'qq:onlyConnectGuess', 'qq:bluffSubmit', 'qq:bluffVote',
  // Final-Wager (Team tippt)
  'qq:submitFinalBet',
  // Sudden-Death-Stechen (Team tippt MC-Antwort)
  'qq:tiebreakerAnswer',
]);

// 2026-07-04 (Comeback-Auto-Skip): Self-healing Watchdog gegen ein
// eingefrorenes Comeback. Der disconnect-Watchdog (s. socket 'disconnect')
// feuert nur bei einem FRISCHEN disconnect-Event. Laeuft aber die Steal-Queue
// auf ein Team, das SCHON offline war (kein neues disconnect-Event), haengt das
// Spiel bis Wolf manuell F18-skippt. Dieser Hook laeuft bei JEDEM Broadcast:
// ist das aktuelle Comeback-Steal-Team offline, wird nach einer Grace-Periode
// der bestehende Skip-Pfad (qqSkipCurrentPlacement) getriggert. Kaskadiert
// automatisch durch weitere offline Stealer, weil der Skip selbst broadcastet.
// Nur CozyQuiz (Comeback = Grid-Mechanik, in der Arena hart aus).
const COMEBACK_OFFLINE_GRACE_MS = 12000;

function armComebackOfflineWatchdog(io: SocketIOServer, roomCode: string, room: import('./qqRooms').QQRoomState): void {
  const r = room as any;
  const comebackActive = !!room.comebackTeamId || !!room.comebackHL?.currentStealer;
  const pending = room.pendingFor;
  const stuck = !room.largeGroupMode
    && room.phase === 'PLACEMENT'
    && comebackActive
    && !!pending
    && !room.teams[pending]?.connected;

  if (!stuck) {
    // Zustand aufgeloest (reconnect / weiter / Comeback-Ende) → Timer entschaerfen.
    if (r._cbOfflineTimer) { clearTimeout(r._cbOfflineTimer); r._cbOfflineTimer = null; }
    r._cbOfflineArmedFor = null;
    return;
  }
  // Bereits fuer genau dieses Team scharf → Timer weiterlaufen lassen, nicht neu bewaffnen.
  if (r._cbOfflineArmedFor === pending && r._cbOfflineTimer) return;
  if (r._cbOfflineTimer) clearTimeout(r._cbOfflineTimer);
  const armedFor = pending as string;
  r._cbOfflineArmedFor = armedFor;
  r._cbOfflineTimer = setTimeout(() => {
    const cur = getQQRoom(roomCode);
    if (!cur) return;
    const cr = cur as any;
    cr._cbOfflineTimer = null;
    cr._cbOfflineArmedFor = null;
    // Re-Check: immer noch dasselbe offline Team dran?
    if (cur.phase !== 'PLACEMENT' || cur.pendingFor !== armedFor) return;
    if (cur.teams[armedFor]?.connected) return;
    const stillComeback = !!cur.comebackTeamId || !!cur.comebackHL?.currentStealer;
    if (!stillComeback) return;
    console.log('[comeback-offline-watchdog] auto-skipping offline comeback stealer:', armedFor);
    try {
      qqSkipCurrentPlacement(cur);
      broadcast(io, roomCode);  // loest bei weiteren offline Stealern erneut aus
    } catch (err) {
      console.warn('[comeback-offline-watchdog] skip failed:', err);
    }
  }, COMEBACK_OFFLINE_GRACE_MS);
}

// 2026-07-04: Schaetz-Stechen — Auto-Reveal-Timer. Bei Countdown-Ende loest das
// Stechen automatisch auf (naeheste Schaetzung gewinnt). Mod-Space/Reveal cancelt
// implizit (Reveal-Guard); Re-Roll cancelt explizit (arm clear'd zuerst).
function clearTieBreakerRevealTimer(room: import('./qqRooms').QQRoomState): void {
  const r = room as any;
  if (r._tieBreakerTimerHandle) { clearTimeout(r._tieBreakerTimerHandle); r._tieBreakerTimerHandle = null; }
}

function armTieBreakerRevealTimer(io: SocketIOServer, roomCode: string, room: import('./qqRooms').QQRoomState): void {
  clearTieBreakerRevealTimer(room);
  const tb = (room as any).tieBreaker;
  if (!tb || !tb.endsAt) return;
  const ms = Math.max(0, tb.endsAt - Date.now());
  (room as any)._tieBreakerTimerHandle = setTimeout(() => {
    const cur = getQQRoom(roomCode);
    if (!cur) return;
    (cur as any)._tieBreakerTimerHandle = null;
    if (cur.phase !== 'TIEBREAKER_QUESTION') return;
    try {
      qqRevealTieBreaker(cur);
      broadcast(io, roomCode);
    } catch (err) { console.warn('[tiebreaker-timer] reveal failed:', err); }
  }, ms);
}

export function broadcastQQ(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  io.to(roomCode).emit('qq:stateUpdate', buildQQStateUpdate(room));
  armComebackOfflineWatchdog(io, roomCode, room);
  // 2026-05-25 (Wolf-Bug 'bots setzen nicht 0/8'): wenn qqBeginPhase via
  // Auto-Flow nach FINAL_BETTING gewechselt hat, _pendingAutoFinalBets ist
  // gesetzt → maybeAutoFinalBets triggern. Vorher feuerten Bot-Bets nur wenn
  // der Mod manuell qq:startFinalBetting/qq:finishFinalBettingIntro emittierte
  // — der Standard-Flow (letzte Quiz-Frage → Auto-Phase-Wechsel) wurde
  // uebersprungen.
  // 2026-05-25 v2 (Wolf 'bots geben bets ab während des intros'): Bots
  // warten bis Intro-Slide dismissed ist. Pending-Flag bleibt gesetzt
  // wenn intro noch nicht durch — der naechste Broadcast nach
  // qqFinishFinalBettingIntro triggert dann die Bots.
  if ((room as any)._pendingAutoFinalBets && (room as any).finalBettingIntroDone === true) {
    (room as any)._pendingAutoFinalBets = false;
    maybeAutoFinalBets(io, roomCode);
  }
  // 2026-05-24 (Wolf 'spiel von gestern war nicht im recap'): Final-Wager-Pfad
  // (qqAdvanceFinalReveal) wechselt direkt FINAL_REVEAL → THANKS und ueberspringt
  // GAME_OVER. Vorher: persist nur bei GAME_OVER → alle Final-Wager-Spiele (=
  // /teams-Default) wurden nie persistiert. Jetzt: auch THANKS triggert persist.
  // Idempotenz-Guard in persistGameResult (_gameResultPersisted) verhindert
  // Doppel-Saves wenn der Pfad sowohl GAME_OVER als auch THANKS durchlaeuft
  // (Connections-Pfad: GAME_OVER → ... → THANKS).
  if (room.phase === 'GAME_OVER' || room.phase === 'THANKS') persistGameResult(room);
  // Autosave (debounced). Nach GAME_OVER zusaetzlich Snapshot loeschen, damit der
  // naechste Serverstart nicht wieder im Danke-Screen landet.
  if (room.phase === 'GAME_OVER' || room.phase === 'THANKS') {
    deleteSavedRoom(roomCode).catch(() => {});
  } else {
    scheduleSave(room);
  }
}

function broadcast(io: SocketIOServer, roomCode: string): void {
  broadcastQQ(io, roomCode);
}

/**
 * 2026-05-19 (Security-Audit S2): Verhindert Team-Spoofing via Socket.
 * Backend speichert `socket.data.qqTeamId` beim qq:joinTeam-Handshake.
 * Team-Self-Actions (Submit/Buzz/Place/Steal/Bet/HP/Imposter/OnlyConnect)
 * muessen mit dieser ID matchen, sonst koennte Team A via DevTools
 * payload.teamId auf Team B aendern und in dessen Namen agieren.
 *
 * Mod-Actions (markCorrect, kickTeam, etc.) sind hier NICHT geguarded —
 * payload.teamId ist dort das Ziel-Team, nicht der Sender.
 */
function assertOwnTeam(socket: any, payloadTeamId: unknown): void {
  const ownTeamId = socket?.data?.qqTeamId;
  if (!ownTeamId) {
    throw new QQError('NOT_JOINED', 'Du bist keinem Team beigetreten.');
  }
  if (typeof payloadTeamId !== 'string' || payloadTeamId !== ownTeamId) {
    throw new QQError('NOT_YOUR_TEAM', 'Aktion nur für eigenes Team erlaubt.');
  }
}

/**
 * 2026-05-19 (Security-Audit S5): Per-Socket Rate-Limit auf Team-Self-Actions.
 * Verhindert DoS: ein boswilliger Client kann nicht 1000 submitAnswer/Sek
 * spammen. Bucket pro (socket-id, event-name) mit Sliding-Window.
 *
 * Limits sind grosszuegig fuer legit-User (Streamdeck, schnelle Klicks ok),
 * aber blocken offensichtlichen Spam. Bei Limit-Hit: stille Drop, kein Throw —
 * UI bekommt einen Ack-Error, normale Spieler merken's nicht.
 */
const rateLimitBuckets: Map<string, Map<string, number[]>> = new Map();
function assertRateLimit(socket: any, event: string, maxPerSec: number): void {
  const sid = socket?.id;
  if (!sid) return; // kein socket → kein Limit
  let bucket = rateLimitBuckets.get(sid);
  if (!bucket) { bucket = new Map(); rateLimitBuckets.set(sid, bucket); }
  const now = Date.now();
  const cutoff = now - 1000;
  const history = (bucket.get(event) ?? []).filter(ts => ts > cutoff);
  if (history.length >= maxPerSec) {
    throw new QQError('RATE_LIMIT', `Zu viele ${event}-Requests (max ${maxPerSec}/s).`);
  }
  history.push(now);
  bucket.set(event, history);
}
function cleanupRateLimitBucket(socketId: string): void {
  rateLimitBuckets.delete(socketId);
}

// ── Live-Reactions State (in-memory) ──────────────────────────────────────
// Pro Room und Team eine Liste der letzten Reaction-Timestamps fürs Rate-Limit.
// Reines Anti-Spam-Memo, lebt nicht in qqRooms (zu ephemer).
const reactionLog: Record<string, Record<string, number[]>> = {};
const ALLOWED_REACTION_EMOJIS = new Set(['👏', '🔥', '😱', '😢', '🎉', '😂']);

function persistGameResult(room: ReturnType<typeof getQQRoom>): void {
  if (!room) return;
  // 2026-05-25 (Wolf 'mod-test-modus, kein db-save'): Test-Modus-Bypass.
  // Frontend setzt (room as any)._testMode = true ueber qq:setTestMode, damit
  // Test-Spiele nicht im Recap landen.
  if ((room as any)._testMode) return;
  // 2026-05-12 (Wolf 'summary zeigt falsche teams + falsche avatare'):
  // Idempotenz-Guard. Vorher fired persistGameResult auf JEDEN broadcast
  // mit phase=GAME_OVER → mehrere DB-Eintraege pro Spiel, jeder mit eigener
  // ID, und room.lastGameResultId wurde bei jedem Save ueberschrieben.
  // Wenn zwischen Broadcasts das room.teams-State irgendwie verschoben
  // wurde (z.B. team kick, rename mid-recap), konnten spaetere Saves
  // schlechtere Daten enthalten — der QR-Link zeigte dann auf eine
  // schlechtere Version. Jetzt: pro Spiel-Cycle nur EIN Save. Guard wird
  // bei qqStartGame zurueckgesetzt damit das naechste Spiel sauber laeuft.
  if ((room as any)._gameResultPersisted) return;
  (room as any)._gameResultPersisted = true;
  // 2026-05-23 (Live-Test-Bug #C): Bot/Dummy-Teams aus Summary-Persistierung
  // filtern. Vorher landeten _dummy-Teams in der Summary-Page neben den echten
  // Teams → verwirrend nach echtem Quiz. Die Dummies bleiben im Room-State
  // (z.B. fuer Beamer-Render), nur beim DB-Save fuer Summary werden sie raus.
  const teamList = Object.values(room.teams).filter((t: any) => !t._dummy);
  // QQ-Score = largestConnected (verbundene Felder). teamPhaseStats hat KEIN
  // totalScore-Feld — die alte Variante hat deshalb immer 0 gespeichert und
  // damit Highscore/ClosestGame/Leaderboard kaputt gemacht (Winner war oft
  // einfach der erste Team-Eintrag, weil alle Scores 0 waren).
  const scores: Record<string, number> = {};
  teamList.forEach((t: any) => { scores[t.id] = t.largestConnected ?? 0; });
  const sorted = [...teamList].sort((a: any, b: any) =>
    (scores[b.id] ?? 0) - (scores[a.id] ?? 0)
    || ((b.totalCells ?? 0) - (a.totalCells ?? 0))
  );
  const winner = (sorted[0] as any)?.name ?? null;

  // Flush last question's answers into history (covers GAME_OVER / last-of-final-phase)
  qqFlushQuestionToHistory(room);

  // Per-Team Aggregat-Stats für die Summary-Seite.
  // FIX 2026-04-23: vorherige Variante machte Object.values(stats-OBJEKT)
  // (ein Skalar-Stats, KEIN Phase-Map) und summierte v?.jokersEarned auf
  // einzelne Number-Properties → immer 0. Direkter Zugriff stimmt fuer
  // jokersEarned (game-wide, kein Phase-Reset). stealsUsed wird pro Phase
  // resettet → wir nutzen den Lifetime-Counter `room.teamTotalSteals`.
  const teamStats: Record<string, { correct: number; answered: number; jokersEarned: number; stealsUsed: number }> = {};
  for (const t of teamList) {
    const t_: any = t;
    const phaseStats = room.teamPhaseStats[t_.id];
    teamStats[t_.id] = {
      correct: 0,
      answered: 0,
      jokersEarned: phaseStats?.jokersEarned ?? 0,
      stealsUsed:   room.teamTotalSteals[t_.id] ?? 0,
    };
  }
  for (const qh of room.questionHistory) {
    const winners = new Set<string>(
      (qh.correctTeamIds && qh.correctTeamIds.length > 0)
        ? qh.correctTeamIds
        : (qh.correctTeamId ? [qh.correctTeamId] : [])
    );
    for (const a of qh.answers) {
      const s = teamStats[a.teamId];
      if (!s) continue;
      s.answered += 1;
      if (winners.has(a.teamId)) s.correct += 1;
    }
  }

  // 2026-05-07 (Wolf 'ESC-Teams sollen nicht in den All-Tabellen erscheinen'):
  // eurovisionMode-Flag aus dem Theme persistieren — Leaderboard-Endpoint
  // filtert es spaeter raus, Summary nutzt es nicht (per-roomCode-Lookup).
  const eurovisionMode = !!(room.theme as any)?.eurovisionMode;
  // 2026-05-10 (Wolf-Bug 'wenn ein team seinen link teilt, wird der nicht
  // resettet wenn man wieder spielt?'): GameResult-ID jetzt im Room-State
  // ablegen, damit ThanksView den QR-Link mit /summary/by-id/{id} statt nur
  // /summary/{roomCode} bauen kann. SINGLE_SESSION_MODE recycled den
  // RoomCode pro Spiel — ohne by-id-Lookup zeigte ein geteilter Spieler-
  // Link nach dem nächsten Spiel auf das NEUE Spiel statt aufs eigene.
  const gameResultId = `qqr-${room.roomCode}-${Date.now().toString(36)}`;
  (room as any).lastGameResultId = gameResultId;
  const result = {
    id: gameResultId,
    draftId: room.draftId ?? null,
    draftTitle: room.draftTitle ?? 'Unbekannt',
    roomCode: room.roomCode,
    playedAt: Date.now(),
    eurovisionMode,
    teams: teamList.map((t: any) => ({
      // 2026-05-11 (Wolf-Bug 'summary zeigt andere avatare als Quiz'): ALLE
      // Team-Felder spreaden statt cherrypicking. Wolf-Frage: 'kannst du in
      // der summary nicht einfach die gepickten teams verlinken?' — ja, jetzt
      // wird der komplette Team-State zur GAME_OVER-Zeit eingefroren, nicht
      // nur eine subset. Damit wandern auch avatarSetIdOverride / gamesPlayed /
      // wins / connected etc. mit.
      ...t,
      score: scores[t.id] ?? 0,
      totalCells: t.totalCells ?? 0,
      largestConnected: t.largestConnected ?? 0,
      ...teamStats[t.id],
    })),
    winner,
    phases: room.totalPhases,
    language: room.language,
    avatarSetId: room.avatarSetId ?? 'all',   // 2026-05-04: Phase 2 - Set fuer Summary-Render
    themeId: room.themeId ?? 'cozy',           // 2026-06-24: Buehnen-Skin
    // 2026-05-07: Server-gewuerfelte Slot-Emojis fuer 'all'-Set (sonst zeigt
    // die Summary die falschen Slot-Defaults bei reload).
    avatarSetEmojis: (room as any).avatarSetEmojis ?? null,
    grid: room.grid,
    questionHistory: room.questionHistory,
    funnyAnswers: room.funnyAnswers,
    // 2026-05-09 (Wolf-Konsistenz): die 3 End-Awards (Underdog/Meisterklauer/
    // Speedy) ins Save-Payload damit Summary-Page die gleichen Ehrentitel zeigt
    // wie der Recap-Strip am Ende des Spiels.
    endAwards: room.endAwards ?? null,
    // 2026-07-02 (Mega Event): Modus-Flags + 3 Faktions-Awards persistieren,
    // damit Summary/Recap den Groß-Modus sauber erkennen (statt Heuristik) und
    // die Faktions-Awards zeigen können.
    largeGroupMode: (room as any).largeGroupMode ?? false,
    nestedTeams: (room as any).nestedTeams ?? false,
    megaAwards: (room as any).megaAwards ?? null,
  };
  saveQQGameResult(result).catch(() => {/* fire and forget */});

  // 2026-05-02 (Stamm-Team-Code): pro Team gamesPlayed +1, fuer Sieger zusaetzlich
  // wins +1. Sieger respektiert tieBreakerWinnerId — wenn Tie aufgeloest, gewinnt
  // genau ein Team, sonst alle Top-Tied Teams (sind echt gleichauf).
  const tieWinner = (room as any).tieBreakerWinnerId as string | null | undefined;
  let winnerIds: string[] = [];
  if (tieWinner) {
    winnerIds = [tieWinner];
  } else {
    // Standard: alle Teams mit dem gleichen Top-(largest, total)-Score
    const topLargest = sorted[0] ? (scores[(sorted[0] as any).id] ?? 0) : 0;
    const topTotal = sorted[0] ? ((sorted[0] as any).totalCells ?? 0) : 0;
    winnerIds = teamList
      .filter((t: any) => (scores[t.id] ?? 0) === topLargest && (t.totalCells ?? 0) === topTotal)
      .map((t: any) => t.id);
  }
  upsertQQRegularTeams(
    room.roomCode,
    teamList.map((t: any) => ({ id: t.id, name: t.name, avatarId: t.avatarId })),
    winnerIds,
  ).catch(() => {/* fire and forget */});
}

/**
 * Evaluate answers and set correctTeamId + placement queue, but stay in
 * QUESTION_REVEAL. The moderator triggers PLACEMENT separately via
 * qq:startPlacement. This gives players time to see the reveal screen
 * (solution + team answers + winner highlighted) before the grid appears.
 */
function applyAutoEval(room: import('./qqRooms').QQRoomState): void {
  const q = room.currentQuestion;
  if (!q) return;

  // Hot Potato is handled entirely by hotPotatoCorrect/Wrong — skip
  if (q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') return;

  const result = qqEvaluateAnswers(room);
  qqClearBuzz(room);

  // 2026-05-02: Pro-Team-Hits fuer Top5/Order in Room schreiben - Frontend
  // nutzt das fuer korrekte Treffer-Anzeige (sonst weicht UI vom Backend-
  // Score ab bei Schreibfehler-Akzeptanzen).
  if (result.top5HitsByTeam) room.top5HitsByTeam = result.top5HitsByTeam;
  if (result.orderHitsByTeam) room.orderHitsByTeam = result.orderHitsByTeam;

  // Bei mehreren Gewinnern nach Antwortzeit sortieren (schnellstes Team zuerst).
  // Gilt für MUCHO (mehrere richtige Antworten) UND ZEHN_VON_ZEHN (Tiebreak bei
  // gleichem Bet-Max auf die richtige Option).
  // EXKLUSION SCHAETZCHEN: dort ist die Distanz primaer entscheidend, nicht
  // Speed — `evalSchaetzchen` liefert die Liste schon korrekt sortiert
  // (Closest-Tied-Teams nach Speed, danach Secondary-in-Range).
  const sortedWinners = q.category === 'SCHAETZCHEN'
    ? [...result.winnerTeamIds]
    : [...result.winnerTeamIds].sort((a, b) => {
        const aAt = room.answers.find(x => x.teamId === a)?.submittedAt ?? Infinity;
        const bAt = room.answers.find(x => x.teamId === b)?.submittedAt ?? Infinity;
        return aAt - bAt;
      });

  // Snapshot ALLER Winner für Summary-Stats — _placementQueue wird später durch
  // Platzierungen leergeshiftet, daher hier festhalten. Reihenfolge bleibt
  // zeitlich sortiert (wichtig für Top-5 / Recap-Anzeigen).
  room._currentQuestionWinners = sortedWinners;

  if (sortedWinners.length === 1) {
    room.correctTeamId = sortedWinners[0];
  } else if (sortedWinners.length > 1) {
    room.correctTeamId = sortedWinners[0];
    room['_placementQueue'] = sortedWinners.slice(1);
  }
  // No winner: correctTeamId stays null — moderator can manually mark or mark wrong
}

// ── Dummy-Team Automation ────────────────────────────────────────────────────
// Wenn Dummy-Teams im Raum sind, sollen sie automatisch antworten und Felder
// platzieren — keine manuellen Dev-Buttons nötig. Trigger läuft nach jedem
// relevanten Phasenwechsel.

function hasDummyTeams(room: import('./qqRooms').QQRoomState): boolean {
  return Object.values(room.teams).some((t: any) => t._dummy);
}

function isDummy(room: import('./qqRooms').QQRoomState, teamId: string | null | undefined): boolean {
  if (!teamId) return false;
  return !!(room.teams as any)[teamId]?._dummy;
}

// 2026-05-24 (Refactor #3.6): pickDummyAnswer in qqStandardBotAI.ts


/**
 * 2026-05-02 (Persistence-Audit P-2): Nach Server-Restart sind alle onExpire-
 * Closures null — qqPersist verwirft Funktionen beim Save (Replacer in
 * SKIP_KEYS), beim Rehydrate sind sie weg. qqResume restartet Timer aber nur
 * wenn Closure existiert. Folge: nach Restart laufen Auto-Reveals tot, Mod
 * muss alles manuell durchklicken.
 *
 * Diese Helper-Funktion baut die Closures phasenabhaengig neu BEVOR qqResume
 * aufgerufen wird. Idempotent — fuer Pre-Restart-Resumes (Closure noch da)
 * passiert nichts. Sie spiegelt die Closures aus den jeweiligen Activate-/
 * Begin-Pfaden.
 */
function reattachClosuresAfterRestart(
  io: SocketIOServer,
  room: ReturnType<typeof getQQRoom>,
  roomCode: string,
): void {
  if (!room) return;
  if (room.phase !== 'PAUSED') return;

  // Standard-Frage-Timer (QUESTION_ACTIVE/REVEAL/PLACEMENT/COMEBACK_CHOICE/CONNECTIONS_4X4)
  if (room._timerRemainingMs && room._timerRemainingMs > 0 && !room._timerOnExpire) {
    room._timerOnExpire = () => broadcast(io, roomCode);
  }

  // Hot Potato Turn-Timer
  if (room._hotPotatoTurnRemainingMs && room._hotPotatoTurnRemainingMs > 0
      && !room._hotPotatoOnExpire
      && room.currentQuestion?.bunteTuete?.kind === 'hotPotato') {
    room._hotPotatoOnExpire = hotPotatoTurnExpiredFor(io, roomCode);
  }

  // Bluff Write-Timer
  if (room._bluffWriteRemainingMs && room._bluffWriteRemainingMs > 0
      && !room._bluffWriteOnExpire
      && room.currentQuestion?.bunteTuete?.kind === 'bluff') {
    room._bluffWriteOnExpire = () => bluffWriteTimeout(io, roomCode);
  }

  // Bluff Vote-Timer
  if (room._bluffVoteRemainingMs && room._bluffVoteRemainingMs > 0
      && !room._bluffVoteOnExpire
      && room.currentQuestion?.bunteTuete?.kind === 'bluff') {
    room._bluffVoteOnExpire = () => bluffVoteTimeout(io, roomCode);
  }

  // Connections-4x4 Timer (matcht Closure aus qq:connectionsBegin)
  if (room._connectionsRemainingMs && room._connectionsRemainingMs > 0
      && !room._connectionsOnExpire
      && room.connections) {
    room._connectionsOnExpire = () => {
      const r = getQQRoom(roomCode);
      if (r && r.connections && r.connections.phase === 'active') {
        qqConnectionsToReveal(r);
        stopConnectionsAiTimers(roomCode);
        broadcast(io, roomCode);
      }
    };
  }
}

// 2026-05-24 (Refactor #3.2): HotPotato + Imposter AI in qqHotPotatoAI.ts.
//   - hotPotatoTurnExpiredFor, maybeAutoHotPotato, maybeAutoImposter

/**
 * Bluff: Write-Timer-Timeout-Handler. Erzwingt Übergang zu review (oder vote).
 * Wird auch aufgerufen wenn alle Teams submitted haben (vor Timer-Ende).
 *
 * B3 (2026-04-29): 0-Submit-Gate auch im Auto-Timer (vorher nur Mod-Space).
 * Wenn beim Timer-Ablauf KEIN Team einen Bluff abgegeben hat, bleiben wir
 * in write-Phase — Mod kann manuell skippen (qq:revealAnswer hat eigenen
 * silent-no-op-Schutz). Verhindert vorzeitiges Reveal mit nur 'real'-Option.
 */
// 2026-05-24 (Refactor #3): Bluff-AI ist jetzt in qqBluffAI.ts.
// bluffWriteTimeout, bluffVoteTimeout, maybeAutoBluffWrite, maybeAutoBluffVote,
// generateDummyBluff — siehe ./qqBluffAI.ts.

// 2026-05-24 (Refactor #3.3 + #3.4): Connections + OnlyConnect AI in
// qqConnectionsAI.ts bzw. qqOnlyConnectAI.ts. Helper-Map + maybeAuto*
// + stop*-Cleanup leben dort.

// 2026-05-24 (Refactor #3.6): maybeAutoFinalBets + maybeAutoSimulateAnswers in qqStandardBotAI.ts

// 2026-05-24 (Refactor #3.5): maybeAutoComebackChoice in qqComebackHLAI.ts


/**
 * Wenn PLACEMENT + pendingFor ist ein Dummy, setze/klau/spezial automatisch.
 * Kleine Verzögerung (1.2s), damit Moderator/Beamer den Übergang noch sehen.
 *
 * Entscheidung läuft über `pickDummyAction` (qqDummyAI.ts): simuliert jede
 * mögliche Aktion auf einem Grid-Klon, bewertet per Territorium-Delta
 * (eigenes largest - max gegner-largest) und wählt zu 80% die beste, zu 20%
 * zufällig aus den Top-3.
 */
export function maybeAutoPlace(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  if (room.phase !== 'PLACEMENT') return;
  if ((room as any).botsPaused) return;
  const teamId = room.pendingFor;
  if (!teamId) return;
  const team = (room.teams as any)[teamId];
  if (!team || !team._dummy) return;
  const action = room.pendingAction;
  if (!action) return;

  // 2026-04-30 v3 (User-Bug 'autoplay haengt nach joker'): explizite 1200ms
  // Verzoegerung pro Dummy-Aktion. Vorher 0ms → mehrere Recursive-Calls
  // konnten in derselben Tick-Schleife auf-/wegracen, broadcast war noch
  // nicht propagiert. Jetzt natuerlicheres Pacing + race-frei.
  // v3 round 6 (User-Bug 'bot hat nach steal action aber nutzt sie nicht'):
  // Vorher captured-action-Check schlug fehl wenn pendingAction zwischen
  // Schedule und Fire wechselt (Joker-Bonus aendert FREE→STEAL_1→FREE).
  // Jetzt: action LIVE neu lesen, wenn Team noch dran ist und neue Action
  // vorhanden, naechsten Tick triggern statt zu droppen. */
  setTimeout(() => {
    const live = getQQRoom(roomCode);
    if (!live || live.phase !== 'PLACEMENT') return;
    if (live.pendingFor !== teamId) return;
    // Action mismatch? Pendingaction wechselt zwischen Schedule und Fire
    // (z.B. Joker-Bonus). Re-trigger statt droppen.
    if (live.pendingAction !== action) {
      if (live.pendingAction) maybeAutoPlace(io, roomCode);
      return;
    }
    if (!live.pendingAction) return;

    const phase = live.gamePhaseIndex;
    const stats = live.teamPhaseStats[teamId];
    const shieldsUsed = stats?.shieldsUsed ?? 0;

    const skipStuckDummy = (): void => {
      qqSkipCurrentPlacement(live);
      broadcastQQ(io, roomCode);
      if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
    };

    // ── PLACE_1 (Phase 1): strikt nur setzen. Klauen ist in R1 nicht erlaubt.
    // PLACE_1 wird auch bei Joker-Bonus-Slots in Phase 2+ aufgerufen.
    if (action === 'PLACE_1') {
      const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: ['PLACE'], phase,
      });
      if (!choice) {
        // 2026-05-02 (Wolfs Bug 'Bot stuck wenn Grid voll bei Joker-Bonus'):
        // Bei Phase >= 2 als Fallback STEAL versuchen statt skipStuckDummy.
        // In R1 weiterhin skipStuck (kein Klauen erlaubt).
        if (phase >= 2) {
          const stats = live.teamPhaseStats[teamId];
          const stealsUsed = stats?.stealsUsed ?? 0;
          const canSteal = phase !== 2 || stealsUsed < 2;
          if (canSteal) {
            const stealChoice = pickDummyAction(live.grid, live.gridSize, teamId, {
              availableKinds: ['STEAL'], phase,
            });
            if (stealChoice) {
              live.pendingAction = 'STEAL_1';
              try {
                qqStealCell(live, teamId, stealChoice.target!.row, stealChoice.target!.col);
                broadcastQQ(io, roomCode);
                if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
                return;
              } catch { /* fallthrough */ }
            }
          }
        }
        skipStuckDummy();
        return;
      }
      try {
        qqPlaceCell(live, teamId, choice.target!.row, choice.target!.col);
        broadcastQQ(io, roomCode);
        if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
      } catch { /* skip */ }
      return;
    }

    // ── PLACE_2 (Phase 2, Entscheidung zwischen 2×Setzen und 1×Klauen) ──────
    // 2026-05-01 v2 (Wolfs Klarstellung): Klauen ist in R2 grunds&auml;tzlich
    // erlaubt auch f&uuml;r Bots, soll aber nicht reflexartig statt Setzen
    // gew&auml;hlt werden. Score-Compare bleibt (STEAL > 1.6&times;PLACE-Score), ABER
    // mit Probability-Throttle: nur 35% Chance dass Bot wirklich klaut wenn
    // es score-besser w&auml;re. Strategische Klau-Momente bleiben m&ouml;glich,
    // aber Bots klauen nicht jedes Mal wenn sie k&ouml;nnten.
    if (action === 'PLACE_2') {
      const firstSlot = (stats?.placementsLeft ?? 0) >= 2;
      const stealsUsed = stats?.stealsUsed ?? 0;
      const canSteal = stealsUsed < 2; // QQ_MAX_STEALS_PER_PHASE
      if (firstSlot && canSteal) {
        const placeChoiceCmp = pickDummyAction(live.grid, live.gridSize, teamId, {
          availableKinds: ['PLACE'], phase,
        }, 0);
        const stealChoiceCmp = pickDummyAction(live.grid, live.gridSize, teamId, {
          availableKinds: ['STEAL'], phase,
        }, 0);
        const placeScore2x = placeChoiceCmp ? placeChoiceCmp.score * 1.6 : -Infinity;
        const stealScore   = stealChoiceCmp ? stealChoiceCmp.score : -Infinity;
        const stealRoll = Math.random() < 0.35;
        if (stealScore > placeScore2x && stealRoll && stealChoiceCmp) {
          let switched = false;
          try {
            qqChooseFreeAction(live, teamId, 'STEAL');
            switched = true;
          } catch { /* f&auml;llt unten auf Setzen zur&uuml;ck */ }
          if (switched) {
            broadcastQQ(io, roomCode);
            if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
            return;
          }
        }
      }
      // Setzen (PLACE_2 erlaubt KEIN direktes Klauen — bei vollem Grid via chooseFreeAction('STEAL')).
      const placeChoice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: ['PLACE'], phase,
      });
      if (placeChoice) {
        try {
          qqPlaceCell(live, teamId, placeChoice.target!.row, placeChoice.target!.col);
          broadcastQQ(io, roomCode);
          if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
        } catch { /* skip */ }
        return;
      }
      // Grid voll → auf STEAL umschalten (falls noch Klaus übrig)
      if (canSteal) {
        const stealChoice = pickDummyAction(live.grid, live.gridSize, teamId, {
          availableKinds: ['STEAL'], phase,
        });
        if (stealChoice) {
          try {
            qqChooseFreeAction(live, teamId, 'STEAL');
            broadcastQQ(io, roomCode);
            if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
            return;
          } catch { /* skip below */ }
        }
      }
      skipStuckDummy();
      return;
    }

    // ── STEAL_1 ─────────────────────────────────────────────────────────────
    if (action === 'STEAL_1') {
      const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: ['STEAL'], phase,
      });
      if (!choice) { skipStuckDummy(); return; }
      try {
        qqStealCell(live, teamId, choice.target!.row, choice.target!.col);
        broadcastQQ(io, roomCode);
        if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
      } catch { /* skip */ }
      return;
    }

    // ── COMEBACK (fix Klauen, ggf. nur von bestimmten Leader-Teams) ─────────
    if (action === 'COMEBACK') {
      const targets = live.comebackStealTargets ?? [];
      const done = live.comebackStealsDone ?? [];
      const allowedOwners = new Set(
        targets.length >= 2 ? targets.filter(id => !done.includes(id)) : targets
      );
      const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: ['STEAL'], phase,
        stealFilter: (cell) => cell.ownerId != null && allowedOwners.has(cell.ownerId),
      });
      if (!choice) { skipStuckDummy(); return; }
      try {
        qqStealCell(live, teamId, choice.target!.row, choice.target!.col);
        broadcastQQ(io, roomCode);
        if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
      } catch { /* skip */ }
      return;
    }

    // ── FREE (Phase 3/4 volle Auswahl, Trinity-Mechanik) ──────────────────
    // R3+R4: PLACE (solange freie Felder) / STEAL / STAPEL (max 3 pro Spiel)
    // Bann/Schild/Tauschen sind aus dem Spiel.
    // 2026-05-01 v2 (Wolfs Klarstellung): STEAL ist grunds&auml;tzlich erlaubt,
    // soll aber nicht reflexartig gew&auml;hlt werden. Wenn pickDummyAction STEAL
    // w&auml;hlt obwohl freie Felder existieren, 65% Chance auf Fallback zu PLACE
    // (= 35% STEAL bleibt). Damit klauen Bots strategisch aber nicht zu oft.
    if (action === 'FREE') {
      // 2026-05-09 (Wolf-Bug '1 feld klauen vom leader klappt nicht im dummy'):
      // Comeback-Phase mit pendingAction='FREE' → Team soll 1 Feld vom LEADER
      // klauen. Vorher: Dummy-FREE-Branch ohne stealFilter → konnte ANY-Cell
      // klauen ODER Place wählen → Game-Stuck. Jetzt: erkennen wir einen
      // aktiven Comeback-Steal-Kontext (comebackAction='STEAL_1' + targets),
      // wird FREE auf STEAL mit Leader-Filter eingeschränkt — kein Place/Stapel.
      const isComebackSteal = live.comebackAction === 'STEAL_1'
        && (live.comebackStealTargets?.length ?? 0) > 0;
      if (isComebackSteal) {
        const targets = live.comebackStealTargets ?? [];
        const done = live.comebackStealsDone ?? [];
        const allowedOwners = new Set(
          targets.length >= 2 ? targets.filter(id => !done.includes(id)) : targets
        );
        const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
          availableKinds: ['STEAL'], phase,
          stealFilter: (cell) => cell.ownerId != null && allowedOwners.has(cell.ownerId),
        });
        if (!choice) { skipStuckDummy(); return; }
        dispatchFreeChoice(io, roomCode, teamId, choice);
        return;
      }
      const kinds: DummyActionKind[] = [];
      const hasFreeCellNow = live.grid.some(row => row.some(c => c.ownerId === null));
      if (hasFreeCellNow) kinds.push('PLACE');
      kinds.push('STEAL');
      const stapelsUsedNow = stats?.stapelsUsed ?? 0;
      if (phase >= 3 && stapelsUsedNow < 3) kinds.push('STAPEL');
      let choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: kinds, phase, shieldsUsed,
      });
      // Throttle: STEAL nur 35% wenn freie Felder noch da sind. Sonst PLACE/STAPEL.
      if (choice && choice.kind === 'STEAL' && hasFreeCellNow && Math.random() > 0.35) {
        const fallbackKinds: DummyActionKind[] = ['PLACE'];
        if (phase >= 3 && stapelsUsedNow < 3) fallbackKinds.push('STAPEL');
        const placeAlt = pickDummyAction(live.grid, live.gridSize, teamId, {
          availableKinds: fallbackKinds, phase, shieldsUsed,
        });
        if (placeAlt) choice = placeAlt;
      }
      if (!choice) { skipStuckDummy(); return; }
      dispatchFreeChoice(io, roomCode, teamId, choice);
      return;
    }

    // ── Follow-up-Steps nach chooseFreeAction (falls Flow aus User-UI käme) ──
    if (action === 'SANDUHR_1') {
      const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: ['SANDUHR'], phase,
      });
      if (!choice) { skipStuckDummy(); return; }
      try {
        qqSandLockCell(live, teamId, choice.target!.row, choice.target!.col);
        broadcastQQ(io, roomCode);
        if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
      } catch { /* skip */ }
      return;
    }
    if (action === 'SHIELD_1') {
      // Dummy braucht jetzt ein konkretes Ziel (1 Schild = 1 Feld).
      const shieldsUsed = live.teamPhaseStats[teamId]?.shieldsUsed ?? 0;
      const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: ['SHIELD'], phase, shieldsUsed,
      });
      if (!choice || !choice.target) { skipStuckDummy(); return; }
      try {
        qqShieldCell(live, teamId, choice.target.row, choice.target.col);
        broadcastQQ(io, roomCode);
        if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
      } catch { /* skip */ }
      return;
    }
    if (action === 'STAPEL_1') {
      const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: ['STAPEL'], phase,
      });
      if (!choice) { skipStuckDummy(); return; }
      try {
        qqStuckCell(live, teamId, choice.target!.row, choice.target!.col);
        broadcastQQ(io, roomCode);
        if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
      } catch {
        // 2026-05-12 (Wolf-Screenshot-1): bei Fehler den Dummy sauber
        // skippen statt im STAPEL_1-State haengen zu lassen.
        skipStuckDummy();
      }
      return;
    }
    if (action === 'SWAP_1') {
      // Step 1: eigenes Feld auswählen (wir nutzen SWAP-Enumeration und das ownTarget).
      const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: ['SWAP'], phase,
      });
      if (!choice || !choice.ownTarget || !choice.enemyTarget) { skipStuckDummy(); return; }
      try {
        qqSwapOneCell(live, teamId, choice.ownTarget.row, choice.ownTarget.col);
        broadcastQQ(io, roomCode);
        // Step 2 nach kurzer Verzögerung
        setTimeout(() => {
          const live2 = getQQRoom(roomCode);
          if (!live2 || live2.phase !== 'PLACEMENT') return;
          if (live2.pendingFor !== teamId || live2.pendingAction !== 'SWAP_1') return;
          try {
            qqSwapOneCell(live2, teamId, choice.enemyTarget!.row, choice.enemyTarget!.col);
            broadcastQQ(io, roomCode);
            if (live2.phase === 'PLACEMENT' && live2.pendingFor) maybeAutoPlace(io, roomCode);
          } catch { /* skip */ }
        }, 900);
      } catch { /* skip */ }
      return;
    }
  }, 1200);
}

// 2026-05-24 (Refactor #3.5): scheduleHLAutoReveal + clearHLAutoReveal + maybeDummyAnswerHL in qqComebackHLAI.ts

/** Hilfs-Dispatcher: aus FREE-Wahl erst chooseFreeAction, dann Follow-up. */
/** True wenn aktuelle Phase eine Placement-Action erlaubt (PLACEMENT oder
 *  CONNECTIONS_4X4 + connections.phase === 'placement' = Finale-Aktionen). */
function isPlacementCtx(room: import('./qqRooms').QQRoomState): boolean {
  if (room.phase === 'PLACEMENT') return true;
  if (room.phase === 'CONNECTIONS_4X4' && room.connections?.phase === 'placement') return true;
  return false;
}

/** Nach Action-Dispatch: connections-cursor advance + Tick. Wird aus
 *  dispatchFreeChoice nach PLACE/STEAL/STAPEL/SANDUHR/SHIELD/SWAP gerufen. */
function afterDispatchTick(io: SocketIOServer, roomCode: string): void {
  const live = getQQRoom(roomCode);
  if (!live) return;
  if (live.phase === 'CONNECTIONS_4X4' && live.connections?.phase === 'placement') {
    // Action verbraucht Slot; nächstes Team / done bestimmen
    qqConnectionsAfterPlacement(live);
    broadcastQQ(io, roomCode);
    if (live.connections?.phase === 'placement' && live.pendingFor) {
      maybeAutoConnections(io, roomCode);
    }
  } else if (live.phase === 'PLACEMENT' && live.pendingFor) {
    maybeAutoPlace(io, roomCode);
  }
}

function dispatchFreeChoice(
  io: SocketIOServer,
  roomCode: string,
  teamId: string,
  choice: DummyActionChoice,
): void {
  const live = getQQRoom(roomCode);
  if (!live) return;
  try {
    if (choice.kind === 'PLACE') {
      qqChooseFreeAction(live, teamId, 'PLACE');
      broadcastQQ(io, roomCode);
      // PLACE_2 wird via erneuten maybeAutoPlace-Tick bedient.
      if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
      else if (live.phase === 'CONNECTIONS_4X4' && live.connections?.phase === 'placement' && live.pendingFor) {
        // Connections: nach FREE→PLACE muss noch der eigentliche Place-Cell-
        // Schritt folgen. maybeAutoConnections führt das aus.
        maybeAutoConnections(io, roomCode);
      }
      return;
    }
    if (choice.kind === 'STEAL') {
      qqChooseFreeAction(live, teamId, 'STEAL');
      broadcastQQ(io, roomCode);
      // Direkt selbes Ziel klauen, um nicht neu zu enumerieren.
      setTimeout(() => {
        const live2 = getQQRoom(roomCode);
        if (!live2 || !isPlacementCtx(live2)) return;
        if (live2.pendingFor !== teamId || live2.pendingAction !== 'STEAL_1') return;
        try {
          qqStealCell(live2, teamId, choice.target!.row, choice.target!.col);
          broadcastQQ(io, roomCode);
          afterDispatchTick(io, roomCode);
        } catch { /* skip */ }
      }, 700);
      return;
    }
    if (choice.kind === 'SANDUHR') {
      qqChooseFreeAction(live, teamId, 'SANDUHR');
      broadcastQQ(io, roomCode);
      setTimeout(() => {
        const live2 = getQQRoom(roomCode);
        if (!live2 || !isPlacementCtx(live2)) return;
        if (live2.pendingFor !== teamId || live2.pendingAction !== 'SANDUHR_1') return;
        try {
          qqSandLockCell(live2, teamId, choice.target!.row, choice.target!.col);
          broadcastQQ(io, roomCode);
          afterDispatchTick(io, roomCode);
        } catch { /* skip */ }
      }, 900);
      return;
    }
    if (choice.kind === 'SHIELD') {
      qqChooseFreeAction(live, teamId, 'SHIELD');
      broadcastQQ(io, roomCode);
      setTimeout(() => {
        const live2 = getQQRoom(roomCode);
        if (!live2 || !isPlacementCtx(live2)) return;
        if (live2.pendingFor !== teamId) return;
        try {
          if (live2.pendingAction === 'SHIELD_1' && choice.target) {
            qqShieldCell(live2, teamId, choice.target.row, choice.target.col);
          }
          broadcastQQ(io, roomCode);
          afterDispatchTick(io, roomCode);
        } catch { /* skip */ }
      }, 900);
      return;
    }
    if (choice.kind === 'STAPEL') {
      qqChooseFreeAction(live, teamId, 'STAPEL');
      broadcastQQ(io, roomCode);
      setTimeout(() => {
        const live2 = getQQRoom(roomCode);
        if (!live2 || !isPlacementCtx(live2)) return;
        if (live2.pendingFor !== teamId || live2.pendingAction !== 'STAPEL_1') return;
        try {
          qqStuckCell(live2, teamId, choice.target!.row, choice.target!.col);
          broadcastQQ(io, roomCode);
          afterDispatchTick(io, roomCode);
        } catch {
          // 2026-05-12 (Wolf-Screenshot-1 'nach stack kein auto-place/steal'):
          // Wenn qqStuckCell throwt (Target wurde zwischenzeitlich von einem
          // anderen Team modifiziert: stolen / shielded / bereits stuck), war
          // der Dummy vorher fuer immer in STAPEL_1 gestuckt. Jetzt: nochmal
          // ticken — STAPEL_1-Handler in maybeAutoPlace versucht andere
          // Targets oder skippt das Team sauber, statt das Spiel haengen
          // zu lassen.
          maybeAutoPlace(io, roomCode);
        }
      }, 900);
      return;
    }
    if (choice.kind === 'SWAP') {
      qqChooseFreeAction(live, teamId, 'SWAP');
      broadcastQQ(io, roomCode);
      // Step 1: eigenes Feld
      setTimeout(() => {
        const live2 = getQQRoom(roomCode);
        if (!live2 || live2.phase !== 'PLACEMENT') return;
        if (live2.pendingFor !== teamId || live2.pendingAction !== 'SWAP_1') return;
        try {
          qqSwapOneCell(live2, teamId, choice.ownTarget!.row, choice.ownTarget!.col);
          broadcastQQ(io, roomCode);
          // Step 2: gegnerisches Feld
          setTimeout(() => {
            const live3 = getQQRoom(roomCode);
            if (!live3 || live3.phase !== 'PLACEMENT') return;
            if (live3.pendingFor !== teamId || live3.pendingAction !== 'SWAP_1') return;
            try {
              qqSwapOneCell(live3, teamId, choice.enemyTarget!.row, choice.enemyTarget!.col);
              broadcastQQ(io, roomCode);
              if (live3.phase === 'PLACEMENT' && live3.pendingFor) maybeAutoPlace(io, roomCode);
            } catch { /* skip */ }
          }, 900);
        } catch { /* skip */ }
      }, 700);
      return;
    }
  } catch { /* Fallback: kein dispatch */ }
}

export function registerQQHandlers(io: SocketIOServer): void {
  // Persistente Rooms beim Start wieder einspielen. Fire-and-forget: falls
  // das Laden scheitert (Permission / parse error), startet der Server normal
  // mit leerer Map.
  loadAllRooms().then(restored => {
    for (const r of restored) {
      insertQQRoom(r.room);
      console.log(`[QQ-persist] restored room ${r.room.roomCode} (phase=${r.room.phase})`);
    }
    if (restored.length > 0) {
      console.log(`[QQ-persist] ${restored.length} room(s) restored`);
      // 2026-05-02 (Persistence-Audit P-7): expliziter Restart-Broadcast pro Room.
      // Heute funktioniert Reconnect implizit via Socket.IO-Auto-Reconnect, aber
      // Frontend bekommt erst beim naechsten State-Update mit dass Server neu
      // war. Mit diesem Event kann Frontend bewusst State-Refresh erzwingen
      // (z.B. lokale Caches invalidieren) sobald ein Client wieder connectet.
      for (const r of restored) {
        io.to(r.room.roomCode).emit('qq:serverRestarted', { roomCode: r.room.roomCode });
        // Sofort frischen State pushen — Clients die schon connected sind
        // bekommen so direkt die rehydrierte Phase (typisch PAUSED).
        broadcast(io, r.room.roomCode);
      }
    }
  }).catch(err => {
    console.warn('[QQ-persist] restore failed:', err?.message ?? err);
  });

  io.on('connection', (socket) => {

    // ── Mod-Auth-Gate (Security-Audit 2026-06-13) ───────────────────────────
    // Zentraler Choke-Point VOR allen Handlern: Mod-only qq:-Events werden fuer
    // Sockets ohne qqIsMod blockiert. PUBLIC/Team-Events (QQ_PUBLIC_EVENTS) und
    // alle nicht-qq:-Events laufen ungehindert durch. So muss nicht jeder der
    // ~80 Mod-Handler einzeln geguarded werden (fehleranfaellig).
    socket.use((packet, next) => {
      const event = packet[0];
      if (typeof event !== 'string' || !event.startsWith('qq:')) return next();
      if (QQ_PUBLIC_EVENTS.has(event)) return next();
      if (socket.data?.qqIsMod) return next();
      // Nicht autorisiert → Event NICHT an den Handler durchreichen. Falls ein
      // Ack-Callback dabei ist, sauber ablehnen, damit emitWithAck nicht haengt.
      const maybeAck = packet[packet.length - 1];
      if (typeof maybeAck === 'function') {
        (maybeAck as AckFn)({ ok: false, error: 'Moderator-PIN erforderlich.', code: 'NOT_AUTHORIZED' });
      }
      // bewusst kein next() → Handler wird nicht ausgefuehrt
    });

    // ── Heartbeat ──────────────────────────────────────────────────────────
    // Client-Heartbeat (alle 20s). Hält die WS-Verbindung gegen Render-Proxy-
    // Timeout (~100s Idle) und Browser-Tab-Throttling warm. Noop-Handler.
    socket.on('qq:ping', () => { /* noop */ });

    // ── Join ────────────────────────────────────────────────────────────────
    socket.on('qq:joinModerator', (payload: QQJoinModeratorPayload, ack?: unknown) => {
      try {
        // Mod-Auth: NUR korrekter PIN → Mod-Rechte. Bewusst KEINE NODE_ENV-Valve
        // (waere unsicher, falls Coolify NODE_ENV nicht auf 'production' setzt).
        // Im Dev greift der ADMIN_PIN-Fallback '2506', den PinGate ohnehin abfragt
        // und in sessionStorage legt → joinModerator schickt ihn mit, matcht.
        // Sonst joint der Socket read-only (sieht State wie ein Beamer, aber das
        // Gate oben blockt alle Mod-Events). Re-join bei Reconnect setzt das Flag
        // erneut, da das Frontend den PIN jedes Mal mitschickt.
        if (payload?.pin && payload.pin === QQ_ADMIN_PIN) {
          socket.data.qqIsMod = true;
        }
        const room = ensureQQRoom(payload.roomCode);
        socket.join(payload.roomCode);
        socket.emit('qq:stateUpdate', buildQQStateUpdate(room));
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:joinBeamer', (payload: QQJoinBeamerPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        socket.join(payload.roomCode);
        socket.emit('qq:stateUpdate', buildQQStateUpdate(room));
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-05-02 (Stamm-Team-Code): Spieler im Setup-Flow gibt seinen alten
    // Code ein, Backend liefert die Stamm-Team-Daten zurueck (Avatar, Name,
    // Win-Streak). Frontend nutzt das fuer Auto-Fill + Win-Streak-Anzeige.
    socket.on('qq:lookupRegularTeam', async (
      payload: { roomCode: string; teamId: string },
      ack?: (resp: { ok: true; team: any | null } | { ok: false; error: string }) => void,
    ) => {
      try {
        if (!payload.teamId || !payload.roomCode) {
          if (ack) ack({ ok: false, error: 'INVALID_INPUT' });
          return;
        }
        const team = await getQQRegularTeam(payload.teamId, payload.roomCode);
        if (ack) ack({ ok: true, team: team ?? null });
      } catch (e: any) {
        if (ack) ack({ ok: false, error: e?.message ?? 'LOOKUP_FAILED' });
      }
    });

    socket.on('qq:joinTeam', (payload: QQJoinTeamPayload, ack?: unknown) => {
      try {
        if (!payload.teamName || typeof payload.teamName !== 'string' || payload.teamName.length > 100) throw new QQError('INVALID_NAME', 'Teamname ungültig (max 100 Zeichen).');
        if (!payload.teamId || typeof payload.teamId !== 'string' || payload.teamId.length > 100) throw new QQError('INVALID_ID', 'TeamId ungültig.');
        const room = ensureQQRoom(payload.roomCode);
        qqJoinTeam(room, payload.teamId, payload.teamName, payload.avatarId, payload.emoji);
        socket.join(payload.roomCode);
        socket.data.qqTeamId   = payload.teamId;
        socket.data.qqRoomCode = payload.roomCode;
        broadcast(io, payload.roomCode);
        ok(ack);
        // 2026-05-06 (Wolf 'in der Lobby auch anzeigen, Team X mit Code
        // eingeloggt ist zum X. Mal dabei, willkommen zurueck'): Async-
        // Lookup im Stamm-Team-Cache. Wenn das Team schon mal gespielt
        // hat, populiere gamesPlayed/wins und broadcaste erneut.
        // Fire-and-forget, damit qqJoinTeam-Response nicht warten muss.
        (async () => {
          try {
            const stamm = await getQQRegularTeam(payload.teamId, payload.roomCode);
            if (!stamm) return;
            const live = getQQRoom(payload.roomCode);
            if (!live || !live.teams[payload.teamId]) return;
            const games = stamm.gamesPlayed ?? 0;
            const wins  = stamm.wins ?? 0;
            if (games <= 0) return; // nichts zu zeigen
            live.teams[payload.teamId].gamesPlayed = games;
            live.teams[payload.teamId].wins = wins;
            broadcast(io, payload.roomCode);
          } catch { /* silent — Stamm-Lookup ist optional */ }
        })();
      } catch (e) { fail(ack, e); }
    });

    // ── Game control (moderator) ────────────────────────────────────────────
    socket.on('qq:startGame', (payload: QQStartGamePayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        // Default 4 statt 3 — die Standard-Drafts (qq-vol-*) sind 4-Runden-Sets,
        // und ein silent-3 wenn frontend den Wert nicht sendet hat schon einmal
        // zu 'nur 3 Runden im Tree' geführt.
        qqStartGame(room, payload.questions, payload.language, payload.phases ?? 4, payload.theme, payload.draftId, payload.draftTitle, payload.slideTemplates, payload.soundConfig, payload.connections, payload.connectionsDurationSec, payload.connectionsMaxFails, (payload as any).cozyGamesEnabled, (payload as any).cozyGamesPool, (payload as any).comebackEnabled, (payload as any).largeGroupMode, (payload as any).nestedTeams);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:activateQuestion', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqActivateQuestion(room, () => {
          // Timer expired — broadcast + Kategorie-spezifische Cleanups.
          // 2026-05-04 v4 (Wolf-Bug 'app haengt bei 4-gewinnt nach Timer'):
          // Frueher nur Bot-Timer killen + broadcasten → App blieb in
          // QUESTION_ACTIVE, kein Display-Wechsel. Jetzt: Connect-4 wechselt
          // bei Timer-Ablauf automatisch zu Reveal (RevealAll + AutoFinish).
          // Mod muss nicht mehr drueckenken, Hints sind eh durch timerExpired
          // gesperrt → Reveal-Anzeige ist die richtige Weiterfuehrung.
          const r = getQQRoom(payload.roomCode);
          if (r?.currentQuestion?.bunteTuete?.kind === 'onlyConnect' && r.phase === 'QUESTION_ACTIVE') {
            stopOnlyConnectAiTimers(payload.roomCode);
            qqOnlyConnectRevealAll(r);
            qqOnlyConnectAutoFinish(r);
          }
          broadcast(io, payload.roomCode);
        });
        // qqActivateQuestion kann früh zurückkehren wenn nur ein PHASE_INTRO-
        // Sub-Step weitergezählt wurde (Round-Title → Rule-Reminder → Category
        // → Category-Explanation → eigentliche Aktivierung). In diesem Fall
        // bleibt phase='PHASE_INTRO'. Sub-Mechanik-Starts dürfen NUR feuern
        // wenn die Frage tatsächlich aktiv wurde — sonst startet z.B. Bluff
        // schon beim ersten Space seinen 60s-Write-Timer und läuft durch
        // alle Phasen während der Mod noch durch die Intro-Folien klickt.
        if (room.phase === 'QUESTION_ACTIVE') {
          // Auto-start Hot Potato if the activated question is a hotPotato type
          if (room.currentQuestion?.bunteTuete?.kind === 'hotPotato') {
            qqHotPotatoStart(room, hotPotatoTurnExpired(payload.roomCode));
          }
          // Auto-start Imposter (oneOfEight) and stop timer (it's self-paced)
          if (room.currentQuestion?.bunteTuete?.kind === 'oneOfEight') {
            qqImposterStart(room);
            qqStopTimer(room);
          }
          // Auto-start 4 gewinnt (onlyConnect): nutzt seit 2026-04-28 den
          // Standard-Question-Timer (User-Wunsch: 'gleicher Flow wie alle
          // Kategorien'). Hints werden global synchron alle ~timerDur/4
          // Sekunden auto-advanced. qqStopTimer NICHT mehr — Standard-Timer
          // läuft (gestartet in qqActivateQuestion).
          if (room.currentQuestion?.bunteTuete?.kind === 'onlyConnect') {
            qqOnlyConnectStart(room, () => broadcast(io, payload.roomCode));
          }
          // Auto-start Bluff: write-Phase, eigener Timer.
          if (room.currentQuestion?.bunteTuete?.kind === 'bluff') {
            qqBluffStartWrite(room, () => bluffWriteTimeout(io, payload.roomCode));
            qqStopTimer(room);
          }
        }
        broadcast(io, payload.roomCode);
        if (room.phase === 'QUESTION_ACTIVE') {
          // Bluff Dummy-AI: Dummies tippen bluffs nach Verzögerung.
          if (room.currentQuestion?.bunteTuete?.kind === 'bluff') {
            maybeAutoBluffWrite(io, payload.roomCode);
          }
          // 4 gewinnt Dummy-AI: Dummies schalten Hinweise frei + tippen.
          if (room.currentQuestion?.bunteTuete?.kind === 'onlyConnect') {
            stopOnlyConnectAiTimers(payload.roomCode);
            maybeAutoOnlyConnect(io, payload.roomCode);
          }
          // Dummies automatisch antworten lassen
          maybeAutoSimulateAnswers(io, payload.roomCode);
          // Hot Potato / Imposter: falls aktives Team ein Dummy ist, Kette starten.
          // 2026-05-06: Bei HotPotato dreht jetzt zuerst die Slot-Machine —
          // Bot-Kette startet erst nach qq:hotPotatoFinishSlot, damit der
          // Bot nicht waehrend der Animation antwortet.
          if (room.currentQuestion?.bunteTuete?.kind === 'hotPotato'
              && room.hotPotatoSlotState === 'finished') {
            maybeAutoHotPotato(io, payload.roomCode);
          }
          if (room.currentQuestion?.bunteTuete?.kind === 'oneOfEight') {
            maybeAutoImposter(io, payload.roomCode);
          }
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:revealAnswer', (payload: QQRevealAnswerPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        // 2026-05-12 (Backend-Audit P0 #2): Idempotency-Guard — Doppelklick auf
        // Mod-Space (Streamdeck-Bounce / Audio-Lag) feuerte 2× qq:revealAnswer.
        // Erster Call OK, zweiter Call warf WRONG_PHASE-Error → Mod-Toast
        // verunsicherte Wolf live. Silent no-op wenn schon im REVEAL-State und
        // kein Sub-Kind mit eigener Multi-Step-Reveal-Logik (onlyConnect/bluff).
        const subKindForGuard = room.currentQuestion?.bunteTuete?.kind;
        if (room.phase === 'QUESTION_REVEAL'
            && subKindForGuard !== 'onlyConnect'
            && subKindForGuard !== 'bluff') {
          ok(ack);
          return;
        }
        // Sub-Mechaniken mit eigener Reveal-Pipeline routen — Standard-Reveal
        // würde sonst den Auto-Finish-Pfad umgehen + Phase nicht korrekt setzen.
        const subKind = room.currentQuestion?.bunteTuete?.kind;
        // Mucho/ZvZ: erster Step (Phase-Wechsel ohne sichtbares Event) wird
        // mit Avatar-Cascade verschmolzen — User-Wunsch 2026-04-28: 'der
        // Zwischenschritt macht eh nichts'. Wir setzen muchoRevealStep /
        // zvzRevealStep direkt auf 1 mit dem ersten Space.
        const cat = room.currentQuestion?.category;
        const isMuchoOrZvz = (cat === 'MUCHO' || cat === 'ZEHN_VON_ZEHN') && room.phase === 'QUESTION_ACTIVE';
        if (room.phase === 'QUESTION_ACTIVE' && subKind === 'onlyConnect') {
          // 2026-05-03 Wolf-Bug 'Connect-4 Autoplay hängt' — Debug-Logs.
          const startedAt = room._onlyConnectStartedAt;
          const elapsed = startedAt ? Date.now() - startedAt : 0;
          console.log('[oc-debug] qq:revealAnswer:', JSON.stringify({
            phase: room.phase,
            timerExpired: room.timerExpired,
            timerEndsAt: room.timerEndsAt,
            elapsedSinceStart: elapsed,
            hardFloorPassed: elapsed >= 25000,
            hintIndices: room.onlyConnectHintIndices,
            lockedTeams: room.onlyConnectLockedTeams,
            guesses: (room.onlyConnectGuesses ?? []).map(g => ({ teamId: g.teamId, correct: g.correct, atHintIdx: g.atHintIdx })),
          }));
          // 2026-05-04 v4 (Wolf-Bug): Hard-Floor nur wenn Timer noch laeuft.
          // Wenn Timer bereits abgelaufen (timerExpired=true) → Reveal IMMER
          // erlaubt, sonst kann Mod nach Timer-Expire die Frage nicht aufloesen
          // weil der 25s-Insta-End-Schutz auch bei normalem Ablauf zuschlaegt.
          if (startedAt && elapsed < 25000 && !room.timerExpired) {
            console.log('[oc-debug] BLOCKED by 25s Hard-Floor');
            ok(ack);
            return;
          }
          qqOnlyConnectRevealAll(room);
          qqOnlyConnectAutoFinish(room);
          console.log('[oc-debug] revealed via Mod-Space, phase now:', room.phase);
          broadcast(io, payload.roomCode);
          ok(ack);
          return;
        }
        if (room.phase === 'QUESTION_ACTIVE' && subKind === 'bluff') {
          // Gleicher Schutz: Bluff hat write/vote-Timer aber Mod könnte trotzdem
          // zu früh drücken. Nur weiterschalten wenn mind. 1 Submit oder Vote
          // schon vorliegt — sonst silent no-op.
          // 2026-04-28: User-Bug 'bei bluff 0/5 teams haben gewählt? und dann
          // kommt reveal?' — Mod-Space im vote-Phase ohne Votes triggerte direkt
          // reveal. Jetzt auch im vote-Phase silent-no-op bei 0 Votes.
          const hasSubmit = Object.values(room.bluffSubmissions ?? {}).some(t => t?.trim());
          const hasVote = Object.keys(room.bluffVotes ?? {}).length > 0;
          if (!hasSubmit && !hasVote && room.bluffPhase === 'write') {
            ok(ack);
            return;
          }
          if (!hasVote && room.bluffPhase === 'vote') {
            // 0 Votes — nicht advancen, sonst kommt reveal ohne irgendwas.
            // Mod muss warten bis mind. 1 Team gevotet hat (Dummies tippen
            // nach 4-9s automatisch).
            ok(ack);
            return;
          }
          // Bluff je nach Phase abschließen: write/review → direkt zu vote-end,
          // vote → reveal triggern.
          if (room.bluffPhase === 'write') {
            qqBluffAdvanceFromWrite(room, () => bluffVoteTimeout(io, payload.roomCode));
          }
          if (room.bluffPhase === 'review') {
            qqBluffFinishReview(room, () => bluffVoteTimeout(io, payload.roomCode));
          }
          if (room.bluffPhase === 'vote' || room.bluffPhase === 'reveal') {
            qqBluffAdvanceFromVote(room);
          }
          broadcast(io, payload.roomCode);
          ok(ack);
          return;
        }
        qqRevealAnswer(room);
        // Run evaluation immediately so correctTeamId is set — moderator sees winner
        try { applyAutoEval(room); } catch { /* ignore if already evaluated */ }
        // Mucho/ZvZ: ersten Reveal-Step (Avatar-Cascade) sofort mit dem
        // Phase-Wechsel verschmelzen. User-Wunsch 2026-04-28: 'alle teams
        // auf allen antworten bei space setzen' — Mucho springt direkt auf
        // nonEmpty (alle Voter sichtbar), ZvZ direkt auf 1 (Cascade-Step).
        if (isMuchoOrZvz) {
          if (cat === 'MUCHO' && room.currentQuestion?.options) {
            let nonEmpty = 0;
            for (let i = 0; i < room.currentQuestion.options.length; i++) {
              if (room.answers.some(a => a.text === String(i))) nonEmpty++;
            }
            // nonEmpty = akt1Max (Anzahl Optionen mit ≥1 Voter). Frontend
            // staggered intern in 750ms-Schritten alle einblendet.
            const lockStep = nonEmpty + 1;
            room.muchoRevealStep = nonEmpty === 0 ? lockStep : nonEmpty;
          }
          if (cat === 'ZEHN_VON_ZEHN') room.zvzRevealStep = 1;
        }
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:showImage', (payload: QQShowImagePayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqShowImage(room, () => {
          // Timer expired after image reveal — broadcast update
          broadcast(io, payload.roomCode);
        });
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:markCorrect', (payload: QQMarkCorrectPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqClearBuzz(room);
        // Do NOT clear answers here — they remain visible during PLACEMENT and post-placement review.
        // Answers are cleared in qqNextQuestion / qqActivateQuestion.
        qqMarkCorrect(room, payload.teamId);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:markWrong', (payload: QQMarkWrongPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqClearBuzz(room);
        // Answers cleared naturally in qqNextQuestion (called inside qqMarkWrong)
        qqMarkWrong(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:undoMarkCorrect', (payload: QQUndoMarkCorrectPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqUndoMarkCorrect(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-05-02: Mod fuegt nachtraeglich ein Mit-Gewinner-Team hinzu.
    socket.on('qq:modAddCoWinner', (payload: { roomCode: string; teamId: string }, ack?: unknown) => {
      try {
        if (!payload.teamId || typeof payload.teamId !== 'string') {
          throw new QQError('INVALID_ID', 'TeamId ungueltig.');
        }
        const room = ensureQQRoom(payload.roomCode);
        qqAddCoWinner(room, payload.teamId);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-05-02: Mod entfernt ein Team aus der Mit-Gewinner-Liste.
    socket.on('qq:modRemoveWinner', (payload: { roomCode: string; teamId: string }, ack?: unknown) => {
      try {
        if (!payload.teamId || typeof payload.teamId !== 'string') {
          throw new QQError('INVALID_ID', 'TeamId ungueltig.');
        }
        const room = ensureQQRoom(payload.roomCode);
        qqRemoveWinner(room, payload.teamId);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-05-02: Mod resolved Tie-Breaker am Spielende.
    socket.on('qq:resolveTieBreaker', (payload: { roomCode: string; teamId: string }, ack?: unknown) => {
      try {
        if (!payload.teamId || typeof payload.teamId !== 'string') {
          throw new QQError('INVALID_ID', 'TeamId ungueltig.');
        }
        const room = ensureQQRoom(payload.roomCode);
        qqResolveTieBreaker(room, payload.teamId);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-07-04: Schaetz-Stechen — Mod startet (oder wuerfelt neu). durationSec
    // = einstellbarer Countdown; bei Ablauf loest der Timer automatisch auf.
    socket.on('qq:startTieBreaker', (payload: { roomCode: string; durationSec?: number }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqStartTieBreaker(room, payload.durationSec);
        armTieBreakerRevealTimer(io, payload.roomCode, room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-07-04: Mod loest das Stechen manuell auf (frueher als Timer / ohne Timer).
    socket.on('qq:revealTieBreaker', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        clearTieBreakerRevealTimer(room);
        qqRevealTieBreaker(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-07-04: Mod bricht Stechen ab → zurueck zu GAME_OVER (manuelle Aufloesung).
    socket.on('qq:cancelTieBreaker', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        clearTieBreakerRevealTimer(room);
        qqCancelTieBreaker(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-07-04: Team gibt Schaetzung im Stechen ab (ein Versuch pro Geraet).
    socket.on('qq:tiebreakerAnswer', (payload: { roomCode: string; teamId: string; guess: number }, ack?: unknown) => {
      try {
        assertOwnTeam(socket, payload.teamId);
        assertRateLimit(socket, 'qq:tiebreakerAnswer', 4);
        const room = ensureQQRoom(payload.roomCode);
        qqTieBreakerAnswer(room, payload.teamId, payload.guess);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Moderator triggers placement after reviewing the reveal screen
    socket.on('qq:startPlacement', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqStartPlacement(room);
        broadcast(io, payload.roomCode);
        // Falls Dummy am Zug → automatisch platzieren
        maybeAutoPlace(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:nextQuestion', (payload: QQNextQuestionPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        // 2026-05-03 Wolf-Bug 'Comeback-Maria-Hang' — Debug-Logs fuer
        // Comeback-Steal-Pause-Pfad. Der Pfad: nach 1 Klau setzt
        // _comebackStealPaused=true, pendingFor=null. Frontend-Autoplay
        // feuert qq:nextQuestion. Backend qqNextQuestion -> qqComebackStealResume.
        const inComeback = !!room.comebackHL || !!room._comebackStealPaused
          || !!room.comebackTeamId;
        if (inComeback) {
          console.log('[cb-debug] qq:nextQuestion BEFORE:', JSON.stringify({
            phase: room.phase,
            pendingFor: room.pendingFor,
            pendingAction: room.pendingAction,
            comebackTeamId: room.comebackTeamId,
            comebackAction: room.comebackAction,
            comebackStealPaused: room._comebackStealPaused,
            hlPhase: room.comebackHL?.phase,
            hlCurrentStealer: room.comebackHL?.currentStealer,
            hlCurrentRemaining: room.comebackHL?.currentStealerRemaining,
            hlStealQueueLen: room.comebackHL?.stealQueue.length,
          }));
        }
        qqNextQuestion(room);
        if (inComeback) {
          const stealerTeam = room.pendingFor ? room.teams[room.pendingFor] : null;
          console.log('[cb-debug] qq:nextQuestion AFTER:', JSON.stringify({
            phase: room.phase,
            pendingFor: room.pendingFor,
            pendingAction: room.pendingAction,
            stealerConnected: stealerTeam?.connected,
            stealerIsDummy: stealerTeam ? !!(stealerTeam as any)._dummy : null,
            comebackStealPaused: room._comebackStealPaused,
          }));
        }
        broadcast(io, payload.roomCode);
        if (room.phase === 'PLACEMENT' && room.pendingFor) {
          maybeAutoPlace(io, payload.roomCode);
        }
        // 2026-05-09: wenn nextQuestion in FINAL_BETTING-Phase wechselt
        // (auto via qqBeginPhase wenn finalWagerEnabled), Bots auto-betten lassen
        if (room.phase === 'FINAL_BETTING') {
          maybeAutoFinalBets(io, payload.roomCode);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:triggerComeback', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqTriggerComeback(room);
        broadcast(io, payload.roomCode);
        // Falls Comeback-Team ein Dummy ist → automatisch PLACE_2 wählen
        maybeAutoComebackChoice(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Answer submission (teams) ──────────────────────────────────────────
    socket.on('qq:submitAnswer', (payload: QQSubmitAnswerPayload, ack?: unknown) => {
      try {
        assertOwnTeam(socket, payload.teamId);
        assertRateLimit(socket, 'qq:submitAnswer', 5);
        if (typeof payload.answer !== 'string' || payload.answer.length > 1000) throw new QQError('INVALID_ANSWER', 'Antwort zu lang (max 1000 Zeichen).');
        const room = ensureQQRoom(payload.roomCode);
        qqSubmitAnswer(room, payload.teamId, payload.answer);
        // No auto-reveal — moderator controls when to reveal
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Undo Last Action (Mod-Fallback, 2026-05-24 Wolf-Live-Test #7) ─────
    socket.on('qq:undoLastAction', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqUndoLastAction(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Revoke Answer (2026-05-23 Wolf-Live-Test #O) ──────────────────────
    // Team-Wunsch: eingegebene Antwort widerrufen solange Timer noch laeuft.
    // Cleanere Variante als Frontend-Hide, weil das Backend dann konsistent
    // ist und ein nachfolgender Submit nicht "Update" sondern "Neu" wirkt.
    socket.on('qq:revokeAnswer', (payload: { roomCode: string; teamId: string }, ack?: unknown) => {
      try {
        assertOwnTeam(socket, payload.teamId);
        assertRateLimit(socket, 'qq:revokeAnswer', 3);
        const room = ensureQQRoom(payload.roomCode);
        if (room.phase !== 'QUESTION_ACTIVE') {
          throw new QQError('WRONG_PHASE', 'Revoke nur bei aktiver Frage moeglich.');
        }
        if ((room as any).timerExpired) {
          throw new QQError('TIMER_EXPIRED', 'Zu spaet — Timer ist abgelaufen.');
        }
        room.answers = room.answers.filter(a => a.teamId !== payload.teamId);
        room.lastActivityAt = Date.now();
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Buzz in (teams, for Hot Potato) ───────────────────────────────────
    socket.on('qq:buzzIn', (payload: QQBuzzInPayload, ack?: unknown) => {
      try {
        assertOwnTeam(socket, payload.teamId);
        assertRateLimit(socket, 'qq:buzzIn', 10);
        const room = ensureQQRoom(payload.roomCode);
        qqBuzzIn(room, payload.teamId);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Hot Potato (moderator + team) ─────────────────────────────────────
    const hotPotatoTurnExpired = (roomCode: string) => hotPotatoTurnExpiredFor(io, roomCode);

    socket.on('qq:hotPotatoStart', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqHotPotatoStart(room, hotPotatoTurnExpired(payload.roomCode));
        broadcast(io, payload.roomCode);
        // 2026-05-06: Slot dreht jetzt — maybeAutoHotPotato darf erst NACH
        // qqHotPotatoFinishSlot ausgeloest werden, sonst tippt der Bot waehrend
        // der Slot-Animation. (Wird in qq:hotPotatoFinishSlot getriggert.)
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-05-06 (Wolf-Wunsch 'Slot-Machine vor erstem HP-Zug'):
    // Mod druckt zweites Mal Space → Slot stoppt, Turn-Timer startet,
    // /team-Eingabe wird freigegeben. Dummy-Bot-Kette beginnt erst hier.
    socket.on('qq:hotPotatoFinishSlot', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqHotPotatoFinishSlot(room, hotPotatoTurnExpired(payload.roomCode));
        broadcast(io, payload.roomCode);
        maybeAutoHotPotato(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:hotPotatoWrong', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (!room.hotPotatoActiveTeamId) {
          throw new QQError('NO_ACTIVE_TEAM', 'Kein aktives Hot-Potato-Team.');
        }
        const next = qqHotPotatoEliminate(room, hotPotatoTurnExpired(payload.roomCode));
        const winner = qqHotPotatoCheckWinner(room);
        if (winner === '' || !next) {
          // Niemand mehr alive → kein Gewinner
          qqClearHotPotatoTimer(room);
          qqRevealAnswer(room);
          qqMarkWrong(room);
        } else if (winner) {
          // Eindeutiger qualifizierter Last-Standing → Gewinner
          qqClearHotPotatoTimer(room);
          qqRevealAnswer(room);
          qqClearBuzz(room);
          qqMarkCorrect(room, winner);
        }
        // sonst: weiter spielen, `next` ist bereits dran
        broadcast(io, payload.roomCode);
        maybeAutoHotPotato(io, payload.roomCode);
        if (room.phase === 'PLACEMENT' && room.pendingFor) maybeAutoPlace(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:hotPotatoCorrect', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const teamId = room.hotPotatoActiveTeamId;
        if (!teamId) throw new QQError('NO_ACTIVE_TEAM', 'Kein aktives Hot-Potato-Team.');
        // 2026-05-02 (Mechanik-Audit P1 #1): Mod-Doppelklick-Schutz. Erster
        // Klick: lastAnswer existiert -> qualified + next. Zweiter Klick
        // direkt danach: lastAnswer ist null (in qqStartHotPotatoTurn reset)
        // -> ohne Guard wuerde qqHotPotatoNext nochmal feuern und das
        // naechste Team verliert seinen Turn.
        if (!room.hotPotatoLastAnswer) {
          ok(ack);
          return;
        }
        if (room.hotPotatoLastAnswer) {
          room.hotPotatoUsedAnswers.push(room.hotPotatoLastAnswer);
          room.hotPotatoAnswerAuthors.push(teamId);
          qqHotPotatoMarkQualified(room, teamId);
        }
        // Check winner BEFORE advancing — pool-depletion end fires even if there
        // would be a next team in round-robin.
        const winnerPre = qqHotPotatoCheckWinner(room);
        if (winnerPre === '' || !winnerPre) {
          // Noch nicht vorbei → advance zum nächsten Team und nochmal prüfen
          const next = qqHotPotatoNext(room, hotPotatoTurnExpired(payload.roomCode));
          const winner = qqHotPotatoCheckWinner(room);
          if (winner === '' || !next) {
            qqClearHotPotatoTimer(room);
            qqRevealAnswer(room);
            qqClearBuzz(room);
            qqMarkWrong(room);
          } else if (winner) {
            qqClearHotPotatoTimer(room);
            qqRevealAnswer(room);
            qqClearBuzz(room);
            qqMarkCorrect(room, winner);
          }
        } else {
          // Pool erschöpft oder nur noch 1 Team → Runde endet sofort
          qqClearHotPotatoTimer(room);
          qqRevealAnswer(room);
          qqClearBuzz(room);
          qqMarkCorrect(room, winnerPre);
        }
        broadcast(io, payload.roomCode);
        maybeAutoHotPotato(io, payload.roomCode);
        if (room.phase === 'PLACEMENT' && room.pendingFor) maybeAutoPlace(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Team submits their Hot Potato answer text — with auto-check.
    // 2026-04-28 (User-Wunsch 'keine strikes'): kein Eliminieren auf falsche
    // Tipps oder Duplikate mehr. Team kann während des Turn-Timers SO VIELE
    // Antworten tippen wie sie schaffen. Nur Timer-Ablauf eliminiert.
    socket.on('qq:hotPotatoAnswer', (
      payload: { roomCode: string; teamId: string; answer: string },
      ack?: unknown,
    ) => {
      try {
        assertOwnTeam(socket, payload.teamId);
        assertRateLimit(socket, 'qq:hotPotatoAnswer', 5);
        const room = ensureQQRoom(payload.roomCode);
        const trimmed = payload.answer.slice(0, 500);
        if (room.phase !== 'QUESTION_ACTIVE') { ok(ack); return; }
        if (room.hotPotatoActiveTeamId !== payload.teamId) { ok(ack); return; }
        room.lastActivityAt = Date.now();

        const normalizedAnswer = normalizeText(trimmed);
        if (normalizedAnswer.length === 0) { ok(ack); return; }

        // Duplikat: nicht eliminieren — kurz als lastAnswer markieren (für
        // Visual-Feedback 'schon gesagt'), Timer läuft weiter.
        const isDuplicate = room.hotPotatoUsedAnswers.some(
          used => normalizeText(used) === normalizedAnswer
        );
        if (isDuplicate) {
          room.hotPotatoLastAnswer = trimmed;
          broadcast(io, payload.roomCode);
          ok(ack);
          return;
        }

        // Auto-check: match against answer list (DE + EN combined).
        // 2026-05-09 (Wolf-Bug 'flag has no red — answer in EN doesn't match'):
        // vorher nur q.answer (DE) gecheckt → EN-Spieler hatten immer „falsch".
        // Jetzt beide Listen kombiniert → Team kann in beiden Sprachen tippen.
        const q = room.currentQuestion;
        if (q) {
          const splitAnswerList = (raw?: string): string[] =>
            (raw ?? '')
              .split(/[,;]/)
              .map(a => a.replace(/[…\.]+$/, '').trim())
              .filter(a => a.length > 0);
          const validAnswers = [
            ...splitAnswerList(q.answer),
            ...splitAnswerList(q.answerEn),
          ];
          const isMatch = validAnswers.some(valid => similarityScore(trimmed, valid) >= 0.8);
          if (isMatch) {
            // Treffer → akzeptieren + nächstes Team
            room.hotPotatoUsedAnswers.push(trimmed);
            room.hotPotatoAnswerAuthors.push(payload.teamId);
            qqHotPotatoMarkQualified(room, payload.teamId);

            const winnerPre = qqHotPotatoCheckWinner(room);
            if (winnerPre && winnerPre !== '') {
              qqClearHotPotatoTimer(room);
              qqRevealAnswer(room);
              qqClearBuzz(room);
              qqMarkCorrect(room, winnerPre);
              broadcast(io, payload.roomCode);
              ok(ack);
              return;
            }

            const next = qqHotPotatoNext(room, hotPotatoTurnExpired(payload.roomCode));
            const winner = qqHotPotatoCheckWinner(room);
            if (winner === '' || !next) {
              qqClearHotPotatoTimer(room);
              qqRevealAnswer(room);
              qqClearBuzz(room);
              qqMarkWrong(room);
            } else if (winner) {
              qqClearHotPotatoTimer(room);
              qqRevealAnswer(room);
              qqClearBuzz(room);
              qqMarkCorrect(room, winner);
            }
            broadcast(io, payload.roomCode);
            ok(ack);
            return;
          }
        }

        // Falsch geraten → nicht eliminieren, Timer läuft weiter, Team darf
        // weiter tippen. lastAnswer wird trotzdem gespeichert für UI-Feedback
        // ('Falsch, nochmal versuchen').
        room.hotPotatoLastAnswer = trimmed;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Manueller Rauswurf: Moderator kickt ein bestimmtes Team aus Hot Potato
    // (z.B. weil es offline ist oder gegen Regeln verstößt).
    socket.on('qq:hotPotatoEliminateTeam', (payload: { roomCode: string; teamId: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqHotPotatoForceEliminate(room, payload.teamId, hotPotatoTurnExpired(payload.roomCode));
        const winner = qqHotPotatoCheckWinner(room);
        if (winner === '' || !room.hotPotatoActiveTeamId) {
          qqClearHotPotatoTimer(room);
          qqRevealAnswer(room);
          qqMarkWrong(room);
        } else if (winner) {
          qqClearHotPotatoTimer(room);
          qqRevealAnswer(room);
          qqClearBuzz(room);
          qqMarkCorrect(room, winner);
        }
        broadcast(io, payload.roomCode);
        maybeAutoHotPotato(io, payload.roomCode);
        if (room.phase === 'PLACEMENT' && room.pendingFor) maybeAutoPlace(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Imposter / oneOfEight (moderator + team) ───────────────────────────
    socket.on('qq:imposterStart', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqImposterStart(room);
        broadcast(io, payload.roomCode);
        maybeAutoImposter(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:imposterChoose', (
      payload: { roomCode: string; teamId: string; statementIndex: number },
      ack?: unknown,
    ) => {
      try {
        assertOwnTeam(socket, payload.teamId);
        assertRateLimit(socket, 'qq:imposterChoose', 3);
        const room = ensureQQRoom(payload.roomCode);
        const result = qqImposterChoose(room, payload.teamId, payload.statementIndex);

        // 2026-05-02 (Mechanik-Audit P1 #13): Survivor-Filter beruecksichtigt
        // jetzt connected-Status. Vorher konnte ein disconnected Team als
        // Survivor markiert werden + Sieg + Placement zugewiesen kriegen
        // ohne dass jemand spielte. Disconnected-Survivor ist quasi 'leerer
        // Sieg'. Falls alle non-eliminated disconnected sind, faellt
        // markWrong (niemand bekommt das Feld).
        const surviveFilter = (id: string) =>
          !room.imposterEliminated.includes(id) && room.teams[id]?.connected;
        if (result.allWin) {
          qqRevealAnswer(room);
          const survivors = room.joinOrder.filter(surviveFilter);
          if (survivors.length > 0) qqMarkCorrect(room, survivors);
          else qqMarkWrong(room);
        } else if (result.eliminated) {
          const survivors = room.joinOrder.filter(surviveFilter);
          if (survivors.length <= 1) {
            qqRevealAnswer(room);
            if (survivors.length === 1) {
              qqMarkCorrect(room, survivors);
            } else {
              qqMarkWrong(room);
            }
          }
        }

        broadcast(io, payload.roomCode);
        maybeAutoImposter(io, payload.roomCode);
        if (room.phase === 'PLACEMENT' && room.pendingFor) maybeAutoPlace(io, payload.roomCode);
        if (typeof ack === 'function') (ack as AckFn)({ ok: true, ...result } as any);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:imposterEliminateTeam', (payload: { roomCode: string; teamId: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqImposterForceEliminate(room, payload.teamId);
        const survivors = room.joinOrder.filter(id => !room.imposterEliminated.includes(id));
        if (survivors.length <= 1) {
          qqRevealAnswer(room);
          if (survivors.length === 1) qqMarkCorrect(room, survivors);
          else qqMarkWrong(room);
        }
        broadcast(io, payload.roomCode);
        maybeAutoImposter(io, payload.roomCode);
        if (room.phase === 'PLACEMENT' && room.pendingFor) maybeAutoPlace(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Kick team (moderator) ──────────────────────────────────────────────
    socket.on('qq:kickTeam', (payload: { roomCode: string; teamId: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqKickTeam(room, payload.teamId);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Rename team (moderator) ────────────────────────────────────────────
    socket.on('qq:renameTeam', (payload: { roomCode: string; teamId: string; name: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqRenameTeam(room, payload.teamId, payload.name);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Mark funny answer (moderator) ──────────────────────────────────────
    socket.on('qq:markFunny', (payload: { roomCode: string; teamId: string; text: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const team = room.teams[payload.teamId];
        if (!team) { ok(ack); return; }
        const questionText = room.currentQuestion?.text ?? '';
        room.funnyAnswers.push({
          teamId: payload.teamId,
          teamName: team.name,
          text: payload.text,
          questionText,
        });
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Settings ───────────────────────────────────────────────────────────
    socket.on('qq:setTimer', (payload: QQSetTimerPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqSetTimerDuration(room, payload.durationSec);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:setAvatars', (payload: QQSetAvatarsPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        room.avatarsEnabled = payload.enabled;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:setMuted', (payload: QQSetMutedPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        room.musicMuted  = payload.muted;
        room.sfxMuted    = payload.muted;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:setMusicMuted', (payload: QQSetMusicMutedPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        room.musicMuted  = payload.muted;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:setSfxMuted', (payload: QQSetSfxMutedPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        room.sfxMuted    = payload.muted;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:setVolume', (payload: QQSetVolumePayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        room.volume = Math.max(0, Math.min(1, payload.volume));
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:updateSoundConfig', (payload: QQUpdateSoundConfigPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        room.soundConfig = payload.soundConfig;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:setEnable3D', (payload: QQSetEnable3DPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        room.enable3DTransition = payload.enabled;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Moderator signalisiert Setup fertig / rückgängig — nur im LOBBY-State relevant.
    socket.on('qq:setSetupDone', (payload: { roomCode: string; value: boolean }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        room.setupDone = !!payload.value;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-05-04 — Mod waehlt Avatar-Theme im Setup (Phase 1: nur State-Propagation,
    // Renderer respektiert es noch nicht — siehe avatarSets.ts im Frontend).
    socket.on('qq:setAvatarSet', (payload: { roomCode: string; avatarSetId: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const id = String(payload.avatarSetId ?? 'all');
        // White-list, damit kein bloedsinn ankommt. Default ist 'all' (Emoji,
        // freie Wahl). 'cozyCast' = klassische PNG-Avatare als opt-in.
        const allowed = ['cozy3d', 'all', 'cozyAnimals', 'cozyCast', 'halloween', 'christmas', 'pub', 'scifi', 'sport', 'tropical', 'fantasy', 'esc', 'cozyArena'];
        const newId = allowed.includes(id) ? id : 'cozy3d';
        const wasAll = room.avatarSetId === 'all';
        room.avatarSetId = newId;
        // Bei Wechsel ZU 'all': neu wuerfeln (Mod will Variation).
        // Bei Wechsel WEG von 'all': avatarSetEmojis bleibt erhalten — wenn der
        // Mod zurueck auf 'all' switcht, kommt der gleiche Mix wieder. Das ist
        // gewollt (Setup-Stabilitaet); sonst flackert's bei Hin-und-her-Switch.
        if (newId === 'all' && !wasAll) {
          room.avatarSetEmojis = getRandomDummyEmojis(8);
        }
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Buehnen-Skin (Theme) waehlen — analog qq:setAvatarSet ─────────────────
    // 2026-06-24: Mod waehlt beim Einrichten das Design. State-Propagation →
    // Beamer + /team rufen applyThemeVars(resolveTheme(themeId)). Default 'cozy'.
    socket.on('qq:setTheme', (payload: { roomCode: string; themeId: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const id = String(payload.themeId ?? 'cozy');
        const allowed = ['cozy', 'studioMono', 'softPop', 'neoBrutal'];
        room.themeId = allowed.includes(id) ? id : 'cozy';
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Placement ───────────────────────────────────────────────────────────
    socket.on('qq:placeCell', (payload: QQPlaceCellPayload, ack?: unknown) => {
      try {
        assertOwnTeam(socket, payload.teamId);
        assertRateLimit(socket, 'qq:placeCell', 3);
        const room = ensureQQRoom(payload.roomCode);
        // 2026-05-03 (Wolf-Bug 'Connections-Finale Steal->Place'): wenn der Bug
        // hier landet obwohl Wolf Steal gewaehlt hat, sehen wir's hier in den Logs.
        if (room.phase === 'CONNECTIONS_4X4' || room.connections?.phase === 'placement') {
          console.log('[conn-debug] qq:placeCell:', JSON.stringify({
            teamId: payload.teamId, row: payload.row, col: payload.col,
            pendingAction: room.pendingAction, placementsLeft: room.teamPhaseStats[payload.teamId]?.placementsLeft,
          }));
        }
        const result = qqPlaceCell(room, payload.teamId, payload.row, payload.col);
        // Connections-Placement: Cursor NUR weiterschalten wenn die ganze
        // Action fertig ist (sonst frisst PLACE_2 zwei Slots statt einen).
        // qqPlaceCell setzt pendingFor=null wenn finishPlacement gelaufen ist
        // (= action voll abgeschlossen). Bei placementsLeft>0 ist noch eine
        // 2. Setzung offen → kein Cursor-Advance.
        // B4 (2026-04-29): Grid-Full-Recovery — wenn nach 1. Cell von PLACE_2
        // keine freien Felder mehr existieren, restliche Slots verwerfen und
        // Action als verbraucht zaehlen (sonst haengt das System auf einem
        // unerfuellbaren PLACE_2). Gilt analog fuer pendingMultiSlot.
        if (room.phase === 'CONNECTIONS_4X4' && room.connections?.phase === 'placement') {
          const stats = room.teamPhaseStats[payload.teamId];
          let stillHasPlacements = (stats?.placementsLeft ?? 0) > 0
            || (stats?.pendingMultiSlot ?? 0) > 0;
          if (stillHasPlacements) {
            const hasFreeCell = room.grid.some(r => r.some(cell => cell.ownerId === null && !cell.sandLockTtl));
            if (!hasFreeCell) {
              // Reste verwerfen, Action gilt als verbraucht.
              if (stats) { stats.placementsLeft = 0; stats.pendingMultiSlot = 0; }
              stillHasPlacements = false;
            }
          }
          if (!stillHasPlacements) {
            qqConnectionsAfterPlacement(room);
          }
        }
        broadcast(io, payload.roomCode);
        // Falls noch Dummy in der placementQueue → weiter automatisch platzieren
        maybeAutoPlace(io, payload.roomCode);
        // Connections-Placement: nächster Dummy weitermachen lassen
        if (room.phase === 'CONNECTIONS_4X4' && room.connections?.phase === 'placement') {
          maybeAutoConnections(io, payload.roomCode);
        }
        if (typeof ack === 'function') (ack as AckFn)({ ok: true, ...result } as any);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:stealCell', (payload: QQStealCellPayload, ack?: unknown) => {
      try {
        assertOwnTeam(socket, payload.teamId);
        assertRateLimit(socket, 'qq:stealCell', 3);
        const room = ensureQQRoom(payload.roomCode);
        if (room.phase === 'CONNECTIONS_4X4' || room.connections?.phase === 'placement') {
          console.log('[conn-debug] qq:stealCell:', JSON.stringify({
            teamId: payload.teamId, row: payload.row, col: payload.col,
            pendingAction: room.pendingAction, placementsLeft: room.teamPhaseStats[payload.teamId]?.placementsLeft,
          }));
        }
        const result = qqStealCell(room, payload.teamId, payload.row, payload.col);
        // Connections-Placement: nach jedem Klauen Cursor weiterschalten.
        // (User-Wunsch: Finale-Aktionen = volle Round-3/4-Auswahl, also auch
        // STEAL kann im Finale die Aktions-Slots verbrauchen.)
        if (room.phase === 'CONNECTIONS_4X4' && room.connections?.phase === 'placement') {
          qqConnectionsAfterPlacement(room);
        }
        broadcast(io, payload.roomCode);
        maybeAutoPlace(io, payload.roomCode);
        if (room.phase === 'CONNECTIONS_4X4' && room.connections?.phase === 'placement') {
          maybeAutoConnections(io, payload.roomCode);
        }
        if (typeof ack === 'function') (ack as AckFn)({ ok: true, ...result } as any);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:chooseFreeAction', (payload: QQChooseFreeActionPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        // 2026-05-03 (Wolf-Bug 'Connections-Finale Steal->Place'): Diagnose-Logs
        // damit wir sehen was passiert wenn Wolf Steal waehlt aber Place greift.
        const isConn = room.phase === 'CONNECTIONS_4X4';
        const isFinalAct = isConn && room.connections?.phase === 'placement';
        const before = {
          phase: room.phase,
          connPhase: room.connections?.phase,
          gamePhaseIndex: room.gamePhaseIndex,
          pendingFor: room.pendingFor,
          pendingAction: room.pendingAction,
          actionRequested: payload.action,
          teamId: payload.teamId,
          placementsLeft: room.teamPhaseStats[payload.teamId]?.placementsLeft,
          gridFreeCells: room.grid.flat().filter(c => c.ownerId === null).length,
        };
        if (isFinalAct || isConn) {
          console.log('[conn-debug] qq:chooseFreeAction BEFORE:', JSON.stringify(before));
        }
        qqChooseFreeAction(room, payload.teamId, payload.action);
        if (isFinalAct || isConn) {
          console.log('[conn-debug] qq:chooseFreeAction AFTER:', JSON.stringify({
            pendingFor: room.pendingFor,
            pendingAction: room.pendingAction,
            placementsLeft: room.teamPhaseStats[payload.teamId]?.placementsLeft,
          }));
        }
        broadcast(io, payload.roomCode);
        maybeAutoPlace(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Moderator überspringt das aktuell pending Team (Grid voll & Team will/kann nicht klauen).
    socket.on('qq:skipCurrentTeam', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqSkipCurrentPlacement(room);
        broadcast(io, payload.roomCode);
        maybeAutoPlace(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:comebackChoice', (payload: QQComebackChoicePayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqApplyComebackChoice(room, payload.teamId, payload.action);
        broadcast(io, payload.roomCode);
        maybeAutoPlace(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:comebackUndo', (payload: { roomCode: string; teamId: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqUndoComebackChoice(room, payload.teamId);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:swapCells', (payload: QQSwapCellsPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqSwapCells(
          room, payload.teamId,
          payload.rowA, payload.colA,
          payload.rowB, payload.colB
        );
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Phase 4: Tauschen (1 own + 1 enemy, 2-step)
    socket.on('qq:swapOneCell', (payload: QQSwapOneCellPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const result = qqSwapOneCell(room, payload.teamId, payload.row, payload.col);
        // Connections-Placement: Cursor erst NACH dem 2. Swap-Step advancen
        // (result.done === true). Nach 1. Step (own cell) noch warten.
        if (result.done && room.phase === 'CONNECTIONS_4X4' && room.connections?.phase === 'placement') {
          qqConnectionsAfterPlacement(room);
        }
        broadcast(io, payload.roomCode);
        if (result.done && room.phase === 'CONNECTIONS_4X4' && room.connections?.phase === 'placement') {
          maybeAutoConnections(io, payload.roomCode);
        }
        if (typeof ack === 'function') (ack as AckFn)({ ok: true, ...result } as any);
      } catch (e) { fail(ack, e); }
    });

    // Phase 3/4: Einfrieren (1 own cell, 1 question)
    socket.on('qq:freezeCell', (payload: QQFreezeCellPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqFreezeCell(room, payload.teamId, payload.row, payload.col);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Phase 4: Stapeln (eigenes Feld, permanent) ODER Connections-Finale:
    // Stapel-Bonus (multi-stack erlaubt, +1 Pkt pro Stapel).
    // 2026-05-05 (Wolf-Konzept): pendingAction='STAPEL_BONUS' route geht in
    // qqStapelBonusCell, regulaeres STAPEL_1 weiter in qqStuckCell.
    socket.on('qq:stapelCell', (payload: QQStapelCellPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (room.pendingAction === 'STAPEL_BONUS') {
          qqStapelBonusCell(room, payload.teamId, payload.row, payload.col);
        } else {
          qqStuckCell(room, payload.teamId, payload.row, payload.col);
        }
        if (room.phase === 'CONNECTIONS_4X4' && room.connections?.phase === 'placement') {
          qqConnectionsAfterPlacement(room);
        }
        broadcast(io, payload.roomCode);
        if (room.phase === 'CONNECTIONS_4X4' && room.connections?.phase === 'placement') {
          maybeAutoConnections(io, payload.roomCode);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-05-25 (Wolf Final-Wager v4): Team picked eigene Cell waehrend
    // FINAL_REVEAL, legt 1 Stamp aus der pending-Queue. Server-validated.
    socket.on('qq:finalRevealPlaceStack', (payload: { roomCode: string; teamId: string; row: number; col: number }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqFinalRevealPlaceStack(room, payload.teamId, payload.row, payload.col);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Phase 3: Bann (Gegner-/Leerfeld → 3 Fragen blockiert, frei wählbar pro Frage)
    socket.on('qq:sandLockCell', (payload: QQSandLockCellPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqSandLockCell(room, payload.teamId, payload.row, payload.col);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Phase 3: Schild (1 spezifisches eigenes Feld, max 2 pro Team, hält bis Spielende).
    // Neuer Event-Name `qq:shieldCell` mit row/col; alter `qq:shieldCluster` bleibt als
    // Backward-Compat (Payload jetzt aliased auf {row,col}-Variante).
    function shieldHandler(payload: QQShieldCellPayload, ack?: unknown) {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqShieldCell(room, payload.teamId, payload.row, payload.col);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    }
    socket.on('qq:shieldCell',    shieldHandler);
    socket.on('qq:shieldCluster', shieldHandler);

    // ── Rules presentation ──────────────────────────────────────────────────
    socket.on('qq:startRules', (payload: QQStartRulesPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqStartRules(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:rulesNext', (payload: QQRulesNextPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqRulesNext(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:rulesPrev', (payload: QQRulesPrevPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqRulesPrev(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:rulesFinish', (payload: QQRulesFinishPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        // rulesFinish → TEAMS_REVEAL (one-time epic team intro)
        qqStartTeamsReveal(room);
        room.rulesSlideIndex = 0;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:teamsRevealFinish', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqFinishTeamsReveal(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:showThanks', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (room.phase !== 'GAME_OVER') throw new Error('Nur von GAME_OVER aus');
        room.phase = 'THANKS';
        room.lastActivityAt = Date.now();
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Utility ─────────────────────────────────────────────────────────────
    socket.on('qq:setLanguage', (payload: QQSetLanguagePayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        room.language = payload.language;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-05-24 (Wolf-Wunsch 'Back-Button als Gegensatz zum Weiter-Button'):
    // Slide zurueck (Shift+Space / Backspace) — decrementiert den passenden
    // Step-Counter je nach Phase. Min ist 0 (bzw. -2 fuer Rules wegen
    // Willkommen/Intro-Folien). Nur fuer slide-basierte Phasen, fuer
    // PLACEMENT/QUESTION_ACTIVE bleibt Ctrl+Z (qqUndoLastAction) zustaendig.
    socket.on('qq:goBackSlide', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqGoBackSlide(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-05-24 (Wolf-Bug 'Bots laufen weiter wenn Autoplay pausiert'):
    // Server-State-Flag das Bot-Submits + Bot-Placements ueber alle
    // maybeAuto*-Helper guards. Frontend-Autoplay-Toggle ist davon entkoppelt
    // (lokales localStorage). Toggle ist idempotent (sendet target=true/false).
    // 2026-05-25 (Wolf 'mod-test-modus'): Test-Mode-Flag. Wenn true, wird
    // persistGameResult uebersprungen (kein Recap-Eintrag von Test-Spielen).
    socket.on('qq:setTestMode', (payload: { roomCode: string; value: boolean }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        (room as any)._testMode = !!payload.value;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:setBotsPaused', (payload: { roomCode: string; paused: boolean }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        (room as any).botsPaused = !!payload.paused;
        broadcast(io, payload.roomCode);
        // Wenn unpaused + Phase erlaubt Bot-Action: gleich starten.
        if (!payload.paused) {
          if (room.phase === 'QUESTION_ACTIVE') maybeAutoSimulateAnswers(io, payload.roomCode);
          else if (room.phase === 'PLACEMENT') maybeAutoPlace(io, payload.roomCode);
          else if (room.phase === 'COMEBACK_CHOICE') maybeAutoComebackChoice(io, payload.roomCode);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:resetRoom', (payload: QQResetRoomPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqResetRoom(room);
        deleteSavedRoom(payload.roomCode).catch(() => {});
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Final-Wager-Mechanik (Wolf 2026-05-09): vor letzter Spiel-Phase Bets setzen ──
    socket.on('qq:startFinalBetting', (payload: QQStartFinalBettingPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqStartFinalBetting(room);
        broadcast(io, payload.roomCode);
        // Dummy-Teams setzen ihre Bets automatisch (random Felder/Targets)
        maybeAutoFinalBets(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:submitFinalBet', (payload: QQSubmitFinalBetPayload, ack?: unknown) => {
      try {
        assertOwnTeam(socket, payload.teamId);
        assertRateLimit(socket, 'qq:submitFinalBet', 3);
        const room = ensureQQRoom(payload.roomCode);
        qqSubmitFinalBet(room, payload.teamId, payload.bet);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:finishFinalBetting', (payload: QQFinishFinalBettingPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqFinishFinalBetting(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-05-24 (Wolf-Live-Test): Mod-Space dismissed Final-Tipp-Intro-Slide.
    socket.on('qq:finishFinalBettingIntro', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqFinishFinalBettingIntro(room);
        broadcast(io, payload.roomCode);
        // 2026-05-24 (Wolf-Bug 'bots betten nicht 0/8'): zusaetzliche
        // Sicherheits-Trigger fuer Bot-Bets. Falls qqStartFinalBetting den
        // Auto-Trigger verpasst hat (Race-Condition mit qqBeginPhase-Pfad),
        // wird er hier nachgeholt sobald Intro durch ist.
        maybeAutoFinalBets(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:resolveFinalBets', (payload: QQResolveFinalBetsPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqResolveFinalBets(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:setFinalWagerEnabled', (payload: QQSetFinalWagerEnabledPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqSetFinalWagerEnabled(room, !!payload.enabled);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Flyover (Beamer 3D cinematic orbit, triggered from moderator) ──────
    socket.on('qq:flyover', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        io.to(payload.roomCode).emit('qq:flyover');
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── CozyGames (Mini-Game-Phase) — 2026-05-17 ──────────────────────────
    // Phase 5: Manueller Mod-Trigger. Auto-Flow nach Runde 1 ist Phase 6.
    socket.on('qq:cozyGameStart', (payload: { roomCode: string; slotKind?: 'roundPause' | 'finalSlot' }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqCozyGameStart(room, payload.slotKind ?? 'roundPause');
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-05-17 (Wolf Sequence-Mode): Helper für mode-aware onExpire.
    // parallel: Timer-Ende → WINNER_SELECT (alle gleichzeitig gespielt).
    // sequence: Timer-Ende → nur Timer stoppen, Mod muss „Nächstes Team" klicken.
    const makeCozyGameOnExpire = (roomCode: string) => () => {
      const live = getQQRoom(roomCode);
      if (!live || !live.cozyGame) return;
      if (live.cozyGame.playMode === 'sequence') {
        if (live._cozyGameTimerHandle) {
          clearTimeout(live._cozyGameTimerHandle);
          live._cozyGameTimerHandle = null;
        }
        live.cozyGame.gameEndsAt = null;
      } else {
        qqCozyGameStopGame(live);
      }
      broadcast(io, roomCode);
    };

    socket.on('qq:cozyGameAdvance', async (payload: { roomCode: string }, ack?: unknown) => {
      // Mod-Space-Press: schaltet von der aktuellen Sub-Phase weiter.
      try {
        const room = ensureQQRoom(payload.roomCode);
        const cg = room.cozyGame;
        if (!cg) { ok(ack); return; }
        if (cg.phase === 'INTRO') {
          qqCozyGameAdvanceFromIntro(room);
          // 2026-05-17 v2 (Wolf 'langsamer'): Auto-Spin 4s → 6.5s
          // matched zu CozyGameView CSS-Spin-Dauer (siehe WheelView).
          setTimeout(() => {
            const live = getQQRoom(payload.roomCode);
            if (!live || !live.cozyGame || live.cozyGame.phase !== 'WHEEL_SPIN') return;
            qqCozyGameWheelLanded(live);
            broadcast(io, payload.roomCode);
          }, 6500);
        } else if (cg.phase === 'WHEEL_RESULT') {
          // 2026-05-17 (Wolf Sequence-Mode): parallel-Flag des aktiven Spiels
          // aus DB ziehen → playMode bestimmen. Fallback bei DB-Fehler: parallel.
          let parallel = true;
          try {
            const allGames = await getAllCozyGamesFromDB();
            const active = (allGames ?? []).find((g: any) => g.id === cg.activeGameId);
            parallel = active?.parallel !== false;
          } catch { /* fall back to parallel */ }
          const playMode = parallel ? 'parallel' : 'sequence';
          qqCozyGameStartGame(room, playMode, makeCozyGameOnExpire(payload.roomCode));
        } else if (cg.phase === 'GAME_ACTIVE') {
          // Mod stoppt früher (Hybrid-Timer-Stop). In sequence-mode überspringt
          // das die übrigen Teams direkt zu WINNER_SELECT — bewusst (Notlösung
          // wenn Mod abbrechen will). Reguläres Vorrücken via cozyGameNextSequenceTeam.
          qqCozyGameStopGame(room);
        } else if (cg.phase === 'WINNER_SELECT' && cg.winnerTeamIds.length > 0) {
          // 2026-05-17 v9 (Wolf 'erst Avatar zeigen, dann Mod-Weiter zum Grid'):
          // Mod hat „Weiter zum Grid" gedrückt → Action-Pipeline starten +
          // maybeAutoPlace (Dummies setzen automatisch).
          qqCozyGameAdvanceToPlacement(room);
          broadcast(io, payload.roomCode);
          if (room.phase === 'PLACEMENT' && room.pendingFor) {
            maybeAutoPlace(io, payload.roomCode);
          }
          ok(ack);
          return;
        }
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-05-17 (Wolf Sequence-Mode): Mod-Trigger für „Nächstes Team".
    socket.on('qq:cozyGameNextSequenceTeam', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqCozyGameNextSequenceTeam(room, makeCozyGameOnExpire(payload.roomCode));
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // 2026-05-17 (Wolf Timer-Controls): Pause / Resume / Reset / Adjust (±sec).
    socket.on('qq:cozyGameTimerPause', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqCozyGameTimerPause(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });
    socket.on('qq:cozyGameTimerResume', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqCozyGameTimerResume(room, makeCozyGameOnExpire(payload.roomCode));
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });
    socket.on('qq:cozyGameTimerReset', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqCozyGameTimerReset(room, makeCozyGameOnExpire(payload.roomCode));
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });
    socket.on('qq:cozyGameTimerAdjust', (payload: { roomCode: string; deltaSec: number }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqCozyGameTimerAdjust(room, payload.deltaSec, makeCozyGameOnExpire(payload.roomCode));
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:cozyGameSelectWinner', (payload: { roomCode: string; teamIds: string[] }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqCozyGameSelectWinner(room, payload.teamIds ?? []);
        broadcast(io, payload.roomCode);
        // 2026-05-17 v9 (Wolf 'Mod soll Weiter drücken wie sonst auch im Flow'):
        // Kein Auto-Advance mehr. Mod sieht Winner-Avatar auf /beamer und
        // klickt manuell „Weiter zum Grid" — Handler in qq:cozyGameAdvance
        // (WINNER_SELECT-Branch).
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:cozyGameCancel', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqCozyGameCancel(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── CozyGuessr Map Reveal Step (moderator -> beamer, progressiv) ──────
    // Flow:
    //   step 0 → 1  (Moderator): Target-Pin einblenden, danach startet Auto-Advance.
    //   step 1 → 2..1+N (automatisch, alle MAP_AUTO_MS): Team-Pins nacheinander.
    //   step 1+N → 1+N+1 (Moderator): Ranking-Panel einblenden.
    // Manuelles Klicken während der Auto-Phase bricht den Timer ab und springt weiter.
    const MAP_AUTO_MS = 2400;
    const scheduleMapAutoAdvance = (roomCode: string) => {
      const live = getQQRoom(roomCode);
      if (!live) return;
      if (live._mapRevealTimerHandle) { clearTimeout(live._mapRevealTimerHandle); live._mapRevealTimerHandle = null; }
      const q = live.currentQuestion;
      const isMap = q?.category === 'BUNTE_TUETE' && (q as any).bunteTuete?.kind === 'map';
      if (!isMap || live.phase !== 'QUESTION_REVEAL') return;
      const validPinCount = live.answers.filter(a => {
        const parts = String(a.text ?? '').split(',');
        const lat = Number(parts[0]);
        const lng = Number(parts[1]);
        return Number.isFinite(lat) && Number.isFinite(lng);
      }).length;
      // Auto-Advance nur zwischen step 1 und 1+validPinCount-1 (letzter Pin),
      // danach wartet der Moderator aufs Ranking.
      const allPinsStep = 1 + validPinCount;
      if (live.mapRevealStep >= allPinsStep) return;
      live._mapRevealTimerHandle = setTimeout(() => {
        const l2 = getQQRoom(roomCode);
        if (!l2) return;
        l2._mapRevealTimerHandle = null;
        const q2 = l2.currentQuestion;
        const isMap2 = q2?.category === 'BUNTE_TUETE' && (q2 as any).bunteTuete?.kind === 'map';
        if (!isMap2 || l2.phase !== 'QUESTION_REVEAL') return;
        if (l2.mapRevealStep < allPinsStep) {
          l2.mapRevealStep += 1;
          broadcast(io, roomCode);
          if (l2.mapRevealStep < allPinsStep) {
            scheduleMapAutoAdvance(roomCode);
          }
        }
      }, MAP_AUTO_MS);
    };

    socket.on('qq:mapRevealStep', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const q = room.currentQuestion;
        const isMap = q?.category === 'BUNTE_TUETE' && (q as any).bunteTuete?.kind === 'map';
        if (room.phase !== 'QUESTION_REVEAL' || !isMap) { ok(ack); return; }
        const validPinCount = room.answers.filter(a => {
          const parts = String(a.text ?? '').split(',');
          const lat = Number(parts[0]);
          const lng = Number(parts[1]);
          return Number.isFinite(lat) && Number.isFinite(lng);
        }).length;
        const maxStep = 1 + validPinCount + 1;
        // Manuelles Advance bricht ggf. laufenden Auto-Timer ab.
        if (room._mapRevealTimerHandle) { clearTimeout(room._mapRevealTimerHandle); room._mapRevealTimerHandle = null; }
        if (room.mapRevealStep < maxStep) {
          room.mapRevealStep += 1;
          broadcast(io, payload.roomCode);
          // Nach step 1 (Target gezeigt) Auto-Advance für Pins starten.
          // Nach allPinsStep (alle Pins) stoppen — Moderator entscheidet über Ranking.
          if (room.mapRevealStep >= 1 && room.mapRevealStep < 1 + validPinCount) {
            scheduleMapAutoAdvance(payload.roomCode);
          }
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Comeback Intro Step (moderator steuert Erklärung Schritt für Schritt) ─
    // Steps: 0 = COMEBACK + So-funktioniert's-Card (H/L-Mechanik unter dem Title),
    //        1 = Teams + Leader-Target (welche Teams klauen wem).
    // Space-Druck bei Step 1 startet das H/L-Mini-Game (phase='question').
    // 2026-05-06 v2 (Wolf 'so funktionierts unter COMEBACK-Title schreiben,
    // dann nur noch Teams+Leader-Seite, die separate H/L-Erklaer-Seite kann weg').
    socket.on('qq:comebackIntroStep', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (room.phase !== 'COMEBACK_CHOICE') { ok(ack); return; }
        const maxStep = 1;
        if (room.comebackIntroStep < maxStep) {
          room.comebackIntroStep += 1;
          broadcast(io, payload.roomCode);
        } else if (room.comebackHL && room.comebackHL.phase === 'intro') {
          // Letzter Intro-Step → H/L-Mini-Game starten.
          qqComebackHLStartRound(room);
          broadcast(io, payload.roomCode);
          scheduleHLAutoReveal(io, payload.roomCode);
          maybeDummyAnswerHL(io, payload.roomCode);
        } else {
          // BUG-FIX 2026-04-25: H/L laeuft schon (phase !== 'intro') oder ist
          // unerwartet null. KEINE Legacy-Auto-Steal mehr ausloesen — dadurch
          // wurde frueher das Grid geoeffnet, obwohl das Team falsch geraten
          // hatte und keine Klau-Punkte verdient hat. Stattdessen: no-op.
          // Der Moderator-Space-Handler ruft fuer aktive H/L-Phasen
          // (question/reveal) eh `qq:comebackHLStep`, nicht intro.
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Comeback H/L: Team-Antwort ('higher' | 'lower') ─────────────────────
    socket.on('qq:comebackHLAnswer', (
      payload: { roomCode: string; teamId: string; choice: 'higher' | 'lower' },
      ack?: unknown
    ) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqComebackHLSubmitAnswer(room, payload.teamId, payload.choice);
        broadcast(io, payload.roomCode);
        // Wenn alle tied-last Teams geantwortet haben, Auto-Reveal nach kurzem
        // „allAnswered"-Puffer (gibt Beamer Zeit, das Team-Ensemble-Pop zu zeigen).
        const hl = room.comebackHL;
        if (hl && hl.phase === 'question' && hl.teamIds.every(id => hl.answers[id] != null)) {
          clearHLAutoReveal(room);
          room._comebackHLTimerHandle = setTimeout(() => {
            const live = getQQRoom(payload.roomCode);
            if (!live || !live.comebackHL) return;
            live._comebackHLTimerHandle = null;
            if (live.comebackHL.phase !== 'question') return;
            try {
              qqComebackHLReveal(live);
              broadcastQQ(io, payload.roomCode);
            } catch { /* ignore */ }
          }, 1200);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Comeback H/L: Moderator-Step (Space) ────────────────────────────────
    // Steuert den H/L-Flow:
    //   phase='question'  → Reveal aufdecken (korrekte Antwort + Winnings)
    //   phase='reveal'    → naechste Runde ODER Uebergang zu Klau-Phase
    //   phase='steal'     → (keine Action, wird ueber qq:qqStealCell gesteuert)
    socket.on('qq:comebackHLStep', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const hl = room.comebackHL;
        if (!hl) { ok(ack); return; }
        // 2026-05-02 (Mechanik-Audit P1 #20): Mod-Doppelklick-Schutz - Wolf
        // springt sonst direkt von question ueber reveal in next-round, sieht
        // Reveal-Animation gar nicht. 600ms-Debounce zwischen Steps.
        const HL_STEP_DEBOUNCE_MS = 600;
        const now = Date.now();
        const lastStepAt = (room as any)._lastHLStepAt ?? 0;
        if (now - lastStepAt < HL_STEP_DEBOUNCE_MS) {
          ok(ack);
          return;
        }
        (room as any)._lastHLStepAt = now;
        if (hl.phase === 'question') {
          // Manueller Reveal durch Moderator → Auto-Reveal-Timer clearen.
          clearHLAutoReveal(room);
          qqComebackHLReveal(room);
          broadcast(io, payload.roomCode);
        } else if (hl.phase === 'reveal') {
          qqComebackHLAdvance(room);
          broadcast(io, payload.roomCode);
          // Direkt im Anschluss: neue H/L-Runde → Dummy-Antworten + Auto-Reveal.
          // Oder: Steal-Phase mit Dummy-Stealer → Auto-Steal.
          if (room.comebackHL && room.comebackHL.phase === 'question') {
            scheduleHLAutoReveal(io, payload.roomCode);
            maybeDummyAnswerHL(io, payload.roomCode);
          } else if ((room.phase as string) === 'PLACEMENT' && room.pendingFor) {
            maybeAutoPlace(io, payload.roomCode);
          }
          // 2026-05-09 (Wolf-Bug 'Bet-Phase wurde übersprungen'): wenn Comeback
          // beendet ist und qqBeginPhase auto auf FINAL_BETTING geschaltet hat,
          // Bots auto-betten lassen — sonst sitzt das Spiel fest.
          else if ((room.phase as string) === 'FINAL_BETTING') {
            maybeAutoFinalBets(io, payload.roomCode);
          }
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Comeback H/L: Moderator skippt Mini-Game komplett (Debug/Balance-Korrektur) ─
    socket.on('qq:comebackHLSkip', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (room.comebackHL) {
          clearHLAutoReveal(room);
          qqComebackFinishAllAndGoToFinale(room);
          broadcast(io, payload.roomCode);
          // 2026-05-09 (Wolf-Bug): Skip-Comeback führt direkt in Final-Phase.
          // Wenn Bet-Mode an, Bots auto-betten lassen.
          if ((room.phase as string) === 'FINAL_BETTING') {
            maybeAutoFinalBets(io, payload.roomCode);
          }
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Comeback H/L: Timer-Wert setzen (Moderator) ─────────────────────────
    socket.on('qq:comebackHLTimer', (payload: { roomCode: string; seconds: number }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const s = Math.max(3, Math.min(60, Math.round(payload.seconds)));
        room.comebackHLTimerSec = s;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 4×4 Connections (Finalrunde)
    // ═══════════════════════════════════════════════════════════════════════

    /** Moderator startet Connections — landet in phase=CONNECTIONS_4X4, sub='intro'. */
    socket.on('qq:connectionsStart', (
      payload: { roomCode: string; payload: QQConnectionsPayload; durationSec?: number; maxFailedAttempts?: number },
      ack?: unknown
    ) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqConnectionsStart(room, payload.payload, {
          durationSec: payload.durationSec,
          maxFailedAttempts: payload.maxFailedAttempts,
        });
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Moderator: intro → active (Spielzeit + Timer-Start). */
    socket.on('qq:connectionsBegin', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqConnectionsBegin(room, () => {
          // Auto-Reveal bei Timer-Ende
          const r = getQQRoom(payload.roomCode);
          if (r && r.connections && r.connections.phase === 'active') {
            qqConnectionsToReveal(r);
            stopConnectionsAiTimers(payload.roomCode);
            broadcast(io, payload.roomCode);
          }
        });
        broadcast(io, payload.roomCode);
        // Dummies anschubsen
        maybeAutoConnections(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Team togglet eine Item-Auswahl. */
    socket.on('qq:connectionsSelectItem', (
      payload: { roomCode: string; teamId: string; item: string },
      ack?: unknown
    ) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqConnectionsSelectItem(room, payload.teamId, payload.item);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Team submittet die aktuelle 4-Item-Auswahl. */
    socket.on('qq:connectionsSubmit', (
      payload: { roomCode: string; teamId: string },
      ack?: unknown
    ) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const result = qqConnectionsSubmitGroup(room, payload.teamId);
        // Auto-End wenn ALLE Teams fertig (4 Gruppen oder lockout) → reveal
        if (qqConnectionsAllDone(room) && room.connections?.phase === 'active') {
          qqConnectionsToReveal(room);
        }
        broadcast(io, payload.roomCode);
        if (typeof ack === 'function') (ack as AckFn)({ ok: true, ...result } as any);
      } catch (e) { fail(ack, e); }
    });

    /** Moderator-Force-Reveal (vor Timer-Ende). */
    socket.on('qq:connectionsForceReveal', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (room.connections && room.connections.phase === 'active') {
          qqConnectionsToReveal(room);
          stopConnectionsAiTimers(payload.roomCode);
          broadcast(io, payload.roomCode);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Moderator: reveal → placement (Top-Team setzt zuerst). */
    socket.on('qq:connectionsToPlacement', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (room.connections && room.connections.phase === 'reveal') {
          qqConnectionsToPlacement(room);
          broadcast(io, payload.roomCode);
          // Wenn das Top-Team ein Dummy ist, sofort losziehen lassen
          maybeAutoConnections(io, payload.roomCode);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Moderator: Connections beenden → State löschen + zurück zur normalen Phase. */
    socket.on('qq:connectionsClear', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqConnectionsClear(room);
        stopConnectionsAiTimers(payload.roomCode);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Moderator: 4×4 abbrechen und direkt zu GAME_OVER springen. */
    socket.on('qq:connectionsSkipToGameOver', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (room.phase === 'CONNECTIONS_4X4') {
          qqConnectionsClear(room);
          stopConnectionsAiTimers(payload.roomCode);
          room.phase = 'GAME_OVER';
          broadcast(io, payload.roomCode);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Default-Timer / Max-Fails einstellen (im Setup). */
    socket.on('qq:connectionsSettings', (
      payload: { roomCode: string; timerSec?: number; maxFails?: number },
      ack?: unknown
    ) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (typeof payload.timerSec === 'number') {
          room.connectionsTimerSec = Math.max(
            QQ_CONNECTIONS_TIMER_MIN_SEC,
            Math.min(QQ_CONNECTIONS_TIMER_MAX_SEC, Math.round(payload.timerSec))
          );
        }
        if (typeof payload.maxFails === 'number') {
          room.connectionsMaxFails = Math.max(0, Math.min(10, Math.round(payload.maxFails)));
        }
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 4 gewinnt / Only Connect — BunteTüete Sub-Mechanik
    // ═══════════════════════════════════════════════════════════════════════

    /** Team submittet einen Tipp. */
    socket.on('qq:onlyConnectGuess', (
      payload: { roomCode: string; teamId: string; text: string },
      ack?: unknown
    ) => {
      try {
        assertOwnTeam(socket, payload.teamId);
        assertRateLimit(socket, 'qq:onlyConnectGuess', 5);
        const room = ensureQQRoom(payload.roomCode);
        const result = qqOnlyConnectSubmitGuess(room, payload.teamId, payload.text);
        // Multi-Winner: wenn alle Teams entweder richtig oder gesperrt sind,
        // automatisch zu QUESTION_REVEAL überführen + Winner markieren. So greift
        // die Standard-Pipeline (Placement-Queue, Aktionen, Autoplay) automatisch.
        // 2026-04-28 Gate: AutoFinish erst ab Hint 2 (idx=1) — verhindert
        // Insta-End wenn Dummies in Test-Lobby alle in <5s schon locked sind.
        // 2026-04-29 (B2): zusaetzlich Min-Duration 2.5s gegen weiteren Insta-End.
        // Falls aktuell geblockt: Hint-Tick triggert AutoFinish beim naechsten Advance.
        if (qqOnlyConnectCanAutoFinish(room)) {
          qqOnlyConnectAutoFinish(room);
        }
        broadcast(io, payload.roomCode);
        if (typeof ack === 'function') (ack as AckFn)({ ok: true, ...result } as any);
      } catch (e) { fail(ack, e); }
    });

    /** Team schaltet seinen nächsten Hinweis frei (per-team Modell). */
    socket.on('qq:onlyConnectAdvanceTeamHint', (
      payload: { roomCode: string; teamId: string },
      ack?: unknown
    ) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqOnlyConnectAdvanceTeamHint(room, payload.teamId);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Moderator: alle restlichen Hinweise aufdecken + zu Reveal überführen. */
    socket.on('qq:onlyConnectRevealAll', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqOnlyConnectRevealAll(room);
        // Direkt zur Standard-Reveal-Phase weiter, damit Autoplay/Pipeline greift
        qqOnlyConnectAutoFinish(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Moderator: Hint-Timer-Sekunden setzen. */
    socket.on('qq:onlyConnectHintTimer', (
      payload: { roomCode: string; seconds: number },
      ack?: unknown
    ) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const s = Math.max(5, Math.min(60, Math.round(payload.seconds)));
        room.onlyConnectHintDurationSec = s;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Bluff (Fibbage-Style) — BunteTüete Sub-Mechanik
    // ═══════════════════════════════════════════════════════════════════════

    /** Team submittet seinen Bluff-Text (write-Phase). */
    socket.on('qq:bluffSubmit', (
      payload: { roomCode: string; teamId: string; text: string },
      ack?: unknown
    ) => {
      try {
        assertOwnTeam(socket, payload.teamId);
        assertRateLimit(socket, 'qq:bluffSubmit', 5);
        const room = ensureQQRoom(payload.roomCode);
        qqBluffSubmit(room, payload.teamId, payload.text);
        // Wenn alle (echten) Teams submitted haben, früher zur nächsten Phase
        if (room.bluffPhase === 'write' && qqBluffAllSubmitted(room)) {
          qqBluffAdvanceFromWrite(room, () => bluffVoteTimeout(io, payload.roomCode));
          if ((room.bluffPhase as string) === 'vote') maybeAutoBluffVote(io, payload.roomCode);
        }
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Moderator: Force-Advance write → review/vote (z.B. Timer skippen). */
    socket.on('qq:bluffForceAdvanceWrite', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (room.bluffPhase === 'write') {
          qqBluffAdvanceFromWrite(room, () => bluffVoteTimeout(io, payload.roomCode));
          broadcast(io, payload.roomCode);
          if ((room.bluffPhase as string) === 'vote') maybeAutoBluffVote(io, payload.roomCode);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Moderator: Bluff-Submission ablehnen (review-Phase). */
    socket.on('qq:bluffReject', (
      payload: { roomCode: string; teamId: string; rejected: boolean },
      ack?: unknown
    ) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (payload.rejected) {
          qqBluffRejectSubmission(room, payload.teamId);
        } else {
          qqBluffUnrejectSubmission(room, payload.teamId);
        }
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Moderator: Review fertig → Vote-Phase. */
    socket.on('qq:bluffFinishReview', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (room.bluffPhase === 'review') {
          qqBluffFinishReview(room, () => bluffVoteTimeout(io, payload.roomCode));
          broadcast(io, payload.roomCode);
          maybeAutoBluffVote(io, payload.roomCode);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Team votet für eine Option. */
    socket.on('qq:bluffVote', (
      payload: { roomCode: string; teamId: string; optionId: string },
      ack?: unknown
    ) => {
      try {
        assertOwnTeam(socket, payload.teamId);
        assertRateLimit(socket, 'qq:bluffVote', 3);
        const room = ensureQQRoom(payload.roomCode);
        const result = qqBluffVote(room, payload.teamId, payload.optionId);
        if (result.ok && room.bluffPhase === 'vote' && qqBluffAllVoted(room)) {
          qqBluffAdvanceFromVote(room);
        }
        broadcast(io, payload.roomCode);
        if (typeof ack === 'function') (ack as AckFn)({ ok: result.ok, error: result.reason } as any);
      } catch (e) { fail(ack, e); }
    });

    /** Moderator: Force-Advance vote → reveal. */
    socket.on('qq:bluffForceAdvanceVote', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (room.bluffPhase === 'vote') {
          qqBluffAdvanceFromVote(room);
          broadcast(io, payload.roomCode);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Moderator: Mod-Review-Toggle und Phasen-Timer einstellen (Setup). */
    socket.on('qq:bluffSettings', (
      payload: { roomCode: string; writeSec?: number; voteSec?: number; modReview?: boolean },
      ack?: unknown
    ) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (typeof payload.writeSec === 'number') {
          room.bluffWriteDurationSec = Math.max(10, Math.min(120, Math.round(payload.writeSec)));
        }
        if (typeof payload.voteSec === 'number') {
          room.bluffVoteDurationSec = Math.max(10, Math.min(120, Math.round(payload.voteSec)));
        }
        if (typeof payload.modReview === 'boolean') {
          room.bluffModeratorReview = payload.modReview;
        }
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    /** Setup-Toggles: Finale spielen ja/nein, Reihenfolge zufällig ja/nein. */
    socket.on('qq:setQuizOptions', async (
      payload: { roomCode: string; connectionsEnabled?: boolean; shuffleQuestionsInRound?: boolean; cozyGamesEnabled?: boolean; cozyGamesPool?: string[]; comebackEnabled?: boolean; largeGroupMode?: boolean; nestedTeams?: boolean; formatSelected?: boolean },
      ack?: unknown
    ) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (typeof payload.connectionsEnabled === 'boolean') {
          room.connectionsEnabled = payload.connectionsEnabled;
        }
        if (typeof payload.shuffleQuestionsInRound === 'boolean') {
          room.shuffleQuestionsInRound = payload.shuffleQuestionsInRound;
        }
        if (typeof payload.comebackEnabled === 'boolean') {
          room.comebackEnabled = payload.comebackEnabled;
        }
        // 2026-07-02 (Wolf): Mega Event = IMMER genestet (flaches 25er verworfen).
        // largeGroupMode und nestedTeams sind gekoppelt (large ⟺ nested).
        if (typeof payload.largeGroupMode === 'boolean') {
          room.largeGroupMode = payload.largeGroupMode;
        }
        if (payload.nestedTeams === true) {
          room.largeGroupMode = true;
        }
        room.nestedTeams = room.largeGroupMode;
        // Hinweis: Cozy Arena erzwingt KEIN Avatar-Set — die Fraktions-Wappen
        // erscheinen, weil team.emoji auf den Wappen-Slug (qqMegaFactionSlug)
        // gesetzt wird (höchste Prio in getAvatarDisplay). So bleibt Farbe⟷Wappen
        // immer kohärent (kein „violetter Slot + rotes Wappen"-Mismatch).
        // 2026-07-02 (Wolf): Format im Wizard-Schritt 0 gewählt → Beamer verlässt
        // den neutralen Welcome und zeigt die format-spezifische Pre-Game-Ansicht.
        if (payload.formatSelected === true) {
          room.formatSelected = true;
        }
        // 2026-05-17 (CozyGames Live-Toggle im Mod-Setup): kann ohne Game-Restart
        // umgestellt werden. Pool ändern setzt cozyGame-Round-State nicht zurück
        // (falls gerade aktiv) — nur Setup-Defaults für neue Spiele.
        if (typeof payload.cozyGamesEnabled === 'boolean') {
          room.cozyGamesEnabled = payload.cozyGamesEnabled;
          // 2026-05-17 (Auto-Fill): Wenn Toggle auf An gesetzt wird und der
          // aktuelle Room-Pool leer ist, default mit 8 random Seed-Spielen
          // aus der DB. Wolf hat dann sofort etwas im Rad ohne Builder-Detour.
          if (payload.cozyGamesEnabled === true && (!Array.isArray(room.cozyGamesPool) || room.cozyGamesPool.length === 0)) {
            try {
              const all = await getAllCozyGamesFromDB();
              const active = (all ?? []).filter((g: any) => !g.archived);
              const shuffled = [...active].sort(() => Math.random() - 0.5);
              room.cozyGamesPool = shuffled.slice(0, 8).map((g: any) => g.id);
            } catch {
              // ignore — bleibt leer, Wolf muss manuell wählen
            }
          }
        }
        if (Array.isArray(payload.cozyGamesPool)) {
          room.cozyGamesPool = payload.cozyGamesPool.slice(0, 8);
        }
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── MUCHO Step-Reveal (vereinfachter 2-Klick-Flow ab 2026-04-26) ──────────
    // Klick 1: alle Voter werden auf dem Beamer auto-staggered eingeblendet.
    // Klick 2: korrekte Option grün markieren + Siegerteam-Card.
    // Frontend uebernimmt die Per-Option-Stagger-Animation, Backend springt
    // direkt auf akt1Max bzw. lockStep.
    socket.on('qq:muchoRevealStep', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const q = room.currentQuestion;
        const isMucho = q?.category === 'MUCHO';
        if (room.phase !== 'QUESTION_REVEAL' || !isMucho || !q?.options) { ok(ack); return; }
        let nonEmpty = 0;
        for (let i = 0; i < q.options.length; i++) {
          if (room.answers.some(a => a.text === String(i))) nonEmpty++;
        }
        const lockStep = nonEmpty + 1;
        if (room.muchoRevealStep === 0) {
          // Klick 1 → alle Voter freigeben (Frontend staggered intern).
          // Edge-Case nonEmpty=0 (kein Team hat geantwortet): step bleibt sonst
          // bei 0 → Autoplay-Endless-Loop. Direkt auf lockStep springen.
          room.muchoRevealStep = nonEmpty === 0 ? lockStep : nonEmpty;
          broadcast(io, payload.roomCode);
        } else if (room.muchoRevealStep < lockStep) {
          // Klick 2 → korrekte Option + Sieger
          room.muchoRevealStep = lockStep;
          broadcast(io, payload.roomCode);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── ZEHN_VON_ZEHN Step-Reveal (Moderator steuert Bet-Cascade + Jäger) ──
    // Step 0 → 1: höchste Bets pro Option kaskadieren (frontend-seitig).
    // Step 1 → 2: Jäger-Animation + Winner-Card zeigen.
    socket.on('qq:zvzRevealStep', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const q = room.currentQuestion;
        const isZvZ = q?.category === 'ZEHN_VON_ZEHN';
        if (room.phase !== 'QUESTION_REVEAL' || !isZvZ) { ok(ack); return; }
        const maxStep = 2;
        if (room.zvzRevealStep < maxStep) {
          room.zvzRevealStep += 1;
          broadcast(io, payload.roomCode);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── CHEESE Step-Reveal (Moderator steuert Lösung-Grün + Avatar-Cascade) ──
    // Step 0 → 1: Lösung grün markieren + Shimmer.
    // Step 1 → 2: Team-Avatare einzeln kaskadiert einblenden + Winner-Card.
    socket.on('qq:cheeseRevealStep', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const q = room.currentQuestion;
        const isCheese = q?.category === 'CHEESE';
        if (room.phase !== 'QUESTION_REVEAL' || !isCheese) { ok(ack); return; }
        const maxStep = 2;
        if (room.cheeseRevealStep < maxStep) {
          room.cheeseRevealStep += 1;
          broadcast(io, payload.roomCode);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── 2D/3D Toggle (moderator -> beamer) ─────────────────────────────────
    socket.on('qq:toggleView', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        io.to(payload.roomCode).emit('qq:toggleView');
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Pause / Resume ──────────────────────────────────────────────────────
    socket.on('qq:pause', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqPause(room);
        // 2026-05-02 (Audit P2 #10/#11): AI-Timer-Maps stoppen waehrend Pause -
        // sonst tippen Bots in Connections/OnlyConnect waehrend des Pause-
        // Bildschirms weiter. Beim Resume re-triggern via maybeAuto*.
        stopConnectionsAiTimers(payload.roomCode);
        stopOnlyConnectAiTimers(payload.roomCode);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:resume', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        // 2026-05-02 (Persistence-Audit P-2 + P-3): Nach Server-Restart sind alle
        // onExpire-Closures null (wurden bei Persist verworfen, Funktionen sind
        // nicht serialisierbar). qqResume restartet Timer nur mit existierender
        // Closure — also wuerden Auto-Reveals nach Restart nie feuern. Wir bauen
        // Closures hier phasenabhaengig neu, BEVOR wir qqResume aufrufen.
        reattachClosuresAfterRestart(io, room, payload.roomCode);
        qqResume(room);
        // P-3: Connections/OnlyConnect AI-Timer-Maps leben in Modul-Scope und
        // ueberleben Restart nicht — Bots ticken sonst nicht weiter. Bei Resume
        // einer Sub-Mechanik-Phase neu antriggern (idempotent).
        if (room.currentQuestion?.bunteTuete?.kind === 'onlyConnect'
            && room.phase === 'QUESTION_ACTIVE') {
          maybeAutoOnlyConnect(io, payload.roomCode);
        }
        if (room.phase === 'CONNECTIONS_4X4' && room.connections?.phase === 'active') {
          maybeAutoConnections(io, payload.roomCode);
        }
        if (room.currentQuestion?.bunteTuete?.kind === 'hotPotato'
            && room.phase === 'QUESTION_ACTIVE') {
          maybeAutoHotPotato(io, payload.roomCode);
        }
        if (room.currentQuestion?.bunteTuete?.kind === 'bluff'
            && room.phase === 'QUESTION_ACTIVE') {
          maybeAutoBluffWrite(io, payload.roomCode);
        }
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Live-Reactions (Phone → Beamer) ────────────────────────────────────
    // Spieler tappen ein Reaction-Emoji am Phone; das wird ohne State-Update
    // direkt als Burst-Event an alle Clients gepushed. Beamer rendert das als
    // schwebendes Mini-Emoji am Bildschirmrand (siehe QQBeamerPage).
    // Rate-Limit pro Team: max 4 Reactions pro 5-Sekunden-Fenster gegen Spam.
    socket.on('qq:reaction', (payload: { roomCode: string; teamId: string; emoji: string }, ack?: unknown) => {
      try {
        if (typeof payload.emoji !== 'string' || payload.emoji.length > 4) {
          throw new QQError('INVALID_REACTION', 'Ungültiges Emoji.');
        }
        if (!ALLOWED_REACTION_EMOJIS.has(payload.emoji)) {
          throw new QQError('INVALID_REACTION', 'Reaction nicht erlaubt.');
        }
        const room = ensureQQRoom(payload.roomCode);
        if (!room.teams[payload.teamId]) {
          throw new QQError('UNKNOWN_TEAM', 'Team unbekannt.');
        }
        // Rate-Limit
        const now = Date.now();
        if (!reactionLog[payload.roomCode]) reactionLog[payload.roomCode] = {};
        const teamLog = reactionLog[payload.roomCode][payload.teamId] ?? [];
        const recent = teamLog.filter(ts => now - ts < 5000);
        if (recent.length >= 4) {
          ok(ack); // silent throttle, kein Error
          return;
        }
        recent.push(now);
        reactionLog[payload.roomCode][payload.teamId] = recent;
        // Broadcast an alle Clients im Room
        io.to(payload.roomCode).emit('qq:reactionBurst', {
          teamId: payload.teamId,
          emoji: payload.emoji,
          ts: now,
        });
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      // 2026-05-19 (Security-Audit S5): rate-limit-Bucket beim disconnect
      // freigeben, sonst waechst die Modul-Map ueber lange Sessions.
      try { cleanupRateLimitBucket(socket.id); } catch {}
      const { qqTeamId, qqRoomCode } = socket.data;
      if (qqTeamId && qqRoomCode) {
        const room = getQQRoom(qqRoomCode);
        if (room) {
          // 2026-05-03 Wolf-Bug 'Comeback haengt manchmal trotz Auto-Skip':
          // Log wenn das disconnectende Team das aktuelle Comeback-Team ist —
          // dann muesste der Mod-Autoplay nach 8s qq:skipCurrentTeam feuern.
          const isCbTeam = room.comebackTeamId === qqTeamId
            || room.pendingFor === qqTeamId;
          if (isCbTeam) {
            console.log('[cb-debug] disconnect of pending team:', JSON.stringify({
              teamId: qqTeamId, phase: room.phase,
              comebackTeamId: room.comebackTeamId,
              pendingFor: room.pendingFor,
              pendingAction: room.pendingAction,
            }));
          }
          qqSetTeamConnected(room, qqTeamId, false);
          // 2026-05-02: Hot Potato all-alive-disconnected Auto-Reveal.
          // Wenn dieser Disconnect das letzte alive-Team kappt, haengt die
          // Runde sonst — Mod muesste manuell reveal-en. Auto-Finish triggert
          // Reveal mit qualifizierten Teams als Winner (oder MarkWrong wenn
          // niemand qualifiziert).
          if (qqHotPotatoIsAllAliveDisconnected(room)) {
            qqHotPotatoForceFinishAllDisconnected(room);
          }
          // 2026-05-12 (Backend-Audit P0 #6): Watchdog falls disconnect-Team
          // gerade pendingFor ist. Vorher hing das Spiel bis Wolf manuell
          // F18-Skip drückte. Backend-Watchdog feuert nach 15s wenn:
          // - Team weiterhin disconnected
          // - room.pendingFor === qqTeamId (immer noch dran)
          // - Phase ist PLACEMENT (sonst greift andere Logik)
          // Reconnect cancelt den Watchdog implizit via teamId-Check.
          if (room.phase === 'PLACEMENT' && room.pendingFor === qqTeamId) {
            const watchdogTeamId = qqTeamId;
            setTimeout(() => {
              const currentRoom = getQQRoom(qqRoomCode);
              if (!currentRoom) return;
              if (currentRoom.phase !== 'PLACEMENT') return;
              if (currentRoom.pendingFor !== watchdogTeamId) return;
              const stillDisconnectedTeam = currentRoom.teams[watchdogTeamId];
              if (!stillDisconnectedTeam || stillDisconnectedTeam.connected) return;
              console.log('[disconnect-watchdog] auto-skipping placement of offline team:', watchdogTeamId);
              try {
                qqSkipCurrentPlacement(currentRoom);
                broadcast(io, qqRoomCode);
              } catch (err) {
                console.warn('[disconnect-watchdog] skip failed:', err);
              }
            }, 15000);
          }
          broadcast(io, qqRoomCode);
        }
      }
    });

  });
}
