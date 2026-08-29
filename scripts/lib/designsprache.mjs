/**
 * designsprache — was fuer Werte benutzt eine Buehne eigentlich?
 *
 * 2026-08-28, Wolf: „gaebe es denn ein gutes tool um das zu ueberpruefen,
 * quasi cozyquiz default + designbible mit den pages in crowdquiz abgleichen?"
 *
 * ── Warum Wortschatz und nicht Bild ───────────────────────────────────────
 * Der naheliegende Weg waere, die Folien beider Formate nebeneinanderzulegen
 * und die Unterschiede zu suchen. Das kann nicht funktionieren: CrowdQuiz IST
 * anders. Fraktionen statt Teams, Wappen statt Kacheln, Bar-Race statt Brett.
 * Ein Bild-Vergleich meldet lauter echte Unterschiede und keinen einzigen
 * Fehler.
 *
 * Verglichen wird deshalb der WORTSCHATZ: die MENGE der Werte, die eine Folie
 * benutzt. Welche Schriften, welche Textfarben, welche Flaechen, Raender,
 * Radien, Schatten. Zwei Ansichten duerfen voellig verschieden aussehen und
 * trotzdem dieselbe Sprache sprechen - so wie zwei Saetze mit denselben
 * Woertern.
 *
 * Der Trick daran: Team- und Kategoriefarben kommen in BEIDEN Formaten aus
 * derselben Palette (QQ_AVATARS, QQ_CATEGORY_*). Sie kuerzen sich also
 * gegenseitig weg und rauschen nicht. Uebrig bleibt, was CrowdQuiz benutzt
 * und CozyQuiz nirgends: genau die Reste aus der Zeit vor dem Standarddesign.
 *
 * ── Warum die Bibel abgeleitet und nicht geschrieben wird ─────────────────
 * docs/BUEHNE_2A.md ist vom 23.08. und kennt weder die Schrift-Entscheidung
 * vom 26. noch die Trennung Rahmen/Feld vom selben Tag. Eine Bibel, die von
 * Hand gepflegt wird, laeuft der Buehne hinterher und wird trotzdem geglaubt.
 * Deshalb schreibt dieses Werkzeug den CozyQuiz-Wortschatz aus der MESSUNG.
 *
 * ⚠️ Was hier NICHT hingehoert: Geometrie. Wo etwas sitzt, wie hoch es ist,
 * ob es ins Bild passt - dafuer gibt es anschnitt-suche.mjs. Hier geht es nur
 * um die Sprache.
 */

/**
 * Laeuft IM Browser. Sammelt den Wortschatz einer Folie.
 *
 * ⚠️ Alle Schwellen kommen als Argument herein. `page.evaluate` sieht keine
 * Node-Konstanten; die erste Fassung von anschnitt-suche.mjs ist daran an
 * jeder Station gestorben und hat trotzdem „alles gut" gemeldet.
 */
