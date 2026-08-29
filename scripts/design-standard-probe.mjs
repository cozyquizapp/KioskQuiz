/**
 * design-standard-probe.mjs — welches Design laeuft, wenn niemand eins waehlt?
 *
 * 2026-08-29, Wolf: „der schlichte modus ist in beamer cozy und crowd default
 * (und dann automatisch in /team auch)".
 *
 * Die Frage klingt nach einer Codestelle, ist aber eine Messung: das Design
 * kommt aus vier Quellen, die sich widersprechen koennen - der Raumanlage im
 * Server, dem Rueckfall im Broadcast, `themeIdForState` im Frontend und dem
 * Wizard, der beim Formatwechsel `qq:setTheme` schickt. Genau daran ist es am
 * 2026-08-28 schon einmal auseinandergelaufen: der Server legte Raeume mit
 * einem Wert an, die Broadcast-Bauer fielen auf einen anderen zurueck.
 *
 * Gemessen wird am Ergebnis, nicht am Code: das Akzent-Token der laufenden
 * Seite. Die Buehne fuehrt Creme (#F5ECD8), Cozy fuehrt Pink (#EC4899). Zwei
 * Werte, kein Auslegungsspielraum.
 *
 * ⚠️ Diese Probe misst den FRISCHEN Raum. Ein Raum, der seit vor dem 24.08. auf
 * Platte liegt, traegt sein altes `themeId` weiter - das ist Absicht (wer
 * damals „Cozy" gewaehlt hat, soll es behalten) und faellt hier deshalb nicht
 * auf. Wer das pruefen will, braucht einen alten `backend/.qq-rooms/*.json`.
 *
 * NUTZUNG: node scripts/design-standard-probe.mjs
 */
import { buehneStarten, sleep, BASE } from './lib/buehne.mjs';

const CREME = 'rgb(245, 236, 216)';
const ERWARTET = '#F5ECD8';

/** Liest das Akzent-Token und die Design-Id aus einer laufenden Seite. */
const ablesen = (seite) => seite.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  return {
    akzent: cs.getPropertyValue('--qq-accent').trim(),
    // ⚠️ Das Attribut heisst `data-scene-motion`, nicht `data-qq-look`. Der
    // erste Lauf meldete brav „look=null" in allen vier Zeilen - ein Feld, das
    // immer null sagt, ist keine Messung, sondern Ausstattung. Aufgefallen nur,
    // weil daneben das Akzent-Token stand und stimmte.
    szene:  document.documentElement.getAttribute('data-scene-motion'),
  };
});

let fehler = 0;
console.log(`\n${'─'.repeat(66)}`);
console.log('Welches Design laeuft ohne Wahl?   erwartet: Buehne (' + ERWARTET + ')');
console.log(`${'─'.repeat(66)}`);

for (const gross of [false, true]) {
  const name = gross ? 'CrowdQuiz' : 'CozyQuiz';
  const b = await buehneStarten({ bots: 4, frisch: true, takt: () => {}, entwurf: 'qq-vol-1', grossformat: gross });
  await b.zurStation('frage');
  await sleep(1200);

  const buehne = await ablesen(b.seite);
  const zustand = b.helfer.zustand();
  const okB = buehne.akzent.toUpperCase() === ERWARTET || buehne.akzent === CREME;
  if (!okB) fehler++;
  console.log(`\n  ${name}`);
  console.log(`    Beamer    ${okB ? '✓' : '✗'}  themeId=${zustand?.themeId ?? '(nicht gesetzt)'}  Akzent=${buehne.akzent}  Szene=${buehne.szene}`);

  // ── Und das Handy? Es liest denselben Zustand ueber denselben Weg. ────────
  // ⚠️ Ohne beigetretenes Team rendert /team nur die Anmeldung, setzt das
  // Design aber trotzdem: der Effekt haengt am Raum-Zustand, nicht am Team.
  const handy = await b.seite.context().newPage();
  await handy.setViewportSize({ width: 390, height: 844 });
  await handy.goto(`${BASE}/team?room=default`, { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  const t = await ablesen(handy);
  const okT = t.akzent.toUpperCase() === ERWARTET || t.akzent === CREME;
  if (!okT) fehler++;
  console.log(`    /team     ${okT ? '✓' : '✗'}  Akzent=${t.akzent}  Szene=${t.szene}`);
  await handy.close();
  await b.schliessen?.();
}

console.log(`\n  ${fehler === 0 ? 'Der schlichte Modus ist ueberall der Standard.' : fehler + ' Abweichung(en).'}`);
process.exit(fehler > 0 ? 1 : 0);
