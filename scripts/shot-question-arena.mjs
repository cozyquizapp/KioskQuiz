import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE='http://localhost:5173'; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
mkdirSync('.shots',{recursive:true});
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({viewport:{width:1760,height:990},deviceScaleFactor:1});
await ctx.addInitScript(()=>{try{sessionStorage.setItem('qq_admin_unlocked','1');localStorage.setItem('qq-admin-pin','2506');}catch{}});
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await page.goto(`${BASE}/question-test`,{waitUntil:'domcontentloaded'});
await sleep(2200);
const el=async()=>page.evaluateHandle(()=>[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).containerType==='size')||document.body);
const e=await el(); try{const box=await e.asElement().boundingBox(); await page.screenshot({path:`.shots/${process.argv[2]||'question-arena'}.png`,clip:box||undefined});}catch{await page.screenshot({path:`.shots/${process.argv[2]||'question-arena'}.png`});}
if(errs.length) console.log('ERRORS:\n'+errs.slice(0,6).join('\n'));
console.log('✓ '+(process.argv[2]||'question-arena'));
await b.close();
