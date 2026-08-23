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
import { getActiveThemeId, QUIRKS_THEME_ID } from '../qqTheme';
import { QQEmojiIcon } from './QQIcon';

export function TieBreakerView({ state: s }: { state: QQStateUpdate }) {
  const tb = (s as any).tieBreaker as import('../../../shared/quarterQuizTypes').QQTieBreakerState | null;
  // 2026-07-08 Konsistenz B5: 'both'-Modus flippt jetzt DE/EN wie alle anderen
  // Beamer-Screens (vorher `s.language !== 'en'` = blieb bei 'both' immer DE).
  const de = useLangFlip(s.language) === 'de';
  const arena = !!(s as any).largeGroupMode;
  // 2026-08-23 (Uebergabe 2a): diese Folie war bis dahin NIE angesehen worden.
  // Sie laeuft nur bei Gleichstand am Spielende - selten, aber dann live vor
  // Publikum, und dann ist sie der Drama-Moment des Abends.
  const istBuehne = getActiveThemeId() === QUIRKS_THEME_ID;
  const gedaempft = istBuehne ? 'var(--qq-text-muted)' : QQ_COLORS.slate400;

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
      background: 'radial-gradient(circle at 50% 28%, rgba(var(--qq-accent-rgb),0.12), transparent 60%)',
      // 2026-07-19 (Kolosseum-Font-Sweep): das Stechen ist der Drama-Moment des
      // Abends und lief bisher hart auf Nunito. qqArenaType statt dem lokalen
      // `arena` (Z. 18) — letzteres ist rohes largeGroupMode und wuerde auch in
      // „Schlicht" feuern, was Wolf ausdruecklich nicht will.
      // Auf der Buehne die Quiz-Schrift ueber den Phase-Root, nicht hart Nunito -
      // sonst steht ausgerechnet der Drama-Moment in einer anderen Schrift als
      // der ganze Abend davor.
      fontFamily: qqArenaType(s) ? 'var(--font-arena-body)'
        : (istBuehne ? 'var(--qq-font)' : "'Nunito', 'Geist', system-ui, sans-serif"),
      textAlign: 'center',
    }}>
      {/* Eyebrow + Titel */}
      <div style={{ fontSize: istBuehne ? '2.6cqh' : '2cqh', fontWeight: 900, letterSpacing: '0.3em', color: istBuehne ? gedaempft : QQ_COLORS.brandPink, textTransform: 'uppercase' }}>
        {de ? 'Gleichstand' : 'Dead heat'}
      </div>
      {/* 2026-08-23 (2a): die gekreuzten Schwerter waren ein rohes Systemzeichen
          und wurden auf jedem Rechner anders gemalt. Sie bekommen keinen Ersatz:
          das Wort STECHEN steht hier in 6,6cqh, das ist das Signal. */}
      <div style={{ fontSize: '6.6cqh', fontWeight: 900, lineHeight: 1, color: 'var(--qq-text)', letterSpacing: '0.02em', textShadow: istBuehne ? 'none' : '0 4px 24px rgba(var(--qq-accent-rgb),0.5)' }}>
        {istBuehne ? '' : '⚔️ '}{de ? 'STECHEN' : 'SUDDEN DEATH'}
      </div>
      <div style={{ fontSize: '2.3cqh', fontWeight: 800, color: gedaempft }}>
        {/* 2026-08-23 (Wolf: „stechen mit schaetzchen unlogisch, ist ja eigene
            quiz kategorie"). Der Einwand trifft die BESCHRIFTUNG, nicht die
            Mechanik. Nachgesehen in QQ_TIEBREAKER_POOL: dort steht keine
            einzige Schaetzfrage. „Wie viele Sterne hat die EU-Flagge",
            „Wie viele Tasten hat ein Klavier" - das weiss man oder nicht, da
            schaetzt niemand. Es sind Wissensfragen, deren Antwort zufaellig
            eine Zahl ist, und die Zahl ist nur das Mittel, um immer einen
            Sieger zu bekommen. Schaetzchen dagegen fragt echte Schaetzwerte.
            Das Wort „Schaetzfrage" hat die zwei zu einem gemacht. */}
        {de ? 'Eine Zahl entscheidet. Wer am nächsten dran ist, gewinnt.' : 'One number decides. Closest wins.'}
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
              {/* Der Sieger ist schon durch drei Dinge markiert: 8 Prozent
                  groesser, gruener Name, der andere auf 40 Prozent gedimmt. Ein
                  vierter Traeger als 18px-Hof weicht auf Projektionsdistanz nur
                  die Kante der Marke auf. */}
              <div style={{ filter: (isWinner && !istBuehne) ? 'drop-shadow(0 0 18px rgba(34,197,94,0.7))' : 'none' }}>
                <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={'clamp(84px, 10cqw, 156px)'} bgColor={t.color} />
              </div>
              {/* Teamname in Creme: die Marke direkt darueber ist bis 156px gross
                  und traegt die Teamfarbe als volle Flaeche. Gruen bleibt fuer den
                  Sieger, das ist eine der vier Farben und heisst hier „richtig". */}
              <div style={{ fontSize: istBuehne ? '2.8cqh' : '2.4cqh', fontWeight: 900, color: isWinner ? '#22C55E' : (istBuehne ? 'var(--qq-text)' : t.color) }}>
                {nameFor(id)} {isWinner && (istBuehne ? <QQEmojiIcon emoji="🏆" size="1em" /> : '🏆')}
              </div>
              {revealed
                ? <div style={{ fontSize: '2.6cqh', fontWeight: 900, color: isWinner ? '#22C55E' : 'var(--qq-text)' }}>
                    {best ? `${best.guess}${unit}` : (de ? '–' : '–')}
                    {best && <span style={{ fontSize: '1.7cqh', color: gedaempft, fontWeight: 700 }}> ({de ? 'Δ' : 'off'} {best.dist})</span>}
                  </div>
                : <div style={{ fontSize: '2cqh', fontWeight: 800, color: hasAnswered ? '#22C55E' : gedaempft }}>
                    {hasAnswered ? '✓' : '…'}
                  </div>}
            </div>
          );
        })}
      </div>

      {/* Frage */}
      <div style={{ fontSize: '4.2cqh', fontWeight: 900, color: 'var(--qq-text)', maxWidth: '82cqw', lineHeight: 1.15, textWrap: 'balance' as any }}>
        {tb.prompt}
      </div>

      {/* Reveal: Ziel-Zahl / sonst Countdown + Status */}
      {revealed ? (
        <>
          <div style={{ fontSize: istBuehne ? '2.6cqh' : '2.2cqh', fontWeight: 800, color: gedaempft }}>
            {de ? 'Richtige Antwort' : 'Correct answer'}
          </div>
          {/* Die Ziel-Zahl stand in Marken-Pink, einer fuenften Farbe. Sie ist
              die richtige Antwort, und richtig ist auf der Buehne gruen - genau
              wie die Loesung auf jeder anderen Frage des Abends. */}
          <div style={{ fontSize: '6cqh', fontWeight: 900, color: istBuehne ? QQ_COLORS.green400 : QQ_COLORS.brandPink, lineHeight: 1 }}>
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
              color: secsLeft <= 5 ? '#EF4444' : 'var(--qq-text)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {secsLeft}s
            </div>
          )}
          {/* Der Blitz war ein rohes Systemzeichen vor einer Aufforderung, die
              sich selbst erklaert. */}
          <div style={{ fontSize: istBuehne ? '2.7cqh' : '2.3cqh', fontWeight: 800, color: gedaempft }}>
            {istBuehne
              ? (de ? `Auf die Handys, tippt eure Zahl! (${answeredCount} abgegeben)` : `Grab your phones, enter your number! (${answeredCount} in)`)
              : (de ? `⚡ Auf die Handys, tippt eure Zahl! (${answeredCount} abgegeben)` : `⚡ Grab your phones, enter your number! (${answeredCount} in)`)}
          </div>
        </>
      )}
    </div>
  );
}
