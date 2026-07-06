/**
 * reelCapture.ts — HD-Standbild-Export von 9:16-Reel-Frames (Slideshow → Fotos).
 *
 * 2026-07-06 (Wolf): erst einzelner „⬇ HD"-Download je Folie, dann „kann ich nicht
 * ein ganzes Reel auf einmal als ZIP? oder gleich alle?" → einzelne PNGs gebuendelt.
 *
 * Warum die Standbild-Anpassung noetig ist: die Reels sind LIVE animiert (Einblenden
 * via `animation: ... both`, verzoegerte Reveals). Ein naiver Screenshot erwischt eine
 * Einblende mitten im Fade → Elemente unsichtbar (opacity 0) oder verrutscht. Fuer ein
 * STANDbild zwingen wir darum im geklonten DOM jede Animation auf ihren Endzustand
 * (grosser negativer `animation-delay` → bei fill:both/forwards haelt der letzte
 * Keyframe; Endlos-Loops iteration-count 1 → sie ruhen). Weil alle Frage-Reveals
 * CSS-Delay + `both` sind (revealCorrect/popIn/fadeUp/stealOut), erscheinen sie damit
 * automatisch „aufgeloest" — ohne 2s pro Szene zu warten.
 *
 * html2canvas 1.4.1 crasht („IndexSizeError") bei Emoji, das MIT Text im selben
 * Textknoten steht → Emoji nur aus GEMISCHTEN Knoten strippen (reine Emoji-Zeilen
 * bleiben). Overlay-UI (Nav/Schliessen) traegt `data-no-capture` und wird im Klon
 * entfernt. ZIP: eigener „stored"-Encoder (PNG ist schon komprimiert), keine Dep.
 */
import type { RefObject } from 'react';

// ── html2canvas-Capture eines 9:16-Frames ────────────────────────────────────

/** Emoji-Crash-Guard: Emoji nur aus GEMISCHTEN Text+Emoji-Knoten strippen. */
function stripMixedEmoji(root: HTMLElement): void {
  const emojiRe = /(?:\p{Extended_Pictographic}|️|‍)/gu;
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  textNodes.forEach((n) => {
    const t = n.textContent || '';
    const stripped = t.replace(emojiRe, '');
    if (stripped !== t && stripped.trim().length > 0) {
      n.textContent = stripped.replace(/\s{2,}/g, ' ').replace(/^\s+/, '');
    }
  });
}

type FixedSize = { w: number; h: number };

/**
 * Rendert einen Frame als Canvas, ~targetW breit (Default 1080 → 1080×1920).
 *
 * `fixed` (z.B. {w:1080,h:1350} fuers 4:5-Karussell): rendert die Folie in einen
 * fest dimensionierten OFFSCREEN-Klon und fotografiert den. Das ist der zuverlaessige
 * Weg — Container-Query-Einheiten (cqw/cqh) loesen sich sonst in html2canvas gegen ein
 * anderes Format auf → falsches Seitenverhaeltnis + verrutschte Elemente (Wolf-Bug
 * 2026-07-06: 4:5-Karussell kam als 9:16 raus). Fest = deterministisch = Export==Vorschau.
 */
export async function captureReelCanvas(node: HTMLElement, targetW = 1080, fixed?: FixedSize): Promise<HTMLCanvasElement> {
  try {
    if ((document as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready) {
      await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready;
    }
  } catch { /* ignore */ }

  const html2canvas = (await import('html2canvas')).default;

  if (fixed) {
    // Der Aufrufer hat den ECHTEN Frame bereits auf fixed.w × fixed.h px gesetzt
    // (React-State, offscreen). Der Browser hat das Layout in Zielgroesse gemacht →
    // alle cq-Einheiten sind zu Pixeln aufgeloest. html2canvas liest diese fertigen
    // Pixel (kein Klon mit falscher cq-Aufloesung mehr → Inhalt in korrekter Groesse).
    return html2canvas(node, {
      scale: targetW / fixed.w,
      width: fixed.w,
      height: fixed.h,
      windowWidth: fixed.w,
      windowHeight: fixed.h,
      backgroundColor: null,
      useCORS: true,
      logging: false,
      onclone: (_doc: Document, clone: HTMLElement) => {
        clone.querySelectorAll('[data-no-capture]').forEach((el) => el.remove());
        clone.querySelectorAll<HTMLElement>('*').forEach((el) => {
          if (!el.style) return;
          el.style.animation = 'none';
          el.style.transition = 'none';
          if (el.style.filter) el.style.filter = 'none';
        });
        clone.style.animation = 'none';
        clone.style.borderRadius = '0';
        clone.style.boxShadow = 'none';
        stripMixedEmoji(clone);
      },
    });
  }

  // Standard-Pfad (Reels, Live-Frame skaliert).
  const rect = node.getBoundingClientRect();
  const scale = Math.min(6, Math.max(1, targetW / Math.max(1, rect.width)));
  return html2canvas(node, {
    scale,
    backgroundColor: null,
    useCORS: true,
    logging: false,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
    onclone: (_doc: Document, clone: HTMLElement) => {
      clone.querySelectorAll('[data-no-capture]').forEach((el) => el.remove());
      clone.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if (!el.style) return;
        el.style.animationDelay = '-1s';
        el.style.animationDuration = '0.001s';
        el.style.animationIterationCount = '1';
        el.style.animationFillMode = 'both';
        el.style.transition = 'none';
        if (el.style.filter) el.style.filter = 'none';
      });
      clone.style.animation = 'none';
      clone.style.transition = 'none';
      stripMixedEmoji(clone);
    },
  });
}

