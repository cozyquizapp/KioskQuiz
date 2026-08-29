/* handy-bedienung — laesst sich /team ueber den ganzen Abend gut bedienen?
 *
 * 2026-08-29, Wolf: „ganz wichtig fuer die teamansicht ist die maximale
 * optimierung der ux/ui und die bedienung fuer mobile".
 *
 * ── Warum noch ein Werkzeug ───────────────────────────────────────────────
 * `scripts/design-audit-cozyquiz.mjs` prueft Touch-Ziele auf dem Handy schon -
 * aber nur auf EINER Seite: es oeffnet /team, ohne beizutreten, und misst die
 * Setup-Ansicht. Das ist die einzige Ansicht des Abends, die der Spieler
 * genau einmal sieht. Jede Ansicht, in der wirklich gespielt wird - Frage,
 * Aufloesung, Setzen, Bunte Tuete - hat es nie gemessen.
 *
 * Hier faehrt das Handy deshalb den echten Abend mit (dieselbe Beitritts-
 * maschine wie scripts/handy-referenz.mjs) und wird an jeder Phase gemessen.
 *
 * ── Was geprueft wird, und warum genau das ───────────────────────────────
 *
 * 1. TOUCH-ZIELE (WCAG 2.5.5): mindestens 44x44 CSS-Pixel. Gemessen wird die
 *    TATSAECHLICHE Trefferflaeche, also inklusive Polster - ein 20-px-Zeichen
 *    in einem 48-px-Knopf ist in Ordnung. Verschachtelte Bedienelemente
 *    zaehlen einmal: sitzt ein Knopf in einem Knopf, ist der aeussere die
 *    Flaeche, die der Daumen trifft.
 *
 * 2. ABSTAND (WCAG 2.5.8): mindestens 8 px zwischen zwei Trefferflaechen.
 *    Zwei Knoepfe koennen einzeln gross genug und zusammen trotzdem eine
 *    Fehlerquelle sein - das ist der haeufigste Griff daneben auf dem Handy
 *    und faellt in keiner Groessenpruefung auf.
 *
 * 3. QUERLAUF: die Seite darf nicht seitlich scrollen. „Der Beamer bekommt
 *    nie eine Scrollbar" ist eine Buehnenregel; das Handy darf und soll nach
 *    UNTEN scrollen - zur Seite nie.
 *
 * 4. EINGABEFELDER unter 16 px Schrift. Darunter zoomt iOS Safari beim
 *    Antippen von selbst hinein, und der Spieler steht mit verschobenem Bild
 *    da, waehrend die Uhr laeuft. Das ist keine Geschmacksfrage, es ist ein
 *    dokumentiertes Verhalten von Safari.
 *
 * 5. DAUMENWEG: wo sitzt die Haupt-Aktion? Auf einem 844 px hohen Bild ist
 *    das obere Drittel mit einer Hand nur durch Umgreifen erreichbar. Eine
 *    Aktion, die unter Zeitdruck getippt wird (Antwort abschicken), gehoert
 *    nicht dorthin. Gemeldet wird die Lage, beurteilt wird sie von einem
 *    Menschen - deshalb steht sie als HINWEIS und nicht als Fehler da.
 *
 * 6. BEDIENELEMENTE OHNE NAMEN (WCAG 4.1.2): ein Knopf, der nur ein Zeichen
 *    zeigt und kein `aria-label` traegt, ist fuer einen Screenreader stumm.
 *
 * ⚠️ Was hier NICHT geprueft wird: ob die Ansicht schoen ist, ob die Rangfolge
 * stimmt, ob der Text verstaendlich ist. Das Werkzeug misst Bedienbarkeit,
 * nicht Gestaltung. Fuer die Designsprache gibt es scripts/handy-referenz.mjs,
 * fuer den Kontrast scripts/design-audit-cozyquiz.mjs.
 *
 * VORAUSSETZUNG: Backend (4000, frisch) + Frontend (5173).
 * NUTZUNG: node scripts/handy-bedienung.mjs [--secs=200]
 */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';

