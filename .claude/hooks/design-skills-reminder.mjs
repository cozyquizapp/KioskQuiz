// UserPromptSubmit-Hook — erinnert an die Design-Skills, BEVOR gebaut wird.
//
// Warum es diesen Hook gibt (Wolf 2026-07-17): „ich habe ganz viele skills
// installiert, habe aber das gefuehl die wenigsten werden sinnvoll genutzt."
// Stimmt — am selben Tag wurde eine visuelle Komponente gebaut (Wappen-Groessen,
// Badge-Farben, Animations-Delays) OHNE einen einzigen Design-Skill zu laden,
// obwohl die Memory-Regel das seit 2026-07-13 „ganz dick" vorschreibt.
//
// Der Punkt: Memory ist eine EMPFEHLUNG, die im Arbeitsfluss untergeht. Ein Hook
// wird vom Harness ausgefuehrt — er kann nicht vergessen werden. Genau derselbe
// Gedanke wie beim ausgemessenen Tafel-Rahmen: nicht auf Gedaechtnis verlassen.
//
// Kein jq verwenden — auf Wolfs Rechner ist jq NICHT installiert (getestet).
// Node ist da (v22).

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let prompt = '';
  try { prompt = String(JSON.parse(raw).prompt ?? ''); } catch { /* kein valides JSON → still raus */ }

  // Design-/Layout-Woerter inkl. Wolfs typischer Formulierungen („sitzt nicht",
  // „zu klein", „abgeschnitten") und der Arena-Begriffe.
  const RE = /design|layout|farbe|colou?r|animat|motion|reveal|beamer|sitzt|passt nicht|zu klein|zu gross|zu groß|abgeschnitten|ueberdeck|überdeck|kontrast|schrift|font|padding|abstand|wappen|hintergrund|\bbg\b|screenshot|folie|slide|krönung|kroenung|tafel/i;
  if (!RE.test(prompt)) process.exit(0);

  const msg = [
    'DESIGN-/LAYOUT-AUFGABE ERKANNT (Hook, nicht der User).',
    '',
    '1) ZUERST die Design-Skills laden und AKTIV anwenden, nicht nur erwähnen:',
    '   ui-ux-pro-max · animate · color-contrast  (Wolf 2026-07-13: „ganz dick")',
    '   Bei groesseren Umbauten zusaetzlich: impeccable · web-design-guidelines',
    '',
    '2) NICHT relevant fuer dieses Repo (nicht laden, kostet nur Kontext):',
    '   GSAP-Skills, animejs-waapi, Remotion, Marketing (copywriting/cro/seo/...).',
    '   CozyQuiz nutzt REINE CSS-Keyframes (~335 Stueck in qqShared.ts + main.css) —',
    '   kein GSAP, kein anime.js, kein Framer Motion, kein Remotion in package.json.',
    '   Die Marketing-Skills gehoeren zum cozywolf-landing-Repo, nicht hierher.',
    '',
    '3) Bei Passungs-Aufgaben (Content auf gemaltes BG-Element): Asset AUSMESSEN,',
    '   nicht schaetzen. Geschaetzte Werte in Kommentaren waren die Ursache mehrfacher',
    '   Fix-Runden. Siehe Memory feedback_measure_assets_not_guess.',
    '',
    '4) Gesperrte Entscheidungen VOR dem Bruch benennen: keine Em-Dashes, Brand-Farben',
    '   Pink #EC4899 / Magenta #A21247 / Navy (kein Amber/Gold ausser Kroenung),',
    '   bewusste Design-Entscheidungen sind KEINE Bugs.',
  ].join('\n');

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: msg },
    suppressOutput: true,
  }));
});
