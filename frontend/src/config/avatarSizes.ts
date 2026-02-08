// Avatar size ratios - relative sizes based on real proportions
// 1.0 = full height of carousel container
export const AVATAR_SIZE_RATIOS: Record<string, number> = {
  avatar1: 1.0,   // Giraffe - tallest, fills full height
  avatar2: 0.85,  // Large animal (elephant, lion)
  avatar3: 0.80,  // Large animal
  avatar4: 0.75,  // Medium-large
  avatar5: 0.70,  // Medium animal
  avatar6: 0.65,  // Medium animal
  avatar7: 0.60,  // Medium-small
  avatar8: 0.55,  // Small animal
  avatar9: 0.50,  // Small animal
  avatar10: 0.45, // Small bird
  avatar11: 0.32, // Tiny animal (hedgehog/igel) - very small!
  avatar12: 0.38, // Tiny animal
  avatar13: 0.42, // Small animal
  avatar14: 0.48, // Small-medium
  avatar15: 0.55, // Small-medium
};

export const getAvatarSize = (avatarId?: string): number => {
  if (!avatarId) return 0.70;
  return AVATAR_SIZE_RATIOS[avatarId] || 0.70;
};
