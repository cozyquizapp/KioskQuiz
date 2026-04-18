import { useState, type CSSProperties } from 'react';
import { qqGetAvatar } from '@shared/quarterQuizTypes';

type Props = {
  avatarId: string;
  size: number | string;          // px-Zahl ODER beliebiger CSS-Wert (clamp(...), %, …)
  style?: CSSProperties;
  className?: string;
  title?: string;
  /** wenn true → kein border-radius (PNG ist eh rund, aber manche Wrapper wollen quadratisch). */
  square?: boolean;
};

/**
 * Team-Badge im CozyWolf-Stil. Lädt /avatars/cozy-cast/avatar-{slug}-wolf.png
 * (2000×2000 PNG mit schwarzem Innenkreis + farbigem Ring + Charakter, baked-in).
 *
 * Fallback bei Lade-Fehler: Emoji-Glyph in einem farbigen Kreis (alte Optik).
 */
export function QQTeamAvatar({ avatarId, size, style, className, title, square }: Props) {
  const av = qqGetAvatar(avatarId);
  const [failed, setFailed] = useState(false);

  const base: CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    display: 'block',
    borderRadius: square ? 0 : '50%',
    ...style,
  };

  if (failed) {
    // Emoji-Fallback in farbigem Kreis (matcht Pre-Wolf-Optik)
    return (
      <span
        className={className}
        title={title ?? av.label}
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

  return (
    <img
      src={av.image}
      alt={av.label}
      title={title ?? av.label}
      className={className}
      onError={() => setFailed(true)}
      style={base}
      draggable={false}
    />
  );
}
