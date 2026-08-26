/* kachel-3d-messen — zwei Befunde in einem Durchgang.
 *
 * 2026-08-26, zwei Meldungen von Wolf am Livebild:
 *   A) Siegerfolie: „kein 3d effekt auf kachel, oder?"
 *   B) Ehrungsfenster: „das platz x oben ist sehr klein geht etwas unter"
 *      und, mit Screenshot: „schau das geht bisschen unter so"
 *
 * Beide Male steht im Code etwas anderes, als auf der Wand zu sehen ist, und
 * genau das ist der Grund fuer dieses Werkzeug:
 *
 *   A) Die Kachel soll seit „Kacheln immer 3D" ihre Tiefe aus qqKachelFlaeche
 *      beziehen. Der Verdacht: das gilt nur fuer EINEN Render-Pfad, und die
 *      Buehne loescht ausserdem zentral jeden box-shadow an `.qq-team-mark`
 *      (main.css, „Gluehen entfernen"). Der Innenschatten IST aber die Tiefe.
 *   B) Das Ehrungsfenster steht im Code auf rgba(24,19,34,0.97), also fast
 *      deckend. Auf dem Bild scheinen die Tuerme hindurch. Einer von beiden
 *      Saetzen ist falsch, und Bildpunkte entscheiden das.
 *
 * Gemessen wird deshalb nie die Absicht, sondern der berechnete Stil UND die
 * Helligkeit der Flaeche. Eine Kachel mit Tiefe ist oben heller als unten.
 * Ein deckendes Fenster hat innen ueberall dieselbe Helligkeit; ein
 * durchscheinendes zeigt die Kacheln dahinter als Ausschlaege.
 *
 * NUTZUNG:  node scripts/kachel-3d-messen.mjs
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
fs.mkdirSync('.shots', { recursive: true });

const text = () => seite.evaluate(() => document.body.innerText || '');

/** Mittlere Helligkeit je Bildzeile in einem Ausschnitt. */
async function zeilenHelligkeit(roh, kasten) {
  const { data, info } = await sharp(roh)
    .extract(kasten).raw().toBuffer({ resolveWithObject: true });
  const zeilen = [];
  for (let y = 0; y < info.height; y++) {
    let summe = 0;
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      summe += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    zeilen.push(summe / info.width);
  }
  return zeilen;
}

await b.zurStation('turmfinale');
await sleep(2000);

/** Vorfahren, bis der gesuchte Kasten auf der Buehne steht. */
async function bisZu(wahl, schritte = 26, takt = 1100) {
  for (let i = 0; i < schritte; i++) {
    if (await seite.evaluate(w => !!document.querySelector(w), wahl)) return true;
    await h.emit('qq:nextQuestion');
    await sleep(takt);
  }
  return await seite.evaluate(w => !!document.querySelector(w), wahl);
}

