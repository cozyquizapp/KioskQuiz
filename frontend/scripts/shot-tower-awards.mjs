// Turm-Finale V2 (2-Akter mit Awards) knipsen — Auto-Play, Frames per Timestamp.
import { chromium } from 'playwright';
const OUT = 'C:/Users/hornu/Desktop/für claude/design-vorschau';
const BASE = 'http://localhost:5173';
const PIN = '2506';
const prefix = process.argv[2] || 'tower-v2c';

// [Sekunde ab Reveal-Start, Name]
const FRAMES = [
  [1.5, '01-intro'],
  [6.0, '02-base-mystery'],
  [8.3, '03-zwischenstand'],
  [10.6, '04-award-underdog-card'],
  [14.8, '05-award-speedy-card'],
  [17.2, '06-speedy-tie'],
  [19.0, '07-award-meisterklauer-card'],
  [23.2, '08-reveal-glide'],
  [25.2, '09-reveal-3rd'],
  [27.6, '10-und-der-sieger'],
  [31.5, '11-crowned'],
];

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
  // V2 ist Default; sicherheitshalber neu abspielen fuer sauberen Start.
  await page.getByRole('button', { name: /Türme V2/ }).first().click().catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Nochmal abspielen/ }).first().click().catch(() => {});
  const t0 = Date.now();
  for (const [sec, name] of FRAMES) {
    const wait = t0 + sec * 1000 - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: `${OUT}/${prefix}-${name}.png` });
    console.log('shot', name);
  }
  await b.close();
  console.log('done', prefix);
};
run().catch(e => { console.error(e); process.exit(1); });
