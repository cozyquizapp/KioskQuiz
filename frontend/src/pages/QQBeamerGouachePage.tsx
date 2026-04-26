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

import { useEffect, useMemo, useState } from 'react';
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

  if (phase === 'PLACEMENT')    return <PlacementView state={state} de={de} />;
  if (phase === 'TEAMS_REVEAL') return <TeamsRevealView state={state} de={de} />;

  // COMEBACK_CHOICE folgt in eigenem Item.
  return <PhasePlaceholderCard state={state} de={de} />;
}

// ─────────────────────────────────────────────────────────────────────────
// TEAMS_REVEAL — gestaffelte Vorstellung mit Outro „Viel Glück"
// Anchor: state.teamsRevealStartedAt; pro Team 900ms Delay.
// ─────────────────────────────────────────────────────────────────────────

function TeamsRevealView({ state, de }: { state: QQStateUpdate; de: boolean }) {
  const { w: vw, h: vh } = useViewportSize();
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

  // Avatar-Größe je nach Teamzahl + Viewport
  const avatarSize = Math.round(Math.max(80, Math.min(vh * 0.20, vw * 0.10, 200)));

  return (
    <CenterArea>
      <div style={{ textAlign: 'center', width: '100%' }}>
        {/* Title */}
        <div style={{
          opacity: elapsed >= 0 ? 1 : 0,
          transform: elapsed >= titleDur ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s ease-out',
          marginBottom: 36,
        }}>
          <BlockCapsHeading size="xl" color={PALETTE.cream} glow>
            {de ? 'Die Teams' : 'The Teams'}
          </BlockCapsHeading>
        </div>

        {/* Teams Stagger */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: 'clamp(16px, 2.5vw, 36px)',
        }}>
          {teams.map((t, i) => {
            const visible = i < revealedCount;
            const color = softTeamColor(t.avatarId);
            return (
              <div key={t.id} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.7)',
                transition: 'all 0.7s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
                <div style={{ filter: visible ? 'url(#warmGlow)' : undefined }}>
                  <PaintedAvatar
                    slug={qqGetAvatar(t.avatarId).slug}
                    size={avatarSize}
                    color={color}
                    withGrain={false}
                  />
                </div>
                <div style={{
                  fontFamily: F_HAND, fontSize: 'min(4.4vh, 3.4vw)',
                  color, fontWeight: 700, lineHeight: 1,
                  textShadow: `0 4px 14px ${color}66`,
                }}>
                  {t.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Outro: VIEL GLÜCK */}
        {showGoodLuck && (
          <div style={{
            marginTop: 56,
            animation: 'gFadeIn 0.8s ease-out both',
          }}>
            <BlockCapsHeading size="xl" color={PALETTE.amberGlow} glow>
              {de ? 'Viel Glück' : 'Good luck'}
            </BlockCapsHeading>
          </div>
        )}
      </div>
    </CenterArea>
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
// PLACEMENT — 2D-Aquarell-Grid mit Owner-Wäschen, Joker-Sterne, Frost,
// Stapel-Patches, Last-Placed-Pulse + Pending-Action-Header
// ─────────────────────────────────────────────────────────────────────────

function PlacementView({ state, de }: { state: QQStateUpdate; de: boolean }) {
  const { w: vw, h: vh } = useViewportSize();
  const grid = state.grid;
  const size = state.gridSize;

  // Cell-Dimensionen — Grid soll quadratisch in der verfügbaren Fläche bleiben.
  // Verfügbare Höhe ≈ 70vh (nach Header + Footer), Breite ≈ 70vw.
  const maxCellPx = Math.min(vh * 0.7, vw * 0.6) / size;
  const cellPx = Math.max(48, Math.floor(maxCellPx) - 6);

  const last = state.lastPlacedCell;
  const pendingTeam = state.pendingFor ? state.teams.find(t => t.id === state.pendingFor) : null;

  return (
    <>
      <PlacementHeader state={state} de={de} pendingTeam={pendingTeam} />
      <CenterArea>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, ${cellPx}px)`,
          gap: 6,
          padding: 16,
          borderRadius: 24,
          background: `${PALETTE.cream}1f`,
          border: `2px dashed ${PALETTE.cream}33`,
          filter: 'url(#paintFrame)',
        }}>
          {grid.flat().map(cell => {
            const isLast = last && last.row === cell.row && last.col === cell.col;
            return (
              <PlacementCell
                key={`${cell.row}-${cell.col}`}
                cell={cell}
                cellPx={cellPx}
                team={cell.ownerId ? state.teams.find(t => t.id === cell.ownerId) ?? null : null}
                lastPlaced={!!isLast}
                wasSteal={!!(isLast && last?.wasSteal)}
              />
            );
          })}
        </div>
      </CenterArea>
      <PlacementFooter state={state} de={de} />
    </>
  );
}

function PlacementHeader({
  state, de, pendingTeam,
}: { state: QQStateUpdate; de: boolean; pendingTeam: QQTeam | null }) {
  const action = state.pendingAction;
  const actionLabel = (() => {
    switch (action) {
      case 'PLACE_1':
      case 'PLACE_2': return de ? 'setzt ein Feld' : 'places a field';
      case 'STEAL_1': return de ? 'klaut ein Feld' : 'steals a field';
      case 'FREE':    return de ? 'wählt eine Aktion' : 'picks an action';
      case 'SANDUHR_1': return de ? 'bannt ein Feld' : 'locks a field';
      case 'SHIELD_1':  return de ? 'schützt ein Feld' : 'shields a field';
      case 'SWAP_1':    return de ? 'tauscht zwei Felder' : 'swaps two fields';
      case 'STAPEL_1':  return de ? 'stapelt ein Feld' : 'stacks a field';
      case 'COMEBACK':  return de ? 'startet das Comeback' : 'starts the comeback';
      default: return de ? 'ist am Zug' : 'is up';
    }
  })();
  if (!pendingTeam) {
    return (
      <header style={{ textAlign: 'center', flexShrink: 0, position: 'relative', zIndex: 5 }}>
        <BlockCapsHeading size="lg" color={PALETTE.cream}>
          {de ? 'Platzierung' : 'Placement'}
        </BlockCapsHeading>
      </header>
    );
  }
  const color = softTeamColor(pendingTeam.avatarId);
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
      flexShrink: 0, position: 'relative', zIndex: 5,
      animation: 'gFadeIn 0.5s ease-out both',
    }}>
      <div style={{ filter: 'url(#warmGlow)' }}>
        <PaintedAvatar slug={qqGetAvatar(pendingTeam.avatarId).slug} size={80} color={color} withGrain={false} />
      </div>
      <div>
        <div style={{
          fontFamily: F_HAND, fontSize: 'min(6vh, 4vw)', color, fontWeight: 700, lineHeight: 1,
          textShadow: `0 4px 12px ${color}44`,
        }}>
          {pendingTeam.name}
        </div>
        <BlockCapsHeading size="md" color={PALETTE.cream}>
          {actionLabel}
        </BlockCapsHeading>
      </div>
    </header>
  );
}

function PlacementFooter({ state, de }: { state: QQStateUpdate; de: boolean }) {
  // Mini-Standings unten — wer hat wie viele Felder
  const sorted = [...state.teams].sort((a, b) => b.totalCells - a.totalCells);
  return (
    <footer style={{
      display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10,
      flexShrink: 0, position: 'relative', zIndex: 5,
      padding: '0 12px',
    }}>
      {sorted.map(t => {
        const color = softTeamColor(t.avatarId);
        return (
          <div key={t.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '4px 10px', borderRadius: 999,
            background: `${PALETTE.cream}1f`,
            border: `1.5px solid ${color}88`,
          }}>
            <PaintedAvatar slug={qqGetAvatar(t.avatarId).slug} size={26} color={color} withGrain={false} />
            <span style={{
              fontFamily: F_HAND, fontSize: 'min(2.2vh, 1.6vw)',
              color: PALETTE.cream, fontWeight: 700,
            }} title={t.name}>
              {t.name.length > 10 ? t.name.slice(0, 9) + '…' : t.name}
            </span>
            <span style={{
              fontFamily: F_HAND_CAPS, fontSize: 'min(2vh, 1.5vw)',
              color, fontWeight: 700, letterSpacing: '0.06em',
            }}>
              {t.totalCells}
              {t.largestConnected > 1 && ` · ${t.largestConnected}`}
            </span>
          </div>
        );
      })}
      <div style={{
        padding: '4px 12px', borderRadius: 999,
        background: `${PALETTE.cream}11`,
        border: `1px dashed ${PALETTE.cream}33`,
        fontFamily: F_BODY, fontSize: 11,
        color: `${PALETTE.cream}aa`,
        letterSpacing: '0.08em',
      }}>
        {de ? 'gesamt · zusammenhängend' : 'total · connected'}
      </div>
    </footer>
  );
}

function PlacementCell({
  cell, cellPx, team, lastPlaced, wasSteal,
}: {
  cell: { row: number; col: number; ownerId: string | null;
         jokerFormed?: boolean; frozen?: boolean; stuck?: boolean;
         shielded?: boolean; sandLockTtl?: number };
  cellPx: number;
  team: QQTeam | null;
  lastPlaced: boolean;
  wasSteal: boolean;
}) {
  const color = team ? softTeamColor(team.avatarId) : null;
  const slug = team ? qqGetAvatar(team.avatarId).slug : null;
  const isLocked = (cell.sandLockTtl ?? 0) > 0;

  return (
    <div style={{
      width: cellPx, height: cellPx,
      borderRadius: 14,
      background: color ? `${color}33` : `${PALETTE.cream}d0`,
      border: color
        ? `3px solid ${cell.stuck ? color : color + 'aa'}`
        : `2px solid ${PALETTE.inkSoft}33`,
      boxShadow: lastPlaced && color
        ? `0 0 0 4px ${color}aa, 0 12px 32px ${color}99`
        : color ? `0 4px 12px ${color}33` : 'none',
      animation: lastPlaced ? 'cellSlamDown 0.7s cubic-bezier(0.34,1.56,0.64,1) both' : undefined,
      position: 'relative', overflow: 'hidden',
      filter: 'url(#watercolorEdge)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Owner Avatar */}
      {slug && color && (
        <div style={{
          width: cellPx * 0.62, height: cellPx * 0.62,
          borderRadius: '50%',
          backgroundImage: `url(/avatars/gouache/avatar-${slug}.png)`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          border: `2.5px solid ${color}`,
          boxShadow: `0 2px 6px ${color}66`,
          opacity: cell.frozen || isLocked ? 0.5 : 1,
        }} />
      )}
      {/* Joker indicator (Stern-Glow) */}
      {cell.jokerFormed && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          width: cellPx * 0.18, height: cellPx * 0.18,
          background: `radial-gradient(circle, ${PALETTE.amberGlow} 0%, ${PALETTE.amberGlow}00 70%)`,
          fontSize: cellPx * 0.22, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: PALETTE.amberGlow,
          textShadow: `0 0 8px ${PALETTE.amberGlow}`,
          fontFamily: F_HAND, fontWeight: 700,
        }}>★</div>
      )}
      {/* Stapel (stuck) — kleine Pin-Marke unten rechts */}
      {cell.stuck && (
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          padding: '2px 6px', borderRadius: 6,
          background: PALETTE.inkDeep, color: PALETTE.cream,
          fontFamily: F_HAND_CAPS, fontSize: cellPx * 0.16,
          letterSpacing: '0.06em',
        }}>×2</div>
      )}
      {/* Frozen (Schneeflocke) */}
      {cell.frozen && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(220,240,255,0.35)',
          backdropFilter: 'blur(1px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: cellPx * 0.4, color: '#9DCBFF',
        }}>❄</div>
      )}
      {/* SandLock (Sanduhr) */}
      {isLocked && (
        <div style={{
          position: 'absolute', top: 4, left: 4,
          fontSize: cellPx * 0.18,
          opacity: 0.85,
        }}>⏳</div>
      )}
      {/* Steal-Indikator: Wave-Glow auf last-placed das ein Steal war */}
      {lastPlaced && wasSteal && (
        <div aria-hidden style={{
          position: 'absolute', inset: -4, borderRadius: 18,
          border: `3px solid ${PALETTE.terracotta}`,
          animation: 'cellStealRing 1s ease-out forwards',
          pointerEvents: 'none',
        }} />
      )}
      {/* Lokale Animations-Keyframes */}
      <style>{`
        @keyframes cellSlamDown {
          0%   { transform: translateY(-50px) scale(0.6); opacity: 0; }
          55%  { transform: translateY(4px)   scale(1.08); opacity: 1; }
          80%  { transform: translateY(-2px)  scale(0.98); }
          100% { transform: translateY(0)     scale(1); opacity: 1; }
        }
        @keyframes cellStealRing {
          0%   { transform: scale(0.7); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
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
// RULES — kompakte Rules-Slide-Karte (Foundation-Version, später ausbauen)
// ─────────────────────────────────────────────────────────────────────────

function RulesView({ state, de }: { state: QQStateUpdate; de: boolean }) {
  const idx = Math.max(0, state.rulesSlideIndex ?? 0);
  return (
    <CenterArea>
      <PaperCard washColor={PALETTE.cream} padding="clamp(28px, 4vh, 56px)" style={{ maxWidth: 880, width: '90%', textAlign: 'center' }}>
        <div style={{
          fontFamily: F_BODY, fontSize: 14, letterSpacing: '0.24em',
          color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
          marginBottom: 14,
        }}>
          {de ? `Folie ${idx + 1}` : `Slide ${idx + 1}`}
        </div>
        <BlockCapsHeading size="xl" color={PALETTE.inkDeep}>
          {de ? 'Spielregeln' : 'Game Rules'}
        </BlockCapsHeading>
        <div style={{
          fontFamily: F_BODY, fontSize: 'min(2.4vh, 1.8vw)',
          color: PALETTE.inkSoft, marginTop: 26, fontStyle: 'italic',
          maxWidth: 620, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6,
        }}>
          {de
            ? 'Der Moderator führt durch die Regeln am Beamer. Schau gleich auf den großen Bildschirm.'
            : 'The moderator walks you through the rules on the main screen.'}
        </div>
      </PaperCard>
    </CenterArea>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PHASE_INTRO — „PHASE 2" Block-Caps-Pop
// ─────────────────────────────────────────────────────────────────────────

function PhaseIntroView({ state, de }: { state: QQStateUpdate; de: boolean }) {
  const phaseIdx = state.gamePhaseIndex ?? 1;
  return (
    <CenterArea>
      <div style={{ textAlign: 'center', animation: 'gFadeIn 0.6s ease-out both' }}>
        <div style={{
          fontFamily: F_BODY, fontSize: 'min(2vh, 1.6vw)', letterSpacing: '0.32em',
          color: PALETTE.amberGlow, fontWeight: 700, textTransform: 'uppercase',
          marginBottom: 18,
          textShadow: '0 2px 12px rgba(0,0,0,0.4)',
        }}>
          {de ? `Runde ${phaseIdx}` : `Round ${phaseIdx}`}
        </div>
        <div style={{ fontSize: 'min(18vh, 14vw)', lineHeight: 1, animation: 'gFloat 4s ease-in-out infinite' }}>
          <BlockCapsHeading size="xl" color={PALETTE.cream} glow>
            {phaseIdx === 1 ? (de ? 'Los geht’s' : 'Let’s go')
              : phaseIdx === 2 ? (de ? 'Klauen' : 'Steal')
              : phaseIdx === 3 ? (de ? 'Stapeln' : 'Stack')
              : (de ? 'Finale' : 'Final')}
          </BlockCapsHeading>
        </div>
      </div>
    </CenterArea>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PAUSED — kompakter Standings-View
// ─────────────────────────────────────────────────────────────────────────

function PausedView({ state, de }: { state: QQStateUpdate; de: boolean }) {
  const sorted = [...state.teams].sort((a, b) => b.totalCells - a.totalCells);
  return (
    <CenterArea>
      <PaperCard washColor={PALETTE.cream} padding="clamp(28px, 4vh, 56px)" style={{ maxWidth: 980, width: '92%', textAlign: 'center' }}>
        <div style={{ marginBottom: 10 }}>
          <BlockCapsHeading size="xl" color={PALETTE.terracotta} glow>
            {de ? 'Pause' : 'Break'}
          </BlockCapsHeading>
        </div>
        <div style={{ fontFamily: F_BODY, fontSize: 'min(2.2vh, 1.6vw)', color: PALETTE.inkSoft, fontStyle: 'italic', marginBottom: 28 }}>
          {de ? 'Aktueller Stand' : 'Current standings'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640, margin: '0 auto' }}>
          {sorted.map((t, i) => (
            <StandingsRow key={t.id} team={t} rank={i + 1} />
          ))}
        </div>
      </PaperCard>
    </CenterArea>
  );
}

function StandingsRow({ team, rank }: { team: QQTeam; rank: number }) {
  const color = softTeamColor(team.avatarId);
  const slug = qqGetAvatar(team.avatarId).slug;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'auto auto 1fr auto auto',
      alignItems: 'center', gap: 16,
      padding: '10px 18px', borderRadius: 14,
      background: rank === 1 ? `${color}1f` : `${PALETTE.cream}d0`,
      border: `2px solid ${rank === 1 ? color : color + '55'}`,
      boxShadow: rank === 1 ? `0 8px 24px ${color}33` : 'none',
    }}>
      <span style={{
        fontFamily: F_HAND, fontSize: 'min(3.4vh, 2.4vw)',
        color: rank === 1 ? color : PALETTE.inkDeep, fontWeight: 700,
        minWidth: 48, textAlign: 'center',
      }}>
        #{rank}
      </span>
      <PaintedAvatar slug={slug} size={56} color={color} withGrain={false} />
      <span style={{
        fontFamily: F_HAND, fontSize: 'min(3.2vh, 2.2vw)',
        color: PALETTE.inkDeep, fontWeight: 700, textAlign: 'left',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }} title={team.name}>
        {team.name}
      </span>
      <span style={{
        fontFamily: F_HAND, fontSize: 'min(3vh, 2.2vw)',
        color, fontWeight: 700,
      }}>
        {team.totalCells}
      </span>
      <span style={{
        fontFamily: F_BODY, fontSize: 12, color: PALETTE.inkSoft,
        letterSpacing: '0.06em',
      }}>
        Felder
      </span>
    </div>
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
