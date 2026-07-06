/**
 * reelCapture.ts — HD-Standbild-Export eines 9:16-Reel-Frames (Slideshow → Foto).
 *
 * 2026-07-06 (Wolf): „mach die Bilder per Klick runterladbar in HD, und denk dran
 * sie muessen etwas angepasst sein, weil sie ja nicht animiert sind."
 *
 * Warum die Anpassung noetig ist: die Reels sind LIVE animiert (Einblenden via
 * `animation: ... both`, verzoegerte Reveals). Ein naiver Screenshot erwischt eine
 * Einblende mitten im Fade → Elemente unsichtbar (opacity 0) oder verrutscht.
 * Fuer ein STANDbild zwingen wir darum im geklonten DOM jede Animation auf ihren
 * Endzustand:
 *   - grosser negativer `animation-delay` (-1s) → bei fill:both/forwards haelt der
 *     letzte Keyframe (das Element sitzt final, voll sichtbar);
 *   - Endlos-Loops bekommen iteration-count 1 → sie ruhen statt zu flackern;
 *   - Transitions aus, Filter aus (die schluckt html2canvas eh oft).
 *
 * Ausserdem: html2canvas 1.4.1 crasht („IndexSizeError") bei Emoji, das MIT Text im
 * selben Textknoten steht. Darum Emoji nur aus GEMISCHTEN Knoten strippen (reine
 * Emoji-Zeilen bleiben). Overlay-UI (Nav, Schliessen, Pause) traegt `data-no-capture`
 * und wird im Klon entfernt, damit es nicht mit aufs Bild kommt.
 */

/** Laedt einen 9:16-Frame als HD-PNG herunter (Default-Zielbreite 1080 → 1080×1920). */
export async function downloadReelSlide(
  node: HTMLElement,
  filename: string,
  targetW = 1080,
): Promise<void> {
  try {
    // Fonts fertig laden lassen, sonst faellt der Brand-Font im Bild zurueck.
    if ((document as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready) {
      await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready;
    }
  } catch { /* ignore */ }

  const html2canvas = (await import('html2canvas')).default;
  const rect = node.getBoundingClientRect();
  // Immer ~targetW breit ausgeben, egal wie gross der Frame gerade am Screen ist.
  const scale = Math.min(6, Math.max(1, targetW / Math.max(1, rect.width)));

  const canvas = await html2canvas(node, {
    scale,
    backgroundColor: null,
    useCORS: true,
    logging: false,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
    onclone: (_doc: Document, clone: HTMLElement) => {
      // 1) Overlay-UI (Nav/Schliessen/Pause) raus — soll nicht aufs Bild.
      clone.querySelectorAll('[data-no-capture]').forEach((el) => el.remove());

      // 2) Alle Animationen auf Endzustand zwingen (Standbild statt Mitten-im-Fade).
      clone.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if (!el.style) return;
        el.style.animationDelay = '-1s';
        el.style.animationDuration = '0.001s';
        el.style.animationIterationCount = '1';
        el.style.animationFillMode = 'both';
        el.style.transition = 'none';
        if (el.style.filter) el.style.filter = 'none';
      });
      // Den Frame selbst auch (er hat evtl. eigene Anim/Transition).
      clone.style.animation = 'none';
      clone.style.transition = 'none';

      // 3) Emoji-Crash-Guard: Emoji nur aus gemischten Text+Emoji-Knoten strippen.
      const emojiRe = /(?:\p{Extended_Pictographic}|️|‍)/gu;
      const doc = clone.ownerDocument;
      const walker = doc.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
      textNodes.forEach((n) => {
        const t = n.textContent || '';
        const stripped = t.replace(emojiRe, '');
        if (stripped !== t && stripped.trim().length > 0) {
          n.textContent = stripped.replace(/\s{2,}/g, ' ').replace(/^\s+/, '');
        }
      });
    },
  });

  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
