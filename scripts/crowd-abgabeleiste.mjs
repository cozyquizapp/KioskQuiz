/**
 * crowd-abgabeleiste.mjs — die Leiste unter der Frage nachmessen.
 *
 * 2026-08-29, Wolf am Kontaktbogen: „bei: wie viele knochen hat ein
 * erwachsener mensch sieht man unten die kacheln aber das gruen umrahmt sie
 * nicht schoen, als bestaetigung, dass getippt wurde, es sieht buggy aus".
 *
 * Zwei Verdachte, und sie sind verschieden:
 *   1. FORM. Der Bestaetigungsrand koennte einen anderen Eckenradius haben als
 *      die Kachel darin - derselbe Fall wie im Schaetzchen-Reveal, wo ein
 *      Kreis um ein Quadrat lag.
 *   2. PLATZ. Auf dem Bild sitzen die Zaehler-Plaketten am unteren Bildrand und
 *      wirken angeschnitten. Die Buehne bekommt nie eine Scrollbar, also faellt
 *      alles unter 990 px einfach weg.
 *
 * Statt zu schielen: jede Kachel der Leiste ausmessen und beides nebeneinander
 * ausgeben. Was gemessen ist, muss ich nicht glauben.
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const b = await buehneStarten({
  bots: 12, frisch: true, takt: () => {}, entwurf: 'qq-vol-1', grossformat: true,
});
await b.emit('qq:setTheme', { themeId: 'buehne' });
await sleep(600);
await b.zurStation('frage');
await sleep(2800);

const befund = await b.seite.evaluate(() => {
  const buehne = document.querySelector('[data-qq-buehne]');
  const br = buehne.getBoundingClientRect();
  const s = br.height / 990;
  const y = (px) => Math.round((px - br.top) / s);

  // Die Leiste finden: die Teammarken, die am tiefsten im Bild sitzen.
  const marken = Array.from(document.querySelectorAll('.qq-team-mark'))
    .map(el => ({ el, r: el.getBoundingClientRect() }))
    .filter(x => x.r.width > 10)
    .sort((a, b2) => b2.r.top - a.r.top);
  if (!marken.length) return { fehler: 'keine Teammarken gefunden' };
  const tiefste = marken[0].r.top;
  const leiste = marken.filter(x => Math.abs(x.r.top - tiefste) < 30);

  const zeilen = leiste.map(({ el, r }) => {
    const cs = getComputedStyle(el);
    const eltern = el.parentElement;
    const ecs = eltern ? getComputedStyle(eltern) : null;
    const er = eltern ? eltern.getBoundingClientRect() : r;
    return {
      kachelRadius: cs.borderRadius,
      randRadius: ecs?.borderRadius ?? '-',
      randFarbe: ecs?.outlineColor && ecs.outlineStyle !== 'none' ? ecs.outlineColor : (ecs?.borderColor ?? '-'),
      randBreite: ecs?.borderWidth ?? '-',
      schatten: (ecs?.boxShadow ?? '').slice(0, 60),
      oben: y(r.top), unten: y(r.bottom),
      elternUnten: y(er.bottom),
    };
  });

  // Was ragt unter die Buehnenkante?
  const unterKante = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    if (r.bottom > br.bottom + 1 && r.top < br.bottom) {
      const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 20);
      const kette = [];
      let p2 = el;
      for (let i = 0; i < 3 && p2; i++) { kette.push(p2.tagName.toLowerCase() + (p2.className && typeof p2.className === 'string' ? '.' + p2.className.split(' ')[0] : '')); p2 = p2.parentElement; }
      unterKante.push({
        tag: el.tagName.toLowerCase(), t,
        klasse: (typeof el.className === 'string' ? el.className : '').slice(0, 40),
        kette: kette.join(' < '),
        groesse: Math.round(r.width / s) + 'x' + Math.round(r.height / s),
        oben: y(r.top),
        ueber: Math.round((r.bottom - br.bottom) / s),
      });
    }
  }
  return { zeilen, unterKante: unterKante.slice(0, 8), buehneUnten: y(br.bottom) };
});

console.log('\n  Buehnenunterkante bei y', befund.buehneUnten);
if (befund.fehler) { console.log('  ' + befund.fehler); }
else {
  console.log(`\n  ${befund.zeilen.length} Kacheln in der Abgabeleiste:\n`);
  console.log('    Kachel-Radius        Rand-Radius          Rand              y oben/unten');
  for (const z of befund.zeilen) {
    console.log(`    ${z.kachelRadius.padEnd(20)} ${String(z.randRadius).padEnd(20)} ${String(z.randBreite + ' ' + z.randFarbe).padEnd(17)} ${z.oben}/${z.unten}`);
  }
  const ungleich = befund.zeilen.filter(z => z.kachelRadius !== z.randRadius);
  console.log(`\n  Rand und Kachel verschieden gerundet: ${ungleich.length} von ${befund.zeilen.length}`);
  console.log(`  Ragt unter die Buehnenkante: ${befund.unterKante.length} Elemente`);
  for (const u of befund.unterKante) {
    console.log(`      ${u.groesse.padEnd(10)} oben y${String(u.oben).padStart(4)}  ${u.ueber}px darunter   ${u.kette}`);
  }
}
await b.seite.screenshot({ path: '.shots/crowd-abgabeleiste.png' });
await b.schliessen?.();
process.exit(0);
