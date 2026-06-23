// 2026-06-23 — Skin-Deko-Ebene: rendert pro aktivem Skin die charakteristische
// Deko (Sterne / Konfetti / …) als absolutes Overlay über der ganzen Fläche.
// Layout-neutral: position:absolute, pointer-events:none, stört kein Element.
// Nur bei aktivem Skin (nicht Cozy). Macht einen grossen Teil des „sieht aus
// wie das /skins-Mockup"-Eindrucks aus.
import { useActiveThemeId } from '../qqTheme';

const STAR = 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)';

export function SkinDeco() {
  const id = useActiveThemeId();

  if (id === 'neoBrutal') {
    const pts: [string, string, string, number][] = [
      ['6%', '14%', '#FDE047', 42], ['92%', '10%', '#FB7185', 32],
      ['89%', '74%', '#FDE047', 36], ['8%', '78%', '#34D399', 30],
      ['50%', '6%', '#FFFFFF', 22],
    ];
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {pts.map(([x, y, c, s], i) => (
          <div key={i} style={{
            position: 'absolute', left: x, top: y, width: s, height: s,
            background: c, clipPath: STAR,
            filter: 'drop-shadow(3px 3px 0 #16121F)',
            animation: `skinFloat ${3 + (i % 3)}s ease-in-out ${i * 0.3}s infinite`,
          }} />
        ))}
        <style>{`@keyframes skinFloat { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(8deg); } }`}</style>
      </div>
    );
  }

  if (id === 'softPop') {
    const bits: [string, string, string][] = [
      ['7%', '18%', '#FBBF24'], ['93%', '13%', '#F472A0'], ['90%', '72%', '#34D399'],
      ['9%', '76%', '#60A5FA'], ['48%', '8%', '#A78BFA'], ['80%', '40%', '#FBBF24'],
    ];
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {bits.map(([x, y, c], i) => (
          <div key={i} style={{
            position: 'absolute', left: x, top: y, width: 30, height: 12, borderRadius: 8,
            background: c, transform: `rotate(${i * 38}deg)`,
            animation: `skinFloat ${3.5 + (i % 3)}s ease-in-out ${i * 0.25}s infinite`,
          }} />
        ))}
        <style>{`@keyframes skinFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }`}</style>
      </div>
    );
  }

  // studioMono / cozy: keine Deko (Cozy hat eh seine Fireflies).
  return null;
}
