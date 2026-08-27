/* ankommen-folien — was laeuft eigentlich vor dem Spiel ueber die Leinwand?
 *
 * 2026-08-27, Wolf: „die slideshow ist noch etwas chaotisch, also die
 * verschiedenen slides passen nicht so gut zu einander und vlt nicht zum neuen
 * design? ausserdem ist die frage wie sinnvoll sie beim ersten oeffentlichen
 * durchlauf sind (keine daten)"
 *
 * Drei Behauptungen, drei verschiedene Pruefungen - und keine davon laesst sich
 * am Steuerpult beantworten, nur an der Buehne.
 *
 * ── Was hier passiert ──────────────────────────────────────────────────────
 * Die Vor-Spiel-Ansicht ist `PausedView mode="preGame"`
 * (`QQBeamerPage.tsx:2322`). Sie zeigt eine Karte, die alle **8 Sekunden**
 * weiterschaltet (`CozyQuizPausedView.tsx:1345`). Welche Karten ueberhaupt in
 * der Runde liegen, entscheidet sich beim Rendern: mehr als die Haelfte der
 * `panels.push`-Stellen haengt an Daten, die es an einem ersten Abend nicht
 * gibt. Genau das ist Wolfs dritte Frage, und sie ist zaehlbar.
 *
 * Der Schalter zwischen den beiden Zustaenden ist `setupDone`
 * (`QQBeamerPage.tsx:2322/2323`): false = Diaschau, true = Lobby mit QR. Es
 * gibt ihn also schon, und das Backend kann ihn in beide Richtungen
 * (`qq:setSetupDone`). Fehlt nur der Knopf am Steuerpult.
 *
 * ⚠️ Der Raum muss FRISCH sein. Ein Raum von der Platte bringt die Bestenliste
 * eines alten Laufs mit, und dann misst man den bequemen Fall statt des
 * ersten Abends. `rm -f backend/.qq-rooms/*.json` vor dem Start.
 *
 * NUTZUNG:  node scripts/ankommen-folien.mjs
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const TAKT = 8000;      // so lange steht eine Karte
const RUNDEN = 14;      // mehr Karten als es geben kann - der Umlauf faellt auf

const b = await buehneStarten({
  bots: 8, frisch: true, takt: () => {},
  kategorie: 'MUCHO', entwurf: 'qq-vol-1',
});
const seite = b.seite;
fs.mkdirSync('.shots/ankommen', { recursive: true });

// Zurueck in den Zustand VOR dem Lobby-Oeffnen. Genau der Zustand, den Wolf
// meint, und der heute nur ueber den Umweg „zurueck zum Setup" erreichbar ist.
//
// ⚠️ ZWEI Schalter, nicht einer, und der erste Anlauf ist genau daran
// gescheitert. Die Buehne prueft in dieser Reihenfolge
// (`QQBeamerPage.tsx:2321-2323`):
//
//   formatSelected === false           -> NeutralWelcomeView (nur Wortmarke)
//   formatSelected !== false, !setupDone -> PausedView preGame (die Diaschau)
//   setupDone                          -> LobbyView (QR + Teams)
//
// Ein Raum-Reset setzt `formatSelected` auf false (`qqRooms.ts:5283`). Wer nur
// `setupDone` zuruecknimmt, landet also im neutralen Willkommen und
// fotografiert die falsche Ansicht - beim ersten Lauf kam genau deshalb
// dreimal dieselbe Wortmarke heraus.
// ⚠️ Der Harness baut FAUL auf: `fillTeams` laeuft erst, wenn eine Station
// angefahren wird. Ohne diese Zeile steht die Buehne mit null Teams da, und
// damit fallen alle Karten weg, die an Teams haengen - man misst dann den
// leersten denkbaren Abend statt Wolfs Abend mit acht Teams.
await b.aufbauen('lobby');
await sleep(900);
await b.emit('qq:setQuizOptions', { formatSelected: true });
await sleep(400);
await b.emit('qq:setSetupDone', { value: false });
await sleep(1600);
const teamZahl = await seite.evaluate(() => document.querySelectorAll('[data-qq-team]').length);
console.log(`  Teams in der Lobby: ${teamZahl}`);

const gesehen = [];
for (let i = 0; i < RUNDEN; i++) {
  const nr = String(i).padStart(2, '0');
  await seite.screenshot({ path: `.shots/ankommen/folie-${nr}.png` });
  // Fingerabdruck der Karte: die erste fette Zeile im Kartenbereich. Reicht,
  // um Wiederholungen zu erkennen, ohne die Bilder vergleichen zu muessen.
  const text = await seite.evaluate(() => (document.body.innerText || '')
    .split('\n').map(z => z.trim()).filter(Boolean).slice(0, 40).join(' | '));
  gesehen.push(text);
  await sleep(TAKT);
}

// Und der Gegenzustand: Lobby mit QR.
await b.emit('qq:setSetupDone', { value: true });
await sleep(2200);
await seite.screenshot({ path: '.shots/ankommen/lobby.png' });

// ── Auswertung ────────────────────────────────────────────────────────────
// Ab wann wiederholt sich die Schleife? Das ist die Zahl der Karten, die es
// an diesem Abend wirklich gibt.
let umlauf = null;
for (let i = 1; i < gesehen.length; i++) {
  if (gesehen[i] === gesehen[0]) { umlauf = i; break; }
}

console.log('\n══ Wie viele Folien laufen wirklich? ═══════════════════════════');
if (umlauf == null) {
  console.log(`  Kein Umlauf innerhalb von ${RUNDEN} Takten (${RUNDEN * TAKT / 1000} s).`);
  console.log('  Also mehr als 14 Folien, oder eine Folie aendert sich in sich.');
} else {
  console.log(`  ${umlauf} Folien, dann wiederholt es sich.`);
  console.log(`  Eine volle Runde dauert ${(umlauf * TAKT / 1000).toFixed(0)} Sekunden.`);
}
console.log('\n  Reihenfolge (erste Zeilen je Folie):');
gesehen.slice(0, umlauf ?? gesehen.length).forEach((t, i) =>
  console.log(`   ${String(i).padStart(2, '0')}  ${t.slice(0, 130)}`));

// Kontaktbogen: alles auf ein Blatt, damit „passen die zueinander" ueberhaupt
// beurteilbar wird. Nebeneinander sieht man es, einzeln nie.
const n = umlauf ?? gesehen.length;
const KOL = 3;
const breite = 560, hoehe = Math.round(breite * 990 / 1760);
const zeilen = Math.ceil((n + 1) / KOL);
const teile = [];
for (let i = 0; i < n; i++) {
  teile.push({
    input: await sharp(`.shots/ankommen/folie-${String(i).padStart(2, '0')}.png`).resize(breite).toBuffer(),
    left: (i % KOL) * breite, top: Math.floor(i / KOL) * hoehe,
  });
}
teile.push({
  input: await sharp('.shots/ankommen/lobby.png').resize(breite).toBuffer(),
  left: (n % KOL) * breite, top: Math.floor(n / KOL) * hoehe,
});
await sharp({ create: { width: KOL * breite, height: zeilen * hoehe, channels: 3, background: '#111' } })
  .composite(teile).toFile('.shots/ANKOMMEN-FOLIEN.png');
console.log(`\n  Kontaktbogen: .shots/ANKOMMEN-FOLIEN.png (${n} Folien + Lobby als letztes Bild)`);

await b.schliessen?.();
