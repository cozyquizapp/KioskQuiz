/**
 * Avatar State System Configuration
 *
 * Maps avatar IDs to their state-based folder names.
 * Each avatar in this map should have SVG files in /public/avatars/{folderName}/:
 * - laufen1.svg (walking frame 1)
 * - laufen2.svg (walking frame 2)
 * - normal.svg (idle)
 * - geste.svg (gesture/tap)
 * - freuen.svg (happy/celebrating)
 * - weinen.svg (sad/crying)
 */

export type AvatarState = 'walking' | 'idle' | 'gesture' | 'happy' | 'sad';
export type AvatarWalkFrame = 1 | 2;

export const AVATAR_STATE_CONFIG: Record<string, string> = {
  avatar1: 'pferd',
  avatar2: 'blauwal',
  avatar3: 'wolf',
  avatar4: 'giraffe',
  avatar5: 'pandabaer',
  avatar6: 'katze',
  avatar11: 'igel',
  avatar12: 'eichhoernchen'
};

/**
 * Check if an avatar has state-based rendering
 */
export function hasStateBasedRendering(avatarId: string): boolean {
  return avatarId in AVATAR_STATE_CONFIG;
}

/**
 * Get the folder name for a state-based avatar
 */
export function getAvatarFolder(avatarId: string): string | null {
  return AVATAR_STATE_CONFIG[avatarId] || null;
}

/**
 * Get the image path for a specific avatar state
 */
export function getAvatarStatePath(
  avatarId: string,
  state: AvatarState,
  walkFrame: AvatarWalkFrame = 1
): string | null {
  const folder = getAvatarFolder(avatarId);
  if (!folder) return null;

  const stateFileMap: Record<AvatarState, string> = {
    walking: walkFrame === 2 ? 'laufen2.svg' : 'laufen1.svg',
    idle: 'normal.svg',
    gesture: 'geste.svg',
    happy: 'freuen.svg',
    sad: 'weinen.svg'
  };

  return `/avatars/${folder}/${stateFileMap[state]}`;
}

/**
 * Preload all state images for an avatar
 */
export function preloadAvatarStates(avatarId: string): void {
  const folder = getAvatarFolder(avatarId);
  if (!folder) return;

  const states: AvatarState[] = ['walking', 'idle', 'gesture', 'happy', 'sad'];
  states.forEach((state) => {
    if (state === 'walking') {
      const frame1 = getAvatarStatePath(avatarId, state, 1);
      const frame2 = getAvatarStatePath(avatarId, state, 2);
      [frame1, frame2].forEach((path) => {
        if (path) {
          const img = new Image();
          img.src = path;
        }
      });
      return;
    }
    const path = getAvatarStatePath(avatarId, state);
    if (path) {
      const img = new Image();
      img.src = path;
    }
  });
}

/**
 * Get all avatar IDs that support state-based rendering
 */
export function getStateBasedAvatarIds(): string[] {
  return Object.keys(AVATAR_STATE_CONFIG);
}
