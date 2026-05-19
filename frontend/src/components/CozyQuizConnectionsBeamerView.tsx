/**
 * CozyQuizConnectionsBeamerView — 4×4 Connections Finalrunde (Beamer).
 *
 * Spieler muessen 16 Begriffe in 4 Gruppen sortieren. Live-Updates:
 * gefundene Gruppen werden eingeblendet, Strikes pro Team gezaehlt. Pro
 * korrekte Gruppe = 1 Stapel-Bonus auf Team-Felder. Inkl. Intro-Screen,
 * Header mit Timer, Grid mit Team-Avataren auf gefundenen Gruppen.
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-13 (Refactor Phase 4).
 * Mit-extrahiert: ConnectionsHeader, ConnectionsTimer, ConnectionsIntro,
 * ConnectionsRulePill, ConnectionsGrid, ConnectionsAnswerStatus (alle
 * lokale Helpers nur fuer diese View).
 * 1 externer Importer.
 */
import { useState, useEffect } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { useLangFlip } from '../cozyQuizShared';
import { Fireflies } from './CozyQuizAmbient';
import { PlacementView } from './CozyQuizPlacementView';
import { QQTeamAvatar } from './QQTeamAvatar';
import { getServerNow } from '../utils/serverTime';

// ═══════════════════════════════════════════════════════════════════════════════
// 4×4 CONNECTIONS — Finalrunde (Beamer)
// ═══════════════════════════════════════════════════════════════════════════════

const CONNECTIONS_GROUP_COLORS = ['#EC4899', '#22C55E', '#60A5FA', '#A78BFA']; // gelb, grün, blau, lila

export function ConnectionsBeamerView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const c = s.connections;
  if (!c) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        {lang === 'de' ? '4×4 wird vorbereitet…' : '4×4 is loading…'}
      </div>
    );
  }

  // Bug-Fix 2026-04-28 (10-prompt-old): Während c.phase === 'placement' soll
  // das TERRITORY-GRID gezeigt werden (wo die Teams setzen), nicht das 4×4-
  // Items-Grid. Das 4×4 hat seine Funktion erfüllt — jetzt ist Placement
  // wichtig, sonst sieht man "Setzen läuft" ohne Grid zum Setzen. Wir
  // delegieren an PlacementView (gleiches Look wie nach normaler Runde).
  // v3 round 7 (User-Bug 'leerer screen mit finale-badge nach setzen'):
  // 'done'-Phase rendert das gleiche Placement-Grid, damit das End-Resultat
  // sichtbar bleibt bis der Mod weiterklickt (oder Autoplay nach 9s feuert).
  // 2026-05-08 (Wolf-Wunsch 'nice Übergänge'): Sub-Phase-Wechsel mit Slide-In
  // (intro → active → reveal → placement). Wrapper umfasst alle Returns
  // damit auch der Wechsel zu PlacementView animiert ist.
  const subPhaseKey = `cn-${c.phase}`;
  const wrapStyle: React.CSSProperties = {
    flex: 1, display: 'flex', flexDirection: 'column',
    animation: 'qqStageSlideInRight 0.55s cubic-bezier(0.34, 1.30, 0.64, 1) both',
    willChange: 'transform, opacity',
  };
  if (c.phase === 'placement' || c.phase === 'done') {
    return (
      <div key={subPhaseKey} style={wrapStyle}>
        <PlacementView state={s} />
      </div>
    );
  }

  const showBoard = c.phase === 'active' || c.phase === 'reveal';

  return (
    <div key={subPhaseKey} style={{
      ...wrapStyle,
      alignItems: 'stretch',
      gap: 'clamp(10px, 1.4cqh, 18px)',
      padding: 'clamp(16px, 2cqh, 28px) clamp(20px, 2.5cqw, 40px)',
      position: 'relative',
    }}>
      <Fireflies color="rgba(236,72,153,0.30)" />
      <ConnectionsHeader state={s} />
      {c.phase === 'intro' && <ConnectionsIntro state={s} />}
      {showBoard && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
          <ConnectionsGrid state={s} />
        </div>
      )}
      {showBoard && <ConnectionsAnswerStatus state={s} />}
    </div>
  );
}

