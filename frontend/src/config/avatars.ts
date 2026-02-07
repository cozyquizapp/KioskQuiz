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
  
  const animalSvg: Record<CozyAvatarStyle['animal'], string> = {
    wolf: `
      <path d="M30 24l8-10 8 12-2 8z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M66 24l-8-10-8 12 2 8z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M32 38c0-8 4-14 16-14s16 6 16 14c0 14-6 22-16 22s-16-8-16-22z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M38 42c0-3 2-5 4-5s4 2 4 5-2 4-4 4-4-1-4-4z" fill="${accent}"/>
      <path d="M50 42c0-3 2-5 4-5s4 2 4 5-2 4-4 4-4-1-4-4z" fill="${accent}"/>
      <ellipse cx="48" cy="52" rx="4" ry="6" fill="${style.nose}"/>
      <path d="M44 56c2 3 6 3 8 0" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
    `,
    fox: `
      <path d="M28 22l10-12 8 14-4 10z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M68 22l-10-12-8 14 4 10z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M34 36c0-6 6-10 14-10s14 4 14 10v16c0 8-6 12-14 12s-14-4-14-12v-16z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M40 40c0-2 1.5-4 3-4s3 2 3 4-1.5 3-3 3-3-1-3-3z" fill="${accent}"/>
      <path d="M50 40c0-2 1.5-4 3-4s3 2 3 4-1.5 3-3 3-3-1-3-3z" fill="${accent}"/>
      <path d="M42 50c0-4 2-6 6-6s6 2 6 6v6c0 2-2 4-6 4s-6-2-6-4v-6z" fill="#fff" opacity="0.4"/>
      <ellipse cx="48" cy="56" rx="3" ry="5" fill="${style.nose}"/>
      <path d="M44 58c2 2 6 2 8 0" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
    `,
    cat: `
      <path d="M30 22l6-10 8 14v8z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M66 22l-6-10-8 14v8z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <circle cx="48" cy="46" r="18" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M40 42c0-2 1-4 2.5-4s2.5 2 2.5 4-1 3-2.5 3-2.5-1-2.5-3z" fill="${accent}"/>
      <path d="M51 42c0-2 1-4 2.5-4s2.5 2 2.5 4-1 3-2.5 3-2.5-1-2.5-3z" fill="${accent}"/>
      <path d="M42 50l6-2 6 2" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="48" cy="54" rx="2.5" ry="4" fill="${style.nose}"/>
      <path d="M46 54c0 3-2 5-4 6m10-6c0 3 2 5 4 6" stroke="${accent}" stroke-width="1.5" stroke-linecap="round"/>
    `,
    bear: `
      <circle cx="32" cy="28" r="11" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <circle cx="64" cy="28" r="11" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <circle cx="48" cy="46" r="20" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <circle cx="42" cy="44" r="3" fill="${accent}"/>
      <circle cx="54" cy="44" r="3" fill="${accent}"/>
      <ellipse cx="48" cy="54" rx="5" ry="6" fill="${style.nose}"/>
      <path d="M43 58c2 3 8 3 10 0" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>
    `,
    bunny: `
      <ellipse cx="34" cy="16" rx="6" ry="18" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <ellipse cx="62" cy="16" rx="6" ry="18" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <ellipse cx="34" cy="16" rx="3" ry="14" fill="#fff" opacity="0.3"/>
      <ellipse cx="62" cy="16" rx="3" ry="14" fill="#fff" opacity="0.3"/>
      <circle cx="48" cy="46" r="19" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <circle cx="42" cy="44" r="3" fill="${accent}"/>
      <circle cx="54" cy="44" r="3" fill="${accent}"/>
      <ellipse cx="48" cy="54" rx="3" ry="5" fill="${style.nose}"/>
      <path d="M44 56c2 3 6 3 8 0" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="38" cy="50" r="4" fill="#fff" opacity="0.4"/>
      <circle cx="58" cy="50" r="4" fill="#fff" opacity="0.4"/>
    `,
    owl: `
      <path d="M28 24l8-8 8 12-2 6z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M68 24l-8-8-8 12 2 6z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M32 34c0-6 6-10 16-10s16 4 16 10v18c0 8-6 14-16 14s-16-6-16-14v-18z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <circle cx="40" cy="42" r="7" fill="#fff" opacity="0.9"/>
      <circle cx="56" cy="42" r="7" fill="#fff" opacity="0.9"/>
      <circle cx="40" cy="42" r="4" fill="${accent}"/>
      <circle cx="56" cy="42" r="4" fill="${accent}"/>
      <path d="M44 52l4-4 4 4v6l-4 2-4-2v-6z" fill="${style.nose}"/>
    `,
    raccoon: `
      <circle cx="32" cy="28" r="10" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <circle cx="64" cy="28" r="10" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M34 34c0-6 6-10 14-10s14 4 14 10v16c0 8-6 14-14 14s-14-6-14-14v-16z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <ellipse cx="40" cy="42" rx="6" ry="7" fill="${accent}" opacity="0.7"/>
      <ellipse cx="56" cy="42" rx="6" ry="7" fill="${accent}" opacity="0.7"/>
      <circle cx="40" cy="42" r="3" fill="#fff" opacity="0.9"/>
      <circle cx="56" cy="42" r="3" fill="#fff" opacity="0.9"/>
      <circle cx="40" cy="42" r="2" fill="${accent}"/>
      <circle cx="56" cy="42" r="2" fill="${accent}"/>
      <ellipse cx="48" cy="54" rx="4" ry="5" fill="${style.nose}"/>
      <path d="M44 56c2 2 6 2 8 0" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
    `,
    panda: `
      <circle cx="32" cy="30" r="11" fill="${accent}"/>
      <circle cx="64" cy="30" r="11" fill="${accent}"/>
      <circle cx="48" cy="46" r="19" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <ellipse cx="40" cy="44" rx="7" ry="9" fill="${accent}"/>
      <ellipse cx="56" cy="44" rx="7" ry="9" fill="${accent}"/>
      <circle cx="40" cy="44" r="3" fill="#fff" opacity="0.9"/>
      <circle cx="56" cy="44" r="3" fill="#fff" opacity="0.9"/>
      <circle cx="40" cy="44" r="2" fill="${accent}"/>
      <circle cx="56" cy="44" r="2" fill="${accent}"/>
      <ellipse cx="48" cy="54" rx="4" ry="6" fill="${style.nose}"/>
      <path d="M44 56c2 3 6 3 8 0" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
    `,
    tiger: `
      <path d="M30 24l8-10 8 12-2 8z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M66 24l-8-10-8 12 2 8z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M34 36c0-6 6-10 14-10s14 4 14 10v16c0 8-6 12-14 12s-14-4-14-12v-16z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M36 34h6m14 0h6m-24 8h6m12 0h6m-20 8h6m8 0h6" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M40 42c0-2 1.5-4 3-4s3 2 3 4-1.5 3-3 3-3-1-3-3z" fill="${accent}"/>
      <path d="M50 42c0-2 1.5-4 3-4s3 2 3 4-1.5 3-3 3-3-1-3-3z" fill="${accent}"/>
      <ellipse cx="48" cy="54" rx="4" ry="6" fill="${style.nose}"/>
      <path d="M44 56c2 3 6 3 8 0" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
    `,
    koala: `
      <ellipse cx="30" cy="28" rx="12" ry="14" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <ellipse cx="66" cy="28" rx="12" ry="14" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <ellipse cx="30" cy="28" rx="6" ry="8" fill="${accent}" opacity="0.3"/>
      <ellipse cx="66" cy="28" rx="6" ry="8" fill="${accent}" opacity="0.3"/>
      <circle cx="48" cy="46" r="18" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <circle cx="42" cy="44" r="3" fill="${accent}"/>
      <circle cx="54" cy="44" r="3" fill="${accent}"/>
      <ellipse cx="48" cy="54" rx="5" ry="7" fill="${style.nose}"/>
      <path d="M43 56c2 3 8 3 10 0" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
    `,
    deer: `
      <path d="M26 18c4-8 6-10 8-10s4 4 2 10l-6 8z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M70 18c-4-8-6-10-8-10s-4 4-2 10l6 8z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M22 16l4-6 2 8m48-8l-4-6-2 8" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
      <path d="M32 30l6-8 8 10-2 6z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M64 30l-6-8-8 10 2 6z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <ellipse cx="48" cy="46" rx="16" ry="18" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <circle cx="42" cy="44" r="3" fill="${accent}"/>
      <circle cx="54" cy="44" r="3" fill="${accent}"/>
      <ellipse cx="48" cy="54" rx="3" ry="5" fill="${style.nose}"/>
      <path d="M44 56c2 3 6 3 8 0" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
    `,
    dog: `
      <path d="M26 28c0-8 4-12 10-10 4 2 4 8 2 14l-8 6z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M70 28c0-8-4-12-10-10-4 2-4 8-2 14l8 6z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <ellipse cx="48" cy="46" rx="18" ry="20" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <circle cx="42" cy="44" r="3.5" fill="${accent}"/>
      <circle cx="54" cy="44" r="3.5" fill="${accent}"/>
      <ellipse cx="48" cy="54" rx="4" ry="6" fill="${style.nose}"/>
      <path d="M48 54v4" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
      <path d="M44 58c2 2 6 2 8 0" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
    `,
    lion: `
      <circle cx="32" cy="28" r="8" fill="${accent}" opacity="0.5"/>
      <circle cx="64" cy="28" r="8" fill="${accent}" opacity="0.5"/>
      <circle cx="24" cy="38" r="7" fill="${accent}" opacity="0.5"/>
      <circle cx="72" cy="38" r="7" fill="${accent}" opacity="0.5"/>
      <circle cx="22" cy="50" r="6" fill="${accent}" opacity="0.5"/>
      <circle cx="74" cy="50" r="6" fill="${accent}" opacity="0.5"/>
      <circle cx="28" cy="56" r="6" fill="${accent}" opacity="0.5"/>
      <circle cx="68" cy="56" r="6" fill="${accent}" opacity="0.5"/>
      <circle cx="48" cy="46" r="20" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <circle cx="42" cy="44" r="3" fill="${accent}"/>
      <circle cx="54" cy="44" r="3" fill="${accent}"/>
      <ellipse cx="48" cy="54" rx="4" ry="6" fill="${style.nose}"/>
      <path d="M43 56c2 3 8 3 10 0" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>
    `,
    giraffe: `
      <path d="M32 20l4-10 6 12v8z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <path d="M64 20l-4-10-6 12v8z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <circle cx="36" cy="14" r="3" fill="${accent}" opacity="0.6"/>
      <circle cx="60" cy="14" r="3" fill="${accent}" opacity="0.6"/>
      <path d="M36 36c0-8 4-12 12-12s12 4 12 12v16c0 10-4 14-12 14s-12-4-12-14v-16z" fill="url(#${furId})" filter="url(#shadow-${style.id})"/>
      <ellipse cx="38" cy="38" rx="3" ry="4" fill="${accent}" opacity="0.5"/>
      <ellipse cx="58" cy="38" rx="3" ry="4" fill="${accent}" opacity="0.5"/>
      <ellipse cx="42" cy="48" rx="2.5" ry="3" fill="${accent}" opacity="0.5"/>
      <ellipse cx="54" cy="48" rx="2.5" ry="3" fill="${accent}" opacity="0.5"/>
      <ellipse cx="48" cy="56" rx="3" ry="4" fill="${accent}" opacity="0.5"/>
      <circle cx="42" cy="42" r="3" fill="${accent}"/>
      <circle cx="54" cy="42" r="3" fill="${accent}"/>
      <ellipse cx="48" cy="52" rx="3" ry="5" fill="${style.nose}"/>
      <path d="M45 54c1.5 2 4.5 2 6 0" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
    `
  };

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
  ${animalSvg[style.animal]}
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
