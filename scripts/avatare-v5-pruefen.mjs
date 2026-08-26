/* avatare-v5-pruefen — halten die abgeleiteten Bilder, was die Regeln verlangen?
 *
 * 2026-08-26. Wolfs Regeln zum Avatarsatz V5 enden mit einer Kontrolle, und
 * zwar woertlich: „Das Ergebnis anschliessend auf Schwarz, Weiss sowie Orange,
 * Gruen und Blau kontrollieren. Besonders auf dunkle oder helle Pixelraender,
 * Loecher in geschlossenen Flaechen und abgeschnittene Aussenkanten achten."
 *
 * Genau das macht dieses Skript, und zwar zweigleisig: was ein Rechner zaehlen
 * kann, zaehlt er; was ein Auge sehen muss, kommt aufs Blatt.
 *
 * ── Was gezaehlt wird ──────────────────────────────────────────────────────
 *
 * 1. ABGESCHNITTENE AUSSENKANTEN. Ein Motiv, das die Leinwand beruehrt, ist
 *    beim Verkleinern angeschnitten worden - oder war es schon im Original.
 *    Geprueft wird die aeusserste Reihe von Bildpunkten auf Deckkraft.
 *
 * 2. RAENDER, die es nicht geben darf. Ein Halo ist ein Ring
 *    halbdurchsichtiger Punkte, deren Farbe NICHT ZUM MOTIV PASST.
 *
 *    ⚠️ Die Definition ist der ganze Punkt, und ich habe sie zweimal falsch
 *    gehabt. Erster Anlauf: „halbdurchsichtig und sehr hell oder sehr dunkel".
 *    Das meldete `daisy` - eine weisse Bluete hat weisse Kantenpunkte, das ist
 *    das Motiv und kein Halo. Zweiter Anlauf, am Anteil der Kante statt am
 *    Anteil des Bildes: das meldete `playing-card`, 16 gegen 38 Prozent. Die
 *    Karte ist creme, ihre Eigenfarbe liegt genau auf meiner Helligkeitsgrenze,
 *    und schon eine kleine Verschiebung kippt viele Punkte darueber. Nebeneinander
 *    gelegt (Original gegen abgeleitet, auf Schwarz, Weiss und Orange) war kein
 *    Unterschied zu sehen.
 *
 *    Helligkeit allein kann einen hellen Rand nicht von einem hellen Gegenstand
 *    unterscheiden. Gemessen wird deshalb der ABSTAND ZUR EIGENFARBE: die
 *    mittlere Farbe der deckenden Punkte ist der Koerper, die mittlere Farbe der
 *    halbdurchsichtigen ist die Kante. Eine weiche Kante liegt nah am Koerper,
 *    ein Halo weit daneben. Und verglichen wird wieder Original gegen
 *    abgeleitet: nur was das Verkleinern HINZUFUEGT, ist mein Fehler.
 *
 * 3. LOECHER in geschlossenen Flaechen. Voll durchsichtige Punkte, die
 *    ringsum von deckenden umgeben sind - also mitten im Motiv statt
 *    aussenherum. Gesucht wird per Flutfuellung vom Rand: was von aussen
 *    nicht erreichbar und trotzdem durchsichtig ist, ist ein Loch.
 *
 * 4. ALPHA-TREUE. Das abgeleitete Bild wird gegen das Original verglichen:
 *    dieselbe Silhouette, nur kleiner. Wandert der Anteil deckender Flaeche
 *    um mehr als einen Prozentpunkt, ist beim Skalieren etwas passiert.
 *
 * ── Was aufs Blatt kommt ───────────────────────────────────────────────────
 * Jedes Motiv auf den fuenf geforderten Gruenden nebeneinander. Kein
 * Sprite-Sheet als AUSLIEFERUNG - das Blatt ist ein Pruefbild und liegt in
 * .shots, nicht im Satz.
 *
 * NUTZUNG:
 *   node scripts/avatare-v5-pruefen.mjs            # zaehlen + Blatt
 *   node scripts/avatare-v5-pruefen.mjs --nurzahlen
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const NUR_ZAHLEN = process.argv.includes('--nurzahlen');
const ORIGINAL = 'design-assets/avatare-v5-original';
const ABGELEITET = 'frontend/public/avatars/cozyquiz';

/** Die fuenf Gruende aus Wolfs Regeln. */
const GRUENDE = [
  { name: 'schwarz', hex: '#000000' },
  { name: 'weiss',   hex: '#FFFFFF' },
  { name: 'orange',  hex: '#F97316' },
  { name: 'gruen',   hex: '#22C55E' },
  { name: 'blau',    hex: '#3B82F6' },
];

