/* handy-namensrennen — heisst eine Fraktion nach dem Formatwechsel noch richtig?
 *
 * 2026-08-29. In einem von drei CrowdQuiz-Laeufen trug das Handy „Testtrupp"
 * statt „Gut Feeling" - den im Browser gespeicherten Namen statt des
 * Fraktionsnamens. In CrowdQuiz gibt es keinen Namensschritt, der Name IST die
 * Fraktion.
 *
 * ── Die Ursache ──────────────────────────────────────────────────────────
 * QQTeamPage.tsx, Auto-Rejoin. Der Kommentar darueber sagt die Absicht:
 * „Erst joinen wenn State da ist, damit largeGroupMode sicher bekannt ist
 * (sonst Race: State noch null → Funny-Name)." Die Wache dafuer steht aber
 * eine Ebene zu tief:
 *
 *   const largeGroup = !!state?.largeGroupMode;
 *   if (largeGroup) {
 *     if (!state) return;                    // ← wirkungslos: largeGroup ist
 *     …teamName: qqMegaFactionName(…)        //   nur wahr, WENN state da ist
 *   }
 *   if (storedName) { …teamName: storedName } // ← hierher faellt state === null
 *
 * Ist `state` noch null, ist `largeGroup` false, und der Fall faellt am
 * Fraktions-Zweig vorbei in den unteren - mit dem gespeicherten Namen.
 *
 * ── Was dieses Werkzeug macht ────────────────────────────────────────────
 * Ein Wettlauf laesst sich nicht mit einem Lauf zeigen. Also faehrt es den
 * Beitritt MEHRFACH, jedes Mal mit frischem Browser-Kontext und einem Raum,
 * der schon CrowdQuiz ist, und zaehlt, wie oft der gespeicherte Name
 * durchkommt. Eine Quote ist hier die ehrliche Aussage, kein Ja/Nein.
 *
 * ── Stand 2026-08-29: NICHT reproduziert ─────────────────────────────────
 * Sieben Versuche, keiner rot:
 *   * Formatwechsel waehrend das Handy drin ist (erste Vermutung) - der
 *     Wechsel setzt die Teams zurueck, das Handy landet im Fraktions-Grid.
 *   * sechs Beitritte in einen Raum, der schon CrowdQuiz ist - alle sechs
 *     trugen einen Fraktionsnamen.
 *
 * Gesehen wurde der Fall EINMAL, in einem vollen Abend mit laufendem Autoplay
 * (scripts/handy-gleichlauf.mjs --mega). Das Fenster ist also enger als das,
 * was hier nachgestellt wird - vermutlich braucht es Last auf dem Socket,
 * damit der State spaet genug kommt.
 *
 * Dieses Werkzeug bleibt trotzdem stehen: es haelt fest, was schon geprueft
 * wurde. Wer den Fall erneut sieht, faengt nicht bei null an.
 *
 * VORAUSSETZUNG: Backend (4000) + Frontend (5173).
 * NUTZUNG: node scripts/handy-namensrennen.mjs [--laeufe=6]
 */
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { API, BASE, PIN, HANDY, sleep, backendNeustart } from './lib/handy.mjs';

const req = createRequire(new URL('../backend/package.json', import.meta.url));
const { io } = req('socket.io-client');

const GESPEICHERT = 'Testtrupp';   // der Name, den ein Handy vom letzten Abend traegt
const LAEUFE = Number((process.argv.find(a => a.startsWith('--laeufe=')) ?? '--laeufe=6').split('=')[1]);

await backendNeustart('Namensrennen');

const sock = io(API, { transports: ['websocket'] });
await new Promise(r => sock.on('connect', r));
const emit = (ev, extra = {}) => new Promise(res => sock.emit(ev, { roomCode: 'default', ...extra }, res));
await emit('qq:joinModerator', { pin: PIN });

/* Raum als CrowdQuiz oeffnen - so, wie er am Abend dasteht, wenn die Handys
 * kommen. Der Formatwechsel selbst ist NICHT die Ursache: er setzt die Teams
 * zurueck, das Handy landet wieder im Fraktions-Grid und waehlt neu. Das war
 * die erste Vermutung, und sie ist an dieser Stelle gemessen widerlegt. */
await emit('qq:resetRoom', { confirm: true });
await sleep(800);
await emit('qq:setQuizOptions', { largeGroupMode: true, nestedTeams: true, formatSelected: true });
await emit('qq:setLanguage', { language: 'en' });
await emit('qq:setSetupDone', { value: true });
await emit('qq:setLobbyOpen', { value: true });
await sleep(600);
console.log(`Raum offen, Format CrowdQuiz. ${LAEUFE} Beitritte.\n`);

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
});

/** Den Namen aus der Kopfzeile lesen - dasselbe Verfahren wie in handy-gleichlauf.mjs. */
const kopfName = (seite) => seite.evaluate(() => {
  const kopf = document.querySelector('header');
  if (!kopf) return null;
  for (const el of kopf.querySelectorAll('*')) {
    const t = (el.textContent ?? '').trim();
    if (t && t.length < 40 && !el.closest('button')) return t;
  }
  return null;
}).catch(() => null);

const namen = [];
for (let i = 1; i <= LAEUFE; i++) {
  /* Frischer Kontext je Lauf: ein Handy, das schon einmal gespielt hat, also
   * mit gespeichertem Namen und Avatar - der einzige Fall, in dem der untere
   * Zweig ueberhaupt feuern kann. */
  const ctx = await browser.newContext({ viewport: HANDY, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(({ name }) => {
    try {
      localStorage.setItem('qq_teamName', name);
      localStorage.setItem('qq_avatarId', 'fox');
    } catch { /* ignore */ }
  }, { name: GESPEICHERT });
  const handy = await ctx.newPage();
  handy.on('dialog', d => d.dismiss());
  await handy.goto(`${BASE}/team`, { waitUntil: 'domcontentloaded' });
  await sleep(6000);
  const n = await kopfName(handy);
  namen.push(n);
  console.log(`  ${n === GESPEICHERT ? '⚠️' : '✓ '} Lauf ${i}: „${n}"`);
  await ctx.close();
  /* Teams zwischen den Laeufen raeumen, sonst steigt der naechste als
   * Rueckkehrer ein und misst etwas anderes. */
  await fetch(`${API}/api/qq/default/dev/clearBots`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: PIN }),
  }).catch(() => {});
  await emit('qq:resetRoom', { confirm: true });
  await emit('qq:setSetupDone', { value: true });
  await emit('qq:setLobbyOpen', { value: true });
  await sleep(800);
}

await browser.close();
sock.close();

const falsch = namen.filter(n => n === GESPEICHERT).length;
console.log(`\n${falsch} von ${LAEUFE} Beitritten trugen den gespeicherten Namen „${GESPEICHERT}".`);
if (falsch) {
  console.log('⚠️  In CrowdQuiz muss der Name die Fraktion sein.');
  process.exit(1);
}
console.log('✓ Jeder Beitritt trug einen Fraktionsnamen.');
