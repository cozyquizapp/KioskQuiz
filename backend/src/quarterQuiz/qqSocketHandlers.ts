// ── Quarter Quiz — Socket event handlers ─────────────────────────────────────

import { Server as SocketIOServer } from 'socket.io';
import { saveQQGameResult } from '../db/schemas';
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
} from '../../../shared/quarterQuizTypes';
import { scheduleSave, loadAllRooms, deleteSavedRoom } from './qqPersist';
import {
  ensureQQRoom, getQQRoom, insertQQRoom, buildQQStateUpdate, QQError,
  qqJoinTeam, qqSetTeamConnected, qqStartGame, qqActivateQuestion,
  qqRevealAnswer, qqShowImage, qqMarkCorrect, qqMarkWrong, qqUndoMarkCorrect, qqPlaceCell, qqStealCell,
  qqChooseFreeAction, qqApplyComebackChoice, qqComebackAutoApplySteal, qqSwapCells,
  qqComebackHLStartRound, qqComebackHLSubmitAnswer, qqComebackHLReveal, qqComebackHLAdvance,
  qqComebackFinishAllAndGoToFinale,
  qqSwapOneCell, qqFreezeCell, qqStuckCell, qqSandLockCell, qqShieldCell,
  qqStartRules, qqRulesNext, qqRulesPrev,
  qqStartTeamsReveal, qqFinishTeamsReveal,
  qqUndoComebackChoice,
  qqNextQuestion, qqResetRoom, qqTriggerComeback, qqPause, qqResume,
  qqBuzzIn, qqClearBuzz, qqSetTimerDuration, qqStopTimer,
  qqSubmitAnswer, qqClearAnswers, qqKickTeam, qqRenameTeam, qqStartPlacement,
  qqAutoEvaluateEstimate, qqEvaluateAnswers,
  qqHotPotatoStart, qqHotPotatoEliminate, qqHotPotatoForceEliminate, qqHotPotatoNext, qqHotPotatoSubmitAnswer,
  qqClearHotPotatoTimer, qqHotPotatoMarkQualified, qqHotPotatoCheckWinner,
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
} from './qqRooms';
import {
  QQ_CONNECTIONS_TIMER_MIN_SEC, QQ_CONNECTIONS_TIMER_MAX_SEC,
  QQConnectionsPayload,
} from '../../../shared/quarterQuizTypes';
import { normalizeText, similarityScore } from '../../../shared/textNormalization';
import { pickDummyAction, DummyActionChoice, DummyActionKind } from './qqDummyAI';

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

