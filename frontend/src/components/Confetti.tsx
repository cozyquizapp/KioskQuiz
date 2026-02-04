import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

export const Confetti = ({ active = true, duration = 4000 }: { active?: boolean; duration?: number }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!active) return;

    const colors = ['#fbbf24', '#f97316', '#ec4899', '#6366f1', '#14b8a6', '#8b5cf6', '#10b981', '#f59e0b'];
    const newPieces: ConfettiPiece[] = [];

    for (let i = 0; i < 50; i++) {
      newPieces.push({
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 1000,
        duration: 3000 + Math.random() * 2000,
        size: 8 + Math.random() * 8
      });
    }

    setPieces(newPieces);

    const timer = setTimeout(() => {
      setPieces([]);
    }, duration);

    return () => clearTimeout(timer);
  }, [active, duration]);

  if (!active || pieces.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      {pieces.map((piece) => (
        <div
          key={piece.id}
          style={{
            position: 'absolute',
            left: `${piece.left}%`,
            top: '-20px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confetti-fall ${piece.duration}ms linear ${piece.delay}ms forwards, confetti-spin ${piece.duration * 0.5}ms linear ${piece.delay}ms infinite`,
            boxShadow: `0 0 ${piece.size}px ${piece.color}88`
          }}
        />
      ))}
    </div>
  );
};

export const ParticleEffect = ({ 
  active = false, 
  x = 50, 
  y = 50, 
  color = '#fbbf24',
  count = 20 
}: { 
  active?: boolean; 
  x?: number; 
  y?: number; 
  color?: string;
  count?: number;
}) => {
  const [particles, setParticles] = useState<Array<{ id: number; tx: number; ty: number; delay: number }>>([]);

  useEffect(() => {
    if (!active) return;

    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      tx: (Math.random() - 0.5) * 200,
      ty: (Math.random() - 0.5) * 200,
      delay: i * 20
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
    }, 1000);

    return () => clearTimeout(timer);
  }, [active, count]);

  if (!active || particles.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      pointerEvents: 'none',
      zIndex: 100
    }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`,
            animation: `particle-burst 0.8s ease-out ${p.delay}ms forwards`,
            // @ts-ignore
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};
