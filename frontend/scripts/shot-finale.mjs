// Echtes FINAL_REVEAL knipsen: Standard-Spiel starten (run=1), dev/skipTo
// final-reveal, dann Autoplay durch title→bets→awards→race-final. Beamer-Shots.
// Usage: node scripts/shot-finale.mjs <prefix>
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const prefix = process.argv[2] || 'finale-base';
const OUT = `C:/Users/hornu/Desktop/für claude/design-vorschau/${prefix}`;
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5173';
const PIN = '2506';
const pad = n => String(n).padStart(2, '0');
const slug = s => (s || 'x').toLowerCase().replace(/[^a-z0-9äöü]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'x';

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1760, height: 990 } });
  // 2026-07-19: Auto-Start braucht ZWEI PINs: sessionStorage 'qq_admin_pin'
  // (Mod-Join) UND localStorage 'qq-admin-pin' (getDevPin fuer Bot-Fill). Ohne
  // letzteren promptet getDevPin() → headless null → Auto-Start bricht ab.
  ctx.addInitScript(p => {
    try { sessionStorage.setItem('qq_admin_pin', p); } catch {}
    try { localStorage.setItem('qq-admin-pin', p); } catch {}
  }, PIN);

  const B = await ctx.newPage();
  await B.goto(`${BASE}/beamer?room=default`, { waitUntil: 'networkidle' });
  await B.waitForTimeout(700);

  const M = await ctx.newPage();
  M.on('dialog', d => d.accept().catch(() => {}));
  // Standard-Spiel (KEIN arena=1), run=1 = Auto-Start + Autoplay
  await M.goto(`${BASE}/moderator-test?run=1`, { waitUntil: 'networkidle' });
  await M.waitForTimeout(700);
  const pin = M.getByPlaceholder(/PIN/i).first();
  if (await pin.count() && await pin.isVisible().catch(() => false)) {
    await pin.fill(PIN); await pin.press('Enter').catch(() => {});
    await M.getByRole('button', { name: /Weiter/ }).first().click().catch(() => {});
  }
  await M.getByText(/Staff-Bereich/).first().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  console.log('pin durch');

  const beamerText = async () => { try { return (await B.locator('body').innerText({ timeout: 800 })).slice(0, 300); } catch { return ''; } };
  const inLobby = t => /here we go|Scan .*join|JOINED TEAMS|Scan the QR/i.test(t);

  // Auf Spielstart warten; notfalls Space-Nudge
  await M.waitForTimeout(9000);
  if (inLobby(await beamerText())) {
    await M.bringToFront();
    await M.locator('body').click({ position: { x: 6, y: 300 } }).catch(() => {});
    for (let k = 0; k < 3 && inLobby(await beamerText()); k++) { await M.keyboard.press('Space'); await M.waitForTimeout(1500); }
  }
  console.log('gestartet? lobby=', inLobby(await beamerText()));

  // Direkt ins Finale springen (dev, kein PIN noetig im Dev-Mode)
  const skip = await M.evaluate(async () => {
    const r = await fetch('/api/qq/default/dev/skipTo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'final-reveal', pin: '2506' }),
    });
    return { ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) };
  });
  console.log('skipTo final-reveal:', JSON.stringify(skip));
  await B.waitForTimeout(1200);

  // Autoplay steppt durch; Beamer bei Aenderung knipsen bis Danke.
  let idx = 0, last = '__', sinceShot = 99, endStreak = 0;
  for (let i = 0; i < 90; i++) {
    const t = await beamerText();
    const key = slug(t.replace(/\d+/g, '')).slice(0, 30);
    const changed = key && key !== last;
    const endish = /danke|thanks|nochmal|feedback/i.test(t);
    if (changed || sinceShot >= 6 || endish) {
      idx++;
      await B.waitForTimeout(400);
      await B.screenshot({ path: `${OUT}/${pad(idx)}-${key}.png` });
      console.log(changed ? `CHANGE -> ${pad(idx)}-${key}` : `keyframe ${pad(idx)}-${key}`);
      sinceShot = 0;
    } else sinceShot++;
    if (changed) last = key;
    if (endish) { endStreak++; if (endStreak > 4) break; } else endStreak = 0;
    await M.waitForTimeout(1500);
  }
  console.log('done —', idx, 'shots →', OUT);
  await browser.close();
};
run().catch(e => { console.error(e); process.exit(1); });