export function broadcastQQ(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  io.to(roomCode).emit('qq:stateUpdate', buildQQStateUpdate(room));
  if (room.phase === 'GAME_OVER') persistGameResult(room);
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

// ── Live-Reactions State (in-memory) ──────────────────────────────────────
// Pro Room und Team eine Liste der letzten Reaction-Timestamps fürs Rate-Limit.
// Reines Anti-Spam-Memo, lebt nicht in qqRooms (zu ephemer).
const reactionLog: Record<string, Record<string, number[]>> = {};
const ALLOWED_REACTION_EMOJIS = new Set(['👏', '🔥', '😱', '😢', '🎉', '😂']);

function persistGameResult(room: ReturnType<typeof getQQRoom>): void {
  if (!room) return;
  const teamList = Object.values(room.teams);
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

function pickDummyAnswer(q: import('./qqRooms').QQRoomState['currentQuestion'], correctRate = 0.6): string {
  if (!q) return 'Dummy';
  const beCorrect = Math.random() < correctRate;
  if (q.category === 'MUCHO' && Array.isArray(q.options) && q.options.length > 0) {
    const validCorrect = q.correctOptionIndex != null
      && q.correctOptionIndex >= 0
      && q.correctOptionIndex < q.options.length;
    const idx = beCorrect && validCorrect
      ? q.correctOptionIndex!
      : Math.floor(Math.random() * q.options.length);
    return String(idx);
  }
  if (q.category === 'SCHAETZCHEN') {
    const target = Number.isFinite(q.targetValue) ? (q.targetValue as number) : 100;
    const noise = beCorrect ? Math.abs(target) * 0.1 : Math.abs(target) * (0.5 + Math.random());
    return String(Math.max(0, Math.round(target + (Math.random() - 0.5) * noise * 2)));
  }
  if (q.category === 'ZEHN_VON_ZEHN' && Array.isArray(q.options) && q.options.length > 0) {
    const validCorrect = q.correctOptionIndex != null
      && q.correctOptionIndex >= 0
      && q.correctOptionIndex < q.options.length;
    // Bei korrekt: meistens auf die richtige Option legen.
    if (beCorrect && validCorrect) {
      const pts = Array(q.options.length).fill(0);
      const main = 6 + Math.floor(Math.random() * 4); // 6-9 Punkte auf richtig
      pts[q.correctOptionIndex!] = main;
      let remaining = 10 - main;
      while (remaining > 0) {
        const idx = Math.floor(Math.random() * q.options.length);
        const give = Math.min(remaining, Math.ceil(Math.random() * 3));
        pts[idx] += give;
        remaining -= give;
      }
      return pts.join(',');
    }
    const pts = Array(q.options.length).fill(0);
    let remaining = 10;
    while (remaining > 0) {
      const idx = Math.floor(Math.random() * q.options.length);
      const give = Math.min(remaining, Math.ceil(Math.random() * 5));
      pts[idx] += give;
      remaining -= give;
    }
    return pts.join(',');
  }
  if (q.category === 'BUNTE_TUETE' && q.bunteTuete) {
    const bt = q.bunteTuete;
    // CozyGuessr (map): Pin als "lat,lng" — bei korrekt nah am Ziel, sonst
    // weit weg gestreut (irgendwo auf der Erde).
    if (bt.kind === 'map') {
      if (beCorrect) {
        // ±3° Jitter um Ziel (~330km) → meist auf Kontinent, manchmal daneben
        const lat = bt.lat + (Math.random() - 0.5) * 6;
        const lng = bt.lng + (Math.random() - 0.5) * 6;
        return `${lat.toFixed(4)},${lng.toFixed(4)}`;
      }
      // Völlig daneben: zufälliger Punkt
      const lat = -60 + Math.random() * 120;
      const lng = -180 + Math.random() * 360;
      return `${lat.toFixed(4)},${lng.toFixed(4)}`;
    }
    // Top5: eine der gültigen Antworten
    if (bt.kind === 'top5') {
      const answers = (bt.answers || []).filter((a: string) => !!a && a.trim().length > 0);
      if (beCorrect && answers.length) {
        return answers[Math.floor(Math.random() * answers.length)];
      }
      return `Dummy-${Math.random().toString(36).slice(2, 6)}`;
    }
    // Order (Fix It): Teams submit item-Texte pipe-separated in ihrer Reihenfolge.
    // evalOrder splittet auf '|' und vergleicht Strings. Dummy muss daher
    // Items anhand correctOrder-Indizes auflösen und mit '|' joinen.
    if (bt.kind === 'order') {
      const correct = bt.correctOrder || [];
      const items = bt.items || [];
      if (correct.length === 0 || items.length === 0) {
        return `Dummy-${Math.random().toString(36).slice(2, 6)}`;
      }
      const seq = beCorrect
        ? correct.map(idx => items[idx] ?? '')
        : [...correct].sort(() => Math.random() - 0.5).map(idx => items[idx] ?? '');
      return seq.join('|');
    }
    // hotPotato / oneOfEight werden nicht via submitAnswer bedient →
    // eigene Auto-Handler (maybeAutoHotPotato/maybeAutoImposter).
    const fallback = (q as any).answer || 'Test';
    return beCorrect ? String(fallback) : `Dummy-${Math.random().toString(36).slice(2, 6)}`;
  }
  if (q.category === 'CHEESE') {
    const fallback = (q as any).answer || 'Test';
    return beCorrect ? String(fallback) : `Dummy-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `Dummy-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Modul-Level Turn-Expire-Handler, damit auch maybeAutoHotPotato denselben
 * Callback an qqHotPotatoNext/Eliminate weitergeben kann (sonst bleibt der
 * Flow beim nächsten echten Team ohne Timer stehen).
 */
export function hotPotatoTurnExpiredFor(io: SocketIOServer, roomCode: string): () => void {
  return () => {
    try {
      const room = getQQRoom(roomCode);
      if (!room) return;
      if (room.phase !== 'QUESTION_ACTIVE' || !room.hotPotatoActiveTeamId) return;
      const next = qqHotPotatoEliminate(room, hotPotatoTurnExpiredFor(io, roomCode));
      const winner = qqHotPotatoCheckWinner(room);
      if (winner === '' || !next) {
        qqClearHotPotatoTimer(room);
        qqRevealAnswer(room);
        qqMarkWrong(room);
      } else if (winner) {
        qqClearHotPotatoTimer(room);
        qqRevealAnswer(room);
        qqClearBuzz(room);
        qqMarkCorrect(room, winner);
      }
      broadcastQQ(io, roomCode);
      // Falls der nächste dran ein Dummy ist, sofort antreiben
      maybeAutoHotPotato(io, roomCode);
    } catch { /* room gone */ }
  };
}

/**
 * Hot Potato: Wenn der aktive Team-Slot ein Dummy ist, liefert der
 * Dummy nach kurzer Verzögerung eine gültige, noch nicht benutzte Antwort
 * aus dem Answer-Pool ab (oder würfelt Müll, wenn "falsch"). Der bestehende
 * qq:hotPotatoAnswer-Flow kümmert sich um Eliminierung/Weiterreichen.
 */
export function maybeAutoHotPotato(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  if (room.phase !== 'QUESTION_ACTIVE') return;
  const q = room.currentQuestion;
  if (!q || q.category !== 'BUNTE_TUETE' || q.bunteTuete?.kind !== 'hotPotato') return;
  const activeId = room.hotPotatoActiveTeamId;
  if (!activeId) return;
  if (!isDummy(room, activeId)) return;

  // Pool an noch nicht verwendeten gültigen Antworten ermitteln
  const validAnswers = (q.answer || '')
    .split(/[,;]/)
    .map(a => a.replace(/[…\.]+$/, '').trim())
    .filter(a => a.length > 0);
  const usedNorm = room.hotPotatoUsedAnswers.map(u => normalizeText(u));
  const unused = validAnswers.filter(v =>
    !usedNorm.some(u => similarityScore(u, v) >= 0.8),
  );

  // Dummy "weiß" zu 60% eine echte Antwort
  const beCorrect = Math.random() < 0.6 && unused.length > 0;
  const answer = beCorrect
    ? unused[Math.floor(Math.random() * unused.length)]
    : `Dummy-${Math.random().toString(36).slice(2, 6)}`;

  // Kurze Verzögerung, damit der Wechsel sichtbar ist
  const delay = 900 + Math.random() * 1500;
  const turnExpired = hotPotatoTurnExpiredFor(io, roomCode);
  setTimeout(() => {
    const live = getQQRoom(roomCode);
    if (!live || live.phase !== 'QUESTION_ACTIVE') return;
    if (live.hotPotatoActiveTeamId !== activeId) return;
    // Wiederverwendung der internen Antwort-Logik via submitAnswer-Helper
    try {
      const trimmed = answer.slice(0, 500);
      const normalizedAnswer = normalizeText(trimmed);
      const isDuplicate = live.hotPotatoUsedAnswers.some(
        u => normalizeText(u) === normalizedAnswer,
      );
      // 2026-04-28 (User-Wunsch 'keine strikes'): Dummies eliminieren sich
      // NICHT mehr auf falsche/Duplikat-Tipps. Sie versuchen es weiter bis
      // Turn-Timer expired (= echte Eliminierung). Dummies tippen alle
      // 900-2400ms eine neue Antwort.
      if (isDuplicate && normalizedAnswer.length > 0) {
        // Duplikat → einfach kurz feedback, weiter tippen
        live.hotPotatoLastAnswer = trimmed;
      } else {
        const validList = validAnswers;
        const isMatch = validList.some(v => similarityScore(trimmed, v) >= 0.8);
        if (isMatch) {
          live.hotPotatoUsedAnswers.push(trimmed);
          live.hotPotatoAnswerAuthors.push(activeId);
          qqHotPotatoMarkQualified(live, activeId);
          qqHotPotatoNext(live, turnExpired);
        } else {
          // Falsch → Timer läuft weiter, Dummy darf nochmal versuchen.
          live.hotPotatoLastAnswer = trimmed;
        }
      }
      broadcastQQ(io, roomCode);
      // Endbedingungen prüfen — qualifizierte-only Logik
      const winner = qqHotPotatoCheckWinner(live);
      if (winner !== null) {
        if (winner === '') {
          qqClearHotPotatoTimer(live);
          qqRevealAnswer(live);
          qqMarkWrong(live);
        } else {
          qqClearHotPotatoTimer(live);
          qqRevealAnswer(live);
          qqMarkCorrect(live, winner);
        }
        broadcastQQ(io, roomCode);
        // Nach markCorrect kann PLACEMENT starten → maybeAutoPlace
        // (cast: live.phase wurde oben narrow'ed, kann zur Laufzeit aber flippen)
        if ((live.phase as string) === 'PLACEMENT' && live.pendingFor) {
          maybeAutoPlace(io, roomCode);
        }
      } else {
        // Weiter: evtl. ist der nächste auch ein Dummy → Kette
        maybeAutoHotPotato(io, roomCode);
      }
    } catch { /* skip */ }
  }, delay);
}

/**
 * Imposter: Dummy wählt mit 70% eine korrekte Aussage, sonst random.
 * Der bestehende qqImposterChoose-Flow erledigt Eliminierung/Weiterreichen.
 */
export function maybeAutoImposter(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  if (room.phase !== 'QUESTION_ACTIVE') return;
  const q = room.currentQuestion;
  if (!q || q.category !== 'BUNTE_TUETE' || q.bunteTuete?.kind !== 'oneOfEight') return;
  const activeId = room.imposterActiveTeamId;
  if (!activeId) return;
  if (!isDummy(room, activeId)) return;

  const total = q.bunteTuete.statements.length;
  const falseIdx = q.bunteTuete.falseIndex;
  const used = room.imposterChosenIndices;

  // Freie Indizes ermitteln
  const available: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!used.includes(i)) available.push(i);
  }
  if (!available.length) return;

  const beCorrect = Math.random() < 0.7;
  const correctOptions = available.filter(i => i !== falseIdx);
  let pickIdx: number;
  if (beCorrect && correctOptions.length) {
    pickIdx = correctOptions[Math.floor(Math.random() * correctOptions.length)];
  } else {
    pickIdx = available[Math.floor(Math.random() * available.length)];
  }

  const delay = 1000 + Math.random() * 1600;
  setTimeout(() => {
    const live = getQQRoom(roomCode);
    if (!live || live.phase !== 'QUESTION_ACTIVE') return;
    if (live.imposterActiveTeamId !== activeId) return;
    try {
      const result = qqImposterChoose(live, activeId, pickIdx);
      if (result.allWin) {
        qqRevealAnswer(live);
        const survivors = live.joinOrder.filter(id => !live.imposterEliminated.includes(id));
        qqMarkCorrect(live, survivors);
      } else if (result.eliminated) {
        const survivors = live.joinOrder.filter(id => !live.imposterEliminated.includes(id));
        if (survivors.length <= 1) {
          qqRevealAnswer(live);
          if (survivors.length === 1) qqMarkCorrect(live, survivors);
          else qqMarkWrong(live);
        }
      }
      broadcastQQ(io, roomCode);
      if ((live.phase as string) === 'PLACEMENT' && live.pendingFor) {
        maybeAutoPlace(io, roomCode);
      } else {
        // Nächster Zug könnte auch Dummy sein
        maybeAutoImposter(io, roomCode);
      }
    } catch { /* skip */ }
  }, delay);
}

/**
 * Bluff: Write-Timer-Timeout-Handler. Erzwingt Übergang zu review (oder vote).
 * Wird auch aufgerufen wenn alle Teams submitted haben (vor Timer-Ende).
 */
function bluffWriteTimeout(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room || room.bluffPhase !== 'write') return;
  qqBluffAdvanceFromWrite(room, () => bluffVoteTimeout(io, roomCode));
  broadcast(io, roomCode);
  // Nach Mutation: TS-narrow refresh durch Re-Read
  if ((room.bluffPhase as string) === 'vote') {
    maybeAutoBluffVote(io, roomCode);
  }
}

/**
 * Bluff: Vote-Timer-Timeout-Handler. Erzwingt Übergang zu reveal.
 * Wird auch aufgerufen wenn alle Teams voted haben.
 */
function bluffVoteTimeout(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room || room.bluffPhase !== 'vote') return;
  qqBluffAdvanceFromVote(room);
  broadcast(io, roomCode);
}

