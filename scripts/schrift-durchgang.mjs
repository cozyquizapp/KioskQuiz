/* schrift-durchgang — laeuft nach dem Schriftwechsel etwas ueber?
 *
 * 2026-08-26 (Wolf: „ja die isses bricolage"). Eine neue Arbeitsschrift aendert
 * JEDE Textbreite und jede Zeilenhoehe im Haus. Das ist genau das Risiko, das
 * die harte Regel meint: „Der Beamer bekommt nie eine Scrollbar." Ein Titel,
 * der vorher knapp passte, bricht jetzt um; eine Pille, die vorher knapp
 * passte, steht ueber der Kante.
 *
 * Geprueft wird deshalb Station fuer Station:
 *   1. Laeuft die Seite ueber (scrollWidth/Height gegen clientWidth/Height)?
 *   2. Steht ein Element ueber die 1760x990 der Buehne hinaus?
 *   3. Ist die Schrift ueberhaupt angekommen, oder rendert der Fallback?
 *      (document.fonts.check - sonst prueft man Nunito und freut sich.)
 *
 * NUTZUNG:  node scripts/schrift-durchgang.mjs
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

const STATIONEN = [
  'lobby', 'regeln', 'regelintro', 'rundenintro', 'frage', 'frage2', 'frage3',
  'aufloesung', 'brett', 'pause', 'turmfinale', 'cozydanach',
];

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
fs.mkdirSync('.shots', { recursive: true });

const funde = [];
let geprueft = 0;

for (const st of STATIONEN) {
  try {
    await b.zurStation(st);
    await sleep(2200);
  } catch (e) {
    console.log(`  ${st.padEnd(13)} nicht erreichbar (${String(e.message).slice(0, 46)})`);
    continue;
  }

  const lage = await seite.evaluate(() => {
    const d = document.documentElement;
    const buehne = document.querySelector('[data-qq-buehne]');
    const br = buehne ? buehne.getBoundingClientRect() : null;
    const raus = [];
    if (br) {
      for (const el of buehne.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden' || Number(s.opacity) < 0.05) continue;
        // Nur echte Ueberstaende, und nur nach aussen. Ein Element, das
        // absichtlich angeschnitten in einem overflow:hidden sitzt, zaehlt
        // nicht - deshalb der Blick auf die Eltern.
        const links = Math.round(br.left - r.left);
        const rechts = Math.round(r.right - br.right);
        const oben = Math.round(br.top - r.top);
        const unten = Math.round(r.bottom - br.bottom);
        const max = Math.max(links, rechts, oben, unten);
        if (max <= 2) continue;
        let geschnitten = false;
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const ps = getComputedStyle(p);
          if (ps.overflow !== 'visible' || ps.overflowX !== 'visible' || ps.overflowY !== 'visible') { geschnitten = true; break; }
        }
        if (geschnitten) continue;
        raus.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 34),
          ueber: max, wo: links === max ? 'links' : rechts === max ? 'rechts' : oben === max ? 'oben' : 'unten',
        });
      }
    }
    // Ist Bricolage wirklich da? `check` ist ehrlich, `font-family` nicht.
    const daBold = document.fonts.check('800 96px "Bricolage Grotesque"');
    const daNormal = document.fonts.check('400 22px "Bricolage Grotesque"');
    return {
      ueberBreit: d.scrollWidth - d.clientWidth,
      ueberHoch: d.scrollHeight - d.clientHeight,
      buehne: br ? { b: Math.round(br.width), h: Math.round(br.height) } : null,
      ueberstaende: raus.sort((a, z) => z.ueber - a.ueber).slice(0, 5),
      schriftDa: daBold && daNormal,
    };
  });

  geprueft++;
  const schlimm = lage.ueberBreit > 1 || lage.ueberHoch > 1 || lage.ueberstaende.length > 0 || !lage.schriftDa;
  console.log(`  ${schlimm ? '✗' : '✓'} ${st.padEnd(13)}`
    + ` Scroll ${lage.ueberBreit}x${lage.ueberHoch}`
    + `  Ueberstaende ${lage.ueberstaende.length}`
    + `  Schrift ${lage.schriftDa ? 'da' : 'FEHLT'}`);
  for (const u of lage.ueberstaende) {
    console.log(`      ${u.ueber} px ${u.wo}  <${u.tag}> „${u.text}"`);
  }
  if (schlimm) funde.push({ station: st, ...lage });
}

console.log(`\n══ Urteil ══════════════════════════════════════════════════════`);
console.log(`  ${geprueft} Stationen gefahren.`);
console.log(funde.length === 0
  ? '  Nichts laeuft ueber, die Schrift ist ueberall angekommen.'
  : `  ${funde.length} Station(en) auffaellig: ${funde.map(f => f.station).join(', ')}`);

await b.schliessen?.();
process.exit(funde.length === 0 ? 0 : 1);
