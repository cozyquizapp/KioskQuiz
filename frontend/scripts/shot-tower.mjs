// Turm-Finale-Baseline/V2 knipsen: /race-finale, Choreo per Space durchsteppen.
// Usage: node scripts/shot-tower.mjs <prefix> [mode]  (mode: tower|towerv2|race)
import { chromium } from 'playwright';
const OUT = 'C:/Users/hornu/Desktop/für claude/design-vorschau';
const BASE = 'http://localhost:5173';
const PIN = '2506';
const prefix = process.argv[2] || 'tower-base';
const mode = process.argv[3] || 'tower';

const run = async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1760, height: 990 } });
  ctx.addInitScript(p => { try { sessionStorage.setItem('qq_admin_pin', p); } catch {} }, PIN);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/race-finale`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  // Optional PIN-Gate
  const pin = page.getByPlaceholder(/PIN/i).first();
  if (await pin.count() && await pin.isVisible().catch(() => false)) {
    await pin.fill(PIN); await pin.press('Enter').catch(() => {});
    await page.getByRole('button', { name: /Weiter/ }).first().click().catch(() => {});
    await page.waitForTimeout(1000);
  }
  // Modus waehlen (Panel-Buttons): tower/towerv2/race
  const label = mode === 'race' ? /Race/ : mode === 'towerv2' ? /V2|Neu/ : /Türme/;
  await page.getByRole('button', { name: label }).first().click().catch(() => {});
  await page.waitForTimeout(600);
  const stage = page.locator('div').first();
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${prefix}-${name}.png` }); console.log('shot', name); };

  // Intro
  await shot('01-intro');
  // Intro haelt 2.6s → building. Ein paar Ticks bauen lassen.
  await page.waitForTimeout(3200);
  await shot('02-building');
  // Durch die Choreo steppen: viele Space-Druecke mit Pausen (Karten/Flug/Kroenung).
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Space').catch(() => {});
    await page.waitForTimeout(1400);
    if (i === 5) await shot('03-mid');
  }
  await page.waitForTimeout(1500);
  await shot('04-crowned');
  await b.close();
  console.log('done', prefix);
};
run().catch(e => { console.error(e); process.exit(1); });
