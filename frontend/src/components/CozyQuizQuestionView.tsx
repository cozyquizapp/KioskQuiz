/**
 * CozyQuizQuestionView — Frage-Card + alle Frage-Reveals (Bug-Hot-Spot #1).
 *
 * Zentrale View für QUESTION_ACTIVE + QUESTION_REVEAL Phasen. Routes pro
 * Kategorie zu spezialisierten Reveal-Sub-Components:
 * - SCHAETZCHEN → SchaetzchenReveal
 * - MUCHO → MuchoOptionsReveal (re-imported aus QQBeamerPage)
 * - ZEHN_VON_ZEHN → eigene inline-Logik
 * - CHEESE → CozyGuessrReveal (auch fuer Map-Picture-Quiz)
 * - BUNTE_TUETE (verschiedene) → Bluff*, Top5Reveal, OrderReveal,
 *   OnlyConnectBeamerView, HotPotatoBeamerView (re-imported)
 *
 * Plus: TeamAnswerReveal (generischer Avatare-Cascade-Reveal),
 * BluffTimer, BluffWriteScreen, BluffReviewScreen, BluffVoteWaitingScreen,
 * BluffVoteScreen, BluffRevealHero, Top5Reveal, OrderReveal,
 * SchaetzchenReveal, CozyGuessrReveal, OnlyConnectBeamerView.
 *
 * Map-Wrapper (QQFitBoundsOnTrigger, QQInitialTargetZoom, QQMapResizer)
 * fuer Leaflet-React-Map in CozyGuessr-Quizzes.
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-13 (Refactor Phase 6, Bug-Hot-Spot).
 * ~6.273 Zeilen Code — der GROESSTE Single-Extract bisher.
 * 7 externe Importer.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate, QQCategory } from '../../../shared/quarterQuizTypes';
import { QQ_CATEGORY_LABELS, qqGetAvatar, teamDisplayName } from '../../../shared/quarterQuizTypes';
import { getAvatarDisplay } from '../avatarSets';
import {
  useLangFlip, bt, formatRevealedAnswer, imgAnim, imgFilter,
  CAT_ACCENT, CAT_BADGE_BG, CAT_GLOW, CAT_CUTOUTS, COZY_CARD_BG,
} from '../cozyQuizShared';
import { Fireflies } from './CozyQuizAmbient';
import { ConfettiOverlay } from './CozyQuizConfettiOverlay';
import { BeamerTimer } from './CozyQuizBeamerTimer';
import { QQTeamAvatar } from './QQTeamAvatar';
import { QQEmojiIcon } from './QQIcon';
import { TeamNameLabel } from './TeamNameLabel';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  HotPotatoBeamerView, MuchoOptionsReveal,
} from '../pages/QQBeamerPage';
import {
  playAvatarCascadeNote, playClimaxFinish, playRevealHighlight,
  playTick, playWinnerCardReveal,
} from '../utils/sounds';

function TeamAnswerReveal({ s, q, lang, cardBg, accent }: {
  s: QQStateUpdate; q: NonNullable<QQStateUpdate['currentQuestion']>;
  lang: 'de' | 'en'; cardBg: string; accent: string;
}) {
  if (!s.answers.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Schätzchen — target banner + estimates with delta bars */}
      {q.category === 'SCHAETZCHEN' && (() => {
        const scored = [...s.answers].map(a => {
          const num = Number(a.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
          const team = s.teams.find(t => t.id === a.teamId);
          const distance = Number.isNaN(num) || q.targetValue == null ? Infinity : Math.abs(num - q.targetValue);
          return { ...a, num, distance, team };
        }).sort((a, b) => a.distance - b.distance);
        const maxDistance = Math.max(1, ...scored.filter(s => Number.isFinite(s.distance)).map(s => s.distance));
        // 2026-05-10 (Wolf-Bug 'EN-Spiel zeigt DE-unit'): EN-Fallback ergänzt.
        const unitStr = (lang === 'en' && (q as any).unitEn ? (q as any).unitEn : (q as any).unit) ?? '';
        // Jahreszahlen ohne Tausenderpunkt — sonst sieht 1500 wie 1,5 aus.
        // Auto-Detection: int zwischen 1000-2100 sieht aus wie eine Jahreszahl.
        // (User-Bug 2026-04-28: '1.914' erschien weil unit nicht 'Jahr' war.)
        const looksLikeYear = (n: number) => Number.isInteger(n) && n >= 1000 && n <= 2100;
        // 2026-05-07 (Wolf): explizites isYearAnswer-Flag aus Builder hat
        // Vorrang vor unit-String-Heuristik. Auto-Detection bleibt als
        // Fallback fuer aeltere Drafts ohne Flag.
        const isYearUnit = !!q.isYearAnswer || /jahr|year/i.test(unitStr) || (q.targetValue != null && looksLikeYear(q.targetValue));
        const targetStr = q.targetValue != null
          ? (isYearUnit ? String(Math.round(q.targetValue)) : q.targetValue.toLocaleString('de-DE'))
          : '—';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.1s both' }}>
            {/* Target banner */}
            <div style={{
              padding: '14px 20px', borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(236,72,153,0.22), rgba(236,72,153,0.10))',
              border: '2px solid rgba(236,72,153,0.55)',
              boxShadow: '0 0 0 3px rgba(236,72,153,0.12), 0 8px 24px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
              animation: 'revealAnswerBam 0.55s var(--qq-ease-out-cubic) both',
            }}>
              <span style={{ fontSize: 'clamp(22px, 2.6cqw, 34px)' }}><QQEmojiIcon emoji="🎯"/></span>
              <span style={{
                fontSize: 'clamp(14px, 1.4cqw, 18px)', fontWeight: 900,
                color: '#FBCFE8', letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>{lang === 'en' ? 'Target' : 'Lösung'}</span>
              <span style={{
                fontSize: 'clamp(30px, 4cqw, 56px)', fontWeight: 900,
                color: '#EC4899',
                textShadow: '0 2px 12px rgba(236,72,153,0.45)',
              }}>
                {targetStr}{unitStr ? ` ${unitStr}` : ''}
              </span>
            </div>

            {/* Estimates list with delta bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {scored.map((a, i) => {
                const isWinner = i === 0;
                const pct = Number.isFinite(a.distance) ? (a.distance / maxDistance) * 100 : 100;
                const distStr = Number.isFinite(a.distance)
                  ? `Δ ${isYearUnit ? String(Math.round(a.distance)) : a.distance.toLocaleString('de-DE')}${unitStr ? ` ${unitStr}` : ''}`
                  : '—';
                return (
                  <div key={a.teamId} style={{
                    position: 'relative', overflow: 'hidden',
                    padding: '10px 14px', borderRadius: 16,
                    background: isWinner
                      ? 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(22,163,74,0.06))'
                      : 'rgba(255,255,255,0.035)',
                    border: isWinner ? '2px solid rgba(34,197,94,0.55)' : '1.5px solid rgba(255,255,255,0.08)',
                    boxShadow: isWinner ? '0 0 0 3px rgba(34,197,94,0.12)' : 'none',
                    animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.2 + i * 0.08}s both`,
                  }}>
                    {/* Distance bar (background) */}
                    {Number.isFinite(a.distance) && (
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${100 - pct}%`,
                        background: isWinner
                          ? 'linear-gradient(90deg, rgba(34,197,94,0.22), rgba(34,197,94,0.04))'
                          : `linear-gradient(90deg, ${a.team?.color ?? '#64748b'}30, transparent)`,
                        transition: 'width 0.8s var(--qq-ease-out-cubic)',
                      }} />
                    )}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        width: 'clamp(26px, 2.8cqw, 34px)', height: 'clamp(26px, 2.8cqw, 34px)',
                        borderRadius: 8,
                        background: isWinner ? 'linear-gradient(135deg,#EC4899,#EC4899)' : 'rgba(100,116,139,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 'clamp(12px, 1.3cqw, 16px)', fontWeight: 900, color: '#fff',
                        flexShrink: 0,
                      }}>
                        {isWinner ? <QQEmojiIcon emoji="🥇"/> : `#${i + 1}`}
                      </span>
                      {a.team && (
                        <QQTeamAvatar avatarId={a.team.avatarId} teamEmoji={a.team.emoji} size={'clamp(28px, 3cqw, 38px)'} style={{ flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontWeight: 900, fontSize: 'clamp(14px, 1.5cqw, 20px)',
                        color: a.team?.color ?? '#e2e8f0', flex: '0 1 auto',
                      }}>{a.team?.name ?? a.teamId}</span>
                      <span style={{
                        flex: 1, textAlign: 'right',
                        fontSize: 'clamp(18px, 2.2cqw, 30px)', fontWeight: 900,
                        color: isWinner ? '#4ade80' : '#e2e8f0',
                      }}>
                        {a.text}{unitStr ? ` ${unitStr}` : ''}
                      </span>
                      <span style={{
                        minWidth: 'clamp(64px, 8cqw, 110px)', textAlign: 'right',
                        fontFamily: "'Caveat', cursive",
                        fontSize: 'clamp(14px, 1.5cqw, 20px)',
                        color: isWinner ? '#86efac' : '#64748b', fontWeight: 700,
                      }}>
                        {distStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* MUCHO: who chose which option */}
      {q.category === 'MUCHO' && q.options && (() => {
        const correctVoters = q.correctOptionIndex != null
          ? s.answers
              .filter(a => a.text === String(q.correctOptionIndex))
              .sort((a, b) => a.submittedAt - b.submittedAt)
          : [];
        const showSpeedRank = correctVoters.length > 1;
        const speedRank: Record<string, number> = {};
        correctVoters.forEach((a, i) => { speedRank[a.teamId] = i + 1; });
        const t0 = s.timerEndsAt ? s.timerEndsAt - (s.timerDurationSec * 1000) : (correctVoters[0]?.submittedAt ?? 0);
        const MUCHO_COLORS = ['#3B82F6', '#EF4444', '#EC4899', '#22C55E'];

        return (
          <div style={{ animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.1s both', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {q.options!.map((optText, optIdx) => {
              const voters = s.answers
                .filter(a => a.text === String(optIdx))
                .sort((a, b) => a.submittedAt - b.submittedAt)
                .map(a => ({ team: s.teams.find(t => t.id === a.teamId), answer: a }))
                .filter((v): v is { team: NonNullable<typeof v.team>; answer: typeof v.answer } => !!v.team);
              const isCorrect = optIdx === q.correctOptionIndex;
              const optColor = MUCHO_COLORS[optIdx] ?? '#475569';
              return (
                <div key={optIdx} style={{
                  display: 'flex', alignItems: 'stretch', gap: 0,
                  borderRadius: 16, overflow: 'hidden',
                  background: isCorrect ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.035)',
                  border: isCorrect ? '2px solid rgba(34,197,94,0.55)' : '1.5px solid rgba(255,255,255,0.08)',
                  boxShadow: isCorrect ? '0 0 0 3px rgba(34,197,94,0.12)' : 'none',
                  animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.1 + optIdx * 0.07}s both`,
                  minHeight: 54,
                }}>
                  <div style={{
                    width: 'clamp(44px, 5cqw, 64px)', background: optColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'clamp(18px, 2.2cqw, 28px)', fontWeight: 900, color: '#fff',
                    flexShrink: 0,
                  }}>
                    {['A','B','C','D'][optIdx] ?? optIdx + 1}
                  </div>
                  <div style={{
                    flex: 1, padding: '8px 14px',
                    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontSize: 'clamp(14px, 1.6cqw, 20px)', fontWeight: 900,
                      color: isCorrect ? '#86efac' : '#cbd5e1',
                      minWidth: 0, flex: '0 1 auto',
                    }}>
                      {optText}
                    </span>
                    {voters.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
                        {voters.map(({ team: tm }, vi) => (
                          <div key={tm.id} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px 4px 4px', borderRadius: 999,
                            background: 'rgba(0,0,0,0.28)',
                            border: `1.5px solid ${tm.color}`,
                            animation: `contentReveal 0.3s var(--qq-ease-pop-fast) ${vi * 0.08}s both`,
                          }}>
                            <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(26px, 3cqw, 36px)'} />
                            <span style={{ fontSize: 'clamp(12px, 1.3cqw, 16px)', fontWeight: 900, color: tm.color }}>{tm.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Speed ranking row for correct voters (ties) */}
            {showSpeedRank && (
              <div style={{
                marginTop: 6, padding: '10px 14px', borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(234,179,8,0.06))',
                border: '1.5px solid rgba(236,72,153,0.35)',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.1 + q.options!.length * 0.07 + 0.1}s both`,
              }}>
                <span style={{
                  fontSize: 'clamp(12px, 1.2cqw, 15px)', fontWeight: 900,
                  color: '#EC4899', letterSpacing: '0.04em', textTransform: 'uppercase',
                }}><QQEmojiIcon emoji="⚡"/> Schnellster zuerst</span>
                {correctVoters.map((a, i) => {
                  const tm = s.teams.find(t => t.id === a.teamId);
                  if (!tm) return null;
                  const timeSec = t0 ? ((a.submittedAt - t0) / 1000).toFixed(1) : null;
                  const rank = i + 1;
                  return (
                    <div key={tm.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', borderRadius: 999,
                      background: rank === 1 ? 'rgba(236,72,153,0.22)' : 'rgba(0,0,0,0.28)',
                      border: rank === 1 ? '1.5px solid rgba(236,72,153,0.6)' : `1.5px solid ${tm.color}`,
                    }}>
                      <span style={{
                        fontSize: 'clamp(12px, 1.2cqw, 15px)', fontWeight: 900,
                        color: rank === 1 ? '#EC4899' : '#cbd5e1',
                      }}>#{rank}</span>
                      <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(16px, 1.9cqw, 22px)'} />
                      <span style={{ fontSize: 'clamp(12px, 1.3cqw, 16px)', fontWeight: 900, color: tm.color }}>{tm.name}</span>
                      {timeSec && (
                        <span style={{ fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 700, color: '#94a3b8' }}>{timeSec}s</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ZEHN_VON_ZEHN (All-In): stacked bar per option — who put how many points */}
      {q.category === 'ZEHN_VON_ZEHN' && q.options && (() => {
        const ALLIN_COLORS = ['#3B82F6','#22C55E','#EF4444'];
        // Parse each answer to per-option point arrays
        const parsed = s.answers.map(a => {
          const pts = String(a.text ?? '').split(',').map(x => parseInt(x.trim(), 10));
          return { teamId: a.teamId, pts, submittedAt: a.submittedAt };
        }).filter(p => p.pts.length === q.options!.length && !p.pts.some(Number.isNaN));
        // Total points per option across all teams
        const totalsPerOption = q.options!.map((_, i) => parsed.reduce((sum, p) => sum + (p.pts[i] ?? 0), 0));
        const globalMax = Math.max(1, ...totalsPerOption);

        // Gewinner-Bestimmung: höchster Einsatz auf der korrekten Option, bei Tie → schnellste Einreichung gewinnt.
        const correctIdx = q.correctOptionIndex;
        let winner: { team: (typeof s.teams)[number]; pts: number; submittedAt: number; hasTie: boolean; correctOptText: string } | null = null;
        if (correctIdx != null) {
          const onCorrect = parsed
            .map(p => ({ team: s.teams.find(t => t.id === p.teamId), pts: p.pts[correctIdx] ?? 0, submittedAt: p.submittedAt }))
            .filter((x): x is { team: (typeof s.teams)[number]; pts: number; submittedAt: number } => !!x.team && x.pts > 0);
          if (onCorrect.length > 0) {
            const maxPts = Math.max(...onCorrect.map(x => x.pts));
            const topPts = onCorrect.filter(x => x.pts === maxPts);
            topPts.sort((a, b) => a.submittedAt - b.submittedAt);
            winner = {
              team: topPts[0].team,
              pts: topPts[0].pts,
              submittedAt: topPts[0].submittedAt,
              hasTie: topPts.length > 1,
              correctOptText: q.options![correctIdx] ?? '',
            };
          }
        }

        return (
          <div style={{ animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.1s both', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {winner && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: 'clamp(10px, 1.2cqh, 16px) clamp(14px, 1.6cqw, 22px)',
                borderRadius: 16,
                background: `linear-gradient(135deg, ${winner.team.color}22, rgba(34,197,94,0.18))`,
                border: `2px solid ${winner.team.color}55`,
                boxShadow: `0 0 0 3px ${winner.team.color}22`,
                animation: 'revealWinnerIn 0.6s var(--qq-ease-bounce) both',
              }}>
                <QQTeamAvatar avatarId={winner.team.avatarId} teamEmoji={winner.team.emoji} size={'clamp(44px, 4.5cqw, 60px)'} style={{ flexShrink: 0, boxShadow: `0 0 20px ${winner.team.color}55` }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{
                    fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 900, color: '#94a3b8',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>
                    <QQEmojiIcon emoji="🏆"/> {lang === 'en' ? 'Round winner' : 'Rundensieger'}
                  </div>
                  <div style={{
                    fontSize: 'clamp(16px, 1.9cqw, 26px)', fontWeight: 900,
                    color: '#F1F5F9', lineHeight: 1.2,
                  }}>
                    <span style={{ color: winner.team.color }}>{winner.team.name}</span>{' '}
                    {winner.hasTie
                      ? (lang === 'en'
                          ? <>has the most points on <b>{winner.correctOptText}</b> <span style={{ color: '#4ade80' }}>(+{winner.pts})</span> and was fastest.</>
                          : <>hat die meisten Punkte auf <b>{winner.correctOptText}</b> <span style={{ color: '#4ade80' }}>(+{winner.pts})</span> und war am schnellsten.</>)
                      : (lang === 'en'
                          ? <>has the most points on <b>{winner.correctOptText}</b> <span style={{ color: '#4ade80' }}>(+{winner.pts})</span>.</>
                          : <>hat die meisten Punkte auf <b>{winner.correctOptText}</b> <span style={{ color: '#4ade80' }}>(+{winner.pts})</span>.</>)}
                  </div>
                </div>
              </div>
            )}
            {q.options!.map((optText, optIdx) => {
              const isCorrectLocked = optIdx === q.correctOptionIndex;
              const isHunterHere = false;
              const showGreen = isCorrectLocked || isHunterHere;
              const color = showGreen ? '#22C55E' : (ALLIN_COLORS[optIdx] ?? '#64748b');
              const highestTeamIds = new Set<string>();
              const highestHidden = false;
              // Team contributions on this option (only teams with >0 pts), sorted desc
              const contribs = parsed
                .map(p => ({ team: s.teams.find(t => t.id === p.teamId), pts: p.pts[optIdx] ?? 0 }))
                .filter((c): c is { team: NonNullable<typeof c.team>; pts: number } => !!c.team && c.pts > 0)
                .sort((a, b) => b.pts - a.pts);
              const totalPts = totalsPerOption[optIdx];
              // Visible contribs (vor Cascade: höchste Bets sind noch versteckt)
              const visibleContribs = highestHidden
                ? contribs.filter(c => !highestTeamIds.has(c.team.id))
                : contribs;
              const visibleTotal = visibleContribs.reduce((s, c) => s + c.pts, 0);
              const displayTotal = highestHidden ? visibleTotal : totalPts;
              const barPct = (displayTotal / globalMax) * 100;
              return (
                <div key={optIdx} style={{
                  borderRadius: 16, overflow: 'hidden',
                  background: isCorrectLocked ? 'rgba(34,197,94,0.22)'
                    : isHunterHere ? 'rgba(34,197,94,0.14)'
                    : 'rgba(255,255,255,0.035)',
                  border: showGreen ? '2px solid #22C55E' : '1.5px solid rgba(255,255,255,0.08)',
                  boxShadow: isCorrectLocked ? '0 0 44px rgba(34,197,94,0.48), 0 0 90px rgba(34,197,94,0.18)'
                    : isHunterHere ? '0 0 28px rgba(34,197,94,0.45)'
                    : 'none',
                  transform: isHunterHere ? 'scale(1.015)' : 'scale(1)',
                  transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease',
                  animation: isCorrectLocked
                    ? 'revealCorrectPop 0.6s var(--qq-ease-bounce) both'
                    : `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.1 + optIdx * 0.08}s both`,
                }}>
                  {/* Row 1: label + total */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                    <span style={{
                      width: 'clamp(36px, 4cqw, 52px)', height: 'clamp(36px, 4cqw, 52px)',
                      borderRadius: 8, background: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'clamp(16px, 1.9cqw, 24px)', fontWeight: 900, color: '#fff',
                      flexShrink: 0,
                      boxShadow: showGreen ? '0 0 16px rgba(34,197,94,0.6)' : 'none',
                      transition: 'background 0.3s ease, box-shadow 0.3s ease',
                    }}>
                      {optIdx + 1}
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: 'clamp(15px, 1.7cqw, 22px)', fontWeight: 900,
                      color: isCorrectLocked ? '#86efac' : '#e2e8f0',
                    }}>
                      {optText}
                    </span>
                    <span style={{
                      fontSize: 'clamp(18px, 2.2cqw, 30px)', fontWeight: 900,
                      color: isCorrectLocked ? '#4ade80' : color,
                      minWidth: 56, textAlign: 'right',
                      transition: 'color 0.3s ease',
                    }}>
                      💰 {displayTotal}
                    </span>
                  </div>
                  {/* Row 2: stacked bar — each segment = one team's contribution */}
                  <div style={{
                    height: 28, position: 'relative', margin: '0 14px 10px',
                    borderRadius: 8, overflow: 'hidden',
                    background: 'rgba(0,0,0,0.35)',
                    width: `${barPct}%`,
                    transition: 'width 0.7s var(--qq-ease-out-cubic)',
                    display: 'flex',
                  }}>
                    {contribs.map((c, ci) => {
                      const isHighest = highestTeamIds.has(c.team.id);
                      const hidden = highestHidden && isHighest;
                      const segPct = displayTotal > 0 ? (c.pts / displayTotal) * 100 : 0;
                      if (hidden) return null;
                      const justRevealed = isHighest;
                      return (
                        <div key={c.team.id} style={{
                          width: `${segPct}%`,
                          background: c.team.color,
                          borderRight: ci < contribs.length - 1 ? '2px solid rgba(0,0,0,0.4)' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 4, minWidth: 0, overflow: 'hidden',
                          fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 900, color: '#fff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                          animation: justRevealed
                            ? 'muchoVoterDrop 0.55s cubic-bezier(0.34,1.5,0.64,1) both'
                            : `contentReveal 0.5s var(--qq-ease-pop-fast) ${0.2 + optIdx * 0.08 + ci * 0.05}s both`,
                        }}>
                          <QQTeamAvatar avatarId={c.team.avatarId} teamEmoji={c.team.emoji} size={'clamp(14px, 1.5cqw, 18px)'} />
                          <span>{c.pts}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Legend: teams */}
            {parsed.length > 0 && (
              <div style={{
                marginTop: 2, padding: '8px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.1 + q.options!.length * 0.08 + 0.1}s both`,
              }}>
                <span style={{
                  fontSize: 'clamp(11px, 1cqw, 13px)', fontWeight: 900, color: '#64748b',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>Teams</span>
                {s.teams.map(tm => {
                  const p = parsed.find(x => x.teamId === tm.id);
                  const earned = p && q.correctOptionIndex != null ? (p.pts[q.correctOptionIndex] ?? 0) : 0;
                  return (
                    <div key={tm.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '3px 10px', borderRadius: 999,
                      background: 'rgba(0,0,0,0.28)',
                      border: `1.5px solid ${tm.color}`,
                    }}>
                      <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={22} />
                      <span style={{ fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 900, color: tm.color }}>{tm.name}</span>
                      <span style={{
                        fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 900,
                        color: earned > 0 ? '#4ade80' : '#64748b',
                      }}>+{earned}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* CHEESE: typed answers with speed for ties — step-based reveal */}
      {/* 2026-05-02 (Phone-Beamer-Audit): isWinner via currentQuestionWinners
          (Backend-Truth) - sonst kriegen Schreibfehler-akzeptierte Teams kein
          gruenes Highlight in der Step-Liste. */}
      {q.category === 'CHEESE' && (() => {
        const sorted = [...s.answers].sort((a, b) => a.submittedAt - b.submittedAt);
        const t0 = s.timerEndsAt ? s.timerEndsAt - (s.timerDurationSec * 1000) : (sorted[0]?.submittedAt ?? 0);
        const winnerSet = new Set(s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []));
        const hasTie = winnerSet.size > 1;
        // 2026-05-06 (Wolf 'reveal slow→fast Winner, Sync mit Sound-Cascade'):
        // Winner-Avatare droppen mit 850ms Stagger in der Reihenfolge slowest→
        // fastest (= submittedAt DESC). Schnellster Winner zuletzt = Climax-
        // Moment, synchron zum playRevealHighlight-Sound. Non-Winner-Avatare
        // droppen sofort am Anfang (nicht Teil der Cascade).
        const winnerSlowToFast = [...s.answers]
          .filter(a => winnerSet.has(a.teamId))
          .sort((a, b) => b.submittedAt - a.submittedAt)
          .map(a => a.teamId);
        return (
          <div style={{ animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.1s both', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map((a, i) => {
              const team = s.teams.find(t => t.id === a.teamId);
              const isWinner = winnerSet.has(a.teamId);
              const timeSec = t0 ? ((a.submittedAt - t0) / 1000).toFixed(1) : null;
              if (!team) return null;
              const greenOn = isWinner;
              const avatarsOn = true;
              const winnerCascadeIdx = isWinner ? winnerSlowToFast.indexOf(a.teamId) : -1;
              // 850ms Stagger fuer Winner (sync zur Sound-Cascade), 0s fuer
              // Non-Winner (sind sofort sichtbar). 0.85 statt 0.16 frueher.
              const avatarDelay = avatarsOn
                ? (isWinner ? winnerCascadeIdx * 0.85 : 0)
                : 0;
              return (
                <div key={a.teamId} style={{
                  display: 'flex', alignItems: 'stretch', gap: 0,
                  borderRadius: 16, overflow: 'hidden',
                  background: greenOn ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.035)',
                  border: greenOn ? '2px solid rgba(34,197,94,0.55)' : '1.5px solid rgba(255,255,255,0.08)',
                  boxShadow: greenOn ? '0 0 0 3px rgba(34,197,94,0.12)' : 'none',
                  animation: `contentReveal 0.45s var(--qq-ease-pop-fast) ${0.1 + i * 0.08}s both`,
                  minHeight: 60,
                  transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
                  position: 'relative',
                }}>
                  {/* Shimmer overlay bei Grün-Enthüllung */}
                  {greenOn && (
                    <div aria-hidden style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none',
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.28) 50%, transparent 100%)',
                      animation: 'revealShimmer 1s ease 0.05s 1 both',
                    }} />
                  )}
                  <div style={{
                    width: 'clamp(60px, 6.5cqw, 90px)',
                    background: greenOn ? 'linear-gradient(135deg,#22C55E,#16A34A)' : `${team.color}30`,
                    borderRight: `2px solid ${greenOn ? 'rgba(34,197,94,0.5)' : team.color + '50'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, gap: 2,
                    transition: 'background 0.35s ease, border-color 0.35s ease',
                  }}>
                    {avatarsOn
                      ? (
                        <div style={{ animation: `muchoVoterDrop 0.55s cubic-bezier(0.34,1.5,0.64,1) ${avatarDelay}s both` }}>
                          <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={'clamp(22px, 2.6cqw, 34px)'} />
                        </div>
                      )
                      : (
                        <span style={{
                          width: 'clamp(22px, 2.6cqw, 34px)', height: 'clamp(22px, 2.6cqw, 34px)',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1.5px dashed rgba(255,255,255,0.22)',
                        }} />
                      )
                    }
                    <span style={{ fontSize: 'clamp(10px, 1cqw, 13px)', fontWeight: 900, color: greenOn ? '#fff' : team.color, letterSpacing: 0.3 }}>
                      {team.name}
                    </span>
                  </div>
                  <div style={{
                    flex: 1, padding: '10px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    position: 'relative',
                  }}>
                    <span style={{
                      flex: 1,
                      fontSize: 'clamp(18px, 2.4cqw, 32px)', fontWeight: 900,
                      color: greenOn ? '#86efac' : '#e2e8f0',
                      lineHeight: 1.2,
                      transition: 'color 0.35s ease',
                    }}>
                      {a.text || '—'}
                    </span>
                    {hasTie && timeSec && avatarsOn && (
                      <span style={{
                        padding: '4px 10px', borderRadius: 999,
                        background: i === 0 && isWinner ? 'rgba(236,72,153,0.22)' : 'rgba(0,0,0,0.28)',
                        border: i === 0 && isWinner ? '1.5px solid rgba(236,72,153,0.6)' : '1px solid rgba(255,255,255,0.1)',
                        fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 900,
                        color: i === 0 && isWinner ? '#EC4899' : '#94a3b8',
                        whiteSpace: 'nowrap',
                        animation: `contentReveal 0.3s var(--qq-ease-pop-fast) ${avatarDelay + 0.2}s both`,
                      }}>
                        {i === 0 && isWinner ? '⚡ ' : ''}{timeSec}s
                      </span>
                    )}
                    {greenOn && (
                      <span style={{
                        fontSize: 'clamp(20px, 2.4cqw, 30px)', color: '#4ade80', fontWeight: 900,
                        animation: 'revealCorrectPop 0.45s var(--qq-ease-bounce) both',
                      }}>✓</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* BUNTE TÜTE top5 — answer-centric: list correct answers, pin teams who had each */}
      {q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'top5' && (() => {
        const btt = q.bunteTuete as any;
        const correctListDE: string[] = (btt.answers ?? []).map((s: string) => s.trim()).filter(Boolean);
        const correctListEN: string[] = (btt.answersEn ?? []).map((s: string) => s.trim()).filter(Boolean);
        const correctList = lang === 'en' && correctListEN.length ? correctListEN : correctListDE;
        // 2026-05-02: Backend-Truth via top5HitsByTeam. Backend matched DE+EN
        // concat (correctAll = correctDE.concat(correctEN)), Indizes 0..N-1 in DE,
        // N..2N-1 in EN. Frontend mappt zurueck auf Display-Sprache.
        const hitsByTeam = s.top5HitsByTeam ?? {};
        // Map: für jede DE-Antwort i, welche Teams haben Index i ODER i+correctListDE.length getroffen?
        const perAnswer = correctList.map((correct, ci) => {
          const deIdx = ci;
          const enIdx = ci + correctListDE.length; // EN-Indizes liegen hinter DE
          const hitters = s.answers
            .filter(a => {
              const teamHits = hitsByTeam[a.teamId] ?? [];
              return teamHits.includes(deIdx) || teamHits.includes(enIdx);
            })
            .map(a => s.teams.find(t => t.id === a.teamId))
            .filter((t): t is NonNullable<typeof t> => !!t);
          return { correct, hitters };
        });
        // Hit-count + ranking summary per team
        const teamScore = s.answers.map(a => ({
          teamId: a.teamId,
          hits: (hitsByTeam[a.teamId] ?? []).length,
        })).sort((a, b) => b.hits - a.hits);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.1s both' }}>
            {/* The 5 correct answers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {perAnswer.map(({ correct, hitters }, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 16,
                  background: hitters.length > 0
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(22,163,74,0.06))'
                    : 'rgba(255,255,255,0.035)',
                  border: hitters.length > 0 ? '1.5px solid rgba(34,197,94,0.4)' : '1.5px solid rgba(255,255,255,0.08)',
                  animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.1 + i * 0.08}s both`,
                }}>
                  <span style={{
                    width: 'clamp(32px, 3.5cqw, 44px)', height: 'clamp(32px, 3.5cqw, 44px)',
                    borderRadius: 8,
                    background: hitters.length > 0 ? 'linear-gradient(135deg,#EC4899,#EC4899)' : 'rgba(100,116,139,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'clamp(15px, 1.6cqw, 20px)', fontWeight: 900, color: '#fff',
                    flexShrink: 0,
                  }}>
                    #{i + 1}
                  </span>
                  <span style={{
                    flex: 1,
                    fontSize: 'clamp(16px, 1.9cqw, 26px)', fontWeight: 900,
                    color: '#F1F5F9',
                  }}>
                    {correct}
                  </span>
                  {hitters.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {hitters.map((tm, hi) => (
                        <div key={tm.id} style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px 3px 3px', borderRadius: 999,
                          background: 'rgba(0,0,0,0.28)',
                          border: `1.5px solid ${tm.color}`,
                          animation: `contentReveal 0.3s var(--qq-ease-pop-fast) ${0.2 + i * 0.08 + hi * 0.05}s both`,
                        }}>
                          <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(24px, 2.8cqw, 32px)'} />
                          <span style={{ fontSize: 'clamp(11px, 1.2cqw, 14px)', fontWeight: 900, color: tm.color }}>{tm.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 'clamp(12px, 1.2cqw, 15px)', fontWeight: 700, color: '#64748b', fontStyle: 'italic' }}>
                      {lang === 'en' ? 'nobody' : 'niemand'}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Team score summary */}
            <div style={{
              marginTop: 4, padding: '8px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.1 + correctList.length * 0.08 + 0.1}s both`,
            }}>
              <span style={{
                fontSize: 'clamp(11px, 1cqw, 13px)', fontWeight: 900, color: '#64748b',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}><QQEmojiIcon emoji="🏆"/> Treffer</span>
              {teamScore.map(ts => {
                const tm = s.teams.find(t => t.id === ts.teamId);
                if (!tm) return null;
                const isWinner = ts.teamId === s.correctTeamId;
                return (
                  <div key={tm.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '3px 10px', borderRadius: 999,
                    background: isWinner ? 'rgba(34,197,94,0.18)' : 'rgba(0,0,0,0.28)',
                    border: isWinner ? '1.5px solid rgba(34,197,94,0.6)' : `1.5px solid ${tm.color}`,
                  }}>
                    <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(14px, 1.5cqw, 18px)'} />
                    <span style={{ fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 900, color: tm.color }}>{tm.name}</span>
                    <span style={{
                      fontSize: 'clamp(12px, 1.2cqw, 15px)', fontWeight: 900,
                      color: isWinner ? '#4ade80' : '#cbd5e1',
                    }}>{ts.hits}/{correctList.length}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* BUNTE TÜTE order — correct sequence big, per-position stats + team summary */}
      {/* 2026-05-02: Backend-Truth via orderHitsByTeam (per-team boolean[] per position). */}
      {q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'order' && (() => {
        const btt = q.bunteTuete as any;
        const items: string[] = btt.items ?? [];
        const correctOrder: number[] = btt.correctOrder ?? items.map((_: any, i: number) => i);
        const correctSeq = correctOrder.map((idx: number) => (items[idx] ?? '').trim());
        const orderHits = s.orderHitsByTeam ?? {};
        // Per-position: how many teams got this right
        const perPositionHits = correctSeq.map((_, posIdx) => {
          const hitters = s.answers
            .filter(a => (orderHits[a.teamId] ?? [])[posIdx] === true)
            .map(a => s.teams.find(t => t.id === a.teamId))
            .filter((t): t is NonNullable<typeof t> => !!t);
          return { hitters, total: s.answers.length };
        });
        // Per-team: how many positions correct
        const teamScores = s.answers.map(a => ({
          teamId: a.teamId,
          score: (orderHits[a.teamId] ?? []).filter(Boolean).length,
        })).sort((a, b) => b.score - a.score);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.1s both' }}>
            {/* Correct sequence as numbered chain */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {correctSeq.map((item, pi) => {
                const { hitters, total } = perPositionHits[pi];
                const allRight = hitters.length === total && total > 0;
                const noneRight = hitters.length === 0;
                return (
                  <div key={pi} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 16,
                    background: allRight
                      ? 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(22,163,74,0.08))'
                      : noneRight ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                    border: allRight
                      ? '1.5px solid rgba(34,197,94,0.55)'
                      : noneRight ? '1.5px solid rgba(239,68,68,0.3)' : '1.5px solid rgba(255,255,255,0.08)',
                    animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.1 + pi * 0.08}s both`,
                  }}>
                    <span style={{
                      width: 'clamp(32px, 3.5cqw, 44px)', height: 'clamp(32px, 3.5cqw, 44px)',
                      borderRadius: 8,
                      background: 'linear-gradient(135deg,#EC4899,#EA580C)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'clamp(15px, 1.6cqw, 20px)', fontWeight: 900, color: '#fff',
                      flexShrink: 0,
                    }}>
                      {pi + 1}
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: 'clamp(16px, 1.9cqw, 26px)', fontWeight: 900,
                      color: '#F1F5F9',
                    }}>
                      {item}
                    </span>
                    {/* Team avatars who got this position right */}
                    {hitters.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {hitters.map((tm, hi) => (
                          <QQTeamAvatar key={tm.id} avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(24px, 2.6cqw, 32px)'} title={tm.name} style={{
                            marginLeft: hi > 0 ? -6 : 0,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                            animation: `contentReveal 0.3s var(--qq-ease-pop-fast) ${0.2 + pi * 0.08 + hi * 0.04}s both`,
                          }} />
                        ))}
                      </div>
                    )}
                    <span style={{
                      minWidth: 44, textAlign: 'right',
                      fontSize: 'clamp(13px, 1.4cqw, 17px)', fontWeight: 900,
                      color: allRight ? '#4ade80' : noneRight ? '#f87171' : '#94a3b8',
                    }}>
                      {hitters.length}/{total}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Team summary bar */}
            <div style={{
              marginTop: 4, padding: '8px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.1 + correctSeq.length * 0.08 + 0.1}s both`,
            }}>
              <span style={{
                fontSize: 'clamp(11px, 1cqw, 13px)', fontWeight: 900, color: '#64748b',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}><QQEmojiIcon emoji="🎯"/> Richtige Positionen</span>
              {teamScores.map(ts => {
                const tm = s.teams.find(t => t.id === ts.teamId);
                if (!tm) return null;
                const isWinner = ts.teamId === s.correctTeamId;
                return (
                  <div key={tm.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '3px 10px', borderRadius: 999,
                    background: isWinner ? 'rgba(34,197,94,0.18)' : 'rgba(0,0,0,0.28)',
                    border: isWinner ? '1.5px solid rgba(34,197,94,0.6)' : `1.5px solid ${tm.color}`,
                  }}>
                    <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(14px, 1.5cqw, 18px)'} />
                    <span style={{ fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 900, color: tm.color }}>{tm.name}</span>
                    <span style={{
                      fontSize: 'clamp(12px, 1.2cqw, 15px)', fontWeight: 900,
                      color: isWinner ? '#4ade80' : '#cbd5e1',
                    }}>{ts.score}/{correctSeq.length}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* BUNTE TÜTE map */}
      {q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'map' && (() => {
        const btt = q.bunteTuete as any;
        const tLat: number = btt.lat; const tLng: number = btt.lng;
        const scored = [...s.answers].map(a => {
          const parts = a.text.split(',');
          const lat = parseFloat(parts[0]); const lng = parseFloat(parts[1]);
          if (Number.isNaN(lat) || Number.isNaN(lng)) return { ...a, distKm: null };
          const R = 6371;
          const dLat = (lat - tLat) * Math.PI / 180;
          const dLng = (lng - tLng) * Math.PI / 180;
          const aa = Math.sin(dLat / 2) ** 2 + Math.cos(tLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
          return { ...a, distKm: R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa)) };
        }).sort((a, b) => (a.distKm === null ? 1 : b.distKm === null ? -1 : a.distKm - b.distKm));
        return scored.map((a, i) => {
          const team = s.teams.find(t => t.id === a.teamId);
          const isWinner = a.teamId === s.correctTeamId;
          const distStr = a.distKm === null ? '—' : a.distKm < 1 ? `${Math.round(a.distKm * 1000)} m` : `${a.distKm.toFixed(1)} km`;
          return (
            <div key={a.teamId} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 12px', borderRadius: 8, marginBottom: 4,
              background: isWinner ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
              border: isWinner ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.05)',
              animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.1 + i * 0.08}s both`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: i === 0 ? '#60A5FA' : '#475569', width: 20 }}>#{i + 1}</span>
              {team && <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={18} />}
              <span style={{ fontWeight: 900, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: 13 }}>{team?.name}</span>
              <span style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: isWinner ? '#4ade80' : '#64748b' }}><QQEmojiIcon emoji="📍"/> {distStr}</span>
            </div>
          );
        });
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CozyGuessr Reveal — progressive map reveal (moderator steuert step-by-step)
// ═══════════════════════════════════════════════════════════════════════════════

const QQFitBoundsOnTrigger: React.FC<{ bounds: L.LatLngBounds; trigger: number }> = ({ bounds, trigger }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds.isValid()) {
      // flyToBounds = smoother Cinematic-Zoom (vs. fitBounds = harter Sprung).
      // padding etwas grosszuegiger + duration 1.4s damit die Bewegung als
      // bewusster Move zum Ziel erkennbar ist (Geoguessr-style).
      map.flyToBounds(bounds, { padding: [100, 100], maxZoom: 8, duration: 1.4 });
    }
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

// Slow-Zoom-Intro: beim ersten Reveal-Step (showTarget) auf den Zielbereich
// zoomen — startet typischerweise von einem weiten Default-Zoom und gleitet
// rein, wie GeoGuessr-Round-End. Nur einmal beim Mount.
const QQInitialTargetZoom: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => {
      map.flyTo([lat, lng] as any, 6, { duration: 2.0 });
    }, 200);
    return () => window.clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

const QQMapResizer: React.FC<{ trigger: boolean }> = ({ trigger }) => {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 60);
    return () => window.clearTimeout(t);
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

/**
 * 4 gewinnt / Only Connect — Beamer-Layout für active + reveal.
 *
 * Active:
 *   - Frage oben (z.B. „Was verbindet diese Begriffe?")
 *   - 4 Hint-Slots: aufgedeckte Hinweise farblich, kommende verschleiert
 *   - Aktuell sichtbarer Hint pulsiert leicht
 *   - Team-Status-Reihe unten (✓ wenn correct, ✕ wenn locked, sonst dim)
 *
 * Reveal:
 *   - Antwort prominent in Gold
 *   - Winner-Team mit Avatar + atHintIdx-Badge
 *   - Alle 4 Hints sichtbar
 */
/**
 * Bluff — Beamer-Layout für die 3 Phasen + Reveal.
 *  write:  Frage + „Teams schreiben Bluffs" + Submission-Counter + Avatare ✓
 *  review: Frage + Bluffs in einer Liste + ✕-Buttons (Moderator filtert)
 *  vote:   Frage + Optionen mit Vote-Counter pro Option
 *  reveal: Echte Antwort hervorgehoben + per-Option Avatare die gewählt haben
 *          + per-Bluff-Box wer den Bluff geschrieben hat + Punktevergabe
 */
function BluffBeamerView({ state: s, lang, revealed }: {
  state: QQStateUpdate; lang: 'de' | 'en'; revealed: boolean;
}) {
  const q = s.currentQuestion!;
  const bt = q.bunteTuete as import('../../../shared/quarterQuizTypes').QQBunteTueteBluff;
  const phase = s.bluffPhase;
  const accent = '#F472B6'; // pink
  // realText 2026-05-05 entfernt — die Echte-Antwort wird in der neuen
  // Bluff-Tabelle als gruene Real-Card mit ✓ echt-Pille gezeigt, separate
  // Hero-Card war redundant.

  const submitCount = Object.keys(s.bluffSubmissions ?? {}).filter(id => s.bluffSubmissions[id]?.trim()).length;
  const totalActive = s.teams.filter(t => t.connected).length;
  const voteCount = Object.keys(s.bluffVotes ?? {}).length;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(14px, 2cqh, 24px)',
      padding: 'clamp(20px, 2.5cqh, 36px) clamp(24px, 3cqw, 48px) clamp(16px, 2cqh, 28px)',
      position: 'relative',
      // 2026-05-09 (Wolf 'gewinnercard bei bluff unten abgeschnitten'): outer
      // braucht min-height: 0 + overflow: hidden, sonst expandiert das innere
      // BluffVoteScreen-grid über die verfügbare Höhe und drückt die Sieger-
      // Card raus aus dem Beamer-Viewport.
      minHeight: 0, overflow: 'hidden',
    }}>
      <Fireflies color={`${accent}55`} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 16, position: 'relative', zIndex: 5,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '8px 22px', borderRadius: 999,
          background: `${accent}22`, border: `2px solid ${accent}44`,
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          animation: 'contentReveal 0.35s var(--qq-ease-pop-fast) both',
        }}>
          <span style={{ fontSize: 'clamp(20px, 2.2cqw, 30px)', lineHeight: 1 }}>🎭</span>
          <span style={{
            fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900,
            color: accent, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>{lang === 'de' ? 'Bluff' : 'Bluff'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!revealed && phase && (
            <div style={{
              padding: '8px 16px', borderRadius: 999,
              background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.12)',
              fontSize: 'clamp(13px, 1.4cqw, 18px)', fontWeight: 900, color: '#cbd5e1',
            }}>
              {/* 2026-05-05 (Wolf 'emojis vom style nicht passend, schwarz-weiss'):
                  📝 → ✍️ (bunte writing hand), 🗳 → 🎯 (bullseye, „triff
                  die echte"), 👮 → 🕵️ (Detective, passt thematisch zum
                  Bluff-Detection besser als Polizei-Emoji). */}
              {phase === 'write' && (lang === 'de' ? `✍️ Bluffs schreiben (${submitCount}/${totalActive})` : `✍️ Writing (${submitCount}/${totalActive})`)}
              {phase === 'review' && (lang === 'de' ? `🕵️ Moderator-Check` : `🕵️ Moderator check`)}
              {phase === 'vote' && (lang === 'de' ? `🎯 Abstimmen (${voteCount}/${totalActive})` : `🎯 Voting (${voteCount}/${totalActive})`)}
              {phase === 'reveal' && (lang === 'de' ? `🎉 Auflösung` : `🎉 Reveal`)}
            </div>
          )}
          {phase === 'write' && s.bluffWriteEndsAt && <BluffTimer endsAt={s.bluffWriteEndsAt} accent={accent} />}
          {phase === 'vote' && s.bluffVoteEndsAt && <BluffTimer endsAt={s.bluffVoteEndsAt} accent={accent} />}
        </div>
      </div>

      {/* Frage — 2026-05-09 (Wolf-Konzept-D): kleiner als zuvor, damit Real-Card-
          Hero in der Mitte mehr Platz bekommt. Pre-Reveal bleibt sie groß
          (Frage ist da das Hauptelement), Reveal scaled sie down. */}
      <div style={{
        textAlign: 'center', position: 'relative', zIndex: 5,
        animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.1s both',
      }}>
        <div style={{
          fontSize: phase === 'reveal'
            ? 'clamp(22px, 2.4cqw, 38px)'
            : 'clamp(34px, 4cqw, 64px)',
          fontWeight: 900,
          color: '#F1F5F9', lineHeight: 1.2, maxWidth: 1100, margin: '0 auto',
          transition: 'font-size 0.5s ease',
        }}>
          {lang === 'en' && q.textEn ? q.textEn : q.text}
        </div>
      </div>

      {/* Phase-spezifischer Inhalt — bei reveal stapeln wir vorher die
          Reveal-Header-Cards (Echte Antwort + Sieger-Pille) damit sie OBEN
          sichtbar sind und das Options-Grid den Rest fuellt. */}
      {phase === 'write' && <BluffWriteScreen state={s} accent={accent} lang={lang} />}
      {phase === 'review' && <BluffReviewScreen state={s} accent={accent} lang={lang} />}
      {phase === 'vote' && <BluffVoteWaitingScreen state={s} accent={accent} lang={lang} />}

      {/* 2026-05-09 (Konzept-D Refactor): Reveal-Layout neu:
          1) Hero-Real-Card mittig (RIESIG, dominantes Element)
          2) Sieger-Banner direkt drunter (compact, eine Reihe)
          3) Mini-Bluff-Pills horizontal unten
          Alles in einer einzigen `BluffRevealHero`-Komponente. */}
      {phase === 'reveal' && <BluffRevealHero state={s} lang={lang} />}

    </div>
  );
}

// 2026-05-09 (Wolf-Konzept-D): Bluff-Reveal komplett neues Layout.
// - Hero-Real-Card riesig in der Mitte (echte Antwort als Star)
// - Sieger-Banner direkt drunter (Avatar + Name + Reinfälle-Pillen, kompakt)
// - Bluffs als horizontale Mini-Pills ganz unten (Author-Avatar + Bluff-Text + Voter-Dots)
function BluffRevealHero({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const opts = s.bluffOptions ?? [];
  const realOpt = opts.find(o => o.source === 'real');
  const bluffOpts = opts.filter(o => o.source !== 'real');

  // Voters je Option für die Mini-Pills
  const votersByOption: Record<string, string[]> = {};
  for (const [teamId, optId] of Object.entries(s.bluffVotes ?? {})) {
    if (!votersByOption[optId]) votersByOption[optId] = [];
    votersByOption[optId].push(teamId);
  }

  // Sieger-Daten
  const winners = s.currentQuestionWinners ?? [];
  const winnerTeams = winners
    .map(id => s.teams.find(t => t.id === id))
    .filter(Boolean) as typeof s.teams;
  const winnerTeam = winnerTeams[0] ?? null;
  const isCoTie = winnerTeams.length > 1;
  const points = s.bluffPoints ?? {};
  const wPts = winnerTeam ? points[winnerTeam.id] : null;
  const breakdown: Array<{ icon: string; n: number; label: { de: string; en: string }; bg: string }> = [];
  if ((wPts?.foundReal ?? 0) > 0) breakdown.push({ icon: '✅', n: wPts!.foundReal, label: { de: 'echt', en: 'real' }, bg: 'rgba(34,197,94,0.20)' });
  if ((wPts?.blufferBonus ?? 0) > 0) breakdown.push({ icon: '🎭', n: wPts!.blufferBonus, label: { de: 'Reinfälle', en: 'fooled' }, bg: 'rgba(244,114,182,0.20)' });
  if ((wPts?.truthAccident ?? 0) > 0) breakdown.push({ icon: '✨', n: wPts!.truthAccident, label: { de: 'Glück', en: 'lucky' }, bg: 'rgba(236,72,153,0.22)' });

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 'clamp(16px, 2cqh, 28px)',
      width: '100%', position: 'relative', zIndex: 5,
      padding: '0 clamp(8px, 1.5cqw, 24px)',
    }}>
      {/* HERO: Real-Card mittig — riesig, grün, dominantes Element */}
      {realOpt && (
        <div style={{
          maxWidth: 'min(1300px, 92cqw)', width: '100%',
          padding: 'clamp(28px, 4cqh, 56px) clamp(36px, 4.5cqw, 72px)',
          borderRadius: 32,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.28) 0%, rgba(34,197,94,0.08) 100%)',
          border: '3px solid rgba(34,197,94,0.85)',
          boxShadow: '0 0 80px rgba(34,197,94,0.45), 0 14px 40px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 1.4cqh, 18px)',
          animation: 'revealAnswerBam 0.7s var(--qq-ease-out-cubic) 0.15s both',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 16px', borderRadius: 999,
            background: 'rgba(34,197,94,0.35)', border: '1.5px solid #22C55E',
            fontSize: 'clamp(13px, 1.4cqw, 18px)', fontWeight: 900,
            color: '#86EFAC', letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            ✓ {lang === 'de' ? 'Echte Antwort' : 'Real answer'}
          </div>
          <div style={{
            fontSize: 'clamp(36px, 5.6cqw, 88px)', fontWeight: 900,
            color: '#86EFAC', textAlign: 'center', lineHeight: 1.12,
            textShadow: '0 0 32px rgba(34,197,94,0.55)',
            letterSpacing: '-0.01em', maxWidth: '100%', wordBreak: 'break-word',
          }}>
            {realOpt.text}
          </div>
        </div>
      )}

      {/* SIEGER-BANNER direkt unter Hero — kompakt, eine Reihe */}
      {winnerTeam && (
        <div style={{
          maxWidth: 'min(1100px, 90cqw)',
          display: 'flex', alignItems: 'center', gap: 'clamp(14px, 1.8cqw, 24px)',
          padding: 'clamp(10px, 1.4cqh, 18px) clamp(20px, 2.4cqw, 36px)',
          borderRadius: 999,
          background: `linear-gradient(135deg, ${winnerTeam.color}33, ${winnerTeam.color}0d)`,
          border: `2.5px solid ${winnerTeam.color}cc`,
          boxShadow: `0 0 36px ${winnerTeam.color}66, 0 6px 18px rgba(0,0,0,0.5)`,
          animation: 'revealWinnerIn 0.55s var(--qq-ease-bounce) 0.5s both',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <span style={{
            padding: '4px 12px', borderRadius: 999,
            background: `linear-gradient(135deg, ${winnerTeam.color}, ${winnerTeam.color}dd)`,
            fontSize: 'clamp(11px, 1.2cqw, 15px)', fontWeight: 900,
            color: '#0a1f0d', letterSpacing: '0.12em', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            🎉 {lang === 'de' ? 'Sieger' : 'Winner'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {winnerTeams.map((tm, idx) => (
              <QQTeamAvatar
                key={tm.id}
                avatarId={tm.avatarId}
                teamEmoji={tm.emoji}
                size={'clamp(44px, 4.6cqw, 64px)'}
                style={{
                  boxShadow: `0 0 16px ${tm.color}88, 0 0 0 2px rgba(15,23,42,0.6)`,
                  marginLeft: idx === 0 ? 0 : 'clamp(-10px, -1cqw, -6px)',
                  zIndex: winnerTeams.length - idx,
                }}
              />
            ))}
          </div>
          <div style={{ minWidth: 0 }}>
            {isCoTie ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {winnerTeams.map(tm => (
                  <TeamNameLabel
                    key={tm.id}
                    name={tm.name}
                    maxLines={1}
                    shrinkAfter={18}
                    color={tm.color}
                    fontWeight={900}
                    fontSize="clamp(15px, 1.6cqw, 22px)"
                    style={{ lineHeight: 1.15 }}
                  />
                ))}
              </div>
            ) : (
              <TeamNameLabel
                name={winnerTeam.name}
                maxLines={1}
                shrinkAfter={18}
                color={winnerTeam.color}
                fontWeight={900}
                fontSize="clamp(20px, 2.2cqw, 30px)"
                style={{ lineHeight: 1.1 }}
              />
            )}
          </div>
          {breakdown.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {breakdown.map((b, i) => (
                <span key={i} title={`${b.n} × ${b.label[lang]}`} style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: b.bg,
                  fontSize: 'clamp(13px, 1.4cqw, 17px)', fontWeight: 900, color: '#f1f5f9',
                  whiteSpace: 'nowrap',
                }}>
                  {b.icon} {b.n}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MINI-BLUFF-PILLS horizontal — Author-Avatar + Bluff-Text + Voter-Dots */}
      {bluffOpts.length > 0 && (
        <div style={{
          width: '100%', maxWidth: 'min(1500px, 96cqw)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 8,
        }}>
          <div style={{
            fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 900,
            color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase',
            opacity: 0.75,
          }}>
            🎭 {lang === 'de' ? 'Die Bluffs' : 'The bluffs'}
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: 'clamp(8px, 1cqw, 14px)',
            width: '100%',
          }}>
            {bluffOpts.map((opt, i) => {
              const contribIds = opt.source === 'team' ? opt.contributors : [];
              const authorTeam = contribIds[0] ? s.teams.find(t => t.id === contribIds[0]) : null;
              const extraAuthors = contribIds.length > 1 ? contribIds.length - 1 : 0;
              const voters = votersByOption[opt.id] ?? [];
              const cardColor = authorTeam?.color ?? '#64748b';
              return (
                <div key={opt.id} style={{
                  display: 'inline-flex', alignItems: 'center',
                  gap: 'clamp(8px, 1cqw, 14px)',
                  padding: '8px 16px 8px 10px',
                  borderRadius: 999,
                  background: `${cardColor}1a`,
                  border: `1.5px solid ${cardColor}66`,
                  boxShadow: `0 4px 12px rgba(0,0,0,0.35), 0 0 12px ${cardColor}22`,
                  animation: `contentReveal 0.5s var(--qq-ease-out-cubic) ${0.7 + i * 0.08}s both`,
                  maxWidth: 'min(440px, 90cqw)',
                }}>
                  {/* Author-Avatar */}
                  {authorTeam && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                      position: 'relative',
                    }}>
                      <QQTeamAvatar
                        avatarId={authorTeam.avatarId} teamEmoji={authorTeam.emoji}
                        size={'clamp(28px, 2.8cqw, 38px)'}
                        style={{
                          boxShadow: `0 0 8px ${authorTeam.color}77, 0 0 0 2px rgba(15,23,42,0.55)`,
                        }}
                      />
                      {extraAuthors > 0 && (
                        <span style={{
                          position: 'absolute', right: -6, bottom: -4,
                          background: '#0A0814', border: `1.5px solid ${authorTeam.color}`,
                          borderRadius: 999, padding: '1px 5px',
                          fontSize: 9, fontWeight: 900, color: authorTeam.color,
                          lineHeight: 1.1,
                        }}>+{extraAuthors}</span>
                      )}
                    </div>
                  )}
                  {/* Bluff-Text */}
                  <span style={{
                    fontSize: 'clamp(13px, 1.4cqw, 18px)', fontWeight: 800,
                    color: '#F1F5F9', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    minWidth: 0, flex: 1,
                  }}>{opt.text}</span>
                  {/* Voter-Dots — kleine Avatare derer die für DIESEN Bluff gestimmt haben */}
                  {voters.length > 0 && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 0,
                      paddingLeft: 8, marginLeft: 4,
                      borderLeft: `1px dashed ${cardColor}55`,
                      flexShrink: 0,
                    }}>
                      {voters.slice(0, 4).map((vid, vi) => {
                        const tm = s.teams.find(t => t.id === vid);
                        if (!tm) return null;
                        return (
                          <QQTeamAvatar
                            key={vid}
                            avatarId={tm.avatarId} teamEmoji={tm.emoji}
                            size={'clamp(20px, 2cqw, 28px)'}
                            title={tm.name}
                            style={{
                              boxShadow: `0 0 0 1.5px ${tm.color}, 0 0 0 3px rgba(10,8,20,0.85)`,
                              marginLeft: vi === 0 ? 0 : -8,
                              zIndex: voters.length - vi,
                            }}
                          />
                        );
                      })}
                      {voters.length > 4 && (
                        <span style={{
                          marginLeft: 4,
                          fontSize: 11, fontWeight: 900, color: '#cbd5e1',
                        }}>+{voters.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BluffTimer({ endsAt, accent }: { endsAt: number; accent: string }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - Date.now()) / 1000));
  useEffect(() => {
    const iv = setInterval(() => setRemaining(Math.max(0, (endsAt - Date.now()) / 1000)), 250);
    return () => clearInterval(iv);
  }, [endsAt]);
  const sec = Math.ceil(remaining);
  const urgent = sec <= 10;
  return (
    <div style={{
      padding: '8px 18px', borderRadius: 999,
      background: urgent ? 'rgba(239,68,68,0.22)' : `${accent}22`,
      border: `2px solid ${urgent ? '#EF4444' : `${accent}55`}`,
      fontSize: 'clamp(18px, 2cqw, 26px)', fontWeight: 900,
      color: urgent ? '#FCA5A5' : '#F8FAFC', fontVariantNumeric: 'tabular-nums',
      animation: urgent ? 'pulse 0.8s ease-in-out infinite alternate' : undefined,
    }}>
      ⏱ {sec}s
    </div>
  );
}

function BluffWriteScreen({ state: s, accent, lang }: {
  state: QQStateUpdate; accent: string; lang: 'de' | 'en';
}) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      position: 'relative', zIndex: 5,
    }}>
      <div style={{
        fontSize: 'clamp(60px, 8cqw, 110px)',
        animation: 'cfloat 4s ease-in-out infinite',
      }}>✍️</div>
      <div style={{
        fontSize: 'clamp(22px, 2.4cqw, 34px)', fontWeight: 900,
        color: '#fde68a', textAlign: 'center', lineHeight: 1.3, maxWidth: 1000,
      }}>
        {lang === 'de'
          ? 'Erfindet eine plausible Falsch-Antwort auf eurem Handy!'
          : 'Make up a plausible wrong answer on your phone!'}
      </div>
      {/* Avatar-Reihe — wer hat schon submitted?
          2026-05-12 (Wolf 'footer-avatare einheitlich, glow weg, etwas
          groesser'): Sizes auf 80/88/96 wie der generische BT-Footer
          gehoben, drop-shadow-Glow raus — gruener Ring via boxShadow
          zeigt 'submitted' eindeutig. */}
      {(() => {
        const tc = s.teams.length;
        const av = tc > 6 ? 80 : tc > 4 ? 88 : 96;
        const gap = tc > 6 ? 12 : tc > 4 ? 15 : 18;
        return (
          <div style={{
            display: 'flex', gap, flexWrap: 'wrap',
            justifyContent: 'center', marginTop: 12,
          }}>
            {s.teams.map(tm => {
              const submitted = !!(s.bluffSubmissions ?? {})[tm.id]?.trim();
              return (
                <div key={tm.id} title={tm.name} style={{
                  position: 'relative',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  opacity: submitted ? 1 : 0.55,
                  filter: submitted ? 'none' : 'grayscale(0.4)',
                  transition: 'opacity 0.4s ease, filter 0.4s ease',
                }}>
                  <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={av} style={{
                    background: '#0A0814',
                    boxShadow: submitted
                      ? `0 0 0 3px #22C55E, 0 4px 10px rgba(0,0,0,0.55)`
                      : `0 0 0 2px ${tm.color}55, 0 4px 10px rgba(0,0,0,0.55)`,
                    transition: 'box-shadow 0.45s ease',
                  }} />
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

function BluffReviewScreen({ state: s, accent, lang }: {
  state: QQStateUpdate; accent: string; lang: 'de' | 'en';
}) {
  void accent;
  const submissions = Object.entries(s.bluffSubmissions ?? {}).filter(([, t]) => t?.trim());
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      position: 'relative', zIndex: 5,
      padding: 'clamp(16px, 2cqh, 28px)',
    }}>
      <div style={{
        fontSize: 'clamp(18px, 2cqw, 26px)', fontWeight: 900,
        color: '#94a3b8', textAlign: 'center',
      }}>
        {lang === 'de'
          ? '🕵️ Moderator prüft die Bluffs… Bluffs werden für die Spieler nicht angezeigt.'
          : '🕵️ Moderator reviewing bluffs… not visible to players.'}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 10, width: '100%', maxWidth: 1100,
      }}>
        {submissions.map(([teamId, text]) => {
          const tm = s.teams.find(t => t.id === teamId);
          const rejected = (s.bluffRejected ?? []).includes(teamId);
          return (
            <div key={teamId} style={{
              padding: '10px 14px', borderRadius: 16,
              background: rejected ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${rejected ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
              opacity: rejected ? 0.6 : 1,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {tm && <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={20} />}
                <span style={{
                  fontSize: 11, fontWeight: 900, color: tm?.color ?? '#94a3b8',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>{tm?.name ?? teamId}</span>
                {rejected && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#FCA5A5', fontWeight: 900 }}>
                    {lang === 'de' ? 'abgelehnt' : 'rejected'}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700,
                color: rejected ? '#FCA5A5' : '#F1F5F9',
                textDecoration: rejected ? 'line-through' : undefined,
                wordBreak: 'break-word',
              }}>{text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Vote-Phase auf dem Beamer: KEINE Optionen anzeigen (jedes Team sieht ein
 * eigenes Random-4-Subset auf seinem Phone). Stattdessen großes Voting-
 * Spannungs-Banner + Avatare mit ✓-Status pro Submit.
 */
function BluffVoteWaitingScreen({ state: s, accent, lang }: {
  state: QQStateUpdate; accent: string; lang: 'de' | 'en';
}) {
  const totalActive = s.teams.filter(t => t.connected).length;
  const voted = Object.keys(s.bluffVotes ?? {}).length;
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      position: 'relative', zIndex: 5,
    }}>
      <div style={{
        fontSize: 'clamp(60px, 8cqw, 110px)',
        animation: 'cfloat 4s ease-in-out infinite',
      }}>🎯</div>
      <div style={{
        fontSize: 'clamp(22px, 2.4cqw, 34px)', fontWeight: 900,
        color: '#fde68a', textAlign: 'center', lineHeight: 1.3, maxWidth: 1000,
      }}>
        {lang === 'de'
          ? 'Welche Antwort ist die echte? Tippt auf eurem Handy!'
          : 'Which answer is real? Tap on your phone!'}
      </div>
      <div style={{
        padding: '8px 22px', borderRadius: 999,
        background: `${accent}22`, border: `2px solid ${accent}55`,
        fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900, color: '#fbcfe8',
      }}>
        {lang === 'de' ? `${voted} / ${totalActive} Teams haben gewählt` : `${voted} / ${totalActive} teams voted`}
      </div>
      {/* Avatar-Reihe — wer hat schon gewählt? */}
      <div style={{
        display: 'flex', gap: 'clamp(12px, 1.6cqw, 22px)', flexWrap: 'wrap',
        justifyContent: 'center', marginTop: 12,
      }}>
        {s.teams.map(tm => {
          const voted = !!(s.bluffVotes ?? {})[tm.id];
          return (
            <div key={tm.id} title={tm.name} style={{
              position: 'relative',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              opacity: voted ? 1 : 0.55,
              // 2026-05-05 (Wolf): green-glow statt ✓-Badge fuer Submit-Status.
              filter: voted
                ? 'drop-shadow(0 0 10px rgba(34,197,94,0.55)) drop-shadow(0 0 3px rgba(34,197,94,0.4))'
                : 'grayscale(0.4)',
              transition: 'opacity 0.4s ease, filter 0.4s ease',
            }}>
              <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(56px, 6cqw, 84px)'} style={{
                background: '#0A0814',
                boxShadow: voted
                  ? `0 0 0 3px #22C55E, 0 4px 10px rgba(0,0,0,0.55)`
                  : `0 0 0 2px ${tm.color}55, 0 4px 10px rgba(0,0,0,0.55)`,
                transition: 'box-shadow 0.45s ease',
              }} />
            </div>
          );
        })}
      </div>
      <div style={{
        fontSize: 'clamp(11px, 1cqw, 13px)', fontWeight: 700,
        color: '#94a3b8', textAlign: 'center', marginTop: 8, opacity: 0.8,
        maxWidth: 700, lineHeight: 1.5,
      }}>
        {lang === 'de'
          ? 'Jedes Team sieht 4 zufällige Antworten — auch die echte. Kein Spickeln vom Beamer!'
          : 'Each team sees 4 random answers — including the real one. No peeking!'}
      </div>
    </div>
  );
}

function BluffVoteScreen({ state: s, accent, lang, revealed }: {
  state: QQStateUpdate; accent: string; lang: 'de' | 'en'; revealed: boolean;
}) {
  void accent;
  const opts = s.bluffOptions ?? [];
  // pro Option: welche Teams haben gewählt?
  const votersByOption: Record<string, string[]> = {};
  for (const [teamId, optId] of Object.entries(s.bluffVotes ?? {})) {
    if (!votersByOption[optId]) votersByOption[optId] = [];
    votersByOption[optId].push(teamId);
  }

  // 2026-05-05 v2 (Wolf-Konzept): Reveal-Layout = GRID mit den neuen Card-Stilen.
  // - 1/2/3 Spalten je nach Antwort-Anzahl
  // - Card-BG = Team-Farbe des Bluff-Authors (Real-Card = grün)
  // - Author-Avatar als halbtransparenter Watermark im BG
  // - Pro Card vertikal: [Letter+Antwort+Pille] obere Reihe, [Voter-Avatare] untere Reihe
  // - Sieger-Card kommt im Parent UNTER der Grid (siehe BluffBeamerView)
  if (revealed) {
    const cols = opts.length >= 6 ? 3 : opts.length >= 4 ? 2 : 1;
    return (
      <div style={{
        // 2026-05-09 (Wolf 'gewinnercard bluff abgeschnitten'): flex 1 1 0 +
        // min-height: 0 + overflow: hidden, damit das Grid bei wenig Platz
        // schrumpft und Sieger-Card unten sichtbar bleibt.
        flex: '1 1 0', minHeight: 0, overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 'clamp(10px, 1.4cqh, 18px)',
        maxWidth: cols === 3 ? 1500 : cols === 2 ? 1200 : 900,
        width: '100%', margin: '0 auto',
        position: 'relative', zIndex: 5,
        animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.15s both',
      }}>
        {opts.map((opt, i) => {
          const isReal = opt.source === 'real';
          const voters = votersByOption[opt.id] ?? [];
          const contribIds = opt.source === 'team' ? opt.contributors : [];
          const authorTeam = !isReal && contribIds[0]
            ? s.teams.find(t => t.id === contribIds[0])
            : null;
          const extraAuthors = !isReal && contribIds.length > 1
            ? contribIds.length - 1
            : 0;
          const cardColor = isReal ? '#22C55E' : (authorTeam?.color ?? '#64748b');
          return (
            <div key={opt.id} style={{
              position: 'relative',
              overflow: 'hidden',
              padding: 'clamp(12px, 1.6cqh, 22px) clamp(16px, 2cqw, 28px)',
              borderRadius: 18,
              background: isReal
                ? `linear-gradient(135deg, ${cardColor}33 0%, ${cardColor}10 100%)`
                : `linear-gradient(135deg, ${cardColor}3a 0%, ${cardColor}10 100%)`,
              border: `2px solid ${cardColor}${isReal ? 'cc' : '99'}`,
              boxShadow: isReal
                ? `0 0 28px ${cardColor}33, 0 6px 16px rgba(0,0,0,0.4)`
                : `0 0 18px ${cardColor}28, 0 6px 14px rgba(0,0,0,0.4)`,
              display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 0.8cqh, 10px)',
              // 2026-05-05 (Wolf): minHeight reduziert (110-170 → 90-130) damit
              // leere Cards nicht so viel toten Platz unten haben — gewonnener
              // Raum geht an die Sieger-Card unten.
              minHeight: 'clamp(90px, 11cqh, 130px)',
              // 2026-05-07 (Audit P2): phasePop (scale-bounce) skalierte den
              // Watermark-Avatar mit, der schon halbtransparent ist und den
              // doppelten Bounce sichtbar machte. contentReveal (sanftes Slide+
              // Fade) ist jetzt quizweit konsistent (siehe OnlyConnect-Hints,
              // Wolf-Entscheidung 2026-05-06).
              animation: `contentReveal 0.55s var(--qq-ease-out-cubic) ${0.3 + i * 0.08}s both`,
            }}>
              {/* Author-Avatar als BG-Watermark — gross, halbtransparent, hinter
                  dem ganzen Card-Inhalt. Gibt das „Owner-Stempel"-Feeling. */}
              {!isReal && authorTeam && (
                // 2026-05-05 (Wolf-Polish 'emoji groesse + transparenz anpassen'):
                // 14cqw → 17cqw (groesser), opacity 0.18 → 0.14 (dezenter), blur
                // 1.5 → 0.5 (klarer aber durch opacity weiter im BG).
                <div aria-hidden style={{
                  position: 'absolute',
                  right: 'clamp(-16px, -2cqw, -36px)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 'clamp(150px, 17cqw, 240px)',
                  height: 'clamp(150px, 17cqw, 240px)',
                  opacity: 0.14,
                  filter: 'blur(0.5px)',
                  pointerEvents: 'none',
                  zIndex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <QQTeamAvatar avatarId={authorTeam.avatarId} teamEmoji={authorTeam.emoji} size="100%" flat />
                </div>
              )}

              {/* Top-Row: Letter + Antwort + Pille */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.2cqw, 16px)',
                position: 'relative', zIndex: 2,
              }}>
                <span style={{
                  width: 'clamp(28px, 3cqw, 38px)', height: 'clamp(28px, 3cqw, 38px)',
                  borderRadius: '50%',
                  background: cardColor,
                  color: '#0a1f0d',
                  fontSize: 'clamp(13px, 1.4cqw, 18px)', fontWeight: 900,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                }}>{String.fromCharCode(65 + i)}</span>

                <span style={{
                  flex: 1, minWidth: 0,
                  fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 900,
                  color: isReal ? '#86efac' : '#F8FAFC',
                  wordBreak: 'break-word', lineHeight: 1.18,
                  textShadow: isReal
                    ? '0 0 14px rgba(34,197,94,0.4)'
                    : '0 1px 3px rgba(0,0,0,0.5)',
                }}>{opt.text}</span>

                {isReal ? (
                  <span style={{
                    padding: '4px 12px', borderRadius: 999,
                    background: 'rgba(34,197,94,0.3)', border: '1.5px solid #22C55E',
                    fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 900, color: '#86EFAC',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    ✓ {lang === 'de' ? 'echt' : 'real'}
                  </span>
                ) : authorTeam ? (
                  <span style={{
                    padding: '4px 12px', borderRadius: 999,
                    background: `${authorTeam.color}28`, border: `1.5px solid ${authorTeam.color}aa`,
                    fontSize: 'clamp(10px, 1.05cqw, 13px)', fontWeight: 900, color: authorTeam.color,
                    whiteSpace: 'nowrap', flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    maxWidth: '60%',
                  }}>
                    <QQEmojiIcon emoji="🎭"/>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {authorTeam.name}{extraAuthors > 0 ? ` +${extraAuthors}` : ''}
                    </span>
                  </span>
                ) : null}
              </div>

              {/* Bottom-Row: Voter-Avatare die diese Antwort gewählt haben.
                  Reservierte Höhe damit Cards ohne Voters genauso hoch sind.
                  2026-05-06 v3 (Wolf 'avatare immernoch mini'): minHeight an
                  70-110px Avatar-Groesse angepasst. */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.1cqw, 18px)',
                flexWrap: 'wrap',
                position: 'relative', zIndex: 2,
                paddingTop: voters.length > 0 ? 'clamp(6px, 0.8cqh, 10px)' : 0,
                borderTop: voters.length > 0 ? '1px dashed rgba(255,255,255,0.16)' : 'none',
                minHeight: 'clamp(76px, 7.5cqw, 116px)',
              }}>
                {voters.length > 0 ? (
                  <>
                    <span style={{
                      // 2026-05-05 (Wolf 'Wählten/keine Stimmen etwas groesser'):
                      // 10-12px → 14-19px. Aus Pub-Distanz lesbar.
                      fontSize: 'clamp(14px, 1.4cqw, 19px)', fontWeight: 900,
                      color: '#cbd5e1', letterSpacing: '0.08em', textTransform: 'uppercase',
                      marginRight: 6,
                    }}>
                      {lang === 'de' ? 'Wählten' : 'Voted'}
                    </span>
                    {voters.map((vid, vIdx) => {
                      const tm = s.teams.find(t => t.id === vid);
                      if (!tm) return null;
                      return (
                        <div key={vid} title={tm.name} style={{
                          position: 'relative',
                          animation: `phasePop 0.5s var(--qq-ease-bounce) ${0.45 + i * 0.08 + vIdx * 0.06}s both`,
                        }}>
                          {/* 2026-05-06 v3 (Wolf 'avatare auf den cards sind
                              immernoch mini auch nach 3 Bugfixes'): nochmal
                              deutlich groesser auf 70-110px. flex-wrap im
                              Parent erlaubt 2-Reihen-Layout bei vielen Voters. */}
                          <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(70px, 7cqw, 110px)'} style={{
                            boxShadow: isReal
                              ? `0 0 0 3px #22C55E, 0 0 22px rgba(34,197,94,0.6)`
                              : `0 0 0 2.5px ${tm.color}, 0 0 18px ${tm.color}77`,
                            opacity: 0.95,
                          }} />
                          {isReal && (
                            <span aria-hidden style={{
                              position: 'absolute', top: -5, right: -5,
                              width: 18, height: 18, borderRadius: '50%',
                              background: '#22C55E', border: '2px solid #0A0814',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 900, color: '#fff', lineHeight: 1,
                            }}>✓</span>
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <span style={{
                    // 2026-05-05 (Wolf): 10-12px → 14-18px.
                    fontSize: 'clamp(14px, 1.3cqw, 18px)', fontWeight: 700,
                    color: 'rgba(148,163,184,0.55)', letterSpacing: '0.06em',
                    fontStyle: 'italic',
                  }}>
                    {lang === 'de' ? 'keine Stimmen' : 'no votes'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Vote-Phase (nicht-revealed): bleibt beim alten Grid-Layout.
  const cols = opts.length >= 6 ? 3 : opts.length >= 4 ? 2 : 1;
  return (
    <div style={{
      flex: 1, display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 'clamp(8px, 1cqw, 14px)',
      maxWidth: cols === 3 ? 1400 : 1100, width: '100%', margin: '0 auto',
      position: 'relative', zIndex: 5,
      animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.15s both',
    }}>
      {opts.map((opt, i) => {
        const voters = votersByOption[opt.id] ?? [];
        return (
          <div key={opt.id} style={{
            padding: 'clamp(12px, 1.4cqh, 18px) clamp(14px, 1.6cqw, 22px)',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px solid rgba(255,255,255,0.10)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                color: '#94a3b8',
                fontSize: 13, fontWeight: 900,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{String.fromCharCode(65 + i)}</span>
              <span style={{
                flex: 1, fontSize: 'clamp(18px, 2cqw, 28px)', fontWeight: 900,
                color: '#F1F5F9', wordBreak: 'break-word',
              }}>{opt.text}</span>
            </div>
            {voters.length > 0 && (
              <div style={{
                fontSize: 11, fontWeight: 900, color: '#94a3b8',
                letterSpacing: '0.04em',
              }}>
                {voters.length} {lang === 'de' ? 'Stimme(n)' : 'vote(s)'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 2026-05-09 v2 (Wolf-Reform): Connect 4 — alle 4 Hints sofort sichtbar,
// 1 Tipp pro Team, Reveal mit Lösung + Winner-Card wie CHEESE.
function OnlyConnectBeamerView({ state: s, lang, revealed }: {
  state: QQStateUpdate; lang: 'de' | 'en'; revealed: boolean;
}) {
  const q = s.currentQuestion!;
  const bt = q.bunteTuete as import('../../../shared/quarterQuizTypes').QQBunteTueteOnlyConnect;
  const hintsAll = (lang === 'en' && bt.hintsEn?.length === 4 ? bt.hintsEn : bt.hints) ?? [];
  const answer = formatRevealedAnswer(lang, bt.answer, bt.answerEn);
  const lockedSet = new Set(s.onlyConnectLockedTeams ?? []);
  const accent = '#F87171';
  // 2026-05-09 v2: alle Hints sofort sichtbar; correctSorted nach submittedAt
  // (= Speed) — Reihenfolge der Action-Vergabe analog Standard-Mechaniken.
  const correctSorted = (s.onlyConnectGuesses ?? [])
    .filter(g => g.correct)
    .slice()
    .sort((a, b) => a.submittedAt - b.submittedAt);
  const winnerSet = new Set(s.currentQuestionWinners ?? []);

  // 2026-05-09 v2: Reveal-Choreo CHEESE-style — Lösung-Card slammt zuerst (0.4s),
  // dann Winner-Cards gestaffelt (0.85s + 0.18s pro Team). Sound entsprechend.
  const SOLUTION_DELAY = 0.4;
  const WINNER_BASE = 0.85;
  const WINNER_STEP = 0.18;
  useEffect(() => {
    if (!revealed || s.sfxMuted) return;
    const handles: number[] = [];
    const cascadeTotal = Math.max(2, correctSorted.length + 1);
    handles.push(window.setTimeout(() => {
      try { playRevealHighlight(); } catch {}
    }, Math.max(0, SOLUTION_DELAY * 1000 - 60)));
    correctSorted.forEach((_g, idx) => {
      const delayMs = (WINNER_BASE + idx * WINNER_STEP) * 1000 - 60;
      handles.push(window.setTimeout(() => {
        try { playAvatarCascadeNote(idx + 1, cascadeTotal); } catch {}
      }, Math.max(0, delayMs)));
    });
    return () => handles.forEach(h => window.clearTimeout(h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, correctSorted.length, s.sfxMuted]);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(14px, 2cqh, 24px)',
      padding: 'clamp(20px, 2.5cqh, 36px) clamp(24px, 3cqw, 48px) clamp(16px, 2cqh, 28px)',
      position: 'relative',
    }}>
      <Fireflies color={`${accent}55`} />

      {/* Header — Pille links, Timer rechts (Wolf 2026-05-04: Hinweis-Counter
          umgezogen ueber die Frage, Timer war vorher gar nicht sichtbar). */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 16, position: 'relative', zIndex: 5,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '8px 22px', borderRadius: 999,
          background: `${accent}22`, border: `2px solid ${accent}44`,
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          animation: 'contentReveal 0.35s var(--qq-ease-pop-fast) both',
        }}>
          <span style={{ fontSize: 'clamp(20px, 2.2cqw, 30px)', lineHeight: 1 }}>🧩</span>
          <span style={{
            fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900,
            color: accent, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>{lang === 'de' ? '4 gewinnt' : 'Connect 4'}</span>
        </div>
        {/* 2026-05-06 (Konsistenz-Audit S2#4): 'Auflösung'-Pille entfernt —
            keine andere Standard-Kategorie zeigt sie, der Reveal-Modus
            ist eh durch Avatar-Cascade + Lösung-Card visuell klar. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!revealed && s.timerEndsAt && (
            <BeamerTimer endsAt={s.timerEndsAt} durationSec={s.timerDurationSec} accent={accent} />
          )}
        </div>
      </div>

      {/* Frage oben mittig */}
      <div style={{
        textAlign: 'center', position: 'relative', zIndex: 5,
        animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.1s both',
      }}>
        <div style={{
          fontSize: 'clamp(26px, 3cqw, 44px)', fontWeight: 900,
          color: '#F1F5F9', lineHeight: 1.2, maxWidth: 1400, margin: '0 auto',
        }}>
          {lang === 'en' && q.textEn ? q.textEn : (q.text || (lang === 'de' ? 'Was verbindet diese Hinweise?' : 'What connects these clues?'))}
        </div>
      </div>

      {/* 2026-05-09 v2 (Wolf-Reform): 2×2 Hint-Grid mittig zentriert. Alle 4
          Hints sofort sichtbar (kein progressives Reveal, keine Avatare auf
          Hints). Im Reveal-Modus stays the grid sichtbar als Kontext, Lösung
          + Winner-Card kommen darunter. */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 5,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, minmax(280px, 1fr))',
          gap: 'clamp(14px, 1.8cqw, 28px)',
          maxWidth: 1100, width: '100%',
        }}>
          {[0, 1, 2, 3].map(i => {
            const hintText = hintsAll[i] ?? `Hinweis ${i + 1}`;
            const hintColor = i === 0 ? '#EC4899' : i === 1 ? '#22C55E' : i === 2 ? '#60A5FA' : '#A78BFA';
            return (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 'clamp(20px, 3cqh, 36px) clamp(20px, 2cqw, 32px)',
                borderRadius: 18,
                background: `linear-gradient(180deg, ${hintColor}28, ${hintColor}10)`,
                border: `2px solid ${hintColor}88`,
                boxShadow: `0 0 18px ${hintColor}33`,
                minHeight: 'clamp(120px, 16cqh, 180px)',
                textAlign: 'center', gap: 10,
                animation: `contentReveal 0.5s var(--qq-ease-out-cubic) ${0.15 + i * 0.10}s both`,
              }}>
                <div style={{
                  fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 900,
                  color: hintColor,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>{lang === 'de' ? `Hinweis ${i + 1}` : `Clue ${i + 1}`}</div>
                <div style={{
                  fontSize: 'clamp(24px, 2.8cqw, 44px)', fontWeight: 900,
                  color: '#F1F5F9', lineHeight: 1.15,
                }}>{hintText}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reveal: ZWEI getrennte Cards nebeneinander.
          2026-05-06 (Wolf 'lösungscard und gewinnercard trennen — lösungscard
          grün umrandet wie sonst auch, gewinnercard in der Farbe des Gewinners
          → vollständig konsistent mit Rest der App'):
          Vorher 1× zusammengelegte Gold-Card (Lösung+Sieger). Jetzt:
          - Lösungs-Card: grün umrandet + grüner Glow (analog MUCHO/ZvZ-
            Lock-Step-Highlight wo die korrekte Option grün wird).
          - Sieger-Card: in der Farbe des Gewinner-Teams.
          Beide Cards bleiben im Question-Mode mit visibility:hidden gerendert,
          damit der Layout-Space reserviert ist (kein Sprung beim Reveal). */}
      {(() => {
        // 2026-05-09 v2: Winner-Order = correctSorted (= submitted-time-order),
        // gefiltert auf winnerSet (Backend-Truth). Speed = Reihenfolge.
        const orderedWinnerIds = correctSorted
          .map(g => g.teamId)
          .filter(id => winnerSet.has(id));
        const winnerTeams = revealed
          ? orderedWinnerIds
              .map(id => s.teams.find(t => t.id === id))
              .filter((t): t is NonNullable<typeof t> => !!t)
          : [];
        const primaryWinner = winnerTeams[0] ?? null;
        const winnerColor = primaryWinner?.color ?? '#EC4899';
        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: winnerTeams.length > 0 ? '1fr 1fr' : '1fr',
            gap: 'clamp(12px, 1.6cqw, 22px)',
            position: 'relative', zIndex: 5,
            alignItems: 'stretch',
            visibility: revealed ? 'visible' : 'hidden',
            opacity: revealed ? 1 : 0,
            transition: 'opacity 0.5s ease 0.15s',
          }}>
            {/* Lösungs-Card — grün umrandet (analog Lock-Step-Highlight in
                MUCHO/ZvZ wo die korrekte Option grün wird). */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(16px, 2cqh, 28px)',
              borderRadius: 24,
              minHeight: 'clamp(140px, 18cqh, 220px)',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.05))',
              border: '2.5px solid rgba(34,197,94,0.55)',
              boxShadow: '0 0 40px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
              animation: revealed ? `revealAnswerBam 0.6s var(--qq-ease-out-cubic) ${SOLUTION_DELAY}s both` : undefined,
            }}>
              <div style={{
                fontSize: 'clamp(36px, 4.4cqw, 72px)', fontWeight: 900,
                color: '#86efac', textShadow: '0 0 30px rgba(34,197,94,0.45)',
                textAlign: 'center', lineHeight: 1.1,
              }}>
                {answer}
              </div>
            </div>

            {/* Sieger-Card — kompakter Stil analog CHEESE/MUCHO/ZvZ:
                nur Avatare nebeneinander mit Zeit-Pill darunter, KEINE Team-
                Namen. Schnellster bekommt Pink-Gold-Ring.
                2026-05-09 v3 (Wolf-Bug 'connect 4 winnercard viiiel zu groß +
                unten abgeschnitten'): vorher Avatar+Team-Name horizontal mit
                flexWrap auf mehrere Zeilen → Card konnte höher als Container
                wachsen. Jetzt fix kompakte Höhe wie Lösung-Card. */}
            {winnerTeams.length > 0 && (() => {
              // t0 = Question-Start, berechnet aus timer (oder Fallback erste Submission)
              const t0 = s.timerEndsAt && s.timerDurationSec
                ? s.timerEndsAt - s.timerDurationSec * 1000
                : correctSorted[0]?.submittedAt ?? null;
              const guessByTeam = new Map(correctSorted.map(g => [g.teamId, g]));
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 'clamp(14px, 1.8cqw, 28px)', flexWrap: 'wrap',
                  padding: 'clamp(16px, 2cqh, 28px)',
                  borderRadius: 24,
                  minHeight: 'clamp(140px, 18cqh, 220px)',
                  background: `linear-gradient(135deg, ${winnerColor}26, ${winnerColor}08)`,
                  border: `2.5px solid ${winnerColor}aa`,
                  boxShadow: `0 0 40px ${winnerColor}55, inset 0 1px 0 rgba(255,255,255,0.05)`,
                  animation: revealed ? `revealAnswerBam 0.6s var(--qq-ease-out-cubic) ${SOLUTION_DELAY + 0.15}s both` : undefined,
                }}>
                  {winnerTeams.map((tm, idx) => {
                    const guess = guessByTeam.get(tm.id);
                    const timeSec = t0 != null && guess
                      ? Math.max(0, (guess.submittedAt - t0) / 1000)
                      : null;
                    const isFastest = idx === 0;
                    const avatarSize = isFastest
                      ? 'clamp(72px, 7.5cqw, 104px)'
                      : 'clamp(60px, 6.4cqw, 88px)';
                    return (
                      <div key={tm.id} style={{
                        position: 'relative',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        // 2026-05-13 (Wolf 'man hoert sound aber keine action dazu'):
                        // phasePop (Scale 0.94→1, sehr subtil) → revealWinnerIn
                        // (translateY 30→0 + Scale 0.9→1.02→1, bouncy, dramatisch).
                        // Cascade-Sound (Pentatonik-Note) trifft jetzt auf sichtbaren
                        // Pop-In statt nur dezenten FadeIn.
                        animation: `revealWinnerIn 0.6s var(--qq-ease-bounce) ${WINNER_BASE + idx * WINNER_STEP}s both`,
                      }}>
                        <QQTeamAvatar
                          avatarId={tm.avatarId} teamEmoji={tm.emoji}
                          size={avatarSize}
                          style={{
                            border: isFastest ? '4px solid #EC4899' : 'none',
                            boxShadow: isFastest
                              ? `0 0 0 3px ${tm.color}, 0 0 22px rgba(236,72,153,0.6), 0 6px 14px rgba(0,0,0,0.55)`
                              : `0 0 0 3px ${tm.color}, 0 0 14px ${tm.color}88, 0 6px 14px rgba(0,0,0,0.55)`,
                            background: '#0A0814',
                            flexShrink: 0,
                          }}
                        />
                        {timeSec != null && (
                          <span style={{
                            position: 'absolute',
                            left: '50%', bottom: -8,
                            transform: 'translate(-50%, 50%)',
                            padding: '3px 11px', borderRadius: 999,
                            background: isFastest ? 'rgba(236,72,153,0.95)' : 'rgba(15,23,42,0.95)',
                            border: isFastest ? '1.5px solid rgba(236,72,153,1)' : `1.5px solid ${tm.color}`,
                            color: isFastest ? '#0A0814' : '#e2e8f0',
                            fontWeight: 900,
                            fontSize: 'clamp(12px, 1.3cqw, 17px)',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                            lineHeight: 1.1,
                          }}>
                            {timeSec.toFixed(1)}s
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* Team-Status-Reihe (analog CHEESE/4×4) — NUR im Active-Pfad zeigen.
          Wolf 2026-05-05: beim Reveal ausgeblendet, da locked/X-Teams öffentlich
          ausgestellt wurden (Anti-Public-Shaming). Sieger sind im Reveal-Card
          oben rechts; auf welchem Hinweis sie es hatten siehst du an den
          Hint-Cards mit Gold-Ring. */}
      {/* 2026-05-09 v2 (Wolf-Reform): Submit-Status-Reihe — pre-reveal pro Team
          Avatar mit grünem Glow wenn submitted (Bluff-Pattern, konsistent zum
          Rest). Anti-Spoiler-Bedenken weggefallen (Wolf 2026-05-17: alle 4
          Hinweise gleichzeitig sichtbar). */}
      {!revealed && (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 'clamp(10px, 1.6cqw, 22px)', flexWrap: 'wrap',
        position: 'relative', zIndex: 5,
        animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) 0.2s both',
      }}>
        {s.teams.map((tm) => {
          const isLocked = lockedSet.has(tm.id);
          const isWinner = winnerSet.has(tm.id);
          const hasSubmitted = isLocked || isWinner;
          return (
            <div key={tm.id} title={tm.name} style={{
              position: 'relative',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              opacity: hasSubmitted ? 1 : 0.55,
              filter: hasSubmitted
                ? 'drop-shadow(0 0 10px rgba(34,197,94,0.55)) drop-shadow(0 0 3px rgba(34,197,94,0.4))'
                : 'grayscale(0.4)',
              transition: 'opacity 0.4s ease, filter 0.4s ease',
            }}>
              <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(48px, 5cqw, 72px)'} style={{
                background: '#0A0814',
                boxShadow: hasSubmitted
                  ? `0 0 0 3px #22C55E, 0 4px 10px rgba(0,0,0,0.55)`
                  : `0 0 0 2px ${tm.color}55, 0 4px 10px rgba(0,0,0,0.55)`,
                transition: 'box-shadow 0.45s ease',
              }} />
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

/**
 * Top-5 Reveal: zweispaltige Show-Seite.
 * Links: Frage + Gewinner-Block. Rechts: Top-5-Liste die sequentiell 5→1 aufdeckt.
 * Nach jeder Antwort erscheinen Avatare (oder X-Kreis wenn niemand) mit Pop-Animation.
 */
function Top5Reveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const btt = q.bunteTuete as any;
  const correctListDE: string[] = (btt.answers ?? []).map((x: string) => x.trim()).filter(Boolean);
  const correctListEN: string[] = (btt.answersEn ?? []).map((x: string) => x.trim()).filter(Boolean);
  const correctList = lang === 'en' && correctListEN.length ? correctListEN : correctListDE;
  const n = correctList.length;

  // 2026-05-02: Backend-Truth via top5HitsByTeam. Backend matched mit
  // similarityScore>=0.8 (fuzzy). Frontend hat jetzt nur noch Anzeige-Logik,
  // keine eigene Match-Logik mehr. Backend's correctAll = correctDE.concat(correctEN);
  // Index ci -> DE-Slot, ci+correctDE.length -> EN-Slot.
  const hitsByTeam = s.top5HitsByTeam ?? {};

  // perAnswer in Original-Reihenfolge (Platz 1 = Index 0).
  const perAnswer = useMemo(() => {
    return correctList.map((correct, ci) => {
      const deIdx = ci;
      const enIdx = ci + correctListDE.length;
      const hitters = s.answers
        .filter(a => {
          const teamHits = hitsByTeam[a.teamId] ?? [];
          return teamHits.includes(deIdx) || teamHits.includes(enIdx);
        })
        .map(a => s.teams.find(t => t.id === a.teamId))
        .filter((t): t is NonNullable<typeof t> => !!t);
      return { correct, hitters };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answers, s.teams, correctList, correctListDE.length, JSON.stringify(hitsByTeam)]);

  // Treffer pro Team — für Winner-Block. Aus Backend-Hits.
  const teamScore = useMemo(() => {
    return s.answers.map(a => ({
      teamId: a.teamId,
      hits: (hitsByTeam[a.teamId] ?? []).length,
    })).sort((x, y) => y.hits - x.hits);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answers, JSON.stringify(hitsByTeam)]);

  const topHits = teamScore[0]?.hits ?? 0;
  const winners = teamScore.filter(t => t.hits === topHits && topHits > 0);

  // Sequentielles Reveal: Start mit -1 (noch nichts), dann 5, 4, 3, 2, 1 (Indizes: n-1 … 0).
  // 2026-05-03 (Wolf-Bug 'Cascade-Sound aber alle Avatare gleichzeitig'):
  // Race-Condition fix — siehe Schaetzchen. cascadeStartedRef verhindert
  // Re-Run bei n-Aenderung waehrend laufender Cascade.
  const [revealedMinIdx, setRevealedMinIdx] = useState<number>(n);
  const cascadeStartedRef = useRef(false);
  const STEP_MS = 2400;
  const INITIAL_DELAY_MS = 600;

  useEffect(() => {
    if (cascadeStartedRef.current || n === 0) return;
    cascadeStartedRef.current = true;
    setRevealedMinIdx(n);
    const timers: ReturnType<typeof setTimeout>[] = [];
    // 2026-05-13 (Wolf 'sound cascaden nicht passend zu gesetzten avataren') —
    // Top5-Fix: Sound nur fuer Rows MIT Hittern. Vorher 5 Toene immer, auch
    // wenn nur 2 Rows Avatar-Drops hatten → Audio/Visual-Drift. hitOrderMap
    // mapped jeden Cascade-Step auf den Hit-Order-Index (oder -1 fuer leere).
    let hitAccum = 0;
    const hitOrderMap: number[] = new Array(n);
    for (let j = 0; j < n; j++) {
      const tIdx = n - 1 - j;
      const hasHit = (perAnswer[tIdx]?.hitters.length ?? 0) > 0;
      hitOrderMap[j] = hasHit ? hitAccum++ : -1;
    }
    const totalHits = hitAccum;
    const cascadeTotal = totalHits + 1;
    for (let i = 0; i < n; i++) {
      const targetIdx = n - 1 - i;
      const hitOrder = hitOrderMap[i];
      const hasHitters = hitOrder >= 0;
      const isLastHit = hasHitters && hitOrder === totalHits - 1;
      const t = setTimeout(() => {
        setRevealedMinIdx(targetIdx);
        if (!s.sfxMuted && hasHitters) {
          try { playAvatarCascadeNote(hitOrder, cascadeTotal); } catch {}
          if (isLastHit) {
            try { playRevealHighlight(); } catch {}
          }
        }
      }, INITIAL_DELAY_MS + i * STEP_MS);
      timers.push(t);
    }
    return () => { timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(14px, 1.8cqh, 22px)',
      padding: 'clamp(16px, 2cqh, 28px) clamp(20px, 3cqw, 48px) clamp(54px, 7cqh, 80px)',
      animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) both',
      minHeight: 0,
    }}>
      {/* ── Top row: Full-width question card ─────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '2px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: 'clamp(16px, 2cqh, 26px) clamp(24px, 2.8cqw, 42px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: 'bQuestionIn 0.5s var(--qq-ease-bounce) both',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 900, color: '#EC4899',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          🎁 {lang === 'en' ? 'Top 5 — Reveal' : 'Top 5 — Auflösung'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 120 ? 'clamp(26px, 2.7cqw, 40px)' : 'clamp(30px, 3.2cqw, 52px)',
          fontWeight: 900, lineHeight: 1.18, color: '#F1F5F9',
          animation: 'langFadeIn 0.4s ease both',
        }}>
          {qText}
        </div>
      </div>

      {/* ── Bottom row: Winners (left) + Top-5 list (right) ───── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)',
        gap: 'clamp(16px, 2.5cqw, 36px)',
        minHeight: 0,
      }}>
        {/* Winner card — Team-Farben-Frame bei Einzelsieger, Gold bei mehreren. */}
        {(() => {
          const singleColor = winners.length === 1
            ? s.teams.find(t => t.id === winners[0].teamId)?.color ?? null
            : null;
          const cardBgGrad = winners.length === 0
            ? 'transparent'
            : singleColor
              ? `linear-gradient(135deg, ${singleColor}1f, ${singleColor}07)`
              : 'linear-gradient(135deg, rgba(236,72,153,0.14), rgba(236,72,153,0.04))';
          const cardBorder = winners.length === 0
            ? 'none'
            : singleColor
              ? `3px solid ${singleColor}88`
              : '3px solid rgba(236,72,153,0.55)';
          const cardShadow = winners.length === 0
            ? 'none'
            : singleColor
              ? `0 0 48px ${singleColor}33, 0 8px 24px rgba(0,0,0,0.4)`
              : '0 0 48px rgba(236,72,153,0.22), 0 8px 24px rgba(0,0,0,0.4)';
          return (
        <div style={{
          height: '100%',
          background: cardBgGrad,
          border: cardBorder,
          borderRadius: 24,
          padding: 'clamp(18px, 2.4cqh, 32px) clamp(14px, 1.8cqw, 28px)',
          boxShadow: cardShadow,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 14, minHeight: 0,
          opacity: revealedMinIdx === 0 ? 1 : 0.12,
          filter: revealedMinIdx === 0 ? 'none' : 'blur(18px) saturate(0.4)',
          transition: 'opacity 0.7s ease, filter 0.7s ease',
        }}>
          <div style={{
            fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 900, color: '#94a3b8',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            <QQEmojiIcon emoji="🏆"/> {winners.length > 1
              ? (lang === 'en' ? 'Round winners' : 'Rundensieger')
              : (lang === 'en' ? 'Round winner' : 'Rundensieger')}
          </div>
          {winners.length === 0 ? (
            <div style={{ fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 900, color: '#f87171' }}>
              {lang === 'en' ? 'Nobody scored.' : 'Niemand hat getroffen.'}
            </div>
          ) : (() => {
            // Skaliere Größen je nach Anzahl Sieger — wenig Sieger = deutlich größer.
            const wn = winners.length;
            // Ab 5 Siegern 2 Spalten (4-4 bei 8) damit unten nichts abgeschnitten wird
            const twoCol = wn >= 5;
            const avatarSize =
              wn === 1 ? 'clamp(130px, 14cqw, 210px)'
              : wn === 2 ? 'clamp(112px, 11.5cqw, 172px)'
              : wn === 3 ? 'clamp(96px, 9.8cqw, 144px)'
              : wn === 4 ? 'clamp(84px, 8.6cqw, 124px)'
              : wn <= 6 ? 'clamp(70px, 6.4cqw, 100px)'
              : 'clamp(64px, 5.8cqw, 92px)';
            const nameSize =
              wn === 1 ? 'clamp(40px, 4.6cqw, 76px)'
              : wn === 2 ? 'clamp(34px, 3.8cqw, 60px)'
              : wn === 3 ? 'clamp(30px, 3.4cqw, 52px)'
              : wn === 4 ? 'clamp(26px, 3cqw, 44px)'
              : wn <= 6 ? 'clamp(20px, 2.1cqw, 30px)'
              : 'clamp(18px, 1.95cqw, 28px)';
            const subSize =
              wn === 1 ? 'clamp(18px, 1.9cqw, 30px)'
              : wn === 2 ? 'clamp(16px, 1.7cqw, 26px)'
              : wn === 3 ? 'clamp(15px, 1.6cqw, 24px)'
              : wn === 4 ? 'clamp(14px, 1.5cqw, 22px)'
              : 'clamp(12px, 1.3cqw, 18px)';
            const rowGap = wn <= 2 ? 18 : wn === 3 ? 14 : wn === 4 ? 12 : 10;
            const itemGap = wn <= 2 ? 20 : wn === 3 ? 18 : wn === 4 ? 16 : twoCol ? 10 : 14;
            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr',
                gap: twoCol ? `${rowGap}px 18px` : `${rowGap}px`,
                minHeight: 0, overflow: 'hidden',
              }}>
                {winners.map(w => {
                  const tm = s.teams.find(t => t.id === w.teamId);
                  if (!tm) return null;
                  return (
                    <div key={tm.id} style={{
                      display: 'flex', alignItems: 'center', gap: itemGap, minWidth: 0,
                      animation: revealedMinIdx === 0 ? 'revealWinnerIn 0.6s var(--qq-ease-bounce) 0.2s both' : 'none',
                    }}>
                      <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={avatarSize} style={{
                        flexShrink: 0,
                        animation: revealedMinIdx === 0 ? 'celebShake 0.6s ease 0.6s both' : 'none',
                      }} />
                      <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                        <TeamNameLabel
                          name={tm.name}
                          maxLines={2}
                          shrinkAfter={14}
                          fontSize={nameSize}
                          color={tm.color}
                          fontWeight={900}
                          style={{ lineHeight: 1.1 }}
                        />
                        <div style={{
                          fontSize: subSize, fontWeight: 900, color: '#cbd5e1', marginTop: 2,
                        }}>
                          {w.hits}/{n} {lang === 'en' ? 'correct' : 'richtig'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
          );
        })()}

      {/* ── Right column: Top-5 List (bottom-up reveal, fills column) ─────── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2cqh, 14px)',
        justifyContent: 'space-between',
        minHeight: 0, height: '100%',
      }}>
        {perAnswer.map(({ correct, hitters }, idx) => {
          const rank = idx + 1;
          const isVisible = idx >= revealedMinIdx;
          const hasHits = hitters.length > 0;
          // 2026-05-07 (Audit P1): Pro Reihe Stagger-Delay, damit bei schnellem
          // Mod-Klick (mehrere Reihen flippen synchron isVisible=true) die
          // Reihen kaskadieren statt synchron zu poppen. Bottom-up Reveal:
          // hoechster Index (rank 5) zuerst, niedrigster Index (rank 1) zuletzt.
          const rowDelay = (perAnswer.length - 1 - idx) * 0.18;
          const rankGradient = rank === 1
            ? 'linear-gradient(135deg,#EC4899,#EC4899)'
            : rank === 2
              ? 'linear-gradient(135deg,#E2E8F0,#94A3B8)'
              : rank === 3
                ? 'linear-gradient(135deg,#F97316,#B45309)'
                : 'linear-gradient(135deg,#475569,#334155)';
          return (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                alignItems: 'center',
                gap: 'clamp(10px, 1.2cqw, 18px)',
                padding: 'clamp(10px, 1.4cqh, 18px) clamp(14px, 1.6cqw, 22px)',
                borderRadius: 16,
                background: hasHits
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(22,163,74,0.06))'
                  : 'rgba(148,163,184,0.06)',
                border: hasHits
                  ? '2px solid rgba(34,197,94,0.4)'
                  : '2px solid rgba(148,163,184,0.15)',
                visibility: isVisible ? 'visible' : 'hidden',
                animation: isVisible
                  ? `top5RowSlideIn 0.55s var(--qq-ease-out-cubic) ${rowDelay}s both, top5RowGlow 1.2s ease ${0.3 + rowDelay}s both`
                  : 'none',
                flex: 1,
                minHeight: 'clamp(64px, 8cqh, 92px)',
              }}
            >
              {/* Rank badge */}
              <div style={{
                width: 'clamp(52px, 5cqw, 72px)', height: 'clamp(52px, 5cqw, 72px)',
                borderRadius: 16,
                background: rankGradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'clamp(24px, 2.8cqw, 40px)', fontWeight: 900, color: '#fff',
                flexShrink: 0,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                animation: isVisible ? `top5RankPop 0.55s var(--qq-ease-bounce) ${0.1 + rowDelay}s both` : 'none',
                boxShadow: rank === 1 ? '0 0 20px rgba(236,72,153,0.5)' : 'none',
              }}>
                #{rank}
              </div>

              {/* Answer text */}
              <div style={{
                fontSize: 'clamp(20px, 2.3cqw, 34px)', fontWeight: 900,
                color: hasHits ? '#86efac' : '#cbd5e1',
                lineHeight: 1.2,
                minWidth: 0, wordBreak: 'break-word',
              }}>
                {hasHits ? '✓ ' : ''}{correct}
              </div>

              {/* Hitters / No-hit X */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                flexShrink: 0,
              }}>
                {hasHits ? (
                  hitters.map((tm, hi) => (
                    <QQTeamAvatar
                      key={tm.id}
                      avatarId={tm.avatarId} teamEmoji={tm.emoji}
                      size={'clamp(52px, 5.4cqw, 78px)'}
                      title={tm.name}
                      style={{
                        boxShadow: `0 0 16px ${tm.color}55`,
                        animation: isVisible
                          ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) ${0.35 + hi * 0.09 + rowDelay}s both`
                          : 'none',
                      }}
                    />
                  ))
                ) : (
                  <div style={{
                    width: 'clamp(52px, 5.4cqw, 78px)', height: 'clamp(52px, 5.4cqw, 78px)',
                    borderRadius: '50%',
                    background: 'rgba(148,163,184,0.15)',
                    border: '2px dashed rgba(148,163,184,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'clamp(20px, 2.2cqw, 28px)', fontWeight: 900, color: '#94a3b8',
                    animation: isVisible
                      ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) ${0.35 + rowDelay}s both`
                      : 'none',
                  }}>
                    ✕
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OrderReveal — Bunte-Tüte "order" reveal, Top5-Style mit 2-Spalten-Layout
// ═══════════════════════════════════════════════════════════════════════════════
function OrderReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const btt = q.bunteTuete as any;
  const itemsDE: string[] = (btt.items ?? []) as string[];
  const itemsEN: string[] = (btt.itemsEn ?? []) as string[];
  const itemValues: string[] = (btt.itemValues ?? []) as string[];
  const correctOrder: number[] = (btt.correctOrder ?? []) as number[];
  const items = lang === 'en' && itemsEN.length ? itemsEN : itemsDE;
  const n = correctOrder.length;

  const criteriaTxt = lang === 'en' && btt.criteriaEn ? btt.criteriaEn : btt.criteria;

  // 2026-05-02: Backend-Truth via orderHitsByTeam (per-team boolean[] per
  // Position, similarityScore>=0.8 fuzzy matched). Frontend nutzt das direkt;
  // parseAnswers wird nur noch fuer den Item-Display benoetigt.
  const orderHits = s.orderHitsByTeam ?? {};
  const parsedAnswers = useMemo(() => {
    const deLc = itemsDE.map(s => (s ?? '').trim().toLowerCase());
    const enLc = itemsEN.map(s => (s ?? '').trim().toLowerCase());
    return s.answers.map(a => {
      const parts = String(a.text ?? '').split('|').map(p => p.trim()).filter(Boolean);
      const order: number[] = parts.map(p => {
        const asNum = Number(p);
        if (Number.isFinite(asNum) && asNum >= 0 && asNum < itemsDE.length) return asNum;
        const pLc = p.toLowerCase();
        const di = deLc.indexOf(pLc);
        if (di >= 0) return di;
        const ei = enLc.indexOf(pLc);
        if (ei >= 0) return ei;
        return -1;
      });
      return { teamId: a.teamId, order };
    });
  }, [s.answers, itemsDE, itemsEN]);

  // Pro Position: welche Teams haben hier richtig (Backend-Truth)?
  const perPosition = useMemo(() => {
    return correctOrder.map((correctIdx, posIdx) => {
      const hitters = s.answers
        .filter(a => (orderHits[a.teamId] ?? [])[posIdx] === true)
        .map(a => s.teams.find(t => t.id === a.teamId))
        .filter((t): t is NonNullable<typeof t> => !!t);
      return { correctIdx, hitters };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answers, correctOrder, s.teams, JSON.stringify(orderHits)]);

  // Treffer pro Team (Anzahl korrekter Positionen, Backend-Truth).
  const teamScore = useMemo(() => {
    return s.answers.map(a => ({
      teamId: a.teamId,
      hits: (orderHits[a.teamId] ?? []).filter(Boolean).length,
    })).sort((x, y) => y.hits - x.hits);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answers, JSON.stringify(orderHits)]);

  const topHits = teamScore[0]?.hits ?? 0;
  const winners = teamScore.filter(t => t.hits === topHits && topHits > 0);

  // 2026-05-03 (Wolf-Bug Cascade-Race): siehe Schaetzchen. Race-Fix.
  const [revealedMinIdx, setRevealedMinIdx] = useState<number>(n);
  const cascadeStartedRef = useRef(false);
  const STEP_MS = 2000;
  const INITIAL_DELAY_MS = 500;

  useEffect(() => {
    if (cascadeStartedRef.current || n === 0) return;
    cascadeStartedRef.current = true;
    setRevealedMinIdx(n);
    const timers: ReturnType<typeof setTimeout>[] = [];
    // 2026-05-13 (Wolf 'sound cascaden nicht passend') — Order-Fix analog zu
    // Top5: Sound nur fuer Positionen mit Hittern. Visual-Reveal-Stepping
    // (revealedMinIdx) bleibt ueber alle n Positionen, nur die Cascade-Notes
    // ueberspringen leere Reihen.
    let hitAccum = 0;
    const hitOrderMap: number[] = new Array(n);
    for (let j = 0; j < n; j++) {
      const tIdx = n - 1 - j;
      const hasHit = (perPosition[tIdx]?.hitters.length ?? 0) > 0;
      hitOrderMap[j] = hasHit ? hitAccum++ : -1;
    }
    const totalHits = hitAccum;
    const cascadeTotal = totalHits + 1;
    for (let i = 0; i < n; i++) {
      const targetIdx = n - 1 - i;
      const hitOrder = hitOrderMap[i];
      const hasHitters = hitOrder >= 0;
      const isLastHit = hasHitters && hitOrder === totalHits - 1;
      const t = setTimeout(() => {
        setRevealedMinIdx(targetIdx);
        if (!s.sfxMuted && hasHitters) {
          try { playAvatarCascadeNote(hitOrder, cascadeTotal); } catch {}
          if (isLastHit) {
            try { playRevealHighlight(); } catch {}
          }
        }
      }, INITIAL_DELAY_MS + i * STEP_MS);
      timers.push(t);
    }
    return () => { timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(14px, 1.8cqh, 22px)',
      padding: 'clamp(16px, 2cqh, 28px) clamp(20px, 3cqw, 48px) clamp(54px, 7cqh, 80px)',
      animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) both',
      minHeight: 0,
    }}>
      {/* ── Top: Frage ─────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '2px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: 'clamp(16px, 2cqh, 26px) clamp(24px, 2.8cqw, 42px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: 'bQuestionIn 0.5s var(--qq-ease-bounce) both',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 900, color: '#EC4899',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          🎁 {lang === 'en' ? 'Lucky Bag — Order' : 'Bunte Tüte — Reihenfolge'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 120 ? 'clamp(26px, 2.7cqw, 40px)' : 'clamp(30px, 3.2cqw, 52px)',
          fontWeight: 900, lineHeight: 1.18, color: '#F1F5F9',
          animation: 'langFadeIn 0.4s ease both',
        }}>
          {qText}
        </div>
        {criteriaTxt && (
          <div style={{
            marginTop: 8, fontSize: 'clamp(14px, 1.4cqw, 20px)', fontWeight: 700,
            color: '#FBCFE8', fontStyle: 'italic',
          }}>
            ↕ {criteriaTxt}
          </div>
        )}
      </div>

      {/* ── Mitte: Antwort-Liste full-width, von oben nach unten ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minHeight: 0,
      }}>
        {/* Antwort-Liste — bottom-up enthuellt */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2cqh, 14px)',
          justifyContent: 'space-between',
          minHeight: 0,
        }}>
          {perPosition.map(({ correctIdx, hitters }, idx) => {
            const rank = idx + 1;
            const isVisible = idx >= revealedMinIdx;
            const hasHits = hitters.length > 0;
            // 2026-05-07 (Audit P1): siehe Top5 — pro Reihe Stagger-Delay,
            // damit synchron-flippende Reihen kaskadieren statt synchron poppen.
            const rowDelay = (perPosition.length - 1 - idx) * 0.18;
            const rankGradient = rank === 1
              ? 'linear-gradient(135deg,#EC4899,#EC4899)'
              : rank === 2
                ? 'linear-gradient(135deg,#E2E8F0,#94A3B8)'
                : rank === 3
                  ? 'linear-gradient(135deg,#F97316,#B45309)'
                  : 'linear-gradient(135deg,#475569,#334155)';
            const itemText = items[correctIdx] ?? '';
            return (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  alignItems: 'center',
                  gap: 'clamp(10px, 1.2cqw, 18px)',
                  padding: 'clamp(10px, 1.4cqh, 18px) clamp(14px, 1.6cqw, 22px)',
                  borderRadius: 16,
                  background: hasHits
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(22,163,74,0.06))'
                    : 'rgba(148,163,184,0.06)',
                  border: hasHits
                    ? '2px solid rgba(34,197,94,0.4)'
                    : '2px solid rgba(148,163,184,0.15)',
                  visibility: isVisible ? 'visible' : 'hidden',
                  animation: isVisible
                    ? `top5RowSlideIn 0.55s var(--qq-ease-out-cubic) ${rowDelay}s both, top5RowGlow 1.2s ease ${0.3 + rowDelay}s both`
                    : 'none',
                  flex: 1,
                  minHeight: 'clamp(64px, 8cqh, 92px)',
                }}
              >
                <div style={{
                  width: 'clamp(52px, 5cqw, 72px)', height: 'clamp(52px, 5cqw, 72px)',
                  borderRadius: 16,
                  background: rankGradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(24px, 2.8cqw, 40px)', fontWeight: 900, color: '#fff',
                  flexShrink: 0,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  animation: isVisible ? `top5RankPop 0.55s var(--qq-ease-bounce) ${0.1 + rowDelay}s both` : 'none',
                  boxShadow: rank === 1 ? '0 0 20px rgba(236,72,153,0.5)' : 'none',
                }}>
                  #{rank}
                </div>

                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 'clamp(8px, 1cqw, 14px)',
                  flexWrap: 'wrap', minWidth: 0,
                }}>
                  <div style={{
                    fontSize: 'clamp(20px, 2.3cqw, 34px)', fontWeight: 900,
                    color: hasHits ? '#86efac' : '#cbd5e1',
                    lineHeight: 1.2,
                    minWidth: 0, wordBreak: 'break-word',
                  }}>
                    {hasHits ? '✓ ' : ''}{itemText}
                  </div>
                  {itemValues[correctIdx] && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '3px 12px', borderRadius: 999,
                      background: hasHits ? 'rgba(34,197,94,0.22)' : 'rgba(148,163,184,0.16)',
                      border: hasHits ? '1.5px solid rgba(34,197,94,0.55)' : '1.5px solid rgba(148,163,184,0.3)',
                      color: hasHits ? '#86efac' : '#cbd5e1',
                      fontWeight: 900,
                      fontSize: 'clamp(14px, 1.5cqw, 22px)',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {itemValues[correctIdx]}
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  flexShrink: 0,
                }}>
                  {hasHits ? (
                    hitters.map((tm, hi) => (
                      <QQTeamAvatar
                        key={tm.id}
                        avatarId={tm.avatarId} teamEmoji={tm.emoji}
                        size={'clamp(36px, 3.8cqw, 54px)'}
                        title={tm.name}
                        style={{
                          boxShadow: `0 0 14px ${tm.color}55`,
                          animation: isVisible
                            ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) ${0.35 + hi * 0.09 + rowDelay}s both`
                            : 'none',
                        }}
                      />
                    ))
                  ) : (
                    <div style={{
                      width: 'clamp(36px, 3.8cqw, 54px)', height: 'clamp(36px, 3.8cqw, 54px)',
                      borderRadius: '50%',
                      background: 'rgba(148,163,184,0.15)',
                      border: '2px dashed rgba(148,163,184,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'clamp(20px, 2.2cqw, 28px)', fontWeight: 900, color: '#94a3b8',
                      animation: isVisible
                        ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) ${0.35 + rowDelay}s both`
                        : 'none',
                    }}>
                      ✕
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sieger-Footer — horizontale Pill-Reihe, skaliert bis 8 Teams */}
        <div style={{
          marginTop: 'clamp(10px, 1.4cqh, 18px)',
          padding: 'clamp(10px, 1.4cqh, 16px) clamp(14px, 1.8cqw, 24px)',
          borderRadius: 16,
          background: winners.length > 0
            ? 'linear-gradient(135deg, rgba(236,72,153,0.10), rgba(236,72,153,0.04))'
            : 'rgba(148,163,184,0.06)',
          border: winners.length > 0
            ? '2px solid rgba(236,72,153,0.35)'
            : '2px solid rgba(148,163,184,0.15)',
          display: 'flex', alignItems: 'center',
          gap: 'clamp(12px, 1.6cqw, 22px)',
          flexShrink: 0, minHeight: 0,
          opacity: revealedMinIdx === 0 ? 1 : 0.18,
          filter: revealedMinIdx === 0 ? 'none' : 'blur(8px) saturate(0.4)',
          transition: 'opacity 0.6s ease, filter 0.6s ease',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 2,
            flexShrink: 0, minWidth: 0,
            paddingRight: 'clamp(8px, 1cqw, 16px)',
            borderRight: '2px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{
              fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 900, color: '#EC4899',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              <QQEmojiIcon emoji="🏆"/> {winners.length > 1
                ? (lang === 'en' ? 'Round winners' : 'Rundensieger')
                : (lang === 'en' ? 'Round winner' : 'Rundensieger')}
            </div>
            {winners.length > 0 && (
              <div style={{
                fontSize: 'clamp(13px, 1.2cqw, 18px)', fontWeight: 900, color: '#cbd5e1',
                whiteSpace: 'nowrap',
              }}>
                {winners[0].hits}/{n} {lang === 'en' ? 'correct' : 'richtig'}
              </div>
            )}
          </div>

          {winners.length === 0 ? (
            <div style={{
              fontSize: 'clamp(18px, 2cqw, 28px)', fontWeight: 900, color: '#f87171',
            }}>
              {lang === 'en' ? 'Nobody scored.' : 'Niemand hat getroffen.'}
            </div>
          ) : (() => {
            const wn = winners.length;
            // Avatar + Name als Pill, skaliert je nach Anzahl Sieger
            const avatarSize = wn <= 2 ? 'clamp(54px, 5.6cqw, 78px)'
              : wn <= 4 ? 'clamp(46px, 4.8cqw, 66px)'
              : wn <= 6 ? 'clamp(40px, 4.2cqw, 56px)'
              : 'clamp(36px, 3.8cqw, 50px)';
            const nameSize = wn <= 2 ? 'clamp(20px, 2.2cqw, 32px)'
              : wn <= 4 ? 'clamp(17px, 1.9cqw, 26px)'
              : wn <= 6 ? 'clamp(15px, 1.7cqw, 22px)'
              : 'clamp(14px, 1.5cqw, 19px)';
            const pillGap = wn <= 4 ? 'clamp(10px, 1.2cqw, 18px)' : 'clamp(8px, 0.9cqw, 12px)';
            return (
              <div style={{
                display: 'flex', alignItems: 'center', flexWrap: 'wrap',
                gap: pillGap,
                flex: 1, minWidth: 0,
              }}>
                {winners.map((w, wi) => {
                  const tm = s.teams.find(t => t.id === w.teamId);
                  if (!tm) return null;
                  return (
                    <div key={tm.id} style={{
                      display: 'flex', alignItems: 'center', gap: 'clamp(6px, 0.8cqw, 12px)',
                      padding: 'clamp(4px, 0.6cqh, 8px) clamp(10px, 1.1cqw, 16px) clamp(4px, 0.6cqh, 8px) clamp(4px, 0.5cqh, 6px)',
                      borderRadius: 999,
                      background: `linear-gradient(135deg, ${tm.color}26, ${tm.color}0a)`,
                      border: `2px solid ${tm.color}55`,
                      animation: revealedMinIdx === 0
                        ? `revealWinnerIn 0.55s var(--qq-ease-bounce) ${0.2 + wi * 0.08}s both`
                        : 'none',
                      minWidth: 0,
                    }}>
                      <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={avatarSize} style={{
                        flexShrink: 0,
                        boxShadow: `0 0 14px ${tm.color}55`,
                      }} />
                      <TeamNameLabel
                        name={tm.name}
                        maxLines={2}
                        shrinkAfter={14}
                        fontSize={nameSize}
                        color={tm.color}
                        fontWeight={900}
                        style={{ lineHeight: 1.1, minWidth: 0 }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SchaetzchenReveal — Top5-Style:
// oben Frage (volle Breite), darunter links Lösung+Gewinner, rechts Top 5 Teams
// (max 5, am nächsten dran). Bottom-up Enthüllung bis zum Gewinner.
// ═══════════════════════════════════════════════════════════════════════════════
function SchaetzchenReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const target = q.targetValue as number;

  // Jahreszahlen (Unit enthaelt "Jahr"/"year" ODER Wert sieht wie Jahr aus)
  // OHNE Tausenderpunkt formatieren — sonst stehen Werte wie 1500 als '1.500'
  // da, was wie 1.5 aussieht und falsch ist.
  const unitStr = (lang === 'en' && q.unitEn ? q.unitEn : q.unit) ?? '';
  const looksLikeYear = (n: number) => Number.isInteger(n) && n >= 1000 && n <= 2100;
  // 2026-05-07: explizites isYearAnswer-Flag mit Vorrang.
  const isYearUnit = !!q.isYearAnswer || /jahr|year/i.test(unitStr) || (target != null && looksLikeYear(target));

  const fmt = (n: number) => {
    const abs = Math.abs(n);
    if (isYearUnit) return String(Math.round(n));
    if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (abs >= 10000) return (n / 1000).toFixed(0) + 'k';
    if (abs >= 1000) return n.toLocaleString(lang === 'en' ? 'en-US' : 'de-DE');
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  };

  // Parse + Distanz. Sort: bester (geringste |Δ|) zuerst, bei Delta-Tie → schnellste Einreichung gewinnt.
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

  // Max 5 Teams rechts; Bottom-up Enthüllung (#5 → #4 → … → #1).
  const top5 = ranked.slice(0, 5);
  const n = top5.length;
  const winner = ranked[0] ?? null;

  // 2026-05-03 (Wolf-Bug 'Schaetzchen Cascade-Sound aber alle Avatare gleichzeitig'):
  // Initial-State auf n-fest-init brach bei Race: wenn Component mountet bevor
  // Answers eintreffen → n=0 → revealedMinIdx=0 → alle Rows sofort sichtbar
  // (idx>=0 immer true). Sound wurde aber im setTimeout-Closure mit neuem n
  // korrekt cascadet → nur visuell defekt. Fix: useEffect-deps=[n] + StartedRef
  // damit Cascade einmalig startet sobald n erstmals >0 wird.
  const [revealedMinIdx, setRevealedMinIdx] = useState<number>(n);
  const cascadeStartedRef = useRef(false);
  const STEP_MS = 1600;
  const INITIAL_DELAY_MS = 500;

  useEffect(() => {
    if (cascadeStartedRef.current || n === 0) return;
    cascadeStartedRef.current = true;
    setRevealedMinIdx(n); // alle Rows initial verstecken
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cascadeTotal = n + 1;
    for (let i = 0; i < n; i++) {
      const targetIdx = n - 1 - i;
      const isTopRow = i === n - 1;
      const t = setTimeout(() => {
        setRevealedMinIdx(targetIdx);
        if (!s.sfxMuted) {
          try { playAvatarCascadeNote(i, cascadeTotal); } catch {}
          if (isTopRow) {
            try { playRevealHighlight(); } catch {}
          }
        }
      }, INITIAL_DELAY_MS + i * STEP_MS);
      timers.push(t);
    }
    return () => { timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(12px, 1.6cqh, 20px)',
      padding: 'clamp(14px, 1.8cqh, 24px) clamp(20px, 3cqw, 48px)',
      animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) both',
      minHeight: 0,
    }}>
      {/* ── Zeile 1: Frage über ganze Breite (Top-5-Style) ── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '2px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: 'clamp(14px, 1.8cqh, 22px) clamp(22px, 2.6cqw, 42px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: 'bQuestionIn 0.5s var(--qq-ease-bounce) both',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        flexShrink: 0, overflow: 'hidden',
      }}>
        <div style={{
          fontSize: 'clamp(11px, 1cqw, 14px)', fontWeight: 900, color: '#EAB308',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
        }}>
          <QQEmojiIcon emoji="🎯"/> {lang === 'en' ? 'Guess It — Reveal' : 'Schätzchen — Auflösung'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 120 ? 'clamp(26px, 2.6cqw, 40px)' : 'clamp(30px, 3.2cqw, 52px)',
          fontWeight: 900, lineHeight: 1.18, color: '#F1F5F9',
          textAlign: 'center', minWidth: 0,
          animation: 'langFadeIn 0.4s ease both',
        }}>
          {qText}
        </div>
      </div>

      {/* ── Zeile 2: Grid — links Lösung + Gewinner, rechts Top 5 ── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 'clamp(16px, 2.4cqw, 32px)',
        minHeight: 0,
      }}>
        {/* Linke Spalte: 2 separate Cards — Lösung (gruen umrandet) oben,
            Gewinner (in Teamfarbe umrandet) unten. War vorher eine unified
            Card mit nur grünem Rand und Winner als Footer — User wollte die
            Winner-Hälfte deutlich in Team-Farbe abgesetzt sehen. */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: 'clamp(10px, 1.4cqh, 18px)',
          minHeight: 0, minWidth: 0,
        }}>
          {/* Loesung — obere Card, gruen umrandet */}
          <div style={{
            flex: '1 1 0', minHeight: 0,
            borderRadius: 24,
            background: 'radial-gradient(circle at 50% 35%, rgba(34,197,94,0.18), rgba(22,163,74,0.04) 70%)',
            border: '3px solid rgba(34,197,94,0.6)',
            boxShadow: '0 0 50px rgba(34,197,94,0.25), inset 0 0 26px rgba(34,197,94,0.08)',
            animation: 'revealAnswerBam 0.6s var(--qq-ease-out-cubic) 0.2s both',
            padding: 'clamp(14px, 1.8cqh, 24px) clamp(18px, 2cqw, 30px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Shimmer-Sweep */}
            <div style={{
              position: 'absolute', top: 0, width: '60%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
              animation: 'revealShimmer 0.9s ease 0.55s both',
              pointerEvents: 'none',
            }} />
            <div style={{
              fontSize: 'clamp(12px, 1.2cqw, 18px)', fontWeight: 900, color: '#86efac',
              letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.82,
              position: 'relative', zIndex: 1,
            }}>
              {lang === 'en' ? 'Answer' : 'Lösung'}
            </div>
            <div style={{
              fontSize: 'clamp(64px, 8cqw, 140px)',
              fontWeight: 900, color: '#86efac', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 0 40px rgba(34,197,94,0.5)',
              position: 'relative', zIndex: 1,
            }}>
              {fmt(target)}
            </div>
          </div>

          {/* Winner — untere Card, in Teamfarbe umrandet */}
          {winner && (
            <div style={{
              flex: '1 1 0', minHeight: 0,
              borderRadius: 24,
              border: `3px solid ${winner.team.color}`,
              background: `linear-gradient(180deg, ${winner.team.color}26, ${winner.team.color}08)`,
              boxShadow: `0 0 44px ${winner.team.color}44, inset 0 0 26px ${winner.team.color}11`,
              padding: 'clamp(14px, 1.8cqh, 24px) clamp(18px, 2.2cqw, 32px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(8px, 1.2cqh, 16px)',
              minWidth: 0,
              opacity: revealedMinIdx === 0 ? 1 : 0.12,
              filter: revealedMinIdx === 0 ? 'none' : 'blur(18px) saturate(0.4)',
              transition: 'opacity 0.7s ease, filter 0.7s ease',
              position: 'relative',
            }}>
              {/* Trophy-Label oben, klein und mittig */}
              <span style={{
                fontSize: 'clamp(10px, 0.9cqw, 13px)', fontWeight: 900,
                color: winner.team.color, letterSpacing: '0.1em', textTransform: 'uppercase',
                opacity: 0.92, whiteSpace: 'nowrap',
              }}>
                <QQEmojiIcon emoji="🏆"/> {lang === 'en' ? 'Closest' : 'Am nächsten dran'}
              </span>

              {/* Mega-Zahl — gleiche Groesse + zentriert wie Loesung darueber */}
              <div style={{
                fontSize: 'clamp(64px, 8cqw, 140px)',
                fontWeight: 900, color: winner.team.color, lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                textShadow: `0 0 40px ${winner.team.color}55`,
                animation: revealedMinIdx === 0 ? 'revealWinnerIn 0.6s var(--qq-ease-bounce) 0.3s both' : 'none',
              }}>
                {fmt(winner.num)}
              </div>

              {/* Team-Info-Reihe: Avatar | Name | Delta-Pill */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 'clamp(10px, 1.2cqw, 18px)',
                flexWrap: 'wrap', minWidth: 0,
              }}>
                <QQTeamAvatar avatarId={winner.team.avatarId} teamEmoji={winner.team.emoji} size={'clamp(48px, 5cqw, 72px)'} style={{
                  flexShrink: 0,
                  boxShadow: `0 0 22px ${winner.team.color}88`,
                  animation: revealedMinIdx === 0 ? 'celebShake 0.6s ease 0.6s both' : 'none',
                }} />
                {/* Name als Pille (Rechteck mit Team-Color-Tint) — 2 Zeilen
                    erlaubt, damit lange Witznamen voll ausgeschrieben werden
                    (Wolf-Wunsch 2026-05-04: kein '...' am Namen). */}
                <div style={{
                  padding: 'clamp(6px, 0.9cqh, 10px) clamp(14px, 1.8cqw, 22px)',
                  borderRadius: 16,
                  background: `${winner.team.color}22`,
                  border: `2px solid ${winner.team.color}66`,
                  boxShadow: `0 0 18px ${winner.team.color}33`,
                  maxWidth: 'min(50cqw, 480px)',
                  textShadow: `0 0 22px ${winner.team.color}55`,
                }}>
                  <TeamNameLabel
                    name={winner.team.name}
                    withTeamPrefix
                    maxLines={2}
                    shrinkAfter={18}
                    fontSize="clamp(20px, 2.2cqw, 36px)"
                    color={winner.team.color}
                    fontWeight={900}
                    style={{ textAlign: 'center', lineHeight: 1.1 }}
                  />
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'baseline', gap: 6,
                  padding: '6px 16px',
                  borderRadius: 999,
                  background: winner.delta === 0 ? 'rgba(34,197,94,0.22)' : `${winner.team.color}22`,
                  border: winner.delta === 0 ? '2px solid rgba(34,197,94,0.6)' : `2px solid ${winner.team.color}55`,
                  fontSize: 'clamp(16px, 1.7cqw, 26px)', fontWeight: 900,
                  color: winner.delta === 0 ? '#86efac' : '#e2e8f0',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.04em',
                }}>
                  {winner.delta === 0
                    ? (lang === 'en' ? '✨ exact!' : '✨ genau!')
                    : `Δ ${fmt(winner.delta)}`}
                </div>
              </div>
            </div>
          )}
          {!winner && (
            <div style={{
              flex: '1 1 0', minHeight: 0,
              borderRadius: 24,
              border: '2px solid rgba(239,68,68,0.4)',
              padding: 'clamp(14px, 1.8cqh, 24px) clamp(18px, 2.2cqw, 32px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(20px, 2.2cqw, 32px)', fontWeight: 900, color: '#f87171',
            }}>
              {lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}
            </div>
          )}
        </div>

        {/* Rechte Spalte: Top 5 Ranking (bottom-up enthüllt) */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2cqh, 14px)',
          minHeight: 0, minWidth: 0,
        }}>
          {top5.map((r, idx) => {
            const rank = idx + 1;
            const isVisible = idx >= revealedMinIdx;
            const isTop = rank === 1;
            // Cozy-Range: 2nd-Place ist Co-Winner wenn er in `currentQuestionWinners`
            // ist (Backend hat das beim eval bestimmt). Visuell als '+1 Feld'-Pille
            // markiert, damit klar ist 'der hat auch was bekommen'.
            const isInRangeWinner = !isTop && (s.currentQuestionWinners ?? []).includes(r.teamId);
            const rankGradient = rank === 1
              ? 'linear-gradient(135deg,#EC4899,#EC4899)'
              : rank === 2
                ? 'linear-gradient(135deg,#E2E8F0,#94A3B8)'
                : rank === 3
                  ? 'linear-gradient(135deg,#F97316,#B45309)'
                  : 'linear-gradient(135deg,#475569,#334155)';
            return (
              <div
                key={r.teamId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto auto 1fr auto',
                  alignItems: 'center',
                  gap: 'clamp(10px, 1.2cqw, 18px)',
                  padding: 'clamp(10px, 1.4cqh, 18px) clamp(14px, 1.6cqw, 22px)',
                  borderRadius: 16,
                  background: isTop
                    ? `linear-gradient(135deg, ${r.team.color}22, ${r.team.color}08)`
                    : isInRangeWinner
                      ? `linear-gradient(135deg, ${r.team.color}1a, ${r.team.color}05)`
                      : 'rgba(148,163,184,0.06)',
                  border: isTop
                    ? `2px solid ${r.team.color}55`
                    : isInRangeWinner
                      ? `2px solid ${r.team.color}55`
                      : '2px solid rgba(148,163,184,0.15)',
                  visibility: isVisible ? 'visible' : 'hidden',
                  animation: isVisible
                    ? `top5RowSlideIn 0.55s var(--qq-ease-out-cubic) both, top5RowGlow 1.2s ease 0.3s both`
                    : 'none',
                  flex: 1,
                  minHeight: 'clamp(72px, 9cqh, 110px)',
                  boxShadow: isTop
                    ? `0 0 28px ${r.team.color}33`
                    : isInRangeWinner ? `0 0 18px ${r.team.color}22` : 'none',
                }}
              >
                <div style={{
                  width: 'clamp(52px, 5cqw, 72px)', height: 'clamp(52px, 5cqw, 72px)',
                  borderRadius: 16,
                  background: rankGradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(24px, 2.8cqw, 40px)', fontWeight: 900, color: '#fff',
                  flexShrink: 0,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  animation: isVisible ? 'top5RankPop 0.55s var(--qq-ease-bounce) 0.1s both' : 'none',
                  boxShadow: rank === 1 ? '0 0 20px rgba(236,72,153,0.5)' : 'none',
                }}>
                  #{rank}
                </div>
                <QQTeamAvatar avatarId={r.team.avatarId} teamEmoji={r.team.emoji} size={'clamp(44px, 4.4cqw, 62px)'} style={{
                  boxShadow: `0 0 14px ${r.team.color}55`,
                  flexShrink: 0,
                  animation: isVisible ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) 0.35s both` : 'none',
                }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{
                      fontSize: 'clamp(16px, 1.7cqw, 24px)', fontWeight: 900,
                      color: isTop || isInRangeWinner ? r.team.color : '#cbd5e1',
                      lineHeight: 1.1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{r.team.name}</span>
                    {isInRangeWinner && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 999,
                        background: `${r.team.color}26`,
                        border: `1.5px solid ${r.team.color}55`,
                        fontSize: 'clamp(11px, 1.1cqw, 15px)', fontWeight: 900,
                        color: r.team.color,
                        whiteSpace: 'nowrap',
                      }}>
                        🎯 {lang === 'en' ? 'in range · +1' : 'in Range · +1'}
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 'clamp(24px, 2.6cqw, 40px)', fontWeight: 900,
                    color: isTop ? '#FBCFE8' : '#f1f5f9', marginTop: 4,
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: isTop ? '0 0 16px rgba(236,72,153,0.35)' : 'none',
                  }}>
                    {fmt(r.num)}
                  </div>
                </div>
                <div style={{
                  padding: '8px 18px', borderRadius: 999,
                  background: isTop ? 'rgba(250,204,21,0.22)' : 'rgba(15,23,42,0.7)',
                  border: isTop ? '2px solid rgba(250,204,21,0.55)' : '1.5px solid rgba(148,163,184,0.3)',
                  fontSize: 'clamp(18px, 1.9cqw, 28px)', fontWeight: 900,
                  color: isTop ? '#FBCFE8' : '#e2e8f0',
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                  animation: isVisible ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) 0.45s both` : 'none',
                }}>
                  {r.delta === 0 ? '🎯 0' : `Δ ${fmt(r.delta)}`}
                </div>
              </div>
            );
          })}
          {top5.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', fontSize: 'clamp(18px, 2cqw, 28px)', fontWeight: 700,
            }}>
              {lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CozyGuessrReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const btt = (q.bunteTuete as any);
  const tLat: number = btt.lat;
  const tLng: number = btt.lng;
  const step = s.mapRevealStep ?? 0;

  // Distanzen + Sortierung worst→best (für dramatisches Aufdecken)
  const scored = useMemo(() => {
    return [...s.answers].map(a => {
      const parts = String(a.text ?? '').split(',');
      const lat = Number(parts[0]); const lng = Number(parts[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ...a, lat: null as any, lng: null as any, distKm: null as any };
      const R = 6371;
      const dLat = (lat - tLat) * Math.PI / 180;
      const dLng = (lng - tLng) * Math.PI / 180;
      const aa = Math.sin(dLat/2)**2 + Math.cos(tLat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2;
      return { ...a, lat, lng, distKm: R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa)) };
    }).filter(a => a.distKm !== null);
  }, [s.answers, tLat, tLng]);

  const worstFirst = useMemo(() => [...scored].sort((a, b) => (b.distKm ?? 0) - (a.distKm ?? 0)), [scored]);
  const bestFirst  = useMemo(() => [...scored].sort((a, b) => (a.distKm ?? 0) - (b.distKm ?? 0)), [scored]);

  // Pins werden EXAKT an der eingereichten Position dargestellt — kein
  // Cluster-Spread mehr. (User-Wunsch 2026-04-28: 'pins müssen exakt gesetzt
  // werden, nicht rundherum um das ziel'. Geoguessr-Look — falls Pins
  // überlappen ist das die echte Information; bounds.fit zoomt automatisch
  // näher rein wenn alle Pins eng beieinander liegen.)
  const displayPos = useMemo(() => {
    const out = new Map<string, { lat: number; lng: number }>();
    for (const p of scored) {
      if (p.lat != null && p.lng != null) {
        out.set(p.teamId, { lat: p.lat, lng: p.lng });
      }
    }
    return out;
  }, [scored]);

  const showTarget  = step >= 1;
  const revealedCnt = Math.max(0, step - 1); // Step 2 = 1 Pin, Step 3 = 2 Pins, ...
  const revealedPins = worstFirst.slice(0, revealedCnt);
  const validCount = scored.length;
  const showRanking = step >= (1 + validCount + 1);

  // FitBounds bounds — aber Cap auf max. 2500km Pin-Distanz vom Ziel. Sehr
  // weit entfernte Pins (z.B. „Penguin-Team in Argentinien" bei einem
  // Hamburg-Quiz) wuerden sonst die Map auf Welt-Level rauszoomen, sodass
  // alle nahen Pins als Pixel verschmelzen. Diese „Off-Map"-Pins werden in
  // einer Leiste unter der Karte separat mit Distanz angezeigt.
  const FIT_MAX_KM = 2500;
  const onMapPins = useMemo(
    () => revealedPins.filter(p => (p.distKm ?? 0) <= FIT_MAX_KM),
    [revealedPins]
  );
  const offMapPins = useMemo(
    () => revealedPins.filter(p => (p.distKm ?? 0) > FIT_MAX_KM),
    [revealedPins]
  );
  const bounds = useMemo(() => {
    const b = L.latLngBounds([] as any);
    if (showTarget) b.extend([tLat, tLng]);
    for (const p of onMapPins) {
      const dp = displayPos.get(p.teamId);
      const lat = dp?.lat ?? p.lat;
      const lng = dp?.lng ?? p.lng;
      b.extend([lat, lng]);
    }
    if (!b.isValid()) b.extend([tLat, tLng]);
    return b;
  }, [showTarget, onMapPins, tLat, tLng, displayPos]);

  // v3 round 11 (User-Wunsch 'cozyguessr am ende um ziel rum zoomen, genau
  // zeigen wie knapp es zwischen teams war'): Geoguessr-Style. Wenn alle
  // Pins revealed sind und das Ranking sichtbar ist (showRanking), zoom auf
  // einen engen Bereich um Ziel + Top-3-naechste-Pins. Wir nutzen ein
  // separates Bounds + ein eigenes FitBounds-Trigger.
  const closeUpBounds = useMemo(() => {
    const b = L.latLngBounds([] as any);
    b.extend([tLat, tLng]);
    // Top 3 closest valid (on-map) pins um die enge Group-View zu zeigen
    const topClose = bestFirst.filter(p => (p.distKm ?? 0) <= FIT_MAX_KM).slice(0, 3);
    for (const p of topClose) {
      const dp = displayPos.get(p.teamId);
      const lat = dp?.lat ?? p.lat;
      const lng = dp?.lng ?? p.lng;
      if (lat != null && lng != null) b.extend([lat, lng]);
    }
    if (!b.isValid()) b.extend([tLat, tLng]);
    return b;
  }, [bestFirst, tLat, tLng, displayPos]);

  // 2026-04-30 v3 round 10 (User-Wunsch 'kannst du nicht den 📍-emote
  // nutzen' + 'auflösung etwas unpraktisch, ziel sieht man gar nicht'):
  // Target nutzt jetzt das 📍-Pin-Emoji XL mit Glow. Team-Markers haben
  // Avatar oben + 📍-Pin unten der die Tip-Position markiert.
  // iconAnchor sitzt am unteren Tip damit die Nadel exakt auf lat/lng landet.
  // Geoguessr-Style: Target deutlich groesser & dauerhaft pulsierend, plus
  // Distanz-Polylines vom Team-Pin zum Ziel (siehe Render unten).
  const targetIcon = useMemo(() => L.divIcon({
    className: 'qq-target-pin',
    html: `<div style="
      position: relative; width: 88px; height: 110px;
      animation: mapTargetDrop 0.75s var(--qq-ease-bounce) both, qqTargetPulse 2.1s ease-in-out 0.8s infinite;
      transform-origin: 50% 100%;
      filter: drop-shadow(0 0 18px rgba(236,72,153,0.95)) drop-shadow(0 8px 16px rgba(0,0,0,0.6));
    ">
      <span style="
        position: absolute; left: 50%; top: 0;
        transform: translateX(-50%);
        font-size: 96px; line-height: 1;
        color: #EC4899;
      ">📍</span>
      <!-- 2026-05-09 (Wolf): pulsierender pinker Glow-Dot entfernt — war
           redundant zum 📍 selbst, sah aus wie ein Bug. -->
    </div>`,
    iconSize: [88, 110] as any,
    iconAnchor: [44, 105] as any, // Pin-Tip an lat/lng (5px Offset, da Emoji-Tip nicht ganz unten)
  }), []);

  // 2026-05-05 (Wolf-Skizze): Pin-Kopf = runder Team-Color-Disc mit Avatar
  // drauf (Emoji-Mode: Emoji-Glyph; PNG-Mode: cozyCast-PNG). Schaft = sauberer
  // schwarzer CSS-Cone (kein 📍-Emoji mehr — sah „basteln" aus, war Wolfs
  // Beschwerde 'pin köpfe sollen die avatare mit rundem bg sein').
  const makeTeamIcon = (color: string, mode: 'png' | 'emoji', srcOrEmoji: string, emojiFallback: string) => L.divIcon({
    className: 'qq-team-pin',
    html: `<div style="
      position: relative; width: 56px; height: 84px;
      animation: qqTeamPinDrop 0.55s var(--qq-ease-bounce) both;
      transform-origin: 50% 100%;
      filter: drop-shadow(0 6px 8px rgba(0,0,0,0.55));
    ">
      <!-- Schaft (schwarzer CSS-Cone unter Avatar-Disc) -->
      <div style="
        position: absolute; left: 50%; top: 38px;
        transform: translateX(-50%);
        width: 0; height: 0;
        border-left: 9px solid transparent;
        border-right: 9px solid transparent;
        border-top: 44px solid #1A1A1A;
        z-index: 1;
      "></div>
      <!-- Avatar-Disc Kopf (Team-Color BG, Avatar/Emoji drauf) -->
      <div style="
        position: absolute; left: 4px; top: 0;
        width: 48px; height: 48px; border-radius: 50%;
        background: ${color};
        border: 2.5px solid #1A1A1A;
        box-shadow: 0 0 22px ${color}66, inset 0 -3px 6px rgba(0,0,0,0.18), inset 0 2px 4px rgba(255,255,255,0.22);
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
        z-index: 2;
      ">
        ${mode === 'png' ? `
        <img src="${srcOrEmoji}" alt="" draggable="false"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
          style="width:100%;height:100%;object-fit:cover;display:block;border-radius:50%;" />
        <span style="display:none;align-items:center;justify-content:center;width:100%;height:100%;font-size:28px;line-height:1;">${emojiFallback}</span>
        ` : `
        <span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:30px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));">${srcOrEmoji}</span>
        `}
      </div>
    </div>`,
    iconSize: [56, 84] as any,
    iconAnchor: [28, 82] as any, // Pin-Spitze (Cone-Tip) an lat/lng
  });

  const title = (lang === 'en' ? 'Where on the map?' : 'Wo auf der Karte?');

  return (
    <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden', background: '#0A0814' }}>
      {/* Karte */}
      <div style={{ flex: 1, position: 'relative', transition: 'flex 0.7s var(--qq-ease-smooth)' }}>
        <MapContainer
          center={[tLat, tLng] as any}
          zoom={3}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          dragging={false}
          touchZoom={false}
          style={{ width: '100%', height: '100%', background: '#0a1120' }}
        >
          {/* CartoDB Voyager — bunte, freundliche Karte mit Labels darueber.
              War vorher 'dark_all' (grau-schwarz) — User wollte was Schoeneres. */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains={['a', 'b', 'c', 'd']}
          />
          {/* Geoguessr-Style: erst Welt-Level (zoom 3), dann smoothes Reinzoomen
              auf den Zielbereich beim ersten Reveal-Schritt. */}
          <QQInitialTargetZoom lat={tLat} lng={tLng} />
          <QQMapResizer trigger={showRanking} />
          <QQFitBoundsOnTrigger bounds={bounds} trigger={step} />
          {/* v3 round 11: Wenn Ranking sichtbar ist (alle Pins revealed),
              zoom rein auf Ziel + Top 3 closest. Geoguessr-Style 'wie knapp
              war es'-Moment. Trigger ist showRanking-Bool als 0/1 */}
          {showRanking && (
            <QQFitBoundsOnTrigger bounds={closeUpBounds} trigger={1000 + step} />
          )}
          {showTarget && (
            // 2026-05-03 (Wolf-Bug 'Pin verdeckt Team-Avatare'): Leaflet
            // sortiert Marker nach Latitude (Norden hinten). zIndexOffset
            // negativ haelt Target-Pin hinter Team-Pins (die +1000 bekommen).
            <Marker position={[tLat, tLng] as any} icon={targetIcon} zIndexOffset={-100} />
          )}
          {/* v3 round 10 (User-Wunsch geoguessr-style 'ziel sieht man gar nicht'):
              Distanz-Polylines vom Team-Pin zum Ziel — nur wenn target sichtbar
              (showTarget) und beide on-map. team-color, dashed style fuer
              Map-Pin-Verbindung-Look wie Geoguessr. */}
          {showTarget && onMapPins.map(p => {
            const team = s.teams.find(t => t.id === p.teamId);
            if (!team) return null;
            const dp = displayPos.get(p.teamId);
            const lat = dp?.lat ?? p.lat;
            const lng = dp?.lng ?? p.lng;
            return (
              <Polyline
                key={`line-${p.teamId}`}
                positions={[[lat, lng], [tLat, tLng]] as any}
                pathOptions={{
                  color: team.color,
                  weight: 2.5,
                  opacity: 0.65,
                  dashArray: '6 8',
                }}
              />
            );
          })}
          {onMapPins.map(p => {
            const team = s.teams.find(t => t.id === p.teamId);
            if (!team) return null;
            const dp = displayPos.get(p.teamId);
            const lat = dp?.lat ?? p.lat;
            const lng = dp?.lng ?? p.lng;
            return (
              <Marker
                key={p.teamId}
                position={[lat, lng] as any}
                icon={(() => {
                  // 2026-05-05 (Wolf-Bug 'pin emoji nicht das gewaehlte'):
                  // serverEmojis + team.emoji werden jetzt durchgereicht,
                  // sodass der Map-Pin das vom Spieler gewaehlte Emoji zeigt.
                  const display = getAvatarDisplay(team.avatarId, s.avatarSetId, s.avatarSetEmojis, team.emoji);
                  if (display.kind === 'png') {
                    return makeTeamIcon(team.color, 'png', display.pngBase, team.emoji ?? qqGetAvatar(team.avatarId).emoji);
                  }
                  return makeTeamIcon(team.color, 'emoji', display.emoji, display.emoji);
                })()}
                zIndexOffset={1000}
              />
            );
          })}
        </MapContainer>

        {/* Off-Map Indikator: Pins die >2500km vom Ziel weg sind, werden auf
            der Map nicht eingerahmt (sonst zoomt sie auf Welt-Level raus).
            Stattdessen hier kompakt mit Distanz-Pfeil. */}
        {offMapPins.length > 0 && (
          <div style={{
            position: 'absolute', top: 88, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            padding: '8px 16px', borderRadius: 999,
            background: 'rgba(13,10,6,0.85)',
            border: '1.5px solid rgba(236,72,153,0.35)',
            zIndex: 1000, maxWidth: 'calc(100% - 80px)', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: 13, fontWeight: 900, color: '#FBCFE8',
              letterSpacing: 0.3, textTransform: 'uppercase',
            }}>
              {lang === 'en' ? '✈ Far away' : '✈ Weit weg'}
            </span>
            {offMapPins.map(p => {
              const team = s.teams.find(t => t.id === p.teamId);
              if (!team) return null;
              return (
                <span key={p.teamId} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px 4px 4px', borderRadius: 999,
                  background: 'rgba(15,23,42,0.6)',
                  border: `1.5px solid ${team.color}55`,
                }}>
                  <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={28} />
                  <span style={{
                    fontWeight: 900, color: team.color, fontSize: 13,
                    fontVariantNumeric: 'tabular-nums', letterSpacing: 0.2,
                  }}>
                    {(p.distKm ?? 0) >= 1000 ? `${((p.distKm ?? 0) / 1000).toFixed(1)} Mm` : `${Math.round(p.distKm ?? 0)} km`}
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {/* Title-Overlay oben */}
        <div style={{
          position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)',
          padding: '12px 28px', borderRadius: 999,
          background: 'rgba(15,23,42,0.85)', border: '2px solid rgba(236,72,153,0.4)',
          color: '#FBCFE8', fontWeight: 900, fontSize: 'clamp(20px, 2.4cqw, 32px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 28px rgba(236,72,153,0.25)',
          zIndex: 1000, letterSpacing: 0.3,
        }}>
          <QQEmojiIcon emoji="🌍"/> {title}
        </div>

      </div>

      {/* Ranking-Panel rechts (slide-in) — Sizing so dass min. 8 Teams reinpassen.
          2026-05-05 (Wolf): justifyContent center damit die Liste vertikal mittig
          sitzt statt top-aligned. Bei mehr Teams als reinpassen kicked overflow:auto. */}
      {showRanking && (
        <div style={{
          flex: '0 0 38%', padding: '34px 22px 22px',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(13,10,6,0.96))',
          borderLeft: '2px solid rgba(236,72,153,0.2)',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
          animation: 'qqMapRankSlideIn 0.7s var(--qq-ease-out-cubic) both',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 8, overflowY: 'auto',
        }}>
          <div style={{
            fontWeight: 900, fontSize: 'clamp(22px, 2.4cqw, 32px)',
            color: '#FBCFE8', marginBottom: 6, textAlign: 'center', letterSpacing: 0.4,
          }}>
            <QQEmojiIcon emoji="🏆"/> {lang === 'en' ? 'Closest to target' : 'Am nächsten dran'}
          </div>
          {(() => {
            // Tie-Erkennung: Teams mit (gerundet) gleicher Distanz — dann entscheidet Speed.
            // Gruppen nach Distanz-Bucket (auf Anzeige-Präzision, also ganze Meter bzw. 0.1 km).
            const bucket = (km: number | null): string => {
              if (km == null) return '—';
              return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
            };
            const tieGroups: Record<string, number> = {};
            bestFirst.forEach(p => { const k = bucket(p.distKm); tieGroups[k] = (tieGroups[k] ?? 0) + 1; });
            const groupEarliest: Record<string, number> = {};
            bestFirst.forEach(p => {
              const k = bucket(p.distKm);
              const at = p.submittedAt ?? 0;
              if (groupEarliest[k] == null || at < groupEarliest[k]) groupEarliest[k] = at;
            });
            return bestFirst.map((p, i) => {
              const team = s.teams.find(t => t.id === p.teamId);
              if (!team) return null;
              const medal = i === 0 ? <QQEmojiIcon emoji="🥇"/> : i === 1 ? <QQEmojiIcon emoji="🥈"/> : i === 2 ? <QQEmojiIcon emoji="🥉"/> : `#${i+1}`;
              const dist = p.distKm == null ? '—' : p.distKm < 1 ? `${Math.round(p.distKm * 1000)} m` : `${p.distKm.toFixed(1)} km`;
              const isTop = i === 0;
              const key = bucket(p.distKm);
              const isTied = (tieGroups[key] ?? 0) > 1;
              const deltaMs = isTied && p.submittedAt ? p.submittedAt - (groupEarliest[key] ?? p.submittedAt) : 0;
              const timeLabel = isTied ? (deltaMs === 0 ? '⚡ zuerst' : `+${(deltaMs / 1000).toFixed(1)}s`) : null;
              return (
                <div key={p.teamId} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 16,
                  background: isTop ? `linear-gradient(90deg, ${team.color}22, ${team.color}0a)` : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${isTop ? team.color + '88' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: isTop ? `0 0 24px ${team.color}44` : 'none',
                  animation: `contentReveal 0.45s var(--qq-ease-pop-fast) ${0.15 + i * 0.08}s both`,
                }}>
                  <span style={{ fontSize: 'clamp(26px, 2.8cqw, 38px)', width: 52, textAlign: 'center', fontWeight: 900, fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif", color: isTop ? '#FBCFE8' : '#cbd5e1' }}>{medal}</span>
                  <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={'clamp(36px, 3.8cqw, 54px)'} />
                  <span title={team.name} style={{ flex: 1, minWidth: 0, fontWeight: 900, fontSize: 'clamp(20px, 2.2cqw, 30px)', color: team.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
                  {timeLabel && (
                    <span style={{
                      fontWeight: 900, fontSize: 'clamp(14px, 1.3cqw, 18px)',
                      padding: '3px 10px', borderRadius: 999,
                      background: deltaMs === 0 ? 'rgba(250,204,21,0.18)' : 'rgba(148,163,184,0.12)',
                      color: deltaMs === 0 ? '#FBCFE8' : '#94a3b8',
                      border: `1px solid ${deltaMs === 0 ? 'rgba(250,204,21,0.4)' : 'rgba(148,163,184,0.25)'}`,
                    }}>{timeLabel}</span>
                  )}
                  <span style={{ fontWeight: 900, fontSize: 'clamp(19px, 1.9cqw, 26px)', color: isTop ? '#86efac' : '#94a3b8', fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif" }}><QQEmojiIcon emoji="📍"/> {dist}</span>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Antwort-Label unten — 2026-05-09 (Wolf 'reveal text leicht rechts
          versetzt'): pill ist jetzt im OUTER container statt im map-flex-item.
          Bei eingeblendetem Ranking-Panel (38%) bleibt die Pill mittig im
          gesamten Beamer-Viewport, nicht nur im Map-Bereich. */}
      {showTarget && q.answer && (
        <div style={{
          position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          padding: '14px 32px', borderRadius: 16,
          background: 'rgba(13,10,6,0.92)',
          border: '2.5px solid rgba(34,197,94,0.7)',
          color: '#86efac', fontWeight: 900, fontSize: 'clamp(22px, 2.8cqw, 38px)',
          boxShadow: '0 0 50px rgba(34,197,94,0.35), 0 8px 24px rgba(0,0,0,0.45)',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          textAlign: 'center',
          animation: 'revealAnswerBam 0.6s var(--qq-ease-out-cubic) both',
          zIndex: 1000, pointerEvents: 'none',
        }}>
          {formatRevealedAnswer(lang, q.answer, q.answerEn)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION VIEW (active + reveal)
// ═══════════════════════════════════════════════════════════════════════════════

export function QuestionView({ state: s, revealed, hideCutouts }: { state: QQStateUpdate; revealed: boolean; hideCutouts?: boolean }) {
  const q = s.currentQuestion;
  if (!q) return null;
  const cat = q.category as QQCategory;
  const catLabel = QQ_CATEGORY_LABELS[cat];
  const accent = CAT_ACCENT[cat] ?? '#e2e8f0';
  const badgeBg = CAT_BADGE_BG[cat] ?? '#374151';
  const glow = CAT_GLOW[cat] ?? 'transparent';
  // Dekorative Corner-Emojis pro Kategorie — aktuell ausgeblendet (Tester fanden sie
  // verwirrend: "was macht das?"). Zum Reaktivieren: SHOW_CAT_CUTOUTS auf true setzen.
  const SHOW_CAT_CUTOUTS = false;
  const cutouts = SHOW_CAT_CUTOUTS ? (CAT_CUTOUTS[cat] ?? []) : [];
  // Per-question emoji override: replace default cutout emojis
  const effectiveCutouts = q.emojis?.length
    ? cutouts.map((c, i) => q.emojis![i] ? { ...c, emoji: q.emojis![i] } : c)
    : cutouts;
  const cardBg = s.theme?.cardBg ?? COZY_CARD_BG;
  const img = q.image;
  // For CHEESE (Picture This): show image even with layout='none' — it's the main visual
  const isCheese = cat === 'CHEESE';
  const hasImg = img && img.url && (isCheese || img.layout !== 'none');
  const isWindow = hasImg && !isCheese && (img.layout === 'window-left' || img.layout === 'window-right');
  const lang = useLangFlip(s.language);

  // 2026-05-05 (Wolf): CozyGuessr-Active mit Bild = Cheese-Landscape-Layout.
  // Bild fullscreen + Frosted Card unten + Timer + Avatar-Progress.
  // Reveal greift frueher (isMapReveal -> CozyGuessrReveal), daher nur Active-Phase.
  const isMapKind = cat === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'map';
  const useMapPicture = isMapKind && !!hasImg && !revealed;

  // 2026-04-30 v3 (User-Wunsch): Cheese Portrait → 2-Spalten-Layout.
  // Image links voll Top-to-Bottom, Question-Card rechts vertikal mittig.
  // Detection via natural-dimensions preload — kein Backend-Feld noetig.
  // 2026-05-05: gilt auch fuer CozyGuessr-Active mit Bild.
  // 2026-05-05 v2 (Wolf-Bug 'bei cheese sieht man kurz etwas bevor die seite
  // angeordnet erscheint, wirkt unruhig'): imgReady hält das Cheese-Layout
  // unsichtbar bis Portrait-Detection durch ist — sonst rendert der Container
  // mit isCheesePortrait=false (Default) und shifted dann sichtbar wenn ein
  // Portrait erkannt wurde.
  // 2026-05-10 (Wolf-Wunsch): img.cheeseLayout-Override gewinnt vor Auto-
  // Detection. Damit Wolf bei Edge-Cases (quadratische Bilder, fast-Quadrat
  // Karten) explizit forcen kann was er will.
  const [isCheesePortrait, setIsCheesePortrait] = useState(false);
  const [imgReady, setImgReady] = useState(false);
  useEffect(() => {
    if ((!isCheese && !useMapPicture) || !img?.url) {
      setIsCheesePortrait(false);
      setImgReady(true); // kein Bild → kein Detection-Bedarf
      return;
    }
    // Manueller Override per Builder gewinnt vor Auto-Detection.
    if (img.cheeseLayout === 'portrait') {
      setIsCheesePortrait(true);
      setImgReady(true);
      return;
    }
    if (img.cheeseLayout === 'landscape') {
      setIsCheesePortrait(false);
      setImgReady(true);
      return;
    }
    setImgReady(false);
    const tester = new globalThis.Image();
    tester.onload = () => {
      setIsCheesePortrait(tester.naturalHeight > tester.naturalWidth * 1.05); // 5% Toleranz
      setImgReady(true);
    };
    tester.onerror = () => { setIsCheesePortrait(false); setImgReady(true); };
    tester.src = img.url;
  }, [isCheese, useMapPicture, img?.url, img?.cheeseLayout]);

  // 2026-05-04 v3 (Wolf): Timer-Outro-Animation klappt nicht bei Frueh-Abbruch
  // (alle abgegeben → Backend reveal → s.timerEndsAt wird null → Component
  // unmountet sofort → keine Outro-Anim). Loesung: stickyTimer haelt das letzte
  // gueltige endsAt ~1s nach Verschwinden, sodass die qqTimerOutro-Anim 0.85s
  // sauber durchlaufen kann. expireNow=true wird gesetzt sobald das Original-
  // Prop weg ist ODER revealed=true.
  const [stickyTimer, setStickyTimer] = useState<{ endsAt: number; duration: number } | null>(
    s.timerEndsAt ? { endsAt: s.timerEndsAt, duration: s.timerDurationSec } : null
  );
  useEffect(() => {
    if (s.timerEndsAt) {
      setStickyTimer({ endsAt: s.timerEndsAt, duration: s.timerDurationSec });
    }
  }, [s.timerEndsAt, s.timerDurationSec]);
  useEffect(() => {
    if (!s.timerEndsAt && stickyTimer) {
      const t = window.setTimeout(() => setStickyTimer(null), 1000);
      return () => window.clearTimeout(t);
    }
  }, [s.timerEndsAt, stickyTimer]);
  const timerExpiring = stickyTimer !== null && (!s.timerEndsAt || revealed);

  // ── CHEESE Cascade-Audit (2026-05-01): vorher fielen alle Treffer-Avatare
  // gleichzeitig + stumm rein. Jetzt 850ms-Stagger pro Avatar (CSS) + synchron
  // Pentatonik-Cascade-Toene wie Top5/Order. Spannung-Score 1/5 → 4/5.
  const cheeseCorrectCount = useMemo(() => {
    if (cat !== 'CHEESE' || !revealed) return 0;
    // 2026-05-02: Backend-Truth via currentQuestionWinners (war vorher strict-
    // Match, hat Schreibfehler-Akzeptanzen ignoriert).
    const winners = s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []);
    return winners.length;
  }, [cat, revealed, s.currentQuestionWinners, s.correctTeamId]);

  useEffect(() => {
    if (cat !== 'CHEESE' || !revealed || cheeseCorrectCount === 0) return;
    if (s.sfxMuted) return;
    // 2026-05-06 (Wolf 'letzter Sound der Cascade passiert ohne Animation auf
    // dem Screen, reveal-Reihenfolge tauschen von langsamster zu schnellster
    // Winner und besonderen Sound auf den schnellsten'):
    // Reihenfolge slow→fast Winner. Letzter (= schnellster Winner = Climax)
    // bekommt playRevealHighlight statt Pentatonik-Note (= 'Lösung aufgedeckt'-
    // Sound aus MUCHO/ZvZ). Avatar-Stagger im JSX matched (850ms statt 160ms),
    // damit jedes Sound-Event eine sichtbare Avatar-Drop-Animation hat.
    const cascadeTotal = cheeseCorrectCount + 1;
    const handles: number[] = [];
    for (let i = 0; i < cheeseCorrectCount; i++) {
      const delay = i * 850 - 60; // 60ms Vorlauf fuer psychoakustische Sync
      const isLast = i === cheeseCorrectCount - 1;
      handles.push(window.setTimeout(() => {
        try {
          if (isLast) playRevealHighlight();
          else playAvatarCascadeNote(i, cascadeTotal);
        } catch {}
      }, Math.max(0, delay)));
    }
    return () => handles.forEach(h => window.clearTimeout(h));
  }, [cat, revealed, cheeseCorrectCount, s.sfxMuted]);

  // ── MUCHO: Winner-Card erst nach Jäger-Lock zeigen ──────────────────────
  // Spiegelt die Akt-2-Timing aus MuchoOptionsReveal (hop + lock + speedrun).
  // Solange Winner-Card verborgen ist bleibt die Spannungskurve intakt.
  const muchoNonEmpty = useMemo(() => {
    if (cat !== 'MUCHO' || !q.options) return 0;
    let n = 0;
    for (let i = 0; i < q.options.length; i++) {
      if (s.answers.some(a => a.text === String(i))) n++;
    }
    return n;
  }, [cat, q.options, s.answers]);
  const muchoLockStep = muchoNonEmpty + 1;
  const muchoLocked = cat === 'MUCHO' && revealed && (s.muchoRevealStep ?? 0) >= muchoLockStep;
  // Winner-Card erscheint nach dem Doppelblink (1.1s Animation + 100ms Puffer).
  const [muchoAkt3Ready, setMuchoAkt3Ready] = useState(false);
  useEffect(() => {
    if (!muchoLocked) { setMuchoAkt3Ready(false); return; }
    const t = window.setTimeout(() => setMuchoAkt3Ready(true), 1200);
    return () => window.clearTimeout(t);
  }, [muchoLocked]);

  // ── ZEHN_VON_ZEHN: Step-Reveal — Bet-Cascade + Doppelblink ──────────────
  // Step 0: alle Chips sichtbar AUSSER höchste(r) Bet(s) pro Option; kein Grün, keine Winner-Card.
  // Step 1: höchste Bets kaskadieren pro Option (leere Optionen überspringen).
  // Step 2: Doppelblink auf korrekte Option → Grün + Winner-Card (analog MUCHO).
  const zvzStep = s.zvzRevealStep ?? 0;
  const zvzHighestPerOption = useMemo(() => {
    if (cat !== 'ZEHN_VON_ZEHN' || !q.options) return [] as Array<{ maxPts: number; teamIds: string[]; isEmpty: boolean }>;
    const parsed = s.answers
      .map(a => ({ teamId: a.teamId, pts: String(a.text ?? '').split(',').map(x => parseInt(x.trim(), 10)) }))
      .filter(p => p.pts.length === q.options!.length && !p.pts.some(Number.isNaN));
    return q.options!.map((_, i) => {
      const entries = parsed.map(p => ({ teamId: p.teamId, pts: p.pts[i] ?? 0 })).filter(e => e.pts > 0);
      if (entries.length === 0) return { maxPts: 0, teamIds: [], isEmpty: true };
      const maxPts = Math.max(...entries.map(e => e.pts));
      return { maxPts, teamIds: entries.filter(e => e.pts === maxPts).map(e => e.teamId), isEmpty: false };
    });
  }, [cat, q.options, s.answers]);
  const zvzNonEmptyOptions = useMemo(() => zvzHighestPerOption.map((h, i) => (h.isEmpty ? -1 : i)).filter(i => i >= 0), [zvzHighestPerOption]);
  const [zvzRevealed, setZvzRevealed] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (cat !== 'ZEHN_VON_ZEHN' || !revealed) { setZvzRevealed(new Set()); return; }
    if (zvzStep === 0) { setZvzRevealed(new Set()); return; }
    // Step 2+ (Lock): alle Top-Bets bleiben stationaer sichtbar — KEIN Reset
    // und keine neue Cascade, sonst "erscheinen" die Chips nochmal obwohl
    // sie schon da sind.
    if (zvzStep >= 2) {
      setZvzRevealed(new Set(zvzNonEmptyOptions));
      return;
    }
    // Step 1: Kaskade pro Option (200ms Initial + 550ms pro Option).
    const timers: number[] = [];
    setZvzRevealed(new Set());
    zvzNonEmptyOptions.forEach((optIdx, i) => {
      timers.push(window.setTimeout(() => {
        setZvzRevealed(prev => {
          const next = new Set(prev); next.add(optIdx); return next;
        });
        // 2026-05-05 (Wolf-Bug 'mehrere sounds gleichzeitig'): playTick
        // entfernt — Avatar-Cascade-Note (line 1435) liefert schon den
        // hoerbaren Cascade-Effekt, Tick legte sich oben drauf und matschte.
      }, 200 + i * 550));
    });
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [cat, revealed, zvzStep, zvzNonEmptyOptions.join(','), s.sfxMuted]); // eslint-disable-line react-hooks/exhaustive-deps
  // Lock-Phase (Step 2): Doppelblink auf korrekte Option, Winner-Card nach 1.2s
  const zvzLocked = cat === 'ZEHN_VON_ZEHN' && revealed && zvzStep >= 2 && q.correctOptionIndex != null;
  const [zvzWinnerReady, setZvzWinnerReady] = useState(false);
  useEffect(() => {
    if (!zvzLocked) { setZvzWinnerReady(false); return; }
    const t = window.setTimeout(() => setZvzWinnerReady(true), 1200);
    return () => window.clearTimeout(t);
  }, [zvzLocked]);
  const zvzAkt3Ready = cat === 'ZEHN_VON_ZEHN' ? zvzWinnerReady : true;

  // ── CHEESE: Lösung sofort gruen + Avatare cascadieren (850ms Stagger).
  // 2026-05-01: Cascade-Audit — vorher fielen alle Avatare gleichzeitig rein,
  // WinnerCard erschien direkt = "alles auf einmal"-Gefuehl. Jetzt: Avatare
  // staffeln sich, WinnerCard wartet bis Cascade fertig ist.
  const cheeseShowGreen = true;
  const cheeseShowAvatars = true;
  const [cheeseCascadeDone, setCheeseCascadeDone] = useState(false);
  useEffect(() => {
    if (cat !== 'CHEESE' || !revealed) { setCheeseCascadeDone(false); return; }
    if (cheeseCorrectCount === 0) { setCheeseCascadeDone(true); return; }
    const totalMs = cheeseCorrectCount * 850 + 200;
    const t = window.setTimeout(() => setCheeseCascadeDone(true), totalMs);
    return () => window.clearTimeout(t);
  }, [cat, revealed, cheeseCorrectCount]);

  const showMuchoWinner = cat !== 'MUCHO' || muchoAkt3Ready;
  const showZvzWinner = cat !== 'ZEHN_VON_ZEHN' || zvzAkt3Ready;
  const showCheeseWinner = cat !== 'CHEESE' || cheeseCascadeDone;
  const showUnifiedWinner = showMuchoWinner && showZvzWinner && showCheeseWinner;

  // 2026-04-30: Sound bei Sieger-Card-Einblendung (false→true Transition).
  // Synchron zur Animation: revealWinnerIn nutzt bannerDelay=0.7s, davor ist
  // die Card auf scaleY(0)/opacity:0 — der Sound MUSS auch 700ms warten,
  // sonst kommt er vor dem sichtbaren Banner (User-Feedback: 'sound kommt
  // etwas früh'). 60ms Vorlauf damit Ton minimal vor dem Pop einsetzt =
  // psychoakustisch synchron.
  // 2026-04-30 v3 (User-Wunsch climax IMMER bei WinnerCard): Beim Pop
  // der WinnerCard layern wir Cascade-Top-Ton + Climax-Finish-Akkord
  // gemeinsam — fuer alle Kategorien. So gibt's einheitlich den
  // „Yeah!"-Moment beim Erscheinen der Sieger-Karte. playWinnerCardReveal
  // bleibt als zusaetzlicher Bell-Layer (User kann es im Sound-Panel mute'n).
  const prevShowWinnerRef = useRef(false);
  useEffect(() => {
    const prev = prevShowWinnerRef.current;
    prevShowWinnerRef.current = showUnifiedWinner;
    // 2026-05-05 (Wolf-Bug 'cheese reveal sound passt nicht, gewinnercard fehlt'):
    // Bei CHEESE mit mehreren Winnern ist correctTeamId oft null/leer — nur
    // currentQuestionWinners ist gefuellt.
    // 2026-05-05 v2 (Wolf-Bug 'cheese sound fuer winnercard, aber keine card'):
    // hasWinner muss zusaetzlich pruefen ob die Winner-IDs auch wirklich in
    // s.teams existieren — sonst spielt der Sound aber Render fellt auf das
    // 'team not found → return null'-Branch und Card erscheint nicht.
    const winnerIds = s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []);
    const hasRenderableWinner = !!s.teams.find(t => t.id === s.correctTeamId)
      || winnerIds.some(id => s.teams.find(t => t.id === id));
    if (!s.sfxMuted && showUnifiedWinner && !prev && revealed && hasRenderableWinner) {
      const cat = s.currentQuestion?.category;
      const subKind = (s.currentQuestion?.bunteTuete as { kind?: string } | undefined)?.kind;
      const isCascadeCategory =
        cat === 'MUCHO' ||
        cat === 'ZEHN_VON_ZEHN' ||
        (cat === 'BUNTE_TUETE' && (subKind === 'top5' || subKind === 'order'));
      const handle = window.setTimeout(() => {
        try {
          // v3 round 11 (User-Bug 'mehrere parallele sounds'): Vorher fired
          // immer climaxFinish + (cascade-top ODER winnerCardReveal). Jetzt
          // nur climaxFinish — der ist schon ein 6-Layer-Akkord, weitere
          // Layer machen es matschig statt klimaktisch.
          playClimaxFinish();
        } catch {}
        // isCascadeCategory referenziert, eslint-friendly
        void isCascadeCategory;
      }, 640);
      return () => window.clearTimeout(handle);
    }
  }, [showUnifiedWinner, revealed, s.correctTeamId, s.currentQuestionWinners, s.sfxMuted, s.currentQuestion?.category, s.currentQuestion?.bunteTuete]);

  // ── CozyGuessr (map) full-screen reveal ─────────────────────────────────
  const isMapReveal = revealed
    && q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'map';
  if (isMapReveal) {
    return <CozyGuessrReveal state={s} lang={lang} />;
  }

  // ── Top-5 two-column reveal ─────────────────────────────────────────────
  const isTop5Reveal = revealed
    && q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'top5';
  if (isTop5Reveal) {
    return <Top5Reveal state={s} lang={lang} />;
  }

  // ── 4 gewinnt / Only Connect: eigene Layout-Komponente für active + reveal ──
  const isOnlyConnect = q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'onlyConnect';
  if (isOnlyConnect) {
    return <OnlyConnectBeamerView state={s} lang={lang} revealed={revealed} />;
  }

  // ── Bluff: eigene 3-Phasen-Layout-Komponente ─────────────────────────────
  const isBluff = q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'bluff';
  if (isBluff) {
    return <BluffBeamerView state={s} lang={lang} revealed={revealed} />;
  }

  // ── Order two-column reveal (Lucky Bag: bring in correct order) ────────
  const isOrderReveal = revealed
    && q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'order';
  if (isOrderReveal) {
    return <OrderReveal state={s} lang={lang} />;
  }

  // ── Schätzchen two-column reveal (Frage + Lösung oben, Winner + Rangliste) ──
  const isSchaetzReveal = revealed && q.category === 'SCHAETZCHEN';
  if (isSchaetzReveal) {
    return <SchaetzchenReveal state={s} lang={lang} />;
  }

  // ── CHEESE / Picture-Active "Overlay" layout ────────────────────────────
  // Image stays fullscreen. Frosted card overlays with question/answer.
  // No separate "image only" phase — question + image appear together.
  // Active: fullscreen image + frosted question card + timer + avatar-progress
  // Reveal (CHEESE only): fullscreen image + frosted answer card + winner.
  //   CozyGuessr-Reveal hat seinen eigenen Pfad (CozyGuessrReveal — siehe oben).
  // Hinweis: CHEESE-Overlay-UI (Antwort-Card, Team-Avatare, Reveal) MUSS auch ohne Bild
  // rendern — sonst ist die Frage unspielbar. Nur der fullscreen-Image-Layer wird ausgeblendet.
  const cheeseOverlay = isCheese || useMapPicture;
  const cheeseWithQuestion = cheeseOverlay && !revealed;
  const isCheeseReveal = isCheese && revealed; // map-reveal laeuft via CozyGuessrReveal
  const cheeseFullscreen = cheeseOverlay && !!hasImg;

  // Auto-size: shorter fontSize for long questions (no size change on reveal — prevents reflow)
  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  const isOrderBt = q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'order';
  // 2026-04-28-v3 (User: 'fragecards die kleiner werden zappelig — könnten
  // wir die cards nicht von Anfang an etwas kleiner machen?'). Wir wählen
  // jetzt EINE moderate Größe für ALLE Phasen (Question + Reveal). Kein
  // shrink mehr → kein zappeln. Sizing knapp aber lesbar; Reveal-Phase
  // dimmt nur opacity statt zu shrinken.
  // 2026-05-04 (Wolf #3): Beamer-Schrift +15-20% damit aus 8m Distanz lesbar.
  // 2026-05-13 (Wolf 'esc-host-venue-by-audience-capacity-Frage, 66 chars,
  // 4 Zeilen, Winner-Card fiel unten raus'): zusaetzlicher Bucket bei >55
  // chars. Vorher fielen 41-80 char-Fragen alle in einen Bucket mit max 76px
  // — bei breiter Card (~1160px) reichte das fuer 14-15 chars/line, 66 chars
  // = 5 Zeilen. Neuer 56-80er Bucket mit max 60px = ~18 chars/line, 66 chars
  // in 3 Zeilen → Winner-Card unten hat wieder Platz.
  const qFontSize = qText.length > 200 ? 'clamp(26px, min(3cqw, 4.6cqh), 44px)'
    : qText.length > 120 ? 'clamp(32px, min(3.7cqw, 5.8cqh), 56px)'
    : qText.length > 80  ? 'clamp(38px, min(4.4cqw, 6.5cqh), 68px)'
    : qText.length > 55  ? 'clamp(36px, min(4cqw, 6cqh), 60px)'
    : qText.length > 40  ? 'clamp(42px, min(4.8cqw, 7cqh), 76px)'
    : 'clamp(46px, min(5.5cqw, 7.5cqh), 88px)';

  // Category intro overlay removed — category is already shown in PHASE_INTRO

  return (
    <div style={{
      flex: 1, display: 'flex', position: 'relative',
      // 2026-05-12 (Glow-Audit): hidden → visible. Frage-Card + Option-Cards
      // haben dicke Glows (boxShadow 0 0 36-48px) — die wurden hier am
      // QuestionView-Rand abgeschnitten. SlideStage outer clipMargin (120px)
      // faengt sie sauber am echten Bildschirmrand.
      overflow: 'visible',
    }}>
      {/* I1 Kategorie-Partikel (fliegende Zahlen/Buchstaben) entfernt —
          lenkten vom Fragentext ab. Stattdessen faerben wir die Fireflies
          weiter unten in der Kategorie-Farbe. */}
      {/* CHEESE ohne Bild: dezenter Placeholder im Hintergrund (Gradient + 📸-Icon),
          damit die Frage spielbar bleibt aber visuell klar ist „hier sollte ein Bild sein".
          position:absolute (NICHT fixed) — fixed wird durch BeamerFrame-Transform-Stacking-Context geclippt. */}
      {isCheese && !hasImg && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.18), transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.10), transparent 50%), #0A0814',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 14,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: 'clamp(120px, 18cqw, 240px)', opacity: 0.18,
            animation: 'cfloat 4s ease-in-out infinite',
          }}>📸</div>
          <div style={{
            fontSize: 'clamp(14px, 1.4cqw, 18px)', fontWeight: 900,
            color: '#a78bfa', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.55,
          }}>
            {lang === 'de' ? 'Bild fehlt — Frage trotzdem spielbar' : 'No image — question still playable'}
          </div>
        </div>
      )}
      {/* Fullscreen background image: non-overlay fullscreen layout OR CHEESE/Map-Picture overlay.
          2026-05-05 v2 (Wolf-Bug 'kurz etwas vor anordnung sichtbar'): cheeseFullscreen
          wartet auf imgReady (Portrait-Detection durch) damit kein Layout-Shift sichtbar ist. */}
      {((hasImg && img.layout === 'fullscreen' && !cheeseOverlay) || (cheeseFullscreen && imgReady)) && (() => {
        // CHEESE: 3-Schicht-Aufbau gegen Aspect-Ratio-Crop.
        // 1) Blurred cover backdrop — füllt 16:9-Beamer, kein schwarzer Rand
        // 2) Sharp CONTAIN foreground — komplettes Bild sichtbar (Mona Lisas Kopf bleibt drin)
        // 3) Dunkler Vignette-Overlay — Lesbarkeit der Antwort-Card
        // offsetX/Y/scale wirken auf Layer 2; scale=1 (default) zeigt vollständiges Bild.
        const cheeseOX = img!.offsetX ?? 0;
        const cheeseOY = img!.offsetY ?? 0;
        const cheeseZoom = img!.scale ?? 1;
        const cheesePosX = 50 + cheeseOX / 2;
        const cheesePosY = 50 + cheeseOY / 2;
        return (
        <>
          {/* 2026-04-30 v3 (User-Wunsch): Bei Portrait-Foto in CHEESE clippen
              wir alle Bild-Layer auf die LINKE Bildschirm-Haelfte. Question-
              Card-Overlay wandert in den rechten Streifen (siehe Overlay
              weiter unten). Nicht-Cheese und Landscape bleiben unveraendert. */}
          {/* Layer 1: blurred cover backdrop (CHEESE only).
              2026-04-30 v3: Bei Portrait fuellt diese ueberall (full-screen),
              damit der rechte Streifen (Card) nicht schwarz/leer wirkt. Sharp
              Foreground (Layer 2) bleibt nur links — rechts sieht man also
              das Bild als sanft-blurred Backdrop hinter der Card.
              v3 round 5 (User-Bug 'fliegt aus mitte nach links'): fsExpand
              clip-path ersetzt durch reinen opacity-Fade. Das clip-path-
              Expand wirkte wie 'aus Mitte rauslaufen'. */}
          {cheeseFullscreen && (
            <div style={{
              position: 'fixed', inset: 0,
              zIndex: 49,
              backgroundImage: `url(${img!.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: 'blur(36px) brightness(0.45) saturate(1.1)',
              transform: 'scale(1.15)',
              transformOrigin: 'center',
              animation: 'contentReveal 0.6s var(--qq-ease-pop-fast) both',
            }} />
          )}
          {/* Layer 2: sharp foreground (contain für CHEESE, cover für legacy fullscreen).
              2026-05-04 (Wolf): bei cheeseFullscreen sitzt das Bild jetzt in
              einem Wrapper mit overflow:hidden + borderRadius matching Rahmen,
              damit es niemals ueber den Bilderrahmen hinausragt — auch nicht
              bei transform: scale(zoom). */}
          {cheeseFullscreen ? (
            <div style={{
              position: 'fixed',
              top: 'clamp(10px, 1.4cqh, 22px)',
              bottom: 'clamp(10px, 1.4cqh, 22px)',
              left: 'clamp(12px, 1.6cqw, 28px)',
              right: isCheesePortrait
                ? `calc(50% + clamp(6px, 0.8cqw, 14px))`
                : 'clamp(12px, 1.6cqw, 28px)',
              zIndex: 50,
              borderRadius: 22,
              overflow: 'hidden',
              clipPath: (revealed && !cheeseOverlay) ? 'inset(8% 8% 8% 52% round 18px)' : undefined,
              animation: 'contentReveal 0.7s var(--qq-ease-pop-fast) both',
              transition: 'clip-path 0.8s var(--qq-ease-smooth), right 0.5s ease',
            }}>
              {/* 2026-05-04 v4 (Wolf-Bug 'graue Raender im Rahmen'): vorher
                  backgroundSize:contain → Letterbox-Bars wenn Bild-Aspect nicht
                  zum Rahmen-Aspect passt. Die dahinter liegende Blur-Backdrop
                  ist mit brightness(0.45) so dunkel, dass die Bars als „grau"
                  rauskommen. Jetzt: cover + center (mod kann via offsetX/Y
                  feintunen). Bild fuellt den Rahmen vollstaendig. */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${img!.url})`,
                backgroundSize: 'cover',
                backgroundPosition: `${cheesePosX}% ${cheesePosY}%`,
                backgroundRepeat: 'no-repeat',
                transform: `scale(${cheeseZoom})${img!.rotation ? ` rotate(${img!.rotation}deg)` : ''}`,
                transformOrigin: `${cheesePosX}% ${cheesePosY}%`,
                opacity: img!.opacity ?? 1,
                filter: imgFilter(img!),
                transition: 'background-position 0.4s ease, transform 0.4s ease',
              }} />
            </div>
          ) : (
            <div style={{
              position: 'absolute',
              top: 0, bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1,
              backgroundImage: `url(${img!.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              clipPath: (revealed && !cheeseOverlay) ? 'inset(8% 8% 8% 52% round 18px)' : undefined,
              animation: (revealed && !cheeseOverlay) ? undefined : 'fsExpand 1.2s var(--qq-ease-smooth) 0.2s both',
              transition: 'clip-path 0.8s var(--qq-ease-smooth), background-position 0.4s ease, transform 0.4s ease, right 0.5s ease',
              transform: `translate(${img!.offsetX ?? 0}%, ${img!.offsetY ?? 0}%) scale(${img!.scale ?? 1}) rotate(${img!.rotation ?? 0}deg)`,
              transformOrigin: 'center',
              opacity: img!.opacity ?? 1,
              filter: imgFilter(img!),
            }} />
          )}
          {/* Layer 3: vignette overlay.
              2026-04-30 v3: Portrait → vignette FULL-screen (statt left-half),
              damit der rechte Streifen denselben warmen dunklen Wash bekommt
              wie der linke Bildbereich. Sharp Foreground bleibt nur links.
              v3 round 5 (User-Bug 'Bild oben/unten minimal abgeschnitten'):
              Top/Bottom-Vignette deutlich reduziert (0.35/0.40 → 0.15/0.20),
              damit das Bild bis an die Kanten sichtbar bleibt. */}
          <div style={{
            position: cheeseFullscreen ? 'fixed' : 'absolute',
            inset: 0,
            zIndex: cheeseFullscreen ? 51 : 2,
            background: cheeseFullscreen
              ? 'linear-gradient(180deg, rgba(13,10,6,0.15) 0%, rgba(13,10,6,0.06) 30%, rgba(13,10,6,0.06) 70%, rgba(13,10,6,0.20) 100%)'
              : [
                'linear-gradient(90deg, rgba(13,10,6,0.92) 0%, rgba(13,10,6,0.78) 45%, rgba(13,10,6,0.45) 100%)',
                'linear-gradient(180deg, rgba(13,10,6,0.5) 0%, transparent 25%, transparent 70%, rgba(13,10,6,0.6) 100%)',
              ].join(', '),
            opacity: (revealed && !cheeseOverlay) ? 0.4 : 1,
            transition: 'opacity 0.8s ease',
          }} />
          {/* Layer 4: Bilderrahmen in Kategorie-Farbe (Wolf-Wunsch 2026-05-04).
              Dezenter Innen-Rahmen (kein full-bleed Border-Strich) um das Bild,
              damit es als „eingerahmtes Foto" liest statt zu bleeden. Bei
              Portrait-CHEESE umrahmt er nur die linke Bildhaelfte. */}
          {cheeseFullscreen && (
            <div aria-hidden style={{
              position: 'fixed',
              top: 'clamp(10px, 1.4cqh, 22px)',
              bottom: 'clamp(10px, 1.4cqh, 22px)',
              left: 'clamp(12px, 1.6cqw, 28px)',
              right: isCheesePortrait
                ? `calc(50% + clamp(6px, 0.8cqw, 14px))`
                : 'clamp(12px, 1.6cqw, 28px)',
              borderRadius: 22,
              border: `4px solid ${accent}`,
              boxShadow: `0 0 32px ${accent}55, inset 0 0 0 2px rgba(0,0,0,0.45), inset 0 0 20px rgba(0,0,0,0.35)`,
              pointerEvents: 'none',
              zIndex: 52,
              animation: 'contentReveal 0.7s var(--qq-ease-pop-fast) 0.15s both',
            }} />
          )}
        </>
        );
      })()}


      {/* Cutout floating image (bg-removed) */}
      {hasImg && img.layout === 'cutout' && (
        <img
          src={img.bgRemovedUrl || img.url}
          alt={isCheese ? (q.text || 'Question image') : ''}
          style={{
            position: 'absolute', zIndex: 3, pointerEvents: 'none',
            right: '8%', top: '15%',
            maxWidth: '35%', maxHeight: '70%',
            objectFit: 'contain',
            filter: `drop-shadow(0 16px 40px rgba(0,0,0,0.6))${imgFilter(img) ? ' ' + imgFilter(img) : ''}`,
            animation: imgAnim(img.animation, 'cutout', img.animDelay, img.animDuration),
            transform: `translate(${img.offsetX ?? 0}%, ${img.offsetY ?? 0}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`,
            opacity: img.opacity ?? 1,
          }}
        />
      )}
      {/* Cutout emojis — hidden when template overlay handles them */}
      {!hideCutouts && effectiveCutouts.map((c, i) => (
        <div key={i} style={{
          position: 'absolute', pointerEvents: 'none', zIndex: 3,
          top: c.top, bottom: c.bottom, left: c.left, right: c.right,
          fontSize: c.size, lineHeight: 1, userSelect: 'none',
          filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.5))',
          ['--r' as string]: `${c.rot}deg`,
          animation: c.alt ? `cfloata ${4 + i}s ease-in-out infinite` : `cfloat ${4 + i * 0.7}s ease-in-out infinite`,
        }}>
          {c.emoji}
        </div>
      ))}

      {/* Fireflies in Kategorie-Farbe — subtile Stimmung passend zum Thema */}
      <Fireflies color={`${accent}99`} />

      {/* ── CHEESE overlay cards (Phase 2 + Reveal) ── */}
      {/* 2026-05-05 v2 (Wolf-Bug): Cards warten auf imgReady damit Portrait-Layout
          nicht erst landscape-aligned reinpoppt und dann nach rechts springt. */}
      {(cheeseWithQuestion || isCheeseReveal) && imgReady && (
        <div style={{
          // 2026-04-30 v3: Bei Portrait-Foto wandert der Card-Container in den
          // rechten Bildschirm-Streifen (50% breit) und Card sitzt dort vertikal
          // mittig. Bei Landscape klassisch fullscreen + Card am unteren Rand.
          position: 'fixed',
          top: 0, bottom: 0,
          left: isCheesePortrait ? '50%' : 0,
          right: 0,
          zIndex: 52,
          display: 'flex', flexDirection: 'column',
          justifyContent: isCheesePortrait ? 'center' : 'flex-end',
          alignItems: 'center',
          // 2026-05-04 (Wolf): kleinere Raender auf der Schau-Mal-Seite
          // damit das Bild mehr Bildflaeche bekommt. Vorher: 40-92px Padding.
          padding: isCheesePortrait
            ? 'clamp(12px, 2cqh, 24px) clamp(12px, 1.6cqw, 24px)'
            : (revealed ? '20px 24px 16px' : '20px 24px clamp(28px, 4cqh, 48px)'),
          transition: 'padding 0.55s var(--qq-ease-bounce), left 0.5s ease',
          pointerEvents: 'none',
        }}>
          {/* 2026-05-12 (Slide-Boundary-System): Doppel-Badge weg. Das CHEESE-
              spezifische top-left-Badge ist entfernt — das globale Bottom-Left-
              Badge des QuestionView-Wrappers rendert sich auch im CHEESE-
              Kontext darueber (zIndex 60, sichtbar ueber Cheese-Overlay zIndex
              52). Konsistente Position auf allen Slides. */}
          {/* Timer ring — top right (matches non-CHEESE layout), fade out on reveal.
              v3 round 8 (User-Bug 'timer auch bei hellem hintergrund schwer
              sichtbar'): zusaetzlicher dunkler Kreis-Backdrop hinter dem
              Timer-Ring fuer Kontrast auf hellen Fotos. */}
          {stickyTimer && (
            <div style={{
              // 2026-05-12 (Slide-Boundary-System): clamps → --qq-safe-margin Token.
              position: 'fixed', top: 'var(--qq-safe-margin)', right: 'var(--qq-safe-margin)', zIndex: 70,
              animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.3s both',
              pointerEvents: revealed ? 'none' : 'auto',
              padding: 12, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(13,10,6,0.82) 55%, rgba(13,10,6,0.55) 78%, transparent 100%)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: `0 4px 22px rgba(0,0,0,0.45)`,
            }}>
              <BeamerTimer endsAt={stickyTimer.endsAt} durationSec={stickyTimer.duration} accent={accent} expireNow={timerExpiring} />
            </div>
          )}

          {/* Frosted question/answer card — bottom.
              POP-Transition: minHeight waechst dynamisch beim Reveal.
              Beim Reveal: Border + Glow in der Farbe des SCHNELLSTEN korrekten
              Teams (User-Wunsch 2026-04-28: konsistent mit Mucho/ZvZ wo der
              Sieger-Frame bunt ist). Wenn niemand richtig: Standard-Akzent. */}
          {(() => {
            // Schnellstes korrektes Team finden (für Reveal-Glow)
            const fastestColor = (() => {
              if (!isCheeseReveal) return null;
              const correctDE = (q.answer ?? '').trim().toLowerCase();
              const correctEN = (q.answerEn ?? '').trim().toLowerCase();
              const correctSet = [correctDE, correctEN].filter(Boolean);
              if (correctSet.length === 0) return null;
              const matchesAns = (sub: string) => {
                const ss = sub.trim().toLowerCase();
                if (ss.length < 2) return false;
                return correctSet.some(c => c === ss || ss.includes(c) || (c.length > 3 && c.includes(ss) && ss.length >= 3));
              };
              const earliest = [...s.answers]
                .filter(a => matchesAns(a.text))
                .sort((a, b) => a.submittedAt - b.submittedAt)[0];
              if (!earliest) return null;
              return s.teams.find(t => t.id === earliest.teamId)?.color ?? null;
            })();
            const revealGlowColor = fastestColor ?? '#22C55E';
            return (
          <div style={{
            position: 'relative',
            // 2026-04-30: Bei Reveal width:auto -> Card schrumpft auf Inhalt
            // (Antwort-Text + Avatare). User-Feedback: 'cheese reveal feld
            // dynamisch breit an text angepasst (ist extra breit aber da steht
            // nichts)'. Vor-Reveal weiter full-width fuer die Frage.
            // 2026-04-30 v3: Portrait-Mode → Card sitzt im rechten 50%-Streifen,
            // also schon eingeschraenkt im Container. width:100% reicht dort.
            // 2026-05-12 (Wolf 'in cheese mit horizont bild, wo fragecard
            // unten ist, mach die fragecard schmaler dass sie nicht mit badge
            // überlappt'): Bei Cheese-Landscape sitzt das Badge jetzt bottom-
            // left und die Frage-Card sitzt direkt darueber/daneben unten in
            // der Slide. maxWidth reduziert auf 1200 (war 1600) damit links
            // und rechts genug Platz fuer das Badge bleibt; marginInline:auto
            // haelt die Card horizontal zentriert wie bisher.
            width: isCheesePortrait ? '100%' : (isCheeseReveal ? 'auto' : 'calc(100% - clamp(40px, 6cqw, 96px))'),
            minWidth: isCheeseReveal && !isCheesePortrait ? 'clamp(360px, 50cqw, 720px)' : undefined,
            maxWidth: isCheesePortrait ? '100%' : (isCheeseReveal ? 'min(calc(100% - clamp(40px, 6cqw, 96px)), 1100px)' : 1200),
            marginInline: 'auto',
            // 2026-04-29 (User-Feedback): Reveal-Card ~25% flacher — vorher
            // verdeckte sie ~60% der Bildflaeche bei Picture-This-Bildern.
            minHeight: revealed
              ? (hasImg ? 'clamp(240px, 30cqh, 360px)' : 'clamp(180px, 22cqh, 260px)')
              : (hasImg ? 'clamp(120px, 16cqh, 200px)' : 'clamp(110px, 14cqh, 170px)'),
            background: 'rgba(13,10,6,0.38)',
            backdropFilter: 'blur(18px) saturate(1.25)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.25)',
            // Vor Reveal: kräftiger Kategorie-Glow wie bei MUCHO/ZvZ. (User-Wunsch
            // 2026-04-28: 'bei cheese darf die frage vor reveal umrandet sein
            // von kategorie farben glow wie bei anderen').
            border: `${isCheeseReveal ? 3 : 2.5}px solid ${isCheeseReveal ? `${revealGlowColor}cc` : `${accent}88`}`,
            borderRadius: 24,
            // Reveal-Padding kompakter (20 statt 28) damit das Bild oben mehr Platz behaelt.
            padding: isCheeseReveal ? '20px 48px' : '36px 56px',
            boxShadow: isCheeseReveal
              ? `0 0 0 1px ${revealGlowColor}55, 0 0 80px ${revealGlowColor}55, 0 0 32px ${revealGlowColor}88, 0 24px 80px rgba(0,0,0,0.5)`
              : `0 0 0 1px ${accent}33, 0 0 80px ${accent}33, 0 0 32px ${accent}55, 0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
            // 2026-05-05 (Wolf 'Cheese-Reveal-Card wiggelt beim Auftauchen,
            // wirkt chaotisch'): revealAnswerBam (scale+wiggle) entfernt —
            // die Card ist beim Reveal eh schon sichtbar (war im Question-
            // Mode bereits da), nur Inhalt aendert sich. Kein Pop-Effekt
            // nötig, Border-Color-Transition reicht als Reveal-Marker.
            // 2026-05-06 v6 (Wolf 'Cheese-Reveal: Card wiggelt heftig beim
            // Reveal-Start'): min-height + transform Transitions auf
            // ease-bounce sprangen ueber — die min-height-Aenderung
            // (~+120px beim Reveal) mit Bounce hat die Card sichtbar
            // wackeln lassen. Beide auf ease-smooth.
            animation: cheeseWithQuestion ? 'bQuestionIn 0.5s var(--qq-ease-bounce) 0.1s both' : 'none',
            transform: revealed ? 'scale(1)' : 'scale(0.985)',
            transformOrigin: 'center',
            transition: 'padding 0.7s var(--qq-ease-smooth), border-color 0.55s ease, min-height 0.7s var(--qq-ease-smooth), transform 0.7s var(--qq-ease-smooth), width 0.7s var(--qq-ease-smooth), min-width 0.7s var(--qq-ease-smooth), max-width 0.7s var(--qq-ease-smooth)',
            pointerEvents: 'auto',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            {/* Avatar-Reihe wurde 2026-05-04 v3 (Wolf-Feedback) RAUS aus der
                Card verlegt — sitzt jetzt als Flex-Sibling unter der Card im
                Overlay-Container. Damit landen die Avatare in der rechten
                Bildschirmhaelfte direkt unter der Fragecard (Portrait) bzw.
                unter der Card am unteren Rand (Landscape) statt halb in der
                Card-Unterkante zu kleben. Code: siehe direkt nach diesem
                Card-IIFE im Overlay-Container. */}

            {/* Category pill IN der Card entfernt — die Pill sitzt jetzt
                konsistent oben links wie bei den anderen Kategorien. */}

            {/* Question text — vor Reveal voll, beim Reveal kleiner + gedimmt
                (2026-04-29: damit Reveal-Card flacher wird und das Bild
                oberhalb sichtbar bleibt).
                2026-05-07 v2 (Wolf 'Buchstaben wiggeln sichtbar zwischen
                Question und Reveal'): font-size + margin-bottom in der
                Transition liessen den Text waehrend des Uebergangs neu
                fliessen → jeder Frame andere Letter-Positionen = Wiggle.
                Fix: key enthaelt jetzt isCheeseReveal → Re-Mount bei
                Reveal-Start, neuer Element mit neuer font-size sofort,
                kein animiertes Resize mehr. Transition raus, nur
                langFadeIn als Entry-Animation. */}
            <div key={`cheese-${lang}-${isCheeseReveal ? 'rev' : 'q'}`} style={{
              fontSize: isCheeseReveal
                ? 'clamp(20px, 2.6cqw, 36px)'
                : (qText.length > 120 ? 'clamp(32px, 4cqw, 60px)' : 'clamp(42px, 5.8cqw, 84px)'),
              fontWeight: 900, lineHeight: 1.22,
              color: '#F1F5F9',
              marginBottom: isCheeseReveal ? 8 : 0,
              animation: 'langFadeIn 0.4s ease both',
              opacity: isCheeseReveal ? 0.55 : 1,
            }}>
              {lang === 'en' && q.textEn ? q.textEn : q.text}
            </div>

            {/* Revealed answer.
                2026-05-06 v6 (Wolf 'Cheese-Reveal: Buchstaben wiggeln stark
                beim Reveal-Start, sieht unprofessionell aus'): revealAnswerBam
                (scale 0.8→1.04→0.98→1, bouncy) durch langFadeIn ersetzt — nur
                opacity + 8px translateY, kein Wiggle. Konsistent zum Question-
                Text drueber, der bereits langFadeIn nutzt. */}
            {isCheeseReveal && s.revealedAnswer && (
              <div style={{
                position: 'relative', overflow: 'hidden',
                fontSize: 'clamp(28px, 3.8cqw, 56px)', fontWeight: 900,
                color: '#4ADE80',
                animation: 'langFadeIn 0.5s var(--qq-ease-out-cubic) 0.15s both',
                textShadow: '0 0 30px rgba(34,197,94,0.4)',
                marginBottom: 6,
              }}>
                <div style={{
                  position: 'absolute', top: 0, width: '60%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                  animation: 'revealShimmer 0.8s ease 0.5s both',
                  pointerEvents: 'none',
                }} />
                {s.revealedAnswer}
              </div>
            )}

            {/* Alle richtigen Teams mit Zeit — analog zu MUCHO/ZEHN_VON_ZEHN */}
            {/* 2026-05-02 (Phone-Beamer-Sync-Audit): strict-Match durch
                Backend-Truth (currentQuestionWinners) ersetzt - sonst fehlten
                Schreibfehler-akzeptierte Avatare in der Frosted-Card. */}
            {isCheeseReveal && (() => {
              const winnerSet = new Set(s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []));
              const correctAnswers = [...s.answers]
                .filter(a => winnerSet.has(a.teamId))
                .sort((a, b) => a.submittedAt - b.submittedAt);
              if (correctAnswers.length === 0) {
                return (
                  <div style={{
                    marginTop: 14,
                    fontSize: 'clamp(16px, 1.9cqw, 24px)', fontWeight: 900,
                    color: '#94a3b8',
                    animation: 'revealWinnerIn 0.5s ease 0.4s both',
                  }}>
                    {lang === 'en' ? 'No team got it right.' : 'Kein Team hatte die richtige Antwort.'}
                  </div>
                );
              }
              const t0 = s.timerEndsAt
                ? s.timerEndsAt - (s.timerDurationSec * 1000)
                : (correctAnswers[0].submittedAt);
              const winnerTeam = s.teams.find(t => t.id === correctAnswers[0].teamId);
              const multiCorrect = correctAnswers.length > 1;
              const winMsg = multiCorrect
                ? (lang === 'en' ? 'recognized it fastest!' : 'hat es am schnellsten erkannt!')
                : (lang === 'en' ? 'got it right!' : 'hat es erkannt!');
              return (
                <>
                <div style={{
                  marginTop: 8,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                  gap: 12, flexWrap: 'wrap', width: '100%',
                }}>
                  {correctAnswers.map((a, i) => {
                    const team = s.teams.find(t => t.id === a.teamId);
                    if (!team) return null;
                    const timeSec = Math.max(0, (a.submittedAt - t0) / 1000);
                    const isFastest = i === 0;
                    // 2026-05-06 (Wolf 'schnellstes Team als letztes — habe das
                    // schon 2x als Aufgabe geschrieben'): Cheese-Overlay-IIFE
                    // hatte popDelay = i*850+200 (fastest first). Umgedreht:
                    // (N-1-i)*850+200 → slowest dropt zuerst, fastest zuletzt.
                    // Synchron zur Sound-Cascade (letzte Note = playRevealHighlight
                    // auf fastest team) und zur WinnerCard-Slam-Animation.
                    const popDelay = (correctAnswers.length - 1 - i) * 850 + 200;
                    return (
                      <div key={a.teamId} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        animation: `top5RowSlideIn 0.55s var(--qq-ease-out-cubic) ${popDelay}ms both`,
                      }}>
                        <div style={{
                          position: 'relative',
                          display: 'inline-block',
                          animation: isFastest ? `celebShake 0.6s ease ${popDelay + 600}ms both` : 'none',
                        }}>
                          <QQTeamAvatar
                            avatarId={team.avatarId} teamEmoji={team.emoji}
                            // 2026-04-29: Avatare bei Reveal etwas kleiner — Card flacher.
                            size={isFastest ? 'clamp(60px, 6.8cqw, 92px)' : 'clamp(46px, 5.2cqw, 70px)'}
                            style={{
                              border: isFastest ? '4px solid #EC4899' : 'none',
                              boxShadow: isFastest
                                ? '0 0 28px rgba(236,72,153,0.65), 0 4px 14px rgba(0,0,0,0.45)'
                                : '0 4px 12px rgba(0,0,0,0.4)',
                            }}
                          />
                        </div>
                        <span style={{
                          padding: '3px 10px', borderRadius: 999,
                          background: isFastest ? 'rgba(236,72,153,0.22)' : 'rgba(0,0,0,0.55)',
                          border: isFastest ? '1.5px solid rgba(236,72,153,0.7)' : '1px solid rgba(255,255,255,0.15)',
                          color: isFastest ? '#EC4899' : '#cbd5e1',
                          fontWeight: 900,
                          fontSize: 'clamp(15px, 1.6cqw, 20px)',
                          whiteSpace: 'nowrap',
                        }}>
                          {timeSec.toFixed(1)}s
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* 2026-05-06 v3 (Wolf 'gewinnercard ausserhalb der avatar
                    card unten drunter'): Cheese-WinnerCard wurde aus der
                    frosted-card heraus genommen und als Sibling unter dem
                    cheese-overlay-Container plaziert (siehe weiter unten,
                    nach dem Frosted-Card-IIFE). */}
                </>
              );
            })()}

          </div>
            );
          })()}

          {/* Cheese WinnerCard — Sibling UNTER der Frosted-Card.
              2026-05-06 v3 (Wolf 'gewinnercard ausserhalb der avatar card
              unten drunter, sound an die card anpassen ton kommt zu spaet
              bzw card zu frueh').
              Timing-Sync: Climax-Sound feuert bei N×850 + 840ms. Card-Anim
              ist 0.6s; Anim-Peak (max scale/glow ~70%) ist bei card-start
              + 420ms. Damit Card-Peak und Sound zusammenfallen:
                card-start = sound-time − 420 = N×850 + 420ms.
              Card faded leicht ein, knallt im Peak mit dem Climax-Sound. */}
          {isCheeseReveal && (() => {
            const winnerSet = new Set(s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []));
            const correctAnswers = [...s.answers]
              .filter(a => winnerSet.has(a.teamId))
              .sort((a, b) => a.submittedAt - b.submittedAt);
            if (correctAnswers.length === 0) return null;
            const winnerTeam = s.teams.find(t => t.id === correctAnswers[0].teamId);
            if (!winnerTeam) return null;
            const multiCorrect = correctAnswers.length > 1;
            const winMsg = multiCorrect
              ? (lang === 'en' ? 'recognized it fastest!' : 'hat es am schnellsten erkannt!')
              : (lang === 'en' ? 'got it right!' : 'hat es erkannt!');
            const cardDelaySec = (correctAnswers.length * 850 + 420) / 1000;
            return (
              <div style={{
                pointerEvents: 'auto',
                marginTop: 'clamp(10px, 1.4cqh, 18px)',
                display: 'inline-flex', alignItems: 'center',
                gap: 'clamp(12px, 1.6cqw, 20px)',
                padding: 'clamp(10px, 1.4cqh, 16px) clamp(20px, 2.4cqw, 32px)',
                borderRadius: 999,
                background: `linear-gradient(135deg, ${winnerTeam.color}33, ${winnerTeam.color}10)`,
                border: `2.5px solid ${winnerTeam.color}aa`,
                boxShadow: `0 0 36px ${winnerTeam.color}55, 0 4px 14px rgba(0,0,0,0.45)`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                animation: `revealWinnerIn 0.6s var(--qq-ease-bounce) ${cardDelaySec}s both`,
              }}>
                {/* 2026-05-13 (Wolf 'in cheese ist im gewinnerbadge ein pokal,
                    das ist sonst nie, fuer konsistenz weg'): freistehender 🏆-
                    Glyph direkt vor dem Avatar entfernt. Andere Modi nutzen den
                    Pokal hoechstens als Eyebrow-Label-Praefix ("🏆 Rundensieger"),
                    nicht als eigenes Element in der Winner-Pille. */}
                <QQTeamAvatar
                  avatarId={winnerTeam.avatarId}
                  teamEmoji={winnerTeam.emoji}
                  size={'clamp(40px, 4cqw, 56px)'}
                  style={{ flexShrink: 0, boxShadow: `0 0 18px ${winnerTeam.color}88` }}
                />
                <div style={{
                  fontSize: 'clamp(22px, 2.4cqw, 32px)', fontWeight: 900,
                  color: winnerTeam.color, lineHeight: 1.1,
                  textShadow: `0 0 18px ${winnerTeam.color}55`,
                }}>
                  {teamDisplayName(winnerTeam.name, true)}
                </div>
                <div style={{
                  fontSize: 'clamp(15px, 1.6cqw, 22px)', fontWeight: 800,
                  color: '#cbd5e1', lineHeight: 1.2,
                }}>
                  {winMsg}
                </div>
              </div>
            );
          })()}

          {/* Avatar-Progress-Reihe — 2026-05-04 v3 (Wolf-Feedback):
              RAUS aus der Card als Flex-/Absolute-Sibling im Overlay-Container.
              - PORTRAIT (Bild links, Card rechts): Flex-Flow-Sibling unter dem Card.
                Parent ist flexCol+justify-center → Card + Avatars werden als Block
                vertikal mittig zentriert, Avatare sitzen direkt UNTER der Card im
                rechten Bildschirmstreifen.
              - LANDSCAPE (Card unten am Rand): absolute oben mittig — sonst wuerden
                Avatare unter der bottom-aligned Card aus dem Bildschirm fallen. */}
          {!revealed && s.teams.length > 0 && (() => {
            const tc = s.teams.length;
            // 2026-05-05 (Wolf 'Cheese-Portrait Avatare zu klein, fast unter
            // ganze Frage-Card passen lassen'): Portrait-Sizes fast verdoppelt
            // (40/46/52 → 60/72/84) damit sie aus Beamer-Distanz erkennbar
            // sind und die rechte Halbflaeche unter der Frage-Card sinnvoll
            // ausnutzen.
            // 2026-05-13 (Wolf 'Cheese horizontal: avatare gleich gross wie
            // bei normalen Questions, nur Position bleibt'): Landscape-Sizes
            // (48/54/60) waren kleiner als Question-Footer (80/88/96) →
            // angeglichen. Cheese-Portrait bleibt anders, weil Card+Avatare
            // dort einen rechten Bildschirmstreifen teilen.
            const av = isCheesePortrait
              ? (tc > 6 ? 60 : tc > 4 ? 72 : 84)
              : (tc > 6 ? 80 : tc > 4 ? 88 : 96);
            // 2026-05-09 (Wolf 'Footer-Avatare zu eng'): Gap vergrössert
            // damit grüner Glow sichtbar atmet, nicht ineinander fließt.
            const gap = isCheesePortrait
              ? (tc > 6 ? 14 : tc > 4 ? 18 : 22)
              : (tc > 6 ? 12 : tc > 4 ? 15 : 18);
            const portraitFlow = {
              marginTop: 'clamp(10px, 1.6cqh, 22px)' as const,
            };
            const landscapeAbs = {
              position: 'absolute' as const,
              top: 'clamp(28px, 4cqh, 60px)' as const,
              left: 0, right: 0,
            };
            return (
              <div style={{
                ...(isCheesePortrait ? portraitFlow : landscapeAbs),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap, flexWrap: 'wrap',
                pointerEvents: 'none', zIndex: 65,
                animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) 0.4s both',
              }}>
                {/* Mini-Progress-Text "X/Y TEAMS" zwischen Card-Unterkante und
                    Avataren — nur sichtbar solange nicht alle dran sind. */}
                {!s.allAnswered && (
                  <div style={{
                    width: '100%', textAlign: 'center',
                    fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 900,
                    color: 'rgba(226,232,240,0.85)',
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    marginBottom: -2,
                  }}>
                    {`${s.answers.length}/${s.teams.length} Teams`}
                  </div>
                )}
                {s.teams.map(tm => {
                  const answered = s.answers.some(a => a.teamId === tm.id);
                  return (
                    <div key={tm.id} style={{
                      position: 'relative',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      opacity: answered ? 1 : 0.55,
                      filter: answered
                        ? 'drop-shadow(0 0 10px rgba(34,197,94,0.6)) drop-shadow(0 0 3px rgba(34,197,94,0.4))'
                        : 'grayscale(0.4)',
                      transition: 'opacity 0.4s ease, filter 0.4s ease',
                    }}>
                      <div style={{
                        borderRadius: '50%',
                        boxShadow: answered ? '0 0 0 3px #22C55E' : 'none',
                        transition: 'box-shadow 0.45s ease',
                        display: 'inline-flex',
                      }}>
                        <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={av} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Main content (non-CHEESE or hidden during CHEESE overlay) */}
      <div style={{
        flex: 1, display: cheeseOverlay ? 'none' : 'flex', gap: 0,
        flexDirection: (hasImg && img.layout === 'window-left') ? 'row-reverse' : 'row',
        animation: 'contentReveal 0.35s var(--qq-ease-pop-fast) both',
      }}>
        {/* ── Main content — full width, vertically distributed ──
            Final approach (2026-04-28-v4):
            - space-between für MUCHO/ZvZ Reveal: Frage-Card top-anchored,
              Winner-Card (last item) bottom-anchored, dazwischen verteilen
              sich Options/Voter-Reihe natürlich.
            - Hinzu kommt ein <Spacer flex:1/> zwischen Voter-Avataren und
              Winner-Card → der Spacer absorbiert Layout-Änderungen, sodass
              upper Cards stabil stehen wenn Winner erscheint.
            - Bei nicht-revealed (active) center bleibt für saubere Mitte.
            Vertikales overflow visible erlaubt, dass Card-Glow + Winner-Border
            nicht durch overflow:hidden geclipped werden. */}
        {(() => {
          // 2026-04-29 (User-Feedback): Bei HotPotato mit vielen genannten
          // Antworten kollidiert das Chip-Layout (bottom:16, wrap-up) mit der
          // mittig-zentrierten Frage-Card. Ab 12 Chips Frage hochschieben
          // (justifyContent: flex-start) damit unten Platz für den Chip-Block
          // bleibt. Chips skalieren ihrerseits in HotPotatoBeamerView.
          const isHotPotatoActive = q.category === 'BUNTE_TUETE'
            && q.bunteTuete?.kind === 'hotPotato' && !revealed;
          const hpUsedCount = (s.hotPotatoUsedAnswers?.length ?? 0);
          // 2026-04-30 v2 (User-Feedback): Trigger 12->16 fuer ruhigeres
          // mid-game-Layout (selteneres Snap-down). Transition wird in der
          // Card-Style 0.4s -> 0.7s entspannter.
          const hpCompact = isHotPotatoActive && hpUsedCount > 16;
          // 2026-05-05 v3 (Wolf-Bug 'Luecke zwischen Card und Chips'): Chips
          // sitzen jetzt im natuerlichen Flex-Flow direkt unter der Card
          // (HotPotatoBeamerView ohne position:absolute). Card + Chip-Block
          // werden als 1 Block vertikal mittig zentriert, mit definiertem Gap
          // dazwischen. Keine Luecke mehr, kein Snap, kein paddingBottom-Hack.
          // 2026-05-12 (Wolf 'komisch ueberlappend' in HP-Active):
          // innerJustify center erzeugte symmetrischen Overflow wenn HP-
          // Content zu hoch war — Q-Card oben + Chips + Active-Card-Slot +
          // Eliminated wuchsen in beide Richtungen, Chips klebten an Q-Card-
          // Bottom. Bei HotPotato Active jetzt flex-start: Q-Card pinned oben,
          // Chips folgen mit gap, Active-Card-Slot weiter unten. Kein
          // symmetrisches Overspill mehr. Andere Kategorien bleiben bei
          // center weil sie weniger vertikale Stacks haben.
          const innerJustify = isHotPotatoActive ? 'flex-start' : 'center';
          const innerGap = isHotPotatoActive ? 'clamp(24px, 3.2cqh, 44px)' : 0;
          return (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          // 2026-05-12 (Wolf 'kategorie-badge nach links UNTEN, fragecard oben');
          // 2026-05-12 v2 (Wolf 'safe-margin im ganzen quiz'): jede Achse
          // floor() auf var(--qq-safe-margin) um Mindest-Rand zu garantieren.
          padding: isHotPotatoActive
            ? 'max(var(--qq-safe-margin), clamp(36px, 5cqh, 64px)) max(var(--qq-safe-margin), clamp(28px, 4cqw, 64px)) max(var(--qq-safe-margin), clamp(70px, 8cqh, 100px))'
            : 'max(var(--qq-safe-margin), clamp(40px, 5.5cqh, 70px)) max(var(--qq-safe-margin), clamp(28px, 4cqw, 64px)) max(var(--qq-safe-margin), clamp(70px, 8cqh, 100px))',
          alignItems: 'center', position: 'relative', zIndex: 5,
          // 2026-05-05 (Wolf-Bug 'Scrollbar rechts auf /beamer'): overflow
          // hart auf hidden — Beamer darf NIE scrollen, lieber Inhalt clippen
          // (overflowY:visible konnte vorher Body-Level-Scroll triggern wenn
          // Card+Voters+Winner zusammen ueber 100cqh wuchsen).
          overflow: 'hidden',
        }}>

          {/* 2026-05-12 (Wolf 'kategorie badge nach links unten, fragecard
              oben'): Top-Bar getrennt — Timer oben-rechts (unveraendert),
              Badge in eigene Bottom-Left-Container (siehe unten am Ende von
              dem Wrapper). Vorher saßen beide in einer absoluten Top-Bar.
              Diese Wrapper-Div haelt jetzt nur noch den Top-Right Timer. */}
          <div style={{
            position: 'absolute',
            // 2026-05-12 (Slide-Boundary-System): Top/Left/Right nutzen jetzt
            // den globalen --qq-safe-margin Token statt eigener clamp-Werte.
            top: 'var(--qq-safe-margin)',
            left: 'var(--qq-safe-margin)',
            right: 'var(--qq-safe-margin)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
            gap: 16,
            zIndex: 60,
            pointerEvents: 'none',
          }}>
            {/* Timer auf der rechten Seite — versteckt fuer HotPotato (eigener
                per-Turn-Timer in HotPotatoBeamerView).
                2026-05-12: Badge ist aus dieser Top-Bar raus (jetzt unten links). */}
            {stickyTimer && !(q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') && (
              <div style={{
                pointerEvents: revealed ? 'none' : 'auto',
                flexShrink: 0,
              }}>
                {/* 2026-05-04 v3 (Wolf): stickyTimer haelt das letzte gueltige
                    endsAt ~1s nachdem das Backend timerEndsAt nullt — sonst
                    unmountet die Component bevor qqTimerOutro durchlaeuft.
                    timerExpiring=true sobald Original-Prop weg ODER revealed. */}
                <BeamerTimer endsAt={stickyTimer.endsAt} durationSec={stickyTimer.duration} accent={accent} expireNow={timerExpiring} />
              </div>
            )}
          </div>
          {/* 2026-05-12 v3 (Wolf 'kartoffel unten links — ganz weglassen die
              badge'): Kategorie-Badge in QuestionView komplett entfernt.
              Kategorie wird via PhaseIntro vor jeder Frage prominent
              gezeigt (Title + Sub-Line). Question-Card-Border ist
              zusaetzlich in Kategorie-Farbe. Kein redundantes Badge im
              QuestionView mehr. */}

          {/* 2026-04-30: Inner-Content-Wrapper mit flex:1.
              2026-05-12 (Audit-C 'AutoFit entsorgt'): AutoFitContent war
              eine fragile Zwischenloesung — CSS zoom-Property liest
              scrollHeight bereits skaliert zurueck, Force-Reflow half nicht
              zuverlaessig, nested zoom+SlideStage transform produzierte
              Browser-Quirks. Single-Source-of-Truth ist jetzt SlideStage
              (Phase 1 Option A, ?stage=1). Bei Stage AUS: Layout-Content
              im Standard-Flex-Flow mit min-height:0 + overflow:hidden.
              Bei Stage AN: SlideStage haelt Layout immer in 1080px Canvas. */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            justifyContent: innerJustify,
            gap: innerGap,
            alignItems: 'center', width: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}>

          {/* Question card — KEIN Resize mehr zwischen Question und Reveal
              (User-Feedback 2026-04-28: 'cards zappelig beim kleiner werden').
              Card und Text behalten ihre Größe, nur Opacity dimmt (1 → 0.45)
              und Padding bleibt konstant. So gibt's GAR keine Resize-Bewegung
              mehr — der Reveal-Indikator ist allein das Dimmen + die neuen
              Avatar/Answer-Cards die darunter erscheinen.
              2026-04-29 (User-Feedback): Bei HotPotato mit vielen Chips
              (hpCompact) wird die Card flacher + Text kleiner, damit unten
              Platz fuer den Chip-Block bleibt. */}
          {(() => {
            // 2026-05-07 (Layout-Audit): horizontal-padding clamp(110-180) →
            // clamp(60-120). Vorher: Card 1400 breit aber bis 360 Innen-Padding
            // → nur 1040px Textbreite, Frage wirkte klein. Jetzt 240px max
            // Innen-Padding → ~1160px Text bei voller Breite.
            const cardPadding = hpCompact
              ? 'clamp(10px, 1.4cqh, 18px) clamp(60px, 8cqw, 120px) clamp(10px, 1.4cqh, 18px)'
              : 'clamp(18px, 2.6cqh, 32px) clamp(60px, 8cqw, 120px) clamp(18px, 2.6cqh, 32px)';
            const cardMarginBottom = hpCompact ? 'clamp(8px, 1.2cqh, 16px)' : 'clamp(16px, 2.2cqh, 32px)';
            // v3 round 11 (User-Wunsch 'textgroesse muss nicht zwangsweise
            // kleiner werden'): Font-Size bleibt voll, nur Padding/Margin
            // werden im hpCompact-Modus kleiner. Card-Shift uebernimmt das
            // Platzproblem.
            const cardFontSize = qFontSize;
            // 2026-05-12 (Audit-A 'Dead-Code chipShiftVh entfernt'): die
            // chipShiftVh-Variable war seit 2026-05-07 immer 0 (Comment
            // beschrieb Legacy aus 2026-04-29 als Chips position:absolute
            // waren). Plus 'vh'-Einheit nach cqh-Migration uebersehen.
            // Komplett raus — kein conditional transform, keine Transition,
            // keine willChange. Vereinfacht den Wrapper.
            return (
              <div style={{
                width: '100%', maxWidth: 1400,
                flexShrink: 0,
              }}>
                <div style={{
                  background: cardBg,
                  border: `2.5px solid ${revealed ? `${accent}55` : `${accent}88`}`,
                  borderRadius: 24,
                  boxShadow: revealed
                    ? `0 0 0 1px ${accent}22, 0 0 50px ${accent}22, 0 0 22px ${accent}33, 0 8px 28px rgba(0,0,0,0.4)`
                    : `0 0 0 1px ${accent}33, 0 0 80px ${accent}33, 0 0 32px ${accent}55, 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
                  padding: cardPadding,
                  marginBottom: cardMarginBottom,
                  width: '100%',
                  textAlign: 'center',
                  animation: 'bQuestionIn 0.5s var(--qq-ease-bounce) both',
                  // 2026-04-30 v2: padding/margin-Transition 0.4s -> 0.7s
                  // entspannt, damit hpCompact-Snap weniger hektisch wirkt.
                  // 2026-05-02 (App-Designer-Audit B4): opacity-Dim mit 0.45s Delay,
                  // damit zuerst die Voter-Cascade rausschwingen kann (laeuft 0.5s)
                  // bevor die Frage-Card transparent wird.
                  transition: 'box-shadow 0.55s ease, border-color 0.55s ease, opacity 0.4s ease 0.45s, padding 0.7s var(--qq-ease-smooth), margin-bottom 0.7s var(--qq-ease-smooth)',
                  opacity: revealed ? 0.55 : 1,
                }}>
                  {/* 2026-05-07 (Audit P0): font-size-transition liess Buchstaben
                      bei qFontSize/hpCompact-Wechsel sichtbar wandern. Key-Remount
                      macht den Wechsel atomic, langFadeIn als saubere Entry-Anim. */}
                  <div key={`${lang}-${cardFontSize}`} style={{
                    fontSize: cardFontSize,
                    fontWeight: 900, lineHeight: 1.22,
                    color: '#F1F5F9',
                    animation: 'langFadeIn 0.4s ease both',
                  }}>
                    {qText}
                  </div>
                </div>
              </div>
            );
          })()}


          {/* Mobile-Hint („📱 Antwort auf dem Handy") entfernt 2026-04-26:
              Teams haben bereits die Eingabe-UI auf ihren Geraeten — der
              Beamer-Hint zielte auf niemanden, der ihn lesen muss. Die
              Avatare-mit-Haekchen-Reihe (z.B. bei Cheese) zeigt die
              Antwort-Progress visueller. */}

          {/* BUNTE_TÜTE order — Items während QUESTION_ACTIVE sichtbar
              (Teams sortieren am Handy, Publikum muss wissen worum es geht) */}
          {!revealed && q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'order' && (() => {
            const btt = q.bunteTuete as any;
            const items: string[] = (lang === 'en' && btt.itemsEn?.length) ? btt.itemsEn : (btt.items ?? []);
            const criteria: string | undefined = (lang === 'en' && btt.criteriaEn) ? btt.criteriaEn : btt.criteria;
            if (items.length === 0) return null;
            const cols = Math.min(items.length, items.length <= 4 ? items.length : items.length === 5 ? 5 : 3);
            return (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 14,
                width: '100%', maxWidth: 1400, marginBottom: 16,
                animation: 'contentReveal 0.35s var(--qq-ease-pop-fast) 0.1s both',
              }}>
                {criteria && (
                  <div style={{
                    fontSize: 'clamp(14px, 1.5cqw, 22px)', fontWeight: 900,
                    color: '#EC4899', letterSpacing: '0.1em', textTransform: 'uppercase',
                    textAlign: 'center',
                  }}>
                    {lang === 'en' ? `Sort ${criteria}` : `Sortiert ${criteria}`}
                  </div>
                )}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gap: 14,
                }}>
                  {items.map((item, i) => (
                    <div key={i} style={{
                      borderRadius: 16, padding: '22px 24px',
                      background: cardBg,
                      border: '2px solid rgba(236,72,153,0.4)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'clamp(20px, 2.4cqw, 34px)', fontWeight: 900, color: '#F1F5F9',
                      textAlign: 'center', lineHeight: 1.25,
                      minHeight: 80,
                      animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.1 + i * 0.06}s both`,
                    }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* MUCHO: 2-Akt-Reveal (Akt 1 Voter-Steps, Akt 2 Lock via Doppelblink) */}
          {q.options && q.category === 'MUCHO' && (
            <MuchoOptionsReveal
              options={q.options}
              optionsEn={q.optionsEn}
              correctOptionIndex={q.correctOptionIndex}
              optionImages={q.optionImages}
              answers={s.answers}
              teams={s.teams}
              lang={lang}
              cardBg={cardBg}
              timerEndsAt={s.timerEndsAt}
              timerDurationSec={s.timerDurationSec}
              revealStep={revealed ? s.muchoRevealStep : 0}
            />
          )}

          {/* ZEHN_VON_ZEHN: Options-Grid. Top-Bet-Chips haengen an der unteren
              Card-Linie (analog MUCHO-Reveal) — nicht mehr im Card-Inhalt. */}
          {q.options && q.category === 'ZEHN_VON_ZEHN' && (() => {
            // Fallback auf frueheste submittedAt, weil timerEndsAt zum Reveal
            // bereits null ist → ohne Fallback keine Zeit-Anzeige.
            const earliestSubmit = s.answers.length > 0
              ? Math.min(...s.answers.map(a => a.submittedAt))
              : null;
            const t0 = s.timerEndsAt && s.timerDurationSec
              ? s.timerEndsAt - s.timerDurationSec * 1000
              : earliestSubmit;
            // Analog Mucho: kompakt waehrend QUESTION_ACTIVE, Rows ziehen sich
            // smooth auseinander sobald Top-Bet-Chips einfliegen (zvzStep>=1).
            const expandedLayout = zvzStep >= 1;
            // Wenn auf einer Option viele Top-Bets liegen (4+ Teams gleicher
            // Höchstwert), brauchen wir mehr Platz unter den Cards damit die
            // Avatare nicht in die nächste Reihe rutschen.
            const maxChips = Math.max(0, ...zvzHighestPerOption.map(h => h?.teamIds?.length ?? 0));
            const heavyChips = maxChips >= 4;
            return (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              columnGap: 18,
              // 2026-04-30 v3 (User-Bug): Avatare am Voter-Grid-Tile-Boden
              // wurden abgeschnitten weil paddingBottom zu knapp. Werte
              // raufgesetzt: heavyChips 96→140, leicht 62→100. Avatare
              // (Hängen unter dem Tile) brauchen genug Luft.
              rowGap: expandedLayout ? (heavyChips ? 'clamp(140px, 17cqh, 200px)' : 'clamp(100px, 12cqh, 140px)') : 18,
              paddingBottom: expandedLayout ? (heavyChips ? 'clamp(130px, 14cqh, 180px)' : 'clamp(100px, 11cqh, 140px)') : 0,
              // 2026-05-10 (Wolf-Live-Test L9 '10v10 unten viel Platz, Cards
              // nach oben gequetscht'): minHeight + paddingTop damit Cards
              // vertikal-mittig statt top-aligned sitzen. Nutzt verfügbaren
              // Platz unter der Question-Card aus.
              minHeight: 'clamp(280px, 38cqh, 460px)',
              alignContent: 'center',
              marginTop: 16,
              marginBottom: 16,
              width: '100%', maxWidth: 1400,
              animation: 'contentReveal 0.35s var(--qq-ease-pop-fast) 0.1s both',
              // 2026-04-30 v2: 0.6s → 0.9s entspanntes Easing analog MUCHO.
              transition: 'row-gap 0.9s var(--qq-ease-smooth), padding-bottom 0.9s var(--qq-ease-smooth)',
            }}>
              {q.options.map((opt, i) => {
                const optImg = q.optionImages?.[i];
                const isCorrect = zvzLocked && i === q.correctOptionIndex;
                const isWrong = zvzLocked && i !== q.correctOptionIndex;
                // 2026-05-09 v2 (Wolf): Plain-Number als großer Text in
                // Option-Color statt Box+Keycap-Emoji.
                const label = `${i + 1}`;
                const optColor = accent;
                const optText = lang === 'en' && q.optionsEn?.[i] ? q.optionsEn[i] : opt;
                const highestForOpt = zvzHighestPerOption[i];
                const highestIdsForOpt = new Set(highestForOpt?.teamIds ?? []);
                // Top-Bets inkl. submittedAt fuer Tiebreaker-Anzeige
                const highestBets = s.answers
                  .map(a => {
                    const team = s.teams.find(t => t.id === a.teamId);
                    if (!team || !highestIdsForOpt.has(team.id)) return null;
                    const pts = (a.text.split(',').map(n => Number(n) || 0))[i] ?? 0;
                    return pts > 0 ? { team, pts, submittedAt: a.submittedAt } : null;
                  })
                  .filter((x): x is { team: NonNullable<ReturnType<typeof s.teams.find>>; pts: number; submittedAt: number } => !!x)
                  .sort((a, b) => a.submittedAt - b.submittedAt);
                const highestVisibleOpt = zvzStep >= 1 && zvzRevealed.has(i);
                // Blitz + Zeit NUR bei Tiebreak (mehrere Top-Bets mit gleichen Hoechstpunkten
                // auf der korrekten Option). Solo-Top-Bet braucht keinen Speed-Indikator —
                // der Chip mit Goldrand reicht.
                const showTimePills = isCorrect && highestBets.length > 1;
                return (
                  <div key={i} style={{ position: 'relative', display: 'flex', height: '100%' }}>
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      // 2026-04-28: User-Wunsch — alle 3 ZvZ-Cards gleich hoch.
                      // Wenn eine Option 2-zeilig wird, soll der Rest mitwachsen,
                      // sonst wirken die Cards inkonsistent. flex:1 + height:100%
                      // zwingt die Inner-Card auf Row-Höhe.
                      flex: 1,
                      // 2026-05-09 (Wolf 'Mini-Sprung'): box-sizing border-box
                      // + einheitliche 3px-Border verhindert Layout-Shift wenn
                      // Sieger-Card kommt (war 2/3/2 = +2px höher → andere Cards
                      // schoben mit).
                      boxSizing: 'border-box',
                      borderRadius: 24, padding: '20px 24px',
                      background: isCorrect ? 'rgba(34,197,94,0.2)' : cardBg,
                      border: isCorrect ? '3px solid #22C55E' : isWrong ? `3px solid rgba(255,255,255,0.06)` : `3px solid ${optColor}55`,
                      boxShadow: isCorrect
                        ? '0 0 40px rgba(34,197,94,0.35), 0 0 80px rgba(34,197,94,0.15)'
                        : `0 4px 16px rgba(0,0,0,0.3)`,
                      display: 'flex', alignItems: 'center', gap: 16,
                      transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
                      animation: isCorrect
                        ? 'revealDoubleBlink 1.1s ease both'
                        : isWrong
                          ? 'revealWrongDim 0.4s ease 0.15s both'
                          : `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.1 + i * 0.08}s both`,
                    }}>
                      {optImg?.url && (
                        <img src={optImg.url} alt="" style={{
                          position: 'absolute', inset: 0, width: '100%', height: '100%',
                          objectFit: optImg.fit ?? 'cover', opacity: optImg.opacity ?? 0.4,
                          pointerEvents: 'none',
                        }} />
                      )}
                      {optImg?.url && (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)', pointerEvents: 'none' }} />
                      )}
                      {/* 2026-05-09 v2 (Wolf): Box weg, große Zahl in
                          Option-Color statt Container-Box. Bei isCorrect
                          grün, bei isWrong gedimmt grau, sonst optColor. */}
                      <div style={{
                        position: 'relative', zIndex: 1,
                        width: 56, height: 56,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 56, fontWeight: 900, flexShrink: 0,
                        color: isCorrect ? '#22C55E' : isWrong ? '#475569' : optColor,
                        textShadow: isCorrect ? '0 0 18px rgba(34,197,94,0.6)' : `0 0 12px ${optColor}55`,
                        letterSpacing: '-0.04em',
                        transition: 'all 0.3s ease',
                      }}>{label}</div>
                      <div style={{
                        position: 'relative', zIndex: 1,
                        flex: 1, minWidth: 0,
                        fontSize: 'clamp(24px, 2.8cqw, 40px)', fontWeight: 900,
                        color: isWrong ? '#475569' : '#F1F5F9', lineHeight: 1.25,
                        textShadow: optImg?.url ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
                        transition: 'color 0.3s ease',
                      }}>{optText}</div>
                    </div>
                    {/* Top-Bet-Chips: haengen UNTER der Card (nur ein kleiner Lip
                        ueberlappt den Card-Rand). ZvZ-Cards sind flach → wenn
                        Chips mittig auf der Linie sitzen, ueberdecken sie das Label. */}
                    {highestVisibleOpt && highestBets.length > 0 && (() => {
                      const cnt = highestBets.length;
                      // Chip-Tiers nach Anzahl gleichplatzierter Top-Bets pro Option:
                      // bei 4+ massiv schrumpfen, sonst rutschen Chips in 2. Reihe und
                      // ueberlagern die naechste Card-Zeile.
                      const tier: 'lg' | 'md' | 'sm' | 'xs' =
                        cnt >= 5 ? 'xs' : cnt >= 4 ? 'sm' : cnt >= 3 ? 'md' : 'lg';
                      const avSz =
                        tier === 'xs' ? 'clamp(28px, 2.8cqw, 40px)' :
                        tier === 'sm' ? 'clamp(36px, 3.6cqw, 52px)' :
                        tier === 'md' ? 'clamp(44px, 4.6cqw, 64px)' :
                                        'clamp(52px, 5.4cqw, 76px)';
                      const ptsFs =
                        tier === 'xs' ? 'clamp(14px, 1.5cqw, 20px)' :
                        tier === 'sm' ? 'clamp(16px, 1.8cqw, 24px)' :
                        tier === 'md' ? 'clamp(18px, 2cqw, 28px)' :
                                        'clamp(20px, 2.2cqw, 30px)';
                      const padR = tier === 'xs' ? 10 : tier === 'sm' ? 12 : tier === 'md' ? 14 : 18;
                      const innerGap = tier === 'xs' ? 4 : tier === 'sm' ? 6 : 8;
                      const outerGap = cnt >= 4 ? 4 : cnt > 2 ? 6 : 10;
                      return (
                      <div style={{
                        position: 'absolute', left: 8, right: 8, bottom: 0,
                        transform: 'translateY(72%)',
                        display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start',
                        justifyContent: 'center',
                        gap: outerGap,
                        pointerEvents: 'none', zIndex: 5,
                      }}>
                        {highestBets.map(({ team: tm, pts, submittedAt }, bi) => {
                          const timeSec = t0 ? Math.max(0, (submittedAt - t0) / 1000) : null;
                          const isFastest = showTimePills && bi === 0;
                          // Dim-Logik bewusst entfernt (User-Feedback): ZvZ-Voter-Chips
                          // bleiben voll opak auf allen Optionen, Falsch-Markierung
                          // laeuft nur ueber die Card selbst (Rand + Text gedimmt).
                          return (
                            <div key={tm.id} title={`${tm.name}: ${pts}`} style={{
                              position: 'relative',
                              display: 'flex', alignItems: 'center', gap: innerGap,
                              // 2026-05-12 (Wolf-Bug 'low-number bets cropped'):
                              // vertikales Padding 2px → 6px. Mit nur 2px Top/Bottom
                              // konnte die Bet-Zahl (font-descender + ascender bei
                              // line-height normal ~1.2) unten in den Pill-Rand
                              // ragen — visuell "abgeschnitten" am border-radius:999.
                              padding: `6px ${padR}px 6px 2px`,
                              borderRadius: 999,
                              background: 'rgba(0,0,0,0.7)',
                              border: isFastest ? '3px solid #EC4899' : `2px solid ${tm.color}`,
                              boxShadow: isFastest
                                ? '0 0 22px rgba(236,72,153,0.55), 0 6px 14px rgba(0,0,0,0.55)'
                                : `0 6px 14px rgba(0,0,0,0.55), 0 0 14px ${tm.color}55`,
                              animation: `muchoVoterDrop 0.55s cubic-bezier(0.34,1.5,0.64,1) ${0.1 + bi * 0.08}s both`,
                            }}>
                              <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={avSz} />
                              <span style={{
                                fontSize: ptsFs,
                                fontWeight: 900,
                                // 2026-05-12 (Wolf-Bug 'low-number bets cropped'):
                                // lineHeight 1 statt browser-default. Verhindert
                                // dass font-ascent/descent die Pill-Hoehe sprengt.
                                lineHeight: 1,
                                color: tm.color, fontVariantNumeric: 'tabular-nums',
                                textShadow: '0 0 12px rgba(236,72,153,0.45), 0 1px 2px rgba(0,0,0,0.6)',
                              }}>{pts}</span>
                              {/* Zeit-Pill immer auf korrekter Option (konsistent mit Mucho/Cheese) */}
                              {showTimePills && timeSec != null && (
                                <span style={{
                                  position: 'absolute',
                                  left: '50%', bottom: -8,
                                  transform: 'translate(-50%, 50%)',
                                  padding: '2px 9px', borderRadius: 999,
                                  background: isFastest ? 'rgba(236,72,153,0.95)' : 'rgba(15,23,42,0.95)',
                                  border: isFastest ? '1.5px solid rgba(236,72,153,1)' : `1.5px solid ${tm.color}`,
                                  color: isFastest ? '#0A0814' : '#e2e8f0',
                                  fontWeight: 900,
                                  fontSize: 'clamp(11px, 1.2cqw, 15px)',
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                  lineHeight: 1.1,
                                }}>
                                  {timeSec.toFixed(1)}s
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
            );
          })()}

          {/* ZEHN_VON_ZEHN: Unter-Bets (alle außer Top-Bets) — Top-Bets werden
              direkt auf der Option oben eingeblendet. Hier also nur die restlichen
              Tipps pro Option, von Anfang an in einheitlicher Größe.
              Sobald die Korrektheit gelockt ist (zvzLocked), gleiten die Sub-Bets
              nach unten weg + fade — clean Spotlight auf die richtige Option. */}
          {revealed && q.category === 'ZEHN_VON_ZEHN' && q.options && (
            <div style={{
              width: '100%', maxWidth: 1400,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 18,
              marginBottom: zvzLocked ? 0 : 16,
              maxHeight: zvzLocked ? 0 : 600,
              overflow: 'hidden',
              opacity: zvzLocked ? 0 : 1,
              transform: zvzLocked ? 'translateY(20px)' : 'translateY(0)',
              transition: 'opacity 0.55s ease 0.2s, transform 0.55s ease 0.2s, max-height 0.55s ease 0.2s, margin-bottom 0.55s ease 0.2s',
              pointerEvents: zvzLocked ? 'none' : 'auto',
            }}>
              {q.options.map((_, i) => {
                const bets = s.answers.map(a => {
                  const pts = a.text.split(',').map(n => Number(n) || 0);
                  return { team: s.teams.find(t => t.id === a.teamId), pts: pts[i] ?? 0 };
                }).filter((b): b is { team: NonNullable<typeof b.team>; pts: number } => !!b.team && b.pts > 0);
                const highest = zvzHighestPerOption[i];
                const highestIds = new Set(highest?.teamIds ?? []);
                const otherBets = bets.filter(b => !highestIds.has(b.team.id));
                return (
                  <div key={`bets-${i}`} style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6,
                    justifyContent: 'center', alignItems: 'center',
                    minHeight: 'clamp(40px, 5cqw, 56px)',
                  }}>
                    {otherBets.length === 0 ? (
                      <span style={{ fontSize: 'clamp(13px, 1.4cqw, 18px)', color: '#475569', fontStyle: 'italic' }}>—</span>
                    ) : otherBets.map(({ team: tm, pts }) => (
                      <div key={tm.id} title={`${tm.name}: ${pts}`} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '3px 12px 3px 3px',
                        borderRadius: 999,
                        background: 'rgba(0,0,0,0.55)',
                        border: `2px solid ${tm.color}`,
                        boxShadow: `0 3px 10px rgba(0,0,0,0.5), 0 0 8px ${tm.color}44`,
                      }}>
                        <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(28px, 3cqw, 40px)'} />
                        <span style={{
                          fontSize: 'clamp(14px, 1.6cqw, 22px)',
                          fontWeight: 900,
                          color: tm.color, fontVariantNumeric: 'tabular-nums',
                          textShadow: '0 0 10px rgba(236,72,153,0.4), 0 1px 2px rgba(0,0,0,0.6)',
                        }}>{pts}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Answer reveal (skip for MUCHO/ZEHN_VON_ZEHN + Hot Potato — handled separately).
              Rechts im Feld: Avatare der Teams, die das Richtige getippt haben,
              sortiert nach Reaktionszeit (schnellster mit <QQEmojiIcon emoji="⚡"/>-Krone).
              CHEESE: step-based — erst bei cheeseShowGreen (Step 1) sichtbar; Avatare kaskadieren bei Step 2. */}
          {revealed && s.revealedAnswer && q.category !== 'MUCHO' && q.category !== 'ZEHN_VON_ZEHN'
            && !(q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') && (() => {
              // CHEESE: Box immer sichtbar (Layout fix), Inhalt erst bei Step 1.
              const cheeseHideContent = q.category === 'CHEESE' && !cheeseShowGreen;
              // 2026-05-02 (Wolfs Bug 'CHEESE-Cascade nicht nacheinander wie sonst'):
              // Vorher Frontend-strict-Match - Schreibfehler-akzeptierte Antworten
              // (Backend similarityScore>=0.8) wurden NICHT als korrekt erkannt,
              // betroffene Avatare fehlten in der Cascade. Jetzt Backend-Truth via
              // currentQuestionWinners. Bei SCHAETZCHEN bleibt's leer (Zeitstrahl
              // uebernimmt). Sortierung weiterhin nach submittedAt.
              const isSchaetz = q.category === 'SCHAETZCHEN';
              const winnerIdSet = new Set(s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []));
              const correctTeams = isSchaetz ? [] : [...s.answers]
                .filter(a => winnerIdSet.has(a.teamId))
                .sort((a, b) => a.submittedAt - b.submittedAt)
                .map(a => {
                  const team = s.teams.find(t => t.id === a.teamId);
                  return team ? { team, submittedAt: a.submittedAt } : null;
                })
                .filter((x): x is { team: NonNullable<ReturnType<typeof s.teams.find>>; submittedAt: number } => !!x);
              const t0 = s.timerEndsAt && s.timerDurationSec
                ? s.timerEndsAt - s.timerDurationSec * 1000
                : correctTeams[0]?.submittedAt;
              return (
                <div style={{
                  position: 'relative', overflow: 'hidden',
                  padding: 'clamp(16px, 2cqh, 32px) clamp(24px, 3cqw, 52px)', borderRadius: 24,
                  background: cheeseHideContent ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.12)',
                  border: cheeseHideContent ? '3px dashed rgba(34,197,94,0.22)' : '3px solid rgba(34,197,94,0.50)',
                  boxShadow: cheeseHideContent ? 'none' : '0 0 60px rgba(34,197,94,0.25), 0 0 120px rgba(34,197,94,0.1)',
                  marginBottom: 'clamp(8px, 1.2cqh, 24px)',
                  width: '100%', maxWidth: 1400,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 'clamp(10px, 1.4cqh, 18px)',
                  // 2026-05-07 (Audit P1): Cheese hat oben schon Frage-Card-
                  // Animation + Step-Cascade — der scale-bounce hier bringt
                  // die Card doppelt in Bewegung. Cheese bekommt langFadeIn,
                  // andere Kategorien behalten den Standard-Bam.
                  animation: cheeseHideContent
                    ? undefined
                    : (q.category === 'CHEESE'
                        ? 'langFadeIn 0.5s ease both'
                        : 'revealAnswerBam 0.6s var(--qq-ease-out-cubic) 0.15s both'),
                  transition: 'background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
                }}>
                  {/* Shimmer sweep */}
                  <div style={{
                    position: 'absolute', top: 0, width: '60%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                    animation: 'revealShimmer 0.8s ease 0.5s both',
                    pointerEvents: 'none',
                  }} />
                  <span style={{
                    fontSize: 'clamp(28px, 4cqw, 64px)', fontWeight: 900, color: '#4ade80',
                    flexShrink: 1, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    position: 'relative', zIndex: 1,
                    visibility: cheeseHideContent ? 'hidden' : 'visible',
                  }}>
                    {formatRevealedAnswer(lang, s.revealedAnswer ?? q.answer, q.answerEn)}
                  </span>
                  {correctTeams.length > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                      gap: 12, flexWrap: 'wrap',
                      flexShrink: 0, width: '100%',
                      position: 'relative', zIndex: 1,
                      // Bei CHEESE vor Step 2: Platz reserviert, Inhalt unsichtbar — verhindert Card-Dehnung
                      visibility: (q.category === 'CHEESE' && !cheeseShowAvatars) ? 'hidden' : 'visible',
                    }}>
                      {correctTeams.map((ct, vi) => {
                        const timeSec = t0 ? Math.max(0, (ct.submittedAt - t0) / 1000) : null;
                        const isFastest = vi === 0;
                        // CHEESE: 850ms-Stagger pro Avatar synchron zur Pentatonik-
                        // Cascade (siehe useEffect oben). Vorher 160ms war zu schnell
                        // und unspannend ("alle auf einmal"-Gefuehl).
                        const isCheeseCascade = q.category === 'CHEESE' && cheeseShowAvatars;
                        const cascadeDelay = isCheeseCascade ? vi * 0.85 : 0.6;
                        const avatarAnim = isCheeseCascade
                          ? `muchoVoterDrop 0.55s cubic-bezier(0.34,1.5,0.64,1) ${cascadeDelay}s both`
                          : `revealAnswerBam 0.5s var(--qq-ease-bounce) ${cascadeDelay}s both`;
                        return (
                          <div key={ct.team.id} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                            animation: avatarAnim,
                          }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <QQTeamAvatar
                                avatarId={ct.team.avatarId}
                                size={isFastest ? 'clamp(78px, 8.6cqw, 116px)' : 'clamp(58px, 6.4cqw, 88px)'}
                                style={{
                                  border: isFastest ? '4px solid #EC4899' : 'none',
                                  boxShadow: isFastest
                                    ? `0 0 28px rgba(236,72,153,0.65), 0 4px 14px rgba(0,0,0,0.45)`
                                    : '0 4px 12px rgba(0,0,0,0.4)',
                                }}
                              />
                            </div>
                            {timeSec != null && (
                              <span style={{
                                padding: '3px 10px', borderRadius: 999,
                                background: isFastest ? 'rgba(236,72,153,0.22)' : 'rgba(0,0,0,0.55)',
                                border: isFastest ? '1.5px solid rgba(236,72,153,0.7)' : '1px solid rgba(255,255,255,0.15)',
                                color: isFastest ? '#EC4899' : '#cbd5e1',
                                fontWeight: 900,
                                fontSize: 'clamp(15px, 1.6cqw, 20px)',
                                whiteSpace: 'nowrap',
                              }}>
                                {timeSec.toFixed(1)}s
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Hot Potato reveal: show full answer list as chips, mark which were named */}
          {revealed && q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato' && (() => {
            const raw = (lang === 'en' && q.answerEn ? q.answerEn : q.answer) ?? '';
            const allAnswers = raw.split(/[,;]/).map(a => a.replace(/[…\.]+$/, '').trim()).filter(Boolean);
            const used = s.hotPotatoUsedAnswers ?? [];
            const authors = s.hotPotatoAnswerAuthors ?? [];
            const usedNorm = used.map((u: string) => u.toLowerCase().trim());
            // Map each revealed answer (from q.answer) → authoring team (if any)
            const findAuthor = (a: string): string | null => {
              const aLower = a.toLowerCase().trim();
              for (let i = 0; i < usedNorm.length; i++) {
                const u = usedNorm[i];
                if (u === aLower || u.includes(aLower) || aLower.includes(u)) return authors[i] ?? null;
              }
              return null;
            };
            // Density-Skalierung: bei vielen Antworten Pills/Font kompakter,
            // sonst sprengen sie den Beamer. 2026-05-09 v3 (Wolf 'all possible
            // answers immer noch zu klein, dynamisch hochziehen wenn Platz'):
            // neue 'xxl'-Stufe für ≤4 Antworten + xl/lg deutlich vergrößert.
            // Schwellen großzügiger: xl bis 8 (war 6), lg bis 16 (war 12).
            const N = allAnswers.length;
            // 2026-05-12 (Wolf 'gewinnercard aus dem slide draußen, lösungen
            // zu groß'): Tier-Schwellen DEUTLICH zurueck. Bei 19 Antworten
            // war vorher lg (38px Font, 5 Reihen, ~485px Grid) → klemmt
            // Survivor-Card unter den Slide. Neue Schwellen drücken 19 in
            // tier=md (26px Font, ~290px Grid) → Survivor-Card hat wieder
            // Platz unten. Gewinn pro Stufe: ~60% Grid-Hoehe.
            const tier =
              N <= 4  ? 'xxl'
              : N <= 8  ? 'xl'   // war ≤12
              : N <= 16 ? 'lg'   // war ≤24
              : N <= 28 ? 'md'   // war ≤40
              : N <= 50 ? 'sm'   // war ≤80
              : 'xs';
            // 2026-05-06 (Wolf 'keine Cascade-Animation bei Hot Potato, aber
            // Cascade-Sound schon — Animation anpassen'): Stagger deutlich
            // langsamer (war 50/25/12/8ms), jetzt sichtbar als Cascade-Effekt.
            // Sync zur Sound-Cascade (Pentatonik-Notes pro qualified Team).
            // 2026-05-11 (Wolf 'lesbar von weiten, Platz nutzen'): font-sizes
            // ausgewogener — kein steiler Drop mehr von lg auf md. md geht von
            // 13/1.4/18 → 17/1.85/26, sm von 11/1.2/15 → 14/1.5/20, xs 10/1/13 → 12/1.2/16.
            const tierStyles = {
              xxl: { fontSize: 'clamp(40px, 4.4cqw, 72px)', pad: '20px 40px', padAvatar: '12px 36px 12px 12px', avatarSize: 'clamp(60px, 6cqw, 88px)',   gap: 22, headerFs: 'clamp(36px, 4cqw, 60px)', containerPad: '40px 44px', stagger: 0.28 },
              xl:  { fontSize: 'clamp(30px, 3.4cqw, 52px)', pad: '15px 32px', padAvatar: '9px 30px 9px 9px',    avatarSize: 'clamp(48px, 4.8cqw, 68px)', gap: 18, headerFs: 'clamp(30px, 3.4cqw, 50px)', containerPad: '30px 34px', stagger: 0.22 },
              lg:  { fontSize: 'clamp(24px, 2.6cqw, 38px)', pad: '12px 26px', padAvatar: '7px 24px 7px 7px',    avatarSize: 'clamp(40px, 4cqw, 56px)',   gap: 14, headerFs: 'clamp(26px, 3cqw, 42px)',  containerPad: '24px 28px', stagger: 0.16 },
              md:  { fontSize: 'clamp(17px, 1.85cqw, 26px)', pad: '9px 18px', padAvatar: '5px 16px 5px 5px',    avatarSize: 'clamp(28px, 2.8cqw, 38px)', gap: 9,  headerFs: 'clamp(20px, 2.2cqw, 30px)', containerPad: '16px 20px', stagger: 0.09 },
              sm:  { fontSize: 'clamp(14px, 1.5cqw, 20px)', pad: '6px 14px',  padAvatar: '4px 12px 4px 4px',    avatarSize: 'clamp(22px, 2.2cqw, 30px)', gap: 6,  headerFs: 'clamp(16px, 1.8cqw, 24px)', containerPad: '12px 16px', stagger: 0.05 },
              xs:  { fontSize: 'clamp(12px, 1.2cqw, 16px)', pad: '4px 10px',  padAvatar: '3px 10px 3px 3px',    avatarSize: 'clamp(18px, 1.8cqw, 24px)', gap: 4,  headerFs: 'clamp(14px, 1.5cqw, 20px)', containerPad: '10px 14px', stagger: 0.03 },
            }[tier];
            return (
              <div style={{
                width: '100%', maxWidth: 1400,
                marginBottom: 'clamp(8px, 1.2cqh, 24px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: tier === 'xxl' ? 22 : tier === 'xl' ? 18 : tier === 'lg' ? 14 : tier === 'md' ? 10 : 8,
                // 2026-05-07 (Audit P2): revealAnswerBam (scale-bounce) auf dem
                // Container sprang mit den Chip-Cascades durch — alle Chips
                // huepften synchron mit dem Container-Scale, plus jeder Chip
                // hat seine eigene contentReveal. langFadeIn als ruhige
                // Container-Entry, die Chip-Cascade traegt allein die Energie.
                animation: 'langFadeIn 0.5s ease 0.15s both',
              }}>
                <div style={{
                  fontSize: tierStyles.headerFs, fontWeight: 900,
                  color: '#86efac', letterSpacing: 0.5,
                }}>
                  <QQEmojiIcon emoji="🥔"/> {lang === 'en' ? 'All possible answers' : 'Alle möglichen Antworten'}
                  <span style={{ marginLeft: 8, fontSize: '0.7em', opacity: 0.7 }}>· {N}</span>
                </div>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                  gap: tierStyles.gap,
                  padding: tierStyles.containerPad, borderRadius: 24,
                  background: 'rgba(34,197,94,0.08)',
                  border: '2px solid rgba(34,197,94,0.3)',
                  // 2026-05-12 v2 (Audit-A): 58cqh → 52cqh. Survivor-Card
                  // hatte rechnerisch Platz (~897px bei 1080p, 934px verfuegbar),
                  // aber Edge-Cases (groesseres Question-Card, kleinere Beamer)
                  // druckten sie raus. 52cqh gibt 30-35% garantierten Bottom-
                  // Platz fuer Survivor-Card.
                  maxHeight: 'clamp(340px, 52cqh, 620px)', overflow: 'hidden',
                }}>
                  {allAnswers.map((a, i) => {
                    const authorId = findAuthor(a);
                    const named = authorId !== null || usedNorm.some((u: string) =>
                      u === a.toLowerCase().trim() || u.includes(a.toLowerCase().trim()) || a.toLowerCase().trim().includes(u)
                    );
                    const authorTeam = authorId ? s.teams.find(t => t.id === authorId) : null;
                    // Bei xs/sm-Density: Avatare nur bei genannten Antworten anzeigen
                    const showAvatar = !!authorTeam && (tier !== 'xs');
                    return (
                      // 2026-05-12 (Audit-B 'Chip-Cascade Dauerschleife'):
                      // Key auf reinen Answer-Text reduziert (war ${a}-${i}).
                      // Mit Index drift bei IIFE-Re-Eval konnten gleiche Texte
                      // andere Keys bekommen → React-Remount → Animation neu.
                      // Reiner Text ist stabil (allAnswers ist deterministisch
                      // aus q.answer abgeleitet, keine Duplikate erwartet).
                      <div key={a} style={{
                        display: 'inline-flex', alignItems: 'center', gap: tier === 'xxl' ? 14 : tier === 'xl' ? 12 : tier === 'lg' ? 8 : 4,
                        padding: showAvatar ? tierStyles.padAvatar : tierStyles.pad,
                        borderRadius: 999,
                        fontSize: tierStyles.fontSize, fontWeight: 900,
                        background: named ? 'rgba(34,197,94,0.22)' : 'rgba(15,23,42,0.5)',
                        border: `${tier === 'xs' ? 1 : 2}px solid ${authorTeam ? authorTeam.color : (named ? '#22C55E' : 'rgba(148,163,184,0.25)')}`,
                        color: named ? '#86efac' : '#94a3b8',
                        animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.2 + i * tierStyles.stagger}s both`,
                        boxShadow: authorTeam && tier !== 'xs' ? `0 0 8px ${authorTeam.color}44` : 'none',
                      }}>
                        {showAvatar && authorTeam && (
                          <QQTeamAvatar avatarId={authorTeam.avatarId} teamEmoji={authorTeam.emoji} size={tierStyles.avatarSize} title={authorTeam.name} style={{
                            flexShrink: 0,
                          }} />
                        )}
                        <span>{named ? (tier === 'xs' || tier === 'sm' ? '✓' : '✓ ') : ''}{a}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Background flash on reveal */}
          {revealed && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
              background: s.correctTeamId
                ? `radial-gradient(ellipse at center, rgba(34,197,94,0.3) 0%, transparent 70%)`
                : `radial-gradient(ellipse at center, rgba(239,68,68,0.2) 0%, transparent 70%)`,
              animation: 'revealFlash 1.2s ease-out both',
            }} />
          )}

          {/* Schätzchen: number-line visualization (above leaderboard) */}
          {revealed && q.category === 'SCHAETZCHEN' && s.answers.length > 0 && q.targetValue != null && (() => {
            const target = q.targetValue as number;
            const parsed = s.answers
              .map(a => {
                const num = Number(a.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
                const team = s.teams.find(t => t.id === a.teamId);
                return { teamId: a.teamId, num, team, text: a.text };
              })
              .filter(p => Number.isFinite(p.num) && p.team);
            if (parsed.length === 0) return null;
            const values = [target, ...parsed.map(p => p.num)];
            const rawMin = Math.min(...values);
            const rawMax = Math.max(...values);
            const rawSpan = rawMax - rawMin;
            // Padding 10% auf beiden Seiten, mindestens 10% relativ zum Target.
            const pad = Math.max(rawSpan * 0.1, Math.abs(target) * 0.05, 1);
            const axMin = rawMin - pad;
            const axMax = rawMax + pad;
            const axSpan = Math.max(axMax - axMin, 1);
            const pctOf = (v: number) => ((v - axMin) / axSpan) * 100;
            // Worst → best für Animation-Reihenfolge (Trommelwirbel bis Gewinner)
            const sorted = [...parsed].sort((a, b) =>
              Math.abs(b.num - target) - Math.abs(a.num - target)
            );
            // 2026-05-11 (Wolf-Bug: bei Target 14, Antworten 13 + 15 wurde nur
            // EIN Team als Winner highlighted obwohl beide distance=1 haben.
            // Root-Cause: isWinner verglich nur mit sorted[length-1].teamId.
            // Fix: alle Teams mit minimaler Distanz sind Winner.
            const minDistance = Math.min(...parsed.map(p => Math.abs(p.num - target)));
            const isWinnerTeam = (teamId: string) => {
              const p = parsed.find(x => x.teamId === teamId);
              return p ? Math.abs(p.num - target) === minDistance : false;
            };
            // 4-Slot-Kollisionssystem: Avatare werden auf die erste freie Reihe
            // gelegt, die genug horizontalen Abstand hat. Reihenfolge der Reihen:
            // 0=oben nah, 1=unten nah, 2=oben weit, 3=unten weit.
            // MIN_DIST_PCT = minimaler X-Abstand in % für dieselbe Reihe.
            // Avatar 72px bei ~1400px Breite ≈ 5.2%, + 2% Luft = 7.2% → 8%.
            const pinRows = new Map<string, number>();
            const pinXNudge = new Map<string, number>();
            const MIN_DIST_PCT = 8;
            const rowLastPct: number[] = [-Infinity, -Infinity, -Infinity, -Infinity];
            const sortedByPos = [...parsed].sort((a, b) => a.num - b.num);
            sortedByPos.forEach((p) => {
              const pct = pctOf(p.num);
              // Probiere die 4 Reihen in bevorzugter Reihenfolge durch
              const preferredOrder = [0, 1, 2, 3];
              let chosen = 3; // Fallback = weit-unten
              for (const row of preferredOrder) {
                if (pct - rowLastPct[row] >= MIN_DIST_PCT) {
                  chosen = row;
                  break;
                }
              }
              pinRows.set(p.teamId, chosen);
              rowLastPct[chosen] = pct;
            });

            // ═══════════════════════════════════════════════════════════════
            // DYNAMIC CHIP PLACEMENT mit echter Kollisionserkennung.
            // Pixel-basiert auf einer virtuellen Bühne von 1400px Breite.
            // Für jeden Pin werden 4 Chip-Kandidaten geprüft (below, above,
            // right, left relativ zum Avatar) und der erste freie gewählt.
            // Geprüft wird gegen ALLE bereits platzierten Avatare & Chips.
            // Die Chip-Offsets werden dann per CSS-Var an den Chip gereicht.
            // ═══════════════════════════════════════════════════════════════
            type Rect = { x: number; y: number; w: number; h: number };
            const STAGE_W = 1400;
            const rectsOverlap = (a: Rect, b: Rect, pad = 4) =>
              !(a.x + a.w + pad <= b.x ||
                b.x + b.w + pad <= a.x ||
                a.y + a.h + pad <= b.y ||
                b.y + b.h + pad <= a.y);
            const placedRects: Rect[] = [];
            // Zielmarker sitzt jetzt ALS Pill direkt AUF der Rail —
            // nur ein schmales Rect in Rail-Höhe sperren, damit Avatar-Chips
            // oben/unten drumherum frei platziert werden können.
            const targetPx = (pctOf(target) / 100) * STAGE_W;
            placedRects.push({ x: targetPx - 50, y: -16, w: 100, h: 32 });
            // Alle Pin-Avatare als Rects für Kollision vormerken.
            parsed.forEach((p) => {
              const r = pinRows.get(p.teamId) ?? 0;
              const isWinner = isWinnerTeam(p.teamId);
              const isTop = r === 0 || r === 2;
              const gap = r === 0 || r === 1 ? 110 : 180;
              const wrapperY = isTop ? -gap : gap;
              const aSize = isWinner ? 86 : 72;
              const px = (pctOf(p.num) / 100) * STAGE_W;
              placedRects.push({
                x: px - aSize / 2, y: wrapperY - aSize / 2,
                w: aSize, h: aSize,
              });
            });
            // Chip-Offsets pro Team berechnen.
            const pinChipOffset = new Map<string, { dx: number; dy: number; side: 'below' | 'above' | 'right' | 'left' }>();
            // In Reihenfolge der sortierten Enthüllung (sorted = worst→best),
            // damit Gewinner zuletzt platziert wird und freie Plätze wählt.
            // Aber bessere Verteilung: erst die engsten Cluster (mittlere Pcts)
            // durchgehen — wir gehen links→rechts, das klappt in der Praxis.
            [...parsed].sort((a, b) => a.num - b.num).forEach((p) => {
              const r = pinRows.get(p.teamId) ?? 0;
              const isWinner = isWinnerTeam(p.teamId);
              const isTop = r === 0 || r === 2;
              const gap = r === 0 || r === 1 ? 110 : 180;
              const wrapperY = isTop ? -gap : gap;
              const aSize = isWinner ? 86 : 72;
              const px = (pctOf(p.num) / 100) * STAGE_W;
              const chipW = isWinner ? 140 : 100;
              const chipH = isWinner ? 64 : 48;
              // Kandidaten relativ zum Avatar-Wrapper-Zentrum (px-Koordinaten).
              // Primär: Richtung "Rail" (zur Mitte hin) bleibt erhalten —
              // unten-Avatare → Chip nach oben, oben-Avatare → Chip nach unten.
              // Dann Fallbacks: außen, rechts, links.
              const primaryBelow = !isTop; // !isTop = Avatar unten der Rail → Chip über dem Avatar (Richtung Rail)
              const candidates: Array<{ dx: number; dy: number; side: 'below' | 'above' | 'right' | 'left' }> = [];
              // Rail-zugewandt (primär)
              if (primaryBelow) {
                candidates.push({ dx: 0, dy: -aSize / 2 - 6 - chipH, side: 'above' });
              } else {
                candidates.push({ dx: 0, dy: aSize / 2 + 6, side: 'below' });
              }
              // Rail-abgewandt (sekundär)
              if (primaryBelow) {
                candidates.push({ dx: 0, dy: aSize / 2 + 6, side: 'below' });
              } else {
                candidates.push({ dx: 0, dy: -aSize / 2 - 6 - chipH, side: 'above' });
              }
              // Rechts / links vom Avatar
              candidates.push({ dx: aSize / 2 + 8, dy: -chipH / 2, side: 'right' });
              candidates.push({ dx: -aSize / 2 - 8 - chipW, dy: -chipH / 2, side: 'left' });
              // Weitere Fallbacks: weiter oben/unten
              candidates.push({ dx: 0, dy: -aSize / 2 - 6 - chipH - 28, side: 'above' });
              candidates.push({ dx: 0, dy: aSize / 2 + 6 + 28, side: 'below' });

              let picked = candidates[0];
              for (const c of candidates) {
                const chipRect: Rect = {
                  x: px + c.dx - chipW / 2 + (c.side === 'right' || c.side === 'left' ? chipW / 2 : 0),
                  y: wrapperY + c.dy,
                  w: chipW, h: chipH,
                };
                // Für side=right/left: dx bereits inkl. Chip-Breite gesetzt.
                if (c.side === 'right' || c.side === 'left') {
                  chipRect.x = px + c.dx;
                } else {
                  chipRect.x = px + c.dx - chipW / 2;
                }
                const collides = placedRects.some(r2 => rectsOverlap(chipRect, r2));
                if (!collides) {
                  placedRects.push(chipRect);
                  picked = c;
                  break;
                }
              }
              // Falls alle kollidieren → trotzdem primary nehmen, platzieren.
              if (!picked) picked = candidates[0];
              pinChipOffset.set(p.teamId, picked);
            });
            const targetPct = pctOf(target);
            const unitStrInline = (lang === 'en' && q.unitEn ? q.unitEn : q.unit) ?? '';
            const looksLikeYearI = (n: number) => Number.isInteger(n) && n >= 1000 && n <= 2100;
            const isYearUnitInline = !!q.isYearAnswer || /jahr|year/i.test(unitStrInline) || (target != null && looksLikeYearI(target));
            const fmt = (n: number) => {
              const abs = Math.abs(n);
              if (isYearUnitInline) return String(Math.round(n));
              if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
              if (abs >= 10000) return (n / 1000).toFixed(0) + 'k';
              if (abs >= 1000) return n.toLocaleString(lang === 'en' ? 'en-US' : 'de-DE');
              return n % 1 === 0 ? String(n) : n.toFixed(1);
            };
            return (
              <div style={{
                width: '100%', maxWidth: 1400,
                // Oben/unten: weit-Row (180 + Avatar 41 + Chip 36 ≈ 250). Target sitzt jetzt ON-Rail.
                padding: '235px clamp(24px, 3cqw, 48px) 235px',
                marginBottom: 'clamp(8px, 1cqh, 16px)',
                position: 'relative',
                background: 'rgba(255,255,255,0.03)',
                border: '1.5px solid rgba(255,255,255,0.08)',
                borderRadius: 24,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.3s both',
              }}>
                {/* Axis line — mittig im Container, genug Luft oben/unten für die Pins */}
                <div style={{
                  position: 'relative', height: 4,
                }}>
                  {/* Rail */}
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: '50%',
                    height: 4, borderRadius: 2,
                    background: 'linear-gradient(90deg, rgba(148,163,184,0.15), rgba(148,163,184,0.35), rgba(148,163,184,0.15))',
                    transform: 'translateY(-50%)',
                  }} />
                  {/* Axis endpoints labels */}
                  <div style={{
                    position: 'absolute', left: 0, top: 'calc(50% + 22px)',
                    fontSize: 'clamp(18px, 1.8cqw, 26px)', color: '#94a3b8', fontWeight: 900,
                  }}>{fmt(axMin)}</div>
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(50% + 22px)',
                    fontSize: 'clamp(18px, 1.8cqw, 26px)', color: '#94a3b8', fontWeight: 900,
                  }}>{fmt(axMax)}</div>

                  {/* Target marker — kompakte Pille direkt AUF der Rail.
                      Etwas kleiner, damit nahe Avatare nicht verdeckt werden. */}
                  <div style={{
                    position: 'absolute', left: `${targetPct}%`, top: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 11px 4px 7px',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                    boxShadow: '0 0 14px rgba(34,197,94,0.55), 0 2px 8px rgba(0,0,0,0.38)',
                    border: '2px solid rgba(255,255,255,0.9)',
                    animation: 'pinRevealIn 0.55s var(--qq-ease-bounce) 0.5s both',
                    ['--pin-x' as any]: '0px',
                    ['--pin-y' as any]: '0px',
                    zIndex: 30,
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{
                      fontSize: 'clamp(16px, 1.7cqw, 22px)', lineHeight: 1,
                    }}><QQEmojiIcon emoji="🎯"/></span>
                    <span style={{
                      color: '#fff', fontWeight: 900,
                      fontSize: 'clamp(14px, 1.6cqw, 20px)', lineHeight: 1,
                      textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}>{fmt(target)}</span>
                  </div>

                  {/* Team pins — Avatar und Wert-Chip liegen als stack klar ÜBER bzw.
                      UNTER der Rail. Bei "oben" (negative yOffset) kommt der Chip
                      über den Avatar, die Verbindungslinie zieht unterhalb des
                      Avatars Richtung Rail. Bei "unten" (positive yOffset) steht der
                      Avatar unter der Rail, der Chip darunter. Dadurch sind Avatare
                      eindeutig nicht mehr "auf der Linie". */}
                  {parsed.map((p) => {
                    const pct = pctOf(p.num);
                    const r = pinRows.get(p.teamId) ?? 0;
                    const xNudge = pinXNudge.get(p.teamId) ?? 0;
                    const isWinner = isWinnerTeam(p.teamId);
                    const orderIdx = sorted.findIndex(x => x.teamId === p.teamId);
                    const delay = 0.7 + orderIdx * 0.18;
                    const tColor = p.team!.color;
                    // r: 0 = oben nah, 1 = unten nah, 2 = oben weit, 3 = unten weit.
                    const isTop = r === 0 || r === 2;
                    // gap = Entfernung Rail ↔ Avatar-Mittelpunkt — kompakter, aber Avatare klar von der Rail getrennt.
                    // Nah: 110, Weit: 180 (zweite Reihe bei Kollision)
                    const gap = r === 0 || r === 1 ? 110 : 180;
                    const avatarSize = isWinner ? 86 : 72;
                    // Nudge/Animation-Deltas (Gewinner hüpft Richtung Ziel)
                    const nudgePctDelta = targetPct - pct;
                    const nudgeXPx = Math.max(-160, Math.min(160, nudgePctDelta * 12));
                    const nudgeDelay = delay + 0.8;
                    // Das äußere Wrapper-Div wird per translate auf Rail-Ebene
                    // bzw. Avatar-Ebene zentriert — isTop: nach oben, sonst nach
                    // unten. Wrapper ist ein Punkt; die Kinder werden relativ
                    // zum Avatar-Zentrum absolut positioniert.
                    const wrapperY = isTop ? -gap : gap;
                    return (
                      <div key={p.teamId} style={{
                        position: 'absolute', left: `${pct}%`, top: '50%',
                        width: 0, height: 0,
                        // CSS-Vars für pinRevealIn + winnerNudge — Wrapper-Position
                        // bleibt erhalten (nicht von animation overschrieben).
                        ['--pin-x' as any]: `${xNudge}px`,
                        ['--pin-y' as any]: `${wrapperY}px`,
                        ['--base-x' as any]: `${xNudge}px`,
                        ['--nudge-x' as any]: `${nudgeXPx}px`,
                        ['--nudge-y' as any]: `${wrapperY}px`,
                        transform: `translate(calc(-50% + ${xNudge}px), calc(-50% + ${wrapperY}px))`,
                        animation: isWinner
                          ? `pinRevealIn 0.55s var(--qq-ease-bounce) ${delay}s both, winnerNudge 1.4s var(--qq-ease-bounce) ${nudgeDelay}s 1 both`
                          : `pinRevealIn 0.55s var(--qq-ease-bounce) ${delay}s both`,
                        zIndex: isWinner ? 20 : 10,
                      }}>
                        {/* Verbindungslinie vom Avatar zur Rail (in Richtung Rail) */}
                        <div style={{
                          position: 'absolute', left: '50%',
                          top: isTop ? `${avatarSize / 2}px` : `${-gap}px`,
                          width: 2, height: gap - avatarSize / 2,
                          background: `${tColor}88`,
                          transform: 'translateX(-50%)',
                          zIndex: -1,
                        }} />
                        {/* Avatar pin (zentriert auf Wrapper-Punkt) */}
                        <QQTeamAvatar avatarId={p.team!.avatarId} teamEmoji={p.team!.emoji} size={isWinner ? 'clamp(72px, 7cqw, 96px)' : 'clamp(60px, 6cqw, 82px)'} style={{
                          position: 'absolute', left: '50%', top: 0,
                          transform: 'translate(-50%, -50%)',
                          border: isWinner ? '3px solid #EC4899' : 'none',
                          boxShadow: isWinner
                            ? `0 0 24px ${tColor}aa, 0 0 44px rgba(236,72,153,0.5)`
                            : `0 4px 12px rgba(0,0,0,0.5)`,
                        }} />
                        {/* Value-Chip mit DYNAMISCHER Kollisionsvermeidung.
                            Der Chip wird relativ zum Avatar-Zentrum in eine der
                            4 Richtungen gelegt (oben/unten/rechts/links), je
                            nachdem wo Platz frei ist. Position kam aus
                            pinChipOffset (px-basierte Kollisionserkennung). */}
                        {(() => {
                          const off = pinChipOffset.get(p.teamId) ?? { dx: 0, dy: avatarSize / 2 + 10, side: 'below' as const };
                          const isChipTopOfAvatar = off.dy < 0;
                          // Connector-Linie vom Avatar zum Chip (Team-Farbe),
                          // damit Zuordnung klar bleibt wenn Chip seitlich sitzt.
                          const connectorH = off.side === 'above'
                            ? Math.abs(off.dy) - avatarSize / 2
                            : off.side === 'below'
                              ? off.dy - avatarSize / 2
                              : 0;
                          return (
                            <>
                              {/* Connector (nur oben/unten, seitlich nicht nötig da Chip direkt am Avatar) */}
                              {(off.side === 'above' || off.side === 'below') && connectorH > 2 && (
                                <div style={{
                                  position: 'absolute', left: '50%',
                                  top: isChipTopOfAvatar ? `${-(avatarSize / 2 + connectorH)}px` : `${avatarSize / 2}px`,
                                  width: 2, height: connectorH,
                                  background: `${tColor}99`,
                                  transform: 'translateX(-50%)',
                                  zIndex: 0,
                                }} />
                              )}
                              <div style={{
                                position: 'absolute',
                                left: off.side === 'right'
                                  ? `${off.dx}px`
                                  : off.side === 'left'
                                    ? `${off.dx}px`
                                    : '50%',
                                top: `${off.dy}px`,
                                transform: off.side === 'right' || off.side === 'left'
                                  ? 'translate(0, 0)'
                                  : 'translate(-50%, 0)',
                                // 2026-05-05 (Wolf 'low-bets zu klein, groesser'):
                                // Loser-Bet 24-34 → 30-44, Winner-Bet 32-46 → 38-56.
                                // Padding entsprechend hoch.
                                padding: isWinner ? '11px 26px' : '9px 22px',
                                borderRadius: 16,
                                background: 'rgba(0,0,0,0.88)',
                                border: `2px solid ${tColor}`,
                                color: '#fff', fontWeight: 900,
                                fontSize: isWinner ? 'clamp(38px, 4cqw, 56px)' : 'clamp(30px, 3.2cqw, 44px)',
                                whiteSpace: 'nowrap',
                                boxShadow: `0 4px 12px rgba(0,0,0,0.6)`,
                                zIndex: 1,
                              }}>
                                {fmt(p.num)}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Schätzchen: schlanker Gewinner-Chip unter dem Zeitstrahl (kein redundantes Riesen-Panel,
              Avatare/Werte sind am Strahl bereits sichtbar).
              Bei Distanz-Gleichstand entscheidet die Reaktionszeit — dann zeigt der Chip
              zusätzlich „und am schnellsten!". */}
          {revealed && q.category === 'SCHAETZCHEN' && s.answers.length > 0 && (() => {
            const ranked = s.answers
              .map(a => {
                const num = Number(a.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
                const team = s.teams.find(t => t.id === a.teamId);
                const distance = Number.isNaN(num) || q.targetValue == null ? Infinity : Math.abs(num - q.targetValue);
                return { ...a, num, distance, team };
              })
              // Primär Distanz, sekundär Speed — so gewinnt bei gleichem Abstand der schnellste.
              .sort((a, b) => (a.distance - b.distance) || (a.submittedAt - b.submittedAt));
            const w = ranked[0];
            if (!w || w.distance === Infinity || !w.team) return null;
            const tColor = w.team.color;
            // Gleichstand auf der Distanz → Speed war der Tiebreaker.
            const distanceTied = ranked.filter(r => r.distance === w.distance).length > 1;
            return (
              <div style={{
                display: 'flex', justifyContent: 'center', width: '100%',
                animation: 'revealWinnerIn 0.55s var(--qq-ease-bounce) 0.9s both',
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 18,
                  padding: '14px 30px', borderRadius: 999,
                  background: `linear-gradient(135deg, ${tColor}2a, ${tColor}0a)`,
                  border: `2px solid ${tColor}55`,
                  boxShadow: `0 0 32px ${tColor}44`,
                }}>
                  <span style={{ fontSize: 'clamp(26px, 2.8cqw, 36px)', lineHeight: 1 }}><QQEmojiIcon emoji="🏆"/></span>
                  <QQTeamAvatar avatarId={w.team.avatarId} teamEmoji={w.team.emoji} size={'clamp(28px, 3cqw, 40px)'} style={{ flexShrink: 0 }} />
                  <span style={{
                    fontWeight: 900, fontSize: 'clamp(22px, 2.4cqw, 32px)', color: tColor, lineHeight: 1.1,
                  }}>{w.team.name}</span>
                  <span style={{
                    color: '#cbd5e1', fontSize: 'clamp(19px, 2.1cqw, 28px)', fontWeight: 700, lineHeight: 1.1,
                  }}>
                    {distanceTied
                      ? (lang === 'en' ? 'was closest — and fastest! ⚡' : 'war am nächsten dran — und am schnellsten! ⚡')
                      : (lang === 'en' ? 'was closest!' : 'war am nächsten dran!')}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Correct team — winner banner (non-Schätzchen).
              2026-05-05 v2 (Wolf 'zvz cards rutschen runter beim low-bet-out
              und wieder hoch wenn winner-card kommt'): Slot-Hoehe wird jetzt
              SOFORT bei revealed=true reserviert (nicht erst wenn showUnified-
              Winner). Damit gibt es keinen Layout-Shift mehr zwischen
              Bet-Cascade-Step 1 (low-bets out) und Step 2 (winner-card pop) —
              der Slot ist die ganze Zeit da, nur der Inhalt fadet rein.
              MUCHO/CHEESE/HotPotato profitieren auch. */}
          {revealed && q.category !== 'SCHAETZCHEN' && (
            <div style={{
              width: '100%', maxWidth: 1400,
              overflow: 'visible',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              // 2026-05-06 v2 (Wolf 'obere Cards springen leicht hoch wenn
              // Winner-Card kommt' fuer MUCHO + ZvZ): Slot wird jetzt SOFORT
              // beim Eintritt in QUESTION_REVEAL reserviert (nicht erst wenn
              // correctTeamId arrives). Damit kein Layout-Shift mehr zwischen
              // 'reveal-phase aber noch keine winner-id' und 'winner-id da'.
              // Inner content gated auf showUnifiedWinner + (correctTeamId
              // ODER winners.length>0) damit keine leere Card pop't.
              minHeight: 'clamp(120px, 14cqh, 200px)',
              marginBottom: 12,
              opacity: showUnifiedWinner ? 1 : 0,
              transform: showUnifiedWinner ? 'scale(1)' : 'scale(0.96)',
              transformOrigin: 'top center',
              transition: 'opacity 0.7s var(--qq-ease-out-cubic), transform 0.7s var(--qq-ease-bounce)',
            }}>
              {showUnifiedWinner && (s.correctTeamId || (s.currentQuestionWinners?.length ?? 0) > 0) && (() => {
            const isEn = lang === 'en';
            const bannerDelay = 0.7;
            const avatarDelay = 1.1;

            // ZEHN_VON_ZEHN: Tie-Info ermitteln, damit Text stimmt, wenn mehrere Teams
            // die gleiche Höchstpunktzahl auf die richtige Antwort gesetzt haben
            // (Reihenfolge per Schnelligkeit). Bei echtem Zeit-Gleichstand → alle als Co-Sieger.
            let allInTie: {
              maxPointsTied: boolean;  // mehrere Teams mit Höchstpunkten
              speedTied: string[];     // Team-IDs mit max Punkten UND schnellstem Submit
              winnerPts: number;
            } | null = null;
            if (cat === 'ZEHN_VON_ZEHN' && q.correctOptionIndex != null && q.options) {
              const correctIdx = q.correctOptionIndex;
              const onCorrect = s.answers
                .map(a => {
                  const parts = a.text.split(',').map(n => parseInt(n.trim(), 10));
                  const pts = parts[correctIdx] ?? 0;
                  return { teamId: a.teamId, pts, submittedAt: a.submittedAt };
                })
                .filter(x => x.pts > 0);
              if (onCorrect.length > 0) {
                const maxPts = Math.max(...onCorrect.map(x => x.pts));
                const atMax = onCorrect.filter(x => x.pts === maxPts);
                const minT  = Math.min(...atMax.map(x => x.submittedAt));
                const atMaxAndFastest = atMax.filter(x => x.submittedAt === minT);
                allInTie = {
                  maxPointsTied: atMax.length > 1,
                  speedTied: atMaxAndFastest.map(x => x.teamId),
                  winnerPts: maxPts,
                };
              }
            }

            const coWinners = allInTie && allInTie.speedTied.length > 1
              ? s.teams.filter(t => allInTie!.speedTied.includes(t.id))
              : null;

            // Single-team Banner (Default-Fall)
            // 2026-05-05 (Wolf-Bug 'cheese keine gewinnercard'): Fallback auf
            // ersten Winner aus currentQuestionWinners — bei CHEESE ohne fastest
            // ist correctTeamId leer, aber wir haben trotzdem Sieger.
            const winnerIds = s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []);
            const team = s.teams.find(t => t.id === s.correctTeamId)
              ?? s.teams.find(t => t.id === winnerIds[0]);
            if (!coWinners && !team) return null;

            const muchoSpeedWin = cat === 'MUCHO' && q.correctOptionIndex != null
              && s.answers.filter(a => a.text === String(q.correctOptionIndex)).length > 1;
            const allInTied = allInTie?.maxPointsTied ?? false;

            // CHEESE: Wenn mehrere Teams richtig geraten haben, ist „am schnellsten"
            // die entscheidende Info. 2026-05-02 (Audit): Backend-Truth statt
            // strict-Match - sonst zaehlte Schreibfehler-Akzeptanzen nicht.
            const cheeseCorrectCount = cat === 'CHEESE'
              ? (s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : [])).length
              : 0;
            const cheeseSpeedWin = cat === 'CHEESE' && cheeseCorrectCount > 1;

            const winMsg = cat === 'CHEESE'
              ? (cheeseSpeedWin
                  ? (isEn ? 'recognized it fastest!' : 'hat es am schnellsten erkannt!')
                  : (isEn ? 'got it right!' : 'hat es erkannt!'))
              : cat === 'BUNTE_TUETE'
                ? (isEn ? 'wins the round!' : 'gewinnt die Runde!')
                : cat === 'ZEHN_VON_ZEHN'
                  ? (allInTied
                      ? (isEn ? 'had the most points — and was fastest!' : 'hatte die meisten Punkte — und war am schnellsten!')
                      : (isEn ? 'bet the most points on the correct answer!' : 'hat die meisten Punkte auf die richtige Antwort gesetzt!'))
                  : muchoSpeedWin
                    ? (isEn ? 'fastest & correct!' : 'am schnellsten & richtig!')
                    : (isEn ? 'correct!' : 'richtig!');

            // Hot Potato: bei pool-exhausted (>=2 Ueberlebende) haben alle
            // Ueberlebenden gewonnen und ein Feld bekommen. Zeige sie alle an,
            // sonst wirkt die Folie wie "Harald gewinnt allein".
            let hpCoWinners: typeof s.teams | null = null;
            if (cat === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'hotPotato') {
              const eliminated = new Set((s.hotPotatoEliminated ?? []) as string[]);
              const alive = s.teams.filter(t => !eliminated.has(t.id));
              if (alive.length >= 2) hpCoWinners = alive;
            }
            if (hpCoWinners) {
              const survivorCount = hpCoWinners.length;
              const totalCount = s.teams.length;
              const everyoneSurvived = survivorCount === totalCount;
              const hpMsg = isEn
                ? (everyoneSurvived
                    ? 'all survived — each gets an action!'
                    : `${survivorCount} survived — each gets an action!`)
                : (everyoneSurvived
                    ? 'alle überlebt — jedes Team bekommt eine Aktion!'
                    : `${survivorCount} haben überlebt — jedes Team bekommt eine Aktion!`);
              return (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  // 2026-05-12 (Wolf 'gewinnercard ausserhalb slide'): Survivor-
                  // Card kompakter — gap/padding/Avatar/Font alle runter, dann
                  // passt sie auch wenn Answer-Grid voll ist.
                  gap: 'clamp(6px, 0.8cqh, 12px)',
                  padding: 'clamp(10px, 1.2cqh, 18px) clamp(18px, 2.4cqw, 36px)',
                  borderRadius: 20,
                  width: '100%', maxWidth: 1400,
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.05))',
                  border: '2px solid rgba(34,197,94,0.55)',
                  boxShadow: '0 0 60px rgba(34,197,94,0.25), 0 8px 24px rgba(0,0,0,0.4)',
                  animation: `revealWinnerIn 0.65s var(--qq-ease-bounce) ${bannerDelay}s both`,
                }}>
                  {/* Zeile 1: Kartoffel + alle Team-Chips (wrappt bei vielen Teams) */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 'clamp(10px, 1.2cqw, 16px)', flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: 'clamp(26px, 3.2cqw, 44px)', lineHeight: 1 }}><QQEmojiIcon emoji="🥔"/></span>
                    {hpCoWinners.map((tm, i) => (
                      <div key={tm.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(40px, 4.4cqw, 62px)'} style={{
                          flexShrink: 0, boxShadow: `0 0 18px ${tm.color}55`,
                          animation: `celebShake 0.6s ease ${avatarDelay + i * 0.1}s both`,
                        }} />
                        <TeamNameLabel
                          name={tm.name}
                          maxLines={1}
                          shrinkAfter={16}
                          color={tm.color}
                          fontWeight={900}
                          fontSize="clamp(16px, 2cqw, 26px)"
                          style={{
                            textShadow: `0 0 24px ${tm.color}44`,
                            maxWidth: 200,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Zeile 2: Message — eigene Zeile, immer zentriert */}
                  <div style={{
                    color: '#86efac', fontSize: 'clamp(14px, 1.7cqw, 22px)', fontWeight: 900, lineHeight: 1.2,
                    textAlign: 'center',
                  }}>
                    {hpMsg}
                  </div>
                </div>
              );
            }

            // Echter Zeit-Gleichstand (gleiche max Punkte + gleiche ms) → mehrere Sieger
            if (coWinners && coWinners.length > 1) {
              const coMsg = isEn
                ? `all tied on points & speed${allInTie ? ` (+${allInTie.winnerPts})` : ''}!`
                : `gleich viele Punkte und gleich schnell${allInTie ? ` (+${allInTie.winnerPts})` : ''}!`;
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22,
                  padding: '22px 38px', borderRadius: 24,
                  width: '100%', maxWidth: 1400, flexWrap: 'wrap',
                  background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(236,72,153,0.05))',
                  border: '2px solid rgba(236,72,153,0.55)',
                  boxShadow: '0 0 60px rgba(236,72,153,0.25), 0 8px 24px rgba(0,0,0,0.4)',
                  animation: `revealWinnerIn 0.65s var(--qq-ease-bounce) ${bannerDelay}s both`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {coWinners.map((tm, i) => (
                      <div key={tm.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(64px, 7cqw, 96px)'} style={{
                          flexShrink: 0, boxShadow: `0 0 24px ${tm.color}55`,
                          animation: `celebShake 0.6s ease ${avatarDelay + i * 0.1}s both`,
                        }} />
                        <div style={{
                          fontWeight: 900, fontSize: 'clamp(26px, 3.4cqw, 48px)', color: tm.color, lineHeight: 1.1,
                          textShadow: `0 0 24px ${tm.color}44`,
                        }}>{tm.name}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    color: '#EC4899', fontSize: 'clamp(18px, 2.4cqw, 30px)', fontWeight: 900, lineHeight: 1.2,
                  }}>
                    {coMsg}
                  </div>
                </div>
              );
            }

            // Single-winner Banner — Team-Farben-Card (User-Feedback:
            // Gewinner-Card unten in Team-Farbe statt nur am Loesungsfeld oben).
            // 2026-05-10 (Wolf-Live-Test L8 'Mu-Cho untere Card abgeschnitten'):
            // Avatar 8vw→7cqw, font 5vw→4.2cqw, padding 2vh→1.6cqh, sub-margin
            // 6→4 — Banner ~15-20% kompakter damit Reveal bei Mu-Cho mit 4 Optionen
            // + Frage nicht den viewport-Bottom verlässt (overflow:hidden global).
            return (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 'clamp(16px, 2cqw, 30px)',
                padding: 'clamp(12px, 1.6cqh, 22px) clamp(20px, 2.6cqw, 36px)',
                width: '100%', maxWidth: 1400,
                borderRadius: 22,
                background: `linear-gradient(135deg, ${team!.color}26, ${team!.color}08)`,
                border: `3px solid ${team!.color}88`,
                boxShadow: `0 0 60px ${team!.color}33, 0 8px 24px rgba(0,0,0,0.4)`,
                animation: `revealWinnerIn 0.65s var(--qq-ease-bounce) ${bannerDelay}s both`,
              }}>
                <QQTeamAvatar avatarId={team!.avatarId} teamEmoji={team!.emoji} size={'clamp(56px, 7cqw, 92px)'} style={{
                  flexShrink: 0,
                  boxShadow: `0 0 24px ${team!.color}88`,
                  animation: `celebShake 0.6s ease ${avatarDelay}s both`,
                }} />
                <div style={{ minWidth: 0 }}>
                  <TeamNameLabel
                    name={team!.name}
                    maxLines={2}
                    shrinkAfter={18}
                    color={team!.color}
                    fontWeight={900}
                    fontSize="clamp(30px, 4.2cqw, 60px)"
                    style={{
                      textShadow: `0 0 24px ${team!.color}55`,
                      padding: '0 0.3em',
                    }}
                  />
                  <div style={{
                    color: '#cbd5e1', fontSize: 'clamp(17px, 2.4cqw, 30px)', fontWeight: 900, marginTop: 4, lineHeight: 1.2,
                  }}>
                    {winMsg}
                  </div>
                </div>
              </div>
            );
          })()}
            </div>
          )}

          {/* Confetti overlay on correct answer (delayed to sync with winner) */}
          {revealed && s.correctTeamId && showUnifiedWinner && (
            <div style={{ animation: 'contentReveal 0.01s var(--qq-ease-pop-fast) 0.8s both' }}>
              <ConfettiOverlay eurovisionMode={s.theme?.eurovisionMode} />
            </div>
          )}

          {/* Nobody got it right banner */}
          {revealed && !s.correctTeamId && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
              padding: '24px 44px', borderRadius: 24, marginBottom: 12,
              width: '100%', maxWidth: 1400,
              background: 'rgba(239,68,68,0.08)',
              border: '2px solid rgba(239,68,68,0.30)',
              boxShadow: '0 0 40px rgba(239,68,68,0.15)',
              animation: 'revealWinnerIn 0.5s var(--qq-ease-bounce) 0.5s both',
            }}>
              <span style={{ fontSize: 'clamp(48px, 6cqw, 80px)', lineHeight: 1 }}>
                {s.answers.length === 0 ? '⏱' : <QQEmojiIcon emoji="❌"/>}
              </span>
              <div style={{
                fontSize: 'clamp(24px, 3.5cqw, 48px)', fontWeight: 900,
                color: s.answers.length === 0 ? '#94a3b8' : '#f87171',
              }}>
                {s.answers.length === 0
                  ? (lang === 'en' ? 'No answers!' : 'Keine Antworten!')
                  : (lang === 'en' ? 'Nobody got it right!' : 'Keiner hatte Recht!')}
              </div>
            </div>
          )}

          {/* Bottom: team answer progress — Hot Potato has its own indicator below */}
          {!revealed && s.teams.length > 0 && !(q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              position: 'absolute', bottom: 16, left: 0, right: 0,
            }}>
              {/* Progress text — verschwindet wenn alle dran sind (Avatare mit ✓ zeigen's eh) */}
              {!s.allAnswered && (
                <div style={{
                  fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900,
                  color: '#64748b',
                }}>
                  {`${s.answers.length}/${s.teams.length} Teams`}
                </div>
              )}
              {/* Avatar row.
                  2026-05-12 (Wolf 'footer-avatare vereinheitlichen, Glow weg
                  damit sie sich nicht ueberlappen, etwas groesser'): von
                  68/76/84 auf 80/88/96 hochgezogen (Platz haben wir, footer
                  ist full-width). drop-shadow-Glow entfernt — der gruene Ring
                  via boxShadow zeigt 'submitted' eindeutig, der Glow erzeugte
                  Bleed der bei dicht stehenden Avataren ueberlappte. */}
              {(() => {
                const tc = s.teams.length;
                const av = tc > 6 ? 80 : tc > 4 ? 88 : 96;
                const gap = tc > 6 ? 12 : tc > 4 ? 15 : 18;
                return (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap,
                    maxWidth: '100%',
                  }}>
                    {s.teams.map(tm => {
                      const answered = s.answers.some(a => a.teamId === tm.id);
                      return (
                        <div key={tm.id} style={{
                          position: 'relative',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'opacity 0.4s ease, filter 0.4s ease',
                          opacity: answered ? 1 : 0.4,
                          filter: answered ? 'none' : 'grayscale(0.5)',
                        }}>
                          <div style={{
                            borderRadius: '50%',
                            boxShadow: answered ? '0 0 0 3px #22C55E' : 'none',
                            transition: 'box-shadow 0.45s ease',
                            display: 'inline-flex',
                          }}>
                            <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={av} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── HOT POTATO: active team + turn timer + used answers ── */}
          {q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato' && (
            <HotPotatoBeamerView state={s} lang={lang} revealed={revealed} />
          )}
          </div>{/* /Inner-Content-Wrapper */}
        </div>
          );
        })()}

        {/* ── Image window panel (window-left / window-right — NOT CHEESE, which uses overlay) ── */}
        {isWindow && (
          <div style={{
            width: '35%', flexShrink: 0, position: 'relative', zIndex: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}>
            {/* Ambient blur glow behind image */}
            <img
              src={img.bgRemovedUrl || img.url}
              alt="" aria-hidden
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'contain',
                filter: 'blur(60px) saturate(1.8) brightness(0.5)',
                opacity: 0.5, pointerEvents: 'none',
                transform: 'scale(1.15)',
              }}
            />
            {/* Main image */}
            <img
              src={img.bgRemovedUrl || img.url}
              alt={isCheese ? (q.text || 'Question image') : 'Question image'}
              style={{
                position: 'relative', zIndex: 1,
                maxWidth: '100%', maxHeight: '80cqh',
                borderRadius: img.bgRemovedUrl ? 0 : 22,
                objectFit: 'contain',
                boxShadow: img.bgRemovedUrl
                  ? 'none'
                  : `0 12px 48px rgba(0,0,0,0.6), 0 0 32px ${glow}`,
                filter: img.bgRemovedUrl
                  ? `drop-shadow(0 16px 40px rgba(0,0,0,0.7))${imgFilter(img) ? ' ' + imgFilter(img) : ''}`
                  : imgFilter(img),
                animation: imgAnim(img.animation, img.layout, img.animDelay, img.animDuration),
                transform: `translate(${img.offsetX ?? 0}%, ${img.offsetY ?? 0}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`,
                opacity: img.opacity ?? 1,
              }}
            />
            {/* Dark vignette frame to blend white-bg images into dark theme */}
            {!img.bgRemovedUrl && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                borderRadius: 24,
                background: 'radial-gradient(ellipse at center, transparent 55%, rgba(13,10,6,0.7) 100%)',
              }} />
            )}
          </div>
        )}

        {/* No right panel — everything centered in main area */}
      </div>
    </div>
  );
}
