import { useMemo, useState, type CSSProperties } from 'react';
import { getAvatarDisplay } from '../avatarSets';
import { useAvatarSet } from '../avatarSetContext';

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
  const ctxSet = useAvatarSet();
  const setId = avatarSetId ?? ctxSet;
  const display = getAvatarDisplay(avatarId, setId);

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
  // Emoji-Schriftgroesse ~62% des Avatars, mit Floor fuer winzige Sizes.
  const emojiSize = typeof size === 'number'
    ? Math.max(10, Math.round(size * 0.62))
    : '62%';

  return (
    <span
      className={className}
      title={title}
      style={{
        ...baseStyle,
        // Glow-Disc: radial-gradient als 3D-Hint (oben-links heller)
        background: `radial-gradient(circle at 35% 35%, ${color}cc 0%, ${color} 70%)`,
        // Inset-Schatten unten als Tiefe
        boxShadow: `0 0 0 1px ${color}55, inset 0 -6% 12% rgba(0,0,0,0.28)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: emojiSize,
        lineHeight: 1,
        userSelect: 'none',
        // bei square=true keinen Border-Radius
        borderRadius: square ? 0 : '50%',
      }}
    >
      {emoji}
    </span>
  );
}
