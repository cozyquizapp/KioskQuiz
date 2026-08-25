/**
 * qqBrettUebergabe — die Brueckenmappe zwischen Tipp-Aufloesung und Turm-Finale.
 *
 * 2026-08-25 (Wolf: „aber das finale von grid zu turm muss smoother werden,
 * diese motion sieht noch total altmodisch aus").
 *
 * Der Befund an der Aufnahme: zwischen dem letzten Tipp-Beat und dem ersten
 * Turm-Beat lag ein harter Schnitt. Bei 0 ms stand das Brett klein links neben
 * der Tipp-Karte, bei 120 ms stand es gross in der Mitte, mit neuem Titel und
 * acht leeren Turmsockeln darunter. Derselbe Gegenstand, zwei Positionen, keine
 * Bewegung dazwischen. Das ist genau das, was ein Schnitt aus den Neunzigern
 * von einer Uebergabe unterscheidet: es gibt kein gemeinsames Element, das den
 * Blick mitnimmt, also muss das Auge die Szene neu suchen.
 *
 * Die Loesung ist eine FLIP-Uebergabe (First, Last, Invert, Play): das Turm-
 * Brett wird an seiner ENDGUELTIGEN Stelle gebaut, im ersten Bild per Transform
 * auf die Stelle zurueckgesetzt, an der das Tipp-Brett gerade noch stand, und
 * von dort in die Nullstellung gefahren. Es bewegt sich also das echte Brett,
 * kein Double, und die Position stimmt am Ende auf den Pixel.
 *
 * Warum ein Modul und kein Context: die beiden Folien stehen nie gleichzeitig im
 * Baum. Die Tipp-Folie ist ausgehaengt, bevor das Turm-Finale einhaengt - eine
 * Messung kann also nur ueber die Zeit weitergereicht werden, nicht ueber React.
 *
 * WARUM BRUCHTEILE UND KEINE PIXEL: der Beamer rechnet in einem festen Rahmen
 * von 1760x990 und skaliert ihn per Transform auf die Wand. `getBoundingClientRect`
 * liefert deshalb die Wand-Pixel, nicht die Buehnen-Pixel, und der Faktor haengt
 * am Panel (1080p 1,09 / 4K 2,18). Bruchteile des Bezugsrahmens sind gegen diese
 * Skalierung immun: die Turm-Folie multipliziert sie einfach mit ihrer eigenen
 * Layout-Breite und landet wieder in Buehnen-Pixeln.
 */

export type BrettQuelle = {
  /** Linke Kante des Zellenfeldes, als Bruchteil der Bezugsbreite. */
  x: number;
  /** Obere Kante des Zellenfeldes, als Bruchteil der Bezugshoehe. */
  y: number;
  /** Breite des Zellenfeldes, als Bruchteil der Bezugsbreite. */
  w: number;
  /** Wann gemessen wurde. Siehe `holeBrettQuelle`. */
  zeit: number;
};

let quelle: BrettQuelle | null = null;

export function merkeBrettQuelle(q: Omit<BrettQuelle, 'zeit'>): void {
  quelle = { ...q, zeit: Date.now() };
}

/**
 * Die letzte Messung, falls sie noch frisch ist.
 *
 * Das Hoechstalter ist kein Schoenheitsfehler, sondern der Sicherheitsgurt: der
 * Moderator taktet die Beats von Hand, und wenn zwischen letztem Tipp und Turm
 * eine Pause liegt, in der das Brett laengst weg ist, soll der Turm normal
 * aufgehen statt aus dem Nichts heranzufliegen. Zwoelf Sekunden sind grosszuegig
 * gemessen an einem Klick, und deutlich unter jeder echten Pause.
 */
export function holeBrettQuelle(hoechstalterMs = 12000): BrettQuelle | null {
  if (!quelle) return null;
  if (Date.now() - quelle.zeit > hoechstalterMs) return null;
  return quelle;
}

/** Nach der Uebergabe verbraucht: sie gilt genau einmal. */
export function vergissBrettQuelle(): void {
  quelle = null;
}
