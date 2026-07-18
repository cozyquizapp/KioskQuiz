import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE='http://localhost:5173'; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
mkdirSync('.shots',{recursive:true});
const b=await chromium.launch({headless:true});
// iPhone-artiges Portrait-Viewport
const ctx=await b.newContext({viewport:{width:430,height:932},deviceScaleFactor:2});
await ctx.addInitScript(()=>{try{sessionStorage.setItem('qq_admin_unlocked','1');localStorage.setItem('qq-admin-pin','2506');}catch{}});
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await page.goto(`${BASE}/summary-test`,{waitUntil:'domcontentloaded'});
await sleep(1200);
// Arena an
await page.getByRole('button',{name:/🏛️ An/}).click();
await sleep(1000);
const name=process.argv[2]||'summary-arena';
// Auswahl-Screen (Sieger-Hero + Team-Picker)
await page.screenshot({path:`.shots/${name}-picker.png`,fullPage:true});
// In eine Fraktion klicken → Detail-View (Picker-Karte „Allwissen")
try{ await page.getByText('Allwissen',{exact:true}).first().click({timeout:5000}); await sleep(900);
     await page.screenshot({path:`.shots/${name}-detail.png`,fullPage:true}); }catch(e){ console.log('detail click skip',e.message); }
if(errs.length) console.log('ERRORS:\n'+errs.slice(0,6).join('\n'));
console.log('✓ '+name);
await b.close();
