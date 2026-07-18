import { chromium } from 'playwright';
const BASE='http://localhost:5173'; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({viewport:{width:1760,height:1200},deviceScaleFactor:1});
await ctx.addInitScript(()=>{try{sessionStorage.setItem('qq_admin_unlocked','1');localStorage.setItem('qq-admin-pin','2506');}catch{}});
const page=await ctx.newPage();
await page.goto(`${BASE}/reveal-test`,{waitUntil:'domcontentloaded'});
await sleep(1000); await page.getByRole('button',{name:/^Schwarm$/}).click(); await sleep(8000);
const d=await page.evaluate(()=>{
  const stage=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).containerType==='size');
  const sb=stage.getBoundingClientRect();
  const P=(r)=>({t:+(((r.top-sb.top)/sb.height)*100).toFixed(1),b:+(((r.bottom-sb.top)/sb.height)*100).toFixed(1),l:+(((r.left-sb.left)/sb.width)*100).toFixed(1),r:+(((r.right-sb.left)/sb.width)*100).toFixed(1)});
  const res={};
  // Buehne = das flex:1 div (erstes mit position relative das minHeight:0 hat) -> nimm den direkten Container der Chips
  // Answer-Tafel: enthaelt 'Antwort'
  for(const el of stage.querySelectorAll('*')){
    const own=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('');
    if(own==='Antwort'||own==='Answer') res.eyebrowAntwort=P(el.parentElement.getBoundingClientRect());
    if(/Gummibärchen$/.test(own)) res.unit=P(el.getBoundingClientRect());
    if(own==='Glückstreffer'||own==='Improvisation'||own==='Einspruch') res['name_'+own]=P(el.getBoundingClientRect());
  }
  // Avatare (img)
  const imgs=[...stage.querySelectorAll('img')].map(i=>P(i.getBoundingClientRect())).sort((a,b)=>a.t-b.t);
  res.imgTops=imgs.map(i=>i.t);
  return res;
});
console.log(JSON.stringify(d,null,1));
await b.close();
