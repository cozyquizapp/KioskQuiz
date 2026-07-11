// ── CozyArena Last-Test ──────────────────────────────────────────────────────
// Simuliert N echte Socket.IO-Geraete gegen den Backend-Broadcast (nicht die
// In-Process-Bots!). Testet die drei Live-Event-Risiken:
//   1. Vertraegt der Server N gleichzeitige Verbindungen in einem Raum?
//   2. Skaliert der Full-State-Broadcast (jeder Join/Answer -> buildQQStateUpdate
//      an ALLE)? -> Fan-out-Latenz + Payload-Groesse bei N Teams messen.
//   3. Balanciert die Fraktions-Logik N Handys sauber auf die 8 Fraktionen?
//
// Nutzung (Backend muss lokal auf :4000 laufen, npm run dev):
//   node backend/scripts/loadtest-arena.mjs [N] [URL]
//   N   = Anzahl Geraete (Default 40)
//   URL = Backend (Default http://localhost:4000)
//
// Jedes Geraet schickt avatarId 'fox' -> Worst Case fuer den Balancer (alle
// wollen dieselbe Fraktion). Der Server muss sie auf ~N/8 pro Fraktion verteilen.
import { io } from 'socket.io-client';

const N = Number(process.argv[2] ?? 40);
const URL = process.argv[3] ?? 'http://localhost:4000';
const PIN = process.env.ADMIN_PIN ?? '2506'; // lokaler Dev-Default-PIN
const ROOM = `loadtest-${Date.now()}`; // frischer Raum je Lauf (kein Stale-State)
const FACTIONS = ['fox', 'frog', 'panda', 'rabbit', 'unicorn', 'raccoon', 'cow', 'cat'];

const now = () => Number(process.hrtime.bigint() / 1000n) / 1000; // ms, monoton
const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(label) {
  return new Promise((resolve, reject) => {
    const s = io(URL, { transports: ['websocket'], reconnection: false, timeout: 8000 });
    const to = setTimeout(() => reject(new Error(`${label}: connect timeout`)), 9000);
    s.on('connect', () => { clearTimeout(to); resolve(s); });
    s.on('connect_error', (e) => { clearTimeout(to); reject(e); });
  });
}

function emitAck(s, event, payload, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error(`${event} ack timeout`)), timeoutMs);
    s.emit(event, payload, (ack) => { clearTimeout(to); resolve(ack); });
  });
}

