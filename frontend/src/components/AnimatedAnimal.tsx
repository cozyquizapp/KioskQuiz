import { useEffect, useState } from 'react';

type AnimatedAnimalProps = {
  avatarSrc: string;
  mood?: 'idle' | 'happy' | 'sad';
  size?: number;
  style?: React.CSSProperties;
};

export const AnimatedAnimal: React.FC<AnimatedAnimalProps> = ({ 
  avatarSrc, 
  mood = 'idle', 
  size = 60,
  style 
}) => {
  const [currentMood, setCurrentMood] = useState(mood);

  useEffect(() => {
    setCurrentMood(mood);
    
    // Reset to idle after celebration or sadness
    if (mood !== 'idle') {
      const timer = setTimeout(() => {
        setCurrentMood('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [mood]);

  const getAnimationClass = () => {
    switch (currentMood) {
      case 'happy':
        return 'animal-celebrate';
      case 'sad':
        return 'animal-sad';
      default:
        return 'animal-bounce';
    }
  };

  return (
    <div 
      className={`animated-animal ${getAnimationClass()}`}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        position: 'relative',
        ...style
      }}
    >
      <img 
        src={avatarSrc} 
        alt="Avatar" 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: currentMood === 'sad' ? 'grayscale(0.3) brightness(0.8)' : 'none'
        }}
      />
    </div>
  );
};
