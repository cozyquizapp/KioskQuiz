/**
 * Die Kachel — EINE Definition fuer alle Teamflaechen im Quiz.
 *
 * 2026-08-26 (Wolf: „koennte die kachel nicht mehr 3d effekt haben?", danach
 * „Kacheln immer mit 3D-Effekt").
 *
 * Vorgeschichte: es gab zwei. Der Turm im Finale baute seine Bausteine mit
 * einer Flaeche, die aussieht wie ein Stein - Lichtkante oben, Schattenkante
 * unten, zwei Innenlichter an den Seiten, ein kurzer harter Schlagschatten.
 * Ueberall sonst trug die Teamkachel eine andere, flachere Fassung: ein
 * schraeger Schein von oben links, ein zwei Pixel breiter weisser Rahmen, ein
 * weicher farbiger Schein darunter. Beide waren fuer sich in Ordnung, aber
 * nebeneinander sind es zwei Gegenstaende, und der Abend erzaehlt von EINEM:
 * die Kachel vom Brett wird der Baustein im Turm.
 *
 * Warum ein eigenes Modul und keine Konstante in einer der beiden Dateien: die
 * Kachel wird an rund einem Dutzend Stellen gebaut (Lobby, Brett, Fragefolie,
 * Zwischenstand, Turm, Danke). Wer sie in einer Ansicht definiert, bekommt
 * beim naechsten Mal wieder zwei.
 *
 * ── Wie die Tiefe gemacht ist ──────────────────────────────────────────────
 * Nicht durch Weichzeichnung. Auf Projektionsdistanz frisst ein weicher
 * Schatten die Kante, statt Tiefe zu erzeugen (2a-Brief, Abschnitt 11). Die
 * Tiefe kommt aus vier harten Kanten:
 *
 *   1. Ein senkrechter Verlauf ueber der Teamfarbe: hell oben, dunkel unten.
 *      Das ist die Grundannahme „Licht faellt von oben".
 *   2. Ein Ein-Pixel-Licht auf der Oberkante (inset 0 1px 0). Die Kante selbst
 *      leuchtet, wie bei einem Gegenstand mit Dicke.
 *   3. Zwei Innenlichter an den Seiten, links hell und rechts dunkel, je zwei
 *      Pixel. Das gibt der Kachel eine gedachte Lichtquelle links oben.
 *   4. Ein kurzer, harter Schlagschatten (0 3px 4px). Kurz, damit er als
 *      Auflagepunkt liest und nicht als Schweben.
 *
 * ⚠️ Nichts davon liegt auf dem gelieferten Motiv. Die Bildpunkte des Avatars
 * bleiben unberuehrt - keine CSS-Filter, kein drop-shadow, keine Deckkraft.
 * Alles hier wirkt auf die FLAECHE hinter dem Motiv. Das ist die Grenze aus
 * den Asset-Regeln, und sie ist genau deshalb hier notiert.
 */
import type { CSSProperties } from 'react';

export type KachelOptionen = {
  /** Die Teamfarbe. Traegt die Bedeutung, der Rest ist nur Licht. */
  farbe: string;
  /** Randfarbe. Meist die Teamfarbe selbst; der Verlauf macht den Unterschied. */
  rand?: string;
  /** Eckenradius. Der Turm faehrt 6 px, die Teammarke 18 Prozent. */
  radius?: number | string;
  /**
   * Randstaerke in Bildpunkten. 0 laesst den Rand weg - fuer Flaechen, die
   * dicht an dicht liegen (Brettraster), wo zwei Raender nebeneinander eine
   * doppelt so dicke Linie ergeben wuerden.
   */
  randStaerke?: number;
};

/** Die Flaeche einer Kachel: Teamfarbe plus Licht. */
export function qqKachelFlaeche({
  farbe, rand, radius = 6, randStaerke = 1,
}: KachelOptionen): CSSProperties {
  return {
    borderRadius: radius,
    border: randStaerke > 0 ? `${randStaerke}px solid ${rand ?? farbe}` : 'none',
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 18%, '
      + 'rgba(255,255,255,0) 50%, rgba(0,0,0,0.16) 78%, rgba(0,0,0,0.34) 100%), '
      + farbe,
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.38), '
      + 'inset 2px 0 0 rgba(255,255,255,0.07), '
      + 'inset -2px 0 0 rgba(0,0,0,0.18), '
      + '0 3px 4px rgba(0,0,0,0.42)',
  };
}