/**
 * Bluff Dummy-AI während write-Phase: nach 3-8s tippt jeder Dummy einen
 * plausibel klingenden Bluff. Aktuell sehr simpel: random year / fake answer.
 */
function maybeAutoBluffWrite(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room || room.bluffPhase !== 'write') return;
  for (const teamId of room.joinOrder) {
    if (!isDummy(room, teamId)) continue;
    if (room.bluffSubmissions[teamId]) continue;
    const delay = 3000 + Math.random() * 5000;
    const localTeamId = teamId;
    setTimeout(() => {
      const live = getQQRoom(roomCode);
      if (!live || live.bluffPhase !== 'write') return;
      if (live.bluffSubmissions[localTeamId]) return;
      // Bluff generieren — kontextabhängig falls die echte Antwort eine Zahl ist
      const q = live.currentQuestion;
      const real = q?.bunteTuete?.kind === 'bluff' ? q.bunteTuete.realAnswer ?? '' : '';
      const fakeAnswer = generateDummyBluff(real);
      qqBluffSubmit(live, localTeamId, fakeAnswer);
      // Wenn jetzt alle eingereicht haben → früher zur Review/Vote-Phase
      if (qqBluffAllSubmitted(live)) {
        qqBluffAdvanceFromWrite(live, () => bluffVoteTimeout(io, roomCode));
        broadcast(io, roomCode);
        if ((live.bluffPhase as string) === 'vote') maybeAutoBluffVote(io, roomCode);
      } else {
        broadcast(io, roomCode);
      }
    }, delay);
  }
}

