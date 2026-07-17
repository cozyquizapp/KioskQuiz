/**
 * shot-guess.mjs — echter /beamer Schaetzchen-Guess-Reveal (bild 9).
 * Steppt per Moderator-Space durch und schiesst, sobald der Reveal (zu hoch/zu
 * niedrig · TOO LOW/TOO HIGH) sichtbar ist.
 * VORAUSSETZUNG: Backend (4000 FRISCH) + Frontend (5173).
 * NUTZUNG: node scripts/shot-guess.mjs [label]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = 'http://localhost:5173';
const NAME = process.argv[2] ?? 'guess';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('.shots', { recursive: true });

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1760, height: 990 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { sessionStorage.setItem('qq_admin_unlocked','1'); sessionStorage.setItem('qq_admin_pin','2506'); localStorage.setItem('qq-admin-pin','2506'); } catch {} });
const beamer = await ctx.newPage();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
const mod = await ctx.newPage();
mod.on('dialog', async (d) => { await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?arena=1&mega=1&run=1`, { waitUntil: 'domcontentloaded' });
await sleep(8000);

const hasGuess = () => beamer.evaluate(() => {
  const t = (document.body.innerText || '').toLowerCase();
  // gezielt die SchaetzchenReveal (bild 9), NICHT der Hive-Mind-Reveal
  return t.includes('guess it') || t.includes('schätzchen') || t.includes('schatzchen');
});
const phase = () => beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?');

let shot = false;
for (let i = 0; i < 80; i++) {
  for (let j = 0; j < 5; j++) {
    if (await hasGuess()) {
      await sleep(2500); // Reveal-Dramaturgie (Sieger-Beat) abwarten
      await beamer.screenshot({ path: `.shots/${NAME}-reveal.png` });
      console.log(`✓ .shots/${NAME}-reveal.png (Guess-Reveal, phase=${await phase()})`);
      shot = true; break;
    }
    await sleep(300);
  }
  if (shot) break;
  await mod.keyboard.press('Space');
  await sleep(350);
}
if (!shot) console.error(`Guess-Reveal nicht gefunden (letzte phase=${await phase()})`);
await b.close();
