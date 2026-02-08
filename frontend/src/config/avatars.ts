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
  { id: 'avatar1', name: '', svg: '/avatars/animals/avatar1.svg', dataUri: '/avatars/animals/avatar1.svg', isVideo: false },
  { id: 'avatar2', name: '', svg: '/avatars/animals/avatar2.svg', dataUri: '/avatars/animals/avatar2.svg', isVideo: false },
  { id: 'avatar3', name: '', svg: '/avatars/animals/avatar3.svg', dataUri: '/avatars/animals/avatar3.svg', isVideo: false },
  { id: 'avatar4', name: '', svg: '/avatars/animals/avatar4.svg', dataUri: '/avatars/animals/avatar4.svg', isVideo: false },
  { id: 'avatar5', name: '', svg: '/avatars/animals/avatar5.svg', dataUri: '/avatars/animals/avatar5.svg', isVideo: false },
  { id: 'avatar6', name: '', svg: '/avatars/animals/avatar6.svg', dataUri: '/avatars/animals/avatar6.svg', isVideo: false },
  { id: 'avatar7', name: '', svg: '/avatars/animals/avatar7.svg', dataUri: '/avatars/animals/avatar7.svg', isVideo: false },
  { id: 'avatar8', name: '', svg: '/avatars/animals/avatar8.svg', dataUri: '/avatars/animals/avatar8.svg', isVideo: false },
  { id: 'avatar9', name: '', svg: '/avatars/animals/avatar9.svg', dataUri: '/avatars/animals/avatar9.svg', isVideo: false },
  { id: 'avatar10', name: '', svg: '/avatars/animals/avatar10.svg', dataUri: '/avatars/animals/avatar10.svg', isVideo: false },
  { id: 'avatar11', name: '', svg: '/avatars/animals/avatar11.svg', dataUri: '/avatars/animals/avatar11.svg', isVideo: false },
  { id: 'avatar12', name: '', svg: '/avatars/animals/avatar12.svg', dataUri: '/avatars/animals/avatar12.svg', isVideo: false }
];