/**
 * Bluff Dummy-AI während vote-Phase: nach 4-9s wählt jeder Dummy zufällig
 * (kann sein eigener Bluff nicht — Server filtert Doppel-Vote eh).
 */
function maybeAutoBluffVote(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room || room.bluffPhase !== 'vote') return;
  for (const teamId of room.joinOrder) {
    if (!isDummy(room, teamId)) continue;
    if (room.bluffVotes[teamId]) continue;
    const localTeamId = teamId;
    const delay = 4000 + Math.random() * 5000;
    setTimeout(() => {
      const live = getQQRoom(roomCode);
      if (!live || live.bluffPhase !== 'vote') return;
      if (live.bluffVotes[localTeamId]) return;
      // Verfügbare Optionen: aus dem Team-eigenen Subset (real + 3 random)
      const teamOpts = live.bluffOptionsByTeam[localTeamId] ?? live.bluffOptions;
      const candidates = teamOpts.filter(o => {
        if (o.source === 'team' && o.contributors.includes(localTeamId)) return false;
        return true;
      });
      if (candidates.length === 0) return;
      // Skill: 40% Chance den echten Bluff zu wählen, sonst zufällig.
      const real = candidates.find(o => o.source === 'real');
      const beCorrect = Math.random() < 0.4;
      const choice = (beCorrect && real) ? real : candidates[Math.floor(Math.random() * candidates.length)];
      qqBluffVote(live, localTeamId, choice.id);
      if (qqBluffAllVoted(live)) {
        qqBluffAdvanceFromVote(live);
        broadcast(io, roomCode);
      } else {
        broadcast(io, roomCode);
      }
    }, delay);
  }
}

/** Helper: zufälliger Bluff-Text. Bei Zahl-Antworten: ähnliche Zahl. */
function generateDummyBluff(real: string): string {
  const trimmed = (real ?? '').trim();
  // Reine Zahl?
  const num = Number(trimmed.replace(/\./g, '').replace(/,/g, '.'));
  if (Number.isFinite(num) && /\d/.test(trimmed)) {
    // Zahl ±10-30% verändern, gerundet
    const sign = Math.random() < 0.5 ? -1 : 1;
    const factor = 1 + sign * (0.1 + Math.random() * 0.2);
    const rounded = Math.round(num * factor);
    return String(rounded);
  }
  // Generischer Text-Bluff (für nicht-Zahl-Antworten)
  const fillers = [
    'Theodor Wagner', 'Bertha Schmidt', 'Otto Hansen',
    'In den 1920er-Jahren', '1888', '1956', '1974',
    'Albert Lichtblick', 'Henry Watson', 'Eleanora Blanche',
  ];
  return fillers[Math.floor(Math.random() * fillers.length)];
}

/** Pro Raum + Team max ein laufender Connections-AI-Timer. Verhindert,
 *  dass mehrere maybeAutoConnections-Aufrufe Timer für dasselbe Team stapeln. */
const connectionsAiTimers: Map<string, Map<string, ReturnType<typeof setTimeout>>> = new Map();

function getConnAiTimerMap(roomCode: string): Map<string, ReturnType<typeof setTimeout>> {
  let m = connectionsAiTimers.get(roomCode);
  if (!m) { m = new Map(); connectionsAiTimers.set(roomCode, m); }
  return m;
}

/**
 * 4×4 Connections — Dummies während 'active' picken zufällig 4 Items und submitten.
 * Skill: 60% Chance auf eine echte Gruppe (alle 4 Items derselben Gruppe), sonst
 * gemischter Mist. Wird wiederholt aufgerufen bis Team finished/locked ist.
 *
 * Während 'placement': pendingFor-Dummy setzt via maybeAutoPlace-Pfad.
 */