const req = createRequire(new URL('../backend/package.json', import.meta.url));
const { io } = req('socket.io-client');
const API = 'http://localhost:4000';
const BASE = 'http://localhost:5173';
const PIN = process.env.ADMIN_PIN || '2506';
const SECS = Number((process.argv.find(a => a.startsWith('--secs=')) ?? '--secs=200').split('=')[1]);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* iPhone 14. Bewusst kein kleineres Geraet: 390x844 ist die haeufigste Breite,
 * und was hier zu eng ist, ist auf einem SE erst recht zu eng. */
const BREITE = 390, HOEHE = 844;
const MIN_ZIEL = 44;      // WCAG 2.5.5
const MIN_ABSTAND = 8;    // WCAG 2.5.8
const MIN_EINGABE = 16;   // iOS Safari zoomt darunter

/** Laeuft IM Browser. Alles, was sich an einer Ansicht messen laesst. */
const BEDIENUNG = ({ minZiel, minAbstand, minEingabe }) => {
  const WAHL = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], '
    + '[role="checkbox"], [role="radio"], [onclick], [tabindex]:not([tabindex="-1"])';

  const sichtbar = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.2) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 1 && r.height >= 1;
  };

  const alle = Array.from(document.querySelectorAll(WAHL)).filter(sichtbar);

  /* Verschachtelte Bedienelemente einmal zaehlen. Der Daumen trifft die
   * AEUSSERE Flaeche; ein Zeichen-Span mit role=button darin ist kein
   * eigenes Ziel, sondern dieselbe Flaeche noch einmal. */
  const ziele = alle.filter(el => !alle.some(o => o !== el && o.contains(el)));

  const beschreib = (el) => {
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      text: ((el.textContent ?? '').replace(/\s+/g, ' ').trim()
        || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').slice(0, 28),
      b: Math.round(r.width), h: Math.round(r.height),
      x: Math.round(r.left), y: Math.round(r.top),
      benannt: !!(el.getAttribute('aria-label') || el.getAttribute('title')
        || (el.textContent ?? '').trim() || el.getAttribute('placeholder')),
      eingabe: ['input', 'textarea', 'select'].includes(el.tagName.toLowerCase()),
      schrift: parseFloat(getComputedStyle(el).fontSize) || 0,
      deaktiviert: el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true',
    };
  };
  const liste = ziele.map(beschreib);

  /* Abstand: nur Paare, die sich NICHT ueberlappen und beide bedienbar sind.
   * Gemessen wird die Luecke, nicht der Mittenabstand. */
  const eng = [];
  for (let i = 0; i < liste.length; i++) {
    for (let j = i + 1; j < liste.length; j++) {
      const a = liste[i], z = liste[j];
      if (a.deaktiviert || z.deaktiviert) continue;
      const dx = Math.max(0, Math.max(a.x, z.x) - Math.min(a.x + a.b, z.x + z.b));
      const dy = Math.max(0, Math.max(a.y, z.y) - Math.min(a.y + a.h, z.y + z.h));
      if (dx > 0 && dy > 0) continue;              // diagonal versetzt, kein Griff daneben
      const luecke = dx > 0 ? dx : dy;
      const ueberlappt = dx === 0 && dy === 0;
      if (!ueberlappt && luecke < minAbstand) eng.push({ a, z, luecke });
    }
  }

  const de = document.documentElement;
  return {
    ziele: liste,
    zuKlein: liste.filter(z => !z.deaktiviert && (z.b < minZiel || z.h < minZiel)),
    ohneNamen: liste.filter(z => !z.benannt),
    engePaare: eng,
    kleineEingaben: liste.filter(z => z.eingabe && z.schrift > 0 && z.schrift < minEingabe),
    querlauf: Math.max(0, de.scrollWidth - de.clientWidth),
    hoehe: de.scrollHeight,
    fenster: de.clientHeight,
  };
};

