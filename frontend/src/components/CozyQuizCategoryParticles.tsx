/**
 * CozyQuizCategoryParticles — Subtile Drift-Partikel pro Quiz-Kategorie.
 *
 * Pro Kategorie ein Set kategorie-bezogener Glyphen (Zahlen, Buchstaben,
 * Emoji), die mit niedrigem Opacity langsam diagonal durch die Slide driften.
 * Nutzt dasselbe FF-Positions-Layout wie Fireflies (siehe CozyQuizAmbient).
 *
 * Sichtbar nur waehrend QUESTION_ACTIVE. Subliminal-Branding fuer die aktuelle
 * Kategorie ohne den Frage-Inhalt zu stoeren.
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-12 (Refactor Phase 1) —
 * 1 interner Importer (QuestionView).
 */
import { memo } from 'react';
import { FF } from './CozyQuizAmbient';

// 2026-05-09 (Wolf): MUCHO + ZvZ Drift-Partikel auf Emoji-Variants gehoben.
const CAT_PARTICLE_GLYPHS: Record<string, string[]> = {
  SCHAETZCHEN:   ['1', '2', '3', '?', '∞'],
  MUCHO:         ['A', 'B', 'C', 'D'],
  BUNTE_TUETE:   ['🎲', '🎁', '⭐'],
  ZEHN_VON_ZEHN: ['1', '2', '3', '⚡'],
  CHEESE:        ['📸', '🔍'],
};

export const CategoryParticles = memo(function CategoryParticles({
  category, color,
}: {
  category?: string;
  color?: string;
}) {
  const glyphs = category ? CAT_PARTICLE_GLYPHS[category] : undefined;
  if (!glyphs) return null;
  const c = color ?? '#FEF08A';
  return (
    <>
      {FF.slice(0, 10).map((f, i) => {
        const glyph = glyphs[i % glyphs.length];
        return (
          <div key={`${category}-${i}`} aria-hidden style={{
            position: 'absolute', pointerEvents: 'none', zIndex: 2,
            left: `${f.x}%`, top: `${f.y}%`,
            fontSize: 22, fontWeight: 900,
            color: c, opacity: 0.12,
            textShadow: `0 0 12px ${c}55`,
            ['--dx' as string]: `${f.dx}px`,
            ['--dy' as string]: `${f.dy}px`,
            ['--dur' as string]: `${f.dur * 1.5}s`,
            ['--del' as string]: `${f.del}s`,
            animation: `ffmove var(--dur,8s) ease-in-out var(--del,0s) infinite`,
            willChange: 'transform, opacity',
          }}>{glyph}</div>
        );
      })}
    </>
  );
});