/**
 * Header — gleicher Stil wie bei Mucho/Cheese-Fragen:
 * - Kategorie-Pill oben links (Icon + Name + Akzent-Border)
 * - Timer/Phase-Status oben rechts
 * Statt absolute-Positionierung ein flex-row, weil ConnectionsBeamerView
 * bereits einen padded container hat.
 */
function ConnectionsHeader({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const c = s.connections!;
  const accent = '#EC4899';
  // Event-Wording — kurz und groß auf der Bühne. „Großes Finale" griffig
  // genug für Live-Quiz, vermeidet das technische „4×4 Connections".
  const labelDe = 'Großes Finale';
  const labelEn = 'Grand Finale';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 16, position: 'relative', zIndex: 5,
    }}>
      {/* Kategorie-Pill links — gleiche Optik wie bei den anderen Fragen */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '8px 22px', borderRadius: 999,
        background: `${accent}22`, border: `2px solid ${accent}44`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'contentReveal 0.35s var(--qq-ease-pop-fast) both',
      }}>
        <span style={{ fontSize: 'clamp(20px, 2.2cqw, 30px)', lineHeight: 1 }}>🔗</span>
        <span style={{
          fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900,
          color: accent, letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>{lang === 'de' ? labelDe : labelEn}</span>
      </div>

      {/* Status / Timer rechts.
          2026-05-06 (Konsistenz-Audit S2#4): 'Auflösung'-Pille raus —
          keine andere Standard-Kategorie zeigt sie. 'Setzen läuft'-Pille
          bleibt, weil Placement-Phase im Finale wirklich eine eigene
          Mod-Phase ist (anders als Standard-Reveal). */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.2s both',
      }}>
        {c.phase === 'active' && <ConnectionsTimer endsAt={c.endsAt} />}
        {c.phase === 'placement' && (
          <div style={{
            padding: '8px 18px', borderRadius: 999,
            background: 'rgba(34,197,94,0.18)', border: '2px solid rgba(34,197,94,0.5)',
            fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900, color: '#86EFAC',
            letterSpacing: '0.04em',
          }}>
            {lang === 'de' ? 'Setzen läuft' : 'Placement'}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionsTimer({ endsAt }: { endsAt: number }) {
  // 2026-05-19 (Wolf 'beamer timer +6s vs moderator'): getServerNow statt Date.now.
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - getServerNow()) / 1000));
  useEffect(() => {
    const iv = setInterval(() => {
      const r = Math.max(0, (endsAt - getServerNow()) / 1000);
      setRemaining(r);
    }, 250);
    return () => clearInterval(iv);
  }, [endsAt]);
  const m = Math.floor(remaining / 60);
  const sec = Math.floor(remaining % 60);
  const urgent = remaining <= 30;
  // 2026-05-05 (Wolf-Bug 'finale timer anders, hier wird mit symbolen
  // gearbeitet'): Symbol-Emoji ⏱ entfernt, Pill-Stil dem Standard-Question-
  // Timer angepasst (höher, fett, mit subtilem Pulse bei urgent — kein
  // generic 'pulse'-Animation mehr, sondern qqTimerOutro-Style).
  return (
    <div style={{
      padding: 'clamp(8px, 1.2cqh, 14px) clamp(16px, 2cqw, 28px)',
      borderRadius: 16,
      background: urgent
        ? 'linear-gradient(135deg, rgba(239,68,68,0.28), rgba(239,68,68,0.12))'
        : 'linear-gradient(135deg, rgba(236,72,153,0.22), rgba(236,72,153,0.08))',
      border: `2.5px solid ${urgent ? '#EF4444' : 'rgba(236,72,153,0.55)'}`,
      boxShadow: urgent
        ? '0 0 22px rgba(239,68,68,0.55), inset 0 1px 0 rgba(255,255,255,0.1)'
        : '0 0 16px rgba(236,72,153,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
      fontSize: 'clamp(28px, 3cqw, 44px)', fontWeight: 900,
      color: urgent ? '#FCA5A5' : '#FBCFE8',
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '0.04em',
      animation: urgent ? 'bTimerPulse 0.8s ease-in-out infinite' : undefined,
    }}>
      {String(m).padStart(2, '0')}:{String(sec).padStart(2, '0')}
    </div>
  );
}

