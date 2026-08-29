/* handy-ruhe — steht das Layout still, und ist nichts abgeschnitten?
 *
 * 2026-08-29, Wolf am Kontaktbogen: „das layout ist sehr unruhig, die
 * fenstergroesse aendert sich permanent, der footer und der header rutschen
 * hoch und runter … ich haette gerne eine einheitliche grosse ui/ux. dabei
 * darf nichts abgeschnitten, gequetscht oder unsichtbar werden."
 *
 * Das sind zwei Fragen, und beide sind messbar. Sie stehen hier nebeneinander,
 * weil sie GEGENEINANDER laufen: eine Huelle, die stillsteht, erreicht man am
 * einfachsten, indem man Inhalt beschneidet. Ein Werkzeug, das nur die Ruhe
 * misst, belohnt genau das.
 *
 * ── 1. Ruhe ───────────────────────────────────────────────────────────────
 * Wo sitzen Kopfzeile und Fusszeile in jeder Ansicht? Wandert eine von beiden
 * zwischen zwei Ansichten, springt sie beim Wechsel - und das ist der
 * Eindruck, den Wolf beschreibt. Gemeldet wird die SPANNE ueber alle
 * Ansichten: 0 heisst, es steht still.
 *
 * ⚠️ Nicht gemessen wird die Spanne der Seitenhoehe. Eine Fragefolie ist
 * laenger als eine Lobby, das ist richtig so. Unruhig wird es erst, wenn die
 * FESTEN Teile mitwandern.
 *
 * ── 2. Nichts abgeschnitten, gequetscht, unsichtbar ───────────────────────
 * * abgeschnitten: ein Behaelter mit `overflow: hidden`, dessen Inhalt breiter
 *   oder hoeher ist als er selbst.
 * * gequetscht:    ein Textknoten, dessen Zeilen nicht in seine Hoehe passen
 *   (`scrollHeight` groesser als `clientHeight`), ohne dass er scrollbar ist.
 * * unsichtbar:    ein Element mit Text, das keine Flaeche hat oder ganz
 *   ausserhalb des Bildes liegt.
 *
 * ⚠️ Nach UNTEN scrollen ist kein Fund. Das Handy darf und soll scrollen; nur
 * seitlich nie. „Der Beamer bekommt nie eine Scrollbar" ist eine
 * Buehnenregel.
 *
 * VORAUSSETZUNG: Backend (4000, frisch) + Frontend (5173).
 * NUTZUNG: node scripts/handy-ruhe.mjs [--mega] [--look=kolosseum] [--secs=210]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { handyStarten, HANDY } from './lib/handy.mjs';

const mega = process.argv.includes('--mega');
/* siehe handy-kontaktbogen.mjs: 'standard' oder 'kolosseum'. */
const look = (process.argv.find(a => a.startsWith('--look=')) ?? '--look=standard').split('=')[1];
/* --groesser=15:16,10:12 - Schriftgroessen VOR dem Messen umstellen.
 *
 * 2026-08-29, Wolf: „ist platz fuer 12 px im fuss? und wenn text von 15 auf 16
 * steigt, verschiebt sich dann was?" Beides sind Fragen an das Layout, nicht an
 * den Geschmack, und beide lassen sich nur beantworten, indem man es tut.
 *
 * Es hier zu tun statt im Code hat einen Grund: die Groessen stehen inline
 * (`style={{ fontSize: 15 }}`), ein Stylesheet kaeme nicht dagegen an, und ein
 * Codeumbau nur zum Ausprobieren waere ein Umbau, den man wieder zuruecknehmen
 * muss. Hier laeuft er als Versuch, mit derselben Messung wie sonst - fuehrt er
 * zu nichts, ist nichts angefasst worden. */
const GROESSER = (process.argv.find(a => a.startsWith('--groesser=')) ?? '').split('=')[1] ?? '';
const UMSTELLUNG = GROESSER ? GROESSER.split(',').map(p => p.split(':').map(Number)) : [];
if (UMSTELLUNG.length) console.log(`Versuch: ${UMSTELLUNG.map(([a, b]) => `${a}px -> ${b}px`).join(', ')}`);
const SECS = Number((process.argv.find(a => a.startsWith('--secs=')) ?? '--secs=210').split('=')[1]);

