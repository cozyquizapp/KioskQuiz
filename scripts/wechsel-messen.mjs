/* wechsel-messen — was passiert WAEHREND eines Phasenwechsels auf der Buehne?
 *
 * Der Beamer tauscht Folien nicht aus, er benutzt die eingebaute Wechsel-
 * Funktion des Browsers (View Transitions, siehe hooks/useSceneTransition.ts und
 * die ::view-transition-Regeln in main.css): der Browser macht ein Foto der
 * alten Folie, React baut darunter die neue, und dann blendet der Browser das
 * Foto weg und die neue Folie ein.
 *
 * Auf dem Papier ueberlappen die beiden (alt 280 ms weg, neu 380 ms herein).
 * Gemessen war zwischen 190 und 460 ms trotzdem schwarze Buehne. Dieses
 * Werkzeug liest deshalb nicht das Bild, sondern die BEWEGUNG selbst:
 * `document.getAnimations()` liefert waehrend des Wechsels die Animationen auf
 * den beiden Wechsel-Ebenen, mit Name, Laufzeit, Dauer und Fuellung.
 *
 * NUTZUNG:
 *   node scripts/wechsel-messen.mjs              # Turm-Finale zu Danke
 *   node scripts/wechsel-messen.mjs aufloesung   # ein anderer Wechsel
 *
 * ⚠️ Nicht ueber `page.screenshot()` in einer Schleife: das kostet auf dieser
 * Buehne rund 570 ms je Bild, und der ganze Wechsel dauert 400.
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const TAKT = 28;          // Abtastabstand
const FENSTER = 1400;     // wie lange nach dem Klick gemessen wird

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();

await b.zurStation('cozydanach'); await sleep(700);
await h.springe('final-reveal'); await sleep(900);

// Bis zur Siegerfolie vorfahren. Nach jedem Klick warten, BIS sie steht - der
// Turm haengt an seinen eigenen Beats, und wer schneller taktet, laeuft ihm davon.
const daIst = async (muster, hoechstens = 9000) => {
  const bis = Date.now() + hoechstens;
  while (Date.now() < bis) {
    if (muster.test(await seite.evaluate(() => document.body.innerText))) return true;
    await sleep(170);
  }
  return false;
};
const SIEGERFOLIE = /SIEGER DES ABENDS|WINNER OF THE NIGHT/i;
for (let i = 0; i < 30; i++) {
  if (await daIst(SIEGERFOLIE, 300)) break;
  await h.emit('qq:nextQuestion');
  if (await daIst(SIEGERFOLIE)) break;
}
console.log('stehe bei:', await seite.evaluate(() => document.body.innerText.slice(0, 46).replace(/\n/g, ' | ')));
await sleep(1200);

/** Ein Blick auf den laufenden Wechsel. */
const ablesen = () => seite.evaluate(() => {
  const ebenen = [];
  for (const a of document.getAnimations()) {
    const e = a.effect;
    const p = e && 'pseudoElement' in e ? e.pseudoElement : null;
    if (!p || !p.startsWith('::view-transition')) continue;
    const t = e.getComputedTiming();
    ebenen.push({
      ebene: p,
      name: a.animationName ?? '?',
      zeit: Math.round(Number(a.currentTime ?? 0)),
      dauer: Math.round(Number(t.duration) || 0),
      verzug: Math.round(Number(t.delay) || 0),
      fortschritt: t.progress == null ? null : Number(t.progress).toFixed(2),
      zustand: a.playState,
    });
  }
  // Steht die neue Folie schon im Dokument? Und wie viel davon ist sichtbar?
  const danke = !!document.querySelector('[data-qq-danke-buehne]');
  let sichtbar = 0;
  for (const el of document.querySelectorAll('[data-qq-buehne] *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none') continue;
    if (Number(st.opacity) < 0.12) continue;
    sichtbar++;
  }
  // Was steht in diesem Moment WIRKLICH auf der Buehne? Der Kasten-Zaehler
  // sagt nur „irgendwas ist da", nicht „man sieht es". Deshalb zusaetzlich der
  // Text und der Grund des Phasen-Roots.
  const txt = (document.querySelector('[data-qq-buehne]')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const wurzel = document.querySelector('[data-qq-buehne] > *');
  const grund = wurzel ? getComputedStyle(wurzel).backgroundColor : '?';
  return { ebenen, danke, sichtbar, txt, grund, wechselLaeuft: ebenen.length > 0 };
});

const spur = [];
const t0 = Date.now();
await h.emit('qq:nextQuestion');
while (Date.now() - t0 < FENSTER) {
  try { spur.push({ t: Date.now() - t0, ...(await ablesen()) }); } catch { /* Seite beschaeftigt */ }
  await sleep(TAKT);
}

console.log('\n── Der Wechsel, Ablesung fuer Ablesung ───────────────────────────');
console.log('  Zeit   Danke-Folie   sichtbare Kaesten   Wechsel-Ebenen');
let vorher = null;
for (const s of spur) {
  const eb = s.ebenen.map(e => `${e.ebene.replace('::view-transition-', '')} ${e.name} ${e.zeit}/${e.dauer}ms p=${e.fortschritt}`).join('   ');
  const zeile = `${s.danke ? 'da ' : '-- '} ${String(s.sichtbar).padStart(3)}  «${s.txt}»  ${eb}`;
  if (zeile === vorher) continue;
  vorher = zeile;
  console.log(`  ${String(s.t).padStart(5)}  ${zeile}`);
}

const ersteEbene = spur.find(s => s.ebenen.length > 0);
const letzteEbene = [...spur].reverse().find(s => s.ebenen.length > 0);
const ersteDanke = spur.find(s => s.danke);
console.log('\n── Zusammengefasst ───────────────────────────────────────────────');
console.log(`  Wechsel laeuft von ${ersteEbene?.t ?? '?'} bis ${letzteEbene?.t ?? '?'} ms`);
console.log(`  Danke-Folie steht im Dokument ab ${ersteDanke?.t ?? '(nie)'} ms`);
if (ersteEbene && ersteDanke) {
  console.log(ersteDanke.t > ersteEbene.t
    ? `  ⚠️ Die neue Folie kommt ${ersteDanke.t - ersteEbene.t} ms NACH dem Start des Wechsels.`
    : '  Die neue Folie steht schon, bevor der Wechsel beginnt.');
}
await b.schliessen?.();
process.exit(0);
