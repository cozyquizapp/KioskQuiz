// Font-Verify: /phaseintro-test Kolosseum vs ?schlicht=1 (Nunito-Fallback).
import { chromium } from 'playwright';
const OUT = 'C:/Users/hornu/Desktop/für claude/design-vorschau';
const BASE = 'http://localhost:5173';
const PIN = '2506';
const grab = async (page, url, name) => {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const pin = page.getByPlaceholder(/PIN/i).first();
  if (await pin.count() && await pin.isVisible().catch(() => false)) {
    await pin.fill(PIN); await pin.press('Enter').catch(() => {});
    await page.getByRole('button', { name: /Weiter/ }).first().click().catch(() => {});
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
};
const run = async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1760, height: 990 } });
  ctx.addInitScript(p => { try { sessionStorage.setItem('qq_admin_pin', p); localStorage.setItem('qq-admin-pin', p); } catch {} }, PIN);
  const page = await ctx.newPage();
  await grab(page, `${BASE}/phaseintro-test`, 'font-verify-1-kolosseum');
  await grab(page, `${BASE}/phaseintro-test?schlicht=1`, 'font-verify-2-schlicht');
  await b.close();
  console.log('done');
};
run().catch(e => { console.error(e); process.exit(1); });