// ══ C) Der Ring um das Gewinner-Team auf der Award-Karte ══════════════════
// 2026-08-26 (Wolf: „DAS PROBLEM BESTEHT NOCH?"). Zweiter Anlauf nach dem
// 2026-08-25. Der Verdacht diesmal: die Zelle im Rad rundet mit 18 Prozent,
// die Kachel darin mit 16 (--qq-team-mark-radius im Buehnen-Scope). Der Ring
// haengt als `outline` an der ZELLE, also an der falschen Rundung - und der
// Abstand faellt an den Ecken anders aus als an den Kanten. Genau das liest
// sich als „komischer Rand".
console.log('\n══ C) Der Ring um das Gewinner-Team ════════════════════════════');
if (!(await bisZu('[data-qq-awardkarte]'))) {
  console.log('  (keine [data-qq-awardkarte] erreicht)');
} else {
  // Warten, bis das Rad steht - vorher gibt es den Ring gar nicht.
  for (let i = 0; i < 40; i++) {
    const da = await seite.evaluate(() => {
      for (const el of document.querySelectorAll('[data-qq-awardkarte] *')) {
        if (getComputedStyle(el).outlineStyle === 'solid') return true;
      }
      return false;
    });
    if (da) break;
    await sleep(300);
  }
  const ring = await seite.evaluate(() => {
    let zelle = null;
    for (const el of document.querySelectorAll('[data-qq-awardkarte] *')) {
      if (getComputedStyle(el).outlineStyle === 'solid') { zelle = el; break; }
    }
    if (!zelle) return null;
    const zs = getComputedStyle(zelle);
    const zr = zelle.getBoundingClientRect();
    const marke = zelle.querySelector('.qq-team-mark') ?? zelle.firstElementChild;
    const ms = marke ? getComputedStyle(marke) : null;
    const mr = marke ? marke.getBoundingClientRect() : null;
    return {
      zelle: {
        b: Math.round(zr.width), h: Math.round(zr.height),
        radius: zs.borderRadius, outline: zs.outline, versatz: zs.outlineOffset,
      },
      marke: mr ? {
        b: Math.round(mr.width), h: Math.round(mr.height),
        radius: ms.borderRadius, klassen: marke.className,
      } : null,
      versatzOben: mr ? Math.round(mr.top - zr.top) : null,
      versatzLinks: mr ? Math.round(mr.left - zr.left) : null,
      kasten: { x: Math.round(zr.left), y: Math.round(zr.top), b: Math.round(zr.width), h: Math.round(zr.height) },
    };
  });
  if (!ring) {
    console.log('  (kein Ring gefunden, das Rad steht vielleicht noch nicht)');
  } else {
    console.log('  Zelle (traegt den Ring):', ring.zelle);
    console.log('  Kachel darin           :', ring.marke);
    console.log(`  Kachel sitzt ${ring.versatzLinks} px von links, ${ring.versatzOben} px von oben in der Zelle`);
    const zR = parseFloat(ring.zelle.radius);
    const mR = ring.marke ? parseFloat(ring.marke.radius) : NaN;
    const v = parseFloat(ring.zelle.versatz) || 0;
    console.log('\n  ── Passen die Rundungen zusammen? ──');
    console.log(`  Rundung der Zelle  : ${zR.toFixed(1)} px  (davon zeichnet der Ring ${(zR + v).toFixed(1)} px, Versatz ${v})`);
    console.log(`  Rundung der Kachel : ${mR.toFixed(1)} px`);
    console.log(`  Sollwert fuer den Ring, damit der Abstand ueberall gleich ist: ${(mR + v).toFixed(1)} px`);
    const fehler = Math.abs((zR + v) - (mR + v));
    console.log(fehler > 1.5
      ? `  ⇒ SCHIEF um ${fehler.toFixed(1)} px. An den Ecken klafft es anders als an den Kanten.`
      : '  ⇒ Passt.');
    // Nicht nur die Kachel: der Ring ist erst im Zusammenhang zu beurteilen,
    // neben den kleineren Nachbarn im Rad. Ein Ausschnitt von 55 Bildpunkten
    // zeigt ein Motiv, keinen Rand.
    const roh = await seite.screenshot({ type: 'png' });
    const karte = await seite.evaluate(() => {
      const el = document.querySelector('[data-qq-awardkarte]');
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), b: Math.round(r.width), h: Math.round(r.height) };
    });
    await sharp(roh).extract({
      left: Math.max(0, karte.x - 8), top: Math.max(0, karte.y - 8),
      width: Math.min(1760 - Math.max(0, karte.x - 8), karte.b + 16),
      height: Math.min(990 - Math.max(0, karte.y - 8), karte.h + 16),
    }).resize(900).png().toFile('.shots/AWARDRING.png');
    console.log('\n  .shots/AWARDRING.png geschrieben (ganze Karte)');
  }
}

