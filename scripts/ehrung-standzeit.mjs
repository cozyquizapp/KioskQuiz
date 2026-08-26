/* ehrung-standzeit — der Takt des Turm-Finales, so wie der Moderator ihn wirklich schlaegt.
 *
 * 2026-08-26 (Wolf: „die einzelnen teams die rausfliegen werden eine
 * millisekunde gefeiert" und, zum ersten Anlauf dieses Werkzeugs, „optimier
 * bitte mal den messaufbau").
 *
 * WAS AM ERSTEN AUFBAU FALSCH WAR
 *   1. Er hat den Zustand aus dem Bildschirmtext geraten. Ein Reim wie
 *      /PLATZ (\d+) .../ trifft auch die Zahl im Sockel und liefert Namen wie
 *      „1 Frag-Tiger".
 *   2. Er hat blind nachgeklickt, wenn eine Weile nichts passierte. Damit lag
 *      er zwei Beats vor der Buehne, hat die Eile ausgeloest und drei Ehrungen
 *      uebersprungen - und dann seine eigene Klickerei gemessen statt der
 *      Zeremonie.
 *
 * WIE ES JETZT LAEUFT
 *   Die Buehne meldet ihren Takt selbst (`__qqTurm`, siehe
 *   CozyQuizTowerFinaleV2). Dieses Werkzeug klickt daher nach EINER Regel, und
 *   das ist genau Wolfs Griff am Steuerpult: hoechstens einen Beat vormerken,
 *   nie zwei. Damit kann es die Eile gar nicht mehr ausloesen, und was es
 *   misst, ist die Zeremonie.
 *
 * NUTZUNG:  node scripts/ehrung-standzeit.mjs
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const TAKT = 50;
const ENDE = 90000;
/** Nach einer neuen Ansage wird nicht sofort geklickt: so greift ein Mensch. */
const REAKTION = 350;

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
await b.zurStation('turmfinale'); await sleep(1200);

/** Ein Blick auf den Takt der Buehne - gemeldet, nicht geraten. */
const ablesen = () => seite.evaluate(() => {
  const t = globalThis.__qqTurm;
  const band = document.querySelector('[data-qq-ansage]');
  return {
    da: !!t,
    ...(t ?? {}),
    // Die Ansage wird am Kasten erkannt, nicht am Text der ganzen Seite.
    ansage: band ? (band.textContent || '').replace(/\s+/g, ' ').trim() : null,
    sieger: /SIEGER DES ABENDS|WINNER OF THE NIGHT/i.test(document.body.innerText.slice(0, 80)),
  };
});

const erste = await ablesen();
if (!erste.da) {
  console.log('⚠️ Die Buehne meldet keinen Takt (__qqTurm fehlt). Steht sie wirklich im Turm-Finale?');
  await b.schliessen?.(); process.exit(1);
}

const ehrungen = [];      // Standzeit je Ansage
const beats = [];         // wie lange jeder Beat der Buehne insgesamt lief
let ansage = null, ansageSeit = 0;
let beat = erste.eigenerBeat, beatSeit = Date.now();
let uebersprungen = 0;
let klickOffen = 0;       // wann darf der naechste Klick fruehestens raus?

const t0 = Date.now();
while (Date.now() - t0 < ENDE) {
  const jetzt = Date.now();
  const z = await ablesen();
  if (z.sieger) break;

  if (z.eigenerBeat !== beat) {
    if (beat > 0) beats.push({ beat, ms: jetzt - beatSeit });
    if (z.eigenerBeat > beat + 1) uebersprungen += z.eigenerBeat - beat - 1;
    beat = z.eigenerBeat; beatSeit = jetzt;
  }

  if (z.ansage !== ansage) {
    if (ansage) ehrungen.push({ was: ansage, ms: jetzt - ansageSeit });
    ansage = z.ansage; ansageSeit = jetzt;
    if (ansage) klickOffen = jetzt + REAKTION;
  }

  // DIE Regel: hoechstens einen Beat vormerken. Nie zwei - sonst misst das
  // Werkzeug die Eile, die es eigentlich pruefen soll.
  const darf = (z.liveBeat ?? 0) <= z.eigenerBeat && jetzt >= klickOffen;
  if (darf) { await h.emit('qq:nextQuestion'); klickOffen = jetzt + 250; }

  await sleep(TAKT);
}
if (ansage) ehrungen.push({ was: ansage, ms: Date.now() - ansageSeit });

console.log('\n── Standzeit der Platz-Ansage ────────────────────────────────────');
for (const g of ehrungen) console.log(`  ${String(g.ms).padStart(5)} ms   ${g.was}`);
console.log('\n── Dauer der Beats ───────────────────────────────────────────────');
for (const g of beats) console.log(`  Beat ${String(g.beat).padStart(2)}   ${String(g.ms).padStart(5)} ms`);

const zahlen = ehrungen.map(g => g.ms);
console.log('\n── Zusammengefasst ───────────────────────────────────────────────');
console.log(`  ${ehrungen.length} Ehrungen, uebersprungene Beats: ${uebersprungen}`);
if (zahlen.length) {
  console.log(`  kuerzeste ${Math.min(...zahlen)} ms · laengste ${Math.max(...zahlen)} ms`);
  console.log(Math.min(...zahlen) >= 2000
    ? '  Jede Ehrung steht laenger als zwei Sekunden.'
    : '  ⚠️ Mindestens eine Ehrung ist kuerzer als zwei Sekunden.');
}
await b.schliessen?.();
process.exit(0);
