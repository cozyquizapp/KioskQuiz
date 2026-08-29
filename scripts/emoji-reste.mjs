/* emoji-reste — wo stehen auf der Buehne noch ROHE Unicode-Emojis?
 *
 * 2026-08-28, Wolf: „einige der emojis in crowdquiz sind alt, die kompletten
 * emojis in cozyquiz wurden auf ein neues design umgestellt".
 *
 * Der Unterschied ist im DOM sichtbar und muss nicht geraten werden: ein
 * NEUES Zeichen ist ein <img> aus /icons/ (QQIcon, QQEmojiIcon), ein ALTES
 * ist ein Unicode-Zeichen im Text - und das rendert der Browser mit der
 * Systemschrift, auf jedem Rechner anders. Genau das soll auf einer 1760x990
 * grossen Projektion nicht passieren.
 *
 * ⚠️ Nicht jedes Unicode-Zeichen ist ein Fehler: Ziffern-Embleme, Pfeile und
 * Haken gehoeren zur Typografie. Gesucht werden Bild-Emojis (Tiere, Objekte,
 * Symbole), und die Liste ist ein HINWEIS - was davon ein Rest ist,
 * entscheidet das Auge.
 *
 * ⚠️ DIE HANDY-SEITEN SIND ABSICHTLICH DRAUSSEN, nicht vergessen worden. Der
 * Suchbereich ist `[data-qq-buehne]`, und das ist eine Entscheidung, keine
 * Nachlaessigkeit:
 *
 *   Der Grund dieser Regel ist die Projektion. Auf 1760 Bildpunkten rendert
 *   jeder Laptop das Systemzeichen anders, und das sieht man aus zehn Metern.
 *   Auf dem Handy des Gastes dreht sich der Grund um: dort ist das native
 *   Zeichen das konsistente, weil jede andere App auf dem Geraet es genauso
 *   zeigt, und ein eigenes PNG waere der Fremdkoerper.
 *
 *   2026-08-29 auf /summary-test gemessen: 14 rohe Emojis. Drei haetten ein
 *   Zeichen im Satz (🏆 🥇 🏅), fuenf sind Bedienzeichen (📲 🔖 📋 ✉ 🌐),
 *   sieben sind die Stimmungsknoepfe im Feedback (💬 🐛 ❤ 😍 👍 😐 💤).
 *   Wolf hat entschieden, ALLE zu lassen: „ich wuerde alle auf der summary
 *   lassen, sonst ist die haelfte neu die andere nicht." Eine Seite mit zwei
 *   Bildsprachen nebeneinander waere schlechter als eine mit einer alten.
 *
 * Wer diesen Sucher also auf die Summary ausweitet, baut einen Pruefer, der
 * dauerhaft rot steht - und ein Pruefer, der immer rot ist, wird nicht
 * gelesen. Wenn die Entscheidung faellt, die Handy-Seiten umzustellen, dann
 * KOMPLETT und dann darf er mit.
 *
 * NUTZUNG: node scripts/emoji-reste.mjs [station ...]
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

// ⚠️ `zwischenstand` ist raus: die Station faehrt den Final-Wager an, und den
// gibt es in CrowdQuiz nicht (2026-08-29, siehe den Kopf von crowd-abgleich.mjs).
const ABEND = process.argv.slice(2).length ? process.argv.slice(2)
  : ['lobby', 'regeln', 'ablauf', 'teams', 'rundenintro', 'frage', 'aufloesung', 'pause', 'spielende', 'danke'];

const SUCHEN = () => {
  const buehne = document.querySelector('[data-qq-buehne]');
  if (!buehne) return { fehler: 'keine Buehne' };
  // Bild-Emojis: die grossen Unicode-Bloecke. Bewusst OHNE Ziffern-Embleme,
  // Varianten-Selektoren und Pfeile.
  const RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  const funde = new Map();
  const lauf = document.createTreeWalker(buehne, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = lauf.nextNode())) {
    const t = (n.textContent || '').trim();
    if (!t || !RE.test(t)) continue;
    const el = n.parentElement;
    if (!el || el.tagName.toLowerCase() === 'style') continue;
    const r = el.getBoundingClientRect();
    if (r.height < 8) continue;
    for (const z of t) {
      if (!RE.test(z)) continue;
      const bis = funde.get(z) ?? { n: 0, bsp: t.replace(/\s+/g, ' ').slice(0, 30), px: 0 };
      bis.n++;
      const px = Math.round(parseFloat(getComputedStyle(el).fontSize));
      if (px > bis.px) bis.px = px;
      funde.set(z, bis);
    }
  }
  // Zum Vergleich: wie viele NEUE Zeichen (Bilder) stehen auf derselben Folie?
  let bilder = 0;
  for (const i of Array.from(buehne.querySelectorAll('img'))) {
    if (/\/icons\/|\/avatars\//.test(i.getAttribute('src') || '')) bilder++;
  }
  return { funde: Array.from(funde.entries()).map(([z, v]) => ({ z, ...v })), bilder };
};

for (const mega of [true, false]) {
  console.log(`\n${'─'.repeat(70)}\n${mega ? 'CrowdQuiz' : 'CozyQuiz'}: rohe Unicode-Emojis auf der Buehne\n${'─'.repeat(70)}`);
  for (const st of ABEND) {
    // ⚠️ `grossformat` MUSS mit: `qq:startGame` setzt das Format aus seinem
    // eigenen Payload, ein vorher geschicktes `setQuizOptions` ueberlebt den
    // Spielstart also nicht. Ohne diese Zeile hat dieses Werkzeug beide
    // Durchgaenge an CozyQuiz gemessen und den CrowdQuiz-Lauf nur so genannt
    // (2026-08-29, derselbe Fehler stand in drei Werkzeugen).
    const b = await buehneStarten({ bots: mega ? 12 : 8, frisch: true, takt: () => {}, entwurf: 'qq-vol-1', grossformat: mega });
    await b.emit('qq:setQuizOptions', { largeGroupMode: mega, nestedTeams: mega });
    await b.emit('qq:setTheme', { themeId: 'buehne' });
    await sleep(600);
    try {
      await b.zurStation(st);
      await sleep((b.stationen[st]?.ruhe ?? 2500) + 700);
      const r = await b.seite.evaluate(SUCHEN);
      if (r.fehler) { console.log(`  ${st.padEnd(13)} UNGEPRUEFT`); }
      else if (!r.funde.length) console.log(`  ${st.padEnd(13)} ✓ keine   (${r.bilder} neue Zeichen)`);
      else console.log(`  ${st.padEnd(13)} ${r.funde.map(f => `${f.z}${f.px}px`).join('  ')}   (${r.bilder} neue Zeichen)`);
    } catch (e) { console.log(`  ${st.padEnd(13)} UNGEPRUEFT: ${String(e).slice(0, 50)}`); }
    await b.schliessen?.();
  }
}
