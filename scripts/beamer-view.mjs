/**
 * beamer-view.mjs — direkt zu einer Ansicht springen und sie knipsen.
 *
 * WARUM (Wolf 2026-08-23: „du musst diese aufnahme optimieren, die kostet zeit
 * und kontingent"): berechtigt. Die bisherigen Harnesses spielen den ABEND
 * nach und warten, bis die gewuenschte Folie vorbeikommt. Fuer die Lobby waren
 * das 40 s, fuer die Regeln zwei Minuten, fuer die Siegerehrung frueher ueber
 * zehn. Bei zwanzig Ansichten im Durchgang ist das die Hauptkostenstelle, und
 * es ist reine Wartezeit.
 *
 * Der Denkfehler war, den Autoplay als Antrieb zu benutzen. Der Autoplay lebt
 * im MODERATOR-Frontend, nicht im Server: wer die Moderatorseite gar nicht
 * oeffnet, bei dem laeuft nichts von selbst weiter. Der Server dagegen nimmt
 * jedes Ereignis einzeln entgegen. Also: Spiel einmal starten, dann gezielt
 * genau die Ereignisse schicken, die zur gewuenschten Ansicht fuehren, und
 * sofort knipsen. Kein Warten, kein Zufall, reproduzierbar.
 *
 * Ein Browser und ein Raum bedienen dabei beliebig viele Ansichten
 * hintereinander — der teuerste Teil (Browser starten, Spiel aufsetzen) faellt
 * einmal an statt pro Bild.
 *
 * NUTZUNG:
 *   node scripts/beamer-view.mjs willkommen regeln teams brett
 *   node scripts/beamer-view.mjs --liste
 *
 * Optionen:
 *   --serie=2800,4200      mehrere Zeitpunkte je Ansicht (Bewegung pruefen)
 *   --sprache=de|en|both   Vorgabe de, damit kein DE/EN-Wechsel ins Bild faellt
 *   --kategorie=MUCHO      zieht diese Kategorie nach vorn statt zu wuerfeln
 *                          nimmt auch die Unterspiele der Bunten Tuete:
 *                          top5, order, map, hotPotato. Ohne das kommt man an
 *                          deren Aufloesungen nicht gezielt heran.
 *   --dom="h1, .x"         Kaesten/Farben aus dem DOM statt aus dem Bild
 *   --zeiten               wo die Zeit hingeht
 *   --bots=8               Zahl der Bot-Teams
 *   --bild=hoch|quer       Testfoto fuer Schau mal (Hochkant/Querformat)
 *   --antworten=0.6        Quote richtiger Bot-Antworten vor einer Aufloesung
 *   --entwurf=qq-vol-1     Entwurf per Teil-Id waehlen
 *   --ruhe=15000           Ruhezeit ueberschreiben (lange Kaskaden)
 *   --rahmen               wie viel von der Buehne die Folie wirklich nutzt
 *   --frisch               Raum vor dem Aufbau ueber den Socket zuruecksetzen
 *   --fenster=1470x908     andere Fenstergroesse (Vorgabe die Buehne, 1760x990)
 *
 * MEHRERE ANSICHTEN IN EINEM AUFRUF. Browser, Raum und Spielaufbau kosten
 * zusammen rund 12 s und fallen dann EINMAL an; jede weitere Ansicht kostet nur
 * noch ihre eigene Ruhezeit. Einzeln aufgerufen zahlt man die 12 s jedes Mal.
 *
 * Voraussetzung: der Raum steht in der Lobby. Dafuer `--frisch` benutzen, NICHT
 * `rm -f backend/.qq-rooms/*.json` - der Server schreibt seine offenen
 * Speicherungen beim Herunterfahren noch einmal weg, ein `rm` davor ist damit
 * wirkungslos (Kommentarkopf von scripts/moderator-view.mjs). Ohne Reset
 * scheitert `dev/fillTeams` still mit „Nur in Lobby moeglich" und der Lauf
 * knipst den alten Zustand.
 */
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
// 2026-08-24: Buehne, Stationen und Helfer liegen jetzt in lib/buehne.mjs und
// werden mit scripts/motion.mjs geteilt. Hier bleibt nur, was mit dem BILD
// passiert: knipsen, messen, Grade zaehlen.
import { buehneStarten, stationsNamen, sleep, API, PIN } from './lib/buehne.mjs';

