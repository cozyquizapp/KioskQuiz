/**
 * crowd-spielende.mjs — eine einzige Frage nachmessen.
 *
 * 2026-08-29: das Bild .shots/crowd-abgleich/spielende.png zeigt in CrowdQuiz
 * eine Karte mit „1 Feld". Felder gibt es in CrowdQuiz nicht, dort laeuft kein
 * Brett. Es zeigt ausserdem „#11", obwohl acht Fraktionen nur bis #8 gehen.
 *
 * Beides zusammen heisst: entweder rendert dort die CozyQuiz-Ansicht, obwohl
 * CozyQuizGameOverView.tsx:126 bei `largeGroupMode` an LargeGroupGameOverView
 * abgibt - oder der Harness hat gar kein CrowdQuiz aufgebaut. Genau diese
 * Verwechslung ist mir am 28.08. schon einmal passiert (der erste Abgleich
 * mass ein CrowdQuiz, das es nicht gab). Deshalb erst messen, dann behaupten.
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const b = await buehneStarten({ bots: 12, frisch: true, takt: () => {}, entwurf: 'qq-vol-1' });
await b.emit('qq:setQuizOptions', { largeGroupMode: true, nestedTeams: true });
await b.emit('qq:setTheme', { themeId: 'buehne' });
await sleep(600);
await b.zurStation('spielende');
await sleep(4000);

const befund = await b.seite.evaluate(() => {
  const txt = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300);
  return {
    phase: document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase'),
    text: txt,
    feld: /\bFeld(er)?\b/.test(document.body.innerText || ''),
  };
});
console.log('\n  Phase:', befund.phase);
console.log('  „Feld" im Bild:', befund.feld ? 'JA' : 'nein');
console.log('  Text:', befund.text);

// Und was der Server ueber den Raum sagt - nicht was ich vermute.
const st = b.zustand?.();
console.log('\n  largeGroupMode:', st?.largeGroupMode, ' nestedTeams:', st?.nestedTeams);
console.log('  themeId:', st?.themeId, ' Teams:', st?.teams?.length);
await b.seite.screenshot({ path: '.shots/crowd-spielende.png' });
await b.schliessen?.();
process.exit(0);
