// QQ Lobby Gouache — erste echte parallele Live-Page im Aquarell-Stil.
//
// Bewusst KEIN Eingriff in QQBeamerPage / QQTeamPage / QQModeratorPage —
// diese Seite ist eine zweite Beamer-Lobby-Variante, die parallel auf
// dieselbe Room ('default') hört. Wer sich `/lobby-gouache` auf einen
// zweiten Beamer / Tab legt, sieht denselben Lobby-State im Bilderbuch-
// Look. Der echte Quiz-Pfad bleibt unberührt.
//
// Wenn die Page weiter wächst (z.B. mit Phase-Übergängen), werden die
// Teil-Views ausgegliedert — aktuell reicht eine Datei.

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQStateUpdate, QQTeam, qqGetAvatar, qqAvatarLabel,
} from '../../../shared/quarterQuizTypes';
import {
  PALETTE, F_HAND, F_BODY, softTeamColor,
  GouacheFilters, PaintedKeyframes, usePaintFonts,
  PaperCard,
  PaintedAvatar,
  PaintedBalloon, PaintedMoon, PaintedHills, PaintedStars, PaintedBird,
} from '../gouache';

const QQ_ROOM = 'default';

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function QQLobbyGouachePage() {
  usePaintFonts();
  const roomCode = QQ_ROOM;
  const { state, connected, emit } = useQQSocket(roomCode);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!connected) { setJoined(false); return; }
    if (joined) return;
    emit('qq:joinBeamer', { roomCode }).then(ack => { if (ack.ok) setJoined(true); });
  }, [connected, joined, emit, roomCode]);

  return (
    <div style={{
      minHeight: '100vh', width: '100vw',
      background: `linear-gradient(180deg, ${PALETTE.inkDeep} 0%, ${PALETTE.inkSoft} 55%, ${PALETTE.sage} 100%)`,
      position: 'relative', overflow: 'hidden',
      fontFamily: F_BODY, color: PALETTE.cream,
    }}>
      <GouacheFilters />
      <PaintedKeyframes />

      {/* Atmosphäre — Sterne, Mond, Vögel ganz unabhängig vom State */}
      <PaintedStars count={32} />
      <div style={{ position: 'absolute', top: 'clamp(28px, 5vh, 72px)', right: 'clamp(40px, 6vw, 110px)', zIndex: 2 }}>
        <PaintedMoon size={84} />
      </div>
      <PaintedBird x="14%" y="12%" size={28} />
      <PaintedBird x="62%" y="9%" size={22} />
      <PaintedBird x="86%" y="22%" size={26} />

      {/* Hügel ganz unten */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1, pointerEvents: 'none' }}>
        <PaintedHills width={2400} height={220} />
      </div>

      {/* Schwebende Heißluftballons in Team-Farben (entstehen real aus den joinenden Teams) */}
      <FloatingTeamBalloons teams={state?.teams ?? []} />

      {/* Header */}
      <Header connected={connected} state={state} />

      {/* Main content */}
      <main style={{
        position: 'relative', zIndex: 5,
        padding: 'clamp(8px, 1vh, 24px) clamp(20px, 3vw, 56px) clamp(30px, 5vh, 70px)',
        display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 2vh, 28px)',
      }}>
        {!state ? (
          <ConnectingPanel connected={connected} />
        ) : state.phase === 'LOBBY' && !state.setupDone ? (
          <PreGamePanel />
        ) : state.phase === 'LOBBY' ? (
          <LobbyPanel state={state} roomCode={roomCode} />
        ) : (
          <RunningPanel state={state} />
        )}
      </main>

      {/* Lab-Footer */}
      <LabFooter />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────

