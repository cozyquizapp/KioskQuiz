// Avatar size ratios - relative sizes based on real proportions
// 1.0 = full height of carousel container
export const AVATAR_SIZE_RATIOS: Record<string, number> = {
  avatar1: 0.95,  // Giraffe - tall, fills most of height
  avatar2: 0.85,  // Lion/large animal
  avatar3: 0.80,  // Medium animal
  avatar4: 0.75,  // Medium animal
  avatar5: 0.70,  // Medium-small animal
  avatar6: 0.65,  // Small animal
  avatar7: 0.60,  // Small animal
  avatar8: 0.55,  // Chicken/small bird
  avatar9: 0.50,  // Small animal
  avatar10: 0.45, // Small bird/chick
  avatar11: 0.40, // Tiny animal
  avatar12: 0.35, // Tiny animal
};

export const getAvatarSize = (avatarId?: string): number => {
  if (!avatarId) return 0.70;
  return AVATAR_SIZE_RATIOS[avatarId] || 0.70;
};
