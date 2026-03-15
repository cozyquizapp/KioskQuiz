/**
 * auto-translate-questions.js
 * One-time migration: translates all existing draft questions via DeepL
 * and saves the results back to MongoDB through the backend API.
 *
 * Usage:
 *   node scripts/auto-translate-questions.js            # dry-run (shows what would change)
 *   node scripts/auto-translate-questions.js --apply    # actually saves
 *
 * Requires DEEPL_API_KEY env var (same key as on Render):
 *   DEEPL_API_KEY=xxx node scripts/auto-translate-questions.js --apply
 */

const API_BASE = process.env.API_BASE || 'https://cozyquiz-backend.onrender.com/api';
const DEEPL_KEY = process.env.DEEPL_API_KEY;
const APPLY = process.argv.includes('--apply');

if (!DEEPL_KEY) {
  console.error('ERROR: DEEPL_API_KEY env var is required.');
  console.error('  Usage: DEEPL_API_KEY=xxx node scripts/auto-translate-questions.js --apply');
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function translate(text) {
  if (!text?.trim()) return text;
  await sleep(300); // avoid bursting DeepL
  const de = text.includes('/') ? text.split('/')[0].trim() : text;
  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: { 'Authorization': `DeepL-Auth-Key ${DEEPL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: [de], source_lang: 'DE', target_lang: 'EN' }),
  });
  const data = await res.json();
  const translated = data?.translations?.[0]?.text?.trim();
  if (!translated) throw new Error(`DeepL returned no translation for: "${de}"`);
  return translated;
}

const isStale = (val) => !val || String(val).toUpperCase().startsWith('MYMEMORY') || String(val).toUpperCase().startsWith('WHICH CONTINENT');

async function translateQuestion(q) {
  const updates = {};

  if (isStale(q.questionEn) && q.question)
    updates.questionEn = await translate(q.question);

  if (Array.isArray(q.options) && q.options.length > 0) {
    const needsOptions = !q.optionsEn || q.optionsEn.some(isStale) || q.options.some(o => o.includes('/'));
    if (needsOptions) {
      updates.optionsEn = [];
      for (const opt of q.options) {
        updates.optionsEn.push(await translate(opt));
      }
    }
  }

  if (isStale(q.answerEn) && q.answer)
    updates.answerEn = await translate(q.answer);

  if (Array.isArray(q.correctOrder) && q.correctOrder.length > 0 && !q.correctOrderEn) {
    updates.correctOrderEn = [];
    for (const item of q.correctOrder) {
      updates.correctOrderEn.push(await translate(item));
    }
  }

  return updates;
}

async function processDraft(draft) {
  if (!Array.isArray(draft.questions) || draft.questions.length === 0) return 0;
  console.log(`\nDraft: "${draft.title || draft.id}" (${draft.questions.length} questions)`);

  let changed = 0;
  const updatedQuestions = [];

  for (const q of draft.questions) {
    try {
      const updates = await translateQuestion(q);
      if (Object.keys(updates).length === 0) {
        updatedQuestions.push(q);
        continue;
      }
      changed++;
      const merged = { ...q, ...updates };
      updatedQuestions.push(merged);
      console.log(`  [${q.id?.slice(0, 8)}] "${String(q.question).slice(0, 50)}"`);
      if (updates.questionEn) console.log(`    questionEn: "${updates.questionEn}"`);
      if (updates.optionsEn) console.log(`    optionsEn: [${updates.optionsEn.join(' | ')}]`);
      if (updates.answerEn)  console.log(`    answerEn: "${updates.answerEn}"`);
    } catch (err) {
      console.error(`  ✗ ${q.id}: ${err.message}`);
      updatedQuestions.push(q);
    }
  }

  if (changed > 0 && APPLY) {
    const putRes = await fetch(`${API_BASE}/studio/cozy60/${draft.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, questions: updatedQuestions }),
    });
    if (!putRes.ok) {
      console.error(`  ✗ Save failed: ${await putRes.text()}`);
    } else {
      console.log(`  ✓ Saved (${changed} questions updated)`);
    }
  } else if (changed > 0) {
    console.log(`  → Would update ${changed} questions (dry-run)`);
  } else {
    console.log(`  ✓ All translations up to date`);
  }

  return changed;
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (will save to MongoDB)' : 'DRY RUN (no changes)'}`);
  console.log(`API:  ${API_BASE}\n`);

  const res = await fetch(`${API_BASE}/studio/cozy60`);
  if (!res.ok) throw new Error(`Failed to fetch drafts: ${res.status} ${await res.text()}`);
  const body = await res.json();
  const drafts = body.drafts ?? body;
  console.log(`Found ${drafts.length} draft(s)`);

  let total = 0;
  for (const draftMeta of drafts) {
    // Fetch full draft (with questions) individually
    const detailRes = await fetch(`${API_BASE}/studio/cozy60/${draftMeta.id}`);
    if (!detailRes.ok) { console.error(`Failed to fetch draft ${draftMeta.id}`); continue; }
    const detail = await detailRes.json();
    const draft = detail.draft ?? detail;
    total += await processDraft(draft);
  }

  console.log(`\n--- Done: ${total} question(s) ${APPLY ? 'updated' : 'would be updated'} ---`);
  if (!APPLY) console.log('Run with --apply to save.');
}

main().catch(console.error);
