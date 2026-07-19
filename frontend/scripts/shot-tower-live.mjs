// Turm V2 Live/Hybrid verifizieren: pro Beat Space, dazwischen muss der Turm HALTEN.
import { chromium } from 'playwright';
const OUT = 'C:/Users/hornu/Desktop/für claude/design-vorschau';
const BASE = 'http://localhost:5173';
const PIN = '2506';
const prefix = process.argv[2] || 'tower-live';

const run = async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1760, height: 990 } });
  ctx.addInitScript(p => { try { sessionStorage.setItem('qq_admin_pin', p); } catch {} }, PIN);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/race-finale`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const pin = page.getByPlaceholder(/PIN/i).first();
  if (await pin.count() && await pin.isVisible().catch(() => false)) {
    await pin.fill(PIN); await pin.press('Enter').catch(() => {});
    await page.getByRole('button', { name: /Weiter/ }).first().click().catch(() => {});
    await page.waitForTimeout(800);
  }
  await page.getByRole('button', { name: /V2 Live/ }).first().click().catch(() => {});
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${prefix}-${name}.png` }); console.log('shot', name); };
  const next = async () => { await page.keyboard.press('Space'); };

  // Beat 0: Aufbau (auto) → muss bei Zwischenstand HALTEN (langer Wait beweist Gate)
  await page.waitForTimeout(7000);
  await shot('beat0-hold-zwischenstand');
  const names = [
    'beat1-award-underdog', 'beat2-award-speedy', 'beat3-award-meisterklauer',
    'beat4-glide-top3', 'beat5-reveal3', 'beat6-reveal2', 'beat7-crown',
  ];
  for (const nm of names) {
    await next();
    await page.waitForTimeout(3200); // within-beat Animation, dann HALT
    await shot(nm);
  }
  await b.close();
  console.log('done', prefix);
};
run().catch(e => { console.error(e); process.exit(1); });
