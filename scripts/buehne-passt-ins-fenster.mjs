/* buehne-passt-ins-fenster — steht die ganze Buehne im Bild, bei JEDER Fenstergroesse?
 *
 * 2026-08-26 (Wolf, Bild einer MUCHO-Aufloesung): unten laeuft der Kasten
 * „Fakt oder Fiktion / richtig!" ueber die Kante, „richtig!" ist halb weg.
 *
 * Zwei Werkzeuge haben vorher NICHTS gefunden (schrift-durchgang,
 * aufloesung-unterkante) - beide messen aber INNERHALB der Buehne, und beide
 * laufen bei exakt 1760x990. Auf Wolfs Bild fehlt zusaetzlich die komplette
 * Kopfzeile (keine Kategorie-Pille, kein Zaehler, die Frage klebt oben). Wenn
 * oben etwas fehlt UND unten etwas fehlt, dann laeuft nicht der Inhalt aus der
 * Buehne - dann laeuft die Buehne aus dem Fenster. Das ist eine andere Frage,
 * und keines der bisherigen Werkzeuge stellt sie.
 *
 * Warum das ueberhaupt passieren kann: der Aussenkasten der Buehne hat
 * `overflow: clip` mit `overflowClipMargin: 1000px`. Der grosse Rand ist
 * Absicht (Glows duerfen ueber die Kante bluten), er bedeutet aber auch: wenn
 * der Massstab zu gross gerechnet wird, wird NICHTS abgeschnitten - die Buehne
 * steht dann einfach ueber dem Fensterrand, oben wie unten, unsichtbar.
 *
 * Gemessen wird genau das, ohne Auge: der Bildschirmkasten von
 * `[data-qq-buehne]` (nach `scale`) gegen das sichtbare Fenster.
 *
 * NUTZUNG:  node scripts/buehne-passt-ins-fenster.mjs
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

/** Die Groessen, auf denen dieser Abend wirklich stattfindet. */
const FENSTER = [
  { w: 1760, h: 990,  wie: 'Messfenster (16:9, genau der Entwurf)' },
  { w: 1920, h: 1080, wie: 'Beamer im Vollbild (16:9)' },
  { w: 1920, h: 1009, wie: 'Beamer, Browser NICHT im Vollbild (Leisten oben)' },
  { w: 1920, h: 1200, wie: 'Laptop 16:10 im Vollbild' },
  { w: 1512, h: 862,  wie: 'MacBook, Browser nicht im Vollbild' },
  { w: 2560, h: 1080, wie: 'Ultrabreit' },
];

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();

await b.zurStation('aufloesung');
await sleep(2600);

const funde = [];

for (const f of FENSTER) {
  await seite.setViewportSize({ width: f.w, height: f.h });
  await sleep(900); // ResizeObserver + Uebergang des Massstabs

  const m = await seite.evaluate(() => {
    const el = document.querySelector('[data-qq-buehne]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return {
      oben: Math.round(r.top), unten: Math.round(r.bottom),
      links: Math.round(r.left), rechts: Math.round(r.right),
      fensterH: window.innerHeight, fensterB: window.innerWidth,
      massstab: st.transform,
      // Was steht dort, wo die Kopfzeile stehen muesste?
      scrollt: document.documentElement.scrollHeight > window.innerHeight + 2,
    };
  });
  if (!m) { console.log('  keine Buehne gefunden'); continue; }

  const raus = {
    oben: Math.max(0, -m.oben),
    unten: Math.max(0, m.unten - m.fensterH),
    links: Math.max(0, -m.links),
    rechts: Math.max(0, m.rechts - m.fensterB),
  };
  const schlimm = Math.max(raus.oben, raus.unten, raus.links, raus.rechts);
  const ok = schlimm <= 1;
  console.log(`  ${ok ? '✓' : '✗'} ${String(f.w) + 'x' + String(f.h)}  ${f.wie}`);
  console.log(`      Buehne y ${m.oben}..${m.unten} in ${m.fensterH}   x ${m.links}..${m.rechts} in ${m.fensterB}`);
  if (!ok) {
    console.log(`      raus: oben ${raus.oben}  unten ${raus.unten}  links ${raus.links}  rechts ${raus.rechts}`);
    funde.push({ ...f, raus });
  }
}

console.log('\n══ Urteil ══════════════════════════════════════════════════════');
console.log(funde.length === 0
  ? '  Die Buehne steht bei jeder gepruef ten Groesse vollstaendig im Bild.'
  : `  ${funde.length} Groesse(n) schneiden die Buehne ab: ${funde.map(f => `${f.w}x${f.h}`).join(', ')}`);

await b.schliessen?.();
process.exit(funde.length === 0 ? 0 : 1);
