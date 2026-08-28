// qqEinpassen — Schrift so gross, wie die Folie es zulaesst. Gemessen, nicht gestuft.
//
// 2026-08-27 (Wolf): „vlt sollte nur fragefont groesser und nur automatisch so
// viel wie aktuelle seite zulaesst also dynamisch? geht das, weil auch im
// sprachwechsel kann das wieder anders aussehen, deswegen waere eine dynamische
// regelung das beste?"
//
// Ja, und sein Grund ist der entscheidende. Bis heute liefen hier feste
// Stufen nach ZEICHENZAHL (`qFontSize`, `qRevealFontSize` in
// CozyQuizQuestionView). Eine Zeichenzahl ist aber nur ein Stellvertreter fuer
// die wahre Groesse: „Fantasy & Science-Fiction" ist 25 Zeichen und bricht um,
// „Halbwissen Gold Wert" ist 20 und bricht nicht. Und beim Sprachwechsel wird
// aus 21 Zeichen deutsch schnell 14 englisch. Eine Stufe kann also immer nur
// fuer eine Sprache und eine Buchstabenmischung richtig sein.
//
// ── Was gemessen wird ──────────────────────────────────────────────────────
// Nicht die Schrift, sondern der PLATZ. Zwei Grenzen, und die zweite ist die,
// an der die bisherigen Werkzeuge vorbeigemessen haben:
//
//   1. Der Fluss-Container hat `overflow: hidden` und eine begrenzte Hoehe.
//      `scrollHeight > clientHeight` heisst: da wird etwas abgeschnitten.
//      Das ist Wolfs erstes Bild (Gewinnerkarte unten abgeschnitten).
//
//   2. Die Team-Leiste ist `position: absolute; bottom: 16`
//      (CozyQuizQuestionView.tsx:3923). Absolut Positioniertes zaehlt fuer den
//      Fluss NICHT mit. Der Optionsblock kann also bis 908 px laufen, ohne
//      dass irgendetwas „ueberlaeuft" - und liegt trotzdem unter der Leiste.
//      Das ist Wolfs zweites Bild. Deshalb wird zusaetzlich gegen die
//      Oberkante gemessen, die als Sperre angemeldet ist.
//
// ── Wie eingepasst wird ────────────────────────────────────────────────────
// Ueber EINEN Faktor `--qq-fit`, mit dem die beteiligten Schriftgrade
// multipliziert werden. Ein Faktor statt zwei, damit das Groessenverhaeltnis
// zwischen Frage und Antworten erhalten bleibt - das ist eine bewusste
// Entscheidung der Uebergabe 2a („entscheidend sind die Antworten, nicht die
// Frage"), und die soll ein Einpassen nicht heimlich umdrehen.
//
// Gesucht wird der groesste Faktor, der noch passt, per Intervallhalbierung.
// Sechs Schritte reichen: das Intervall [0.5, 1] ist danach auf 0,8 Prozent
// eingeengt, und ein Prozent Schriftgroesse sieht niemand.
//
// ⚠️ `useLayoutEffect`, nicht `useEffect`. Sonst malt der Browser einmal die
// zu grosse Fassung, und auf einem Beamer ist genau dieses eine Bild das,
// was auffaellt.
//
// ⚠️ Schriften laden spaeter. Solange die Bricolage noch nicht da ist, misst
// man die Ersatzschrift, und deren Breiten sind andere. Deshalb ein zweiter
// Durchgang, sobald `document.fonts.ready` haelt.
import { useLayoutEffect, useRef } from 'react';

/** Kleinster erlaubter Faktor. Darunter wird es auf 8 m Entfernung unleserlich,
 *  und dann ist nicht die Schrift das Problem, sondern der Text. */
const MIN = 0.5;
/** Sechs Halbierungen von [0.5, 1] => Restunsicherheit 0,8 Prozent. */
const SCHRITTE = 6;
/** Ein Pixel Toleranz gegen Rundung bei gebrochenen Zoomfaktoren. */
const TOLERANZ = 1;
/**
 * Luft nach unten, in Buehnen-Pixeln.
 *
 * „Passt gerade so" ist nicht dasselbe wie „sitzt richtig". 2026-08-27
 * gemessen: mit Optionen von 21 Zeichen stand die Gewinnerkarte 37 px ueber der
 * Kante - technisch im Bild, auf einem Beamer mit Ueberscan trotzdem
 * angeschnitten. Ein Projektor zeigt je nach Geraet die aeussersten Prozent
 * nicht, und niemand kalibriert das in einer Bar.
 *
 * 24 px sind rund 2,4 Prozent der Buehnenhoehe und decken den ueblichen
 * Ueberscan ab, ohne dass man die Verkleinerung bemerkt.
 */
