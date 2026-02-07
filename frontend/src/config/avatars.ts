export type AvatarOption = {
  id: string;
  name: string;
  svg: string;
  dataUri: string;
};

const svgToDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

type CozyAvatarStyle = {
  id: string;
  name: string;
  furFrom: string;
  furTo: string;
  hoodieFrom: string;
  hoodieTo: string;
  nose: string;
  ring: string;
};

const buildCozyAvatarSvg = (style: CozyAvatarStyle) => {
  const furId = `fur-${style.id}`;
  const hoodieId = `hoodie-${style.id}`;
  const ringId = `ring-${style.id}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <defs>
    <linearGradient id="${furId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${style.furFrom}"/>
      <stop offset="100%" stop-color="${style.furTo}"/>
    </linearGradient>
    <linearGradient id="${hoodieId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${style.hoodieFrom}"/>
      <stop offset="100%" stop-color="${style.hoodieTo}"/>
    </linearGradient>
    <linearGradient id="${ringId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff3c9f"/>
      <stop offset="100%" stop-color="${style.ring}"/>
    </linearGradient>
  </defs>
  <rect width="96" height="96" rx="30" fill="#0b0f1a"/>
  <circle cx="48" cy="48" r="42" stroke="url(#${ringId})" stroke-width="6" fill="none"/>
  <path d="M20 70c6-16 20-26 28-26s22 10 28 26v8H20v-8z" fill="url(#${hoodieId})"/>
  <path d="M30 34l10-14 8 16" fill="url(#${furId})"/>
  <path d="M66 34l-10-14-8 16" fill="url(#${furId})"/>
  <circle cx="48" cy="42" r="22" fill="url(#${furId})"/>
  <path d="M36 42c2 3 6 3 8 0" stroke="#163e6a" stroke-width="3" stroke-linecap="round"/>
  <path d="M52 42c2 3 6 3 8 0" stroke="#163e6a" stroke-width="3" stroke-linecap="round"/>
  <path d="M34 52c8 8 20 8 28 0" stroke="#1b4f88" stroke-width="4" stroke-linecap="round"/>
  <circle cx="62" cy="48" r="4" fill="${style.nose}"/>
</svg>`;
};

const avatarStyles: CozyAvatarStyle[] = [
  { id: 'cozy-wolf', name: 'Cozy Wolf', furFrom: '#ff6fb3', furTo: '#ff3c9f', hoodieFrom: '#0d3b78', hoodieTo: '#0b2452', nose: '#0b3a78', ring: '#b60b60' },
  { id: 'cozy-fox', name: 'Cozy Fox', furFrom: '#ff8a5b', furTo: '#ff5f3a', hoodieFrom: '#0b3a78', hoodieTo: '#09264f', nose: '#0b3a78', ring: '#b60b60' },
  { id: 'cozy-cat', name: 'Cozy Cat', furFrom: '#a07cff', furTo: '#7a5cff', hoodieFrom: '#0c2f5f', hoodieTo: '#091d3b', nose: '#1a4a7d', ring: '#b60b60' },
  { id: 'cozy-bear', name: 'Cozy Bear', furFrom: '#f6b07d', furTo: '#e38a4a', hoodieFrom: '#0e3a6a', hoodieTo: '#0a2349', nose: '#0b3a78', ring: '#b60b60' },
  { id: 'cozy-bunny', name: 'Cozy Bunny', furFrom: '#9ef4d4', furTo: '#5bd4b0', hoodieFrom: '#0d2d55', hoodieTo: '#091e3a', nose: '#0b3a78', ring: '#b60b60' },
  { id: 'cozy-owl', name: 'Cozy Owl', furFrom: '#ffe77a', furTo: '#ffcc4a', hoodieFrom: '#2d175e', hoodieTo: '#1b0f3b', nose: '#1b4f88', ring: '#b60b60' },
  { id: 'cozy-raccoon', name: 'Cozy Raccoon', furFrom: '#cbd5e1', furTo: '#94a3b8', hoodieFrom: '#0c2f5f', hoodieTo: '#081a36', nose: '#0b3a78', ring: '#b60b60' },
  { id: 'cozy-panda', name: 'Cozy Panda', furFrom: '#f8fafc', furTo: '#e2e8f0', hoodieFrom: '#b91c1c', hoodieTo: '#7f1d1d', nose: '#0b3a78', ring: '#b60b60' },
  { id: 'cozy-tiger', name: 'Cozy Tiger', furFrom: '#ffb454', furTo: '#ff7a18', hoodieFrom: '#0d2d55', hoodieTo: '#081a36', nose: '#0b3a78', ring: '#b60b60' },
  { id: 'cozy-koala', name: 'Cozy Koala', furFrom: '#d1d5db', furTo: '#9ca3af', hoodieFrom: '#7c3aed', hoodieTo: '#4c1d95', nose: '#0b3a78', ring: '#b60b60' },
  { id: 'cozy-deer', name: 'Cozy Deer', furFrom: '#f1c48a', furTo: '#d99c5f', hoodieFrom: '#0e3b4e', hoodieTo: '#0b2430', nose: '#0b3a78', ring: '#b60b60' },
  { id: 'cozy-dog', name: 'Cozy Dog', furFrom: '#f7b48b', furTo: '#d9825e', hoodieFrom: '#0b3a78', hoodieTo: '#071c3a', nose: '#0b3a78', ring: '#b60b60' }
];

const avatarSvgs = avatarStyles.map((style) => ({
  id: style.id,
  name: style.name,
  svg: buildCozyAvatarSvg(style)
}));

export const AVATARS: AvatarOption[] = avatarSvgs.map((avatar) => ({
  ...avatar,
  dataUri: svgToDataUri(avatar.svg)
}));