export function maybeAutoConnections(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  if (room.phase !== 'CONNECTIONS_4X4') return;
  if (!room.connections) return;

  // ── Placement-Phase: Dummy wählt + setzt Aktion (FREE-Menü) ────────────────
  // 2026-04-28: Dummies bekommen jetzt das volle Round-3/4-Menü (PLACE/STEAL/
  // STAPEL je nach was möglich ist). Vorher nur PLACE → Klauen/Stapeln im
  // Finale-Placement war für Bots nicht verfügbar.
  if (room.connections.phase === 'placement') {
    const teamId = room.pendingFor;
    if (!teamId || !isDummy(room, teamId)) return;
    setTimeout(() => {
      const live = getQQRoom(roomCode);
      if (!live || live.phase !== 'CONNECTIONS_4X4') return;
      if (live.connections?.phase !== 'placement') return;
      if (live.pendingFor !== teamId) return;

      // Falls pendingAction noch FREE: volle Auswahl wie in Round 3/4.
      if (live.pendingAction === 'FREE') {
        const kinds: DummyActionKind[] = [];
        const hasFreeCellNow = live.grid.some(r => r.some(c => c.ownerId === null));
        if (hasFreeCellNow) kinds.push('PLACE');
        kinds.push('STEAL');
        const stats = live.teamPhaseStats[teamId];
        const stapelsUsedNow = stats?.stapelsUsed ?? 0;
        if (live.gamePhaseIndex >= 3 && stapelsUsedNow < 3) kinds.push('STAPEL');
        const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
          availableKinds: kinds, phase: live.gamePhaseIndex,
        });
        if (!choice) {
          qqSkipCurrentPlacement(live);
          broadcast(io, roomCode);
          if (live.connections?.phase === 'placement' && live.pendingFor) maybeAutoConnections(io, roomCode);
          return;
        }
        dispatchFreeChoice(io, roomCode, teamId, choice);
        return;
      }

      // Falls pendingAction schon konkret (PLACE_1 / STEAL_1 / STAPEL_1) durch
      // einen vorherigen Tick: direkt ausführen.
      const concrete: DummyActionKind[] = live.pendingAction === 'STEAL_1' ? ['STEAL']
                                        : live.pendingAction === 'STAPEL_1' ? ['STAPEL']
                                        : ['PLACE'];
      const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: concrete, phase: live.gamePhaseIndex,
      });
      if (!choice) {
        qqSkipCurrentPlacement(live);
        broadcast(io, roomCode);
        if (live.connections?.phase === 'placement' && live.pendingFor) maybeAutoConnections(io, roomCode);
        return;
      }
      try {
        if (choice.kind === 'PLACE') qqPlaceCell(live, teamId, choice.target!.row, choice.target!.col);
        else if (choice.kind === 'STEAL') qqStealCell(live, teamId, choice.target!.row, choice.target!.col);
        else if (choice.kind === 'STAPEL') qqStuckCell(live, teamId, choice.target!.row, choice.target!.col);
        if (live.connections?.phase === 'placement') qqConnectionsAfterPlacement(live);
        broadcast(io, roomCode);
        if (live.connections?.phase === 'placement' && live.pendingFor) maybeAutoConnections(io, roomCode);
      } catch { /* skip */ }
    }, 800 + Math.random() * 700);
    return;
  }

  // ── Active-Phase: alle Dummies, die nicht fertig/locked sind, ticken ──────
  if (room.connections.phase !== 'active') return;
  const c = room.connections;
  const timers = getConnAiTimerMap(roomCode);

  for (const teamId of room.joinOrder) {
    if (!isDummy(room, teamId)) continue;
    const tp = c.teamProgress[teamId];
    if (!tp || tp.isLockedOut || tp.finishedAt != null) continue;
    // Bereits ein Timer für dieses Team scheduled? Dann skip — verhindert Duplikat-Stack.
    if (timers.has(teamId)) continue;

    // Items aus eigenen gefundenen Gruppen sind ausgeschlossen
    const usedItems = new Set<string>();
    for (const gid of tp.foundGroupIds) {
      const g = c.payload.groups.find(gg => gg.id === gid);
      g?.items.forEach(it => usedItems.add(it));
    }

    // Skill: 60% Chance versucht der Dummy bewusst eine echte Gruppe.
    // Sonst mischt er Items aus mehreren Gruppen. Failed Attempts skalieren
    // den Skill nicht — mehr Glück als Verstand.
    const beCorrect = Math.random() < 0.6;
    let pick: string[] = [];
    if (beCorrect) {
      const remainingGroups = c.payload.groups.filter(g => !tp.foundGroupIds.includes(g.id));
      if (remainingGroups.length > 0) {
        const g = remainingGroups[Math.floor(Math.random() * remainingGroups.length)];
        pick = g.items.slice();
      }
    }
    if (pick.length !== 4) {
      const pool = c.itemOrder.filter(it => !usedItems.has(it));
      const shuffled = pool.slice().sort(() => Math.random() - 0.5);
      pick = shuffled.slice(0, 4);
    }

    // Reaktionszeit: 4-9 Sek pro Versuch
    const delay = 4000 + Math.random() * 5000;
    const localTeamId = teamId;
    const localPick = pick.slice();
    const handle = setTimeout(() => {
      timers.delete(localTeamId);
      const live = getQQRoom(roomCode);
      if (!live || live.phase !== 'CONNECTIONS_4X4') return;
      if (live.connections?.phase !== 'active') return;
      const ltp = live.connections.teamProgress[localTeamId];
      if (!ltp || ltp.isLockedOut || ltp.finishedAt != null) return;
      // Selektion setzen (replace) und sofort submitten
      ltp.selectedItems = localPick.slice();
      const result = qqConnectionsSubmitGroup(live, localTeamId);
      // Auto-Reveal wenn alle fertig
      if (qqConnectionsAllDone(live) && live.connections?.phase === 'active') {
        qqConnectionsToReveal(live);
      }
      broadcast(io, roomCode);
      // Nochmal ticken wenn Dummy noch lebt (nächster Versuch)
      if (live.connections?.phase === 'active') maybeAutoConnections(io, roomCode);
      void result;
    }, delay);
    timers.set(teamId, handle);
  }
}

/** Stoppe alle Connections-AI-Timer für einen Raum (z.B. bei Clear/Phase-End). */
function stopConnectionsAiTimers(roomCode: string): void {
  const m = connectionsAiTimers.get(roomCode);
  if (!m) return;
  for (const h of m.values()) clearTimeout(h);
  m.clear();
}

/** Pro Raum + Team max ein laufender OnlyConnect-AI-Timer. */
const onlyConnectAiTimers: Map<string, Map<string, ReturnType<typeof setTimeout>>> = new Map();

function getOnlyConnectAiTimerMap(roomCode: string): Map<string, ReturnType<typeof setTimeout>> {
  let m = onlyConnectAiTimers.get(roomCode);
  if (!m) { m = new Map(); onlyConnectAiTimers.set(roomCode, m); }
  return m;
}

function stopOnlyConnectAiTimers(roomCode: string, teamId?: string): void {
  const m = onlyConnectAiTimers.get(roomCode);
  if (!m) return;
  if (teamId) {
    const h = m.get(teamId);
    if (h) { clearTimeout(h); m.delete(teamId); }
  } else {
    for (const h of m.values()) clearTimeout(h);
    m.clear();
  }
}

/**
 * 4 gewinnt / Only Connect — Dummy-AI.
 * Pro Dummy: nach 4-12s entscheidet er sich zwischen Hint freischalten oder
 * Tippen. Höherer Hint-Stand → höhere Tipp- und Treffer-Wahrscheinlichkeit.
 * Reschedult sich selbst bis Team gesperrt oder richtig.
 */
