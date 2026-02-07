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
      <!-- Ears sticking up -->
      <path d="M36 16l-3-6 3 2 3-2z" fill="url(#${furId})"/>
      <path d="M60 16l3-6-3 2-3-2z" fill="url(#${furId})"/>
      <!-- Head/Neck -->
      <ellipse cx="48" cy="30" rx="13" ry="16" fill="url(#${furId})"/>
      <!-- Eyes -->
      <circle cx="44" cy="28" r="2.5" fill="#163e6a"/>
      <path d="M54 28c1 1.5 2 2 2.5 2" stroke="#163e6a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <!-- Snout -->
      <ellipse cx="48" cy="34" rx="4" ry="3" fill="${style.nose}" opacity="0.8"/>
      <!-- Smile -->
      <path d="M46 36c2 1.5 4 1.5 4 0" stroke="#163e6a" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    `,
    fox: `
      <!-- Ears -->
      <path d="M38 18l-4-8 4 3 3-3z" fill="url(#${furId})"/>
      <path d="M58 18l4-8-4 3-3-3z" fill="url(#${furId})"/>
      <!-- Head/Neck -->
      <ellipse cx="48" cy="30" rx="12" ry="15" fill="url(#${furId})"/>
      <!-- Eyes -->
      <circle cx="44" cy="28" r="2.5" fill="#163e6a"/>
      <path d="M54 28c0 1.5 1 2 2 2" stroke="#163e6a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <!-- Snout -->
      <ellipse cx="48" cy="34" rx="5" ry="4" fill="#fff" opacity="0.6"/>
      <!-- Nose -->
      <ellipse cx="48" cy="33" rx="1.5" ry="2" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M46 36c2 1 4 1 4 0" stroke="#163e6a" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    `,
    cat: `
      <!-- Ears -->
      <path d="M38 14l-2-8 2 5 2-3z" fill="url(#${furId})"/>
      <path d="M58 14l2-8-2 5-2-3z" fill="url(#${furId})"/>
      <!-- Head -->
      <circle cx="48" cy="30" r="12" fill="url(#${furId})"/>
      <!-- Eyes -->
      <ellipse cx="44" cy="28" rx="2" ry="3" fill="#163e6a"/>
      <ellipse cx="52" cy="28" rx="2" ry="3" fill="#163e6a"/>
      <!-- Nose -->
      <path d="M48 33l-1 1.5 2 0 -1 -1.5z" fill="${style.nose}"/>
      <!-- Mouth -->
      <path d="M45 35c3 1 6 1 6 0" stroke="#163e6a" stroke-width="1.2" stroke-linecap="round" fill="none"/>
      <path d="M45 35l-1 1m8 -1l1 1" stroke="#163e6a" stroke-width="0.8" stroke-linecap="round"/>
    `,
    bear: `
      <!-- Ears -->
      <circle cx="38" cy="16" r="6" fill="url(#${furId})"/>
      <circle cx="58" cy="16" r="6" fill="url(#${furId})"/>
      <!-- Head -->
      <circle cx="48" cy="30" r="13" fill="url(#${furId})"/>
      <!-- Eyes -->
      <circle cx="44" cy="28" r="2.5" fill="#163e6a"/>
      <circle cx="52" cy="28" r="2.5" fill="#163e6a"/>
      <!-- Nose -->
      <ellipse cx="48" cy="34" rx="2.5" ry="3" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M45 37c3 1.5 6 1.5 6 0" stroke="#163e6a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    `,
    bunny: `
      <!-- Ears -->
      <ellipse cx="40" cy="8" rx="4" ry="12" fill="url(#${furId})"/>
      <ellipse cx="40" cy="8" rx="2" ry="9" fill="#fff" opacity="0.4"/>
      <ellipse cx="56" cy="8" rx="4" ry="12" fill="url(#${furId})"/>
      <ellipse cx="56" cy="8" rx="2" ry="9" fill="#fff" opacity="0.4"/>
      <!-- Head -->
      <circle cx="48" cy="30" r="12" fill="url(#${furId})"/>
      <!-- Eyes -->
      <circle cx="44" cy="28" r="2.5" fill="#163e6a"/>
      <circle cx="52" cy="28" r="2.5" fill="#163e6a"/>
      <!-- Nose -->
      <ellipse cx="48" cy="34" rx="1.5" ry="2" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M45 36c3 1 6 1 6 0" stroke="#163e6a" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    `,
    owl: `
      <!-- Head -->
      <circle cx="48" cy="30" r="13" fill="url(#${furId})"/>
      <!-- Eyes -->
      <circle cx="43" cy="28" r="4" fill="#fff"/>
      <circle cx="43" cy="28" r="2.5" fill="#163e6a"/>
      <circle cx="53" cy="28" r="4" fill="#fff"/>
      <circle cx="53" cy="28" r="2.5" fill="#163e6a"/>
      <!-- Beak -->
      <path d="M46 34l2 2.5 2 -2.5z" fill="${style.nose}"/>
    `,
    raccoon: `
      <!-- Head -->
      <circle cx="48" cy="30" r="12" fill="url(#${furId})"/>
      <!-- Mask -->
      <ellipse cx="44" cy="28" rx="5" ry="5.5" fill="#163e6a" opacity="0.7"/>
      <ellipse cx="52" cy="28" rx="5" ry="5.5" fill="#163e6a" opacity="0.7"/>
      <!-- Eyes -->
      <circle cx="44" cy="28" r="2" fill="#fff"/>
      <circle cx="44" cy="28" r="1.2" fill="#000"/>
      <circle cx="52" cy="28" r="2" fill="#fff"/>
      <circle cx="52" cy="28" r="1.2" fill="#000"/>
      <!-- Nose -->
      <ellipse cx="48" cy="34" rx="2" ry="2.5" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M45 36c3 1 6 1 6 0" stroke="#163e6a" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    `,
    panda: `
      <!-- Ears -->
      <circle cx="38" cy="16" r="6" fill="#0f172a"/>
      <circle cx="58" cy="16" r="6" fill="#0f172a"/>
      <!-- Head (white) -->
      <circle cx="48" cy="30" r="12" fill="#f8fafc"/>
      <!-- Eye patches -->
      <ellipse cx="44" cy="28" rx="4.5" ry="5.5" fill="#0f172a"/>
      <ellipse cx="52" cy="28" rx="4.5" ry="5.5" fill="#0f172a"/>
      <!-- Eyes -->
      <circle cx="44" cy="28" r="2" fill="#fff"/>
      <circle cx="44" cy="28" r="1.2" fill="#000"/>
      <circle cx="52" cy="28" r="2" fill="#fff"/>
      <circle cx="52" cy="28" r="1.2" fill="#000"/>
      <!-- Nose -->
      <ellipse cx="48" cy="34" rx="1.5" ry="2" fill="#000"/>
      <!-- Smile -->
      <path d="M45 36c3 1 6 1 6 0" stroke="#000" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    `,
    tiger: `
      <!-- Head -->
      <ellipse cx="48" cy="30" rx="12" ry="14" fill="url(#${furId})"/>
      <!-- Stripes -->
      <path d="M38 25h4m12 0h4m-16 5h4m8 0h4" stroke="#7c2d12" stroke-width="1.5" stroke-linecap="round"/>
      <!-- Eyes -->
      <circle cx="44" cy="28" r="2.5" fill="#163e6a"/>
      <circle cx="52" cy="28" r="2.5" fill="#163e6a"/>
      <!-- Nose -->
      <ellipse cx="48" cy="34" rx="1.5" ry="2" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M45 36c3 1 6 1 6 0" stroke="#7c2d12" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    `,
    koala: `
      <!-- Ears -->
      <ellipse cx="36" cy="18" rx="7" ry="8" fill="url(#${furId})"/>
      <ellipse cx="36" cy="18" rx="4" ry="5" fill="#475569" opacity="0.3"/>
      <ellipse cx="60" cy="18" rx="7" ry="8" fill="url(#${furId})"/>
      <ellipse cx="60" cy="18" rx="4" ry="5" fill="#475569" opacity="0.3"/>
      <!-- Head -->
      <circle cx="48" cy="30" r="13" fill="url(#${furId})"/>
      <!-- Eyes -->
      <circle cx="44" cy="28" r="2.5" fill="#163e6a"/>
      <circle cx="52" cy="28" r="2.5" fill="#163e6a"/>
      <!-- Nose -->
      <ellipse cx="48" cy="34" rx="3" ry="3.5" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M44 37c4 1.5 8 1.5 8 0" stroke="#475569" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    `,
    deer: `
      <!-- Antlers -->
      <path d="M40 12l-2-4 1 3 1-2z" fill="#7c2d12"/>
      <path d="M56 12l2-4-1 3-1-2z" fill="#7c2d12"/>
      <!-- Head -->
      <ellipse cx="48" cy="30" rx="12" ry="14" fill="url(#${furId})"/>
      <!-- Eyes -->
      <circle cx="44" cy="28" r="2.5" fill="#163e6a"/>
      <circle cx="52" cy="28" r="2.5" fill="#163e6a"/>
      <!-- Snout -->
      <ellipse cx="48" cy="34" rx="4" ry="3" fill="#fff" opacity="0.6"/>
      <!-- Nose -->
      <ellipse cx="48" cy="33" rx="1.5" ry="2" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M45 36c3 1 6 1 6 0" stroke="#7c2d12" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    `,
    dog: `
      <!-- Ears (floppy) -->
      <ellipse cx="32" cy="26" rx="5" ry="10" fill="url(#${furId})"/>
      <ellipse cx="64" cy="26" rx="5" ry="10" fill="url(#${furId})"/>
      <!-- Head -->
      <circle cx="48" cy="30" r="12" fill="url(#${furId})"/>
      <!-- Snout -->
      <ellipse cx="48" cy="34" rx="6" ry="4.5" fill="#fff" opacity="0.6"/>
      <!-- Eyes -->
      <circle cx="44" cy="28" r="2.5" fill="#163e6a"/>
      <circle cx="52" cy="28" r="2.5" fill="#163e6a"/>
      <!-- Nose -->
      <ellipse cx="48" cy="33" rx="2" ry="2.5" fill="${style.nose}"/>
      <!-- Tongue -->
      <ellipse cx="48" cy="37" rx="2.5" ry="1.5" fill="#ff6b9d" opacity="0.7"/>
    `,
    lion: `
      <!-- Mane -->
      <circle cx="48" cy="26" r="16" fill="#d97706" opacity="0.35"/>
      <circle cx="32" cy="22" r="6" fill="#d97706" opacity="0.3"/>
      <circle cx="64" cy="22" r="6" fill="#d97706" opacity="0.3"/>
      <circle cx="30" cy="30" r="5" fill="#d97706" opacity="0.3"/>
      <circle cx="66" cy="30" r="5" fill="#d97706" opacity="0.3"/>
      <!-- Head -->
      <circle cx="48" cy="30" r="12" fill="url(#${furId})"/>
      <!-- Eyes -->
      <circle cx="44" cy="28" r="2.5" fill="#163e6a"/>
      <circle cx="52" cy="28" r="2.5" fill="#163e6a"/>
      <!-- Nose -->
      <ellipse cx="48" cy="34" rx="2" ry="2.5" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M45 37c3 1.5 6 1.5 6 0" stroke="#d97706" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    `,
    giraffe: `
      <!-- Horns -->
      <circle cx="42" cy="12" r="2.5" fill="#0f766e"/>
      <circle cx="54" cy="12" r="2.5" fill="#0f766e"/>
      <!-- Head/Neck -->
      <ellipse cx="48" cy="30" rx="11" ry="14" fill="url(#${furId})"/>
      <!-- Spots -->
      <ellipse cx="40" cy="26" rx="2.5" ry="3" fill="#0f766e" opacity="0.5"/>
      <ellipse cx="56" cy="26" rx="2.5" ry="3" fill="#0f766e" opacity="0.5"/>
      <ellipse cx="44" cy="34" rx="2" ry="2.5" fill="#0f766e" opacity="0.5"/>
      <ellipse cx="52" cy="34" rx="2" ry="2.5" fill="#0f766e" opacity="0.5"/>
      <!-- Eyes -->
      <circle cx="44" cy="28" r="2.5" fill="#163e6a"/>
      <path d="M52 28c0 1 1 1.5 2 1.5" stroke="#163e6a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <!-- Snout -->
      <ellipse cx="48" cy="34" rx="4" ry="3" fill="#fff" opacity="0.6"/>
      <!-- Nose -->
      <ellipse cx="48" cy="33" rx="1.5" ry="2" fill="${style.nose}"/>
      <!-- Smile -->
      <path d="M45 36c3 1 6 1 6 0" stroke="#0f766e" stroke-width="1.2" stroke-linecap="round" fill="none"/>
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
