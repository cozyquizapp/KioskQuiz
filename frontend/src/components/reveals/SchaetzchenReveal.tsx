/**
 * SchaetzchenReveal — "SPOTLIGHT PANEL" (Konzept C, Blank-Slate-Neubau 2026-07-12).
 *
 * Weg mit dem Zahlenstrahl. Der Reveal ist jetzt eine TV-SHOW, kein Diagramm.
 * Die Fraktionen stehen als CHARAKTERE in einer Reihe auf einer Bühne (Jackbox /
 * Family Feud), jede mit einem Antwort-Paddle. Die wahre Zahl ist NICHT der Held —
 * sie ist der Aufbau (bescheidene Klapptafel oben). Der Held ist das LICHT: ein
 * Spotlight fegt die Reihe entlang und rastet auf dem Sieger ein, der Rest dimmt
 * ins Publikums-Dunkel. Man erinnert den MENSCHEN, der gewinnt, nicht die Zahl.
 *
 * Gebrochene Annahmen (vs. Zahlenstrahl): Nähe muss NICHT räumlich gezeigt werden ·
 * die Zahl thront NICHT · Rang wird NICHT abgelesen (die Reihe ist nach Tippwert
 * sortiert, das LICHT findet den Sieger) · kein flaches Chart, sondern eine Bühne.
 *
 * Reveal als SEQUENZ (6 Beats): Bühne steht → Zahl klappt ein → Paddles hoch →
 * Saallicht fällt + Spotlight fegt → Spotlight rastet ein + Konfetti → Callout.
 * animate-Skill (Emil Kowalski): bespoke Keyframes + rAF, reduced-motion respektiert.
 * [[project-design-system-audit-2026-07-12]]
 */

import { useState, useEffect, useMemo } from 'react';
import type { QQStateUpdate } from '../../../../shared/quarterQuizTypes';
import { qqMegaFactionName, qqMegaFactionSlug } from '../../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { QQEmojiIcon } from '../QQIcon';
import { playAvatarCascadeNote, playClimaxFinish } from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';
import { useActiveThemeId } from '../../qqTheme';

const MINT = QQ_COLORS.green300;
// Konfetti-Richtungen am Einrast-Moment (px).
const CONFETTI = [
  { dx: -60, dy: -78, r: -20 }, { dx: -22, dy: -96, r: 12 }, { dx: 20, dy: -92, r: -14 },
  { dx: 58, dy: -80, r: 22 }, { dx: -84, dy: -44, r: -8 }, { dx: 82, dy: -50, r: 16 },
  { dx: -38, dy: -66, r: 30 }, { dx: 40, dy: -70, r: -26 },
];

