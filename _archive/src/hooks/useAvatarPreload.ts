import { useEffect, useState } from 'react';
import { preloadAvatarStates, hasStateBasedRendering } from '../config/avatarStates';

/**
 * Custom hook to preload avatar state images
 * Ensures smooth transitions by loading all state SVGs upfront
 */
export function useAvatarPreload(avatarId: string | null) {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [preloadError, setPreloadError] = useState<Error | null>(null);

  useEffect(() => {
    if (!avatarId || !hasStateBasedRendering(avatarId)) {
      setIsPreloaded(false);
      return;
    }

    setIsPreloaded(false);
    setPreloadError(null);

    try {
      preloadAvatarStates(avatarId);
      // Give images a moment to start loading
      const timer = setTimeout(() => {
        setIsPreloaded(true);
      }, 100);
      return () => clearTimeout(timer);
    } catch (error) {
      console.error('Failed to preload avatar states:', error);
      setPreloadError(error instanceof Error ? error : new Error('Unknown preload error'));
      setIsPreloaded(false);
    }
  }, [avatarId]);

  return {
    isPreloaded,
    preloadError
  };
}
