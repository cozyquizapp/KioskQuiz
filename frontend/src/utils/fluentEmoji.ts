// 2026-05-07 (Wolf-Wunsch 'alle Emojis als Microsoft Fluent'):
// Replaced alle Emoji-Glyphs im DOM durch <img>-Tags mit Fluent-3D-PNGs vom
// jsDelivr-CDN. Damit sehen iOS/Android/Mac/Windows-Spieler exakt die
// gleichen Emojis wie Wolfs Windows-Beamer.
//
// Architektur:
// - Codepoint→Asset-Mapping aus microsoft/fluentui-emoji Repo
//   (1595 Eintraege, generiert via scripts/build-fluent-emoji-map.js)
// - DOM-Replace via emoji-Regex auf Text-Nodes
// - MutationObserver fuer React-Re-Renders (Avatare, Reaktionen, Stickers)
// - Country-Flags werden uebersprungen — die deckt der Twemoji-Country-Flags-
//   Webfont aus main.css ab (Microsoft hat keine Country-Flags im Set).
//
// CDN: https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/<Name>/3D/<filename>_3d.png

import map from '../data/fluentEmojiMap.json';

const FLUENT_CDN = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets';
// 2026-05-07 (Wolf-Bug 'Beamer auf Windows zeigt Buchstaben'): Country-Flags
// kommen NICHT aus Microsoft Fluent (dort gibt's keine), sondern aus dem
// Twemoji-Repo via jsdelivr. Der frühere Webfont-Polyfill war auf manchen
// Browsern unzuverlässig — direktes <img> ist robuster.
const TWEMOJI_CDN = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg';

type Entry = { n: string; f: string };
const fluentMap: Record<string, Entry> = map as Record<string, Entry>;

/**
 * Country-Flag-Codepoints (Regional Indicator Symbol Letters U+1F1E6..U+1F1FF).
 */
function isFlagCodepoint(cp: number): boolean {
  return cp >= 0x1f1e6 && cp <= 0x1f1ff;
}

/**
 * Twemoji-CDN-URL für ein Country-Flag-Glyph.
 * Twemoji-Filename = lowercase hex, '-' separated, ohne Variation Selector.
 */
function twemojiFlagUrl(glyph: string): string | null {
  const codepoints: number[] = [];
  for (const ch of glyph) {
    const cp = ch.codePointAt(0);
    if (cp == null) return null;
    if (cp === 0xfe0f) continue; // VS strippen
    codepoints.push(cp);
  }
  if (codepoints.length === 0) return null;
  const key = codepoints.map(cp => cp.toString(16)).join('-');
  return `${TWEMOJI_CDN}/${key}.svg`;
}

/**
 * Konvertiert ein Emoji-Glyph (1-N Codepoints) in den kanonischen Map-Key.
 * Format: lowercase hex, Codepoints mit '-' getrennt.
 * Variation-Selector U+FE0F wird optional weggelassen — Microsoft mappt
 * Emojis sowohl mit als auch ohne FE0F.
 */
function glyphToKey(glyph: string): string | null {
  const codepoints: number[] = [];
  for (const ch of glyph) {
    const cp = ch.codePointAt(0);
    if (cp == null) return null;
    codepoints.push(cp);
  }
  // Try erst exakt mit FE0F
  const fullKey = codepoints.map(cp => cp.toString(16)).join('-');
  if (fluentMap[fullKey]) return fullKey;
  // Try ohne FE0F (häufiger Fall: Emojis im Text haben FE0F, Map nicht)
  const stripped = codepoints.filter(cp => cp !== 0xfe0f);
  if (stripped.length > 0) {
    const strippedKey = stripped.map(cp => cp.toString(16)).join('-');
    if (fluentMap[strippedKey]) return strippedKey;
  }
  return null;
}

/**
 * Emoji-Detection-Regex. Matcht:
 *  - Country-Flag (zwei Regional Indicators)
 *  - oder Emoji-Cluster (Extended_Pictographic + ZWJ-Sequences + Modifiers)
 * Nicht 100% perfekt — echte emoji-regex Lib waere genauer — deckt aber 99%.
 */
const EMOJI_REGEX =
  /(?:\p{Regional_Indicator}\p{Regional_Indicator}|\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic})*(?:️)?(?:\p{Emoji_Modifier})?)+/gu;