async function main() {
  console.log(`\n🎯 CozyArena Last-Test: ${N} Geraete → ${URL} (Raum "${ROOM}")\n`);

  // 1) Moderator-Socket: erst als Mod authentifizieren (PIN), dann Arena aktivieren
  const mod = await connect('mod');
  const authAck = await emitAck(mod, 'qq:joinModerator', { roomCode: ROOM, pin: PIN });
  if (authAck && authAck.ok === false) { console.error(`❌ Mod-Auth fehlgeschlagen: ${JSON.stringify(authAck)}`); process.exit(1); }
  const optAck = await emitAck(mod, 'qq:setQuizOptions', { roomCode: ROOM, largeGroupMode: true });
  if (optAck && optAck.ok === false) { console.error(`❌ Arena-Aktivierung fehlgeschlagen: ${JSON.stringify(optAck)}`); process.exit(1); }
  console.log('✅ Mod authentifiziert + Arena-Modus (largeGroupMode) aktiviert\n');

  // 2) N Geraete verbinden + joinen. Pro Geraet: Verbindung, dann qq:joinTeam.
  //    Wir messen die Join-Ack-Latenz und zaehlen empfangene qq:stateUpdate.
  const clients = [];
  let connectFails = 0, joinFails = 0;
  const joinErrCodes = {};
  const joinLatencies = [];
  let lastStatePayloadBytes = 0;
  let lastStateTeams = [];

  console.log(`⏳ Verbinde + joine ${N} Geraete …`);
  const tJoinStart = now();
  for (let i = 0; i < N; i++) {
    let s;
    try { s = await connect(`dev${i}`); }
    catch { connectFails++; continue; }

    const c = { s, id: `lt-${i}-${i * 7 + 3}`, updates: 0, lastBytes: 0 };
    s.on('qq:stateUpdate', (st) => {
      c.updates++;
      const bytes = JSON.stringify(st).length;
      c.lastBytes = bytes;
      lastStatePayloadBytes = bytes;
      lastStateTeams = st.teams ?? [];
    });
    clients.push(c);

    const t0 = now();
    try {
      // teamName wird bei Reassign eh serverseitig gesetzt; avatarId 'fox' = Worst Case
      const jAck = await emitAck(s, 'qq:joinTeam', { roomCode: ROOM, teamId: c.id, teamName: `Load ${i}`, avatarId: 'fox', emoji: 'bauchgefuehl' });
      if (jAck && jAck.ok === false) { joinFails++; joinErrCodes[jAck.code ?? 'ERR'] = (joinErrCodes[jAck.code ?? 'ERR'] ?? 0) + 1; }
      else joinLatencies.push(now() - t0);
    } catch { joinFails++; joinErrCodes['TIMEOUT'] = (joinErrCodes['TIMEOUT'] ?? 0) + 1; }
  }
  const tJoinTotal = now() - tJoinStart;
  await sleep(600); // Broadcasts abklingen lassen

  // 3) Fan-out-Probe: mit N Teams im Raum EINEN Broadcast ausloesen und messen,
  //    wie lange bis ALLE Clients das qq:stateUpdate haben (= die Kosten, die bei
  //    JEDER Antwort anfallen). Mehrere Runden fuer einen stabilen Wert.
  const fanoutMax = [];
  const ROUNDS = 8;
  for (let r = 0; r < ROUNDS; r++) {
    const baseline = clients.map((c) => c.updates);
    const arrival = new Array(clients.length).fill(0);
    const tTrigger = now();
    const done = new Promise((resolve) => {
      let got = 0;
      clients.forEach((c, idx) => {
        const target = baseline[idx] + 1;
        const iv = setInterval(() => {
          if (c.updates >= target) { clearInterval(iv); arrival[idx] = now() - tTrigger; if (++got === clients.length) resolve(); }
        }, 1);
        setTimeout(() => { clearInterval(iv); if (arrival[idx] === 0) arrival[idx] = now() - tTrigger; }, 3000);
      });
    });
    // Trigger: erneutes setQuizOptions -> broadcast(io, room) an alle
    mod.emit('qq:setQuizOptions', { roomCode: ROOM, largeGroupMode: true });
    await Promise.race([done, sleep(3200)]);
    fanoutMax.push(Math.max(...arrival));
    await sleep(150);
  }

  // 4) Fraktions-Balance aus dem letzten State
  const dist = {};
  for (const f of FACTIONS) dist[f] = 0;
  for (const t of lastStateTeams) dist[t.avatarId] = (dist[t.avatarId] ?? 0) + 1;
  const counts = FACTIONS.map((f) => dist[f]);
  const balMin = Math.min(...counts), balMax = Math.max(...counts);

  // ── Report ──────────────────────────────────────────────────────────────────
  const totalUpdates = clients.reduce((a, c) => a + c.updates, 0);
  console.log('\n════════════════ ERGEBNIS ════════════════');
  console.log(`Verbindungen:      ${clients.length}/${N} ok (${connectFails} fehlgeschlagen)`);
  console.log(`Joins:             ${clients.length - joinFails}/${clients.length} ok (${joinFails} fehlgeschlagen)${Object.keys(joinErrCodes).length ? ' — Fehler: ' + JSON.stringify(joinErrCodes) : ''}`);
  console.log(`Teams im Raum:     ${lastStateTeams.length}`);
  console.log('');
  console.log(`Join-Latenz:       p50 ${pct(joinLatencies, 50).toFixed(1)} ms · p95 ${pct(joinLatencies, 95).toFixed(1)} ms · max ${Math.max(...joinLatencies).toFixed(1)} ms`);
  console.log(`Join-Storm gesamt: ${tJoinTotal.toFixed(0)} ms fuer ${clients.length} sequentielle Joins`);
  console.log('');
  console.log(`Broadcast-Fan-out (Kosten JE Antwort, an alle ${clients.length} Sockets):`);
  console.log(`   Zeit bis alle das Update haben:  p50 ${pct(fanoutMax, 50).toFixed(1)} ms · max ${Math.max(...fanoutMax).toFixed(1)} ms`);
  console.log(`   Full-State-Payload bei ${lastStateTeams.length} Teams:  ${(lastStatePayloadBytes / 1024).toFixed(1)} KB`);
  console.log(`   Stateupdates empfangen (gesamt):  ${totalUpdates}`);
  console.log('');
  console.log(`Fraktions-Balance: [${counts.join(', ')}]  (min ${balMin} / max ${balMax})  ${balMax - balMin <= 1 ? '✅ ausgewogen' : '⚠️ SCHIEF'}`);
  console.log('   ' + FACTIONS.map((f, i) => `${f}:${counts[i]}`).join('  '));
  console.log('═══════════════════════════════════════════\n');

  clients.forEach((c) => c.s.close());
  mod.close();
  await sleep(200);
  process.exit(0);
}

main().catch((e) => { console.error('❌ Last-Test-Fehler:', e); process.exit(1); });
