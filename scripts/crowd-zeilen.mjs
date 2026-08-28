/* Wo sitzt die CrowdQuiz-Wertung heute, und passt sie ins Bild?
 * Gemessen in Buehnen-Pixeln (1760x990). LUFT 24 gegen Ueberscan. */
import { buehneStarten, sleep } from '/home/claude/kioskquiz/scripts/lib/buehne.mjs';
const st = process.argv[2] ?? 'zwischenstand';
const b = await buehneStarten({ bots: Number(process.argv[3] ?? 12), frisch: true, takt: () => {}, entwurf: 'qq-vol-1' });
await b.emit('qq:setQuizOptions', { largeGroupMode: true, nestedTeams: true, arenaBackgrounds: true });
// ⚠️ Das Design bleibt auf Platte stehen (backend/.qq-rooms). `frisch` setzt
// den Raum zurueck, nicht das Design - ein Lauf davor mit 'cozy' faerbt sonst
// den naechsten. Immer ausdruecklich setzen.
await b.emit('qq:setTheme', { themeId: process.env.QQ_THEME || 'buehne' });
await sleep(600);
await b.zurStation(st);
await sleep(6000);
const r = await b.seite.evaluate(() => {
  const buehne = document.querySelector('[data-qq-buehne]') ?? document.body;
  const br = buehne.getBoundingClientRect();
  const s = br.height / 990;
  const y = (px) => Math.round((px - br.top) / s);
  const x = (px) => Math.round((px - br.left) / s);
  const zeilen = [];
  for (const el of Array.from(buehne.querySelectorAll('*'))) {
    if (!(el instanceof HTMLElement)) continue;
    const cs = getComputedStyle(el);
    if (cs.position !== 'absolute') continue;
    const rr = el.getBoundingClientRect();
    if (rr.height / s < 40 || rr.width / s < 400) continue;
    zeilen.push({ oben: y(rr.top), unten: y(rr.bottom), links: x(rr.left), rechts: x(rr.right),
      h: Math.round(rr.height / s),
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34) });
  }
  zeilen.sort((a, c) => a.oben - c.oben);
  return { zeilen, hoehe: Math.round(br.height / s) };
});
console.log(`\n══ ${st}: absolut gesetzte Baender (Buehnen-Pixel) ══════════════`);
for (const z of r.zeilen) {
  const flag = z.unten > 990 - 24 ? '  ✗ UEBER DIE KANTE' : '';
  console.log(`  y ${String(z.oben).padStart(4)}..${String(z.unten).padStart(4)} (h ${String(z.h).padStart(3)})  x ${String(z.links).padStart(4)}..${String(z.rechts).padStart(4)}  „${z.text}"${flag}`);
}
await b.schliessen?.();
