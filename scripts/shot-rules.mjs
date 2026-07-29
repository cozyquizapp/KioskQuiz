import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.QQ_BASE ?? 'http://localhost:5174';
const SET = (process.argv.find(a=>a.startsWith('--set='))??'--set=cozyQuirks2').split('=')[1];
const sleep = ms => new Promise(r=>setTimeout(r,ms));
mkdirSync('.shots-quirks',{recursive:true});
const b = await chromium.launch({headless:true});
const ctx = await b.newContext({viewport:{width:1760,height:990},deviceScaleFactor:1});
await ctx.addInitScript(()=>{try{sessionStorage.setItem('qq_admin_unlocked','1');sessionStorage.setItem('qq_admin_pin','2506');localStorage.setItem('qq-admin-pin','2506');}catch{}});
const beamer = await ctx.newPage();
await beamer.goto(`${BASE}/beamer`,{waitUntil:'domcontentloaded'});
const mod = await ctx.newPage();
mod.on('dialog',async d=>{await d.dismiss();});
await mod.goto(`${BASE}/moderator-test?run=1&set=${SET}`,{waitUntil:'domcontentloaded'});
const phase = ()=>beamer.evaluate(()=>document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase')??'?');
let shot=false;
for(let i=0;i<40;i++){
  const p = await phase();
  if(p==='RULES'){ await sleep(2500); await beamer.screenshot({path:'.shots-quirks/RULES-joker.png'}); console.log('✓ RULES @ iter',i); shot=true; break; }
  await sleep(700);
}
if(!shot) console.log('RULES nicht erreicht');
await b.close();
