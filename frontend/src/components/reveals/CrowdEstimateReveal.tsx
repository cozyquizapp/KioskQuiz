/**
 * CrowdEstimateReveal — „Schwarm-Schätzen" (Wisdom of Crowds) Reveal.
 *
 * Oben Frage, mittig ein Zahlenstrahl: „nah genug"-Band, die Wahrheit ploppt,
 * der Gesamt-Schwarm-Tipp (Median aller ~25 Handys) liegt oft verblüffend nah
 * dran, Fraktions-Punkte streuen. Unten die Fraktionen nach Median-Nähe.
 *
 * Aggregation via shared qqSwarm — dieselbe Funktion wertet im Backend.
 * 2026-07-04 (CozyArena Voting/Schwarm, Stufe 4).
 */
import { useState, useEffect } from 'react';
import type { QQStateUpdate, QQBunteTueteCrowdEstimate } from '../../../../shared/quarterQuizTypes';
import { qqSwarm } from '../../../../shared/qqSwarm';
import { qqMegaFactionName } from '../../../../shared/quarterQuizTypes';
import { qqFactionAvatarEmoji } from '../../qqShared';
import { QQTeamAvatar } from '../QQTeamAvatar';
import { QQEmojiIcon } from '../QQIcon';
import { playRevealHighlight, playClimaxFinish } from '../../utils/sounds';
import { QQ_COLORS } from '../../../../shared/qqColors';
import { isThemed } from '../../qqTheme';

