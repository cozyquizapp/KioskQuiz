/**
 * CozyQuizTeamPhaseCards — kompakte Phase-Cards fuer Pre-Game + End-Game.
 *
 * Im Gegensatz zu QuestionCard/PlacementCard/ComebackCard/ConnectionsTeamCard
 * (komplexe Game-Mid-State-Maschinen) sind das hier alles relativ kompakte
 * display-only oder simple-state Cards, die fuer eine konkrete Phase rendern.
 *
 * Components:
 * - LobbyCard — Hero-Card mit eigenem Team + Gegner-Liste + READY-Pulse
 * - RulesCard — animiertes Listen-Indikator (Wolf erklaert)
 * - TeamsRevealCard — Big-Avatar-Reveal mit Sparkles + Glow
 * - PhaseIntroCard — Runde + Regel-Reminder + Kategorie-Intro (3 Render-Modi)
 * - PausedCard — Standings-Mini mit eigenem Rank
 * - FinalBettingCard — Tipp-Picker fuer Final-Bet (emit-based)
 * - FinalRecapHintCard — Zwischenstand-Hint mit Beamer-Verweis
 * - FinalRevealCard — Tipp-Aufloesung mit Sympathie-Bonus + Total
 * - GameOverCard — Sieger + Rankings + Stamm-Code-Copy
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 3.1).
 */
import React, { useEffect, useState } from 'react';
import {
  QQStateUpdate, QQTeam, qqGetAvatar, qqMegaFactionName,
  QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS, QQ_BUNTE_TUETE_LABELS,
} from '../../../shared/quarterQuizTypes';
import { QQ_CAT_ACCENT, qqSortedGroups, qqSortedTeams } from '../qqShared';
import { getRoundColor } from '../qqDesignTokens';
import { QQTeamAvatar } from './QQTeamAvatar';
import { QQIcon, QQEmojiIcon, qqCatSlug, qqSubSlug } from './QQIcon';
import { CozyGameIcon } from './CozyGameIcon';
import { CozyCard, CozyBtn, CopyButton } from './CozyQuizTeamPrimitives';
import { safeEmit } from '../utils/qqTeamAckBus';
import { formatStammCode } from '../utils/qqStammCode';
import { qqFinalSortedTeams, qqFinalTotal } from '../utils/qqFinalScore';
import { QQ_COLORS } from '../../../shared/qqColors';

// ── LobbyCard ────────────────────────────────────────────────────────────────
export function LobbyCard({ state: s, myTeam, lang }: { state: QQStateUpdate; myTeam: QQTeam | null; lang: 'de' | 'en' }) {
  const de = lang === 'de';
  // 2026-07-03 (Wolf-Audit): CozyArena — Gegner = die anderen FRAKTIONEN (nach
  // avatarId dedupliziert), nicht bis zu 25 gleichnamige Sub-Teams.
  const largeMode = !!(s as any).largeGroupMode;
  const opponents = largeMode
    ? (() => {
        const seen = new Set<string>();
        const out: QQTeam[] = [];
        for (const t of s.teams) {
          if (t.avatarId === myTeam?.avatarId || seen.has(t.avatarId)) continue;
          seen.add(t.avatarId); out.push(t);
        }
        return out;
      })()
    : s.teams.filter(t => t.id !== myTeam?.id);

  // Pulsing ready dot
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 1200);
    return () => clearInterval(id);
  }, []);

  if (!myTeam) {
    // Not yet joined — simple waiting view
    return (
      <CozyCard>
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 10, animation: 'tcfloat 2.5s ease-in-out infinite' }}>🎮</div>
          <div style={{ fontWeight: 900, fontSize: 22, color: QQ_COLORS.slate100, marginBottom: 6 }}>
            {de ? 'Warteraum' : 'Waiting room'}
          </div>
          <div style={{ fontSize: 14, color: QQ_COLORS.slate500 }}>
            {s.teams.length === 0 ? (de ? 'Noch keine Teams' : 'No teams yet') : `${s.teams.length} ${largeMode ? 'Handys' : 'Teams'}`}
          </div>
        </div>
      </CozyCard>
    );
  }

  return (
    <CozyCard borderColor={QQ_COLORS.brandPink} pulse>
      <div style={{ textAlign: 'center', padding: '4px 0' }}>
        {/* Own team — hero display */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginBottom: 8,
        }}>
          <QQTeamAvatar avatarId={myTeam.avatarId} teamEmoji={myTeam.emoji} size={56} style={{
            margin: '0 auto',
            animation: 'tcfloat 3s ease-in-out infinite',
            filter: `drop-shadow(0 0 12px ${myTeam.color}44)`,
          }} />
          <div style={{ fontWeight: 900, fontSize: 22, color: myTeam.color, marginTop: 4 }}>
            {myTeam.name}
          </div>
          {/* Pulsing ready indicator */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 16px', borderRadius: 999, marginTop: 4,
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: QQ_COLORS.green500,
              boxShadow: pulse ? '0 0 8px #22C55E' : '0 0 2px #22C55E',
              transition: 'box-shadow 0.6s ease',
            }} />
            <span style={{ fontSize: 13, fontWeight: 900, color: QQ_COLORS.green400, letterSpacing: '0.04em' }}>
              {de ? 'BEREIT' : 'READY'}
            </span>
          </div>
        </div>

        {/* VS separator */}
        {opponents.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0',
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{
              fontWeight: 900, fontSize: 20, color: QQ_COLORS.red500,
              textShadow: '0 0 14px rgba(239,68,68,0.4)',
              letterSpacing: '0.15em',
            }}>VS</div>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>
        )}

        {/* Opponents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {opponents.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px', borderRadius: 16,
              background: `${t.color}08`,
              border: `1px solid ${t.color}22`,
            }}>
              <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={28} />
              <span style={{ fontWeight: 900, fontSize: 16, color: t.color }}>{t.name}</span>
            </div>
          ))}
          {opponents.length === 0 && (
            <div style={{ fontSize: 14, color: QQ_COLORS.slate500, fontStyle: 'italic', padding: '8px 0' }}>
              {de ? 'Warte auf Gegner…' : 'Waiting for opponents…'}
            </div>
          )}
        </div>

      </div>
    </CozyCard>
  );
}

// ── RulesCard ────────────────────────────────────────────────────────────────
export function RulesCard({ lang }: { lang: 'de' | 'en' }) {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDot(d => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);
  const dots = '.'.repeat(dot);

  return (
    <CozyCard>
      <div style={{ textAlign: 'center', padding: '12px 4px', animation: 'tcreveal 0.5s ease both' }}>
        <div style={{ fontSize: 48, marginBottom: 10, animation: 'tcwobble 1.4s ease-in-out infinite' }}>👂</div>
        <div style={{ fontWeight: 900, fontSize: 20, color: QQ_COLORS.slate100, marginBottom: 8 }}>
          {lang === 'de' ? 'Gut zuhören!' : 'Listen up!'}
        </div>
        <div style={{ fontSize: 15, color: QQ_COLORS.slate400, lineHeight: 1.5 }}>
          {lang === 'de'
            ? 'Jetzt erklären wir die Regeln'
            : 'We are explaining the rules now'}
          <span style={{ display: 'inline-block', width: 24, textAlign: 'left' }}>{dots}</span>
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
          {['📖', '🗺️', '⭐'].map((e, i) => (
            <div key={i} style={{
              fontSize: 22,
              animation: `tcwobble 2s ease-in-out ${i * 0.35}s infinite`,
            }}>{e}</div>
          ))}
        </div>
      </div>
    </CozyCard>
  );
}

// ── TeamsRevealCard ──────────────────────────────────────────────────────────
export function TeamsRevealCard({ myTeam, lang }: { myTeam: QQTeam | null; lang: 'de' | 'en' }) {
  if (!myTeam) return null;
  // av wird aktuell nicht im Body genutzt, gehoert aber zur Reveal-Phase
  // (placeholder fuer kuenftige Avatar-Effekte). Strangler-Fig 1:1.
  qqGetAvatar(myTeam.avatarId);
  const color = myTeam.color;
  return (
    <CozyCard borderColor={`${color}cc`} pulse>
      <style>{`
        @keyframes tcTeamPop {
          0% { opacity: 0; transform: scale(0.5) rotate(-12deg); }
          55% { opacity: 1; transform: scale(1.1) rotate(4deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes tcFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes tcGlow {
          0%,100% { box-shadow: 0 0 0 0 ${color}55, 0 10px 36px ${color}44; }
          50%     { box-shadow: 0 0 0 14px ${color}00, 0 10px 36px ${color}88; }
        }
        @keyframes tcSparkle {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50%     { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 22, padding: '18px 8px 10px', position: 'relative',
      }}>
        {/* Top label */}
        <div style={{
          fontSize: 12, fontWeight: 900, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#F9A8D4',
          animation: 'tcreveal 0.4s ease both',
        }}>
          🎬 {lang === 'en' ? "Tonight's teams" : 'Heute spielen'}
        </div>

        {/* Big avatar disc — Wolf-Badge hat eigenen Inner-BG + Ring */}
        <QQTeamAvatar avatarId={myTeam.avatarId} teamEmoji={myTeam.emoji} size={160} style={{
          animation: 'tcTeamPop 0.7s var(--qq-ease-bounce) both, tcFloat 3s ease-in-out 0.9s infinite, tcGlow 2.4s ease-in-out 0.9s infinite',
          boxShadow: `0 0 32px ${color}55`,
        }} />

        {/* Team name banner */}
        <div style={{
          padding: '10px 22px', borderRadius: 16,
          background: color, color: '#fff',
          fontSize: 26, fontWeight: 900, letterSpacing: '0.04em',
          textTransform: 'uppercase',
          boxShadow: `0 6px 20px ${color}88`,
          animation: 'tcTeamPop 0.6s var(--qq-ease-bounce) 0.15s both',
        }}>
          {myTeam.name}
        </div>

        {/* Motivational line */}
        <div style={{
          fontSize: 22, fontWeight: 900,
          color: QQ_COLORS.brandPink, textAlign: 'center',
          letterSpacing: '0.04em',
          textShadow: '0 2px 14px rgba(236,72,153,0.4)',
          animation: 'tcreveal 0.5s ease 0.4s both',
        }}>
          <QQEmojiIcon emoji="✨"/> {lang === 'en' ? 'Good luck!' : 'Viel Glück!'} <QQEmojiIcon emoji="✨"/>
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 14, fontWeight: 700, color: QQ_COLORS.slate400, textAlign: 'center',
          fontStyle: 'italic', lineHeight: 1.5, maxWidth: 280,
          animation: 'tcreveal 0.5s ease 0.55s both',
        }}>
          {lang === 'en'
            ? 'Phones at the ready, here we go!'
            : 'Handy bereithalten, gleich geht\'s los!'}
        </div>

        {/* Sparkles */}
        <div style={{
          position: 'absolute', top: 12, left: 16, fontSize: 20,
          animation: 'tcSparkle 1.8s ease-in-out infinite',
        }}><QQEmojiIcon emoji="✨"/></div>
        <div style={{
          position: 'absolute', top: 40, right: 18, fontSize: 16,
          animation: 'tcSparkle 2.2s ease-in-out 0.4s infinite',
        }}><QQEmojiIcon emoji="⭐"/></div>
        <div style={{
          position: 'absolute', bottom: 30, left: 22, fontSize: 16,
          animation: 'tcSparkle 2s ease-in-out 0.8s infinite',
        }}><QQEmojiIcon emoji="⭐"/></div>
      </div>
    </CozyCard>
  );
}

