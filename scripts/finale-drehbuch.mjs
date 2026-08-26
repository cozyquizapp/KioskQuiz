/* finale-drehbuch — was sagt die Buehne im Turmfinale, Beat fuer Beat?
 *
 * 2026-08-26 (Wolf): „literally kein finale zwischen 1 und 2, es kommt einfach
 * nur platz 2 team x, gar keine spannung"
 *
 * ⚠️ Vorher habe ich an der GEOMETRIE gearbeitet (die beiden Tuerme weiter
 * auseinander, Ansage dazwischen) und gedacht, damit sei das Duell gebaut.
 * Wolfs Satz sagt, dass das nicht das Problem war. Was fehlt, ist nicht der
 * Platz auf der Buehne, sondern der ABLAUF: es gibt keinen Moment, in dem der
 * Saal weiss, dass jetzt zwei uebrig sind und gleich einer faellt.
 *
 * Deshalb misst dieses Werkzeug keine Kaesten, sondern das Drehbuch: nach
 * jedem Beat alles, was auf der Buehne STEHT, dicht abgetastet, damit auch
 * kurze Zwischenzustaende auftauchen. Erst wenn man die Folge der Saetze
 * nebeneinander liest, sieht man, wo die Dramaturgie aufhoert.
 *
 * NUTZUNG:  node scripts/finale-drehbuch.mjs
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
fs.mkdirSync('.shots', { recursive: true });

await b.zurStation('turmfinale');
await sleep(2500);

const lage = () => seite.evaluate(() => {
  const t = globalThis.__qqTurm ?? {};
  const tuerme = [...document.querySelectorAll('[data-qq-turm]')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && Number(getComputedStyle(el).opacity) > 0.05;
  }).length;
  const txt = (el) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
  return {
    beat: t.eigenerBeat ?? null, live: t.liveBeat ?? null, phase: t.phase ?? null,
    schritt: t.revealStep ?? null, duell: !!t.duell,
    gekroent: !!t.crowned,
    tuerme,
    ansage: txt(document.querySelector('[data-qq-ansage]')),
    // Alles, was gross auf der Buehne steht - daraus liest man den Satz des Beats.
    gross: [...document.querySelectorAll('[data-qq-buehne] *')]
      .filter(el => parseFloat(getComputedStyle(el).fontSize) >= 40
        && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
      .map(el => txt(el)).filter(Boolean).slice(0, 6),
  };
});

const drehbuch = [];
const ruhezustaende = [];
let letzter = null;
for (let beat = 0; beat < 18; beat++) {
  // ⚠️ Lange genug stehen lassen. Der erste Durchgang hat 2,1 s je Beat
  // abgetastet und deshalb nur die BEWEGUNG gesehen, nie den Ruhezustand -
  // also genau das, was der Saal die meiste Zeit sieht, waehrend Wolf redet
  // und auf die Leertaste wartet. Bei „keine Spannung" ist der Ruhezustand
  // die eigentliche Frage.
  for (let i = 0; i < 34; i++) {
    const l = await lage();
    const schluessel = `${l.ansage}|${l.gross.join('/')}|${l.tuerme}|${l.gekroent}`;
    if (schluessel !== letzter) {
      letzter = schluessel;
      drehbuch.push({ beat, l });
    }
    await sleep(180);
  }
  // Der Ruhezustand dieses Beats: so steht die Buehne, wenn nichts mehr
  // passiert. Das ist das Bild, das der Saal minutenlang sieht.
  const ruhe = await lage();
  ruhezustaende.push({ beat, l: ruhe });
  if (ruhe.tuerme > 0 && ruhe.tuerme <= 3) {
    await seite.screenshot({ path: `.shots/finale-ruhe-beat${beat}.png` });
  }
  await h.emit('qq:nextQuestion');
  await sleep(260);
}

console.log('\n══ Das Drehbuch ════════════════════════════════════════════════');
for (const d of drehbuch) {
  const l = d.l;
  console.log(`  Beat ${String(d.beat).padStart(2)}  ${String(l.tuerme).padStart(2)} Tuerme${l.gekroent ? ' 👑' : '   '}  ${l.ansage ? `Ansage: „${l.ansage}"` : ''}`);
  if (l.gross.length) console.log(`            gross: ${l.gross.map(g => `„${g}"`).join('  ')}`);
}

console.log('\n══ Wie die Buehne WARTET (Ruhezustand je Beat) ═════════════════');
for (const r of ruhezustaende) {
  if (!r.l.ansage && !r.l.gross.length) continue;
  console.log(`  Beat ${String(r.beat).padStart(2)}  Schritt ${String(r.l.schritt).padStart(2)}${r.l.duell ? ' DUELL' : '      '}  ${String(r.l.tuerme).padStart(2)} Tuerme${r.l.gekroent ? ' 👑' : '   '}  ${r.l.ansage ? `„${r.l.ansage}"` : '(keine Ansage)'}`);
  if (r.l.gross.length) console.log(`            gross: ${r.l.gross.slice(0, 3).map(g => `„${g}"`).join('  ')}`);
}

await b.schliessen?.();
