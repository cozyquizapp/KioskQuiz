#!/usr/bin/env node
// Extracts all valid top-level draft objects from a potentially corrupted cozyQuizDrafts.json
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/data/cozyQuizDrafts.json');
const raw = fs.readFileSync(filePath, 'utf8');

function extractTopLevelObjects(text) {
  const chunks = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') { if (depth === 0) start = i; depth++; continue; }
    if (ch === '}') {
      if (depth > 0) depth--;
      if (depth === 0 && start >= 0) {
        chunks.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return chunks;
}

const objects = extractTopLevelObjects(raw);
const drafts = [];
const seen = new Set();

for (const chunk of objects) {
  try {
    const obj = JSON.parse(chunk);
    if (
      obj &&
      typeof obj.id === 'string' &&
      obj.meta &&
      Array.isArray(obj.questions)
    ) {
      if (!seen.has(obj.id)) {
        seen.add(obj.id);
        drafts.push(obj);
      }
    }
  } catch {
    // skip non-parseable or non-draft objects
  }
}

console.log('Recovered drafts:');
drafts.forEach(d => console.log(' -', d.id, '|', d.meta && d.meta.title));

fs.writeFileSync(filePath, JSON.stringify(drafts, null, 2), 'utf-8');
console.log('\nFixed: ' + filePath + ' now contains ' + drafts.length + ' valid draft(s).');
