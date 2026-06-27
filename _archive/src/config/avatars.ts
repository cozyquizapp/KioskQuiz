export type AvatarOption = {
  id: string;
  name: string;
  svg: string; // SVG path for animal icons
  dataUri: string; // fallback path
  videoSrc?: string; // optional video source
  isVideo: boolean; // indicates if this is a video avatar
};

// Animal SVG avatars with animations
export const AVATARS: AvatarOption[] = [
  { id: 'avatar4', name: 'Giraffe', svg: '/avatars/giraffe/normal.svg', dataUri: '/avatars/giraffe/normal.svg', isVideo: false },
  { id: 'avatar1', name: 'Pferd', svg: '/avatars/pferd/normal.svg', dataUri: '/avatars/pferd/normal.svg', isVideo: false },
  { id: 'avatar2', name: 'Blauwal', svg: '/avatars/blauwal/normal.svg', dataUri: '/avatars/blauwal/normal.svg', isVideo: false },
  { id: 'avatar3', name: 'Wolf', svg: '/avatars/wolf/normal.svg', dataUri: '/avatars/wolf/normal.svg', isVideo: false },
  { id: 'avatar5', name: 'Pandabaer', svg: '/avatars/pandabaer/normal.svg', dataUri: '/avatars/pandabaer/normal.svg', isVideo: false },
  { id: 'avatar6', name: 'Katze', svg: '/avatars/katze/normal.svg', dataUri: '/avatars/katze/normal.svg', isVideo: false },
  { id: 'avatar11', name: 'Igel', svg: '/avatars/igel/normal.svg', dataUri: '/avatars/igel/normal.svg', isVideo: false },
  { id: 'avatar12', name: 'Eichhoernchen', svg: '/avatars/eichhoernchen/normal.svg', dataUri: '/avatars/eichhoernchen/normal.svg', isVideo: false }
];