async function untersuche(datei) {
  const { data, info } = await sharp(datei).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const A = (x, y) => data[(y * w + x) * c + 3];

  // 1. Aussenkante
  let kante = 0;
  for (let x = 0; x < w; x++) { if (A(x, 0) > 24) kante++; if (A(x, h - 1) > 24) kante++; }
  for (let y = 0; y < h; y++) { if (A(0, y) > 24) kante++; if (A(w - 1, y) > 24) kante++; }

  // 2. Fremdfarbige Halbkanten
  let deckend = 0, halbdurchsichtig = 0;
  const koerper = [0, 0, 0], kanteFarbe = [0, 0, 0];
  for (let i = 0; i < data.length; i += c) {
    const a = data[i + 3];
    if (a >= 248) {
      deckend++;
      koerper[0] += data[i]; koerper[1] += data[i + 1]; koerper[2] += data[i + 2];
      continue;
    }
    if (a < 8) continue;
    halbdurchsichtig++;
    kanteFarbe[0] += data[i]; kanteFarbe[1] += data[i + 1]; kanteFarbe[2] += data[i + 2];
  }
  const mittel = (v, n) => (n ? v.map(x => x / n) : [0, 0, 0]);
  const k = mittel(koerper, deckend), r = mittel(kanteFarbe, halbdurchsichtig);
  // Abstand der Kantenfarbe zur Koerperfarbe, 0 bis 255.
  const kantenAbstand = halbdurchsichtig
    ? Math.sqrt(((k[0] - r[0]) ** 2 + (k[1] - r[1]) ** 2 + (k[2] - r[2]) ** 2) / 3)
    : 0;

  // 3. Loecher: Flutfuellung der Durchsichtigkeit vom Rand her.
  const aussen = new Uint8Array(w * h);
  const stapel = [];
  const setz = (x, y) => {
    const i = y * w + x;
    if (aussen[i] || A(x, y) >= 8) return;
    aussen[i] = 1; stapel.push(i);
  };
  for (let x = 0; x < w; x++) { setz(x, 0); setz(x, h - 1); }
  for (let y = 0; y < h; y++) { setz(0, y); setz(w - 1, y); }
  while (stapel.length) {
    const i = stapel.pop();
    const x = i % w, y = (i / w) | 0;
    if (x > 0) setz(x - 1, y);
    if (x < w - 1) setz(x + 1, y);
    if (y > 0) setz(x, y - 1);
    if (y < h - 1) setz(x, y + 1);
  }
  let loecher = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (A(x, y) < 8 && !aussen[y * w + x]) loecher++;
    }
  }

  return { w, h, kante, kantenAbstand, halbdurchsichtig, loecher, deckendAnteil: deckend / (w * h) };
}

const dateien = fs.readdirSync(ORIGINAL).filter(f => f.endsWith('.png')).sort();
console.log(`\n══ Kontrolle Avatarsatz V5 ═════════════════════════════════════`);
console.log(`${dateien.length} Motive. Original 1024, abgeleitet 640.\n`);

