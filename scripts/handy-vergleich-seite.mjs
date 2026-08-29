/* handy-vergleich-seite — die Vorher/Nachher-Seite fuer Wolf bauen.
 *
 * 2026-08-29, Wolf: „zeig mir gerne mal vorher nacher? dann ueberpruefe ich
 * einmal, dass nichts „kaputt" geht?"
 *
 * Liest die Paare, die scripts/handy-vorher-nachher.mjs geknipst hat, und
 * baut daraus eine Seite mit Wischregler. Die Bilder liegen als data:-URI
 * darin, damit die Seite eine einzige Datei ist und ohne den Ordner
 * funktioniert.
 *
 * ⚠️ Warum ein Skript und keine handgeschriebene Datei: die erste Fassung war
 * eine Wegwerf-Datei im Arbeitsverzeichnis. Beim naechsten Durchgang war sie
 * geloescht und die halbe Seite musste neu geschrieben werden - fuer etwas,
 * das nach jeder Aenderung wieder gebraucht wird.
 *
 * VORAUSSETZUNG: `node scripts/handy-vorher-nachher.mjs` ist gelaufen.
 * NUTZUNG: node scripts/handy-vergleich-seite.mjs [ziel.html]
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';

const ZIEL = process.argv[2] ?? '.shots/vergleich/SEITE.html';
const DIR = '.shots/vergleich';
if (!existsSync(`${DIR}/PAARE.json`)) {
  console.error(`Keine Paare. Erst laufen lassen:\n  node scripts/handy-vorher-nachher.mjs`);
  process.exit(1);
}
const paare = JSON.parse(readFileSync(`${DIR}/PAARE.json`, 'utf8'));

/* Die Bilder klein rechnen. Ein Handy-Schuss ist 780x1688, davon sind die
 * unteren 500 px leerer Grund - und vierzehn PNG in voller Groesse sprengen
 * jede Seite (gemessen: 12,4 MB roh, mit Base64 ueber 16 MB). Auf den
 * Inhaltsbereich beschnitten und als JPEG sind es unter 1 MB. */
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');
const bild = async (pfad) => {
  const buf = await sharp(pfad)
    .extract({ left: 0, top: 0, width: 780, height: 1180 })
    .resize({ width: 620 })
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    .toBuffer();
  return 'data:image/jpeg;base64,' + buf.toString('base64');
};

const NAME = {
  SETUP: 'Beitreten', LOBBY: 'Lobby', RULES: 'Regeln', MENUE: 'Menue',
  TEAMS_REVEAL: 'Team-Vorstellung', PHASE_INTRO: 'Runden-Intro',
  QUESTION_ACTIVE: 'Frage laeuft', QUESTION_REVEAL: 'Aufloesung',
  PLACEMENT: 'Setzen', PAUSED: 'Pause', GAME_OVER: 'Spielende',
};

/* Die Leiter. Kontraste gerechnet, nicht getippt - gegen den gemessenen Grund
 * des Handys (#0F0817). */
