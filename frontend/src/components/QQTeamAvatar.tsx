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
   * Faellt auf 'all' (Default-Emoji-Look) zurueck wenn kein Provider da ist.
   */
  avatarSetId?: string;
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
  avatarId, size, style, className, title, square, lang, blink = true, avatarSetId,
}: Props) {
  const ctx = useAvatarSetCtx();
  const setId = avatarSetId ?? ctx.id;
  // serverEmojis nur ehrlich verwenden wenn das Set passt — bei explizitem
  // Override (z.B. cozyCast) ignorieren wir die Server-Emojis.
  const serverEmojis = (avatarSetId == null || avatarSetId === ctx.id) ? ctx.emojis : undefined;
  const display = getAvatarDisplay(avatarId, setId, serverEmojis);

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
        color={display.color}
        size={size}
        baseStyle={base}
        className={className}
        title={labelText}
        square={square}
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
function EmojiAvatar({
  emoji, color, size, baseStyle, className, title, square,
}: {
  emoji: string; color: string; size: number | string;
  baseStyle: CSSProperties; className?: string; title: string; square?: boolean;
}) {
  // CSS-calc() bei String-Sizes (clamp/vw), Math bei Numbers — sonst skaliert
  // das Emoji nicht mit der Disc.
  const emojiFontSize = typeof size === 'number'
    ? Math.max(10, Math.round(size * 0.6))
    : `calc(${size} * 0.6)`;

  return (
    <span
      className={className}
      title={title}
      style={{
        ...baseStyle,
        // Single-Layer-Disc mit drei gestackten Backgrounds:
        //   1. dezente dunkle Vignette in der Mitte (Kontrast fuer Emoji)
        //   2. Highlight-Spot oben-links (3D-Hint)
        //   3. Slot-Farbe als Basis
        // → kein zweiter Inner-Kreis mehr, kein Sticker-Effekt.
        background: `
          radial-gradient(circle at 50% 58%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 58%),
          radial-gradient(circle at 32% 30%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 45%),
          ${color}
        `,
        // Aussen schmaler dunkler Slot-Farb-Ring + Halo, innen subtiler Tiefen-Inset
        boxShadow: `0 0 0 1.5px rgba(0,0,0,0.35), 0 4px 14px ${color}55, inset 0 -10% 18% rgba(0,0,0,0.28)`,
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
      }}>
        {emoji}
      </span>
    </span>
  );
}
