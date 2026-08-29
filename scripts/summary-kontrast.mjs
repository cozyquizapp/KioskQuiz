/**
 * summary-kontrast.mjs — ist die Zusammenfassung lesbar?
 *
 * 2026-08-29. Anlass war Wolfs „die sieht oll aus". Beim Umstellen auf das
 * neue Design kam etwas heraus, das schlimmer ist als alt: die Punktezahl der
 * Teams stand in WEISS auf CREME. Gemessen 1,18:1, WCAG verlangt 4,5:1. Auf
 * dem Handy war die Zahl schlicht nicht da.
 *
 * Die Ursache war eine Annahme, die nirgends stand: „der Akzent ist dunkel".
 * Sie stimmte fuer Cozy-Pink, Mono-Schwarz und Neo-Blau, und mit dem Creme der
 * Buehne stimmte sie zum ersten Mal nicht. Deshalb dieses Werkzeug: es liest
 * jede sichtbare Textstelle der Seite und rechnet den Kontrast gegen den Grund
 * aus, auf dem sie wirklich steht.
 *
 * ⚠️ ZWEI FALLEN, an denen der erste Anlauf gescheitert ist:
 *
 *   1. Halbdurchsichtige Gruende. `getComputedStyle` liefert
 *      `rgba(255,255,255,0.05)` - wer das fuer eine Farbe haelt, rechnet gegen
 *      fast-Weiss und meldet die halbe Seite rot. Der erste Lauf hatte 57
 *      Treffer, davon waren rund 50 falsch. Hier werden die Schichten deshalb
 *      UEBEREINANDERGELEGT, bis eine deckende kommt.
 *   2. Der Seitengrund ist ein Verlauf, also gar keine Farbe. Deswegen
 *      `GRUND`: die dunkelste Stufe des Verlaufs, von Hand eingetragen. Wer
 *      das Design wechselt, muss den Wert nachziehen - er ist die einzige
 *      Annahme, die dieses Werkzeug noch macht.
 *
 * ⚠️ Emoji-Glyphen werden NICHT gewertet. Sie tragen ihre Farbe selbst, die
 * gemessene Schriftfarbe gilt fuer sie nicht.
 *
 * NUTZUNG: node scripts/summary-kontrast.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
const PIN = process.env.ADMIN_PIN || '2506';
/** Dunkelste Stufe des Buehnen-Seitenverlaufs (qqTheme.ts, BUEHNE.pageBg). */
const GRUND = process.env.QQ_GRUND ?? '#0B0912';
const SCHWELLE = Number(process.env.QQ_SCHWELLE ?? 4.5);

const ctx = await chromium.launchPersistentContext('.shots/.browser-profil-summary', {
  args: ['--no-sandbox'], viewport: { width: 390, height: 844 },
});
await ctx.addInitScript((pin) => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', pin);
    localStorage.setItem('qq-admin-pin', pin);
  } catch { /* ignore */ }
}, PIN);

const seite = await ctx.newPage();
await seite.goto(`${BASE}/summary-test`, { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 3000));

