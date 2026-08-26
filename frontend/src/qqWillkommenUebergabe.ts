/**
 * Die Uebergabe der Wortmarke von der Lobby auf die Willkommen-Folie.
 *
 * 2026-08-26 (Wolf: „Probier mal K2"). K2 aus der Motion-Werkstatt ist
 * B11 + B8: Grundblende mit Anker. Der Anker ist die Wortmarke - sie wird
 * nicht abgebaut und neu aufgebaut, sie waechst nur an ihren neuen Platz.
 *
 * ── Der gemessene Befund, der das ausgeloest hat ───────────────────────────
 * Aufgenommen mit `scripts/motion.mjs willkommen --film`:
 *
 *     365 ms   die alte Szene ist weg
 *    1200 ms   erstes Element der neuen Szene (`qqIntroWelcomeCard`)
 *    1600 ms   Titel beginnt, gestaffelt bis 2020
 *    2600 ms   Wolf
 *    3200 ms   Unterzeile, gestaffelt bis 3600
 *    4154 ms   Folie steht
 *
 * Dazwischen liegen 835 ms, in denen auf 2,8 m Bildbreite praktisch nichts
 * steht. Im Code war das keine Vermutung, sondern eine Zahl: der ganze
 * Willkommen-Block traegt `opacity: 0` und startet mit 1,2 s Verzug.
 *
 * ── Warum ein Modul und keine Prop ─────────────────────────────────────────
 * Lobby und Willkommen sind zwei verschiedene PHASEN. Beim Wechsel wird der
 * ganze Teilbaum ausgetauscht, es gibt keinen gemeinsamen Elternteil, durch
 * den man etwas durchreichen koennte. Dasselbe Problem, dieselbe Loesung wie
 * bei `qqBrettUebergabe.ts` (Brett faehrt in den Turm) und
 * `qqSiegerUebergabe.ts` (Kroenung faehrt auf die Danke-Folie).
 *
 * ⚠️ Das ist Absicht und keine Wiederholung: Wolf am 2026-08-26 zur Motion
 * insgesamt - „app Konsistenz von Anfang bis Ende, dass keine Motion völlig
 * aus der Reihe fällt". Die dritte Uebergabe des Abends folgt deshalb genau
 * dem Muster der ersten beiden, statt ein viertes Verfahren zu erfinden.
 *
 * Gemerkt werden BRUCHTEILE der Buehne, keine Bildpunkte: der Beamer skaliert
 * die feste 1760x990-Flaeche per Transform (1,09 auf 1080p, 2,18 auf 4K).
 * Pixelwerte waeren auf jedem zweiten Geraet falsch.
 */
export type WillkommenQuelle = {
  /** Mittelpunkt der Wortmarke, als Anteil der Buehnenbreite/-hoehe. */
  mx: number; my: number;
  /** Ihre Hoehe, als Anteil der Buehnenhoehe. Daraus kommt der Massstab. */
  hoehe: number;
  zeit: number;
};

let quelle: WillkommenQuelle | null = null;

export function merkeWillkommenQuelle(q: Omit<WillkommenQuelle, 'zeit'>): void {
  quelle = { ...q, zeit: Date.now() };
  // Sichtbar fuer die Messwerkzeuge. Sonst laesst sich von aussen nicht
  // pruefen, WAS gemerkt wurde - und genau daran haengt, ob der Flug stimmt.
  (globalThis as unknown as { __qqWillkommenQuelle?: WillkommenQuelle }).__qqWillkommenQuelle = quelle;
}

/**
 * Die gemerkte Position, wenn sie frisch genug ist.
 *
 * Das Hoechstalter ist kein Zierrat: wer die Willkommen-Folie direkt aufruft
 * (Testseite, Neuladen, Showroom), soll KEINE Uebergabe bekommen, sondern den
 * normalen Aufbau. Eine Wortmarke, die aus dem Nichts von einer alten Position
 * hereinfaehrt, waere schlechter als gar keine Bewegung.
 *
 * Zwoelf Sekunden wie bei der Sieger-Uebergabe: lang genug fuer einen
 * Phasenwechsel samt Nachladen, kurz genug, dass eine Lobby von vorhin nicht
 * mehr zaehlt.
 */
export function holeWillkommenQuelle(hoechstalterMs = 12000): WillkommenQuelle | null {
  if (!quelle) return null;
  if (Date.now() - quelle.zeit > hoechstalterMs) return null;
  return quelle;
}

/**
 * Die zwei Enden der Naht, von der App selbst gestempelt.
 *
 * ⚠️ Warum nicht von aussen abtasten: ein Werkzeug, das alle 55 ms nachsieht,
 * haengt genau in dem Moment, in dem der Wechsel passiert - der Browser ist
 * dann mit dem Austausch des Teilbaums beschaeftigt. Gemessen fehlten dadurch
 * die Bilder zwischen 376 und 1180 ms komplett, und die Luecke sah nach 979 ms
 * Leere aus, obwohl dort keine war. Wer eine Naht misst, muss sie von innen
 * stempeln.
 */
export function stempleLobbyEnde(): void {
  (globalThis as unknown as { __qqLobbyEnde?: number }).__qqLobbyEnde = Date.now();
}
export function stempleWillkommenStart(): void {
  const g = globalThis as unknown as { __qqWillkommenStart?: number; __qqLobbyEnde?: number };
  // ⚠️ Nur der ERSTE Auftritt nach dem letzten Lobby-Ende zaehlt. Die Folie
  // kann im selben Abend noch einmal sichtbar werden (der Moderator blaettert
  // in den Regeln zurueck, der Harness loest die Choreographie neu aus), und
  // dieser zweite Auftritt hat mit der Naht nichts zu tun. Ohne diese Zeile
  // hat er den Stempel ueberschrieben und die Naht als 10998 ms gemeldet.
  if (g.__qqWillkommenStart && g.__qqLobbyEnde && g.__qqWillkommenStart > g.__qqLobbyEnde) return;
  g.__qqWillkommenStart = Date.now();
}

export function vergissWillkommenQuelle(): void {
  quelle = null;
  (globalThis as unknown as { __qqWillkommenQuelle?: WillkommenQuelle | null }).__qqWillkommenQuelle = null;
}
