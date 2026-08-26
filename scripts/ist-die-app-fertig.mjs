/* ist-die-app-fertig — EIN Befehl, der den ganzen Abend prueft und danach
 * einen Satz sagt.
 *
 * 2026-08-26 (Wolf: „Ich brauche nach allen to dos ein werkzeug dass schauen
 * kann, ob meine app fertig ist.").
 *
 * ⚠️ ENTWURF, noch nie gelaufen. Wolf direkt danach: „Ne werkzeug ist fuer am
 * ende." Das Ding liegt hier, bis alle anderen To-dos durch sind - erst dann
 * wird es einmal ausprobiert und scharf gestellt. Wer es vorher startet,
 * bekommt womoeglich Fehlalarme, weil kein einziger Zweig je gelaufen ist.
 *
 * ── Warum es das braucht ───────────────────────────────────────────────────
 * In scripts/ liegen inzwischen fuenfzehn Messwerkzeuge, und jedes misst einen
 * Ausschnitt: den Wechsel zur Danke-Folie, den Sprung der Tuerme, die Leere
 * zwischen zwei Szenen. Alle zusammen beantworten Wolfs Frage - aber niemand
 * faehrt fuenfzehn Werkzeuge ab, bevor er in eine Bar faehrt. Deshalb hier
 * eines, das die anderen zusammenfasst und am Ende NICHT Zahlen ausgibt,
 * sondern ein Urteil.
 *
 * ── Was „fertig" heisst ────────────────────────────────────────────────────
 * Nicht „schoen". Schoen beurteilt Wolf, und das kann kein Programm. Geprueft
 * wird, was pruefbar ist und was in dieser Uebergabe jedes Mal wieder Zeit
 * gekostet hat:
 *
 *   1. Das Gate  - Typen, Tests, Lint-FEHLER. Das laeuft auch in CI.
 *   2. Die Buehne - jede Station: laeuft sie ueber (der Beamer bekommt nie
 *      eine Scrollbar), steht ueberhaupt etwas darauf, ist das Bild schwarz.
 *   3. Zweisprachig - deutsche Strings ohne englischen Zweig.
 *   4. Die Fassungen - faehrt der Server dieselbe Fassung wie die Buehne?
 *      Genau das hat am 2026-08-25 einen halben Tag gekostet.
 *   5. Die Liste - wie viele Punkte stehen in todo.md noch offen.
 *
 * ⚠️ Ein gruener Durchlauf heisst „nichts Messbares kaputt", nicht „gut".
 * Das steht am Ende auch so da, damit niemand die Zahl mit Qualitaet
 * verwechselt.
 *
 * NUTZUNG:
 *   node scripts/ist-die-app-fertig.mjs           # alles
 *   node scripts/ist-die-app-fertig.mjs --schnell # ohne Buehnen-Durchgang
 *   node scripts/ist-die-app-fertig.mjs --prod    # zusaetzlich gegen den Live-Server
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep, stationsNamen } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const SCHNELL = process.argv.includes('--schnell');
const PROD = process.argv.includes('--prod');
const PROD_URL = 'https://backend.cozyquiz.app/api/health';

/** Ein Befund. `schwer` heisst: damit faehrt man nicht in die Bar. */
const befunde = [];
const notiere = (punkt, ok, satz, schwer = true) => {
  befunde.push({ punkt, ok, satz, schwer });
  const zeichen = ok ? '✓' : (schwer ? '✗' : '!');
  console.log(`  ${zeichen} ${punkt.padEnd(22)} ${satz}`);
};

console.log('\n══ Ist die App fertig? ════════════════════════════════════════\n');

