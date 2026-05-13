/**
 * CozyQuizPausedView — Pause/PreGame-Screen mit Wolf-Co-Moderator, Stats.
 *
 * Großer Render-Hub fuer "warten zwischen Phasen" oder "vor Spiel-Start":
 * - Hero-Wolf links/rechts mit Sprechblase (BrandLoopPanel)
 * - Records-Card mit All-Time-Highscores + heutige Stats + fun-stats
 * - Eurovision-Mode-aware
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-13 (Refactor Phase 5).
 * Mit-extrahiert: BrandLoopPanel + PAUSE_CAT_ACCENT (Local-Helpers).
 * NICHT extern importiert (nur intern via Phase-Router).
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { useLangFlip, COZY_CARD_BG } from '../cozyQuizShared';
import { Fireflies, EurovisionHearts } from './CozyQuizAmbient';
import { GridDisplay } from './CozyQuizGridDisplay';
import { QQTeamAvatar } from './QQTeamAvatar';
import { QQEmojiIcon, QQIcon } from './QQIcon';
import { TeamNameLabel } from './TeamNameLabel';
import { JokerIcon } from './JokerIcon';
import {
  AnimatedCozyWolf, WolfCoModerator, RoundMiniTree, getStandingAvatarSize,
  type Slogan, type LeaderEntry, type FunStats,
} from '../pages/QQBeamerPage';
import { getRoundColor } from '../qqDesignTokens';

function BrandLoopPanel({ slogans, de }: { slogans: string[]; de: boolean }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slogans.length <= 1) return;
    const id = setInterval(() => setIdx(p => (p + 1) % slogans.length), 4500);
    return () => clearInterval(id);
  }, [slogans.length]);
  const current = slogans[idx % slogans.length];
  return (
    // Grid-Layout statt flex+justifyContent:center — verhindert Layout-Shift,
    // wenn die intrinsische Breite der Text-Spalte sich ändert. Wolf-Spalte hat
    // exakt Wolf-Breite, Text-Spalte hat FESTE Breite (clamp). Beide Spalten ändern
    // ihre Größe nicht, wenn der Slogan-Text wechselt → Wolf bleibt 100% an Ort.
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto auto',
      alignItems: 'center',
      columnGap: 28,
      padding: '8px 4px',
      // Pinnt das Grid horizontal in die Panel-Mitte
      justifyContent: 'center',
    }}>
      <AnimatedCozyWolf widthCss="clamp(110px, 12cqw, 180px)" speaking={true} />
      <div style={{
        // Feste Breite — egal wie kurz/lang der Slogan ist
        width: 'clamp(260px, 38cqw, 540px)',
        // Feste Höhe — Eyebrow + Slogan-Box ohne Atmen
        minHeight: 'clamp(96px, 11cqw, 144px)',
        display: 'flex', flexDirection: 'column', gap: 10,
        justifyContent: 'center',
      }}>
        {/* 2026-05-04 (Wolf): „Cozy Quiz"-Eyebrow war random — ersetzt durch
            Brand-Strip-Pille (gleiche Sprache wie auf /team). */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 12px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          alignSelf: 'flex-start',
        }}>
          <span style={{ fontSize: 12, lineHeight: 1 }}>🐺</span>
          <span style={{
            fontSize: 'clamp(10px, 1cqw, 13px)', fontWeight: 900,
            color: '#cbd5e1', letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}>cozywolf</span>
          <span style={{
            width: 3, height: 3, borderRadius: '50%',
            background: 'rgba(203,213,225,0.4)',
          }} />
          <span style={{
            fontSize: 'clamp(10px, 1cqw, 13px)', fontWeight: 700,
            color: '#EC4899', letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}>{de ? 'präsentiert' : 'presents'}</span>
        </div>
        {/* Slogan-Box mit fester Höhe + absoluter Positionierung → Text fadet nur, Layout fix */}
        <div style={{
          position: 'relative',
          minHeight: 'clamp(56px, 7cqw, 100px)',
        }}>
          <div
            key={current}
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center',
              fontSize: 'clamp(28px, 3.4cqw, 48px)', fontWeight: 900,
              color: '#FFEFC9',
              lineHeight: 1.1,
              letterSpacing: '-0.005em',
              textShadow: '0 0 24px rgba(236,72,153,0.2)',
              animation: 'qqSloganFade 0.7s ease-in-out both',
              willChange: 'opacity',
            }}
          >
            {current}
          </div>
        </div>
      </div>
    </div>
  );
}
// Kategorie-Akzente fürs Panel-Design (konsistent mit Beamer-Quiz).
// 2026-05-10 (Wolf-Audit Klasse 2): labelEn-Feld hinzu — label rendert im
// Pause-Stat-Panel (catMeta.label, ~Z. 18539). Vorher zeigte EN-Spiel DE-Texte.
const PAUSE_CAT_ACCENT: Record<string, { color: string; emoji: string; label: string; labelEn: string }> = {
  SCHAETZCHEN:   { color: '#EAB308', emoji: '🎯', label: 'Schätzchen',   labelEn: 'Close Call' },
  MUCHO:         { color: '#3B82F6', emoji: '🔤', label: 'Mucho Choice', labelEn: 'Mu-Cho' },
  BUNTE_TUETE:   { color: '#EF4444', emoji: '🎁', label: 'Bunte Tüte',   labelEn: 'Lucky Bag' },
  ZEHN_VON_ZEHN: { color: '#10B981', emoji: '🎲', label: '10 von 10',    labelEn: 'All In' },
  CHEESE:        { color: '#8B5CF6', emoji: '📸', label: 'Cheese!',      labelEn: 'Picture This' },
};
export function PausedView({ state: s, mode = 'pause' }: { state: QQStateUpdate; mode?: 'pause' | 'preGame' }) {
  // 2026-05-07 (Wolf 'mach mal die card bei eurovision etwas durchsichtiger,
  // gerne auch bei pause wenn es passt'): im ESC-Mode translucent Card-BG aus
  // dem theme.cardBg (#2d1644 lila) mit ~68 % Opacity, damit das Herz-BG-1
  // dahinter durchscheint. Sonst: opake Cozy-Cards wie immer. Greift fuer
  // Lobby/PreGame UND Pause weil PausedView beide Modes bedient.
  const cardBg = s.theme?.eurovisionMode
    ? 'linear-gradient(180deg, rgba(45,22,68,0.72) 0%, rgba(31,15,61,0.62) 100%)'
    : COZY_CARD_BG;
  // Mode-spezifische Akzentfarbe — preGame: Lagerfeuer-Gold, Pause: Cozy-Lavender.
  // 2026-05-07 (Wolf 'mehr Pink + Blau im ESC-Draft, Set A'): im eurovisionMode
  // beide Modi auf ESC-Pink (#FF2D7B) — trifft Card-Border, Shimmer, Inner-Glow,
  // Round-Pille, Pause-Dot etc. Hoechster Hebel mit einer Variable.
  const isEsc = !!s.theme?.eurovisionMode;
  const modeAccent     = isEsc ? '#FF2D7B' : (mode === 'preGame' ? '#EC4899' : '#A78BFA');
  const modeAccentDim  = isEsc ? 'rgba(255,45,123,0.42)' : (mode === 'preGame' ? 'rgba(236,72,153,0.38)' : 'rgba(167,139,250,0.42)');
  const modeGlow       = isEsc ? 'rgba(255,45,123,0.30)' : (mode === 'preGame' ? 'rgba(236,72,153,0.28)' : 'rgba(167,139,250,0.28)');
  // 2026-04-30: Sprache aus Server-State (s.language) statt lokalem Auto-Flip.
  // Vorher floppte 'de' alle 8s automatisch unabhaengig vom Mod-Schalter.
  // Jetzt: 'de' sticky bei DE, 'en' sticky bei EN, 'both' flippt alle 12s
  // (wie ueberall sonst im Beamer via useLangFlip).
  const lang = useLangFlip(s.language);
  const de = lang === 'de';

  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [funStats, setFunStats] = useState<FunStats | null>(null);
  useEffect(() => {
    const API = (import.meta as any).env?.VITE_API_BASE ?? '/api';
    fetch(`${API}/qq/leaderboard`).then(r => r.json()).then(data => {
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      if (data.totalGames) setTotalGames(data.totalGames);
      if (data.funStats) setFunStats(data.funStats);
    }).catch(() => {});
  }, []);

  // Build rotating panels
  const panels: Array<{ key: string; node: React.ReactNode }> = [];

  // ── How-To — nur in PreGame (füllen leeren Vor-Spiel-State) ──
  // 2026-05-06 (Wolf 'doppelter Wolf — Card-Wolf raus seit Bottom-Right-Wolf
  // als Co-Moderator da ist'): BrandLoopPanel war vorher hier mit eigenem
  // Wolf + Slogans. Jetzt aus der Card-Rotation entfernt — die Wolf-Sprueche
  // laufen über die Sprechblase am bottom-right Co-Moderator. Card-Rotation
  // beschraenkt sich auf How-it-works + Records + Leaderboard.
  if (mode === 'preGame') {

    // Wie funktioniert's — 4 Mini-Cards.
    // 2026-05-06 (Wolf 'die Page ist noch alt, da sind Regeln drin die nicht
    // mehr aktuell sind'): Texte auf aktuellen Stand gebracht — Joker-Pattern
    // (2x2 oder 4-in-a-row), Cap (max 2 pro Team, 1 pro Runde), Faehigkeiten
    // pro Runde (Klauen R2, Stapeln R3), Bunte Tuete als Surprise-Slot.
    const howItems = de
      ? [
          { icon: '📱', title: 'Auf dem Handy', desc: 'Jedes Team spielt am eigenen Smartphone.' },
          { icon: '🎯', title: 'Brett erobern', desc: 'Frage richtig = ein Feld setzen. Größtes zusammenhängendes Gebiet gewinnt.' },
          { icon: '🃏', title: 'Joker', desc: '2×2-Block oder 4 in einer Reihe = 1 Bonus-Feld. Max. 2 pro Team, 1 pro Runde.' },
          { icon: '🎲', title: 'Pro Runde mehr', desc: 'Ab R2 Klauen, ab R3 Stapeln. Bunte Tüte sorgt jede Runde für eine Überraschung.' },
        ]
      : [
          { icon: '📱', title: 'On your phone', desc: 'Each team plays on their own smartphone.' },
          { icon: '🎯', title: 'Conquer the grid', desc: 'Right answer = place a tile. Largest connected area wins.' },
          { icon: '🃏', title: 'Joker', desc: '2×2 block or 4 in a row = 1 bonus tile. Max 2 per team, 1 per round.' },
          { icon: '🎲', title: 'Each round adds', desc: 'Steal from R2, Stack from R3. Lucky Bag delivers a surprise every round.' },
        ];

    panels.push({ key: 'howItWorks', node: (
      // 2026-05-07 v2 (Wolf 'unten beruehren sich Card und Inner-Card fast'):
      // Title-marginBottom 28→18, Icon 36-52→30-44, Desc 17-24→15-21, Card-
      // Padding 18/20→13/16, Grid-Gap 16→12 — Panel ~18 % kompakter, untere
      // Inner-Cards beruehren die Outer-Card-Boden-Border nicht mehr.
      // 2026-05-07 v13 (Wolf 'mach das 2x2 grid mittig zentriert + die ueber-
      // schrift einfach drueber, plus eigene Joker-Grafik'): Panel auf 720
      // verschmaelert + margin 0 auto. JokerIcon (Spiel-Asset) statt 🃏 Emoji.
      <div style={{ width: 'min(100%, 720px)', margin: '0 auto' }}>
        <div style={{ fontSize: 'clamp(28px, 3.2cqw, 46px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}>📖</span>
          {de ? 'Wie funktioniert’s?' : 'How it works'}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          textAlign: 'left', // Mini-Cards bleiben links-buendig fuer Lesbarkeit
        }}>
          {howItems.map((it, i) => {
            // 2026-05-07: Joker-Mini-Card nutzt JokerIcon-Asset statt 🃏 Emoji.
            const isJoker = it.title === 'Joker';
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '13px 16px',
                borderRadius: 16,
                background: 'rgba(255,235,200,0.04)',
                border: '1px solid rgba(255,235,200,0.10)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                animation: `panelSlideIn 0.6s var(--qq-ease-out-cubic) ${0.08 * i}s both`,
              }}>
                {isJoker ? (
                  <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <JokerIcon i={i} size={42} eurovisionMode={!!s.theme?.eurovisionMode} />
                  </span>
                ) : (
                  <span style={{ fontSize: 'clamp(30px, 3.2cqw, 44px)', lineHeight: 1, flexShrink: 0 }}>{it.icon}</span>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 'clamp(20px, 2.2cqw, 28px)', color: '#EC4899', marginBottom: 4 }}>{it.title}</div>
                  <div style={{ fontSize: 'clamp(15px, 1.7cqw, 21px)', color: '#cbd5e1', lineHeight: 1.35 }}>{it.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )});
  }

  // 2026-05-06 (Wolf 'in der pause den trinkenden'): Pause-BrandLoopPanel mit
  // Wolf aus der Card-Rotation entfernt — der trinkende Wolf sitzt jetzt
  // unten links als Co-Moderator (analog preGame). Slogans laufen ueber
  // seine Sprechblase. Card-Rotation bleibt fuer Records/Leaderboard etc.

  // Aktuelle Runde — kompakt (User-Feedback 2026-04-28: 'die ganze progress
  // bar ist zu lang, zeige am besten nur die aktuelle Runde'). Statt der
  // vollen Tree-Übersicht jetzt: Runden-Pille + Frage-Fortschritt + RoundMiniTree
  // (nur Dots der aktuellen Runde) — passt in einer Card-Zeile.
  if (mode === 'pause' && (s.schedule?.length ?? 0) > 0) {
    const roundColor = getRoundColor(s.gamePhaseIndex ?? 1, s.totalPhases ?? 4);
    const questionInPhase = (s.questionIndex % 5) + 1;
    panels.push({ key: 'progress', node: (
      <div>
        <div style={{ fontSize: 'clamp(28px, 3.2cqw, 42px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}><QQEmojiIcon emoji="🗺️"/></span>
          {de ? 'Wo sind wir?' : 'Where are we?'}
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        }}>
          {/* Big Round Pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 14,
            padding: '14px 32px', borderRadius: 999,
            background: `${roundColor}20`,
            border: `2.5px solid ${roundColor}`,
            boxShadow: `0 0 28px ${roundColor}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}>
            <span style={{
              fontSize: 'clamp(36px, 4.5cqw, 64px)', fontWeight: 900,
              color: roundColor, lineHeight: 1,
              textShadow: `0 0 16px ${roundColor}88`,
            }}>{s.gamePhaseIndex}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.1 }}>
              <span style={{
                fontSize: 'clamp(12px, 1.2cqw, 16px)', fontWeight: 900,
                color: `${roundColor}cc`, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {de ? `Runde ${s.gamePhaseIndex} von ${s.totalPhases}` : `Round ${s.gamePhaseIndex} of ${s.totalPhases}`}
              </span>
              <span style={{
                fontSize: 'clamp(18px, 2cqw, 26px)', fontWeight: 900,
                color: '#e2e8f0',
              }}>
                {de ? `Frage ${questionInPhase} von 5` : `Question ${questionInPhase} of 5`}
              </span>
            </div>
          </div>
          {/* Mini-Tree der aktuellen Runde */}
          <RoundMiniTree state={s} catColor={roundColor} />
        </div>
      </div>
    )});

    // Aktuelles Grid als eigener Slide (User-Wunsch 2026-04-28: 'gerne das
    // aktuelle grid auf einem der slides'). Reuse MiniGrid mit großzügiger Größe.
    // 2026-05-07 v18 (Wolf-Bug 'das grid bzw die avatare ueberlappen unten,
    // mach dynamisch 2 tabellen eine links eine rechts bei 8 teams, bei 4-6
    // teams nur auf der rechten seite und mache dann grid und tabelle mittig
    // zusammengerechnet'): Avatare nicht mehr unter dem Grid (overflow), sondern
    // als Sidebar-Spalten neben dem Grid.
    //   ≥7 Teams → 2 Spalten (links + rechts), Split halbe-halbe
    //   1-6 Teams → nur rechts daneben
    // Grid + Spalte(n) als Block horizontal mittig.
    panels.push({ key: 'currentGrid', node: (
      <div>
        <div style={{ fontSize: 'clamp(28px, 3.2cqw, 42px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}><QQEmojiIcon emoji="🗺️"/></span>
          {de ? 'Aktuelles Brett' : 'Current Board'}
        </div>
        {(() => {
          const sortedByCells = [...s.teams].sort((a, b) => b.totalCells - a.totalCells);
          const renderPill = (t: typeof sortedByCells[number]) => (
            <div key={t.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', borderRadius: 999,
              background: `${t.color}15`,
              border: `1.5px solid ${t.color}55`,
              flexShrink: 0,
            }}>
              <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={28} />
              <span style={{ fontWeight: 900, color: t.color, fontSize: 14 }}>{t.totalCells}</span>
            </div>
          );
          const colStyle: React.CSSProperties = {
            display: 'flex', flexDirection: 'column', gap: 10,
            justifyContent: 'center',
          };
          const splitMode = sortedByCells.length >= 7;
          // 2026-05-12 (Wolf 'nimm auf den pausencards das normale grid'):
          // MiniGrid → GridDisplay. Die normale Brett-Komponente mit
          // Avatar-Cells, fused borders, joker-glow etc. — gleicher Look wie
          // in PlacementView/QuestionView. Pause-Slide zeigt das Spiel-Brett
          // jetzt so wie es waehrend des Spiels aussieht.
          if (splitMode) {
            const half = Math.ceil(sortedByCells.length / 2);
            const left = sortedByCells.slice(0, half);
            const right = sortedByCells.slice(half);
            return (
              <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                gap: 'clamp(16px, 2.2cqw, 32px)',
                padding: 'clamp(14px, 2cqw, 28px)',
              }}>
                <div style={colStyle}>{left.map(renderPill)}</div>
                <GridDisplay state={s} maxSize={420} showJoker={false} />
                <div style={colStyle}>{right.map(renderPill)}</div>
              </div>
            );
          }
          return (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: 'clamp(16px, 2.2cqw, 32px)',
              padding: 'clamp(14px, 2cqw, 28px)',
            }}>
              <GridDisplay state={s} maxSize={420} showJoker={false} />
              <div style={colStyle}>{sortedByCells.map(renderPill)}</div>
            </div>
          );
        })()}
      </div>
    )});
  }

  // Current game standings — Sortierung IDENTISCH zu GameOverView:
  // largestConnected primary, totalCells als Tie-Breaker. Sonst kann das
  // Pause-Ranking != End-Ranking sein und verwirrt Zuschauer.
  // Bei >=5 Teams 2-spaltig, damit nichts ueberlaeuft.
  const sortedTeams = [...s.teams].sort((a, b) =>
    b.largestConnected - a.largestConnected
    || b.totalCells - a.totalCells
  );
  if (sortedTeams.length > 0) {
    const twoCol = sortedTeams.length >= 5;
    const rankSize = twoCol ? 'clamp(22px, 2.4cqw, 32px)' : 'clamp(28px, 3.2cqw, 42px)';
    // Avatar-Groesse via shared Helper - konsistent zu GameOverView
    const avSize   = getStandingAvatarSize(sortedTeams.length, twoCol);
    const nameSize = twoCol ? 'clamp(18px, 2cqw, 26px)'  : 'clamp(22px, 2.6cqw, 32px)';
    const valSize  = twoCol ? 'clamp(18px, 2cqw, 26px)'  : 'clamp(22px, 2.6cqw, 32px)';
    const unitSize = twoCol ? 'clamp(12px, 1.3cqw, 16px)' : 'clamp(14px, 1.6cqw, 20px)';
    panels.push({ key: 'standings', node: (
      <div>
        <div style={{ fontSize: 'clamp(24px, 2.8cqw, 36px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}><QQEmojiIcon emoji="📊"/></span> {de ? 'Aktueller Stand' : 'Current Standings'}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr',
          columnGap: 32, rowGap: 0,
        }}>
          {sortedTeams.map((t, i) => {
            // Border-bottom nur wenn es innerhalb der Spalte noch einen Nachfolger gibt
            const nextInCol = twoCol ? (i + 2 < sortedTeams.length) : (i < sortedTeams.length - 1);
            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: twoCol ? 12 : 18, padding: twoCol ? '8px 0' : '12px 0',
                borderBottom: nextInCol ? '1px solid rgba(255,255,255,0.06)' : 'none',
                minWidth: 0,
              }}>
                <span style={{ fontSize: rankSize, width: twoCol ? 36 : 48, textAlign: 'center', flexShrink: 0 }}>
                  {i === 0 ? <QQEmojiIcon emoji="🥇"/> : i === 1 ? <QQEmojiIcon emoji="🥈"/> : i === 2 ? <QQEmojiIcon emoji="🥉"/> : `${i + 1}.`}
                </span>
                <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={avSize} style={{ flexShrink: 0 }} />
                <span style={{
                  flex: 1, fontWeight: 900, fontSize: nameSize, color: t.color,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                }}>{t.name}</span>
                {/* Score-Format IDENTISCH zu GameOverView: 'largestConnected · totalCells'.
                 * largestConnected = Hauptwert (sortier-relevant), totalCells als Sub. */}
                <span style={{
                  display: 'inline-flex', alignItems: 'baseline', gap: 5, flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  <span style={{ fontSize: valSize, fontWeight: 900, color: '#FBCFE8' }}>{t.largestConnected}</span>
                  <span style={{ fontSize: unitSize, color: '#94a3b8', fontWeight: 700 }}>· {t.totalCells}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    )});
  }

  // All-time leaderboard (nur echte Siege) — Design-Upgrade: Avatare aus Session-Teams
  // gemappt (wo möglich), Siege als Subway-Stationen (max 8 sichtbar), Dark-Pills.
  const realLeaderboard = leaderboard.filter(e => e.wins > 0);
  if (realLeaderboard.length > 0) {
    const maxVisibleWins = 8;
    const maxWins = Math.max(...realLeaderboard.slice(0, 5).map(e => e.wins));
    panels.push({ key: 'leaderboard', node: (
      <div>
        <div style={{ fontSize: 'clamp(24px, 2.8cqw, 36px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}><QQEmojiIcon emoji="🏆"/></span> {de ? 'Bestenliste' : 'Leaderboard'}
          {totalGames > 0 && <span style={{ fontSize: 'clamp(16px, 1.8cqw, 22px)', fontWeight: 700, color: '#475569' }}>({totalGames} {de ? 'Spiele' : 'games'})</span>}
        </div>
        {realLeaderboard.slice(0, 5).map((entry, i) => {
          const sessionTeam = s.teams.find(t => t.name === entry.name);
          const teamColor = sessionTeam?.color ?? (i === 0 ? '#EC4899' : i === 1 ? '#CBD5E1' : i === 2 ? '#F97316' : '#94A3B8');
          const shown = Math.min(entry.wins, maxVisibleWins);
          const overflow = entry.wins - shown;
          // 2026-04-28: Avatar primär aus Session-Team, sonst aus Backend-
          // Cache (avatarId vom letzten Spiel). So zeigen sich Avatare auch
          // wenn das Team gerade nicht in der aktuellen Session ist.
          const avatarId = sessionTeam?.avatarId ?? entry.avatarId ?? null;
          // 'Hat gespielt am'-Hint — nur wenn lastPlayedAt da, klein darunter.
          const lastPlayedLabel = entry.lastPlayedAt
            ? new Date(entry.lastPlayedAt).toLocaleDateString(de ? 'de-DE' : 'en-US', { day: '2-digit', month: '2-digit', year: '2-digit' })
            : null;
          return (
          <div key={entry.name} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0',
            borderBottom: i < Math.min(realLeaderboard.length, 5) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <span style={{ fontSize: 'clamp(26px, 3cqw, 38px)', width: 46, textAlign: 'center', flexShrink: 0 }}>
              {i === 0 ? <QQEmojiIcon emoji="🥇"/> : i === 1 ? <QQEmojiIcon emoji="🥈"/> : i === 2 ? <QQEmojiIcon emoji="🥉"/> : `${i + 1}.`}
            </span>
            {avatarId
              ? <QQTeamAvatar avatarId={avatarId} size={'clamp(38px, 4cqw, 54px)'} style={{ flexShrink: 0, boxShadow: `0 0 14px ${teamColor}44` }} />
              : <div style={{
                  width: 'clamp(38px, 4cqw, 54px)', height: 'clamp(38px, 4cqw, 54px)',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${teamColor}22, ${teamColor}10)`,
                  border: `2px solid ${teamColor}55`,
                  boxShadow: `0 0 14px ${teamColor}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  color: `${teamColor}aa`,
                  fontSize: 'clamp(18px, 2cqw, 26px)',
                  fontWeight: 900,
                }}>?</div>
            }
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TeamNameLabel
                name={entry.name}
                withTeamPrefix
                maxLines={2}
                shrinkAfter={16}
                fontSize="clamp(20px, 2.4cqw, 30px)"
                color={teamColor}
                fontWeight={800}
              />
              {lastPlayedLabel && (
                <span style={{
                  fontSize: 'clamp(11px, 1.1cqw, 14px)', color: '#64748b',
                  fontWeight: 700, letterSpacing: '0.04em',
                }}>
                  {de ? `zuletzt: ${lastPlayedLabel} · ${entry.games} Spiele` : `last: ${lastPlayedLabel} · ${entry.games} games`}
                </span>
              )}
            </div>
            {/* Subway-Stationen: ein Dot pro Sieg, skaliert relativ zum Maximum */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, minWidth: 0 }}>
              {Array.from({ length: shown }).map((_, k) => (
                <span key={k} style={{
                  width: 'clamp(8px, 1cqw, 12px)', height: 'clamp(8px, 1cqw, 12px)',
                  borderRadius: '50%',
                  background: teamColor,
                  boxShadow: `0 0 8px ${teamColor}88`,
                  opacity: 0.4 + 0.6 * ((k + 1) / maxWins),
                }} />
              ))}
              {overflow > 0 && (
                <span style={{ color: teamColor, fontWeight: 900, fontSize: 'clamp(13px, 1.4cqw, 18px)', marginLeft: 4 }}>+{overflow}</span>
              )}
            </div>
            {/* Dark-Pill mit Siegen */}
            <span style={{
              padding: '4px 12px', borderRadius: 999,
              background: 'linear-gradient(180deg, #241a10, #1a120a)',
              border: `1.5px solid ${teamColor}55`,
              color: teamColor, fontWeight: 900, fontSize: 'clamp(15px, 1.7cqw, 21px)',
              flexShrink: 0,
              boxShadow: `0 0 14px ${teamColor}22, inset 0 1px 0 rgba(255,255,255,0.05)`,
            }}>{entry.wins} {de ? 'Siege' : 'wins'}</span>
          </div>
          );
        })}
      </div>
    )});
  }

  // 2026-05-06 (Wolf 'Avatare neben Teamnamen, auch aus der ewigen Tabelle'):
  // Lookup-Helper sucht erst in Session-Teams, dann in Leaderboard-Cache.
  // Damit zeigen sich Avatare auch fuer historische Teams die gerade nicht
  // in der aktuellen Session sind.
  const findTeamMeta = (name: string): { avatarId?: string | null; color?: string } => {
    const session = s.teams.find(t => t.name === name);
    if (session) return { avatarId: session.avatarId, color: session.color };
    const leader = leaderboard.find(e => e.name === name);
    if (leader?.avatarId) return { avatarId: leader.avatarId };
    return {};
  };
  // 2026-05-12 (Wolf 'avatar manchmal da, manchmal nicht, inkonsistent —
  // immer bei allen stats auf pause und setup avatare zu den teams'):
  // Avatar wird IMMER gerendert, auch wenn avatarId unbekannt. Fallback ist
  // ein farbiger Kreis mit ❓ Glyph — gleicher visueller Footprint wie ein
  // echtes Avatar, garantiert konsistentes Layout aller Stats-Zeilen.
  const fallbackAvatarCircle = (sizeCss: string, c: string) => (
    <div style={{
      width: sizeCss, height: sizeCss, borderRadius: '50%',
      background: `linear-gradient(135deg, ${c}22, ${c}10)`,
      border: `2px solid ${c}55`,
      boxShadow: `0 0 14px ${c}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      color: `${c}aa`,
      fontSize: `calc(${sizeCss} * 0.5)`,
      fontWeight: 900,
    }}>?</div>
  );
  const teamLine = (name: string, color?: string, avatarId?: string | null) => {
    const meta = findTeamMeta(name);
    const c = color ?? meta.color ?? '#EC4899';
    const av = avatarId ?? meta.avatarId;
    return (
      // 2026-05-07: Avatar 68→100, Name 42→64 — Lobby-Slide-Texte groesser.
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
        {av
          ? <QQTeamAvatar avatarId={av} size={'clamp(64px, 7cqw, 100px)'} style={{ flexShrink: 0, boxShadow: `0 0 28px ${c}55` }} />
          : fallbackAvatarCircle('clamp(64px, 7cqw, 100px)', c)}
        <span style={{ fontWeight: 900, fontSize: 'clamp(36px, 4.2cqw, 64px)', color: c, textShadow: `0 0 22px ${c}44` }}>{name}</span>
      </div>
    );
  };
  // Inline-Variante fuer kompakte Records (Avatar + Name in einer Zeile mit Stat).
  const teamInline = (name: string, accentFallback = '#EC4899') => {
    const meta = findTeamMeta(name);
    const c = meta.color ?? accentFallback;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, verticalAlign: 'middle' }}>
        {meta.avatarId
          ? <QQTeamAvatar avatarId={meta.avatarId} size={'clamp(28px, 2.8cqw, 36px)'} style={{ flexShrink: 0, boxShadow: `0 0 10px ${c}55` }} />
          : fallbackAvatarCircle('clamp(28px, 2.8cqw, 36px)', c)}
        <strong style={{ color: c }}>{name}</strong>
      </span>
    );
  };

  // Records — nur Einträge mit echten Werten zeigen (0-Records sind irreführend)
  if (funStats) {
    const records: React.ReactNode[] = [];
    if (funStats.highestScore && funStats.highestScore.score > 0) {
      records.push(
        <div key="hs" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6cqw, 48px)' }}><QQEmojiIcon emoji="🔥"/></span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(26px, 3cqw, 40px)', color: '#e2e8f0' }}>{de ? 'Höchster Score' : 'Highest Score'}</div>
            <div style={{ fontSize: 'clamp(22px, 2.4cqw, 32px)', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {teamInline(funStats.highestScore.teamName)} — {funStats.highestScore.score} {de ? 'Punkte' : 'points'}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.closestGame && funStats.closestGame.gap > 0) {
      records.push(
        <div key="cg" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6cqw, 48px)' }}>⚔️</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(26px, 3cqw, 40px)', color: '#e2e8f0' }}>{de ? 'Knappster Sieg' : 'Closest Game'}</div>
            <div style={{ fontSize: 'clamp(22px, 2.4cqw, 32px)', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {teamInline(funStats.closestGame.teams[0])} vs {teamInline(funStats.closestGame.teams[1])} — {de ? `nur ${funStats.closestGame.gap} Pkt.` : `only ${funStats.closestGame.gap} pts apart`}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.winStreak && funStats.winStreak.streak >= 2) {
      records.push(
        <div key="ws" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6cqw, 48px)' }}><QQEmojiIcon emoji="🔥"/></span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(26px, 3cqw, 40px)', color: '#e2e8f0' }}>{de ? 'Siegesserie' : 'Win Streak'}</div>
            <div style={{ fontSize: 'clamp(22px, 2.4cqw, 32px)', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {teamInline(funStats.winStreak.teamName)} — {funStats.winStreak.streak}x {de ? 'in Folge' : 'in a row'}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.fastestAnswer && funStats.fastestAnswer.ms >= 100) {
      const secs = (funStats.fastestAnswer.ms / 1000).toFixed(1);
      records.push(
        <div key="fa" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6cqw, 48px)' }}><QQEmojiIcon emoji="⚡"/></span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(26px, 3cqw, 40px)', color: '#e2e8f0' }}>{de ? 'Schnellste Antwort' : 'Fastest Answer'}</div>
            <div style={{ fontSize: 'clamp(22px, 2.4cqw, 32px)', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {teamInline(funStats.fastestAnswer.teamName)} — {secs}s {de ? 'Vorsprung' : 'ahead'}
            </div>
          </div>
        </div>
      );
    }
    if (records.length > 0) {
      panels.push({ key: 'records', node: (
        <div>
          <div style={{ fontSize: 'clamp(32px, 3.6cqw, 52px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}>🏅</span> {de ? 'Rekorde' : 'Records'}
          </div>
          {records}
        </div>
      )});
    }
  }

  // ── Style-Helpers für die neuen Stat-Panels ──────────────────────────────
  // 2026-05-07 (Wolf 'mach die Schrift in den Lobby-Slides gerne teilweise
  // groesser, die Textfelder wirken etwas verloren in dem riesen Kasten'):
  // Title 36→52, Pill-Wert 30→44, Pill-Label 17→22.
  const statTitle = (icon: string, titleDe: string, titleEn: string, accentColor?: string) => (
    <div style={{
      fontSize: 'clamp(32px, 3.6cqw, 52px)', fontWeight: 900,
      color: accentColor ?? '#e2e8f0',
      marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
    }}>
      <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}><QQEmojiIcon emoji={icon}/></span>
      {de ? titleDe : titleEn}
    </div>
  );

  // Dark-Pill im Cozy-Header-Style (warmer card-bg + Akzent-Border)
  const statPill = (value: string | number, label: string, accent = '#EC4899') => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 12,
      padding: '12px 24px', borderRadius: 999,
      background: 'linear-gradient(180deg, #241a10, #1a120a)',
      border: `1.5px solid ${accent}55`,
      color: '#fff',
      fontSize: 'clamp(22px, 2.4cqw, 32px)', fontWeight: 900,
      boxShadow: `0 0 18px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
    }}>
      <span style={{ color: accent, fontSize: 'clamp(30px, 3.2cqw, 44px)', lineHeight: 1 }}>{value}</span>
      <span style={{ color: '#cbd5e1', fontSize: 'clamp(15px, 1.5cqw, 22px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
    </span>
  );

  // Big-Team-Line: Avatar + Name (farblich akzentuiert)
  // (helpers moved up — see findTeamMeta / teamLine / teamInline above)

  // #01 Hot-Streak live — aktueller Session-Leader + Abstand
  if (sortedTeams.length >= 2 && mode === 'pause') {
    const leader = sortedTeams[0];
    const runnerUp = sortedTeams[1];
    const gap = leader.totalCells - runnerUp.totalCells;
    if (gap > 0) {
      panels.push({ key: 'hotStreak', node: (
        <div>
          {statTitle('🔥', 'Heiße Phase', 'Hot Streak', '#F97316')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {teamLine(leader.name, leader.color, leader.avatarId)}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {statPill(`+${gap}`, de ? 'Felder Vorsprung' : 'cells lead', '#F97316')}
              <span style={{ color: '#94a3b8', fontSize: 'clamp(17px, 1.9cqw, 24px)', fontWeight: 700 }}>
                {de ? `vor ${runnerUp.name}` : `ahead of ${runnerUp.name}`}
              </span>
            </div>
          </div>
        </div>
      )});
    }
  }

  // #02 Joker-König (all-time)
  if (funStats?.jokerKing && funStats.jokerKing.total >= 2) {
    panels.push({ key: 'jokerKing', node: (
      <div>
        {statTitle('🃏', 'Joker-König', 'Joker King', '#A855F7')}
        {teamLine(funStats.jokerKing.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {statPill(funStats.jokerKing.total, de ? 'Joker gesichert' : 'jokers earned', '#A855F7')}
        </div>
      </div>
    )});
  }

  // #03 Comeback-King
  if (funStats?.comebackKing && funStats.comebackKing.total >= 1) {
    panels.push({ key: 'comebackKing', node: (
      <div>
        {statTitle('🦅', 'Comeback-King', 'Comeback King', '#38BDF8')}
        {teamLine(funStats.comebackKing.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
          {statPill(funStats.comebackKing.total, de ? 'Aufholsiege' : 'comeback wins', '#38BDF8')}
          <span style={{ color: '#94a3b8', fontSize: 'clamp(15px, 1.7cqw, 20px)' }}>
            {de ? 'vom Letzten zum Gewinner' : 'from last place to winner'}
          </span>
        </div>
      </div>
    )});
  }

  // #04 Steal-Master
  if (funStats?.stealMaster && funStats.stealMaster.total >= 2) {
    panels.push({ key: 'stealMaster', node: (
      <div>
        {statTitle('🗡️', 'Steal-Master', 'Steal Master', '#EF4444')}
        {teamLine(funStats.stealMaster.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {statPill(funStats.stealMaster.total, de ? 'Felder geklaut' : 'cells stolen', '#EF4444')}
        </div>
      </div>
    )});
  }

  // #05 Underdog (wenige Spiele, aber Siege)
  if (funStats?.underdog) {
    panels.push({ key: 'underdog', node: (
      <div>
        {statTitle('🐺', 'Underdog', 'Underdog', '#22D3EE')}
        {teamLine(funStats.underdog.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {statPill(funStats.underdog.wins, de ? 'Siege' : 'wins', '#22D3EE')}
          {statPill(funStats.underdog.games, de ? 'Spiele' : 'games', '#64748B')}
          <span style={{ color: '#94a3b8', fontSize: 'clamp(14px, 1.6cqw, 18px)', alignSelf: 'center' }}>
            {de ? 'frisch & gefährlich' : 'fresh & dangerous'}
          </span>
        </div>
      </div>
    )});
  }

  // #06 Kategorie-Meister (Top-3 Teams mit bester Kategorie)
  if (funStats?.categoryMasters && funStats.categoryMasters.length > 0) {
    panels.push({ key: 'catMasters', node: (
      <div>
        {statTitle('👑', 'Kategorie-Meister', 'Category Masters', '#EC4899')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {funStats.categoryMasters.map((cm, i) => {
            const catMeta = PAUSE_CAT_ACCENT[cm.category] ?? { color: '#EC4899', emoji: '🎯', label: cm.category, labelEn: cm.category };
            const team = s.teams.find(t => t.name === cm.teamName);
            const catLabel = de ? catMeta.label : catMeta.labelEn;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
                borderRadius: 16, background: `${catMeta.color}12`,
                border: `1.5px solid ${catMeta.color}44`,
              }}>
                <span style={{ fontSize: 'clamp(28px, 3cqw, 40px)', lineHeight: 1 }}>{catMeta.emoji}</span>
                {team && <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={'clamp(36px, 4cqw, 52px)'} style={{ flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 'clamp(18px, 2cqw, 26px)', color: team?.color ?? '#e2e8f0' }}>{cm.teamName}</div>
                  <div style={{ fontSize: 'clamp(13px, 1.4cqw, 18px)', color: catMeta.color, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{catLabel}</div>
                </div>
                {statPill(cm.count, de ? 'richtig' : 'correct', catMeta.color)}
              </div>
            );
          })}
        </div>
      </div>
    )});
  }

  // #07 Perfekte Runden
  if (funStats?.perfectRounds && funStats.perfectRounds.length > 0) {
    panels.push({ key: 'perfectRounds', node: (
      <div>
        {statTitle('💯', 'Perfekte Runden', 'Perfect Rounds', '#22C55E')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {funStats.perfectRounds.slice(0, 5).map((pr, i) => {
            const team = s.teams.find(t => t.name === pr.teamName);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px',
                borderRadius: 16, background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.3)',
              }}>
                <span style={{ fontSize: 'clamp(24px, 2.6cqw, 34px)' }}><QQEmojiIcon emoji="✨"/></span>
                {team && <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={'clamp(34px, 3.6cqw, 46px)'} />}
                <span style={{ fontWeight: 900, fontSize: 'clamp(18px, 2cqw, 26px)', color: team?.color ?? '#e2e8f0' }}>{pr.teamName}</span>
                {pr.draftTitle && (
                  <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 'clamp(13px, 1.5cqw, 18px)', fontStyle: 'italic' }}>„{pr.draftTitle}"</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )});
  }

  // #08 Speed-Demon
  if (funStats?.speedDemon && funStats.speedDemon.samples >= 5) {
    panels.push({ key: 'speedDemon', node: (
      <div>
        {statTitle('⚡', 'Schnellste Minute', 'Speed Demon', '#FACC15')}
        {teamLine(funStats.speedDemon.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
          {statPill(funStats.speedDemon.avgRank.toFixed(2), de ? 'Ø Rang' : 'avg rank', '#FACC15')}
          <span style={{ color: '#94a3b8', fontSize: 'clamp(15px, 1.7cqw, 20px)' }}>
            {de ? `bei ${funStats.speedDemon.samples} Treffern` : `over ${funStats.speedDemon.samples} hits`}
          </span>
        </div>
      </div>
    )});
  }

  // #09 Bunte-Tüte-Boss (Hot-Potato)
  if (funStats?.potatoBoss && funStats.potatoBoss.total >= 2) {
    const btColor = PAUSE_CAT_ACCENT.BUNTE_TUETE.color;
    panels.push({ key: 'potatoBoss', node: (
      <div>
        {statTitle('🥔', 'Bunte-Tüte-Boss', 'Lucky Bag Boss', btColor)}
        {teamLine(funStats.potatoBoss.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {statPill(funStats.potatoBoss.total, de ? 'Heiße-Kartoffel-Treffer' : 'Hot Potato hits', btColor)}
        </div>
      </div>
    )});
  }

  // #10 Heute-Stats — nur wenn mindestens 1 Spiel heute
  if (funStats?.todayStats && funStats.todayStats.games >= 1) {
    panels.push({ key: 'today', node: (
      <div>
        {statTitle('📅', 'Heute', 'Today', '#60A5FA')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {statPill(funStats.todayStats.games, de ? 'Spiele heute' : 'games today', '#60A5FA')}
          {funStats.todayStats.topScore && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 'clamp(24px, 2.6cqw, 34px)' }}>🏅</span>
              <div>
                <div style={{ fontWeight: 900, fontSize: 'clamp(18px, 2cqw, 26px)', color: '#e2e8f0' }}>
                  {funStats.todayStats.topScore.teamName}
                </div>
                <div style={{ fontSize: 'clamp(14px, 1.6cqw, 20px)', color: '#94a3b8' }}>
                  {funStats.todayStats.topScore.score} {de ? 'Punkte' : 'points'}
                </div>
              </div>
            </div>
          )}
          {funStats.todayStats.topWinner && funStats.todayStats.topWinner.wins >= 2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 'clamp(24px, 2.6cqw, 34px)' }}><QQEmojiIcon emoji="🔥"/></span>
              <div>
                <div style={{ fontWeight: 900, fontSize: 'clamp(18px, 2cqw, 26px)', color: '#e2e8f0' }}>
                  {funStats.todayStats.topWinner.teamName}
                </div>
                <div style={{ fontSize: 'clamp(14px, 1.6cqw, 20px)', color: '#94a3b8' }}>
                  {funStats.todayStats.topWinner.wins}× {de ? 'heute gewonnen' : 'wins today'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )});
  }

  // "Gegen dich" — wenn ein All-Time-Top-Team als Team in der aktuellen Session ist,
  // aber nicht vorne liegt, ein kleines Revenge-Panel anzeigen
  const rivalName = realLeaderboard.length > 0
    ? realLeaderboard.find(e => s.teams.some(t => t.name === e.name) && sortedTeams[0]?.name !== e.name)?.name
    : null;
  if (rivalName && mode === 'pause') {
    const rival = realLeaderboard.find(e => e.name === rivalName)!;
    const rivalTeam = s.teams.find(t => t.name === rivalName);
    panels.push({ key: 'rival', node: (
      <div>
        {statTitle('⚔️', 'Offene Rechnung', 'Unfinished Business', '#F472B6')}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          {rivalTeam && <QQTeamAvatar avatarId={rivalTeam.avatarId} teamEmoji={rivalTeam?.emoji} size={'clamp(50px, 5.5cqw, 72px)'} />}
          <div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(22px, 2.6cqw, 32px)', color: rivalTeam?.color ?? '#F472B6' }}>{rivalName}</div>
            <div style={{ fontSize: 'clamp(15px, 1.7cqw, 22px)', color: '#94a3b8' }}>
              {de ? `hat schon ${rival.wins}× gewonnen — wer dreht heute das Spiel?` : `already won ${rival.wins}× — who flips the script today?`}
            </div>
          </div>
        </div>
      </div>
    )});
  }

  // Funny answers
  if (funStats?.funnyAnswers && funStats.funnyAnswers.length > 0) {
    panels.push({ key: 'funny', node: (
      <div>
        <div style={{ fontSize: 'clamp(24px, 2.8cqw, 36px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}>😂</span> {de ? 'Lustigste Antworten' : 'Funniest Answers'}
        </div>
        {funStats.funnyAnswers.map((fa, i) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: i < funStats.funnyAnswers.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div style={{ fontSize: 'clamp(22px, 2.6cqw, 30px)', fontWeight: 700, color: '#EC4899' }}>„{fa.text}"</div>
            <div style={{ fontSize: 'clamp(16px, 1.8cqw, 22px)', color: '#64748b', marginTop: 4 }}>— {fa.teamName}</div>
          </div>
        ))}
      </div>
    )});
  }

  const [panelIdx, setPanelIdx] = useState(0);
  // 2026-05-13 (Wolf-Bug 'autoplay funktioniert nicht mehr, bei standings +
  // teams-heute kein switch danach'): vorher useEffect mit deps
  // `[panels.length]` — beim asynchronen funStats-Load (Z. 148-155) wuchs
  // die panels-Anzahl mehrfach von ~5 auf 12+, jedes Mal wurde setInterval
  // gecleart und neu gestartet → counter erreichte nie 8s, kein Tick.
  // Fix: setInterval einmalig bei Mount, panels-Laenge ueber Ref auslesen.
  const panelsLenRef = useRef(panels.length);
  panelsLenRef.current = panels.length;
  useEffect(() => {
    const id = setInterval(() => {
      const len = panelsLenRef.current;
      if (len > 1) setPanelIdx(p => (p + 1) % len);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const activePanel = panels[panelIdx % Math.max(panels.length, 1)];

  // 2026-05-07 (Wolf-ESC-Sidequest): Pro-Draft Lobby-BG auch hier in PreGame
  // (Welcome-Page) anwenden — sonst sieht man den ESC-BG erst in der echten
  // Lobby, nicht im 'Gleich gehts los'-Welcome.
  // 2026-05-07: Pro-Mode-BG-Override — pause kann eigenes BG haben (Eurovision
  // bg-2 vs lobby bg-1). Fallback: lobbyBackgroundUrl.
  const bgUrl = mode === 'pause'
    ? (s.theme?.pauseBackgroundUrl ?? s.theme?.lobbyBackgroundUrl)
    : s.theme?.lobbyBackgroundUrl;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 64px 56px', position: 'relative', overflow: 'hidden',
      gap: 28,
      // Cozy-warmer Hintergrund (User-Wunsch 2026-04-28: PreGame/Pause weniger
      // schwarz, an Setup-Look angleichen). Mode-Akzent ergänzt das mit dem
      // großen Glow-Ring weiter unten.
      background:
        `radial-gradient(ellipse at 50% -10%, ${modeAccent}1A, transparent 55%), ` +
        `radial-gradient(ellipse at 85% 110%, rgba(99,102,241,0.08), transparent 55%), ` +
        `radial-gradient(ellipse at 15% 80%, rgba(244,114,182,0.05), transparent 50%), ` +
        '#0A0814',
    }}>
      {bgUrl && (
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            // 2026-05-07 (Wolf 'BG kaum sichtbar'): screen-Blend raus, opacity
            // 0.45 -> 0.65 fuer Pause/PreGame.
            opacity: 0.65,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      <Fireflies />
      {s.theme?.eurovisionMode && <EurovisionHearts />}

      {/* Ambient ring-light hinter dem Hero — pulsiert in Mode-Farbe */}
      <div style={{
        position: 'absolute',
        top: '14%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(720px, 70cqw)',
        height: 'min(720px, 70cqw)',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${modeGlow} 0%, transparent 65%)`,
        opacity: 0.65,
        animation: 'qqPauseAura 7s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* 2026-05-06 (Wolf 'mehr WOW auf gleich-gehts-los'): WOW-Layer nur fuer
          preGame-Mode. Bestehende Pause-View bleibt unveraendert.
          (1) Spotlight-Sweep wandert diagonal alle 9s — wie Buehnenscheinwerfer.
          (4) Fall-Particles: warme Funken fallen langsam von oben.
          (5) Atmender Background-Glow ueber dem ganzen Hintergrund.
          + Animierter CozyWolf rechts unten als Co-Moderator. */}
      {mode === 'preGame' && (
        <>
          {/* (5) Atmender Hintergrund-Glow — sehr subtil, langsam pulsierend.
              Liegt UNTER dem Ring-Light, wirkt wie 'Buehne laedt Energie'. */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at 50% 60%, ${modeAccent}10 0%, transparent 70%)`,
            opacity: 0,
            animation: 'qqPreGameBgBreath 9s ease-in-out infinite',
            pointerEvents: 'none', zIndex: 0,
          }} />

          {/* (1) Spotlight-Sweep — diagonaler warm-goldener Lichtkegel wandert
              alle 9s einmal von oben-links nach unten-rechts. */}
          <div aria-hidden style={{
            position: 'absolute', top: '-30%', left: '-20%',
            width: '50%', height: '160%',
            background: `linear-gradient(110deg, transparent 30%, ${modeAccent}1c 48%, rgba(255,255,255,0.10) 50%, ${modeAccent}1c 52%, transparent 70%)`,
            filter: 'blur(20px)',
            opacity: 0.7,
            transformOrigin: 'top left',
            animation: 'qqPreGameSpotlight 9s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite',
            pointerEvents: 'none', zIndex: 2, mixBlendMode: 'screen',
          }} />

          {/* (4) Fall-Particles — 8 warme Funken die langsam von oben fallen,
              gestaffelte Delays, varying Sizes/Speeds. */}
          {Array.from({ length: 8 }).map((_, i) => {
            const left = 6 + (i * 13.7) % 88;
            const dur = 11 + (i % 4) * 2.5;
            const delay = (i * 1.4) % 9;
            const size = 3 + (i % 3) * 1.5;
            return (
              <span key={`fall-${i}`} aria-hidden style={{
                position: 'absolute',
                top: '-5%', left: `${left}%`,
                width: size, height: size, borderRadius: '50%',
                background: i % 2 ? '#EC4899' : '#FBCFE8',
                boxShadow: '0 0 12px rgba(236,72,153,0.7), 0 0 4px rgba(255,255,255,0.5)',
                opacity: 0,
                animation: `qqPreGameFallParticle ${dur}s linear ${delay}s infinite`,
                pointerEvents: 'none', zIndex: 3,
              }} />
            );
          })}

          {/* Wolf-Co-Moderator unten LINKS — winkt + blinzelt + hat ab und zu
              eine Sprechblase mit Pre-Game-Sprueche.
              2026-05-06 v4 (Wolf 'sprechblase nicht zu, mund-timing'):
              Sprechblase + Wolf jetzt in einer Coordinator-Component mit
              shared State, damit Mund-Flap synchron zur Sprechblase laeuft. */}
          <div style={{
            position: 'absolute',
            left: 'clamp(20px, 3cqw, 60px)',
            bottom: 'clamp(20px, 3cqh, 50px)',
            zIndex: 6,
            pointerEvents: 'none',
            animation: 'panelSlideIn 0.8s var(--qq-ease-bounce) 1.2s both',
          }}>
            <WolfCoModerator
              lang={de ? 'de' : 'en'}
              variant="preGame"
              widthCss="clamp(190px, 19cqw, 300px)"
              eurovisionMode={s.theme?.eurovisionMode}
            />
          </div>

          <style>{`
            @keyframes qqPreGameBgBreath {
              0%, 100% { opacity: 0.0; transform: scale(0.9); }
              50%      { opacity: 0.55; transform: scale(1.08); }
            }
            @keyframes qqPreGameSpotlight {
              0%   { transform: rotate(8deg) translate(-30%, -30%); opacity: 0; }
              15%  { opacity: 0.7; }
              60%  { transform: rotate(8deg) translate(180%, 60%); opacity: 0.7; }
              80%  { opacity: 0; }
              100% { transform: rotate(8deg) translate(220%, 80%); opacity: 0; }
            }
            @keyframes qqPreGameFallParticle {
              0%   { transform: translateY(0) translateX(0); opacity: 0; }
              10%  { opacity: 0.85; }
              50%  { transform: translateY(50cqh) translateX(8px); opacity: 0.85; }
              90%  { opacity: 0.4; }
              100% { transform: translateY(110cqh) translateX(-6px); opacity: 0; }
            }
          `}</style>
        </>
      )}

      {/* 2026-05-06 v4 (Wolf 'in der pause den trinkenden Wolf'): Pause-
          Co-Moderator unten links, analog zu preGame. Wolf-Mode 'trinken'
          (kein Mund-Flap), Sprechblase mit Pause-Sprueche, Lavender-
          Akzent statt Gold. */}
      {mode === 'pause' && (
        <div style={{
          position: 'absolute',
          left: 'clamp(20px, 3cqw, 60px)',
          bottom: 'clamp(20px, 3cqh, 50px)',
          zIndex: 6,
          pointerEvents: 'none',
          animation: 'panelSlideIn 0.8s var(--qq-ease-bounce) 0.6s both',
        }}>
          <WolfCoModerator
            lang={de ? 'de' : 'en'}
            variant="pause"
            widthCss="clamp(140px, 14cqw, 220px)"
            eurovisionMode={s.theme?.eurovisionMode}
          />
        </div>
      )}

      {/* 2026-05-12 v2 (Wolf 'mach cozyquiz ueber die card und gleich gehts
          los unter die card beides mittig'): Hero ist jetzt in zwei Container
          aufgesplittet — CozyQuiz/Eyebrow OBEN ueber der Card (absolute top),
          Title 'Gleich gehts los' UNTEN unter der Card (absolute bottom).
          Beide mit left:0 right:0 + justifyContent:center fuer harte
          horizontale Zentrierung. Records-Card bleibt zwischen den beiden
          und wird via Parent's justifyContent:center vertikal mittig. */}
      <div style={{
        position: 'absolute',
        top: 'var(--qq-safe-margin)',
        left: 0,
        right: 0,
        zIndex: 5,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        animation: 'panelSlideIn 0.7s var(--qq-ease-out-cubic) both',
        pointerEvents: 'none',
      }}>
        {/* 2026-05-07 (Wolf-ESC): Edition-Eyebrow nur wenn Eurovision-Mode aktiv
            UND PreGame. Bei vorhandenem logoUrl → Logo-Bild, sonst Text-Pille. */}
        {/* 2026-05-07 v15 (Wolf 'in der lobby bitte auch das mit cozyquiz x
            eurovision'): PreGame-Eyebrow ist jetzt der gleiche Stinger wie
            auf der Welcome-Page — [CozyQuiz Stinger Fit] × [Eurovision-Logo]
            mit X-Shimmer + Logo-Hover. Kompakter als der Welcome-Hero damit
            das 'Gleich gehts los'-Title darunter dominiert. */}
        {/* 2026-05-07 v18 (Wolf 'in die pausenfolie noch gleiches COZYQUIZ x
            Eurovision songcontest'): Eyebrow jetzt auch in pause-Mode aktiv,
            nicht nur PreGame. Title 'Short Break' / 'Kurze Pause' bleibt als
            big title darunter erhalten. */}
        {/* 2026-05-08 (Wolf-Wunsch 'logo text in standard wie eurovision'):
            Standard-Drafts rendern auch den COZYQUIZ-Stinger als Eyebrow,
            in Brand-Pink statt ESC-Hot-Pink. Ohne × + ESC-Logo daneben. */}
        {(mode === 'preGame' || mode === 'pause') && !s.theme?.eurovisionMode && (
          <div style={{
            marginBottom: 8,
            animation: 'panelSlideIn 0.6s var(--qq-ease-bounce) 0.1s both',
          }}>
            <span style={{
              fontFamily: "'Stinger Fit', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
              // 2026-05-12 v3 (Wolf 'beides wieder dynamisch groesser, cozyquiz
              // etwas groesser'): CozyQuiz dominant ueber der Card. fontSize
              // wieder hochgezogen auf clamp(56px, 7cqw, 112px) — bei 1080p
              // greift 7cqw → ~134→112 (cap). Bei kleineren Beamern shrinkt's
              // proportional, safe-margin oben+unten bleibt erhalten.
              fontSize: 'clamp(56px, 7cqw, 112px)',
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: '#EC4899',
              textShadow: '0 2px 14px rgba(0,0,0,0.65), 0 0 32px rgba(236,72,153,0.6)',
              lineHeight: 0.96,
              animation: 'qqStingerHover 4.2s ease-in-out 0.6s infinite',
              display: 'inline-block',
            }}>CozyQuiz</span>
          </div>
        )}
        {(mode === 'preGame' || mode === 'pause') && s.theme?.eurovisionMode && (s.theme.logoUrl ? (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'clamp(14px, 1.6cqw, 28px)',
            marginBottom: 12,
            animation: 'panelSlideIn 0.6s var(--qq-ease-bounce) 0.1s both',
          }}>
            {/* CozyQuiz-Wordmark — 2026-05-07 v19 proportional geshrinkt zu Lobby. */}
            <span style={{
              fontFamily: "'Stinger Fit', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
              fontSize: 'clamp(42px, 5.5cqw, 82px)',
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: '#FF2D7B',
              // 2026-05-13 Kontrast-Audit: Pink-Glow weg, Dark-Halo + dezente
              // Outline (Stinger Fit weight 400 verliert sonst auf Pink-BG).
              textShadow: '0 4px 22px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.7)',
              WebkitTextStroke: '1px rgba(0,0,0,0.4)',
              lineHeight: 0.96,
              animation: 'qqStingerHover 4.2s ease-in-out 0.6s infinite',
            }}>COZYQUIZ</span>
            {/* 2026-05-07 v17 (Wolf 'X mittig, nicer animiert, eurovision
                groesser'): height: 1em fixiert vertikale Mittellage; neue
                qqStingerXShine animation (Tilt + Multi-Layer-Glow).
                2026-05-07 v19 (Wolf 'jetzt ist das x doch noch weniger
                mittig'): top:-0.08em wieder raus, stattdessen COZYQUIZ +
                Logo geshrinkt damit X proportional groesser wirkt. */}
            <span aria-hidden style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(34px, 4.6cqw, 70px)',
              lineHeight: 1,
              height: '1em',
              color: '#fde6f0',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
              animation: 'qqStingerXShine 3.5s ease-in-out 0.6s infinite',
            }}>×</span>
            {/* Eurovision-Logo — Hoehe gebumpt damit 'Eurovision Song Contest'-
                Letters optisch gleich gross sind wie das CozyQuiz-Wordmark. */}
            <span style={{ display: 'inline-flex', alignItems: 'center', animation: 'qqStingerHover 4.2s ease-in-out 0.6s infinite' }}>
              <img
                src={s.theme.logoUrl}
                alt="Eurovision Song Contest"
                draggable={false}
                style={{
                  // 2026-05-07 v19: Logo proportional zu COZYQUIZ-Shrink.
                  height: 'clamp(68px, 9.5cqh, 142px)',
                  width: 'auto',
                  filter: 'drop-shadow(0 0 18px rgba(236,72,153,0.55)) drop-shadow(0 4px 10px rgba(0,0,0,0.5))',
                }}
              />
            </span>
          </div>
        ) : (
          <div style={{
            padding: '6px 22px', borderRadius: 999,
            background: 'linear-gradient(135deg, rgba(236,72,153,0.22), rgba(168,85,247,0.18))',
            border: '2px solid rgba(236,72,153,0.55)',
            fontSize: 'clamp(13px, 1.4cqw, 18px)', fontWeight: 900,
            color: '#fde68a', letterSpacing: '0.18em', textTransform: 'uppercase',
            boxShadow: '0 0 24px rgba(236,72,153,0.35)',
            marginBottom: 6,
            animation: 'panelSlideIn 0.6s var(--qq-ease-bounce) 0.1s both',
          }}>
            🎤 Eurovision Edition
          </div>
        ))}
      </div>

      {/* Bottom-Hero — Title 'Gleich gehts los' / 'Kurze Pause' UNTER der
          Card (absolute bottom). Separater Container von der oben absoluten
          Eyebrow-Zone damit beide Texte unabhaengig mittig zentriert sind
          und die Card visuell dazwischen sitzt. */}
      <div style={{
        position: 'absolute',
        bottom: 'var(--qq-safe-margin)',
        left: 0,
        right: 0,
        zIndex: 5,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        animation: 'panelSlideIn 0.7s var(--qq-ease-out-cubic) 0.1s both',
        pointerEvents: 'none',
      }}>
        {(() => {
          const titleText = mode === 'preGame'
            ? (de ? "Gleich geht's los" : 'Starting soon')
            : (de ? 'Kurze Pause' : 'Short Break');
          return (
            <div
              aria-label={titleText}
              style={{
                // 2026-05-12 v3 (Wolf 'beides wieder dynamisch groesser,
                // cozyquiz etwas groesser'): Title hochgezogen, aber
                // clamp-Max bewusst kleiner als CozyQuiz (88 vs 112) damit
                // CozyQuiz visuell dominant bleibt.
                fontSize: 'clamp(42px, 5.5cqw, 88px)', fontWeight: 900,
                color: modeAccent,
                letterSpacing: '-0.01em',
                lineHeight: 1.05,
                // 2026-05-13 (Wolf 'NUR EUROVISION EDITION: hintergrund und text
                // sind manchmal nicht kontrastreich'): Im ESC-Mode Dark-Halo
                // first (Pink-Glow konkurrierte mit Pink-BG). WCAG-fix:
                // #FF2D7B auf 5.png/3.png Pink-Gradient war 3.0:1 (AA-Fail).
                textShadow: isEsc
                  ? '0 4px 22px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.7)'
                  : `0 0 24px ${modeGlow}, 0 0 56px ${modeGlow}`,
                whiteSpace: 'nowrap',
                display: 'inline-block',
              }}>
              {Array.from(titleText).map((ch, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    whiteSpace: ch === ' ' ? 'pre' : 'normal',
                    animation: `qqRulesTitleLetter 0.7s cubic-bezier(0.16, 1.2, 0.3, 1) ${0.15 + i * 0.05}s both, qqCatNameWave 2.6s ease-in-out ${0.85 + i * 0.07}s infinite`,
                  }}
                >{ch}</span>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Records panel — Card bleibt STABIL, nur der Inhalt wechselt mit
          weicher Cross-Fade-Animation. (User-Wunsch 2026-04-28: 'card immer
          gleich groß, nur Inhalte mit nicer Animation ändern'.)
          - Card mountet einmal (kein key), bleibt während aller Panel-Wechsel
          - Fixe minHeight verhindert Card-Resize bei Inhalts-Wechseln
          - Inner content hat key={activePanel.key} → re-mount für Fade-Anim,
            aber nur das innere Element. Card-Hülle, Border, Shimmer, Glow
            laufen ungestört durch. */}
      {activePanel && (
        // 2026-05-07 (Audit Layout #2): maxWidth 1120 → 1500. Vorher schmale
        // Insel mit ~360px Side-Whitespace je Seite auf 1080p-Beamer.
        // 2026-05-09 v3 (Wolf 'star-border soll um die ganze Card laufen,
        // nicht ein dicker Balken'): SVG-rect mit animated stroke-dashoffset
        // statt rotierendem Conic-Gradient. Light läuft sauber den Rand
        // entlang, auch bei sehr breiten Cards (1500×660). ESC-Mode lässt den
        // Effekt aus (eigene Show-Identität).
        <div style={{
          width: '100%', maxWidth: 'min(94cqw, 1500px)', position: 'relative', zIndex: 5,
          borderRadius: 26,
          isolation: 'isolate',
          // 2026-05-09 v5 (Wolf 'unter der card durch'): wrapper bekommt
          // EXPLIZITE Höhe matching inner-card (clamp 460-660). Vorher hatte
          // wrapper auto-height die durch subpixel-rounding ggf. minimal
          // anders rendert als inner-card height → SVG bottom-edge konnte
          // 1-3px tiefer sitzen.
          height: 'clamp(460px, 60cqh, 660px)',
        }}>
          {!isEsc && (
            // SVG-Border-Trace, Stroke 1px innerhalb der Bounds. Drop-Shadow
            // entfernt (vorher: 6px blur extended visibly into the
            // inner-card's eigene 0 14px 48px shadow zone unter der Card →
            // wirkte wie der Stroke wäre nach unten versetzt). Stroke 2.5px
            // + alpha 0.7 kompensiert das fehlende Glow.
            <svg
              aria-hidden
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                width: '100%', height: '100%',
                pointerEvents: 'none', zIndex: 2,
                overflow: 'visible',
                display: 'block',
                verticalAlign: 'top',
              }}
            >
              <rect
                pathLength={100}
                style={{
                  x: '1px', y: '1px',
                  width: 'calc(100% - 2px)', height: 'calc(100% - 2px)',
                  rx: '23px', ry: '23px',
                  fill: 'none',
                  stroke: 'rgba(236,72,153,0.7)',
                  strokeWidth: 2.5,
                  strokeDasharray: '9 91',
                  animation: 'qqStarBorderTrace 3.6s linear infinite',
                }}
              />
            </svg>
          )}
          <div style={{
            position: 'relative', zIndex: 1,
            background: cardBg,
            borderRadius: 24,
            padding: 'clamp(32px, 4cqw, 56px)',
            border: `1px solid ${modeAccentDim}`,
            boxShadow:
              `0 14px 48px rgba(0,0,0,0.55),` +
              `0 0 64px ${modeGlow},` +
              `0 0 0 1px rgba(255,235,200,0.04) inset,` +
              `0 -3px 0 ${modeAccent} inset`,
            // 2026-04-30 (User-Wunsch): Card-Groesse FIX, nur Text-Inhalt
            // wechselt. Vorher minHeight -> Card konnte sich vergroessern bei
            // mehr Content; jetzt height fixiert + overflow:hidden, sodass
            // Panel-Wechsel smooth wirken (kein Layout-Shift mehr).
            // 2026-05-04 (Wolf-Wunsch): Card insgesamt groesser — bisher
            // 380-560px Hoehe, 920px Breite. Jetzt 460-660px Hoehe, 1120px
            // Breite. Einheitlichkeit bleibt (clamp-Werte gelten fuer alle
            // Panels gleichermassen, kein Layout-Shift).
            height: 'clamp(460px, 60cqh, 660px)',
            animation: 'panelSlideIn 0.6s var(--qq-ease-out-cubic) both',
            overflow: 'hidden',
            // Flex-Column → Inner-Content kann via flex:1 auf volle Card-Höhe
            // wachsen + sich vertikal zentrieren.
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Akzent-Streifen oben (animated shimmer) */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, transparent, ${modeAccent}, transparent)`,
              animation: 'qqPauseShimmer 6s linear infinite',
              backgroundSize: '200% 100%',
            }} />
            {/* Subtle Inner-Glow oben-rechts */}
            <div style={{
              position: 'absolute', top: -120, right: -120, width: 320, height: 320,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${modeAccent}1c 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
            {/* Inner content — key sorgt für Re-Mount + Cross-Fade-Animation
                bei Panel-Wechsel. Card-Hülle bleibt stabil. flex:1 + justify
                center → Inhalt sitzt vertikal mittig in der Card (User-Wunsch
                'Wolf und Text zentriert mittig'). */}
            <div
              key={activePanel.key}
              style={{
                position: 'relative',
                flex: 1,
                // 2026-04-30 (User-Wunsch): Stats-Texte horizontal + vertikal
                // mittig im Card-Inneren ausrichten. justifyContent zentriert
                // vertikal, alignItems horizontal, textAlign zieht inline-Text
                // mit. Die einzelnen Panel-Nodes erben das Centering.
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                width: '100%',
                animation: 'qqPanelContentFade 0.7s var(--qq-ease-out-cubic) both',
              }}
            >
              {activePanel.node}
            </div>
          </div>
          {panels.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 22 }}>
              {panels.map((_, i) => {
                const isActive = i === panelIdx % panels.length;
                return (
                  <div key={i} style={{
                    width: isActive ? 32 : 10,
                    height: 10,
                    borderRadius: 999,
                    background: isActive
                      ? `linear-gradient(90deg, ${modeAccent}, ${modeAccent}aa)`
                      : 'rgba(255,235,200,0.16)',
                    boxShadow: isActive ? `0 0 10px ${modeGlow}` : 'none',
                    transition: 'all 0.4s var(--qq-ease-out-cubic)',
                  }} />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Hint mit Lagerfeuer-Sparkle — nur im Pause-Mode (im PreGame redundant zum großen Titel) */}
      {mode === 'pause' && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          fontSize: 'clamp(15px, 1.6cqw, 22px)', color: '#a8a395', fontWeight: 700,
          position: 'relative', zIndex: 5,
          letterSpacing: '0.04em',
        }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: modeAccent, boxShadow: `0 0 10px ${modeGlow}`,
            animation: 'qqPauseDot 1.6s ease-in-out infinite',
          }} />
          {de ? "Gleich geht's weiter…" : 'Continuing soon…'}
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: modeAccent, boxShadow: `0 0 10px ${modeGlow}`,
            animation: 'qqPauseDot 1.6s ease-in-out 0.3s infinite',
          }} />
        </div>
      )}

      <style>{`
        @keyframes qqPauseAura {
          0%, 100% { opacity: 0.55; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.8; transform: translateX(-50%) scale(1.06); }
        }
        @keyframes qqPauseTitleBreathe {
          0%, 100% { letter-spacing: -0.01em; filter: brightness(1); }
          50% { letter-spacing: 0.005em; filter: brightness(1.08); }
        }
        @keyframes qqPauseEyebrowFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes qqPauseShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes qqPauseDot {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        /* Slogan-Wechsel im BrandLoopPanel — reines Cross-Fade ohne Bewegung,
           damit Wolf und Card-Größe stabil bleiben (User-Wunsch). */
        @keyframes qqSloganFade {
          0%   { opacity: 0; }
          25%  { opacity: 0; }
          100% { opacity: 1; }
        }
        /* Sprechblase-Lebenszyklus — wird sowohl in preGame als auch pause
           verwendet, deshalb hier global statt im preGame-Block. */
        @keyframes qqWolfBubbleLife {
          0%   { opacity: 0; transform: translateY(10px) scale(0.82); }
          12%  { opacity: 1; transform: translateY(-2px) scale(1.02); }
          20%  { opacity: 1; transform: translateY(0) scale(1); }
          78%  { opacity: 1; transform: translateY(0) scale(1); }
          92%  { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-6px) scale(0.96); }
        }
      `}</style>
    </div>
  );
}
