/**
 * e2e-beamer-team.mjs — echter /beamer + echte /team-View GLEICHZEITIG auf Raum
 * 'default', CozyQuiz Team-Modus (nicht Arena). Team joint per localStorage-Auto-
 * Rejoin in der Lobby, dann treibt moderator-test?run=1 den Autoplay. Pro Phase
 * werden BEIDE Ansichten geknipst + Pageerrors aller Seiten geloggt.
 * VORAUSSETZUNG: Backend (4000, FRISCH) + Frontend (5173).
 * NUTZUNG: node scripts/e2e-beamer-team.mjs [--secs=260]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const OUT = '.shots/e2e';
const SECS = Number((process.argv.find(a => a.startsWith('--secs=')) ?? '--secs=260').split('=')[1]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const health = await fetch('http://localhost:4000/api/health').then((r) => r.json()).catch(() => null);
if (!health?.ok) { console.error('Backend nicht erreichbar (4000).'); process.exit(1); }
console.log(`Backend ok (uptime ${Math.round(health.uptime)}s, db=${health.db})`);
if (health.uptime > 600) console.log('⚠️  Uptime hoch — evtl. Raum aus altem Lauf. Frisch starten!');

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];

// Beamer + Moderator: Admin-PINs
const ctxMain = await browser.newContext({ viewport: { width: 1760, height: 990 }, deviceScaleFactor: 1 });
await ctxMain.addInitScript(() => { try { sessionStorage.setItem('qq_admin_unlocked','1'); sessionStorage.setItem('qq_admin_pin','2506'); localStorage.setItem('qq-admin-pin','2506'); } catch {} });

// Team: mobil, Auto-Rejoin-Session in localStorage
const ctxTeam = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
await ctxTeam.addInitScript(() => { try { localStorage.setItem('qq_teamName','Testtrupp'); localStorage.setItem('qq_avatarId','fox'); localStorage.setItem('qq_emoji','🦊'); } catch {} });

const beamer = await ctxMain.newPage();
beamer.on('pageerror', (e) => { const s = '[beamer] ' + String(e).slice(0, 160); errors.push(s); console.log('  ⚠ ' + s); });
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });

const team = await ctxTeam.newPage();
team.on('pageerror', (e) => { const s = '[team] ' + String(e).slice(0, 160); errors.push(s); console.log('  ⚠ ' + s); });
team.on('dialog', async (d) => { await d.dismiss(); });
await team.goto(`${BASE}/team`, { waitUntil: 'domcontentloaded' });
await sleep(6000); // Team-Auto-Rejoin in der Lobby, VOR dem Spielstart (mehr Puffer)

const mod = await ctxMain.newPage();
mod.on('pageerror', (e) => { const s = '[mod] ' + String(e).slice(0, 160); errors.push(s); console.log('  ⚠ ' + s); });
mod.on('dialog', async (d) => { await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?run=1`, { waitUntil: 'domcontentloaded' }); // Team-Modus (kein arena/mega)

await sleep(6000);
const teamState = await team.evaluate(() => {
  const body = document.body.innerText || '';
  return { setupNochDa: /Spiel beitreten|Join game|Wähle deinen Avatar|Choose your avatar/.test(body), snippet: body.replace(/\s+/g, ' ').slice(0, 100) };
});
console.log('Team-Join-Status:', teamState.setupNochDa ? 'NOCH IM SETUP (nicht gejoint!)' : 'gejoint', '|', teamState.snippet);

// Falls Mid-Game-Rejoin-Prompt ODER Setup-Join: einsteigen, damit die ECHTE
// Team-Spielansicht (Phase-Cards) rendert statt der Rejoin-/Setup-Seite.
for (let i = 0; i < 3; i++) {
  try {
    const btn = team.locator('button', { hasText: /Wieder einsteigen|Spiel beitreten|Rejoin|Join game|einsteigen/i }).first();
    if (await btn.count()) { await btn.click({ timeout: 2000 }); console.log('  → Team: Rejoin/Join geklickt'); await sleep(2500); }
    else break;
  } catch { break; }
}

const seen = new Set();
const t0 = Date.now();
console.log(`\nVerfolge Beamer + Team ${SECS}s lang …`);
while ((Date.now() - t0) / 1000 < SECS) {
  const st = await beamer.evaluate(() => {
    const el = document.querySelector('[data-qq-phase]');
    return el ? { phase: el.getAttribute('data-qq-phase'), stand: el.getAttribute('data-qq-standings-revealed') } : null;
  }).catch(() => null);
  if (st?.phase) {
    const key = st.phase === 'PLACEMENT' ? `PLACEMENT-${st.stand === '1' ? 'stand' : 'wert'}` : st.phase;
    if (!seen.has(key)) {
      seen.add(key);
      await sleep(3500);
      const n = String(seen.size).padStart(2, '0');
      await beamer.screenshot({ path: `${OUT}/${n}-${key}-beamer.png` });
      await team.screenshot({ path: `${OUT}/${n}-${key}-team.png` });
      console.log(`  ✓ ${n}-${key}  (beamer+team geknipst)`);
    }
  }
  await sleep(700);
}
console.log(`\n${seen.size} Phasen geknipst → ${OUT}/`);
console.log(errors.length ? `❌ ${errors.length} Pageerror(s):` : '✅ KEINE Pageerrors auf Beamer/Team/Moderator.');
errors.forEach((e) => console.log('  ' + e));
await browser.close();
