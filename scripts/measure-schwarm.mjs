/** Misst die vertikalen Positionen der Kollisions-Kandidaten im Schwarm-Reveal. */
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1760, height: 1200 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { sessionStorage.setItem('qq_admin_unlocked','1'); localStorage.setItem('qq-admin-pin','2506'); } catch {} });
const page = await ctx.newPage();
await page.goto(`${BASE}/reveal-test`, { waitUntil: 'domcontentloaded' });
await sleep(1000);
await page.getByRole('button', { name: /^Schwarm$/ }).click();
await sleep(8000);
const data = await page.evaluate(() => {
  const stage = [...document.querySelectorAll('div')].find(d => getComputedStyle(d).containerType === 'size');
  const sb = stage.getBoundingClientRect();
  const pct = (r) => ({ t: +(((r.top - sb.top) / sb.height) * 100).toFixed(1), b: +(((r.bottom - sb.top) / sb.height) * 100).toFixed(1), l: +(((r.left - sb.left) / sb.width) * 100).toFixed(1), r: +(((r.right - sb.left) / sb.width) * 100).toFixed(1) });
  const out = [];
  for (const el of stage.querySelectorAll('*')) {
    const txt = (el.textContent || '').trim();
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
    if (!own) continue;
    if (/Punkte|Schwarm|nah genug|goldrichtig|Masse|P$|▼|▲|✨/.test(own) && own.length < 60) {
      out.push({ txt: own.slice(0, 32), ...pct(el.getBoundingClientRect()) });
    }
  }
  return { stage: { w: +sb.width.toFixed(0), h: +sb.height.toFixed(0) }, els: out };
});
console.log(JSON.stringify(data, null, 1));
await b.close();
