/**
 * Server-Time-Sync — gleicht Client-Clock-Drift gegen die Server-Clock aus.
 *
 * Hintergrund (2026-05-19 Wolf-Bug): Beamer-Browser auf einem Beamer-PC mit
 * leicht falsch eingestellter Systemuhr zeigte Timer mit +6 Sekunden gegenüber
 * dem Moderator. Ursache: `(endsAt - Date.now()) / 1000` mit clientNow ≠
 * serverNow.
 *
 * Fix: Backend sendet `serverTime: Date.now()` in jedem QQStateUpdate. Client
 * speichert die Differenz beim Eintreffen. `getServerNow()` liefert dann die
 * korrigierte Server-Zeit als Drop-in-Ersatz für `Date.now()`.
 *
 * Wichtig: alle Timer-Berechnungen (`endsAt - now`) müssen `getServerNow()`
 * nutzen, sonst driften sie wieder gegen die Server-Clock.
 *
 * Network-Latenz (Server → Client) wird NICHT separat kompensiert — bei einem
 * LAN-Setup unter 50ms, vernachlässigbar gegenüber dem 100ms-Tick des Timers.
 * Falls relevant: in `recordServerTime` einen Half-RTT-Offset zusätzlich
 * abziehen (bisheriger Ping-Wert).
 */

let serverTimeOffset = 0;

/** Aufgerufen bei jedem state-update vom Server. Aktualisiert den Offset. */
export function recordServerTime(serverTime: number | undefined): void {
  if (typeof serverTime !== 'number' || !Number.isFinite(serverTime)) return;
  serverTimeOffset = serverTime - Date.now();
}

/** Drop-in für `Date.now()` — liefert die geschätzte Server-Clock-Zeit. */
export function getServerNow(): number {
  return Date.now() + serverTimeOffset;
}

/** Aktueller Offset in ms (für Debug-Logs). Positiv = Server-Clock voraus. */
export function getServerTimeOffset(): number {
  return serverTimeOffset;
}
