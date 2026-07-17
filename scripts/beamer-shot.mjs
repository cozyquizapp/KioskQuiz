/**
 * beamer-shot.mjs — Screenshots vom ECHTEN /beamer (Wolf 2026-07-17:
 * „IMMER der echte beamer, nie nur ein nachbau").
 *
 * Kein Mock, keine nachgebaute Stage: echtes Backend, echter Raum, echte Bots,
 * echter /beamer. Der Arena-BG haengt am aeusseren Div der SlideStage — nur der
 * echte Beamer liefert die Geometrie, an der sich entscheidet, ob Content auf der
 * gemalten Tafel sitzt.
 *
 * VORAUSSETZUNG (beides lokal, NIE gegen Prod — Bots im Live-Backend + Neustart
 * trennt bei Events die Spieler):
 *   1) Backend:  cd backend  && env -u MONGODB_URI npm run dev     (Port 4000, In-Memory)
 *   2) Frontend: cd frontend && VITE_API_BASE=http://localhost:4000/api \
 *                VITE_SOCKET_URL=http://localhost:4000 npm run dev  (Port 5173)
 *
 * NUTZUNG:
 *   node scripts/beamer-shot.mjs                 → alle Schritte, Shots in .shots/
 *   node scripts/beamer-shot.mjs --keep-open     → Browser offen lassen (Debug)
 *
 * Viewport ist exakt 1760x990 = STAGE_DESIGN → SlideStage-scale = 1, der
 * Screenshot ist pixelgenau das, was der 16:9-Beamer zeigt.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
const OUT = '.shots';
const STAGE = { width: 1760, height: 990 };
const KEEP = process.argv.includes('--keep-open');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: !KEEP });
  const ctx = await browser.newContext({ viewport: STAGE, deviceScaleFactor: 1 });

  // PinGate prueft NUR sessionStorage. Zusaetzlich braucht der Test-Auto-Start
  // den Dev-PIN fuer /dev/fillTeams (getDevPin liest localStorage['qq-admin-pin'],
  // sonst window.prompt → laeuft headless ins Leere und der Start bricht STILL ab).
  // 2506 = lokaler Dev-Fallback des Backends (resolveAdminPin), in Prod unerreichbar.
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem('qq_admin_unlocked', '1');
      sessionStorage.setItem('qq_admin_pin', '2506');
      localStorage.setItem('qq-admin-pin', '2506');
    } catch {}
  });

  const log = [];
  const shot = async (page, name) => {
    const p = `${OUT}/${name}.png`;
    await page.screenshot({ path: p });
    log.push(`  ${p}`);
    return p;
  };

  // ── Beamer zuerst oeffnen, damit er jeden State-Broadcast mitbekommt ──────
  const beamer = await ctx.newPage();
  beamer.on('pageerror', (e) => console.log('  [beamer pageerror]', String(e).slice(0, 200)));
  await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });

  // ── Moderator-Test: Arena + Mega + Auto-Start mit Bots ────────────────────
  // ?run=1 ist seit 16.7. Opt-in (ohne bleibt die Seite im Setup stehen).
  const mod = await ctx.newPage();
  mod.on('pageerror', (e) => console.log('  [mod PAGEERROR]', String(e).slice(0, 300)));
  mod.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log(`  [mod ${m.type()}]`, m.text().slice(0, 220));
  });
  // alert()/prompt() wuerden headless haengen → sichtbar machen statt verschlucken.
  mod.on('dialog', async (d) => {
    console.log(`  [mod DIALOG ${d.type()}] "${d.message()}"`);
    await d.dismiss();
  });
  mod.on('requestfailed', (r) => console.log('  [mod REQ-FAIL]', r.method(), r.url().slice(0, 120), r.failure()?.errorText));
  mod.on('response', async (r) => {
    if (r.status() >= 400) console.log('  [mod HTTP', r.status() + ']', r.url().slice(0, 120));
  });

  await mod.goto(`${BASE}/moderator-test?arena=1&mega=1&run=1`, { waitUntil: 'domcontentloaded' });

  await sleep(8000); // Bots spawnen + Raum aufbauen lassen

  await shot(mod, '00-moderator');
  await shot(beamer, '01-beamer-start');

  // Was sagt der Server WIRKLICH? (Format/Teams/Phase — statt es aus dem Bild zu raten)
  const st = await mod.evaluate(async () => {
    try {
      const r = await fetch('/api/qq/default/state');
      if (!r.ok) return { httpError: r.status };
      const s = await r.json();
      return {
        phase: s.phase, largeGroupMode: s.largeGroupMode, nestedTeams: s.nestedTeams,
        formatSelected: s.formatSelected, setupDone: s.setupDone, teams: (s.teams ?? []).length,
      };
    } catch (e) { return { fetchError: String(e) }; }
  });
  console.log('\nSERVER-STATE:', JSON.stringify(st));

  console.log('Screenshots:');
  console.log(log.join('\n'));
  console.log('\nBeamer-URL :', `${BASE}/beamer`);
  console.log('Mod-URL    :', `${BASE}/moderator-test?arena=1&mega=1&run=1`);

  if (KEEP) {
    console.log('\n--keep-open: Browser bleibt offen. Strg+C zum Beenden.');
    await sleep(600000);
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