const LUFT = 24;

/** Elemente, die als Sperre gelten sollen, tragen dieses Attribut. Sie sind
 *  absolut positioniert und tauchen in `scrollHeight` deshalb nicht auf. */
export const SPERRE_ATTR = 'data-qq-sperre';

/**
 * Passt den Inhalt von `ref` in den verfuegbaren Platz ein, indem `--qq-fit`
 * auf dem Element gesetzt wird.
 *
 * @param ref      der Fluss-Container (begrenzte Hoehe, `overflow: hidden`)
 * @param kennung  aendert sich, wenn sich der Inhalt aendert (Frage-ID, Sprache,
 *                 Aufloesungsschritt ...). Loest eine neue Messung aus.
 * @param aktiv    aus => `--qq-fit` wird entfernt, alles bleibt wie zuvor.
 */
export function useEinpassen(
  ref: React.RefObject<HTMLElement | null>,
  kennung: string,
  aktiv = true,
): void {
  // Der zuletzt gesetzte Faktor. Er ueberlebt bewusst den Effekt-Neulauf, denn
  // er ist die Decke der Ratsche weiter unten.
  const letzter = useRef(1);
  /** Welche Frage der Faktor gehoert. Wechselt sie, faengt alles wieder bei 1 an. */
  const letzteFrage = useRef('');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!aktiv) { el.style.removeProperty('--qq-fit'); letzter.current = 1; return; }

    // ── Die Ratsche faengt bei jeder neuen Frage wieder bei 1 an ──────────
    // `kennung` enthaelt Frage-ID, Sprache, Aufloesungsschritt und mehr - sie
    // wechselt also mehrmals INNERHALB einer Frage. Zurueckgesetzt wird nur am
    // ersten Feld, der Frage selbst. Sonst waere die Ratsche wirkungslos: sie
    // wuerde bei jedem Kaskadenschritt die Decke wieder auf 1 heben.
    const frage = kennung.split('|')[0];
    if (frage !== letzteFrage.current) {
      letzteFrage.current = frage;
      letzter.current = 1;
    }

    let abgebrochen = false;

    /** Passt der Inhalt bei diesem Faktor? Liest beide Grenzen. */
    const passt = (f: number): boolean => {
      el.style.setProperty('--qq-fit', String(f));
      // ⚠️ Die Unterkante wird ueber `offsetTop + offsetHeight` bestimmt, nicht
      // ueber `getBoundingClientRect`. Der Unterschied ist die Auftrittsbewegung:
      // `revealWinnerIn` startet mit `translateY(30px)` (qqShared.ts:1040), und
      // ein Rechteck misst diese Verschiebung mit. Waehrend der Animation waere
      // die Karte also 30 px zu tief - der Einpasser wuerde verkleinern, und weil
      // eine Transform keine Groessenaenderung ist, meldet sich danach kein
      // Beobachter mehr. Er bliebe auf dem falschen Wert stehen.
      // Offsets kennen keine Transforms, sie messen die Lage im Layout.
      //
      // Das Lesen dieser Werte erzwingt den Umbruch. Genau das ist hier
      // gewollt - ohne den Zwang misst man den Stand von vor dem Setzen.
      const eigen = el.getBoundingClientRect();
      const bezug = el.offsetTop;
      let tiefsteOffset = 0;
      for (const kind of Array.from(el.children)) {
        const st = window.getComputedStyle(kind);
        if (st.position === 'absolute' || st.position === 'fixed' || st.display === 'none') continue;
        const k = kind as HTMLElement;
        if (k.offsetHeight <= 1) continue;
        const unten = k.offsetTop + k.offsetHeight;
        if (unten > tiefsteOffset) tiefsteOffset = unten;
      }
      // Erste Grenze: laeuft der Inhalt aus dem Container?
      //
      // ⚠️ Hier stand bis zum 2026-08-28 `el.scrollHeight > el.clientHeight`,
      // und genau das war Wolfs „aendert die groesse". Gemessen an der
      // MUCHO-Aufloesung: die Gewinnerkarte montiert bei +3,44 s, und im
      // SELBEN Bild meldet der Container 17 px Ueberlauf - obwohl kein
      // Element hoeher wird und sich kein Abstand aendert. Der Grund ist
      // dieselbe Auftrittsbewegung wie oben: `scrollHeight` rechnet
      // verschobene Kaesten mit. Der Einpasser hat also eine ANIMATION fuer
      // einen Ueberlauf gehalten und dafuer 14 bis 20 Prozent Schriftgroesse
      // bezahlt - die Frage fiel von 72 auf 60 px, mitten im Lesen.
      //
      // Deshalb dieselbe Rechnung wie fuer die Sperre unten: die Lage im
      // Layout, nicht die auf dem Schirm.
      //
      // ⚠️ Weiter KEIN LUFT-Abzug. Der Container ist `flex: 1` und wird von
      // seinem Inhalt exakt ausgefuellt, „genau voll" ist also der Normalfall
      // und nicht der Grenzfall. Ein Abzug von 24 px waere nie erfuellbar, und
      // alles fiele auf den Mindestfaktor (2026-08-27 genau so gemessen:
      // fit 0.5 auf jeder Probe, auch auf den kurzen).
      // Luft gibt es an der Sperre weiter unten, dort ist sie definiert.
      if (tiefsteOffset - bezug > el.clientHeight + TOLERANZ) return false;
      // Zweite Grenze: absolut positionierte Sperren (Team-Leiste). Sie liegen
      // ausserhalb des Flusses, also muss ihre Oberkante von Hand geprueft
      // werden.
      const buehne = el.closest('[data-qq-buehne]') ?? el.ownerDocument.body;
      const sperren = buehne.querySelectorAll(`[${SPERRE_ATTR}]`);
      if (!sperren.length) return true;
      // Zurueck in Bildschirmkoordinaten: die Offsets der Kinder haengen am
      // selben offsetParent wie der Container, also ist die Differenz gueltig.
      const tiefste = eigen.top + (tiefsteOffset - bezug) * (eigen.height / (el.offsetHeight || 1));
      for (const s of Array.from(sperren)) {
        const sr = (s as HTMLElement).getBoundingClientRect();
        if (sr.height < 1) continue;
        // Nur Sperren, die UNTER dem Inhalt liegen, sind eine Grenze.
        if (sr.top < eigen.top) continue;
        if (tiefste > sr.top - LUFT + TOLERANZ) return false;
      }
      return true;
    };

    const einpassen = () => {
      if (abgebrochen || !ref.current) return;
      // ── Ratsche: innerhalb EINER Frage nur noch kleiner ─────────────────
      // 2026-08-28, nach dem Umbau auf ein Band fuer beide Phasen. Uebrig
      // blieb ein kleines Auf und Ab: bei der Aufloesung 105 -> 99 px, und
      // eine Sekunde spaeter wieder zurueck auf 105, weil die Kopfzeile
      // verschwindet und Platz frei wird. Sechs Prozent sind wenig, aber
      // Schrift, die unter dem Blick wieder WAECHST, ist das schlechteste
      // Ergebnis von allen - der Saal liest zu diesem Zeitpunkt schon.
      //
      // Kleiner werden bleibt erlaubt, sonst schneidet die Folie ab; das war
      // der Fehler, gegen den der Einpasser gebaut wurde. Groesser werden
      // bringt nichts, was den Sprung wert waere.
      //
      // ⚠️ Ein erster Anlauf am selben Tag ist gescheitert: damals hielt der
      // Einpasser noch die Auftrittsbewegung fuer einen Ueberlauf, ein kurzer
      // Fehlalarm beim Aufbau fror die Frage dauerhaft klein ein (105 -> 94).
      // Seit dieser Fehler behoben ist, misst die Ratsche nur noch echte
      // Ueberlaeufe.
      const decke = letzter.current;
      if (passt(decke)) { return; }                    // passt ohnehin, nichts tun
      let unten = MIN, oben = decke, bester = MIN;
      for (let i = 0; i < SCHRITTE; i++) {
        const mitte = (unten + oben) / 2;
        if (passt(mitte)) { bester = mitte; unten = mitte; } else { oben = mitte; }
      }
      // Nur setzen, wenn es sich wirklich lohnt. Ein Unterschied von unter
      // einem Prozent ist unsichtbar und wuerde nur Arbeit machen.
      if (Math.abs(bester - letzter.current) > 0.005) {
        el.style.setProperty('--qq-fit', String(bester));
        letzter.current = bester;
      } else {
        el.style.setProperty('--qq-fit', String(letzter.current));
      }
    };

    einpassen();

    // Zweiter Durchgang, sobald die echten Schriften da sind. Ohne das misst
    // der erste Lauf die Ersatzschrift.
    const schriften = (el.ownerDocument as Document & { fonts?: FontFaceSet }).fonts;
    schriften?.ready?.then(() => { if (!abgebrochen) einpassen(); });

    // ── Warum der INHALT beobachtet wird und nicht der Container ────────────
    // Der erste Entwurf hing an einer handgepflegten `kennung` (Frage-ID,
    // Sprache, Aufloesungsschritt ...). Das ist aus zwei Gruenden zu wenig:
    //
    //   1. Die Liste ist nie vollstaendig. Jedes kuenftige Feld, das den
    //      Platzbedarf aendert, muesste jemand dort nachtragen - und wenn er
    //      es vergisst, faellt nichts auf, ausser auf dem Beamer.
    //   2. Der Container selbst ist `flex: 1` in einer festen 1760x990-Buehne.
    //      Seine EIGENE Groesse aendert sich also nie, egal wie lang der Text
    //      wird. Ein ResizeObserver auf ihm sieht schlicht nichts.
    //      (2026-08-27 genau so gemessen: das Pruefwerkzeug tauschte die
    //      Optionstexte, der Block wuchs von 280 auf 756 px - und `--qq-fit`
    //      blieb 1.)
    //
    // Beobachtet werden deshalb die KINDER: wenn eines von ihnen hoeher wird,
    // muss neu eingepasst werden. Dazu ein MutationObserver, damit auch
    // ausgetauschte Kinder wieder unter Beobachtung kommen.
    // ⚠️ ZUSAMMENFASSEN, nicht bei jeder Meldung messen. Der MutationObserver
    // laeuft mit `subtree` und `characterData`, und waehrend der MUCHO-Kaskade
    // fliegen im selben Block Dutzende Marken ein. Jede einzelne wuerde sonst
    // sechs erzwungene Umbrueche ausloesen. Ein Durchgang je Bild reicht: mehr
    // sieht ein Beamer ohnehin nicht.
    let amMessen = false;
    let angemeldet = 0;
    const neuMessen = () => {
      // Die eigene Verkleinerung aendert die Kindhoehen und wuerde den
      // Beobachter sonst gleich wieder ausloesen.
      if (abgebrochen || amMessen || angemeldet) return;
      angemeldet = requestAnimationFrame(() => {
        angemeldet = 0;
        if (abgebrochen) return;
        amMessen = true;
        einpassen();
        requestAnimationFrame(() => { amMessen = false; });
      });
    };

    const groesse = new ResizeObserver(neuMessen);
    const anmelden = () => {
      groesse.disconnect();
      groesse.observe(el);
      for (const kind of Array.from(el.children)) groesse.observe(kind);
    };
    anmelden();

    const struktur = new MutationObserver(() => { anmelden(); neuMessen(); });
    struktur.observe(el, { childList: true, subtree: true, characterData: true });

    return () => {
      abgebrochen = true;
      if (angemeldet) cancelAnimationFrame(angemeldet);
      groesse.disconnect();
      struktur.disconnect();
    };
  }, [ref, kennung, aktiv]);
}

/**
 * Hilfsfunktion fuer die Schriftgrade: multipliziert einen beliebigen
 * CSS-Groessenausdruck mit dem Einpass-Faktor.
 *
 * `mitFit('clamp(26px, 4.4cqw, 72px)')`
 *   => `calc(clamp(26px, 4.4cqw, 72px) * var(--qq-fit, 1))`
 *
 * Der Vorgabewert 1 ist wichtig: ueberall dort, wo `useEinpassen` nicht
 * laeuft (Handy, Vorschau-Seiten, Testharnische), bleibt der Grad exakt der
 * bisherige.
 */
export function mitFit(groesse: string): string {
  return `calc(${groesse} * var(--qq-fit, 1))`;
}
