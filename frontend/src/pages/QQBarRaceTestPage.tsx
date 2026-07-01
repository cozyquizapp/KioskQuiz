// ── QQ Bar-Race Test — Score-Ansicht für große Gruppen ───────────────────────
// Brainstorm-Prototyp 2026-07-01 (Wolf): Ersatz für das verworfene Territorium-
// Modell. Kernkritik dort: „man weiß nicht wie viele Punkte man hat" + Farben ab
// 10 Teams ununterscheidbar. Antwort hier:
//   • Jedes Team hat sein EIGENES beschriftetes Objekt (Avatar+Name+Zahl) →
//     Farb-Ähnlichkeit egal, Punkte immer lesbar.
//   • Die Show entsteht durch BEWEGUNG: Balken wachsen, Zeilen überholen sich,
//     Zahlen zählen hoch.
//   • Zwei Ansichten: „Alle Teams" (voller Race) + „Beamer" (Top-5 groß + deine
//     Zeile gepinnt, auch wenn Mittelfeld).
//
// Route: /barrace-test (PinGate). Reiner Test — keine Socket-/Backend-Anbindung.

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

function colorFor(i: number): string {
  if (i < QQ_TEAM_PALETTE.length) return QQ_TEAM_PALETTE[i];
  return `hsl(${((i * 137.508) % 360).toFixed(0)} 70% 56%)`;
}