export function CrowdEstimateReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  // 2026-07-04 (Audit): explizite Modus-Flags statt fragiler Avatar-Aliasing-
  // Heuristik (die kippte, wenn kurzzeitig Handys ausfielen).
  const isMega = !!(s as any).nestedTeams || !!(s as any).largeGroupMode;
  const def = q.bunteTuete as QQBunteTueteCrowdEstimate;
  const unit = (lang === 'en' && def.unitEn ? def.unitEn : def.unit) ?? '';

  const swarm = qqSwarm(
    s.answers.map(a => ({ teamId: a.teamId, text: a.text })),
    def.targetValue,
    (tid) => s.teams.find(t => t.id === tid)?.avatarId,
    def.unit,
  );
  const { target, range, globalMedian, factions } = swarm;

  const isYear = Number.isInteger(target) && Math.abs(target) >= 1500 && Math.abs(target) <= 2100 && !unit;
  const fmt = (n: number) => isYear ? String(Math.round(n)) : Math.round(n).toLocaleString('de-DE');

  // Achsen-Domäne aus Fraktions-Medianen + Wahrheit + Schwarm (robust, keine
  // Troll-Ausreißer weil Fraktions-Werte Mediane sind).
  const domainPts = [target, ...factions.map(f => f.median)];
  if (Number.isFinite(globalMedian)) domainPts.push(globalMedian);
  let lo = Math.min(...domainPts), hi = Math.max(...domainPts);
  if (!(hi > lo)) { const w = Math.max(1, Math.abs(target) * 0.15); lo = target - w; hi = target + w; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const xPct = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));

  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setShown(true);
      if (!s.sfxMuted) { try { playRevealHighlight(); } catch {} try { playClimaxFinish(); } catch {} }
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  const swarmDist = Math.abs(globalMedian - target);
  const swarmClose = Number.isFinite(swarmDist) && swarmDist <= range;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 1.8cqh, 22px)',
      padding: 'clamp(16px, 2cqh, 28px) clamp(20px, 3cqw, 48px) clamp(54px, 7cqh, 80px)',
      animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) both', minHeight: 0,
    }}>
      {/* Frage */}
      <div style={{
        background: isThemed() ? 'var(--qq-card-bg)' : 'var(--qq-surface)',
        border: isThemed() ? 'var(--qq-card-border)' : '2px solid var(--qq-hairline)',
        borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24,
        padding: 'clamp(16px, 2cqh, 26px) clamp(24px, 2.8cqw, 42px)',
        boxShadow: isThemed() ? 'var(--qq-card-shadow)' : '0 8px 32px rgba(0,0,0,0.4)', flexShrink: 0,
        animation: 'bQuestionIn 0.5s var(--qq-ease-bounce) both',
      }}>
        <div style={{ fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 900, color: 'var(--qq-accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          🧠 {lang === 'en' ? 'Hive Mind · Reveal' : 'Schwarmintelligenz · Auflösung'}
        </div>
        <div style={{ fontSize: qText.length > 120 ? 'clamp(24px, 2.5cqw, 38px)' : 'clamp(28px, 3cqw, 48px)', fontWeight: 900, lineHeight: 1.18, color: 'var(--qq-card-text)' }}>
          {qText}
        </div>
      </div>

      {/* Zahlenstrahl */}
      <div style={{
        position: 'relative', flexShrink: 0,
        margin: 'clamp(46px, 6.8cqh, 82px) clamp(24px, 4.5cqw, 72px) clamp(30px, 4.5cqh, 54px)',
        height: 'clamp(14px, 1.8cqh, 22px)',
      }}>
        {/* Track — dicker + kontrastreicher fuer Distanz (Wolf 'von weitem') */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(148,163,184,0.32)', border: '1px solid rgba(148,163,184,0.24)' }} />
        {/* „nah genug"-Band */}
        <div style={{
          position: 'absolute', top: '-4px', bottom: '-4px',
          left: `${xPct(target - range)}%`, width: `${Math.max(0, xPct(target + range) - xPct(target - range))}%`,
          background: 'linear-gradient(90deg, rgba(34,197,94,0.10), rgba(34,197,94,0.28), rgba(34,197,94,0.10))',
          border: '1px solid rgba(34,197,94,0.4)', borderRadius: 999,
          opacity: shown ? 1 : 0, transition: 'opacity 0.6s ease',
        }} />

        {/* Fraktions-Marker (kleine Farbpunkte an ihrem Median) */}
        {factions.map((f, i) => {
          const rep = s.teams.find(t => t.avatarId === f.avatarId);
          const col = rep?.color ?? '#94a3b8';
          return (
            <div key={f.avatarId} title={rep?.name} style={{
              position: 'absolute', left: `${xPct(f.median)}%`, top: '50%',
              width: 'clamp(20px, 2cqw, 30px)', height: 'clamp(20px, 2cqw, 30px)',
              transform: 'translate(-50%, -50%)', borderRadius: '50%',
              background: col, border: '3px solid rgba(255,255,255,0.9)', boxShadow: `0 0 10px ${col}`,
              opacity: shown ? 1 : 0, transition: `opacity 0.5s ease ${0.2 + i * 0.06}s`, zIndex: 2,
            }} />
          );
        })}

        {/* Schwarm-Tipp (Gesamt-Median) */}
        {Number.isFinite(globalMedian) && (
          <div style={{ position: 'absolute', left: `${xPct(globalMedian)}%`, top: 'clamp(14px, 2cqh, 26px)', transform: 'translateX(-50%)', textAlign: 'center', opacity: shown ? 1 : 0, transition: 'opacity 0.7s ease 0.3s', zIndex: 3 }}>
            <div style={{ width: 2, height: 'clamp(12px, 1.6cqh, 20px)', background: '#38bdf8', margin: '0 auto 3px' }} />
            <div style={{ fontSize: 'clamp(16px, 1.9cqw, 28px)', fontWeight: 900, color: '#38bdf8', whiteSpace: 'nowrap' }}>
              🌊 {lang === 'en' ? 'Swarm' : 'Schwarm'} {fmt(globalMedian)}
            </div>
          </div>
        )}

        {/* Wahrheit (ploppt) */}
        <div style={{ position: 'absolute', left: `${xPct(target)}%`, bottom: 'clamp(14px, 2cqh, 26px)', transform: 'translateX(-50%)', textAlign: 'center', zIndex: 4, opacity: shown ? 1 : 0, transition: 'opacity 0.4s ease', animation: shown ? 'revealWinnerIn 0.6s var(--qq-ease-bounce) both' : 'none' }}>
          <div style={{ fontSize: 'clamp(24px, 2.8cqw, 46px)', fontWeight: 900, color: '#EC4899', whiteSpace: 'nowrap', marginBottom: 3 }}>
            ✓ {fmt(target)}{unit ? ` ${unit}` : ''}
          </div>
          <div style={{ width: 4, height: 'clamp(18px, 2.4cqh, 32px)', background: '#EC4899', margin: '0 auto', boxShadow: '0 0 12px #EC4899' }} />
        </div>
      </div>

      {/* Legende — erklaert den Strahl (Wolf 'nicht gut beschriftet'). */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
        gap: 'clamp(16px, 2.8cqw, 44px)', flexShrink: 0,
        fontSize: 'clamp(14px, 1.5cqw, 22px)', fontWeight: 800, color: 'var(--qq-text-muted)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 'clamp(24px, 2.6cqw, 38px)', height: 'clamp(13px, 1.5cqh, 20px)', borderRadius: 6, background: 'rgba(34,197,94,0.30)', border: '1px solid rgba(34,197,94,0.5)' }} />
          {lang === 'en' ? 'close enough' : 'nah genug'}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: '#EC4899' }}>
          ✓ {lang === 'en' ? 'truth' : 'Wahrheit'}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: '#38bdf8' }}>
          🌊 {lang === 'en' ? 'swarm median (all guesses)' : 'Schwarm-Median (alle Tipps)'}
        </span>
      </div>

      {/* Fraktionen nach Median-Nähe */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1cqh, 12px)', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 900, color: 'var(--qq-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <QQEmojiIcon emoji="🎯"/> {lang === 'en' ? 'Closest factions' : 'Nächste Fraktionen'}
          {swarmClose && <span style={{ color: '#38bdf8' }}>· {lang === 'en' ? 'the crowd nailed it!' : 'die Masse lag goldrichtig!'}</span>}
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: factions.length > 4 ? '1fr 1fr' : '1fr', gap: 'clamp(6px, 1cqw, 12px)', minHeight: 0, alignContent: 'stretch', gridAutoRows: 'minmax(clamp(58px, 7cqh, 100px), 1fr)' }}>
          {factions.map((f, i) => {
            const rep = s.teams.find(t => t.avatarId === f.avatarId);
            const col = rep?.color ?? '#94a3b8';
            const name = isMega ? qqMegaFactionName(f.avatarId, lang) : (rep?.name ?? f.avatarId);
            return (
              <div key={f.avatarId} style={{
                display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1cqw, 14px)',
                padding: 'clamp(6px, 0.9cqh, 12px) clamp(10px, 1.2cqw, 18px)', borderRadius: 14,
                background: f.inRange ? `linear-gradient(135deg, ${col}22, ${col}08)` : 'rgba(148,163,184,0.06)',
                border: `2px solid ${f.inRange ? col + '66' : 'rgba(148,163,184,0.15)'}`,
                opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(8px)',
                transition: `opacity 0.5s ease ${0.3 + i * 0.08}s, transform 0.5s ease ${0.3 + i * 0.08}s`,
              }}>
                <div style={{ width: 'clamp(20px, 2cqw, 30px)', fontWeight: 900, fontSize: 'clamp(15px, 1.6cqw, 24px)', color: i === 0 ? '#EC4899' : 'var(--qq-text-muted)', textAlign: 'center', flexShrink: 0 }}>#{i + 1}</div>
                {/* Fraktion → WAPPEN, nicht das Tier (qqFactionAvatarEmoji, siehe dort). */}
                <QQTeamAvatar avatarId={f.avatarId} teamEmoji={qqFactionAvatarEmoji(f.avatarId, rep?.emoji, isMega)} size={'clamp(46px, 4.6cqw, 72px)'} style={{ flexShrink: 0, boxShadow: `0 0 8px ${col}33` }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 'clamp(15px, 1.6cqw, 24px)', fontWeight: 900, color: col, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                  <div style={{ fontSize: 'clamp(12px, 1.3cqw, 18px)', fontWeight: 800, color: 'var(--qq-text-muted)' }}>
                    {lang === 'en' ? 'median' : 'Median'} {fmt(f.median)}{unit ? ` ${unit}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 'clamp(13px, 1.4cqw, 20px)', fontWeight: 900, color: f.inRange ? QQ_COLORS.green300 : '#94a3b8', flexShrink: 0 }}>
                  {f.inRange ? (lang === 'en' ? '✓ close' : '✓ nah') : `Δ ${fmt(f.dist)}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
