// 2026-05-04 — TeamNameLabel
// Zentrale Render-Komponente fuer Team-Namen, ersetzt die alte
// `truncName(name, n)`-Hard-String-Truncation und vermeidet harte
// `whiteSpace: nowrap + textOverflow: ellipsis` an vielen Stellen.
//
// Verhalten:
//   - 1 oder 2 Zeilen Text mit CSS-Multi-Line-Ellipsis (-webkit-line-clamp)
//   - Auto-Schrift-Verkleinerung wenn Name lang
//   - Optional „Team "-Prefix fuer Tabellen-Kontexte (via teamDisplayName)
//   - Custom Style + Title (Hover-Tooltip mit vollem Namen) als Standard
//
// Beispiel:
//   <TeamNameLabel name="Schon Wieder Falsch" maxLines={2}
//     fontSize="clamp(20px,2.1vw,30px)" color={team.color} fontWeight={900} />

import type { CSSProperties } from 'react';
import { teamDisplayName } from '../../../shared/quarterQuizTypes';

type Props = {
  name: string;
  /** Max sichtbare Zeilen, Rest wird mit „…" abgeschnitten. Default 2. */
  maxLines?: number;
  /** „Team "-Prefix prepended (Tabellen-Kontext). Default false. */
  withTeamPrefix?: boolean;
  /** Standard-Schriftgroesse als CSS-Wert (z.B. clamp(...) oder px). */
  fontSize?: string | number;
  /** Schriftgroesse fuer lange Namen (>= shrinkAfter Zeichen). Wenn nicht
   *  gesetzt, wird ~85% von fontSize via calc() genommen. */
  fontSizeLong?: string | number;
  /** Ab wieviel Zeichen gilt der Name als „lang". Default 16. */
  shrinkAfter?: number;
  /** Farbe (Slot- oder Team-Farbe). */
  color?: string;
  fontWeight?: number;
  /** Wenn true: Title-Attribut mit vollem Namen (Hover-Tooltip auf Desktop). */
  title?: boolean;
  /** Mergen weiterer Styles (z.B. textShadow, letterSpacing). */
  style?: CSSProperties;
  className?: string;
};

export function TeamNameLabel({
  name,
  maxLines = 2,
  withTeamPrefix = false,
  fontSize,
  fontSizeLong,
  shrinkAfter = 16,
  color,
  fontWeight,
  title = true,
  style,
  className,
}: Props) {
  const display = teamDisplayName(name, withTeamPrefix);
  const isLong = display.length > shrinkAfter;

  // fontSizeLong default = 85% des fontSize; bei String-Werten via calc()
  const finalFontSize = (() => {
    if (!isLong) return fontSize;
    if (fontSizeLong != null) return fontSizeLong;
    if (fontSize == null) return undefined;
    return typeof fontSize === 'number'
      ? Math.max(10, Math.round(fontSize * 0.85))
      : `calc(${fontSize} * 0.85)`;
  })();

  const merged: CSSProperties = {
    fontSize: finalFontSize,
    color,
    fontWeight,
    lineHeight: 1.15,
    // Multi-Line-Ellipsis (Browser-Standard via WebKit, funktioniert ueberall
    // ausser sehr alten Firefoxen — fuer unsere Use-Cases unkritisch).
    display: '-webkit-box',
    WebkitLineClamp: maxLines,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    wordBreak: 'break-word',
    // Bei maxLines === 1 zusaetzlich klassisches Truncate (browser-fallback).
    ...(maxLines === 1 ? {
      whiteSpace: 'nowrap' as const,
      textOverflow: 'ellipsis' as const,
    } : {}),
    ...style,
  };

  return (
    <span className={className} style={merged} title={title ? display : undefined}>
      {display}
    </span>
  );
}
