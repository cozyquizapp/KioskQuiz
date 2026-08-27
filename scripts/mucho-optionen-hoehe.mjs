/* mucho-optionen-hoehe — ab welcher Textlaenge bricht eine Option um?
 *
 * 2026-08-27, Wolf zu zwei Bildern: „immernoch der bug unten" (Aufloesung, die
 * Gewinnerkarte ist abgeschnitten) und „hier auch, das war das font groesser
 * problem" (Antwort-Zustand, die untere Optionsreihe laeuft in die Team-Leiste).
 *
 * ── Warum das eine Sache ist und nicht zwei ────────────────────────────────
 * Beide Bilder haben Optionen, die auf ZWEI Zeilen laufen: „Fantasy &
 * Science-Fiction", „Romance / Liebesroman", „Polynesisch ("tatau")". Eine
 * zweite Zeile in beiden Reihen macht den Optionsblock rund eine Zeilenhoehe
 * hoeher, und was oben waechst, drueckt unten hinaus - einmal in die
 * Team-Leiste, einmal ueber die Buehnenkante.
 *
 * ⚠️ Mein erstes Werkzeug (`gewinnerkarte-unterkante.mjs`) hat das nicht
 * gefunden, weil es die FRAGE variiert hat. Wolfs Bild vom 27.8. hat eine
 * kurze Frage. Die Variable, die ich nie angefasst habe, war die
 * Optionslaenge - und genau die traegt seit dem 2026-08-22 keinen
 * Laengen-Deckel mehr:
 *
 *     QQBeamerPage.tsx:4583   fontSize: 'clamp(26px, 4.4cqw, 72px)'
 *
 * Vorher war der Deckel 44. Die Aenderung war Absicht („entscheidend sind die
 * Antworten, nicht die Frage"), also wird sie hier NICHT zurueckgedreht. Was
 * fehlt, ist eine Stufe fuer die langen - dieselbe Bauart wie `qRevealFontSize`
 * bei der Frage.
 *
 * Dieses Werkzeug liefert die Zahl, an der die Stufe haengen muss: die
 * Zeichenzahl, ab der eine Option umbricht. Geraten waere sie ungefaehr 15,
 * gemessen ist sie es genau - und die Spaltenbreite haengt an `cqw`, also am
 * Seitenverhaeltnis der Buehne, nicht an einer runden Zahl.
 *
 * NUTZUNG:  node scripts/mucho-optionen-hoehe.mjs
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

/** Wolfs eigene Optionen aus den beiden Bildern, dazu eine Leiter darum herum.
 *  Die vier Texte einer Zeile werden ALLE gesetzt - eine einzelne lange Option
 *  in einer Reihe macht die ganze Reihe hoch, das ist der Fall am Abend. */
const PROBEN = [
  ['Gold', 'Silber', 'Bronze', 'Eisen'],
  ['Krimi & Thriller', 'Fantasy', 'Romance', 'Historie'],
  ['Polynesisch ("tatau")', 'Italienisch ("tato")', 'Englisch ("tatter")', 'Japanisch ("tatō")'],
  ['Krimi & Thriller', 'Fantasy & Science-Fiction', 'Romance / Liebesroman', 'Historischer Roman'],
  ['Der Zauberberg von Thomas Mann', 'Die Blechtrommel von Guenter Grass',
   'Der Steppenwolf von Hermann Hesse', 'Die Verwandlung von Franz Kafka'],
];

/** Setzt die vier Optionstexte und misst, was daraus wird.
 *  Der Optionsblock traegt seit 2026-08-27 `data-qq-mucho-optionen`, damit er
 *  nicht ueber „das groesste Kaestchen" geraten werden muss. */
