// 2026-05-07 — Build Codepoint→Fluent-Emoji-Asset-Mapping aus dem
// microsoft/fluentui-emoji Repo. Output landet als JSON in
// frontend/src/data/fluentEmojiMap.json.
//
// Pre-Requisite: das Repo muss lokal sparse-geklont sein:
//   git clone --depth=1 --filter=blob:none --sparse https://github.com/microsoft/fluentui-emoji.git /c/temp/fluent-emoji
//   cd /c/temp/fluent-emoji && git sparse-checkout set assets
//
// Usage: node scripts/build-fluent-emoji-map.js
//
// Output-Format:
//   {
//     "1f98a": { "n": "Fox", "f": "fox" },        // einfacher Codepoint
//     "1f468-200d-1f680": { "n": "...", "f": "..." }  // ZWJ-Sequence
//   }
// n = Folder-Name (mit Spaces), f = filename-Stem (lowercase, _ statt space).
// Beim Render: URL = `${CDN}/${n}/3D/${f}_3d.png`
//
// Skin-Tone-Varianten (z.B. fox + medium-light skin-tone) werden uebersprungen
// — sie sind im fluentui-emoji-Repo unter "Default"-Subfolders, nicht relevant
// fuer unsere App.

const fs = require('node:fs');
const path = require('node:path');

const ASSETS_DIR = 'C:/temp/fluent-emoji/assets';
const OUT_FILE = path.join(__dirname, '..', 'frontend', 'src', 'data', 'fluentEmojiMap.json');

if (!fs.existsSync(ASSETS_DIR)) {
  console.error('ERR: ' + ASSETS_DIR + ' existiert nicht. Klone das Repo zuerst (siehe Header).');
  process.exit(1);
}

const folders = fs.readdirSync(ASSETS_DIR).filter(name => {
  const stat = fs.statSync(path.join(ASSETS_DIR, name));
  return stat.isDirectory();
});

const map = {};
let withMeta = 0;
let skipped = 0;

for (const folder of folders) {
  const metaPath = path.join(ASSETS_DIR, folder, 'metadata.json');
  if (!fs.existsSync(metaPath)) {
    skipped++;
    continue;
  }
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const unicode = meta.unicode;
    if (typeof unicode !== 'string' || unicode.length === 0) {
      skipped++;
      continue;
    }
    // Normalize: lowercase, separator '-' (Microsoft nutzt ' ' im Unicode-Field
    // — z.B. '1f468 200d 1f680'). Wir nutzen '-' als kanonischer Separator.
    const key = unicode.toLowerCase().split(/\s+/).join('-');
    // filename-stem: cldr lowercase + space → _ + special chars cleanup
    const filename = (meta.cldr || folder.toLowerCase())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    map[key] = { n: folder, f: filename };
    withMeta++;
  } catch (err) {
    console.warn(`Skip ${folder}: ${err.message}`);
    skipped++;
  }
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(map, null, 0), 'utf-8');

console.log(`Built mapping: ${withMeta} entries, ${skipped} skipped.`);
console.log(`Output: ${OUT_FILE}`);
console.log(`Size: ${(fs.statSync(OUT_FILE).size / 1024).toFixed(1)} KB`);
