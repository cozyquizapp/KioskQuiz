/**
 * bilder-pruefen — liefert jeder Schau-mal-Titel wirklich ein Bild?
 *
 * 2026-09-05. Die CHEESE-Bilder holt der Server aus Wikipedia
 * (`enrichCheeseImagesInDraft` in server.ts). Das funktioniert nur, wenn der
 * hinterlegte Artikel existiert UND ein Bild im Kopf hat. Beides faellt sonst
 * STILL durch: die Folie bleibt leer, und es merkt jemand am Abend.
 *
 * ⚠️ WARUM ES DIESES SKRIPT GIBT: die zwanzig Titel der handverlesenen Saetze
 * sind aus dem Container heraus nicht pruefbar. Der Agent-Proxy weist
 * wikipedia.org mit 403 ab ("Host not in allowlist"). Ich habe sie also nach
 * bestem Wissen eingetragen, ohne einen einzigen davon zu verifizieren, und
 * das ist genau die Sorte Annahme, die diese Codebasis schon Zeit gekostet
 * hat. Wer das Skript ausserhalb des Containers laufen laesst, hat in einer
 * Minute die Liste der Titel, die daneben liegen.
 *
 * Es AENDERT NICHTS. Es fragt nur und zaehlt.
 *
 * NUTZUNG:
 *   node scripts/bilder-pruefen.mjs                 Repo-Saetze + Vorlagen
 *   node scripts/bilder-pruefen.mjs --datei=X       ein Export von /api/qq/drafts
 *   node scripts/bilder-pruefen.mjs --selbsttest    muss 3/3 sagen
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const WURZEL = path.resolve(new URL('..', import.meta.url).pathname);
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const hat = (n) => process.argv.includes(`--${n}`);

/** Ein Eintrag: eine CHEESE-Frage mit dem, was ueber ihr Bild bekannt ist. */
function ausDrafts(pfad, quelle) {
  const p = pfad.startsWith('~') ? path.join(os.homedir(), pfad.slice(1)) : path.join(WURZEL, pfad);
  if (!fs.existsSync(p)) return [];
  let roh;
  try { roh = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
  const liste = Array.isArray(roh) ? roh : (roh.drafts ?? roh.items ?? []);
  if (!Array.isArray(liste)) return [];
  return liste.flatMap((s) => (s.questions ?? [])
    .filter((q) => q.category === 'CHEESE')
    .map((q) => ({
      quelle, satz: s.id ?? s.title, id: q.id, antwort: q.answer ?? '',
      bild: q.image?.url ?? null, titel: q.wikipediaTitle ?? null,
    })));
}

/* Die Vorlagen liegen als TypeScript vor und werden hier nicht ausgefuehrt,
 * sondern gelesen. Ein Parser waere Aufwand fuer nichts: gebraucht werden nur
 * die wikipediaTitle-Zeilen und die Antwort darueber. */
function ausVorlage(datei, quelle) {
  const p = path.join(WURZEL, datei);
  if (!fs.existsSync(p)) return [];
  const txt = fs.readFileSync(p, 'utf8');
  const treffer = [];
  // Beide Anfuehrungszeichen, weil die handverlesenen Saetze erzeugt sind
  // (doppelte) und die Testsaetze von Hand geschrieben (einfache).
  const str = `(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`;
  const re = new RegExp(`answer:\\s*${str}[\\s\\S]{0,600}?wikipediaTitle:\\s*\\{([^}]*)\\}`, 'g');
  const feld = (rumpf, k) => new RegExp(`${k}:\\s*${str}`).exec(rumpf)?.slice(1).find(Boolean);
  for (const m of txt.matchAll(re)) {
    const antwort = (m[1] ?? m[2] ?? '').replace(/\\'/g, "'");
    treffer.push({ quelle, satz: path.basename(datei), id: '', antwort,
                   bild: null, titel: { de: feld(m[3], 'de'), en: feld(m[3], 'en') } });
  }
  return treffer;
}

async function holen(titel, sprache) {
  const url = `https://${sprache}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titel)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'CozyQuiz-BilderPruefer/1.0 (cozyquiz.app)' } });
    if (!res.ok) return { ok: false, grund: `HTTP ${res.status}` };
    const d = await res.json();
    const u = d?.originalimage?.source ?? d?.thumbnail?.source ?? null;
    return u ? { ok: true, url: u } : { ok: false, grund: 'Artikel ohne Bild' };
  } catch (e) {
    return { ok: false, grund: e.message };
  }
}

if (hat('selbsttest')) {
  const pruef = [];
  const v = ausVorlage('frontend/src/data/handverleseneSaetze.ts', 'Vorlage');
  pruef.push(['Vorlage gelesen', v.length === 20, `${v.length} statt 20 CHEESE-Titel`]);
  pruef.push(['Titel haben beide Sprachen', v.every((x) => x.titel?.de && x.titel?.en), 'mindestens einer unvollstaendig']);
  const hh = ausVorlage('backend/src/data/qqExtraTestDrafts.ts', 'Testsaetze');
  pruef.push(['Hamburg-Titel gefunden', hh.length >= 3, `nur ${hh.length}`]);
  let ok = 0;
  for (const [name, gut, warum] of pruef) {
    console.log(gut ? `✓ ${name}` : `✗ ${name} — ${warum}`);
    if (gut) ok++;
  }
  console.log(`\n${ok}/${pruef.length}`);
  process.exit(ok === pruef.length ? 0 : 1);
}

const eintraege = [
  ...(arg('datei') ? ausDrafts(arg('datei'), 'Export') : ausDrafts('backend/src/data/qqDrafts.json', 'Repo')),
  ...ausVorlage('frontend/src/data/handverleseneSaetze.ts', 'Vorlage'),
  ...ausVorlage('backend/src/data/qqExtraTestDrafts.ts', 'Testsaetze'),
];

if (!eintraege.length) {
  console.log('Keine CHEESE-Fragen gefunden.');
  process.exit(0);
}

console.log(`\n${eintraege.length} Schau-mal-Fragen gefunden. Frage Wikipedia ...\n`);
let hatBild = 0, geholt = 0, leer = 0;
const offen = [];
for (const e of eintraege) {
  if (e.bild) { hatBild++; continue; }
  if (!e.titel?.de && !e.titel?.en) {
    leer++; offen.push([e, 'kein Bild und kein Wikipedia-Titel']);
    continue;
  }
  let r = { ok: false, grund: 'kein Titel' };
  if (e.titel.de) r = await holen(e.titel.de, 'de');
  if (!r.ok && e.titel.en) r = await holen(e.titel.en, 'en');
  if (r.ok) { geholt++; console.log(`  ✓ ${String(e.antwort).slice(0, 42).padEnd(43)} ${r.url.split('/').pop().slice(0, 44)}`); }
  else { leer++; offen.push([e, r.grund]); }
}

console.log(`\n── Ergebnis ────────────────────────────────────────────`);
console.log(`  ${hatBild} haben schon ein eigenes Bild`);
console.log(`  ${geholt} bekommen eins aus Wikipedia`);
console.log(`  ${leer} bleiben LEER`);
if (offen.length) {
  console.log(`\n⚠️  Diese Folien bleiben leer, wenn niemand ein Bild hochlaedt:`);
  for (const [e, grund] of offen) {
    console.log(`      ${String(e.antwort).slice(0, 44).padEnd(45)} ${grund}`);
    if (e.titel) console.log(`         versucht: ${JSON.stringify(e.titel)}`);
  }
}
console.log('');
