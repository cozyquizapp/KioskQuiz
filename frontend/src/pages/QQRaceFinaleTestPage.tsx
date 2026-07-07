import { useState, useEffect } from 'react';
import { RaceFinalSlide } from '../components/CozyQuizFinalRevealView';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';

/**
 * QQRaceFinaleTestPage — Vorschau des alten (deprecated) Raketen-Finales
 * RaceFinalSlide. Nur zum Anschauen/Vergleichen; das Live-Finale
 * (FinalEurovisionFinale) bleibt unberuehrt. 2026-07-07 (Wolf).
 * Team-Anzahl 4/6/8 umschaltbar; Neustart-Button (remount) spielt die
 * Choreo erneut ab.
 */

const STAGE_W = 1760;
const STAGE_H = 990;

type Team = QQStateUpdate['teams'][number];

const ALL: Team[] = [
  { id: 't1', name: 'Zwischen Bier und Bildung', color: '#A855F7', avatarId: 'seekuh',      emoji: 'seekuh' },
  { id: 't2', name: 'Pubquatscher',              color: '#22C55E', avatarId: 'schwan',      emoji: 'schwan' },
  { id: 't3', name: 'Brain-Trust',               color: '#06B6D4', avatarId: 'walross',     emoji: 'walross' },
  { id: 't4', name: 'Käse-Kenner',               color: '#3B82F6', avatarId: 'gorilla',     emoji: 'gorilla' },
  { id: 't5', name: 'Frag Mich Was Leichtes',    color: '#F59E0B', avatarId: 'zebra',       emoji: 'zebra' },
  { id: 't6', name: 'Nicht Zuhause',             color: '#EC4899', avatarId: 'schildkroete', emoji: 'schildkroete' },
  { id: 't7', name: 'Die Grübler',               color: '#EF4444', avatarId: 'fuchs',       emoji: 'fuchs' },
  { id: 't8', name: 'Wolfsrudel',                color: '#14B8A6', avatarId: 'wolf',         emoji: 'wolf' },
] as unknown as Team[];

function buildRanking(n: number) {
  return ALL.slice(0, n).map((team, i) => {
    const score = 10 - i * 2 + (i === 0 ? 1 : 0);
    const bonus = (n - i) % 3;
    const awards = i < 2 ? 1 : 0;
    return { team, score, bonus, awards, total: score + bonus + awards };
  }).sort((a, b) => b.total - a.total);
}

export default function QQRaceFinaleTestPage() {
  const [n, setN] = useState<4 | 6 | 8>(6);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }, []);

  const ranking = buildRanking(n);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0F0817', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <div style={{
        width: STAGE_W, height: STAGE_H, flexShrink: 0, position: 'relative',
        display: 'flex', flexDirection: 'column', containerType: 'size', overflow: 'hidden',
      }}>
        <RaceFinalSlide key={`${n}-${runKey}`} finalRanking={ranking as any} lang="de" />
      </div>

      {/* Steuer-Panel */}
      <div style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', background: 'rgba(20,16,31,0.92)',
        border: '1px solid rgba(236,72,153,0.4)', borderRadius: 14, zIndex: 1000,
        color: '#F1F5F9', fontSize: 13, fontWeight: 800,
      }}>
        <span style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11 }}>Race-Finale (alt)</span>
        {([4, 6, 8] as const).map(v => (
          <button key={v} onClick={() => { setN(v); setRunKey(k => k + 1); }} style={{
            padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12, fontFamily: 'inherit',
            background: n === v ? '#EC4899' : 'rgba(255,255,255,0.06)', color: n === v ? '#fff' : '#94a3b8',
          }}>{v} Teams</button>
        ))}
        <button onClick={() => setRunKey(k => k + 1)} style={{
          padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 12, fontFamily: 'inherit',
          background: 'rgba(34,197,94,0.18)', color: '#22C55E',
        }}>↻ Nochmal abspielen</button>
      </div>
    </div>
  );
}
