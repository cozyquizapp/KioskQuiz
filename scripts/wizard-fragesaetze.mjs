/**
 * wizard-fragesaetze.mjs — den Fragensatz-Schritt des Wizards knipsen.
 *
 * 2026-08-29, Wolf: „sind die fragesaetze klar gekennzeichnet oder
 * unterschiedlich angeordnet in moderator?"
 *
 * Waren sie nicht. Seit heute stehen sie in zwei Bloecken („Passt zu
 * CrowdQuiz" / „Auch moeglich") und tragen ein Abzeichen in der Formatfarbe.
 * Das ist eine Behauptung, bis man es sieht - also einmal in beiden Formaten
 * aufnehmen.
 *
 * ⚠️ Der Wizard ist das STEUERPULT, nicht die Buehne. Er laeuft auf
 * /moderator, hat eine eigene Groesse und ist kein 1760x990-Bild. Deshalb ein
 * eigenes Werkzeug und nicht eine Station in crowd-abgleich.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
const PIN = process.env.ADMIN_PIN || '2506';
const ZIEL = '.shots/wizard';
fs.mkdirSync(ZIEL, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext('.shots/.browser-profil-wizard', {
  args: ['--no-sandbox'], viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1,
});
await ctx.addInitScript((pin) => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', pin);
    localStorage.setItem('qq-admin-pin', pin);
  } catch { /* ignore */ }
}, PIN);
const seite = ctx.pages()[0] ?? await ctx.newPage();

// Format wechseln heisst ggf. „Teams werden zurueckgesetzt?" - wegklicken.
seite.on('dialog', d => d.accept().catch(() => {}));

for (const arena of [true, false]) {
  const name = arena ? 'crowdquiz' : 'cozyquiz';
  // ⚠️ NICHT ueber `?arena=1`. Der Parameter wirkt nur ZUSAMMEN mit `?run=1`
  // (siehe QQModeratorPage, testSetupTriggered-Effekt) - ohne Autostart tut er
  // gar nichts. Der erste Anlauf hat deshalb ZWEIMAL dasselbe Format
  // fotografiert: beide Bilder zeigten „PASST ZU CROWDQUIZ", weil der Raum
  // sein `largeGroupMode` vom vorherigen Lauf behielt. Genau die Falle, die in
  // CLAUDE.md steht - ein Werkzeug, das CrowdQuiz messen soll, misst CozyQuiz.
  // Der ehrliche Weg ist der, den auch Wolf geht: im Schritt 1 die Formatkachel
  // anklicken. Das schickt largeGroupMode/nestedTeams und springt weiter.
  await seite.goto(`${BASE}/moderator-test`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  const kachel = seite.locator('button', { hasText: arena ? 'CrowdQuiz' : 'CozyQuiz' })
    .filter({ hasText: arena ? 'Bar-Race' : 'Klauen' }).first();
  if (await kachel.count()) { await kachel.click().catch(() => {}); await sleep(1200); }
  else console.log('    ⚠️ Formatkachel nicht gefunden - das Bild zeigt womoeglich das andere Format.');
  // Bis zum Schritt „Fragensatz" klicken. Der Wizard hat oben eine Schrittleiste;
  // der Schritt heisst im Kopf „Fragensatz".
  // ⚠️ NICHT auf das Wort „Fragensatz" pruefen. Es steht auch in der
  // Schrittleiste oben, also ist es ab dem ersten Bild da und die Schleife
  // bricht sofort ab - der erste Anlauf hat deshalb Schritt 1 fotografiert.
  // Eindeutig ist erst der INHALT des Schritts: dort stehen die Entwuerfe,
  // und deren Titel tragen alle „Vol.".
  const beimFragensatz = () => seite.evaluate(() => /Vol\.\s*\d/.test(document.body.innerText || ''));
  for (let i = 0; i < 8; i++) {
    if (await beimFragensatz()) break;
    const weiter = seite.locator('button', { hasText: /Weiter|Next/ }).first();
    if (await weiter.count()) { await weiter.click().catch(() => {}); await sleep(800); }
    else break;
  }
  if (!await beimFragensatz()) console.log('    ⚠️ Schritt Fragensatz nicht erreicht - das Bild zeigt etwas anderes.');
  await sleep(1200);
  // Gegenprobe, dass wirklich das gemeinte Format im Bild steht.
  const erwartet = arena ? 'Passt zu CrowdQuiz' : 'Passt zu CozyQuiz';
  // ⚠️ Gross-/Kleinschreibung egal: die Ueberschrift traegt text-transform,
  // und innerText liefert den UMGEWANDELTEN Text („PASST ZU CROWDQUIZ").
  // Ein exakter Vergleich meldet deshalb rot, obwohl das Bild stimmt.
  const stimmt = await seite.evaluate(
    t => (document.body.innerText || '').toLowerCase().includes(t.toLowerCase()), erwartet);
  console.log(`  ${name}: Ueberschrift „${erwartet}" ${stimmt ? 'da ✓' : 'FEHLT ✗ - falsches Format im Bild'}`);
  await seite.screenshot({ path: `${ZIEL}/${name}.png`, fullPage: false });
  const text = await seite.evaluate(() => {
    const t = (document.body.innerText || '');
    const i = t.indexOf('Fragensatz', t.indexOf('Fragensatz') + 1);
    return (i >= 0 ? t.slice(i) : t).replace(/\n+/g, ' | ').slice(0, 420);
  });
  console.log(`\n  ${name}: ${text}`);
}

const B = 900, H = 703;
await sharp({ create: { width: B * 2, height: H, channels: 3, background: '#0B0912' } })
  .composite([
    { input: await sharp(`${ZIEL}/crowdquiz.png`).resize(B, H, { fit: 'contain', background: '#0B0912' }).toBuffer(), left: 0, top: 0 },
    { input: await sharp(`${ZIEL}/cozyquiz.png`).resize(B, H, { fit: 'contain', background: '#0B0912' }).toBuffer(), left: B, top: 0 },
  ]).png().toFile(`${ZIEL}/nebeneinander.png`);
console.log(`\n  links CrowdQuiz, rechts CozyQuiz -> ${ZIEL}/nebeneinander.png`);
await ctx.close();
process.exit(0);
