// ── QQ Bar-Race Test — Groß-Gruppen-Score-Loop ───────────────────────────────
// Brainstorm-Prototyp 2026-07-01 (Wolf). Ersatz für das verworfene Territorium-
// Modell. Testet den Groß-Gruppen-Quiz-Loop (bis 100 Personen / 25 Teams):
//
//   Frage stellen → Teams tippen (Backend stempelt Reihenfolge, existiert schon)
//     → Reveal zeigt TOP-5 schnellste Richtige (Avatar + Zeit + Punkte)
//        + Rest aggregiert „+N weitere richtig"        ← löst die Auflösung (5 statt 25)
//     → Punkte: jede Richtige +1 Basis, Top-5 zusätzlich +5/4/3/2/1
//     → Bar-Race aktualisiert sich (Überholmomente)
//     → nächste Frage                                  ← kein Placement = spart Schritte
//
// WICHTIG: reiner Prototyp. Der echte Quiz-Flow (Grid/Placement/Klauen) wird
// NICHT angefasst — das wäre im echten Quiz ein gegateter Modus (Setup-Schalter).
//
// Route: /barrace-test (PinGate). Keine Socket-/Backend-Anbindung.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QQ_TEAM_PALETTE } from '@shared/quarterQuizTypes';

const ANIMALS: { emoji: string; name: string }[] = [
  { emoji: '🐧', name: 'Pinguine' }, { emoji: '🦊', name: 'Füchse' },
  { emoji: '🐨', name: 'Koalas' },   { emoji: '🦁', name: 'Löwen' },
  { emoji: '🐼', name: 'Pandas' },   { emoji: '🦉', name: 'Eulen' },
  { emoji: '🐢', name: 'Schildkröten' }, { emoji: '🦩', name: 'Flamingos' },
  { emoji: '🦔', name: 'Igel' },     { emoji: '🐝', name: 'Bienen' },
  { emoji: '🦆', name: 'Enten' },    { emoji: '🐙', name: 'Kraken' },
  { emoji: '🦥', name: 'Faultiere' },{ emoji: '🐺', name: 'Wölfe' },
  { emoji: '🦌', name: 'Hirsche' },  { emoji: '🐡', name: 'Kugelfische' },
  { emoji: '🦡', name: 'Dachse' },   { emoji: '🐿️', name: 'Hörnchen' },
  { emoji: '🦫', name: 'Biber' },    { emoji: '🦦', name: 'Otter' },
  { emoji: '🐌', name: 'Schnecken' },{ emoji: '🦈', name: 'Haie' },
  { emoji: '🐳', name: 'Wale' },     { emoji: '🦚', name: 'Pfauen' },
  { emoji: '🦜', name: 'Papageien' },
];

const THIN_ROW_H = 40;
const BIG_ROW_H = 74;
const BASE_POINT = 1;                    // jede richtige Antwort
const SPEED_BONUS = [5, 4, 3, 2, 1];     // Top-5 schnellste zusätzlich
const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

function colorFor(i: number): string {
  if (i < QQ_TEAM_PALETTE.length) return QQ_TEAM_PALETTE[i];
  return `hsl(${((i * 137.508) % 360).toFixed(0)} 70% 56%)`;
}

type QResult = {
  n: number;
  correctCount: number;
  top5: { team: number; time: number; points: number }[];
};

