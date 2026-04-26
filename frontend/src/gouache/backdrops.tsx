// Wieder­verwendbare atmosphärische Hintergrund-Komponenten für alle
// Gouache-Pages (Lobby, Beamer, Spielende). Trennt Atmosphäre vom
// Layout, damit jede Page nur einen <GouacheNightSky /> mountet und
// sich auf den Inhalt konzentriert.

import { CSSProperties, ReactNode, useEffect, useState } from 'react';
import { PALETTE, CAT_PASTEL, CAT_DEEP, type QQCategoryKey } from './tokens';
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

// ─────────────────────────────────────────────────────────────────────────
// CategoryBackdrop — pro Kategorie eigener Aquarell-Wash. Direkte
// Übersetzung der Cozy-Quiz `CAT_BG` Stimmungen in Aquarell-Wäschen mit
// Cremepapier-Basis statt Schwarz. Bei `revealed=true` wird der Wash
// satter (Auflösungs-Stimmung).
//
// SCHAETZCHEN  → Honig-Pfirsich-Wiese (warm)
// MUCHO        → Stahl-Mittagblau über Mitternacht
// BUNTE_TUETE  → Korall-Erde mit Amber-Glow
// ZEHN_VON_ZEHN → Salbei-Wiese mit Pfirsich-Stich
// CHEESE       → Pflaumen-Lavendel-Träumerei
// ─────────────────────────────────────────────────────────────────────────

export function CategoryBackdrop({
  category, revealed = false,
}: { category: QQCategoryKey; revealed?: boolean }) {
  const pastel = CAT_PASTEL[category];
  const deep = CAT_DEEP[category];
  const palette: Record<QQCategoryKey, Parameters<typeof PaintedMist>[0]> = {
    SCHAETZCHEN: {
      baseColor: PALETTE.peach,
      washes: [
        { color: pastel,            cx: '20%', cy: '70%', r: '55%', opacity: revealed ? 0.55 : 0.40 },
        { color: PALETTE.amberGlow, cx: '78%', cy: '22%', r: '40%', opacity: revealed ? 0.50 : 0.32 },
        { color: PALETTE.peachWarm, cx: '50%', cy: '50%', r: '70%', opacity: revealed ? 0.45 : 0.30 },
        { color: deep,              cx: '15%', cy: '90%', r: '40%', opacity: 0.25 },
      ],
    },
    MUCHO: {
      baseColor: PALETTE.inkDeep,
      washes: [
        { color: pastel,            cx: '70%', cy: '30%', r: '55%', opacity: revealed ? 0.55 : 0.40 },
        { color: PALETTE.mist,      cx: '20%', cy: '78%', r: '50%', opacity: revealed ? 0.40 : 0.30 },
        { color: deep,              cx: '50%', cy: '95%', r: '60%', opacity: 0.65 },
        { color: PALETTE.peach,     cx: '60%', cy: '15%', r: '20%', opacity: revealed ? 0.30 : 0.18 },
      ],
    },
    BUNTE_TUETE: {
      baseColor: PALETTE.dusk,
      washes: [
        { color: pastel,            cx: '50%', cy: '55%', r: '60%', opacity: revealed ? 0.55 : 0.38 },
        { color: PALETTE.terracotta, cx: '14%', cy: '20%', r: '40%', opacity: revealed ? 0.45 : 0.28 },
        { color: PALETTE.amberGlow, cx: '85%', cy: '75%', r: '35%', opacity: revealed ? 0.40 : 0.25 },
        { color: deep,              cx: '50%', cy: '92%', r: '50%', opacity: 0.55 },
      ],
    },
    ZEHN_VON_ZEHN: {
      baseColor: PALETTE.dusk,
      washes: [
        { color: pastel,             cx: '30%', cy: '45%', r: '55%', opacity: revealed ? 0.55 : 0.40 },
        { color: PALETTE.sageLight,  cx: '75%', cy: '70%', r: '45%', opacity: revealed ? 0.45 : 0.32 },
        { color: PALETTE.peach,      cx: '60%', cy: '15%', r: '25%', opacity: 0.18 },
        { color: deep,               cx: '20%', cy: '88%', r: '50%', opacity: 0.45 },
      ],
    },
    CHEESE: {
      baseColor: PALETTE.inkDeep,
      washes: [
        { color: pastel,            cx: '30%', cy: '40%', r: '55%', opacity: revealed ? 0.55 : 0.38 },
        { color: PALETTE.lavenderDusk, cx: '78%', cy: '70%', r: '45%', opacity: revealed ? 0.45 : 0.30 },
        { color: PALETTE.amberGlow, cx: '85%', cy: '20%', r: '20%', opacity: revealed ? 0.30 : 0.18 },
        { color: deep,              cx: '50%', cy: '95%', r: '50%', opacity: 0.55 },
      ],
    },
  };
  const cfg = palette[category];
  return <PaintedMist baseColor={cfg.baseColor} washes={cfg.washes} />;
}

