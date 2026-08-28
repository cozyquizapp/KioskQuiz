/* pausenfolien-pruefen — sind die wechselnden Folien gleich GEBAUT?
 *
 * 2026-08-27, Wolf zum „Schnellste Minute"-Bild: „nicht alle wechselnden slides
 * wirken gleich (gut) ... bitte das design einheitlicher und auf fehler pruefen
 * (alte emojis zb oder fehlende)".
 * Und danach, praeziser, an zwei Bildern (Rekorde, Schnellste Minute):
 *   „die infos haben kaesten, die teamavatare kacheln, kategorie meister hat
 *    kaesten, aber andere zwischen pages nicht"
 *
 * Das sind ZWEI Fragen, und die zweite ist die groessere.
 *
 * ── Warum am QUELLTEXT und nicht an der laufenden Buehne ───────────────────
 * Mein erster Anlauf hat die Buehne abgetastet und dabei genau EINE Folie
 * gesehen. Zwei Gruende, beide grundsaetzlich:
 *
 *   1. Die meisten Folien haengen an Verlauf (Bestenliste, Rekorde, Rivalen).
 *      Ein frischer Raum hat den nicht, also kommen sie gar nicht vor. Ein
 *      Raum MIT Verlauf laesst sich hier nicht herstellen.
 *   2. Jede Folie steht acht Sekunden. Zwanzig Folien sind knapp drei Minuten
 *      Abtasten fuer eine Frage, die der Quelltext vollstaendig beantwortet.
 *
 * ── Pruefung 1: rohe Systemzeichen ────────────────────────────────────────
 * ⚠️ Die erste Fassung dieses Werkzeugs hat 11 von 11 gruen gemeldet und lag
 * falsch. Sie hat nur die `statTitle(...)`-Aufrufe angesehen. Genau die waren
 * in Ordnung - die Fehler standen woanders: in Ueberschriften, die eine Folie
 * sich selbst baut (Rekorde, Lustigste Antworten, Fraktionen) und in Zeilen
 * mitten im Text (Knappster Sieg, Heute). Wolf hat auf dem Rekorde-Bild genau
 * das gesehen: die Flamme ist ein Bild aus dem Satz, die Medaille daneben eine
 * OS-Glyphe.
 * Deshalb sucht die Pruefung jetzt JEDES Zeichen im gerenderten JSX, egal in
 * welcher Bauform, und sagt zusaetzlich, ob es dafuer ueberhaupt ein Bild gibt.
 *
 * ── Pruefung 2: die Kastenform ────────────────────────────────────────────
 * Wolfs eigentlicher Punkt. Ein Teil der Folien setzt seinen Inhalt in einen
 * Kasten (Kategorie-Meister, Perfekte Runden), ein anderer laesst ihn frei im
 * Dunkeln stehen (Rekorde, Heute, Offene Rechnung). Dieselbe Rolle, zwei
 * Formen - und weil sie im Acht-Sekunden-Takt aufeinander folgen, sieht man
 * genau das.
 * Geprueft wird deshalb: hat JEDE Folie mindestens einen `statKasten(`?
 *
 * ⚠️ Was diese Pruefung NICHT sagt: ob eine Folie schoen ist. Dafuer braucht es
 * weiter das Auge, und zwar an einem Abend mit Verlauf.
 *
 * NUTZUNG:  node scripts/pausenfolien-pruefen.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ANSICHT = 'frontend/src/components/CozyQuizPausedView.tsx';
const SATZ = 'frontend/src/components/QQIcon.tsx';
const BILDER = 'frontend/public/icons';

const src = fs.readFileSync(ANSICHT, 'utf8');
const icons = fs.readFileSync(SATZ, 'utf8');

/** Welches Zeichen hat welches Bild? (Zeile: `'⚡': 'fx-lightning',`)
 *  ⚠️ NICHT auf `fx-` einschraenken. Es gibt Slugs ohne dieses Praefix
 *  (`react-laugh`, `brand-wolf`, `action-steal`) - die erste Fassung hat sie
 *  uebersehen und 😂 faelschlich als „kein Bild" gemeldet. */
