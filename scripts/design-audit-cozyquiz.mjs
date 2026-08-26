/* design-audit-cozyquiz — Kontrast, Touch-Ziele und Bewegung im KLASSISCHEN Spiel.
 *
 * 2026-08-26. Letzter offener Punkt im Beamer-Check: „Design-Audit-Fixes
 * (Kontrast/Touch-44px/reduced-motion) auch im klassischen CozyQuiz
 * gegenchecken, nicht nur Arena."
 *
 * Der Punkt lag lange offen, weil er nach Handarbeit klingt. Ist er aber nicht:
 * alle drei Kriterien sind messbar, und zwar genau so, wie die WCAG sie
 * definiert. Was ein Mensch beurteilen muss, ist danach eine sehr kurze Liste.
 *
 * ── Was geprueft wird ──────────────────────────────────────────────────────
 *
 * 1. KONTRAST (WCAG 1.4.3). Jede sichtbare Textzeile auf der Buehne.
 *    Vordergrund kommt exakt aus dem berechneten Stil. Der Grund NICHT: die
 *    Buehne arbeitet mit Verlaeufen, Bildern und halbdurchsichtigen Flaechen
 *    uebereinander, da liefert ein `backgroundColor` der Eltern regelmaessig
 *    „transparent" und damit eine Luege. Stattdessen wird der Grund aus den
 *    BILDPUNKTEN geschaetzt: der Median der Kachel des Elements, nachdem alle
 *    Punkte entfernt wurden, die nah an der Textfarbe liegen. Was uebrig
 *    bleibt, ist der Grund, auf dem der Text steht.
 *    Schwelle: 4,5:1 normal, 3:1 fuer grosse Schrift (ab 24 px, oder ab
 *    18,7 px wenn fett) - genau die WCAG-Definition.
 *
 * 2. TOUCH-ZIELE (WCAG 2.5.5, 44x44). Nur da, wo wirklich getippt wird: auf
 *    dem HANDY. Der Beamer hat keine Beruehrung, der Punkt waere dort sinnlos.
 *
 * 3. BEWEGUNG (WCAG 2.3.3 / prefers-reduced-motion). Die Buehne wird ein
 *    zweites Mal mit `reduce` geladen und gezaehlt, was dann noch laeuft.
 *    Erwartung: deutlich weniger. Laeuft dieselbe Zahl, greift der Schalter
 *    nicht - und das ist ein Fehler, kein Geschmack.
 *
 * NUTZUNG:  node scripts/design-audit-cozyquiz.mjs
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep, stationsNamen } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

// Nur der klassische Abend. Arena-Stationen sind seit 2026-08-26 schlafend.
const STATIONEN = ['lobby', 'regeln', 'rundenintro', 'frage', 'aufloesung', 'brett', 'pause', 'cozydanach'];

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
fs.mkdirSync('.shots', { recursive: true });

// ── Farbrechnung nach WCAG ────────────────────────────────────────────────
const kanal = (k) => { const s = k / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const leuchte = ({ r, g, b }) => 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);
const verhaeltnis = (a, z) => {
  const la = leuchte(a), lz = leuchte(z);
  const [hell, dunkel] = la > lz ? [la, lz] : [lz, la];
  return (hell + 0.05) / (dunkel + 0.05);
};
const zuRgb = (c) => {
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (!m) return null;
  const p = m[1].split(',').map(v => parseFloat(v));
  if (p.length > 3 && p[3] < 0.5) return null;   // fast unsichtbar, nicht werten
  return { r: p[0], g: p[1], b: p[2] };
};

// ⚠️ REIHENFOLGE: das Handy ZUERST. Im ersten Anlauf stand dieser Block am
// Ende, da war das Spiel durch alle Stationen laengst gestartet, und die
// Team-Seite zeigte nur noch „Quiz laeuft schon! Du bist nicht angemeldet" -
// ein einziges bedienbares Element, also nichts Gemessenes. Die Anmeldemaske
// mit Namensfeld und Avatarwahl gibt es nur in der LOBBY, und genau dort
// tippen am Abend alle Gaeste. Deshalb steht der Block jetzt vorn.
await b.zurStation('lobby');
await sleep(2000);

// ══ 2. TOUCH-ZIELE AUF DEM HANDY ══════════════════════════════════════════
console.log('\n══ 2. Touch-Ziele auf dem Handy (WCAG 2.5.5, 44x44) ════════════');
const ctx = seite.context();
const handy = await ctx.newPage();
await handy.setViewportSize({ width: 390, height: 844 });   // iPhone 14
await handy.goto(`http://localhost:5173/team?room=${b.roomCode ?? 'default'}`, { waitUntil: 'domcontentloaded' });
await sleep(3500);

const ziele = await handy.evaluate(() => {
  const raus = [];
  const wahl = 'button, a[href], input, select, textarea, [role="button"], [onclick], [tabindex]:not([tabindex="-1"])';
  for (const el of document.querySelectorAll(wahl)) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.2) continue;
    if (r.width < 1 || r.height < 1) continue;
    raus.push({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 26) || (el.getAttribute('aria-label') ?? ''),
      b: Math.round(r.width), h: Math.round(r.height),
      beschriftet: !!(el.getAttribute('aria-label') || (el.textContent ?? '').trim()),
    });
  }
  return { titel: document.title, ueberschrift: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 80), ziele: raus };
});

console.log(`  Seite zeigt: „${ziele.ueberschrift}"`);
console.log(`  ${ziele.ziele.length} bedienbare Elemente gefunden.`);
const zuKlein = ziele.ziele.filter(z => z.b < 44 || z.h < 44);
const ohneNamen = ziele.ziele.filter(z => !z.beschriftet);
if (!zuKlein.length) {
  console.log('  ✓ Alle mindestens 44x44.');
} else {
  console.log(`  ✗ ${zuKlein.length} unter 44x44:`);
  for (const z of zuKlein) console.log(`    ${String(z.b).padStart(4)}x${String(z.h).padEnd(4)}  <${z.tag}>  „${z.text}"`);
}
if (ohneNamen.length) {
  console.log(`  ! ${ohneNamen.length} Element(e) ohne Beschriftung (WCAG 4.1.2):`);
  for (const z of ohneNamen) console.log(`    <${z.tag}> ${z.b}x${z.h}`);
}
await handy.screenshot({ path: '.shots/AUDIT-HANDY.png' });
await handy.close();


// ══ 1. KONTRAST ═══════════════════════════════════════════════════════════
console.log('\n══ 1. Kontrast auf der Buehne (WCAG 1.4.3) ═════════════════════');
const kontrastFunde = [];
let geprueft = 0;

for (const st of STATIONEN) {
  try {
    await b.zurStation(st);
    await sleep(2200);
  } catch (e) {
    console.log(`  ${st}: nicht erreichbar (${String(e.message).slice(0, 50)})`);
    continue;
  }

  const zeilen = await seite.evaluate(() => {
    const buehne = document.querySelector('[data-qq-buehne]') ?? document.body;
    const raus = [];
    for (const el of buehne.querySelectorAll('*')) {
      const eigen = [...el.childNodes].filter(n => n.nodeType === 3)
        .map(n => n.textContent.trim()).join(' ').trim();
      if (!eigen || eigen.length < 2) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || Number(s.opacity) < 0.4) continue;
      const px = parseFloat(s.fontSize);
      const fett = Number(s.fontWeight) >= 700;
      raus.push({
        text: eigen.slice(0, 30),
        px: Math.round(px), fett,
        farbe: s.color,
        // WCAG: gross = ab 24px, oder ab 18.66px wenn fett.
        gross: px >= 24 || (fett && px >= 18.66),
        kasten: {
          left: Math.max(0, Math.round(r.left)), top: Math.max(0, Math.round(r.top)),
          width: Math.min(1760, Math.round(r.width)), height: Math.min(990, Math.round(r.height)),
        },
      });
    }
    return raus;
  });

  if (!zeilen.length) continue;
  const roh = await seite.screenshot({ type: 'png' });
  const bild = sharp(roh);

  for (const z of zeilen) {
    const vg = zuRgb(z.farbe);
    if (!vg) continue;
    const k = z.kasten;
    if (k.width < 4 || k.height < 4 || k.left + k.width > 1760 || k.top + k.height > 990) continue;
    let roher;
    try {
      roher = await bild.clone().extract(k).raw().toBuffer({ resolveWithObject: true });
    } catch { continue; }
    const { data, info } = roher;
    // Der Grund: alle Punkte, die NICHT nah an der Textfarbe liegen. Davon der
    // Median je Kanal. Median statt Mittel, damit ein Verlauf oder ein
    // Bildmotiv nicht das Ergebnis in die Mitte zieht.
    const rs = [], gs = [], bs = [];
    for (let i = 0; i < data.length; i += info.channels) {
      const d = Math.abs(data[i] - vg.r) + Math.abs(data[i + 1] - vg.g) + Math.abs(data[i + 2] - vg.b);
      if (d < 110) continue;                  // das ist der Text selbst
      rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
    }
    if (rs.length < 20) continue;             // fast nur Text, kein Grund messbar
    const med = (a) => { a.sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
    const grund = { r: med(rs), g: med(gs), b: med(bs) };
    const v = verhaeltnis(vg, grund);
    const soll = z.gross ? 3 : 4.5;
    geprueft++;
    if (v < soll) {
      kontrastFunde.push({ station: st, ...z, grund, v, soll });
    }
  }
}

console.log(`  ${geprueft} Textzeilen gemessen auf ${STATIONEN.length} Stationen.`);
if (!kontrastFunde.length) {
  console.log('  ✓ Keine Zeile unter der WCAG-Schwelle.');
} else {
  console.log(`  ✗ ${kontrastFunde.length} Zeile(n) unter der Schwelle:\n`);
  kontrastFunde.sort((a, z) => a.v - z.v);
  for (const f of kontrastFunde) {
    console.log(`    ${f.v.toFixed(2)}:1 (Soll ${f.soll}:1)  ${f.px}px${f.fett ? ' fett' : ''}`
      + `  ${f.station.padEnd(12)} „${f.text}"`);
    console.log(`        Text ${f.farbe}  auf  rgb(${f.grund.r}, ${f.grund.g}, ${f.grund.b})`);
  }
}

// ══ 3. BEWEGUNG ═══════════════════════════════════════════════════════════
// (Vor dem Handy, weil dafuer dieselbe Buehne noch steht.)
console.log('\n══ 3. Bewegung bei prefers-reduced-motion (WCAG 2.3.3) ═════════');
const zaehleAnimationen = () => seite.evaluate(() => {
  const namen = {};
  for (const a of document.getAnimations()) {
    if (a.playState !== 'running') continue;
    const n = a.animationName || a.constructor.name;
    namen[n] = (namen[n] ?? 0) + 1;
  }
  return { gesamt: Object.values(namen).reduce((s, v) => s + v, 0), namen };
});

await b.zurStation('lobby');
await sleep(2500);
const normal = await zaehleAnimationen();
await seite.emulateMedia({ reducedMotion: 'reduce' });
await seite.reload({ waitUntil: 'domcontentloaded' });
await sleep(4000);
const ruhig = await zaehleAnimationen();
await seite.emulateMedia({ reducedMotion: null });

console.log(`  Lobby normal          : ${normal.gesamt} laufende Animationen`);
console.log(`  Lobby mit „reduce"    : ${ruhig.gesamt}`);
const bleibt = Object.entries(ruhig.namen).sort((a, z) => z[1] - a[1]).slice(0, 8);
if (bleibt.length) {
  console.log('  Was trotz „reduce" weiterlaeuft:');
  for (const [n, c] of bleibt) console.log(`    ${String(c).padStart(4)} x  ${n}`);
}
console.log(ruhig.gesamt >= normal.gesamt
  ? '  ✗ Der Schalter greift nicht: es laeuft genauso viel wie vorher.'
  : `  ✓ Der Schalter greift: ${normal.gesamt - ruhig.gesamt} Animationen weniger.`);

// ══ Urteil ════════════════════════════════════════════════════════════════
console.log('\n══ Urteil ══════════════════════════════════════════════════════');
const schwer = kontrastFunde.length + zuKlein.length + (ruhig.gesamt >= normal.gesamt ? 1 : 0);
console.log(schwer === 0
  ? '  Nichts Messbares faellt durch.'
  : `  ${schwer} Punkt(e) fallen durch. Details oben.`);
console.log('\n  ⚠️ Automatisch pruefbar sind rund 30 Prozent der WCAG-Kriterien.');
console.log('     Tastaturbedienung und Screenreader sieht nur ein Mensch.\n');

await b.schliessen?.();
process.exit(0);
