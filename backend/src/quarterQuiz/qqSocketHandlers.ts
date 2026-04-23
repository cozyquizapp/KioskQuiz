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
  QQBombCellPayload, QQShieldClusterPayload, QQSandLockCellPayload,
  QQStartRulesPayload, QQRulesNextPayload, QQRulesPrevPayload, QQRulesFinishPayload,
} from '../../../shared/quarterQuizTypes';
import { scheduleSave, loadAllRooms, deleteSavedRoom } from './qqPersist';
import {
  ensureQQRoom, getQQRoom, insertQQRoom, buildQQStateUpdate, QQError,
  qqJoinTeam, qqSetTeamConnected, qqStartGame, qqActivateQuestion,
  qqRevealAnswer, qqShowImage, qqMarkCorrect, qqMarkWrong, qqUndoMarkCorrect, qqPlaceCell, qqStealCell,
  qqChooseFreeAction, qqApplyComebackChoice, qqComebackAutoApplySteal, qqSwapCells,
  qqSwapOneCell, qqFreezeCell, qqStuckCell, qqBombCell, qqSandLockCell, qqShieldCluster,
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
} from './qqRooms';
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

function persistGameResult(room: ReturnType<typeof getQQRoom>): void {
  if (!room) return;
  const teamList = Object.values(room.teams);
  const scores: Record<string, number> = {};
  teamList.forEach((t: any) => { scores[t.id] = (room.teamPhaseStats[t.id] as any)?.totalScore ?? 0; });
  const sorted = [...teamList].sort((a: any, b: any) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  const winner = (sorted[0] as any)?.name ?? null;

  // Flush last question's answers into history (covers GAME_OVER / last-of-final-phase)
  qqFlushQuestionToHistory(room);

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

  // Bei mehreren Gewinnern nach Antwortzeit sortieren (schnellstes Team zuerst).
  // Gilt für MUCHO (mehrere richtige Antworten) UND ZEHN_VON_ZEHN (Tiebreak bei
  // gleichem Bet-Max auf die richtige Option).
  const sortedWinners = [...result.winnerTeamIds].sort((a, b) => {
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
      if (isDuplicate && normalizedAnswer.length > 0) {
        live.hotPotatoLastAnswer = trimmed;
        qqHotPotatoEliminate(live, turnExpired);
      } else {
        const validList = validAnswers;
        const isMatch = validList.some(v => similarityScore(trimmed, v) >= 0.8);
        if (isMatch) {
          live.hotPotatoUsedAnswers.push(trimmed);
          live.hotPotatoAnswerAuthors.push(activeId);
          qqHotPotatoMarkQualified(live, activeId);
          qqHotPotatoNext(live, turnExpired);
        } else {
          // Als "falsch" behandeln → Dummy wird eliminiert
          live.hotPotatoLastAnswer = trimmed;
          qqHotPotatoEliminate(live, turnExpired);
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
    const bombUsed = !!stats?.bombUsed;
    const shieldUsed = !!stats?.shieldUsed;
    const sandUsed = !!stats?.sandUsed;

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

    // ── FREE (Phase 3+ volle Auswahl) ───────────────────────────────────────
    if (action === 'FREE') {
      const kinds: DummyActionKind[] = ['PLACE', 'STEAL'];
      if (phase >= 3) { kinds.push('BOMB'); kinds.push('SHIELD'); kinds.push('SANDUHR'); }
      if (phase >= 4) { kinds.push('STAPEL'); kinds.push('SWAP'); }
      const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: kinds, phase, bombUsed, shieldUsed, sandUsed,
      });
      if (!choice) { skipStuckDummy(); return; }
      dispatchFreeChoice(io, roomCode, teamId, choice);
      return;
    }

    // ── Follow-up-Steps nach chooseFreeAction (falls Flow aus User-UI käme) ──
    if (action === 'BOMB_1') {
      const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: ['BOMB'], phase, bombUsed: false,
      });
      if (!choice) { skipStuckDummy(); return; }
      try {
        qqBombCell(live, teamId, choice.target!.row, choice.target!.col);
        broadcastQQ(io, roomCode);
        if (live.phase === 'PLACEMENT' && live.pendingFor) maybeAutoPlace(io, roomCode);
      } catch { /* skip */ }
      return;
    }
    if (action === 'SANDUHR_1') {
      const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: ['SANDUHR'], phase, sandUsed: false,
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
      try {
        qqShieldCluster(live, teamId);
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

/** Hilfs-Dispatcher: aus FREE-Wahl erst chooseFreeAction, dann Follow-up. */
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
      return;
    }
    if (choice.kind === 'STEAL') {
      qqChooseFreeAction(live, teamId, 'STEAL');
      broadcastQQ(io, roomCode);
      // Direkt selbes Ziel klauen, um nicht neu zu enumerieren.
      setTimeout(() => {
        const live2 = getQQRoom(roomCode);
        if (!live2 || live2.phase !== 'PLACEMENT') return;
        if (live2.pendingFor !== teamId || live2.pendingAction !== 'STEAL_1') return;
        try {
          qqStealCell(live2, teamId, choice.target!.row, choice.target!.col);
          broadcastQQ(io, roomCode);
          if (live2.phase === 'PLACEMENT' && live2.pendingFor) maybeAutoPlace(io, roomCode);
        } catch { /* skip */ }
      }, 700);
      return;
    }
    if (choice.kind === 'BOMB') {
      qqChooseFreeAction(live, teamId, 'BOMB');
      broadcastQQ(io, roomCode);
      setTimeout(() => {
        const live2 = getQQRoom(roomCode);
        if (!live2 || live2.phase !== 'PLACEMENT') return;
        if (live2.pendingFor !== teamId || live2.pendingAction !== 'BOMB_1') return;
        try {
          qqBombCell(live2, teamId, choice.target!.row, choice.target!.col);
          broadcastQQ(io, roomCode);
          if (live2.phase === 'PLACEMENT' && live2.pendingFor) maybeAutoPlace(io, roomCode);
        } catch { /* skip */ }
      }, 900);
      return;
    }
    if (choice.kind === 'SANDUHR') {
      qqChooseFreeAction(live, teamId, 'SANDUHR');
      broadcastQQ(io, roomCode);
      setTimeout(() => {
        const live2 = getQQRoom(roomCode);
        if (!live2 || live2.phase !== 'PLACEMENT') return;
        if (live2.pendingFor !== teamId || live2.pendingAction !== 'SANDUHR_1') return;
        try {
          qqSandLockCell(live2, teamId, choice.target!.row, choice.target!.col);
          broadcastQQ(io, roomCode);
          if (live2.phase === 'PLACEMENT' && live2.pendingFor) maybeAutoPlace(io, roomCode);
        } catch { /* skip */ }
      }, 900);
      return;
    }
    if (choice.kind === 'SHIELD') {
      qqChooseFreeAction(live, teamId, 'SHIELD');
      broadcastQQ(io, roomCode);
      setTimeout(() => {
        const live2 = getQQRoom(roomCode);
        if (!live2 || live2.phase !== 'PLACEMENT') return;
        if (live2.pendingFor !== teamId) return;
        try {
          // qqChooseFreeAction('SHIELD') wendet Shield direkt an (kein SHIELD_1-Step),
          // aber falls doch auf SHIELD_1 gewartet wird, decken wir beides ab.
          if (live2.pendingAction === 'SHIELD_1') qqShieldCluster(live2, teamId);
          broadcastQQ(io, roomCode);
          if (live2.phase === 'PLACEMENT' && live2.pendingFor) maybeAutoPlace(io, roomCode);
        } catch { /* skip */ }
      }, 900);
      return;
    }
    if (choice.kind === 'STAPEL') {
      qqChooseFreeAction(live, teamId, 'STAPEL');
      broadcastQQ(io, roomCode);
      setTimeout(() => {
        const live2 = getQQRoom(roomCode);
        if (!live2 || live2.phase !== 'PLACEMENT') return;
        if (live2.pendingFor !== teamId || live2.pendingAction !== 'STAPEL_1') return;
        try {
          qqStuckCell(live2, teamId, choice.target!.row, choice.target!.col);
          broadcastQQ(io, roomCode);
          if (live2.phase === 'PLACEMENT' && live2.pendingFor) maybeAutoPlace(io, roomCode);
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
        // Dummies automatisch antworten lassen
        maybeAutoSimulateAnswers(io, payload.roomCode);
        // Hot Potato / Imposter: falls aktives Team ein Dummy ist, Kette starten.
        if (room.currentQuestion?.bunteTuete?.kind === 'hotPotato') {
          maybeAutoHotPotato(io, payload.roomCode);
        }
        if (room.currentQuestion?.bunteTuete?.kind === 'oneOfEight') {
          maybeAutoImposter(io, payload.roomCode);
        }
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
            room.hotPotatoUsedAnswers.push(trimmed);
            room.hotPotatoAnswerAuthors.push(payload.teamId);
            qqHotPotatoMarkQualified(room, payload.teamId);

            // Pool erschöpft oder nur noch 1 alive? → Runde endet sofort
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

            // Weiter: nächstes Team, nochmal prüfen
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

        // No auto-match — wait for moderator judgment
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
        broadcast(io, payload.roomCode);
        // Falls noch Dummy in der placementQueue → weiter automatisch platzieren
        maybeAutoPlace(io, payload.roomCode);
        if (typeof ack === 'function') (ack as AckFn)({ ok: true, ...result } as any);
      } catch (e) { fail(ack, e); }
    });

    socket.on('qq:stealCell', (payload: QQStealCellPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        const result = qqStealCell(room, payload.teamId, payload.row, payload.col);
        broadcast(io, payload.roomCode);
        maybeAutoPlace(io, payload.roomCode);
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

    // Phase 4: Stapeln (eigenes Feld, permanent)
    socket.on('qq:stapelCell', (payload: QQStapelCellPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqStuckCell(room, payload.teamId, payload.row, payload.col);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Phase 3+: Bombe (Gegnerfeld → neutral, 1× pro Phase)
    socket.on('qq:bombCell', (payload: QQBombCellPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqBombCell(room, payload.teamId, payload.row, payload.col);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Phase 3+: Sanduhr-Sperre (Gegner-/Leerfeld → 3 Fragen blockiert, 1× pro Phase)
    socket.on('qq:sandLockCell', (payload: QQSandLockCellPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqSandLockCell(room, payload.teamId, payload.row, payload.col);
        broadcast(io, payload.roomCode);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // Phase 3+: Schild (größtes eigenes Cluster bis Phasenende, 1× pro Phase)
    socket.on('qq:shieldCluster', (payload: QQShieldClusterPayload, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        qqShieldCluster(room, payload.teamId);
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
    // Steps: 0 = was ist Comeback, 1 = warum DIESES Team, 2 = Aktion erklären
    // (wie viele Felder klauen, von wem). Der Space-Druck bei Step 2 startet
    // automatisch die Klau-Aktion (qqComebackAutoApplySteal) – keine
    // PLACE_2/STEAL_1/SWAP_2-Auswahl mehr.
    socket.on('qq:comebackIntroStep', (payload: { roomCode: string }, ack?: unknown) => {
      try {
        const room = ensureQQRoom(payload.roomCode);
        if (room.phase !== 'COMEBACK_CHOICE') { ok(ack); return; }
        const maxStep = 2;
        if (room.comebackIntroStep < maxStep) {
          room.comebackIntroStep += 1;
          broadcast(io, payload.roomCode);
        } else {
          qqComebackAutoApplySteal(room);
          broadcast(io, payload.roomCode);
          // Dummy als Comeback-Team? → automatisch Klau ausführen.
          if ((room.phase as string) === 'PLACEMENT' && room.pendingFor) {
            maybeAutoPlace(io, payload.roomCode);
          }
        }
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    // ── MUCHO Akt-1 Step (Moderator deckt Team-Voter pro Option nacheinander auf) ─
    // Leere Optionen werden übersprungen — wir zählen nur Optionen mit ≥1 Voter.
    // maxStep = nonEmptyOptions.length + 1 (+1 für „Jäger starten" → Akt 2+3 auf Beamer).
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
        const maxStep = nonEmpty + 1;
        if (room.muchoRevealStep < maxStep) {
          room.muchoRevealStep += 1;
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
