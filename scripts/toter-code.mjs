/**
 * toter-code — welche Quelldateien erreicht der Abend nie?
 *
 * 2026-08-30 (Wolf: „ja mach das mit dem toten code (aber nur wenn es
 * ungefaehrlich ist) meine app ist zu 98% fertig, das waere jetzt fatal").
 *
 * ⚠️ DIESES WERKZEUG LOESCHT NICHTS. Es druckt eine Liste. Was davon
 * verschwindet, entscheidet Wolf je Datei, nicht ein Skript und nicht ich.
 *
 * ── Wozu ──────────────────────────────────────────────────────────────────
 * Der Pruefauftrag (docs/PRUEFAUFTRAG_CODE.md) laesst eine Sitzung jedes
 * `catch {}` und jedes `emit('qq:...')` im Frontend einsammeln. Dabei trifft
 * sie zwangslaeufig Dateien mit, die niemand rendert: die haben `catch {}` und
 * `emit` wie jede andere. Der Pruefer meldet dann Funde, zu denen es keinen
 * Weg gibt, sie rot zu machen, und pro Eintrag muss jemand von Hand nachsehen,
 * ob die Datei ueberhaupt lebt.
 *
 * Genau das ist mir am 30.08. im Kleinen passiert: ein Repro in
 * `QQQuestionTestPage` gebaut und erst danach gemerkt, dass die Route eine
 * Weiterleitung ist. Diese Liste ist die Vorwarnung, die mir gefehlt hat.
 *
 * ── Wie gemessen wird ─────────────────────────────────────────────────────
 * Nicht „wer wird nirgends erwaehnt" (Namen kommen in Kommentaren vor und
 * sind Teilzeichenketten voneinander: `TeamCard` steckt in
 * `ConnectionsTeamCard`). Sondern: von den Einstiegen aus den Import-Kanten
 * entlanglaufen und sehen, was uebrig bleibt.
 *
 * Einstiege sind die drei HTML-Dateien ueber `main.tsx`, `backend/src/server.ts`,
 * die Testdateien und alles, was `scripts/` direkt anzieht.
 *
 * Das Ergebnis kommt in zwei Sicherheitsstufen, weil die eine viel
 * belastbarer ist als die andere:
 *
 *   STUFE 1  Niemand importiert die Datei. Nirgends im Repo, auch nicht aus
 *            einer anderen toten Datei. Hier kann sich das Werkzeug nur irren,
 *            wenn der Import ueber einen Pfad laeuft, den es nicht aufloest.
 *
 *   STUFE 2  Die Datei wird importiert, aber nur von Dateien der Stufe 1/2.
 *            Ein ganzer abgehaengter Ast. Hier haengt das Urteil an der
 *            Wurzel: irrt sich Stufe 1 bei einer Datei, lebt der Ast darunter.
 *            Deshalb steht bei jeder Datei, WER sie noch zieht.
 *
 * ── Was es NICHT sieht, und das ist der wichtigere Teil ───────────────────
 * * Importe, die aus einer Zeichenkette zusammengebaut werden
 *   (`import('./pages/' + name)`). Es gibt heute keine, aber wer eine baut,
 *   macht Dateien fuer dieses Werkzeug unsichtbar.
 * * Dateien, die ueber `public/` oder eine URL geladen werden statt ueber
 *   einen Import.
 * * Erreichbar heisst NICHT benutzt. Eine Seite kann importiert und geroutet
 *   sein und trotzdem seit Monaten niemand aufrufen. Umgekehrt gilt der
 *   Befund aber: was hier steht, kann der Abend nicht erreichen.
 * * Es urteilt nicht ueber Absicht. Schlafende Features (Comeback, Imposter,
 *   4 gewinnt, Bluff) liegen absichtlich da und sind meist erreichbar, also
 *   tauchen sie hier gar nicht erst auf. Falls doch: CLAUDE.md sagt, sie
 *   bleiben.
 *
 * NUTZUNG:
 *   node scripts/toter-code.mjs             Liste, nach Zeilen sortiert
 *   node scripts/toter-code.mjs --kurz      nur die Zahlen
 *   node scripts/toter-code.mjs --pfade     nur Pfade, eine je Zeile (zum Weiterreichen)
 *   node scripts/toter-code.mjs --selbsttest   ERST DAS, dann der Rest
 *
 * ⚠️ Der Selbsttest muss 3/3 sagen, BEVOR die Liste etwas bedeutet. Ein
 * Werkzeug, das Importe nicht aufloest, meldet die halbe App als tot und
 * sieht dabei genauso zuversichtlich aus wie ein richtiges. Dieselbe Regel
 * wie bei handy-gleichlauf.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const WURZEL = path.resolve(new URL('..', import.meta.url).pathname);
const NUR_ZAHLEN = process.argv.includes('--kurz');
const NUR_PFADE = process.argv.includes('--pfade');
const SELBSTTEST = process.argv.includes('--selbsttest');

const rel = (p) => path.relative(WURZEL, p).split(path.sep).join('/');

// ── 1. Alle Quelldateien einsammeln ───────────────────────────────────────
const QUELL_ORDNER = ['frontend/src', 'backend/src', 'shared'];
const ENDUNGEN = ['.ts', '.tsx', '.mts', '.cts'];

function sammle(ordner, raus = []) {
  const voll = path.join(WURZEL, ordner);
  if (!fs.existsSync(voll)) return raus;
  for (const e of fs.readdirSync(voll, { withFileTypes: true })) {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) { sammle(p, raus); continue; }
    if (ENDUNGEN.includes(path.extname(e.name)) && !e.name.endsWith('.d.ts')) raus.push(p);
  }
  return raus;
}
const alle = QUELL_ORDNER.flatMap((o) => sammle(o));

// ── 2. Import-Ziele aus einer Datei lesen ─────────────────────────────────
// Statisch, re-export, dynamisch und require. Bewusst per Regex: ein echter
// Parser waere genauer, aber die Mehrausbeute liegt bei Formen, die es hier
// nicht gibt, und eine Abhaengigkeit mehr will dieses Repo nicht.
const MUSTER = [
  /\bfrom\s*['"]([^'"]+)['"]/g,          // import x from '…' / export … from '…'
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // import('…')
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\s*['"]([^'"]+)['"]/g,        // import '…' (Nebenwirkung, z.B. CSS)
];

function zieleVon(datei) {
  let text;
  try { text = fs.readFileSync(path.join(WURZEL, datei), 'utf8'); } catch { return []; }
  const roh = new Set();
  for (const m of MUSTER) { for (const t of text.matchAll(m)) roh.add(t[1]); }
  return [...roh];
}

// ── 3. Einen Import-Pfad auf eine echte Datei aufloesen ───────────────────
function aufloesen(spez, vonDatei) {
  let basis;
  if (spez.startsWith('@shared/')) basis = path.join(WURZEL, 'shared', spez.slice('@shared/'.length));
  else if (spez.startsWith('.')) basis = path.resolve(WURZEL, path.dirname(vonDatei), spez);
  else return null; // Paket aus node_modules

  const kandidaten = [
    basis,
    ...ENDUNGEN.map((e) => basis + e),
    ...ENDUNGEN.map((e) => path.join(basis, 'index' + e)),
  ];
  for (const k of kandidaten) {
    try { if (fs.statSync(k).isFile()) return rel(k); } catch { /* weiter */ }
  }
  return null;
}