/**
 * Baut die CDN-URL fuer ein gemapptes Emoji.
 */
function urlFor(entry: Entry): string {
  // URL-encode den Folder-Namen (kann Spaces enthalten).
  return `${FLUENT_CDN}/${encodeURIComponent(entry.n)}/3D/${entry.f}_3d.png`;
}

/**
 * Ersetzt Emojis in einem einzelnen Text-Node durch ein DocumentFragment
 * mit <img>-Tags + verbleibenden Text-Knoten. Country-Flags bleiben als
 * Text (Webfont-rendering uebernimmt).
 */
function replaceInTextNode(textNode: Text): void {
  const text = textNode.nodeValue;
  if (!text) return;

  // Quick-Check: enthält der Text ueberhaupt Emojis? Spart 99% der Calls.
  if (!/\p{Extended_Pictographic}/u.test(text)) return;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let didReplace = false;

  for (const match of text.matchAll(EMOJI_REGEX)) {
    const glyph = match[0];
    const start = match.index ?? 0;

    // URL bestimmen: Country-Flag → Twemoji, sonst → Fluent (wenn gemappt).
    let url: string | null = null;
    let alt = glyph;
    const firstCp = glyph.codePointAt(0);
    if (firstCp != null && isFlagCodepoint(firstCp)) {
      url = twemojiFlagUrl(glyph);
    } else {
      const key = glyphToKey(glyph);
      const entry = key ? fluentMap[key] : null;
      if (entry) url = urlFor(entry);
    }
    if (!url) continue;

    // Text vor dem Match anhaengen
    if (start > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));
    }

    // <img> fuer das Emoji
    const img = document.createElement('img');
    img.src = url;
    img.alt = alt;
    img.className = 'qq-fluent-emoji';
    img.setAttribute('aria-label', alt);
    img.draggable = false;
    fragment.appendChild(img);

    lastIndex = start + glyph.length;
    didReplace = true;
  }

  if (!didReplace) return;

  // Rest-Text anhaengen
  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  // Text-Node durch Fragment ersetzen
  textNode.parentNode?.replaceChild(fragment, textNode);
}

/**
 * Skip-Liste: Elemente in denen wir KEINE Replace machen.
 *  - <input>/<textarea>: Replace bricht User-Input
 *  - <script>/<style>: ist eh nicht sichtbar
 *  - Elemente mit class 'qq-fluent-skip': opt-out marker
 */
function shouldSkipElement(el: Element): boolean {
  if (!el.tagName) return true;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'script' || tag === 'style') return true;
  if (tag === 'img') return true; // schon ersetzt
  if (el.classList?.contains('qq-fluent-skip')) return true;
  return false;
}

/**
 * Walk durch einen Element-Subtree und ersetze alle Emoji-Text-Nodes.
 */
function processElement(root: Element | Document): void {
  if (root instanceof Element && shouldSkipElement(root)) return;

  // TreeWalker fuer alle Text-Nodes im Subtree
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let n: Node | null;
  // eslint-disable-next-line no-cond-assign
  while ((n = walker.nextNode())) {
    textNodes.push(n as Text);
  }
  // Replace AFTER walker — sonst beeinflusst das Replace die Iteration
  for (const tn of textNodes) replaceInTextNode(tn);
}

let observer: MutationObserver | null = null;
let initialized = false;

/**
 * Initialisiert globalen DOM-Replace + MutationObserver.
 * Idempotent — mehrfacher Aufruf ist safe.
 */
export function initFluentEmojis(): void {
  if (initialized) return;
  initialized = true;

  // Initial-Replace auf den ganzen Body
  processElement(document.body);

  // MutationObserver: bei React-Re-Renders / dynamic Content nachziehen
  observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processElement(node as Element);
          } else if (node.nodeType === Node.TEXT_NODE) {
            replaceInTextNode(node as Text);
          }
        }
      } else if (m.type === 'characterData') {
        if (m.target.nodeType === Node.TEXT_NODE) {
          replaceInTextNode(m.target as Text);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

/** Optional: Cleanup (z.B. fuer Tests). */
export function disposeFluentEmojis(): void {
  observer?.disconnect();
  observer = null;
  initialized = false;
}
