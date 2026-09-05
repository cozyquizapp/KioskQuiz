/**
 * satz-pruefer — taugt ein Fragensatz fuer einen Abend?
 *
 * 2026-09-05 (Wolf: „beim einbau brauchen wir ueberpruefung: haben wir genug
 * verschiedene kategorien und ist alles korrekt").
 *
 * Prueft fuenf Dinge, in dieser Reihenfolge, weil sie unterschiedlich weh tun:
 *   1. MECHANIK    Faellt der Satz beim Spielstart um? (Das ist der schlimmste
 *                  Fall: es faellt erst auf, wenn die Gaeste schon dasitzen.)
 *   2. STRUKTUR    Fragenzahl und die feste Reihenfolge je Runde.
 *   3. SPRACHE     Alles zweisprachig? (Harte Regel aus CLAUDE.md.)
 *   4. GEBIETE     Genug verschiedene, und sind Musik und Film dabei?
 *   5. ALTERUNG    Antworten, die von selbst falsch werden.
 * Dazu quer ueber alle Saetze: dieselbe Frage zweimal?
 *
 * ⚠️ WAS ER NICHT KANN: pruefen, ob eine Antwort inhaltlich STIMMT. „206
 * Knochen" haelt er fuer richtig, weil es formal in Ordnung ist. Fachliche
 * Richtigkeit bleibt Handarbeit, und dieser Lauf sagt das lieber deutlich, als
 * ein gruenes Haekchen zu zeigen, das man falsch versteht.
 *
 * ── Der Riegel gegen Auseinanderlaufen ────────────────────────────────────
 * Die Mechanik-Regeln stehen im Server (qqRooms.ts, in `qqStartGame`) und sind
 * dort nicht einzeln aufrufbar. Dieses Skript kennt dieselben Regeln, und
 * damit die beiden nicht auseinanderlaufen, zaehlt der Selbsttest die
 * INVALID_QUESTION-Stellen im Server und meldet, wenn dort eine dazukommt,
 * die hier fehlt. Eine Kopie, die von ihrem Original nichts weiss, ist genau
 * die Sorte Werkzeug, die irgendwann gruen sagt und danebenliegt.
 *
 * NUTZUNG:
 *   node scripts/satz-pruefer.mjs                 alle Saetze im Repo
 *   node scripts/satz-pruefer.mjs --datei=X       ein Export (/api/qq/drafts)
 *   node scripts/satz-pruefer.mjs --selbsttest    muss 4/4 sagen
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const WURZEL = path.resolve(new URL('..', import.meta.url).pathname);
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const hat = (n) => process.argv.includes(`--${n}`);

const MECHANIK_REIHENFOLGE = ['SCHAETZCHEN', 'MUCHO', 'BUNTE_TUETE', 'ZEHN_VON_ZEHN', 'CHEESE'];
const PUBLIKUMSLIEBLINGE = ['Musik', 'Film & TV'];
/** Formulierungen, die eine Antwort mit der Zeit falsch werden lassen. */
const ALTERT = /\bstand\s*20\d\d\b|\bderzeit\b|\baktuell\b|\bmomentan\b|\bheute\b/i;

// ── Mechanik-Regeln, gespiegelt aus qqRooms.ts (qqStartGame) ──────────────
function mechanikFehler(q, nr) {
  const tag = `Frage ${nr} (${q.category})`;
  const f = [];
  if (q.category === 'MUCHO') {
    if (!Array.isArray(q.options) || q.options.length !== 4) f.push(`${tag}: braucht genau 4 Optionen`);
    if (q.correctOptionIndex == null || q.correctOptionIndex < 0 || q.correctOptionIndex > 3)
      f.push(`${tag}: correctOptionIndex fehlt oder liegt ausserhalb 0-3`);
  } else if (q.category === 'ZEHN_VON_ZEHN') {
    if (!Array.isArray(q.options) || q.options.length < 2) f.push(`${tag}: braucht mindestens 2 Optionen`);
    else if (q.correctOptionIndex == null || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length)
      f.push(`${tag}: correctOptionIndex fehlt oder liegt ausserhalb 0-${q.options.length - 1}`);
  } else if (q.category === 'SCHAETZCHEN') {
    if (q.targetValue == null || Number.isNaN(Number(q.targetValue))) f.push(`${tag}: braucht einen numerischen targetValue`);
  } else if (q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') {
    const ans = (q.answer ?? '').trim();
    if (!ans || !ans.split(/[,;]/).some((t) => t.trim().length > 0))
      f.push(`${tag}: Hot Potato braucht eine Antwortliste (Komma oder Semikolon)`);
  }
  return f;
}

