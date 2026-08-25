/**
 * klang-messen — was kommt aus dem Bus wirklich heraus?
 *
 * 2026-08-25. Beim Sound-Durchgang am selben Tag stellte sich heraus, dass der
 * lauteste Moment des Abends mit Spitze 2,151 lief, also mit mehr als dem
 * Doppelten des moeglichen Pegels. Das hoert man als hart und verzerrt, und
 * man findet es nie durch Hinhoeren am Laptop - dort ist es einfach nur laut.
 *
 * Deshalb gibt es diese Messung. Sie rendert jeden Klang in einen
 * OfflineAudioContext, also ohne Lautsprecher und ohne Echtzeit, und zaehlt:
 *
 *   Spitze     hoechster Abtastwert. Ueber 1,0 = Verzerrung.
 *   drueber    wie viele Abtastwerte ueber Vollausschlag liegen.
 *   Effektiv   quadratischer Mittelwert. Das ist die gefuehlte Lautstaerke,
 *              und der Wert, an dem sich Klaenge untereinander vergleichen
 *              lassen - eine Spitze sagt darueber fast nichts.
 *   Dauer      bis der Klang unter -60 dB faellt.
 *   Anschlag   Zeit bis zur Spitze. Unter 20 ms = es hat einen Anschlag,
 *              darueber = es schwillt an. Das ist der messbare Unterschied
 *              zwischen „Ding" und „Piep".
 *
 * TRICK, warum das ueberhaupt geht: `getCtx()` in sounds.ts liest
 * `window.AudioContext`. Vor dem Import wird die Eigenschaft ausgetauscht, so
 * dass sie den Offline-Kontext liefert. Der Modul-Cache wird pro Klang mit
 * einer Zaehl-Abfrage umgangen, damit jeder Klang seinen eigenen Bus bekommt -
 * `warmBusInput` wird im Modul zwischengespeichert und haenge sonst am
 * Kontext des ersten Aufrufs.
 *
 * NUTZUNG (Frontend muss auf 5173 laufen):
 *   node scripts/klang-messen.mjs
 *   node scripts/klang-messen.mjs playCozyGameWheelStop playFanfare
 *   node scripts/klang-messen.mjs --bild        # Wellenformen als PNG
 */
import { createRequire } from 'node:module';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium } = req('playwright');

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';

// Vorgabe: die vier CozyGame-Klaenge plus drei Bekannte als Massstab.
const VORGABE = [
  'playCozyGameIntro',
  'playCozyGameWheelTick',
  'playCozyGameWheelStop',
  'playCozyGameStart',
  'playTick',
  'playFanfare',
  'playClimaxFinish',
];

const BILD = process.argv.includes('--bild');
const namen = process.argv.slice(2).filter(a => !a.startsWith('--'));
const klaenge = namen.length ? namen : VORGABE;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const seite = await browser.newPage();
await seite.goto(BASE, { waitUntil: 'domcontentloaded' });

