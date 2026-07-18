import { chromium } from 'playwright';
const BASE='http://localhost:5173'; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({viewport:{width:1760,height:1200},deviceScaleFactor:1});
await ctx.addInitScript(()=>{try{sessionStorage.setItem('qq_admin_unlocked','1');localStorage.setItem('qq-admin-pin','2506');}catch{}});
const page=await ctx.newPage();
await page.goto(`${BASE}/award-test`,{waitUntil:'domcontentloaded'}); await sleep(1200);
await page.getByRole('button',{name:/Krönung/}).click();
await sleep(9500); // bis Podium sicher da
const el=await page.evaluateHandle(()=>[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).containerType==='size')||document.body);
try{const box=await el.asElement().boundingBox(); await page.screenshot({path:`.shots/crown-podium2.png`,clip:box||undefined});}catch{await page.screenshot({path:`.shots/crown-podium2.png`});}
console.log('✓ crown-podium2');
await b.close();