/** Laeuft IM Browser. */
const MESSEN = ({ breite, hoehe }) => {
  const de = document.documentElement;
  const rund = (n) => Math.round(n);

  const kopf = document.querySelector('.qq-team-column header')
    ?? document.querySelector('header');
  const fuss = document.querySelector('.qq-team-fuss');
  const spalte = document.querySelector('.qq-team-column');

  /* Der erste Inhalt UNTER der Kopfzeile: die Karte, mit der die Ansicht
   * beginnt. Sie ist das, was der Blick zuerst trifft, und ihre Lage ist
   * deshalb genauso ein Ruhe-Merkmal wie die der Kopfzeile. */
  const karten = Array.from(document.querySelectorAll('.qq-team-column > *'))
    .filter(e => {
      const r = e.getBoundingClientRect();
      return r.height > 40 && r.width > 100 && e !== kopf && !e.classList.contains('qq-team-fuss');
    });
  const ersteKarte = karten[0]?.getBoundingClientRect() ?? null;

  const text = (el) => Array.from(el.childNodes)
    .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();

  const abgeschnitten = [], gequetscht = [], unsichtbar = [];
  for (const el of document.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement)) continue;
    const t = el.tagName.toLowerCase();
    if (t === 'style' || t === 'script' || t === 'svg' || t === 'path') continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    const eigen = text(el);

    // Unsichtbar: traegt Text, hat aber keine Flaeche oder liegt draussen.
    if (eigen && eigen.length > 1) {
      const leer = r.width < 2 || r.height < 2;
      const draussen = r.right < -2 || r.left > breite + 2 || r.bottom < -2;
      if (leer || draussen) {
        unsichtbar.push({ t, txt: eigen.slice(0, 28), wo: `${rund(r.left)},${rund(r.top)} ${rund(r.width)}x${rund(r.height)}` });
        continue;
      }
    }
    if (cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;
    if (r.width < 4 || r.height < 4) continue;

    const versteckt = /hidden|clip/.test(cs.overflow + cs.overflowX + cs.overflowY);
    const scrollbar = /auto|scroll/.test(cs.overflowX + cs.overflowY);

    // Abgeschnitten: `overflow: hidden` und der Inhalt passt nicht.
    if (versteckt && !scrollbar) {
      const dx = el.scrollWidth - el.clientWidth;
      const dy = el.scrollHeight - el.clientHeight;
      if (dx > 2 || dy > 2) {
        abgeschnitten.push({ t, txt: (eigen || el.className || '').toString().slice(0, 28), dx, dy });
      }
    }

    // Gequetscht: eigener Text, der nicht in die Hoehe passt, ohne Scrollweg.
    if (eigen && !scrollbar && el.scrollHeight - el.clientHeight > 2 && el.children.length === 0) {
      gequetscht.push({ t, txt: eigen.slice(0, 28), fehlt: el.scrollHeight - el.clientHeight });
    }
  }

  /* Der Bereich ZWISCHEN Kopf und Fuss, und was darin liegt.
   *
   * 2026-08-29, Wolf: „die hoehe des mittleren bereichs veraendert sich
   * immernoch stark". Kopf und Fuss stehen seit dem letzten Durchgang still -
   * der Kasten dazwischen nicht. Ohne diese Zahlen ist „stark" ein Gefuehl;
   * mit ihnen ist es eine Spanne, ueber die man entscheiden kann. */
  const mitte = karten.reduce((sum, e) => sum + e.getBoundingClientRect().height, 0);
  const kartenListe = karten.map(e => ({
    h: rund(e.getBoundingClientRect().height),
    top: rund(e.getBoundingClientRect().top),
  }));

  return {
    mitte: rund(mitte),
    kartenListe,
    kopf: kopf ? { top: rund(kopf.getBoundingClientRect().top), h: rund(kopf.getBoundingClientRect().height) } : null,
    fuss: fuss ? { top: rund(fuss.getBoundingClientRect().top), h: rund(fuss.getBoundingClientRect().height) } : null,
    ersteKarte: ersteKarte ? rund(ersteKarte.top) : null,
    spalteH: spalte ? rund(spalte.getBoundingClientRect().height) : null,
    seiteH: de.scrollHeight,
    quer: Math.max(0, de.scrollWidth - de.clientWidth),
    abgeschnitten, gequetscht, unsichtbar,
  };
};

const b = await handyStarten({ mega, secs: SECS, look });
const sichten = [];
const messen = async (seite, name) => {
  if (UMSTELLUNG.length) {
    await seite.evaluate((paare) => {
      for (const el of document.querySelectorAll('*')) {
        const px = Math.round(parseFloat(getComputedStyle(el).fontSize));
        const treffer = paare.find(([von]) => von === px);
        if (treffer) el.style.setProperty('font-size', `${treffer[1]}px`, 'important');
      }
    }, UMSTELLUNG).catch(() => {});
    await seite.waitForTimeout(120);   // Umbruch abwarten, sonst misst man den alten
  }
  const m = await seite.evaluate(MESSEN, { breite: HANDY.width, hoehe: HANDY.height }).catch(() => null);
  if (!m) return;
  sichten.push({ name, ...m });
  console.log(`  ✓ ${name.padEnd(16)} Kopf ${String(m.kopf?.top ?? '-').padStart(4)}  `
    + `Karte ${String(m.ersteKarte ?? '-').padStart(4)}  Fuss ${String(m.fuss?.top ?? '-').padStart(4)}  `
    + `Mitte ${String(m.mitte).padStart(4)}  (${m.kartenListe.map(k => k.h).join('+')})`);
};
await b.abendMitfahren(async (phase) => { await messen(b.handy, phase); });
await b.schliessen();