// ── 1. Das Gate ────────────────────────────────────────────────────────────
console.log('Das Gate (Typen, Tests, Lint)');
for (const [name, befehl] of [
  ['Typen', 'npm run typecheck'],
  ['Tests', 'npm test'],
  ['Lint', 'npm run lint'],
]) {
  try {
    const aus = execSync(befehl, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const tests = /Tests\s+(\d+) passed/.exec(aus);
    notiere(name, true, tests ? `${tests[1]} Tests gruen` : 'sauber');
  } catch (e) {
    const text = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    // Lint-WARNUNGEN blockieren nicht (CLAUDE.md), Fehler schon.
    const fehler = /(\d+) errors?/.exec(text);
    const nurWarnungen = name === 'Lint' && fehler && fehler[1] === '0';
    if (nurWarnungen) { notiere(name, true, 'nur Warnungen, keine Fehler'); continue; }
    const erste = text.split('\n').filter(z => /error/i.test(z)).slice(0, 2).join(' | ');
    notiere(name, false, erste.slice(0, 120) || 'faellt durch');
  }
}

// ── 2. Die Fassungen ───────────────────────────────────────────────────────
console.log('\nDie Fassungen');
let kopf = '(unbekannt)';
try {
  kopf = execSync('git rev-parse --short=8 HEAD', { encoding: 'utf8' }).trim();
  const schmutz = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  notiere('Arbeitsstand', schmutz === '', schmutz === ''
    ? `alles eingecheckt, HEAD ${kopf}`
    : `${schmutz.split('\n').length} Datei(en) nicht eingecheckt`, false);
  const lokal = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const fern = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
  notiere('Gepusht', lokal === fern, lokal === fern
    ? 'main ist auf demselben Stand'
    : 'main auf dem Server ist ein anderer Stand');
} catch { notiere('Arbeitsstand', false, 'git nicht lesbar', false); }

if (PROD) {
  try {
    const antwort = await fetch(PROD_URL, { signal: AbortSignal.timeout(9000) }).then(r => r.json());
    const serverBuild = antwort?.build ?? '(kein Feld build)';
    notiere('Server live', serverBuild === kopf, serverBuild === kopf
      ? `Server faehrt ${serverBuild}, wie hier`
      : `Server faehrt ${serverBuild}, hier steht ${kopf} — Backend-Redeploy in Coolify faellig`);
  } catch (e) {
    notiere('Server live', false, `nicht erreichbar (${String(e.message).slice(0, 50)})`, false);
  }
} else {
  console.log('    (Live-Server nicht geprueft, dafuer --prod)');
}

// ── 3. Zweisprachig ────────────────────────────────────────────────────────
console.log('\nZweisprachig');
try {
  const aus = execSync('node scripts/audit-i18n.mjs', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const treffer = (aus.match(/^\s*\S+\.tsx:\d+/gm) ?? []).length;
  notiere('DE ohne EN', treffer === 0, treffer === 0
    ? 'keine deutschen Strings ohne englischen Zweig'
    : `${treffer} Fundstellen (die Heuristik hat Fehlalarme, siehe Kopf des Audits)`, false);
} catch (e) {
  const text = `${e.stdout ?? ''}`;
  const treffer = (text.match(/^\s*\S+\.tsx:\d+/gm) ?? []).length;
  notiere('DE ohne EN', treffer === 0, treffer ? `${treffer} Fundstellen` : 'Audit lief nicht durch', false);
}

// ── 4. Die Buehne ──────────────────────────────────────────────────────────
if (SCHNELL) {
  console.log('\nDie Buehne\n    (uebersprungen, --schnell)');
} else {
  console.log('\nDie Buehne (jede Station)');
  const stationen = stationsNamen();
  let b = null;
  try {
    b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
  } catch (e) {
    notiere('Durchgang', false, `Buehne startet nicht: ${String(e.message).slice(0, 70)}`);
  }
  if (b) {
    const h = b.helfer ?? b;
    const seite = h.seite();
    const kaputt = [];
    let geprueft = 0;
    for (const st of stationen) {
      try {
        await b.zurStation(st);
        await sleep(1800);
        const lage = await seite.evaluate(() => {
          const d = document.documentElement;
          const buehne = document.querySelector('[data-qq-buehne]');
          return {
            ueberBreit: d.scrollWidth - d.clientWidth,
            ueberHoch: d.scrollHeight - d.clientHeight,
            zeichen: (buehne?.textContent ?? document.body.textContent ?? '').replace(/\s+/g, '').length,
          };
        });
        // Ist ueberhaupt Licht auf der Leinwand? Ein DOM voller Kaesten sagt
        // das nicht - waehrend eines Szenenwechsels ist es vollstaendig und
        // die Wand trotzdem schwarz. Deshalb Bildpunkte.
        const roh = await seite.screenshot({ type: 'jpeg', quality: 60 });
        const stat = await sharp(roh).greyscale().stats();
        const hell = stat.channels[0].mean;
        geprueft++;
        if (lage.ueberBreit > 1 || lage.ueberHoch > 1) {
          kaputt.push(`${st}: laeuft ueber (${lage.ueberBreit}x${lage.ueberHoch} px) — der Beamer bekommt eine Scrollbar`);
        } else if (lage.zeichen < 3) {
          kaputt.push(`${st}: kein Text auf der Buehne`);
        } else if (hell < 3) {
          kaputt.push(`${st}: Bild praktisch schwarz (mittlere Helligkeit ${hell.toFixed(1)})`);
        }
      } catch (e) {
        kaputt.push(`${st}: nicht erreichbar (${String(e.message).slice(0, 50)})`);
      }
    }
    notiere('Durchgang', kaputt.length === 0, kaputt.length === 0
      ? `${geprueft} Stationen, keine Scrollbar, kein leeres Bild`
      : `${kaputt.length} von ${stationen.length} Stationen auffaellig`);
    for (const k of kaputt) console.log(`      ${k}`);
    await b.schliessen?.();
  }
}

// ── 5. Die Liste ───────────────────────────────────────────────────────────
console.log('\nDie Liste');
try {
  const todo = fs.readFileSync('todo.md', 'utf8');
  const offen = (todo.match(/^\s*- \[ \]/gm) ?? []).length;
  notiere('todo.md', offen === 0, offen === 0 ? 'nichts offen' : `${offen} Punkte offen`, false);
} catch { notiere('todo.md', false, 'nicht lesbar', false); }

// ── Das Urteil ─────────────────────────────────────────────────────────────
const schwerRot = befunde.filter(b => !b.ok && b.schwer);
const leichtRot = befunde.filter(b => !b.ok && !b.schwer);
console.log('\n══ Urteil ═════════════════════════════════════════════════════');
if (schwerRot.length === 0) {
  console.log('  Nichts Messbares ist kaputt. Die App laeuft durch.');
  if (leichtRot.length) {
    console.log(`  ${leichtRot.length} Hinweis(e), nichts davon haelt einen Abend auf:`);
    for (const b of leichtRot) console.log(`    · ${b.punkt}: ${b.satz}`);
  }
} else {
  console.log(`  NEIN. ${schwerRot.length} Punkt(e) muessen vorher weg:`);
  for (const b of schwerRot) console.log(`    · ${b.punkt}: ${b.satz}`);
}
console.log('\n  ⚠️ Gruen heisst „nichts Messbares kaputt", nicht „gut". Ob eine');
console.log('     Folie auf 2,8 Metern etwas taugt, sieht nur ein Mensch.');
console.log('');
process.exit(schwerRot.length === 0 ? 0 : 1);
