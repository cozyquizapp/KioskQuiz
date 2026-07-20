#!/usr/bin/env node
/**
 * check-en-drafts — EN-Vollstaendigkeits-Check fuer QQ-Drafts.
 *
 * WARUM: fehlende EN-Felder fallen im Spiel STILL auf Deutsch zurueck. Beim
 * englischen Event merkt man das erst, wenn die Frage am Beamer steht. Dieser
 * Check macht den stillen Fallback sichtbar, BEVOR das Event laeuft.
 *
 * ⚠️ Live-DB != Repo: die Drafts werden nach Mongo geseedet. Der Default prueft
 * die Repo-Datei; fuer den echten Event-Stand `--api` nutzen.
 *
 * Usage:
 *   node scripts/check-en-drafts.mjs                    # Repo (src/data/qqDrafts.json)
 *   node scripts/check-en-drafts.mjs --api              # Live (backend.cozyquiz.app)
 *   node scripts/check-en-drafts.mjs --api http://localhost:4000
 *   node scripts/check-en-drafts.mjs --draft <id>       # nur ein Draft
 *   node scripts/check-en-drafts.mjs --all              # auch WARN-Only-Drafts listen
 *
 * Exit 1 sobald ein ERROR gefunden wird -> als Gate vorm Event nutzbar.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valAfter = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };

// Deaktivierte Mechaniken (Memory: Imposter/Bluff/OnlyConnect sind aus) — deren
// fehlende EN-Felder sind kein Event-Risiko, nur Rauschen.
const DISABLED_KINDS = new Set(['bluff', 'onlyConnect', 'oneOfEight']);

const isBlank = (s) => s == null || String(s).trim() === '';
const isNumericAnswer = (s) => !isBlank(s) && /^[\d.,\s%°+-]+$/.test(String(s));

/** Liste gleicher Laenge + keine leeren Eintraege? */
function listIncomplete(de, en) {
  if (!Array.isArray(de) || de.length === 0) return false;
  if (!Array.isArray(en)) return true;
  if (en.length !== de.length) return true;
  return en.some(isBlank);
}

/** Alle EN-Luecken einer Frage. kind: 'error' = zeigt sicher Deutsch, 'warn' = oft sprachneutral. */
function findGaps(q) {
  const gaps = [];
  const err = (f, note) => gaps.push({ level: 'error', field: f, note });
  const warn = (f, note) => gaps.push({ level: 'warn', field: f, note });

  if (!isBlank(q.text) && isBlank(q.textEn)) err('textEn', 'Frage-Text');
  if (Array.isArray(q.options) && q.options.length > 0 && listIncomplete(q.options, q.optionsEn)) {
    err('optionsEn', `${q.options.length} Optionen`);
  }
  // Antwort: reine Zahlen brauchen keine Uebersetzung.
  if (!isBlank(q.answer) && isBlank(q.answerEn) && !isNumericAnswer(q.answer)) {
    warn('answerEn', `Antwort "${String(q.answer).slice(0, 30)}"`);
  }
  if (!isBlank(q.unit) && isBlank(q.unitEn)) warn('unitEn', `Einheit "${q.unit}"`);
  if (!isBlank(q.funFact) && isBlank(q.funFactEn)) warn('funFactEn', 'Fun-Fact');

  const bt = q.bunteTuete;
  if (bt && !DISABLED_KINDS.has(bt.kind)) {
    switch (bt.kind) {
      case 'top5':
        if (listIncomplete(bt.answers, bt.answersEn)) err('bunteTuete.answersEn', `${bt.answers?.length ?? 0} Antworten`);
        break;
      case 'order':
        if (listIncomplete(bt.items, bt.itemsEn)) err('bunteTuete.itemsEn', `${bt.items?.length ?? 0} Items`);
        if (!isBlank(bt.criteria) && isBlank(bt.criteriaEn)) err('bunteTuete.criteriaEn', `Kriterium "${bt.criteria}"`);
        break;
      case 'crowdTop':
        (bt.answers ?? []).forEach((a, i) => {
          if (!isBlank(a?.label) && isBlank(a?.labelEn)) err(`bunteTuete.answers[${i}].labelEn`, `Tafel-Label "${a.label}"`);
        });
        break;
      case 'crowdEstimate':
        if (!isBlank(bt.unit) && isBlank(bt.unitEn)) warn('bunteTuete.unitEn', `Einheit "${bt.unit}"`);
        break;
      default:
        break; // map/hotPotato: keine uebersetzbaren Textfelder
    }
  }
  return gaps;
}

