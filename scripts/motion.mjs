/**
 * motion.mjs — die Bewegung einer Station ansehen, statt sie zu vermuten.
 *
 * WARUM (Wolf 2026-08-24: „optimiere die tools das zu capturen"): fuer Bewegung
 * ist ein Standbild nutzlos, und `--serie` aus beamer-view.mjs trifft die
 * Zeitpunkte nur ungefaehr - eine Aufnahme kostet selbst ueber eine Sekunde.
 * Vor allem aber fehlte die einfachste Frage: WAS laeuft hier ueberhaupt, wie
 * lange, mit welcher Kurve? Die stand bisher nur im Quelltext verstreut, und
 * ein Blick in den Quelltext sagt nicht, was auf der Folie tatsaechlich
 * gestartet wird.
 *
 * Zwei Betriebsarten:
 *
 *   --inventar   Was laeuft, aus dem Browser gelesen (`document.getAnimations()`).
 *                Name, Dauer, Verzoegerung, Kurve, Ziel, Wiederholung. Das ist
 *                die Wahrheit zur Laufzeit, nicht die Vermutung aus dem CSS.
 *
 *   --film       Ein Streifen aus N Bildern ueber ein Zeitfenster, zusammengesetzt
 *                zu EINEM Kontaktbogen mit Zeitstempeln. Damit sieht man den
 *                Verlauf auf einen Blick, statt sechs Dateien nebeneinander zu
 *                oeffnen.
 *
 * NUTZUNG:
 *   node scripts/motion.mjs willkommen --inventar
 *   node scripts/motion.mjs frage --film --fenster-ms=2400 --bilder=12
 *   node scripts/motion.mjs --liste
 *
 * Optionen:
 *   --inventar             Laufende Animationen auflisten (Vorgabe, wenn nichts sonst)
 *   --film                 Kontaktbogen ueber ein Zeitfenster
 *   --fenster-ms=2400      Laenge des Fensters (Vorgabe: die `ruhe` der Station)
 *   --bilder=12            Anzahl Bilder im Streifen (Vorgabe 12)
 *   --spalten=4            Spalten im Kontaktbogen (Vorgabe 4)
 *   --frisch               Raum vorher zuruecksetzen (Raum UND Bots)
 *   --kategorie=MUCHO      wie in beamer-view.mjs
 *   --entwurf=qq-vol-1     wie in beamer-view.mjs
 *   --bots=8               Zahl der Bot-Teams
 *
 * WICHTIG zum Inventar: es wird NACH der Ruhezeit gelesen, also wenn die
 * Auftritts-Bewegung schon durch ist. Endliche Animationen sind dann fertig und
 * tauchen nur noch auf, wenn sie `both`/`forwards` fuellen. Wer den Auftritt
 * selbst sehen will, nimmt `--fenster-ms` klein und liest zusaetzlich den Film.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, stationsNamen, sleep } from './lib/buehne.mjs';

const sharp = createRequire(new URL('../frontend/package.json', import.meta.url))('sharp');
const OUT = '.shots';

const flagZahl = (name, vorgabe) => {
  const a = process.argv.find(x => x.startsWith(`--${name}=`));
  return a ? Number(a.split('=')[1]) : vorgabe;
};
const flagText = (name, vorgabe = null) => {
  const a = process.argv.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : vorgabe;
};

const FILM      = process.argv.includes('--film');
const INVENTAR  = process.argv.includes('--inventar') || !FILM;
const FENSTER_MS = flagZahl('fenster-ms', null);
const BILDER    = flagZahl('bilder', 12);
const SPALTEN   = flagZahl('spalten', 4);

if (process.argv.includes('--liste')) {
  console.log('Stationen:', stationsNamen().join(', '));
  process.exit(0);
}

const wunsch = process.argv.slice(2).filter(a => !a.startsWith('--'));
const liste = wunsch.length ? wunsch : ['willkommen'];
const bekannt = new Set(stationsNamen());
for (const n of liste) if (!bekannt.has(n)) { console.error(`Unbekannt: ${n}`); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const buehne = await buehneStarten({
  bots: flagZahl('bots', 8),
  kategorie: flagText('kategorie'),
  entwurf: flagText('entwurf'),
  frisch: process.argv.includes('--frisch'),
});
const seite = buehne.seite;

/**
 * Was laeuft gerade? Gelesen ueber die Web-Animations-Schnittstelle, also
 * inklusive CSS-Animationen und Uebergaengen.
 *
 * Der Ziel-Text ist bewusst kein CSS-Pfad, sondern eine kurze Beschreibung
 * (Tag, Klassen, erste Textzeile). Ein generierter Pfad wie
 * `div > div:nth-child(7) > span` sagt beim Lesen nichts; „span · SCHÄTZCHEN"
 * findet man im Quelltext in Sekunden.
 */
