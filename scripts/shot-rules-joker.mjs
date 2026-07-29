import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.QQ_BASE ?? 'http://localhost:5174';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
mkdirSync('.shots-quirks',{recursive:true});
const b = await chromium.launch({headless:true});
const ctx = await b.newContext({viewport:{width:1760,height:990},deviceScaleFactor:1});
await ctx.addInitScript(()=>{try{sessionStorage.setItem('qq_admin_unlocked','1');sessionStorage.setItem('qq_admin_pin','2506');localStorage.setItem('qq-admin-pin','2506');}catch{}});
const beamer = await ctx.newPage();
await beamer.goto(`${BASE}/beamer`,{waitUntil:'domcontentloaded'});
const mod = await ctx.newPage();
mod.on('dialog',async d=>{await d.dismiss();});
await mod.goto(`${BASE}/moderator-test?run=1&set=cozyQuirks2`,{waitUntil:'domcontentloaded'});
const phase = ()=>beamer.evaluate(()=>document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase')??'?');
// zu RULES
for(let i=0;i<40;i++){ if(await phase()==='RULES')break; await sleep(700); }
await sleep(1500);
// durch die Regel-Folien blättern, jede knipsen (joker-Folie finden)
for(let s=0;s<9;s++){
  await beamer.screenshot({path:`.shots-quirks/rules-${s}.png`});
  const hasJoker = await beamer.evaluate(()=>!!document.querySelector('img[src*="quirk2.webp"], img[src*="jokers"]'));
  if(hasJoker){ console.log('joker-Folie @ slide',s); await beamer.screenshot({path:'.shots-quirks/RULES-joker.png'}); break; }
  await mod.keyboard.press('Space'); await sleep(1400);
  if(await phase()!=='RULES'){ console.log('RULES verlassen @ slide',s); break; }
}
await b.close();
