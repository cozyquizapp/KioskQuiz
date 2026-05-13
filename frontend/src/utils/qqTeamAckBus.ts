/**
 * QQTeamAckBus — globaler Event-Bus + safeEmit-Helper fuer /team.
 *
 * 2026-05-10 (Audit P0-1): Alle Spieler-Aktionen waren bisher fire-and-forget.
 * Backend wirft WRONG_PHASE / TIMER_EXPIRED / NOT_YOUR_TURN — Frontend hat das
 * ignoriert. Spieler dachte „Submit war OK", Antwort kam aber nie an.
 *
 * Pattern: safeEmit() wrappt emit() und broadcastet ein window-CustomEvent
 * bei !ack.ok. AckErrorToast (in CozyQuizTeamOverlays.tsx) lauscht und zeigt
 * 3 Sek lang ein Toast.
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 1.4 + 2.2).
 */
import type { QQAck } from '../../../shared/quarterQuizTypes';

export type AckErrorEventDetail = { message: string };
export const ACK_ERROR_EVENT = 'qq-team-ack-error';

export function broadcastAckError(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<AckErrorEventDetail>(ACK_ERROR_EVENT, { detail: { message } }));
  }
}

const ACK_ERROR_MESSAGES_DE: Record<string, string> = {
  TIMER_EXPIRED:   '⏰ Zu spät — Phase ist gerade vorbei',
  WRONG_PHASE:     '⏰ Antwort kam nicht durch — Phase wechselt gerade',
  NOT_YOUR_TURN:   '🚫 Nicht dein Zug',
  ALREADY_ANSWERED:'✓ Antwort wurde bereits gespeichert',
  RATE_LIMITED:    '⏳ Zu schnell, kurz Pause',
  NOT_CONNECTED:   '📡 Keine Verbindung — versuch nochmal',
  TIMEOUT:         '📡 Server-Antwort dauerte zu lang',
  '*':             '❌ Aktion fehlgeschlagen',
};
const ACK_ERROR_MESSAGES_EN: Record<string, string> = {
  TIMER_EXPIRED:   '⏰ Too late — phase just ended',
  WRONG_PHASE:     '⏰ Submit missed — phase is changing',
  NOT_YOUR_TURN:   '🚫 Not your turn',
  ALREADY_ANSWERED:'✓ Already submitted',
  RATE_LIMITED:    '⏳ Slow down — short cooldown',
  NOT_CONNECTED:   '📡 No connection — try again',
  TIMEOUT:         '📡 Server took too long',
  '*':             '❌ Action failed',
};

export async function safeEmit(
  emitFn: (event: string, payload?: unknown) => Promise<QQAck>,
  event: string,
  payload: unknown,
  lang: 'de' | 'en' = 'de',
): Promise<QQAck> {
  const ack = await emitFn(event, payload);
  if (!ack.ok) {
    const map = lang === 'de' ? ACK_ERROR_MESSAGES_DE : ACK_ERROR_MESSAGES_EN;
    const code = ack.code ?? 'UNKNOWN';
    const msg = map[code] ?? map['*'] ?? ack.error ?? 'Fehler';
    broadcastAckError(msg);
  }
  return ack;
}