function Header({ connected, state }: { connected: boolean; state: QQStateUpdate | null }) {
  const teamCount = state?.teams.length ?? 0;
  return (
    <header style={{
      position: 'relative', zIndex: 5,
      padding: 'clamp(20px, 3vh, 40px) clamp(20px, 3vw, 56px) 0',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 24, flexWrap: 'wrap',
    }}>
      <div>
        <div style={{
          fontFamily: F_BODY, fontSize: 13, letterSpacing: '0.32em',
          color: PALETTE.cream, opacity: 0.78, textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          Heute Abend
        </div>
        <h1 style={{
          fontFamily: F_HAND, fontSize: 'clamp(56px, 9vw, 132px)',
          color: PALETTE.cream, lineHeight: 0.95, margin: 0, fontWeight: 700,
          textShadow: '0 6px 22px rgba(0,0,0,0.45)',
          letterSpacing: '-0.01em',
        }}>
          CozyQuiz
        </h1>
        <div style={{
          fontFamily: F_HAND, fontSize: 'clamp(22px, 2.6vw, 40px)',
          color: PALETTE.sageLight, marginTop: 8,
          fontStyle: 'italic', opacity: 0.92,
        }}>
          Beim Schein der Laternen
        </div>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      }}>
        <ConnectionPill connected={connected} />
        {state && (
          <div style={{
            padding: '6px 14px', borderRadius: 999,
            background: `${PALETTE.cream}22`,
            border: `1px solid ${PALETTE.cream}33`,
            fontFamily: F_BODY, fontSize: 13, color: PALETTE.cream,
            letterSpacing: '0.06em',
          }}>
            {teamCount} {teamCount === 1 ? 'Team' : 'Teams'} · {state.phase}
          </div>
        )}
      </div>
    </header>
  );
}

function ConnectionPill({ connected }: { connected: boolean }) {
  const color = connected ? PALETTE.sageLight : PALETTE.terracotta;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '6px 14px', borderRadius: 999,
      background: `${color}22`,
      border: `1px solid ${color}66`,
      fontFamily: F_BODY, fontSize: 13, color: PALETTE.cream,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: color,
        boxShadow: `0 0 10px ${color}`,
        animation: connected ? 'gTwinkle 2.4s ease-in-out infinite' : 'none',
      }} />
      {connected ? 'Verbunden' : 'Verbinde …'}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Connecting / Pre-Game / Running Panels
// ─────────────────────────────────────────────────────────────────────────────

function ConnectingPanel({ connected }: { connected: boolean }) {
  return (
    <PaperCard washColor={PALETTE.cream} padding="clamp(28px, 4vh, 48px)" style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: F_HAND, fontSize: 'clamp(36px, 4.4vw, 56px)', color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.05 }}>
          {connected ? 'Lade Lobby …' : 'Suche Verbindung …'}
        </div>
        <div style={{ fontFamily: F_BODY, fontSize: 16, color: PALETTE.inkSoft, marginTop: 14, fontStyle: 'italic' }}>
          Wenn das Backend frisch aufwacht, dauert das einen Moment. Render
          legt die Server in der Pause schlafen.
        </div>
      </div>
    </PaperCard>
  );
}

function PreGamePanel() {
  return (
    <PaperCard washColor={PALETTE.cream} padding="clamp(28px, 4vh, 48px)" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: F_BODY, fontSize: 12, letterSpacing: '0.24em',
          color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
        }}>
          Vor dem Spiel
        </div>
        <div style={{
          fontFamily: F_HAND, fontSize: 'clamp(40px, 5vw, 68px)', color: PALETTE.inkDeep,
          fontWeight: 700, lineHeight: 1.05, marginTop: 8,
        }}>
          Bald geht's los …
        </div>
        <div style={{
          fontFamily: F_BODY, fontSize: 'clamp(15px, 1.4vw, 18px)',
          color: PALETTE.inkSoft, marginTop: 18, lineHeight: 1.65,
          maxWidth: 540, margin: '18px auto 0', fontStyle: 'italic',
        }}>
          Der Moderator richtet gerade das Quiz ein. Sobald die Lobby geöffnet
          ist, erscheint hier der QR-Code zum Beitreten.
        </div>
      </div>
    </PaperCard>
  );
}

function RunningPanel({ state }: { state: QQStateUpdate }) {
  return (
    <PaperCard washColor={PALETTE.cream} padding="clamp(28px, 4vh, 48px)" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: F_BODY, fontSize: 12, letterSpacing: '0.24em',
          color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
        }}>
          Läuft gerade
        </div>
        <div style={{
          fontFamily: F_HAND, fontSize: 'clamp(40px, 5vw, 64px)', color: PALETTE.inkDeep,
          fontWeight: 700, lineHeight: 1.05, marginTop: 8,
        }}>
          Das Spiel ist im Gange
        </div>
        <div style={{
          fontFamily: F_BODY, fontSize: 'clamp(15px, 1.4vw, 18px)',
          color: PALETTE.inkSoft, marginTop: 18, lineHeight: 1.65,
          maxWidth: 540, margin: '18px auto 0', fontStyle: 'italic',
        }}>
          Diese Aquarell-Lobby zeigt nur den Welcome-Screen. Die Quiz-Phasen
          laufen aktuell auf <code>/beamer</code> im klassischen Cozy-Dark-Stil
          weiter — Phase: <strong style={{ color: PALETTE.terracotta }}>{state.phase}</strong>.
        </div>
      </div>
    </PaperCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lobby Panel — QR + Team-Liste
