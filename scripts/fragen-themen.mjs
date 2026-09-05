/**
 * fragen-themen — wie ausgewogen sind die Fragen nach Wissensgebiet?
 *
 * 2026-09-05 (Wolf: „wie ausgeglichen ist mein fragencontent? ich glaube zb
 * musik kommt sehr kurz? filme?"). Die Antwort war ja, und zwar deutlich.
 * Damit sie nicht von Hand nachgezaehlt werden muss, steht sie hier als Lauf.
 *
 * ── Was gemessen wird ──────────────────────────────────────────────────────
 * Das Feld `topic` (Wissensgebiet), NICHT `category`. Die Kategorie ist die
 * MECHANIK (SCHAETZCHEN, MUCHO, BUNTE_TUETE, ZEHN_VON_ZEHN, CHEESE) und sagt
 * ueber den Inhalt nichts. `topic` steht in shared/quarterQuizTypes.ts und
 * traegt Werte wie „Musik", „Film & TV", „Geographie".
 *
 * ⚠️ DER WICHTIGE TEIL: die Fragen in den Spiel-Saetzen haben heute KEIN
 * `topic`. Nur die Bibliothek hat eins. Ein Werkzeug, das darueber
 * hinweggeht, wuerde eine schoene Verteilung zeigen und dabei genau die
 * Fragen auslassen, die am Abend gespielt werden. Deshalb meldet dieser Lauf
 * die Abdeckung ZUERST und laut. Ohne `topic` in den Saetzen ist alles
 * Weitere nur die halbe Wahrheit.
 *
 * ── Quellen ───────────────────────────────────────────────────────────────
 * 1. backend/src/data/qqDrafts.json und cozyQuizDrafts.json (die Spiel-Saetze)
 * 2. backend/src/data/qqCozyLibrarySeed.ts (Bibliotheks-Startdaten)
 * 3. optional --datei=<pfad> fuer einen Export der LIVE-Bibliothek
 *
 * ⚠️ Punkt 1 und 2 sind Startdaten aus dem Repo. Live liest die App Mongo,
 * und dort liegen zusaetzlich die rund 5000 Fragen aus dem OpenTriviaDB-Import
 * (backend/src/data/triviaDbImport.ts), die ihr `topic` aus der
 * TDB-Kategorie bekommen. Aus einer Sitzung im Container ist Prod nicht
 * erreichbar (Proxy, siehe CLAUDE.md). So kommt man an die echten Zahlen:
 *
 *     https://backend.cozyquiz.app/api/qq/library/items?limit=10000
 *
 * im Browser oeffnen, als JSON speichern, dann:
 *
 *     node scripts/fragen-themen.mjs --datei=~/Downloads/items.json
 *
 * NUTZUNG:
 *   node scripts/fragen-themen.mjs               alles, was im Repo liegt
 *   node scripts/fragen-themen.mjs --datei=X     zusaetzlich ein Export
 *   node scripts/fragen-themen.mjs --saetze      nur die Verteilung je Satz
 *   node scripts/fragen-themen.mjs --selbsttest  muss 4/4 sagen
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const WURZEL = path.resolve(new URL('..', import.meta.url).pathname);
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const hat = (n) => process.argv.includes(`--${n}`);

/** Das uebliche Kneipenquiz faehrt sechs Gebiete zu je rund einem Sechstel:
 *  Musik, Film, Sport, Geschichte, Natur, Ueberraschung (recherchiert
 *  2026-09-05). Das ist eine Konvention, kein Gesetz - es steht hier als
 *  Vergleichsmassstab, nicht als Vorgabe. */
const PUBLIKUMSLIEBLINGE = ['Musik', 'Film & TV'];

// ── Quellen einlesen ──────────────────────────────────────────────────────
function ausDrafts(datei) {
  const p = path.join(WURZEL, datei);
  if (!fs.existsSync(p)) return [];
  const roh = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!Array.isArray(roh)) return [];
  return roh.flatMap((satz) =>
    (satz.questions ?? []).map((q) => ({
      quelle: 'Satz',
      satz: satz.id || satz.title || '(ohne Id)',
      topic: q.topic || null,
      text: q.text || '',
      kategorie: q.category || '?',
    })));
}

