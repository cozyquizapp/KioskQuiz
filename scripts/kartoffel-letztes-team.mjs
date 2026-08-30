/**
 * kartoffel-letztes-team — faellt der Beamer um, wenn das LETZTE Team der
 * Heissen Kartoffel eliminiert wird?
 *
 * 2026-08-30. Der Verdacht kommt aus der Hook-Messung, nicht aus einem Bild:
 * `HotPotatoSemicircle` (QQBeamerPage) ruft erst Hooks (useRef, useState,
 * useEffect ab Z2849) und steigt DANN aus (`if (!activeTeam) return …`,
 * Z2876), waehrend dahinter weitere Hooks stehen. Das ist die Form, die React
 * meldet: erst mehrere Hooks, dann weniger -> „Rendered fewer hooks than
 * expected", also weisse Buehne.
 *
 * Erreichbar ist sie so: `qqHotPotatoForceEliminate` setzt
 * `hotPotatoActiveTeamId = nextRoundRobinTeam(room)`, und das liefert NULL,
 * sobald kein Team mehr lebt (qqRooms.ts Z2243: `if (alive.length === 0)
 * return null`). Die Phase bleibt dabei QUESTION_ACTIVE, `revealed` bleibt
 * false, die Frage-Id aendert sich nicht. Die Ansicht haengt also weiter am
 * selben Einbau und rendert mit leerem activeTeam neu.
 *
 * Ausgeloest wird das vom Steuerpult ueber `qq:hotPotatoEliminateTeam` - ein
 * Fehlgriff am Ende einer Kartoffel-Runde reicht.
 *
 * ── ERGEBNIS 2026-08-30: GRUEN, der Absturz kommt nicht ───────────────────
 * Der Lauf stellt die Bedingung wirklich her (Kartoffel-Frage aktiv, alle
 * fuenf Teams einzeln eliminiert, `aktiv: NULL` erreicht) und meldet NULL
 * Fehler. Der Grund steht im Bild: die Buehne zeigt danach „Frage 2 von 5".
 * Der Server beendet die Kartoffel-Runde, sobald niemand mehr lebt, die Frage
 * wechselt, und damit wechselt der `key` der Fragefolie - React montiert neu,
 * statt mit leerem activeTeam weiterzurendern.
 *
 * Die gefaehrliche FORM bleibt also bestehen, die Erreichbarkeit nicht. Genau
 * wie bei der Fragefolie am selben Tag: die Sicherheit liegt im Ablauf
 * ringsum, nicht in der Komponente. Wer den Ablauf aendert, verliert sie
 * lautlos - deshalb bleibt dieses Werkzeug liegen.
 *
 * ── Sechs Fallen, die dieser Lauf gekostet hat (fuer den naechsten Harness) ─
 * 1. Die Moderator-Testseite darf NICHT mitlaufen. Mit `?run=1` startet sie
 *    ihr eigenes 15-Fragen-Spiel und ueberschreibt das eigene; ohne `?run=1`
 *    setzt sie den Raum nach rund 1,5 s auf LOBBY zurueck. Teams meldet man
 *    besser selbst per `qq:joinTeam` an.
 * 2. `?draft=` greift beim Autostart nicht.
 * 3. `qqStartGame` verlangt GENAU `phases * 5` Fragen, sonst
 *    WRONG_QUESTION_COUNT. Und SCHAETZCHEN-Fuellfragen brauchen `targetValue`.
 * 4. Der Server SORTIERT den Satz in die feste Kategorien-Reihenfolge. Eine
 *    Bunte-Tuete-Frage landet nie auf Platz 0, egal wie man sie einreicht.
 * 5. `qq:rulesNext` ist am letzten Regel-Bild ein stiller No-Op. Der Ausgang
 *    aus RULES heisst `qq:rulesFinish`.
 * 6. Bestaetigungen AUSWERTEN. Der erste Anlauf meldete „kein Hook-Bruch",
 *    waehrend auf der Buehne eine CHEESE-Frage stand: das Spiel war nie
 *    gestartet, die zu pruefende Ansicht nie da. Deshalb steht unten ein
 *    Riegel, der abbricht, wenn nicht die Kartoffel laeuft.
 *
 * NUTZUNG (lokal, NIE gegen Prod):
 */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
const req = createRequire(new URL('../backend/package.json', import.meta.url));
const { io } = req('socket.io-client');