const sharp = createRequire(new URL('../frontend/package.json', import.meta.url))('sharp');
const OUT = '.shots';
const BOTS = Number((process.argv.find(a => a.startsWith('--bots=')) || '--bots=8').split('=')[1]);
// 2026-08-23: Aufnahmen laufen in EINER Sprache, nicht im DE/EN-Wechsel.
// Der Wechsel kommt alle 12 s, und zwischen Seiten- und Element-Aufnahme liegt
// gut eine Sekunde: faellt der Wechsel dazwischen, steht im Bild die halbe
// alte Zeile neben der neuen („Ma        Get comfy, here we go!"). Das sah aus
// wie ein Fehler auf der Buehne und war keiner.
const SPRACHE = (process.argv.find(a => a.startsWith('--sprache=')) || '--sprache=de').split('=')[1];
// --kategorie=MUCHO  sortiert die Fragen so, dass die gewuenschte Kategorie
// zuerst drankommt. 2026-08-23 (Wolf: „momentan dauert es zu lange"): ohne das
// wuerfelt jeder Lauf eine andere Kategorie, und ich habe drei Laeufe gebraucht,
// bis endlich die gewuenschte kam. Drei Laeufe sind zwei Minuten.
const KATEGORIE = (process.argv.find(a => a.startsWith('--kategorie=')) || '=').split('=')[1] || null;
// --dom="sel,sel"  liest Kasten und Farben direkt aus dem DOM, statt sie
// hinterher im Bild zu suchen. Beim Willkommen-Wolf war das um ein Vielfaches
// schneller UND genauer (das Bild kann eine Ebene veraltet zeigen, das DOM nie).
const DOM = (process.argv.find(a => a.startsWith('--dom=')) || '=').split('=').slice(1).join('=') || null;
// --rahmen  wie viel von der Buehne die Folie wirklich nutzt (siehe Funktion `rahmen`).
const RAHMEN = process.argv.includes('--rahmen');
// --grade[=26]  jeden sichtbaren Text unter dieser Grenze melden, mit dem
// GERECHNETEN Grad. Siehe die Begruendung an der Funktion `grade` weiter unten.
const GRADE = process.argv.some(a => a === '--grade' || a.startsWith('--grade='))
  ? Number((process.argv.find(a => a.startsWith('--grade=')) || '--grade=26').split('=')[1]) : null;
// --bild=hoch|quer  legt allen Schau-mal-Fragen ein Testfoto unter, damit sich
// beide Layouts (Hochkant/Querformat) gezielt anschauen lassen.
const BILD = (process.argv.find(a => a.startsWith('--bild=')) || '=').split('=')[1] || null;
// --antworten=0.6  Quote der richtigen Bot-Antworten vor einer Aufloesung.
const ANTWORTEN = Number((process.argv.find(a => a.startsWith('--antworten=')) || '--antworten=0.6').split('=')[1]);
// --entwurf=qq-vol-1  waehlt den Entwurf per Teil-Id.
const ENTWURF = (process.argv.find(a => a.startsWith('--entwurf=')) || '=').split('=')[1] || null;
// --fenster=1470x908  eine andere Fenstergroesse als die Buehne.
// 2026-08-24 (Wolf: „hier auch der rahmen unten und oben"): der Beamer ist fix
// 1760x990, aber Wolf schaut sich das im Browser an, und sein Fenster hat ein
// anderes Seitenverhaeltnis. SlideStage skaliert dann mit min(w/1760, h/990)
// und laesst oben und unten Platz. Ob dieser Platz auffaellt, kann man nur bei
// einem NICHT-16:9-Fenster sehen - bei 1760x990 ist er per Definition null.
const FENSTER = (() => {
  const s = (process.argv.find(a => a.startsWith('--fenster=')) || '=').split('=')[1];
  const m = s && s.match(/^(\d+)x(\d+)$/);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : { width: 1760, height: 990 };
})();
// --ruhe=15000  ueberschreibt die Ruhezeit. Einzelne Kaskaden laufen laenger
// als die Vorgabe der Ansicht (Top 5 braucht 5 x 2400 ms plus Siegerband).
// --stufe=3  welcher Schritt der Final-Aufloesung geknipst wird.
const STUFE = Number((process.argv.find(a => a.startsWith('--stufe=')) || '--stufe=1').split('=')[1]);
// Setzt der Aufruf eine Ansicht mit `nurReihum`, bekommt der Pool nur Spiele
// mit `parallel: false` - sonst entscheidet der Zufall am Rad, ob die
// Reihum-Ansicht ueberhaupt drankommt.
const NUR_REIHUM = process.argv.some(a => a === 'cozyseq');
const RUHE = process.argv.find(a => a.startsWith('--ruhe='))
  ? Number(process.argv.find(a => a.startsWith('--ruhe=')).split('=')[1]) : null;