// ── 4. Einstiege bestimmen ────────────────────────────────────────────────
const einstiege = new Set();

// 4a) Die HTML-Dateien des Frontends und ihre Module.
for (const html of fs.readdirSync(path.join(WURZEL, 'frontend')).filter((f) => f.endsWith('.html'))) {
  const text = fs.readFileSync(path.join(WURZEL, 'frontend', html), 'utf8');
  for (const m of text.matchAll(/src=["']\/([^"']+)["']/g)) {
    const p = 'frontend/' + m[1];
    if (fs.existsSync(path.join(WURZEL, p))) einstiege.add(p);
  }
}
// 4b) Backend-Start laut package.json, plus der uebliche Verdaechtige.
for (const p of ['backend/src/server.ts', 'backend/src/index.ts']) {
  if (fs.existsSync(path.join(WURZEL, p))) einstiege.add(p);
}
// 4c) Tests und Werkzeuge zaehlen als Nutzer: was nur ein Test zieht, ist
//     nicht tot, sondern nur nicht im Abend.
const externe = [];
for (const ordner of ['tests', 'scripts']) {
  const voll = path.join(WURZEL, ordner);
  if (!fs.existsSync(voll)) continue;
  for (const f of fs.readdirSync(voll)) {
    const p = ordner + '/' + f;
    if (fs.statSync(path.join(WURZEL, p)).isDirectory()) continue;
    if (!/\.(ts|tsx|mjs|js|cjs)$/.test(f)) continue;
    externe.push(p);
  }
}
for (const e of externe) {
  for (const spez of zieleVon(e)) {
    const ziel = aufloesen(spez, e);
    if (ziel && alle.includes(ziel)) einstiege.add(ziel);
  }
}

