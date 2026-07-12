// ── CozyArena Scoring Self-Check ──────────────────────────────────────────────
// Verhaltens-Test fuer qqMegaEventScore (0-100-Wertung je Fraktion). Baut je
// Kategorie einen Fake-Raum mit RICHTIGEN und FALSCHEN Handys und prueft, dass
// die Fraktions-Punkte stimmen (richtig -> 100, falsch -> 0, halb -> ~50).
//
// Warum: Type-Check sagt nur "kompiliert", nicht "rechnet richtig". Der MUCHO-Bug
// (jedes Handy bekam fix 100) waere hier beim ersten Lauf rot geworden.
//
// Lauf:  npx ts-node scripts/scoring-selfcheck.ts   (exit 1 bei Fehler)
//
// Erweiterung: neue Kategorie -> Szenario in SCENARIOS ergaenzen. Ein Szenario
// beschreibt Fraktionen (avatarId) mit ihren Handys + erwartetem Score.

import { ensureQQRoom, qqMegaEventScore, QQRoomState } from '../src/quarterQuiz/qqRooms';

let roomSeq = 0;
type Phone = { avatarId: string; text?: string; top5Hits?: number[]; orderHits?: boolean[]; winner?: boolean };
type Scenario = {
  name: string;
  question: any;
  phones: Phone[];
  expect: Record<string, number>; // avatarId -> erwartete Punkte (gerundet)
  tol?: number;                    // Toleranz (default 0)
  gamePhaseIndex?: number;         // fuer Finale-Tests (default 1 = keine Finale)
  totalPhases?: number;            // default 3
  questionIndex?: number;          // default 0; 4 = letzte Frage der Phase (x3)
};

function runScenario(sc: Scenario): { ok: boolean; got: Record<string, number>; detail: string } {
  const code = `SELFCHK${roomSeq++}`;
  const room = ensureQQRoom(code);
  // Default nicht-Finale -> Multiplikator 1 (reine 0-100-Pruefung); ueberschreibbar
  room.gamePhaseIndex = (sc.gamePhaseIndex ?? 1) as any;
  (room as any).totalPhases = sc.totalPhases ?? 3;
  room.questionIndex = sc.questionIndex ?? 0;
  room.largeGroupMode = true;
  room.currentQuestion = sc.question;
  room.teams = {};
  room.answers = [];
  room.top5HitsByTeam = {};
  room.orderHitsByTeam = {};
  (room as any)._currentQuestionWinners = [];
  (room as any).megaColorStats = {};

  sc.phones.forEach((p, i) => {
    const teamId = `t${i}`;
    room.teams[teamId] = { avatarId: p.avatarId, connected: true, totalCells: 0, largestConnected: 0 } as any;
    if (p.text !== undefined) room.answers.push({ teamId, text: p.text, submittedAt: 1000 + i } as any);
    if (p.top5Hits) room.top5HitsByTeam![teamId] = p.top5Hits;
    if (p.orderHits) room.orderHitsByTeam![teamId] = p.orderHits;
    if (p.winner) (room as any)._currentQuestionWinners.push(teamId);
  });

  qqMegaEventScore(room);
  const ranking = room.megaQuestionRanking ?? [];
  const got: Record<string, number> = {};
  for (const r of ranking) got[r.avatarId] = r.points;

  const tol = sc.tol ?? 0;
  let ok = true;
  const parts: string[] = [];
  for (const [av, exp] of Object.entries(sc.expect)) {
    const g = got[av] ?? 0;
    const pass = Math.abs(g - exp) <= tol;
    if (!pass) ok = false;
    parts.push(`${av}=${g}${pass ? '' : ` (erwartet ${exp}${tol ? `±${tol}` : ''})`}`);
  }
  return { ok, got, detail: parts.join('  ') };
}

