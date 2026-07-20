// Voller CozyArena-Durchlauf. run=1 = Arena + 24 Bots + Start + Autoplay.
// Robust: PIN sicher durch, auf echtes Join warten, Start notfalls per Space
// anstossen, dann Autoplay laufen lassen und Beamer bei Phasenwechsel knipsen.
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';

const OUT = 'C:/Users/hornu/Desktop/für claude/design-vorschau/arena-run';
try { rmSync(OUT, { recursive: true, force: true }); } catch {}
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5173';
const PIN = '2506';
const pad = n => String(n).padStart(2, '0');
const slug = s => (s || 'x').toLowerCase().replace(/[^a-z0-9äöü]+/gi, '-').replace(/^-|-$/g, '').slice(0, 36) || 'x';

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1760, height: 990 } });
  ctx.addInitScript(p => { try { sessionStorage.setItem('qq_admin_pin', p); localStorage.setItem('qq-admin-pin', p); } catch {} }, PIN);

  const B = await ctx.newPage();
  await B.goto(`${BASE}/beamer?room=default`, { waitUntil: 'networkidle' });
  await B.waitForTimeout(800);

  const M = await ctx.newPage();
  M.on('dialog', d => d.accept().catch(() => {}));
  await M.goto(`${BASE}/moderator-test?arena=1&run=1`, { waitUntil: 'networkidle' });
  await M.waitForTimeout(800);
  // PIN sicher: fuellen + Enter + Weiter, dann warten bis Gate weg
  const pin = M.getByPlaceholder(/PIN/i).first();
  if (await pin.count() && await pin.isVisible().catch(() => false)) {
    await pin.fill(PIN);
    await pin.press('Enter').catch(() => {});
    await M.getByRole('button', { name: /Weiter/ }).first().click().catch(() => {});
  }
  await M.getByText(/Staff-Bereich/).first().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  console.log('pin durch, moderator mounted');

  const beamerText = async () => { try { return (await B.locator('body').innerText({ timeout: 800 })).slice(0, 400); } catch { return ''; } };
  const inLobby = t => /here we go|Scan .*join|JOINED TEAMS|Scan the QR/i.test(t);

  // Auto-Start Zeit geben; wenn nach ~9s noch Lobby → per Space anstossen
  await M.waitForTimeout(9000);
  if (inLobby(await beamerText())) {
    console.log('noch Lobby → Space-Nudge');
    await M.bringToFront();
    await M.locator('body').click({ position: { x: 6, y: 300 } }).catch(() => {});
    for (let k = 0; k < 3 && inLobby(await beamerText()); k++) { await M.keyboard.press('Space'); await M.waitForTimeout(1500); }
  }
  console.log('gestartet? lobby=', inLobby(await beamerText()));

  // Beobachten: Autoplay treibt. Phase aus Mod-Status-Streifen.
  const readPhase = async () => {
    for (const sel of ['.qm-status-title', '.qm-status-phase', '.qm-status']) {
      try { const t = (await M.locator(sel).first().innerText({ timeout: 500 })).trim(); if (t) return t.split('\n')[0].slice(0, 48); } catch {}
    }
    return '';
  };
  let idx = 0, last = '__', sinceShot = 99, endStreak = 0;
  for (let i = 0; i < 200; i++) {
    const phase = await readPhase();
    const changed = phase && phase !== last;
    const endish = /danke|vorbei|game\s*over|champion|krönung|sieger|endstand|thanks/i.test(phase);
    if (changed || sinceShot >= 8 || endish) {
      idx++;
      await B.waitForTimeout(450);
      const name = `${pad(idx)}-${slug(phase)}`;
      await B.screenshot({ path: `${OUT}/${name}.png` });
      console.log(changed ? `PHASE ${phase} -> ${name}` : `  keyframe ${name} (${phase || 'leer'})`);
      sinceShot = 0;
    } else sinceShot++;
    if (changed) last = phase;
    if (endish) { endStreak++; if (endStreak > 8) break; } else endStreak = 0;
    await M.waitForTimeout(1200);
  }
  console.log('done —', idx, 'shots');
  await browser.close();
};
run().catch(e => { console.error(e); process.exit(1); });
