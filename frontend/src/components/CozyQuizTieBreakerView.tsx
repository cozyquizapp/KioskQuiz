// ── Cozy Quiz — Beamer: Schätz-Stechen ───────────────────────────────────────
// 2026-07-04: Stechfrage bei Gleichstand am Spielende. SCHÄTZUNG — näheste Zahl
// gewinnt (bei Gleichstand die schnellere Abgabe). Beide Modi: im Arena-Modus
// sind die Kandidaten die Faktions-Repräsentanten (Wappen + Faktionsname). Alle
// tippen eine Zahl, dann Reveal (Mod-Space oder Timer-Ende).
import React, { useEffect, useState } from 'react';
import { QQStateUpdate, qqMegaFactionName } from '../../../shared/quarterQuizTypes';
import { QQ_COLORS } from '../../../shared/qqColors';
import { QQTeamAvatar } from './QQTeamAvatar';
import { useLangFlip, qqArenaType } from '../cozyQuizShared';
import { getServerNow } from '../utils/serverTime';

export function TieBreakerView({ state: s }: { state: QQStateUpdate }) {
  const tb = (s as any).tieBreaker as import('../../../shared/quarterQuizTypes').QQTieBreakerState | null;
  // 2026-07-08 Konsistenz B5: 'both'-Modus flippt jetzt DE/EN wie alle anderen
  // Beamer-Screens (vorher `s.language !== 'en'` = blieb bei 'both' immer DE).
  const de = useLangFlip(s.language) === 'de';
  const arena = !!(s as any).largeGroupMode;

  // Live-Countdown (nur Anzeige — Auto-Reveal macht der Server).
  // 2026-07-08 T4: getServerNow statt Date.now (Server-Clock, kein Drift).
  const [now, setNow] = useState(() => getServerNow());
  useEffect(() => {
    if (!tb || tb.revealed || !tb.endsAt) return;
    const h = setInterval(() => setNow(getServerNow()), 250);
    return () => clearInterval(h);
  }, [tb?.endsAt, tb?.revealed]);
  if (!tb) return null;

  const nameFor = (id: string) => {
    const t = s.teams.find(x => x.id === id);
    if (!t) return id;
    return arena ? qqMegaFactionName(t.avatarId, de ? 'de' : 'en') : t.name;
  };
  const revealed = tb.revealed;
  const unit = tb.unit ? ` ${tb.unit}` : '';
  const secsLeft = tb.endsAt && !revealed ? Math.max(0, Math.ceil((tb.endsAt - now) / 1000)) : null;

  // Beste (näheste) Schätzung je Kandidat — für Reveal-Anzeige.
  const avToCandidate = new Map<string, string>();
  tb.candidateIds.forEach(cid => { const av = s.teams.find(t => t.id === cid)?.avatarId; if (av) avToCandidate.set(av, cid); });
  const candidateOf = (a: { teamId: string; avatarId: string }) =>
    tb.candidateIds.includes(a.teamId) ? a.teamId : (a.avatarId && avToCandidate.get(a.avatarId)) || null;
  const bestByCandidate: Record<string, { guess: number; dist: number }> = {};
  for (const a of tb.answers) {
    const cid = candidateOf(a); if (!cid) continue;
    const dist = Math.abs(a.guess - tb.target);
    if (!bestByCandidate[cid] || dist < bestByCandidate[cid].dist) bestByCandidate[cid] = { guess: a.guess, dist };
  }
  const answeredCount = tb.answers.length;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '2.4cqh', padding: '4cqh 6cqw', boxSizing: 'border-box',
      // 2026-07-08 Konsistenz B5: einziger Beamer-View ohne eigenes overflow-
      // hidden — bei vielen Kandidaten/langen Namen sonst Clipping-Risiko.
      overflow: 'hidden',
      background: 'radial-gradient(circle at 50% 28%, rgba(236,72,153,0.12), transparent 60%)',
      // 2026-07-19 (Kolosseum-Font-Sweep): das Stechen ist der Drama-Moment des
      // Abends und lief bisher hart auf Nunito. qqArenaType statt dem lokalen
      // `arena` (Z. 18) — letzteres ist rohes largeGroupMode und wuerde auch in
      // „Schlicht" feuern, was Wolf ausdruecklich nicht will.
      fontFamily: qqArenaType(s) ? 'var(--font-arena-body)' : "'Nunito', 'Geist', system-ui, sans-serif",
      textAlign: 'center',
    }}>
      {/* Eyebrow + Titel */}
      <div style={{ fontSize: '2cqh', fontWeight: 900, letterSpacing: '0.3em', color: QQ_COLORS.brandPink, textTransform: 'uppercase' }}>
        {de ? 'Gleichstand' : 'Dead heat'}
      </div>
      <div style={{ fontSize: '6.6cqh', fontWeight: 900, lineHeight: 1, color: '#fff', letterSpacing: '0.02em', textShadow: '0 4px 24px rgba(236,72,153,0.5)' }}>
        ⚔️ {de ? 'STECHEN' : 'SUDDEN DEATH'}
      </div>
      <div style={{ fontSize: '2.3cqh', fontWeight: 800, color: QQ_COLORS.slate400 }}>
        {de ? 'Schätzfrage, am nächsten dran gewinnt!' : 'Estimate, closest guess wins!'}
      </div>

      {/* Kandidaten mit Wappen (+ Schätzung nach Reveal) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '4cqw', flexWrap: 'wrap' }}>
        {tb.candidateIds.map(id => {
          const t = s.teams.find(x => x.id === id);
          if (!t) return null;
          const isWinner = revealed && tb.winnerId === id;
          const dim = revealed && !isWinner;
          const best = bestByCandidate[id];
          const hasAnswered = arena
            ? tb.answers.some(a => a.avatarId === t.avatarId)
            : tb.answers.some(a => a.teamId === id);
          return (
            <div key={id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6cqh',
              opacity: dim ? 0.4 : 1, transition: 'opacity 0.5s ease', transform: isWinner ? 'scale(1.08)' : 'none',
            }}>
              <div style={{ filter: isWinner ? 'drop-shadow(0 0 18px rgba(34,197,94,0.7))' : 'none' }}>
                <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={'clamp(84px, 10cqw, 156px)'} bgColor={t.color} />
              </div>
              <div style={{ fontSize: '2.4cqh', fontWeight: 900, color: isWinner ? '#22C55E' : t.color }}>
                {nameFor(id)} {isWinner && '🏆'}
              </div>
              {revealed
                ? <div style={{ fontSize: '2.6cqh', fontWeight: 900, color: isWinner ? '#22C55E' : '#fff' }}>
                    {best ? `${best.guess}${unit}` : (de ? '—' : '—')}
                    {best && <span style={{ fontSize: '1.7cqh', color: QQ_COLORS.slate400, fontWeight: 700 }}> ({de ? 'Δ' : 'off'} {best.dist})</span>}
                  </div>
                : <div style={{ fontSize: '2cqh', fontWeight: 800, color: hasAnswered ? '#22C55E' : QQ_COLORS.slate400 }}>
                    {hasAnswered ? '✓' : '…'}
                  </div>}
            </div>
          );
        })}
      </div>

      {/* Frage */}
      <div style={{ fontSize: '4.2cqh', fontWeight: 900, color: '#fff', maxWidth: '82cqw', lineHeight: 1.15, textWrap: 'balance' as any }}>
        {tb.prompt}
      </div>

      {/* Reveal: Ziel-Zahl / sonst Countdown + Status */}
      {revealed ? (
        <>
          <div style={{ fontSize: '2.2cqh', fontWeight: 800, color: QQ_COLORS.slate400 }}>
            {de ? 'Richtige Antwort' : 'Correct answer'}
          </div>
          <div style={{ fontSize: '6cqh', fontWeight: 900, color: QQ_COLORS.brandPink, lineHeight: 1 }}>
            {tb.target}{unit}
          </div>
          {tb.winnerId && (
            <div style={{ fontSize: '3cqh', fontWeight: 900, color: '#22C55E' }}>
              {de ? `${nameFor(tb.winnerId)} war am nächsten dran!` : `${nameFor(tb.winnerId)} was closest!`}
            </div>
          )}
        </>
      ) : (
        <>
          {secsLeft !== null && (
            <div style={{
              fontSize: '5cqh', fontWeight: 900, lineHeight: 1,
              color: secsLeft <= 5 ? '#EF4444' : '#fff',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {secsLeft}s
            </div>
          )}
          <div style={{ fontSize: '2.3cqh', fontWeight: 800, color: QQ_COLORS.slate400 }}>
            {de ? `⚡ Auf die Handys, tippt eure Zahl! (${answeredCount} abgegeben)` : `⚡ Grab your phones, enter your number! (${answeredCount} in)`}
          </div>
        </>
      )}
    </div>
  );
}
