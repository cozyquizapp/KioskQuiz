import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE='http://localhost:5173'; const NAME=process.argv[2]??'phaseintro'; const MULT=process.argv[3]??'2';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
mkdirSync('.shots',{recursive:true});
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({viewport:{width:1760,height:1200},deviceScaleFactor:1});
await ctx.addInitScript(()=>{try{sessionStorage.setItem('qq_admin_unlocked','1');localStorage.setItem('qq-admin-pin','2506');}catch{}});
const page=await ctx.newPage();
const errs=[];
page.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
page.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await page.goto(`${BASE}/phaseintro-test`,{waitUntil:'domcontentloaded'});
await sleep(1500);
if(MULT==='3'){ await page.getByRole('button',{name:/×3/}).click(); await sleep(400); }
await sleep(2500); // Badge-Einblend-Animation abwarten
const el=await page.evaluateHandle(()=>[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).containerType==='size')||document.body);
try{ const box=await el.asElement().boundingBox(); if(box) await page.screenshot({path:`.shots/${NAME}.png`,clip:box}); else await page.screenshot({path:`.shots/${NAME}.png`}); }
catch{ await page.screenshot({path:`.shots/${NAME}.png`}); }
if(errs.length) console.log('CONSOLE ERRORS:\n'+errs.slice(0,8).join('\n'));
console.log(`✓ .shots/${NAME}.png`);
await b.close();
