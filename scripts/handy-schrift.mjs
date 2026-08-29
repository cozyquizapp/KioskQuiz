/* handy-schrift — welche Schrift traegt /team, in welchen Groessen?
 *
 * 2026-08-29, Wolf: „was war mit font fuer mobiles? ist die nicht so gut?"
 *
 * Die Frage laesst sich nicht mit Geschmack beantworten und auch nicht mit dem
 * Namen der Schrift. Was zaehlt, ist: wieviel Text steht unter 16 px, wie klein
 * wird es, und was macht die Schrift bei diesen Groessen.
 *
 * Bricolage Grotesque ist VARIABEL und hat neben wght eine opsz-Achse (12-96).
 * `font-optical-sizing: auto` ist der CSS-Standard, die Achse greift also von
 * selbst: 13 px bekommen eine andere Zeichnung als 83 px. Ob das im Browser
 * wirklich passiert, misst dieses Werkzeug mit, statt es dem Kommentar in
 * main.css zu glauben.
 *
 * Gemessen wird ausserdem die x-Hoehe im Verhaeltnis zur Versalhoehe. Sie ist
 * der beste Einzelwert fuer Lesbarkeit bei kleiner Groesse: eine grosse x-Hoehe
 * heisst, dass die Kleinbuchstaben den zur Verfuegung stehenden Platz nutzen.
 * Gemessen an der echten Zeichnung (Canvas-Metriken), nicht aus einer Tabelle.
 *
 * NUTZUNG: node scripts/handy-schrift.mjs [--mega] [--look=kolosseum]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { handyStarten } from './lib/handy.mjs';

const mega = process.argv.includes('--mega');
const look = (process.argv.find(a => a.startsWith('--look=')) ?? '--look=standard').split('=')[1];
const SECS = Number((process.argv.find(a => a.startsWith('--secs=')) ?? '--secs=150').split('=')[1]);

/* --frisch startet das Backend vor dem Lauf neu. Ohne die Angabe passiert das
 * nur, wenn es noetig wird - siehe backendNeustart in lib/handy.mjs. */
const FRISCH = process.argv.includes('--frisch');
const b = await handyStarten({ frisch: FRISCH, mega, secs: SECS, look });
const zeilen = new Map();   // Schluessel: Familie|px|Gewicht

await b.abendMitfahren(async (phase) => {
  const l = await b.handy.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      const eigen = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!eigen) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const cs = getComputedStyle(el);
      out.push({
        fam: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
        px: Math.round(parseFloat(cs.fontSize)),
        gew: cs.fontWeight,
        opsz: cs.fontOpticalSizing,
        tab: cs.fontVariantNumeric.includes('tabular-nums'),
        zahl: /\d/.test(el.textContent ?? ''),
        text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 28),
      });
    }
    return out;
  }).catch(() => []);
  for (const z of l) {
    const k = `${z.fam}|${z.px}|${z.gew}`;
    const bis = zeilen.get(k) ?? { ...z, n: 0, phasen: new Set(), zahlen: 0, tabellarisch: 0 };
    bis.n++; bis.phasen.add(phase);
    if (z.zahl) { bis.zahlen++; if (z.tab) bis.tabellarisch++; }
    if (!bis.text) bis.text = z.text;
    zeilen.set(k, bis);
  }
  console.log(`  ✓ ${phase} (${l.length})`);
});

/* ── Schriftmetrik ─────────────────────────────────────────────────────────
 *
 * ⚠️ Beide Messungen laufen bei GROSSER Groesse, obwohl es um kleine geht.
 * Der Grund ist ein Fehler, den der erste Anlauf gemacht hat: bei 12 px sind
 * die Kastenmasse ganzzahlige Bildpunkte, das Verhaeltnis x/H war 6/7 = 0,857
 * und bei 13 px 7/9 = 0,778. Aus solchen Sprungwerten laesst sich nichts
 * ablesen, schon gar nicht, ob eine Achse greift. Bei 200 px verschwindet die
 * Rundung im Verhaeltnis.
 *
 * Die opsz-Achse wird deshalb direkt geprueft: dieselbe Zeile einmal mit
 * `'opsz' 12`, einmal mit `'opsz' 96`, einmal so, wie der Browser sie von
 * selbst setzt. Sind die Breiten unterschiedlich, gibt es zwei Zeichnungen -
 * und die dritte Zahl sagt, welche das Handy tatsaechlich bekommt. */
const metrik = await b.handy.evaluate(async () => {
  await document.fonts.ready;
  const c = document.createElement('canvas').getContext('2d');
  const mess = (fam) => {
    c.font = `400 200px ${fam}`;
    const x = c.measureText('x'), H = c.measureText('H');
    return {
      anteil: +(x.actualBoundingBoxAscent / H.actualBoundingBoxAscent).toFixed(3),
      I: +c.measureText('I').width.toFixed(1),
      l: +c.measureText('l').width.toFixed(1),
      eins: +c.measureText('1').width.toFixed(1),
      O: +c.measureText('O').width.toFixed(1),
      null_: +c.measureText('0').width.toFixed(1),
    };
  };
  const out = { familien: {} };
  for (const fam of ["'Bricolage Grotesque'", 'system-ui', "'League Spartan'"]) out.familien[fam] = mess(fam);

  const el = document.createElement('span');
  el.textContent = 'Hamburgefonstiv Il1 0O';
  el.style.cssText = "position:fixed;left:-9999px;top:0;font:400 200px 'Bricolage Grotesque';white-space:pre";
  document.body.appendChild(el);
  const breite = (vs, px) => {
    el.style.fontSize = `${px}px`;
    el.style.fontVariationSettings = vs;
    return +el.getBoundingClientRect().width.toFixed(2);
  };
  out.opsz = {
    gross_auto: breite('normal', 200), gross_12: breite("'opsz' 12", 200), gross_96: breite("'opsz' 96", 200),
    klein_auto: breite('normal', 13), klein_12: breite("'opsz' 12", 13), klein_96: breite("'opsz' 96", 13),
  };
  el.remove();
  out.geladen = document.fonts.check("13px 'Bricolage Grotesque'");
  return out;
});
await b.schliessen();