// ─────────────────────────────────────────────────────────────────────────────

function LobbyPanel({ state, roomCode }: { state: QQStateUpdate; roomCode: string }) {
  const joinUrl = `${window.location.origin}/team`;
  const teams = state.teams;
  const teamCount = teams.length;
  const connectedCount = teams.filter(t => t.connected).length;

  // Wave-Animation: frisch dazugekommene Teams kriegen Glow + 👋
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [waveIds, setWaveIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const curIds = new Set(teams.map(t => t.id));
    const prev = prevIdsRef.current;
    const fresh: string[] = [];
    for (const id of curIds) if (!prev.has(id)) fresh.push(id);
    prevIdsRef.current = curIds;
    if (fresh.length > 0 && prev.size > 0) {
      setWaveIds(new Set(fresh));
      const t = setTimeout(() => setWaveIds(new Set()), 1600);
      return () => clearTimeout(t);
    }
  }, [teams]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(260px, 380px) 1fr',
      gap: 'clamp(20px, 3vw, 44px)',
      alignItems: 'start',
      maxWidth: 1320, margin: '0 auto', width: '100%',
    }}>
      {/* QR-Card */}
      <QrCard joinUrl={joinUrl} roomCode={roomCode} />

      {/* Teams-Card */}
      <PaperCard washColor={PALETTE.cream} padding="clamp(20px, 2.4vh, 32px)" style={{ minHeight: 320 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 18, flexWrap: 'wrap', gap: 8,
        }}>
          <div>
            <div style={{
              fontFamily: F_BODY, fontSize: 12, letterSpacing: '0.22em',
              color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
            }}>
              Heute am Tisch
            </div>
            <div style={{
              fontFamily: F_HAND, fontSize: 'clamp(28px, 3.2vw, 44px)',
              color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1, marginTop: 4,
            }}>
              {teamCount} {teamCount === 1 ? 'Team' : 'Teams'}
            </div>
          </div>
          <StatusChip teamCount={teamCount} connectedCount={connectedCount} />
        </div>

        {teamCount === 0 ? (
          <EmptyTeamsHint />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
            gap: 'clamp(10px, 1.4vw, 16px)',
          }}>
            {teams.map((t, i) => (
              <TeamCard key={t.id} team={t} fresh={waveIds.has(t.id)} delayIndex={i} />
            ))}
          </div>
        )}
      </PaperCard>
    </div>
  );
}

