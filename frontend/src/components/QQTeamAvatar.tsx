import { useMemo, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { getAvatarDisplay } from '../avatarSets';
import { useAvatarSetCtx } from '../avatarSetContext';
import { isCozy3dSlug, cozy3dSrc, cozy3dLabel, cozy3dBlinkSrc, cozy3dHasBlink } from '../cozy3dAvatars';
import { crestEmblemSrc } from '../cozyArenaCrests';
import { isAvatarAwake, subscribeAwake } from '../avatarAwake';
import { isThemed } from '../qqTheme';

// Slug aus einem cozy3d-Bildpfad ziehen (/avatars/cozy3d/<slug>.png).
function cozy3dSlugFromSrc(src: string): string | undefined {
  return /\/avatars\/cozy3d\/([^/]+)\.png$/.exec(src)?.[1];
}

type Props = {
  avatarId: string;
  size: number | string;          // px-Zahl ODER beliebiger CSS-Wert (clamp(...), %, …)
  style?: CSSProperties;
  className?: string;
  title?: string;
  /** Avatare sind IMMER rund (auch in Themes) — die cozy3d-3D-Portraits sind für
   *  die runde Disc komponiert und sehen so am besten aus; runde Portraits in
   *  eckigen Skin-Cards = bewusster Editorial-Kontrast (Wolf-Entscheidung
   *  2026-06-25). `square` erzwingt eckige Ecken (radius 0); aktuell ungenutzt. */
  square?: boolean;
  /** Sprache für automatisch generierte title/alt-Texte (Tier-Name). */
  lang?: 'de' | 'en';
  /** Blinzel-Animation bei PNG-Modus (default: true). */
  blink?: boolean;
  /** Augen-Zustand (cozy3d): 'auto' = Ruhe offen + Idle-Blinzeln; 'open'/'closed'
   *  = State-gesteuert (z.B. Grid: zu wenn nicht dran, auf wenn Team „dran";
   *  Reveal: auf wenn richtig). Weicher Crossfade beim Wechsel. */
  eyes?: 'auto' | 'open' | 'closed';
  /** Team-ID → per-Team-Wake (wakeTeamAvatar) lässt genau dieses Tier reagieren. */
  teamId?: string;
  /**
   * Optionales Override fuer das Avatar-Set. Wenn nicht gesetzt,
   * wird der aktive Set-Wert aus AvatarSetContext gelesen.
   */
  avatarSetId?: string;
  /**
   * Optionales Team-spezifisches Emoji-Override. Wenn gesetzt, wird genau
   * dieser Emoji gerendert (nur im Emoji-Modus, nicht bei cozyCast/PNG).
   * Quelle ist team.emoji aus dem Backend-State, vom Spieler im /team-
   * 3-Step-Editor frei aus dem Pool gewaehlt.
   */
  teamEmoji?: string;
  /**
   * 2026-05-04 (Wolf): wenn true, kein Glow-Disc-Hintergrund + kein
   * Inset-Schatten — nur das Emoji-Glyph. Fuer Render-Stellen wo der
   * Container selbst schon die Slot-Farbe traegt (z.B. Beamer-Grid-Cells)
   * und die Disc dahinter visuell redundant wirkt. Nur im Emoji-Mode
   * relevant; im PNG-Mode (cozyCast) keine Wirkung.
   */
  flat?: boolean;
  /**
   * 2026-05-05 (Wolf-Bug 'gelb in tabelle, blau auf grid'): optional Override
   * fuer den Disc-Hintergrund im Emoji-Mode. Standard ist display.color
   * (Avatar-Slot-Farbe, z.B. gelb fuer Slot 4). Mit bgColor uebersteuern
   * Standings/Tabelle den Disc-BG auf qqGetBoardColor → konsistent zur
   * Brett-Palette der Grid-Cells. Nur Emoji-Mode (cozyCast PNG ignoriert).
   */
  bgColor?: string;
};

/**
 * Team-Avatar.
 *
 * Zwei Render-Pfade:
 *   1. PNG (Set 'cozyCast'): laedt avatar-{slug}.png + closed-Variante mit
 *      sanfter Blinzel-Animation (alter Look).
 *   2. Emoji (alle anderen Sets, Default): rendert Glow-Disc in der
 *      Slot-Farbe mit grossem Emoji im Zentrum (Inset-Schatten fuer 3D).
 *
 * Welcher Pfad aktiv ist, bestimmt `avatarSetId` (entweder Prop-Override oder
 * aus AvatarSetContext). Slot-Eindeutigkeit + Farbe bleiben in beiden Pfaden
 * gleich, weil sie aus QQ_AVATARS[avatarId] kommen — nur das Display variiert.
 *
 * Fallback bei Bildlade-Fehler im PNG-Modus: Emoji-Glyph in farbigem Kreis.
 */
export function QQTeamAvatar({
  avatarId, size, style, className, title, square, lang, blink = true, eyes = 'auto', teamId, avatarSetId, teamEmoji, flat, bgColor,
}: Props) {
  const ctx = useAvatarSetCtx();
  const setId = avatarSetId ?? ctx.id;
  // serverEmojis nur ehrlich verwenden wenn das Set passt — bei explizitem
  // Override (z.B. cozyCast) ignorieren wir die Server-Emojis.
  const serverEmojis = (avatarSetId == null || avatarSetId === ctx.id) ? ctx.emojis : undefined;
  const display = getAvatarDisplay(avatarId, setId, serverEmojis, teamEmoji);

  const labelText = title ?? display.label;
  // Sprach-Hint wird im aktuellen Code-Pfad nicht benoetigt; lang-Param bleibt
  // fuer API-Stabilitaet erhalten.
  void lang;

  const base: CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    display: 'block',
    borderRadius: square ? 0 : '50%',
    ...style,
  };

  // ── Cozy-Arena-Wappen (flaches Crest-Bild, eigene Schild-Form) ──────────
  if (display.kind === 'crest') {
    return (
      <CrestAvatar
        slug={display.slug}
        src={display.src}
        color={bgColor ?? display.color}
        size={size}
        baseStyle={base}
        className={className}
        title={labelText}
        square={square}
        flat={flat}
      />
    );
  }

  // ── cozy3d Bild-Modus (3D-Avatar auf Farb-Disc) ─────────────────────────
  if (display.kind === 'image') {
    return (
      <ImageAvatar
        src={display.src}
        color={bgColor ?? display.color}
        size={size}
        baseStyle={base}
        className={className}
        title={labelText}
        square={square}
        flat={flat}
        blink={blink}
        eyes={eyes}
        teamId={teamId}
      />
    );
  }

  // ── EMOJI-Modus ────────────────────────────────────────────────────────
  if (display.kind === 'emoji') {
    return (
      <EmojiAvatar
        emoji={display.emoji}
        color={bgColor ?? display.color}
        size={size}
        baseStyle={base}
        className={className}
        title={labelText}
        square={square}
        flat={flat}
      />
    );
  }

  // ── PNG-Modus (cozyCast) ────────────────────────────────────────────────
  return (
    <PngAvatar
      pngBase={display.pngBase}
      pngClosed={display.pngClosed}
      color={display.color}
      size={size}
      baseStyle={base}
      className={className}
      title={labelText}
      square={square}
      blink={blink}
    />
  );
}

