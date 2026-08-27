/* lobby-oeffnen — die drei Zustaende des Ankommens, nacheinander fotografiert.
 *
 * 2026-08-27, Wolf: „hier muesste es einen schritt davor geben sowas wie lobby
 * oeffnen, von der slide show zum qr lobby screen".
 *
 * ── Warum das nicht am Steuerpult zu pruefen ist ───────────────────────────
 * Der Knopf sitzt am Steuerpult, die Wirkung steht auf der Leinwand, und
 * dazwischen liegt der Server. Ein Bild vom Cockpit beweist deshalb nichts. Was
 * bewiesen werden muss, ist die KETTE: Wizard durch -> Buehne zeigt weiter die
 * Ankommen-Folien -> Knopf -> Buehne zeigt QR.
 *
 * Genau diese Kette war vorher unmoeglich, weil `setupDone` beides zugleich
 * getan hat. Der Beweis ist also, dass Bild 1 und Bild 2 sich UNTERSCHEIDEN,
 * obwohl `setupDone` in beiden true ist.
 *
 * ⚠️ Der Raum muss frisch sein (`rm -f backend/.qq-rooms/*.json`), sonst bringt
 * er ein `lobbyOpen` von der Platte mit und Bild 1 zeigt schon den QR.
 *
 * NUTZUNG:  node scripts/lobby-oeffnen.mjs
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const b = await buehneStarten({
  bots: 8, frisch: true, takt: () => {},
  kategorie: 'MUCHO', entwurf: 'qq-vol-1',
});
const seite = b.seite;
fs.mkdirSync('.shots/lobby-oeffnen', { recursive: true });

// Der Harness oeffnet die Lobby inzwischen selbst (lib/buehne.mjs). Fuer diese
// Pruefung nehmen wir sie einmal zurueck - das ist der Zustand direkt nach
// „Ins Cockpit".
await b.aufbauen('lobby');
await sleep(900);
await b.emit('qq:setQuizOptions', { formatSelected: true });
await b.emit('qq:setLobbyOpen', { value: false });
await sleep(1800);

const zustand = async () => seite.evaluate(() => ({
  qr: !!document.querySelector('svg[height][width]') && /SCANNEN|SCAN/i.test(document.body.innerText || ''),
  text: (document.body.innerText || '').split('\n').map(z => z.trim()).filter(Boolean).slice(0, 6).join(' | '),
}));

await seite.screenshot({ path: '.shots/lobby-oeffnen/1-ankommen.png' });
const a = await zustand();

await b.emit('qq:setLobbyOpen', { value: true });
await sleep(2000);
await seite.screenshot({ path: '.shots/lobby-oeffnen/2-lobby.png' });
const c = await zustand();

console.log('\n══ Vor dem Knopf ═══════════════════════════════════════════════');
console.log(`  QR sichtbar: ${a.qr ? 'JA' : 'nein'}`);
console.log(`  ${a.text.slice(0, 120)}`);
console.log('\n══ Nach dem Knopf ══════════════════════════════════════════════');
console.log(`  QR sichtbar: ${c.qr ? 'JA' : 'nein'}`);
console.log(`  ${c.text.slice(0, 120)}`);
console.log('\n══ Urteil ══════════════════════════════════════════════════════');
console.log(!a.qr && c.qr
  ? '  ✓ Der Schritt wirkt: vorher Ankommen-Folien, nachher QR.'
  : `  ✗ Kein Unterschied (vorher qr=${a.qr}, nachher qr=${c.qr}).`);

// ── Und das Steuerpult, denn dort sitzt der Knopf ─────────────────────────
// Zwei Bilder desselben Cockpits, einmal vor und einmal nach dem Oeffnen. Der
// Hauptknopf TAUSCHT seine Aufgabe, statt sich zu verdoppeln - das ist nur im
// Vergleich zu sehen.
await b.emit('qq:setLobbyOpen', { value: false });
const pult = await b.ctx.newPage();
await pult.setViewportSize({ width: 1100, height: 900 });
await pult.goto('http://localhost:5173/moderator', { waitUntil: 'domcontentloaded' });
await sleep(4000);
await pult.screenshot({ path: '.shots/lobby-oeffnen/3-cockpit-zu.png' });
await b.emit('qq:setLobbyOpen', { value: true });
await sleep(1500);
await pult.screenshot({ path: '.shots/lobby-oeffnen/4-cockpit-offen.png' });
console.log('  Cockpit: .shots/lobby-oeffnen/3-cockpit-zu.png / 4-cockpit-offen.png');

const breite = 760, hoehe = Math.round(breite * 990 / 1760);
await sharp({ create: { width: breite * 2, height: hoehe, channels: 3, background: '#111' } })
  .composite([
    { input: await sharp('.shots/lobby-oeffnen/1-ankommen.png').resize(breite).toBuffer(), left: 0, top: 0 },
    { input: await sharp('.shots/lobby-oeffnen/2-lobby.png').resize(breite).toBuffer(), left: breite, top: 0 },
  ])
  .toFile('.shots/LOBBY-OEFFNEN.png');
console.log('\n  Gegenueberstellung: .shots/LOBBY-OEFFNEN.png');

await b.schliessen?.();
