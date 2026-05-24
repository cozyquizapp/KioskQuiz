// Übersetzungs-Audit: findet Drafts in denen options[i] === optionsEn[i] obwohl
// das DE-Wort nicht-numerisch ist (= DeepL hat vermutlich nicht übersetzt).
//
// Hintergrund 2026-05-24: Wolf-Live-Test zeigte 'Phönix' statt 'Phoenix' auf
// der englischen Seite — DeepL hatte es als bereits-englisch interpretiert
// und nicht übersetzt. Solche Drift-Fälle wollen wir vor dem nächsten Quiz
// erwischen.
//
// Usage: node scripts/audit-translations.mjs
//
// Backend-URL kann via env BACKEND_URL gesetzt werden:
//   BACKEND_URL=https://backend.cozyquiz.app node scripts/audit-translations.mjs

const BACKEND = process.env.BACKEND_URL || 'https://backend.cozyquiz.app';

function isNumericOrYear(s) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  if (t === '') return true;
  if (/^[\d\s.,\-]+$/.test(t)) return true; // pure number incl. Euro-style
  return false;
}

function looksLikeProperNoun(s) {
  // Eigenname / Markenname / Land das in DE+EN gleich ist (z.B. Bremen, Israel).
  // Heuristik: 1 Wort, beginnt mit Großbuchstabe, keine Umlaute → vermutlich Eigenname.
  if (typeof s !== 'string') return false;
  const t = s.trim();
  if (!/^[A-ZÄÖÜ]/.test(t)) return false;
  if (/\s/.test(t)) return false;
  if (/[äöüÄÖÜß]/.test(t)) return false; // hat Umlaute → DE-Variante, sollte übersetzt sein
  return true;
}

const draftsRes = await fetch(`${BACKEND}/api/qq/drafts`);
if (!draftsRes.ok) {
  console.error(`❌ Drafts-Fetch fehlgeschlagen: HTTP ${draftsRes.status}`);
  process.exit(1);
}
const drafts = await draftsRes.json();

let totalIssues = 0;
for (const summary of drafts) {
  const r = await fetch(`${BACKEND}/api/qq/drafts/${summary.id}`);
  if (!r.ok) continue;
  const d = await r.json();
  const issues = [];
  for (const q of d.questions ?? []) {
    // Check options[]
    if (Array.isArray(q.options) && Array.isArray(q.optionsEn)) {
      for (let i = 0; i < q.options.length; i++) {
        const de = q.options[i];
        const en = q.optionsEn[i];
        if (!de || !en) continue;
        if (de === en && !isNumericOrYear(de) && !looksLikeProperNoun(de)) {
          issues.push(`  [Q ${q.id}] options[${i}]: "${de}" identisch in DE+EN`);
        }
      }
    }
    // Check answer vs answerEn
    if (q.answer && q.answerEn && q.answer === q.answerEn
        && !isNumericOrYear(q.answer) && !looksLikeProperNoun(q.answer)) {
      issues.push(`  [Q ${q.id}] answer: "${q.answer}" identisch in DE+EN`);
    }
    // Check text vs textEn
    if (q.text && q.textEn && q.text === q.textEn
        && q.text.length > 10) {
      issues.push(`  [Q ${q.id}] text identisch: "${q.text.slice(0, 60)}..."`);
    }
    // Specific: Umlaute in EN-Feldern sind sehr verdächtig (DeepL hat Umlaute nicht aufgelöst)
    if (Array.isArray(q.optionsEn)) {
      for (let i = 0; i < q.optionsEn.length; i++) {
        if (typeof q.optionsEn[i] === 'string' && /[äöüÄÖÜß]/.test(q.optionsEn[i])) {
          issues.push(`  [Q ${q.id}] optionsEn[${i}]: "${q.optionsEn[i]}" enthält Umlaute (DE-Drift?)`);
        }
      }
    }
    if (typeof q.answerEn === 'string' && /[äöüÄÖÜß]/.test(q.answerEn)) {
      issues.push(`  [Q ${q.id}] answerEn: "${q.answerEn}" enthält Umlaute (DE-Drift?)`);
    }
    if (typeof q.textEn === 'string' && /[äöüÄÖÜß]/.test(q.textEn)) {
      issues.push(`  [Q ${q.id}] textEn enthält Umlaute: "${q.textEn.slice(0, 60)}..."`);
    }
  }
  if (issues.length > 0) {
    console.log(`\n📋 Draft "${d.title}" (${d.id}):`);
    issues.forEach(line => console.log(line));
    totalIssues += issues.length;
  }
}

console.log(`\n═══════════════════════════════════════`);
console.log(`Insgesamt ${totalIssues} potenzielle Übersetzungsfehler.`);
if (totalIssues === 0) console.log(`✅ Alle Drafts sehen sauber übersetzt aus.`);
else console.log(`💡 Fix-Vorschlag: betroffene Drafts im Builder öffnen + auto-translate erneut anstoßen,`);
console.log(`   oder per fix-tonight-draft.mjs-Pattern direkt patchen.`);
