// Kleine Live-Vorschau einer QQFrage im Beamer-Stil — passt sich dem aktuell
// bearbeiteten Slot an. Keine Animation, kein Sound — nur visuelle Orientierung:
// wie sieht die Frage ungefähr auf dem großen Bildschirm aus.
//
// Absichtlich eigenständig (nicht QQBuiltinSlide wiederverwendet, da der
// Cozy60-Pfad TS-Errors hat und nicht angefasst werden soll).

import type { QQQuestion } from '../../../shared/quarterQuizTypes';
import { QQ_CATEGORY_COLORS, QQ_CATEGORY_LABELS } from '../../../shared/quarterQuizTypes';

export function QQMiniPreview({ question: q }: { question: QQQuestion }) {
  const catColor = QQ_CATEGORY_COLORS[q.category];
  const catLabel = QQ_CATEGORY_LABELS[q.category];
  const img = q.image;

  // CHEESE: Vollbild-Hintergrund mit Crop, wie auf dem Beamer
  const isCheese = q.category === 'CHEESE';
  const posX = 50 + (img?.offsetX ?? 0) / 2; // -100..100 → 0..100
  const posY = 50 + (img?.offsetY ?? 0) / 2;
  const zoom = Math.max(1, img?.scale ?? 1);

  return (
    <div style={{
      width: '100%', aspectRatio: '16/9', borderRadius: 10,
      border: `2px solid ${catColor}55`,
      background: '#0f172a',
      overflow: 'hidden', position: 'relative',
      boxShadow: `0 4px 14px rgba(0,0,0,0.35)`,
    }}>
      {/* CHEESE background */}
      {isCheese && img?.url && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${img.bgRemovedUrl || img.url})`,
          backgroundSize: 'cover',
          backgroundPosition: `${posX}% ${posY}%`,
          transform: `scale(${zoom})`,
          transformOrigin: `${posX}% ${posY}%`,
        }} />
      )}

      {/* Non-cheese image (klein, oben) */}
      {!isCheese && img?.url && (
        <div style={{
          position: 'absolute', top: 8, left: 0, right: 0,
          height: '38%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src={img.bgRemovedUrl || img.url} alt=""
            style={{
              maxHeight: '100%', maxWidth: '70%', objectFit: 'contain',
              transform: `translate(${(img.offsetX ?? 0) * 0.3}%, ${(img.offsetY ?? 0) * 0.3}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`,
            }} />
        </div>
      )}

      {/* Category badge */}
      <div style={{
        position: 'absolute', top: 6, left: 6,
        padding: '2px 8px', borderRadius: 10,
        background: catColor + 'cc', color: '#fff',
        fontSize: 9, fontWeight: 900, letterSpacing: 0.3,
      }}>
        {catLabel.emoji} {catLabel.de.toUpperCase()}
      </div>

      {/* Phase/Slot-Marker */}
      <div style={{
        position: 'absolute', top: 6, right: 6,
        padding: '2px 7px', borderRadius: 8,
        background: 'rgba(0,0,0,0.55)', color: '#e2e8f0',
        fontSize: 9, fontWeight: 800,
      }}>
        P{q.phaseIndex} · {q.questionIndexInPhase + 1}
      </div>

      {/* Frage-Card unten — bei CHEESE semi-transparent, sonst solid */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: isCheese ? '10px 12px' : '8px 12px 10px',
        background: isCheese ? 'rgba(15,23,42,0.78)' : 'transparent',
        backdropFilter: isCheese ? 'blur(2px)' : 'none',
        minHeight: isCheese ? '32%' : undefined,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 4,
      }}>
        <div style={{
          fontSize: 13, fontWeight: 900, color: '#f8fafc', lineHeight: 1.25,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', textShadow: isCheese ? '0 1px 3px rgba(0,0,0,0.6)' : 'none',
        }}>
          {q.text || <span style={{ color: '#475569', fontStyle: 'italic' }}>(kein Fragetext)</span>}
        </div>

        {/* Options (MUCHO / 10v10) */}
        {q.options && q.options.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: q.options.length === 3 ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
            gap: 4, marginTop: 4,
          }}>
            {q.options.map((opt, i) => {
              const correct = i === q.correctOptionIndex;
              return (
                <div key={i} style={{
                  fontSize: 9, fontWeight: 800, padding: '3px 5px', borderRadius: 4,
                  background: correct ? '#22C55E33' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${correct ? '#22C55E' : 'rgba(255,255,255,0.12)'}`,
                  color: correct ? '#86efac' : '#cbd5e1',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {String.fromCharCode(65 + i)}: {opt || '—'}
                </div>
              );
            })}
          </div>
        )}

        {/* SCHAETZCHEN: Zielwert */}
        {q.category === 'SCHAETZCHEN' && q.targetValue != null && (
          <div style={{ fontSize: 10, color: '#86efac', fontWeight: 800, marginTop: 2 }}>
            🎯 {q.targetValue.toLocaleString('de-DE')}{q.unit ? ` ${q.unit}` : ''}
          </div>
        )}

        {/* Plain answer (z.B. CHEESE / offene BUNTE_TUETE) */}
        {!q.options && q.answer && q.category !== 'SCHAETZCHEN' && (
          <div style={{ fontSize: 10, color: '#86efac', fontWeight: 800, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ✓ {q.answer}
          </div>
        )}

        {/* 4 gewinnt / Only Connect: 4 Hinweise + Antwort */}
        {q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'onlyConnect' && (() => {
          const oc = q.bunteTuete;
          const hints = (oc.hints ?? []).slice(0, 4);
          const hintColors = ['#FBBF24', '#22C55E', '#60A5FA', '#A78BFA'];
          return (
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{
                fontSize: 9, fontWeight: 900, color: '#A78BFA',
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 1,
              }}>🧩 4 Hinweise</div>
              {[0, 1, 2, 3].map(i => {
                const h = hints[i];
                const col = hintColors[i];
                return (
                  <div key={i} style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 4,
                    background: h ? `${col}1a` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${h ? `${col}66` : 'rgba(255,255,255,0.08)'}`,
                    color: h ? '#e2e8f0' : '#475569',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontWeight: 700,
                  }}>
                    <span style={{ color: col, fontWeight: 900, marginRight: 4 }}>H{i + 1}</span>
                    {h || <span style={{ fontStyle: 'italic' }}>—</span>}
                  </div>
                );
              })}
              {oc.answer && (
                <div style={{
                  fontSize: 10, fontWeight: 900, color: '#86efac', marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>✓ {oc.answer}</div>
              )}
            </div>
          );
        })()}

        {/* Bluff: echte Antwort + Bluff-Badge */}
        {q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'bluff' && (() => {
          const bf = q.bunteTuete;
          return (
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{
                fontSize: 9, fontWeight: 900, color: '#F472B6',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>🎭 Bluff · echte Antwort</div>
              <div style={{
                fontSize: 11, fontWeight: 900, color: '#86efac',
                padding: '3px 8px', borderRadius: 4,
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.4)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                ✓ {bf.realAnswer || <span style={{ color: '#475569', fontStyle: 'italic' }}>(noch keine Antwort)</span>}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
