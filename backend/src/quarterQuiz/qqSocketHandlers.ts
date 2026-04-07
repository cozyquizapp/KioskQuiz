// ── Quarter Quiz — Socket event handlers ─────────────────────────────────────

import { Server as SocketIOServer } from 'socket.io';
import { saveQQGameResult } from '../db/schemas';
import {
  QQJoinModeratorPayload, QQJoinBeamerPayload, QQJoinTeamPayload,
  QQStartGamePayload, QQRevealAnswerPayload, QQShowImagePayload, QQMarkCorrectPayload,
  QQMarkWrongPayload, QQPlaceCellPayload, QQStealCellPayload,
  QQChooseFreeActionPayload, QQComebackChoicePayload, QQSwapCellsPayload,
  QQNextQuestionPayload, QQSetLanguagePayload, QQResetRoomPayload,
  QQBuzzInPayload, QQSetTimerPayload, QQSetAvatarsPayload,
  QQSetMutedPayload, QQSetVolumePayload,
  QQSubmitAnswerPayload, QQAck,
} from '../../../shared/quarterQuizTypes';
import {
  ensureQQRoom, getQQRoom, buildQQStateUpdate, QQError,
  qqJoinTeam, qqSetTeamConnected, qqStartGame, qqActivateQuestion,
  qqRevealAnswer, qqShowImage, qqMarkCorrect, qqMarkWrong, qqPlaceCell, qqStealCell,
  qqChooseFreeAction, qqApplyComebackChoice, qqSwapCells,
  qqNextQuestion, qqResetRoom, qqTriggerComeback,
  qqBuzzIn, qqClearBuzz, qqSetTimerDuration, qqStopTimer,
  qqSubmitAnswer, qqClearAnswers, qqKickTeam,
  qqAutoEvaluateEstimate, qqEvaluateAnswers,
  qqHotPotatoStart, qqHotPotatoEliminate, qqHotPotatoNext, qqHotPotatoSubmitAnswer,
  qqClearHotPotatoTimer,
  qqImposterStart, qqImposterChoose,
} from './qqRooms';

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

function broadcast(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  io.to(roomCode).emit('qq:stateUpdate', buildQQStateUpdate(room));
  if (room.phase === 'GAME_OVER') persistGameResult(room);
}