function QrCard({ joinUrl, roomCode }: { joinUrl: string; roomCode: string }) {
  return (
    <PaperCard washColor={PALETTE.cream} padding="clamp(18px, 2.2vh, 28px)" style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: F_BODY, fontSize: 11, letterSpacing: '0.24em',
        color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        Mitspielen
      </div>
      <div style={{
        background: '#fff', borderRadius: 14,
        padding: 'clamp(10px, 1.5vh, 18px)',
        boxShadow: '0 8px 24px rgba(31,58,95,0.18), 0 0 0 1px rgba(31,58,95,0.06)',
        margin: '0 auto', display: 'inline-block',
        animation: 'gFloat 5.2s ease-in-out infinite',
      }}>
        <QRCodeSVG
          value={joinUrl}
          size={220}
          bgColor="#ffffff"
          fgColor={PALETTE.inkDeep}
          level="M"
          style={{ display: 'block' }}
        />
      </div>
      <div style={{
        fontFamily: F_HAND, fontSize: 'clamp(28px, 3vw, 40px)',
        color: PALETTE.inkDeep, marginTop: 14, lineHeight: 1, fontWeight: 700,
      }}>
        Code scannen
      </div>
      <div style={{
        fontFamily: F_BODY, fontSize: 13, color: PALETTE.inkSoft,
        marginTop: 6, fontStyle: 'italic',
      }}>
        oder direkt im Browser öffnen
      </div>
      <div style={{
        marginTop: 12, padding: '6px 14px',
        display: 'inline-block', borderRadius: 999,
        background: `${PALETTE.sage}26`,
        border: `1px dashed ${PALETTE.sage}88`,
        fontFamily: 'ui-monospace, "SFMono-Regular", monospace',
        fontSize: 13, color: PALETTE.inkDeep, letterSpacing: '0.04em',
      }}>
        {joinUrl.replace(/^https?:\/\//, '')}
      </div>
      <div style={{
        marginTop: 10, fontFamily: F_BODY, fontSize: 11,
        color: PALETTE.inkSoft, opacity: 0.65, letterSpacing: '0.08em',
      }}>
        Raum: {roomCode}
      </div>
    </PaperCard>
  );
}

function StatusChip({ teamCount, connectedCount }: { teamCount: number; connectedCount: number }) {
  let label: string;
  let color: string;
  if (teamCount === 0) {
    label = 'Warte auf Teams …';
    color = PALETTE.terracotta;
  } else if (teamCount === 1) {
    label = 'Noch ein Team fehlt';
    color = PALETTE.terracotta;
  } else if (connectedCount < teamCount) {
    label = `${connectedCount} / ${teamCount} bereit`;
    color = PALETTE.ochre;
  } else if (teamCount >= 5) {
    label = `${teamCount} sind dabei!`;
    color = PALETTE.sage;
  } else {
    label = 'Gleich geht’s los';
    color = PALETTE.sage;
  }
  return (
    <div style={{
      padding: '6px 14px', borderRadius: 999,
      background: `${color}1f`,
      border: `1.5px solid ${color}88`,
      fontFamily: F_HAND, fontSize: 22, color,
      fontWeight: 700, lineHeight: 1.1,
      animation: teamCount >= 2 && connectedCount === teamCount ? 'gTwinkle 2.4s ease-in-out infinite' : 'none',
    }}>
      {label}
    </div>
  );
}

function EmptyTeamsHint() {
  return (
    <div style={{
      padding: 'clamp(28px, 4vh, 48px) 24px',
      borderRadius: 14,
      border: `1.5px dashed ${PALETTE.inkSoft}66`,
      textAlign: 'center',
      background: `${PALETTE.cream}40`,
    }}>
      <div style={{ fontFamily: F_HAND, fontSize: 'clamp(28px, 3vw, 42px)', color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.1 }}>
        Noch niemand am Tisch.
      </div>
      <div style={{ fontFamily: F_BODY, fontSize: 15, color: PALETTE.inkSoft, marginTop: 10, fontStyle: 'italic' }}>
        Sobald jemand den QR scannt, taucht hier die erste Karte auf.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TeamCard
// ─────────────────────────────────────────────────────────────────────────────

function TeamCard({ team, fresh, delayIndex }: { team: QQTeam; fresh: boolean; delayIndex: number }) {
  const slug = qqGetAvatar(team.avatarId).slug;
  const animal = qqAvatarLabel(team.avatarId, 'de');
  const ringColor = softTeamColor(team.avatarId, PALETTE.terracotta);
  return (
    <div style={{
      position: 'relative',
      padding: '14px 16px',
      borderRadius: 14,
      background: `${PALETTE.cream}f0`,
      border: `1.5px solid ${ringColor}55`,
      boxShadow: fresh
        ? `0 14px 28px rgba(31,58,95,0.18), 0 0 0 3px ${ringColor}55, 0 0 32px ${ringColor}66`
        : `0 8px 18px rgba(31,58,95,0.12)`,
      display: 'flex', alignItems: 'center', gap: 14,
      animation: fresh
        ? 'lobbyGouacheJoin 1.2s cubic-bezier(0.34,1.56,0.64,1) both'
        : `gFadeIn 0.55s ease-out ${0.2 + delayIndex * 0.05}s both`,
      transition: 'box-shadow 0.5s ease, border-color 0.5s ease',
    }}>
      <PaintedAvatar slug={slug} size={64} color={ringColor} withGrain={false} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: F_HAND, fontSize: 'clamp(22px, 2.2vw, 28px)',
          color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }} title={team.name}>
          {team.name}
        </div>
        <div style={{
          fontFamily: F_BODY, fontSize: 12, color: PALETTE.inkSoft,
          marginTop: 4, letterSpacing: '0.04em', fontStyle: 'italic',
        }}>
          {animal} · {team.connected ? 'bereit' : 'offline'}
        </div>
      </div>
      {fresh && (
        <span aria-hidden style={{
          position: 'absolute', top: -14, right: -8, fontSize: 28, lineHeight: 1,
          animation: 'lobbyGouacheWave 1.1s cubic-bezier(0.34,1.5,0.64,1) both',
          filter: `drop-shadow(0 0 8px ${ringColor}cc)`,
        }}>👋</span>
      )}
      {/* Status-Punkt */}
      <span style={{
        width: 10, height: 10, borderRadius: '50%',
        background: team.connected ? PALETTE.sage : `${PALETTE.inkSoft}55`,
        boxShadow: team.connected ? `0 0 10px ${PALETTE.sage}cc` : 'none',
        flexShrink: 0,
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating Balloons — pro joinendem Team ein Ballon in dessen Hoodie-Farbe
// ─────────────────────────────────────────────────────────────────────────────

const BALLOON_SLOTS: Array<{ left: string; top: string; size: number; delay: string }> = [
  { left: '6%',  top: '22%', size: 64, delay: '0s'   },
  { left: '88%', top: '34%', size: 58, delay: '1.4s' },
  { left: '18%', top: '52%', size: 48, delay: '0.8s' },
  { left: '74%', top: '18%', size: 52, delay: '2.1s' },
  { left: '40%', top: '60%', size: 44, delay: '1.1s' },
  { left: '56%', top: '14%', size: 50, delay: '0.4s' },
  { left: '28%', top: '32%', size: 40, delay: '1.8s' },
  { left: '70%', top: '54%', size: 46, delay: '2.6s' },
];

function FloatingTeamBalloons({ teams }: { teams: QQTeam[] }) {
  const slots = teams.slice(0, BALLOON_SLOTS.length);
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
      {slots.map((t, i) => {
        const slot = BALLOON_SLOTS[i];
        const color = softTeamColor(t.avatarId, PALETTE.terracotta);
        return (
          <div key={t.id} style={{
            position: 'absolute', left: slot.left, top: slot.top,
            opacity: 0.85,
            animationDelay: slot.delay,
          }}>
            <PaintedBalloon color={color} size={slot.size} />
          </div>
        );
      })}
      {/* Wenn keine Teams da sind, zeigen wir 3 sanfte Default-Ballons als
          Atmosphäre — verschwinden sobald das erste Team joint. */}
      {slots.length === 0 && (
        <>
          <div style={{ position: 'absolute', left: '12%', top: '28%', opacity: 0.7 }}>
            <PaintedBalloon color={PALETTE.terracotta} size={62} />
          </div>
          <div style={{ position: 'absolute', right: '14%', top: '42%', opacity: 0.7 }}>
            <PaintedBalloon color={PALETTE.ochre} size={50} />
          </div>
          <div style={{ position: 'absolute', left: '48%', top: '58%', opacity: 0.65 }}>
            <PaintedBalloon color={PALETTE.sageLight} size={44} />
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lab-Footer
// ─────────────────────────────────────────────────────────────────────────────

function LabFooter() {
  return (
    <footer style={{
      position: 'relative', zIndex: 5,
      padding: '20px clamp(20px, 3vw, 56px) 28px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: 16, flexWrap: 'wrap',
    }}>
      <div style={{
        fontFamily: F_BODY, fontSize: 12, color: `${PALETTE.cream}aa`,
        letterSpacing: '0.08em',
      }}>
        Aquarell-Lab · läuft parallel zum klassischen <code>/beamer</code>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Link to="/gouache" style={lobbyLinkStyle}>← Stilstudie</Link>
        <Link to="/beamer" style={lobbyLinkStyle}>Cozy-Beamer →</Link>
      </div>
      {/* Page-spezifische Animationen, falls die Globals woanders konkurrieren */}
      <style>{`
        @keyframes lobbyGouacheJoin {
          0%   { transform: translateY(8px) scale(0.94); opacity: 0; }
          55%  { transform: translateY(-2px) scale(1.04); opacity: 1; }
          100% { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        @keyframes lobbyGouacheWave {
          0%   { transform: translateY(6px) rotate(-12deg) scale(0.6); opacity: 0; }
          40%  { transform: translateY(-4px) rotate(8deg)  scale(1.1); opacity: 1; }
          100% { transform: translateY(0)   rotate(0)      scale(1);   opacity: 1; }
        }
      `}</style>
    </footer>
  );
}

const lobbyLinkStyle: React.CSSProperties = {
  fontFamily: F_BODY, fontSize: 13,
  padding: '6px 14px', borderRadius: 999,
  background: `${PALETTE.cream}1a`,
  border: `1px solid ${PALETTE.cream}33`,
  color: PALETTE.cream, textDecoration: 'none',
  letterSpacing: '0.04em',
};
