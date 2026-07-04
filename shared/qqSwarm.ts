/**
 * qqSwarm — Aggregation für „Schwarm-Schätzen" (Wisdom of Crowds, Cozy Arena).
 * GETEILT zwischen Backend (autoritative Wertung) und Frontend (Zahlenstrahl-
 * Reveal) — EINE Quelle für Median/Range/Fraktions-Nähe.
 *
 * Wertung einheitlich mit dem Rest der Arena (Wolf 2026-07-04): pro Fraktion
 * zählt der MEDIAN der Handy-Tipps (troll-fest). Leistung = Nähe des Medians;
 * Basis +1 wenn Median in der adaptiven Range, Podium [5,4,3,2,1] für die 5
 * nächsten Fraktionen (das macht qqMegaEventScore).
 */

/**
 * Zahl aus Freitext parsen (Komma→Punkt, Einheiten/Buchstaben weg).
 * Minus zählt NUR als echtes Vorzeichen, wenn der Text mit '-' beginnt
 * (z.B. "-5 °C") — ein Bindestrich mitten im Wort ("Dummy-5") wird ignoriert,
 * sonst entstuenden falsche negative Schaetzungen.
 */
export function qqParseEstimate(text: string | null | undefined): number | null {
  const raw = (text ?? '').trim().replace(',', '.');
  if (!raw) return null;
  const neg = raw.startsWith('-');
  const digits = raw.replace(/[^0-9.]/g, '');
  if (!digits || digits === '.') return null;
  const n = Number(digits);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

export function qqMedian(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Adaptive „nah genug"-Range — SPIEGELT backend schaetzchenRangeAbs, damit
 * Schwarm dieselbe Nähe-Toleranz wie Schätzchen nutzt. Jahre = ±3 absolut,
 * sonst prozentual nach Größenordnung.
 */
export function qqEstimateRangeAbs(target: number, unit?: string): number {
  const abs = Math.abs(target);
  const u = (unit ?? '').trim();
  const yearUnit = !!u && /\b(jahr|jahre|year|years)\b/i.test(u);
  const yearVal = Number.isInteger(target) && abs >= 1500 && abs <= 2100;
  if (yearUnit || (yearVal && u === '')) return 3;
  if (abs < 100)        return abs * 0.20;
  if (abs < 1000)       return abs * 0.10;
  if (abs < 10000)      return abs * 0.07;
  if (abs < 1_000_000)  return abs * 0.05;
  return abs * 0.03;
}

export interface QQSwarmSub { teamId: string; text: string }

export interface QQSwarmFaction {
  avatarId: string;
  teamIds: string[];
  values: number[];     // gültige Einzeltipps der Fraktion
  median: number;
  dist: number;         // |median − target|
  inRange: boolean;
  inRangeCount: number; // # Handys der Fraktion in Range (für „X/Y nah")
}

export interface QQSwarmResult {
  target: number;
  range: number;
  globalMedian: number; // Schwarm-Tipp (robust)
  globalMean: number;
  count: number;                    // # gültige Tipps gesamt
  perTeam: Record<string, number>;  // teamId → geparster Wert
  factions: QQSwarmFaction[];       // nach dist aufsteigend (nächste zuerst)
}

export function qqSwarm(
  submissions: QQSwarmSub[],
  target: number,
  avatarIdOf: (teamId: string) => string | undefined,
  unit?: string,
): QQSwarmResult {
  const range = qqEstimateRangeAbs(target, unit);
  const perTeam: Record<string, number> = {};
  const all: number[] = [];
  const byFaction = new Map<string, { teamIds: string[]; values: number[] }>();

  for (const sub of submissions) {
    const v = qqParseEstimate(sub.text);
    if (v == null) continue;
    perTeam[sub.teamId] = v;
    all.push(v);
    const av = avatarIdOf(sub.teamId);
    if (av) {
      let f = byFaction.get(av);
      if (!f) { f = { teamIds: [], values: [] }; byFaction.set(av, f); }
      f.teamIds.push(sub.teamId); f.values.push(v);
    }
  }

  const factions: QQSwarmFaction[] = [...byFaction.entries()].map(([avatarId, f]) => {
    const median = qqMedian(f.values);
    const dist = Math.abs(median - target);
    return {
      avatarId, teamIds: f.teamIds, values: f.values, median, dist,
      inRange: dist <= range,
      inRangeCount: f.values.filter(v => Math.abs(v - target) <= range).length,
    };
  }).sort((a, b) => a.dist - b.dist);

  return {
    target, range,
    globalMedian: qqMedian(all),
    globalMean: all.length ? all.reduce((s, v) => s + v, 0) / all.length : NaN,
    count: all.length,
    perTeam, factions,
  };
}
