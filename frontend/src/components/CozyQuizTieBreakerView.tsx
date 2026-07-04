// ── Cozy Quiz — Beamer: Sudden-Death-Stechen ─────────────────────────────────
// 2026-07-04: Zeigt die Stechfrage bei Gleichstand am Spielende. Beide Modi:
// im Arena-Modus sind die Kandidaten die Faktions-Repraesentanten (Wappen +
// Faktionsname), sonst normale Teams. Erste richtige Antwort gewinnt; nach der
// Aufloesung wird der Gewinner gross gefeiert, dann Mod-Space → Siegerehrung.
import React from 'react';
import { QQStateUpdate, qqMegaFactionName } from '../../../shared/quarterQuizTypes';
import { QQ_COLORS } from '../../../shared/qqColors';
import { QQTeamAvatar } from './QQTeamAvatar';

export function TieBreakerView({ state: s }: { state: QQStateUpdate }) {
  const tb = (s as any).tieBreaker as import('../../../shared/quarterQuizTypes').QQTieBreakerState | null;
  const de = s.language !== 'en';
  const arena = !!(s as any).largeGroupMode;
  if (!tb) return null;

  const nameFor = (id: string) => {
    const t = s.teams.find(x => x.id === id);
    if (!t) return id;
    return arena ? qqMegaFactionName(t.avatarId, de ? 'de' : 'en') : t.name;
  };
  const winnerTeam = tb.winnerId ? s.teams.find(t => t.id === tb.winnerId) : null;
  const revealed = tb.revealed && !!winnerTeam;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '2.6cqh', padding: '4cqh 6cqw', boxSizing: 'border-box',
      background: 'radial-gradient(circle at 50% 30%, rgba(236,72,153,0.12), transparent 60%)',
      fontFamily: "'Nunito', 'Geist', system-ui, sans-serif", textAlign: 'center',
    }}>
      {/* Eyebrow */}
      <div style={{
        fontSize: '2cqh', fontWeight: 900, letterSpacing: '0.3em',
        color: QQ_COLORS.brandPink, textTransform: 'uppercase',
      }}>
        {de ? 'Gleichstand' : 'Dead heat'}
      </div>
      <div style={{
        fontSize: '7cqh', fontWeight: 900, lineHeight: 1,
        color: '#fff', letterSpacing: '0.02em',
        textShadow: '0 4px 24px rgba(236,72,153,0.5)',
      }}>
        ⚔️ {de ? 'STECHEN' : 'SUDDEN DEATH'}
      </div>

      {/* Kandidaten */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '4cqw', flexWrap: 'wrap' }}>
        {tb.candidateIds.map(id => {
          const t = s.teams.find(x => x.id === id);
          if (!t) return null;
          const isWinner = revealed && (arena
            ? winnerTeam!.avatarId === t.avatarId
            : winnerTeam!.id === t.id);
          const dim = revealed && !isWinner;
          return (
            <div key={id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8cqh',
              opacity: dim ? 0.35 : 1, transition: 'opacity 0.5s ease', transform: isWinner ? 'scale(1.08)' : 'none',
            }}>
              <div style={{ filter: isWinner ? 'drop-shadow(0 0 18px rgba(34,197,94,0.7))' : 'none' }}>
                <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={'clamp(90px, 11cqw, 168px)'} bgColor={t.color} />
              </div>
              <div style={{ fontSize: '2.6cqh', fontWeight: 900, color: isWinner ? '#22C55E' : t.color }}>
                {nameFor(id)} {isWinner && '🏆'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Frage */}
      <div style={{
        fontSize: '4.2cqh', fontWeight: 900, color: '#fff',
        maxWidth: '80cqw', lineHeight: 1.15, textWrap: 'balance' as any,
      }}>
        {tb.prompt}
      </div>

      {/* Optionen */}
      <div style={{ display: 'flex', gap: '2cqw', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '82cqw' }}>
        {tb.options.map((opt, idx) => {
          const isCorrect = revealed && idx === tb.correctIndex;
          return (
            <div key={idx} style={{
              minWidth: '16cqw', padding: '1.8cqh 2.4cqw', borderRadius: '1.6cqh',
              border: `0.35cqh solid ${isCorrect ? '#22C55E' : 'rgba(255,255,255,0.18)'}`,
              background: isCorrect ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.06)',
              color: isCorrect ? '#22C55E' : '#fff',
              fontSize: '3.4cqh', fontWeight: 900,
              transition: 'all 0.4s ease',
            }}>
              {isCorrect && '✓ '}{opt}
            </div>
          );
        })}
      </div>

      {/* Status / Auflösung */}
      {revealed ? (
        <div style={{ fontSize: '3cqh', fontWeight: 900, color: '#22C55E' }}>
          {de ? `${nameFor(tb.winnerId!)} war zuerst richtig!` : `${nameFor(tb.winnerId!)} answered first!`}
        </div>
      ) : (
        <div style={{ fontSize: '2.4cqh', fontWeight: 800, color: QQ_COLORS.slate400 }}>
          {de ? '⚡ Erste richtige Antwort gewinnt — auf die Handys!' : '⚡ First correct answer wins — grab your phones!'}
        </div>
      )}
    </div>
  );
}
