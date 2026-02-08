import { useState, useEffect } from 'react';

/**
 * Custom hook to get window width with proper caching.
 * Avoids recalculating on every render and prevents flickering.
 * Debounced to avoid excessive re-renders during resize.
 */
export function useWindowWidth() {
  const [windowWidth, setWindowWidth] = useState(() => {
    // Initialize with actual window width or 1024 as fallback
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1024;
  });

  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      // Debounce resize events (300ms)
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setWindowWidth(window.innerWidth);
      }, 300);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowWidth;
}

/**
 * Breakpoints for responsive design
 */
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024
};

/**
 * Helper to check if width is mobile
 */
export function isMobile(width: number): boolean {
  return width < BREAKPOINTS.mobile;
}

/**
 * Helper to check if width is tablet
 */
export function isTablet(width: number): boolean {
  return width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
}

/**
 * Helper to check if width is desktop
 */
export function isDesktop(width: number): boolean {
  return width >= BREAKPOINTS.desktop;
}
