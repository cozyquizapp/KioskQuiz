/**
 * QQTeamAckBus — globaler Event-Bus fuer Server-Ack-Fehler in /team.
 *
 * 2026-05-10 (Audit P0-1): Alle Spieler-Aktionen waren bisher fire-and-forget.
 * Backend wirft WRONG_PHASE / TIMER_EXPIRED / NOT_YOUR_TURN — Frontend hat das
 * ignoriert. Spieler dachte „Submit war OK", Antwort kam aber nie an.
 *
 * Pattern: safeEmit() wrappt emit() und broadcastet ein window-CustomEvent
 * bei !ack.ok. AckErrorToast (in CozyQuizTeamOverlays.tsx) lauscht und zeigt
 * 3 Sek lang ein Toast.
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 1.4).
 */

export type AckErrorEventDetail = { message: string };
export const ACK_ERROR_EVENT = 'qq-team-ack-error';

export function broadcastAckError(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<AckErrorEventDetail>(ACK_ERROR_EVENT, { detail: { message } }));
  }
}