function ConnectionsIntro({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const c = s.connections!;
  // 2026-04-28 Resize: User-Feedback 'so riesig und nicht so wie der rest'.
  // Card-Wrapper raus → free-floating Elements wie in PhaseIntroView. Sizing
  // angeglichen: Title in 3D-Layered-Glow-Stil wie Cat-Titles, Pills bleiben.
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20, position: 'relative', zIndex: 5,
      padding: 'clamp(12px, 2cqh, 24px) clamp(16px, 3cqw, 40px)',
      animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.15s both',
    }}>
      <div style={{
        fontSize: 'clamp(72px, 12cqw, 140px)', lineHeight: 1,
        animation: 'phasePop 0.6s var(--qq-ease-bounce) 0.15s both, cfloat 4s ease-in-out 1s infinite',
        filter: 'drop-shadow(0 4px 18px rgba(236,72,153,0.45))',
      }}>🧩</div>
      <div style={{
        fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
        fontSize: 'clamp(56px, 10cqw, 160px)', fontWeight: 900, lineHeight: 1,
        color: '#EC4899',
        textAlign: 'center',
        letterSpacing: '-0.005em',
        textShadow:
          '0 0 14px rgba(236,72,153,0.65), ' +
          '0 0 40px rgba(236,72,153,0.45), ' +
          '0 0 96px rgba(236,72,153,0.25), ' +
          '0 5px 0 rgba(0,0,0,0.45), ' +
          '0 14px 28px rgba(0,0,0,0.55)',
        animation: 'phasePop 0.7s var(--qq-ease-bounce) 0.3s both, qqCatTitleBreathe 4.5s ease-in-out 1.2s infinite',
      }}>
        {lang === 'de' ? 'Großes Finale' : 'Grand Finale'}
      </div>
      <div style={{
        fontSize: 'clamp(22px, 2.7cqw, 38px)', fontWeight: 900,
        // 2026-05-07 (Layout-Audit): Subtitle + Rule-Pills 1100 → 1400. Der
        // „Großes Finale"-Title oben skaliert bis 160px Schrift, daneben die
        // 1100-Pills wirkten zentriert-eng. Die Connections-Cards unten leben
        // bei 1500 — Subtitle/Pills jetzt im selben Visual-Frame.
        color: '#fde68aee', textAlign: 'center', lineHeight: 1.3, maxWidth: 1400,
        textShadow: '0 0 22px rgba(236,72,153,0.3)',
        animation: 'phasePop 0.6s var(--qq-ease-bounce) 0.5s both',
      }}>
        {lang === 'de'
          ? 'Findet 4 Gruppen — pro Gruppe stapelt ihr ein eigenes Feld für +1 Punkt.'
          : 'Find 4 groups — each group lets you stack one of your cells for +1 point.'}
      </div>
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1400,
        animation: 'phasePop 0.6s var(--qq-ease-bounce) 0.7s both',
      }}>
        <ConnectionsRulePill emoji="🎯" text={lang === 'de' ? '4 Begriffe → abgeben' : '4 terms → submit'} />
        <ConnectionsRulePill emoji="🏯" text={lang === 'de' ? '1 Gruppe = 1 Stapel (+1 Pkt)' : '1 group = 1 stack (+1 pt)'} />
        <ConnectionsRulePill emoji="❌" text={lang === 'de' ? `${c.maxFailedAttempts} Fehler → raus` : `${c.maxFailedAttempts} fails → out`} />
        <ConnectionsRulePill emoji="⏱" text={lang === 'de' ? `${Math.floor(c.durationSec / 60)} Min` : `${Math.floor(c.durationSec / 60)} min`} />
      </div>
    </div>
  );
}