const QUELLE_HOCH = '/images/Johannes.jpeg';
const QUELLE_QUER = '/images/quiz-lounge-host-bg.png';
// --zeiten  schreibt auf, wo die Zeit hingeht.
const ZEITEN = process.argv.includes('--zeiten');
const t0Lauf = Date.now();
const takt = (was) => { if (ZEITEN) console.log(`  ⏱  ${String(Date.now() - t0Lauf).padStart(6)} ms  ${was}`); };

/**
 * 2026-08-23: zweimal an derselben Falle verloren. Der Harness hat „fertig"
 * gemeldet, aber gar nichts geschrieben - einmal weil das Frontend tot war,
 * einmal weil das Browser-Profil mitten im Lauf geloescht wurde. Beide Male
 * lag noch eine ALTE Datei mit demselben Namen da, ich habe sie angesehen und
 * fast einen veralteten Stand als aktuellen gemeldet.
 *
 * Deshalb: nach jedem Schreiben pruefen, ob die Datei wirklich aus DIESEM Lauf
 * stammt. Eine Aufnahme, die es nicht gibt, muss laut sein.
 */
const LAUF_START = Date.now();
function schreibenUndPruefen(datei, daten) {
  writeFileSync(datei, daten);
  const st = statSync(datei);
  if (st.mtimeMs < LAUF_START || st.size < 1000) {
    throw new Error(`Aufnahme ${datei} ist nicht aus diesem Lauf (mtime ${new Date(st.mtimeMs).toISOString()}, ${st.size} Bytes).`);
  }
}