const funde = [];
for (const datei of dateien) {
  const slug = datei.replace(/^[a-z-]+--/, '');
  const abg = path.join(ABGELEITET, slug);
  if (!fs.existsSync(abg)) { funde.push(`${slug}: abgeleitete Datei fehlt`); continue; }

  const o = await untersuche(path.join(ORIGINAL, datei));
  const n = await untersuche(abg);

  // Ein Befund zaehlt nur, wenn er im ABGELEITETEN Bild schlimmer ist als im
  // Original. Was das Original schon mitbringt, ist Wolfs Entwurf und nicht
  // mein Fehler - dann steht es als Hinweis da, nicht als Fehler.
  if (n.kante > 0 && o.kante === 0) funde.push(`${slug}: Aussenkante beruehrt (${n.kante} Punkte), Original nicht`);
  if (o.kante > 0) funde.push(`${slug}: HINWEIS, schon das Original beruehrt die Kante (${o.kante} Punkte)`);
  // Loecher flaechenrelativ. Feine Motive (Bluetenblaetter, Gitter) behalten
  // beim Verkleinern anteilig MEHR Loch, weil die Stege duenner werden als ein
  // Bildpunkt. Erst das Doppelte des Erwarteten ist ein Befund.
  const loecherErwartet = o.loecher * (n.w * n.h) / (o.w * o.h);
  if (n.loecher > loecherErwartet * 2 + 40) {
    funde.push(`${slug}: ${n.loecher} Loecher, erwartet waren rund ${Math.round(loecherErwartet)}`);
  }
  // Wandert die Kantenfarbe beim Verkleinern von der Eigenfarbe WEG? Ein
  // Zuwachs von 12 Stufen (von 255) ist mit blossem Auge auf einem hellen
  // Grund zu sehen, darunter nicht.
  if (n.kantenAbstand > o.kantenAbstand + 12) {
    funde.push(`${slug}: Kantenfarbe entfernt sich von der Eigenfarbe (${o.kantenAbstand.toFixed(0)} -> ${n.kantenAbstand.toFixed(0)} von 255)`);
  }
  const drift = Math.abs(n.deckendAnteil - o.deckendAnteil) * 100;
  if (drift > 1) funde.push(`${slug}: Silhouette wandert um ${drift.toFixed(2)} Prozentpunkte`);
}

if (!funde.length) {
  console.log('✓ Nichts Zaehlbares auffaellig: keine angeschnittenen Kanten, keine');
  console.log('  fremdfarbigen Raender, keine neuen Loecher, Silhouetten stabil.');
} else {
  const hinweise = funde.filter(f => f.includes('HINWEIS'));
  const fehler = funde.filter(f => !f.includes('HINWEIS'));
  if (fehler.length) { console.log(`✗ ${fehler.length} Befund(e):`); for (const f of fehler) console.log(`   ${f}`); }
  if (hinweise.length) { console.log(`\n! ${hinweise.length} Hinweis(e) aus den Originalen (nicht durch das Skalieren entstanden):`); for (const f of hinweise) console.log(`   ${f}`); }
}

// ── Das Pruefblatt ────────────────────────────────────────────────────────
if (!NUR_ZAHLEN) {
  fs.mkdirSync('.shots', { recursive: true });
  const K = 120, LUFT = 8, KOPF = 26;
  const spalten = GRUENDE.length;
  const zeilenHoehe = K + LUFT;
  const W = spalten * (K + LUFT) + LUFT + 190;
  const H = dateien.length * zeilenHoehe + KOPF + LUFT;
  const teile = [], texte = [];
  texte.push(`<rect width="${W}" height="${H}" fill="#151018"/>`);
  GRUENDE.forEach((g, i) => {
    const x = 190 + LUFT + i * (K + LUFT);
    texte.push(`<text x="${x}" y="18" font-family="monospace" font-size="13" fill="#cfc3d8">${g.name}</text>`);
  });

  for (let r = 0; r < dateien.length; r++) {
    const slug = dateien[r].replace(/^[a-z-]+--/, '');
    const abg = path.join(ABGELEITET, slug);
    if (!fs.existsSync(abg)) continue;
    const y = KOPF + r * zeilenHoehe;
    texte.push(`<text x="8" y="${y + K / 2}" font-family="monospace" font-size="14" fill="#f2ece6">${slug.replace('.png', '')}</text>`);
    for (let i = 0; i < GRUENDE.length; i++) {
      const g = GRUENDE[i];
      // Jedes Motiv EINMAL je Grund, auf eine Flaeche gelegt - das Bild selbst
      // bleibt unveraendert, der Grund liegt darunter.
      const kachel = await sharp({ create: { width: K, height: K, channels: 4, background: g.hex } })
        .composite([{ input: await sharp(abg).resize(K, K, { kernel: 'lanczos3', fit: 'fill' }).png().toBuffer() }])
        .png().toBuffer();
      teile.push({ input: kachel, left: 190 + LUFT + i * (K + LUFT), top: y });
    }
  }

  await sharp({ create: { width: W, height: H, channels: 3, background: '#151018' } })
    .composite([{ input: Buffer.from(`<svg width="${W}" height="${H}">${texte.join('')}</svg>`), left: 0, top: 0 }, ...teile])
    .png().toFile('.shots/AVATARE-V5-PRUEFUNG.png');
  console.log('\n.shots/AVATARE-V5-PRUEFUNG.png geschrieben (Pruefbild, kein Auslieferungs-Asset).');
}
