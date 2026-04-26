// QQ Beamer Gouache — parallele Aquarell-Variante des Hauptbeamers.
//
// Eigener Socket auf demselben Room ('default') wie /beamer. Wer diese
// Page auf einen Beamer/Fernseher legt, sieht denselben Spielzustand
// gespiegelt im Bilderbuch-Look. Der produktive `/beamer` bleibt
// unangetastet — alle Spielzüge gehen weiter durch ihn durch (selber
// Backend-State).
//
// Foundation-Item: Page-Shell + Phase-Router + simple Phasen
// (LOBBY, RULES, PHASE_INTRO, PAUSED, THANKS, GAME_OVER). Komplexe
// Phasen (QUESTION_ACTIVE/REVEAL, PLACEMENT, TEAMS_REVEAL, COMEBACK)
// haben Fallback-Cards mit Phasen-Label und werden in Folge-Items
// eigens migriert.

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQStateUpdate, QQTeam, QQQuestion, qqGetAvatar,
  QQ_CATEGORY_LABELS, QQ_BUNTE_TUETE_LABELS,
} from '../../../shared/quarterQuizTypes';
import {
  PALETTE, F_HAND, F_HAND_CAPS, F_BODY, softTeamColor,
  GouacheFilters, PaintedKeyframes, usePaintFonts,
  PaperCard, BlockCapsHeading,
  PaintedAvatar,
  GouachePageShell, GouacheNightSky, GouacheDaySky, useViewportSize,
  PhaseBackdrop, CategoryBackdrop,
  CAT_ACCENT, CAT_BADGE_BG, CAT_PASTEL, CAT_DEEP,
} from '../gouache';
import {
  ConnectingPanel, PreGamePanel, RunningPanel,
  FloatingTeamBalloons, LobbyMainGrid,
} from './QQLobbyGouachePage';

const QQ_ROOM = 'default';

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function QQBeamerGouachePage() {
  usePaintFonts();
  const roomCode = QQ_ROOM;
  const { state, connected, emit } = useQQSocket(roomCode);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!connected) { setJoined(false); return; }
    if (joined) return;
    emit('qq:joinBeamer', { roomCode }).then(ack => { if (ack.ok) setJoined(true); });
  }, [connected, joined, emit, roomCode]);

  // Bilingual-Flip wie im Original
  const [de, setDe] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setDe(p => !p), 8000);
    return () => clearInterval(id);
  }, []);

  // GAME_OVER bekommt eine wärmere Day-Sky-Atmo (Sieger-Moment), sonst Night-Sky
  const useDaySky = state?.phase === 'GAME_OVER' || state?.phase === 'THANKS';

  return (
    <GouachePageShell
      backdrop={useDaySky ? <GouacheDaySky /> : <GouacheNightSky />}
      style={{ fontFamily: F_BODY, color: PALETTE.cream }}
    >
      <GouacheFilters />
      <PaintedKeyframes />

      {/* In Lobby-Phase: Heißluftballons in Team-Farben oben drüber */}
      {state?.phase === 'LOBBY' && state.setupDone && (
        <FloatingTeamBalloons teams={state.teams} />
      )}

      {/* CozyQuiz-Wortmarke — bleibt sichtbar während Lobby/Rules/Intro;
          in laufenden Phasen rückt der Inhalt selbst in den Fokus. */}
      {showsTitle(state) && <BeamerTitle />}

      <PhaseRouter state={state} connected={connected} de={de} roomCode={roomCode} />
    </GouachePageShell>
  );
}

function showsTitle(state: QQStateUpdate | null): boolean {
  if (!state) return true;
  return state.phase === 'LOBBY';
}

function BeamerTitle() {
  return (
    <div style={{
      textAlign: 'center', position: 'relative', zIndex: 5, flexShrink: 0,
    }}>
      <div style={{
        fontFamily: F_HAND,
        fontSize: 'min(11vh, 14vw)', fontWeight: 700, lineHeight: 0.92,
        color: PALETTE.cream,
        letterSpacing: '-0.015em',
        textShadow: '0 8px 28px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)',
      }}>
        CozyQuiz
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Phase-Router
// ─────────────────────────────────────────────────────────────────────────

function PhaseRouter({
  state, connected, de, roomCode,
}: {
  state: QQStateUpdate | null;
  connected: boolean;
  de: boolean;
  roomCode: string;
}) {
  if (!state) return <ConnectingPanel connected={connected} />;
  const { phase, setupDone } = state;

  if (phase === 'LOBBY' && !setupDone) return <PreGamePanel de={de} />;
  if (phase === 'LOBBY')               return <LobbyMainGrid state={state} de={de} roomCode={roomCode} />;
  if (phase === 'RULES')               return <RulesView state={state} de={de} />;
  if (phase === 'PHASE_INTRO')         return <PhaseIntroView state={state} de={de} />;
  if (phase === 'PAUSED')              return <PausedView state={state} de={de} />;
  if (phase === 'THANKS')              return <ThanksView de={de} />;
  if (phase === 'GAME_OVER')           return <GameOverView state={state} de={de} />;

  // QUESTION_ACTIVE / QUESTION_REVEAL → routen pro Kategorie
  if (phase === 'QUESTION_ACTIVE' || phase === 'QUESTION_REVEAL') {
    const q = state.currentQuestion;
    if (!q) return <PhasePlaceholderCard state={state} de={de} />;
    const revealed = phase === 'QUESTION_REVEAL';
    if (q.category === 'SCHAETZCHEN') return <SchaetzchenView state={state} q={q} de={de} revealed={revealed} />;
    if (q.category === 'MUCHO')       return <MuchoView state={state} q={q} de={de} revealed={revealed} />;
    if (q.category === 'CHEESE')      return <CheeseView state={state} q={q} de={de} revealed={revealed} />;
    if (q.category === 'BUNTE_TUETE')   return <BunteTueteView state={state} q={q} de={de} revealed={revealed} />;
    if (q.category === 'ZEHN_VON_ZEHN') return <AllInView state={state} q={q} de={de} revealed={revealed} />;
    return <PhasePlaceholderCard state={state} de={de} />;
  }

  if (phase === 'PLACEMENT')       return <PlacementView state={state} de={de} />;
  if (phase === 'TEAMS_REVEAL')    return <TeamsRevealView state={state} de={de} />;
  if (phase === 'COMEBACK_CHOICE') return <ComebackView state={state} de={de} />;

  return <PhasePlaceholderCard state={state} de={de} />;
}

// ─────────────────────────────────────────────────────────────────────────
// COMEBACK_CHOICE — letztes Team bekommt eine zweite Chance.
// Modi:
//  - comebackHL gesetzt → Higher/Lower Mini-Game (intro/question/reveal/done/steal)
//  - sonst Intro-Slides (comebackIntroStep 0/1/2 mit Aktions-Auswahl)
// ─────────────────────────────────────────────────────────────────────────

function ComebackView({ state, de }: { state: QQStateUpdate; de: boolean }) {
  if (state.comebackHL) {
    return <HigherLowerView state={state} de={de} hl={state.comebackHL} />;
  }
  return <ComebackIntroView state={state} de={de} />;
}

function ComebackIntroView({ state, de }: { state: QQStateUpdate; de: boolean }) {
  const step = state.comebackIntroStep ?? 0;
  const cbTeam = state.comebackTeamId ? state.teams.find(t => t.id === state.comebackTeamId) : null;
  const color = cbTeam ? softTeamColor(cbTeam.avatarId) : PALETTE.terracotta;
  const titles: Array<{ de: string; en: string; sub?: { de: string; en: string } }> = [
    { de: 'Comeback-Chance', en: 'Comeback chance', sub: { de: 'Auch von hinten kann man gewinnen.', en: 'You can come back from behind.' } },
    { de: 'Diese Runde geht an euch', en: 'This round is yours' },
    { de: 'Wählt eure Aktion', en: 'Choose your action' },
  ];
  const t = titles[Math.min(step, titles.length - 1)];
  return (
    <CenterArea>
      <div style={{ textAlign: 'center', animation: 'gFadeIn 0.5s ease-out both' }}>
        <BlockCapsHeading size="lg" color={color} glow>
          {de ? t.de : t.en}
        </BlockCapsHeading>
        {cbTeam && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 18, marginTop: 28,
            padding: '20px 32px', borderRadius: 28,
            background: `${PALETTE.cream}f0`,
            border: `4px solid ${color}`,
            boxShadow: `0 18px 44px ${color}55`,
          }}>
            <div style={{ filter: 'url(#warmGlow)' }}>
              <PaintedAvatar slug={qqGetAvatar(cbTeam.avatarId).slug} size={120}
                color={color} withGrain={false} />
            </div>
            <div style={{
              fontFamily: F_HAND, fontSize: 'min(7vh, 5vw)',
              color, fontWeight: 700, lineHeight: 1,
              textShadow: `0 4px 14px ${color}44`,
            }}>
              {cbTeam.name}
            </div>
          </div>
        )}
        {t.sub && (
          <div style={{
            fontFamily: F_BODY, fontSize: 'min(2.4vh, 1.8vw)',
            color: `${PALETTE.cream}cc`, fontStyle: 'italic',
            marginTop: 26, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6,
          }}>
            {de ? t.sub.de : t.sub.en}
          </div>
        )}
      </div>
    </CenterArea>
  );
}

function HigherLowerView({ state, de, hl }: {
  state: QQStateUpdate; de: boolean;
  hl: NonNullable<QQStateUpdate['comebackHL']>;
}) {
  const players = hl.teamIds.map(id => state.teams.find(t => t.id === id)).filter((t): t is QQTeam => !!t);
  const phase = hl.phase;
  const pair = hl.currentPair;
  return (
    <>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
        flexShrink: 0, position: 'relative', zIndex: 5, padding: '0 12px',
      }}>
        <BlockCapsHeading size="md" color={PALETTE.amberGlow} glow>
          {de ? 'Höher oder Tiefer' : 'Higher or Lower'}
        </BlockCapsHeading>
        <span style={{
          padding: '4px 12px', borderRadius: 999,
          background: `${PALETTE.cream}1f`,
          border: `1.5px solid ${PALETTE.cream}55`,
          fontFamily: F_HAND_CAPS, fontSize: 'min(2.2vh, 1.6vw)',
          color: PALETTE.cream, letterSpacing: '0.08em',
        }}>
          {de ? `Runde ${hl.round + 1} von ${hl.rounds}` : `Round ${hl.round + 1} of ${hl.rounds}`}
        </span>
        <HLTimerPill timerEndsAt={hl.timerEndsAt} />
      </header>

      <CenterArea>
        <div style={{ width: '100%', maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 2vh, 26px)' }}>
          {/* Player Pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            {players.map(p => {
              const ans = hl.answers[p.id];
              const correct = hl.correctThisRound.includes(p.id);
              const wins = hl.winnings[p.id] ?? 0;
              const color = softTeamColor(p.avatarId);
              return (
                <div key={p.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '8px 16px', borderRadius: 999,
                  background: `${color}26`, border: `2px solid ${color}`,
                  boxShadow: phase === 'reveal' && correct ? `0 0 24px ${PALETTE.sage}aa` : undefined,
                }}>
                  <PaintedAvatar slug={qqGetAvatar(p.avatarId).slug} size={44} color={color} withGrain={false} />
                  <div>
                    <div style={{
                      fontFamily: F_HAND, fontSize: 'min(2.6vh, 2vw)',
                      color: PALETTE.cream, fontWeight: 700, lineHeight: 1,
                    }}>
                      {p.name}
                    </div>
                    <div style={{
                      fontFamily: F_BODY, fontSize: 11, color,
                      letterSpacing: '0.06em', marginTop: 2,
                    }}>
                      {ans
                        ? (phase === 'reveal'
                            ? (correct ? (de ? '✓ richtig' : '✓ correct') : (de ? '✗ daneben' : '✗ wrong'))
                            : (de ? 'getippt' : 'tipped'))
                        : (de ? 'wartet …' : 'waiting …')}
                      {wins > 0 && ` · ${wins} ⭐`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pair */}
          {pair && (
            <PaperCard washColor={PALETTE.cream} padding="clamp(20px, 3vh, 36px)" style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: F_BODY, fontSize: 12, letterSpacing: '0.22em',
                color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
              }}>
                {pair.category} · {pair.unit}
              </div>
              {pair.customQuestion ? (
                <div style={{
                  fontFamily: F_HAND, fontSize: 'min(5vh, 4vw)',
                  color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.05, marginTop: 12,
                }}>
                  {pair.customQuestion}
                </div>
              ) : (
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center', gap: 18, marginTop: 18,
                }}>
                  <HLAnchor label={pair.anchorLabel} value={pair.anchorValue} unit={pair.unit} revealed />
                  <BlockCapsHeading size="md" color={PALETTE.terracotta}>
                    vs.
                  </BlockCapsHeading>
                  <HLAnchor label={pair.subjectLabel} value={pair.subjectValue}
                    unit={pair.unit} revealed={phase === 'reveal'} />
                </div>
              )}
              {phase === 'question' && (
                <div style={{
                  marginTop: 22, display: 'flex', justifyContent: 'center', gap: 18,
                }}>
                  <BlockCapsHeading size="md" color={PALETTE.sage}>
                    {de ? 'Höher?' : 'Higher?'}
                  </BlockCapsHeading>
                  <BlockCapsHeading size="md" color={PALETTE.lavenderDusk}>
                    {de ? 'Tiefer?' : 'Lower?'}
                  </BlockCapsHeading>
                </div>
              )}
            </PaperCard>
          )}

          {/* Done / Steal phase hint */}
          {(phase === 'done' || phase === 'steal') && (
            <div style={{ textAlign: 'center' }}>
              <BlockCapsHeading size="md" color={PALETTE.amberGlow} glow>
                {phase === 'steal'
                  ? (de ? 'Felder klauen' : 'Steal fields')
                  : (de ? 'Mini-Game vorbei' : 'Mini-game done')}
              </BlockCapsHeading>
            </div>
          )}
        </div>
      </CenterArea>
    </>
  );
}

function HLAnchor({ label, value, unit, revealed }: {
  label: string; value: number; unit: string; revealed: boolean;
}) {
  return (
    <div style={{
      padding: '14px 20px', borderRadius: 16,
      background: `${PALETTE.cream}d0`,
      border: `2.5px solid ${PALETTE.inkSoft}33`,
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: F_HAND, fontSize: 'min(3.6vh, 2.8vw)',
        color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: F_HAND, fontSize: 'min(6vh, 4.4vw)',
        color: revealed ? PALETTE.terracotta : PALETTE.inkSoft,
        fontWeight: 700, lineHeight: 1, marginTop: 6,
      }}>
        {revealed ? value.toLocaleString('de-DE') : '???'}
      </div>
      <div style={{
        fontFamily: F_BODY, fontSize: 11, color: PALETTE.inkSoft,
        letterSpacing: '0.08em', marginTop: 4,
      }}>
        {unit}
      </div>
    </div>
  );
}

