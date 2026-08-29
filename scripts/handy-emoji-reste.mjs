/* handy-emoji-reste — wo stehen auf dem HANDY noch rohe Unicode-Emojis?
 *
 * 2026-08-29, Wolf: „die alten emojis die genutzt werden muessen ersetzt
 * werden entweder durch bereits neu erstellte die bereits im repo liegen oder
 * durch neu generierte die nachgereicht werden wenn eine liste steht."
 *
 * Das hier ist die Liste. Dasselbe Verfahren wie scripts/emoji-reste.mjs, nur
 * auf /team statt auf der Buehne - und mit einer Spalte mehr, weil Wolfs Satz
 * genau diese Unterscheidung verlangt:
 *
 *   LIEGT SCHON DA  Fuer das Zeichen gibt es einen Eintrag in EMOJI_TO_SLUG
 *                   (oder REACTION_TO_SLUG) und die Datei unter
 *                   frontend/public/icons/. Es fehlt nur der Aufruf: die
 *                   Stelle schreibt das Zeichen als Text, statt QQEmojiIcon
 *                   zu benutzen. Reine Umbauarbeit, kein neues Bild.
 *   FEHLT           Kein Eintrag. Fuer dieses Zeichen muss ein Motiv erzeugt
 *                   werden. Nur diese Zeilen gehoeren in eine Bestellung.
 *
 * ⚠️ Nicht jedes Unicode-Zeichen ist ein Fehler, derselbe Vorbehalt wie beim
 * Buehnen-Werkzeug: Ziffern-Embleme, Pfeile und Haken gehoeren zur Typografie.
 * Gesucht werden Bild-Emojis. Was davon wirklich ein Rest ist, entscheidet das
 * Auge - hier steht ein Hinweis, kein Urteil.
 *
 * ⚠️ Und ein Vorbehalt, den das Buehnen-Werkzeug nicht braucht: auf dem Handy
 * sind manche Zeichen DATEN, nicht Gestaltung. Das Team-Emoji, das sich ein
 * Gast im Setup aussucht, liegt als freies Feld im localStorage jedes Handys
 * (siehe todo.md). Ein solches Zeichen laesst sich nicht durch ein Motiv
 * ersetzen, ohne die Auswahl selbst umzubauen. Solche Funde stehen als
 * `AUSWAHL` da.
 *
 * VORAUSSETZUNG: Backend (4000, frisch) + Frontend (5173).
 * NUTZUNG:
 *   node scripts/handy-emoji-reste.mjs            # CozyQuiz
 *   node scripts/handy-emoji-reste.mjs --mega     # CrowdQuiz
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { handyStarten, sleep } from './lib/handy.mjs';

const mega = process.argv.includes('--mega');
const SECS = Number((process.argv.find(a => a.startsWith('--secs=')) ?? '--secs=200').split('=')[1]);

/**
 * Welche Zeichen kennt das Repo schon als Motiv?
 *
 * Gelesen, nicht gepflegt. Eine abgetippte Liste haette denselben Fehler wie
 * die Kategorie-Toene in handy-referenz.mjs: sie meldet Zeichen als fehlend,
 * fuer die laengst ein Bild da liegt, und niemand merkt es.
 */
const { BEKANNT, DATEIEN } = (() => {
  const quelle = readFileSync(new URL('../frontend/src/components/QQIcon.tsx', import.meta.url), 'utf8');
  const bekannt = new Map();
  // Beide Tabellen: EMOJI_TO_SLUG und REACTION_TO_SLUG. Zeilenform ist in
  // beiden `'<zeichen>': 'slug',`, teils mehrere Paare pro Zeile.
  for (const m of quelle.matchAll(/'([^']{1,8})':\s*'([a-z0-9-]+)'/g)) {
    const [, zeichen, slug] = m;
    if (!/^(fx|react|cat|sub|marker)-/.test(slug)) continue;   // nur Motiv-Slugs
    bekannt.set(zeichen, slug);
  }
  const dateien = new Set();
  for (const [, slug] of bekannt) {
    if (existsSync(new URL(`../frontend/public/icons/${slug}.png`, import.meta.url))) dateien.add(slug);
  }
  return { BEKANNT: bekannt, DATEIEN: dateien };
})();
console.log(`${BEKANNT.size} Zeichen kennt QQIcon.tsx, ${DATEIEN.size} davon liegen als Bild da.`);

/** Laeuft IM Browser. Sammelt rohe Bild-Emojis samt Ort und Groesse. */
const SUCHEN = () => {
  // Bild-Emojis: die grossen Unicode-Bloecke. Bewusst OHNE Ziffern-Embleme,
  // Varianten-Selektoren und Pfeile - dieselbe Wahl wie in emoji-reste.mjs,
  // damit beide Werkzeuge dasselbe zaehlen.
  const RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  const funde = new Map();
  const lauf = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = lauf.nextNode())) {
    const t = (n.textContent || '').trim();
    if (!t || !RE.test(t)) continue;
    const el = n.parentElement;
    if (!el || el.tagName.toLowerCase() === 'style') continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 8) continue;
    for (const z of t) {
      if (!RE.test(z)) continue;
      const bis = funde.get(z) ?? { n: 0, bsp: t.replace(/\s+/g, ' ').slice(0, 34), px: 0 };
      bis.n++;
      const px = Math.round(parseFloat(cs.fontSize));
      if (px > bis.px) bis.px = px;
      funde.set(z, bis);
    }
  }
  // Zum Vergleich: wie viele NEUE Zeichen (Bilder) stehen auf derselben Ansicht?
  const bilder = Array.from(document.querySelectorAll('img'))
    .filter(i => /\/icons\/|\/avatars\//.test(i.getAttribute('src') || '')).length;
  return { funde: Array.from(funde.entries()).map(([z, v]) => ({ z, ...v })), bilder };
};

