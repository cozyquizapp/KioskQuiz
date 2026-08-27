/* ins-cockpit — kommt die Ankommen-Seite, wenn der Moderator „Ins Cockpit" drueckt?
 *
 * 2026-08-27, Wolf: „die prepage wird nicht immer durch ins cockpit getriggert
 * aus dem moderator" und, wichtiger: „erst nach reload erscheint es".
 *
 * ── Was der zweite Satz ausschliesst ──────────────────────────────────────
 * Wenn ein Reload der Buehne die Seite zeigt, dann steht der Wert auf dem
 * SERVER richtig. Der Klick ist also angekommen. Es fehlt die Uebertragung an
 * die laufende Buehne. Damit sind alle Erklaerungen raus, die am Steuerpult
 * oder an der Bedingung im Code haengen.
 *
 * ── Der Verdacht ──────────────────────────────────────────────────────────
 * Die Buehne betritt den Socket-Raum EINMAL, in einem Effekt, der nur an
 * `connected` haengt (QQBeamerPage.tsx). Verliert der Socket kurz die
 * Verbindung und ist sofort wieder da, kann React die beiden Zustands-
 * aenderungen (false, dann true) zusammenfassen - `connected` bleibt aus
 * Sicht des Effekts unveraendert, der Effekt laeuft nicht noch einmal, und
 * die Buehne betritt den Raum NIE wieder. Sie haengt dann an einem Socket,
 * der zwar verbunden ist, aber keine Rundrufe mehr bekommt. Kein Fehler, kein
 * Hinweis, nur ein Bild, das stehen bleibt - bis zum Reload.
 *
 * ── Wie hier geprueft wird ────────────────────────────────────────────────
 * Zwei Durchgaenge:
 *   1. ohne Stoerung           - kommt die Seite? (Grundlinie)
 *   2. nach einem Wiederverbinden der Buehne - kommt sie dann noch?
 * Gemessen wird die Kennung `data-qq-lobby-ansicht`, nicht der Text: die drei
 * Lobby-Ansichten sind sonst von aussen nicht auseinanderzuhalten.
 *
 * NUTZUNG:  node scripts/ins-cockpit.mjs
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const GEDULD = 8000;   // so lange darf ein Rundruf brauchen

const b = await buehneStarten({ bots: 0, frisch: true, takt: () => {}, entwurf: 'qq-vol-1' });
const seite = b.seite;

const ansicht = () => seite.evaluate(() =>
  document.querySelector('[data-qq-lobby-ansicht]')?.getAttribute('data-qq-lobby-ansicht') ?? null);

/** Wartet, bis die Kennung sich aendert. Gibt die Dauer zurueck, oder null. */
async function wartenAuf(ziel) {
  const t0 = Date.now();
  while (Date.now() - t0 < GEDULD) {
    if (await ansicht() === ziel) return Date.now() - t0;
    await sleep(150);
  }
  return null;
}

async function zurueckInDenWizard() {
  await b.emit('qq:setSetupDone', { value: false });
  await b.emit('qq:setLobbyOpen', { value: false });
  await sleep(800);
}

// Format waehlen, sonst steht die Buehne beim neutralen Welcome und „Ins
// Cockpit" waere gar nicht der naechste Schritt.
await b.emit('qq:setQuizOptions', { formatSelected: true });
await zurueckInDenWizard();

console.log('\n══ Durchgang 1: ohne Stoerung ══════════════════════════════════');
console.log('  vorher:', await ansicht());
await b.emit('qq:setSetupDone', { value: true });
const t1 = await wartenAuf('ankommen');
console.log(t1 !== null
  ? `  ✓ Ankommen-Seite nach ${t1} ms`
  : `  ✗ Nach ${GEDULD} ms immer noch: ${await ansicht()}`);

console.log('\n══ Durchgang 2: nach einem Wiederverbinden ═════════════════════');
await zurueckInDenWizard();
console.log('  vorher:', await ansicht());

// Die Buehne kurz vom Netz nehmen und sofort wieder dazu - genau der Fall,
// den ein schlafender Laptop, ein WLAN-Zucken oder ein Proxy-Timeout erzeugt.
// Ueber die Browser-Ebene, nicht ueber den Socket: so wie es an einem echten
// Abend passiert, nicht wie es sich im Code herbeirufen liesse.
await b.ctx.setOffline(true);
await sleep(1200);
await b.ctx.setOffline(false);
console.log('  Buehne war 1,2 s offline');
await sleep(5000);   // Socket.IO wartet 800 ms bis zum ersten neuen Versuch

await b.emit('qq:setSetupDone', { value: true });
const t2 = await wartenAuf('ankommen');
console.log(t2 !== null
  ? `  ✓ Ankommen-Seite nach ${t2} ms`
  : `  ✗ Nach ${GEDULD} ms immer noch: ${await ansicht()}`);

if (t2 === null) {
  await seite.reload({ waitUntil: 'domcontentloaded' });
  await sleep(4000);
  const nachReload = await ansicht();
  console.log(`  Nach einem Reload: ${nachReload}`
    + (nachReload === 'ankommen'
      ? '  <- genau Wolfs Satz: „erst nach reload erscheint es"'
      : ''));
}

console.log('\n══ Urteil ══════════════════════════════════════════════════════');
console.log(t1 !== null && t2 !== null
  ? '  ✓ Der Klick kommt in beiden Faellen an der Buehne an.'
  : '  ✗ Ein Rundruf erreicht die Buehne nicht mehr.');

await b.schliessen?.();
process.exit(t1 !== null && t2 !== null ? 0 : 1);
