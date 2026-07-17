/**
 * beamer-shot.mjs — Screenshots vom ECHTEN /beamer (Wolf 2026-07-17:
 * „IMMER der echte beamer, nie nur ein nachbau").
 *
 * Kein Mock, keine nachgebaute Stage: echtes Backend, echter Raum, echte Bots,
 * echter /beamer. Der Arena-BG haengt am aeusseren Div der SlideStage — nur der
 * echte Beamer liefert die Geometrie, an der sich entscheidet, ob Content auf der
 * gemalten Tafel sitzt.
 *
 * Faehrt den Test-Lauf (Autoplay) und knipst JEDE Station, sobald sie auftaucht —
 * verfolgt ueber die data-qq-*-Anker am echten Beamer (kein blindes Warten).
 *
 * VORAUSSETZUNG — lokal, NIE gegen Prod (Bots im Live-Backend + Neustart trennt
 * bei Events die Spieler!). Vor JEDEM Lauf frischer Raum, sonst misst man Reste:
 *   PID=$(netstat -ano | grep :4000 | grep -i abh | head -1 | awk '{print $NF}')
 *   taskkill //PID $PID //T //F        # ts-node-dev ueberlebt sonst!
 *   rm -f backend/.qq-rooms/default.json   # Raeume werden PERSISTIERT (!)
 *   cd backend && env -u MONGODB_URI npm run dev      # Port 4000
 *   cd frontend && VITE_API_BASE=http://localhost:4000/api \
 *     VITE_SOCKET_URL=http://localhost:4000 npm run dev   # Port 5173
 *
 * NUTZUNG: node scripts/beamer-shot.mjs [--secs 240]
 * Viewport 1760x990 = STAGE_DESIGN → SlideStage-scale = 1 → pixelgenau der Beamer.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
const OUT = '.shots';
const STAGE = { width: 1760, height: 990 };
const SECS = Number((process.argv.find((a) => a.startsWith('--secs=')) ?? '--secs=240').split('=')[1]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const health = await fetch('http://localhost:4000/api/health').then((r) => r.json()).catch(() => null);
if (!health?.ok) { console.error('Backend nicht erreichbar (Port 4000).'); process.exit(1); }
console.log(`Backend ok (uptime ${Math.round(health.uptime)}s, db=${health.db})`);
if (health.uptime > 600) console.log('⚠️  Uptime hoch — Raum evtl. aus frueherem Lauf. Frisch starten!');

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: STAGE, deviceScaleFactor: 1 });

// ZWEI PINs: sessionStorage['qq_admin_pin'] → qq:joinModerator (ohne ihn joint der
// Socket READ-ONLY und die Mod-Auth-Middleware blockt still JEDES qq:-Event).
// localStorage['qq-admin-pin'] → nur /dev/fillTeams. Beide noetig.
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', '2506');
    localStorage.setItem('qq-admin-pin', '2506');
  } catch {}
});

const beamer = await ctx.newPage();
beamer.on('pageerror', (e) => console.log('  [beamer PAGEERROR]', String(e).slice(0, 200)));
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });

const mod = await ctx.newPage();
mod.on('dialog', async (d) => { console.log(`  [mod DIALOG] ${d.message()}`); await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?arena=1&mega=1&run=1`, { waitUntil: 'domcontentloaded' });

// Jede Station EINMAL knipsen, sobald sie erscheint. Key = Phase (+ Reveal-Beat,
// weil PLACEMENT zwei sehr verschiedene Bilder hat: Wertung vs. Gesamtstand).
const seen = new Set();
const t0 = Date.now();
console.log(`\nVerfolge den echten Beamer ${SECS}s lang …`);

while ((Date.now() - t0) / 1000 < SECS) {
  const st = await beamer.evaluate(() => {
    const el = document.querySelector('[data-qq-phase]');
    if (!el) return null;
    return {
      phase: el.getAttribute('data-qq-phase'),
      mega: el.getAttribute('data-qq-mega'),
      stand: el.getAttribute('data-qq-standings-revealed'),
    };
  }).catch(() => null);

  if (st?.phase) {
    const key = st.phase === 'PLACEMENT' ? `PLACEMENT-${st.stand === '1' ? 'b-gesamtstand' : 'a-wertung'}` : st.phase;
    if (!seen.has(key)) {
      seen.add(key);
      // Entrance-Animationen VOLL auslaufen lassen → echtes Standbild.
      // 4s statt 1.8s (2026-07-17): der PLACEMENT-Beat staffelt die Zeilen mit
      // 0.32s Delay — bei 8 Fraktionen startet die letzte erst nach 2.24s (+0.5s
      // Dauer). Mit 1.8s knipste die Harness ein ZWISCHENBILD: nur 6 von 8 Zeilen
      // sichtbar, und weil der Platz fuer alle 8 reserviert ist, sassen sie
      // scheinbar „zu hoch". Das haette ein Fehlbefund im Design-Audit werden
      // koennen — ein Artefakt des eigenen Werkzeugs. Lieber warten.
      await sleep(4000);
      const name = `${String(seen.size).padStart(2, '0')}-${key}`;
      await beamer.screenshot({ path: `${OUT}/${name}.png` });
      console.log(`  ✓ ${name}.png   (mega=${st.mega})`);
    }
  }
  await sleep(700);
}

console.log(`\n${seen.size} Stationen geknipst → ${OUT}/`);
await browser.close();