function persistGameResult(room: ReturnType<typeof getQQRoom>): void {
  if (!room) return;
  const teamList = Object.values(room.teams);
  const scores: Record<string, number> = {};
  teamList.forEach((t: any) => { scores[t.id] = (room.teamPhaseStats[t.id] as any)?.totalScore ?? 0; });
  const sorted = [...teamList].sort((a: any, b: any) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  const winner = (sorted[0] as any)?.name ?? null;
  const result = {
    id: `qqr-${room.roomCode}-${Date.now().toString(36)}`,
    draftId: room.draftId ?? null,
    draftTitle: room.draftTitle ?? 'Unbekannt',
    roomCode: room.roomCode,
    playedAt: Date.now(),
    teams: teamList.map((t: any) => ({ id: t.id, name: t.name, color: t.color, score: scores[t.id] ?? 0 })),
    winner,
    phases: room.totalPhases,
    language: room.language,
    grid: room.grid,
  };
  saveQQGameResult(result).catch(() => {/* fire and forget */});
}

/**
 * Run full auto-evaluation for the current question and, if there is exactly
 * one deterministic winner, immediately call qqMarkCorrect so the moderator
 * only needs to advance — they can still override via qq:markCorrect/Wrong.
 *
 * Categories with a single clear winner (MUCHO, ZEHN_VON_ZEHN with 1 best bet,
 * SCHAETZCHEN, CHEESE exact match, BUNTE_TUETE sub-mechanics) are resolved here.
 * When there are multiple tied winners or no winner, the moderator decides.
 */
// For all question types: if multiple teams are correct (as determined by evaluation),
// all correct teams get to place a field, sorted by answer time (fastest first).
// This includes ties in Schätzchen (closest), All In (max points on correct), etc.
function applyAutoEval(room: import('./qqRooms').QQRoomState): void {
  const q = room.currentQuestion;
  if (!q) return;

  // Hot Potato is handled entirely by hotPotatoCorrect/Wrong — skip
  if (q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') return;

  const result = qqEvaluateAnswers(room);
  if (result.winnerTeamIds.length === 1) {
    // Single deterministic winner → auto-mark correct
    try {
      qqClearBuzz(room);
      qqMarkCorrect(room, result.winnerTeamIds[0]);
    } catch { /* ignore if phase already advanced */ }
  } else if (result.winnerTeamIds.length > 1) {
    // Multiple correct teams: sort by answer time, fastest first
    try {
      qqClearBuzz(room);
      const sorted = result.winnerTeamIds
        .map(tid => {
          const ans = room.answers.find(a => a.teamId === tid);
          return { tid, submittedAt: ans?.submittedAt ?? Infinity };
        })
        .sort((a, b) => a.submittedAt - b.submittedAt)
        .map(e => e.tid);
      qqMarkCorrect(room, sorted);
    } catch { /* ignore if phase already advanced */ }
  }
  // No winner: leave in QUESTION_REVEAL for moderator
}

export function registerQQHandlers(io: SocketIOServer): void {
  io.on('connection', (socket) => {

    // ── Join ────────────────────────────────────────────────────────────────
    socket.on('qq:joinModerator', (payload: QQJoinModeratorPayload, ack?: unknown) => {
      try {
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

    socket.on('qq:joinTeam', (payload: QQJoinTeamPayload, ack?: unknown) => {
      try {
        if (!payload.teamName || typeof payload.teamName !== 'string' || payload.teamName.length > 100) throw new QQError('INVALID_NAME', 'Teamname ungültig (max 100 Zeichen).');
        if (!payload.teamId || typeof payload.teamId !== 'string' || payload.teamId.length > 100) throw new QQError('INVALID_ID', 'TeamId ungültig.');
        const room = ensureQQRoom(payload.roomCode);
        qqJoinTeam(room, payload.teamId, payload.teamName, payload.avatarId);
        socket.join(payload.roomCode);
        socket.data.qqTeamId   = payload.teamId;
        socket.data.qqRoomCode = payload.roomCode;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Game control (moderator) ────────────────────────────────────────────
    socket.on('qq:startGame', (payload: QQStartGamePayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqStartGame(room, payload.questions, payload.language, payload.phases ?? 3, payload.theme, payload.draftId, payload.draftTitle, payload.slideTemplates);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:activateQuestion', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqActivateQuestion(room, () => {
          // Timer expired — reveal first, then auto-eval after 3s pause
          try { qqRevealAnswer(room); } catch { /* already revealed */ }
          broadcast(io, payload.roomCode);
          setTimeout(() => {
            try { applyAutoEval(room); } catch { /* ignore */ }
            broadcast(io, payload.roomCode);
          }, 3000);
        });
        // Auto-start Hot Potato if the activated question is a hotPotato type
        if (room.currentQuestion?.bunteTuete?.kind === 'hotPotato') {
          qqHotPotatoStart(room, hotPotatoTurnExpired(payload.roomCode));
        }
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:revealAnswer', (payload: QQRevealAnswerPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqRevealAnswer(room);
        broadcast(io, payload.roomCode);
        // Show reveal for 3s before auto-eval transitions to PLACEMENT
        setTimeout(() => {
          try { applyAutoEval(room); } catch { /* ignore */ }
          broadcast(io, payload.roomCode);
        }, 3000);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:showImage', (payload: QQShowImagePayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqShowImage(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:markCorrect', (payload: QQMarkCorrectPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqClearBuzz(room);
        qqClearAnswers(room);
        qqMarkCorrect(room, payload.teamId);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:markWrong', (payload: QQMarkWrongPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqClearBuzz(room);
        qqClearAnswers(room);
        qqMarkWrong(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:nextQuestion', (payload: QQNextQuestionPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqNextQuestion(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:triggerComeback', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqTriggerComeback(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Answer submission (teams) ──────────────────────────────────────────
    socket.on('qq:submitAnswer', (payload: QQSubmitAnswerPayload, ack?: unknown) => {
      try {
        if (typeof payload.answer !== 'string' || payload.answer.length > 1000) throw new QQError('INVALID_ANSWER', 'Antwort zu lang (max 1000 Zeichen).');
        const room = ensureQQRoom(payload.roomCode);
        const { allAnswered } = qqSubmitAnswer(room, payload.teamId, payload.answer);
        broadcast(io, payload.roomCode);
        // Auto-reveal when all connected teams have answered
        if (allAnswered) {
          try { qqRevealAnswer(room); } catch { /* already revealed */ }
          broadcast(io, payload.roomCode);
          // Pause on reveal screen for 3s, then auto-eval → PLACEMENT
          setTimeout(() => {
            try { applyAutoEval(room); } catch { /* ignore */ }
            broadcast(io, payload.roomCode);
          }, 3000);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Buzz in (teams, for Hot Potato) ───────────────────────────────────
    socket.on('qq:buzzIn', (payload: QQBuzzInPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqBuzzIn(room, payload.teamId);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Hot Potato (moderator + team) ─────────────────────────────────────

    /** Helper: build an auto-eliminate callback for the current active team. */
    function hotPotatoTurnExpired(roomCode: string) {
      return () => {
        try {
          const room = ensureQQRoom(roomCode);
          if (room.phase !== 'QUESTION_ACTIVE' || !room.hotPotatoActiveTeamId) return;
          const next = qqHotPotatoEliminate(room, hotPotatoTurnExpired(roomCode));
          if (!next) {
            // All eliminated — no winner
            qqRevealAnswer(room);
            qqMarkWrong(room);
          } else {
            // Check if only 1 team left → they win
            const alive = room.joinOrder.filter(id => !room.hotPotatoEliminated.includes(id) && room.teams[id]?.connected);
            if (alive.length === 1) {
              qqClearHotPotatoTimer(room);
              qqRevealAnswer(room);
              qqClearBuzz(room);
              qqMarkCorrect(room, next);
            }
          }
          broadcast(io, roomCode);
        } catch { /* room gone */ }
      };
    }

    socket.on('qq:hotPotatoStart', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqHotPotatoStart(room, hotPotatoTurnExpired(payload.roomCode));
        broadcast(io, payload.roomCode);
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
        if (!next) {
          // All eliminated — no winner, proceed via markWrong
          qqRevealAnswer(room);
          qqMarkWrong(room);
        } else {
          // Check if only 1 team left → they win
          const alive = room.joinOrder.filter(id => !room.hotPotatoEliminated.includes(id) && room.teams[id]?.connected);
          if (alive.length === 1) {
            qqClearHotPotatoTimer(room);
            qqRevealAnswer(room);
            qqClearBuzz(room);
            qqMarkCorrect(room, next);
          }
        }
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:hotPotatoCorrect', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const teamId = room.hotPotatoActiveTeamId;
        if (!teamId) throw new QQError('NO_ACTIVE_TEAM', 'Kein aktives Hot-Potato-Team.');
        qqClearHotPotatoTimer(room);
        qqRevealAnswer(room);
        qqClearBuzz(room);
        qqMarkCorrect(room, teamId);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Advance to next team in round-robin WITHOUT eliminating current (correct answer, continue round)
    socket.on('qq:hotPotatoNext', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const next = qqHotPotatoNext(room, hotPotatoTurnExpired(payload.roomCode));
        if (!next) {
          // All teams answered correctly — everyone wins
          qqRevealAnswer(room);
          const aliveIds = room.joinOrder.filter(id => !room.hotPotatoEliminated.includes(id));
          qqMarkCorrect(room, aliveIds);
        }
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Team submits their Hot Potato answer text
    socket.on('qq:hotPotatoAnswer', (
      payload: { roomCode: string; teamId: string; answer: string },
      ack?: unknown,
    ) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqHotPotatoSubmitAnswer(room, payload.teamId, payload.answer.slice(0, 500));
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Imposter / oneOfEight (moderator + team) ───────────────────────────
    socket.on('qq:imposterStart', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqImposterStart(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:imposterChoose', (
      payload: { roomCode: string; teamId: string; statementIndex: number },
      ack?: unknown,
    ) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const result = qqImposterChoose(room, payload.teamId, payload.statementIndex);

        if (result.allWin) {
          // All surviving teams win → mark correct for all non-eliminated teams, reveal answer
          qqRevealAnswer(room);
          const survivors = room.joinOrder.filter(id => !room.imposterEliminated.includes(id));
          qqMarkCorrect(room, survivors);
        } else if (result.eliminated) {
          const survivors = room.joinOrder.filter(id => !room.imposterEliminated.includes(id));
          if (survivors.length <= 1) {
            // 0 or 1 survivors — end the round
            qqRevealAnswer(room);
            if (survivors.length === 1) {
              qqMarkCorrect(room, survivors);
            } else {
              // All eliminated — mark wrong, nobody wins
              qqMarkWrong(room);
            }
          }
          // else: game continues with next team (auto-advanced in qqImposterChoose)
        }

        broadcast(io, payload.roomCode);
        if (typeof ack === 'function') (ack as AckFn)({ ok: true, ...result } as any);
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
        room.globalMuted = payload.muted;
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

    // ── Placement ───────────────────────────────────────────────────────────
    socket.on('qq:placeCell', (payload: QQPlaceCellPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const result = qqPlaceCell(room, payload.teamId, payload.row, payload.col);
        broadcast(io, payload.roomCode);
        if (typeof ack === 'function') (ack as AckFn)({ ok: true, ...result } as any);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:stealCell', (payload: QQStealCellPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const result = qqStealCell(room, payload.teamId, payload.row, payload.col);
        broadcast(io, payload.roomCode);
        if (typeof ack === 'function') (ack as AckFn)({ ok: true, ...result } as any);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:chooseFreeAction', (payload: QQChooseFreeActionPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqChooseFreeAction(room, payload.teamId, payload.action);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:comebackChoice', (payload: QQComebackChoicePayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqApplyComebackChoice(room, payload.teamId, payload.action);
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

    // ── Utility ─────────────────────────────────────────────────────────────
    socket.on('qq:setLanguage', (payload: QQSetLanguagePayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        room.language = payload.language;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:resetRoom', (payload: QQResetRoomPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqResetRoom(room);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const { qqTeamId, qqRoomCode } = socket.data;
      if (qqTeamId && qqRoomCode) {
        const room = getQQRoom(qqRoomCode);
        if (room) {
          qqSetTeamConnected(room, qqTeamId, false);
          broadcast(io, qqRoomCode);
        }
      }
    });

  });
}
