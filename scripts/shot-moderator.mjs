import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE='http://localhost:5173'; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const ARENA = process.argv[2] !== 'normal';
const tag = ARENA ? 'arena' : 'normal';
mkdirSync('.shots',{recursive:true});
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({viewport:{width:1512,height:950},deviceScaleFactor:1});
await ctx.addInitScript(()=>{try{sessionStorage.setItem('qq_admin_unlocked','1');sessionStorage.setItem('qq_admin_pin','2506');localStorage.setItem('qq-admin-pin','2506');}catch{}});
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push('PAGEERR '+e.message));
const url = ARENA ? `${BASE}/moderator-test?arena=1&run=1` : `${BASE}/moderator-test?run=1`;
page.on('dialog',async d=>{ console.log('DIALOG:',d.message().slice(0,70)); await d.accept().catch(()=>{}); });
await page.goto(url,{waitUntil:'domcontentloaded'});
await sleep(8000); // Bots joinen + run=1 Auto-Start (Autoplay an)
// Falls noch Lobby: Start klicken
try{ if(await page.getByRole('button',{name:/Quiz starten/}).isVisible()){ await page.getByRole('button',{name:/Quiz starten/}).click(); console.log('clicked start'); } }catch{}
// Manuelle Gates (TEAMS_REVEAL/PHASE_INTRO/REVEAL) brauchen Space; Autoplay macht
// die getimten. Also Shot -> Space -> warten, so laufen wir durch alle Phasen.
for(let i=0;i<16;i++){
  await sleep(4500);
  try{ await page.screenshot({path:`.shots/moderator-${tag}-${String(i).padStart(2,'0')}.png`,fullPage:true}); }catch{}
  await page.keyboard.press('Space');
}
if(errs.length) console.log('ERRORS:\n'+errs.slice(0,8).join('\n'));
console.log('done');
await b.close();
