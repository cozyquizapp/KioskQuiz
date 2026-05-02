// Autosave/Restore fuer QQ-Rooms. Ermoeglicht Recovery nach Render-Sleep oder
// Server-Restart mitten im Spiel.
//
// Strategie:
//  - Pro Room eine JSON-Datei in QQ_PERSIST_DIR (default .qq-rooms/).
//  - Autosave wird nach jedem broadcastQQ angestossen, mit 2s Debounce pro Room.
//  - Beim Serverstart werden alle Snapshots geladen, nicht-serialisierbare Felder
//    (Timer-Handles, onExpire-Callbacks) rekonstruieren wir NICHT — stattdessen
//    werden laufende Timer auf PAUSED gefroren, sodass der Moderator manuell
//    weiterfaehrt. Das ist defensiv, aber deutlich sicherer als stale Callbacks.
//  - GAME_OVER / LOBBY werden uebersprungen (nichts zu retten).

import { promises as fs } from 'fs';
import * as path from 'path';
import type { QQRoomState } from './qqRooms';

const PERSIST_DIR = process.env.QQ_PERSIST_DIR
  ? path.resolve(process.env.QQ_PERSIST_DIR)
  : path.join(process.cwd(), '.qq-rooms');

const DEBOUNCE_MS = 2000;
const MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4h — muss zu QQ_ROOM_TTL_MS passen

// Felder, die nicht serialisiert werden duerfen (Node-Handles / Closures).
// 2026-05-02 (Persistence-Audit P-1): 5 Sub-Mechanik-Timer-Handles fehlten —
// JSON.stringify warf auf zirkulaeren Node-Timer-Refs (_idlePrev/_idleNext) und
// Snapshots schlugen WAEHREND aktiver Bluff/Connections/OC/Comeback-Phasen still
// fehl (warn im Log). Render-Sleep mitten in Bluff-Write hatte dann keinen
// aktuellen Snapshot. Alle Timer-Handles + onExpire-Closures jetzt drin.
const SKIP_KEYS = new Set<string>([
  'timerHandle',
  '_timerOnExpire',
  '_hotPotatoTimerHandle',
  '_hotPotatoOnExpire',
  '_mapRevealTimerHandle',
  '_bluffWriteTimerHandle',
  '_bluffVoteTimerHandle',
  '_bluffWriteOnExpire',
  '_bluffVoteOnExpire',
  '_connectionsTimerHandle',
  '_connectionsOnExpire',
  '_onlyConnectHintTimerHandle',
  '_comebackHLTimerHandle',
]);

function sanitize(room: QQRoomState): unknown {
  return JSON.parse(JSON.stringify(room, (key, value) => {
    if (SKIP_KEYS.has(key)) return undefined;
    if (typeof value === 'function') return undefined;
    return value;
  }));
}

async function ensureDir(): Promise<void> {
  try { await fs.mkdir(PERSIST_DIR, { recursive: true }); } catch { /* ignore */ }
}

function fileFor(roomCode: string): string {
  // roomCodes sind bei QQ bereits alphanumerisch (6-stellig) — trotzdem hart whitelisten.
  const safe = roomCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(PERSIST_DIR, `${safe}.json`);
}

// ── Debounced autosave ─────────────────────────────────────────────────────
// 2026-05-02 (Persistence-Audit P-5): zusaetzlich zum Timer-Handle auch die
// Room-Referenz im Map speichern, damit flushAllPendingSaves() bei SIGTERM/
// SIGINT synchron alle ausstehenden 2s-Debounces sofort wegschreiben kann.
interface PendingSave { handle: NodeJS.Timeout; room: QQRoomState; }
const pendingSaves = new Map<string, PendingSave>();

export function scheduleSave(room: QQRoomState): void {
  // LOBBY ohne Spieler = nichts wert, und GAME_OVER bleibt fuer Stats, aber wir
  // speichern es trotzdem (Thanks-Folie + Ranking sollen ueberleben).
  if (room.phase === 'LOBBY' && Object.keys(room.teams).length === 0) return;

  const existing = pendingSaves.get(room.roomCode);
  if (existing) clearTimeout(existing.handle);

  const handle = setTimeout(() => {
    pendingSaves.delete(room.roomCode);
    saveRoomNow(room).catch(err => {
      console.warn('[QQ-persist] save failed for', room.roomCode, err?.message ?? err);
    });
  }, DEBOUNCE_MS);
  pendingSaves.set(room.roomCode, { handle, room });
}

/**
 * 2026-05-02 (Persistence-Audit P-5): Synchroner Flush aller debounced Saves.
 * Wird vom SIGTERM/SIGINT-Handler aufgerufen, damit Aktionen der letzten 2s
 * vor Sleep/Restart nicht verloren gehen. Awaitable — Server soll erst danach
 * exit-en.
 */
