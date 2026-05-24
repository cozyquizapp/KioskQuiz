/**
 * Only Connect (Bunte Tüte sub-mechanic '4 gewinnt') — Dummy-AI.
 *
 * 2026-05-24 (Refactor #3.4): aus qqSocketHandlers.ts extrahiert. Bei
 * OnlyConnect-Bugs nur dieses File anfassen.
 *
 * Pro Dummy: nach 3-7s entscheidet er sich zwischen Hint freischalten oder
 * Tippen. Höherer Hint-Stand → höhere Tipp- und Treffer-Wahrscheinlichkeit.
 * Reschedult sich selbst bis Team gesperrt oder richtig.
 *
 * Public:
 *  - maybeAutoOnlyConnect(io, roomCode)
 *  - stopOnlyConnectAiTimers(roomCode, teamId?)
 */

import type { Server as SocketIOServer } from 'socket.io';
import {
  getQQRoom,
  qqOnlyConnectAdvanceTeamHint, qqOnlyConnectSubmitGuess,
  qqOnlyConnectCanAutoFinish, qqOnlyConnectAutoFinish,
} from './qqRooms';
import { broadcastQQ } from './qqSocketHandlers';

function isDummy(room: import('./qqRooms').QQRoomState, teamId: string | null | undefined): boolean {
  if (!teamId) return false;
  return !!(room.teams as any)[teamId]?._dummy;
}

const onlyConnectAiTimers: Map<string, Map<string, ReturnType<typeof setTimeout>>> = new Map();

function getOnlyConnectAiTimerMap(roomCode: string): Map<string, ReturnType<typeof setTimeout>> {
  let m = onlyConnectAiTimers.get(roomCode);
  if (!m) { m = new Map(); onlyConnectAiTimers.set(roomCode, m); }
  return m;
}

export function stopOnlyConnectAiTimers(roomCode: string, teamId?: string): void {
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

export function maybeAutoOnlyConnect(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  if (room.phase !== 'QUESTION_ACTIVE') return;
  if ((room as any).botsPaused) return;
  // 2026-05-04 (Wolf-Bug): Nach Timer-Ablauf keine neuen Dummy-Ticks — sonst
  // submitten Bots noch waehrend Reveal-Wartezeit.
  if (room.timerExpired) return;
  if (room.currentQuestion?.bunteTuete?.kind !== 'onlyConnect') return;

  const timers = getOnlyConnectAiTimerMap(roomCode);

  for (const teamId of room.joinOrder) {
    if (!isDummy(room, teamId)) continue;
    if (room.onlyConnectLockedTeams.includes(teamId)) continue;
    if (room.onlyConnectGuesses.some(g => g.teamId === teamId && g.correct)) continue;
    if (timers.has(teamId)) continue;

    const localTeamId = teamId;
    // 2026-04-30 (User-Bug 'dummy avatare nicht auf hinweisen'): 3-7s statt 4-12s
    // = oefter Decision-Punkte pro Runde.
    const delay = 3000 + Math.random() * 4000;
    const handle = setTimeout(() => {
      timers.delete(localTeamId);
      const live = getQQRoom(roomCode);
      if (!live) return;
      if (live.phase !== 'QUESTION_ACTIVE') return;
      if (live.currentQuestion?.bunteTuete?.kind !== 'onlyConnect') return;
      if (live.onlyConnectLockedTeams.includes(localTeamId)) return;
      if (live.onlyConnectGuesses.some(g => g.teamId === localTeamId && g.correct)) return;

      const curIdx = live.onlyConnectHintIndices[localTeamId] ?? 0;
      const curStrikes = live.onlyConnectStrikes[localTeamId] ?? 0;
      // 2026-05-03 (Wolf-Wunsch per-Team-Hints): Bots managen ihren eigenen
      // Hint-Stand. guessProb pro Hint-Level (idx=0 nie tippen — Insta-End-Risiko).
      let guessProb = curIdx === 0 ? 0 : curIdx === 1 ? 0.12 : curIdx === 2 ? 0.55 : 1.0;
      if (curStrikes >= 2 && curIdx < 3) guessProb = 0;
      const shouldGuess = Math.random() < guessProb;

      if (!shouldGuess) {
        // Nicht tippen — evtl. Hint freischalten oder warten.
        if (curIdx < 3) {
          const advanceProb = curIdx === 0 ? 0.65 : curIdx === 1 ? 0.40 : 0.30;
          if (Math.random() < advanceProb) {
            qqOnlyConnectAdvanceTeamHint(live, localTeamId);
            broadcastQQ(io, roomCode);
          }
        }
        maybeAutoOnlyConnect(io, roomCode);
        return;
      }

      // Submit guess: Treffer-Wahrscheinlichkeit steigt mit Hint-Level.
      const accProb = curIdx === 0 ? 0.20 : curIdx === 1 ? 0.55 : curIdx === 2 ? 0.78 : 0.92;
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
      // AutoFinish nur wenn AllDone + MinHint + MinDuration.
      if (qqOnlyConnectCanAutoFinish(live)) {
        qqOnlyConnectAutoFinish(live);
      }
      broadcastQQ(io, roomCode);
      maybeAutoOnlyConnect(io, roomCode);
    }, delay);

    timers.set(localTeamId, handle);
  }
}
