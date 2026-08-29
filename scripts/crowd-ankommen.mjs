/**
 * crowd-ankommen.mjs — die Ankommen-Folien (preGame) von CrowdQuiz durchfahren.
 *
 * WARUM ein eigenes Werkzeug: die Stationstabelle in lib/buehne.mjs hat fuer
 * das Ankommen ueberhaupt keine Station, und selbst mit einer waere eine zu
 * wenig. Hinter dem Ankommen steckt eine Rotation von Karten, die alle acht
 * Sekunden weiterschaltet (CozyQuizPausedView, der setInterval am Ende der
 * Datei). Wer einmal knipst, sieht eine zufaellige Karte und weiss nicht,
 * welche er nicht gesehen hat.
 *
 * 2026-08-28, Wolf am Livebild zur Emoji-Folie: „das ist schon mal falsch
 * leider, hier muessten die fraktionen vorgestellt werden". Die falsche Folie
 * ist raus - aber „raus" ist nur die halbe Antwort. Die andere Haelfte ist,
 * ob die richtige Folie („Die Fraktionen") ueberhaupt auftaucht. Genau das
 * hat bisher niemand gemessen, ich auch nicht.
 *
 * Was es tut: stellt das Ankommen her (Phase LOBBY, Wizard durch, Lobby noch
 * zu), liest ueber einen vollen Umlauf hinweg den Text der jeweils sichtbaren
 * Karte, und knipst jede Karte einmal. Ergebnis: eine Liste aller
 * Ankommen-Folien von CrowdQuiz, mit Bild.
 *
 * Aufruf:  node scripts/crowd-ankommen.mjs [--cozy]
 *          --cozy misst CozyQuiz statt CrowdQuiz (zum Gegenlesen).
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

const cozy = process.argv.includes('--cozy');
const ZIEL = cozy ? '.shots/ankommen-cozy' : '.shots/ankommen-crowd';
fs.mkdirSync(ZIEL, { recursive: true });

// Die Ueberschrift der aktiven Karte.
//
// ⚠️ Erster Anlauf suchte `[data-qq-panel]` - das Attribut gibt es nicht, die
// Karten tragen keinen Haken. Der Lauf meldete daraufhin „0 Folien" und
// „Fraktionen-Folie da: NEIN". Das waere als Befund durchgegangen, ist aber
// keiner: nicht die App war leer, das Messgeraet hat nichts angefasst. Ein
// Werkzeug, das schweigt, muss man erst zum Finden bringen (Wolf 2026-08-28:
// „hast du getestet, ob es misst was es soll?").
//
// Jetzt ohne Annahme ueber die Struktur, und ohne die Ueberschrift zu raten:
// gelesen wird der GESAMTE sichtbare Text im Kartenband (die mittleren zwei
// Drittel der Bildhoehe). Der Hero darueber und die Fusszeile darunter fallen
// damit heraus, ohne dass eine Klasse dafuer noetig waere. Wechselt dieser
// Text, ist eine neue Karte da - was auf ihr steht, lese ich danach am Bild
// ab, nicht ueber eine zweite Heuristik.
const KARTENTEXT = () => {
  const H = window.innerHeight;
  const teile = [];
  let best = null, bestPx = 0;
  for (const el of document.querySelectorAll('div, span, h1, h2, h3, p')) {
    if (el.children.length > 0) continue;              // nur Blaetter
    const t = (el.textContent || '').trim();
    if (!t) continue;
    const r = el.getBoundingClientRect();
    if (r.top < H * 0.18 || r.bottom > H * 0.92) continue;
    if (r.width < 8 || r.height < 6) continue;
    teile.push(t.replace(/\s+/g, ' '));
    const px = parseFloat(getComputedStyle(el).fontSize) || 0;
    if (px > bestPx && t.length <= 60) { bestPx = px; best = t.replace(/\s+/g, ' '); }
  }
  return { signatur: teile.join('|').slice(0, 400), titel: best };
};

const b = await buehneStarten({ bots: cozy ? 8 : 12, frisch: true, takt: () => {}, entwurf: 'qq-vol-1' });
if (!cozy) await b.emit('qq:setQuizOptions', { largeGroupMode: true, nestedTeams: true });
await b.emit('qq:setTheme', { themeId: 'buehne' });
await sleep(600);
// ⚠️ Die Diaschau ist NICHT die Station `willkommen`. Zweiter Fehlgriff an
// diesem Werkzeug: `willkommen` ist der Titel-Auftritt („HERZLICH WILLKOMMEN
// ZUM COZYQUIZ"), gemessen am Bild .shots/ankommen-cozy/01-C.png. Die
// Kartenrotation laeuft im Ankommen, und das ist ein Zustand, kein Weg:
// Phase LOBBY, Wizard durch, Lobby NOCH NICHT geoeffnet (QQBeamerPage, die
// Kette bei `renderState.phase === 'LOBBY'`). Die Buehne haengt selbst ein
// Schild dran - `data-qq-lobby-ansicht` - und darauf warten wir, statt zu
// hoffen.
//
// Und der Raum muss GEFUELLT sein. Dritter Fehlgriff: mit einem rohen Raum
// stand die Diaschau zwar, hatte aber nichts zu zeigen - das Bild
// .shots/ankommen-cozy/02-C.png zeigt nur „Das Event wird vorbereitet".
// Karten wie „Wer ist schon da" oder die Fraktionen leben von Teams. Also
// erst den Lobby-Aufbau des Harness laufen lassen (Bots, Wizard durch), und
// dann die Lobby wieder zumachen - dadurch faellt die Kette einen Zweig
// zurueck ins Ankommen, mit vollem Raum.
await b.zurStation('lobby');
await sleep(1200);
await b.emit('qq:setLobbyOpen', { value: false });
await b.seite.waitForSelector('[data-qq-lobby-ansicht="ankommen"]', { timeout: 15000 });
await sleep(2500);

// Ein voller Umlauf: acht Sekunden je Takt, zweisprachig also zwei Takte je
// Karte. Wir schauen jede Sekunde nach und merken uns jeden WECHSEL.
const gesehen = [];
const signaturen = new Set();
let letzte = null;
const TAKTE = 220; // reicht fuer rund zwoelf Karten
for (let i = 0; i < TAKTE; i++) {
  const r = await b.seite.evaluate(KARTENTEXT).catch(() => null);
  if (r?.signatur && r.signatur !== letzte) {
    letzte = r.signatur;
    // Wenn dieselbe Karte zum zweiten Mal kommt, ist der Umlauf durch.
    if (signaturen.has(r.signatur)) { console.log('  (Umlauf durch)'); break; }
    signaturen.add(r.signatur);
    await sleep(1100); // Auftrittsbewegung abwarten
    const nr = String(gesehen.length + 1).padStart(2, '0');
    const kurz = (r.titel ?? 'ohne-titel').replace(/[^\wäöüÄÖÜß ]/g, '').trim().replace(/\s+/g, '-').slice(0, 28);
    const datei = `${ZIEL}/${nr}-${kurz || 'ohne-titel'}.png`;
    await b.seite.screenshot({ path: datei });
    gesehen.push({ titel: r.titel, signatur: r.signatur, datei });
    console.log(`  ${nr}  ${r.titel}`);
  }
  await sleep(1000);
}

const alles = gesehen.map(g => `${g.titel} ${g.signatur}`).join(' ');
console.log(`\n  ${gesehen.length} Folien im Ankommen von ${cozy ? 'CozyQuiz' : 'CrowdQuiz'}:`);
for (const g of gesehen) console.log(`    · ${g.titel}`);
console.log(`\n  Fraktionen-Folie da: ${/Fraktion|Faction/i.test(alles) ? 'JA' : 'NEIN'}`);
console.log(`  Emoji-Folie da:      ${/Team-Emoji|team emoji/i.test(alles) ? 'JA' : 'nein'}`);
if (!gesehen.length) {
  console.log('\n  ⚠️ NICHTS gemessen. Das ist kein Befund ueber die App, sondern');
  console.log('     einer ueber dieses Werkzeug - der Lesekopf hat nichts gegriffen.');
}
await b.schliessen?.();
process.exit(0);
