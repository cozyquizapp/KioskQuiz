/**
 * 4×4 Connections (Final-Mini-Game) — Dummy-AI.
 *
 * 2026-05-24 (Refactor #3.3): aus qqSocketHandlers.ts extrahiert. Bei
 * Connections-Bugs nur dieses File anfassen.
 *
 * Public:
 *  - maybeAutoConnections(io, roomCode): Dummy-AI fuer active + placement Phase
 *  - stopConnectionsAiTimers(roomCode):  Cleanup bei Phase-End/Reset
 *
 * Cross-Module: dispatchFreeChoice + maybeAutoPlace kommen aus qqSocketHandlers
 * via Lazy-Require (Circular-Dep-Vermeidung).
 */

import type { Server as SocketIOServer } from 'socket.io';
import {
  getQQRoom,
  qqSkipCurrentPlacement, qqStapelBonusCell, qqPlaceCell, qqStealCell, qqStuckCell,
  qqConnectionsAfterPlacement, qqConnectionsSubmitGroup,
  qqConnectionsAllDone, qqConnectionsToReveal,
} from './qqRooms';
import { pickDummyAction, DummyActionKind } from './qqDummyAI';
import { broadcastQQ } from './qqSocketHandlers';

function isDummy(room: import('./qqRooms').QQRoomState, teamId: string | null | undefined): boolean {
  if (!teamId) return false;
  return !!(room.teams as any)[teamId]?._dummy;
}

// Lazy-Require fuer dispatchFreeChoice (Circular-Dep mit qqSocketHandlers).
function callDispatchFreeChoice(
  io: SocketIOServer, roomCode: string, teamId: string, choice: any
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./qqSocketHandlers') as any;
    mod.dispatchFreeChoice?.(io, roomCode, teamId, choice);
  } catch { /* race during init */ }
}

/** Pro Raum + Team max ein laufender Connections-AI-Timer. */
const connectionsAiTimers: Map<string, Map<string, ReturnType<typeof setTimeout>>> = new Map();

function getConnAiTimerMap(roomCode: string): Map<string, ReturnType<typeof setTimeout>> {
  let m = connectionsAiTimers.get(roomCode);
  if (!m) { m = new Map(); connectionsAiTimers.set(roomCode, m); }
  return m;
}

/**
 * 4×4 Connections — Dummies während 'active' picken zufällig 4 Items und submitten.
 * Skill: 60% Chance auf eine echte Gruppe, sonst gemischter Mist.
 * Während 'placement': pendingFor-Dummy setzt via maybeAutoPlace-Pfad.
 */
export function maybeAutoConnections(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room) return;
  if (room.phase !== 'CONNECTIONS_4X4') return;
  if ((room as any).botsPaused) return;
  if (!room.connections) return;

  // ── Placement-Phase: Dummy waehlt + setzt Aktion (FREE-Menue) ─────────────
  if (room.connections.phase === 'placement') {
    const teamId = room.pendingFor;
    if (!teamId || !isDummy(room, teamId)) return;
    setTimeout(() => {
      const live = getQQRoom(roomCode);
      if (!live || live.phase !== 'CONNECTIONS_4X4') return;
      if (live.connections?.phase !== 'placement') return;
      if (live.pendingFor !== teamId) return;

      // 2026-05-05 (Wolf-Bug): Connections-Finale nutzt STAPEL_BONUS als
      // pendingAction. Bots-Logic erkannte vorher nur Legacy-Actions →
      // fielen in default-PLACE-Branch statt zu stapeln. STAPEL_BONUS →
      // qqStapelBonusCell (Multi-Stack erlaubt, kein stapelsUsed-Counter).
      if (live.pendingAction === 'STAPEL_BONUS') {
        const ownCells: { row: number; col: number }[] = [];
        for (let r = 0; r < live.grid.length; r++) {
          for (let c = 0; c < live.grid[r].length; c++) {
            if (live.grid[r][c].ownerId === teamId) ownCells.push({ row: r, col: c });
          }
        }
        if (ownCells.length === 0) {
          qqSkipCurrentPlacement(live);
          broadcastQQ(io, roomCode);
          if (live.connections?.phase === 'placement' && live.pendingFor) maybeAutoConnections(io, roomCode);
          return;
        }
        const pick = ownCells[Math.floor(Math.random() * ownCells.length)];
        try {
          qqStapelBonusCell(live, teamId, pick.row, pick.col);
          if (live.connections?.phase === 'placement') qqConnectionsAfterPlacement(live);
          broadcastQQ(io, roomCode);
          if (live.connections?.phase === 'placement' && live.pendingFor) maybeAutoConnections(io, roomCode);
        } catch { /* skip */ }
        return;
      }

      // Falls pendingAction noch FREE (Legacy-Pfad).
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
          broadcastQQ(io, roomCode);
          if (live.connections?.phase === 'placement' && live.pendingFor) maybeAutoConnections(io, roomCode);
          return;
        }
        callDispatchFreeChoice(io, roomCode, teamId, choice);
        return;
      }

      // pendingAction schon konkret (PLACE_1 / STEAL_1 / STAPEL_1): direkt ausfuehren.
      const concrete: DummyActionKind[] = live.pendingAction === 'STEAL_1' ? ['STEAL']
                                        : live.pendingAction === 'STAPEL_1' ? ['STAPEL']
                                        : ['PLACE'];
      const choice = pickDummyAction(live.grid, live.gridSize, teamId, {
        availableKinds: concrete, phase: live.gamePhaseIndex,
      });
      if (!choice) {
        qqSkipCurrentPlacement(live);
        broadcastQQ(io, roomCode);
        if (live.connections?.phase === 'placement' && live.pendingFor) maybeAutoConnections(io, roomCode);
        return;
      }
      try {
        if (choice.kind === 'PLACE') qqPlaceCell(live, teamId, choice.target!.row, choice.target!.col);
        else if (choice.kind === 'STEAL') qqStealCell(live, teamId, choice.target!.row, choice.target!.col);
        else if (choice.kind === 'STAPEL') qqStuckCell(live, teamId, choice.target!.row, choice.target!.col);
        if (live.connections?.phase === 'placement') qqConnectionsAfterPlacement(live);
        broadcastQQ(io, roomCode);
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
    if (timers.has(teamId)) continue;

    const usedItems = new Set<string>();
    for (const gid of tp.foundGroupIds) {
      const g = c.payload.groups.find(gg => gg.id === gid);
      g?.items.forEach(it => usedItems.add(it));
    }

    // Skill: 60% bewusste Gruppe, sonst gemischt.
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

    // Reaktionszeit: 4-9 Sek pro Versuch.
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
      ltp.selectedItems = localPick.slice();
      const result = qqConnectionsSubmitGroup(live, localTeamId);
      if (qqConnectionsAllDone(live) && live.connections?.phase === 'active') {
        qqConnectionsToReveal(live);
      }
      broadcastQQ(io, roomCode);
      if (live.connections?.phase === 'active') maybeAutoConnections(io, roomCode);
      void result;
    }, delay);
    timers.set(teamId, handle);
  }
}

/** Stoppe alle Connections-AI-Timer für einen Raum (z.B. bei Clear/Phase-End). */
export function stopConnectionsAiTimers(roomCode: string): void {
  const m = connectionsAiTimers.get(roomCode);
  if (!m) return;
  for (const h of m.values()) clearTimeout(h);
  m.clear();
}
