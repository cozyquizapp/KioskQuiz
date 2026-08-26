/* finale-zwei-schuss — die letzten Beats des Turmfinales als Standbilder.
 *
 * 2026-08-26 (Wolf: „das finale zwischen platz 1 und 2 ist etwas langweilig").
 *
 * Die Aufnahme (scripts/finale-zwei-messen.mjs) hat den Ablauf schon verraten:
 * Platz 8, 7, 6, 5, 4, 3, 2 - sieben Fenster nach demselben Muster - und dann
 * ist die Buehne leer. Fuer Platz 1 gibt es auf der Turmbuehne gar keinen Beat.
 * Was fehlt, sind die Bilder dazu, und zwar genau an drei Stellen:
 *
 *   A) Platz 3 steht im Fenster: wie viele Tuerme sieht der Saal noch?
 *   B) Platz 2 steht im Fenster: das soll das Duell sein.
 *   C) Der Beat danach: was steht da, wo der Sieger stehen muesste?
 *
 * NUTZUNG:  node scripts/finale-zwei-schuss.mjs
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
await b.zurStation('turmfinale');
await sleep(2000);
fs.mkdirSync('.shots', { recursive: true });

const lage = () => seite.evaluate(() => {
  const tuerme = [...document.querySelectorAll('[data-qq-turm]')].map(el => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      id: el.getAttribute('data-qq-turm'),
      x: Math.round(r.left), b: Math.round(r.width), h: Math.round(r.height),
      deck: Number(s.opacity).toFixed(2),
      sichtbar: r.width > 2 && r.height > 2 && Number(s.opacity) > 0.05,
    };
  });
  return {
    tuerme,
    sichtbar: tuerme.filter(t => t.sichtbar).length,
    ansage: document.querySelector('[data-qq-ansage]')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 70),
  };
});

const schuesse = [];
for (let i = 0; i < 26; i++) {
  const l = await lage();
  const platz = /Platz (\d+)/.exec(l.ansage ?? '')?.[1];
  if (platz === '3' || platz === '2') {
    schuesse.push({ name: `PLATZ${platz}`, l });
    await seite.screenshot({ path: `.shots/FINALE-PLATZ${platz}.png` });
    console.log(`  Bild bei Platz ${platz}: ${l.sichtbar} von ${l.tuerme.length} Tuermen sichtbar`);
  }
  if (platz === '2') {
    // Der Beat danach: dort MUSS jetzt der Sieger stehen, allein und gekroent.
    // Bis 2026-08-26 lag hier schon die Siegerfolie.
    await h.emit('qq:nextQuestion');
    await sleep(3200);
    const n = await lage();
    await seite.screenshot({ path: '.shots/FINALE-SIEGER.png' });
    console.log(`  Bild danach   : ${n.sichtbar} von ${n.tuerme.length} Tuermen sichtbar · ${n.text}`);
    schuesse.push({ name: 'SIEGER-AM-TURM', l: n });
    break;
  }
  await h.emit('qq:nextQuestion');
  await sleep(1300);
}

console.log('\n── Die Tuerme in den letzten Beats ───────────────────────────');
for (const s of schuesse) {
  console.log(`\n  ${s.name}  (${s.sichtbar ?? s.l.sichtbar} sichtbar)`);
  for (const t of s.l.tuerme) {
    console.log(`    ${t.sichtbar ? '●' : '○'} ${String(t.id).slice(0, 10).padEnd(11)} x ${String(t.x).padStart(4)}  ${t.b}x${t.h}  Deckkraft ${t.deck}`);
  }
}

await b.schliessen?.();
process.exit(0);