const BASE = 'http://localhost:5173';
const API = 'http://localhost:4000';
const PIN = process.env.ADMIN_PIN || '2506';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const health = await fetch(`${API}/api/health`).then(r => r.json()).catch(() => null);
if (!health) { console.error('Backend nicht erreichbar.'); process.exit(1); }
console.log(`Backend ok (uptime ${Math.round(health.uptime)}s, build ${health.build})`);

const browser = await chromium.launch({ args:['--no-sandbox'],
  ...(process.env.QQ_CHROME ? { executablePath: process.env.QQ_CHROME } : {}) });
const ctx = await browser.newContext({ viewport:{width:1760,height:990} });
await ctx.addInitScript(({pin})=>{try{
  sessionStorage.setItem('qq_admin_unlocked','1'); sessionStorage.setItem('qq_admin_pin',pin);
  localStorage.setItem('qq-admin-pin',pin);}catch{}}, {pin:PIN});

const fehler = [];
const beamer = await ctx.newPage();
beamer.on('pageerror', e => fehler.push(String(e.message).split('\n')[0]));
beamer.on('console', m => { if (m.type()==='error') fehler.push('console: '+m.text().split('\n')[0].slice(0,160)); });
await beamer.goto(`${BASE}/beamer`, { waitUntil:'domcontentloaded' });
// ⚠️ KEINE Moderator-Seite. Mit ?run=1 startet sie ihr eigenes 15-Fragen-Spiel
// und ueberschreibt unseres; OHNE ?run=1 setzt sie den Raum nach rund 1,5 s
// wieder auf LOBBY zurueck (2026-08-30 beides gemessen: „Socket sagt RULES,
// Buehne sagt RULES" und eine Sekunde spaeter beide LOBBY). Die Teams melden
// wir deshalb selbst an, dann gehoert der Raum uns allein.

const roomCode = await beamer.evaluate(() =>
  document.querySelector('[data-qq-room]')?.getAttribute('data-qq-room') ?? 'default').catch(()=> 'default');
const sock = io(API, { transports:['websocket'] });
// Es gibt KEIN qq:getState. Der Server broadcastet `qq:stateUpdate` in den
// Raum (qqSocketHandlers Z228), also lesen wir einfach mit.
let letzterZustand = null;
sock.on('qq:stateUpdate', (z) => { letzterZustand = z; });
await new Promise((res,rej)=>{ sock.on('connect',res); sock.on('connect_error',rej);
  setTimeout(()=>rej(new Error('Socket-Timeout')),8000); });
await Promise.race([new Promise(res => sock.emit('qq:joinModerator', { roomCode, pin: PIN }, res)), sleep(3000)]);
// Lange Fragedauer: mit 3 s lief die Kartoffel-Frage waehrend des Vorspulens
// ab, der Index wanderte weiter und auf der Buehne stand „Fuellfrage 2".
await Promise.race([new Promise(res => sock.emit('qq:setTimer', { roomCode, durationSec: 600 }, res)), sleep(2500)]);
console.log(`Raum ${roomCode}, Moderator verbunden`);

const phase = () => beamer.evaluate(() =>
  document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? null).catch(()=>null);

// Auf Teams warten, dann das Spiel GEZIELT mit einer Kartoffel-Frage starten.
// Warum nicht auf den Testlauf warten: der zieht seinen eigenen Fragensatz,
// und `?draft=` greift beim Autostart nicht (2026-08-30 zweimal geprueft, es
// kam `crowdEstimate` statt hotPotato). Blind mitlaufen kostet pro Versuch
// vier Minuten und trifft die Frage vielleicht nie.
// ⚠️ Die Bestaetigung wird AUSGEWERTET. Beim ersten Anlauf wurde
// `qq:startGame` mit WRONG_QUESTION_COUNT abgelehnt (qqStartGame verlangt
// genau phases*5 Fragen), und weil das Skript die Antwort wegwarf, lief es
// zwanzig Runden lang gegen eine Lobby und meldete am Ende nichts Boeses.
const senden = async (ev, data, ms = 3000) => {
  let kam = false;
  const a = await Promise.race([
    new Promise(res => sock.emit(ev, { roomCode, ...data }, (r) => { kam = true; res(r); })),
    sleep(ms),
  ]);
  if (!kam) console.log(`  ⚠️ ${ev}: KEINE Bestaetigung binnen ${ms}ms`);
  else if (a && a.ok === false) console.log(`  ⚠️ ${ev} abgelehnt: ${JSON.stringify(a).slice(0,150)}`);
  return a;
};