// ── Szenarien ────────────────────────────────────────────────────────────────
// Konvention: Fraktion 'RIGHT' = alle richtig (-> 100), 'WRONG' = alle falsch
// (-> 0), 'HALF' = Mischung (-> ~50), sofern sinnvoll fuer die Kategorie.

const SCENARIOS: Scenario[] = [
  {
    name: 'MUCHO — richtig=100, falsch=0 (der gefixte Bug)',
    question: { category: 'MUCHO', correctOptionIndex: 1, options: ['A', 'B', 'C', 'D'] },
    phones: [
      { avatarId: 'RIGHT', text: 'B' }, { avatarId: 'RIGHT', text: 'B' },
      { avatarId: 'WRONG', text: 'A' }, { avatarId: 'WRONG', text: 'C' },
      { avatarId: 'HALF', text: 'B' }, { avatarId: 'HALF', text: 'D' },
    ],
    expect: { RIGHT: 100, WRONG: 0, HALF: 50 },
  },
  {
    name: 'CHEESE / Rest — nur mod-markierte Sieger=100',
    question: { category: 'CHEESE' },
    phones: [
      { avatarId: 'RIGHT', text: 'x', winner: true }, { avatarId: 'RIGHT', text: 'x', winner: true },
      { avatarId: 'WRONG', text: 'x' }, { avatarId: 'WRONG', text: 'x' },
    ],
    expect: { RIGHT: 100, WRONG: 0 },
  },
  {
    name: '10v10 — All-in auf richtig=100, auf falsch=0, gesplittet=50',
    question: { category: 'ZEHN_VON_ZEHN', correctOptionIndex: 0, options: ['R', 'F'] },
    phones: [
      { avatarId: 'RIGHT', text: '10,0' }, { avatarId: 'RIGHT', text: '10,0' },
      { avatarId: 'WRONG', text: '0,10' }, { avatarId: 'WRONG', text: '0,10' },
      { avatarId: 'HALF', text: '5,5' }, { avatarId: 'HALF', text: '5,5' },
    ],
    expect: { RIGHT: 100, WRONG: 0, HALF: 50 },
  },
  {
    name: 'Schaetzchen — exakt=100, weit weg=0',
    question: { category: 'SCHAETZCHEN', targetValue: 100, unit: 'Stück' },
    phones: [
      { avatarId: 'RIGHT', text: '100' }, { avatarId: 'RIGHT', text: '100' },
      { avatarId: 'WRONG', text: '100000' }, { avatarId: 'WRONG', text: '100000' },
    ],
    expect: { RIGHT: 100, WRONG: 0 },
  },
  {
    name: 'CozyGuessr (map) — auf dem Ziel=100, anderer Kontinent=0',
    question: { category: 'BUNTE_TUETE', bunteTuete: { kind: 'map', lat: 50, lng: 10 } },
    phones: [
      { avatarId: 'RIGHT', text: '50,10' }, { avatarId: 'RIGHT', text: '50,10' },
      { avatarId: 'WRONG', text: '-40,150' }, { avatarId: 'WRONG', text: '-40,150' },
    ],
    expect: { RIGHT: 100, WRONG: 0 },
  },
  {
    name: 'Schwarm (crowdEstimate) — exakt=100, weit weg=0',
    question: { category: 'BUNTE_TUETE', bunteTuete: { kind: 'crowdEstimate', targetValue: 100, unit: 'x' } },
    phones: [
      { avatarId: 'RIGHT', text: '100' }, { avatarId: 'RIGHT', text: '100' },
      { avatarId: 'WRONG', text: '100000' }, { avatarId: 'WRONG', text: '100000' },
    ],
    expect: { RIGHT: 100, WRONG: 0 },
  },
  {
    name: 'Top 5 — 5/5 Treffer=100, 0/5=0, 2/5=40',
    question: { category: 'BUNTE_TUETE', bunteTuete: { kind: 'top5', answers: ['a', 'b', 'c', 'd', 'e'] } },
    phones: [
      { avatarId: 'RIGHT', text: 'a|b|c|d|e', top5Hits: [0, 1, 2, 3, 4] },
      { avatarId: 'RIGHT', text: 'a|b|c|d|e', top5Hits: [0, 1, 2, 3, 4] },
      { avatarId: 'WRONG', text: 'z', top5Hits: [] },
      { avatarId: 'WRONG', text: 'z', top5Hits: [] },
      { avatarId: 'HALF', text: 'a|b', top5Hits: [0, 1] },
      { avatarId: 'HALF', text: 'a|b', top5Hits: [0, 1] },
    ],
    expect: { RIGHT: 100, WRONG: 0, HALF: 40 },
  },
  {
    name: 'Reihenfolge (order) — 4/4 richtig=100, 0/4=0, 2/4=50',
    question: { category: 'BUNTE_TUETE', bunteTuete: { kind: 'order', correctOrder: [0, 1, 2, 3], items: ['a', 'b', 'c', 'd'] } },
    phones: [
      { avatarId: 'RIGHT', text: 'a|b|c|d', orderHits: [true, true, true, true] },
      { avatarId: 'RIGHT', text: 'a|b|c|d', orderHits: [true, true, true, true] },
      { avatarId: 'WRONG', text: 'd|c|b|a', orderHits: [false, false, false, false] },
      { avatarId: 'WRONG', text: 'd|c|b|a', orderHits: [false, false, false, false] },
      { avatarId: 'HALF', text: 'a|b|d|c', orderHits: [true, true, false, false] },
      { avatarId: 'HALF', text: 'a|b|d|c', orderHits: [true, true, false, false] },
    ],
    expect: { RIGHT: 100, WRONG: 0, HALF: 50 },
  },
  {
    name: 'Finale x2 — letzte Phase verdoppelt (MUCHO richtig -> 200)',
    question: { category: 'MUCHO', correctOptionIndex: 1, options: ['A', 'B', 'C', 'D'] },
    phones: [
      { avatarId: 'RIGHT', text: 'B' }, { avatarId: 'RIGHT', text: 'B' },
      { avatarId: 'WRONG', text: 'A' }, { avatarId: 'WRONG', text: 'A' },
    ],
    gamePhaseIndex: 3, totalPhases: 3, questionIndex: 0,
    expect: { RIGHT: 200, WRONG: 0 },
  },
  {
    name: 'Finale x3 — allerletzte Frage verdreifacht (MUCHO richtig -> 300)',
    question: { category: 'MUCHO', correctOptionIndex: 1, options: ['A', 'B', 'C', 'D'] },
    phones: [
      { avatarId: 'RIGHT', text: 'B' }, { avatarId: 'RIGHT', text: 'B' },
      { avatarId: 'WRONG', text: 'A' }, { avatarId: 'WRONG', text: 'A' },
    ],
    gamePhaseIndex: 3, totalPhases: 3, questionIndex: 4,
    expect: { RIGHT: 300, WRONG: 0 },
  },
];

// ── Runner ───────────────────────────────────────────────────────────────────
let failed = 0;
console.log('\n  CozyArena Scoring Self-Check\n  ' + '─'.repeat(60));
for (const sc of SCENARIOS) {
  let res;
  try {
    res = runScenario(sc);
  } catch (e: any) {
    failed++;
    console.log(`  ✗  ${sc.name}\n       FEHLER: ${e?.message ?? e}`);
    continue;
  }
  if (res.ok) {
    console.log(`  ✓  ${sc.name}\n       ${res.detail}`);
  } else {
    failed++;
    console.log(`  ✗  ${sc.name}\n       ${res.detail}`);
  }
}
console.log('  ' + '─'.repeat(60));
if (failed === 0) {
  console.log(`  Alle ${SCENARIOS.length} Szenarien bestanden.\n`);
  process.exit(0);
} else {
  console.log(`  ${failed} von ${SCENARIOS.length} Szenarien FEHLGESCHLAGEN.\n`);
  process.exit(1);
}
