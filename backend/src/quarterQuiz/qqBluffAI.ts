/**
 * Bluff (Bunte Tüte sub-mechanic) — Dummy-AI + Timer-Handler.
 *
 * 2026-05-24 (Refactor #3 von 5 — Socket-Handler-Modularisierung): vorher
 * inline in qqSocketHandlers.ts. Beim Bug-Audit hat man 4093 Zeilen + 91
 * Events durchsucht; jetzt ist die komplette Bluff-AI in ~150 Zeilen
 * isoliert. Bei Bluff-Bugs: nur dieses File anfassen.
 *
 * Public:
 *  - bluffWriteTimeout(io, roomCode): Write-Timer-Ablauf-Handler
 *  - bluffVoteTimeout(io, roomCode):  Vote-Timer-Ablauf-Handler
 *  - maybeAutoBluffWrite(io, roomCode): Dummy-AI tippt Bluff-Antwort
 *  - maybeAutoBluffVote(io, roomCode):  Dummy-AI wählt Vote-Option
 *
 * Privat: generateDummyBluff(real) — fake-Antwort fuer Dummy-Submits.
 */

import type { Server as SocketIOServer } from 'socket.io';
import {
  getQQRoom,
  qqBluffAdvanceFromVote, qqBluffAdvanceFromWrite,
  qqBluffSubmit, qqBluffAllSubmitted, qqBluffAllVoted, qqBluffVote,
} from './qqRooms';
import { broadcastQQ } from './qqSocketHandlers';

function isDummy(room: import('./qqRooms').QQRoomState, teamId: string | null | undefined): boolean {
  if (!teamId) return false;
  return !!(room.teams as any)[teamId]?._dummy;
}

/**
 * Bluff Write-Timer-Ablauf. Wenn niemand geblufft hat: nicht advancen
 * (Mod kann manuell skippen via qq:revealAnswer). Sonst: zu Vote.
 */
export function bluffWriteTimeout(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room || room.bluffPhase !== 'write') return;
  const hasSubmit = Object.values(room.bluffSubmissions ?? {}).some(t => t?.trim());
  if (!hasSubmit) {
    broadcastQQ(io, roomCode);
    return;
  }
  qqBluffAdvanceFromWrite(room, () => bluffVoteTimeout(io, roomCode));
  broadcastQQ(io, roomCode);
  if ((room.bluffPhase as string) === 'vote') {
    maybeAutoBluffVote(io, roomCode);
  }
}

/**
 * Bluff Vote-Timer-Ablauf. 0-Vote-Gate: bleibt offen falls niemand
 * gevotet hat (Mod skippt manuell). Sonst: Reveal.
 */
export function bluffVoteTimeout(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room || room.bluffPhase !== 'vote') return;
  const hasVote = Object.keys(room.bluffVotes ?? {}).length > 0;
  if (!hasVote) {
    broadcastQQ(io, roomCode);
    return;
  }
  qqBluffAdvanceFromVote(room);
  broadcastQQ(io, roomCode);
}

/**
 * Bluff Dummy-AI während write-Phase: nach 3-8s tippt jeder Dummy einen
 * plausibel klingenden Bluff. Simpel: random year / fake answer.
 */
export function maybeAutoBluffWrite(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room || room.bluffPhase !== 'write') return;
  if ((room as any).botsPaused) return;
  for (const teamId of room.joinOrder) {
    if (!isDummy(room, teamId)) continue;
    if (room.bluffSubmissions[teamId]) continue;
    const delay = 3000 + Math.random() * 5000;
    const localTeamId = teamId;
    setTimeout(() => {
      const live = getQQRoom(roomCode);
      if (!live || live.bluffPhase !== 'write') return;
      if (live.bluffSubmissions[localTeamId]) return;
      const q = live.currentQuestion;
      const real = q?.bunteTuete?.kind === 'bluff' ? q.bunteTuete.realAnswer ?? '' : '';
      const fakeAnswer = generateDummyBluff(real);
      qqBluffSubmit(live, localTeamId, fakeAnswer);
      if (qqBluffAllSubmitted(live)) {
        qqBluffAdvanceFromWrite(live, () => bluffVoteTimeout(io, roomCode));
        broadcastQQ(io, roomCode);
        if ((live.bluffPhase as string) === 'vote') maybeAutoBluffVote(io, roomCode);
      } else {
        broadcastQQ(io, roomCode);
      }
    }, delay);
  }
}

/**
 * Bluff Dummy-AI während vote-Phase: nach 4-9s wählt jeder Dummy zufällig.
 * Skill: 40% echten Bluff, sonst random.
 */
export function maybeAutoBluffVote(io: SocketIOServer, roomCode: string): void {
  const room = getQQRoom(roomCode);
  if (!room || room.bluffPhase !== 'vote') return;
  if ((room as any).botsPaused) return;
  for (const teamId of room.joinOrder) {
    if (!isDummy(room, teamId)) continue;
    if (room.bluffVotes[teamId]) continue;
    const localTeamId = teamId;
    const delay = 4000 + Math.random() * 5000;
    setTimeout(() => {
      const live = getQQRoom(roomCode);
      if (!live || live.bluffPhase !== 'vote') return;
      if (live.bluffVotes[localTeamId]) return;
      const teamOpts = live.bluffOptionsByTeam[localTeamId] ?? live.bluffOptions;
      const candidates = teamOpts.filter(o => {
        if (o.source === 'team' && o.contributors.includes(localTeamId)) return false;
        return true;
      });
      if (candidates.length === 0) return;
      const real = candidates.find(o => o.source === 'real');
      const beCorrect = Math.random() < 0.4;
      const choice = (beCorrect && real) ? real : candidates[Math.floor(Math.random() * candidates.length)];
      qqBluffVote(live, localTeamId, choice.id);
      if (qqBluffAllVoted(live)) {
        qqBluffAdvanceFromVote(live);
        broadcastQQ(io, roomCode);
      } else {
        broadcastQQ(io, roomCode);
      }
    }, delay);
  }
}

/** Helper: zufälliger Bluff-Text. Bei Zahl-Antworten: ähnliche Zahl. */
function generateDummyBluff(real: string): string {
  const trimmed = (real ?? '').trim();
  const num = Number(trimmed.replace(/\./g, '').replace(/,/g, '.'));
  if (Number.isFinite(num) && /\d/.test(trimmed)) {
    const sign = Math.random() < 0.5 ? -1 : 1;
    const factor = 1 + sign * (0.1 + Math.random() * 0.2);
    const rounded = Math.round(num * factor);
    return String(rounded);
  }
  const fillers = [
    'Theodor Wagner', 'Bertha Schmidt', 'Otto Hansen',
    'In den 1920er-Jahren', '1888', '1956', '1974',
    'Albert Lichtblick', 'Henry Watson', 'Eleanora Blanche',
  ];
  return fillers[Math.floor(Math.random() * fillers.length)];
}
