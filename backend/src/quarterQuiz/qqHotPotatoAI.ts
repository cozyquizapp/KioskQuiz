/**
 * Hot Potato + Imposter — Dummy-AI + Timer-Handler.
 *
 * 2026-05-24 (Refactor #3.2): aus qqSocketHandlers.ts extrahiert. Bei
 * Hot-Potato / Imposter-Bugs nur dieses File anfassen.
 *
 * Public:
 *  - hotPotatoTurnExpiredFor(io, roomCode): Curry-Handler fuer Turn-Timer
 *  - maybeAutoHotPotato(io, roomCode):     Dummy-AI fuer aktive HP-Runde
 *  - maybeAutoImposter(io, roomCode):      Dummy-AI fuer Imposter-Runde
 *
 * Cross-Module-Aufrufe: maybeAutoPlace kommt aus qqSocketHandlers — Lazy-
 * Import damit kein Circular-Dep-Problem beim Module-Init entsteht.
 */

import type { Server as SocketIOServer } from 'socket.io';
import {
  getQQRoom,
  qqHotPotatoEliminate, qqHotPotatoCheckWinner, qqClearHotPotatoTimer,
  qqRevealAnswer, qqMarkWrong, qqMarkCorrect, qqClearBuzz,
  qqHotPotatoNext, qqHotPotatoMarkQualified, qqImposterChoose,
} from './qqRooms';
import { broadcastQQ } from './qqSocketHandlers';
import { normalizeText, similarityScore } from '../../../shared/textNormalization';

function isDummy(room: import('./qqRooms').QQRoomState, teamId: string | null | undefined): boolean {
  if (!teamId) return false;
  return !!(room.teams as any)[teamId]?._dummy;
}

// Lazy-Import um Circular-Dep zu vermeiden (qqSocketHandlers importiert
// dieses File + dieses File braucht maybeAutoPlace von dort).
function callMaybeAutoPlace(io: SocketIOServer, roomCode: string): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./qqSocketHandlers') as { maybeAutoPlace: (i: SocketIOServer, r: string) => void };
    mod.maybeAutoPlace(io, roomCode);
  } catch {
    /* module not yet loaded — race during init, ignore */
  }
}

/**
 * Modul-Level Turn-Expire-Handler. Wird sowohl von qqHotPotatoStart als auch
 * von maybeAutoHotPotato verwendet, damit Timer-Callbacks weiterleiten.
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
      maybeAutoHotPotato(io, roomCode);
    } catch { /* room gone */ }
  };
}

/**
 * Hot Potato Dummy-AI: aktiver Slot ist ein Dummy → nach 900-2400ms liefert er
 * eine gueltige (oder absichtlich falsche) Antwort. Correct-Quote sinkt mit der
 * Zahl bereits verbrauchter Antworten (0.40 → 0.08), damit der Spannungsbogen
 * erhalten bleibt.
 */
export function maybeAutoHotPotato(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  if (room.phase !== 'QUESTION_ACTIVE') return;
  if ((room as any).botsPaused) return;
  const q = room.currentQuestion;
  if (!q || q.category !== 'BUNTE_TUETE' || q.bunteTuete?.kind !== 'hotPotato') return;
  const activeId = room.hotPotatoActiveTeamId;
  if (!activeId) return;
  if (!isDummy(room, activeId)) return;

  const validAnswers = (q.answer || '')
    .split(/[,;]/)
    .map(a => a.replace(/[…\.]+$/, '').trim())
    .filter(a => a.length > 0);
  const usedNorm = room.hotPotatoUsedAnswers.map(u => normalizeText(u));
  const unused = validAnswers.filter(v =>
    !usedNorm.some(u => similarityScore(u, v) >= 0.8),
  );

  // Skill-Decay damit Dummies nicht alle Antworten leerziehen (Wolf-Bug
  // 2026-05-06: 'Bots sind zu gut bei Hot Potato'). Base 0.40, -0.04 pro
  // verbrauchter Antwort, Floor 0.08.
  const usedCount = room.hotPotatoUsedAnswers.length;
  const correctChance = Math.max(0.08, 0.40 - usedCount * 0.04);
  const beCorrect = Math.random() < correctChance && unused.length > 0;
  const answer = beCorrect
    ? unused[Math.floor(Math.random() * unused.length)]
    : `Dummy-${Math.random().toString(36).slice(2, 6)}`;

  const delay = 900 + Math.random() * 1500;
  const turnExpired = hotPotatoTurnExpiredFor(io, roomCode);
  setTimeout(() => {
    const live = getQQRoom(roomCode);
    if (!live || live.phase !== 'QUESTION_ACTIVE') return;
    if (live.hotPotatoActiveTeamId !== activeId) return;
    try {
      const trimmed = answer.slice(0, 500);
      const normalizedAnswer = normalizeText(trimmed);
      const isDuplicate = live.hotPotatoUsedAnswers.some(
        u => normalizeText(u) === normalizedAnswer,
      );
      // Wolf-Wunsch 2026-04-28 'keine strikes': Dummies eliminieren sich NICHT
      // mehr auf falsche/Duplikat-Tipps. Sie probieren bis Turn-Timer expired.
      if (isDuplicate && normalizedAnswer.length > 0) {
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
          live.hotPotatoLastAnswer = trimmed;
        }
      }
      broadcastQQ(io, roomCode);
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
        if ((live.phase as string) === 'PLACEMENT' && live.pendingFor) {
          callMaybeAutoPlace(io, roomCode);
        }
      } else {
        maybeAutoHotPotato(io, roomCode);
      }
    } catch { /* skip */ }
  }, delay);
}

/**
 * Imposter-Dummy-AI: 70% korrekte Aussage, sonst random. qqImposterChoose
 * erledigt Eliminierung + Weiterreichen, hier nur die Bot-Entscheidung.
 */
export function maybeAutoImposter(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  if (room.phase !== 'QUESTION_ACTIVE') return;
  if ((room as any).botsPaused) return;
  const q = room.currentQuestion;
  if (!q || q.category !== 'BUNTE_TUETE' || q.bunteTuete?.kind !== 'oneOfEight') return;
  const activeId = room.imposterActiveTeamId;
  if (!activeId) return;
  if (!isDummy(room, activeId)) return;

  const total = q.bunteTuete.statements.length;
  const falseIdx = q.bunteTuete.falseIndex;
  const used = room.imposterChosenIndices;

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
        callMaybeAutoPlace(io, roomCode);
      } else {
        maybeAutoImposter(io, roomCode);
      }
    } catch { /* skip */ }
  }, delay);
}
