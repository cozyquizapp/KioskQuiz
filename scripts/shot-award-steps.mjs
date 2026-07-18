import { chromium } from 'playwright';
const BASE='http://localhost:5173'; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({viewport:{width:1760,height:1200},deviceScaleFactor:1});
await ctx.addInitScript(()=>{try{sessionStorage.setItem('qq_admin_unlocked','1');localStorage.setItem('qq-admin-pin','2506');}catch{}});
const page=await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await page.goto(`${BASE}/award-test`,{waitUntil:'domcontentloaded'}); await sleep(1200);
for(const [label,name] of [['Krönung','crown'],['Endstand','standings']]){
  await page.getByRole('button',{name:new RegExp(label)}).click(); await sleep(2500);
}
console.log(errs.length? 'ERRORS:\n'+errs.slice(0,6).join('\n') : 'OK keine Fehler (Krönung+Endstand)');
await b.close();