const bild = new Map();
for (const m of icons.matchAll(/^\s*'([^']*?)':\s*'([a-z][a-z0-9-]+)',/gm)) {
  if (m[1].length <= 4 && !/^[a-z-]+$/.test(m[1])) bild.set(m[1], m[2]);
}

const ZEICHEN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F0FF}]\u{FE0F}?/gu;

// ── 1. Rohe Zeichen im gerenderten JSX ────────────────────────────────────
// Kommentare raus (dort stehen Zeichen als Beleg, das ist gewollt), und alles,
// was ordentlich durch den Satz laeuft, ebenfalls raus.
const zeilen = src.split('\n');
let inBlock = false;
const roh = [];
zeilen.forEach((zeile, i) => {
  let z = zeile;
  if (inBlock) { if (z.includes('*/')) { inBlock = false; z = z.slice(z.indexOf('*/') + 2); } else return; }
  if (z.includes('/*')) { const a = z.indexOf('/*'); inBlock = !z.includes('*/', a); z = z.slice(0, a) + (inBlock ? '' : z.slice(z.indexOf('*/', a) + 2)); }
  z = z.replace(/\/\/.*$/, '');
  // Ordentliche Wege: der Satz selbst, und die Datenfelder, die in ihn laufen.
  // ⚠️ `statTitle('🔥', ...)` ist KEIN Fehler: der Helfer schickt sein erstes
  // Argument durch `QQEmojiIcon`. Das steht seit 2026-08-22 so im Code. Wer das
  // hier mitmeldet, meldet dreizehn Fehlalarme und macht die Liste wertlos.
  z = z.replace(/<QQEmojiIcon\s+emoji="[^"]*"[^>]*>/g, '')
       .replace(/statTitle\(\s*'[^']*'/g, 'statTitle(')
       .replace(/\b(emoji|icon|zeichen)\s*:\s*'[^']*'/g, '');
  for (const m of z.matchAll(ZEICHEN)) roh.push({ zeile: i + 1, zeichen: m[0], text: zeile.trim().slice(0, 88) });
});

console.log('\n══ Rohe Systemzeichen im gerenderten JSX ═══════════════════════');
if (roh.length === 0) console.log('  ✓ Keins. Jedes Zeichen laeuft durch den Satz.');
for (const r of roh) {
  const slug = bild.get(r.zeichen);
  const hat = slug && fs.existsSync(path.join(BILDER, `${slug}.png`));
  console.log(`  ✗ Z.${String(r.zeile).padEnd(5)} ${(r.zeichen + '   ').padEnd(5)}` +
    (hat ? `Bild WAERE da: ${slug}` : 'und es gibt kein Bild dafuer'));
  console.log(`      ${r.text}`);
}

// ── 2. Steht der Inhalt jeder Folie in einem Kasten? ──────────────────────
// Von jedem `panels.push({ key: 'x', node: (` bis zur schliessenden Klammer
// auf gleicher Einrueckung - simpel, aber ausreichend: gesucht wird nur, ob
// `statKasten(` darin vorkommt.
const folien = [];
const re = /panels\.push\(\{\s*key:\s*'([^']+)'/g;
let m;
while ((m = re.exec(src))) {
  let tiefe = 0, i = m.index + m[0].length, gestartet = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '(') { tiefe++; gestartet = true; }
    else if (c === ')') { tiefe--; if (gestartet && tiefe <= 0) break; }
  }
  const koerper = src.slice(m.index, i);
  folien.push({ key: m[1], koerper });
}

