/* sieger-uebergabe-messen — lohnt der Flug der Sieger-Marke ueberhaupt?
 *
 * 2026-08-26, zweiter Anlauf (todo #44).
 *
 * Der erste Anlauf am 2026-08-25 wurde wieder ausgebaut: die Marke flog
 * gemessene 6,7 Bildpunkte. Grund war nicht die Idee, sondern der ZEITPUNKT der
 * Messung - zur Mount-Zeit der Danke-Folie lieferte getBoundingClientRect fuer
 * die Zielkachel fast dieselbe Stelle wie die Quelle, weil Raster und
 * cq-Einheiten da noch nicht aufgeloest waren.
 *
 * Seither ist die Danke-Folie umgebaut: der Sieger steht LINKS statt mittig.
 * Die Strecke sollte also real sein. Dieses Werkzeug misst beide Punkte, bevor
 * irgendetwas gebaut wird:
 *
 *   Quelle = was die Kroenung sich gemerkt hat (__qqSiegerQuelle, in Anteilen
 *            der Buehne, weil der Beamer die feste Flaeche skaliert)
 *   Ziel   = wo [data-qq-sieger] auf der Danke-Folie WIRKLICH steht, gemessen
 *            nach zwei Bildern und noch einmal nach einer Sekunde
 *
 * Der zweite Zeitpunkt ist der Kern: wenn die beiden Ziele auseinanderliegen,
 * war genau das der Fehler des ersten Anlaufs.
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
await b.zurStation('cozydanach'); await sleep(700);
await h.springe('final-reveal'); await sleep(900);

const daIst = async (muster, hoechstens = 9000) => {
  const bis = Date.now() + hoechstens;
  while (Date.now() < bis) {
    if (muster.test(await seite.evaluate(() => document.body.innerText))) return true;
    await sleep(170);
  }
  return false;
};

// Bis zur Siegerfolie vorfahren.
const SIEGERFOLIE = /SIEGER DES ABENDS|WINNER OF THE NIGHT/i;
for (let i = 0; i < 30; i++) {
  if (await daIst(SIEGERFOLIE, 300)) break;
  await h.emit('qq:nextQuestion');
  if (await daIst(SIEGERFOLIE)) break;
}
await sleep(1200);

const quelle = await seite.evaluate(() => (globalThis).__qqSiegerQuelle ?? null);
const buehne = await seite.evaluate(() => {
  const el = document.querySelector('[data-qq-buehne]');
  const r = el ? el.getBoundingClientRect() : null;
  return r ? { b: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top) } : null;
});

// Weiter zur Danke-Folie und die Zielkachel ZWEIMAL messen.
await h.emit('qq:nextQuestion');
await seite.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const zielFrueh = await seite.evaluate(() => {
  const el = document.querySelector('[data-qq-sieger]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), gr: Math.round(r.width) };
});
// Waehrend der Flug laufen sollte: den Weg mitschreiben.
const spur = [];
const t0 = Date.now();
while (Date.now() - t0 < 1500) {
  try {
    const punkt = await seite.evaluate(() => {
      const el = document.querySelector('[data-qq-sieger]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      // Die Deckkraft gehoert dazu: der Kasten sagt nur, WO die Kachel ist,
      // nicht ob man sie sieht. Genau daran haengt, ob der Sprung vor dem Flug
      // sichtbar ist oder nicht.
      return {
        x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
        gr: Math.round(r.width),
        deck: Number(getComputedStyle(el).opacity).toFixed(2),
      };
    });
    if (punkt) spur.push({ t: Date.now() - t0, ...punkt });
  } catch { /* Seite beschaeftigt */ }
  await sleep(60);
}
const zielSpaet = await seite.evaluate(() => {
  const el = document.querySelector('[data-qq-sieger]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), gr: Math.round(r.width) };
});

console.log('\n── Die Uebergabe, in Zahlen ──────────────────────────────────');
console.log('  Buehne auf dem Schirm :', buehne);
console.log('  Quelle (Kroenung)     :', quelle
  ? `x ${quelle.x.toFixed(3)} · y ${quelle.y.toFixed(3)} · Groesse ${quelle.groesse.toFixed(3)} (Anteile)`
  : '(nichts gemerkt)');
console.log('  Ziel nach 2 Bildern   :', zielFrueh);
console.log('  Ziel nach 1,4 s       :', zielSpaet);
console.log('\n── Der Weg der Marke, Ablesung fuer Ablesung ─────────────────');
let vor = null;
for (const p of spur) {
  const z = `x ${String(p.x).padStart(4)} y ${p.y} gr ${p.gr}  Deckkraft ${p.deck}`;
  if (z === vor) continue;
  vor = z;
  console.log(`  ${String(p.t).padStart(5)} ms   ${z}`);
}

if (quelle && buehne && zielSpaet) {
  const qx = buehne.x + quelle.x * buehne.b;
  const qy = buehne.y + quelle.y * buehne.h;
  const strecke = (z) => Math.round(Math.hypot(qx - z.x, qy - z.y));
  console.log(`\n  Quelle in Bildpunkten : x ${Math.round(qx)} · y ${Math.round(qy)}`);
  if (zielFrueh) console.log(`  Strecke frueh gemessen: ${strecke(zielFrueh)} px`);
  console.log(`  Strecke spaet gemessen: ${strecke(zielSpaet)} px`);
  if (zielFrueh) {
    const drift = Math.round(Math.hypot(zielFrueh.x - zielSpaet.x, zielFrueh.y - zielSpaet.y));
    console.log(`  Das Ziel wandert nach dem Mount noch um ${drift} px`
      + (drift > 20 ? '  ⚠️ frueh messen waere falsch' : ''));
  }
}
await b.schliessen?.();
process.exit(0);
