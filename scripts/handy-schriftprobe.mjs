/* handy-schriftprobe — die Schrift des Handys zum Anschauen.
 *
 * 2026-08-29, Wolf: „was war mit font fuer mobiles? ist die nicht so gut?"
 *
 * scripts/handy-schrift.mjs beantwortet das in Zahlen. Eine Schrift entscheidet
 * man aber nicht an einer Tabelle, also zeigt dieses Werkzeug dasselbe als Bild:
 * die echten Groessen und Gewichte von /team, mit echten Zeilen aus der App.
 *
 * Die zweite Spalte ist der eigentliche Punkt. Bricolage Grotesque ist variabel
 * und hat eine opsz-Achse; `font-optical-sizing: auto` gibt kleinen Groessen
 * eine andere Zeichnung als grossen. Links steht, was das Handy heute bekommt,
 * rechts dieselbe Zeile mit der Buehnen-Zeichnung (`opsz 96`) erzwungen. Wer
 * eine eigene Schrift fuers Handy erwaegt, sieht hier zuerst, was die
 * vorhandene dafuer schon mitbringt.
 *
 * Braucht nur das Frontend (5173), keinen Abend und kein Backend.
 * NUTZUNG: node scripts/handy-schriftprobe.mjs
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';

/* Die Zeilen sind gemessen, nicht ausgedacht: Groesse und Gewicht stammen aus
 * .shots/schrift/BERICHT-CROWD.md, die Texte sind die, die dort standen. */
const SKALA = [
  [10, 700, 'COZYWOLF · © 2026', 'Fusszeile'],
  [12, 900, "TONIGHT'S TEAMS", 'Ueberschrift klein'],
  [13, 900, 'READY', 'Status'],
  [13, 800, 'Rule 1 of 4', 'Fortschritt'],
  [14, 700, 'Phones at the ready, here we go!', 'Hinweis'],
  [15, 400, 'We are explaining the rules now.', 'Fliesstext'],
  [16, 900, 'Gut Feeling', 'Teamname in Liste'],
  [20, 900, 'Listen up!', 'Kartentitel'],
  [22, 900, 'Gut Feeling', 'Kopfzeile'],
  [26, 900, 'GUT FEELING', 'Team-Vorstellung'],
];

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
});
const seite = await browser.newPage({ viewport: { width: 900, height: 760 }, deviceScaleFactor: 2 });
/* Ueber /team laden, damit die @font-face-Regeln und die Farbtoken der App
 * gelten - eine leere Seite haette weder die Schrift noch den Grund. */
await seite.goto(`${BASE}/team`, { waitUntil: 'domcontentloaded' });
await seite.waitForTimeout(4000);

await seite.evaluate((skala) => {
  const bogen = document.createElement('div');
  bogen.id = 'qq-schriftprobe';
  bogen.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0F0817;color:#F3EFE7;'
    + "font-family:'Bricolage Grotesque',sans-serif;padding:26px 30px;overflow:hidden";
  const kopf = `
    <div style="font-size:22px;font-weight:800;margin-bottom:4px">Die Schrift auf /team &#183; Bricolage Grotesque</div>
    <div style="font-size:13px;color:#B9B3C6;margin-bottom:18px">
      Links wie das Handy sie heute bekommt (opsz automatisch) &#183; rechts dieselbe Zeile mit der Buehnen-Zeichnung (opsz 96) erzwungen
    </div>
    <div style="display:grid;grid-template-columns:96px 1fr 1fr;gap:0 22px;font-size:11px;color:#7B7588;
                text-transform:uppercase;letter-spacing:0.08em;font-weight:800;padding-bottom:6px;
                border-bottom:1px solid rgba(255,255,255,0.10)">
      <div>Rolle</div><div>heute</div><div>Buehnen-Zeichnung</div>
    </div>`;
  const zeilen = skala.map(([px, gew, text, rolle]) => `
    <div style="display:grid;grid-template-columns:96px 1fr 1fr;gap:0 22px;align-items:baseline;
                padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="font-size:10px;color:#7B7588;font-weight:700;line-height:1.3">${rolle}<br>${px}px / ${gew}</div>
      <div style="font-size:${px}px;font-weight:${gew}">${text}</div>
      <div style="font-size:${px}px;font-weight:${gew};font-variation-settings:'opsz' 96">${text}</div>
    </div>`).join('');
  bogen.innerHTML = kopf + zeilen;
  document.body.appendChild(bogen);
}, SKALA);

mkdirSync('.shots/schrift', { recursive: true });
await seite.locator('#qq-schriftprobe').screenshot({ path: '.shots/schrift/PROBE.png' });
await browser.close();
console.log('.shots/schrift/PROBE.png');