const GRUND = '#0F0817';
const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const leuchte = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => lin(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const kontrast = (a, b) => {
  const x = leuchte(a), y = leuchte(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const LEITER = [
  ['Tinte', 'Reinweiss + Slate-100', '#ffffff', '#F3EFE7'],
  ['Fliesstext', 'Slate-200', '#e2e8f0', '#EBE7E2'],
  ['Sekundaer', 'Slate-300', '#cbd5e1', '#D7D2D7'],
  ['Beschriftung', 'Slate-400', '#94a3b8', '#B9B3C6'],
  ['Leise', 'Slate-500', '#64748b', '#7B7588'],
  ['Dunkel-leise', 'Slate-600', '#475569', '#5E596C'],
  ['Kartenrand', 'Slate-700', '#334155', '#4C4759'],
];

const leiterZeilen = LEITER.map(([rolle, war, alt, neu]) => `
      <tr>
        <th scope="row">${rolle}</th>
        <td class="was">${war}</td>
        <td class="probe"><i style="background:${alt}"></i><code>${alt.toUpperCase()}</code></td>
        <td class="pfeil" aria-hidden="true">&rarr;</td>
        <td class="probe"><i style="background:${neu}"></i><code>${neu}</code></td>
        <td class="zahl">${kontrast(alt, GRUND).toFixed(2)}</td>
        <td class="zahl">${kontrast(neu, GRUND).toFixed(2)}</td>
      </tr>`).join('');

const bloecke = [];
for (const { nr, phase } of paare) {
  const a = `${DIR}/${nr}-${phase}-vorher.png`;
  const z = `${DIR}/${nr}-${phase}-nachher.png`;
  if (!existsSync(a) || !existsSync(z)) continue;
  bloecke.push(`
    <figure class="paar">
      <figcaption>
        <span class="phase">${NAME[phase] ?? phase}</span>
        <code>${phase}</code>
      </figcaption>
      <div class="wisch" style="--pos:50%">
        <img class="unten" src="${await bild(z)}" alt="${NAME[phase] ?? phase}, neuer Stand">
        <div class="oben"><img src="${await bild(a)}" alt="${NAME[phase] ?? phase}, alter Stand"></div>
        <div class="griff" aria-hidden="true"></div>
        <span class="marke links">vorher</span>
        <span class="marke rechts">nachher</span>
        <input type="range" min="0" max="100" value="50" step="0.1"
               aria-label="${NAME[phase] ?? phase}: zwischen altem und neuem Stand wischen">
      </div>
    </figure>`);
}

const html = `<title>Handy im Vergleich</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=League+Spartan:wght@700;900&display=swap">
<style>
  :root {
    color-scheme: light dark;
    /* Grund und Tinte sind nicht frei gewaehlt: es sind die gemessenen Werte
       des Handys und der Buehne, um die es auf dieser Seite geht. */
    --grund: #F4F1E9;  --flaeche: #FFFFFF;  --kante: #DCD5C6;
    --tinte: #16121F;  --tinte-leise: #6A6377;  --akzent: #A21247;
    --schatten: 0 1px 2px rgba(22,18,31,.06), 0 8px 24px rgba(22,18,31,.06);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --grund: #0F0817;  --flaeche: #1A1526;  --kante: #322B42;
      --tinte: #F3EFE7;  --tinte-leise: #B9B3C6;  --akzent: #F5ECD8;
      --schatten: 0 1px 2px rgba(0,0,0,.5), 0 8px 28px rgba(0,0,0,.45);
    }
  }
  :root[data-theme="dark"] {
    --grund: #0F0817;  --flaeche: #1A1526;  --kante: #322B42;
    --tinte: #F3EFE7;  --tinte-leise: #B9B3C6;  --akzent: #F5ECD8;
    --schatten: 0 1px 2px rgba(0,0,0,.5), 0 8px 28px rgba(0,0,0,.45);
  }

  body {
    background: var(--grund); color: var(--tinte);
    font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif;
    font-optical-sizing: auto; line-height: 1.55; -webkit-font-smoothing: antialiased;
  }
  .huelle { max-width: 1180px; margin: 0 auto; padding: 40px 22px 80px; }

  header { border-bottom: 1px solid var(--kante); padding-bottom: 26px; margin-bottom: 34px; }
  .wortmarke {
    font-family: 'League Spartan', ui-sans-serif, system-ui, sans-serif;
    font-weight: 900; letter-spacing: .12em; font-size: 13px;
    color: var(--tinte-leise); text-transform: uppercase;
  }
  h1 {
    font-size: clamp(28px, 4.4vw, 44px); font-weight: 800; line-height: 1.08;
    margin: 10px 0 12px; text-wrap: balance; letter-spacing: -.018em;
  }
  .lead { max-width: 64ch; color: var(--tinte-leise); font-size: 16.5px; margin: 0; }
  .lead strong { color: var(--tinte); font-weight: 600; }

  h2 {
    font-size: 13px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase;
    color: var(--tinte-leise); margin: 46px 0 14px;
  }
  h2:first-of-type { margin-top: 34px; }
  .hinweis { max-width: 66ch; color: var(--tinte-leise); font-size: 15px; margin: 0 0 20px; }

  .rahmen { overflow-x: auto; border: 1px solid var(--kante); border-radius: 10px; background: var(--flaeche); box-shadow: var(--schatten); }
  table { border-collapse: collapse; width: 100%; min-width: 620px; font-size: 14.5px; }
  th, td { text-align: left; padding: 11px 14px; border-bottom: 1px solid var(--kante); vertical-align: top; }
  tr:last-child th, tr:last-child td { border-bottom: 0; }
  thead th {
    font-size: 11.5px; letter-spacing: .1em; text-transform: uppercase; vertical-align: bottom;
    color: var(--tinte-leise); font-weight: 800;
    background: color-mix(in oklab, var(--flaeche) 88%, var(--grund));
  }
  tbody th { font-weight: 600; }
  .was { color: var(--tinte-leise); white-space: nowrap; }
  .probe { white-space: nowrap; }
  .probe i { display: inline-block; width: 15px; height: 15px; border-radius: 3px; vertical-align: -2px; margin-right: 8px; border: 1px solid var(--kante); }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; }
  .pfeil { color: var(--tinte-leise); padding: 0; width: 22px; text-align: center; }
  .zahl { font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
  .befunde th[scope="row"] { max-width: 16ch; }
  .zeichen { font-size: 24px; line-height: 1; }
  tr.fehlt th, tr.fehlt td { background: color-mix(in oklab, var(--akzent) 12%, transparent); }

  .gitter { display: grid; gap: 30px; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }
  .paar { margin: 0; }
  figcaption { display: flex; align-items: baseline; gap: 9px; margin-bottom: 9px; flex-wrap: wrap; }
  .phase { font-weight: 700; font-size: 15.5px; }
  figcaption code { color: var(--tinte-leise); font-size: 11.5px; letter-spacing: .04em; }

  .wisch {
    position: relative; border-radius: 12px; overflow: hidden;
    border: 1px solid var(--kante); box-shadow: var(--schatten); line-height: 0; background: #0F0817;
  }
  .wisch img { width: 100%; height: auto; display: block; }
  /* Beschneiden statt skalieren: eine Breitenaenderung haette das linke Bild
     gestaucht, und der Vergleich zeigte zwei verschieden breite Ansichten. */
  .wisch .oben { position: absolute; inset: 0; clip-path: inset(0 calc(100% - var(--pos)) 0 0); }
  .griff {
    position: absolute; top: 0; bottom: 0; left: var(--pos); width: 2px;
    background: var(--akzent); transform: translateX(-1px); pointer-events: none;
    box-shadow: 0 0 0 1px rgba(0,0,0,.35);
  }
  .griff::after {
    content: ''; position: absolute; top: 50%; left: 50%;
    width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%;
    background: var(--akzent); box-shadow: 0 2px 8px rgba(0,0,0,.45);
  }
  .wisch .marke {
    position: absolute; top: 9px; z-index: 2; pointer-events: none;
    font-size: 10.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
    padding: 3px 8px; border-radius: 4px; line-height: 1.4;
    background: rgba(15,8,23,.72); color: #F3EFE7;
  }
  .wisch .links { left: 9px; }  .wisch .rechts { right: 9px; }
  .wisch input[type="range"] {
    position: absolute; inset: 0; width: 100%; height: 100%;
    margin: 0; opacity: 0; cursor: ew-resize; -webkit-appearance: none; appearance: none;
  }
  .wisch input:focus-visible { opacity: 1; outline: 3px solid var(--akzent); outline-offset: 2px; }

  .fuss { margin-top: 52px; padding-top: 22px; border-top: 1px solid var(--kante); color: var(--tinte-leise); font-size: 14.5px; max-width: 70ch; }
  .fuss p { margin: 0 0 12px; }  .fuss code, .fuss strong { color: var(--tinte); }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
</style>

<div class="huelle">
  <header>
    <div class="wortmarke">CozyQuiz &middot; /team</div>
    <h1>Handy im Vergleich</h1>
    <p class="lead">
      Zwei Durchgaenge. Der erste hat die <strong>Tinte</strong> getauscht: /team schrieb in Slate,
      dem kalten Blaugrau aus Tailwind, waehrend die Buehne seit dem 22.08. in Creme auf warmem
      Grund schreibt. Richtig, aber leise &mdash; „fast kein unterschied". Der zweite Durchgang hat
      die <strong>lauten</strong> Stellen geholt, und die hingen gar nicht an der Tinte: der
      Rundentitel in Pink, zweiunddreissig weitere Textstellen in Marken-Pink, und eine
      Gitterkachel mit zwei Formen fuer eine Sache.
    </p>
  </header>

  <h2>Die drei Befunde vom Livebild</h2>
  <p class="hinweis">
    Alle drei kommen von deinem Auge, nicht von meiner Messung. Die Messung hat sie danach
    bestaetigt und die Ursache gezeigt.
  </p>
  <div class="rahmen">
    <table class="befunde">
      <thead>
        <tr><th scope="col">Befund</th><th scope="col">Ursache, gemessen</th><th scope="col">Jetzt</th></tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Runde Umrandung <em>und</em> Kachel im Gitter</th>
          <td>Im Mini-Gitter lagen zwei gefuellte Formen in derselben Teamfarbe uebereinander:
              Zelle <code>radius&nbsp;4px</code>, darin die Marke <code>radius&nbsp;50%</code>.
              Diese Entscheidung ist am 05.05. schon einmal gefallen &mdash; der Fix hat nur das
              grosse Gitter erreicht, nicht dieses.</td>
          <td>Eine Kachel, ein Motiv.</td>
        </tr>
        <tr>
          <th scope="row">„Round&nbsp;1" in Pink</th>
          <td>Die Buehne hat den Rundentitel am 26.08. auf ein Token umgestellt. Das Handy fuhr
              noch die Pink-Eskalation <code>getRoundColor</code>
              (<code>#F9A8D4</code> bis <code>#A21247</code>).</td>
          <td>Rundentitel, Beschreibung und Regelzeile in Creme.</td>
        </tr>
        <tr>
          <th scope="row">Alte Emojis</th>
          <td>Neun Ansichten gemessen. Vier Zeichen hatten laengst ein Motiv im Repo und wurden
              trotzdem als Text geschrieben; eines fehlt ganz.</td>
          <td>Vier umgestellt, eines auf der Liste.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h2>Die Emoji-Liste</h2>
  <p class="hinweis">
    Erzeugt aus einer Messung, nicht aus dem Gedaechtnis:
    <code>node scripts/handy-emoji-reste.mjs</code>. Ob ein Zeichen schon ein Motiv hat, wird aus
    <code>QQIcon.tsx</code> gelesen &mdash; eine abgetippte Liste haette gemeldet, was laengst da
    liegt.
  </p>
  <div class="rahmen">
    <table>
      <thead>
        <tr><th scope="col">Zeichen</th><th scope="col">Stand</th><th scope="col">Wo</th>
            <th scope="col" class="zahl">max. px</th></tr>
      </thead>
      <tbody>
        <tr class="fehlt">
          <th scope="row"><span class="zeichen">&#128066;</span></th>
          <td><strong>Motiv fehlt</strong> &mdash; das einzige</td>
          <td>Regelfolie</td><td class="zahl">48</td>
        </tr>
        <tr><th scope="row"><span class="zeichen">&#10067;</span></th>
            <td>liegt da als <code>fx-help</code></td><td>Menue, alle Spielansichten</td><td class="zahl">22</td></tr>
        <tr><th scope="row"><span class="zeichen">&#128682;</span></th>
            <td>liegt da als <code>fx-exit</code></td><td>Menue, alle Spielansichten</td><td class="zahl">22</td></tr>
        <tr><th scope="row"><span class="zeichen">&#127916;</span></th>
            <td>liegt da als <code>fx-clapper</code></td><td>Team-Vorstellung</td><td class="zahl">12</td></tr>
        <tr><th scope="row"><span class="zeichen">&#127918;</span></th>
            <td>liegt da als <code>fx-board</code></td><td>Setzen, Sperrseite</td><td class="zahl">14</td></tr>
      </tbody>
    </table>
  </div>
  <p class="hinweis">
    Die vier unteren sind umgestellt. Fuer <span class="zeichen">&#128066;</span> brauche ich ein
    Motiv &mdash; es steht auf der Regelfolie bei 48&nbsp;px, vertraegt also Detail.
  </p>

  <h2>Die Tintenleiter</h2>
  <p class="hinweis">
    Die Stufen bleiben, der Ton wechselt. Jede Stufe behaelt ihre Helligkeit und bekommt Buntheit
    und Farbton aus den zwei Tinten des aktiven Designs &mdash; deshalb aendert sich der Kontrast
    praktisch nicht, und wo er sich aendert, wird er besser. Die Werte gelten fuer das
    Standarddesign; bei einem anderen Design im Steuerpult rechnet sich die Leiter neu.
  </p>
  <div class="rahmen">
    <table>
      <thead>
        <tr>
          <th scope="col">Rolle</th><th scope="col">war</th>
          <th scope="col">alt</th><th scope="col" aria-hidden="true"></th><th scope="col">neu</th>
          <th scope="col" class="zahl">Kontrast alt</th><th scope="col" class="zahl">neu</th>
        </tr>
      </thead>
      <tbody>${leiterZeilen}
      </tbody>
    </table>
  </div>

  <h2>Die Ansichten</h2>
  <p class="hinweis">
    Ein Lauf, ein stehendes Bild, zwei Aufnahmen. Frage, Kategorie, Team und Uhr sind in beiden
    Haelften dieselben &mdash; zwei Laeufe zu vergleichen ginge nicht, weil Bots und Fragen
    gewuerfelt werden und die Kategorie jeden Lauf anders faerbt.
  </p>
  <div class="gitter">${bloecke.join('')}
  </div>

  <footer class="fuss">
    <p><strong>Zu „im design fuer beamer steht eckig":</strong> stimmt, und so ist es geblieben.
    Die Teammarke ist auf dem Handy <em>rund</em>, wo sie Identitaet ist &mdash; Kopfzeile, Lobby,
    Team-Vorstellung. Im Gitter ist sie <em>eckig</em>, weil sie dort ein Spielstein ist und die
    Zelle die Farbe schon traegt. Kein Widerspruch, sondern dieselbe Regel: die Form folgt der
    Aufgabe, nicht dem Ort.</p>
    <p><strong>Nicht angefasst:</strong> <code>main.css</code> und <code>qqTheme.ts</code> gehoeren
    der Buehnen-Sitzung. Die Karte behaelt ihre Flaeche, der Schatten bleibt, und die Rundenfarbe
    traegt weiter die Kontur der Karte &mdash; auf dem Handy ist sie dort das einzige Mittel, das
    zeigt, welche Runde laeuft. Pink bleibt der Buehne als Dringlichkeit vorbehalten.</p>
    <p><strong>Offen:</strong> die Synchronitaet zwischen Buehne und Handy, und eine eigene
    Schrift fuers Handy.</p>
    <p>Erzeugt aus <code>scripts/handy-vorher-nachher.mjs</code> und
    <code>scripts/handy-vergleich-seite.mjs</code>.</p>
  </footer>
</div>

<script>
  for (const w of document.querySelectorAll('.wisch')) {
    const regler = w.querySelector('input');
    const setz = () => w.style.setProperty('--pos', regler.value + '%');
    regler.addEventListener('input', setz);
    setz();
  }
</script>
`;

writeFileSync(ZIEL, html);
console.log(`geschrieben: ${ZIEL}  (${(statSync(ZIEL).size / 1e6).toFixed(2)} MB, ${bloecke.length} Paare)`);
