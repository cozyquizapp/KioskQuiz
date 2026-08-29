/**
 * testmodus-probe.mjs — wird dieser Abend gespeichert?
 *
 * 2026-08-29, Wolf: „aber ich habe gerade mit einem team durchgespielt, das kam
 * nicht an", kurz darauf „ich glaube der testmodus war immer an ehrlich
 * gesagt" und „ah bot war an auch ohne bots im game".
 *
 * Der Testmodus merkt sich seit dem 08.07. pro GERAET, ob er an ist
 * (localStorage). Er blieb also an, und `persistGameResult` sprang still ab.
 * Der letzte gespeicherte Abend war vom 04.07. - vier Tage davor. Zwei Monate
 * ohne einen einzigen echten Abend in der Datenbank, ohne Fehler, ohne Meldung.
 *
 * Seit heute entscheidet der INHALT statt des Schalters: uebersprungen wird
 * nur, wenn nach dem Dummy-Filter nichts uebrig ist. Diese Probe faehrt beide
 * Faelle und liest mit, was der Server dazu sagt.
 *
 * ⚠️ WAS SIE NICHT ZEIGT: ob der Eintrag wirklich in Mongo landet. Hier laeuft
 * keine Datenbank (`saveQQGameResult` faengt den Fehler ab und loggt SAVE
 * FAILED). Geprueft wird die ENTSCHEIDUNG - speichern oder nicht -, und genau
 * die war der Fehler. Der Rest ist der Weg, den es seit Mai gibt.
 *
 * ⚠️ Braucht ein Backend, dessen Ausgabe in einer Datei landet:
 *     setsid nohup npm run start:backend > backend.log 2>&1 < /dev/null &
 *     QQ_LOG=backend.log node scripts/testmodus-probe.mjs
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

const LOG = process.env.QQ_LOG;
if (!LOG || !fs.existsSync(LOG)) {
  console.error('Kein Server-Log. QQ_LOG=<pfad> setzen, siehe Kopf der Datei.');
  process.exit(2);
}

/** Was hat der Server seit Marke X ueber das Speichern gesagt? */
function neueZeilen(ab) {
  const alles = fs.readFileSync(LOG, 'utf8');
  return alles.slice(ab).split('\n').filter(z => z.includes('[QQGameResult]'));
}

async function lauf({ name, echtesTeam, erwartet }) {
  const marke = fs.statSync(LOG).size;
  const b = await buehneStarten({ bots: 4, frisch: true, takt: () => {}, entwurf: 'qq-vol-1' });

  // ⚠️ Der Testmodus ist der ganze Punkt: er steht in BEIDEN Laeufen auf an.
  // Frueher hiess das „wird nicht gespeichert", egal wer gespielt hat.
  await b.emit('qq:setTestMode', { value: true });

  if (echtesTeam) {
    // Ein Team, das ueber den normalen Weg beitritt, traegt KEIN `_dummy`.
    // Genau das unterscheidet Wolfs Abend von einem Botlauf.
    await b.emit('qq:joinTeam', { teamId: 'echt-1', teamName: 'Wolfs Testteam', avatarId: 'raccoon' });
    await sleep(600);
  }

  await b.zurStation('spielende');
  await sleep(2500);
  await b.schliessen?.();

  const zeilen = neueZeilen(marke);
  const getroffen = zeilen.some(z => z.includes(erwartet));
  console.log(`\n── ${name}`);
  console.log(`   Testmodus an, ${echtesTeam ? 'ein echtes Team' : 'nur Bots'}`);
  for (const z of zeilen) console.log(`   ${z.trim().slice(0, 150)}`);
  if (!zeilen.length) console.log('   (der Server hat nichts dazu gesagt)');
  console.log(`   ${getroffen ? '✓' : '✗'} erwartet: „${erwartet}"`);
  return getroffen;
}

const a = await lauf({
  name: 'Botlauf - soll NICHT gespeichert werden',
  echtesTeam: false,
  erwartet: 'UEBERSPRUNGEN',
});
const b = await lauf({
  name: 'Echtes Team - soll gespeichert werden, trotz Testmodus',
  echtesTeam: true,
  erwartet: 'wird gespeichert',
});

console.log(`\n  ${a && b ? 'Beide Faelle stimmen.' : 'MINDESTENS EIN FALL STIMMT NICHT.'}`);
process.exit(a && b ? 0 : 1);
