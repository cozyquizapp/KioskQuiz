/**
 * Welche Fassung der Buehne laeuft gerade?
 *
 * 2026-08-25 (Wolf: „das problem besteht seit 10 pushes... wie machen wirs?").
 *
 * Das war die Frage, die sich von aussen nicht beantworten liess. Die Aenderung
 * lag auf `main`, aber ob sie auch auf dem Bildschirm ankam, konnte niemand
 * sehen. Zwischen `main` und der Leinwand liegen ein Build, ein CDN und ein
 * Service Worker, und jeder davon kann eine alte Fassung festhalten. Ohne
 * Anzeige sucht man den Fehler dann im Code, wo er nicht ist.
 *
 * Der Wert kommt aus `vite.config.ts` (`define`), also aus dem Build selbst -
 * er kann nicht aus Versehen aktueller sein als die Dateien, mit denen er
 * ausgeliefert wurde.
 */
declare const __QQ_BUILD__: { sha: string; zeit: string } | undefined;

export type QQBuild = { sha: string; zeit: string };

export const QQ_BUILD: QQBuild =
  typeof __QQ_BUILD__ !== 'undefined' && __QQ_BUILD__
    ? __QQ_BUILD__
    : { sha: 'unbekannt', zeit: '' };

/** Kurzform fuer die Anzeige: „a1b2c3d4 · 14:07". */
export function qqBuildKurz(b: QQBuild = QQ_BUILD): string {
  if (!b.zeit) return b.sha;
  const d = new Date(b.zeit);
  if (Number.isNaN(d.getTime())) return b.sha;
  const zz = (n: number) => String(n).padStart(2, '0');
  return `${b.sha} · ${zz(d.getDate())}.${zz(d.getMonth() + 1)}. ${zz(d.getHours())}:${zz(d.getMinutes())}`;
}