/* ── Bericht ──────────────────────────────────────────────────────────────── */
mkdirSync('.shots/schrift', { recursive: true });
const alle = [...zeilen.values()].sort((a, z) => a.px - z.px || z.n - a.n);
const gesamt = alle.reduce((s, z) => s + z.n, 0);
const klein = alle.filter(z => z.px < 16).reduce((s, z) => s + z.n, 0);
const familien = new Set(alle.map(z => z.fam));

const z = [`# Die Schrift auf /team`, '',
  `${mega ? 'CrowdQuiz' : 'CozyQuiz'} · ${look === 'kolosseum' ? 'Kolosseum-Look' : 'Standarddesign'} · 390x844 · ${new Date().toISOString().slice(0, 10)}`, '',
  `${gesamt} Textelemente, ${familien.size} Schriftfamilie(n): ${[...familien].join(', ')}.`,
  `**${klein} davon (${Math.round(klein / gesamt * 100)} %) stehen unter 16 px.**`, '',
  '## Was benutzt wird', '',
  '| px | Gewicht | Familie | wie oft | Stationen | Beispiel |', '|---:|---:|---|---:|---|---|'];
for (const t of alle) {
  z.push(`| ${t.px} | ${t.gew} | ${t.fam} | ${t.n} | ${t.phasen.size} | ${t.text} |`);
}

const ohneTab = alle.filter(t => t.zahlen > 0 && t.tabellarisch === 0);
z.push('', '## Ziffern', '',
  ohneTab.length
    ? `${ohneTab.length} Groessen tragen Zahlen ohne \`tabular-nums\`. Bei laufenden Werten (Timer, Punktestand) springt die Zeile dadurch in der Breite:\n\n`
      + ohneTab.map(t => `* ${t.px} px / ${t.gew} — z.B. „${t.text}"`).join('\n')
    : 'Alle Zahlen stehen tabellarisch.',
  '');

const o = metrik.opsz;
const zweiZeichnungen = Math.abs(o.gross_12 - o.gross_96) > 1;
const handyBekommt = Math.abs(o.klein_auto - o.klein_12) < Math.abs(o.klein_auto - o.klein_96) ? 'die kleine' : 'die grosse';
z.push('## Bekommt das Handy eine eigene Zeichnung?', '',
  'Bricolage Grotesque ist variabel und hat neben wght eine opsz-Achse (12-96).',
  'Wenn `font-optical-sizing: auto` greift, ist die Zeichnung bei 13 px eine',
  'andere als bei 200 px: weiter, offener, mit groesserer x-Hoehe. Das waere',
  'genau das, was man sonst mit einer zweiten Schrift fuer Mobil erreicht.', '',
  'Gemessen an der Breite derselben Zeile:', '',
  '| | wie der Browser will | opsz 12 erzwungen | opsz 96 erzwungen |', '|---|---:|---:|---:|',
  `| bei 200 px | ${o.gross_auto} | ${o.gross_12} | ${o.gross_96} |`,
  `| bei 13 px | ${o.klein_auto} | ${o.klein_12} | ${o.klein_96} |`, '',
  zweiZeichnungen
    ? `Es gibt zwei Zeichnungen (bei 200 px ${(Math.abs(o.gross_12 - o.gross_96) / o.gross_96 * 100).toFixed(1)} % Breitenunterschied), und das Handy bekommt **${handyBekommt}**.`
    : '**Die Achse greift nicht** - es wird eine Zeichnung skaliert.',
  '', `Schrift geladen: ${metrik.geladen ? 'ja' : 'NEIN'}.`, '');

z.push('## x-Hoehe gegen Versalhoehe', '',
  'Der beste Einzelwert fuer Lesbarkeit bei kleiner Groesse: je hoeher, desto',
  'mehr Platz nutzen die Kleinbuchstaben. Bei 200 px gemessen, damit die',
  'Rundung auf ganze Bildpunkte das Verhaeltnis nicht verfaelscht.', '',
  '⚠️ `system-ui` steht hier nur zum Vergleich und ist NICHT die Schrift eines',
  'iPhones - im Messcontainer ist es, was dort installiert ist.', '',
  '| Schrift | x/H | I | l | 1 | O | 0 |', '|---|---:|---:|---:|---:|---:|---:|');
for (const [fam, m] of Object.entries(metrik.familien)) {
  z.push(`| ${fam.replace(/'/g, '')} | ${m.anteil} | ${m.I} | ${m.l} | ${m.eins} | ${m.O} | ${m.null_} |`);
}
z.push('', 'Die Zeichenbreiten stehen dabei, weil I/l/1 und O/0 die Paare sind,',
  'an denen ein Code falsch abgetippt wird. Fuer /team ist das entschaerft: der',
  'Stamm-Code steht in `monospace` (CozyQuizTeamPhaseCards.tsx) und ist',
  'ausserdem durchgehend GROSS, `l` kommt darin also gar nicht vor.', '');

const text = z.join('\n');
writeFileSync(`.shots/schrift/BERICHT${mega ? '-CROWD' : ''}.md`, text);
console.log('\n' + text);
