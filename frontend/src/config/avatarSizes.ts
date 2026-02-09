// Avatar size ratios - relative sizes based on real proportions
// 1.0 = full height of carousel container
export const AVATAR_SIZE_RATIOS: Record<string, number> = {
  avatar1: 0.85,  // Pferd
  avatar2: 0.95,  // Blauwal
  avatar3: 0.7,   // Wolf
  avatar4: 1.0,   // Giraffe
  avatar5: 0.75,  // Pandabaer
  avatar6: 0.55,  // Katze
  avatar7: 0.60,  // Medium-small
  avatar8: 0.55,  // Small animal
  avatar9: 0.50,  // Small animal
  avatar10: 0.45, // Small bird
  avatar11: 0.28, // Igel - very small!
  avatar12: 0.4,  // Eichhoernchen
  avatar13: 0.42, // Small animal
  avatar14: 0.48, // Small-medium
  avatar15: 0.55, // Small-medium
};

export const getAvatarSize = (avatarId?: string): number => {
  if (!avatarId) return 0.70;
  return AVATAR_SIZE_RATIOS[avatarId] || 0.70;
};
