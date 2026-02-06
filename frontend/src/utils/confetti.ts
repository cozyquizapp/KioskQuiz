// Premium Confetti System
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  gravity: number;
  decay: number;
  opacity: number;
};

const colors = [
  '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b',
  '#10b981', '#06b6d4', '#8b5cf6', '#d946ef', '#f97316'
];

export class ConfettiSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrame: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(x: number, y: number, count: number = 100) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 3 + Math.random() * 8;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 8,
        gravity: 0.3 + Math.random() * 0.2,
        decay: 0.98 + Math.random() * 0.01,
        opacity: 1
      });
    }
    if (!this.animationFrame) {
      this.animate();
    }
  }

  explosion(count: number = 200) {
    const x = this.canvas.width / 2;
    const y = this.canvas.height / 3;
    this.burst(x, y, count);
  }

  rain(duration: number = 3000) {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - startTime > duration) {
        clearInterval(interval);
        return;
      }
      const x = Math.random() * this.canvas.width;
      this.burst(x, -20, 3);
    }, 50);
  }

  private animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Update physics
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.vx *= p.decay;
      p.vy *= p.decay;
      p.opacity -= 0.005;
      
      // Remove if out of bounds or faded
      if (p.y > this.canvas.height + 50 || p.opacity <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // Draw particle
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillStyle = p.color;
      
      // Draw as rectangle for better visibility
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      
      this.ctx.restore();
    }
    
    if (this.particles.length > 0) {
      this.animationFrame = requestAnimationFrame(() => this.animate());
    } else {
      this.animationFrame = null;
    }
  }

  clear() {
    this.particles = [];
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  destroy() {
    this.clear();
    window.removeEventListener('resize', () => this.resize());
  }
}

export const createConfetti = (container: HTMLElement): ConfettiSystem => {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  container.appendChild(canvas);
  return new ConfettiSystem(canvas);
};
