import { useMemo, useState, type CSSProperties } from 'react';
import { qqGetAvatar } from '@shared/quarterQuizTypes';

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
  /** Blinzel-Animation (default: true). Bei winzigen Sizes lohnt sich's nicht. */
  blink?: boolean;
};

/**
 * Team-Badge (Canva-Avatar). Lädt avatar-{slug}.png (offene Augen) und
 * blendet avatar-{slug}-closed.png (geschlossene Augen) in Intervallen kurz
 * drüber → sanfte Blinzel-Animation. Jede Instanz bekommt einen zufälligen
 * Delay, damit 8 Teams nicht im Chor zwinkern.
 *
 * Fallback bei Lade-Fehler: Emoji-Glyph in farbigem Kreis (alte Optik).
 */
export function QQTeamAvatar({ avatarId, size, style, className, title, square, lang, blink = true }: Props) {
  const av = qqGetAvatar(avatarId);
  const [failed, setFailed] = useState(false);
  const labelText = lang === 'en' ? av.labelEn : av.label;

  // Zufälliger Delay pro Mount-Instanz → 8 Avatare blinzeln asynchron.
  // 5.2s Zyklus, Augen ~160ms zu — delay 0..5.2s verteilt gleichmäßig.
  const blinkDelay = useMemo(() => -Math.random() * 5.2, []);

  const base: CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    display: 'block',
    borderRadius: square ? 0 : '50%',
    ...style,
  };

  if (failed) {
    return (
      <span
        className={className}
        title={title ?? labelText}
        style={{
          ...base,
          background: av.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: typeof size === 'number' ? Math.round(size * 0.62) : '60%',
          lineHeight: 1,
        }}
      >
        {av.emoji}
      </span>
    );
  }

  if (!blink) {
    return (
      <img
        src={av.image}
        alt={labelText}
        title={title ?? labelText}
        className={className}
        onError={() => setFailed(true)}
        style={base}
        draggable={false}
      />
    );
  }

  // Blink-Variante: zwei Bilder gestackt, closed-Layer mit Keyframe-Opacity.
  // Der Wrapper übernimmt die (möglicherweise animierten) Outer-Styles; die
  // Bilder füllen den Wrapper 1:1.
  const inner: CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    borderRadius: square ? 0 : '50%',
    display: 'block', pointerEvents: 'none',
  };

  return (
    <span
      className={className}
      title={title ?? labelText}
      style={{ ...base, position: 'relative', overflow: 'hidden' }}
    >
      <style>{`
        @keyframes qqAvatarBlink {
          0%, 94%, 100% { opacity: 0; }
          96%, 98%      { opacity: 1; }
        }
      `}</style>
      <img
        src={av.image}
        alt={labelText}
        onError={() => setFailed(true)}
        style={inner}
        draggable={false}
      />
      <img
        src={av.imageClosed}
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
