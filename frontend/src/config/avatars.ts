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
      <!-- Ears -->
      <path d="M32 24l-4-8 4 2 4-2z" fill="url(#${furId})"/>
      <path d="M64 24l4-8-4 2-4-2z" fill="url(#${furId})"/>
      <!-- Head -->
      <ellipse cx="48" cy="38" rx="16" ry="18" fill="url(#${furId})"/>
      <!-- Left eye -->
      <circle cx="42" cy="36" r="3.5" fill="#fff"/>
      <circle cx="42" cy="36" r="2" fill="${accent}"/>
      <!-- Right eye (winking) -->
      <path d="M54 36c1 2 2 3 3 3s2-1 3-3" stroke="${accent}" stroke-width="2" stroke-linecap="round" fill="none"/>
      <!-- Snout -->
      <ellipse cx="48" cy="44" rx="6" ry="5" fill="${style.nose}" opacity="0.9"/>
      <!-- Smile -->
      <path d="M46 46c2 2 4 2 4 0" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    `,
    fox: `
      <!-- Ears -->
      <path d="M30 26l-6-10 4 4 3-2z" fill="url(#${furId})"/>
      <path d="M66 26l6-10-4 4-3-2z" fill="url(#${furId})"/>
      <!-- Head -->
      <ellipse cx="48" cy="40" rx="15" ry="17" fill="url(#${furId})"/>
      <!-- Left eye -->
      <circle cx="43" cy="38" r="3" fill="#fff"/>
      <circle cx="43" cy="38" r="1.8" fill="${accent}"/>
      <!-- Right eye -->
      <circle cx="53" cy="38" r="3" fill="#fff"/>
      <circle cx="53" cy="38" r="1.8" fill="${accent}"/>
      <!-- Snout -->
      <ellipse cx="48" cy="46" rx="8" ry="6" fill="#fff" opacity="0.8"/>
      <!-- Nose -->
      <ellipse cx="48" cy="44" rx="2.5" ry="3" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M45 48c3 1 6 1 6 0" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    `,
    cat: `
      <!-- Ears -->
      <path d="M32 26l-2-10 3 6 2-2z" fill="url(#${furId})"/>
      <path d="M64 26l2-10-3 6-2-2z" fill="url(#${furId})"/>
      <!-- Head -->
      <circle cx="48" cy="40" r="16" fill="url(#${furId})"/>
      <!-- Left eye -->
      <ellipse cx="42" cy="38" rx="3" ry="4.5" fill="#fff"/>
      <ellipse cx="42" cy="38" rx="1.8" ry="3" fill="${accent}"/>
      <!-- Right eye -->
      <ellipse cx="54" cy="38" rx="3" ry="4.5" fill="#fff"/>
      <ellipse cx="54" cy="38" rx="1.8" ry="3" fill="${accent}"/>
      <!-- Nose -->
      <path d="M48 44l-1.5 2 3 0 -1.5 -2z" fill="${style.nose}"/>
      <!-- Mouth -->
      <path d="M45 46c3 1.5 6 1.5 6 0" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <path d="M46 46l-1 1m8 -1l1 1" stroke="${accent}" stroke-width="1" stroke-linecap="round"/>
    `,
    bear: `
      <!-- Ears -->
      <circle cx="32" cy="28" r="8" fill="url(#${furId})"/>
      <circle cx="64" cy="28" r="8" fill="url(#${furId})"/>
      <!-- Head -->
      <circle cx="48" cy="42" r="17" fill="url(#${furId})"/>
      <!-- Left eye -->
      <circle cx="41" cy="39" r="3.5" fill="#fff"/>
      <circle cx="41" cy="39" r="2" fill="${accent}"/>
      <!-- Right eye -->
      <circle cx="55" cy="39" r="3.5" fill="#fff"/>
      <circle cx="55" cy="39" r="2" fill="${accent}"/>
      <!-- Nose -->
      <ellipse cx="48" cy="46" rx="3" ry="4" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M44 50c4 2 8 2 8 0" stroke="${accent}" stroke-width="2" stroke-linecap="round" fill="none"/>
    `,
    bunny: `
      <!-- Left Ear -->
      <ellipse cx="32" cy="18" rx="5" ry="16" fill="url(#${furId})"/>
      <ellipse cx="32" cy="18" rx="2.5" ry="12" fill="#fff" opacity="0.4"/>
      <!-- Right Ear -->
      <ellipse cx="64" cy="18" rx="5" ry="16" fill="url(#${furId})"/>
      <ellipse cx="64" cy="18" rx="2.5" ry="12" fill="#fff" opacity="0.4"/>
      <!-- Head -->
      <circle cx="48" cy="42" r="16" fill="url(#${furId})"/>
      <!-- Left eye -->
      <circle cx="42" cy="40" r="3" fill="#fff"/>
      <circle cx="42" cy="40" r="1.8" fill="${accent}"/>
      <!-- Right eye -->
      <circle cx="54" cy="40" r="3" fill="#fff"/>
      <circle cx="54" cy="40" r="1.8" fill="${accent}"/>
      <!-- Nose -->
      <ellipse cx="48" cy="46" rx="2" ry="3" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M45 48c3 1.5 6 1.5 6 0" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <!-- Cheeks -->
      <circle cx="30" cy="44" r="3" fill="${style.nose}" opacity="0.3"/>
      <circle cx="66" cy="44" r="3" fill="${style.nose}" opacity="0.3"/>
    `,
    owl: `
      <!-- Head -->
      <circle cx="48" cy="42" r="17" fill="url(#${furId})"/>
      <!-- Left eye -->
      <circle cx="40" cy="38" r="6" fill="#fff"/>
      <circle cx="40" cy="38" r="3.5" fill="${accent}"/>
      <circle cx="40" cy="37" r="1.5" fill="#fff"/>
      <!-- Right eye -->
      <circle cx="56" cy="38" r="6" fill="#fff"/>
      <circle cx="56" cy="38" r="3.5" fill="${accent}"/>
      <circle cx="56" cy="37" r="1.5" fill="#fff"/>
      <!-- Beak -->
      <path d="M46 48l2 3 2 -3z" fill="${style.nose}"/>
      <!-- Mouth -->
      <path d="M44 50c2 1 4 1 4 0" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    `,
    raccoon: `
      <!-- Head -->
      <circle cx="48" cy="42" r="16" fill="url(#${furId})"/>
      <!-- Left mask -->
      <ellipse cx="41" cy="40" rx="6.5" ry="7" fill="${accent}" opacity="0.7"/>
      <!-- Right mask -->
      <ellipse cx="55" cy="40" rx="6.5" ry="7" fill="${accent}" opacity="0.7"/>
      <!-- Left eye -->
      <circle cx="41" cy="40" r="3" fill="#fff"/>
      <circle cx="41" cy="40" r="1.8" fill="#000"/>
      <!-- Right eye -->
      <circle cx="55" cy="40" r="3" fill="#fff"/>
      <circle cx="55" cy="40" r="1.8" fill="#000"/>
      <!-- Nose -->
      <ellipse cx="48" cy="46" rx="2.5" ry="3" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M45 48c3 1.5 6 1.5 6 0" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    `,
    panda: `
      <!-- Head (white) -->
      <circle cx="48" cy="42" r="16" fill="#f8fafc"/>
      <!-- Left ear -->
      <circle cx="34" cy="28" r="8" fill="${accent}"/>
      <!-- Right ear -->
      <circle cx="62" cy="28" r="8" fill="${accent}"/>
      <!-- Left eye patch -->
      <ellipse cx="41" cy="40" rx="6" ry="7.5" fill="${accent}"/>
      <!-- Right eye patch -->
      <ellipse cx="55" cy="40" rx="6" ry="7.5" fill="${accent}"/>
      <!-- Left eye -->
      <circle cx="41" cy="40" r="3.5" fill="#fff"/>
      <circle cx="41" cy="40" r="2" fill="#000"/>
      <!-- Right eye -->
      <circle cx="55" cy="40" r="3.5" fill="#fff"/>
      <circle cx="55" cy="40" r="2" fill="#000"/>
      <!-- Nose -->
      <ellipse cx="48" cy="46" rx="2" ry="2.5" fill="#000"/>
      <!-- Smile -->
      <path d="M44 48c4 1.5 8 1.5 8 0" stroke="#000" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    `,
    tiger: `
      <!-- Head -->
      <ellipse cx="48" cy="40" rx="16" ry="17" fill="url(#${furId})"/>
      <!-- Stripes -->
      <path d="M32 35h6m8 -2h6m-16 6h5m8 0h5" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
      <!-- Left eye -->
      <circle cx="42" cy="37" r="3.5" fill="#fff"/>
      <circle cx="42" cy="37" r="2" fill="${accent}"/>
      <!-- Right eye -->
      <circle cx="54" cy="37" r="3.5" fill="#fff"/>
      <circle cx="54" cy="37" r="2" fill="${accent}"/>
      <!-- Nose -->
      <ellipse cx="48" cy="45" rx="2" ry="3" fill="${style.nose}"/>
      <!-- Mouth -->
      <path d="M45 48c3 1.5 6 1.5 6 0" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <!-- Whiskers -->
      <path d="M32 42l-4 1m32 0l4 1" stroke="${accent}" stroke-width="1.5" stroke-linecap="round"/>
    `,
    koala: `
      <!-- Left ear -->
      <circle cx="32" cy="28" r="9" fill="url(#${furId})"/>
      <!-- Right ear -->
      <circle cx="64" cy="28" r="9" fill="url(#${furId})"/>
      <!-- Head -->
      <circle cx="48" cy="42" r="17" fill="url(#${furId})"/>
      <!-- Left eye -->
      <circle cx="41" cy="39" r="3" fill="#fff"/>
      <circle cx="41" cy="39" r="1.8" fill="${accent}"/>
      <!-- Right eye -->
      <circle cx="55" cy="39" r="3" fill="#fff"/>
      <circle cx="55" cy="39" r="1.8" fill="${accent}"/>
      <!-- Nose -->
      <ellipse cx="48" cy="46" rx="3.5" ry="4" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M43 50c5 2 10 2 10 0" stroke="${accent}" stroke-width="2" stroke-linecap="round" fill="none"/>
    `,
    deer: `
      <!-- Left antler -->
      <path d="M36 20l-2-6 1 4 1-2z" fill="${accent}"/>
      <!-- Right antler -->
      <path d="M60 20l2-6-1 4-1-2z" fill="${accent}"/>
      <!-- Head -->
      <ellipse cx="48" cy="40" rx="15" ry="17" fill="url(#${furId})"/>
      <!-- Left eye -->
      <circle cx="42" cy="38" r="3" fill="#fff"/>
      <circle cx="42" cy="38" r="1.8" fill="${accent}"/>
      <!-- Right eye -->
      <circle cx="54" cy="38" r="3" fill="#fff"/>
      <circle cx="54" cy="38" r="1.8" fill="${accent}"/>
      <!-- Snout -->
      <ellipse cx="48" cy="46" rx="5" ry="4" fill="#fff" opacity="0.7"/>
      <!-- Nose -->
      <ellipse cx="48" cy="44" rx="2" ry="2.5" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M45 47c3 1 6 1 6 0" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    `,
    dog: `
      <!-- Left ear (floppy) -->
      <ellipse cx="28" cy="36" rx="6" ry="12" fill="url(#${furId})"/>
      <!-- Right ear (floppy) -->
      <ellipse cx="68" cy="36" rx="6" ry="12" fill="url(#${furId})"/>
      <!-- Head -->
      <circle cx="48" cy="42" r="16" fill="url(#${furId})"/>
      <!-- Snout -->
      <ellipse cx="48" cy="48" rx="8" ry="6" fill="#fff" opacity="0.6"/>
      <!-- Left eye -->
      <circle cx="42" cy="39" r="3.5" fill="#fff"/>
      <circle cx="42" cy="39" r="2" fill="${accent}"/>
      <!-- Right eye -->
      <circle cx="54" cy="39" r="3.5" fill="#fff"/>
      <circle cx="54" cy="39" r="2" fill="${accent}"/>
      <!-- Nose -->
      <ellipse cx="48" cy="46" rx="2.5" ry="3" fill="${style.nose}"/>
      <!-- Tongue -->
      <ellipse cx="48" cy="51" rx="3" ry="2" fill="#ff6b9d" opacity="0.7"/>
      <!-- Smile -->
      <path d="M44 48c4 1 8 1 8 0" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    `,
    lion: `
      <!-- Mane -->
      <circle cx="48" cy="38" r="20" fill="${accent}" opacity="0.4"/>
      <circle cx="28" cy="32" r="8" fill="${accent}" opacity="0.3"/>
      <circle cx="68" cy="32" r="8" fill="${accent}" opacity="0.3"/>
      <circle cx="26" cy="42" r="7" fill="${accent}" opacity="0.3"/>
      <circle cx="70" cy="42" r="7" fill="${accent}" opacity="0.3"/>
      <!-- Head -->
      <circle cx="48" cy="42" r="16" fill="url(#${furId})"/>
      <!-- Left eye -->
      <circle cx="42" cy="39" r="3" fill="#fff"/>
      <circle cx="42" cy="39" r="1.8" fill="${accent}"/>
      <!-- Right eye -->
      <circle cx="54" cy="39" r="3" fill="#fff"/>
      <circle cx="54" cy="39" r="1.8" fill="${accent}"/>
      <!-- Nose -->
      <ellipse cx="48" cy="45" rx="2.5" ry="3" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M44 48c4 2 8 2 8 0" stroke="${accent}" stroke-width="2" stroke-linecap="round" fill="none"/>
    `,
    giraffe: `
      <!-- Horns -->
      <circle cx="42" cy="18" r="3" fill="${accent}"/>
      <circle cx="54" cy="18" r="3" fill="${accent}"/>
      <!-- Head -->
      <ellipse cx="48" cy="40" rx="14" ry="16" fill="url(#${furId})"/>
      <!-- Spots -->
      <ellipse cx="38" cy="36" rx="3" ry="4" fill="${accent}" opacity="0.5"/>
      <ellipse cx="58" cy="36" rx="3" ry="4" fill="${accent}" opacity="0.5"/>
      <ellipse cx="42" cy="46" rx="2.5" ry="3" fill="${accent}" opacity="0.5"/>
      <ellipse cx="54" cy="46" rx="2.5" ry="3" fill="${accent}" opacity="0.5"/>
      <!-- Left eye -->
      <circle cx="42" cy="38" r="3" fill="#fff"/>
      <circle cx="42" cy="38" r="1.8" fill="${accent}"/>
      <!-- Right eye (winking smile) -->
      <path d="M54 38c0 1 1 2 2 2" stroke="${accent}" stroke-width="2" stroke-linecap="round" fill="none"/>
      <!-- Snout -->
      <ellipse cx="48" cy="46" rx="5" ry="4" fill="#fff" opacity="0.7"/>
      <!-- Nose -->
      <ellipse cx="48" cy="44" rx="1.8" ry="2.5" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M45 47c3 1.5 6 1.5 6 0" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
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
  <!-- Hoodie -->
  <path d="M20 65c0-8 8-15 28-15s28 7 28 15v11H20v-11z" fill="url(#${hoodieId})" filter="url(#shadow-${style.id})"/>
  <!-- Hoodie strings -->
  <path d="M40 72l0 4m16 -4l0 4" stroke="url(#${hoodieId})" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  <!-- Animal -->
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
