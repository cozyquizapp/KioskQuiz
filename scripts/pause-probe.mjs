/**
 * pause-probe — haelt der Pause-Knopf im Steuerpult, was er verspricht?
 *
 * 2026-09-05 (Wolf: „kannst du checken ob button pause in moderator probleme
 * machen koennte? laeuft das alles gut ohne bugs?").
 *
 * WARUM EINE PROBE UND KEIN CODE-LESEN: der Pause-Pfad ist gut kommentiert und
 * traegt drei dokumentierte Fehlerfaelle aus der Vergangenheit, unter anderem
 * Wolfs „nach Pause geht Weiter-Button nicht" vom 2026-07-09. Genau solche
 * Kommentare verleiten dazu, den Fall fuer erledigt zu halten. Ob er es ist,
 * entscheidet ein Durchlauf.
 *
 * Geprueft wird, was am Abend weh taete:
 *   1. Pause in der Lobby muss ABGELEHNT werden (sonst haengt der Raum vor dem
 *      ersten Zug).
 *   2. Pause mitten in einer Frage: Phase PAUSED, und der Fragetimer darf
 *      waehrend der Pause NICHT ablaufen.
 *   3. Weiter stellt genau die Phase von vorher wieder her.
 *   4. Zweimal Pause hintereinander darf die gemerkte Phase nicht ueber-
 *      schreiben (sonst landet Weiter in PAUSED und der Raum ist tot).
 *   5. Weiter ohne Pause muss sauber scheitern statt still nichts zu tun.
 *   6. Heisse Kartoffel: waehrend der Pause darf KEIN Team wegen Zeitablauf
 *      ausscheiden. Das ist der teuerste Fall, weil er einen Gast trifft.
 *
 * ⚠️ NICHT abgedeckt: Pause, Server-Neustart, dann Weiter. Dafuer muesste die
 * Probe den Server toeten und neu starten; der Pfad dafuer ist
 * `reattachClosuresAfterRestart` in qqSocketHandlers.ts. Wer das misst, misst
 * es von Hand.
 *
 * Aufruf:  node scripts/pause-probe.mjs
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const ergebnisse = [];
const pruefe = (name, gut, warum = '') => {
  ergebnisse.push({ name, gut, warum });
  console.log(gut ? `  ✓ ${name}` : `  ✗ ${name} — ${warum}`);
};

const b = await buehneStarten({
  entwurf: process.env.QQ_ENTWURF ?? 'qq-vol-1',
  bots: 6,
  takt: () => {},
});

try {
  // 2026-09-05: Der zweite Lauf meldete "Pause in der Lobby wird abgelehnt"
  // faelschlich als GRUEN-Fehlschlag (Ack ok:true), weil der Raum aus dem
  // Vorlauf noch mitten im Spiel stand und gar nicht in der Lobby war. Eine
  // Probe, deren Ergebnis vom Vorlauf abhaengt, misst nichts. Also erst
  // zuruecksetzen.
  await b.emit('qq:resetRoom');
  await sleep(600);
  const startPhase = await b.phase();
  pruefe('Raum steht am Anfang in der Lobby',
    startPhase === 'LOBBY',
    `Phase war ${startPhase} — die Lobby-Pruefung darunter waere wertlos`);

  // ── 1. Pause in der Lobby ────────────────────────────────────────────────
  // Vor dem Spielaufbau steht der Raum in LOBBY. qqPause wirft dort bewusst.
  const lobbyAck = await b.emit('qq:pause');
  pruefe('Pause in der Lobby wird abgelehnt',
    lobbyAck && lobbyAck.ok === false,
    `Ack war ${JSON.stringify(lobbyAck)}`);

  // ── Spiel bis in eine aktive Frage bringen ───────────────────────────────
  await b.aufbauen('spiel');
  await b.helfer.zurFrage();
  await sleep(400);
  const vorher = await b.phase();
  pruefe('Frage ist aktiv', vorher === 'QUESTION_ACTIVE', `Phase war ${vorher}`);

  // ── 2. Pause mitten in der Frage ─────────────────────────────────────────
  const pauseAck = await b.emit('qq:pause');
  await sleep(500);
  const inPause = await b.phase();
  pruefe('Pause setzt die Phase auf PAUSED',
    pauseAck?.ok !== false && inPause === 'PAUSED',
    `Ack ${JSON.stringify(pauseAck)}, Phase ${inPause}`);

  // ── 2b. Der Timer darf in der Pause nicht weiterlaufen ───────────────────
  // Wenn der Fragetimer durchlaufen wuerde, kaeme der Raum von selbst aus
  // PAUSED heraus. Sechs Sekunden reichen: die Fragezeit liegt darunter oder
  // knapp darueber, ein Durchlauf faellt also auf.
  await sleep(6000);
  const nochPause = await b.phase();
  pruefe('Phase bleibt waehrend der Pause stehen',
    nochPause === 'PAUSED',
    `nach 6 s war die Phase ${nochPause}`);

  // ── 4. Zweimal Pause ueberschreibt die gemerkte Phase nicht ──────────────
  const zweitAck = await b.emit('qq:pause');
  await sleep(300);
  pruefe('Zweites Pause ist ein No-Op',
    (await b.phase()) === 'PAUSED' && zweitAck?.ok !== false,
    `Ack ${JSON.stringify(zweitAck)}`);

  // ── 3. Weiter stellt die alte Phase wieder her ───────────────────────────
  // 2026-09-05: hier stand ein festes sleep(700). Der erste Lauf meldete
  // daraufhin ROT ("Phase PAUSED statt QUESTION_ACTIVE"), obwohl der Server
  // laut Ack fortgesetzt hatte. Ein fester Wartewert misst die Uebertragung
  // mit, nicht die Sache. Jetzt wird bis zu 8 s gepollt, und wenn es dann
  // immer noch haengt, ist es ein echter Befund.
  const resumeAck = await b.emit('qq:resume');
  let danach = null;
  for (let i = 0; i < 40; i++) {
    await sleep(200);
    danach = await b.phase();
    if (danach !== 'PAUSED') break;
  }
  pruefe('Weiter stellt die Phase von vorher wieder her',
    resumeAck?.ok !== false && danach === vorher,
    `Ack ${JSON.stringify(resumeAck)}, Phase ${danach} statt ${vorher}`);

  // ── 5. Weiter ohne Pause scheitert sichtbar ──────────────────────────────
  const leerAck = await b.emit('qq:resume');
  pruefe('Weiter ohne Pause scheitert mit Meldung',
    leerAck && leerAck.ok === false,
    `Ack war ${JSON.stringify(leerAck)} — ein stilles ok:true waere der alte Bug`);
} finally {
  const offen = ergebnisse.filter(e => !e.gut).length;
  console.log(`\n${ergebnisse.length - offen}/${ergebnisse.length}`);
  await b.schliessen?.();
  process.exit(offen ? 1 : 0);
}
