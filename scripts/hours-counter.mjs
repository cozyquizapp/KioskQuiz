// CozyWolf Arbeitszeit-Counter — schaetzt aus den Git-Commit-Zeitstempeln ALLER
// Repos auf dem Desktop die aktive Arbeitszeit und schreibt eine „satisfying"
// animierte HTML-Seite auf den Desktop.
//
// Heuristik: Luecke <=2h = durchgearbeitet (Luecke zaehlt), sonst neue Session
// (+30min Vorlauf). GESAMT wird ueber EINE zusammengefuehrte Zeitleiste aller
// Repos gerechnet — so werden ueberlappende Sessions / Repo-Kopien NICHT doppelt
// gezaehlt (ehrlicher als die Summe der Einzel-Repos).
//
// Nutzung:   node scripts/hours-counter.mjs            (einmal schreiben)
//            node scripts/hours-counter.mjs --watch=15 (alle 15 Min neu schreiben)

import { execSync } from 'node:child_process';
import { writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const GOAL = 1000;
const MAX_GAP = 120 * 60;
const FIRST = 30 * 60;
const RELOAD_MIN = 10;                 // HTML laedt sich alle 10 Min selbst neu
const DESKTOP = join(homedir(), 'Desktop');
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.cache', 'vendor']);
const PALETTE = ['#EC4899', '#A855F7', '#EAB308', '#38BDF8', '#34D399', '#FB7185', '#C084FC', '#F59E0B', '#22D3EE', '#F472B6'];

// --- alle Git-Repos unter dem Desktop finden (Tiefe 4) ---
function findRepos(root, depth = 4, acc = []) {
  let entries;
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return acc; }
  if (entries.some(e => e.isDirectory() && e.name === '.git')) { acc.push(root); return acc; } // nicht in Repos absteigen
  if (depth <= 0) return acc;
  for (const e of entries) {
    if (!e.isDirectory() || SKIP.has(e.name)) continue;
    findRepos(join(root, e.name), depth - 1, acc);
  }
  return acc;
}