async function loadDrafts() {
  if (has('--api')) {
    const base = (valAfter('--api') && !valAfter('--api').startsWith('--'))
      ? valAfter('--api').replace(/\/$/, '')
      : 'https://backend.cozyquiz.app';
    const url = `${base}/api/qq/drafts`;
    process.stdout.write(`Quelle: LIVE ${url}\n`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : (data.drafts ?? []);
  }
  const file = path.join(__dirname, '..', 'src', 'data', 'qqDrafts.json');
  process.stdout.write(`Quelle: REPO ${path.relative(process.cwd(), file)}\n`);
  process.stdout.write('  (Hinweis: Live-DB kann abweichen — fuers Event mit --api gegenpruefen)\n');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const C = { red: '\x1b[31m', yel: '\x1b[33m', grn: '\x1b[32m', dim: '\x1b[2m', off: '\x1b[0m', b: '\x1b[1m' };

(async () => {
  let drafts = await loadDrafts();
  const only = valAfter('--draft');
  if (only) drafts = drafts.filter(d => d.id === only || d.title === only);
  if (drafts.length === 0) { console.log('Keine Drafts gefunden.'); process.exit(0); }

  let totalErr = 0, totalWarn = 0, totalQ = 0;
  const clean = [];

  for (const d of drafts) {
    const qs = Array.isArray(d.questions) ? d.questions : [];
    totalQ += qs.length;
    const rows = [];
    for (const q of qs) {
      const gaps = findGaps(q);
      if (gaps.length) rows.push({ q, gaps });
      totalErr += gaps.filter(g => g.level === 'error').length;
      totalWarn += gaps.filter(g => g.level === 'warn').length;
    }
    const dErr = rows.reduce((n, r) => n + r.gaps.filter(g => g.level === 'error').length, 0);
    const dWarn = rows.reduce((n, r) => n + r.gaps.filter(g => g.level === 'warn').length, 0);

    if (rows.length === 0) { clean.push(`${d.title ?? d.id} (${qs.length} Fragen)`); continue; }
    if (dErr === 0 && !has('--all')) { clean.push(`${d.title ?? d.id} (${qs.length} Fragen, ${dWarn} Warnung(en))`); continue; }

    const badge = dErr > 0 ? `${C.red}${dErr} FEHLER${C.off}` : `${C.yel}${dWarn} Warnung(en)${C.off}`;
    console.log(`\n${C.b}${d.title ?? d.id}${C.off} ${C.dim}[${d.id}] lang=${d.language ?? '?'} · ${qs.length} Fragen${C.off} — ${badge}`);
    for (const { q, gaps } of rows) {
      const shown = has('--all') ? gaps : gaps.filter(g => g.level === 'error');
      if (!shown.length) continue;
      const kind = q.bunteTuete?.kind ? `${q.category}/${q.bunteTuete.kind}` : q.category;
      console.log(`  ${C.dim}R${q.phaseIndex}.${(q.questionIndexInPhase ?? 0) + 1} ${kind} ${q.id}${C.off}`);
      for (const g of shown) {
        const tag = g.level === 'error' ? `${C.red}fehlt${C.off}` : `${C.yel}fehlt${C.off}`;
        console.log(`      ${tag} ${g.field} ${C.dim}(${g.note})${C.off}`);
      }
    }
  }

  if (clean.length) {
    console.log(`\n${C.grn}✓ ohne EN-Fehler:${C.off} ${clean.join(' · ')}`);
  }
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`${drafts.length} Draft(s), ${totalQ} Fragen — ${totalErr > 0 ? C.red : C.grn}${totalErr} Fehler${C.off}, ${C.yel}${totalWarn} Warnung(en)${C.off}`);
  if (totalErr > 0) {
    console.log(`${C.red}Fehler = zeigt im EN-Spiel garantiert Deutsch.${C.off} Vor dem Event fuellen.`);
  }
  console.log(`${C.dim}Warnungen sind oft sprachneutral (Zahlen, "km", "%") — kurz durchsehen, nicht blind fuellen.${C.off}`);
  if (!has('--all')) console.log(`${C.dim}--all zeigt auch die Warnungen im Detail.${C.off}`);
  process.exit(totalErr > 0 ? 1 : 0);
})().catch(e => { console.error('check-en-drafts:', e.message); process.exit(2); });
