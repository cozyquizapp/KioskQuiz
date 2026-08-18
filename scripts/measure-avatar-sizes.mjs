/**
 * measure-avatar-sizes.mjs — misst, in welchen ECHTEN Groessen die Team-Marke
 * (Avatar) im Produkt erscheint: Beamer-Grid, Beamer-Rangliste, Handy-Kopf.
 *
 * Anlass (Wolf 2026-08-18): „ich würde gerne neue Team-Avatare implementieren,
 * Jackbox-Stil ging nach hinten los." Bevor gezeichnet wird, muessen die
 * Zielgroessen feststehen. Projekt-Regel: Assets AUSMESSEN, nicht schaetzen
 * (geschaetzte Werte waren mehrfach die Ursache von Fix-Runden).
 *
 * Gemessen wird die Bildschirm-Groesse NACH der Stage-Skalierung, also das,
 * was der Beamer wirklich projiziert.
 *
 * VORAUSSETZUNG: Backend (4000, frischer Raum) + Frontend (5173).
 * NUTZUNG: node scripts/measure-avatar-sizes.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await chromium.launch({
  headless: true,
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
});

const ctxMain = await b.newContext({ viewport: { width: 1760, height: 990 }, deviceScaleFactor: 1 });
await ctxMain.addInitScript(() => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', '2506');
    localStorage.setItem('qq-admin-pin', '2506');
  } catch {}
});
const ctxTeam = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
await ctxTeam.addInitScript(() => {
  try {
    localStorage.setItem('qq_teamName', 'Testtrupp');
    localStorage.setItem('qq_avatarId', 'fox');
    localStorage.setItem('qq_emoji', '🦊');
  } catch {}
});

const beamer = await ctxMain.newPage();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
const team = await ctxTeam.newPage();
team.on('dialog', (d) => d.dismiss());
await team.goto(`${BASE}/team`, { waitUntil: 'domcontentloaded' });
await sleep(5000);
const mod = await ctxMain.newPage();
mod.on('dialog', (d) => d.dismiss());
await mod.goto(`${BASE}/moderator-test?run=1`, { waitUntil: 'domcontentloaded' });

// Bis zur PLACEMENT-Phase steppen: dort sind Brett UND Rangliste gleichzeitig da.
const phase = () => beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?');
await sleep(8000);
for (let i = 0; i < 30; i++) {
  if (await phase() === 'PLACEMENT') break;
  await mod.keyboard.press('Space');
  await sleep(900);
}
console.log('Phase:', await phase());
await sleep(1500);

// Emoji-Marken rendern als Text. Gemessen wird jedes Element, dessen Textinhalt
// aus genau einem Emoji besteht, plus dessen sichtbare Schriftgroesse.
const collect = (label) => (el) => el;
const measure = async (page, where) => page.evaluate((where) => {
  const isEmojiOnly = (t) => {
    const s = (t || '').trim();
    return s.length > 0 && s.length <= 6 && /\p{Extended_Pictographic}/u.test(s)
      && !/[a-zA-Z0-9]/.test(s);
  };
  const out = [];
  document.querySelectorAll('*').forEach((el) => {
    // NICHT nur Blattknoten: der sichtbare Kreis ist oft ein Container, dessen
    // einziger Inhalt das Emoji ist. Gesucht ist der KLEINSTE Kasten, der das
    // Zeichen umschliesst — das ist die Flaeche, die eine Bildmarke fuellen wuerde.
    if (!isEmojiOnly(el.textContent)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return;
    // Container ueberspringen, die deutlich groesser sind als ihr Inhalt
    // (Zeilen, Spalten) — die sind kein Marken-Platz.
    if (r.width > r.height * 2.2 || r.height > r.width * 2.2) return;
    out.push({ where, w: Math.round(r.width), h: Math.round(r.height) });
  });
  return out;
}, where);

const rows = [
  ...(await measure(beamer, 'Beamer')),
  ...(await measure(team, 'Handy')),
];

const seen = new Map();
for (const r of rows) {
  const key = `${r.where}|${r.w}x${r.h}`;
  seen.set(key, (seen.get(key) ?? 0) + 1);
}
console.log('\nGemessene Marken-Flaechen (Bildschirm-Pixel, nach Stage-Skalierung):');
console.log('Ort      Flaeche      Anzahl');
[...seen.entries()]
  .map(([k, n]) => { const [where, size] = k.split('|'); return { where, size, n, area: size.split('x').reduce((a, b) => a * Number(b), 1) }; })
  .sort((a, b) => b.area - a.area)
  .forEach((r) => console.log(`${r.where.padEnd(8)} ${r.size.padEnd(12)} ${r.n}`));

for (const where of ['Beamer', 'Handy']) {
  const ws = rows.filter((r) => r.where === where).map((r) => r.w);
  if (!ws.length) continue;
  console.log(`\n${where}: groesste ${Math.max(...ws)}px, KLEINSTE ${Math.min(...ws)}px.`);
}
console.log('\nMassgeblich fuer einen neuen Satz ist die kleinste Groesse:');
console.log('dort muessen sich alle Marken noch allein an der Silhouette unterscheiden.');
await b.close();
