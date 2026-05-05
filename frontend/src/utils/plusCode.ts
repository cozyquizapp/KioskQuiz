// 2026-05-05 (Wolf-Wunsch): Plus Code (Open Location Code) → lat/lng.
// Eingabe-Formate:
//   - FULL Code: "8FVC9G8F+5W" → direkt clientside dekodierbar
//   - SHORT Code mit Referenzort: "4H7F+RX Boks, Albanien"
//     → Referenz wird via Nominatim geocoded, Short→Full recovered, decoded
//
// Spec: https://github.com/google/open-location-code

const ALPHABET = '23456789CFGHJMPQRVWX';
const SEPARATOR = '+';

function digit(c: string): number {
  const idx = ALPHABET.indexOf(c.toUpperCase());
  return idx;
}

function isValidChar(c: string): boolean {
  return digit(c) >= 0 || c === SEPARATOR || c === '0';
}

/** Echter FULL Plus Code (mind. 8 chars vor +)? */
export function isFullPlusCode(code: string): boolean {
  const c = code.trim().toUpperCase();
  const sepIdx = c.indexOf(SEPARATOR);
  if (sepIdx < 0) return false;
  if (sepIdx !== 8) return false;
  const stripped = c.replace(SEPARATOR, '');
  if (stripped.length < 10) return false;
  for (const ch of stripped) if (digit(ch) < 0) return false;
  return true;
}

/** Decodiert FULL Plus Code zu lat/lng (Center der Cell). */
export function decodeFullPlusCode(code: string): { lat: number; lng: number } | null {
  const c = code.trim().toUpperCase();
  if (!isFullPlusCode(c)) return null;
  const stripped = c.replace(SEPARATOR, '');

  let lat = -90;
  let lng = -180;
  // Pair-Encoding: chars 0-9 (5 pairs)
  // Pair-Resolutionen: 20°, 1°, 1/20°, 1/400°, 1/8000°
  const pairResolutions = [20, 1, 0.05, 0.0025, 0.000125];
  let pairIdx = 0;
  let i = 0;
  while (i < stripped.length && pairIdx < 5) {
    const dLat = digit(stripped[i]);
    const dLng = digit(stripped[i + 1]);
    if (dLat < 0 || dLng < 0) break;
    lat += dLat * pairResolutions[pairIdx];
    lng += dLng * pairResolutions[pairIdx];
    i += 2;
    pairIdx++;
  }

  // Default: Center of last pair-cell
  let latRes = pairResolutions[Math.max(0, pairIdx - 1)];
  let lngRes = pairResolutions[Math.max(0, pairIdx - 1)];

  // Grid-Encoding: each char refines via 4-row × 5-col grid
  if (i < stripped.length) {
    let gridLatRes = pairResolutions[4]; // 1/8000°
    let gridLngRes = pairResolutions[4];
    while (i < stripped.length) {
      const dGrid = digit(stripped[i]);
      if (dGrid < 0) break;
      gridLatRes /= 4;
      gridLngRes /= 5;
      const row = Math.floor(dGrid / 5);
      const col = dGrid % 5;
      lat += row * gridLatRes;
      lng += col * gridLngRes;
      i++;
    }
    latRes = gridLatRes;
    lngRes = gridLngRes;
  }

  // Center der Cell
  return { lat: lat + latRes / 2, lng: lng + lngRes / 2 };
}

/** Recovery: Short Code (z.B. "4H7F+RX") + Referenz-lat/lng → FULL Code.
 *  Short Code hat typisch 6 chars (4 vor +, 2 nach), missing first 4 chars.
 *  Wir berechnen die fehlenden 4 chars aus der Referenz.
 *  Algorithmus (vereinfacht): nimm Refs erstes Pair-Code (chars 0-3 vom
 *  Full-Encode der Referenz), prependet zu Short. Dann verschiebe Resultat
 *  ggf. zur naechsten Cell die zur Referenz passt (±1 in pair 2). */
export function recoverShortPlusCode(short: string, refLat: number, refLng: number): string | null {
  const s = short.trim().toUpperCase();
  const sepIdx = s.indexOf(SEPARATOR);
  if (sepIdx < 0) return null;
  // Nicht-FULL: Short hat <8 chars vor +
  if (sepIdx >= 8) return short; // schon FULL
  const missingPrefixLen = 8 - sepIdx;

  // Encoding der Referenz für die ersten missingPrefixLen chars
  // pair-resolutions: 20, 1, 0.05, 0.0025, 0.000125
  // Wir brauchen die ersten missingPrefixLen/2 Pairs
  const pairResolutions = [20, 1, 0.05, 0.0025, 0.000125];
  let lat = refLat + 90;
  let lng = refLng + 180;
  // Normalisierung
  while (lat < 0) lat += 180;
  while (lat >= 180) lat -= 180;
  while (lng < 0) lng += 360;
  while (lng >= 360) lng -= 360;

  let prefix = '';
  const pairsToBuild = Math.ceil(missingPrefixLen / 2);
  let curLat = lat;
  let curLng = lng;
  for (let p = 0; p < pairsToBuild; p++) {
    const r = pairResolutions[p];
    const dLat = Math.floor(curLat / r);
    const dLng = Math.floor(curLng / r);
    prefix += ALPHABET[Math.min(19, Math.max(0, dLat))];
    prefix += ALPHABET[Math.min(19, Math.max(0, dLng))];
    curLat -= dLat * r;
    curLng -= dLng * r;
  }
  prefix = prefix.slice(0, missingPrefixLen);
  return prefix + s;
}

/** Geocoding der Referenz-Stadt via Nominatim (kostenloser OSM-Service).
 *  CORS: ja, Nominatim erlaubt browser-fetches.
 *  Rate-Limit: Nominatim policy 1 req/sec — fuer einzelne Builder-Eingaben
 *  unproblematisch. */
export async function geocodeReference(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/** Haupt-Funktion: Plus-Code-String (FULL oder "SHORT Stadt") → lat/lng. */
export async function plusCodeToLatLng(input: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Trenne Code vom Referenzort: alles vor erstem Whitespace nach + ist der Code,
  // Rest ist die Referenz. Falls kein Whitespace nach +: entweder FULL Code
  // (kein Recovery noetig) oder Standalone Short ohne Referenz (failt).
  const match = trimmed.match(/^([0-9A-Z]+\+[0-9A-Z]+)\s*(.*)$/i);
  if (!match) {
    // Vielleicht hat User nur Code ohne Leerzeichen eingegeben
    if (isFullPlusCode(trimmed)) return decodeFullPlusCode(trimmed);
    return null;
  }
  const code = match[1].toUpperCase();
  const reference = match[2].trim();
  if (isFullPlusCode(code)) {
    return decodeFullPlusCode(code);
  }
  // Short Code → braucht Referenz
  if (!reference) return null;
  const ref = await geocodeReference(reference);
  if (!ref) return null;
  const fullCode = recoverShortPlusCode(code, ref.lat, ref.lng);
  if (!fullCode || !isFullPlusCode(fullCode)) return null;
  return decodeFullPlusCode(fullCode);
}