export function maybeAutoOnlyConnect(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  if (room.phase !== 'QUESTION_ACTIVE') return;
  if (room.currentQuestion?.bunteTuete?.kind !== 'onlyConnect') return;

  const timers = getOnlyConnectAiTimerMap(roomCode);

  for (const teamId of room.joinOrder) {
    if (!isDummy(room, teamId)) continue;
    if (room.onlyConnectLockedTeams.includes(teamId)) continue;
    if (room.onlyConnectGuesses.some(g => g.teamId === teamId && g.correct)) continue;
    if (timers.has(teamId)) continue;

    const localTeamId = teamId;
    const delay = 4000 + Math.random() * 8000; // 4-12s
    const handle = setTimeout(() => {
      timers.delete(localTeamId);
      const live = getQQRoom(roomCode);
      if (!live) return;
      if (live.phase !== 'QUESTION_ACTIVE') return;
      if (live.currentQuestion?.bunteTuete?.kind !== 'onlyConnect') return;
      if (live.onlyConnectLockedTeams.includes(localTeamId)) return;
      if (live.onlyConnectGuesses.some(g => g.teamId === localTeamId && g.correct)) return;

      const curIdx = live.onlyConnectHintIndices[localTeamId] ?? 0;
      // Auto-Hint-Reveal seit 2026-04-28: Hints kommen auf dem Timer
      // automatisch — Dummies entscheiden NUR ob sie jetzt schon tippen
      // oder weiter abwarten. Mit höherem Hint-Level steigt die Lust zu raten.
      // 2026-04-28: bei idx=0 NIE tippen — sonst beenden Dummies in
      // Pure-Test-Lobbys die Runde bevor irgendwas zu sehen ist. Realistisch
      // ist auch: erster Hinweis allein gibt selten genug Sicherheit.
      const guessProb = curIdx === 0 ? 0 : curIdx === 1 ? 0.30 : curIdx === 2 ? 0.55 : 0.95;
      const shouldGuess = Math.random() < guessProb;

      if (!shouldGuess) {
        // Diese Runde noch nicht tippen — re-schedule für später
        maybeAutoOnlyConnect(io, roomCode);
        return;
      }

      // Submit guess: Treffer-Wahrscheinlichkeit steigt mit Hint-Level
      const accProb = curIdx === 0 ? 0.20 : curIdx === 1 ? 0.40 : curIdx === 2 ? 0.65 : 0.85;
      const beCorrect = Math.random() < accProb;
      const oc = live.currentQuestion?.bunteTuete?.kind === 'onlyConnect'
        ? live.currentQuestion.bunteTuete : null;
      let guessText = 'unsinn';
      if (oc) {
        if (beCorrect) {
          guessText = (oc.answer ?? '').trim() || 'unsinn';
        } else {
          const wrongs = ['kaffee', 'pasta', 'lila pferde', 'fahrrad', 'irgendwas', 'mond', 'salami'];
          guessText = wrongs[Math.floor(Math.random() * wrongs.length)];
        }
      }
      qqOnlyConnectSubmitGuess(live, localTeamId, guessText);
      // AutoFinish nur wenn AllDone + MinHint + MinDuration (qqOnlyConnectCanAutoFinish)
      // — sonst beenden Dummies in Pure-Test-Lobbys die Runde in 5s. Greift
      // beim naechsten Hint-Tick falls jetzt geblockt.
      if (qqOnlyConnectCanAutoFinish(live)) {
        qqOnlyConnectAutoFinish(live);
      }
      broadcast(io, roomCode);
      maybeAutoOnlyConnect(io, roomCode);
    }, delay);

    timers.set(localTeamId, handle);
  }
}

/**
 * Wenn QUESTION_ACTIVE + Dummies im Raum, lass Dummies gestaffelt antworten
 * (gleichmäßig über das Timer-Fenster verteilt, mit Jitter).
 * Echte Teams bleiben unberührt — sie antworten selbst via Socket.
 */
export function maybeAutoSimulateAnswers(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  if (room.phase !== 'QUESTION_ACTIVE') return;
  if (!hasDummyTeams(room)) return;
  const q = room.currentQuestion;
  if (!q) return;

  // Hot Potato + Imposter nutzen nicht submitAnswer, sondern eigene
  // Auto-Handler (maybeAutoHotPotato / maybeAutoImposter). Die werden nach
  // qq:hotPotatoStart / qq:imposterStart gezündet.
  if (q.category === 'BUNTE_TUETE' && (q.bunteTuete?.kind === 'hotPotato' || q.bunteTuete?.kind === 'oneOfEight')) {
    return;
  }
  // 4 gewinnt + Bluff nutzen ebenfalls eigene Submit-Pfade — kein Dummy-Submit
  // über die Standard-Answer-Pipeline.
  if (q.category === 'BUNTE_TUETE' && (q.bunteTuete?.kind === 'onlyConnect' || q.bunteTuete?.kind === 'bluff')) {
    return;
  }

  const dummies = Object.values(room.teams).filter((t: any) =>
    t._dummy && !room.answers.some((a: any) => a.teamId === t.id)
  ) as any[];
  if (dummies.length === 0) return;

  // Dummies immer als connected markieren (sonst blockiert allAnswered)
  for (const t of dummies) t.connected = true;

  const now = Date.now();
  const rawRemaining = room.timerEndsAt ? room.timerEndsAt - now : 15_000;
  const safeWindow = Math.min(18_000, rawRemaining - 1_200);

  // Zu wenig Zeit? Alle sofort submitten
  if (safeWindow < 500) {
    for (const t of dummies) {
      try { qqSubmitAnswer(room, t.id, pickDummyAnswer(q)); } catch { /* skip */ }
    }
    broadcastQQ(io, roomCode);
    return;
  }

  // Gleichmäßig verteilen mit Jitter — Reihenfolge random
  const slot = safeWindow / dummies.length;
  const order = [...dummies].sort(() => Math.random() - 0.5);
  order.forEach((t: any, i: number) => {
    const base = 250 + slot * i;
    const jitter = slot * 0.3 * (Math.random() - 0.5);
    const delay = Math.max(250, Math.min(safeWindow, base + jitter));
    setTimeout(() => {
      const live = getQQRoom(roomCode);
      if (!live || live.phase !== 'QUESTION_ACTIVE' || live.currentQuestion?.id !== q.id) return;
      if (live.answers.some((a: any) => a.teamId === t.id)) return;
      try {
        qqSubmitAnswer(live, t.id, pickDummyAnswer(q));
        broadcastQQ(io, roomCode);
      } catch { /* skip */ }
    }, delay);
  });
}

