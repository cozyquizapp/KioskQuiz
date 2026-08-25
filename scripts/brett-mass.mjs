/* brett-mass — misst, ob das fallende Brett die Tuerme ueberdeckt.
   Wolf: „nur ueberlappt das grid etwas mit den tuermen?"

   Gemessen wird waehrend der Brett-Phase am Baum: der Kasten des ruhenden
   Bretts (`data-qq-brett`) gegen die Oberkanten der Tuerme (`data-qq-turm`).
   Ein Kontaktblatt taugt dafuer nicht - auf 300 Bildpunkten sind zwanzig
   Pixel Ueberdeckung unsichtbar, auf der Wand sind es fuenf Zentimeter.

   NUTZUNG: node scripts/brett-mass.mjs */
import { buehneStarten, sleep } from './lib/buehne.mjs';
const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
await b.zurStation('turmfinale'); await sleep(1200);
await h.springe('final-reveal'); await sleep(900);
const seite = h.seite();
for (let i = 0; i < 24; i++) {
  const txt = await seite.evaluate(() => document.body.innerText);
  if (/höchsten Turm/.test(txt)) break;
  await h.emit('qq:nextQuestion'); await sleep(1200);
}
// Waehrend der Brett-Phase mehrfach ablesen: die Tuerme wachsen ja noch.
// Die Marken sind ABSTAENDE, nicht Zeitpunkte - beim ersten Anlauf hatte ich
// sie als Zeitpunkte beschriftet und die Ausgabe log um bis zu 2,4 Sekunden.
let verstrichen = 0;
for (const schritt of [400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400]) {
  await sleep(schritt); verstrichen += schritt;
  const wann = verstrichen;
  // ⚠️ NICHT den Kasten des Bretts messen. Der bleibt 600 Bildpunkte hoch,
  // auch wenn die halben Zeilen schon weg sind - die Zellen blenden einzeln
  // aus, der Container schrumpft nicht. Gemessen werden muessen die noch
  // SICHTBAREN Zellen, sonst meldet das Werkzeug eine Ueberdeckung, die auf
  // der Wand niemand sieht (erster Anlauf: 566 Bildpunkte, davon echt: null).
  const m = await seite.evaluate(() => {
    const sichtbar = (el) => Number(getComputedStyle(el).opacity) > 0.06;
    const zellen = [];
    const br = document.querySelector('[data-qq-brett]');
    if (br) for (const el of br.children) if (sichtbar(el)) zellen.push(el.getBoundingClientRect());
    for (const el of document.querySelectorAll('[data-qq-streu]')) if (sichtbar(el)) zellen.push(el.getBoundingClientRect());
    const tuerme = [];
    for (const el of document.querySelectorAll('[data-qq-turm]')) if (sichtbar(el)) tuerme.push(el.getBoundingClientRect());
    let schlimmste = 0, wo = null;
    for (const z of zellen) for (const t of tuerme) {
      const breit = Math.min(z.right, t.right) - Math.max(z.left, t.left);
      const hoch = Math.min(z.bottom, t.bottom) - Math.max(z.top, t.top);
      if (breit > 0 && hoch > 0 && breit * hoch > schlimmste) { schlimmste = breit * hoch; wo = { breit: Math.round(breit), hoch: Math.round(hoch) }; }
    }
    const unten = zellen.length ? Math.max(...zellen.map(z => z.bottom)) : null;
    const oben = tuerme.length ? Math.min(...tuerme.map(t => t.top)) : null;
    return { zellen: zellen.length, unten: unten && Math.round(unten), oben: oben && Math.round(oben), schlimmste: Math.round(schlimmste), wo };
  });
  console.log(`${String(wann).padStart(5)} ms   ${String(m.zellen).padStart(3)} sichtbare Brettzellen bis ${m.unten ?? '-'}   hoechster Turm oben ${m.oben ?? '-'}   ` +
    (m.schlimmste > 0 ? `UEBERDECKUNG ${m.wo.breit}x${m.wo.hoch}` : 'keine Ueberdeckung'));
}
await b.schliessen?.(); process.exit(0);
