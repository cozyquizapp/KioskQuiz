/**
 * mobilregel-nebenwirkung.mjs — was die Mobil-Regel ausserhalb von /team tut.
 *
 * 2026-08-29, die Team-Sitzung hat in main.css unter @media (max-width: 639px)
 * `button { min-height: 40px !important }` auf 44 gehoben (WCAG 2.5.5) und
 * `input { font-size: 14px !important }` auf 16 (iOS Safari zoomt sonst beim
 * Antippen von selbst hinein). Beide Regeln sind NICHT auf /team gescoped.
 *
 * Sie haben die Eingabefelder ueber elf Routen gemessen. Was dabei offen bleibt,
 * ist die KNOPF-Regel auf den Routen dieser Sitzung: das Steuerpult ist dicht
 * bepackt, und 4 px mehr je Knopfreihe koennen dort umbrechen.
 *
 * Also gemessen statt geglaubt: einmal mit 40, einmal mit 44, jeweils
 * Querlauf und Seitenhoehe. Die Buehne laeuft fix auf 1760x990 und faellt gar
 * nicht unter die Regel - sie steht hier nur als Gegenprobe mit drin.
 */
import { chromium } from 'playwright';

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
const ROUTEN = ['/moderator-test', '/beamer'];
const BREITEN = [390, 1760];

const browser = await chromium.launch({ args: ['--no-sandbox'] });

for (const breite of BREITEN) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } });
  const seite = await ctx.newPage();
  for (const route of ROUTEN) {
    await seite.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    // ⚠️ Nicht blind warten. Der erste Aufruf nach einem kalten Dev-Server
    // braucht laenger als 2,5 s, und der erste Anlauf hat deshalb bei 390 px
    // „0 Knoepfe" gemeldet - eine Messung, die nach Entwarnung aussieht und in
    // Wahrheit gar nichts gemessen hat. Auf das Steuerpult warten wir also,
    // die Buehne hat legitim keine Knoepfe.
    if (route !== '/beamer') await seite.waitForSelector('button', { timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2500));
    const mess = async () => seite.evaluate(() => ({
      quer: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      hoehe: document.documentElement.scrollHeight,
      knoepfe: document.querySelectorAll('button').length,
      // Knoepfe, die die Regel ueberhaupt anhebt (unter 44 hoch waeren)
      klein: [...document.querySelectorAll('button')]
        .filter(b => b.getBoundingClientRect().height < 44).length,
    }));
    const vorher = await mess();
    await seite.addStyleTag({ content: '@media (max-width: 639px){ button { min-height: 44px !important } input[type="text"],input[type="number"],input[placeholder]{ font-size:16px !important } }' });
    await new Promise(r => setTimeout(r, 400));
    const nachher = await mess();
    const gleich = vorher.quer === nachher.quer;
    console.log(
      `${String(breite).padStart(4)}px ${route.padEnd(16)} ` +
      `Knoepfe ${String(nachher.knoepfe).padStart(3)}, davon unter 44px: ${vorher.klein} -> ${nachher.klein} · ` +
      `Querlauf ${vorher.quer} -> ${nachher.quer} ${gleich ? '✓' : '⚠️ NEU'} · ` +
      `Hoehe ${vorher.hoehe} -> ${nachher.hoehe}`,
    );
  }
  await ctx.close();
}
await browser.close();
process.exit(0);
