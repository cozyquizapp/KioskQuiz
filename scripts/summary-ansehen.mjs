/**
 * summary-ansehen.mjs — die Seite hinter dem QR, einmal wirklich ansehen.
 *
 * 2026-08-29, Wolf: „dann gerne einmal die summary anschauen, die duerfte noch
 * ganz schoen alt sein, da waere mir auch wichtig zu gucken, ob sie richtig
 * verknuepft ist, nach dem quiz auf team handys automatisch kommt und durch den
 * qr scannbar ist".
 *
 * Sie ist das einzige Stueck CozyQuiz, das die Gaeste am naechsten Tag noch
 * sehen - und sie war bei keinem Buehnen-Durchgang dabei. Also einmal ein Spiel
 * bis zum Ende fahren und die Seite in beiden Groessen knipsen: Handy (390) und
 * Laptop (1280).
 *
 * ⚠️ Der Testmodus ueberspringt das Speichern des Ergebnisses
 * (`qq:setTestMode` -> kein persistGameResult). Der stabile Weg
 * `/summary/by-id/<id>` hat dann nichts zu holen; geknipst wird deshalb
 * `/summary/<raumcode>`, der auch am Handy verlinkt ist.
 */
import fs from 'node:fs';
import { buehneStarten, sleep, BASE } from './lib/buehne.mjs';

const ZIEL = '.shots/summary';
fs.mkdirSync(ZIEL, { recursive: true });

const b = await buehneStarten({ grossformat: false, entwurf: 'qq-vol-1', frisch: true, bots: 6, antworten: 0.6 });
await b.aufbauen('spiel');
// ⚠️ Testmodus wieder AUS, sonst gibt es die Seite gar nicht zu sehen.
// `aufbauen` schaltet ihn an, und das Backend ueberspringt dann
// `persistGameResult` - die Zusammenfassung haengt danach ewig auf „Loading
// your stats…", weil es zu diesem Raum kein gespeichertes Ergebnis gibt.
// Genau so ist der erste Anlauf ausgegangen. Lokal ohne MONGODB_URI landet
// das Ergebnis nur im Arbeitsspeicher.
await b.emit('qq:setTestMode', { value: false });
await sleep(400);
await b.helfer.springe('game-over');
await sleep(1500);
await b.emit('qq:showThanks');
await sleep(1500);
const zustand = b.helfer.zustand();
console.log(`Raum ${b.roomCode} · Phase ${zustand?.phase} · lastGameResultId ${zustand?.lastGameResultId ?? '(keine)'}`);

for (const [name, breite, hoehe] of [['handy', 390, 844], ['laptop', 1280, 900]]) {
  const seite = await b.ctx.newPage();
  await seite.setViewportSize({ width: breite, height: hoehe });
  await seite.goto(`${BASE}/summary/${encodeURIComponent(b.roomCode)}`, { waitUntil: 'domcontentloaded' });
  await sleep(3500);
  await seite.screenshot({ path: `${ZIEL}/${name}.png`, fullPage: true });
  const text = await seite.evaluate(() => (document.body.innerText || '').replace(/\n+/g, ' | ').slice(0, 260));
  const quer = await seite.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`\n  ${name} (${breite}px) · Querlauf ${quer}\n  ${text}`);
  await seite.close();
}
await b.schliessen();
process.exit(0);