// ── PhaseIntroCard ───────────────────────────────────────────────────────────
export function PhaseIntroCard({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  // 2026-05-09 (Wolf 'team-Farben noch alt'): nutzt Brand-Pink-Eskalation
  // (QQ_PHASE_COLORS via getRoundColor) statt buntes Blue/Pink/Red/Purple-
  // Mapping. Letzte Phase = Magenta (#A21247).
  const totalPhases = (s.totalPhases ?? 4) as number;
  const color = getRoundColor(s.gamePhaseIndex, totalPhases);
  // Quiz-Runden heissen immer „Runde N". Das echte „Finale" ist seit
  // Connections-Einfuehrung das 4×4-Mini-Game.
  const names  = { de: ['', 'Runde 1', 'Runde 2', 'Runde 3', 'Runde 4'], en: ['', 'Round 1', 'Round 2', 'Round 3', 'Round 4'] };
  // Synchron mit Beamer ROUND_RULES (QQBeamerPage). Bann/Schild/Tauschen sind
  // gedroppt — aktuelle Mechaniken sind Setzen/Klauen/Stapeln + 4×4-Finale.
  const descs  = { de: ['', 'Erobert das Spielfeld!', 'Klauen jetzt möglich!', 'Stapeln freigeschaltet: Felder dauerhaft sichern!', 'Quiz-Buddy-Punkte sammeln, danach Stapel-Bonus im Finale!'],
                   en: ['', 'Conquer the grid!', 'Stealing now possible!', 'Stack unlocked, lock your tile permanently!', 'Collect quiz buddy points, stack-bonus finale follows!'] };

  const questionInPhase = (s.questionIndex % 5) + 1;
  const isFirstOfRound = questionInPhase === 1;
  const showRules    = isFirstOfRound && s.introStep === 1;
  const showCategory = !isFirstOfRound || s.introStep >= 2;
  // 2026-07-03 (Wolf-Audit): CozyArena hat kein Grid → keine „Erobert/Klaut/
  // Stapelt"-Runden-Regel. Punkte-Copy statt Grid-Mechanik.
  const largeMode = !!(s as any).largeGroupMode;
  const phaseName = names[lang][s.gamePhaseIndex];
  const phaseDesc = largeMode
    ? (lang === 'de' ? 'Sammelt Punkte für eure Fraktion!' : 'Score points for your faction!')
    : descs[lang][s.gamePhaseIndex];

  const cat = s.currentQuestion?.category;
  const catInfo = cat ? QQ_CATEGORY_LABELS[cat] : undefined;
  const catColor = cat ? (QQ_CAT_ACCENT[cat] ?? QQ_CATEGORY_COLORS[cat]) : color;
  // Synchron mit Beamer (QQBeamerPage CAT_EXPLAIN + BUNTE_SUB_INTRO).
  const CAT_EXPLAIN: Record<string, { de: string; en: string }> = {
    SCHAETZCHEN:   { de: 'Wer schätzt am nächsten dran?', en: 'Who can guess the closest?' },
    MUCHO:         { de: 'Wählt die richtige Antwort', en: 'Pick the right answer' },
    BUNTE_TUETE:   { de: 'Immer eine Überraschung. Jedes Mal anders.', en: 'Always a surprise. Different every time.' },
    ZEHN_VON_ZEHN: { de: '3 Antworten, 10 Punkte vergeben', en: '3 answers, distribute 10 points' },
    CHEESE:        { de: 'Was ist das?', en: 'What is this?' },
  };
  // Card border — round color for round intro, category color for category steps
  const introBorder = showCategory ? catColor : color;

  return (
    <CozyCard borderColor={introBorder}>
      <div style={{ textAlign: 'center', padding: '8px 0', animation: 'tcreveal 0.5s ease both' }}>
        {!showCategory && !showRules ? (
          /* Round announcement */
          <>
            <div style={{ fontSize: 14, color: QQ_COLORS.slate500, marginBottom: 6 }}>
              {lang === 'de' ? 'Nächste Phase' : 'Next phase'}
            </div>
            <div style={{ fontSize: 52, fontWeight: 900, color, textShadow: `0 0 30px ${color}44`,
              animation: 'tcfloat 3s ease-in-out infinite' }}>
              {phaseName ?? `${lang === 'de' ? 'Runde' : 'Round'} ${s.gamePhaseIndex}`}
            </div>
            <div style={{ fontSize: 17, color: `${color}88`, marginTop: 8 }}>
              {phaseDesc ?? ''}
            </div>
          </>
        ) : showRules ? (
          /* Rule reminder */
          (() => {
            // Synchron mit Beamer ROUND_RULES. Bann/Schild/Tauschen sind raus,
            // aktuelle Trinity ist Setzen/Klauen/Stapeln.
            const RULES: Record<number, { de: string[]; en: string[]; emoji: string }> = {
              1: { emoji: '🏁', de: ['1 Feld setzen', 'Sichert euch eure ersten Felder!'], en: ['Place 1 tile', 'Claim your first cells!'] },
              2: { emoji: '⚔️', de: ['2 Felder oder klauen', 'Pro richtige Antwort wählen'], en: ['2 tiles or steal', 'Per correct answer'] },
              3: { emoji: '🏯', de: ['Stapeln freigeschaltet', 'Felder dauerhaft sichern + 1 Pkt extra'], en: ['Stack unlocked', 'Lock tile + 1 extra pt'] },
              4: { emoji: '🏯', de: ['Quiz-Buddy-Punkte', 'danach Stapel-Bonus im Finale'], en: ['Quiz buddy points', 'stack-bonus finale follows'] },
            };
            const r = largeMode
              ? { emoji: '⚡', de: ['Schnell & richtig', 'Je mehr Handys richtig, und je schneller, desto mehr Punkte'], en: ['Fast & correct', 'More phones right, and faster, means more points'] }
              : (RULES[s.gamePhaseIndex] ?? RULES[3]);
            return (
              <>
                <div style={{ fontSize: 13, fontWeight: 900, color, letterSpacing: '0.04em', marginBottom: 6 }}>
                  {phaseName}
                </div>
                {/* 2026-07-08 (Wolf-Livetest 'Runden-Emojis inkonsistent zum
                    Beamer'): die alten marker-sanduhr/marker-swap-PNGs (Bann/Swap
                    = gestrichene Mechaniken) raus — jetzt exakt das Beamer-Emoji
                    (🏯 fuer R3/R4) wie in ROUND_RULES. */}
                <div style={{ fontSize: 44, marginBottom: 4, animation: 'tcfloat 3s ease-in-out infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
                  <QQEmojiIcon emoji={r.emoji} />
                </div>
                {s.gamePhaseIndex > 1 && (
                  <div style={{
                    display: 'inline-block', padding: '3px 14px', borderRadius: 999,
                    background: `${color}22`, border: `1px solid ${color}44`,
                    fontSize: 13, fontWeight: 900, color, letterSpacing: '0.1em',
                    marginBottom: 6,
                  }}>
                    {lang === 'de' ? '✨ NEU' : '✨ NEW'}
                  </div>
                )}
                {(lang === 'en' ? r.en : r.de).map((line, i) => (
                  <div key={i} style={{
                    fontSize: i === 0 ? 22 : 16, fontWeight: i === 0 ? 900 : 700,
                    color: i === 0 ? QQ_COLORS.slate100 : `${color}aa`,
                    marginTop: i === 0 ? 4 : 2,
                  }}>{line}</div>
                ))}
              </>
            );
          })()
        ) : s.categoryIsNew ? (
          /* Category explanation — first time this category/mechanic appears */
          (() => {
            const btKind = s.currentQuestion?.bunteTuete?.kind;
            const TC_INTRO: Record<string, { emoji: string; title: { de: string; en: string }; lines: { de: string[]; en: string[] } }> = {
              SCHAETZCHEN:          { emoji: catInfo?.emoji ?? '🎯', title: { de: 'Schätzchen', en: 'Close Call' }, lines: { de: ['Wer am nächsten dran liegt, gewinnt', 'Knapp dran zählt auch'], en: ['Closest guess wins', 'Near misses also count'] } },
              MUCHO:                { emoji: catInfo?.emoji ?? '🔥', title: { de: 'Mu-Cho', en: 'Mu-Cho' }, lines: { de: ['4 Optionen — 1 ist richtig', '⚡ Schnelligkeit entscheidet!'], en: ['4 options — 1 is correct', '⚡ Speed decides!'] } },
              ZEHN_VON_ZEHN:        { emoji: catInfo?.emoji ?? '🎰', title: { de: '10 von 10', en: 'All In' }, lines: { de: ['10 Punkte auf 3 Antworten verteilen'], en: ['Distribute 10 points across 3 answers'] } },
              CHEESE:               { emoji: catInfo?.emoji ?? '📸', title: { de: 'Schau mal!', en: 'Picture This' }, lines: { de: ['Erkennt das Bild, tippt die Antwort ins Handy.'], en: ['Spot the image, type your answer.'] } },
              'BUNTE_TUETE:top5':       { emoji: '🏆', title: { de: 'Top 5', en: 'Top 5' }, lines: { de: ['Bis zu 5 Antworten', 'Meiste Treffer gewinnt'], en: ['Up to 5 answers', 'Most hits wins'] } },
              'BUNTE_TUETE:oneOfEight': { emoji: '🕵️', title: { de: 'Imposter', en: 'Imposter' }, lines: { de: ['Findet die EINE falsche Aussage', 'unter 7 wahren'], en: ['Spot the ONE false statement', 'among 7 true ones'] } },
              'BUNTE_TUETE:order':      { emoji: '📋', title: { de: 'Reihenfolge', en: 'Order' }, lines: { de: ['Sortiert in der richtigen Reihenfolge'], en: ['Sort in the correct order'] } },
              'BUNTE_TUETE:map':        { emoji: '🗺️', title: { de: 'CozyGuessr', en: 'CozyGuessr' }, lines: { de: ['Errate den Ort auf der Karte', 'Nächstes Team gewinnt'], en: ['Guess the location on the map', 'Closest team wins'] } },
              'BUNTE_TUETE:hotPotato':  { emoji: '🔥', title: { de: 'Heiße Kartoffel', en: 'Hot Potato' }, lines: { de: ['Reihum antworten', 'Keine Antwort vor Zeitende = raus'], en: ['Take turns', 'No answer before time runs out = out'] } },
              'BUNTE_TUETE:onlyConnect':{ emoji: '🧩', title: { de: '4 gewinnt', en: 'Only Connect' }, lines: { de: ['4 Begriffe — was verbindet sie?', '1 Tipp · schnellste richtig zuerst'], en: ['4 terms — what connects them?', '1 guess · fastest correct first'] } },
              'BUNTE_TUETE:bluff':      { emoji: '🎭', title: { de: 'Bluff', en: 'Bluff' }, lines: { de: ['Erfindet plausible Falsch-Antworten', 'und ratet die echte'], en: ['Make up plausible fake answers', 'and find the real one'] } },
            };
            const key = cat === 'BUNTE_TUETE' && btKind ? `BUNTE_TUETE:${btKind}` : (cat ?? '');
            const info = TC_INTRO[key] ?? TC_INTRO[cat ?? ''];
            if (!info) return null;
            return (
              <>
                <div style={{ fontSize: 13, fontWeight: 900, color: catColor, letterSpacing: '0.04em', marginBottom: 8 }}>
                  {lang === 'de' ? `Frage ${questionInPhase} von 5` : `Question ${questionInPhase} of 5`}
                </div>
                {/* 2026-07-08 (Wolf-Livetest 'Kategorie-Emojis inkonsistent zum
                    Beamer'): custom PNG-Icon (cat-... / bunte-...) wie Beamer-Hero
                    + Team-Pill statt Roh-Emoji. Fallback aufs Emoji wenn kein Slug. */}
                <div style={{ fontSize: 44, marginBottom: 4, animation: 'tcfloat 3s ease-in-out infinite' }}>
                  {(() => {
                    const catSlug = cat === 'BUNTE_TUETE' && btKind ? qqSubSlug(btKind) : (cat ? qqCatSlug(cat as string) : null);
                    return catSlug
                      ? <QQIcon slug={catSlug} size={44} alt={info.title[lang]} />
                      : <QQEmojiIcon emoji={info.emoji}/>;
                  })()}
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: catColor, textShadow: `0 0 20px ${catColor}44` }}>
                  {info.title[lang]}
                </div>
                {info.lines[lang].map((line, i) => (
                  <div key={i} style={{
                    fontSize: 15, fontWeight: 700, color: i === 0 ? QQ_COLORS.slate100 : `${catColor}88`,
                    marginTop: i === 0 ? 8 : 2,
                  }}>{line}</div>
                ))}
                {/* User-Wunsch 2026-04-28: 'Antwort auf dem Handy' war redundant
                    auf dem Handy selbst. Komplett raus. */}
              </>
            );
          })()
        ) : (
          /* Category reveal — already seen, compact */
          <>
            <div style={{ fontSize: 13, fontWeight: 900, color: catColor, letterSpacing: '0.04em', marginBottom: 6 }}>
              {lang === 'de' ? `Frage ${questionInPhase} von 5` : `Question ${questionInPhase} of 5`}
            </div>
            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{
                  width: n === questionInPhase ? 18 : 8,
                  height: 8, borderRadius: 4,
                  background: n < questionInPhase ? `${catColor}55` : n === questionInPhase ? catColor : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>
            {catInfo && (
              <>
                <div style={{ fontSize: 44, marginBottom: 4, lineHeight: 1, animation: 'tcfloat 3s ease-in-out infinite' }}>
                  {(() => {
                    // 2026-05-11 (Wolf): bei Bunte-Tuete-Sub-Mechanik das
                    // spezifische Sub-Icon/Emoji nutzen statt generisches 🎁.
                    const btKind = s.currentQuestion?.category === 'BUNTE_TUETE'
                      ? s.currentQuestion?.bunteTuete?.kind
                      : undefined;
                    const subSlug = btKind ? qqSubSlug(btKind) : null;
                    const slug = btKind ? subSlug : (cat ? qqCatSlug(cat as string) : null);
                    const fallback = btKind ? QQ_BUNTE_TUETE_LABELS[btKind].emoji : catInfo.emoji;
                    return slug
                      ? <QQIcon slug={slug} size={56} alt={catInfo[lang]} />
                      : fallback;
                  })()}
                </div>
                <div style={{
                  fontSize: 32, fontWeight: 900, color: catColor,
                  textShadow: `0 0 20px ${catColor}44`,
                }}>
                  {catInfo[lang]}
                </div>
                {cat && CAT_EXPLAIN[cat] && (
                  <div style={{ fontSize: 15, color: `${catColor}88`, marginTop: 6, fontWeight: 700 }}>
                    {CAT_EXPLAIN[cat][lang]}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </CozyCard>
  );
}

// ── TieBreakerCard (Schätz-Stechen) ──────────────────────────────────────────
// 2026-07-04: Bei Gleichstand am Spielende. Nur die Kandidaten-Teams (bzw. im
// Arena-Modus die Geräte der Kandidaten-Faktionen) tippen eine Zahl. Näheste
// Schätzung gewinnt; ein Versuch pro Gerät.
export function TieBreakerCard({
  state: s, myTeamId, emit, roomCode, lang,
}: {
  state: QQStateUpdate; myTeamId: string;
  emit: any; roomCode: string; lang: 'de' | 'en';
}) {
  const de = lang === 'de';
  const tb = (s as any).tieBreaker as import('../../../shared/quarterQuizTypes').QQTieBreakerState | null;
  const myTeam = s.teams.find(t => t.id === myTeamId);
  const myColor = myTeam?.color ?? QQ_COLORS.brandPink;
  const arena = !!(s as any).largeGroupMode;
  const [val, setVal] = useState('');
  if (!tb) return null;

  const label = (id: string) => {
    const t = s.teams.find(x => x.id === id);
    if (!t) return id;
    return arena ? qqMegaFactionName(t.avatarId, de ? 'de' : 'en') : t.name;
  };
  const unit = tb.unit ? ` ${tb.unit}` : '';
  // Eligibilitaet: eigenes Team ist Kandidat ODER (Arena) eigene Faktion ist Kandidat.
  const candidateAvatars = new Set(tb.candidateIds.map(id => s.teams.find(t => t.id === id)?.avatarId).filter(Boolean) as string[]);
  const eligible = tb.candidateIds.includes(myTeamId) || (arena && !!myTeam?.avatarId && candidateAvatars.has(myTeam.avatarId));
  const myAnswer = tb.answers.find(a => a.teamId === myTeamId) ?? null;

  const send = () => {
    if (myAnswer || tb.revealed) return;
    const g = parseFloat(val.replace(',', '.'));
    if (!isFinite(g)) return;
    safeEmit(emit, 'qq:tiebreakerAnswer', { roomCode, teamId: myTeamId, guess: g });
    if (navigator.vibrate) navigator.vibrate([15, 25, 15]);
  };

  const header = (
    <div style={{ textAlign: 'center', marginBottom: 12 }}>
      <div style={{ fontSize: 34, marginBottom: 4 }}>⚔️</div>
      <div style={{ fontWeight: 900, fontSize: 20, color: QQ_COLORS.brandPink, letterSpacing: '0.02em' }}>
        {de ? 'STECHEN' : 'SUDDEN DEATH'}
      </div>
      <div style={{ fontSize: 12, color: QQ_COLORS.slate400, fontWeight: 700 }}>
        {de ? 'Gleichstand, am nächsten dran gewinnt!' : 'Tie, closest guess wins!'}
      </div>
    </div>
  );

  // Aufloesung.
  if (tb.revealed) {
    const iWon = tb.winnerId && (arena
      ? (!!myTeam?.avatarId && s.teams.find(t => t.id === tb.winnerId)?.avatarId === myTeam.avatarId)
      : tb.winnerId === myTeamId);
    return (
      <CozyCard borderColor={iWon ? '#22C55E' : myColor}>
        {header}
        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{iWon ? '🏆' : '🤝'}</div>
          <div style={{ fontSize: 13, color: QQ_COLORS.slate400, marginBottom: 4 }}>
            {de ? 'Richtige Antwort' : 'Correct answer'}: <b style={{ color: QQ_COLORS.slate100 }}>{tb.target}{unit}</b>
          </div>
          <div style={{ fontWeight: 900, fontSize: 18, color: iWon ? '#22C55E' : QQ_COLORS.slate300, marginBottom: 6 }}>
            {iWon ? (de ? 'Ihr wart am nächsten dran!' : 'You were closest!')
                  : tb.winnerId ? (de ? `${label(tb.winnerId)} war am nächsten dran.` : `${label(tb.winnerId)} was closest.`)
                  : (de ? 'Keine Schätzung abgegeben.' : 'No guess submitted.')}
          </div>
          <div style={{ fontSize: 13, color: QQ_COLORS.slate400 }}>
            {de ? 'Schau auf den Beamer für die Siegerehrung.' : 'Watch the beamer for the crowning.'}
          </div>
        </div>
      </CozyCard>
    );
  }

  // Nicht-Kandidat: nur zuschauen.
  if (!eligible) {
    return (
      <CozyCard borderColor={myColor}>
        {header}
        <div style={{ textAlign: 'center', fontSize: 14, color: QQ_COLORS.slate400, fontWeight: 700, lineHeight: 1.4 }}>
          {de ? 'Das Stechen läuft zwischen:' : 'The tiebreaker is between:'}
          <div style={{ marginTop: 8, fontWeight: 900, color: QQ_COLORS.slate300 }}>
            {tb.candidateIds.map(label).join(' · ')}
          </div>
        </div>
      </CozyCard>
    );
  }

  // Kandidat, schon getippt: warten.
  if (myAnswer) {
    return (
      <CozyCard borderColor={myColor}>
        {header}
        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>⏳</div>
          <div style={{ fontWeight: 900, fontSize: 17, color: myColor, marginBottom: 6 }}>
            {de ? 'Schätzung abgegeben' : 'Guess submitted'}: {myAnswer.guess}{unit}
          </div>
          <div style={{ fontSize: 13, color: QQ_COLORS.slate400 }}>
            {de ? 'Warte auf die Auflösung…' : 'Waiting for the result…'}
          </div>
        </div>
      </CozyCard>
    );
  }

  // Kandidat, noch offen: Zahlen-Eingabe.
  return (
    <CozyCard borderColor={myColor}>
      {header}
      <div style={{ fontWeight: 900, fontSize: 16, color: QQ_COLORS.slate200, textAlign: 'center', marginBottom: 14, lineHeight: 1.3 }}>
        {tb.prompt}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
        <input
          type="number"
          inputMode="decimal"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder={de ? 'Deine Zahl…' : 'Your number…'}
          autoFocus
          style={{
            flex: 1, minWidth: 0, padding: '16px 14px', borderRadius: 14,
            border: `2px solid ${myColor}66`, background: `${myColor}10`,
            color: QQ_COLORS.slate100, fontFamily: 'inherit', fontWeight: 900, fontSize: 22,
            textAlign: 'center', outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={!isFinite(parseFloat(val.replace(',', '.')))}
          style={{
            padding: '0 20px', borderRadius: 14, border: 'none',
            background: isFinite(parseFloat(val.replace(',', '.'))) ? myColor : `${myColor}44`,
            color: '#fff', fontFamily: 'inherit', fontWeight: 900, fontSize: 17,
            cursor: 'pointer',
          }}
        >
          {de ? 'Los' : 'Go'}
        </button>
      </div>
      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: QQ_COLORS.slate400, fontWeight: 700 }}>
        {de ? '⚡ Ein Versuch, am nächsten dran gewinnt.' : '⚡ One guess, closest wins.'}
      </div>
    </CozyCard>
  );
}

// ── PausedCard ───────────────────────────────────────────────────────────────
export function PausedCard({ state: s, myTeamId, lang = 'de' }: { state: QQStateUpdate; myTeamId: string; lang?: 'de' | 'en' }) {
  const de = lang === 'de';
  // 2026-07-03 (Wolf-Audit): CozyArena zeigt Fraktions-Standings nach Punkten,
  // nicht Grid-„Felder". qqSortedGroups summiert Sub-Teams je Fraktion.
  const largeMode = !!(s as any).largeGroupMode;
  // 2026-07-08 Konsistenz #7: Rang + Zahl exakt wie Beamer-PausedView —
  // Backend-kanonische Sortierung (qqSortedTeams) statt lokalem totalCells-Sort,
  // und largestConnected als Hauptzahl (nicht totalCells). Vorher wichen Rang
  // UND Zahl vom Beamer ab.
  const sorted = largeMode ? qqSortedGroups(s) : qqSortedTeams(s);
  const myRaw = s.teams.find(t => t.id === myTeamId);
  const myTeam = largeMode ? sorted.find(t => t.avatarId === myRaw?.avatarId) : myRaw;
  const myRank = sorted.findIndex(t => t.id === myTeam?.id) + 1;
  const scoreOf = (t: QQTeam) => t.largestConnected ?? 0;
  const unitLabel = (n: number) => largeMode
    ? (de ? (n === 1 ? 'Punkt' : 'Punkte') : (n === 1 ? 'pt' : 'pts'))
    : (de ? 'verbunden' : 'connected');

  return (
    <CozyCard>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: QQ_COLORS.slate400 }}>
          ⏸ {de ? 'Kurze Pause' : 'Short Break'}
        </div>

        {myTeam && (
          <div style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '14px 18px',
            border: `2px solid ${myTeam.color}44`,
          }}>
            <div style={{ fontSize: 14, color: QQ_COLORS.slate500, fontWeight: 700, marginBottom: 6 }}>
              {de ? 'Dein Stand' : 'Your Position'}
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: myTeam.color }}>
              #{myRank}
            </div>
            <div style={{ fontSize: 16, color: QQ_COLORS.slate400, fontWeight: 700 }}>
              {scoreOf(myTeam)} {unitLabel(scoreOf(myTeam))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map((t, i) => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderRadius: 8,
              background: t.id === myTeamId ? 'rgba(255,255,255,0.06)' : 'transparent',
            }}>
              <span style={{ fontSize: 16, width: 24, textAlign: 'center', color: QQ_COLORS.slate500, fontWeight: 900 }}>
                {i === 0 ? <QQEmojiIcon emoji="🥇"/> : i === 1 ? <QQEmojiIcon emoji="🥈"/> : i === 2 ? <QQEmojiIcon emoji="🥉"/> : `${i + 1}.`}
              </span>
              <span style={{ flex: 1, fontWeight: 900, fontSize: 15, color: t.color }}>{t.name}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: QQ_COLORS.brandPink }}>{scoreOf(t)}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 14, color: QQ_COLORS.slate600, fontWeight: 700 }}>
          {de ? 'Gleich geht\'s weiter…' : 'Continuing soon…'}
        </div>
      </div>
    </CozyCard>
  );
}