if (process.argv.includes('--liste')) {
  console.log('Ansichten:', stationsNamen().join(', '));
  process.exit(0);
}
const wunsch = process.argv.slice(2).filter(a => !a.startsWith('--'));
const liste = wunsch.length ? wunsch : ['willkommen'];
const bekannt = new Set(stationsNamen());
for (const n of liste) if (!bekannt.has(n)) { console.error(`Unbekannt: ${n}`); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const buehne = await buehneStarten({
  bots: BOTS, sprache: SPRACHE, kategorie: KATEGORIE, entwurf: ENTWURF,
  bild: BILD, stufe: STUFE, antworten: ANTWORTEN, nurReihum: NUR_REIHUM,
  frisch: process.argv.includes('--frisch'), fenster: FENSTER, takt,
});
const beamer = buehne.seite;
const phase = buehne.phase;

// --serie=800,2000,3400  knipst mehrere Zeitpunkte NACH dem Auftritt statt nur
// den Endzustand. Fuer Bewegung ist ein einzelnes Bild nutzlos, und ein Video
// pro Durchgang waere wieder teuer — eine Handvoll Marken reicht.
const SERIE = (process.argv.find(a => a.startsWith('--serie=')) || '').split('=')[1];
const marken = SERIE ? SERIE.split(',').map(Number) : null;
/**
 * Aufnahme, die auch laufende Videos richtig zeigt.
 *
 * EINSCHRAENKUNG, die man kennen muss: zwischen Seiten- und Element-Aufnahme
 * liegt rund eine Sekunde. Faellt in dieses Fenster der DE/EN-Wechsel (alle
 * 12 s), zeigt das zusammengesetzte Bild im Videokasten schon die neue Sprache
 * und daneben noch die alte. Das ist ein Aufnahme-Artefakt, kein Fehler auf
 * der Buehne.
 *
 * 2026-08-23, zweimal reingefallen: `page.screenshot()` liefert bei einem
 * Video, das in einer eigenen Compositing-Ebene liegt, hartnaeckig das ERSTE
 * Bild, waehrend `currentTime` weiterlaeuft. Gemessen im Wolf-Bereich: 0,2 bis
 * 0,6 % Aenderung ueber die ganze Folie, obwohl das Video bei 4,0 s stand.
 * `--disable-gpu-compositing` half beim Wolf im Textfluss, nicht mehr, sobald
 * er `position: absolute` bekam; `--disable-gpu` half gar nicht.
 * Was zuverlaessig funktioniert, ist die Aufnahme des ELEMENTS: dieselbe
 * Messung ergab dort 55 % und 23 %. Also beides knipsen und das Element an
 * seiner gemessenen Stelle ueber die Seitenaufnahme legen. Die Element-
 * Aufnahme enthaelt den Hintergrund hinter dem Video mit, der Zusammenbau ist
 * damit deckungsgleich und nicht geraten.
 */
async function knipsen(page) {
  const seite = await page.screenshot();
  const videos = await page.locator('video').all();
  if (!videos.length) return seite;
  const { width: BW, height: BH } = await sharp(seite).metadata();
  const stellen = [];
  for (const v of videos) {
    const box = await v.boundingBox();
    if (!box || box.width < 2 || box.height < 2) continue;
    const roh = await v.screenshot();
    // `elementHandle.screenshot()` ruft intern `scrollIntoViewIfNeeded`. Der
    // Willkommen-Wolf haengt absichtlich unter die Buehnenkante, also gilt er
    // als „nicht ganz sichtbar" — und Playwright scrollt dafuer das Overlay,
    // obwohl das `overflow: hidden` hat (per Skript geht das trotzdem).
    // Gemessen: `boundingBox().y` sprang durch die Aufnahme von 531 auf 462,
    // und die NAECHSTE Aufnahme zeigte dann die um 69 px verschobene Seite.
    // Die Buehne selbst bleibt dabei sauber (scrollHeight 990 = clientHeight
    // 990, scrollY 0), es ist rein die Aufnahme, die den Zustand verbiegt.
    // Also hinterher aufraeumen.
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      for (const e of document.querySelectorAll('*')) {
        if (e.scrollTop) e.scrollTop = 0;
        if (e.scrollLeft) e.scrollLeft = 0;
      }
    });
    const rm = await sharp(roh).metadata();
    // 2026-08-23, genau hier reingefallen: der Willkommen-Wolf haengt absichtlich
    // ueber die untere Buehnenkante hinaus. Die Element-Aufnahme umfasst das
    // GANZE Element, also auch den Teil unter der Kante. Legt man sie bei
    // `top = box.y` auf, schneidet sharp unten ab — und damit sieht man im Bild
    // den oberen Teil des Wolfs, wo in Wirklichkeit der untere steht. Der Wolf
    // schien 30 px ueber der Kante zu enden, obwohl er sie im Browser beruehrt.
    // Also erst auf den sichtbaren Ausschnitt beschneiden, dann auflegen.
    const l = Math.max(0, Math.round(box.x));
    const t = Math.max(0, Math.round(box.y));
    const r = Math.min(BW, Math.round(box.x + box.width));
    const b = Math.min(BH, Math.round(box.y + box.height));
    if (r - l < 2 || b - t < 2) continue;
    const sx = Math.max(0, Math.min(rm.width - 1, l - Math.round(box.x)));
    const sy = Math.max(0, Math.min(rm.height - 1, t - Math.round(box.y)));
    const sw = Math.min(r - l, rm.width - sx);
    const sh = Math.min(b - t, rm.height - sy);
    const input = await sharp(roh).extract({ left: sx, top: sy, width: sw, height: sh }).png().toBuffer();
    stellen.push({ input, left: l, top: t });
  }
  if (!stellen.length) return seite;
  return sharp(seite).composite(stellen).png().toBuffer();
}

// Einmal leer knipsen und wegwerfen. Die ERSTE Aufnahme einer Sitzung kostet
// gemessen 11,8 s (Schriften, erster Anstrich, sharp kalt), jede weitere gut
// eine. Ohne dieses Aufwaermen faellt der ganze Aufschlag auf die erste Marke
// einer Serie, und alles danach liegt hinter dem Ende der Bewegung.
// 2026-08-23: nur noch BEI EINER SERIE. Fuer eine einzelne Aufnahme ist die
// Zeit egal, da wird nur ein Endzustand geknipst — und 11,8 s waren fast ein
// Drittel jedes Laufs.
if (marken) { await knipsen(beamer); takt('aufgewaermt'); }