// ─── PNG-Avatar (alter Look, fuer cozyCast) ───────────────────────────────
function PngAvatar({
  pngBase, pngClosed, color, size, baseStyle, className, title, square, blink,
}: {
  pngBase: string; pngClosed: string; color: string; size: number | string;
  baseStyle: CSSProperties; className?: string; title: string;
  square?: boolean; blink: boolean;
}) {
  const [failed, setFailed] = useState(false);
  // Zufaelliger Delay pro Mount-Instanz → 8 Avatare blinzeln asynchron.
  const blinkDelay = useMemo(() => -Math.random() * 5.2, []);

  if (failed) {
    return (
      <span
        className={className}
        title={title}
        style={{
          ...baseStyle,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: typeof size === 'number' ? Math.round(size * 0.62) : '60%',
          lineHeight: 1,
        }}
      >
        {/* Fallback-Glyph kann schwierig zu raten sein — wir zeigen einen
            generischen Punkt, statt ein potenziell falsches Tier-Emoji. */}
        ●
      </span>
    );
  }

  if (!blink) {
    return (
      <img
        src={pngBase}
        alt={title}
        title={title}
        className={className}
        onError={() => setFailed(true)}
        style={baseStyle}
        draggable={false}
      />
    );
  }

  const inner: CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    borderRadius: square ? 0 : '50%',
    display: 'block', pointerEvents: 'none',
  };

  return (
    <span
      className={className}
      title={title}
      style={{ ...baseStyle, position: 'relative', overflow: 'hidden' }}
    >
      {/* @keyframes qqAvatarBlink ist global in main.css. */}
      <img
        src={pngBase}
        alt={title}
        onError={() => setFailed(true)}
        style={inner}
        draggable={false}
      />
      <img
        src={pngClosed}
        alt=""
        aria-hidden="true"
        style={{
          ...inner,
          opacity: 0,
          animation: `qqAvatarBlink 5.2s linear ${blinkDelay}s infinite`,
        }}
        draggable={false}
      />
    </span>
  );
}