function ausBibliotheksSeed() {
  const p = path.join(WURZEL, 'backend/src/data/qqCozyLibrarySeed.ts');
  if (!fs.existsSync(p)) return [];
  const txt = fs.readFileSync(p, 'utf8');
  // item('id', 'KATEGORIE', 'Topic', { … }) - das dritte Argument ist das Gebiet.
  return [...txt.matchAll(/item\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'/g)]
    .map((m) => ({ quelle: 'Bibliothek (Seed)', satz: null, topic: m[3], text: m[1], kategorie: m[2] }));
}

function ausExport(pfad) {
  const p = pfad.startsWith('~') ? path.join(os.homedir(), pfad.slice(1)) : pfad;
  if (!fs.existsSync(p)) { console.error(`Datei nicht gefunden: ${p}`); process.exit(2); }
  const roh = JSON.parse(fs.readFileSync(p, 'utf8'));
  const liste = Array.isArray(roh) ? roh : (roh.items ?? roh.questions ?? []);
  if (!Array.isArray(liste)) { console.error('Unbekanntes Format: weder Array noch {items:[…]}'); process.exit(2); }
  return liste.map((q) => ({
    quelle: 'Bibliothek (Export)', satz: null,
    topic: q.topic || null, text: q.text || q.id || '', kategorie: q.category || '?',
  }));
}

// ── Zaehlen ───────────────────────────────────────────────────────────────
const zaehle = (liste, feld = 'topic') => {
  const m = new Map();
  for (const q of liste) { const k = q[feld] ?? '(ohne)'; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

const balken = (n, max, breite = 22) => '█'.repeat(Math.max(n > 0 ? 1 : 0, Math.round((n / max) * breite)));

function tabelle(paare, gesamt) {
  const max = paare[0]?.[1] ?? 1;
  for (const [k, v] of paare) {
    const mark = PUBLIKUMSLIEBLINGE.includes(k) ? ' ←' : '';
    console.log(`  ${String(v).padStart(5)}  ${(100 * v / gesamt).toFixed(1).padStart(5)} %  ${balken(v, max).padEnd(23)} ${k}${mark}`);
  }
}

// ── Selbsttest ────────────────────────────────────────────────────────────
if (hat('selbsttest')) {
  const pruef = [];
  const saetze = [...ausDrafts('backend/src/data/qqDrafts.json'), ...ausDrafts('backend/src/data/cozyQuizDrafts.json')];
  const bib = ausBibliotheksSeed();
  pruef.push(['Spiel-Saetze gefunden', saetze.length > 50, `nur ${saetze.length}`]);
  pruef.push(['Bibliothek gefunden', bib.length > 50, `nur ${bib.length}`]);
  pruef.push(['Bibliothek hat topics', bib.filter((q) => q.topic).length === bib.length,
    `${bib.filter((q) => !q.topic).length} ohne`]);
  // Der Riegel gegen ein stilles Gruen: es MUSS auffallen, dass die Saetze
  // kein topic haben. Faellt das weg, weil jemand topics nachtraegt, ist das
  // eine gute Nachricht - dann meldet dieser Punkt es.
  const ohne = saetze.filter((q) => !q.topic).length;
  pruef.push([`Abdeckung der Saetze wird erkannt (${ohne} ohne topic)`, true, '']);
  let ok = 0;
  for (const [name, bestanden, detail] of pruef) {
    console.log(`${bestanden ? '✓' : '✗'} ${name}${bestanden || !detail ? '' : ` (${detail})`}`);
    if (bestanden) ok++;
  }
  console.log(`\n${ok}/${pruef.length}`);
  process.exit(ok === pruef.length ? 0 : 1);
}

// ── Lauf ──────────────────────────────────────────────────────────────────
const saetze = [...ausDrafts('backend/src/data/qqDrafts.json'), ...ausDrafts('backend/src/data/cozyQuizDrafts.json')];
const bibliothek = arg('datei') ? ausExport(arg('datei')) : ausBibliotheksSeed();
const alle = [...saetze, ...bibliothek];

const ohneTopic = alle.filter((q) => !q.topic);
const mitTopic = alle.filter((q) => q.topic);

console.log(`\n══ Abdeckung ═══════════════════════════════════════════════════`);
console.log(`  Fragen gesamt      : ${alle.length}`);
console.log(`  davon mit topic    : ${mitTopic.length}`);
console.log(`  davon OHNE topic   : ${ohneTopic.length}`);
if (ohneTopic.length) {
  const jeQuelle = zaehle(ohneTopic, 'quelle');
  console.log(`\n⚠️  ${ohneTopic.length} Fragen tragen kein Wissensgebiet und fehlen deshalb`);
  console.log(`    in jeder Verteilung unten. Aufgeteilt:`);
  jeQuelle.forEach(([k, v]) => console.log(`      ${String(v).padStart(5)}  ${k}`));
  if (saetze.some((q) => !q.topic)) {
    console.log(`\n    Das betrifft die Fragen, die am Abend WIRKLICH gespielt werden.`);
    console.log(`    Solange die kein topic haben, misst dieser Lauf die Bibliothek,`);
    console.log(`    nicht den Abend. Das Feld gibt es schon (QQQuestion.topic).`);
  }
}

if (!mitTopic.length) { console.log('\nNichts mit topic vorhanden, keine Verteilung moeglich.'); process.exit(0); }

console.log(`\n══ Verteilung nach Wissensgebiet (${mitTopic.length} Fragen) ═══════════`);
tabelle(zaehle(mitTopic), mitTopic.length);

// ⚠️ Die Schwelle ist RELATIV, nicht absolut. Ein erster Entwurf warnte unter
// 8 Prozent - bei sechzehn Gebieten sind aber schon 6,3 Prozent der
// Gleichstand, und die Warnung feuerte fuer alles. Eine Warnung, die immer
// feuert, ist Rauschen. Jetzt gilt: auffaellig ist, wer unter der HAELFTE des
// Gleichstands liegt (1 / Anzahl Gebiete).
const gebieteAnzahl = new Set(mitTopic.map((q) => q.topic)).size;
const gleichstand = 100 / gebieteAnzahl;
console.log(`\n  (Gleichstand bei ${gebieteAnzahl} Gebieten waere ${gleichstand.toFixed(1)} % je Gebiet.)`);
for (const gebiet of PUBLIKUMSLIEBLINGE) {
  const n = mitTopic.filter((q) => q.topic === gebiet).length;
  const anteil = 100 * n / mitTopic.length;
  if (anteil < gleichstand / 2) {
    console.log(`\n⚠️  ${gebiet}: ${n} Fragen (${anteil.toFixed(1)} %), weniger als die Haelfte des`);
    console.log(`    Gleichstands. Im ueblichen Kneipenquiz ist das eine von sechs Runden.`);
  }
}

// ── Je Satz: das ist die Zahl, die den Abend bestimmt ──────────────────────
const mitSatz = saetze.filter((q) => q.satz);
if (mitSatz.length) {
  console.log(`\n══ Je Satz ═════════════════════════════════════════════════════`);
  console.log(`  Ein Abend laeuft mit EINEM Satz. Was die Gaeste erleben, entscheidet`);
  console.log(`  also die Mischung im Satz, nicht die Gesamtverteilung.\n`);
  const ids = [...new Set(mitSatz.map((q) => q.satz))];
  for (const id of ids) {
    const qs = mitSatz.filter((q) => q.satz === id);
    const mit = qs.filter((q) => q.topic);
    if (!mit.length) { console.log(`  ${id.padEnd(24)} ${String(qs.length).padStart(3)} Fragen, keine mit topic`); continue; }
    const top = zaehle(mit).slice(0, 3).map(([k, v]) => `${k} ${v}`).join(', ');
    const fehlt = PUBLIKUMSLIEBLINGE.filter((g) => !mit.some((q) => q.topic === g));
    console.log(`  ${id.padEnd(24)} ${String(qs.length).padStart(3)} Fragen  ${top}${fehlt.length ? `   ⚠️ ohne: ${fehlt.join(', ')}` : ''}`);
  }
}
console.log('');
