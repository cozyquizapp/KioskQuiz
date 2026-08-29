/**
 * formate-vergleich.mjs — wo genau laufen CozyQuiz und CrowdQuiz auseinander?
 *
 * 2026-08-29, Wolf: „wichtig waere vlt einmal die UNTERSCHIEDE zwischen
 * cozyquiz und crowdquiz zu identifizieren, anhandessen kann entschieden
 * werden, was gewollt und was nicht ist".
 *
 * ── Warum ein Werkzeug und keine Liste von Hand ───────────────────────────
 * Eine handgeschriebene Liste haette denselben Fehler wie docs/DESIGNSPRACHE.md
 * vor ihrer Automatisierung: sie laeuft dem Code hinterher und wird trotzdem
 * geglaubt. Genau daran bin ich am 29.08. schon einmal gescheitert - das
 * Register der Bunte-Tuete-Spiele sagte „hotPotato ist aktiv" und meinte damit
 * stillschweigend „in beiden Formaten", waehrend das Backend sie seit dem
 * 07.07. aus CrowdQuiz herauswirft. Verhalten richtig, Auskunft falsch, und
 * ich habe der Auskunft geglaubt und Wolf eine Luecke gemeldet, die es nicht
 * gab.
 *
 * Also: die Unterschiede werden GELESEN, nicht erinnert. Quelle sind die
 * Stellen im Code, an denen das Format ueberhaupt eine Rolle spielt.
 *
 * ── Was als Unterschied zaehlt ────────────────────────────────────────────
 * Nur Zeilen, an denen sich das VERHALTEN gabelt: eine Bedingung, ein
 * Fragezeichen-Operator, ein Filter, ein anderer Rueckgabewert. Nicht
 * gezaehlt werden Typdeklarationen, Vorbelegungen, Importe, das Durchreichen
 * durch Funktionssignaturen und `buildQQStateUpdate`. Das sind rund zwei
 * Drittel aller Fundstellen und sie sagen nichts darueber, was am Abend
 * anders aussieht.
 *
 * ⚠️ EHRLICHE GRENZE, und sie ist wichtig fuer die Entscheidung: dieses
 * Werkzeug findet Unterschiede, die im Code als Weiche STEHEN. Es findet
 * NICHT die Unterschiede, die daraus entstehen, dass dieselbe Ansicht mit
 * vierzig statt acht Teams laeuft (Zeilenhoehen, Umbrueche, Gedraenge). Und
 * es findet nicht, was in CrowdQuiz FEHLT, ohne dass es jemand abgeschaltet
 * hat. Fuer beides gibt es die Bild-Werkzeuge: crowd-abgleich.mjs und
 * crowd-zeremonie.mjs.
 *
 * Aufruf:  node scripts/formate-vergleich.mjs          # schreibt docs/FORMATE.md
 *          node scripts/formate-vergleich.mjs --zeigen # nur auf die Konsole
 */
import fs from 'node:fs';
import path from 'node:path';

const WURZEL = path.resolve(new URL('..', import.meta.url).pathname);

/**
 * Die Woerter, an denen sich das Format zeigt.
 *
 * ⚠️ KEIN `\b` vor den Grossbuchstaben-Namen. Der Unterstrich ist ein
 * Wortzeichen, also gibt es zwischen `QQ_BUNTE_TUETE_` und `COZY_ONLY` gar
 * keine Wortgrenze - `/\bCOZY_ONLY\b/` traf die Konstante nie. Der erste Lauf
 * am 29.08. meldete sie deshalb als nicht vorhanden, obwohl ich sie eine
 * Stunde vorher selbst geschrieben hatte.
 */
const MARKER = /(largeGroupMode|nestedTeams|qqIsMega|qqArenaType|QQ_MAX_TEAMS_LARGE|ARENA_ONLY|COZY_ONLY|megaAwards|qqMegaFaction|QQ_MEGA_FACTIONS|LargeGroupGameOverView)/;