// ─── Emoji-Avatar (neuer Default-Look, alle Sets ausser cozyCast) ─────────
// 2026-05-07 (Wolf-Bug 'Edge zeigt HR/CH/MC statt Flaggen'): Country-Flag-
// Codepoints werden auf Windows-Browsern nativ als Regional-Indicator-Letters
// gerendert. Twemoji-CountryFlags-Webfont + DOM-Replace-Helper greifen nicht
// 100% zuverlaessig. Direkt-Render hier als <img> ist robust.
//
// 2026-05-10 (Wolf 'Eurovision-Edition Flaggen inkonsistent'): Helpers
// exportiert für Inline-Render an anderen Stellen wo Emojis OHNE QQTeamAvatar
// gerendert werden (Game-Show-Reveal, Grid-Cells im Final-Reveal etc).
export function isCountryFlagGlyph(glyph: string): boolean {
  const cp = glyph.codePointAt(0);
  return cp != null && cp >= 0x1f1e6 && cp <= 0x1f1ff;
}
export function getCountryFlagUrl(glyph: string): string {
  const codepoints: number[] = [];
  for (const ch of glyph) {
    const cp = ch.codePointAt(0);
    if (cp == null) continue;
    if (cp === 0xfe0f) continue;
    codepoints.push(cp);
  }
  const key = codepoints.map(cp => cp.toString(16)).join('-');
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${key}.svg`;
}

/**
 * Render-Helper: zeigt Emoji als Twemoji-Image wenn es ein Country-Flag-Emoji
 * ist (Windows Edge/Chrome zeigen sonst nur „DE", „GR" etc als Regional-
 * Indicator-Letters), sonst als normaler `<span>`-Glyph.
 *
 * 2026-05-10 (Wolf 'Eurovision Flaggen inkonsistent — am anfang ja, bei
 * heute spielen weiterhin DE GR etc'): zentraler Render-Pfad statt manueller
 * Inline-Checks an N Stellen.
 */
export function CountryFlagOrEmoji({ emoji, fontSize, style }: {
  emoji: string;
  fontSize: string | number;
  style?: CSSProperties;
}) {
  const fontSizeStr = typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
  // cozy3d: „Emoji" ist in Wahrheit ein Avatar-Slug → 3D-Bild (statisch, Ruhe=offen).
  // Blinzeln laeuft nur ueber QQTeamAvatar (grosse Avatare); Inline-Render bleibt ruhig.
  if (isCozy3dSlug(emoji)) {
    return (
      <img
        src={cozy3dSrc(emoji)}
        alt={cozy3dLabel(emoji)}
        draggable={false}
        style={{
          width: '1.15em',
          height: '1.15em',
          fontSize: fontSizeStr,
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
          ...style,
        }}
      />
    );
  }
  if (isCountryFlagGlyph(emoji)) {
    return (
      <img
        src={getCountryFlagUrl(emoji)}
        alt={emoji}
        draggable={false}
        style={{
          width: '1.3em',
          height: '1em',
          fontSize: fontSizeStr,
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
          ...style,
        }}
      />
    );
  }
  return (
    <span style={{
      fontSize: fontSizeStr,
      lineHeight: 1,
      display: 'inline-block',
      ...style,
    }}>{emoji}</span>
  );
}

// ─── cozy3d Bild-Avatar (3D-Tier auf Slot-Farb-Disc) ──────────────────────
// Zentraler Rand-/Zoom-Knopf: Anteil des Disc-Durchmessers, den das (quadratisch
// normalisierte) Avatar-Bild einnimmt. Da alle Avatare auf eine quadratische
// Leinwand zentriert sind (scripts/process-cozy3d.mjs), fuellt jede laengste
// Kante exakt diesen Anteil → einheitliche Groesse + gleichmaessiger Rand.
// 0.9 = 5 % Rand pro Seite. Groesser/kleiner hier in einer Zahl drehen.
export const COZY3D_DISC_FILL = 0.9;

function ImageAvatar({
  src, color, size, baseStyle, className, title, square, flat, blink = true, eyes = 'auto', teamId,
}: {
  src: string; color: string; size: number | string;
  baseStyle: CSSProperties; className?: string; title: string; square?: boolean; flat?: boolean; blink?: boolean;
  /** Augen-Zustand: 'auto' = Ruhe offen + Idle-Blinzeln (große Avatare);
   *  'open'/'closed' = State-gesteuert (z.B. Grid: zu wenn nicht dran, auf wenn
   *  Team „dran"). Weicher Crossfade beim Wechsel (Aufwachen/Einschlafen). */
  eyes?: 'auto' | 'open' | 'closed';
  /** Team-ID → per-Team-Wake (wakeTeamAvatar) lässt genau dieses Tier reagieren. */
  teamId?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [blinkFailed, setBlinkFailed] = useState(false);
  const slug = cozy3dSlugFromSrc(src);
  const has = !!slug && !blinkFailed && cozy3dHasBlink(slug);
  // Idle-Blinzeln (Ruhe offen, kurz zu) nur auf GROSSEN Avataren (flat=Grid → statisch).
  const idleBlink = eyes === 'auto' && blink && !flat && has;
  // 'open'/'closed' = explizit State-gesteuert (Crossfade), auch auf flat (Grid).
  const explicit = eyes === 'open' || eyes === 'closed';
  const useStack = has && (idleBlink || explicit);
  // Zufaelliger Phasenversatz → Avatare blinzeln asynchron statt im Gleichtakt.
  const blinkDelay = useMemo(() => -Math.random() * 5.4, []);
  // Hybrid: bei einem Spiel-Event (wakeAllAvatars global ODER wakeTeamAvatar für
  // genau dieses Team) blinzeln Avatare kurz schneller = sichtbare Reaktion.
  const awake = useSyncExternalStore(subscribeAwake, () => isAvatarAwake(teamId));

  const flatStyle: CSSProperties = flat
    ? { background: 'transparent', boxShadow: 'none' }
    : {
        background: `
          radial-gradient(circle at 50% 58%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 58%),
          radial-gradient(circle at 32% 30%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 45%),
          ${color}
        `,
        boxShadow: `0 4px 14px ${color}55, inset 0 -10% 18% rgba(0,0,0,0.28)`,
      };

  const fillPct = `${(COZY3D_DISC_FILL * 100).toFixed(0)}%`;
  const imgFilter = 'drop-shadow(0 2px 3px rgba(0,0,0,0.32))';

  return (
    <span
      className={className}
      title={title}
      style={{
        ...baseStyle,
        ...flatStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // 2026-06-24 (Wolf 'avatare teilweise am kreisrand abgeschnitten'):
        // overflow sichtbar laesst das Motiv ungeschnitten; Disc + Ring bleiben rund.
        overflow: square ? 'hidden' : 'visible',
        borderRadius: square ? 0 : '50%',
      }}
    >
      {failed ? (
        // Fallback: neutraler Punkt (kein potenziell falsches Tier-Emoji).
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '60%', lineHeight: 1 }}>●</span>
      ) : useStack && slug ? (
        // Zwei gestapelte Frames: offen (Basis) + geschlossen (Overlay).
        // idle → Overlay blinzelt per Keyframe; explicit → Overlay-Opacity per
        // State mit weichem Crossfade (Aufwachen/Einschlafen).
        <span style={{ position: 'relative', width: fillPct, height: fillPct, display: 'block' }}>
          {/* @keyframes qqCozy3dBlink ist global in main.css (kein per-Instanz-<style>). */}
          <img
            src={src}
            alt={title}
            onError={() => setFailed(true)}
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'contain', filter: imgFilter, display: 'block' }}
          />
          <img
            src={cozy3dBlinkSrc(slug)}
            alt=""
            aria-hidden="true"
            onError={() => setBlinkFailed(true)}
            draggable={false}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'contain', filter: imgFilter,
              ...(explicit
                // State-gesteuert: zu = Overlay sichtbar, auf = unsichtbar; weicher Crossfade.
                ? { opacity: eyes === 'closed' ? 1 : 0, transition: 'opacity 0.3s ease' }
                // Idle-Blinzeln: awake = schneller (Event-Reaktion), sonst ruhig.
                : { opacity: 0, animation: `qqCozy3dBlink ${awake ? '1s' : '5.4s'} ease-in-out ${blinkDelay}s infinite` }),
            }}
          />
        </span>
      ) : (
        <img
          src={src}
          alt={title}
          onError={() => setFailed(true)}
          draggable={false}
          style={{ width: fillPct, height: fillPct, objectFit: 'contain', filter: imgFilter }}
        />
      )}
    </span>
  );
}

// ─── Cozy-Arena-Wappen-Avatar ─────────────────────────────────────────────
// Zwei Modi:
//   • normal (nicht-flat): das VOLLE Wappen-PNG (Schild + Farbe + Emblem
//     komplett gebacken). KEINE Farb-Disc dahinter — das Wappen bringt seine
//     eigene Form + Farbe mit. Füllt ~100 % (die PNG-Ränder liefern Padding).
//   • flat (Grid-Cells / Kontext trägt schon die Fraktions-Farbe): nur das
//     freigestellte cremefarbene EMBLEM (ohne Schild) mittig auf transparent —
//     die Zelle liefert die Farbe. Emblem ~76 %, damit Rand bleibt.
function CrestAvatar({
  slug, src, color, size, baseStyle, className, title, square, flat,
}: {
  slug: string; src: string; color: string; size: number | string;
  baseStyle: CSSProperties; className?: string; title: string; square?: boolean; flat?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  void color;
  const imgSrc = flat ? crestEmblemSrc(slug) : src;
  const fillPct = flat ? '76%' : '100%';
  const imgFilter = flat
    ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))'
    : 'drop-shadow(0 3px 5px rgba(0,0,0,0.28))';
  return (
    <span
      className={className}
      title={title}
      style={{
        ...baseStyle,
        background: 'transparent',
        boxShadow: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        borderRadius: square ? 0 : '50%',
      }}
    >
      {failed ? (
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '60%', lineHeight: 1 }}>●</span>
      ) : (
        <img
          src={imgSrc}
          alt={title}
          onError={() => setFailed(true)}
          draggable={false}
          style={{ width: fillPct, height: fillPct, objectFit: 'contain', filter: imgFilter }}
        />
      )}
    </span>
  );
}

function EmojiAvatar({
  emoji, color, size, baseStyle, className, title, square, flat,
}: {
  emoji: string; color: string; size: number | string;
  baseStyle: CSSProperties; className?: string; title: string; square?: boolean; flat?: boolean;
}) {
  // CSS-calc() bei String-Sizes (clamp/vw), Math bei Numbers — sonst skaliert
  // das Emoji nicht mit der Disc.
  const emojiFontSize = typeof size === 'number'
    ? Math.max(10, Math.round(size * 0.6))
    : `calc(${size} * 0.6)`;

  // Flat-Mode: kein BG / kein Glow / kein Inset — nur das Emoji-Glyph.
  // Genutzt z.B. auf Beamer-Grid-Cells, wo die Cell selbst schon Slot-Farbe
  // traegt und die Disc visuell redundant ist.
  const flatStyle: CSSProperties = flat
    ? { background: 'transparent', boxShadow: 'none' }
    : {
        background: `
          radial-gradient(circle at 50% 58%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 58%),
          radial-gradient(circle at 32% 30%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 45%),
          ${color}
        `,
        boxShadow: `0 4px 14px ${color}55, inset 0 -10% 18% rgba(0,0,0,0.28)`,
      };

  return (
    <span
      className={className}
      title={title}
      style={{
        ...baseStyle,
        ...flatStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: emojiFontSize,
        lineHeight: 1,
        userSelect: 'none',
        borderRadius: square ? 0 : '50%',
      }}
    >
      <span style={{
        // Drop-Shadow nur am Emoji-Glyph, fuer Tiefe + Lesbarkeit auf farbigem Grund
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55)) drop-shadow(0 0 1px rgba(0,0,0,0.5))',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {isCountryFlagGlyph(emoji) ? (
          // 2026-05-07 (Wolf-Bug Edge zeigt Flag-Codepoints als Buchstaben):
          // Country-Flag als Twemoji-Image rendern. Aspect 4:3, mittig in der
          // Disc (NICHT round-fill — handpolished countryflags.com-3D-Look
          // ist mit Twemoji-SVG + CSS-Overlay nicht reproduzierbar, lieber
          // ehrlicher flat-Look in der Disc).
          // 2026-05-07 v2 (Wolf 'flaggen auf dem grid groesser'): im flat-Mode
          // (Grid-Cells, Card-BG) hat die Disc keinen sichtbaren Rand, also
          // darf die Flagge mehr Platz einnehmen. 1.5em / 1.125em fuellt etwa
          // 90 % × 67 % der Cell-Disc, in der gedraengten Disc bleibts bei
          // 1em / 0.75em damit der Goldring darum sichtbar bleibt.
          <img
            src={getCountryFlagUrl(emoji)}
            alt={emoji}
            draggable={false}
            style={{
              width: flat ? '1.5em' : '1em',
              height: flat ? '1.125em' : '0.75em',
              objectFit: 'contain',
            }}
          />
        ) : emoji}
      </span>
    </span>
  );
}
