const UMLAUT_MAP: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss'
};

const sanitizeBasic = (value: string) =>
  value
    .toLowerCase()
    .replace(/[äöüß]/g, (char) => UMLAUT_MAP[char] ?? char)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' und ')
    // 2026-05-10 (Wolf-Live-Test L2): phonetische ph\u2192f-Normalisierung. \u201eSaxofon"
    // (DE) und \u201eSaxophone" (EN/alt) sollen beide als richtig z\u00e4hlen. similarity
    // war 0.78 \u2014 unter dem 0.8-Threshold. Mit ph\u2192f matchen beide exakt. Hilft
    // auch bei telefon/telephone, foto/photo, alphabet/alfabet.
    .replace(/ph/g, 'f');

export const normalizeText = (input: string | null | undefined): string => {
  if (!input) return '';
  const normalized = sanitizeBasic(String(input));
  return normalized.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
};

export const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
};

export const similarityScore = (a: string, b: string): number => {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  if (!normalizedA && !normalizedB) return 1;
  if (!normalizedA || !normalizedB) return 0;
  const maxLen = Math.max(normalizedA.length, normalizedB.length);
  if (maxLen === 0) return 1;
  // 2026-04-28: Substring-Toleranz — wenn die kürzere Eingabe vollständig
  // in der längeren steckt (z.B. 'herr der ringe' in 'der herr der ringe'),
  // werten wir als Match. (User-Bug: 'fast richtige Antworten anerkennen'.)
  //
  // 2026-05-10 (Wolf-Live-Test L3): zusätzlich Min-Ratio 0.5 — sonst akzeptiert
  // 'stadium' (7) als 'wembley stadium' (15), weil 'stadium' Substring ist.
  // Generische Wörter dürfen nicht für spezifische Antworten durchgehen.
  // Mit Min-Ratio 0.5: 'stadium' (7/15=0.47) → blockiert, 'herr der ringe'
  // (14/18=0.78) → akzeptiert.
  if (normalizedA.length >= 4 && normalizedB.length >= 4) {
    if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) {
      const shorter = Math.min(normalizedA.length, normalizedB.length);
      const longer  = Math.max(normalizedA.length, normalizedB.length);
      if (shorter / longer >= 0.5) return 0.95;
    }
  }
  // Auch tolerant gegen führende Artikel ('der/die/das/the/a/an' vorne).
  // Strip dann nochmal vergleichen — falls strip ergibt Match: 0.92.
  const stripArticle = (s: string) => s.replace(/^(der|die|das|the|a|an)\s+/, '');
  const sA = stripArticle(normalizedA);
  const sB = stripArticle(normalizedB);
  if (sA !== normalizedA || sB !== normalizedB) {
    if (sA === sB && sA.length >= 3) return 0.92;
  }
  const distance = levenshteinDistance(normalizedA, normalizedB);
  return Math.max(0, 1 - distance / maxLen);
};