/**
 * Lokale Namen fuer dasselbe Flag. Fast jede Ansicht schreibt sich das Format
 * einmal in eine eigene Variable (`const largeGroup = !!s.largeGroupMode`,
 * `const arena = ...`, `const mega = ...`) und fragt danach nur noch die ab.
 * Wer nur nach `largeGroupMode` sucht, sieht von einer Ansicht genau eine
 * Zeile und keine einzige ihrer Weichen.
 *
 * Konkret uebersehen am 29.08.: die Fraktionen-Folie im Ankommen haengt an
 * `if (largeGroup)`, und genau die war Wolfs Fund vom Vortag. Ein Werkzeug,
 * das die wichtigste Weiche des Tages nicht sieht, taugt nichts.
 */
function aliase(quelle) {
  const namen = new Set();
  const re = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*)/g;
  let m;
  while ((m = re.exec(quelle))) {
    if (MARKER.test(m[2])) namen.add(m[1]);
  }
  return namen;
}

/**
 * Gebiete. Die Reihenfolge ist die des Dokuments, und sie ist nicht zufaellig:
 * erst die Regeln, die das SPIEL aendern (dort liegt „gewollt oder nicht"),
 * dann die Ansichten, dann das Beiwerk.
 */
const GEBIETE = [
  { name: 'Regeln des Spiels (Server)', wo: /^backend\/src\/quarterQuiz\/qqRooms\.ts$/ },
  { name: 'Ereignisse (Server)',        wo: /^backend\/src\/quarterQuiz\/qqSocketHandlers\.ts$/ },
  { name: 'Register und Konstanten',    wo: /^shared\// },
  { name: 'Buehne',                     wo: /^frontend\/src\/(pages\/QQBeamerPage|components\/(?!CozyQuizTeam))/ },
  { name: 'Handy',                      wo: /^frontend\/src\/(pages\/QQTeamPage|components\/CozyQuizTeam)/ },
  { name: 'Steuerpult und Wizard',      wo: /^frontend\/src\/pages\/(QQModeratorPage|QQSetupFlow|QQModPortablePage)/ },
  { name: 'Sonstiges',                  wo: /./ },
];

/** Kein Unterschied, nur Verkabelung. */
const IST_VERKABELUNG = (z) => {
  const t = z.trim();
  if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return true;
  if (/^import\b/.test(t) || /^\}\s*from\b/.test(t)) return true;
  // Typdeklaration oder Feld einer Schnittstelle: `largeGroupMode: boolean;`
  if (/^\w+\??:\s*(boolean|number|string)/.test(t)) return true;
  // Vorbelegung beim Anlegen des Raums und Durchreichen im Zustand:
  // `largeGroupMode: false,` / `largeGroupMode: room.largeGroupMode ?? false,`
  if (/^\w+:\s*(false|true|room\.\w+|\w+\.\w+)\s*(\?\?\s*\w+\s*)?,?$/.test(t)) return true;
  // Parameter einer Signatur: `largeGroupMode?: boolean,`
  if (/^\w+\??:\s*\w+(\[\])?,?$/.test(t)) return true;
  return false;
};

