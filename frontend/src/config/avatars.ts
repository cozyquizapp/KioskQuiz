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
  animal: 'wolf' | 'fox' | 'cat' | 'bear' | 'bunny' | 'owl' | 'raccoon' | 'panda' | 'tiger' | 'koala' | 'deer' | 'dog' | 'lion' | 'giraffe';
  furFrom: string;
  furTo: string;
  hoodieFrom: string;
  hoodieTo: string;
  nose: string;
  ring: string;
  accent?: string;
};

const buildCozyAvatarSvg = (style: CozyAvatarStyle) => {
  const furId = `fur-${style.id}`;
  const hoodieId = `hoodie-${style.id}`;
  const ringId = `ring-${style.id}`;
  const accent = style.accent || '#163e6a';
  const earShapes = {
    wolf: '<path d="M28 30l12-16 6 20" fill="url(#' + furId + ')"/><path d="M68 30l-12-16-6 20" fill="url(#' + furId + ')"/>',
    fox: '<path d="M26 32l12-18 8 22" fill="url(#' + furId + ')"/><path d="M70 32l-12-18-8 22" fill="url(#' + furId + ')"/>',
    cat: '<path d="M30 30l10-14 6 16" fill="url(#' + furId + ')"/><path d="M66 30l-10-14-6 16" fill="url(#' + furId + ')"/>',
    bear: '<circle cx="32" cy="30" r="10" fill="url(#' + furId + ')"/><circle cx="64" cy="30" r="10" fill="url(#' + furId + ')"/>',
    bunny: '<path d="M30 8c10 4 12 16 10 26" fill="url(#' + furId + ')"/><path d="M64 8c-10 4-12 16-10 26" fill="url(#' + furId + ')"/>',
    owl: '<path d="M30 30l10-12 8 14" fill="url(#' + furId + ')"/><path d="M66 30l-10-12-8 14" fill="url(#' + furId + ')"/>',
    raccoon: '<circle cx="32" cy="30" r="9" fill="url(#' + furId + ')"/><circle cx="64" cy="30" r="9" fill="url(#' + furId + ')"/>',
    panda: '<circle cx="30" cy="30" r="10" fill="url(#' + furId + ')"/><circle cx="66" cy="30" r="10" fill="url(#' + furId + ')"/>',
    tiger: '<path d="M28 30l12-16 6 20" fill="url(#' + furId + ')"/><path d="M68 30l-12-16-6 20" fill="url(#' + furId + ')"/>',
    koala: '<circle cx="30" cy="30" r="10" fill="url(#' + furId + ')"/><circle cx="66" cy="30" r="10" fill="url(#' + furId + ')"/>',
    deer: '<path d="M28 26l6-12 6 14" fill="url(#' + furId + ')"/><path d="M68 26l-6-12-6 14" fill="url(#' + furId + ')"/>',
    dog: '<path d="M26 30c2-8 10-10 16-8-2 10-8 16-16 18" fill="url(#' + furId + ')"/><path d="M70 30c-2-8-10-10-16-8 2 10 8 16 16 18" fill="url(#' + furId + ')"/>',
    lion: '<circle cx="32" cy="30" r="10" fill="url(#' + furId + ')"/><circle cx="64" cy="30" r="10" fill="url(#' + furId + ')"/>',
    giraffe: '<path d="M30 28l6-14 6 18" fill="url(#' + furId + ')"/><path d="M66 28l-6-14-6 18" fill="url(#' + furId + ')"/>'
  } as Record<CozyAvatarStyle['animal'], string>;

  const extras = {
    lion: '<circle cx="48" cy="44" r="26" fill="' + accent + '33"/>',
    giraffe: '<circle cx="40" cy="44" r="3" fill="' + accent + '66"/><circle cx="54" cy="50" r="3" fill="' + accent + '66"/><circle cx="46" cy="56" r="3" fill="' + accent + '66"/>',
    tiger: '<path d="M36 36h16" stroke="' + accent + '" stroke-width="3" stroke-linecap="round"/><path d="M36 44h16" stroke="' + accent + '" stroke-width="3" stroke-linecap="round"/>',
    panda: '<ellipse cx="38" cy="44" rx="6" ry="8" fill="' + accent + '66"/><ellipse cx="58" cy="44" rx="6" ry="8" fill="' + accent + '66"/>',
    deer: '<path d="M22 20c8-2 12 4 14 10" stroke="' + accent + '" stroke-width="3" stroke-linecap="round"/><path d="M74 20c-8-2-12 4-14 10" stroke="' + accent + '" stroke-width="3" stroke-linecap="round"/>',
    owl: '<circle cx="38" cy="44" r="6" fill="' + accent + '66"/><circle cx="58" cy="44" r="6" fill="' + accent + '66"/>',
    raccoon: '<path d="M32 42h12" stroke="' + accent + '" stroke-width="4" stroke-linecap="round"/><path d="M52 42h12" stroke="' + accent + '" stroke-width="4" stroke-linecap="round"/>'
  } as Partial<Record<CozyAvatarStyle['animal'], string>>;

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
    <filter id="shadow-${style.id}" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.3" flood-color="#000000"/>
    </filter>
  </defs>
  <rect width="96" height="96" rx="30" fill="#0b0f1a"/>
  <circle cx="48" cy="48" r="42" stroke="url(#${ringId})" stroke-width="6" fill="none"/>
  <path d="M20 70c6-16 20-26 28-26s22 10 28 26v8H20v-8z" fill="url(#${hoodieId})" filter="url(#shadow-${style.id})"/>
  ${earShapes[style.animal]}
  <path d="M28 36c4-6 10-8 20-8h6c10 0 18 6 20 16 2 12-6 24-22 26-18 2-28-10-24-34z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
  ${extras[style.animal] || ''}
  <path d="M38 44c2 3 6 3 8 0" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
  <path d="M52 44c2 3 6 3 8 0" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
  <path d="M36 54c8 8 20 8 28 0" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="64" cy="50" r="4" fill="${style.nose}"/>
</svg>`;
};

const avatarStyles: CozyAvatarStyle[] = [
  { id: 'cozy-wolf', name: 'Cozy Wolf', animal: 'wolf', furFrom: '#ff6fb3', furTo: '#ff3c9f', hoodieFrom: '#0d3b78', hoodieTo: '#0b2452', nose: '#0b3a78', ring: '#b60b60', accent: '#1b4f88' },
  { id: 'cozy-fox', name: 'Cozy Fox', animal: 'fox', furFrom: '#ff8a5b', furTo: '#ff5f3a', hoodieFrom: '#0b3a78', hoodieTo: '#09264f', nose: '#0b3a78', ring: '#b60b60', accent: '#1b4f88' },
  { id: 'cozy-cat', name: 'Cozy Cat', animal: 'cat', furFrom: '#a07cff', furTo: '#7a5cff', hoodieFrom: '#0c2f5f', hoodieTo: '#091d3b', nose: '#1a4a7d', ring: '#b60b60', accent: '#1b4f88' },
  { id: 'cozy-bear', name: 'Cozy Bear', animal: 'bear', furFrom: '#f6b07d', furTo: '#e38a4a', hoodieFrom: '#0e3a6a', hoodieTo: '#0a2349', nose: '#0b3a78', ring: '#b60b60', accent: '#1b4f88' },
  { id: 'cozy-bunny', name: 'Cozy Bunny', animal: 'bunny', furFrom: '#9ef4d4', furTo: '#5bd4b0', hoodieFrom: '#0d2d55', hoodieTo: '#091e3a', nose: '#0b3a78', ring: '#b60b60', accent: '#1b4f88' },
  { id: 'cozy-owl', name: 'Cozy Owl', animal: 'owl', furFrom: '#ffe77a', furTo: '#ffcc4a', hoodieFrom: '#2d175e', hoodieTo: '#1b0f3b', nose: '#1b4f88', ring: '#b60b60', accent: '#1b4f88' },
  { id: 'cozy-raccoon', name: 'Cozy Raccoon', animal: 'raccoon', furFrom: '#cbd5e1', furTo: '#94a3b8', hoodieFrom: '#0c2f5f', hoodieTo: '#081a36', nose: '#0b3a78', ring: '#b60b60', accent: '#475569' },
  { id: 'cozy-panda', name: 'Cozy Panda', animal: 'panda', furFrom: '#f8fafc', furTo: '#e2e8f0', hoodieFrom: '#b91c1c', hoodieTo: '#7f1d1d', nose: '#0b3a78', ring: '#b60b60', accent: '#0f172a' },
  { id: 'cozy-tiger', name: 'Cozy Tiger', animal: 'tiger', furFrom: '#ffb454', furTo: '#ff7a18', hoodieFrom: '#0d2d55', hoodieTo: '#081a36', nose: '#0b3a78', ring: '#b60b60', accent: '#7c2d12' },
  { id: 'cozy-koala', name: 'Cozy Koala', animal: 'koala', furFrom: '#d1d5db', furTo: '#9ca3af', hoodieFrom: '#7c3aed', hoodieTo: '#4c1d95', nose: '#0b3a78', ring: '#b60b60', accent: '#475569' },
  { id: 'cozy-deer', name: 'Cozy Deer', animal: 'deer', furFrom: '#f1c48a', furTo: '#d99c5f', hoodieFrom: '#0e3b4e', hoodieTo: '#0b2430', nose: '#0b3a78', ring: '#b60b60', accent: '#7c2d12' },
  { id: 'cozy-dog', name: 'Cozy Dog', animal: 'dog', furFrom: '#f7b48b', furTo: '#d9825e', hoodieFrom: '#0b3a78', hoodieTo: '#071c3a', nose: '#0b3a78', ring: '#b60b60', accent: '#1b4f88' },
  { id: 'cozy-lion', name: 'Cozy Lion', animal: 'lion', furFrom: '#ffb454', furTo: '#ff7a18', hoodieFrom: '#0c2f5f', hoodieTo: '#091d3b', nose: '#0b3a78', ring: '#b60b60', accent: '#d97706' },
  { id: 'cozy-giraffe', name: 'Cozy Giraffe', animal: 'giraffe', furFrom: '#8fe36c', furTo: '#4cc44a', hoodieFrom: '#0d3b78', hoodieTo: '#0b2452', nose: '#0b3a78', ring: '#b60b60', accent: '#0f766e' }
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
