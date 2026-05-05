// 2026-05-05 (Wolf-Wunsch): Bild-Upload mit automatischer Client-Side-
// Komprimierung wenn die Datei >2MB ist. Statt 'Datei zu gross'-Fehler:
// auf Canvas zeichnen mit reduzierter Aufloesung + JPEG-Quality, bis das
// Ergebnis unter dem Cap liegt.

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_DIMENSION = 1920;        // px — Quad/Wide-Bilder werden auf max 1920 skaliert
const QUALITY_STEPS = [0.85, 0.78, 0.7, 0.6, 0.5];

/** Liest File als Image-Element. */
function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht geladen werden')); };
    img.src = url;
  });
}

/** Komprimiert bei Bedarf — gibt original zurueck wenn schon klein genug. */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= MAX_BYTES) return file;
  if (!file.type.startsWith('image/')) return file;
  const img = await fileToImage(file);
  // Ziel-Dimensionen: max 1920 in beiden Achsen, Aspect-Ratio behalten.
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const targetW = Math.round(img.width * ratio);
  const targetH = Math.round(img.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // JPEG mit progressiv niedrigeren Qualitaeten probieren bis unter Cap.
  for (const q of QUALITY_STEPS) {
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', q));
    if (!blob) continue;
    if (blob.size <= MAX_BYTES) {
      const newName = file.name.replace(/\.(png|webp|jpe?g|gif)$/i, '') + '.jpg';
      return new File([blob], newName, { type: 'image/jpeg' });
    }
  }
  // Letzter Fallback: bei q=0.5 immer noch zu gross — geben wir trotzdem zurueck,
  // Backend hat oft eigenen 5MB-Cap, das passt dann meist.
  const finalBlob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.5));
  if (!finalBlob) return file;
  const newName = file.name.replace(/\.(png|webp|jpe?g|gif)$/i, '') + '.jpg';
  return new File([finalBlob], newName, { type: 'image/jpeg' });
}