// ══ B) Das Ehrungsfenster ═════════════════════════════════════════════════
// Bis zum ersten Ausscheiden vorfahren: das Fenster traegt `data-qq-ansage`.
const gefunden = await bisZu('[data-qq-ansage]');
console.log('\n══ B) Das Ehrungsfenster ═══════════════════════════════════════');
if (!gefunden) {
  console.log('  (kein [data-qq-ansage] erreicht, steht bei: '
    + (await text()).replace(/\s+/g, ' ').slice(0, 70) + ')');
} else {
  await sleep(900);
  const fenster = await seite.evaluate(() => {
    const el = document.querySelector('[data-qq-ansage]');
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    // Die Platz-Zeile ist das erste Kind. Ihre Groesse ist Wolfs Beschwerde.
    const platz = el.firstElementChild;
    const ps = platz ? getComputedStyle(platz) : null;
    const pr = platz ? platz.getBoundingClientRect() : null;
    // Und der Name, zum Vergleich: wie viel kleiner ist der Platz wirklich?
    const alle = [...el.querySelectorAll('*')].map(k => ({
      text: (k.textContent ?? '').trim().slice(0, 22),
      px: Math.round(parseFloat(getComputedStyle(k).fontSize)),
    })).filter(k => k.text && k.px > 8);
    return {
      kasten: { x: Math.round(r.left), y: Math.round(r.top), b: Math.round(r.width), h: Math.round(r.height) },
      grund: s.backgroundImage.slice(0, 120),
      grundFarbe: s.backgroundColor,
      deckkraft: s.opacity,
      rand: s.border,
      platzZeile: ps ? { px: Math.round(parseFloat(ps.fontSize)), farbe: ps.color, text: platz.textContent } : null,
      zeilen: alle,
    };
  });
  console.log('  Kasten        :', fenster.kasten);
  console.log('  Grund         :', fenster.grundFarbe, '|', fenster.grund);
  console.log('  Deckkraft     :', fenster.deckkraft);
  console.log('  Rand          :', fenster.rand);
  console.log('  Platz-Zeile   :', fenster.platzZeile);
  console.log('  Schriftgroessen im Fenster:');
  for (const z of fenster.zeilen) console.log(`    ${String(z.px).padStart(4)} px  ${z.text}`);

  // Scheinen die Tuerme durch? Ein SENKRECHTER Streifen im linken Innenrand
  // des Fensters, ueber die ganze Hoehe.
  //
  // ⚠️ Der erste Anlauf legte den Streifen waagerecht auf 62 Prozent der Hoehe
  // und meldete Spannweite 219 - gemessen wurde da aber der TEAMNAME in Weiss,
  // nicht der Grund. Ein Messwerkzeug, das den Vordergrund fuer den
  // Hintergrund haelt, meldet jedes Fenster als undicht. Der linke Innenrand
  // ist auf der Buehne 76 Bildpunkte breit und traegt nie Text, weil alles im
  // Fenster mittig steht.
  const roh = await seite.screenshot({ type: 'png' });
  const k = fenster.kasten;
  const { data, info } = await sharp(roh)
    .extract({ left: k.x + 6, top: k.y + 6, width: 26, height: k.h - 12 })
    .raw().toBuffer({ resolveWithObject: true });
  const spalten = [];
  for (let y = 0; y < info.height; y++) {
    let summe = 0;
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      summe += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    spalten.push(summe / info.width);
  }
  const min = Math.min(...spalten), max = Math.max(...spalten);
  const mittel = spalten.reduce((s, v) => s + v, 0) / spalten.length;
  console.log("\n  ── Scheint es durch? Streifen im linken Innenrand ──");
  console.log(`  dunkelste Stelle : ${min.toFixed(1)}`);
  console.log(`  hellste Stelle   : ${max.toFixed(1)}`);
  console.log(`  Mittel           : ${mittel.toFixed(1)}`);
  console.log(`  Spannweite       : ${(max - min).toFixed(1)}`);
  // Der Grund des Fensters ist selbst ein senkrechter Verlauf (24,19,34 nach
  // 14,11,20), das sind rund 10 Stufen ueber die ganze Hoehe. Alles darunter
  // ist der Verlauf, nicht ein Leck. Erst deutlich mehr heisst, dass etwas
  // dahinter durchkommt.
  console.log(max - min > 30
    ? '  ⇒ DURCHSCHEINEND. Hinter dem Fenster liegt sichtbar etwas anderes.'
    : '  ⇒ Deckend. Was bleibt, ist der eigene Verlauf des Fensters.');

  await sharp(roh)
    .extract({
      left: Math.max(0, k.x - 30), top: Math.max(0, k.y - 30),
      width: Math.min(1760 - Math.max(0, k.x - 30), k.b + 60),
      height: k.h + 60,
    })
    .png().toFile('.shots/EHRUNGSFENSTER.png');
  // Und die ganze Buehne: der Punkt ist ja gerade, wie sich das Fenster gegen
  // die Tuerme behauptet. Ein Ausschnitt kann das nicht zeigen.
  await sharp(roh).resize(1100).png().toFile('.shots/EHRUNG_GANZ.png');
  console.log('\n  .shots/EHRUNGSFENSTER.png + EHRUNG_GANZ.png geschrieben');
}

