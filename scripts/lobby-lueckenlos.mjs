/* lobby-lueckenlos — zeigt die Buehne in JEDER Kombination etwas?
 *
 * 2026-08-27, Wolf: „seite ist momentan leer" (Bild: nur Sternenfeld, kein
 * einziges Zeichen, keine Fehlermeldung).
 *
 * ── Was passiert war ──────────────────────────────────────────────────────
 * Der Lobby-Zustand haengt an drei unabhaengigen Feldern:
 *
 *     setupDone        Wizard durch?
 *     lobbyOpen        Moderator hat den QR freigeschaltet?   (neu, 27.8.)
 *     formatSelected   Format-Schritt durchlaufen?
 *
 * Das sind ACHT Kombinationen. Im Code standen drei Bedingungen nebeneinander,
 * jede mit eigenen Anforderungen - und eine Kombination traf keine davon:
 * setupDone=true, lobbyOpen=false, formatSelected=false. Die Buehne rendert
 * dann nichts als den Grund. Kein Absturz, keine Fehlermeldung, nur leer.
 *
 * ⚠️ Genau deshalb faellt so etwas nicht auf. Ein Absturz meldet sich, eine
 * Luecke nicht. Und das Feld, das die Luecke aufgemacht hat, war meins.
 *
 * Der Fix ist nicht die eine zusaetzliche Klammer, sondern die Bauform: eine
 * Kette mit Rueckfall, deren letzter Zweig keine Bedingung hat. Dieses Werkzeug
 * beweist, dass sie haelt - fuer alle acht, nicht fuer die eine, die aufgefallen
 * ist.
 *
 * NUTZUNG:  node scripts/lobby-lueckenlos.mjs
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const b = await buehneStarten({
  bots: 8, frisch: true, takt: () => {},
  entwurf: 'qq-vol-1',
});
const seite = b.seite;
await b.aufbauen('lobby');
await sleep(900);

console.log('\n══ Alle acht Kombinationen ═════════════════════════════════════');
console.log('  setup  lobby  format   was die Buehne zeigt');

// ⚠️ `formatSelected` kennt nur EINE Richtung. Der Server setzt es ausschliesslich
// auf true (`qqSocketHandlers.ts`: „if (payload.formatSelected === true)"), zurueck
// geht es nur ueber einen Raum-Reset. Ein naiver Dreifach-Schleifendurchlauf
// testet deshalb ab der zweiten Zeile etwas anderes, als er in die Tabelle
// schreibt - der erste Anlauf dieses Werkzeugs hat genau das getan und trotzdem
// acht Haken gemeldet.
// Deshalb: erst ALLE vier Faelle mit format=false, dann einmal umschalten und
// die vier mit format=true. Kein Fall wird zweimal angefahren.
let leer = 0;
async function zeile(setupDone, lobbyOpen, formatSelected) {
  await b.emit('qq:setSetupDone', { value: setupDone });
  await b.emit('qq:setLobbyOpen', { value: lobbyOpen });
  await sleep(1600);
  const text = await seite.evaluate(() =>
    (document.body.innerText || '').replace(/\s+/g, ' ').trim());
  if (!text) leer++;
  console.log(`  ${String(setupDone).padEnd(6)} ${String(lobbyOpen).padEnd(6)} ` +
    `${String(formatSelected).padEnd(8)} ${text ? '✓' : '✗'} ${text.slice(0, 52) || '(LEER)'}`);
}

for (const setupDone of [false, true]) {
  for (const lobbyOpen of [false, true]) await zeile(setupDone, lobbyOpen, false);
}
await b.emit('qq:setQuizOptions', { formatSelected: true });
await sleep(400);
for (const setupDone of [false, true]) {
  for (const lobbyOpen of [false, true]) await zeile(setupDone, lobbyOpen, true);
}

console.log('\n══ Urteil ══════════════════════════════════════════════════════');
console.log(leer === 0
  ? '  ✓ Keine Kombination laesst die Buehne leer.'
  : `  ✗ ${leer} von 8 Kombinationen zeigen NICHTS.`);

await b.schliessen?.();
process.exit(leer === 0 ? 0 : 1);
