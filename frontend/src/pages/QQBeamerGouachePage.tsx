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

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQStateUpdate, QQTeam, qqGetAvatar,
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

  // Komplexe Phasen kommen in eigenen Folge-Items.
  return <PhasePlaceholderCard state={state} de={de} />;
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
