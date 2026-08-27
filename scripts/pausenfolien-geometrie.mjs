/* pausenfolien-geometrie — belegen alle Folien dieselbe Flaeche?
 *
 * 2026-08-27, Wolf, nachdem der gemeinsame Kasten fuer die Zeilen drin war:
 *   „bin immernoch nicht super ueberzeugt von allen slide views, manche sind
 *    eher hochkant manche mit rahmen etc, wirkt nicht wie eins, das hat der
 *    kasten damals gemacht, aber den will ich nicht zurueck"
 *
 * ── Der Satz, um den es geht ──────────────────────────────────────────────
 * Beim Ausbau des Rahmens am 2026-08-26 steht im Code:
 *   „Was BLEIBT, ist die feste Hoehe - und das ist wichtig, denn sie ist es,
 *    die das Karussell ruhig haelt, nicht der Rahmen."
 * Das war zur Haelfte richtig. Die HOEHE ist fix (clamp 460-660). Die BREITE
 * ist es nicht: der Rahmen war 1500 breit und hat jede Folie auf diese Breite
 * gezogen, egal wie schmal ihr Inhalt war. Ohne ihn ist die sichtbare Breite
 * die des Inhalts - und die reicht von „so breit wie ein Teamname" bis 1500.
 * Genau das liest sich als „manche hochkant, manche quer".
 *
 * ── Was gemessen wird ─────────────────────────────────────────────────────
 * Je Folie, am laufenden Bild:
 *   Breite / Hoehe des Inhalts   und daraus das Seitenverhaeltnis
 *   Oberkante der Ueberschrift   (sitzt sie ueberall auf derselben Linie?)
 *   Schriftgroesse der Ueberschrift
 *   Anzahl sichtbarer Rahmen im Inhalt
 *
 * Drei Zahlen entscheiden, ob es „wie eins" wirkt, und keine davon ist
 * Geschmack: gleiche Breite, gleiche Titel-Linie, gleiche Titel-Groesse.
 *
 * ── Warum das hier live geht, obwohl der letzte Anlauf nur EINE Folie sah ──
 * Die Statistik-Folien haengen an `/api/qq/leaderboard`. Ein frischer Raum
 * liefert dort nichts, also kommen sie gar nicht vor. Statt einen Abend
 * nachzustellen wird diese EINE Antwort abgefangen und durch erfundene, aber
 * formgleiche Daten ersetzt. Damit rendern alle Folien, und zwar sofort.
 *
 * NUTZUNG:  node scripts/pausenfolien-geometrie.mjs [--bilder <ordner>]
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

const bilderIdx = process.argv.indexOf('--bilder');
const BILDER = bilderIdx > 0 ? process.argv[bilderIdx + 1] : null;
if (BILDER) fs.mkdirSync(BILDER, { recursive: true });

// Erfundene, aber formgleiche Historie.
// ⚠️ Die Namen muessen die der laufenden Bot-Teams sein, sonst findet die
// Avatar-Suche nichts und auf jeder Folie steht die Ersatzkachel. Die Bots
// heissen bei JEDEM Lauf anders - beim ersten Anlauf standen hier die Namen
// aus einem frueheren Bild, und prompt hatte jede Rekord-Zeile ein
// Fragezeichen. Deshalb werden sie jetzt aus der laufenden Seite gelesen.
const bau = (T) => ({
  totalGames: 37,
  leaderboard: T.map((name, i) => ({ name, wins: 11 - i, games: 20 - i, avatarId: null })),
  funStats: {
    highestScore: { teamName: T[0], score: 14, draftTitle: 'Vol. 1' },
    closestGame: { teams: [T[1], T[2]], gap: 1, draftTitle: 'Vol. 2' },
    winStreak: { teamName: T[0], streak: 4 },
    mostGames: { teamName: T[1], games: 19 },
    fastestAnswer: { teamName: T[3], text: 'Kopenhagen', questionText: 'Hauptstadt?', ms: 640 },
    funnyAnswers: [
      { teamName: T[4], text: 'Ein Pinguin mit Fuehrerschein', questionText: 'Wer?' },
      { teamName: T[5], text: 'Definitiv Dienstag', questionText: 'Wann?' },
    ],
    jokerKing: { teamName: T[2], total: 7 },
    stealMaster: { teamName: T[5], total: 9 },
    potatoBoss: { teamName: T[6], total: 5 },
    comebackKing: { teamName: T[3], total: 2 },
    underdog: { teamName: T[7], games: 3, wins: 2 },
    speedDemon: { teamName: T[1], avgRank: 1.33, samples: 15 },
    categoryMasters: [
      { teamName: T[0], category: 'MUSIK', count: 12 },
      { teamName: T[2], category: 'SPORT', count: 10 },
      { teamName: T[4], category: 'GEOGRAFIE', count: 9 },
    ],
    perfectRounds: [
      { teamName: T[1], draftTitle: 'Vol. 1' },
      { teamName: T[3], draftTitle: 'Vol. 3' },
    ],
    todayStats: {
      games: 3,
      topScore: { teamName: T[0], score: 12, draftTitle: 'Vol. 1' },
      topWinner: { teamName: T[2], wins: 2 },
    },
  },
});

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {}, entwurf: 'qq-vol-1' });
const seite = b.seite;

await b.zurStation('pause');
await sleep(1200);

// Der Harness-Socket ist ein Moderator-Socket und bekommt jeden Zustand mit.
const namen = (b.helfer.zustand()?.teams ?? []).map(t => t.name);
const T = namen.length >= 8 ? namen : [
  'Team A', 'Team B', 'Team C', 'Team D', 'Team E', 'Team F', 'Team G', 'Team H'];
console.log('  Teams aus der Buehne:', T.slice(0, 3).join(', '), '...');
const ANTWORT = bau(T);
await seite.route('**/api/qq/leaderboard*', route =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ANTWORT) }));
// ⚠️ NICHT auf `networkidle` warten. Die Buehne haelt eine offene
// Socket-Verbindung, „netzwerkruhig" tritt nie ein und der Aufruf laeuft in
// die Zeitgrenze.
await seite.reload({ waitUntil: 'domcontentloaded' });   // damit die Abfangung greift
await sleep(6000);

