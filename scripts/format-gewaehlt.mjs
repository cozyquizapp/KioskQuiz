/* format-gewaehlt — merkt sich der Raum, dass ein Format gewaehlt wurde?
 *
 * 2026-08-27, Wolf: „die prepage wird nicht immer durch ins cockpit getriggert
 * aus dem moderator" ... „erst nach reload erscheint es".
 *
 * ── Warum das NICHT am Cockpit-Knopf liegt ────────────────────────────────
 * Der Knopf setzt `setupDone`. Die Buehne entscheidet danach so:
 *
 *     setupDone && lobbyOpen !== false  -> QR-Lobby
 *     formatSelected === false          -> neutraler Welcome
 *     sonst                             -> Ankommen
 *
 * Mit `formatSelected === false` fuehrt „Ins Cockpit" also in den NEUTRALEN
 * Welcome, nicht ins Ankommen. Die Ankommen-Seite ist in diesem Zustand
 * ueberhaupt nicht erreichbar. Der Knopf ist unschuldig; der Wert davor stimmt
 * nicht.
 *
 * ── Und warum steht er manchmal falsch ────────────────────────────────────
 * Im Wizard (QQSetupFlow.tsx):
 *
 *     const setFormat = (ar) => {
 *       if (arena === ar) return;          // <- hier ist Schluss
 *       ...
 *       emit('qq:setQuizOptions', { ..., formatSelected: true });
 *
 * `arena` kommt aus `largeGroupMode` und ist auf einem frischen Raum FALSE.
 * Wer also CozyQuiz waehlt - das ist `ar = false`, der Normalfall - trifft
 * genau diese Abkuerzung. Es wird nichts gesendet, `formatSelected` bleibt
 * false, und die Buehne bleibt beim neutralen Welcome. Wer CozyArena waehlt,
 * hat das Problem nie.
 *
 * Der Reload erklaert sich mit derselben Zeile: beim Aufbau des Steuerpults
 * laeuft eine Wiederherstellung, die `qqLastFormat` aus dem Browser liest und
 * dann `formatSelected: true` sendet (QQModeratorPage.tsx). Sie holt nach, was
 * der Klick nicht getan hat. Deshalb „erst nach reload".
 *
 * ⚠️ Die Abkuerzung war nicht sinnlos: sie verhindert eine Rueckfrage und ein
 * Zuruecksetzen der Teams, wenn sich am Format nichts aendert. Nur vermischt
 * sie zwei Dinge - „das Format ist ein anderes" und „es wurde ueberhaupt eins
 * gewaehlt". Das zweite muss immer ankommen.
 *
 * NUTZUNG:  node scripts/format-gewaehlt.mjs
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const b = await buehneStarten({ bots: 0, frisch: true, takt: () => {}, entwurf: 'qq-vol-1' });
const seite = b.seite;

const ansicht = () => seite.evaluate(() =>
  document.querySelector('[data-qq-lobby-ansicht]')?.getAttribute('data-qq-lobby-ansicht') ?? null);

// Der Raum muss wirklich vor der Format-Wahl stehen.
await b.emit('qq:setSetupDone', { value: false });
await b.emit('qq:setLobbyOpen', { value: false });
await sleep(800);
console.log('\n══ Ausgangslage ════════════════════════════════════════════════');
console.log('  formatSelected:', b.helfer.zustand()?.formatSelected);
console.log('  Buehne zeigt  :', await ansicht());

// Steuerpult in demselben Browser oeffnen, wie an einem echten Abend.
const pult = await b.ctx.newPage();
await pult.goto(`http://localhost:5173/moderator?room=${b.roomCode}`, { waitUntil: 'domcontentloaded' });
await sleep(3500);

// ⚠️ Der Wiederhersteller im Steuerpult liest `qqLastFormat` aus dem Browser
// und sendet dann von sich aus `formatSelected: true`. Das ist genau der Weg,
// der den Fehler beim Reload verdeckt. Fuer die Messung muss der Eintrag weg,
// sonst prueft man die Wiederherstellung statt des Klicks.
await pult.evaluate(() => { try { window.localStorage.removeItem('qqLastFormat'); } catch { /* egal */ } });
await pult.reload({ waitUntil: 'domcontentloaded' });
await sleep(3500);

const knopf = pult.locator('button', { hasText: 'CozyQuiz' }).first();
const da = await knopf.count();
if (!da) {
  console.log('\n  Der Format-Schritt ist nicht offen. Steuerpult steht woanders.');
  await b.schliessen?.(); process.exit(1);
}
console.log('\n══ Klick auf „CozyQuiz" (der Normalfall) ═══════════════════════');
await knopf.click();
await sleep(2500);

const nachKlick = b.helfer.zustand()?.formatSelected;
const bildNachKlick = await ansicht();
console.log('  formatSelected:', nachKlick);
console.log('  Buehne zeigt  :', bildNachKlick);

// Und jetzt der Knopf, um den es Wolf ging.
await b.emit('qq:setSetupDone', { value: true });
await sleep(2000);
const bildNachCockpit = await ansicht();
console.log('\n══ Danach „Ins Cockpit" ════════════════════════════════════════');
console.log('  Buehne zeigt  :', bildNachCockpit);

console.log('\n══ Urteil ══════════════════════════════════════════════════════');
const ok = nachKlick === true && bildNachCockpit === 'ankommen';
console.log(ok
  ? '  ✓ Die Format-Wahl kommt an, und „Ins Cockpit" fuehrt ins Ankommen.'
  : '  ✗ Die Format-Wahl kam NICHT an.'
    + `\n    formatSelected steht auf ${nachKlick}, die Buehne auf „${bildNachCockpit}".`
    + '\n    Genau das meldet Wolf: die Ankommen-Seite kommt nicht.');

await b.schliessen?.();
process.exit(ok ? 0 : 1);