export default function QQBarRaceTestPage() {
  const [teamCount, setTeamCount] = useState(16);
  const [correctRate, setCorrectRate] = useState(0.65);
  const [view, setView] = useState<'full' | 'beamer'>('beamer');
  const [autoPlay, setAutoPlay] = useState(false);
  const [round, setRound] = useState(0);
  const [yourTeam, setYourTeam] = useState(11);
  const [lastDelta, setLastDelta] = useState<number[]>(() => new Array(16).fill(0));
  const [lastQ, setLastQ] = useState<QResult | null>(null);

  const targetRef = useRef<number[]>(new Array(16).fill(0));
  const [display, setDisplay] = useState<number[]>(() => new Array(16).fill(0));

  const teams = useMemo(
    () => Array.from({ length: teamCount }, (_, i) => ({
      ...ANIMALS[i % ANIMALS.length], color: colorFor(i),
    })),
    [teamCount],
  );

  // Reinit bei Team-Wechsel.
  useEffect(() => {
    targetRef.current = new Array(teamCount).fill(0);
    setDisplay(new Array(teamCount).fill(0));
    setLastDelta(new Array(teamCount).fill(0));
    setLastQ(null);
    setRound(0);
    setYourTeam(y => Math.min(y, teamCount - 1));
  }, [teamCount]);

  // Dauer-rAF: easet Anzeige-Werte zu den Ziel-Werten (zählt hoch, Balken wächst).
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setDisplay(prev => {
        let settled = true;
        const next = prev.map((v, i) => {
          const tg = targetRef.current[i] ?? 0;
          if (Math.abs(tg - v) < 0.4) return tg;
          settled = false;
          return v + (tg - v) * 0.11;
        });
        return settled ? prev : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Eine Frage simulieren ────────────────────────────────────────────────
  const askQuestion = useCallback(() => {
    const results = teams.map((_, i) => {
      const correct = Math.random() < correctRate;
      return { team: i, correct, time: correct ? 1 + Math.random() * 13 : Infinity };
    });
    const correctSorted = results.filter(r => r.correct).sort((a, b) => a.time - b.time);
    const top5 = correctSorted.slice(0, 5);

    const gain = new Array(teamCount).fill(0);
    for (const r of correctSorted) gain[r.team] += BASE_POINT;
    top5.forEach((r, idx) => { gain[r.team] += SPEED_BONUS[idx]; });

    targetRef.current = targetRef.current.map((v, i) => v + (gain[i] ?? 0));
    setLastDelta(gain);
    setLastQ({
      n: round + 1,
      correctCount: correctSorted.length,
      top5: top5.map((r, idx) => ({ team: r.team, time: r.time, points: BASE_POINT + SPEED_BONUS[idx] })),
    });
    setRound(r => r + 1);
  }, [teams, teamCount, correctRate, round]);

  const reset = useCallback(() => {
    targetRef.current = new Array(teamCount).fill(0);
    setDisplay(new Array(teamCount).fill(0));
    setLastDelta(new Array(teamCount).fill(0));
    setLastQ(null);
    setRound(0);
    setAutoPlay(false);
  }, [teamCount]);

  useEffect(() => {
    if (!autoPlay) return;
    const id = window.setInterval(askQuestion, 1600);
    return () => window.clearInterval(id);
  }, [autoPlay, askQuestion]);

  // Reihenfolge + Rang aus Anzeige-Werten.
  const { rankOf, order, maxVal } = useMemo(() => {
    const idx = Array.from({ length: teamCount }, (_, i) => i);
    idx.sort((a, b) => (display[b] ?? 0) - (display[a] ?? 0));
    const rank = new Array<number>(teamCount).fill(0);
    idx.forEach((teamI, pos) => { rank[teamI] = pos; });
    return { rankOf: rank, order: idx, maxVal: Math.max(1, ...display) };
  }, [display, teamCount]);

  const yourRank = rankOf[yourTeam] ?? 0;
  const yourInTop5 = yourRank < 5;
  const top5Standings = order.slice(0, 5);

  // ── Bar-Row ────────────────────────────────────────────────────────────────
  const renderRow = (teamI: number, top: number, rowH: number, big: boolean, pinnedRankLabel?: number) => {
    const t = teams[teamI];
    if (!t) return null;
    const val = Math.round(display[teamI] ?? 0);
    const pct = ((display[teamI] ?? 0) / maxVal) * 100;
    const isYou = teamI === yourTeam;
    const rank = pinnedRankLabel ?? (rankOf[teamI] + 1);
    const delta = lastDelta[teamI] ?? 0;
    return (
      <div
        key={teamI}
        onClick={() => setYourTeam(teamI)}
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: rowH - 6,
          transform: `translateY(${top}px)`,
          transition: 'transform 0.65s cubic-bezier(0.34,1.2,0.5,1)',
          display: 'flex', alignItems: 'center', gap: big ? 14 : 10,
          padding: big ? '0 16px' : '0 10px', borderRadius: big ? 16 : 10,
          background: isYou ? 'rgba(236,72,153,0.16)' : 'rgba(255,255,255,0.04)',
          boxShadow: isYou ? '0 0 0 2px #EC4899' : 'none', cursor: 'pointer',
        }}
      >
        <span style={{ width: big ? 40 : 26, textAlign: 'center', fontWeight: 900, fontSize: big ? 24 : 15, opacity: rank === 1 ? 1 : 0.55 }}>
          {rank === 1 ? '👑' : rank}
        </span>
        <span style={{ fontSize: big ? 34 : 22, width: big ? 44 : 28, textAlign: 'center' }}>{t.emoji}</span>
        <span style={{ width: big ? 150 : 104, fontWeight: 800, fontSize: big ? 19 : 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t.name}
        </span>
        <div style={{ flex: 1, height: big ? 30 : 18, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
            background: `linear-gradient(90deg, ${t.color}, ${t.color}dd)`, borderRadius: 999, boxShadow: `0 0 12px ${t.color}66`,
          }} />
        </div>
        <span style={{ width: big ? 84 : 58, textAlign: 'right', fontWeight: 900, fontSize: big ? 26 : 16, fontVariantNumeric: 'tabular-nums' }}>
          {val}
        </span>
        <span style={{ width: big ? 44 : 30, textAlign: 'right', fontSize: big ? 14 : 11, fontWeight: 800, opacity: delta > 0 ? 0.85 : 0, color: '#9DCB2F' }}>
          {delta > 0 ? `+${delta}` : ''}
        </span>
      </div>
    );
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.h1}>🏁 Groß-Gruppen-Loop — Test</h1>
        <p style={S.sub}>
          Bis 100 Personen / 25 Teams. Pro Frage werden nur die <b>Top-5 schnellsten Richtigen</b>{' '}
          aufgedeckt (löst die Avatar-Auflösung), der Rest aggregiert. Punkte: jede Richtige <b>+1</b>,
          Top-5 zusätzlich <b>+5/4/3/2/1</b>. Kein Placement → spart Schritte. Klick auf eine Zeile =
          „dein Team".
        </p>
      </div>

      <div style={S.controls}>
        <div style={S.btnRow}>
          <button style={S.btnPrimary} onClick={askQuestion}>▶ Frage stellen</button>
          <button style={{ ...S.btn, ...(autoPlay ? S.btnActive : null) }} onClick={() => setAutoPlay(a => !a)}>
            {autoPlay ? '⏸ Auto stop' : '⏩ Auto-Play'}
          </button>
          <button style={S.btnGhost} onClick={reset}>↺ Reset</button>
          <div style={S.viewToggle}>
            <button style={{ ...S.viewBtn, ...(view === 'beamer' ? S.viewBtnOn : null) }} onClick={() => setView('beamer')}>Beamer</button>
            <button style={{ ...S.viewBtn, ...(view === 'full' ? S.viewBtnOn : null) }} onClick={() => setView('full')}>Alle Teams</button>
          </div>
        </div>
        <div style={S.sliders}>
          <label style={S.sliderRow}>
            <span style={S.sliderLabel}>Teams<b style={S.sliderVal}>{teamCount}</b></span>
            <input type="range" min={2} max={25} value={teamCount} onChange={e => setTeamCount(Number(e.target.value))} style={S.range} />
          </label>
          <label style={S.sliderRow}>
            <span style={S.sliderLabel}>Richtig-Quote<b style={S.sliderVal}>{Math.round(correctRate * 100)}%</b></span>
            <input type="range" min={20} max={95} value={Math.round(correctRate * 100)} onChange={e => setCorrectRate(Number(e.target.value) / 100)} style={S.range} />
          </label>
          <span style={S.roundBadge}>Frage {round}</span>
        </div>
      </div>

      {/* Reveal-Panel: Top-5 schnellste Richtige der letzten Frage */}
      <div style={S.reveal}>
        {!lastQ ? (
          <div style={S.revealHint}>Klick „Frage stellen" — hier erscheinen die 5 schnellsten richtigen Teams.</div>
        ) : (
          <>
            <div style={S.revealHead}>
              <span style={S.revealTitle}>Frage {lastQ.n} · richtig beantwortet</span>
              <span style={S.revealCount}>{lastQ.correctCount} / {teamCount} richtig</span>
            </div>
            <div style={S.podium}>
              {lastQ.top5.map((r, idx) => {
                const t = teams[r.team];
                if (!t) return null;
                return (
                  <div key={r.team} style={{ ...S.podRow, ...(r.team === yourTeam ? S.podRowYou : null) }}>
                    <span style={S.podMedal}>{MEDALS[idx]}</span>
                    <span style={S.podAvatar}>{t.emoji}</span>
                    <span style={S.podName}>{t.name}</span>
                    <span style={S.podTime}>{r.time.toFixed(1)}s</span>
                    <span style={{ ...S.podPts, color: t.color }}>+{r.points}</span>
                  </div>
                );
              })}
            </div>
            {lastQ.correctCount > lastQ.top5.length && (
              <div style={S.revealRest}>
                + {lastQ.correctCount - lastQ.top5.length} weitere Teams richtig · je +{BASE_POINT}
              </div>
            )}
          </>
        )}
      </div>

      {view === 'full' ? (
        <div style={S.raceWrap}>
          <div style={{ position: 'relative', height: teamCount * THIN_ROW_H }}>
            {teams.map((_, i) => renderRow(i, rankOf[i] * THIN_ROW_H, THIN_ROW_H, false))}
          </div>
        </div>
      ) : (
        <div style={S.beamerWrap}>
          <div style={S.beamerLabel}>Gesamtwertung</div>
          <div style={{ position: 'relative', height: 5 * BIG_ROW_H }}>
            {top5Standings.map(teamI => renderRow(teamI, rankOf[teamI] * BIG_ROW_H, BIG_ROW_H, true))}
          </div>
          {!yourInTop5 && (
            <>
              <div style={S.pinDivider}><span>dein Team</span></div>
              <div style={{ position: 'relative', height: BIG_ROW_H }}>
                {renderRow(yourTeam, 0, BIG_ROW_H, true, yourRank + 1)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', background: 'radial-gradient(1200px 800px at 20% 0%, #1e2a5a 0%, #0e1530 60%, #0a0f24 100%)',
    color: '#f4f6ff', fontFamily: "'Nunito', system-ui, sans-serif", padding: '28px 32px 60px',
  },
  header: { maxWidth: 1000, margin: '0 auto 18px' },
  h1: { margin: '0 0 6px', fontSize: 28, fontWeight: 900, letterSpacing: -0.5 },
  sub: { margin: 0, fontSize: 15, lineHeight: 1.5, opacity: 0.82, maxWidth: 820 },
  controls: {
    maxWidth: 1000, margin: '0 auto 18px', background: 'rgba(255,255,255,0.05)', borderRadius: 18,
    padding: 16, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 14,
  },
  btnRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  btn: { background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 14px', fontWeight: 800, fontSize: 14, cursor: 'pointer' },
  btnPrimary: { background: '#EC4899', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 900, fontSize: 14, cursor: 'pointer' },
  btnGhost: { background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px 14px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  btnActive: { background: '#A21247', boxShadow: '0 0 0 2px rgba(236,72,153,0.4)' },
  viewToggle: { marginLeft: 'auto', display: 'flex', gap: 4, background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 4 },
  viewBtn: { background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: 9, padding: '8px 14px', fontWeight: 800, fontSize: 13, cursor: 'pointer' },
  viewBtnOn: { background: '#EC4899', color: '#fff' },
  sliders: { display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' },
  sliderRow: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220 },
  sliderLabel: { display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.85, fontWeight: 700 },
  sliderVal: { color: '#EC4899', fontSize: 15 },
  range: { width: '100%', accentColor: '#EC4899' },
  roundBadge: { marginLeft: 'auto', fontSize: 14, fontWeight: 800, opacity: 0.7 },
  reveal: {
    maxWidth: 1000, margin: '0 auto 18px', background: 'linear-gradient(180deg, rgba(236,72,153,0.12), rgba(255,255,255,0.04))',
    borderRadius: 18, padding: 16, border: '1px solid rgba(236,72,153,0.3)', minHeight: 120,
  },
  revealHint: { opacity: 0.6, fontSize: 15, textAlign: 'center', padding: '24px 0' },
  revealHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  revealTitle: { fontSize: 17, fontWeight: 900 },
  revealCount: { fontSize: 14, fontWeight: 800, opacity: 0.7 },
  podium: { display: 'flex', flexDirection: 'column', gap: 6 },
  podRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '7px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)' },
  podRowYou: { boxShadow: '0 0 0 2px #EC4899', background: 'rgba(236,72,153,0.14)' },
  podMedal: { fontSize: 22, width: 30, textAlign: 'center' },
  podAvatar: { fontSize: 26, width: 34, textAlign: 'center' },
  podName: { flex: 1, fontWeight: 800, fontSize: 16 },
  podTime: { fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700, opacity: 0.6, width: 54, textAlign: 'right' },
  podPts: { fontWeight: 900, fontSize: 18, width: 44, textAlign: 'right' },
  revealRest: { marginTop: 10, fontSize: 13, fontWeight: 700, opacity: 0.6, textAlign: 'center' },
  raceWrap: {
    maxWidth: 1000, margin: '0 auto', background: 'rgba(255,255,255,0.03)', borderRadius: 18,
    padding: 14, border: '1px solid rgba(255,255,255,0.07)',
  },
  beamerWrap: {
    maxWidth: 1000, margin: '0 auto', background: 'rgba(0,0,0,0.28)', borderRadius: 22,
    padding: 20, border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
  },
  beamerLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.5, fontWeight: 800, marginBottom: 12 },
  pinDivider: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px 0 8px',
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.5, fontWeight: 800,
  },
};