function timestamps(repoPath) {
  try {
    const out = execSync('git log --pretty=format:%at', { cwd: repoPath, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.trim().split('\n').filter(Boolean).map(Number);
  } catch { return []; }
}

function hoursFrom(ts) {
  const s = [...ts].sort((a, b) => a - b);
  if (!s.length) return 0;
  let mins = 0;
  for (let i = 0; i < s.length; i++) mins += i === 0 ? FIRST : (s[i] - s[i - 1] <= MAX_GAP ? s[i] - s[i - 1] : FIRST);
  return mins / 3600;
}
function activeDays(ts) { return new Set(ts.map(t => new Date(t * 1000).toISOString().slice(0, 10))).size; }

function build() {
  const repoPaths = findRepos(DESKTOP);
  const all = [];
  const perRepo = [];
  for (const p of repoPaths) {
    const ts = timestamps(p);
    if (!ts.length) continue;
    all.push(...ts);
    perRepo.push({ name: p.split(/[\\/]/).pop(), hours: hoursFrom(ts), commits: ts.length, days: activeDays(ts) });
  }
  perRepo.sort((a, b) => b.hours - a.hours).forEach((r, i) => (r.color = PALETTE[i % PALETTE.length]));

  const total = hoursFrom(all);                 // zusammengefuehrte Zeitleiste = ehrlicher Gesamtwert
  const pct = Math.min(100, (total / GOAL) * 100);
  const remaining = Math.max(0, GOAL - total);
  const stamp = new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const data = {
    goal: GOAL, total: Math.round(total), pct: Math.round(pct * 10) / 10, remaining: Math.round(remaining),
    commits: all.length, days: activeDays(all), reloadMin: RELOAD_MIN, stamp,
    repos: perRepo.map(r => ({ name: r.name, color: r.color, hours: Math.round(r.hours), commits: r.commits, days: r.days })),
  };
  const maxRepo = Math.max(1, ...data.repos.map(r => r.hours));
  const endspurt = data.pct >= 85;

  const html = `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>CozyWolf · Arbeitszeit</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='88'%3E%F0%9F%90%BA%3C/text%3E%3C/svg%3E">
<link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='88'%3E%F0%9F%90%BA%3C/text%3E%3C/svg%3E">
<style>
  :root{ --gold:#EAB308; --ink:#f4f2fb; }
  *{ box-sizing:border-box; margin:0; padding:0; }
  html,body{ height:100%; }
  body{ font-family:'Nunito','Segoe UI',system-ui,sans-serif; color:var(--ink);
    background:radial-gradient(60% 55% at 50% 6%, rgba(168,85,247,.28), transparent 60%),
      radial-gradient(70% 60% at 88% 100%, rgba(236,72,153,.20), transparent 55%),
      radial-gradient(55% 50% at 10% 92%, rgba(30,42,90,.55), transparent 60%), #08060f;
    min-height:100%; display:flex; align-items:center; justify-content:center; padding:4vh 4vw; overflow-x:hidden; }
  .stars{ position:fixed; inset:0; pointer-events:none; z-index:0; }
  .star{ position:absolute; width:3px; height:3px; border-radius:50%; background:rgba(255,255,255,.7); animation:tw 3.6s ease-in-out infinite; }
  @keyframes tw{ 0%,100%{opacity:.15; transform:scale(.7)} 50%{opacity:.9; transform:scale(1.2)} }
  .wrap{ position:relative; z-index:1; width:min(700px,94vw); text-align:center; animation:rise .8s cubic-bezier(.16,1,.3,1) both; }
  @keyframes rise{ from{opacity:0; transform:translateY(22px)} to{opacity:1; transform:none} }
  .brand{ font-size:clamp(13px,1.6vw,18px); font-weight:900; letter-spacing:.26em; text-transform:uppercase; color:#f0abfc; opacity:.9; }
  .brand b{ color:var(--gold); }
  .wolf{ font-size:34px; filter:drop-shadow(0 4px 12px rgba(236,72,153,.5)); }
  .ringwrap{ position:relative; width:min(340px,74vw); aspect-ratio:1; margin:12px auto 6px; }
  svg{ width:100%; height:100%; transform:rotate(-90deg); filter:drop-shadow(0 0 22px rgba(168,85,247,.45)); }
  .track{ fill:none; stroke:rgba(255,255,255,.08); stroke-width:16; }
  .prog{ fill:none; stroke:url(#g); stroke-width:16; stroke-linecap:round; transition:stroke-dashoffset 1.9s cubic-bezier(.16,1,.3,1); }
  .center{ position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .num{ font-size:clamp(58px,13vw,104px); font-weight:900; line-height:.9;
    background:linear-gradient(180deg,#fff,#f5d0fe 60%,#f0abfc); -webkit-background-clip:text; background-clip:text; color:transparent;
    text-shadow:0 0 40px rgba(236,72,153,.35); font-variant-numeric:tabular-nums; }
  .goal{ font-size:clamp(15px,2.4vw,22px); font-weight:800; color:#c4b5fd; margin-top:8px; }
  .goal span{ color:var(--gold); }
  .unit{ font-size:clamp(11px,1.5vw,14px); font-weight:900; letter-spacing:.28em; text-transform:uppercase; color:#a78bfa; margin-top:10px; }
  .pill{ display:inline-flex; align-items:center; gap:8px; margin-top:16px; padding:9px 18px; border-radius:999px;
    font-weight:900; font-size:clamp(14px,2vw,19px); color:#0a0814; background:linear-gradient(180deg,#fde68a,#eab308);
    box-shadow:0 8px 26px rgba(234,179,8,.4); animation:pop .6s .9s both; }
  @keyframes pop{ 0%{opacity:0; transform:scale(.6)} 60%{transform:scale(1.12)} 100%{opacity:1; transform:scale(1)} }
  .endspurt{ margin-top:14px; font-weight:900; font-size:clamp(15px,2.2vw,22px); color:var(--gold); text-shadow:0 0 24px rgba(234,179,8,.55); animation:glow 2.4s ease-in-out infinite; }
  @keyframes glow{ 0%,100%{opacity:.85} 50%{opacity:1} }
  .totsub{ margin-top:12px; font-size:clamp(11px,1.5vw,14px); font-weight:700; color:#9a8fc0; }
  .repos{ margin-top:26px; display:flex; flex-direction:column; gap:12px; text-align:left; }
  .repo .top{ display:flex; align-items:baseline; justify-content:space-between; margin-bottom:5px; }
  .repo .nm{ font-weight:900; font-size:clamp(13px,1.8vw,17px); word-break:break-word; }
  .repo .hr{ font-weight:900; font-size:clamp(14px,1.9vw,19px); font-variant-numeric:tabular-nums; white-space:nowrap; }
  .repo .sub{ font-size:clamp(10px,1.3vw,12px); font-weight:700; color:#8a7fb0; }
  .bar{ height:11px; border-radius:999px; background:rgba(255,255,255,.07); overflow:hidden; }
  .fill{ height:100%; border-radius:999px; width:0; transition:width 1.6s cubic-bezier(.16,1,.3,1); }
  .foot{ margin-top:24px; font-size:clamp(11px,1.4vw,13px); font-weight:700; color:#8a7fb0; }
  .foot .hint{ display:block; margin-top:5px; color:#6f659a; }
</style></head><body>
  <div class="stars" id="stars"></div>
  <div class="wrap">
    <div class="brand"><span class="wolf">🐺</span><br>CozyWolf · <b>Arbeitszeit</b></div>
    <div class="ringwrap">
      <svg viewBox="0 0 260 260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#EC4899"/><stop offset="0.5" stop-color="#A855F7"/><stop offset="1" stop-color="#EAB308"/>
      </linearGradient></defs>
      <circle class="track" cx="130" cy="130" r="118"/><circle class="prog" id="ring" cx="130" cy="130" r="118"/></svg>
      <div class="center"><div class="num" id="num">0</div><div class="goal">/ <span>${data.goal}</span> h</div><div class="unit">Stunden</div></div>
    </div>
    <div class="pill">⏳ noch ~<span id="rem">0</span> h bis ${data.goal}</div>
    ${endspurt ? '<div class="endspurt">🔥 Endspurt! Fast am Ziel.</div>' : ''}
    <div class="foot">zuletzt aktualisiert: ${data.stamp}
      <span class="hint">aktualisiert sich alle ${RELOAD_MIN} Min selbst</span></div>
  </div>
<script>
  const DATA = ${JSON.stringify(data)};
  const MAXREPO = ${maxRepo};
  const C = 2 * Math.PI * 118;
  const sc = document.getElementById('stars');
  for (let i=0;i<44;i++){ const s=document.createElement('div'); s.className='star';
    s.style.left=(i*53%100)+'%'; s.style.top=(i*29%100)+'%'; s.style.animationDelay=(i%7*0.5)+'s'; sc.appendChild(s); }
  const ring = document.getElementById('ring');
  ring.style.strokeDasharray = C; ring.style.strokeDashoffset = C;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ ring.style.strokeDashoffset = C * (1 - DATA.pct/100); }));
  function countUp(el,to,ms){ const st=performance.now(); (function t(n){ const p=Math.min(1,(n-st)/ms);
    el.textContent=Math.round(to*(1-Math.pow(1-p,3))); if(p<1) requestAnimationFrame(t); })(performance.now()); }
  countUp(document.getElementById('num'), DATA.total, 1700);
  countUp(document.getElementById('rem'), DATA.remaining, 1700);
  setTimeout(()=>location.reload(), ${RELOAD_MIN} * 60 * 1000);
</script></body></html>`;

  const outPath = join(DESKTOP, 'CozyWolf-Stunden.html');
  writeFileSync(outPath, html, 'utf8');
  console.log(`[${data.stamp}] geschrieben: ${outPath}`);
  console.log(`Gesamt ~${data.total}/${GOAL} h (${data.pct}%) · noch ~${data.remaining} h · ${data.repos.length} Repos`);
  return data;
}

// --watch=Minuten → periodisch neu schreiben
const watchArg = process.argv.find(a => a.startsWith('--watch'));
if (watchArg) {
  const m = Number(watchArg.split('=')[1]) || 15;
  build();
  console.log(`Watch-Modus: aktualisiere alle ${m} Min. (Fenster offen lassen)`);
  setInterval(build, m * 60 * 1000);
} else {
  build();
}
