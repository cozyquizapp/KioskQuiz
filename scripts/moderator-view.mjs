/**
 * moderator-view.mjs — das Steuerpult ansehen, nicht die Buehne.
 *
 * WARUM (2026-08-24): beamer-view.mjs kennt nur den Beamer. Fuer die Frage
 * „wie heisst das im Moderator?" braucht es die Wizard-Seite, und die zeigt
 * ihre Look-Auswahl nur, solange der Raum noch im Setup steht.
 *
 * Der eigentliche Fund steckt in den ersten Zeilen: der Raum wird ueber
 * `qq:resetRoom` zurueckgesetzt, NICHT durch Loeschen von
 * backend/.qq-rooms/*.json. Genau daran habe ich heute vier Anlaeufe verloren.
 * Der Server flusht seine offenen Speicherungen beim Herunterfahren („✓ Pending
 * QQ-Saves gefluscht"), und das passiert NACH einem `pkill`. Wer also killt,
 * loescht und neu startet, bekommt seine Datei zurueck - der alte Prozess
 * schreibt sie im Sterben noch einmal. CLAUDE.md nennt das `rm` als Rezept;
 * es stimmt nur, wenn man lange genug wartet, und wie lange sagt niemand.
 * Ein Reset ueber den Socket kennt das Problem nicht.
 *
 * NUTZUNG:
 *   QQ_CHROME=/opt/pw-browsers/chromium node scripts/moderator-view.mjs
 *   -> .shots/M-look.png plus die aktive Design-Kachel und das Avatar-Set als Text
 */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
const req = createRequire(new URL('../backend/package.json', import.meta.url));
const { io } = req('socket.io-client');

// Raum sauber zuruecksetzen, statt Dateien zu loeschen: der Server flusht beim
// Herunterfahren, ein `rm` davor wird dadurch wieder ueberschrieben.
const sock = io('http://localhost:4000', { transports: ['websocket'] });
await new Promise((res, rej) => { sock.on('connect', res); sock.on('connect_error', rej); setTimeout(() => rej(new Error('Socket-Timeout')), 8000); });
const emit = (ev, extra = {}) => new Promise(r => sock.emit(ev, { roomCode: 'default', ...extra }, r));
await emit('qq:joinModerator', { pin: process.env.ADMIN_PIN || '2506' });
console.log('reset:', JSON.stringify(await emit('qq:resetRoom', { confirm: true })));
sock.close();

const ctx = await chromium.launchPersistentContext('/tmp/mod-profil2', {
  args: ['--no-sandbox'], executablePath: process.env.QQ_CHROME,
  viewport: { width: 1440, height: 1100 },
});
await ctx.addInitScript(() => { try { sessionStorage.setItem('qq_admin_unlocked','1'); sessionStorage.setItem('qq_admin_pin','2506'); localStorage.removeItem('qqLastFormat'); } catch {} });
const p = ctx.pages()[0] ?? await ctx.newPage();
await p.goto('http://localhost:5173/moderator', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 5000));
for (const t of ['Look']) {
  const b = p.locator(`text=${t}`).first();
  if (await b.count()) { await b.click().catch(() => {}); }
}
await new Promise(r => setTimeout(r, 2000));
console.log('--- Aktive Design-Kachel + Set:');
console.log(await p.evaluate(() => {
  const sel = document.querySelector('select');
  const aktiv = [...document.querySelectorAll('button')]
    .filter(b => b.innerText && b.innerText.includes('✓'))
    .map(b => b.innerText.split('\n')[0]);
  return JSON.stringify({ designKachelnMitHaken: aktiv, avatarSet: sel ? sel.options[sel.selectedIndex]?.text : null }, null, 2);
}));
await p.screenshot({ path: '.shots/M-look.png', fullPage: false });
await ctx.close();
