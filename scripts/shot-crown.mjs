import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE='http://localhost:5173'; const NAME=process.argv[2]??'crown'; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
mkdirSync('.shots',{recursive:true});
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({viewport:{width:1760,height:1200},deviceScaleFactor:1});
await ctx.addInitScript(()=>{try{sessionStorage.setItem('qq_admin_unlocked','1');localStorage.setItem('qq-admin-pin','2506');}catch{}});
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await page.goto(`${BASE}/award-test`,{waitUntil:'domcontentloaded'}); await sleep(1200);
await page.getByRole('button',{name:/Krönung/}).click();
await sleep(1600); // waehrend Roulette (grosse Banner)
const el=await page.evaluateHandle(()=>[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).containerType==='size')||document.body);
try{const box=await el.asElement().boundingBox(); await page.screenshot({path:`.shots/${NAME}-roulette.png`,clip:box||undefined});}catch{await page.screenshot({path:`.shots/${NAME}-roulette.png`});}
await sleep(5000); // Podium
try{const box=await el.asElement().boundingBox(); await page.screenshot({path:`.shots/${NAME}-podium.png`,clip:box||undefined});}catch{await page.screenshot({path:`.shots/${NAME}-podium.png`});}
if(errs.length)console.log('ERR:\n'+errs.slice(0,5).join('\n'));
console.log('✓',NAME);
await b.close();
