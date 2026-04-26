// SVG-Filter-Library für den Gouache-Stil.
//
// Mounted einmal pro Seite (idealerweise im Root-Layout) — dann sind alle
// Filter via filter="url(#paperGrain)" / filter: 'url(#watercolorEdge)'
// erreichbar. Filter sind absolute-positioniert + visually-hidden, sie
// nehmen kein Layout ein.

import { PALETTE } from './tokens';

export function GouacheFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        {/* Paper-Grain — leichte Turbulenz mit warmer Tint, fuer Multiply-
            Overlay auf Cards/Backgrounds. */}
        <filter id="paperGrain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
          <feColorMatrix values="
            0 0 0 0 0.92
            0 0 0 0 0.86
            0 0 0 0 0.74
            0 0 0 0.18 0
          " />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>

        {/* Watercolor-Edge — wobblige Kanten via Turbulenz + Displacement.
            Auf Cards/Borders fuer den hand-gemalten Look. */}
        <filter id="watercolorEdge" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>

        {/* Stärkerer Wobble fuer Avatar-Frames + grosse Painted-Elements. */}
        <filter id="paintFrame" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>

        {/* Soft-Watercolor-Bleed — verlaeuft die Farbe leicht. */}
        <filter id="bleed" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>

        {/* Avatar-Sepia: dämpft Saturation, fügt warmen Touch hinzu. */}
        <filter id="avatarGouache">
          <feColorMatrix type="matrix" values="
            0.85 0.15 0.0  0 0
            0.05 0.92 0.05 0 0
            0.05 0.05 0.78 0 0
            0    0    0    1 0
          " />
        </filter>

        {/* Painted-Wash-Gradients — als Hintergrund fuer Hero-Sections. */}
        <radialGradient id="washSky" cx="50%" cy="35%" r="65%">
          <stop offset="0%"  stopColor={PALETTE.sageLight} stopOpacity="0.4" />
          <stop offset="55%" stopColor={PALETTE.inkSoft}    stopOpacity="0.35" />
          <stop offset="100%" stopColor={PALETTE.inkDeep}   stopOpacity="0.55" />
        </radialGradient>
        <radialGradient id="washSage" cx="50%" cy="50%" r="65%">
          <stop offset="0%"  stopColor={PALETTE.sageLight} stopOpacity="0.4" />
          <stop offset="100%" stopColor={PALETTE.sage}      stopOpacity="0.35" />
        </radialGradient>
        <radialGradient id="washWarm" cx="50%" cy="50%" r="65%">
          <stop offset="0%"  stopColor="#FFF6E0"            stopOpacity="0.6" />
          <stop offset="100%" stopColor={PALETTE.terracotta} stopOpacity="0.25" />
        </radialGradient>
      </defs>
    </svg>
  );
}
