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
  /** Harte Untergrenze als CSS-Laenge, z.B. '26px'. Das Schrumpfen hoert dort
   *  auf, egal wie lang der Name ist; danach umbricht oder kuerzt der Name.
   *  Siehe die Begruendung an `scale` weiter unten. */
  minFontSize?: string;
  /** Farbe (Slot- oder Team-Farbe). */
  color?: string;
  fontWeight?: number;
  /** Wenn true: Title-Attribut mit vollem Namen (Hover-Tooltip auf Desktop). */
  title?: boolean;
  /**
   * Wie viele Zeichen des laengsten Wortes passen in EINE Zeile der Spalte?
   * 2026-08-25: war eine feste 9 im Rumpf und damit fuer alle Ansichten
   * dieselbe Zahl, obwohl die Spalten verschieden breit sind. Wer eine
   * schmalere Spalte hat, setzt sie herunter - gemessen, nicht geraten.
   */
  laengstesWortPasst?: number;
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
  laengstesWortPasst = 9,
  minFontSize,
  color,
  fontWeight,
  title = true,
  style,
  className,
}: Props) {
  const display = teamDisplayName(name, withTeamPrefix);
  const isLong = display.length > shrinkAfter;

  // 2026-08-22 (Wolf: „namen duerfen nicht mit einem buchstaben in 2. zeile
  // umbrechen"): der erste Verdacht — der Umbruch-Modus — war nur die halbe
  // Wahrheit. Der echte Fall am Brett war "Pubquatscher": EIN Wort, 12 Zeichen,
  // das in keine Zeile der Spalte passt. Die alte Regel schrumpfte erst ab 14
  // Zeichen Gesamtlaenge, also griff sie nicht, und der Browser zerschnitt das
  // Wort zwangsweise zu "Pubquatsc" + "her".
  //
  // Zwei verschiedene Ursachen, zwei Ausloeser:
  //   Gesamtlaenge   → der Name braucht zwei Zeilen. Harmlos, "Wissens-Woelfe"
  //                    bricht sauber am Bindestrich.
  //   laengstes Wort → das Wort passt in KEINE Zeile. Das ist der Fall, der
  //                    mitten im Wort zerschneidet.
  // Wir schrumpfen genau so weit, wie der schlimmere der beiden es verlangt.
  const LONGEST_WORD_FIT = laengstesWortPasst;
  const longestWord = display.split(/[\s\-–—/]+/).reduce((m, w) => Math.max(m, w.length), 0);
  const overflow = Math.max(
    display.length / Math.max(1, shrinkAfter),
    longestWord / LONGEST_WORD_FIT,
  );
  // Nach unten gedeckelt: unter 62 % wird es auf 2,8 m Bildbreite unlesbar,
  // dann ist Abschneiden mit Ellipse die ehrlichere Loesung.
  //
  // 2026-08-24: 62 % sind eine RELATIVE Grenze, und die weiss nichts davon, wie
  // gross die Schrift vorher war. Auf dem Team-Auftritt stand die Grundgroesse
  // bei 28px - „Pubquatscher" landete damit gemessen bei 21px, „Halbwissen Gold
  // Wert" bei 22,4px, und die Grenze haette bis 17,4px runtergelassen. Der
  // Brief nennt rund 26px als kleinsten sinnvollen Grad. Eine Prozentgrenze
  // kann so eine Zusage gar nicht einhalten; dafuer braucht es eine Laenge.
  // `minFontSize` ist genau das, und es laeuft ueber CSS `max()`, damit es
  // auch mit einem clamp()-Ausdruck als Grundgroesse funktioniert.
  const scale = Math.max(0.62, Math.min(1, 1 / overflow));

  const finalFontSize = (() => {
    if (fontSizeLong != null && isLong) return fontSizeLong;
    if (fontSize == null) return undefined;
    const geschrumpft = scale >= 1
      ? fontSize
      : (typeof fontSize === 'number'
        ? Math.max(10, Math.round(fontSize * scale))
        : `calc(${fontSize} * ${scale.toFixed(3)})`);
    if (!minFontSize) return geschrumpft;
    return `max(${minFontSize}, ${typeof geschrumpft === 'number' ? `${geschrumpft}px` : geschrumpft})`;
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
    // 2026-08-22 (Wolf: „namen neben grid duerfen nicht mit einem buchstaben in
    // 2. zeile umbrechen"): `wordBreak: 'break-word'` war die Ursache. Das
    // erlaubt einen Umbruch MITTEN im Wort, also wurde aus "Allwisser" ein
    // "Allwisse" plus ein einsames "r" in Zeile zwei.
    //   overflowWrap  bricht nur dann in ein Wort hinein, wenn das Wort allein
    //                 schon breiter als die Zeile ist. Normale Namen bleiben
    //                 heil und brechen an der Leerstelle.
    //   textWrap      verteilt die Zeilen gleichmaessig statt die erste
    //                 vollzulaufen. Genau dagegen gebaut, dass ein Rest allein
    //                 in der letzten Zeile landet.
    overflowWrap: 'break-word',
    textWrap: 'balance',
    // Letztes Netz: wenn ein Name selbst nach dem Schrumpfen nicht passt, soll
    // er mit einem sichtbaren Trennstrich brechen statt stumm mitten im Wort.
    // <html lang="de"> ist gesetzt, also trennt der Browser nach deutschen
    // Silbenregeln — "Pub-quatscher" statt "Pubquatsc|her".
    hyphens: 'auto',
    WebkitHyphens: 'auto' as never,
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