// ── Quellen ───────────────────────────────────────────────────────────────
function saetzeLesen() {
  const pfad = arg('datei');
  if (pfad) {
    const p = pfad.startsWith('~') ? path.join(os.homedir(), pfad.slice(1)) : pfad;
    if (!fs.existsSync(p)) { console.error(`Datei nicht gefunden: ${p}`); process.exit(2); }
    const roh = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(roh) ? roh : (roh.drafts ?? roh.items ?? []);
  }
  const p = path.join(WURZEL, 'backend/src/data/qqDrafts.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
}

// ── Selbsttest ────────────────────────────────────────────────────────────
if (hat('selbsttest')) {
  const pruef = [];
  const saetze = saetzeLesen();
  pruef.push(['Saetze gefunden', saetze.length > 0, `${saetze.length}`]);

  // Drift-Riegel: kennt dieses Skript alle Server-Regeln?
  const server = path.join(WURZEL, 'backend/src/quarterQuiz/qqRooms.ts');
  let serverRegeln = 0;
  if (fs.existsSync(server)) {
    const txt = fs.readFileSync(server, 'utf8');
    const block = txt.slice(txt.indexOf('Validate questions'), txt.indexOf('Shuffle innerhalb der Runde'));
    serverRegeln = (block.match(/INVALID_QUESTION/g) ?? []).length;
  }
  const HIER = 6;  // so viele Regeln spiegelt mechanikFehler()
  pruef.push([`Mechanik-Regeln im Gleichstand (Server ${serverRegeln}, hier ${HIER})`,
    serverRegeln === HIER, 'im Server ist eine Regel dazugekommen oder weggefallen']);

  // Der Pruefer muss einen kaputten Satz auch wirklich rot melden.
  const kaputt = { category: 'MUCHO', options: ['a', 'b'], correctOptionIndex: 9 };
  pruef.push(['Erkennt einen kaputten MUCHO', mechanikFehler(kaputt, 1).length === 2, '']);
  const heil = { category: 'MUCHO', options: ['a', 'b', 'c', 'd'], correctOptionIndex: 2 };
  pruef.push(['Laesst einen heilen MUCHO in Ruhe', mechanikFehler(heil, 1).length === 0, '']);

  let ok = 0;
  for (const [name, best, detail] of pruef) {
    console.log(`${best ? '✓' : '✗'} ${name}${best || !detail ? '' : `\n    ${detail}`}`);
    if (best) ok++;
  }
  console.log(`\n${ok}/${pruef.length}`);
  process.exit(ok === pruef.length ? 0 : 1);
}

// ── Lauf ──────────────────────────────────────────────────────────────────
const saetze = saetzeLesen();
let fehlerGesamt = 0, warnungGesamt = 0;

for (const s of saetze) {
  const qs = s.questions ?? [];
  const fehler = [], warn = [];

  // 1. Mechanik
  qs.forEach((q, i) => fehler.push(...mechanikFehler(q, i + 1)));

  // 2. Struktur
  if (qs.length % 5 !== 0) fehler.push(`Fragenzahl ${qs.length} ist kein Vielfaches von 5 (eine Runde sind 5)`);
  qs.forEach((q, i) => {
    const soll = MECHANIK_REIHENFOLGE[q.questionIndexInPhase ?? (i % 5)];
    if (soll && q.category !== soll)
      warn.push(`Frage ${i + 1}: steht auf Platz ${(q.questionIndexInPhase ?? i % 5) + 1}, dort erwartet die Buehne ${soll}, hier steht ${q.category}`);
  });

  // 3. Zweisprachigkeit
  const ohneEn = qs.filter((q) => !(q.textEn ?? '').trim()).length;
  if (ohneEn) fehler.push(`${ohneEn} Fragen ohne englischen Text (harte Regel: alles zweisprachig)`);

  // 4. Gebiete
  const themen = qs.map((q) => q.topic).filter(Boolean);
  const zaehl = {};
  themen.forEach((t) => { zaehl[t] = (zaehl[t] ?? 0) + 1; });
  const anzahl = Object.keys(zaehl).length;
  if (themen.length < qs.length) warn.push(`${qs.length - themen.length} Fragen ohne Wissensgebiet (topic)`);
  if (anzahl && anzahl < 6) warn.push(`nur ${anzahl} verschiedene Gebiete (bei 20 Fragen sind 6 bis 8 gesund)`);
  const groesstes = Object.entries(zaehl).sort((a, b) => b[1] - a[1])[0];
  if (groesstes && qs.length && groesstes[1] / qs.length > 0.3)
    warn.push(`„${groesstes[0]}" stellt ${groesstes[1]} von ${qs.length} Fragen, das dominiert den Abend`);
  for (const g of PUBLIKUMSLIEBLINGE) if (anzahl && !zaehl[g]) warn.push(`kein ${g} im ganzen Satz`);

  // 5. Alterung
  qs.forEach((q, i) => {
    if (ALTERT.test(q.text ?? '')) warn.push(`Frage ${i + 1} altert: „${(q.text ?? '').slice(0, 52)}…"`);
  });

  const zeichen = fehler.length ? '✗' : (warn.length ? '!' : '✓');
  console.log(`\n${zeichen} ${s.id ?? '(ohne Id)'}  ${qs.length} Fragen  ${s.title ?? ''}`);
  fehler.forEach((f) => console.log(`    FEHLER  ${f}`));
  warn.forEach((w) => console.log(`    Hinweis ${w}`));
  if (!fehler.length && !warn.length) console.log('    nichts zu beanstanden');
  fehlerGesamt += fehler.length; warnungGesamt += warn.length;
}

// ── Quer ueber alle Saetze: dieselbe Frage zweimal? ───────────────────────
const gesehen = new Map();
for (const s of saetze) for (const q of s.questions ?? []) {
  const t = (q.text ?? '').trim().toLowerCase();
  if (!t) continue;
  if (!gesehen.has(t)) gesehen.set(t, []);
  gesehen.get(t).push(s.id);
}
const doppelt = [...gesehen.entries()].filter(([, wo]) => wo.length > 1);
if (doppelt.length) {
  console.log(`\n── Dieselbe Frage in mehreren Saetzen ──────────────────────────`);
  doppelt.forEach(([t, wo]) => console.log(`  „${t.slice(0, 58)}"\n      in ${wo.join(', ')}`));
  warnungGesamt += doppelt.length;
}

console.log(`\n${fehlerGesamt} Fehler, ${warnungGesamt} Hinweise.`);
console.log(`⚠️  Ob eine Antwort inhaltlich STIMMT, prueft dieser Lauf NICHT. Das bleibt Handarbeit.`);
process.exit(fehlerGesamt ? 1 : 0);