function ConnectionsRulePill({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 22px', borderRadius: 999,
      background: 'rgba(255,255,255,0.04)',
      border: '1.5px solid rgba(236,72,153,0.32)',
      fontSize: 'clamp(16px, 1.7cqw, 22px)', fontWeight: 900, color: '#e2e8f0',
    }}>
      <span style={{ fontSize: 'clamp(20px, 2cqw, 28px)' }}>{emoji}</span>
      <span>{text}</span>
    </div>
  );
}

function ConnectionsGrid({ state: s }: {
  state: QQStateUpdate;
}) {
  const c = s.connections!;
  const lang = useLangFlip(s.language);
  const isReveal = c.phase === 'reveal' || c.phase === 'placement';
  // SPOILER-SAFE: Auf dem Beamer wird NUR im Reveal eingefärbt. Während Active
  // bleibt alles neutral, sonst könnten Teams die noch tippen die Lösung
  // anderer Teams direkt auf dem Beamer ablesen.
  const itemToGroup = new Map<string, { id: string; idx: number; name: string; color: string }>();
  c.payload.groups.forEach((g, i) => {
    g.items.forEach(it => {
      itemToGroup.set(it, { id: g.id, idx: i, name: lang === 'de' ? g.name : (g.nameEn ?? g.name), color: CONNECTIONS_GROUP_COLORS[i] });
    });
  });

  // Bei reveal: gruppieren wir die items zeilenweise nach group-Reihenfolge
  let displayOrder = c.itemOrder;
  if (isReveal) {
    displayOrder = c.payload.groups.flatMap(g => g.items);
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 'clamp(10px, 1.2cqw, 18px)',
      width: '100%', maxWidth: 1500, margin: '0 auto',
      position: 'relative', zIndex: 5,
    }}>
      {displayOrder.map((item, i) => {
        const grp = itemToGroup.get(item);
        const showColored = isReveal && !!grp;
        return (
          // 2026-05-07 (Audit-Fix): key={item} statt key={item-i}.
          // Bei active→reveal kippt displayOrder (Sortierung nach Gruppen);
          // mit Index-Suffix unmountet React alle 16 Tiles → Cascade-Sprung.
          // item-Text ist innerhalb 4×4 garantiert unique → stabile Identity.
          // Transition nur auf Style-Properties — `all` würde Grid-Position
          // mit-animieren wollen und ist ohnehin teuer.
          <div key={item} style={{
            padding: 'clamp(18px, 2.2cqw, 28px) clamp(10px, 1.2cqw, 18px)',
            borderRadius: 16,
            textAlign: 'center',
            fontSize: 'clamp(22px, 2.4cqw, 34px)', fontWeight: 900,
            background: showColored && grp
              ? `linear-gradient(135deg, ${grp.color}38, ${grp.color}18)`
              : 'rgba(255,255,255,0.05)',
            border: showColored && grp
              ? `2.5px solid ${grp.color}`
              : '2px solid rgba(255,255,255,0.10)',
            color: showColored && grp ? '#fff' : '#e2e8f0',
            boxShadow: showColored && grp ? `0 0 24px ${grp.color}44` : 'none',
            minHeight: 'clamp(80px, 10cqh, 130px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.5s ease, border-color 0.5s ease, color 0.5s ease, box-shadow 0.5s ease',
            animation: isReveal ? `contentReveal 0.4s var(--qq-ease-pop-fast) ${i * 0.04}s both` : undefined,
          }}>
            {item}
          </div>
        );
      })}
      {isReveal && (() => {
        // Spannungskurve: Avatare werden in REVERSE-Placement-Order eingeblendet
        // (letztes Team zuerst, top-Team zuletzt). Pro Team alle gefundenen
        // Gruppen GLEICHZEITIG poppen, dann nächstes Team. Pro Team-Step ~1s
        // damit man sieht wer gerade dran ist.
        // placementOrder ist sortiert nach (foundCount DESC, finishedAt ASC) —
        // also platzieren-Reihenfolge. Wir reversen für Spannung („und auf
        // Platz N kommt …, auf Platz N-1 kommt …, und auf Platz 1 …").
        const teamRevealSteps = [...c.placementOrder].reverse();
        // Teams die NICHT in placementOrder sind (0 Gruppen gefunden) kommen
        // zu Beginn (schwächste).
        const teamsWithGroups = new Set(c.placementOrder);
        const noGroupTeams = s.teams.filter(t => !teamsWithGroups.has(t.id) && c.teamProgress[t.id]).map(t => t.id);
        const fullRevealOrder = [...noGroupTeams, ...teamRevealSteps];
        // Pro Team: 1.0s Stepping-Delay + 0.4s Animation
        const teamStepMs = 1000;
        const baseDelay = 0.6; // nach Group-Cell-Reveal
        const teamRevealDelay = (teamId: string): number => {
          const idx = fullRevealOrder.indexOf(teamId);
          if (idx < 0) return baseDelay;
          return baseDelay + idx * (teamStepMs / 1000);
        };
        // 2026-05-10 (Spacing-Audit P1): bei N≥6 Avatar-Size 36-52 → 28-40 px,
        // damit bis zu 8 Finder pro Gruppe in 1 Reihe statt Wrap+Drop-Animation
        // aus Cell rausspringen. Trade-off: kleinere Avatare auf 8m, aber
        // sauberer Grid statt chaotischem Wrap.
        const dense = s.teams.length >= 6;
        const avatarSize = dense ? 'clamp(28px, 2.6cqw, 40px)' : 'clamp(36px, 3.4cqw, 52px)';
        return (
          <div style={{
            gridColumn: '1 / -1',
            marginTop: 'clamp(8px, 1cqh, 14px)',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'clamp(8px, 1cqw, 14px)',
          }}>
            {c.payload.groups.map((g, i) => {
              const finders = s.teams.filter(t =>
                c.teamProgress[t.id]?.foundGroupIds.includes(g.id)
              );
              finders.sort((a, b) => {
                const ia = c.placementOrder.indexOf(a.id);
                const ib = c.placementOrder.indexOf(b.id);
                if (ia === -1 && ib === -1) return 0;
                if (ia === -1) return 1;
                if (ib === -1) return -1;
                return ia - ib;
              });
              const color = CONNECTIONS_GROUP_COLORS[i];
              return (
                <div key={g.id} style={{
                  padding: '10px 14px 14px', borderRadius: 16,
                  background: `${color}22`,
                  border: `1.5px solid ${color}`,
                  color: '#fff', fontWeight: 900, fontSize: 'clamp(13px, 1.3cqw, 18px)',
                  textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  animation: `contentReveal 0.5s var(--qq-ease-pop-fast) ${i * 0.06}s both`,
                }}>
                  <div style={{ lineHeight: 1.2 }}>
                    {lang === 'de' ? g.name : (g.nameEn ?? g.name)}
                  </div>
                  {finders.length > 0 && (
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                      gap: 'clamp(4px, 0.5cqw, 8px)',
                    }}>
                      {finders.map(tm => (
                        <div key={tm.id} title={tm.name} style={{
                          position: 'relative',
                          // Suspense: pro Team eigener Delay (worst→best),
                          // ALLE Gruppen eines Teams ploppen gleichzeitig.
                          // 2026-05-08 (Wolf-Audit #5): vorher phasePop
                          // (scale 0.94→1 + opacity, sehr subtil), jetzt
                          // muchoVoterDrop — Avatar dropt von oben mit Bounce
                          // + Brightness-Spike. Connections-Finale wirkt
                          // damit endlich „dramatic" statt „still".
                          animation: `muchoVoterDrop 0.65s var(--qq-ease-bounce) ${teamRevealDelay(tm.id)}s both`,
                        }}>
                          <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={avatarSize} style={{
                            boxShadow: `0 0 0 2px ${tm.color}, 0 0 14px ${color}88`,
                          }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

/**
 * Antwort-Status-Reihe unten — gleicher Stil wie CHEESE/MUCHO/etc.:
 * Avatar mit kleinem Status-Badge unten rechts.
 *  - Aktiv aber noch keine Submit: dim
 *  - Mind. 1 Submit (Treffer ODER Fehler): grüner ✓
 *  - Lockout: roter ✕ mit Fail-Count
 *  - Sieger (4 Gruppen): goldener 🏁
 *  - Active Setz-Team in placement: grüner ×N-Badge
 */
function ConnectionsAnswerStatus({ state: s }: { state: QQStateUpdate }) {
  const c = s.connections!;
  const isPlacement = c.phase === 'placement';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 'clamp(10px, 1.6cqw, 22px)', flexWrap: 'wrap',
      padding: 'clamp(8px, 1cqh, 14px) clamp(12px, 1.4cqw, 20px)',
      position: 'relative', zIndex: 5,
      animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) 0.2s both',
    }}>
      {s.teams.map((tm) => {
        const tp = c.teamProgress[tm.id];
        const found = tp?.foundGroupIds.length ?? 0;
        const fails = tp?.failedAttempts ?? 0;
        const locked = tp?.isLockedOut ?? false;
        const finished = (tp?.finishedAt ?? null) != null;
        const isWinner = found >= 4;
        const hasActivity = found > 0 || fails > 0;
        const isActiveTeam = isPlacement && c.placementOrder[c.placementCursor] === tm.id;
        // Dim wenn weder Aktivität noch fertig
        const dim = !hasActivity && !finished;
        return (
          <div key={tm.id} title={tm.name} style={{
            position: 'relative',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            opacity: dim ? 0.55 : 1,
            filter: dim ? 'grayscale(0.4)' : (locked ? 'grayscale(0.2)' : 'none'),
            transition: 'opacity 0.4s ease, filter 0.4s ease',
            animation: isActiveTeam ? 'activeTeamGlow 2s ease-in-out infinite' : undefined,
          }}>
            <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(56px, 6cqw, 84px)'} style={{
              background: '#0A0814',
              // 2026-05-05 (Wolf 'in der ganzen App konsistent gruener Glow'):
              // hasActivity (= Team hat schon getippt) → green-Ring + Glow
              // statt ✓-Badge unten rechts. Winner=Gold-Ring, locked=Default.
              boxShadow: isWinner
                ? '0 0 0 3px #EC4899, 0 0 18px #EC489977, 0 4px 10px rgba(0,0,0,0.55)'
                : !locked && hasActivity
                  ? `0 0 0 3px #22C55E, 0 0 18px rgba(34,197,94,0.55), 0 4px 10px rgba(0,0,0,0.55)`
                  : isActiveTeam
                    ? `0 0 0 2px ${tm.color}, 0 0 16px ${tm.color}aa`
                    : `0 0 0 2px ${tm.color}55, 0 4px 10px rgba(0,0,0,0.55)`,
              transition: 'box-shadow 0.45s ease',
            }} />
            {/* Status-Badge unten rechts — nur Winner und Locked. */}
            {isWinner && (
              <div style={{
                position: 'absolute', bottom: -4, right: -4,
                width: 28, height: 28, borderRadius: '50%',
                background: '#EC4899', border: '2px solid #0A0814',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 900, lineHeight: 1,
                boxShadow: '0 0 14px rgba(236,72,153,0.55)',
                animation: 'bAnswerCheck 0.4s var(--qq-ease-bounce) both',
              }}>🏁</div>
            )}
            {!isWinner && locked && (
              <div style={{
                position: 'absolute', bottom: -4, right: -4,
                minWidth: 28, height: 28, padding: '0 6px', borderRadius: 16,
                background: '#EF4444', border: '2px solid #0A0814',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 900, color: '#fff', lineHeight: 1,
                animation: 'bAnswerCheck 0.35s var(--qq-ease-bounce) both',
              }}>✕{fails}</div>
            )}
            {/* Setz-×N-Pille während Placement */}
            {isActiveTeam && (
              <div style={{
                position: 'absolute', top: -10, left: '50%',
                transform: 'translateX(-50%)',
                padding: '2px 8px', borderRadius: 999,
                background: '#22C55E', color: '#0a1f0d',
                fontSize: 11, fontWeight: 900, letterSpacing: 0.4,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(34,197,94,0.55)',
              }}>×{c.placementRemaining}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
