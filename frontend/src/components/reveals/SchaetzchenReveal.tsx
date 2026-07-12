/**
 * SchaetzchenReveal — Auflösung für Schätzchen-Kategorie (North Star Design).
 *
 * 2026-07-12 (Design-System North Star, Richtung C · Studio × CozyArena-DNA):
 * Neuaufbau der Praesentation gegen die "vibe-coded"-Befunde:
 *  - EIN Hero (die Antwort), kein doppeltes Riesen-Zahl-Duell.
 *  - Zahlenstrahl als Signatur-Viz: macht die Naehe SICHTBAR statt "Δ 3".
 *  - EINE Status-Sprache: "genau" / "N daneben".
 *  - Getierte Rangliste (Leader/Podium/Tail) ueber Elevation+Opacity, nicht Glow-Salat.
 *  - Ruhige Typo-Hierarchie (grosse Groessensprünge), ein Akzent, viel Luft.
 * Logik (ranked/rankedFinal/fmt/Cascade/Sound/i18n) unveraendert uebernommen.
 * Die hier eingefuehrten Bausteine (Zahlenstrahl, Rangzeile, Status) werden im
 * naechsten Schritt in geteilte Primitives extrahiert. [[project-design-system-audit-2026-07-12]]
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate } from '../../../../shared/quarterQuizTypes';
import { qqMegaFactionName, qqMegaFactionSlug } from '../../../../shared/quarterQuizTypes';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { QQEmojiIcon } from '../QQIcon';
import { playAvatarCascadeNote, playClimaxFinish } from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';
import { useActiveThemeId } from '../../qqTheme';

// Semantik-Farben (eine Handschrift): Mint = "genau/exakt", Pink = Akzent.
const MINT = QQ_COLORS.green300;

export function SchaetzchenReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const target = q.targetValue as number;

  // Jahreszahlen ohne Tausenderpunkt formatieren (sonst sieht 1500 wie 1.5 aus).
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

  // Parse + Distanz. Sort: bester (geringste |Δ|) zuerst, bei Tie schnellste Abgabe.
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

  // CozyArena: 1 Marker pro Fraktion = der BESTE (naechste) Tipp der Fraktion.
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

  const top5 = rankedFinal.slice(0, 5);
  const n = top5.length;
  const winner = rankedFinal[0] ?? null;

  // Cascade #5 -> #1 (Sound je Row). Init-Guard gegen Race (Answers spaeter als Mount).
  const [revealedMinIdx, setRevealedMinIdx] = useState<number>(n);
  const cascadeStartedRef = useRef(false);
  const STEP_MS = 1500;
  const INITIAL_DELAY_MS = 500;

  useEffect(() => {
    if (cascadeStartedRef.current || n === 0) return;
    cascadeStartedRef.current = true;
    setRevealedMinIdx(n);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cascadeTotal = n + 1;
    for (let i = 0; i < n; i++) {
      const targetIdx = n - 1 - i;
      const isTopRow = i === n - 1;
      const t = setTimeout(() => {
        setRevealedMinIdx(targetIdx);
        if (!s.sfxMuted) {
          try { playAvatarCascadeNote(i, cascadeTotal); } catch {}
          if (isTopRow) { try { playClimaxFinish(); } catch {} }
        }
      }, INITIAL_DELAY_MS + i * STEP_MS);
      timers.push(t);
    }
    return () => { timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  useActiveThemeId(); // Re-render bei Skin-Wechsel

  // ── Zahlenstrahl-Skala: Spannweite aus allen Tipps + Ziel, mit Rand. ──
  const scale = useMemo(() => {
    const vals = rankedFinal.map(r => r.num).concat([target]);
    const lo0 = Math.min(...vals), hi0 = Math.max(...vals);
    const span = Math.max(hi0 - lo0, Math.abs(target) * 0.04 || 1);
    const pad = span * 0.14;
    const lo = lo0 - pad, hi = hi0 + pad;
    return { lo, hi, pos: (v: number) => (hi > lo ? ((v - lo) / (hi - lo)) * 100 : 50) };
  }, [rankedFinal, target]);

  const offWord = lang === 'en' ? 'off' : 'daneben';
  const statusOf = (delta: number, isWinner: boolean): { text: string; color: string } => {
    if (delta === 0) return { text: lang === 'en' ? 'exact' : 'genau', color: MINT };
    if (isWinner) return { text: lang === 'en' ? 'closest' : 'am nächsten', color: 'var(--qq-accent)' };
    return { text: `${fmt(delta)} ${offWord}`, color: 'var(--qq-text-muted)' };
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(14px, 1.8cqh, 22px)',
      padding: 'clamp(16px, 2cqh, 26px) clamp(22px, 3.2cqw, 52px)',
      animation: 'contentReveal 0.5s var(--qq-enter) both',
      minHeight: 0,
    }}>
      {/* ── Header: Eyebrow + Frage ── */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          fontSize: 'clamp(12px, 1.1cqw, 17px)', fontWeight: 900, color: 'var(--qq-accent)',
          letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 'clamp(6px, 0.8cqh, 12px)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <QQEmojiIcon emoji="🎯" /> {lang === 'en' ? 'Guess It · Reveal' : 'Schätzchen · Auflösung'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 120 ? 'clamp(24px, 2.6cqw, 42px)' : 'clamp(30px, 3.2cqw, 54px)',
          fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.01em', color: 'var(--qq-card-text)',
          animation: 'langFadeIn 0.4s ease both', maxWidth: '30ch',
        }}>
          {qText}
        </div>
      </div>

      {/* ── Body: links Antwort + Zahlenstrahl, rechts Rangliste ── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
        gap: 'clamp(18px, 2.6cqw, 40px)', minHeight: 0,
      }}>
        {/* Linke Spalte: EIN ruhiges Panel — Hero-Antwort + Story-Zahlenstrahl */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          borderRadius: 'clamp(18px, 1.6cqw, 26px)',
          background: 'var(--qq-surface)',
          border: '1px solid var(--qq-hairline)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
          padding: 'clamp(20px, 2.4cqh, 34px) clamp(22px, 2.4cqw, 40px)',
          minHeight: 0, minWidth: 0, position: 'relative', overflow: 'hidden',
        }}>
          {/* Hero-Antwort */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'clamp(10px, 1.2cqw, 18px)', flexShrink: 0 }}>
            <span style={{
              fontSize: 'clamp(11px, 1cqw, 16px)', fontWeight: 900, color: 'var(--qq-text-muted)',
              letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>{lang === 'en' ? 'Answer' : 'Antwort'}</span>
            <span style={{
              fontSize: 'clamp(58px, 8.4cqw, 150px)', fontWeight: 900, lineHeight: 0.9,
              letterSpacing: '-0.04em', color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums',
              animation: 'revealAnswerBam 0.6s var(--qq-enter) 0.15s both',
            }}>{fmt(target)}</span>
            {unitStr && (
              <span style={{
                fontSize: 'clamp(14px, 1.5cqw, 24px)', fontWeight: 800, color: 'var(--qq-text-muted)',
              }}>{unitStr}</span>
            )}
          </div>

          {/* Caption */}
          <div style={{
            fontSize: 'clamp(13px, 1.3cqw, 20px)', fontWeight: 700, color: 'var(--qq-text-muted)',
            marginTop: 'clamp(6px, 0.8cqh, 12px)', flexShrink: 0,
          }}>
            {winner
              ? (winner.delta === 0
                  ? <><b style={{ color: MINT }}>{winner.team.name}</b> {lang === 'en' ? 'nailed it exactly.' : 'traf exakt.'}</>
                  : <><b style={{ color: 'var(--qq-accent)' }}>{winner.team.name}</b> {lang === 'en' ? `was closest (${fmt(winner.delta)} off).` : `war am nächsten (${fmt(winner.delta)} daneben).`}</>)
              : (lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.')}
          </div>

          {/* Zahlenstrahl — Signatur-Viz */}
          {rankedFinal.length > 0 && (
            <div style={{ flex: 1, position: 'relative', margin: 'clamp(24px, 3cqh, 44px) clamp(8px, 1cqw, 20px) clamp(20px, 2.4cqh, 34px)', minHeight: 0 }}>
              {/* Track */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: '58%', height: 4, borderRadius: 3,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.16), rgba(255,255,255,0.05))',
              }} />
              {/* Ziel-Tick */}
              <div style={{
                position: 'absolute', top: '38%', height: '30%', width: 2, borderRadius: 2,
                left: `${scale.pos(target)}%`, transform: 'translateX(-1px)',
                background: MINT, boxShadow: `0 0 14px ${MINT}`,
              }}>
                <span style={{
                  position: 'absolute', top: 'clamp(-22px, -2cqh, -18px)', left: '50%', transform: 'translateX(-50%)',
                  fontSize: 'clamp(10px, 0.95cqw, 14px)', fontWeight: 900, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: MINT, whiteSpace: 'nowrap',
                }}>{lang === 'en' ? 'Target' : 'Ziel'}</span>
              </div>
              {/* Marker je Fraktion */}
              {rankedFinal.map((r, idx) => {
                const isW = idx === 0;
                const mColor = isW && r.delta === 0 ? MINT : r.team.color;
                const below = idx % 2 === 1; // alternierend, gegen Label-Kollision
                return (
                  <div key={r.teamId} style={{
                    position: 'absolute', top: '58%', left: `${scale.pos(r.num)}%`,
                    transform: 'translate(-50%, -50%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    animation: `top5AvatarPop 0.5s var(--qq-enter) ${0.25 + (rankedFinal.length - idx) * 0.06}s both`,
                    zIndex: isW ? 3 : 2,
                  }}>
                    <div style={{
                      width: isW ? 'clamp(16px, 1.5cqw, 22px)' : 'clamp(12px, 1.1cqw, 16px)',
                      height: isW ? 'clamp(16px, 1.5cqw, 22px)' : 'clamp(12px, 1.1cqw, 16px)',
                      borderRadius: '50%', background: mColor,
                      border: '2px solid var(--qq-bg, #0c1326)',
                      boxShadow: `0 0 ${isW ? 16 : 10}px ${mColor}`,
                    }} />
                    <span style={{
                      position: 'absolute', top: below ? 'calc(100% + 4px)' : 'auto', bottom: below ? 'auto' : 'calc(100% + 4px)',
                      fontSize: 'clamp(11px, 1.05cqw, 15px)', fontWeight: 900, color: isW ? mColor : 'var(--qq-card-text)',
                      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                    }}>{fmt(r.num)}</span>
                  </div>
                );
              })}
              {/* Skala-Enden */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: 'calc(58% + 16px)',
                display: 'flex', justifyContent: 'space-between',
                fontSize: 'clamp(10px, 0.9cqw, 13px)', fontWeight: 800, color: 'var(--qq-text-muted)',
                fontVariantNumeric: 'tabular-nums', opacity: 0.7,
              }}>
                <span>{fmt(scale.lo)}</span><span>{fmt(scale.hi)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Rechte Spalte: Rangliste — getiert, eine Status-Sprache, Cascade-Reveal */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.1cqh, 14px)',
          minHeight: 0, minWidth: 0,
        }}>
          {top5.map((r, idx) => {
            const rank = idx + 1;
            const isVisible = idx >= revealedMinIdx;
            const isTop = rank === 1;
            const isExact = r.delta === 0;
            const st = statusOf(r.delta, isTop);
            const accent = isExact ? MINT : 'var(--qq-accent)';
            // Tier: Leader = erhoehte Card, Podium 2-3 = Surface, Tail 4-5 = leise.
            const tier = isTop ? 'lead' : rank <= 3 ? 'podium' : 'tail';
            return (
              <div key={r.teamId} style={{
                display: 'grid', gridTemplateColumns: 'clamp(22px,2.2cqw,34px) auto 1fr auto',
                alignItems: 'center', gap: 'clamp(10px, 1.2cqw, 18px)',
                padding: isTop ? 'clamp(14px,1.7cqh,22px) clamp(16px,1.8cqw,26px)' : 'clamp(10px,1.3cqh,17px) clamp(14px,1.6cqw,22px)',
                borderRadius: 'clamp(14px, 1.3cqw, 18px)',
                background: isTop
                  ? `linear-gradient(180deg, ${isExact ? 'rgba(59,224,165,0.16)' : 'rgba(var(--qq-accent-rgb),0.14)'}, var(--qq-surface))`
                  : tier === 'podium' ? 'var(--qq-surface)' : 'transparent',
                border: isTop
                  ? `1px solid ${isExact ? 'rgba(59,224,165,0.55)' : 'rgba(var(--qq-accent-rgb),0.5)'}`
                  : tier === 'podium' ? '1px solid var(--qq-hairline)' : '1px solid transparent',
                boxShadow: isTop ? `0 10px 26px rgba(0,0,0,0.4), 0 0 26px ${isExact ? 'rgba(59,224,165,0.2)' : 'rgba(var(--qq-accent-rgb),0.18)'}` : 'none',
                opacity: isVisible ? (tier === 'tail' ? 0.62 : 1) : 0,
                transform: isVisible ? 'none' : 'translateY(8px)',
                transition: 'opacity 0.5s var(--qq-enter), transform 0.5s var(--qq-enter)',
                minHeight: 0, flex: '1 1 0',
              }}>
                {/* Rang */}
                <span style={{
                  fontSize: isTop ? 'clamp(18px,2cqw,30px)' : 'clamp(15px,1.6cqw,24px)', fontWeight: 900,
                  color: isTop ? accent : 'var(--qq-text-muted)', textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                }}>{rank}</span>
                {/* Wappen */}
                <QQTeamAvatar avatarId={r.team.avatarId} teamEmoji={r.team.emoji}
                  size={isTop ? 'clamp(42px,4.2cqw,60px)' : 'clamp(34px,3.4cqw,48px)'}
                  style={{ flexShrink: 0 }} />
                {/* Name + Tipp */}
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{
                    fontSize: isTop ? 'clamp(17px,1.8cqw,27px)' : 'clamp(15px,1.6cqw,23px)', fontWeight: isTop ? 900 : 700,
                    color: isTop ? 'var(--qq-card-text)' : 'var(--qq-text-muted)', lineHeight: 1.1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{r.team.name}</span>
                  <span style={{
                    fontSize: 'clamp(12px,1.2cqw,17px)', fontWeight: 800, color: 'var(--qq-text-muted)',
                    fontVariantNumeric: 'tabular-nums', opacity: 0.8,
                  }}>{lang === 'en' ? 'guess' : 'Tipp'} {fmt(r.num)}</span>
                </div>
                {/* Status (eine Sprache) */}
                <span style={{
                  fontSize: isTop ? 'clamp(14px,1.5cqw,22px)' : 'clamp(12px,1.3cqw,18px)', fontWeight: 900,
                  color: st.color, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                  padding: isExact ? '4px 12px' : '0', borderRadius: 'var(--qq-pill-radius)',
                  background: isExact ? 'rgba(59,224,165,0.14)' : 'transparent',
                }}>{isExact ? '✨ ' : ''}{st.text}</span>
              </div>
            );
          })}
          {top5.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--qq-text-muted)', fontSize: 'clamp(18px, 2cqw, 28px)', fontWeight: 700,
            }}>
              {lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
