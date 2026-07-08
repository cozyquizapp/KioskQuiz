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
import { useState, useEffect, useRef, useMemo, cloneElement, isValidElement } from 'react';
import type { ReactElement } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { QQ_AVATARS, QQ_MEGA_FACTIONS } from '../../../shared/quarterQuizTypes';
import { useLangFlip, COZY_CARD_BG } from '../cozyQuizShared';
import { qqSortedTeams, qqSortedGroups } from '../qqShared';
import { Fireflies, EurovisionHearts } from './CozyQuizAmbient';
import { GridDisplay } from './CozyQuizGridDisplay';
import { QQTeamAvatar } from './QQTeamAvatar';
import { FactionCrest } from './QQFactionCrest';
import { QQEmojiIcon, QQIcon } from './QQIcon';
import { TeamNameLabel } from './TeamNameLabel';
import { JokerIcon } from './JokerIcon';
import {
  AnimatedCozyWolf, WolfCoModerator, RoundMiniTree, getStandingAvatarSize,
  type Slogan, type LeaderEntry, type FunStats,
} from '../pages/QQBeamerPage';
import { getRoundColor } from '../qqDesignTokens';
import { QQ_COLORS } from '../../../shared/qqColors';
import { isThemed, isQuietMotion } from '../qqTheme';

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
          borderRadius: 'var(--qq-pill-radius)',
          background: 'var(--qq-surface)',
          border: '1px solid var(--qq-hairline)',
          alignSelf: 'flex-start',
        }}>
          <span style={{ fontSize: 12, lineHeight: 1 }}>🐺</span>
          <span style={{
            fontSize: 'clamp(10px, 1cqw, 13px)', fontWeight: 900,
            color: 'var(--qq-text-muted)', letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}>cozywolf</span>
          <span style={{
            width: 3, height: 3, borderRadius: '50%',
            background: 'rgba(203,213,225,0.4)',
          }} />
          <span style={{
            fontSize: 'clamp(10px, 1cqw, 13px)', fontWeight: 700,
            color: 'var(--qq-accent)', letterSpacing: '0.16em',
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
  SCHAETZCHEN:   { color: QQ_COLORS.yellow500, emoji: '🎯', label: 'Schätzchen',   labelEn: 'Close Call' },
  MUCHO:         { color: QQ_COLORS.blue500, emoji: '🔤', label: 'Mucho Choice', labelEn: 'Mu-Cho' },
  BUNTE_TUETE:   { color: QQ_COLORS.red500, emoji: '🎁', label: 'Bunte Tüte',   labelEn: 'Lucky Bag' },
  ZEHN_VON_ZEHN: { color: '#10B981', emoji: '🎲', label: '10 von 10',    labelEn: 'All In' },
  CHEESE:        { color: QQ_COLORS.violet500, emoji: '📸', label: 'Cheese!',      labelEn: 'Picture This' },
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
  const modeAccent     = isEsc ? '#FF2D7B' : (mode === 'preGame' ? 'var(--qq-accent)' : QQ_COLORS.violet400);
  // preGame-Dim/Glow ziehen den Skin-Akzent (accent-rgb-Default = altes Pink → cozy gleich).
  const modeAccentDim  = isEsc ? 'rgba(255,45,123,0.42)' : (mode === 'preGame' ? 'rgba(var(--qq-accent-rgb),0.38)' : 'rgba(167,139,250,0.42)');
  const modeGlow       = isEsc ? 'rgba(255,45,123,0.30)' : (mode === 'preGame' ? 'rgba(var(--qq-accent-rgb),0.28)' : 'rgba(167,139,250,0.28)');
  // 2026-04-30: Sprache aus Server-State (s.language) statt lokalem Auto-Flip.
  // Vorher floppte 'de' alle 8s automatisch unabhaengig vom Mod-Schalter.
  // Jetzt: 'de' sticky bei DE, 'en' sticky bei EN, 'both' flippt alle 12s
  // (wie ueberall sonst im Beamer via useLangFlip).
  const lang = useLangFlip(s.language);
  const de = lang === 'de';

  // 2026-07-02 (Wolf 'extra setup screen für große Events'): Mega Event ist ein
  // eigenständiges Format — die normalen Regeln (Brett/Joker) und die normalen
  // All-Time-Stats (Bestenliste/Rekorde) passen dort nicht. Bei largeGroupMode
  // rendert der Pre-Game/Pause-Screen stattdessen Faktions-Regeln + Faktions-Roster.
  const largeGroup = !!(s as any).largeGroupMode;

  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [funStats, setFunStats] = useState<FunStats | null>(null);
  useEffect(() => {
    // Mega Event: keine Normal-Spiel-Stats laden — Bestenliste/Rekorde/Fun-Stats
    // stammen aus dem Standard-Grid-Modus und wären für ein Groß-Event irreführend.
    if (largeGroup) return;
    const API = (import.meta as any).env?.VITE_API_BASE ?? '/api';
    fetch(`${API}/qq/leaderboard`).then(r => r.json()).then(data => {
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      if (data.totalGames) setTotalGames(data.totalGames);
      if (data.funStats) setFunStats(data.funStats);
    }).catch(() => {});
  }, [largeGroup]);

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
    // 2026-07-02 (Cozy Universe): Cozy Arena hat kein Brett/keine Joker — eigene
    // 4 Mini-Cards (Konzept-Fraktionen mit Wappen, Punkte, Tempo/Trefferquote).
    const howItems = largeGroup
      ? (de
        ? [
            { icon: '📱', title: 'Auf dem Handy', desc: 'Jedes Handy spielt mit — mehrere Handys pro Fraktion.' },
            { icon: '🛡️', title: 'Fraktionen', desc: 'Ihr gehört zu einer von 8 Fraktionen — mit eigenem Wappen & Motto.' },
            { icon: '🎯', title: 'Punkte sammeln', desc: 'Jede richtige Antwort bringt Punkte für eure Fraktion. Kein Brett, keine Felder.' },
            { icon: '⚡', title: 'Tempo & Treffer', desc: 'Je schneller richtig, desto mehr Punkte. Die Trefferquote hält es fair.' },
          ]
        : [
            { icon: '📱', title: 'On your phone', desc: 'Every phone plays — several phones per faction.' },
            { icon: '🛡️', title: 'Factions', desc: 'You belong to one of 8 factions — each with its own crest & motto.' },
            { icon: '🎯', title: 'Collect points', desc: 'Every correct answer scores points for your faction. No grid, no tiles.' },
            { icon: '⚡', title: 'Speed & accuracy', desc: 'Faster correct = more points. Hit-rate keeps it fair across factions.' },
          ])
      : (de
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
        ]);

    // 2026-05-13 (Wolf 'in setup in der card ist text teilweise zu klein,
    // entweder groesser oder bei mehr inhalten 2-spaltig'): Container von
    // 720 → 900px geweitet (mehr horizontaler Platz pro Mini-Card im 2×2-
    // Grid), Title-Schrift 20-28 → 22-32px, Desc-Schrift 15-21 → 18-26px
    // (+25%). Auf 8m Beamer-Distanz war 15px-Min unlesbar.
    panels.push({ key: 'howItWorks', node: (
      // 2026-05-07 v13 (Wolf 'mach das 2x2 grid mittig zentriert + die ueber-
      // schrift einfach drueber, plus eigene Joker-Grafik'): Panel margin 0
      // auto. JokerIcon (Spiel-Asset) statt 🃏 Emoji.
      <div style={{ width: 'min(100%, 900px)', margin: '0 auto' }}>
        <div style={{ fontSize: 'clamp(28px, 3.2cqw, 46px)', fontWeight: 900, color: 'var(--qq-card-text)', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}>📖</span>
          {de ? 'Wie funktioniert’s?' : 'How it works'}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 14,
          textAlign: 'left', // Mini-Cards bleiben links-buendig fuer Lesbarkeit
        }}>
          {howItems.map((it, i) => {
            // 2026-05-07: Joker-Mini-Card nutzt JokerIcon-Asset statt 🃏 Emoji.
            const isJoker = it.title === 'Joker';
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '15px 18px',
                borderRadius: isThemed() ? 'var(--qq-card-radius)' : 16,
                // 2026-06-24 (Lesbarkeit): Skin → echte Surface-Chip statt der
                // fast transparenten Warm-Fläche, damit der Akzent-Titel Kontrast hat.
                background: isThemed() ? 'var(--qq-surface)' : 'rgba(255,235,200,0.04)',
                border: isThemed() ? '1px solid var(--qq-hairline)' : '1px solid rgba(255,235,200,0.10)',
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
                  <div style={{ fontWeight: 900, fontSize: 'clamp(22px, 2.4cqw, 32px)', color: 'var(--qq-accent)', marginBottom: 6 }}>{it.title}</div>
                  <div style={{ fontSize: 'clamp(18px, 2cqw, 26px)', color: 'var(--qq-text-muted)', lineHeight: 1.35 }}>{it.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )});

    // 2026-07-02 (Cozy Universe): Fraktions-Roster — die 8 Tier-Fraktionen mit
    // Wappen + Motto als Identitäts-Screen. Zeigt live die Anzahl beigetretener
    // Handys je Fraktion. Ersetzt die Grid-lastige „Aktueller Stand"-Folie im Setup.
    if (largeGroup) {
      panels.push({ key: 'megaFactions', node: (
        <div style={{ width: 'min(100%, 1040px)', margin: '0 auto' }}>
          <div style={{ fontSize: 'clamp(28px, 3.2cqw, 46px)', fontWeight: 900, color: 'var(--qq-card-text)', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}>🛡️</span>
            {de ? 'Die Fraktionen' : 'The Factions'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {QQ_MEGA_FACTIONS.map((f, i) => {
              const count = s.teams.filter(t => t.avatarId === f.avatarId).length;
              const color = QQ_AVATARS.find(a => a.id === f.avatarId)?.color ?? 'var(--qq-accent)';
              return (
                <div key={f.avatarId} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '16px 10px',
                  borderRadius: isThemed() ? 'var(--qq-card-radius)' : 16,
                  background: isThemed() ? 'var(--qq-surface)' : `${color}12`,
                  border: `1.5px solid ${isThemed() ? 'var(--qq-hairline)' : `${color}44`}`,
                  animation: `panelSlideIn 0.6s var(--qq-ease-out-cubic) ${0.06 * i}s both`,
                }}>
                  <FactionCrest avatarId={f.avatarId} width={'clamp(58px, 6.2cqw, 96px)'} showName showMotto de={de} />
                  {count > 0 && (
                    <div style={{ fontSize: 'clamp(11px, 1.2cqw, 15px)', color: 'var(--qq-text-muted)', fontWeight: 800 }}>
                      {count} {count === 1 ? 'Handy' : 'Handys'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )});
    }
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
        <div style={{ fontSize: 'clamp(28px, 3.2cqw, 42px)', fontWeight: 900, color: 'var(--qq-card-text)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}><QQEmojiIcon emoji="🗺️"/></span>
          {de ? 'Wo sind wir?' : 'Where are we?'}
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        }}>
          {/* Big Round Pill — Mono: eckige Lime-Karte mit Hard-Shadow, kein Glow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 14,
            padding: '14px 32px',
            borderRadius: isQuietMotion() ? 'var(--qq-card-radius)' : 'var(--qq-pill-radius)',
            background: isQuietMotion() ? 'var(--qq-accent-light)' : `${roundColor}20`,
            border: isQuietMotion() ? '2px solid var(--qq-card-text)' : `2.5px solid ${roundColor}`,
            boxShadow: isQuietMotion() ? '5px 5px 0 var(--qq-card-text)' : `0 0 28px ${roundColor}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}>
            <span style={{
              fontSize: 'clamp(36px, 4.5cqw, 64px)', fontWeight: 900,
              color: isQuietMotion() ? 'var(--qq-card-text)' : roundColor, lineHeight: 1,
              textShadow: isQuietMotion() ? 'none' : `0 0 16px ${roundColor}88`,
              fontVariantNumeric: 'tabular-nums', letterSpacing: isQuietMotion() ? '-0.03em' : undefined,
            }}>{s.gamePhaseIndex}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.1 }}>
              <span style={{
                fontSize: 'clamp(12px, 1.2cqw, 16px)', fontWeight: 900,
                color: isQuietMotion() ? 'var(--qq-card-text)' : `${roundColor}cc`, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {de ? `Runde ${s.gamePhaseIndex} von ${s.totalPhases}` : `Round ${s.gamePhaseIndex} of ${s.totalPhases}`}
              </span>
              <span style={{
                fontSize: 'clamp(18px, 2cqw, 26px)', fontWeight: 900,
                color: 'var(--qq-card-text)',
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
    if (!largeGroup) panels.push({ key: 'currentGrid', node: (
      <div>
        <div style={{ fontSize: 'clamp(28px, 3.2cqw, 42px)', fontWeight: 900, color: 'var(--qq-card-text)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}><QQEmojiIcon emoji="🗺️"/></span>
          {de ? 'Aktuelles Brett' : 'Current Board'}
        </div>
        {(() => {
          const sortedByCells = [...s.teams].sort((a, b) => b.totalCells - a.totalCells);
          const renderPill = (t: typeof sortedByCells[number]) => (
            <div key={t.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', borderRadius: 'var(--qq-pill-radius)',
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

  // 2026-05-24 (Refactor #2): qqSortedTeams nutzt Backend-sortedTeamIds —
  // identisch zu GameOverView. Vorher 3 verschiedene Sort-Stellen im Frontend.
  const sortedTeams = qqSortedTeams(s);
  // Mega Event: nach Faktion gruppieren (Punkte summiert) statt Sub-Teams einzeln.
  // Im Setup (preGame) übernimmt der Faktions-Roster die Identität → Standings nur
  // in der Pause zeigen (dann mit echten Punkten).
  const standingsSource = largeGroup ? qqSortedGroups(s) : sortedTeams;
  if (standingsSource.length > 0 && (!largeGroup || mode === 'pause')) {
    const sortedTeams = standingsSource;
    const twoCol = sortedTeams.length >= 5;
    const rankSize = twoCol ? 'clamp(22px, 2.4cqw, 32px)' : 'clamp(28px, 3.2cqw, 42px)';
    // Avatar-Groesse via shared Helper - konsistent zu GameOverView
    const avSize   = getStandingAvatarSize(sortedTeams.length, twoCol);
    const nameSize = twoCol ? 'clamp(18px, 2cqw, 26px)'  : 'clamp(22px, 2.6cqw, 32px)';
    const valSize  = twoCol ? 'clamp(18px, 2cqw, 26px)'  : 'clamp(22px, 2.6cqw, 32px)';
    const unitSize = twoCol ? 'clamp(12px, 1.3cqw, 16px)' : 'clamp(14px, 1.6cqw, 20px)';
    panels.push({ key: 'standings', node: (
      <div>
        <div style={{ fontSize: 'clamp(24px, 2.8cqw, 36px)', fontWeight: 900, color: 'var(--qq-card-text)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
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
            // Mono: Editorial-Chart (grosse Rang-Ziffer, #1 in Lime-Karte, grosse Zahl).
            if (isQuietMotion()) {
              const isFirst = i === 0;
              return (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: twoCol ? 12 : 16,
                  padding: isFirst ? 'clamp(8px,1.1cqh,14px) clamp(12px,1.4cqw,18px)' : (twoCol ? '8px 6px' : '11px 6px'),
                  marginBottom: isFirst ? 'clamp(8px,1cqh,14px)' : 0,
                  background: isFirst ? 'var(--qq-accent-light)' : 'transparent',
                  border: isFirst ? '2px solid var(--qq-card-text)' : 'none',
                  borderRadius: isFirst ? 'var(--qq-card-radius)' : 0,
                  boxShadow: isFirst ? '5px 5px 0 var(--qq-card-text)' : 'none',
                  borderBottom: !isFirst && nextInCol ? '1px solid var(--qq-hairline)' : 'none',
                  minWidth: 0,
                }}>
                  <span style={{
                    fontSize: twoCol ? 'clamp(22px,2.6cqw,36px)' : 'clamp(28px,3.2cqw,46px)', fontWeight: 900,
                    color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                    width: twoCol ? 38 : 52, flexShrink: 0, letterSpacing: '-0.03em',
                  }}>{String(i + 1).padStart(2, '0')}</span>
                  <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={avSize} style={{ flexShrink: 0 }} />
                  <span style={{
                    flex: 1, fontWeight: 900, fontSize: nameSize, color: 'var(--qq-card-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                  }}>{t.name}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ fontSize: twoCol ? 'clamp(22px,2.6cqw,36px)' : 'clamp(28px,3.2cqw,46px)', fontWeight: 900, color: 'var(--qq-card-text)', letterSpacing: '-0.02em' }}>{t.largestConnected}</span>
                    <span style={{ fontSize: unitSize, color: 'var(--qq-text-muted)', fontWeight: 800 }}>{largeGroup ? (de ? 'Pkt' : 'pts') : `· ${t.totalCells}`}</span>
                  </span>
                </div>
              );
            }
            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: twoCol ? 12 : 18, padding: twoCol ? '8px 0' : '12px 0',
                borderBottom: nextInCol ? '1px solid var(--qq-hairline)' : 'none',
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
                  <span style={{ fontSize: valSize, fontWeight: 900, color: 'var(--qq-accent-soft)' }}>{t.largestConnected}</span>
                  <span style={{ fontSize: unitSize, color: 'var(--qq-text-muted)', fontWeight: 700 }}>{largeGroup ? (de ? 'Pkt' : 'pts') : `· ${t.totalCells}`}</span>
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
        <div style={{
          fontSize: isQuietMotion() ? 'clamp(30px, 3.6cqw, 50px)' : 'clamp(24px, 2.8cqw, 36px)',
          fontWeight: 900, color: 'var(--qq-card-text)',
          marginBottom: isQuietMotion() ? 'clamp(14px,1.8cqh,24px)' : 20,
          display: 'flex', alignItems: 'center', gap: 14,
          textTransform: isQuietMotion() ? 'uppercase' : undefined,
          letterSpacing: isQuietMotion() ? '-0.01em' : undefined,
          borderBottom: isQuietMotion() ? '3px solid var(--qq-card-text)' : undefined,
          paddingBottom: isQuietMotion() ? 'clamp(10px,1.2cqh,16px)' : undefined,
        }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}><QQEmojiIcon emoji="🏆"/></span> {de ? 'Bestenliste' : 'Leaderboard'}
          {totalGames > 0 && <span style={{ fontSize: isQuietMotion() ? 'clamp(15px, 1.7cqw, 22px)' : 'clamp(16px, 1.8cqw, 22px)', fontWeight: isQuietMotion() ? 900 : 700, color: 'var(--qq-text-muted)', letterSpacing: isQuietMotion() ? '0.08em' : undefined, marginLeft: isQuietMotion() ? 'auto' : undefined }}>({totalGames} {de ? 'Spiele' : 'games'})</span>}
        </div>
        {realLeaderboard.slice(0, 5).map((entry, i) => {
          const sessionTeam = s.teams.find(t => t.name === entry.name);
          const teamColor = sessionTeam?.color ?? (i === 0 ? 'var(--qq-accent)' : i === 1 ? 'var(--qq-text-muted)' : i === 2 ? '#F97316' : 'var(--qq-text-muted)');
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
          // Skin (Mono etc.): Editorial-Chart — grosse Rang-Ziffer 01/02/03, #1
          // in einer Lime-Karte (var(--qq-accent-light)) mit Hard-Shadow, Siege
          // als grosse Zahl rechts statt der Dunkel-Pille. Wolf-Wunsch
          // 2026-06-25 (Pre-Game in Mono zu „langweilig" + Badge dunkel-auf-dunkel).
          // NUR Studio Mono (isQuietMotion) — Cozy unverändert, SoftPop/Neo kriegen
          // später ihren eigenen Look (Per-Skin-Philosophie, Wolf-Vorgabe).
          if (isQuietMotion()) {
            const isFirst = i === 0;
            const lastCount = Math.min(realLeaderboard.length, 5);
            return (
              <div key={entry.name} style={{
                display: 'flex', alignItems: 'center', gap: 'clamp(12px, 1.5cqw, 20px)',
                padding: isFirst
                  ? 'clamp(12px,1.6cqh,18px) clamp(16px,1.8cqw,24px)'
                  : 'clamp(10px,1.3cqh,15px) clamp(4px,0.6cqw,10px)',
                marginBottom: isFirst ? 'clamp(12px,1.6cqh,20px)' : 0,
                background: isFirst ? 'var(--qq-accent-light)' : 'transparent',
                border: isFirst ? '2px solid var(--qq-card-text)' : 'none',
                borderRadius: isFirst ? 'var(--qq-card-radius)' : 0,
                boxShadow: isFirst ? '6px 6px 0 var(--qq-card-text)' : 'none',
                borderBottom: !isFirst && i < lastCount - 1 ? '1px solid var(--qq-hairline)' : 'none',
              }}>
                {/* Editorial-Rangziffer */}
                <span style={{
                  fontSize: 'clamp(32px, 4cqw, 56px)', fontWeight: 900, lineHeight: 1,
                  color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums',
                  width: 'clamp(46px, 5cqw, 74px)', flexShrink: 0, letterSpacing: '-0.03em',
                }}>{String(i + 1).padStart(2, '0')}</span>
                {avatarId
                  ? <QQTeamAvatar avatarId={avatarId} size={'clamp(40px, 4.4cqw, 58px)'} style={{ flexShrink: 0 }} />
                  : <div style={{
                      width: 'clamp(40px,4.4cqw,58px)', height: 'clamp(40px,4.4cqw,58px)', borderRadius: '50%',
                      background: 'var(--qq-surface)', border: '2px solid var(--qq-card-text)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      color: 'var(--qq-card-text)', fontSize: 'clamp(18px,2cqw,26px)', fontWeight: 900,
                    }}>?</div>}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TeamNameLabel name={entry.name} withTeamPrefix maxLines={2} shrinkAfter={16}
                    fontSize="clamp(22px, 2.6cqw, 32px)" color={'var(--qq-card-text)'} fontWeight={800} />
                  {lastPlayedLabel && (
                    <span style={{
                      fontSize: 'clamp(12px, 1.3cqw, 16px)', color: 'var(--qq-text-muted)',
                      fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>{de ? `zuletzt ${lastPlayedLabel} · ${entry.games} Spiele` : `last ${lastPlayedLabel} · ${entry.games} games`}</span>
                  )}
                </div>
                {/* Siege als grosse Editorial-Zahl statt Dunkel-Pille */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, lineHeight: 0.9, minWidth: 'clamp(48px,5cqw,72px)' }}>
                  <span style={{ fontSize: 'clamp(34px, 4.4cqw, 62px)', fontWeight: 900, color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>{entry.wins}</span>
                  <span style={{ fontSize: 'clamp(10px, 1.1cqw, 14px)', fontWeight: 900, letterSpacing: '0.14em', color: 'var(--qq-text-muted)', textTransform: 'uppercase', marginTop: 2 }}>{de ? 'Siege' : 'wins'}</span>
                </div>
              </div>
            );
          }
          return (
          <div key={entry.name} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0',
            borderBottom: i < Math.min(realLeaderboard.length, 5) - 1 ? '1px solid var(--qq-hairline)' : 'none',
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
                  fontSize: 'clamp(11px, 1.1cqw, 14px)', color: 'var(--qq-text-muted)',
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
              padding: '4px 12px', borderRadius: 'var(--qq-pill-radius)',
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
  const fallbackAvatarCircle = (sizeCss: string, c: string) => {
    const mono = isQuietMotion();
    return (
    <div style={{
      width: sizeCss, height: sizeCss, borderRadius: '50%',
      background: mono ? 'var(--qq-surface)' : `linear-gradient(135deg, ${c}22, ${c}10)`,
      border: mono ? '2px solid var(--qq-card-text)' : `2px solid ${c}55`,
      boxShadow: mono ? 'none' : `0 0 14px ${c}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      color: mono ? 'var(--qq-card-text)' : `${c}aa`,
      fontSize: `calc(${sizeCss} * 0.5)`,
      fontWeight: 900,
    }}>?</div>
    );
  };
  const teamLine = (name: string, color?: string, avatarId?: string | null) => {
    const meta = findTeamMeta(name);
    const c = color ?? meta.color ?? 'var(--qq-accent)';
    const av = avatarId ?? meta.avatarId;
    const mono = isQuietMotion(); // Mono: editorial — kein Glow, schwarzer Name
    return (
      // 2026-05-07: Avatar 68→100, Name 42→64 — Lobby-Slide-Texte groesser.
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
        {av
          ? <QQTeamAvatar avatarId={av} size={'clamp(64px, 7cqw, 100px)'} style={{ flexShrink: 0, boxShadow: mono ? 'none' : `0 0 28px ${c}55` }} />
          : fallbackAvatarCircle('clamp(64px, 7cqw, 100px)', c)}
        <span style={{ fontWeight: 900, fontSize: 'clamp(36px, 4.2cqw, 64px)', color: mono ? 'var(--qq-card-text)' : c, textShadow: mono ? 'none' : `0 0 22px ${c}44` }}>{name}</span>
      </div>
    );
  };
  // Inline-Variante fuer kompakte Records (Avatar + Name in einer Zeile mit Stat).
  const teamInline = (name: string, accentFallback = QQ_COLORS.brandPink) => {
    const meta = findTeamMeta(name);
    const c = meta.color ?? accentFallback;
    const mono = isQuietMotion();
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, verticalAlign: 'middle' }}>
        {meta.avatarId
          ? <QQTeamAvatar avatarId={meta.avatarId} size={'clamp(28px, 2.8cqw, 36px)'} style={{ flexShrink: 0, boxShadow: mono ? 'none' : `0 0 10px ${c}55` }} />
          : fallbackAvatarCircle('clamp(28px, 2.8cqw, 36px)', c)}
        <strong style={{ color: mono ? 'var(--qq-card-text)' : c }}>{name}</strong>
      </span>
    );
  };

  // Records — nur Einträge mit echten Werten zeigen (0-Records sind irreführend)
  if (funStats) {
    const records: React.ReactNode[] = [];
    if (funStats.highestScore && funStats.highestScore.score > 0) {
      records.push(
        <div key="hs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6cqw, 48px)' }}><QQEmojiIcon emoji="🔥"/></span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(26px, 3cqw, 40px)', color: 'var(--qq-card-text)' }}>{de ? 'Höchster Score' : 'Highest Score'}</div>
            <div style={{ fontSize: 'clamp(22px, 2.4cqw, 32px)', color: isThemed() ? 'var(--qq-card-text)' : 'var(--qq-text-muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {teamInline(funStats.highestScore.teamName)} — {funStats.highestScore.score} {de ? 'Punkte' : 'points'}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.closestGame && funStats.closestGame.gap > 0) {
      records.push(
        <div key="cg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6cqw, 48px)' }}>⚔️</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(26px, 3cqw, 40px)', color: 'var(--qq-card-text)' }}>{de ? 'Knappster Sieg' : 'Closest Game'}</div>
            <div style={{ fontSize: 'clamp(22px, 2.4cqw, 32px)', color: isThemed() ? 'var(--qq-card-text)' : 'var(--qq-text-muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {teamInline(funStats.closestGame.teams[0])} vs {teamInline(funStats.closestGame.teams[1])} — {de ? `nur ${funStats.closestGame.gap} Pkt.` : `only ${funStats.closestGame.gap} pts apart`}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.winStreak && funStats.winStreak.streak >= 2) {
      records.push(
        <div key="ws" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6cqw, 48px)' }}><QQEmojiIcon emoji="🔥"/></span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(26px, 3cqw, 40px)', color: 'var(--qq-card-text)' }}>{de ? 'Siegesserie' : 'Win Streak'}</div>
            <div style={{ fontSize: 'clamp(22px, 2.4cqw, 32px)', color: isThemed() ? 'var(--qq-card-text)' : 'var(--qq-text-muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {teamInline(funStats.winStreak.teamName)} — {funStats.winStreak.streak}x {de ? 'in Folge' : 'in a row'}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.fastestAnswer && funStats.fastestAnswer.ms >= 100) {
      const secs = (funStats.fastestAnswer.ms / 1000).toFixed(1);
      records.push(
        <div key="fa" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6cqw, 48px)' }}><QQEmojiIcon emoji="⚡"/></span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(26px, 3cqw, 40px)', color: 'var(--qq-card-text)' }}>{de ? 'Schnellste Antwort' : 'Fastest Answer'}</div>
            <div style={{ fontSize: 'clamp(22px, 2.4cqw, 32px)', color: isThemed() ? 'var(--qq-card-text)' : 'var(--qq-text-muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {teamInline(funStats.fastestAnswer.teamName)} — {secs}s {de ? 'Vorsprung' : 'ahead'}
            </div>
          </div>
        </div>
      );
    }
    if (records.length > 0) {
      panels.push({ key: 'records', node: (
        <div>
          <div style={{ fontSize: 'clamp(32px, 3.6cqw, 52px)', fontWeight: 900, color: 'var(--qq-card-text)', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, textTransform: isQuietMotion() ? 'uppercase' : undefined, letterSpacing: isQuietMotion() ? '-0.01em' : undefined }}>
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
  const statTitle = (icon: string, titleDe: string, titleEn: string, accentColor?: string) => {
    // Mono: editorial — schwarzer Titel (kein Akzent-Farb-Leak), uppercase.
    const mono = isQuietMotion();
    return (
    <div style={{
      fontSize: mono ? 'clamp(34px, 3.8cqw, 56px)' : 'clamp(32px, 3.6cqw, 52px)', fontWeight: 900,
      color: mono ? 'var(--qq-card-text)' : (accentColor ?? 'var(--qq-card-text)'),
      marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
      textTransform: mono ? 'uppercase' : undefined,
      letterSpacing: mono ? '-0.01em' : undefined,
    }}>
      <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}><QQEmojiIcon emoji={icon}/></span>
      {de ? titleDe : titleEn}
    </div>
    );
  };

  // Stat-Pille. Cozy: warmer Dark-Card-bg + Akzent-Border. Skin (Mono etc.):
  // eckiger Hard-Shadow-Chip mit schwarzem Wert (kein Cyan/Pink-Leak, lesbar
  // auf hellem BG) — passt zum Editorial-Look der Bestenliste.
  const statPill = (value: string | number, label: string, accent = QQ_COLORS.brandPink) => {
    const themed = isQuietMotion(); // Editorial-Chip NUR in Mono; Cozy/SoftPop/Neo = Original
    return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 12,
      padding: '12px 24px',
      borderRadius: themed ? 'var(--qq-card-radius)' : 'var(--qq-pill-radius)',
      background: themed ? 'var(--qq-card-bg)' : 'linear-gradient(180deg, #241a10, #1a120a)',
      border: themed ? '2px solid var(--qq-card-text)' : `1.5px solid ${accent}55`,
      color: 'var(--qq-card-text)',
      fontSize: 'clamp(22px, 2.4cqw, 32px)', fontWeight: 900,
      boxShadow: themed ? '4px 4px 0 var(--qq-card-text)' : `0 0 18px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
    }}>
      <span style={{ color: themed ? 'var(--qq-card-text)' : accent, fontSize: 'clamp(30px, 3.2cqw, 44px)', lineHeight: 1 }}>{value}</span>
      <span style={{ color: 'var(--qq-text-muted)', fontSize: 'clamp(15px, 1.5cqw, 22px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
    </span>
    );
  };

  // Mono-Hero-Stat: die Kennzahl RIESIG rausgespielt (Magazin-Stil), damit der
  // Slide die ganze Karte füllt statt als kleiner Cluster in der Mitte zu kleben
  // (Wolf 2026-06-25 'platz nicht gut genutzt'). Nur Studio Mono. Höhe via cqh,
  // damit sie sich an die Karte (clamp 460–660px) anpasst.
  const statHero = (value: React.ReactNode, label: string, sub?: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(4px,0.8cqh,12px)', width: '100%' }}>
      <span style={{
        fontSize: 'clamp(110px, min(20cqw, 34cqh), 300px)', fontWeight: 900,
        color: 'var(--qq-card-text)', fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.05em', lineHeight: 0.78,
      }}>{value}</span>
      <span style={{
        fontSize: 'clamp(16px, 2.1cqw, 34px)', fontWeight: 900, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--qq-text-muted)',
      }}>{label}</span>
      {sub && <span style={{ fontSize: 'clamp(15px, 1.7cqw, 24px)', color: 'var(--qq-text-muted)', fontWeight: 700, marginTop: 'clamp(4px,0.6cqh,10px)' }}>{sub}</span>}
    </div>
  );

  // Big-Team-Line: Avatar + Name (farblich akzentuiert)
  // (helpers moved up — see findTeamMeta / teamLine / teamInline above)

  // #01 Hot-Streak live — aktueller Session-Leader + Abstand
  // (Mega: „Felder Vorsprung" passt nicht — Faktions-Standings zeigen es bereits.)
  if (sortedTeams.length >= 2 && mode === 'pause' && !largeGroup) {
    const leader = sortedTeams[0];
    const runnerUp = sortedTeams[1];
    const gap = leader.totalCells - runnerUp.totalCells;
    if (gap > 0) {
      panels.push({ key: 'hotStreak', node: (
        <div>
          {statTitle('🔥', 'Heiße Phase', 'Hot Streak', '#F97316')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {teamLine(leader.name, leader.color, leader.avatarId)}
            {isQuietMotion()
              ? <div style={{ marginTop: 0 }}>{statHero(`+${gap}`, de ? 'Felder Vorsprung' : 'cells lead', de ? `vor ${runnerUp.name}` : `ahead of ${runnerUp.name}`)}</div>
              : <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {statPill(`+${gap}`, de ? 'Felder Vorsprung' : 'cells lead', '#F97316')}
                  <span style={{ color: 'var(--qq-text-muted)', fontSize: 'clamp(17px, 1.9cqw, 24px)', fontWeight: 700 }}>
                    {de ? `vor ${runnerUp.name}` : `ahead of ${runnerUp.name}`}
                  </span>
                </div>}
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
        {isQuietMotion()
          ? <div style={{ marginTop: 0 }}>{statHero(funStats.jokerKing.total, de ? 'Joker gesichert' : 'jokers earned')}</div>
          : <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {statPill(funStats.jokerKing.total, de ? 'Joker gesichert' : 'jokers earned', '#A855F7')}
            </div>}
      </div>
    )});
  }

  // #03 Comeback-King
  if (funStats?.comebackKing && funStats.comebackKing.total >= 1) {
    panels.push({ key: 'comebackKing', node: (
      <div>
        {statTitle('🦅', 'Comeback-King', 'Comeback King', '#38BDF8')}
        {teamLine(funStats.comebackKing.teamName)}
        {isQuietMotion()
          ? <div style={{ marginTop: 0 }}>{statHero(funStats.comebackKing.total, de ? 'Aufholsiege' : 'comeback wins', de ? 'vom Letzten zum Gewinner' : 'from last place to winner')}</div>
          : <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
              {statPill(funStats.comebackKing.total, de ? 'Aufholsiege' : 'comeback wins', '#38BDF8')}
              <span style={{ color: 'var(--qq-text-muted)', fontSize: 'clamp(15px, 1.7cqw, 20px)' }}>
                {de ? 'vom Letzten zum Gewinner' : 'from last place to winner'}
              </span>
            </div>}
      </div>
    )});
  }

  // #04 Steal-Master
  if (funStats?.stealMaster && funStats.stealMaster.total >= 2) {
    panels.push({ key: 'stealMaster', node: (
      <div>
        {statTitle('🗡️', 'Steal-Master', 'Steal Master', QQ_COLORS.red500)}
        {teamLine(funStats.stealMaster.teamName)}
        {isQuietMotion()
          ? <div style={{ marginTop: 0 }}>{statHero(funStats.stealMaster.total, de ? 'Felder geklaut' : 'cells stolen')}</div>
          : <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {statPill(funStats.stealMaster.total, de ? 'Felder geklaut' : 'cells stolen', QQ_COLORS.red500)}
            </div>}
      </div>
    )});
  }

  // #05 Underdog (wenige Spiele, aber Siege)
  if (funStats?.underdog) {
    panels.push({ key: 'underdog', node: (
      <div>
        {statTitle('🐺', 'Underdog', 'Underdog', '#22D3EE')}
        {teamLine(funStats.underdog.teamName)}
        {isQuietMotion()
          ? <div style={{ marginTop: 0 }}>{statHero(funStats.underdog.wins, de ? 'Siege' : 'wins', de ? `${funStats.underdog.games} Spiele · frisch & gefährlich` : `${funStats.underdog.games} games · fresh & dangerous`)}</div>
          : <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {statPill(funStats.underdog.wins, de ? 'Siege' : 'wins', '#22D3EE')}
              {statPill(funStats.underdog.games, de ? 'Spiele' : 'games', QQ_COLORS.slate500)}
              <span style={{ color: 'var(--qq-text-muted)', fontSize: 'clamp(14px, 1.6cqw, 18px)', alignSelf: 'center' }}>
                {de ? 'frisch & gefährlich' : 'fresh & dangerous'}
              </span>
            </div>}
      </div>
    )});
  }

  // #06 Kategorie-Meister (Top-3 Teams mit bester Kategorie)
  if (funStats?.categoryMasters && funStats.categoryMasters.length > 0) {
    panels.push({ key: 'catMasters', node: (
      <div>
        {statTitle('👑', 'Kategorie-Meister', 'Category Masters', QQ_COLORS.brandPink)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {funStats.categoryMasters.map((cm, i) => {
            const catMeta = PAUSE_CAT_ACCENT[cm.category] ?? { color: 'var(--qq-accent)', emoji: '🎯', label: cm.category, labelEn: cm.category };
            const team = s.teams.find(t => t.name === cm.teamName);
            const catLabel = de ? catMeta.label : catMeta.labelEn;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
                borderRadius: isThemed() ? 'var(--qq-card-radius)' : 16,
                background: isQuietMotion() ? 'var(--qq-card-bg)' : `${catMeta.color}12`,
                border: isQuietMotion() ? '2px solid var(--qq-card-text)' : `1.5px solid ${catMeta.color}44`,
                boxShadow: isQuietMotion() ? '4px 4px 0 var(--qq-card-text)' : undefined,
              }}>
                <span style={{ fontSize: 'clamp(28px, 3cqw, 40px)', lineHeight: 1 }}>{catMeta.emoji}</span>
                {team && <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={'clamp(36px, 4cqw, 52px)'} style={{ flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 'clamp(18px, 2cqw, 26px)', color: isQuietMotion() ? 'var(--qq-card-text)' : (team?.color ?? 'var(--qq-card-text)') }}>{cm.teamName}</div>
                  <div style={{ fontSize: 'clamp(13px, 1.4cqw, 18px)', color: isQuietMotion() ? 'var(--qq-text-muted)' : catMeta.color, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{catLabel}</div>
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
        {statTitle('💯', 'Perfekte Runden', 'Perfect Rounds', QQ_COLORS.green500)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {funStats.perfectRounds.slice(0, 5).map((pr, i) => {
            const team = s.teams.find(t => t.name === pr.teamName);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px',
                borderRadius: isThemed() ? 'var(--qq-card-radius)' : 16,
                background: isQuietMotion() ? 'var(--qq-card-bg)' : 'rgba(34,197,94,0.08)',
                border: isQuietMotion() ? '2px solid var(--qq-card-text)' : '1px solid rgba(34,197,94,0.3)',
                boxShadow: isQuietMotion() ? '4px 4px 0 var(--qq-card-text)' : undefined,
              }}>
                <span style={{ fontSize: 'clamp(24px, 2.6cqw, 34px)' }}><QQEmojiIcon emoji="✨"/></span>
                {team && <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={'clamp(34px, 3.6cqw, 46px)'} />}
                <span style={{ fontWeight: 900, fontSize: 'clamp(18px, 2cqw, 26px)', color: isQuietMotion() ? 'var(--qq-card-text)' : (team?.color ?? 'var(--qq-card-text)') }}>{pr.teamName}</span>
                {pr.draftTitle && (
                  <span style={{ marginLeft: 'auto', color: 'var(--qq-text-muted)', fontSize: 'clamp(13px, 1.5cqw, 18px)', fontStyle: 'italic' }}>„{pr.draftTitle}"</span>
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
        {isQuietMotion()
          ? <div style={{ marginTop: 0 }}>{statHero(funStats.speedDemon.avgRank.toFixed(2), de ? 'Ø Rang' : 'avg rank', de ? `bei ${funStats.speedDemon.samples} Treffern` : `over ${funStats.speedDemon.samples} hits`)}</div>
          : <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
              {statPill(funStats.speedDemon.avgRank.toFixed(2), de ? 'Ø Rang' : 'avg rank', '#FACC15')}
              <span style={{ color: 'var(--qq-text-muted)', fontSize: 'clamp(15px, 1.7cqw, 20px)' }}>
                {de ? `bei ${funStats.speedDemon.samples} Treffern` : `over ${funStats.speedDemon.samples} hits`}
              </span>
            </div>}
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
        {isQuietMotion()
          ? <div style={{ marginTop: 0 }}>{statHero(funStats.potatoBoss.total, de ? 'Heiße-Kartoffel-Treffer' : 'Hot Potato hits')}</div>
          : <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {statPill(funStats.potatoBoss.total, de ? 'Heiße-Kartoffel-Treffer' : 'Hot Potato hits', btColor)}
            </div>}
      </div>
    )});
  }

  // #10 Heute-Stats — nur wenn mindestens 1 Spiel heute
  if (funStats?.todayStats && funStats.todayStats.games >= 1) {
    panels.push({ key: 'today', node: (
      <div>
        {statTitle('📅', 'Heute', 'Today', QQ_COLORS.blue400)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: isQuietMotion() ? 'center' : undefined }}>
          {statPill(funStats.todayStats.games, de ? 'Spiele heute' : 'games today', QQ_COLORS.blue400)}
          {funStats.todayStats.topScore && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 'clamp(24px, 2.6cqw, 34px)' }}>🏅</span>
              <div>
                <div style={{ fontWeight: 900, fontSize: 'clamp(18px, 2cqw, 26px)', color: 'var(--qq-card-text)' }}>
                  {funStats.todayStats.topScore.teamName}
                </div>
                <div style={{ fontSize: 'clamp(14px, 1.6cqw, 20px)', color: 'var(--qq-text-muted)' }}>
                  {funStats.todayStats.topScore.score} {de ? 'Punkte' : 'points'}
                </div>
              </div>
            </div>
          )}
          {funStats.todayStats.topWinner && funStats.todayStats.topWinner.wins >= 2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 'clamp(24px, 2.6cqw, 34px)' }}><QQEmojiIcon emoji="🔥"/></span>
              <div>
                <div style={{ fontWeight: 900, fontSize: 'clamp(18px, 2cqw, 26px)', color: 'var(--qq-card-text)' }}>
                  {funStats.todayStats.topWinner.teamName}
                </div>
                <div style={{ fontSize: 'clamp(14px, 1.6cqw, 20px)', color: 'var(--qq-text-muted)' }}>
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
        {statTitle('⚔️', 'Offene Rechnung', 'Unfinished Business', QQ_COLORS.brandPinkMid)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', justifyContent: isQuietMotion() ? 'center' : undefined }}>
          {rivalTeam && <QQTeamAvatar avatarId={rivalTeam.avatarId} teamEmoji={rivalTeam?.emoji} size={'clamp(50px, 5.5cqw, 72px)'} />}
          <div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(22px, 2.6cqw, 32px)', color: isQuietMotion() ? 'var(--qq-card-text)' : (rivalTeam?.color ?? QQ_COLORS.brandPinkMid) }}>{rivalName}</div>
            <div style={{ fontSize: 'clamp(15px, 1.7cqw, 22px)', color: 'var(--qq-text-muted)' }}>
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
        <div style={{ fontSize: 'clamp(24px, 2.8cqw, 36px)', fontWeight: 900, color: 'var(--qq-card-text)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s var(--qq-ease-bounce) 0.25s both' }}>😂</span> {de ? 'Lustigste Antworten' : 'Funniest Answers'}
        </div>
        {funStats.funnyAnswers.map((fa, i) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: i < funStats.funnyAnswers.length - 1 ? '1px solid var(--qq-hairline)' : 'none' }}>
            <div style={{ fontSize: 'clamp(22px, 2.6cqw, 30px)', fontWeight: 700, color: 'var(--qq-accent)' }}>„{fa.text}"</div>
            <div style={{ fontSize: 'clamp(16px, 1.8cqw, 22px)', color: 'var(--qq-text-muted)', marginTop: 4 }}>— {fa.teamName}</div>
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
      // 2026-06-24 (Skin): aktiver Skin → flacher Skin-BG statt Pink-Glow-Dunkel.
      background: isThemed()
        ? 'var(--qq-bg)'
        : `radial-gradient(ellipse at 50% -10%, ${modeAccent}1A, transparent 55%), ` +
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
          {/* Ambient-WOW (Glow/Spotlight/Fall-Partikel): in Quiet Motion (Mono)
              aus (Wolf 2026-06-25) — der CozyWolf-Co-Moderator bleibt. */}
          {!isQuietMotion() && (<>
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
                background: i % 2 ? 'var(--qq-accent)' : 'var(--qq-accent-soft)',
                boxShadow: '0 0 12px rgba(var(--qq-accent-rgb),0.7), 0 0 4px rgba(255,255,255,0.5)',
                opacity: 0,
                animation: `qqPreGameFallParticle ${dur}s linear ${delay}s infinite`,
                pointerEvents: 'none', zIndex: 3,
              }} />
            );
          })}
          </>)}

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
              fontFamily: 'var(--font-brand)',
              // 2026-05-12 v3 (Wolf 'beides wieder dynamisch groesser, cozyquiz
              // etwas groesser'): CozyQuiz dominant ueber der Card. fontSize
              // wieder hochgezogen auf clamp(56px, 7cqw, 112px) — bei 1080p
              // greift 7cqw → ~134→112 (cap). Bei kleineren Beamern shrinkt's
              // proportional, safe-margin oben+unten bleibt erhalten.
              fontSize: 'clamp(56px, 7cqw, 112px)',
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: 'var(--qq-accent)',
              textShadow: '0 2px 14px rgba(0,0,0,0.65), 0 0 32px rgba(236,72,153,0.6)',
              lineHeight: 0.96,
              animation: 'qqStingerHover 4.2s ease-in-out 0.6s infinite',
              display: 'inline-block',
              textTransform: 'uppercase',
            }}>COZYQUIZ</span>
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
              fontFamily: 'var(--font-brand)',
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
            padding: '6px 22px', borderRadius: 'var(--qq-pill-radius)',
            background: isThemed() ? 'var(--qq-surface)' : 'linear-gradient(135deg, rgba(236,72,153,0.22), rgba(168,85,247,0.18))',
            border: isThemed() ? '2px solid var(--qq-hairline)' : '2px solid rgba(236,72,153,0.55)',
            fontSize: 'clamp(13px, 1.4cqw, 18px)', fontWeight: 900,
            color: isThemed() ? 'var(--qq-accent)' : QQ_COLORS.yellow300, letterSpacing: '0.18em', textTransform: 'uppercase',
            boxShadow: isThemed() ? 'none' : '0 0 24px rgba(236,72,153,0.35)',
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
          borderRadius: isThemed() ? 'var(--qq-card-radius)' : 26,
          isolation: 'isolate',
          // 2026-05-09 v5 (Wolf 'unter der card durch'): wrapper bekommt
          // EXPLIZITE Höhe matching inner-card (clamp 460-660). Vorher hatte
          // wrapper auto-height die durch subpixel-rounding ggf. minimal
          // anders rendert als inner-card height → SVG bottom-edge konnte
          // 1-3px tiefer sitzen.
          height: 'clamp(460px, 60cqh, 660px)',
        }}>
          {/* 2026-05-17 (Wolf): qqStarBorderTrace SVG-Sweep entfernt — too much
              in Lobby/Setup/Pause. Card-Glow + soft Border reichen als visuelles
              Anchor. Keyframe bleibt in qqShared.ts für Thanks-View und ggf.
              Re-Aktivierung später. */}
          <div style={{
            position: 'relative', zIndex: 1,
            background: cardBg,
            borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24,
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
              {/* „Platz besser verteilen" (Wolf 2026-06-25 Mono, 2026-07-04 auf
                  ALLE Skins erweitert — Wolf 'nutzt den Platz nicht smart, könnte
                  im Einzelfall deutlich größer sein auf Beamer'): den Panel-Node
                  auf volle Kartenhöhe ziehen + Inhalt gleichmässig verteilen
                  (space-evenly), statt als kleinen Cluster mittig zu zentrieren.
                  So füllt z.B. eine 3-Zeilen-Bestenliste die ganze Card statt in
                  der Mitte zu schweben. Zentral via cloneElement → gilt für ALLE
                  Slides ohne jeden einzeln umzubauen. */}
              {isValidElement(activePanel.node)
                ? cloneElement(activePanel.node as ReactElement<{ style?: React.CSSProperties }>, {
                    style: {
                      ...((activePanel.node as ReactElement<{ style?: React.CSSProperties }>).props.style || {}),
                      height: '100%', width: '100%', boxSizing: 'border-box',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly',
                    },
                  })
                : activePanel.node}
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
                    borderRadius: 'var(--qq-pill-radius)',
                    // Aktiv: solid modeAccent (Gradient `${var}aa` war ungueltige
                    // CSS -> Balken unsichtbar). Inaktiv: Skin-Hairline statt
                    // cream-weiss (war auf hellen Skins unsichtbar).
                    background: isActive
                      ? modeAccent
                      : (isThemed() ? 'var(--qq-hairline)' : 'rgba(255,235,200,0.16)'),
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
          fontSize: 'clamp(15px, 1.6cqw, 22px)', color: isThemed() ? 'var(--qq-text-muted)' : '#a8a395', fontWeight: 700,
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
