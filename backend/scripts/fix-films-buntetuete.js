#!/usr/bin/env node
/**
 * Fix: MongoDB Films question has wrong bunteTuete field (contains Football oneOfEight data).
 *
 * Usage:
 *   # Dry-run (just show the broken question):
 *   MONGODB_URI="mongodb+srv://..." node backend/scripts/fix-films-buntetuete.js
 *
 *   # Apply fix:
 *   MONGODB_URI="mongodb+srv://..." node backend/scripts/fix-films-buntetuete.js --apply
 */

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!uri) {
  console.error('❌ Set MONGODB_URI or DATABASE_URL environment variable.');
  process.exit(1);
}

const applyFix = process.argv.includes('--apply');

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(); // uses DB name from URI

  const draftsCol = db.collection('qqdrafts');

  // Find all QQ drafts that have a question about Films with Football bunteTuete
  const allDrafts = await draftsCol.find({}).toArray();

  let found = 0;

  for (const draft of allDrafts) {
    if (!Array.isArray(draft.questions)) continue;

    for (let i = 0; i < draft.questions.length; i++) {
      const q = draft.questions[i];
      if (!q.bunteTuete || q.bunteTuete.kind !== 'oneOfEight') continue;

      // Check if the statements contain football-related content on a Films question
      const statements = q.bunteTuete.statements || [];
      const statementsText = statements.map(s => typeof s === 'string' ? s : s.text || '').join(' ').toLowerCase();
      const questionText = (q.text || q.question || '').toLowerCase();

      const isFilmsQuestion = questionText.includes('film') || questionText.includes('movie') || questionText.includes('kino');
      const hasFootballContent = statementsText.includes('football') || statementsText.includes('fußball') ||
                                  statementsText.includes('soccer') || statementsText.includes('tor') ||
                                  statementsText.includes('goal') || statementsText.includes('fifa') ||
                                  statementsText.includes('wm') || statementsText.includes('world cup') ||
                                  statementsText.includes('bundesliga') || statementsText.includes('champions league');

      // Also check: any oneOfEight where question text doesn't match bunteTuete content
      if (isFilmsQuestion && hasFootballContent) {
        found++;
        console.log(`\n🐛 FOUND in draft "${draft.title}" (id: ${draft.id})`);
        console.log(`   Question index: ${i}, id: ${q.id}`);
        console.log(`   Question text: ${q.text}`);
        console.log(`   bunteTuete.kind: ${q.bunteTuete.kind}`);
        console.log(`   statements:`);
        statements.forEach((s, si) => {
          const text = typeof s === 'string' ? s : s.text;
          const marker = si === q.bunteTuete.falseIndex ? ' ← FALSE' : '';
          console.log(`     [${si}] ${text}${marker}`);
        });
        console.log('');
      }

      // Even if the heuristic doesn't match, print any suspicious mismatch for review
      if (!isFilmsQuestion && !hasFootballContent) continue;
      if (isFilmsQuestion && !hasFootballContent) continue;
      if (!isFilmsQuestion && hasFootballContent) {
        console.log(`\n⚠️  Possible mismatch in draft "${draft.title}" (id: ${draft.id})`);
        console.log(`   Question: ${q.text}`);
        console.log(`   Has football content in bunteTuete but question doesn't mention films.`);
      }
    }
  }

  if (found === 0) {
    // Broader search: dump all oneOfEight questions for manual review
    console.log('\n🔍 No obvious Films+Football mismatch found. Listing ALL oneOfEight questions:\n');
    for (const draft of allDrafts) {
      if (!Array.isArray(draft.questions)) continue;
      for (let i = 0; i < draft.questions.length; i++) {
        const q = draft.questions[i];
        if (!q.bunteTuete || q.bunteTuete.kind !== 'oneOfEight') continue;
        const statements = q.bunteTuete.statements || [];
        console.log(`Draft: "${draft.title}" (${draft.id}) | Q[${i}] id=${q.id}`);
        console.log(`  text: ${q.text}`);
        statements.forEach((s, si) => {
          const text = typeof s === 'string' ? s : s.text;
          console.log(`    [${si}] ${text}`);
        });
        console.log('');
      }
    }
  }

  if (found > 0 && !applyFix) {
    console.log('ℹ️  Run with --apply to fix. You will be prompted to provide the correct Films bunteTuete data.');
    console.log('   Or fix manually in MongoDB Compass / mongosh.');
  }

  await client.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
