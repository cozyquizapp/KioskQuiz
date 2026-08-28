/* Die beiden Lobbys nebeneinander: CozyQuiz und CrowdQuiz, beide im
 * Standarddesign. Wolf 2026-08-28: „das design ist ja noch total alt und gar
 * nicht an die neue lobby angepasst". */
import { buehneStarten, sleep } from '/home/claude/kioskquiz/scripts/lib/buehne.mjs';
const OUT = '/tmp/claude-0/-home-claude/9149851f-de40-519f-9d02-8defe77608fc/scratchpad';
for (const [name, mega, bots] of [['crowdquiz40', true, 40]]) {
  const b = await buehneStarten({ bots, frisch: true, takt: () => {}, entwurf: 'qq-vol-1' });
  await b.emit('qq:setQuizOptions', { largeGroupMode: mega, nestedTeams: mega });
  await b.emit('qq:setTheme', { themeId: 'buehne' });
  await sleep(600);
  await b.zurStation('lobby');
  await sleep(3000);
  await b.seite.screenshot({ path: `${OUT}/lobby-${name}.png` });
  console.log(`${name} -> lobby-${name}.png`);
  await b.schliessen?.();
}
