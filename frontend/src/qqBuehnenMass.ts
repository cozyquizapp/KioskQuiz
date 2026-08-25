/**
 * qqBuehnenMass — wie gross ist die Buehne wirklich?
 *
 * 2026-08-25 (Wolf: „was ist mit dem grid passiert?", Screenshot mit einem
 * Brett, das links und unten aus dem Bild lief).
 *
 * Der Fund: der Beamer rendert in einen FESTEN Entwurfs-Rahmen von 1760x990
 * und skaliert den per `transform: scale(...)` auf das Fenster. Wer innerhalb
 * dieses Rahmens mit `window.innerHeight` rechnet, misst das FENSTER und nicht
 * die Buehne. Auf einem Fenster, das hoeher ist als 990, kommt dabei eine
 * Zahl heraus, die groesser ist als der Rahmen, und der Inhalt laeuft an drei
 * Kanten heraus. Bei exakt 1760x990 faellt es nicht auf, deshalb war es im
 * Harness unsichtbar und auf jedem echten Beamer da.
 *
 * Zwei Stellen rechneten so: das Brett in der Setz-Phase und das Brett auf der
 * Endfolie. Beide fragen jetzt hier.
 *
 * Regel fuer alles, was INNERHALB der Buehne liegt: nie `window.inner*`,
 * immer `qqBuehnenMass()`.
 */

/**
 * Der Entwurfs-Rahmen. Muss exakt 16:9 bleiben, sonst entsteht auf einem
 * 16:9-Beamer ein Letterbox-Rand. Kleiner = alles wirkt groesser.
 * 2026-07-04 (Wolf „alles zu klein fuer Beamer/TV"): 1920x1080 -> 1760x990.
 */
export const QQ_BUEHNE_BREITE = 1760;
export const QQ_BUEHNE_HOEHE = 990;

/** Laeuft der Beamer in der skalierten Buehne? `?stage=off` schaltet sie ab. */
export function qqBuehneAn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const url = new URLSearchParams(window.location.search);
    const v = url.get('stage');
    if (v === '1' || v === 'on' || v === 'true') return true;
    if (v === '0' || v === 'off' || v === 'false') return false;
    // Persistente Escape-Luke: qq_useStage='0' → aus. Sonst Default AN.
    if (localStorage.getItem('qq_useStage') === '0') return false;
    return true;
  } catch {
    return true;
  }
}

/**
 * Der Kasten, in dem der Inhalt Platz hat. Mit Buehne ist das der feste
 * Entwurfs-Rahmen, ohne Buehne das Fenster.
 */
export function qqBuehnenMass(): { breite: number; hoehe: number } {
  if (typeof window === 'undefined') return { breite: QQ_BUEHNE_BREITE, hoehe: QQ_BUEHNE_HOEHE };
  if (qqBuehneAn()) return { breite: QQ_BUEHNE_BREITE, hoehe: QQ_BUEHNE_HOEHE };
  return { breite: window.innerWidth, hoehe: window.innerHeight };
}
