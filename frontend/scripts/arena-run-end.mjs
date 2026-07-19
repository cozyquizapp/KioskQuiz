// Zweiter Lauf: bis zum ENDE durchtreiben (Finale/Krönung/GameOver) per Space,
// eigener Ordner arena-run-b (loescht arena-run NICHT).
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
const OUT = 'C:/Users/hornu/Desktop/für claude/design-vorschau/arena-run-b';
try { rmSync(OUT, { recursive: true, force: true }); } catch {}
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5173';
const PIN = '2506';
const pad = n => String(n).padStart(2, '0');
const slug = s => (s || 'x').toLowerCase().replace(/[^a-z0-9äöü]+/gi, '-').replace(/^-|-$/g, '').slice(0, 36) || 'x';

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1760, height: 990 } });
  ctx.addInitScript(p => { try { sessionStorage.setItem('qq_admin_pin', p); } catch {} }, PIN);
  const B = await ctx.newPage();
  await B.goto(`${BASE}/beamer?room=default`, { waitUntil: 'networkidle' });
  await B.waitForTimeout(800);
  const M = await ctx.newPage();
  M.on('dialog', d => d.accept().catch(() => {}));
  await M.goto(`${BASE}/moderator-test?arena=1&run=1`, { waitUntil: 'networkidle' });
  await M.waitForTimeout(800);
  const pin = M.getByPlaceholder(/PIN/i).first();
  if (await pin.count() && await pin.isVisible().catch(() => false)) {
    await pin.fill(PIN); await pin.press('Enter').catch(() => {});
    await M.getByRole('button', { name: /Weiter/ }).first().click().catch(() => {});
  }
  await M.getByText(/Staff-Bereich/).first().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  await M.waitForTimeout(6000);
  await M.bringToFront();
  await M.locator('body').click({ position: { x: 6, y: 320 } }).catch(() => {});

  const readPhase = async () => {
    for (const sel of ['.qm-status-title', '.qm-status']) {
      try { const t = (await M.locator(sel).first().innerText({ timeout: 400 })).trim(); if (t) return t.split('\n')[0].slice(0, 48); } catch {}
    }
    return '';
  };
  // Space JEDE Iteration → schnell bis zum Ende. Capture nur bei Phasenwechsel.
  let idx = 0, last = '__', endStreak = 0;
  for (let i = 0; i < 260; i++) {
    const phase = await readPhase();
    if (phase && phase !== last) {
      idx++; await B.waitForTimeout(350);
      const name = `${pad(idx)}-${slug(phase)}`;
      await B.screenshot({ path: `${OUT}/${name}.png` });
      console.log('PHASE', phase, '->', name);
      last = phase;
    }
    const endish = /danke|vorbei|game\s*over|champion|krönung|sieger|endstand|thanks|award/i.test(phase);
    if (endish) { endStreak++; if (endStreak > 14) break; } else endStreak = 0;
    await M.keyboard.press('Space').catch(() => {});
    await M.waitForTimeout(1000);
  }
  console.log('done —', idx, 'shots');
  await browser.close();
};
run().catch(e => { console.error(e); process.exit(1); });
