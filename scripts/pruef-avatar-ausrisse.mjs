/**
 * pruef-avatar-ausrisse — findet Motive, aus denen ein Freistell-Werkzeug
 * Stuecke herausgefressen hat.
 *
 * 2026-08-25, beim Einbau des HD-Satzes: fuenf Motive (book, wizard-hat,
 * camera, alarm-clock, cassette) haben eine zerfranste RECHTE Kante. Immer
 * rechts, weil die Motive aus einer Reihe geschnitten wurden und die
 * Hintergrund-Entfernung dort den Nachbarschatten mitgenommen hat. Auf
 * 2,8 m Bildbreite ist das sichtbar.
 *
 * Der naive Test („transparente Pixel innerhalb der Motiv-Huelle") schlaegt
 * fehl: Schluesselauge, Donutloch und Schneeflocke sind genau das, ohne Fehler
 * zu sein. Unterschieden wird deshalb nach FORM:
 *   echtes Loch → wenige, GROSSE, glattrandige transparente Inseln
 *   Ausriss     → VIELE WINZIGE Inseln in einem schmalen Band
 * Gezaehlt werden die winzigen (unter 400 px, bei 1024² also 0,04 % der
 * Kachel). Sauber = 0 bis 3. Ab etwa 10 ist es mit blossem Auge zu sehen.
 *
 * NUTZUNG:
 *   node scripts/pruef-avatar-ausrisse.mjs [ordner]
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');
const dir = process.argv[2] || 'frontend/public/avatars/cozyquiz';
const slugs = fs.readdirSync(dir).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)).sort();
const rows = [];
for (const s of slugs) {
  const { data, info } = await sharp(`${dir}/${s}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const a = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) a[i] = data[i * C + 3];
  const OP = 200, TR = 40;
  const rowL = new Int32Array(H).fill(-1), rowR = new Int32Array(H).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a[y*W+x] >= OP) { if (rowL[y] < 0) rowL[y] = x; rowR[y] = x; }
  const colT = new Int32Array(W).fill(-1), colB = new Int32Array(W).fill(-1);
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (a[y*W+x] >= OP) { if (colT[x] < 0) colT[x] = y; colB[x] = y; }
  const innen = (x, y) => rowL[y] >= 0 && colT[x] >= 0 && x > rowL[y] && x < rowR[y] && y > colT[x] && y < colB[x];
  const seen = new Uint8Array(W * H);
  let klein = 0, gross = 0, kleinFlaeche = 0;
  const stack = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (seen[i] || a[i] > TR || !innen(x, y)) continue;
    let n = 0; stack.length = 0; stack.push(i); seen[i] = 1;
    while (stack.length) {
      const j = stack.pop(); n++;
      const jx = j % W, jy = (j - jx) / W;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = jx + dx, ny = jy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx;
        if (seen[k] || a[k] > TR || !innen(nx, ny)) continue;
        seen[k] = 1; stack.push(k);
      }
    }
    if (n < 400) { klein++; kleinFlaeche += n; } else gross++;
  }
  rows.push({ s, klein, gross, kleinFlaeche });
}
rows.sort((p, q) => q.klein - p.klein);
console.log('winzige  grosse  px    slug');
for (const r of rows) console.log(String(r.klein).padStart(7), String(r.gross).padStart(7), String(r.kleinFlaeche).padStart(6), r.s);