export const WORTSCHATZ = ({ minText, minFlaeche, wurzel = '[data-qq-buehne]', bezug = 990 }) => {
  /* `wurzel` und `bezug` sind 2026-08-29 dazugekommen, fuer das Handy.
   *
   * Die Buehne ist eine feste 1760x990-Flaeche, die als Ganzes skaliert wird -
   * deshalb rechnet alles hier unten in Buehnen-Pixel zurueck. Das Handy hat
   * keine solche Flaeche: es rendert in echten CSS-Pixeln, die Wurzel ist der
   * Seiten-Body und der Bezug ist die Fensterhoehe. Ohne beides als Argument
   * haette ein zweites Werkzeug diese Funktion kopieren muessen - und zwei
   * Kopien einer Messung laufen nach einer Sitzung auseinander. Dann misst man
   * zwei verschiedene Sprachen und glaubt, man vergleiche eine. */
  const buehne = document.querySelector(wurzel);
  if (!buehne) return { fehler: `keine Wurzel (${wurzel})` };

  const raus = (el) => {
    const t = el.tagName.toLowerCase();
    return t === 'style' || t === 'script' || t === 'svg' || t === 'path';
  };
  /** Text, der wirklich diesem Element gehoert. Die Buehne traegt ihr CSS als
   *  <style>-Kind mit sich; wer textContent nimmt, misst das Stylesheet. */
  const eigenerText = (el) => Array.from(el.childNodes)
    .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();

  /** Eine Farbe auf eine vergleichbare Form bringen. Ohne das zaehlen
   *  `rgb(243,239,231)` und `rgba(243, 239, 231, 1)` als zwei Woerter. */
  const farbe = (c) => {
    const m = String(c).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.%]+))?/);
    if (!m) return null;
    let a = m[4] === undefined ? 1 : (String(m[4]).endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    if (a < 0.04) return null;               // unsichtbar, kein Wort
    return `${Math.round(+m[1])},${Math.round(+m[2])},${Math.round(+m[3])}@${a.toFixed(2)}`;
  };

  /** Ein Schatten auf „Streuung + Farbton" eindampfen. Der rohe String
   *  enthaelt Pixelwerte, die sich mit der Skalierung aendern - der waere
   *  bei jedem Lauf ein anderes Wort. */
  const schatten = (wert) => {
    if (!wert || wert === 'none') return null;
    const px = (wert.match(/(-?\d+(?:\.\d+)?)px/g) ?? []).map(v => Math.abs(parseFloat(v)));
    const streu = px.length ? Math.max(...px) : 0;
    const f = farbe(wert);
    if (!f) return null;
    const [r, g, b] = f.split('@')[0].split(',').map(Number);
    const bunt = Math.max(r, g, b) - Math.min(r, g, b) > 60;
    const dunkel = Math.max(r, g, b) < 60;
    return `${dunkel ? 'schwarz' : bunt ? 'bunt' : 'neutral'} / Streuung ${streu < 8 ? 'klein' : streu < 20 ? 'mittel' : 'gross'}`;
  };

  const worte = {
    schrift: new Map(), textfarbe: new Map(), flaeche: new Map(),
    rand: new Map(), radius: new Map(), schatten: new Map(), grad: new Map(),
  };
  const merke = (topf, wort, beispiel) => {
    if (!wort) return;
    const bis = worte[topf].get(wort) ?? { n: 0, bsp: beispiel };
    bis.n++; if (!bis.bsp && beispiel) bis.bsp = beispiel;
    worte[topf].set(wort, bis);
  };

  const br = buehne.getBoundingClientRect();
  const s = bezug ? br.height / bezug : 1;

  for (const el of Array.from(buehne.querySelectorAll('*'))) {
    if (!(el instanceof HTMLElement) || raus(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;

    const txt = eigenerText(el);
    const kurz = txt.replace(/\s+/g, ' ').slice(0, 22);

    if (txt && r.height / s >= minText) {
      merke('schrift', cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), kurz);
      merke('textfarbe', farbe(cs.color), kurz);
      merke('schatten', schatten(cs.textShadow), kurz);
    }

    if (r.width / s >= minFlaeche && r.height / s >= minFlaeche) {
      merke('flaeche', farbe(cs.backgroundColor), kurz);
      // Verlaeufe sind ein eigenes Wort: sie tragen die Flaechensprache mit,
      // stehen aber nicht in backgroundColor.
      if (cs.backgroundImage && cs.backgroundImage.includes('gradient')) {
        merke('grad', cs.backgroundImage.replace(/\d+(\.\d+)?px/g, 'Npx').slice(0, 60), kurz);
      }
      const bw = parseFloat(cs.borderTopWidth) || 0;
      if (bw > 0 && cs.borderTopStyle !== 'none') {
        merke('rand', `${Math.round(bw)}px ${cs.borderTopStyle} ${farbe(cs.borderTopColor) ?? '?'}`, kurz);
      }
      const rad = cs.borderTopLeftRadius;
      if (rad && rad !== '0px') {
        const p = parseFloat(rad);
        merke('radius', rad.includes('%') ? `${rad} (Anteil)`
          : p >= 500 ? 'Pille/Kreis' : p >= 24 ? 'gross' : p >= 12 ? 'mittel' : 'klein', kurz);
      }
      merke('schatten', schatten(cs.boxShadow), kurz);
    }
  }

  const raus2 = {};
  for (const [topf, m] of Object.entries(worte)) {
    raus2[topf] = Array.from(m.entries()).map(([w, v]) => ({ wort: w, n: v.n, bsp: v.bsp }));
  }
  return raus2;
};

/** Die Toepfe in der Reihenfolge, in der sie im Bericht stehen. */
export const TOEPFE = [
  ['schrift',   'Schriften'],
  ['textfarbe', 'Textfarben'],
  ['flaeche',   'Flaechen'],
  ['grad',      'Verlaeufe'],
  ['rand',      'Raender'],
  ['radius',    'Ecken'],
  ['schatten',  'Schatten'],
];

/** Zwei Wortschaetze zu einem zusammenlegen (ueber Stationen hinweg). */
export function vereinen(ziel, neu) {
  for (const [topf] of TOEPFE) {
    ziel[topf] ??= new Map();
    for (const e of neu?.[topf] ?? []) {
      const bis = ziel[topf].get(e.wort) ?? { n: 0, bsp: e.bsp, wo: new Set() };
      bis.n += e.n; if (!bis.bsp) bis.bsp = e.bsp;
      ziel[topf].set(e.wort, bis);
    }
  }
  return ziel;
}