export function SchaetzchenReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const target = q.targetValue as number;

  const unitStr = (lang === 'en' && q.unitEn ? q.unitEn : q.unit) ?? '';
  const looksLikeYear = (n: number) => Number.isInteger(n) && n >= 1000 && n <= 2100;
  const isYearUnit = !!q.isYearAnswer || /jahr|year/i.test(unitStr) || (target != null && looksLikeYear(target));
  const fmt = (n: number) => {
    const abs = Math.abs(n);
    if (isYearUnit) return String(Math.round(n));
    if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (abs >= 10000) return (n / 1000).toFixed(0) + 'k';
    if (abs >= 1000) return n.toLocaleString(lang === 'en' ? 'en-US' : 'de-DE');
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  };

  const ranked = useMemo(() => {
    return s.answers
      .map(a => {
        const num = Number(String(a.text).replace(/[^0-9.,\-]/g, '').replace(',', '.'));
        const team = s.teams.find(t => t.id === a.teamId);
        if (!team || !Number.isFinite(num)) return null;
        return { teamId: a.teamId, num, team, delta: Math.abs(num - target), submittedAt: a.submittedAt };
      })
      .filter((x): x is { teamId: string; num: number; team: NonNullable<ReturnType<typeof s.teams.find>>; delta: number; submittedAt: number } => !!x)
      .sort((a, b) => a.delta - b.delta || a.submittedAt - b.submittedAt);
  }, [s.answers, s.teams, target]);

  const isMega = !!(s as any).nestedTeams || new Set(s.teams.map(t => t.avatarId)).size < s.teams.length;
  const rankedFinal = useMemo(() => {
    if (!isMega) return ranked;
    const bestByAvatar = new Map<string, typeof ranked[number]>();
    for (const r of ranked) {
      const prev = bestByAvatar.get(r.team.avatarId);
      if (!prev || r.delta < prev.delta) bestByAvatar.set(r.team.avatarId, r);
    }
    return [...bestByAvatar.values()]
      .map(r => ({ ...r, team: { ...r.team, name: qqMegaFactionName(r.team.avatarId, lang), emoji: qqMegaFactionSlug(r.team.avatarId) ?? r.team.emoji } }))
      .sort((a, b) => a.delta - b.delta || a.submittedAt - b.submittedAt);
  }, [ranked, isMega, lang]);

  const winner = rankedFinal[0] ?? null;
  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  useActiveThemeId();

  // Reihe nach TIPPWERT sortiert (nicht Rang) — das Licht findet den Sieger, man liest ihn nicht ab.
  const panel = useMemo(() => [...rankedFinal].sort((a, b) => a.num - b.num), [rankedFinal]);
  const N = Math.max(1, panel.length);
  const winIndex = winner ? panel.findIndex(p => p.teamId === winner.teamId) : -1;
  const winX = winIndex >= 0 ? ((winIndex + 0.5) / N) * 100 : 50;

  const offWord = lang === 'en' ? 'off' : 'daneben';
  const winnerStatus = winner
    ? (winner.delta === 0 ? { text: lang === 'en' ? 'exact' : 'getroffen', color: MINT, exact: true }
      : { text: lang === 'en' ? 'closest' : 'am nächsten', color: 'var(--qq-accent)', exact: false })
    : null;

  // ── Dramaturgie (6 Beats) ──
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [beat, setBeat] = useState<number>(reduce ? 5 : 0);
  useEffect(() => {
    if (reduce) return;
    const sfx = !s.sfxMuted;
    const ts: ReturnType<typeof setTimeout>[] = [
      setTimeout(() => setBeat(1), 500),   // Zahl klappt ein
      setTimeout(() => setBeat(2), 1300),  // Paddles hoch
      setTimeout(() => setBeat(3), 2400),  // Saallicht fällt, Spotlight fegt
      setTimeout(() => setBeat(4), 3400),  // Spotlight rastet ein
      setTimeout(() => setBeat(5), 3900),  // Callout
    ];
    if (sfx) {
      // Paddles klappen hoch: aufsteigende Kaskade.
      panel.forEach((_, i) => {
        ts.push(setTimeout(() => { try { playAvatarCascadeNote(i, N + 2); } catch {} }, 1300 + i * 90));
      });
      // Spotlight rastet auf dem Sieger ein: Climax.
      ts.push(setTimeout(() => { try { playClimaxFinish(); } catch {} }, 3400));
    }
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answerStr = fmt(target);
  const answerChars = answerStr.split('');
  const lit = beat >= 4;         // Sieger ist beleuchtet (Held)
  const housedark = beat >= 3;   // Saallicht ist gefallen

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: 'clamp(16px, 2.2cqh, 30px) clamp(24px, 3.4cqw, 56px) clamp(10px, 1.4cqh, 20px)',
      animation: 'contentReveal 0.5s var(--qq-enter) both',
      minHeight: 0, position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes qqFlap{0%{transform:rotateX(-92deg);opacity:0}55%{transform:rotateX(12deg);opacity:1}100%{transform:rotateX(0);opacity:1}}
        @keyframes qqPaddle{0%{transform:rotateX(88deg) translateY(10px);opacity:0}60%{transform:rotateX(-8deg);opacity:1}100%{transform:rotateX(0);opacity:1}}
        @keyframes qqRaise{0%{transform:translate(-50%,26px);opacity:0}100%{transform:translate(-50%,0);opacity:1}}
        @keyframes qqWinLift{0%{transform:translateY(0) scale(1)}55%{transform:translateY(-4%) scale(1.16)}100%{transform:translateY(-3%) scale(1.12)}}
        @keyframes qqConfetti{0%{transform:translate(-50%,-50%) scale(.4) rotate(0);opacity:0}22%{opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1) rotate(var(--r));opacity:0}}
        @keyframes qqHunt{0%{transform:translateX(-46cqw)}38%{transform:translateX(34cqw)}64%{transform:translateX(-18cqw)}84%{transform:translateX(9cqw)}100%{transform:translateX(0)}}
        @keyframes qqCalloutIn{0%{transform:translate(-50%,10px);opacity:0}100%{transform:translate(-50%,0);opacity:1}}
      `}</style>

      {/* ── Kopf: Eyebrow + Frage (kompakt, oben links) ── */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 4, maxWidth: '58%' }}>
        <div style={{
          fontSize: 'clamp(12px, 1.1cqw, 17px)', fontWeight: 900, color: 'var(--qq-accent)',
          letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 'clamp(4px, 0.6cqh, 9px)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <QQEmojiIcon emoji="🎯" /> {lang === 'en' ? 'Guess It · Reveal' : 'Schätzchen · Auflösung'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 110 ? 'clamp(19px, 2.0cqw, 33px)' : 'clamp(22px, 2.4cqw, 40px)',
          fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.01em', color: 'var(--qq-card-text)',
          animation: 'langFadeIn 0.4s ease both',
        }}>{qText}</div>
      </div>

      {/* ── Klapptafel: die wahre Zahl (Aufbau, nicht der Held) ── */}
      <div style={{
        flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 'clamp(6px,0.7cqw,10px)',
        marginTop: 'clamp(6px,0.9cqh,14px)', position: 'relative', zIndex: 4,
        perspective: '600px',
      }}>
        <span style={{
          fontSize: 'clamp(11px, 1cqw, 15px)', fontWeight: 900, color: 'var(--qq-text-muted)',
          letterSpacing: '0.2em', textTransform: 'uppercase', alignSelf: 'center', marginRight: 'clamp(4px,0.6cqw,10px)',
          opacity: beat >= 1 ? 1 : 0, transition: 'opacity 0.4s',
        }}>{lang === 'en' ? 'Answer' : 'Antwort'}</span>
        {answerChars.map((ch, i) => (
          <span key={i} style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 3.6cqw, 66px)', fontWeight: 700,
            lineHeight: 1, color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums',
            padding: /[0-9]/.test(ch) ? 'clamp(3px,0.5cqh,7px) clamp(6px,0.7cqw,11px)' : 0,
            borderRadius: 8,
            background: /[0-9]/.test(ch) ? 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.28))' : 'transparent',
            boxShadow: /[0-9]/.test(ch) ? 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.4)' : 'none',
            transformOrigin: 'center', transformStyle: 'preserve-3d',
            opacity: beat >= 1 ? 1 : 0,
            animation: beat >= 1 && !reduce ? `qqFlap 0.5s var(--qq-celebrate) ${i * 0.09}s both` : 'none',
          }}>{ch}</span>
        ))}
        {unitStr && (
          <span style={{
            fontSize: 'clamp(13px, 1.4cqw, 24px)', fontWeight: 800, color: 'var(--qq-text-muted)', alignSelf: 'center',
            opacity: beat >= 1 ? 1 : 0, transition: 'opacity 0.4s 0.3s',
          }}>{unitStr}</span>
        )}
      </div>

      {/* ── Bühne: die Panel-Reihe der Charaktere ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, zIndex: 1 }}>
        {panel.length === 0 ? (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--qq-text-muted)', fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 700,
          }}>{lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}</div>
        ) : (
          <>
            {/* Bühnenboden (warme Kante) */}
            <div aria-hidden style={{
              position: 'absolute', left: '-6%', right: '-6%', bottom: '6%', height: 3, borderRadius: 3,
              background: 'linear-gradient(90deg, transparent, rgba(255,214,150,0.35), rgba(var(--qq-accent-rgb),0.28), rgba(255,214,150,0.35), transparent)',
            }} />
            <div aria-hidden style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, height: '14%', pointerEvents: 'none',
              background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.30))',
            }} />

            {/* Saallicht fällt: Publikums-Dunkel legt sich über die Bühne */}
            <div aria-hidden style={{
              position: 'absolute', inset: '-10%', pointerEvents: 'none', zIndex: 3,
              background: 'radial-gradient(120% 90% at 50% 62%, transparent 30%, rgba(6,4,14,0.72) 100%)',
              opacity: housedark ? 1 : 0, transition: 'opacity 0.7s var(--qq-enter)',
            }} />

            {/* Spotlight: fegt die Reihe entlang und rastet auf dem Sieger ein */}
            {housedark && winner && (
              <div aria-hidden style={{
                position: 'absolute', left: `${winX}%`, top: '50%', width: '30cqw', height: '116%',
                transform: 'translate(-50%,-50%)', zIndex: 3, pointerEvents: 'none',
                background: `radial-gradient(46% 50% at 50% 42%, ${winnerStatus?.exact ? 'rgba(59,224,165,0.34)' : 'rgba(255,244,222,0.34)'}, rgba(255,240,215,0.10) 55%, transparent 72%)`,
                animation: !reduce ? 'qqHunt 1s var(--qq-enter) both' : 'none',
                mixBlendMode: 'screen',
              }} />
            )}

            {/* Die Charaktere (absolut positioniert = Spotlight rastet exakt) */}
            {panel.map((r, i) => {
              const isWin = r.teamId === winner?.teamId;
              const dim = housedark && !(isWin && lit);
              const crest = 'clamp(52px, 5.8cqw, 108px)';
              return (
                <div key={r.teamId} style={{
                  position: 'absolute', left: `${((i + 0.5) / N) * 100}%`, bottom: '9%',
                  width: `${88 / N}cqw`, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  transform: 'translateX(-50%)', zIndex: isWin && lit ? 5 : 2,
                  opacity: beat >= 0 ? 1 : 0,
                  animation: beat >= 0 && !reduce ? `qqRaise 0.5s var(--qq-celebrate) ${i * 0.05}s both` : 'none',
                }}>
                  {/* Fußlicht-Glow unter dem Charakter */}
                  <div aria-hidden style={{
                    position: 'absolute', bottom: '-6%', left: '50%', transform: 'translateX(-50%)',
                    width: '90%', height: 'clamp(12px,1.6cqh,26px)', borderRadius: '50%',
                    background: `radial-gradient(50% 100% at 50% 100%, ${isWin && lit ? (winnerStatus?.exact ? MINT : r.team.color) : r.team.color}${isWin && lit ? '88' : '33'}, transparent 70%)`,
                    filter: 'blur(3px)', transition: 'background 0.4s',
                  }} />

                  {/* Charakter-Wrapper (Sieger hebt + skaliert beim Einrasten) */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(4px,0.6cqh,9px)',
                    transformOrigin: 'center bottom',
                    filter: dim ? 'brightness(0.32) saturate(0.7)' : 'none',
                    transition: 'filter 0.5s var(--qq-enter)',
                    animation: isWin && lit && !reduce ? 'qqWinLift 0.6s var(--qq-celebrate) both' : 'none',
                  }}>
                    <div style={{
                      borderRadius: '50%',
                      boxShadow: isWin && lit
                        ? `0 0 44px ${winnerStatus?.exact ? MINT : r.team.color}, 0 8px 22px rgba(0,0,0,0.45)`
                        : `0 0 14px ${r.team.color}66`,
                      transition: 'box-shadow 0.4s',
                    }}>
                      <QQTeamAvatar avatarId={r.team.avatarId} teamEmoji={r.team.emoji} size={crest} />
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: isWin ? 'clamp(13px, 1.4cqw, 22px)' : 'clamp(11px, 1.15cqw, 17px)',
                      fontWeight: 700, color: 'var(--qq-card-text)', whiteSpace: 'nowrap',
                      maxWidth: `${86 / N}cqw`, overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{r.team.name}</span>

                    {/* Antwort-Paddle (klappt bei Beat 2 hoch) */}
                    <div style={{
                      perspective: '400px',
                      opacity: beat >= 2 ? 1 : 0,
                    }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'baseline', gap: 'clamp(2px,0.3cqw,5px)',
                        padding: 'clamp(4px,0.6cqh,8px) clamp(8px,0.9cqw,14px)', borderRadius: 'var(--qq-pill-radius)',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(0,0,0,0.30))',
                        border: `1.5px solid ${isWin && lit ? (winnerStatus?.exact ? 'rgba(59,224,165,0.6)' : 'rgba(var(--qq-accent-rgb),0.55)') : 'rgba(255,255,255,0.14)'}`,
                        transformOrigin: 'center bottom', transformStyle: 'preserve-3d',
                        animation: beat >= 2 && !reduce ? `qqPaddle 0.5s var(--qq-celebrate) ${i * 0.09}s both` : 'none',
                        transition: 'border-color 0.4s',
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-display)', fontSize: isWin ? 'clamp(18px, 2cqw, 34px)' : 'clamp(15px, 1.6cqw, 27px)',
                          fontWeight: 700, color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums',
                        }}>{fmt(r.num)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Konfetti am Sieger beim Einrasten */}
                  {isWin && lit && !reduce && (
                    <div aria-hidden style={{ position: 'absolute', top: '30%', left: '50%', zIndex: 6, pointerEvents: 'none' }}>
                      {CONFETTI.map((c, ci) => (
                        <span key={ci} style={{
                          position: 'absolute', left: 0, top: 0, width: 9, height: 12, borderRadius: 2,
                          ['--dx' as any]: `${c.dx}px`, ['--dy' as any]: `${c.dy}px`, ['--r' as any]: `${c.r * 18}deg`,
                          background: ci % 2 === 0 ? (winnerStatus?.exact ? MINT : r.team.color) : 'var(--qq-accent)',
                          animation: `qqConfetti 0.85s var(--qq-enter) ${ci * 0.02}s both`,
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Sieger-Callout (unter der Bühne, erscheint beim Einrasten) */}
            {winner && winnerStatus && (
              <div style={{
                position: 'absolute', left: `${winX}%`, bottom: '-1%', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: 'clamp(8px,0.9cqw,14px)', zIndex: 6, whiteSpace: 'nowrap',
                opacity: lit ? 1 : 0,
                animation: lit && !reduce ? 'qqCalloutIn 0.5s var(--qq-enter) 0.1s both' : 'none',
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 2.3cqw, 40px)', fontWeight: 700,
                  color: 'var(--qq-card-text)', textShadow: `0 0 22px ${(winnerStatus.exact ? MINT : winner.team.color)}66`,
                }}>{winner.team.name}</span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 1.5cqw, 24px)', fontWeight: 700,
                  color: winnerStatus.color,
                  padding: 'clamp(3px,0.5cqh,6px) clamp(11px,1.2cqw,17px)', borderRadius: 'var(--qq-pill-radius)',
                  background: winnerStatus.exact ? 'rgba(59,224,165,0.20)' : 'rgba(var(--qq-accent-rgb),0.18)',
                  border: `1.5px solid ${winnerStatus.exact ? 'rgba(59,224,165,0.55)' : 'rgba(var(--qq-accent-rgb),0.5)'}`,
                }}>{winnerStatus.exact ? '✨ ' : ''}{winnerStatus.text}{winner.delta > 0 ? ` · ${fmt(winner.delta)} ${offWord}` : ''}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
