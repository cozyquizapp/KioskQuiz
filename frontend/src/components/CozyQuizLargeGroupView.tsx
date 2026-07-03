// ── CozyQuizLargeGroupView — Groß-Gruppen-Modus Beamer (Akt 2 + Akt 3) ───────
// Teil des largeGroupMode (bis 25 Teams, Bar-Race statt Grid). Doku:
// memory project_large_group_mode. Die 3 Akte des Groß-Gruppen-Loops:
//   Akt 1 = QUESTION_ACTIVE → bestehende QuestionView (unverändert wiederverwendet)
//   Akt 2 = QUESTION_REVEAL  → LargeGroupRevealView (hier): Top-5-schnellste-Reveal
//   Akt 3 = PLACEMENT        → LargeGroupStandingsView (hier): Bar-Race-Gesamtwertung
//
// Punkte-Modell (spiegelt Backend qqLargeGroupAwardPoints): jede Richtige +1,
// Top-5-schnellste zusätzlich +5/4/3/2/1. Reihenfolge aus currentQuestionWinners
// (fastest zuerst). Score-Feld = largestConnected (= Punkte im Groß-Modus).

import { useMemo, useRef, useLayoutEffect, useState, useEffect } from 'react';
import type { QQStateUpdate, QQTeam, QQMegaRankEntry, QQMegaAwards } from '../../../shared/quarterQuizTypes';
import { QQ_AVATARS, qqMegaFactionName, qqMegaFactionSlug } from '../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from './QQTeamAvatar';
import { TeamNameLabel } from './TeamNameLabel';
import { QQEmojiIcon, QQIcon } from './QQIcon';
import { qqSortedTeams, qqSortedGroups } from '../qqShared';
import { ConfettiOverlay } from './CozyQuizConfettiOverlay';

const SPEED_BONUS = [5, 4, 3, 2, 1];
const MEDALS = ['🥇', '🥈', '🥉'];
const STANDINGS_ROW_H = 88;
const STANDINGS_MAX = 10;

function pointsForRank(idx: number): number {
  return 1 + (idx < 5 ? SPEED_BONUS[idx] : 0);
}

const KEYFRAMES = `
@keyframes brPodIn { from { opacity: 0; transform: translateY(18px) scale(0.95); } to { opacity: 1; transform: none; } }
@keyframes brAlsoIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes brRankIn { from { opacity: 0; transform: translateX(-26px); } to { opacity: 1; transform: none; } }
@keyframes brPtsPop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.18); } 100% { transform: scale(1); opacity: 1; } }
@keyframes brFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes brBarGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
`;

// Farbe/Label je avatarId (= Farb-Slot) aus dem kanonischen Avatar-Set.
interface AvaMeta { label: string; labelEn: string; color: string }
const AVA_BY_ID = new Map<string, AvaMeta>(
  QQ_AVATARS.map(a => [a.id, { label: a.label, labelEn: a.labelEn, color: a.color }] as [string, AvaMeta]),
);

