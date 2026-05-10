import { useMemo, useState, type CSSProperties } from 'react';
import { getAvatarDisplay } from '../avatarSets';
import { useAvatarSetCtx } from '../avatarSetContext';

type Props = {
  avatarId: string;
  size: number | string;          // px-Zahl ODER beliebiger CSS-Wert (clamp(...), %, …)
  style?: CSSProperties;
  className?: string;
  title?: string;
  /** wenn true → kein border-radius (PNG ist eh rund, aber manche Wrapper wollen quadratisch). */
  square?: boolean;
  /** Sprache für automatisch generierte title/alt-Texte (Tier-Name). */
  lang?: 'de' | 'en';
  /** Blinzel-Animation bei PNG-Modus (default: true). */
  blink?: boolean;
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
  avatarId, size, style, className, title, square, lang, blink = true, avatarSetId, teamEmoji, flat, bgColor,
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
      <style>{`
        @keyframes qqAvatarBlink {
          0%, 94%, 100% { opacity: 0; }
          96%, 98%      { opacity: 1; }
        }
      `}</style>
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
