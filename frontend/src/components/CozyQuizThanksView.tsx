/**
 * CozyQuizThanksView — End-Screen nach GameOver.
 *
 * Zeigt Quiz-Recap (Question-Ticker), Sieger-Hero, QR-Code zum Summary,
 * Wolf-Sprecher rechts. Brand-Pink/Eurovision-Mode-aware.
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-12 (Refactor Phase 4).
 * 2 externe Importer (QQBuiltinSlide + ThanksTestPage).
 */
import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { cozyCard } from '../qqStyleTokens';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { qqIsMega } from '../../../shared/quarterQuizTypes';
import { useLangFlip, bt, COZY_CARD_BG, qqArenaGlass } from '../cozyQuizShared';
import { Fireflies, EurovisionHearts } from './CozyQuizAmbient';
import { ConfettiOverlay } from './CozyQuizConfettiOverlay';
import { QQTeamAvatar } from './QQTeamAvatar';
import { isQuirkTileSet } from '../quirks2Avatars';
import { qqSortedGroups } from '../qqShared';
import { qqFinalSortedTeams } from '../utils/qqFinalScore';
import { holeSiegerQuelle } from '../qqSiegerUebergabe';
import { QQEmojiIcon, QQIcon } from './QQIcon';
import { getActiveThemeId, BUEHNE_THEME_ID } from '../qqTheme';
import { TeamNameLabel } from './TeamNameLabel';
import { WolfHeadIcon } from './WolfHeadIcon';
import { CozyWolfImage } from './CozyWolfImage';
import { AnimatedCozyWolf, WolfCoModerator, getBrandColors } from '../pages/QQBeamerPage';
import { isThemed, isQuietMotion } from '../qqTheme';
import { prefersReducedMotion } from '../utils/reducedMotion';

