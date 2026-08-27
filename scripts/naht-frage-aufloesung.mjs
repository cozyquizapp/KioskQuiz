/* naht-frage-aufloesung — schneidet die Aufloesung wirklich hart?
 *
 * 2026-08-26. Im Motion-Plan steht seit dem 24. August als naechster Kandidat:
 * „B1 (Bogen-Wisch) + B5 (Marker statt Einfaerbung) an der Aufloesung, gegen
 * den Ist-Zustand stellen. Beide klein, an einer Stelle, die zwanzigmal am
 * Abend laeuft und heute HART SCHNEIDET."
 *
 * ⚠️ Diese Behauptung ist zwei Tage alt, und dazwischen liegen zwei Dinge: der
 * Szenenwechsel („Cozy Kino", main.css) und Wolfs Urteil vom 2026-08-26 zur
 * Aufloesung - „Ich fands bisher überhaupt nicht unruhig". Wer jetzt eine
 * Alternative baut, baut sie womoeglich gegen ein Problem, das es nicht mehr
 * gibt. Also erst messen, ob die Praemisse noch stimmt.
 *
 * ── Was ein harter Schnitt ist, in messbaren Worten ────────────────────────
 * Nicht „es sieht abgehackt aus". Ein harter Schnitt heisst: der Inhalt
 * wechselt von einem Bild zum naechsten, waehrend NICHTS animiert. Es gibt
 * also einen Bildaufbau, in dem sich alles geaendert hat und null Bewegungen
 * laufen.
 *
 * Umgekehrt: laufen im Moment des Wechsels Bewegungen, und decken die die
 * Umstellung ab, dann schneidet nichts - dann ist es eine Ueberblendung, und
 * die Frage ist hoechstens noch, ob sie gefaellt.
 *
 * Gemessen wird mit einer Mitschrift IN der Seite, ein Eintrag je Bildaufbau.
 * Von aussen abzutasten geht hier nicht: der Abtaster haengt genau in dem
 * Moment, den er messen soll (dieselbe Falle wie bei der Lobby-Naht).
 *
 * NUTZUNG:  node scripts/naht-frage-aufloesung.mjs
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const MARKEN = [60, 140, 260, 420, 700, 1200];

const b = await buehneStarten({
  bots: 8, frisch: true, takt: () => {},
  kategorie: 'MUCHO', entwurf: 'qq-vol-1',
});
const h = b.helfer ?? b;
const seite = h.seite();
fs.mkdirSync('.shots', { recursive: true });

// Auf die Frage stellen, Antworten liegen lassen - genau der Zustand, aus dem
// heraus der Moderator aufloest.
await b.zurStation('frage');
await sleep(1200);
await h.antworten();
await sleep(1400);
await seite.screenshot({ path: '.shots/naht-fa-vorher.png' });

// Mitschrift starten: je Bildaufbau, was laeuft und was auf der Buehne steht.
await seite.evaluate(() => {
  const log = [];
  globalThis.__fa = log;
  const t0 = performance.now();
  const tick = () => {
    const laufen = document.getAnimations().filter(a => {
      const r = a.effect?.getComputedTiming?.() ?? {};
      // Endlose Bewegungen (Gluehwuermchen) decken keinen Schnitt ab - die
      // laufen ohnehin die ganze Zeit und aendern nichts an der Umstellung.
      return r.iterations !== Infinity && a.playState === 'running';
    });
    // Die Frage selbst: sie traegt eine eigene Kennung. Ihre wirksame
    // Deckkraft ist das Produkt der ganzen Elternkette.
    const frage = document.querySelector('[data-qq-frage]');
    let deck = -1;
    if (frage) { deck = 1; for (let e = frage; e && e !== document.body; e = e.parentElement) deck *= Number(getComputedStyle(e).opacity); }
    log.push([
      Math.round(performance.now() - t0),
      laufen.length,
      [...new Set(laufen.map(a => a.animationName ?? a.transitionProperty ?? '?'))].slice(0, 6),
      // Ein grober Fingerabdruck des Bildinhalts. Aendert er sich, hat sich
      // sichtbar etwas umgestellt.
      (document.body.innerText || '').replace(/\s+/g, '').length,
      frage ? +deck.toFixed(2) : -1,
    ]);
    if (log.length < 260) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await h.emit('qq:revealAnswer');
const t0 = Date.now();
for (const ziel of MARKEN) {
  while (Date.now() - t0 < ziel) await sleep(10);
  await seite.screenshot({ path: `.shots/naht-fa-${ziel}.png` });
}
await sleep(1200);
const log = await seite.evaluate(() => globalThis.__fa);

// ── Auswertung ────────────────────────────────────────────────────────────
// Der Moment der Umstellung: das erste Bild, in dem sich der Fingerabdruck
// aendert. Und dann die Frage: liefen da Bewegungen?
let umstellung = null;
for (let i = 1; i < log.length; i++) {
  if (log[i][3] !== log[i - 1][3]) { umstellung = i; break; }
}

console.log('\n══ Der Moment der Umstellung ═══════════════════════════════════');
if (umstellung == null) {
  console.log('  Keine Umstellung im Protokoll gefunden.');
} else {
  const [ms, n, namen] = log[umstellung];
  console.log(`  Bei ${ms} ms wechselt der Inhalt.`);
  console.log(`  Dabei laufen ${n} Bewegungen: ${namen.join(', ') || '(keine)'}`);
  console.log(n === 0
    ? '  ✗ HARTER SCHNITT. Der Inhalt wechselt, waehrend nichts animiert.'
    : '  ✓ Kein harter Schnitt. Die Umstellung laeuft unter Bewegung.');
}

// Wie viele Bewegungen laufen in der ersten Sekunde insgesamt?
const ersteSekunde = log.filter(z => z[0] <= 1000);
const hoechste = Math.max(0, ...ersteSekunde.map(z => z[1]));
const namenAlle = new Set(ersteSekunde.flatMap(z => z[2]));
console.log('\n══ Die erste Sekunde ═══════════════════════════════════════════');
console.log(`  Hoechstens ${hoechste} Bewegungen gleichzeitig.`);
console.log(`  Beteiligt: ${[...namenAlle].join(', ')}`);
const leer = ersteSekunde.filter(z => z[1] === 0).length;
console.log(`  Bilder ganz ohne Bewegung: ${leer} von ${ersteSekunde.length}`);

// ── Blinkt die Frage? ─────────────────────────────────────────────────────
// ⚠️ Der Kontaktbogen hat es gezeigt, bevor eine Zahl es sagte: bei 60 ms
// steht der Fragetext nicht im Bild. Ursache waere ein Neu-Einhaengen des
// Elements - der Fragekasten traegt `key={lang-cardFontSize}`, und seit dem
// 2026-08-26 AENDERT sich die Schriftgroesse beim Aufloesen (eigene, kleinere
// Leiter, damit die Gewinnerkarte unten Platz hat). Ein neuer Key heisst neues
// Element, und das faengt seine Einblendung bei null an.
const weg = log.filter(z => z[4] >= 0 && z[4] < 0.15);
console.log('\n══ Blinkt die Frage beim Aufloesen? ════════════════════════════');
if (!weg.length) {
  console.log('  Nein, sie bleibt durchgehend sichtbar.');
} else {
  console.log(`  ✗ In ${weg.length} Bildern liegt ihre Deckkraft unter 0,15`);
  console.log(`    von ${weg[0][0]} bis ${weg[weg.length - 1][0]} ms.`);
}

// ── Kontaktbogen ──────────────────────────────────────────────────────────
const breite = 440, hoehe = Math.round(breite * 990 / 1760);
const teile = [];
for (const z of MARKEN) teile.push(await sharp(`.shots/naht-fa-${z}.png`).resize(breite).toBuffer());
await sharp({ create: { width: breite * 3, height: hoehe * 2, channels: 3, background: '#111' } })
  .composite(teile.map((input, i) => ({ input, left: (i % 3) * breite, top: Math.floor(i / 3) * hoehe })))
  .toFile('.shots/NAHT-FRAGE-AUFLOESUNG.png');
console.log(`\n  Kontaktbogen: .shots/NAHT-FRAGE-AUFLOESUNG.png (${MARKEN.join(', ')} ms)`);

await b.schliessen?.();