// ── Akt 2: Top-5-schnellste-Reveal ───────────────────────────────────────────
export function LargeGroupRevealView({ state }: { state: QQStateUpdate }) {
  const de = state.language !== 'en';
  const byId = useMemo(() => new Map(state.teams.map(t => [t.id, t])), [state.teams]);
  const winners = state.currentQuestionWinners ?? (state.correctTeamId ? [state.correctTeamId] : []);
  const top5 = winners.slice(0, 5);
  const also = winners.slice(5);
  const answer = state.revealedAnswer ?? state.currentQuestion?.answer ?? '';

  return (
    <div style={S.wrap}>
      <style>{KEYFRAMES}</style>
      <div style={S.correctBanner}>
        <span style={{ opacity: 0.6, fontWeight: 800 }}>{de ? 'Richtig' : 'Correct'}:</span>
        <b style={{ marginLeft: 12 }}>{answer}</b>
        <span style={S.correctCount}>
          {winners.length} / {state.teams.length} {de ? 'wussten’s' : 'knew it'}
        </span>
      </div>

      {state.nestedTeams ? (
        // Modell B (Akt 2 = Auflösung): richtige Antwort + wie viele Handys
        // richtig lagen. Die Punkte-Verteilung pro Farbe kommt im nächsten
        // Beat (Standings, Akt 3) — hier bewusst nur die Auflösung.
        <div style={S.megaReveal}>
          <div style={S.megaRevealBig}>
            <b style={{ color: '#EC4899' }}>{winners.length}</b> {de ? 'von' : 'of'} {state.teams.length} {de ? 'Handys richtig' : 'phones correct'}
          </div>
          <div style={S.megaRevealTrack}>
            <div style={{
              height: '100%', width: `${state.teams.length ? (winners.length / state.teams.length) * 100 : 0}%`,
              background: 'linear-gradient(90deg, #EC4899, #F472B6)', borderRadius: 999,
              boxShadow: '0 0 18px rgba(236,72,153,0.5)', transition: 'width 0.9s cubic-bezier(0.34,1.05,0.5,1)',
            }} />
          </div>
          <div style={S.megaRevealHint}>{de ? 'Punkte gleich in der Wertung →' : 'Points up next in the scoring →'}</div>
        </div>
      ) : top5.length === 0 ? (
        <div style={S.emptyReveal}>{de ? 'Niemand richtig — weiter geht’s!' : 'Nobody correct — moving on!'}</div>
      ) : (
        <div style={S.podium}>
          {top5.map((teamId, idx) => {
            const t = byId.get(teamId);
            if (!t) return null;
            return (
              <div key={teamId} style={{ ...S.podRow, animation: 'brPodIn 0.5s ease both', animationDelay: `${idx * 0.45}s` }}>
                <span style={S.podMedal}>{idx < 3 ? <QQEmojiIcon emoji={MEDALS[idx]} /> : idx + 1}</span>
                <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={92} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <TeamNameLabel name={t.name} fontSize={40} color={t.color} fontWeight={900} maxLines={1} shrinkAfter={16} />
                </div>
                <span style={{ ...S.podPts, color: t.color }}>+{pointsForRank(idx)}</span>
              </div>
            );
          })}

          {also.length > 0 && (
            <div style={{ ...S.alsoWrap, animation: 'brAlsoIn 0.5s ease both', animationDelay: `${top5.length * 0.45 + 0.2}s` }}>
              <span style={S.alsoLabel}>{de ? 'auch richtig · je +1' : 'also correct · +1 each'}</span>
              <div style={S.alsoRow}>
                {also.map(teamId => {
                  const t = byId.get(teamId);
                  if (!t) return null;
                  return (
                    <span key={teamId} title={t.name} style={S.alsoChip}>
                      <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={52} />
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Akt 3: per-Frage-Wertung (Beat A) → Bar-Race-Gesamtwertung (Beat B) ───────
export function LargeGroupStandingsView({ state }: { state: QQStateUpdate }) {
  const de = state.language !== 'en';
  const ranking = state.megaQuestionRanking ?? [];
  const hasRanking = !!state.nestedTeams && ranking.length > 0;

  // 2-Beat-Reveal: zuerst „Wertung dieser Frage" (transparent, wer wie viele
  // Handys richtig hatte → Punkte), dann Cross-Fade in den Gesamtstand.
  // Remount pro Frage (key im Beamer) setzt den Beat sauber zurück.
  const [beat, setBeat] = useState<'question' | 'standings'>(hasRanking ? 'question' : 'standings');
  useEffect(() => {
    if (!hasRanking) return;
    const t = setTimeout(() => setBeat('standings'), 4200);
    return () => clearTimeout(t);
  }, [hasRanking]);

  if (beat === 'question' && hasRanking) {
    return <MegaQuestionRanking state={state} ranking={ranking} de={de} />;
  }
  return <CumulativeStandings state={state} de={de} />;
}

// ── Beat A: Punkte-Verteilung dieser Frage (Modell B, niedrigschwellig) ───────
function MegaQuestionRanking({ state, ranking, de }: { state: QQStateUpdate; ranking: QQMegaRankEntry[]; de: boolean }) {
  const rows = useMemo(() => [...ranking].sort((a, b) => a.rank - b.rank), [ranking]);
  return (
    <div style={S.qrWrap}>
      <style>{KEYFRAMES}</style>
      <div style={S.qrLabel}>{de ? 'Wertung dieser Frage' : 'This question’s scoring'}</div>
      <div style={S.qrList}>
        {rows.map((r, i) => {
          const ava = AVA_BY_ID.get(r.avatarId);
          const color = ava?.color ?? '#EC4899';
          const name = qqMegaFactionName(r.avatarId, de ? 'de' : 'en');
          const medal = i < 3 && r.points > 0 ? MEDALS[i] : null;
          const scored = r.points > 0;
          return (
            <div key={r.avatarId} style={{ ...S.qrRow, animation: 'brRankIn 0.5s ease both', animationDelay: `${i * 0.32}s`, opacity: scored ? 1 : 0.5 }}>
              <span style={S.qrRank}>{medal ? <QQEmojiIcon emoji={medal} /> : i + 1}</span>
              <QQTeamAvatar avatarId={r.avatarId as QQTeam['avatarId']} teamEmoji={qqMegaFactionSlug(r.avatarId)} size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                <Dots correct={r.correct} total={r.total} color={color} de={de} />
              </div>
              <span style={{
                ...S.qrPts, color: scored ? color : 'rgba(255,255,255,0.4)',
                animation: scored ? 'brPtsPop 0.5s ease both' : undefined, animationDelay: `${i * 0.32 + 0.25}s`,
              }}>
                {scored ? `+${r.points}` : '±0'}
              </span>
            </div>
          );
        })}
      </div>
      <div style={S.qrFoot}>{de ? '⚡ Je mehr Handys richtig — und je schneller — desto mehr Punkte' : '⚡ More phones correct — and faster — means more points'}</div>
    </div>
  );
}

// Punkte-Dots: gefüllt = richtige Sub-Teams, hohl = Rest. Bei >5 nur Zahl.
function Dots({ correct, total, color, de }: { correct: number; total: number; color: string; de: boolean }) {
  const showDots = total > 0 && total <= 5;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      {showDots && (
        <span style={{ display: 'inline-flex', gap: 5 }}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} style={{
              width: 15, height: 15, borderRadius: '50%',
              background: i < correct ? color : 'transparent',
              border: `2px solid ${i < correct ? color : 'rgba(255,255,255,0.28)'}`,
              boxShadow: i < correct ? `0 0 8px ${color}88` : 'none',
            }} />
          ))}
        </span>
      )}
      <span style={{ fontSize: 17, fontWeight: 800, opacity: 0.7 }}>
        {correct}/{total} {de ? 'Handys richtig' : 'phones correct'}
      </span>
    </div>
  );
}

// ── Beat B: Bar-Race-Gesamtwertung ───────────────────────────────────────────
function CumulativeStandings({ state, de }: { state: QQStateUpdate; de: boolean }) {
  // Genestet (Idee 2): 8 Eltern-Team-Balken (nach avatarId gruppiert, Punkte
  // summiert) statt bis zu 24 Sub-Team-Balken. Sonst: reale Teams.
  const sorted = state.nestedTeams ? qqSortedGroups(state) : qqSortedTeams(state);
  const shown = sorted.slice(0, STANDINGS_MAX);
  const rest = sorted.length - shown.length;
  const maxVal = Math.max(1, ...shown.map(t => t.largestConnected));

  // Rang pro Team-ID (für FLIP-artige Reorder-Animation via translateY).
  const rankOf = useMemo(() => {
    const m = new Map<string, number>();
    shown.forEach((t, i) => m.set(t.id, i));
    return m;
  }, [shown.map(t => t.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Modell B: per-Frage-Ergebnis pro Farbe (avatarId) → +Punkte + ✓-Zahl an der Row.
  const qByAvatar = useMemo(() => {
    const m = new Map<string, QQMegaRankEntry>();
    for (const r of (state.megaQuestionRanking ?? [])) m.set(r.avatarId, r);
    return m;
  }, [state.megaQuestionRanking]);

  return (
    <div style={{ ...S.standWrap, animation: 'brFadeIn 0.5s ease both' }}>
      <style>{KEYFRAMES}</style>
      <div style={S.standLabel}>{de ? 'Gesamtwertung' : 'Standings'}</div>
      <div style={{ position: 'relative', height: shown.length * STANDINGS_ROW_H, width: '100%', maxWidth: 1100 }}>
        {shown.map(t => (
          <StandingsRow key={t.id} team={t} rank={rankOf.get(t.id) ?? 0} maxVal={maxVal} de={de} qEntry={qByAvatar.get(t.avatarId)} />
        ))}
      </div>
      {rest > 0 && (
        <div style={S.standRest}>+ {rest} {de ? 'weitere Fraktionen' : 'more factions'}</div>
      )}
    </div>
  );
}

function StandingsRow({ team, rank, maxVal, de, qEntry }: { team: QQTeam; rank: number; maxVal: number; de: boolean; qEntry?: QQMegaRankEntry }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const prevTop = useRef<number | null>(null);
  const targetTop = rank * STANDINGS_ROW_H;
  // FLIP: sanftes Gleiten bei Rang-Wechsel (Überholmoment).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prevTop.current != null && prevTop.current !== targetTop) {
      const dy = prevTop.current - targetTop;
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = 'transform 0.7s cubic-bezier(0.34,1.05,0.5,1)';
        el.style.transform = 'translateY(0)';
      }));
    }
    prevTop.current = targetTop;
  }, [targetTop]);

  const val = team.largestConnected;
  const pct = (val / maxVal) * 100;
  const medal = rank < 3 && val > 0 ? MEDALS[rank] : null;

  // Führungswechsel-Blitz (Wolf-Idee „Bar-Race Führungswechsel = Glow-Blitz"):
  // wenn eine Fraktion von Rang >0 auf Rang 0 (Krone) springt, kurz aufleuchten.
  // Kein Flash beim ersten Mount (prevRank null) → nur echte Overtakes.
  const prevRank = useRef<number | null>(null);
  const [leadFlash, setLeadFlash] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (prevRank.current != null && prevRank.current > 0 && rank === 0 && val > 0) {
      setLeadFlash(true);
      t = setTimeout(() => setLeadFlash(false), 1200);
    }
    prevRank.current = rank;
    return () => { if (t) clearTimeout(t); };
  }, [rank, val]);

  return (
    <div ref={ref} style={{ ...S.standRow, top: targetTop }}>
      {leadFlash && (
        <>
          <span aria-hidden style={{
            position: 'absolute', inset: '-4px -8px', borderRadius: 18,
            boxShadow: `0 0 26px 6px ${team.color}, inset 0 0 20px ${team.color}88`,
            pointerEvents: 'none', animation: 'qqLeadFlash 1.2s ease-out both',
          }} />
          <span aria-hidden style={{
            position: 'absolute', left: -6, top: -14, zIndex: 4,
            fontSize: 22, fontWeight: 900, letterSpacing: '0.02em',
            color: team.color, whiteSpace: 'nowrap',
            textShadow: `0 2px 10px ${team.color}, 0 0 4px rgba(0,0,0,0.6)`,
            pointerEvents: 'none', animation: 'qqLeadCallout 1.2s ease-out both',
          }}>⚔️ {de ? 'Führung!' : 'Lead!'}</span>
        </>
      )}
      <span style={S.standRank}>{rank === 0 && val > 0 ? <QQEmojiIcon emoji="👑" /> : rank + 1}</span>
      <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={62} />
      <div style={{ width: 260, minWidth: 0 }}>
        <TeamNameLabel name={team.name} fontSize={30} color={team.color} fontWeight={900} maxLines={1} shrinkAfter={16} />
        {/* Modell B: was diese Farbe DIESE Frage geholt hat — +Punkte + ✓-Zahl. */}
        {qEntry && (
          <div style={{ marginTop: 2, fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ color: qEntry.points > 0 ? team.color : 'rgba(255,255,255,0.35)' }}>
              {qEntry.points > 0 ? `+${qEntry.points}` : '±0'}
            </span>
            <span style={{ opacity: 0.55, fontSize: 15 }}>{qEntry.correct}/{qEntry.total} {de ? 'richtig' : 'correct'}</span>
          </div>
        )}
      </div>
      <div style={S.standBarTrack}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
          background: `linear-gradient(90deg, ${team.color}, ${team.color}dd)`,
          borderRadius: 999, boxShadow: `0 0 16px ${team.color}66`, transition: 'width 0.7s ease',
        }} />
      </div>
      <span style={{ ...S.standVal, color: team.color }}>{val}</span>
      <span style={S.standUnit}>{medal ? <QQEmojiIcon emoji={medal} /> : de ? 'Pkt' : 'pts'}</span>
    </div>
  );
}