// ── FinalBettingCard ─────────────────────────────────────────────────────────
export function FinalBettingCard({
  state: s, myTeamId, emit, roomCode, lang,
}: {
  state: QQStateUpdate; myTeamId: string;
  emit: any; roomCode: string; lang: 'de' | 'en';
}) {
  const de = lang === 'de';
  const myTeam = s.teams.find(t => t.id === myTeamId);
  const myColor = myTeam?.color ?? QQ_COLORS.brandPink;
  const [pickedTargetId, setPickedTargetId] = useState<string | null>(null);
  const submitted = !!s.finalBettingSubmitted?.[myTeamId];
  const totalSubmitted = Object.values(s.finalBettingSubmitted ?? {}).filter(Boolean).length;
  const totalTeams = s.teams.length;

  const handleSubmit = () => {
    if (!pickedTargetId) {
      safeEmit(emit, 'qq:submitFinalBet', { roomCode, teamId: myTeamId, bet: null });
    } else {
      safeEmit(emit, 'qq:submitFinalBet', { roomCode, teamId: myTeamId, bet: { targetTeamId: pickedTargetId } });
    }
    if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
  };

  // 2026-07-07 (Wolf-Livetest): Server akzeptiert Tipps erst wenn die Intro-
  // Slide weggeklickt ist (phase===FINAL_BETTING UND finalBettingIntroDone).
  // Vorher zeigte /team schon die klickbaren Picker -> frueher Klick warf
  // INTRO_NOT_DONE. Bis der Mod freigibt: inaktive Warte-Card statt Buttons.
  // Nur auf ===false gaten (undefined defaultet server-seitig auf true).
  if (s.finalBettingIntroDone === false) {
    return (
      <CozyCard borderColor={myColor} pulse>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>🎲</div>
          <div style={{ fontWeight: 900, fontSize: 19, color: myColor, marginBottom: 6 }}>
            {de ? 'Final-Tipp startet gleich…' : 'Final tip starts soon…'}
          </div>
          <div style={{ fontSize: 14, color: QQ_COLORS.slate400, lineHeight: 1.45 }}>
            {de
              ? 'Schau auf den Beamer, gleich kannst du deinen Tipp abgeben.'
              : 'Watch the beamer, you can place your tip in a moment.'}
          </div>
        </div>
      </CozyCard>
    );
  }

  if (submitted) {
    const myBet = s.finalBets?.[myTeamId];
    const targetTeam = myBet ? s.teams.find(t => t.id === myBet.targetTeamId) : null;
    return (
      <CozyCard borderColor={myColor}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>🎲</div>
          <div style={{ fontWeight: 900, fontSize: 19, color: myColor, marginBottom: 6 }}>
            {de ? 'Tipp abgegeben!' : 'Tip placed!'}
          </div>
          {targetTeam && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 999,
              background: `${targetTeam.color}1a`,
              border: `1.5px solid ${targetTeam.color}66`,
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 12, color: QQ_COLORS.slate400 }}>{de ? 'Du tippst auf' : 'You tip'}</span>
              <QQTeamAvatar avatarId={targetTeam.avatarId} teamEmoji={targetTeam.emoji} size={24} />
              <span style={{ fontWeight: 900, color: targetTeam.color }}>{targetTeam.name}</span>
            </div>
          )}
          {!targetTeam && (
            <div style={{ fontSize: 13, color: QQ_COLORS.slate400, marginBottom: 12, fontStyle: 'italic' }}>
              {de ? 'Kein Tipp abgegeben (0 Bonus möglich)' : 'No tip placed (0 bonus possible)'}
            </div>
          )}
          <div style={{ fontSize: 14, color: QQ_COLORS.slate400, marginBottom: 12 }}>
            {de
              ? `${totalSubmitted} von ${totalTeams} Teams haben getippt`
              : `${totalSubmitted} of ${totalTeams} teams tipped`}
          </div>
          <div style={{
            padding: '12px 14px', borderRadius: 12,
            background: `${myColor}14`, border: `1px solid ${myColor}33`,
            fontSize: 13, color: QQ_COLORS.slate300, lineHeight: 1.4,
          }}>
            {de
              ? 'Schau jetzt auf den Beamer, die Final-Runde startet gleich.'
              : 'Watch the beamer, the final round starts soon.'}
          </div>
        </div>
      </CozyCard>
    );
  }

  return (
    <CozyCard borderColor={myColor} pulse>
      <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: QQ_COLORS.slate400, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
          {de ? '🪙 Final-Tipp' : '🪙 Final tip'}
        </div>
        <div style={{ fontWeight: 900, fontSize: 22, color: QQ_COLORS.slate100, marginBottom: 4, letterSpacing: '-0.01em' }}>
          {de ? 'Auf wen tippst du?' : 'Who do you bet on?'}
        </div>
        <div style={{ fontSize: 13, color: QQ_COLORS.slate300, marginBottom: 14, lineHeight: 1.45 }}>
          {/* 2026-05-09 (Wolf): Sympathie-Bonus bewusst nicht erwaehnt — bleibt
              Ueberraschung beim End-Reveal. */}
          {de
            ? 'Pro gewonnene Final-Kategorie deines Tipps = +1 Bonus. Kein Verlust!'
            : 'For each final-category win of your tip = +1 bonus. No loss!'}
        </div>
      </div>

      {/* Team-Liste als Picker. Tap = pick (toggle off bei zweitem Tap). */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {s.teams.map(t => {
          const isMe = t.id === myTeamId;
          const isPicked = pickedTargetId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setPickedTargetId(isPicked ? null : t.id);
                if (navigator.vibrate) navigator.vibrate(isPicked ? 8 : 15);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                borderRadius: 14,
                background: isPicked ? `${t.color}33` : `${t.color}14`,
                border: isPicked ? `2.5px solid ${t.color}` : `1.5px solid ${t.color}55`,
                color: QQ_COLORS.slate100, cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 15, fontWeight: 800,
                textAlign: 'left',
                transition: 'transform 0.14s, background 0.18s, border 0.18s, box-shadow 0.18s',
                boxShadow: isPicked ? `0 0 24px ${t.color}88, 0 4px 12px rgba(0,0,0,0.3)` : 'none',
                transform: isPicked ? 'scale(1.02)' : 'scale(1)',
              }}
              onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onTouchEnd={(e) => { e.currentTarget.style.transform = isPicked ? 'scale(1.02)' : 'scale(1)'; }}
            >
              <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={42} />
              <span style={{ flex: 1, color: t.color, fontSize: 17 }}>{t.name}</span>
              {isMe && (
                <span style={{
                  fontSize: 10, fontWeight: 900,
                  padding: '3px 8px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.10)', color: QQ_COLORS.slate100,
                  letterSpacing: 0.4,
                }}>{de ? 'ICH' : 'ME'}</span>
              )}
              {isPicked && (
                <span style={{
                  fontSize: 18, lineHeight: 1,
                }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Submit-Btn */}
      <CozyBtn color={pickedTargetId ? myColor : QQ_COLORS.slate500} onClick={handleSubmit}>
        {pickedTargetId
          ? (de ? 'Tipp bestätigen' : 'Confirm tip')
          : (de ? 'Ohne Tipp abgeben (0 Bonus)' : 'Submit no tip (0 bonus)')}
      </CozyBtn>
    </CozyCard>
  );
}

// ── FinalRecapHintCard ───────────────────────────────────────────────────────
// 2026-05-09 v3 (Wolf 'waehrend recap auf /team einen hinweis statt voller
// tabelle'): kompakte Card die zwischen Final-Fragen erscheint.
export function FinalRecapHintCard({
  state: s, myTeamId, lang,
}: {
  state: QQStateUpdate; myTeamId: string; lang: 'de' | 'en';
}) {
  const de = lang === 'de';
  const myBet = (s.finalBets ?? {})[myTeamId];
  const targetTeam = myBet?.targetTeamId ? s.teams.find(t => t.id === myBet.targetTeamId) : null;
  const targetWins = targetTeam ? ((s.finalPhaseWins ?? {})[targetTeam.id] ?? 0) : 0;
  const myTeam = s.teams.find(t => t.id === myTeamId);
  const myColor = myTeam?.color ?? QQ_COLORS.brandPink;
  return (
    <CozyCard borderColor={myColor}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>📊</div>
        <div style={{
          fontSize: 11, fontWeight: 900, color: QQ_COLORS.slate400,
          textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8,
        }}>
          {de ? '🪙 Zwischenstand' : '🪙 Standings'}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: QQ_COLORS.slate100, lineHeight: 1.4, marginBottom: 14 }}>
          {de ? 'Schau auf den Beamer, wie steht dein Tipp?' : 'Check the screen, how\'s your tip doing?'}
        </div>
        {targetTeam ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: '12px 16px', borderRadius: 16,
            background: `${targetTeam.color}1a`,
            border: `1.5px solid ${targetTeam.color}66`,
          }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: QQ_COLORS.slate400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {de ? 'Dein Tipp' : 'Your tip'}
            </span>
            <QQTeamAvatar avatarId={targetTeam.avatarId} teamEmoji={targetTeam.emoji} size={36} />
            <span style={{ fontWeight: 900, color: targetTeam.color, fontSize: 16, flex: 1, textAlign: 'left' }}>
              {targetTeam.name}
            </span>
            <span style={{
              fontSize: 22, fontWeight: 900, color: QQ_COLORS.brandPink,
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 0 12px rgba(236,72,153,0.5)',
            }}>{targetWins} 🏆</span>
          </div>
        ) : (
          <div style={{
            fontSize: 13, color: QQ_COLORS.slate400, fontStyle: 'italic',
            padding: '10px 14px', borderRadius: 12,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {de ? 'Du hattest keinen Tipp abgegeben.' : 'You placed no tip.'}
          </div>
        )}
      </div>
    </CozyCard>
  );
}

// ── FinalRevealStackPlacementCard ────────────────────────────────────────────
// 2026-05-25 (Wolf Final-Wager v4): Wenn der Reveal-Step Bonus-Stacks fuer das
// eigene Team vergibt, picked das Team eigene Cells fuer Story-Stamps. Mini-
// Grid mit Tap-to-Place. Pro Tap 1 Stamp aus der pending-Queue.
const STAMP_EMOJI: Record<'underdog' | 'speedy' | 'meisterklauer' | 'bet' | 'sympathy', string> = {
  underdog: '🐢',
  speedy: '⚡',
  meisterklauer: '🦝',
  bet: '🪙',
  sympathy: '💞',
};

export function FinalRevealStackPlacementCard({
  state: s, myTeamId, emit, roomCode, lang,
}: {
  state: QQStateUpdate;
  myTeamId: string;
  emit: (event: string, payload: any, ack?: (res: any) => void) => void;
  roomCode: string;
  lang: 'de' | 'en';
}) {
  const de = lang === 'de';
  const myTeam = s.teams.find(t => t.id === myTeamId);
  const myColor = myTeam?.color ?? '#EC4899';
  const pending = s.finalRevealPendingStacks;
  if (!pending || pending.teamId !== myTeamId || pending.kinds.length === 0) return null;

  const nextKind = pending.kinds[0];
  const nextEmoji = STAMP_EMOJI[nextKind];
  const remaining = pending.kinds.length;
  const total = remaining; // headcount der Queue zum Render-Zeitpunkt
  const titleDe = nextKind === 'underdog' ? '🐢 Trostpreis verteilen!'
    : nextKind === 'speedy' ? '⚡ Speedy-Bonus setzen!'
    : nextKind === 'meisterklauer' ? '🦝 Klauer-Bonus setzen!'
    : nextKind === 'sympathy' ? '💞 Sympathie-Bonus setzen!'
    : '🪙 Tipp-Bonus setzen!';
  const titleEn = nextKind === 'underdog' ? '🐢 Place underdog bonus!'
    : nextKind === 'speedy' ? '⚡ Place speedy bonus!'
    : nextKind === 'meisterklauer' ? '🦝 Place steal bonus!'
    : nextKind === 'sympathy' ? '💞 Place sympathy bonus!'
    : '🪙 Place tip bonus!';

  const onPick = (row: number, col: number) => {
    const cell = s.grid[row]?.[col];
    if (!cell || cell.ownerId !== myTeamId) return;
    emit('qq:finalRevealPlaceStack', { roomCode, teamId: myTeamId, row, col });
  };

  const N = s.gridSize;
  // Cell-Stamp-Count fuer visuelle Overlap-Anzeige.
  const stampCountAt = (row: number, col: number): number => {
    const cell = s.grid[row]?.[col];
    return cell?.revealStamps?.length ?? 0;
  };

  return (
    <CozyCard borderColor={myColor}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 36, marginBottom: 6, animation: 'tcwinBounce 0.7s ease both' }}>{nextEmoji}</div>
        <div style={{
          fontSize: 11, fontWeight: 900, color: '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4,
        }}>
          {de ? 'Bonus verteilen' : 'Place bonus'}
        </div>
        <div style={{ fontSize: 19, fontWeight: 900, color: myColor, marginBottom: 4 }}>
          {de ? titleDe : titleEn}
        </div>
        <div style={{ fontSize: 13, color: '#CBD5E1', marginBottom: 12 }}>
          {de
            ? `Tippe ein eigenes Feld — ${remaining} ${remaining === 1 ? 'Stempel' : 'Stempel'} übrig`
            : `Tap an own field — ${remaining} ${remaining === 1 ? 'stamp' : 'stamps'} left`}
        </div>
        {/* Queue-Pills */}
        {total > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
            {pending.kinds.map((k, i) => (
              <span key={i} style={{
                fontSize: 18, padding: '4px 8px',
                borderRadius: 10,
                background: i === 0 ? `${myColor}33` : 'rgba(255,255,255,0.06)',
                border: i === 0 ? `1.5px solid ${myColor}` : '1px solid rgba(255,255,255,0.10)',
                opacity: i === 0 ? 1 : 0.55,
              }}>{STAMP_EMOJI[k]}</span>
            ))}
          </div>
        )}
        {/* Mini-Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${N}, 1fr)`,
          gap: 4, padding: 8, borderRadius: 12,
          background: 'rgba(0,0,0,0.30)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {s.grid.flatMap((row, r) => row.map((cell, c) => {
            const isOwn = cell.ownerId === myTeamId;
            const stampN = stampCountAt(r, c);
            const owner = cell.ownerId ? s.teams.find(t => t.id === cell.ownerId) : null;
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => isOwn && onPick(r, c)}
                disabled={!isOwn}
                style={{
                  aspectRatio: '1 / 1',
                  border: isOwn ? `1.5px solid ${myColor}` : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  background: isOwn ? `${myColor}26` : owner ? `${owner.color}14` : 'rgba(255,255,255,0.04)',
                  color: '#F1F5F9',
                  fontSize: 10, fontWeight: 800,
                  cursor: isOwn ? 'pointer' : 'default',
                  opacity: isOwn ? 1 : 0.55,
                  position: 'relative',
                  padding: 0, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.15s ease',
                }}
                onTouchStart={e => { if (isOwn) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)'; }}
                onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
              >
                {stampN > 0 ? (
                  <span style={{ fontSize: stampN > 2 ? 9 : 13, lineHeight: 1 }}>
                    {stampN > 2 ? `${stampN}×` : '★'.repeat(Math.min(stampN, 2))}
                  </span>
                ) : isOwn ? (
                  <span style={{ fontSize: 14, opacity: 0.85 }}>+</span>
                ) : null}
              </button>
            );
          }))}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: '#94A3B8' }}>
          {de ? 'Eigene Felder leuchten in deiner Farbe.' : 'Your own fields glow in your color.'}
        </div>
      </div>
    </CozyCard>
  );
}

// ── FinalRevealCard ──────────────────────────────────────────────────────────
// 2026-05-09 (Final-Wager Refactor): Tipp-Variante. Zeigt mein Tipp-Ergebnis:
// targetTeam · N Wins · Sympathie-Bonus · Total-Bonus.
export function FinalRevealCard({
  state: s, myTeamId, lang,
}: {
  state: QQStateUpdate; myTeamId: string; lang: 'de' | 'en';
}) {
  const de = lang === 'de';
  const myTeam = s.teams.find(t => t.id === myTeamId);
  const myColor = myTeam?.color ?? QQ_COLORS.brandPink;
  const myResolution = s.finalBetResolution?.[myTeamId];
  const targetTeam = myResolution?.targetTeamId ? s.teams.find(t => t.id === myResolution.targetTeamId) : null;
  const mutualPartner = myResolution?.mutualWith ? s.teams.find(t => t.id === myResolution.mutualWith) : null;

  return (
    <CozyCard borderColor={myColor}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 38, marginBottom: 8 }}>🏆</div>
        <div style={{ fontSize: 11, fontWeight: 900, color: QQ_COLORS.slate400, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
          {de ? 'Final-Auflösung' : 'Final reveal'}
        </div>
        {!myResolution || !targetTeam ? (
          <div style={{ fontSize: 14, color: QQ_COLORS.slate400, fontStyle: 'italic', padding: '14px 0' }}>
            {de ? 'Du hattest keinen Tipp abgegeben, kein Bonus.' : 'You placed no tip, no bonus.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            {/* Mein Tipp */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 14,
              background: `${targetTeam.color}1a`,
              border: `1.5px solid ${targetTeam.color}66`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: QQ_COLORS.slate400, textTransform: 'uppercase' }}>
                {de ? 'Tipp' : 'Tip'}
              </span>
              <QQTeamAvatar avatarId={targetTeam.avatarId} teamEmoji={targetTeam.emoji} size={32} />
              <span style={{ flex: 1, fontWeight: 900, color: targetTeam.color, fontSize: 15, textAlign: 'left' }}>{targetTeam.name}</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: targetTeam.color }}>
                {myResolution.targetWins}× 🏆
              </span>
            </div>
            {/* Sympathie-Bonus 💞 wenn mutual */}
            {mutualPartner && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(244,114,182,0.18), rgba(236,72,153,0.10))',
                border: '1.5px solid rgba(244,114,182,0.55)',
                boxShadow: '0 0 18px rgba(244,114,182,0.35)',
              }}>
                <span style={{ fontSize: 22 }}>💞</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: QQ_COLORS.brandPinkSoft, textAlign: 'left' }}>
                  {de
                    ? `Sympathie-Bonus mit ${mutualPartner.name}`
                    : `Sympathy bonus with ${mutualPartner.name}`}
                </span>
                <span style={{ fontSize: 18, fontWeight: 900, color: QQ_COLORS.brandPinkSoft }}>+1</span>
              </div>
            )}
            {/* Total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 16px', borderRadius: 14,
              background: 'rgba(34,197,94,0.12)',
              border: '2px solid rgba(34,197,94,0.45)',
              marginTop: 4,
            }}>
              <span style={{ fontSize: 14, color: QQ_COLORS.green300, fontWeight: 800 }}>
                {de ? '✨ Dein Bonus' : '✨ Your bonus'}
              </span>
              <span style={{ fontSize: 26, fontWeight: 900, color: QQ_COLORS.green500 }}>
                +{myResolution.totalBonus}
              </span>
            </div>
          </div>
        )}
        <div style={{ marginTop: 14, fontSize: 13, color: QQ_COLORS.slate400, lineHeight: 1.4 }}>
          {de ? 'Schau auf den Beamer für die End-Awards!' : 'Watch the beamer for the end-awards!'}
        </div>
      </div>
    </CozyCard>
  );
}

// ── GameOverCard ─────────────────────────────────────────────────────────────
export function GameOverCard({ state: s, myTeamId, lang = 'de', roomCode }: { state: QQStateUpdate; myTeamId: string; lang?: 'de' | 'en'; roomCode?: string }) {
  // 2026-07-04 (Arena-Audit): CozyArena nach Fraktion gruppieren (qqSortedGroups
  // summiert Sub-Teams je Fraktion) — sonst listet die Endkarte ~25 rohe Sub-Teams
  // mit doppelten Fraktions-Namen + 0-Punkte-Phantomzeilen. Muster wie PausedCard.
  const largeMode = !!(s as any).largeGroupMode;
  // 2026-07-09 (Wolf-Livetest 'Handy und Beamer zeigen unterschiedliche Sieger'):
  // Endstand MUSS wie der Beamer nach dem FINALEN Gesamt-Score ranken
  // (largestConnected + Final-Wetten-Bonus + Award-Punkte), nicht nur nach
  // largestConnected. Sonst kürt das Handy einen anderen Sieger als der Beamer.
  const sorted  = largeMode ? qqSortedGroups(s) : qqFinalSortedTeams(s);
  const myRaw   = s.teams.find(t => t.id === myTeamId);
  const myTeam  = largeMode ? sorted.find(t => t.avatarId === myRaw?.avatarId) : myRaw;
  const myRank  = sorted.findIndex(t => t.id === myTeam?.id) + 1;
  const winner  = sorted[0];
  const iWon = myRank === 1;
  // 2026-05-02 (Stamm-Team-Code): teamId als lesbarer Code formatiert.
  // Wird beim naechsten Pub-Besuch im Setup eingegeben → Win-Streak.
  const stammCode = formatStammCode(myTeamId);
  const wonLabel = lang === 'de' ? 'Gewonnen! 🎉' : 'You won! 🎉';
  const winsLabelTpl = lang === 'de' ? '{name} gewinnt!' : '{name} wins!';
  // 2026-07-01: Groß-Modus → Score ist Punkte, nicht Grid-Felder.
  const connectedLabel = largeMode ? (lang === 'de' ? 'Punkte' : 'pts') : (lang === 'de' ? 'verbunden' : 'connected');

  return (
    <CozyCard borderColor={iWon ? QQ_COLORS.brandPink : undefined}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        {/* Hero section */}
        <div style={{ animation: 'tcwinBounce 0.7s ease both' }}>
          {iWon ? (
            <div style={{ fontSize: 52, marginBottom: 4 }}><QQEmojiIcon emoji="🏆"/></div>
          ) : (
            <QQTeamAvatar avatarId={winner.avatarId} teamEmoji={winner.emoji} size={52} style={{ margin: '0 auto 4px' }} />
          )}
          {iWon ? (
            <div style={{ fontSize: 26, fontWeight: 900, color: myTeam?.color, marginBottom: 4 }}>
              {wonLabel}
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 900, color: winner.color, fontSize: 22, marginBottom: 2 }}>
                {winsLabelTpl.replace('{name}', winner.name)}
              </div>
              <div style={{
                display: 'inline-block', padding: '4px 14px', borderRadius: 999,
                background: `${myTeam?.color ?? QQ_COLORS.slate500}18`,
                border: `1px solid ${myTeam?.color ?? QQ_COLORS.slate500}44`,
                fontSize: 14, fontWeight: 900, color: myTeam?.color ?? QQ_COLORS.slate400,
              }}>
                {lang === 'de' ? `Ihr: Platz ${myRank}` : `You: #${myRank}`}
              </div>
            </>
          )}
        </div>

        {/* Rankings */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map((tm, i) => {
            const cellCount = largeMode ? 0 : s.grid.flatMap(row => row.filter(c => c.ownerId === tm.id)).length;
            // 2026-05-05 (Wolf 'team color = team id'): tm.color ist seit
            // Backend-Fix automatisch die Brett-Palette-Farbe.
            const tmColor = tm.color;
            // Arena: eigene Zeile = meine Fraktion (tm.id ist grp-…, nicht myTeamId).
            const isMine = tm.id === myTeam?.id;
            return (
              <div key={tm.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 16,
                background: isMine ? `${tmColor}18` : 'rgba(255,255,255,0.03)',
                border: isMine ? `2px solid ${tmColor}44` : '1px solid rgba(255,255,255,0.06)',
                animation: `tcreveal 0.5s ease ${0.3 + i * 0.12}s both`,
              }}>
                <span style={{ fontSize: 16, width: 24, fontWeight: 900,
                  color: i === 0 ? QQ_COLORS.yellow500 : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : QQ_COLORS.slate600,
                }}>{i === 0 ? <QQEmojiIcon emoji="🥇"/> : i === 1 ? <QQEmojiIcon emoji="🥈"/> : i === 2 ? <QQEmojiIcon emoji="🥉"/> : `#${i + 1}`}</span>
                <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={24} />
                <span style={{ fontWeight: 900, color: tmColor, flex: 1, fontSize: 15 }}>{tm.name}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: i === 0 ? QQ_COLORS.brandPink : QQ_COLORS.slate400 }}>
                    {largeMode ? tm.largestConnected : qqFinalTotal(s, tm.id)} {connectedLabel}
                  </div>
                  {!largeMode && <div style={{ fontSize: 11, color: QQ_COLORS.slate600 }}>{cellCount} {lang === 'de' ? 'gesamt' : 'total'}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* 2026-05-02 (Stamm-Team-Code): zeige meinen Code als Wiederkommer-Anker.
            Sichtbar in GAME_OVER und THANKS — Spieler kann ihn abfotografieren. */}
        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 16,
          background: 'rgba(236,72,153,0.08)',
          border: '1px solid rgba(236,72,153,0.30)',
          textAlign: 'center',
          animation: 'tcreveal 0.5s ease 0.4s both',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 900, color: QQ_COLORS.brandPink,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4,
          }}>
            {lang === 'de' ? '🔖 Dein Stamm-Code' : '🔖 Your regular code'}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 2, marginBottom: 4,
          }}>
            <div style={{
              fontSize: 22, fontWeight: 900, color: QQ_COLORS.brandPinkSoft,
              fontFamily: 'monospace', letterSpacing: '0.04em',
              userSelect: 'all',
            }}>
              {stammCode}
            </div>
            <CopyButton text={stammCode} lang={lang} />
          </div>
          <div style={{
            fontSize: 11, color: QQ_COLORS.slate400, fontWeight: 700,
            marginTop: 4, lineHeight: 1.35,
          }}>
            {lang === 'de'
              ? 'Beim nächsten Mal eingeben, deine Sieg-Streak zählt mit.'
              : 'Enter it next time, your win streak carries over.'}
          </div>
        </div>

        {/* Thanks message + summary link — only on THANKS phase */}
        {s.phase === 'THANKS' && (
          <div style={{
            marginTop: 18,
            animation: 'tcreveal 0.5s ease 0.5s both',
          }}>
            <div style={{
              fontSize: 17, fontWeight: 900, color: QQ_COLORS.brandPinkSoft,
              textAlign: 'center', marginBottom: 4, lineHeight: 1.35,
            }}>
              {/* 2026-07-08 Konsistenz #14: Wording exakt wie Beamer-ThanksView
                  ('Danke fürs Spielen' / 'Thanks for Playing'). */}
              {lang === 'en' ? '✨ Thanks for Playing! ✨' : '✨ Danke fürs Spielen! ✨'}
            </div>
            <div style={{
              fontSize: 14, fontWeight: 700, color: QQ_COLORS.slate400,
              textAlign: 'center', marginBottom: 14,
            }}>
              {lang === 'en' ? 'We hope you had fun, see you next time!' : 'Wir hoffen, ihr hattet Spaß, bis zum nächsten Mal!'}
            </div>
            {roomCode && (
              <a
                href={`/summary/${encodeURIComponent(roomCode)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', padding: '14px 16px',
                  borderRadius: 16, textAlign: 'center',
                  background: 'linear-gradient(135deg, #EC4899, #EC4899)',
                  color: '#0A0814', fontWeight: 900, fontSize: 16,
                  textDecoration: 'none',
                  boxShadow: '0 4px 0 #A21247, 0 0 24px rgba(236,72,153,0.35)',
                  animation: 'tcreveal 0.5s ease 0.7s both',
                }}
              >
                {lang === 'en' ? '📊 View full results' : '📊 Zur Ergebnisseite'}
              </a>
            )}
          </div>
        )}
      </div>
    </CozyCard>
  );
}

// ── CozyGameCard ─────────────────────────────────────────────────────────────
// 2026-05-17 (Wolf '/team view ist komplett leer während cozygame'):
// Phone-Card für COZY_GAME-Phase mit Game-Info + Queue-Position bei Sequence-
// Mode. Lädt das aktive Spiel via /api/cozygames (cached pro Mount).
export function CozyGameCard({
  state: s, myTeamId, lang = 'de',
}: {
  state: QQStateUpdate;
  myTeamId: string;
  lang?: 'de' | 'en';
}) {
  const cg = (s as any).cozyGame;
  const [activeGame, setActiveGame] = useState<{ id: string; emoji: string; name: string; description: string; parallel?: boolean } | null>(null);
  const activeGameId = cg?.activeGameId ?? null;

  useEffect(() => {
    if (!activeGameId) { setActiveGame(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/cozygames');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const g = (data ?? []).find((x: any) => x.id === activeGameId);
        if (g) setActiveGame({ id: g.id, emoji: g.emoji, name: g.name, description: g.description, parallel: g.parallel });
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [activeGameId]);

  const de = lang === 'de';
  if (!cg) {
    return (
      <CozyCard>
        <div style={{ padding: 32, textAlign: 'center', color: QQ_COLORS.slate400 }}>
          {de ? 'CozyGame lädt …' : 'CozyGame loading …'}
        </div>
      </CozyCard>
    );
  }

  const sub = cg.phase as string;
  const playMode = cg.playMode as 'parallel' | 'sequence' | undefined;
  const order: string[] = cg.sequenceOrder ?? [];
  const curIdx: number = cg.sequenceCurrentIdx ?? 0;
  const completed: string[] = cg.sequenceCompletedTeamIds ?? [];
  const myPos = order.indexOf(myTeamId);
  const isMyTurn = playMode === 'sequence' && myPos === curIdx;
  const iAmCompleted = playMode === 'sequence' && completed.includes(myTeamId);
  const iAmWaiting = playMode === 'sequence' && myPos > curIdx;

  // Sub-Phase Headlines
  let headline = '';
  let subline = '';
  if (sub === 'INTRO') {
    headline = de ? '🪅 CozyGame!' : '🪅 CozyGame!';
    subline = de ? 'Gleich geht\'s los, das Glücksrad entscheidet.' : 'Here we go, the wheel will pick a game.';
  } else if (sub === 'WHEEL_SPIN') {
    headline = de ? '🎡 Rad dreht sich …' : '🎡 Wheel spinning …';
    subline = de ? 'Welches Spiel wirds?' : 'Which game will it be?';
  } else if (sub === 'WHEEL_RESULT' || sub === 'GAME_ACTIVE') {
    headline = activeGame ? activeGame.name : (de ? 'Spiel ausgewählt' : 'Game picked');
    if (playMode === 'sequence') {
      if (isMyTurn) subline = de ? '🎯 DU BIST DRAN! Spielt jetzt am Beamer.' : '🎯 YOUR TURN! Play at the beamer now.';
      else if (iAmCompleted) subline = de ? '✓ Du bist fertig, gut gemacht!' : '✓ You\'re done, well played!';
      else if (iAmWaiting) {
        const remaining = myPos - curIdx;
        subline = de ? `Du bist als ${remaining + 1}. dran (Position ${myPos + 1} / ${order.length})` : `You're up in ${remaining} (position ${myPos + 1} / ${order.length})`;
      } else subline = de ? 'Du bist nicht im Spiel-Pool.' : 'You\'re not in the play pool.';
    } else {
      subline = sub === 'GAME_ACTIVE'
        ? (de ? '🤜 Alle Teams spielen gleichzeitig, Beamer zeigt den Timer!' : '🤜 All teams play simultaneously, see beamer for timer!')
        : (de ? '👀 Gleich startet das Spiel …' : '👀 Game starts in a moment …');
    }
  } else if (sub === 'WINNER_SELECT') {
    headline = activeGame ? activeGame.name : (de ? 'Sieger-Reveal' : 'Winner reveal');
    subline = de ? '🏆 Sieger steht gleich fest, Blick auf den Beamer!' : '🏆 Winner reveal coming, watch the beamer!';
  }

  return (
    <CozyCard>
      <div style={{
        padding: 'clamp(20px, 4vw, 32px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'clamp(14px, 2vh, 22px)', textAlign: 'center',
      }}>
        {/* Game-Icon (nur wenn ein Spiel gewählt ist) */}
        {activeGame && (sub === 'WHEEL_RESULT' || sub === 'GAME_ACTIVE' || sub === 'WINNER_SELECT') && (
          <CozyGameIcon
            id={activeGame.id}
            emoji={activeGame.emoji}
            size="clamp(56px, 12vw, 104px)"
            style={{ filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.35))' }}
          />
        )}

        {/* Headline (Game-Name) */}
        <div style={{
          fontSize: 'clamp(28px, 5.5vw, 44px)',
          fontWeight: 900,
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
        }}>
          {headline}
        </div>

        {/* Subline (Sub-Phase / Queue-Status) */}
        <div style={{
          fontSize: 'clamp(15px, 3vw, 20px)',
          color: isMyTurn ? QQ_COLORS.green500 : iAmCompleted ? QQ_COLORS.slate400 : QQ_COLORS.slate200,
          fontWeight: isMyTurn ? 900 : 600,
          lineHeight: 1.35,
          maxWidth: 460,
        }}>
          {subline}
        </div>

        {/* Game-Description (nur bei WHEEL_RESULT/GAME_ACTIVE) */}
        {activeGame && (sub === 'WHEEL_RESULT' || sub === 'GAME_ACTIVE' || sub === 'WINNER_SELECT') && (
          <div style={{
            fontSize: 'clamp(13px, 2.4vw, 17px)',
            color: QQ_COLORS.slate300,
            lineHeight: 1.4,
            maxWidth: 480,
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
          }}>
            {activeGame.description}
          </div>
        )}

        {/* Mode-Pill */}
        {playMode && sub === 'GAME_ACTIVE' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 999,
            background: playMode === 'sequence' ? 'rgba(34,197,94,0.18)' : 'rgba(236,72,153,0.18)',
            border: `1px solid ${playMode === 'sequence' ? '#22C55E55' : '#EC489955'}`,
            fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
            color: playMode === 'sequence' ? QQ_COLORS.green300 : '#F9A8D4',
          }}>
            {playMode === 'sequence' ? (de ? '👤 Nacheinander' : '👤 Take turns') : (de ? '🤜 Parallel' : '🤜 All at once')}
          </div>
        )}
      </div>
    </CozyCard>
  );
}
