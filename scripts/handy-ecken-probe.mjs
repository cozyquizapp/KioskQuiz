/* handy-ecken-probe — welche Elemente tragen welche Ecke?
 *
 * Nachtrag zu handy-crowd-abgleich.mjs: der Wortschatz-Vergleich meldet nur,
 * DASS CozyQuiz auf dem Handy runde Ecken (50%) benutzt und CrowdQuiz kleine.
 * Welche Elemente das sind, steht dort nicht - und ohne das ist der Befund
 * nicht zu bewerten. Diese Probe nennt Tag, Klasse, Groesse und Text.
 *
 * NUTZUNG: node scripts/handy-ecken-probe.mjs --nur=cozy|crowd
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { handyStarten } from './lib/handy.mjs';

const NUR = (process.argv.find(a => a.startsWith('--nur=')) ?? '--nur=cozy').split('=')[1];
const mega = NUR === 'crowd';

const b = await handyStarten({ mega, secs: 150 });
const fund = {};
await b.abendMitfahren(async (phase) => {
  const l = await b.handy.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 24) continue;
      const cs = getComputedStyle(el);
      const rad = cs.borderTopLeftRadius;
      if (!rad || rad === '0px') continue;
      out.push({
        tag: el.tagName.toLowerCase(),
        kl: (typeof el.className === 'string' ? el.className : '').slice(0, 40),
        rad, w: Math.round(r.width), h: Math.round(r.height),
        text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 30),
      });
    }
    return out;
  }).catch(() => []);
  fund[phase] = l;
  console.log(`  ✓ ${phase} (${l.length})`);
});
await b.schliessen();
mkdirSync('.shots/crowd', { recursive: true });
writeFileSync(`.shots/crowd/ecken-${NUR}.json`, JSON.stringify(fund, null, 1));
console.log(`.shots/crowd/ecken-${NUR}.json`);