// ── 5. Von den Einstiegen aus laufen ──────────────────────────────────────
const kanten = new Map();   // Datei -> [Ziele]
for (const d of alle) {
  kanten.set(d, zieleVon(d).map((s) => aufloesen(s, d)).filter((z) => z && alle.includes(z)));
}
const erreichbar = new Set();
const rest = [...einstiege];
while (rest.length) {
  const d = rest.pop();
  if (erreichbar.has(d)) continue;
  erreichbar.add(d);
  for (const z of kanten.get(d) ?? []) if (!erreichbar.has(z)) rest.push(z);
}

// ── 6. Tote nach Stufe sortieren ──────────────────────────────────────────
const tot = alle.filter((d) => !erreichbar.has(d));
// Wer zieht wen? (nur unter den Toten interessant)
const zieher = new Map(tot.map((d) => [d, []]));
for (const [von, zieleListe] of kanten) {
  for (const z of zieleListe) if (zieher.has(z)) zieher.get(z).push(von);
}
const stufe1 = tot.filter((d) => zieher.get(d).length === 0);
const stufe2 = tot.filter((d) => zieher.get(d).length > 0);

// ── 6b. Selbsttest ────────────────────────────────────────────────────────
// Drei Pruefungen gegen bekannte Wahrheit. Keine davon glaubt dem Werkzeug.
if (SELBSTTEST) {
  const pruefungen = [];

  // 1) Die Dateien, die JEDEN Abend laufen, muessen erreichbar sein.
  const abendlich = [
    'frontend/src/main.tsx', 'frontend/src/App.tsx',
    'frontend/src/pages/QQBeamerPage.tsx', 'frontend/src/pages/QQTeamPage.tsx',
    'frontend/src/pages/QQModeratorPage.tsx',
    'frontend/src/components/CozyQuizQuestionView.tsx',
    'frontend/src/hooks/useQQSocket.ts',
    'backend/src/server.ts', 'backend/src/quarterQuiz/qqRooms.ts',
    'backend/src/quarterQuiz/qqSocketHandlers.ts',
    'shared/quarterQuizTypes.ts',
  ].filter((d) => alle.includes(d));
  const fehlend = abendlich.filter((d) => !erreichbar.has(d));
  pruefungen.push(['Die Dateien des Abends sind erreichbar',
    fehlend.length === 0, fehlend.join(', ')]);

  // 2) Keine tote Datei darf von einer LEBENDEN gezogen werden. Waere das so,
  //    haette der Lauf eine Kante verloren.
  const totSet = new Set(tot);
  const widerspruch = [];
  for (const [von, zieleListe] of kanten) {
    if (totSet.has(von)) continue;
    for (const z of zieleListe) if (totSet.has(z)) widerspruch.push(`${von} -> ${z}`);
  }
  pruefungen.push(['Keine lebende Datei zieht eine tote',
    widerspruch.length === 0, widerspruch.slice(0, 3).join(' | ')]);

  // 3) Das Aufloesen funktioniert ueberhaupt. Ohne diese Pruefung wuerde ein
  //    kaputter Resolver „alles tot" melden und sehr ueberzeugt wirken.
  const kantenZahl = [...kanten.values()].reduce((a, l) => a + l.length, 0);
  pruefungen.push([`Import-Kanten aufgeloest (${kantenZahl})`,
    kantenZahl > alle.length, 'zu wenige Kanten, Resolver verdaechtig']);

  let ok = 0;
  for (const [name, bestanden, detail] of pruefungen) {
    console.log(`${bestanden ? '✓' : '✗'} ${name}${bestanden || !detail ? '' : `\n    ${detail}`}`);
    if (bestanden) ok++;
  }
  console.log(`\n${ok}/${pruefungen.length}`);
  process.exit(ok === pruefungen.length ? 0 : 1);
}

const zeilen = (d) => fs.readFileSync(path.join(WURZEL, d), 'utf8').split('\n').length;

