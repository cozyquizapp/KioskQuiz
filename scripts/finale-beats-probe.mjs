/* finale-beats-probe — bekommt der Sieger auf der Turmbuehne einen eigenen Beat?
 *
 * 2026-08-26 (Wolf: „das finale zwischen platz 1 und 2 ist etwas langweilig").
 *
 * Die Absicht steht im Code (CozyQuizTowerFinaleV2, Kopf des Renn-Effekts):
 *   „A+N der Sieger, allein auf der Buehne, letzter Baustein, Krone."
 * Die Aufnahme sah anders aus: nach dem Fenster fuer Platz 2 lag EIN Tastendruck
 * bis zur Siegerfolie, und dazwischen war die Turmbuehne leer.
 *
 * Statt das aus dem Bildschirmtext zu raten, liest diese Probe den Messpunkt
 * `__qqTurm`, den die Ansicht selbst schreibt (phase, revealStep, rennTick,
 * eigenerBeat, crowned), und daneben den Socket-Beat. Damit ist zu sehen, ob
 * der Beat fehlt oder ob die Ansicht ihn nur nicht zeigt.
 *
 * NUTZUNG:  node scripts/finale-beats-probe.mjs
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
await b.zurStation('turmfinale');
await sleep(2000);

const lesen = () => seite.evaluate(() => {
  const t = globalThis.__qqTurm ?? null;
  const ansage = document.querySelector('[data-qq-ansage]')?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
  const titel = [...document.querySelectorAll('[data-qq-buehne] div')]
    .map(el => (el.childNodes.length === 1 && el.firstChild?.nodeType === 3 ? el.textContent.trim() : ''))
    .filter(Boolean).slice(0, 3);
  return {
    turm: t,
    ansage,
    titel,
    tuerme: [...document.querySelectorAll('[data-qq-turm]')]
      .filter(el => Number(getComputedStyle(el).opacity) > 0.05).length,
    kroenungsfolie: /SIEGER DES ABENDS|WINNER OF THE NIGHT/i.test(document.body.innerText || ''),
  };
});

console.log('\n── Beat fuer Beat ────────────────────────────────────────────');
console.log('  Druck  Phase    Step  Tick  eigBeat  liveBeat  Krone  Tuerme  Was steht da');
for (let i = 0; i < 24; i++) {
  const l = await lesen();
  const t = l.turm;
  const was = l.kroenungsfolie ? '★ SIEGERFOLIE'
    : l.ansage ? `Fenster: ${l.ansage}`
    : (l.titel[0] ?? '');
  console.log(
    `  ${String(i).padStart(5)}  ${String(t?.phase ?? '?').padEnd(8)} `
    + `${String(t?.revealStep ?? '-').padStart(4)}  ${String(t?.rennTick ?? '-').padStart(4)}  `
    + `${String(t?.eigenerBeat ?? '-').padStart(7)}  ${String(t?.liveBeat ?? '-').padStart(8)}  ${String(t?.crowned ?? '-').padEnd(5)}  `
    + `${String(l.tuerme).padStart(6)}  ${was.slice(0, 44)}`,
  );
  if (l.kroenungsfolie) {
    console.log(`\n  Teams ${t?.teams ?? '?'} · Awards ${t?.awards ?? '?'}`);
    console.log(`  Erwartet nach dem Kopfkommentar: der Sieger haette bei Step ${t?.teams ?? '?'} allein`);
    console.log('  auf der Turmbuehne stehen muessen, mit Krone, VOR dieser Folie.');
    break;
  }
  await h.emit('qq:nextQuestion');
  await sleep(2600);
}

await b.schliessen?.();
process.exit(0);
