/* danke-designcheck — die Danke-Folie gegen ein fremdes Feedback pruefen.
 *
 * 2026-08-26. Wolf hat vier Punkte Feedback zur Danke-Seite bekommen (mehr
 * Animation, mehr Abschlussgefuehl, Team-Zeichen staerker nutzen, QR
 * hervorheben) und fragt, was davon ich unterschreiben wuerde.
 *
 * Fremdes Feedback ist immer eine Beobachtung plus eine Vermutung ueber die
 * Ursache. Die Beobachtung stimmt meistens, die Vermutung selten. „Mehr
 * Animation" kann heissen, dass zu wenig laeuft - oder dass viel laeuft und
 * nichts davon etwas sagt. Nur die Zahlen trennen das:
 *
 *   1. Was BEWEGT sich ueberhaupt? document.getAnimations(), nach Name
 *      gezaehlt. Eine Folie mit 20 laufenden Animationen braucht keine
 *      einundzwanzigste.
 *   2. Die Groessenstufen: jede Textzeile mit ihrer Schriftgroesse, sortiert.
 *      Eine Zeile, die „untergeht", geht meistens deshalb unter, weil sie in
 *      der Stufenleiter zu weit unten steht - nicht weil sie fehlt.
 *   3. Der Kontrast jeder Zeile gegen ihren Grund. Grau auf Dunkel faellt auf
 *      2,8 Metern zuerst weg.
 *   4. Die Flaechen: wer nimmt wie viel Bild ein. Das beantwortet „staerker
 *      nutzen" mit einer Zahl statt mit einem Gefuehl.
 *
 * NUTZUNG:  node scripts/danke-designcheck.mjs
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
await b.zurStation('cozydanach'); await sleep(700);
await h.springe('final-reveal'); await sleep(900);

const DANKE = /Danke fürs Spielen|Thanks for Playing/i;
for (let i = 0; i < 34; i++) {
  if (DANKE.test(await seite.evaluate(() => document.body.innerText || ''))) break;
  await h.emit('qq:nextQuestion');
  await sleep(650);
}
// Lange genug warten, dass alle Einblendungen durch sind und nur noch das
// laeuft, was dauerhaft laeuft.
await sleep(3500);

const befund = await seite.evaluate(() => {
  const buehne = document.querySelector('[data-qq-buehne]') ?? document.body;
  const bR = buehne.getBoundingClientRect();
  const flaeche = bR.width * bR.height;

  // ── 1. Was bewegt sich ────────────────────────────────────────────────
  const laufend = {};
  for (const a of document.getAnimations()) {
    if (a.playState !== 'running') continue;
    const n = a.animationName || a.constructor.name;
    laufend[n] = (laufend[n] ?? 0) + 1;
  }

  // ── Helligkeit einer CSS-Farbe, fuer den Kontrast ─────────────────────
  const zuRgb = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c);
    if (!m) return null;
    const p = m[1].split(',').map(v => parseFloat(v));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const leuchte = (c) => {
    const v = zuRgb(c);
    if (!v) return null;
    const f = (k) => { const s = k / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(v.r) + 0.7152 * f(v.g) + 0.0722 * f(v.b);
  };
  // Der Grund der Buehne ist praktisch schwarz; fuer den Kontrast reicht der
  // dokumentierte Wert #0F0817 als Bezug (main.css, html-Grund).
  const grundL = leuchte('rgb(15,8,23)');
  const verhaeltnis = (c) => {
    const l = leuchte(c);
    if (l == null) return null;
    const [hell, dunkel] = l > grundL ? [l, grundL] : [grundL, l];
    return (hell + 0.05) / (dunkel + 0.05);
  };

  // ── 2./3. Textzeilen mit Groesse und Kontrast ─────────────────────────
  const zeilen = [];
  const gesehen = new Set();
  for (const el of buehne.querySelectorAll('*')) {
    // Nur Elemente, die selbst Text tragen (kein Container mit Kindern).
    const eigen = [...el.childNodes]
      .filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim()).join(' ').trim();
    if (!eigen || eigen.length < 2) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const s = getComputedStyle(el);
    const px = Math.round(parseFloat(s.fontSize));
    const schluessel = `${eigen}|${px}`;
    if (gesehen.has(schluessel)) continue;
    gesehen.add(schluessel);
    zeilen.push({
      text: eigen.slice(0, 34),
      px,
      gewicht: s.fontWeight,
      farbe: s.color,
      kontrast: verhaeltnis(s.color),
      kursiv: s.fontStyle === 'italic',
    });
  }
  zeilen.sort((a, z) => z.px - a.px);

  // ── 4. Die grossen Flaechen ───────────────────────────────────────────
  const bloecke = [];
  for (const el of buehne.querySelectorAll('div, span, img, svg')) {
    const r = el.getBoundingClientRect();
    const anteil = (r.width * r.height) / flaeche;
    if (anteil < 0.012 || anteil > 0.75) continue;
    const kennung = el.getAttribute('data-qq-sieger') !== null ? 'SIEGER'
      : el.className && typeof el.className === 'string' && el.className.includes('qq-team-mark') ? 'Teammarke'
      : el.tagName.toLowerCase();
    bloecke.push({
      was: kennung,
      anteil: +(anteil * 100).toFixed(1),
      b: Math.round(r.width), h: Math.round(r.height),
      x: Math.round(r.left), y: Math.round(r.top),
    });
  }
  bloecke.sort((a, z) => z.anteil - a.anteil);

  return {
    buehne: { b: Math.round(bR.width), h: Math.round(bR.height) },
    laufend,
    zeilen,
    bloecke: bloecke.slice(0, 12),
    ueberBreit: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ueberHoch: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  };
});

console.log('\n══ Danke-Folie, Design-Check ═══════════════════════════════════');
console.log('Buehne:', befund.buehne, '· Ueberlauf:', befund.ueberBreit, 'x', befund.ueberHoch);

console.log('\n── 1. Was laeuft dauerhaft ─────────────────────────────────────');
const eintraege = Object.entries(befund.laufend).sort((a, z) => z[1] - a[1]);
if (!eintraege.length) console.log('  nichts');
let summe = 0;
for (const [name, n] of eintraege) { summe += n; console.log(`  ${String(n).padStart(4)} x  ${name}`); }
console.log(`  ────────\n  ${String(summe).padStart(4)} Animationen laufen gleichzeitig`);

console.log('\n── 2./3. Die Stufenleiter der Schrift, mit Kontrast ────────────');
console.log('   px   Gew.  Kontrast  Text');
for (const z of befund.zeilen) {
  const k = z.kontrast == null ? '  ?  ' : z.kontrast.toFixed(1).padStart(5);
  const warn = z.kontrast != null && z.kontrast < 4.5 && z.px < 24 ? '  ⚠️ unter 4,5:1 bei kleiner Schrift' : '';
  console.log(`  ${String(z.px).padStart(3)}  ${String(z.gewicht).padStart(4)}  ${k}    ${z.text}${z.kursiv ? '  (kursiv)' : ''}${warn}`);
}

console.log('\n── 4. Wer nimmt wie viel Bild ──────────────────────────────────');
for (const bl of befund.bloecke) {
  console.log(`  ${String(bl.anteil).padStart(5)} %  ${String(bl.b).padStart(4)}x${String(bl.h).padStart(4)}  bei ${bl.x},${bl.y}  ${bl.was}`);
}

fs.mkdirSync('.shots', { recursive: true });
await seite.screenshot({ path: '.shots/DANKE.png' });
console.log('\n.shots/DANKE.png geschrieben');

await b.schliessen?.();
process.exit(0);