/** Kaesten und Farben direkt aus dem DOM lesen. Schneller und ehrlicher als
 *  im Bild suchen: das Bild kann eine Compositing-Ebene veraltet zeigen, das
 *  DOM nie. */
/**
 * --rahmen: wie viel von der Buehne nutzt die Folie wirklich?
 *
 * WARUM (Wolf 2026-08-24: „rahmen ganz oft, auch grid hat rahmen? nicht
 * sichtbar aber rahmen"): der Eindruck ist richtig, aber „zu viel Rand" ist
 * kein Befund, solange niemand sagt, wie viel. Also wird es gezaehlt.
 *
 * Gezaehlt wird, was TRAEGT: Text, Bilder, und Flaechen mit eigenem Grund oder
 * eigener Kontur. Ausdruecklich NICHT mitgezaehlt:
 *   * alles, was die volle Buehne deckt (Grund, Schleier, Funken-Ebene) - sonst
 *     nutzt jede Folie per Definition 100 % und die Messung sagt nichts;
 *   * unsichtbares (Deckkraft 0, Groesse 0, `visibility: hidden`);
 *   * die Zeitleiste ganz oben, die laeuft absichtlich von Kante zu Kante.
 *
 * Ergebnis pro Ansicht: der Kasten um alles Tragende, und die vier Abstaende
 * zur Buehnenkante. Vier verschiedene Abstaende sind ein Fund, gleich grosse
 * sind eine Entscheidung.
 *
 * WAS DIE ZAHLEN NICHT SAGEN, und das habe ich beim ersten Lauf selbst falsch
 * gelesen: ein NEGATIVER Abstand heisst nicht, dass Inhalt abgeschnitten wird.
 * Gemessen wird der KASTEN eines Elements, und der ist bei Schrift die Zeilen-
 * box, nicht die Buchstaben - bei 64 px Grad steht sie leicht ueber die Glyphen
 * hinaus. Dazu kommen endlose Bewegungen: der Team-Auftritt laesst seine
 * Titelbuchstaben dauerhaft wippen (`qqTrTitleWave`), der Kasten wandert also
 * staendig ein paar Pixel ueber die Kante, ohne dass je etwas fehlt.
 * Beim Team-Auftritt bin ich genau darauf hereingefallen und habe die Kacheln
 * verkleinert, um ein Problem zu loesen, das es nicht gab. Wieder ausgebaut.
 * Ein negativer Wert ist ein Anlass NACHZUSEHEN, kein Befund.
 */
