import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE='http://localhost:5173'; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
mkdirSync('.shots',{recursive:true});
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({viewport:{width:1760,height:990},deviceScaleFactor:1});
await ctx.addInitScript(()=>{try{sessionStorage.setItem('qq_admin_unlocked','1');localStorage.setItem('qq-admin-pin','2506');}catch{}});
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await page.goto(`${BASE}/thanks-test`,{waitUntil:'domcontentloaded'});
await sleep(1200);
// Arena-Toggle an
await page.getByRole('button',{name:/Arena:/}).click();
await sleep(1800);
await page.screenshot({path:`.shots/${process.argv[2]||'thanks-arena'}.png`});
if(errs.length) console.log('ERRORS:\n'+errs.slice(0,6).join('\n'));
console.log('✓ '+(process.argv[2]||'thanks-arena'));
await b.close();