const ergebnis = await seite.evaluate(async ({ klaenge, BILD }) => {
  const raus = [];
  const wellen = {};
  let lauf = 0;
  for (const name of klaenge) {
    lauf++;
    const SR = 48000, SEK = 3;
    const offline = new OfflineAudioContext(1, SR * SEK, SR);
    // getCtx() ruft `new window.AudioContext()`. Wir geben ihm den Offline-Kontext.
    const echt = window.AudioContext;
    window.AudioContext = function () { return offline; };
    let buf;
    try {
      const mod = await import(`/src/utils/sounds.ts?klangmess=${lauf}`);
      const fn = mod[name];
      if (typeof fn !== 'function') { raus.push({ name, fehler: 'nicht gefunden' }); continue; }
      // Die Ersetzung MUSS ueber den Aufruf hinaus stehen bleiben: getCtx()
      // greift erst beim Abspielen auf window.AudioContext zu, nicht beim
      // Import. Beim ersten Anlauf stand hier ein `finally` direkt nach dem
      // Import - dann baut sich der Klang einen echten Kontext, spielt ins
      // Leere, und die Messung meldet ueberall null.
      fn();
      buf = await offline.startRendering();
    } finally {
      window.AudioContext = echt;
    }
    const d = buf.getChannelData(0);
    let spitze = 0, drueber = 0, summe = 0, spitzeBei = 0;
    for (let i = 0; i < d.length; i++) {
      const v = Math.abs(d[i]);
      if (v > spitze) { spitze = v; spitzeBei = i; }
      if (v > 1) drueber++;
      summe += d[i] * d[i];
    }
    const eff = Math.sqrt(summe / d.length);
    // Dauer: letzter Abtastwert ueber -60 dB.
    let letzter = 0;
    for (let i = d.length - 1; i >= 0; i--) if (Math.abs(d[i]) > 0.001) { letzter = i; break; }
    raus.push({
      name,
      spitze: +spitze.toFixed(3),
      drueber,
      effektiv: +eff.toFixed(4),
      dauerMs: Math.round(letzter / SR * 1000),
      anschlagMs: +(spitzeBei / SR * 1000).toFixed(1),
    });
    if (BILD && spitze > 0) {
      // Auf 900 Stuetzstellen eindampfen, Spitze je Fenster.
      const N = 900, fenster = Math.ceil((letzter + SR * 0.05) / N);
      const w = [];
      for (let i = 0; i < N; i++) {
        let m = 0;
        for (let j = i * fenster; j < (i + 1) * fenster && j < d.length; j++) m = Math.max(m, Math.abs(d[j]));
        w.push(+m.toFixed(4));
      }
      wellen[name] = w;
    }
  }
  return { raus, wellen };
}, { klaenge, BILD });

console.log('Klang                      Spitze  drueber  Effektiv  Dauer   Anschlag');
for (const r of ergebnis.raus) {
  if (r.fehler) { console.log(`${r.name.padEnd(26)} ${r.fehler}`); continue; }
  // Ein leerer Puffer heisst hier NICHT „kaputt": der Slot hat eine hinterlegte
  // Datei und laeuft ueber ein <audio>-Element am Web-Audio-Bus vorbei. Eine
  // Null-Zeile sieht aber genau wie ein Fehler aus, deshalb steht es da.
  if (r.spitze === 0) {
    console.log(`${r.name.padEnd(26)}     Datei-Slot, laeuft nicht ueber den Bus`);
    continue;
  }
  const warn = r.spitze > 1 ? '  ← UEBERSTEUERT' : '';
  console.log(
    `${r.name.padEnd(26)} ${String(r.spitze).padStart(6)} ${String(r.drueber).padStart(8)}` +
    `  ${String(r.effektiv).padStart(8)}  ${String(r.dauerMs + ' ms').padStart(7)}` +
    `  ${String(r.anschlagMs + ' ms').padStart(8)}${warn}`,
  );
}

if (BILD) {
  const seite2 = await browser.newPage();
  await seite2.goto(BASE, { waitUntil: 'domcontentloaded' });
  await seite2.evaluate(({ wellen }) => {
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;background:#1A1526;font:700 13px system-ui;color:#F6EFE6';
    for (const [name, w] of Object.entries(wellen)) {
      const box = document.createElement('div');
      box.style.cssText = 'padding:10px 16px';
      const t = document.createElement('div');
      t.textContent = name;
      t.style.cssText = 'margin-bottom:4px;opacity:.85';
      const c = document.createElement('canvas');
      c.width = 900; c.height = 90;
      c.style.cssText = 'width:900px;height:90px;display:block;background:#120E1C;border-radius:6px';
      const g = c.getContext('2d');
      g.strokeStyle = 'rgba(246,239,230,0.18)';
      g.beginPath(); g.moveTo(0, 45); g.lineTo(900, 45); g.stroke();
      g.fillStyle = '#EC4899';
      w.forEach((v, i) => { const h = v * 44; g.fillRect(i, 45 - h, 1, h * 2); });
      box.append(t, c);
      document.body.append(box);
    }
  }, { wellen: ergebnis.wellen });
  const h = await seite2.evaluate(() => document.body.scrollHeight);
  await seite2.setViewportSize({ width: 940, height: h });
  await seite2.screenshot({ path: '.shots/KLAENGE.png' });
  console.log('\nWellenformen -> .shots/KLAENGE.png');
}

await browser.close();