// ─────────────────────────────────────────────────────────────────────────
// PhaseBackdrop — Stimmungs-Wash pro Spielphase. Bringt den Erzähl-Bogen
// rüber: Lobby = Nachthimmel, Rules = Lese-Cremepapier, PhaseIntro = je
// nach Phase-Index Sonnenaufgang/Mittag/Abend/Nacht, Placement = ruhige
// Land-Atmo, Pause = neutral-warm, GameOver = Sonnenuntergang,
// Thanks = Tag, TeamsReveal = cinematisch dunkel, Comeback = Hoffnungs-Glow.
// ─────────────────────────────────────────────────────────────────────────

export type PhaseStyle =
  | 'lobby' | 'rules' | 'phaseIntro1' | 'phaseIntro2' | 'phaseIntro3' | 'phaseIntro4'
  | 'placement' | 'paused' | 'gameOver' | 'thanks' | 'teamsReveal' | 'comeback';

export function PhaseBackdrop({ phase }: { phase: PhaseStyle }) {
  switch (phase) {
    case 'lobby':
      return <GouacheNightSky />;

    case 'rules':
      return (
        <PaintedMist
          baseColor={PALETTE.paper}
          washes={[
            { color: PALETTE.peach,        cx: '50%', cy: '20%', r: '55%', opacity: 0.45 },
            { color: PALETTE.sageLight,    cx: '15%', cy: '85%', r: '40%', opacity: 0.35 },
            { color: PALETTE.amberGlow,    cx: '85%', cy: '70%', r: '30%', opacity: 0.20 },
          ]}
        />
      );

    case 'phaseIntro1':
      // Phase 1 = Sonnenaufgang
      return (
        <PaintedMist
          baseColor={PALETTE.peachWarm}
          washes={[
            { color: PALETTE.peach,        cx: '50%', cy: '15%', r: '70%', opacity: 0.85 },
            { color: PALETTE.amberGlow,    cx: '50%', cy: '50%', r: '40%', opacity: 0.45 },
            { color: PALETTE.sage,         cx: '50%', cy: '90%', r: '50%', opacity: 0.55 },
          ]}
        />
      );

    case 'phaseIntro2':
      // Phase 2 = Mittag
      return (
        <PaintedMist
          baseColor={PALETTE.peach}
          washes={[
            { color: PALETTE.amberGlow,    cx: '50%', cy: '40%', r: '60%', opacity: 0.55 },
            { color: PALETTE.peachWarm,    cx: '20%', cy: '70%', r: '40%', opacity: 0.45 },
            { color: PALETTE.sage,         cx: '80%', cy: '85%', r: '40%', opacity: 0.40 },
          ]}
        />
      );

    case 'phaseIntro3':
      // Phase 3 = später Nachmittag, Goldlicht
      return (
        <PaintedMist
          baseColor={PALETTE.amberGlow}
          washes={[
            { color: PALETTE.peachWarm,    cx: '50%', cy: '20%', r: '70%', opacity: 0.65 },
            { color: PALETTE.terracotta,   cx: '50%', cy: '60%', r: '50%', opacity: 0.45 },
            { color: PALETTE.lavenderDusk, cx: '50%', cy: '95%', r: '55%', opacity: 0.55 },
          ]}
        />
      );

    case 'phaseIntro4':
      // Phase 4 = Finale, blaue Stunde mit Abendglühen
      return (
        <PaintedMist
          baseColor={PALETTE.lavenderDusk}
          washes={[
            { color: PALETTE.terracotta,   cx: '50%', cy: '12%', r: '55%', opacity: 0.55 },
            { color: PALETTE.dusk,         cx: '20%', cy: '60%', r: '50%', opacity: 0.55 },
            { color: PALETTE.amberGlow,    cx: '85%', cy: '40%', r: '25%', opacity: 0.45 },
            { color: PALETTE.inkDeep,      cx: '50%', cy: '95%', r: '60%', opacity: 0.65 },
          ]}
        />
      );

    case 'placement':
      // Ruhige Land-Atmo, neutral
      return (
        <PaintedMist
          baseColor={PALETTE.dusk}
          washes={[
            { color: PALETTE.mist,         cx: '50%', cy: '70%', r: '60%', opacity: 0.45 },
            { color: PALETTE.lavenderDusk, cx: '20%', cy: '40%', r: '45%', opacity: 0.30 },
            { color: PALETTE.peach,        cx: '78%', cy: '20%', r: '30%', opacity: 0.20 },
          ]}
        />
      );

    case 'paused':
      // Atemzeit — sehr ruhig, warm, einladend zum Erzählen
      return (
        <PaintedMist
          baseColor={PALETTE.peachWarm}
          washes={[
            { color: PALETTE.peach,        cx: '50%', cy: '30%', r: '70%', opacity: 0.65 },
            { color: PALETTE.sageLight,    cx: '15%', cy: '85%', r: '40%', opacity: 0.40 },
            { color: PALETTE.amberGlow,    cx: '85%', cy: '70%', r: '35%', opacity: 0.30 },
          ]}
        />
      );

    case 'gameOver':
      // Sonnenuntergang, Triumph + Wärme
      return (
        <PaintedMist
          baseColor={PALETTE.amberGlow}
          washes={[
            { color: PALETTE.peach,        cx: '50%', cy: '20%', r: '60%', opacity: 0.75 },
            { color: PALETTE.terracotta,   cx: '50%', cy: '55%', r: '50%', opacity: 0.50 },
            { color: PALETTE.lavenderDusk, cx: '50%', cy: '90%', r: '55%', opacity: 0.50 },
          ]}
        />
      );

    case 'thanks':
      return <GouacheDaySky />;

    case 'teamsReveal':
      // Cinematisch dunkel mit Stern-Konzentration
      return (
        <PaintedMist
          baseColor={PALETTE.inkDeep}
          washes={[
            { color: PALETTE.dusk,         cx: '50%', cy: '85%', r: '70%', opacity: 0.7 },
            { color: PALETTE.lavenderDusk, cx: '30%', cy: '40%', r: '40%', opacity: 0.40 },
            { color: PALETTE.amberGlow,    cx: '50%', cy: '50%', r: '20%', opacity: 0.25 },
          ]}
        />
      );

    case 'comeback':
      // Hoffnungs-Glow, warm zentriert
      return (
        <PaintedMist
          baseColor={PALETTE.dusk}
          washes={[
            { color: PALETTE.amberGlow,    cx: '50%', cy: '50%', r: '50%', opacity: 0.55 },
            { color: PALETTE.terracotta,   cx: '50%', cy: '70%', r: '40%', opacity: 0.35 },
            { color: PALETTE.lavenderDusk, cx: '50%', cy: '95%', r: '55%', opacity: 0.50 },
          ]}
        />
      );
  }
}
