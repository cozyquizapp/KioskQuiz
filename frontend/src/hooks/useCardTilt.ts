import { useEffect, useRef } from 'react';

export const useCardTilt = (intensity: number = 10) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -intensity;
      const rotateY = ((x - centerX) / centerX) * intensity;
      
      const mouseX = (x / rect.width) * 100;
      const mouseY = (y / rect.height) * 100;
      
      element.style.setProperty('--rotate-x', `${rotateX}deg`);
      element.style.setProperty('--rotate-y', `${rotateY}deg`);
      element.style.setProperty('--mouse-x', `${mouseX}%`);
      element.style.setProperty('--mouse-y', `${mouseY}%`);
    };

    const handleMouseLeave = () => {
      element.style.setProperty('--rotate-x', '0deg');
      element.style.setProperty('--rotate-y', '0deg');
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [intensity]);

  return ref;
};