async function inventar(page) {
  const zeilen = await page.evaluate(() => {
    // Ein nacktes „div" sagt beim Lesen nichts. Also aufwaerts laufen, bis
    // etwas Benennbares kommt - eine Klasse, ein data-qq-Haken oder Text.
    const kurz = (el) => {
      if (!el || !el.tagName) return '(kein Element)';
      let e = el, tiefe = 0;
      while (e && tiefe < 4) {
        const klasse = (typeof e.className === 'string' && e.className.trim())
          ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
        const daten = [...e.attributes].filter(a => a.name.startsWith('data-qq'))
          .map(a => `${a.name}="${a.value}"`).join(' ');
        const text = (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
        if (klasse || daten || text) {
          return [e.tagName.toLowerCase() + klasse, daten, text].filter(Boolean).join(' · ')
            + (tiefe ? ` (${tiefe} drueber)` : '');
        }
        e = e.parentElement; tiefe++;
      }
      return el.tagName.toLowerCase();
    };
    // Die Kurve steht NICHT in `getTiming().easing`. Der erste Anlauf hat sie
    // von dort gelesen und meldete fuer jede einzelne Animation der App
    // „linear" - was bedeutet haette, dass das ganze Haus ohne Beschleunigung
    // laeuft. Tatsaechlich ist `easing` auf der Effekt-Ebene die Vorgabe
    // (linear), waehrend die echte Kurve als `animation-timing-function` am
    // Element haengt. Also dort lesen, an der Stelle, die zum Namen passt:
    // `animation-name` und `animation-timing-function` sind gleich lange Listen.
    const kurveVom = (el, name) => {
      if (!el || !name) return '';
      const cs = getComputedStyle(el);
      const namen = (cs.animationName || '').split(',').map(s => s.trim());
      const kurven = (cs.animationTimingFunction || '').split(/,(?![^(]*\))/).map(s => s.trim());
      const i = namen.indexOf(name);
      return (i >= 0 ? kurven[i] : kurven[0]) ?? '';
    };
    return document.getAnimations().map(a => {
      const e = a.effect;
      const t = e?.getTiming?.() ?? {};
      const rechnung = e?.getComputedTiming?.() ?? {};
      const name = a.animationName ?? a.transitionProperty ?? a.constructor.name;
      return {
        name,
        art: a.constructor.name,
        dauer: Math.round(Number(rechnung.duration) || 0),
        verzug: Math.round(Number(t.delay) || 0),
        kurve: a.animationName
          ? kurveVom(e?.target, a.animationName)
          : (getComputedStyle(e?.target ?? document.body).transitionTimingFunction || t.easing || ''),
        fuellen: t.fill ?? '',
        wdh: rechnung.iterations === Infinity ? 'endlos' : (rechnung.iterations ?? 1),
        stand: a.playState,
        ziel: kurz(e?.target),
      };
    });
  });
  if (!zeilen.length) { console.log('  (keine laufende Animation)'); return zeilen; }

  // Nach NAMEN buendeln, nicht nach Name plus Dauer. Der erste Anlauf hat nach
  // beidem gebuendelt, und dann fuellten 22 Zeilen `ffmove` (die Gluehwuermchen,
  // jede mit eigener Dauer) den ganzen Bericht, waehrend die zwei interessanten
  // Zeilen darunter untergingen. Eine Animation ist EINE Aussage; dass ihre
  // Dauer streut, ist eine Eigenschaft dieser Aussage und gehoert als Spanne
  // dahinter, nicht als zwanzig Zeilen.
  const gruppen = new Map();
  for (const z of zeilen) {
    const s = `${z.name}|${z.kurve}`;
    if (!gruppen.has(s)) {
      gruppen.set(s, {
        ...z, anzahl: 0, ziele: new Set(),
        dauerMin: Infinity, dauerMax: -Infinity, verzugMin: Infinity, verzugMax: -Infinity,
      });
    }
    const g = gruppen.get(s);
    g.anzahl++;
    g.dauerMin = Math.min(g.dauerMin, z.dauer);
    g.dauerMax = Math.max(g.dauerMax, z.dauer);
    g.verzugMin = Math.min(g.verzugMin, z.verzug);
    g.verzugMax = Math.max(g.verzugMax, z.verzug);
    g.ziele.add(z.ziel);
  }
  const spanne = (a, b, einheit = ' ms') => a === b ? `${a}${einheit}` : `${a}-${b}${einheit}`;
  // Endlose zuletzt: die laufen als Ambiente immer, die endlichen sind die
  // eigentliche Choreographie der Station.
  const sortiert = [...gruppen.values()].sort((a, b) =>
    (a.wdh === 'endlos') - (b.wdh === 'endlos') || b.dauerMax - a.dauerMax);
  console.log(`  ${zeilen.length} Animationen, ${sortiert.length} verschiedene:`);
  for (const g of sortiert) {
    const verzug = g.verzugMin === g.verzugMax
      ? `${g.verzugMin} ms` : `${spanne(g.verzugMin, g.verzugMax)} gestaffelt`;
    console.log(`    ${g.name}  ${spanne(g.dauerMin, g.dauerMax)}  Verzug ${verzug}  ${g.kurve}  ${g.wdh === 'endlos' ? 'ENDLOS' : `x${g.wdh}`}  (${g.anzahl}x)`);
    console.log(`        ${[...g.ziele].slice(0, 2).join('  |  ')}`);
  }
  return zeilen;
}

/**
 * Kontaktbogen: N Bilder ueber ein Fenster, zu einem Blatt gekachelt, jedes mit
 * seiner ECHTEN Zeit beschriftet.
 *
 * Warum die echte Zeit und nicht die gewuenschte: eine Aufnahme kostet Zeit.
 * Die Bilder liegen also nie exakt auf dem Raster, und ein Streifen mit
 * gelogenen Zeitstempeln waere schlimmer als gar keiner - man wuerde eine
 * Verzoegerung ablesen, die es nicht gibt.
 */
async function film(page, name, fensterMs, ausloesen) {
  // 2026-08-24, erster Anlauf verworfen und hier notiert, weil der Fehler
  // verfuehrerisch ist: zuerst habe ich in einer Schleife `page.screenshot()`
  // aufgerufen und die Bilder gegen die echte Uhr nachgezogen. Gemessen kostet
  // EIN Bild so rund 570 ms. Bei zwoelf Bildern ueber ein Fenster von 4200 ms
  // waeren das 350 ms Schrittweite - das Werkzeug kann sie gar nicht einhalten
  // und lieferte 6798 ms. Die Auftrittsbewegung ist dann laengst vorbei, und
  // der Streifen zeigt zwoelfmal denselben Endzustand.
  //
  // Screencast loest genau das: Chromium schiebt die Bilder von sich aus
  // heraus, mit eigenem Zeitstempel, ohne Roundtrip pro Bild. Danach werden
  // aus dem Strom die N Bilder gewaehlt, die dem Wunschraster am naechsten
  // liegen. Nebenwirkung, die hier sogar hilft: Chromium sendet nur bei
  // Aenderung - steht das Bild still, gibt es keine Bilder, und der Streifen
  // zeigt keine Standzeit, die es nicht gibt.
  const cdp = await page.context().newCDPSession(page);
  const roh = [];
  let tNull = Date.now();
  cdp.on('Page.screencastFrame', async (f) => {
    roh.push({ zeit: Date.now(), daten: Buffer.from(f.data, 'base64') });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* zu */ }
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 });
  // Der Ausloeser laeuft INNERHALB der Aufnahme, sonst faengt der Streifen die
  // Bewegung erst in der Mitte auf. Null ist der Moment, in dem das letzte
  // Ereignis raus ist - davor liegende Bilder bekommen eine negative Zeit,
  // und das ist ehrlicher, als sie wegzulassen.
  if (ausloesen) await ausloesen();
  tNull = Date.now();
  await sleep(fensterMs);
  await cdp.send('Page.stopScreencast').catch(() => {});
  await cdp.detach().catch(() => {});
  if (!roh.length) { console.log('  (keine Bilder - bewegt sich hier nichts?)'); return null; }
  for (const r of roh) r.echt = r.zeit - tNull;
  console.log(`  ${roh.length} Rohbilder (${(roh.length / (fensterMs / 1000)).toFixed(1)}/s), von ${roh[0].echt} bis ${roh[roh.length - 1].echt} ms`);

  // Aus dem Strom das Wunschraster picken: fuer jede Sollmarke das zeitlich
  // naechste Bild. Doppelte fallen raus, damit ein Stillstand nicht als
  // mehrere gleiche Kacheln erscheint.
  const bilder = [];
  const schritt = fensterMs / Math.max(1, BILDER - 1);
  const schon = new Set();
  for (let i = 0; i < BILDER; i++) {
    const soll = Math.round(i * schritt);
    let best = 0;
    for (let k = 1; k < roh.length; k++) {
      if (Math.abs(roh[k].echt - soll) < Math.abs(roh[best].echt - soll)) best = k;
    }
    if (schon.has(best)) continue;
    schon.add(best);
    bilder.push({ echt: roh[best].echt, roh: roh[best].daten });
  }
  const erstes = await sharp(bilder[0].roh).metadata();
  const kachelB = 440;
  const kachelH = Math.round(kachelB * erstes.height / erstes.width);
  const beschriftung = 26;
  const zeilen = Math.ceil(bilder.length / SPALTEN);
  const blattB = SPALTEN * kachelB;
  const blattH = zeilen * (kachelH + beschriftung);

  const teile = [];
  for (let i = 0; i < bilder.length; i++) {
    const sp = i % SPALTEN, ze = Math.floor(i / SPALTEN);
    const x = sp * kachelB, y = ze * (kachelH + beschriftung);
    teile.push({
      input: await sharp(bilder[i].roh).resize(kachelB, kachelH).png().toBuffer(),
      left: x, top: y + beschriftung,
    });
    const txt = `${bilder[i].echt} ms`;
    teile.push({
      input: Buffer.from(
        `<svg width="${kachelB}" height="${beschriftung}">` +
        `<rect width="100%" height="100%" fill="#141018"/>` +
        `<text x="8" y="18" font-family="monospace" font-size="15" fill="#EC4899">${txt}</text>` +
        `</svg>`),
      left: x, top: y,
    });
  }
  const blatt = await sharp({
    create: { width: blattB, height: blattH, channels: 3, background: '#141018' },
  }).composite(teile).png().toBuffer();

  const datei = `${OUT}/M-${name}.png`;
  writeFileSync(datei, blatt);
  console.log(`  ✓ ${datei}   (${bilder.length} Bilder ueber ${bilder[bilder.length - 1].echt} ms)`);
  return datei;
}

for (const name of liste) {
  console.log(`\n── ${name} ────────────────────────────────`);
  // Aufbau und Ausloeser bewusst getrennt: der Aufbau (Spiel starten, Runden
  // vorspulen) darf nicht mit im Streifen landen, der Ausloeser muss es.
  const st = buehne.stationen[name];
  await buehne.aufbauen(st.aufbau);
  const fenster = FENSTER_MS ?? st.ruhe;
  if (FILM) {
    await film(seite, name, fenster, () => st.weg(buehne.helfer));
  } else {
    await st.weg(buehne.helfer);
  }
  if (INVENTAR) {
    if (!FILM) await sleep(st.ruhe);
    await inventar(seite);
  }
}

await buehne.schliessen();
console.log('\nfertig.');