export default function QQBarRaceTestPage() {
  const [teamCount, setTeamCount] = useState(16);
  const [maxPerRound, setMaxPerRound] = useState(20);
  const [view, setView] = useState<'full' | 'beamer'>('full');
  const [autoPlay, setAutoPlay] = useState(false);
  const [round, setRound] = useState(0);
  const [yourTeam, setYourTeam] = useState(11);
  const [lastDelta, setLastDelta] = useState<number[]>(() => new Array(16).fill(0));

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
    setRound(0);
    setYourTeam(y => Math.min(y, teamCount - 1));
  }, [teamCount]);

  // Dauer-rAF: easet Anzeige-Werte zu den Ziel-Werten (zählt hoch, Balken wächst).
  // Bail-out (return prev) wenn alles ausgeruht → kein Re-Render im Leerlauf.
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

  const addPoints = useCallback((surprise: boolean) => {
    const delta = teams.map(() => {
      if (surprise) {
        // heavy-tailed: viele kleine, wenige riesige Sprünge → Überhol-Drama
        const r = Math.random();
        return Math.round(r * r * r * maxPerRound * 3);
      }
      return Math.round(Math.random() * maxPerRound);
    });
    targetRef.current = targetRef.current.map((v, i) => v + (delta[i] ?? 0));
    setLastDelta(delta);
    setRound(r => r + 1);
  }, [teams, maxPerRound]);

  const reset = useCallback(() => {
    targetRef.current = new Array(teamCount).fill(0);
    setDisplay(new Array(teamCount).fill(0));
    setLastDelta(new Array(teamCount).fill(0));
    setRound(0);
    setAutoPlay(false);
  }, [teamCount]);

  useEffect(() => {
    if (!autoPlay) return;
    const id = window.setInterval(() => addPoints(false), 1100);
    return () => window.clearInterval(id);
  }, [autoPlay, addPoints]);

  // Reihenfolge + Rang aus Anzeige-Werten (kontinuierlich → sanftes Überholen).
  const { order, rankOf, maxVal } = useMemo(() => {
    const idx = Array.from({ length: teamCount }, (_, i) => i);
    idx.sort((a, b) => (display[b] ?? 0) - (display[a] ?? 0));
    const rank = new Array<number>(teamCount).fill(0);
    idx.forEach((teamI, pos) => { rank[teamI] = pos; });
    return { order: idx, rankOf: rank, maxVal: Math.max(1, ...display) };
  }, [display, teamCount]);

  const yourRank = rankOf[yourTeam] ?? 0;
  const yourInTop5 = yourRank < 5;

  // ── Row-Renderer ───────────────────────────────────────────────────────────
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
          boxShadow: isYou ? '0 0 0 2px #EC4899' : 'none',
          cursor: 'pointer',
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
            background: `linear-gradient(90deg, ${t.color}, ${t.color}dd)`,
            borderRadius: 999, boxShadow: `0 0 12px ${t.color}66`,
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

  const top5 = order.slice(0, 5);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.h1}>🏁 Bar-Race Score — Test</h1>
        <p style={S.sub}>
          Score-Ansicht für große Gruppen (bis 100 Personen / 25 Teams). Jede richtige Antwort =
          Punkte, Balken wächst, Zeilen überholen sich. Immer lesbar: <b>Zahl + Rang</b>. Klick auf
          eine Zeile markiert sie als „dein Team".
        </p>
      </div>

      <div style={S.controls}>
        <div style={S.btnRow}>
          <button style={S.btnPrimary} onClick={() => addPoints(false)}>▶ Runde</button>
          <button style={S.btn} onClick={() => addPoints(true)}>🎲 Überraschungsrunde</button>
          <button style={{ ...S.btn, ...(autoPlay ? S.btnActive : null) }} onClick={() => setAutoPlay(a => !a)}>
            {autoPlay ? '⏸ Auto stop' : '⏩ Auto-Play'}
          </button>
          <button style={S.btnGhost} onClick={reset}>↺ Reset</button>
          <div style={S.viewToggle}>
            <button style={{ ...S.viewBtn, ...(view === 'full' ? S.viewBtnOn : null) }} onClick={() => setView('full')}>Alle Teams</button>
            <button style={{ ...S.viewBtn, ...(view === 'beamer' ? S.viewBtnOn : null) }} onClick={() => setView('beamer')}>Beamer</button>
          </div>
        </div>
        <div style={S.sliders}>
          <label style={S.sliderRow}>
            <span style={S.sliderLabel}>Teams<b style={S.sliderVal}>{teamCount}</b></span>
            <input type="range" min={2} max={25} value={teamCount} onChange={e => setTeamCount(Number(e.target.value))} style={S.range} />
          </label>
          <label style={S.sliderRow}>
            <span style={S.sliderLabel}>Max Punkte / Runde<b style={S.sliderVal}>{maxPerRound}</b></span>
            <input type="range" min={5} max={40} value={maxPerRound} onChange={e => setMaxPerRound(Number(e.target.value))} style={S.range} />
          </label>
          <span style={S.roundBadge}>Runde {round}</span>
        </div>
      </div>

      {view === 'full' ? (
        <div style={S.raceWrap}>
          <div style={{ position: 'relative', height: teamCount * THIN_ROW_H }}>
            {teams.map((_, i) => renderRow(i, rankOf[i] * THIN_ROW_H, THIN_ROW_H, false))}
          </div>
        </div>
      ) : (
        <div style={S.beamerWrap}>
          <div style={{ position: 'relative', height: 5 * BIG_ROW_H }}>
            {top5.map(teamI => renderRow(teamI, rankOf[teamI] * BIG_ROW_H, BIG_ROW_H, true))}
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
  sub: { margin: 0, fontSize: 15, lineHeight: 1.5, opacity: 0.82, maxWidth: 780 },
  controls: {
    maxWidth: 1000, margin: '0 auto 20px', background: 'rgba(255,255,255,0.05)', borderRadius: 18,
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
  raceWrap: {
    maxWidth: 1000, margin: '0 auto', background: 'rgba(255,255,255,0.03)', borderRadius: 18,
    padding: 14, border: '1px solid rgba(255,255,255,0.07)',
  },
  beamerWrap: {
    maxWidth: 1000, margin: '0 auto', background: 'rgba(0,0,0,0.28)', borderRadius: 22,
    padding: 20, border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
  },
  pinDivider: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px 0 8px',
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.5, fontWeight: 800,
  },
};
