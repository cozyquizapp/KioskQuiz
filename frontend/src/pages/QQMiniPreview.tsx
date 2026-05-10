// 2026-05-11 (Wolf-Feedback 'die Vorschau zeigt random irgendwas, raus oder
// echt-matchen'): komplett umgebaut. Bisher rendete der Mini-Preview eine
// generische 'wie's vielleicht aussehen könnte'-Card, die mit dem echten
// Beamer-Render NICHT matched. Jetzt:
//
// - Für NICHT-CHEESE-Fragen: gar nichts (Komponente returnt null). Der
//   Wrapper MiniPreviewPanel rendert nichts wenn diese Komponente null
//   liefert → keine irreführende Vorschau mehr.
// - Für CHEESE-Fragen: zwei kleine 16:9-Frames nebeneinander zeigen die
//   beiden tatsächlichen Beamer-Layouts (Horizontal + Hochkant) und
//   rendern das Bild mit den aktuellen Position/Zoom-Settings. Der vom
//   Wolf gewählte Layout-Frame hat Pink-Border + Highlight, der andere
//   ist nur Referenz.
//
// Damit: Wolf positioniert/zoomt im Canvas und sieht beide Beamer-Frames
// live updaten. Kein 'random'-Element mehr.

import type { QQQuestion } from '../../../shared/quarterQuizTypes';

const COZY_PINK = '#EC4899';

export function QQMiniPreview({ question: q }: { question: QQQuestion }) {
  // Nicht-CHEESE: kein Preview. Der Wrapper-Panel oben schließt sich
  // automatisch wenn diese Komponente null returnt.
  if (q.category !== 'CHEESE') return null;
  const img = q.image;
  if (!img?.url) {
    return (
      <div style={{
        padding: '12px 14px', borderRadius: 10,
        background: 'rgba(139,92,246,0.06)', border: '1px dashed rgba(139,92,246,0.3)',
        fontSize: 11, color: '#94A3B8', textAlign: 'center',
      }}>
        Noch kein Bild — Vorschau erscheint nach Upload.
      </div>
    );
  }

  const chosenLayout = img.cheeseLayout; // 'landscape' | 'portrait' | undefined
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: '#94A3B8',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        🎬 Beamer-Vorschau
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <BeamerFrame
          label="Horizontal"
          emoji="🖼️"
          mode="landscape"
          img={img}
          questionText={q.text}
          active={chosenLayout === 'landscape'}
        />
        <BeamerFrame
          label="Hochkant"
          emoji="📱"
          mode="portrait"
          img={img}
          questionText={q.text}
          active={chosenLayout === 'portrait'}
        />
      </div>
      {!chosenLayout && (
        <div style={{ fontSize: 10, color: '#FCD34D', fontWeight: 700, textAlign: 'center' }}>
          ⚠️ Layout oben noch nicht gewählt — Beamer rät nach Bild-Größe.
        </div>
      )}
    </div>
  );
}

// Ein einzelner 16:9-Frame der das Beamer-Layout maßstabsgetreu zeigt.
function BeamerFrame({
  label, emoji, mode, img, questionText, active,
}: {
  label: string;
  emoji: string;
  mode: 'landscape' | 'portrait';
  img: NonNullable<QQQuestion['image']>;
  questionText?: string;
  active: boolean;
}) {
  // Render-Variablen aus aktuellen Bild-Settings (live-Update beim Drag im Canvas).
  const posX = 50 + (img.offsetX ?? 0) / 2;
  const posY = 50 + (img.offsetY ?? 0) / 2;
  const zoom = Math.max(1, img.scale ?? 1);
  const isPortrait = mode === 'portrait';
  // Bild-Filter aus Bild-Settings übernehmen (Brightness/Contrast/Blur/Opacity).
  const filter = [
    (img.brightness != null && img.brightness !== 100) ? `brightness(${img.brightness}%)` : '',
    (img.contrast != null && img.contrast !== 100) ? `contrast(${img.contrast}%)` : '',
    (img.blur != null && img.blur > 0) ? `blur(${img.blur}px)` : '',
  ].filter(Boolean).join(' ') || undefined;
  const opacity = img.opacity != null && img.opacity < 1 ? img.opacity : undefined;
  return (
    <div>
      <div style={{
        fontSize: 9, fontWeight: 900,
        color: active ? COZY_PINK : '#475569',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: 4,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <span>{emoji}</span><span>{label}</span>
        {active && <span style={{ marginLeft: 'auto', fontSize: 9 }}>✓ aktiv</span>}
      </div>
      <div style={{
        width: '100%', aspectRatio: '16/9', borderRadius: 8,
        border: active ? `2px solid ${COZY_PINK}` : '1px solid rgba(255,255,255,0.10)',
        boxShadow: active ? `0 0 16px ${COZY_PINK}55` : 'none',
        background: '#0f172a',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* Image-Layer — bei Landscape fullscreen, bei Portrait linke Hälfte */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: 0,
          width: isPortrait ? '50%' : '100%',
          backgroundImage: `url(${img.bgRemovedUrl || img.url})`,
          backgroundSize: 'cover',
          backgroundPosition: `${posX}% ${posY}%`,
          transform: `scale(${zoom})${img.rotation ? ` rotate(${img.rotation}deg)` : ''}`,
          transformOrigin: `${posX}% ${posY}%`,
          filter,
          opacity,
        }} />
        {/* Card-Layer — bei Landscape unten 32% Hoehe, bei Portrait rechts 50% Breite */}
        <div style={{
          position: 'absolute',
          ...(isPortrait
            ? { top: 0, right: 0, bottom: 0, width: '50%' }
            : { left: 0, right: 0, bottom: 0, height: '36%' }),
          background: 'rgba(15,23,42,0.78)',
          backdropFilter: 'blur(2px)',
          padding: 6,
          display: 'flex', flexDirection: 'column',
          justifyContent: isPortrait ? 'center' : 'flex-end',
          alignItems: isPortrait ? 'center' : 'flex-start',
        }}>
          <div style={{
            fontSize: 9, fontWeight: 900, color: '#F8FAFC', lineHeight: 1.2,
            textAlign: isPortrait ? 'center' : 'left',
            display: '-webkit-box',
            WebkitLineClamp: isPortrait ? 5 : 3, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
          }}>
            {questionText || <span style={{ color: '#475569', fontStyle: 'italic' }}>(kein Fragetext)</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