export function ThanksView({ state: s, roomCode }: { state: QQStateUpdate; roomCode?: string }) {
  const lang = useLangFlip(s.language);
  // ── Die Sieger-Marke kommt von der Kroenung herueber ──────────────────────
  // 2026-08-25, aufgenommen mit scripts/danke-uebergang.mjs: bei 9 ms stand die
  // Siegerfolie, bei 161 ms war die Buehne LEER, und erst ab 641 ms baute sich
  // das Danke Stueck fuer Stueck auf. Rund eine halbe Sekunde Schwarz, an der
  // Naht zwischen dem groessten Moment des Abends und dem letzten Bild.
  //
  // Statt dort etwas EINZUBLENDEN faehrt die Marke von ihrer alten Position
  // herueber: sie steht also schon im ersten Bild, und der Rest der Folie baut
  // sich um sie herum auf. Ein Gegenstand, eine Bewegung, kein Schnitt.
  // FLIP: Endstand bauen, ins Erste zuruecksetzen, losfahren. Nur `transform`,
  // damit nichts neu gesetzt wird.
  const siegerRef = useRef<HTMLDivElement | null>(null);
  const themed = isThemed();
  // 2026-08-23 (Uebergabe 2a, Buehnen-Durchgang): die Danke-Folie ist das
  // letzte Bild des Abends und hatte den Durchgang noch nicht gesehen.
  const istBuehne = getActiveThemeId() === BUEHNE_THEME_ID;
  // Cozy Quirks: eckige Kachel → Sieger-Coin quadratisch, ohne weißen Ring; bg +
  // Glow bleiben (= Kachel + Feier-Glow, wie im „ohne"-Beispiel).
  const quirkSet = isQuirkTileSet(s.avatarSetId);
  // 2026-05-10 (Audit-P0 Eurovision-Konsistenz): brand-themed colors via Helper.
  const brand = getBrandColors(!!s.theme?.eurovisionMode);
  // 2026-05-10 (Wolf-Bug 'geteilter Spieler-Link wird beim nächsten Spiel
  // überschrieben'): Wenn das Spiel persistiert ist (`s.lastGameResultId`
  // vom Backend gesetzt nach GAME_OVER → THANKS), bauen wir den QR-Link mit
  // `/summary/by-id/{id}` — der lookup ist stabil über alle 200 letzten
  // Spiele hinweg. Fallback auf `/summary/{roomCode}` nur bis lastGameResultId
  // ankommt (kurzes Fenster bei phase-Wechsel).
  const summaryUrl = typeof window === 'undefined'
    ? ''
    : s.lastGameResultId
      ? `${window.location.origin}/summary/by-id/${encodeURIComponent(s.lastGameResultId)}`
      : roomCode
        ? `${window.location.origin}/summary/${encodeURIComponent(roomCode)}`
        : '';

  // Sieger ermitteln (höchster total = score + bonus + awards).
  // 2026-05-16 (Wolf Score-Modell-Fix): score = team.largestConnected
  // (groesstes Cluster + stuck/stack-Bonus), nicht cellsByTeam.
  const awards = s.endAwards;
  const awardPoints: Record<string, number> = {};
  for (const t of s.teams) awardPoints[t.id] = 0;
  if (awards?.underdog) awardPoints[awards.underdog] = (awardPoints[awards.underdog] ?? 0) + 1;
  if (awards?.meisterklauer) awardPoints[awards.meisterklauer] = (awardPoints[awards.meisterklauer] ?? 0) + 1;
  if (awards?.speedy) awardPoints[awards.speedy] = (awardPoints[awards.speedy] ?? 0) + 1;
  // 2026-08-25, an der Aufnahme der Schluss-Strecke gefunden: hier stand eine
  // EIGENE Endabrechnung, und sie war die vierte im Haus. Sie kannte die
  // CozyGame-Punkte nicht, den Stechen-Sieger nicht und hatte bei Gleichstand
  // kein letztes Kriterium. Ergebnis auf der Wand: der Turm kroente ein Team,
  // die Siegerfolie ein zweites und die Danke-Folie ein drittes - alle drei
  // innerhalb von zehn Sekunden. `qqFinalSortedTeams` ist die Rechnung, die
  // auch Handy und Turm benutzen.
  const winnerTeam = qqFinalSortedTeams(s)[0];
  // 2026-07-03 (Wolf-Audit 'name der teams hier falsch'): In CozyArena
  // (nestedTeams) darf NICHT ein einzelnes Sub-Team gewinnen — Sieger ist die
  // FRAKTION mit den meisten summierten Punkten. qqSortedGroups liefert schon
  // synthetische Fraktions-Teams (Name = Fraktionsname, emoji = Wappen-Slug),
  // sodass der restliche Hero-Render 1:1 korrekt die Fraktion zeigt.
  const nested = !!(s as any).nestedTeams;
  const winner = nested ? (qqSortedGroups(s)[0] ?? winnerTeam) : winnerTeam;

  // Der FLIP selbst. `useLayoutEffect`, damit die Marke nie einen Frame lang an
  // ihrem Zielort steht, bevor sie zurueckgesetzt wird - das waere ein Sprung.
  useLayoutEffect(() => {
    if (prefersReducedMotion() || isQuietMotion()) return;
    const el = siegerRef.current;
    if (!el || !winner?.id) return;
    const quelle = holeSiegerQuelle(winner.id);
    if (!quelle) return;
    const buehne = el.closest('[data-qq-danke-buehne]') as HTMLElement | null;
    const b = (buehne ?? el.ownerDocument.body).getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) return;
    const r = el.getBoundingClientRect();
    const zielX = r.left + r.width / 2 - b.left;
    const zielY = r.top + r.height / 2 - b.top;
    const vonX = quelle.x * b.width;
    const vonY = quelle.y * b.height;
    // Der Massstab: die Kroenungs-Marke ist deutlich groesser als die hier.
    const skala = r.width > 0 ? (quelle.groesse * b.width) / r.width : 1;
    el.style.transformOrigin = 'center center';
    el.style.transform = `translate(${vonX - zielX}px, ${vonY - zielY}px) scale(${skala})`;
    el.style.transition = 'none';
    const bild = requestAnimationFrame(() => {
      el.style.transition = 'transform 720ms cubic-bezier(0.22, 0.72, 0.2, 1)';
      el.style.transform = 'none';
    });
    return () => cancelAnimationFrame(bild);
  }, [winner?.id]);

  // 2026-05-10 v6 (Wolf 'pages sollen identisch sein, thanks soll wie setup
  // aussehen, nur mit anderen inhalten'): Komplettes Layout-Refactor — spiegelt
  // jetzt PausedView/PreGameView-Struktur (= Wolfs „Setup-Page"):
  //   - BG + Ambient-Ring-Light wie qqPauseAura
  //   - Wolf bottom-LEFT in schlafen-Mode (statt PreGame's WolfCoModerator)
  //   - Hero: kleines CozyQuiz-Stinger-Eyebrow + großer „Danke fürs Spielen"-
  //     Title mit Letter-Cascade + Wave (wie „Gleich geht's los")
  //   - Big Card mit fixed-height clamp(460px,60cqh,660px), SVG-Star-Border-
  //     Trace außen + Inner-Shimmer-Strip + Inner-Glow + 3-col content
  //     (Events · Sieger · Insta+QR)
  const de = lang === 'de';
  // 2026-07-18 (Wolf bild 16): Im Kolosseum liegt der Arena-BG hinter der Buehne
  // (SlideStage). Damit „der bg schoen sichtbar" ist, malt die Thanks-Page dann
  // KEINEN opaken Page-Untergrund mehr und die grosse Card wird zu Arena-Glas
  // (translucent + blur). Gegated wie ArenaBeamerBg: mega + kein Skin + BGs an.
  const megaArena = qqIsMega(s) && !themed && (s as any).arenaBackgrounds !== false && !s.theme?.lobbyBackgroundUrl;
  const cardBg = s.theme?.eurovisionMode
    ? 'linear-gradient(180deg, rgba(45,22,68,0.72) 0%, rgba(31,15,61,0.62) 100%)'
    : (s.theme?.cardBg ?? COZY_CARD_BG);
  const fontFam = themed
    ? 'var(--qq-font)'
    : s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif` : "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif";
  const isEsc = !!s.theme?.eurovisionMode;
  const lobbyBgUrl = s.theme?.lobbyBackgroundUrl;
  // 2026-05-16: winnerCells/winnerBonus waren Dead-Code (nirgendwo verwendet),
  // bei der Score-Modell-Bereinigung mit entfernt.

  return (
    // Die Kennung ist der Bezugsrahmen der Uebergabe: die Kroenung merkt sich
    // die Position ihrer Marke als Anteil DIESER Flaeche, nicht in Bildpunkten.
    <div data-qq-danke-buehne style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      // 2026-05-12 (Wolf 'safe-margin im ganzen quiz'): floor auf Safe-Margin.
      padding: 'max(var(--qq-safe-margin), 40px) max(var(--qq-safe-margin), 64px) max(var(--qq-safe-margin), 56px)',
      position: 'relative', overflow: 'hidden',
      gap: 28,
      minHeight: 0,
      // BG identisch zu PausedView/PreGameView (Setup-Look).
      // 2026-06-24 (Skin): bei aktivem Skin flacher Skin-BG statt dunklem
      // Pink-Glow-Untergrund.
      // 2026-07-18 (Wolf bild 16): Arena → transparent, damit der Kolosseum-BG
      // der SlideStage durchscheint (nur ein feiner Akzent-Glow bleibt fuer Tiefe).
      background: megaArena
        ? `radial-gradient(ellipse at 50% -10%, rgba(${brand.accentRgb},0.08), transparent 60%), transparent`
        : themed
        ? 'var(--qq-bg)'
        : `radial-gradient(ellipse at 50% -10%, rgba(${brand.accentRgb},0.10), transparent 55%), ` +
        'radial-gradient(ellipse at 85% 110%, rgba(99,102,241,0.08), transparent 55%), ' +
        `radial-gradient(ellipse at 15% 80%, rgba(${brand.accentRgb},0.05), transparent 50%), ` +
        '#120F18',
      // 2026-07-19 (Kolosseum-Font-Sweep): Thanks-Root folgt im Kolosseum dem
      // Arena-Font-System (vorher immer Bricolage/Nunito).
      fontFamily: megaArena ? 'var(--font-arena-body)' : fontFam,
    }}>
      {lobbyBgUrl && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${lobbyBgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.65,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}
      {/* 2026-07-18 (Wolf bild 16): Arena — dezenter Kopf-Scrim hinter dem Hero,
          damit Titel + Subtitle ueber dem hellen Kolosseum-Lichtstrahl kontrast-
          sicher bleiben (color-contrast), ohne die Fahnen im BG zu verdecken. */}
      {megaArena && (
        <div aria-hidden style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '38%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(6,4,14,0.55) 0%, rgba(6,4,14,0.22) 55%, transparent 100%)',
          pointerEvents: 'none', zIndex: 2,
        }} />
      )}
      <Fireflies />
      {isEsc && <EurovisionHearts />}
      <style>{`
        @keyframes qqThanksColIn {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes qqThanksCrownBob {
          0%, 100% { transform: translate(-50%, 0) rotate(-3deg); }
          50%      { transform: translate(-50%, -4px) rotate(3deg); }
        }
        /* 2026-08-25: die Sieger-Marke atmet leicht, statt zu leuchten.
           Bewusst nur eine transform-Bewegung, damit die Kante scharf bleibt und
           die GPU sie komponiert. (Kein Backtick in diesem Kommentar - er wuerde
           das umgebende Template beenden.) */
        @keyframes qqThanksSiegerSchweben {
          0%, 100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-8px) scale(1.012); }
        }
        @keyframes qqThanksWinnerGlow {
          0%, 100% { box-shadow: 0 0 30px var(--wg, rgba(246, 239, 230,0.4)), 0 0 64px rgba(251,191,36,0.14), 0 12px 30px rgba(0,0,0,0.55), inset 0 -8% 16% rgba(0,0,0,0.30), inset 0 4% 10% rgba(246, 239, 230,0.12); }
          50%      { box-shadow: 0 0 46px var(--wg, rgba(246, 239, 230,0.55)), 0 0 88px rgba(251,191,36,0.22), 0 12px 30px rgba(0,0,0,0.55), inset 0 -8% 16% rgba(0,0,0,0.30), inset 0 4% 10% rgba(246, 239, 230,0.12); }
        }
        /* 2026-05-10 (Designer-Recherche): subtler QR-Pulse signalisiert
           „interaktiv/scannbar" ohne zu nerven. Scale 1.00→1.03, 2.4s. Kein
           Blink (zerstört Scan-Erfolg). */
        @keyframes qqThanksQrPulse {
          0%, 100% { transform: scale(1.00); }
          50%      { transform: scale(1.03); }
        }
        /* Fallback-Defs für PausedView-Keyframes (falls Thanks ohne vorheriges
           PausedView-Mount gerendert wird, z.B. Direkt-Navigation auf /beamer
           im FINAL_THANKS-State). */
        @keyframes qqPauseAura {
          0%, 100% { opacity: 0.55; transform: translateX(-50%) scale(0.96); }
          50%      { opacity: 0.85; transform: translateX(-50%) scale(1.04); }
        }
        @keyframes qqPauseShimmer {
          0%   { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }
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

      {/* ── Ambient ring-light (mirror PausedView qqPauseAura) ── */}
      <div style={{
        position: 'absolute',
        top: '14%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(720px, 70cqw)',
        height: 'min(720px, 70cqw)',
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${brand.accentRgb},0.28) 0%, transparent 65%)`,
        opacity: 0.65,
        animation: 'qqPauseAura 7s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* ── PreGame-spezifische Atmo-Effekte: BgBreath + Fall-Particles.
          Spotlight-Sweep wurde entfernt (Wolf 2026-05-10: 'geht nur über
          1/3 screen und sieht abgeschnitten aus'). Der diagonale Lichtkegel
          ist im Setup mit dem PreGame-Layout abgestimmt; in der Thanks-Card-
          Komposition wirkt er stattdessen wie eine isolierte Halbinsel. ── */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 60%, rgba(${brand.accentRgb},0.10) 0%, transparent 70%)`,
        opacity: 0,
        animation: 'qqPreGameBgBreath 9s ease-in-out infinite',
        pointerEvents: 'none', zIndex: 0,
      }} />
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
            background: i % 2 ? brand.accentHex : brand.accentSoft,
            boxShadow: `0 0 12px rgba(${brand.accentRgb},0.7), 0 0 4px rgba(246, 239, 230,0.5)`,
            opacity: 0,
            animation: `qqPreGameFallParticle ${dur}s linear ${delay}s infinite`,
            pointerEvents: 'none', zIndex: 3,
          }} />
        );
      })}

      {/* ── Wolf bottom-LEFT in schlafen-Mode — 2026-05-11 (Wolf-Bug 'wolf
          kollidiert mit Sieger-Team'): weiter nach links + unten, kleiner.
          Sitzt jetzt bündig in der Ecke (links 0, bottom 0) statt mit Innen-
          Padding — damit max-Abstand zum mittig sitzenden Winner-Hero. Plus
          width-Cap leicht runter (300→240) damit der Wolf nicht ins Sieger-
          Card-Layout reinragt. */}
      <div style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        zIndex: 6,
        pointerEvents: 'none',
        // 2026-08-25, an der Aufnahme korrigiert (scripts/danke-uebergang.mjs):
        // die Folie baute sich ueber 1,7 s auf, der letzte Block startete erst
        // bei 1,2 s. Weil der Phasenwechsel selbst eine Kreuzblende ist
        // (View-Transition, siehe main.css), blendete sie damit auf ein LEERES
        // Bild - gemessen von 186 bis 460 ms schwarze Buehne. Die Verzoegerungen
        // sind jetzt so kurz, dass die Folie waehrend der Blende schon steht.
        animation: 'panelSlideIn 0.6s var(--qq-ease-bounce) 0.34s both',
      }}>
        <AnimatedCozyWolf
          widthCss="clamp(160px, 15cqw, 240px)"
          mode="schlafen"
        />
      </div>


      {/* ── HERO: kleines CozyQuiz-Eyebrow + großer „Danke fürs Spielen"-Title
          mit Letter-Cascade + Wave (mirror „Gleich geht's los"-Block). ── */}
      <div style={{
        position: 'relative', zIndex: 5,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        animation: 'panelSlideIn 0.7s var(--qq-ease-out-cubic) both',
      }}>
        {/* CozyQuiz-Eyebrow — Standard: Stinger-Wordmark, ESC: COZYQUIZ × Logo */}
        {isEsc && s.theme?.logoUrl ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            gap: 'clamp(14px, 1.6cqw, 28px)', marginBottom: 12,
            animation: 'panelSlideIn 0.6s var(--qq-ease-bounce) 0.1s both',
          }}>
            <span style={{
              fontFamily: 'var(--font-brand)',
              fontSize: 'clamp(42px, 5.5cqw, 82px)',
              fontWeight: 400,
              letterSpacing: '0.04em',
              // 2026-06-24 (Lesbarkeit): grosser Text AUF dem Seiten-BG nutzt
              // var(--qq-text) (kontrast-korrekt je Skin), nicht den Akzent —
              // sonst z.B. Neo-Brutal blau-auf-lila. Cozy behält den Pink-Akzent.
              color: themed ? 'var(--qq-title)' : brand.accentHex,
              // 2026-05-13 Kontrast-Audit: Pink-Glow weg, Dark-Halo + Outline.
              textShadow: themed ? 'none' : 'none',
              WebkitTextStroke: themed ? 'none' : '1px rgba(0,0,0,0.4)',
              lineHeight: 0.96,
              animation: 'qqStingerHover 4.2s ease-in-out 0.6s infinite',
            }}>COZYQUIZ</span>
            <span aria-hidden style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(34px, 4.6cqw, 70px)',
              lineHeight: 1, height: '1em',
              color: '#fde6f0',

              animation: 'qqStingerXShine 3.5s ease-in-out 0.6s infinite',
            }}>×</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', animation: 'qqStingerHover 4.2s ease-in-out 0.6s infinite' }}>
              <img
                src={s.theme.logoUrl}
                alt="Eurovision Song Contest"
                draggable={false}
                style={{
                  height: 'clamp(68px, 9.5cqh, 142px)',
                  width: 'auto',
                  filter: `drop-shadow(0 0 18px rgba(${brand.accentRgb},0.55))`,
                }}
              />
            </span>
          </div>
        ) : (
          <div style={{
            marginBottom: 12,
            animation: 'panelSlideIn 0.6s var(--qq-ease-bounce) 0.1s both',
          }}>
            <span style={{
              fontFamily: 'var(--font-brand)',
              fontSize: 'clamp(48px, 6cqw, 96px)',
              fontWeight: 400,
              letterSpacing: '0.06em',
              color: brand.accentHex,
              textShadow: `0 0 32px rgba(${brand.accentRgb},0.6)`,
              lineHeight: 0.96,
              animation: 'qqStingerHover 4.2s ease-in-out 0.6s infinite',
              display: 'inline-block',
              textTransform: 'uppercase',
            }}>{qqIsMega(s) ? 'COZYARENA' : 'COZYQUIZ'}</span>
          </div>
        )}

        {/* Big Title „Danke fürs Spielen!" — Letter-Cascade + Wave wie auf
            Setup-Page. Wolf 2026-05-10. */}
        {(() => {
          const titleText = de ? 'Danke fürs Spielen!' : 'Thanks for Playing!';
          return (
            <div
              aria-label={titleText}
              style={{
                fontSize: 'clamp(48px, 6.4cqw, 96px)', fontWeight: 900,
                // 2026-06-24 (Lesbarkeit): Hero-Titel auf Seiten-BG → var(--qq-text)
                // (kontrast-korrekt je Skin) statt Akzent. Cozy = Pink wie gehabt.
                color: themed ? 'var(--qq-title)' : brand.accentHex,
                letterSpacing: '-0.01em',
                lineHeight: 1.05,
                // 2026-05-13 Kontrast-Audit: Pink-Glow weg im ESC-Mode (war
                // kontraproduktiv ueber 5.png Pink-Gradient). Dark-Halo first.
                textShadow: themed
                  ? 'none'
                  : isEsc
                  ? 'none'
                  : `0 0 24px rgba(${brand.accentRgb},0.28), 0 0 56px rgba(${brand.accentRgb},0.28)`,
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

        {/* Subtitle (zwei Sätze) — italic, Light-Gray. */}
        <div style={{
          marginTop: 10,
          fontSize: 'clamp(18px, 1.9cqw, 28px)', fontWeight: 700,
          color: themed ? 'var(--qq-text-muted)' : 'var(--qq-text-muted)', fontStyle: 'italic',
          textAlign: 'center', lineHeight: 1.3,
          animation: 'panelSlideIn 0.55s var(--qq-ease-out-cubic) 0.14s both',
        }}>{de
          ? 'Wir hoffen ihr hattet Spaß! Bis zum nächsten Mal!'
          : 'We hope you had fun! See you next time!'}</div>
      </div>

      {/* ── Big Card (mirror PausedView Hero-Card-Wrapper) — fixe Höhe,
          SVG-Star-Border-Trace außen, Inner-Card mit Shimmer-Strip + Inner-Glow,
          Inhalt: 3-col Events · Sieger · Insta+QR. ── */}
      <div style={{
        width: '100%', maxWidth: 'min(94cqw, 1500px)', position: 'relative', zIndex: 5,
        borderRadius: themed ? 'var(--qq-card-radius)' : 26,
        isolation: 'isolate',
        height: 'clamp(460px, 60cqh, 660px)',
      }}>
        {/* 2026-05-17 (Wolf): Star-Border-Sweep auch hier raus — too much.
            Card-Glow + soft Border reichen. Keyframe bleibt in qqShared.ts. */}
        <div style={{
          position: 'relative', zIndex: 1,
          // Hebel 1 (Style-Tokens): kanonisches Card-Muster via cozyCard() —
          // byte-identisch zum vorherigen Inline-Block (bg/radius/border/shadow).
          ...cozyCard({ bg: cardBg, accentHex: brand.accentHex, accentRgb: brand.accentRgb }),
          // 2026-07-18 (Wolf bild 16): Arena → translucentes Glas statt opaker
          // Card, damit das Kolosseum durchscheint (allgemeine Regel qqArenaGlass).
          ...(megaArena ? qqArenaGlass() : {}),
          padding: 'clamp(32px, 4cqw, 56px)',
          height: 'clamp(460px, 60cqh, 660px)',
          animation: 'panelSlideIn 0.6s var(--qq-ease-out-cubic) both',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Akzent-Streifen oben (animated shimmer) */}
          {!isQuietMotion() && <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, transparent, ${brand.accentHex}, transparent)`,
            animation: 'qqPauseShimmer 6s linear infinite',
            backgroundSize: '200% 100%',
          }} />}
          {/* Subtle Inner-Glow oben-rechts */}
          <div style={{
            position: 'absolute', top: -120, right: -120, width: 320, height: 320,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${brand.accentHex}1c 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          {/* Inner content — 2-col grid: Sieger · QR-Co-Hero. Sieger und QR
              gleich-prominent als 2-Co-Heroes.
              2026-05-10 (Spacing-Audit P0): vorheriger 0.5fr-Platzhalter
              („Nächste Termine"-Block, kam nie) hat 17% Card-Breite leer
              gefressen und Sieger+QR nach rechts gerückt — Card wirkte
              unbalanciert, Star-Border traced um halb-leere Card. Solange
              cozywolf.de + Buchungs-Flow noch nicht stehen ist 2-col korrekt.
              todo.md hat den 3-col-Restore-Skelett-Plan unter „Later". */}
          <div style={{
            position: 'relative', zIndex: 2,
            flex: 1, minHeight: 0,
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.1fr',
            gap: 'clamp(20px, 2.5cqw, 40px)',
            alignItems: 'stretch',
          }}>

            {/* MITTE: Sieger-Hero — Wolf 2026-05-10: Avatar etwas größer,
                Text-Format „Team / {Name} / hat heute gewonnen", Punkte-Pille
                raus (Punkte hat man im Live-Reveal gesehen, hier reicht der
                Sieger-Hero pur). */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(14px, 1.8cqh, 26px)',
              minWidth: 0,
              // Ohne Verzoegerung: das ist der Gegenstand, der von der
              // Kroenung herueberfaehrt (siehe die Uebergabe oben). Eine
              // Verzoegerung haette ihn unsichtbar fahren lassen.
              animation: 'qqThanksColIn 0.5s ease both',
            }}>
              {winner && (
                <div ref={siegerRef} style={{ position: 'relative' }}>
                  {/* 2026-08-23: dritte und letzte Krone des Abends, gleiche
                      Entscheidung wie bei Schaetzchen und Zehn von Zehn. Wer
                      gewonnen hat, steht direkt darunter im Klartext („hat heute
                      gewonnen"), und die Marke ist ohnehin die groesste Flaeche
                      der Folie. */}
                  {!istBuehne && (
                  <span aria-hidden style={{
                    position: 'absolute', left: '50%', top: '-30%',
                    fontSize: 'clamp(64px, 7cqw, 110px)', lineHeight: 1,
                    pointerEvents: 'none',
                    filter: 'drop-shadow(0 0 28px rgba(251,191,36,0.9))',
                    animation: 'qqThanksCrownBob 2.4s ease-in-out infinite',
                    zIndex: 5,
                  }}><QQEmojiIcon emoji="👑" size="1em" /></span>
                  )}
                  {/* 2026-08-25 (Wolf: „koennte die kachel nicht mehr 3d effekt
                      haben?"). Die Marke war eine Flaeche in Teamfarbe mit zwei
                      weichen radialen Lichtern - das liest sich als Aufkleber,
                      nicht als Gegenstand. Sie bekommt jetzt dieselbe Sprache
                      wie die Bausteine im Turm: eine Lichtkante oben, eine
                      Schattenkante unten, eine dunkle Fuge an der Unterseite und
                      einen SCHATTEN AUF DEN BODEN. Der Bodenschatten ist der
                      Teil, der aus einer Flaeche einen Koerper macht - ohne ihn
                      schwebt jede noch so gut beleuchtete Kachel im Nichts.
                      Alles davon liegt auf der KACHEL, nicht auf der gelieferten
                      PNG darin: kein Filter, keine Deckkraft, keine
                      Farbrechnung am Motiv. */}
                  {istBuehne && !isQuietMotion() && (
                    <div aria-hidden style={{
                      position: 'absolute', left: '50%', bottom: -26,
                      width: '86%', height: 26, transform: 'translateX(-50%)',
                      background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 72%)',
                      pointerEvents: 'none',
                    }} />
                  )}
                  <div style={{
                    ['--wg' as string]: `${winner.color}99`,
                    width: 'clamp(180px, 20cqw, 290px)', height: 'clamp(180px, 20cqw, 290px)',
                    borderRadius: quirkSet ? '18%' : '50%',
                    background: istBuehne
                      ? `linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.07) 16%, rgba(255,255,255,0) 48%, rgba(0,0,0,0.14) 76%, rgba(0,0,0,0.34) 100%), ${winner.color}`
                      : `
                      radial-gradient(circle at 50% 60%, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0) 60%),
                      radial-gradient(circle at 32% 28%, rgba(246, 239, 230,0.22) 0%, rgba(246, 239, 230,0) 46%),
                      ${winner.color}`,
                    border: quirkSet ? 'none' : `5px solid rgba(246, 239, 230,0.30)`,
                    boxShadow: istBuehne
                      ? 'inset 0 2px 0 rgba(255,255,255,0.42), inset 3px 0 0 rgba(255,255,255,0.08), inset -3px 0 0 rgba(0,0,0,0.20), inset 0 -3px 0 rgba(0,0,0,0.26), 0 14px 22px rgba(0,0,0,0.48)'
                      : undefined,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    // 2026-08-23: der pulsierende Schein um die Sieger-Marke faellt
                    // auf der Buehne weg. Er sagt nichts, was Groesse und Text
                    // nicht schon sagen, und auf Projektionsdistanz weicht er die
                    // Kante der Kachel auf. Stattdessen atmet sie leicht, das
                    // haelt den Gegenstand lebendig, ohne die Kante zu ruehren.
                    animation: istBuehne
                      ? (isQuietMotion() ? 'none' : 'qqThanksSiegerSchweben 4.2s ease-in-out infinite')
                      : 'qqThanksWinnerGlow 3.6s ease-in-out infinite',
                  } as React.CSSProperties}>
                    <QQTeamAvatar
                      avatarId={winner.avatarId}
                      teamEmoji={winner.emoji}
                      size={'clamp(142px, 16cqw, 230px)'}
                      flat
                    />
                  </div>
                </div>
              )}
              {winner && (() => {
                const isLong = winner.name.length > 12;
                return (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 4, lineHeight: 1.05, textAlign: 'center', maxWidth: '100%',
                  }}>
                    {/* 2026-08-24: auf der Buehne nachgemessen. Der Satz um den
                        Siegernamen („TEAM" / „hat heute gewonnen") stand bei 22px,
                        die QR-Zeile bei 22px, die Nutzen-Zeile darunter bei 17px.
                        Das ist die letzte Folie des Abends und die einzige, die
                        etwas VERLANGT (scannen) - ausgerechnet dort war die
                        Aufforderung der kleinste Text der Folie. Platz ist reichlich
                        da, die Karte ist 1500px breit und rechts wie links leer. */}
                    <div style={{
                      fontSize: istBuehne ? 'clamp(20px, 2cqw, 28px)' : 'clamp(15px, 1.55cqw, 22px)', fontWeight: 800,
                      color: 'var(--qq-text-muted)',
                      letterSpacing: '0.22em', textTransform: 'uppercase',
                    }}>{nested ? (de ? 'Fraktion' : 'Faction') : 'Team'}</div>
                    <div style={{
                      fontSize: isLong ? 'clamp(28px, 3cqw, 46px)' : 'clamp(36px, 3.8cqw, 58px)',
                      fontWeight: 900,
                      // 2026-08-23: Siegername in Creme, wie am Brett und auf allen
                      // Siegerbaendern. Die Farbe traegt die Marke darueber, und
                      // zwar auf 290px Kantenlaenge - das ist die deutlichste
                      // Teamfarbe des ganzen Abends.
                      color: istBuehne ? 'var(--qq-text)' : winner.color,
                      letterSpacing: '-0.01em',
                      textShadow: istBuehne ? 'none' : `0 0 22px ${winner.color}77`,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      maxWidth: '100%',
                      marginTop: 2,
                    }}>{winner.name}</div>
                    <div style={{
                      marginTop: 4,
                      fontSize: istBuehne ? 'clamp(20px, 2cqw, 28px)' : 'clamp(15px, 1.55cqw, 22px)', fontWeight: 800,
                      color: themed ? 'var(--qq-text-muted)' : 'var(--qq-text-muted)',
                      letterSpacing: '0.04em',
                    }}>{de ? 'hat heute gewonnen' : 'won today'}</div>
                  </div>
                );
              })()}
            </div>

            {/* RECHTS: QR-Co-Hero — Wolf 2026-05-10 nach Designer-Recherche.
                Statt 104px-Mini-Marker in der Page-Ecke (= Decoration-Footer-
                Anti-Pattern) jetzt vertikal-zentriert in der rechten Card-
                Spalte, ~280px, mit subtilem Pulse + Brand-Logo in der Mitte
                (Branded-QR +30% Scan-Rate laut B2B MarketingProfs 2025) +
                benefit-driven CTA „Feedback + Insta folgen". */}
            {summaryUrl && (
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 14, minWidth: 0,
                animation: 'qqThanksColIn 0.6s ease 0.22s both',
              }}>
                <div style={{
                  padding: 'clamp(10px, 1.2cqw, 16px)',
                  borderRadius: themed ? 'var(--qq-card-radius)' : 18,
                  background: '#fff',
                  border: themed ? 'var(--qq-card-border)' : `3px solid rgba(${brand.accentRgb},0.75)`,
                  boxShadow: themed ? 'var(--qq-card-shadow)' : `0 0 28px rgba(${brand.accentRgb},0.55)`,
                  animation: isQuietMotion() ? undefined : 'qqThanksQrPulse 2.4s ease-in-out infinite',
                }}>
                  <QRCodeSVG
                    value={summaryUrl}
                    size={280}
                    bgColor="#F6EFE6" fgColor="#120F18"
                    level="H"
                    imageSettings={{
                      src: '/logo.png',
                      height: 56,
                      width: 56,
                      excavate: true,
                    }}
                    style={{
                      width: 'clamp(220px, 22cqw, 320px)',
                      height: 'clamp(220px, 22cqw, 320px)',
                    }}
                  />
                </div>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 3, lineHeight: 1.2, textAlign: 'center',
                  // Mit 26px statt 17px braucht „Feedback geben + auf Insta
                  // folgen" mehr Zeile, sonst bricht der Satz dreifach um.
                  maxWidth: istBuehne ? 'clamp(320px, 32cqw, 520px)' : 'clamp(220px, 22cqw, 340px)',
                }}>
                  {/* 2026-07-13 (Skill-Review CRO): Scan-Verb ergaenzt. Vorher nur
                      der Benefit ohne Aufforderung → QR-Aktion (scannen) war nicht
                      angesagt. Jetzt Aktions-Zeile + Benefit-Zeile. */}
                  <div style={{
                    fontSize: istBuehne ? 'clamp(22px, 2.2cqw, 30px)' : 'clamp(14px, 1.5cqw, 22px)', fontWeight: 900,
                    color: brand.accentHex, letterSpacing: '0.02em',
                    textShadow: `0 0 12px rgba(${brand.accentRgb},0.5)`,
                  }}>
                    {/* 2026-08-23: rohes Systemzeichen raus, das gelieferte Set
                        rein - wie ueberall sonst im Quiz. */}
                    <QQEmojiIcon emoji="📱" size="1em" /> {de ? 'QR scannen' : 'Scan the code'}
                  </div>
                  <div style={{
                    fontSize: istBuehne ? 'clamp(20px, 1.9cqw, 26px)' : 'clamp(12px, 1.2cqw, 17px)', fontWeight: 800,
                    color: themed ? 'var(--qq-text-muted)' : 'rgba(246, 239, 230,0.82)',
                  }}>{de ? 'Feedback geben + auf Insta folgen' : 'Leave feedback + follow on Insta'}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
