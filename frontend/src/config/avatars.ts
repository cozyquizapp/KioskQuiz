export type AvatarOption = {
  id: string;
  name: string;
  svg: string; // deprecated, kept for compatibility
  dataUri: string; // now points to MP4 video path
  videoSrc: string; // MP4 video source
  isVideo: boolean; // indicates this is a video avatar
};

// Animated MP4 avatars
export const AVATARS: AvatarOption[] = [
  {
    id: 'avatar1',
    name: 'Avatar 1',
    svg: '', // deprecated
    dataUri: '/avatars/avatar1.mp4',
    videoSrc: '/avatars/avatar1.mp4',
    isVideo: true
  },
  {
    id: 'avatar2',
    name: 'Avatar 2',
    svg: '',
    dataUri: '/avatars/avatar2.mp4',
    videoSrc: '/avatars/avatar2.mp4',
    isVideo: true
  },
  {
    id: 'avatar3',
    name: 'Avatar 3',
    svg: '',
    dataUri: '/avatars/avatar3.mp4',
    videoSrc: '/avatars/avatar3.mp4',
    isVideo: true
  },
  {
    id: 'avatar4',
    name: 'Avatar 4',
    svg: '',
    dataUri: '/avatars/avatar4.mp4',
    videoSrc: '/avatars/avatar4.mp4',
    isVideo: true
  },
  {
    id: 'avatar5',
    name: 'Avatar 5',
    svg: '',
    dataUri: '/avatars/avatar5.mp4',
    videoSrc: '/avatars/avatar5.mp4',
    isVideo: true
  },
  {
    id: 'avatar6',
    name: 'Avatar 6',
    svg: '',
    dataUri: '/avatars/avatar6.mp4',
    videoSrc: '/avatars/avatar6.mp4',
    isVideo: true
  }
];