/**
 * Wenn COMEBACK_CHOICE + pendingFor ist ein Dummy, starte automatisch die
 * Klau-Aktion (fix vom Führenden) nach kurzer Verzögerung. Keine Wahl mehr
 * zwischen PLACE_2/STEAL_1/SWAP_2 – einheitlich Steal.
 */
export function maybeAutoComebackChoice(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  if (room.phase !== 'COMEBACK_CHOICE') return;
  const teamId = room.pendingFor;
  if (!teamId) return;
  const team = (room.teams as any)[teamId];
  if (!team || !team._dummy) return;

  setTimeout(() => {
    const live = getQQRoom(roomCode);
    if (!live || live.phase !== 'COMEBACK_CHOICE') return;
    if (live.pendingFor !== teamId) return;
    try {
      qqComebackAutoApplySteal(live);
      broadcastQQ(io, roomCode);
      maybeAutoPlace(io, roomCode);
    } catch { /* skip */ }
  }, 1500);
}

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
  const teamId = room.pendingFor;
  if (!teamId) return;
  const team = (room.teams as any)[teamId];
  if (!team || !team._dummy) return;
  const action = room.pendingAction;
  if (!action) return;

  setTimeout(() => {
    const live = getQQRoom(roomCode);
    if (!live || live.phase !== 'PLACEMENT') return;
    if (live.pendingFor !== teamId || live.pendingAction !== action) return;

    const phase = live.gamePhaseIndex;
    const stats = live.teamPhaseStats[teamId];
    const shieldsUsed = stats?.shieldsUsed ?? 0;

    const skipStuckDummy = (): void => {
      qqSkipCurrentPlacement(live);
      broadcastQQ(io, roomCode);
      if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
    };

    // ── PLACE_1 (Phase 1): strikt nur setzen. Klauen ist in R1 nicht erlaubt.
    if (action === 'PLACE_1') {
      const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: ['PLACE'], phase,
      });
      if (!choice) { skipStuckDummy(); return; }
      try {
        qqPlaceCell(live, teamId, choice.target!.row, choice.target!.col);
        broadcastQQ(io, roomCode);
        if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
      } catch { /* skip */ }
      return;
    }

    // ── PLACE_2 (Phase 2, Entscheidung zwischen 2×Setzen und 1×Klauen) ──────
    // Erstaufruf: placementsLeft == 2 → vergleichen. Bei STEAL via chooseFreeAction umschalten.
    if (action === 'PLACE_2') {
      const firstSlot = (stats?.placementsLeft ?? 0) >= 2;
      const stealsUsed = stats?.stealsUsed ?? 0;
      const canSteal = stealsUsed < 2; // QQ_MAX_STEALS_PER_PHASE
      if (firstSlot && canSteal) {
        const placeChoice = pickDummyAction(live.grid, live.gridSize, teamId, {
          availableKinds: ['PLACE'], phase,
        }, 0);
        const stealChoice = pickDummyAction(live.grid, live.gridSize, teamId, {
          availableKinds: ['STEAL'], phase,
        }, 0);
        const placeScore2x = placeChoice ? placeChoice.score * 1.6 : -Infinity; // 2 Züge, zweiter bringt weniger
        const stealScore   = stealChoice ? stealChoice.score : -Infinity;
        if (stealScore > placeScore2x && stealChoice) {
          let switched = false;
          try {
            qqChooseFreeAction(live, teamId, 'STEAL');
            switched = true;
          } catch { /* fällt unten auf Setzen zurück */ }
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
    if (action === 'FREE') {
      const kinds: DummyActionKind[] = [];
      const hasFreeCellNow = live.grid.some(row => row.some(c => c.ownerId === null));
      if (hasFreeCellNow) kinds.push('PLACE');
      kinds.push('STEAL');
      const stapelsUsedNow = stats?.stapelsUsed ?? 0;
      if (phase >= 3 && stapelsUsedNow < 3) kinds.push('STAPEL');
      const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: kinds, phase, shieldsUsed,
      });
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
      } catch { /* skip */ }
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

/** Scheduled Auto-Reveal fuer das Comeback-H/L-Mini-Game. Wird nach jedem
 *  Rundenstart aufgerufen — wenn der Timer ablaeuft und nicht alle geantwortet
 *  haben, triggert automatisch den Reveal. Fehlende Antworten zaehlen als falsch. */
export function scheduleHLAutoReveal(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room || !room.comebackHL) return;
  if (room.comebackHL.phase !== 'question') return;
  // Alte Handle clearen
  if (room._comebackHLTimerHandle) {
    clearTimeout(room._comebackHLTimerHandle);
    room._comebackHLTimerHandle = null;
  }
  const endsAt = room.comebackHL.timerEndsAt;
  if (endsAt == null) return;
  // Kleiner Puffer (400ms), damit Client-Timer visuell erst auf 0 zeigt.
  const ms = Math.max(0, endsAt - Date.now()) + 400;
  room._comebackHLTimerHandle = setTimeout(() => {
    const live = getQQRoom(roomCode);
    if (!live || !live.comebackHL) return;
    live._comebackHLTimerHandle = null;
    if (live.comebackHL.phase !== 'question') return;
    try {
      qqComebackHLReveal(live);
      broadcastQQ(io, roomCode);
    } catch { /* ignore */ }
  }, ms);
}