const messen = () => seite.evaluate(({ grund, schwelle }) => {
  const zahl = (c) => (String(c).match(/[\d.]+/g) || []).map(Number);
  const ausHex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const kontrast = (a, b) => {
    const L1 = lum(a), L2 = lum(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  };
  /** Schicht a (mit Alpha) ueber Schicht b legen. */
  const ueber = (a, alpha, b) => a.map((v, i) => v * alpha + b[i] * (1 - alpha));

  /**
   * Die Gruende, auf denen dieses Element steht - Mehrzahl, und das ist der
   * Punkt.
   *
   * ⚠️ Ein Verlauf ist keine Farbe. Der zweite Anlauf meldete den Teilen-Knopf
   * mit 1,03:1, weil `backgroundColor` bei einem `linear-gradient` schlicht
   * durchsichtig ist: das Werkzeug lief am cremefarbenen Knopf vorbei und
   * rechnete gegen den dunklen Kasten dahinter. Gemessen war der Knopf in
   * Wahrheit 16:1 - der einzige Befund des Laufs war der Pruefer selbst.
   *
   * Jetzt werden die Farbstopps des Verlaufs gelesen und JEDER als eigener
   * Grund geprueft. Gewertet wird der schlechteste: wenn die Schrift an einer
   * Stelle des Verlaufs untergeht, geht sie unter.
   */
  const grundeVon = (el) => {
    const schichten = [];   // [[r,g,b], alpha][] von aussen nach innen
    let verlauf = null;     // Farbstopps der obersten Verlaufsschicht
    let p = el;
    while (p && p !== document.documentElement) {
      const st = getComputedStyle(p);
      if (!verlauf && st.backgroundImage && st.backgroundImage !== 'none') {
        const stopps = (st.backgroundImage.match(/rgba?\([^)]+\)/g) || [])
          .map(zahl).filter(c => c.length >= 3 && (c.length < 4 || c[3] > 0.9));
        if (stopps.length) verlauf = stopps.map(c => [c[0], c[1], c[2]]);
      }
      const c = zahl(st.backgroundColor);
      if (c.length >= 3) {
        const a = c.length === 4 ? c[3] : 1;
        if (a > 0) {
          schichten.push([[c[0], c[1], c[2]], a]);
          if (a >= 0.999) break;
        }
      }
      if (verlauf) break;   // ein deckender Verlauf verdeckt alles darunter
      p = p.parentElement;
    }
    const basen = verlauf ?? [ausHex(grund)];
    return basen.map((basis) => {
      let farbe = basis;
      for (let i = schichten.length - 1; i >= 0; i--) farbe = ueber(schichten[i][0], schichten[i][1], farbe);
      return farbe;
    });
  };

  const res = [];
  for (const el of document.querySelectorAll('*')) {
    // ⚠️ Nicht „keine Kinder", sondern „eigene Textknoten". Der dritte Anlauf
    // hat den Teilen-Knopf uebersehen - Wolfs wichtigsten Knopf auf dieser
    // Seite -, weil neben dem Text ein Icon-<img> steht und die Regel damit
    // „hat Kinder, also ueberspringen" lautete. Gemalt wird der Text aber von
    // genau diesem Element.
    const t = [...el.childNodes]
      .filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    if (!t || t.length > 60) continue;
    // Emoji-Glyphen tragen ihre eigene Farbe - die Schriftfarbe gilt nicht.
    if (!/[A-Za-z0-9À-ɏ]/.test(t)) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) < 0.15) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 6) continue;
    const vg = zahl(st.color);
    const k = Math.min(...grundeVon(el).map(g => kontrast([vg[0], vg[1], vg[2]], g)));
    if (k < schwelle) {
      res.push({ t: t.slice(0, 30), fg: st.color, k: Math.round(k * 100) / 100, px: st.fontSize, w: st.fontWeight });
    }
  }
  // Dieselbe Stelle steht oft fuenfmal da (fuenf Teams, eine Pille).
  const gesehen = new Map();
  for (const f of res) {
    const s = `${f.fg}|${f.k}|${f.px}`;
    if (gesehen.has(s)) gesehen.get(s).n++;
    else gesehen.set(s, { ...f, n: 1 });
  }
  return [...gesehen.values()].sort((a, b) => a.k - b.k);
}, { grund: GRUND, schwelle: SCHWELLE });

console.log(`\n${'─'.repeat(70)}`);
console.log(`Summary · Kontrast unter ${SCHWELLE}:1  (Grund ${GRUND})`);
console.log(`${'─'.repeat(70)}`);

/** Grosse fette Schrift darf nach WCAG auf 3:1. */
const gross = (f) => parseFloat(f.px) >= 24 || (parseFloat(f.px) >= 18.66 && Number(f.w) >= 700);

let zuSchwach = 0;
// ⚠️ Die Seite hat ZWEI Ansichten. Wer nur die Uebersicht misst, misst die
// Haelfte: der Team-Schirm bringt eigene Flaechen mit (Ehrentitel, Endstand,
// Stamm-Code) - und der Teilen-Knopf, um den es Wolf geht, steht nur dort.
for (const [name, hin] of [
  ['Uebersicht', null],
  ['Team-Schirm', async () => {
    const k = seite.locator('button.qq-sum-pick').first();
    if (!(await k.count())) return false;
    await k.click();
    await new Promise(r => setTimeout(r, 1200));
    return true;
  }],
]) {
  if (hin && !(await hin())) { console.log(`\n  ${name}: nicht erreichbar`); continue; }
  const funde = await messen();
  console.log(`\n  ── ${name}`);
  for (const f of funde) {
    const marke = gross(f) && f.k >= 3 ? 'gross (3:1 reicht)' : '✗';
    console.log(`    ${String(f.k).padStart(5)}:1  ${f.px.padStart(6)}  ${marke.padEnd(20)} „${f.t}"${f.n > 1 ? `  (${f.n}x)` : ''}`);
  }
  const echt = funde.filter(f => !(gross(f) && f.k >= 3));
  if (!echt.length) console.log('    ✓ nichts unter der Schwelle');
  zuSchwach += echt.length;
}

console.log(`\n  ${zuSchwach} Stelle(n) zu schwach.`);
await ctx.close();
process.exit(zuSchwach > 0 ? 1 : 0);
