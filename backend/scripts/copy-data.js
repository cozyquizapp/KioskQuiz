#!/usr/bin/env node
// 2026-05-01: tsc kopiert keine JSON-Files ins dist/. Production-Server
// laed cozyQuizDrafts.json (und andere data/*.json) zur Runtime via
// fs.readFileSync ODER require - beides braucht das File im dist.
// Dieser Post-Build-Step copiert alle JSON-Files aus src/data nach
// dist/backend/src/data, damit der Server sie zur Runtime findet.

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'data');
const destDir = path.join(__dirname, '..', 'dist', 'backend', 'src', 'data');

if (!fs.existsSync(srcDir)) {
  console.log('[copy-data] src/data nicht gefunden, skip');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.json'));

if (files.length === 0) {
  console.log('[copy-data] keine JSON-Files in src/data, skip');
  process.exit(0);
}

for (const file of files) {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(destDir, file);
  fs.copyFileSync(srcPath, destPath);
  console.log(`[copy-data] ${file} -> ${path.relative(process.cwd(), destPath)}`);
}
console.log(`[copy-data] ${files.length} JSON-File(s) kopiert`);