// ⚠️ Nicht jede Folie ruft `statKasten` selbst auf. Sieben gehen ueber
// `teamLine`, ein Helfer, der IHRERSEITS einen Kasten baut. Die erste Fassung
// hat nur nach dem woertlichen Aufruf gesucht und deshalb acht Folien
// faelschlich rot gemeldet, obwohl sie den Kasten laengst hatten.
// Also erst nachsehen, welche Helfer einen Kasten liefern, und die dann
// mitzaehlen. Eine Ebene tief, mehr braucht es hier nicht.
const traeger = new Set(['statKasten']);
const decls = [...src.matchAll(/\n\s*const (\w+) = \(/g)];
decls.forEach((d, n) => {
  const bis = n + 1 < decls.length ? decls[n + 1].index : src.length;
  if (src.slice(d.index, bis).includes('statKasten(')) traeger.add(d[1]);
});
for (const f of folien) f.kasten = [...traeger].some(t => f.koerper.includes(`${t}(`));

// Die vier Ankommen-Karten sind eigene Plakate, keine Statistik-Folien; sie
// bauen ihre Flaeche selbst (Raster, Kacheln) und sind von Wolf so abgenommen.
const PLAKATE = new Set(['howItWorks', 'heuteAbend', 'schonDa', 'avatare']);
// Und drei Folien sind ganze Tabellen - der Kasten ist dort die Tabelle selbst.
// ⚠️ Die BESTENLISTE stand hier bis zum 2026-08-27 mit drin, und genau dadurch
// ist sie durchgerutscht: Wolf hat sie neben die Kategorie-Meister gelegt und
// sofort gesehen, dass sie nicht dazu passt. Eine Tabelle mit fuenf Zeilen bei
// fester Kartenhoehe ist keine Tabelle, das sind fuenf Zeilen mit Luecken. Sie
// zaehlt jetzt mit.
const TABELLEN = new Set(['progress', 'currentGrid', 'standings', 'megaFactions']);

const statistik = folien.filter(f => !PLAKATE.has(f.key) && !TABELLEN.has(f.key));
const ohne = statistik.filter(f => !f.kasten);

console.log(`\n══ Kastenform: ${statistik.length} Statistik-Folien ══════════════════════`);
for (const f of statistik) console.log(`  ${f.kasten ? '✓' : '✗'} ${f.key}`);

// ── 3. Steht die Markenfarbe auf einer Folie? ────────────────────────────────
// 2026-08-27, Wolf: „nur pinke schrift noch ersetzen" und danach „ne mach pink
// lieber raus".
//
// Brand-Pink ist die MARKE. Auf dem Beamer traegt sie der Schriftzug ganz oben,
// und sonst nichts. Als Akzent einer einzelnen Folie sagt sie nichts ueber
// deren Inhalt - sie sagt nur „CozyQuiz", und das weiss der Saal schon.
// Die Ersatzfarbe war jedes Mal die Farbe des ZEICHENS (Flamme orange, Blitz
// gelb, Schwerter blau, lachendes Gesicht gelb). Das ist eine Regel, kein
// Geschmack, und deshalb laesst sie sich nachlesen.
//
// ⚠️ Gesucht wird nur in dieser einen Datei. Anderswo ist Brand-Pink richtig:
// im Schriftzug, im Steuerpult, in der Marke selbst.
const pink = [...src.matchAll(/^(.*brandPink.*)$/gm)]
  .map(m => m[1].trim())
  .filter(z => !z.startsWith('//') && !z.startsWith('*'));

console.log('\n══ Markenfarbe auf den Folien ══════════════════════════════════');
if (!pink.length) console.log('  ✓ Kein Brand-Pink. Die Marke steht im Schriftzug, nicht in den Folien.');
for (const z of pink) console.log(`  ✗ ${z.slice(0, 96)}`);

console.log('\n══ Urteil ══════════════════════════════════════════════════════');
console.log(roh.length === 0
  ? '  ✓ Kein rohes Systemzeichen mehr.'
  : `  ✗ ${roh.length} rohe Zeichen - jeder Rechner malt sie anders.`);
console.log(ohne.length === 0
  ? '  ✓ Jede Statistik-Folie setzt ihren Inhalt in denselben Kasten.'
  : `  ✗ ${ohne.length} von ${statistik.length} Folien ohne Kasten: ${ohne.map(f => f.key).join(', ')}`);

console.log(pink.length === 0
  ? '  ✓ Die Markenfarbe steht nirgends als Folien-Akzent.'
  : `  ✗ ${pink.length} Stellen tragen noch Brand-Pink.`);

process.exit(roh.length === 0 && ohne.length === 0 && pink.length === 0 ? 0 : 1);