// ── Das Datum, und warum es zweimal luegen kann ───────────────────────────
// 1) Ein flacher Klon (Container, CI) hat die Historie abgeschnitten. Dann
//    tragen ALLE Dateien dasselbe Datum, naemlich das des aeltesten
//    vorhandenen Commits. Das sieht aus wie eine Erkenntnis und ist keine.
// 2) Sammel-Commits. Am 2026-08-28 hat die Schrift-Umstellung 1857 Dateien
//    angefasst. Danach steht dieses Datum auf fast allem.
// Beides wird hier abgefangen: flach -> gar kein Datum, sonst -> Commits mit
// mehr als 500 Dateien ueberspringen.
const FLACH = fs.existsSync(path.join(WURZEL, '.git', 'shallow'));
const SAMMEL_AB = 500;
const sammelCommits = new Set();
if (!FLACH) {
  try {
    const log = execSync('git log --format=%H --shortstat', { cwd: WURZEL }).toString().split('\n');
    let letzter = null;
    for (const z of log) {
      if (/^[0-9a-f]{40}$/.test(z.trim())) { letzter = z.trim(); continue; }
      const m = z.match(/(\d+) files? changed/);
      if (m && letzter && Number(m[1]) > SAMMEL_AB) sammelCommits.add(letzter);
    }
  } catch { /* ohne Historie eben ohne */ }
}
const letzterCommit = (d) => {
  if (FLACH) return '  flach  ';
  try {
    const zeilenLog = execSync(`git log -12 --format='%H %ad' --date=short -- "${d}"`, { cwd: WURZEL })
      .toString().trim().split('\n').filter(Boolean);
    for (const z of zeilenLog) {
      const [h, datum] = z.replace(/'/g, '').split(' ');
      if (!sammelCommits.has(h)) return datum;
    }
    return zeilenLog.length ? '(nur Sammel)' : '?';
  } catch { return '?'; }
};

const summe = (l) => l.reduce((a, d) => a + zeilen(d), 0);
const alleZeilen = summe(alle);

if (NUR_PFADE) { tot.forEach((d) => console.log(d)); process.exit(0); }

if (FLACH) console.log('\n⚠️  Flacher Klon: die Historie ist abgeschnitten, deshalb steht bei jeder\n    Datei „flach" statt eines Datums. Fuer die Datumsspalte einen vollen\n    Klon nehmen (git fetch --unshallow). Die Liste selbst stimmt trotzdem,\n    sie haengt nicht an der Historie.');
console.log(`\nQuelldateien gesamt : ${alle.length} (${alleZeilen} Zeilen)`);
console.log(`davon erreichbar    : ${erreichbar.size}`);
console.log(`nicht erreichbar    : ${tot.length} (${summe(tot)} Zeilen, ${(100 * summe(tot) / alleZeilen).toFixed(1)} %)`);
console.log(`  Stufe 1 (niemand importiert sie): ${stufe1.length} Dateien, ${summe(stufe1)} Zeilen`);
console.log(`  Stufe 2 (nur von Totem gezogen) : ${stufe2.length} Dateien, ${summe(stufe2)} Zeilen`);

if (NUR_ZAHLEN) process.exit(0);

const tabelle = (titel, liste, mitZieher) => {
  if (!liste.length) return;
  console.log(`\n── ${titel} ${'─'.repeat(Math.max(0, 66 - titel.length))}`);
  for (const d of [...liste].sort((a, b) => zeilen(b) - zeilen(a))) {
    console.log(`${String(zeilen(d)).padStart(5)}  ${letzterCommit(d)}  ${d}`);
    if (mitZieher) console.log(`${' '.repeat(19)}gezogen von: ${zieher.get(d).join(', ')}`);
  }
};
tabelle('STUFE 1 — niemand importiert sie', stufe1, false);
tabelle('STUFE 2 — nur von toten Dateien gezogen', stufe2, true);

console.log(`
⚠️  Diese Liste ist eine Entscheidungsvorlage, kein Loeschbefehl.
    Vor dem Entfernen einer Datei je Eintrag pruefen: gibt es einen Grund,
    warum sie liegen bleibt (schlafendes Feature, Register in
    shared/quarterQuizTypes.ts, geplante Rueckkehr)? CLAUDE.md kennt drei
    Zustaende: aktiv, schlafend, ausgebaut. Dieses Werkzeug kennt nur zwei.
`);
