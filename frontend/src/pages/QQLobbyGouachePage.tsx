// QQ Lobby Gouache — parallele Aquarell-Variante der `/beamer`-Lobby.
//
// Layout/Komposition strikt nach `LobbyView` in QQBeamerPage.tsx (Original).
// Gouache wechselt nur den STIL (PaperCard/Painted-Components/Aquarell-
// Palette + Caveat/Lora), nicht die Anordnung — Wolf hat an der
// Original-Komposition wochenlang gefeilt, die bleibt 1:1.
//
// User-Overrides ggü. Original (siehe Conversation):
//   - Header: nur „CozyQuiz" mittig (kein „Heute Abend"-Sublabel,
//     kein Untertitel, keine Connection-Pill)
//   - Teams-Grid: dynamisch wachsend statt fest 2-spaltig
//       1-4 Teams = 1 Reihe (max 4 Spalten)
//       5-8 Teams = 4 Spalten × 2 Reihen
//   - Cards größer & Ringe in voller Teamfarbe (nicht 55-alpha) für
//     bessere Beamer-Sichtbarkeit
//   - Footer komplett weg
// Alles andere (CozyWolf-Branding, Statusmeldungen, Bilingual-Flip,
// Empty-Hint, Wave-Animation) wird vom Original übernommen.

