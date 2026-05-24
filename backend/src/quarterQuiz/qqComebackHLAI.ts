/**
 * Comeback Higher/Lower Mini-Game — Auto-Reveal-Timer + Dummy-AI.
 *
 * 2026-05-24 (Refactor #3.5): aus qqSocketHandlers.ts extrahiert. Bei
 * Comeback-HL-Bugs nur dieses File anfassen.
 *
 * Public:
 *  - maybeAutoComebackChoice: Dummy waehlt automatisch Steal-Aktion
 *  - scheduleHLAutoReveal:    Timer-Ablauf-Reveal fuer Frage-Phase
 *  - clearHLAutoReveal:       Timer manuell stoppen
 *  - maybeDummyAnswerHL:      Dummies antworten 50/50 higher/lower
 *
 * Cross-Module: maybeAutoPlace via Lazy-Require (Circular-Dep-Vermeidung).
 */

import type { Server as SocketIOServer } from 'socket.io';
import {
  getQQRoom,
  qqComebackAutoApplySteal, qqComebackHLReveal, qqComebackHLSubmitAnswer,
} from './qqRooms';
import { broadcastQQ } from './qqSocketHandlers';

function callMaybeAutoPlace(io: SocketIOServer, roomCode: string): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./qqSocketHandlers') as { maybeAutoPlace: (i: SocketIOServer, r: string) => void };
    mod.maybeAutoPlace(io, roomCode);
  } catch { /* race during init */ }
}

/**
 * Wenn COMEBACK_CHOICE + pendingFor ist ein Dummy: Steal-Aktion auto-anwenden
 * nach kurzer Verzögerung (1.5s, damit Mod/Beamer den Übergang sehen).
 */
export function maybeAutoComebackChoice(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  if (room.phase !== 'COMEBACK_CHOICE') return;
  if ((room as any).botsPaused) return;
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
      callMaybeAutoPlace(io, roomCode);
    } catch { /* skip */ }
  }, 1500);
}

/** Scheduled Auto-Reveal fuer das Comeback-H/L-Mini-Game. Wird nach jedem
 *  Rundenstart aufgerufen — wenn der Timer ablaeuft und nicht alle geantwortet
 *  haben, triggert automatisch den Reveal. Fehlende Antworten zaehlen als falsch. */
export function scheduleHLAutoReveal(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room || !room.comebackHL) return;
  if (room.comebackHL.phase !== 'question') return;
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
export function clearHLAutoReveal(
  room: { _comebackHLTimerHandle: ReturnType<typeof setTimeout> | null }
): void {
  if (room._comebackHLTimerHandle) {
    clearTimeout(room._comebackHLTimerHandle);
    room._comebackHLTimerHandle = null;
  }
}

/** Dummy-Teams antworten 50/50 higher/lower (random) staggered 0.8-2.5s. */
export function maybeDummyAnswerHL(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room || !room.comebackHL) return;
  if ((room as any).botsPaused) return;
  const hl = room.comebackHL;
  if (hl.phase !== 'question') return;
  const dummies = hl.teamIds.filter(id => {
    const t = (room.teams as any)[id];
    return t && t._dummy && hl.answers[id] == null;
  });
  if (dummies.length === 0) return;
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