/** Clear Auto-Reveal Timer (bei manueller Reveal, Pause, Spielende). */
function clearHLAutoReveal(room: { _comebackHLTimerHandle: ReturnType<typeof setTimeout> | null }): void {
  if (room._comebackHLTimerHandle) {
    clearTimeout(room._comebackHLTimerHandle);
    room._comebackHLTimerHandle = null;
  }
}

/** Comeback-Mini-Game: Dummy-Teams antworten automatisch auf die Higher/Lower-
 *  Frage (50/50 zufällig, damit der Kampf nicht immer identisch ausgeht).
 *  Wird nach jedem Rundenstart aufgerufen. */
export function maybeDummyAnswerHL(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room || !room.comebackHL) return;
  const hl = room.comebackHL;
  if (hl.phase !== 'question') return;
  const dummies = hl.teamIds.filter(id => {
    const t = (room.teams as any)[id];
    return t && t._dummy && hl.answers[id] == null;
  });
  if (dummies.length === 0) return;
  // Staggered Antwort-Zeitpunkte (800ms-2500ms), damit es nicht synchron aussieht.
  dummies.forEach((teamId, i) => {
    const delay = 800 + i * 400 + Math.floor(Math.random() * 900);
    setTimeout(() => {
      const live = getQQRoom(roomCode);
      if (!live || !live.comebackHL) return;
      if (live.comebackHL.phase !== 'question') return;
      if (live.comebackHL.answers[teamId] != null) return;
      const choice: 'higher' | 'lower' = Math.random() < 0.5 ? 'higher' : 'lower';
      try {
        qqComebackHLSubmitAnswer(live, teamId, choice);
        broadcastQQ(io, roomCode);
      } catch { /* ignore */ }
    }, delay);
  });
}

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
        } catch { /* skip */ }
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
    }
  }).catch(err => {
    console.warn('[QQ-persist] restore failed:', err?.message ?? err);
  });

  io.on('connection', (socket) => {

    // ── Heartbeat ──────────────────────────────────────────────────────────
    // Client-Heartbeat (alle 20s). Hält die WS-Verbindung gegen Render-Proxy-
    // Timeout (~100s Idle) und Browser-Tab-Throttling warm. Noop-Handler.
    socket.on('qq:ping', () => { /* noop */ });

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
        // Default 4 statt 3 — die Standard-Drafts (qq-vol-*) sind 4-Runden-Sets,
        // und ein silent-3 wenn frontend den Wert nicht sendet hat schon einmal
        // zu 'nur 3 Runden im Tree' geführt.
        qqStartGame(room, payload.questions, payload.language, payload.phases ?? 4, payload.theme, payload.draftId, payload.draftTitle, payload.slideTemplates, payload.soundConfig);
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
          if (room.currentQuestion?.bunteTuete?.kind === 'hotPotato') {
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
          // Standard-Reveal: alle Hints zeigen, eval, phase=QUESTION_REVEAL.
          // Gate entfernt seit 2026-04-28 — onlyConnect nutzt jetzt den
          // Standard-Flow mit Timer, deshalb ist das Mod-Space-Reveal in
          // Ordnung wie bei Mucho/Schätzchen.
          qqOnlyConnectRevealAll(room);
          qqOnlyConnectAutoFinish(room);
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
        qqNextQuestion(room);
        broadcast(io, payload.roomCode);
        // Nach Comeback-Steal-Resume kann der nächste Stealer wieder ein
        // Dummy-Team sein. Ohne maybeAutoPlace würde Autoplay an dieser
        // Stelle hängen — Backend wartet auf nächsten Klick, Frontend wartet
        // auf nächste Phase-Änderung.
        if (room.phase === 'PLACEMENT' && room.pendingFor) {
          maybeAutoPlace(io, payload.roomCode);
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
    const hotPotatoTurnExpired = (roomCode: string) => hotPotatoTurnExpiredFor(io, roomCode);

    socket.on('qq:hotPotatoStart', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqHotPotatoStart(room, hotPotatoTurnExpired(payload.roomCode));
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

        // Auto-check: match against answer list
        const q = room.currentQuestion;
        if (q) {
          const validAnswers = q.answer
            .split(/[,;]/)
            .map(a => a.replace(/[…\.]+$/, '').trim())
            .filter(a => a.length > 0);
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

    // ── Placement ───────────────────────────────────────────────────────────
    socket.on('qq:placeCell', (payload: QQPlaceCellPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const result = qqPlaceCell(room, payload.teamId, payload.row, payload.col);
        // Connections-Placement: Cursor NUR weiterschalten wenn die ganze
        // Action fertig ist (sonst frisst PLACE_2 zwei Slots statt einen).
        // qqPlaceCell setzt pendingFor=null wenn finishPlacement gelaufen ist
        // (= action voll abgeschlossen). Bei placementsLeft>0 ist noch eine
        // 2. Setzung offen → kein Cursor-Advance.
        if (room.phase === 'CONNECTIONS_4X4' && room.connections?.phase === 'placement') {
          const stats = room.teamPhaseStats[payload.teamId];
          const stillHasPlacements = (stats?.placementsLeft ?? 0) > 0
            || (stats?.pendingMultiSlot ?? 0) > 0;
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
        const room = ensureQQRoom(payload.roomCode);
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
        qqChooseFreeAction(room, payload.teamId, payload.action);
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

    // Phase 4: Stapeln (eigenes Feld, permanent)
    socket.on('qq:stapelCell', (payload: QQStapelCellPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqStuckCell(room, payload.teamId, payload.row, payload.col);
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

    socket.on('qq:resetRoom', (payload: QQResetRoomPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqResetRoom(room);
        deleteSavedRoom(payload.roomCode).catch(() => {});
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
    // Steps: 0 = was ist Comeback, 1 = Team + H/L-Regeln (zusammengelegt).
    // Space-Druck bei Step 1 startet das H/L-Mini-Game (phase='question', erste
    // Frage geladen). Weitere Spaces steuern den H/L-Flow über qq:comebackHLStep.
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
    socket.on('qq:setQuizOptions', (
      payload: { roomCode: string; connectionsEnabled?: boolean; shuffleQuestionsInRound?: boolean },
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
