/**
 * summary-knipsen.mjs — die Zusammenfassung im Handy- und Laptop-Format.
 *
 * 2026-08-29, Wolf: „kannst du die summary page auch im neuen design
 * erstellen? die sieht oll aus".
 *
 * ⚠️ Die Seite laesst sich nur ueber die Vorschau ansehen. Ihr Ergebnis liegt
 * in Mongo (`getQQGameResults`), lokal gibt es keine Datenbank, und die
 * Vorschau-Route war stillgelegt. Genau deshalb ist die Seite so alt geworden:
 * niemand konnte sie im Vorbeigehen anschauen. Sie ist seit heute wieder da
 * (/summary-test, hinter dem PIN).
 *
 * Kein Spiel, kein Socket, kein Backend - nur die Seite mit ihren Testdaten.
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
const PIN = process.env.ADMIN_PIN || '2506';
const ZIEL = process.env.QQ_ZIEL ?? '.shots/summary';
fs.mkdirSync(ZIEL, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext('.shots/.browser-profil-summary', {
  args: ['--no-sandbox'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
});
await ctx.addInitScript((pin) => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', pin);
    localStorage.setItem('qq-admin-pin', pin);
  } catch { /* ignore */ }
}, PIN);

for (const [name, breite, hoehe] of [['handy', 390, 844], ['laptop', 1280, 900]]) {
  const seite = await ctx.newPage();
  await seite.setViewportSize({ width: breite, height: hoehe });
  seite.on('pageerror', e => console.log('  [PAGEERROR]', String(e).slice(0, 140)));
  await seite.goto(`${BASE}/summary-test`, { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  // ⚠️ Die Testleiste liegt fest oben rechts (z-index 9999) und deckt auf dem
  // Handy genau das zu, worum es geht: Kopf und Siegerkachel. Der erste Satz
  // Bilder war deshalb zur Haelfte unbrauchbar. Sie hat keinen Schalter, also
  // wird sie fuers Bild ausgeblendet - sie gehoert ohnehin nicht zur Seite.
  await seite.evaluate(() => {
    for (const el of document.querySelectorAll('div')) {
      const st = getComputedStyle(el);
      if (st.position === 'fixed' && st.zIndex === '9999') el.style.display = 'none';
    }
  });
  await sleep(200);
  // ⚠️ Seit die Abschnitte beim Hereinscrollen aufdecken, ist ein
  // fullPage-Bild ohne Scrollen WERTLOS: der Beobachter meldet nur, was im
  // Sichtfenster war, alles darunter bleibt auf Deckkraft 0. Der erste Satz
  // Bilder nach dem Umbau zeigte eine leere Seite mit Kopf und Fusszeile.
  //
  // ⚠️ Und dann NOCH EINMAL, nach dem Antippen eines Teams. Der zweite Anlauf
  // scrollte nur die Uebersicht, und der Team-Schirm blieb leer - der Fehler
  // sah genauso aus wie vorher, hatte aber eine andere Ursache. Deshalb steht
  // das Durchscrollen jetzt in einer Funktion, die JEDES Bild benutzt.
  const durchscrollen = () => seite.evaluate(async () => {
    const schritt = Math.round(window.innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += schritt) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 400));
  });
  await durchscrollen();
  await sleep(500);
  await seite.screenshot({ path: `${ZIEL}/${name}.png`, fullPage: true });

  // ⚠️ Die Seite hat ZWEI Ansichten, und die zweite sieht niemand, der nur die
  // erste knipst: nach dem Antippen eines Teams kommt der Team-Schirm mit
  // eigenem Kopf, eigenen Zahlen und dem Teilen-Knopf. Der erste Satz Bilder
  // zeigte nur die Uebersicht - die Haelfte der Seite war ungeprueft.
  const teamKnopf = seite.locator('button.qq-sum-pick').first();
  if (await teamKnopf.count()) {
    await teamKnopf.click();
    await sleep(1200);
    await durchscrollen();
    await sleep(500);
    await seite.screenshot({ path: `${ZIEL}/${name}-team.png`, fullPage: true });
  }
  const mass = await seite.evaluate(() => ({
    hoch: document.documentElement.scrollHeight,
    quer: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    text: (document.body.innerText || '').replace(/\n+/g, ' | ').slice(0, 200),
  }));
  console.log(`  ${name.padEnd(7)} ${breite}px · Seitenhoehe ${mass.hoch} · Querlauf ${mass.quer}\n    ${mass.text}`);
  await seite.close();
}
await ctx.close();
process.exit(0);
