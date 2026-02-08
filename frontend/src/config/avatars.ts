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
  { id: 'avatar1', name: 'Pferd', svg: '/avatars/pferd/gehen.svg', dataUri: '/avatars/pferd/gehen.svg', isVideo: false },
  { id: 'avatar2', name: 'Blauwal', svg: '/avatars/blauwal/gehen.svg', dataUri: '/avatars/blauwal/gehen.svg', isVideo: false },
  { id: 'avatar3', name: 'Wolf', svg: '/avatars/wolf/gehen.svg', dataUri: '/avatars/wolf/gehen.svg', isVideo: false },
  { id: 'avatar4', name: 'Giraffe', svg: '/avatars/giraffe/gehen.svg', dataUri: '/avatars/giraffe/gehen.svg', isVideo: false },
  { id: 'avatar5', name: 'Pandabär', svg: '/avatars/pandabaer/gehen.svg', dataUri: '/avatars/pandabaer/gehen.svg', isVideo: false },
  { id: 'avatar6', name: 'Katze', svg: '/avatars/katze/gehen.svg', dataUri: '/avatars/katze/gehen.svg', isVideo: false },
  { id: 'avatar11', name: 'Igel', svg: '/avatars/igel/gehen.svg', dataUri: '/avatars/igel/gehen.svg', isVideo: false }
];
