/**
 * SchaetzchenReveal — "STRAHL / MESS-BUEHNE" (Neubau 2026-07-13, Skill-getrieben).
 *
 * Der Zahlenstrahl kehrt zurueck — aber als BUEHNE, nicht als Diagramm. Vorbild:
 * warme TV-Gameshow (Jackbox / Mario Party), nicht SaaS. Die Wahrheit steigt als
 * goldener Licht-Pfeiler auf der Mess-Schiene; die Teams/Fraktionen stehen als
 * Kontrahenten an ihrem Tippwert (Naeher dran = groesser). Der Saal dimmt auf den
 * Sieger, und eine PINK-BRUECKE spult sich vom Sieger zur Wahrheit auf — sie misst
 * physisch "wie nah". So sieht man beide Infos, die ein Schaetz-Reveal braucht:
 * DRUEBER/DRUNTER (Position) und WIE WEIT (Bruecke).
 *
 * Gebaut mit den Design-Skills (impeccable critique+audit / design-taste anti-slop /
 * ui-ux-pro-max / animate-Emil-Kowalski). Audit-gehaertet: Motion nur ueber transform
 * (scaleY/scaleX, kein height/left-top), ease-out (Overshoot nur EIN Held-Beat),
 * Count-up mit Hidden-Tab-Guard, reduced-motion respektiert, Wappen statt Kuerzel-Discs,
 * Zahlenbereich pro Frage aus den Daten abgeleitet + geclamped.
 * [[project-design-system-audit-2026-07-12]] · Marke: Gold=Wahrheit, Pink feiert.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import type { QQStateUpdate } from '../../../../shared/quarterQuizTypes';
import { qqMegaFactionName, qqMegaFactionSlug, qqIsMega } from '../../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { QQEmojiIcon } from '../QQIcon';
import { playAvatarCascadeNote, playClimaxFinish } from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';
import { useActiveThemeId } from '../../qqTheme';

const MINT = QQ_COLORS.green300;
const GOLD = '#EAB308';          // Schaetzchen-Kategoriefarbe = die Wahrheit
const GOLD_BRIGHT = '#FDE68A';
// Konfetti-Richtungen am Sieger-Einrasten (px).
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

  // In CozyArena bündeln wir pro Fraktion (avatarId = Farb-/Fraktions-Slot) auf den
  // besten Tipp und zeigen das Wappen + Fraktionsnamen (nie 40 Sub-Teams).
  const isMega = qqIsMega(s);
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
  const maxDelta = useMemo(() => Math.max(1, ...rankedFinal.map(r => r.delta)), [rankedFinal]);
  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  useActiveThemeId();

  // ── Zahlenbereich pro Frage aus den Daten ableiten + Rand geben (kein fixer Chart-Bereich) ──
  const { axisPct } = useMemo(() => {
    const vals = rankedFinal.map(r => r.num).concat([target]);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) { lo = target - 1; hi = target + 1; }
    const pad = (hi - lo) * 0.14 || 1;
    lo -= pad; hi += pad;
    const fn = (v: number) => {
      const p = ((v - lo) / (hi - lo)) * 86 + 7;
      return Math.max(5, Math.min(95, p)); // clamp: Ausreisser bleiben auf der Buehne
    };
    return { axisPct: fn };
  }, [rankedFinal, target]);

  // Reihe nach TIPPWERT sortiert (fuer die x-Position + 2-Reihen-Staffelung gegen Kollision).
  const panel = useMemo(() => [...rankedFinal].sort((a, b) => a.num - b.num), [rankedFinal]);
  const N = Math.max(1, panel.length);
  const tx = axisPct(target);
  const wx = winner ? axisPct(winner.num) : 50;

  // Avatare ober- UND unterhalb der Schiene (Raum nutzen + weniger Kollision):
  // zu HOCH getippt = über der Schiene, zu NIEDRIG = darunter, getroffen = auf Höhe.
  // Nur wenn eine Seite überläuft (>5), zweite Reihe staffeln.
  const placed = useMemo(() => {
    const overN = panel.filter(r => r.num > target).length;
    const underN = panel.filter(r => r.num < target).length;
    let oi = 0, ui = 0;
    return panel.map(r => {
      if (r.num === target) return { r, top: 46 };
      if (r.num > target) { const t = overN > 5 ? 30 + (oi % 2) * 12 : 34; oi++; return { r, top: t }; }
      const t = underN > 5 ? 60 + (ui % 2) * 13 : 62; ui++; return { r, top: t };
    });
  }, [panel, target]);

  const offWord = lang === 'en' ? 'off' : 'daneben';
  const winnerStatus = winner
    ? (winner.delta === 0
      ? { text: lang === 'en' ? 'spot on' : 'getroffen', color: MINT, exact: true }
      : { text: lang === 'en' ? 'closest' : 'am nächsten', color: 'var(--qq-accent)', exact: false })
    : null;

  // ── Dramaturgie ──
  // 0 Kontrahenten stehen · 1 Wahrheit zündet + Count-up · 2 Saal dimmt · 3 Sieger + Brücke · 4 Callout
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [beat, setBeat] = useState<number>(reduce ? 4 : 0);
  useEffect(() => {
    if (reduce) return;
    const sfx = !s.sfxMuted;
    const tBooths = 300 + N * 95;
    const tStrike = tBooths + 450;
    const tDark = tStrike + 950;
    const tWin = tDark + 480;
    const tCall = tWin + 260;
    const ts: ReturnType<typeof setTimeout>[] = [
      setTimeout(() => setBeat(1), tStrike),
      setTimeout(() => setBeat(2), tDark),
      setTimeout(() => setBeat(3), tWin),
      setTimeout(() => setBeat(4), tCall),
    ];
    if (sfx) {
      panel.forEach((_, i) => { ts.push(setTimeout(() => { try { playAvatarCascadeNote(i, N + 2); } catch {} }, 300 + i * 95)); });
      ts.push(setTimeout(() => { try { playClimaxFinish(); } catch {} }, tWin));
    }
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Count-up der Held-Zahl (Audit: rAF pausiert im Hintergrund-Tab → dann direkt setzen).
  const [shown, setShown] = useState<number>(reduce ? target : 0);
  const doCount = !isYearUnit; // Jahres-Antworten nicht hochzählen (0→1949 wirkt seltsam)
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (beat < 1) return;
    if (reduce || !doCount || (typeof document !== 'undefined' && document.hidden)) { setShown(target); return; }
    const start = performance.now(); const dur = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(target * e);
      if (p < 1) rafRef.current = requestAnimationFrame(tick); else setShown(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [beat, target, reduce, doCount]);

  const struck = beat >= 1;
  const housedark = beat >= 2;
  const lit = beat >= 3;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: 'clamp(14px, 2cqh, 26px) clamp(20px, 3cqw, 52px) clamp(10px, 1.4cqh, 20px)',
      animation: 'contentReveal 0.5s var(--qq-enter) both',
      minHeight: 0, position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes qqStrRaise{0%{transform:translate(-50%,26px);opacity:0}100%{transform:translate(-50%,0);opacity:1}}
        @keyframes qqStrStrike{0%{transform:translateX(-50%) scale(1.06)}100%{transform:translateX(-50%) scale(1)}}
        @keyframes qqStrConfetti{0%{transform:translate(-50%,-50%) scale(.4) rotate(0);opacity:0}22%{opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1) rotate(var(--r));opacity:0}}
        @keyframes qqStrSweep{0%{transform:translateX(-60%);opacity:0}22%{opacity:1}100%{transform:translateX(60%);opacity:0}}
        @keyframes qqStrCallout{0%{transform:translate(-50%,10px);opacity:0}100%{transform:translate(-50%,0);opacity:1}}
      `}</style>

      {/* ── Kopf: Eyebrow + Frage (kompakt oben, Kontext — die Antwort ist der Held) ── */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 6 }}>
        <div style={{
          fontSize: 'clamp(11px, 1.05cqw, 16px)', fontWeight: 900, color: 'var(--qq-accent)',
          letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 'clamp(3px, 0.5cqh, 7px)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <QQEmojiIcon emoji="🎯" /> {lang === 'en' ? 'Guess It · Reveal' : 'Schätzchen · Auflösung'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 90 ? 'clamp(16px, 1.7cqw, 27px)' : 'clamp(18px, 2cqw, 32px)',
          fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.01em', color: 'var(--qq-card-text)',
          maxWidth: '82%', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          animation: 'langFadeIn 0.4s ease both',
        }}>{qText}</div>
      </div>

      {/* ── Held: die aufleuchtende Antwort-Tafel (oben-mittig) ── */}
      <div aria-hidden style={{
        position: 'absolute', left: '50%', top: 'clamp(21%, 24cqh, 27%)', transform: 'translateX(-50%)',
        zIndex: 7, display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: struck ? 1 : 0, transition: 'opacity 0.35s var(--qq-enter)',
      }}>
        <span style={{
          fontSize: 'clamp(9px, 0.95cqw, 14px)', fontWeight: 800, color: 'var(--qq-text-muted)',
          letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4,
        }}>{lang === 'en' ? 'Answer' : 'Antwort'}</span>
        <div style={{
          display: 'inline-flex', alignItems: 'baseline', gap: 'clamp(3px,0.4cqw,7px)',
          padding: 'clamp(6px,0.9cqh,13px) clamp(14px,1.6cqw,26px)', borderRadius: 16,
          background: 'linear-gradient(180deg, rgba(30,24,58,0.92), rgba(10,8,24,0.92))',
          boxShadow: `0 0 0 2px ${GOLD}8c, 0 0 48px 9px ${GOLD}66, inset 0 1px 0 rgba(255,255,255,0.10)`,
          animation: struck && !reduce ? 'qqStrStrike 0.5s var(--qq-celebrate) both' : 'none',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 6.2cqw, 104px)', fontWeight: 700,
            lineHeight: 0.92, color: GOLD_BRIGHT, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
            textShadow: `0 0 28px ${GOLD}8c`,
          }}>{fmt(shown)}</span>
          {unitStr && (
            <span style={{ fontSize: 'clamp(13px, 1.6cqw, 26px)', fontWeight: 800, color: GOLD }}>{unitStr}</span>
          )}
        </div>
      </div>

      {/* ── Mess-Bühne ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, zIndex: 1 }}>
        {panel.length === 0 ? (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--qq-text-muted)', fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 700,
          }}>{lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}</div>
        ) : (
          <>
            {/* Licht-Sweep quer über die Bühne beim Zünden der Wahrheit */}
            <div aria-hidden style={{
              position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
              background: 'linear-gradient(105deg, transparent 38%, rgba(255,244,214,0.14) 50%, transparent 62%)',
              animation: struck && !reduce ? 'qqStrSweep 0.9s var(--qq-enter) both' : 'none', opacity: 0,
            }} />

            {/* Mess-Schiene (Bühnenboden, warm) — Trennlinie zwischen "zu hoch" und "zu niedrig" */}
            <div aria-hidden style={{
              position: 'absolute', left: '4%', right: '4%', top: '57%', height: 5, borderRadius: 5, zIndex: 2,
              background: `linear-gradient(90deg, transparent, ${GOLD}4d 12%, rgba(255,244,214,0.55) 50%, ${GOLD}4d 88%, transparent)`,
              boxShadow: `0 0 22px ${GOLD}40`,
            }} />

            {/* Wahrheits-Beam: goldene Licht-Säule über die volle Höhe an der Wahrheit (wächst per scaleY) */}
            <div aria-hidden style={{
              position: 'absolute', left: `${tx}%`, top: '30%', height: '60%', width: 'clamp(5px,0.8cqw,13px)', zIndex: 3,
              transform: `translateX(-50%) scaleY(${struck ? 1 : 0})`, transformOrigin: 'center',
              borderRadius: 10,
              background: `linear-gradient(180deg, ${GOLD}1f, ${GOLD_BRIGHT} 28%, ${GOLD_BRIGHT} 72%, ${GOLD}1f)`,
              boxShadow: `0 0 40px 7px ${GOLD}80`,
              transition: reduce ? 'none' : 'transform 0.7s var(--qq-celebrate)',
            }} />

            {/* Saallicht fällt (Publikums-Dunkel legt sich über die Bühne) */}
            <div aria-hidden style={{
              position: 'absolute', inset: '-10%', pointerEvents: 'none', zIndex: 4,
              background: 'radial-gradient(120% 90% at 50% 60%, transparent 34%, rgba(6,4,14,0.70) 100%)',
              opacity: housedark ? 1 : 0, transition: 'opacity 0.7s var(--qq-enter)',
            }} />

            {/* Pink-Brücke: spult vom Sieger zur Wahrheit auf = "wie nah" */}
            {winner && winner.delta > 0 && (
              <div aria-hidden style={{
                position: 'absolute', top: '57%', zIndex: 4, height: 5, borderRadius: 5,
                left: `${Math.min(wx, tx)}%`, width: `${Math.abs(tx - wx)}%`,
                transform: `translateY(-50%) scaleX(${lit ? 1 : 0})`,
                transformOrigin: wx <= tx ? 'left center' : 'right center',
                background: 'linear-gradient(90deg, var(--qq-accent), rgba(var(--qq-accent-rgb),0.25))',
                boxShadow: '0 0 16px rgba(var(--qq-accent-rgb),0.6)',
                transition: reduce ? 'none' : 'transform 0.55s var(--qq-celebrate)',
              }} />
            )}

            {/* Kontrahenten an ihrem Tippwert — über der Schiene = zu hoch, darunter = zu niedrig */}
            {placed.map(({ r, top }, i) => {
              const isWin = r.teamId === winner?.teamId;
              const dim = housedark && !(isWin && lit);
              const prox = 1 - 0.32 * (r.delta / maxDelta); // Näher dran = größer (Sichtbarkeit)
              const crest = 'clamp(44px, 5cqw, 90px)';
              return (
                <div key={r.teamId} style={{
                  position: 'absolute', left: `${axisPct(r.num)}%`, top: `${top}%`,
                  width: `${84 / N}cqw`, minWidth: 'clamp(54px,7cqw,116px)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  transform: 'translate(-50%, 0)', zIndex: isWin && lit ? 8 : 3,
                  animation: !reduce ? `qqStrRaise 0.5s var(--qq-celebrate) ${0.3 + i * 0.06}s both` : 'none',
                }}>
                  {/* Innerer Wrapper: Nähe-Skalierung + Sieger-Hebung, ohne Positions-Transform zu stören */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(3px,0.5cqh,8px)',
                    transformOrigin: 'center top',
                    transform: `scale(${isWin && lit ? prox * 1.14 : prox})`,
                    filter: dim ? 'brightness(0.34) saturate(0.7)' : 'none',
                    transition: 'filter 0.5s var(--qq-enter), transform 0.5s var(--qq-celebrate)',
                  }}>
                    {/* Fußlicht-Glow */}
                    <div aria-hidden style={{
                      position: 'absolute', top: '-6%', left: '50%', transform: 'translateX(-50%)',
                      width: '112%', height: 'clamp(10px,1.4cqh,22px)', borderRadius: '50%', filter: 'blur(4px)',
                      background: `radial-gradient(50% 100% at 50% 50%, ${isWin && lit ? (winnerStatus?.exact ? MINT : 'var(--qq-accent)') : r.team.color}${isWin && lit ? 'aa' : '44'}, transparent 72%)`,
                      transition: 'background 0.4s',
                    }} />
                    <div style={{
                      borderRadius: '50%',
                      boxShadow: isWin && lit
                        ? `0 0 42px ${winnerStatus?.exact ? MINT : 'var(--qq-accent)'}, 0 8px 22px rgba(0,0,0,0.45)`
                        : `0 0 14px ${r.team.color}55`,
                      transition: 'box-shadow 0.4s',
                    }}>
                      <QQTeamAvatar avatarId={r.team.avatarId} teamEmoji={r.team.emoji} size={crest} />
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 'clamp(11px, 1.15cqw, 17px)',
                      fontWeight: 700, color: 'var(--qq-card-text)', whiteSpace: 'nowrap',
                      maxWidth: `${88 / N}cqw`, overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{r.team.name}</span>
                    {/* Tipp-Paddle */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'baseline',
                      padding: 'clamp(2px,0.4cqh,5px) clamp(7px,0.8cqw,13px)', borderRadius: 'var(--qq-pill-radius)',
                      background: isWin && lit ? 'rgba(var(--qq-accent-rgb),0.24)' : 'rgba(12,10,30,0.66)',
                      border: `1.5px solid ${isWin && lit ? 'var(--qq-accent)' : 'rgba(255,255,255,0.14)'}`,
                      transition: 'background 0.4s, border-color 0.4s',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 1.55cqw, 25px)',
                        fontWeight: 700, color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums',
                      }}>{fmt(r.num)}</span>
                    </div>
                  </div>

                  {/* Konfetti am Sieger */}
                  {isWin && lit && !reduce && (
                    <div aria-hidden style={{ position: 'absolute', top: '18%', left: '50%', zIndex: 9, pointerEvents: 'none' }}>
                      {CONFETTI.map((c, ci) => (
                        <span key={ci} style={{
                          position: 'absolute', left: 0, top: 0, width: 9, height: 12, borderRadius: 2,
                          ['--dx' as any]: `${c.dx}px`, ['--dy' as any]: `${c.dy}px`, ['--r' as any]: `${c.r * 18}deg`,
                          background: ci % 2 === 0 ? (winnerStatus?.exact ? MINT : r.team.color) : 'var(--qq-accent)',
                          animation: `qqStrConfetti 0.85s var(--qq-enter) ${ci * 0.02}s both`,
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Sieger-Callout (Verdikt-Banner unten mittig — immer lesbar, kollidiert nicht) */}
            {winner && winnerStatus && (
              <div style={{
                position: 'absolute', left: '50%', bottom: 'clamp(1%,1cqh,3%)', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: 'clamp(7px,0.8cqw,12px)', zIndex: 9, whiteSpace: 'nowrap',
                opacity: lit ? 1 : 0,
                animation: lit && !reduce ? 'qqStrCallout 0.5s var(--qq-enter) 0.1s both' : 'none',
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(16px, 1.9cqw, 32px)', fontWeight: 700,
                  color: 'var(--qq-card-text)', textShadow: `0 0 22px ${(winnerStatus.exact ? MINT : winner.team.color)}66`,
                }}>{winner.team.name}</span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(12px, 1.35cqw, 22px)', fontWeight: 700,
                  color: winnerStatus.color,
                  padding: 'clamp(3px,0.5cqh,6px) clamp(10px,1.1cqw,16px)', borderRadius: 'var(--qq-pill-radius)',
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
