// ── QQ Bar-Race Test — Groß-Gruppen-Beamer-Choreografie ──────────────────────
// Brainstorm-Prototyp 2026-07-01 (Wolf). Beamer-optimierte 3-Akt-Sequenz für den
// Groß-Gruppen-Modus (bis 100 Personen / 25 Teams):
//
//   AKT 1 — FRAGE AKTIV: Frage + Optionen, Abgaben-Zähler steigt (Spannung).
//   AKT 2 — TOP-5 AUFLÖSUNG: „✓ Richtig", dann 5 Schnellste kaskadiert
//           (Avatar + Zeit + Punkte) + drunter Avatare der anderen Richtigen.
//   AKT 3 — GESAMTWERTUNG: Bar-Race mit Überholmomenten (Top-5 + eigene Zeile).
//
// Punkte: jede Richtige +1 Basis, Top-5 zusätzlich +5/4/3/2/1.
// „▶ Weiter" steppt durch die Akte; Auto-Play spielt getimed ab.
//
// WICHTIG: reiner Prototyp. Echter Quiz-Flow (Grid/Placement) unberührt — echte
// Integration wäre ein gegateter Setup-Modus.
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

const QUESTIONS = [
  { emoji: '🎬', cat: 'Film',       q: 'Welcher Film gewann 2020 den Oscar als bester Film?', options: ['1917', 'Parasite', 'Joker', 'Ford v Ferrari'], correct: 1 },
  { emoji: '🌍', cat: 'Geografie',  q: 'Welches Land hat die meisten Zeitzonen?',             options: ['Russland', 'USA', 'Frankreich', 'China'],        correct: 2 },
  { emoji: '🎵', cat: 'Musik',      q: 'Wer komponierte die „Mondscheinsonate"?',            options: ['Mozart', 'Bach', 'Beethoven', 'Chopin'],         correct: 2 },
  { emoji: '⚽', cat: 'Sport',      q: 'Wie viele Feldspieler hat eine Fußballmannschaft?',   options: ['9', '10', '11', '12'],                           correct: 2 },
  { emoji: '🔬', cat: 'Wissen',     q: 'Häufigstes Element im Universum?',                    options: ['Sauerstoff', 'Wasserstoff', 'Helium', 'Kohlenstoff'], correct: 1 },
  { emoji: '🍕', cat: 'Essen',      q: 'Aus welchem Land stammt die Margherita-Pizza?',       options: ['Frankreich', 'Spanien', 'Italien', 'Griechenland'], correct: 2 },
];

const THIN_ROW_H = 40;
const BIG_ROW_H = 74;
const BASE_POINT = 1;
const SPEED_BONUS = [5, 4, 3, 2, 1];
const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
const OPT_LETTERS = ['A', 'B', 'C', 'D'];

type Phase = 'idle' | 'question' | 'reveal' | 'standings';
type QResult = {
  n: number; qIdx: number; correctCount: number;
  top5: { team: number; time: number; points: number }[];
  also: number[]; gain: number[];
};

function colorFor(i: number): string {
  if (i < QQ_TEAM_PALETTE.length) return QQ_TEAM_PALETTE[i];
  return `hsl(${((i * 137.508) % 360).toFixed(0)} 70% 56%)`;
}

const KEYFRAMES = `
@keyframes brPodIn { from { opacity:0; transform: translateY(16px) scale(0.95); } to { opacity:1; transform:none; } }
@keyframes brAlsoIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform:none; } }
@keyframes brPulse { 0%,100% { opacity:0.45; } 50% { opacity:1; } }
@keyframes brPop { from { opacity:0; transform: scale(0.8); } to { opacity:1; transform:none; } }
`;

