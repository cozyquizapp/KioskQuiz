/* Zieht ein altes CrowdQuiz (themeId 'cozy') beim Oeffnen des Steuerpults
 * automatisch auf das Standarddesign nach?  Erst rot, dann gruen: der Raum
 * wird absichtlich in den alten Zustand gebracht. */
import { buehneStarten, sleep, BASE, PIN } from '/home/claude/kioskquiz/scripts/lib/buehne.mjs';

const b = await buehneStarten({ bots: 12, frisch: true, takt: () => {}, entwurf: 'qq-vol-1' });
await b.emit('qq:setQuizOptions', { largeGroupMode: true, nestedTeams: true, formatSelected: true });
await b.emit('qq:setTheme', { themeId: 'cozy' });
await sleep(800);
await b.zurStation('lobby');
await sleep(1500);

const lies = async () => b.seite.evaluate(() => {
  const el = document.querySelector('.cq-wordmark');
  return { wortmarke: el ? getComputedStyle(el).color : '(keine)',
    text: (el?.textContent || '').trim() };
});
console.log('VORHER (Raum auf cozy):', JSON.stringify(await lies()));

// Steuerpult in einem zweiten Tab oeffnen - genau das tut Wolf.
const pult = await b.ctx.newPage();
if (process.env.QQ_LOOK) {
  await pult.addInitScript((v) => { try { localStorage.setItem('qqArenaLook', v); } catch {} }, process.env.QQ_LOOK);
}
await pult.goto(`${BASE}/moderator?pin=${PIN}`, { waitUntil: 'domcontentloaded' });
await sleep(6000);
console.log('NACHHER (Pult offen):', JSON.stringify(await lies()));
await b.seite.screenshot({ path: '/tmp/claude-0/-home-claude/9149851f-de40-519f-9d02-8defe77608fc/scratchpad/nachziehen.png' });
await b.schliessen?.();