export async function flushAllPendingSaves(): Promise<void> {
  const entries = Array.from(pendingSaves.values());
  pendingSaves.clear();
  for (const { handle } of entries) clearTimeout(handle);
  await Promise.all(
    entries.map(({ room }) =>
      saveRoomNow(room).catch(err =>
        console.warn('[QQ-persist] flush-save failed for', room.roomCode, err?.message ?? err)
      )
    )
  );
}

async function saveRoomNow(room: QQRoomState): Promise<void> {
  await ensureDir();
  const payload = { savedAt: Date.now(), room: sanitize(room) };
  const tmp = fileFor(room.roomCode) + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(payload), 'utf8');
  await fs.rename(tmp, fileFor(room.roomCode));
}

export async function deleteSavedRoom(roomCode: string): Promise<void> {
  try { await fs.unlink(fileFor(roomCode)); } catch { /* not there */ }
}

// ── Restore on startup ─────────────────────────────────────────────────────
export interface RestoredRoom { room: QQRoomState; savedAt: number; }

export async function loadAllRooms(): Promise<RestoredRoom[]> {
  await ensureDir();
  let files: string[] = [];
  try { files = await fs.readdir(PERSIST_DIR); } catch { return []; }
  const out: RestoredRoom[] = [];
  const now = Date.now();
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const p = path.join(PERSIST_DIR, f);
    try {
      const raw = await fs.readFile(p, 'utf8');
      const parsed = JSON.parse(raw) as { savedAt?: number; room?: QQRoomState };
      const savedAt = parsed.savedAt ?? 0;
      if (!parsed.room || now - savedAt > MAX_AGE_MS) {
        await fs.unlink(p).catch(() => {});
        continue;
      }
      const room = rehydrate(parsed.room);
      out.push({ room, savedAt });
    } catch (err) {
      console.warn('[QQ-persist] failed to load', f, (err as Error).message);
    }
  }
  return out;
}

// Runtime-only Felder nach dem Einlesen zuruecksetzen.
function rehydrate(room: QQRoomState): QQRoomState {
  room.timerHandle             = null;
  room._timerOnExpire          = null;
  room._hotPotatoTimerHandle   = null;
  room._hotPotatoOnExpire      = null;
  room._mapRevealTimerHandle   = null;
  // Falls die Session im Fenster zwischen Timer-Ablauf und Mod-Reveal
  // gespeichert wurde: nach Rehydrate ist der Server in einem neuen Lauf,
  // Phase wird auf PAUSED gesetzt (siehe unten). timerExpired-Flag aufs
  // sichere Default zuruecksetzen (Resume ruft qqStartTimer = setzt sowieso).
  room.timerExpired            = false;

  // Laufende Timer sind tot — in Pause einfrieren, damit Moderator bewusst
  // entscheidet. Ausnahme: bereits in PAUSED/LOBBY/GAME_OVER → belassen.
  const isLiveTimerPhase =
    room.phase === 'QUESTION_ACTIVE' ||
    room.phase === 'QUESTION_REVEAL' ||
    room.phase === 'PLACEMENT' ||
    room.phase === 'COMEBACK_CHOICE' ||
    room.phase === 'CONNECTIONS_4X4';
  if (isLiveTimerPhase && room.timerEndsAt) {
    const now = Date.now();
    const remaining = Math.max(0, room.timerEndsAt - now);
    room._timerRemainingMs = remaining;
    room.timerEndsAt = null;
    room._phaseBeforePause = room.phase;
    room.phase = 'PAUSED';
  }
  // Hot-Potato Turn-Timer entsprechend.
  if (room.hotPotatoTurnEndsAt) {
    const remaining = Math.max(0, room.hotPotatoTurnEndsAt - Date.now());
    room._hotPotatoTurnRemainingMs = remaining;
    room.hotPotatoTurnEndsAt = null;
  }
  // 2026-05-02 (Persistence-Audit P-4): Connections-4x4 hat eigenen `endsAt`
  // im Sub-Phase-State `connections.endsAt` — beim Rehydrate ablaufen lassen
  // wuerde im Frontend einen Timer ins Negative laufen lassen, ohne dass der
  // Auto-Lockout je triggert (Handle ist tot). Wir ueberfuehren ihn synchron
  // in die Pause-Logik.
  if (room.connections && room.connections.endsAt) {
    const remaining = Math.max(0, room.connections.endsAt - Date.now());
    room._connectionsRemainingMs = remaining;
    room.connections.endsAt = 0;
  }
  return room;
}