function HLTimerPill({ timerEndsAt }: { timerEndsAt: number | null }) {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!timerEndsAt) { setSecs(null); return; }
    const tick = () => setSecs(Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timerEndsAt]);
  if (secs == null) return null;
  const urgent = secs <= 3;
  const color = urgent ? PALETTE.terracotta : PALETTE.cream;
  return (
    <div style={{
      padding: '4px 14px', borderRadius: 999,
      background: urgent ? `${PALETTE.terracotta}33` : `${PALETTE.cream}1f`,
      border: `1.5px solid ${color}88`,
      animation: urgent ? 'gTwinkle 0.6s ease-in-out infinite' : undefined,
      fontFamily: F_HAND, fontSize: 'min(2.6vh, 2vw)',
      fontWeight: 700, color,
      fontVariantNumeric: 'tabular-nums', minWidth: 48, textAlign: 'center',
    }}>
      {secs}s
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// TEAMS_REVEAL — 1:1 vom Original. Title ruft "Heute spielen…", dann
// staggern Teams einzeln rein mit Slam-Animation (translateY+scale+rotate
// mit blur), Flash-Overlay beim Auftauchen, Pulse-Idle-Animation. Outro
// "Viel Glück!" nach allen Teams. Layout dynamisch: 6→1 Reihe, 7→4+3,
// 8→4+4, 9→5+4, 10→5+5, ≥11 dynamisch.
// ─────────────────────────────────────────────────────────────────────────

function TeamsRevealView({ state, de }: { state: QQStateUpdate; de: boolean }) {
  const teams = state.teams.filter(t => t.connected).length > 0
    ? state.teams.filter(t => t.connected)
    : state.teams;
  const anchor = state.teamsRevealStartedAt ?? Date.now();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, []);
  void tick;
  const elapsed = Date.now() - anchor;

  const titleDur = 800;
  const perTeamDelay = 900;
  const revealedCount = Math.max(0, Math.min(teams.length, Math.floor((elapsed - titleDur) / perTeamDelay) + 1));
  const goodLuckDelay = titleDur + teams.length * perTeamDelay + 400;
  const showGoodLuck = elapsed >= goodLuckDelay;

  // Layout — exakt wie Original
  const n = teams.length;
  const rowSizes: number[] =
    n <= 6 ? [n]
    : n === 7 ? [4, 3]
    : n === 8 ? [4, 4]
    : n === 9 ? [5, 4]
    : n === 10 ? [5, 5]
    : (() => {
        const rows = Math.ceil(n / 4);
        const base = Math.floor(n / rows);
        const extra = n - base * rows;
        return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0));
      })();
  const many = n > 5;
  const multiRow = rowSizes.length > 1;
  const discSizeStr = multiRow
    ? 'clamp(110px, 11vw, 180px)'
    : many ? 'clamp(130px, 13vw, 210px)' : 'clamp(160px, 17vw, 260px)';
  const nameFontStr = multiRow ? 'clamp(20px, 2.4vw, 32px)' : 'clamp(22px, 2.6vw, 36px)';

  // Number-Größe für PaintedAvatar (braucht number)
  const { w: vw, h: vh } = useViewportSize();
  const discSizePx = multiRow
    ? Math.round(Math.max(110, Math.min(vw * 0.11, 180)))
    : many
      ? Math.round(Math.max(130, Math.min(vw * 0.13, 210)))
      : Math.round(Math.max(160, Math.min(vw * 0.17, 260)));
  void vh;

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <PhaseBackdrop phase="teamsReveal" />
      </div>

      <div style={{
        flex: 1, position: 'relative', zIndex: 5,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <style>{`
          @keyframes qqTrTitle {
            0%   { opacity: 0; transform: translateY(-30px) scale(0.8); letter-spacing: 0.5em; }
            100% { opacity: 1; transform: translateY(0)     scale(1);   letter-spacing: 0.12em; }
          }
          @keyframes qqTrSlam {
            0%   { opacity: 0; transform: translateY(-80vh) scale(2) rotate(-18deg); filter: blur(6px); }
            55%  { opacity: 1; transform: translateY(8%)    scale(1.15) rotate(3deg); filter: blur(0); }
            75%  { transform: translateY(-2%) scale(0.96) rotate(-1deg); }
            100% { transform: translateY(0)    scale(1) rotate(0deg); }
          }
          @keyframes qqTrFlash {
            0%   { opacity: 0; }
            10%  { opacity: 0.9; }
            100% { opacity: 0; }
          }
          @keyframes qqTrGood {
            0%   { opacity: 0; transform: scale(0.7); }
            60%  { opacity: 1; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes qqTrPulse {
            0%,100% { transform: scale(1); }
            50%     { transform: scale(1.04); }
          }
        `}</style>

        {/* Backdrop spotlight (warmer Glow im Zentrum) */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 50% 40%, ${PALETTE.amberGlow}26 0%, transparent 55%)`,
          pointerEvents: 'none',
        }} />

        {/* Title */}
        <div style={{
          fontFamily: F_HAND_CAPS,
          fontSize: 'clamp(36px, 5.2vw, 82px)', fontWeight: 700, color: PALETTE.cream,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          animation: `qqTrTitle ${titleDur}ms cubic-bezier(.2,.8,.2,1) 0ms both`,
          textShadow: `0 4px 20px ${PALETTE.amberGlow}55`,
          marginBottom: 'clamp(24px, 3vw, 48px)',
        }}>
          🎬 {de ? 'Heute spielen…' : 'Tonight’s teams…'}
        </div>

        {/* Teams Grid */}
        {(() => {
          let cursor = 0;
          return (
            <div style={{
              display: 'flex', flexDirection: 'column',
              gap: 'clamp(18px, 2.4vw, 36px)',
              alignItems: 'center', maxWidth: '92vw',
            }}>
              {rowSizes.map((size, rIdx) => {
                const slice = teams.slice(cursor, cursor + size);
                const startI = cursor;
                cursor += size;
                return (
                  <div key={rIdx} style={{
                    display: 'flex', gap: 'clamp(12px, 2vw, 28px)',
                    justifyContent: 'center', flexWrap: 'nowrap',
                  }}>
                    {slice.map((t, j) => {
                      const i = startI + j;
                      const shown = i < revealedCount;
                      const slamDelay = titleDur + i * perTeamDelay;
                      const teamColor = softTeamColor(t.avatarId);
                      const slug = qqGetAvatar(t.avatarId).slug;
                      return (
                        <div key={t.id} style={{
                          position: 'relative',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                          opacity: shown ? 1 : 0,
                          animation: shown ? `qqTrSlam 900ms cubic-bezier(.2,.9,.2,1) 0ms both` : 'none',
                          animationDelay: shown ? '0ms' : `${slamDelay}ms`,
                        }}>
                          {/* Avatar-Disc mit Glow */}
                          <div style={{
                            position: 'relative',
                            width: discSizeStr, height: discSizeStr,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            animation: shown ? 'qqTrPulse 2.2s ease-in-out infinite' : 'none',
                            filter: shown ? `drop-shadow(0 12px 40px ${teamColor}aa) drop-shadow(0 0 60px ${teamColor}88)` : 'none',
                          }}>
                            <PaintedAvatar slug={slug} size={discSizePx}
                              color={teamColor} withGrain={false} />
                            {/* Flash overlay on slam */}
                            {shown && (
                              <div style={{
                                position: 'absolute', inset: 0,
                                borderRadius: '50%',
                                background: PALETTE.cream,
                                pointerEvents: 'none',
                                animation: 'qqTrFlash 600ms ease-out both',
                              }} />
                            )}
                          </div>
                          {/* Team name pill */}
                          <div title={t.name} style={{
                            padding: '6px 16px', borderRadius: 14,
                            background: teamColor,
                            color: PALETTE.cream,
                            fontFamily: F_HAND_CAPS, fontWeight: 700,
                            fontSize: nameFontStr,
                            letterSpacing: '0.04em',
                            boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
                            whiteSpace: 'nowrap',
                            maxWidth: multiRow ? '22vw' : '18vw',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {t.name.length > (multiRow ? 14 : 16)
                              ? t.name.slice(0, (multiRow ? 13 : 15)) + '…'
                              : t.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* "Viel Glück!" — Outro mit reservierter Höhe */}
        <div style={{
          marginTop: 'clamp(32px, 4vw, 64px)',
          height: 'clamp(38px, 5.2vw, 80px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            fontFamily: F_HAND_CAPS,
            fontSize: 'clamp(28px, 4vw, 64px)', fontWeight: 700,
            color: PALETTE.amberGlow,
            textTransform: 'uppercase', letterSpacing: '0.15em',
            textShadow: `0 4px 24px ${PALETTE.amberGlow}88`,
            opacity: showGoodLuck ? 1 : 0,
            transform: showGoodLuck ? 'scale(1)' : 'scale(0.7)',
            animation: showGoodLuck ? 'qqTrGood 900ms cubic-bezier(.2,.8,.2,1) both' : 'none',
          }}>
            ✨ {de ? 'Viel Glück!' : 'Good luck!'} ✨
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// BUNTE_TUETE — Router auf Sub-Spiel (Top5, FixIt/Order, PinIt/Map,
// HotPotato, Imposter/oneOfEight)
// ─────────────────────────────────────────────────────────────────────────

function BunteTueteView({ state, q, de, revealed }: {
  state: QQStateUpdate; q: QQQuestion; de: boolean; revealed: boolean;
}) {
  const kind = q.bunteTuete?.kind;
  if (kind === 'top5')       return <Top5View state={state} q={q} de={de} revealed={revealed} />;
  if (kind === 'order')      return <FixItView state={state} q={q} de={de} revealed={revealed} />;
  if (kind === 'map')        return <PinItView state={state} q={q} de={de} revealed={revealed} />;
  if (kind === 'hotPotato')  return <HotPotatoView state={state} q={q} de={de} revealed={revealed} />;
  if (kind === 'oneOfEight') return <ImposterView state={state} q={q} de={de} revealed={revealed} />;
  return <PhasePlaceholderCard state={state} de={de} />;
}

// Top 5 — bis 5 korrekte Antworten, Teams müssen welche treffen
function Top5View({ state, q, de, revealed }: {
  state: QQStateUpdate; q: QQQuestion; de: boolean; revealed: boolean;
}) {
  const text = (de ? q.text : q.textEn) ?? q.text;
  const bt = q.bunteTuete as any;
  const answers: string[] = (de ? bt?.answers : bt?.answersEn) ?? bt?.answers ?? [];
  return (
    <>
      <QuestionHeader state={state} q={q} de={de} />
      <CenterArea>
        <PaperCard washColor={PALETTE.cream} padding="clamp(24px, 3.5vh, 48px)" style={{ maxWidth: 1200, width: '92%' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <BlockCapsHeading size="md" color={PALETTE.terracotta}>
              {de ? 'Top 5' : 'Top 5'}
            </BlockCapsHeading>
            <div style={{
              fontFamily: F_HAND, fontSize: 'min(6vh, 4.4vw)',
              color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.05, marginTop: 12,
            }}>
              {text}
            </div>
          </div>
          {revealed ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {answers.slice(0, 5).map((ans, i) => (
                <div key={i} style={{
                  padding: '14px 18px', borderRadius: 14,
                  background: `${PALETTE.sage}26`,
                  border: `2.5px solid ${PALETTE.sage}88`,
                  display: 'flex', alignItems: 'center', gap: 12,
                  animation: `gFadeIn 0.5s ease-out ${0.1 + i * 0.1}s both`,
                }}>
                  <span style={{
                    fontFamily: F_HAND, fontSize: 'min(4vh, 2.8vw)',
                    color: PALETTE.sage, fontWeight: 700, minWidth: 36,
                  }}>#{i + 1}</span>
                  <span style={{
                    fontFamily: F_HAND, fontSize: 'min(3.4vh, 2.4vw)',
                    color: PALETTE.inkDeep, fontWeight: 700,
                  }}>{ans}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <AnswerTracker state={state} de={de} />
            </div>
          )}
        </PaperCard>
      </CenterArea>
    </>
  );
}

// FixIt — Items in korrekte Reihenfolge bringen
function FixItView({ state, q, de, revealed }: {
  state: QQStateUpdate; q: QQQuestion; de: boolean; revealed: boolean;
}) {
  const text = (de ? q.text : q.textEn) ?? q.text;
  const bt = q.bunteTuete as any;
  const items: string[] = (de ? bt?.items : bt?.itemsEn) ?? bt?.items ?? [];
  const order: number[] = bt?.correctOrder ?? items.map((_: string, i: number) => i);
  const itemValues: string[] = bt?.itemValues ?? [];
  const criteria: string = (de ? bt?.criteria : bt?.criteriaEn) ?? bt?.criteria ?? '';
  return (
    <>
      <QuestionHeader state={state} q={q} de={de} />
      <CenterArea>
        <PaperCard washColor={PALETTE.cream} padding="clamp(24px, 3.5vh, 48px)" style={{ maxWidth: 1100, width: '92%' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <BlockCapsHeading size="md" color={PALETTE.terracotta}>
              {de ? 'Sortieren' : 'Fix It'}
            </BlockCapsHeading>
            <div style={{
              fontFamily: F_HAND, fontSize: 'min(5vh, 4vw)',
              color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.05, marginTop: 10,
            }}>
              {text}
            </div>
            {criteria && (
              <div style={{
                fontFamily: F_BODY, fontSize: 'min(2vh, 1.5vw)', color: PALETTE.inkSoft,
                marginTop: 6, fontStyle: 'italic',
              }}>
                {criteria}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(revealed ? order : items.map((_, i) => i)).map((origIdx, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                alignItems: 'center', gap: 16,
                padding: '12px 18px', borderRadius: 14,
                background: revealed ? `${PALETTE.sage}1f` : `${PALETTE.cream}d0`,
                border: `2.5px solid ${revealed ? PALETTE.sage + '99' : PALETTE.inkSoft + '33'}`,
                animation: revealed ? `gFadeIn 0.5s ease-out ${0.1 + i * 0.1}s both` : undefined,
              }}>
                <span style={{
                  fontFamily: F_HAND, fontSize: 'min(3.4vh, 2.4vw)',
                  color: revealed ? PALETTE.sage : PALETTE.inkDeep, fontWeight: 700,
                  minWidth: 44, textAlign: 'center',
                }}>#{i + 1}</span>
                <span style={{
                  fontFamily: F_HAND, fontSize: 'min(3vh, 2.2vw)',
                  color: PALETTE.inkDeep, fontWeight: 700,
                }}>
                  {items[origIdx] ?? items[i]}
                </span>
                {revealed && itemValues[origIdx] && (
                  <span style={{
                    fontFamily: F_BODY, fontSize: 'min(2vh, 1.5vw)',
                    color: PALETTE.terracotta, fontWeight: 700,
                    padding: '4px 12px', borderRadius: 999,
                    background: `${PALETTE.terracotta}22`,
                  }}>
                    {itemValues[origIdx]}
                  </span>
                )}
              </div>
            ))}
          </div>
          {!revealed && (
            <div style={{ marginTop: 22, textAlign: 'center' }}>
              <AnswerTracker state={state} de={de} />
            </div>
          )}
        </PaperCard>
      </CenterArea>
    </>
  );
}

// PinIt — Geo-Map (Aquarell: Lösungs-Label statt Map, Team-Pins als Liste)
function PinItView({ state, q, de, revealed }: {
  state: QQStateUpdate; q: QQQuestion; de: boolean; revealed: boolean;
}) {
  const text = (de ? q.text : q.textEn) ?? q.text;
  const bt = q.bunteTuete as any;
  const target = bt?.targetLabel as string | undefined;
  return (
    <>
      <QuestionHeader state={state} q={q} de={de} />
      <CenterArea>
        <PaperCard washColor={PALETTE.cream} padding="clamp(28px, 4vh, 56px)" style={{ maxWidth: 1000, width: '92%', textAlign: 'center' }}>
          <BlockCapsHeading size="md" color={PALETTE.terracotta}>
            {de ? 'Pin auf der Karte' : 'Pin on the map'}
          </BlockCapsHeading>
          <div style={{
            fontFamily: F_HAND, fontSize: 'min(6vh, 4.4vw)',
            color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.05, marginTop: 14,
          }}>
            {text}
          </div>
          {revealed && target && (
            <div style={{
              marginTop: 28, padding: '20px 28px', borderRadius: 18,
              background: `${PALETTE.sage}26`, border: `2.5px solid ${PALETTE.sage}`,
              display: 'inline-block',
              animation: 'gFadeIn 0.6s ease-out both',
            }}>
              <BlockCapsHeading size="sm" color={PALETTE.sage}>
                {de ? 'Lösung' : 'Solution'}
              </BlockCapsHeading>
              <div style={{
                fontFamily: F_HAND, fontSize: 'min(7vh, 5vw)',
                color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.05, marginTop: 8,
              }}>
                📍 {target}
              </div>
            </div>
          )}
          {!revealed && (
            <div style={{ marginTop: 24 }}>
              <AnswerTracker state={state} de={de} />
            </div>
          )}
          {revealed && state.answers.length > 0 && (
            <div style={{
              marginTop: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10,
            }}>
              {state.answers.slice(0, 8).map(a => {
                const team = state.teams.find(t => t.id === a.teamId);
                if (!team) return null;
                const color = softTeamColor(team.avatarId);
                return (
                  <div key={a.teamId} style={{
                    padding: '6px 12px', borderRadius: 999,
                    background: `${color}22`, border: `1.5px solid ${color}`,
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    fontFamily: F_HAND, fontSize: 'min(2.4vh, 1.8vw)',
                    color: PALETTE.inkDeep, fontWeight: 700,
                  }}>
                    <PaintedAvatar slug={qqGetAvatar(team.avatarId).slug} size={28} color={color} withGrain={false} />
                    {team.name}
                  </div>
                );
              })}
            </div>
          )}
        </PaperCard>
      </CenterArea>
    </>
  );
}

// HotPotato — Round-Robin Live-Spiel
function HotPotatoView({ state, q, de }: {
  state: QQStateUpdate; q: QQQuestion; de: boolean; revealed: boolean;
}) {
  const text = (de ? q.text : q.textEn) ?? q.text;
  const activeId = state.hotPotatoActiveTeamId;
  const active = activeId ? state.teams.find(t => t.id === activeId) : null;
  const eliminated = new Set(state.hotPotatoEliminated);
  const used = state.hotPotatoUsedAnswers ?? [];
  const authors = state.hotPotatoAnswerAuthors ?? [];
  return (
    <>
      <QuestionHeader state={state} q={q} de={de} />
      <CenterArea>
        <div style={{ width: '100%', maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 2vh, 24px)' }}>
          <PaperCard washColor={PALETTE.cream} padding="clamp(20px, 3vh, 40px)" style={{ textAlign: 'center' }}>
            <BlockCapsHeading size="md" color={PALETTE.terracotta}>
              {de ? '🥔 Heiße Kartoffel' : '🥔 Hot Potato'}
            </BlockCapsHeading>
            <div style={{
              fontFamily: F_HAND, fontSize: 'min(5vh, 4vw)',
              color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.05, marginTop: 10,
            }}>
              {text}
            </div>
          </PaperCard>
          {/* Active Team */}
          {active && (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18,
              animation: 'gFadeIn 0.5s ease-out both',
            }}>
              <div style={{ filter: 'url(#warmGlow)' }}>
                <PaintedAvatar slug={qqGetAvatar(active.avatarId).slug} size={120}
                  color={softTeamColor(active.avatarId)} withGrain={false} />
              </div>
              <div>
                <BlockCapsHeading size="sm" color={PALETTE.cream}>
                  {de ? 'ist dran' : 'up next'}
                </BlockCapsHeading>
                <div style={{
                  fontFamily: F_HAND, fontSize: 'min(7vh, 5vw)',
                  color: softTeamColor(active.avatarId), fontWeight: 700,
                  textShadow: `0 4px 16px ${softTeamColor(active.avatarId)}66`,
                }}>
                  {active.name}
                </div>
              </div>
            </div>
          )}
          {/* Used answers */}
          {used.length > 0 && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8,
              padding: 16, borderRadius: 18,
              background: `${PALETTE.cream}1f`,
              border: `1.5px dashed ${PALETTE.cream}55`,
            }}>
              {used.map((ans, i) => {
                const authId = authors[i];
                const author = authId ? state.teams.find(t => t.id === authId) : null;
                const color = author ? softTeamColor(author.avatarId) : PALETTE.cream;
                return (
                  <div key={i} style={{
                    padding: '6px 14px', borderRadius: 999,
                    background: `${color}26`, border: `1.5px solid ${color}88`,
                    fontFamily: F_HAND, fontSize: 'min(2.4vh, 1.8vw)',
                    color: PALETTE.cream, fontWeight: 700,
                  }}>
                    {ans}
                  </div>
                );
              })}
            </div>
          )}
          {/* Eliminated indicator */}
          {eliminated.size > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8,
            }}>
              {Array.from(eliminated).map(eid => {
                const t = state.teams.find(x => x.id === eid);
                if (!t) return null;
                return (
                  <div key={eid} style={{
                    opacity: 0.4, filter: 'grayscale(0.7)',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 999,
                    background: `${PALETTE.cream}11`,
                  }}>
                    <PaintedAvatar slug={qqGetAvatar(t.avatarId).slug} size={28}
                      color={softTeamColor(t.avatarId)} withGrain={false} />
                    <span style={{
                      fontFamily: F_BODY, fontSize: 11, color: PALETTE.cream,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      {t.name} · {de ? 'raus' : 'out'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CenterArea>
    </>
  );
}

// Imposter (oneOfEight) — 8 Aussagen, eine ist falsch
function ImposterView({ state, q, de, revealed }: {
  state: QQStateUpdate; q: QQQuestion; de: boolean; revealed: boolean;
}) {
  const bt = q.bunteTuete as any;
  const statements: string[] = (de ? bt?.statements : bt?.statementsEn) ?? bt?.statements ?? [];
  const falseIdx = bt?.falseIndex ?? -1;
  const chosen = new Set(state.imposterChosenIndices ?? []);
  const eliminated = new Set(state.imposterEliminated ?? []);
  const activeId = state.imposterActiveTeamId;
  const active = activeId ? state.teams.find(t => t.id === activeId) : null;
  return (
    <>
      <QuestionHeader state={state} q={q} de={de} />
      <CenterArea>
        <div style={{ width: '100%', maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vh, 20px)' }}>
          <div style={{ textAlign: 'center' }}>
            <BlockCapsHeading size="md" color={PALETTE.terracotta}>
              {de ? '🕵️ Imposter' : '🕵️ Imposter'}
            </BlockCapsHeading>
            {active && !revealed && (
              <div style={{
                marginTop: 8, fontFamily: F_HAND, fontSize: 'min(4vh, 3vw)',
                color: softTeamColor(active.avatarId), fontWeight: 700,
              }}>
                {active.name} {de ? 'wählt' : 'chooses'} …
              </div>
            )}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
          }}>
            {statements.map((s, i) => {
              const isFalse = revealed && i === falseIdx;
              const wasChosen = chosen.has(i);
              const dimmed = wasChosen && !isFalse;
              return (
                <div key={i} style={{
                  padding: 'clamp(12px, 1.8vh, 18px) clamp(14px, 1.8vw, 22px)',
                  borderRadius: 14,
                  background: isFalse ? `${PALETTE.terracotta}33` : `${PALETTE.cream}f0`,
                  border: `2.5px solid ${isFalse ? PALETTE.terracotta : PALETTE.inkSoft + '33'}`,
                  filter: dimmed ? 'grayscale(0.6) opacity(0.5)' : undefined,
                  display: 'flex', alignItems: 'center', gap: 12,
                  boxShadow: isFalse ? `0 8px 28px ${PALETTE.terracotta}55` : 'none',
                  transition: 'all 0.5s',
                }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: isFalse ? PALETTE.terracotta : PALETTE.inkDeep,
                    color: PALETTE.cream,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: F_HAND, fontSize: 18, fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{
                    flex: 1, fontFamily: F_HAND, fontSize: 'min(2.6vh, 2vw)',
                    color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.2,
                  }}>
                    {s}
                  </span>
                </div>
              );
            })}
          </div>
          {revealed && falseIdx >= 0 && (
            <div style={{
              textAlign: 'center', padding: '14px 22px', borderRadius: 14,
              background: `${PALETTE.terracotta}26`,
              border: `2.5px solid ${PALETTE.terracotta}`,
              animation: 'gFadeIn 0.6s ease-out both',
            }}>
              <BlockCapsHeading size="md" color={PALETTE.terracotta} glow>
                {de ? `Aussage ${falseIdx + 1} war falsch` : `Statement ${falseIdx + 1} was the imposter`}
              </BlockCapsHeading>
            </div>
          )}
          {eliminated.size > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              {Array.from(eliminated).map(eid => {
                const t = state.teams.find(x => x.id === eid);
                if (!t) return null;
                return (
                  <div key={eid} style={{
                    opacity: 0.5, filter: 'grayscale(0.6)',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 999,
                    background: `${PALETTE.cream}11`,
                  }}>
                    <PaintedAvatar slug={qqGetAvatar(t.avatarId).slug} size={26}
                      color={softTeamColor(t.avatarId)} withGrain={false} />
                    <span style={{
                      fontFamily: F_BODY, fontSize: 11, color: PALETTE.cream,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>
                      {t.name} · {de ? 'raus' : 'out'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CenterArea>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ZEHN_VON_ZEHN — 3 Optionen, Teams verteilen 10 Punkte; höchste Bets
// werden im Reveal sichtbar, korrekte Option grün hervorgehoben.
// ─────────────────────────────────────────────────────────────────────────

function AllInView({ state, q, de, revealed }: {
  state: QQStateUpdate; q: QQQuestion; de: boolean; revealed: boolean;
}) {
  const text = (de ? q.text : q.textEn) ?? q.text;
  const opts = (de ? q.options : q.optionsEn) ?? q.options ?? [];
  const correctIdx = q.correctOptionIndex ?? -1;
  const step = state.zvzRevealStep ?? 0;

  // Top-Bets pro Option ableiten (Komma-separierte Punkte als String)
  const topBets = useMemo(() => {
    return opts.map((_, optIdx) => {
      const entries = state.answers
        .map(a => {
          const pts = a.text.split(',').map(x => parseInt(x.trim(), 10));
          return { teamId: a.teamId, pts: pts[optIdx] ?? 0 };
        })
        .filter(e => e.pts > 0);
      if (entries.length === 0) return { maxPts: 0, teamIds: [] as string[] };
      const maxPts = Math.max(...entries.map(e => e.pts));
      return {
        maxPts,
        teamIds: entries.filter(e => e.pts === maxPts).map(e => e.teamId),
      };
    });
  }, [opts, state.answers]);

  return (
    <>
      <QuestionHeader state={state} q={q} de={de} />
      <CenterArea>
        <div style={{ width: '100%', maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 2vh, 24px)' }}>
          <PaperCard washColor={PALETTE.cream} padding="clamp(20px, 3vh, 40px)" style={{ textAlign: 'center' }}>
            <BlockCapsHeading size="md" color={PALETTE.terracotta}>
              {de ? '10 von 10' : 'All In'}
            </BlockCapsHeading>
            <div style={{
              fontFamily: F_HAND, fontSize: 'min(6vh, 4.6vw)',
              color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.05, marginTop: 12,
            }}>
              {text}
            </div>
          </PaperCard>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 'clamp(10px, 1.5vw, 18px)',
          }}>
            {opts.map((opt, i) => {
              const top = topBets[i];
              const showBet = revealed && step >= 1 && top && top.maxPts > 0;
              const isCorrect = revealed && step >= 2 && correctIdx === i;
              const dimmed = revealed && step >= 2 && correctIdx !== i;
              return (
                <div key={i} style={{
                  padding: 'clamp(16px, 2.4vh, 28px) clamp(14px, 1.6vw, 24px)',
                  borderRadius: 20,
                  background: isCorrect ? `${PALETTE.sage}33` : `${PALETTE.cream}f0`,
                  border: `3px solid ${isCorrect ? PALETTE.sage : PALETTE.inkSoft + '55'}`,
                  boxShadow: isCorrect
                    ? `0 14px 40px ${PALETTE.sage}55, 0 0 70px ${PALETTE.sage}66`
                    : '0 8px 22px rgba(31,58,95,0.14)',
                  filter: dimmed ? 'grayscale(0.6) opacity(0.5)' : undefined,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  transition: 'all 0.5s ease',
                  textAlign: 'center',
                  minHeight: 'min(28vh, 24vw)',
                }}>
                  <span style={{
                    width: 'min(8vh, 6vw)', height: 'min(8vh, 6vw)',
                    minWidth: 56, minHeight: 56,
                    borderRadius: '50%',
                    background: isCorrect ? PALETTE.sage : PALETTE.inkDeep,
                    color: PALETTE.cream,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: F_HAND, fontSize: 'min(5vh, 3.6vw)', fontWeight: 700,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{
                    fontFamily: F_HAND, fontSize: 'min(3.6vh, 2.6vw)',
                    color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.15,
                  }}>
                    {opt}
                  </span>
                  {showBet && (
                    <div style={{
                      marginTop: 'auto',
                      animation: 'gFadeIn 0.5s ease-out both',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    }}>
                      <BlockCapsHeading size="sm" color={PALETTE.terracotta}>
                        {de ? 'Höchste Wette' : 'Top bet'}
                      </BlockCapsHeading>
                      <div style={{
                        fontFamily: F_HAND, fontSize: 'min(7vh, 5vw)',
                        color: isCorrect ? PALETTE.sage : PALETTE.terracotta, fontWeight: 700,
                        lineHeight: 1,
                      }}>
                        {top.maxPts}
                      </div>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {top.teamIds.slice(0, 4).map(tid => {
                          const t = state.teams.find(x => x.id === tid);
                          if (!t) return null;
                          return (
                            <PaintedAvatar key={tid} slug={qqGetAvatar(t.avatarId).slug}
                              size={32} color={softTeamColor(t.avatarId)} withGrain={false} />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {!revealed && (
            <div style={{ textAlign: 'center' }}>
              <AnswerTracker state={state} de={de} />
            </div>
          )}
        </div>
      </CenterArea>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PLACEMENT — Layout strikt 1:1 nach Original PlacementView aus
// QQBeamerPage.tsx: 2-spaltig (Grid links · ScoreBar rechts), gleiche
// Höhe = gridMaxSize. Sweep-Animation bei Phase-Entry, Sticky-Placer-
// Logic, Active-Team-Highlight in ScoreBar mit Aktions-Pill.
// 3D ist bewusst weggelassen (User-Wunsch). Aquarell-Stil tauscht nur
// Tokens/Components, alle Funktionen + Indikatoren bleiben.
// ─────────────────────────────────────────────────────────────────────────

function PlacementView({ state, de }: { state: QQStateUpdate; de: boolean }) {
  // Sticky Placer — der Highlight bleibt 1.2s am Team das gerade gesetzt hat,
  // sonst springt der Glow zum nächsten Team während die Cell-Anim noch läuft.
  const [stickyPlacer, setStickyPlacer] = useState<string | null>(null);
  const prevPlacedKey = useRef<string | null>(null);
  useEffect(() => {
    const lp = state.lastPlacedCell;
    const key = lp ? `${lp.row}-${lp.col}-${lp.teamId}` : null;
    if (!key) return;
    if (key === prevPlacedKey.current) return;
    prevPlacedKey.current = key;
    setStickyPlacer(lp!.teamId);
    const t = setTimeout(() => setStickyPlacer(cur => (cur === lp!.teamId ? null : cur)), 1200);
    return () => clearTimeout(t);
  }, [state.lastPlacedCell?.row, state.lastPlacedCell?.col, state.lastPlacedCell?.teamId]);

  // Aktiv-Team-Resolver: Sticky > Pending > Comeback-Steal
  const isComebackStealActive =
    !!state.comebackHL && state.comebackHL.phase === 'steal' && !!state.comebackTeamId;
  const activeTeamId = stickyPlacer
    ?? state.pendingFor
    ?? (isComebackStealActive ? state.comebackTeamId : null);

  // Grid-Größe wie Original: Min(720, 72vh, 48vw) damit rechts Platz für ScoreBar
  // bleibt.
  const { w: vw, h: vh } = useViewportSize();
  const gridMaxSize = Math.min(720, vh * 0.72, vw * 0.48);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden', minHeight: 0,
    }}>
      {/* G2 Placement-Sweep — weicher Licht-Streak nach Phase-Entry. */}
      <div key={`sweep-${state.questionIndex}`} aria-hidden style={{
        position: 'absolute', top: 12, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', zIndex: 4, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          width: '40%',
          background: `linear-gradient(90deg, transparent 0%, ${PALETTE.cream}33 45%, ${PALETTE.cream}55 50%, ${PALETTE.cream}33 55%, transparent 100%)`,
          animation: 'placementSweep 1.1s cubic-bezier(0.4,0,0.2,1) 0.15s both',
        }} />
      </div>

      {/* Top-Banner-Spacer (Original: 12px leer) */}
      <div style={{ height: 12, flexShrink: 0, position: 'relative', zIndex: 5 }} />

      {/* Center: 2-spaltig — Grid links, ScoreBar rechts. Beide Spalten
          height = gridMaxSize damit ScoreBar exakt Grid-Höhe hat. */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center',
        padding: '12px 36px', position: 'relative', zIndex: 5, gap: 32,
        minHeight: 0,
      }}>
        <div style={{
          width: gridMaxSize, height: gridMaxSize,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <GouacheGrid state={state} maxSize={gridMaxSize} highlightTeam={activeTeamId} />
        </div>
        <div style={{
          width: 540, height: gridMaxSize, flexShrink: 0,
          display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start',
        }}>
          <GouacheScoreBar
            teams={state.teams}
            activeTeamId={activeTeamId}
            teamPhaseStats={state.teamPhaseStats}
            correctTeamId={state.correctTeamId}
            activeActionLabel={(() => {
              const team = state.teams.find(t => t.id === activeTeamId);
              if (!team) return undefined;
              if (state.comebackHL && state.comebackHL.phase === 'steal' && (state.comebackHL as any).currentStealer === team.id) {
                if (state.comebackStealPaused) {
                  return de ? '✓ Geklaut — Weiter mit Space' : '✓ Stolen — press Space';
                }
                return de ? '⚡ Comeback-Klau' : '⚡ Comeback Steal';
              }
              return placementActionVerb(state.pendingAction, de);
            })()}
            activeActionDesc={(() => {
              const team = state.teams.find(t => t.id === activeTeamId);
              if (!team) return undefined;
              return placementActionDesc(state.pendingAction, state.teamPhaseStats[team.id], de);
            })()}
          />
        </div>
      </div>

      {/* Lokale Keyframes für Placement-Anims */}
      <style>{`
        @keyframes placementSweep {
          0%   { transform: translateX(-60%); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateX(260%); opacity: 0; }
        }
        @keyframes boardShake {
          0%   { transform: translate(0, 0); }
          25%  { transform: translate(-3px, 1px); }
          50%  { transform: translate(2px, -2px); }
          75%  { transform: translate(-1px, 2px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes cellInkFill {
          0%   { transform: scale(0.4) rotate(-6deg); opacity: 0; }
          55%  { transform: scale(1.06) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg);    opacity: 1; }
        }
        @keyframes cellShockwave {
          0%   { transform: scale(0.7); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes cellSparkle {
          0%   { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--sx), var(--sy)) scale(0); opacity: 0; }
        }
        @keyframes cellShard {
          0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--shx), var(--shy)) rotate(var(--shr)); opacity: 0; }
        }
        @keyframes cellEmojiDrop {
          0%   { transform: translateY(-30px) scale(0.5); opacity: 0; }
          60%  { transform: translateY(4px) scale(1.06); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes cellNeighborDuck {
          0%   { transform: scale(1); }
          50%  { transform: scale(0.94); }
          100% { transform: scale(1); }
        }
        @keyframes cellIdlePulse {
          0%, 100% { background: ${PALETTE.cream}10; }
          50%      { background: ${PALETTE.cream}26; }
        }
        @keyframes gridIdle {
          0%, 100% { box-shadow: 0 14px 36px rgba(31,58,95,0.18); }
          50%      { box-shadow: 0 18px 44px rgba(31,58,95,0.24); }
        }
        @keyframes frostPulse {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
        @keyframes frostShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes frostCrystal {
          0%, 100% { transform: rotate(-4deg) scale(1); }
          50%      { transform: rotate(4deg) scale(1.08); }
        }
        @keyframes stapelDustRing {
          0%   { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes stapelDrop {
          0%   { transform: translateY(-20px) scale(0.4); opacity: 0; }
          60%  { transform: translateY(3px) scale(1.15); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes sanduhrDrop {
          0%   { transform: translateY(-30px) scale(0.5); opacity: 0; }
          60%  { transform: translateY(4px) scale(1.1); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes sanduhrTick {
          0%, 100% { transform: rotate(0deg); }
          50%      { transform: rotate(180deg); }
        }
        @keyframes shieldGlow {
          0%, 100% { box-shadow: 0 0 14px ${PALETTE.amberGlow}88; }
          50%      { box-shadow: 0 0 28px ${PALETTE.amberGlow}cc, 0 0 48px ${PALETTE.amberGlow}66; }
        }
        @keyframes scorePop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        @keyframes tcpulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--c, transparent); }
          50%      { box-shadow: 0 0 0 6px transparent; }
        }
        @keyframes jokerStarFly {
          0%   { transform: translate(-50%, -90px) scale(0.4) rotate(-30deg); opacity: 0; }
          40%  { transform: translate(-50%, -10px) scale(1.4) rotate(15deg);  opacity: 1; }
          100% { transform: translate(-50%, var(--jk-dy)) scale(0.5) rotate(0deg); opacity: 0; }
        }
        @keyframes jokerImpactPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.18); }
        }
        @keyframes streakFlameWobble {
          0%, 100% { transform: rotate(-8deg); }
          50%      { transform: rotate(8deg); }
        }
        @keyframes voterSlotDrop {
          0%   { transform: translateY(-12px); opacity: 0; }
          60%  { transform: translateY(2px);  opacity: 1; }
          100% { transform: translateY(0);    opacity: 1; }
        }
        @keyframes scoreFloater {
          0%   { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-32px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Action-Verb / -Description (DE/EN) — pendingAction → label & sub
function placementActionVerb(a: string | null, de: boolean): string {
  if (a === 'STEAL_1')   return de ? '⚡ Klauen' : '⚡ Steal';
  if (a === 'COMEBACK')  return de ? '⭐ Comeback' : '⭐ Comeback';
  if (a === 'SANDUHR_1') return de ? '⏳ Bann' : '⏳ Lock';
  if (a === 'SHIELD_1')  return de ? '🛡 Schild' : '🛡 Shield';
  if (a === 'SWAP_1')    return de ? '🔄 Tauschen' : '🔄 Swap';
  if (a === 'STAPEL_1')  return de ? '🪨 Stapeln' : '🪨 Stack';
  if (a === 'FREE')      return de ? '✱ Aktion wählen' : '✱ Pick action';
  return de ? '📍 Setzen' : '📍 Place';
}

function placementActionDesc(a: string | null, stats: any, de: boolean): string | undefined {
  if (a === 'PLACE_1') return de ? '1 Feld auswählen' : 'Pick 1 field';
  if (a === 'PLACE_2') return de
    ? `${stats?.placementsLeft ?? 2} Felder übrig`
    : `${stats?.placementsLeft ?? 2} fields left`;
  if (a === 'STEAL_1') return de ? 'Gegnerisches Feld' : 'Opponent field';
  if (a === 'FREE')    return de ? 'Setzen / Klauen / Bann' : 'Place / Steal / Lock';
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────
// GouacheGrid — 1:1 von GridDisplay (Original): Cells mit Owner-Wash,
// Territorium-Bridges, alle Spezial-Indikatoren (Frozen/Stuck/Sanduhr/
// Shield/Joker), Idle-Pulse, Diff-Tracking (new/stolen/neighbor),
// Shockwave/Sparkle/Shard-Animationen, Avatar full-bleed im Quadrat
// (User-Override: KEIN runder Disc-Frame mehr).
// ─────────────────────────────────────────────────────────────────────────

function GouacheGrid({
  state, maxSize, highlightTeam,
}: {
  state: QQStateUpdate; maxSize: number; highlightTeam: string | null;
}) {
  const gap = 4;
  const cellSize = Math.floor((maxSize - (state.gridSize - 1) * gap) / state.gridSize);
  const activeTeam = state.teams.find(t => t.id === highlightTeam);
  const activeColor = activeTeam ? softTeamColor(activeTeam.avatarId) : PALETTE.cream;

  // Diff-Tracking für new/stolen/neighbor
  const gridKey = state.grid.flatMap(row => row.map(c => `${c.ownerId ?? ''}`)).join(',');
  const prevGridRef = useRef<string>(gridKey);
  const newCellsRef = useRef<Set<string>>(new Set());
  const stolenCellsRef = useRef<Set<string>>(new Set());
  const neighborCellsRef = useRef<Set<string>>(new Set());
  const [shakeTick, setShakeTick] = useState(0);
  if (gridKey !== prevGridRef.current) {
    const newSet = new Set<string>();
    const stolenSet = new Set<string>();
    const neighborSet = new Set<string>();
    const prevOwners = prevGridRef.current.split(',');
    state.grid.forEach((row, r) => row.forEach((cell, c) => {
      const prevOwner = prevOwners[(r * state.gridSize) + c];
      if (prevOwner === undefined) return;
      if (cell.ownerId && prevOwner === '') newSet.add(`${r}-${c}`);
      else if (cell.ownerId && prevOwner && prevOwner !== cell.ownerId) stolenSet.add(`${r}-${c}`);
    }));
    const changed = new Set<string>([...newSet, ...stolenSet]);
    for (const key of changed) {
      const [r, c] = key.split('-').map(Number);
      [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr, nc]) => {
        if (nr >= 0 && nr < state.gridSize && nc >= 0 && nc < state.gridSize && !changed.has(`${nr}-${nc}`)) {
          neighborSet.add(`${nr}-${nc}`);
        }
      });
    }
    newCellsRef.current = newSet;
    stolenCellsRef.current = stolenSet;
    neighborCellsRef.current = neighborSet;
    prevGridRef.current = gridKey;
    if (newSet.size > 0 || stolenSet.size > 0) {
      setShakeTick(t => t + 1);
      setTimeout(() => {
        newCellsRef.current = new Set();
        stolenCellsRef.current = new Set();
        neighborCellsRef.current = new Set();
      }, 1200);
    }
  }

  // Idle-Pulse für 2 zufällige leere Cells
  const [idleCells, setIdleCells] = useState<Set<string>>(new Set());
  useEffect(() => {
    const iv = setInterval(() => {
      const empty: string[] = [];
      state.grid.forEach((row, r) => row.forEach((cell, c) => {
        if (!cell.ownerId) empty.push(`${r}-${c}`);
      }));
      if (empty.length === 0) { setIdleCells(new Set()); return; }
      const picked = new Set<string>();
      for (let i = 0; i < Math.min(2, empty.length); i++) {
        const idx = Math.floor(Math.random() * empty.length);
        picked.add(empty.splice(idx, 1)[0]);
      }
      setIdleCells(picked);
    }, 2500);
    return () => clearInterval(iv);
  }, [state.grid]);

  return (
    <div
      key={`shake-${shakeTick}`}
      style={{ animation: shakeTick > 0 ? 'boardShake 0.45s ease-out' : undefined }}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${state.gridSize}, ${cellSize}px)`,
        gap,
        background: `${PALETTE.cream}1a`,
        padding: 10, borderRadius: 18,
        border: `2px solid ${highlightTeam ? `${activeColor}88` : `${PALETTE.cream}33`}`,
        boxShadow: highlightTeam
          ? `0 0 40px ${activeColor}44, inset 0 1px 0 ${PALETTE.cream}11`
          : `0 0 30px rgba(0,0,0,0.3), inset 0 1px 0 ${PALETTE.cream}11`,
        animation: 'gridIdle 4s ease-in-out infinite',
        transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
      }}>
        {state.grid.flatMap((row, r) =>
          row.map((cell, c) => (
            <GouacheCell
              key={`${r}-${c}`}
              cell={cell}
              cellSize={cellSize}
              gap={gap}
              row={r}
              col={c}
              gridSize={state.gridSize}
              grid={state.grid}
              team={cell.ownerId ? state.teams.find(t => t.id === cell.ownerId) ?? null : null}
              isHighlighted={!!(highlightTeam && cell.ownerId === highlightTeam)}
              isAccentActive={!!highlightTeam}
              isNew={newCellsRef.current.has(`${r}-${c}`)}
              isStolen={stolenCellsRef.current.has(`${r}-${c}`)}
              isNeighbor={neighborCellsRef.current.has(`${r}-${c}`)}
              idlePulse={idleCells.has(`${r}-${c}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function GouacheCell({
  cell, cellSize, gap, row, col, gridSize, grid, team,
  isHighlighted, isAccentActive, isNew, isStolen, isNeighbor, idlePulse,
}: {
  cell: any; cellSize: number; gap: number;
  row: number; col: number; gridSize: number; grid: any[][];
  team: QQTeam | null;
  isHighlighted: boolean; isAccentActive: boolean;
  isNew: boolean; isStolen: boolean; isNeighbor: boolean; idlePulse: boolean;
}) {
  const showStar = !!cell.jokerFormed;
  const isFrozen = !!cell.frozen;
  const isStuck = !!cell.stuck;
  const isShielded = !!cell.shielded && !cell.stuck;
  const sandTtl = cell.sandLockTtl ?? 0;
  const isSandLocked = sandTtl > 0;
  const cellRadius = Math.max(4, cellSize * 0.16);
  const isAccent = isNew || isStolen;
  const teamColor = team ? softTeamColor(team.avatarId) : null;
  const slug = team ? qqGetAvatar(team.avatarId).slug : null;
  // Territorium-Fusion: gleiche Team-Nachbarn ermitteln
  const tid = team?.id;
  const nTop    = !!tid && grid[row - 1]?.[col]?.ownerId === tid;
  const nRight  = !!tid && grid[row]?.[col + 1]?.ownerId === tid;
  const nBottom = !!tid && grid[row + 1]?.[col]?.ownerId === tid;
  const nLeft   = !!tid && grid[row]?.[col - 1]?.ownerId === tid;
  const rTL = (nTop || nLeft) ? 0 : cellRadius;
  const rTR = (nTop || nRight) ? 0 : cellRadius;
  const rBR = (nBottom || nRight) ? 0 : cellRadius;
  const rBL = (nBottom || nLeft) ? 0 : cellRadius;
  const specialBorder = isStuck || isFrozen || isShielded || showStar;
  const fusedRadius: any = specialBorder
    ? cellRadius
    : `${rTL}px ${rTR}px ${rBR}px ${rBL}px`;
  const isDimmed = isAccentActive && !isHighlighted && !isAccent && !!team;

  return (
    <div style={{
      position: 'relative', overflow: 'visible',
      width: cellSize, height: cellSize, borderRadius: cellRadius,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: isAccent ? 5 : 1,
      animation: isNeighbor ? 'cellNeighborDuck 0.45s ease-out 0.1s both' : undefined,
    }}>
      {/* Empty cell base — Aquarell-Cremepapier mit idle-Pulse */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: cellRadius,
        background: `${PALETTE.cream}26`,
        border: `1px solid ${PALETTE.cream}33`,
        animation: !team && idlePulse ? 'cellIdlePulse 2.5s ease-in-out both' : undefined,
        filter: 'url(#watercolorEdge)',
      }} />
      {/* Team color layer — voll deckend, Aquarell-Wash */}
      {team && teamColor && (() => {
        const baseAlpha = isHighlighted || isAccent ? 'ff' : isDimmed ? 'cc' : 'ff';
        const gradAlpha = isHighlighted || isAccent ? 'cc' : isDimmed ? 'a6' : 'd9';
        const bridgeBg = `linear-gradient(135deg, ${teamColor}${baseAlpha}, ${teamColor}${gradAlpha})`;
        const bridgeSpan = Math.max(6, cellSize - cellRadius * 2);
        const bridgeOffset = cellRadius;
        return (
          <>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: fusedRadius,
              background: isStuck
                ? `linear-gradient(135deg, ${teamColor}ff, ${teamColor}bb)`
                : bridgeBg,
              border: isStuck
                ? `2px solid ${PALETTE.amberGlow}ee`
                : showStar
                  ? `2px solid ${PALETTE.amberGlow}cc`
                  : isFrozen
                    ? 'none'
                    : `1px solid ${teamColor}${isHighlighted || isAccent ? 'ff' : isDimmed ? '33' : '55'}`,
              animation: isAccent ? 'cellInkFill 0.9s cubic-bezier(0.22,1,0.36,1) both' : undefined,
              boxShadow: isStuck
                ? `0 0 14px ${PALETTE.amberGlow}aa, 0 0 6px ${PALETTE.amberGlow}66`
                : isAccent
                  ? `0 0 24px ${teamColor}bb`
                  : showStar
                    ? `0 0 10px ${PALETTE.amberGlow}88`
                    : isHighlighted
                      ? `0 0 14px ${teamColor}88`
                      : 'none',
              transition: 'box-shadow 0.4s ease, background 0.4s ease, border-color 0.4s ease',
              filter: 'url(#watercolorEdge)',
            }} />
            {/* Territorium-Bridges */}
            {nRight && (
              <div style={{
                position: 'absolute',
                right: -gap - 1, top: bridgeOffset,
                width: gap + 2, height: bridgeSpan,
                background: bridgeBg,
                zIndex: 2, pointerEvents: 'none',
              }} />
            )}
            {nBottom && (
              <div style={{
                position: 'absolute',
                bottom: -gap - 1, left: bridgeOffset,
                height: gap + 2, width: bridgeSpan,
                background: bridgeBg,
                zIndex: 2, pointerEvents: 'none',
              }} />
            )}
          </>
        );
      })()}
      {/* Frozen overlay */}
      {isFrozen && (
        <>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: cellRadius,
            background: 'rgba(147,210,255,0.22)',
            border: '2px solid rgba(147,210,255,0.8)',
            animation: 'frostPulse 2.5s ease-in-out infinite',
            pointerEvents: 'none', zIndex: 2,
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: cellRadius,
            background: 'linear-gradient(105deg, transparent 30%, rgba(200,230,255,0.35) 45%, rgba(255,255,255,0.45) 50%, rgba(200,230,255,0.35) 55%, transparent 70%)',
            backgroundSize: '200% 100%',
            animation: 'frostShimmer 3s ease-in-out infinite',
            pointerEvents: 'none', zIndex: 3,
          }} />
          <div style={{
            position: 'absolute', top: -4, right: -4,
            zIndex: 5, lineHeight: 0,
            animation: 'frostCrystal 3s ease-in-out infinite',
            filter: 'drop-shadow(0 0 3px rgba(147,210,255,0.8))',
            fontSize: Math.max(14, cellSize * 0.42),
          }}>❄</div>
        </>
      )}
      {/* Stuck overlay — Gold-Schimmer + ×2-Chip + Dust-Ring */}
      {isStuck && (
        <>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: cellRadius,
            background: `linear-gradient(135deg, ${PALETTE.amberGlow}33, ${PALETTE.amberGlow}11)`,
            pointerEvents: 'none', zIndex: 1,
          }} />
          <div style={{
            position: 'absolute', inset: -6, borderRadius: cellRadius + 6,
            border: `2.5px solid ${PALETTE.amberGlow}cc`,
            animation: 'stapelDustRing 0.6s ease-out 0.1s both',
            pointerEvents: 'none', zIndex: 3,
          }} />
          <div style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: Math.max(16, cellSize * 0.32),
            height: Math.max(16, cellSize * 0.32),
            padding: `0 ${Math.max(3, cellSize * 0.05)}px`,
            borderRadius: 999,
            background: `linear-gradient(135deg, ${PALETTE.amberGlow}, ${PALETTE.terracotta})`,
            border: `2px solid ${PALETTE.charcoal}`,
            color: PALETTE.charcoal,
            fontSize: Math.max(10, cellSize * 0.20),
            fontWeight: 900,
            lineHeight: 1, letterSpacing: '-0.02em',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 6px rgba(0,0,0,0.35), 0 0 8px ${PALETTE.amberGlow}99`,
            zIndex: 6, fontVariantNumeric: 'tabular-nums',
            animation: 'stapelDrop 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
            fontFamily: F_HAND_CAPS,
          }}>×2</div>
        </>
      )}
      {/* Sanduhr / SandLock */}
      {isSandLocked && (
        <>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: cellRadius,
            border: `2px solid ${PALETTE.lavenderDusk}cc`,
            background: `linear-gradient(135deg, ${PALETTE.lavenderDusk}33, ${PALETTE.lavenderDusk}1a)`,
            boxShadow: `inset 0 0 16px ${PALETTE.lavenderDusk}66`,
            animation: 'frostPulse 2.5s ease-in-out infinite',
            pointerEvents: 'none', zIndex: 2,
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', zIndex: 4,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))',
            fontSize: Math.max(20, cellSize * 0.6),
            animation: 'sanduhrDrop 0.65s cubic-bezier(0.34,1.56,0.64,1) both, sanduhrTick 2.5s ease-in-out 0.7s infinite',
          }}>⏳</div>
          <div style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: Math.max(16, cellSize * 0.32),
            height: Math.max(16, cellSize * 0.32),
            padding: `0 ${Math.max(3, cellSize * 0.05)}px`,
            borderRadius: 999,
            background: `linear-gradient(135deg, ${PALETTE.lavenderDusk}, #2E1065)`,
            border: '2px solid #2E1065',
            color: PALETTE.cream,
            fontSize: Math.max(10, cellSize * 0.22),
            fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 6px rgba(0,0,0,0.35), 0 0 8px ${PALETTE.lavenderDusk}99`,
            zIndex: 6, fontVariantNumeric: 'tabular-nums',
            fontFamily: F_HAND_CAPS,
          }}>{sandTtl}</div>
        </>
      )}
      {/* Shield overlay */}
      {isShielded && (
        <>
          <div style={{
            position: 'absolute', inset: -2, borderRadius: cellRadius + 2,
            border: `2.5px solid ${PALETTE.amberGlow}e6`,
            background: `${PALETTE.amberGlow}24`,
            animation: 'shieldGlow 2s ease-in-out infinite',
            pointerEvents: 'none', zIndex: 2,
          }} />
          <div style={{
            position: 'absolute', top: -5, right: -5,
            zIndex: 5, lineHeight: 0,
            filter: `drop-shadow(0 0 6px ${PALETTE.amberGlow}cc)`,
            fontSize: Math.max(16, cellSize * 0.48),
          }}>🛡</div>
        </>
      )}
      {/* Steal-Shatter (8 Splitter) */}
      {isStolen && [0, 1, 2, 3, 4, 5, 6, 7].map(i => {
        const angle = i * 45 + Math.random() * 20;
        const dist = cellSize * (0.7 + Math.random() * 0.5);
        const shx = `${Math.cos(angle * Math.PI / 180) * dist}px`;
        const shy = `${Math.sin(angle * Math.PI / 180) * dist}px`;
        const shr = `${(Math.random() * 360 - 180).toFixed(0)}deg`;
        return (
          <div key={`sh-${i}`} style={{
            position: 'absolute',
            width: Math.max(4, cellSize * 0.14), height: Math.max(4, cellSize * 0.14),
            borderRadius: 2,
            background: teamColor ?? PALETTE.cream,
            top: '50%', left: '50%',
            marginTop: -Math.max(2, cellSize * 0.07),
            marginLeft: -Math.max(2, cellSize * 0.07),
            ['--shx' as any]: shx, ['--shy' as any]: shy, ['--shr' as any]: shr,
            animation: `cellShard 0.7s ease-out ${0.05 + i * 0.02}s both`,
            pointerEvents: 'none', zIndex: 6,
            boxShadow: `0 0 8px ${teamColor ?? PALETTE.cream}`,
          }} />
        );
      })}
      {/* Shockwave-Rings auf neue/stolen */}
      {(isNew || isStolen) && (
        <>
          <div style={{
            position: 'absolute', inset: -6, borderRadius: cellRadius + 6,
            border: `2.5px solid ${teamColor ?? PALETTE.cream}88`,
            animation: 'cellShockwave 0.7s ease-out both',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', inset: -4, borderRadius: cellRadius + 4,
            border: `1.5px solid ${teamColor ?? PALETTE.cream}44`,
            animation: 'cellShockwave 0.9s ease-out 0.15s both',
            pointerEvents: 'none',
          }} />
        </>
      )}
      {/* Sparkle-Particles */}
      {(isNew || isStolen) && [0, 1, 2, 3, 4, 5].map(i => {
        const angle = i * 60;
        const dist = cellSize * 0.6;
        const sx = `${Math.cos(angle * Math.PI / 180) * dist}px`;
        const sy = `${Math.sin(angle * Math.PI / 180) * dist}px`;
        return (
          <div key={`sp-${i}`} style={{
            position: 'absolute',
            width: 4, height: 4, borderRadius: '50%',
            background: teamColor ?? PALETTE.cream,
            top: '50%', left: '50%', marginTop: -2, marginLeft: -2,
            ['--sx' as any]: sx, ['--sy' as any]: sy,
            animation: `cellSparkle 0.6s ease-out ${0.1 + i * 0.04}s both`,
            pointerEvents: 'none', zIndex: 3,
          }} />
        );
      })}
      {/* Avatar / Star — full-bleed im Quadrat ohne runden Frame
          (User-Override: transparente Aquarell-PNGs sitzen direkt im Cell). */}
      <div style={{
        position: 'relative', zIndex: 4,
        animation: (isNew || isStolen) ? 'cellEmojiDrop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both' : undefined,
        opacity: isFrozen ? 0.55 : undefined,
        filter: isFrozen ? 'saturate(0.4) brightness(1.2)' : undefined,
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {showStar ? (
          <span style={{
            fontSize: Math.max(14, cellSize * 0.5),
            color: PALETTE.amberGlow,
            textShadow: `0 0 12px ${PALETTE.amberGlow}aa`,
          }}>⭐</span>
        ) : team && slug ? (
          <div style={{
            width: Math.max(8, cellSize * 0.94),
            height: Math.max(8, cellSize * 0.94),
            backgroundImage: `url(/avatars/gouache/avatar-${slug}.png)`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }} />
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// GouacheScoreBar — 1:1 von ScoreBar (Original): sortiert nach
// largestConnected, Crown auf #1, Joker-Badge persistent + Stern-Flug-
// Animation, Streak-🔥 ab 3, Rank-Change-Pfeile, Floater +N, Active-
// Team-Highlight mit Aktions-Pill, Medal-Slot fix, Wert+Unit ausgerichtet.
// Aquarell-Stil tauscht nur Tokens (Cremepapier statt dunkel, Caveat,
// softTeamColor, Painted-Avatar).
// ─────────────────────────────────────────────────────────────────────────

function GouacheScoreBar({
  teams, activeTeamId, teamPhaseStats, correctTeamId, activeActionLabel, activeActionDesc,
}: {
  teams: QQTeam[];
  activeTeamId?: string | null;
  teamPhaseStats?: QQStateUpdate['teamPhaseStats'];
  correctTeamId?: string | null;
  activeActionLabel?: string;
  activeActionDesc?: string;
}) {
  const sorted = [...teams].sort((a, b) => b.largestConnected - a.largestConnected);
  const prevScores = useRef<Record<string, number>>({});
  const prevJokers = useRef<Record<string, number>>({});
  const prevRanks = useRef<Record<string, number>>({});
  const [poppedIds, setPoppedIds] = useState<Set<string>>(new Set());
  const [floaters, setFloaters] = useState<{ id: string; teamId: string; diff: number }[]>([]);
  const [rankChanges, setRankChanges] = useState<Record<string, 'up' | 'down'>>({});
  useEffect(() => {
    const next: Record<string, 'up' | 'down'> = {};
    sorted.forEach((t, i) => {
      const prevIdx = prevRanks.current[t.id];
      if (prevIdx != null && prevIdx !== i) {
        next[t.id] = prevIdx > i ? 'up' : 'down';
      }
      prevRanks.current[t.id] = i;
    });
    if (Object.keys(next).length > 0) {
      setRankChanges(next);
      setTimeout(() => setRankChanges({}), 1200);
    }
  }, [sorted.map(t => t.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const [jokerEarners, setJokerEarners] = useState<Set<string>>(new Set());
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const prevCorrectRef = useRef<string | null>(null);
  useEffect(() => {
    const cur = correctTeamId ?? null;
    if (!cur) return;
    if (cur === prevCorrectRef.current) return;
    prevCorrectRef.current = cur;
    setStreaks(s => {
      const next: Record<string, number> = {};
      for (const t of teams) next[t.id] = t.id === cur ? (s[t.id] ?? 0) + 1 : 0;
      return next;
    });
  }, [correctTeamId, teams]);

  useEffect(() => {
    const newPopped = new Set<string>();
    const newFloaters: typeof floaters = [];
    for (const t of teams) {
      const prev = prevScores.current[t.id] ?? 0;
      if (t.largestConnected > prev && prev > 0) {
        newPopped.add(t.id);
        newFloaters.push({ id: `${t.id}-${Date.now()}`, teamId: t.id, diff: t.largestConnected - prev });
      }
      prevScores.current[t.id] = t.largestConnected;
    }
    if (newPopped.size > 0) {
      setPoppedIds(newPopped);
      setFloaters(f => [...f, ...newFloaters]);
      setTimeout(() => setPoppedIds(new Set()), 500);
      setTimeout(() => setFloaters(f => f.filter(fl => !newFloaters.includes(fl))), 1200);
    }
  }, [teams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!teamPhaseStats) return;
    const newEarners = new Set<string>();
    for (const t of teams) {
      const now = teamPhaseStats[t.id]?.jokersEarned ?? 0;
      const before = prevJokers.current[t.id] ?? 0;
      if (now > before) newEarners.add(t.id);
      prevJokers.current[t.id] = now;
    }
    if (newEarners.size > 0) {
      setJokerEarners(newEarners);
      setTimeout(() => setJokerEarners(new Set()), 1600);
    }
  }, [teams, teamPhaseStats]);

  const dense = sorted.length >= 6;
  const avatarSize = dense ? 64 : 78;
  const avatarBox = dense ? 76 : 92;
  const nameFs = dense ? 32 : 40;
  const valFs = dense ? 40 : 52;
  const unitFs = dense ? 16 : 20;

  const medalFor = (i: number, val: number): string | null => {
    if (val === 0) return null;
    if (i === 0) return '🥇';
    if (i === 1 && sorted[1].largestConnected < sorted[0].largestConnected) return '🥈';
    if (i === 2 && sorted[2].largestConnected < (sorted[1]?.largestConnected ?? 0)) return '🥉';
    return null;
  };

  const many = sorted.length >= 7;
  const rowGap = dense ? 18 : 26;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      justifyContent: many ? 'space-between' : 'center',
      gap: many ? 0 : rowGap,
      width: '100%', maxWidth: 560, height: '100%',
      paddingTop: dense ? 4 : 8, paddingBottom: dense ? 4 : 8,
    }}>
      {sorted.map((t, i) => {
        const teamColor = softTeamColor(t.avatarId);
        const slug = qqGetAvatar(t.avatarId).slug;
        const isLeader = i === 0 && t.largestConnected > 0;
        const isActive = t.id === activeTeamId;
        const medal = medalFor(i, t.largestConnected);
        const jokers = teamPhaseStats?.[t.id]?.jokersEarned ?? 0;
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: dense ? 14 : 18,
            animation: poppedIds.has(t.id) ? 'scorePop 0.5s ease both' : undefined,
            opacity: activeTeamId && !isActive ? 0.42 : 1,
            padding: isActive ? (dense ? '6px 10px' : '8px 14px') : '0',
            borderRadius: isActive ? 16 : 0,
            background: isActive ? `linear-gradient(135deg, ${teamColor}33, ${teamColor}11)` : 'transparent',
            border: isActive ? `2px solid ${teamColor}` : '2px solid transparent',
            boxShadow: isActive ? `0 0 28px ${teamColor}55, 0 0 60px ${teamColor}22, inset 0 0 12px ${teamColor}18` : 'none',
            transition: 'opacity 0.3s ease, padding 0.3s ease, background 0.3s ease, box-shadow 0.4s ease',
            position: 'relative',
          }}>
            <div style={{ width: avatarBox, textAlign: 'center', flexShrink: 0 }}>
              <span style={{
                position: 'relative', display: 'inline-block',
                animation: jokerEarners.has(t.id)
                  ? 'jokerImpactPulse 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.85s both'
                  : undefined,
                borderRadius: '50%',
              }}>
                <PaintedAvatar slug={slug} size={avatarSize} color={teamColor} withGrain={false} />
                {isLeader && (
                  <span style={{
                    position: 'absolute',
                    top: dense ? -12 : -16,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(-14deg)',
                    fontSize: dense ? 24 : 30,
                    pointerEvents: 'none',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                  }}>👑</span>
                )}
                {jokers > 0 && (
                  <span style={{
                    position: 'absolute',
                    bottom: dense ? -4 : -6,
                    right: dense ? -6 : -8,
                    padding: '2px 7px',
                    borderRadius: 999,
                    background: PALETTE.charcoal,
                    border: `2px solid ${PALETTE.amberGlow}`,
                    fontSize: dense ? 13 : 16,
                    fontWeight: 900,
                    color: PALETTE.amberGlow,
                    lineHeight: 1,
                    boxShadow: `0 2px 6px rgba(0,0,0,0.55), 0 0 12px ${PALETTE.amberGlow}88`,
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    pointerEvents: 'none',
                    fontFamily: F_HAND_CAPS,
                  }}>⭐{jokers}</span>
                )}
                {jokerEarners.has(t.id) && (
                  <span aria-hidden style={{
                    position: 'absolute',
                    top: 0, left: '50%',
                    transform: 'translate(-50%, -30px)',
                    fontSize: dense ? 36 : 44,
                    lineHeight: 1,
                    pointerEvents: 'none',
                    filter: `drop-shadow(0 0 12px ${PALETTE.amberGlow}e6) drop-shadow(0 0 24px ${PALETTE.amberGlow}88)`,
                    ['--jk-dx' as any]: '0px',
                    ['--jk-dy' as any]: '40px',
                    animation: 'jokerStarFly 0.9s cubic-bezier(0.34,1.5,0.64,1) both',
                    zIndex: 10,
                  }}>⭐</span>
                )}
                {(streaks[t.id] ?? 0) >= 3 && (
                  <span aria-hidden style={{
                    position: 'absolute',
                    top: dense ? -10 : -14,
                    left: dense ? -6 : -8,
                    fontSize: dense ? 22 : 28,
                    pointerEvents: 'none',
                    filter: 'drop-shadow(0 0 8px rgba(251,146,60,0.9)) drop-shadow(0 0 14px rgba(239,68,68,0.5))',
                    animation: 'streakFlameWobble 0.7s ease-in-out infinite',
                    zIndex: 9,
                  }} title={`${streaks[t.id]}× in Folge`}>🔥</span>
                )}
                {rankChanges[t.id] && (
                  <span aria-hidden style={{
                    position: 'absolute',
                    top: '50%',
                    right: dense ? -18 : -22,
                    transform: 'translateY(-50%)',
                    fontSize: dense ? 18 : 22, fontWeight: 900,
                    color: rankChanges[t.id] === 'up' ? PALETTE.sage : PALETTE.terracotta,
                    pointerEvents: 'none',
                    filter: `drop-shadow(0 0 6px ${rankChanges[t.id] === 'up' ? PALETTE.sage : PALETTE.terracotta}cc)`,
                    animation: 'voterSlotDrop 1.2s cubic-bezier(0.34,1.56,0.64,1) both',
                    zIndex: 9,
                  }}>{rankChanges[t.id] === 'up' ? '▲' : '▼'}</span>
                )}
              </span>
            </div>
            {/* Name + (nur isActive) Aktions-Pill */}
            <div style={{
              flex: 1, minWidth: 0,
              display: 'flex', flexDirection: 'column',
              gap: isActive && activeActionLabel ? 4 : 0,
            }}>
              <span style={{
                fontFamily: F_HAND, fontSize: nameFs, fontWeight: 700, color: teamColor,
                textShadow: isActive ? `0 0 16px ${teamColor}88` : 'none',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                lineHeight: 1.1,
              }}>{t.name}</span>
              {isActive && activeActionLabel && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  alignSelf: 'flex-start',
                  padding: '3px 10px', borderRadius: 999,
                  background: `${PALETTE.charcoal}99`,
                  border: `1.5px solid ${teamColor}aa`,
                  fontFamily: F_HAND_CAPS,
                  fontSize: dense ? 14 : 16, fontWeight: 700,
                  color: PALETTE.amberGlow,
                  letterSpacing: '0.04em',
                  animation: 'tcpulse 1.6s ease-in-out infinite',
                  ['--c' as any]: `${teamColor}66`,
                }}>
                  <span>{activeActionLabel}</span>
                  {activeActionDesc && (
                    <span style={{
                      color: `${PALETTE.cream}aa`, fontWeight: 400,
                      fontSize: dense ? 12 : 13, letterSpacing: '0.04em',
                      fontFamily: F_BODY, fontStyle: 'italic',
                    }}>
                      {activeActionDesc}
                    </span>
                  )}
                </div>
              )}
            </div>
            {/* Wert + Unit + Medal */}
            <div style={{
              position: 'relative',
              display: 'flex', alignItems: 'baseline', gap: 10,
              flexShrink: 0,
            }}>
              <span style={{
                width: dense ? 32 : 38,
                flexShrink: 0,
                textAlign: 'center',
                fontSize: dense ? 22 : 28, lineHeight: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{medal ?? null}</span>
              <span style={{
                fontFamily: F_HAND,
                fontSize: valFs, color: isLeader ? PALETTE.amberGlow : PALETTE.cream, fontWeight: 700,
                textShadow: isLeader ? `0 0 18px ${PALETTE.amberGlow}88` : 'none',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                width: dense ? 56 : 72,
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {t.largestConnected}
              </span>
              <span style={{
                opacity: 0.55, fontSize: unitFs, fontWeight: 400, color: PALETTE.cream,
                flexShrink: 0,
                minWidth: dense ? 62 : 78,
                textAlign: 'left',
                fontFamily: F_BODY, fontStyle: 'italic',
              }}>
                {t.largestConnected === 1 ? 'Feld' : 'Felder'}
              </span>
              {/* Floater +N */}
              {floaters.filter(f => f.teamId === t.id).map(f => (
                <span key={f.id} aria-hidden style={{
                  position: 'absolute', right: dense ? 70 : 90, top: -10,
                  fontFamily: F_HAND_CAPS, fontSize: dense ? 18 : 22,
                  color: PALETTE.sage, fontWeight: 700,
                  letterSpacing: '0.04em',
                  textShadow: `0 0 8px ${PALETTE.sage}cc`,
                  animation: 'scoreFloater 1s ease-out forwards',
                  pointerEvents: 'none',
                }}>+{f.diff}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// QuestionFrame — Header (Kategorie + Frage-Index + Timer) + Content-Area
// Wird von SCHAETZCHEN/MUCHO/CHEESE gemeinsam genutzt.
// ─────────────────────────────────────────────────────────────────────────

function QuestionHeader({ state, q, de }: { state: QQStateUpdate; q: QQQuestion; de: boolean }) {
  const cat = QQ_CATEGORY_LABELS[q.category];
  const isBunteTuete = q.category === 'BUNTE_TUETE';
  const subKind = isBunteTuete && q.bunteTuete ? QQ_BUNTE_TUETE_LABELS[q.bunteTuete.kind] : null;
  const label = de ? cat.de : cat.en;
  const subLabel = subKind ? (de ? subKind.de : subKind.en) : null;
  const totalQuestions = state.schedule?.length ?? 15;
  const qNum = (state.questionIndex ?? 0) + 1;
  return (
    <header style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: 16, position: 'relative', zIndex: 5,
      flexShrink: 0, padding: '0 6px',
    }}>
      <CategoryPill label={subLabel ? `${label} · ${subLabel}` : label} />
      <div style={{
        fontFamily: F_HAND_CAPS, fontSize: 'min(2.4vh, 1.8vw)',
        color: `${PALETTE.cream}cc`,
        textTransform: 'uppercase', letterSpacing: '0.16em',
      }}>
        {de ? `Frage ${qNum} / ${totalQuestions}` : `Question ${qNum} / ${totalQuestions}`}
      </div>
      <TimerPill timerEndsAt={state.timerEndsAt} />
    </header>
  );
}

function CategoryPill({ label }: { label: string }) {
  return (
    <div style={{
      padding: '6px 16px', borderRadius: 999,
      background: `${PALETTE.cream}1f`,
      border: `1.5px solid ${PALETTE.cream}55`,
      backdropFilter: 'blur(4px)',
    }}>
      <span style={{
        fontFamily: F_HAND_CAPS,
        fontSize: 'min(2.4vh, 1.8vw)',
        color: PALETTE.cream,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {label}
      </span>
    </div>
  );
}

function TimerPill({ timerEndsAt }: { timerEndsAt: number | null }) {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!timerEndsAt) { setSecs(null); return; }
    const tick = () => setSecs(Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timerEndsAt]);
  if (secs == null) {
    return <div style={{ width: 80 }} />;
  }
  const urgent = secs <= 5;
  const color = urgent ? PALETTE.terracotta : PALETTE.cream;
  return (
    <div style={{
      padding: '6px 18px', borderRadius: 999,
      background: urgent ? `${PALETTE.terracotta}33` : `${PALETTE.cream}1f`,
      border: `1.5px solid ${color}88`,
      animation: urgent ? 'gTwinkle 0.6s ease-in-out infinite' : undefined,
      fontFamily: F_HAND, fontSize: 'min(3.2vh, 2.4vw)',
      fontWeight: 700, color,
      fontVariantNumeric: 'tabular-nums',
      minWidth: 64, textAlign: 'center',
    }}>
      {secs}s
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AnswerTracker — wer hat schon geantwortet (Avatar-Reihe)
// ─────────────────────────────────────────────────────────────────────────

function AnswerTracker({ state, de }: { state: QQStateUpdate; de: boolean }) {
  const answered = new Set(state.answers.map(a => a.teamId));
  const total = state.teams.length;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 12,
      padding: '8px 18px', borderRadius: 999,
      background: `${PALETTE.cream}1f`,
      border: `1.5px dashed ${PALETTE.cream}55`,
    }}>
      <span style={{
        fontFamily: F_HAND_CAPS, fontSize: 'min(2vh, 1.5vw)',
        color: PALETTE.cream, letterSpacing: '0.06em',
      }}>
        {answered.size} / {total} {de ? 'geantwortet' : 'answered'}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        {state.teams.map(t => {
          const has = answered.has(t.id);
          const color = softTeamColor(t.avatarId);
          return (
            <div key={t.id} style={{
              width: 26, height: 26, borderRadius: '50%',
              background: has ? color : `${PALETTE.cream}22`,
              border: `1.5px solid ${has ? color : `${PALETTE.cream}55`}`,
              boxShadow: has ? `0 0 10px ${color}88` : 'none',
              transition: 'all 0.3s',
            }} />
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SCHÄTZCHEN — Frage = Text + Unit, Reveal = Lösung + nähester Voter
// ─────────────────────────────────────────────────────────────────────────

function SchaetzchenView({ state, q, de, revealed }: {
  state: QQStateUpdate; q: QQQuestion; de: boolean; revealed: boolean;
}) {
  const text = (de ? q.text : q.textEn) ?? q.text;
  const unit = (de ? q.unit : q.unitEn) ?? q.unit;
  const answers = state.answers
    .map(a => ({ ...a, num: parseFloat(a.text.replace(',', '.')) }))
    .filter(a => Number.isFinite(a.num));
  const target = q.targetValue ?? null;
  const ranked = target == null ? answers : [...answers].sort((a, b) => Math.abs(a.num - target) - Math.abs(b.num - target));
  const winner = revealed && ranked[0] ? state.teams.find(t => t.id === ranked[0].teamId) : null;
  return (
    <>
      <QuestionHeader state={state} q={q} de={de} />
      <CenterArea>
        <PaperCard washColor={PALETTE.cream} padding="clamp(28px, 4vh, 56px)" style={{ maxWidth: 1100, width: '92%' }}>
          <div style={{ textAlign: 'center' }}>
            <BlockCapsHeading size="md" color={PALETTE.terracotta}>
              {de ? 'Schätzchen' : 'Close call'}
            </BlockCapsHeading>
            <div style={{
              fontFamily: F_HAND, fontSize: 'min(8vh, 6vw)',
              color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.05,
              marginTop: 18,
            }}>
              {text}
            </div>
            {unit && (
              <div style={{
                fontFamily: F_BODY, fontSize: 'min(2.4vh, 1.8vw)',
                color: PALETTE.inkSoft, fontStyle: 'italic', marginTop: 12,
              }}>
                {de ? `in ${unit}` : `in ${unit}`}
              </div>
            )}

            {!revealed ? (
              <div style={{ marginTop: 32 }}>
                <AnswerTracker state={state} de={de} />
              </div>
            ) : (
              <SchaetzchenReveal target={target} ranked={ranked} winner={winner} state={state} de={de} />
            )}
          </div>
        </PaperCard>
      </CenterArea>
    </>
  );
}

function SchaetzchenReveal({
  target, ranked, winner, state, de,
}: {
  target: number | null;
  ranked: Array<{ teamId: string; num: number }>;
  winner: QQTeam | undefined | null;
  state: QQStateUpdate;
  de: boolean;
}) {
  if (target == null) return null;
  return (
    <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'stretch', textAlign: 'left' }}>
      {/* Solution */}
      <div style={{
        padding: '22px 26px', borderRadius: 18,
        background: `${PALETTE.sageLight}55`, border: `2.5px solid ${PALETTE.sage}`,
        textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        animation: 'gFadeIn 0.5s ease-out both',
      }}>
        <BlockCapsHeading size="sm" color={PALETTE.sage}>
          {de ? 'Lösung' : 'Solution'}
        </BlockCapsHeading>
        <div style={{
          fontFamily: F_HAND, fontSize: 'min(12vh, 9vw)',
          color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1, marginTop: 8,
        }}>
          {target}
        </div>
      </div>
      {/* Top 5 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ranked.slice(0, 5).map((r, i) => {
          const team = state.teams.find(t => t.id === r.teamId);
          if (!team) return null;
          const color = softTeamColor(team.avatarId);
          const delta = Math.abs(r.num - target);
          return (
            <div key={r.teamId} style={{
              display: 'grid', gridTemplateColumns: 'auto auto 1fr auto auto',
              alignItems: 'center', gap: 12,
              padding: '8px 14px', borderRadius: 12,
              background: `${PALETTE.cream}d0`,
              border: `2px solid ${i === 0 ? color : color + '33'}`,
              boxShadow: i === 0 ? `0 4px 16px ${color}44` : 'none',
              animation: `gFadeIn 0.45s ease-out ${0.1 + i * 0.08}s both`,
            }}>
              <span style={{
                fontFamily: F_HAND, fontSize: 'min(3vh, 2.2vw)',
                color: i === 0 ? color : PALETTE.inkDeep, fontWeight: 700, minWidth: 32,
              }}>
                #{i + 1}
              </span>
              <PaintedAvatar slug={qqGetAvatar(team.avatarId).slug} size={40} color={color} withGrain={false} />
              <span style={{
                fontFamily: F_HAND, fontSize: 'min(2.6vh, 2vw)',
                color: PALETTE.inkDeep, fontWeight: 700,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {team.name}
              </span>
              <span style={{ fontFamily: F_HAND, fontSize: 'min(2.4vh, 1.8vw)', color: PALETTE.inkDeep, fontWeight: 700 }}>
                {r.num}
              </span>
              <span style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.inkSoft }}>
                Δ {delta}
              </span>
            </div>
          );
        })}
        {winner && (
          <div style={{
            marginTop: 8, padding: '10px 18px', borderRadius: 12,
            background: `${softTeamColor(winner.avatarId)}26`,
            border: `2.5px solid ${softTeamColor(winner.avatarId)}`,
            textAlign: 'center', animation: 'gFadeIn 0.6s ease-out 0.6s both',
          }}>
            <BlockCapsHeading size="sm" color={softTeamColor(winner.avatarId)} glow>
              {de ? `${winner.name} ist am nächsten dran` : `${winner.name} closest`}
            </BlockCapsHeading>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MUCHO — Frage + 4 Optionen, Reveal hebt korrekte Option grün hervor
// ─────────────────────────────────────────────────────────────────────────

function MuchoView({ state, q, de, revealed }: {
  state: QQStateUpdate; q: QQQuestion; de: boolean; revealed: boolean;
}) {
  const text = (de ? q.text : q.textEn) ?? q.text;
  const opts = (de ? q.options : q.optionsEn) ?? q.options ?? [];
  const correctIdx = q.correctOptionIndex;
  const letters = ['A', 'B', 'C', 'D'];
  // Voter-Avatare pro Option
  const votersByOpt = useMemo(() => {
    const m = new Map<number, string[]>();
    state.answers.forEach(a => {
      const i = parseInt(a.text, 10);
      if (Number.isInteger(i)) {
        if (!m.has(i)) m.set(i, []);
        m.get(i)!.push(a.teamId);
      }
    });
    return m;
  }, [state.answers]);
  return (
    <>
      <QuestionHeader state={state} q={q} de={de} />
      <CenterArea>
        <div style={{ width: '100%', maxWidth: 1240, display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 2vh, 28px)' }}>
          <PaperCard washColor={PALETTE.cream} padding="clamp(20px, 3vh, 40px)" style={{ textAlign: 'center' }}>
            <BlockCapsHeading size="md" color={PALETTE.terracotta}>Mu-Cho</BlockCapsHeading>
            <div style={{
              fontFamily: F_HAND, fontSize: 'min(7vh, 5.4vw)',
              color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.05,
              marginTop: 14,
            }}>
              {text}
            </div>
          </PaperCard>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 'clamp(10px, 1.5vh, 18px)',
          }}>
            {opts.map((opt, i) => {
              const voters = votersByOpt.get(i) ?? [];
              const isCorrect = revealed && correctIdx === i;
              const dimmed = revealed && correctIdx != null && !isCorrect;
              return (
                <div key={i} style={{
                  position: 'relative',
                  padding: 'clamp(14px, 2vh, 22px) clamp(16px, 2vw, 28px)',
                  borderRadius: 18,
                  background: isCorrect ? `${PALETTE.sage}33` : `${PALETTE.cream}f0`,
                  border: `3px solid ${isCorrect ? PALETTE.sage : `${PALETTE.inkSoft}55`}`,
                  boxShadow: isCorrect
                    ? `0 12px 36px ${PALETTE.sage}55, 0 0 60px ${PALETTE.sage}66`
                    : '0 8px 22px rgba(31,58,95,0.14)',
                  filter: dimmed ? 'grayscale(0.6) opacity(0.55)' : undefined,
                  display: 'flex', alignItems: 'center', gap: 16,
                  transition: 'all 0.5s ease',
                }}>
                  <span style={{
                    width: 'min(7vh, 5vw)', height: 'min(7vh, 5vw)',
                    minWidth: 48, minHeight: 48,
                    borderRadius: '50%',
                    background: isCorrect ? PALETTE.sage : PALETTE.inkDeep,
                    color: PALETTE.cream,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: F_HAND, fontSize: 'min(4vh, 3vw)', fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {letters[i]}
                  </span>
                  <span style={{
                    flex: 1, minWidth: 0,
                    fontFamily: F_HAND, fontSize: 'min(3.4vh, 2.4vw)',
                    color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.15,
                  }}>
                    {opt}
                  </span>
                  {voters.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {voters.slice(0, 6).map(tid => {
                        const team = state.teams.find(t => t.id === tid);
                        if (!team) return null;
                        return (
                          <PaintedAvatar key={tid} slug={qqGetAvatar(team.avatarId).slug}
                            size={36} color={softTeamColor(team.avatarId)} withGrain={false} />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {!revealed && (
            <div style={{ textAlign: 'center' }}>
              <AnswerTracker state={state} de={de} />
            </div>
          )}
        </div>
      </CenterArea>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CHEESE — Frage + Bild, Reveal zeigt Lösung als Frosted-Card über Bild
// ─────────────────────────────────────────────────────────────────────────

function CheeseView({ state, q, de, revealed }: {
  state: QQStateUpdate; q: QQQuestion; de: boolean; revealed: boolean;
}) {
  const text = (de ? q.text : q.textEn) ?? q.text;
  const answer = (de ? q.answer : q.answerEn) ?? q.answer;
  const imgUrl = q.image?.url;
  const winner = revealed && state.correctTeamId
    ? state.teams.find(t => t.id === state.correctTeamId) : null;
  return (
    <>
      <QuestionHeader state={state} q={q} de={de} />
      <CenterArea>
        <div style={{
          position: 'relative', width: '100%', maxWidth: 1200, height: 'min(70vh, 60vw)',
          borderRadius: 28, overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(31,58,95,0.4)',
          filter: 'url(#paintFrame)',
        }}>
          {imgUrl ? (
            <img src={imgUrl} alt="" style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover',
            }} />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(135deg, ${PALETTE.dusk}, ${PALETTE.lavenderDusk})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: F_HAND_CAPS, fontSize: 'min(6vh, 4.5vw)',
              color: `${PALETTE.cream}88`, textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              {de ? 'Bild fehlt' : 'No image'}
            </div>
          )}
          {/* Frosted Card mit Frage/Lösung */}
          <div style={{
            position: 'absolute', left: '50%', bottom: '6%', transform: 'translateX(-50%)',
            width: '88%',
            padding: 'clamp(20px, 3vh, 36px) clamp(24px, 3vw, 44px)',
            borderRadius: 22,
            background: `${PALETTE.cream}eb`,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 18px 44px rgba(0,0,0,0.4)',
            textAlign: 'center',
            animation: 'gFadeIn 0.6s ease-out both',
          }}>
            <BlockCapsHeading size="sm" color={revealed ? PALETTE.sage : PALETTE.terracotta}>
              {revealed ? (de ? 'Lösung' : 'Solution') : (de ? 'Bilderrätsel' : 'Picture this')}
            </BlockCapsHeading>
            <div style={{
              fontFamily: F_HAND, fontSize: 'min(6vh, 4.4vw)',
              color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.05,
              marginTop: 8,
            }}>
              {revealed ? answer : text}
            </div>
            {winner && (
              <div style={{
                marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '8px 18px', borderRadius: 999,
                background: `${softTeamColor(winner.avatarId)}26`,
                border: `2.5px solid ${softTeamColor(winner.avatarId)}`,
              }}>
                <PaintedAvatar slug={qqGetAvatar(winner.avatarId).slug} size={36} color={softTeamColor(winner.avatarId)} withGrain={false} />
                <span style={{
                  fontFamily: F_HAND, fontSize: 'min(3vh, 2.2vw)',
                  color: softTeamColor(winner.avatarId), fontWeight: 700,
                }}>
                  {winner.name}
                </span>
              </div>
            )}
          </div>
        </div>
        {!revealed && (
          <div style={{ marginTop: 20 }}>
            <AnswerTracker state={state} de={de} />
          </div>
        )}
      </CenterArea>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// RULES — komplette Slide-Rotation (1:1 Original) im Aquarell-Stil.
// Der Moderator klickt durch die 4 Folien (rulesSlideIndex 0-3).
// Slide 3 zeigt zusätzlich Ability-Badges (Klauen/Stapeln) und ggf.
// Tree (showTree). Slide-Daten direkt vom Cozy-Quiz übernommen.
// ─────────────────────────────────────────────────────────────────────────

type RulesSlideData = {
  icon: string;
  title: string;
  color: string;
  lines: string[];
  extra?: string;
  grid?: { cells: (string | null)[][]; colorA: string; colorB: string; label?: string };
  showTree?: boolean;
  abilities?: { slug?: string; emoji: string; label: string; accent: string }[];
};

function buildRulesSlidesDeGouache(totalPhases: 3 | 4): RulesSlideData[] {
  const abilityLines = totalPhases === 3
    ? [
        'Jede Runde bringt etwas Neues:',
        'Runde 2: Klauen',
        'Finale (Runde 3): Stapeln (eigenes Feld +1 Punkt, dauerhaft sicher)',
      ]
    : [
        'Jede Runde bringt etwas Neues:',
        'Runde 2: Klauen',
        'Runde 3: Stapeln (eigenes Feld +1 Punkt, dauerhaft sicher)',
        'Finale: Stapeln bleibt — mehr Zeit, mehr Fragen',
      ];
  return [
    {
      icon: '🏆',
      title: 'Das Ziel',
      color: CAT_ACCENT.MUCHO,
      lines: ['Sammelt Felder — das größte zusammenhängende Gebiet gewinnt.'],
    },
    {
      icon: '⚡',
      title: 'So läuft’s',
      color: CAT_ACCENT.CHEESE,
      lines: [
        `${totalPhases} Runden · 5 Kategorien`,
        'Richtige Antwort → Feld setzen',
        '2×2 Block oder 4 in einer Reihe = Bonus-Feld!',
        'Bei Gleichstand entscheidet Tempo.',
      ],
    },
    {
      icon: '🔓',
      title: 'Neue Fähigkeiten',
      color: CAT_ACCENT.SCHAETZCHEN,
      lines: abilityLines,
      showTree: true,
      abilities: [
        { emoji: '⚡', label: 'Klauen',  accent: CAT_ACCENT.BUNTE_TUETE },
        { emoji: '🏯', label: 'Stapeln', accent: '#06B6D4' },
      ],
    },
    {
      icon: '🔄',
      title: 'Comeback',
      color: CAT_ACCENT.ZEHN_VON_ZEHN,
      lines: [
        'Die Letzten werden die Ersten sein — oder wie war das?',
        'Vor dem Finale gibt’s eine Aufholchance. Überraschung!',
      ],
      extra: 'Viel Spaß — möge das beste Team gewinnen! 🎉',
    },
  ];
}

function buildRulesSlidesEnGouache(totalPhases: 3 | 4): RulesSlideData[] {
  const abilityLines = totalPhases === 3
    ? [
        'Each round adds something:',
        'Round 2: Steal',
        'Final (Round 3): Stack (own tile +1 point, permanently safe)',
      ]
    : [
        'Each round adds something:',
        'Round 2: Steal',
        'Round 3: Stack (own tile +1 point, permanently safe)',
        'Final: Stack stays — more time, more questions',
      ];
  return [
    {
      icon: '🏆',
      title: 'The Goal',
      color: CAT_ACCENT.MUCHO,
      lines: ['Claim cells — biggest connected area wins.'],
    },
    {
      icon: '⚡',
      title: 'How It Works',
      color: CAT_ACCENT.CHEESE,
      lines: [
        `${totalPhases} rounds · 5 categories`,
        'Right answer → place a cell',
        '2×2 block or 4 in a row = bonus tile!',
        'Tie? Speed decides.',
      ],
    },
    {
      icon: '🔓',
      title: 'New Abilities',
      color: CAT_ACCENT.SCHAETZCHEN,
      lines: abilityLines,
      showTree: true,
      abilities: [
        { emoji: '⚡', label: 'Steal', accent: CAT_ACCENT.BUNTE_TUETE },
        { emoji: '🏯', label: 'Stack', accent: '#06B6D4' },
      ],
    },
    {
      icon: '🔄',
      title: 'Comeback',
      color: CAT_ACCENT.ZEHN_VON_ZEHN,
      lines: [
        'The last shall be first — or so they say.',
        'Before the final: a catch-up for last place. Surprise!',
      ],
      extra: 'Good luck — may the best team win! 🎉',
    },
  ];
}

function RulesView({ state, de }: { state: QQStateUpdate; de: boolean }) {
  const totalPhases = (state.totalPhases ?? 4) as 3 | 4;
  const slides = de ? buildRulesSlidesDeGouache(totalPhases) : buildRulesSlidesEnGouache(totalPhases);
  const totalSlides = slides.length;
  const rawIdx = state.rulesSlideIndex ?? 0;
  if (rawIdx < 0) return null; // Overlay-Phase, später Übergang
  const idx = Math.max(0, Math.min(rawIdx, totalSlides - 1));
  const slide = slides[idx];
  const isLast = idx === totalSlides - 1;
  const hasGrid = !!slide.grid;
  const accent = slide.color;

  return (
    <CenterArea>
      <div
        key={idx}
        style={{
          position: 'relative', zIndex: 5,
          maxWidth: 1200, width: '94%', maxHeight: '92vh', overflow: 'hidden',
          background: `${PALETTE.cream}f5`,
          border: `2px solid ${accent}66`,
          borderRadius: 36,
          padding: `clamp(24px, 4vh, ${hasGrid ? 52 : 60}px) clamp(32px, 5vw, ${hasGrid ? 64 : 72}px)`,
          boxShadow: `0 0 120px ${accent}26, 0 16px 48px rgba(31,58,95,0.30)`,
          animation: 'gFadeIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both',
          filter: 'url(#paintFrame)',
        }}
      >
        {/* Papier-Korn-Overlay (über paintFrame, multiply) */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, borderRadius: 36,
          backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'240\' height=\'240\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.45\' numOctaves=\'3\'/><feColorMatrix values=\'0 0 0 0 0.92  0 0 0 0 0.86  0 0 0 0 0.74  0 0 0 0.32 0\'/></filter><rect width=\'240\' height=\'240\' filter=\'url(%23n)\'/></svg>")',
          opacity: 0.3, mixBlendMode: 'multiply', pointerEvents: 'none',
        }} />

        {/* Icon + title row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 'clamp(16px, 2vw, 28px)', marginBottom: 'clamp(16px, 2.5vh, 32px)',
          position: 'relative',
        }}>
          <span style={{
            fontSize: 'clamp(64px, 9vw, 110px)', lineHeight: 1,
            filter: `drop-shadow(0 4px 16px ${accent}44)`,
          }}>{slide.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: F_BODY,
              fontSize: 'clamp(13px, 1.4vw, 18px)', fontWeight: 700,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: `${accent}cc`, marginBottom: 6,
            }}>
              {de ? `Spielregeln · Folie ${idx + 1} von ${totalSlides}` : `Game Rules · Slide ${idx + 1} of ${totalSlides}`}
            </div>
            <div style={{
              fontFamily: F_HAND,
              fontSize: 'clamp(44px, 7vw, 88px)', fontWeight: 700, lineHeight: 1.05,
              color: accent,
              textShadow: `0 0 60px ${accent}44`,
            }}>
              {slide.title}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: '100%', height: 3, borderRadius: 2,
          background: `linear-gradient(90deg, ${accent}aa, ${accent}33, transparent)`,
          marginBottom: 'clamp(16px, 2.5vh, 32px)',
        }} />

        {/* Content: text left, grid right */}
        <div style={{
          display: 'flex',
          gap: 'clamp(24px, 3vw, 48px)',
          alignItems: slide.showTree ? 'stretch' : 'center',
          flexDirection: slide.showTree ? 'column' : (hasGrid ? 'row' : 'column'),
          position: 'relative',
        }}>
          {slide.showTree && (
            <RulesTree state={state} de={de} accent={accent} />
          )}

          {/* Text lines */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: 'clamp(10px, 1.5vh, 20px)', flex: 1,
          }}>
            {slide.lines.map((line, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start',
                gap: 'clamp(10px, 1.2vw, 18px)',
                animation: `gFadeIn 0.4s ease ${0.1 + i * 0.12}s both`,
              }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: accent, marginTop: 14, flexShrink: 0,
                  boxShadow: `0 0 10px ${accent}66`,
                }} />
                <span style={{
                  fontFamily: F_HAND,
                  fontSize: 'clamp(22px, 3vw, 42px)', fontWeight: 700,
                  color: PALETTE.inkDeep, lineHeight: 1.3,
                }}>
                  {line}
                </span>
              </div>
            ))}

            {/* Ability-Badges */}
            {slide.abilities && slide.abilities.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                gap: 'clamp(10px, 1.4vw, 20px)', marginTop: 'clamp(10px, 1.6vh, 22px)',
              }}>
                {slide.abilities.map((b, i) => (
                  <div key={`${b.label}-${i}`} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: 'clamp(10px, 1.2vh, 16px) clamp(14px, 1.6vw, 22px)',
                    borderRadius: 16,
                    background: `${b.accent}1f`,
                    border: `2px solid ${b.accent}88`,
                    boxShadow: `0 0 18px ${b.accent}44`,
                    minWidth: 'clamp(96px, 11vw, 140px)',
                    animation: `gFadeIn 0.4s ease ${0.4 + i * 0.08}s both`,
                  }}>
                    <span style={{
                      fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1,
                    }}>{b.emoji}</span>
                    <div style={{
                      fontFamily: F_HAND_CAPS,
                      fontSize: 'clamp(14px, 1.6vw, 22px)', fontWeight: 700,
                      color: b.accent, letterSpacing: '0.04em',
                    }}>{b.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mini grid example */}
          {slide.grid && <RulesMiniGridGouache grid={slide.grid} accent={accent} />}
        </div>

        {/* Extra callout */}
        {slide.extra && (
          <div style={{
            marginTop: 'clamp(16px, 2.5vh, 32px)',
            padding: 'clamp(12px, 1.8vh, 20px) clamp(18px, 2.2vw, 28px)',
            borderRadius: 18,
            background: `${accent}1f`,
            border: `2px solid ${accent}55`,
            fontFamily: F_HAND,
            fontSize: 'clamp(18px, 2.4vw, 34px)', fontWeight: 700,
            color: accent,
            animation: 'gFadeIn 0.5s ease 0.4s both',
            textShadow: `0 0 24px ${accent}33`,
          }}>
            {slide.extra}
          </div>
        )}

        {/* Last slide hint */}
        {isLast && (
          <div style={{
            marginTop: 'clamp(16px, 2.5vh, 32px)', textAlign: 'center',
            animation: 'gFadeIn 0.5s ease 0.6s both',
          }}>
            <BlockCapsHeading size="md" color={accent} glow>
              {de ? '🎬 Los geht’s!' : '🎬 Let’s go!'}
            </BlockCapsHeading>
          </div>
        )}
      </div>
    </CenterArea>
  );
}

// Mini-Grid für RULES — zeigt z.B. ein 4×4-Beispiel mit Joker-Stern
function RulesMiniGridGouache({ grid, accent }: {
  grid: { cells: (string | null)[][]; colorA: string; colorB: string; label?: string };
  accent: string;
}) {
  const rows = grid.cells.length;
  const cols = grid.cells[0].length;
  const cellSz = Math.min(84, Math.floor(340 / Math.max(rows, cols)));
  const gap = 5;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      animation: 'gFadeIn 0.5s ease 0.35s both',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${cellSz}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSz}px)`,
        gap,
      }}>
        {grid.cells.flatMap((row, r) => row.map((cell, c) => {
          const isTeamA = cell === 'A';
          const isStar = cell === '⭐';
          const isPin = cell === '🏯';
          const filled = isTeamA || isStar || isPin;
          const bg = isStar
            ? `linear-gradient(135deg, ${grid.colorA}cc, ${PALETTE.amberGlow}cc)`
            : isPin
              ? `linear-gradient(135deg, ${grid.colorA}cc, ${PALETTE.sage}cc)`
              : isTeamA
                ? `${grid.colorA}aa`
                : `${PALETTE.cream}26`;
          return (
            <div key={`${r}-${c}`} style={{
              width: cellSz, height: cellSz,
              borderRadius: Math.max(4, cellSz * 0.18),
              background: bg,
              border: filled
                ? `2px solid ${isStar ? PALETTE.amberGlow : isPin ? PALETTE.sage : grid.colorA}`
                : `1px solid ${PALETTE.inkSoft}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: cellSz * 0.5,
              boxShadow: filled
                ? `0 0 12px ${isStar ? PALETTE.amberGlow + '66' : isPin ? PALETTE.sage + '66' : grid.colorA + '66'}`
                : 'none',
              filter: 'url(#watercolorEdge)',
            }}>
              {isStar ? '⭐' : isPin ? '🏯' : ''}
            </div>
          );
        }))}
      </div>
      {grid.label && (
        <div style={{
          fontFamily: F_HAND_CAPS,
          fontSize: 'clamp(18px, 2.2vw, 30px)', fontWeight: 700,
          color: accent, letterSpacing: '0.04em',
        }}>{grid.label}</div>
      )}
    </div>
  );
}

// Rules-Tree — kompakte Darstellung der Phasen-Folge mit Fragen pro Runde
function RulesTree({ state, de, accent }: {
  state: QQStateUpdate; de: boolean; accent: string;
}) {
  const total = state.totalPhases ?? 4;
  const phases = Array.from({ length: total }, (_, i) => i + 1);
  const labels = de
    ? ['Setzen', 'Klauen', 'Stapeln', 'Finale']
    : ['Place', 'Steal', 'Stack', 'Final'];
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', gap: 'clamp(8px, 1vw, 16px)',
      flexWrap: 'wrap',
      animation: 'gFadeIn 0.5s ease 0.05s both',
    }}>
      {phases.map(p => (
        <div key={p} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          padding: 'clamp(10px, 1.6vh, 18px) clamp(14px, 1.8vw, 24px)',
          borderRadius: 18,
          background: `${accent}14`,
          border: `2px solid ${accent}55`,
          minWidth: 110,
        }}>
          <BlockCapsHeading size="sm" color={accent}>
            {de ? `Runde ${p}` : `Round ${p}`}
          </BlockCapsHeading>
          <div style={{
            fontFamily: F_HAND,
            fontSize: 'clamp(20px, 2.4vw, 30px)', fontWeight: 700,
            color: PALETTE.inkDeep, lineHeight: 1,
          }}>
            {labels[p - 1] ?? `R${p}`}
          </div>
          <div style={{
            fontFamily: F_BODY, fontSize: 12,
            color: PALETTE.inkSoft, fontStyle: 'italic',
            letterSpacing: '0.04em',
          }}>
            5 {de ? 'Fragen' : 'questions'}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PHASE_INTRO — alle 4 Sub-Steps wie im Original:
//   1. Round-Announcement (isFirstOfRound + introStep === 0)
//      → Phase-Name groß, Round-Pill "N von Total", Divider, Tree
//   2. Rule-Reminder      (isFirstOfRound + introStep === 1)
//      → "NEU"-Badge, Action-Cards (Place/Steal/Stack mit emoji + count + limit)
//   3. Kategorie-Erklärung (categoryIsNew, beliebige Frage)
//      → Frage-Pill, RoundMiniTree, Emoji, Kategorie-Title, Lines, "So geht's"
//   4. Kategorie-Reveal kompakt (alles andere)
//      → Frage-Progress, RoundMiniTree, Emoji
// ─────────────────────────────────────────────────────────────────────────

function PhaseIntroView({ state, de }: { state: QQStateUpdate; de: boolean }) {
  const phaseIdx = state.gamePhaseIndex ?? 1;
  const isFinal = phaseIdx === (state.totalPhases ?? 4);
  // Round-Texte aus Original
  const phaseNamesDe = ['', 'Runde 1', 'Runde 2', 'Runde 3', 'Runde 4'];
  const phaseNamesEn = ['', 'Round 1', 'Round 2', 'Round 3', 'Round 4'];
  const phaseDescsDe = ['', 'Felder setzen', 'Klauen freigeschaltet', 'Stapeln freigeschaltet', 'Alles aufs Spiel'];
  const phaseDescsEn = ['', 'Place cells', 'Steal unlocked', 'Stack unlocked', 'All in'];
  const phaseName = isFinal ? (de ? 'Finale' : 'Final') : (de ? phaseNamesDe[phaseIdx] : phaseNamesEn[phaseIdx]);
  const phaseDesc = isFinal ? (de ? 'Alles aufs Spiel' : 'All in') : (de ? phaseDescsDe[phaseIdx] : phaseDescsEn[phaseIdx]);

  const questionInPhase = (state.questionIndex % 5) + 1;
  const isFirstOfRound = questionInPhase === 1;
  const cat = state.currentQuestion?.category as keyof typeof CAT_ACCENT | undefined;
  const catColor = cat ? CAT_ACCENT[cat] : CAT_ACCENT.MUCHO;
  const introStep = state.introStep ?? 0;

  // Phase-Backdrop je nach Phase
  const phaseStyle = (() => {
    if (isFirstOfRound && introStep <= 1) {
      // Round-Announcement: Phase-spezifischer Sky
      if (phaseIdx === 1) return 'phaseIntro1' as const;
      if (phaseIdx === 2) return 'phaseIntro2' as const;
      if (phaseIdx === 3) return 'phaseIntro3' as const;
      return 'phaseIntro4' as const;
    }
    return null;
  })();

  return (
    <>
      {/* Phase-Backdrop überschreibt den Default-Sky während Phase-Intro */}
      {phaseStyle && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <PhaseBackdrop phase={phaseStyle} />
        </div>
      )}

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 5, overflow: 'hidden',
      }}>
        {isFirstOfRound && introStep === 0 ? (
          <PhaseIntroRoundAnnouncement
            phaseName={phaseName}
            phaseDesc={phaseDesc}
            phaseIdx={phaseIdx}
            totalPhases={state.totalPhases ?? 4}
            isFinal={isFinal}
            de={de}
          />
        ) : isFirstOfRound && introStep === 1 ? (
          <PhaseIntroRuleReminder phaseIdx={phaseIdx} de={de} />
        ) : state.categoryIsNew ? (
          <PhaseIntroCategoryExplanation
            state={state}
            de={de}
            cat={cat}
            catColor={catColor}
            questionInPhase={questionInPhase}
          />
        ) : (
          <PhaseIntroCategoryReveal
            state={state}
            de={de}
            cat={cat}
            catColor={catColor}
            questionInPhase={questionInPhase}
          />
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step 0: Round-Announcement — Phase-Name groß
// ─────────────────────────────────────────────────────────────────────────

function PhaseIntroRoundAnnouncement({
  phaseName, phaseDesc, phaseIdx, totalPhases, isFinal, de,
}: {
  phaseName: string; phaseDesc: string; phaseIdx: number;
  totalPhases: number; isFinal: boolean; de: boolean;
}) {
  const accent = isFinal ? PALETTE.amberGlow : CAT_ACCENT.MUCHO;
  return (
    <div style={{ textAlign: 'center', animation: 'gFadeIn 0.6s ease-out both' }}>
      {/* Round-Progress-Pill */}
      <div style={{
        display: 'inline-block',
        padding: '8px 24px', borderRadius: 999,
        background: `${accent}22`, border: `2px solid ${accent}66`,
        fontFamily: F_HAND_CAPS,
        fontSize: 'clamp(16px, 1.8vw, 24px)', fontWeight: 700,
        color: PALETTE.cream, letterSpacing: '0.08em',
        marginBottom: 28,
        textShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}>
        {de
          ? `Runde ${phaseIdx} von ${totalPhases}`
          : `Round ${phaseIdx} of ${totalPhases}`}
      </div>

      {/* Phase-Name groß */}
      <div style={{
        fontFamily: F_HAND,
        fontSize: 'min(18vh, 14vw)',
        fontWeight: 700,
        lineHeight: 0.9,
        color: isFinal ? 'transparent' : PALETTE.cream,
        backgroundImage: isFinal
          ? `linear-gradient(180deg, #FDE68A 0%, #F59E0B 45%, #D97706 100%)`
          : undefined,
        WebkitBackgroundClip: isFinal ? 'text' : undefined,
        backgroundClip: isFinal ? 'text' : undefined,
        WebkitTextFillColor: isFinal ? 'transparent' : undefined,
        textShadow: isFinal
          ? `0 0 80px ${PALETTE.amberGlow}88`
          : '0 6px 24px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)',
        letterSpacing: '-0.01em',
        animation: 'phaseBam 0.65s cubic-bezier(0.22,1,0.36,1) 0.15s both',
      }}>
        {isFinal ? (de ? 'FINALE' : 'FINAL') : phaseName}
      </div>

      {/* Divider mit Glow */}
      <div style={{
        width: 'clamp(240px, 35vw, 500px)', height: 5, borderRadius: 3,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        margin: '28px auto',
        boxShadow: `0 0 20px ${accent}88, 0 0 40px ${accent}44`,
        animation: 'gFadeIn 0.7s ease 0.5s both',
      }} />

      {/* Phase-Description in Caveat */}
      <div style={{
        fontFamily: F_HAND,
        fontSize: 'clamp(34px, 5vw, 72px)', fontWeight: 700, lineHeight: 1,
        color: PALETTE.cream,
        textShadow: '0 4px 14px rgba(0,0,0,0.45)',
        animation: 'gFadeIn 0.6s ease 0.7s both',
      }}>
        {phaseDesc}
      </div>

      <style>{`
        @keyframes phaseBam {
          0%   { transform: scale(0.4); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step 1: Rule-Reminder — NEU-Badge + Action-Cards
// ─────────────────────────────────────────────────────────────────────────

function PhaseIntroRuleReminder({ phaseIdx, de }: { phaseIdx: number; de: boolean }) {
  const accent = phaseIdx === 1 ? CAT_ACCENT.MUCHO
    : phaseIdx === 2 ? CAT_ACCENT.SCHAETZCHEN
    : phaseIdx === 3 ? CAT_ACCENT.BUNTE_TUETE
    : PALETTE.amberGlow;

  // Action-Cards je Phase
  type ActionCard = { count: number; emoji: string; label: string; limit?: string; accent: string };
  const cards: ActionCard[] =
    phaseIdx === 1 ? [
      { count: 1, emoji: '📍', label: de ? 'Platzieren' : 'Place', accent },
    ]
    : phaseIdx === 2 ? [
      { count: 2, emoji: '📍', label: de ? 'Platzieren' : 'Place', accent: CAT_ACCENT.MUCHO },
      { count: 1, emoji: '⚡', label: de ? 'Klauen' : 'Steal',
        limit: de ? 'max 2× pro Runde' : 'max 2× per round',
        accent: CAT_ACCENT.SCHAETZCHEN },
    ]
    : (phaseIdx === 3 || phaseIdx === 4) ? [
      { count: 2, emoji: '📍', label: de ? 'Platzieren' : 'Place',
        limit: de ? 'wenn Feld frei' : 'while free cells',
        accent: CAT_ACCENT.MUCHO },
      { count: 1, emoji: '⚡', label: de ? 'Klauen' : 'Steal', accent: CAT_ACCENT.SCHAETZCHEN },
      { count: 1, emoji: '🏯', label: de ? 'Stapeln' : 'Stack',
        limit: de ? '+1 Pkt · max 3 pro Spiel' : '+1 pt · max 3 per game',
        accent: '#06B6D4' },
    ]
    : [];

  const lead = phaseIdx === 1
    ? (de ? 'Sichert euch eure ersten Felder' : 'Claim your first cells')
    : (de ? 'Pro richtige Antwort wählt eine Aktion' : 'Per correct answer choose one action');

  const emoji = phaseIdx === 1 ? '🏁' : (phaseIdx === 3 || phaseIdx === 4) ? '🏯' : '⚔️';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 14, animation: 'gFadeIn 0.5s ease both',
    }}>
      {/* Round-Pill (kleiner Kontext) */}
      <div style={{
        padding: '6px 20px', borderRadius: 999,
        background: `${accent}22`, border: `1.5px solid ${accent}55`,
        fontFamily: F_HAND_CAPS,
        fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 700,
        color: PALETTE.cream, letterSpacing: '0.06em',
      }}>
        {de ? `Runde ${phaseIdx}` : `Round ${phaseIdx}`}
      </div>

      {/* Big Emoji */}
      <div style={{
        fontSize: 'clamp(72px, 12vw, 140px)', lineHeight: 1,
        animation: 'gFloat 4s ease-in-out infinite',
        filter: `drop-shadow(0 6px 20px ${accent}66)`,
      }}>{emoji}</div>

      {/* NEU-Badge */}
      {phaseIdx > 1 && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 22px', borderRadius: 999,
          background: `${accent}33`, border: `2px solid ${accent}88`,
          marginTop: 14,
          animation: 'gFadeIn 0.5s ease 0.3s both',
        }}>
          <BlockCapsHeading size="sm" color={accent} glow>
            ✨ {de ? 'Neu' : 'New'}
          </BlockCapsHeading>
        </div>
      )}

      {/* Lead-Subtitle */}
      <div style={{
        fontFamily: F_HAND_CAPS,
        fontSize: 'clamp(13px, 1.4vw, 20px)', fontWeight: 700,
        color: `${PALETTE.cream}cc`, letterSpacing: '0.18em', textTransform: 'uppercase',
        textAlign: 'center', marginTop: 12,
      }}>
        {lead}
      </div>

      {/* Action-Cards */}
      <div style={{
        marginTop: 'clamp(20px, 3vh, 40px)',
        display: 'flex', flexDirection: 'row', flexWrap: 'wrap',
        alignItems: 'stretch', justifyContent: 'center',
        gap: 'clamp(10px, 1.6vw, 24px)',
        width: '100%', maxWidth: 1700,
      }}>
        {cards.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: F_HAND_CAPS,
                fontSize: 'clamp(15px, 1.6vw, 22px)', fontWeight: 700,
                color: `${PALETTE.cream}aa`, letterSpacing: '0.12em',
                flex: '0 0 auto',
              }}>{de ? 'oder' : 'or'}</div>
            )}
            <div style={{
              flex: cards.length === 1 ? '0 1 auto' : '1 1 0',
              minWidth: cards.length === 1 ? 280 : 200,
              maxWidth: cards.length === 1 ? 480 : 360,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(8px, 1.2vh, 16px)',
              padding: 'clamp(20px, 2.4vh, 36px) clamp(20px, 2vw, 32px)',
              borderRadius: 24,
              background: `linear-gradient(180deg, ${PALETTE.cream}f0, ${PALETTE.cream}d0)`,
              border: `3px solid ${c.accent}aa`,
              boxShadow: `0 0 40px ${c.accent}44, 0 12px 28px rgba(31,58,95,0.25)`,
              filter: 'url(#paintFrame)',
              animation: `gFadeIn 0.5s ease ${0.85 + i * 0.1}s both`,
            }}>
              <div style={{
                fontSize: 'clamp(72px, 8.5vw, 132px)',
                lineHeight: 1,
                filter: `drop-shadow(0 6px 18px ${c.accent}66)`,
              }}>{c.emoji}</div>
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 'clamp(6px, 0.8vw, 12px)',
                lineHeight: 1, flexWrap: 'wrap', justifyContent: 'center',
              }}>
                <span style={{
                  fontFamily: F_HAND_CAPS,
                  fontSize: 'clamp(36px, 4.2vw, 64px)',
                  color: c.accent, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: `0 0 22px ${c.accent}77`,
                }}>{c.count}×</span>
                <span style={{
                  fontFamily: F_HAND,
                  fontSize: 'clamp(28px, 3.2vw, 48px)', fontWeight: 700,
                  color: PALETTE.inkDeep,
                }}>{c.label}</span>
              </div>
              <div style={{
                fontFamily: F_BODY,
                fontSize: 'clamp(13px, 1.4vw, 19px)', fontWeight: 600,
                color: PALETTE.inkSoft, fontStyle: 'italic',
                textAlign: 'center', lineHeight: 1.25,
              }}>
                {de ? 'pro richtige Antwort' : 'per correct answer'}
              </div>
              {c.limit && (
                <div style={{
                  marginTop: 4,
                  padding: '5px 14px', borderRadius: 999,
                  background: `${PALETTE.charcoal}cc`,
                  border: `1.5px solid ${c.accent}88`,
                  fontFamily: F_BODY,
                  fontSize: 'clamp(11px, 1.15vw, 15px)', fontWeight: 700,
                  color: PALETTE.cream,
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.02em',
                }}>
                  {c.limit}
                </div>
              )}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step 2: Kategorie-Erklärung (categoryIsNew = true)
// ─────────────────────────────────────────────────────────────────────────

function PhaseIntroCategoryExplanation({
  state, de, cat, catColor, questionInPhase,
}: {
  state: QQStateUpdate; de: boolean;
  cat: keyof typeof CAT_ACCENT | undefined;
  catColor: string; questionInPhase: number;
}) {
  if (!cat) return null;
  const catLabel = QQ_CATEGORY_LABELS[cat];
  const btKind = state.currentQuestion?.bunteTuete?.kind;

  // Explanations 1:1 vom Original
  const CAT_INTRO: Record<string, { emoji: string; title: { de: string; en: string }; lines: { de: string[]; en: string[] } }> = {
    SCHAETZCHEN: {
      emoji: '🎯', title: { de: 'Schätzchen', en: 'Close Call' },
      lines: { de: ['Schätzt am nächsten dran — und gewinnt 1 Feld.', '🎯 Knapp dran (in Range)? Bekommt auch 1 Feld!'],
        en: ['Guess closest — and win 1 tile.', '🎯 Close to target? Also wins 1 tile!'] },
    },
    MUCHO: {
      emoji: '🅰️', title: { de: 'Mu-Cho', en: 'Mu-Cho' },
      lines: { de: ['4 Antworten, 1 richtige. Speed entscheidet.'], en: ['4 options, 1 right. Speed decides.'] },
    },
    ZEHN_VON_ZEHN: {
      emoji: '🎰', title: { de: '10 von 10', en: 'All In' },
      lines: { de: ['Verteilt 10 Punkte auf 3 Antworten.'], en: ['Spread 10 points across 3 answers.'] },
    },
    CHEESE: {
      emoji: '📸', title: { de: 'Picture This', en: 'Picture This' },
      lines: { de: ['Erkennt das Bild — tippt die Antwort ins Handy.'], en: ['Spot the image — type your answer.'] },
    },
    'BUNTE_TUETE:top5': {
      emoji: '🏆', title: { de: 'Top 5', en: 'Top 5' },
      lines: { de: ['Bis zu 5 Antworten — meiste Treffer gewinnt.'], en: ['Up to 5 answers — most hits wins.'] },
    },
    'BUNTE_TUETE:oneOfEight': {
      emoji: '🕵️', title: { de: 'Imposter', en: 'Imposter' },
      lines: { de: ['Unter 8 Aussagen ist eine falsch. Findet sie.'], en: ['One of 8 statements is false. Find it.'] },
    },
    'BUNTE_TUETE:order': {
      emoji: '📊', title: { de: 'Reihenfolge', en: 'Order' },
      lines: { de: ['Sortiert richtig — pro Treffer 1 Punkt.'], en: ['Sort correctly — 1 point per hit.'] },
    },
    'BUNTE_TUETE:map': {
      emoji: '🗺️', title: { de: 'CozyGuessr', en: 'CozyGuessr' },
      lines: { de: ['Tippt den Ort auf der Karte — nächstes Team gewinnt.'], en: ['Pin the spot on the map — closest team wins.'] },
    },
    'BUNTE_TUETE:hotPotato': {
      emoji: '🥔', title: { de: 'Heiße Kartoffel', en: 'Hot Potato' },
      lines: { de: ['Reihum antworten — zu langsam = raus.'], en: ['Answer in turn — too slow = out.'] },
    },
  };
  const key = cat === 'BUNTE_TUETE' && btKind ? `BUNTE_TUETE:${btKind}` : cat;
  const info = CAT_INTRO[key] ?? CAT_INTRO[cat];
  if (!info) return null;

  return (
    <>
      {/* CategoryBackdrop überlagert für Stimmung */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <CategoryBackdrop category={cat} />
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        position: 'relative', zIndex: 5,
      }}>
        {/* Pill: Runde + Frage */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          padding: '8px 22px', borderRadius: 18,
          background: `${catColor}22`, border: `1.5px solid ${catColor}66`,
          letterSpacing: '0.06em',
          animation: 'gFadeIn 0.4s ease 0.1s both',
        }}>
          <span style={{
            fontFamily: F_BODY,
            fontSize: 'clamp(11px, 1.2vw, 16px)', fontWeight: 700,
            color: `${catColor}cc`, textTransform: 'uppercase',
            letterSpacing: '0.18em',
          }}>
            {de ? `Runde ${state.gamePhaseIndex}` : `Round ${state.gamePhaseIndex}`}
          </span>
          <span style={{
            fontFamily: F_HAND_CAPS,
            fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 700,
            color: PALETTE.cream, letterSpacing: '0.06em',
          }}>
            {de ? `Frage ${questionInPhase} von 5` : `Question ${questionInPhase} of 5`}
          </span>
        </div>

        {/* Mini-Tree */}
        <RoundMiniTreeGouache state={state} catColor={catColor} />

        {/* Big emoji */}
        <div style={{
          fontSize: 'clamp(110px, 16vw, 200px)', lineHeight: 1,
          animation: 'gFloat 4s ease-in-out infinite',
          filter: `drop-shadow(0 8px 24px ${catColor}66)`,
        }}>
          {info.emoji}
        </div>

        {/* Title */}
        <div style={{
          fontFamily: F_HAND,
          fontSize: 'clamp(56px, 10vw, 160px)', fontWeight: 700, lineHeight: 1,
          color: catColor,
          textShadow: `0 0 80px ${catColor}66, 0 4px 14px rgba(0,0,0,0.4)`,
          animation: 'gFadeIn 0.7s ease 0.3s both',
          textAlign: 'center',
        }}>
          {info.title[de ? 'de' : 'en']}
        </div>

        {/* Lines */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          marginTop: 24,
        }}>
          {info.lines[de ? 'de' : 'en'].map((line, i) => (
            <div key={i} style={{
              fontFamily: F_HAND,
              fontSize: i === 0 ? 'clamp(26px, 3.5vw, 48px)' : 'clamp(20px, 2.5vw, 36px)',
              fontWeight: 700,
              color: i === 0 ? PALETTE.cream : `${catColor}cc`,
              textAlign: 'center',
              textShadow: i === 0 ? '0 4px 12px rgba(0,0,0,0.45)' : 'none',
              animation: `gFadeIn 0.5s ease ${0.5 + i * 0.15}s both`,
            }}>
              {line}
            </div>
          ))}
        </div>

        {/* "So geht's"-Badge */}
        <div style={{
          marginTop: 24, padding: '6px 22px', borderRadius: 999,
          background: `${catColor}22`, border: `1.5px solid ${catColor}66`,
          animation: 'gFadeIn 0.5s ease 0.8s both',
        }}>
          <BlockCapsHeading size="sm" color={catColor}>
            {de ? '📱 Antwort auf dem Handy' : '📱 Answer on your phone'}
          </BlockCapsHeading>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step 3: Kategorie-Reveal kompakt — Frage-Progress + Mini-Tree + Emoji
// ─────────────────────────────────────────────────────────────────────────

function PhaseIntroCategoryReveal({
  state, de, cat, catColor, questionInPhase,
}: {
  state: QQStateUpdate; de: boolean;
  cat: keyof typeof CAT_ACCENT | undefined;
  catColor: string; questionInPhase: number;
}) {
  if (!cat) return null;
  const catInfo = QQ_CATEGORY_LABELS[cat];
  const btKind = state.currentQuestion?.bunteTuete?.kind;
  const subInfo = btKind ? QQ_BUNTE_TUETE_LABELS[btKind] : null;
  const emoji = subInfo?.emoji ?? catInfo.emoji;

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <CategoryBackdrop category={cat} />
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        position: 'relative', zIndex: 5,
        animation: 'gFadeIn 0.5s ease both',
      }}>
        {/* Frage-Progress */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <div style={{
            fontFamily: F_BODY,
            fontSize: 'clamp(13px, 1.6vw, 20px)', fontWeight: 700,
            color: `${catColor}cc`, letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            {de ? `Runde ${state.gamePhaseIndex}` : `Round ${state.gamePhaseIndex}`}
          </div>
          <div style={{
            fontFamily: F_HAND_CAPS,
            fontSize: 'clamp(22px, 2.8vw, 36px)', fontWeight: 700,
            color: catColor, letterSpacing: '0.06em',
          }}>
            {de ? `Frage ${questionInPhase} von 5` : `Question ${questionInPhase} of 5`}
          </div>
        </div>

        {/* Mini-Tree */}
        <RoundMiniTreeGouache state={state} catColor={catColor} />

        {/* Big emoji */}
        <div style={{
          fontSize: 'clamp(110px, 16vw, 200px)', lineHeight: 1,
          animation: 'gFloat 4s ease-in-out infinite',
          filter: `drop-shadow(0 8px 24px ${catColor}66)`,
        }}>{emoji}</div>

        {/* Title */}
        <div style={{
          fontFamily: F_HAND,
          fontSize: 'clamp(48px, 8vw, 120px)', fontWeight: 700, lineHeight: 1,
          color: catColor,
          textShadow: `0 0 60px ${catColor}55, 0 4px 14px rgba(0,0,0,0.4)`,
          textAlign: 'center',
        }}>
          {subInfo ? (de ? subInfo.de : subInfo.en) : (de ? catInfo.de : catInfo.en)}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// RoundMiniTree — kompakte Phasen-Folge mit Wolf-Avatar auf aktueller Frage.
// Ohne Original-Wolf-Animation (vereinfachte Variante: Wolf springt direkt).
// ─────────────────────────────────────────────────────────────────────────

function RoundMiniTreeGouache({ state, catColor }: {
  state: QQStateUpdate; catColor: string;
}) {
  const schedule = state.schedule ?? [];
  const phase = state.gamePhaseIndex;
  const firstIdx = schedule.findIndex(e => e.phase === phase);
  const phaseEntries = schedule.filter(e => e.phase === phase);

  const currentInPhase = phaseEntries.length === 0 || firstIdx < 0
    ? 0
    : Math.max(0, Math.min(state.questionIndex - firstIdx, phaseEntries.length - 1));

  const [displayIdx, setDisplayIdx] = useState(Math.max(0, currentInPhase - 1));
  const [hopping, setHopping] = useState(false);

  useEffect(() => {
    if (currentInPhase === 0) {
      setDisplayIdx(0);
      setHopping(false);
      return;
    }
    setDisplayIdx(Math.max(0, currentInPhase - 1));
    setHopping(false);
    const t1 = setTimeout(() => {
      setDisplayIdx(currentInPhase);
      setHopping(true);
    }, 1000);
    const t2 = setTimeout(() => setHopping(false), 1000 + 560);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [currentInPhase]);

  if (phaseEntries.length === 0 || firstIdx < 0) return null;

  const DOT = 60;
  const GAP = 26;
  const WOLF = DOT + 12;
  const totalWidth = phaseEntries.length * DOT + (phaseEntries.length - 1) * GAP;
  const wolfLeft = displayIdx * (DOT + GAP) + DOT / 2;
  const progressWidth = displayIdx === 0 ? 0 : displayIdx * (DOT + GAP);

  return (
    <div style={{
      position: 'relative', width: totalWidth, height: WOLF + 4,
      display: 'flex', alignItems: 'center',
    }}>
      {/* Track + Progress */}
      <div style={{
        position: 'absolute', top: '50%', left: DOT / 2,
        width: totalWidth - DOT, height: 3,
        background: `${PALETTE.cream}33`,
        transform: 'translateY(-50%)', borderRadius: 2,
      }} />
      {progressWidth > 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: DOT / 2,
          width: progressWidth, height: 3,
          background: `linear-gradient(90deg, ${PALETTE.amberGlow}, ${PALETTE.terracotta})`,
          transform: 'translateY(-50%)', borderRadius: 2,
          boxShadow: `0 0 10px ${PALETTE.amberGlow}aa`,
          transition: 'width 540ms cubic-bezier(0.4,0,0.2,1)',
        }} />
      )}

      {/* Dots */}
      {phaseEntries.map((e, i) => {
        const subInfo = e.bunteTueteKind ? QQ_BUNTE_TUETE_LABELS[e.bunteTueteKind] : null;
        const catInfo = QQ_CATEGORY_LABELS[e.category as keyof typeof QQ_CATEGORY_LABELS];
        const dotEmoji = subInfo?.emoji ?? catInfo?.emoji ?? '';
        const isPast = i < displayIdx;
        const isCurrent = i === displayIdx;
        const dotLeft = i * (DOT + GAP);
        return (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: dotLeft,
            width: DOT, height: DOT, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.round(DOT * 0.55),
            background: isPast ? `${PALETTE.cream}26`
              : isCurrent ? 'transparent'
              : `${PALETTE.charcoal}88`,
            border: isCurrent ? 'none' : `1.5px solid ${PALETTE.cream}55`,
            filter: isPast ? 'grayscale(0.8)' : 'none',
            opacity: isPast ? 0.55 : isCurrent ? 0 : 1,
            transform: 'translateY(-50%)',
            transition: 'opacity 320ms ease, filter 320ms ease, background 320ms ease',
            zIndex: 1,
          }}>
            {dotEmoji}
          </div>
        );
      })}

      {/* Wolf-Avatar mit Logo */}
      <div style={{
        position: 'absolute', top: '50%', left: wolfLeft,
        width: WOLF, height: WOLF, borderRadius: '50%',
        background: PALETTE.cream,
        backgroundImage: 'url(/logo.png)',
        backgroundSize: '88%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        border: `3px solid ${catColor}`,
        boxShadow: `0 0 0 4px ${catColor}40, 0 6px 14px ${catColor}55`,
        transform: 'translate(-50%, -50%)',
        transition: 'left 560ms cubic-bezier(0.34, 1.25, 0.64, 1), border-color 400ms ease, box-shadow 400ms ease',
        animation: hopping ? 'roundMiniHop 560ms cubic-bezier(0.4,0,0.2,1) both' : undefined,
        zIndex: 2,
      }} />
      <style>{`
        @keyframes roundMiniHop {
          0%   { transform: translate(-50%, -50%); }
          50%  { transform: translate(-50%, -110%); }
          100% { transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PAUSED — Rotating Panels (alle Original-Panels 1:1)
// Lädt fetch /api/qq/leaderboard für all-time Stats. Rotiert alle 8s
// durch alle verfügbaren Panels: Progress / Standings / Leaderboard /
// Records + 9 erweiterte Stat-Panels (HotStreak / JokerKing /
// ComebackKing / StealMaster / Underdog / CategoryMasters /
// PerfectRounds / SpeedDemon / FunnyAnswers).
// ─────────────────────────────────────────────────────────────────────────

type PauseLeaderEntry = { name: string; wins: number; games: number };
type PauseFunStats = {
  highestScore: { teamName: string; score: number; draftTitle: string } | null;
  closestGame: { teams: string[]; gap: number; draftTitle: string } | null;
  winStreak: { teamName: string; streak: number } | null;
  mostGames: { teamName: string; games: number } | null;
  fastestAnswer: { teamName: string; text: string; questionText: string; ms: number } | null;
  funnyAnswers: Array<{ teamName: string; text: string; questionText: string }>;
  jokerKing?: { teamName: string; total: number } | null;
  stealMaster?: { teamName: string; total: number } | null;
  potatoBoss?: { teamName: string; total: number } | null;
  comebackKing?: { teamName: string; total: number } | null;
  underdog?: { teamName: string; games: number; wins: number } | null;
  speedDemon?: { teamName: string; avgRank: number; samples: number } | null;
  categoryMasters?: Array<{ teamName: string; category: string; count: number }>;
  perfectRounds?: Array<{ teamName: string; draftTitle: string }>;
  todayStats?: any;
};

const PAUSE_CAT_META: Record<string, { color: string; emoji: string; label: string }> = {
  SCHAETZCHEN:   { color: CAT_ACCENT.SCHAETZCHEN,   emoji: '🎯', label: 'Schätzchen' },
  MUCHO:         { color: CAT_ACCENT.MUCHO,         emoji: '🔤', label: 'Mu-Cho' },
  BUNTE_TUETE:   { color: CAT_ACCENT.BUNTE_TUETE,   emoji: '🎁', label: 'Bunte Tüte' },
  ZEHN_VON_ZEHN: { color: CAT_ACCENT.ZEHN_VON_ZEHN, emoji: '🎲', label: '10 von 10' },
  CHEESE:        { color: CAT_ACCENT.CHEESE,        emoji: '📸', label: 'Cheese' },
};

function PausedView({ state, de }: { state: QQStateUpdate; de: boolean }) {
  const modeAccent = PALETTE.amberGlow;

  const [leaderboard, setLeaderboard] = useState<PauseLeaderEntry[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [funStats, setFunStats] = useState<PauseFunStats | null>(null);
  useEffect(() => {
    const API = (import.meta as any).env?.VITE_API_BASE ?? '/api';
    fetch(`${API}/qq/leaderboard`).then(r => r.json()).then(data => {
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      if (data.totalGames) setTotalGames(data.totalGames);
      if (data.funStats) setFunStats(data.funStats);
    }).catch(() => {});
  }, []);

  const panels: Array<{ key: string; node: React.ReactNode }> = [];

  // Hilfs-Renderer im Aquarell-Stil
  const panelTitle = (icon: string, titleDe: string, titleEn: string, accent = PALETTE.cream) => (
    <div style={{
      fontFamily: F_HAND_CAPS,
      fontSize: 'clamp(22px, 2.8vw, 38px)', fontWeight: 700,
      color: accent, marginBottom: 22,
      display: 'flex', alignItems: 'center', gap: 14,
      letterSpacing: '0.06em',
    }}>
      <span style={{ fontSize: 'clamp(28px, 3.2vw, 44px)' }}>{icon}</span>
      {de ? titleDe : titleEn}
    </div>
  );
  const statPill = (value: string | number, label: string, accent = PALETTE.amberGlow) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '6px 16px', borderRadius: 999,
      background: `${PALETTE.charcoal}99`, border: `1.5px solid ${accent}88`,
    }}>
      <span style={{
        fontFamily: F_HAND, fontSize: 'clamp(20px, 2.4vw, 30px)',
        color: accent, fontWeight: 700, lineHeight: 1,
      }}>{value}</span>
      <span style={{
        fontFamily: F_HAND_CAPS, fontSize: 'clamp(11px, 1.2vw, 15px)',
        color: PALETTE.cream, letterSpacing: '0.08em',
      }}>{label}</span>
    </span>
  );
  const teamLine = (name: string, color?: string, avatarId?: string | null) => {
    const team = state.teams.find(t => t.name === name);
    const c = color ?? (team ? softTeamColor(team.avatarId) : PALETTE.amberGlow);
    const av = avatarId ?? team?.avatarId;
    const slug = av ? qqGetAvatar(av).slug : null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {slug && (
          <PaintedAvatar slug={slug} size={56} color={c} withGrain={false} />
        )}
        <span style={{
          fontFamily: F_HAND,
          fontWeight: 700, fontSize: 'clamp(26px, 3vw, 42px)', color: c,
          textShadow: `0 0 18px ${c}66`,
        }}>{name}</span>
      </div>
    );
  };

  // ── Panel 1: Standings (current game) ──
  const sortedTeams = [...state.teams].sort((a, b) => b.totalCells - a.totalCells);
  if (sortedTeams.length > 0) {
    const twoCol = sortedTeams.length >= 5;
    panels.push({ key: 'standings', node: (
      <div>
        {panelTitle('📊', 'Aktueller Stand', 'Current Standings', PALETTE.cream)}
        <div style={{
          display: 'grid',
          gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr',
          columnGap: 32, rowGap: 0,
        }}>
          {sortedTeams.map((t, i) => {
            const teamColor = softTeamColor(t.avatarId);
            const slug = qqGetAvatar(t.avatarId).slug;
            const nextInCol = twoCol ? (i + 2 < sortedTeams.length) : (i < sortedTeams.length - 1);
            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: twoCol ? 12 : 18,
                padding: twoCol ? '8px 0' : '12px 0',
                borderBottom: nextInCol ? `1px solid ${PALETTE.cream}22` : 'none',
                minWidth: 0,
              }}>
                <span style={{
                  fontFamily: F_HAND_CAPS,
                  fontSize: twoCol ? 'clamp(22px, 2.4vw, 32px)' : 'clamp(28px, 3.2vw, 42px)',
                  color: PALETTE.cream, width: twoCol ? 36 : 48, textAlign: 'center', flexShrink: 0,
                }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <PaintedAvatar
                  slug={slug}
                  size={twoCol ? 38 : 48}
                  color={teamColor}
                  withGrain={false}
                />
                <span style={{
                  flex: 1, fontFamily: F_HAND, fontWeight: 700,
                  fontSize: twoCol ? 'clamp(18px, 2vw, 26px)' : 'clamp(22px, 2.6vw, 32px)',
                  color: teamColor,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                }}>{t.name}</span>
                <span style={{
                  fontFamily: F_HAND,
                  fontSize: twoCol ? 'clamp(18px, 2vw, 26px)' : 'clamp(22px, 2.6vw, 32px)',
                  fontWeight: 700, color: PALETTE.amberGlow, flexShrink: 0,
                }}>{t.totalCells}</span>
                <span style={{
                  fontFamily: F_BODY,
                  fontSize: twoCol ? 'clamp(12px, 1.3vw, 16px)' : 'clamp(14px, 1.6vw, 20px)',
                  color: `${PALETTE.cream}88`, flexShrink: 0, fontStyle: 'italic',
                }}>{de ? 'Felder' : 'cells'}</span>
              </div>
            );
          })}
        </div>
      </div>
    )});
  }

  // ── Panel 2: Hot Streak (gap leader vs runner-up) ──
  if (sortedTeams.length >= 2) {
    const leader = sortedTeams[0];
    const runnerUp = sortedTeams[1];
    const gap = leader.totalCells - runnerUp.totalCells;
    if (gap > 0) {
      panels.push({ key: 'hotStreak', node: (
        <div>
          {panelTitle('🔥', 'Heiße Phase', 'Hot Streak', '#F97316')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {teamLine(leader.name, softTeamColor(leader.avatarId), leader.avatarId)}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {statPill(`+${gap}`, de ? 'Felder Vorsprung' : 'cells lead', '#F97316')}
              <span style={{
                color: `${PALETTE.cream}aa`, fontFamily: F_BODY,
                fontSize: 'clamp(17px, 1.9vw, 24px)', fontWeight: 600, fontStyle: 'italic',
              }}>
                {de ? `vor ${runnerUp.name}` : `ahead of ${runnerUp.name}`}
              </span>
            </div>
          </div>
        </div>
      )});
    }
  }

  // ── Panel 3: All-time Leaderboard ──
  const realLeaderboard = leaderboard.filter(e => e.wins > 0);
  if (realLeaderboard.length > 0) {
    panels.push({ key: 'leaderboard', node: (
      <div>
        {panelTitle('🏆', 'Bestenliste', 'Leaderboard', PALETTE.amberGlow)}
        {totalGames > 0 && (
          <div style={{
            fontFamily: F_BODY, fontSize: 'clamp(14px, 1.6vw, 20px)',
            color: `${PALETTE.cream}66`, marginBottom: 12, fontStyle: 'italic',
            marginTop: -14,
          }}>
            {totalGames} {de ? 'Spiele insgesamt' : 'total games'}
          </div>
        )}
        {realLeaderboard.slice(0, 5).map((entry, i) => {
          const sessionTeam = state.teams.find(t => t.name === entry.name);
          const teamColor = sessionTeam
            ? softTeamColor(sessionTeam.avatarId)
            : (i === 0 ? PALETTE.amberGlow : i === 1 ? '#CBD5E1' : i === 2 ? PALETTE.terracotta : '#94A3B8');
          return (
            <div key={entry.name} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0',
              borderBottom: i < Math.min(realLeaderboard.length, 5) - 1 ? `1px solid ${PALETTE.cream}22` : 'none',
            }}>
              <span style={{
                fontFamily: F_HAND_CAPS,
                fontSize: 'clamp(26px, 3vw, 38px)', color: PALETTE.cream,
                width: 46, textAlign: 'center', flexShrink: 0,
              }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </span>
              {sessionTeam
                ? <PaintedAvatar slug={qqGetAvatar(sessionTeam.avatarId).slug}
                    size={48} color={teamColor} withGrain={false} />
                : <span style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: `${PALETTE.charcoal}99`, flexShrink: 0,
                  }} />}
              <span style={{
                flex: 1, fontFamily: F_HAND, fontWeight: 700,
                fontSize: 'clamp(20px, 2.4vw, 30px)', color: teamColor,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
              }}>{entry.name}</span>
              <span style={{
                padding: '4px 12px', borderRadius: 999,
                background: `${PALETTE.charcoal}99`, border: `1.5px solid ${teamColor}88`,
                fontFamily: F_HAND_CAPS,
                color: teamColor, fontWeight: 700,
                fontSize: 'clamp(15px, 1.7vw, 21px)',
                flexShrink: 0,
              }}>{entry.wins} {de ? 'Siege' : 'wins'}</span>
            </div>
          );
        })}
      </div>
    )});
  }

  // ── Panel 4: Records (höchster Score, knappstes Spiel, Win-Streak, schnellste Antwort) ──
  if (funStats) {
    const records: React.ReactNode[] = [];
    if (funStats.highestScore && funStats.highestScore.score > 0) {
      records.push(
        <div key="hs" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}>🔥</span>
          <div>
            <div style={{
              fontFamily: F_HAND_CAPS, fontWeight: 700,
              fontSize: 'clamp(20px, 2.4vw, 28px)', color: PALETTE.cream,
              letterSpacing: '0.06em',
            }}>{de ? 'Höchster Score' : 'Highest Score'}</div>
            <div style={{
              fontFamily: F_HAND, fontSize: 'clamp(18px, 2vw, 24px)',
              color: `${PALETTE.cream}aa`,
            }}>
              <strong style={{ color: PALETTE.amberGlow }}>{funStats.highestScore.teamName}</strong> — {funStats.highestScore.score} {de ? 'Punkte' : 'points'}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.closestGame && funStats.closestGame.gap > 0) {
      records.push(
        <div key="cg" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}>⚔️</span>
          <div>
            <div style={{
              fontFamily: F_HAND_CAPS, fontWeight: 700,
              fontSize: 'clamp(20px, 2.4vw, 28px)', color: PALETTE.cream,
              letterSpacing: '0.06em',
            }}>{de ? 'Knappster Sieg' : 'Closest Game'}</div>
            <div style={{
              fontFamily: F_HAND, fontSize: 'clamp(18px, 2vw, 24px)',
              color: `${PALETTE.cream}aa`,
            }}>
              {funStats.closestGame.teams[0]} vs {funStats.closestGame.teams[1]} — {de ? `nur ${funStats.closestGame.gap} Pkt.` : `only ${funStats.closestGame.gap} pts apart`}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.winStreak && funStats.winStreak.streak >= 2) {
      records.push(
        <div key="ws" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}>🔥</span>
          <div>
            <div style={{
              fontFamily: F_HAND_CAPS, fontWeight: 700,
              fontSize: 'clamp(20px, 2.4vw, 28px)', color: PALETTE.cream,
              letterSpacing: '0.06em',
            }}>{de ? 'Siegesserie' : 'Win Streak'}</div>
            <div style={{ fontFamily: F_HAND, fontSize: 'clamp(18px, 2vw, 24px)', color: `${PALETTE.cream}aa` }}>
              <strong style={{ color: PALETTE.amberGlow }}>{funStats.winStreak.teamName}</strong> — {funStats.winStreak.streak}× {de ? 'in Folge' : 'in a row'}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.fastestAnswer && funStats.fastestAnswer.ms >= 100) {
      const secs = (funStats.fastestAnswer.ms / 1000).toFixed(1);
      records.push(
        <div key="fa" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}>⚡</span>
          <div>
            <div style={{
              fontFamily: F_HAND_CAPS, fontWeight: 700,
              fontSize: 'clamp(20px, 2.4vw, 28px)', color: PALETTE.cream,
              letterSpacing: '0.06em',
            }}>{de ? 'Schnellste Antwort' : 'Fastest Answer'}</div>
            <div style={{ fontFamily: F_HAND, fontSize: 'clamp(18px, 2vw, 24px)', color: `${PALETTE.cream}aa` }}>
              <strong style={{ color: PALETTE.amberGlow }}>{funStats.fastestAnswer.teamName}</strong> — {secs}s {de ? 'Vorsprung' : 'ahead'}
            </div>
          </div>
        </div>
      );
    }
    if (records.length > 0) {
      panels.push({ key: 'records', node: (
        <div>
          {panelTitle('🏅', 'Rekorde', 'Records', PALETTE.amberGlow)}
          {records}
        </div>
      )});
    }
  }

  // ── Panel 5: Joker King ──
  if (funStats?.jokerKing && funStats.jokerKing.total >= 2) {
    panels.push({ key: 'jokerKing', node: (
      <div>
        {panelTitle('🃏', 'Joker-König', 'Joker King', '#A855F7')}
        {teamLine(funStats.jokerKing.teamName)}
        <div style={{ marginTop: 14 }}>
          {statPill(funStats.jokerKing.total, de ? 'Joker gesichert' : 'jokers earned', '#A855F7')}
        </div>
      </div>
    )});
  }

  // ── Panel 6: Comeback King ──
  if (funStats?.comebackKing && funStats.comebackKing.total >= 1) {
    panels.push({ key: 'comebackKing', node: (
      <div>
        {panelTitle('🦅', 'Comeback-King', 'Comeback King', '#38BDF8')}
        {teamLine(funStats.comebackKing.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {statPill(funStats.comebackKing.total, de ? 'Aufholsiege' : 'comeback wins', '#38BDF8')}
          <span style={{
            color: `${PALETTE.cream}aa`, fontFamily: F_BODY,
            fontSize: 'clamp(15px, 1.7vw, 20px)', fontStyle: 'italic',
          }}>
            {de ? 'vom Letzten zum Gewinner' : 'from last place to winner'}
          </span>
        </div>
      </div>
    )});
  }

  // ── Panel 7: Steal Master ──
  if (funStats?.stealMaster && funStats.stealMaster.total >= 2) {
    panels.push({ key: 'stealMaster', node: (
      <div>
        {panelTitle('🗡️', 'Steal-Master', 'Steal Master', CAT_ACCENT.BUNTE_TUETE)}
        {teamLine(funStats.stealMaster.teamName)}
        <div style={{ marginTop: 14 }}>
          {statPill(funStats.stealMaster.total, de ? 'Felder geklaut' : 'cells stolen', CAT_ACCENT.BUNTE_TUETE)}
        </div>
      </div>
    )});
  }

  // ── Panel 8: Underdog ──
  if (funStats?.underdog) {
    panels.push({ key: 'underdog', node: (
      <div>
        {panelTitle('🐺', 'Underdog', 'Underdog', '#22D3EE')}
        {teamLine(funStats.underdog.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {statPill(funStats.underdog.wins, de ? 'Siege' : 'wins', '#22D3EE')}
          {statPill(funStats.underdog.games, de ? 'Spiele' : 'games', '#64748B')}
          <span style={{
            color: `${PALETTE.cream}aa`, fontFamily: F_BODY,
            fontSize: 'clamp(14px, 1.6vw, 18px)', alignSelf: 'center', fontStyle: 'italic',
          }}>
            {de ? 'frisch & gefährlich' : 'fresh & dangerous'}
          </span>
        </div>
      </div>
    )});
  }

  // ── Panel 9: Category Masters ──
  if (funStats?.categoryMasters && funStats.categoryMasters.length > 0) {
    panels.push({ key: 'catMasters', node: (
      <div>
        {panelTitle('👑', 'Kategorie-Meister', 'Category Masters', PALETTE.amberGlow)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {funStats.categoryMasters.map((cm, i) => {
            const meta = PAUSE_CAT_META[cm.category] ?? { color: PALETTE.amberGlow, emoji: '🎯', label: cm.category };
            const team = state.teams.find(t => t.name === cm.teamName);
            const teamColor = team ? softTeamColor(team.avatarId) : meta.color;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
                borderRadius: 16, background: `${meta.color}1f`,
                border: `1.5px solid ${meta.color}66`,
              }}>
                <span style={{ fontSize: 'clamp(28px, 3vw, 40px)', lineHeight: 1 }}>{meta.emoji}</span>
                {team && (
                  <PaintedAvatar slug={qqGetAvatar(team.avatarId).slug} size={44} color={teamColor} withGrain={false} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: F_HAND, fontWeight: 700,
                    fontSize: 'clamp(18px, 2vw, 26px)', color: teamColor,
                  }}>{cm.teamName}</div>
                  <div style={{
                    fontFamily: F_HAND_CAPS, fontWeight: 700,
                    fontSize: 'clamp(13px, 1.4vw, 18px)', color: meta.color,
                    letterSpacing: '0.08em',
                  }}>{meta.label}</div>
                </div>
                {statPill(cm.count, de ? 'richtig' : 'correct', meta.color)}
              </div>
            );
          })}
        </div>
      </div>
    )});
  }

  // ── Panel 10: Perfect Rounds ──
  if (funStats?.perfectRounds && funStats.perfectRounds.length > 0) {
    panels.push({ key: 'perfectRounds', node: (
      <div>
        {panelTitle('💯', 'Perfekte Runden', 'Perfect Rounds', '#22C55E')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {funStats.perfectRounds.slice(0, 5).map((pr, i) => {
            const team = state.teams.find(t => t.name === pr.teamName);
            const teamColor = team ? softTeamColor(team.avatarId) : '#22C55E';
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px',
                borderRadius: 14, background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.35)',
              }}>
                <span style={{ fontSize: 'clamp(24px, 2.6vw, 34px)' }}>✨</span>
                {team && <PaintedAvatar slug={qqGetAvatar(team.avatarId).slug} size={42} color={teamColor} withGrain={false} />}
                <span style={{
                  fontFamily: F_HAND, fontWeight: 700,
                  fontSize: 'clamp(18px, 2vw, 26px)', color: teamColor,
                }}>{pr.teamName}</span>
                {pr.draftTitle && (
                  <span style={{
                    marginLeft: 'auto', color: `${PALETTE.cream}88`,
                    fontFamily: F_BODY, fontSize: 'clamp(13px, 1.5vw, 18px)', fontStyle: 'italic',
                  }}>„{pr.draftTitle}"</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )});
  }

  // ── Panel 11: Speed Demon ──
  if (funStats?.speedDemon && funStats.speedDemon.samples >= 5) {
    panels.push({ key: 'speedDemon', node: (
      <div>
        {panelTitle('⚡', 'Schnellste Hand', 'Speed Demon', '#FACC15')}
        {teamLine(funStats.speedDemon.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {statPill(funStats.speedDemon.avgRank.toFixed(2), de ? 'Ø Rang' : 'avg rank', '#FACC15')}
          <span style={{
            color: `${PALETTE.cream}aa`, fontFamily: F_BODY,
            fontSize: 'clamp(15px, 1.7vw, 20px)', fontStyle: 'italic',
          }}>
            {de ? `bei ${funStats.speedDemon.samples} Treffern` : `over ${funStats.speedDemon.samples} hits`}
          </span>
        </div>
      </div>
    )});
  }

  // ── Panel 12: Funny Answers ──
  if (funStats?.funnyAnswers && funStats.funnyAnswers.length > 0) {
    panels.push({ key: 'funny', node: (
      <div>
        {panelTitle('😄', 'Lustige Antworten', 'Funny Answers', PALETTE.terracotta)}
        {funStats.funnyAnswers.map((fa, i) => (
          <div key={i} style={{
            padding: '12px 0',
            borderBottom: i < funStats.funnyAnswers.length - 1 ? `1px solid ${PALETTE.cream}22` : 'none',
          }}>
            <div style={{
              fontFamily: F_HAND, fontWeight: 700,
              fontSize: 'clamp(22px, 2.6vw, 30px)', color: PALETTE.amberGlow,
            }}>„{fa.text}"</div>
            <div style={{
              fontFamily: F_BODY, fontSize: 'clamp(16px, 1.8vw, 22px)',
              color: `${PALETTE.cream}88`, marginTop: 4, fontStyle: 'italic',
            }}>— {fa.teamName}</div>
          </div>
        ))}
      </div>
    )});
  }

  // ── Rotation alle 8s ──
  const [panelIdx, setPanelIdx] = useState(0);
  useEffect(() => {
    if (panels.length <= 1) return;
    const id = setInterval(() => setPanelIdx(p => (p + 1) % panels.length), 8000);
    return () => clearInterval(id);
  }, [panels.length]);

  const activePanel = panels[panelIdx % Math.max(panels.length, 1)];

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <PhaseBackdrop phase="paused" />
      </div>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 64px', position: 'relative', overflow: 'hidden', zIndex: 5,
        gap: 32,
      }}>
        {/* Title mit Glow-Pulse */}
        <div style={{
          fontFamily: F_HAND_CAPS,
          fontSize: 'clamp(28px, 3.2vw, 48px)', fontWeight: 700,
          color: modeAccent,
          display: 'flex', alignItems: 'center', gap: 14,
          animation: 'gTwinkle 3s ease-in-out infinite',
          textShadow: `0 0 24px ${modeAccent}66, 0 0 48px ${modeAccent}33`,
          letterSpacing: '0.04em',
        }}>
          ⏸ {de ? 'Kurze Pause' : 'Short Break'}
        </div>

        {/* Active Panel — PaperCard mit Slide-In */}
        {activePanel && (
          <div style={{ width: '100%', maxWidth: 900, position: 'relative' }}>
            <PaperCard
              washColor={`${PALETTE.dusk}cc` as any}
              padding="clamp(28px, 3.5vw, 48px)"
              style={{
                animation: 'gFadeIn 0.55s cubic-bezier(0.22,1,0.36,1) both',
              }}
            >
              {/* Akzent-Streifen oben */}
              <div style={{
                position: 'absolute', top: 0, left: 12, right: 12, height: 3,
                background: `linear-gradient(90deg, transparent, ${modeAccent}, transparent)`,
                borderRadius: 2,
              }} />
              <div key={activePanel.key} style={{
                animation: 'gFadeIn 0.55s cubic-bezier(0.22,1,0.36,1) both',
              }}>
                {activePanel.node}
              </div>
            </PaperCard>
            {panels.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 18 }}>
                {panels.map((_, i) => (
                  <div key={i} style={{
                    width: i === panelIdx % panels.length ? 22 : 10, height: 10,
                    borderRadius: 999,
                    background: i === panelIdx % panels.length ? modeAccent : `${PALETTE.cream}33`,
                    transition: 'all 0.3s',
                  }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hint */}
        <div style={{
          fontFamily: F_BODY, fontSize: 'clamp(16px, 1.8vw, 24px)',
          color: `${PALETTE.cream}88`, fontStyle: 'italic',
          letterSpacing: '0.03em',
        }}>
          {de ? 'Gleich geht’s weiter…' : 'Continuing soon…'}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// THANKS — Danke-Folie mit QR zur Team-Summary
// ─────────────────────────────────────────────────────────────────────────

function ThanksView({ de }: { de: boolean }) {
  const summaryUrl = `${window.location.origin}/team`;
  return (
    <CenterArea>
      <PaperCard washColor={PALETTE.cream} padding="clamp(32px, 5vh, 64px)" style={{ maxWidth: 900, width: '92%', textAlign: 'center' }}>
        <div style={{ marginBottom: 12 }}>
          <BlockCapsHeading size="xl" color={PALETTE.terracotta} glow>
            {de ? 'Danke' : 'Thank you'}
          </BlockCapsHeading>
        </div>
        <div style={{
          fontFamily: F_HAND, fontSize: 'min(5vh, 3.6vw)', color: PALETTE.inkDeep,
          fontWeight: 700, lineHeight: 1.05, marginBottom: 24,
        }}>
          {de ? 'für’s Mitspielen!' : 'for playing!'}
        </div>
        <div style={{
          background: '#fff', borderRadius: 18, padding: 18,
          display: 'inline-block',
          boxShadow: '0 12px 32px rgba(31,58,95,0.25)',
        }}>
          <QRCodeSVG value={summaryUrl} size={220} bgColor="#fff" fgColor={PALETTE.inkDeep} level="M" />
        </div>
        <div style={{ marginTop: 18 }}>
          <BlockCapsHeading size="md" color={PALETTE.inkDeep}>
            {de ? 'eure Statistiken' : 'your stats'}
          </BlockCapsHeading>
        </div>
      </PaperCard>
    </CenterArea>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// GAME_OVER — Sieger-Page (atmosphärisch, wärmer Tag-Sky)
// ─────────────────────────────────────────────────────────────────────────

function GameOverView({ state, de }: { state: QQStateUpdate; de: boolean }) {
  const { w, h } = useViewportSize();
  // Ranking nach largestConnected, sonst totalCells
  const sorted = [...state.teams].sort((a, b) => {
    if (b.largestConnected !== a.largestConnected) return b.largestConnected - a.largestConnected;
    return b.totalCells - a.totalCells;
  });
  const winner = sorted[0];
  const others = sorted.slice(1, 4);

  if (!winner) return <PhasePlaceholderCard state={state} de={de} />;

  const winnerColor = softTeamColor(winner.avatarId);
  const winnerSlug = qqGetAvatar(winner.avatarId).slug;
  const avatarSize = Math.round(Math.max(140, Math.min(h * 0.30, w * 0.20, 320)));

  return (
    <CenterArea>
      <div style={{ textAlign: 'center', animation: 'gFadeIn 1.2s ease-out both' }}>
        <div style={{ marginBottom: 18 }}>
          <BlockCapsHeading size="lg" color={PALETTE.terracotta}>
            {de ? 'Sieger' : 'Winner'}
          </BlockCapsHeading>
        </div>
        <div style={{
          display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 18,
          padding: '32px 48px', borderRadius: 36,
          background: `${PALETTE.cream}f5`,
          border: `4px solid ${winnerColor}`,
          boxShadow: `0 24px 60px rgba(31,58,95,0.25), 0 0 80px ${winnerColor}66`,
          filter: 'url(#paintFrame)',
        }}>
          <div style={{ filter: 'url(#warmGlow)' }}>
            <PaintedAvatar slug={winnerSlug} size={avatarSize} color={winnerColor} withGrain={false} />
          </div>
          <div style={{
            fontFamily: F_HAND, fontSize: 'min(8vh, 6vw)', color: winnerColor,
            fontWeight: 700, lineHeight: 1, textShadow: `0 4px 16px ${winnerColor}44`,
          }}>
            {winner.name}
          </div>
          <div style={{
            fontFamily: F_BODY, fontSize: 'min(2.4vh, 1.8vw)', color: PALETTE.inkSoft,
            fontStyle: 'italic',
          }}>
            {winner.largestConnected} {de ? 'zusammenhängende Felder' : 'connected fields'} · {winner.totalCells} {de ? 'gesamt' : 'total'}
          </div>
        </div>

        {others.length > 0 && (
          <div style={{
            marginTop: 36,
            display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap',
          }}>
            {others.map((t, i) => {
              const color = softTeamColor(t.avatarId);
              return (
                <div key={t.id} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  opacity: 0.85,
                }}>
                  <PaintedAvatar slug={qqGetAvatar(t.avatarId).slug} size={avatarSize * 0.45} color={color} withGrain={false} />
                  <div style={{
                    fontFamily: F_BODY, fontSize: 11, letterSpacing: '0.18em',
                    color: PALETTE.inkSoft, textTransform: 'uppercase',
                  }}>
                    #{i + 2}
                  </div>
                  <div style={{
                    fontFamily: F_HAND, fontSize: 'min(3vh, 2.2vw)',
                    color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1,
                  }}>
                    {t.name}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CenterArea>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Fallback für Phasen die noch nicht migriert sind
// ─────────────────────────────────────────────────────────────────────────

function PhasePlaceholderCard({ state, de }: { state: QQStateUpdate; de: boolean }) {
  const phaseLabel: Record<string, { de: string; en: string; sub: string; subEn: string }> = {
    QUESTION_ACTIVE: {
      de: 'Frage läuft', en: 'Question live',
      sub: 'Antworten kommen rein …', subEn: 'Answers coming in …',
    },
    QUESTION_REVEAL: {
      de: 'Auflösung', en: 'Reveal',
      sub: 'Wer war richtig?', subEn: 'Who was right?',
    },
    PLACEMENT: {
      de: 'Felder setzen', en: 'Placement',
      sub: 'Das Gewinner-Team wählt …', subEn: 'Winner is choosing …',
    },
    TEAMS_REVEAL: {
      de: 'Teams werden vorgestellt', en: 'Teams reveal',
      sub: 'Eine letzte Vorstellung vor dem Spiel.', subEn: 'One last intro before the game.',
    },
    COMEBACK_CHOICE: {
      de: 'Comeback-Chance', en: 'Comeback chance',
      sub: 'Das letzte Team darf zurückschlagen.', subEn: 'The last team gets a chance to come back.',
    },
  };
  const p = phaseLabel[state.phase] ?? { de: state.phase, en: state.phase, sub: '', subEn: '' };
  return (
    <CenterArea>
      <PaperCard washColor={PALETTE.cream} padding="clamp(28px, 4vh, 48px)" style={{ maxWidth: 720, width: '90%', textAlign: 'center' }}>
        <div style={{ marginBottom: 16 }}>
          <BlockCapsHeading size="lg" color={PALETTE.terracotta} glow>
            {de ? p.de : p.en}
          </BlockCapsHeading>
        </div>
        <div style={{
          fontFamily: F_BODY, fontSize: 'min(2.2vh, 1.6vw)',
          color: PALETTE.inkSoft, fontStyle: 'italic', lineHeight: 1.6,
        }}>
          {de ? p.sub : p.subEn}
        </div>
        <div style={{
          marginTop: 22, padding: '10px 18px',
          display: 'inline-block', borderRadius: 999,
          background: `${PALETTE.ochre}26`, border: `1.5px dashed ${PALETTE.ochre}88`,
          fontFamily: F_BODY, fontSize: 12, color: PALETTE.inkDeep,
          letterSpacing: '0.06em',
        }}>
          {de
            ? 'Diese Phase wird gerade auf Aquarell migriert.'
            : 'This phase is being migrated to watercolor.'}
        </div>
      </PaperCard>
    </CenterArea>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CenterArea — flex-1 wrapper, zentriert Inhalt mittig auf der Page
// ─────────────────────────────────────────────────────────────────────────

function CenterArea({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', zIndex: 5, minHeight: 0,
    }}>
      {children}
    </div>
  );
}