console.log('\nMelde drei Teams selbst an …');
const teamSocks = [];
const teams = ['probe-a', 'probe-b', 'probe-c'];
for (const [i, id] of teams.entries()) {
  const ts = io(API, { transports:['websocket'] });
  await new Promise((res, rej) => { ts.on('connect', res); ts.on('connect_error', rej); setTimeout(()=>rej(new Error('t/o')), 8000); });
  await Promise.race([new Promise(res => ts.emit('qq:joinTeam',
    { roomCode, teamId: id, teamName: `Probe ${i+1}`, avatarId: ['fox','frog','panda'][i] }, res)), sleep(3000)]);
  teamSocks.push(ts);
}
await sleep(1200);
console.log(`  im Raum: ${(letzterZustand?.teams ?? []).map(t=>t.id).join(', ')}`);
if ((letzterZustand?.teams ?? []).length < 2) { console.log('Teams nicht angekommen.'); await browser.close(); process.exit(2); }

const kartoffelFrage = {
  id: 'repro-hp-1', category: 'BUNTE_TUETE', phaseIndex: 1, questionIndexInPhase: 0,
  text: 'Nennt Stadtteile von Hamburg', answer: 'Altona',
  textEn: 'Name districts of Hamburg', answerEn: 'Altona',
  bunteTuete: { kind: 'hotPotato', prompt: 'Stadtteile von Hamburg',
                promptEn: 'Districts of Hamburg', answers: ['Altona','Eimsbuettel','Barmbek','Ottensen','Eppendorf'] },
};
// qqStartGame verlangt genau phases*5 Fragen. Also 15, und die Kartoffel
// steht vorn, damit sie die erste aktivierte Frage ist.
const fueller = (i) => ({
  id: `fuell-${i}`, category: 'SCHAETZCHEN',
  phaseIndex: (Math.floor(i / 5) + 1), questionIndexInPhase: i % 5,
  text: `Fuellfrage ${i}`, answer: '42', textEn: `Filler ${i}`, answerEn: '42',
  targetValue: 42, unit: '', unitEn: '',
});
const fragen = [kartoffelFrage, ...Array.from({ length: 14 }, (_, i) => fueller(i + 1))];
fragen.forEach((q, i) => { q.phaseIndex = Math.floor(i / 5) + 1; q.questionIndexInPhase = i % 5; });
console.log('Starte ein Spiel, erste Frage ist die Kartoffel …');
const startAck = await senden('qq:startGame', { questions: fragen, language: 'de', phases: 3 }, 10000);
console.log('  startGame-Antwort:', JSON.stringify(startAck ?? null).slice(0, 200));
for (let k = 0; k < 6; k++) {
  await sleep(500);
  const domPhase = await beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? null).catch(()=>null);
  console.log(`   +${(k+1)*0.5}s  Socket sagt ${letzterZustand?.phase}, Buehne sagt ${domPhase}`);
}
console.log('  Spielplan laut Server:', (letzterZustand?.schedule ?? []).map((e,i)=>`${i}:${e.category}${e.bunteTueteKind?'/'+e.bunteTueteKind:''}`).join(' '));
console.log('  aktuelle Frage:', letzterZustand?.currentQuestion?.text, '| Index', letzterZustand?.questionIndex);
await sleep(1200);
if (letzterZustand?.phase === 'LOBBY') { console.log('Spielstart hat nicht gegriffen.'); await browser.close(); process.exit(2); }

// Bis zur KARTOFFEL vorspulen, nicht nur bis zur ersten Frage. Der Server
// sortiert den Satz in die feste Kategorien-Reihenfolge (SCHAETZCHEN, MUCHO,
// BUNTE_TUETE, ZEHN_VON_ZEHN, CHEESE), die Kartoffel landet also nie auf
// Platz 0, egal wie man sie einreicht. Gemessen: Spielplan
// „0:SCHAETZCHEN 1:BUNTE_TUETE/hotPotato".
// Die Kette heisst nicht ueberall gleich: `qq:rulesNext` ist am letzten
// Regel-Bild ein STILLER No-Op (qqRulesNext Z4822), der Ausgang ist
// `qq:rulesFinish`.
const istKartoffel = () => letzterZustand?.phase === 'QUESTION_ACTIVE'
  && letzterZustand?.currentQuestion?.bunteTuete?.kind === 'hotPotato';
