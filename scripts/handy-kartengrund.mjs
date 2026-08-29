/* handy-kartengrund — was liegt eigentlich HINTER dem Text einer Karte?
 *
 * 2026-08-29. Anlass: die Regeln-Karte im Kolosseum-Look. Ob ihr Text lesbar
 * ist, laesst sich nicht aus den CSS-Werten ableiten, weil hinter der Karte
 * ein FOTO liegt (die Fraktions-Welt). Der Kontrast haengt damit nicht an
 * einer Farbe, sondern an der hellsten Stelle des Bildes unter der Schrift.
 *
 * ⚠️ Und er laesst sich auch nicht aus dem fertigen Screenshot messen: dort
 * sind Schrift und Grund dieselben Pixel. Ein erster Anlauf hat genau das
 * versucht und als „hellste Stelle des Grundes" die Schrift selbst gemessen
 * (185,179,198 - das ist --qq-ink-muted, nicht das Bild).
 *
 * Deshalb hier zweistufig: erst die Textknoten unsichtbar schalten
 * (`visibility: hidden` - der Platz bleibt, das Bild darunter nicht), dann den
 * Kartenausschnitt aufnehmen und die Zeilen-Baender einzeln ausmessen. Was
 * uebrig bleibt, ist der Grund und nichts sonst.
 *
 * Gemessen wird gegen WCAG 1.4.3: 4,5:1 fuer normalen Text, 3:1 ab 24px bzw.
 * 19px fett. Beurteilt wird die HELLSTE Stelle, nicht der Mittelwert - ein
 * Wort, das ueber dem Lichtband steht, ist genau dort schlecht lesbar.
 *
 * NUTZUNG: node scripts/handy-kartengrund.mjs [--mega] [--look=kolosseum]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { handyStarten } from './lib/handy.mjs';

const mega = process.argv.includes('--mega');
const look = (process.argv.find(a => a.startsWith('--look=')) ?? '--look=standard').split('=')[1];
const SECS = Number((process.argv.find(a => a.startsWith('--secs=')) ?? '--secs=170').split('=')[1]);
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const lum = (r, g, b) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const kontrast = (a, b) => { const [h, l] = a > b ? [a, b] : [b, a]; return (h + 0.05) / (l + 0.05); };

/* --frisch startet das Backend vor dem Lauf neu. Ohne die Angabe passiert das
 * nur, wenn es noetig wird - siehe backendNeustart in lib/handy.mjs. */
const FRISCH = process.argv.includes('--frisch');
const b = await handyStarten({ frisch: FRISCH, mega, secs: SECS, look });
const funde = [];

await b.abendMitfahren(async (phase) => {
  /* Textzeilen der obersten Karte einsammeln: Kasten, Farbe, Groesse. */
  const zeilen = await b.handy.evaluate(() => {
    const karte = [...document.querySelectorAll('div')]
      .filter(el => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return r.width > 250 && r.height > 80 && cs.borderTopLeftRadius !== '0px'
          && (cs.backgroundImage !== 'none' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)');
      })
      .sort((a, z) => a.getBoundingClientRect().top - z.getBoundingClientRect().top)[0];
    if (!karte) return null;
    const kr = karte.getBoundingClientRect();
    const out = [];
    for (const el of karte.querySelectorAll('*')) {
      const eigen = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!eigen) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 8) continue;
      const cs = getComputedStyle(el);
      out.push({
        text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 34),
        farbe: cs.color, px: parseFloat(cs.fontSize), fett: parseInt(cs.fontWeight, 10) >= 700,
        x: r.x, y: r.y, w: r.width, h: r.height,
      });
      el.dataset.qqGrundprobe = '1';
    }
    return { karte: { x: kr.x, y: kr.y, w: kr.width, h: kr.height }, zeilen: out };
  }).catch(() => null);
  if (!zeilen?.zeilen.length) return;

  /* Schrift ausblenden, Grund aufnehmen, Schrift zurueck. */
  await b.handy.evaluate(() => {
    for (const el of document.querySelectorAll('[data-qq-grundprobe]')) el.style.visibility = 'hidden';
  });
  const bild = await b.handy.screenshot();
  await b.handy.evaluate(() => {
    for (const el of document.querySelectorAll('[data-qq-grundprobe]')) { el.style.visibility = ''; delete el.dataset.qqGrundprobe; }
  });

  const { data, info } = await sharp(bild).raw().toBuffer({ resolveWithObject: true });
  const s = info.width / 390;                       // Geraete-Pixel je CSS-Pixel
  for (const z of zeilen.zeilen) {
    let hell = 0, summe = 0, n = 0;
    for (let y = Math.round(z.y * s); y < Math.round((z.y + z.h) * s); y++) {
      for (let x = Math.round(z.x * s); x < Math.round((z.x + z.w) * s); x++) {
        if (y < 0 || y >= info.height || x < 0 || x >= info.width) continue;
        const i = (y * info.width + x) * info.channels;
        const l = lum(data[i], data[i + 1], data[i + 2]);
        summe += l; n++; if (l > hell) hell = l;
      }
    }
    if (!n) continue;
    const m = /rgba?\((\d+), *(\d+), *(\d+)/.exec(z.farbe);
    const tinte = m ? lum(+m[1], +m[2], +m[3]) : null;
    const gross = z.px >= 24 || (z.px >= 18.66 && z.fett);
    funde.push({
      phase, ...z, gross, soll: gross ? 3 : 4.5,
      hell: kontrast(tinte, hell), mittel: kontrast(tinte, summe / n),
    });
  }
  console.log(`  ✓ ${phase} (${zeilen.zeilen.length} Zeilen)`);
});
await b.schliessen();

/* ── Bericht ──────────────────────────────────────────────────────────────── */
mkdirSync('.shots/kartengrund', { recursive: true });
const titel = `${mega ? 'CrowdQuiz' : 'CozyQuiz'} · ${look === 'kolosseum' ? 'Kolosseum-Look' : 'Standarddesign'}`;
const z = [`# Kartengrund: ${titel}`, '',
  'Kontrast der Schrift gegen das, was WIRKLICH hinter ihr liegt - Karte plus',
  'Scrim plus Hintergrundbild, gemessen am ausgeblendeten Text.', '',
  '`hellste` ist der Wert, auf den es ankommt: die hellste Stelle des Grundes',
  'unter der Zeile. `mittel` steht daneben, damit sichtbar wird, ob eine Zeile',
  'durchgehend schlecht steht oder nur an einer Stelle.', '',
  '| Station | Zeile | px | Soll | hellste | mittel |', '|---|---|---:|---:|---:|---:|'];
const rot = funde.filter(f => f.hell < f.soll);
for (const f of funde) {
  const ok = f.hell >= f.soll ? '' : ' ⚠️';
  z.push(`| ${f.phase} | ${f.text} | ${Math.round(f.px)} | ${f.soll}:1 | **${f.hell.toFixed(2)}:1**${ok} | ${f.mittel.toFixed(2)}:1 |`);
}
z.push('', rot.length ? `⚠️ ${rot.length} von ${funde.length} Zeilen bleiben an ihrer hellsten Stelle unter WCAG 1.4.3.`
  : `✓ Alle ${funde.length} Zeilen halten WCAG 1.4.3 auch an ihrer hellsten Stelle.`, '');
const text = z.join('\n');
writeFileSync(`.shots/kartengrund/BERICHT${mega ? '-CROWD' : ''}${look === 'kolosseum' ? '-KOLOSSEUM' : ''}.md`, text);
console.log('\n' + text);
