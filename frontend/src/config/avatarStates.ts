/**
 * Avatar State System Configuration
 * 
 * Maps avatar IDs to their state-based folder names.
 * Each avatar in this map should have 4 SVG files in /public/avatars/{folderName}/:
 * - gehen.svg (walking/default)
 * - schauen.svg (looking/thinking)
 * - freuen.svg (happy/celebrating)
 * - weinen.svg (sad/crying)
 */

export const AVATAR_STATE_CONFIG: Record<string, string> = {
  'avatar2': 'blauwal',    // Blue Whale
  'avatar3': 'wolf',       // Wolf
  'avatar11': 'igel',      // Hedgehog
  // TODO: Add back when complete:
  // 'avatar1': 'pferd',      // Horse
  // 'avatar4': 'giraffe',    // Giraffe
  // 'avatar5': 'pandabaer',  // Panda Bear
  // 'avatar6': 'katze',      // Cat
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
export function getAvatarStatePath(avatarId: string, state: 'walking' | 'looking' | 'happy' | 'sad'): string | null {
  const folder = getAvatarFolder(avatarId);
  if (!folder) return null;

  const stateFileMap = {
    'walking': 'gehen.svg',
    'looking': 'schauen.svg',
    'happy': 'freuen.svg',
    'sad': 'weinen.svg',
  };

  return `/avatars/${folder}/${stateFileMap[state]}`;
}

/**
 * Preload all state images for an avatar
 */
export function preloadAvatarStates(avatarId: string): void {
  const folder = getAvatarFolder(avatarId);
  if (!folder) return;

  const states: Array<'walking' | 'looking' | 'happy' | 'sad'> = ['walking', 'looking', 'happy', 'sad'];
  
  states.forEach(state => {
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