async function rahmen(page, name) {
  const r = await page.evaluate(() => {
    const B = { w: 1760, h: 990 };
    let l = 1e9, o = 1e9, re = -1e9, u = -1e9, n = 0;
    const traegt = (el, cs, rect) => {
      if (rect.width < 2 || rect.height < 2) return false;
      if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      // Vollflaechige Ebenen zaehlen nicht - sie sagen nichts ueber die Nutzung.
      if (rect.width >= B.w * 0.985 && rect.height >= B.h * 0.985) return false;
      // Zeitleiste: laeuft absichtlich randlos.
      if (rect.width >= B.w * 0.985 && rect.height <= 16) return false;
      const eigenerText = [...el.childNodes].some(k => k.nodeType === 3 && k.textContent.trim());
      if (eigenerText) return true;
      if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'CANVAS') return true;
      const grund = cs.backgroundColor;
      const hatGrund = grund && grund !== 'transparent' && !/rgba\(0, 0, 0, 0\)/.test(grund);
      const hatBild = cs.backgroundImage && cs.backgroundImage !== 'none';
      const hatRand = parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0;
      return hatGrund || hatBild || hatRand;
    };
    // 2026-08-24: bei einem negativen Rand half die blosse Zahl nicht weiter -
    // man wusste, dass etwas ueber die Kante steht, aber nicht was. Deshalb
    // merkt sich die Messung zu jeder Kante das Element, das sie setzt.
    const wer = { l: null, o: null, re: null, u: null };
    const zeichnen = (el) => {
      const klasse = typeof el.className === 'string' && el.className ? `.${el.className.split(' ')[0]}` : '';
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 46);
      const stil = (el.getAttribute('style') || '').slice(0, 120);
      return `${el.tagName.toLowerCase()}${klasse}  „${text}"  ${stil}`;
    };
    document.querySelectorAll('[data-qq-phase] *').forEach(el => {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (!traegt(el, cs, rect)) return;
      n++;
      if (rect.left   < l)  { l  = rect.left;   wer.l  = zeichnen(el); }
      if (rect.top    < o)  { o  = rect.top;    wer.o  = zeichnen(el); }
      if (rect.right  > re) { re = rect.right;  wer.re = zeichnen(el); }
      if (rect.bottom > u)  { u  = rect.bottom; wer.u  = zeichnen(el); }
    });
    if (!n) return null;
    return {
      n, wer,
      kasten: [Math.round(l), Math.round(o), Math.round(re - l), Math.round(u - o)],
      links: Math.round(l), oben: Math.round(o),
      rechts: Math.round(B.w - re), unten: Math.round(B.h - u),
      nutzungB: Math.round(1000 * (re - l) / B.w) / 10,
      nutzungH: Math.round(1000 * (u - o) / B.h) / 10,
    };
  });
  if (!r) { console.log(`     ${name}: nichts Tragendes gefunden`); return null; }
  const gleich = new Set([r.links, r.oben, r.rechts, r.unten]).size === 1;
  console.log(`     Rand  links ${String(r.links).padStart(4)}  oben ${String(r.oben).padStart(4)}`
    + `  rechts ${String(r.rechts).padStart(4)}  unten ${String(r.unten).padStart(4)}`
    + `   nutzt ${r.nutzungB}% x ${r.nutzungH}%${gleich ? '   (alle gleich)' : ''}`);
  // Nur die Kanten nennen, die wirklich ueber den Rand stehen. Ein negativer
  // Wert ist eine Einladung zum Hinsehen, kein Befund - Zeilenkaesten und
  // laufende Bewegungen schieben Kaesten ueber die Kante, ohne dass etwas
  // abgeschnitten waere. Mit dem Element daneben ist das in Sekunden geklaert.
  for (const [kante, wert] of [['links', r.links], ['oben', r.oben], ['rechts', r.rechts], ['unten', r.unten]]) {
    if (wert >= 0) continue;
    const schluessel = { links: 'l', oben: 'o', rechts: 're', unten: 'u' }[kante];
    console.log(`       ueber die Kante ${kante} (${wert}): ${r.wer[schluessel]}`);
  }
  return r;
}

async function messen(page, selektoren) {
  const werte = await page.evaluate((sel) => sel.split(',').flatMap(s0 => {
    const s = s0.trim();
    if (!s) return [];
    // Alle Treffer, nicht nur den ersten: fuer Layout-Fragen („wo kommt der
    // leere Streifen her?") braucht man die Geschwister, nicht ein Element.
    const treffer = Array.from(document.querySelectorAll(s)).slice(0, 12);
    if (!treffer.length) return [{ sel: s, fehlt: true }];
    return treffer.map((e, i) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return {
        sel: treffer.length > 1 ? `${s} #${i}` : s,
        kasten: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
        farbe: cs.color,
        grund: cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 40) : cs.backgroundColor,
        schrift: cs.fontSize,
        text: (e.textContent || '').trim().slice(0, 40),
        stil: (e.getAttribute('style') || '').slice(0, 120),
      };
    });
  }), selektoren);
  for (const w of werte) {
    if (w.fehlt) { console.log(`     ${w.sel}: nicht da`); continue; }
    console.log(`     ${w.sel}: x${w.kasten[0]} y${w.kasten[1]} ${w.kasten[2]}x${w.kasten[3]}  Schrift ${w.schrift}  Farbe ${w.farbe}  Grund ${w.grund}${w.text ? '  Text „' + w.text + '"' : '  (leer)'}${w.stil ? '\n        stil: ' + w.stil : ''}`);
  }
}

