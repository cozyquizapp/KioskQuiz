// i18n-Audit: findet hardcoded deutsche Strings in TSX-Files ohne nahen lang-Branch.
//
// Heuristik:
//  1. Suche Strings mit Umlauten / typischen DE-Wörtern in JSX oder Quotes
//  2. Schaue ±8 Zeilen Umfeld nach einer Lang-Branch-Indikator:
//     lang === 'de' / 'en', isEn, isDe, useLangFlip, { de: ..., en: ... },
//     t(key, lang, fallback), de ? 'X' : 'Y'
//  3. Reportet nur Lines OHNE solchen Indikator im Umfeld
//
// Wichtig: das Script hat false positives wenn der Lang-Branch weiter
// als 8 Zeilen entfernt ist (z.B. wenn die Build-Function 50+ Zeilen
// vorher den lang-Parameter erhält). Im Zweifel manuell verifizieren.
//
// Usage: node scripts/audit-i18n.mjs [PATH-PREFIX]
//   Default: scannt frontend/src/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'frontend', 'src');
const SCOPE = process.argv[2] ? path.resolve(__dirname, '..', process.argv[2]) : ROOT;

const DE_MARKERS = /[\'"`>][^\'"`<]*[äöüÄÖÜß][^\'"`<]*[\'"`<]/u;
const LANG_BRANCH = new RegExp(
  [
    `lang\\s*===\\s*['"](?:de|en)['"]`,
    `\\blang\\s*\\?\\s*['"]`,
    `\\bde\\s*\\?\\s*['"]`,
    `\\bisEn\\b|\\bisDe\\b|\\bisEN\\b|\\bisDE\\b`,
    `useLangFlip`,
    `\\{\\s*de:|\\sde:\\s*['"]`,
    `\\sen:\\s*['"]`,
    `t\\(['"][^'"]+['"],\\s*lang`,
    `getRuleText\\(['"][^'"]+['"],\\s*lang`,
    `[a-zA-Z]+(?:De|EN)\\s*=`,        // actionTextDe = / labelEN =
    `[a-zA-Z]+(?:En|DE)\\s*=`,
  ].join('|'),
  'i',
);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && /\.(tsx|ts)$/.test(e.name)) yield p;
  }
}

let totalIssues = 0;
const findings = [];
for (const p of walk(SCOPE)) {
  const txt = fs.readFileSync(p, 'utf-8');
  const lines = txt.split('\n');
  const fileIssues = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    if (trimmed.startsWith('import ')) continue;
    if (/^\s*\*/.test(line)) continue;
    if (!DE_MARKERS.test(line)) continue;
    const ctxStart = Math.max(0, i - 8);
    const ctxEnd = Math.min(lines.length, i + 8);
    const ctx = lines.slice(ctxStart, ctxEnd).join('\n');
    if (LANG_BRANCH.test(ctx)) continue;
    const m = line.match(DE_MARKERS);
    fileIssues.push({ line: i + 1, snippet: (m ? m[0] : line.trim()).slice(0, 100) });
  }
  if (fileIssues.length > 0) {
    findings.push({ file: path.relative(ROOT, p), issues: fileIssues });
    totalIssues += fileIssues.length;
  }
}

for (const { file, issues } of findings) {
  console.log(`\n📋 ${file} — ${issues.length} potential hardcoded:`);
  for (const { line, snippet } of issues.slice(0, 15)) {
    console.log(`  L${line}: ${snippet}`);
  }
  if (issues.length > 15) console.log(`  ... and ${issues.length - 15} more`);
}

console.log(`\n═════════════════════════════════════════════`);
console.log(`Total: ${totalIssues} potential hardcoded strings in ${findings.length} files.`);
if (totalIssues === 0) console.log(`✅ Keine offensichtlichen hardcoded DE-Strings.`);
else console.log(`💡 Manuell verifizieren: viele "Treffer" sind oft Fallbacks in lang-spezifischen Build-Functions (false positives).`);