const messen = (texte) => {
  const buehne = document.querySelector('[data-qq-buehne]');
  if (!buehne) return { fehler: 'keine Buehne' };
  const block = buehne.querySelector('[data-qq-mucho-optionen]');
  if (!block) return { fehler: 'kein Optionsblock' };

  // Die Textfelder der Optionen: direkte Kinder je Karte, erkennbar an der
  // Schriftgroesse, die aus der clamp kommt. Robuster: das laengste Textfeld
  // je Karte.
  const karten = [...block.children];
  const felder = karten.map(k => {
    let best = null;
    for (const el of k.querySelectorAll('div')) {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs > 20 && el.children.length === 0 && (best == null || fs > best.fs)) best = { el, fs };
    }
    return best?.el ?? null;
  });
  if (texte) felder.forEach((el, i) => { if (el && texte[i]) el.textContent = texte[i]; });

  const br = buehne.getBoundingClientRect();
  const s = br.width / buehne.offsetWidth || 1;
  const bb = block.getBoundingClientRect();

  // Zeilen je Option: Hoehe des Textfelds geteilt durch eine Zeilenhoehe.
  const zeilen = felder.map(el => {
    if (!el) return 0;
    const cs = getComputedStyle(el);
    const eine = parseFloat(cs.fontSize) * parseFloat(cs.lineHeight || '1.1') || parseFloat(cs.fontSize) * 1.1;
    return Math.round(el.getBoundingClientRect().height / eine);
  });
  const grad = felder[0] ? Math.round(parseFloat(getComputedStyle(felder[0]).fontSize)) : null;
  // Der Einpass-Faktor sitzt auf dem Fluss-Container. 1 heisst: es passte
  // ohnehin, es wurde nichts verkleinert.
  const fluss = buehne.querySelector('[data-qq-frage]')?.closest('[style*="overflow"]');
  const fit = fluss ? (getComputedStyle(fluss).getPropertyValue('--qq-fit').trim() || '1') : '?';
  const frageEl = buehne.querySelector('[data-qq-frage]');
  const frageGrad = frageEl ? Math.round(parseFloat(getComputedStyle(frageEl).fontSize)) : null;

  // Die Gewinnerkarte, falls die Aufloesung schon so weit ist. Sie traegt als
  // einzige die Bewegung `revealWinnerIn` - ueber ihren Text waere sie nicht zu
  // finden, der wechselt je Team.
  let karte = null;
  for (const el of buehne.querySelectorAll('*')) {
    if (getComputedStyle(el).animationName.includes('revealWinnerIn')) { karte = el; break; }
  }
  const kr = karte ? karte.getBoundingClientRect() : null;

  return {
    grad, fit, frageGrad,
    zeilen,
    blockHoehe: Math.round(bb.height / s),
    blockUnten: Math.round((bb.bottom - br.top) / s),
    buehneHoehe: Math.round(br.height / s),
    reserve: Math.round((br.bottom - bb.bottom) / s),
    karteUnten: kr ? Math.round((kr.bottom - br.top) / s) : null,
    karteReserve: kr ? Math.round((br.bottom - kr.bottom) / s) : null,
  };
};

const b = await buehneStarten({
  bots: 8, frisch: true, takt: () => {},
  kategorie: 'MUCHO', entwurf: 'qq-vol-1',
});
const h = b.helfer ?? b;
const seite = h.seite ? h.seite() : b.seite;
fs.mkdirSync('.shots', { recursive: true });

async function durchgang(station, titel) {
  await b.zurStation(station);
  await sleep(2600);
  console.log(`\n══ ${titel} ════════════════════════════════════════`);
  const grund = await seite.evaluate(messen, null);
  if (grund.fehler) { console.log('  ' + grund.fehler); return; }
  console.log(`  Buehne ${grund.buehneHoehe} px hoch, Optionsschrift ${grund.grad} px.\n`);
  for (const p of PROBEN) {
    const laengste = Math.max(...p.map(t => t.length));
    const m = await seite.evaluate(messen, p);
    await sleep(200);
    // ⚠️ Frueher stand hier zusaetzlich eine Ueberlappungspruefung gegen
    // `nextElementSibling`. Die war falsch: in der Aufloesung ist der naechste
    // Bruder nicht die Gewinnerkarte, sondern eine Auflage mit `inset: 0`, und
    // die faengt oben an. Das Werkzeug meldete deshalb Ueberlappung, wo keine
    // war. Fuer die Gewinnerkarte ist `gewinnerkarte-unterkante.mjs` zustaendig.
    // Wenn es eine Gewinnerkarte gibt, ist SIE die Unterkante, nicht der Block.
    const unterste = m.karteReserve != null ? m.karteReserve : m.reserve;
    const marke = unterste < 0 ? '✗' : unterste < 40 ? '⚠' : '✓';
    console.log(`  ${marke} laengste ${String(laengste).padStart(2)} Z.  ` +
      `fit ${String(m.fit).slice(0, 5).padEnd(5)}  Opt ${String(m.grad).padStart(2)}px  Frage ${String(m.frageGrad).padStart(3)}px  ` +
      `Block ${String(m.blockHoehe).padStart(3)}  unten ${String(m.blockUnten).padStart(4)}/${m.buehneHoehe}  ` +
      (m.karteReserve != null
        ? `Gewinnerkarte unten ${String(m.karteUnten).padStart(4)}  Reserve ${String(m.karteReserve).padStart(4)}`
        : `Reserve ${String(m.reserve).padStart(4)}`));
    await seite.screenshot({ path: `.shots/mucho-opt-${station}-${laengste}.png` });
  }
}

await durchgang('frage', 'Antwort-Zustand (Wolfs zweites Bild)');
await durchgang('aufloesungUnten', 'Aufloesung mit Gewinnerkarte (erstes Bild)');

console.log('\n  Die Umbruchgrenze ist die Zeichenzahl, ab der „Zeilen" von 1 auf 2 springt.');
await b.schliessen?.();
