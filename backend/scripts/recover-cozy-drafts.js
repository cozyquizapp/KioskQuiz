#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const argv = process.argv.slice(2);
const isApply = argv.includes('--apply');
const isDryRun = !isApply;

const fallbackPath = path.resolve(__dirname, '../src/data/cozyQuizDrafts.json');

function extractBalancedObjects(raw) {
  const chunks = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }

    if (ch === '}') {
      if (depth > 0) depth -= 1;
      if (depth === 0 && start >= 0) {
        chunks.push(raw.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return chunks;
}

function normalizeDraft(draft) {
  const out = { ...draft };

  if (!out.status) out.status = 'draft';
  if (typeof out.createdAt === 'number') out.createdAt = new Date(out.createdAt);
  if (typeof out.updatedAt === 'number') out.updatedAt = new Date(out.updatedAt);
  if (!out.createdAt) out.createdAt = new Date();
  if (!out.updatedAt) out.updatedAt = new Date();

  delete out._id;
  delete out.__v;
  return out;
}

function collectRecoverableDrafts(raw) {
  const objects = extractBalancedObjects(raw);
  const byId = new Map();

  for (const chunk of objects) {
    try {
      const obj = JSON.parse(chunk);
      const isDraft =
        obj &&
        typeof obj === 'object' &&
        typeof obj.id === 'string' &&
        obj.meta &&
        Array.isArray(obj.questions);

      if (!isDraft) continue;

      const normalized = normalizeDraft(obj);
      const prev = byId.get(normalized.id);

      if (!prev) {
        byId.set(normalized.id, normalized);
        continue;
      }

      const prevUpdated = new Date(prev.updatedAt || 0).getTime();
      const nextUpdated = new Date(normalized.updatedAt || 0).getTime();
      if (nextUpdated >= prevUpdated) byId.set(normalized.id, normalized);
    } catch {
      // Skip non-JSON chunks.
    }
  }

  return Array.from(byId.values());
}

async function importDrafts(drafts) {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    throw new Error('MONGODB_URI or DATABASE_URL is required for --apply');
  }

  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection('cozyquizdrafts');

  let upserts = 0;
  for (const draft of drafts) {
    const result = await collection.updateOne(
      { id: draft.id },
      { $set: draft, $setOnInsert: { createdAt: draft.createdAt || new Date() } },
      { upsert: true }
    );

    if (result.upsertedCount > 0 || result.modifiedCount > 0) upserts += 1;
  }

  await mongoose.disconnect();
  return upserts;
}

async function main() {
  if (!fs.existsSync(fallbackPath)) {
    throw new Error(`Fallback file not found: ${fallbackPath}`);
  }

  const raw = fs.readFileSync(fallbackPath, 'utf8');
  const drafts = collectRecoverableDrafts(raw);

  console.log(`Mode: ${isDryRun ? 'dry-run' : 'apply'}`);
  console.log(`Found recoverable drafts: ${drafts.length}`);
  console.log(`Draft IDs: ${drafts.map((d) => d.id).join(', ') || '(none)'}`);

  if (isDryRun) {
    console.log('Dry-run complete. No DB writes performed.');
    return;
  }

  const changed = await importDrafts(drafts);
  console.log(`Import complete. Upserted/updated drafts: ${changed}`);
}

main().catch((err) => {
  console.error('Recovery failed:', err.message);
  process.exit(1);
});
