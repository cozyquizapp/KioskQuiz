/**
 * CozyQuizTeamsRevealView — Einmalige Team-Vorstellung nach Rules, vor Phase 1.
 *
 * Slot-Machine-Effekt: Teams werden epic gereveald (drei Phasen wie ein TV-
 * Showmoment). Pro Team Avatar-Drop + Name-Reveal + Color-Glow.
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-13 (Refactor Phase 5).
 * NICHT extern importiert (nur intern via Phase-Router).
 */
import { useState, useEffect } from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { useLangFlip } from '../cozyQuizShared';
import { Fireflies, EurovisionHearts } from './CozyQuizAmbient';
import { QQTeamAvatar, isCountryFlagGlyph, getCountryFlagUrl } from './QQTeamAvatar';
import { QQEmojiIcon } from './QQIcon';
import { TeamNameLabel } from './TeamNameLabel';
import { playAvatarCascadeNote, playGoodLuckFanfare, playWoodKnock } from '../utils/sounds';
import { isThemed } from '../qqTheme';
import { isCozy3dSlug, cozy3dSrc, cozy3dLabel } from '../cozy3dAvatars';
import { wakeAllAvatars } from '../avatarAwake';

export function TeamsRevealView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const themed = isThemed();
  const fontFam = themed
    ? 'var(--qq-font)'
    : s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif` : "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif";
  const teams = s.teams.filter(t => t.connected).length > 0
    ? s.teams.filter(t => t.connected)
    : s.teams;
  // Animation start anchor — fallback auf "jetzt" falls Backend-Feld fehlt
  const anchor = s.teamsRevealStartedAt ?? Date.now();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, []);
  void tick;
  // Augen-auf bei der Teams-Vorstellung (Wolf-Idee): alle cozy3d-Tiere mit
  // open-Asset oeffnen die Augen fuer die Dauer des Reveals. No-op ohne Asset.
  useEffect(() => { wakeAllAvatars(9000); }, []);
  const elapsed = Date.now() - anchor;

  // 2026-05-09 v3: WELCOME-Hero + Subtitle + Teams-Parallel.
  // 2026-05-11 (Wolf-Bug 'kurzer Herzlich-Willkommen-Flash vor Heute spielen
  // weg'): WELCOME-Hero deaktiviert — Welcome lebt im Pre-Rules-Overlay.
  // 2026-05-19 (Wolf 'lange pause am anfang, animation wirkt langweilig'):
  // Slam von 1400→850ms, Settle 300→150ms, Stagger 280→180ms. Pro Team jetzt
  // ~1.9s statt ~2.6s. Bei 8 Teams: 3.2s statt 4.6s bis Good-Luck — mehr
  // Energie, weniger Dead-Time vor dem ersten Reveal.
  const titleDelay = 0;
  const titleDur = 800;
  const WELCOME_DUR = 0;
  const WELCOME_FADE = 0;
  const TITLE_HOLD = 0;
  const SLAM_DUR = 850;
  const SETTLE = 150;
  const FLIP_DUR = 900;
  const TEAM_STAGGER = 180;
  const PER_TEAM_TOTAL = SLAM_DUR + SETTLE + FLIP_DUR; // 1900 für ein Team
  const teamStart = (i: number) => TITLE_HOLD + i * TEAM_STAGGER;
  const flipStartFor = (i: number) => teamStart(i) + SLAM_DUR + SETTLE;
  const holdEndFor = (i: number) => flipStartFor(i) + FLIP_DUR;
  const goodLuckDelay = TITLE_HOLD + (teams.length - 1) * TEAM_STAGGER + PER_TEAM_TOTAL + 400;
  const showGoodLuck = elapsed >= goodLuckDelay;
  const showWelcome = elapsed < WELCOME_DUR + WELCOME_FADE;
  const showSubtitle = elapsed >= WELCOME_DUR;
  // revealedCount obsolet — pro Team direkt berechnet. Compat-Stub falls abgegriffen.
  const revealedCount = Math.max(0, Math.min(teams.length,
    elapsed < TITLE_HOLD ? 0 : Math.floor((elapsed - TITLE_HOLD) / TEAM_STAGGER) + 1));

  // 2026-04-30 v3 round 6 (User-Bug 'sound trifft avatar-erscheinen nicht'):
  // Statt per 250ms-Tick auf revealedCount zu pollen (= Sound bis zu 250ms
  // verspaetet), pre-scheduln wir alle Sounds via setTimeout am EXAKTEN
  // ms-Anchor. So feuert der Cascade-Ton synchron zum Slam-Down.
  // Nur 1× pro mount: wenn anchor neu gesetzt wird, Timer-Cleanup.
  // v3 round 9 (User-Bug 'konstanter ton stoert hinter der cascade'):
  // playTeamReveal (Slam-Sound, gleiche Pitch pro Team) entfernt — nur noch
  // die aufsteigende Pentatonik-Cascade. Sauberer, kein Doppel-Layer mehr.
  useEffect(() => {
    if (s.sfxMuted) return;
    const cascadeTotal = teams.length + 1;
    const timers: number[] = [];
    for (let i = 0; i < teams.length; i++) {
      // 2026-05-19 (Wolf 'sounds wirken langweilig'): Slam-Thud beim Card-
      // Impact (55% des Slam-Keyframes = ~467ms nach Slam-Start). WoodKnock
      // ist dezent + brand-fitting; layered nicht mit der CascadeNote, weil
      // die erst beim Flip-Reveal (~1.0s spaeter) feuert.
      const slamImpactAt = anchor + teamStart(i) + Math.round(SLAM_DUR * 0.55);
      const slamDelay = Math.max(0, slamImpactAt - Date.now());
      timers.push(window.setTimeout(() => {
        try { playWoodKnock(); } catch {}
      }, slamDelay));
      // 2026-05-09 (Game-Show-Reveal): Cascade-Note feuert beim FLIP-Start
      // (= Avatar wird sichtbar). Sync zum visuellen Reveal-Moment.
      const fireAt = anchor + flipStartFor(i);
      const delay = Math.max(0, fireAt - Date.now());
      timers.push(window.setTimeout(() => {
        try { playAvatarCascadeNote(i, cascadeTotal); } catch {}
      }, delay));
    }
    // VIEL GLUECK: eigener Sound-Slot. playGoodLuckFanfare hat schon einen
    // vollständigen 8-Layer-C-Dur-Synth-Fallback (Akkord + Bass + Bells) wenn
    // kein MP3 hochgeladen ist.
    // 2026-05-23 (Wolf 'überprüfe ob nochmal akkord-crash'): parallel laufendes
    // playFanfare() entfernt — feuerte simultan mit playGoodLuckFanfare und
    // konnte je nach MP3/Synth-Mix in unterschiedlichen Tonarten clashen
    // (selbes Pattern wie Schätzchen-Reveal RevealHighlight+ClimaxFinish-Bug).
    const goodLuckFireAt = anchor + goodLuckDelay;
    const goodLuckMs = Math.max(0, goodLuckFireAt - Date.now());
    timers.push(window.setTimeout(() => {
      try { playGoodLuckFanfare(); } catch {}
    }, goodLuckMs));
    return () => { timers.forEach(t => window.clearTimeout(t)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, teams.length, s.sfxMuted]);

  // 2026-05-07 v18 (Wolf 'die seite wo die teams vorgestellt werden, darf
  // auch mehr nach eurovision aussehen, also bg von eurovision und vlt text
  // in eurovision farben'): ESC-Adaption — BG-Image (5.png Vienna-Stripe-Pink
  // wie Lobby) statt Slate, Title + Good-Luck in Pink, EurovisionHearts statt
  // Fireflies, optionaler ESC-Logo-Anker oben (kleiner als Lobby-Stinger,
  // damit Big-Title dominiert). Standard-CozyQuiz-Mode unangetastet.
  const isEsc = !!s.theme?.eurovisionMode;
  const escBgUrl = isEsc ? s.theme?.lobbyBackgroundUrl : null;
  const escLogoUrl = isEsc ? s.theme?.logoUrl : null;
  const titleColor = isEsc ? '#FF2D7B' : themed ? 'var(--qq-title)' : '#f8fafc';
  // 2026-05-13 Kontrast-Audit ESC: Pink-Glow weg, Dark-Halo first auf BG-Image.
  const titleShadow = isEsc
    ? '0 4px 22px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.7)'
    : '0 4px 20px rgba(var(--qq-accent-rgb),0.25)';
  // 2026-06-24 (Lesbarkeit): „Viel Glück" auf Seiten-BG → var(--qq-text) bei Skin
  // (Akzent waere auf Neo-Brutal blau-auf-lila). Cozy = Pink-Akzent.
  const goodLuckColor = isEsc ? '#FF2D7B' : themed ? 'var(--qq-title)' : 'var(--qq-accent)';
  const goodLuckShadow = isEsc
    ? '0 4px 22px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.7)'
    : '0 4px 24px rgba(var(--qq-accent-rgb),0.5)';
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      // 2026-05-17 (Wolf 'heute spielen slide wirkt irgendwie off zum rest der
      // app'): BG an restliche App angeglichen — vorher Slate-Blau-Gradient
      // (#1e293b/#0f172a/#020617), das wirkte fremd zwischen den anderen
      // dunklen Pink-Tint-Slides. Jetzt #0A0814 Base + Pink-Radial-Glow analog
      // PausedView/ComebackView/QuestionView. ESC-Variante behält Lila-Glow.
      // 2026-06-23 (Skin): bei aktivem Skin flacher Skin-BG (var(--qq-bg)) statt
      // dem dunklen Pink-Glow-Untergrund — sonst bleibt diese Slide dunkel
      // waehrend der Rest hell lackiert ist.
      backgroundColor: themed ? undefined : '#0A0814',
      background: themed ? 'var(--qq-bg)' : undefined,
      backgroundImage: themed ? undefined : isEsc
        ? 'radial-gradient(ellipse at 50% 30%, rgba(255,45,123,0.18), transparent 55%),' +
          'radial-gradient(ellipse at 85% 110%, rgba(167,139,250,0.10), transparent 55%),' +
          'radial-gradient(ellipse at 15% 80%, rgba(244,114,182,0.06), transparent 50%)'
        : 'radial-gradient(ellipse at 50% 30%, rgba(var(--qq-accent-rgb),0.16), transparent 55%),' +
          'radial-gradient(ellipse at 85% 110%, rgba(99,102,241,0.08), transparent 55%),' +
          'radial-gradient(ellipse at 15% 80%, rgba(244,114,182,0.05), transparent 50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: fontFam, overflow: 'hidden',
      minHeight: 0,
      padding: 'var(--qq-safe-margin)',
      boxSizing: 'border-box',
    }}>
      {escBgUrl && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${escBgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.55,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}
      {isEsc ? <EurovisionHearts /> : <Fireflies />}
      <style>{`
        @keyframes qqTrTitle {
          0%   { opacity: 0; transform: translateY(-30px) scale(0.8); letter-spacing: 0.5em; }
          100% { opacity: 1; transform: translateY(0)     scale(1);   letter-spacing: 0.12em; }
        }
        /* 2026-05-08 (Wolf-Wunsch 'heute spielen wirkt eher öde'): Letters
           cascaden einzeln rein (1.2em → 0.1em letter-spacing pro Buchstabe),
           dann subtle Wave nach Settle. Underline-Reveal expandiert von center
           als Pink-Gradient. */
        @keyframes qqTrTitleLetter {
          0%   { opacity: 0; transform: translateY(-32px) scale(0.6); filter: blur(8px); }
          70%  { opacity: 1; transform: translateY(4px)   scale(1.06); filter: blur(0); }
          100% { opacity: 1; transform: translateY(0)     scale(1);   filter: blur(0); }
        }
        @keyframes qqTrTitleWave {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        @keyframes qqTrUnderline {
          0%   { opacity: 0; transform: scaleX(0); }
          60%  { opacity: 1; transform: scaleX(1.05); }
          100% { opacity: 1; transform: scaleX(1); }
        }
        @keyframes qqTrUnderlineShimmer {
          0%   { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes qqTrSlam {
          0%   { opacity: 0; transform: translateY(-80cqh) scale(2) rotate(-18deg); filter: blur(6px); }
          55%  { opacity: 1; transform: translateY(8%)    scale(1.15) rotate(3deg); filter: blur(0); }
          75%  { transform: translateY(-2%) scale(0.96) rotate(-1deg); }
          100% { transform: translateY(0)    scale(1) rotate(0deg); }
        }
        /* 2026-05-09 (Game-Show-Reveal Slot M): Slam für Cards (3:4 box)
           mit etwas heftiger overshoot (1.18 statt 1.15). Identisch zu Slot M. */
        @keyframes qqGsTeamSlam {
          0%   { opacity: 0; transform: translateY(-90cqh) scale(2)    rotate(-18deg); filter: blur(7px); }
          55%  { opacity: 1; transform: translateY(8%)    scale(1.18) rotate(3deg);   filter: blur(0); }
          75%  {            transform: translateY(-2%)    scale(0.96) rotate(-1deg); }
          100% { opacity: 1; transform: translateY(0)     scale(1)    rotate(0);     filter: blur(0); }
        }
        /* 2026-05-12 (Wolf '6. mal action cards nicht gleich gross'): scale-freie
           Variante fuer ActionCardReveal. Vorher animierte qqGsTeamSlam scale 2→
           1.18→0.96→1 ueber 1.4s — waehrend dieser Zeit war die isNew Card
           bis zu 18% groesser als die nebenan settled non-isNew Cards
           (phasePop schon bei scale 1 nach 0.6s). Wolf sah die Cards mid-
           Choreo als 'nicht gleich gross' — strukturell sind sie's, nur die
           Slam-Scale-Animation drift'te ihre VISUAL-Width temporaer auseinander.
           Diese Variante macht Drop + Rotate + Blur ohne Scale → Layout-Box-
           Width bleibt durchgehend konstant. */
        @keyframes qqActionCardSlam {
          0%   { opacity: 0; transform: translateY(-90cqh) rotate(-18deg); filter: blur(7px); }
          55%  { opacity: 1; transform: translateY(8%)    rotate(3deg);   filter: blur(0); }
          75%  {            transform: translateY(-2%)    rotate(-1deg); }
          100% { opacity: 1; transform: translateY(0)     rotate(0);     filter: blur(0); }
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
        @keyframes qqTrEscLogo {
          0%   { opacity: 0; transform: translateY(-12px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Backdrop spotlight — Pink in ESC, Gold sonst */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isEsc
          ? 'radial-gradient(circle at 50% 40%, rgba(255,45,123,0.16) 0%, transparent 55%)'
          : 'radial-gradient(circle at 50% 40%, rgba(var(--qq-accent-rgb),0.12) 0%, transparent 55%)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* ESC-Logo-Anker oben — nur Logo (ohne COZYQUIZ-Wordmark) damit der
          Big-Title 'Heute spielen…' dominiert. Brueckenbau zu Lobby/Welcome. */}
      {escLogoUrl && (
        <div style={{
          position: 'relative', zIndex: 2,
          marginBottom: 'clamp(14px, 1.6cqw, 24px)',
          animation: 'qqTrEscLogo 700ms cubic-bezier(0.2, 0.8, 0.2, 1) 100ms both',
        }}>
          <img
            src={escLogoUrl}
            alt="Eurovision Song Contest"
            draggable={false}
            style={{
              height: 'clamp(48px, 6cqh, 92px)',
              width: 'auto',
              filter: 'drop-shadow(0 0 18px rgba(var(--qq-accent-rgb),0.55)) drop-shadow(0 4px 10px rgba(0,0,0,0.5))',
              animation: 'qqStingerHover 4.2s ease-in-out 1.2s infinite',
            }}
          />
        </div>
      )}

      {/* 2026-05-11 (Wolf-Bug): WELCOME-Hero entfernt — Welcome-Moment lebt
          im Pre-Rules-QuizIntroOverlay. TeamsRevealView startet jetzt direkt
          mit dem „Heute spielen…"-Subtitle + Team-Cascade. */}

      {/* Subtitle Title — startet sofort beim Mount (kein Welcome-Wait mehr).
          Letters cascaden einzeln rein, dann sanftes Wave-Loop. Pink-Underline
          expandiert drunter mit Shimmer-Loop. */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 'clamp(8px, 1cqh, 14px)',
        marginBottom: 'clamp(24px, 3cqw, 48px)',
        opacity: showSubtitle ? 1 : 0,
        transform: showSubtitle ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}>
      <div style={{
        position: 'relative', zIndex: 2,
        fontSize: 'clamp(36px, 5.2cqw, 82px)', fontWeight: 900, color: titleColor,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        textShadow: titleShadow,
        display: 'inline-flex', flexWrap: 'nowrap',
      }}>
        {(() => {
          const titleText = lang === 'en' ? '🎬 Tonight\u2019s teams\u2026' : '🎬 Heute spielen\u2026';
          const letters = Array.from(titleText);
          const letterStagger = 0.05;
          const baseSec = titleDelay / 1000;
          return letters.map((ch, i) => (
            <span key={i} style={{
              display: 'inline-block',
              opacity: 0,
              whiteSpace: 'pre',
              animation:
                `qqTrTitleLetter 0.7s cubic-bezier(0.16, 1.2, 0.3, 1) ${baseSec + i * letterStagger}s both, ` +
                `qqTrTitleWave 2.6s ease-in-out ${baseSec + 1.2 + i * 0.06}s infinite`,
            }}>{ch}</span>
          ));
        })()}
      </div>
      {/* Pink-Underline — expandiert von center, dann shimmer-loop */}
      {(() => {
        const titleText = lang === 'en' ? '🎬 Tonights teams' : '🎬 Heute spielen';
        const letterCount = Array.from(titleText).length;
        const baseSec = titleDelay / 1000;
        const underlineDelay = baseSec + letterCount * 0.05 + 0.1;
        return (
          <div style={{
            width: 'clamp(220px, 35cqw, 480px)', height: 3, borderRadius: 'var(--qq-pill-radius)',
            background: isEsc
              ? 'linear-gradient(90deg, transparent 0%, rgba(255,45,123,0.7) 25%, #FF2D7B 50%, rgba(255,45,123,0.7) 75%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(var(--qq-accent-rgb),0.7) 25%, var(--qq-accent) 50%, rgba(var(--qq-accent-rgb),0.7) 75%, transparent 100%)',
            backgroundSize: '200% 100%',
            boxShadow: isEsc
              ? '0 0 14px rgba(255,45,123,0.55)'
              : '0 0 14px rgba(var(--qq-accent-rgb),0.55)',
            transformOrigin: 'center',
            opacity: 0,
            animation:
              `qqTrUnderline 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${underlineDelay}s both, ` +
              `qqTrUnderlineShimmer 3.5s linear ${underlineDelay + 0.8}s infinite`,
          }} />
        );
      })()}
      </div>

      {/* Teams grid — Game-Show-Card-Reveal (sequenziell). Pro Team:
          Card slammt face-down rein → settled → flippt zur Vorderseite →
          Spotlight-Hold für Mod-Anmoderation → nächstes Team. */}
      {(() => {
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
        // Card-Width — Avatar ist ~55% der Card-Width
        // 2026-05-12 (Wolf 'pubquatscher macht 2. Reihe fuers r'): multi-row
        // Card-Min von 140 → 165 px hochgezogen. Bei 12-char Namen wie
        // 'Pubquatscher' war 140px-Card zu eng → das letzte 'r' brach in die
        // 2. Zeile. 165 + leicht aggressiveres TeamNameLabel.shrinkAfter (s.u.)
        // verhindert das ohne dass andere Cards merklich groesser werden.
        const cardWidth = multiRow
          ? 'clamp(165px, 13cqw, 220px)'
          : many ? 'clamp(160px, 15cqw, 240px)' : 'clamp(190px, 18cqw, 280px)';
        const avatarSize = multiRow
          ? 'clamp(82px, 8cqw, 130px)'
          : many ? 'clamp(96px, 9.5cqw, 160px)' : 'clamp(118px, 12cqw, 196px)';
        // 2026-05-28 (Wolf 'avatar viel zu klein im kreis' Round 2): Edge/Chromium
        // rendert `calc(clamp(...) * 0.78)` teilweise auf 0 — nested clamp-in-calc
        // mit Multiplikation ist fragil. Daher Emoji-Size als eigene Clamp
        // (~78% des Avatar-Clamps) statt calc-Multiplikation.
        const emojiFontSize = multiRow
          ? 'clamp(64px, 6.2cqw, 101px)'
          : many ? 'clamp(75px, 7.4cqw, 125px)' : 'clamp(92px, 9.4cqw, 153px)';
        const nameFont = multiRow ? 'clamp(16px, 1.7cqw, 24px)' : 'clamp(18px, 1.9cqw, 28px)';
        let cursor = 0;
        return (
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: 'clamp(18px, 2.4cqw, 36px)',
            alignItems: 'center', maxWidth: '92cqw',
            position: 'relative', zIndex: 2,
          }}>
            {rowSizes.map((size, rIdx) => {
              const slice = teams.slice(cursor, cursor + size);
              const startI = cursor;
              cursor += size;
              return (
                <div key={rIdx} style={{
                  display: 'flex', gap: 'clamp(14px, 2cqw, 32px)',
                  justifyContent: 'center', flexWrap: 'nowrap',
                }}>
                  {slice.map((t, j) => {
                    const i = startI + j;
                    const startMs = teamStart(i);
                    const flipMs = flipStartFor(i);
                    const holdEndMs = holdEndFor(i);
                    const isVisible = elapsed >= startMs;
                    const isFlipped = elapsed >= flipMs;
                    const isInSpotlight = elapsed >= flipMs && elapsed < holdEndMs;
                    return (
                      <div key={t.id} style={{
                        width: cardWidth,
                        aspectRatio: '3 / 4',
                        perspective: '1200px',
                        opacity: isVisible ? 1 : 0,
                        animation: isVisible
                          ? `qqGsTeamSlam ${SLAM_DUR}ms cubic-bezier(0.34, 1.46, 0.64, 1) both`
                          : 'none',
                        filter: isInSpotlight ? `drop-shadow(0 0 38px ${t.color}cc)` : 'none',
                        transition: 'filter 0.6s ease',
                      }}>
                        <div style={{
                          position: 'relative', width: '100%', height: '100%',
                          transformStyle: 'preserve-3d',
                          transition: `transform ${FLIP_DUR}ms cubic-bezier(0.34, 1.46, 0.64, 1)`,
                          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        }}>
                          {/* Rückseite — generischer CozyQuiz-Card-Back */}
                          <div style={{
                            position: 'absolute', inset: 0,
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            borderRadius: themed ? 'var(--qq-card-radius)' : 'clamp(14px, 1.4cqw, 22px)',
                            background: themed
                              ? 'var(--qq-card-bg)'
                              : 'radial-gradient(ellipse at 50% 30%, rgba(var(--qq-accent-rgb),0.32) 0%, transparent 60%),' +
                              'radial-gradient(ellipse at 50% 80%, rgba(162,18,71,0.28) 0%, transparent 55%),' +
                              'linear-gradient(135deg, #1F1A2E 0%, #14101F 60%, #0F0817 100%)',
                            border: themed ? 'var(--qq-card-border)' : '2px solid rgba(var(--qq-accent-rgb),0.55)',
                            boxShadow: themed ? 'var(--qq-card-shadow)' : '0 8px 28px rgba(0,0,0,0.55), inset 0 0 36px rgba(var(--qq-accent-rgb),0.18)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 12, padding: 'clamp(14px, 1.6cqw, 22px)',
                            overflow: 'hidden',
                          }}>
                            <div aria-hidden style={{
                              position: 'absolute', inset: 0,
                              backgroundImage:
                                'repeating-linear-gradient(45deg, rgba(var(--qq-accent-rgb),0.06) 0 2px, transparent 2px 22px),' +
                                'repeating-linear-gradient(-45deg, rgba(var(--qq-accent-rgb),0.04) 0 2px, transparent 2px 22px)',
                              pointerEvents: 'none',
                            }} />
                            {/* 2026-05-09 (Wolf-Wunsch): Pink-Wolf-PNG (transparent)
                                ersetzt idle.svg auf der Card-Back. Platzierung
                                identisch zur Vorderseite (color-circle + 54%
                                Avatar-Inner-Size). */}
                            <div style={{
                              width: avatarSize, height: avatarSize, borderRadius: '50%',
                              background: 'rgba(var(--qq-accent-rgb),0.33)',
                              border: '2.5px solid var(--qq-accent)',
                              boxShadow: '0 0 28px rgba(var(--qq-accent-rgb),0.99)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                              overflow: 'hidden',
                              position: 'relative',
                            }}>
                              <img
                                src="/avatars/cozywolf/pink.png"
                                alt=""
                                draggable={false}
                                style={{
                                  width: '90%', height: '90%', objectFit: 'contain',
                                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55)) drop-shadow(0 0 1px rgba(0,0,0,0.5))',
                                }}
                              />
                            </div>
                            {/* CozyQuiz-Wordmark in Stinger Fit, Brand-Pink */}
                            <div style={{
                              fontFamily: "'Stinger Fit', 'Bricolage Grotesque', 'Inter', system-ui, sans-serif",
                              fontSize: multiRow ? 'clamp(20px, 2.2cqw, 32px)' : 'clamp(24px, 2.6cqw, 40px)',
                              fontWeight: 900,
                              color: themed ? 'var(--qq-card-text)' : '#FBCFE8',
                              letterSpacing: '0.02em',
                              textShadow: themed ? 'none' : '0 0 14px rgba(var(--qq-accent-rgb),0.7), 0 0 4px rgba(var(--qq-accent-rgb),0.4)',
                              lineHeight: 1,
                              position: 'relative',
                              textTransform: 'uppercase',
                            }}>COZYQUIZ</div>
                          </div>
                          {/* Vorderseite — Avatar im Color-Glow-Kreis + Name
                              als Text in Team-Color (matcht Slot M Showreel)
                              2026-05-13 (Wolf 'cards bei tonight teams crashen
                              bisschen das design, glassy durchsichtig, farbe
                              prominenter'): BG-Tint von 13%/6% auf 40%/20%
                              hochgezogen — Team-Color liest sich jetzt klar,
                              ohne den Reveal-Card-Charakter zu opfern. */}
                          <div style={{
                            position: 'absolute', inset: 0,
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            borderRadius: 'clamp(14px, 1.4cqw, 22px)',
                            background: `linear-gradient(180deg, ${t.color}66, ${t.color}33)`,
                            border: `2px solid ${t.color}`,
                            boxShadow: `0 14px 36px rgba(0,0,0,0.55), inset 0 0 44px ${t.color}33, 0 0 28px ${t.color}66`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 'clamp(10px, 1.2cqw, 18px)', padding: 'clamp(16px, 1.8cqw, 26px)',
                          }}>
                            {/* Avatar — 1:1 wie Slot M Showreel: Color-Tinted-
                                Circle mit großem Emoji DIREKT (nicht via
                                QQTeamAvatar).
                                2026-05-23 (Wolf): BG solid statt 20%-glassy —
                                matcht den Avatar-Kreis-BG aus QQTeamAvatar
                                (background: color) im Rest der App.
                                2026-05-28 (Wolf 'avatar viel zu klein im kreis'):
                                Mit dem solid-BG wirkte der Disc visuell schwerer
                                und der Avatar drin zu klein. Emoji 0.54→0.78 (näher
                                am Standard-QQTeamAvatar 0.6, plus Showreel-Bump);
                                PNG 86%→100% (Cozy-Cast-PNG hat eigene Border, darf
                                den Disc voll füllen — die solid Team-Color wird
                                durch die PNG-Border + Outer-Disc-Border ohnehin
                                sichtbar). */}
                            {/* 2026-05-28 (Wolf 'avatar viel zu klein im kreis'
                                Round 3): emoji-fontSize MUSS auf dem Disc-Div
                                selbst sitzen (1:1 wie Slot M Showreel), nicht
                                auf einem inline-block Wrapper-Span. Der bisherige
                                Pfad via CountryFlagOrEmoji renderte das Emoji in
                                einem `<span style="display:inline-block; fontSize:
                                clamp(...)">` — Edge/Chromium hat die clamp-fontSize
                                auf inline-block-Flex-Children teilweise auf den
                                geerbten Body-Default (16px) heruntergerechnet,
                                wodurch das Emoji winzig blieb.
                                Slot M setzt fontSize direkt auf den Flex-Parent
                                und rendert das Emoji als Text-Child — das
                                funktioniert robust. Country-Flag-Sonderpfad
                                (Twemoji-IMG fuer DE/GR/etc auf Windows) wurde
                                inline herausgezogen. */}
                            <div style={{
                              width: avatarSize, height: avatarSize,
                              borderRadius: '50%',
                              background: t.color,
                              border: `2.5px solid ${t.color}`,
                              boxShadow: `0 0 28px ${t.color}99`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                              // 2026-06-24: cozy3d-PNGs nicht am Kreisrand beschneiden
                              // (Ecken-Motive wie Fluegel) — Flags/Emoji bleiben geclippt.
                              overflow: isCozy3dSlug(t.emoji) ? 'visible' : 'hidden',
                              fontSize: emojiFontSize,
                              lineHeight: 1,
                              animation: isInSpotlight ? 'qqTrPulse 2.2s ease-in-out infinite' : 'none',
                            }}>
                              {t.emoji && isCountryFlagGlyph(t.emoji) ? (
                                <img
                                  src={getCountryFlagUrl(t.emoji)}
                                  alt={t.emoji}
                                  draggable={false}
                                  style={{
                                    width: '1.3em', height: '1em',
                                    objectFit: 'contain',
                                  }}
                                />
                              ) : isCozy3dSlug(t.emoji) ? (
                                // 2026-06-24 (Wolf-Bug 'heute spielen avatare nicht
                                // verdrahtet'): team.emoji haelt jetzt einen cozy3d-
                                // Slug. Vorher wurde der Slug als ROHTEXT in den Disc
                                // gerendert (man sah Wort-Fragmente wie 'ngl'/'od').
                                // Jetzt das PNG laden — Fill identisch zu ImageAvatar
                                // (COZY3D_DISC_FILL 90%) auf der soliden Team-Color-Disc.
                                <img
                                  src={cozy3dSrc(t.emoji)}
                                  alt={cozy3dLabel(t.emoji)}
                                  draggable={false}
                                  style={{
                                    width: '90%', height: '90%', objectFit: 'contain',
                                    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.32))',
                                  }}
                                />
                              ) : t.emoji ? (
                                t.emoji
                              ) : (
                                // PNG-Avatar (cozyCast Set): über QQTeamAvatar rendern.
                                // 100% damit die PNG-Border (eigener Tier-Ring) den
                                // gesamten Disc füllt — sonst entsteht ein toter
                                // Solid-Color-Moat zwischen PNG und Outer-Border.
                                <QQTeamAvatar avatarId={t.avatarId} teamEmoji={undefined} size="100%" />
                              )}
                            </div>
                            {/* Name als Text in Team-Color — Showreel-style.
                                2026-05-12 (Wolf 'pubquatscher 2. Reihe fuers r'):
                                shrinkAfter 14 → 11. 12-char Namen wie
                                'Pubquatscher' fallen jetzt rechtzeitig auf die
                                kleinere Long-Font-Variante (~85%) — vermeidet
                                den Single-Letter-Wrap. */}
                            <TeamNameLabel
                              name={t.name}
                              maxLines={2}
                              shrinkAfter={11}
                              color={t.color}
                              fontWeight={900}
                              fontSize={nameFont}
                              style={{
                                textAlign: 'center',
                                letterSpacing: '-0.01em',
                                // 2026-05-13: bei 40%-getintetem BG braucht der
                                // Team-Color-Text einen dunklen Halo, damit Color-
                                // on-Color nicht matscht. Pink-Glow durch Dark-
                                // Halo ersetzt (gleiches Pattern wie Audit-Fix).
                                textShadow: '0 2px 8px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.55)',
                                maxWidth: '95%',
                              }}
                            />
                          </div>
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

      {/* "Viel Glück!" — reserve space from the start to prevent layout jump when it fades in */}
      <div style={{
        marginTop: 'clamp(32px, 4cqw, 64px)',
        height: 'clamp(38px, 5.2cqw, 80px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontSize: 'clamp(28px, 4cqw, 64px)', fontWeight: 900,
          color: goodLuckColor,
          textTransform: 'uppercase', letterSpacing: '0.15em',
          textShadow: goodLuckShadow,
          opacity: showGoodLuck ? 1 : 0,
          transform: showGoodLuck ? 'scale(1)' : 'scale(0.7)',
          animation: showGoodLuck ? 'qqTrGood 900ms cubic-bezier(.2,.8,.2,1) both' : 'none',
        }}>
          <QQEmojiIcon emoji="✨"/> {lang === 'en' ? 'Good luck!' : 'Viel Glück!'} <QQEmojiIcon emoji="✨"/>
        </div>
      </div>

    </div>
  );
}
