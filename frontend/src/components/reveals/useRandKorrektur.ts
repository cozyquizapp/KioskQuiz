import { useLayoutEffect } from 'react';

/**
 * Kacheln, die aus dem Bild laufen, zurueckholen — gemessen, nicht geschaetzt.
 *
 * 2026-08-29, Wolf am Kontaktbogen: auf einem Bild der Schwarmintelligenz stand
 * eine Team-Kachel halb ausserhalb. Reproduziert mit
 * `scripts/zahlenstrahl-probe.mjs`: sieben Tipps nah am Ziel, drei weit
 * darueber, und die aeusserste Kachel steht bei 1368..1773 auf einer Buehne,
 * die 1760 breit ist.
 *
 * Der Grund liegt in beiden Zahlenstrahlen gleich: `spread()` klemmt die MITTE
 * der Kachel auf 94 bzw. 95 Prozent. Wie breit die Kachel darunter ist, weiss
 * die Rechnung nicht - und sie ist breit, weil Teamname, Zahl und Abweichung
 * darin stehen. 94 Prozent von 1760 sind 1654; eine 405 Pixel breite Kachel
 * ragt von dort aus hinaus, egal wie sorgfaeltig in Prozent geklemmt wurde.
 *
 * Deshalb wird hier nicht gerechnet, sondern gemessen: nach dem Layout die
 * echten Kanten lesen und nur die Kacheln zurueckschieben, die wirklich
 * anstossen. Alle anderen bleiben, wo die Choreographie sie haben will.
 *
 * ⚠️ Verschoben wird ueber `margin-left`, NICHT ueber `transform`. Beide
 * Ansichten legen auf die Kacheln eine Einblend-Animation mit
 * `animation-fill-mode: both`, deren Keyframes `transform` setzen - ein
 * inline gesetztes `transform` waere danach dauerhaft ueberschrieben. (Das
 * betrifft auch das dort gesetzte `translateX(-50%)`, siehe Notiz in
 * CrowdEstimateReveal.)
 *
 * Aufruf: im Container, der die Kacheln haelt. Jede Kachel traegt
 * `data-qq-rand-kachel`. `schluessel` stoesst die Messung neu an, wenn sich
 * die Platzierung aendert.
 */
export function useRandKorrektur(
  ref: React.RefObject<HTMLElement | null>,
  schluessel: unknown,
  luft = 6,
): void {
  useLayoutEffect(() => {
    const wurzel = ref.current;
    if (!wurzel) return;
    let handle = 0;

    const messen = () => {
      const alle = [...wurzel.querySelectorAll<HTMLElement>('[data-qq-rand-kachel]')];
      if (!alle.length) return;
      // Erst zuruecksetzen, sonst misst der zweite Lauf die Korrektur des
      // ersten mit und die Kachel wandert bei jedem Takt weiter.
      for (const k of alle) k.style.marginLeft = '';
      const grenze = wurzel.getBoundingClientRect();

      // ⚠️ Immer die GANZE Bahn schieben, nie eine einzelne Kachel.
      // Der erste Anlauf hat jede Kachel fuer sich zurueckgeholt - und damit
      // den Ueberlauf gegen eine Ueberlappung getauscht: die aeusserste Kachel
      // landete auf ihrer Nachbarin. Die Abstaende in einer Bahn sind das
      // Ergebnis von `spread()`, und die dort einprogrammierten Ruecksichten
      // (Sieger sitzt auf seiner echten Position, Mindestabstand zum Nachbarn)
      // duerfen hier nicht wieder aufgemacht werden. Verschoben wird deshalb
      // nur die Bahn als Ganzes, und zwar um genau so viel, wie noetig ist.
      const bahnen = new Map<string, HTMLElement[]>();
      for (const k of alle) {
        const b = k.dataset.qqRandKachel || 'alle';
        (bahnen.get(b) ?? bahnen.set(b, []).get(b)!).push(k);
      }
      for (const bahn of bahnen.values()) {
        let schub = 0;
        for (const k of bahn) {
          const r = k.getBoundingClientRect();
          schub = Math.min(schub, (grenze.right - luft) - r.right);   // rechts raus -> negativ
          schub = Math.max(schub, (grenze.left + luft) - r.left);     // links raus  -> positiv
        }
        if (Math.abs(schub) < 1) continue;
        for (const k of bahn) k.style.marginLeft = `${Math.round(schub)}px`;
      }
    };

    // Zwei Takte spaeter messen: die Kacheln tragen Web-Fonts und eine
    // Einblendung, und direkt nach dem Layout steht die Breite noch nicht fest.
    handle = requestAnimationFrame(() => { handle = requestAnimationFrame(messen); });

    const beobachter = new ResizeObserver(messen);
    beobachter.observe(wurzel);
    for (const k of wurzel.querySelectorAll<HTMLElement>('[data-qq-rand-kachel]')) beobachter.observe(k);
    const schriftFertig = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
    schriftFertig?.then(messen).catch(() => { /* egal */ });

    return () => { cancelAnimationFrame(handle); beobachter.disconnect(); };
  }, [ref, schluessel, luft]);
}