export default function QQBarRaceTestPage() {
  const [teamCount, setTeamCount] = useState(16);
  const [correctRate, setCorrectRate] = useState(0.65);
  const [autoPlay, setAutoPlay] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [yourTeam, setYourTeam] = useState(11);
  const [lastDelta, setLastDelta] = useState<number[]>(() => new Array(16).fill(0));
  const [result, setResult] = useState<QResult | null>(null);
  const [submitted, setSubmitted] = useState(0);

  const resultRef = useRef<QResult | null>(null);
  const targetRef = useRef<number[]>(new Array(16).fill(0));
  const [display, setDisplay] = useState<number[]>(() => new Array(16).fill(0));

  const teams = useMemo(
    () => Array.from({ length: teamCount }, (_, i) => ({ ...ANIMALS[i % ANIMALS.length], color: colorFor(i) })),
    [teamCount],
  );

  useEffect(() => {
    targetRef.current = new Array(teamCount).fill(0);
    resultRef.current = null;
    setDisplay(new Array(teamCount).fill(0));
    setLastDelta(new Array(teamCount).fill(0));
    setResult(null);
    setPhase('idle');
    setRound(0);
    setYourTeam(y => Math.min(y, teamCount - 1));
  }, [teamCount]);

  // Dauer-rAF: easet Anzeige-Werte zu Ziel-Werten.
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

  const nextQuestion = useCallback(() => {
    const parts = teams.map((_, i) => {
      const correct = Math.random() < correctRate;
      return { team: i, correct, time: correct ? 1 + Math.random() * 13 : Infinity };
    });
    const correctSorted = parts.filter(p => p.correct).sort((a, b) => a.time - b.time);
    const top5 = correctSorted.slice(0, 5);
    const also = correctSorted.slice(5).map(p => p.team);
    const gain = new Array(teamCount).fill(0);
    for (const p of correctSorted) gain[p.team] += BASE_POINT;
    top5.forEach((p, idx) => { gain[p.team] += SPEED_BONUS[idx]; });
    const res: QResult = {
      n: round + 1, qIdx: round % QUESTIONS.length, correctCount: correctSorted.length,
      top5: top5.map((p, idx) => ({ team: p.team, time: p.time, points: BASE_POINT + SPEED_BONUS[idx] })),
      also, gain,
    };
    resultRef.current = res;
    setResult(res);
    setSubmitted(0);
    setPhase('question');
    setRound(r => r + 1);
  }, [teams, teamCount, correctRate, round]);

  const applyGain = useCallback(() => {
    const g = resultRef.current?.gain;
    if (!g) return;
    targetRef.current = targetRef.current.map((v, i) => v + (g[i] ?? 0));
    setLastDelta(g);
  }, []);

  const advance = useCallback(() => {
    if (phase === 'idle') nextQuestion();
    else if (phase === 'question') setPhase('reveal');
    else if (phase === 'reveal') { applyGain(); setPhase('standings'); }
    else nextQuestion();
  }, [phase, nextQuestion, applyGain]);

  const reset = useCallback(() => {
    targetRef.current = new Array(teamCount).fill(0);
    resultRef.current = null;
    setDisplay(new Array(teamCount).fill(0));
    setLastDelta(new Array(teamCount).fill(0));
    setResult(null);
    setPhase('idle');
    setRound(0);
    setAutoPlay(false);
  }, [teamCount]);

  // Abgaben-Zähler in AKT 1.
  useEffect(() => {
    if (phase !== 'question') return;
    setSubmitted(0);
    const step = Math.max(30, Math.round(1700 / teamCount));
    const id = window.setInterval(() => {
      setSubmitted(s => (s >= teamCount ? teamCount : s + 1));
    }, step);
    return () => window.clearInterval(id);
  }, [phase, teamCount]);

  // Auto-Play: getimte Akt-Übergänge.
  useEffect(() => {
    if (!autoPlay) return;
    const dur: Record<Phase, number> = { idle: 500, question: 2600, reveal: 4600, standings: 3800 };
    const id = window.setTimeout(advance, dur[phase]);
    return () => window.clearTimeout(id);
  }, [autoPlay, phase, advance]);

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
  const q = result ? QUESTIONS[result.qIdx] : null;

  const renderRow = (teamI: number, top: number, rowH: number, big: boolean, pinnedRankLabel?: number) => {
    const t = teams[teamI];
    if (!t) return null;
    const val = Math.round(display[teamI] ?? 0);
    const pct = ((display[teamI] ?? 0) / maxVal) * 100;
    const isYou = teamI === yourTeam;
    const rank = pinnedRankLabel ?? (rankOf[teamI] + 1);
    const delta = lastDelta[teamI] ?? 0;
    return (
      <div key={teamI} onClick={() => setYourTeam(teamI)} style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: rowH - 6,
        transform: `translateY(${top}px)`, transition: 'transform 0.65s cubic-bezier(0.34,1.2,0.5,1)',
        display: 'flex', alignItems: 'center', gap: big ? 14 : 10, padding: big ? '0 16px' : '0 10px',
        borderRadius: big ? 16 : 10, background: isYou ? 'rgba(236,72,153,0.16)' : 'rgba(255,255,255,0.04)',
        boxShadow: isYou ? '0 0 0 2px #EC4899' : 'none', cursor: 'pointer',
      }}>
        <span style={{ width: big ? 40 : 26, textAlign: 'center', fontWeight: 900, fontSize: big ? 24 : 15, opacity: rank === 1 ? 1 : 0.55 }}>
          {rank === 1 ? '👑' : rank}
        </span>
        <span style={{ fontSize: big ? 34 : 22, width: big ? 44 : 28, textAlign: 'center' }}>{t.emoji}</span>
        <span style={{ width: big ? 150 : 104, fontWeight: 800, fontSize: big ? 19 : 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
        <div style={{ flex: 1, height: big ? 30 : 18, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color}dd)`, borderRadius: 999, boxShadow: `0 0 12px ${t.color}66` }} />
        </div>
        <span style={{ width: big ? 84 : 58, textAlign: 'right', fontWeight: 900, fontSize: big ? 26 : 16, fontVariantNumeric: 'tabular-nums' }}>{val}</span>
        <span style={{ width: big ? 44 : 30, textAlign: 'right', fontSize: big ? 14 : 11, fontWeight: 800, opacity: delta > 0 ? 0.85 : 0, color: '#9DCB2F' }}>{delta > 0 ? `+${delta}` : ''}</span>
      </div>
    );
  };

  const phaseLabels: Record<Phase, string> = { idle: 'Bereit', question: 'Akt 1 · Frage aktiv', reveal: 'Akt 2 · Top-5 Auflösung', standings: 'Akt 3 · Gesamtwertung' };

  return (
    <div style={S.page}>
      <style>{KEYFRAMES}</style>

      {/* Steuerleiste (nicht Teil des Beamers) */}
      <div style={S.controls}>
        <div style={S.btnRow}>
          <button style={S.btnPrimary} onClick={advance}>
            {phase === 'idle' ? '▶ Start' : phase === 'standings' ? '▶ Nächste Frage' : '▶ Weiter'}
          </button>
          <button style={{ ...S.btn, ...(autoPlay ? S.btnActive : null) }} onClick={() => setAutoPlay(a => !a)}>
            {autoPlay ? '⏸ Auto stop' : '⏩ Auto-Play'}
          </button>
          <button style={S.btnGhost} onClick={reset}>↺ Reset</button>
          <span style={S.phaseTag}>{phaseLabels[phase]}{round > 0 ? ` · Frage ${round}` : ''}</span>
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
          <span style={S.hint}>Klick auf eine Wertungs-Zeile = „dein Team"</span>
        </div>
      </div>

      {/* ── BEAMER-FRAME ─────────────────────────────────────────────────────── */}
      <div style={S.beamer}>
        {phase === 'idle' && (
          <div style={S.center}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🏁</div>
            <div style={S.bigTitle}>Mega Event</div>
            <div style={S.dim}>„▶ Start" beginnt die Frage-Sequenz.</div>
          </div>
        )}

        {phase === 'question' && q && (
          <div style={S.qWrap}>
            <div style={S.catChip}><span style={{ fontSize: 24 }}>{q.emoji}</span> {q.cat}</div>
            <div style={S.qText}>{q.q}</div>
            <div style={S.optGrid}>
              {q.options.map((o, i) => (
                <div key={i} style={S.opt}>
                  <span style={S.optLetter}>{OPT_LETTERS[i]}</span>{o}
                </div>
              ))}
            </div>
            <div style={S.submitBar}>
              <span style={{ animation: 'brPulse 1.4s ease-in-out infinite', fontWeight: 800 }}>Teams antworten…</span>
              <span style={S.submitCount}>{submitted} / {teamCount} abgegeben</span>
            </div>
          </div>
        )}

        {phase === 'reveal' && result && q && (
          <div style={S.revWrap}>
            <div style={S.correctBanner}>
              ✓ Richtig: <b>{OPT_LETTERS[q.correct]} · {q.options[q.correct]}</b>
              <span style={S.correctCount}>{result.correctCount} / {teamCount} wussten's</span>
            </div>
            <div style={S.podium}>
              {result.top5.map((r, idx) => {
                const t = teams[r.team];
                if (!t) return null;
                return (
                  <div key={r.team} style={{ ...S.podRow, ...(r.team === yourTeam ? S.podRowYou : null), animation: `brPodIn 0.5s ease both`, animationDelay: `${idx * 0.5}s` }}>
                    <span style={S.podMedal}>{MEDALS[idx]}</span>
                    <span style={S.podAvatar}>{t.emoji}</span>
                    <span style={S.podName}>{t.name}</span>
                    <span style={S.podTime}>{r.time.toFixed(1)}s</span>
                    <span style={{ ...S.podPts, color: t.color }}>+{r.points}</span>
                  </div>
                );
              })}
            </div>
            {result.also.length > 0 && (
              <div style={{ ...S.alsoWrap, animation: 'brAlsoIn 0.5s ease both', animationDelay: `${result.top5.length * 0.5 + 0.2}s` }}>
                <span style={S.alsoLabel}>auch richtig · je +{BASE_POINT}</span>
                <div style={S.alsoRow}>
                  {result.also.map(teamI => {
                    const t = teams[teamI];
                    if (!t) return null;
                    return (
                      <span key={teamI} title={t.name} style={{ ...S.alsoChip, ...(teamI === yourTeam ? { boxShadow: '0 0 0 2px #EC4899' } : null), animation: 'brPop 0.3s ease both' }}>
                        {t.emoji}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {phase === 'standings' && (
          <div style={S.standWrap}>
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
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', background: 'radial-gradient(1200px 800px at 20% 0%, #1e2a5a 0%, #0e1530 60%, #0a0f24 100%)',
    color: '#f4f6ff', fontFamily: "'Nunito', system-ui, sans-serif", padding: '20px 28px 48px',
  },
  controls: {
    maxWidth: 1040, margin: '0 auto 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 16,
    padding: 14, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 12,
  },
  btnRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  btn: { background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 14px', fontWeight: 800, fontSize: 14, cursor: 'pointer' },
  btnPrimary: { background: '#EC4899', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 900, fontSize: 14, cursor: 'pointer' },
  btnGhost: { background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px 14px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  btnActive: { background: '#A21247', boxShadow: '0 0 0 2px rgba(236,72,153,0.4)' },
  phaseTag: { marginLeft: 'auto', fontSize: 13, fontWeight: 800, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 },
  sliders: { display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' },
  sliderRow: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200 },
  sliderLabel: { display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.85, fontWeight: 700 },
  sliderVal: { color: '#EC4899', fontSize: 15 },
  range: { width: '100%', accentColor: '#EC4899' },
  hint: { marginLeft: 'auto', fontSize: 12, opacity: 0.5 },

  beamer: {
    maxWidth: 1040, margin: '0 auto', aspectRatio: '16 / 9', background: 'rgba(0,0,0,0.32)',
    borderRadius: 24, border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
    padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', position: 'relative',
  },
  center: { textAlign: 'center', margin: 'auto' },
  bigTitle: { fontSize: 40, fontWeight: 900, letterSpacing: -0.5 },
  dim: { opacity: 0.6, fontSize: 17, marginTop: 8 },

  // AKT 1
  qWrap: { display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center' },
  catChip: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.4)', borderRadius: 999, padding: '6px 16px', fontWeight: 800, fontSize: 15 },
  qText: { fontSize: 34, fontWeight: 900, lineHeight: 1.2, maxWidth: 800 },
  optGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 720 },
  opt: { display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 18px', fontSize: 19, fontWeight: 700, textAlign: 'left' },
  optLetter: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.12)', fontWeight: 900, fontSize: 15 },
  submitBar: { display: 'flex', alignItems: 'center', gap: 20, marginTop: 4 },
  submitCount: { fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: 17, opacity: 0.85 },

  // AKT 2
  revWrap: { display: 'flex', flexDirection: 'column', gap: 14 },
  correctBanner: { display: 'flex', alignItems: 'baseline', gap: 14, fontSize: 22, fontWeight: 700, color: '#9DCB2F', marginBottom: 4 },
  correctCount: { marginLeft: 'auto', fontSize: 15, fontWeight: 800, opacity: 0.6, color: '#f4f6ff' },
  podium: { display: 'flex', flexDirection: 'column', gap: 8 },
  podRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '9px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.05)' },
  podRowYou: { boxShadow: '0 0 0 2px #EC4899', background: 'rgba(236,72,153,0.14)' },
  podMedal: { fontSize: 26, width: 34, textAlign: 'center' },
  podAvatar: { fontSize: 30, width: 40, textAlign: 'center' },
  podName: { flex: 1, fontWeight: 800, fontSize: 19 },
  podTime: { fontVariantNumeric: 'tabular-nums', fontSize: 15, fontWeight: 700, opacity: 0.55, width: 58, textAlign: 'right' },
  podPts: { fontWeight: 900, fontSize: 22, width: 50, textAlign: 'right' },
  alsoWrap: { marginTop: 6 },
  alsoLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5, fontWeight: 800 },
  alsoRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  alsoChip: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.07)', fontSize: 22 },

  // AKT 3
  standWrap: { display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  beamerLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.5, fontWeight: 800, marginBottom: 14 },
  pinDivider: { display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px 0 8px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.5, fontWeight: 800 },
};
