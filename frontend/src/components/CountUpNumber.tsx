import { useEffect, useState, useRef } from 'react';

interface CountUpNumberProps {
  value: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const CountUpNumber = ({ value, duration = 600, className = '', style }: CountUpNumberProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current === value) return;
    
    setIsAnimating(true);
    const startValue = prevValueRef.current;
    const endValue = value;
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * eased);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        prevValueRef.current = value;
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={`${className} ${isAnimating ? 'count-up' : ''}`} style={style}>
      {displayValue}
    </span>
  );
};