for (let i = 0; i < 40 && !istKartoffel(); i++) {
  const ph = letzterZustand?.phase;
  if (ph === 'RULES')                 await senden('qq:rulesFinish', {});
  else if (ph === 'TEAMS_REVEAL')     await senden('qq:teamsRevealFinish', {});
  else if (ph === 'QUESTION_ACTIVE')  await senden('qq:revealAnswer', {});
  else if (ph === 'QUESTION_REVEAL')  await senden('qq:startPlacement', {});
  else if (ph === 'PLACEMENT')        await senden('qq:nextQuestion', {});
  else                                await senden('qq:activateQuestion', {});
  await sleep(700);
  if (i % 8 === 7) console.log(`  … bei ${letzterZustand?.phase}, Frage ${letzterZustand?.questionIndex}`);
}
console.log(`  Phase jetzt: ${letzterZustand?.phase}, Frage: ${letzterZustand?.currentQuestion?.bunteTuete?.kind ?? '-'}`);
if (!istKartoffel()) { console.log('Komme nicht zur Kartoffel-Frage.'); await browser.close(); process.exit(2); }

// ⚠️ Der Riegel gegen ein falsches Gruen. Beim ersten Anlauf meldete dieses
// Skript „kein Hook-Bruch", waehrend auf der Buehne eine CHEESE-Frage stand -
// die zu pruefende Ansicht war nie da. Ein Werkzeug, das gruen sagt, ohne
// gemessen zu haben, ist schlimmer als keines.
const art = letzterZustand?.currentQuestion?.bunteTuete?.kind;
if (art !== 'hotPotato') {
  console.log(`\nABBRUCH: auf der Buehne steht \"${letzterZustand?.currentQuestion?.text?.slice(0,50)}\" (${letzterZustand?.currentQuestion?.category}/${art ?? '-'}), nicht die Kartoffel.`);
  console.log('Ohne die richtige Ansicht sagt dieser Lauf NICHTS aus.');
  await beamer.screenshot({ path:'.shots/kartoffel-falsche-frage.png' });
  teamSocks.forEach(t=>t.close()); sock.close(); await browser.close(); process.exit(3);
}
await senden('qq:hotPotatoStart', {});
await sleep(1500);
console.log(`  Kartoffel laeuft, aktives Team: ${letzterZustand?.hotPotatoActiveTeamId ?? '-'}`);
await beamer.screenshot({ path:'.shots/kartoffel-vorher.png' });

// Die Ids aus dem Zustand nehmen: im Raum koennen Bots aus einem frueheren
// Lauf stehen (der Raum lebt im RAM weiter, `rm` allein reicht nicht - CLAUDE.md).
const echteTeams = (letzterZustand?.teams ?? []).map(t => t.id);
console.log(`\nEliminiere die ${echteTeams.length} Teams einzeln:`);
const vorher = fehler.length;
for (const id of echteTeams) {
  await senden('qq:hotPotatoEliminateTeam', { teamId: id });
  await sleep(1100);
  const neu2 = fehler.slice(vorher);
  const h = neu2.filter(m => /fewer hooks|Minified React error #(300|310)/i.test(m));
  console.log(`  ${id} raus  ->  aktiv: ${letzterZustand?.hotPotatoActiveTeamId ?? 'NULL'}  ${h.length ? '💥 ' + h[0].slice(0,70) : 'ok'}`);
  if (h.length) break;
}

await sleep(1500);
await beamer.screenshot({ path:'.shots/kartoffel-letztes-team.png' });
const nachher = fehler.slice(vorher);
const hooks = nachher.filter(m => /fewer hooks|Minified React error #(300|310)/i.test(m));
console.log(`\nMeldungen insgesamt: ${nachher.length}`);
nachher.slice(0,5).forEach(m => console.log('  · ' + m));
console.log(hooks.length
  ? '\nROT: die Buehne bricht, wenn das letzte Team eliminiert wird.'
  : '\nGRUEN: kein Hook-Bruch. Bild in .shots/kartoffel-letztes-team.png pruefen.');
teamSocks.forEach(t=>t.close()); teamSocks.forEach(t=>t.close()); sock.close(); await browser.close();
process.exit(hooks.length ? 1 : 0);
