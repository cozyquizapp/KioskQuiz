/**
 * spanne-vergleich.mjs — Schaetzchen in CrowdQuiz: Bestand gegen Variante „Spanne".
 *
 * 2026-08-29, Wolf: „bau die spanne als variante, dann zeig mir beides."
 *
 * Bestand:  das Wappen sitzt am BESTEN Tipp der Fraktion, die Punkte kommen
 *           aus dem Durchschnitt ueber ihre Handys.
 * Variante: das Wappen sitzt am DURCHSCHNITT, und dahinter liegt die Spanne
 *           vom schlechtesten bis zum besten Tipp als eingefaerbtes Stueck
 *           Schiene.
 *
 * ⚠️ Damit es ueberhaupt eine Spanne GIBT, braucht jede Fraktion mehr als ein
 * Handy. Mit acht Bots hat sie genau eins, und die Variante zeigt dasselbe Bild
 * wie der Bestand - ein Vergleich, der nichts vergleicht. Also 24 Bots, drei je
 * Fraktion, und Tipps, die sich INNERHALB der Fraktion unterscheiden.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep, API, PIN } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const ZIEL = '.shots/spanne';
fs.mkdirSync(ZIEL, { recursive: true });
const BOTS = 24;

/** Tipp je Handy. Der Fraktions-Anteil (i % 8) streut breit, der Handy-Anteil
 *  innerhalb der Fraktion schmal - so hat jede Fraktion eine echte Spanne. */
const tipps = (ziel) => Array.from({ length: BOTS }, (_, i) =>
  String(Math.round(ziel * (1 + ((i % 8) - 4) * 0.035 + (Math.floor(i / 8) - 1) * 0.018))));

for (const variante of [false, true]) {
  const name = variante ? 'spanne' : 'bestand';
  const b = await buehneStarten({
    grossformat: true, entwurf: 'crowd-vol-1', kategorie: 'SCHAETZCHEN',
    frisch: true, bots: BOTS, antworten: 0,
  });
  // Schalter setzen und neu laden, damit die Ansicht ihn beim Aufbau liest.
  await b.seite.evaluate((an) => {
    try { an ? localStorage.setItem('qq-spanne', '1') : localStorage.removeItem('qq-spanne'); } catch { /* ignore */ }
  }, variante);
  await b.seite.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);

  await b.aufbauen('spiel');
  console.log(`\n── ${name} · largeGroupMode=${b.helfer.zustand()?.largeGroupMode} · Teams ${b.helfer.zustand()?.teams?.length}`);
  await b.helfer.zurFrage();

  let da = false;
  for (let i = 0; i < 12 && !da; i++) {
    const q = b.helfer.zustand()?.currentQuestion;
    if (q?.category === 'SCHAETZCHEN') {
      da = true;
      const ziel = Number(q.targetValue ?? 1000);
      const senden = () => fetch(`${API}/api/qq/${encodeURIComponent(b.roomCode)}/dev/simAnswers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: PIN, stagger: false, texts: tipps(ziel) }),
      });
      await senden();
      await sleep(600);
      await senden();   // Nachzuegler-Bots ueberschreiben, siehe zahlenstrahl-probe
      await b.emit('qq:revealAnswer');
      await sleep(3600);
      await b.seite.screenshot({ path: `${ZIEL}/${name}.png` });
      const raus = await b.seite.evaluate(() => [...document.querySelectorAll('*')]
        .filter(el => { const r = el.getBoundingClientRect(); return r.width > 20 && r.height > 12 && (el.textContent || '').trim().length <= 40 && el.children.length <= 3 && (r.right > 1761 || r.left < -1); }).length);
      console.log(`  Ziel ${ziel} · ausserhalb: ${raus} · ${(await b.seite.evaluate(() => (document.body.innerText || '').replace(/\n+/g, ' | ').slice(0, 200)))}`);
    }
    if (!da) await b.helfer.naechsteFrage();
  }
  if (!da) console.log('  ⚠️ Keine Schaetzchen-Frage erreicht.');
  await b.schliessen();
}

const B = 1760, H = 990;
await sharp({ create: { width: B, height: H * 2 + 8, channels: 3, background: '#000000' } })
  .composite([
    { input: await sharp(`${ZIEL}/bestand.png`).toBuffer(), left: 0, top: 0 },
    { input: await sharp(`${ZIEL}/spanne.png`).toBuffer(), left: 0, top: H + 8 },
  ]).png().toFile(`${ZIEL}/untereinander.png`);
console.log(`\n  oben Bestand, unten Variante -> ${ZIEL}/untereinander.png`);
process.exit(0);