/* ── Aufbau ───────────────────────────────────────────────────────────────── */
const health = await fetch(`${API}/api/health`).then(r => r.json()).catch(() => null);
if (!health?.ok) { console.error('Backend nicht erreichbar (4000).'); process.exit(1); }
console.log(`Backend ok (build ${health.build ?? '?'})`);
mkdirSync('.shots/bedienung', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
});
const ctxMain = await browser.newContext({ viewport: { width: 1760, height: 990 } });
await ctxMain.addInitScript(() => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', '2506');
    localStorage.setItem('qq-admin-pin', '2506');
  } catch { /* ignore */ }
});
const ctxTeam = await browser.newContext({
  viewport: { width: BREITE, height: HOEHE }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
await ctxTeam.addInitScript(() => {
  try {
    localStorage.setItem('qq_teamName', 'Testtrupp');
    localStorage.setItem('qq_avatarId', 'fox');
  } catch { /* ignore */ }
});

const beamer = await ctxMain.newPage();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
await beamer.waitForSelector('[data-qq-room]', { timeout: 20000 }).catch(() => {});
const roomCode = await beamer.evaluate(() =>
  document.querySelector('[data-qq-room]')?.getAttribute('data-qq-room') ?? 'default').catch(() => 'default');

const sock = io(API, { transports: ['websocket'] });
await new Promise((res, rej) => {
  sock.on('connect', res); sock.on('connect_error', rej);
  setTimeout(() => rej(new Error('Socket-Timeout')), 8000);
});
const emit = (ev, extra = {}) => new Promise(res => sock.emit(ev, { roomCode, ...extra }, res));
await emit('qq:joinModerator', { pin: PIN });
await emit('qq:resetRoom', { confirm: true });
await sleep(900);
await fetch(`${API}/api/qq/${encodeURIComponent(roomCode)}/dev/clearBots`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pin: PIN }),
}).catch(() => {});
await sleep(500);
console.log(`Raum ${roomCode} frisch.`);

const team = await ctxTeam.newPage();
team.on('dialog', async (d) => { await d.dismiss(); });
await team.goto(`${BASE}/team`, { waitUntil: 'domcontentloaded' });
await sleep(6000);

/* Die Setup-Ansicht zaehlt mit: sie ist die erste, die ein Gast sieht, und die
 * einzige, in der er tippt statt tippt. Gemessen wird sie VOR dem Beitritt. */
const berichte = [];
const messen = async (name) => {
  const m = await team.evaluate(BEDIENUNG, {
    minZiel: MIN_ZIEL, minAbstand: MIN_ABSTAND, minEingabe: MIN_EINGABE,
  }).catch(() => null);
  if (!m) return;
  berichte.push({ name, ...m });
  await team.screenshot({ path: `.shots/bedienung/${String(berichte.length).padStart(2, '0')}-${name}.png` });
  console.log(`  ✓ ${name} (${m.ziele.length} Ziele)`);
};
await messen('SETUP');

let beigetreten = false;
for (let i = 0; i < 20 && !beigetreten; i++) {
  const btn = team.locator('button', { hasText: /Wieder einsteigen|Spiel beitreten|Rejoin|Join game|Los geht|einsteigen|Beitreten/i }).first();
  if (await btn.count().catch(() => 0)) { await btn.click({ timeout: 2000 }).catch(() => {}); await sleep(1800); }
  else await sleep(1200);
  const text = await team.evaluate(() => document.body.innerText || '').catch(() => '');
  beigetreten = /READY|BEREIT|Waiting for opponents|Warte auf/i.test(text);
}
console.log(beigetreten ? 'Handy beigetreten.' : '⚠️  Handy nicht sichtbar beigetreten.');

