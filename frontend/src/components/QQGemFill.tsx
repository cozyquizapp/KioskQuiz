// QQGemFill — gefuellter Kolosseum-Diamant (Gem) fuer "x von n richtig" in der
// Arena (Wolf 2026-07-18, bild 10). Einheitliche Ansicht statt Text-"2/3 correct"
// bzw. der alten Punkte-Dots: ein kleiner Diamant, der sich von UNTEN in der
// uebergebenen Farbe fuellt (Anteil correct/total). Feste Groesse -> passt auch
// unter 8 Fraktionen; die Fuell-Helligkeit gibt aus der Ferne einen groben Read.
// Wird an allen Arena-Stellen mit "x/y richtig pro Fraktion" verwendet.
import React from 'react';

const QQ_GEM_DIAMOND = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

export function QQGemFill({ correct, total, color, size }: { correct: number; total: number; color: string; size: string }) {
  const pct = Math.max(0, Math.min(1, correct / Math.max(1, total)));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Facetten-Kante in der jeweiligen Farbe */}
      <div style={{ position: 'absolute', inset: 0, clipPath: QQ_GEM_DIAMOND, background: `linear-gradient(180deg, ${color} 0%, ${color}aa 60%, ${color}dd 100%)` }} />
      {/* Dunkler Gem-Kern; Fuellung steigt von unten (auf Diamant geclippt) */}
      <div style={{ position: 'absolute', inset: 2, clipPath: QQ_GEM_DIAMOND, background: 'rgba(12,9,22,0.9)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${pct * 100}%`, background: `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)`, boxShadow: `0 0 10px ${color}` }} />
        {/* oberer Glanz */}
        <div style={{ position: 'absolute', top: '12%', left: '30%', width: '26%', height: '10%', background: 'rgba(255,255,255,0.5)', filter: 'blur(1px)', borderRadius: '50%', transform: 'rotate(-20deg)' }} />
      </div>
    </div>
  );
}
