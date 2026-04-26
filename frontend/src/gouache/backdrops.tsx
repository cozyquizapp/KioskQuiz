// Wieder­verwendbare atmosphärische Hintergrund-Komponenten für alle
// Gouache-Pages (Lobby, Beamer, Spielende). Trennt Atmosphäre vom
// Layout, damit jede Page nur einen <GouacheNightSky /> mountet und
// sich auf den Inhalt konzentriert.

import { CSSProperties, ReactNode, useEffect, useState } from 'react';
import { PALETTE } from './tokens';
import {
  PaintedMist, PaintedStars, PaintedMoon, PaintedBird, PaintedHills,
} from './components';

// ─────────────────────────────────────────────────────────────────────────
// useViewportSize — vh/vw-basierte Pixel-Berechnung in JS für Components,
// die exakte Number-Größen brauchen (PaintedAvatar, SVG sizes, etc).
// ─────────────────────────────────────────────────────────────────────────
export function useViewportSize() {
  const [size, setSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1920,
    h: typeof window !== 'undefined' ? window.innerHeight : 1080,
  }));
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

// ─────────────────────────────────────────────────────────────────────────
// GouacheNightSky — atmosphärischer Aquarell-Nachthimmel mit:
//   - mehrlagigem PaintedMist (Pfirsich-Schimmer, Türkis-Tiefe, Lavendel-Schatten)
//   - Sternen
//   - Sichelmond rechts oben
//   - 3 fliegenden Vögeln
//   - Hügel-Silhouette unten
//   - Papier-Korn obendrauf (im PaintedMist enthalten)
//
// Auf dieser Backdrop wird der Page-Inhalt gerendert (Foreground).
// ─────────────────────────────────────────────────────────────────────────
export function GouacheNightSky({
  hills = true, moon = true, stars = 32, birds = true, children, mistWashes,
}: {
  hills?: boolean;
  moon?: boolean;
  stars?: number;
  birds?: boolean;
  children?: ReactNode;
  mistWashes?: Parameters<typeof PaintedMist>[0]['washes'];
}) {
  const defaultWashes = [
    { color: PALETTE.dusk,         cx: '50%', cy: '85%', r: '60%', opacity: 0.7 },
    { color: PALETTE.lavenderDusk, cx: '20%', cy: '55%', r: '45%', opacity: 0.35 },
    { color: PALETTE.mist,         cx: '78%', cy: '70%', r: '40%', opacity: 0.30 },
    { color: PALETTE.peach,        cx: '60%', cy: '12%', r: '35%', opacity: 0.18 },
  ];
  return (
    <>
      <PaintedMist baseColor={PALETTE.inkDeep} washes={mistWashes ?? defaultWashes} />
      {stars > 0 && <PaintedStars count={stars} />}
      {moon && (
        <div style={{
          position: 'absolute',
          top: 'clamp(20px, 3vh, 60px)',
          right: 'clamp(40px, 6vw, 120px)',
          zIndex: 2, pointerEvents: 'none',
        }}>
          <PaintedMoon size={64} />
        </div>
      )}
      {birds && (
        <>
          <PaintedBird x="14%" y="14%" size={24} />
          <PaintedBird x="62%" y="9%" size={20} />
          <PaintedBird x="86%" y="22%" size={22} />
        </>
      )}
      {hills && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          zIndex: 1, pointerEvents: 'none',
        }}>
          <PaintedHills width={2400} height={180} />
        </div>
      )}
      {children}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// GouacheDaySky — wärmerer Tag-Wash für Spielende/Sieger-Momente.
// Pfirsich-Sandhimmel oben, Salbei-Land unten, ohne Sterne/Mond/Hills.
// ─────────────────────────────────────────────────────────────────────────
export function GouacheDaySky({ children }: { children?: ReactNode }) {
  const washes = [
    { color: PALETTE.peach,        cx: '50%', cy: '15%', r: '60%', opacity: 0.85 },
    { color: PALETTE.peachWarm,    cx: '50%', cy: '40%', r: '50%', opacity: 0.55 },
    { color: PALETTE.sageLight,    cx: '50%', cy: '85%', r: '60%', opacity: 0.65 },
    { color: PALETTE.amberGlow,    cx: '70%', cy: '30%', r: '25%', opacity: 0.30 },
  ];
  return (
    <>
      <PaintedMist baseColor={PALETTE.peachWarm} washes={washes} />
      {children}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// GouachePageShell — Standard-Wrapper: full-viewport, overflow:hidden,
// Filter + Keyframes gemounted, Atmosphäre als Default-Backdrop.
// Inhalt wird darüber gerendert (zIndex: 5).
// ─────────────────────────────────────────────────────────────────────────
export function GouachePageShell({
  children, backdrop, padding, gap, style,
}: {
  children: ReactNode;
  backdrop?: ReactNode;
  padding?: string;
  gap?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{
      height: '100vh', width: '100vw',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      padding: padding ?? 'clamp(6px, 1.2vh, 18px) clamp(20px, 2.5vw, 48px)',
      gap: gap ?? 'clamp(6px, 1.2vh, 16px)',
      ...style,
    }}>
      {backdrop ?? <GouacheNightSky />}
      {children}
    </div>
  );
}
