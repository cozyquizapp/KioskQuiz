/**
 * CozyQuizComebackView — Comeback-Phase fuer das letzte Team vor dem Finale.
 *
 * Variant-basiert: Higher/Lower-Mini-Game (Number- oder Year-Card-Reveal),
 * Place2-Choice, Steal1-Choice, Swap2-Choice. Wolf surprised-Reaction beim
 * Comeback-Announce. SlotMachineNumber fuer Reveal-Animation (number + year).
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-12 (Refactor Phase 3, FINAL).
 * Mit-extrahiert: SlotMachineNumber (lokaler Helper, nur in ComebackView genutzt).
 * 2 externe Importer (QQBuiltinSlide + Beamer-Phase-Router).
 *
 * WolfUeberraschtWithBubble bleibt in QQBeamerPage (nutzt SpeechBubble +
 * AnimatedCozyWolf die dort viel mehr Caller haben) — wird re-importiert.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { useLangFlip, bt, COZY_CARD_BG } from '../cozyQuizShared';
import { BeamerTimer } from './CozyQuizBeamerTimer';
import { Fireflies } from './CozyQuizAmbient';
import { QQEmojiIcon } from './QQIcon';
import { QQTeamAvatar } from './QQTeamAvatar';
import { TeamNameLabel } from './TeamNameLabel';
import { WolfUeberraschtWithBubble } from '../pages/QQBeamerPage';

function SlotMachineNumber({ value, fontSize, color, glow, isYear }: {
  value: number;
  fontSize: string;
  color: string;
  glow?: string;
  isYear?: boolean;
}) {
  // Jahreszahlen ohne Tausendertrennzeichen (z.B. „1900"), sonst „1.500.000".
  const targetStr = isYear ? String(Math.round(value)) : value.toLocaleString('de-DE');
  const chars = useMemo(() => targetStr.split(''), [targetStr]);
  const digitPositions = useMemo(() => chars.map((c, i) => /\d/.test(c) ? i : -1).filter(i => i >= 0), [chars]);

  // Globale Tick-Counter für die Roller — alle Digits rollen synchron, aber
  // jeder Digit "stoppt" nacheinander bei einem bestimmten Tick-Threshold.
  const [tick, setTick] = useState(0);
  // Wieviele Digits sind schon "gelandet" (von links).
  const [landed, setLanded] = useState(0);
  const totalDigits = digitPositions.length;

  useEffect(() => {
    // Roller-Frequenz: 70ms pro Tick → flackernde Random-Ziffer
    const rollId = setInterval(() => setTick(t => t + 1), 70);
    return () => clearInterval(rollId);
  }, []);

  useEffect(() => {
    // Staggered Stop: erster Digit landet nach 800ms, dann jeder weitere nach +280ms.
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < totalDigits; i++) {
      timeouts.push(setTimeout(() => setLanded(i + 1), 800 + i * 280));
    }
    return () => { timeouts.forEach(clearTimeout); };
  }, [totalDigits]);

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 0,
      fontVariantNumeric: 'tabular-nums', lineHeight: 1,
    }}>
      {chars.map((char, idx) => {
        const isDigit = /\d/.test(char);
        if (!isDigit) {
          // Trennzeichen statisch
          return (
            <span key={idx} style={{
              fontSize, fontWeight: 900, color, textShadow: glow ? `0 0 28px ${glow}` : undefined,
            }}>{char}</span>
          );
        }
        const digitOrderIdx = digitPositions.indexOf(idx);
        const stopped = digitOrderIdx < landed;
        const display = stopped ? char : String((tick + idx * 7) % 10);
        return (
          <span
            key={`${idx}-${stopped ? 'l' : 'r'}`}
            style={{
              fontSize, fontWeight: 900, color, textShadow: glow ? `0 0 28px ${glow}` : undefined,
              display: 'inline-block',
              animation: stopped ? 'slotMachineStop 0.36s var(--qq-ease-bounce) both' : undefined,
            }}
          >{display}</span>
        );
      })}
      <style>{`
        @keyframes slotMachineStop {
          0%   { transform: translateY(-30%) scale(0.85); opacity: 0.4; filter: blur(2px); }
          55%  { transform: translateY(6%)  scale(1.18); opacity: 1;   filter: blur(0); }
          100% { transform: translateY(0)   scale(1);    opacity: 1;   filter: blur(0); }
        }
      `}</style>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMEBACK VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export function ComebackView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const cardBg = s.theme?.cardBg ?? COZY_CARD_BG;
  const hl = s.comebackHL;
  // H/L: alle tied-letzten Teams. Ohne H/L: Fallback auf altes 1-Team-Verhalten.
  const hlTeams = hl ? hl.teamIds.map(id => s.teams.find(tm => tm.id === id)).filter(Boolean) as typeof s.teams : [];
  const team = s.teams.find(tm => tm.id === s.comebackTeamId);
  const teamColor = team?.color ?? '#EC4899';
  const step = s.comebackIntroStep ?? 0;
  const targets = s.comebackStealTargets ?? [];
  const leaderTeams = targets.map(id => s.teams.find(tm => tm.id === id)).filter(Boolean) as typeof s.teams;
  const showTeam = step >= 1;
  // 2026-05-06 v2 (Wolf 'so funktionierts unter COMEBACK schreiben, dann
  // nur noch Teams+Leader-Seite — separate H/L-Erklaer-Seite weg'):
  // - Step 0: COMEBACK-Title + H/L-Erklaerung direkt darunter
  // - Step 1: Team-Hero + 'Klauen bei: [Leader]'
  // (kein Step 2 mehr — Backend maxStep 1)
  const showAction = step >= 1;

  // Action-Text nur noch fuer Legacy-Comeback (kein H/L). H/L-Spiele zeigen
  // im Step 1 keinen Text in der Action-Card — nur 'Klauen bei [Leader]'.
  const actionTextDe = hl
    ? null
    : (leaderTeams.length === 1
        ? `Klaut 2 Felder von ${leaderTeams[0]?.name ?? 'dem Führenden'}.`
        : `Klaut je 1 Feld von jedem der ${leaderTeams.length} Führenden.`);
  const actionTextEn = hl
    ? null
    : (leaderTeams.length === 1
        ? `Steals 2 cells from ${leaderTeams[0]?.name ?? 'the leader'}.`
        : `Steals 1 cell from each of the ${leaderTeams.length} leaders.`);

  // Nummer kompakt formatieren: 3800000 → 3,8M | 15000 → 15k | 300 → 300
  // Bei Jahreszahlen kein Tausendertrennzeichen (1900 statt 1.900).
  // Auto-Detection ergänzt: Werte 1000-2100 als Integer = Jahreszahl.
  const looksLikeYearHL = (n: number) => Number.isInteger(n) && n >= 1000 && n <= 2100;
  const isYearUnitHL = /jahr|year/i.test(hl?.currentPair?.unit ?? '') ||
    (hl?.currentPair?.subjectValue != null && looksLikeYearHL(hl.currentPair.subjectValue)) ||
    (hl?.currentPair?.anchorValue != null && looksLikeYearHL(hl.currentPair.anchorValue));
  const fmtHL = (n: number) => {
    if (isYearUnitHL) return String(Math.round(n));
    const abs = Math.abs(n);
    // 2026-05-10 (Wolf 'EN-Mode zeigt DE-Suffix'): Mrd./Mio. nur bei DE,
    // bn/M bei EN. Plus thousands-Separator schon lang-bedingt.
    const isEn = lang === 'en';
    if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + (isEn ? ' bn' : ' Mrd.');
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + (isEn ? ' M' : ' Mio.');
    if (abs >= 10_000) return Math.round(n / 1000) + 'k';
    if (abs >= 1000) return n.toLocaleString(isEn ? 'en-US' : 'de-DE');
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  };

  // ── H/L UNIFIED Frage- und Reveal-Ansicht ──────────────────────────────
  // Question und Reveal teilen sich exakt dieselbe Composition. Beim Wechsel
  // wird KEINE neue Folie eingeblendet — nur die Subject-Wert-Stelle (??? →
  // Slot-Machine-Roll), der Direction-Indikator (? → MEHR ↑ / WENIGER ↓) und
  // die Avatar-Status-Layer (Tipp-Status → richtig/falsch + Winnings) wechseln
  // smooth in-place.
  if (hl && (hl.phase === 'question' || hl.phase === 'reveal') && hl.currentPair) {
    const pair = hl.currentPair;
    const isReveal = hl.phase === 'reveal';
    const correctChoice = pair.subjectValue > pair.anchorValue ? 'higher' : 'lower';
    const correctIds = new Set(hl.correctThisRound);
    // Frage-Text: bei Format-B customQuestion direkt, bei Format-A auto-generieren
    // („Hat München mehr oder weniger Einwohner als Berlin?"). Macht den Quiz-Show-
    // Moment deutlich starker als nur zwei Cards mit Zahlen.
    // 2026-05-10 (Wolf-Bug 'EN-Spiel zeigt DE-Frage'): Fallback auf *En-Felder
    // wenn lang='en'. Falls *En fehlt → DE-Wert (Backward-Compat zu alten
    // Einträgen ohne EN-Übersetzung).
    const isEn = lang === 'en';
    const pAnchor = isEn ? (pair.anchorLabelEn ?? pair.anchorLabel) : pair.anchorLabel;
    const pSubject = isEn ? (pair.subjectLabelEn ?? pair.subjectLabel) : pair.subjectLabel;
    const pUnit = isEn ? (pair.unitEn ?? pair.unit) : pair.unit;
    const pCustom = isEn ? (pair.customQuestionEn ?? pair.customQuestion) : pair.customQuestion;
    const questionText = pCustom
      ? pCustom
      : (isEn
          ? `Does ${pSubject} have more or less ${pUnit} than ${pAnchor}?`
          : `Hat ${pSubject} mehr oder weniger ${pUnit} als ${pAnchor}?`);
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        // 2026-05-13 v3 (Wolf 'Frage-Card hoch, andere unten, Avatar hat
        // Platz dazwischen'): justifyContent center → flex-start. Frage-Card
        // kriegt marginBottom:auto → schubst Card-Row + Team-Progress an den
        // parent-bottom. Dadurch entsteht ein grosser Spalt zwischen Frage-
        // Card und MEHR-Pille, in dem der hochfliegende Avatar landet ohne
        // jemals zu ueberlappen.
        justifyContent: 'flex-start',
        padding: 'max(var(--qq-safe-margin), clamp(100px, 13cqh, 160px)) max(var(--qq-safe-margin), clamp(28px, 3.5cqw, 56px)) max(var(--qq-safe-margin), clamp(20px, 3cqh, 40px))',
        gap: 'clamp(14px, 2cqh, 28px)',
        position: 'relative', overflow: 'hidden',
        minHeight: 0,
      }}>
        <Fireflies color="#EC489955" />
        {/* Header: Mehr-oder-Weniger-Pille (Question-Mode).
            2026-05-06 (Konsistenz-Audit S2#4): Auflösung-Variante entfernt —
            keine andere Standard-Kategorie zeigt eine Reveal-Pille. Avatar-
            Position an gold-pulsender MEHR/WENIGER-Pille zeigt das Ergebnis.
            Question-Mode-Pille bleibt als Mechanik-Indikator. */}
        {!isReveal && (
          <div style={{
            position: 'absolute', top: 'clamp(20px, 3cqh, 40px)', left: 0, right: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 6,
            animation: 'contentReveal 0.35s var(--qq-ease-pop-fast) both',
          }}>
            <div style={{
              padding: 'clamp(8px, 1cqh, 12px) clamp(20px, 2.2cqw, 32px)', borderRadius: 999,
              background: 'rgba(236,72,153,0.16)',
              border: '2px solid rgba(236,72,153,0.5)',
              color: '#FBCFE8',
              fontWeight: 900,
              fontSize: 'clamp(14px, 1.4cqw, 20px)', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              <QQEmojiIcon emoji="⚡"/> {lang === 'en' ? 'More or Less' : 'Mehr oder Weniger'}
            </div>
          </div>
        )}

        {/* Frage-Text — Hero-Look analog Standard-Quiz-Frage (cozyQuestionHero).
            Groesser, mit Border + Shadow, damit die H/L-Folie nicht mehr wie
            ein Fremdkoerper im Quiz wirkt sondern als „besondere Variante".
            Inner-key auf hl.round → smoother Cross-Fade nur des Texts beim
            Rundenwechsel, Card selbst bleibt stabil. */}
        <div style={{
          maxWidth: 1400, width: '94%',
          // 2026-05-13 v3 (Wolf 'Frage-Card oben, andere Cards unten'):
          // marginBottom:auto schubst alle folgenden Geschwister (Card-Row,
          // Team-Progress) an den parent-bottom. Frage-Card sitzt fest oben.
          marginBottom: 'auto',
          padding: 'clamp(18px, 2.6cqh, 36px) clamp(28px, 3.5cqw, 56px)',
          borderRadius: 24,
          background: 'linear-gradient(180deg, rgba(15,23,42,0.78), rgba(11,16,28,0.72))',
          border: '2px solid rgba(236,72,153,0.32)',
          boxShadow: '0 4px 0 rgba(236,72,153,0.18), 0 12px 36px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          minHeight: 'clamp(96px, 12cqh, 168px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) 0.08s both',
        }}>
          <div
            key={`hlq-${hl.round}`}
            style={{
              fontSize: 'clamp(32px, 4.5cqw, 72px)', fontWeight: 900, color: '#F8FAFC',
              textAlign: 'center', lineHeight: 1.18,
              textShadow: '0 2px 18px rgba(0,0,0,0.4)',
              animation: 'qqHlQuestionFade 0.6s ease both',
            }}
          >
            {questionText}
          </div>
        </div>

        {/* Anchor + Subject - zwei Karten nebeneinander */}
        <div style={{
          // 2026-05-05 v3: alignItems center (war stretch) — sonst zwingt der
          // groessere VS-Area minHeight die Anchor/Subject-Cards auf seine
          // Hoehe und sie wirken aufgeblaeht.
          display: 'flex', gap: 'clamp(16px, 2.2cqw, 36px)', alignItems: 'center',
          justifyContent: 'center', flexWrap: 'wrap', maxWidth: 1400, width: '100%',
          animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) 0.15s both',
        }}>
          {/* Anchor-Card: bekannter Wert.
              2026-05-05 v2 (Wolf 'avatar verdeckt pille immer noch — cards
              hoeher, mehr/weniger tiefer'): padding-vertical 44-72 → 60-100,
              minHeight 220-320 → 280-400. */}
          <div style={{
            flex: '1 1 0', maxWidth: 560, minWidth: 260,
            padding: 'clamp(60px, 7cqh, 100px) clamp(22px, 3cqw, 40px)', borderRadius: 24,
            minHeight: 'clamp(280px, 34cqh, 400px)',
            background: 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(34,197,94,0.04))',
            border: '2px solid rgba(34,197,94,0.42)',
            boxShadow: '0 0 40px rgba(34,197,94,0.18), 0 8px 28px rgba(0,0,0,0.4)',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center',
          }}>
            <div style={{
              fontSize: 'clamp(14px, 1.6cqw, 22px)', fontWeight: 900,
              color: '#86efac', letterSpacing: '0.1em', textTransform: 'uppercase',
              opacity: 0.8,
            }}>{pAnchor}</div>
            <div style={{
              fontSize: 'clamp(44px, 6cqw, 92px)', fontWeight: 900, color: '#86efac',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              textShadow: '0 0 28px rgba(34,197,94,0.35)',
            }}>{fmtHL(pair.anchorValue)}</div>
            <div style={{
              fontSize: 'clamp(14px, 1.4cqw, 20px)', fontWeight: 700, color: '#cbd5e1', opacity: 0.7,
            }}>{pUnit}</div>
          </div>

          {/* VS-Badge — der Hero zwischen den beiden Cards. Question: grosse
              VS-Pille mit Marken-Gold-Glow + sanftem Pulse. Reveal: Cross-Fade
              auf MEHR ↑ / WENIGER ↓. Width FIX 380px (wegen langem „WENIGER ↓"
              + letterSpacing) — User-Bug 2026-04-30 v3 r5.
              2026-05-04 v4 (Wolf-Bug 'VS nicht mittig'): alignSelf:center +
              fixierte Hoehe-Buchung damit der Container auf Card-Mitte sitzt
              (vorher fiel er bei alignItems:stretch + explicit height auf
              Top-aligned zurueck). minHeight matcht Card-Hoehe damit Card-
              Hoehe + VS-Hoehe gleich sind und visuell zentriert wirken. */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            // FIXED width — keine flex-Expansion + breit genug fuer „WENIGER ↓".
            width: 'clamp(260px, 22cqw, 380px)',
            flexShrink: 0,
            alignSelf: 'center',
            position: 'relative',
            // 2026-05-05 v3: minHeight erhoeht damit Pillen-Stack mit groesserem
            // gap reinpasst und Avatare oberhalb/unterhalb landen koennen.
            // v5 (Wolf 'cards hoeher, avatar Platz'): minHeight matched auf
            // neue Card-Hoehe (280-400 statt 220-320).
            minHeight: 'clamp(280px, 34cqh, 400px)',
          }}>
            {/* 2026-05-05 (Wolf): App-Pillen statt Goldkreise — MEHR oben (grün-
                Akzent), WENIGER unten (rot-Akzent). Same Pille-Style wie
                Kategorie-Badges. Bei Reveal: korrekte Pille pulst gold + scaled
                up, falsche fadet — Avatare landen direkt an der gewählten Pille
                und feiern dort. Direction-Big-Text-Indikator entfaellt
                (Pille-Label zeigt's schon). */}
            {/* 2026-05-13 v5 (Wolf-Designspec mit Screenshot-Beispiel):
                Pillen-Stack jetzt mit DREI Avatar-Slots im linearen flex-column
                Layout — oben (Teams mit 'higher'), mittig (Teams ohne Wahl =
                "spielen mit"), unten (Teams mit 'lower'). Untere Team-Progress-
                Row entfaellt — alle Avatare sind jetzt in der mittigen Saeule
                je nach State.
                Glow-Color je Slot:
                  - higher → grün (#22C55E)
                  - middle (unentschieden) → Team-Farbe
                  - lower → pink (#EC4899)
                Im Reveal: korrekte behalten Glow, falsche werden dim'd. */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(8px, 1cqh, 16px)',
              pointerEvents: 'none',
            }}>
              {(() => {
                const higherTeams = hlTeams.filter(tm => hl.answers[tm.id] === 'higher');
                const lowerTeams = hlTeams.filter(tm => hl.answers[tm.id] === 'lower');
                const undecidedTeams = hlTeams.filter(tm => !hl.answers[tm.id]);
                const avatarSize = 'clamp(54px, 5.8cqw, 88px)';

                const renderAvatarSlot = (
                  teams: typeof hlTeams,
                  slotKind: 'higher' | 'middle' | 'lower',
                ) => {
                  if (teams.length === 0) return null;
                  const slotGlow = slotKind === 'higher'
                    ? '#22C55E'
                    : slotKind === 'lower'
                      ? '#EC4899'
                      : null;  // middle: use team color
                  return (
                    <div style={{
                      display: 'flex', gap: 'clamp(6px, 0.8cqw, 14px)',
                      flexWrap: 'wrap', justifyContent: 'center',
                      zIndex: 5,
                      animation: 'contentReveal 0.4s var(--qq-ease-pop-fast) both',
                    }}>
                      {teams.map(tm => {
                        const correct = correctIds.has(tm.id);
                        const dim = isReveal && !correct;
                        const glowCol = slotGlow ?? tm.color;
                        return (
                          <QQTeamAvatar
                            key={tm.id}
                            avatarId={tm.avatarId}
                            teamEmoji={tm.emoji}
                            size={avatarSize}
                            style={{
                              opacity: dim ? 0.45 : 1,
                              filter: dim
                                ? 'grayscale(0.6)'
                                : correct
                                  ? 'drop-shadow(0 0 22px rgba(34,197,94,0.85)) drop-shadow(0 0 8px rgba(34,197,94,0.55))'
                                  : `drop-shadow(0 0 14px ${glowCol}aa)`,
                              boxShadow: dim
                                ? '0 0 14px rgba(148,163,184,0.18)'
                                : `0 0 0 3px ${glowCol}, 0 0 22px ${glowCol}88`,
                              transition: 'opacity 0.4s ease, filter 0.4s ease, box-shadow 0.4s ease',
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                };

                const renderPille = (dir: 'higher' | 'lower', idx: number) => {
                  const isHigher = dir === 'higher';
                  const accentCol = isHigher ? '#22C55E' : '#EC4899';
                  const correctTextLight = isHigher ? '#86EFAC' : '#F9A8D4';
                  const isCorrect = isReveal && correctChoice === dir;
                  const isWrong = isReveal && correctChoice !== dir;
                  return (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 12,
                      padding: 'clamp(10px, 1.4cqh, 16px) clamp(20px, 2.4cqw, 32px)',
                      borderRadius: 999,
                      background: isCorrect
                        ? `${accentCol}33`
                        : `${accentCol}14`,
                      border: `2.5px solid ${isCorrect ? accentCol : `${accentCol}66`}`,
                      boxShadow: isCorrect
                        ? `0 0 44px ${accentCol}aa, 0 0 14px ${accentCol}88, inset 0 1px 0 rgba(255,255,255,0.10)`
                        : `0 0 22px ${accentCol}33, inset 0 1px 0 rgba(255,255,255,0.05)`,
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      transform: isCorrect ? 'scale(1.08)' : isWrong ? 'scale(0.94)' : 'scale(1)',
                      opacity: isWrong ? 0.4 : 1,
                      transition: 'transform 0.5s var(--qq-ease-out-cubic), background 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease, opacity 0.45s ease',
                      animation: !isReveal
                        ? `qqVsPulse 2.4s ease-in-out ${idx * 0.3}s infinite`
                        : (isCorrect ? 'celebShake 0.6s ease 0.45s both' : undefined),
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{
                        fontSize: 'clamp(24px, 2.8cqw, 38px)', lineHeight: 1, fontWeight: 900,
                        color: accentCol,
                        transition: 'color 0.4s ease',
                      }}>{isHigher ? '↑' : '↓'}</span>
                      <span style={{
                        fontSize: 'clamp(18px, 2.2cqw, 30px)', fontWeight: 900,
                        color: isCorrect ? correctTextLight : accentCol,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        transition: 'color 0.4s ease',
                      }}>
                        {isHigher
                          ? (lang === 'en' ? 'Higher' : 'Mehr')
                          : (lang === 'en' ? 'Lower' : 'Weniger')}
                      </span>
                    </div>
                  );
                };

                return (
                  <>
                    {renderAvatarSlot(higherTeams, 'higher')}
                    {renderPille('higher', 0)}
                    {renderAvatarSlot(undecidedTeams, 'middle')}
                    {renderPille('lower', 1)}
                    {renderAvatarSlot(lowerTeams, 'lower')}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Subject-Card: 100 % statisches Layout — Border, Background,
              Glow ALLES KONSTANT zwischen Question und Reveal. Nur die
              ??? → Zahl-Stelle innen wechselt via Cross-Fade. User-Wunsch
              2026-04-28: 'Cards sollen sich nicht verändern, richte gleich
              so aus dass es passt'. */}
          {/* Subject-Card — siehe Anchor-Card oben (gleicher Wolf-Wunsch). */}
          <div style={{
            flex: '1 1 0', maxWidth: 560, minWidth: 260,
            padding: 'clamp(60px, 7cqh, 100px) clamp(22px, 3cqw, 40px)', borderRadius: 24,
            minHeight: 'clamp(280px, 34cqh, 400px)',
            background: 'linear-gradient(135deg, rgba(236,72,153,0.18), rgba(236,72,153,0.05))',
            border: '3px solid rgba(236,72,153,0.7)',
            boxShadow: '0 0 44px rgba(236,72,153,0.28), 0 8px 28px rgba(0,0,0,0.4)',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center',
          }}>
            <div style={{
              fontSize: 'clamp(14px, 1.6cqw, 22px)', fontWeight: 900,
              color: '#FBCFE8', letterSpacing: '0.1em', textTransform: 'uppercase',
              opacity: 0.9,
            }}>{pSubject}</div>
            <div style={{
              lineHeight: 1, height: 'clamp(44px, 6cqw, 92px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              // 2026-05-08 (Wolf-Wunsch zurück): perspective ermöglicht den
              // 3D-Slot-Machine-Drop in Y-Achse. Container-Höhe + Width sind
              // via Hidden-Placeholder schon FIX → keine Card-Größen-Sprünge
              // mehr (das war der historische Grund warum Slot-Machine raus war).
              perspective: 600,
            }}>
              {/* Unsichtbarer Platzhalter mit dem ECHTEN Wert reserviert die
                  Breite schon in der Frage-Phase. Sonst springt die Card beim
                  Reveal von „???" (~3em) auf z.B. „1.500.000" (~12em) →
                  ganzes Grid reflowt → wirkt wie eine neue Folie. */}
              <span aria-hidden style={{
                fontSize: 'clamp(44px, 6cqw, 92px)', fontWeight: 900,
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                visibility: 'hidden', whiteSpace: 'nowrap',
              }}>{fmtHL(pair.subjectValue)}</span>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {/* 2026-05-08 (Wolf-Wunsch 3D-Slot-Machine-Drop wieder rein,
                    aber mit fixer Card-Größe): Beide Spans absolute, beim Reveal
                    rotiert „???" 3D nach oben raus, echte Zahl rotiert von unten
                    rein. Pattern aus /animations Slot-4 (slotOut/slotIn keyframes).
                    Card-Container hat perspective:600 + overflow:hidden, beide
                    Spans sind absolut → Card-Layout bleibt 100 % stabil. */}
                <span style={{
                  position: 'absolute',
                  fontSize: 'clamp(44px, 6cqw, 92px)', fontWeight: 900, color: '#EC4899',
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                  textShadow: '0 0 28px rgba(236,72,153,0.45), 0 0 60px rgba(236,72,153,0.25)',
                  animation: isReveal
                    ? 'hlSlotOut 0.4s cubic-bezier(0.4, 0, 0.6, 1) both'
                    : 'hlQuestionMarkPulse 1.6s ease-in-out infinite',
                  willChange: 'transform, opacity',
                }}>???</span>
                <span style={{
                  position: 'absolute',
                  fontSize: 'clamp(44px, 6cqw, 92px)', fontWeight: 900, color: '#EC4899',
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                  textShadow: '0 0 32px rgba(236,72,153,0.55)',
                  animation: isReveal
                    ? 'hlSlotIn 0.55s var(--qq-ease-bounce) 0.28s both'
                    : undefined,
                  opacity: isReveal ? undefined : 0,
                  whiteSpace: 'nowrap',
                  willChange: 'transform, opacity',
                }}>{fmtHL(pair.subjectValue)}</span>
              </div>
            </div>
            <div style={{
              fontSize: 'clamp(14px, 1.4cqw, 20px)', fontWeight: 700, color: '#cbd5e1', opacity: 0.7,
            }}>{pUnit}</div>
          </div>
        </div>

        {/* 2026-05-13 v5 (Wolf-Designspec): Untere Team-Progress-Row entfernt —
            Unentschiedene sitzen jetzt in der MITTLEREN Saeule zwischen MEHR
            und WENIGER (im Pillen-Stack oben). Damit ist die untere Region frei
            fuer eventuelle weitere Layer. */}

        {/* 2026-05-13 (Wolf 'Timer oben rechts statt unten rechts'): top 32. */}
        {!isReveal && hl.timerEndsAt != null && (
          <div style={{
            position: 'absolute', top: 32, right: 48, zIndex: 8,
          }}>
            <BeamerTimer endsAt={hl.timerEndsAt} durationSec={s.comebackHLTimerSec ?? 10} accent="#EC4899" />
          </div>
        )}
      </div>
    );
  }

  // ── (alter separater Reveal-Block entfernt — jetzt unified mit question) ─

  // B1 BAM-Entry: nur beim initialen Mount + beim Step 0 spielen. Bei spaeteren
  // Steps (1, 2) soll die Folie ruhig bleiben, sonst reissen wir den User raus.
  const bamActive = step === 0;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      padding: 'clamp(20px, 2.6cqh, 40px) clamp(32px, 4cqw, 64px)',
      gap: 'clamp(12px, 1.8cqh, 22px)',
      minHeight: 0,
      animation: bamActive ? 'comebackShake 0.65s ease 0.1s both' : undefined,
    }}>
      <Fireflies color={`${teamColor}55`} />

      {/* B1 Screen-Flash: weisser Puls ueber dem ganzen Screen (0.6s). */}
      {bamActive && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(255,247,220,0.95) 0%, rgba(236,72,153,0.55) 45%, transparent 80%)',
          animation: 'comebackFlash 0.6s ease-out both',
          pointerEvents: 'none', zIndex: 20,
        }} />
      )}

      {/* B1 Lightning-Bolts: 6 gelbe Streifen fallen schraeg durchs Bild. */}
      {bamActive && [
        { left: '8%',  rot: -12, size: 64, delay: 0.05 },
        { left: '22%', rot: 8,   size: 44, delay: 0.22 },
        { left: '38%', rot: -6,  size: 52, delay: 0.14 },
        { left: '58%', rot: 10,  size: 48, delay: 0.30 },
        { left: '74%', rot: -14, size: 60, delay: 0.18 },
        { left: '88%', rot: 4,   size: 40, delay: 0.38 },
      ].map((b, i) => (
        <div key={i} aria-hidden style={{
          position: 'absolute', left: b.left, top: 0,
          fontSize: b.size, lineHeight: 1,
          color: '#FDE047',
          filter: `drop-shadow(0 0 14px rgba(253,224,71,0.9)) drop-shadow(0 0 28px rgba(236,72,153,0.6))`,
          ['--bolt-rot' as string]: `${b.rot}deg`,
          animation: `comebackBoltFall 1.1s var(--qq-ease-smooth-out) ${b.delay}s both`,
          pointerEvents: 'none', zIndex: 6,
        }}><QQEmojiIcon emoji="⚡"/></div>
      ))}

      {/* 2026-05-04 v4 (Wolf-Bug 'Comeback-Text symmetrisch'): Vorher nur 1 Blitz
          links, jetzt beidseitig — Title-Block wirkt mittig ausbalanciert. Inline-
          Flex statt Text-Concatenation damit Blitze als feste Grafik-Anker
          zentriert mit dem Wort sitzen, nicht als variable Buchstaben. */}
      <div style={{
        // 2026-05-07 (Wolf 'comeback ansicht ist zu klein, viel platz aussen
        // rum'): post-bam Title von clamp(28-50) auf clamp(56-104) bumpen —
        // aus 8m Beamer-Distanz gut lesbar, statt mickrig in der Mitte.
        fontSize: bamActive ? 'clamp(68px, 9cqw, 128px)' : 'clamp(56px, 6.5cqw, 104px)',
        fontWeight: 900,
        color: '#EC4899', textAlign: 'center',
        textShadow: '0 0 50px rgba(234,179,8,0.55)',
        letterSpacing: bamActive ? '0.04em' : 'normal',
        animation: bamActive
          ? 'comebackSlam 1s var(--qq-ease-bounce) both'
          : 'roundBam 0.6s var(--qq-ease-out-cubic) both',
        transition: 'font-size 0.5s var(--qq-ease-bounce)',
        position: 'relative', zIndex: 7,
        display: 'inline-flex', alignItems: 'center', gap: '0.4em',
        alignSelf: 'center',
      }}>
        <QQEmojiIcon emoji="⚡"/>
        <span>{lang === 'en' ? 'COMEBACK!' : 'COMEBACK!'}</span>
        <QQEmojiIcon emoji="⚡"/>
      </div>
      {/* B14 (2026-04-29): Sub-Header 'Die Letzten werden die Ersten' komplett
          entfernt — User-Wunsch: 'doppelt im Intro, beides Mal raus'. */}

      {/* Step 0: COMEBACK + 'So funktioniert's' direkt darunter.
          2026-05-06 v2 (Wolf 'so funktionierts unter COMEBACK schreiben,
          dann nur noch Teams+Leader-Seite — separate H/L-Erklaer-Seite weg'):
          H/L-Mechanik-Card unter den Lightning-Title gezogen, alte 'Letzter
          Platz bekommt Boost'-Card entfernt. Step 2 (separate Erklaerseite)
          entfaellt. */}
      {step === 0 && hl && (
        <div key="intro0-hl" style={{
          width: '100%', maxWidth: 1100,
          animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.4s both',
          position: 'relative', zIndex: 5,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'clamp(10px, 1.4cqh, 18px)',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '6px 18px', borderRadius: 999,
            background: 'rgba(236,72,153,0.18)', border: '2px solid rgba(236,72,153,0.5)',
            fontSize: 'clamp(13px, 1.4cqw, 18px)', fontWeight: 900,
            color: '#fde68a', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            <QQEmojiIcon emoji="📖"/> {lang === 'en' ? 'How it works' : 'So funktioniert’s'}
          </div>
          <div style={{
            padding: 'clamp(20px, 2.6cqh, 32px) clamp(28px, 3.2cqw, 44px)', borderRadius: 20,
            // 2026-05-07 (Wolf 'Comeback-Step-0 translucent in ESC'): Pink-
            // Gradient mit ~68 % Opacity damit das ESC-Heart-BG durchscheint.
            // Normaler Mode behaelt den warmen Gold-Glass-Look.
            background: s.theme?.eurovisionMode
              ? 'linear-gradient(135deg, rgba(45,22,68,0.72), rgba(31,15,61,0.62))'
              : 'linear-gradient(135deg, rgba(236,72,153,0.10), rgba(236,72,153,0.03))',
            border: s.theme?.eurovisionMode
              ? '2px solid rgba(255,45,123,0.55)'
              : '2px solid rgba(236,72,153,0.4)',
            boxShadow: s.theme?.eurovisionMode
              ? '0 0 32px rgba(255,45,123,0.22), 0 6px 18px rgba(0,0,0,0.4)'
              : '0 0 32px rgba(236,72,153,0.18), 0 6px 18px rgba(0,0,0,0.4)',
            textAlign: 'center',
            // 2026-05-07 (Layout-Audit): 900 → 1100, sonst sitzt die Mechanik-Card
            // schmaler als der COMEBACK-Title darüber → wirkt zentriert-zu-eng.
            maxWidth: 1100,
            display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 1.4cqh, 16px)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(20px, 2.4cqw, 36px)',
              fontSize: 'clamp(28px, 3.6cqw, 52px)', fontWeight: 900,
            }}>
              <span style={{ color: '#22C55E', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span>↑</span><span>{lang === 'en' ? 'HIGHER' : 'MEHR'}</span>
              </span>
              <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.6em' }}>
                {lang === 'en' ? 'or' : 'oder'}
              </span>
              <span style={{ color: '#EF4444', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span>↓</span><span>{lang === 'en' ? 'LOWER' : 'WENIGER'}</span>
              </span>
            </div>
            <div style={{
              fontSize: 'clamp(18px, 2.1cqw, 28px)', fontWeight: 800,
              color: '#fef3c7', lineHeight: 1.5,
            }}>
              {lang === 'en'
                ? 'Tip: Does the unknown number lie above or below the shown one?'
                : 'Tippt: Liegt die unbekannte Zahl über oder unter der gezeigten?'}
            </div>
            <div style={{
              fontSize: 'clamp(15px, 1.6cqw, 22px)', fontWeight: 700,
              color: '#cbd5e1', opacity: 0.85, lineHeight: 1.5,
            }}>
              {lang === 'en'
                ? 'Up to 3 rounds — each correct answer steals 1 cell from the leader.'
                : 'Bis zu 3 Runden — jede richtige Antwort klaut 1 Feld vom Führenden.'}
            </div>
          </div>
        </div>
      )}
      {/* Legacy-Comeback (kein H/L) faellt zurueck auf alte Boost-Card */}
      {step === 0 && !hl && (
        <div key="intro0-legacy" style={{
          maxWidth: 1100, textAlign: 'center',
          padding: '36px 48px', borderRadius: 24,
          background: 'rgba(236,72,153,0.08)',
          border: '2px solid rgba(236,72,153,0.35)',
          boxShadow: '0 0 60px rgba(236,72,153,0.15), 0 8px 32px rgba(0,0,0,0.4)',
          animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.4s both',
          position: 'relative', zIndex: 5,
        }}>
          <div style={{ fontSize: 'clamp(22px, 2.6cqw, 34px)', lineHeight: 1.45, color: '#fde68a', fontWeight: 900, marginBottom: 18 }}>
            {lang === 'en'
              ? 'Last place gets a Comeback-Boost.'
              : 'Letzter Platz bekommt einen Comeback-Boost.'}
          </div>
          <div style={{ fontSize: 'clamp(18px, 2cqw, 26px)', color: '#fef3c7', opacity: 0.85, lineHeight: 1.5 }}>
            {lang === 'en'
              ? 'Steal cells from the leader.'
              : 'Klauen beim Führenden.'}
          </div>
        </div>
      )}

      {/* Step 1+: Team hero — bei H/L mit Tied-Last mehrere Teams zeigen,
          sonst Fallback auf Einzel-Team (Legacy-Comeback). */}
      {showTeam && (hl ? hlTeams.length > 0 : !!team) && (
        <div key="team" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
          // 2026-05-08 (Wolf-Audit #4): vorher contentReveal (nur Y-Fade) —
          // wirkte statisch in Comeback (Game-Climax). Jetzt qqStepSlideIn
          // (Slide-from-Left) → Step-Wechsel wird sequentiell.
          animation: 'qqStepSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
          position: 'relative', zIndex: 5,
        }}>
          {hl && hlTeams.length > 1 ? (
            <>
              <div style={{ display: 'flex', gap: 'clamp(24px, 3cqw, 44px)', flexWrap: 'wrap', justifyContent: 'center' }}>
                {hlTeams.map(tm => (
                  <div key={tm.id} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                  }}>
                    {/* 2026-05-07 (Wolf): Multi-Team Avatare clamp(120-180) -> clamp(170-260). */}
                    <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(170px, 16cqw, 260px)'} style={{
                      boxShadow: `0 0 44px ${tm.color}88, 0 0 100px ${tm.color}33`,
                    }} />
                    <TeamNameLabel
                      name={tm.name}
                      maxLines={2}
                      shrinkAfter={18}
                      color={tm.color}
                      fontWeight={900}
                      fontSize="clamp(30px, 3.2cqw, 48px)"
                      style={{ textShadow: `0 0 26px ${tm.color}55`, maxWidth: 320 }}
                    />
                  </div>
                ))}
              </div>
              {/* Wolf 2026-05-05: 'X teams tied for last place'-Pille raus —
                  redundant zum COMEBACK-Title + den Avataren selbst. */}
            </>
          ) : team && (
            <>
              {/* 2026-05-07 (Wolf 'ansicht zu klein, viel platz aussenrum'):
                  Single-Team Avatar clamp(110-170) -> clamp(180-280). Aus
                  Zuschauer-Distanz dominant lesbar statt klein in der Mitte. */}
              <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={'clamp(180px, 17cqw, 280px)'} style={{
                boxShadow: `0 0 56px ${teamColor}88, 0 0 130px ${teamColor}33`,
                animation: 'activeTeamGlow 2s ease-in-out infinite',
                ['--team-color' as any]: `${teamColor}55`,
              }} />
              <TeamNameLabel
                name={team.name}
                maxLines={2}
                shrinkAfter={18}
                color={teamColor}
                fontWeight={900}
                fontSize="clamp(40px, 4.8cqw, 76px)"
                style={{ textShadow: `0 0 36px ${teamColor}55`, maxWidth: '80cqw', textAlign: 'center' }}
              />
              {/* Wolf 2026-05-05: 'liegt auf dem letzten Platz — schlag zurück!'
                  Pille raus — redundant zum COMEBACK-Title + Lightning-Bolts. */}
            </>
          )}
        </div>
      )}

      {/* Step 2: Aktion (H/L-Regeln + Leader-Anzeige) */}
      {showAction && (hl ? hlTeams.length > 0 : !!team) && (
        <div style={{
          width: '100%', maxWidth: 1100,
          // 2026-05-08 (Wolf-Audit #4): qqStepSlideIn statt contentReveal —
          // Action-Card slidet von links rein (Drama-Climax-Moment).
          animation: 'qqStepSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both',
          position: 'relative', zIndex: 5,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'clamp(8px, 1.2cqh, 14px)',
        }}>
          {/* Wolf 2026-05-05: Round-Counter komplett raus — Wolf moderiert,
              weiß welche Runde. Auch der "DURCHGANG"-Header + Dots war zu
              viel auf der ohnehin vollen Intro-Seite. */}
          {/* Action-Card mit inline Leader (Wolf 2026-05-05: war vorher
              separater "AKTUELLER 1. PLATZ"-Header + Pille darunter — jetzt
              direkt in einer Zeile, spart 2 Items auf der Seite). */}
          <div style={{
            // 2026-05-07 (Wolf 'comeback ansicht zu klein'): Action-Card-Padding
            // + Font + Pille-Groesse signifikant gebumpt. Pille mit kleinem
            // Avatar (28px) und Mini-Label (12-16px) war aus Beamer-Distanz
            // unleserlich.
            padding: 'clamp(18px, 2.2cqh, 28px) clamp(28px, 3.2cqw, 48px)', borderRadius: 22,
            textAlign: 'center',
            background: cardBg,
            border: hl ? '2.5px solid rgba(236,72,153,0.55)' : `2.5px solid #EF444455`,
            boxShadow: hl
              ? '0 0 44px rgba(236,72,153,0.25), 0 8px 22px rgba(0,0,0,0.4)'
              : `0 0 44px rgba(239,68,68,0.22), 0 8px 22px rgba(0,0,0,0.4)`,
            fontSize: 'clamp(22px, 2.6cqw, 36px)', fontWeight: 900,
            color: hl ? '#fde68a' : '#fecaca',
            maxWidth: 1000,
            lineHeight: 1.4,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          }}>
            {/* 2026-05-06: H/L-Mechanik-Text raus, nur Klau-Ziel anzeigen.
                Erklaerung der Mechanik kommt in Step 2 als eigene Card. */}
            {!hl && (
              <div>
                <QQEmojiIcon emoji="⚡"/> {lang === 'en' ? actionTextEn : actionTextDe}
              </div>
            )}
            {leaderTeams.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: 'clamp(18px, 1.9cqw, 26px)', fontWeight: 900,
                  color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  {leaderTeams.length === 1
                    ? (lang === 'en' ? 'Leader:' : 'Klauen bei:')
                    : (lang === 'en' ? 'Leaders:' : 'Klauen bei:')}
                </span>
                {leaderTeams.map(lt => (
                  <div key={lt.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 12,
                    padding: '10px 20px', borderRadius: 999,
                    background: `${lt.color}18`, border: `2px solid ${lt.color}55`,
                  }}>
                    <QQTeamAvatar avatarId={lt.avatarId} teamEmoji={lt.emoji} size={48} />
                    <TeamNameLabel
                      name={lt.name}
                      maxLines={1}
                      shrinkAfter={14}
                      color={lt.color}
                      fontWeight={900}
                      fontSize="clamp(20px, 2.2cqw, 30px)"
                      style={{ maxWidth: 220 }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2026-05-06 v2: Separate Step-2-Erklaerseite entfernt — die H/L-
          Erklaerung steht jetzt zusammen mit dem COMEBACK-Title auf Step 0. */}

      {/* 2026-05-06 v4 (Wolf 'bei Comeback ueberrascht ist gut'): Wolf
          mit Oh!-Pose unten links waehrend BAM-Step 0. Verstaerkt den
          Drama-Moment 'Wer kommt zurueck?'. Step 1 (Team-Hero) ist eh
          fokussiert auf das Comeback-Team — Wolf koennte da ablenken.
          2026-05-06 v6 (Wolf 'wenn er den Mund offen hat, soll er was
          sagen — auch auf Comeback'): Sprechblase mit Surprise-Slogans. */}
      {step === 0 && (
        <div style={{
          position: 'absolute',
          left: 'clamp(20px, 2.5cqw, 48px)',
          bottom: 'clamp(20px, 2.5cqh, 40px)',
          zIndex: 8,
          pointerEvents: 'none',
          animation: 'panelSlideIn 0.6s var(--qq-ease-bounce) 0.85s both',
        }}>
          <WolfUeberraschtWithBubble lang={lang === 'de' ? 'de' : 'en'} eurovisionMode={s.theme?.eurovisionMode} />
        </div>
      )}
    </div>
  );
}

// Ueberrascht-Wolf mit Sprechblase fuer ComebackView Step 0. Bubble-Tail
// links unten (Wolf links unten), Surprise-Slogans. Mund bleibt im
// ueberrascht-Mode konstant offen (kein Flap), deshalb keine
// speaking-Gate — die Bubble ist rein 'Beifall-Reaktion' auf den