/** Frame → PNG-Bytes (verlustfrei). */
export async function captureReelBytes(node: HTMLElement, targetW = 1080, fixed?: FixedSize): Promise<Uint8Array> {
  const canvas = await captureReelCanvas(node, targetW, fixed);
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob() lieferte null'))), 'image/png');
  });
  return new Uint8Array(await blob.arrayBuffer());
}

/** Laedt eine einzelne Folie als HD-PNG herunter. */
export async function downloadReelSlide(node: HTMLElement, filename: string, targetW = 1080, fixed?: FixedSize): Promise<void> {
  const canvas = await captureReelCanvas(node, targetW, fixed);
  downloadBlob(await canvasToPngBlob(canvas), filename);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob() lieferte null'))), 'image/png');
  });
}

// ── Batch: alle Szenen eines Reels durchlaufen ───────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/**
 * Steppt Szene 0..count-1 durch, wartet aufs Mounten und fotografiert jede.
 * Aufrufer muss vorher in den Slideshow-Modus (kein Auto-Weiterlauf!), sonst
 * kaempft der Auto-Stepper gegen setScene.
 */
export async function runSlideExport(opts: {
  frameRef: RefObject<HTMLElement>;
  count: number;
  setScene: (i: number) => void;
  settleMs?: number;
  targetW?: number;
  fixed?: FixedSize;
  onProgress?: (done: number, total: number) => void;
}): Promise<Uint8Array[]> {
  const { frameRef, count, setScene, settleMs = 380, targetW = 1080, fixed, onProgress } = opts;
  const out: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    setScene(i);
    await nextFrame();
    await sleep(settleMs); // Mount + Bilder/Avatare laden lassen
    const node = frameRef.current;
    if (!node) throw new Error('Frame-Ref ist leer');
    out.push(await captureReelBytes(node, targetW, fixed));
    onProgress?.(i + 1, count);
  }
  return out;
}

/**
 * Liefert die fertig gerenderten Frames aus dem Auto-Export-Modus (`?export=…`):
 * `zip` → Reel laedt sein eigenes ZIP herunter; `frames` → Bytes per postMessage
 * an das Eltern-Fenster (fuer den „alle Reels"-Sammler auf /reels).
 */
export async function deliverReelExport(mode: 'zip' | 'frames', bytes: Uint8Array[], slug: string): Promise<void> {
  if (mode === 'frames' && window.parent && window.parent !== window) {
    const buffers = bytes.map((b) => b.buffer as ArrayBuffer);
    window.parent.postMessage({ type: 'cozyreel-frames', frames: buffers }, window.location.origin, buffers);
    return;
  }
  // Default/zip: selbst als ZIP herunterladen.
  const files = bytes.map((data, i) => ({ name: `${slug}-${String(i + 1).padStart(2, '0')}.png`, data }));
  downloadBlob(zipStore(files), `cozyquiz-${slug}-slides.zip`);
}

/**
 * „Alle Reels": laedt eine Reel-URL (mit `?export=frames`) in ein verstecktes
 * iframe, das sich selbst durchsteppt und die Frames zurueckpostet.
 */
export function captureReelFramesViaIframe(url: string, timeoutMs = 180000): Promise<Uint8Array[]> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    // 9:16-Viewport, weit ausserhalb des Sichtfelds. Der Frame fuellt es via 100dvh.
    iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:405px;height:720px;border:0;opacity:0;pointer-events:none;';
    const onMsg = (ev: MessageEvent) => {
      if (ev.source !== iframe.contentWindow) return;
      const d = ev.data as { type?: string; frames?: ArrayBuffer[]; message?: string };
      if (d?.type === 'cozyreel-frames' && d.frames) {
        cleanup();
        resolve(d.frames.map((b) => new Uint8Array(b)));
      } else if (d?.type === 'cozyreel-error') {
        cleanup();
        reject(new Error(d.message || 'Reel-Export-Fehler'));
      }
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Timeout: ' + url)); }, timeoutMs);
    function cleanup() {
      window.removeEventListener('message', onMsg);
      clearTimeout(timer);
      iframe.remove();
    }
    window.addEventListener('message', onMsg);
    iframe.src = url;
    document.body.appendChild(iframe);
  });
}

// ── Download-Helper ──────────────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ── Minimaler ZIP-Encoder (Methode „stored", ohne Kompression) ───────────────
// PNGs sind bereits komprimiert → „stored" ist praktisch verlustfrei in der Groesse
// und spart die deflate-Dependency komplett.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  return (c ^ 0xffffffff) >>> 0;
}

export function zipStore(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const parts: BlobPart[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.data);
    const size = f.data.length;

    const lh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    lh.set(nameBytes, 30);
    parts.push(lh as BlobPart, f.data as BlobPart);

    const ch = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    ch.set(nameBytes, 46);
    central.push(ch);

    offset += lh.length + size;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const c of central) { parts.push(c as BlobPart); cdSize += c.length; }

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);
  ev.setUint16(20, 0, true);
  parts.push(eocd);

  return new Blob(parts, { type: 'application/zip' });
}
