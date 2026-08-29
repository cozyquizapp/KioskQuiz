/**
 * zwischenstand-probe.mjs — was verspricht die Zwischenstand-Folie?
 *
 * 2026-08-29, Wolf: „gerade zufaellig gefunden, diese seite kommt, obwohl
 * wager ausgestellt sind". Auf seinem Bild steht „Frage 5/5 · gleich kommt die
 * Tipp-Aufloesung!" - und die kommt dann nicht, weil der Final-Tipp im Wizard
 * aus ist. Die Folie hat also etwas versprochen, was der Abend nicht einloest.
 *
 * Die Ursache stand in einer Zeile: `isLastFinalQuestion = remaining === 0`,
 * ohne den Schalter zu lesen, der direkt daneben im Zustand liegt.
 *
 * ⚠️ STAND: die Probe erreicht die Folie NICHT. Die Station „zwischenstand"
 * im Harness endet inzwischen woanders - im Bild steht eine
 * Schaetzchen-Aufloesung, nicht der Zwischenstand. Der Schalter laesst sich
 * inzwischen sauber umlegen (`qq:setFinalWagerEnabled`, nicht
 * `qq:setQuizOptions` - das greift im laufenden Spiel nicht), und das Auslesen
 * ueber `textContent` statt `innerText` stimmt auch (der Satz ist
 * buchstabenweise in Spans zerlegt). Was fehlt, ist der WEG zur Folie.
 *
 * Damit ist die Aenderung im Bauteil bisher nur GELESEN, nicht gesehen. Wer
 * hier weitermacht, braucht zuerst eine Station, die im Zwischenstand der
 * Final-Phase stehen bleibt, statt eine Frage weiterzugehen.
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

const ZIEL = '.shots/zwischenstand';
fs.mkdirSync(ZIEL, { recursive: true });

// ⚠️ Der Weg zur Folie fuehrt im Harness ueber `final-bet`, und den gibt es
// nur MIT Final-Tipp. Eine Station „Zwischenstand ohne Tipp" existiert nicht.
// Statt eine zu bauen wird der Schalter UMGELEGT, waehrend die Folie steht:
// die Ansicht liest ihn aus dem Zustand, also muss sich der Satz aendern.
// Das prueft genau die geaenderte Zeile - mehr soll es hier auch nicht.
const b = await buehneStarten({ grossformat: false, entwurf: 'qq-vol-1', frisch: true, bots: 6, antworten: 0.6 });
await b.zurStation('zwischenstand');
await sleep(2600);

// ⚠️ `innerText` taugt hier nicht: der Satz ist buchstabenweise in eigene
// Spans zerlegt (Auftritts-Animation), und innerText schiebt Zeilenumbrueche
// dazwischen. `textContent` klebt ihn wieder zusammen.
const satzLesen = () => b.seite.evaluate(() => {
  for (const el of document.querySelectorAll('div')) {
    const t = (el.textContent || '').trim();
    if (/^Frage \d\/5 ·/.test(t) && t.length < 80) return t;
  }
  return '(kein Satz)';
});

for (const wager of [true, false]) {
  // ⚠️ Nicht ueber `qq:setQuizOptions` - im laufenden Spiel greift es hier
  // nicht (erster Anlauf: Schalter blieb beide Male true). Es gibt einen
  // eigenen Setzer, `qq:setFinalWagerEnabled`, und der ist auch der, den das
  // Steuerpult benutzt.
  await b.emit('qq:setFinalWagerEnabled', { enabled: wager });
  await sleep(1400);
  const name = wager ? 'mit-tipp' : 'ohne-tipp';
  await b.seite.screenshot({ path: `${ZIEL}/${name}.png` });
  console.log(`\n── ${name} · finalWagerEnabled=${b.helfer.zustand()?.finalWagerEnabled}`);
  console.log(`   „${await satzLesen()}"`);
}
await b.schliessen();
process.exit(0);
