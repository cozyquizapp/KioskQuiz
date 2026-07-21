/**
 * CozyQuizGameOverView — Sieger-Reveal nach allen Phasen.
 *
 * Hero-Sieger mit Konfetti, Standings-Tabelle (rang-sortiert), Final-Bonus-
 * Boxen, optionaler QR-Code zum Summary. Wolf jubel mit Sprechblase.
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-12 (Refactor Phase 4).
 * Mit-extrahiert: WolfJubelWithBubble (lokaler Helper, nur in GameOverView).
 * 2 externe Importer (QQBuiltinSlide + Test-Pages).
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { useLangFlip, bt, COZY_CARD_BG } from '../cozyQuizShared';
import { qqSortedTeams } from '../qqShared';
import { Fireflies, EurovisionHearts } from './CozyQuizAmbient';
import { ConfettiOverlay } from './CozyQuizConfettiOverlay';
import { GridDisplay } from './CozyQuizGridDisplay';
import { QQTeamAvatar } from './QQTeamAvatar';
import { QQEmojiIcon, QQIcon } from './QQIcon';
import { TeamNameLabel } from './TeamNameLabel';
import { CozyWolfImage } from './CozyWolfImage';
import { WolfHeadIcon } from './WolfHeadIcon';
import { LargeGroupGameOverView } from './CozyQuizLargeGroupView';
import {
  AnimatedCozyWolf, WolfCoModerator, SpeechBubble,
  getBrandColors, getStandingAvatarSize, type Slogan,
} from '../pages/QQBeamerPage';
import {
  playAvatarCascadeNote, playClimaxFinish, playWolfHowl, playFanfare,
} from '../utils/sounds';
import { isThemed, themedWindow } from '../qqTheme';

export function GameOverView({ state: s }: { state: QQStateUpdate; roomCode?: string }) {
  const lang = useLangFlip(s.language);
  // 2026-05-24 (Refactor #2): nutzt jetzt qqSortedTeams() statt eigener
  // Sortierung. Backend liefert kanonische sortedTeamIds; bei Tie wird
  // tieBreakerWinnerId nach vorne gezogen. Vorher 3 verschiedene Sort-
  // Stellen im Frontend (Drift bei Ties zwischen Mod, Beamer, Team-View).
  const sorted = qqSortedTeams(s);
  const winner = sorted[0];
  const winnerColor = winner?.color ?? 'var(--qq-accent)';

  // 2026-05-05 (Wolf-Wahl 4C): Score-Spotlight-Sequence vor der Recap-Tabelle.
  // Letzter Platz zuerst (revealIdx 0 = sorted[last]), dann aufsteigend bis
  // zum Sieger (revealIdx === sorted.length - 1). Nach allen Teams: Recap-
  // Tabelle. Auto-Advance alle 3.5s, Mod kann mit Space/ArrowRight skippen
  // und mit P pausieren.
  const reverseSorted = [...sorted].reverse(); // index 0 = lowest team
  const [revealIdx, setRevealIdx] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  const isRecap = revealIdx >= sorted.length;
  // Auto-advance Timer
  useEffect(() => {
    if (paused || isRecap) return;
    const t = window.setTimeout(() => {
      setRevealIdx(prev => Math.min(prev + 1, sorted.length));
    }, 3500);
    return () => window.clearTimeout(t);
  }, [revealIdx, paused, isRecap, sorted.length]);

  // 2026-05-17 P10 (Wolf 'wenn final standings tabelle kommt, ist kein sound'):
  // Mount-Fanfare als „Final Standings"-Announce-Cue. Cascade-Notes pro Team
  // bleiben wie vorher, Mount-Sound bringt einen klaren Auftakt-Moment.
  useEffect(() => {
    if (s.sfxMuted) return;
    try { playFanfare(); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2026-05-05 (Wolf 'Sound pro Team in Tabelle, Extra-Sound Platz 1'):
  // Pro Recap-Stage einen Cascade-Note (psychoakustisch aufsteigend).
  // Beim Platz-1-Reveal: zusaetzlich Climax-Finish-Akkord + Wolf-Howl.
  const lastRevealedSoundRef = useRef<number>(-1);
  useEffect(() => {
    if (isRecap || paused) return;
    if (revealIdx === lastRevealedSoundRef.current) return;
    lastRevealedSoundRef.current = revealIdx;
    if (s.sfxMuted) return;
    // index 0 = lowest rank, sorted.length - 1 = winner (Platz 1)
    const total = Math.max(2, sorted.length);
    const isWinner = revealIdx === sorted.length - 1;
    try {
      playAvatarCascadeNote(revealIdx, total);
      if (isWinner) {
        window.setTimeout(() => { try { playClimaxFinish(); } catch {} }, 280);
        window.setTimeout(() => { try { playWolfHowl(); } catch {} }, 900);
      }
    } catch {}
  }, [revealIdx, isRecap, paused, sorted.length, s.sfxMuted]);
  // Mod-Keyboard: Space/ArrowRight = next, P = pause toggle
  // 2026-05-05 (Live-Mod-Audit #7): nur reagieren wenn Beamer-Tab tatsaechlich
  // im Vordergrund + fokussiert ist. Vorher konnte ein Doppel-Tab-Setup
  // (Mod + Beamer) den Mod-Flow bypassen wenn Wolf den Beamer-Tab geklickt
  // hatte — der Beamer-Counter advanced ohne dass Mod synchron war.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.hidden || !document.hasFocus()) return;
      if (e.code === 'Space' || e.code === 'ArrowRight') {
        e.preventDefault();
        setRevealIdx(prev => Math.min(prev + 1, sorted.length));
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setPaused(p => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sorted.length]);

  // 2026-05-05 (Animation-Audit #6): Spotlight-Stage = Cinematic-Moment, andere
  // Ambient-Loops pausieren. Nach Recap raus.
  useEffect(() => {
    if (isRecap) {
      document.body.removeAttribute('data-cinematic');
      return;
    }
    document.body.setAttribute('data-cinematic', 'true');
    return () => { document.body.removeAttribute('data-cinematic'); };
  }, [isRecap]);

  // 2026-07-01: Groß-Modus — dedizierte kompakte GameOver-View (Sieger-Hero +
  // Top-10-Bar-Race, kein Grid, keine 25er-Spotlight-Kaskade). Nach allen Hooks,
  // damit Rules-of-Hooks gewahrt bleibt (largeGroupMode ist pro Spiel konstant).
  if ((s as any).largeGroupMode) return <LargeGroupGameOverView state={s} />;

  // ── Spotlight-Stage: 1 Team riesig, vor der Recap-Tabelle ────────────────
  if (!isRecap) {
    const team = reverseSorted[revealIdx];
    const rank = sorted.length - revealIdx;
    const isWinner = rank === 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
    const teamColor = team?.color ?? 'var(--qq-accent)';
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        // 2026-05-12 (Wolf 'safe-margin im ganzen quiz'): floor auf Safe-Margin.
        padding: 'max(var(--qq-safe-margin), clamp(16px, 2.5cqh, 36px)) max(var(--qq-safe-margin), clamp(20px, 3cqw, 48px))',
        gap: 'clamp(14px, 2cqh, 28px)',
        minHeight: 0,
      }}>
        {/* Ambient glow in Team-Farbe */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse at center, ${teamColor}33 0%, transparent 60%)`,
          transition: 'background 0.6s ease',
        }} />
        <ConfettiOverlay eurovisionMode={s.theme?.eurovisionMode} />
        <Fireflies color={`${teamColor}55`} />
        {s.theme?.eurovisionMode && <EurovisionHearts />}

        {/* Header — Rang + Pause-Indikator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'clamp(12px, 1.6cqw, 22px)',
          position: 'relative', zIndex: 5,
          animation: 'phasePop 0.5s var(--qq-ease-bounce) both',
        }}>
          <div style={{
            fontSize: 'clamp(18px, 1.8cqw, 26px)', fontWeight: 900,
            color: 'var(--qq-text-muted)', letterSpacing: '0.16em', textTransform: 'uppercase',
          }}>
            {lang === 'en' ? 'Final Standings' : 'Spielende'}
          </div>
          {paused && (
            <div style={{
              padding: '4px 12px', borderRadius: 'var(--qq-pill-radius)',
              background: 'rgba(var(--qq-accent-rgb),0.18)', border: '1.5px solid rgba(var(--qq-accent-rgb),0.55)',
              fontSize: 'clamp(12px, 1.2cqw, 16px)', fontWeight: 900, color: isThemed() ? 'var(--qq-accent)' : '#FBCFE8',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}>
              ⏸ {lang === 'en' ? 'Paused (P to resume)' : 'Pause (P zum Fortsetzen)'}
            </div>
          )}
        </div>

        {/* Spotlight-Card riesig */}
        {team && (
          <div
            key={`spotlight-${team.id}`}  // re-mount fuer fresh entry-anim
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 'clamp(14px, 2cqh, 28px)',
              padding: 'clamp(28px, 4cqh, 56px) clamp(40px, 5cqw, 90px)',
              borderRadius: 32,
              background: `linear-gradient(135deg, ${teamColor}28 0%, ${teamColor}10 100%)`,
              border: `3px solid ${teamColor}aa`,
              boxShadow: `0 0 80px ${teamColor}55, 0 16px 60px rgba(0,0,0,0.55)`,
              animation: 'finaleWinner 0.7s var(--qq-ease-out-cubic) both',
              position: 'relative', zIndex: 5,
              maxWidth: 'min(900px, 90cqw)',
            }}>
            {/* Rang-Badge mit Medaille (Top-3) oder #N */}
            <div style={{
              fontSize: 'clamp(60px, 8cqw, 130px)', lineHeight: 1,
              animation: 'phasePop 0.6s var(--qq-ease-bounce) 0.2s both',
            }}>
              {medal ? <QQEmojiIcon emoji={medal}/> : (
                <span style={{
                  fontSize: 'clamp(32px, 4cqw, 60px)', fontWeight: 900,
                  color: 'var(--qq-text-muted)', letterSpacing: '-0.02em',
                }}>#{rank}</span>
              )}
            </div>

            {/* Avatar gross */}
            <div style={{
              animation: 'phasePop 0.6s var(--qq-ease-bounce) 0.35s both',
            }}>
              <QQTeamAvatar
                avatarId={team.avatarId}
                teamEmoji={team.emoji}
                size={'clamp(140px, 18cqw, 260px)'}
                style={{
                  boxShadow: isWinner
                    ? `0 0 0 4px var(--qq-accent), 0 0 60px rgba(var(--qq-accent-rgb),0.7), 0 12px 40px rgba(0,0,0,0.5)`
                    : `0 0 0 3px ${teamColor}, 0 0 40px ${teamColor}aa, 0 12px 36px rgba(0,0,0,0.5)`,
                }}
              />
            </div>

            {/* Team-Name riesig mit per-letter Wave-Stagger (Wolf-Audit 2026-
                05-24: konsistent zu PhaseIntroView Cat-Title). Bei Namen > 14
                Zeichen automatisch 85% Schrift (analog TeamNameLabel-Shrink),
                flex-wrap erlaubt Multi-Line ohne harte Ellipsis. */}
            {(() => {
              const isLong = team.name.length > 14;
              const baseFs = isLong ? 'clamp(34px, 4.7cqw, 75px)' : 'clamp(40px, 5.5cqw, 88px)';
              return (
                <div style={{
                  filter: `drop-shadow(0 0 18px ${teamColor}55)`,
                  animation: 'phasePop 0.55s var(--qq-ease-bounce) 0.5s both',
                  textAlign: 'center',
                  display: 'flex', flexWrap: 'wrap',
                  justifyContent: 'center', alignItems: 'baseline',
                  gap: '0',
                  maxWidth: '100%',
                  fontSize: baseFs,
                  color: teamColor,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  wordBreak: 'break-word',
                }} title={team.name}>
                  {Array.from(team.name).map((ch, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-block',
                        whiteSpace: ch === ' ' ? 'pre' : undefined,
                        animation: 'qqCatNameWave 2.8s ease-in-out infinite',
                        animationDelay: `${1.1 + i * 0.07}s`,
                      }}
                    >{ch}</span>
                  ))}
                </div>
              );
            })()}

            {/* Score riesig */}
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 'clamp(10px, 1.2cqw, 18px)',
              animation: 'finaleScoreCount 0.7s var(--qq-ease-bounce) 0.7s both',
            }}>
              <span style={{
                fontSize: 'clamp(80px, 11cqw, 180px)', fontWeight: 900,
                color: isThemed() ? 'var(--qq-accent)' : '#FBCFE8',
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                textShadow: '0 0 40px rgba(var(--qq-accent-rgb),0.55)',
              }}>{team.largestConnected}</span>
              <span style={{
                fontSize: 'clamp(20px, 2.4cqw, 36px)', fontWeight: 700,
                color: 'var(--qq-text-muted)',
              }}>
                {team.largestConnected === 1
                  ? (lang === 'en' ? 'cell' : 'Feld')
                  : (lang === 'en' ? 'cells' : 'Felder')}
              </span>
            </div>
          </div>
        )}

        {/* 2026-05-05 (Wolf): Steuerungs-Hint entfernt — Mod kennt seine
            Hotkeys, Beamer-Publikum braucht das nicht zu sehen. */}
      </div>
    );
  }

  // Layout: Variante B — 2-Spalten "Awards-Look".
  // Links: Grid riesig (volle Bildhoehe). Rechts: schmaler Side-Panel mit
  // Title, Hero (Trophy/Avatar/Name/Score) und alle anderen Teams in EINER
  // horizontalen Reihe darunter.
  return (
    <div style={{
      flex: 1, display: 'grid',
      // 2026-05-05 (Wolf 'Tabelle rechts sehr klein'): rechte Spalte breiter
      // 360-520 → 420-620 → mehr Platz fuer lesbare Schrift in den Rank-Cards.
      gridTemplateColumns: 'minmax(0, 1fr) clamp(420px, 36cqw, 620px)',
      alignItems: 'stretch', gap: 'clamp(16px, 2cqw, 36px)',
      position: 'relative', overflow: 'hidden',
      padding: 'clamp(16px, 2cqh, 28px) clamp(20px, 2.5cqw, 40px) clamp(20px, 2.5cqh, 36px)',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 25% 50%, ${winnerColor}28 0%, transparent 55%), radial-gradient(ellipse at 80% 90%, rgba(162,18,71,0.14) 0%, transparent 50%)`,
      }} />

      {/* Confetti */}
      <ConfettiOverlay eurovisionMode={s.theme?.eurovisionMode} />
      <Fireflies color={`${winnerColor}55`} />
      {s.theme?.eurovisionMode && <EurovisionHearts />}

      {/* ── LINKE SPALTE: Grid riesig, full-height ─────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 5,
        animation: 'finaleWinner 0.9s var(--qq-ease-out-cubic) 0.6s both',
        minWidth: 0,
      }}>
        {/* 2026-06-24 (Wolf 'mono-rahmen auch ums grid'): Grid-Rahmen traegt bei
            aktivem Skin die volle Card-Behandlung (z.B. Studio-Mono schwarzer
            Rand + Hard-Shadow) statt des Cozy-Sieger-Glows. Cozy unveraendert. */}
        <div style={{
          padding: 16,
          borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24,
          background: isThemed() ? 'var(--qq-card-bg)' : 'var(--qq-surface)',
          border: isThemed() ? 'var(--qq-card-border)' : `2px solid ${winnerColor}55`,
          boxShadow: isThemed() ? 'var(--qq-card-shadow)' : `0 0 60px ${winnerColor}33, 0 12px 40px rgba(0,0,0,0.5)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <GridDisplay
            state={s}
            maxSize={typeof window !== 'undefined'
              ? Math.min(window.innerHeight * 0.82, window.innerWidth * 0.55)
              : 700}
            highlightTeam={winner?.id ?? null}
            showJoker
          />
        </div>
      </div>

      {/* ── RECHTE SPALTE: Title + Hero + Rankings vertikal ────────────── */}
      {/* 2026-05-07 (Layout-Audit): justifyContent flex-start → center.
           Bei 2-3 Teams hatte die Spalte unten viel Lücke unter den Rankings,
           während Title+Hero oben standen. center balanciert beide Enden. */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 'clamp(8px, 1.2cqh, 16px)',
        position: 'relative', zIndex: 5,
        minWidth: 0, paddingTop: 'clamp(8px, 1.5cqh, 20px)',
      }}>
        {/* Title — klein, oben */}
        <div style={{
          fontSize: 'clamp(14px, 1.4cqw, 18px)', fontWeight: 900,
          color: 'var(--qq-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
          animation: 'contentReveal 0.6s var(--qq-ease-pop-fast) both',
        }}>
          {lang === 'en' ? 'Game Over' : 'Spielende'}
        </div>

        {/* Hero — Trophy + Avatar + Name + Score.
            User-Wunsch 2026-04-28: 'auflösen letztes team, dann vorletztes usw
            bis zum Sieger (den als letztes)'. Winner-Hero bekommt einen
            gestaffelten Delay basierend auf Anzahl Teams: jedes andere Team
            wird zuerst revealed, dann erst der Sieger. */}
        {winner && (() => {
          const otherCount = sorted.length - 1;
          // Pro anderem Team ~0.9s reveal-step, plus 0.6s Initial-Pause.
          const winnerHeroDelay = 0.6 + otherCount * 0.9;
          const trophyDelay = winnerHeroDelay + 0.5;
          const sparkleStartDelay = winnerHeroDelay + 1.0;
          const nameGlowDelay = winnerHeroDelay + 0.7;
          const scoreCountDelay = winnerHeroDelay + 0.9;
          const avatarShakeDelay = winnerHeroDelay + 0.4;
          const avatarBreatheDelay = winnerHeroDelay + 1.1;
          return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          animation: `finaleWinner 0.8s var(--qq-ease-out-cubic) ${winnerHeroDelay}s both`,
        }}>
          {/* 2026-06-30 (Wolf-Lieferung fx-trophy.png): 3D-Pokal statt OS-Emoji. */}
          <img src="/icons/fx-trophy.png" alt="" aria-hidden draggable={false} style={{
            width: 'clamp(46px, 4.8cqw, 70px)', height: 'auto',
            animation: `finaleStarBurst 0.5s ease ${trophyDelay}s both, finaleTrophyFloat 3.4s ease-in-out ${trophyDelay + 0.6}s infinite`,
          }} />

          {/* 2026-05-06 (Wolf 'hinter Gewinnerteam ist immernoch das Rechteck
              zu sehen'): boxShadow vom Avatar-style-prop wird intern von
              EmojiAvatar's flatStyle ueberschrieben (= Glow ging verloren,
              uebrig blieb der kleine asymmetrische Inset-Shadow der als
              Rechteck wirkte). Glow jetzt auf einem zirkulaeren Wrapper-Div
              das den Avatar enthaelt — Glow ist sichtbar UND clean rund. */}
          <div style={{
            position: 'relative', display: 'inline-block', marginTop: 2,
            borderRadius: '50%',
            boxShadow: `0 0 60px ${winnerColor}66, 0 0 120px ${winnerColor}40`,
            animation: `celebShake 0.6s ease ${avatarShakeDelay}s both, finaleAvatarBreathe 4s ease-in-out ${avatarBreatheDelay}s infinite`,
          }}>
            <QQTeamAvatar avatarId={winner.avatarId} teamEmoji={winner.emoji} size={'clamp(80px, 8cqw, 120px)'} />
            {([
              { top: '-8%',  left: '12%', delay: 0.0, dur: 2.8, size: 'clamp(14px, 1.5cqw, 22px)' },
              { top: '18%',  left: '-10%', delay: 0.6, dur: 3.2, size: 'clamp(12px, 1.3cqw, 18px)' },
              { top: '60%',  left: '-6%', delay: 1.3, dur: 2.6, size: 'clamp(10px, 1.1cqw, 16px)' },
              { top: '92%',  left: '32%', delay: 0.2, dur: 3.0, size: 'clamp(12px, 1.4cqw, 20px)' },
              { top: '88%',  left: '78%', delay: 0.9, dur: 2.8, size: 'clamp(14px, 1.6cqw, 22px)' },
              { top: '56%',  left: '102%', delay: 1.5, dur: 2.4, size: 'clamp(10px, 1.2cqw, 16px)' },
              { top: '14%',  left: '96%', delay: 0.4, dur: 3.4, size: 'clamp(12px, 1.4cqw, 18px)' },
              { top: '-6%',  left: '74%', delay: 1.1, dur: 2.6, size: 'clamp(14px, 1.5cqw, 22px)' },
            ]).map((sp, i) => (
              <span key={i} style={{
                position: 'absolute',
                top: sp.top, left: sp.left,
                width: sp.size, height: sp.size,
                fontSize: sp.size,
                lineHeight: 1,
                color: 'var(--qq-accent)',
                textShadow: `0 0 12px ${winnerColor}, 0 0 4px rgba(255,255,255,0.6)`,
                animation: `finaleSparklePop ${sp.dur}s ease-in-out ${sparkleStartDelay + sp.delay}s infinite`,
                pointerEvents: 'none',
                zIndex: 6,
              }}>✦</span>
            ))}
          </div>

          {/* 2026-05-06 (Wolf 'teamname des gewinnerteams sollte nicht so
              komisch 2 zeilig gemacht werden'): maxLines 2→1, shrinkAfter
              16→10, fontSizeLong klein genug fuer ~16 chars Names. Bricht
              jetzt nicht mehr mitten im Wort. */}
          <TeamNameLabel
            name={winner.name}
            maxLines={1}
            shrinkAfter={10}
            color={winnerColor}
            fontWeight={900}
            fontSize="clamp(24px, 2.6cqw, 38px)"
            fontSizeLong="clamp(16px, 1.8cqw, 26px)"
            style={{
              animation: `finaleGlow 3s ease-in-out ${nameGlowDelay}s infinite`,
              marginTop: 6,
              maxWidth: 'min(95%, 480px)',
              padding: '0 0.5em',
              textAlign: 'center',
            }}
          />

          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, flexDirection: 'column',
            animation: `finaleScoreCount 0.7s var(--qq-ease-bounce) ${scoreCountDelay}s both`,
          }}>
            <span style={{
              fontSize: 'clamp(13px, 1.4cqw, 18px)', fontWeight: 900,
              color: '#EC4899',
              textShadow: '0 0 18px rgba(236,72,153,0.45)',
            }}>
              {winner.largestConnected} {lang === 'de' ? 'verbundene Felder' : 'connected cells'}
            </span>
            {/* v3 round 9: totalCells als Tie-Break-Hint immer mit anzeigen */}
            <span style={{
              fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 700,
              color: 'var(--qq-text-muted)',
            }}>
              {winner.totalCells} {lang === 'de' ? 'Felder gesamt' : 'total cells'}
            </span>
          </div>
        </div>
          );
        })()}

        {/* Rankings — alle anderen Teams.
            User-Wunsch 2026-04-28-v2:
            (1) Reveal-Reihenfolge: letztes Team zuerst, dann aufsteigend bis
                zum 2. Platz. Sieger als Climax danach via winnerHeroDelay.
            (2) Layout: untereinander statt horizontale Reihe. Bei wenigen
                Teams + Platz → 1 Spalte, sonst 2 Spalten (statt einer langen
                horizontalen Reihe wie vorher). */}
        {sorted.length > 1 && (() => {
          const others = sorted.slice(1);
          const wn = others.length;
          // 2026-04-28-v3: 1col bevorzugt — User-Wunsch 'unter der Sieger-Card
          // ist genug Platz die Teams in einer Spalte anzuzeigen'.
          // v3 round 9 (User-Bug 'wieso 2-spaltig bei 7-8 Teams'): 1-Spalte
          // jetzt fuer ALLE Teams-Counts (7-8 inkl). Cards entsprechend
          // kompakter (kleinere padding/font), aber konsistente Listen-Optik.
          const cols = 1;
          // Avatar-Groesse via shared Helper - konsistent zu PausedView-Standings
          const avatarSize = getStandingAvatarSize(wn, false);
          // 2026-05-05 (Wolf 'Text in Tabelle viel zu klein'): Font-Sizes nochmals
          // ~25% rauf, padding auch. Rechte Spalte ist jetzt breiter (420-620),
          // also ist Platz da. Bei 7-8 Teams (wn >= 7) bleibt's etwas dichter
          // gepackt damit alle Cards sichtbar sind ohne Clipping.
          const nameFs   = cols === 1
            ? wn <= 4 ? 'clamp(22px, 2.4cqw, 32px)'
            : wn <= 6 ? 'clamp(19px, 2.0cqw, 26px)'
            : 'clamp(17px, 1.8cqw, 23px)'
            : 'clamp(15px, 1.55cqw, 20px)';
          const scoreFs  = cols === 1
            ? wn <= 4 ? 'clamp(20px, 2.2cqw, 28px)'
            : wn <= 6 ? 'clamp(18px, 1.9cqw, 24px)'
            : 'clamp(16px, 1.7cqw, 22px)'
            : 'clamp(14px, 1.5cqw, 19px)';
          const cardPad  = cols === 1
            ? wn <= 4 ? '12px 16px'
            : wn <= 6 ? '10px 14px'
            : '8px 13px'
            : '8px 12px';
          // Reverse-Reveal: letztes (höchster Index) zuerst, niedrigster (Silver) zuletzt.
          // Pro Team-Step ~0.9s.
          const revealStep = 0.9;
          return (
            <div style={{
              display: 'grid',
              gridTemplateColumns: cols === 1 ? '1fr' : '1fr 1fr',
              alignItems: 'stretch',
              justifyContent: 'center',
              gap: 'clamp(6px, 1cqh, 10px)',
              width: '100%',
              marginTop: 'clamp(6px, 1cqh, 14px)',
            }}>
              {others.map((tm, i) => {
                const rank = i + 2;
                const medal = rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                // Reveal-Order: letztes Team zuerst (höchster i = niedrigster rank)
                const revealOrderIdx = (others.length - 1) - i;
                const revealDelay = 0.6 + revealOrderIdx * revealStep;
                return (
                  <div key={tm.id} style={{
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: cardPad,
                    // Cozy-Look: Team-Tint. Im Skin Mono-Frame via Helper
                    // (Team-Farbe bleibt in Name + Avatar sichtbar).
                    borderRadius: 16,
                    background: `linear-gradient(90deg, ${tm.color}1a, ${tm.color}08)`,
                    border: `1.5px solid ${tm.color}55`,
                    boxShadow: `0 4px 14px rgba(0,0,0,0.35)`,
                    animation: `finaleRank 0.55s var(--qq-ease-bounce) ${revealDelay}s both`,
                    ...(themedWindow() ?? {}),
                  }}>
                    <span style={{
                      fontSize: 'clamp(11px, 1.1cqw, 14px)',
                      fontWeight: 900,
                      color: rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#94a3b8',
                      lineHeight: 1,
                    }}>
                      {medal ? <QQEmojiIcon emoji={medal}/> : `#${rank}`}
                    </span>
                    <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={avatarSize} />
                    <span title={tm.name} style={{
                      // 2026-04-29: Name nimmt verbleibende Breite, Score haengt
                      // sich per marginLeft:auto an die rechte Karten-Kante.
                      flex: 1, minWidth: 0,
                      fontSize: nameFs,
                      fontWeight: 900, color: tm.color, lineHeight: 1.1,
                      // 2026-07-21 (Polish-Audit): 2-zeilig clampen statt Ellipsis —
                      // auf dem Beamer half das title= nichts, lange selbst gesetzte
                      // Teamnamen waren in der Schluss-Rangliste abgeschnitten.
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden', wordBreak: 'break-word',
                    }}>{tm.name}</span>
                    {/* v3 round 9 (User-Wunsch 'tie-transparenz im game-over'):
                        Zeige IMMER 'verbunden · gesamt' damit Tie-Break sichtbar ist
                        (Sieger bei Tie auf largestConnected = mehr totalCells). */}
                    <span style={{
                      marginLeft: 'auto',
                      display: 'inline-flex', alignItems: 'baseline', gap: 6,
                      fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: scoreFs, color: isThemed() ? 'var(--qq-accent)' : '#FBCFE8' }}>{tm.largestConnected}</span>
                      <span style={{
                        fontSize: 'clamp(13px, 1.3cqw, 17px)', color: 'var(--qq-text-muted)', fontWeight: 700,
                      }}>· {tm.totalCells}</span>
                    </span>
                  </div>
                );
              })}
              {/* 2026-05-05 (Wolf): Tie-Break-Hinweis entfernt — Mod sagt das
                  selber an statt aufs Beamer-UI zu lesen. Spart Platz unten,
                  letzte Team-Card war abgeschnitten. */}
            </div>
          );
        })()}
      </div>

      {/* 2026-05-06 v4 (Wolf 'GameOver-Wolf jubelt mit'): jubelnder Wolf
          neben dem Sieger-Team. Nur in der Recap-Tabelle sichtbar.
          2026-05-06 v6 (Wolf 'rechts oben kleiner neben dem Siegerteam'):
          Position bottom-left → top-right; Groesse 120-180 → 90-140;
          Sprechblase mit Jubel-Slogans (Mund-Sync).
          2026-05-07 (Wolf): Wolf war fast gleich gross wie Sieger-Team und
          versetzt zu hoch oben — kommt nicht ins Spiel rein. Jetzt etwas
          weiter unten (top:18%-22%) und ~30% kleiner (60-100 statt 90-140),
          plus mirror=true sodass Wolf nach links zur Mitte schaut statt aus
          dem Bild raus. Zwischen Sieger-Hero und Rankings positioniert.
          2026-05-10 (Spacing-Audit P1): top → bottom. Bei 7-8 Teams wuchs die
          rechte Rankings-Spalte nach oben in den 22cqh-Bereich und kollidierte
          mit Winner-Sparkle-Ring. Wolf rutscht an Bottom-Right (6cqh), schaut
          mirror=true nach links/oben zur Sieger-Bühne. Macht oberen Bereich
          frei für Winner-Hero-Animation, wirkt zusätzlich natürlicher
          („zur Bühne hochjubeln"). */}
      <div style={{
        position: 'absolute',
        right: 'clamp(20px, 2cqw, 40px)',
        bottom: 'clamp(40px, 6cqh, 80px)',
        zIndex: 7,
        pointerEvents: 'none',
        animation: 'panelSlideIn 0.8s var(--qq-ease-bounce) 1.4s both',
      }}>
        <WolfJubelWithBubble
          lang={lang === 'de' ? 'de' : 'en'}
          troeteBoost={s.theme?.eurovisionMode}
        />
      </div>
    </div>
  );
}
// Jubel-Wolf mit Sprechblase fuer GameOverView. Bubble-Tail an den Wolf-
// Mund (rechts unten ueber dem Wolf-Maul). Slogans + Mund-Sync analog
// zu WolfCoModerator.
function WolfJubelWithBubble({ lang, troeteBoost }: { lang: 'de' | 'en'; troeteBoost?: boolean }) {
  // 2026-05-07 (Wolf): Tröööt-Slogan ergaenzt — passt zur Tröte-Pose und
  // gibt ihr einen Sound-Text. Klingt cozy-cartoonig.
  // 2026-05-07 v8 (Wolf 'gib dem wolf eurovision sprueche'): im ESC-Mode
  // (=troeteBoost) eigener Slogan-Pool mit Douze-Points / Allez-Allez und
  // klassischen ESC-Phrasen plus weiterhin der Tröötet als Audio-Marker.
  // 2026-05-09 (Wolf): Toot-Slogans raus — der Speech-Bubble-Text und die
  // visuelle Tröten-Pose sind nicht synchronisiert (separate Cycles), daher
  // sagt der Wolf 'Toot' obwohl er gerade nicht trötet. Honest-Fix: Toot-Text
  // nur über die visuelle Pose kommunizieren.
  const slogans: Slogan[] = troeteBoost
    ? (lang === 'de'
        ? [
            { text: 'Douze points!', mouths: 3 },
            { text: 'And the winner is…', mouths: 5 },
            { text: 'Allez, allez!', mouths: 3 },
            { text: 'Glückwunsch Europa!', mouths: 5 },
            { text: 'Was für eine Show!', mouths: 4 },
          ]
        : [
            { text: 'Douze points!', mouths: 3 },
            { text: 'And the winner is…', mouths: 5 },
            { text: 'Allez, allez!', mouths: 3 },
            { text: 'Congratulations Europe!', mouths: 5 },
            { text: 'What a show!', mouths: 3 },
          ])
    : (lang === 'de'
        ? [
            { text: 'Glückwunsch!', mouths: 3 },
            { text: 'Was für ein Quiz!', mouths: 4 },
            { text: 'Ihr seid wild!', mouths: 3 },
            { text: 'Sauber!', mouths: 2 },
            { text: 'Geile Runde!', mouths: 3 },
          ]
        : [
            { text: 'Congrats!', mouths: 2 },
            { text: 'What a quiz!', mouths: 3 },
            { text: 'You\'re wild!', mouths: 2 },
            { text: 'Nice one!', mouths: 2 },
            { text: 'Great round!', mouths: 2 },
          ]);
  const [idx, setIdx] = useState(0);
  // 2026-05-07 v14 (Bug-Fix): safe index — siehe WolfLobbyGreeter.
  const slogan = slogans[idx % Math.max(1, slogans.length)] ?? slogans[0] ?? { text: '', mouths: 2 };
  const speakMs = Math.min(4500, Math.max(1300, slogan.mouths * 440));
  const enterMs = 250;
  const exitMs = 450;
  const gapMs = 600;
  const totalMs = enterMs + speakMs + exitMs + gapMs;
  useEffect(() => {
    const id = window.setTimeout(() => {
      setIdx(p => (p + 1) % slogans.length);
    }, totalMs);
    return () => window.clearTimeout(id);
  }, [idx, totalMs, slogans.length]);
  const [speakingNow, setSpeakingNow] = useState(false);
  useEffect(() => {
    setSpeakingNow(false);
    const t1 = window.setTimeout(() => setSpeakingNow(true), enterMs);
    const t2 = window.setTimeout(() => setSpeakingNow(false), enterMs + speakMs);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [idx, enterMs, speakMs]);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      gap: 14, pointerEvents: 'none',
    }}>
      <SpeechBubble
        text={slogan.text}
        bubbleKey={idx}
        enterMs={enterMs}
        speakMs={speakMs}
        exitMs={exitMs}
        tailSide="right"
        eurovisionMode={troeteBoost}
      />
      {/* 2026-05-07 (Wolf): mirror=true → Wolf schaut nach links zur Buehnen-
          Mitte statt aus dem Bild raus. Groesse ~30% reduziert (90-140 → 60-100)
          damit er kleiner ist als der Sieger-Hero und nicht mit ihm konkurriert. */}
      <AnimatedCozyWolf
        widthCss="clamp(60px, 6.5cqw, 100px)"
        mode="jubel"
        speaking={speakingNow}
        mirror={true}
        troeteBoost={troeteBoost}
      />
    </div>
  );
}
