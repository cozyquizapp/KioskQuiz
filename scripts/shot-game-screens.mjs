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
const seen = new Set();
for(let i=0;i<200;i++){
  const p = await phase();
  if((p==='SCORE'||p==='PLACEMENT'||p==='QUESTION_REVEAL')&&!seen.has('scores')){seen.add('scores');await sleep(1200);await beamer.screenshot({path:'.shots-quirks/GAME-scores.png'});console.log('✓ scores @',p);}
  if((p==='GAME_OVER'||p==='THANKS')&&!seen.has('over')){seen.add('over');await sleep(4000);await beamer.screenshot({path:'.shots-quirks/GAME-over.png'});console.log('✓ over @',p);break;}
  await sleep(1500);
}
await b.close();
