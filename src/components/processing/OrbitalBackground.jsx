import { useMemo, useEffect, useRef, useState } from 'react';

const COLORS = ['#8B9E7E', '#B8835C', '#6B7F9E', '#A07080', '#7E8B5C', '#5C8B8B'];

function buildParticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    radius: 70 + Math.random() * 200,
    angle: Math.random() * Math.PI * 2,
    speed: 0.15 + Math.random() * 0.35, // radians per second base speed
    size: 3 + Math.random() * 4,
    color: COLORS[i % COLORS.length],
  }));
}

export default function OrbitalBackground({ percent }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const particleCount = isMobile ? 8 : 14;

  useMemo(() => {
    particlesRef.current = buildParticles(particleCount);
  }, [particleCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let lastTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Speed multiplier: faster as progress increases
      const speedMul = 1 + (percent / 100) * 2.5;
      const opacity = 0.15 + (percent / 100) * 0.35;

      const particles = particlesRef.current;

      // Update angles
      for (const p of particles) {
        p.angle += p.speed * speedMul * dt;
      }

      // Compute positions
      const positions = particles.map((p) => ({
        x: cx + Math.cos(p.angle) * p.radius,
        y: cy + Math.sin(p.angle) * p.radius,
        ...p,
      }));

      // Draw connecting lines between nearby particles
      ctx.lineWidth = 0.5;
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 160) {
            const lineAlpha = (1 - dist / 160) * 0.08 * opacity;
            ctx.strokeStyle = `rgba(150, 160, 170, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw central glow
      const glowRadius = 100 + percent * 0.8;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      glow.addColorStop(0, `rgba(99, 102, 241, ${0.03 + percent * 0.001})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Draw particles
      for (const p of positions) {
        ctx.globalAlpha = opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Small glow around each particle
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        pg.addColorStop(0, `${p.color}33`);
        pg.addColorStop(1, 'transparent');
        ctx.fillStyle = pg;
        ctx.fillRect(p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6);
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [percent, particleCount]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.9 }}
    />
  );
}