const messen = () => {
  const halter = document.querySelector('[data-qq-folie]');
  if (!halter) return null;
  const inhalt = halter.firstElementChild;
  if (!inhalt) return null;
  const r = inhalt.getBoundingClientRect();
  // Die Ueberschrift ist das erste Element mit fetter, grosser Schrift.
  let titel = null;
  for (const el of inhalt.querySelectorAll('div, span')) {
    const cs = getComputedStyle(el);
    if (parseFloat(cs.fontSize) >= 24 && parseInt(cs.fontWeight, 10) >= 800) { titel = el; break; }
  }
  const tr = titel ? titel.getBoundingClientRect() : null;
  // Sichtbare Rahmen im Inhalt zaehlen.
  let rahmen = 0;
  for (const el of inhalt.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none'
        && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.borderTopColor)) rahmen++;
  }
  return {
    key: halter.getAttribute('data-qq-folie'),
    breite: Math.round(r.width), hoehe: Math.round(r.height),
    mitteX: Math.round(r.left + r.width / 2),
    titelOben: tr ? Math.round(tr.top) : null,
    titelGroesse: titel ? Math.round(parseFloat(getComputedStyle(titel).fontSize)) : null,
    rahmen,
  };
};

const gesehen = new Map();
for (let i = 0; i < 120 && gesehen.size < 20; i++) {
  const roh = await seite.evaluate(messen);
  if (roh && roh.key && !gesehen.has(roh.key)) {
    // ⚠️ Erst die Blende abwarten. `qqPanelContentFade` laeuft 0.7 s und
    // beginnt bei Deckkraft 0 - ein Bild sofort nach dem Wechsel zeigt eine
    // LEERE Buehne. Die Messwerte waeren zwar trotzdem richtig (Deckkraft
    // aendert kein Layout), das Bild aber unbrauchbar, und beim ersten Anlauf
    // sah es aus, als sei die Folie kaputt.
    await sleep(900);
    const m = await seite.evaluate(messen);
    if (!m || m.key !== roh.key) continue;
    gesehen.set(m.key, m);
    if (BILDER) await seite.screenshot({ path: `${BILDER}/folie-${String(gesehen.size).padStart(2, '0')}-${m.key}.png` });
  }
  await sleep(700);
}

const alle = [...gesehen.values()];
console.log(`\n══ ${alle.length} Folien gesehen ═══════════════════════════════════════`);
console.log('  Folie            Breite  Hoehe  MitteX  Titel-y  Titel-px  Rahmen  Form');
for (const m of alle) {
  const v = m.hoehe / Math.max(m.breite, 1);
  const form = v > 0.85 ? 'HOCHKANT' : v > 0.45 ? 'quadratisch' : 'quer';
  console.log('  ' + m.key.padEnd(16)
    + String(m.breite).padStart(6) + String(m.hoehe).padStart(7)
    + String(m.mitteX).padStart(8) + String(m.titelOben ?? '-').padStart(9)
    + String(m.titelGroesse ?? '-').padStart(10) + String(m.rahmen).padStart(8)
    + '  ' + form);
}

const spanne = (werte) => Math.max(...werte) - Math.min(...werte);
const breiten = alle.map(m => m.breite);
const titelY = alle.filter(m => m.titelOben != null).map(m => m.titelOben);
const titelPx = alle.filter(m => m.titelGroesse != null).map(m => m.titelGroesse);

console.log('\n══ Urteil ══════════════════════════════════════════════════════');
const zeile = (name, wert, grenze, einheit = 'px') => {
  const ok = wert <= grenze;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(34)} ${String(wert).padStart(5)} ${einheit}  (erlaubt ${grenze})`);
  return ok;
};
const a = zeile('Spanne der Inhaltsbreiten', spanne(breiten), 80);
// ⚠️ Die Hoehe ist NICHT automatisch in Ordnung, nur weil der Kasten sie
// festhaelt. Der Kasten ist `overflow: hidden` - eine Folie, deren Inhalt
// hoeher ist als er, wird stillschweigend unten abgeschnitten. Genau so ist
// die vierte Rekord-Zeile verschwunden, ohne dass irgendwo ein Fehler stand.
const b2 = zeile('Spanne der Inhaltshoehen', spanne(alle.map(m => m.hoehe)), 30);
const c = zeile('Spanne der Titel-Oberkanten', titelY.length ? spanne(titelY) : 0, 40);
const d = zeile('Spanne der Titel-Groessen', titelPx.length ? spanne(titelPx) : 0, 8);
console.log(a && b2 && c && d
  ? '\n  ✓ Die Folien belegen dieselbe Flaeche. Der Kasten ist unsichtbar da.'
  : '\n  ✗ Die Folien belegen verschiedene Flaechen - das liest sich als'
    + '\n    „mal hochkant, mal quer", auch ohne dass ein Rahmen es zeigt.');

await b.schliessen?.();
process.exit(a && b2 && c && d ? 0 : 1);