// ── Mega-Faktions-Awards (Spielende): 3 Award-Chips (⚡🎯🔥) ───────────────────
// Wiederverwendet in Beamer-GameOver + Summary + Recap. avatarId → Farbe/Label
// aus QQ_AVATARS; Award-Icon als 3D-Fluent-PNG (fx-lightning/fx-target/fx-fire).
export function MegaAwardsStrip({ awards, de }: { awards: QQMegaAwards; de: boolean }) {
  const items = ([
    { slug: 'award-speedy' as const, label: de ? 'Schnellstes Team' : 'Fastest team', av: awards.fastest },
    { slug: 'award-sharpshooter' as const, label: de ? 'Treffsicherstes Team' : 'Sharpest team', av: awards.sharpshooter },
    { slug: 'award-underdog' as const, label: de ? 'Beste Aufholjagd' : 'Best comeback', av: awards.comeback },
  ]).filter(x => !!x.av);
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
      {items.map((it, i) => {
        const ava = AVA_BY_ID.get(it.av!);
        const color = ava?.color ?? '#EC4899';
        const name = qqMegaFactionName(it.av!, de ? 'de' : 'en');
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}44` }}>
            <QQIcon slug={it.slug} size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{it.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <QQTeamAvatar avatarId={it.av as QQTeam['avatarId']} teamEmoji={qqMegaFactionSlug(it.av!)} size={28} />
                <span style={{ fontSize: 18, fontWeight: 900, color }}>{name}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── GameOver: Sieger-Hero + Top-10-Standings (kein Grid, keine 25er-Kaskade) ──
export function LargeGroupGameOverView({ state }: { state: QQStateUpdate }) {
  const de = state.language !== 'en';
  const sorted = state.nestedTeams ? qqSortedGroups(state) : qqSortedTeams(state);
  const winner = sorted[0];
  const shown = sorted.slice(0, 10);
  const rest = sorted.length - shown.length;
  const maxVal = Math.max(1, ...shown.map(t => t.largestConnected));
  const wColor = winner?.color ?? '#EC4899';

  return (
    <div style={S.goWrap}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at 50% 22%, ${wColor}33 0%, transparent 60%)` }} />
      <ConfettiOverlay eurovisionMode={state.theme?.eurovisionMode} />

      <div style={S.goLabel}>{de ? 'Spielende' : 'Game Over'}</div>

      {winner && (
        <div style={S.goHero}>
          <img src="/icons/fx-trophy.png" alt="" aria-hidden draggable={false} style={{ width: 'clamp(60px, 6cqw, 96px)', height: 'auto', animation: 'finaleTrophyFloat 3.4s ease-in-out infinite' }} />
          <div style={{ position: 'relative', borderRadius: '50%', boxShadow: `0 0 60px ${wColor}66, 0 0 120px ${wColor}40` }}>
            <QQTeamAvatar avatarId={winner.avatarId} teamEmoji={winner.emoji} size={'clamp(110px, 11cqw, 170px)'} />
          </div>
          <TeamNameLabel name={winner.name} maxLines={1} shrinkAfter={12} color={wColor} fontWeight={900} fontSize="clamp(30px, 3.4cqw, 52px)" fontSizeLong="clamp(22px, 2.4cqw, 36px)" style={{ textAlign: 'center' }} />
          <div style={{ ...S.goWinPts, color: wColor }}>{winner.largestConnected} {de ? 'Punkte' : 'points'}</div>
        </div>
      )}

      <div style={{ position: 'relative', width: '100%', maxWidth: 1000, height: shown.length * 62, marginTop: 8 }}>
        {shown.map((t, i) => {
          const pct = (t.largestConnected / maxVal) * 100;
          const medal = i < 3 && t.largestConnected > 0 ? MEDALS[i] : null;
          return (
            <div key={t.id} style={{ ...S.goRow, top: i * 62 }}>
              <span style={S.goRank}>{i === 0 && t.largestConnected > 0 ? <QQEmojiIcon emoji="👑" /> : i + 1}</span>
              <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={44} />
              <div style={{ width: 220, minWidth: 0 }}>
                <TeamNameLabel name={t.name} fontSize={24} color={t.color} fontWeight={900} maxLines={1} shrinkAfter={16} />
              </div>
              <div style={S.goBarTrack}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color}dd)`, borderRadius: 999 }} />
              </div>
              <span style={{ ...S.goVal, color: t.color }}>{t.largestConnected}</span>
              <span style={S.goUnit}>{medal ? <QQEmojiIcon emoji={medal} /> : (de ? 'Pkt' : 'pts')}</span>
            </div>
          );
        })}
      </div>
      {rest > 0 && <div style={S.goRest}>+ {rest} {de ? 'weitere Fraktionen' : 'more factions'}</div>}

      {state.megaAwards && (
        <div style={{ marginTop: 18, position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={S.goLabel}>{de ? 'Fraktions-Awards' : 'Faction awards'}</div>
          <MegaAwardsStrip awards={state.megaAwards} de={de} />
        </div>
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  wrap: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28, padding: '0 64px', color: '#f4f6ff' },
  correctBanner: { display: 'flex', alignItems: 'baseline', fontSize: 40, fontWeight: 800 },
  correctCount: { marginLeft: 'auto', fontSize: 26, fontWeight: 800, opacity: 0.6 },
  emptyReveal: { textAlign: 'center', fontSize: 40, fontWeight: 800, opacity: 0.7, padding: '60px 0' },

  // Akt 2 nested „Auflösung"
  megaReveal: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, padding: '30px 0 10px' },
  megaRevealBig: { fontSize: 46, fontWeight: 900, textAlign: 'center' },
  megaRevealTrack: { width: 'min(720px, 80%)', height: 26, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' },
  megaRevealHint: { fontSize: 22, fontWeight: 700, opacity: 0.5 },

  // Akt 3 Beat A „Wertung dieser Frage"
  qrWrap: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 56px', color: '#f4f6ff', animation: 'brFadeIn 0.4s ease both' },
  qrLabel: { fontSize: 24, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.6, fontWeight: 900 },
  qrList: { display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 940 },
  qrRow: { display: 'flex', alignItems: 'center', gap: 20, padding: '10px 22px', borderRadius: 16, background: 'rgba(255,255,255,0.05)' },
  qrRank: { width: 52, textAlign: 'center', fontWeight: 900, fontSize: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  qrPts: { fontWeight: 900, fontSize: 42, minWidth: 96, textAlign: 'right' },
  qrFoot: { fontSize: 20, fontWeight: 700, opacity: 0.5, textAlign: 'center', marginTop: 4 },
  podium: { display: 'flex', flexDirection: 'column', gap: 14 },
  podRow: { display: 'flex', alignItems: 'center', gap: 22, padding: '10px 22px', borderRadius: 18, background: 'rgba(255,255,255,0.05)' },
  podMedal: { fontSize: 44, width: 56, textAlign: 'center', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  podPts: { fontWeight: 900, fontSize: 46, minWidth: 90, textAlign: 'right' },
  alsoWrap: { marginTop: 10 },
  alsoLabel: { fontSize: 20, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.5, fontWeight: 800 },
  alsoRow: { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  alsoChip: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },

  goWrap: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 48px', color: '#f4f6ff', position: 'relative', overflow: 'hidden' },
  goLabel: { fontSize: 20, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.55, fontWeight: 800, position: 'relative', zIndex: 5 },
  goHero: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative', zIndex: 5 },
  goWinPts: { fontWeight: 900, fontSize: 'clamp(16px, 1.7cqw, 24px)' },
  goRow: { position: 'absolute', left: 0, right: 0, height: 54, display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', borderRadius: 14, background: 'rgba(255,255,255,0.045)' },
  goRank: { width: 48, textAlign: 'center', fontWeight: 900, fontSize: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  goBarTrack: { flex: 1, height: 22, background: 'rgba(255,255,255,0.06)', borderRadius: 999, position: 'relative', overflow: 'hidden' },
  goVal: { width: 74, textAlign: 'right', fontWeight: 900, fontSize: 32, fontVariantNumeric: 'tabular-nums' },
  goUnit: { width: 52, textAlign: 'left', fontSize: 18, fontWeight: 700, opacity: 0.55, display: 'inline-flex', alignItems: 'center' },
  goRest: { fontSize: 20, fontWeight: 700, opacity: 0.5, position: 'relative', zIndex: 5 },
  standWrap: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 48px', color: '#f4f6ff' },
  standLabel: { fontSize: 22, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.55, fontWeight: 800 },
  standRest: { fontSize: 22, fontWeight: 700, opacity: 0.5 },
  standRow: { position: 'absolute', left: 0, right: 0, height: STANDINGS_ROW_H - 12, display: 'flex', alignItems: 'center', gap: 20, padding: '0 22px', borderRadius: 16, background: 'rgba(255,255,255,0.045)' },
  standRank: { width: 60, textAlign: 'center', fontWeight: 900, fontSize: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  standBarTrack: { flex: 1, height: 28, background: 'rgba(255,255,255,0.06)', borderRadius: 999, position: 'relative', overflow: 'hidden' },
  standVal: { width: 90, textAlign: 'right', fontWeight: 900, fontSize: 40, fontVariantNumeric: 'tabular-nums' },
  standUnit: { width: 60, textAlign: 'left', fontSize: 22, fontWeight: 700, opacity: 0.55, display: 'inline-flex', alignItems: 'center' },
};
