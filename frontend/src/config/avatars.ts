export type AvatarOption = {
  id: string;
  name: string;
  svg: string;
  dataUri: string;
};

const svgToDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const avatarSvgs = [
  {
    id: 'nova',
    name: 'Nova',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="28" fill="#1F2937"/>
  <circle cx="48" cy="48" r="28" fill="#22D3EE"/>
  <circle cx="38" cy="43" r="4" fill="#0F172A"/>
  <circle cx="58" cy="43" r="4" fill="#0F172A"/>
  <path d="M36 57c4 6 20 6 24 0" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'pico',
    name: 'Pico',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="22" fill="#111827"/>
  <path d="M20 28h56v40a20 20 0 0 1-20 20H40a20 20 0 0 1-20-20V28z" fill="#F472B6"/>
  <circle cx="38" cy="46" r="4" fill="#1F2937"/>
  <circle cx="58" cy="46" r="4" fill="#1F2937"/>
  <path d="M38 60h20" stroke="#1F2937" stroke-width="4" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'orbit',
    name: 'Orbit',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="30" fill="#0F172A"/>
  <circle cx="48" cy="48" r="26" fill="#A3E635"/>
  <circle cx="36" cy="44" r="4" fill="#0F172A"/>
  <circle cx="60" cy="44" r="4" fill="#0F172A"/>
  <path d="M34 58c5 5 23 5 28 0" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="48" cy="48" rx="36" ry="18" stroke="#A3E635" stroke-width="3"/>
</svg>`
  },
  {
    id: 'glow',
    name: 'Glow',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="26" fill="#111827"/>
  <rect x="16" y="16" width="64" height="64" rx="20" fill="#F59E0B"/>
  <circle cx="40" cy="44" r="4" fill="#1F2937"/>
  <circle cx="56" cy="44" r="4" fill="#1F2937"/>
  <path d="M38 58h20" stroke="#1F2937" stroke-width="4" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'mint',
    name: 'Mint',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="24" fill="#0B1120"/>
  <path d="M20 40c0-12 10-22 22-22h12c12 0 22 10 22 22v16c0 12-10 22-22 22H42c-12 0-22-10-22-22V40z" fill="#34D399"/>
  <circle cx="38" cy="46" r="4" fill="#0F172A"/>
  <circle cx="58" cy="46" r="4" fill="#0F172A"/>
  <path d="M34 60c6 4 22 4 28 0" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'ember',
    name: 'Ember',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="28" fill="#111827"/>
  <circle cx="48" cy="50" r="26" fill="#FB7185"/>
  <path d="M32 34l16-10 16 10" stroke="#FB7185" stroke-width="6" stroke-linecap="round"/>
  <circle cx="40" cy="50" r="4" fill="#1F2937"/>
  <circle cx="56" cy="50" r="4" fill="#1F2937"/>
  <path d="M36 62c5 4 19 4 24 0" stroke="#1F2937" stroke-width="4" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'sky',
    name: 'Sky',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="22" fill="#0F172A"/>
  <circle cx="48" cy="48" r="26" fill="#60A5FA"/>
  <circle cx="40" cy="44" r="4" fill="#0F172A"/>
  <circle cx="56" cy="44" r="4" fill="#0F172A"/>
  <path d="M34 56h28" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>
  <path d="M22 72h52" stroke="#60A5FA" stroke-width="4" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'cactus',
    name: 'Cactus',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="26" fill="#111827"/>
  <path d="M34 28c0-6 5-10 10-10h8c6 0 10 4 10 10v40c0 8-6 14-14 14h-4c-8 0-14-6-14-14V28z" fill="#22C55E"/>
  <circle cx="40" cy="48" r="4" fill="#0F172A"/>
  <circle cx="56" cy="48" r="4" fill="#0F172A"/>
  <path d="M38 62c6 4 14 4 20 0" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'plum',
    name: 'Plum',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="24" fill="#0F172A"/>
  <rect x="18" y="20" width="60" height="60" rx="26" fill="#A855F7"/>
  <circle cx="40" cy="48" r="4" fill="#0F172A"/>
  <circle cx="56" cy="48" r="4" fill="#0F172A"/>
  <path d="M36 62c6 4 18 4 24 0" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'sand',
    name: 'Sand',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="28" fill="#0F172A"/>
  <circle cx="48" cy="52" r="26" fill="#FCD34D"/>
  <circle cx="40" cy="48" r="4" fill="#0F172A"/>
  <circle cx="56" cy="48" r="4" fill="#0F172A"/>
  <path d="M36 60c6 4 18 4 24 0" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'aurora',
    name: 'Aurora',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="26" fill="#111827"/>
  <path d="M24 30h48a12 12 0 0 1 12 12v12a22 22 0 0 1-22 22H34A22 22 0 0 1 12 54V42a12 12 0 0 1 12-12z" fill="#38BDF8"/>
  <circle cx="38" cy="48" r="4" fill="#0F172A"/>
  <circle cx="58" cy="48" r="4" fill="#0F172A"/>
  <path d="M34 62c6 4 18 4 24 0" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'lava',
    name: 'Lava',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="24" fill="#0B1120"/>
  <circle cx="48" cy="48" r="28" fill="#F97316"/>
  <circle cx="38" cy="44" r="4" fill="#0F172A"/>
  <circle cx="58" cy="44" r="4" fill="#0F172A"/>
  <path d="M36 58c6 4 18 4 24 0" stroke="#0F172A" stroke-width="4" stroke-linecap="round"/>
  <circle cx="72" cy="26" r="6" fill="#F97316"/>
</svg>`
  },
  {
    id: 'pixel',
    name: 'Pixel',
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="18" fill="#111827"/>
  <rect x="18" y="18" width="60" height="60" fill="#34D399"/>
  <rect x="30" y="40" width="8" height="8" fill="#0F172A"/>
  <rect x="58" y="40" width="8" height="8" fill="#0F172A"/>
  <rect x="36" y="58" width="24" height="6" fill="#0F172A"/>
</svg>`
  }
];

export const AVATARS: AvatarOption[] = avatarSvgs.map((avatar) => ({
  ...avatar,
  dataUri: svgToDataUri(avatar.svg)
}));