/* ── Bericht ──────────────────────────────────────────────────────────────── */
mkdirSync('.shots/ruhe', { recursive: true });
const spanne = (werte) => {
  const z = werte.filter(v => typeof v === 'number');
  return z.length ? { min: Math.min(...z), max: Math.max(...z), spanne: Math.max(...z) - Math.min(...z) } : null;
};
const kopfS = spanne(sichten.map(v => v.kopf?.top));
const karteS = spanne(sichten.map(v => v.ersteKarte));
const fussS = spanne(sichten.map(v => v.fuss?.top));
const mitteS = spanne(sichten.map(v => v.mitte));

const z = [`# Steht /team still?`, '',
  `Gemessen am ${new Date().toISOString().slice(0, 10)} auf ${HANDY.width}x${HANDY.height}`,
  `ueber ${sichten.length} Ansichten: ${sichten.map(v => v.name).join(', ')}.`, '',
  'Erzeugt von `node scripts/handy-ruhe.mjs`. Der Kopf des Werkzeugs erklaert,',
  'warum Ruhe und Vollstaendigkeit zusammen gemessen werden und nicht einzeln.', '',
  '## Wandern die festen Teile?', '',
  '| | von | bis | Spanne |', '|---|---:|---:|---:|'];
for (const [name, sp] of [['Kopfzeile', kopfS], ['erste Karte', karteS], ['Fusszeile', fussS],
                          ['Inhalt (Summe der Karten)', mitteS]]) {
  z.push(sp ? `| ${name} | ${sp.min} | ${sp.max} | **${sp.spanne} px** |` : `| ${name} | — | — | — |`);
}
z.push('', kopfS && kopfS.spanne === 0 && (karteS?.spanne ?? 0) === 0
  ? '✓ Kopfzeile und erste Karte stehen in jeder Ansicht an derselben Stelle.'
  : '⚠️ Die festen Teile wandern. Genau das liest sich beim Wechsel als Unruhe.', '');

z.push('## Die Fusszeile', '',
  'Sie sitzt am unteren Rand, solange Platz ist, und wandert mit, wenn die',
  'Ansicht laenger wird als das Bild. Ihre Spanne ist deshalb KEIN Fehler -',
  'gemessen wird sie trotzdem, damit ein Sprung bei kurzen Ansichten auffaellt.', '');
for (const v of sichten) {
  const kurz = v.seiteH <= HANDY.height + 4;
  if (kurz && v.fuss) z.push(`* ${v.name}: Seite ${v.seiteH} px (passt ins Bild), Fuss bei ${v.fuss.top}`);
}
z.push('');

let fehler = 0;
for (const [feld, titel, regel, zeile] of [
  ['quer', 'Seitlicher Querlauf', 'Nach unten scrollen ist richtig, zur Seite nie.',
    (v) => (v.quer > 0 ? [`* ${v.name}: ${v.quer} px zu breit`] : [])],
  ['abgeschnitten', 'Abgeschnitten', 'Behaelter mit `overflow: hidden`, deren Inhalt nicht hineinpasst.',
    (v) => v.abgeschnitten.map(a => `* ${v.name}: \`<${a.t}>\` „${a.txt}" — ${a.dx > 2 ? `${a.dx} px zu breit` : ''}${a.dx > 2 && a.dy > 2 ? ', ' : ''}${a.dy > 2 ? `${a.dy} px zu hoch` : ''}`)],
  ['gequetscht', 'Gequetscht', 'Text, dessen Zeilen nicht in die Hoehe des Elements passen.',
    (v) => v.gequetscht.map(a => `* ${v.name}: „${a.txt}" — ${a.fehlt} px fehlen`)],
  ['unsichtbar', 'Unsichtbar', 'Elemente mit Text, die keine Flaeche haben oder ausserhalb des Bildes liegen.',
    (v) => v.unsichtbar.map(a => `* ${v.name}: \`<${a.t}>\` „${a.txt}" bei ${a.wo}`)],
]) {
  void feld;
  const teile = sichten.flatMap(zeile);
  z.push(`## ${titel}`, '', regel, '');
  if (!teile.length) z.push('✓ Nichts gefunden.', '');
  else { z.push(...teile, ''); fehler += teile.length; }
}

const text = z.join('\n');
/* Der Look gehoert in den Dateinamen: sonst ueberschreibt ein Kolosseum-Lauf
 * die Messung des Standarddesigns, und der Bericht sagt nicht, welcher er ist. */
writeFileSync(`.shots/ruhe/BERICHT${mega ? '-CROWD' : ''}${look === 'kolosseum' ? '-KOLOSSEUM' : ''}${GROESSER ? '-VERSUCH' : ''}.md`, text);
console.log('\n' + text);
console.log(`${fehler} Befunde.`);