/**
 * Jeden SICHTBAREN Text auf der Buehne mit seinem gerechneten Grad melden.
 *
 * WARUM (2026-08-24): das Pruefwerkzeug zaehlt `fontSize: clamp(11px, 1.1cqw,
 * 15px)` als „unter 20px". Das ist aber nur die UNTERGRENZE. Was wirklich
 * ankommt, haengt an der Breite des Containers: in einer 1040px breiten Karte
 * sind 1.1cqw = 11,4px, in der vollen Buehne waeren es 19,4px. Aus dem Code
 * allein ist der Grad also nicht ablesbar - er ist eine Messung, keine Zahl im
 * Quelltext. Und „Assets ausmessen, nicht schaetzen" gilt fuer Schriftgrade
 * genauso wie fuer Bilder.
 *
 * Gemeldet wird nur, was ein Gast auch sehen kann: sichtbar, nicht leer, nicht
 * transparent, nicht hinter opacity 0. Und nur BLATT-Knoten, sonst meldet jeder
 * Container den Grad seines Kindes noch einmal mit.
 */
async function grade(page, grenze) {
  const funde = await page.evaluate((G) => {
    const raus = [];
    for (const e of document.querySelectorAll('*')) {
      // Nur Elemente, deren eigener Text direkt in ihnen steht.
      const eigen = Array.from(e.childNodes)
        .filter(n => n.nodeType === 3 && n.textContent.trim())
        .map(n => n.textContent.trim()).join(' ');
      if (!eigen) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const px = parseFloat(cs.fontSize);
      if (!(px < G)) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      // Deckkraft ueber die ganze Kette: ein Element in einem ausgeblendeten
      // Vorfahren ist nicht auf der Buehne, auch wenn es selbst sichtbar ist.
      let deck = 1, p = e;
      while (p && p !== document.documentElement) { deck *= parseFloat(getComputedStyle(p).opacity || '1'); p = p.parentElement; }
      if (deck < 0.05) continue;
      raus.push({ px: Math.round(px * 10) / 10, text: eigen.slice(0, 46), farbe: cs.color, x: Math.round(r.x), y: Math.round(r.y), stil: (e.getAttribute('style') || '').slice(0, 150) });
    }
    return raus.sort((a, b) => a.px - b.px);
  }, grenze);
  if (!funde.length) { console.log(`     Grade: nichts unter ${grenze}px.`); return; }
  console.log(`     Grade unter ${grenze}px: ${funde.length} Stellen`);
  for (const f of funde) {
    console.log(`       ${String(f.px).padStart(5)}px  x${String(f.x).padStart(4)} y${String(f.y).padStart(3)}  „${f.text}"`);
    // Der inline-Stil sagt, WO im Code die Stelle steht. Ohne ihn sucht man
    // eine Zahl, die als clamp() im Quelltext gar nicht vorkommt.
    if (f.stil) console.log(`              ${f.stil}`);
  }
}


for (const name of liste) {
  const a = await buehne.zurStation(name);
  if (marken) {
    // Gegen die echte Uhr, nicht gegen die Summe der Pausen: eine Aufnahme
    // dauert selbst ueber eine Sekunde (Seite + Videoelement + Zusammenbau).
    // Mit `sleep(ms - vorheriges_ms)` verschieben sich die spaeteren Marken
    // um genau diese Zeit, und man knipst ein Video, das laengst zu Ende ist.
    // Die Datei traegt die ECHTE Zeit, nicht die gewuenschte.
    const t0 = Date.now();
    for (const ms of marken) {
      await sleep(Math.max(0, ms - (Date.now() - t0)));
      const echt = Date.now() - t0;
      const datei = `${OUT}/V-${name}-${echt}.png`;
      schreibenUndPruefen(datei, await knipsen(beamer));
      console.log(`  ✓ ${datei}   (Wunsch ${ms} ms)`);
      // Auch bei einer Serie pro Marke messen: die Pause dreht ihre Tafeln
      // durch, und jede Tafel bringt eigene Grade mit.
      if (GRADE) await grade(beamer, GRADE);
    }
  } else {
    await sleep(RUHE ?? a.ruhe);
    const datei = `${OUT}/V-${name}.png`;
    schreibenUndPruefen(datei, await knipsen(beamer));
    console.log(`  ✓ ${datei}   (Phase ${await phase()})`);
  }
  if (RAHMEN) await rahmen(beamer, name);
  if (DOM) await messen(beamer, DOM);
  if (GRADE) await grade(beamer, GRADE);
  takt(`${name}: fertig`);
}

await buehne.schliessen();
console.log(`\nfertig, ${liste.length} Ansichten → ${OUT}/`);
