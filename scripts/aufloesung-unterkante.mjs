/* aufloesung-unterkante — wird auf der Aufloesung unten etwas abgeschnitten?
 *
 * 2026-08-26 (Wolf, mit Bild einer MUCHO-Aufloesung): der Kasten unten mit
 * „Fakt oder Fiktion / richtig!" laeuft ueber die Unterkante, das Wort
 * „richtig!" ist halb weg.
 *
 * ⚠️ Verdacht auf eigene Ursache. Am selben Tag ist die Fragengroesse von
 * 77-84 auf 109-117 px gestiegen, und auf dem Bild steht die Frage auf zwei
 * Zeilen. Was oben waechst, drueckt unten hinaus.
 *
 * ⚠️⚠️ Und der bestehende Durchgang (schrift-durchgang.mjs) hat es NICHT
 * gemeldet. Zu Recht nach seiner eigenen Regel: er prueft, ob ein Element
 * ueber die Buehnenkante ragt oder ob ein Elternkasten scrollt. Hier passiert
 * etwas Drittes - ein Kind wird INNERHALB eines Elternteils mit
 * overflow:hidden abgeschnitten. Die Buehne bleibt sauber, das Bild nicht.
 * Genau diese Luecke schliesst dieses Werkzeug.
 *
 * Gemessen wird fuer jedes sichtbare Element mit Text: liegt seine Unterkante
 * tiefer als der sichtbare Bereich seines naechsten schneidenden Elternteils?
 * Das ist die Definition von „abgeschnitten", und sie braucht kein Auge.
 *
 * NUTZUNG:  node scripts/aufloesung-unterkante.mjs
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

const STATIONEN = ['frage', 'frage2', 'frage3', 'frage4', 'frage5', 'aufloesung', 'aufloesung2'];

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
fs.mkdirSync('.shots', { recursive: true });

const funde = [];

for (const st of STATIONEN) {
  try { await b.zurStation(st); await sleep(2600); }
  catch { console.log(`  ${st}: nicht erreichbar`); continue; }

  const abgeschnitten = await seite.evaluate(() => {
    const buehne = document.querySelector('[data-qq-buehne]');
    if (!buehne) return [];
    const raus = [];
    for (const el of buehne.querySelectorAll('*')) {
      const eigen = [...el.childNodes].filter(n => n.nodeType === 3)
        .map(n => n.textContent.trim()).join(' ').trim();
      if (!eigen || eigen.length < 2) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) continue;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || Number(s.opacity) < 0.2) continue;

      // Den naechsten Elternteil suchen, der ueberhaupt schneidet.
      let schneider = null;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (ps.overflow !== 'visible' || ps.overflowY !== 'visible' || ps.overflowX !== 'visible') { schneider = p; break; }
      }
      const grenze = schneider ? schneider.getBoundingClientRect() : buehne.getBoundingClientRect();
      const unten = Math.round(r.bottom - grenze.bottom);
      const oben = Math.round(grenze.top - r.top);
      const rechts = Math.round(r.right - grenze.right);
      const links = Math.round(grenze.left - r.left);
      const schlimmste = Math.max(unten, oben, rechts, links);
      // Zwei Bildpunkte Toleranz: Rundung und Unterlaengen der Schrift.
      if (schlimmste <= 2) continue;
      raus.push({
        text: eigen.slice(0, 34),
        px: Math.round(parseFloat(s.fontSize)),
        fehlt: schlimmste,
        wo: schlimmste === unten ? 'unten' : schlimmste === oben ? 'oben' : schlimmste === rechts ? 'rechts' : 'links',
        schneider: schneider ? `<${schneider.tagName.toLowerCase()}>` : 'Buehne',
      });
    }
    return raus.sort((a, z) => z.fehlt - a.fehlt);
  });

  console.log(`  ${abgeschnitten.length ? '✗' : '✓'} ${st.padEnd(12)} ${abgeschnitten.length} abgeschnitten`);
  for (const a of abgeschnitten.slice(0, 4)) {
    console.log(`      ${a.fehlt} px ${a.wo} raus (${a.px}px, in ${a.schneider})  „${a.text}"`);
  }
  if (abgeschnitten.length) {
    funde.push({ station: st, treffer: abgeschnitten });
    await seite.screenshot({ path: `.shots/ABGESCHNITTEN-${st}.png` });
  }
}

console.log('\n══ Urteil ══════════════════════════════════════════════════════');
console.log(funde.length === 0
  ? '  Nichts wird abgeschnitten.'
  : `  ${funde.length} Station(en): ${funde.map(f => f.station).join(', ')}`);

await b.schliessen?.();
process.exit(funde.length === 0 ? 0 : 1);