// ══ A) Die Kachel auf der Siegerfolie ═════════════════════════════════════
const SIEGERFOLIE = /SIEGER DES ABENDS|WINNER OF THE NIGHT/i;
for (let i = 0; i < 40; i++) {
  if (SIEGERFOLIE.test(await text())) break;
  await h.emit('qq:nextQuestion');
  await sleep(700);
}
await sleep(1600);
console.log('\n══ A) Die Kachel auf der Siegerfolie ═══════════════════════════');
const marke = await seite.evaluate(() => {
  const el = document.querySelector('[data-qq-buehne] .qq-team-mark');
  if (!el) return null;
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    kasten: { x: Math.round(r.left), y: Math.round(r.top), b: Math.round(r.width), h: Math.round(r.height) },
    grund: s.backgroundImage.slice(0, 200),
    grundFarbe: s.backgroundColor,
    schatten: s.boxShadow,
    rand: s.border,
    radius: s.borderRadius,
  };
});
if (!marke) {
  console.log('  (keine .qq-team-mark gefunden, steht bei: '
    + (await text()).replace(/\s+/g, ' ').slice(0, 70) + ')');
} else {
  console.log('  Kasten   :', marke.kasten);
  console.log('  Grund    :', marke.grundFarbe, '|', marke.grund);
  console.log('  Schatten :', marke.schatten);
  console.log('  Rand     :', marke.rand, '| Radius', marke.radius);

  const roh = await seite.screenshot({ type: 'png' });
  const k = marke.kasten;
  // Ein schmaler Streifen am linken Rand, neben dem Motiv. Das Motiv selbst
  // wird nicht angefasst - gemessen wird nur die Flaeche dahinter.
  const zeilen = await zeilenHelligkeit(roh, {
    left: k.x + 4, top: k.y + 3,
    width: Math.max(6, Math.round(k.b * 0.09)), height: k.h - 6,
  });
  const teil = (a, e) => zeilen.slice(a, e).reduce((s, v) => s + v, 0) / Math.max(1, e - a);
  const d = Math.floor(zeilen.length / 3);
  const oben = teil(0, d), mitte = teil(d, 2 * d), unten = teil(2 * d, zeilen.length);
  console.log('\n  ── Helligkeit der Flaeche, oben gegen unten ──');
  console.log(`  oberes Drittel : ${oben.toFixed(1)}`);
  console.log(`  mittleres      : ${mitte.toFixed(1)}`);
  console.log(`  unteres        : ${unten.toFixed(1)}`);
  console.log(`  Gefaelle       : ${(oben - unten).toFixed(1)}`);
  console.log(oben - unten < 6
    ? '  ⇒ FLACH. Kein Licht von oben, kein Schatten unten.'
    : '  ⇒ Tiefe ist da.');

  await sharp(roh)
    .extract({
      left: Math.max(0, k.x - 40), top: Math.max(0, k.y - 40),
      width: k.b + 80, height: k.h + 80,
    })
    .png().toFile('.shots/KACHEL3D.png');
  console.log('\n  .shots/KACHEL3D.png geschrieben');
}

await b.schliessen?.();
process.exit(0);
