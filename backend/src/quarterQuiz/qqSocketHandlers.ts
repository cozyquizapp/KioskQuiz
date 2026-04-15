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
  QQSetMutedPayload, QQSetMusicMutedPayload, QQSetSfxMutedPayload, QQSetVolumePayload, QQUpdateSoundConfigPayload, QQSetEnable3DPayload,
  QQSubmitAnswerPayload, QQAck,
  QQFreezeCellPayload, QQStapelCellPayload, QQSwapOneCellPayload,
  QQStartRulesPayload, QQRulesNextPayload, QQRulesPrevPayload, QQRulesFinishPayload,
} from '../../../shared/quarterQuizTypes';
import {
  ensureQQRoom, getQQRoom, buildQQStateUpdate, QQError,
  qqJoinTeam, qqSetTeamConnected, qqStartGame, qqActivateQuestion,
  qqRevealAnswer, qqShowImage, qqMarkCorrect, qqMarkWrong, qqPlaceCell, qqStealCell,
  qqChooseFreeAction, qqApplyComebackChoice, qqSwapCells,
  qqSwapOneCell, qqFreezeCell, qqStuckCell,
  qqStartRules, qqRulesNext, qqRulesPrev,
  qqStartTeamsReveal, qqFinishTeamsReveal,
  qqUndoComebackChoice,
  qqNextQuestion, qqResetRoom, qqTriggerComeback, qqPause, qqResume,
  qqBuzzIn, qqClearBuzz, qqSetTimerDuration, qqStopTimer,
  qqSubmitAnswer, qqClearAnswers, qqKickTeam, qqStartPlacement,
  qqAutoEvaluateEstimate, qqEvaluateAnswers,
  qqHotPotatoStart, qqHotPotatoEliminate, qqHotPotatoNext, qqHotPotatoSubmitAnswer,
  qqClearHotPotatoTimer,
  qqImposterStart, qqImposterChoose,
} from './qqRooms';
import { normalizeText, similarityScore } from '../../../shared/textNormalization';

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

  // Flush last question's answers into history
  if (room.currentQuestion && room.answers.length > 0) {
    room.questionHistory.push({
      questionText: room.currentQuestion.answer ?? room.currentQuestion.text ?? '',
      category: room.currentQuestion.category,
      answers: room.answers.map(a => ({
        teamId: a.teamId,
        teamName: room.teams[a.teamId]?.name ?? a.teamId,
        text: a.text,
        submittedAt: a.submittedAt,
      })),
      correctTeamId: room.correctTeamId,
    });
  }

  // Per-Team Aggregat-Stats für die Summary-Seite
  const teamStats: Record<string, { correct: number; answered: number; jokersEarned: number; stealsUsed: number }> = {};
  for (const t of teamList) {
    const t_: any = t;
    teamStats[t_.id] = {
      correct: 0,
      answered: 0,
      jokersEarned: Object.values(room.teamPhaseStats[t_.id] ?? {}).reduce<number>(
        (acc, v: any) => acc + (v?.jokersEarned ?? 0), 0
      ),
      stealsUsed: Object.values(room.teamPhaseStats[t_.id] ?? {}).reduce<number>(
        (acc, v: any) => acc + (v?.stealsUsed ?? 0), 0
      ),
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

  const result = {
    id: `qqr-${room.roomCode}-${Date.now().toString(36)}`,
    draftId: room.draftId ?? null,
    draftTitle: room.draftTitle ?? 'Unbekannt',
    roomCode: room.roomCode,
    playedAt: Date.now(),
    teams: teamList.map((t: any) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      avatarId: t.avatarId,
      score: scores[t.id] ?? 0,
      totalCells: t.totalCells ?? 0,
      largestConnected: t.largestConnected ?? 0,
      ...teamStats[t.id],
    })),
    winner,
    phases: room.totalPhases,
    language: room.language,
    grid: room.grid,
    questionHistory: room.questionHistory,
    funnyAnswers: room.funnyAnswers,
  };
  saveQQGameResult(result).catch(() => {/* fire and forget */});
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

  if (result.winnerTeamIds.length === 1) {
    room.correctTeamId = result.winnerTeamIds[0];
  } else if (result.winnerTeamIds.length > 1) {
    // Multiple correct teams: sort by answer time, fastest first
    const sorted = result.winnerTeamIds
      .map(tid => {
        const ans = room.answers.find(a => a.teamId === tid);
        return { tid, submittedAt: ans?.submittedAt ?? Infinity };
      })
      .sort((a, b) => a.submittedAt - b.submittedAt)
      .map(e => e.tid);
    // Store first as correctTeamId, rest in placement queue for startPlacement
    room.correctTeamId = sorted[0];
    room['_placementQueue'] = sorted.slice(1);
  }
  // No winner: correctTeamId stays null — moderator can manually mark or mark wrong
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
        qqStartGame(room, payload.questions, payload.language, payload.phases ?? 3, payload.theme, payload.draftId, payload.draftTitle, payload.slideTemplates, payload.soundConfig);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:activateQuestion', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqActivateQuestion(room, () => {
          // Timer expired — just broadcast, moderator controls reveal manually
          broadcast(io, payload.roomCode);
        });
        // Auto-start Hot Potato if the activated question is a hotPotato type
        if (room.currentQuestion?.bunteTuete?.kind === 'hotPotato') {
          qqHotPotatoStart(room, hotPotatoTurnExpired(payload.roomCode));
        }
        // Auto-start Imposter (oneOfEight) and stop timer (it's self-paced)
        if (room.currentQuestion?.bunteTuete?.kind === 'oneOfEight') {
          qqImposterStart(room);
          qqStopTimer(room);
        }
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:revealAnswer', (payload: QQRevealAnswerPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqRevealAnswer(room);
        // Run evaluation immediately so correctTeamId is set — moderator sees winner
        try { applyAutoEval(room); } catch { /* ignore if already evaluated */ }
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

    // Moderator triggers placement after reviewing the reveal screen
    socket.on('qq:startPlacement', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqStartPlacement(room);
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
        qqSubmitAnswer(room, payload.teamId, payload.answer);
        // No auto-reveal — moderator controls when to reveal
        broadcast(io, payload.roomCode);
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
        // Record used answer
        if (room.hotPotatoLastAnswer) room.hotPotatoUsedAnswers.push(room.hotPotatoLastAnswer);
        // Advance to next team (correct = survive, not win)
        const next = qqHotPotatoNext(room, hotPotatoTurnExpired(payload.roomCode));
        if (!next) {
          // Only 1 team alive (current one) — they win
          qqClearHotPotatoTimer(room);
          qqRevealAnswer(room);
          qqClearBuzz(room);
          qqMarkCorrect(room, teamId);
        } else {
          // Check if only 1 team left (shouldn't happen here, but safety)
          const alive = room.joinOrder.filter(id => !room.hotPotatoEliminated.includes(id) && room.teams[id]?.connected);
          if (alive.length === 1) {
            qqClearHotPotatoTimer(room);
            qqRevealAnswer(room);
            qqClearBuzz(room);
            qqMarkCorrect(room, alive[0]);
          }
        }
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Team submits their Hot Potato answer text — with auto-check
    socket.on('qq:hotPotatoAnswer', (
      payload: { roomCode: string; teamId: string; answer: string },
      ack?: unknown,
    ) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const trimmed = payload.answer.slice(0, 500);
        // Validate turn, but do NOT finalize lastAnswer yet — we decide per branch
        if (room.phase !== 'QUESTION_ACTIVE') { ok(ack); return; }
        if (room.hotPotatoActiveTeamId !== payload.teamId) { ok(ack); return; }
        room.lastActivityAt = Date.now();

        // Auto-check: duplicate used answer → eliminate
        const normalizedAnswer = normalizeText(trimmed);
        const isDuplicate = room.hotPotatoUsedAnswers.some(
          used => normalizeText(used) === normalizedAnswer
        );
        if (isDuplicate && normalizedAnswer.length > 0) {
          // Duplicate — auto-eliminate (record answer for reveal display)
          room.hotPotatoLastAnswer = trimmed;
          const next = qqHotPotatoEliminate(room, hotPotatoTurnExpired(payload.roomCode));
          if (!next) {
            qqRevealAnswer(room);
            qqMarkWrong(room);
          } else {
            const alive = room.joinOrder.filter(id => !room.hotPotatoEliminated.includes(id) && room.teams[id]?.connected);
            if (alive.length === 1) {
              qqClearHotPotatoTimer(room);
              qqRevealAnswer(room);
              qqClearBuzz(room);
              qqMarkCorrect(room, alive[0]);
            }
          }
          broadcast(io, payload.roomCode);
          ok(ack);
          return;
        }

        // Auto-check: match against answer list
        const q = room.currentQuestion;
        if (q && normalizedAnswer.length > 0) {
          const validAnswers = q.answer
            .split(/[,;]/)
            .map(a => a.replace(/[…\.]+$/, '').trim())
            .filter(a => a.length > 0);
          const isMatch = validAnswers.some(valid => {
            const score = similarityScore(trimmed, valid);
            return score >= 0.8;
          });
          if (isMatch) {
            // Correct — record answer
            room.hotPotatoUsedAnswers.push(trimmed);

            // Pool exhausted? All survivors win, random placement order
            const usedNorm = room.hotPotatoUsedAnswers.map(u => normalizeText(u));
            const remaining = validAnswers.filter(valid =>
              !usedNorm.some(u => similarityScore(u, valid) >= 0.8)
            );
            const aliveNow = room.joinOrder.filter(id => !room.hotPotatoEliminated.includes(id) && room.teams[id]?.connected);
            if (remaining.length === 0 && aliveNow.length >= 1) {
              qqClearHotPotatoTimer(room);
              qqRevealAnswer(room);
              qqClearBuzz(room);
              // Shuffle alive teams for random placement order
              const shuffled = [...aliveNow].sort(() => Math.random() - 0.5);
              qqMarkCorrect(room, shuffled.length === 1 ? shuffled[0] : shuffled);
              broadcast(io, payload.roomCode);
              ok(ack);
              return;
            }

            // Otherwise advance to next team
            const next = qqHotPotatoNext(room, hotPotatoTurnExpired(payload.roomCode));
            if (!next) {
              qqClearHotPotatoTimer(room);
              qqRevealAnswer(room);
              qqClearBuzz(room);
              if (aliveNow.length === 1) qqMarkCorrect(room, aliveNow[0]);
              else qqMarkCorrect(room, aliveNow);
            } else {
              const alive = room.joinOrder.filter(id => !room.hotPotatoEliminated.includes(id) && room.teams[id]?.connected);
              if (alive.length === 1) {
                qqClearHotPotatoTimer(room);
                qqRevealAnswer(room);
                qqClearBuzz(room);
                qqMarkCorrect(room, alive[0]);
              }
            }
            broadcast(io, payload.roomCode);
            ok(ack);
            return;
          }
        }

        // No auto-match — wait for moderator judgment
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
        room.globalMuted = payload.muted;
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
        room.globalMuted = room.musicMuted && room.sfxMuted;
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:setSfxMuted', (payload: QQSetSfxMutedPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        room.sfxMuted    = payload.muted;
        room.globalMuted = room.musicMuted && room.sfxMuted;
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
        broadcast(io, payload.roomCode);
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

    // Phase 4: Stapeln (plus-center, permanent)
    socket.on('qq:stapelCell', (payload: QQStapelCellPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqStuckCell(room, payload.teamId, payload.row, payload.col);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

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

    socket.on('qq:resetRoom', (payload: QQResetRoomPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqResetRoom(room);
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

    // ── CozyGuessr Map Reveal Step (moderator -> beamer, progressiv) ──────
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
        if (room.mapRevealStep < maxStep) {
          room.mapRevealStep += 1;
          broadcast(io, payload.roomCode);
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── Comeback Intro Step (moderator steuert Erklärung Schritt für Schritt) ─
    socket.on('qq:comebackIntroStep', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (room.phase !== 'COMEBACK_CHOICE') { ok(ack); return; }
        const maxStep = 2; // 0=was ist das, 1=warum diese Team, 2=Optionen
        if (room.comebackIntroStep < maxStep) {
          room.comebackIntroStep += 1;
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
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:resume', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqResume(room);
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