const mod = await ctxMain.newPage();
mod.on('dialog', async (d) => { await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?run=1`, { waitUntil: 'domcontentloaded' });
await sleep(6000);

/* Reissleine, wie in handy-referenz.mjs: die Sperrseite hat dort schon einmal
 * einen ganzen Bericht wertlos gemacht. */
const gesperrt = () => team.evaluate(() =>
  /Quiz läuft schon|Quiz already running|nicht angemeldet|not registered/i.test(document.body.innerText || ''))
  .catch(() => false);
if (await gesperrt()) {
  console.error('\n⚠️  ABBRUCH: das Handy haengt auf der Sperrseite. Backend frisch starten.');
  await browser.close(); process.exit(1);
}

const gesehen = new Set();
const bis = Date.now() + SECS * 1000;
while (Date.now() < bis) {
  const phase = await beamer.evaluate(() =>
    document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? null).catch(() => null);
  if (phase && !gesehen.has(phase)) {
    gesehen.add(phase);
    await sleep(2600);
    if (await gesperrt()) { console.log(`  – ${phase} (Sperrseite)`); continue; }
    await messen(phase);
  }
  await sleep(1500);
}
await browser.close();
sock.close();

/* ── Bericht ──────────────────────────────────────────────────────────────── */
const z = [`# Laesst sich /team bedienen?`, '',
  `Gemessen am ${new Date().toISOString().slice(0, 10)} auf ${BREITE}x${HOEHE} (iPhone 14)`,
  `ueber ${berichte.length} Ansichten: ${berichte.map(b => b.name).join(', ')}.`, '',
  'Erzeugt von `node scripts/handy-bedienung.mjs`. Der Kopf des Werkzeugs erklaert,',
  'welche Regel woher kommt und was ausdruecklich NICHT geprueft wird.', ''];

let fehler = 0;
const abschnitt = (titel, regel, zeilenBauer) => {
  const teile = [];
  for (const b of berichte) {
    const t = zeilenBauer(b);
    if (t.length) teile.push([`### ${b.name}`, ...t, '']);
  }
  z.push(`## ${titel}`, '', regel, '');
  if (!teile.length) { z.push('✓ Nichts gefunden.', ''); return 0; }
  let n = 0;
  for (const t of teile) { z.push(...t); n += t.length - 2; }
  return n;
};

fehler += abschnitt('Touch-Ziele unter 44x44', 'WCAG 2.5.5. Deaktivierte Elemente zaehlen nicht mit.',
  (b) => b.zuKlein.map(t => `* ${t.b}x${t.h} \`<${t.tag}>\` „${t.text}"`));

fehler += abschnitt('Trefferflaechen naeher als 8 px', 'WCAG 2.5.8. Der haeufigste Griff daneben.',
  (b) => b.engePaare.map(p => `* ${p.luecke}px zwischen „${p.a.text}" (${p.a.b}x${p.a.h}) und „${p.z.text}" (${p.z.b}x${p.z.h})`));

fehler += abschnitt('Eingabefelder unter 16 px', 'Darunter zoomt iOS Safari beim Antippen von selbst hinein.',
  (b) => b.kleineEingaben.map(t => `* ${t.schrift}px \`<${t.tag}>\` „${t.text}"`));

fehler += abschnitt('Seitlicher Querlauf', 'Nach unten scrollen ist richtig, zur Seite nie.',
  (b) => (b.querlauf > 0 ? [`* ${b.querlauf}px zu breit`] : []));

fehler += abschnitt('Bedienelemente ohne Namen', 'WCAG 4.1.2. Fuer einen Screenreader stumm.',
  (b) => b.ohneNamen.map(t => `* \`<${t.tag}>\` ${t.b}x${t.h} an ${t.x},${t.y}`));

/* Daumenweg: HINWEIS, kein Fehler. Wo die Haupt-Aktion sitzt, ist eine
 * Gestaltungsfrage - das Werkzeug traegt die Lage bei, das Urteil nicht. */
z.push('## Hinweis: Lage der Aktionen', '',
  'Das obere Drittel eines 844-px-Bildes ist einhaendig nur durch Umgreifen',
  'erreichbar. Aktionen unter Zeitdruck gehoeren nicht dorthin. Beurteilt wird',
  'das von einem Menschen, hier steht nur, wo sie sitzen.', '');
for (const b of berichte) {
  const aktiv = b.ziele.filter(t => !t.deaktiviert && t.b >= 60);
  if (!aktiv.length) continue;
  const oben = aktiv.filter(t => t.y + t.h / 2 < HOEHE / 3);
  z.push(`* **${b.name}**: ${aktiv.length} grosse Aktion(en), davon ${oben.length} im oberen Drittel`
    + (oben.length ? ` — ${oben.map(t => `„${t.text}"`).join(', ')}` : ''));
}
z.push('');

const text = z.join('\n');
writeFileSync('.shots/bedienung/BERICHT.md', text);
console.log('\n' + text);
console.log(`${fehler} Befunde. Bericht: .shots/bedienung/BERICHT.md`);