/** Gabelt sich hier wirklich etwas? */
const IST_WEICHE = (z) =>
  /\bif\s*\(|\?|&&|\|\||\.filter\(|\.map\(|return |=\s*\w+\s*\?|switch\s*\(/.test(z);

/**
 * Was PASSIERT, wenn die Bedingung greift. Die Bedingung allein sagt nichts:
 * `if (room.largeGroupMode) {` ist keine Auskunft, erst die drei Zeilen
 * darunter sind eine („Wager aus, Connections aus, Comeback aus"). Der erste
 * Lauf am 29.08. hat genau diese drei nicht angezeigt, und damit fehlte der
 * meistgenannte Unterschied ueberhaupt im Dokument.
 *
 * Gelesen wird bis die geschweifte Klammer wieder zugeht, hoechstens zwoelf
 * Zeilen. Laengere Bloecke sind keine Weiche mehr, sondern ein Kapitel.
 */
function folge(zeilen, idx) {
  const start = zeilen[idx];
  if (!/\{\s*$/.test(start)) return [];
  let tiefe = 0, raus = [];
  for (let i = idx; i < zeilen.length && raus.length < 12; i++) {
    for (const c of zeilen[i]) { if (c === '{') tiefe++; else if (c === '}') tiefe--; }
    if (i > idx) {
      const t = zeilen[i].trim();
      if (t && !t.startsWith('//')) raus.push(t.replace(/\s+/g, ' ').slice(0, 150));
    }
    if (tiefe <= 0 && i > idx) break;
  }
  // Die schliessende Klammer traegt keine Auskunft.
  if (raus.length && /^\}/.test(raus[raus.length - 1])) raus.pop();
  return raus;
}

/** Der Kommentarblock direkt ueber der Zeile. Dort stehen die Begruendung,
 *  das Datum und meist ein Zitat von Wolf - also genau das, woran sich
 *  „gewollt oder nicht" entscheidet. */
function begruendung(zeilen, idx) {
  const raus = [];
  for (let i = idx - 1; i >= 0 && raus.length < 12; i--) {
    const t = zeilen[i].trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/')) {
      raus.unshift(t.replace(/^\/\/\s?|^\/\*+\s?|^\*+\/?\s?/, '').trim());
      continue;
    }
    break;
  }
  return raus.filter(Boolean).join(' ').trim();
}

function* dateien(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* dateien(p);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) yield p;
  }
}

const funde = [];
for (const wurzel of ['backend/src', 'frontend/src', 'shared']) {
  const abs = path.join(WURZEL, wurzel);
  if (!fs.existsSync(abs)) continue;
  for (const datei of dateien(abs)) {
    const rel = path.relative(WURZEL, datei);
    const quelle = fs.readFileSync(datei, 'utf8');
    const zeilen = quelle.split('\n');
    // Pro Datei: die lokalen Namen desselben Flags dazunehmen.
    const lokal = aliase(quelle);
    let abgedeckt = 0; // bis hierhin gehoert alles zu einem schon gezeigten Block
    const trifft = (z) => MARKER.test(z)
      || [...lokal].some(n => new RegExp(`\\b${n}\\b`).test(z));
    for (let i = 0; i < zeilen.length; i++) {
      const z = zeilen[i];
      if (!trifft(z)) continue;
      if (IST_VERKABELUNG(z)) continue;
      if (!IST_WEICHE(z)) continue;
      // Die Zeile, die den Alias ANLEGT, ist selbst keine Weiche - ABER nur,
      // wenn sie das Flag bloss abliest. `const maxTeams = room.largeGroupMode
      // ? QQ_MAX_TEAMS_LARGE : QQ_MAX_TEAMS;` legt auch einen Namen an und ist
      // trotzdem der Unterschied „8 gegen 40 Teams", also der wichtigste
      // ueberhaupt. Der erste Anlauf dieses Filters hat genau den verschluckt.
      const nurAblesen = /\bconst\s+[A-Za-z_$][\w$]*\s*=\s*(!!)?\(?\s*(state|s|room|st)\b[^?]*;?\s*$/.test(z)
        || /\bconst\s+[A-Za-z_$][\w$]*\s*=\s*(!!)?(qqIsMega|qqArenaType)\([^?]*\)\s*;?\s*$/.test(z);
      if (nurAblesen) continue;
      // ⚠️ Ein Treffer, der INNERHALB eines schon aufgenommenen Blocks liegt,
      // ist keine eigene Weiche. Er IST die Folge, und die steht bereits unter
      // dem `if`. Ohne diese Sperre stand die Fraktions-Zuteilung im ersten
      // Lauf fuenfmal da: einmal als Block und viermal als ihre Innenzeilen.
      if (i + 1 <= abgedeckt) continue;
      const fg = folge(zeilen, i);
      if (fg.length) abgedeckt = i + 1 + fg.length;
      funde.push({
        datei: rel, zeile: i + 1,
        code: z.trim().replace(/\s+/g, ' ').slice(0, 190),
        // Hat das Format-Wort selbst getroffen, oder nur ein lokaler Alias?
        // Der Alias ist noetig (sonst faende man von einer Ansicht keine
        // einzige Weiche), er kostet aber Genauigkeit: heisst eine Variable
        // zufaellig wie eine, die weiter oben aus dem Format abgeleitet wurde,
        // rutscht sie mit durch. Das wird nicht versteckt, sondern markiert.
        viaAlias: !MARKER.test(z),
        folge: fg,
        warum: begruendung(zeilen, i).slice(0, 420),
      });
    }
  }
}

// Nach Gebiet sortieren, innerhalb nach Datei und Zeile.
for (const f of funde) {
  f.gebiet = (GEBIETE.find(g => g.wo.test(f.datei)) ?? GEBIETE[GEBIETE.length - 1]).name;
}
funde.sort((a, b) => {
  const ga = GEBIETE.findIndex(g => g.name === a.gebiet);
  const gb = GEBIETE.findIndex(g => g.name === b.gebiet);
  return ga - gb || a.datei.localeCompare(b.datei) || a.zeile - b.zeile;
});

// ── Ausgabe ───────────────────────────────────────────────────────────────
//
// Zwei Teile, und die Trennung ist der eigentliche Gedanke. Der erste Lauf am
// 29.08. warf 393 Zeilen in einer Liste aus. Vollstaendig, und trotzdem
// unbrauchbar: Wolf soll entscheiden, was gewollt ist, und niemand entscheidet
// dreihundertmal.
//
// TEIL 1 sind die Stellen, die CrowdQuiz zu CrowdQuiz MACHEN: die Regeln auf
// dem Server und die Register. Nur die kann man abwaehlen. Sie stehen
// vollstaendig da, mit dem, was passiert.
//
// TEIL 2 sind die FOLGEN davon in den Ansichten. Die entscheidet man nicht
// einzeln, man liest sie, wenn eine Ansicht komisch aussieht. Deshalb kompakt,
// eine Zeile je Weiche.
const DEFINIEREND = new Set(['Regeln des Spiels (Server)', 'Ereignisse (Server)', 'Register und Konstanten']);
const heute = new Date().toISOString().slice(0, 10);
const teil1 = funde.filter(f => DEFINIEREND.has(f.gebiet));
const teil2 = funde.filter(f => !DEFINIEREND.has(f.gebiet));

const zeilen = [];
zeilen.push('# Wo CozyQuiz und CrowdQuiz auseinanderlaufen');
zeilen.push('');
zeilen.push(`Erzeugt am ${heute} von \`scripts/formate-vergleich.mjs\`. **Nicht von Hand pflegen.**`);
zeilen.push('Neu erzeugen mit `node scripts/formate-vergleich.mjs`.');
zeilen.push('');
zeilen.push('Wolf 2026-08-29: „wichtig waere vlt einmal die UNTERSCHIEDE zwischen cozyquiz');
zeilen.push('und crowdquiz zu identifizieren, anhandessen kann entschieden werden, was');
zeilen.push('gewollt und was nicht ist."');
zeilen.push('');
zeilen.push('## Wie das hier zu lesen ist');
zeilen.push('');
zeilen.push('**Teil 1** sind die Stellen, die CrowdQuiz zu CrowdQuiz machen: die Regeln auf');
zeilen.push('dem Server und die Register. Nur die kann man abwaehlen, und nur dort ist');
zeilen.push('„gewollt oder nicht" ueberhaupt eine sinnvolle Frage. Vollstaendig, mit dem,');
zeilen.push('was jeweils passiert.');
zeilen.push('');
zeilen.push('**Teil 2** sind die Folgen in den Ansichten. Die entscheidet man nicht einzeln,');
zeilen.push('die liest man nach, wenn eine Folie komisch aussieht. Eine Zeile je Weiche.');
zeilen.push('');
zeilen.push('Das Zitat hinter einer Weiche ist der Kommentar, der im Code darueber steht.');
zeilen.push('Dort stehen meist Datum und Begruendung.');
zeilen.push('');
zeilen.push('Eine Weiche, die mit `nur ueber einen lokalen Alias gefunden` markiert ist,');
zeilen.push('nennt das Format nicht selbst. Fast jede Ansicht schreibt es sich einmal in');
zeilen.push('eine eigene Variable (`const largeGroup = ...`) und fragt danach nur die ab -');
zeilen.push('ohne diese Spur faende man von einer Ansicht keine einzige Weiche. Der Preis');
zeilen.push('ist Genauigkeit: heisst eine Variable zufaellig so, rutscht sie mit durch.');
zeilen.push('Deshalb markiert statt versteckt.');
zeilen.push('');
zeilen.push('⚠️ **Was hier NICHT steht, und das ist die wichtigere Haelfte.** Nur');
zeilen.push('Unterschiede, die im Code als Weiche STEHEN. Nicht gefunden werden:');
zeilen.push('');
zeilen.push('* Unterschiede, die daraus entstehen, dass dieselbe Ansicht mit vierzig statt');
zeilen.push('  acht Teams laeuft (Zeilenhoehen, Umbrueche, Gedraenge).');
zeilen.push('* Alles, was in CrowdQuiz FEHLT, ohne dass es jemand abgeschaltet hat.');
zeilen.push('* Text, der in CrowdQuiz schlicht falsch ist, weil er von CozyQuiz erzaehlt.');
zeilen.push('');
zeilen.push('Dafuer gibt es die Bild-Werkzeuge: `crowd-abgleich.mjs` (der Abend, Station');
zeilen.push('fuer Station), `crowd-ankommen.mjs` (die Diaschau) und `crowd-zeremonie.mjs`');
zeilen.push('(die Siegerehrung Takt fuer Takt).');
zeilen.push('');
zeilen.push(`**${funde.length} Weichen** in ${new Set(funde.map(f => f.datei)).size} Dateien:`);
zeilen.push(`${teil1.length} definierende, ${teil2.length} in den Ansichten.`);

// ── Teil 1, ausfuehrlich ──────────────────────────────────────────────────
zeilen.push('', '---', '', '# Teil 1: Was CrowdQuiz zu CrowdQuiz macht', '');
let g1 = null, d1 = null;
for (const f of teil1) {
  if (f.gebiet !== g1) {
    zeilen.push('', `## ${f.gebiet} (${teil1.filter(x => x.gebiet === f.gebiet).length})`, '');
    g1 = f.gebiet; d1 = null;
  }
  if (f.datei !== d1) { zeilen.push('', `### \`${f.datei}\``, ''); d1 = f.datei; }
  zeilen.push(`**Zeile ${f.zeile}**`, '');
  zeilen.push('```ts');
  zeilen.push(f.code);
  for (const zz of f.folge) zeilen.push(`  ${zz}`);
  zeilen.push('```');
  if (f.viaAlias) zeilen.push('', '`nur ueber einen lokalen Alias gefunden, kann ein Fehltreffer sein`');
  if (f.warum) zeilen.push('', `> ${f.warum}`);
  zeilen.push('');
}

// ── Teil 2, kompakt ───────────────────────────────────────────────────────
zeilen.push('', '---', '', '# Teil 2: Die Folgen in den Ansichten', '');
zeilen.push('Eine Zeile je Weiche. Zum Nachschlagen, nicht zum Durchentscheiden.', '');
let g2 = null, d2 = null;
for (const f of teil2) {
  if (f.gebiet !== g2) {
    zeilen.push('', `## ${f.gebiet} (${teil2.filter(x => x.gebiet === f.gebiet).length})`, '');
    g2 = f.gebiet; d2 = null;
  }
  if (f.datei !== d2) {
    zeilen.push('', `### \`${f.datei}\` (${teil2.filter(x => x.datei === f.datei).length})`, '');
    d2 = f.datei;
  }
  // ⚠️ Ohne die erste Folgezeile ist der Eintrag wertlos: `if (largeGroup) {`
  // sagt nicht, WAS dann passiert. Genau daran ist die Fraktionen-Folie im
  // ersten Lauf unsichtbar geblieben, obwohl sie erfasst war.
  const wink = f.folge[0] ? `  →  ${f.folge[0].slice(0, 90).replace(/`/g, "'")}` : '';
  zeilen.push(`* **${f.zeile}** \`${f.code.slice(0, 110).replace(/`/g, "'")}\`${wink}`);
}
zeilen.push('');

const text = zeilen.join('\n');
if (process.argv.includes('--zeigen')) {
  console.log(text);
} else {
  const ziel = path.join(WURZEL, 'docs/FORMATE.md');
  fs.writeFileSync(ziel, text);
  console.log(`  ${funde.length} Weichen in ${new Set(funde.map(f => f.datei)).size} Dateien -> docs/FORMATE.md`);
  console.log(`  Teil 1 (definierend, entscheidbar): ${teil1.length}`);
  console.log(`  Teil 2 (Folgen in den Ansichten):   ${teil2.length}`);
  for (const g of GEBIETE) {
    const n = funde.filter(f => f.gebiet === g.name).length;
    if (n) console.log(`    ${String(n).padStart(3)}  ${g.name}`);
  }
}