const gesamt = new Map();
const stationen = [];

/** Eine Ansicht messen und in die Gesamtliste legen. */
const messen = async (seite, name) => {
  const r = await seite.evaluate(SUCHEN).catch(() => null);
  if (!r) return;
  stationen.push(name);
  for (const f of r.funde) {
    const bis = gesamt.get(f.z) ?? { n: 0, px: 0, bsp: f.bsp, wo: new Set() };
    bis.n += f.n; bis.px = Math.max(bis.px, f.px);
    if (!bis.bsp) bis.bsp = f.bsp;
    bis.wo.add(name);
    gesamt.set(f.z, bis);
  }
  console.log(`  ✓ ${name}: ${r.funde.length} rohe Zeichen, ${r.bilder} Motive`);
};

/* Die SETUP-Ansicht zaehlt mit, und sie ist der wichtigste Ort ueberhaupt:
 * dort waehlt ein Gast sein Team-Emoji. Sie laeuft vor dem Beitritt, sonst ist
 * sie weg. */
const b = await handyStarten({
  mega, secs: SECS,
  vorBeitritt: async (seite) => { await messen(seite, 'SETUP'); },
});

await b.abendMitfahren(async (phase) => {
  await messen(b.handy, phase);
  // Die Ueberlagerungen einmal mitnehmen. Sie haengen nicht an der Phase,
  // aber sie brauchen eine, in der sie ueberhaupt erreichbar sind.
  for (const was of ['menue', 'regeln']) {
    if (stationen.includes(`${was.toUpperCase()}`)) continue;
    if (await b.oeffnen(was)) {
      await messen(b.handy, was.toUpperCase());
      await b.handy.keyboard.press('Escape').catch(() => {});
      await sleep(800);
    }
  }
});
await b.schliessen();

/* ── Bericht ──────────────────────────────────────────────────────────────── */
mkdirSync('.shots/emoji', { recursive: true });
const reihen = Array.from(gesamt.entries())
  .map(([z, v]) => {
    const slug = BEKANNT.get(z) ?? null;
    const stand = !slug ? 'FEHLT' : DATEIEN.has(slug) ? 'LIEGT SCHON DA' : 'EINTRAG OHNE BILD';
    return { z, slug, stand, ...v, wo: Array.from(v.wo) };
  })
  .sort((a, z) => (a.stand === z.stand ? z.n - a.n : a.stand.localeCompare(z.stand)));

const zeilen = [
  `# Rohe Emojis auf /team${mega ? ' (CrowdQuiz)' : ' (CozyQuiz)'}`, '',
  `Gemessen am ${new Date().toISOString().slice(0, 10)} ueber ${stationen.length} Ansichten`,
  `(${stationen.join(', ')}).`, '',
  'Erzeugt von `node scripts/handy-emoji-reste.mjs`. Der Kopf des Werkzeugs erklaert,',
  'was die Spalte „Stand" bedeutet und welche Funde ausdruecklich KEINE Reste sind.', '',
];

const gruppen = [
  ['FEHLT', 'Diese Zeichen brauchen ein neues Motiv',
    'Nur diese Zeilen gehoeren in eine Bestellung. Die Groesse ist die groesste,\n'
    + 'in der das Zeichen gemessen wurde - danach richtet sich, wieviel Detail ein\n'
    + 'Motiv vertraegt.'],
  ['EINTRAG OHNE BILD', 'Eintrag da, Bilddatei fehlt',
    'QQIcon.tsx kennt das Zeichen, aber unter frontend/public/icons/ liegt nichts.\n'
    + 'Das ist ein Fehler im Bestand, kein Gestaltungsauftrag.'],
  ['LIEGT SCHON DA', 'Motiv liegt im Repo, wird an dieser Stelle nur nicht benutzt',
    'Reine Umbauarbeit: die Stelle schreibt das Zeichen als Text, statt\n'
    + '`QQEmojiIcon` bzw. `QQReactionIcon` zu benutzen. Kein neues Bild noetig.'],
];

for (const [stand, titel, erklaerung] of gruppen) {
  const teil = reihen.filter(r => r.stand === stand);
  if (!teil.length) continue;
  zeilen.push(`## ${titel} (${teil.length})`, '', erklaerung, '',
    '| Zeichen | Slug | max. px | Vorkommen | Ansichten | Beispieltext |',
    '|---|---|---:|---:|---|---|');
  for (const r of teil) {
    zeilen.push(`| ${r.z} | ${r.slug ?? '—'} | ${r.px} | ${r.n} | ${r.wo.join(', ')} | ${r.bsp.replace(/\|/g, '\\|')} |`);
  }
  zeilen.push('');
}

if (!reihen.length) zeilen.push('✓ Keine rohen Bild-Emojis gefunden.', '');

const text = zeilen.join('\n');
const datei = `.shots/emoji/HANDY${mega ? '-CROWD' : ''}.md`;
writeFileSync(datei, text);
console.log('\n' + text);
console.log(`Bericht: ${datei}`);