import { useEffect, useRef, useState } from 'react';
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

  // Bilingual-Flip wie im Original (8s pro Sprache).
  const [de, setDe] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setDe(p => !p), 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: `linear-gradient(180deg, ${PALETTE.inkDeep} 0%, ${PALETTE.inkSoft} 55%, ${PALETTE.sage} 100%)`,
      position: 'relative', overflow: 'hidden',
      fontFamily: F_BODY, color: PALETTE.cream,
      display: 'flex', flexDirection: 'column',
      padding: 'clamp(16px, 2.5vh, 32px) clamp(24px, 3vw, 56px)',
      gap: 'clamp(10px, 1.5vh, 20px)',
    }}>
      <GouacheFilters />
      <PaintedKeyframes />

      {/* Atmosphäre — gemalter Nachthimmel */}
      <PaintedStars count={32} />
      <div style={{ position: 'absolute', top: 'clamp(40px, 6vh, 90px)', right: 'clamp(60px, 8vw, 140px)', zIndex: 2, pointerEvents: 'none' }}>
        <PaintedMoon size={80} />
      </div>
      <PaintedBird x="14%" y="14%" size={28} />
      <PaintedBird x="62%" y="9%" size={22} />
      <PaintedBird x="86%" y="22%" size={26} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1, pointerEvents: 'none' }}>
        <PaintedHills width={2400} height={220} />
      </div>
      <FloatingTeamBalloons teams={state?.teams ?? []} />

      {/* ── Top: Title (zentriert, sehr groß) ── */}
      <div style={{
        textAlign: 'center', position: 'relative', zIndex: 5, flexShrink: 0,
        paddingTop: 'clamp(4px, 0.6vh, 10px)',
      }}>
        <div style={{
          fontFamily: F_HAND,
          fontSize: 'clamp(96px, 13vw, 200px)', fontWeight: 700, lineHeight: 0.92,
          color: PALETTE.cream,
          letterSpacing: '-0.015em',
          textShadow: '0 8px 28px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)',
        }}>
          CozyQuiz
        </div>
      </div>

      {/* ── Center: 2-column layout — QR links, Teams rechts (Original-Struktur) ── */}
      {!state ? (
        <ConnectingPanel connected={connected} />
      ) : state.phase === 'LOBBY' && !state.setupDone ? (
        <PreGamePanel de={de} />
      ) : state.phase === 'LOBBY' ? (
        <LobbyMainGrid state={state} de={de} roomCode={roomCode} />
      ) : (
        <RunningPanel state={state} de={de} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lobby Main Grid — exakt das Original-Layout, nur Gouache-Components
// ─────────────────────────────────────────────────────────────────────────────

function LobbyMainGrid({ state, de, roomCode }: { state: QQStateUpdate; de: boolean; roomCode: string }) {
  const joinUrl = `${window.location.origin}/team`;
  const teams = state.teams;
  const teamCount = teams.length;
  const connectedCount = teams.filter(t => t.connected).length;

  // Wave-Animation (aus Original): frisch joinende Teams kriegen Glow + 👋
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
      flex: 1, display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      alignItems: 'center',
      columnGap: 'clamp(24px, 3vw, 48px)',
      position: 'relative', zIndex: 5,
      width: '100%',
      padding: '0 clamp(24px, 4vw, 80px)',
      minHeight: 0,
    }}>
      {/* Left: QR Code */}
      <QrColumn joinUrl={joinUrl} de={de} roomCode={roomCode} />

      {/* Right: Teams + Status */}
      <div style={{
        minWidth: 0, width: '100%',
        display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.8vh, 22px)',
        alignItems: 'stretch', justifyContent: 'center',
      }}>
        {/* Header über dem Grid */}
        <div style={{
          fontFamily: F_BODY,
          fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 700,
          color: `${PALETTE.cream}cc`,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          {de ? 'Angemeldete Teams' : 'Joined Teams'} · {teamCount}
        </div>

        {teamCount === 0 ? (
          <EmptyTeamsPanel de={de} />
        ) : (
          <TeamsGrid teams={teams} waveIds={waveIds} />
        )}

        {/* Status drunter */}
        <StatusLine de={de} teamCount={teamCount} connectedCount={connectedCount} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QR Column (Original-Struktur, Gouache-Stil)
// ─────────────────────────────────────────────────────────────────────────────

function QrColumn({ joinUrl, de, roomCode }: { joinUrl: string; de: boolean; roomCode: string }) {
  void roomCode; // Reserve falls Multi-Room kommt
  const qrSize = 'min(44vh, 420px)';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 1.5vh, 18px)',
      flexShrink: 0, justifySelf: 'start',
    }}>
      {/* QR im weißen PaperCard-Frame */}
      <div style={{
        background: '#ffffff', borderRadius: 24, padding: 'clamp(14px, 2vh, 24px)',
        boxShadow: `0 16px 64px rgba(31,58,95,0.45), 0 0 50px ${PALETTE.cream}33`,
        animation: 'gFloat 5.2s ease-in-out infinite',
        width: qrSize, height: qrSize,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <QRCodeSVG
          value={joinUrl}
          size={256}
          bgColor="#ffffff"
          fgColor={PALETTE.inkDeep}
          level="M"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: F_HAND,
          fontSize: 'clamp(28px, 3.2vw, 42px)', color: PALETTE.cream, fontWeight: 700,
          lineHeight: 1, marginBottom: 6,
          textShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          {de ? 'Scannen & mitspielen!' : 'Scan & join!'}
        </div>
        <div style={{
          fontSize: 'clamp(13px, 1.4vw, 18px)',
          color: PALETTE.inkDeep,
          fontFamily: 'ui-monospace, "SFMono-Regular", monospace',
          background: PALETTE.cream,
          padding: '6px 16px', borderRadius: 999,
          border: `1.5px dashed ${PALETTE.sage}88`,
          display: 'inline-block',
          letterSpacing: '0.02em',
        }}>
          {joinUrl.replace('https://', '').replace('http://', '')}
        </div>
      </div>

      {/* CozyWolf Branding (aus Original) — als Aquarell-Pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 18px', borderRadius: 999,
        background: `linear-gradient(135deg, ${PALETTE.ochre}33, ${PALETTE.terracotta}1f)`,
        border: `1.5px solid ${PALETTE.ochre}88`,
        boxShadow: `0 4px 18px rgba(0,0,0,0.35), 0 0 18px ${PALETTE.ochre}33`,
      }}>
        <img
          src="/logo.png"
          alt=""
          style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
        />
        <span style={{
          fontFamily: F_BODY,
          fontSize: 'clamp(12px, 1.1vw, 15px)', fontWeight: 700,
          color: PALETTE.cream, letterSpacing: '0.06em',
        }}>
          {de ? 'präsentiert von' : 'presented by'}
        </span>
        <span style={{
          fontFamily: F_HAND,
          fontSize: 'clamp(18px, 1.7vw, 24px)', fontWeight: 700,
          color: PALETTE.ochre, letterSpacing: '0.02em',
          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
        }}>
          CozyWolf
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Teams-Grid — 2-spaltig wachsend (User-Override), Cards hochkant
//   1 Team   = 1 Card mittig (1 Spalte)
//   2 Teams  = 2 Spalten × 1 Reihe
//   3-4      = 2 Spalten × 2 Reihen
//   5-6      = 2 Spalten × 3 Reihen
//   7-8      = 2 Spalten × 4 Reihen
// ─────────────────────────────────────────────────────────────────────────────

function TeamsGrid({ teams, waveIds }: { teams: QQTeam[]; waveIds: Set<string> }) {
  const teamCount = teams.length;
  const cols = teamCount === 1 ? 1 : 2;
  // Ab 5 Teams kompaktere Cards (sonst sprengt es vertikal).
  const compact = teamCount > 4;
  // 1 Team mittig — nicht volle Breite, sondern hübsch in der Mitte.
  const justifyItems = teamCount === 1 ? 'center' : 'stretch';
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: compact ? 'clamp(10px, 1.4vw, 16px)' : 'clamp(14px, 1.8vw, 22px)',
      justifyItems,
    }}>
      {teams.map((t, i) => (
        <TeamCard key={t.id} team={t} fresh={waveIds.has(t.id)} compact={compact} delayIndex={i} />
      ))}
    </div>
  );
}

function TeamCard({
  team, fresh, compact, delayIndex,
}: { team: QQTeam; fresh: boolean; compact: boolean; delayIndex: number }) {
  const slug = qqGetAvatar(team.avatarId).slug;
  // Volle Teamfarbe als Ring (kein 55-alpha) → Beamer-Lesbarkeit.
  const ringColor = softTeamColor(team.avatarId, PALETTE.terracotta);
  // Hochkant: Avatar oben groß, Name + Status drunter.
  const avatarSize = compact ? 'clamp(96px, 9vw, 140px)' : 'clamp(120px, 12vw, 180px)';
  return (
    <div style={{
      position: 'relative',
      padding: compact
        ? 'clamp(18px, 2.2vh, 26px) clamp(14px, 1.4vw, 22px)'
        : 'clamp(24px, 2.8vh, 34px) clamp(18px, 1.8vw, 28px)',
      borderRadius: compact ? 24 : 30,
      background: `${PALETTE.cream}f5`,
      // Dicker Ring in voller Teamfarbe + warmer Glow
      border: `4px solid ${ringColor}`,
      boxShadow: fresh
        ? `0 14px 40px rgba(31,58,95,0.4), 0 0 80px ${ringColor}cc, 0 0 40px ${ringColor}aa`
        : `0 16px 38px rgba(31,58,95,0.3), 0 0 28px ${ringColor}55`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: compact ? 'clamp(8px, 1vh, 14px)' : 'clamp(12px, 1.4vh, 20px)',
      animation: fresh
        ? 'lobbyGouacheJoin 1.2s cubic-bezier(0.34,1.56,0.64,1) both'
        : `lobbyGouacheCardIn 0.55s cubic-bezier(0.34,1.2,0.64,1) ${0.3 + delayIndex * 0.06}s both`,
      transition: 'box-shadow 0.6s ease, border-color 0.6s ease',
      minWidth: 0, width: '100%',
      filter: 'url(#paintFrame)',
      textAlign: 'center',
    }}>
      <PaintedAvatar slug={slug} size={parseSize(avatarSize)} color={ringColor} withGrain={false} />
      {fresh && (
        <span aria-hidden style={{
          position: 'absolute', top: -18, right: -10,
          fontSize: compact ? 36 : 46, lineHeight: 1,
          animation: 'lobbyGouacheWave 1.1s cubic-bezier(0.34,1.5,0.64,1) both',
          filter: `drop-shadow(0 0 10px ${ringColor}cc)`,
        }}>👋</span>
      )}
      <div style={{ minWidth: 0, width: '100%' }}>
        <div style={{
          fontFamily: F_HAND,
          fontWeight: 700,
          fontSize: compact ? 'clamp(28px, 2.8vw, 42px)' : 'clamp(34px, 3.4vw, 52px)',
          color: PALETTE.inkDeep,
          lineHeight: 1.05,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }} title={team.name}>
          {team.name.length > 14 ? team.name.slice(0, 13) + '…' : team.name}
        </div>
        <div style={{
          fontFamily: F_BODY,
          fontSize: compact ? 'clamp(13px, 1.2vw, 17px)' : 'clamp(14px, 1.4vw, 19px)',
          fontWeight: 700,
          color: team.connected ? ringColor : `${PALETTE.inkSoft}aa`,
          marginTop: 4,
          letterSpacing: '0.04em',
          fontStyle: team.connected ? 'normal' : 'italic',
        }}>
          {team.connected
            ? `● bereit · ${qqAvatarLabel(team.avatarId, 'de')}`
            : `○ offline · ${qqAvatarLabel(team.avatarId, 'de')}`}
        </div>
      </div>
    </div>
  );
}

// Best-effort Parser für clamp()-Strings → Number für SVG-Größe.
// PaintedAvatar erwartet eine Number; wir bauen aus dem Mittelwert
// einen vernünftigen Default (Browser rechnet das clamp ohnehin via CSS,
// aber PaintedAvatar nutzt size für inline-px). Fallback: 80.
function parseSize(s: string): number {
  const m = s.match(/clamp\(\s*([\d.]+)px\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)px\s*\)/);
  if (!m) return 80;
  if (typeof window === 'undefined') return Number(m[1]);
  const px = Number(m[2]) * window.innerWidth / 100;
  return Math.round(Math.min(Number(m[3]), Math.max(Number(m[1]), px)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty-Hint + Status-Line (aus Original)
// ─────────────────────────────────────────────────────────────────────────────

function EmptyTeamsPanel({ de }: { de: boolean }) {
  return (
    <div style={{
      fontFamily: F_HAND,
      color: PALETTE.cream, fontSize: 'clamp(22px, 2.4vw, 34px)', fontWeight: 700,
      animation: 'gTwinkle 2.5s ease-in-out infinite', textAlign: 'center',
      padding: 'clamp(28px, 4vh, 56px) 24px',
      border: `2px dashed ${PALETTE.cream}44`, borderRadius: 22,
      background: `${PALETTE.inkDeep}33`,
    }}>
      {de ? 'Warte auf Teams …' : 'Waiting for teams …'}
    </div>
  );
}

function StatusLine({ de, teamCount, connectedCount }: { de: boolean; teamCount: number; connectedCount: number }) {
  let label: string;
  let color: string;
  let pulsing = false;
  if (teamCount === 0) {
    label = de ? '📱 Scannt den Code um beizutreten' : '📱 Scan to join';
    color = PALETTE.ochre;
  } else if (teamCount < 2) {
    label = de ? '⏳ Noch 1 Team fehlt!' : '⏳ 1 more team needed!';
    color = PALETTE.ochre;
  } else if (teamCount >= 5) {
    label = de ? `🔥 ${teamCount} Teams sind dabei!` : `🔥 ${teamCount} teams are in!`;
    color = PALETTE.sageLight;
    pulsing = true;
  } else if (connectedCount === teamCount) {
    label = de ? '🚀 Gleich geht’s los!' : '🚀 Let’s go!';
    color = PALETTE.sageLight;
    pulsing = true;
  } else {
    label = de ? `${connectedCount}/${teamCount} verbunden` : `${connectedCount}/${teamCount} connected`;
    color = PALETTE.ochre;
  }
  return (
    <div style={{
      fontFamily: F_HAND,
      fontSize: 'clamp(22px, 2.4vw, 34px)', fontWeight: 700, textAlign: 'center',
      color,
      letterSpacing: '0.02em',
      textShadow: '0 2px 10px rgba(0,0,0,0.45)',
      animation: pulsing ? 'gTwinkle 2.5s ease-in-out infinite' : undefined,
    }}>
      {label}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Connecting / Pre-Game / Running — atmosphärische Fallbacks
// ─────────────────────────────────────────────────────────────────────────────

function ConnectingPanel({ connected }: { connected: boolean }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', zIndex: 5,
    }}>
      <PaperCard washColor={PALETTE.cream} padding="clamp(28px, 4vh, 48px)" style={{ maxWidth: 520 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: F_HAND, fontSize: 'clamp(36px, 4.4vw, 56px)', color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.05 }}>
            {connected ? 'Lade Lobby …' : 'Suche Verbindung …'}
          </div>
          <div style={{ fontFamily: F_BODY, fontSize: 16, color: PALETTE.inkSoft, marginTop: 14, fontStyle: 'italic' }}>
            Wenn das Backend frisch aufwacht, dauert das einen Moment.
          </div>
        </div>
      </PaperCard>
    </div>
  );
}

function PreGamePanel({ de }: { de: boolean }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', zIndex: 5,
    }}>
      <PaperCard washColor={PALETTE.cream} padding="clamp(28px, 4vh, 48px)" style={{ maxWidth: 720 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: F_BODY, fontSize: 12, letterSpacing: '0.24em',
            color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
          }}>
            {de ? 'Vor dem Spiel' : 'Before the game'}
          </div>
          <div style={{
            fontFamily: F_HAND, fontSize: 'clamp(40px, 5vw, 68px)', color: PALETTE.inkDeep,
            fontWeight: 700, lineHeight: 1.05, marginTop: 8,
          }}>
            {de ? 'Bald geht’s los …' : 'Almost ready …'}
          </div>
          <div style={{
            fontFamily: F_BODY, fontSize: 'clamp(15px, 1.4vw, 18px)',
            color: PALETTE.inkSoft, marginTop: 18, lineHeight: 1.65,
            maxWidth: 540, margin: '18px auto 0', fontStyle: 'italic',
          }}>
            {de
              ? 'Der Moderator richtet gerade das Quiz ein. Sobald die Lobby offen ist, erscheint hier der QR-Code zum Beitreten.'
              : 'The moderator is setting up the quiz. The QR code will appear here once the lobby is open.'}
          </div>
        </div>
      </PaperCard>
    </div>
  );
}

function RunningPanel({ state, de }: { state: QQStateUpdate; de: boolean }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', zIndex: 5,
    }}>
      <PaperCard washColor={PALETTE.cream} padding="clamp(28px, 4vh, 48px)" style={{ maxWidth: 760 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: F_BODY, fontSize: 12, letterSpacing: '0.24em',
            color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
          }}>
            {de ? 'Läuft gerade' : 'In progress'}
          </div>
          <div style={{
            fontFamily: F_HAND, fontSize: 'clamp(40px, 5vw, 64px)', color: PALETTE.inkDeep,
            fontWeight: 700, lineHeight: 1.05, marginTop: 8,
          }}>
            {de ? 'Das Spiel ist im Gange' : 'The game is on'}
          </div>
          <div style={{
            fontFamily: F_BODY, fontSize: 'clamp(15px, 1.4vw, 18px)',
            color: PALETTE.inkSoft, marginTop: 18, lineHeight: 1.65,
            maxWidth: 540, margin: '18px auto 0', fontStyle: 'italic',
          }}>
            Phase: <strong style={{ color: PALETTE.terracotta }}>{state.phase}</strong>
          </div>
        </div>
      </PaperCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating Balloons — pro joinendem Team ein Ballon in dessen Hoodie-Farbe
// (übernommen aus erstem Wurf — passt atmosphärisch zur Lobby)
// ─────────────────────────────────────────────────────────────────────────────

const BALLOON_SLOTS: Array<{ left: string; top: string; size: number; delay: string }> = [
  { left: '4%',  top: '24%', size: 64, delay: '0s'   },
  { left: '90%', top: '36%', size: 58, delay: '1.4s' },
  { left: '14%', top: '54%', size: 48, delay: '0.8s' },
  { left: '78%', top: '18%', size: 52, delay: '2.1s' },
  { left: '38%', top: '64%', size: 44, delay: '1.1s' },
  { left: '58%', top: '14%', size: 50, delay: '0.4s' },
  { left: '24%', top: '34%', size: 40, delay: '1.8s' },
  { left: '72%', top: '58%', size: 46, delay: '2.6s' },
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

      {/* Animationen — lokal, damit globale gFloat/gTwinkle nicht überschrieben werden */}
      <style>{`
        @keyframes lobbyGouacheJoin {
          0%   { transform: translateY(8px) scale(0.94); opacity: 0; }
          55%  { transform: translateY(-2px) scale(1.04); opacity: 1; }
          100% { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        @keyframes lobbyGouacheCardIn {
          0%   { transform: translateY(14px) scale(0.96); opacity: 0; }
          100% { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        @keyframes lobbyGouacheWave {
          0%   { transform: translateY(6px) rotate(-12deg) scale(0.6); opacity: 0; }
          40%  { transform: translateY(-4px) rotate(8deg)  scale(1.1); opacity: 1; }
          100% { transform: translateY(0)   rotate(0)      scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
