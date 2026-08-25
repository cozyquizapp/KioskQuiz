/* leere-messen — wo hat die Buehne im Szenenwechsel ein LEERES Bild?
 *
 * Baustein B2 aus docs/MOTION_REFERENZEN.md sagt: „nie ein leeres Bild, die
 * alte Szene geht sichtbar ab." Station 1 wurde am 2026-08-24 einzeln gemessen
 * (835 ms Leere zwischen Lobby und Willkommen). Dieses Werkzeug misst dieselbe
 * Zahl fuer JEDE Station des Abends, damit die Motion-Runde nach Groesse der
 * Luecke sortiert werden kann statt nach Bauchgefuehl.
 *
 * NUTZUNG:
 *   node scripts/leere-messen.mjs                 # alle Stationen
 *   node scripts/leere-messen.mjs frage aufloesung
 *
 * WIE GEMESSEN WIRD
 * Alle ~55 ms wird aus der laufenden Seite die „Fuelle" gelesen: wie viele
 * sichtbare Kaesten mit nennenswerter Flaeche gerade auf der Buehne stehen, und
 * wie viel Text. Beides faellt in einem leeren Bild zusammen auf fast null.
 *
 * Bewusst NICHT ueber `page.screenshot()` in einer Schleife: gemessen 570 ms je
 * Bild (siehe docs/UEBERGABE_MOTION.md, Abschnitt 3). Und bewusst nicht ueber
 * `document.getAnimations()`: dass eine Animation LAEUFT, heisst nicht, dass
 * etwas zu SEHEN ist - eine Folie, die 800 ms lang von Deckkraft 0 auf 0.02
 * kriecht, meldet dort eine laufende Animation und ist trotzdem leer.
 *
 * Die Schwelle: leer ist ein Bild, das unter 25 Prozent der Fuelle liegt, die
 * VOR und NACH dem Wechsel steht. Relativ, weil eine Fragefolie zwanzig Kaesten
 * hat und eine Siegerfolie vier - eine feste Zahl haette die Siegerfolie
 * dauerhaft als leer gemeldet.
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const TAKT = 55;
const FENSTER = 4200;   // wie lange nach dem Ausloeser gemessen wird
const SCHWELLE = 0.25;

const wunsch = process.argv.slice(2).filter(a => !a.startsWith('--'));

const buehne = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const seite = buehne.helfer.seite();
const alle = Object.keys(buehne.stationen);
const liste = wunsch.length ? wunsch.filter(n => alle.includes(n)) : alle;

/** Fuelle der Buehne: sichtbare Kaesten mit Flaeche, und Textmenge. */
const messen = () => seite.evaluate(() => {
  let kaesten = 0;
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none') continue;
    if (Number(st.opacity) < 0.12) continue;
    kaesten++;
  }
  return { kaesten, text: document.body.innerText.replace(/\s+/g, '').length };
});

const zeilen = [];
for (const name of liste) {
  const st = buehne.stationen[name];
  try {
    await buehne.aufbauen(st.aufbau);
    if (st.vor) { await st.vor(buehne.helfer); await sleep(st.vorRuhe ?? 1200); }
    await sleep(500);
    const vorher = await messen();

    // Ab hier laeuft die Messung MIT, waehrend der Ausloeser feuert. Ein Lauf,
    // der erst danach anfaengt, sieht die Luecke nicht - sie liegt am Anfang.
    const spur = [];
    let laeuft = true;
    const schleife = (async () => {
      const bis = Date.now() + FENSTER;
      while (laeuft && Date.now() < bis) {
        try { spur.push({ t: Date.now(), ...(await messen()) }); } catch { /* Seite beschaeftigt */ }
        await sleep(TAKT);
      }
    })();
    const t0 = Date.now();
    await st.weg(buehne.helfer);
    await schleife;
    laeuft = false;

    const nachher = spur.slice(-6).reduce((a, s) => Math.max(a, s.kaesten), 0);
    const grund = Math.max(1, Math.min(vorher.kaesten, nachher));
    const grenze = grund * SCHWELLE;

    // Die laengste zusammenhaengende Strecke unter der Grenze.
    let besteVon = null, besteBis = null, von = null;
    for (const s of spur) {
      if (s.kaesten <= grenze) { if (von === null) von = s.t; besteBis = s.t; }
      else if (von !== null) {
        if (besteVon === null || (besteBis - von) > (besteBis - besteVon)) { besteVon = von; }
        von = null;
      }
    }
    if (von !== null && besteVon === null) besteVon = von;
    const leere = besteVon !== null ? Math.max(0, (besteBis ?? besteVon) - besteVon) : 0;
    const tief = spur.reduce((a, s) => Math.min(a, s.kaesten), Infinity);

    zeilen.push({ name, vor: vorher.kaesten, nach: nachher, tief, leere, ab: besteVon ? besteVon - t0 : null });
    console.log(`${name.padEnd(16)} vorher ${String(vorher.kaesten).padStart(3)}  nachher ${String(nachher).padStart(3)}  tiefster Stand ${String(tief).padStart(3)}  LEERE ${String(leere).padStart(5)} ms`);
  } catch (e) {
    console.log(`${name.padEnd(16)} uebersprungen (${String(e).split('\n')[0].slice(0, 60)})`);
  }
}

console.log('\n── Nach Groesse der Luecke ───────────────────────────────');
for (const z of [...zeilen].sort((a, b) => b.leere - a.leere)) {
  if (z.leere <= 0) continue;
  console.log(`  ${String(z.leere).padStart(5)} ms   ${z.name.padEnd(16)} (ab ${z.ab} ms, tiefster Stand ${z.tief} von ${Math.min(z.vor, z.nach)})`);
}
const ohne = zeilen.filter(z => z.leere <= 0).map(z => z.name);
console.log(`\nOhne messbare Luecke: ${ohne.join(', ') || '(keine)'}`);

await buehne.schliessen();
process.exit(0);
