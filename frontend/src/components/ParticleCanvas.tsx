import { useEffect, useRef } from 'react';

interface Props {
  count?: number;
  opacity?: number;
  zIndex?: number;
}

export default function ParticleCanvas({ count = 100, opacity = 1, zIndex = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    type Particle = {
      x: number; y: number; r: number; a: number;
      vx: number; vy: number; life: number; maxLife: number;
      hue: number;
    };

    const particles: Particle[] = [];
    const spawn = (): Particle => {
      const maxLife = Math.random() * 200 + 100;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.3,
        a: Math.random() * 0.5 + 0.1,
        vy: -(Math.random() * 0.4 + 0.1),
        vx: (Math.random() - 0.5) * 0.3,
        life: 0,
        maxLife,
        hue: Math.random() > 0.5 ? 320 : 200,
      };
    };
    // Initial spawn: randomize life stage so particles are staggered
    // across the full screen immediately, without all fading in at once.
    for (let i = 0; i < count; i++) {
      const p = spawn();
      p.life = Math.floor(Math.random() * p.maxLife * 0.8); // 0–80% of lifespan
      // Advance position to match life stage
      p.x += p.vx * p.life;
      p.y += p.vy * p.life;
      // If already off-screen top, wrap to bottom
      if (p.y < 0) p.y = Math.random() * canvas.height;
      particles.push(p);
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.life++;
        if (p.life > p.maxLife) {
          // Natural end of life → respawn anywhere on screen
          Object.assign(p, spawn(), { life: 0 });
        } else if (p.y < 0) {
          // Floated off the top → re-enter from the bottom
          Object.assign(p, spawn(), { x: Math.random() * canvas.width, y: canvas.height + 10, life: 0 });
        }
        const prog = p.life / p.maxLife;
        const fade = prog < 0.2 ? prog / 0.2 : prog > 0.8 ? (1 - prog) / 0.2 : 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},80%,75%,${p.a * fade * opacity})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [count, opacity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
