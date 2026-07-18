import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE='http://localhost:5173'; const NAME=process.argv[2]??'standings'; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
mkdirSync('.shots',{recursive:true});
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({viewport:{width:1860,height:1180},deviceScaleFactor:1});
await ctx.addInitScript(()=>{try{sessionStorage.setItem('qq_admin_unlocked','1');localStorage.setItem('qq-admin-pin','2506');}catch{}});
const page=await ctx.newPage();
await page.goto(`${BASE}/award-test`,{waitUntil:'domcontentloaded'}); await sleep(1200);
await page.getByRole('button',{name:/Endstand/}).click(); await sleep(2500);
const el=await page.evaluateHandle(()=>[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).containerType==='size')||document.body);
try{const box=await el.asElement().boundingBox(); await page.screenshot({path:`.shots/${NAME}.png`,clip:box||undefined});}catch{await page.screenshot({path:`.shots/${NAME}.png`});}
console.log('✓',NAME);
await b.close();
